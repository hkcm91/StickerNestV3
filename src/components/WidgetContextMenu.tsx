/**
 * StickerNest v2 - Widget Context Menu
 * Right-click context menu with transform and editing options
 *
 * REFACTORING NOTE (Dec 2024): Migrated to use useClickOutside hook.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';
import { SNIcon } from '../shared-ui/SNIcon';
import { useClickOutside } from '../hooks/useClickOutside';

interface WidgetContextMenuProps {
  /** X position of the menu */
  x: number;
  /** Y position of the menu */
  y: number;
  /** Widget ID (null for canvas click) */
  widgetId: string | null;
  /** Callback to close the menu */
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
}

export const WidgetContextMenu: React.FC<WidgetContextMenuProps> = ({
  x,
  y,
  widgetId,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Canvas store
  const widgets = useCanvasStore(state => state.widgets);
  const updateWidget = useCanvasStore(state => state.updateWidget);
  const deleteSelectedWidgets = useCanvasStore(state => state.deleteSelectedWidgets);
  const duplicateSelectedWidgets = useCanvasStore(state => state.duplicateSelectedWidgets);
  const bringToFront = useCanvasStore(state => state.bringToFront);
  const sendToBack = useCanvasStore(state => state.sendToBack);
  const bringForward = useCanvasStore(state => state.bringForward);
  const sendBackward = useCanvasStore(state => state.sendBackward);
  const groupSelectedWidgets = useCanvasStore(state => state.groupSelectedWidgets);
  const ungroupSelectedWidgets = useCanvasStore(state => state.ungroupSelectedWidgets);
  const lockSelectedWidgets = useCanvasStore(state => state.lockSelectedWidgets);
  const unlockSelectedWidgets = useCanvasStore(state => state.unlockSelectedWidgets);
  const alignSelectedWidgets = useCanvasStore(state => state.alignSelectedWidgets);
  const distributeSelectedWidgets = useCanvasStore(state => state.distributeSelectedWidgets);
  const selectAll = useCanvasStore(state => state.selectAll);
  const deselectAll = useCanvasStore(state => state.deselectAll);
  const saveSnapshot = useCanvasStore(state => state.saveSnapshot);
  const selectedIds = useCanvasStore(state => Array.from(state.selection.selectedIds));

  const widget = widgetId ? widgets.get(widgetId) : null;
  const hasSelection = selectedIds.length > 0;
  const isMultiSelect = selectedIds.length > 1;

  // Handle click outside using shared hook
  useClickOutside(menuRef, onClose);

  // Handle Escape key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  // Execute action and close menu
  const executeAction = useCallback((action?: () => void) => {
    if (action) {
      action();
    }
    onClose();
  }, [onClose]);

  // Build menu items
  const menuItems: MenuItem[] = [];

  if (hasSelection) {
    // Transform actions
    menuItems.push(
      {
        label: 'Flip Horizontal',
        icon: 'flipHorizontal',
        action: () => {
          selectedIds.forEach(id => {
            const w = widgets.get(id);
            if (w) updateWidget(id, { flipX: !w.flipX });
          });
          saveSnapshot();
        },
      },
      {
        label: 'Flip Vertical',
        icon: 'flipVertical',
        action: () => {
          selectedIds.forEach(id => {
            const w = widgets.get(id);
            if (w) updateWidget(id, { flipY: !w.flipY });
          });
          saveSnapshot();
        },
      },
      {
        label: 'Rotate 90° CW',
        icon: 'rotateCw',
        action: () => {
          selectedIds.forEach(id => {
            const w = widgets.get(id);
            if (w) updateWidget(id, { rotation: (w.rotation + 90) % 360 });
          });
          saveSnapshot();
        },
      },
      {
        label: 'Rotate 90° CCW',
        icon: 'rotateCcw',
        action: () => {
          selectedIds.forEach(id => {
            const w = widgets.get(id);
            if (w) updateWidget(id, { rotation: ((w.rotation - 90) % 360 + 360) % 360 });
          });
          saveSnapshot();
        },
      },
      {
        label: 'Reset Rotation',
        icon: 'refresh',
        action: () => {
          selectedIds.forEach(id => updateWidget(id, { rotation: 0 }));
          saveSnapshot();
        },
      },
      { divider: true, label: '' },
    );

    // Lock/Unlock
    if (widget?.locked) {
      menuItems.push({
        label: 'Unlock',
        icon: 'unlock',
        shortcut: 'Ctrl+Shift+L',
        action: unlockSelectedWidgets,
      });
    } else {
      menuItems.push({
        label: 'Lock',
        icon: 'lock',
        shortcut: 'Ctrl+L',
        action: lockSelectedWidgets,
      });
    }

    // Toggle Aspect Lock
    menuItems.push({
      label: widget?.aspectLocked ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio',
      icon: widget?.aspectLocked ? 'unlock' : 'lock',
      action: () => {
        selectedIds.forEach(id => {
          const w = widgets.get(id);
          if (w) updateWidget(id, { aspectLocked: !w.aspectLocked });
        });
        saveSnapshot();
      },
    });

    menuItems.push({ divider: true, label: '' });

    // Arrangement
    menuItems.push(
      {
        label: 'Bring to Front',
        icon: 'chevronUp',
        shortcut: 'Ctrl+]',
        action: () => {
          if (widgetId) bringToFront(widgetId);
        },
      },
      {
        label: 'Send to Back',
        icon: 'chevronDown',
        shortcut: 'Ctrl+[',
        action: () => {
          if (widgetId) sendToBack(widgetId);
        },
      },
      {
        label: 'Bring Forward',
        icon: 'chevronUp',
        shortcut: 'Ctrl+Shift+]',
        action: () => {
          if (widgetId) bringForward(widgetId);
        },
      },
      {
        label: 'Send Backward',
        icon: 'chevronDown',
        shortcut: 'Ctrl+Shift+[',
        action: () => {
          if (widgetId) sendBackward(widgetId);
        },
      },
      { divider: true, label: '' },
    );

    // Multi-select alignment
    if (isMultiSelect) {
      menuItems.push(
        {
          label: 'Align Left',
          icon: 'alignLeft',
          action: () => alignSelectedWidgets('left'),
        },
        {
          label: 'Align Center',
          icon: 'align',
          action: () => alignSelectedWidgets('center'),
        },
        {
          label: 'Align Right',
          icon: 'alignRight',
          action: () => alignSelectedWidgets('right'),
        },
        {
          label: 'Align Top',
          icon: 'alignTop',
          action: () => alignSelectedWidgets('top'),
        },
        {
          label: 'Align Bottom',
          icon: 'alignBottom',
          action: () => alignSelectedWidgets('bottom'),
        },
        { divider: true, label: '' },
      );

      if (selectedIds.length >= 3) {
        menuItems.push(
          {
            label: 'Distribute Horizontally',
            icon: 'distribute',
            action: () => distributeSelectedWidgets('horizontal'),
          },
          {
            label: 'Distribute Vertically',
            icon: 'rows',
            action: () => distributeSelectedWidgets('vertical'),
          },
          { divider: true, label: '' },
        );
      }
    }

    // Group/Ungroup
    if (isMultiSelect) {
      menuItems.push({
        label: 'Group',
        icon: 'group',
        shortcut: 'Ctrl+G',
        action: groupSelectedWidgets,
      });
    }
    if (widget?.groupId) {
      menuItems.push({
        label: 'Ungroup',
        icon: 'ungroup',
        shortcut: 'Ctrl+Shift+G',
        action: ungroupSelectedWidgets,
      });
    }

    menuItems.push(
      { divider: true, label: '' },
      {
        label: 'Duplicate',
        icon: 'copy',
        shortcut: 'Ctrl+D',
        action: duplicateSelectedWidgets,
      },
      {
        label: 'Delete',
        icon: 'delete',
        shortcut: 'Delete',
        action: deleteSelectedWidgets,
      },
    );
  } else {
    // No selection - canvas context menu
    menuItems.push(
      {
        label: 'Select All',
        icon: 'check',
        shortcut: 'Ctrl+A',
        action: selectAll,
      },
      {
        label: 'Deselect All',
        icon: 'close',
        shortcut: 'Escape',
        action: deselectAll,
      },
    );
  }

  return (
    <div
      ref={menuRef}
      style={{
        ...styles.menu,
        left: x,
        top: y,
      }}
      data-context-menu
    >
      {menuItems.map((item, index) => {
        if (item.divider) {
          return <div key={index} style={styles.divider} />;
        }

        return (
          <button
            key={index}
            style={{
              ...styles.menuItem,
              ...(item.disabled ? styles.menuItemDisabled : {}),
            }}
            onClick={() => executeAction(item.action)}
            disabled={item.disabled}
          >
            <span style={styles.menuItemIcon}>
              {item.icon && <SNIcon name={item.icon as any} size="sm" />}
            </span>
            <span style={styles.menuItemLabel}>{item.label}</span>
            {item.shortcut && (
              <span style={styles.menuItemShortcut}>{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  menu: {
    position: 'fixed',
    minWidth: 200,
    maxWidth: 280,
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.95))',
    borderRadius: 'var(--sn-radius-lg, 12px)',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.1))',
    boxShadow: 'var(--sn-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.4))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '6px 0',
    zIndex: 10000,
    overflow: 'hidden',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--sn-text-primary, #f0f4f8)',
    fontSize: 'var(--sn-text-sm, 12px)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 100ms ease-out',
    gap: 8,
  },
  menuItemDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  menuItemIcon: {
    width: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--sn-text-secondary, #a0aec0)',
  },
  menuItemLabel: {
    flex: 1,
  },
  menuItemShortcut: {
    fontSize: 'var(--sn-text-xs, 11px)',
    color: 'var(--sn-text-tertiary, #718096)',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    background: 'var(--sn-border-secondary, rgba(255, 255, 255, 0.06))',
    margin: '4px 8px',
  },
};

export default WidgetContextMenu;
