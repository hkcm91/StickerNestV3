/**
 * Job Controller
 * Handles job submission and status checking
 */

import type { Request, Response, NextFunction } from 'express';
import { getQueueAdapter, QUEUES } from '../lib/queue/index.js';
import type {
  ImageGenerationJobData,
  VideoGenerationJobData,
  WidgetGenerationJobData,
  LoraTrainingJobData,
  JobSubmissionResponse,
} from '../jobs/types.js';
import { generateImageSchema, generateVideoSchema, generateWidgetSchema, loraTrainSchema } from '../schemas/ai.schema.js';
import { ValidationError, NotFoundError } from '../utils/AppErrors.js';
import { log } from '../utils/logger.js';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

/**
 * Submit image generation job
 */
export async function submitImageJob(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const parseResult = generateImageSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid request body', parseResult.error.flatten());
    }

    const input = parseResult.data;
    const canvasId = req.body.canvasId;
    const correlationId = req.body.correlationId;

    const jobData: ImageGenerationJobData = {
      type: 'image',
      userId,
      canvasId,
      correlationId,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      model: input.model,
      width: input.width,
      height: input.height,
      numOutputs: input.numOutputs,
      guidanceScale: input.guidanceScale,
      numInferenceSteps: input.numInferenceSteps,
      seed: input.seed,
      provider: input.provider,
    };

    const queue = await getQueueAdapter();
    const job = await queue.add(QUEUES.AI_IMAGE, jobData, {
      priority: req.body.priority || 5,
      maxAttempts: 3,
    });

    log.info('Image generation job submitted', { jobId: job.id, userId });

    const response: JobSubmissionResponse = {
      jobId: job.id,
      queue: QUEUES.AI_IMAGE,
      status: 'pending',
    };

    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Submit video generation job
 */
export async function submitVideoJob(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const parseResult = generateVideoSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid request body', parseResult.error.flatten());
    }

    const input = parseResult.data;
    const canvasId = req.body.canvasId;
    const correlationId = req.body.correlationId;

    const jobData: VideoGenerationJobData = {
      type: 'video',
      userId,
      canvasId,
      correlationId,
      prompt: input.prompt,
      imageUrl: input.imageUrl,
      model: input.model,
      duration: input.duration,
      fps: input.fps,
      seed: input.seed,
      provider: input.provider,
    };

    const queue = await getQueueAdapter();
    const job = await queue.add(QUEUES.AI_VIDEO, jobData, {
      priority: req.body.priority || 5,
      maxAttempts: 2,
    });

    log.info('Video generation job submitted', { jobId: job.id, userId });

    const response: JobSubmissionResponse = {
      jobId: job.id,
      queue: QUEUES.AI_VIDEO,
      status: 'pending',
    };

    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Submit widget generation job
 */
export async function submitWidgetJob(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const parseResult = generateWidgetSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid request body', parseResult.error.flatten());
    }

    const input = parseResult.data;
    const canvasId = req.body.canvasId;
    const correlationId = req.body.correlationId;

    const jobData: WidgetGenerationJobData = {
      type: 'widget',
      userId,
      canvasId,
      correlationId,
      description: input.description,
      mode: input.mode,
      quality: input.quality,
      style: input.style,
      sourceWidgetId: input.sourceWidgetId,
      pipelineId: input.pipelineId,
      provider: input.provider,
    };

    const queue = await getQueueAdapter();
    const job = await queue.add(QUEUES.AI_GENERATION, jobData, {
      priority: req.body.priority || 5,
      maxAttempts: 3,
    });

    log.info('Widget generation job submitted', { jobId: job.id, userId });

    const response: JobSubmissionResponse = {
      jobId: job.id,
      queue: QUEUES.AI_GENERATION,
      status: 'pending',
    };

    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Submit LoRA training job
 */
export async function submitLoraJob(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const parseResult = loraTrainSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid request body', parseResult.error.flatten());
    }

    const input = parseResult.data;
    const correlationId = req.body.correlationId;

    const jobData: LoraTrainingJobData = {
      type: 'lora',
      userId,
      correlationId,
      name: input.name,
      instancePrompt: input.instancePrompt,
      classPrompt: input.classPrompt,
      imageUrls: input.imageUrls,
      trainingSteps: input.trainingSteps,
      learningRate: input.learningRate,
      provider: input.provider,
    };

    const queue = await getQueueAdapter();
    const job = await queue.add('ai:lora', jobData, {
      priority: req.body.priority || 3, // Lower priority for expensive training
      maxAttempts: 1, // Training shouldn't retry automatically
    });

    log.info('LoRA training job submitted', { jobId: job.id, userId });

    const response: JobSubmissionResponse = {
      jobId: job.id,
      queue: 'ai:lora',
      status: 'pending',
    };

    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Get job status
 */
export async function getJobStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const { jobId } = req.params;
    const { queue: queueName } = req.query;

    if (!queueName || typeof queueName !== 'string') {
      throw new ValidationError('Queue name is required');
    }

    const queue = await getQueueAdapter();
    const job = await queue.getJob(queueName, jobId);

    if (!job) {
      throw new NotFoundError('Job', jobId);
    }

    // Verify the job belongs to the requesting user
    const jobData = job.data as { userId?: string };
    if (jobData.userId !== userId) {
      throw new NotFoundError('Job', jobId); // Return 404 to not leak existence
    }

    // Determine status
    let status: string;
    if (job.completedAt) {
      status = 'completed';
    } else if (job.failedAt) {
      status = 'failed';
    } else if (job.startedAt) {
      status = 'active';
    } else if (job.scheduledAt && job.scheduledAt > Date.now()) {
      status = 'delayed';
    } else {
      status = 'pending';
    }

    res.json({
      jobId: job.id,
      queue: job.queue,
      status,
      data: job.data,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      createdAt: new Date(job.createdAt).toISOString(),
      startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : null,
      completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : null,
      failedAt: job.failedAt ? new Date(job.failedAt).toISOString() : null,
      error: job.error,
      result: job.result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's jobs
 */
export async function getUserJobs(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const { queue: queueName, status } = req.query;
    const limit = parseInt(req.query.limit as string) || 20;

    const queue = await getQueueAdapter();
    const queues = queueName
      ? [queueName as string]
      : [QUEUES.AI_IMAGE, QUEUES.AI_VIDEO, QUEUES.AI_GENERATION, 'ai:lora'];

    const allJobs = [];

    for (const q of queues) {
      const jobStatus = (status as 'pending' | 'active' | 'completed' | 'failed') || 'pending';
      const jobs = await queue.getJobs(q, jobStatus, limit);

      // Filter jobs belonging to the user
      const userJobs = jobs.filter((job) => {
        const data = job.data as { userId?: string };
        return data.userId === userId;
      });

      allJobs.push(...userJobs.map((job) => ({
        jobId: job.id,
        queue: job.queue,
        type: (job.data as { type?: string }).type,
        status: job.completedAt ? 'completed' : job.failedAt ? 'failed' : job.startedAt ? 'active' : 'pending',
        createdAt: new Date(job.createdAt).toISOString(),
      })));
    }

    // Sort by creation time, newest first
    allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      jobs: allJobs.slice(0, limit),
      total: allJobs.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel a job
 */
export async function cancelJob(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const { jobId } = req.params;
    const { queue: queueName } = req.query;

    if (!queueName || typeof queueName !== 'string') {
      throw new ValidationError('Queue name is required');
    }

    const queue = await getQueueAdapter();
    const job = await queue.getJob(queueName, jobId);

    if (!job) {
      throw new NotFoundError('Job', jobId);
    }

    // Verify ownership
    const jobData = job.data as { userId?: string };
    if (jobData.userId !== userId) {
      throw new NotFoundError('Job', jobId);
    }

    // Can only cancel pending jobs
    if (job.startedAt) {
      throw new ValidationError('Cannot cancel job that has already started');
    }

    const removed = await queue.removeJob(queueName, jobId);

    if (!removed) {
      throw new ValidationError('Failed to cancel job');
    }

    log.info('Job cancelled', { jobId, userId });

    res.json({
      success: true,
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const queue = await getQueueAdapter();
    const queues = [QUEUES.AI_IMAGE, QUEUES.AI_VIDEO, QUEUES.AI_GENERATION, 'ai:lora'];

    const stats: Record<string, unknown> = {};

    for (const q of queues) {
      stats[q] = await queue.getStats(q);
    }

    res.json({
      adapter: queue.getName(),
      queues: stats,
    });
  } catch (error) {
    next(error);
  }
}
