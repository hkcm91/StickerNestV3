/**
 * Local Queue Adapter
 * In-memory job queue for development and single-server deployments
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  QueueAdapter,
  QueueJob,
  QueueOptions,
  JobHandler,
  JobStatus,
  QueueStats,
} from './types.js';

interface QueueState {
  jobs: Map<string, QueueJob>;
  pending: string[];
  active: Set<string>;
  completed: string[];
  failed: string[];
  delayed: Map<string, NodeJS.Timeout>;
  paused: boolean;
  handler?: JobHandler;
  concurrency: number;
  processing: number;
}

export class LocalQueueAdapter implements QueueAdapter {
  private queues: Map<string, QueueState> = new Map();
  private defaultOptions: QueueOptions;

  constructor(defaultOptions: QueueOptions = {}) {
    this.defaultOptions = {
      maxAttempts: 3,
      backoffMs: 1000,
      timeoutMs: 30000,
      priority: 0,
      ...defaultOptions,
    };
  }

  getName(): string {
    return 'local';
  }

  private getOrCreateQueue(queueName: string): QueueState {
    let queue = this.queues.get(queueName);
    if (!queue) {
      queue = {
        jobs: new Map(),
        pending: [],
        active: new Set(),
        completed: [],
        failed: [],
        delayed: new Map(),
        paused: false,
        concurrency: 1,
        processing: 0,
      };
      this.queues.set(queueName, queue);
    }
    return queue;
  }

  async add<T>(queueName: string, data: T, options: QueueOptions = {}): Promise<QueueJob<T>> {
    const queue = this.getOrCreateQueue(queueName);
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

    queue.jobs.set(job.id, job as QueueJob);

    if (opts.delay && opts.delay > 0) {
      // Delayed job
      job.scheduledAt = Date.now() + opts.delay;
      const timeout = setTimeout(() => {
        queue.delayed.delete(job.id);
        this.enqueue(queue, job.id);
      }, opts.delay);
      queue.delayed.set(job.id, timeout);
    } else {
      this.enqueue(queue, job.id);
    }

    return job;
  }

  private enqueue(queue: QueueState, jobId: string): void {
    const job = queue.jobs.get(jobId);
    if (!job) return;

    // Insert by priority (higher priority first)
    const insertIndex = queue.pending.findIndex(id => {
      const pendingJob = queue.jobs.get(id);
      return pendingJob && pendingJob.priority < job.priority;
    });

    if (insertIndex === -1) {
      queue.pending.push(jobId);
    } else {
      queue.pending.splice(insertIndex, 0, jobId);
    }

    this.processNext(queue);
  }

  process<T, R>(queueName: string, handler: JobHandler<T, R>, concurrency: number = 1): void {
    const queue = this.getOrCreateQueue(queueName);
    queue.handler = handler as JobHandler;
    queue.concurrency = concurrency;

    // Process any pending jobs
    this.processNext(queue);
  }

  private async processNext(queue: QueueState): Promise<void> {
    if (queue.paused || !queue.handler) return;
    if (queue.processing >= queue.concurrency) return;
    if (queue.pending.length === 0) return;

    const jobId = queue.pending.shift();
    if (!jobId) return;

    const job = queue.jobs.get(jobId);
    if (!job) return;

    queue.active.add(jobId);
    queue.processing++;
    job.startedAt = Date.now();
    job.attempts++;

    try {
      const result = await Promise.race([
        queue.handler(job),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Job timeout')), this.defaultOptions.timeoutMs);
        }),
      ]);

      job.result = result;
      job.completedAt = Date.now();
      queue.active.delete(jobId);
      queue.completed.push(jobId);

      // Limit completed history
      if (queue.completed.length > 1000) {
        const oldId = queue.completed.shift();
        if (oldId) queue.jobs.delete(oldId);
      }
    } catch (error) {
      queue.active.delete(jobId);
      job.error = error instanceof Error ? error.message : String(error);

      if (job.attempts < job.maxAttempts) {
        // Retry with backoff
        const backoff = (this.defaultOptions.backoffMs ?? 1000) * Math.pow(2, job.attempts - 1);
        setTimeout(() => {
          this.enqueue(queue, jobId);
        }, backoff);
      } else {
        job.failedAt = Date.now();
        queue.failed.push(jobId);

        // Limit failed history
        if (queue.failed.length > 1000) {
          const oldId = queue.failed.shift();
          if (oldId) queue.jobs.delete(oldId);
        }
      }
    } finally {
      queue.processing--;
      // Process next job
      setImmediate(() => this.processNext(queue));
    }
  }

  async getJob(queueName: string, jobId: string): Promise<QueueJob | null> {
    const queue = this.queues.get(queueName);
    return queue?.jobs.get(jobId) ?? null;
  }

  async getJobs(queueName: string, status: JobStatus, limit: number = 100): Promise<QueueJob[]> {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    let jobIds: string[];

    switch (status) {
      case 'pending':
        jobIds = queue.pending.slice(0, limit);
        break;
      case 'active':
        jobIds = Array.from(queue.active).slice(0, limit);
        break;
      case 'completed':
        jobIds = queue.completed.slice(-limit);
        break;
      case 'failed':
        jobIds = queue.failed.slice(-limit);
        break;
      case 'delayed':
        jobIds = Array.from(queue.delayed.keys()).slice(0, limit);
        break;
      default:
        jobIds = [];
    }

    return jobIds
      .map(id => queue.jobs.get(id))
      .filter((job): job is QueueJob => job !== undefined);
  }

  async removeJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    // Cancel delayed timeout
    const timeout = queue.delayed.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      queue.delayed.delete(jobId);
    }

    // Remove from pending
    const pendingIdx = queue.pending.indexOf(jobId);
    if (pendingIdx !== -1) {
      queue.pending.splice(pendingIdx, 1);
    }

    // Remove from active (shouldn't happen normally)
    queue.active.delete(jobId);

    return queue.jobs.delete(jobId);
  }

  async pause(queueName: string): Promise<void> {
    const queue = this.getOrCreateQueue(queueName);
    queue.paused = true;
  }

  async resume(queueName: string): Promise<void> {
    const queue = this.getOrCreateQueue(queueName);
    queue.paused = false;
    this.processNext(queue);
  }

  async getStats(queueName: string): Promise<QueueStats> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return { pending: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }

    return {
      pending: queue.pending.length,
      active: queue.active.size,
      completed: queue.completed.length,
      failed: queue.failed.length,
      delayed: queue.delayed.size,
    };
  }

  async close(): Promise<void> {
    // Clear all delayed timeouts
    for (const queue of this.queues.values()) {
      for (const timeout of queue.delayed.values()) {
        clearTimeout(timeout);
      }
      queue.delayed.clear();
    }

    this.queues.clear();
  }
}
