/**
 * Image Generation Job Processor
 * Handles async image generation jobs via AI providers
 */

import type { QueueJob, QueueAdapter } from '../../lib/queue/types.js';
import type { ImageGenerationJobData, ImageGenerationResult } from '../types.js';
import { BaseJobProcessor } from '../processor.js';
import { aiService } from '../../services/ai.service.js';
import { db } from '../../db/client.js';
import { idGenerators } from '../../utils/id.js';
import { log } from '../../utils/logger.js';
import { QUEUES } from '../../lib/queue/types.js';

export class ImageGenerationProcessor extends BaseJobProcessor<
  ImageGenerationJobData,
  ImageGenerationResult
> {
  constructor(queueAdapter: QueueAdapter, concurrency: number = 2) {
    super(queueAdapter, QUEUES.AI_IMAGE, concurrency);
  }

  protected async process(
    job: QueueJob<ImageGenerationJobData>
  ): Promise<ImageGenerationResult> {
    const { data } = job;

    await this.updateProgress(job, 10, 'Preparing image generation...');

    // Generate image via AI service
    const result = await aiService.generateImage({
      prompt: data.prompt,
      negativePrompt: data.negativePrompt,
      model: data.model,
      width: data.width,
      height: data.height,
      numOutputs: data.numOutputs,
      guidanceScale: data.guidanceScale ?? 7.5,
      numInferenceSteps: data.numInferenceSteps ?? 50,
      seed: data.seed,
      provider: data.provider,
    });

    await this.updateProgress(job, 70, 'Images generated, saving assets...');

    // Save generated images as assets
    const imagesWithAssets = await Promise.all(
      result.images.map(async (image) => {
        try {
          const assetId = idGenerators.asset();

          // Create asset record for the generated image
          await db.asset.create({
            data: {
              id: assetId,
              userId: data.userId,
              canvasId: data.canvasId,
              name: `AI Generated - ${data.prompt.slice(0, 50)}`,
              mimeType: 'image/png',
              size: 0, // Will be updated when image is downloaded
              storagePath: image.url, // Temporary URL from provider
              publicUrl: image.url,
              assetType: 'ai_generated',
              metadata: {
                prompt: data.prompt,
                model: result.model,
                provider: result.provider,
                jobId: job.id,
                width: image.width,
                height: image.height,
              },
            },
          });

          log.info(`Created asset ${assetId} for generated image`);

          return {
            ...image,
            assetId,
          };
        } catch (error) {
          log.error('Failed to save generated image as asset', error as Error);
          return image;
        }
      })
    );

    await this.updateProgress(job, 100, 'Complete');

    return {
      type: 'image',
      images: imagesWithAssets,
      model: result.model,
      provider: result.provider,
    };
  }
}
