/**
 * StickerNest v2 - History Module
 * Exports command-based undo/redo system
 */

export type { Command, CommandType } from './Command';
export { generateCommandId, canMergeByTiming } from './Command';

export type { CommandStackState } from './CommandStack';
export { initialCommandStackState, commandStackOperations } from './CommandStack';

export { createMoveCommand, createMultiMoveCommand } from './commands/MoveCommand';
export { createResizeCommand } from './commands/ResizeCommand';
export {
  createPropertyCommand,
  createRotateCommand,
  createOpacityCommand,
  createVisibilityCommand,
  createLockCommand,
  createMultiPropertyCommand,
} from './commands/PropertyCommand';
