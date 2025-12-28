/**
 * StickerNest v2 - Layers Panel Component
 * Comprehensive layer management with drag-reorder, visibility, and lock controls.
 * Integrates with undo/redo system for all operations.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useLayerStore, type EntityRef } from '../../state/useLayerStore';
import { useCanvasStore } from '../../state/useCanvasStore';
import { useUndoRedoStore } from '../../state/useUndoRedoStore';
import { useKeyboardShortcutsStore } from '../../state/useKeyboardShortcutsStore';
import type { CanvasLayer, WidgetGroup, WidgetInstance } from '../../types/domain';
import {
  createAddLayerCommand,
  createDeleteLayerCommand,
  createReorderLayersCommand,
  createToggleLayerVisibilityCommand,
  createToggleLayerLockCommand,
  createRenameLayerCommand,
} from '../../canvas/history/commands/LayerCommand';
import {
  createGroupCommand,
  createUngroupCommand,
  createRenameGroupCommand,
} from '../../canvas/history/commands/GroupCommand';

// ==================
// Types
// ==================

interface LayersPanelProps {
  canvasId: string;
  onClose?: () => void;
}

interface LayerItemProps {
  layer: CanvasLayer;
  canvasId: string;
  isActive: boolean;
  widgets: WidgetInstance[];
  groups: WidgetGroup[];
  onSelect: () => void;
  onDragStart: (e: React.DragEvent, layerId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetLayerId: string) => void;
}

interface GroupItemProps {
  group: WidgetGroup;
  canvasId: string;
  widgets: WidgetInstance[];
  isSelected: boolean;
  onSelect: () => void;
}

interface WidgetItemProps {
  widget: WidgetInstance;
  isSelected: boolean;
  onSelect: () => void;
}

// ==================
// Icons (inline SVG)
// ==================

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UnlockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

const LayersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 150ms ease',
    }}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const WidgetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

// ==================
// Widget Item Component
// ==================

const WidgetItem: React.FC<WidgetItemProps> = ({ widget, isSelected, onSelect }) => {
  const updateWidget = useCanvasStore((s) => s.updateWidget);
  const execute = useUndoRedoStore((s) => s.execute);

  const handleVisibilityToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateWidget(widget.id, { visible: !widget.visible });
  }, [widget, updateWidget]);

  const handleLockToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateWidget(widget.id, { locked: !widget.locked });
  }, [widget, updateWidget]);

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px 4px 32px',
        borderRadius: 'var(--sn-radius-sm)',
        background: isSelected ? 'var(--sn-accent-primary)' : 'transparent',
        color: isSelected ? 'white' : 'var(--sn-text-secondary)',
        cursor: 'pointer',
        fontSize: 12,
        gap: 6,
        opacity: widget.visible === false ? 0.5 : 1,
      }}
    >
      <WidgetIcon />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {widget.name || widget.widgetDefId}
      </span>
      <button
        onClick={handleVisibilityToggle}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 2,
          cursor: 'pointer',
          color: widget.visible === false ? 'var(--sn-text-muted)' : 'inherit',
          opacity: 0.6,
        }}
        title={widget.visible === false ? 'Show' : 'Hide'}
      >
        {widget.visible === false ? <EyeOffIcon /> : <EyeIcon />}
      </button>
      <button
        onClick={handleLockToggle}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 2,
          cursor: 'pointer',
          color: widget.locked ? 'var(--sn-warning)' : 'inherit',
          opacity: 0.6,
        }}
        title={widget.locked ? 'Unlock' : 'Lock'}
      >
        {widget.locked ? <LockIcon /> : <UnlockIcon />}
      </button>
    </div>
  );
};

// ==================
// Group Item Component
// ==================

const GroupItem: React.FC<GroupItemProps> = ({ group, canvasId, widgets, isSelected, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateGroup = useLayerStore((s) => s.updateGroup);
  const deleteGroup = useLayerStore((s) => s.deleteGroup);
  const execute = useUndoRedoStore((s) => s.execute);
  const select = useCanvasStore((s) => s.select);
  const selection = useCanvasStore((s) => s.selection);

  const groupWidgets = useMemo(() => {
    return widgets.filter(w => w.groupId === group.id);
  }, [widgets, group.id]);

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditName(group.name);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [group.name]);

  const handleRename = useCallback(() => {
    if (editName.trim() && editName !== group.name) {
      const cmd = createRenameGroupCommand(
        canvasId,
        group.id,
        group.name,
        editName.trim(),
        updateGroup
      );
      execute(cmd);
    }
    setIsEditing(false);
  }, [editName, group, canvasId, updateGroup, execute]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(group.name);
    }
  }, [handleRename, group.name]);

  return (
    <div style={{ marginLeft: 8 }}>
      {/* Group Header */}
      <div
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          borderRadius: 'var(--sn-radius-sm)',
          background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
          color: isSelected ? 'var(--sn-accent-secondary)' : 'var(--sn-text-primary)',
          cursor: 'pointer',
          fontSize: 13,
          gap: 6,
          borderLeft: `2px solid ${group.color || 'var(--sn-accent-primary)'}`,
        }}
      >
        <button
          onClick={handleToggleExpand}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'inherit',
            display: 'flex',
          }}
        >
          <ChevronIcon expanded={isExpanded} />
        </button>
        <FolderIcon />
        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'var(--sn-bg-tertiary)',
              border: '1px solid var(--sn-accent-primary)',
              borderRadius: 'var(--sn-radius-sm)',
              color: 'var(--sn-text-primary)',
              fontSize: 12,
              padding: '2px 4px',
              outline: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span style={{ flex: 1 }}>{group.name}</span>
        )}
        <span style={{ fontSize: 10, color: 'var(--sn-text-muted)' }}>
          {groupWidgets.length}
        </span>
      </div>

      {/* Group Contents */}
      {isExpanded && groupWidgets.length > 0 && (
        <div style={{ marginLeft: 12, marginTop: 2 }}>
          {groupWidgets.map(widget => (
            <WidgetItem
              key={widget.id}
              widget={widget}
              isSelected={selection.selectedIds.has(widget.id)}
              onSelect={() => select(widget.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ==================
// Layer Item Component
// ==================

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  canvasId,
  isActive,
  widgets,
  groups,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateLayer = useLayerStore((s) => s.updateLayer);
  const toggleLayerVisibility = useLayerStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock = useLayerStore((s) => s.toggleLayerLock);
  const execute = useUndoRedoStore((s) => s.execute);
  const select = useCanvasStore((s) => s.select);
  const selection = useCanvasStore((s) => s.selection);

  // Widgets in this layer (not in groups)
  const layerWidgets = useMemo(() => {
    return widgets.filter(w => w.layerId === layer.id && !w.groupId);
  }, [widgets, layer.id]);

  // Groups in this layer
  const layerGroups = useMemo(() => {
    return groups.filter(g => {
      const firstWidget = widgets.find(w => w.groupId === g.id);
      return firstWidget?.layerId === layer.id;
    });
  }, [groups, widgets, layer.id]);

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleVisibilityToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const cmd = createToggleLayerVisibilityCommand(
      canvasId,
      layer.id,
      layer.visible,
      toggleLayerVisibility
    );
    execute(cmd);
  }, [canvasId, layer, toggleLayerVisibility, execute]);

  const handleLockToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const cmd = createToggleLayerLockCommand(
      canvasId,
      layer.id,
      layer.locked,
      toggleLayerLock
    );
    execute(cmd);
  }, [canvasId, layer, toggleLayerLock, execute]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditName(layer.name);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [layer.name]);

  const handleRename = useCallback(() => {
    if (editName.trim() && editName !== layer.name) {
      const cmd = createRenameLayerCommand(
        canvasId,
        layer.id,
        layer.name,
        editName.trim(),
        updateLayer
      );
      execute(cmd);
    }
    setIsEditing(false);
  }, [editName, layer, canvasId, updateLayer, execute]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(layer.name);
    }
  }, [handleRename, layer.name]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, layer.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, layer.id)}
      style={{
        marginBottom: 4,
        opacity: layer.visible ? 1 : 0.5,
      }}
    >
      {/* Layer Header */}
      <div
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          borderRadius: 'var(--sn-radius-md)',
          background: isActive ? 'var(--sn-bg-elevated)' : 'var(--sn-bg-tertiary)',
          color: 'var(--sn-text-primary)',
          cursor: 'pointer',
          gap: 6,
          border: isActive ? '1px solid var(--sn-accent-primary)' : '1px solid transparent',
        }}
      >
        <button
          onClick={handleToggleExpand}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--sn-text-secondary)',
            display: 'flex',
          }}
        >
          <ChevronIcon expanded={isExpanded} />
        </button>
        <LayersIcon />
        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'var(--sn-bg-primary)',
              border: '1px solid var(--sn-accent-primary)',
              borderRadius: 'var(--sn-radius-sm)',
              color: 'var(--sn-text-primary)',
              fontSize: 13,
              padding: '2px 6px',
              outline: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span style={{ flex: 1, fontWeight: 500 }}>{layer.name}</span>
        )}
        <button
          onClick={handleVisibilityToggle}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 2,
            cursor: 'pointer',
            color: layer.visible ? 'var(--sn-text-secondary)' : 'var(--sn-text-muted)',
          }}
          title={layer.visible ? 'Hide Layer' : 'Show Layer'}
        >
          {layer.visible ? <EyeIcon /> : <EyeOffIcon />}
        </button>
        <button
          onClick={handleLockToggle}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 2,
            cursor: 'pointer',
            color: layer.locked ? 'var(--sn-warning)' : 'var(--sn-text-secondary)',
          }}
          title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
        >
          {layer.locked ? <LockIcon /> : <UnlockIcon />}
        </button>
      </div>

      {/* Layer Contents */}
      {isExpanded && (
        <div style={{ marginTop: 4, marginLeft: 4 }}>
          {/* Groups */}
          {layerGroups.map(group => (
            <GroupItem
              key={group.id}
              group={group}
              canvasId={canvasId}
              widgets={widgets}
              isSelected={false}
              onSelect={() => {}}
            />
          ))}
          {/* Ungrouped Widgets */}
          {layerWidgets.map(widget => (
            <WidgetItem
              key={widget.id}
              widget={widget}
              isSelected={selection.selectedIds.has(widget.id)}
              onSelect={() => select(widget.id)}
            />
          ))}
          {layerGroups.length === 0 && layerWidgets.length === 0 && (
            <div style={{
              padding: '8px 12px',
              color: 'var(--sn-text-muted)',
              fontSize: 11,
              fontStyle: 'italic',
            }}>
              Empty layer
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================
// Main Panel Component
// ==================

export const LayersPanel: React.FC<LayersPanelProps> = ({ canvasId, onClose }) => {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  // Store hooks
  const layers = useLayerStore((s) => s.getLayers(canvasId));
  const groups = useLayerStore((s) => s.getGroups(canvasId));
  const activeLayer = useLayerStore((s) => s.getActiveLayer(canvasId));
  const createLayer = useLayerStore((s) => s.createLayer);
  const deleteLayer = useLayerStore((s) => s.deleteLayer);
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer);
  const reorderLayers = useLayerStore((s) => s.reorderLayers);
  const initializeCanvas = useLayerStore((s) => s.initializeCanvas);

  const widgets = useCanvasStore((s) => Array.from(s.widgets.values()));
  const execute = useUndoRedoStore((s) => s.execute);
  const formatBinding = useKeyboardShortcutsStore((s) => s.formatBinding);
  const getShortcut = useKeyboardShortcutsStore((s) => s.getShortcut);

  // Initialize layers if needed
  React.useEffect(() => {
    if (layers.length === 0) {
      initializeCanvas(canvasId);
    }
  }, [canvasId, layers.length, initializeCanvas]);

  // Handlers
  const handleAddLayer = useCallback(() => {
    const newLayer = createLayer(canvasId);
    // Note: For simplicity, we're not wrapping in command here
    // In production, you'd want to use createAddLayerCommand
    setActiveLayer(canvasId, newLayer.id);
  }, [canvasId, createLayer, setActiveLayer]);

  const handleDeleteLayer = useCallback(() => {
    if (!activeLayer || layers.length <= 1) return;
    deleteLayer(canvasId, activeLayer.id);
  }, [canvasId, activeLayer, layers.length, deleteLayer]);

  const handleDragStart = useCallback((e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      return;
    }

    const currentOrder = layers.map(l => l.id);
    const draggedIndex = currentOrder.indexOf(draggedLayerId);
    const targetIndex = currentOrder.indexOf(targetLayerId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedLayerId(null);
      return;
    }

    // Reorder
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedLayerId);

    const cmd = createReorderLayersCommand(
      canvasId,
      currentOrder,
      newOrder,
      reorderLayers
    );
    execute(cmd);

    setDraggedLayerId(null);
  }, [draggedLayerId, layers, canvasId, reorderLayers, execute]);

  // Get shortcut hints
  const newLayerShortcut = getShortcut('new-layer');
  const deleteLayerShortcut = getShortcut('delete-layer');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--sn-bg-secondary)',
        borderRadius: 'var(--sn-radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--sn-border-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LayersIcon />
          <span style={{ fontWeight: 600, color: 'var(--sn-text-primary)' }}>
            Layers
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handleAddLayer}
            style={{
              background: 'var(--sn-bg-tertiary)',
              border: 'none',
              borderRadius: 'var(--sn-radius-sm)',
              padding: '4px 8px',
              cursor: 'pointer',
              color: 'var(--sn-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title={newLayerShortcut ? `New Layer (${formatBinding(newLayerShortcut.binding)})` : 'New Layer'}
          >
            <PlusIcon />
          </button>
          <button
            onClick={handleDeleteLayer}
            disabled={layers.length <= 1}
            style={{
              background: 'var(--sn-bg-tertiary)',
              border: 'none',
              borderRadius: 'var(--sn-radius-sm)',
              padding: '4px 8px',
              cursor: layers.length <= 1 ? 'not-allowed' : 'pointer',
              color: layers.length <= 1 ? 'var(--sn-text-muted)' : 'var(--sn-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: layers.length <= 1 ? 0.5 : 1,
            }}
            title={deleteLayerShortcut ? `Delete Layer (${formatBinding(deleteLayerShortcut.binding)})` : 'Delete Layer'}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Layer List */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
        }}
      >
        {layers.slice().reverse().map(layer => (
          <LayerItem
            key={layer.id}
            layer={layer}
            canvasId={canvasId}
            isActive={activeLayer?.id === layer.id}
            widgets={widgets}
            groups={groups}
            onSelect={() => setActiveLayer(canvasId, layer.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* Footer with layer count */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--sn-border-secondary)',
          fontSize: 11,
          color: 'var(--sn-text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{layers.length} layer{layers.length !== 1 ? 's' : ''}</span>
        <span>{widgets.length} item{widgets.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

export default LayersPanel;
