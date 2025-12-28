import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable schema with validation
 * All required environment variables are validated at startup
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  HOST: z.string().default('0.0.0.0'),

  // Database (PostgreSQL via Supabase or standalone)
  DATABASE_URL: z.string().url(),

  // JWT Authentication
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Storage (R2/S3 compatible)
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string().default('auto'),
  STORAGE_ACCESS_KEY_ID: z.string(),
  STORAGE_SECRET_ACCESS_KEY: z.string(),
  STORAGE_BUCKET_USER_WIDGETS: z.string().default('user-widgets'),
  STORAGE_BUCKET_SYSTEM_WIDGETS: z.string().default('system-widgets'),
  STORAGE_BUCKET_ASSETS: z.string().default('assets'),

  // AI Providers (optional based on which you want to enable)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Feature Flags
  ENABLE_MARKETPLACE: z.string().transform(v => v === 'true').default('true'),
  ENABLE_AI_GENERATION: z.string().transform(v => v === 'true').default('true'),

  // Scaling
  SCALING_MODE: z.enum(['local', 'distributed']).optional(),
  REDIS_URL: z.string().url().optional(),
});

/**
 * Validated environment configuration
 * Throws an error at startup if required variables are missing
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed');
  }

  return parsed.data;
}

export const env = validateEnv();

/**
 * Type-safe environment variable access
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in test
 */
export const isTest = env.NODE_ENV === 'test';
