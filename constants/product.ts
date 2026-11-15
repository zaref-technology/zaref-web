import type { ProductStage } from '@/types/product';

export const PRODUCT_STAGES: { value: ProductStage; label: string; tone: string }[] = [
  { value: 'live', label: 'Live', tone: '#059669' },
  { value: 'beta', label: 'Beta', tone: '#d97706' },
  { value: 'in-development', label: 'In development', tone: '#2563eb' },
];

export function stageMeta(stage: ProductStage) {
  return PRODUCT_STAGES.find(s => s.value === stage) ?? PRODUCT_STAGES[2];
}

/** Call-to-action wording per stage, so a card never promises something that isn't there. */
export const PRODUCT_CTA: Record<ProductStage, string> = {
  live: 'Visit product',
  beta: 'Try the beta',
  'in-development': 'Get notified',
};

/** Datalist suggestions for the category field — free text is still allowed. */
export const PRODUCT_CATEGORIES = [
  'EdTech Platform',
  'Business Software',
  'CRM',
  'SaaS Platform',
  'Mobile Application',
  'Developer Tool',
];

export const MAX_PRODUCT_FEATURES = 6;
export const MAX_PRODUCT_TECHNOLOGIES = 12;
