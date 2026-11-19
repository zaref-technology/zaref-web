import { ArrowUpRight } from 'lucide-react';
import type { ParsedVideo } from '@/lib/video';

/**
 * Inline player for a parsed video link. Landscape YouTube is 16:9; Shorts and Instagram are
 * vertical. Iframes are lazy-loaded so a page with several videos doesn't fetch every player
 * up front — each one loads as it scrolls into view and plays on click.
 */
export function VideoEmbed({ video, title }: { video: ParsedVideo; title: string }) {
  const isInstagram = video.provider === 'Instagram';

  // Vertical players get a fixed width (capped to the viewport via max-w-full) rather than a
  // percentage: inside an auto-sized grid/flex track a percentage width collapses to nothing.
  // Instagram's embed is the media plus a fixed header/footer, so its frame is taller than 9:16.
  const frame =
    video.orientation === 'landscape'
      ? 'aspect-video w-full'
      : isInstagram
        ? `w-full ${video.kind === 'instagram-reel' ? 'aspect-[12/25]' : 'aspect-[19/30]'}`
        : 'aspect-[9/16] w-full';

  return (
    <figure className={video.orientation === 'landscape' ? 'w-full' : `max-w-full ${isInstagram ? 'w-[380px]' : 'w-[320px]'}`}>
      <div className={`relative overflow-hidden rounded-xl border border-border ${isInstagram ? 'bg-white' : 'bg-black'} ${frame}`}>
        <iframe
          src={video.embedUrl}
          title={`${title} — ${video.label}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <figcaption className="mt-2">
        <a
          href={video.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-primary"
        >
          Watch on {video.provider} <ArrowUpRight size={12} />
        </a>
      </figcaption>
    </figure>
  );
}
