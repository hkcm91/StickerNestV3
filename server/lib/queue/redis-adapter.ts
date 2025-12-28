/**
 * Redis Queue Adapter (BullMQ-compatible interface)
 * For production multi-server deployments
 *
 * This is a wrapper that provides a consistent interface.
 * In production, you would use BullMQ directly for better features.
 */

import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import type {
  QueueAdapter,
  QueueJob,
  QueueOptions,
  JobHandler,
  JobStatus,
  QueueStats,
} from './types.js';

export class RedisQueueAdapter implements QueueAdapter {
  private client: RedisClientType;
  private prefix: string;
  private handlers: Map<string, { handler: JobHandler; concurrency: number }> = new Map();
  private processing: Map<string, number> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private ready: boolean = false;
  private defaultOptions: QueueOptions;

  constructor(redisUrl: string, prefix: string = 'stickernest:queue:', defaultOptions: QueueOptions = {}) {
    this.client = createClient({ url: redisUrl });
    this.prefix = prefix;
    this.defaultOptions = {
      maxAttempts: 3,
      backoffMs: 1000,
      timeoutMs: 30000,
      priority: 0,
      ...defaultOptions,
    };

    this.client.on('error', (err: Error) => {
      console.error('[RedisQueue] Error:', err);
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.ready = true;
    console.log('[RedisQueue] Connected');
  }

  getName(): string {
    return 'redis';
  }

  private key(queue: string, type: string): string {
    return `${this.prefix}${queue}:${type}`;
  }

  async add<T>(queueName: string, data: T, options: QueueOptions = {}): Promise<QueueJob<T>> {
    if (!this.ready) throw new Error('Redis queue not connected');

    const opts = { ...this.defaultOptions, ...options };

    const job: QueueJob<T> = {
      id: uuidv4(),
      queue: queueName,
      data,
      priority: opts.priority ?? 0,
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? 3,
      createdAt: Date.now(),
    };

    const jobJson = JSON.stringify(job);

    if (opts.delay && opts.delay > 0) {
      // Add to delayed set with score = scheduledAt
      job.scheduledAt = Date.now() + opts.delay;
      await this.client.zAdd(this.key(queueName, 'delayed'), {
        score: job.scheduledAt,
        value: jobJson,
      });
    } else {
      // Add to pending list (using priority as score)
      await this.client.zAdd(this.key(queueName, 'pending'), {
        score: -job.priority, // Negative so higher priority comes first
        value: jobJson,
      });
    }

    // Store job data
    await this.client.set(
      this.key(queueName, `job:${job.id}`),
      jobJson,
      { EX: 7 * 24 * 60 * 60 } // 7 days expiry
    );

    return job;
  }

  process<T, R>(queueName: string, handler: JobHandler<T, R>, concurrency: number = 1): void {
    this.handlers.set(queueName, { handler: handler as JobHandler, concurrency });
    this.processing.set(queueName, 0);

    // Start polling for jobs
    const poll = async () => {
      if (!this.ready) return;

      const handlerConfig = this.handlers.get(queueName);
      if (!handlerConfig) return;

      const currentProcessing = this.processing.get(queueName) ?? 0;
      if (currentProcessing >= handlerConfig.concurrency) return;

      // Move delayed jobs that are ready
      await this.moveDelayedJobs(queueName);

      // Get next job (atomic pop from sorted set)
      const results = await this.client.zPopMin(this.key(queueName, 'pending'));
      if (!results) return;

      const jobJson = results.value;
      if (!jobJson) return;

      const job: QueueJob<T> = JSON.parse(jobJson);
      this.processing.set(queueName, currentProcessing + 1);

      // Mark as active
      await this.client.sAdd(this.key(queueName, 'active'), job.id);

      job.startedAt = Date.now();
      job.attempts++;

      try {
        const result = await Promise.race([
          handlerConfig.handler(job),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Job timeout')), this.defaultOptions.timeoutMs);
          }),
        ]);

        job.result = result;
        job.completedAt = Date.now();

        // Move to completed
        await this.client.sRem(this.key(queueName, 'active'), job.id);
        await this.client.lPush(this.key(queueName, 'completed'), job.id);
        await this.client.lTrim(this.key(queueName, 'completed'), 0, 999); // Keep last 1000

        // Update job data
        await this.client.set(
          this.key(queueName, `job:${job.id}`),
          JSON.stringify(job),
          { EX: 24 * 60 * 60 } // 24 hours for completed jobs
        );
      } catch (error) {
        job.error = error instanceof Error ? error.message : String(error);

        await this.client.sRem(this.key(queueName, 'active'), job.id);

        if (job.attempts < job.maxAttempts) {
          // Retry with backoff
          const backoff = (this.defaultOptions.backoffMs ?? 1000) * Math.pow(2, job.attempts - 1);
          job.scheduledAt = Date.now() + backoff;
          await this.client.zAdd(this.key(queueName, 'delayed'), {
            score: job.scheduledAt,
            value: JSON.stringify(job),
          });
        } else {
          job.failedAt = Date.now();
          await this.client.lPush(this.key(queueName, 'failed'), job.id);
          await this.client.lTrim(this.key(queueName, 'failed'), 0, 999);
        }

        // Update job data
        await this.client.set(
          this.key(queueName, `job:${job.id}`),
          JSON.stringify(job),
          { EX: 7 * 24 * 60 * 60 }
        );
      } finally {
        const p = this.processing.get(queueName) ?? 1;
        this.processing.set(queueName, Math.max(0, p - 1));
      }
    };

    // Poll every 100ms
    const interval = setInterval(poll, 100);
    this.pollIntervals.set(queueName, interval);

    // Initial poll
    poll();
  }

  private async moveDelayedJobs(queueName: string): Promise<void> {
    const now = Date.now();

    // Get delayed jobs that are ready
    const ready = await this.client.zRangeByScore(
      this.key(queueName, 'delayed'),
      0,
      now
    );

    for (const jobJson of ready) {
      // Remove from delayed
      await this.client.zRem(this.key(queueName, 'delayed'), jobJson);

      // Add to pending
      const job: QueueJob = JSON.parse(jobJson);
      await this.client.zAdd(this.key(queueName, 'pending'), {
        score: -job.priority,
        value: jobJson,
      });
    }
  }

  async getJob(queueName: string, jobId: string): Promise<QueueJob | null> {
    if (!this.ready) return null;

    const jobJson = await this.client.get(this.key(queueName, `job:${jobId}`));
    return jobJson ? JSON.parse(jobJson) : null;
  }

  async getJobs(queueName: string, status: JobStatus, limit: number = 100): Promise<QueueJob[]> {
    if (!this.ready) return [];

    let jobIds: string[] = [];

    switch (status) {
      case 'pending':
        const pending = await this.client.zRange(this.key(queueName, 'pending'), 0, limit - 1);
        return pending.map((json: string) => JSON.parse(json));

      case 'active':
        jobIds = await this.client.sMembers(this.key(queueName, 'active'));
        break;

      case 'completed':
        jobIds = await this.client.lRange(this.key(queueName, 'completed'), 0, limit - 1);
        break;

      case 'failed':
        jobIds = await this.client.lRange(this.key(queueName, 'failed'), 0, limit - 1);
        break;

      case 'delayed':
        const delayed = await this.client.zRange(this.key(queueName, 'delayed'), 0, limit - 1);
        return delayed.map((json: string) => JSON.parse(json));
    }

    // Fetch job data for job IDs
    const jobs: QueueJob[] = [];
    for (const id of jobIds.slice(0, limit)) {
      const job = await this.getJob(queueName, id);
      if (job) jobs.push(job);
    }

    return jobs;
  }

  async removeJob(queueName: string, jobId: string): Promise<boolean> {
    if (!this.ready) return false;

    // Try to remove from all lists/sets
    const deleted = await this.client.del(this.key(queueName, `job:${jobId}`));

    // Remove from active
    await this.client.sRem(this.key(queueName, 'active'), jobId);

    // Remove from completed/failed lists (expensive but rare)
    await this.client.lRem(this.key(queueName, 'completed'), 0, jobId);
    await this.client.lRem(this.key(queueName, 'failed'), 0, jobId);

    return deleted > 0;
  }

  async pause(queueName: string): Promise<void> {
    const interval = this.pollIntervals.get(queueName);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(queueName);
    }
  }

  async resume(queueName: string): Promise<void> {
    const handler = this.handlers.get(queueName);
    if (handler) {
      this.process(queueName, handler.handler, handler.concurrency);
    }
  }

  async getStats(queueName: string): Promise<QueueStats> {
    if (!this.ready) {
      return { pending: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }

    const [pending, active, completed, failed, delayed] = await Promise.all([
      this.client.zCard(this.key(queueName, 'pending')),
      this.client.sCard(this.key(queueName, 'active')),
      this.client.lLen(this.key(queueName, 'completed')),
      this.client.lLen(this.key(queueName, 'failed')),
      this.client.zCard(this.key(queueName, 'delayed')),
    ]);

    return { pending, active, completed, failed, delayed };
  }

  async close(): Promise<void> {
    // Stop all polling
    for (const interval of this.pollIntervals.values()) {
      clearInterval(interval);
    }
    this.pollIntervals.clear();

    this.ready = false;
    await this.client.quit();
    console.log('[RedisQueue] Closed');
  }
}
