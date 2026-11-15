'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Package, Search, ExternalLink, Star, Loader2 } from 'lucide-react';
import { listProducts, deleteProduct } from '@/services/products.service';
import { PRODUCT_STAGES, stageMeta } from '@/constants/product';
import { triggerRevalidate } from '@/lib/revalidate';
import type { Product, ProductStage } from '@/types/product';

type StageFilter = 'all' | ProductStage;

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [stage, setStage]       = useState<StageFilter>('all');

  useEffect(() => {
    listProducts({ includeDrafts: true })
      .then(setProducts)
      .catch(err => {
        console.error(err);
        setLoadError('Could not load products. Check your connection and Firestore permissions.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const slug = products.find(p => p.id === id)?.slug;
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      await triggerRevalidate([{ path: '/' }, { path: '/products' }, ...(slug ? [{ path: `/products/${slug}` }] : []), { path: '/work' }]);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  };

  const stats = useMemo(() => ({
    total: products.length,
    published: products.filter(p => p.status === 'published').length,
    live: products.filter(p => p.stage === 'live').length,
    drafts: products.filter(p => p.status === 'draft').length,
  }), [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p =>
      (stage === 'all' || p.stage === stage) &&
      (!q || [p.name, p.tagline, p.category].some(v => v?.toLowerCase().includes(q)))
    );
  }, [products, search, stage]);

  const statCards = [
    { label: 'Total products', value: stats.total },
    { label: 'Published',      value: stats.published },
    { label: 'Live',           value: stats.live },
    { label: 'Drafts',         value: stats.drafts },
  ];

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 0.85rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 0.35rem' }}>Products</h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>
            Zaref&apos;s own products, shown on the Products page and the Work page.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.1 }}>{loading ? '–' : s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" aria-label="Search products"
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.4rem', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: '0.75rem', color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setStage('all')} aria-pressed={stage === 'all'} style={chip(stage === 'all')}>All</button>
          {PRODUCT_STAGES.map(s => (
            <button key={s.value} type="button" onClick={() => setStage(s.value)} aria-pressed={stage === s.value} style={chip(stage === s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div role="alert" style={{ padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.65rem', color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {loadError}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '84px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.85rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : products.length === 0 && !loadError ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Package size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3, color: 'var(--muted)' }} />
          <h2 style={{ fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.5rem' }}>No products yet</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Add your first product to showcase it on the Products page.</p>
          <Link href="/admin/products/new" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Add First Product
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2.5rem 0' }}>No products match your filters.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visible.map(p => {
            const meta = stageMeta(p.stage);
            return (
              <div key={p.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontWeight: 800, color: 'var(--primary)' }}>
                  {p.logo ? <img src={p.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : p.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '0.95rem' }}>{p.name}</span>
                    {p.featured && <Star size={13} fill="#f59e0b" color="#f59e0b" aria-label="Featured" />}
                    <span style={{ padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, color: meta.tone, background: `${meta.tone}1a` }}>{meta.label}</span>
                    <span style={{ padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, color: p.status === 'published' ? '#059669' : 'var(--muted)', background: p.status === 'published' ? 'rgba(5,150,105,0.12)' : 'var(--surface-2)', border: p.status === 'published' ? 'none' : '1px solid var(--border)' }}>
                      {p.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.tagline}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    {[p.category, `Order ${p.order}`].filter(Boolean).join(' · ')}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                  {p.productUrl && (
                    <a href={p.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.name}`} style={{ padding: '0.45rem 0.65rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '0.6rem', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <Link href={`/admin/products/${p.id}/edit`} style={{ padding: '0.45rem 0.9rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '0.6rem', color: 'var(--foreground)', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Pencil size={12} /> Edit
                  </Link>
                  {confirmId === p.id ? (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{ padding: '0.45rem 0.85rem', background: '#dc2626', border: 'none', borderRadius: '0.6rem', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {deleting === p.id ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmId(null)} style={{ padding: '0.45rem 0.85rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '0.6rem', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(p.id)} aria-label={`Delete ${p.name}`} style={{ padding: '0.45rem 0.65rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.6rem', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
