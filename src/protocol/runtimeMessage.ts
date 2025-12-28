/**
 * StickerNest v2 - Runtime Message Protocol
 *
 * This is the canonical wire protocol for ALL inter-context communication:
 * - tab ↔ tab (BroadcastChannel)
 * - tab ↔ SharedWorker
 * - tab ↔ WebSocket server
 * - server ↔ tab
 *
 * This is SEPARATE from:
 * - Widget ↔ Host sandbox messages (postMessage bridge)
 * - EventBus event envelopes (canvas-scoped)
 * - Manifest definitions (static)
 * - Pipeline events (data flow)
 *
 * Version: 1.0.0
 */

import { z } from 'zod';

/**
 * Message source - where the message originated
 */
export const RuntimeMessageSourceSchema = z.enum([
    'tab',           // Browser tab runtime
    'worker',        // SharedWorker
    'server',        // WebSocket server
    'service-worker' // Service worker (future)
]);
export type RuntimeMessageSource = z.infer<typeof RuntimeMessageSourceSchema>;

/**
 * Message target - where the message should be delivered
 */
export const RuntimeMessageTargetSchema = z.enum([
    'broadcast',     // All contexts should receive
    'specific',      // Specific tab/worker (use targetId)
    'pipeline',      // Pipeline system only
    'widget',        // Specific widget instance
    'canvas'         // Canvas-level (all widgets on canvas)
]);
export type RuntimeMessageTarget = z.infer<typeof RuntimeMessageTargetSchema>;

/**
 * Message channel - categorization for routing and filtering
 */
export const RuntimeMessageChannelSchema = z.enum([
    'events',        // Widget/canvas events
    'state',         // State synchronization
    'presence',      // User/tab presence updates
    'cursor',        // Cursor position sync (collaboration)
    'debug',         // Debug/trace information
    'pipeline',      // Pipeline configuration updates
    'system',        // System-level messages (heartbeat, etc.)
    'ai',            // AI service messages
    'permissions'    // Cross-user permission requests and grants
]);
export type RuntimeMessageChannel = z.infer<typeof RuntimeMessageChannelSchema>;

/**
 * Identity information embedded in every message
 */
export const RuntimeMessageIdentitySchema = z.object({
    deviceId: z.string(),     // Persistent per device (localStorage)
    tabId: z.string(),        // Persistent per tab lifetime
    sessionId: z.string(),    // Per runtime load
    userId: z.string().optional(), // If authenticated
    canvasId: z.string().optional() // Current canvas context
});
export type RuntimeMessageIdentity = z.infer<typeof RuntimeMessageIdentitySchema>;

/**
 * Loop guard - tracks which contexts have seen this message
 * CRITICAL for preventing infinite loops in multi-context systems
 */
export const LoopGuardSchema = z.object({
    seenBy: z.array(z.string()),  // Array of tabIds that have processed this message
    originTimestamp: z.number(),   // When the message was first created
    hopCount: z.number().default(0) // Number of times message has been forwarded
});
export type LoopGuard = z.infer<typeof LoopGuardSchema>;

/**
 * The canonical RuntimeMessage envelope
 *
 * Every message passing between contexts MUST use this format.
 */
export const RuntimeMessageSchema = z.object({
    /** Protocol version - for future compatibility */
    v: z.literal(1),

    /** Unique message ID */
    id: z.string(),

    /** Where the message originated */
    source: RuntimeMessageSourceSchema,

    /** Where the message should be delivered */
    target: RuntimeMessageTargetSchema,

    /** Target ID (for 'specific' or 'widget' targets) */
    targetId: z.string().optional(),

    /** Message channel for routing */
    channel: RuntimeMessageChannelSchema,

    /** Message type (e.g., "emit_event", "state_update", "trace") */
    type: z.string(),

    /** Message payload - any serializable data */
    payload: z.any(),

    /** When the message was created */
    timestamp: z.number(),

    /** Identity of the sender */
    identity: RuntimeMessageIdentitySchema,

    /** Loop guard for preventing infinite loops */
    loopGuard: LoopGuardSchema,

    /** Request ID for round-trip messaging (request/response patterns) */
    requestId: z.string().optional(),

    /** Response to a previous request */
    responseToId: z.string().optional(),

    /** Time-to-live in milliseconds (message expires after this) */
    ttl: z.number().optional(),

    /** Priority level (higher = more important) */
    priority: z.number().default(0),

    /** Whether this message requires acknowledgment */
    requiresAck: z.boolean().default(false)
});
export type RuntimeMessage = z.infer<typeof RuntimeMessageSchema>;

/**
 * Validate a RuntimeMessage
 * Returns { success: true, data: RuntimeMessage } or { success: false, error: ZodError }
 */
export function validateRuntimeMessage(data: unknown) {
    return RuntimeMessageSchema.safeParse(data);
}

/**
 * Create a new RuntimeMessage with required fields
 */
export function createRuntimeMessage(
    params: {
        source: RuntimeMessageSource;
        target: RuntimeMessageTarget;
        channel: RuntimeMessageChannel;
        type: string;
        payload: unknown;
        identity: RuntimeMessageIdentity;
        targetId?: string;
        requestId?: string;
        responseToId?: string;
        ttl?: number;
        priority?: number;
        requiresAck?: boolean;
    }
): RuntimeMessage {
    const now = Date.now();
    return {
        v: 1,
        id: generateMessageId(),
        source: params.source,
        target: params.target,
        targetId: params.targetId,
        channel: params.channel,
        type: params.type,
        payload: params.payload,
        timestamp: now,
        identity: params.identity,
        loopGuard: {
            seenBy: [params.identity.tabId],
            originTimestamp: now,
            hopCount: 0
        },
        requestId: params.requestId,
        responseToId: params.responseToId,
        ttl: params.ttl,
        priority: params.priority ?? 0,
        requiresAck: params.requiresAck ?? false
    };
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
    return `msg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Check if a message should be processed by this context
 * Returns false if this context has already seen the message (loop prevention)
 */
export function shouldProcessMessage(message: RuntimeMessage, currentTabId: string): boolean {
    // Already seen by this tab - skip
    if (message.loopGuard.seenBy.includes(currentTabId)) {
        return false;
    }

    // Check TTL expiration
    if (message.ttl && (Date.now() - message.loopGuard.originTimestamp) > message.ttl) {
        return false;
    }

    // Check hop limit (prevent runaway messages)
    if (message.loopGuard.hopCount > 10) {
        console.warn('[RuntimeMessage] Message exceeded hop limit:', message.id);
        return false;
    }

    return true;
}

/**
 * Mark a message as seen by this context (for forwarding)
 * Returns a new message with updated loopGuard
 */
export function markMessageSeen(message: RuntimeMessage, tabId: string): RuntimeMessage {
    return {
        ...message,
        loopGuard: {
            ...message.loopGuard,
            seenBy: [...message.loopGuard.seenBy, tabId],
            hopCount: message.loopGuard.hopCount + 1
        }
    };
}

/**
 * Standard message types used across the system
 */
export const RuntimeMessageTypes = {
    // Event system
    EMIT_EVENT: 'emit_event',
    EVENT_ACK: 'event_ack',

    // State sync
    STATE_UPDATE: 'state_update',
    STATE_REQUEST: 'state_request',
    STATE_RESPONSE: 'state_response',
    STATE_CONFLICT: 'state_conflict',

    // Presence
    PRESENCE_JOIN: 'presence_join',
    PRESENCE_LEAVE: 'presence_leave',
    PRESENCE_UPDATE: 'presence_update',
    PRESENCE_LIST: 'presence_list',

    // Cursor (collaboration)
    CURSOR_MOVE: 'cursor_move',
    CURSOR_HIDE: 'cursor_hide',

    // Debug
    TRACE: 'trace',
    LOG: 'log',
    ERROR: 'error',

    // System
    HEARTBEAT: 'heartbeat',
    HEARTBEAT_ACK: 'heartbeat_ack',
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',

    // Pipeline
    PIPELINE_UPDATE: 'pipeline_update',
    PIPELINE_EXECUTE: 'pipeline_execute',

    // AI
    AI_REQUEST: 'ai_request',
    AI_RESPONSE: 'ai_response',
    AI_STREAM: 'ai_stream',

    // Permissions
    PERMISSION_REQUEST: 'permission_request',
    PERMISSION_APPROVED: 'permission_approved',
    PERMISSION_DENIED: 'permission_denied',
    PERMISSION_REVOKED: 'permission_revoked',
    PERMISSION_CHECK: 'permission_check'
} as const;

export type RuntimeMessageType = typeof RuntimeMessageTypes[keyof typeof RuntimeMessageTypes];
