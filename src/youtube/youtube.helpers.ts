import { youtube_v3 } from 'googleapis';

type Thumbs = youtube_v3.Schema$ThumbnailDetails | undefined | null;

/**
 * Picks the best available thumbnail URL IF ANY;
 */
export function pickThumbnail(t: Thumbs): string | undefined {
  return (
    t?.maxres?.url ??
    t?.standard?.url ??
    t?.high?.url ??
    t?.medium?.url ??
    t?.default?.url ??
    undefined
  );
}

/**
 * Parses ISO 8601 duration (e.g., PT1H2M3S) into total seconds;
 */
export function parseDuration(iso?: string | null): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return undefined;
  const [, d = 0, h = 0, min = 0, s = 0] = m.map((v) => (v ? Number(v) : 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

/**
 * Maps a YouTube API video object to our internal video representation;
 */
export function toVideo(v: youtube_v3.Schema$Video) {
  return {
    id: v.id!,
    title: v.snippet?.title,
    thumbnail: pickThumbnail(v.snippet?.thumbnails),
    duration: parseDuration(v.contentDetails?.duration),
    url: `https://www.youtube.com/watch?v=${v.id}`,
  };
}

/**
 * Extracts videoId and playlistId from a YouTube URL;
 */
export function parseYoutubeUrl(url: string): {
  videoId?: string;
  playlistId?: string;
} {
  let u: URL;
  try {
    u = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return {};
  }

  const host = u.hostname.replace(/^www\.|^m\.|^music\./, '');
  let videoId: string | undefined;

  if (host === 'youtu.be') {
    videoId = u.pathname.slice(1) || undefined;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    videoId = u.searchParams.get('v') ?? undefined;
    const m = u.pathname.match(/^\/(shorts|embed|live|v|e)\/([\w-]{11})/);
    if (!videoId && m) videoId = m[2];
  }

  const playlistId = u.searchParams.get('list') ?? undefined;
  return { videoId, playlistId };
}
