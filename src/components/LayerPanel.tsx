/**
 * StickerNest v2 - Layer Panel Component
 * Displays canvas layers/widgets with drag reordering, lock, and visibility controls
 * Updated with glass morphism design system
 * Now mobile-responsive with bottom sheet layout on mobile devices
 */

import React, { useState, useRef, useCallback } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';
import type { WidgetInstance, WidgetGroup } from '../types/domain';
import { useViewport, useTouchDevice, useSafeArea, useScrollLock } from '../hooks/useResponsive';

interface LayerItem {
  id: string;
  type: 'widget' | 'group';
  name: string;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  groupId?: string;
  children?: LayerItem[];
}

interface LayerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ isOpen, onClose }) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Responsive hooks
  const { isMobile, isTablet } = useViewport();
  const touch = useTouchDevice();
  const safeArea = useSafeArea();

  // Determine layout mode
  const useMobileLayout = isMobile || isTablet;

  // Lock scroll when mobile panel is open
  useScrollLock(isOpen && useMobileLayout);

  // Use primitive selectors to track changes without causing infinite loops
  const widgetCount = useCanvasStore(state => state.widgets.size);
  const groupCount = useCanvasStore(state => state.groups.size);
  const selection = useCanvasStore(state => state.selection);
  const {
    toggleLock,
    toggleVisibility,
    select,
    selectMultiple,
    reorderLayers,
    updateWidget,
    updateGroup,
    groupSelectedWidgets,
    ungroupSelectedWidgets,
    bringToFront,
    sendToBack,
    removeWidget,
  } = useCanvasStore();

  // Build layer tree - use getState() inside to avoid Map reference deps
  const buildLayerTree = useCallback((): LayerItem[] => {
    const layers: LayerItem[] = [];
    const groupedWidgetIds = new Set<string>();

    // Get data from store at calculation time (avoids Map reference deps)
    const storeState = useCanvasStore.getState();
    const widgets = Array.from(storeState.widgets.values());
    const groups = Array.from(storeState.groups.values());

    // Add groups with their children
    groups.forEach(group => {
      group.widgetIds.forEach(id => groupedWidgetIds.add(id));

      const children = group.widgetIds
        .map(id => widgets.find(w => w.id === id))
        .filter((w): w is WidgetInstance => w !== undefined)
        .map(w => ({
          id: w.id,
          type: 'widget' as const,
          name: w.name || getWidgetDisplayName(w),
          zIndex: w.zIndex,
          locked: w.locked ?? false,
          visible: w.visible !== false,
          groupId: group.id,
        }))
        .sort((a, b) => b.zIndex - a.zIndex);

      layers.push({
        id: group.id,
        type: 'group',
        name: group.name,
        zIndex: group.zIndex,
        locked: group.locked ?? false,
        visible: group.visible !== false,
        children,
      });
    });

    // Add ungrouped widgets
    widgets
      .filter(w => !groupedWidgetIds.has(w.id))
      .forEach(w => {
        layers.push({
          id: w.id,
          type: 'widget',
          name: w.name || getWidgetDisplayName(w),
          zIndex: w.zIndex,
          locked: w.locked ?? false,
          visible: w.visible !== false,
        });
      });

    // Sort by zIndex (highest first)
    return layers.sort((a, b) => b.zIndex - a.zIndex);
  }, [widgetCount, groupCount]); // Only re-run when counts change

  const getWidgetDisplayName = (widget: WidgetInstance): string => {
    // Extract a nice display name from widget definition ID
    const parts = widget.widgetDefId.split('/');
    return parts[parts.length - 1] || widget.id.slice(0, 8);
  };

  const layers = buildLayerTree();

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== itemId) {
      setDragOverItem(itemId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Get current order of top-level items
    const currentOrder = layers.map(l => l.id);
    const draggedIndex = currentOrder.indexOf(draggedItem);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove dragged item and insert at target position
      currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedItem);
      reorderLayers(currentOrder);
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleItemClick = (item: LayerItem, e: React.MouseEvent) => {
    if (item.locked) return;

    if (e.shiftKey) {
      // Add to selection
      const currentIds = Array.from(selection.selectedIds);
      if (!currentIds.includes(item.id)) {
        selectMultiple([...currentIds, item.id]);
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle in selection
      const currentIds = Array.from(selection.selectedIds);
      if (currentIds.includes(item.id)) {
        selectMultiple(currentIds.filter(id => id !== item.id));
      } else {
        selectMultiple([...currentIds, item.id]);
      }
    } else {
      // Single select
      select(item.id);
    }
  };

  const handleDoubleClick = (item: LayerItem) => {
    setEditingName(item.id);
    setEditName(item.name);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleNameChange = (itemId: string, type: 'widget' | 'group') => {
    if (editName.trim()) {
      if (type === 'widget') {
        updateWidget(itemId, { name: editName.trim() });
      } else {
        updateGroup(itemId, { name: editName.trim() });
      }
    }
    setEditingName(null);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, type: 'widget' | 'group') => {
    if (e.key === 'Enter') {
      handleNameChange(itemId, type);
    } else if (e.key === 'Escape') {
      setEditingName(null);
      setEditName('');
    }
  };

  const toggleGroupExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleGroup = () => {
    groupSelectedWidgets();
  };

  const handleUngroup = () => {
    ungroupSelectedWidgets();
  };

  const renderLayerItem = (item: LayerItem, depth = 0) => {
    const isSelected = selection.selectedIds.has(item.id);
    const isDragging = draggedItem === item.id;
    const isDragOver = dragOverItem === item.id;
    const isExpanded = expandedGroups.has(item.id);
    const isEditing = editingName === item.id;

    return (
      <div key={item.id}>
        <div
          className="sn-layer-item"
          draggable={!item.locked && !isEditing}
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item.id)}
          onDragEnd={handleDragEnd}
          onClick={(e) => handleItemClick(item, e)}
          onDoubleClick={() => handleDoubleClick(item)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            paddingLeft: 12 + depth * 20,
            backgroundColor: isSelected
              ? 'var(--sn-accent-primary-20)'
              : isDragOver
              ? 'var(--sn-accent-primary-10)'
              : 'transparent',
            borderBottom: '1px solid var(--sn-border-secondary)',
            borderLeft: isSelected ? '2px solid var(--sn-accent-primary)' : '2px solid transparent',
            cursor: item.locked ? 'not-allowed' : 'pointer',
            opacity: isDragging ? 0.5 : item.visible ? 1 : 0.4,
          }}
        >
          {/* Expand/collapse for groups */}
          {item.type === 'group' && item.children && item.children.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupExpanded(item.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--sn-text-tertiary)',
                cursor: 'pointer',
                padding: 0,
                width: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <SNIcon name="chevronRight" size="xs" />
            </button>
          ) : (
            <span style={{ width: 16 }} />
          )}

          {/* Drag handle */}
          <span style={{
            color: 'var(--sn-text-tertiary)',
            cursor: item.locked ? 'not-allowed' : 'grab',
            opacity: item.locked ? 0.3 : 0.6,
          }}>
            <SNIcon name="grip" size="sm" />
          </span>

          {/* Icon */}
          <span style={{ color: item.type === 'group' ? 'var(--sn-rainbow-orange)' : 'var(--sn-accent-primary)' }}>
            <SNIcon name={item.type === 'group' ? 'folder' : 'widget'} size="sm" />
          </span>

          {/* Name */}
          {isEditing ? (
            <input
              ref={inputRef}
              className="sn-input-animated"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => handleNameChange(item.id, item.type)}
              onKeyDown={(e) => handleKeyDown(e, item.id, item.type)}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                background: 'var(--sn-bg-primary)',
                border: '1px solid var(--sn-accent-primary)',
                borderRadius: 'var(--sn-radius-sm)',
                padding: '4px 8px',
                color: 'var(--sn-text-primary)',
                fontSize: 12,
                outline: 'none',
              }}
            />
          ) : (
            <span
              style={{
                flex: 1,
                fontSize: 12,
                color: isSelected ? 'var(--sn-text-primary)' : 'var(--sn-text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.name}
              {item.type === 'group' && item.children && (
                <span style={{ color: 'var(--sn-text-tertiary)', marginLeft: 6, fontSize: 10 }}>
                  ({item.children.length})
                </span>
              )}
            </span>
          )}

          {/* Visibility toggle */}
          <SNIconButton
            icon={item.visible ? 'visible' : 'hidden'}
            variant="ghost"
            size="sm"
            tooltip={item.visible ? 'Hide' : 'Show'}
            active={!item.visible}
            onClick={(e) => {
              e.stopPropagation();
              toggleVisibility(item.id);
            }}
          />

          {/* Lock toggle */}
          <SNIconButton
            icon={item.locked ? 'lock' : 'unlock'}
            variant="ghost"
            size="sm"
            tooltip={item.locked ? 'Unlock' : 'Lock'}
            active={item.locked}
            onClick={(e) => {
              e.stopPropagation();
              toggleLock(item.id);
            }}
          />
        </div>

        {/* Group children */}
        {item.type === 'group' && isExpanded && item.children && (
          <div style={{ background: 'var(--sn-glass-bg-light)' }}>
            {item.children.map(child => renderLayerItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const selectedCount = selection.selectedIds.size;
  const hasGroupedSelection = Array.from(selection.selectedIds).some(id => {
    const widget = useCanvasStore.getState().widgets.get(id);
    return widget?.groupId;
  });

  // Responsive panel styles
  const panelStyle: React.CSSProperties = useMobileLayout
    ? {
        // Mobile: Bottom sheet
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '60vh',
        width: '100%',
        backgroundColor: 'var(--sn-glass-bg-heavy)',
        borderRadius: '16px 16px 0 0',
        boxShadow: 'var(--sn-shadow-lg)',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(var(--sn-glass-blur-lg))',
        WebkitBackdropFilter: 'blur(var(--sn-glass-blur-lg))',
        border: '1px solid var(--sn-glass-border)',
        borderBottom: 'none',
        paddingBottom: safeArea.bottom || 0,
      }
    : {
        position: 'fixed',
        top: 60,
        right: 16,
        width: 300,
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: 'var(--sn-glass-bg)',
        borderRadius: 'var(--sn-radius-xl)',
        boxShadow: 'var(--sn-shadow-lg)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(var(--sn-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--sn-glass-blur))',
        border: '1px solid var(--sn-glass-border)',
      };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {useMobileLayout && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--sn-bg-overlay)',
            zIndex: 1000,
          }}
        />
      )}
      <div
        className={useMobileLayout ? 'sn-panel-enter-up' : 'sn-panel-enter-fade'}
        style={panelStyle}
      >
        {/* Mobile drag handle indicator */}
        {useMobileLayout && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 0 4px',
          }}>
            <div style={{
              width: 36,
              height: 4,
              background: 'var(--sn-border-primary)',
              borderRadius: 2,
            }} />
          </div>
        )}
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--sn-border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--sn-glass-bg-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SNIcon name="layers" size="sm" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--sn-text-primary)' }}>
            Layers
          </span>
        </div>
        <SNIconButton
          icon="close"
          variant="ghost"
          size="sm"
          tooltip="Close panel"
          onClick={onClose}
        />
      </div>

      {/* Toolbar */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--sn-border-secondary)',
          display: 'flex',
          gap: 4,
          justifyContent: 'center',
        }}
      >
        <SNIconButton
          icon="group"
          variant={selectedCount >= 2 ? 'glass' : 'ghost'}
          size="sm"
          tooltip="Group selected (Ctrl+G)"
          disabled={selectedCount < 2}
          onClick={handleGroup}
        />
        <SNIconButton
          icon="ungroup"
          variant={hasGroupedSelection ? 'glass' : 'ghost'}
          size="sm"
          tooltip="Ungroup (Ctrl+Shift+G)"
          disabled={!hasGroupedSelection}
          onClick={handleUngroup}
        />
        <div style={{ width: 1, height: 24, background: 'var(--sn-border-primary)', margin: '0 4px' }} />
        <SNIconButton
          icon="chevronUp"
          variant="ghost"
          size="sm"
          tooltip="Bring to Front (Ctrl+])"
          disabled={selectedCount === 0}
          onClick={() => {
            if (selection.primaryId) bringToFront(selection.primaryId);
          }}
        />
        <SNIconButton
          icon="chevronDown"
          variant="ghost"
          size="sm"
          tooltip="Send to Back (Ctrl+[)"
          disabled={selectedCount === 0}
          onClick={() => {
            if (selection.primaryId) sendToBack(selection.primaryId);
          }}
        />
        <div style={{ width: 1, height: 24, background: 'var(--sn-border-primary)', margin: '0 4px' }} />
        <SNIconButton
          icon="delete"
          variant="ghost"
          size="sm"
          tooltip="Delete selected (Del)"
          disabled={selectedCount === 0}
          onClick={() => {
            if (selection.primaryId) removeWidget(selection.primaryId);
          }}
        />
      </div>

      {/* Layer list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {layers.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--sn-text-tertiary)',
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <SNIcon name="layers" size="xl" />
            <span>No layers yet</span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>Add widgets to see them here</span>
          </div>
        ) : (
          layers.map(layer => renderLayerItem(layer))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--sn-border-primary)',
          fontSize: 'var(--sn-text-xs)',
          color: 'var(--sn-text-tertiary)',
          textAlign: 'center',
          background: 'var(--sn-glass-bg-light)',
        }}
      >
        {layers.length} layer{layers.length !== 1 ? 's' : ''} • {selectedCount} selected
      </div>
    </div>
    </>
  );
};

export default LayerPanel;
