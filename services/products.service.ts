import {
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, where,
  query, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product, ProductInput } from '@/types/product';

const COLLECTION = 'products';

export interface ListProductsOptions {
  /** Admin views need drafts visible; public pages default to published only. */
  includeDrafts?: boolean;
  limit?: number;
}

/**
 * Featured first, then by `order` ascending. Sorted in memory rather than via Firestore
 * `orderBy` so a document missing the field is never silently dropped from the result.
 */
function sortProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
    return (a.order ?? Infinity) - (b.order ?? Infinity);
  });
}

export async function listProducts(options: ListProductsOptions = {}): Promise<Product[]> {
  const { includeDrafts = false, limit } = options;
  const snap = await getDocs(collection(db, COLLECTION));
  let products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

  if (!includeDrafts) products = products.filter(p => p.status === 'published');
  products = sortProducts(products);
  if (limit) products = products.slice(0, limit);
  return products;
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
}

/**
 * Canonical PUBLIC lookup for /products/[slug]. Resolves strictly by the explicit `slug`;
 * a draft resolves to null exactly like a product that doesn't exist, so an unpublished product
 * can never render publicly just because its slug is known.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const snap = await getDocs(query(collection(db, COLLECTION), where('slug', '==', slug)));
  if (snap.empty) return null;
  const product = { id: snap.docs[0].id, ...snap.docs[0].data() } as Product;
  return product.status === 'published' ? product : null;
}

/** True if `slug` belongs to a different product. `excludeId` is the product being edited. */
export async function isProductSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, COLLECTION), where('slug', '==', slug)));
  return snap.docs.some(d => d.id !== excludeId);
}

/** Next free `order` value: highest existing + 1 (1 for the first product). */
export async function getNextProductOrder(): Promise<number> {
  const snap = await getDocs(collection(db, COLLECTION));
  const highest = snap.docs.reduce((max, d) => {
    const n = d.data().order;
    return typeof n === 'number' && n > max ? n : max;
  }, 0);
  return highest + 1;
}

function toPayload(data: ProductInput): ProductInput {
  return {
    ...data,
    name: data.name.trim(),
    tagline: data.tagline.trim(),
    description: data.description.trim(),
    category: data.category.trim(),
    productUrl: data.productUrl.trim(),
    features: data.features.map(f => f.trim()).filter(Boolean),
    technologies: data.technologies.map(t => t.trim()).filter(Boolean),
    // Always an array (never undefined — Firestore rejects it); blanks and duplicates dropped.
    videos: [...new Set((data.videos ?? []).map(v => v.trim()).filter(Boolean))],
    order: Number(data.order),
  };
}

export async function createProduct(data: ProductInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...toPayload(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id: string, data: ProductInput): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...toPayload(data),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
