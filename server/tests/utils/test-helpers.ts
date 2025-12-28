/**
 * Test Helpers
 * Utility functions for testing
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-at-least-32-chars-long';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-chars-long';

/**
 * Generate a valid access token for testing
 */
export function generateTestAccessToken(userId: string, username: string = 'testuser'): string {
  return jwt.sign(
    {
      userId,
      username,
      type: 'access',
    },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generate a valid refresh token for testing
 */
export function generateTestRefreshToken(userId: string, family: string = 'test-family'): string {
  return jwt.sign(
    {
      userId,
      family,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Generate an expired access token for testing
 */
export function generateExpiredAccessToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      username: 'testuser',
      type: 'access',
    },
    JWT_ACCESS_SECRET,
    { expiresIn: '-1s' }
  );
}

/**
 * Hash a password for testing
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Create test user data
 */
export function createTestUser(overrides: Partial<{
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  isVerified: boolean;
}> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456789',
    avatarUrl: null,
    bio: null,
    isVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Create test canvas data
 */
export function createTestCanvas(overrides: Partial<{
  id: string;
  userId: string;
  name: string;
  slug: string;
  isPublic: boolean;
}> = {}) {
  return {
    id: 'canvas-123',
    userId: 'user-123',
    name: 'Test Canvas',
    slug: 'test-canvas',
    description: 'A test canvas',
    isPublic: false,
    thumbnail: null,
    backgroundConfig: {},
    settings: {},
    tags: ['test'],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Create test widget instance data
 */
export function createTestWidgetInstance(overrides: Partial<{
  id: string;
  canvasId: string;
  widgetDefId: string;
  positionX: number;
  positionY: number;
}> = {}) {
  return {
    id: 'widget-instance-123',
    canvasId: 'canvas-123',
    widgetDefId: 'widget-def-123',
    version: '1.0.0',
    positionX: 100,
    positionY: 100,
    width: 200,
    height: 200,
    zIndex: 1,
    isLocked: false,
    state: {},
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Wait for a specified time (useful for async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create authorization header
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
