/**
 * WebSocket module exports
 */
export { CanvasWebSocketServer, createWebSocketServer } from './server.js';
export { ScalableCanvasWebSocketServer, createScalableWebSocketServer } from './scalable-server.js';
export type {
  AuthenticatedWebSocket,
  CanvasRoom,
  UserPresence,
  WSMessage,
  WSMessageType,
  WSIncomingMessage,
  WSOutgoingMessage,
  WSAuthMessage,
  WSJoinMessage,
  WSLeaveMessage,
  WSCanvasUpdateMessage,
  WSWidgetCreateMessage,
  WSWidgetUpdateMessage,
  WSWidgetDeleteMessage,
  WSWidgetMoveMessage,
  WSWidgetResizeMessage,
  WSWidgetStateMessage,
  WSWidgetBatchMessage,
  WSCursorMoveMessage,
  WSSelectionChangeMessage,
  WSPresenceJoinMessage,
  WSPresenceLeaveMessage,
  WSPresenceUpdateMessage,
  WSErrorMessage,
  WSAckMessage,
} from './types.js';
