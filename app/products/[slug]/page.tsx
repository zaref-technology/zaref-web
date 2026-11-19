import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { getProductBySlug, listProducts } from '@/services/products.service';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { ProductCard, ProductLogo, ProductVisual, StageBadge } from '@/components/ProductCard';
import { VideoEmbed } from '@/components/VideoEmbed';
import { parseVideoUrl, type ParsedVideo } from '@/lib/video';
import { ROUTES, getProductUrl } from '@/constants/routes';
import { PRODUCT_CTA } from '@/constants/product';
import { SITE_NAME } from '@/constants/site';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/structured-data';

interface PageProps { params: Promise<{ slug: string }>; }

export const revalidate = 300;

/** Pre-renders every published product at build time. A failed read (e.g. Firestore rules not
 * deployed yet) yields no static pages rather than failing the build; pages then render on demand. */
export async function generateStaticParams() {
  const products = await listProducts().catch(() => []);
  return products.filter(p => !!p.slug).map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product Not Found' };

  const title = product.name;
  const description = product.tagline || product.description || `${product.name} — a product by Zaref.`;
  const path = getProductUrl(product);
  // See app/work/[slug]/page.tsx — the share image comes from ./opengraph-image.tsx, and the
  // re-declared fields are needed because `openGraph`/`twitter` replace the layout's objects.
  const ogTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: SITE_NAME, title: ogTitle, description, url: path },
    twitter: { card: 'summary_large_image', title: ogTitle, description },
  };
}

const factLabel = 'text-xs font-bold uppercase tracking-wider text-muted';

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const path = getProductUrl(product);
  const paragraphs = product.description.split('\n').map(p => p.trim()).filter(Boolean);
  const others = (await listProducts().catch(() => [])).filter(p => p.id !== product.id).slice(0, 2);

  // Unrecognised links are dropped here rather than rendered, so only known providers are ever
  // placed in an iframe. Landscape (YouTube) and portrait (Shorts / Instagram) are laid out apart.
  const videos = (product.videos ?? []).map(parseVideoUrl).filter((v): v is ParsedVideo => v !== null);
  const wideVideos = videos.filter(v => v.orientation === 'landscape');
  const tallVideos = videos.filter(v => v.orientation === 'portrait');

  const facts = [
    { label: 'Category', value: product.category },
    { label: 'Technology', value: product.technologies.join(', ') },
  ].filter(f => f.value.trim());

  return (
    <div className="pt-[var(--header-height)]">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Products', path: ROUTES.products }, { name: product.name, path }])} />
      <JsonLd data={productJsonLd({
        path,
        name: product.name,
        description: product.description || product.tagline,
        image: product.coverImage || undefined,
        category: product.category,
        productUrl: product.productUrl || undefined,
        dateModified: product.updatedAt?.toDate().toISOString(),
      })} />

      <Container className="flex items-center justify-between gap-4 py-4">
        <Link href={ROUTES.products} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground">
          <ArrowLeft size={15} /> Back to Products
        </Link>
        {product.productUrl ? (
          <Button href={product.productUrl} size="sm">
            {PRODUCT_CTA[product.stage]} <ArrowRight size={14} />
          </Button>
        ) : product.stage === 'in-development' ? (
          <Button href={ROUTES.contact} size="sm">
            Request early access <ArrowRight size={14} />
          </Button>
        ) : null}
      </Container>

      <article>
        {/* The cover image leads the page. The product name is still the page's <h1> for search
            engines and screen readers — just not repeated as a large visual hero. */}
        <h1 className="sr-only">{product.name} — {product.tagline}</h1>

        {/* Visual */}
        <Container className="pt-2 md:pt-4">
          <div className="mx-auto max-w-[1100px]">
            <ProductVisual product={product} priority sizes="(min-width: 1152px) 1100px, 100vw" />
          </div>
        </Container>

        {/* Videos — played inline */}
        {videos.length > 0 && (
          <Container className="pt-14">
            <div className="mx-auto max-w-[1100px]">
              <h2 className="mb-6 text-xs font-bold uppercase tracking-[0.12em] text-primary">See it in action</h2>

              {wideVideos.length > 0 && (
                <div className={`grid gap-6 ${wideVideos.length > 1 ? 'md:grid-cols-2' : ''}`}>
                  {wideVideos.map(v => <VideoEmbed key={v.watchUrl} video={v} title={product.name} />)}
                </div>
              )}

              {/* Vertical videos (Shorts, Instagram) sit on a framed stage so a single narrow
                  player never floats alone in an empty row. With no wide video above, the stage
                  also carries a short text block so both halves have content. */}
              {tallVideos.length > 0 && (
                <div
                  className={`overflow-hidden rounded-2xl border border-border p-6 md:p-10 ${wideVideos.length > 0 ? 'mt-8' : ''}`}
                  style={{
                    background:
                      'radial-gradient(ellipse at 20% 10%, rgba(37,99,235,0.14), transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(124,58,237,0.10), transparent 50%), var(--surface-2)',
                  }}
                >
                  <div className={wideVideos.length === 0 ? 'grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-16' : ''}>
                    {wideVideos.length === 0 && (
                      <div className="max-w-[460px]">
                        <h3 className="mb-3 text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-[1.2] text-foreground">
                          {product.name}, in action
                        </h3>
                        <p className="mb-6 text-[1.05rem] leading-[1.7] text-muted">{product.tagline}</p>
                        {product.productUrl && (
                          <Button href={product.productUrl}>
                            {PRODUCT_CTA[product.stage]} <ArrowRight size={16} />
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-8">
                      {tallVideos.map(v => <VideoEmbed key={v.watchUrl} video={v} title={product.name} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Container>
        )}

        {/* Body */}
        <Container className="py-14 md:py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
            <div className="min-w-0">
              {paragraphs.length > 0 && (
                <section className="mb-12">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-primary">About {product.name}</h2>
                  <div className="space-y-4 text-[1.05rem] leading-[1.75] text-muted">
                    {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                </section>
              )}

              {product.features.length > 0 && (
                <section>
                  <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-primary">Key features</h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {product.features.map(f => (
                      <li key={f} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-[0.95rem] leading-[1.5] text-foreground">
                        <Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
                  <ProductLogo product={product} size={44} />
                  <span className="text-lg font-bold leading-[1.2] text-foreground">{product.name}</span>
                </div>
                <dl className="space-y-5">
                  <div>
                    <dt className={factLabel}>Status</dt>
                    <dd className="mt-1.5"><StageBadge stage={product.stage} /></dd>
                  </div>
                  {facts.map(f => (
                    <div key={f.label}>
                      <dt className={factLabel}>{f.label}</dt>
                      <dd className="mt-1 text-sm font-medium leading-[1.5] text-foreground">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                {product.productUrl && (
                  <Button href={product.productUrl} fullWidth className="mt-6">
                    {PRODUCT_CTA[product.stage]}
                  </Button>
                )}
              </div>
            </aside>
          </div>
        </Container>

        {others.length > 0 && (
          <section className="border-t border-border bg-surface py-16">
            <Container>
              <div className="mb-8 flex items-end justify-between gap-4">
                <h2 className="text-[clamp(1.4rem,2.4vw,1.85rem)] font-bold text-foreground">More from Zaref</h2>
                <Link href={ROUTES.products} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary">
                  All products <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2">
                {others.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </Container>
          </section>
        )}
      </article>

      <section className="bg-[#0b1018] py-20 md:py-24">
        <Container>
          <div className="mx-auto max-w-[600px] text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#7ba8f5]">Work With Us</p>
            <h2 className="mb-4 text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-[-0.01em] text-white">
              Need software like {product.name}?
            </h2>
            <p className="mx-auto mb-8 text-[1.05rem] leading-[1.6] text-white/60">
              The team that builds our products also builds custom software and business systems for companies.
            </p>
            <Button href={ROUTES.contact}>
              Discuss Your Project <ArrowRight size={16} />
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
