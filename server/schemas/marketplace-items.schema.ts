import { z } from 'zod';

/**
 * Marketplace item types enum
 */
export const marketplaceItemTypeSchema = z.enum([
  'canvas_widget',
  'system_widget',
  'sticker_pack',
  'pipeline',
  'theme',
  'template',
]);

export type MarketplaceItemType = z.infer<typeof marketplaceItemTypeSchema>;

/**
 * Sticker format enum
 */
export const stickerFormatSchema = z.enum([
  'png',
  'jpeg',
  'webp',
  'gif',
  'apng',
  'svg',
  'lottie',
]);

export type StickerFormat = z.infer<typeof stickerFormatSchema>;

/**
 * Create marketplace item schema
 */
export const createMarketplaceItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(200).optional(),
  itemType: marketplaceItemTypeSchema,
  category: z.string().default('general'),
  tags: z.array(z.string().max(50)).max(20).default([]),
  isFree: z.boolean().default(true),
  oneTimePrice: z.number().int().min(0).optional(),
  monthlyPrice: z.number().int().min(0).optional(),
  yearlyPrice: z.number().int().min(0).optional(),
  license: z.enum(['standard', 'extended', 'exclusive']).default('standard'),
  metadata: z.record(z.unknown()).optional(),
  thumbnailUrl: z.string().url().optional(),
  previewUrls: z.array(z.string().url()).max(10).default([]),
  previewVideo: z.string().url().optional(),
});

export type CreateMarketplaceItemInput = z.infer<typeof createMarketplaceItemSchema>;

/**
 * Update marketplace item schema
 */
export const updateMarketplaceItemSchema = createMarketplaceItemSchema.partial().omit({ itemType: true });

export type UpdateMarketplaceItemInput = z.infer<typeof updateMarketplaceItemSchema>;

/**
 * Marketplace item list query schema
 */
export const marketplaceItemListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  itemType: z.union([
    marketplaceItemTypeSchema,
    z.array(marketplaceItemTypeSchema),
    z.string().transform((s) => s.split(',').filter(Boolean) as MarketplaceItemType[]),
  ]).optional(),
  category: z.string().optional(),
  tags: z.union([
    z.array(z.string()),
    z.string().transform((s) => s.split(',').filter(Boolean)),
  ]).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  freeOnly: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  official: z.coerce.boolean().optional(),
  sortBy: z.enum(['popular', 'recent', 'rating', 'price', 'downloads']).default('popular'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type MarketplaceItemListQuery = z.infer<typeof marketplaceItemListQuerySchema>;

/**
 * Publish version schema
 */
export const publishVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/, 'Invalid semantic version'),
  content: z.record(z.unknown()),
  changelog: z.string().max(5000).optional(),
  bundlePath: z.string().optional(),
  minAppVersion: z.string().optional(),
});

export type PublishVersionInput = z.infer<typeof publishVersionSchema>;

/**
 * Rate item schema
 */
export const rateItemSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export type RateItemInput = z.infer<typeof rateItemSchema>;

/**
 * Comment schema
 */
export const commentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(2000),
  parentId: z.string().optional(),
});

export type CommentInput = z.infer<typeof commentSchema>;

/**
 * Sticker upload schema
 */
export const stickerUploadSchema = z.object({
  name: z.string().min(1).max(100),
  format: stickerFormatSchema,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  isAnimated: z.boolean().default(false),
  duration: z.number().positive().optional(),
  frameCount: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type StickerUploadInput = z.infer<typeof stickerUploadSchema>;

/**
 * Item ID parameter schema
 */
export const itemIdParamSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
});

/**
 * Item slug parameter schema
 */
export const itemSlugParamSchema = z.object({
  slug: z.string().min(1, 'Item slug is required'),
});

/**
 * Purchase schema
 */
export const purchaseSchema = z.object({
  priceType: z.enum(['one_time', 'monthly', 'yearly']).default('one_time'),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;

/**
 * Marketplace item response type
 */
export interface MarketplaceItemResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  itemType: MarketplaceItemType;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  ratingCount: number;
  viewCount: number;
  isPublished: boolean;
  isOfficial: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  thumbnailUrl: string | null;
  previewUrls: string[];
  previewVideo: string | null;
  isFree: boolean;
  oneTimePrice: number | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  license: string;
  metadata: unknown;
  author: {
    id: string;
    username: string;
  };
  latestVersion?: {
    version: string;
    content: unknown;
    changelog: string | null;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Sticker response type
 */
export interface StickerResponse {
  id: string;
  packId: string;
  name: string;
  filename: string;
  format: StickerFormat;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  isAnimated: boolean;
  duration: number | null;
  frameCount: number | null;
  fileSize: number;
  metadata: unknown;
  sortOrder: number;
  createdAt: string;
}
