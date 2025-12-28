import { z } from 'zod';

/**
 * WebSocket Message Validation Schemas
 *
 * SECURITY: These schemas validate incoming WebSocket messages and filter
 * out sensitive fields that should never be broadcast to other users.
 */

// ============================================================================
// SENSITIVE FIELD PATTERNS
// ============================================================================

/**
 * Fields that should NEVER be transmitted in widget state
 * These patterns are checked recursively in nested objects
 */
export const SENSITIVE_FIELD_PATTERNS = [
  // Authentication & credentials
  /^password$/i,
  /^passwd$/i,
  /^secret$/i,
  /^apiKey$/i,
  /^api_key$/i,
  /^accessToken$/i,
  /^access_token$/i,
  /^refreshToken$/i,
  /^refresh_token$/i,
  /^authToken$/i,
  /^auth_token$/i,
  /^bearer$/i,
  /^jwt$/i,
  /^token$/i,
  /^credential/i,
  /^privateKey$/i,
  /^private_key$/i,

  // Personal data
  /^ssn$/i,
  /^socialSecurity/i,
  /^social_security/i,
  /^creditCard/i,
  /^credit_card/i,
  /^cardNumber$/i,
  /^card_number$/i,
  /^cvv$/i,
  /^cvc$/i,
  /^pin$/i,
  /^bankAccount/i,
  /^bank_account/i,
  /^routingNumber/i,
  /^routing_number$/i,

  // Internal fields that shouldn't sync
  /^_internal/,
  /^_private/,
  /^_transient/,
  /^__/,  // Double underscore prefix
];

/**
 * Maximum depth for recursive filtering (prevent stack overflow)
 */
const MAX_FILTER_DEPTH = 10;

/**
 * Maximum size for widget state (prevent DoS via large payloads)
 */
export const MAX_STATE_SIZE_BYTES = 1024 * 1024; // 1MB

/**
 * Check if a field name matches any sensitive pattern
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Recursively filter sensitive fields from an object
 * Returns a new object with sensitive fields removed
 */
export function filterSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  depth = 0
): T {
  if (depth > MAX_FILTER_DEPTH) {
    return {} as T; // Prevent infinite recursion
  }

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null
        ? filterSensitiveFields(item as Record<string, unknown>, depth + 1)
        : item
    ) as unknown as T;
  }

  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip sensitive fields
    if (isSensitiveField(key)) {
      continue;
    }

    // Recursively filter nested objects
    if (value !== null && typeof value === 'object') {
      filtered[key] = filterSensitiveFields(
        value as Record<string, unknown>,
        depth + 1
      );
    } else {
      filtered[key] = value;
    }
  }

  return filtered as T;
}

// ============================================================================
// WEBSOCKET MESSAGE SCHEMAS
// ============================================================================

/**
 * Position schema
 */
const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

/**
 * Dimensions schema
 */
const dimensionsSchema = z.object({
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
});

/**
 * Widget state schema with size limit
 * Note: We use z.record() but apply additional filtering for sensitive fields
 */
const widgetStateSchema = z.record(z.unknown()).refine(
  (state) => {
    const size = JSON.stringify(state).length;
    return size <= MAX_STATE_SIZE_BYTES;
  },
  { message: `Widget state exceeds maximum size of ${MAX_STATE_SIZE_BYTES} bytes` }
);

/**
 * Widget changes schema (for updates)
 */
const widgetChangesSchema = z.record(z.unknown()).refine(
  (changes) => {
    const size = JSON.stringify(changes).length;
    return size <= MAX_STATE_SIZE_BYTES;
  },
  { message: `Widget changes exceeds maximum size of ${MAX_STATE_SIZE_BYTES} bytes` }
);

/**
 * Canvas ID schema
 */
const canvasIdSchema = z.string().min(1).max(100);

/**
 * Widget ID schema
 */
const widgetIdSchema = z.string().min(1).max(100);

/**
 * Message ID schema (optional)
 */
const messageIdSchema = z.string().max(100).optional();

// ============================================================================
// INCOMING MESSAGE SCHEMAS
// ============================================================================

/**
 * Widget create message
 */
export const wsWidgetCreateSchema = z.object({
  type: z.literal('widget:create'),
  id: messageIdSchema,
  canvasId: canvasIdSchema,
  widget: z.object({
    id: widgetIdSchema,
    widgetDefId: z.string().min(1).max(200),
    version: z.string().max(50),
    position: positionSchema,
    width: z.number().positive().max(10000),
    height: z.number().positive().max(10000),
    zIndex: z.number().int().min(-1000).max(10000),
    state: widgetStateSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Widget update message
 */
export const wsWidgetUpdateSchema = z.object({
  type: z.literal('widget:update'),
  id: messageIdSchema,
  canvasId: canvasIdSchema,
  widgetId: widgetIdSchema,
  changes: widgetChangesSchema,
});

/**
 * Widget delete message
 */
export const wsWidgetDeleteSchema = z.object({
  type: z.literal('widget:delete'),
  id: messageIdSchema,
  canvasId: canvasIdSchema,
  widgetId: widgetIdSchema,
});

/**
 * Widget move message
 */
export const wsWidgetMoveSchema = z.object({
  type: z.literal('widget:move'),
  id: messageIdSchema,
  canvasId: canvasIdSchema,
  widgetId: widgetIdSchema,
  position: positionSchema,
});

/**
 * Widget resize message
 */
export const wsWidgetResizeSchema = z.object({
  type: z.literal('widget:resize'),
  id: messageIdSchema,
  canvasId: canvasIdSchema,
  widgetId: widgetIdSchema,
  dimensions: dimensionsSchema,
});

/**
 * Widget state message
 */
export const wsWidgetStateSchema = z.object({
  type: z.literal('widget:state'),
  id: messageIdSchema,
  canvasId: canvasIdSchema,
  widgetId: widgetIdSchema,
  state: widgetStateSchema,
  partial: z.boolean().optional(),
});

/**
 * Widget batch message
 */
export const wsWidgetBatchSchema = z.object({
  type: z.literal('widget:batch'),
  id: messageIdSchema,
  canvasId: canvasIdSchema,
  updates: z.array(z.object({
    widgetId: widgetIdSchema,
    changes: widgetChangesSchema,
  })).max(100), // Limit batch size
});

/**
 * Canvas update message
 */
export const wsCanvasUpdateSchema = z.object({
  type: z.literal('canvas:update'),
  id: messageIdSchema,
  canvasId: canvasIdSchema,
  changes: z.object({
    name: z.string().max(200).optional(),
    backgroundConfig: z.unknown().optional(),
    settings: z.unknown().optional(),
    version: z.number().int().optional(),
  }),
});

/**
 * Map of message types to their schemas
 */
export const WS_MESSAGE_SCHEMAS = {
  'widget:create': wsWidgetCreateSchema,
  'widget:update': wsWidgetUpdateSchema,
  'widget:delete': wsWidgetDeleteSchema,
  'widget:move': wsWidgetMoveSchema,
  'widget:resize': wsWidgetResizeSchema,
  'widget:state': wsWidgetStateSchema,
  'widget:batch': wsWidgetBatchSchema,
  'canvas:update': wsCanvasUpdateSchema,
} as const;

export type WSMessageSchemaType = keyof typeof WS_MESSAGE_SCHEMAS;

/**
 * Validate a WebSocket message and filter sensitive fields
 * Returns the validated and sanitized message, or null if invalid
 */
export function validateAndSanitizeWSMessage(
  type: string,
  message: unknown
): { success: true; data: unknown } | { success: false; error: string } {
  const schema = WS_MESSAGE_SCHEMAS[type as WSMessageSchemaType];

  if (!schema) {
    // Unknown message types pass through without validation
    // (handled by other parts of the system)
    return { success: true, data: message };
  }

  const result = schema.safeParse(message);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map(i => i.message).join(', ')
    };
  }

  // Filter sensitive fields from state/changes
  const sanitized = sanitizeMessage(result.data);

  return { success: true, data: sanitized };
}

/**
 * Sanitize a validated message by removing sensitive fields
 */
function sanitizeMessage(message: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...message };

  // Filter widget state
  if ('widget' in sanitized && typeof sanitized.widget === 'object' && sanitized.widget !== null) {
    const widget = sanitized.widget as Record<string, unknown>;
    if ('state' in widget && typeof widget.state === 'object' && widget.state !== null) {
      widget.state = filterSensitiveFields(widget.state as Record<string, unknown>);
    }
    if ('metadata' in widget && typeof widget.metadata === 'object' && widget.metadata !== null) {
      widget.metadata = filterSensitiveFields(widget.metadata as Record<string, unknown>);
    }
  }

  // Filter changes
  if ('changes' in sanitized && typeof sanitized.changes === 'object' && sanitized.changes !== null) {
    sanitized.changes = filterSensitiveFields(sanitized.changes as Record<string, unknown>);
  }

  // Filter state
  if ('state' in sanitized && typeof sanitized.state === 'object' && sanitized.state !== null) {
    sanitized.state = filterSensitiveFields(sanitized.state as Record<string, unknown>);
  }

  // Filter batch updates
  if ('updates' in sanitized && Array.isArray(sanitized.updates)) {
    sanitized.updates = sanitized.updates.map((update: Record<string, unknown>) => ({
      ...update,
      changes: update.changes && typeof update.changes === 'object'
        ? filterSensitiveFields(update.changes as Record<string, unknown>)
        : update.changes,
    }));
  }

  return sanitized;
}
