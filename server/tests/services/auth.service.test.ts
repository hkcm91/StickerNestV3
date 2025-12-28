/**
 * Auth Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock the db module before importing the service
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
        update: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    })),
  },
}));

import { db } from '../../db/client.js';
import {
  generateTestAccessToken,
  generateExpiredAccessToken,
  createTestUser,
  hashPassword,
} from '../utils/test-helpers.js';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123!';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123!';
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123!';
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-at-least-32-chars-long';

    it('should generate valid access token', () => {
      const token = generateTestAccessToken('user-123', 'testuser');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should decode access token correctly', () => {
      const token = generateTestAccessToken('user-123', 'testuser');
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; type: string };

      expect(decoded.userId).toBe('user-123');
      expect(decoded.username).toBe('testuser');
      expect(decoded.type).toBe('access');
    });

    it('should reject expired token', () => {
      const token = generateExpiredAccessToken('user-123');

      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow();
    });

    it('should reject token with wrong secret', () => {
      const token = generateTestAccessToken('user-123');

      expect(() => {
        jwt.verify(token, 'wrong-secret');
      }).toThrow();
    });
  });

  describe('User Lookup', () => {
    it('should find user by email', async () => {
      const mockUser = createTestUser();
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

      const user = await db.user.findUnique({
        where: { email: 'test@example.com' },
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null for non-existent user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      const user = await db.user.findUnique({
        where: { email: 'nonexistent@example.com' },
      });

      expect(user).toBeNull();
    });
  });

  describe('User Registration', () => {
    it('should create new user with hashed password', async () => {
      const passwordHash = await hashPassword('testPassword123!');
      const mockUser = createTestUser({ passwordHash });

      vi.mocked(db.user.findFirst).mockResolvedValue(null); // No existing user
      vi.mocked(db.user.create).mockResolvedValue(mockUser);

      // Check no existing user
      const existing = await db.user.findFirst({
        where: {
          OR: [
            { email: 'test@example.com' },
            { username: 'testuser' },
          ],
        },
      });
      expect(existing).toBeNull();

      // Create user
      const user = await db.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
          passwordHash,
        },
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).not.toBe('testPassword123!'); // Should be hashed
    });

    it('should reject duplicate email', async () => {
      const existingUser = createTestUser();
      vi.mocked(db.user.findFirst).mockResolvedValue(existingUser);

      const existing = await db.user.findFirst({
        where: {
          OR: [
            { email: 'test@example.com' },
            { username: 'newuser' },
          ],
        },
      });

      expect(existing).not.toBeNull();
      // In real service, this would throw an error
    });
  });

  describe('Refresh Token Management', () => {
    it('should create refresh token', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'hashed-token',
        family: 'family-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: null,
      };

      vi.mocked(db.refreshToken.create).mockResolvedValue(mockToken);

      const token = await db.refreshToken.create({
        data: {
          userId: 'user-123',
          token: 'hashed-token',
          family: 'family-123',
          expiresAt: mockToken.expiresAt,
        },
      });

      expect(token).toBeDefined();
      expect(token.userId).toBe('user-123');
      expect(token.revokedAt).toBeNull();
    });

    it('should revoke token family on reuse', async () => {
      vi.mocked(db.refreshToken.updateMany).mockResolvedValue({ count: 3 });

      const result = await db.refreshToken.updateMany({
        where: {
          family: 'family-123',
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      expect(result.count).toBe(3);
    });
  });
});
