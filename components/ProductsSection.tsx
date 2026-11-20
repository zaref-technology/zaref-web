import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { listProducts } from '@/services/products.service';
import { ROUTES } from '@/constants/routes';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Badge } from '@/components/ui/Badge';
import { FeaturedProduct, ProductCard } from '@/components/ProductCard';

/** Homepage "Our products" section, placed after Selected Work. Same lead + grid logic as
 * /products: the first product gets the large treatment, the next ones sit in a 2-column grid.
 * Renders nothing until a product is published, so it never leaves a hollow section. */
export default async function ProductsSection() {
  let products;
  try {
    products = await listProducts({ limit: 3 });
  } catch (err) {
    console.error('ProductsSection: failed to load products', err);
    return null;
  }
  if (products.length === 0) return null;

  const [lead, ...rest] = products;

  return (
    <Section>
      <Container>
        <div className="mb-14 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge>Our Products</Badge>
            <h2 className="text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-[-0.01em] text-foreground">
              Software we build ourselves.
            </h2>
            <p className="mt-3 max-w-[480px] text-[1.05rem] leading-[1.6] text-muted">
              Beyond client work, we design, ship and run our own products.
            </p>
          </div>
          <Link
            href={ROUTES.products}
            className="inline-flex flex-shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            Explore Our Products <ArrowRight size={14} />
          </Link>
        </div>

        <FeaturedProduct product={lead} />

        {rest.length > 0 && (
          <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 border-t border-border pt-14 sm:grid-cols-2">
            {rest.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </Container>
    </Section>
  );
}
