/**
 * StickerNest v2 - Move Command
 * Command for moving widgets, supports merging rapid movements.
 */

import type { Command } from '../Command';
import { generateCommandId, canMergeByTiming } from '../Command';
import { useCanvasStore } from '../../../state/useCanvasStore';

export interface MoveCommandData {
  widgetId: string;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
}

/**
 * Create a move command for a single widget
 */
export function createMoveCommand(
  widgetId: string,
  fromPosition: { x: number; y: number },
  toPosition: { x: number; y: number }
): Command {
  const id = generateCommandId('move', widgetId);
  const timestamp = Date.now();

  return {
    id,
    name: 'Move Widget',
    timestamp,

    execute() {
      useCanvasStore.getState().updateWidget(widgetId, {
        position: { ...toPosition }
      });
    },

    undo() {
      useCanvasStore.getState().updateWidget(widgetId, {
        position: { ...fromPosition }
      });
    },

    merge(other: Command): Command | null {
      // Check if other is a move command for the same widget within merge window
      if (!other.id.includes(`move-${widgetId}`) || !canMergeByTiming(this, other)) {
        return null;
      }

      // Create merged command: from original start to current end
      const otherData = (other as any)._data as MoveCommandData | undefined;
      if (!otherData) return null;

      return createMoveCommandWithData({
        widgetId,
        fromPosition: otherData.fromPosition,
        toPosition,
      });
    },

    // Store data for merging
    _data: { widgetId, fromPosition, toPosition } as MoveCommandData,
  } as Command & { _data: MoveCommandData };
}

/**
 * Create move command from data object (used for merging)
 */
function createMoveCommandWithData(data: MoveCommandData): Command {
  return createMoveCommand(data.widgetId, data.fromPosition, data.toPosition);
}

/**
 * Create a move command for multiple widgets
 */
export function createMultiMoveCommand(
  moves: Array<{
    widgetId: string;
    fromPosition: { x: number; y: number };
    toPosition: { x: number; y: number };
  }>
): Command {
  const id = generateCommandId('move', 'multi');
  const timestamp = Date.now();

  return {
    id,
    name: `Move ${moves.length} Widgets`,
    timestamp,

    execute() {
      const store = useCanvasStore.getState();
      moves.forEach(({ widgetId, toPosition }) => {
        store.updateWidget(widgetId, { position: { ...toPosition } });
      });
    },

    undo() {
      const store = useCanvasStore.getState();
      moves.forEach(({ widgetId, fromPosition }) => {
        store.updateWidget(widgetId, { position: { ...fromPosition } });
      });
    },

    // Multi-move commands don't merge
    merge: undefined,
  };
}

export default createMoveCommand;
