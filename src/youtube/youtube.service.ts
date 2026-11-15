import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { youtube_v3 } from 'googleapis';
import { Readable, PassThrough } from 'stream';
import { spawn } from 'child_process';
import { YOUTUBE_CLIENT } from './youtube.constants.js';
import { parseYoutubeUrl, toVideo } from './youtube.helpers.js';

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  constructor(
    @Inject(YOUTUBE_CLIENT) private readonly youtube: youtube_v3.Youtube,
  ) {}

  private normalizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return url;
    const input = url.trim();
    if (!input) return url;

    const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

    // ── 1. Raw video ID (exactly 11 chars) ──────────────────────
    if (VIDEO_ID.test(input)) {
      return `https://www.youtube.com/watch?v=${input}`;
    }

    // ── 2. Raw playlist ID ──────────────────────────────────────
    // Covers PL, UU (uploads), LL (likes), FL (favorites), OL, WL (watch later),
    // TL, UL, PU (public uploads), IV, VL, SE (search).
    // NOTE: "UC..." is a channel ID, intentionally excluded.
    // NOTE: "RD..." radio/mix IDs are intentionally excluded — they're infinite.
    if (
      /^(PL|UU|LL|FL|OL|WL|TL|UL|PU|IV|VL|SE)[A-Za-z0-9_-]{10,}$/.test(input)
    ) {
      return `https://www.youtube.com/playlist?list=${input}`;
    }

    // ── 3. Parse as URL ─────────────────────────────────────────
    let parsed: URL;
    try {
      parsed = new URL(input.startsWith('http') ? input : `https://${input}`);
    } catch {
      return url;
    }

    const host = parsed.hostname
      .replace(/^www\./, '')
      .replace(/^m\./, '')
      .replace(/^music\./, '')
      .toLowerCase();
    const path = parsed.pathname;
    const params = parsed.searchParams;

    // ── 4. youtu.be/ID ──────────────────────────────────────────
    if (host === 'youtu.be') {
      const videoId = path.slice(1).split('/')[0];
      if (VIDEO_ID.test(videoId)) {
        // Playlist context (if any) is dropped on purpose — see note below.
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      return input;
    }

    // ── 5. youtube.com / youtube-nocookie.com ───────────────────
    if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') {
      return input; // unknown host — leave untouched
    }

    // Path-based video forms: /shorts/ID, /live/ID, /embed/ID, /v/ID, /e/ID
    const pathMatch = path.match(
      /^\/(shorts|live|embed|v|e)\/([A-Za-z0-9_-]{11})(?:\/|$)/,
    );
    if (pathMatch) {
      return `https://www.youtube.com/watch?v=${pathMatch[2]}`;
    }

    const v = params.get('v');
    const list = params.get('list');

    // Video wins over playlist context (per your canonical form)
    if (v && VIDEO_ID.test(v)) {
      return `https://www.youtube.com/watch?v=${v}`;
    }

    // Playlist (e.g. /playlist?list=PL… or /watch?list=PL… with no v)
    if (list && /^[A-Za-z0-9_-]+$/.test(list)) {
      return `https://www.youtube.com/playlist?list=${list}`;
    }

    // Anything else (channels, home, search, …) — leave as-is
    return input;
  }

  private async fetchVideos(ids: string[]) {
    // SPLIT BIG lists into batches consisting of 50 items and each batch as a request (youtube V3 LIMIT)
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

    const responses = await Promise.all(
      chunks.map((chunk) =>
        this.youtube.videos.list({
          part: ['snippet', 'contentDetails'],
          id: chunk,
          maxResults: 50,
          fields:
            'items(id,snippet(title,thumbnails),contentDetails(duration))',
        }),
      ),
    );

    return responses.flatMap((r) => r.data.items ?? []);
  }

  async getInfo(url: string) {
    this.logger.log(`Fetching info for original url: ${url}`);

    const { videoId, playlistId } = parseYoutubeUrl(url);

    // 01] If single video
    if (videoId) {
      const [video] = await this.fetchVideos([videoId]);
      if (!video) throw new NotFoundException('Video not found or is private');
      return { type: 'video', ...toVideo(video) };
    }

    // 02] If playlist ID
    if (playlistId) {
      const plRes = await this.youtube.playlists.list({
        part: ['snippet'],
        id: [playlistId],
        fields: 'items(snippet(title))',
      });
      const playlist = plRes.data.items?.[0]; // get the playlist item with snippet obj;
      if (!playlist)
        throw new NotFoundException('Playlist not found or is private');

      // Collect all video IDs (50 per page)
      const ids: string[] = [];
      let pageToken: string | undefined;
      do {
        const res = await this.youtube.playlistItems.list({
          part: ['contentDetails'],
          playlistId,
          maxResults: 50,
          pageToken,
          fields: 'nextPageToken,items(contentDetails(videoId))',
        });
        // get playlist videos once (maxed to 50 in first iteration) with only their ID as the payload
        // & returns page of next 50 if any and then continue loop;
        for (const item of res.data.items ?? []) { 
          if (item.contentDetails?.videoId)
            ids.push(item.contentDetails.videoId);
        }
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);

      // fetch each batch & fills in our schema
      const videos = await this.fetchVideos(ids);
      const byId = new Map(videos.map((v) => [v.id!, v]));

      return {
        type: 'playlist',
        url: `https://www.youtube.com/playlist?list=${playlistId}`,
        title: playlist.snippet?.title,
        videos: ids
          .map((id) => byId.get(id))
          .filter((v): v is youtube_v3.Schema$Video => !!v)
          .map((v) => toVideo(v)),
      };
    }

    // 03] If no video or playlist ID
    throw new BadRequestException('URL has no video or playlist ID');
  }

  getDownloadStream(url: string): Readable {
    const normalizedUrl = this.normalizeUrl(url);
    const format =
      'bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720]';
    const args = [
      normalizedUrl,
      '--format',
      format,
      '--merge-output-format',
      'mp4',
      '--js-runtimes',
      'node',
      '--no-update',
      '-o',
      '-',
      '--extractor-args',
      'youtube:player_client=tv,mweb',
    ];

    const child = spawn('yt-dlp', args);
    const stream = new PassThrough();
    let stderr = '';

    child.stdout.pipe(stream);
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // If yt-dlp exits with an error, propagate it to the stream
    child.on('close', (code) => {
      if (code !== 0) {
        const errorMsg = `yt-dlp exited with code ${code}. Stderr: ${stderr.trim()}`;
        this.logger.error(errorMsg);
        stream.emit('error', new Error(errorMsg));
      } else {
        stream.end();
      }
    });

    child.on('error', (err) => {
      this.logger.error(`yt-dlp download process error: ${err.message}`);
      stream.emit('error', err);
    });

    // Prevent process exit if no one is listening to the error yet
    stream.on('error', (err) => {
      this.logger.debug(
        `Stream error caught by internal listener: ${err.message}`,
      );
    });

    // Optional: kill yt-dlp if the client disconnects
    stream.on('close', () => {
      if (!child.killed) child.kill('SIGTERM');
    });

    return stream;
  }
}
