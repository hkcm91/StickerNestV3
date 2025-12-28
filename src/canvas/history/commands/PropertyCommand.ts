/**
 * StickerNest v2 - Property Command
 * Generic command for changing widget properties (rotation, opacity, etc.)
 */

import type { Command } from '../Command';
import { generateCommandId } from '../Command';
import { useCanvasStore } from '../../../state/useCanvasStore';
import type { WidgetInstance } from '../../../types/domain';

/**
 * Create a property change command
 */
export function createPropertyCommand(
  widgetId: string,
  propertyName: string,
  fromValue: unknown,
  toValue: unknown,
  displayName?: string
): Command {
  const id = generateCommandId('property', widgetId);
  const timestamp = Date.now();
  const name = displayName || `Change ${propertyName}`;

  return {
    id,
    name,
    timestamp,

    execute() {
      useCanvasStore.getState().updateWidget(widgetId, {
        [propertyName]: toValue,
      } as Partial<WidgetInstance>);
    },

    undo() {
      useCanvasStore.getState().updateWidget(widgetId, {
        [propertyName]: fromValue,
      } as Partial<WidgetInstance>);
    },

    // Property commands don't merge by default
    merge: undefined,
  };
}

/**
 * Create a rotation command
 */
export function createRotateCommand(
  widgetId: string,
  fromRotation: number,
  toRotation: number
): Command {
  return createPropertyCommand(widgetId, 'rotation', fromRotation, toRotation, 'Rotate Widget');
}

/**
 * Create an opacity command
 */
export function createOpacityCommand(
  widgetId: string,
  fromOpacity: number,
  toOpacity: number
): Command {
  return createPropertyCommand(widgetId, 'opacity', fromOpacity, toOpacity, 'Change Opacity');
}

/**
 * Create a visibility command
 */
export function createVisibilityCommand(
  widgetId: string,
  fromVisible: boolean,
  toVisible: boolean
): Command {
  return createPropertyCommand(
    widgetId,
    'visible',
    fromVisible,
    toVisible,
    toVisible ? 'Show Widget' : 'Hide Widget'
  );
}

/**
 * Create a lock command
 */
export function createLockCommand(
  widgetId: string,
  fromLocked: boolean,
  toLocked: boolean
): Command {
  return createPropertyCommand(
    widgetId,
    'locked',
    fromLocked,
    toLocked,
    toLocked ? 'Lock Widget' : 'Unlock Widget'
  );
}

/**
 * Create a z-index command
 */
export function createZIndexCommand(
  widgetId: string,
  fromZIndex: number,
  toZIndex: number
): Command {
  return createPropertyCommand(widgetId, 'zIndex', fromZIndex, toZIndex, 'Change Z-Index');
}

export interface PropertyCommandData {
  widgetId: string;
  propertyName: string;
  fromValue: unknown;
  toValue: unknown;
}

/**
 * Create a multi-property change command
 */
export function createMultiPropertyCommand(
  widgetId: string,
  fromValues: Partial<WidgetInstance>,
  toValues: Partial<WidgetInstance>,
  displayName: string = 'Change Properties'
): Command {
  const id = generateCommandId('property', widgetId);
  const timestamp = Date.now();

  return {
    id,
    name: displayName,
    timestamp,

    execute() {
      useCanvasStore.getState().updateWidget(widgetId, toValues);
    },

    undo() {
      useCanvasStore.getState().updateWidget(widgetId, fromValues);
    },

    merge: undefined,
  };
}

export default createPropertyCommand;
