import { Injectable, Logger } from '@nestjs/common';
import YTDlpWrapModule from 'yt-dlp-wrap';
import { Readable } from 'stream';

const YTDlpWrap = (YTDlpWrapModule as any).default || YTDlpWrapModule;

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly ytdlp: any;

  constructor() {
    // Assumes yt-dlp is in the system path
    this.ytdlp = new YTDlpWrap();
  }

  private normalizeUrl(url: string): string {
    try {
      const input = url.trim();

      // 1. Handle raw IDs (11 chars for video, UC... for channel, PL... for playlist)
      if (/^[a-zA-Z0-9_-]{11}$/.test(input))
        return `https://www.youtube.com/watch?v=${input}`;
      if (/^PL[a-zA-Z0-9_-]{16,38}$/.test(input))
        return `https://www.youtube.com/playlist?list=${input}`;

      const parsed = new URL(
        input.startsWith('http') ? input : `https://${input}`,
      );
      const host = parsed.hostname.replace('www.', '').replace('m.', ''); // Normalize mobile and www
      const path = parsed.pathname;
      const search = parsed.searchParams;

      // 2. youtu.be/ID
      if (host === 'youtu.be') {
        const videoId = path.slice(1);
        const listId = search.get('list');
        // If it's a youtu.be link with a list, it's often a "video within a playlist" context
        return listId
          ? `https://www.youtube.com/watch?v=${videoId}&list=${listId}`
          : `https://www.youtube.com/watch?v=${videoId}`;
      }

      // 3. youtube.com cases
      if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        // Shorts: /shorts/ID
        if (path.startsWith('/shorts/')) {
          return `https://www.youtube.com/watch?v=${path.split('/')[2]}`;
        }
        // Live: /live/ID
        if (path.startsWith('/live/')) {
          return `https://www.youtube.com/watch?v=${path.split('/')[2]}`;
        }
        // Embed: /embed/ID
        if (path.startsWith('/embed/')) {
          return `https://www.youtube.com/watch?v=${path.split('/')[2]}`;
        }
        // Legacy/Alternative: /v/ID or /e/ID
        if (path.startsWith('/v/') || path.startsWith('/e/')) {
          return `https://www.youtube.com/watch?v=${path.split('/')[2]}`;
        }

        // Standard Watch or Playlist
        const v = search.get('v');
        const list = search.get('list');

        if (v && list) {
          // Both present: Usually a video inside a playlist.
          // We return the watch link with the list context so yt-dlp can decide.
          return `https://www.youtube.com/watch?v=${v}&list=${list}`;
        }
        if (v) return `https://www.youtube.com/watch?v=${v}`;
        if (list) return `https://www.youtube.com/playlist?list=${list}`;
      }

      return input;
    } catch {
      return url;
    }
  }

  async getInfo(url: string) {
    const normalizedUrl = this.normalizeUrl(url);
    try {
      this.logger.log(`Fetching info for ${normalizedUrl} (original: ${url})`);
      // Use exec to pass the --js-runtimes node flag to fix the runtime warning/hang
      const metadataStr = await this.ytdlp.execPromise([
        normalizedUrl,
        '--dump-json',
        '--js-runtimes',
        'node',
      ]);
      const metadata = JSON.parse(metadataStr);
      this.logger.log(`Fetched info for ${url}:`, metadata);

      // If it's a playlist, return essential info for each video
      if (metadata._type === 'playlist' || Array.isArray(metadata.entries)) {
        return {
          type: 'playlist',
          title: metadata.title,
          videos: metadata.entries.map((entry: any) => ({
            id: entry.id,
            title: entry.title,
            thumbnail: entry.thumbnail,
            duration: entry.duration,
            url:
              entry.webpage_url ||
              `https://www.youtube.com/watch?v=${entry.id}`,
          })),
        };
      }

      // Single video
      return {
        type: 'video',
        id: metadata.id,
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
        url: metadata.webpage_url,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get YouTube info: ${error.message}`);
      throw error;
    }
  }

  getDownloadStream(url: string): Readable {
    const normalizedUrl = this.normalizeUrl(url);
    // The user provided a specific format preference
    const format =
      'bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720]';

    return this.ytdlp.execStream([
      normalizedUrl,
      '--format',
      format,
      '--merge-output-format',
      'mp4',
      '--js-runtimes',
      'node',
      '--newline',
    ]);
  }
}
