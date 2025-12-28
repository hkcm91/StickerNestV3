/**
 * Job Controller Tests
 * Tests for job submission and status endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateTestAccessToken } from '../utils/test-helpers.js';

// Mock the queue adapter
const mockQueueAdapter = {
  add: vi.fn(),
  getJob: vi.fn(),
  getJobs: vi.fn(),
  removeJob: vi.fn(),
  getStats: vi.fn(),
  process: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  close: vi.fn(),
  getName: vi.fn(() => 'mock'),
};

vi.mock('../../lib/queue/index.js', () => ({
  getQueueAdapter: vi.fn(() => Promise.resolve(mockQueueAdapter)),
  QUEUES: {
    AI_GENERATION: 'ai:generation',
    AI_IMAGE: 'ai:image',
    AI_VIDEO: 'ai:video',
    EXPORT: 'export',
    NOTIFICATION: 'notification',
    EMAIL: 'email',
    CLEANUP: 'cleanup',
    ANALYTICS: 'analytics',
  },
}));

// Mock the logger
vi.mock('../../utils/logger.js', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
import jobRoutes from '../../routes/job.routes.js';

describe('Job Controller', () => {
  let app: express.Application;
  let authToken: string;
  const testUserId = 'usr_test123';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/jobs', jobRoutes);

    authToken = generateTestAccessToken(testUserId, 'testuser');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/jobs/image', () => {
    it('should submit an image generation job', async () => {
      mockQueueAdapter.add.mockResolvedValue({
        id: 'job_123',
        queue: 'ai:image',
        data: {},
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        createdAt: Date.now(),
      });

      const response = await request(app)
        .post('/api/jobs/image')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A beautiful sunset',
          width: 512,
          height: 512,
          numOutputs: 1,
          provider: 'replicate',
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.status).toBe('pending');
      expect(mockQueueAdapter.add).toHaveBeenCalled();
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/jobs/image')
        .send({
          prompt: 'A beautiful sunset',
          width: 512,
          height: 512,
          numOutputs: 1,
          provider: 'replicate',
        });

      expect(response.status).toBe(401);
    });

    it('should reject invalid request body', async () => {
      const response = await request(app)
        .post('/api/jobs/image')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          width: 512,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/jobs/widget', () => {
    it('should submit a widget generation job', async () => {
      mockQueueAdapter.add.mockResolvedValue({
        id: 'job_456',
        queue: 'ai:generation',
        data: {},
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        createdAt: Date.now(),
      });

      const response = await request(app)
        .post('/api/jobs/widget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'A weather widget',
          mode: 'new',
          quality: 'standard',
          style: 'polished',
          provider: 'anthropic',
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId', 'job_456');
      expect(response.body.queue).toBe('ai:generation');
    });
  });

  describe('GET /api/jobs', () => {
    it('should list user jobs', async () => {
      mockQueueAdapter.getJobs.mockResolvedValue([
        {
          id: 'job_1',
          queue: 'ai:image',
          data: { userId: testUserId, type: 'image' },
          priority: 5,
          attempts: 0,
          maxAttempts: 3,
          createdAt: Date.now(),
        },
        {
          id: 'job_2',
          queue: 'ai:generation',
          data: { userId: testUserId, type: 'widget' },
          priority: 5,
          attempts: 0,
          maxAttempts: 3,
          createdAt: Date.now() - 1000,
        },
      ]);

      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);
    });

    it('should filter jobs by status', async () => {
      mockQueueAdapter.getJobs.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/jobs?status=completed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(mockQueueAdapter.getJobs).toHaveBeenCalled();
    });
  });

  describe('GET /api/jobs/:jobId', () => {
    it('should get job status', async () => {
      const now = Date.now();
      mockQueueAdapter.getJob.mockResolvedValue({
        id: 'job_123',
        queue: 'ai:image',
        data: { userId: testUserId, type: 'image', prompt: 'test' },
        priority: 5,
        attempts: 1,
        maxAttempts: 3,
        createdAt: now,
        startedAt: now + 100,
      });

      const response = await request(app)
        .get('/api/jobs/job_123?queue=ai:image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.jobId).toBe('job_123');
      expect(response.body.status).toBe('active');
    });

    it('should return 404 for non-existent job', async () => {
      mockQueueAdapter.getJob.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/jobs/non_existent?queue=ai:image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should require queue parameter', async () => {
      const response = await request(app)
        .get('/api/jobs/job_123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/jobs/:jobId', () => {
    it('should cancel a pending job', async () => {
      mockQueueAdapter.getJob.mockResolvedValue({
        id: 'job_123',
        queue: 'ai:image',
        data: { userId: testUserId },
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        createdAt: Date.now(),
        // No startedAt = pending
      });
      mockQueueAdapter.removeJob.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/jobs/job_123?queue=ai:image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not cancel a started job', async () => {
      mockQueueAdapter.getJob.mockResolvedValue({
        id: 'job_123',
        queue: 'ai:image',
        data: { userId: testUserId },
        priority: 5,
        attempts: 1,
        maxAttempts: 3,
        createdAt: Date.now(),
        startedAt: Date.now(), // Already started
      });

      const response = await request(app)
        .delete('/api/jobs/job_123?queue=ai:image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/jobs/stats', () => {
    it('should return queue statistics', async () => {
      mockQueueAdapter.getStats.mockResolvedValue({
        pending: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 0,
      });

      const response = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('queues');
      expect(response.body).toHaveProperty('adapter', 'mock');
    });
  });
});
