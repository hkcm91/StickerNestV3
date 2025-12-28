/**
 * Message Queue Abstraction Types
 * For async job processing (AI generation, exports, notifications)
 */

export interface QueueJob<T = unknown> {
  id: string;
  queue: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  result?: unknown;
}

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed';

export interface QueueOptions {
  maxAttempts?: number;
  backoffMs?: number;
  timeoutMs?: number;
  priority?: number;
  delay?: number;
}

export type JobHandler<T = unknown, R = unknown> = (job: QueueJob<T>) => Promise<R>;

export interface QueueAdapter {
  /**
   * Add a job to a queue
   */
  add<T>(queue: string, data: T, options?: QueueOptions): Promise<QueueJob<T>>;

  /**
   * Process jobs from a queue
   */
  process<T, R>(queue: string, handler: JobHandler<T, R>, concurrency?: number): void;

  /**
   * Get job by ID
   */
  getJob(queue: string, jobId: string): Promise<QueueJob | null>;

  /**
   * Get jobs by status
   */
  getJobs(queue: string, status: JobStatus, limit?: number): Promise<QueueJob[]>;

  /**
   * Remove a job
   */
  removeJob(queue: string, jobId: string): Promise<boolean>;

  /**
   * Pause queue processing
   */
  pause(queue: string): Promise<void>;

  /**
   * Resume queue processing
   */
  resume(queue: string): Promise<void>;

  /**
   * Get queue stats
   */
  getStats(queue: string): Promise<QueueStats>;

  /**
   * Close all connections
   */
  close(): Promise<void>;

  /**
   * Get adapter name
   */
  getName(): string;
}

export interface QueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface QueueConfig {
  adapter: 'local' | 'redis' | 'bullmq';
  redis?: {
    url: string;
    prefix?: string;
  };
  defaultOptions?: QueueOptions;
}

// Predefined queue names
export const QUEUES = {
  AI_GENERATION: 'ai:generation',
  AI_IMAGE: 'ai:image',
  AI_VIDEO: 'ai:video',
  EXPORT: 'export',
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  CLEANUP: 'cleanup',
  ANALYTICS: 'analytics',
} as const;
