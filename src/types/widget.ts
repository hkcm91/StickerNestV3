/**
 * StickerNest v2 - Unified Widget Types
 *
 * This module consolidates all widget-related types into a single source of truth.
 * It includes lifecycle events, capabilities, protocol messages, and widget states.
 *
 * VERSION: 1.0.0
 */

import type { WidgetManifest, WidgetSizeConfig, WidgetInputSchema, WidgetOutputSchema } from './manifest';
import type { Event, EventScope, EventHandler, UnsubscribeFn, DebugMessage } from './runtime';
import type { CapabilityId, WidgetCapabilityDeclaration } from './capabilities';

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type { WidgetManifest, WidgetSizeConfig, WidgetInputSchema, WidgetOutputSchema };
export type { Event, EventScope, EventHandler, UnsubscribeFn, DebugMessage };
export type { CapabilityId, WidgetCapabilityDeclaration };

// ============================================================================
// WIDGET INSTANCE TYPES
// ============================================================================

/**
 * Widget lifecycle state
 */
export type WidgetLifecycleState =
  | 'uninitialized'
  | 'loading'
  | 'ready'
  | 'running'
  | 'paused'
  | 'error'
  | 'destroyed';

/**
 * Widget visibility state
 */
export type WidgetVisibility = 'visible' | 'hidden' | 'minimized' | 'maximized';

/**
 * Extended widget instance with runtime state
 */
export interface WidgetRuntimeInstance {
  /** Unique instance ID */
  id: string;

  /** Widget definition ID */
  widgetDefId: string;

  /** Canvas ID this widget belongs to */
  canvasId: string;

  /** Current lifecycle state */
  lifecycleState: WidgetLifecycleState;

  /** Visibility state */
  visibility: WidgetVisibility;

  /** Position on canvas */
  position: { x: number; y: number };

  /** Size */
  width: number;
  height: number;

  /** Rotation in degrees */
  rotation: number;

  /** Z-index for stacking */
  zIndex: number;

  /** Whether widget is locked */
  locked: boolean;

  /** Widget state data */
  state: Record<string, unknown>;

  /** Widget settings */
  settings: Record<string, unknown>;

  /** Last error if in error state */
  lastError?: string;

  /** Creation timestamp */
  createdAt: number;

  /** Last update timestamp */
  updatedAt: number;
}

// ============================================================================
// LIFECYCLE TYPES
// ============================================================================

/**
 * All lifecycle event types
 */
export type LifecycleEventType =
  | 'init'
  | 'mount'
  | 'ready'
  | 'start'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'destroy'
  | 'resize'
  | 'focus'
  | 'blur'
  | 'visibility-change'
  | 'settings-change'
  | 'state-change'
  | 'error';

/**
 * Lifecycle event payload base
 */
export interface LifecycleEventBase {
  type: LifecycleEventType;
  timestamp: number;
  instanceId: string;
}

/**
 * Mount event data
 */
export interface MountEventData {
  manifest: WidgetManifest;
  state: Record<string, unknown>;
  settings: Record<string, unknown>;
  assetBaseUrl: string;
  debugEnabled: boolean;
  canvasMode: 'view' | 'edit' | 'connect';
  capabilities: string[];
}

/**
 * Resize event data
 */
export interface ResizeEventData {
  width: number;
  height: number;
  previousWidth?: number;
  previousHeight?: number;
}

/**
 * Visibility change event data
 */
export interface VisibilityChangeEventData {
  visible: boolean;
  reason?: 'user' | 'canvas' | 'system';
}

/**
 * Error event data
 */
export interface ErrorEventData {
  message: string;
  code?: string;
  stack?: string;
  recoverable?: boolean;
}

/**
 * Settings change event data
 */
export interface SettingsChangeEventData {
  settings: Record<string, unknown>;
  changedKeys: string[];
}

/**
 * State change event data
 */
export interface StateChangeEventData {
  state: Record<string, unknown>;
  patch: Record<string, unknown>;
}

/**
 * Union of all lifecycle events
 */
export type LifecycleEvent =
  | (LifecycleEventBase & { type: 'init' | 'mount'; data: MountEventData })
  | (LifecycleEventBase & { type: 'ready' | 'start' | 'pause' | 'resume' | 'stop' | 'destroy' | 'focus' | 'blur'; data?: undefined })
  | (LifecycleEventBase & { type: 'resize'; data: ResizeEventData })
  | (LifecycleEventBase & { type: 'visibility-change'; data: VisibilityChangeEventData })
  | (LifecycleEventBase & { type: 'settings-change'; data: SettingsChangeEventData })
  | (LifecycleEventBase & { type: 'state-change'; data: StateChangeEventData })
  | (LifecycleEventBase & { type: 'error'; data: ErrorEventData });

// ============================================================================
// CAPABILITY TYPES
// ============================================================================

/**
 * Available widget capabilities
 */
export type WidgetCapabilityType =
  | 'storage'      // Local storage access
  | 'network'      // Network/fetch access
  | 'settings'     // Settings read/write
  | 'canvas'       // Canvas info access
  | 'audio'        // Audio playback
  | 'clipboard'    // Clipboard access
  | 'notification' // System notifications
  | 'geolocation'  // Location access
  | 'camera'       // Camera access
  | 'microphone';  // Microphone access

/**
 * Capability access level
 */
export type CapabilityAccessLevel = 'none' | 'read' | 'write' | 'full';

/**
 * Capability permission request
 */
export interface CapabilityRequest {
  capability: WidgetCapabilityType;
  level: CapabilityAccessLevel;
  reason?: string;
}

/**
 * Capability permission response
 */
export interface CapabilityResponse {
  capability: WidgetCapabilityType;
  granted: boolean;
  level: CapabilityAccessLevel;
  expiresAt?: number;
}

// ============================================================================
// PROTOCOL TYPES
// ============================================================================

/**
 * Protocol version
 */
export const WIDGET_PROTOCOL_VERSION = '1.0.0';

/**
 * Parent to widget message types
 */
export type P2WMessageType =
  | 'INIT'
  | 'EVENT'
  | 'STATE_UPDATE'
  | 'SETTINGS_UPDATE'
  | 'RESIZE'
  | 'CAPABILITY'
  | 'DESTROY';

/**
 * Widget to parent message types
 */
export type W2PMessageType =
  | 'READY'
  | 'EVENT'
  | 'OUTPUT'
  | 'STATE_PATCH'
  | 'CAPABILITY_REQUEST'
  | 'CANVAS_REQUEST'
  | 'DEBUG_LOG'
  | 'ERROR';

/**
 * Parent to widget message
 */
export interface P2WMessage<T = unknown> {
  type: P2WMessageType;
  instanceId: string;
  payload: T;
  timestamp: number;
  version?: string;
}

/**
 * Widget to parent message
 */
export interface W2PMessage<T = unknown> {
  type: W2PMessageType;
  instanceId: string;
  payload: T;
  timestamp: number;
  version?: string;
}

// ============================================================================
// PIPELINE I/O TYPES
// ============================================================================

/**
 * Port direction
 */
export type PortDirection = 'input' | 'output';

/**
 * Port data types
 */
export type PortDataType =
  | 'any'
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'event'
  | 'trigger';

/**
 * Port definition
 */
export interface PortDefinition {
  name: string;
  direction: PortDirection;
  type: PortDataType;
  description?: string;
  required?: boolean;
  default?: unknown;
}

/**
 * Pipeline input event
 */
export interface PipelineInputEvent {
  portName: string;
  value: unknown;
  source?: {
    widgetId: string;
    portName: string;
    connectionId?: string;
  };
  timestamp: number;
}

/**
 * Pipeline output event
 */
export interface PipelineOutputEvent {
  widgetInstanceId: string;
  portName: string;
  value: unknown;
  timestamp: number;
}

// ============================================================================
// CANVAS REQUEST TYPES
// ============================================================================

/**
 * Canvas request action types
 */
export type CanvasRequestAction =
  | 'move'
  | 'resize'
  | 'rotate'
  | 'bringToFront'
  | 'sendToBack'
  | 'lock'
  | 'unlock'
  | 'close'
  | 'minimize'
  | 'maximize'
  | 'duplicate';

/**
 * Canvas request
 */
export interface CanvasRequest {
  action: CanvasRequestAction;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

// ============================================================================
// WIDGET VALIDATION TYPES
// ============================================================================

/**
 * Validation result severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Single validation issue
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  manifestVersion?: string;
  protocolVersion?: string;
}

// ============================================================================
// WIDGET BUNDLE TYPES
// ============================================================================

/**
 * Bundle file type
 */
export type BundleFileType = 'js' | 'ts' | 'tsx' | 'html' | 'css' | 'json' | 'svg' | 'png' | 'jpg' | 'gif' | 'asset';

/**
 * Bundle file entry
 */
export interface BundleFile {
  path: string;
  content: string | Uint8Array;
  type: BundleFileType;
  size: number;
  hash?: string;
}

/**
 * Widget bundle
 */
export interface WidgetBundle {
  manifest: WidgetManifest;
  files: BundleFile[];
  totalSize: number;
  hash: string;
  createdAt: number;
  signature?: string;
}

// ============================================================================
// WIDGET REGISTRY TYPES
// ============================================================================

/**
 * Widget registry entry
 */
export interface WidgetRegistryEntry {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  kind: string;
  bundleUrl: string;
  bundleSize: number;
  manifestUrl: string;
  iconUrl?: string;
  previewUrl?: string;
  isOfficial: boolean;
  isVerified: boolean;
  publishedAt: number;
  updatedAt: number;
  downloads: number;
  rating?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Widget state patch
 */
export type WidgetStatePatch = DeepPartial<Record<string, unknown>>;

/**
 * Widget update payload
 */
export interface WidgetUpdatePayload {
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  locked?: boolean;
  visible?: boolean;
  state?: WidgetStatePatch;
  settings?: Record<string, unknown>;
}

// ============================================================================
// WIDGET API CONTRACT
// ============================================================================

/**
 * The minimal widget implementation interface.
 * This is what a widget module should export.
 */
export interface WidgetModule {
  /**
   * Initialize the widget in the given container
   * @param container - DOM element to render into
   * @param api - The WidgetAPI instance
   */
  init?(container: HTMLElement, api: WidgetAPIContract): void | Promise<void>;

  /**
   * Render the widget (alternative to init)
   */
  render?(container: HTMLElement, api: WidgetAPIContract): void | Promise<void>;

  /**
   * Cleanup function (optional)
   */
  destroy?(): void | Promise<void>;
}

/**
 * Contract for the WidgetAPI that widgets receive.
 * This is the stable API surface.
 */
export interface WidgetAPIContract {
  // Version
  readonly version: string;
  readonly instanceId: string;

  // Lifecycle
  onMount(handler: (context: MountEventData) => void | Promise<void>): UnsubscribeFn;
  onDestroy(handler: () => void | Promise<void>): UnsubscribeFn;
  onResize(handler: (data: ResizeEventData) => void): UnsubscribeFn;

  // Events
  onEvent(type: string, handler: EventHandler): UnsubscribeFn;
  emitEvent(event: Omit<Event, 'sourceWidgetId' | 'timestamp'>): void;
  emit(type: string, payload?: unknown, scope?: EventScope): void;

  // Pipeline I/O
  emitOutput(portName: string, value: unknown): void;
  onInput(portName: string, handler: (value: unknown, source?: { widgetId: string; portName: string }) => void): UnsubscribeFn;

  // State
  getState<T = Record<string, unknown>>(): T;
  setState(patch: Record<string, unknown>): void;
  replaceState(newState: Record<string, unknown>): void;
  onStateChange(handler: (state: Record<string, unknown>) => void): UnsubscribeFn;

  // Assets
  getAssetUrl(path: string): string;

  // Canvas requests
  requestMove(x: number, y: number): void;
  requestResize(width: number, height: number): void;
  requestBringToFront(): void;
  requestClose(): void;

  // Logging
  log(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;

  // Capabilities (optional based on permissions)
  getStorage?(): StorageAPIContract | null;
  getNetwork?(): NetworkAPIContract | null;
  getSettings?(): SettingsAPIContract | null;
  getCanvas?(): CanvasAPIContract | null;
  hasCapability(name: string): boolean;
}

/**
 * Storage capability contract
 */
export interface StorageAPIContract {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * Network capability contract
 */
export interface NetworkAPIContract {
  fetch(url: string, options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: string | object;
    timeout?: number;
  }): Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: unknown;
  }>;
  isOnline(): boolean;
  onStatusChange(handler: (online: boolean) => void): UnsubscribeFn;
}

/**
 * Settings capability contract
 */
export interface SettingsAPIContract {
  getAll(): Record<string, unknown>;
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T): void;
  onChange(handler: (settings: Record<string, unknown>) => void): UnsubscribeFn;
}

/**
 * Canvas capability contract
 */
export interface CanvasAPIContract {
  getSize(): { width: number; height: number };
  getMode(): 'view' | 'edit' | 'connect';
  getZoom(): number;
  getTheme(): string;
  onModeChange(handler: (mode: string) => void): UnsubscribeFn;
}
