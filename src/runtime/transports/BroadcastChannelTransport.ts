/**
 * StickerNest v2 - BroadcastChannel Transport
 *
 * Implements tab-to-tab communication for same-origin contexts.
 * Uses the BroadcastChannel API for real-time message passing between tabs.
 *
 * Scope: 'device' - only tabs on the same device/browser
 *
 * Version: 1.0.0
 */

import type { RuntimeTransport } from '../RuntimeMessageDispatcher';
import type { RuntimeMessage } from '../../protocol/runtimeMessage';
import { validateRuntimeMessage } from '../../protocol/runtimeMessage';

/**
 * Channel name for StickerNest runtime messages
 */
const CHANNEL_NAME = 'stickernest_runtime';

/**
 * BroadcastChannel transport for tab-to-tab sync
 */
export class BroadcastChannelTransport implements RuntimeTransport {
    name = 'BroadcastChannel';
    scope = 'device' as const;

    private channel: BroadcastChannel | null = null;
    private messageHandlers: Set<(message: RuntimeMessage) => void> = new Set();
    private connected = false;

    /**
     * Check if BroadcastChannel is supported in this environment
     */
    static isSupported(): boolean {
        return typeof BroadcastChannel !== 'undefined';
    }

    /**
     * Send a message to all other tabs
     */
    send(message: RuntimeMessage): void {
        if (!this.channel || !this.connected) {
            console.warn('[BroadcastChannelTransport] Cannot send - not connected');
            return;
        }

        try {
            // Debug: Log social events being sent
            const payload = message.payload as { eventType?: string };
            if (payload?.eventType?.startsWith('social:')) {
                console.log('[BroadcastChannel] 📤 SENDING social event to other tabs:', payload.eventType);
            }

            // BroadcastChannel automatically serializes to JSON
            this.channel.postMessage(message);
        } catch (error) {
            console.error('[BroadcastChannelTransport] Send failed:', error);
        }
    }

    /**
     * Register a message handler
     */
    onMessage(handler: (message: RuntimeMessage) => void): void {
        this.messageHandlers.add(handler);
    }

    /**
     * Unregister a message handler
     */
    offMessage(handler: (message: RuntimeMessage) => void): void {
        this.messageHandlers.delete(handler);
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Connect to the broadcast channel
     */
    async connect(): Promise<void> {
        if (this.connected) {
            console.warn('[BroadcastChannelTransport] Already connected');
            return;
        }

        if (!BroadcastChannelTransport.isSupported()) {
            console.warn('[BroadcastChannelTransport] BroadcastChannel not supported');
            return;
        }

        try {
            this.channel = new BroadcastChannel(CHANNEL_NAME);

            // Handle incoming messages
            this.channel.onmessage = (event: MessageEvent) => {
                this.handleIncomingMessage(event.data);
            };

            // Handle errors
            this.channel.onmessageerror = (event: MessageEvent) => {
                console.error('[BroadcastChannelTransport] Message error:', event);
            };

            this.connected = true;
            console.log('[BroadcastChannelTransport] Connected to channel:', CHANNEL_NAME);
        } catch (error) {
            console.error('[BroadcastChannelTransport] Connect failed:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the broadcast channel
     */
    disconnect(): void {
        if (this.channel) {
            this.channel.close();
            this.channel = null;
        }
        this.connected = false;
        this.messageHandlers.clear();
        console.log('[BroadcastChannelTransport] Disconnected');
    }

    /**
     * Handle incoming message from other tabs
     */
    private handleIncomingMessage(data: unknown): void {
        // Validate the message
        const result = validateRuntimeMessage(data);

        if (!result.success) {
            console.warn('[BroadcastChannelTransport] Invalid message received:', result.error);
            return;
        }

        const message = result.data;

        // Debug: Log received social events
        const payload = message.payload as { eventType?: string };
        if (payload?.eventType?.startsWith('social:')) {
            console.log('[BroadcastChannel] 📥 RECEIVED social event from other tab:', payload.eventType);
        }

        // Notify all handlers
        this.messageHandlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                console.error('[BroadcastChannelTransport] Handler error:', error);
            }
        });
    }

    /**
     * Get transport statistics
     */
    getStats(): { name: string; connected: boolean; handlerCount: number } {
        return {
            name: this.name,
            connected: this.connected,
            handlerCount: this.messageHandlers.size
        };
    }
}

/**
 * Create and connect a BroadcastChannel transport
 */
export async function createBroadcastChannelTransport(): Promise<BroadcastChannelTransport | null> {
    if (!BroadcastChannelTransport.isSupported()) {
        console.warn('[BroadcastChannelTransport] Not supported in this environment');
        return null;
    }

    const transport = new BroadcastChannelTransport();
    await transport.connect();
    return transport;
}
