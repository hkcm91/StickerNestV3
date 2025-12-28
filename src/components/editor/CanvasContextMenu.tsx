/**
 * StickerNest v2 - Canvas Context Menu
 *
 * Right-click context menu for canvas widgets and entities.
 * Provides quick access to common operations.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../state/useCanvasStore';
import { useCanvasExtendedStore } from '../../state/useCanvasExtendedStore';
import { useClickOutside } from '../../hooks/useClickOutside';

// ============================================================================
// TYPES
// ============================================================================

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  action?: () => void;
}

interface CanvasContextMenuProps {
  position: { x: number; y: number } | null;
  targetWidgetId: string | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  cut: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  ),
  copy: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  paste: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  duplicate: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  ),
  delete: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  bringForward: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="12" height="12" rx="1" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" strokeDasharray="4 2" />
    </svg>
  ),
  sendBackward: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="12" height="12" rx="1" />
      <path d="M8 20h10a2 2 0 0 0 2-2V8" strokeDasharray="4 2" />
    </svg>
  ),
  toFront: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="10" y="10" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="4" y="4" width="10" height="10" rx="1" />
    </svg>
  ),
  toBack: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="10" y="10" width="10" height="10" rx="1" />
    </svg>
  ),
  lock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  unlock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  ),
  group: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  ungroup: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <line x1="10" y1="12" x2="14" y2="12" strokeDasharray="2 2" />
      <line x1="12" y1="10" x2="12" y2="14" strokeDasharray="2 2" />
    </svg>
  ),
};

// ============================================================================
// COMPONENT
// ============================================================================

export function CanvasContextMenu({
  position,
  targetWidgetId,
  onClose,
  onDelete,
  onDuplicate,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Store actions
  const selection = useCanvasStore(state => state.selection);
  const bringToFront = useCanvasStore(state => state.bringToFront);
  const sendToBack = useCanvasStore(state => state.sendToBack);
  const bringForward = useCanvasStore(state => state.bringForward);
  const sendBackward = useCanvasStore(state => state.sendBackward);
  const lockSelectedWidgets = useCanvasStore(state => state.lockSelectedWidgets);
  const unlockSelectedWidgets = useCanvasStore(state => state.unlockSelectedWidgets);
  const groupSelectedWidgets = useCanvasStore(state => state.groupSelectedWidgets);
  const ungroupSelectedWidgets = useCanvasStore(state => state.ungroupSelectedWidgets);
  const getWidget = useCanvasStore(state => state.getWidget);

  const isCanvasLocked = useCanvasExtendedStore(state => state.isCanvasLocked);

  // Get target widget info
  const targetWidget = targetWidgetId ? getWidget(targetWidgetId) : null;
  const hasSelection = selection.selectedIds.size > 0;
  const hasMultipleSelection = selection.selectedIds.size > 1;
  const isTargetLocked = targetWidget?.locked ?? false;
  const canvasLocked = isCanvasLocked();

  // Detect Mac for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl+';

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (!position || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust if overflowing right
    if (x + rect.width > viewportWidth - 10) {
      x = viewportWidth - rect.width - 10;
    }

    // Adjust if overflowing bottom
    if (y + rect.height > viewportHeight - 10) {
      y = viewportHeight - rect.height - 10;
    }

    setAdjustedPosition({ x: Math.max(10, x), y: Math.max(10, y) });
  }, [position]);

  // Close on click outside using shared hook
  useClickOutside(menuRef, onClose);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Build menu items
  const menuItems: MenuItem[] = [
    // Edit operations
    {
      id: 'cut',
      label: 'Cut',
      shortcut: `${cmdKey}X`,
      icon: Icons.cut,
      disabled: !hasSelection || canvasLocked,
    },
    {
      id: 'copy',
      label: 'Copy',
      shortcut: `${cmdKey}C`,
      icon: Icons.copy,
      disabled: !hasSelection,
    },
    {
      id: 'paste',
      label: 'Paste',
      shortcut: `${cmdKey}V`,
      icon: Icons.paste,
      disabled: canvasLocked,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      shortcut: `${cmdKey}D`,
      icon: Icons.duplicate,
      disabled: !hasSelection || canvasLocked,
      action: () => {
        if (targetWidgetId && onDuplicate) {
          onDuplicate(targetWidgetId);
        }
        onClose();
      },
    },
    { id: 'divider1', label: '', divider: true },

    // Z-index operations
    {
      id: 'bringToFront',
      label: 'Bring to Front',
      shortcut: `${cmdKey}]`,
      icon: Icons.toFront,
      disabled: !hasSelection || canvasLocked,
      action: () => {
        if (targetWidgetId) {
          bringToFront(targetWidgetId);
        }
        onClose();
      },
    },
    {
      id: 'bringForward',
      label: 'Bring Forward',
      shortcut: `${cmdKey}Shift+]`,
      icon: Icons.bringForward,
      disabled: !hasSelection || canvasLocked,
      action: () => {
        if (targetWidgetId) {
          bringForward(targetWidgetId);
        }
        onClose();
      },
    },
    {
      id: 'sendBackward',
      label: 'Send Backward',
      shortcut: `${cmdKey}Shift+[`,
      icon: Icons.sendBackward,
      disabled: !hasSelection || canvasLocked,
      action: () => {
        if (targetWidgetId) {
          sendBackward(targetWidgetId);
        }
        onClose();
      },
    },
    {
      id: 'sendToBack',
      label: 'Send to Back',
      shortcut: `${cmdKey}[`,
      icon: Icons.toBack,
      disabled: !hasSelection || canvasLocked,
      action: () => {
        if (targetWidgetId) {
          sendToBack(targetWidgetId);
        }
        onClose();
      },
    },
    { id: 'divider2', label: '', divider: true },

    // Lock/Unlock
    isTargetLocked
      ? {
          id: 'unlock',
          label: 'Unlock',
          shortcut: `${cmdKey}Shift+L`,
          icon: Icons.unlock,
          disabled: canvasLocked,
          action: () => {
            unlockSelectedWidgets();
            onClose();
          },
        }
      : {
          id: 'lock',
          label: 'Lock',
          shortcut: `${cmdKey}L`,
          icon: Icons.lock,
          disabled: !hasSelection || canvasLocked,
          action: () => {
            lockSelectedWidgets();
            onClose();
          },
        },

    // Group/Ungroup
    {
      id: 'group',
      label: 'Group',
      shortcut: `${cmdKey}G`,
      icon: Icons.group,
      disabled: !hasMultipleSelection || canvasLocked,
      action: () => {
        groupSelectedWidgets();
        onClose();
      },
    },
    {
      id: 'ungroup',
      label: 'Ungroup',
      shortcut: `${cmdKey}Shift+G`,
      icon: Icons.ungroup,
      disabled: !hasSelection || canvasLocked,
      action: () => {
        ungroupSelectedWidgets();
        onClose();
      },
    },
    { id: 'divider3', label: '', divider: true },

    // Delete
    {
      id: 'delete',
      label: 'Delete',
      shortcut: 'Del',
      icon: Icons.delete,
      disabled: !hasSelection || canvasLocked || isTargetLocked,
      danger: true,
      action: () => {
        if (targetWidgetId && onDelete) {
          onDelete(targetWidgetId);
        }
        onClose();
      },
    },
  ];

  // Don't render if no position
  if (!position || !adjustedPosition) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        minWidth: 200,
        backgroundColor: 'var(--sn-bg-secondary)',
        border: '1px solid var(--sn-accent-primary-30)',
        borderRadius: 8,
        padding: '4px 0',
        boxShadow: 'var(--sn-glass-shadow)',
        zIndex: 100000,
      }}
    >
      {menuItems.map((item) => {
        if (item.divider) {
          return (
            <div
              key={item.id}
              style={{
                height: 1,
                backgroundColor: 'var(--sn-accent-primary-15)',
                margin: '4px 8px',
              }}
            />
          );
        }

        return (
          <button
            key={item.id}
            onClick={item.action}
            disabled={item.disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              color: item.disabled
                ? 'var(--sn-text-muted)'
                : item.danger
                ? 'var(--sn-error)'
                : 'var(--sn-text-primary)',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              fontSize: 13,
              textAlign: 'left',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = 'var(--sn-accent-primary-15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ opacity: item.disabled ? 0.5 : 1, width: 14 }}>
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--sn-text-muted)',
                  fontFamily: 'monospace',
                }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default CanvasContextMenu;
