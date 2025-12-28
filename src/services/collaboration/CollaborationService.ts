/**
 * StickerNest v2 - Collaboration Service
 * Bridges WebSocket real-time communication with the collaboration store.
 */

import { useCollaborationStore } from '../../state/useCollaborationStore';
import { EventBus } from '../../runtime/EventBus';
import type {
  WSMessage,
  RemoteUser,
  CollaborationConfig,
  CollaborationEventType,
  CollaborationEventHandler,
  COLLABORATOR_COLORS,
} from './types';
import * as handlers from './messageHandlers';

// Re-export COLLABORATOR_COLORS
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF7F50',
];

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

  // Cursor throttling
  private lastCursorUpdate = 0;
  private cursorThrottleMs = 50;
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
    if (!this.config) throw new Error('CollaborationService not initialized');
    if (this.isConnecting) return;

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
          this.authenticate();
        };

        this.socket.onclose = (event) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.handleDisconnect(event);
        };

        this.socket.onerror = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          store.setConnectionStatus('error', 'Connection failed');
          reject(new Error('Connection failed'));
        };

        this.socket.onmessage = (event) => this.handleMessage(event);

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
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.cursorThrottleTimeout) clearTimeout(this.cursorThrottleTimeout);

    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.cursorThrottleTimeout = null;

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.remoteUsers.clear();
    this.currentCanvasId = null;
    this.reconnectAttempts = 0;

    useCollaborationStore.getState().disconnect();
    this.emitEvent({ type: 'disconnected' });
  }

  /**
   * Join a canvas room
   */
  async joinCanvas(canvasId: string): Promise<void> {
    if (!this.isConnected()) throw new Error('Not connected');

    if (this.currentCanvasId && this.currentCanvasId !== canvasId) {
      await this.leaveCanvas();
    }

    this.currentCanvasId = canvasId;
    this.send({ type: 'join', id: this.generateMessageId(), canvasId, timestamp: Date.now() });
    useCollaborationStore.getState().switchCanvas(canvasId);
  }

  /**
   * Leave the current canvas
   */
  async leaveCanvas(): Promise<void> {
    if (!this.currentCanvasId || !this.isConnected()) return;

    this.send({ type: 'leave', id: this.generateMessageId(), canvasId: this.currentCanvasId, timestamp: Date.now() });
    this.remoteUsers.clear();
    useCollaborationStore.getState().leaveRoom();
    this.currentCanvasId = null;
  }

  // ==================
  // Widget Broadcasting
  // ==================

  broadcastWidgetCreate(widget: { id: string; widgetDefId: string; version: string; position: { x: number; y: number }; width: number; height: number; zIndex: number; state?: Record<string, unknown> }): void {
    if (!this.canBroadcast()) return;
    this.send({ type: 'widget:create', id: this.generateMessageId(), canvasId: this.currentCanvasId!, timestamp: Date.now(), ...{ widget } } as WSMessage & { widget: typeof widget });
  }

  broadcastWidgetUpdate(widgetId: string, changes: Record<string, unknown>): void {
    if (!this.canBroadcast()) return;
    this.send({ type: 'widget:update', id: this.generateMessageId(), canvasId: this.currentCanvasId!, timestamp: Date.now(), ...{ widgetId, changes } } as WSMessage & { widgetId: string; changes: Record<string, unknown> });
  }

  broadcastWidgetDelete(widgetId: string): void {
    if (!this.canBroadcast()) return;
    this.send({ type: 'widget:delete', id: this.generateMessageId(), canvasId: this.currentCanvasId!, timestamp: Date.now(), ...{ widgetId } } as WSMessage & { widgetId: string });
  }

  broadcastWidgetMove(widgetId: string, position: { x: number; y: number }): void {
    if (!this.canBroadcast()) return;
    this.send({ type: 'widget:move', id: this.generateMessageId(), canvasId: this.currentCanvasId!, timestamp: Date.now(), ...{ widgetId, position } } as WSMessage & { widgetId: string; position: { x: number; y: number } });
  }

  broadcastWidgetResize(widgetId: string, dimensions: { width: number; height: number }): void {
    if (!this.canBroadcast()) return;
    this.send({ type: 'widget:resize', id: this.generateMessageId(), canvasId: this.currentCanvasId!, timestamp: Date.now(), ...{ widgetId, dimensions } } as WSMessage & { widgetId: string; dimensions: { width: number; height: number } });
  }

  broadcastWidgetState(widgetId: string, state: Record<string, unknown>, partial = true): void {
    if (!this.canBroadcast()) return;
    this.send({ type: 'widget:state', id: this.generateMessageId(), canvasId: this.currentCanvasId!, timestamp: Date.now(), ...{ widgetId, state, partial } } as WSMessage & { widgetId: string; state: Record<string, unknown>; partial: boolean });
  }

  // ==================
  // Presence Broadcasting
  // ==================

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

  broadcastSelection(selectedIds: string[]): void {
    if (!this.canBroadcast()) return;
    this.send({ type: 'selection:change', id: this.generateMessageId(), canvasId: this.currentCanvasId!, timestamp: Date.now(), ...{ selectedIds } } as WSMessage & { selectedIds: string[] });
  }

  // ==================
  // Event Handling
  // ==================

  onEvent(handler: CollaborationEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  getRemoteUsers(): RemoteUser[] {
    return Array.from(this.remoteUsers.values());
  }

  getRemoteUser(userId: string): RemoteUser | undefined {
    return this.remoteUsers.get(userId);
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  getCurrentCanvasId(): string | null {
    return this.currentCanvasId;
  }

  // ==================
  // Private Methods
  // ==================

  private authenticate(): void {
    if (!this.config || !this.socket) return;
    this.socket.send(JSON.stringify({ type: 'auth', id: 'auth', token: this.config.authToken, timestamp: Date.now() }));
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
    const context = this.getHandlerContext();

    switch (message.type) {
      case 'ack': handlers.handleAck(message, context); break;
      case 'error': handlers.handleError(message, context); break;
      case 'presence:join': handlers.handlePresenceJoin(message, context); break;
      case 'presence:leave': handlers.handlePresenceLeave(message, context); break;
      case 'presence:update': handlers.handlePresenceUpdate(message, context); break;
      case 'widget:create': handlers.handleRemoteWidgetCreate(message, context); break;
      case 'widget:update': handlers.handleRemoteWidgetUpdate(message, context); break;
      case 'widget:delete': handlers.handleRemoteWidgetDelete(message, context); break;
      case 'widget:move': handlers.handleRemoteWidgetMove(message, context); break;
      case 'widget:resize': handlers.handleRemoteWidgetResize(message, context); break;
      case 'widget:state': handlers.handleRemoteWidgetState(message, context); break;
      default: console.log('[CollaborationService] Unhandled message type:', message.type);
    }
  }

  private getHandlerContext(): handlers.MessageHandlerContext {
    return {
      config: this.config,
      remoteUsers: this.remoteUsers,
      currentCanvasId: this.currentCanvasId,
      eventBus: this.eventBus,
      emitEvent: (e) => this.emitEvent(e),
      pendingAcks: this.pendingAcks,
      startHeartbeat: () => this.startHeartbeat(),
      flushMessageQueue: () => this.flushMessageQueue(),
    };
  }

  private handleDisconnect(event: CloseEvent): void {
    const wasConnected = useCollaborationStore.getState().connectionStatus === 'connected';

    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
    this.remoteUsers.clear();

    const store = useCollaborationStore.getState();
    store.setConnectionStatus('disconnected');
    store.updateLocalUser({ connectionQuality: 'disconnected' });

    if (this.config?.autoReconnect && event.code !== 1000 && wasConnected) {
      this.attemptReconnect();
    }

    this.emitEvent({ type: 'disconnected', data: { code: event.code, reason: event.reason } });
  }

  private attemptReconnect(): void {
    if (!this.config) return;
    if (this.config.maxReconnectAttempts && this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      useCollaborationStore.getState().setConnectionStatus('error', 'Max reconnection attempts reached');
      return;
    }

    useCollaborationStore.getState().setConnectionStatus('reconnecting');
    this.emitEvent({ type: 'reconnecting' });
    this.reconnectAttempts++;

    const delay = Math.min(this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000, 30000);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        if (this.currentCanvasId) await this.joinCanvas(this.currentCanvasId);
      } catch {
        this.attemptReconnect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        useCollaborationStore.getState().updateLocalUser({ lastActivity: Date.now() });
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
      if (message) this.socket.send(JSON.stringify(message));
    }
  }

  private sendCursorUpdate(x: number, y: number): void {
    this.send({ type: 'cursor:move', canvasId: this.currentCanvasId!, timestamp: Date.now(), ...{ position: { x, y } } } as WSMessage & { position: { x: number; y: number } });
  }

  private canBroadcast(): boolean {
    return this.isConnected() && this.currentCanvasId !== null;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private getNextColor(): string {
    const color = COLORS[this.colorIndex % COLORS.length];
    this.colorIndex++;
    return color;
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android.*mobile|windows.*phone|blackberry/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  private emitEvent(event: { type: CollaborationEventType; data?: unknown }): void {
    this.eventHandlers.forEach((handler) => {
      try { handler(event); } catch (error) { console.error('[CollaborationService] Event handler error:', error); }
    });
  }

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

export const CollaborationService = new CollaborationServiceClass();

export async function initializeCollaboration(config: CollaborationConfig, eventBus?: EventBus): Promise<void> {
  await CollaborationService.initialize(config, eventBus);
}

export function disconnectCollaboration(): void {
  CollaborationService.disconnect();
}

export default CollaborationService;
