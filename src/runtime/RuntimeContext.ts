/**
 * StickerNest v2 - RuntimeContext
 * Global runtime context for canvas execution
 */

import type { WidgetInstance } from '../types/domain';
import type { RuntimeContext as IRuntimeContext, GlobalStateStore, UnsubscribeFn } from '../types/runtime';
import { EventBus } from './EventBus';
import {
  loadWidgetInstances,
  saveAllWidgetInstances,
  saveWidgetInstance,
  saveWidgetPosition,
  saveWidgetSize,
  saveWidgetRotation,
  saveWidgetZIndex,
  deleteWidgetInstance,
  flushPendingSaves,
} from '../services/widgetInstanceService';

class SimpleStateStore implements GlobalStateStore {
  private store: Map<string, any> = new Map();
  private subscribers: Map<string, Set<(value: any) => void>> = new Map();

  get(key: string): any {
    return this.store.get(key);
  }

  set(key: string, value: any): void {
    this.store.set(key, value);
    const handlers = this.subscribers.get(key);
    if (handlers) {
      handlers.forEach(handler => handler(value));
    }
  }

  subscribe(key: string, handler: (value: any) => void): UnsubscribeFn {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    const handlers = this.subscribers.get(key)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  clear(): void {
    this.store.clear();
    this.subscribers.clear();
  }
}

export class RuntimeContext implements IRuntimeContext {
  userId: string;
  canvasId: string;
  widgetInstances: WidgetInstance[];
  eventBus: EventBus;
  stateStore: GlobalStateStore;

  private instanceMap: Map<string, WidgetInstance> = new Map();

  constructor(userId: string, canvasId: string) {
    this.userId = userId;
    this.canvasId = canvasId;
    this.widgetInstances = [];
    this.eventBus = new EventBus();
    this.stateStore = new SimpleStateStore();
  }

  /**
   * Add a widget instance to the context
   */
  addWidgetInstance(instance: WidgetInstance): void {
    // Validate instance
    if (!instance.id) {
      throw new Error('Widget instance must have an id');
    }

    // Check for duplicates
    if (this.instanceMap.has(instance.id)) {
      console.warn(`Widget instance ${instance.id} already exists in context`);
      return;
    }

    // Ensure canvasId is set to this context's canvasId
    // This is important when loading widgets from storage that may have different/missing canvasId
    if (!instance.canvasId || instance.canvasId !== this.canvasId) {
      instance.canvasId = this.canvasId;
    }

    // Add to array and map
    this.widgetInstances.push(instance);
    this.instanceMap.set(instance.id, instance);

    // Emit widget added event
    this.eventBus.emit({
      type: 'context:widgetAdded',
      scope: 'canvas',
      payload: {
        widgetInstanceId: instance.id,
        widgetDefId: instance.widgetDefId
      }
    });
  }

  /**
   * Remove a widget instance from the context
   */
  removeWidgetInstance(instanceId: string): void {
    const instance = this.instanceMap.get(instanceId);
    if (!instance) {
      console.warn(`Widget instance ${instanceId} not found in context`);
      return;
    }

    // Remove from array
    const index = this.widgetInstances.findIndex(w => w.id === instanceId);
    if (index !== -1) {
      this.widgetInstances.splice(index, 1);
    }

    // Remove from map
    this.instanceMap.delete(instanceId);

    // Clear widget-specific state from state store
    // State keys are namespaced by widget ID
    const stateKey = `widget:${instanceId}`;
    this.stateStore.set(stateKey, undefined);

    // Emit widget removed event
    this.eventBus.emit({
      type: 'context:widgetRemoved',
      scope: 'canvas',
      payload: {
        widgetInstanceId: instanceId,
        widgetDefId: instance.widgetDefId
      }
    });
  }

  /**
   * Get a widget instance by ID
   */
  getWidgetInstance(instanceId: string): WidgetInstance | undefined {
    return this.instanceMap.get(instanceId);
  }

  /**
   * Update a widget instance
   */
  updateWidgetInstance(instanceId: string, updates: Partial<WidgetInstance>): void {
    const instance = this.instanceMap.get(instanceId);
    if (!instance) {
      console.warn(`Widget instance ${instanceId} not found in context`);
      return;
    }

    // Validate updates - don't allow changing id or canvasId
    if ('id' in updates || 'canvasId' in updates) {
      throw new Error('Cannot change widget instance id or canvasId');
    }

    // Apply updates
    Object.assign(instance, updates);

    // Emit widget updated event
    this.eventBus.emit({
      type: 'context:widgetUpdated',
      scope: 'canvas',
      payload: {
        widgetInstanceId: instanceId,
        updates
      }
    });
  }

  /**
   * Get all widget instances for a specific widget definition
   */
  getInstancesByDefinition(widgetDefId: string): WidgetInstance[] {
    return this.widgetInstances.filter(w => w.widgetDefId === widgetDefId);
  }

  /**
   * Get widget instances sorted by z-index
   */
  getInstancesByZIndex(): WidgetInstance[] {
    return [...this.widgetInstances].sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Load widget instances from database (Supabase)
   * Returns loaded instances for mounting
   */
  async loadWidgetInstances(): Promise<WidgetInstance[]> {
    try {
      const instances = await loadWidgetInstances(this.canvasId, this.userId);

      // Add loaded instances to context
      instances.forEach((instance) => {
        if (!this.instanceMap.has(instance.id)) {
          this.widgetInstances.push(instance);
          this.instanceMap.set(instance.id, instance);
        }
      });

      console.log(`[RuntimeContext] Loaded ${instances.length} widget instances from database`);
      return instances;
    } catch (error) {
      console.error('[RuntimeContext] Failed to load widget instances:', error);
      return [];
    }
  }

  /**
   * Save all widget instances to database (Supabase)
   */
  async saveWidgetInstances(): Promise<void> {
    try {
      const result = await saveAllWidgetInstances(this.widgetInstances, this.userId);
      if (result.success) {
        console.log(`[RuntimeContext] Saved ${result.savedCount} widget instances to database`);
      } else {
        console.error('[RuntimeContext] Failed to save widget instances:', result.error);
      }
    } catch (error) {
      console.error('[RuntimeContext] Save exception:', error);
    }
  }

  /**
   * Save a single widget instance (debounced)
   */
  saveWidgetInstanceDebounced(instanceId: string): void {
    const instance = this.instanceMap.get(instanceId);
    if (instance) {
      saveWidgetInstance(instance, this.userId);
    }
  }

  /**
   * Save widget position (debounced)
   */
  saveWidgetPositionDebounced(instanceId: string, x: number, y: number): void {
    saveWidgetPosition(instanceId, x, y, this.userId);
  }

  /**
   * Save widget size (debounced)
   */
  saveWidgetSizeDebounced(instanceId: string, width: number, height: number): void {
    saveWidgetSize(instanceId, width, height, this.userId);
  }

  /**
   * Save widget rotation (debounced)
   */
  saveWidgetRotationDebounced(instanceId: string, rotation: number): void {
    saveWidgetRotation(instanceId, rotation, this.userId);
  }

  /**
   * Save widget z-index (debounced)
   */
  saveWidgetZIndexDebounced(instanceId: string, zIndex: number): void {
    saveWidgetZIndex(instanceId, zIndex, this.userId);
  }

  /**
   * Delete a widget instance from database
   */
  async deleteWidgetInstanceFromDb(instanceId: string): Promise<void> {
    await deleteWidgetInstance(instanceId);
  }

  /**
   * Flush all pending saves (call before navigation/unmount)
   */
  flushSaves(): void {
    flushPendingSaves();
  }

  /**
   * Destroy the context and cleanup all resources
   */
  destroy(): void {
    // Flush any pending saves before destroying
    this.flushSaves();

    // Clear all widget instances
    this.widgetInstances = [];
    this.instanceMap.clear();

    // Clear state store
    (this.stateStore as SimpleStateStore).clear();

    // Emit destroyed event
    this.eventBus.emit({
      type: 'context:destroyed',
      scope: 'canvas',
      payload: {
        canvasId: this.canvasId
      }
    });
  }
}
