import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { listProducts } from '@/services/products.service';
import { Container } from '@/components/ui/Container';
import { ProductVisual, StageBadge } from '@/components/ProductCard';
import { ROUTES, getProductUrl } from '@/constants/routes';

/** Slim "our own products" band for the Work page. Renders nothing until at least one product
 * is published, so an empty collection never leaves a hollow section on the site. */
export default async function ProductsTeaser() {
  let products;
  try {
    products = await listProducts({ limit: 4 });
  } catch (err) {
    console.error('ProductsTeaser: failed to load products', err);
    return null;
  }
  if (products.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface py-16">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">Our Products</p>
            <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-[1.2] text-foreground">
              We also build our own software.
            </h2>
          </div>
          <Link href={ROUTES.products} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary">
            See all products <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map(p => (
            <Link key={p.id} href={getProductUrl(p)} className="group/visual block">
              <div className="relative mb-3">
                <ProductVisual product={p} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
                <StageBadge stage={p.stage} className="absolute left-3 top-3 bg-background/90 backdrop-blur" />
              </div>
              <h3 className="font-bold text-foreground transition-colors group-hover/visual:text-primary">{p.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-[1.5] text-muted">{p.tagline}</p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
