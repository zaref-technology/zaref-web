export type VideoKind = 'youtube' | 'youtube-short' | 'instagram-reel' | 'instagram-post';

export interface ParsedVideo {
  kind: VideoKind;
  id: string;
  /** Iframe `src` for the inline player. */
  embedUrl: string;
  /** Canonical public link, used for the "watch on…" fallback. */
  watchUrl: string;
  /** Shorts and Instagram are vertical; regular YouTube videos are landscape. */
  orientation: 'landscape' | 'portrait';
  /** Human label, e.g. "YouTube Short" — shown in the admin as confirmation. */
  label: string;
  provider: 'YouTube' | 'Instagram';
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const INSTAGRAM_CODE = /^[A-Za-z0-9_-]{5,}$/;

function youtube(id: string, short: boolean): ParsedVideo | null {
  if (!YOUTUBE_ID.test(id)) return null;
  return {
    kind: short ? 'youtube-short' : 'youtube',
    id,
    // youtube-nocookie: same player, no tracking cookies until the visitor presses play.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`,
    watchUrl: short ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
    orientation: short ? 'portrait' : 'landscape',
    label: short ? 'YouTube Short' : 'YouTube video',
    provider: 'YouTube',
  };
}

function instagram(code: string, reel: boolean): ParsedVideo | null {
  if (!INSTAGRAM_CODE.test(code)) return null;
  const path = reel ? 'reel' : 'p';
  return {
    kind: reel ? 'instagram-reel' : 'instagram-post',
    id: code,
    embedUrl: `https://www.instagram.com/${path}/${code}/embed`,
    watchUrl: `https://www.instagram.com/${path}/${code}/`,
    orientation: 'portrait',
    label: reel ? 'Instagram Reel' : 'Instagram post',
    provider: 'Instagram',
  };
}

/**
 * Recognises the link types the product page can play inline:
 *  - YouTube: youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /live/ID
 *  - YouTube Shorts: youtube.com/shorts/ID
 *  - Instagram: instagram.com/reel/CODE (also /reels/), /p/CODE, /tv/CODE
 *    (with or without a leading /username/)
 * Anything else — including look-alike hosts — returns null, so only a known provider is ever
 * put in an iframe.
 */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  const value = raw?.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') return youtube(parts[0] ?? '', false);

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'shorts') return youtube(parts[1] ?? '', true);
    if (parts[0] === 'embed' || parts[0] === 'live') return youtube(parts[1] ?? '', false);
    if (parts[0] === 'watch') return youtube(url.searchParams.get('v') ?? '', false);
    return null;
  }

  if (host === 'instagram.com') {
    const i = parts.findIndex(p => ['p', 'reel', 'reels', 'tv'].includes(p));
    if (i === -1 || !parts[i + 1]) return null;
    return instagram(parts[i + 1], parts[i] === 'reel' || parts[i] === 'reels');
  }

  return null;
}
