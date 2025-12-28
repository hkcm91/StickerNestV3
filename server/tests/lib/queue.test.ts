/**
 * Queue Adapter Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalQueueAdapter } from '../../lib/queue/local-adapter.js';
import type { QueueJob } from '../../lib/queue/types.js';
import { wait } from '../utils/test-helpers.js';

describe('LocalQueueAdapter', () => {
  let adapter: LocalQueueAdapter;

  beforeEach(() => {
    adapter = new LocalQueueAdapter({
      maxAttempts: 3,
      backoffMs: 100,
      timeoutMs: 5000,
    });
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('getName', () => {
    it('should return "local"', () => {
      expect(adapter.getName()).toBe('local');
    });
  });

  describe('add', () => {
    it('should add a job to the queue', async () => {
      const job = await adapter.add('test-queue', { message: 'hello' });

      expect(job.id).toBeDefined();
      expect(job.queue).toBe('test-queue');
      expect(job.data).toEqual({ message: 'hello' });
      expect(job.attempts).toBe(0);
      expect(job.createdAt).toBeDefined();
    });

    it('should set priority from options', async () => {
      const job = await adapter.add('test-queue', {}, { priority: 10 });

      expect(job.priority).toBe(10);
    });

    it('should respect delay option', async () => {
      const job = await adapter.add('test-queue', {}, { delay: 1000 });

      expect(job.scheduledAt).toBeDefined();
      expect(job.scheduledAt).toBeGreaterThan(Date.now());
    });
  });

  describe('process', () => {
    it('should process jobs in queue', async () => {
      const processed: QueueJob[] = [];

      adapter.process('test-queue', async (job) => {
        processed.push(job);
        return { success: true };
      });

      await adapter.add('test-queue', { id: 1 });
      await adapter.add('test-queue', { id: 2 });

      // Wait for processing
      await wait(100);

      expect(processed).toHaveLength(2);
    });

    it('should process jobs by priority', async () => {
      const processed: number[] = [];

      // Add all jobs first before starting processor
      await adapter.add('test-queue', { id: 1 }, { priority: 1 });
      await adapter.add('test-queue', { id: 2 }, { priority: 10 }); // Higher priority
      await adapter.add('test-queue', { id: 3 }, { priority: 5 });

      // Now start processing - jobs should be processed by priority
      adapter.process('test-queue', async (job) => {
        processed.push((job.data as { id: number }).id);
        return { success: true };
      });

      await wait(200);

      // Higher priority (10) should be processed first, then 5, then 1
      expect(processed[0]).toBe(2);
      expect(processed[1]).toBe(3);
      expect(processed[2]).toBe(1);
    });

    it('should retry failed jobs', async () => {
      let attempts = 0;

      adapter.process('test-queue', async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Simulated failure');
        }
        return { success: true };
      });

      await adapter.add('test-queue', {});

      // Wait for retries (with backoff)
      await wait(500);

      expect(attempts).toBe(3);
    });

    it('should mark job as failed after max attempts', async () => {
      adapter.process('test-queue', async () => {
        throw new Error('Always fails');
      });

      await adapter.add('test-queue', {}, { maxAttempts: 2 });

      // Wait for all retries
      await wait(500);

      const stats = await adapter.getStats('test-queue');
      expect(stats.failed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getJob', () => {
    it('should retrieve job by id', async () => {
      const job = await adapter.add('test-queue', { message: 'test' });

      const retrieved = await adapter.getJob('test-queue', job.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(job.id);
      expect(retrieved?.data).toEqual({ message: 'test' });
    });

    it('should return null for non-existent job', async () => {
      const job = await adapter.getJob('test-queue', 'non-existent-id');

      expect(job).toBeNull();
    });
  });

  describe('getJobs', () => {
    it('should get pending jobs', async () => {
      await adapter.add('test-queue', { id: 1 });
      await adapter.add('test-queue', { id: 2 });

      const jobs = await adapter.getJobs('test-queue', 'pending');

      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('removeJob', () => {
    it('should remove a job', async () => {
      const job = await adapter.add('test-queue', {});

      const removed = await adapter.removeJob('test-queue', job.id);

      expect(removed).toBe(true);

      const retrieved = await adapter.getJob('test-queue', job.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('pause/resume', () => {
    it('should pause queue processing', async () => {
      const processed: number[] = [];

      adapter.process('test-queue', async (job) => {
        processed.push((job.data as { id: number }).id);
      });

      await adapter.add('test-queue', { id: 1 });
      await wait(50);

      await adapter.pause('test-queue');

      await adapter.add('test-queue', { id: 2 });
      await wait(100);

      // Only first job should be processed
      const processedBeforeResume = processed.length;

      await adapter.resume('test-queue');
      await wait(100);

      expect(processedBeforeResume).toBe(1);
      expect(processed.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      await adapter.add('test-queue', { id: 1 });
      await adapter.add('test-queue', { id: 2 });

      const stats = await adapter.getStats('test-queue');

      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('delayed');
      expect(stats.pending).toBeGreaterThanOrEqual(2);
    });

    it('should return empty stats for non-existent queue', async () => {
      const stats = await adapter.getStats('non-existent');

      expect(stats.pending).toBe(0);
      expect(stats.active).toBe(0);
    });
  });
});
