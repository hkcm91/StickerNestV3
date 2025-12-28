/**
 * StickerNest v2 - Create/Delete Commands
 * Commands for adding and removing widgets, entities, and groups.
 */

import type { Command } from '../Command';
import { generateCommandId } from '../Command';
import type { WidgetInstance, WidgetGroup } from '../../../types/domain';

// ==================
// Widget Create Command
// ==================

export interface CreateWidgetData {
  widget: WidgetInstance;
}

/**
 * Create a command for adding a new widget
 */
export function createAddWidgetCommand(
  widget: WidgetInstance,
  addFn: (widget: WidgetInstance) => void,
  removeFn: (id: string) => void
): Command {
  const id = generateCommandId('add', widget.id);
  const timestamp = Date.now();

  return {
    id,
    name: 'Add Widget',
    timestamp,

    execute() {
      addFn(widget);
    },

    undo() {
      removeFn(widget.id);
    },

    // Add commands don't merge
    merge: undefined,
  };
}

/**
 * Create a command for adding multiple widgets
 */
export function createAddMultipleWidgetsCommand(
  widgets: WidgetInstance[],
  addFn: (widget: WidgetInstance) => void,
  removeFn: (id: string) => void
): Command {
  const id = generateCommandId('add', 'multi');
  const timestamp = Date.now();

  return {
    id,
    name: `Add ${widgets.length} Widgets`,
    timestamp,

    execute() {
      widgets.forEach(widget => addFn(widget));
    },

    undo() {
      // Remove in reverse order
      [...widgets].reverse().forEach(widget => removeFn(widget.id));
    },

    merge: undefined,
  };
}

// ==================
// Widget Delete Command
// ==================

export interface DeleteWidgetData {
  widget: WidgetInstance;
  index?: number;
}

/**
 * Create a command for deleting a widget
 */
export function createDeleteWidgetCommand(
  widget: WidgetInstance,
  addFn: (widget: WidgetInstance) => void,
  removeFn: (id: string) => void
): Command {
  const id = generateCommandId('delete', widget.id);
  const timestamp = Date.now();
  // Clone the widget to preserve its state
  const widgetSnapshot = { ...widget, state: { ...widget.state } };

  return {
    id,
    name: 'Delete Widget',
    timestamp,

    execute() {
      removeFn(widget.id);
    },

    undo() {
      addFn(widgetSnapshot);
    },

    merge: undefined,
  };
}

/**
 * Create a command for deleting multiple widgets
 */
export function createDeleteMultipleWidgetsCommand(
  widgets: WidgetInstance[],
  addFn: (widget: WidgetInstance) => void,
  removeFn: (id: string) => void
): Command {
  const id = generateCommandId('delete', 'multi');
  const timestamp = Date.now();
  // Clone all widgets to preserve state
  const widgetSnapshots = widgets.map(w => ({ ...w, state: { ...w.state } }));

  return {
    id,
    name: `Delete ${widgets.length} Widgets`,
    timestamp,

    execute() {
      widgets.forEach(widget => removeFn(widget.id));
    },

    undo() {
      // Re-add in original order
      widgetSnapshots.forEach(widget => addFn(widget));
    },

    merge: undefined,
  };
}

// ==================
// Duplicate Command
// ==================

/**
 * Create a command for duplicating widgets
 */
export function createDuplicateWidgetsCommand(
  originalIds: string[],
  newWidgets: WidgetInstance[],
  addFn: (widget: WidgetInstance) => void,
  removeFn: (id: string) => void
): Command {
  const id = generateCommandId('add', 'duplicate');
  const timestamp = Date.now();

  return {
    id,
    name: `Duplicate ${newWidgets.length} Widget${newWidgets.length > 1 ? 's' : ''}`,
    timestamp,

    execute() {
      newWidgets.forEach(widget => addFn(widget));
    },

    undo() {
      newWidgets.forEach(widget => removeFn(widget.id));
    },

    merge: undefined,
  };
}

// ==================
// Entity Create/Delete Commands
// ==================

export interface EntityData {
  id: string;
  type: 'vector' | 'text' | 'image' | 'object3d';
  data: any;
}

/**
 * Create a command for adding an entity
 */
export function createAddEntityCommand(
  entity: EntityData,
  addFn: (entity: EntityData) => void,
  removeFn: (id: string) => void
): Command {
  const id = generateCommandId('add', entity.id);
  const timestamp = Date.now();

  return {
    id,
    name: `Add ${entity.type}`,
    timestamp,

    execute() {
      addFn(entity);
    },

    undo() {
      removeFn(entity.id);
    },

    merge: undefined,
  };
}

/**
 * Create a command for deleting an entity
 */
export function createDeleteEntityCommand(
  entity: EntityData,
  addFn: (entity: EntityData) => void,
  removeFn: (id: string) => void
): Command {
  const id = generateCommandId('delete', entity.id);
  const timestamp = Date.now();
  const entitySnapshot = { ...entity, data: { ...entity.data } };

  return {
    id,
    name: `Delete ${entity.type}`,
    timestamp,

    execute() {
      removeFn(entity.id);
    },

    undo() {
      addFn(entitySnapshot);
    },

    merge: undefined,
  };
}

export default {
  createAddWidgetCommand,
  createAddMultipleWidgetsCommand,
  createDeleteWidgetCommand,
  createDeleteMultipleWidgetsCommand,
  createDuplicateWidgetsCommand,
  createAddEntityCommand,
  createDeleteEntityCommand,
};
