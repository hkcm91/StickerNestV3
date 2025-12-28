import { z } from 'zod';
import { validateExternalUrl } from '../utils/security.js';

/**
 * AI provider enum
 */
export const aiProviderSchema = z.enum(['anthropic', 'openai', 'replicate']);

export type AIProvider = z.infer<typeof aiProviderSchema>;

/**
 * SECURITY: Safe external URL schema with SSRF protection
 * Validates URL format and blocks internal IPs, localhost, and cloud metadata endpoints
 */
const safeExternalUrlSchema = z.string().url().refine(
  (url) => {
    const result = validateExternalUrl(url);
    return result.isValid;
  },
  (url) => {
    const result = validateExternalUrl(url);
    return { message: result.error || 'Invalid URL' };
  }
);

/**
 * Text generation schema - matches frontend API pattern
 */
export const generateTextSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().min(1, 'Prompt is required'),
  system: z.string().optional(),
  maxTokens: z.number().int().positive().max(100000).default(4000),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).optional(),
  stopSequences: z.array(z.string()).optional(),
  provider: aiProviderSchema.default('anthropic'),
});

export type GenerateTextInput = z.infer<typeof generateTextSchema>;

/**
 * Image generation schema
 */
export const generateImageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  negativePrompt: z.string().optional(),
  model: z.string().optional(),
  width: z.number().int().positive().max(2048).default(1024),
  height: z.number().int().positive().max(2048).default(1024),
  numOutputs: z.number().int().positive().max(4).default(1),
  guidanceScale: z.number().min(0).max(50).default(7.5),
  numInferenceSteps: z.number().int().positive().max(100).default(50),
  seed: z.number().int().optional(),
  provider: aiProviderSchema.default('replicate'),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

/**
 * Video generation schema
 * SECURITY: Uses SSRF-protected URL validation for imageUrl
 */
export const generateVideoSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  imageUrl: safeExternalUrlSchema.optional(),
  model: z.string().optional(),
  duration: z.number().positive().max(30).default(4),
  fps: z.number().int().positive().max(60).default(24),
  seed: z.number().int().optional(),
  provider: aiProviderSchema.default('replicate'),
});

export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;

/**
 * LoRA training schema
 * SECURITY: Uses SSRF-protected URL validation for imageUrls
 */
export const loraTrainSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  instancePrompt: z.string().min(1, 'Instance prompt is required'),
  classPrompt: z.string().optional(),
  imageUrls: z.array(safeExternalUrlSchema).min(5, 'At least 5 images required'),
  trainingSteps: z.number().int().positive().max(10000).default(1000),
  learningRate: z.number().positive().default(1e-4),
  provider: aiProviderSchema.default('replicate'),
});

export type LoraTrainInput = z.infer<typeof loraTrainSchema>;

/**
 * Pipeline execution schema
 */
export const executePipelineSchema = z.object({
  pipelineId: z.string().min(1, 'Pipeline ID is required'),
  inputs: z.record(z.any()).default({}),
});

export type ExecutePipelineInput = z.infer<typeof executePipelineSchema>;

/**
 * Widget generation schema - matches frontend widget-generator.ts
 */
export const generateWidgetSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  mode: z.enum(['new', 'variation', 'layer']).default('new'),
  quality: z.enum(['basic', 'standard', 'advanced', 'professional']).default('standard'),
  style: z.enum(['minimal', 'polished', 'elaborate', 'glass', 'neon', 'retro']).default('polished'),
  sourceWidgetId: z.string().optional(),
  pipelineId: z.string().optional(),
  provider: aiProviderSchema.default('anthropic'),
});

export type GenerateWidgetInput = z.infer<typeof generateWidgetSchema>;

/**
 * AI response schemas
 */
export const textGenerationResponseSchema = z.object({
  success: z.literal(true),
  content: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }).optional(),
  model: z.string(),
  provider: aiProviderSchema,
});

export type TextGenerationResponse = z.infer<typeof textGenerationResponseSchema>;

export const imageGenerationResponseSchema = z.object({
  success: z.literal(true),
  images: z.array(z.object({
    url: z.string().url(),
    width: z.number(),
    height: z.number(),
  })),
  model: z.string(),
  provider: aiProviderSchema,
});

export type ImageGenerationResponse = z.infer<typeof imageGenerationResponseSchema>;

export const widgetGenerationResponseSchema = z.object({
  success: z.literal(true),
  widget: z.object({
    id: z.string(),
    name: z.string(),
    manifest: z.any(),
    html: z.string(),
    explanation: z.string().optional(),
  }),
});

export type WidgetGenerationResponse = z.infer<typeof widgetGenerationResponseSchema>;
