import { z } from 'zod';

/**
 * Widget size preset - matches frontend WidgetInstance type
 */
export const sizePresetSchema = z.enum(['xs', 'sm', 'md', 'lg', 'xl', 'banner', 'full']);

/**
 * Widget position schema
 */
export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * Content size schema
 */
export const contentSizeSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
}).optional();

/**
 * Widget metadata schema
 */
export const widgetMetadataSchema = z.object({
  source: z.enum(['official', 'user', 'generated', 'local']).optional(),
  generatedContent: z.string().optional(),
}).optional();

/**
 * Create widget instance schema - matches frontend WidgetInstance type
 */
export const createWidgetSchema = z.object({
  widgetDefId: z.string().min(1, 'Widget definition ID is required'),
  version: z.string().default('1.0.0'),
  position: positionSchema.default({ x: 0, y: 0 }),
  sizePreset: sizePresetSchema.default('md'),
  width: z.number().positive().default(200),
  height: z.number().positive().default(200),
  rotation: z.number().default(0),
  zIndex: z.number().int().default(0),
  state: z.record(z.any()).default({}),
  metadata: widgetMetadataSchema,
  parentId: z.string().optional(),
  isContainer: z.boolean().default(false),
  childIds: z.array(z.string()).default([]),
  name: z.string().optional(),
  groupId: z.string().optional(),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  opacity: z.number().min(0).max(1).default(1),
  scaleMode: z.string().default('fit'),
  contentSize: contentSizeSchema,
});

export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;

/**
 * Update widget instance schema
 */
export const updateWidgetSchema = z.object({
  widgetDefId: z.string().optional(),
  version: z.string().optional(),
  position: positionSchema.optional(),
  sizePreset: sizePresetSchema.optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  rotation: z.number().optional(),
  zIndex: z.number().int().optional(),
  state: z.record(z.any()).optional(),
  metadata: widgetMetadataSchema,
  parentId: z.string().nullable().optional(),
  isContainer: z.boolean().optional(),
  childIds: z.array(z.string()).optional(),
  name: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
  scaleMode: z.string().optional(),
  contentSize: contentSizeSchema,
});

export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;

/**
 * Update widget state only schema
 */
export const updateWidgetStateSchema = z.object({
  state: z.record(z.any()),
});

export type UpdateWidgetStateInput = z.infer<typeof updateWidgetStateSchema>;

/**
 * Batch update widgets schema
 */
export const batchUpdateWidgetsSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    data: updateWidgetSchema,
  })),
});

export type BatchUpdateWidgetsInput = z.infer<typeof batchUpdateWidgetsSchema>;

/**
 * Widget ID parameters
 */
export const widgetIdParamsSchema = z.object({
  id: z.string().min(1, 'Canvas ID is required'),
  wid: z.string().min(1, 'Widget ID is required'),
});

/**
 * Widget response schema - matches frontend WidgetInstance type
 */
export const widgetResponseSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  widgetDefId: z.string(),
  version: z.string(),
  position: positionSchema,
  sizePreset: sizePresetSchema,
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  zIndex: z.number(),
  state: z.record(z.any()),
  metadata: z.any().nullable(),
  parentId: z.string().nullable(),
  isContainer: z.boolean(),
  childIds: z.array(z.string()),
  name: z.string().nullable(),
  groupId: z.string().nullable(),
  locked: z.boolean(),
  visible: z.boolean(),
  opacity: z.number(),
  scaleMode: z.string(),
  contentSize: z.any().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WidgetResponse = z.infer<typeof widgetResponseSchema>;
