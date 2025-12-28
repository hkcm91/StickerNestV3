import { z } from 'zod';

/**
 * Widget kind - matches frontend WidgetManifest type
 */
export const widgetKindSchema = z.enum(['2d', '3d', 'audio', 'video', 'hybrid']);

/**
 * Widget input/output schema
 */
export const widgetPortSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.any().optional(),
});

/**
 * Widget capabilities schema
 */
export const widgetCapabilitiesSchema = z.object({
  draggable: z.boolean().default(true),
  resizable: z.boolean().default(true),
  rotatable: z.boolean().optional(),
  supports3d: z.boolean().optional(),
  supportsAudio: z.boolean().optional(),
});

/**
 * Widget size config schema
 */
export const widgetSizeConfigSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  minWidth: z.number().optional(),
  minHeight: z.number().optional(),
  maxWidth: z.number().optional(),
  maxHeight: z.number().optional(),
  aspectRatio: z.number().optional(),
  lockAspectRatio: z.boolean().optional(),
  scaleMode: z.string().optional(),
}).optional();

/**
 * Widget manifest schema - matches frontend WidgetManifest type exactly
 */
export const widgetManifestSchema = z.object({
  id: z.string()
    .min(2, 'ID must be at least 2 characters')
    .max(64, 'ID must be at most 64 characters')
    .regex(/^[a-z][a-z0-9-]*$/, 'ID must start with lowercase letter and contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(1, 'Name is required').max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/, 'Invalid semantic version'),
  kind: widgetKindSchema,
  entry: z.string().min(1, 'Entry point is required'),
  inputs: z.record(widgetPortSchema).default({}),
  outputs: z.record(widgetPortSchema).default({}),
  capabilities: widgetCapabilitiesSchema,
  io: z.object({
    inputs: z.array(z.string()).optional(),
    outputs: z.array(z.string()).optional(),
    customInputs: z.array(z.any()).optional(),
    customOutputs: z.array(z.any()).optional(),
  }).optional(),
  assets: z.array(z.string()).optional(),
  sandbox: z.object({
    allowScripts: z.boolean().optional(),
    allowForms: z.boolean().optional(),
    allowPopups: z.boolean().optional(),
    allowModals: z.boolean().optional(),
    allowStorage: z.boolean().optional(),
  }).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  skin: z.any().optional(),
  events: z.object({
    emits: z.array(z.string()).optional(),
    listens: z.array(z.string()).optional(),
  }).optional(),
  size: widgetSizeConfigSchema,
});

export type WidgetManifest = z.infer<typeof widgetManifestSchema>;

/**
 * Publish widget schema
 */
export const publishWidgetSchema = z.object({
  manifest: widgetManifestSchema,
  html: z.string().min(1, 'HTML content is required'),
  changelog: z.string().optional(),
  category: z.string().default('utility'),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
});

export type PublishWidgetInput = z.infer<typeof publishWidgetSchema>;

/**
 * Create widget listing schema - simplified form for creators
 * Used in Settings page to list a widget for sale
 */
export const createWidgetListingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.string().default('utility'),
  tags: z.array(z.string()).default([]),
  isFree: z.boolean().default(true),
  oneTimePrice: z.number().int().min(0).default(0),
  thumbnailUrl: z.string().url().optional(),
});

export type CreateWidgetListingInput = z.infer<typeof createWidgetListingSchema>;

/**
 * Widget list query schema
 */
export const widgetListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  sortBy: z.enum(['downloads', 'rating', 'createdAt', 'updatedAt', 'name']).default('downloads'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  official: z.coerce.boolean().optional(),
});

export type WidgetListQuery = z.infer<typeof widgetListQuerySchema>;

/**
 * Widget rating schema
 */
export const rateWidgetSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export type RateWidgetInput = z.infer<typeof rateWidgetSchema>;

/**
 * Widget comment schema
 */
export const commentWidgetSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(1000),
  parentId: z.string().optional(),
});

export type CommentWidgetInput = z.infer<typeof commentWidgetSchema>;

/**
 * Widget package ID parameter
 */
export const widgetPackageIdParamSchema = z.object({
  id: z.string().min(1, 'Widget package ID is required'),
});

/**
 * Widget package response schema
 */
export const widgetPackageResponseSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  tags: z.array(z.string()),
  downloads: z.number(),
  rating: z.number(),
  ratingCount: z.number(),
  isPublished: z.boolean(),
  isOfficial: z.boolean(),
  thumbnailUrl: z.string().nullable(),
  previewUrl: z.string().nullable(),
  isFree: z.boolean(),
  oneTimePrice: z.number().nullable(),
  author: z.object({
    id: z.string(),
    username: z.string(),
  }),
  latestVersion: z.object({
    version: z.string(),
    manifest: z.any(),
    changelog: z.string().nullable(),
    createdAt: z.string().datetime(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WidgetPackageResponse = z.infer<typeof widgetPackageResponseSchema>;
