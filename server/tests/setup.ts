/**
 * Test Setup
 * Runs before all tests to configure the test environment
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.HOST = '127.0.0.1';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.STORAGE_ENDPOINT = 'http://localhost:9000';
process.env.STORAGE_REGION = 'auto';
process.env.STORAGE_ACCESS_KEY_ID = 'test-access-key';
process.env.STORAGE_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.STORAGE_BUCKET_USER_WIDGETS = 'test-user-widgets';
process.env.STORAGE_BUCKET_SYSTEM_WIDGETS = 'test-system-widgets';
process.env.STORAGE_BUCKET_ASSETS = 'test-assets';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
process.env.ENABLE_MARKETPLACE = 'true';
process.env.ENABLE_AI_GENERATION = 'true';
process.env.SCALING_MODE = 'local';

// Silence console during tests unless DEBUG is set
if (!process.env.DEBUG) {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
}

beforeAll(() => {
  // Global setup
});

afterAll(() => {
  // Global cleanup
  vi.restoreAllMocks();
});
