/**
 * StickerNest v2 - Runtime Types
 * Event system, runtime context, and widget API interfaces
 */

import type { WidgetInstance } from './domain';

export type EventScope = "widget" | "canvas" | "user" | "global";

/**
 * Event metadata for identity and loop prevention
 */
export interface EventMetadata {
  /** Unique event ID */
  eventId: string;

  /** Identity of the originator */
  originTabId: string;
  originDeviceId?: string;
  originSessionId?: string;

  /** Loop guard - tabs that have already processed this event */
  seenBy: string[];

  /** Hop count for tracking propagation depth */
  hopCount: number;

  /** Original timestamp when event was first created */
  originTimestamp: number;
}

export interface Event {
  type: string;
  scope: EventScope;
  payload: any;
  sourceWidgetId?: string;
  targetWidgetId?: string;
  timestamp?: number;

  /** Metadata for cross-context sync (optional for backwards compatibility) */
  metadata?: EventMetadata;
}

export type EventHandler = (event: Event) => void;

export type UnsubscribeFn = () => void;

export interface EventBus {
  emit(event: Event): void;
  on(type: string, handler: EventHandler): UnsubscribeFn;
}

export interface GlobalStateStore {
  get(key: string): any;
  set(key: string, value: any): void;
  subscribe(key: string, handler: (value: any) => void): UnsubscribeFn;
}

export interface RuntimeContext {
  userId: string;
  canvasId: string;
  widgetInstances: WidgetInstance[];
  eventBus: EventBus;
  stateStore: GlobalStateStore;
}

export interface WidgetAPI {
  emitEvent(event: Event): void;
  onEvent(type: string, handler: EventHandler): UnsubscribeFn;
  getState(): any;
  setState(patch: any): void;
  getAssetUrl(path: string): string;
  debugLog(msg: string, data?: any): void;
}

export interface WidgetSandboxConfig {
  widgetId: string;
  widgetInstanceId: string;
  manifest: any;
  assetBaseUrl: string;
  debugMode: boolean;
}

export interface DebugMessage {
  level: 'log' | 'warn' | 'error' | 'info';
  widgetInstanceId: string;
  message: string;
  data?: any;
  timestamp: number;
}

export type CanvasMode = "view" | "edit" | "connect" | "overlay" | "preview";

export interface CanvasRuntimeConfig {
  canvasId: string;
  userId: string;
  mode: CanvasMode;
  debugEnabled: boolean;
}
