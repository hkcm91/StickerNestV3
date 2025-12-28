import { z } from 'zod';

/**
 * Asset type enum
 */
export const assetTypeSchema = z.enum(['image', 'lottie', 'widgetBundle', 'video', 'audio']);

export type AssetType = z.infer<typeof assetTypeSchema>;

/**
 * Request signed URL schema
 */
export const signedUrlRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
  assetType: assetTypeSchema,
  canvasId: z.string().optional(),
  size: z.number().int().positive().optional(),
});

export type SignedUrlRequest = z.infer<typeof signedUrlRequestSchema>;

/**
 * Signed URL response schema
 */
export const signedUrlResponseSchema = z.object({
  success: z.literal(true),
  uploadUrl: z.string().url(),
  assetId: z.string(),
  key: z.string(),
  expiresAt: z.string().datetime(),
});

export type SignedUrlResponse = z.infer<typeof signedUrlResponseSchema>;

/**
 * Complete upload schema
 */
export const completeUploadSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  key: z.string().min(1, 'Storage key is required'),
  name: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;

/**
 * Asset query schema
 */
export const assetQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  assetType: assetTypeSchema.optional(),
  canvasId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'size']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AssetQuery = z.infer<typeof assetQuerySchema>;

/**
 * Asset ID parameter
 */
export const assetIdParamSchema = z.object({
  id: z.string().min(1, 'Asset ID is required'),
});

/**
 * Asset response schema
 */
export const assetResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  canvasId: z.string().nullable(),
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  storagePath: z.string(),
  publicUrl: z.string().nullable(),
  assetType: z.string(),
  metadata: z.any().nullable(),
  createdAt: z.string().datetime(),
});

export type AssetResponse = z.infer<typeof assetResponseSchema>;
