/**
 * Middleware exports
 */

// Authentication
export {
  authenticate,
  optionalAuth,
  generateTokens,
  verifyRefreshToken,
  requireOwnership,
  decodeToken,
  type AuthUser,
  type AccessTokenPayload,
  type RefreshTokenPayload,
} from './auth.middleware.js';

// Rate limiting
export {
  defaultLimiter,
  authLimiter,
  aiLimiter,
  uploadLimiter,
  browseLimiter,
  createLimiter,
} from './rateLimit.middleware.js';

// Validation
export {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas,
  type ValidatedBody,
  type ValidatedQuery,
  type ValidatedParams,
} from './validate.middleware.js';

// CORS
export {
  corsMiddleware,
  simpleCorsOptions,
  createCorsMiddleware,
  handlePreflight,
} from './cors.middleware.js';

// Error handling
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  setupUncaughtHandlers,
} from './error.middleware.js';

// Logging
export {
  requestLogger,
  requestLoggerWithFilter,
  bodyLogger,
  slowRequestLogger,
  createModuleLogger,
} from './logger.middleware.js';
