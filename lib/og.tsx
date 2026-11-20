import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * A 16:9 JPEG at card width. Cloudinary's `f_jpg` guarantees a format the renderer can decode
 * (a WebP/AVIF upload would otherwise fail) and `w_`/`q_` keep it small; `c_fill,ar_16:9`
 * normalises any odd cover to the frame. Non-Cloudinary URLs pass through untouched.
 */
function optimizedCoverUrl(url: string): string {
  const marker = '/image/upload/';
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const at = i + marker.length;
  return `${url.slice(0, at)}c_fill,ar_16:9,w_1040,f_jpg,q_80/${url.slice(at)}`;
}

/** Fetches the cover as a data URL. Any failure yields `null` so the card renders text-only
 * instead of the whole OG image (and the link preview) failing. */
async function loadCover(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(optimizedCoverUrl(url));
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!/^image\/(jpeg|png|gif)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Trims to `max` characters at a word boundary, never mid-word. */
function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export interface OgCardInput {
  /** Small uppercase label above the title, e.g. "Case Study · CRM". */
  eyebrow: string;
  title: string;
  description?: string;
  /** Cover image URL (Cloudinary or any https image). Optional. */
  image?: string;
  /** Shown bottom-left next to the logo, e.g. "zaref.in/work". */
  footer: string;
}

/** Branded 1200×630 social card shared by case studies and products. */
export async function renderOgCard({ eyebrow, title, description, image, footer }: OgCardInput) {
  const [cover, logoBuffer] = await Promise.all([
    loadCover(image),
    readFile(join(process.cwd(), 'public', 'zaref-logo-full-dark.png')),
  ]);
  const logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;

  const hasCover = !!cover;
  const shownTitle = clip(title, 90);
  // Longer titles step down a size so they never overflow the card.
  const titleSize = hasCover
    ? (shownTitle.length > 60 ? 40 : shownTitle.length > 36 ? 48 : 56)
    : (shownTitle.length > 60 ? 56 : 68);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b1018',
          padding: 64,
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 64 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, letterSpacing: 3, color: '#7ba8f5', textTransform: 'uppercase', marginBottom: 22 }}>
              {clip(eyebrow, 48)}
            </div>
            <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1 }}>
              {shownTitle}
            </div>
            {description ? (
              <div style={{ display: 'flex', fontSize: 25, lineHeight: 1.45, color: '#98a2b3', marginTop: 24 }}>
                {clip(description, hasCover ? 85 : 150)}
              </div>
            ) : null}
          </div>

          {cover ? (
            <div
              style={{
                display: 'flex',
                width: 520,
                height: 292,
                borderRadius: 20,
                overflow: 'hidden',
                border: '2px solid #1f2937',
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} width={520} height={292} alt="" style={{ width: 520, height: 292, objectFit: 'cover' }} />
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={187} height={40} alt="" />
          <div style={{ display: 'flex', fontSize: 24, color: '#98a2b3', fontWeight: 500 }}>{footer}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
