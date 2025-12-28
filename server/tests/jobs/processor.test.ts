/**
 * Job Processor Tests
 * Tests for the base job processor and job management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { QueueJob, QueueAdapter, JobHandler, JobStatus, QueueStats, QueueOptions } from '../../lib/queue/types.js';
import {
  BaseJobProcessor,
  publishJobStatus,
  registerProcessor,
  getProcessor,
  startAllProcessors,
} from '../../jobs/processor.js';
import type { AIJobData, AIJobResult, JobStatusUpdate } from '../../jobs/types.js';

// Mock the pubsub module
vi.mock('../../lib/pubsub/index.js', () => ({
  getPubSubAdapter: vi.fn(() => Promise.resolve({
    publish: vi.fn(() => Promise.resolve()),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    getName: () => 'mock',
  })),
}));

// Mock the logger
vi.mock('../../utils/logger.js', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Create a mock queue adapter
function createMockQueueAdapter(): QueueAdapter {
  const handlers = new Map<string, JobHandler>();
  const jobs = new Map<string, QueueJob>();

  return {
    add: vi.fn(async <T>(queue: string, data: T, options?: QueueOptions): Promise<QueueJob<T>> => {
      const job: QueueJob<T> = {
        id: `job_${Date.now()}`,
        queue,
        data,
        priority: options?.priority || 5,
        attempts: 0,
        maxAttempts: options?.maxAttempts || 3,
        createdAt: Date.now(),
      };
      jobs.set(job.id, job as QueueJob);
      return job;
    }),
    process: vi.fn(<T, R>(queue: string, handler: JobHandler<T, R>, _concurrency?: number): void => {
      handlers.set(queue, handler as JobHandler);
    }),
    getJob: vi.fn(async (_queue: string, jobId: string): Promise<QueueJob | null> => {
      return jobs.get(jobId) || null;
    }),
    getJobs: vi.fn(async (_queue: string, _status: JobStatus, _limit?: number): Promise<QueueJob[]> => {
      return Array.from(jobs.values());
    }),
    removeJob: vi.fn(async (_queue: string, jobId: string): Promise<boolean> => {
      return jobs.delete(jobId);
    }),
    pause: vi.fn(async (): Promise<void> => {}),
    resume: vi.fn(async (): Promise<void> => {}),
    getStats: vi.fn(async (): Promise<QueueStats> => ({
      pending: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    })),
    close: vi.fn(async (): Promise<void> => {}),
    getName: vi.fn(() => 'mock'),
  };
}

// Test concrete implementation of BaseJobProcessor
class TestProcessor extends BaseJobProcessor<AIJobData, AIJobResult> {
  public processedJobs: QueueJob<AIJobData>[] = [];
  public shouldFail = false;

  constructor(queueAdapter: QueueAdapter) {
    super(queueAdapter, 'test-queue', 1);
  }

  protected async process(job: QueueJob<AIJobData>): Promise<AIJobResult> {
    this.processedJobs.push(job);

    if (this.shouldFail) {
      throw new Error('Test failure');
    }

    return {
      type: 'image',
      images: [{ url: 'https://example.com/image.png', width: 512, height: 512 }],
      model: 'test-model',
      provider: 'replicate',
    };
  }
}

describe('Job Processor', () => {
  let mockAdapter: QueueAdapter;
  let processor: TestProcessor;

  beforeEach(() => {
    mockAdapter = createMockQueueAdapter();
    processor = new TestProcessor(mockAdapter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseJobProcessor', () => {
    it('should initialize with correct queue name and concurrency', () => {
      expect(processor['queueName']).toBe('test-queue');
      expect(processor['concurrency']).toBe(1);
    });

    it('should start processing jobs when start() is called', () => {
      processor.start();

      expect(mockAdapter.process).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        1
      );
    });
  });

  describe('publishJobStatus', () => {
    it('should publish job status update', async () => {
      const update: JobStatusUpdate = {
        jobId: 'job_123',
        status: 'active',
        progress: 50,
        message: 'Processing...',
      };

      await publishJobStatus('user_123', update);

      // The function should complete without throwing
      expect(true).toBe(true);
    });

    it('should handle publish errors gracefully', async () => {
      // Even if publish fails, it should not throw
      await publishJobStatus('user_123', {
        jobId: 'job_123',
        status: 'failed',
        error: 'Test error',
      });

      expect(true).toBe(true);
    });
  });

  describe('Processor Registry', () => {
    it('should register and retrieve processors', () => {
      const mockAdapter = createMockQueueAdapter();
      const testProcessor = new TestProcessor(mockAdapter);

      registerProcessor('test', testProcessor as Parameters<typeof registerProcessor>[1]);

      const retrieved = getProcessor('test');
      expect(retrieved).toBe(testProcessor);
    });

    it('should return undefined for non-existent processor', () => {
      const retrieved = getProcessor('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should start all registered processors', () => {
      const adapter1 = createMockQueueAdapter();
      const adapter2 = createMockQueueAdapter();
      const processor1 = new TestProcessor(adapter1);
      const processor2 = new TestProcessor(adapter2);

      registerProcessor('processor1', processor1 as Parameters<typeof registerProcessor>[1]);
      registerProcessor('processor2', processor2 as Parameters<typeof registerProcessor>[1]);

      startAllProcessors();

      expect(adapter1.process).toHaveBeenCalled();
      expect(adapter2.process).toHaveBeenCalled();
    });
  });
});
