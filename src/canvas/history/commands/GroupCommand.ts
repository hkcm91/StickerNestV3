/**
 * StickerNest v2 - Group Commands
 * Commands for grouping/ungrouping widgets and managing group operations.
 */

import type { Command } from '../Command';
import { generateCommandId } from '../Command';
import type { WidgetGroup, WidgetInstance } from '../../../types/domain';
import type { EntityRef } from '../../../state/useLayerStore';

// ==================
// Types
// ==================

export type GroupCommandType =
  | 'group:create'
  | 'group:delete'
  | 'group:add'
  | 'group:remove'
  | 'group:nest'
  | 'group:flatten'
  | 'group:update';

export interface GroupOperationData {
  groupId: string;
  canvasId: string;
  widgetIds: string[];
  previousGroupIds?: Map<string, string | undefined>;
}

// ==================
// Create Group Command
// ==================

/**
 * Create a command for grouping widgets
 */
export function createGroupCommand(
  canvasId: string,
  widgetIds: string[],
  groupName: string,
  createGroupFn: (canvasId: string, entityRefs: EntityRef[], name?: string) => WidgetGroup,
  deleteGroupFn: (canvasId: string, groupId: string) => void,
  updateWidgetFn: (widgetId: string, updates: Partial<WidgetInstance>) => void,
  getWidgetFn: (widgetId: string) => WidgetInstance | undefined
): Command {
  const id = generateCommandId('group', 'create');
  const timestamp = Date.now();

  // Store previous group IDs for each widget
  const previousGroupIds = new Map<string, string | undefined>();
  widgetIds.forEach(wId => {
    const widget = getWidgetFn(wId);
    previousGroupIds.set(wId, widget?.groupId);
  });

  let createdGroupId: string | null = null;

  return {
    id,
    name: `Group ${widgetIds.length} Items`,
    timestamp,

    execute() {
      const entityRefs: EntityRef[] = widgetIds.map(wId => ({
        id: wId,
        type: 'widget' as const,
      }));

      const group = createGroupFn(canvasId, entityRefs, groupName);
      createdGroupId = group.id;

      // Update widgets to reference the group
      widgetIds.forEach(wId => {
        updateWidgetFn(wId, { groupId: group.id });
      });
    },

    undo() {
      if (createdGroupId) {
        // Restore previous group IDs
        widgetIds.forEach(wId => {
          const prevGroupId = previousGroupIds.get(wId);
          updateWidgetFn(wId, { groupId: prevGroupId });
        });

        deleteGroupFn(canvasId, createdGroupId);
        createdGroupId = null;
      }
    },

    merge: undefined,

    _data: { canvasId, widgetIds, previousGroupIds },
  } as Command & { _data: GroupOperationData };
}

// ==================
// Ungroup Command
// ==================

/**
 * Create a command for ungrouping widgets
 */
export function createUngroupCommand(
  canvasId: string,
  group: WidgetGroup,
  deleteGroupFn: (canvasId: string, groupId: string) => void,
  createGroupFn: (canvasId: string, entityRefs: EntityRef[], name?: string) => WidgetGroup,
  updateWidgetFn: (widgetId: string, updates: Partial<WidgetInstance>) => void,
  updateGroupFn: (canvasId: string, groupId: string, updates: Partial<WidgetGroup>) => void
): Command {
  const id = generateCommandId('group', group.id);
  const timestamp = Date.now();
  const groupSnapshot = { ...group, widgetIds: [...group.widgetIds] };

  return {
    id,
    name: 'Ungroup',
    timestamp,

    execute() {
      // Remove group reference from widgets
      group.widgetIds.forEach(wId => {
        updateWidgetFn(wId, { groupId: undefined });
      });

      deleteGroupFn(canvasId, group.id);
    },

    undo() {
      // Recreate the group
      const entityRefs: EntityRef[] = groupSnapshot.widgetIds.map(wId => ({
        id: wId,
        type: 'widget' as const,
      }));

      const newGroup = createGroupFn(canvasId, entityRefs, groupSnapshot.name);

      // Restore group properties
      updateGroupFn(canvasId, newGroup.id, {
        collapsed: groupSnapshot.collapsed,
        locked: groupSnapshot.locked,
        visible: groupSnapshot.visible,
        opacity: groupSnapshot.opacity,
        color: groupSnapshot.color,
      });

      // Update widgets to reference the group
      groupSnapshot.widgetIds.forEach(wId => {
        updateWidgetFn(wId, { groupId: newGroup.id });
      });
    },

    merge: undefined,
  };
}

// ==================
// Add to Group Command
// ==================

/**
 * Create a command for adding widgets to an existing group
 */
export function createAddToGroupCommand(
  canvasId: string,
  groupId: string,
  widgetIds: string[],
  addToGroupFn: (canvasId: string, groupId: string, entityRefs: EntityRef[]) => void,
  removeFromGroupFn: (canvasId: string, groupId: string, entityRefs: EntityRef[]) => void,
  updateWidgetFn: (widgetId: string, updates: Partial<WidgetInstance>) => void,
  getWidgetFn: (widgetId: string) => WidgetInstance | undefined
): Command {
  const id = generateCommandId('group', groupId);
  const timestamp = Date.now();

  // Store previous group IDs
  const previousGroupIds = new Map<string, string | undefined>();
  widgetIds.forEach(wId => {
    const widget = getWidgetFn(wId);
    previousGroupIds.set(wId, widget?.groupId);
  });

  return {
    id,
    name: `Add ${widgetIds.length} to Group`,
    timestamp,

    execute() {
      const entityRefs: EntityRef[] = widgetIds.map(wId => ({
        id: wId,
        type: 'widget' as const,
      }));

      addToGroupFn(canvasId, groupId, entityRefs);

      widgetIds.forEach(wId => {
        updateWidgetFn(wId, { groupId });
      });
    },

    undo() {
      const entityRefs: EntityRef[] = widgetIds.map(wId => ({
        id: wId,
        type: 'widget' as const,
      }));

      removeFromGroupFn(canvasId, groupId, entityRefs);

      // Restore previous group IDs
      widgetIds.forEach(wId => {
        const prevGroupId = previousGroupIds.get(wId);
        updateWidgetFn(wId, { groupId: prevGroupId });
      });
    },

    merge: undefined,
  };
}

// ==================
// Remove from Group Command
// ==================

/**
 * Create a command for removing widgets from a group
 */
export function createRemoveFromGroupCommand(
  canvasId: string,
  groupId: string,
  widgetIds: string[],
  addToGroupFn: (canvasId: string, groupId: string, entityRefs: EntityRef[]) => void,
  removeFromGroupFn: (canvasId: string, groupId: string, entityRefs: EntityRef[]) => void,
  updateWidgetFn: (widgetId: string, updates: Partial<WidgetInstance>) => void
): Command {
  const id = generateCommandId('group', groupId);
  const timestamp = Date.now();

  return {
    id,
    name: `Remove ${widgetIds.length} from Group`,
    timestamp,

    execute() {
      const entityRefs: EntityRef[] = widgetIds.map(wId => ({
        id: wId,
        type: 'widget' as const,
      }));

      removeFromGroupFn(canvasId, groupId, entityRefs);

      widgetIds.forEach(wId => {
        updateWidgetFn(wId, { groupId: undefined });
      });
    },

    undo() {
      const entityRefs: EntityRef[] = widgetIds.map(wId => ({
        id: wId,
        type: 'widget' as const,
      }));

      addToGroupFn(canvasId, groupId, entityRefs);

      widgetIds.forEach(wId => {
        updateWidgetFn(wId, { groupId });
      });
    },

    merge: undefined,
  };
}

// ==================
// Nest Group Command
// ==================

/**
 * Create a command for nesting a group inside another group
 */
export function createNestGroupCommand(
  canvasId: string,
  childGroupId: string,
  parentGroupId: string,
  previousParentId: string | undefined,
  updateGroupFn: (canvasId: string, groupId: string, updates: Partial<WidgetGroup>) => void
): Command {
  const id = generateCommandId('group', childGroupId);
  const timestamp = Date.now();

  return {
    id,
    name: 'Nest Group',
    timestamp,

    execute() {
      updateGroupFn(canvasId, childGroupId, { parentGroupId });
    },

    undo() {
      updateGroupFn(canvasId, childGroupId, { parentGroupId: previousParentId });
    },

    merge: undefined,
  };
}

// ==================
// Flatten Group Command
// ==================

/**
 * Create a command for flattening a nested group (moving children to parent level)
 */
export function createFlattenGroupCommand(
  canvasId: string,
  group: WidgetGroup,
  parentGroup: WidgetGroup | undefined,
  deleteGroupFn: (canvasId: string, groupId: string) => void,
  createGroupFn: (canvasId: string, entityRefs: EntityRef[], name?: string) => WidgetGroup,
  updateWidgetFn: (widgetId: string, updates: Partial<WidgetInstance>) => void,
  updateGroupFn: (canvasId: string, groupId: string, updates: Partial<WidgetGroup>) => void,
  addToGroupFn?: (canvasId: string, groupId: string, entityRefs: EntityRef[]) => void
): Command {
  const id = generateCommandId('group', group.id);
  const timestamp = Date.now();
  const groupSnapshot = { ...group, widgetIds: [...group.widgetIds] };

  return {
    id,
    name: 'Flatten Group',
    timestamp,

    execute() {
      // Move widgets to parent group (or no group)
      const parentGroupId = parentGroup?.id;
      group.widgetIds.forEach(wId => {
        updateWidgetFn(wId, { groupId: parentGroupId });
      });

      // Add widgets to parent group if exists
      if (parentGroupId && addToGroupFn) {
        const entityRefs: EntityRef[] = group.widgetIds.map(wId => ({
          id: wId,
          type: 'widget' as const,
        }));
        addToGroupFn(canvasId, parentGroupId, entityRefs);
      }

      // Delete the flattened group
      deleteGroupFn(canvasId, group.id);
    },

    undo() {
      // Recreate the group
      const entityRefs: EntityRef[] = groupSnapshot.widgetIds.map(wId => ({
        id: wId,
        type: 'widget' as const,
      }));

      const newGroup = createGroupFn(canvasId, entityRefs, groupSnapshot.name);

      // Restore parent relationship
      if (groupSnapshot.parentGroupId) {
        updateGroupFn(canvasId, newGroup.id, {
          parentGroupId: groupSnapshot.parentGroupId,
        });
      }

      // Update widgets to reference the group
      groupSnapshot.widgetIds.forEach(wId => {
        updateWidgetFn(wId, { groupId: newGroup.id });
      });
    },

    merge: undefined,
  };
}

// ==================
// Update Group Command
// ==================

/**
 * Create a command for updating group properties
 */
export function createUpdateGroupCommand(
  canvasId: string,
  groupId: string,
  fromState: Partial<WidgetGroup>,
  toState: Partial<WidgetGroup>,
  updateFn: (canvasId: string, groupId: string, updates: Partial<WidgetGroup>) => void,
  propertyName?: string
): Command {
  const id = generateCommandId('property', groupId);
  const timestamp = Date.now();

  return {
    id,
    name: propertyName || 'Update Group',
    timestamp,

    execute() {
      updateFn(canvasId, groupId, toState);
    },

    undo() {
      updateFn(canvasId, groupId, fromState);
    },

    merge: undefined,
  };
}

// ==================
// Toggle Group Visibility Command
// ==================

/**
 * Create a command for toggling group visibility
 */
export function createToggleGroupVisibilityCommand(
  canvasId: string,
  groupId: string,
  wasVisible: boolean,
  toggleFn: (canvasId: string, groupId: string) => void,
  updateWidgetsFn: (widgetIds: string[], visible: boolean) => void,
  getGroupWidgetIds: (groupId: string) => string[]
): Command {
  const id = generateCommandId('property', groupId);
  const timestamp = Date.now();
  const widgetIds = getGroupWidgetIds(groupId);

  return {
    id,
    name: wasVisible ? 'Hide Group' : 'Show Group',
    timestamp,

    execute() {
      toggleFn(canvasId, groupId);
      // Also toggle visibility of all widgets in the group
      updateWidgetsFn(widgetIds, !wasVisible);
    },

    undo() {
      toggleFn(canvasId, groupId);
      updateWidgetsFn(widgetIds, wasVisible);
    },

    merge: undefined,
  };
}

// ==================
// Toggle Group Lock Command
// ==================

/**
 * Create a command for toggling group lock
 */
export function createToggleGroupLockCommand(
  canvasId: string,
  groupId: string,
  wasLocked: boolean,
  updateGroupFn: (canvasId: string, groupId: string, updates: Partial<WidgetGroup>) => void,
  updateWidgetsFn: (widgetIds: string[], locked: boolean) => void,
  getGroupWidgetIds: (groupId: string) => string[]
): Command {
  const id = generateCommandId('property', groupId);
  const timestamp = Date.now();
  const widgetIds = getGroupWidgetIds(groupId);

  return {
    id,
    name: wasLocked ? 'Unlock Group' : 'Lock Group',
    timestamp,

    execute() {
      updateGroupFn(canvasId, groupId, { locked: !wasLocked });
      // Also update lock state of all widgets
      updateWidgetsFn(widgetIds, !wasLocked);
    },

    undo() {
      updateGroupFn(canvasId, groupId, { locked: wasLocked });
      updateWidgetsFn(widgetIds, wasLocked);
    },

    merge: undefined,
  };
}

// ==================
// Rename Group Command
// ==================

/**
 * Create a command for renaming a group
 */
export function createRenameGroupCommand(
  canvasId: string,
  groupId: string,
  fromName: string,
  toName: string,
  updateFn: (canvasId: string, groupId: string, updates: Partial<WidgetGroup>) => void
): Command {
  const id = generateCommandId('property', groupId);
  const timestamp = Date.now();

  return {
    id,
    name: 'Rename Group',
    timestamp,

    execute() {
      updateFn(canvasId, groupId, { name: toName });
    },

    undo() {
      updateFn(canvasId, groupId, { name: fromName });
    },

    merge: undefined,
  };
}

export default {
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
};
