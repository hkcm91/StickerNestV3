/**
 * StickerNest v2 - CanvasRuntime
 * Manages canvas lifecycle, widget instances, and runtime orchestration
 * Coordinates WidgetSandboxHost, WidgetLoader, and EventBus
 */

import type { WidgetInstance, Pipeline } from '../types/domain';
import type { CanvasRuntimeConfig, CanvasMode, Event, DebugMessage } from '../types/runtime';
import { RuntimeContext } from './RuntimeContext';
import { WidgetSandboxHost, DebugMessageCallback } from './WidgetSandboxHost';
import { WidgetLoader, LoadedWidget } from './WidgetLoader';
import { EventBus } from './EventBus';
import { PipelineRuntime } from './PipelineRuntime';

interface MountedWidget {
  instance: WidgetInstance;
  sandboxHost: WidgetSandboxHost;
  containerElement: HTMLElement;
  loadedWidget: LoadedWidget;
}

export class CanvasRuntime {
  private config: CanvasRuntimeConfig;
  private context: RuntimeContext | null = null;
  private widgetLoader: WidgetLoader | null = null;
  private mountedWidgets: Map<string, MountedWidget> = new Map();
  private mountingWidgets: Set<string> = new Set(); // Track widgets currently being mounted
  private canvasContainer: HTMLElement | null = null;
  private mode: CanvasMode;
  private debugCallback: DebugMessageCallback | null = null;
  private eventSubscriptions: (() => void)[] = [];
  private pipelineRuntime: PipelineRuntime | null = null;

  constructor(config: CanvasRuntimeConfig) {
    this.config = config;
    this.mode = config.mode;
  }

  /**
   * Initialize the runtime with a canvas container element
   */
  async initialize(canvasContainer: HTMLElement, storageBaseUrl: string, context?: RuntimeContext): Promise<void> {
    this.canvasContainer = canvasContainer;

    // Create or use provided runtime context
    this.context = context || new RuntimeContext(this.config.userId, this.config.canvasId);

    // Create widget loader
    this.widgetLoader = new WidgetLoader(storageBaseUrl);

    // Create pipeline runtime
    this.pipelineRuntime = new PipelineRuntime(
      this.config.canvasId,
      this.context.eventBus as EventBus,
      this.config.debugEnabled
    );

    // Setup internal event handlers
    this.setupEventHandlers();

    // Emit initialization event
    this.context.eventBus.emit({
      type: 'canvas:initialized',
      scope: 'canvas',
      payload: {
        canvasId: this.config.canvasId,
        mode: this.mode,
        debugEnabled: this.config.debugEnabled
      }
    });
  }

  /**
   * Load all widgets for the canvas
   * Fetches widget instances and mounts them
   */
  async loadWidgets(widgetInstances: WidgetInstance[]): Promise<void> {
    if (!this.context) {
      throw new Error('Runtime not initialized');
    }

    // Store instances in context
    for (const instance of widgetInstances) {
      this.context.addWidgetInstance(instance);
    }

    // Register widgets with PipelineRuntime for ID resolution
    if (this.pipelineRuntime) {
      this.pipelineRuntime.updateLiveWidgets(
        widgetInstances.map(w => ({ id: w.id, widgetDefId: w.widgetDefId }))
      );
    }

    // Mount all widgets
    const mountPromises = widgetInstances.map(instance => this.mountWidget(instance));
    await Promise.allSettled(mountPromises);

    // Emit load complete event
    this.context.eventBus.emit({
      type: 'canvas:widgetsLoaded',
      scope: 'canvas',
      payload: {
        count: widgetInstances.length,
        widgetIds: widgetInstances.map(w => w.id)
      }
    });
  }

  /**
   * Mount a single widget instance
   * Creates sandbox host via WidgetLoader and mounts iframe
   */
  async mountWidget(instance: WidgetInstance): Promise<void> {
    if (!this.context || !this.widgetLoader || !this.canvasContainer) {
      throw new Error('Runtime not initialized');
    }

    // Check if already mounted
    if (this.mountedWidgets.has(instance.id)) {
      console.warn(`Widget ${instance.id} is already mounted`);
      return;
    }

    // Check if currently mounting (prevents race condition with concurrent mount calls)
    if (this.mountingWidgets.has(instance.id)) {
      console.warn(`Widget ${instance.id} is currently being mounted, skipping duplicate mount`);
      return;
    }

    // Mark as mounting before async operations
    this.mountingWidgets.add(instance.id);

    try {
      // Load widget manifest and metadata
      const loadedWidget = await this.widgetLoader.loadInstance(instance, this.config.userId);

      // Create container element for widget
      const containerElement = this.createWidgetContainer(instance);
      this.canvasContainer.appendChild(containerElement);

      // Create sandbox host using WidgetLoader
      const sandboxHost = await this.widgetLoader.createSandbox(
        instance,
        this.config.userId,
        this.context.eventBus as EventBus,
        this.config.debugEnabled
      );

      // Set debug callback if configured
      if (this.debugCallback) {
        sandboxHost.setDebugCallback(this.debugCallback);
      }

      // Mount the widget (creates iframe and loads content)
      await sandboxHost.mount(containerElement);

      // Store mounted widget
      this.mountedWidgets.set(instance.id, {
        instance,
        sandboxHost,
        containerElement,
        loadedWidget
      });

      // Ensure instance is in context
      if (!this.context.getWidgetInstance(instance.id)) {
        this.context.addWidgetInstance(instance);
      }

      // Register broadcast listeners from manifest events.listens (for local/test widgets)
      if (this.pipelineRuntime && loadedWidget.manifest?.events?.listens) {
        const listensEvents = loadedWidget.manifest.events.listens;
        if (Array.isArray(listensEvents)) {
          this.pipelineRuntime.registerBroadcastListener(instance.id, listensEvents);
        }
      }

    } catch (error) {
      console.error(`Failed to mount widget ${instance.id}:`, error);

      // Emit error event
      this.context.eventBus.emit({
        type: 'widget:mountError',
        scope: 'canvas',
        payload: {
          widgetInstanceId: instance.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    } finally {
      // Always remove from mounting set, regardless of success or failure
      this.mountingWidgets.delete(instance.id);
    }
  }

  /**
   * Unmount a widget by instance ID
   * Destroys sandbox and removes iframe from DOM
   */
  async unmountWidget(widgetInstanceId: string): Promise<void> {
    const mounted = this.mountedWidgets.get(widgetInstanceId);
    if (!mounted) {
      console.warn(`Widget ${widgetInstanceId} is not mounted`);
      return;
    }

    try {
      // Unmount from sandbox host (sends DESTROY message, removes iframe)
      await mounted.sandboxHost.unmount();

      // Remove container element from DOM
      if (mounted.containerElement.parentElement) {
        mounted.containerElement.parentElement.removeChild(mounted.containerElement);
      }

      // Remove from mounted widgets map
      this.mountedWidgets.delete(widgetInstanceId);

      // Remove from context
      if (this.context) {
        this.context.removeWidgetInstance(widgetInstanceId);
      }

    } catch (error) {
      console.error(`Failed to unmount widget ${widgetInstanceId}:`, error);
      throw error;
    }
  }

  /**
   * Handle an event from the event bus or external source
   * Forwards to EventBus for distribution to widgets
   */
  handleEvent(event: Event): void {
    if (!this.context) return;

    // Forward to event bus - sandboxes will pick up via subscriptions
    this.context.eventBus.emit(event);
  }

  /**
   * Update widget state
   * Sends STATE_UPDATE to widget iframe via sandbox host
   */
  updateWidgetState(widgetInstanceId: string, patch: any): void {
    const mounted = this.mountedWidgets.get(widgetInstanceId);
    if (!mounted) {
      console.warn(`Widget ${widgetInstanceId} is not mounted`);
      return;
    }

    // Update through sandbox host (sends postMessage to iframe)
    mounted.sandboxHost.setState(patch);

    // Update in context
    if (this.context) {
      this.context.updateWidgetInstance(widgetInstanceId, {
        state: { ...mounted.instance.state, ...patch }
      });
    }
  }

  /**
   * Update widget position
   * Integrated with drag system - emits widget:update event
   */
  async updateWidgetPosition(widgetInstanceId: string, x: number, y: number): Promise<void> {
    const mounted = this.mountedWidgets.get(widgetInstanceId);
    if (!mounted) return;

    // Update instance
    mounted.instance.position = { x, y };

    // Update sandbox host
    mounted.sandboxHost.updatePosition(x, y);

    // Update container position
    this.applyWidgetTransform(mounted);

    // Update context
    if (this.context) {
      this.context.updateWidgetInstance(widgetInstanceId, { position: { x, y } });
    }

    // Emit position changed event
    this.context?.eventBus.emit({
      type: 'widget:positionChanged',
      scope: 'widget',
      payload: { widgetInstanceId, x, y },
      sourceWidgetId: widgetInstanceId
    });

    // Emit general update event for UI refresh
    this.context?.eventBus.emit({
      type: 'widget:update',
      scope: 'widget',
      payload: { widgetInstanceId, property: 'position', value: { x, y } },
      sourceWidgetId: widgetInstanceId
    });

    // Persist to database (debounced)
    this.context?.saveWidgetPositionDebounced(widgetInstanceId, x, y);
  }

  /**
   * Update widget size
   * Integrated with resize system - emits widget:update event
   */
  async updateWidgetSize(widgetInstanceId: string, width: number, height: number): Promise<void> {
    const mounted = this.mountedWidgets.get(widgetInstanceId);
    if (!mounted) return;

    // Update instance
    mounted.instance.width = width;
    mounted.instance.height = height;

    // Update sandbox host
    mounted.sandboxHost.updateSize(width, height);

    // Update container size
    this.applyWidgetTransform(mounted);

    // Update context
    if (this.context) {
      this.context.updateWidgetInstance(widgetInstanceId, { width, height });
    }

    // Emit size changed event
    this.context?.eventBus.emit({
      type: 'widget:sizeChanged',
      scope: 'widget',
      payload: { widgetInstanceId, width, height },
      sourceWidgetId: widgetInstanceId
    });

    // Emit general update event for UI refresh
    this.context?.eventBus.emit({
      type: 'widget:update',
      scope: 'widget',
      payload: { widgetInstanceId, property: 'size', value: { width, height } },
      sourceWidgetId: widgetInstanceId
    });

    // Persist to database (debounced)
    this.context?.saveWidgetSizeDebounced(widgetInstanceId, width, height);
  }

  /**
   * Update widget rotation
   * Integrated with rotation system - emits widget:update event
   */
  async updateWidgetRotation(widgetInstanceId: string, rotation: number): Promise<void> {
    const mounted = this.mountedWidgets.get(widgetInstanceId);
    if (!mounted) return;

    // Update instance
    mounted.instance.rotation = rotation;

    // Update sandbox host
    mounted.sandboxHost.updateRotation(rotation);

    // Update container rotation
    this.applyWidgetTransform(mounted);

    // Update context
    if (this.context) {
      this.context.updateWidgetInstance(widgetInstanceId, { rotation });
    }

    // Emit rotation changed event
    this.context?.eventBus.emit({
      type: 'widget:rotationChanged',
      scope: 'widget',
      payload: { widgetInstanceId, rotation },
      sourceWidgetId: widgetInstanceId
    });

    // Emit general update event for UI refresh
    this.context?.eventBus.emit({
      type: 'widget:update',
      scope: 'widget',
      payload: { widgetInstanceId, property: 'rotation', value: rotation },
      sourceWidgetId: widgetInstanceId
    });

    // Persist to database (debounced)
    this.context?.saveWidgetRotationDebounced(widgetInstanceId, rotation);
  }

  /**
   * Update widget z-index
   * Emits widget:update event for UI refresh
   */
  async updateWidgetZIndex(widgetInstanceId: string, zIndex: number): Promise<void> {
    const mounted = this.mountedWidgets.get(widgetInstanceId);
    if (!mounted) return;

    // Update instance
    mounted.instance.zIndex = zIndex;

    // Update container z-index
    mounted.containerElement.style.zIndex = String(zIndex);

    // Update context
    if (this.context) {
      this.context.updateWidgetInstance(widgetInstanceId, { zIndex });
    }

    // Emit z-index changed event
    this.context?.eventBus.emit({
      type: 'widget:zIndexChanged',
      scope: 'widget',
      payload: { widgetInstanceId, zIndex },
      sourceWidgetId: widgetInstanceId
    });

    // Emit general update event for UI refresh
    this.context?.eventBus.emit({
      type: 'widget:update',
      scope: 'widget',
      payload: { widgetInstanceId, property: 'zIndex', value: zIndex },
      sourceWidgetId: widgetInstanceId
    });

    // Persist to database (debounced)
    this.context?.saveWidgetZIndexDebounced(widgetInstanceId, zIndex);
  }

  /**
   * Switch between view and edit mode
   * Emits canvas:modeChanged event for UI components
   */
  setMode(mode: CanvasMode): void {
    const previousMode = this.mode;
    this.mode = mode;

    // Emit mode changed event
    this.context?.eventBus.emit({
      type: 'canvas:modeChanged',
      scope: 'canvas',
      payload: { mode, previousMode }
    });

    // Widget containers are now updated via WidgetFrame component
    // which responds to mode prop changes from CanvasRenderer
  }

  /**
   * Get current canvas mode
   */
  getMode(): CanvasMode {
    return this.mode;
  }

  /**
   * Set callback for debug messages from widgets
   */
  setDebugCallback(callback: DebugMessageCallback): void {
    this.debugCallback = callback;

    // Apply to all mounted widgets
    for (const mounted of this.mountedWidgets.values()) {
      mounted.sandboxHost.setDebugCallback(callback);
    }
  }

  /**
   * Get runtime context
   */
  getContext(): RuntimeContext | null {
    return this.context;
  }

  /**
   * Get event bus
   */
  getEventBus(): EventBus | null {
    return this.context?.eventBus as EventBus || null;
  }

  /**
   * Get pipeline runtime
   */
  getPipelineRuntime(): PipelineRuntime | null {
    return this.pipelineRuntime;
  }

  /**
   * Load pipelines for this canvas
   * Initializes pipeline routing via PipelineRuntime
   */
  loadPipelines(pipelines: Pipeline[]): void {
    if (!this.pipelineRuntime) {
      console.warn('Pipeline runtime not initialized');
      return;
    }

    this.pipelineRuntime.loadPipelines(pipelines);

    // Emit pipelines loaded event
    this.context?.eventBus.emit({
      type: 'canvas:pipelinesLoaded',
      scope: 'canvas',
      payload: {
        canvasId: this.config.canvasId,
        pipelineCount: pipelines.length,
        pipelineNames: pipelines.map(p => p.name)
      }
    });
  }

  /**
   * Update a single pipeline
   */
  updatePipeline(pipeline: Pipeline): void {
    if (!this.pipelineRuntime) return;
    this.pipelineRuntime.updatePipeline(pipeline);
  }

  /**
   * Remove a pipeline
   */
  removePipeline(pipelineId: string): void {
    if (!this.pipelineRuntime) return;
    this.pipelineRuntime.removePipeline(pipelineId);
  }

  /**
   * Get mounted widget by ID
   */
  getMountedWidget(widgetInstanceId: string): MountedWidget | undefined {
    return this.mountedWidgets.get(widgetInstanceId);
  }

  /**
   * Get all mounted widget IDs
   */
  getMountedWidgetIds(): string[] {
    return Array.from(this.mountedWidgets.keys());
  }

  /**
   * Check if a widget is currently being mounted
   */
  isMounting(widgetInstanceId: string): boolean {
    return this.mountingWidgets.has(widgetInstanceId);
  }

  /**
   * Destroy the runtime and cleanup all resources
   */
  async destroy(): Promise<void> {
    // Clear mounting set to prevent any pending mounts
    this.mountingWidgets.clear();

    // Unmount all widgets
    const unmountPromises = Array.from(this.mountedWidgets.keys()).map(id =>
      this.unmountWidget(id)
    );
    await Promise.allSettled(unmountPromises);

    // Cleanup event subscriptions
    this.eventSubscriptions.forEach(unsub => unsub());
    this.eventSubscriptions = [];

    // Emit destroy event before cleaning up context
    this.context?.eventBus.emit({
      type: 'canvas:destroyed',
      scope: 'canvas',
      payload: { canvasId: this.config.canvasId }
    });

    // Cleanup pipeline runtime
    if (this.pipelineRuntime) {
      this.pipelineRuntime.destroy();
      this.pipelineRuntime = null;
    }

    // Cleanup context
    if (this.context) {
      this.context.destroy();
      this.context = null;
    }

    // Clear references
    this.widgetLoader = null;
    this.canvasContainer = null;
    this.mountedWidgets.clear();
  }

  // Private helper methods

  private createWidgetContainer(instance: WidgetInstance): HTMLElement {
    const container = document.createElement('div');

    // Set positioning
    container.style.position = 'absolute';
    container.style.left = `${instance.position.x}px`;
    container.style.top = `${instance.position.y}px`;
    container.style.width = `${instance.width}px`;
    container.style.height = `${instance.height}px`;
    container.style.zIndex = String(instance.zIndex);

    // Apply rotation if set
    if (instance.rotation !== 0) {
      container.style.transform = `rotate(${instance.rotation}deg)`;
    }

    // Data attributes for debugging
    container.dataset.widgetInstanceId = instance.id;
    container.dataset.widgetDefId = instance.widgetDefId;

    // Class for styling
    container.className = 'widget-container';

    // Ensure container doesn't block interactions with WidgetFrame
    container.style.pointerEvents = 'none';

    return container;
  }

  private applyWidgetTransform(mounted: MountedWidget): void {
    const { instance, containerElement } = mounted;

    containerElement.style.left = `${instance.position.x}px`;
    containerElement.style.top = `${instance.position.y}px`;
    containerElement.style.width = `${instance.width}px`;
    containerElement.style.height = `${instance.height}px`;

    if (instance.rotation !== 0) {
      containerElement.style.transform = `rotate(${instance.rotation}deg)`;
    } else {
      containerElement.style.transform = '';
    }
  }

  private setupEventHandlers(): void {
    if (!this.context) return;

    // Listen for widget state change events
    const unsubStateChange = this.context.eventBus.on('widget:stateChanged', (event: Event) => {
      // Could sync state to database here in future
      if (this.config.debugEnabled) {
        console.log('[CanvasRuntime] Widget state changed:', event.payload);
      }
    });
    this.eventSubscriptions.push(unsubStateChange);

    // Listen for debug messages
    const unsubDebug = this.context.eventBus.on('debug:message', (event: Event) => {
      if (this.debugCallback) {
        this.debugCallback(event.payload as DebugMessage);
      }
    });
    this.eventSubscriptions.push(unsubDebug);

    // Listen for widget mount errors
    const unsubMountError = this.context.eventBus.on('widget:mountError', (event: Event) => {
      console.error('[CanvasRuntime] Widget mount error:', event.payload);
    });
    this.eventSubscriptions.push(unsubMountError);

    // Listen for widget add requests (from UI)
    const unsubAddRequest = this.context.eventBus.on('widget:add-request', async (event: Event) => {
      const { widgetDefId, version, source, position, positionOffset, generatedContent, stickerId } = event.payload;
      if (!widgetDefId) return;

      try {
        // Get manifest - either from generatedContent or fetch from local widgets
        let manifest = generatedContent?.manifest;

        // For local widgets, try to fetch the manifest to get size config
        if (!manifest && source === 'local') {
          try {
            const response = await fetch(`/test-widgets/${widgetDefId}/manifest.json`);
            if (response.ok) {
              manifest = await response.json();
            }
          } catch (e) {
            console.warn(`[CanvasRuntime] Could not fetch manifest for ${widgetDefId}:`, e);
          }
        }

        // Determine widget size from manifest or use defaults
        const sizeConfig = manifest?.size;
        const defaultWidth = 320;  // Larger default for better usability
        const defaultHeight = 240;

        // Use manifest size if available, otherwise defaults
        const widgetWidth = sizeConfig?.width || defaultWidth;
        const widgetHeight = sizeConfig?.height || defaultHeight;

        // Create new instance with position (direct position takes priority, otherwise use offset from base)
        const instanceId = crypto.randomUUID();
        const baseX = position?.x ?? (100 + (positionOffset?.x || 0));
        const baseY = position?.y ?? (100 + (positionOffset?.y || 0));

        const instance: WidgetInstance = {
          id: instanceId,
          canvasId: this.config.canvasId,
          widgetDefId,
          version,
          position: { x: baseX, y: baseY },
          sizePreset: 'md',
          width: widgetWidth,
          height: widgetHeight,
          rotation: 0,
          zIndex: this.mountedWidgets.size + 1,
          state: {},
          // Store source, manifest, and generated content
          metadata: {
            source: source || 'user',
            generatedContent: generatedContent || (manifest ? { manifest, html: '' } : undefined),
            // Store size constraints from manifest
            sizeConfig: sizeConfig
          }
        };

        // Mount the widget (mountWidget will handle generated content)
        await this.mountWidget(instance);

        // Register with PipelineRuntime for pipeline routing
        if (this.pipelineRuntime) {
          console.log(`[CanvasRuntime] Registering widget with PipelineRuntime: ${widgetDefId} -> ${instanceId}`);
          this.pipelineRuntime.registerWidget(instanceId, widgetDefId);

          // Register broadcast listeners from manifest events.listens
          if (manifest?.events?.listens && Array.isArray(manifest.events.listens)) {
            console.log(`[CanvasRuntime] Registering broadcast listeners for ${widgetDefId}:`, manifest.events.listens);
            this.pipelineRuntime.registerBroadcastListener(instanceId, manifest.events.listens);
          }

          // Also register manifest for port validation
          if (manifest) {
            this.pipelineRuntime.registerManifest(widgetDefId, manifest);
          }
        }

        // Emit success (include stickerId if widget was spawned by a sticker)
        this.context?.eventBus.emit({
          type: 'widget:added',
          scope: 'canvas',
          payload: { widgetInstanceId: instanceId, width: widgetWidth, height: widgetHeight, stickerId }
        });

      } catch (error) {
        console.error('Failed to add widget:', error);
        this.context?.eventBus.emit({
          type: 'widget:addError',
          scope: 'canvas',
          payload: { widgetDefId, error: (error as Error).message }
        });
      }
    });
    this.eventSubscriptions.push(unsubAddRequest);

    // Listen for widget remove requests (from UI)
    const unsubRemoveRequest = this.context.eventBus.on('widget:remove-request', async (event: Event) => {
      const { widgetInstanceId } = event.payload;
      if (!widgetInstanceId) return;

      try {
        // Unregister from PipelineRuntime first
        if (this.pipelineRuntime) {
          this.pipelineRuntime.unregisterWidget(widgetInstanceId);
        }

        await this.unmountWidget(widgetInstanceId);
        this.context?.eventBus.emit({
          type: 'widget:removed',
          scope: 'canvas',
          payload: { widgetInstanceId }
        });
      } catch (error) {
        console.error('Failed to remove widget:', error);
      }
    });
    this.eventSubscriptions.push(unsubRemoveRequest);

    // Listen for pipeline update requests
    const unsubPipelineUpdate = this.context.eventBus.on('pipeline:update-request', (event: Event) => {
      const { pipeline } = event.payload;
      if (pipeline && this.pipelineRuntime) {
        this.pipelineRuntime.updatePipeline(pipeline);
      }
    });
    this.eventSubscriptions.push(unsubPipelineUpdate);

    // Listen for pipeline remove requests
    const unsubPipelineRemove = this.context.eventBus.on('pipeline:remove-request', (event: Event) => {
      const { pipelineId } = event.payload;
      if (pipelineId && this.pipelineRuntime) {
        this.pipelineRuntime.removePipeline(pipelineId);
      }
    });
    this.eventSubscriptions.push(unsubPipelineRemove);
  }
}
