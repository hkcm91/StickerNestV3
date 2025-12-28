/**
 * LoRA Training Job Processor
 * Handles async LoRA model training jobs
 */

import type { QueueJob, QueueAdapter } from '../../lib/queue/types.js';
import type { LoraTrainingJobData, LoraTrainingResult } from '../types.js';
import { BaseJobProcessor } from '../processor.js';
import { aiService } from '../../services/ai.service.js';
import { db } from '../../db/client.js';
import { idGenerators } from '../../utils/id.js';
import { log } from '../../utils/logger.js';
// Custom queue for LoRA training
const LORA_QUEUE = 'ai:lora';

export class LoraTrainingProcessor extends BaseJobProcessor<
  LoraTrainingJobData,
  LoraTrainingResult
> {
  constructor(queueAdapter: QueueAdapter, concurrency: number = 1) {
    // Low concurrency - LoRA training is expensive
    super(queueAdapter, LORA_QUEUE, concurrency);
  }

  protected async process(
    job: QueueJob<LoraTrainingJobData>
  ): Promise<LoraTrainingResult> {
    const { data } = job;

    await this.updateProgress(job, 5, 'Preparing LoRA training...');

    // Start LoRA training via AI service
    const result = await aiService.trainLora({
      name: data.name,
      instancePrompt: data.instancePrompt,
      classPrompt: data.classPrompt,
      imageUrls: data.imageUrls,
      trainingSteps: data.trainingSteps,
      learningRate: data.learningRate,
      provider: data.provider,
    });

    await this.updateProgress(job, 20, 'Training started, monitoring progress...');

    // Save LoRA training record
    try {
      const loraId = idGenerators.widgetInstance(); // Reuse widget ID generator

      await db.userModel.create({
        data: {
          id: loraId,
          userId: data.userId,
          name: data.name,
          type: 'lora',
          provider: data.provider,
          externalId: result.trainingId,
          status: result.status,
          config: {
            instancePrompt: data.instancePrompt,
            classPrompt: data.classPrompt,
            trainingSteps: data.trainingSteps,
            learningRate: data.learningRate,
            imageCount: data.imageUrls.length,
          },
          metadata: {
            jobId: job.id,
          },
        },
      });

      log.info(`Created LoRA training record ${loraId} with external ID ${result.trainingId}`);
    } catch (error) {
      log.error('Failed to save LoRA training record', error as Error);
    }

    // Note: LoRA training is async - the job completes when training starts
    // The actual training continues on the provider's infrastructure
    // A webhook or polling mechanism would be needed to track completion

    await this.updateProgress(job, 100, 'Training submitted successfully');

    return {
      type: 'lora',
      trainingId: result.trainingId,
      status: result.status,
      provider: result.provider,
    };
  }
}
