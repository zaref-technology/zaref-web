import type { Timestamp } from 'firebase/firestore';

/** Where the product is in its lifecycle — what visitors see as the status badge. */
export type ProductStage = 'live' | 'beta' | 'in-development';

/** Whether the product appears on the public site at all. */
export type ProductStatus = 'draft' | 'published';

export interface Product {
  id: string;
  name: string;
  /** Stable public identity. Generated from `name` at creation, then never silently changed. */
  slug: string;
  /** One-line pitch shown on cards. */
  tagline: string;
  /** Short paragraph shown on the Products page. */
  description: string;
  stage: ProductStage;
  status: ProductStatus;
  /** e.g. "EdTech Platform", "CRM". Free text, suggestions come from constants/product.ts. */
  category: string;
  /** Cloudinary URL or empty string — no placeholder is generated. */
  logo: string;
  /** Cloudinary URL (product screenshot / hero) or empty string. */
  coverImage: string;
  features: string[];
  technologies: string[];
  /** Live product / waitlist URL. Empty for a product with no public destination yet. */
  productUrl: string;
  /** One featured slot is shown large at the top of /products. */
  featured: boolean;
  order: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
