import cors, { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
import { env, isDevelopment } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Parse CORS_ORIGIN environment variable
 * Supports comma-separated origins
 */
function parseAllowedOrigins(): string[] {
  return env.CORS_ORIGIN.split(',').map(origin => origin.trim());
}

/**
 * Check if an origin is allowed
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  const allowedOrigins = parseAllowedOrigins();

  // Check for exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check for wildcard patterns
  for (const allowed of allowedOrigins) {
    if (allowed === '*') return true;

    // Support wildcard subdomains (e.g., *.example.com)
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      if (origin.endsWith(domain)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * CORS options with dynamic origin checking
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isDevelopment) {
      // In development, allow all origins
      callback(null, true);
    } else if (!origin || isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      // Log blocked origin attempts
      logger.warn({ origin }, 'CORS blocked request from origin');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Request-ID',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
};

/**
 * CORS middleware instance
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Simple CORS options for specific routes
 */
export const simpleCorsOptions: CorsOptions = {
  origin: isDevelopment ? true : parseAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

/**
 * Create CORS middleware for specific origins
 */
export function createCorsMiddleware(origins: string[]): ReturnType<typeof cors> {
  return cors({
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

/**
 * CORS preflight handler for complex requests
 */
export function handlePreflight(
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(204).end();
}
