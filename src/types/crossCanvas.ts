/**
 * StickerNest v2 - Cross-Canvas Communication Types
 * Types for routing events between canvases on the same device or user account
 */

import type { Event } from './runtime';

/**
 * A route that defines how events flow between canvases
 */
export interface CanvasRoute {
  id: string;
  name: string;
  enabled: boolean;

  // Source
  sourceCanvasId: string;
  sourceWidgetId?: string;     // Optional - if undefined, listens to all widgets
  sourcePort?: string;         // Optional - if undefined, listens to all ports

  // Target
  targetCanvasId: string;
  targetWidgetId?: string;     // Optional - if undefined, broadcasts to canvas
  targetPort?: string;         // Optional - if undefined, uses source port name

  // Options
  bidirectional: boolean;      // If true, events flow both ways
  transformPayload?: string;   // Optional JS expression to transform payload

  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * Message format for cross-canvas communication via BroadcastChannel
 */
export interface CrossCanvasMessage {
  type: 'canvas:event' | 'canvas:subscribe' | 'canvas:unsubscribe' | 'canvas:ping' | 'canvas:pong';
  sourceCanvasId: string;
  targetCanvasId?: string;     // If undefined, broadcast to all canvases
  event?: Event;
  routeId?: string;
  subscriptions?: string[];    // Event types to subscribe to
  timestamp: number;
  messageId: string;
}

/**
 * Subscription to receive events from another canvas
 */
export interface CanvasSubscription {
  id: string;
  subscriberCanvasId: string;
  publisherCanvasId: string;
  eventTypes: string[];        // Event types to receive ('*' for all)
  widgetIds?: string[];        // Specific widgets to listen to
  createdAt: number;
}

/**
 * Active canvas info for presence/discovery
 */
export interface ActiveCanvas {
  canvasId: string;
  tabId: string;
  name?: string;
  widgetCount: number;
  lastSeen: number;
  isCurrentTab: boolean;
}

/**
 * Cross-canvas pipeline connection
 * Extends regular pipeline connection to span canvases
 */
export interface CrossCanvasPipelineConnection {
  id: string;
  routeId: string;             // Reference to CanvasRoute

  // Source
  sourceCanvasId: string;
  sourceNodeId: string;
  sourceWidgetId: string;
  sourcePort: string;

  // Target
  targetCanvasId: string;
  targetNodeId: string;
  targetWidgetId: string;
  targetPort: string;

  enabled: boolean;
}

/**
 * Configuration for the CanvasRouter
 */
export interface CanvasRouterConfig {
  canvasId: string;
  userId: string;
  debugEnabled?: boolean;
  autoDiscovery?: boolean;     // Auto-discover other canvases
  heartbeatInterval?: number;  // Ms between heartbeats (default: 5000)
}

/**
 * Events emitted by CanvasRouter
 */
export type CanvasRouterEventType =
  | 'router:connected'
  | 'router:disconnected'
  | 'router:canvasDiscovered'
  | 'router:canvasLost'
  | 'router:routeAdded'
  | 'router:routeRemoved'
  | 'router:eventRouted'
  | 'router:error';

export interface CanvasRouterEvent {
  type: CanvasRouterEventType;
  payload: any;
  timestamp: number;
}
