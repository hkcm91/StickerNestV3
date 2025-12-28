import type { WebSocket } from 'ws';

/**
 * Extended WebSocket with user/canvas context
 */
export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  canvasId?: string;
  connectionId?: string; // Unique connection ID for session tracking
  isAlive?: boolean;
}

/**
 * WebSocket message types matching frontend EventBus
 */
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

/**
 * Base WebSocket message structure
 */
export interface WSMessage {
  type: WSMessageType;
  id?: string; // Message ID for acknowledgment
  timestamp?: number;
}

/**
 * Authentication message
 */
export interface WSAuthMessage extends WSMessage {
  type: 'auth';
  token: string;
}

/**
 * Join canvas message
 */
export interface WSJoinMessage extends WSMessage {
  type: 'join';
  canvasId: string;
}

/**
 * Leave canvas message
 */
export interface WSLeaveMessage extends WSMessage {
  type: 'leave';
  canvasId: string;
}

/**
 * Canvas update message
 */
export interface WSCanvasUpdateMessage extends WSMessage {
  type: 'canvas:update';
  canvasId: string;
  changes: {
    name?: string;
    backgroundConfig?: unknown;
    settings?: unknown;
    version: number;
  };
}

/**
 * Widget create message
 */
export interface WSWidgetCreateMessage extends WSMessage {
  type: 'widget:create';
  canvasId: string;
  widget: {
    id: string;
    widgetDefId: string;
    version: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    zIndex: number;
    state?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Widget update message
 */
export interface WSWidgetUpdateMessage extends WSMessage {
  type: 'widget:update';
  canvasId: string;
  widgetId: string;
  changes: Record<string, unknown>;
}

/**
 * Widget delete message
 */
export interface WSWidgetDeleteMessage extends WSMessage {
  type: 'widget:delete';
  canvasId: string;
  widgetId: string;
}

/**
 * Widget move message (optimized for frequent updates)
 */
export interface WSWidgetMoveMessage extends WSMessage {
  type: 'widget:move';
  canvasId: string;
  widgetId: string;
  position: { x: number; y: number };
}

/**
 * Widget resize message
 */
export interface WSWidgetResizeMessage extends WSMessage {
  type: 'widget:resize';
  canvasId: string;
  widgetId: string;
  dimensions: { width: number; height: number };
}

/**
 * Widget state update message (optimized for state sync)
 */
export interface WSWidgetStateMessage extends WSMessage {
  type: 'widget:state';
  canvasId: string;
  widgetId: string;
  state: Record<string, unknown>;
  partial?: boolean; // If true, merge with existing state
}

/**
 * Batch widget update message
 */
export interface WSWidgetBatchMessage extends WSMessage {
  type: 'widget:batch';
  canvasId: string;
  updates: Array<{
    widgetId: string;
    changes: Record<string, unknown>;
  }>;
}

/**
 * Cursor move message (for collaborative cursors)
 */
export interface WSCursorMoveMessage extends WSMessage {
  type: 'cursor:move';
  canvasId: string;
  position: { x: number; y: number };
}

/**
 * Selection change message
 */
export interface WSSelectionChangeMessage extends WSMessage {
  type: 'selection:change';
  canvasId: string;
  selectedIds: string[];
}

/**
 * Presence join message (broadcast to others)
 */
export interface WSPresenceJoinMessage extends WSMessage {
  type: 'presence:join';
  canvasId: string;
  user: {
    id: string;
    username: string;
    color: string;
  };
}

/**
 * Presence leave message
 */
export interface WSPresenceLeaveMessage extends WSMessage {
  type: 'presence:leave';
  canvasId: string;
  userId: string;
}

/**
 * Presence update message (cursor, selection, etc.)
 */
export interface WSPresenceUpdateMessage extends WSMessage {
  type: 'presence:update';
  canvasId: string;
  userId: string;
  cursor?: { x: number; y: number };
  selectedIds?: string[];
}

/**
 * Error message
 */
export interface WSErrorMessage extends WSMessage {
  type: 'error';
  code: string;
  message: string;
  originalMessageId?: string;
}

/**
 * Acknowledgment message
 */
export interface WSAckMessage extends WSMessage {
  type: 'ack';
  originalMessageId: string;
  success: boolean;
}

/**
 * Union of all message types
 */
export type WSIncomingMessage =
  | WSAuthMessage
  | WSJoinMessage
  | WSLeaveMessage
  | WSCanvasUpdateMessage
  | WSWidgetCreateMessage
  | WSWidgetUpdateMessage
  | WSWidgetDeleteMessage
  | WSWidgetMoveMessage
  | WSWidgetResizeMessage
  | WSWidgetStateMessage
  | WSWidgetBatchMessage
  | WSCursorMoveMessage
  | WSSelectionChangeMessage;

export type WSOutgoingMessage =
  | WSCanvasUpdateMessage
  | WSWidgetCreateMessage
  | WSWidgetUpdateMessage
  | WSWidgetDeleteMessage
  | WSWidgetMoveMessage
  | WSWidgetResizeMessage
  | WSWidgetStateMessage
  | WSWidgetBatchMessage
  | WSPresenceJoinMessage
  | WSPresenceLeaveMessage
  | WSPresenceUpdateMessage
  | WSErrorMessage
  | WSAckMessage;

/**
 * Canvas room info
 */
export interface CanvasRoom {
  canvasId: string;
  clients: Map<string, AuthenticatedWebSocket>; // userId -> WebSocket
  userColors: Map<string, string>; // userId -> color
}

/**
 * User presence info
 */
export interface UserPresence {
  userId: string;
  username: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedIds: string[];
  lastSeen: number;
}
