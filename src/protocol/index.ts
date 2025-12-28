/**
 * StickerNest v2 - Protocol Exports
 *
 * Central export point for all protocol-level types and utilities.
 */

// Runtime Message Protocol
export {
    RuntimeMessageSchema,
    RuntimeMessageSourceSchema,
    RuntimeMessageTargetSchema,
    RuntimeMessageChannelSchema,
    RuntimeMessageIdentitySchema,
    LoopGuardSchema,
    RuntimeMessageTypes,
    createRuntimeMessage,
    validateRuntimeMessage,
    shouldProcessMessage,
    markMessageSeen,
    type RuntimeMessage,
    type RuntimeMessageSource,
    type RuntimeMessageTarget,
    type RuntimeMessageChannel,
    type RuntimeMessageIdentity,
    type LoopGuard,
    type RuntimeMessageType
} from './runtimeMessage';

// Sync Policies
export {
    SyncScopeSchema,
    ConflictStrategySchema,
    EventSyncPolicySchema,
    StateSyncPolicySchema,
    DEFAULT_EVENT_POLICIES,
    DEFAULT_STATE_POLICIES,
    getEventPolicy,
    getStatePolicy,
    shouldSyncEvent,
    shouldSyncState,
    filterStateForSync,
    PolicyRegistry,
    getSyncPoliciesDocumentation,
    type SyncScope,
    type ConflictStrategy,
    type EventSyncPolicy,
    type StateSyncPolicy
} from './syncPolicies';
