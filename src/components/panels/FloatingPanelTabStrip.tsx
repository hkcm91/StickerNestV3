/**
 * StickerNest v2 - FloatingPanelTabStrip Component
 * Tab navigation for floating panels with CRUD operations
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import type { PanelTab, PanelId } from '../../types/panels';
import { usePanelsStore } from '../../state/usePanelsStore';

// ============================================
// Types
// ============================================

interface FloatingPanelTabStripProps {
  panelId: PanelId;
  tabs: PanelTab[];
  activeTab: string;
  isDropTarget?: boolean;
  dropTargetTabId?: string | null;
  onTabClick?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabRename?: (tabId: string, newLabel: string) => void;
  onAddTab?: () => void;
  onReorderTabs?: (tabIds: string[]) => void;
}

interface TabItemProps {
  tab: PanelTab;
  isActive: boolean;
  isDropTarget: boolean;
  canClose: boolean;
  onClick: () => void;
  onClose: () => void;
  onRename: (newLabel: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: '4px 8px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    minHeight: 36,
    overflow: 'hidden',
  } as React.CSSProperties,
  tabsWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    overflow: 'auto',
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
  } as React.CSSProperties,
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: 'var(--sn-text-secondary, #a0aec0)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'all 100ms ease-out',
    whiteSpace: 'nowrap' as const,
    minWidth: 60,
    maxWidth: 120,
    position: 'relative' as const,
  } as React.CSSProperties,
  tabActive: {
    background: 'rgba(139, 92, 246, 0.3)',
    color: 'var(--sn-text-primary, #f0f4f8)',
  } as React.CSSProperties,
  tabHover: {
    background: 'rgba(255, 255, 255, 0.1)',
  } as React.CSSProperties,
  tabDropTarget: {
    background: 'rgba(139, 92, 246, 0.5)',
    boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.8)',
  } as React.CSSProperties,
  tabLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  } as React.CSSProperties,
  tabClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    padding: 0,
    border: 'none',
    borderRadius: 3,
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    opacity: 0.6,
    transition: 'all 100ms ease-out',
  } as React.CSSProperties,
  tabCloseHover: {
    opacity: 1,
    background: 'rgba(255, 255, 255, 0.2)',
  } as React.CSSProperties,
  addButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    padding: 0,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: 'var(--sn-text-muted, #718096)',
    cursor: 'pointer',
    transition: 'all 100ms ease-out',
    flexShrink: 0,
  } as React.CSSProperties,
  addButtonHover: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'var(--sn-text-secondary, #a0aec0)',
  } as React.CSSProperties,
  editInput: {
    width: '100%',
    padding: '2px 4px',
    border: '1px solid rgba(139, 92, 246, 0.5)',
    borderRadius: 3,
    background: 'rgba(0, 0, 0, 0.3)',
    color: 'var(--sn-text-primary, #f0f4f8)',
    fontSize: 12,
    outline: 'none',
  } as React.CSSProperties,
};

// ============================================
// Tab Item Component
// ============================================

const TabItem: React.FC<TabItemProps> = ({
  tab,
  isActive,
  isDropTarget,
  canClose,
  onClick,
  onClose,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tab.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(tab.label);
  }, [tab.label]);

  const handleEditSubmit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== tab.label) {
      onRename(trimmed);
    }
    setIsEditing(false);
  }, [editValue, tab.label, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(tab.label);
    }
  }, [handleEditSubmit, tab.label]);

  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  }, [onClose]);

  const tabStyle: React.CSSProperties = {
    ...styles.tab,
    ...(isActive ? styles.tabActive : {}),
    ...(isHovered && !isActive ? styles.tabHover : {}),
    ...(isDropTarget ? styles.tabDropTarget : {}),
  };

  const closeStyle: React.CSSProperties = {
    ...styles.tabClose,
    ...(isCloseHovered ? styles.tabCloseHover : {}),
  };

  return (
    <div
      style={tabStyle}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
    >
      {tab.icon && (
        <SNIcon name={tab.icon as any} size="xs" />
      )}

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditSubmit}
          onKeyDown={handleKeyDown}
          style={styles.editInput}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span style={styles.tabLabel} title={tab.label}>
          {tab.label}
        </span>
      )}

      {canClose && !isEditing && (
        <button
          style={closeStyle}
          onClick={handleCloseClick}
          onMouseEnter={() => setIsCloseHovered(true)}
          onMouseLeave={() => setIsCloseHovered(false)}
          title="Close tab"
        >
          <SNIcon name="close" size={10} />
        </button>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const FloatingPanelTabStrip: React.FC<FloatingPanelTabStripProps> = ({
  panelId,
  tabs,
  activeTab,
  isDropTarget = false,
  dropTargetTabId,
  onTabClick,
  onTabClose,
  onTabRename,
  onAddTab,
  onReorderTabs,
}) => {
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  const switchTab = usePanelsStore((s) => s.switchTab);
  const removeTab = usePanelsStore((s) => s.removeTab);
  const renameTab = usePanelsStore((s) => s.renameTab);
  const addTab = usePanelsStore((s) => s.addTab);
  const reorderTabs = usePanelsStore((s) => s.reorderTabs);

  const handleTabClick = useCallback((tabId: string) => {
    if (onTabClick) {
      onTabClick(tabId);
    } else {
      switchTab(panelId, tabId);
    }
  }, [panelId, onTabClick, switchTab]);

  const handleTabClose = useCallback((tabId: string) => {
    if (onTabClose) {
      onTabClose(tabId);
    } else {
      removeTab(panelId, tabId);
    }
  }, [panelId, onTabClose, removeTab]);

  const handleTabRename = useCallback((tabId: string, newLabel: string) => {
    if (onTabRename) {
      onTabRename(tabId, newLabel);
    } else {
      renameTab(panelId, tabId, newLabel);
    }
  }, [panelId, onTabRename, renameTab]);

  const handleAddTab = useCallback(() => {
    if (onAddTab) {
      onAddTab();
    } else {
      addTab(panelId);
    }
  }, [panelId, onAddTab, addTab]);

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();

    if (!draggedTabId || draggedTabId === targetTabId) {
      setDraggedTabId(null);
      return;
    }

    // Reorder tabs
    const currentOrder = tabs.map(t => t.id);
    const draggedIndex = currentOrder.indexOf(draggedTabId);
    const targetIndex = currentOrder.indexOf(targetTabId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTabId(null);
      return;
    }

    // Create new order
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTabId);

    if (onReorderTabs) {
      onReorderTabs(newOrder);
    } else {
      reorderTabs(panelId, newOrder);
    }

    setDraggedTabId(null);
  }, [panelId, tabs, draggedTabId, onReorderTabs, reorderTabs]);

  // Don't render if only one tab
  if (tabs.length <= 1 && !isDropTarget) {
    return null;
  }

  const addButtonStyle: React.CSSProperties = {
    ...styles.addButton,
    ...(isAddHovered ? styles.addButtonHover : {}),
  };

  return (
    <div style={styles.container} role="tablist">
      <div style={styles.tabsWrapper}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTab}
            isDropTarget={isDropTarget && tab.id === dropTargetTabId}
            canClose={tabs.length > 1 && (tab.closeable !== false) && !tab.pinned}
            onClick={() => handleTabClick(tab.id)}
            onClose={() => handleTabClose(tab.id)}
            onRename={(newLabel) => handleTabRename(tab.id, newLabel)}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, tab.id)}
          />
        ))}
      </div>

      <button
        style={addButtonStyle}
        onClick={handleAddTab}
        onMouseEnter={() => setIsAddHovered(true)}
        onMouseLeave={() => setIsAddHovered(false)}
        title="Add tab"
      >
        <SNIcon name="add" size="sm" />
      </button>
    </div>
  );
};

export default FloatingPanelTabStrip;
