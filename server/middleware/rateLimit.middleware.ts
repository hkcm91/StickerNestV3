import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Key generator - uses user ID if authenticated, IP otherwise
 */
function keyGenerator(req: Request): string {
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

/**
 * Default rate limit options
 */
const defaultOptions: Partial<Options> = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req: Request, res: Response) => {
    logger.warn({
      key: keyGenerator(req),
      path: req.path,
    }, 'Rate limit exceeded');
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
      },
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
};

/**
 * Default rate limiter for general API endpoints
 */
export const defaultLimiter: RateLimitRequestHandler = rateLimit(defaultOptions);

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per minute
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  handler: (req: Request, res: Response) => {
    logger.warn({
      key: keyGenerator(req),
      path: req.path,
    }, 'Auth rate limit exceeded');
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later',
        retryAfter: 60,
      },
    });
  },
});

/**
 * AI generation rate limiter
 * 10 requests per minute for AI operations
 */
export const aiLimiter: RateLimitRequestHandler = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  handler: (req: Request, res: Response) => {
    logger.warn({
      key: keyGenerator(req),
      path: req.path,
    }, 'AI rate limit exceeded');
    res.status(429).json({
      success: false,
      error: {
        code: 'AI_RATE_LIMIT_EXCEEDED',
        message: 'Too many AI generation requests, please try again later',
        retryAfter: 60,
      },
    });
  },
});

/**
 * Upload rate limiter
 * 30 uploads per minute
 */
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  handler: (req: Request, res: Response) => {
    logger.warn({
      key: keyGenerator(req),
      path: req.path,
    }, 'Upload rate limit exceeded');
    res.status(429).json({
      success: false,
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many upload requests, please try again later',
        retryAfter: 60,
      },
    });
  },
});

/**
 * Marketplace browsing rate limiter
 * More lenient - 200 requests per minute
 */
export const browseLimiter: RateLimitRequestHandler = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 200,
});

/**
 * Create a custom rate limiter
 */
export function createLimiter(
  windowMs: number,
  max: number,
  message?: string
): RateLimitRequestHandler {
  return rateLimit({
    ...defaultOptions,
    windowMs,
    max,
    handler: (req: Request, res: Response) => {
      logger.warn({
        key: keyGenerator(req),
        path: req.path,
        windowMs,
        max,
      }, 'Custom rate limit exceeded');
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: message || 'Too many requests, please try again later',
          retryAfter: Math.ceil(windowMs / 1000),
        },
      });
    },
  });
}
