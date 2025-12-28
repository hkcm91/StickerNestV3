import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { logger, log } from '../utils/logger.js';

/**
 * Extend Express Request with timing information
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Request logging middleware
 * Adds request ID and logs request/response
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate or use existing request ID
  const requestId = (req.headers['x-request-id'] as string) || nanoid(12);
  req.requestId = requestId;
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Log request start
  log.request(requestId, req.method, req.path);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    log.response(requestId, res.statusCode, duration);
  });

  // Log if connection is closed prematurely
  res.on('close', () => {
    if (!res.writableEnded) {
      logger.warn({
        requestId,
        method: req.method,
        path: req.path,
      }, 'Connection closed before response completed');
    }
  });

  next();
}

/**
 * Skip logging for certain paths
 */
const skipPaths = new Set([
  '/health',
  '/api/health',
  '/favicon.ico',
]);

/**
 * Request logging middleware with path filtering
 */
export function requestLoggerWithFilter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip logging for certain paths
  if (skipPaths.has(req.path)) {
    const requestId = (req.headers['x-request-id'] as string) || nanoid(12);
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    return next();
  }

  return requestLogger(req, res, next);
}

/**
 * Detailed request body logging (use carefully - may log sensitive data)
 */
export function bodyLogger(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug({
      requestId: req.requestId,
      body: req.body,
    }, 'Request body');
  }

  next();
}

/**
 * Log slow requests
 */
export function slowRequestLogger(thresholdMs: number = 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      if (duration > thresholdMs) {
        logger.warn({
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          duration,
          threshold: thresholdMs,
        }, 'Slow request detected');
      }
    });

    next();
  };
}

/**
 * Create a child logger for a specific module
 */
export function createModuleLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
