/**
 * StickerNest v2 - Canvas Widget Bridge
 *
 * Makes the canvas behave like a widget by:
 * - Listening for widget:input events targeting the canvas
 * - Handling sticker/entity additions, updates, and deletions
 * - Emitting widget:output events when canvas state changes
 *
 * This allows other widgets to send stickers, entities, and property changes
 * to the canvas through the pipeline system.
 */

import { EventBus } from './EventBus';
import { useCanvasStore } from '../state/useCanvasStore';
import { useCanvasEntityStore } from '../state/useCanvasEntityStore';
import type { WidgetInstance } from '../types/domain';
import type {
  CanvasEntity,
  CanvasImageEntity,
  CanvasVectorEntity,
  CanvasTextEntity,
  Canvas3DEntity
} from '../types/canvasEntity';
import {
  createCanvasImageEntity,
  createCanvasVectorEntity,
  createCanvasTextEntity,
  createCanvas3DEntity
} from '../types/canvasEntity';
import type { WidgetInputEvent } from './PipelineRuntime';
import type { WidgetManifest } from '../types/manifest';

// ============================================================================
// Canvas Widget Constants
// ============================================================================

/**
 * Special widget ID for the canvas itself
 * Used when canvas acts as a widget in pipelines
 */
export const CANVAS_WIDGET_ID = '__canvas__';

/**
 * Canvas widget definition ID for manifest registration
 */
export const CANVAS_WIDGET_DEF_ID = 'stickernest.canvas';

// ============================================================================
// Canvas Widget Manifest
// ============================================================================

/**
 * Widget manifest for the canvas, defining its input/output ports
 * This allows the canvas to participate in widget pipelines
 */
export const CanvasWidgetManifest: WidgetManifest = {
  id: CANVAS_WIDGET_DEF_ID,
  name: 'Canvas',
  version: '1.0.0',
  kind: '2d',
  entry: 'internal',
  description: 'The main canvas surface that can receive stickers, entities, and property updates from other widgets',
  author: 'StickerNest',
  tags: ['canvas', 'container', 'surface'],

  // Input ports - what the canvas can receive
  inputs: {
    // Sticker/Image inputs
    'sticker.add': {
      type: 'object',
      description: 'Add a sticker/image to the canvas. Expects { src, x?, y?, width?, height?, name? }',
    },
    'sticker.remove': {
      type: 'string',
      description: 'Remove a sticker by entity ID',
    },

    // Entity inputs (generic)
    'entity.add': {
      type: 'object',
      description: 'Add any entity type to canvas. Expects full CanvasEntity object or partial with type',
    },
    'entity.update': {
      type: 'object',
      description: 'Update entity properties. Expects { id, ...updates }',
    },
    'entity.remove': {
      type: 'string',
      description: 'Remove entity by ID',
    },

    // Shape inputs
    'shape.add': {
      type: 'object',
      description: 'Add a vector shape. Expects { shapeType, x?, y?, width?, height?, fill?, stroke? }',
    },

    // Text inputs
    'text.add': {
      type: 'object',
      description: 'Add text to canvas. Expects { content, x?, y?, fontSize?, color?, fontFamily? }',
    },
    'text.update': {
      type: 'object',
      description: 'Update text content. Expects { id, content?, ...textProps }',
    },

    // Widget inputs (add widgets to canvas)
    'widget.add': {
      type: 'object',
      description: 'Add a widget instance to canvas. Expects { widgetDefId, x?, y?, width?, height?, state? }',
    },
    'widget.update': {
      type: 'object',
      description: 'Update widget properties. Expects { id, ...updates }',
    },
    'widget.remove': {
      type: 'string',
      description: 'Remove widget by instance ID',
    },

    // Batch operations
    'batch.add': {
      type: 'array',
      description: 'Add multiple entities/stickers at once. Array of entity objects',
    },
    'batch.clear': {
      type: 'trigger',
      description: 'Clear all entities from canvas',
    },

    // Canvas property inputs
    'canvas.zoom': {
      type: 'number',
      description: 'Set canvas zoom level (0.1 to 5)',
    },
    'canvas.pan': {
      type: 'object',
      description: 'Set canvas pan position. Expects { x, y }',
    },
    'canvas.mode': {
      type: 'string',
      description: 'Set canvas mode: view, edit, or connect',
    },

    // Selection inputs
    'selection.select': {
      type: 'string',
      description: 'Select an entity or widget by ID',
    },
    'selection.clear': {
      type: 'trigger',
      description: 'Clear current selection',
    },
  },

  // Output ports - what the canvas emits
  outputs: {
    // Entity events
    'entity.created': {
      type: 'object',
      description: 'Emitted when an entity is created on canvas',
    },
    'entity.updated': {
      type: 'object',
      description: 'Emitted when an entity is updated',
    },
    'entity.deleted': {
      type: 'string',
      description: 'Emitted when an entity is deleted (entity ID)',
    },

    // Widget events
    'widget.created': {
      type: 'object',
      description: 'Emitted when a widget is added to canvas',
    },
    'widget.updated': {
      type: 'object',
      description: 'Emitted when a widget is updated',
    },
    'widget.deleted': {
      type: 'string',
      description: 'Emitted when a widget is removed (widget ID)',
    },

    // Selection events
    'selection.changed': {
      type: 'object',
      description: 'Emitted when selection changes. Contains { selectedIds, primaryId }',
    },

    // Canvas state events
    'canvas.viewportChanged': {
      type: 'object',
      description: 'Emitted when viewport (zoom/pan) changes',
    },
    'canvas.modeChanged': {
      type: 'string',
      description: 'Emitted when canvas mode changes',
    },
  },

  capabilities: {
    draggable: false,
    resizable: false,
    rotatable: false,
  },

  io: {
    inputs: [
      'sticker.add', 'sticker.remove',
      'entity.add', 'entity.update', 'entity.remove',
      'shape.add', 'text.add', 'text.update',
      'widget.add', 'widget.update', 'widget.remove',
      'batch.add', 'batch.clear',
      'canvas.zoom', 'canvas.pan', 'canvas.mode',
      'selection.select', 'selection.clear',
    ],
    outputs: [
      'entity.created', 'entity.updated', 'entity.deleted',
      'widget.created', 'widget.updated', 'widget.deleted',
      'selection.changed', 'canvas.viewportChanged', 'canvas.modeChanged',
    ],
  },

  events: {
    emits: [
      'canvas:entity-created',
      'canvas:entity-updated',
      'canvas:entity-deleted',
      'canvas:selection-changed',
    ],
    listens: [
      'sticker:drop',
      'entity:request-add',
    ],
  },
};

// ============================================================================
// Bridge Configuration
// ============================================================================

export interface CanvasWidgetBridgeConfig {
  eventBus: EventBus;
  canvasId: string;
  debugEnabled?: boolean;
}

// ============================================================================
// Canvas Widget Bridge Class
// ============================================================================

/**
 * CanvasWidgetBridge - Makes the canvas behave like a widget
 *
 * Flow:
 * 1. Widget A emits output (e.g., image selected)
 * 2. Pipeline connects Widget A output to Canvas input (sticker.add)
 * 3. PipelineRuntime routes to Canvas via widget:input event
 * 4. CanvasWidgetBridge receives and processes the input
 * 5. Canvas state updates (entity added)
 * 6. Bridge emits widget:output (entity.created)
 */
export class CanvasWidgetBridge {
  private eventBus: EventBus;
  private canvasId: string;
  private debugEnabled: boolean;
  private subscriptions: Array<() => void> = [];
  private storeUnsubscribes: Array<() => void> = [];

  constructor(config: CanvasWidgetBridgeConfig) {
    this.eventBus = config.eventBus;
    this.canvasId = config.canvasId;
    this.debugEnabled = config.debugEnabled ?? false;

    this.setupInputListeners();
    this.setupStoreListeners();
    this.log('CanvasWidgetBridge initialized for canvas:', this.canvasId);
  }

  /**
   * Get the canvas widget ID (includes canvas ID for multi-canvas support)
   */
  getWidgetId(): string {
    return `${CANVAS_WIDGET_ID}:${this.canvasId}`;
  }

  /**
   * Setup listeners for widget:input events targeting the canvas
   */
  private setupInputListeners(): void {
    // Listen for widget:input events
    const unsubInput = this.eventBus.on('widget:input', (event) => {
      const input = event.payload as WidgetInputEvent;

      // Check if this input is for our canvas
      if (!this.isTargetingCanvas(input.targetWidgetId)) {
        return;
      }

      this.log('Received input:', input.portName, input.value);
      this.handleInput(input.portName, input.value, input.sourceWidgetId);
    });
    this.subscriptions.push(unsubInput);

    // Also listen for broadcast events that the canvas should handle
    const broadcastEvents = ['sticker:drop', 'entity:request-add'];
    broadcastEvents.forEach(eventType => {
      const unsub = this.eventBus.on(eventType, (event) => {
        this.handleBroadcastEvent(eventType, event.payload, event.sourceWidgetId);
      });
      this.subscriptions.push(unsub);
    });
  }

  /**
   * Check if a target widget ID refers to this canvas
   */
  private isTargetingCanvas(targetWidgetId: string): boolean {
    return (
      targetWidgetId === CANVAS_WIDGET_ID ||
      targetWidgetId === this.getWidgetId() ||
      targetWidgetId === CANVAS_WIDGET_DEF_ID ||
      targetWidgetId === `${CANVAS_WIDGET_DEF_ID}:${this.canvasId}`
    );
  }

  /**
   * Setup listeners for store changes to emit output events
   */
  private setupStoreListeners(): void {
    // Subscribe to canvas store changes for widget updates
    const canvasStore = useCanvasStore.getState();

    // Watch for selection changes
    const unsubSelection = useCanvasStore.subscribe(
      (state) => state.selection,
      (selection, prevSelection) => {
        if (selection.selectedIds !== prevSelection.selectedIds ||
            selection.primaryId !== prevSelection.primaryId) {
          this.emitOutput('selection.changed', {
            selectedIds: Array.from(selection.selectedIds),
            primaryId: selection.primaryId,
          });
        }
      }
    );
    this.storeUnsubscribes.push(unsubSelection);

    // Watch for viewport changes
    const unsubViewport = useCanvasStore.subscribe(
      (state) => state.viewport,
      (viewport, prevViewport) => {
        if (viewport.zoom !== prevViewport.zoom ||
            viewport.panX !== prevViewport.panX ||
            viewport.panY !== prevViewport.panY) {
          this.emitOutput('canvas.viewportChanged', viewport);
        }
      }
    );
    this.storeUnsubscribes.push(unsubViewport);

    // Watch for mode changes
    const unsubMode = useCanvasStore.subscribe(
      (state) => state.mode,
      (mode, prevMode) => {
        if (mode !== prevMode) {
          this.emitOutput('canvas.modeChanged', mode);
        }
      }
    );
    this.storeUnsubscribes.push(unsubMode);
  }

  /**
   * Handle incoming input based on port name
   */
  private handleInput(portName: string, value: unknown, sourceWidgetId?: string): void {
    const entityStore = useCanvasEntityStore.getState();
    const canvasStore = useCanvasStore.getState();

    switch (portName) {
      // Sticker operations
      case 'sticker.add':
        this.handleStickerAdd(value as Record<string, unknown>);
        break;
      case 'sticker.remove':
        entityStore.removeEntity(value as string);
        this.emitOutput('entity.deleted', value);
        break;

      // Generic entity operations
      case 'entity.add':
        this.handleEntityAdd(value as Record<string, unknown>);
        break;
      case 'entity.update':
        this.handleEntityUpdate(value as Record<string, unknown>);
        break;
      case 'entity.remove':
        entityStore.removeEntity(value as string);
        this.emitOutput('entity.deleted', value);
        break;

      // Shape operations
      case 'shape.add':
        this.handleShapeAdd(value as Record<string, unknown>);
        break;

      // Text operations
      case 'text.add':
        this.handleTextAdd(value as Record<string, unknown>);
        break;
      case 'text.update':
        this.handleTextUpdate(value as Record<string, unknown>);
        break;

      // Widget operations
      case 'widget.add':
        this.handleWidgetAdd(value as Record<string, unknown>);
        break;
      case 'widget.update':
        this.handleWidgetUpdate(value as Record<string, unknown>);
        break;
      case 'widget.remove':
        canvasStore.removeWidget(value as string);
        this.emitOutput('widget.deleted', value);
        break;

      // Batch operations
      case 'batch.add':
        this.handleBatchAdd(value as Array<Record<string, unknown>>);
        break;
      case 'batch.clear':
        entityStore.clearEntities();
        this.emitOutput('entity.deleted', '*');
        break;

      // Canvas property operations
      case 'canvas.zoom':
        canvasStore.setViewport({ zoom: Math.max(0.1, Math.min(5, value as number)) });
        break;
      case 'canvas.pan':
        const panValue = value as { x: number; y: number };
        canvasStore.setViewport({ panX: panValue.x, panY: panValue.y });
        break;
      case 'canvas.mode':
        const mode = value as 'view' | 'edit' | 'connect';
        if (['view', 'edit', 'connect'].includes(mode)) {
          canvasStore.setMode(mode);
        }
        break;

      // Selection operations
      case 'selection.select':
        canvasStore.select(value as string);
        break;
      case 'selection.clear':
        canvasStore.deselectAll();
        break;

      default:
        this.log('Unknown input port:', portName, 'warn');
    }
  }

  /**
   * Handle broadcast events (non-pipeline events)
   */
  private handleBroadcastEvent(eventType: string, payload: unknown, sourceWidgetId?: string): void {
    switch (eventType) {
      case 'sticker:drop':
        this.handleStickerAdd(payload as Record<string, unknown>);
        break;
      case 'entity:request-add':
        this.handleEntityAdd(payload as Record<string, unknown>);
        break;
    }
  }

  // ============================================================================
  // Input Handlers
  // ============================================================================

  private handleStickerAdd(data: Record<string, unknown>): void {
    const entityStore = useCanvasEntityStore.getState();

    // Support both direct src and wrapped object
    const src = (data.src as string) || (data.url as string) || (data.image as string);
    if (!src) {
      this.log('sticker.add missing src/url/image', 'warn');
      return;
    }

    const entity = createCanvasImageEntity(src, {
      x: (data.x as number) ?? 100,
      y: (data.y as number) ?? 100,
      width: (data.width as number) ?? 200,
      height: (data.height as number) ?? 200,
      name: (data.name as string) ?? 'Sticker',
      naturalWidth: (data.naturalWidth as number) ?? 0,
      naturalHeight: (data.naturalHeight as number) ?? 0,
      objectFit: (data.objectFit as CanvasImageEntity['objectFit']) ?? 'contain',
    });

    entityStore.addEntity(entity);
    this.emitOutput('entity.created', entity);
    this.log('Added sticker:', entity.id);
  }

  private handleEntityAdd(data: Record<string, unknown>): void {
    const entityStore = useCanvasEntityStore.getState();
    const type = data.type as string;

    let entity: CanvasEntity;

    switch (type) {
      case 'image':
        entity = createCanvasImageEntity(
          (data.src as string) || '',
          data as Partial<Omit<CanvasImageEntity, 'type' | 'id' | 'src' | 'createdAt' | 'updatedAt'>>
        );
        break;
      case 'vector':
        entity = createCanvasVectorEntity(
          data as Partial<Omit<CanvasVectorEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>>
        );
        break;
      case 'text':
        entity = createCanvasTextEntity(
          data as Partial<Omit<CanvasTextEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>>
        );
        break;
      case 'object3d':
        entity = createCanvas3DEntity(
          data as Partial<Omit<Canvas3DEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>>
        );
        break;
      default:
        // Try to infer type from data
        if (data.src || data.url || data.image) {
          entity = createCanvasImageEntity(
            (data.src as string) || (data.url as string) || (data.image as string) || '',
            data as Partial<Omit<CanvasImageEntity, 'type' | 'id' | 'src' | 'createdAt' | 'updatedAt'>>
          );
        } else if (data.content && typeof data.content === 'string') {
          entity = createCanvasTextEntity(
            data as Partial<Omit<CanvasTextEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>>
          );
        } else if (data.shapeType) {
          entity = createCanvasVectorEntity(
            data as Partial<Omit<CanvasVectorEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>>
          );
        } else {
          this.log('entity.add: Could not determine entity type', 'warn');
          return;
        }
    }

    entityStore.addEntity(entity);
    this.emitOutput('entity.created', entity);
    this.log('Added entity:', entity.id, entity.type);
  }

  private handleEntityUpdate(data: Record<string, unknown>): void {
    const entityStore = useCanvasEntityStore.getState();
    const { id, ...updates } = data;

    if (!id || typeof id !== 'string') {
      this.log('entity.update missing id', 'warn');
      return;
    }

    entityStore.updateEntity(id, updates as Partial<CanvasEntity>);

    const updated = entityStore.getEntity(id);
    if (updated) {
      this.emitOutput('entity.updated', updated);
      this.log('Updated entity:', id);
    }
  }

  private handleShapeAdd(data: Record<string, unknown>): void {
    const entityStore = useCanvasEntityStore.getState();

    const entity = createCanvasVectorEntity({
      shapeType: (data.shapeType as CanvasVectorEntity['shapeType']) ?? 'rectangle',
      x: (data.x as number) ?? 100,
      y: (data.y as number) ?? 100,
      width: (data.width as number) ?? 100,
      height: (data.height as number) ?? 100,
      fill: (data.fill as string) ?? '#8b5cf6',
      stroke: (data.stroke as string) ?? 'transparent',
      strokeWidth: (data.strokeWidth as number) ?? 0,
      cornerRadius: (data.cornerRadius as number) ?? 0,
      name: (data.name as string) ?? 'Shape',
    });

    entityStore.addEntity(entity);
    this.emitOutput('entity.created', entity);
    this.log('Added shape:', entity.id, entity.shapeType);
  }

  private handleTextAdd(data: Record<string, unknown>): void {
    const entityStore = useCanvasEntityStore.getState();

    const entity = createCanvasTextEntity({
      content: (data.content as string) ?? 'Text',
      x: (data.x as number) ?? 100,
      y: (data.y as number) ?? 100,
      width: (data.width as number) ?? 200,
      height: (data.height as number) ?? 50,
      fontSize: (data.fontSize as number) ?? 24,
      color: (data.color as string) ?? '#1f2937',
      fontFamily: (data.fontFamily as string) ?? 'Inter, system-ui, sans-serif',
      fontWeight: (data.fontWeight as CanvasTextEntity['fontWeight']) ?? 'normal',
      textAlign: (data.textAlign as CanvasTextEntity['textAlign']) ?? 'left',
      name: (data.name as string) ?? 'Text',
    });

    entityStore.addEntity(entity);
    this.emitOutput('entity.created', entity);
    this.log('Added text:', entity.id);
  }

  private handleTextUpdate(data: Record<string, unknown>): void {
    this.handleEntityUpdate(data);
  }

  private handleWidgetAdd(data: Record<string, unknown>): void {
    const canvasStore = useCanvasStore.getState();

    const widgetDefId = data.widgetDefId as string;
    if (!widgetDefId) {
      this.log('widget.add missing widgetDefId', 'warn');
      return;
    }

    const widget: WidgetInstance = {
      id: `widget-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`,
      canvasId: this.canvasId,
      widgetDefId,
      position: {
        x: (data.x as number) ?? 100,
        y: (data.y as number) ?? 100,
      },
      sizePreset: (data.sizePreset as WidgetInstance['sizePreset']) ?? 'md',
      width: (data.width as number) ?? 200,
      height: (data.height as number) ?? 150,
      rotation: (data.rotation as number) ?? 0,
      zIndex: canvasStore.getWidgets().length + 1,
      state: (data.state as Record<string, unknown>) ?? {},
      locked: false,
      visible: true,
      name: (data.name as string) ?? widgetDefId.split('.').pop() ?? 'Widget',
    };

    canvasStore.addWidget(widget);
    this.emitOutput('widget.created', widget);
    this.log('Added widget:', widget.id, widget.widgetDefId);
  }

  private handleWidgetUpdate(data: Record<string, unknown>): void {
    const canvasStore = useCanvasStore.getState();
    const { id, ...updates } = data;

    if (!id || typeof id !== 'string') {
      this.log('widget.update missing id', 'warn');
      return;
    }

    // Map common property names
    const widgetUpdates: Partial<WidgetInstance> = {};
    if ('x' in updates || 'y' in updates) {
      const widget = canvasStore.getWidget(id);
      widgetUpdates.position = {
        x: (updates.x as number) ?? widget?.position.x ?? 0,
        y: (updates.y as number) ?? widget?.position.y ?? 0,
      };
    }
    if ('width' in updates) widgetUpdates.width = updates.width as number;
    if ('height' in updates) widgetUpdates.height = updates.height as number;
    if ('zIndex' in updates) widgetUpdates.zIndex = updates.zIndex as number;
    if ('state' in updates) widgetUpdates.state = updates.state as Record<string, unknown>;
    if ('locked' in updates) widgetUpdates.locked = updates.locked as boolean;
    if ('visible' in updates) widgetUpdates.visible = updates.visible as boolean;
    if ('name' in updates) widgetUpdates.name = updates.name as string;

    canvasStore.updateWidget(id, widgetUpdates);

    const updated = canvasStore.getWidget(id);
    if (updated) {
      this.emitOutput('widget.updated', updated);
      this.log('Updated widget:', id);
    }
  }

  private handleBatchAdd(items: Array<Record<string, unknown>>): void {
    if (!Array.isArray(items)) {
      this.log('batch.add expects an array', 'warn');
      return;
    }

    items.forEach(item => {
      const type = item.type as string;
      if (type === 'widget' || item.widgetDefId) {
        this.handleWidgetAdd(item);
      } else {
        this.handleEntityAdd(item);
      }
    });
  }

  // ============================================================================
  // Output Emission
  // ============================================================================

  /**
   * Emit a widget:output event from the canvas
   */
  emitOutput(portName: string, value: unknown): void {
    this.eventBus.emit({
      type: 'widget:output',
      scope: 'canvas',
      sourceWidgetId: this.getWidgetId(),
      payload: {
        widgetInstanceId: this.getWidgetId(),
        portName,
        value,
      },
    });

    this.log('Emitted output:', portName);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private log(message: string, ...args: unknown[]): void {
    if (this.debugEnabled) {
      const level = args[0] === 'warn' ? 'warn' : args[0] === 'error' ? 'error' : 'log';
      const data = level === 'log' ? args : args.slice(1);
      console[level](`[CanvasWidgetBridge:${this.canvasId}]`, message, ...data);
    }
  }

  /**
   * Cleanup and destroy the bridge
   */
  destroy(): void {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
    this.storeUnsubscribes.forEach(unsub => unsub());
    this.storeUnsubscribes = [];
    this.log('CanvasWidgetBridge destroyed');
  }
}

// ============================================================================
// Singleton Management
// ============================================================================

/** Map of canvas ID to bridge instance */
const bridgeInstances = new Map<string, CanvasWidgetBridge>();

/**
 * Get or create a CanvasWidgetBridge for a canvas
 */
export function getCanvasWidgetBridge(config: CanvasWidgetBridgeConfig): CanvasWidgetBridge {
  const existing = bridgeInstances.get(config.canvasId);
  if (existing) {
    return existing;
  }

  const bridge = new CanvasWidgetBridge(config);
  bridgeInstances.set(config.canvasId, bridge);
  return bridge;
}

/**
 * Destroy a canvas widget bridge
 */
export function destroyCanvasWidgetBridge(canvasId: string): void {
  const bridge = bridgeInstances.get(canvasId);
  if (bridge) {
    bridge.destroy();
    bridgeInstances.delete(canvasId);
  }
}

/**
 * Destroy all canvas widget bridges
 */
export function destroyAllCanvasWidgetBridges(): void {
  bridgeInstances.forEach(bridge => bridge.destroy());
  bridgeInstances.clear();
}
