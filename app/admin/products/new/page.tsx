import Link from 'next/link';
import ProductForm from '../../components/ProductForm';
import { ChevronRight } from 'lucide-react';

export default function NewProductPage() {
  return (
    <div style={{ maxWidth: '720px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
        <Link href="/admin/products" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: 600 }}>Products</Link>
        <ChevronRight size={14} />
        <span>New Product</span>
      </div>
      <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.9rem)', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 0.35rem' }}>Add Product</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Add one of Zaref&apos;s own products. Save it as a draft first if you aren&apos;t ready to show it.
      </p>
      <ProductForm mode="new" />
    </div>
  );
}
