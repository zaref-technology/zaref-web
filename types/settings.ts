export interface SiteSettings {
  // Contact info
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  location: string;
  /** Legal owner of the business (Zaref is a sole proprietorship). Shown on the Privacy Policy and
   * Terms pages. Lives in Firestore so it is never hardcoded in the codebase. */
  ownerName: string;
  // Social links
  github: string;
  linkedin: string;
  twitter: string;
  instagram: string;
  facebook: string;
  youtube: string;
  // Branding
  siteName: string;
  tagline: string;
}
