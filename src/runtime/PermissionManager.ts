/**
 * StickerNest v2 - Permission Manager
 *
 * Central manager for cross-user communication permissions.
 * Handles permission requests, grants, revocations, and checks.
 *
 * This module ensures that users must explicitly approve
 * receiving events/data from other users before communication
 * can occur across user boundaries.
 *
 * Version: 1.0.0
 */

import {
    PermissionGrant,
    PermissionRequest,
    PermissionRule,
    PermissionCheckResult,
    PermissionState,
    PermissionPreferences,
    PermissionScope,
    PermissionTargetType,
    RequestPermissionParams,
    GrantPermissionParams,
    PermissionEventPayload,
    EMPTY_PERMISSION_STATE,
    DEFAULT_PERMISSION_PREFERENCES,
    PermissionGrantSchema,
    PermissionRequestSchema,
    PermissionRuleSchema
} from '../types/permissions';
import { getCurrentUser } from '../services/auth';
import { getIdentity, getDeviceId } from './IdentityManager';

/**
 * Generate unique ID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Storage key prefix
 */
const STORAGE_PREFIX = 'stickernest:permissions:';

/**
 * Permission event handlers type
 */
type PermissionEventHandler = (payload: PermissionEventPayload) => void;

/**
 * PermissionManager class
 *
 * Singleton that manages all permission operations.
 */
class PermissionManagerClass {
    private state: PermissionState = EMPTY_PERMISSION_STATE;
    private initialized: boolean = false;
    private eventHandlers: Map<string, Set<PermissionEventHandler>> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * Initialize the permission manager
     */
    initialize(): void {
        if (this.initialized) {
            console.warn('[PermissionManager] Already initialized');
            return;
        }

        // Load state from storage
        this.loadState();

        // Start cleanup interval for expired permissions
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpired();
        }, 60000); // Every minute

        this.initialized = true;
        console.log('[PermissionManager] Initialized');
    }

    /**
     * Shutdown the permission manager
     */
    shutdown(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.saveState();
        this.initialized = false;
    }

    /**
     * Get current user ID
     */
    private getCurrentUserId(): string {
        return getCurrentUser().userId;
    }

    // ==================
    // Permission Checks
    // ==================

    /**
     * Check if a permission exists for a specific action
     */
    checkPermission(params: {
        fromUserId: string;
        toUserId: string;
        scope: PermissionScope;
        eventType?: string;
        canvasId?: string;
        widgetId?: string;
    }): PermissionCheckResult {
        const { fromUserId, toUserId, scope, eventType, canvasId, widgetId } = params;

        // Self-permission is always allowed
        if (fromUserId === toUserId) {
            return {
                allowed: true,
                reason: 'self-permission',
                message: 'Self-communication is always allowed'
            };
        }

        // Same device is allowed (different tabs of same user)
        const currentDeviceId = getDeviceId();
        const identity = getIdentity();
        if (identity.deviceId === currentDeviceId && fromUserId === this.getCurrentUserId()) {
            return {
                allowed: true,
                reason: 'same-device',
                message: 'Same device communication is allowed'
            };
        }

        // Check if sender is blocked
        if (this.state.preferences.blockedUsers.includes(fromUserId)) {
            return {
                allowed: false,
                reason: 'rule-deny',
                message: 'User is blocked'
            };
        }

        // Check if sender is trusted
        if (this.state.preferences.trustedUsers.includes(fromUserId)) {
            return {
                allowed: true,
                reason: 'rule-allow',
                message: 'User is trusted'
            };
        }

        // Check permission rules first (higher priority)
        const ruleResult = this.checkRules(fromUserId, scope, eventType, canvasId);
        if (ruleResult) {
            return ruleResult;
        }

        // Check for existing grant
        const grant = this.findGrant({
            granterId: toUserId,
            granteeId: fromUserId,
            scope,
            eventType,
            canvasId,
            widgetId
        });

        if (grant) {
            // Check if grant is still valid
            if (!grant.isActive) {
                return {
                    allowed: false,
                    grant,
                    reason: 'revoked',
                    message: 'Permission was revoked'
                };
            }

            if (grant.expiresAt && grant.expiresAt < Date.now()) {
                // Mark as expired
                this.expireGrant(grant.id);
                return {
                    allowed: false,
                    grant,
                    reason: 'expired',
                    message: 'Permission has expired'
                };
            }

            if (grant.maxUses && grant.usageCount >= grant.maxUses) {
                return {
                    allowed: false,
                    grant,
                    reason: 'max-uses-reached',
                    message: 'Maximum uses reached'
                };
            }

            // Grant is valid, increment usage
            this.incrementUsage(grant.id);

            return {
                allowed: true,
                grant,
                reason: 'grant-exists',
                message: 'Permission granted'
            };
        }

        // Check auto-approve for same canvas
        if (canvasId && this.state.preferences.autoApproveSameCanvas) {
            // This would need collaboration info - for now just return no-permission
        }

        // No permission found
        return {
            allowed: false,
            reason: 'no-permission',
            message: 'No permission exists for this action'
        };
    }

    /**
     * Check permission rules
     */
    private checkRules(
        requesterId: string,
        scope: PermissionScope,
        eventType?: string,
        canvasId?: string
    ): PermissionCheckResult | null {
        const now = Date.now();

        // Sort by priority (descending)
        const rules = [...this.state.rules]
            .filter(r => r.enabled && (!r.expiresAt || r.expiresAt > now))
            .sort((a, b) => b.priority - a.priority);

        for (const rule of rules) {
            let matches = true;

            // Check requester condition
            if (rule.conditions.requesters && rule.conditions.requesters.length > 0) {
                if (!rule.conditions.requesters.includes(requesterId)) {
                    matches = false;
                }
            }

            // Check scope condition
            if (matches && rule.conditions.scopes && rule.conditions.scopes.length > 0) {
                if (!rule.conditions.scopes.includes(scope)) {
                    matches = false;
                }
            }

            // Check event type condition
            if (matches && rule.conditions.eventTypes && rule.conditions.eventTypes.length > 0) {
                if (!eventType || !rule.conditions.eventTypes.includes(eventType)) {
                    matches = false;
                }
            }

            // Check canvas condition
            if (matches && rule.conditions.canvasIds && rule.conditions.canvasIds.length > 0) {
                if (!canvasId || !rule.conditions.canvasIds.includes(canvasId)) {
                    matches = false;
                }
            }

            // Check same canvas condition
            if (matches && rule.conditions.sameCanvas !== undefined) {
                // Would need to check if both users are on same canvas
                // For now, skip this check
            }

            if (matches) {
                if (rule.action === 'allow') {
                    return {
                        allowed: true,
                        rule,
                        reason: 'rule-allow',
                        message: `Allowed by rule: ${rule.name}`
                    };
                } else if (rule.action === 'deny') {
                    return {
                        allowed: false,
                        rule,
                        reason: 'rule-deny',
                        message: `Denied by rule: ${rule.name}`
                    };
                }
                // 'prompt' action falls through to regular permission check
            }
        }

        return null;
    }

    /**
     * Find a matching grant
     */
    private findGrant(params: {
        granterId: string;
        granteeId: string;
        scope: PermissionScope;
        eventType?: string;
        canvasId?: string;
        widgetId?: string;
    }): PermissionGrant | undefined {
        const { granterId, granteeId, scope, eventType, canvasId, widgetId } = params;

        return this.state.grantsGiven.find(g => {
            // Must match granter and grantee
            if (g.granterId !== granterId) return false;
            if (g.granteeId !== granteeId) return false;

            // Must be active
            if (!g.isActive) return false;

            // Scope must match or be 'all'
            if (g.scope !== 'all' && g.scope !== scope) return false;

            // If event types are specified, eventType must match
            if (g.eventTypes && g.eventTypes.length > 0 && eventType) {
                if (!g.eventTypes.includes(eventType) && !g.eventTypes.includes('*')) {
                    return false;
                }
            }

            // If canvas is specified on grant, it must match
            if (g.canvasId && canvasId && g.canvasId !== canvasId) return false;

            // If widget is specified on grant, it must match
            if (g.widgetId && widgetId && g.widgetId !== widgetId) return false;

            return true;
        });
    }

    // ==================
    // Permission Requests
    // ==================

    /**
     * Request permission from another user
     */
    requestPermission(params: RequestPermissionParams): PermissionRequest {
        const currentUser = getCurrentUser();
        const now = Date.now();

        const request: PermissionRequest = {
            id: generateId(),
            requesterId: currentUser.userId,
            requesterName: currentUser.username,
            targetId: params.targetId,
            targetType: params.targetType,
            scope: params.scope,
            eventTypes: params.eventTypes,
            canvasId: params.canvasId,
            widgetId: params.widgetId,
            message: params.message,
            createdAt: now,
            expiresAt: params.validFor ? now + params.validFor : undefined,
            status: 'pending'
        };

        // Validate request
        PermissionRequestSchema.parse(request);

        // Add to outgoing requests
        this.state.outgoingRequests.push(request);
        this.saveState();

        // Emit request event
        this.emitEvent({
            type: 'permission:request',
            request,
            fromUserId: currentUser.userId,
            toUserId: params.targetId,
            timestamp: now
        });

        console.log('[PermissionManager] Permission requested:', request.id);

        return request;
    }

    /**
     * Handle an incoming permission request (for the target user)
     */
    handleIncomingRequest(request: PermissionRequest): void {
        // Validate
        const validated = PermissionRequestSchema.parse(request);

        // Check if we already have this request
        const existing = this.state.pendingRequests.find(r => r.id === validated.id);
        if (existing) {
            return;
        }

        // Check if expired
        if (validated.expiresAt && validated.expiresAt < Date.now()) {
            return;
        }

        // Check auto-approve conditions
        const prefs = this.state.preferences;

        // Check if trusted user
        if (prefs.trustedUsers.includes(validated.requesterId)) {
            this.approveRequest(validated.id, { autoApproved: true });
            return;
        }

        // Check if blocked user
        if (prefs.blockedUsers.includes(validated.requesterId)) {
            this.denyRequest(validated.id, 'User is blocked');
            return;
        }

        // Add to pending requests
        this.state.pendingRequests.push(validated);
        this.saveState();

        // Emit event for UI notification
        this.emitLocalEvent('permission:request-received', validated);

        console.log('[PermissionManager] Incoming permission request:', validated.id);
    }

    /**
     * Approve a permission request
     */
    approveRequest(
        requestId: string,
        options: {
            duration?: number | null;
            maxUses?: number | null;
            bidirectional?: boolean;
            autoApproved?: boolean;
        } = {}
    ): PermissionGrant | null {
        const request = this.state.pendingRequests.find(r => r.id === requestId)
            || this.state.outgoingRequests.find(r => r.id === requestId);

        if (!request) {
            console.warn('[PermissionManager] Request not found:', requestId);
            return null;
        }

        if (request.status !== 'pending') {
            console.warn('[PermissionManager] Request already processed:', requestId);
            return null;
        }

        const currentUser = getCurrentUser();
        const now = Date.now();

        // Create grant
        const grant: PermissionGrant = {
            id: generateId(),
            requestId,
            granterId: currentUser.userId,
            granterName: currentUser.username,
            granteeId: request.requesterId,
            granteeName: request.requesterName,
            targetType: request.targetType,
            scope: request.scope,
            eventTypes: request.eventTypes,
            canvasId: request.canvasId,
            widgetId: request.widgetId,
            createdAt: now,
            expiresAt: options.duration ? now + options.duration : null,
            isActive: true,
            usageCount: 0,
            maxUses: options.maxUses ?? null,
            bidirectional: options.bidirectional ?? false
        };

        // Validate grant
        PermissionGrantSchema.parse(grant);

        // Update request status
        request.status = 'approved';
        request.statusUpdatedAt = now;

        // Add grant
        this.state.grantsGiven.push(grant);

        // Remove from pending
        this.state.pendingRequests = this.state.pendingRequests.filter(r => r.id !== requestId);

        // If bidirectional, create reverse grant
        if (options.bidirectional) {
            const reverseGrant: PermissionGrant = {
                ...grant,
                id: generateId(),
                granterId: request.requesterId,
                granterName: request.requesterName,
                granteeId: currentUser.userId,
                granteeName: currentUser.username,
                bidirectional: true
            };
            this.state.grantsReceived.push(reverseGrant);
        }

        this.saveState();

        // Emit approval event
        this.emitEvent({
            type: 'permission:approved',
            request,
            grant,
            fromUserId: currentUser.userId,
            toUserId: request.requesterId,
            timestamp: now
        });

        console.log('[PermissionManager] Permission approved:', grant.id);

        return grant;
    }

    /**
     * Deny a permission request
     */
    denyRequest(requestId: string, message?: string): void {
        const request = this.state.pendingRequests.find(r => r.id === requestId);

        if (!request) {
            console.warn('[PermissionManager] Request not found:', requestId);
            return;
        }

        if (request.status !== 'pending') {
            console.warn('[PermissionManager] Request already processed:', requestId);
            return;
        }

        const currentUser = getCurrentUser();
        const now = Date.now();

        // Update request status
        request.status = 'denied';
        request.statusUpdatedAt = now;
        request.responseMessage = message;

        // Remove from pending
        this.state.pendingRequests = this.state.pendingRequests.filter(r => r.id !== requestId);

        this.saveState();

        // Emit denial event
        this.emitEvent({
            type: 'permission:denied',
            request,
            fromUserId: currentUser.userId,
            toUserId: request.requesterId,
            timestamp: now
        });

        console.log('[PermissionManager] Permission denied:', requestId);
    }

    // ==================
    // Permission Grants (Direct)
    // ==================

    /**
     * Grant permission directly (without a request)
     */
    grantPermission(params: GrantPermissionParams): PermissionGrant {
        const currentUser = getCurrentUser();
        const now = Date.now();

        const grant: PermissionGrant = {
            id: generateId(),
            requestId: params.requestId,
            granterId: currentUser.userId,
            granterName: currentUser.username,
            granteeId: params.granteeId,
            targetType: 'user',
            scope: params.scope,
            eventTypes: params.eventTypes,
            canvasId: params.canvasId,
            widgetId: params.widgetId,
            createdAt: now,
            expiresAt: params.duration ? now + params.duration : null,
            isActive: true,
            usageCount: 0,
            maxUses: params.maxUses ?? null,
            bidirectional: params.bidirectional ?? false
        };

        // Validate
        PermissionGrantSchema.parse(grant);

        // Add grant
        this.state.grantsGiven.push(grant);

        // If bidirectional, create reverse grant
        if (params.bidirectional) {
            const reverseGrant: PermissionGrant = {
                ...grant,
                id: generateId(),
                granterId: params.granteeId,
                granteeId: currentUser.userId,
                bidirectional: true
            };
            this.state.grantsReceived.push(reverseGrant);
        }

        this.saveState();

        console.log('[PermissionManager] Permission granted:', grant.id);

        return grant;
    }

    /**
     * Revoke a permission grant
     */
    revokeGrant(grantId: string): void {
        const grant = this.state.grantsGiven.find(g => g.id === grantId);

        if (!grant) {
            console.warn('[PermissionManager] Grant not found:', grantId);
            return;
        }

        const currentUser = getCurrentUser();
        const now = Date.now();

        // Mark as inactive
        grant.isActive = false;

        // If bidirectional, find and revoke reverse grant
        if (grant.bidirectional) {
            const reverseGrant = this.state.grantsReceived.find(
                g => g.granterId === grant.granteeId &&
                    g.granteeId === grant.granterId &&
                    g.scope === grant.scope
            );
            if (reverseGrant) {
                reverseGrant.isActive = false;
            }
        }

        this.saveState();

        // Emit revocation event
        this.emitEvent({
            type: 'permission:revoked',
            grant,
            fromUserId: currentUser.userId,
            toUserId: grant.granteeId,
            timestamp: now
        });

        console.log('[PermissionManager] Permission revoked:', grantId);
    }

    /**
     * Mark a grant as expired
     */
    private expireGrant(grantId: string): void {
        const grant = this.state.grantsGiven.find(g => g.id === grantId);
        if (grant) {
            grant.isActive = false;
            this.saveState();
        }
    }

    /**
     * Increment usage count for a grant
     */
    private incrementUsage(grantId: string): void {
        const grant = this.state.grantsGiven.find(g => g.id === grantId);
        if (grant) {
            grant.usageCount++;
            grant.lastUsedAt = Date.now();
            this.saveState();
        }
    }

    // ==================
    // Permission Rules
    // ==================

    /**
     * Add a permission rule
     */
    addRule(rule: Omit<PermissionRule, 'id' | 'createdAt'>): PermissionRule {
        const fullRule: PermissionRule = {
            ...rule,
            id: generateId(),
            createdAt: Date.now()
        };

        // Validate
        PermissionRuleSchema.parse(fullRule);

        this.state.rules.push(fullRule);
        this.saveState();

        console.log('[PermissionManager] Rule added:', fullRule.id);

        return fullRule;
    }

    /**
     * Remove a permission rule
     */
    removeRule(ruleId: string): void {
        this.state.rules = this.state.rules.filter(r => r.id !== ruleId);
        this.saveState();

        console.log('[PermissionManager] Rule removed:', ruleId);
    }

    /**
     * Update a permission rule
     */
    updateRule(ruleId: string, updates: Partial<PermissionRule>): void {
        const rule = this.state.rules.find(r => r.id === ruleId);
        if (rule) {
            Object.assign(rule, updates);
            this.saveState();
            console.log('[PermissionManager] Rule updated:', ruleId);
        }
    }

    // ==================
    // User Management
    // ==================

    /**
     * Block a user
     */
    blockUser(userId: string): void {
        if (!this.state.preferences.blockedUsers.includes(userId)) {
            this.state.preferences.blockedUsers.push(userId);

            // Remove from trusted if present
            this.state.preferences.trustedUsers = this.state.preferences.trustedUsers.filter(
                id => id !== userId
            );

            // Revoke any existing grants from this user
            this.state.grantsGiven
                .filter(g => g.granteeId === userId && g.isActive)
                .forEach(g => this.revokeGrant(g.id));

            this.saveState();
            console.log('[PermissionManager] User blocked:', userId);
        }
    }

    /**
     * Unblock a user
     */
    unblockUser(userId: string): void {
        this.state.preferences.blockedUsers = this.state.preferences.blockedUsers.filter(
            id => id !== userId
        );
        this.saveState();
        console.log('[PermissionManager] User unblocked:', userId);
    }

    /**
     * Trust a user (auto-approve their requests)
     */
    trustUser(userId: string): void {
        if (!this.state.preferences.trustedUsers.includes(userId)) {
            this.state.preferences.trustedUsers.push(userId);

            // Remove from blocked if present
            this.state.preferences.blockedUsers = this.state.preferences.blockedUsers.filter(
                id => id !== userId
            );

            this.saveState();
            console.log('[PermissionManager] User trusted:', userId);
        }
    }

    /**
     * Remove trust from a user
     */
    untrustUser(userId: string): void {
        this.state.preferences.trustedUsers = this.state.preferences.trustedUsers.filter(
            id => id !== userId
        );
        this.saveState();
        console.log('[PermissionManager] User untrusted:', userId);
    }

    // ==================
    // Preferences
    // ==================

    /**
     * Update preferences
     */
    updatePreferences(updates: Partial<PermissionPreferences>): void {
        Object.assign(this.state.preferences, updates);
        this.saveState();
        console.log('[PermissionManager] Preferences updated');
    }

    /**
     * Reset preferences to defaults
     */
    resetPreferences(): void {
        this.state.preferences = { ...DEFAULT_PERMISSION_PREFERENCES };
        this.saveState();
        console.log('[PermissionManager] Preferences reset');
    }

    // ==================
    // State Access
    // ==================

    /**
     * Get current permission state
     */
    getState(): PermissionState {
        return { ...this.state };
    }

    /**
     * Get pending requests
     */
    getPendingRequests(): PermissionRequest[] {
        return [...this.state.pendingRequests];
    }

    /**
     * Get outgoing requests
     */
    getOutgoingRequests(): PermissionRequest[] {
        return [...this.state.outgoingRequests];
    }

    /**
     * Get active grants given
     */
    getActiveGrantsGiven(): PermissionGrant[] {
        return this.state.grantsGiven.filter(g => g.isActive);
    }

    /**
     * Get active grants received
     */
    getActiveGrantsReceived(): PermissionGrant[] {
        return this.state.grantsReceived.filter(g => g.isActive);
    }

    /**
     * Get rules
     */
    getRules(): PermissionRule[] {
        return [...this.state.rules];
    }

    /**
     * Get preferences
     */
    getPreferences(): PermissionPreferences {
        return { ...this.state.preferences };
    }

    // ==================
    // Events
    // ==================

    /**
     * Subscribe to permission events
     */
    on(event: string, handler: PermissionEventHandler): () => void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.eventHandlers.get(event)?.delete(handler);
        };
    }

    /**
     * Emit an event (for cross-user communication via dispatcher)
     */
    private emitEvent(payload: PermissionEventPayload): void {
        // Emit locally
        this.emitLocalEvent(payload.type, payload);

        // Emit via RuntimeMessageDispatcher (will be set up in integration)
        // This is where we'd send the event across users
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('permission-event', { detail: payload })
            );
        }
    }

    /**
     * Emit a local event
     */
    private emitLocalEvent(event: string, data: unknown): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler(data as PermissionEventPayload);
                } catch (e) {
                    console.error('[PermissionManager] Event handler error:', e);
                }
            }
        }

        // Also emit to wildcard handlers
        const wildcardHandlers = this.eventHandlers.get('*');
        if (wildcardHandlers) {
            for (const handler of wildcardHandlers) {
                try {
                    handler(data as PermissionEventPayload);
                } catch (e) {
                    console.error('[PermissionManager] Wildcard handler error:', e);
                }
            }
        }
    }

    // ==================
    // Persistence
    // ==================

    /**
     * Load state from storage
     */
    private loadState(): void {
        try {
            const userId = this.getCurrentUserId();
            const stored = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.state = {
                    ...EMPTY_PERMISSION_STATE,
                    ...parsed,
                    preferences: {
                        ...DEFAULT_PERMISSION_PREFERENCES,
                        ...parsed.preferences
                    }
                };
                console.log('[PermissionManager] State loaded');
            }
        } catch (e) {
            console.warn('[PermissionManager] Failed to load state:', e);
            this.state = { ...EMPTY_PERMISSION_STATE };
        }
    }

    /**
     * Save state to storage
     */
    private saveState(): void {
        try {
            const userId = this.getCurrentUserId();
            this.state.lastSyncAt = Date.now();
            localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(this.state));
        } catch (e) {
            console.warn('[PermissionManager] Failed to save state:', e);
        }
    }

    /**
     * Clean up expired permissions and requests
     */
    private cleanupExpired(): void {
        const now = Date.now();
        let changed = false;

        // Clean up expired grants
        for (const grant of this.state.grantsGiven) {
            if (grant.isActive && grant.expiresAt && grant.expiresAt < now) {
                grant.isActive = false;
                changed = true;
            }
        }

        for (const grant of this.state.grantsReceived) {
            if (grant.isActive && grant.expiresAt && grant.expiresAt < now) {
                grant.isActive = false;
                changed = true;
            }
        }

        // Clean up expired requests
        const expiredRequests = this.state.pendingRequests.filter(
            r => r.expiresAt && r.expiresAt < now
        );

        if (expiredRequests.length > 0) {
            for (const request of expiredRequests) {
                request.status = 'expired';
                request.statusUpdatedAt = now;
            }
            this.state.pendingRequests = this.state.pendingRequests.filter(
                r => !r.expiresAt || r.expiresAt >= now
            );
            changed = true;
        }

        // Clean up old outgoing requests (keep for 24 hours)
        const oldRequestThreshold = now - 24 * 60 * 60 * 1000;
        const oldCount = this.state.outgoingRequests.length;
        this.state.outgoingRequests = this.state.outgoingRequests.filter(
            r => r.createdAt > oldRequestThreshold
        );
        if (this.state.outgoingRequests.length !== oldCount) {
            changed = true;
        }

        if (changed) {
            this.saveState();
        }
    }

    /**
     * Clear all permission data (for logout/reset)
     */
    clearAll(): void {
        this.state = { ...EMPTY_PERMISSION_STATE };
        this.saveState();
        console.log('[PermissionManager] All permissions cleared');
    }
}

/**
 * Singleton instance
 */
export const PermissionManager = new PermissionManagerClass();

/**
 * Initialize on module load (browser only)
 */
if (typeof window !== 'undefined') {
    PermissionManager.initialize();
}

/**
 * Export types for convenience
 */
export type {
    PermissionGrant,
    PermissionRequest,
    PermissionRule,
    PermissionCheckResult,
    PermissionState,
    PermissionPreferences,
    PermissionScope,
    PermissionTargetType,
    RequestPermissionParams,
    GrantPermissionParams,
    PermissionEventPayload
};
