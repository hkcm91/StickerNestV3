/**
 * StickerNest v2 - Canvas History Commands Index
 * Exports all command types for undo/redo operations.
 */

// Core command interface
export * from '../Command';

// Move commands
export {
  createMoveCommand,
  createMultiMoveCommand,
  type MoveCommandData,
} from './MoveCommand';

// Resize commands
export {
  createResizeCommand,
  type ResizeCommandData,
} from './ResizeCommand';

// Property commands
export {
  createPropertyCommand,
  createMultiPropertyCommand,
  createRotateCommand,
  createOpacityCommand,
  createVisibilityCommand,
  createLockCommand,
  createZIndexCommand,
  type PropertyCommandData,
} from './PropertyCommand';

// Create/Delete commands
export {
  createAddWidgetCommand,
  createAddMultipleWidgetsCommand,
  createDeleteWidgetCommand,
  createDeleteMultipleWidgetsCommand,
  createDuplicateWidgetsCommand,
  createAddEntityCommand,
  createDeleteEntityCommand,
  type CreateWidgetData,
  type DeleteWidgetData,
  type EntityData,
} from './CreateDeleteCommand';

// Layer commands
export {
  createAddLayerCommand,
  createDeleteLayerCommand,
  createReorderLayersCommand,
  createUpdateLayerCommand,
  createToggleLayerVisibilityCommand,
  createToggleLayerLockCommand,
  createMergeLayersCommand,
  createMoveWidgetToLayerCommand,
  createLayerOpacityCommand,
  createRenameLayerCommand,
  type LayerCommandType,
  type MergeLayersData,
} from './LayerCommand';

// Group commands
export {
  createGroupCommand,
  createUngroupCommand,
  createAddToGroupCommand,
  createRemoveFromGroupCommand,
  createNestGroupCommand,
  createFlattenGroupCommand,
  createUpdateGroupCommand,
  createToggleGroupVisibilityCommand,
  createToggleGroupLockCommand,
  createRenameGroupCommand,
  type GroupCommandType,
  type GroupOperationData,
} from './GroupCommand';
