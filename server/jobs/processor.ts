/**
 * Job Processor Base
 * Base class and utilities for job processors
 */

import type { QueueJob, QueueAdapter } from '../lib/queue/types.js';
import type { AIJobData, AIJobResult, JobStatusUpdate } from './types.js';
import { getPubSubAdapter } from '../lib/pubsub/index.js';
import { log } from '../utils/logger.js';

/**
 * Publish job status update via pub/sub
 */
export async function publishJobStatus(
  userId: string,
  update: JobStatusUpdate
): Promise<void> {
  try {
    const pubsub = await getPubSubAdapter();
    const channel = `user:${userId}:jobs`;
    await pubsub.publish(channel, update);
    log.info('Published job status', { userId, jobId: update.jobId, status: update.status });
  } catch (error) {
    log.error('Failed to publish job status', error as Error);
  }
}

/**
 * Base job processor class
 */
export abstract class BaseJobProcessor<T extends AIJobData, R extends AIJobResult> {
  protected queueAdapter: QueueAdapter;
  protected queueName: string;
  protected concurrency: number;

  constructor(
    queueAdapter: QueueAdapter,
    queueName: string,
    concurrency: number = 2
  ) {
    this.queueAdapter = queueAdapter;
    this.queueName = queueName;
    this.concurrency = concurrency;
  }

  /**
   * Start processing jobs from the queue
   */
  start(): void {
    log.info(`Starting ${this.queueName} processor with concurrency ${this.concurrency}`);

    this.queueAdapter.process<T, R>(
      this.queueName,
      async (job) => this.handleJob(job),
      this.concurrency
    );
  }

  /**
   * Handle a single job
   */
  protected async handleJob(job: QueueJob<T>): Promise<R> {
    const { data } = job;
    const userId = data.userId;

    log.info(`Processing job ${job.id} in ${this.queueName}`, {
      type: data.type,
      attempt: job.attempts,
    });

    // Notify job started
    await publishJobStatus(userId, {
      jobId: job.id,
      status: 'active',
      progress: 0,
      message: 'Starting generation...',
    });

    try {
      // Execute the actual job processing
      const result = await this.process(job);

      // Notify job completed
      await publishJobStatus(userId, {
        jobId: job.id,
        status: 'completed',
        progress: 100,
        message: 'Generation complete',
        result,
      });

      log.info(`Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Notify job failed
      await publishJobStatus(userId, {
        jobId: job.id,
        status: 'failed',
        error: errorMessage,
      });

      log.error(`Job ${job.id} failed`, error as Error);
      throw error;
    }
  }

  /**
   * Process the job - implemented by subclasses
   */
  protected abstract process(job: QueueJob<T>): Promise<R>;

  /**
   * Update job progress
   */
  protected async updateProgress(
    job: QueueJob<T>,
    progress: number,
    message?: string
  ): Promise<void> {
    await publishJobStatus(job.data.userId, {
      jobId: job.id,
      status: 'active',
      progress,
      message,
    });
  }
}

/**
 * Job processor registry
 */
const processors: Map<string, BaseJobProcessor<AIJobData, AIJobResult>> = new Map();

/**
 * Register a processor
 */
export function registerProcessor(
  name: string,
  processor: BaseJobProcessor<AIJobData, AIJobResult>
): void {
  processors.set(name, processor);
}

/**
 * Get a registered processor
 */
export function getProcessor(name: string): BaseJobProcessor<AIJobData, AIJobResult> | undefined {
  return processors.get(name);
}

/**
 * Start all registered processors
 */
export function startAllProcessors(): void {
  for (const [name, processor] of processors) {
    log.info(`Starting processor: ${name}`);
    processor.start();
  }
}
