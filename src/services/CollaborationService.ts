/**
 * StickerNest v2 - Collaboration Service
 * =======================================
 *
 * Bridges WebSocket real-time communication with the collaboration store.
 * Handles multi-user editing, presence, cursors, and widget sync.
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                   COLLABORATION SERVICE                         │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                 │
 * │  Local Widget Change ──► CollaborationService.broadcastXxx()    │
 * │                                  │                              │
 * │                                  ▼                              │
 * │                         WebSocket Server                        │
 * │                                  │                              │
 * │                                  ▼                              │
 * │         Remote Users receive via CollaborationService           │
 * │                                  │                              │
 * │                                  ▼                              │
 * │  useCollaborationStore ◄── onRemoteXxx() handlers               │
 * │  useCanvasStore                                                 │
 * │                                                                 │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Message Protocol (matches server/websocket/types.ts)
 *
 * - auth: Authenticate with JWT token
 * - join/leave: Canvas room management
 * - widget:*: Widget CRUD operations
 * - cursor:move: Real-time cursor positions
 * - selection:change: Widget selection sync
 * - presence:*: User presence updates
 */

import { useCollaborationStore, type Collaborator, type CollaboratorRole } from '../state/useCollaborationStore';
import { useCanvasStore } from '../state/useCanvasStore';
import { EventBus } from '../runtime/EventBus';

// ==================
// Types (matching server protocol)
// ==================

export type WSMessageType =
  | 'auth'
  | 'join'
  | 'leave'
  | 'canvas:update'
  | 'widget:create'
  | 'widget:update'
  | 'widget:delete'
  | 'widget:move'
  | 'widget:resize'
  | 'widget:state'
  | 'widget:batch'
  | 'cursor:move'
  | 'selection:change'
  | 'presence:join'
  | 'presence:leave'
  | 'presence:update'
  | 'error'
  | 'ack';

export interface WSMessage {
  type: WSMessageType;
  id?: string;
  timestamp?: number;
  canvasId?: string;
  userId?: string;
}

export interface RemoteUser {
  id: string;
  username: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedIds?: string[];
}

export interface CollaborationConfig {
  /** WebSocket server URL */
  serverUrl: string;
  /** JWT auth token */
  authToken: string;
  /** Current user info */
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Max reconnection attempts */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay (ms) */
  reconnectDelay?: number;
  /** Heartbeat interval (ms) */
  heartbeatInterval?: number;
}

export type CollaborationEventType =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'
  | 'user:joined'
  | 'user:left'
  | 'cursor:moved'
  | 'selection:changed'
  | 'widget:created'
  | 'widget:updated'
  | 'widget:deleted'
  | 'widget:moved'
  | 'widget:resized';

export type CollaborationEventHandler = (event: {
  type: CollaborationEventType;
  data?: unknown;
}) => void;

// ==================
// Color Palette
// ==================

const COLLABORATOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF7F50',
];

// ==================
// Service Implementation
// ==================

class CollaborationServiceClass {
  private socket: WebSocket | null = null;
  private config: CollaborationConfig | null = null;
  private eventBus: EventBus | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageQueue: WSMessage[] = [];
  private currentCanvasId: string | null = null;
  private remoteUsers: Map<string, RemoteUser> = new Map();
  private colorIndex = 0;
  private eventHandlers: Set<CollaborationEventHandler> = new Set();
  private pendingAcks: Map<string, { resolve: () => void; reject: (err: Error) => void }> = new Map();
  private isConnecting = false;

  // Throttling for cursor updates
  private lastCursorUpdate = 0;
  private cursorThrottleMs = 50; // 20 updates/sec max
  private pendingCursorUpdate: { x: number; y: number } | null = null;
  private cursorThrottleTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize the collaboration service
   */
  async initialize(config: CollaborationConfig, eventBus?: EventBus): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.warn('[CollaborationService] Already connected');
      return;
    }

    this.config = {
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      ...config,
    };

    this.eventBus = eventBus || null;

    // Set up local user in collaboration store
    const store = useCollaborationStore.getState();
    store.setLocalUser({
      id: config.user.id,
      displayName: config.user.displayName,
      avatarUrl: config.user.avatarUrl,
      color: this.getNextColor(),
      role: 'owner',
      isLocal: true,
      lastActivity: Date.now(),
      isActive: true,
      deviceType: this.detectDeviceType(),
      connectionQuality: 'disconnected',
    });

    await this.connect();
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('CollaborationService not initialized');
    }

    if (this.isConnecting) {
      console.warn('[CollaborationService] Already connecting');
      return;
    }

    this.isConnecting = true;
    const store = useCollaborationStore.getState();
    store.setConnectionStatus('connecting');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.isConnecting = false;
        store.setConnectionStatus('error', 'Connection timeout');
        reject(new Error('Connection timeout'));
      }, 10000);

      try {
        this.socket = new WebSocket(this.config!.serverUrl);

        this.socket.onopen = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.log('[CollaborationService] WebSocket connected');
          this.authenticate();
        };

        this.socket.onclose = (event) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.handleDisconnect(event);
        };

        this.socket.onerror = (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.error('[CollaborationService] WebSocket error:', error);
          store.setConnectionStatus('error', 'Connection failed');
          reject(new Error('Connection failed'));
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };

        // Resolve after auth success (handled in handleMessage)
        this.pendingAcks.set('auth', { resolve, reject });

      } catch (error) {
        clearTimeout(timeout);
        this.isConnecting = false;
        store.setConnectionStatus('error', 'Connection failed');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cursorThrottleTimeout) {
      clearTimeout(this.cursorThrottleTimeout);
      this.cursorThrottleTimeout = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.remoteUsers.clear();
    this.currentCanvasId = null;
    this.reconnectAttempts = 0;

    const store = useCollaborationStore.getState();
    store.disconnect();

    this.emitEvent({ type: 'disconnected' });
    console.log('[CollaborationService] Disconnected');
  }

  /**
   * Join a canvas room for collaboration
   */
  async joinCanvas(canvasId: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }

    // Leave current room if different
    if (this.currentCanvasId && this.currentCanvasId !== canvasId) {
      await this.leaveCanvas();
    }

    this.currentCanvasId = canvasId;

    const message: WSMessage = {
      type: 'join',
      id: this.generateMessageId(),
      canvasId,
      timestamp: Date.now(),
    };

    this.send(message);

    const store = useCollaborationStore.getState();
    store.switchCanvas(canvasId);

    console.log('[CollaborationService] Joined canvas:', canvasId);
  }

  /**
   * Leave the current canvas room
   */
  async leaveCanvas(): Promise<void> {
    if (!this.currentCanvasId || !this.isConnected()) {
      return;
    }

    const message: WSMessage = {
      type: 'leave',
      id: this.generateMessageId(),
      canvasId: this.currentCanvasId,
      timestamp: Date.now(),
    };

    this.send(message);

    // Clear remote users for this canvas
    this.remoteUsers.clear();

    const store = useCollaborationStore.getState();
    store.leaveRoom();

    console.log('[CollaborationService] Left canvas:', this.currentCanvasId);
    this.currentCanvasId = null;
  }

  // ==================
  // Widget Broadcasting
  // ==================

  /**
   * Broadcast widget creation to other users
   */
  broadcastWidgetCreate(widget: {
    id: string;
    widgetDefId: string;
    version: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    zIndex: number;
    state?: Record<string, unknown>;
  }): void {
    if (!this.canBroadcast()) return;

    this.send({
      type: 'widget:create',
      id: this.generateMessageId(),
      canvasId: this.currentCanvasId!,
      timestamp: Date.now(),
      ...{ widget },
    } as WSMessage & { widget: typeof widget });
  }

  /**
   * Broadcast widget update
   */
  broadcastWidgetUpdate(widgetId: string, changes: Record<string, unknown>): void {
    if (!this.canBroadcast()) return;

    this.send({
      type: 'widget:update',
      id: this.generateMessageId(),
      canvasId: this.currentCanvasId!,
      timestamp: Date.now(),
      ...{ widgetId, changes },
    } as WSMessage & { widgetId: string; changes: Record<string, unknown> });
  }

  /**
   * Broadcast widget deletion
   */
  broadcastWidgetDelete(widgetId: string): void {
    if (!this.canBroadcast()) return;

    this.send({
      type: 'widget:delete',
      id: this.generateMessageId(),
      canvasId: this.currentCanvasId!,
      timestamp: Date.now(),
      ...{ widgetId },
    } as WSMessage & { widgetId: string });
  }

  /**
   * Broadcast widget move (throttled)
   */
  broadcastWidgetMove(widgetId: string, position: { x: number; y: number }): void {
    if (!this.canBroadcast()) return;

    this.send({
      type: 'widget:move',
      id: this.generateMessageId(),
      canvasId: this.currentCanvasId!,
      timestamp: Date.now(),
      ...{ widgetId, position },
    } as WSMessage & { widgetId: string; position: { x: number; y: number } });
  }

  /**
   * Broadcast widget resize
   */
  broadcastWidgetResize(widgetId: string, dimensions: { width: number; height: number }): void {
    if (!this.canBroadcast()) return;

    this.send({
      type: 'widget:resize',
      id: this.generateMessageId(),
      canvasId: this.currentCanvasId!,
      timestamp: Date.now(),
      ...{ widgetId, dimensions },
    } as WSMessage & { widgetId: string; dimensions: { width: number; height: number } });
  }

  /**
   * Broadcast widget state change
   */
  broadcastWidgetState(widgetId: string, state: Record<string, unknown>, partial = true): void {
    if (!this.canBroadcast()) return;

    this.send({
      type: 'widget:state',
      id: this.generateMessageId(),
      canvasId: this.currentCanvasId!,
      timestamp: Date.now(),
      ...{ widgetId, state, partial },
    } as WSMessage & { widgetId: string; state: Record<string, unknown>; partial: boolean });
  }

  // ==================
  // Presence Broadcasting
  // ==================

  /**
   * Broadcast cursor position (throttled to ~20/sec)
   */
  broadcastCursor(x: number, y: number): void {
    if (!this.canBroadcast()) return;

    const now = Date.now();

    if (now - this.lastCursorUpdate >= this.cursorThrottleMs) {
      this.sendCursorUpdate(x, y);
      this.lastCursorUpdate = now;
      this.pendingCursorUpdate = null;
    } else {
      this.pendingCursorUpdate = { x, y };

      if (!this.cursorThrottleTimeout) {
        this.cursorThrottleTimeout = setTimeout(() => {
          if (this.pendingCursorUpdate) {
            this.sendCursorUpdate(this.pendingCursorUpdate.x, this.pendingCursorUpdate.y);
            this.lastCursorUpdate = Date.now();
            this.pendingCursorUpdate = null;
          }
          this.cursorThrottleTimeout = null;
        }, this.cursorThrottleMs);
      }
    }
  }

  private sendCursorUpdate(x: number, y: number): void {
    this.send({
      type: 'cursor:move',
      canvasId: this.currentCanvasId!,
      timestamp: Date.now(),
      ...{ position: { x, y } },
    } as WSMessage & { position: { x: number; y: number } });
  }

  /**
   * Broadcast selection change
   */
  broadcastSelection(selectedIds: string[]): void {
    if (!this.canBroadcast()) return;

    this.send({
      type: 'selection:change',
      id: this.generateMessageId(),
      canvasId: this.currentCanvasId!,
      timestamp: Date.now(),
      ...{ selectedIds },
    } as WSMessage & { selectedIds: string[] });
  }

  // ==================
  // Event Handling
  // ==================

  /**
   * Subscribe to collaboration events
   */
  onEvent(handler: CollaborationEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Get current remote users
   */
  getRemoteUsers(): RemoteUser[] {
    return Array.from(this.remoteUsers.values());
  }

  /**
   * Get remote user by ID
   */
  getRemoteUser(userId: string): RemoteUser | undefined {
    return this.remoteUsers.get(userId);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get current canvas ID
   */
  getCurrentCanvasId(): string | null {
    return this.currentCanvasId;
  }

  // ==================
  // Private Methods
  // ==================

  private authenticate(): void {
    if (!this.config || !this.socket) return;

    const message = {
      type: 'auth',
      id: 'auth',
      token: this.config.authToken,
      timestamp: Date.now(),
    };

    this.socket.send(JSON.stringify(message));
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WSMessage & Record<string, unknown>;
      this.processMessage(message);
    } catch (error) {
      console.error('[CollaborationService] Failed to parse message:', error);
    }
  }

  private processMessage(message: WSMessage & Record<string, unknown>): void {
    const store = useCollaborationStore.getState();

    switch (message.type) {
      case 'ack':
        this.handleAck(message);
        break;

      case 'error':
        this.handleError(message);
        break;

      case 'presence:join':
        this.handlePresenceJoin(message);
        break;

      case 'presence:leave':
        this.handlePresenceLeave(message);
        break;

      case 'presence:update':
        this.handlePresenceUpdate(message);
        break;

      case 'widget:create':
        this.handleRemoteWidgetCreate(message);
        break;

      case 'widget:update':
        this.handleRemoteWidgetUpdate(message);
        break;

      case 'widget:delete':
        this.handleRemoteWidgetDelete(message);
        break;

      case 'widget:move':
        this.handleRemoteWidgetMove(message);
        break;

      case 'widget:resize':
        this.handleRemoteWidgetResize(message);
        break;

      case 'widget:state':
        this.handleRemoteWidgetState(message);
        break;

      default:
        console.log('[CollaborationService] Unhandled message type:', message.type);
    }
  }

  private handleAck(message: WSMessage & Record<string, unknown>): void {
    const originalId = message.originalMessageId as string;
    const success = message.success as boolean;

    // Handle auth acknowledgment
    if (originalId === 'auth' || message.id === 'auth') {
      const pending = this.pendingAcks.get('auth');
      if (pending) {
        const authStore = useCollaborationStore.getState();
        if (success !== false) {
          authStore.setConnectionStatus('connected');
          authStore.updateLocalUser({ connectionQuality: 'excellent' });
          this.startHeartbeat();
          this.flushMessageQueue();
          this.emitEvent({ type: 'connected' });
          pending.resolve();
        } else {
          authStore.setConnectionStatus('error', 'Authentication failed');
          pending.reject(new Error('Authentication failed'));
        }
        this.pendingAcks.delete('auth');
      }
    }

    // Handle other acks
    const pending = this.pendingAcks.get(originalId);
    if (pending) {
      pending.resolve();
      this.pendingAcks.delete(originalId);
    }
  }

  private handleError(message: WSMessage & Record<string, unknown>): void {
    console.error('[CollaborationService] Server error:', message.code, message.message);
    this.emitEvent({ type: 'error', data: { code: message.code, message: message.message } });
  }

  private handlePresenceJoin(message: WSMessage & Record<string, unknown>): void {
    const user = message.user as { id: string; username: string; color: string };
    if (!user || user.id === this.config?.user.id) return;

    const remoteUser: RemoteUser = {
      id: user.id,
      username: user.username,
      color: user.color,
    };

    this.remoteUsers.set(user.id, remoteUser);

    // Add to collaboration store
    const store = useCollaborationStore.getState();
    store.addCollaborator({
      id: user.id,
      displayName: user.username,
      color: user.color,
      role: 'viewer' as CollaboratorRole,
      isLocal: false,
      lastActivity: Date.now(),
      isActive: true,
      currentCanvasId: this.currentCanvasId || undefined,
      deviceType: 'desktop',
      connectionQuality: 'good',
    });

    this.emitEvent({ type: 'user:joined', data: remoteUser });
    console.log('[CollaborationService] User joined:', user.username);
  }

  private handlePresenceLeave(message: WSMessage & Record<string, unknown>): void {
    const userId = message.userId as string;
    if (!userId) return;

    const user = this.remoteUsers.get(userId);
    this.remoteUsers.delete(userId);

    const store = useCollaborationStore.getState();
    store.removeCollaborator(userId);

    this.emitEvent({ type: 'user:left', data: { userId, username: user?.username } });
    console.log('[CollaborationService] User left:', userId);
  }

  private handlePresenceUpdate(message: WSMessage & Record<string, unknown>): void {
    const userId = message.userId as string;
    if (!userId || userId === this.config?.user.id) return;

    const user = this.remoteUsers.get(userId);
    if (!user) return;

    // Update cursor
    if (message.cursor) {
      user.cursor = message.cursor as { x: number; y: number };
      this.emitEvent({ type: 'cursor:moved', data: { userId, cursor: user.cursor } });
    }

    // Update selection
    if (message.selectedIds) {
      user.selectedIds = message.selectedIds as string[];
      this.emitEvent({ type: 'selection:changed', data: { userId, selectedIds: user.selectedIds } });
    }

    // Update collaboration store
    const store = useCollaborationStore.getState();
    store.updateCollaborator(userId, { lastActivity: Date.now(), isActive: true });
  }

  private handleRemoteWidgetCreate(message: WSMessage & Record<string, unknown>): void {
    const widget = message.widget as {
      id: string;
      widgetDefId: string;
      position: { x: number; y: number };
      width: number;
      height: number;
      zIndex: number;
      state?: Record<string, unknown>;
    };

    if (!widget) return;

    // Emit event for canvas to handle
    this.emitEvent({ type: 'widget:created', data: widget });

    // Emit to EventBus if available
    this.eventBus?.emit({
      type: 'collaboration:widget:created',
      scope: 'canvas',
      payload: widget,
    });
  }

  private handleRemoteWidgetUpdate(message: WSMessage & Record<string, unknown>): void {
    const widgetId = message.widgetId as string;
    const changes = message.changes as Record<string, unknown>;

    if (!widgetId || !changes) return;

    this.emitEvent({ type: 'widget:updated', data: { widgetId, changes } });

    this.eventBus?.emit({
      type: 'collaboration:widget:updated',
      scope: 'canvas',
      payload: { widgetId, changes },
    });
  }

  private handleRemoteWidgetDelete(message: WSMessage & Record<string, unknown>): void {
    const widgetId = message.widgetId as string;
    if (!widgetId) return;

    this.emitEvent({ type: 'widget:deleted', data: { widgetId } });

    this.eventBus?.emit({
      type: 'collaboration:widget:deleted',
      scope: 'canvas',
      payload: { widgetId },
    });
  }

  private handleRemoteWidgetMove(message: WSMessage & Record<string, unknown>): void {
    const widgetId = message.widgetId as string;
    const position = message.position as { x: number; y: number };

    if (!widgetId || !position) return;

    this.emitEvent({ type: 'widget:moved', data: { widgetId, position } });

    // Update canvas store directly for smooth movement
    const canvasStore = useCanvasStore.getState();
    canvasStore.updateWidget(widgetId, { position });
  }

  private handleRemoteWidgetResize(message: WSMessage & Record<string, unknown>): void {
    const widgetId = message.widgetId as string;
    const dimensions = message.dimensions as { width: number; height: number };

    if (!widgetId || !dimensions) return;

    this.emitEvent({ type: 'widget:resized', data: { widgetId, dimensions } });

    // Update canvas store directly
    const canvasStore = useCanvasStore.getState();
    canvasStore.updateWidget(widgetId, dimensions);
  }

  private handleRemoteWidgetState(message: WSMessage & Record<string, unknown>): void {
    const widgetId = message.widgetId as string;
    const state = message.state as Record<string, unknown>;
    const partial = message.partial as boolean;

    if (!widgetId || !state) return;

    this.eventBus?.emit({
      type: 'collaboration:widget:state',
      scope: 'canvas',
      payload: { widgetId, state, partial },
    });
  }

  private handleDisconnect(event: CloseEvent): void {
    const wasConnected = useCollaborationStore.getState().connectionStatus === 'connected';

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.remoteUsers.clear();

    const store = useCollaborationStore.getState();
    store.setConnectionStatus('disconnected');
    store.updateLocalUser({ connectionQuality: 'disconnected' });

    console.log('[CollaborationService] Disconnected:', event.code, event.reason);

    // Attempt reconnection if configured and not a clean close
    if (this.config?.autoReconnect && event.code !== 1000 && wasConnected) {
      this.attemptReconnect();
    }

    this.emitEvent({ type: 'disconnected', data: { code: event.code, reason: event.reason } });
  }

  private attemptReconnect(): void {
    if (!this.config) return;

    if (
      this.config.maxReconnectAttempts &&
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      console.error('[CollaborationService] Max reconnection attempts reached');
      const store = useCollaborationStore.getState();
      store.setConnectionStatus('error', 'Max reconnection attempts reached');
      return;
    }

    const store = useCollaborationStore.getState();
    store.setConnectionStatus('reconnecting');
    this.emitEvent({ type: 'reconnecting' });

    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts - 1) +
      Math.random() * 1000,
      30000 // Max 30 seconds
    );

    console.log(`[CollaborationService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        // Rejoin canvas if we were in one
        if (this.currentCanvasId) {
          await this.joinCanvas(this.currentCanvasId);
        }
      } catch (error) {
        console.error('[CollaborationService] Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        // The server handles ping/pong at WebSocket level
        // We just update local activity
        const store = useCollaborationStore.getState();
        store.updateLocalUser({ lastActivity: Date.now() });
      }
    }, this.config?.heartbeatInterval || 30000);
  }

  private send(message: WSMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket.send(JSON.stringify(message));
      }
    }
  }

  private canBroadcast(): boolean {
    return this.isConnected() && this.currentCanvasId !== null;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private getNextColor(): string {
    const color = COLLABORATOR_COLORS[this.colorIndex % COLLABORATOR_COLORS.length];
    this.colorIndex++;
    return color;
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop';

    const ua = navigator.userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android.*mobile|windows.*phone|blackberry/i.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private emitEvent(event: { type: CollaborationEventType; data?: unknown }): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('[CollaborationService] Event handler error:', error);
      }
    });
  }

  /**
   * Get debug info
   */
  getDebugInfo(): object {
    return {
      connected: this.isConnected(),
      currentCanvasId: this.currentCanvasId,
      remoteUsers: this.getRemoteUsers(),
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      config: this.config ? { ...this.config, authToken: '[REDACTED]' } : null,
    };
  }
}

// ==================
// Singleton Export
// ==================

export const CollaborationService = new CollaborationServiceClass();

/**
 * Convenience function to initialize collaboration
 */
export async function initializeCollaboration(
  config: CollaborationConfig,
  eventBus?: EventBus
): Promise<void> {
  await CollaborationService.initialize(config, eventBus);
}

/**
 * Convenience function to disconnect collaboration
 */
export function disconnectCollaboration(): void {
  CollaborationService.disconnect();
}

export default CollaborationService;
