/**
 * StickerNest v2 - Sync Policies
 *
 * Defines the rules for when state/events may or may not sync across contexts.
 * This is a REQUIRED contract before implementing any cross-context communication.
 *
 * Without these policies:
 * - Events will loop infinitely
 * - State will conflict unpredictably
 * - Users will see inconsistent data
 *
 * Version: 1.0.0
 */

import { z } from 'zod';

/**
 * Sync scope - where changes should propagate
 */
export const SyncScopeSchema = z.enum([
    'local',           // Only this tab
    'device',          // All tabs on this device (BroadcastChannel/SharedWorker)
    'user',            // All devices for this user (WebSocket)
    'canvas',          // All users viewing this canvas (WebSocket)
    'global'           // Everyone (rarely used)
]);
export type SyncScope = z.infer<typeof SyncScopeSchema>;

/**
 * Conflict resolution strategy
 */
export const ConflictStrategySchema = z.enum([
    'last-write-wins',    // Latest timestamp wins
    'first-write-wins',   // First timestamp wins
    'server-authority',   // Server/SharedWorker decides
    'merge',              // Attempt to merge changes (CRDT-like)
    'manual',             // Notify user of conflict
    'discard-remote'      // Local changes always win
]);
export type ConflictStrategy = z.infer<typeof ConflictStrategySchema>;

/**
 * Event sync policy
 */
export const EventSyncPolicySchema = z.object({
    /** Whether this event type should sync across tabs */
    syncAcrossTabs: z.boolean(),

    /** Whether this event type should sync across devices */
    syncAcrossDevices: z.boolean(),

    /** Whether this event should sync to other users on the same canvas */
    syncToCanvasUsers: z.boolean(),

    /** Throttle interval in ms (0 = no throttle) */
    throttleMs: z.number().default(0),

    /** Whether to batch multiple events of this type */
    batchable: z.boolean().default(false),

    /** Priority for ordering (higher = first) */
    priority: z.number().default(0)
});
export type EventSyncPolicy = z.infer<typeof EventSyncPolicySchema>;

/**
 * State sync policy
 */
export const StateSyncPolicySchema = z.object({
    /** Whether this state should sync */
    enabled: z.boolean(),

    /** Sync scope */
    scope: SyncScopeSchema,

    /** How to resolve conflicts */
    conflictStrategy: ConflictStrategySchema,

    /** Throttle interval in ms for state updates */
    throttleMs: z.number().default(100),

    /** Whether the SharedWorker is the authority */
    workerAuthority: z.boolean().default(false),

    /** Fields that should NEVER sync (sensitive data) */
    excludeFields: z.array(z.string()).default([]),

    /** Fields that require merge instead of overwrite */
    mergeFields: z.array(z.string()).default([])
});
export type StateSyncPolicy = z.infer<typeof StateSyncPolicySchema>;

/**
 * Default event sync policies by event type pattern
 */
export const DEFAULT_EVENT_POLICIES: Record<string, EventSyncPolicy> = {
    // Widget events - sync across tabs on same device
    'widget:*': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 5
    },

    // Canvas events - sync across tabs
    'canvas:*': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 10
    },

    // Pipeline events - sync across tabs
    'pipeline:*': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 8
    },

    // Project ecosystem events - sync across tabs
    'project:*': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 5
    },

    // Timer events - sync across tabs
    'timer:*': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 5
    },

    // Notes events - sync across tabs
    'notes:*': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 5
    },

    // Cursor events - high frequency, throttled, sync to canvas users
    'cursor:*': {
        syncAcrossTabs: false,
        syncAcrossDevices: false,
        syncToCanvasUsers: true,
        throttleMs: 50, // Max 20 updates/second
        batchable: false,
        priority: 1
    },

    // Presence events - sync to canvas users
    'presence:*': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: true,
        throttleMs: 1000, // Max 1 update/second
        batchable: false,
        priority: 3
    },

    // AI events - DO NOT sync (contains sensitive/expensive data)
    'ai:*': {
        syncAcrossTabs: false,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 2
    },

    // Debug events - DO NOT sync
    'debug:*': {
        syncAcrossTabs: false,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 0
    },

    // Internal bridge events - NEVER sync
    'bridge:*': {
        syncAcrossTabs: false,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 0
    },

    // Permission events - sync to canvas users for cross-user approval
    'permission:*': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: true,
        throttleMs: 0,
        batchable: false,
        priority: 9  // High priority for permission requests
    },

    // Permission request events - must reach target user
    'permission:request': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: true,
        throttleMs: 0,
        batchable: false,
        priority: 10  // Highest priority
    },

    // Permission response events
    'permission:approved': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: true,
        throttleMs: 0,
        batchable: false,
        priority: 10
    },

    'permission:denied': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: true,
        throttleMs: 0,
        batchable: false,
        priority: 10
    },

    'permission:revoked': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: true,
        throttleMs: 0,
        batchable: false,
        priority: 10
    },

    // ==========================================================================
    // SOCIAL EVENTS - Cross-tab and cross-canvas communication
    // ==========================================================================

    // Social events wildcard - sync across tabs by default
    'social:*': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 6
    },

    // Chat messages - sync across tabs AND canvas users for real-time chat
    'social:chat-message': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: true,
        throttleMs: 0,
        batchable: false,
        priority: 8
    },

    // Chat message new (from SocialEventBridge)
    'social:chat-message-new': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: true,
        throttleMs: 0,
        batchable: false,
        priority: 8
    },

    // Typing indicators - sync to canvas users, throttled
    'social:chat-typing': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: true,
        throttleMs: 500,
        batchable: false,
        priority: 2
    },

    'social:typing-start': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: true,
        throttleMs: 500,
        batchable: false,
        priority: 2
    },

    'social:typing-stop': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: true,
        throttleMs: 0,
        batchable: false,
        priority: 2
    },

    // Activity feed - sync across tabs
    'social:activity-new': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: true,
        priority: 4
    },

    // Notifications - sync across devices for user
    'social:notification-new': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 7
    },

    // Comments - sync to canvas users
    'social:comment-new': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: true,
        throttleMs: 0,
        batchable: false,
        priority: 5
    },

    // Follow events - sync across devices
    'social:follow-new': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 4
    },

    'social:unfollow': {
        syncAcrossTabs: true,
        syncAcrossDevices: true,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 4
    },

    // Online status - sync across tabs
    'social:online-status-changed': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 1000,
        batchable: false,
        priority: 3
    },

    // Friends loaded - local only (initial load)
    'social:friends-loaded': {
        syncAcrossTabs: false,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 3
    },

    // Current user info - sync across tabs
    'social:current-user': {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 5
    }
};

/**
 * Default state sync policies by state type
 */
export const DEFAULT_STATE_POLICIES: Record<string, StateSyncPolicy> = {
    // Canvas document - authoritative sync
    'canvas': {
        enabled: true,
        scope: 'canvas',
        conflictStrategy: 'last-write-wins',
        throttleMs: 200,
        workerAuthority: true,
        excludeFields: [],
        mergeFields: ['widgets', 'pipelines']
    },

    // Widget state - sync across tabs on same device
    'widget': {
        enabled: true,
        scope: 'device',
        conflictStrategy: 'last-write-wins',
        throttleMs: 100,
        workerAuthority: false,
        excludeFields: ['_internal', '_transient'],
        mergeFields: []
    },

    // Pipeline configuration - sync across tabs
    'pipeline': {
        enabled: true,
        scope: 'device',
        conflictStrategy: 'server-authority',
        throttleMs: 500,
        workerAuthority: true,
        excludeFields: [],
        mergeFields: ['connections']
    },

    // User preferences - sync across devices
    'preferences': {
        enabled: true,
        scope: 'user',
        conflictStrategy: 'merge',
        throttleMs: 1000,
        workerAuthority: false,
        excludeFields: ['_cache'],
        mergeFields: ['themes', 'shortcuts']
    },

    // Session state - DO NOT sync
    'session': {
        enabled: false,
        scope: 'local',
        conflictStrategy: 'discard-remote',
        throttleMs: 0,
        workerAuthority: false,
        excludeFields: [],
        mergeFields: []
    }
};

/**
 * Get event sync policy for a given event type
 * Uses pattern matching (e.g., "project:task-created" matches "project:*")
 */
export function getEventPolicy(eventType: string): EventSyncPolicy {
    // Try exact match first
    if (eventType in DEFAULT_EVENT_POLICIES) {
        return DEFAULT_EVENT_POLICIES[eventType];
    }

    // Try pattern match (namespace:*)
    const namespace = eventType.split(':')[0];
    const pattern = `${namespace}:*`;
    if (pattern in DEFAULT_EVENT_POLICIES) {
        return DEFAULT_EVENT_POLICIES[pattern];
    }

    // Default: sync across tabs only
    return {
        syncAcrossTabs: true,
        syncAcrossDevices: false,
        syncToCanvasUsers: false,
        throttleMs: 0,
        batchable: false,
        priority: 5
    };
}

/**
 * Get state sync policy for a given state type
 */
export function getStatePolicy(stateType: string): StateSyncPolicy {
    if (stateType in DEFAULT_STATE_POLICIES) {
        return DEFAULT_STATE_POLICIES[stateType];
    }

    // Default: local only
    return {
        enabled: false,
        scope: 'local',
        conflictStrategy: 'discard-remote',
        throttleMs: 0,
        workerAuthority: false,
        excludeFields: [],
        mergeFields: []
    };
}

/**
 * Check if an event should sync to a specific scope
 */
export function shouldSyncEvent(eventType: string, scope: SyncScope): boolean {
    const policy = getEventPolicy(eventType);

    switch (scope) {
        case 'local':
            return false; // Never sync local-only
        case 'device':
            return policy.syncAcrossTabs;
        case 'user':
            return policy.syncAcrossDevices;
        case 'canvas':
            return policy.syncToCanvasUsers;
        case 'global':
            return policy.syncToCanvasUsers; // Same as canvas for now
        default:
            return false;
    }
}

/**
 * Check if state should sync
 */
export function shouldSyncState(stateType: string, targetScope: SyncScope): boolean {
    const policy = getStatePolicy(stateType);

    if (!policy.enabled) return false;

    // Check if target scope is within the policy's scope
    const scopePriority: Record<SyncScope, number> = {
        'local': 0,
        'device': 1,
        'user': 2,
        'canvas': 3,
        'global': 4
    };

    return scopePriority[targetScope] <= scopePriority[policy.scope];
}

/**
 * Filter out excluded fields from state before syncing
 */
export function filterStateForSync<T extends Record<string, unknown>>(
    state: T,
    stateType: string
): T {
    const policy = getStatePolicy(stateType);
    if (policy.excludeFields.length === 0) return state;

    const filtered = { ...state };
    for (const field of policy.excludeFields) {
        delete (filtered as Record<string, unknown>)[field];
    }
    return filtered;
}

/**
 * Sync policy registry for custom policies
 */
class SyncPolicyRegistry {
    private eventPolicies: Map<string, EventSyncPolicy> = new Map();
    private statePolicies: Map<string, StateSyncPolicy> = new Map();

    /**
     * Register a custom event policy
     */
    registerEventPolicy(pattern: string, policy: EventSyncPolicy): void {
        this.eventPolicies.set(pattern, policy);
    }

    /**
     * Register a custom state policy
     */
    registerStatePolicy(stateType: string, policy: StateSyncPolicy): void {
        this.statePolicies.set(stateType, policy);
    }

    /**
     * Get event policy (checks custom first, then defaults)
     */
    getEventPolicy(eventType: string): EventSyncPolicy {
        // Check custom policies first
        if (this.eventPolicies.has(eventType)) {
            return this.eventPolicies.get(eventType)!;
        }

        // Check pattern match in custom policies
        const namespace = eventType.split(':')[0];
        const pattern = `${namespace}:*`;
        if (this.eventPolicies.has(pattern)) {
            return this.eventPolicies.get(pattern)!;
        }

        // Fall back to defaults
        return getEventPolicy(eventType);
    }

    /**
     * Get state policy (checks custom first, then defaults)
     */
    getStatePolicy(stateType: string): StateSyncPolicy {
        if (this.statePolicies.has(stateType)) {
            return this.statePolicies.get(stateType)!;
        }
        return getStatePolicy(stateType);
    }
}

/**
 * Global policy registry
 */
export const PolicyRegistry = new SyncPolicyRegistry();

/**
 * Export for documentation/debugging
 */
export function getSyncPoliciesDocumentation(): string {
    return `
# StickerNest Sync Policies v1.0.0

## Event Sync Rules

| Pattern | Tabs | Devices | Canvas | Throttle |
|---------|------|---------|--------|----------|
${Object.entries(DEFAULT_EVENT_POLICIES).map(([pattern, policy]) =>
    `| ${pattern} | ${policy.syncAcrossTabs ? '✓' : '✗'} | ${policy.syncAcrossDevices ? '✓' : '✗'} | ${policy.syncToCanvasUsers ? '✓' : '✗'} | ${policy.throttleMs}ms |`
).join('\n')}

## State Sync Rules

| Type | Scope | Conflict Strategy | Throttle | Worker Authority |
|------|-------|-------------------|----------|------------------|
${Object.entries(DEFAULT_STATE_POLICIES).map(([type, policy]) =>
    `| ${type} | ${policy.scope} | ${policy.conflictStrategy} | ${policy.throttleMs}ms | ${policy.workerAuthority ? '✓' : '✗'} |`
).join('\n')}

## Scope Hierarchy
1. local - Only this tab
2. device - All tabs on this device
3. user - All devices for this user
4. canvas - All users viewing this canvas
5. global - Everyone

## Conflict Strategies
- last-write-wins: Latest timestamp wins
- first-write-wins: First timestamp wins
- server-authority: Server/SharedWorker decides
- merge: Attempt to merge changes
- manual: Notify user of conflict
- discard-remote: Local changes always win
`.trim();
}
