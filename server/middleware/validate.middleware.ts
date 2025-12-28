import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/AppErrors.js';

/**
 * Validation schema configuration
 */
interface ValidationConfig {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Format Zod errors into a readable format
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Middleware to validate request data against Zod schemas
 * Supports validating body, query, and params
 */
export function validate(config: ValidationConfig): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const errors: Record<string, Record<string, string[]>> = {};

      // Validate body
      if (config.body) {
        const result = await config.body.safeParseAsync(req.body);
        if (!result.success) {
          errors.body = formatZodErrors(result.error);
        } else {
          req.body = result.data;
        }
      }

      // Validate query
      if (config.query) {
        const result = await config.query.safeParseAsync(req.query);
        if (!result.success) {
          errors.query = formatZodErrors(result.error);
        } else {
          req.query = result.data;
        }
      }

      // Validate params
      if (config.params) {
        const result = await config.params.safeParseAsync(req.params);
        if (!result.success) {
          errors.params = formatZodErrors(result.error);
        } else {
          req.params = result.data;
        }
      }

      // If there are any errors, throw a validation error
      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Validation failed', { errors });
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        next(error);
      } else if (error instanceof ZodError) {
        next(new ValidationError('Validation failed', { errors: { body: formatZodErrors(error) } }));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Shorthand for validating only request body
 */
export function validateBody<T extends ZodSchema>(schema: T): RequestHandler {
  return validate({ body: schema });
}

/**
 * Shorthand for validating only query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T): RequestHandler {
  return validate({ query: schema });
}

/**
 * Shorthand for validating only route parameters
 */
export function validateParams<T extends ZodSchema>(schema: T): RequestHandler {
  return validate({ params: schema });
}

/**
 * Type helper to extract validated body type from schema
 */
export type ValidatedBody<T extends ZodSchema> = z.infer<T>;

/**
 * Type helper to extract validated query type from schema
 */
export type ValidatedQuery<T extends ZodSchema> = z.infer<T>;

/**
 * Type helper to extract validated params type from schema
 */
export type ValidatedParams<T extends ZodSchema> = z.infer<T>;

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * UUID validation
   */
  uuid: z.string().uuid(),

  /**
   * Pagination query parameters
   */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),

  /**
   * Sort query parameters
   */
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  /**
   * Canvas ID parameter
   */
  canvasIdParam: z.object({
    id: z.string().min(1),
  }),

  /**
   * Widget ID parameter
   */
  widgetIdParam: z.object({
    wid: z.string().min(1),
  }),

  /**
   * Canvas + Widget ID parameters
   */
  canvasWidgetParams: z.object({
    id: z.string().min(1),
    wid: z.string().min(1),
  }),
};
