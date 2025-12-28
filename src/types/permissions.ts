/**
 * StickerNest v2 - Permission Types
 *
 * Defines the permission system for cross-user communication approval.
 * Permissions control who can send events/data to whom across canvas boundaries.
 *
 * Version: 1.0.0
 */

import { z } from 'zod';

/**
 * Permission scope - what type of communication is being permitted
 */
export const PermissionScopeSchema = z.enum([
    'event',           // Permission to send events
    'data',            // Permission to share data
    'widget-control',  // Permission to control widgets
    'canvas-access',   // Permission to access canvas
    'pipeline',        // Permission to trigger pipelines
    'all'              // Full permission (use with caution)
]);
export type PermissionScope = z.infer<typeof PermissionScopeSchema>;

/**
 * Permission target type - who/what is being granted permission
 */
export const PermissionTargetTypeSchema = z.enum([
    'user',            // Specific user
    'canvas',          // All users on a canvas
    'widget',          // Specific widget
    'device',          // All tabs on a device
    'public'           // Anyone (public canvas only)
]);
export type PermissionTargetType = z.infer<typeof PermissionTargetTypeSchema>;

/**
 * Permission status
 */
export const PermissionStatusSchema = z.enum([
    'pending',         // Awaiting approval
    'approved',        // Permission granted
    'denied',          // Permission denied
    'expired',         // Permission expired
    'revoked'          // Permission was revoked
]);
export type PermissionStatus = z.infer<typeof PermissionStatusSchema>;

/**
 * Permission request - a request for permission to communicate
 */
export const PermissionRequestSchema = z.object({
    /** Unique request ID */
    id: z.string(),

    /** Who is requesting (user ID) */
    requesterId: z.string(),

    /** Requester's display name */
    requesterName: z.string().optional(),

    /** Who is being requested (user ID or special target) */
    targetId: z.string(),

    /** Target type */
    targetType: PermissionTargetTypeSchema,

    /** What scope of permission is being requested */
    scope: PermissionScopeSchema,

    /** Specific event types being requested (if scope is 'event') */
    eventTypes: z.array(z.string()).optional(),

    /** Canvas ID context */
    canvasId: z.string().optional(),

    /** Widget ID context */
    widgetId: z.string().optional(),

    /** Request message/reason */
    message: z.string().optional(),

    /** When the request was made */
    createdAt: z.number(),

    /** When the request expires (auto-deny) */
    expiresAt: z.number().optional(),

    /** Current status */
    status: PermissionStatusSchema,

    /** When status was last updated */
    statusUpdatedAt: z.number().optional(),

    /** Response message (if denied) */
    responseMessage: z.string().optional()
});
export type PermissionRequest = z.infer<typeof PermissionRequestSchema>;

/**
 * Granted permission - an active permission grant
 */
export const PermissionGrantSchema = z.object({
    /** Unique grant ID */
    id: z.string(),

    /** Original request ID */
    requestId: z.string().optional(),

    /** Who granted the permission */
    granterId: z.string(),

    /** Granter's display name */
    granterName: z.string().optional(),

    /** Who was granted permission */
    granteeId: z.string(),

    /** Grantee's display name */
    granteeName: z.string().optional(),

    /** Target type */
    targetType: PermissionTargetTypeSchema,

    /** Permission scope */
    scope: PermissionScopeSchema,

    /** Specific event types permitted (if scope is 'event') */
    eventTypes: z.array(z.string()).optional(),

    /** Canvas ID context (if applicable) */
    canvasId: z.string().optional(),

    /** Widget ID context (if applicable) */
    widgetId: z.string().optional(),

    /** When the grant was created */
    createdAt: z.number(),

    /** When the grant expires (null = never) */
    expiresAt: z.number().nullable(),

    /** Whether grant is currently active */
    isActive: z.boolean(),

    /** Usage count */
    usageCount: z.number().default(0),

    /** Last used timestamp */
    lastUsedAt: z.number().optional(),

    /** Maximum uses (null = unlimited) */
    maxUses: z.number().nullable().optional(),

    /** Whether this is a bidirectional permission */
    bidirectional: z.boolean().default(false)
});
export type PermissionGrant = z.infer<typeof PermissionGrantSchema>;

/**
 * Permission rule - predefined rules for automatic permission handling
 */
export const PermissionRuleSchema = z.object({
    /** Rule ID */
    id: z.string(),

    /** Rule name for display */
    name: z.string(),

    /** Rule description */
    description: z.string().optional(),

    /** Whether rule is enabled */
    enabled: z.boolean(),

    /** Priority (higher = checked first) */
    priority: z.number().default(0),

    /** Action to take when rule matches */
    action: z.enum(['allow', 'deny', 'prompt']),

    /** Conditions for this rule */
    conditions: z.object({
        /** Match specific requesters (user IDs) */
        requesters: z.array(z.string()).optional(),

        /** Match specific scopes */
        scopes: z.array(PermissionScopeSchema).optional(),

        /** Match specific event types */
        eventTypes: z.array(z.string()).optional(),

        /** Match specific canvas IDs */
        canvasIds: z.array(z.string()).optional(),

        /** Match requests from same canvas */
        sameCanvas: z.boolean().optional(),

        /** Match requests from collaborators */
        isCollaborator: z.boolean().optional()
    }),

    /** When the rule was created */
    createdAt: z.number(),

    /** When the rule expires */
    expiresAt: z.number().optional()
});
export type PermissionRule = z.infer<typeof PermissionRuleSchema>;

/**
 * Permission check result
 */
export interface PermissionCheckResult {
    /** Whether permission is granted */
    allowed: boolean;

    /** The grant that allows (if any) */
    grant?: PermissionGrant;

    /** The rule that matched (if any) */
    rule?: PermissionRule;

    /** Reason for the decision */
    reason:
        | 'grant-exists'
        | 'rule-allow'
        | 'rule-deny'
        | 'self-permission'
        | 'same-device'
        | 'no-permission'
        | 'expired'
        | 'revoked'
        | 'max-uses-reached';

    /** Message for UI display */
    message?: string;
}

/**
 * Permission request parameters
 */
export interface RequestPermissionParams {
    /** Target user/entity ID */
    targetId: string;

    /** Target type */
    targetType: PermissionTargetType;

    /** Permission scope */
    scope: PermissionScope;

    /** Specific event types (if scope is 'event') */
    eventTypes?: string[];

    /** Canvas context */
    canvasId?: string;

    /** Widget context */
    widgetId?: string;

    /** Request message */
    message?: string;

    /** How long the request is valid (ms) */
    validFor?: number;
}

/**
 * Permission grant parameters
 */
export interface GrantPermissionParams {
    /** Request to approve (if from a request) */
    requestId?: string;

    /** Grantee user ID */
    granteeId: string;

    /** Permission scope */
    scope: PermissionScope;

    /** Specific event types permitted */
    eventTypes?: string[];

    /** Canvas context */
    canvasId?: string;

    /** Widget context */
    widgetId?: string;

    /** Grant duration (ms, null = forever) */
    duration?: number | null;

    /** Maximum uses */
    maxUses?: number | null;

    /** Whether to grant bidirectional permission */
    bidirectional?: boolean;
}

/**
 * Permission event types for the event system
 */
export type PermissionEventType =
    | 'permission:request'
    | 'permission:approved'
    | 'permission:denied'
    | 'permission:revoked'
    | 'permission:expired'
    | 'permission:updated';

/**
 * Permission event payload
 */
export interface PermissionEventPayload {
    type: PermissionEventType;
    request?: PermissionRequest;
    grant?: PermissionGrant;
    fromUserId: string;
    toUserId: string;
    timestamp: number;
}

/**
 * User permission preferences
 */
export interface PermissionPreferences {
    /** Default action for unknown requests */
    defaultAction: 'prompt' | 'deny';

    /** Auto-approve requests from collaborators */
    autoApproveCollaborators: boolean;

    /** Auto-approve requests on same canvas */
    autoApproveSameCanvas: boolean;

    /** Show notification for permission requests */
    showNotifications: boolean;

    /** Auto-deny requests after timeout (ms) */
    requestTimeout: number | null;

    /** Block list (user IDs) */
    blockedUsers: string[];

    /** Trust list (user IDs) - auto-approve */
    trustedUsers: string[];
}

/**
 * Default permission preferences
 */
export const DEFAULT_PERMISSION_PREFERENCES: PermissionPreferences = {
    defaultAction: 'prompt',
    autoApproveCollaborators: false,
    autoApproveSameCanvas: true,
    showNotifications: true,
    requestTimeout: 5 * 60 * 1000, // 5 minutes
    blockedUsers: [],
    trustedUsers: []
};

/**
 * Permission state for a user
 */
export interface PermissionState {
    /** Active grants given by this user */
    grantsGiven: PermissionGrant[];

    /** Active grants received by this user */
    grantsReceived: PermissionGrant[];

    /** Pending requests to this user */
    pendingRequests: PermissionRequest[];

    /** Requests made by this user */
    outgoingRequests: PermissionRequest[];

    /** Permission rules */
    rules: PermissionRule[];

    /** User preferences */
    preferences: PermissionPreferences;

    /** Last sync timestamp */
    lastSyncAt: number;
}

/**
 * Empty permission state
 */
export const EMPTY_PERMISSION_STATE: PermissionState = {
    grantsGiven: [],
    grantsReceived: [],
    pendingRequests: [],
    outgoingRequests: [],
    rules: [],
    preferences: DEFAULT_PERMISSION_PREFERENCES,
    lastSyncAt: 0
};
