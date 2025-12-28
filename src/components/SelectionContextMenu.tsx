/**
 * StickerNest v2 - SelectionContextMenu Component
 * Right-click context menu for selected entities
 * Provides z-order, grouping, and common actions
 */

import React, { useCallback, useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  useSelectionStore,
  useSelectedEntities,
  useIsMultiSelectActive,
} from '../state/useSelectionStore';
import { useLayerStore, useGroupActions, useZOrderActions } from '../state/useLayerStore';

// ==================
// Types
// ==================

interface ContextMenuProps {
  canvasId: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onDelete?: (ids: string[]) => void;
  onDuplicate?: (ids: string[]) => void;
  onLock?: (ids: string[]) => void;
  onUnlock?: (ids: string[]) => void;
}

interface MenuItemProps {
  label: string;
  shortcut?: string;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}

interface MenuDividerProps {
  label?: string;
}

// ==================
// MenuItem Component
// ==================

const MenuItem: React.FC<MenuItemProps> = memo(({
  label,
  shortcut,
  icon,
  disabled = false,
  danger = false,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 12px',
        background: isHovered && !disabled
          ? danger
            ? 'rgba(239, 68, 68, 0.15)'
            : 'rgba(139, 92, 246, 0.15)'
          : 'transparent',
        border: 'none',
        borderRadius: 'var(--sn-radius-sm)',
        color: disabled
          ? 'var(--sn-text-muted)'
          : danger
            ? 'var(--sn-error)'
            : 'var(--sn-text-primary)',
        fontSize: 13,
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'var(--sn-transition-fast)',
      }}
    >
      {/* Icon */}
      {icon && (
        <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>
          {icon}
        </span>
      )}

      {/* Label */}
      <span style={{ flex: 1 }}>{label}</span>

      {/* Shortcut */}
      {shortcut && (
        <span style={{
          fontSize: 11,
          color: 'var(--sn-text-muted)',
          background: 'var(--sn-bg-tertiary)',
          padding: '2px 6px',
          borderRadius: 'var(--sn-radius-sm)',
        }}>
          {shortcut}
        </span>
      )}
    </button>
  );
});

MenuItem.displayName = 'MenuItem';

// ==================
// MenuDivider Component
// ==================

const MenuDivider: React.FC<MenuDividerProps> = memo(({ label }) => (
  <div style={{
    padding: label ? '6px 12px 2px' : '4px 0',
    borderBottom: label ? 'none' : '1px solid var(--sn-border-secondary)',
    margin: '2px 0',
  }}>
    {label && (
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--sn-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </span>
    )}
  </div>
));

MenuDivider.displayName = 'MenuDivider';

// ==================
// Main Context Menu Component
// ==================

export const SelectionContextMenu: React.FC<ContextMenuProps> = ({
  canvasId,
  position,
  onClose,
  onDelete,
  onDuplicate,
  onLock,
  onUnlock,
}) => {
  // Selection state
  const selectedEntities = useSelectedEntities();
  const isMultiSelect = useIsMultiSelectActive();
  const { clearSelection, copySelected, cutSelected } = useSelectionStore();

  // Layer/group actions
  const { createGroup, ungroup } = useGroupActions();
  const { bringToFront, sendToBack } = useZOrderActions();
  const groups = useLayerStore((s) => s.getGroups(canvasId));

  // Check if any selected entity is in a group
  const selectedWidgetIds = selectedEntities
    .filter(e => e.type === 'widget')
    .map(e => e.id);

  const selectedInGroup = groups.some(g =>
    g.widgetIds.some(id => selectedWidgetIds.includes(id))
  );

  // Close on click outside
  useEffect(() => {
    const handleClick = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Action handlers
  const handleGroup = useCallback(() => {
    if (selectedWidgetIds.length > 1) {
      const entityRefs = selectedWidgetIds.map(id => ({ id, type: 'widget' as const }));
      createGroup(canvasId, entityRefs);
    }
    onClose();
  }, [canvasId, selectedWidgetIds, createGroup, onClose]);

  const handleUngroup = useCallback(() => {
    // Find groups that contain selected widgets
    groups.forEach(group => {
      if (group.widgetIds.some(id => selectedWidgetIds.includes(id))) {
        ungroup(canvasId, group.id);
      }
    });
    onClose();
  }, [canvasId, groups, selectedWidgetIds, ungroup, onClose]);

  const handleBringToFront = useCallback(() => {
    selectedEntities.forEach(entity => {
      bringToFront(canvasId, { id: entity.id, type: entity.type });
    });
    onClose();
  }, [canvasId, selectedEntities, bringToFront, onClose]);

  const handleSendToBack = useCallback(() => {
    selectedEntities.forEach(entity => {
      sendToBack(canvasId, { id: entity.id, type: entity.type });
    });
    onClose();
  }, [canvasId, selectedEntities, sendToBack, onClose]);

  const handleCopy = useCallback(() => {
    copySelected();
    onClose();
  }, [copySelected, onClose]);

  const handleCut = useCallback(() => {
    cutSelected();
    onClose();
  }, [cutSelected, onClose]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(selectedEntities.map(e => e.id));
    }
    onClose();
  }, [onDelete, selectedEntities, onClose]);

  const handleDuplicate = useCallback(() => {
    if (onDuplicate) {
      onDuplicate(selectedEntities.map(e => e.id));
    }
    onClose();
  }, [onDuplicate, selectedEntities, onClose]);

  const handleLock = useCallback(() => {
    if (onLock) {
      onLock(selectedEntities.map(e => e.id));
    }
    onClose();
  }, [onLock, selectedEntities, onClose]);

  const handleSelectAll = useCallback(() => {
    // This would need to be implemented in the parent
    onClose();
  }, [onClose]);

  // Don't render if no position or no selection
  if (!position || selectedEntities.length === 0) return null;

  const menuContent = (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        minWidth: 200,
        background: 'var(--sn-glass-bg)',
        backdropFilter: 'var(--sn-glass-blur)',
        border: '1px solid var(--sn-border-primary)',
        borderRadius: 'var(--sn-radius-lg)',
        boxShadow: 'var(--sn-elevation-panel)',
        padding: '6px',
        zIndex: 10000,
      }}
    >
      {/* Selection info header */}
      <div style={{
        padding: '6px 12px',
        marginBottom: 4,
        borderBottom: '1px solid var(--sn-border-secondary)',
      }}>
        <span style={{
          fontSize: 11,
          color: 'var(--sn-text-muted)',
        }}>
          {selectedEntities.length} item{selectedEntities.length > 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Edit actions */}
      <MenuItem
        icon="📋"
        label="Copy"
        shortcut="Ctrl+C"
        onClick={handleCopy}
      />
      <MenuItem
        icon="✂️"
        label="Cut"
        shortcut="Ctrl+X"
        onClick={handleCut}
      />
      <MenuItem
        icon="📑"
        label="Duplicate"
        shortcut="Ctrl+D"
        onClick={handleDuplicate}
        disabled={!onDuplicate}
      />

      <MenuDivider />

      {/* Z-order actions */}
      <MenuDivider label="Arrange" />
      <MenuItem
        icon="⬆"
        label="Bring to Front"
        shortcut="Ctrl+Shift+]"
        onClick={handleBringToFront}
      />
      <MenuItem
        icon="⬇"
        label="Send to Back"
        shortcut="Ctrl+Shift+["
        onClick={handleSendToBack}
      />

      <MenuDivider />

      {/* Grouping actions */}
      <MenuDivider label="Group" />
      <MenuItem
        icon="📁"
        label="Group"
        shortcut="Ctrl+G"
        onClick={handleGroup}
        disabled={!isMultiSelect || selectedWidgetIds.length < 2}
      />
      <MenuItem
        icon="📂"
        label="Ungroup"
        shortcut="Ctrl+Shift+G"
        onClick={handleUngroup}
        disabled={!selectedInGroup}
      />

      <MenuDivider />

      {/* Lock/unlock */}
      <MenuItem
        icon="🔒"
        label="Lock"
        shortcut="Ctrl+L"
        onClick={handleLock}
        disabled={!onLock}
      />

      <MenuDivider />

      {/* Danger zone */}
      <MenuItem
        icon="🗑️"
        label="Delete"
        shortcut="Del"
        danger
        onClick={handleDelete}
        disabled={!onDelete}
      />
    </div>
  );

  // Render in portal to avoid z-index issues
  return createPortal(menuContent, document.body);
};

export default SelectionContextMenu;
