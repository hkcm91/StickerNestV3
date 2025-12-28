/**
 * StickerNest v2 - WebSocket Transport
 *
 * Real-time multi-device and multi-user communication that enables:
 * - Cross-device sync for single user
 * - Multi-user collaboration on shared canvases
 * - Cloud presence and cursor sharing
 * - Mobile ↔ desktop continuity
 *
 * Scope: 'user' or 'canvas' depending on configuration
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing during disconnection
 * - Room-based channel subscriptions
 * - Presence heartbeats
 * - Lag compensation metadata
 *
 * Version: 1.0.0
 */

import type { RuntimeTransport } from '../RuntimeMessageDispatcher';
import type { RuntimeMessage } from '../../protocol/runtimeMessage';
import { validateRuntimeMessage } from '../../protocol/runtimeMessage';
import { getIdentity, getTabId } from '../IdentityManager';
import type { SyncScope } from '../../protocol/syncPolicies';

/**
 * WebSocket connection configuration
 */
export interface WebSocketConfig {
    /** WebSocket server URL */
    url: string;
    /** Authentication token */
    authToken?: string;
    /** Canvas ID for room-based sync */
    canvasId?: string;
    /** Enable automatic reconnection */
    autoReconnect?: boolean;
    /** Max reconnection attempts (0 = unlimited) */
    maxReconnectAttempts?: number;
    /** Initial reconnection delay in ms */
    reconnectDelay?: number;
    /** Max reconnection delay in ms */
    maxReconnectDelay?: number;
    /** Heartbeat interval in ms */
    heartbeatInterval?: number;
    /** Connection timeout in ms */
    connectionTimeout?: number;
}

/**
 * WebSocket message types (wire protocol)
 */
export type WSMessageType =
    | 'auth'
    | 'auth_success'
    | 'auth_failed'
    | 'join_room'
    | 'leave_room'
    | 'room_joined'
    | 'room_left'
    | 'broadcast'
    | 'direct'
    | 'presence_update'
    | 'presence_list'
    | 'heartbeat'
    | 'heartbeat_ack'
    | 'error';

/**
 * WebSocket wire message format
 */
export interface WSMessage {
    type: WSMessageType;
    payload?: unknown;
    roomId?: string;
    targetUserId?: string;
    timestamp?: number;
}

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

/**
 * Remote user presence info
 */
export interface RemoteUserPresence {
    userId: string;
    deviceId: string;
    tabId: string;
    displayName?: string;
    canvasId?: string;
    cursor?: { x: number; y: number };
    lastSeen: number;
    connectionLatency?: number;
}

/**
 * WebSocket transport for multi-device/multi-user sync
 */
export class WebSocketTransport implements RuntimeTransport {
    name = 'WebSocket';
    scope: SyncScope = 'user';

    private config: Required<WebSocketConfig>;
    private socket: WebSocket | null = null;
    private connectionState: ConnectionState = 'disconnected';
    private messageHandlers: Set<(message: RuntimeMessage) => void> = new Set();
    private presenceHandlers: Set<(users: RemoteUserPresence[]) => void> = new Set();
    private reconnectAttempts = 0;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private lastHeartbeatAck: number = 0;
    private messageQueue: RuntimeMessage[] = [];
    private joinedRooms: Set<string> = new Set();
    private remoteUsers: Map<string, RemoteUserPresence> = new Map();
    private serverTimeOffset: number = 0;

    constructor(config: WebSocketConfig) {
        this.config = {
            url: config.url,
            authToken: config.authToken || '',
            canvasId: config.canvasId || '',
            autoReconnect: config.autoReconnect ?? true,
            maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
            reconnectDelay: config.reconnectDelay ?? 1000,
            maxReconnectDelay: config.maxReconnectDelay ?? 30000,
            heartbeatInterval: config.heartbeatInterval ?? 30000,
            connectionTimeout: config.connectionTimeout ?? 10000
        };

        // Set scope based on whether we have a canvasId
        this.scope = config.canvasId ? 'canvas' : 'user';
    }

    /**
     * Send a message to the server for distribution
     */
    send(message: RuntimeMessage): void {
        if (this.connectionState !== 'connected' || !this.socket) {
            this.messageQueue.push(message);
            console.warn('[WebSocketTransport] Queued message - not connected');
            return;
        }

        const wsMessage: WSMessage = {
            type: 'broadcast',
            payload: message,
            roomId: this.config.canvasId || undefined,
            timestamp: Date.now()
        };

        try {
            this.socket.send(JSON.stringify(wsMessage));
        } catch (error) {
            console.error('[WebSocketTransport] Send failed:', error);
            this.messageQueue.push(message);
        }
    }

    /**
     * Send a direct message to a specific user
     */
    sendToUser(userId: string, message: RuntimeMessage): void {
        if (this.connectionState !== 'connected' || !this.socket) {
            console.warn('[WebSocketTransport] Cannot send direct message - not connected');
            return;
        }

        const wsMessage: WSMessage = {
            type: 'direct',
            payload: message,
            targetUserId: userId,
            timestamp: Date.now()
        };

        this.socket.send(JSON.stringify(wsMessage));
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
     * Register a presence update handler
     */
    onPresenceUpdate(handler: (users: RemoteUserPresence[]) => void): void {
        this.presenceHandlers.add(handler);
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connectionState === 'connected';
    }

    /**
     * Get current connection state
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Get list of remote users
     */
    getRemoteUsers(): RemoteUserPresence[] {
        return Array.from(this.remoteUsers.values());
    }

    /**
     * Connect to the WebSocket server
     */
    async connect(): Promise<void> {
        if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
            console.warn('[WebSocketTransport] Already connected or connecting');
            return;
        }

        this.connectionState = 'connecting';

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (this.connectionState === 'connecting') {
                    this.connectionState = 'failed';
                    reject(new Error('Connection timeout'));
                }
            }, this.config.connectionTimeout);

            try {
                // SECURITY: Do NOT add auth token to URL - it would be visible in
                // browser history, server logs, and proxy logs. Token is sent
                // securely via WebSocket 'auth' message after connection opens.
                const url = this.config.url;

                this.socket = new WebSocket(url);

                this.socket.onopen = () => {
                    clearTimeout(timeout);
                    this.handleOpen();
                    resolve();
                };

                this.socket.onclose = (event) => {
                    this.handleClose(event);
                };

                this.socket.onerror = (event) => {
                    clearTimeout(timeout);
                    this.handleError(event);
                    if (this.connectionState === 'connecting') {
                        reject(new Error('Connection failed'));
                    }
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(event);
                };

            } catch (error) {
                clearTimeout(timeout);
                this.connectionState = 'failed';
                reject(error);
            }
        });
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect(): void {
        this.connectionState = 'disconnected';

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.socket) {
            this.socket.close(1000, 'Client disconnect');
            this.socket = null;
        }

        this.joinedRooms.clear();
        this.remoteUsers.clear();
        this.messageHandlers.clear();
        this.presenceHandlers.clear();

        console.log('[WebSocketTransport] Disconnected');
    }

    /**
     * Join a room (canvas)
     */
    joinRoom(roomId: string): void {
        if (!this.socket || this.connectionState !== 'connected') {
            console.warn('[WebSocketTransport] Cannot join room - not connected');
            return;
        }

        const wsMessage: WSMessage = {
            type: 'join_room',
            roomId,
            payload: {
                identity: getIdentity()
            }
        };

        this.socket.send(JSON.stringify(wsMessage));
    }

    /**
     * Leave a room
     */
    leaveRoom(roomId: string): void {
        if (!this.socket || this.connectionState !== 'connected') {
            return;
        }

        const wsMessage: WSMessage = {
            type: 'leave_room',
            roomId
        };

        this.socket.send(JSON.stringify(wsMessage));
        this.joinedRooms.delete(roomId);
    }

    /**
     * Update presence (cursor position, etc.)
     */
    updatePresence(cursor?: { x: number; y: number }): void {
        if (!this.socket || this.connectionState !== 'connected') {
            return;
        }

        const wsMessage: WSMessage = {
            type: 'presence_update',
            roomId: this.config.canvasId || undefined,
            payload: {
                identity: getIdentity(),
                cursor,
                timestamp: Date.now()
            }
        };

        this.socket.send(JSON.stringify(wsMessage));
    }

    /**
     * Handle WebSocket open
     */
    private handleOpen(): void {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;

        console.log('[WebSocketTransport] Connected to', this.config.url);

        // Authenticate if we have a token
        if (this.config.authToken) {
            this.authenticate();
        }

        // Auto-join canvas room if configured
        if (this.config.canvasId) {
            this.joinRoom(this.config.canvasId);
        }

        // Start heartbeat
        this.startHeartbeat();

        // Flush queued messages
        this.flushMessageQueue();
    }

    /**
     * Handle WebSocket close
     */
    private handleClose(event: CloseEvent): void {
        const wasConnected = this.connectionState === 'connected';
        this.connectionState = 'disconnected';

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        console.log('[WebSocketTransport] Disconnected:', event.code, event.reason);

        // Attempt reconnection if configured and not a clean close
        if (this.config.autoReconnect && event.code !== 1000 && wasConnected) {
            this.attemptReconnect();
        }
    }

    /**
     * Handle WebSocket error
     */
    private handleError(event: Event): void {
        console.error('[WebSocketTransport] Error:', event);
    }

    /**
     * Handle incoming WebSocket message
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const wsMessage: WSMessage = JSON.parse(event.data);
            this.processWSMessage(wsMessage);
        } catch (error) {
            console.error('[WebSocketTransport] Failed to parse message:', error);
        }
    }

    /**
     * Process a WebSocket protocol message
     */
    private processWSMessage(wsMessage: WSMessage): void {
        switch (wsMessage.type) {
            case 'auth_success':
                console.log('[WebSocketTransport] Authentication successful');
                break;

            case 'auth_failed':
                console.error('[WebSocketTransport] Authentication failed');
                this.disconnect();
                break;

            case 'room_joined':
                this.joinedRooms.add(wsMessage.roomId!);
                console.log('[WebSocketTransport] Joined room:', wsMessage.roomId);
                break;

            case 'room_left':
                this.joinedRooms.delete(wsMessage.roomId!);
                console.log('[WebSocketTransport] Left room:', wsMessage.roomId);
                break;

            case 'broadcast':
            case 'direct':
                this.handleRuntimeMessage(wsMessage.payload);
                break;

            case 'presence_update':
            case 'presence_list':
                this.handlePresenceMessage(wsMessage.payload);
                break;

            case 'heartbeat_ack':
                this.lastHeartbeatAck = Date.now();
                // Calculate server time offset for lag compensation
                if (wsMessage.timestamp) {
                    this.serverTimeOffset = Date.now() - wsMessage.timestamp;
                }
                break;

            case 'error':
                console.error('[WebSocketTransport] Server error:', wsMessage.payload);
                break;
        }
    }

    /**
     * Handle a runtime message from the server
     */
    private handleRuntimeMessage(payload: unknown): void {
        const result = validateRuntimeMessage(payload);

        if (!result.success) {
            console.warn('[WebSocketTransport] Invalid runtime message:', result.error);
            return;
        }

        const message = result.data;

        // Don't process our own messages
        if (message.identity.tabId === getTabId()) {
            return;
        }

        this.messageHandlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                console.error('[WebSocketTransport] Handler error:', error);
            }
        });
    }

    /**
     * Handle presence update from server
     */
    private handlePresenceMessage(payload: unknown): void {
        if (!payload || typeof payload !== 'object') return;

        const data = payload as {
            users?: RemoteUserPresence[];
            user?: RemoteUserPresence;
            left?: string;
        };

        // Full presence list
        if (data.users) {
            this.remoteUsers.clear();
            data.users.forEach(user => {
                // Don't include ourselves
                if (user.tabId !== getTabId()) {
                    this.remoteUsers.set(user.userId + '-' + user.tabId, user);
                }
            });
        }

        // Single user update
        if (data.user && data.user.tabId !== getTabId()) {
            this.remoteUsers.set(data.user.userId + '-' + data.user.tabId, data.user);
        }

        // User left
        if (data.left) {
            // Remove all entries for this user
            for (const key of this.remoteUsers.keys()) {
                if (key.startsWith(data.left + '-')) {
                    this.remoteUsers.delete(key);
                }
            }
        }

        // Notify presence handlers
        const users = this.getRemoteUsers();
        this.presenceHandlers.forEach(handler => {
            try {
                handler(users);
            } catch (error) {
                console.error('[WebSocketTransport] Presence handler error:', error);
            }
        });
    }

    /**
     * Authenticate with the server
     */
    private authenticate(): void {
        if (!this.socket) return;

        const wsMessage: WSMessage = {
            type: 'auth',
            payload: {
                token: this.config.authToken,
                identity: getIdentity()
            }
        };

        this.socket.send(JSON.stringify(wsMessage));
    }

    /**
     * Start heartbeat interval
     */
    private startHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.lastHeartbeatAck = Date.now();

        this.heartbeatInterval = setInterval(() => {
            if (!this.socket || this.connectionState !== 'connected') {
                return;
            }

            // Check if we missed too many heartbeats
            if (Date.now() - this.lastHeartbeatAck > this.config.heartbeatInterval * 3) {
                console.warn('[WebSocketTransport] Heartbeat timeout - reconnecting');
                this.socket.close();
                return;
            }

            const wsMessage: WSMessage = {
                type: 'heartbeat',
                timestamp: Date.now()
            };

            this.socket.send(JSON.stringify(wsMessage));
        }, this.config.heartbeatInterval);
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    private attemptReconnect(): void {
        if (
            this.config.maxReconnectAttempts > 0 &&
            this.reconnectAttempts >= this.config.maxReconnectAttempts
        ) {
            console.error('[WebSocketTransport] Max reconnection attempts reached');
            this.connectionState = 'failed';
            return;
        }

        this.connectionState = 'reconnecting';
        this.reconnectAttempts++;

        // Exponential backoff with jitter
        const delay = Math.min(
            this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) +
            Math.random() * 1000,
            this.config.maxReconnectDelay
        );

        console.log(`[WebSocketTransport] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error('[WebSocketTransport] Reconnection failed:', error);
                this.attemptReconnect();
            }
        }, delay);
    }

    /**
     * Flush queued messages
     */
    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0 && this.connectionState === 'connected') {
            const message = this.messageQueue.shift();
            if (message) {
                this.send(message);
            }
        }
    }

    /**
     * Get transport statistics
     */
    getStats(): {
        name: string;
        connected: boolean;
        state: ConnectionState;
        reconnectAttempts: number;
        joinedRooms: number;
        remoteUsers: number;
        queuedMessages: number;
        serverTimeOffset: number;
    } {
        return {
            name: this.name,
            connected: this.isConnected(),
            state: this.connectionState,
            reconnectAttempts: this.reconnectAttempts,
            joinedRooms: this.joinedRooms.size,
            remoteUsers: this.remoteUsers.size,
            queuedMessages: this.messageQueue.length,
            serverTimeOffset: this.serverTimeOffset
        };
    }
}

/**
 * Create a WebSocket transport (does not auto-connect)
 */
export function createWebSocketTransport(config: WebSocketConfig): WebSocketTransport {
    return new WebSocketTransport(config);
}
