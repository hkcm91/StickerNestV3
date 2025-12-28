/**
 * StickerNest v2 - SharedWorker Transport
 *
 * Persistent hub for multi-tab communication that:
 * - Survives individual tab closes
 * - Provides centralized message routing
 * - Maintains shared state
 * - Enables "hot handoff" between tabs
 * - Queues messages for offline/reconnecting tabs
 * - Manages tab presence locally
 *
 * Scope: 'device' - all tabs on this device share the same worker
 *
 * Version: 1.0.0
 */

import type { RuntimeTransport } from '../RuntimeMessageDispatcher';
import type { RuntimeMessage } from '../../protocol/runtimeMessage';
import { validateRuntimeMessage } from '../../protocol/runtimeMessage';
import { getTabId, getIdentity } from '../IdentityManager';

/**
 * Worker script path
 */
const WORKER_PATH = '/shared-worker.js';

/**
 * Tab info for presence tracking
 */
export interface TabInfo {
    tabId: string;
    sessionId: string;
    connectedAt: number;
    lastSeen: number;
    canvasId?: string;
    userId?: string;
}

/**
 * Messages sent to the SharedWorker
 */
export type WorkerInboundMessage =
    | { type: 'register'; tabInfo: TabInfo }
    | { type: 'unregister'; tabId: string }
    | { type: 'broadcast'; message: RuntimeMessage }
    | { type: 'send-to-tab'; targetTabId: string; message: RuntimeMessage }
    | { type: 'get-tabs' }
    | { type: 'heartbeat'; tabId: string }
    | { type: 'get-state'; key: string }
    | { type: 'set-state'; key: string; value: unknown }
    | { type: 'queue-message'; targetTabId: string; message: RuntimeMessage };

/**
 * Messages received from the SharedWorker
 */
export type WorkerOutboundMessage =
    | { type: 'registered'; tabId: string; existingTabs: TabInfo[] }
    | { type: 'tab-joined'; tabInfo: TabInfo }
    | { type: 'tab-left'; tabId: string }
    | { type: 'message'; message: RuntimeMessage }
    | { type: 'tabs-list'; tabs: TabInfo[] }
    | { type: 'state-value'; key: string; value: unknown }
    | { type: 'queued-messages'; messages: RuntimeMessage[] }
    | { type: 'error'; error: string };

/**
 * SharedWorker transport for persistent multi-tab hub
 */
export class SharedWorkerTransport implements RuntimeTransport {
    name = 'SharedWorker';
    scope = 'device' as const;

    private worker: SharedWorker | null = null;
    private port: MessagePort | null = null;
    private messageHandlers: Set<(message: RuntimeMessage) => void> = new Set();
    private connected = false;
    private connectedTabs: Map<string, TabInfo> = new Map();
    private tabJoinHandlers: Set<(tabInfo: TabInfo) => void> = new Set();
    private tabLeaveHandlers: Set<(tabId: string) => void> = new Set();
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private messageQueue: RuntimeMessage[] = [];

    /**
     * Check if SharedWorker is supported
     */
    static isSupported(): boolean {
        return typeof SharedWorker !== 'undefined';
    }

    /**
     * Send a message to all other tabs via the worker
     */
    send(message: RuntimeMessage): void {
        if (!this.port || !this.connected) {
            // Queue message for later
            this.messageQueue.push(message);
            console.warn('[SharedWorkerTransport] Queued message - not connected');
            return;
        }

        try {
            const workerMessage: WorkerInboundMessage = {
                type: 'broadcast',
                message
            };
            this.port.postMessage(workerMessage);
        } catch (error) {
            console.error('[SharedWorkerTransport] Send failed:', error);
            this.messageQueue.push(message);
        }
    }

    /**
     * Send a message to a specific tab
     */
    sendToTab(targetTabId: string, message: RuntimeMessage): void {
        if (!this.port || !this.connected) {
            console.warn('[SharedWorkerTransport] Cannot send to tab - not connected');
            return;
        }

        const workerMessage: WorkerInboundMessage = {
            type: 'send-to-tab',
            targetTabId,
            message
        };
        this.port.postMessage(workerMessage);
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
     * Register handler for tab join events
     */
    onTabJoin(handler: (tabInfo: TabInfo) => void): void {
        this.tabJoinHandlers.add(handler);
    }

    /**
     * Register handler for tab leave events
     */
    onTabLeave(handler: (tabId: string) => void): void {
        this.tabLeaveHandlers.add(handler);
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Get list of connected tabs
     */
    getConnectedTabs(): TabInfo[] {
        return Array.from(this.connectedTabs.values());
    }

    /**
     * Get specific tab info
     */
    getTabInfo(tabId: string): TabInfo | undefined {
        return this.connectedTabs.get(tabId);
    }

    /**
     * Connect to the SharedWorker
     */
    async connect(): Promise<void> {
        if (this.connected) {
            console.warn('[SharedWorkerTransport] Already connected');
            return;
        }

        if (!SharedWorkerTransport.isSupported()) {
            console.warn('[SharedWorkerTransport] SharedWorker not supported');
            throw new Error('SharedWorker not supported');
        }

        return new Promise((resolve, reject) => {
            try {
                this.worker = new SharedWorker(WORKER_PATH, {
                    name: 'stickernest-runtime',
                    type: 'module'
                });

                this.port = this.worker.port;

                // Set up message handler
                this.port.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
                    this.handleWorkerMessage(event.data);
                };

                this.port.onmessageerror = (event) => {
                    console.error('[SharedWorkerTransport] Message error:', event);
                };

                // Start the port
                this.port.start();

                // Register this tab with the worker
                const identity = getIdentity();
                const tabInfo: TabInfo = {
                    tabId: identity.tabId,
                    sessionId: identity.sessionId,
                    connectedAt: Date.now(),
                    lastSeen: Date.now(),
                    canvasId: identity.canvasId,
                    userId: identity.userId
                };

                const registerMessage: WorkerInboundMessage = {
                    type: 'register',
                    tabInfo
                };
                this.port.postMessage(registerMessage);

                // Set up heartbeat
                this.startHeartbeat();

                // Handle page unload
                window.addEventListener('beforeunload', this.handleUnload);
                window.addEventListener('pagehide', this.handleUnload);

                // Wait for registration confirmation
                const timeout = setTimeout(() => {
                    if (!this.connected) {
                        reject(new Error('Registration timeout'));
                    }
                }, 5000);

                // Will be cleared when 'registered' message is received
                (this as any)._connectTimeout = timeout;
                (this as any)._connectResolve = resolve;
                (this as any)._connectReject = reject;

            } catch (error) {
                console.error('[SharedWorkerTransport] Connect failed:', error);
                reject(error);
            }
        });
    }

    /**
     * Handle unload event
     */
    private handleUnload = (): void => {
        if (this.port) {
            const unregisterMessage: WorkerInboundMessage = {
                type: 'unregister',
                tabId: getTabId()
            };
            this.port.postMessage(unregisterMessage);
        }
    };

    /**
     * Start heartbeat interval
     */
    private startHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.port && this.connected) {
                const heartbeatMessage: WorkerInboundMessage = {
                    type: 'heartbeat',
                    tabId: getTabId()
                };
                this.port.postMessage(heartbeatMessage);
            }
        }, 5000); // Every 5 seconds
    }

    /**
     * Disconnect from the SharedWorker
     */
    disconnect(): void {
        window.removeEventListener('beforeunload', this.handleUnload);
        window.removeEventListener('pagehide', this.handleUnload);

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.port) {
            this.handleUnload();
            this.port.close();
            this.port = null;
        }

        this.worker = null;
        this.connected = false;
        this.connectedTabs.clear();
        this.messageHandlers.clear();
        this.tabJoinHandlers.clear();
        this.tabLeaveHandlers.clear();

        console.log('[SharedWorkerTransport] Disconnected');
    }

    /**
     * Handle messages from the SharedWorker
     */
    private handleWorkerMessage(data: WorkerOutboundMessage): void {
        switch (data.type) {
            case 'registered':
                this.handleRegistered(data);
                break;

            case 'tab-joined':
                this.handleTabJoined(data.tabInfo);
                break;

            case 'tab-left':
                this.handleTabLeft(data.tabId);
                break;

            case 'message':
                this.handleRuntimeMessage(data.message);
                break;

            case 'tabs-list':
                this.handleTabsList(data.tabs);
                break;

            case 'queued-messages':
                this.handleQueuedMessages(data.messages);
                break;

            case 'error':
                console.error('[SharedWorkerTransport] Worker error:', data.error);
                break;
        }
    }

    /**
     * Handle registration confirmation
     */
    private handleRegistered(data: { tabId: string; existingTabs: TabInfo[] }): void {
        this.connected = true;

        // Populate connected tabs
        data.existingTabs.forEach(tab => {
            this.connectedTabs.set(tab.tabId, tab);
        });

        console.log('[SharedWorkerTransport] Registered. Connected tabs:', this.connectedTabs.size);

        // Clear connection timeout and resolve promise
        if ((this as any)._connectTimeout) {
            clearTimeout((this as any)._connectTimeout);
            delete (this as any)._connectTimeout;
        }
        if ((this as any)._connectResolve) {
            (this as any)._connectResolve();
            delete (this as any)._connectResolve;
            delete (this as any)._connectReject;
        }

        // Flush queued messages
        this.flushMessageQueue();
    }

    /**
     * Flush queued messages
     */
    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                this.send(message);
            }
        }
    }

    /**
     * Handle tab joined event
     */
    private handleTabJoined(tabInfo: TabInfo): void {
        this.connectedTabs.set(tabInfo.tabId, tabInfo);

        this.tabJoinHandlers.forEach(handler => {
            try {
                handler(tabInfo);
            } catch (error) {
                console.error('[SharedWorkerTransport] Tab join handler error:', error);
            }
        });
    }

    /**
     * Handle tab left event
     */
    private handleTabLeft(tabId: string): void {
        this.connectedTabs.delete(tabId);

        this.tabLeaveHandlers.forEach(handler => {
            try {
                handler(tabId);
            } catch (error) {
                console.error('[SharedWorkerTransport] Tab leave handler error:', error);
            }
        });
    }

    /**
     * Handle runtime message from another tab
     */
    private handleRuntimeMessage(message: unknown): void {
        const result = validateRuntimeMessage(message);

        if (!result.success) {
            console.warn('[SharedWorkerTransport] Invalid message received:', result.error);
            return;
        }

        const validMessage = result.data;

        this.messageHandlers.forEach(handler => {
            try {
                handler(validMessage);
            } catch (error) {
                console.error('[SharedWorkerTransport] Handler error:', error);
            }
        });
    }

    /**
     * Handle tabs list update
     */
    private handleTabsList(tabs: TabInfo[]): void {
        this.connectedTabs.clear();
        tabs.forEach(tab => {
            this.connectedTabs.set(tab.tabId, tab);
        });
    }

    /**
     * Handle queued messages (sent when reconnecting)
     */
    private handleQueuedMessages(messages: RuntimeMessage[]): void {
        messages.forEach(message => {
            this.handleRuntimeMessage(message);
        });
    }

    /**
     * Request shared state from worker
     */
    async getSharedState<T>(key: string): Promise<T | undefined> {
        if (!this.port || !this.connected) {
            return undefined;
        }

        return new Promise((resolve) => {
            const handler = (event: MessageEvent<WorkerOutboundMessage>) => {
                if (event.data.type === 'state-value' && event.data.key === key) {
                    this.port?.removeEventListener('message', handler);
                    resolve(event.data.value as T);
                }
            };

            this.port!.addEventListener('message', handler);

            const getMessage: WorkerInboundMessage = {
                type: 'get-state',
                key
            };
            this.port!.postMessage(getMessage);

            // Timeout after 1 second
            setTimeout(() => {
                this.port?.removeEventListener('message', handler);
                resolve(undefined);
            }, 1000);
        });
    }

    /**
     * Set shared state in worker
     */
    setSharedState(key: string, value: unknown): void {
        if (!this.port || !this.connected) {
            return;
        }

        const setMessage: WorkerInboundMessage = {
            type: 'set-state',
            key,
            value
        };
        this.port.postMessage(setMessage);
    }

    /**
     * Get transport statistics
     */
    getStats(): {
        name: string;
        connected: boolean;
        connectedTabs: number;
        handlerCount: number;
        queuedMessages: number;
    } {
        return {
            name: this.name,
            connected: this.connected,
            connectedTabs: this.connectedTabs.size,
            handlerCount: this.messageHandlers.size,
            queuedMessages: this.messageQueue.length
        };
    }
}

/**
 * Create and connect a SharedWorker transport
 */
export async function createSharedWorkerTransport(): Promise<SharedWorkerTransport | null> {
    if (!SharedWorkerTransport.isSupported()) {
        console.warn('[SharedWorkerTransport] Not supported in this environment');
        return null;
    }

    const transport = new SharedWorkerTransport();

    try {
        await transport.connect();
        return transport;
    } catch (error) {
        console.error('[SharedWorkerTransport] Failed to create transport:', error);
        return null;
    }
}
