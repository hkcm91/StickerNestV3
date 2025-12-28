/**
 * Scalable WebSocket Server
 * Enhanced WebSocket server with pub/sub support for multi-server deployments
 * and CRDT-ready sync capabilities
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { verifyAccessToken } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import type { PubSubAdapter, PubSubMessage } from '../lib/pubsub/types.js';
import { SyncSessionManager } from '../lib/sync/index.js';
import type { OperationType } from '../lib/sync/types.js';
import type {
  AuthenticatedWebSocket,
  CanvasRoom,
  UserPresence,
  WSMessage,
  WSIncomingMessage,
  WSAuthMessage,
  WSJoinMessage,
  WSLeaveMessage,
  WSOutgoingMessage,
  WSErrorMessage,
  WSPresenceJoinMessage,
  WSPresenceLeaveMessage,
} from './types.js';
import { validateAndSanitizeWSMessage } from '../schemas/websocket.schema.js';

// Color palette for user presence
const PRESENCE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF7F50',
];

interface ScalableWSConfig {
  pubsub?: PubSubAdapter;
  serverId?: string;
}

/**
 * Scalable WebSocket server for real-time canvas collaboration
 * Supports multi-server deployment via Redis pub/sub
 */
export class ScalableCanvasWebSocketServer {
  private wss: WebSocketServer;
  private rooms: Map<string, CanvasRoom> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private connectionMap: Map<string, AuthenticatedWebSocket> = new Map(); // connectionId -> ws
  private colorIndex = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Scalability components
  private pubsub: PubSubAdapter | null;
  private serverId: string;
  private syncManager: SyncSessionManager;

  constructor(server: Server, config: ScalableWSConfig = {}) {
    this.pubsub = config.pubsub || null;
    this.serverId = config.serverId || uuidv4();
    this.syncManager = new SyncSessionManager(this.serverId);

    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.setupServer();
    this.setupPubSub();
    this.startHeartbeat();

    logger.info({ serverId: this.serverId, pubsub: this.pubsub?.getName() || 'none' },
      'Scalable WebSocket server initialized');
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: AuthenticatedWebSocket) => {
      const connectionId = uuidv4();
      ws.connectionId = connectionId;
      ws.isAlive = true;

      this.connectionMap.set(connectionId, ws);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
        this.connectionMap.delete(connectionId);
      });

      ws.on('error', (error) => {
        logger.error({ err: error, userId: ws.userId, connectionId }, 'WebSocket error');
      });

      // Send initial connection acknowledgment with server info
      this.send(ws, {
        type: 'ack',
        originalMessageId: 'connection',
        success: true,
        timestamp: Date.now(),
        serverId: this.serverId, // Tell client which server they connected to
      } as WSOutgoingMessage);
    });

    this.wss.on('error', (error) => {
      logger.error({ err: error }, 'WebSocket server error');
    });
  }

  /**
   * Setup pub/sub for cross-server communication
   */
  private async setupPubSub(): Promise<void> {
    if (!this.pubsub) return;

    // Subscribe to all canvas messages (pattern subscribe)
    if (this.pubsub.psubscribe) {
      await this.pubsub.psubscribe('canvas:*', (message: PubSubMessage) => {
        this.handleRemoteMessage(message);
      });
    }

    logger.info('PubSub subscriptions established');
  }

  /**
   * Handle messages from other server instances (via pub/sub)
   */
  private handleRemoteMessage(message: PubSubMessage): void {
    // Don't echo our own messages (adapter already filters, but double-check)
    if (message.senderId === this.serverId) return;

    const canvasId = message.channel.replace('canvas:', '');
    const room = this.rooms.get(canvasId);

    if (!room) return; // No local clients for this canvas

    // Broadcast to local clients
    const outgoing = message.data as WSOutgoingMessage;
    room.clients.forEach((client, userId) => {
      // Don't send to the originating user if they're local
      if ((outgoing as { userId?: string }).userId !== userId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(outgoing));
      }
    });
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const authWs = ws as AuthenticatedWebSocket;
        if (authWs.isAlive === false) {
          this.handleDisconnect(authWs);
          return authWs.terminate();
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 30000);
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.syncManager.stopCleanup();

    if (this.pubsub) {
      await this.pubsub.close();
    }

    this.wss.close();
    logger.info('Scalable WebSocket server stopped');
  }

  /**
   * Handle incoming message
   */
  private handleMessage(ws: AuthenticatedWebSocket, data: Buffer): void {
    let message: WSIncomingMessage;

    try {
      message = JSON.parse(data.toString()) as WSIncomingMessage;
    } catch {
      this.sendError(ws, 'PARSE_ERROR', 'Invalid JSON message');
      return;
    }

    // Handle authentication first
    if (message.type === 'auth') {
      this.handleAuth(ws, message as WSAuthMessage);
      return;
    }

    // All other messages require authentication
    if (!ws.userId) {
      this.sendError(ws, 'UNAUTHORIZED', 'Authentication required', message.id);
      return;
    }

    // Handle sync:request separately (extended message type)
    if ((message as { type: string }).type === 'sync:request') {
      this.handleSyncRequest(ws, message);
      return;
    }

    switch (message.type) {
      case 'join':
        this.handleJoin(ws, message as WSJoinMessage);
        break;
      case 'leave':
        this.handleLeave(ws, message as WSLeaveMessage);
        break;
      case 'canvas:update':
      case 'widget:create':
      case 'widget:update':
      case 'widget:delete':
      case 'widget:move':
      case 'widget:resize':
      case 'widget:state':
      case 'widget:batch':
        this.handleCanvasMessage(ws, message);
        break;
      case 'cursor:move':
      case 'selection:change':
        this.handlePresenceMessage(ws, message);
        break;
      default:
        this.sendError(ws, 'UNKNOWN_MESSAGE', `Unknown message type: ${(message as WSMessage).type}`, (message as WSMessage).id);
    }
  }

  /**
   * Handle authentication with reconnection support
   */
  private handleAuth(ws: AuthenticatedWebSocket, message: WSAuthMessage): void {
    try {
      const payload = verifyAccessToken(message.token);
      ws.userId = payload.userId;
      ws.username = payload.username;

      // Check for reconnection data
      const lastVersion = (message as { lastVersion?: number }).lastVersion;
      // lastVectorClock reserved for future reconnection state sync
      // const lastVectorClock = (message as { lastVectorClock?: Record<string, number> }).lastVectorClock;

      // Assign a color for presence
      const existingPresence = this.userPresence.get(payload.userId);
      const color = existingPresence?.color || this.getNextColor();

      this.userPresence.set(payload.userId, {
        userId: payload.userId,
        username: payload.username,
        color,
        selectedIds: [],
        lastSeen: Date.now(),
      });

      // Send ack with reconnection info
      this.send(ws, {
        type: 'ack',
        originalMessageId: message.id || 'auth',
        success: true,
        timestamp: Date.now(),
        reconnection: lastVersion !== undefined,
        userId: payload.userId,
      } as WSOutgoingMessage);

      logger.debug({ userId: payload.userId, reconnection: lastVersion !== undefined },
        'WebSocket authenticated');
    } catch (error) {
      this.sendError(ws, 'AUTH_FAILED', 'Invalid or expired token', message.id);
    }
  }

  /**
   * Handle join canvas room with reconnection sync
   */
  private handleJoin(ws: AuthenticatedWebSocket, message: WSJoinMessage): void {
    const { canvasId } = message;
    const userId = ws.userId!;
    const username = ws.username!;
    const connectionId = ws.connectionId!;

    // Leave previous room if any
    if (ws.canvasId && ws.canvasId !== canvasId) {
      this.leaveRoom(ws, ws.canvasId);
    }

    // Get or create room
    let room = this.rooms.get(canvasId);
    if (!room) {
      room = {
        canvasId,
        clients: new Map(),
        userColors: new Map(),
      };
      this.rooms.set(canvasId, room);
    }

    // Add client to room
    room.clients.set(userId, ws);
    ws.canvasId = canvasId;

    // Create sync session with potential delta
    const lastVersion = (message as { lastVersion?: number }).lastVersion;
    const lastVectorClock = (message as { lastVectorClock?: Record<string, number> }).lastVectorClock;

    const { delta } = this.syncManager.createSession(
      userId,
      canvasId,
      connectionId,
      lastVersion,
      lastVectorClock
    );

    // Assign color for this room
    const presence = this.userPresence.get(userId);
    if (presence) {
      room.userColors.set(userId, presence.color);
    }

    // Send acknowledgment with optional delta
    const ackPayload: Record<string, unknown> = {
      type: 'ack',
      originalMessageId: message.id || 'join',
      success: true,
      timestamp: Date.now(),
      version: this.syncManager.getOrCreateOperationLog(canvasId).getVersion(),
    };

    // Send delta if reconnecting
    if (delta && delta.operations.length > 0) {
      this.send(ws, {
        type: 'sync:delta',
        ...delta, // delta already contains canvasId
        timestamp: Date.now(),
      } as unknown as WSOutgoingMessage);
    }

    this.send(ws, ackPayload as unknown as WSOutgoingMessage);

    // Broadcast presence to other users (including cross-server)
    const joinMessage: WSPresenceJoinMessage = {
      type: 'presence:join',
      canvasId,
      user: {
        id: userId,
        username,
        color: presence?.color || '#808080',
      },
      timestamp: Date.now(),
    };

    this.broadcastToRoom(canvasId, joinMessage, userId);

    // Send current presence list to the joining user
    const presentUsers = Array.from(room.clients.entries())
      .filter(([id]) => id !== userId)
      .map(([id]) => {
        const p = this.userPresence.get(id);
        return p ? {
          type: 'presence:join' as const,
          canvasId,
          user: {
            id: p.userId,
            username: p.username,
            color: p.color,
          },
          timestamp: Date.now(),
        } : null;
      })
      .filter(Boolean);

    presentUsers.forEach((msg) => {
      if (msg) this.send(ws, msg);
    });

    logger.debug({ userId, canvasId, roomSize: room.clients.size, hasSync: !!delta },
      'User joined canvas room');
  }

  /**
   * Handle explicit sync request
   */
  private handleSyncRequest(ws: AuthenticatedWebSocket, message: WSIncomingMessage): void {
    const canvasId = ws.canvasId;
    if (!canvasId) {
      this.sendError(ws, 'NOT_IN_ROOM', 'Join a canvas first', message.id);
      return;
    }

    const fromVersion = (message as { fromVersion?: number }).fromVersion || 0;
    const opLog = this.syncManager.getOrCreateOperationLog(canvasId);
    const delta = opLog.getDelta(canvasId, fromVersion);

    this.send(ws, {
      type: 'sync:delta',
      ...delta, // delta already contains canvasId
      timestamp: Date.now(),
    } as unknown as WSOutgoingMessage);
  }

  /**
   * Handle leave canvas room
   */
  private handleLeave(ws: AuthenticatedWebSocket, message: WSLeaveMessage): void {
    const { canvasId } = message;
    this.leaveRoom(ws, canvasId);

    this.send(ws, {
      type: 'ack',
      originalMessageId: message.id || 'leave',
      success: true,
      timestamp: Date.now(),
    });
  }

  /**
   * Leave a room
   */
  private leaveRoom(ws: AuthenticatedWebSocket, canvasId: string): void {
    const room = this.rooms.get(canvasId);
    if (!room || !ws.userId) return;

    room.clients.delete(ws.userId);
    room.userColors.delete(ws.userId);

    // Remove sync session
    if (ws.connectionId) {
      this.syncManager.removeSession(ws.connectionId);
    }

    // Broadcast leave to remaining users (including cross-server)
    const leaveMessage: WSPresenceLeaveMessage = {
      type: 'presence:leave',
      canvasId,
      userId: ws.userId,
      timestamp: Date.now(),
    };
    this.broadcastToRoom(canvasId, leaveMessage);

    // Clean up empty rooms
    if (room.clients.size === 0) {
      this.rooms.delete(canvasId);
    }

    ws.canvasId = undefined;
    logger.debug({ userId: ws.userId, canvasId }, 'User left canvas room');
  }

  /**
   * Handle canvas/widget messages with operation logging
   * SECURITY: Validates message schema and filters sensitive fields before broadcast
   */
  private handleCanvasMessage(ws: AuthenticatedWebSocket, message: WSIncomingMessage): void {
    const canvasId = (message as { canvasId: string }).canvasId;

    // Verify user is in the room
    if (ws.canvasId !== canvasId) {
      this.sendError(ws, 'NOT_IN_ROOM', 'You are not in this canvas room', message.id);
      return;
    }

    // SECURITY: Validate message schema and sanitize sensitive fields
    const validationResult = validateAndSanitizeWSMessage(
      message.type,
      message
    );

    if (!validationResult.success) {
      logger.warn(
        { userId: ws.userId, canvasId, messageType: message.type, error: validationResult.error },
        'WebSocket message validation failed'
      );
      this.sendError(ws, 'VALIDATION_ERROR', validationResult.error, message.id);
      return;
    }

    // Use the sanitized message (sensitive fields removed)
    const sanitizedMessage = validationResult.data as WSIncomingMessage;

    // Record operation for sync
    const opLog = this.syncManager.getOrCreateOperationLog(canvasId);
    const operationType = this.messageTypeToOperationType(message.type);

    if (operationType) {
      const widgetId = (sanitizedMessage as { widgetId?: string }).widgetId ||
                       (sanitizedMessage as { widgetIds?: string[] }).widgetIds?.[0] ||
                       'canvas';

      opLog.recordOperation(
        operationType,
        widgetId,
        widgetId === 'canvas' ? 'canvas' : 'widget',
        (sanitizedMessage as { data?: unknown }).data || sanitizedMessage,
        ws.userId!
      );
    }

    // Add version info to outgoing message (using sanitized data)
    const outgoing = {
      ...sanitizedMessage,
      timestamp: Date.now(),
      version: opLog.getVersion(),
      userId: ws.userId,
    } as unknown as WSOutgoingMessage;

    // Broadcast sanitized message to local clients
    this.broadcastToRoom(canvasId, outgoing, ws.userId);

    // Send acknowledgment with version
    if (message.id) {
      this.send(ws, {
        type: 'ack',
        originalMessageId: message.id,
        success: true,
        timestamp: Date.now(),
        version: opLog.getVersion(),
      } as unknown as WSOutgoingMessage);
    }
  }

  /**
   * Map message type to operation type
   */
  private messageTypeToOperationType(type: string): OperationType | null {
    const mapping: Record<string, OperationType> = {
      'widget:create': 'create',
      'widget:update': 'update',
      'widget:delete': 'delete',
      'widget:move': 'move',
      'widget:resize': 'resize',
      'widget:state': 'state_change',
      'canvas:update': 'update',
    };
    return mapping[type] || null;
  }

  /**
   * Handle presence messages (cursor, selection)
   */
  private handlePresenceMessage(ws: AuthenticatedWebSocket, message: WSIncomingMessage): void {
    const canvasId = (message as { canvasId: string }).canvasId;

    if (ws.canvasId !== canvasId) {
      return;
    }

    // Update presence
    const presence = this.userPresence.get(ws.userId!);
    if (presence) {
      presence.lastSeen = Date.now();

      if (message.type === 'cursor:move') {
        presence.cursor = (message as { position: { x: number; y: number } }).position;
      } else if (message.type === 'selection:change') {
        presence.selectedIds = (message as { selectedIds: string[] }).selectedIds;
      }
    }

    // Broadcast presence update to others
    this.broadcastToRoom(canvasId, {
      type: 'presence:update',
      canvasId,
      userId: ws.userId!,
      cursor: message.type === 'cursor:move'
        ? (message as { position: { x: number; y: number } }).position
        : undefined,
      selectedIds: message.type === 'selection:change'
        ? (message as { selectedIds: string[] }).selectedIds
        : undefined,
      timestamp: Date.now(),
    }, ws.userId);
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(ws: AuthenticatedWebSocket): void {
    if (ws.canvasId) {
      this.leaveRoom(ws, ws.canvasId);
    }

    if (ws.userId) {
      this.userPresence.delete(ws.userId);
      logger.debug({ userId: ws.userId }, 'WebSocket disconnected');
    }

    if (ws.connectionId) {
      this.syncManager.removeSession(ws.connectionId);
    }
  }

  /**
   * Send message to a client
   */
  private send(ws: WebSocket, message: WSOutgoingMessage | Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, code: string, message: string, originalMessageId?: string): void {
    const errorMessage: WSErrorMessage = {
      type: 'error',
      code,
      message,
      originalMessageId,
      timestamp: Date.now(),
    };
    this.send(ws, errorMessage);
  }

  /**
   * Broadcast message to all clients in a room (local + remote via pub/sub)
   */
  private broadcastToRoom(canvasId: string, message: WSOutgoingMessage, excludeUserId?: string): void {
    const room = this.rooms.get(canvasId);

    // Broadcast to local clients
    if (room) {
      room.clients.forEach((client, userId) => {
        if (userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }

    // Broadcast to remote servers via pub/sub
    if (this.pubsub) {
      this.pubsub.publish(`canvas:${canvasId}`, message, this.serverId).catch((err) => {
        logger.error({ err, canvasId }, 'Failed to publish to pubsub');
      });
    }
  }

  /**
   * Get next color from palette
   */
  private getNextColor(): string {
    const color = PRESENCE_COLORS[this.colorIndex % PRESENCE_COLORS.length];
    this.colorIndex++;
    return color;
  }

  /**
   * Get room info (for debugging/monitoring)
   */
  getRoomInfo(canvasId: string): { userCount: number; users: string[]; version: number } | null {
    const room = this.rooms.get(canvasId);
    if (!room) return null;

    const opLog = this.syncManager.getOrCreateOperationLog(canvasId);

    return {
      userCount: room.clients.size,
      users: Array.from(room.clients.keys()),
      version: opLog.getVersion(),
    };
  }

  /**
   * Get all rooms info
   */
  getAllRoomsInfo(): Array<{ canvasId: string; userCount: number; version: number }> {
    return Array.from(this.rooms.entries()).map(([canvasId, room]) => {
      const opLog = this.syncManager.getOrCreateOperationLog(canvasId);
      return {
        canvasId,
        userCount: room.clients.size,
        version: opLog.getVersion(),
      };
    });
  }

  /**
   * Get server statistics
   */
  getStats(): {
    serverId: string;
    connections: number;
    rooms: number;
    pubsubAdapter: string;
    syncStats: {
      totalSessions: number;
      totalUsers: number;
      totalCanvases: number;
      operationLogCount: number;
    };
  } {
    return {
      serverId: this.serverId,
      connections: this.connectionMap.size,
      rooms: this.rooms.size,
      pubsubAdapter: this.pubsub?.getName() || 'none',
      syncStats: this.syncManager.getStats(),
    };
  }
}

/**
 * Factory function for creating scalable WebSocket server
 */
export function createScalableWebSocketServer(
  server: Server,
  config: ScalableWSConfig = {}
): ScalableCanvasWebSocketServer {
  return new ScalableCanvasWebSocketServer(server, config);
}
