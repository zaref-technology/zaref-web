'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle, AlertTriangle, Loader2, Upload, X, Plus, ExternalLink, Package,
} from 'lucide-react';
import { parseVideoUrl } from '@/lib/video';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { slugify } from '@/lib/slug';
import { triggerRevalidate } from '@/lib/revalidate';
import {
  createProduct, updateProduct, isProductSlugTaken, getNextProductOrder,
} from '@/services/products.service';
import {
  PRODUCT_STAGES, PRODUCT_CATEGORIES, PRODUCT_CTA, stageMeta,
  MAX_PRODUCT_FEATURES, MAX_PRODUCT_TECHNOLOGIES, MAX_PRODUCT_VIDEOS,
} from '@/constants/product';
import type { ProductInput, ProductStage, ProductStatus } from '@/types/product';

/** Form state shape — a ProductInput plus an optional id, present only in edit mode. */
export type ProductFormData = ProductInput & { id?: string };

interface ProductFormProps {
  initialData?: ProductFormData;
  mode: 'new' | 'edit';
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'var(--surface-2)',
  border: '1.5px solid var(--border)',
  borderRadius: '0.65rem',
  color: 'var(--foreground)',
  fontSize: '0.95rem',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 700,
  color: 'var(--foreground)', marginBottom: '0.4rem',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};
const hintStyle: React.CSSProperties = { fontSize: '0.78rem', color: 'var(--muted)', margin: '0.4rem 0 0' };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: '1.75rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 0.25rem' }}>{title}</h2>
      {description && <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>{description}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: description ? 0 : '1.25rem' }}>
        {children}
      </div>
    </section>
  );
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Image upload control: preview tile + upload / remove buttons. */
function ImageField({
  label, hint, value, uploading, onUpload, onRemove, aspect, fallback,
}: {
  label: string; hint: string; value: string; uploading: boolean;
  onUpload: (file: File) => void; onRemove: () => void; aspect: string; fallback: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{
          aspectRatio: aspect, height: '84px', borderRadius: '0.75rem',
          background: 'var(--surface-2)', border: '1.5px dashed var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
        }}>
          {value
            ? <img src={value} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : fallback}
        </div>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label style={{
              padding: '0.5rem 1rem', cursor: uploading ? 'not-allowed' : 'pointer',
              background: 'var(--surface-2)', border: '1.5px solid var(--border)',
              borderRadius: '0.65rem', fontSize: '0.85rem', fontWeight: 600,
              color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              {uploading
                ? <><Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> Uploading…</>
                : <><Upload size={13} /> {value ? 'Replace' : 'Upload'}</>}
              <input
                type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
            {value && (
              <button
                type="button" onClick={onRemove}
                style={{ padding: '0.5rem 0.85rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.65rem', color: '#ef4444', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'inherit' }}
              >
                <X size={12} /> Remove
              </button>
            )}
          </div>
          <p style={hintStyle}>{hint}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProductForm({ initialData, mode }: ProductFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormData>({
    name:         initialData?.name         ?? '',
    slug:         initialData?.slug         ?? '',
    tagline:      initialData?.tagline      ?? '',
    description:  initialData?.description  ?? '',
    stage:        initialData?.stage        ?? 'live',
    status:       initialData?.status       ?? 'draft',
    category:     initialData?.category     ?? '',
    logo:         initialData?.logo         ?? '',
    coverImage:   initialData?.coverImage   ?? '',
    features:     initialData?.features     ?? [],
    technologies: initialData?.technologies ?? [],
    videos:       initialData?.videos       ?? [],
    productUrl:   initialData?.productUrl   ?? '',
    featured:     initialData?.featured     ?? false,
    order:        initialData?.order        ?? 1,
  });
  // On a new product the slug follows the name until the admin edits it by hand.
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [techInput, setTechInput]     = useState('');
  const [uploading, setUploading]     = useState<'logo' | 'coverImage' | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  useEffect(() => {
    if (mode !== 'new') return;
    getNextProductOrder().then(n => setForm(prev => ({ ...prev, order: n }))).catch(() => {});
  }, [mode]);

  const patch = (changes: Partial<ProductFormData>) => setForm(prev => ({ ...prev, ...changes }));

  const handleName = (name: string) =>
    setForm(prev => ({ ...prev, name, ...(slugTouched ? {} : { slug: slugify(name) }) }));

  const handleUpload = async (field: 'logo' | 'coverImage', file: File) => {
    setUploading(field);
    setError('');
    try {
      patch({ [field]: await uploadToCloudinary(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploading(null);
    }
  };

  const addTech = (raw: string) => {
    const incoming = raw.split(',').map(t => t.trim()).filter(Boolean);
    if (incoming.length === 0) return;
    const existing = new Set(form.technologies.map(t => t.toLowerCase()));
    const merged = [...form.technologies];
    for (const t of incoming) {
      if (!existing.has(t.toLowerCase()) && merged.length < MAX_PRODUCT_TECHNOLOGIES) {
        merged.push(t);
        existing.add(t.toLowerCase());
      }
    }
    patch({ technologies: merged });
    setTechInput('');
  };

  const validate = async (): Promise<string> => {
    if (!form.name.trim()) return 'Product name is required.';
    if (!form.slug.trim()) return 'A URL slug is required.';
    if (form.slug !== slugify(form.slug)) return 'Slug can only contain lowercase letters, numbers and hyphens.';
    if (!form.tagline.trim()) return 'A one-line tagline is required.';
    if (form.productUrl.trim() && !isValidHttpUrl(form.productUrl.trim())) return 'Product URL must be a valid http(s) link.';
    const badVideo = (form.videos ?? []).findIndex(v => v.trim() && !parseVideoUrl(v));
    if (badVideo !== -1) return `Video ${badVideo + 1} isn't a supported link. Use a YouTube video, YouTube Shorts, or Instagram post/reel URL.`;
    if (form.status === 'published') {
      if (!form.description.trim()) return 'Add a description before publishing.';
      if (form.stage !== 'in-development' && !form.productUrl.trim()) {
        return `A ${stageMeta(form.stage).label.toLowerCase()} product needs a product URL before it can be published.`;
      }
    }
    if (await isProductSlugTaken(form.slug, initialData?.id)) return `The slug "${form.slug}" is already used by another product.`;
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const problem = await validate();
      if (problem) { setError(problem); return; }

      if (mode === 'new') await createProduct(form);
      else if (initialData?.id) await updateProduct(initialData.id, form);

      await triggerRevalidate([{ path: '/' }, { path: '/products' }, { path: `/products/${form.slug}` }, { path: '/work' }]);
      setSuccess(true);
      setTimeout(() => router.push('/admin/products'), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const stage = stageMeta(form.stage);
  const busy = loading || uploading !== null;

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Live preview — mirrors the public card so the result is never a surprise */}
      <div style={{ padding: '1.25rem', background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: '1rem', position: 'relative' }}>
        <span style={{ position: 'absolute', top: '0.75rem', right: '1rem', fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Preview</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '0.85rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem' }}>
            {form.logo
              ? <img src={form.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : (form.name.charAt(0).toUpperCase() || <Package size={20} />)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: 'var(--foreground)', fontSize: '1.05rem' }}>{form.name || 'Product name'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{form.category || 'Category'}</div>
          </div>
          <span style={{ marginLeft: 'auto', marginRight: '3.5rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, color: stage.tone, background: `${stage.tone}1a`, whiteSpace: 'nowrap' }}>
            {stage.label}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          {form.tagline || 'Your one-line pitch appears here.'}
        </p>
        <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)' }}>
          {PRODUCT_CTA[form.stage]} →
        </div>
      </div>

      <Section title="Basics" description="How the product is named and described across the site.">
        <div>
          <label style={labelStyle} htmlFor="p-name">Product Name *</label>
          <input id="p-name" value={form.name} onChange={e => handleName(e.target.value)} placeholder="e.g. Eduflow" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="p-slug">URL Slug *</label>
          <input
            id="p-slug" value={form.slug} readOnly={mode === 'edit'}
            onChange={e => { setSlugTouched(true); patch({ slug: slugify(e.target.value) }); }}
            placeholder="eduflow"
            style={{ ...inputStyle, ...(mode === 'edit' ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
          />
          <p style={hintStyle}>
            {mode === 'edit' ? 'The slug is locked after creation so existing links never break.' : 'Auto-generated from the name. Must be unique.'}
          </p>
        </div>
        <div>
          <label style={labelStyle} htmlFor="p-tagline">Tagline *</label>
          <input id="p-tagline" value={form.tagline} maxLength={120} onChange={e => patch({ tagline: e.target.value })} placeholder="One line on what it does and who it's for" style={inputStyle} />
          <p style={hintStyle}>{form.tagline.length}/120 · shown on cards</p>
        </div>
        <div>
          <label style={labelStyle} htmlFor="p-category">Category</label>
          <input id="p-category" list="product-categories" value={form.category} onChange={e => patch({ category: e.target.value })} placeholder="e.g. EdTech Platform" style={inputStyle} />
          <datalist id="product-categories">
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label style={labelStyle} htmlFor="p-description">Description</label>
          <textarea id="p-description" value={form.description} rows={5} onChange={e => patch({ description: e.target.value })} placeholder="What problem it solves, who uses it, and what makes it different." style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </Section>

      <Section title="Branding" description="Logo and a screenshot make the product page feel real. Both are optional.">
        <ImageField
          label="Logo" hint="Square, transparent PNG or SVG-like image works best." aspect="1 / 1"
          value={form.logo} uploading={uploading === 'logo'}
          onUpload={f => handleUpload('logo', f)} onRemove={() => patch({ logo: '' })}
          fallback={<Package size={22} style={{ color: 'var(--muted)', opacity: 0.5 }} />}
        />
        <ImageField
          label="Cover / Screenshot" hint="1280 × 720 px (16:9, YouTube-thumbnail size). Shown on the Products and Work pages." aspect="16 / 9"
          value={form.coverImage} uploading={uploading === 'coverImage'}
          onUpload={f => handleUpload('coverImage', f)} onRemove={() => patch({ coverImage: '' })}
          fallback={<Upload size={20} style={{ color: 'var(--muted)', opacity: 0.5 }} />}
        />
      </Section>

      <Section title="Highlights" description="Key capabilities and the stack behind the product.">
        <div>
          <label style={labelStyle}>Key Features ({form.features.length}/{MAX_PRODUCT_FEATURES})</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {form.features.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={f} aria-label={`Feature ${i + 1}`} placeholder="e.g. Automated fee reminders"
                  onChange={e => patch({ features: form.features.map((x, j) => (j === i ? e.target.value : x)) })}
                  style={inputStyle}
                />
                <button
                  type="button" aria-label={`Remove feature ${i + 1}`}
                  onClick={() => patch({ features: form.features.filter((_, j) => j !== i) })}
                  style={{ padding: '0 0.8rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.65rem', color: '#ef4444', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          {form.features.length < MAX_PRODUCT_FEATURES && (
            <button
              type="button" onClick={() => patch({ features: [...form.features, ''] })}
              style={{ marginTop: '0.6rem', padding: '0.5rem 0.9rem', background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: '0.65rem', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'inherit' }}
            >
              <Plus size={13} /> Add feature
            </button>
          )}
        </div>

        <div>
          <label style={labelStyle} htmlFor="p-tech">Technologies</label>
          {form.technologies.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {form.technologies.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem 0.25rem 0.7rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {t}
                  <button type="button" aria-label={`Remove ${t}`} onClick={() => patch({ technologies: form.technologies.filter(x => x !== t) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: '2px' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            id="p-tech" value={techInput} placeholder="Type a technology and press Enter (or paste a comma-separated list)"
            disabled={form.technologies.length >= MAX_PRODUCT_TECHNOLOGIES}
            onChange={e => setTechInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTech(techInput); } }}
            onBlur={() => addTech(techInput)}
            style={inputStyle}
          />
        </div>
      </Section>

      <Section
        title="Videos"
        description="Demos and walkthroughs, played inline on the product page. Paste a YouTube video, YouTube Shorts, or Instagram post/reel link."
      >
        <div>
          <label style={labelStyle}>Video links ({(form.videos ?? []).length}/{MAX_PRODUCT_VIDEOS})</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(form.videos ?? []).map((v, i) => {
              const parsed = parseVideoUrl(v);
              return (
                <div key={i}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      value={v} aria-label={`Video ${i + 1} link`} inputMode="url"
                      placeholder="youtube.com/watch?v=… · youtube.com/shorts/… · instagram.com/reel/…"
                      onChange={e => patch({ videos: (form.videos ?? []).map((x, j) => (j === i ? e.target.value : x)) })}
                      style={inputStyle}
                    />
                    <button
                      type="button" aria-label={`Remove video ${i + 1}`}
                      onClick={() => patch({ videos: (form.videos ?? []).filter((_, j) => j !== i) })}
                      style={{ padding: '0 0.8rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.65rem', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {v.trim() && (
                    <p style={{ ...hintStyle, color: parsed ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {parsed
                        ? <><CheckCircle size={12} /> {parsed.label} — plays {parsed.orientation === 'landscape' ? 'wide (16:9)' : 'vertical (9:16)'}</>
                        : <><AlertTriangle size={12} /> Not recognised — use a YouTube, YouTube Shorts, or Instagram post/reel link.</>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {(form.videos ?? []).length < MAX_PRODUCT_VIDEOS && (
            <button
              type="button" onClick={() => patch({ videos: [...(form.videos ?? []), ''] })}
              style={{ marginTop: '0.6rem', padding: '0.5rem 0.9rem', background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: '0.65rem', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'inherit' }}
            >
              <Plus size={13} /> Add video
            </button>
          )}
          <p style={hintStyle}>Instagram videos must be from a public account to play on the site.</p>
        </div>
      </Section>

      <Section title="Publishing" description="Where the product links to and whether visitors can see it.">
        <div>
          <label style={labelStyle} htmlFor="p-url">Product URL</label>
          <div style={{ position: 'relative' }}>
            <input id="p-url" type="url" value={form.productUrl} onChange={e => patch({ productUrl: e.target.value })} placeholder="https://eduflow.example.com" style={{ ...inputStyle, paddingRight: '2.5rem' }} />
            {form.productUrl && isValidHttpUrl(form.productUrl) && (
              <a href={form.productUrl} target="_blank" rel="noopener noreferrer" aria-label="Open product URL" style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex' }}>
                <ExternalLink size={15} />
              </a>
            )}
          </div>
          <p style={hintStyle}>Live site or waitlist page. Leave empty for a product that isn&apos;t public yet.</p>
        </div>

        <div className="admin-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle} htmlFor="p-stage">Stage</label>
            <select id="p-stage" value={form.stage} onChange={e => patch({ stage: e.target.value as ProductStage })} style={inputStyle}>
              {PRODUCT_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="p-status">Visibility</label>
            <select id="p-status" value={form.status} onChange={e => patch({ status: e.target.value as ProductStatus })} style={inputStyle}>
              <option value="draft">Draft — hidden from the site</option>
              <option value="published">Published — visible</option>
            </select>
          </div>
        </div>

        <div className="admin-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle} htmlFor="p-order">Display Order</label>
            <input id="p-order" type="number" min={0} value={form.order} onChange={e => patch({ order: Number(e.target.value) })} style={inputStyle} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: '0.65rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>
            <input type="checkbox" checked={form.featured} onChange={e => patch({ featured: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
            Feature at the top
          </label>
        </div>
      </Section>

      {error && (
        <div role="alert" style={{ padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.65rem', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}
      {success && (
        <div role="status" style={{ padding: '0.75rem 1rem', background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: '0.65rem', color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={15} /> Product saved! Redirecting…
        </div>
      )}

      <button
        type="submit" disabled={busy || success} className="btn-primary"
        style={{ justifyContent: 'center', opacity: busy ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> Saving…</>
          : mode === 'new' ? 'Add Product' : 'Save Changes'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}
