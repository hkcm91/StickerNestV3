/**
 * StickerNest v2 - Unified Undo/Redo Store (Zustand)
 * Consolidates all undo/redo functionality into a single command-based store.
 * Supports command merging, batching, and comprehensive history management.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { Command } from '../canvas/history/Command';

// ==================
// Types
// ==================

/** Maximum number of commands to keep in history */
const MAX_HISTORY_SIZE = 100;

/** Time window for merging consecutive commands (ms) */
const MERGE_WINDOW_MS = 500;

/** Command metadata for UI display */
export interface CommandMetadata {
  /** Human-readable name */
  name: string;
  /** Icon identifier for UI */
  icon?: string;
  /** Timestamp when created */
  timestamp: number;
  /** Number of items affected */
  affectedCount?: number;
  /** IDs of affected items */
  affectedIds?: string[];
}

/** Batch command state for grouping operations */
export interface BatchState {
  /** Whether we're currently in batch mode */
  isActive: boolean;
  /** Commands accumulated during batch */
  commands: Command[];
  /** Name for the batch operation */
  name: string;
}

// ==================
// Store State
// ==================

export interface UndoRedoState {
  /** Past commands that can be undone (most recent last) */
  undoStack: Command[];
  /** Future commands that can be redone (most recent last) */
  redoStack: Command[];
  /** Whether a command is currently executing */
  isExecuting: boolean;
  /** Current batch state */
  batch: BatchState;
  /** Listeners for undo/redo events */
  listeners: Map<string, (action: 'undo' | 'redo', command: Command) => void>;
}

// ==================
// Store Actions
// ==================

export interface UndoRedoActions {
  // === Core Operations ===
  /** Execute a command and add to history */
  execute: (command: Command) => void;
  /** Record a command without executing (command already executed) */
  record: (command: Command) => void;
  /** Undo the last command */
  undo: () => boolean;
  /** Redo the last undone command */
  redo: () => boolean;
  /** Undo multiple commands */
  undoMultiple: (count: number) => void;
  /** Redo multiple commands */
  redoMultiple: (count: number) => void;

  // === Batch Operations ===
  /** Start a batch operation */
  startBatch: (name: string) => void;
  /** End batch and create single command */
  endBatch: () => void;
  /** Cancel batch without creating command */
  cancelBatch: () => void;
  /** Execute within a batch */
  withBatch: <T>(name: string, fn: () => T) => T;

  // === Query Operations ===
  /** Check if undo is available */
  canUndo: () => boolean;
  /** Check if redo is available */
  canRedo: () => boolean;
  /** Get undo stack length */
  getUndoCount: () => number;
  /** Get redo stack length */
  getRedoCount: () => number;
  /** Get name of next undo action */
  getUndoName: () => string | null;
  /** Get name of next redo action */
  getRedoName: () => string | null;
  /** Get recent history for UI display */
  getRecentHistory: (count?: number) => CommandMetadata[];

  // === Management ===
  /** Clear all history */
  clear: () => void;
  /** Clear redo stack only */
  clearRedo: () => void;
  /** Add event listener */
  addListener: (id: string, listener: (action: 'undo' | 'redo', command: Command) => void) => void;
  /** Remove event listener */
  removeListener: (id: string) => void;
  /** Reset to initial state */
  reset: () => void;
}

// ==================
// Initial State
// ==================

const initialState: UndoRedoState = {
  undoStack: [],
  redoStack: [],
  isExecuting: false,
  batch: {
    isActive: false,
    commands: [],
    name: '',
  },
  listeners: new Map(),
};

// ==================
// Batch Command Implementation
// ==================

function createBatchCommand(commands: Command[], name: string): Command {
  const id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();

  return {
    id,
    name,
    timestamp,

    execute() {
      // Execute all commands in order
      commands.forEach(cmd => cmd.execute());
    },

    undo() {
      // Undo all commands in reverse order
      [...commands].reverse().forEach(cmd => cmd.undo());
    },

    // Batch commands don't merge
    merge: undefined,
  };
}

// ==================
// Store Creation
// ==================

export const useUndoRedoStore = create<UndoRedoState & UndoRedoActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // === Core Operations ===

      execute: (command) => {
        const state = get();

        // If in batch mode, accumulate commands
        if (state.batch.isActive) {
          command.execute();
          set((s) => ({
            batch: {
              ...s.batch,
              commands: [...s.batch.commands, command],
            },
          }), false, 'execute/batch');
          return;
        }

        // Prevent recursive execution
        if (state.isExecuting) return;

        set({ isExecuting: true }, false, 'execute/start');

        // Execute the command
        command.execute();

        // Try to merge with the last command
        const undoStack = [...state.undoStack];
        const lastCommand = undoStack[undoStack.length - 1];

        if (lastCommand && command.merge) {
          const timeDiff = command.timestamp - lastCommand.timestamp;
          if (timeDiff < MERGE_WINDOW_MS) {
            const merged = command.merge(lastCommand);
            if (merged) {
              undoStack[undoStack.length - 1] = merged;
              set({
                undoStack,
                redoStack: [], // Clear redo on new action
                isExecuting: false,
              }, false, 'execute/merged');
              return;
            }
          }
        }

        // Add as new command
        undoStack.push(command);

        // Trim history if too long
        if (undoStack.length > MAX_HISTORY_SIZE) {
          undoStack.shift();
        }

        set({
          undoStack,
          redoStack: [], // Clear redo on new action
          isExecuting: false,
        }, false, 'execute/new');
      },

      record: (command) => {
        const state = get();

        // If in batch mode, accumulate without executing
        if (state.batch.isActive) {
          set((s) => ({
            batch: {
              ...s.batch,
              commands: [...s.batch.commands, command],
            },
          }), false, 'record/batch');
          return;
        }

        // Try to merge with the last command
        const undoStack = [...state.undoStack];
        const lastCommand = undoStack[undoStack.length - 1];

        if (lastCommand && command.merge) {
          const timeDiff = command.timestamp - lastCommand.timestamp;
          if (timeDiff < MERGE_WINDOW_MS) {
            const merged = command.merge(lastCommand);
            if (merged) {
              undoStack[undoStack.length - 1] = merged;
              set({
                undoStack,
                redoStack: [],
              }, false, 'record/merged');
              return;
            }
          }
        }

        undoStack.push(command);

        if (undoStack.length > MAX_HISTORY_SIZE) {
          undoStack.shift();
        }

        set({
          undoStack,
          redoStack: [],
        }, false, 'record/new');
      },

      undo: () => {
        const state = get();
        if (state.undoStack.length === 0 || state.isExecuting) {
          return false;
        }

        set({ isExecuting: true }, false, 'undo/start');

        const undoStack = [...state.undoStack];
        const redoStack = [...state.redoStack];

        const command = undoStack.pop()!;
        command.undo();
        redoStack.push(command);

        // Notify listeners
        state.listeners.forEach(listener => listener('undo', command));

        set({
          undoStack,
          redoStack,
          isExecuting: false,
        }, false, 'undo/complete');

        return true;
      },

      redo: () => {
        const state = get();
        if (state.redoStack.length === 0 || state.isExecuting) {
          return false;
        }

        set({ isExecuting: true }, false, 'redo/start');

        const undoStack = [...state.undoStack];
        const redoStack = [...state.redoStack];

        const command = redoStack.pop()!;
        command.execute();
        undoStack.push(command);

        // Notify listeners
        state.listeners.forEach(listener => listener('redo', command));

        set({
          undoStack,
          redoStack,
          isExecuting: false,
        }, false, 'redo/complete');

        return true;
      },

      undoMultiple: (count) => {
        const state = get();
        for (let i = 0; i < count && state.canUndo(); i++) {
          get().undo();
        }
      },

      redoMultiple: (count) => {
        const state = get();
        for (let i = 0; i < count && state.canRedo(); i++) {
          get().redo();
        }
      },

      // === Batch Operations ===

      startBatch: (name) => {
        set({
          batch: {
            isActive: true,
            commands: [],
            name,
          },
        }, false, 'startBatch');
      },

      endBatch: () => {
        const state = get();
        if (!state.batch.isActive) return;

        const { commands, name } = state.batch;

        // Reset batch state first
        set({
          batch: {
            isActive: false,
            commands: [],
            name: '',
          },
        }, false, 'endBatch/reset');

        // Create and record batch command if there were any commands
        if (commands.length > 0) {
          const batchCommand = createBatchCommand(commands, name);
          // Record without executing (commands already executed)
          get().record(batchCommand);
        }
      },

      cancelBatch: () => {
        const state = get();
        if (!state.batch.isActive) return;

        // Undo all commands in the batch in reverse order
        [...state.batch.commands].reverse().forEach(cmd => cmd.undo());

        set({
          batch: {
            isActive: false,
            commands: [],
            name: '',
          },
        }, false, 'cancelBatch');
      },

      withBatch: (name, fn) => {
        get().startBatch(name);
        try {
          const result = fn();
          get().endBatch();
          return result;
        } catch (error) {
          get().cancelBatch();
          throw error;
        }
      },

      // === Query Operations ===

      canUndo: () => {
        const state = get();
        return state.undoStack.length > 0 && !state.isExecuting;
      },

      canRedo: () => {
        const state = get();
        return state.redoStack.length > 0 && !state.isExecuting;
      },

      getUndoCount: () => get().undoStack.length,

      getRedoCount: () => get().redoStack.length,

      getUndoName: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return null;
        return undoStack[undoStack.length - 1].name;
      },

      getRedoName: () => {
        const { redoStack } = get();
        if (redoStack.length === 0) return null;
        return redoStack[redoStack.length - 1].name;
      },

      getRecentHistory: (count = 10) => {
        const { undoStack, redoStack } = get();

        // Get last N undo commands
        const history: CommandMetadata[] = undoStack
          .slice(-count)
          .reverse()
          .map(cmd => ({
            name: cmd.name,
            timestamp: cmd.timestamp,
          }));

        return history;
      },

      // === Management ===

      clear: () => {
        set({
          undoStack: [],
          redoStack: [],
        }, false, 'clear');
      },

      clearRedo: () => {
        set({ redoStack: [] }, false, 'clearRedo');
      },

      addListener: (id, listener) => {
        set((state) => {
          const listeners = new Map(state.listeners);
          listeners.set(id, listener);
          return { listeners };
        }, false, 'addListener');
      },

      removeListener: (id) => {
        set((state) => {
          const listeners = new Map(state.listeners);
          listeners.delete(id);
          return { listeners };
        }, false, 'removeListener');
      },

      reset: () => {
        set({
          ...initialState,
          listeners: new Map(),
        }, false, 'reset');
      },
    })),
    {
      name: 'UndoRedoStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==================
// Selector Hooks
// ==================

/** Get undo availability */
export const useCanUndo = () => useUndoRedoStore((state) => state.canUndo());

/** Get redo availability */
export const useCanRedo = () => useUndoRedoStore((state) => state.canRedo());

/** Get undo command name */
export const useUndoName = () => useUndoRedoStore((state) => state.getUndoName());

/** Get redo command name */
export const useRedoName = () => useUndoRedoStore((state) => state.getRedoName());

/** Get undo/redo counts */
export const useHistoryCounts = () => useUndoRedoStore((state) => ({
  undoCount: state.undoStack.length,
  redoCount: state.redoStack.length,
}));

/** Get undo/redo actions */
export const useUndoRedoActions = () => useUndoRedoStore((state) => ({
  undo: state.undo,
  redo: state.redo,
  execute: state.execute,
  record: state.record,
  startBatch: state.startBatch,
  endBatch: state.endBatch,
  cancelBatch: state.cancelBatch,
  withBatch: state.withBatch,
  clear: state.clear,
}));

/** Check if currently executing */
export const useIsExecuting = () => useUndoRedoStore((state) => state.isExecuting);

/** Check if in batch mode */
export const useIsBatching = () => useUndoRedoStore((state) => state.batch.isActive);

export default useUndoRedoStore;
