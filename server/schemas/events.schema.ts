import { z } from 'zod';

/**
 * Event source type - matches frontend RuntimeMessage source
 */
export const eventSourceTypeSchema = z.enum(['tab', 'worker', 'server', 'service-worker']);

/**
 * Event target type - matches frontend RuntimeMessage target
 */
export const eventTargetTypeSchema = z.enum(['broadcast', 'specific', 'pipeline', 'widget', 'canvas']);

/**
 * Event channel - matches frontend RuntimeMessage channel
 */
export const eventChannelSchema = z.enum([
  'events',
  'state',
  'presence',
  'cursor',
  'debug',
  'pipeline',
  'system',
  'ai',
  'permissions',
]);

/**
 * Event identity schema - matches RuntimeMessageIdentity
 */
export const eventIdentitySchema = z.object({
  deviceId: z.string(),
  tabId: z.string(),
  sessionId: z.string(),
  userId: z.string().optional(),
  canvasId: z.string().optional(),
});

/**
 * Loop guard schema
 */
export const loopGuardSchema = z.object({
  seenBy: z.array(z.string()),
  originTimestamp: z.number(),
  hopCount: z.number(),
});

/**
 * Create event record schema - matches RuntimeMessage format
 */
export const createEventSchema = z.object({
  // Core fields
  type: z.string().min(1, 'Event type is required'),
  channel: eventChannelSchema.default('events'),
  payload: z.any(),

  // Source info
  source: eventSourceTypeSchema.default('server'),
  sourceId: z.string().optional(),

  // Target info
  target: eventTargetTypeSchema.default('broadcast'),
  targetId: z.string().optional(),

  // Identity
  identity: eventIdentitySchema.optional(),

  // Loop guard
  loopGuard: loopGuardSchema.optional(),

  // Optional fields
  requestId: z.string().optional(),
  responseToId: z.string().optional(),
  ttl: z.number().optional(),
  priority: z.number().optional(),
  requiresAck: z.boolean().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Event query schema
 */
export const eventQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
  type: z.string().optional(),
  channel: eventChannelSchema.optional(),
  sourceType: eventSourceTypeSchema.optional(),
  sourceUserId: z.string().optional(),
  since: z.coerce.date().optional(),
  until: z.coerce.date().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type EventQuery = z.infer<typeof eventQuerySchema>;

/**
 * Canvas ID parameter for events
 */
export const eventCanvasIdParamSchema = z.object({
  canvasId: z.string().min(1, 'Canvas ID is required'),
});

/**
 * Event response schema
 */
export const eventResponseSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  eventType: z.string(),
  channel: z.string(),
  payload: z.any(),
  sourceType: z.string().nullable(),
  sourceId: z.string().nullable(),
  sourceUserId: z.string().nullable(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  timestamp: z.string().datetime(),
});

export type EventResponse = z.infer<typeof eventResponseSchema>;

/**
 * Event list response
 */
export const eventListResponseSchema = z.object({
  success: z.literal(true),
  events: z.array(eventResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type EventListResponse = z.infer<typeof eventListResponseSchema>;
