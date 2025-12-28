import { createRequire } from 'module';
import type * as pino from 'pino';
import { env, isDevelopment } from '../config/env.js';

const require = createRequire(import.meta.url);
const pinoVal = require('pino');

/**
 * Pino logger configuration
 */
const pinoConfig: pino.LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',

  // Add timestamp
  timestamp: pinoVal.stdTimeFunctions.isoTime,

  // Base fields included in all logs
  base: {
    pid: process.pid,
    env: env.NODE_ENV,
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },

  // Format options
  formatters: {
    level: (label: string) => ({ level: label }),
    bindings: (bindings: Record<string, unknown>) => ({
      pid: bindings.pid,
      host: bindings.hostname,
    }),
  },
};

/**
 * Transport configuration for development (pretty printing)
 */
const devTransport: pino.TransportSingleOptions = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
    messageFormat: '{msg}',
  },
};

/**
 * Create the logger instance
 */
export const logger = isDevelopment
  ? pinoVal(pinoConfig, pinoVal.transport(devTransport))
  : pinoVal(pinoConfig);

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}

/**
 * HTTP request logging configuration
 */
export const httpLoggerConfig = {
  /**
   * Request serializer - extracts relevant request info
   */
  reqSerializer: (req: {
    method: string;
    url: string;
    headers: Record<string, string>;
    remoteAddress?: string;
    id?: string;
  }) => ({
    method: req.method,
    url: req.url,
    remoteAddress: req.remoteAddress,
    requestId: req.id,
    userAgent: req.headers['user-agent'],
  }),

  /**
   * Response serializer - extracts relevant response info
   */
  resSerializer: (res: { statusCode: number }) => ({
    statusCode: res.statusCode,
  }),
};

/**
 * Log levels as constants for consistency
 */
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

export type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

/**
 * Structured logging helpers
 */
export const log = {
  /**
   * Log an info message with structured data
   */
  info: (message: string, data?: Record<string, unknown>) => {
    if (data) {
      logger.info(data, message);
    } else {
      logger.info(message);
    }
  },

  /**
   * Log a warning message
   */
  warn: (message: string, data?: Record<string, unknown>) => {
    if (data) {
      logger.warn(data, message);
    } else {
      logger.warn(message);
    }
  },

  /**
   * Log an error message
   */
  error: (message: string, error?: Error | Record<string, unknown>) => {
    if (error instanceof Error) {
      logger.error({ err: error }, message);
    } else if (error) {
      logger.error(error, message);
    } else {
      logger.error(message);
    }
  },

  /**
   * Log a debug message
   */
  debug: (message: string, data?: Record<string, unknown>) => {
    if (data) {
      logger.debug(data, message);
    } else {
      logger.debug(message);
    }
  },

  /**
   * Log a trace message (very verbose)
   */
  trace: (message: string, data?: Record<string, unknown>) => {
    if (data) {
      logger.trace(data, message);
    } else {
      logger.trace(message);
    }
  },

  /**
   * Log request start
   */
  request: (requestId: string, method: string, path: string) => {
    logger.info({ requestId, method, path }, `${method} ${path}`);
  },

  /**
   * Log request completion
   */
  response: (requestId: string, statusCode: number, durationMs: number) => {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger[level]({ requestId, statusCode, durationMs }, `Response ${statusCode} (${durationMs}ms)`);
  },

  /**
   * Log database operation
   */
  db: (operation: string, table: string, durationMs?: number) => {
    logger.debug({ operation, table, durationMs }, `DB: ${operation} on ${table}`);
  },

  /**
   * Log AI provider call
   */
  ai: (provider: string, model: string, operation: string, durationMs?: number) => {
    logger.info({ provider, model, operation, durationMs }, `AI: ${provider}/${model} ${operation}`);
  },

  /**
   * Log storage operation
   */
  storage: (operation: string, bucket: string, key: string) => {
    logger.debug({ operation, bucket, key }, `Storage: ${operation} ${bucket}/${key}`);
  },
};
