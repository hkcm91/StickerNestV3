/**
 * Database Mock
 * Provides mock implementations for Prisma client
 */

import { vi } from 'vitest';

// Mock user data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456789', // bcrypt hash
  avatarUrl: null,
  bio: null,
  isVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Mock canvas data
export const mockCanvas = {
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
};

// Mock widget instance
export const mockWidgetInstance = {
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
};

// Mock refresh token
export const mockRefreshToken = {
  id: 'token-123',
  userId: 'user-123',
  token: 'hashed-refresh-token',
  family: 'family-123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  createdAt: new Date('2024-01-01'),
  revokedAt: null,
};

// Create mock Prisma client
export function createMockPrismaClient() {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    canvas: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    widgetInstance: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    widgetDefinition: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    widgetPackage: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(createMockPrismaClient())),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}

// Mock db module
export const mockDb = createMockPrismaClient();
