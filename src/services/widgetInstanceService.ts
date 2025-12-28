/**
 * StickerNest v2 - Widget Instance Service
 *
 * Service for persisting widget instances to Supabase database.
 * Handles CRUD operations, debounced saves, and local fallback.
 *
 * Features:
 * - Database persistence via Supabase
 * - Debounced save to prevent excessive writes
 * - Local storage fallback for offline/dev mode
 * - Batch operations for canvas-level saves
 */

import { supabaseClient, isLocalDevMode } from './supabaseClient';
import type { WidgetInstance } from '../types/domain';
import {
  setWidgetState,
  getWidgetState,
  getWidgetStateEntry,
  useWidgetStateStore,
} from '../state/useWidgetStateStore';

// ==================
// Types
// ==================

export interface WidgetInstanceRow {
  id: string;
  canvas_id: string;
  widget_def_id: string;
  user_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  scale_mode: string;
  state: Record<string, any>;
  mobile_layout: any;
  metadata: any;
  size_preset: string;
  version: string | null;
  name: string | null;
  group_id: string | null;
  parent_id: string | null;
  is_container: boolean;
  child_ids: string[] | null;
  content_width: number | null;
  content_height: number | null;
  flip_x: boolean;
  flip_y: boolean;
  aspect_locked: boolean;
  crop_top: number;
  crop_right: number;
  crop_bottom: number;
  crop_left: number;
  created_at: string;
  updated_at: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  savedCount?: number;
}

// ==================
// Debounce State
// ==================

const pendingSaves = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 500;

// ==================
// Conversion Functions
// ==================

/**
 * Convert WidgetInstance to database row format
 */
function instanceToRow(
  instance: WidgetInstance,
  userId: string
): Partial<WidgetInstanceRow> {
  return {
    id: instance.id,
    canvas_id: instance.canvasId,
    widget_def_id: instance.widgetDefId,
    user_id: userId,
    position_x: instance.position.x,
    position_y: instance.position.y,
    width: instance.width,
    height: instance.height,
    rotation: instance.rotation,
    z_index: instance.zIndex,
    visible: instance.visible ?? true,
    locked: instance.locked ?? false,
    opacity: instance.opacity ?? 1,
    scale_mode: instance.scaleMode ?? 'contain',
    state: instance.state || {},
    mobile_layout: instance.mobileLayout || null,
    metadata: instance.metadata || null,
    size_preset: instance.sizePreset,
    version: instance.version || null,
    name: instance.name || null,
    group_id: instance.groupId || null,
    parent_id: instance.parentId || null,
    is_container: instance.isContainer ?? false,
    child_ids: instance.childIds || null,
    content_width: instance.contentSize?.width || null,
    content_height: instance.contentSize?.height || null,
    flip_x: instance.flipX ?? false,
    flip_y: instance.flipY ?? false,
    aspect_locked: instance.aspectLocked ?? false,
    crop_top: instance.crop?.top ?? 0,
    crop_right: instance.crop?.right ?? 0,
    crop_bottom: instance.crop?.bottom ?? 0,
    crop_left: instance.crop?.left ?? 0,
  };
}

/**
 * Convert database row to WidgetInstance
 */
function rowToInstance(row: WidgetInstanceRow): WidgetInstance {
  const instance: WidgetInstance = {
    id: row.id,
    canvasId: row.canvas_id,
    widgetDefId: row.widget_def_id,
    position: { x: row.position_x, y: row.position_y },
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    zIndex: row.z_index,
    sizePreset: (row.size_preset || 'md') as any,
    state: row.state || {},
    visible: row.visible,
    locked: row.locked,
    opacity: row.opacity,
    scaleMode: row.scale_mode as any,
    version: row.version || undefined,
    name: row.name || undefined,
    groupId: row.group_id || undefined,
    parentId: row.parent_id || undefined,
    isContainer: row.is_container,
    childIds: row.child_ids || undefined,
    metadata: row.metadata || undefined,
    mobileLayout: row.mobile_layout || undefined,
    flipX: row.flip_x,
    flipY: row.flip_y,
    aspectLocked: row.aspect_locked,
  };

  // Add content size if present
  if (row.content_width && row.content_height) {
    instance.contentSize = {
      width: row.content_width,
      height: row.content_height,
    };
  }

  // Add crop if non-zero
  if (row.crop_top || row.crop_right || row.crop_bottom || row.crop_left) {
    instance.crop = {
      top: row.crop_top,
      right: row.crop_right,
      bottom: row.crop_bottom,
      left: row.crop_left,
    };
  }

  return instance;
}

// ==================
// Service Functions
// ==================

/**
 * Load all widget instances for a canvas
 */
export async function loadWidgetInstances(
  canvasId: string,
  userId: string
): Promise<WidgetInstance[]> {
  // Local dev mode: load from localStorage via widget state store
  if (isLocalDevMode || !supabaseClient) {
    console.log('[WidgetInstanceService] Local mode - loading from localStorage');
    const states = useWidgetStateStore.getState().getCanvasWidgetStates(canvasId);
    // In local mode, we don't have full instance data, just state
    // Return empty array - instances should be loaded separately
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from('widget_instances')
      .select('*')
      .eq('canvas_id', canvasId)
      .order('z_index', { ascending: true });

    if (error) {
      console.error('[WidgetInstanceService] Load error:', error);
      return [];
    }

    const instances = (data || []).map(rowToInstance);
    console.log(`[WidgetInstanceService] Loaded ${instances.length} instances for canvas ${canvasId}`);

    // Sync loaded state to local widget state store for runtime use
    instances.forEach((instance) => {
      if (instance.state && Object.keys(instance.state).length > 0) {
        setWidgetState(instance.id, instance.state, {
          canvasId: instance.canvasId,
          widgetDefId: instance.widgetDefId,
        });
      }
    });

    return instances;
  } catch (error) {
    console.error('[WidgetInstanceService] Load exception:', error);
    return [];
  }
}

/**
 * Save a single widget instance (debounced)
 */
export function saveWidgetInstance(
  instance: WidgetInstance,
  userId: string,
  immediate = false
): void {
  // Clear any pending save for this instance
  const existingTimeout = pendingSaves.get(instance.id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const doSave = async () => {
    pendingSaves.delete(instance.id);

    // Always save to local store
    if (instance.state && Object.keys(instance.state).length > 0) {
      setWidgetState(instance.id, instance.state, {
        canvasId: instance.canvasId,
        widgetDefId: instance.widgetDefId,
      });
    }

    // Local dev mode: only save to localStorage
    if (isLocalDevMode || !supabaseClient) {
      console.log(`[WidgetInstanceService] Local mode - saved ${instance.id} to localStorage`);
      return;
    }

    try {
      const row = instanceToRow(instance, userId);

      const { error } = await supabaseClient
        .from('widget_instances')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.error('[WidgetInstanceService] Save error:', error);
      } else {
        console.log(`[WidgetInstanceService] Saved instance ${instance.id}`);
      }
    } catch (error) {
      console.error('[WidgetInstanceService] Save exception:', error);
    }
  };

  if (immediate) {
    doSave();
  } else {
    // Debounce the save
    const timeout = setTimeout(doSave, DEBOUNCE_MS);
    pendingSaves.set(instance.id, timeout);
  }
}

/**
 * Save widget state only (for frequent updates like widget internal state)
 */
export function saveWidgetState(
  instanceId: string,
  state: Record<string, any>,
  canvasId: string,
  widgetDefId: string,
  userId: string
): void {
  // Clear any pending save for this instance
  const existingTimeout = pendingSaves.get(instanceId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const doSave = async () => {
    pendingSaves.delete(instanceId);

    // Always save to local store
    setWidgetState(instanceId, state, { canvasId, widgetDefId });

    // Local dev mode: only save to localStorage
    if (isLocalDevMode || !supabaseClient) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('widget_instances')
        .update({ state, updated_at: new Date().toISOString() })
        .eq('id', instanceId);

      if (error) {
        console.error('[WidgetInstanceService] State save error:', error);
      }
    } catch (error) {
      console.error('[WidgetInstanceService] State save exception:', error);
    }
  };

  // Debounce state saves
  const timeout = setTimeout(doSave, DEBOUNCE_MS);
  pendingSaves.set(instanceId, timeout);
}

/**
 * Save widget position (for drag operations)
 */
export function saveWidgetPosition(
  instanceId: string,
  x: number,
  y: number,
  userId: string
): void {
  // Clear any pending save
  const key = `${instanceId}:position`;
  const existingTimeout = pendingSaves.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const doSave = async () => {
    pendingSaves.delete(key);

    if (isLocalDevMode || !supabaseClient) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('widget_instances')
        .update({
          position_x: x,
          position_y: y,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instanceId);

      if (error) {
        console.error('[WidgetInstanceService] Position save error:', error);
      }
    } catch (error) {
      console.error('[WidgetInstanceService] Position save exception:', error);
    }
  };

  // Debounce position saves
  const timeout = setTimeout(doSave, DEBOUNCE_MS);
  pendingSaves.set(key, timeout);
}

/**
 * Save widget size (for resize operations)
 */
export function saveWidgetSize(
  instanceId: string,
  width: number,
  height: number,
  userId: string
): void {
  // Clear any pending save
  const key = `${instanceId}:size`;
  const existingTimeout = pendingSaves.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const doSave = async () => {
    pendingSaves.delete(key);

    if (isLocalDevMode || !supabaseClient) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('widget_instances')
        .update({
          width,
          height,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instanceId);

      if (error) {
        console.error('[WidgetInstanceService] Size save error:', error);
      }
    } catch (error) {
      console.error('[WidgetInstanceService] Size save exception:', error);
    }
  };

  // Debounce size saves
  const timeout = setTimeout(doSave, DEBOUNCE_MS);
  pendingSaves.set(key, timeout);
}

/**
 * Save widget rotation
 */
export function saveWidgetRotation(
  instanceId: string,
  rotation: number,
  userId: string
): void {
  const key = `${instanceId}:rotation`;
  const existingTimeout = pendingSaves.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const doSave = async () => {
    pendingSaves.delete(key);

    if (isLocalDevMode || !supabaseClient) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('widget_instances')
        .update({
          rotation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instanceId);

      if (error) {
        console.error('[WidgetInstanceService] Rotation save error:', error);
      }
    } catch (error) {
      console.error('[WidgetInstanceService] Rotation save exception:', error);
    }
  };

  const timeout = setTimeout(doSave, DEBOUNCE_MS);
  pendingSaves.set(key, timeout);
}

/**
 * Save widget z-index
 */
export function saveWidgetZIndex(
  instanceId: string,
  zIndex: number,
  userId: string
): void {
  const key = `${instanceId}:zindex`;
  const existingTimeout = pendingSaves.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const doSave = async () => {
    pendingSaves.delete(key);

    if (isLocalDevMode || !supabaseClient) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('widget_instances')
        .update({
          z_index: zIndex,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instanceId);

      if (error) {
        console.error('[WidgetInstanceService] Z-index save error:', error);
      }
    } catch (error) {
      console.error('[WidgetInstanceService] Z-index save exception:', error);
    }
  };

  const timeout = setTimeout(doSave, DEBOUNCE_MS);
  pendingSaves.set(key, timeout);
}

/**
 * Save all widget instances for a canvas (batch operation)
 */
export async function saveAllWidgetInstances(
  instances: WidgetInstance[],
  userId: string
): Promise<SaveResult> {
  // Flush any pending saves first
  pendingSaves.forEach((timeout) => clearTimeout(timeout));
  pendingSaves.clear();

  // Always save to local store
  instances.forEach((instance) => {
    if (instance.state && Object.keys(instance.state).length > 0) {
      setWidgetState(instance.id, instance.state, {
        canvasId: instance.canvasId,
        widgetDefId: instance.widgetDefId,
      });
    }
  });

  if (isLocalDevMode || !supabaseClient) {
    console.log(`[WidgetInstanceService] Local mode - saved ${instances.length} instances to localStorage`);
    return { success: true, savedCount: instances.length };
  }

  try {
    const rows = instances.map((i) => instanceToRow(i, userId));

    const { error } = await supabaseClient
      .from('widget_instances')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('[WidgetInstanceService] Batch save error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[WidgetInstanceService] Batch saved ${instances.length} instances`);
    return { success: true, savedCount: instances.length };
  } catch (error) {
    console.error('[WidgetInstanceService] Batch save exception:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a widget instance
 */
export async function deleteWidgetInstance(
  instanceId: string
): Promise<boolean> {
  // Remove from local store
  useWidgetStateStore.getState().removeWidgetState(instanceId);

  // Clear any pending saves
  pendingSaves.forEach((timeout, key) => {
    if (key.startsWith(instanceId)) {
      clearTimeout(timeout);
      pendingSaves.delete(key);
    }
  });

  if (isLocalDevMode || !supabaseClient) {
    return true;
  }

  try {
    const { error } = await supabaseClient
      .from('widget_instances')
      .delete()
      .eq('id', instanceId);

    if (error) {
      console.error('[WidgetInstanceService] Delete error:', error);
      return false;
    }

    console.log(`[WidgetInstanceService] Deleted instance ${instanceId}`);
    return true;
  } catch (error) {
    console.error('[WidgetInstanceService] Delete exception:', error);
    return false;
  }
}

/**
 * Delete all widget instances for a canvas
 */
export async function deleteCanvasWidgetInstances(
  canvasId: string
): Promise<boolean> {
  // Remove from local store
  useWidgetStateStore.getState().removeCanvasWidgetStates(canvasId);

  if (isLocalDevMode || !supabaseClient) {
    return true;
  }

  try {
    const { error } = await supabaseClient
      .from('widget_instances')
      .delete()
      .eq('canvas_id', canvasId);

    if (error) {
      console.error('[WidgetInstanceService] Canvas delete error:', error);
      return false;
    }

    console.log(`[WidgetInstanceService] Deleted all instances for canvas ${canvasId}`);
    return true;
  } catch (error) {
    console.error('[WidgetInstanceService] Canvas delete exception:', error);
    return false;
  }
}

/**
 * Flush all pending saves (call on unmount/navigation)
 */
export function flushPendingSaves(): void {
  pendingSaves.forEach((timeout) => clearTimeout(timeout));
  pendingSaves.clear();
  console.log('[WidgetInstanceService] Flushed pending saves');
}
