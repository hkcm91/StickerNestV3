/**
 * StickerNest v2 - Stable Widget Runtime API
 *
 * This module defines the OFFICIAL, STABLE API contract for all widgets.
 * All widgets (built-in, AI-generated, third-party) must use this API.
 *
 * VERSION: 1.0.0
 *
 * @module WidgetAPI
 */

import type { Event, EventHandler, UnsubscribeFn, EventScope, DebugMessage } from '../types/runtime';
import type { WidgetManifest, WidgetSizeConfig } from '../types/manifest';
import type { WidgetInstance } from '../types/domain';
import type { CapabilityId } from '../types/capabilities';

// ============================================================================
// WIDGET API VERSION
// ============================================================================

export const WIDGET_API_VERSION = '1.0.0';

// ============================================================================
// MESSAGE PROTOCOL TYPES
// ============================================================================

/**
 * Parent-to-Widget message types
 * These are the message types sent FROM the host TO the widget iframe
 */
export type ParentToWidgetMessageType =
  | 'INIT'           // Initialize widget with state and manifest
  | 'EVENT'          // Forward event to widget
  | 'STATE_UPDATE'   // Update widget state
  | 'DESTROY'        // Widget is being destroyed
  | 'RESIZE'         // Widget container was resized
  | 'CAPABILITY'     // Capability response (storage, network, etc.)
  | 'SETTINGS_UPDATE'; // Settings have changed

/**
 * Widget-to-Parent message types
 * These are the message types sent FROM the widget TO the host
 */
export type WidgetToParentMessageType =
  | 'READY'          // Widget is ready to receive events
  | 'EVENT'          // Emit event to event bus
  | 'STATE_PATCH'    // Update local state
  | 'DEBUG_LOG'      // Debug log message
  | 'ERROR'          // Error occurred
  | 'CAPABILITY_REQUEST' // Request capability access
  | 'OUTPUT'         // Pipeline output
  | 'CANVAS_REQUEST' // Request canvas operation
  | 'CONTENT_SIZE';  // Report actual content dimensions

/**
 * Message structure for parent-to-widget communication
 */
export interface ParentToWidgetMessage {
  type: ParentToWidgetMessageType;
  instanceId: string;
  payload: unknown;
  timestamp?: number;
}

/**
 * Message structure for widget-to-parent communication
 */
export interface WidgetToParentMessage {
  type: WidgetToParentMessageType;
  instanceId: string;
  payload: unknown;
  timestamp?: number;
}

// ============================================================================
// LIFECYCLE TYPES
// ============================================================================

/**
 * Lifecycle event types
 */
export type LifecycleEventType =
  | 'mount'
  | 'destroy'
  | 'resize'
  | 'visibility-change'
  | 'focus'
  | 'blur';

/**
 * Lifecycle event payload
 */
export interface LifecycleEvent {
  type: LifecycleEventType;
  timestamp: number;
  data?: Record<string, unknown>;
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
 * Lifecycle handler function
 */
export type LifecycleHandler<T = unknown> = (data?: T) => void | Promise<void>;

// ============================================================================
// CAPABILITY TYPES
// ============================================================================

/**
 * Capability access levels
 */
export type CapabilityAccessLevel = 'none' | 'read' | 'write' | 'full';

/**
 * Storage capability interface
 */
export interface StorageCapability {
  /** Get a value from widget-scoped storage */
  get<T = unknown>(key: string): Promise<T | null>;

  /** Set a value in widget-scoped storage */
  set<T = unknown>(key: string, value: T): Promise<void>;

  /** Remove a value from storage */
  remove(key: string): Promise<void>;

  /** List all keys in widget storage */
  keys(): Promise<string[]>;

  /** Clear all widget storage */
  clear(): Promise<void>;
}

/**
 * Network capability interface
 */
export interface NetworkCapability {
  /** Fetch data from a URL */
  fetch(url: string, options?: NetworkFetchOptions): Promise<NetworkResponse>;

  /** Check if network is available */
  isOnline(): boolean;

  /** Subscribe to network status changes */
  onStatusChange(handler: (online: boolean) => void): UnsubscribeFn;
}

/**
 * Network fetch options (subset of standard fetch options)
 */
export interface NetworkFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | object;
  timeout?: number;
}

/**
 * Network response structure
 */
export interface NetworkResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
}

/**
 * Settings capability interface
 */
export interface SettingsCapability {
  /** Get all widget settings */
  getAll(): Record<string, unknown>;

  /** Get a specific setting */
  get<T = unknown>(key: string): T | undefined;

  /** Set a setting (requires write access) */
  set<T = unknown>(key: string, value: T): void;

  /** Subscribe to settings changes */
  onChange(handler: (settings: Record<string, unknown>) => void): UnsubscribeFn;
}

/**
 * Canvas capability interface (read-only access to canvas info)
 */
export interface CanvasCapability {
  /** Get canvas dimensions */
  getSize(): { width: number; height: number };

  /** Get canvas mode */
  getMode(): 'view' | 'edit' | 'connect';

  /** Get zoom level */
  getZoom(): number;

  /** Get current theme */
  getTheme(): 'light' | 'dark' | string;

  /** Subscribe to mode changes */
  onModeChange(handler: (mode: string) => void): UnsubscribeFn;
}

/**
 * Full capability access object
 */
export interface WidgetCapabilities {
  storage?: StorageCapability;
  network?: NetworkCapability;
  settings?: SettingsCapability;
  canvas?: CanvasCapability;
}

// ============================================================================
// WIDGET CONTEXT
// ============================================================================

/**
 * Widget initialization context
 * Passed to the widget on INIT
 */
export interface WidgetInitContext {
  /** Widget instance ID */
  instanceId: string;

  /** Widget ID (alias for instanceId) */
  widgetId: string;

  /** Canvas ID this widget belongs to */
  canvasId: string;

  /** Widget definition ID */
  widgetDefId: string;

  /** Widget manifest */
  manifest: WidgetManifest;

  /** Initial state */
  state: Record<string, unknown>;

  /** Asset base URL */
  assetBaseUrl: string;

  /** Debug mode enabled */
  debugEnabled: boolean;

  /** Widget size */
  size: {
    width: number;
    height: number;
  };

  /** Canvas mode */
  canvasMode: 'view' | 'edit' | 'connect';

  /** Available capabilities */
  capabilities: string[];
}

// ============================================================================
// WIDGET API INTERFACE (Widget-side)
// ============================================================================

/**
 * The main WidgetAPI interface available to widgets inside the iframe.
 * This is the stable contract that all widgets must use.
 */
export interface IWidgetAPI {
  // ==================
  // VERSION
  // ==================

  /** API version */
  readonly version: string;

  /** Widget instance ID */
  readonly instanceId: string;

  // ==================
  // LIFECYCLE
  // ==================

  /**
   * Register a handler for when the widget mounts (receives INIT)
   * Called once when the widget is first initialized
   */
  onMount(handler: LifecycleHandler<WidgetInitContext>): UnsubscribeFn;

  /**
   * Register a handler for when the widget is destroyed
   * Called when the widget is being removed from the canvas
   */
  onDestroy(handler: LifecycleHandler): UnsubscribeFn;

  /**
   * Register a handler for when the widget is resized
   * Called whenever the widget container size changes
   */
  onResize(handler: LifecycleHandler<ResizeEventData>): UnsubscribeFn;

  // ==================
  // EVENTS
  // ==================

  /**
   * Subscribe to events of a specific type
   * @param type - Event type to listen for (or '*' for all events)
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  onEvent(type: string, handler: EventHandler): UnsubscribeFn;

  /**
   * Emit an event to the EventBus
   * @param event - Event to emit
   */
  emitEvent(event: Omit<Event, 'sourceWidgetId' | 'timestamp'>): void;

  /**
   * Emit a typed event with just type and payload
   * Convenience wrapper for emitEvent
   */
  emit(type: string, payload?: unknown, scope?: EventScope): void;

  // ==================
  // PIPELINE I/O
  // ==================

  /**
   * Emit output on a named port
   * Used for pipeline connections between widgets
   */
  emitOutput(portName: string, value: unknown): void;

  /**
   * Subscribe to input on a named port
   * Used for receiving pipeline connections from other widgets
   */
  onInput(portName: string, handler: (value: unknown, source?: { widgetId: string; portName: string }) => void): UnsubscribeFn;

  // ==================
  // STATE
  // ==================

  /**
   * Get the current widget state
   * Returns a deep copy of the state
   */
  getState<T = Record<string, unknown>>(): T;

  /**
   * Update the widget state
   * Merges the patch into the current state
   * @param patch - Partial state to merge
   */
  setState(patch: Record<string, unknown>): void;

  /**
   * Replace the entire widget state
   * @param newState - New state object
   */
  replaceState(newState: Record<string, unknown>): void;

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: (state: Record<string, unknown>) => void): UnsubscribeFn;

  // ==================
  // ASSETS
  // ==================

  /**
   * Resolve an asset path to a full URL
   * @param path - Relative asset path
   */
  getAssetUrl(path: string): string;

  // ==================
  // CAPABILITIES
  // ==================

  /**
   * Get the storage capability (if available)
   */
  getStorage(): StorageCapability | null;

  /**
   * Get the network capability (if available)
   */
  getNetwork(): NetworkCapability | null;

  /**
   * Get the settings capability (if available)
   */
  getSettings(): SettingsCapability | null;

  /**
   * Get the canvas capability (if available)
   */
  getCanvas(): CanvasCapability | null;

  /**
   * Check if a capability is available
   */
  hasCapability(name: string): boolean;

  // ==================
  // CANVAS REQUESTS
  // ==================

  /**
   * Request to update widget position (if allowed)
   */
  requestMove(x: number, y: number): void;

  /**
   * Request to update widget size (if allowed)
   */
  requestResize(width: number, height: number): void;

  /**
   * Request to bring widget to front
   */
  requestBringToFront(): void;

  /**
   * Request to close/remove the widget
   */
  requestClose(): void;

  // ==================
  // DEBUGGING
  // ==================

  /** Log a debug message */
  log(message: string, data?: unknown): void;

  /** Log an info message */
  info(message: string, data?: unknown): void;

  /** Log a warning */
  warn(message: string, data?: unknown): void;

  /** Log an error */
  error(message: string, data?: unknown): void;
}

// ============================================================================
// WIDGET SDK SCRIPT GENERATOR
// ============================================================================

/**
 * Generates the widget-side SDK script that is injected into widget iframes.
 * This creates the window.WidgetAPI object that widgets use.
 */
export function generateWidgetSDKScript(instanceId: string, assetBaseUrl: string): string {
  return `
(function() {
  'use strict';

  const WIDGET_API_VERSION = '${WIDGET_API_VERSION}';
  const instanceId = '${instanceId}';
  const assetBaseUrl = '${assetBaseUrl}';

  // Internal state
  let widgetState = {};
  let isInitialized = false;
  let initContext = null;
  const availableCapabilities = new Set();

  // Event handlers
  const lifecycleHandlers = {
    mount: new Set(),
    destroy: new Set(),
    resize: new Set(),
    'visibility-change': new Set(),
    focus: new Set(),
    blur: new Set()
  };
  const eventHandlers = new Map();
  const inputHandlers = new Map();
  const stateChangeHandlers = new Set();

  // Pending capability requests
  const pendingCapabilityRequests = new Map();
  let capabilityRequestId = 0;

  // Pending API requests
  const pendingApiRequests = new Map();
  let apiRequestId = 0;

  // Post message to parent
  function postToParent(type, payload) {
    const message = {
      type: type,
      instanceId: instanceId,
      payload: payload,
      timestamp: Date.now()
    };
    console.log('[WidgetAPI] 📨 postToParent:', { type: type, hasParent: window.parent !== window });
    window.parent.postMessage(message, '*');
  }

  // Create unsubscribe function
  function createUnsub(set, handler) {
    return function() {
      set.delete(handler);
    };
  }

  // Deep clone utility
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Storage capability implementation
  const storageCapability = {
    get: function(key) {
      return new Promise(function(resolve) {
        const reqId = ++capabilityRequestId;
        pendingCapabilityRequests.set(reqId, resolve);
        postToParent('CAPABILITY_REQUEST', {
          capability: 'storage',
          action: 'get',
          requestId: reqId,
          params: { key: key }
        });
      });
    },
    set: function(key, value) {
      return new Promise(function(resolve) {
        const reqId = ++capabilityRequestId;
        pendingCapabilityRequests.set(reqId, resolve);
        postToParent('CAPABILITY_REQUEST', {
          capability: 'storage',
          action: 'set',
          requestId: reqId,
          params: { key: key, value: value }
        });
      });
    },
    remove: function(key) {
      return new Promise(function(resolve) {
        const reqId = ++capabilityRequestId;
        pendingCapabilityRequests.set(reqId, resolve);
        postToParent('CAPABILITY_REQUEST', {
          capability: 'storage',
          action: 'remove',
          requestId: reqId,
          params: { key: key }
        });
      });
    },
    keys: function() {
      return new Promise(function(resolve) {
        const reqId = ++capabilityRequestId;
        pendingCapabilityRequests.set(reqId, resolve);
        postToParent('CAPABILITY_REQUEST', {
          capability: 'storage',
          action: 'keys',
          requestId: reqId,
          params: {}
        });
      });
    },
    clear: function() {
      return new Promise(function(resolve) {
        const reqId = ++capabilityRequestId;
        pendingCapabilityRequests.set(reqId, resolve);
        postToParent('CAPABILITY_REQUEST', {
          capability: 'storage',
          action: 'clear',
          requestId: reqId,
          params: {}
        });
      });
    }
  };

  // Settings capability implementation
  let currentSettings = {};
  const settingsChangeHandlers = new Set();

  const settingsCapability = {
    getAll: function() {
      return deepClone(currentSettings);
    },
    get: function(key) {
      return currentSettings[key];
    },
    set: function(key, value) {
      currentSettings[key] = value;
      postToParent('STATE_PATCH', { settings: currentSettings });
    },
    onChange: function(handler) {
      settingsChangeHandlers.add(handler);
      return function() { settingsChangeHandlers.delete(handler); };
    }
  };

  // Canvas capability implementation
  let canvasInfo = { width: 1920, height: 1080, mode: 'view', zoom: 1, theme: 'dark' };
  const canvasModeHandlers = new Set();

  const canvasCapability = {
    getSize: function() { return { width: canvasInfo.width, height: canvasInfo.height }; },
    getMode: function() { return canvasInfo.mode; },
    getZoom: function() { return canvasInfo.zoom; },
    getTheme: function() { return canvasInfo.theme; },
    onModeChange: function(handler) {
      canvasModeHandlers.add(handler);
      return function() { canvasModeHandlers.delete(handler); };
    }
  };

  // Network capability implementation
  let isOnline = navigator.onLine;
  const networkStatusHandlers = new Set();

  window.addEventListener('online', function() {
    isOnline = true;
    networkStatusHandlers.forEach(function(h) { try { h(true); } catch(e) {} });
  });
  window.addEventListener('offline', function() {
    isOnline = false;
    networkStatusHandlers.forEach(function(h) { try { h(false); } catch(e) {} });
  });

  const networkCapability = {
    fetch: function(url, options) {
      return new Promise(function(resolve, reject) {
        const reqId = ++capabilityRequestId;
        pendingCapabilityRequests.set(reqId, function(result) {
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        });
        postToParent('CAPABILITY_REQUEST', {
          capability: 'network',
          action: 'fetch',
          requestId: reqId,
          params: { url: url, options: options || {} }
        });
      });
    },
    isOnline: function() { return isOnline; },
    onStatusChange: function(handler) {
      networkStatusHandlers.add(handler);
      return function() { networkStatusHandlers.delete(handler); };
    }
  };

  // WidgetAPI implementation
  window.WidgetAPI = {
    version: WIDGET_API_VERSION,
    instanceId: instanceId,

    // Lifecycle
    onMount: function(handler) {
      lifecycleHandlers.mount.add(handler);
      // If already initialized, call immediately
      if (isInitialized && initContext) {
        try { handler(initContext); } catch(e) { window.WidgetAPI.error('onMount handler error', e); }
      }
      return createUnsub(lifecycleHandlers.mount, handler);
    },

    onDestroy: function(handler) {
      lifecycleHandlers.destroy.add(handler);
      return createUnsub(lifecycleHandlers.destroy, handler);
    },

    onResize: function(handler) {
      lifecycleHandlers.resize.add(handler);
      return createUnsub(lifecycleHandlers.resize, handler);
    },

    // Events
    onEvent: function(type, handler) {
      if (!eventHandlers.has(type)) {
        eventHandlers.set(type, new Set());
      }
      eventHandlers.get(type).add(handler);
      return function() {
        const handlers = eventHandlers.get(type);
        if (handlers) handlers.delete(handler);
      };
    },

    // Alias for onEvent - widgets use API.on()
    on: function(type, handler) {
      if (!eventHandlers.has(type)) {
        eventHandlers.set(type, new Set());
      }
      eventHandlers.get(type).add(handler);
      return function() {
        const handlers = eventHandlers.get(type);
        if (handlers) handlers.delete(handler);
      };
    },

    emitEvent: function(event) {
      postToParent('EVENT', event);
    },

    emit: function(type, payload, scope) {
      console.log('[WidgetAPI] 📤 emit() called:', { type: type, payload: payload, scope: scope || 'canvas' });
      postToParent('EVENT', {
        type: type,
        payload: payload,
        scope: scope || 'canvas'
      });
    },

    // Pipeline I/O
    emitOutput: function(portName, value) {
      postToParent('OUTPUT', {
        portName: portName,
        value: value
      });
    },

    onInput: function(portName, handler) {
      if (!inputHandlers.has(portName)) {
        inputHandlers.set(portName, new Set());
      }
      inputHandlers.get(portName).add(handler);
      return function() {
        const handlers = inputHandlers.get(portName);
        if (handlers) handlers.delete(handler);
      };
    },

    // State
    getState: function() {
      return deepClone(widgetState);
    },

    setState: function(patch) {
      widgetState = Object.assign({}, widgetState, patch);
      postToParent('STATE_PATCH', patch);
      stateChangeHandlers.forEach(function(h) { try { h(widgetState); } catch(e) {} });
    },

    replaceState: function(newState) {
      widgetState = deepClone(newState);
      postToParent('STATE_PATCH', { __replace__: true, state: newState });
      stateChangeHandlers.forEach(function(h) { try { h(widgetState); } catch(e) {} });
    },

    onStateChange: function(handler) {
      stateChangeHandlers.add(handler);
      return function() { stateChangeHandlers.delete(handler); };
    },

    // Assets
    getAssetUrl: function(path) {
      if (path.startsWith('http://') || path.startsWith('https://') ||
          path.startsWith('blob:') || path.startsWith('data:')) {
        return path;
      }
      return assetBaseUrl + '/' + path;
    },

    // Capabilities
    getStorage: function() {
      return availableCapabilities.has('storage') ? storageCapability : null;
    },

    getNetwork: function() {
      return availableCapabilities.has('network') ? networkCapability : null;
    },

    getSettings: function() {
      return availableCapabilities.has('settings') ? settingsCapability : null;
    },

    getCanvas: function() {
      return availableCapabilities.has('canvas') ? canvasCapability : null;
    },

    hasCapability: function(name) {
      return availableCapabilities.has(name);
    },

    // Canvas requests
    requestMove: function(x, y) {
      postToParent('CANVAS_REQUEST', { action: 'move', x: x, y: y });
    },

    requestResize: function(width, height) {
      postToParent('CANVAS_REQUEST', { action: 'resize', width: width, height: height });
    },

    requestBringToFront: function() {
      postToParent('CANVAS_REQUEST', { action: 'bringToFront' });
    },

    requestClose: function() {
      postToParent('CANVAS_REQUEST', { action: 'close' });
    },

    // Content size reporting - tells the host what size this widget's content actually needs
    reportContentSize: function(width, height) {
      postToParent('CONTENT_SIZE', { width: width, height: height });
    },

    // Auto-detect and report content size based on document content
    autoReportContentSize: function() {
      // Wait for next frame to ensure DOM is ready
      requestAnimationFrame(function() {
        var body = document.body;
        var html = document.documentElement;

        // Get base dimensions from scroll/offset
        var contentWidth = Math.max(
          body.scrollWidth || 0,
          body.offsetWidth || 0,
          html.scrollWidth || 0,
          html.offsetWidth || 0
        );
        var contentHeight = Math.max(
          body.scrollHeight || 0,
          body.offsetHeight || 0,
          html.scrollHeight || 0,
          html.offsetHeight || 0
        );

        // Deep scan all elements to find the true bounding box
        // This catches absolutely/fixed positioned elements, transformed elements, etc.
        function scanElement(el, depth) {
          if (depth > 50) return; // Prevent infinite recursion
          if (!el || el.nodeType !== 1) return;

          // Skip script, style, and hidden elements
          var tagName = el.tagName && el.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') return;

          var style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return;

          var rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            var right = Math.ceil(rect.right);
            var bottom = Math.ceil(rect.bottom);
            if (right > contentWidth) contentWidth = right;
            if (bottom > contentHeight) contentHeight = bottom;
          }

          // Recursively scan children
          var children = el.children;
          for (var i = 0; i < children.length; i++) {
            scanElement(children[i], depth + 1);
          }
        }

        // Scan entire body tree
        scanElement(body, 0);

        // Also check widget-root if it exists (for JS module widgets)
        var widgetRoot = document.getElementById('widget-root');
        if (widgetRoot) {
          scanElement(widgetRoot, 0);
        }

        console.log('[WidgetAPI] autoReportContentSize measured:', {
          contentWidth: contentWidth,
          contentHeight: contentHeight,
          bodyScroll: body.scrollWidth + 'x' + body.scrollHeight,
          bodyOffset: body.offsetWidth + 'x' + body.offsetHeight,
          htmlScroll: html.scrollWidth + 'x' + html.scrollHeight
        });

        // Only report if content is larger than 10px (avoid empty widgets)
        if (contentWidth > 10 && contentHeight > 10) {
          console.log('[WidgetAPI] Reporting content size:', contentWidth + 'x' + contentHeight);
          postToParent('CONTENT_SIZE', { width: contentWidth, height: contentHeight });
        }
      });
    },

    // Debug logging
    log: function(msg, data) {
      postToParent('DEBUG_LOG', { level: 'log', message: msg, data: data, timestamp: Date.now() });
    },
    info: function(msg, data) {
      postToParent('DEBUG_LOG', { level: 'info', message: msg, data: data, timestamp: Date.now() });
    },
    warn: function(msg, data) {
      postToParent('DEBUG_LOG', { level: 'warn', message: msg, data: data, timestamp: Date.now() });
    },
    error: function(msg, data) {
      postToParent('DEBUG_LOG', { level: 'error', message: msg, data: data, timestamp: Date.now() });
    },

    // Legacy compatibility
    debugLog: function(msg, data) {
      postToParent('DEBUG_LOG', { level: 'log', message: msg, data: data, timestamp: Date.now() });
    },

    // API requests (for fetching social data, etc.)
    request: function(action, data) {
      return new Promise(function(resolve, reject) {
        const reqId = 'req-' + (++apiRequestId) + '-' + Date.now();

        // Store resolver with timeout
        const timeoutId = setTimeout(function() {
          if (pendingApiRequests.has(reqId)) {
            pendingApiRequests.delete(reqId);
            reject(new Error('Request timeout: ' + action));
          }
        }, 30000);

        pendingApiRequests.set(reqId, { resolve: resolve, reject: reject, timeoutId: timeoutId });

        postToParent('REQUEST', {
          requestId: reqId,
          action: action,
          data: data || {}
        });
      });
    }
  };

  // Handle incoming messages from parent
  function handleMessage(event) {
    var data = event.data;
    if (!data || typeof data !== 'object') return;

    // Check instance ID for new protocol messages
    if (data.instanceId && data.instanceId !== instanceId) return;

    // Handle legacy widget:event protocol for backwards compatibility
    if (data.type === 'widget:event' && data.payload) {
      var legacyEvt = { type: data.payload.type, scope: 'canvas', payload: data.payload.payload };
      dispatchEvent(legacyEvt);
      return;
    }

    switch (data.type) {
      case 'INIT':
        handleInit(data.payload);
        break;
      case 'EVENT':
        dispatchEvent(data.payload);
        break;
      case 'STATE_UPDATE':
        handleStateUpdate(data.payload);
        break;
      case 'DESTROY':
        handleDestroy();
        break;
      case 'RESIZE':
        handleResize(data.payload);
        break;
      case 'CAPABILITY':
        handleCapabilityResponse(data.payload);
        break;
      case 'SETTINGS_UPDATE':
        handleSettingsUpdate(data.payload);
        break;
      case 'RESPONSE':
        handleApiResponse(data.payload);
        break;
    }
  }

  function handleApiResponse(payload) {
    const { requestId, result, error } = payload;
    const pending = pendingApiRequests.get(requestId);

    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingApiRequests.delete(requestId);

      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    }
  }

  function handleInit(payload) {
    isInitialized = true;
    widgetState = payload.state || {};
    initContext = {
      instanceId: instanceId,
      widgetId: payload.widgetId || instanceId,
      canvasId: payload.canvasId || '',
      widgetDefId: payload.manifest ? payload.manifest.id : '',
      manifest: payload.manifest,
      state: widgetState,
      assetBaseUrl: payload.assetBaseUrl || assetBaseUrl,
      debugEnabled: payload.debugEnabled || false,
      size: payload.size || { width: 300, height: 200 },
      canvasMode: payload.canvasMode || 'view',
      capabilities: payload.capabilities || ['canvas']
    };

    // Register available capabilities
    (payload.capabilities || ['canvas']).forEach(function(c) {
      availableCapabilities.add(c);
    });

    // Update canvas info
    if (payload.canvasInfo) {
      Object.assign(canvasInfo, payload.canvasInfo);
    }

    // Load settings
    if (payload.settings) {
      currentSettings = payload.settings;
    }

    // Store globals for backwards compatibility
    window.__WIDGET_ASSET_BASE_URL__ = initContext.assetBaseUrl;
    window.__WIDGET_MANIFEST__ = initContext.manifest;
    window.__WIDGET_DEBUG__ = initContext.debugEnabled;

    // Call mount handlers
    lifecycleHandlers.mount.forEach(function(handler) {
      try { handler(initContext); } catch(e) { window.WidgetAPI.error('onMount handler error', e); }
    });

    // Dispatch widget:init event for backwards compatibility
    dispatchEvent({ type: 'widget:init', scope: 'widget', payload: initContext });

    // Auto-detect and report content size after a delay
    // This allows widget content to fully render before measuring
    // We do multiple measurements to catch dynamic content
    setTimeout(function() {
      window.WidgetAPI.autoReportContentSize();
    }, 200);
    setTimeout(function() {
      window.WidgetAPI.autoReportContentSize();
    }, 500);
    setTimeout(function() {
      window.WidgetAPI.autoReportContentSize();
    }, 1000);

    // Setup ResizeObserver to detect dynamic content changes
    // This will re-measure and report content size when DOM changes
    if (typeof ResizeObserver !== 'undefined') {
      var resizeDebounceTimer = null;

      var contentObserver = new ResizeObserver(function(entries) {
        // Debounce to avoid excessive updates
        if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
        resizeDebounceTimer = setTimeout(function() {
          window.WidgetAPI.autoReportContentSize();
        }, 100);
      });

      // Observe body and widget-root for size changes
      contentObserver.observe(document.body);
      var widgetRoot = document.getElementById('widget-root');
      if (widgetRoot) {
        contentObserver.observe(widgetRoot);
      }

      // Also use MutationObserver to detect new elements being added
      var mutationObserver = new MutationObserver(function(mutations) {
        var shouldRecheck = false;
        for (var i = 0; i < mutations.length; i++) {
          var mutation = mutations[i];
          if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
            shouldRecheck = true;
            break;
          }
        }
        if (shouldRecheck) {
          if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
          resizeDebounceTimer = setTimeout(function() {
            window.WidgetAPI.autoReportContentSize();
          }, 150);
        }
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  function handleStateUpdate(payload) {
    widgetState = Object.assign({}, widgetState, payload);
    stateChangeHandlers.forEach(function(h) { try { h(widgetState); } catch(e) {} });
    dispatchEvent({ type: 'state:change', scope: 'widget', payload: widgetState });
  }

  function handleDestroy() {
    lifecycleHandlers.destroy.forEach(function(handler) {
      try { handler(); } catch(e) {}
    });
    dispatchEvent({ type: 'widget:destroy', scope: 'widget', payload: null });
    eventHandlers.clear();
    inputHandlers.clear();
    stateChangeHandlers.clear();
    Object.keys(lifecycleHandlers).forEach(function(k) { lifecycleHandlers[k].clear(); });
  }

  function handleResize(payload) {
    var resizeData = {
      width: payload.width,
      height: payload.height,
      previousWidth: payload.previousWidth,
      previousHeight: payload.previousHeight
    };
    lifecycleHandlers.resize.forEach(function(handler) {
      try { handler(resizeData); } catch(e) { window.WidgetAPI.error('onResize handler error', e); }
    });
  }

  function handleCapabilityResponse(payload) {
    var reqId = payload.requestId;
    var resolver = pendingCapabilityRequests.get(reqId);
    if (resolver) {
      pendingCapabilityRequests.delete(reqId);
      resolver(payload.result);
    }
  }

  function handleSettingsUpdate(payload) {
    currentSettings = Object.assign({}, currentSettings, payload);
    settingsChangeHandlers.forEach(function(h) { try { h(currentSettings); } catch(e) {} });
  }

  function dispatchEvent(event) {
    // Handle pipeline:input events specially
    if (event.type === 'pipeline:input' && event.payload) {
      var portName = event.payload.portName;
      var handlers = inputHandlers.get(portName);
      if (handlers) {
        handlers.forEach(function(handler) {
          try {
            handler(event.payload.value, event.payload.source);
          } catch(e) {
            window.WidgetAPI.error('Input handler error on port ' + portName, e);
          }
        });
      }
      return;
    }

    // Also try to match event type to port name for convenience
    var portHandlers = inputHandlers.get(event.type);
    if (portHandlers) {
      portHandlers.forEach(function(handler) {
        try {
          handler(event.payload, event.sourceWidgetId ? { widgetId: event.sourceWidgetId } : undefined);
        } catch(e) {
          window.WidgetAPI.error('Input handler error', e);
        }
      });
    }

    // Type-specific handlers
    var typeHandlers = eventHandlers.get(event.type);
    if (typeHandlers) {
      typeHandlers.forEach(function(handler) {
        try { handler(event.payload, event); } catch(e) { window.WidgetAPI.error('Event handler error', e); }
      });
    }

    // Wildcard handlers
    var wildcardHandlers = eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(function(handler) {
        try { handler(event.payload, event); } catch(e) { window.WidgetAPI.error('Wildcard handler error', e); }
      });
    }
  }

  // Listen for messages
  window.addEventListener('message', handleMessage);

  // Capture and forward errors
  window.onerror = function(msg, url, line, col, error) {
    postToParent('ERROR', {
      message: String(msg),
      url: url,
      line: line,
      col: col,
      stack: error ? error.stack : null
    });
    return true;
  };

  window.onunhandledrejection = function(event) {
    postToParent('ERROR', {
      message: 'Unhandled promise rejection: ' + String(event.reason),
      stack: event.reason && event.reason.stack ? event.reason.stack : null
    });
  };

  // Signal ready to parent
  postToParent('READY', { version: WIDGET_API_VERSION });
})();
`;
}

// ============================================================================
// HOST-SIDE API HANDLER
// ============================================================================

/**
 * Configuration for the host-side widget API handler
 */
export interface WidgetAPIHostConfig {
  instanceId: string;
  manifest: WidgetManifest;
  initialState: Record<string, unknown>;
  assetBaseUrl: string;
  debugEnabled?: boolean;
  capabilities?: string[];
  onEvent?: (event: Event) => void;
  onOutput?: (portName: string, value: unknown) => void;
  onStateChange?: (state: Record<string, unknown>) => void;
  onDebug?: (message: DebugMessage) => void;
  onError?: (error: Error) => void;
  onCanvasRequest?: (request: { action: string; [key: string]: unknown }) => void;
}

/**
 * Host-side handler for widget API messages.
 * This class handles communication FROM the widget iframe TO the host.
 */
export class WidgetAPIHost {
  private config: WidgetAPIHostConfig;
  private iframe: HTMLIFrameElement | null = null;
  private isReady = false;
  private pendingMessages: ParentToWidgetMessage[] = [];
  private widgetState: Record<string, unknown>;
  private storagePrefix: string;

  constructor(config: WidgetAPIHostConfig) {
    this.config = config;
    this.widgetState = { ...config.initialState };
    this.storagePrefix = `widget:${config.instanceId}:`;
  }

  /**
   * Attach to an iframe for communication
   */
  attachToIframe(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;
  }

  /**
   * Handle a message from the widget
   */
  handleWidgetMessage(message: WidgetToParentMessage): void {
    if (message.instanceId !== this.config.instanceId) return;

    switch (message.type) {
      case 'READY':
        this.handleReady();
        break;
      case 'EVENT':
        this.handleEvent(message.payload as Omit<Event, 'sourceWidgetId'>);
        break;
      case 'OUTPUT':
        this.handleOutput(message.payload as { portName: string; value: unknown });
        break;
      case 'STATE_PATCH':
        this.handleStatePatch(message.payload as Record<string, unknown>);
        break;
      case 'DEBUG_LOG':
        this.handleDebug(message.payload as DebugMessage);
        break;
      case 'ERROR':
        this.handleError(message.payload as { message: string; stack?: string });
        break;
      case 'CAPABILITY_REQUEST':
        this.handleCapabilityRequest(message.payload as { capability: string; action: string; requestId: number; params: Record<string, unknown> });
        break;
      case 'CANVAS_REQUEST':
        this.handleCanvasRequest(message.payload as { action: string; [key: string]: unknown });
        break;
    }
  }

  private handleReady(): void {
    this.isReady = true;

    // Send initialization
    this.postMessage({
      type: 'INIT',
      instanceId: this.config.instanceId,
      payload: {
        manifest: this.config.manifest,
        state: this.widgetState,
        assetBaseUrl: this.config.assetBaseUrl,
        debugEnabled: this.config.debugEnabled || false,
        capabilities: this.config.capabilities || ['canvas'],
        size: {
          width: this.config.manifest.size?.width || 300,
          height: this.config.manifest.size?.height || 200
        },
        canvasMode: 'view'
      }
    });

    // Flush pending messages
    this.pendingMessages.forEach(msg => this.postMessage(msg));
    this.pendingMessages = [];
  }

  private handleEvent(eventPayload: Omit<Event, 'sourceWidgetId'>): void {
    const event: Event = {
      ...eventPayload,
      sourceWidgetId: this.config.instanceId,
      timestamp: Date.now()
    };
    this.config.onEvent?.(event);
  }

  private handleOutput(payload: { portName: string; value: unknown }): void {
    this.config.onOutput?.(payload.portName, payload.value);
  }

  private handleStatePatch(patch: Record<string, unknown>): void {
    if ((patch as any).__replace__) {
      this.widgetState = (patch as any).state || {};
    } else {
      this.widgetState = { ...this.widgetState, ...patch };
    }
    this.config.onStateChange?.(this.widgetState);
  }

  private handleDebug(message: DebugMessage): void {
    const enriched: DebugMessage = {
      ...message,
      widgetInstanceId: this.config.instanceId,
      timestamp: message.timestamp || Date.now()
    };
    this.config.onDebug?.(enriched);
  }

  private handleError(payload: { message: string; stack?: string }): void {
    const error = new Error(payload.message);
    if (payload.stack) error.stack = payload.stack;
    this.config.onError?.(error);
  }

  private async handleCapabilityRequest(request: {
    capability: string;
    action: string;
    requestId: number;
    params: Record<string, unknown>
  }): Promise<void> {
    let result: unknown;

    try {
      switch (request.capability) {
        case 'storage':
          result = await this.handleStorageRequest(request.action, request.params);
          break;
        case 'network':
          result = await this.handleNetworkRequest(request.action, request.params);
          break;
        default:
          result = { error: `Unknown capability: ${request.capability}` };
      }
    } catch (e) {
      result = { error: String(e) };
    }

    this.postMessage({
      type: 'CAPABILITY',
      instanceId: this.config.instanceId,
      payload: {
        requestId: request.requestId,
        result
      }
    });
  }

  private async handleStorageRequest(action: string, params: Record<string, unknown>): Promise<unknown> {
    const key = this.storagePrefix + (params.key as string || '');

    switch (action) {
      case 'get':
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      case 'set':
        localStorage.setItem(key, JSON.stringify(params.value));
        return true;
      case 'remove':
        localStorage.removeItem(key);
        return true;
      case 'keys':
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith(this.storagePrefix)) {
            keys.push(k.slice(this.storagePrefix.length));
          }
        }
        return keys;
      case 'clear':
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith(this.storagePrefix)) {
            toRemove.push(k);
          }
        }
        toRemove.forEach(k => localStorage.removeItem(k));
        return true;
      default:
        return { error: `Unknown storage action: ${action}` };
    }
  }

  private async handleNetworkRequest(action: string, params: Record<string, unknown>): Promise<unknown> {
    if (action !== 'fetch') {
      return { error: `Unknown network action: ${action}` };
    }

    const url = params.url as string;
    const options = params.options as NetworkFetchOptions || {};

    try {
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers: options.headers
      };

      if (options.body) {
        fetchOptions.body = typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
      }

      const controller = new AbortController();
      const timeoutId = options.timeout
        ? setTimeout(() => controller.abort(), options.timeout)
        : null;

      fetchOptions.signal = controller.signal;

      const response = await fetch(url, fetchOptions);

      if (timeoutId) clearTimeout(timeoutId);

      const headers: Record<string, string> = {};
      response.headers.forEach((v, k) => { headers[k] = v; });

      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        data
      };
    } catch (e) {
      return { error: String(e) };
    }
  }

  private handleCanvasRequest(request: { action: string; [key: string]: unknown }): void {
    this.config.onCanvasRequest?.(request);
  }

  /**
   * Send an event to the widget
   */
  sendEvent(event: Event): void {
    this.postMessage({
      type: 'EVENT',
      instanceId: this.config.instanceId,
      payload: event
    });
  }

  /**
   * Send a pipeline input to the widget
   */
  sendInput(portName: string, value: unknown, source?: { widgetId: string; portName: string }): void {
    this.postMessage({
      type: 'EVENT',
      instanceId: this.config.instanceId,
      payload: {
        type: 'pipeline:input',
        scope: 'widget',
        payload: { portName, value, source }
      }
    });
  }

  /**
   * Update widget state
   */
  updateState(patch: Record<string, unknown>): void {
    this.widgetState = { ...this.widgetState, ...patch };
    this.postMessage({
      type: 'STATE_UPDATE',
      instanceId: this.config.instanceId,
      payload: patch
    });
  }

  /**
   * Send resize notification
   */
  sendResize(width: number, height: number, previousWidth?: number, previousHeight?: number): void {
    this.postMessage({
      type: 'RESIZE',
      instanceId: this.config.instanceId,
      payload: { width, height, previousWidth, previousHeight }
    });
  }

  /**
   * Destroy the widget
   */
  destroy(): void {
    this.postMessage({
      type: 'DESTROY',
      instanceId: this.config.instanceId,
      payload: null
    });
    this.iframe = null;
    this.isReady = false;
  }

  /**
   * Get current widget state
   */
  getState(): Record<string, unknown> {
    return { ...this.widgetState };
  }

  /**
   * Check if widget is ready
   */
  isWidgetReady(): boolean {
    return this.isReady;
  }

  private postMessage(message: ParentToWidgetMessage): void {
    if (!this.isReady && message.type !== 'INIT') {
      this.pendingMessages.push(message);
      return;
    }

    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  WIDGET_API_VERSION,
  generateWidgetSDKScript,
  WidgetAPIHost
};
