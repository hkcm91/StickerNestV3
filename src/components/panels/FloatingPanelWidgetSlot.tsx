/**
 * StickerNest v2 - FloatingPanelWidgetSlot Component
 * Renders a widget slot within a floating panel
 * Supports reordering, minimizing, and undocking
 */

import React, { useState, useCallback, useRef } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { usePanelsStore } from '../../state/usePanelsStore';
import { useCanvasStore } from '../../state/useCanvasStore';
import type { PanelId, WidgetInstanceId, DockedPanelWidgetState } from '../../types/panels';

// ============================================
// Types
// ============================================

interface FloatingPanelWidgetSlotProps {
  panelId: PanelId;
  tabId: string;
  widgetId: WidgetInstanceId;
  dockedState: DockedPanelWidgetState;
  index: number;
  isLast: boolean;
  children: React.ReactNode;
  onUndock?: (widgetId: WidgetInstanceId) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    position: 'relative' as const,
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    overflow: 'hidden',
    transition: 'all 200ms ease-out',
  } as React.CSSProperties,
  containerHover: {
    background: 'rgba(0, 0, 0, 0.3)',
  } as React.CSSProperties,
  containerDragOver: {
    boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.8)',
    background: 'rgba(139, 92, 246, 0.1)',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'grab',
  } as React.CSSProperties,
  headerDragging: {
    cursor: 'grabbing',
    opacity: 0.8,
  } as React.CSSProperties,
  dragHandle: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--sn-text-muted, #718096)',
    cursor: 'grab',
  } as React.CSSProperties,
  title: {
    flex: 1,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--sn-text-secondary, #a0aec0)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  } as React.CSSProperties,
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    padding: 0,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: 'var(--sn-text-muted, #718096)',
    cursor: 'pointer',
    transition: 'all 100ms ease-out',
  } as React.CSSProperties,
  actionButtonHover: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'var(--sn-text-secondary, #a0aec0)',
  } as React.CSSProperties,
  content: {
    position: 'relative' as const,
    minHeight: 100,
  } as React.CSSProperties,
  contentMinimized: {
    display: 'none',
  } as React.CSSProperties,
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    color: 'var(--sn-text-muted, #718096)',
    fontSize: 12,
  } as React.CSSProperties,
  dropIndicator: {
    position: 'absolute' as const,
    left: 8,
    right: 8,
    height: 2,
    background: 'var(--sn-accent-primary, #8b5cf6)',
    borderRadius: 1,
    zIndex: 10,
  } as React.CSSProperties,
};

// ============================================
// Component
// ============================================

export const FloatingPanelWidgetSlot: React.FC<FloatingPanelWidgetSlotProps> = ({
  panelId,
  tabId,
  widgetId,
  dockedState,
  index,
  isLast,
  children,
  onUndock,
  onReorder,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const removeWidgetFromPanelTab = usePanelsStore((s) => s.removeWidgetFromPanelTab);
  const getPanel = usePanelsStore((s) => s.getPanel);
  const reorderWidgetsInTab = usePanelsStore((s) => s.reorderWidgetsInTab);

  const updateWidget = useCanvasStore((s) => s.updateWidget);
  const getWidget = useCanvasStore((s) => s.getWidget);

  const panel = getPanel(panelId);
  const widget = getWidget(widgetId);
  const widgetName = widget?.name || widget?.widgetDefId?.split('/').pop() || 'Widget';

  // Handle undock
  const handleUndock = useCallback(() => {
    // Get the docked state before removing
    const state = removeWidgetFromPanelTab(panelId, tabId, widgetId);

    if (state && widget) {
      // Restore widget to original position
      updateWidget(widgetId, {
        position: state.originalPosition,
        width: state.originalSize.width,
        height: state.originalSize.height,
        zIndex: state.originalZIndex,
        rotation: state.originalRotation,
      });
    }

    if (onUndock) {
      onUndock(widgetId);
    }
  }, [panelId, tabId, widgetId, widget, removeWidgetFromPanelTab, updateWidget, onUndock]);

  // Handle minimize toggle
  const handleToggleMinimize = useCallback(() => {
    // This would update the docked state's minimized property
    // For now, we'll implement this in the store if needed
  }, []);

  // Drag handlers for reordering
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/panel-widget', JSON.stringify({
      widgetId,
      panelId,
      tabId,
      index,
    }));
    setIsDragging(true);
  }, [widgetId, panelId, tabId, index]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    setDragOverPosition(e.clientY < midY ? 'before' : 'after');
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverPosition(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPosition(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/panel-widget'));

      if (data.panelId !== panelId || data.tabId !== tabId) {
        // Cross-panel/tab drop - not implemented yet
        return;
      }

      if (data.index === index) return;

      // Calculate target index based on drop position
      let targetIndex = index;
      if (dragOverPosition === 'after') {
        targetIndex = data.index < index ? index : index + 1;
      } else {
        targetIndex = data.index > index ? index : index;
      }

      if (onReorder) {
        onReorder(data.index, targetIndex);
      } else {
        // Reorder in store
        const widgetIds = panel?.widgetsByTab[tabId] || [];
        const newOrder = [...widgetIds];
        const [removed] = newOrder.splice(data.index, 1);
        newOrder.splice(targetIndex > data.index ? targetIndex - 1 : targetIndex, 0, removed);
        reorderWidgetsInTab(panelId, tabId, newOrder);
      }
    } catch {
      // Invalid drag data
    }
  }, [panelId, tabId, index, panel, dragOverPosition, onReorder, reorderWidgetsInTab]);

  const containerStyle: React.CSSProperties = {
    ...styles.container,
    ...(isHovered ? styles.containerHover : {}),
    ...(dragOverPosition ? styles.containerDragOver : {}),
    opacity: isDragging ? 0.5 : 1,
    height: dockedState?.dockedHeight != null ? dockedState.dockedHeight : 'auto',
  };

  const headerStyle: React.CSSProperties = {
    ...styles.header,
    ...(isDragging ? styles.headerDragging : {}),
  };

  const getActionStyle = (action: string): React.CSSProperties => ({
    ...styles.actionButton,
    ...(hoveredAction === action ? styles.actionButtonHover : {}),
  });

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop indicator - before */}
      {dragOverPosition === 'before' && (
        <div style={{ ...styles.dropIndicator, top: 0 }} />
      )}

      {/* Widget header */}
      <div
        style={headerStyle}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={styles.dragHandle}>
          <SNIcon name="grip" size="sm" />
        </div>

        <span style={styles.title} title={widgetName}>
          {widgetName}
        </span>

        <div style={styles.actions}>
          {/* Minimize button */}
          <button
            style={getActionStyle('minimize')}
            onClick={handleToggleMinimize}
            onMouseEnter={() => setHoveredAction('minimize')}
            onMouseLeave={() => setHoveredAction(null)}
            title={dockedState.minimized ? 'Expand' : 'Minimize'}
          >
            <SNIcon
              name={dockedState.minimized ? 'chevronDown' : 'chevronUp'}
              size={14}
            />
          </button>

          {/* Undock button */}
          <button
            style={getActionStyle('undock')}
            onClick={handleUndock}
            onMouseEnter={() => setHoveredAction('undock')}
            onMouseLeave={() => setHoveredAction(null)}
            title="Undock widget"
          >
            <SNIcon name="undock" size={14} />
          </button>
        </div>
      </div>

      {/* Widget content */}
      <div
        style={{
          ...styles.content,
          ...(dockedState?.minimized ? styles.contentMinimized : {}),
        }}
        id={`panel-widget-slot-${widgetId}`}
      >
        {children || (
          <div style={styles.placeholder}>
            Widget content
          </div>
        )}
      </div>

      {/* Drop indicator - after */}
      {dragOverPosition === 'after' && (
        <div style={{ ...styles.dropIndicator, bottom: 0 }} />
      )}
    </div>
  );
};

export default FloatingPanelWidgetSlot;
