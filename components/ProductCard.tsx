import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { getProductUrl } from '@/constants/routes';
import { PRODUCT_CTA, stageMeta } from '@/constants/product';
import type { Product } from '@/types/product';

export function StageBadge({ stage, className }: { stage: Product['stage']; className?: string }) {
  const { label, tone } = stageMeta(stage);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${className ?? ''}`}
      style={{ color: tone, background: `${tone}1a` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} aria-hidden />
      {label}
    </span>
  );
}

export function ProductLogo({ product, size }: { product: Product; size: number }) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2 font-bold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {product.logo ? (
        <Image src={product.logo} alt="" fill sizes={`${size}px`} className="object-contain p-1.5" />
      ) : (
        product.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

/**
 * The 16:9 visual (YouTube-thumbnail proportions, 1280×720) every product gets, so the page is image-led like /work even before a
 * screenshot exists. With a cover image it is the screenshot; without one it is a branded panel
 * (soft brand glow + faint grid, logo, name) — never a blank box.
 */
export function ProductVisual({
  product, priority = false, sizes, className = '',
}: { product: Product; priority?: boolean; sizes: string; className?: string }) {
  return (
    <div className={`group/visual relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface-2 ${className}`}>
      {product.coverImage ? (
        // Covers are 1280×720 (16:9) like every other cover on the site, so `cover` fills the frame.
        <Image
          src={product.coverImage}
          alt={`${product.name} — product screenshot`}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition-transform duration-300 group-hover/visual:scale-[1.02]"
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{
            background:
              'radial-gradient(ellipse at 25% 15%, rgba(37,99,235,0.20), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(124,58,237,0.14), transparent 50%), var(--surface-2)',
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            }}
            aria-hidden
          />
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background text-3xl font-bold text-primary shadow-[0_8px_30px_rgba(15,23,42,0.10)]">
            {product.logo ? (
              <Image src={product.logo} alt="" fill sizes="80px" className="object-contain p-3" />
            ) : (
              product.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="relative text-lg font-bold tracking-[-0.01em] text-foreground">{product.name}</span>
        </div>
      )}
    </div>
  );
}

/** The product's call to action. A product with no URL never gets a dead link — it says so. */
export function ProductLink({ product, className }: { product: Product; className?: string }) {
  if (!product.productUrl) {
    return product.stage === 'in-development'
      ? <span className="text-sm font-medium text-muted">Coming soon</span>
      : null;
  }
  return (
    <a
      href={product.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${PRODUCT_CTA[product.stage]}: ${product.name} (opens in a new tab)`}
      className={className ?? 'inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary'}
    >
      {PRODUCT_CTA[product.stage]} <ArrowUpRight size={14} />
    </a>
  );
}

/** Large editorial split for the lead product — same family as the featured project on /work. */
export function FeaturedProduct({ product }: { product: Product }) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <Link href={getProductUrl(product)} aria-label={`View ${product.name}`} className="block lg:order-2">
        <ProductVisual product={product} priority sizes="(min-width: 1024px) 50vw, 100vw" />
      </Link>

      <div className="flex flex-col justify-center lg:order-1">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {product.category && (
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{product.category}</span>
          )}
          <StageBadge stage={product.stage} />
        </div>
        <h2 className="mb-3 text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-[1.15] text-foreground">{product.name}</h2>
        <p className="mb-3 max-w-[480px] text-lg font-medium leading-[1.5] text-foreground">{product.tagline}</p>
        {product.description && (
          <p className="mb-5 line-clamp-3 max-w-[480px] leading-[1.65] text-muted">{product.description}</p>
        )}
        {product.features.length > 0 && (
          <ul className="mb-5 grid max-w-[480px] gap-2">
            {product.features.slice(0, 3).map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted">
                <Check size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden /> {f}
              </li>
            ))}
          </ul>
        )}
        {product.technologies.length > 0 && (
          <p className="mb-6 text-xs font-medium text-muted">{product.technologies.slice(0, 5).join('  ·  ')}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href={getProductUrl(product)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            View details <ArrowRight size={14} />
          </Link>
          <ProductLink product={product} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-primary" />
        </div>
      </div>
    </div>
  );
}

/** Grid card: visual first, then text — mirrors the project cards on /work. */
export function ProductCard({ product }: { product: Product }) {
  return (
    <article>
      <div className="relative mb-4">
        <Link href={getProductUrl(product)} aria-label={`View ${product.name}`} className="block">
          <ProductVisual product={product} sizes="(min-width: 640px) 50vw, 100vw" />
        </Link>
        <StageBadge stage={product.stage} className="absolute left-3 top-3 bg-background/90 backdrop-blur" />
      </div>
      {product.category && (
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-primary">{product.category}</span>
      )}
      <h3 className="mb-2 text-lg font-bold leading-[1.25] text-foreground">
        <Link href={getProductUrl(product)} className="transition-colors hover:text-primary">{product.name}</Link>
      </h3>
      <p className="mb-3 line-clamp-2 text-sm leading-[1.6] text-muted">{product.tagline}</p>
      {product.technologies.length > 0 && (
        <p className="mb-3 text-xs font-medium text-muted">{product.technologies.slice(0, 4).join('  ·  ')}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href={getProductUrl(product)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          View details <ArrowRight size={14} />
        </Link>
        <ProductLink product={product} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-primary" />
      </div>
    </article>
  );
}
