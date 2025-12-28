/**
 * StickerNest v2 - Command Interface
 * Base interface for all undoable commands in the canvas system.
 * Implements the Command pattern for efficient undo/redo.
 */

/**
 * Base command interface for undoable operations
 */
export interface Command {
  /** Unique identifier for this command instance */
  readonly id: string;

  /** Human-readable name for display (e.g., "Move Widget", "Resize Widget") */
  readonly name: string;

  /** Timestamp when command was created */
  readonly timestamp: number;

  /** Execute/apply the command */
  execute(): void;

  /** Undo/reverse the command */
  undo(): void;

  /**
   * Attempt to merge with another command of the same type.
   * Used to combine rapid sequential operations (e.g., continuous dragging)
   * into a single undoable action.
   *
   * @param other - The command to potentially merge with
   * @returns The merged command if merge is possible, null otherwise
   */
  merge?(other: Command): Command | null;
}

/**
 * Command types for identification
 */
export type CommandType =
  | 'move'
  | 'resize'
  | 'rotate'
  | 'delete'
  | 'add'
  | 'property'
  | 'group'
  | 'batch';

/**
 * Generate a unique command ID
 */
export function generateCommandId(type: CommandType, widgetId?: string): string {
  const suffix = widgetId ? `-${widgetId}` : '';
  return `${type}${suffix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if two commands can potentially be merged based on timing
 */
export function canMergeByTiming(cmd1: Command, cmd2: Command, windowMs: number = 500): boolean {
  return Math.abs(cmd1.timestamp - cmd2.timestamp) < windowMs;
}

export default Command;
