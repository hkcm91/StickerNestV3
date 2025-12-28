import { AppError } from './error-types.js';

/**
 * Error response format for API
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Format an error for API response
 */
export function formatErrorResponse(error: AppError | Error): ErrorResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  // Generic error - don't expose internal details in production
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
    },
  };
}

/**
 * Check if an error is an operational error (expected)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler<T>(
  fn: (...args: T[]) => Promise<unknown>
): (...args: T[]) => Promise<unknown> {
  return (...args: T[]) => {
    return Promise.resolve(fn(...args)).catch((error) => {
      // Re-throw to be caught by error middleware
      throw error;
    });
  };
}

// Re-export types for convenience (optional, but helps backward compatibility if I update imports)
export * from './error-types.js';
