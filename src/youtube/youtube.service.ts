import { Injectable, Logger } from '@nestjs/common';
import { Readable, PassThrough } from 'stream';
import { spawn } from 'child_process';

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly ytdlp: any;

  constructor() {}

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

  async getInfo(url: string) {
    const normalizedUrl = this.normalizeUrl(url);
    return new Promise((resolve, reject) => {
      this.logger.log(`Fetching info for ${normalizedUrl} (original: ${url})`);

      const args = [
        normalizedUrl,
        '--dump-json',
        '--js-runtimes',
        'node',
        '--no-update',
        '--flat-playlist', // Essential for playlists: don't extract every video's full info
      ];

      const child = spawn('yt-dlp', args);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(
            `yt-dlp failed with code ${code}. Stderr: ${stderr}`,
          );
          return reject(new Error(`yt-dlp failed: ${stderr}`));
        }

        try {
          // yt-dlp might output multiple JSON objects if it's a playlist and --flat-playlist isn't enough
          // but usually the first object is the playlist metadata or the single video info.
          const lines = stdout.trim().split('\n');
          const metadata = JSON.parse(lines[0]);

          if (
            metadata._type === 'playlist' ||
            Array.isArray(metadata.entries)
          ) {
            resolve({
              type: 'playlist',
              title: metadata.title,
              videos: metadata.entries.map((entry: any) => ({
                id: entry.id,
                title: entry.title,
                thumbnail: entry.thumbnail,
                duration: entry.duration,
                url:
                  entry.url ||
                  entry.webpage_url ||
                  `https://www.youtube.com/watch?v=${entry.id}`,
              })),
            });
          } else {
            resolve({
              type: 'video',
              id: metadata.id,
              title: metadata.title,
              thumbnail: metadata.thumbnail,
              duration: metadata.duration,
              url: metadata.webpage_url,
            });
          }
        } catch (e: any) {
          this.logger.error(`Failed to parse yt-dlp output: ${e.message}`);
          reject(e);
        }
      });
    });
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
