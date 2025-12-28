/**
 * StickerNest v2 - Resize Command
 * Command for resizing widgets, supports position changes during resize.
 */

import type { Command } from '../Command';
import { generateCommandId, canMergeByTiming } from '../Command';
import { useCanvasStore } from '../../../state/useCanvasStore';

export interface ResizeCommandData {
  widgetId: string;
  fromBounds: { x: number; y: number; width: number; height: number };
  toBounds: { x: number; y: number; width: number; height: number };
}

/**
 * Create a resize command for a widget
 */
export function createResizeCommand(
  widgetId: string,
  fromBounds: { x: number; y: number; width: number; height: number },
  toBounds: { x: number; y: number; width: number; height: number }
): Command {
  const id = generateCommandId('resize', widgetId);
  const timestamp = Date.now();

  return {
    id,
    name: 'Resize Widget',
    timestamp,

    execute() {
      useCanvasStore.getState().updateWidget(widgetId, {
        position: { x: toBounds.x, y: toBounds.y },
        width: toBounds.width,
        height: toBounds.height,
      });
    },

    undo() {
      useCanvasStore.getState().updateWidget(widgetId, {
        position: { x: fromBounds.x, y: fromBounds.y },
        width: fromBounds.width,
        height: fromBounds.height,
      });
    },

    merge(other: Command): Command | null {
      // Check if other is a resize command for the same widget within merge window
      if (!other.id.includes(`resize-${widgetId}`) || !canMergeByTiming(this, other)) {
        return null;
      }

      // Create merged command: from original bounds to current bounds
      const otherData = (other as any)._data as ResizeCommandData | undefined;
      if (!otherData) return null;

      return createResizeCommandWithData({
        widgetId,
        fromBounds: otherData.fromBounds,
        toBounds,
      });
    },

    // Store data for merging
    _data: { widgetId, fromBounds, toBounds } as ResizeCommandData,
  } as Command & { _data: ResizeCommandData };
}

/**
 * Create resize command from data object (used for merging)
 */
function createResizeCommandWithData(data: ResizeCommandData): Command {
  return createResizeCommand(data.widgetId, data.fromBounds, data.toBounds);
}

export default createResizeCommand;
