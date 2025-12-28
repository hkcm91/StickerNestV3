/**
 * Job Types and Interfaces
 * Defines the structure of async jobs for AI generation tasks
 */

import type { AIProvider } from '../schemas/ai.schema.js';

/**
 * Base job data interface
 */
export interface BaseJobData {
  userId: string;
  canvasId?: string;
  correlationId?: string;
  priority?: number;
}

/**
 * Image generation job data
 */
export interface ImageGenerationJobData extends BaseJobData {
  type: 'image';
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width: number;
  height: number;
  numOutputs: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  seed?: number;
  provider: AIProvider;
}

/**
 * Video generation job data
 */
export interface VideoGenerationJobData extends BaseJobData {
  type: 'video';
  prompt: string;
  imageUrl?: string;
  model?: string;
  duration: number;
  fps: number;
  seed?: number;
  provider: AIProvider;
}

/**
 * Widget generation job data
 */
export interface WidgetGenerationJobData extends BaseJobData {
  type: 'widget';
  description: string;
  mode: 'new' | 'variation' | 'layer';
  quality: 'basic' | 'standard' | 'advanced' | 'professional';
  style: 'minimal' | 'polished' | 'elaborate' | 'glass' | 'neon' | 'retro';
  sourceWidgetId?: string;
  pipelineId?: string;
  provider: AIProvider;
}

/**
 * LoRA training job data
 */
export interface LoraTrainingJobData extends BaseJobData {
  type: 'lora';
  name: string;
  instancePrompt: string;
  classPrompt?: string;
  imageUrls: string[];
  trainingSteps: number;
  learningRate: number;
  provider: AIProvider;
}

/**
 * Union type for all job data types
 */
export type AIJobData =
  | ImageGenerationJobData
  | VideoGenerationJobData
  | WidgetGenerationJobData
  | LoraTrainingJobData;

/**
 * Job result interfaces
 */
export interface ImageGenerationResult {
  type: 'image';
  images: Array<{
    url: string;
    assetId?: string;
    width: number;
    height: number;
  }>;
  model: string;
  provider: AIProvider;
}

export interface VideoGenerationResult {
  type: 'video';
  videoUrl: string;
  assetId?: string;
  model: string;
  provider: AIProvider;
}

export interface WidgetGenerationResult {
  type: 'widget';
  widgetId: string;
  name: string;
  manifest: unknown;
  html: string;
  explanation?: string;
  provider: AIProvider;
}

export interface LoraTrainingResult {
  type: 'lora';
  trainingId: string;
  status: string;
  provider: AIProvider;
}

export type AIJobResult =
  | ImageGenerationResult
  | VideoGenerationResult
  | WidgetGenerationResult
  | LoraTrainingResult;

/**
 * Job status update event
 */
export interface JobStatusUpdate {
  jobId: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: AIJobResult;
  error?: string;
}

/**
 * Job submission response
 */
export interface JobSubmissionResponse {
  jobId: string;
  queue: string;
  status: 'pending';
  estimatedWait?: number;
}
