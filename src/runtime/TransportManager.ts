/**
 * StickerNest v2 - Transport Manager
 *
 * Unified orchestrator that combines all transport layers:
 * - Local EventBus (in-tab events)
 * - BroadcastChannel (tab-to-tab, same origin)
 * - SharedWorker (persistent hub, tab management)
 * - WebSocket (multi-device, multi-user, collaboration)
 *
 * Responsibilities:
 * - Initialize and manage all transports
 * - Route messages to appropriate transports based on sync policies
 * - Handle conflict resolution
 * - Enforce loop protection
 * - Bridge EventBus with external transports
 *
 * Version: 1.0.0
 */

import { EventBus } from './EventBus';
import { RuntimeMessageDispatcher } from './RuntimeMessageDispatcher';
import {
    BroadcastChannelTransport,
    createBroadcastChannelTransport,
    SharedWorkerTransport,
    createSharedWorkerTransport,
    WebSocketTransport,
    createWebSocketTransport,
    type WebSocketConfig,
    type TabInfo,
    type RemoteUserPresence
} from './transports';
import {
    RuntimeMessage,
    RuntimeMessageTypes
} from '../protocol/runtimeMessage';
import { PolicyRegistry } from '../protocol/syncPolicies';
import { IdentityManager } from './IdentityManager';
import type { Event } from '../types/runtime';

/**
 * Transport manager configuration
 */
export interface TransportManagerConfig {
    /** Enable BroadcastChannel transport */
    enableBroadcastChannel?: boolean;
    /** Enable SharedWorker transport */
    enableSharedWorker?: boolean;
    /** WebSocket configuration (null to disable) */
    webSocket?: WebSocketConfig | null;
    /** Auto-connect on initialization */
    autoConnect?: boolean;
}

/**
 * Transport status information
 */
export interface TransportStatus {
    broadcastChannel: {
        enabled: boolean;
        connected: boolean;
    };
    sharedWorker: {
        enabled: boolean;
        connected: boolean;
        connectedTabs: number;
    };
    webSocket: {
        enabled: boolean;
        connected: boolean;
        state: string;
        remoteUsers: number;
    };
}

/**
 * Message routing result
 */
interface RoutingResult {
    local: boolean;
    broadcastChannel: boolean;
    sharedWorker: boolean;
    webSocket: boolean;
}

/**
 * Transport Manager class
 *
 * Orchestrates all transport layers for seamless cross-context communication.
 */
class TransportManagerClass {
    private eventBus: EventBus | null = null;
    private broadcastChannel: BroadcastChannelTransport | null = null;
    private sharedWorker: SharedWorkerTransport | null = null;
    private webSocket: WebSocketTransport | null = null;
    private config: TransportManagerConfig = {
        enableBroadcastChannel: true,
        enableSharedWorker: true,
        webSocket: null,
        autoConnect: true
    };
    private initialized = false;
    private unsubscribers: Array<() => void> = [];

    // Event handlers for external consumers
    private tabJoinHandlers: Set<(tabInfo: TabInfo) => void> = new Set();
    private tabLeaveHandlers: Set<(tabId: string) => void> = new Set();
    private presenceHandlers: Set<(users: RemoteUserPresence[]) => void> = new Set();
    private connectionChangeHandlers: Set<(status: TransportStatus) => void> = new Set();

    /**
     * Initialize the transport manager
     */
    async initialize(eventBus: EventBus, config?: Partial<TransportManagerConfig>): Promise<void> {
        if (this.initialized) {
            console.warn('[TransportManager] Already initialized');
            return;
        }

        this.eventBus = eventBus;
        this.config = { ...this.config, ...config };

        // Ensure IdentityManager is initialized
        IdentityManager.initialize();

        console.log('[TransportManager] Initializing with config:', this.config);

        // Initialize transports based on config
        const initPromises: Promise<void>[] = [];

        if (this.config.enableBroadcastChannel) {
            initPromises.push(this.initBroadcastChannel());
        }

        if (this.config.enableSharedWorker) {
            initPromises.push(this.initSharedWorker());
        }

        if (this.config.webSocket) {
            initPromises.push(this.initWebSocket(this.config.webSocket));
        }

        // Wait for all transports to initialize
        await Promise.allSettled(initPromises);

        // Subscribe to EventBus events
        this.subscribeToEventBus();

        // Subscribe to dispatcher for incoming messages
        this.subscribeToDispatcher();

        this.initialized = true;
        console.log('[TransportManager] Initialized');

        // Notify connection change
        this.notifyConnectionChange();
    }

    /**
     * Initialize BroadcastChannel transport
     */
    private async initBroadcastChannel(): Promise<void> {
        try {
            this.broadcastChannel = await createBroadcastChannelTransport();
            if (this.broadcastChannel) {
                RuntimeMessageDispatcher.registerTransport(this.broadcastChannel);
                console.log('[TransportManager] BroadcastChannel transport initialized');
            }
        } catch (error) {
            console.error('[TransportManager] BroadcastChannel initialization failed:', error);
        }
    }

    /**
     * Initialize SharedWorker transport
     */
    private async initSharedWorker(): Promise<void> {
        try {
            this.sharedWorker = await createSharedWorkerTransport();
            if (this.sharedWorker) {
                RuntimeMessageDispatcher.registerTransport(this.sharedWorker);

                // Set up tab event handlers
                this.sharedWorker.onTabJoin((tabInfo) => {
                    this.tabJoinHandlers.forEach(h => h(tabInfo));
                    this.notifyConnectionChange();
                });

                this.sharedWorker.onTabLeave((tabId) => {
                    this.tabLeaveHandlers.forEach(h => h(tabId));
                    this.notifyConnectionChange();
                });

                console.log('[TransportManager] SharedWorker transport initialized');
            }
        } catch (error) {
            console.error('[TransportManager] SharedWorker initialization failed:', error);
        }
    }

    /**
     * Initialize WebSocket transport
     */
    private async initWebSocket(config: WebSocketConfig): Promise<void> {
        try {
            this.webSocket = createWebSocketTransport(config);

            // Set up presence handler
            this.webSocket.onPresenceUpdate((users) => {
                this.presenceHandlers.forEach(h => h(users));
                this.notifyConnectionChange();
            });

            // Register with dispatcher
            RuntimeMessageDispatcher.registerTransport(this.webSocket);

            // Connect if autoConnect is enabled
            if (this.config.autoConnect) {
                await this.webSocket.connect();
            }

            console.log('[TransportManager] WebSocket transport initialized');
        } catch (error) {
            console.error('[TransportManager] WebSocket initialization failed:', error);
        }
    }

    /**
     * Subscribe to local EventBus events
     */
    private subscribeToEventBus(): void {
        if (!this.eventBus) return;

        const unsubscribe = this.eventBus.on('*', (event: Event) => {
            this.handleLocalEvent(event);
        });

        this.unsubscribers.push(unsubscribe);
    }

    /**
     * Subscribe to RuntimeMessageDispatcher for incoming messages
     */
    private subscribeToDispatcher(): void {
        const unsubscribe = RuntimeMessageDispatcher.subscribe('events', (message: RuntimeMessage) => {
            this.handleRemoteMessage(message);
        });

        this.unsubscribers.push(unsubscribe);
    }

    /**
     * Handle local event from EventBus
     */
    private handleLocalEvent(event: Event): void {
        // Skip internal bridge events
        if (event.type.startsWith('bridge:')) {
            return;
        }

        // Check if this event came from a remote source (already synced)
        if (event.metadata && !this.eventBus?.isLocalEvent(event)) {
            return;
        }

        // Determine routing based on sync policies
        const routing = this.determineRouting(event.type);

        // Debug: Log social events
        if (event.type.startsWith('social:')) {
            console.log('[TransportManager] 📤 Social event detected:', {
                type: event.type,
                routing,
                bcConnected: this.broadcastChannel?.isConnected(),
                payload: event.payload
            });
        }

        if (!routing.local && !routing.broadcastChannel && !routing.sharedWorker && !routing.webSocket) {
            // No sync needed
            if (event.type.startsWith('social:')) {
                console.log('[TransportManager] ❌ Social event NOT routed - no sync policy match');
            }
            return;
        }

        // Debug: Confirm dispatch
        if (event.type.startsWith('social:')) {
            console.log('[TransportManager] ✅ Dispatching social event to transports');
        }

        // Dispatch to appropriate transports
        RuntimeMessageDispatcher.dispatch({
            target: 'broadcast',
            channel: 'events',
            type: RuntimeMessageTypes.EMIT_EVENT,
            payload: {
                eventType: event.type,
                eventPayload: event.payload
            }
        });
    }

    /**
     * Handle remote message from dispatcher
     */
    private handleRemoteMessage(message: RuntimeMessage): void {
        if (!this.eventBus) return;

        // Only handle event messages
        if (message.type !== RuntimeMessageTypes.EMIT_EVENT) {
            return;
        }

        const payload = message.payload as { eventType?: string; eventPayload?: unknown };

        if (!payload.eventType) {
            console.warn('[TransportManager] Invalid event message - missing eventType');
            return;
        }

        // Debug: Log received social events
        if (payload.eventType.startsWith('social:')) {
            console.log('[TransportManager] 📥 Received remote social event:', {
                type: payload.eventType,
                payload: payload.eventPayload,
                fromTab: message.identity.tabId
            });
        }

        // Emit the event locally using emitFromRemote
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

        // Debug: Confirm emission
        if (payload.eventType.startsWith('social:')) {
            console.log('[TransportManager] ✅ Emitted remote social event to local EventBus');
        }
    }

    /**
     * Determine which transports should receive an event
     */
    private determineRouting(eventType: string): RoutingResult {
        const policy = PolicyRegistry.getEventPolicy(eventType);

        return {
            local: true, // Always process locally
            broadcastChannel: (policy.syncAcrossTabs && this.broadcastChannel?.isConnected()) || false,
            sharedWorker: (policy.syncAcrossTabs && this.sharedWorker?.isConnected()) || false,
            webSocket: ((policy.syncAcrossDevices || policy.syncToCanvasUsers) && this.webSocket?.isConnected()) || false
        };
    }

    /**
     * Get current transport status
     */
    getStatus(): TransportStatus {
        return {
            broadcastChannel: {
                enabled: this.config.enableBroadcastChannel || false,
                connected: this.broadcastChannel?.isConnected() || false
            },
            sharedWorker: {
                enabled: this.config.enableSharedWorker || false,
                connected: this.sharedWorker?.isConnected() || false,
                connectedTabs: this.sharedWorker?.getConnectedTabs().length || 0
            },
            webSocket: {
                enabled: !!this.config.webSocket,
                connected: this.webSocket?.isConnected() || false,
                state: this.webSocket?.getConnectionState() || 'disconnected',
                remoteUsers: this.webSocket?.getRemoteUsers().length || 0
            }
        };
    }

    /**
     * Get connected tabs (from SharedWorker)
     */
    getConnectedTabs(): TabInfo[] {
        return this.sharedWorker?.getConnectedTabs() || [];
    }

    /**
     * Get remote users (from WebSocket)
     */
    getRemoteUsers(): RemoteUserPresence[] {
        return this.webSocket?.getRemoteUsers() || [];
    }

    /**
     * Register handler for tab join events
     */
    onTabJoin(handler: (tabInfo: TabInfo) => void): () => void {
        this.tabJoinHandlers.add(handler);
        return () => this.tabJoinHandlers.delete(handler);
    }

    /**
     * Register handler for tab leave events
     */
    onTabLeave(handler: (tabId: string) => void): () => void {
        this.tabLeaveHandlers.add(handler);
        return () => this.tabLeaveHandlers.delete(handler);
    }

    /**
     * Register handler for presence updates
     */
    onPresenceUpdate(handler: (users: RemoteUserPresence[]) => void): () => void {
        this.presenceHandlers.add(handler);
        return () => this.presenceHandlers.delete(handler);
    }

    /**
     * Register handler for connection state changes
     */
    onConnectionChange(handler: (status: TransportStatus) => void): () => void {
        this.connectionChangeHandlers.add(handler);
        return () => this.connectionChangeHandlers.delete(handler);
    }

    /**
     * Notify connection change handlers
     */
    private notifyConnectionChange(): void {
        const status = this.getStatus();
        this.connectionChangeHandlers.forEach(h => h(status));
    }

    /**
     * Connect WebSocket (if not auto-connected)
     */
    async connectWebSocket(): Promise<void> {
        if (!this.webSocket) {
            console.warn('[TransportManager] WebSocket not configured');
            return;
        }

        await this.webSocket.connect();
        this.notifyConnectionChange();
    }

    /**
     * Disconnect WebSocket
     */
    disconnectWebSocket(): void {
        this.webSocket?.disconnect();
        this.notifyConnectionChange();
    }

    /**
     * Join a WebSocket room (canvas)
     */
    joinRoom(roomId: string): void {
        this.webSocket?.joinRoom(roomId);
    }

    /**
     * Leave a WebSocket room
     */
    leaveRoom(roomId: string): void {
        this.webSocket?.leaveRoom(roomId);
    }

    /**
     * Update presence (for collaboration)
     */
    updatePresence(cursor?: { x: number; y: number }): void {
        this.webSocket?.updatePresence(cursor);
    }

    /**
     * Get shared state from SharedWorker
     */
    async getSharedState<T>(key: string): Promise<T | undefined> {
        return this.sharedWorker?.getSharedState<T>(key);
    }

    /**
     * Set shared state in SharedWorker
     */
    setSharedState(key: string, value: unknown): void {
        this.sharedWorker?.setSharedState(key, value);
    }

    /**
     * Check if initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Shutdown all transports
     */
    shutdown(): void {
        // Unsubscribe all handlers
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        // Disconnect transports
        if (this.broadcastChannel) {
            RuntimeMessageDispatcher.unregisterTransport(this.broadcastChannel.name);
            this.broadcastChannel.disconnect();
            this.broadcastChannel = null;
        }

        if (this.sharedWorker) {
            RuntimeMessageDispatcher.unregisterTransport(this.sharedWorker.name);
            this.sharedWorker.disconnect();
            this.sharedWorker = null;
        }

        if (this.webSocket) {
            RuntimeMessageDispatcher.unregisterTransport(this.webSocket.name);
            this.webSocket.disconnect();
            this.webSocket = null;
        }

        this.eventBus = null;
        this.initialized = false;

        // Clear handlers
        this.tabJoinHandlers.clear();
        this.tabLeaveHandlers.clear();
        this.presenceHandlers.clear();
        this.connectionChangeHandlers.clear();

        console.log('[TransportManager] Shutdown complete');
    }

    /**
     * Get debug information
     */
    getDebugInfo(): object {
        return {
            initialized: this.initialized,
            config: this.config,
            status: this.getStatus(),
            connectedTabs: this.getConnectedTabs(),
            remoteUsers: this.getRemoteUsers(),
            dispatcherStats: RuntimeMessageDispatcher.getStats()
        };
    }
}

/**
 * Singleton instance
 */
export const TransportManager = new TransportManagerClass();

/**
 * Convenience function to initialize transport manager
 */
export async function initializeTransports(
    eventBus: EventBus,
    config?: Partial<TransportManagerConfig>
): Promise<void> {
    await TransportManager.initialize(eventBus, config);
}

/**
 * Convenience function to shutdown transport manager
 */
export function shutdownTransports(): void {
    TransportManager.shutdown();
}
