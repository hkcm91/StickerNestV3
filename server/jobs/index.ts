/**
 * Jobs Module
 * Entry point for job processing system
 */

import type { QueueAdapter } from '../lib/queue/types.js';
import { registerProcessor, startAllProcessors } from './processor.js';
import { ImageGenerationProcessor } from './processors/image-generation.processor.js';
import { VideoGenerationProcessor } from './processors/video-generation.processor.js';
import { WidgetGenerationProcessor } from './processors/widget-generation.processor.js';
import { LoraTrainingProcessor } from './processors/lora-training.processor.js';
import { log } from '../utils/logger.js';

export * from './types.js';
export * from './processor.js';
export { ImageGenerationProcessor } from './processors/image-generation.processor.js';
export { VideoGenerationProcessor } from './processors/video-generation.processor.js';
export { WidgetGenerationProcessor } from './processors/widget-generation.processor.js';
export { LoraTrainingProcessor } from './processors/lora-training.processor.js';

/**
 * Initialize all job processors
 */
export function initializeJobProcessors(
  queueAdapter: QueueAdapter,
  options: {
    imageConcurrency?: number;
    videoConcurrency?: number;
    widgetConcurrency?: number;
    loraConcurrency?: number;
  } = {}
): void {
  const {
    imageConcurrency = 2,
    videoConcurrency = 1,
    widgetConcurrency = 2,
    loraConcurrency = 1,
  } = options;

  log.info('Initializing job processors...');

  // Create and register processors
  const imageProcessor = new ImageGenerationProcessor(queueAdapter, imageConcurrency);
  const videoProcessor = new VideoGenerationProcessor(queueAdapter, videoConcurrency);
  const widgetProcessor = new WidgetGenerationProcessor(queueAdapter, widgetConcurrency);
  const loraProcessor = new LoraTrainingProcessor(queueAdapter, loraConcurrency);

  registerProcessor('image', imageProcessor as Parameters<typeof registerProcessor>[1]);
  registerProcessor('video', videoProcessor as Parameters<typeof registerProcessor>[1]);
  registerProcessor('widget', widgetProcessor as Parameters<typeof registerProcessor>[1]);
  registerProcessor('lora', loraProcessor as Parameters<typeof registerProcessor>[1]);

  // Start all processors
  startAllProcessors();

  log.info('Job processors initialized', {
    imageConcurrency,
    videoConcurrency,
    widgetConcurrency,
    loraConcurrency,
  });
}
