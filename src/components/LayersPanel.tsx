/**
 * StickerNest v2 - LayersPanel Component
 * Panel for managing layers, groups, and entity z-order
 * Features drag-and-drop reordering, visibility toggles, and grouping
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useLayerStore, useLayerActions, useGroupActions, useZOrderActions } from '../state/useLayerStore';
import {
  useSelectionStore,
  useSelectedEntities,
  useIsMultiSelectActive,
  useSelectionActions,
} from '../state/useSelectionStore';
import type { CanvasLayer, WidgetGroup, WidgetInstance, StickerInstance } from '../types/domain';
import { SNIcon } from '../shared-ui/SNIcon';

// ==================
// Types
// ==================

interface LayersPanelProps {
  canvasId: string;
  widgets: WidgetInstance[];
  stickers: StickerInstance[];
  isOpen?: boolean;
  onClose?: () => void;
}

interface LayerItemProps {
  layer: CanvasLayer;
  canvasId: string;
  isActive: boolean;
  onSelect: () => void;
}

interface EntityItemProps {
  entity: WidgetInstance | StickerInstance;
  type: 'widget' | 'sticker';
  isSelected: boolean;
  isMultiSelect: boolean;
  onSelect: (ctrlKey: boolean) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

interface GroupItemProps {
  group: WidgetGroup;
  canvasId: string;
  isSelected: boolean;
  children: React.ReactNode;
}

// ==================
// Entity Item Component
// ==================

const EntityItem: React.FC<EntityItemProps> = memo(({
  entity,
  type,
  isSelected,
  isMultiSelect,
  onSelect,
  onBringToFront,
  onSendToBack,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const entityName = 'name' in entity && entity.name
    ? entity.name
    : type === 'widget'
      ? `Widget ${entity.id.slice(0, 8)}`
      : `Sticker ${entity.id.slice(0, 8)}`;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(e.ctrlKey || e.metaKey);
  }, [onSelect]);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        marginLeft: 16,
        borderRadius: 'var(--sn-radius-sm)',
        background: isSelected
          ? isMultiSelect
            ? 'rgba(154, 205, 50, 0.2)'
            : 'rgba(139, 92, 246, 0.2)'
          : isHovered
            ? 'var(--sn-bg-tertiary)'
            : 'transparent',
        cursor: 'pointer',
        transition: 'var(--sn-transition-fast)',
        border: isSelected
          ? isMultiSelect
            ? '1px solid rgba(154, 205, 50, 0.5)'
            : '1px solid rgba(139, 92, 246, 0.5)'
          : '1px solid transparent',
      }}
    >
      {/* Entity icon */}
      <span style={{ fontSize: 12, opacity: 0.7 }}>
        {type === 'widget' ? '◻' : '⭐'}
      </span>

      {/* Entity name */}
      <span style={{
        flex: 1,
        fontSize: 12,
        color: isSelected ? 'var(--sn-text-primary)' : 'var(--sn-text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {entityName}
      </span>

      {/* Z-index indicator */}
      <span style={{
        fontSize: 10,
        color: 'var(--sn-text-muted)',
        minWidth: 24,
        textAlign: 'right',
      }}>
        z:{entity.zIndex}
      </span>

      {/* Z-order controls (visible on hover) */}
      {isHovered && (
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onBringToFront(); }}
            style={{
              background: 'var(--sn-bg-elevated)',
              border: 'none',
              borderRadius: 2,
              padding: '2px 4px',
              fontSize: 10,
              color: 'var(--sn-text-secondary)',
              cursor: 'pointer',
            }}
            title="Bring to Front"
          >
            ↑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSendToBack(); }}
            style={{
              background: 'var(--sn-bg-elevated)',
              border: 'none',
              borderRadius: 2,
              padding: '2px 4px',
              fontSize: 10,
              color: 'var(--sn-text-secondary)',
              cursor: 'pointer',
            }}
            title="Send to Back"
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );
});

EntityItem.displayName = 'EntityItem';

// ==================
// Layer Item Component
// ==================

const LayerItem: React.FC<LayerItemProps> = memo(({
  layer,
  canvasId,
  isActive,
  onSelect,
}) => {
  const { updateLayer, toggleLayerVisibility, toggleLayerLock } = useLayerActions();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditName(layer.name);
  }, [layer.name]);

  const handleNameSubmit = useCallback(() => {
    if (editName.trim() !== layer.name) {
      updateLayer(canvasId, layer.id, { name: editName.trim() });
    }
    setIsEditing(false);
  }, [canvasId, layer.id, layer.name, editName, updateLayer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(layer.name);
    }
  }, [handleNameSubmit, layer.name]);

  return (
    <div
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 'var(--sn-radius-md)',
        background: isActive
          ? 'rgba(139, 92, 246, 0.15)'
          : isHovered
            ? 'var(--sn-bg-tertiary)'
            : 'transparent',
        cursor: 'pointer',
        transition: 'var(--sn-transition-fast)',
        borderLeft: isActive ? '3px solid var(--sn-accent-primary)' : '3px solid transparent',
      }}
    >
      {/* Visibility toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(canvasId, layer.id); }}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: layer.visible ? 'var(--sn-text-primary)' : 'var(--sn-text-muted)',
          fontSize: 14,
        }}
        title={layer.visible ? 'Hide layer' : 'Show layer'}
      >
        {layer.visible ? '👁' : '👁‍🗨'}
      </button>

      {/* Lock toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleLayerLock(canvasId, layer.id); }}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: layer.locked ? 'var(--sn-warning)' : 'var(--sn-text-muted)',
          fontSize: 12,
        }}
        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
      >
        {layer.locked ? '🔒' : '🔓'}
      </button>

      {/* Layer name */}
      {isEditing ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            flex: 1,
            background: 'var(--sn-bg-tertiary)',
            border: '1px solid var(--sn-accent-primary)',
            borderRadius: 'var(--sn-radius-sm)',
            padding: '2px 6px',
            color: 'var(--sn-text-primary)',
            fontSize: 13,
            outline: 'none',
          }}
        />
      ) : (
        <span style={{
          flex: 1,
          color: layer.visible ? 'var(--sn-text-primary)' : 'var(--sn-text-muted)',
          fontWeight: isActive ? 600 : 400,
          fontSize: 13,
          opacity: layer.visible ? 1 : 0.5,
        }}>
          {layer.name}
        </span>
      )}

      {/* Opacity indicator */}
      {layer.opacity < 1 && (
        <span style={{
          fontSize: 10,
          color: 'var(--sn-text-muted)',
        }}>
          {Math.round(layer.opacity * 100)}%
        </span>
      )}
    </div>
  );
});

LayerItem.displayName = 'LayerItem';

// ==================
// Group Item Component
// ==================

const GroupItem: React.FC<GroupItemProps> = memo(({
  group,
  canvasId,
  isSelected,
  children,
}) => {
  const { toggleGroupCollapsed, deleteGroup } = useGroupActions();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        marginLeft: 8,
        marginBottom: 4,
      }}
    >
      {/* Group header */}
      <div
        onClick={() => toggleGroupCollapsed(canvasId, group.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          borderRadius: 'var(--sn-radius-sm)',
          background: isSelected
            ? 'rgba(154, 205, 50, 0.15)'
            : isHovered
              ? 'var(--sn-bg-tertiary)'
              : 'rgba(139, 92, 246, 0.08)',
          cursor: 'pointer',
          border: isSelected ? '1px solid rgba(154, 205, 50, 0.3)' : '1px solid transparent',
        }}
      >
        {/* Collapse indicator */}
        <span style={{
          fontSize: 10,
          color: 'var(--sn-text-muted)',
          transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s ease',
        }}>
          ▼
        </span>

        {/* Group icon */}
        <span style={{ fontSize: 12 }}>📁</span>

        {/* Group name */}
        <span style={{
          flex: 1,
          fontSize: 12,
          color: 'var(--sn-text-primary)',
          fontWeight: 500,
        }}>
          {group.name}
        </span>

        {/* Member count */}
        <span style={{
          fontSize: 10,
          color: 'var(--sn-text-muted)',
          background: 'var(--sn-bg-tertiary)',
          padding: '1px 6px',
          borderRadius: 10,
        }}>
          {group.widgetIds.length}
        </span>

        {/* Delete button (on hover) */}
        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteGroup(canvasId, group.id);
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: 'none',
              borderRadius: 2,
              padding: '2px 4px',
              fontSize: 10,
              color: 'var(--sn-error)',
              cursor: 'pointer',
            }}
            title="Ungroup"
          >
            ✕
          </button>
        )}
      </div>

      {/* Group children */}
      {!group.collapsed && (
        <div style={{ marginLeft: 8, marginTop: 4 }}>
          {children}
        </div>
      )}
    </div>
  );
});

GroupItem.displayName = 'GroupItem';

// ==================
// Selection Toolbar Component
// ==================

const SelectionToolbar: React.FC<{
  canvasId: string;
  selectedCount: number;
  onGroup: () => void;
  onUngroup: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}> = memo(({
  selectedCount,
  onGroup,
  onUngroup,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      padding: '8px 12px',
      borderBottom: '1px solid var(--sn-border-secondary)',
      background: 'var(--sn-bg-secondary)',
    }}>
      {/* Selection count */}
      <span style={{
        fontSize: 11,
        color: 'var(--sn-text-secondary)',
        marginRight: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        <span style={{
          background: 'var(--sn-accent-primary)',
          color: 'white',
          borderRadius: 10,
          padding: '1px 6px',
          fontSize: 10,
        }}>
          {selectedCount}
        </span>
        selected
      </span>

      {/* Grouping controls */}
      {selectedCount > 1 && (
        <button
          onClick={onGroup}
          style={{
            background: 'var(--sn-accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--sn-radius-sm)',
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title="Group selected (Ctrl+G)"
        >
          📁 Group
        </button>
      )}

      {/* Z-order controls */}
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          onClick={onBringToFront}
          style={toolbarButtonStyle}
          title="Bring to Front (Ctrl+Shift+])"
        >
          ⬆⬆
        </button>
        <button
          onClick={onBringForward}
          style={toolbarButtonStyle}
          title="Bring Forward (Ctrl+])"
        >
          ⬆
        </button>
        <button
          onClick={onSendBackward}
          style={toolbarButtonStyle}
          title="Send Backward (Ctrl+[)"
        >
          ⬇
        </button>
        <button
          onClick={onSendToBack}
          style={toolbarButtonStyle}
          title="Send to Back (Ctrl+Shift+[)"
        >
          ⬇⬇
        </button>
      </div>
    </div>
  );
});

SelectionToolbar.displayName = 'SelectionToolbar';

const toolbarButtonStyle: React.CSSProperties = {
  background: 'var(--sn-bg-tertiary)',
  color: 'var(--sn-text-secondary)',
  border: '1px solid var(--sn-border-secondary)',
  borderRadius: 'var(--sn-radius-sm)',
  padding: '4px 6px',
  fontSize: 10,
  cursor: 'pointer',
};

// ==================
// Main LayersPanel Component
// ==================

export const LayersPanel: React.FC<LayersPanelProps> = ({
  canvasId,
  widgets,
  stickers,
  isOpen = true,
  onClose,
}) => {
  // Layer store state and actions
  const layers = useLayerStore((s) => s.getLayers(canvasId));
  const groups = useLayerStore((s) => s.getGroups(canvasId));
  const activeLayer = useLayerStore((s) => s.getActiveLayer(canvasId));
  const { createLayer, setActiveLayer, initializeCanvas } = useLayerActions();
  const { createGroup, ungroup } = useGroupActions();
  const { bringToFront, sendToBack } = useZOrderActions();

  // Selection store state and actions
  const selectedEntities = useSelectedEntities();
  const isMultiSelect = useIsMultiSelectActive();
  const { handleEntityClick, clearSelection, getSelectedByType } = useSelectionActions();

  // Initialize canvas layers if needed
  React.useEffect(() => {
    initializeCanvas(canvasId);
  }, [canvasId, initializeCanvas]);

  // Sort entities by z-index (highest first for display)
  const sortedWidgets = useMemo(() =>
    [...widgets].sort((a, b) => b.zIndex - a.zIndex),
    [widgets]
  );

  const sortedStickers = useMemo(() =>
    [...stickers].sort((a, b) => b.zIndex - a.zIndex),
    [stickers]
  );

  // Check if entity is selected
  const isEntitySelected = useCallback((id: string) =>
    selectedEntities.some(e => e.id === id),
    [selectedEntities]
  );

  // Handle entity selection
  const handleEntitySelect = useCallback((id: string, type: 'widget' | 'sticker', ctrlKey: boolean) => {
    handleEntityClick(id, type, { ctrlKey, metaKey: ctrlKey });
  }, [handleEntityClick]);

  // Handle group creation
  const handleCreateGroup = useCallback(() => {
    const selectedWidgetIds = getSelectedByType('widget');
    if (selectedWidgetIds.length > 1) {
      const entityRefs = selectedWidgetIds.map(id => ({ id, type: 'widget' as const }));
      createGroup(canvasId, entityRefs);
    }
  }, [canvasId, createGroup, getSelectedByType]);

  // Handle layer creation
  const handleAddLayer = useCallback(() => {
    const newLayer = createLayer(canvasId);
    setActiveLayer(canvasId, newLayer.id);
  }, [canvasId, createLayer, setActiveLayer]);

  // Handle z-order changes
  const handleBringToFront = useCallback((id: string, type: 'widget' | 'sticker') => {
    const newZIndex = bringToFront(canvasId, { id, type });
    // The actual z-index update should be done by the widget/sticker store
    console.log(`Bring to front: ${type} ${id} -> z${newZIndex}`);
  }, [canvasId, bringToFront]);

  const handleSendToBack = useCallback((id: string, type: 'widget' | 'sticker') => {
    const newZIndex = sendToBack(canvasId, { id, type });
    console.log(`Send to back: ${type} ${id} -> z${newZIndex}`);
  }, [canvasId, sendToBack]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 280,
      background: 'var(--sn-glass-bg)',
      backdropFilter: 'var(--sn-glass-blur)',
      borderLeft: '1px solid var(--sn-border-primary)',
      boxShadow: 'var(--sn-elevation-panel)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--sn-border-secondary)',
      }}>
        <span style={{
          fontWeight: 600,
          color: 'var(--sn-text-primary)',
          fontSize: 14,
        }}>
          Layers & Objects
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handleAddLayer}
            style={{
              background: 'var(--sn-accent-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--sn-radius-sm)',
              padding: '4px 8px',
              fontSize: 11,
              cursor: 'pointer',
            }}
            title="Add new layer"
          >
            + Layer
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sn-text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                fontSize: 16,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Selection Toolbar */}
      <SelectionToolbar
        canvasId={canvasId}
        selectedCount={selectedEntities.length}
        onGroup={handleCreateGroup}
        onUngroup={() => {}}
        onBringToFront={() => {
          selectedEntities.forEach(e => handleBringToFront(e.id, e.type as 'widget' | 'sticker'));
        }}
        onSendToBack={() => {
          selectedEntities.forEach(e => handleSendToBack(e.id, e.type as 'widget' | 'sticker'));
        }}
        onBringForward={() => {}}
        onSendBackward={() => {}}
      />

      {/* Layers list */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px',
      }}>
        {/* Render layers */}
        {layers.map((layer) => (
          <div key={layer.id} style={{ marginBottom: 8 }}>
            <LayerItem
              layer={layer}
              canvasId={canvasId}
              isActive={activeLayer?.id === layer.id}
              onSelect={() => setActiveLayer(canvasId, layer.id)}
            />

            {/* Render groups in this layer */}
            {groups
              .filter(g => !g.parentGroupId)
              .map((group) => (
                <GroupItem
                  key={group.id}
                  group={group}
                  canvasId={canvasId}
                  isSelected={group.widgetIds.some(id => isEntitySelected(id))}
                >
                  {group.widgetIds.map(widgetId => {
                    const widget = widgets.find(w => w.id === widgetId);
                    if (!widget) return null;
                    return (
                      <EntityItem
                        key={widget.id}
                        entity={widget}
                        type="widget"
                        isSelected={isEntitySelected(widget.id)}
                        isMultiSelect={isMultiSelect}
                        onSelect={(ctrlKey) => handleEntitySelect(widget.id, 'widget', ctrlKey)}
                        onBringToFront={() => handleBringToFront(widget.id, 'widget')}
                        onSendToBack={() => handleSendToBack(widget.id, 'widget')}
                      />
                    );
                  })}
                </GroupItem>
              ))
            }

            {/* Render ungrouped widgets */}
            {sortedWidgets
              .filter(w => !w.groupId)
              .map((widget) => (
                <EntityItem
                  key={widget.id}
                  entity={widget}
                  type="widget"
                  isSelected={isEntitySelected(widget.id)}
                  isMultiSelect={isMultiSelect}
                  onSelect={(ctrlKey) => handleEntitySelect(widget.id, 'widget', ctrlKey)}
                  onBringToFront={() => handleBringToFront(widget.id, 'widget')}
                  onSendToBack={() => handleSendToBack(widget.id, 'widget')}
                />
              ))
            }

            {/* Render stickers */}
            {sortedStickers.map((sticker) => (
              <EntityItem
                key={sticker.id}
                entity={sticker}
                type="sticker"
                isSelected={isEntitySelected(sticker.id)}
                isMultiSelect={isMultiSelect}
                onSelect={(ctrlKey) => handleEntitySelect(sticker.id, 'sticker', ctrlKey)}
                onBringToFront={() => handleBringToFront(sticker.id, 'sticker')}
                onSendToBack={() => handleSendToBack(sticker.id, 'sticker')}
              />
            ))}
          </div>
        ))}

        {/* Empty state */}
        {layers.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
            color: 'var(--sn-text-muted)',
            fontSize: 13,
          }}>
            No layers yet. Click "+ Layer" to create one.
          </div>
        )}
      </div>

      {/* Footer with keyboard hints */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--sn-border-secondary)',
        fontSize: 10,
        color: 'var(--sn-text-muted)',
      }}>
        <div>Ctrl+Click: Multi-select</div>
        <div>Ctrl+G: Group selected</div>
        <div>Ctrl+Shift+G: Ungroup</div>
      </div>
    </div>
  );
};

export default LayersPanel;
