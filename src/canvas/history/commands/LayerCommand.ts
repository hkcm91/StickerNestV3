/**
 * StickerNest v2 - Layer Commands
 * Commands for layer operations including create, delete, reorder, and property changes.
 */

import type { Command } from '../Command';
import { generateCommandId } from '../Command';
import type { CanvasLayer } from '../../../types/domain';

// ==================
// Types
// ==================

export type LayerCommandType =
  | 'layer:create'
  | 'layer:delete'
  | 'layer:reorder'
  | 'layer:update'
  | 'layer:merge'
  | 'layer:visibility'
  | 'layer:lock';

// ==================
// Create Layer Command
// ==================

/**
 * Create a command for adding a new layer
 */
export function createAddLayerCommand(
  canvasId: string,
  layer: CanvasLayer,
  addFn: (canvasId: string, name?: string) => CanvasLayer,
  deleteFn: (canvasId: string, layerId: string) => void,
  updateFn?: (canvasId: string, layerId: string, updates: Partial<CanvasLayer>) => void
): Command {
  const id = generateCommandId('add', layer.id);
  const timestamp = Date.now();
  const layerSnapshot = { ...layer };

  return {
    id,
    name: 'Add Layer',
    timestamp,

    execute() {
      // Create the layer
      const newLayer = addFn(canvasId, layer.name);
      // Update with full snapshot properties if updateFn provided
      if (updateFn && newLayer.id !== layer.id) {
        updateFn(canvasId, newLayer.id, layerSnapshot);
      }
    },

    undo() {
      deleteFn(canvasId, layer.id);
    },

    merge: undefined,
  };
}

// ==================
// Delete Layer Command
// ==================

/**
 * Create a command for deleting a layer
 */
export function createDeleteLayerCommand(
  canvasId: string,
  layer: CanvasLayer,
  /** Widget IDs that were on this layer */
  widgetIds: string[],
  createFn: (canvasId: string, name?: string) => CanvasLayer,
  deleteFn: (canvasId: string, layerId: string) => void,
  moveWidgetsToLayerFn: (widgetIds: string[], layerId: string) => void
): Command {
  const id = generateCommandId('delete', layer.id);
  const timestamp = Date.now();
  const layerSnapshot = { ...layer };

  return {
    id,
    name: 'Delete Layer',
    timestamp,

    execute() {
      deleteFn(canvasId, layer.id);
    },

    undo() {
      // Recreate the layer
      const newLayer = createFn(canvasId, layerSnapshot.name);
      // Move widgets back to the layer
      if (widgetIds.length > 0) {
        moveWidgetsToLayerFn(widgetIds, newLayer.id);
      }
    },

    merge: undefined,
  };
}

// ==================
// Reorder Layers Command
// ==================

/**
 * Create a command for reordering layers
 */
export function createReorderLayersCommand(
  canvasId: string,
  fromOrder: string[],
  toOrder: string[],
  reorderFn: (canvasId: string, layerIds: string[]) => void
): Command {
  const id = generateCommandId('property', 'layer-reorder');
  const timestamp = Date.now();

  return {
    id,
    name: 'Reorder Layers',
    timestamp,

    execute() {
      reorderFn(canvasId, toOrder);
    },

    undo() {
      reorderFn(canvasId, fromOrder);
    },

    merge: undefined,
  };
}

// ==================
// Update Layer Command
// ==================

/**
 * Create a command for updating layer properties
 */
export function createUpdateLayerCommand(
  canvasId: string,
  layerId: string,
  fromState: Partial<CanvasLayer>,
  toState: Partial<CanvasLayer>,
  updateFn: (canvasId: string, layerId: string, updates: Partial<CanvasLayer>) => void,
  propertyName?: string
): Command {
  const id = generateCommandId('property', layerId);
  const timestamp = Date.now();
  const name = propertyName || 'Update Layer';

  return {
    id,
    name,
    timestamp,

    execute() {
      updateFn(canvasId, layerId, toState);
    },

    undo() {
      updateFn(canvasId, layerId, fromState);
    },

    merge: undefined,
  };
}

// ==================
// Toggle Layer Visibility Command
// ==================

/**
 * Create a command for toggling layer visibility
 */
export function createToggleLayerVisibilityCommand(
  canvasId: string,
  layerId: string,
  wasVisible: boolean,
  toggleFn: (canvasId: string, layerId: string) => void
): Command {
  const id = generateCommandId('property', layerId);
  const timestamp = Date.now();

  return {
    id,
    name: wasVisible ? 'Hide Layer' : 'Show Layer',
    timestamp,

    execute() {
      toggleFn(canvasId, layerId);
    },

    undo() {
      toggleFn(canvasId, layerId);
    },

    merge: undefined,
  };
}

// ==================
// Toggle Layer Lock Command
// ==================

/**
 * Create a command for toggling layer lock
 */
export function createToggleLayerLockCommand(
  canvasId: string,
  layerId: string,
  wasLocked: boolean,
  toggleFn: (canvasId: string, layerId: string) => void
): Command {
  const id = generateCommandId('property', layerId);
  const timestamp = Date.now();

  return {
    id,
    name: wasLocked ? 'Unlock Layer' : 'Lock Layer',
    timestamp,

    execute() {
      toggleFn(canvasId, layerId);
    },

    undo() {
      toggleFn(canvasId, layerId);
    },

    merge: undefined,
  };
}

// ==================
// Merge Layers Command
// ==================

export interface MergeLayersData {
  sourceLayerIds: string[];
  sourceLayers: CanvasLayer[];
  targetLayer: CanvasLayer;
  widgetMoves: Array<{ widgetId: string; fromLayerId: string; toLayerId: string }>;
}

/**
 * Create a command for merging multiple layers
 */
export function createMergeLayersCommand(
  canvasId: string,
  data: MergeLayersData,
  createFn: (canvasId: string, name?: string) => CanvasLayer,
  deleteFn: (canvasId: string, layerId: string) => void,
  moveWidgetToLayerFn: (widgetId: string, layerId: string) => void
): Command {
  const id = generateCommandId('batch', 'merge-layers');
  const timestamp = Date.now();

  return {
    id,
    name: `Merge ${data.sourceLayerIds.length} Layers`,
    timestamp,

    execute() {
      // Move all widgets to target layer
      data.widgetMoves.forEach(move => {
        moveWidgetToLayerFn(move.widgetId, data.targetLayer.id);
      });
      // Delete source layers
      data.sourceLayerIds.forEach(layerId => {
        if (layerId !== data.targetLayer.id) {
          deleteFn(canvasId, layerId);
        }
      });
    },

    undo() {
      // Recreate deleted layers
      data.sourceLayers.forEach(layer => {
        if (layer.id !== data.targetLayer.id) {
          createFn(canvasId, layer.name);
        }
      });
      // Move widgets back to original layers
      data.widgetMoves.forEach(move => {
        moveWidgetToLayerFn(move.widgetId, move.fromLayerId);
      });
    },

    merge: undefined,
  };
}

// ==================
// Move Widget to Layer Command
// ==================

/**
 * Create a command for moving a widget to a different layer
 */
export function createMoveWidgetToLayerCommand(
  widgetId: string,
  fromLayerId: string | undefined,
  toLayerId: string,
  moveWidgetFn: (widgetId: string, layerId: string) => void
): Command {
  const id = generateCommandId('property', widgetId);
  const timestamp = Date.now();

  return {
    id,
    name: 'Move to Layer',
    timestamp,

    execute() {
      moveWidgetFn(widgetId, toLayerId);
    },

    undo() {
      if (fromLayerId) {
        moveWidgetFn(widgetId, fromLayerId);
      }
    },

    merge: undefined,
  };
}

// ==================
// Layer Opacity Command
// ==================

/**
 * Create a command for changing layer opacity
 */
export function createLayerOpacityCommand(
  canvasId: string,
  layerId: string,
  fromOpacity: number,
  toOpacity: number,
  updateFn: (canvasId: string, layerId: string, updates: Partial<CanvasLayer>) => void
): Command {
  const id = generateCommandId('property', layerId);
  const timestamp = Date.now();

  return {
    id,
    name: 'Change Layer Opacity',
    timestamp,

    execute() {
      updateFn(canvasId, layerId, { opacity: toOpacity });
    },

    undo() {
      updateFn(canvasId, layerId, { opacity: fromOpacity });
    },

    merge(other: Command): Command | null {
      // Merge consecutive opacity changes for the same layer
      if (!other.id.includes(`property-${layerId}`)) {
        return null;
      }
      // Check timing
      if (Math.abs(this.timestamp - other.timestamp) > 500) {
        return null;
      }
      // Create merged command with original from value and new to value
      const otherData = (other as any)._data;
      if (!otherData?.fromOpacity) return null;

      return createLayerOpacityCommand(
        canvasId,
        layerId,
        otherData.fromOpacity,
        toOpacity,
        updateFn
      );
    },

    _data: { fromOpacity, toOpacity },
  } as Command & { _data: { fromOpacity: number; toOpacity: number } };
}

// ==================
// Rename Layer Command
// ==================

/**
 * Create a command for renaming a layer
 */
export function createRenameLayerCommand(
  canvasId: string,
  layerId: string,
  fromName: string,
  toName: string,
  updateFn: (canvasId: string, layerId: string, updates: Partial<CanvasLayer>) => void
): Command {
  const id = generateCommandId('property', layerId);
  const timestamp = Date.now();

  return {
    id,
    name: 'Rename Layer',
    timestamp,

    execute() {
      updateFn(canvasId, layerId, { name: toName });
    },

    undo() {
      updateFn(canvasId, layerId, { name: fromName });
    },

    merge: undefined,
  };
}

export default {
  createAddLayerCommand,
  createDeleteLayerCommand,
  createReorderLayersCommand,
  createUpdateLayerCommand,
  createToggleLayerVisibilityCommand,
  createToggleLayerLockCommand,
  createMergeLayersCommand,
  createMoveWidgetToLayerCommand,
  createLayerOpacityCommand,
  createRenameLayerCommand,
};
