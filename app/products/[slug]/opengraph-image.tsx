import { getProductBySlug } from '@/services/products.service';
import { stageMeta } from '@/constants/product';
import { OG_SIZE, renderOgCard } from '@/lib/og';

export const alt = 'Zaref product';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  // Unknown/draft slug: the page itself 404s, so this only needs to be a safe branded card.
  if (!product) {
    return renderOgCard({ eyebrow: 'Product', title: 'Software we build ourselves.', footer: 'zaref.in/products' });
  }

  return renderOgCard({
    eyebrow: ['Product', stageMeta(product.stage).label, product.category].filter(Boolean).join(' · '),
    title: product.name,
    description: product.tagline || product.description?.split('\n')[0],
    image: product.coverImage,
    footer: 'zaref.in/products',
  });
}
