/**
 * StickerNest v2 - WidgetSandboxHost
 * Creates and manages iframe sandbox for widget instances
 * Handles secure communication between parent and widget iframes
 * Supports HTML, JS module, and bundled widget entry files
 */

import type { WidgetInstance } from '../types/domain';
import type { Event, UnsubscribeFn, DebugMessage } from '../types/runtime';
import type { WidgetManifest } from '../types/manifest';
import { EventBus } from './EventBus';
import { getWidgetIOBridge } from './WidgetIOBridge';
import { generateWidgetSDKScript, WIDGET_API_VERSION } from './WidgetAPI';
import {
  getWidgetState,
  setWidgetState,
  hasWidgetState,
} from '../state/useWidgetStateStore';

/** Message types for parent <-> iframe communication */
type ParentToWidgetMessageType =
  | 'INIT'
  | 'EVENT'
  | 'STATE_UPDATE'
  | 'DESTROY'
  | 'RESIZE'
  | 'CAPABILITY'
  | 'SETTINGS_UPDATE';

type WidgetToParentMessageType =
  | 'READY'
  | 'EVENT'
  | 'STATE_PATCH'
  | 'DEBUG_LOG'
  | 'ERROR'
  | 'OUTPUT'
  | 'CAPABILITY_REQUEST'
  | 'CANVAS_REQUEST';

export interface ParentToWidgetMessage {
  type: ParentToWidgetMessageType;
  payload: any;
  instanceId: string;
}

export interface WidgetToParentMessage {
  type: WidgetToParentMessageType;
  payload: any;
  instanceId: string;
}

/** Callback for debug messages from widget */
export type DebugMessageCallback = (message: DebugMessage) => void;

/** Canvas context for widget initialization */
export interface CanvasContext {
  /** Current canvas mode */
  mode: 'view' | 'edit' | 'preview';
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Current zoom level */
  zoom: number;
  /** Current theme */
  theme: 'dark' | 'light';
}

/** Configuration for creating a sandbox */
export interface SandboxConfig {
  widgetInstance: WidgetInstance;
  manifest: WidgetManifest;
  assetBaseUrl: string;
  debugEnabled?: boolean;
  /** For local preview: blob URLs mapped by filename */
  localAssets?: Map<string, string>;
  /** For AI-generated widgets: inline HTML content */
  generatedHtml?: string;
  /** Creator/owner ID for commerce widgets */
  creatorId?: string;
  /** Canvas context for widget initialization */
  canvasContext?: CanvasContext;
}

export class WidgetSandboxHost {
  private widgetInstance: WidgetInstance;
  private manifest: WidgetManifest;
  private iframe: HTMLIFrameElement | null = null;
  private eventBus: EventBus;
  private debugEnabled: boolean;
  private assetBaseUrl: string;
  private containerElement: HTMLElement | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private eventSubscriptions: UnsubscribeFn[] = [];
  private debugCallback: DebugMessageCallback | null = null;
  private isReady: boolean = false;
  private pendingMessages: ParentToWidgetMessage[] = [];
  private localAssets: Map<string, string> | null = null;
  private generatedHtml: string | null = null;
  private creatorId: string | null = null;
  private canvasContext: CanvasContext;

  constructor(
    widgetInstance: WidgetInstance,
    manifest: WidgetManifest,
    eventBus: EventBus,
    assetBaseUrl: string,
    debugEnabled: boolean = false,
    localAssets?: Map<string, string>,
    generatedHtml?: string,
    creatorId?: string,
    canvasContext?: CanvasContext
  ) {
    this.widgetInstance = widgetInstance;
    this.manifest = manifest;
    this.eventBus = eventBus;
    this.assetBaseUrl = assetBaseUrl;
    this.debugEnabled = debugEnabled;
    this.localAssets = localAssets || null;
    this.generatedHtml = generatedHtml || null;
    this.creatorId = creatorId || null;
    this.canvasContext = canvasContext || {
      mode: 'view',
      width: 1920,
      height: 1080,
      zoom: 1,
      theme: 'dark',
    };
  }

  /**
   * Create a sandbox host from config
   */
  static fromConfig(config: SandboxConfig, eventBus: EventBus): WidgetSandboxHost {
    return new WidgetSandboxHost(
      config.widgetInstance,
      config.manifest,
      eventBus,
      config.assetBaseUrl,
      config.debugEnabled ?? false,
      config.localAssets,
      config.generatedHtml,
      config.creatorId,
      config.canvasContext
    );
  }

  /**
   * Update canvas context (call when canvas mode/size changes)
   */
  setCanvasContext(context: Partial<CanvasContext>): void {
    this.canvasContext = { ...this.canvasContext, ...context };
  }

  /**
   * Set callback for debug messages from widget
   */
  setDebugCallback(callback: DebugMessageCallback): void {
    this.debugCallback = callback;
  }

  async mount(containerElement: HTMLElement): Promise<void> {
    this.containerElement = containerElement;

    // Create secure iframe
    this.iframe = this.createIframe();
    containerElement.appendChild(this.iframe);

    // Setup message passing before loading content
    this.setupMessagePassing();

    // Subscribe to relevant events from EventBus
    this.setupEventSubscriptions();

    // Load widget content into iframe
    await this.loadWidgetContent();
  }

  async unmount(): Promise<void> {
    // Send destroy message to widget
    this.postMessageToWidget({
      type: 'DESTROY',
      payload: null,
      instanceId: this.widgetInstance.id
    });

    // Unregister from IOBridge
    try {
      const ioBridge = getWidgetIOBridge();
      ioBridge.unregisterWidget(this.widgetInstance.id);
    } catch (e) {
      // IOBridge may already be destroyed
    }

    // Cleanup event subscriptions
    this.eventSubscriptions.forEach(unsub => unsub());
    this.eventSubscriptions = [];

    // Remove message handler
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    // Remove iframe from DOM (iframe may have been moved to a different parent by React refs)
    if (this.iframe) {
      // Remove from actual parent, not necessarily containerElement
      if (this.iframe.parentElement) {
        this.iframe.parentElement.removeChild(this.iframe);
      }
      this.iframe = null;
    }

    // Emit unmount event
    this.eventBus.emit({
      type: 'widget:unmounted',
      scope: 'canvas',
      payload: { widgetInstanceId: this.widgetInstance.id },
      sourceWidgetId: this.widgetInstance.id
    });

    this.isReady = false;
    this.pendingMessages = [];
  }

  private createIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');

    // SECURITY: Sandbox configuration
    // allow-scripts: Required for widget JS execution
    //
    // IMPORTANT: We intentionally do NOT use 'allow-same-origin' because:
    // 1. allow-scripts + allow-same-origin together allows sandbox escape
    // 2. A malicious widget could remove its own sandbox attribute
    // 3. srcdoc iframes have 'null' origin by default, which is safe
    //
    // postMessage still works with null origin - we validate by event.source
    iframe.sandbox.add('allow-scripts');
    // Note: allow-forms is NOT added to prevent form submission attacks
    // Note: allow-popups is NOT added to prevent popup spam
    // Note: allow-top-navigation is NOT added to prevent redirect attacks

    // Styling
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.display = 'block';

    // Accessibility
    iframe.title = `Widget: ${this.manifest.name}`;

    // Data attributes for debugging
    iframe.dataset.widgetId = this.manifest.id;
    iframe.dataset.instanceId = this.widgetInstance.id;

    return iframe;
  }

  private setupMessagePassing(): void {
    this.messageHandler = (event: MessageEvent) => {
      // SECURITY: Verify message structure
      if (!event.data || typeof event.data !== 'object') return;

      // SECURITY: Origin validation
      // srcdoc iframes have 'null' origin, which is expected and safe
      // We primarily validate by checking event.source matches our iframe's contentWindow
      // This is more secure than origin checking for sandboxed iframes
      if (event.origin !== 'null' && event.origin !== window.location.origin) {
        // Message from unexpected origin - could be from a malicious embedded context
        // Only accept messages from null (sandboxed srcdoc) or same origin
        return;
      }

      // SECURITY: Check if message is from this widget's iframe
      // This is the primary security check - ensures message comes from OUR iframe
      const isFromThisWidget = this.iframe?.contentWindow === event.source;

      // Debug: Log all canvas-related messages to trace communication
      if (event.data?.type === 'EVENT' && event.data?.payload?.type?.startsWith('canvas:')) {
        console.log(`[WidgetSandbox:${this.manifest.name}] 📬 Received canvas message:`, {
          isFromThisWidget,
          messageInstanceId: event.data?.instanceId,
          myInstanceId: this.widgetInstance.id,
          hasIframe: !!this.iframe,
          eventType: event.data?.payload?.type,
        });
      }

      if (!isFromThisWidget) return;

      const data = event.data;

      // Protocol validation - flag unknown message types
      this.validateProtocol(data);

      // Handle legacy widget:emit protocol (old widgets that don't use instanceId)
      if (data.type === 'widget:emit' && data.payload) {
        console.log(`[WidgetSandbox] 📤 LEGACY widget:emit from ${this.manifest.name}:`, {
          eventType: data.payload.type,
          payload: data.payload.payload,
          widgetInstanceId: this.widgetInstance.id
        });
        const legacyEvent: Event = {
          type: data.payload.type || 'unknown',
          scope: 'canvas' as const,
          payload: data.payload.payload
        };
        this.handleWidgetEvent(legacyEvent);
        return;
      }

      // Handle legacy widget:broadcast protocol (canvas control widgets)
      if (data.type === 'widget:broadcast' && data.payload) {
        console.log(`[WidgetSandbox] 📤 LEGACY widget:broadcast from ${this.manifest.name}:`, {
          eventType: data.payload.type,
          payload: data.payload.payload,
          widgetInstanceId: this.widgetInstance.id
        });
        const broadcastEvent: Event = {
          type: data.payload.type || 'unknown',
          scope: 'canvas' as const,
          payload: data.payload.payload
        };
        this.handleWidgetEvent(broadcastEvent);
        return;
      }

      // Handle legacy widget:ready protocol (old widgets that don't use instanceId)
      if (data.type === 'widget:ready') {
        console.warn(`[WidgetSandbox] ⚠️ LEGACY PROTOCOL: widget:ready from ${this.manifest.name} - consider updating to use injected WidgetAPI`);
        this.handleWidgetReady();
        return;
      }

      // Handle simple READY protocol (widgets that send READY without instanceId)
      // This is used by test widgets that manually call postMessage({ type: 'READY' }, '*')
      if (data.type === 'READY' && !data.instanceId) {
        console.log(`[WidgetSandbox] 📥 Simple READY from ${this.manifest.name} (no instanceId)`);
        this.handleWidgetReady();
        return;
      }

      const message = data as WidgetToParentMessage;

      // DEBUG: Log all EVENT messages to trace cross-canvas issue
      if (message.type === 'EVENT') {
        const payload = message.payload as Event;
        if (payload?.type?.startsWith('social:')) {
          console.log(`[WidgetSandbox] 📩 Received EVENT message:`, {
            messageInstanceId: message.instanceId,
            myInstanceId: this.widgetInstance.id,
            eventType: payload.type,
            matches: message.instanceId === this.widgetInstance.id,
            widgetName: this.manifest.name
          });
        }
      }

      // Verify this message is for this widget instance (new protocol)
      if (message.instanceId !== this.widgetInstance.id) return;

      this.handleWidgetMessage(message);
    };

    window.addEventListener('message', this.messageHandler);
  }

  /**
   * Validate incoming message protocol and flag errors
   */
  private validateProtocol(data: any): void {
    const knownTypes = [
      // New protocol
      'READY', 'EVENT', 'STATE_PATCH', 'DEBUG_LOG', 'ERROR', 'OUTPUT', 'CAPABILITY_REQUEST', 'CANVAS_REQUEST',
      // Legacy protocol
      'widget:emit', 'widget:ready', 'widget:event', 'widget:broadcast'
    ];

    const messageType = data.type;

    // Check for unknown message type
    if (!messageType) {
      console.error(`[WidgetSandbox] ❌ PROTOCOL ERROR in ${this.manifest.name}: Message missing 'type' field`, data);
      this.emitProtocolError('MISSING_TYPE', 'Message missing type field', data);
      return;
    }

    if (!knownTypes.includes(messageType)) {
      console.error(`[WidgetSandbox] ❌ PROTOCOL ERROR in ${this.manifest.name}: Unknown message type '${messageType}'`, data);
      console.error(`[WidgetSandbox] Known types are: ${knownTypes.join(', ')}`);
      this.emitProtocolError('UNKNOWN_TYPE', `Unknown message type: ${messageType}`, data);
      return;
    }

    // Validate new protocol structure
    if (['READY', 'EVENT', 'STATE_PATCH', 'DEBUG_LOG', 'ERROR'].includes(messageType)) {
      if (!data.instanceId) {
        console.error(`[WidgetSandbox] ❌ PROTOCOL ERROR in ${this.manifest.name}: New protocol message '${messageType}' missing instanceId`, data);
        this.emitProtocolError('MISSING_INSTANCE_ID', `Message type ${messageType} requires instanceId`, data);
      }
    }

    // Validate widget:emit structure
    if (messageType === 'widget:emit') {
      if (!data.payload) {
        console.error(`[WidgetSandbox] ❌ PROTOCOL ERROR in ${this.manifest.name}: widget:emit missing payload`, data);
        this.emitProtocolError('INVALID_EMIT', 'widget:emit missing payload', data);
      } else if (!data.payload.type) {
        console.error(`[WidgetSandbox] ❌ PROTOCOL ERROR in ${this.manifest.name}: widget:emit payload missing 'type' (event name)`, data);
        this.emitProtocolError('INVALID_EMIT', 'widget:emit payload missing type', data);
      }
    }

    // Validate EVENT payload structure
    if (messageType === 'EVENT' && data.payload) {
      const event = data.payload;
      if (!event.type) {
        console.error(`[WidgetSandbox] ❌ PROTOCOL ERROR in ${this.manifest.name}: EVENT payload missing 'type'`, data);
        this.emitProtocolError('INVALID_EVENT', 'EVENT payload missing type', data);
      }
      if (!event.scope) {
        console.warn(`[WidgetSandbox] ⚠️ PROTOCOL WARNING in ${this.manifest.name}: EVENT payload missing 'scope', defaulting to 'widget'`);
      }
    }
  }

  /**
   * Emit protocol error event for monitoring
   */
  private emitProtocolError(code: string, message: string, data: any): void {
    this.eventBus.emit({
      type: 'widget:protocolError',
      scope: 'canvas',
      payload: {
        widgetInstanceId: this.widgetInstance.id,
        widgetName: this.manifest.name,
        widgetId: this.manifest.id,
        errorCode: code,
        errorMessage: message,
        receivedData: data,
        timestamp: Date.now()
      },
      sourceWidgetId: this.widgetInstance.id
    });

    // Also log to debug panel
    this.handleDebugMessage({
      level: 'error',
      widgetInstanceId: this.widgetInstance.id,
      message: `Protocol Error [${code}]: ${message}`,
      data: { receivedData: data },
      timestamp: Date.now()
    });
  }

  private handleWidgetMessage(message: WidgetToParentMessage): void {
    // Emit parent→widget bridge event for debugging
    this.eventBus.emit({
      type: 'bridge:widgetToParent',
      scope: 'canvas',
      payload: { messageType: message.type, instanceId: message.instanceId },
      sourceWidgetId: this.widgetInstance.id
    });

    switch (message.type) {
      case 'READY':
        this.handleWidgetReady();
        break;
      case 'EVENT':
        this.handleWidgetEvent(message.payload as Event);
        break;
      case 'STATE_PATCH':
        this.handleStatePatch(message.payload);
        break;
      case 'DEBUG_LOG':
        this.handleDebugMessage(message.payload as DebugMessage);
        break;
      case 'ERROR':
        this.handleWidgetError(message.payload);
        break;
      case 'OUTPUT':
        this.handlePipelineOutput(message.payload);
        break;
      case 'CAPABILITY_REQUEST':
        this.handleCapabilityRequest(message.payload);
        break;
      case 'CANVAS_REQUEST':
        this.handleCanvasRequest(message.payload);
        break;
    }
  }

  private handleWidgetReady(): void {
    this.isReady = true;
    console.log(`[WidgetSandbox] Widget READY: ${this.manifest.name} (${this.widgetInstance.id})`);

    // Determine available capabilities based on manifest
    const capabilities = this.getAvailableCapabilities();

    // Load persisted state from the widget state store
    const persistedState = getWidgetState(this.widgetInstance.id);
    const hasPersisted = hasWidgetState(this.widgetInstance.id);

    // Merge persisted state with instance state (persisted takes priority)
    const mergedState = {
      ...(this.widgetInstance.state || {}),
      ...(persistedState || {}),
    };

    // Update the widget instance with merged state
    this.widgetInstance.state = mergedState;

    if (hasPersisted) {
      console.log(`[WidgetSandbox] 💾 Loaded persisted state for ${this.manifest.name}:`, persistedState);
    }

    // Send initialization data with extended context
    this.postMessageToWidget({
      type: 'INIT',
      payload: {
        manifest: this.manifest,
        state: mergedState,
        canvasId: this.widgetInstance.canvasId,
        widgetId: this.widgetInstance.id,
        creatorId: this.creatorId,
        assetBaseUrl: this.getAssetBaseUrl(),
        debugEnabled: this.debugEnabled,
        size: {
          width: this.widgetInstance.width,
          height: this.widgetInstance.height
        },
        canvasMode: this.canvasContext.mode,
        capabilities,
        canvasInfo: {
          width: this.canvasContext.width,
          height: this.canvasContext.height,
          mode: this.canvasContext.mode,
          zoom: this.canvasContext.zoom,
          theme: this.canvasContext.theme
        },
        settings: mergedState?.settings || {}
      },
      instanceId: this.widgetInstance.id
    });

    // Flush pending messages
    this.pendingMessages.forEach(msg => this.postMessageToWidget(msg));
    this.pendingMessages = [];

    // Emit mounted event
    this.eventBus.emit({
      type: 'widget:mounted',
      scope: 'canvas',
      payload: {
        widgetInstanceId: this.widgetInstance.id,
        widgetName: this.manifest.name
      },
      sourceWidgetId: this.widgetInstance.id
    });

    if (this.debugEnabled) {
      this.debugLog('info', 'Widget ready and initialized');
    }

    // Register with IOBridge for pipeline routing
    try {
      const ioBridge = getWidgetIOBridge();
      if (this.iframe) {
        ioBridge.registerWidget(this.widgetInstance, this.iframe);
        if (this.debugEnabled) {
          this.debugLog('info', 'Registered with IOBridge for pipeline routing');
        }
      }
    } catch (e) {
      // IOBridge not initialized yet - ok for non-pipeline use
    }
  }

  private handleWidgetEvent(event: Event): void {
    // Add source widget ID and forward to EventBus
    const enrichedEvent: Event = {
      ...event,
      sourceWidgetId: this.widgetInstance.id,
      timestamp: event.timestamp || Date.now()
    };

    // Enhanced logging for canvas events
    if (event.type.startsWith('canvas:')) {
      console.log(`[WidgetSandbox] 🎨 CANVAS EVENT from ${this.manifest.name}:`, {
        type: event.type,
        payload: event.payload,
        scope: event.scope,
        widgetId: this.widgetInstance.id,
        eventBusId: this.eventBus.id,
      });
    } else {
      console.log(`[WidgetSandbox] Widget EVENT from ${this.manifest.name}:`, event.type, event.payload);
    }

    console.log(`[WidgetSandbox] 📤 Emitting to EventBus ${this.eventBus.id}:`, event.type);
    this.eventBus.emit(enrichedEvent);

    // DEBUG: Confirm social events are being emitted to EventBus
    if (event.type.startsWith('social:')) {
      console.log(`[WidgetSandbox] 📤 Emitted social event to EventBus:`, {
        type: enrichedEvent.type,
        scope: enrichedEvent.scope,
        sourceWidgetId: enrichedEvent.sourceWidgetId,
        canvasId: this.widgetInstance.canvasId
      });
    }

    // Check if this is a pipeline output event using WidgetAPI.emitOutput()
    // These events have type: 'widget:output' with portName in payload
    if (event.type === 'widget:output') {
      const portName = event.payload?.portName;
      const value = event.payload?.value;

      if (portName) {
        // Emit standardized widget:output event for PipelineRuntime
        this.eventBus.emit({
          type: 'widget:output',
          scope: 'canvas',
          payload: {
            widgetInstanceId: this.widgetInstance.id,
            portName,
            value
          },
          sourceWidgetId: this.widgetInstance.id,
          timestamp: Date.now()
        });

        if (this.debugEnabled) {
          this.debugLog('info', `Emitted pipeline output: ${portName}`, { value });
        }
      }
      return; // Don't double-emit
    }

    // Check for output:portName convention
    if (event.type.startsWith('output:')) {
      const portName = event.type.slice(7); // Remove 'output:' prefix

      if (portName) {
        this.eventBus.emit({
          type: 'widget:output',
          scope: 'canvas',
          payload: {
            widgetInstanceId: this.widgetInstance.id,
            portName,
            value: event.payload
          },
          sourceWidgetId: this.widgetInstance.id,
          timestamp: Date.now()
        });

        if (this.debugEnabled) {
          this.debugLog('info', `Emitted pipeline output: ${portName}`, { value: event.payload });
        }
      }
      return; // Don't double-emit
    }

    // For other events, also emit as widget:output for pipeline routing
    // This allows PipelineRuntime to route custom events to connected widgets
    // Event type becomes the port name (e.g., 'timer.tick' -> port 'timer.tick')
    if (event.type && event.payload !== undefined && !event.type.startsWith('bridge:')) {
      console.log(`[WidgetSandbox] 📤 Emitting widget:output for pipeline routing:`, {
        widgetInstanceId: this.widgetInstance.id,
        widgetName: this.manifest.name,
        portName: event.type,
        value: event.payload
      });
      this.eventBus.emit({
        type: 'widget:output',
        scope: 'canvas',
        payload: {
          widgetInstanceId: this.widgetInstance.id,
          portName: event.type,
          value: event.payload
        },
        sourceWidgetId: this.widgetInstance.id
      });
    }
  }

  private handleStatePatch(patch: any): void {
    // Merge patch into widget state
    this.widgetInstance.state = {
      ...this.widgetInstance.state,
      ...patch
    };

    // Persist state to the widget state store (localStorage)
    setWidgetState(
      this.widgetInstance.id,
      this.widgetInstance.state,
      {
        canvasId: this.widgetInstance.canvasId,
        widgetDefId: this.manifest.id,
      }
    );

    if (this.debugEnabled) {
      console.log(`[WidgetSandbox] 💾 Persisted state for ${this.manifest.name}:`, patch);
    }

    // Emit state changed event
    this.eventBus.emit({
      type: 'widget:stateChanged',
      scope: 'widget',
      payload: {
        widgetInstanceId: this.widgetInstance.id,
        state: this.widgetInstance.state,
        patch
      },
      sourceWidgetId: this.widgetInstance.id
    });
  }

  private handleDebugMessage(message: DebugMessage): void {
    const enrichedMessage: DebugMessage = {
      ...message,
      widgetInstanceId: this.widgetInstance.id,
      timestamp: message.timestamp || Date.now()
    };

    // Forward to debug callback if set
    if (this.debugCallback) {
      this.debugCallback(enrichedMessage);
    }

    // Log to console if debug enabled
    if (this.debugEnabled) {
      const prefix = `[Widget:${this.manifest.name}]`;
      switch (message.level) {
        case 'error':
          console.error(prefix, message.message, message.data);
          break;
        case 'warn':
          console.warn(prefix, message.message, message.data);
          break;
        case 'info':
          console.info(prefix, message.message, message.data);
          break;
        default:
          console.log(prefix, message.message, message.data);
      }
    }

    // Emit debug event for DebugPanel
    this.eventBus.emit({
      type: 'debug:message',
      scope: 'canvas',
      payload: enrichedMessage,
      sourceWidgetId: this.widgetInstance.id
    });
  }

  private handleWidgetError(error: any): void {
    const errorMessage: DebugMessage = {
      level: 'error',
      widgetInstanceId: this.widgetInstance.id,
      message: error.message || 'Unknown widget error',
      data: error,
      timestamp: Date.now()
    };

    this.handleDebugMessage(errorMessage);

    // Emit specific error event
    this.eventBus.emit({
      type: 'widget:error',
      scope: 'canvas',
      payload: {
        widgetInstanceId: this.widgetInstance.id,
        error: error.message || 'Unknown error',
        stack: error.stack
      },
      sourceWidgetId: this.widgetInstance.id
    });
  }

  /**
   * Handle pipeline output from widget (via WidgetAPI.emitOutput)
   */
  private handlePipelineOutput(payload: any): void {
    const { portName, value } = payload;

    if (!portName) {
      console.warn(`[WidgetSandbox] OUTPUT message missing portName from ${this.manifest.name}`);
      return;
    }

    console.log(`[WidgetSandbox] 📤 Pipeline OUTPUT from ${this.manifest.name}: ${portName}`, value);

    // Emit standardized widget:output event for PipelineRuntime
    this.eventBus.emit({
      type: 'widget:output',
      scope: 'canvas',
      payload: {
        widgetInstanceId: this.widgetInstance.id,
        portName,
        value
      },
      sourceWidgetId: this.widgetInstance.id,
      timestamp: Date.now()
    });

    if (this.debugEnabled) {
      this.debugLog('info', `Emitted pipeline output: ${portName}`, { value });
    }
  }

  /**
   * Handle capability requests from widget (storage, network, etc.)
   */
  private handleCapabilityRequest(payload: any): void {
    const { capability, action, requestId, params } = payload;

    console.log(`[WidgetSandbox] 🔐 Capability request from ${this.manifest.name}:`, { capability, action, requestId });

    // TODO: Implement actual capability handlers
    // For now, send back a basic response
    let result: any = null;

    switch (capability) {
      case 'storage':
        // Simple in-memory storage for now
        result = this.handleStorageCapability(action, params);
        break;
      case 'network':
        // Network capability would proxy fetch requests
        result = { error: 'Network capability not yet implemented' };
        break;
      default:
        result = { error: `Unknown capability: ${capability}` };
    }

    // Send response back to widget
    this.postMessageToWidget({
      type: 'CAPABILITY',
      payload: {
        requestId,
        capability,
        action,
        result
      },
      instanceId: this.widgetInstance.id
    });
  }

  /**
   * Simple storage capability implementation
   */
  private storageData: Map<string, any> = new Map();

  private handleStorageCapability(action: string, params: any): any {
    const storageKey = `widget:${this.widgetInstance.id}:${params.key || ''}`;

    switch (action) {
      case 'get':
        return this.storageData.get(storageKey) ?? null;
      case 'set':
        this.storageData.set(storageKey, params.value);
        return true;
      case 'remove':
        this.storageData.delete(storageKey);
        return true;
      case 'keys':
        const prefix = `widget:${this.widgetInstance.id}:`;
        return Array.from(this.storageData.keys())
          .filter(k => k.startsWith(prefix))
          .map(k => k.slice(prefix.length));
      case 'clear':
        const toDelete = Array.from(this.storageData.keys())
          .filter(k => k.startsWith(`widget:${this.widgetInstance.id}:`));
        toDelete.forEach(k => this.storageData.delete(k));
        return true;
      default:
        return { error: `Unknown storage action: ${action}` };
    }
  }

  /**
   * Handle canvas requests from widget (move, resize, close, etc.)
   */
  private handleCanvasRequest(payload: any): void {
    const { action, ...params } = payload;

    console.log(`[WidgetSandbox] 🎨 Canvas request from ${this.manifest.name}:`, { action, params });

    // Emit canvas request event for the editor to handle
    this.eventBus.emit({
      type: 'widget:canvasRequest',
      scope: 'canvas',
      payload: {
        widgetInstanceId: this.widgetInstance.id,
        action,
        ...params
      },
      sourceWidgetId: this.widgetInstance.id,
      timestamp: Date.now()
    });

    // Handle some requests directly
    switch (action) {
      case 'move':
        this.updatePosition(params.x, params.y);
        break;
      case 'resize':
        this.updateSize(params.width, params.height);
        break;
      case 'bringToFront':
        // Emit event for canvas to handle z-index
        this.eventBus.emit({
          type: 'widget:bringToFront',
          scope: 'canvas',
          payload: { widgetInstanceId: this.widgetInstance.id },
          sourceWidgetId: this.widgetInstance.id
        });
        break;
      case 'close':
        // Emit event for canvas to handle widget removal
        this.eventBus.emit({
          type: 'widget:requestClose',
          scope: 'canvas',
          payload: { widgetInstanceId: this.widgetInstance.id },
          sourceWidgetId: this.widgetInstance.id
        });
        break;
    }
  }

  /**
   * Get available capabilities for this widget
   * Checks manifest.permissions for declared capabilities
   */
  private getAvailableCapabilities(): string[] {
    const defaultCapabilities: string[] = ['canvas', 'storage', 'settings'];

    // Check if manifest has explicit permissions declared
    const manifestPermissions = (this.manifest as any).permissions;
    if (Array.isArray(manifestPermissions)) {
      // Merge default capabilities with manifest permissions
      const allCapabilities = new Set([...defaultCapabilities, ...manifestPermissions]);
      return Array.from(allCapabilities);
    }

    // Check for capability flags in manifest.capabilities
    const caps = this.manifest.capabilities;
    if (caps) {
      // Add capabilities based on manifest flags
      if (caps.supportsAudio) {
        defaultCapabilities.push('audio');
      }
      if (caps.supports3d) {
        defaultCapabilities.push('3d');
      }
    }

    return defaultCapabilities;
  }

  /**
   * Check if widget has a specific capability
   */
  hasCapability(capability: string): boolean {
    return this.getAvailableCapabilities().includes(capability);
  }

  /**
   * Send resize message to widget
   */
  sendResize(width: number, height: number): void {
    const previousWidth = this.widgetInstance.width;
    const previousHeight = this.widgetInstance.height;

    this.widgetInstance.width = width;
    this.widgetInstance.height = height;

    this.postMessageToWidget({
      type: 'RESIZE',
      payload: {
        width,
        height,
        previousWidth,
        previousHeight
      },
      instanceId: this.widgetInstance.id
    });
  }

  private setupEventSubscriptions(): void {
    // Subscribe to ALL events using wildcard - forward to widget if relevant
    const unsubAll = this.eventBus.on('*', (event: Event) => {
      // DEBUG: Log all events received by this widget's subscription
      const isInteresting = event.type === 'clicked' || event.type === 'clickData' ||
        event.type.startsWith('farm:') || event.type === 'widget:output' ||
        event.type.startsWith('social:');

      // Enhanced logging for social events to debug cross-canvas communication
      if (event.type.startsWith('social:')) {
        console.log(`[WidgetSandbox] 🔔 ${this.manifest.name} received social event:`, {
          type: event.type,
          scope: event.scope,
          sourceWidgetId: event.sourceWidgetId,
          myWidgetId: this.widgetInstance.id,
          isReady: this.isReady,
          forwarded: (event.payload as any)?.forwarded,
          payload: event.payload
        });
      } else if (isInteresting) {
        console.log(`[WidgetSandbox] 🔔 ${this.manifest.name} received event:`, {
          type: event.type,
          scope: event.scope,
          sourceWidgetId: event.sourceWidgetId,
          targetWidgetId: event.targetWidgetId,
          myWidgetId: this.widgetInstance.id,
          isReady: this.isReady,
          payload: event.payload
        });
      }

      // Don't forward events that originated from this widget (prevent loops)
      if (event.sourceWidgetId === this.widgetInstance.id) {
        if (isInteresting) {
          console.log(`[WidgetSandbox] ⏭️ ${this.manifest.name} skipping own event`);
        }
        return;
      }

      // Forward events targeted at this widget
      if (event.targetWidgetId === this.widgetInstance.id) {
        console.log(`[WidgetSandbox] ✅ ${this.manifest.name} forwarding targeted event: ${event.type}`);
        this.sendEventToWidget(event);
        return;
      }

      // Forward canvas-scope events to all widgets (for cross-widget communication)
      // This allows widgets to listen for events like farm:plant-seed, farm:weather, etc.
      if (event.scope === 'canvas') {
        if (isInteresting) {
          console.log(`[WidgetSandbox] ✅ ${this.manifest.name} forwarding canvas-scoped event: ${event.type}`);
        }
        this.sendEventToWidget(event);
        return;
      }

      if (isInteresting) {
        console.log(`[WidgetSandbox] ❌ ${this.manifest.name} NOT forwarding event (scope=${event.scope}):`, event.type);
      }

      // Forward explicit broadcast events
      if (event.type === 'canvas:broadcast' || event.type === 'global:broadcast') {
        this.sendEventToWidget(event);
      }
    });
    this.eventSubscriptions.push(unsubAll);

    // Subscribe to pipeline input events for this widget
    const unsubInput = this.eventBus.on('widget:input', (event: Event) => {
      const { targetWidgetId, portName, value, sourceWidgetId, sourcePortName } = event.payload;
      if (targetWidgetId !== this.widgetInstance.id) return;

      console.log(`[WidgetSandbox] 📥 Received widget:input for ${this.manifest.name}:`, {
        targetWidgetId,
        portName,
        value,
        sourceWidgetId,
        sourcePortName,
        isReady: this.isReady
      });

      // Forward input event to widget with pipeline context (for WidgetAPI.onInput)
      this.sendEventToWidget({
        type: 'pipeline:input',
        scope: 'widget',
        payload: {
          portName,
          value,
          source: { widgetId: sourceWidgetId, portName: sourcePortName }
        },
        targetWidgetId: this.widgetInstance.id,
        timestamp: Date.now()
      });

      // ALSO send the event in native format for widgets that use handleEvent switch
      // This allows widgets to receive pipeline inputs as regular events (e.g., 'vector:set-shadow')
      this.sendEventToWidget({
        type: portName,  // Use the port name as event type (e.g., 'vector:set-shadow')
        scope: 'widget',
        payload: value,  // Send the value directly as payload
        targetWidgetId: this.widgetInstance.id,
        sourceWidgetId,
        timestamp: Date.now()
      });

      console.log(`[WidgetSandbox] ✅ Forwarded pipeline:input to ${this.manifest.name} iframe as both pipeline:input and ${portName}`);

      if (this.debugEnabled) {
        this.debugLog('info', `Received pipeline input: ${portName}`, { value, sourceWidgetId });
      }
    });
    this.eventSubscriptions.push(unsubInput);
  }

  private sendEventToWidget(event: Event): void {
    // Enhanced logging for social events
    if (event.type.startsWith('social:')) {
      console.log(`[WidgetSandbox] 📤➡️ Sending social event to ${this.manifest.name}:`, {
        type: event.type,
        forwarded: (event.payload as any)?.forwarded,
        widgetId: this.widgetInstance.id,
        isReady: this.isReady,
        hasIframe: !!this.iframe?.contentWindow
      });
    } else {
      console.log(`[WidgetSandbox] Sending EVENT to ${this.manifest.name}:`, event.type);
    }

    // Emit bridge event for debugging
    this.eventBus.emit({
      type: 'bridge:parentToWidget',
      scope: 'canvas',
      payload: { eventType: event.type, targetInstanceId: this.widgetInstance.id },
      sourceWidgetId: this.widgetInstance.id
    });

    this.postMessageToWidget({
      type: 'EVENT',
      payload: event,
      instanceId: this.widgetInstance.id
    });

    // Also send legacy widget:event format for backwards compatibility
    // Old widgets expect: { type: 'widget:event', payload: { type: eventType, payload: eventPayload } }
    if (this.iframe?.contentWindow && this.isReady) {
      const legacyMessage = {
        type: 'widget:event',
        payload: {
          type: event.type,
          payload: event.payload
        }
      };
      console.log(`[WidgetSandbox] 📤 ALSO sending legacy widget:event to ${this.manifest.name}:`, legacyMessage);
      this.iframe.contentWindow.postMessage(legacyMessage, '*');
    }
  }

  private postMessageToWidget(message: ParentToWidgetMessage): void {
    const eventType = message.type === 'EVENT' ? (message.payload as Event)?.type : message.type;

    if (!this.isReady && message.type !== 'INIT') {
      // Queue message until widget is ready
      console.log(`[WidgetSandbox] ⏸️ ${this.manifest.name} QUEUING message (not ready):`, eventType);
      this.pendingMessages.push(message);
      return;
    }

    if (this.iframe?.contentWindow) {
      console.log(`[WidgetSandbox] 📨 ${this.manifest.name} POSTING message:`, {
        messageType: message.type,
        eventType,
        payload: message.payload
      });
      this.iframe.contentWindow.postMessage(message, '*');
    } else {
      // Provide detailed diagnostic info
      const reason = !this.iframe
        ? 'iframe is null (widget not mounted or already unmounted)'
        : 'iframe.contentWindow is null (iframe removed from DOM)';
      console.warn(`[WidgetSandbox] ❌ ${this.manifest.name} cannot post message: ${reason}`, {
        widgetId: this.widgetInstance.id,
        messageType: message.type,
        eventType,
        hasIframe: !!this.iframe,
        hasContentWindow: !!this.iframe?.contentWindow
      });
    }
  }

  private async loadWidgetContent(): Promise<void> {
    if (!this.iframe) return;

    // Generate iframe content with WidgetAPI injection
    const iframeContent = this.generateIframeContent();

    // Write content to iframe using srcdoc
    this.iframe.srcdoc = iframeContent;
  }

  private generateIframeContent(): string {
    const widgetApiScript = this.generateWidgetAPIScript();

    // Check for AI-generated HTML content first
    if (this.generatedHtml) {
      console.log('[WidgetSandboxHost] Using generated HTML for widget:', this.manifest.id);
      return this.generateInlineHtmlContent(widgetApiScript, this.generatedHtml);
    }

    const entry = this.manifest.entry;
    const isHtml = entry.endsWith('.html');
    const entryUrl = this.resolveAssetUrl(entry);

    if (isHtml) {
      // For HTML entries, we fetch and inject WidgetAPI
      return this.generateHtmlEntryContent(widgetApiScript, entryUrl);
    } else {
      // For JS/module entries, create wrapper HTML
      return this.generateJsEntryContent(widgetApiScript, entryUrl);
    }
  }

  /**
   * Generate iframe content for AI-generated widgets with inline HTML
   */
  private generateInlineHtmlContent(widgetApiScript: string, generatedHtml: string): string {
    // SECURITY: CSP meta tag for widget isolation
    const cspTag = `<meta http-equiv="Content-Security-Policy" content="
      default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:;
      script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: https:;
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' https: wss:;
      frame-src 'none';
      object-src 'none';
      base-uri 'none';
    ">`;

    // Inject WidgetAPI script right after <head> or at start of <body>
    // This ensures WidgetAPI is available before the widget's own scripts run
    let modifiedHtml = generatedHtml;

    const widgetApiTag = `<script>\n${widgetApiScript}\n</script>`;

    // Try to inject CSP and WidgetAPI after <head>
    const headRegex = /(<head[^>]*>)/i;
    if (headRegex.test(modifiedHtml)) {
      modifiedHtml = modifiedHtml.replace(headRegex, `$1\n${cspTag}\n${widgetApiTag}`);
    }
    // Try to inject after <body>
    else if (modifiedHtml.includes('<body>')) {
      modifiedHtml = modifiedHtml.replace('<body>', `<body>\n${cspTag}\n${widgetApiTag}`);
    }
    // Fallback: prepend to the entire HTML
    else {
      modifiedHtml = cspTag + '\n' + widgetApiTag + '\n' + modifiedHtml;
    }

    return modifiedHtml;
  }

  private generateHtmlEntryContent(widgetApiScript: string, entryUrl: string): string {
    // For HTML files, we need to load them and inject our script
    // Since we can't modify the HTML directly in srcdoc, we use a fetch approach
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- SECURITY: Content Security Policy for widget isolation -->
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https: wss:;
    frame-src 'none';
    object-src 'none';
    base-uri 'none';
  ">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <script>
    ${widgetApiScript}
  </script>
  <script>
    // Fetch and inject HTML content
    (async function() {
      try {
        const response = await fetch("${entryUrl}");
        if (!response.ok) throw new Error('Failed to load widget HTML: ' + response.status);
        const html = await response.text();

        // Parse and inject body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Copy styles from head
        const styles = doc.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach(style => document.head.appendChild(style.cloneNode(true)));

        // Copy body content
        document.body.innerHTML += doc.body.innerHTML;

        // Execute scripts
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          if (script.src) {
            newScript.src = script.src;
          } else {
            newScript.textContent = script.textContent;
          }
          if (script.type) newScript.type = script.type;
          document.body.appendChild(newScript);
        });

        window.WidgetAPI.debugLog('Widget HTML loaded successfully');
      } catch (error) {
        window.WidgetAPI.error('Failed to load widget: ' + error.message, { error: error.toString() });
      }
    })();
  </script>
</body>
</html>`;
  }

  private generateJsEntryContent(widgetApiScript: string, entryUrl: string): string {
    const baseUrl = this.getAssetBaseUrl();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- SECURITY: Content Security Policy for widget isolation -->
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https: wss:;
    frame-src 'none';
    object-src 'none';
    base-uri 'self';
  ">
  <base href="${baseUrl}/">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #widget-root { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="widget-root"></div>
  <script>
    ${widgetApiScript}
  </script>
  <script type="module">
    // Load widget entry module
    try {
      const module = await import("${entryUrl}");
      const root = document.getElementById('widget-root');

      if (module.default && typeof module.default === 'function') {
        // Default export is init function
        module.default(root, window.WidgetAPI);
      } else if (module.init && typeof module.init === 'function') {
        // Named init function
        module.init(root, window.WidgetAPI);
      } else if (module.render && typeof module.render === 'function') {
        // Named render function
        module.render(root, window.WidgetAPI);
      } else {
        window.WidgetAPI.warn('No init/render function found in widget module');
      }
    } catch (error) {
      window.WidgetAPI.error('Failed to load widget module: ' + error.message, {
        error: error.toString(),
        stack: error.stack
      });
    }
  </script>
</body>
</html>`;
  }

  private generateWidgetAPIScript(): string {
    // Use the new comprehensive SDK from WidgetAPI.ts
    // This provides lifecycle hooks, capabilities, pipeline I/O, and more
    return generateWidgetSDKScript(this.widgetInstance.id, this.getAssetBaseUrl());
  }

  private resolveAssetUrl(assetPath: string): string {
    // Check for local assets first (for preview mode)
    if (this.localAssets && this.localAssets.has(assetPath)) {
      return this.localAssets.get(assetPath)!;
    }
    return `${this.getAssetBaseUrl()}/${assetPath}`;
  }

  private getAssetBaseUrl(): string {
    return this.assetBaseUrl;
  }

  private debugLog(level: DebugMessage['level'], message: string, data?: any): void {
    this.handleDebugMessage({
      level,
      widgetInstanceId: this.widgetInstance.id,
      message,
      data,
      timestamp: Date.now()
    });
  }

  getState(): any {
    return this.widgetInstance.state;
  }

  setState(patch: any): void {
    // Merge patch into widget state
    this.widgetInstance.state = {
      ...this.widgetInstance.state,
      ...patch
    };

    // Persist to local store (also syncs to database via widgetInstanceService)
    setWidgetState(
      this.widgetInstance.id,
      this.widgetInstance.state,
      {
        canvasId: this.widgetInstance.canvasId,
        widgetDefId: this.manifest.id,
      }
    );

    // Notify iframe of state change
    this.postMessageToWidget({
      type: 'STATE_UPDATE',
      payload: patch,
      instanceId: this.widgetInstance.id
    });
  }

  updatePosition(x: number, y: number): void {
    this.widgetInstance.position = { x, y };

    // Apply CSS transform for real-time visual update
    if (this.containerElement) {
      this.containerElement.style.left = `${x}px`;
      this.containerElement.style.top = `${y}px`;
    }
  }

  updateSize(width: number, height: number): void {
    this.widgetInstance.width = width;
    this.widgetInstance.height = height;

    // Apply size change to container and notify iframe
    if (this.containerElement) {
      this.containerElement.style.width = `${width}px`;
      this.containerElement.style.height = `${height}px`;
    }

    // Send resize message to widget
    this.sendResize(width, height);
  }

  updateRotation(rotation: number): void {
    this.widgetInstance.rotation = rotation;

    // Apply CSS transform for rotation
    if (this.containerElement) {
      this.containerElement.style.transform = rotation !== 0 ? `rotate(${rotation}deg)` : '';
    }
  }

  destroy(): void {
    this.unmount();
  }

  /** Get the widget instance ID */
  getInstanceId(): string {
    return this.widgetInstance.id;
  }

  /** Get the widget manifest */
  getManifest(): WidgetManifest {
    return this.manifest;
  }

  /** Check if widget is ready */
  isWidgetReady(): boolean {
    return this.isReady;
  }

  /** Get the iframe element (for debugging) */
  getIframe(): HTMLIFrameElement | null {
    return this.iframe;
  }
}
