/**
 * StickerNest v2 - Runtime Message Dispatcher
 *
 * Central hub for dispatching RuntimeMessages across contexts.
 * This is the single module that:
 * - Sends messages to appropriate transports (BroadcastChannel, SharedWorker, WebSocket)
 * - Receives messages from transports and routes them
 * - Integrates with EventBus
 * - Applies sync policies
 * - Enforces loop guards
 *
 * Version: 1.0.0
 */

import {
    RuntimeMessage,
    RuntimeMessageChannel,
    RuntimeMessageTarget,
    RuntimeMessageTypes,
    createRuntimeMessage,
    shouldProcessMessage,
    markMessageSeen,
    validateRuntimeMessage
} from '../protocol/runtimeMessage';
import { IdentityManager, getIdentity, getTabId } from './IdentityManager';
import {
    SyncScope,
    PolicyRegistry
} from '../protocol/syncPolicies';

/**
 * Transport interface - implemented by BroadcastChannel, SharedWorker, WebSocket adapters
 */
export interface RuntimeTransport {
    /** Transport name for debugging */
    name: string;

    /** Scope this transport covers */
    scope: SyncScope;

    /** Send a message through this transport */
    send(message: RuntimeMessage): void;

    /** Register a handler for incoming messages */
    onMessage(handler: (message: RuntimeMessage) => void): void;

    /** Unregister a message handler (optional - may be a no-op) */
    offMessage?(handler: (message: RuntimeMessage) => void): void;

    /** Check if transport is connected */
    isConnected(): boolean;

    /** Connect the transport */
    connect(): Promise<void>;

    /** Disconnect the transport */
    disconnect(): void;
}

/**
 * Message handler function type
 */
type MessageHandler = (message: RuntimeMessage) => void;

/**
 * Throttle tracker
 */
interface ThrottleState {
    lastSent: number;
    pending: RuntimeMessage | null;
    timeoutId: ReturnType<typeof setTimeout> | null;
}

/**
 * RuntimeMessageDispatcher class
 *
 * Singleton that manages all inter-context communication.
 */
class RuntimeMessageDispatcherClass {
    private transports: Map<string, RuntimeTransport> = new Map();
    private handlers: Map<RuntimeMessageChannel, Set<MessageHandler>> = new Map();
    private wildcardHandlers: Set<MessageHandler> = new Set();
    private throttleState: Map<string, ThrottleState> = new Map();
    private messageLog: RuntimeMessage[] = [];
    private maxLogSize: number = 1000;
    private initialized: boolean = false;

    /**
     * Initialize the dispatcher
     */
    initialize(): void {
        if (this.initialized) {
            console.warn('[RuntimeMessageDispatcher] Already initialized');
            return;
        }

        // Ensure IdentityManager is initialized
        IdentityManager.initialize();

        this.initialized = true;
        console.log('[RuntimeMessageDispatcher] Initialized');
    }

    /**
     * Register a transport
     */
    registerTransport(transport: RuntimeTransport): void {
        if (this.transports.has(transport.name)) {
            console.warn(`[RuntimeMessageDispatcher] Transport ${transport.name} already registered`);
            return;
        }

        this.transports.set(transport.name, transport);

        // Set up message handling for incoming messages
        transport.onMessage((message) => {
            this.handleIncomingMessage(message, transport.name);
        });

        console.log(`[RuntimeMessageDispatcher] Registered transport: ${transport.name}`);
    }

    /**
     * Unregister a transport
     */
    unregisterTransport(name: string): void {
        const transport = this.transports.get(name);
        if (transport) {
            transport.disconnect();
            this.transports.delete(name);
            console.log(`[RuntimeMessageDispatcher] Unregistered transport: ${name}`);
        }
    }

    /**
     * Subscribe to messages on a specific channel
     */
    subscribe(channel: RuntimeMessageChannel, handler: MessageHandler): () => void {
        if (!this.handlers.has(channel)) {
            this.handlers.set(channel, new Set());
        }
        this.handlers.get(channel)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.handlers.get(channel)?.delete(handler);
        };
    }

    /**
     * Subscribe to ALL messages (wildcard)
     */
    subscribeAll(handler: MessageHandler): () => void {
        this.wildcardHandlers.add(handler);
        return () => {
            this.wildcardHandlers.delete(handler);
        };
    }

    /**
     * Dispatch a message
     */
    dispatch(params: {
        target: RuntimeMessageTarget;
        channel: RuntimeMessageChannel;
        type: string;
        payload: unknown;
        targetId?: string;
        requestId?: string;
        ttl?: number;
        priority?: number;
    }): RuntimeMessage {
        const message = createRuntimeMessage({
            source: 'tab',
            target: params.target,
            targetId: params.targetId,
            channel: params.channel,
            type: params.type,
            payload: params.payload,
            identity: getIdentity(),
            requestId: params.requestId,
            ttl: params.ttl,
            priority: params.priority
        });

        // Log the message
        this.logMessage(message);

        // Process locally first
        this.processMessageLocally(message);

        // Then send to transports based on sync policies
        this.sendToTransports(message);

        return message;
    }

    /**
     * Dispatch an event (convenience method for event channel)
     */
    dispatchEvent(type: string, payload: unknown, target: RuntimeMessageTarget = 'broadcast'): RuntimeMessage {
        return this.dispatch({
            target,
            channel: 'events',
            type: RuntimeMessageTypes.EMIT_EVENT,
            payload: { eventType: type, eventPayload: payload }
        });
    }

    /**
     * Handle incoming message from a transport
     */
    private handleIncomingMessage(message: RuntimeMessage, transportName: string): void {
        // Validate message
        const validation = validateRuntimeMessage(message);
        if (!validation.success) {
            console.warn(`[RuntimeMessageDispatcher] Invalid message from ${transportName}:`, validation.error);
            return;
        }

        const currentTabId = getTabId();

        // Check loop guard
        if (!shouldProcessMessage(message, currentTabId)) {
            // Already seen or expired - don't process
            return;
        }

        // Log the message
        this.logMessage(message);

        // Process the message locally
        this.processMessageLocally(message);

        // Forward to other transports if needed (with updated loop guard)
        const forwardMessage = markMessageSeen(message, currentTabId);
        this.forwardToOtherTransports(forwardMessage, transportName);
    }

    /**
     * Process a message locally (call handlers)
     */
    private processMessageLocally(message: RuntimeMessage): void {
        // Call channel-specific handlers
        const channelHandlers = this.handlers.get(message.channel);
        if (channelHandlers) {
            for (const handler of channelHandlers) {
                try {
                    handler(message);
                } catch (e) {
                    console.error('[RuntimeMessageDispatcher] Handler error:', e);
                }
            }
        }

        // Call wildcard handlers
        for (const handler of this.wildcardHandlers) {
            try {
                handler(message);
            } catch (e) {
                console.error('[RuntimeMessageDispatcher] Wildcard handler error:', e);
            }
        }
    }

    /**
     * Send message to appropriate transports based on sync policies
     */
    private sendToTransports(message: RuntimeMessage): void {
        // Determine which scope this message should sync to
        let targetScope: SyncScope = 'local';

        if (message.channel === 'events') {
            const eventPayload = message.payload as { eventType?: string };
            if (eventPayload?.eventType) {
                const policy = PolicyRegistry.getEventPolicy(eventPayload.eventType);
                if (policy.syncToCanvasUsers) {
                    targetScope = 'canvas';
                } else if (policy.syncAcrossDevices) {
                    targetScope = 'user';
                } else if (policy.syncAcrossTabs) {
                    targetScope = 'device';
                }

                // Apply throttling if configured
                if (policy.throttleMs > 0) {
                    if (!this.shouldSendThrottled(eventPayload.eventType, message, policy.throttleMs)) {
                        return;
                    }
                }
            }
        } else {
            // Non-event channels - use target to determine scope
            switch (message.target) {
                case 'broadcast':
                    targetScope = 'device';
                    break;
                case 'canvas':
                    targetScope = 'canvas';
                    break;
                default:
                    targetScope = 'device';
            }
        }

        // Send to transports that match or exceed the target scope
        const scopePriority: Record<SyncScope, number> = {
            'local': 0,
            'device': 1,
            'user': 2,
            'canvas': 3,
            'global': 4
        };

        for (const [name, transport] of this.transports) {
            if (
                transport.isConnected() &&
                scopePriority[transport.scope] >= scopePriority[targetScope] &&
                targetScope !== 'local'
            ) {
                try {
                    transport.send(message);
                } catch (e) {
                    console.error(`[RuntimeMessageDispatcher] Failed to send to ${name}:`, e);
                }
            }
        }
    }

    /**
     * Forward message to other transports (for mesh networking)
     */
    private forwardToOtherTransports(message: RuntimeMessage, sourceTransport: string): void {
        for (const [name, transport] of this.transports) {
            if (name !== sourceTransport && transport.isConnected()) {
                // Only forward if the transport scope allows it
                // This prevents unnecessary forwarding
                try {
                    transport.send(message);
                } catch (e) {
                    console.error(`[RuntimeMessageDispatcher] Failed to forward to ${name}:`, e);
                }
            }
        }
    }

    /**
     * Check if a throttled message should be sent
     */
    private shouldSendThrottled(key: string, message: RuntimeMessage, throttleMs: number): boolean {
        const now = Date.now();
        let state = this.throttleState.get(key);

        if (!state) {
            state = { lastSent: 0, pending: null, timeoutId: null };
            this.throttleState.set(key, state);
        }

        const timeSinceLastSend = now - state.lastSent;

        if (timeSinceLastSend >= throttleMs) {
            // Enough time has passed, send immediately
            state.lastSent = now;
            return true;
        }

        // Store as pending and schedule
        state.pending = message;

        if (!state.timeoutId) {
            state.timeoutId = setTimeout(() => {
                const pendingMessage = state!.pending;
                state!.pending = null;
                state!.timeoutId = null;
                state!.lastSent = Date.now();

                if (pendingMessage) {
                    this.sendToTransports(pendingMessage);
                }
            }, throttleMs - timeSinceLastSend);
        }

        return false;
    }

    /**
     * Log a message for debugging
     */
    private logMessage(message: RuntimeMessage): void {
        this.messageLog.push(message);
        if (this.messageLog.length > this.maxLogSize) {
            this.messageLog.shift();
        }
    }

    /**
     * Get message log (for debugging)
     */
    getMessageLog(): RuntimeMessage[] {
        return [...this.messageLog];
    }

    /**
     * Clear message log
     */
    clearMessageLog(): void {
        this.messageLog = [];
    }

    /**
     * Get all registered transports
     */
    getTransports(): Map<string, RuntimeTransport> {
        return new Map(this.transports);
    }

    /**
     * Check if a specific transport is connected
     */
    isTransportConnected(name: string): boolean {
        const transport = this.transports.get(name);
        return transport?.isConnected() ?? false;
    }

    /**
     * Connect all transports
     */
    async connectAll(): Promise<void> {
        const promises: Promise<void>[] = [];
        for (const transport of this.transports.values()) {
            promises.push(transport.connect().catch(e => {
                console.error(`[RuntimeMessageDispatcher] Failed to connect ${transport.name}:`, e);
            }));
        }
        await Promise.all(promises);
    }

    /**
     * Disconnect all transports
     */
    disconnectAll(): void {
        for (const transport of this.transports.values()) {
            transport.disconnect();
        }
    }

    /**
     * Get dispatcher stats for debugging
     */
    getStats(): {
        transports: Array<{ name: string; scope: SyncScope; connected: boolean }>;
        handlers: { [channel: string]: number };
        wildcardHandlers: number;
        messageLogSize: number;
    } {
        const transportStats: Array<{ name: string; scope: SyncScope; connected: boolean }> = [];
        for (const [name, transport] of this.transports) {
            transportStats.push({
                name,
                scope: transport.scope,
                connected: transport.isConnected()
            });
        }

        const handlerStats: { [channel: string]: number } = {};
        for (const [channel, handlers] of this.handlers) {
            handlerStats[channel] = handlers.size;
        }

        return {
            transports: transportStats,
            handlers: handlerStats,
            wildcardHandlers: this.wildcardHandlers.size,
            messageLogSize: this.messageLog.length
        };
    }
}

/**
 * Singleton instance
 */
export const RuntimeMessageDispatcher = new RuntimeMessageDispatcherClass();

/**
 * Initialize on module load
 */
if (typeof window !== 'undefined') {
    RuntimeMessageDispatcher.initialize();
}
