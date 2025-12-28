import { z } from 'zod';

/**
 * Canvas visibility enum - matches frontend CanvasVisibility type
 */
export const canvasVisibilitySchema = z.enum(['private', 'unlisted', 'public']);

export type CanvasVisibility = z.infer<typeof canvasVisibilitySchema>;

/**
 * Gradient configuration schema
 */
const gradientStopSchema = z.object({
  color: z.string().max(50),
  position: z.number().min(0).max(100),
});

const gradientConfigSchema = z.object({
  type: z.enum(['linear', 'radial', 'conic']).optional(),
  angle: z.number().min(0).max(360).optional(),
  stops: z.array(gradientStopSchema).max(10).optional(),
}).optional();

/**
 * 3D scene configuration schema
 */
const scene3dConfigSchema = z.object({
  preset: z.enum(['particles', 'skybox', 'terrain', 'custom']).optional(),
  cameraPosition: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }).optional(),
  cameraTarget: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }).optional(),
  ambientLight: z.string().max(20).optional(),
  animation: z.object({
    autoRotate: z.boolean().optional(),
    rotateSpeed: z.number().min(0).max(1).optional(),
  }).optional(),
}).optional();

/**
 * Audio visualizer configuration schema
 */
const visualizerConfigSchema = z.object({
  type: z.enum(['bars', 'waveform', 'circular']).optional(),
  audioSource: z.enum(['microphone', 'element', 'url']).optional(),
  audioSourceId: z.string().max(100).optional(),
  sensitivity: z.number().min(0).max(10).optional(),
  smoothing: z.number().min(0).max(1).optional(),
  colors: z.array(z.string().max(20)).max(10).optional(),
}).optional();

/**
 * Background configuration - matches frontend CanvasBackground type
 */
export const backgroundConfigSchema = z.object({
  type: z.enum(['color', 'gradient', 'image', 'video', 'pattern', '3d', 'vector', 'visualizer', 'shader', 'widget']),
  color: z.string().max(50).optional(),
  gradient: gradientConfigSchema,
  imageUrl: z.string().url().max(2000).optional(),
  videoSrc: z.string().url().max(2000).optional(),
  vectorContent: z.string().max(100000).optional(), // Limit SVG content size
  shaderCode: z.string().max(50000).optional(), // Limit shader code size
  widgetId: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  position: z.string().max(50).optional(),
  repeat: z.string().max(50).optional(),
  opacity: z.number().min(0).max(1).optional(),
  blur: z.number().min(0).max(100).optional(),
  blendMode: z.string().max(50).optional(),
  interactive: z.boolean().optional(),
  scene3d: scene3dConfigSchema,
  visualizerConfig: visualizerConfigSchema,
}).optional();

/**
 * Canvas settings - matches frontend CanvasSettings type
 */
export const canvasSettingsSchema = z.object({
  scrollMode: z.enum(['fixed', 'scroll', 'pan', 'infinite']).optional(),
  interactionMode: z.enum(['view-only', 'interact', 'full']).optional(),
  zoom: z.object({
    enabled: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    wheelZoom: z.boolean().optional(),
    pinchZoom: z.boolean().optional(),
    wheelModifier: z.enum(['none', 'ctrl', 'shift', 'alt']).optional(),
  }).optional(),
  touch: z.object({
    panEnabled: z.boolean().optional(),
    singleFingerPan: z.boolean().optional(),
    longPressSelect: z.boolean().optional(),
    longPressDuration: z.number().optional(),
    swipeGestures: z.boolean().optional(),
  }).optional(),
  widgetDefaults: z.object({
    defaultWidth: z.number().optional(),
    defaultHeight: z.number().optional(),
    scaleMode: z.string().optional(),
    snapToGrid: z.boolean().optional(),
    stackOffset: z.number().optional(),
  }).optional(),
  showMinimap: z.boolean().optional(),
  showSizeIndicator: z.boolean().optional(),
  autoFitOnLoad: z.boolean().optional(),
  centerWhenSmaller: z.boolean().optional(),
  keyboardShortcuts: z.boolean().optional(),
}).optional();

/**
 * Create canvas schema
 */
export const createCanvasSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  visibility: canvasVisibilitySchema.default('private'),
  description: z.string().max(500).optional(),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
  backgroundConfig: backgroundConfigSchema,
  settings: canvasSettingsSchema,
});

export type CreateCanvasInput = z.infer<typeof createCanvasSchema>;

/**
 * Update canvas schema
 */
export const updateCanvasSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  visibility: canvasVisibilitySchema.optional(),
  description: z.string().max(500).optional(),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
  backgroundConfig: backgroundConfigSchema,
  settings: canvasSettingsSchema,
});

export type UpdateCanvasInput = z.infer<typeof updateCanvasSchema>;

/**
 * Canvas share settings schema
 */
export const shareCanvasSchema = z.object({
  visibility: canvasVisibilitySchema,
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  password: z.string().min(4).max(64).optional(),
  removePassword: z.boolean().optional(),
});

export type ShareCanvasInput = z.infer<typeof shareCanvasSchema>;

/**
 * Canvas fork schema
 */
export const forkCanvasSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type ForkCanvasInput = z.infer<typeof forkCanvasSchema>;

/**
 * Canvas version restore schema
 */
export const restoreVersionSchema = z.object({
  version: z.number().int().positive(),
});

export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>;

/**
 * Canvas query parameters
 */
export const canvasQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  visibility: canvasVisibilitySchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'viewCount']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CanvasQuery = z.infer<typeof canvasQuerySchema>;

/**
 * Canvas ID parameter
 */
export const canvasIdParamSchema = z.object({
  id: z.string().min(1, 'Canvas ID is required'),
});

/**
 * Canvas version parameter
 */
export const canvasVersionParamSchema = z.object({
  id: z.string().min(1),
  version: z.coerce.number().int().positive(),
});

/**
 * Canvas response schema
 * Note: backgroundConfig and settings use z.unknown() instead of z.any()
 * for type safety while allowing Prisma JSON output
 */
export const canvasResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  visibility: canvasVisibilitySchema,
  slug: z.string().nullable(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  viewCount: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  hasPassword: z.boolean(),
  backgroundConfig: z.unknown().nullable(),
  settings: z.unknown().nullable(),
  version: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CanvasResponse = z.infer<typeof canvasResponseSchema>;
