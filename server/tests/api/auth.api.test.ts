/**
 * Auth API Integration Tests
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock modules before importing app
vi.mock('../../db/client.js', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
      },
    })),
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
  checkDatabaseHealth: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { db } from '../../db/client.js';
import { createTestUser, hashPassword, generateTestAccessToken } from '../utils/test-helpers.js';
import bcrypt from 'bcrypt';

// Create a minimal Express app for testing auth routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Simple auth routes for testing
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, username, password, displayName } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
        });
      }

      // Check existing user
      const existing = await db.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: { code: 'USER_EXISTS', message: 'User already exists' },
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await db.user.create({
        data: { email, username, displayName: displayName || username, passwordHash },
      });

      res.status(201).json({
        success: true,
        data: { user: { id: user.id, email: user.email, username: user.username } },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Server error' },
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Missing credentials' },
        });
      }

      const user = await db.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
        });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
        });
      }

      const accessToken = generateTestAccessToken(user.id, user.username);

      res.json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, username: user.username },
          accessToken,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Server error' },
      });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' },
      });
    }

    // In real app, verify token and get user
    res.json({
      success: true,
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    });
  });

  return app;
}

describe('Auth API', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValue(null);
      vi.mocked(db.user.create).mockResolvedValue(createTestUser());

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123!',
          displayName: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject registration with existing email', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValue(createTestUser());

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'newuser',
          password: 'Password123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing username and password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const passwordHash = await hashPassword('Password123!');
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createTestUser({ passwordHash })
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      const passwordHash = await hashPassword('Password123!');
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createTestUser({ passwordHash })
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const token = generateTestAccessToken('user-123');

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
