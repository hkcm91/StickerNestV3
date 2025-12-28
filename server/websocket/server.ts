import { WebSocketServer, WebSocket } from 'ws';
import type { Server, IncomingMessage } from 'http';
import { verifyAccessToken } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import { db } from '../db/client.js';
import { env, isDevelopment } from '../config/env.js';
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

// Color palette for user presence
const PRESENCE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF7F50',
];

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const RATE_LIMIT_MAX_MESSAGES = 30; // Max messages per window

/**
 * Parse allowed origins from CORS_ORIGIN env var
 */
function parseAllowedOrigins(): string[] {
  return env.CORS_ORIGIN.split(',').map(origin => origin.trim());
}

/**
 * Check if an origin is allowed
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  if (isDevelopment) return true;

  const allowedOrigins = parseAllowedOrigins();

  // Check for exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check for wildcard patterns
  for (const allowed of allowedOrigins) {
    if (allowed === '*') return true;

    // Support wildcard subdomains (e.g., *.example.com)
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      if (origin.endsWith(domain)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * WebSocket server for real-time canvas collaboration
 */
export class CanvasWebSocketServer {
  private wss: WebSocketServer;
  private rooms: Map<string, CanvasRoom> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private colorIndex = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      // Verify origin before accepting connection
      verifyClient: (info: { origin: string; secure: boolean; req: IncomingMessage }, callback: (result: boolean, code?: number, message?: string) => void) => {
        const origin = info.origin || info.req.headers.origin;

        if (!isOriginAllowed(origin)) {
          logger.warn({ origin }, 'WebSocket connection rejected: invalid origin');
          callback(false, 403, 'Origin not allowed');
          return;
        }

        callback(true);
      },
    });

    this.setupServer();
    this.startHeartbeat();

    logger.info('WebSocket server initialized');
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: AuthenticatedWebSocket) => {
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        logger.error({ err: error, userId: ws.userId }, 'WebSocket error');
      });

      // Send initial connection acknowledgment
      this.send(ws, {
        type: 'ack',
        originalMessageId: 'connection',
        success: true,
        timestamp: Date.now(),
      });
    });

    this.wss.on('error', (error) => {
      logger.error({ err: error }, 'WebSocket server error');
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
    }, 30000); // 30 seconds
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
    logger.info('WebSocket server stopped');
  }

  /**
   * Check rate limit for a user
   * Returns true if the user is within rate limits, false if rate limited
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Create or reset rate limit window
      this.rateLimitMap.set(userId, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
      });
      return true;
    }

    if (userLimit.count >= RATE_LIMIT_MAX_MESSAGES) {
      return false;
    }

    userLimit.count++;
    return true;
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

    // Check rate limit
    if (!this.checkRateLimit(ws.userId)) {
      this.sendError(ws, 'RATE_LIMITED', 'Too many messages, please slow down', message.id);
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
   * Handle authentication
   */
  private handleAuth(ws: AuthenticatedWebSocket, message: WSAuthMessage): void {
    try {
      const payload = verifyAccessToken(message.token);
      ws.userId = payload.userId;
      ws.username = payload.username;

      // Assign a color for presence
      const color = this.getNextColor();
      this.userPresence.set(payload.userId, {
        userId: payload.userId,
        username: payload.username,
        color,
        selectedIds: [],
        lastSeen: Date.now(),
      });

      this.send(ws, {
        type: 'ack',
        originalMessageId: message.id || 'auth',
        success: true,
        timestamp: Date.now(),
      });

      logger.debug({ userId: payload.userId }, 'WebSocket authenticated');
    } catch (error) {
      this.sendError(ws, 'AUTH_FAILED', 'Invalid or expired token', message.id);
    }
  }

  /**
   * Verify user has access to a canvas
   * Returns true if access is allowed, false otherwise
   */
  private async verifyCanvasAccess(userId: string, canvasId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const canvas = await db.canvas.findUnique({
        where: { id: canvasId },
        select: {
          userId: true,
          visibility: true,
          hasPassword: true,
        },
      });

      if (!canvas) {
        return { allowed: false, reason: 'Canvas not found' };
      }

      // Owner always has access
      if (canvas.userId === userId) {
        return { allowed: true };
      }

      // Private canvases are not accessible to non-owners
      if (canvas.visibility === 'private') {
        return { allowed: false, reason: 'Canvas is private' };
      }

      // Password-protected canvases require prior authentication via REST API
      // For WebSocket, we only allow if the canvas is public/unlisted without password
      // or if the user has already accessed it (validated through normal canvas access)
      if (canvas.hasPassword) {
        return { allowed: false, reason: 'Password-protected canvas requires authentication via API' };
      }

      // Public and unlisted canvases are accessible
      return { allowed: true };
    } catch (error) {
      logger.error({ error, userId, canvasId }, 'Error verifying canvas access');
      return { allowed: false, reason: 'Internal error' };
    }
  }

  /**
   * Handle join canvas room
   */
  private async handleJoin(ws: AuthenticatedWebSocket, message: WSJoinMessage): Promise<void> {
    const { canvasId } = message;
    const userId = ws.userId!;
    const username = ws.username!;

    // Verify user has access to the canvas
    const accessResult = await this.verifyCanvasAccess(userId, canvasId);
    if (!accessResult.allowed) {
      this.sendError(ws, 'ACCESS_DENIED', accessResult.reason || 'Access denied', message.id);
      logger.warn({ userId, canvasId, reason: accessResult.reason }, 'Canvas access denied for WebSocket');
      return;
    }

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

    // Assign color for this room
    const presence = this.userPresence.get(userId);
    if (presence) {
      room.userColors.set(userId, presence.color);
    }

    // Send acknowledgment
    this.send(ws, {
      type: 'ack',
      originalMessageId: message.id || 'join',
      success: true,
      timestamp: Date.now(),
    });

    // Broadcast presence to other users in the room
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

    logger.debug({ userId, canvasId, roomSize: room.clients.size }, 'User joined canvas room');
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

    // Broadcast leave to remaining users
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
   * Handle canvas/widget messages
   */
  private handleCanvasMessage(ws: AuthenticatedWebSocket, message: WSIncomingMessage): void {
    const canvasId = (message as { canvasId: string }).canvasId;

    // Verify user is in the room
    if (ws.canvasId !== canvasId) {
      this.sendError(ws, 'NOT_IN_ROOM', 'You are not in this canvas room', message.id);
      return;
    }

    // Broadcast to other users in the room
    this.broadcastToRoom(canvasId, {
      ...message,
      timestamp: Date.now(),
    } as WSOutgoingMessage, ws.userId);

    // Send acknowledgment
    if (message.id) {
      this.send(ws, {
        type: 'ack',
        originalMessageId: message.id,
        success: true,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle presence messages (cursor, selection)
   */
  private handlePresenceMessage(ws: AuthenticatedWebSocket, message: WSIncomingMessage): void {
    const canvasId = (message as { canvasId: string }).canvasId;

    if (ws.canvasId !== canvasId) {
      return; // Silently ignore presence updates for wrong canvas
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
  }

  /**
   * Send message to a client
   */
  private send(ws: WebSocket, message: WSOutgoingMessage | { type: 'ack'; originalMessageId: string; success: boolean; timestamp: number }): void {
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
   * Broadcast message to all clients in a room except sender
   */
  private broadcastToRoom(canvasId: string, message: WSOutgoingMessage, excludeUserId?: string): void {
    const room = this.rooms.get(canvasId);
    if (!room) return;

    room.clients.forEach((client, userId) => {
      if (userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
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
  getRoomInfo(canvasId: string): { userCount: number; users: string[] } | null {
    const room = this.rooms.get(canvasId);
    if (!room) return null;

    return {
      userCount: room.clients.size,
      users: Array.from(room.clients.keys()),
    };
  }

  /**
   * Get all rooms info
   */
  getAllRoomsInfo(): Array<{ canvasId: string; userCount: number }> {
    return Array.from(this.rooms.entries()).map(([canvasId, room]) => ({
      canvasId,
      userCount: room.clients.size,
    }));
  }
}

// Export factory function
export function createWebSocketServer(server: Server): CanvasWebSocketServer {
  return new CanvasWebSocketServer(server);
}
