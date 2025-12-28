import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import {
  AppError,
  ValidationError,
} from '../utils/error-types.js';
import {
  formatErrorResponse,
  isOperationalError,
} from '../utils/AppErrors.js';
import { logger } from '../utils/logger.js';
import { isDevelopment } from '../config/env.js';

/**
 * Not found handler for unmatched routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

/**
 * Global error handler middleware
 * Must be registered last in the middleware chain
 */
export const errorHandler: ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Get request ID for tracing
  const requestId = req.headers['x-request-id'] as string | undefined;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError('Validation failed', {
      errors: error.flatten().fieldErrors,
    });

    logger.warn({
      requestId,
      path: req.path,
      errors: error.flatten().fieldErrors,
    }, 'Validation error');

    res.status(400).json(formatErrorResponse(validationError));
    return;
  }

  // Handle known application errors
  if (error instanceof AppError) {
    // Log operational errors at appropriate level
    if (error.statusCode >= 500) {
      logger.error({
        requestId,
        path: req.path,
        code: error.code,
        message: error.message,
        details: error.details,
        stack: isDevelopment ? error.stack : undefined,
      }, 'Application error');
    } else {
      logger.warn({
        requestId,
        path: req.path,
        code: error.code,
        message: error.message,
      }, 'Client error');
    }

    res.status(error.statusCode).json(formatErrorResponse(error));
    return;
  }

  // Handle syntax errors (e.g., malformed JSON)
  if (error instanceof SyntaxError && 'body' in error) {
    logger.warn({
      requestId,
      path: req.path,
      message: error.message,
    }, 'Syntax error in request body');

    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      },
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    logger.warn({
      requestId,
      path: req.path,
      errorName: error.name,
      message: error.message,
    }, 'JWT error');

    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      },
    });
    return;
  }

  // Log unexpected errors with full stack trace
  logger.error({
    requestId,
    path: req.path,
    method: req.method,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  }, 'Unexpected error');

  // Don't expose internal error details in production
  const response = isDevelopment
    ? {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        stack: error.stack?.split('\n'),
      },
    }
    : {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    };

  res.status(500).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle uncaught exceptions (should be minimal with proper error handling)
 */
export function setupUncaughtHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }, 'Uncaught exception');

    // Give time to log before exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({
      reason: reason instanceof Error
        ? { name: reason.name, message: reason.message, stack: reason.stack }
        : reason,
    }, 'Unhandled rejection');
  });
}

/**
 * Check if error is operational (expected) or programmer error
 */
export { isOperationalError };
