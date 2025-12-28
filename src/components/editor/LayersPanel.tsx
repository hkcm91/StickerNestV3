/**
 * StickerNest v2 - Layers Panel
 *
 * A panel for managing widget z-index ordering and visibility.
 */

import React, { useCallback, useMemo } from 'react';
import type { WidgetInstance } from '../../types/domain';
import type { WidgetManifest } from '../../types/manifest';
import { useEditorStore } from '../../editor/EditorContext';

// ============================================================================
// TYPES
// ============================================================================

interface LayersPanelProps {
  widgets: WidgetInstance[];
  manifests: Map<string, WidgetManifest>;
  onSelect: (id: string, additive?: boolean) => void;
  onReorder: (id: string, newZIndex: number) => void;
  onVisibilityToggle: (id: string, visible: boolean) => void;
  onLockToggle: (id: string, locked: boolean) => void;
  onDelete: (id: string) => void;
}

interface LayerItemProps {
  widget: WidgetInstance;
  manifest?: WidgetManifest;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (additive?: boolean) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onVisibilityToggle: () => void;
  onLockToggle: () => void;
  onDelete: () => void;
}

// ============================================================================
// LAYER ITEM
// ============================================================================

const LayerItem: React.FC<LayerItemProps> = ({
  widget,
  manifest,
  isSelected,
  isHovered,
  onSelect,
  onBringForward,
  onSendBackward,
  onVisibilityToggle,
  onLockToggle,
  onDelete,
}) => {
  const isLocked = widget.locked || false;
  const isVisible = widget.state?.visible !== false;

  return (
    <div
      className={`layer-item ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isLocked ? 'locked' : ''}`}
      onClick={(e) => onSelect(e.shiftKey || e.metaKey || e.ctrlKey)}
    >
      <div className="layer-icon">
        {manifest?.kind === 'display' && '🖼'}
        {manifest?.kind === 'interactive' && '🎮'}
        {manifest?.kind === 'container' && '📦'}
        {!manifest?.kind && '📝'}
      </div>

      <div className="layer-info">
        <div className="layer-name">{manifest?.name || 'Widget'}</div>
        <div className="layer-id">{widget.id.slice(0, 8)}...</div>
      </div>

      <div className="layer-actions">
        <button
          className={`action-btn ${!isVisible ? 'inactive' : ''}`}
          onClick={(e) => { e.stopPropagation(); onVisibilityToggle(); }}
          title={isVisible ? 'Hide' : 'Show'}
        >
          {isVisible ? '👁' : '👁‍🗨'}
        </button>

        <button
          className={`action-btn ${isLocked ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onLockToggle(); }}
          title={isLocked ? 'Unlock' : 'Lock'}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>

        <div className="reorder-btns">
          <button
            className="action-btn small"
            onClick={(e) => { e.stopPropagation(); onBringForward(); }}
            title="Bring Forward"
          >
            ▲
          </button>
          <button
            className="action-btn small"
            onClick={(e) => { e.stopPropagation(); onSendBackward(); }}
            title="Send Backward"
          >
            ▼
          </button>
        </div>

        <button
          className="action-btn delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
        >
          🗑
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LayersPanel: React.FC<LayersPanelProps> = ({
  widgets,
  manifests,
  onSelect,
  onReorder,
  onVisibilityToggle,
  onLockToggle,
  onDelete,
}) => {
  const {
    layersPanelOpen,
    toggleLayersPanel,
    selection,
    setHovered,
  } = useEditorStore();

  // Sort widgets by z-index (highest first for display)
  const sortedWidgets = useMemo(() =>
    [...widgets].sort((a, b) => b.zIndex - a.zIndex),
    [widgets]
  );

  const handleBringForward = useCallback((widget: WidgetInstance) => {
    const maxZ = Math.max(...widgets.map(w => w.zIndex), 0);
    onReorder(widget.id, maxZ + 1);
  }, [widgets, onReorder]);

  const handleSendBackward = useCallback((widget: WidgetInstance) => {
    const minZ = Math.min(...widgets.map(w => w.zIndex), 0);
    onReorder(widget.id, Math.max(0, minZ - 1));
  }, [widgets, onReorder]);

  if (!layersPanelOpen) {
    return null;
  }

  return (
    <div className="layers-panel">
      <style>{`
        .layers-panel {
          position: absolute;
          left: 16px;
          top: 60px;
          width: 260px;
          max-height: calc(100vh - 100px);
          background: rgba(30, 30, 46, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: white;
          z-index: 1000;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .panel-header {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .panel-title {
          flex: 1;
          font-weight: 600;
          font-size: 14px;
        }

        .widget-count {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          margin-right: 8px;
        }

        .close-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .layers-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .layer-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          margin-bottom: 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .layer-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .layer-item.selected {
          background: rgba(79, 209, 197, 0.15);
          border-color: rgba(79, 209, 197, 0.3);
        }

        .layer-item.hovered {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .layer-item.locked {
          opacity: 0.6;
        }

        .layer-icon {
          font-size: 16px;
          width: 24px;
          text-align: center;
        }

        .layer-info {
          flex: 1;
          min-width: 0;
        }

        .layer-name {
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .layer-id {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          font-family: monospace;
        }

        .layer-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .layer-item:hover .layer-actions {
          opacity: 1;
        }

        .layer-item.selected .layer-actions {
          opacity: 1;
        }

        .action-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          border-radius: 4px;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .action-btn.inactive {
          color: rgba(255, 255, 255, 0.2);
        }

        .action-btn.active {
          color: #f6ad55;
        }

        .action-btn.delete:hover {
          background: rgba(220, 38, 38, 0.2);
          color: #fc8181;
        }

        .action-btn.small {
          width: 18px;
          height: 18px;
          font-size: 10px;
        }

        .reorder-btns {
          display: flex;
          flex-direction: column;
        }

        .empty-state {
          padding: 32px 16px;
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
        }

        .empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .empty-text {
          font-size: 12px;
        }
      `}</style>

      <div className="panel-header">
        <span className="panel-title">Layers</span>
        <span className="widget-count">{widgets.length}</span>
        <button className="close-btn" onClick={toggleLayersPanel}>
          ×
        </button>
      </div>

      <div className="layers-list">
        {sortedWidgets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-text">No widgets on canvas</div>
          </div>
        ) : (
          sortedWidgets.map((widget) => (
            <LayerItem
              key={widget.id}
              widget={widget}
              manifest={manifests.get(widget.widgetDefId)}
              isSelected={selection.selectedIds.has(widget.id)}
              isHovered={selection.hoveredId === widget.id}
              onSelect={(additive) => onSelect(widget.id, additive)}
              onBringForward={() => handleBringForward(widget)}
              onSendBackward={() => handleSendBackward(widget)}
              onVisibilityToggle={() => onVisibilityToggle(widget.id, widget.state?.visible === false)}
              onLockToggle={() => onLockToggle(widget.id, !widget.locked)}
              onDelete={() => onDelete(widget.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LayersPanel;
