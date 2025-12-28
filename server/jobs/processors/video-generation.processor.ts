/**
 * Video Generation Job Processor
 * Handles async video generation jobs via AI providers
 */

import type { QueueJob, QueueAdapter } from '../../lib/queue/types.js';
import type { VideoGenerationJobData, VideoGenerationResult } from '../types.js';
import { BaseJobProcessor } from '../processor.js';
import { aiService } from '../../services/ai.service.js';
import { db } from '../../db/client.js';
import { idGenerators } from '../../utils/id.js';
import { log } from '../../utils/logger.js';
import { QUEUES } from '../../lib/queue/types.js';

export class VideoGenerationProcessor extends BaseJobProcessor<
  VideoGenerationJobData,
  VideoGenerationResult
> {
  constructor(queueAdapter: QueueAdapter, concurrency: number = 1) {
    // Lower concurrency for video as it's more resource intensive
    super(queueAdapter, QUEUES.AI_VIDEO, concurrency);
  }

  protected async process(
    job: QueueJob<VideoGenerationJobData>
  ): Promise<VideoGenerationResult> {
    const { data } = job;

    await this.updateProgress(job, 10, 'Preparing video generation...');

    // Generate video via AI service
    const result = await aiService.generateVideo({
      prompt: data.prompt,
      imageUrl: data.imageUrl,
      model: data.model,
      duration: data.duration,
      fps: data.fps,
      seed: data.seed,
      provider: data.provider,
    });

    await this.updateProgress(job, 80, 'Video generated, saving asset...');

    // Save generated video as asset
    let assetId: string | undefined;
    try {
      assetId = idGenerators.asset();

      await db.asset.create({
        data: {
          id: assetId,
          userId: data.userId,
          canvasId: data.canvasId,
          name: `AI Video - ${data.prompt.slice(0, 50)}`,
          mimeType: 'video/mp4',
          size: 0, // Will be updated when video is downloaded
          storagePath: result.videoUrl,
          publicUrl: result.videoUrl,
          assetType: 'ai_video',
          metadata: {
            prompt: data.prompt,
            model: result.model,
            provider: result.provider,
            jobId: job.id,
            duration: data.duration,
            fps: data.fps,
          },
        },
      });

      log.info(`Created asset ${assetId} for generated video`);
    } catch (error) {
      log.error('Failed to save generated video as asset', error as Error);
    }

    await this.updateProgress(job, 100, 'Complete');

    return {
      type: 'video',
      videoUrl: result.videoUrl,
      assetId,
      model: result.model,
      provider: result.provider,
    };
  }
}
