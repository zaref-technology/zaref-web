import type { Metadata } from 'next';
import { ArrowRight, Package } from 'lucide-react';
import { listProducts } from '@/services/products.service';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FeaturedProduct, ProductCard } from '@/components/ProductCard';
import { ROUTES } from '@/constants/routes';
import { DEFAULT_OG_IMAGES } from '@/constants/site';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd } from '@/lib/structured-data';

const title = 'Products';
const description = 'Software products designed, built and operated by Zaref — separate from the work we do for clients.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: ROUTES.products },
  openGraph: { title, description, url: ROUTES.products, images: DEFAULT_OG_IMAGES },
  twitter: { title, description, images: DEFAULT_OG_IMAGES },
};

export const revalidate = 300;

export default async function ProductsPage() {
  // A failed read (e.g. Firestore rules for `products` not deployed yet) renders the empty
  // state instead of failing the build or the revalidation.
  const products = await listProducts().catch(err => {
    console.error('ProductsPage: failed to load products', err);
    return [];
  });
  // The lead product gets the large treatment: the one flagged "featured" (the service sorts
  // those first), otherwise simply the first by display order — so a single product never
  // ends up as a lonely card in an empty grid.
  const featured = products[0] ?? null;
  const rest = products.slice(1);

  return (
    <div className="pt-[var(--header-height)]">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Products', path: ROUTES.products }])} />

      <section className="relative overflow-hidden border-b border-border bg-surface pb-16 pt-10 md:pb-20 md:pt-14">
        <Container>
          <div className="relative z-[1]">
            <Badge>Products</Badge>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.1] text-foreground">
              Software we build and run ourselves.
            </h1>
            <p className="mt-4 max-w-[600px] text-lg text-muted">
              Beyond client projects, Zaref designs, ships and operates its own products — the same engineering standards, applied to our own ideas.
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-20 pt-12">
        <Container>
          {products.length === 0 ? (
            <div className="py-20 text-center text-muted">
              <Package size={36} className="mx-auto mb-3 opacity-30" />
              <p>No products published yet — check back soon.</p>
            </div>
          ) : (
            <>
              {featured && <FeaturedProduct product={featured} />}
              {rest.length > 0 && (
                <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 border-t border-border pt-14 sm:grid-cols-2">
                  {rest.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </>
          )}
        </Container>
      </section>

      <section className="bg-[#0b1018] py-20 md:py-24">
        <Container>
          <div className="mx-auto max-w-[600px] text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#7ba8f5]">Work With Us</p>
            <h2 className="mb-4 text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-[-0.01em] text-white">
              Want something like this built for you?
            </h2>
            <p className="mx-auto mb-8 text-[1.05rem] leading-[1.6] text-white/60">
              The team behind these products also builds custom software and business systems for companies.
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
