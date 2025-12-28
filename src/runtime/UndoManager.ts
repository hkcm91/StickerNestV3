/**
 * StickerNest v2 - Undo Manager
 * Snapshot-based undo/redo system using command pattern
 */

// ==================
// Types
// ==================

export interface UndoableCommand {
  /** Command type identifier */
  type: string;
  /** Human-readable description */
  description: string;
  /** Timestamp when command was executed */
  timestamp: number;
  /** State before the command (for undo) */
  previousState: unknown;
  /** State after the command (for redo) */
  nextState: unknown;
  /** Widget IDs affected by this command */
  affectedWidgetIds?: string[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface Snapshot {
  /** Snapshot ID */
  id: string;
  /** Snapshot name */
  name: string;
  /** When snapshot was taken */
  createdAt: number;
  /** Full canvas state */
  state: CanvasSnapshot;
  /** Description */
  description?: string;
}

export interface WidgetSnapshotData {
  id: string;
  widgetDefId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config?: Record<string, unknown>;
  /** Parent widget ID (for nested widgets) */
  parentId?: string;
  /** Nested children widget IDs */
  children?: string[];
  /** Z-index within parent container */
  localZIndex?: number;
  /** Is this widget locked */
  locked?: boolean;
  /** Is this widget hidden */
  hidden?: boolean;
}

export interface CanvasSnapshot {
  /** Widget instances */
  widgets: WidgetSnapshotData[];
  /** Pipeline connections */
  pipelines: Array<{
    id: string;
    from: { widgetId: string; port: string };
    to: { widgetId: string; port: string };
  }>;
  /** Canvas settings */
  settings: {
    zoom: number;
    panX: number;
    panY: number;
  };
  /** Nested widget hierarchy (for quick traversal) */
  hierarchy?: WidgetHierarchy;
}

export interface WidgetHierarchy {
  /** Root-level widget IDs (no parent) */
  roots: string[];
  /** Map of parent ID to child IDs */
  children: Record<string, string[]>;
  /** Map of child ID to parent ID */
  parents: Record<string, string>;
}

export interface UndoManagerOptions {
  /** Maximum undo stack size */
  maxHistory?: number;
  /** Maximum snapshot count */
  maxSnapshots?: number;
  /** Callback when state changes */
  onStateChange?: (canUndo: boolean, canRedo: boolean) => void;
}

// ==================
// Undo Manager
// ==================

export class UndoManager {
  private undoStack: UndoableCommand[] = [];
  private redoStack: UndoableCommand[] = [];
  private snapshots: Map<string, Snapshot> = new Map();
  private options: Required<UndoManagerOptions>;
  private isExecuting = false;

  constructor(options: UndoManagerOptions = {}) {
    this.options = {
      maxHistory: options.maxHistory ?? 50,
      maxSnapshots: options.maxSnapshots ?? 10,
      onStateChange: options.onStateChange ?? (() => {}),
    };
  }

  /**
   * Push a new command to the undo stack
   */
  push(command: Omit<UndoableCommand, 'timestamp'>): void {
    if (this.isExecuting) return;

    const fullCommand: UndoableCommand = {
      ...command,
      timestamp: Date.now(),
    };

    this.undoStack.push(fullCommand);

    // Clear redo stack on new action
    this.redoStack = [];

    // Trim if over limit
    if (this.undoStack.length > this.options.maxHistory) {
      this.undoStack.shift();
    }

    this.notifyStateChange();
  }

  /**
   * Undo the last command
   */
  undo(): UndoableCommand | null {
    if (!this.canUndo()) return null;

    this.isExecuting = true;

    const command = this.undoStack.pop()!;
    this.redoStack.push(command);

    this.isExecuting = false;
    this.notifyStateChange();

    return command;
  }

  /**
   * Redo the last undone command
   */
  redo(): UndoableCommand | null {
    if (!this.canRedo()) return null;

    this.isExecuting = true;

    const command = this.redoStack.pop()!;
    this.undoStack.push(command);

    this.isExecuting = false;
    this.notifyStateChange();

    return command;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo stack size
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Get the last command (for preview)
   */
  peekUndo(): UndoableCommand | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  /**
   * Get the next redo command (for preview)
   */
  peekRedo(): UndoableCommand | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  /**
   * Create a named snapshot
   */
  createSnapshot(name: string, state: CanvasSnapshot, description?: string): Snapshot {
    const snapshot: Snapshot = {
      id: `snapshot_${Date.now().toString(36)}`,
      name,
      createdAt: Date.now(),
      state,
      description,
    };

    this.snapshots.set(snapshot.id, snapshot);

    // Trim if over limit
    if (this.snapshots.size > this.options.maxSnapshots) {
      const oldest = Array.from(this.snapshots.entries())
        .sort(([, a], [, b]) => a.createdAt - b.createdAt)[0];
      if (oldest) {
        this.snapshots.delete(oldest[0]);
      }
    }

    return snapshot;
  }

  /**
   * Get a snapshot by ID
   */
  getSnapshot(snapshotId: string): Snapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): Snapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    return this.snapshots.delete(snapshotId);
  }

  /**
   * Clear all undo/redo history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyStateChange();
  }

  /**
   * Clear everything including snapshots
   */
  clearAll(): void {
    this.clear();
    this.snapshots.clear();
  }

  /**
   * Get history for display
   */
  getHistory(): Array<{ command: UndoableCommand; index: number; isCurrent: boolean }> {
    return [
      ...this.undoStack.map((command, index) => ({
        command,
        index,
        isCurrent: false,
      })),
      ...(this.redoStack.length > 0 ? [{
        command: this.redoStack[0],
        index: this.undoStack.length,
        isCurrent: true,
      }] : []),
    ];
  }

  /**
   * Go to specific history point
   */
  goToHistoryPoint(targetIndex: number): UndoableCommand[] {
    const currentIndex = this.undoStack.length - 1;
    const commands: UndoableCommand[] = [];

    if (targetIndex < currentIndex) {
      // Undo to reach target
      while (this.undoStack.length - 1 > targetIndex && this.canUndo()) {
        const cmd = this.undo();
        if (cmd) commands.push(cmd);
      }
    } else if (targetIndex > currentIndex) {
      // Redo to reach target
      while (this.undoStack.length - 1 < targetIndex && this.canRedo()) {
        const cmd = this.redo();
        if (cmd) commands.push(cmd);
      }
    }

    return commands;
  }

  private notifyStateChange(): void {
    this.options.onStateChange(this.canUndo(), this.canRedo());
  }
}

// ==================
// React Hook
// ==================

import { useState, useCallback, useMemo, useEffect } from 'react';

export function useUndoManager(options?: UndoManagerOptions) {
  const [, forceUpdate] = useState({});

  const manager = useMemo(() => new UndoManager({
    ...options,
    onStateChange: () => forceUpdate({}),
  }), []);

  const push = useCallback((command: Omit<UndoableCommand, 'timestamp'>) => {
    manager.push(command);
  }, [manager]);

  const undo = useCallback(() => {
    return manager.undo();
  }, [manager]);

  const redo = useCallback(() => {
    return manager.redo();
  }, [manager]);

  const createSnapshot = useCallback((name: string, state: CanvasSnapshot, description?: string) => {
    return manager.createSnapshot(name, state, description);
  }, [manager]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    push,
    undo,
    redo,
    canUndo: manager.canUndo(),
    canRedo: manager.canRedo(),
    undoCount: manager.getUndoCount(),
    redoCount: manager.getRedoCount(),
    peekUndo: manager.peekUndo(),
    peekRedo: manager.peekRedo(),
    createSnapshot,
    getSnapshot: manager.getSnapshot.bind(manager),
    getSnapshots: manager.getSnapshots.bind(manager),
    deleteSnapshot: manager.deleteSnapshot.bind(manager),
    clear: manager.clear.bind(manager),
    getHistory: manager.getHistory.bind(manager),
    goToHistoryPoint: manager.goToHistoryPoint.bind(manager),
  };
}

// ==================
// Command Helpers
// ==================

export function createMoveCommand(
  widgetId: string,
  previousPosition: { x: number; y: number },
  nextPosition: { x: number; y: number }
): Omit<UndoableCommand, 'timestamp'> {
  return {
    type: 'widget.move',
    description: `Move widget`,
    previousState: previousPosition,
    nextState: nextPosition,
    affectedWidgetIds: [widgetId],
  };
}

export function createResizeCommand(
  widgetId: string,
  previousSize: { width: number; height: number },
  nextSize: { width: number; height: number }
): Omit<UndoableCommand, 'timestamp'> {
  return {
    type: 'widget.resize',
    description: `Resize widget`,
    previousState: previousSize,
    nextState: nextSize,
    affectedWidgetIds: [widgetId],
  };
}

export function createDeleteCommand(
  widgetIds: string[],
  deletedWidgets: unknown[]
): Omit<UndoableCommand, 'timestamp'> {
  return {
    type: 'widget.delete',
    description: `Delete ${widgetIds.length} widget(s)`,
    previousState: deletedWidgets,
    nextState: null,
    affectedWidgetIds: widgetIds,
  };
}

export function createAddCommand(
  widgetId: string,
  widget: unknown
): Omit<UndoableCommand, 'timestamp'> {
  return {
    type: 'widget.add',
    description: `Add widget`,
    previousState: null,
    nextState: widget,
    affectedWidgetIds: [widgetId],
  };
}

export function createPipelineCommand(
  type: 'add' | 'remove',
  pipelineId: string,
  pipeline: unknown
): Omit<UndoableCommand, 'timestamp'> {
  return {
    type: `pipeline.${type}`,
    description: `${type === 'add' ? 'Create' : 'Remove'} connection`,
    previousState: type === 'remove' ? pipeline : null,
    nextState: type === 'add' ? pipeline : null,
    metadata: { pipelineId },
  };
}

// ==================
// Nested Widget Commands
// ==================

export interface NestingState {
  widgetId: string;
  parentId: string | null;
  position: { x: number; y: number };
  localZIndex?: number;
}

/**
 * Create a command for nesting a widget inside another
 */
export function createNestCommand(
  widgetId: string,
  previousState: NestingState,
  nextState: NestingState
): Omit<UndoableCommand, 'timestamp'> {
  return {
    type: 'widget.nest',
    description: `Nest widget into parent`,
    previousState,
    nextState,
    affectedWidgetIds: [
      widgetId,
      previousState.parentId,
      nextState.parentId,
    ].filter((id): id is string => id !== null),
    metadata: {
      operation: 'nest',
      widgetId,
      fromParent: previousState.parentId,
      toParent: nextState.parentId,
    },
  };
}

/**
 * Create a command for unnesting a widget from its parent
 */
export function createUnnestCommand(
  widgetId: string,
  previousState: NestingState,
  nextState: NestingState
): Omit<UndoableCommand, 'timestamp'> {
  return {
    type: 'widget.unnest',
    description: `Unnest widget from parent`,
    previousState,
    nextState,
    affectedWidgetIds: [
      widgetId,
      previousState.parentId,
    ].filter((id): id is string => id !== null),
    metadata: {
      operation: 'unnest',
      widgetId,
      fromParent: previousState.parentId,
    },
  };
}

/**
 * Create a command for moving a widget within a nested container
 */
export function createNestedMoveCommand(
  widgetId: string,
  parentId: string,
  previousPosition: { x: number; y: number },
  nextPosition: { x: number; y: number }
): Omit<UndoableCommand, 'timestamp'> {
  return {
    type: 'widget.nestedMove',
    description: `Move nested widget`,
    previousState: { position: previousPosition, parentId },
    nextState: { position: nextPosition, parentId },
    affectedWidgetIds: [widgetId, parentId],
    metadata: {
      operation: 'nestedMove',
      widgetId,
      parentId,
    },
  };
}

/**
 * Create a command for reordering widgets within a parent
 */
export function createReorderChildrenCommand(
  parentId: string,
  previousOrder: string[],
  nextOrder: string[]
): Omit<UndoableCommand, 'timestamp'> {
  return {
    type: 'widget.reorderChildren',
    description: `Reorder nested widgets`,
    previousState: previousOrder,
    nextState: nextOrder,
    affectedWidgetIds: [parentId, ...previousOrder],
    metadata: {
      operation: 'reorderChildren',
      parentId,
    },
  };
}

/**
 * Create a batch command for multiple nested operations
 */
export function createBatchNestedCommand(
  description: string,
  commands: Array<Omit<UndoableCommand, 'timestamp'>>
): Omit<UndoableCommand, 'timestamp'> {
  const allAffectedIds = new Set<string>();
  commands.forEach(cmd => {
    cmd.affectedWidgetIds?.forEach(id => allAffectedIds.add(id));
  });

  return {
    type: 'widget.batchNested',
    description,
    previousState: commands.map(c => c.previousState),
    nextState: commands.map(c => c.nextState),
    affectedWidgetIds: Array.from(allAffectedIds),
    metadata: {
      operation: 'batchNested',
      commandTypes: commands.map(c => c.type),
      commandCount: commands.length,
    },
  };
}

// ==================
// Hierarchy Helpers
// ==================

/**
 * Build widget hierarchy from flat widget list
 */
export function buildWidgetHierarchy(widgets: WidgetSnapshotData[]): WidgetHierarchy {
  const roots: string[] = [];
  const children: Record<string, string[]> = {};
  const parents: Record<string, string> = {};

  widgets.forEach(widget => {
    if (widget.parentId) {
      parents[widget.id] = widget.parentId;
      if (!children[widget.parentId]) {
        children[widget.parentId] = [];
      }
      children[widget.parentId].push(widget.id);
    } else {
      roots.push(widget.id);
    }
  });

  return { roots, children, parents };
}

/**
 * Get all descendants of a widget
 */
export function getDescendants(
  widgetId: string,
  hierarchy: WidgetHierarchy
): string[] {
  const descendants: string[] = [];
  const childIds = hierarchy.children[widgetId] || [];

  childIds.forEach(childId => {
    descendants.push(childId);
    descendants.push(...getDescendants(childId, hierarchy));
  });

  return descendants;
}

/**
 * Get all ancestors of a widget
 */
export function getAncestors(
  widgetId: string,
  hierarchy: WidgetHierarchy
): string[] {
  const ancestors: string[] = [];
  let currentId: string | undefined = hierarchy.parents[widgetId];

  while (currentId) {
    ancestors.push(currentId);
    currentId = hierarchy.parents[currentId];
  }

  return ancestors;
}

/**
 * Check if widget A is an ancestor of widget B
 */
export function isAncestor(
  potentialAncestorId: string,
  widgetId: string,
  hierarchy: WidgetHierarchy
): boolean {
  return getAncestors(widgetId, hierarchy).includes(potentialAncestorId);
}

/**
 * Check if widget can be nested inside another
 * (prevents circular nesting)
 */
export function canNestInto(
  widgetId: string,
  targetParentId: string,
  hierarchy: WidgetHierarchy
): boolean {
  // Can't nest into itself
  if (widgetId === targetParentId) return false;

  // Can't nest into a descendant (would create circular reference)
  if (isAncestor(widgetId, targetParentId, hierarchy)) return false;

  return true;
}

export default UndoManager;
