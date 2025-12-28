/**
 * StickerNest v2 - Permission Guard
 *
 * Integration layer between PermissionManager and RuntimeMessageDispatcher.
 * Intercepts cross-user messages and enforces permission checks.
 *
 * Version: 1.0.0
 */

import { RuntimeMessage, RuntimeMessageChannel } from '../protocol/runtimeMessage';
import { RuntimeMessageDispatcher, RuntimeTransport } from './RuntimeMessageDispatcher';
import { PermissionManager, PermissionCheckResult, PermissionScope } from './PermissionManager';
import { getCurrentUser } from '../services/auth';
import { getIdentity } from './IdentityManager';

/**
 * Permission check options
 */
interface PermissionGuardOptions {
    /** Whether to enable permission checks */
    enabled: boolean;
    /** Channels that require permission checks */
    protectedChannels: RuntimeMessageChannel[];
    /** Event types that require permission */
    protectedEventTypes: string[];
    /** Whether to auto-request permission when denied */
    autoRequest: boolean;
    /** Callback when permission is denied */
    onDenied?: (message: RuntimeMessage, result: PermissionCheckResult) => void;
    /** Callback when permission is requested */
    onRequestSent?: (message: RuntimeMessage, targetUserId: string) => void;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: PermissionGuardOptions = {
    enabled: true,
    protectedChannels: ['events', 'state', 'pipeline'],
    protectedEventTypes: [
        'widget:control',
        'widget:state',
        'canvas:update',
        'pipeline:trigger',
        'custom:*'
    ],
    autoRequest: false
};

/**
 * Map event types to permission scopes
 */
function getRequiredScope(eventType: string): PermissionScope {
    if (eventType.startsWith('widget:')) {
        return 'widget-control';
    }
    if (eventType.startsWith('canvas:')) {
        return 'canvas-access';
    }
    if (eventType.startsWith('pipeline:')) {
        return 'pipeline';
    }
    if (eventType.startsWith('data:') || eventType.startsWith('state:')) {
        return 'data';
    }
    return 'event';
}

/**
 * Check if an event type is protected
 */
function isProtectedEventType(eventType: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
        if (pattern.endsWith(':*')) {
            const prefix = pattern.slice(0, -2);
            return eventType.startsWith(prefix + ':');
        }
        if (pattern.startsWith('*:')) {
            const suffix = pattern.slice(2);
            return eventType.endsWith(':' + suffix);
        }
        return eventType === pattern || pattern === '*';
    });
}

/**
 * PermissionGuard class
 *
 * Wraps message dispatch to enforce permission checks
 */
class PermissionGuardClass {
    private options: PermissionGuardOptions = DEFAULT_OPTIONS;
    private originalDispatch: typeof RuntimeMessageDispatcher.dispatch | null = null;
    private initialized: boolean = false;
    private deniedMessages: Map<string, RuntimeMessage> = new Map();

    /**
     * Initialize the permission guard
     */
    initialize(options?: Partial<PermissionGuardOptions>): void {
        if (this.initialized) {
            console.warn('[PermissionGuard] Already initialized');
            return;
        }

        this.options = { ...DEFAULT_OPTIONS, ...options };

        // Subscribe to incoming messages
        RuntimeMessageDispatcher.subscribeAll((message) => {
            this.handleIncomingMessage(message);
        });

        // Listen for permission events from PermissionManager
        PermissionManager.on('permission:request', (payload) => {
            // Send permission request to target user via dispatcher
            this.sendPermissionMessage('permission:request', payload);
        });

        PermissionManager.on('permission:approved', (payload) => {
            // Notify requester of approval
            this.sendPermissionMessage('permission:approved', payload);
        });

        PermissionManager.on('permission:denied', (payload) => {
            // Notify requester of denial
            this.sendPermissionMessage('permission:denied', payload);
        });

        PermissionManager.on('permission:revoked', (payload) => {
            // Notify grantee of revocation
            this.sendPermissionMessage('permission:revoked', payload);
        });

        this.initialized = true;
        console.log('[PermissionGuard] Initialized');
    }

    /**
     * Check if a message requires permission and if it's allowed
     */
    checkMessage(message: RuntimeMessage): PermissionCheckResult | null {
        if (!this.options.enabled) {
            return null;
        }

        // Only check messages targeting other users
        if (message.target !== 'canvas' && message.target !== 'user') {
            return null;
        }

        // Only check protected channels
        if (!this.options.protectedChannels.includes(message.channel)) {
            return null;
        }

        // Extract event type from payload
        const payload = message.payload as { eventType?: string };
        const eventType = payload?.eventType;

        // Check if event type is protected
        if (eventType && !isProtectedEventType(eventType, this.options.protectedEventTypes)) {
            return null;
        }

        // Get current user and sender info
        const currentUserId = getCurrentUser().userId;
        const senderUserId = message.identity?.userId || message.identity?.deviceId;

        // If sender is current user (outgoing), check permission for target
        if (senderUserId === currentUserId || message.identity?.deviceId === getIdentity().deviceId) {
            // This is an outgoing message - no permission check needed for sender
            return null;
        }

        // This is an incoming message - check if sender has permission
        const scope = eventType ? getRequiredScope(eventType) : 'event';

        return PermissionManager.checkPermission({
            fromUserId: senderUserId || 'unknown',
            toUserId: currentUserId,
            scope,
            eventType,
            canvasId: message.targetId
        });
    }

    /**
     * Handle incoming messages
     */
    private handleIncomingMessage(message: RuntimeMessage): void {
        // Handle permission-specific messages
        if (message.channel === 'permissions') {
            this.handlePermissionMessage(message);
            return;
        }

        // Check permission for other messages
        const result = this.checkMessage(message);

        if (result && !result.allowed) {
            // Permission denied - store for potential retry
            this.deniedMessages.set(message.id, message);

            // Limit stored messages
            if (this.deniedMessages.size > 100) {
                const firstKey = this.deniedMessages.keys().next().value;
                if (firstKey) {
                    this.deniedMessages.delete(firstKey);
                }
            }

            // Call denied callback
            if (this.options.onDenied) {
                this.options.onDenied(message, result);
            }

            // Auto-request permission if enabled
            if (this.options.autoRequest && result.reason === 'no-permission') {
                const senderUserId = message.identity?.userId || message.identity?.deviceId;
                const payload = message.payload as { eventType?: string };

                if (senderUserId) {
                    PermissionManager.requestPermission({
                        targetId: senderUserId,
                        targetType: 'user',
                        scope: payload?.eventType ? getRequiredScope(payload.eventType) : 'event',
                        eventTypes: payload?.eventType ? [payload.eventType] : undefined,
                        message: 'Auto-requested permission for cross-user communication'
                    });

                    if (this.options.onRequestSent) {
                        this.options.onRequestSent(message, senderUserId);
                    }
                }
            }

            console.log(`[PermissionGuard] Message blocked: ${result.reason}`, {
                messageId: message.id,
                channel: message.channel,
                type: message.type
            });
        }
    }

    /**
     * Handle permission-specific messages
     */
    private handlePermissionMessage(message: RuntimeMessage): void {
        const payload = message.payload as {
            type?: string;
            request?: unknown;
            grant?: unknown;
            fromUserId?: string;
            toUserId?: string;
        };

        switch (payload.type) {
            case 'permission:request':
                // Incoming permission request
                if (payload.request) {
                    PermissionManager.handleIncomingRequest(payload.request as any);
                }
                break;

            case 'permission:approved':
            case 'permission:denied':
            case 'permission:revoked':
                // These are responses to our requests
                // The PermissionManager handles these via local events
                // Emit local event for UI updates
                window.dispatchEvent(
                    new CustomEvent('permission-event', { detail: payload })
                );
                break;
        }
    }

    /**
     * Send a permission-related message
     */
    private sendPermissionMessage(type: string, payload: unknown): void {
        RuntimeMessageDispatcher.dispatch({
            target: 'canvas',
            channel: 'permissions',
            type,
            payload: {
                type,
                ...payload as object
            }
        });
    }

    /**
     * Wrap dispatch function to add permission checks
     */
    wrapDispatch(): void {
        // Note: This method is optional and can be used for stricter enforcement
        // For now, we handle incoming messages only
        console.log('[PermissionGuard] Dispatch wrapping available');
    }

    /**
     * Check if user has permission to send to target
     */
    canSendTo(targetUserId: string, scope: PermissionScope, eventType?: string): PermissionCheckResult {
        const currentUserId = getCurrentUser().userId;

        return PermissionManager.checkPermission({
            fromUserId: currentUserId,
            toUserId: targetUserId,
            scope,
            eventType
        });
    }

    /**
     * Request permission to communicate with a user
     */
    requestPermissionFor(
        targetUserId: string,
        scope: PermissionScope,
        options?: {
            eventTypes?: string[];
            message?: string;
            canvasId?: string;
        }
    ): void {
        PermissionManager.requestPermission({
            targetId: targetUserId,
            targetType: 'user',
            scope,
            ...options
        });
    }

    /**
     * Get denied messages (for retry UI)
     */
    getDeniedMessages(): RuntimeMessage[] {
        return Array.from(this.deniedMessages.values());
    }

    /**
     * Clear a denied message
     */
    clearDeniedMessage(messageId: string): void {
        this.deniedMessages.delete(messageId);
    }

    /**
     * Update options
     */
    updateOptions(options: Partial<PermissionGuardOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Enable/disable permission checks
     */
    setEnabled(enabled: boolean): void {
        this.options.enabled = enabled;
        console.log(`[PermissionGuard] ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * Check if permission guard is enabled
     */
    isEnabled(): boolean {
        return this.options.enabled;
    }
}

/**
 * Singleton instance
 */
export const PermissionGuard = new PermissionGuardClass();

/**
 * Initialize on module load (browser only)
 */
if (typeof window !== 'undefined') {
    // Defer initialization to allow RuntimeMessageDispatcher to initialize first
    setTimeout(() => {
        PermissionGuard.initialize();
    }, 0);
}

export {
    PermissionGuardOptions,
    getRequiredScope,
    isProtectedEventType
};
