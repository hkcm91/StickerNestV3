/**
 * StickerNest v2 - Runtime Exports
 * Central export point for all runtime components
 */

// Core runtime
export { EventBus } from './EventBus';
export { CanvasRuntime } from './CanvasRuntime';
export { PipelineRuntime } from './PipelineRuntime';
export type { WidgetOutputEvent, WidgetInputEvent, PipelineActivityEvent } from './PipelineRuntime';
export { RuntimeContext } from './RuntimeContext';

// Widget system
export { WidgetSandboxHost } from './WidgetSandboxHost';
export type { SandboxConfig, DebugMessageCallback } from './WidgetSandboxHost';
export { WidgetIOBridge, getWidgetIOBridge, destroyWidgetIOBridge } from './WidgetIOBridge';
export { WidgetLoader } from './WidgetLoader';

// Cross-canvas communication
export { CanvasRouter, createCanvasRouter } from './CanvasRouter';
export { CanvasBridge, createSharedEventBus } from './CanvasBridge';
export type { BridgeOptions } from './CanvasBridge';

// Canvas Widget Bridge - makes canvas behave like a widget
export {
  CanvasWidgetBridge,
  getCanvasWidgetBridge,
  destroyCanvasWidgetBridge,
  destroyAllCanvasWidgetBridges,
  CanvasWidgetManifest,
  CANVAS_WIDGET_ID,
  CANVAS_WIDGET_DEF_ID
} from './CanvasWidgetBridge';
export type { CanvasWidgetBridgeConfig } from './CanvasWidgetBridge';

// Identity management
export {
  IdentityManager,
  getDeviceId,
  getTabId,
  getSessionId,
  getIdentity
} from './IdentityManager';

// Permission system
export {
  PermissionManager,
  type PermissionGrant,
  type PermissionRequest,
  type PermissionRule,
  type PermissionCheckResult,
  type PermissionState,
  type PermissionPreferences,
  type PermissionScope,
  type PermissionTargetType,
  type RequestPermissionParams,
  type GrantPermissionParams,
  type PermissionEventPayload
} from './PermissionManager';

export {
  PermissionGuard,
  type PermissionGuardOptions,
  getRequiredScope,
  isProtectedEventType
} from './PermissionGuard';

// Runtime Message Dispatcher
export {
  RuntimeMessageDispatcher,
  type RuntimeTransport
} from './RuntimeMessageDispatcher';

// State management
export { UndoManager } from './UndoManager';
export { PresenceManager } from './PresenceManager';
export { CrossTabSync } from './CrossTabSync';
export { DeveloperMode } from './DeveloperMode';

// Transports
export {
  BroadcastChannelTransport,
  createBroadcastChannelTransport,
  SharedWorkerTransport,
  createSharedWorkerTransport,
  WebSocketTransport,
  createWebSocketTransport
} from './transports';

export type {
  TabInfo,
  WorkerInboundMessage,
  WorkerOutboundMessage,
  WebSocketConfig,
  WSMessage,
  WSMessageType,
  ConnectionState,
  RemoteUserPresence
} from './transports';
