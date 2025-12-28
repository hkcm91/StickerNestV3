/**
 * Widget Generation Job Processor
 * Handles async widget generation jobs via AI providers
 */

import type { QueueJob, QueueAdapter } from '../../lib/queue/types.js';
import type { WidgetGenerationJobData, WidgetGenerationResult } from '../types.js';
import { BaseJobProcessor } from '../processor.js';
import { aiService } from '../../services/ai.service.js';
import { db } from '../../db/client.js';
import { idGenerators } from '../../utils/id.js';
import { log } from '../../utils/logger.js';
import { QUEUES } from '../../lib/queue/types.js';

export class WidgetGenerationProcessor extends BaseJobProcessor<
  WidgetGenerationJobData,
  WidgetGenerationResult
> {
  constructor(queueAdapter: QueueAdapter, concurrency: number = 2) {
    super(queueAdapter, QUEUES.AI_GENERATION, concurrency);
  }

  protected async process(
    job: QueueJob<WidgetGenerationJobData>
  ): Promise<WidgetGenerationResult> {
    const { data } = job;

    await this.updateProgress(job, 10, 'Preparing widget generation...');

    // Generate widget via AI service
    const result = await aiService.generateWidget({
      description: data.description,
      mode: data.mode,
      quality: data.quality,
      style: data.style,
      sourceWidgetId: data.sourceWidgetId,
      pipelineId: data.pipelineId,
      provider: data.provider,
    });

    await this.updateProgress(job, 70, 'Widget generated, saving to database...');

    // Save widget to database
    let widgetId: string;
    try {
      widgetId = idGenerators.widgetInstance();

      await db.widget.create({
        data: {
          id: widgetId,
          userId: data.userId,
          name: result.name,
          description: data.description,
          html: result.html,
          css: '',
          javascript: '',
          manifest: result.manifest as object,
          version: '1.0.0',
          isPublic: false,
          metadata: {
            aiGenerated: true,
            provider: result.provider,
            jobId: job.id,
            mode: data.mode,
            quality: data.quality,
            style: data.style,
          },
        },
      });

      log.info(`Created widget ${widgetId} from AI generation`);
    } catch (error) {
      log.error('Failed to save generated widget', error as Error);
      // Use the ID from the result if DB save fails
      widgetId = result.id;
    }

    await this.updateProgress(job, 100, 'Complete');

    return {
      type: 'widget',
      widgetId,
      name: result.name,
      manifest: result.manifest,
      html: result.html,
      explanation: result.explanation,
      provider: result.provider,
    };
  }
}
