/**
 * StickerNest v2 - Command Tests
 * Unit tests for undo/redo command implementations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMoveCommand,
  createMultiMoveCommand,
} from '../commands/MoveCommand';
import {
  createPropertyCommand,
  createRotateCommand,
  createOpacityCommand,
  createVisibilityCommand,
  createLockCommand,
  createZIndexCommand,
} from '../commands/PropertyCommand';
import {
  createAddWidgetCommand,
  createDeleteWidgetCommand,
  createDuplicateWidgetsCommand,
} from '../commands/CreateDeleteCommand';
import {
  createAddLayerCommand,
  createDeleteLayerCommand,
  createReorderLayersCommand,
  createToggleLayerVisibilityCommand,
} from '../commands/LayerCommand';
import {
  createGroupCommand,
  createUngroupCommand,
  createAddToGroupCommand,
} from '../commands/GroupCommand';
import type { WidgetInstance, CanvasLayer, WidgetGroup } from '../../../types/domain';

// ==================
// Mock Setup
// ==================

// Mock canvas store
vi.mock('../../../state/useCanvasStore', () => ({
  useCanvasStore: {
    getState: vi.fn(() => ({
      updateWidget: vi.fn(),
      addWidget: vi.fn(),
      removeWidget: vi.fn(),
    })),
  },
}));

// ==================
// Test Utilities
// ==================

const createMockWidget = (overrides: Partial<WidgetInstance> = {}): WidgetInstance => ({
  id: `widget-${Math.random().toString(36).substr(2, 9)}`,
  canvasId: 'canvas-1',
  widgetDefId: 'test-widget',
  position: { x: 100, y: 100 },
  width: 200,
  height: 150,
  rotation: 0,
  zIndex: 1,
  sizePreset: 'md',
  state: {},
  ...overrides,
});

const createMockLayer = (overrides: Partial<CanvasLayer> = {}): CanvasLayer => ({
  id: `layer-${Math.random().toString(36).substr(2, 9)}`,
  canvasId: 'canvas-1',
  name: 'Test Layer',
  order: 0,
  visible: true,
  locked: false,
  opacity: 1,
  ...overrides,
});

const createMockGroup = (overrides: Partial<WidgetGroup> = {}): WidgetGroup => ({
  id: `group-${Math.random().toString(36).substr(2, 9)}`,
  canvasId: 'canvas-1',
  name: 'Test Group',
  widgetIds: [],
  zIndex: 1,
  ...overrides,
});

// ==================
// Move Command Tests
// ==================

describe('MoveCommand', () => {
  it('should create a move command with correct properties', () => {
    const cmd = createMoveCommand(
      'widget-1',
      { x: 0, y: 0 },
      { x: 100, y: 100 }
    );

    expect(cmd.id).toContain('move');
    expect(cmd.name).toBe('Move Widget');
    expect(cmd.timestamp).toBeLessThanOrEqual(Date.now());
    expect(typeof cmd.execute).toBe('function');
    expect(typeof cmd.undo).toBe('function');
    expect(typeof cmd.merge).toBe('function');
  });

  it('should support merging consecutive moves', () => {
    const cmd1 = createMoveCommand('widget-1', { x: 0, y: 0 }, { x: 50, y: 50 });
    const cmd2 = createMoveCommand('widget-1', { x: 50, y: 50 }, { x: 100, y: 100 });

    // Commands should be mergeable if within time window
    expect(cmd2.merge).toBeDefined();
  });

  it('should create multi-move command for multiple widgets', () => {
    const cmd = createMultiMoveCommand([
      { widgetId: 'widget-1', fromPosition: { x: 0, y: 0 }, toPosition: { x: 100, y: 100 } },
      { widgetId: 'widget-2', fromPosition: { x: 50, y: 50 }, toPosition: { x: 150, y: 150 } },
    ]);

    expect(cmd.name).toBe('Move 2 Widgets');
    expect(cmd.merge).toBeUndefined(); // Multi-move doesn't merge
  });
});

// ==================
// Property Command Tests
// ==================

describe('PropertyCommand', () => {
  it('should create rotation command', () => {
    const cmd = createRotateCommand('widget-1', 0, 45);
    expect(cmd.name).toBe('Rotate Widget');
  });

  it('should create opacity command', () => {
    const cmd = createOpacityCommand('widget-1', 1, 0.5);
    expect(cmd.name).toBe('Change Opacity');
  });

  it('should create visibility command', () => {
    const showCmd = createVisibilityCommand('widget-1', false, true);
    expect(showCmd.name).toBe('Show Widget');

    const hideCmd = createVisibilityCommand('widget-1', true, false);
    expect(hideCmd.name).toBe('Hide Widget');
  });

  it('should create lock command', () => {
    const lockCmd = createLockCommand('widget-1', false, true);
    expect(lockCmd.name).toBe('Lock Widget');

    const unlockCmd = createLockCommand('widget-1', true, false);
    expect(unlockCmd.name).toBe('Unlock Widget');
  });

  it('should create z-index command', () => {
    const cmd = createZIndexCommand('widget-1', 1, 10);
    expect(cmd.name).toBe('Change Z-Index');
  });
});

// ==================
// Create/Delete Command Tests
// ==================

describe('CreateDeleteCommand', () => {
  let addFn: (widget: WidgetInstance) => void;
  let removeFn: (id: string) => void;

  beforeEach(() => {
    addFn = vi.fn() as unknown as (widget: WidgetInstance) => void;
    removeFn = vi.fn() as unknown as (id: string) => void;
  });

  it('should create add widget command', () => {
    const widget = createMockWidget();
    const cmd = createAddWidgetCommand(widget, addFn, removeFn);

    expect(cmd.name).toBe('Add Widget');

    cmd.execute();
    expect(addFn).toHaveBeenCalledWith(widget);

    cmd.undo();
    expect(removeFn).toHaveBeenCalledWith(widget.id);
  });

  it('should create delete widget command', () => {
    const widget = createMockWidget();
    const cmd = createDeleteWidgetCommand(widget, addFn, removeFn);

    expect(cmd.name).toBe('Delete Widget');

    cmd.execute();
    expect(removeFn).toHaveBeenCalledWith(widget.id);

    cmd.undo();
    expect(addFn).toHaveBeenCalled();
  });

  it('should create duplicate widgets command', () => {
    const original = createMockWidget({ id: 'original' });
    const duplicate = createMockWidget({ id: 'duplicate' });

    const cmd = createDuplicateWidgetsCommand(
      [original.id],
      [duplicate],
      addFn,
      removeFn
    );

    expect(cmd.name).toBe('Duplicate 1 Widget');

    cmd.execute();
    expect(addFn).toHaveBeenCalledWith(duplicate);

    cmd.undo();
    expect(removeFn).toHaveBeenCalledWith(duplicate.id);
  });
});

// ==================
// Layer Command Tests
// ==================

describe('LayerCommand', () => {
  let createFn: (canvasId: string, name?: string) => CanvasLayer;
  let deleteFn: (canvasId: string, layerId: string) => void;
  let updateFn: (canvasId: string, layerId: string, updates: Partial<CanvasLayer>) => void;
  let reorderFn: (canvasId: string, layerIds: string[]) => void;
  let toggleVisibilityFn: (canvasId: string, layerId: string) => void;
  let moveWidgetsFn: (widgetIds: string[], layerId: string) => void;

  beforeEach(() => {
    createFn = vi.fn().mockImplementation((canvasId, name) => createMockLayer({ name })) as unknown as typeof createFn;
    deleteFn = vi.fn() as unknown as typeof deleteFn;
    updateFn = vi.fn() as unknown as typeof updateFn;
    reorderFn = vi.fn() as unknown as typeof reorderFn;
    toggleVisibilityFn = vi.fn() as unknown as typeof toggleVisibilityFn;
    moveWidgetsFn = vi.fn() as unknown as typeof moveWidgetsFn;
  });

  it('should create add layer command', () => {
    const layer = createMockLayer({ name: 'New Layer' });
    const cmd = createAddLayerCommand(
      'canvas-1',
      layer,
      createFn,
      deleteFn,
      updateFn
    );

    expect(cmd.name).toBe('Add Layer');
  });

  it('should create delete layer command', () => {
    const layer = createMockLayer();
    const cmd = createDeleteLayerCommand(
      'canvas-1',
      layer,
      ['widget-1', 'widget-2'],
      createFn,
      deleteFn,
      moveWidgetsFn
    );

    expect(cmd.name).toBe('Delete Layer');

    cmd.execute();
    expect(deleteFn).toHaveBeenCalledWith('canvas-1', layer.id);
  });

  it('should create reorder layers command', () => {
    const fromOrder = ['layer-1', 'layer-2', 'layer-3'];
    const toOrder = ['layer-2', 'layer-1', 'layer-3'];

    const cmd = createReorderLayersCommand(
      'canvas-1',
      fromOrder,
      toOrder,
      reorderFn
    );

    expect(cmd.name).toBe('Reorder Layers');

    cmd.execute();
    expect(reorderFn).toHaveBeenCalledWith('canvas-1', toOrder);

    cmd.undo();
    expect(reorderFn).toHaveBeenCalledWith('canvas-1', fromOrder);
  });

  it('should create toggle visibility command', () => {
    const showCmd = createToggleLayerVisibilityCommand(
      'canvas-1',
      'layer-1',
      false,
      toggleVisibilityFn
    );
    expect(showCmd.name).toBe('Show Layer');

    const hideCmd = createToggleLayerVisibilityCommand(
      'canvas-1',
      'layer-1',
      true,
      toggleVisibilityFn
    );
    expect(hideCmd.name).toBe('Hide Layer');
  });
});

// ==================
// Group Command Tests
// ==================

describe('GroupCommand', () => {
  let createGroupFn: any;
  let deleteGroupFn: any;
  let updateWidgetFn: any;
  let updateGroupFn: any;
  let getWidgetFn: any;
  let addToGroupFn: any;
  let removeFromGroupFn: any;

  beforeEach(() => {
    createGroupFn = vi.fn().mockImplementation((canvasId: string, refs: any[], name: string) =>
      createMockGroup({ name, widgetIds: refs.map((r: { id: string }) => r.id) })
    );
    deleteGroupFn = vi.fn();
    updateWidgetFn = vi.fn();
    updateGroupFn = vi.fn();
    getWidgetFn = vi.fn().mockImplementation((id: string) => createMockWidget({ id }));
    addToGroupFn = vi.fn();
    removeFromGroupFn = vi.fn();
  });

  it('should create group command', () => {
    const cmd = createGroupCommand(
      'canvas-1',
      ['widget-1', 'widget-2'],
      'New Group',
      createGroupFn,
      deleteGroupFn,
      updateWidgetFn,
      getWidgetFn
    );

    expect(cmd.name).toBe('Group 2 Items');

    cmd.execute();
    expect(createGroupFn).toHaveBeenCalled();
    expect(updateWidgetFn).toHaveBeenCalledTimes(2);
  });

  it('should create ungroup command', () => {
    const group = createMockGroup({
      widgetIds: ['widget-1', 'widget-2'],
    });

    const cmd = createUngroupCommand(
      'canvas-1',
      group,
      deleteGroupFn,
      createGroupFn,
      updateWidgetFn,
      updateGroupFn
    );

    expect(cmd.name).toBe('Ungroup');

    cmd.execute();
    expect(deleteGroupFn).toHaveBeenCalledWith('canvas-1', group.id);
    // Widgets should have their groupId cleared
    expect(updateWidgetFn).toHaveBeenCalledWith('widget-1', { groupId: undefined });
    expect(updateWidgetFn).toHaveBeenCalledWith('widget-2', { groupId: undefined });
  });

  it('should create add to group command', () => {
    const cmd = createAddToGroupCommand(
      'canvas-1',
      'group-1',
      ['widget-3'],
      addToGroupFn,
      removeFromGroupFn,
      updateWidgetFn,
      getWidgetFn
    );

    expect(cmd.name).toBe('Add 1 to Group');

    cmd.execute();
    expect(addToGroupFn).toHaveBeenCalled();
    expect(updateWidgetFn).toHaveBeenCalledWith('widget-3', { groupId: 'group-1' });
  });
});

// ==================
// Command ID Generation Tests
// ==================

describe('Command ID Generation', () => {
  it('should generate unique command IDs', () => {
    const cmd1 = createMoveCommand('widget-1', { x: 0, y: 0 }, { x: 10, y: 10 });
    const cmd2 = createMoveCommand('widget-1', { x: 10, y: 10 }, { x: 20, y: 20 });

    expect(cmd1.id).not.toBe(cmd2.id);
  });

  it('should include command type in ID', () => {
    const moveCmd = createMoveCommand('widget-1', { x: 0, y: 0 }, { x: 10, y: 10 });
    expect(moveCmd.id).toContain('move');

    const rotateCmd = createRotateCommand('widget-1', 0, 45);
    expect(rotateCmd.id).toContain('property');
  });
});

// ==================
// Timestamp Tests
// ==================

describe('Command Timestamps', () => {
  it('should have valid timestamps', () => {
    const before = Date.now();
    const cmd = createMoveCommand('widget-1', { x: 0, y: 0 }, { x: 10, y: 10 });
    const after = Date.now();

    expect(cmd.timestamp).toBeGreaterThanOrEqual(before);
    expect(cmd.timestamp).toBeLessThanOrEqual(after);
  });
});
