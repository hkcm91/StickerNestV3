/**
 * StickerNest v2 - Canvas Publishing Types
 * Types for canvas-to-web-page publishing pipeline
 *
 * ALPHA NOTES:
 * - SEO metadata stored in canvas settings JSON field
 * - Slug uniqueness validated on server
 * - Thumbnail generation happens client-side, uploaded to storage
 */

import type { CanvasVisibility } from './domain';

// ============================================
// SEO Metadata Types
// ============================================

/**
 * SEO metadata for published canvas pages
 * Stored in canvas.settings.seo field
 */
export interface CanvasSEOMetadata {
  /** Page title (og:title, twitter:title) - defaults to canvas name */
  title?: string;
  /** Page description (og:description, twitter:description) */
  description?: string;
  /** Canonical URL override */
  canonicalUrl?: string;
  /** OG image URL - defaults to canvas thumbnail */
  ogImage?: string;
  /** OG image alt text */
  ogImageAlt?: string;
  /** Twitter card type */
  twitterCard?: 'summary' | 'summary_large_image' | 'player';
  /** Twitter creator handle (without @) */
  twitterCreator?: string;
  /** Additional keywords for SEO */
  keywords?: string[];
  /** Whether to allow search engine indexing */
  allowIndexing?: boolean;
  /** JSON-LD structured data type */
  structuredDataType?: 'WebPage' | 'CreativeWork' | 'InteractiveResource';
}

/**
 * Default SEO metadata values
 */
export const DEFAULT_SEO_METADATA: CanvasSEOMetadata = {
  twitterCard: 'summary_large_image',
  allowIndexing: true,
  structuredDataType: 'CreativeWork',
};

// ============================================
// Publishing Types
// ============================================

/**
 * Publishing status of a canvas
 */
export type PublishStatus =
  | 'draft'       // Never published
  | 'published'   // Currently live
  | 'unpublished' // Was published, now hidden
  | 'scheduled';  // Scheduled for future publish (future feature)

/**
 * Full publish settings for a canvas
 * Extends CanvasShareSettings with additional publish-specific fields
 */
export interface CanvasPublishSettings {
  /** Publishing status */
  status: PublishStatus;
  /** Current visibility level */
  visibility: CanvasVisibility;
  /** URL slug for the published page */
  slug?: string;
  /** Password for protected access */
  password?: string;
  /** Whether embedding is allowed */
  allowEmbed?: boolean;
  /** SEO metadata */
  seo?: CanvasSEOMetadata;
  /** First published timestamp */
  publishedAt?: string;
  /** Last updated timestamp */
  lastPublishedAt?: string;
  /** Version snapshot ID at time of publish */
  publishedVersionId?: string;
  /** Expiration date for the published page */
  expiresAt?: string;
  /** Custom domain (future feature) */
  customDomain?: string;
}

/**
 * Default publish settings for new canvases
 */
export const DEFAULT_PUBLISH_SETTINGS: CanvasPublishSettings = {
  status: 'draft',
  visibility: 'private',
  allowEmbed: true,
  seo: DEFAULT_SEO_METADATA,
};

// ============================================
// Publish Action Types
// ============================================

/**
 * Request payload for publishing a canvas
 */
export interface PublishCanvasRequest {
  canvasId: string;
  visibility: CanvasVisibility;
  slug: string;
  password?: string;
  allowEmbed?: boolean;
  seo?: CanvasSEOMetadata;
  /** Whether to create a version snapshot */
  createSnapshot?: boolean;
}

/**
 * Response from publish endpoint
 */
export interface PublishCanvasResponse {
  success: boolean;
  data?: {
    slug: string;
    url: string;
    embedCode?: string;
    publishedAt: string;
    versionId?: string;
  };
  error?: string;
}

/**
 * Request payload for unpublishing a canvas
 */
export interface UnpublishCanvasRequest {
  canvasId: string;
  /** Whether to keep the slug reserved */
  keepSlugReserved?: boolean;
}

// ============================================
// Validation Types
// ============================================

/**
 * Validation result for pre-publish checks
 */
export interface PublishValidationResult {
  isValid: boolean;
  errors: PublishValidationError[];
  warnings: PublishValidationWarning[];
}

/**
 * Validation error that blocks publishing
 */
export interface PublishValidationError {
  code: string;
  message: string;
  field?: string;
  widgetId?: string;
}

/**
 * Validation warning that doesn't block publishing
 */
export interface PublishValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Common validation error codes
 */
export const PUBLISH_ERROR_CODES = {
  SLUG_REQUIRED: 'SLUG_REQUIRED',
  SLUG_INVALID: 'SLUG_INVALID',
  SLUG_TAKEN: 'SLUG_TAKEN',
  CANVAS_EMPTY: 'CANVAS_EMPTY',
  WIDGET_ERROR: 'WIDGET_ERROR',
  PIPELINE_ERROR: 'PIPELINE_ERROR',
  NAME_REQUIRED: 'NAME_REQUIRED',
  DESCRIPTION_TOO_LONG: 'DESCRIPTION_TOO_LONG',
} as const;

/**
 * Common validation warning codes
 */
export const PUBLISH_WARNING_CODES = {
  NO_DESCRIPTION: 'NO_DESCRIPTION',
  NO_THUMBNAIL: 'NO_THUMBNAIL',
  LARGE_CANVAS: 'LARGE_CANVAS',
  MANY_WIDGETS: 'MANY_WIDGETS',
  NO_SEO_TITLE: 'NO_SEO_TITLE',
  BROKEN_PIPELINE: 'BROKEN_PIPELINE',
} as const;

// ============================================
// Analytics Types
// ============================================

/**
 * Published page analytics data
 */
export interface PublishedPageAnalytics {
  /** Total page views */
  viewCount: number;
  /** Unique visitors (by session) */
  uniqueVisitors: number;
  /** Views by date (last 30 days) */
  viewsByDate?: Record<string, number>;
  /** Top referrers */
  topReferrers?: Array<{ source: string; count: number }>;
  /** Average time on page (seconds) */
  avgTimeOnPage?: number;
  /** Embed view count */
  embedViewCount?: number;
  /** Widget interaction count */
  interactionCount?: number;
}

// ============================================
// Slug Utilities
// ============================================

/**
 * Generate a random slug of specified length
 */
export function generateRandomSlug(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

/**
 * Validate slug format
 * Rules: lowercase, alphanumeric, hyphens, 3-50 chars
 */
export function validateSlugFormat(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' };
  }
  if (slug.length > 50) {
    return { valid: false, error: 'Slug must be 50 characters or less' };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' };
  }
  if (slug.includes('--')) {
    return { valid: false, error: 'Slug cannot contain consecutive hyphens' };
  }
  // Reserved slugs
  const reserved = ['api', 'admin', 'app', 'embed', 'login', 'signup', 'settings', 'profile'];
  if (reserved.includes(slug)) {
    return { valid: false, error: 'This slug is reserved' };
  }
  return { valid: true };
}

/**
 * Slugify a string (convert to valid slug format)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Remove consecutive hyphens
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
    .slice(0, 50);                 // Limit length
}

// ============================================
// URL Generation
// ============================================

/**
 * Generate the public URL for a published canvas
 */
export function generatePublicUrl(slug: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/c/${slug}`;
}

/**
 * Generate embed code for a published canvas
 */
export function generateEmbedCodeForSlug(
  slug: string,
  options: { width?: number; height?: number; baseUrl?: string } = {}
): string {
  const { width = 800, height = 600, baseUrl } = options;
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const embedUrl = `${base}/embed/${slug}`;
  return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`;
}
