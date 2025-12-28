/**
 * StickerNest v2 - Cross-Tab Sync
 *
 * Integrates EventBus with RuntimeMessageDispatcher for automatic
 * cross-tab synchronization of events.
 *
 * This module:
 * - Listens to EventBus events and syncs to other tabs
 * - Receives events from other tabs and emits them locally
 * - Applies sync policies to determine what should sync
 *
 * Version: 1.0.0
 */

import { EventBus } from './EventBus';
import { RuntimeMessageDispatcher } from './RuntimeMessageDispatcher';
import { createBroadcastChannelTransport, BroadcastChannelTransport } from './transports';
import { RuntimeMessageTypes, RuntimeMessage } from '../protocol/runtimeMessage';
import { PolicyRegistry } from '../protocol/syncPolicies';
import type { Event } from '../types/runtime';

/**
 * Cross-tab sync manager
 */
class CrossTabSyncManager {
    private eventBus: EventBus | null = null;
    private transport: BroadcastChannelTransport | null = null;
    private unsubscribeEventBus: (() => void) | null = null;
    private unsubscribeDispatcher: (() => void) | null = null;
    private initialized = false;

    /**
     * Initialize cross-tab sync with an EventBus
     */
    async initialize(eventBus: EventBus): Promise<void> {
        if (this.initialized) {
            console.warn('[CrossTabSync] Already initialized');
            return;
        }

        this.eventBus = eventBus;

        // Create and connect BroadcastChannel transport
        this.transport = await createBroadcastChannelTransport();

        if (this.transport) {
            // Register transport with dispatcher
            RuntimeMessageDispatcher.registerTransport(this.transport);
        }

        // Subscribe to local EventBus events and sync them
        this.unsubscribeEventBus = eventBus.on('*', (event: Event) => {
            this.handleLocalEvent(event);
        });

        // Subscribe to incoming messages from other tabs
        this.unsubscribeDispatcher = RuntimeMessageDispatcher.subscribe('events', (message: RuntimeMessage) => {
            this.handleRemoteMessage(message);
        });

        this.initialized = true;
        console.log('[CrossTabSync] Initialized');
    }

    /**
     * Handle local event and sync to other tabs if policy allows
     */
    private handleLocalEvent(event: Event): void {
        // Skip internal events
        if (event.type.startsWith('bridge:')) {
            return;
        }

        // Check if this event should be synced
        const policy = PolicyRegistry.getEventPolicy(event.type);

        if (!policy.syncAcrossTabs) {
            // This event type should not sync
            return;
        }

        // Check if this event came from another tab (already synced)
        if (event.metadata && !this.eventBus?.isLocalEvent(event)) {
            // This event originated from another tab - don't re-sync
            return;
        }

        // Dispatch to other tabs
        RuntimeMessageDispatcher.dispatchEvent(event.type, event.payload);
    }

    /**
     * Handle remote message from another tab
     */
    private handleRemoteMessage(message: RuntimeMessage): void {
        if (!this.eventBus) return;

        // Only handle EMIT_EVENT messages
        if (message.type !== RuntimeMessageTypes.EMIT_EVENT) {
            return;
        }

        const payload = message.payload as { eventType?: string; eventPayload?: unknown };

        if (!payload.eventType) {
            console.warn('[CrossTabSync] Invalid event message - missing eventType');
            return;
        }

        // Emit the event locally using emitFromRemote (which checks loop guard)
        const remoteEvent: Event = {
            type: payload.eventType,
            payload: payload.eventPayload || {},
            scope: 'canvas',
            sourceWidgetId: undefined,
            metadata: {
                eventId: message.id,
                originTabId: message.identity.tabId,
                originDeviceId: message.identity.deviceId,
                originSessionId: message.identity.sessionId,
                seenBy: message.loopGuard.seenBy,
                hopCount: message.loopGuard.hopCount,
                originTimestamp: message.loopGuard.originTimestamp
            }
        };

        this.eventBus.emitFromRemote(remoteEvent);
    }

    /**
     * Check if initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Get transport status
     */
    getStatus(): {
        initialized: boolean;
        transportConnected: boolean;
        transportName: string | null;
    } {
        return {
            initialized: this.initialized,
            transportConnected: this.transport?.isConnected() ?? false,
            transportName: this.transport?.name ?? null
        };
    }

    /**
     * Shutdown cross-tab sync
     */
    shutdown(): void {
        if (this.unsubscribeEventBus) {
            this.unsubscribeEventBus();
            this.unsubscribeEventBus = null;
        }

        if (this.unsubscribeDispatcher) {
            this.unsubscribeDispatcher();
            this.unsubscribeDispatcher = null;
        }

        if (this.transport) {
            RuntimeMessageDispatcher.unregisterTransport(this.transport.name);
            this.transport = null;
        }

        this.eventBus = null;
        this.initialized = false;

        console.log('[CrossTabSync] Shutdown');
    }
}

/**
 * Singleton instance
 */
export const CrossTabSync = new CrossTabSyncManager();

/**
 * Convenience function to initialize cross-tab sync
 */
export async function initializeCrossTabSync(eventBus: EventBus): Promise<void> {
    await CrossTabSync.initialize(eventBus);
}

/**
 * Convenience function to shutdown cross-tab sync
 */
export function shutdownCrossTabSync(): void {
    CrossTabSync.shutdown();
}
