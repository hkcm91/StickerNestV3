/**
 * StickerNest v2 - Command Stack
 * Manages undo/redo stack for command-based history.
 */

import type { Command } from './Command';

/**
 * Maximum number of commands to keep in history
 */
const MAX_HISTORY_SIZE = 100;

/**
 * Time window for merging consecutive commands (ms)
 */
const MERGE_WINDOW_MS = 500;

/**
 * Command stack state
 */
export interface CommandStackState {
  /** Past commands that can be undone */
  undoStack: Command[];

  /** Future commands that can be redone (after undo) */
  redoStack: Command[];

  /** Whether we're currently executing a command (prevents recursion) */
  isExecuting: boolean;
}

/**
 * Initial command stack state
 */
export const initialCommandStackState: CommandStackState = {
  undoStack: [],
  redoStack: [],
  isExecuting: false,
};

/**
 * Command stack operations - designed to be used with Zustand
 * These functions return new state rather than mutating
 */
export const commandStackOperations = {
  /**
   * Execute a new command and add it to the undo stack
   */
  executeCommand(state: CommandStackState, command: Command): CommandStackState {
    if (state.isExecuting) {
      // Prevent recursive command execution
      return state;
    }

    // Execute the command
    command.execute();

    // Try to merge with the last command
    const undoStack = [...state.undoStack];
    const lastCommand = undoStack[undoStack.length - 1];

    if (lastCommand && command.merge) {
      const merged = command.merge(lastCommand);
      if (merged) {
        // Replace last command with merged version
        undoStack[undoStack.length - 1] = merged;
        return {
          undoStack,
          redoStack: [], // Clear redo stack on new action
          isExecuting: false,
        };
      }
    }

    // Add as new command
    undoStack.push(command);

    // Trim history if too long
    if (undoStack.length > MAX_HISTORY_SIZE) {
      undoStack.shift();
    }

    return {
      undoStack,
      redoStack: [], // Clear redo stack on new action
      isExecuting: false,
    };
  },

  /**
   * Undo the last command
   */
  undo(state: CommandStackState): CommandStackState {
    if (state.undoStack.length === 0 || state.isExecuting) {
      return state;
    }

    const undoStack = [...state.undoStack];
    const redoStack = [...state.redoStack];

    const command = undoStack.pop()!;
    command.undo();
    redoStack.push(command);

    return {
      undoStack,
      redoStack,
      isExecuting: false,
    };
  },

  /**
   * Redo the last undone command
   */
  redo(state: CommandStackState): CommandStackState {
    if (state.redoStack.length === 0 || state.isExecuting) {
      return state;
    }

    const undoStack = [...state.undoStack];
    const redoStack = [...state.redoStack];

    const command = redoStack.pop()!;
    command.execute();
    undoStack.push(command);

    return {
      undoStack,
      redoStack,
      isExecuting: false,
    };
  },

  /**
   * Check if undo is available
   */
  canUndo(state: CommandStackState): boolean {
    return state.undoStack.length > 0 && !state.isExecuting;
  },

  /**
   * Check if redo is available
   */
  canRedo(state: CommandStackState): boolean {
    return state.redoStack.length > 0 && !state.isExecuting;
  },

  /**
   * Clear all history
   */
  clear(state: CommandStackState): CommandStackState {
    return {
      undoStack: [],
      redoStack: [],
      isExecuting: false,
    };
  },

  /**
   * Get the name of the next undoable action (for UI display)
   */
  getUndoName(state: CommandStackState): string | null {
    if (state.undoStack.length === 0) return null;
    return state.undoStack[state.undoStack.length - 1].name;
  },

  /**
   * Get the name of the next redoable action (for UI display)
   */
  getRedoName(state: CommandStackState): string | null {
    if (state.redoStack.length === 0) return null;
    return state.redoStack[state.redoStack.length - 1].name;
  },
};

export default commandStackOperations;
