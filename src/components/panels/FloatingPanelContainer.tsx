/**
 * StickerNest v2 - FloatingPanelContainer Component
 * Main container component for floating panels
 * Features: drag, resize, tabs, widget hosting, z-index management
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { usePanelsStore, useIsPanelDropTarget } from '../../state/usePanelsStore';
import { useCanvasStore } from '../../state/useCanvasStore';
import { FloatingPanelTabStrip } from './FloatingPanelTabStrip';
import { FloatingPanelWidgetSlot } from './FloatingPanelWidgetSlot';
import type { FloatingPanel, PanelId, WidgetInstanceId } from '../../types/panels';
import type { WidgetPosition } from '../../types/domain';

// ============================================
// Types
// ============================================

interface FloatingPanelContainerProps {
  panel: FloatingPanel;
  canvasBounds?: { width: number; height: number };
  onClose?: (panelId: PanelId) => void;
}

type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
type InteractionMode = 'idle' | 'dragging' | 'resizing';

// ============================================
// Constants
// ============================================

const HEADER_HEIGHT = 40;
const HANDLE_SIZE = 8;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

// ============================================
// Styles
// ============================================

const createStyles = (panel: FloatingPanel, isDropTarget: boolean, isFocused: boolean) => ({
  container: {
    position: 'absolute' as const,
    left: panel.maximized ? 0 : (panel.position?.x ?? 0),
    top: panel.maximized ? 0 : (panel.position?.y ?? 0),
    width: panel.maximized ? '100%' : (panel.size?.width ?? 300),
    height: panel.maximized
      ? '100%'
      : panel.collapsed
        ? HEADER_HEIGHT
        : (panel.size?.height ?? 200),
    background: panel.style?.background || 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(37, 37, 56, 0.95) 100%)',
    border: panel.style?.border || '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: panel.maximized ? 0 : (panel.style?.borderRadius ?? 12),
    boxShadow: isDropTarget
      ? '0 0 0 3px rgba(139, 92, 246, 0.8), 0 10px 40px rgba(0, 0, 0, 0.4)'
      : (panel.style?.boxShadow || '0 10px 40px rgba(0, 0, 0, 0.3)'),
    backdropFilter: panel.style?.backdropFilter || 'blur(12px)',
    WebkitBackdropFilter: panel.style?.backdropFilter || 'blur(12px)',
    display: panel.visible ? 'flex' : 'none',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    zIndex: panel.zIndex,
    transition: panel.maximized ? 'all 200ms ease-out' : 'box-shadow 150ms ease-out',
    outline: isFocused ? '2px solid rgba(139, 92, 246, 0.5)' : 'none',
    outlineOffset: 2,
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    height: HEADER_HEIGHT,
    minHeight: HEADER_HEIGHT,
    background: panel.style?.headerBackground || 'rgba(0, 0, 0, 0.4)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: panel.locked ? 'default' : 'grab',
    userSelect: 'none' as const,
  } as React.CSSProperties,
  headerDragging: {
    cursor: 'grabbing',
  } as React.CSSProperties,
  icon: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--sn-accent-primary, #8b5cf6)',
  } as React.CSSProperties,
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: 600,
    color: panel.style?.headerTextColor || '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  } as React.CSSProperties,
  headerButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    padding: 0,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: 'var(--sn-text-secondary, #a0aec0)',
    cursor: 'pointer',
    transition: 'all 100ms ease-out',
  } as React.CSSProperties,
  headerButtonHover: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'var(--sn-text-primary, #f0f4f8)',
  } as React.CSSProperties,
  headerButtonClose: {
    color: 'var(--sn-text-secondary, #a0aec0)',
  } as React.CSSProperties,
  headerButtonCloseHover: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
  } as React.CSSProperties,
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } as React.CSSProperties,
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: panel.layoutMode === 'flex-row' ? 'row' as const : 'column' as const,
    gap: 8,
  } as React.CSSProperties,
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: '100%',
    minHeight: 100,
    color: 'var(--sn-text-muted, #718096)',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  emptyIcon: {
    opacity: 0.5,
  } as React.CSSProperties,
  emptyText: {
    fontSize: 13,
    fontWeight: 500,
  } as React.CSSProperties,
  emptySubtext: {
    fontSize: 11,
    opacity: 0.7,
  } as React.CSSProperties,
  dropOverlay: {
    position: 'absolute' as const,
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(139, 92, 246, 0.15)',
    border: '2px dashed rgba(139, 92, 246, 0.6)',
    borderRadius: '0 0 12px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--sn-accent-primary, #8b5cf6)',
    fontSize: 14,
    fontWeight: 600,
    pointerEvents: 'none' as const,
    zIndex: 100,
  } as React.CSSProperties,
  resizeHandle: {
    position: 'absolute' as const,
    background: 'transparent',
    zIndex: 10,
  } as React.CSSProperties,
});

// ============================================
// Component
// ============================================

export const FloatingPanelContainer: React.FC<FloatingPanelContainerProps> = ({
  panel,
  canvasBounds,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const dragStartRef = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);

  const resizeStartRef = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Store hooks
  const updatePanelPosition = usePanelsStore((s) => s.updatePanelPosition);
  const updatePanelSize = usePanelsStore((s) => s.updatePanelSize);
  const focusPanel = usePanelsStore((s) => s.focusPanel);
  const togglePanelCollapsed = usePanelsStore((s) => s.togglePanelCollapsed);
  const togglePanelMaximized = usePanelsStore((s) => s.togglePanelMaximized);
  const deletePanel = usePanelsStore((s) => s.deletePanel);
  const getWidgetsInPanelTab = usePanelsStore((s) => s.getWidgetsInPanelTab);
  const getDockedWidgetState = usePanelsStore((s) => s.getDockedWidgetState);
  const focusedPanelId = usePanelsStore((s) => s.focusedPanelId);
  const addWidgetToPanelTab = usePanelsStore((s) => s.addWidgetToPanelTab);
  const setDropTargetPanel = usePanelsStore((s) => s.setDropTargetPanel);

  const getWidget = useCanvasStore((s) => s.getWidget);

  const isDropTarget = useIsPanelDropTarget(panel.id);
  const isFocused = focusedPanelId === panel.id;

  // Get widgets in current tab
  const widgetIds = getWidgetsInPanelTab(panel.id, panel.activeTab);

  const styles = createStyles(panel, isDropTarget, isFocused);

  // ==================
  // Event Handlers
  // ==================

  // Focus panel on click
  const handleContainerClick = useCallback(() => {
    focusPanel(panel.id);
  }, [panel.id, focusPanel]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (panel.locked || panel.maximized) return;

    e.preventDefault();
    e.stopPropagation();

    focusPanel(panel.id);
    setInteractionMode('dragging');

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: panel.position.x,
      startY: panel.position.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [panel.id, panel.locked, panel.maximized, panel.position, focusPanel]);

  // Handle drag move
  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (interactionMode !== 'dragging' || !dragStartRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    let newX = dragStartRef.current.startX + deltaX;
    let newY = dragStartRef.current.startY + deltaY;

    // Constrain to canvas bounds
    if (canvasBounds) {
      newX = Math.max(0, Math.min(newX, canvasBounds.width - panel.size.width));
      newY = Math.max(0, Math.min(newY, canvasBounds.height - panel.size.height));
    }

    updatePanelPosition(panel.id, { x: newX, y: newY });
  }, [interactionMode, panel.id, panel.size, canvasBounds, updatePanelPosition]);

  // Handle drag end
  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (interactionMode === 'dragging') {
      setInteractionMode('idle');
      dragStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [interactionMode]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    if (panel.locked || panel.collapsed || panel.maximized) return;

    e.preventDefault();
    e.stopPropagation();

    setInteractionMode('resizing');
    setActiveHandle(handle);

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: panel.position.x,
      startY: panel.position.y,
      startWidth: panel.size.width,
      startHeight: panel.size.height,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [panel.locked, panel.collapsed, panel.maximized, panel.position, panel.size]);

  // Handle resize move
  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (interactionMode !== 'resizing' || !resizeStartRef.current || !activeHandle) return;

    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;

    let newWidth = resizeStartRef.current.startWidth;
    let newHeight = resizeStartRef.current.startHeight;
    let newX = resizeStartRef.current.startX;
    let newY = resizeStartRef.current.startY;

    const minWidth = panel.minSize?.width || MIN_WIDTH;
    const minHeight = panel.minSize?.height || MIN_HEIGHT;
    const maxWidth = panel.maxSize?.width || (canvasBounds?.width || 800);
    const maxHeight = panel.maxSize?.height || (canvasBounds?.height || 600);

    // Handle horizontal resize
    if (activeHandle.includes('e')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.startWidth + deltaX));
    } else if (activeHandle.includes('w')) {
      const widthDelta = Math.min(deltaX, resizeStartRef.current.startWidth - minWidth);
      newWidth = resizeStartRef.current.startWidth - widthDelta;
      newX = resizeStartRef.current.startX + widthDelta;
    }

    // Handle vertical resize
    if (activeHandle.includes('s')) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.startHeight + deltaY));
    } else if (activeHandle.includes('n')) {
      const heightDelta = Math.min(deltaY, resizeStartRef.current.startHeight - minHeight);
      newHeight = resizeStartRef.current.startHeight - heightDelta;
      newY = resizeStartRef.current.startY + heightDelta;
    }

    updatePanelPosition(panel.id, { x: newX, y: newY });
    updatePanelSize(panel.id, { width: newWidth, height: newHeight });
  }, [interactionMode, activeHandle, panel.id, panel.minSize, panel.maxSize, canvasBounds, updatePanelPosition, updatePanelSize]);

  // Handle resize end
  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (interactionMode === 'resizing') {
      setInteractionMode('idle');
      setActiveHandle(null);
      resizeStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [interactionMode]);

  // Combined pointer handlers
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (interactionMode === 'dragging') {
      handleDragMove(e);
    } else if (interactionMode === 'resizing') {
      handleResizeMove(e);
    }
  }, [interactionMode, handleDragMove, handleResizeMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (interactionMode === 'dragging') {
      handleDragEnd(e);
    } else if (interactionMode === 'resizing') {
      handleResizeEnd(e);
    }
  }, [interactionMode, handleDragEnd, handleResizeEnd]);

  // Header button handlers
  const handleCollapse = useCallback(() => {
    togglePanelCollapsed(panel.id);
  }, [panel.id, togglePanelCollapsed]);

  const handleMaximize = useCallback(() => {
    togglePanelMaximized(panel.id);
  }, [panel.id, togglePanelMaximized]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose(panel.id);
    } else {
      deletePanel(panel.id);
    }
  }, [panel.id, onClose, deletePanel]);

  // Drag and drop for widget docking
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!panel.acceptsDrops) return;

    e.dataTransfer.dropEffect = 'move';
    setDropTargetPanel(panel.id, panel.activeTab);
  }, [panel.id, panel.activeTab, panel.acceptsDrops, setDropTargetPanel]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the container entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDropTargetPanel(null, null);
    }
  }, [setDropTargetPanel]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetPanel(null, null);

    if (!panel.acceptsDrops) return;

    // Check for widget ID from WidgetFrame
    const widgetId = e.dataTransfer.getData('text/widget-id');
    if (widgetId) {
      const widget = getWidget(widgetId);
      if (widget) {
        addWidgetToPanelTab(panel.id, panel.activeTab, widgetId, {
          position: widget.position,
          size: { width: widget.width, height: widget.height },
          zIndex: widget.zIndex,
          rotation: widget.rotation,
        });
      }
    }
  }, [panel.id, panel.activeTab, panel.acceptsDrops, getWidget, addWidgetToPanelTab, setDropTargetPanel]);

  // Get cursor for resize handles
  const getResizeCursor = (handle: ResizeHandle): string => {
    const cursors: Record<ResizeHandle, string> = {
      n: 'ns-resize',
      ne: 'nesw-resize',
      e: 'ew-resize',
      se: 'nwse-resize',
      s: 'ns-resize',
      sw: 'nesw-resize',
      w: 'ew-resize',
      nw: 'nwse-resize',
    };
    return cursors[handle];
  };

  // Render resize handles
  const renderResizeHandles = () => {
    if (panel.locked || panel.collapsed || panel.maximized) return null;

    const handles: ResizeHandle[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

    const handlePositions: Record<ResizeHandle, React.CSSProperties> = {
      n: { top: 0, left: HANDLE_SIZE, right: HANDLE_SIZE, height: HANDLE_SIZE },
      ne: { top: 0, right: 0, width: HANDLE_SIZE, height: HANDLE_SIZE },
      e: { top: HANDLE_SIZE, right: 0, width: HANDLE_SIZE, bottom: HANDLE_SIZE },
      se: { bottom: 0, right: 0, width: HANDLE_SIZE, height: HANDLE_SIZE },
      s: { bottom: 0, left: HANDLE_SIZE, right: HANDLE_SIZE, height: HANDLE_SIZE },
      sw: { bottom: 0, left: 0, width: HANDLE_SIZE, height: HANDLE_SIZE },
      w: { top: HANDLE_SIZE, left: 0, width: HANDLE_SIZE, bottom: HANDLE_SIZE },
      nw: { top: 0, left: 0, width: HANDLE_SIZE, height: HANDLE_SIZE },
    };

    return handles.map((handle) => (
      <div
        key={handle}
        onPointerDown={(e) => handleResizeStart(e, handle)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          ...styles.resizeHandle,
          ...handlePositions[handle],
          cursor: getResizeCursor(handle),
        }}
      />
    ));
  };

  // Header button style helper
  const getButtonStyle = (button: string, isClose = false): React.CSSProperties => {
    const isHovered = hoveredButton === button;
    if (isClose) {
      return {
        ...styles.headerButton,
        ...styles.headerButtonClose,
        ...(isHovered ? styles.headerButtonCloseHover : {}),
      };
    }
    return {
      ...styles.headerButton,
      ...(isHovered ? styles.headerButtonHover : {}),
    };
  };

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onClick={handleContainerClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-panel-id={panel.id}
    >
      {/* Header */}
      <div
        style={{
          ...styles.header,
          ...(interactionMode === 'dragging' ? styles.headerDragging : {}),
        }}
        onPointerDown={handleDragStart}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleMaximize}
      >
        {panel.icon && (
          <div style={styles.icon}>
            <SNIcon name={panel.icon as any} size="sm" />
          </div>
        )}

        <span style={styles.title} title={panel.title}>
          {panel.title}
        </span>

        <div style={styles.headerActions}>
          {/* Collapse button */}
          <button
            style={getButtonStyle('collapse')}
            onClick={handleCollapse}
            onMouseEnter={() => setHoveredButton('collapse')}
            onMouseLeave={() => setHoveredButton(null)}
            title={panel.collapsed ? 'Expand' : 'Collapse'}
          >
            <SNIcon name={panel.collapsed ? 'chevronDown' : 'chevronUp'} size="sm" />
          </button>

          {/* Maximize button */}
          <button
            style={getButtonStyle('maximize')}
            onClick={handleMaximize}
            onMouseEnter={() => setHoveredButton('maximize')}
            onMouseLeave={() => setHoveredButton(null)}
            title={panel.maximized ? 'Restore' : 'Maximize'}
          >
            <SNIcon name={panel.maximized ? 'minimize' : 'maximize'} size="sm" />
          </button>

          {/* Close button */}
          <button
            style={getButtonStyle('close', true)}
            onClick={handleClose}
            onMouseEnter={() => setHoveredButton('close')}
            onMouseLeave={() => setHoveredButton(null)}
            title="Close panel"
          >
            <SNIcon name="close" size="sm" />
          </button>
        </div>
      </div>

      {/* Body (hidden when collapsed) */}
      {!panel.collapsed && (
        <div style={styles.body}>
          {/* Tab strip (only if multiple tabs) */}
          {(panel.tabs.length > 1 || isDropTarget) && (
            <FloatingPanelTabStrip
              panelId={panel.id}
              tabs={panel.tabs}
              activeTab={panel.activeTab}
              isDropTarget={isDropTarget}
            />
          )}

          {/* Content area */}
          <div style={styles.content}>
            {widgetIds.length > 0 ? (
              widgetIds.map((widgetId, index) => {
                const dockedState = getDockedWidgetState(widgetId);
                if (!dockedState) return null;

                return (
                  <FloatingPanelWidgetSlot
                    key={widgetId}
                    panelId={panel.id}
                    tabId={panel.activeTab}
                    widgetId={widgetId}
                    dockedState={dockedState}
                    index={index}
                    isLast={index === widgetIds.length - 1}
                  >
                    {/* Widget content would be rendered here via portal */}
                    <div id={`panel-slot-${widgetId}`} style={{ minHeight: 100 }} />
                  </FloatingPanelWidgetSlot>
                );
              })
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  <SNIcon name="widget" size="xl" />
                </div>
                <div style={styles.emptyText}>No widgets docked</div>
                <div style={styles.emptySubtext}>
                  Drag widgets here or click "Dock" on a widget
                </div>
              </div>
            )}
          </div>

          {/* Drop overlay */}
          {isDropTarget && (
            <div style={styles.dropOverlay}>
              <SNIcon name="add" size="lg" style={{ marginRight: 8 }} />
              Drop widget to dock
            </div>
          )}
        </div>
      )}

      {/* Resize handles */}
      {renderResizeHandles()}
    </div>
  );
};

export default FloatingPanelContainer;
