/**
 * StickerNest v2 - Collaboration Types
 * Type definitions for the collaboration service.
 */

// ==================
// WebSocket Protocol Types
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

// ==================
// Remote User Types
// ==================

export interface RemoteUser {
  id: string;
  username: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedIds?: string[];
}

// ==================
// Configuration
// ==================

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

// ==================
// Event Types
// ==================

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
// Widget Types
// ==================

export interface WidgetCreatePayload {
  id: string;
  widgetDefId: string;
  version: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  zIndex: number;
  state?: Record<string, unknown>;
}

export interface WidgetUpdatePayload {
  widgetId: string;
  changes: Record<string, unknown>;
}

export interface WidgetMovePayload {
  widgetId: string;
  position: { x: number; y: number };
}

export interface WidgetResizePayload {
  widgetId: string;
  dimensions: { width: number; height: number };
}

export interface WidgetStatePayload {
  widgetId: string;
  state: Record<string, unknown>;
  partial: boolean;
}

// ==================
// Constants
// ==================

export const COLLABORATOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF7F50',
];
