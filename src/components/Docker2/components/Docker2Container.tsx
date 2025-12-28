/**
 * Docker 2.0 Container
 * Main glass container with resize handles, drag support, and theme awareness
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Docker2ContainerProps, Docker2Instance, LayoutMode } from '../Docker2.types';
import { getTheme, getContainerStyle, generateCSSVariables, animationStyles } from '../Docker2Theme';
import { useDocker2Store } from '../hooks';
import { Docker2Header } from './Docker2Header';
import { WidgetStack } from './WidgetStack';
import { DropIndicator } from './DropIndicator';

// ==================
// Resize Handle Component
// ==================

interface ResizeHandleProps {
  position: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  onResizeStart: (e: React.PointerEvent, position: string) => void;
  disabled?: boolean;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ position, onResizeStart, disabled }) => {
  const positionStyles: Record<string, React.CSSProperties> = {
    n: { top: 0, left: '10%', right: '10%', height: 6, cursor: 'ns-resize' },
    s: { bottom: 0, left: '10%', right: '10%', height: 6, cursor: 'ns-resize' },
    e: { right: 0, top: '10%', bottom: '10%', width: 6, cursor: 'ew-resize' },
    w: { left: 0, top: '10%', bottom: '10%', width: 6, cursor: 'ew-resize' },
    ne: { top: 0, right: 0, width: 12, height: 12, cursor: 'nesw-resize' },
    nw: { top: 0, left: 0, width: 12, height: 12, cursor: 'nwse-resize' },
    se: { bottom: 0, right: 0, width: 12, height: 12, cursor: 'nwse-resize' },
    sw: { bottom: 0, left: 0, width: 12, height: 12, cursor: 'nesw-resize' },
  };

  if (disabled) return null;

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        zIndex: 10,
        touchAction: 'none',
      }}
      onPointerDown={(e) => onResizeStart(e, position)}
    />
  );
};

// ==================
// Main Container Component
// ==================

export const Docker2Container: React.FC<Docker2ContainerProps> = ({
  docker,
  widgets,
  isEditMode,
  onDock,
  onUndock,
  renderWidget,
  availableWidgets,
  onAddWidget,
  onDockerChange,
  canvasId,
  className,
  fillContainer = false,
  selectedWidgetIds = [],
  onDockSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Track actual container size for fillContainer mode
  const [containerDimensions, setContainerDimensions] = useState({ width: 400, height: 600 });

  // Local state for drag/resize operations
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });

  // Drop zone state
  const [isDropTarget, setIsDropTarget] = useState(false);

  // Store actions
  const {
    updateDocker,
    setThemeMode,
    toggleEditMode,
    setLayout,
    dockWidget,
    undockWidget,
    reorderWidgets,
    resizeWidget,
    minimizeWidget,
    maximizeWidget,
    removeWidget,
    dragState,
    startDrag,
    updateDrag,
    endDrag,
  } = useDocker2Store();

  // Theme
  const theme = useMemo(() => getTheme(docker.themeMode), [docker.themeMode]);
  const cssVariables = useMemo(() => generateCSSVariables(theme), [theme]);

  // Track container dimensions in fillContainer mode
  useEffect(() => {
    if (!fillContainer || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fillContainer]);

  // Container style
  const containerStyle: React.CSSProperties = useMemo(() => {
    const baseStyle = getContainerStyle(theme);

    if (fillContainer) {
      // Fill parent container mode (for tab panels)
      return {
        ...baseStyle,
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 200,
        opacity: 1,
        ...Object.fromEntries(Object.entries(cssVariables).map(([k, v]) => [k, v])),
      };
    }

    // Absolute positioning mode (for floating docker)
    return {
      ...baseStyle,
      position: 'absolute',
      left: docker.position.x,
      top: docker.position.y,
      width: docker.size.width,
      height: docker.collapsed ? 48 : docker.size.height,
      zIndex: docker.zIndex,
      minWidth: docker.minSize.width,
      minHeight: docker.collapsed ? 48 : docker.minSize.height,
      maxWidth: docker.maxSize.width,
      maxHeight: docker.maxSize.height,
      opacity: isDragging ? 0.9 : 1,
      transform: isDragging ? 'scale(1.01)' : 'scale(1)',
      transition: isDragging || isResizing
        ? 'none'
        : `opacity ${theme.transitions.fast}, transform ${theme.transitions.fast}, height ${theme.transitions.normal}`,
      ...Object.fromEntries(Object.entries(cssVariables).map(([k, v]) => [k, v])),
    };
  }, [docker, theme, cssVariables, isDragging, isResizing, fillContainer]);

  // ==================
  // Drag Handling
  // ==================

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (docker.locked || e.button !== 0) return;

    // Only start drag from header
    const target = e.target as HTMLElement;
    if (!headerRef.current?.contains(target)) return;

    // Don't drag if clicking on interactive elements
    if (target.closest('button, input, [role="button"]')) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ ...docker.position });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [docker.locked, docker.position]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    updateDocker(docker.id, {
      position: {
        x: Math.max(0, initialPos.x + dx),
        y: Math.max(0, initialPos.y + dy),
      },
    });
  }, [isDragging, dragStart, initialPos, docker.id, updateDocker]);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    onDockerChange?.(docker);
  }, [isDragging, docker, onDockerChange]);

  // ==================
  // Resize Handling
  // ==================

  const handleResizeStart = useCallback((e: React.PointerEvent, direction: string) => {
    if (docker.locked || docker.collapsed) return;

    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizeDirection(direction);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ ...docker.position });
    setInitialSize({ ...docker.size });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [docker.locked, docker.collapsed, docker.position, docker.size]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing || !resizeDirection) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    let newWidth = initialSize.width;
    let newHeight = initialSize.height;
    let newX = initialPos.x;
    let newY = initialPos.y;

    // Calculate new dimensions based on direction
    if (resizeDirection.includes('e')) {
      newWidth = Math.max(docker.minSize.width, Math.min(docker.maxSize.width, initialSize.width + dx));
    }
    if (resizeDirection.includes('w')) {
      const widthDelta = Math.max(docker.minSize.width, Math.min(docker.maxSize.width, initialSize.width - dx)) - initialSize.width;
      newWidth = initialSize.width + widthDelta;
      newX = initialPos.x - widthDelta;
    }
    if (resizeDirection.includes('s')) {
      newHeight = Math.max(docker.minSize.height, Math.min(docker.maxSize.height, initialSize.height + dy));
    }
    if (resizeDirection.includes('n')) {
      const heightDelta = Math.max(docker.minSize.height, Math.min(docker.maxSize.height, initialSize.height - dy)) - initialSize.height;
      newHeight = initialSize.height + heightDelta;
      newY = initialPos.y - heightDelta;
    }

    updateDocker(docker.id, {
      position: { x: Math.max(0, newX), y: Math.max(0, newY) },
      size: { width: newWidth, height: newHeight },
    });
  }, [isResizing, resizeDirection, dragStart, initialSize, initialPos, docker, updateDocker]);

  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;

    setIsResizing(false);
    setResizeDirection(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    onDockerChange?.(docker);
  }, [isResizing, docker, onDockerChange]);

  // ==================
  // Drop Zone Handling
  // ==================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);

    // Update global drag state
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const y = e.clientY - rect.top;
      const relativeY = y / rect.height;

      // Determine drop zone based on position
      let zone: 'top' | 'center' | 'bottom' = 'center';
      if (relativeY < 0.25) zone = 'top';
      else if (relativeY > 0.75) zone = 'bottom';

      updateDrag(zone, zone === 'top' ? 0 : zone === 'bottom' ? docker.widgets.length : null);
    }
  }, [docker.widgets.length, updateDrag]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set to false if leaving the container entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDropTarget(false);
      updateDrag(null, null);
    }
  }, [updateDrag]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);

    const widgetId = e.dataTransfer.getData('text/widget-id');
    if (!widgetId) return;

    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    // Dock the widget
    const insertIndex = dragState.insertIndex ?? docker.widgets.length;
    dockWidget(docker.id, widget, insertIndex);
    onDock(widget);

    endDrag();
  }, [widgets, dragState.insertIndex, docker, dockWidget, onDock, endDrag]);

  // ==================
  // Header Actions
  // ==================

  const handleToggleCollapse = useCallback(() => {
    updateDocker(docker.id, { collapsed: !docker.collapsed });
  }, [docker.id, docker.collapsed, updateDocker]);

  const handleToggleTheme = useCallback(() => {
    setThemeMode(docker.id, docker.themeMode === 'dark' ? 'light' : 'dark');
  }, [docker.id, docker.themeMode, setThemeMode]);

  const handleToggleEditMode = useCallback(() => {
    toggleEditMode(docker.id);
  }, [docker.id, toggleEditMode]);

  const handleLayoutChange = useCallback((mode: LayoutMode) => {
    setLayout(docker.id, { mode });
  }, [docker.id, setLayout]);

  const handleRename = useCallback((name: string) => {
    updateDocker(docker.id, { name });
  }, [docker.id, updateDocker]);

  // ==================
  // Widget Stack Actions
  // ==================

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    reorderWidgets(docker.id, fromIndex, toIndex);
  }, [docker.id, reorderWidgets]);

  const handleResize = useCallback((widgetId: string, newSizePercent: number) => {
    resizeWidget(docker.id, widgetId, newSizePercent);
  }, [docker.id, resizeWidget]);

  const handleMinimize = useCallback((widgetId: string) => {
    minimizeWidget(docker.id, widgetId);
  }, [docker.id, minimizeWidget]);

  const handleMaximize = useCallback((widgetId: string) => {
    maximizeWidget(docker.id, widgetId);
  }, [docker.id, maximizeWidget]);

  const handleRemove = useCallback((widgetId: string) => {
    const stackedWidget = undockWidget(docker.id, widgetId);
    if (stackedWidget) {
      onUndock(widgetId);
    }
  }, [docker.id, undockWidget, onUndock]);

  // ==================
  // Content Size Calculation
  // ==================

  const contentSize = useMemo(() => {
    const headerHeight = 48;
    const padding = docker.layout.padding * 2;

    // In fillContainer mode, use actual measured dimensions
    if (fillContainer) {
      return {
        width: Math.max(0, containerDimensions.width - padding),
        height: Math.max(0, containerDimensions.height - headerHeight - padding),
      };
    }

    // In absolute positioning mode, use docker.size from store
    return {
      width: docker.size.width - padding,
      height: docker.size.height - headerHeight - padding,
    };
  }, [docker.size, docker.layout.padding, fillContainer, containerDimensions]);

  // ==================
  // Render
  // ==================

  return (
    <>
      {/* Inject animation styles */}
      <style>{animationStyles}</style>

      <div
        ref={containerRef}
        className={`docker2-container ${className || ''}`}
        style={containerStyle}
        onPointerDown={handleDragStart}
        onPointerMove={(e) => {
          handleDragMove(e);
          handleResizeMove(e);
        }}
        onPointerUp={(e) => {
          handleDragEnd(e);
          handleResizeEnd(e);
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-docker-id={docker.id}
        data-theme={docker.themeMode}
      >
        {/* Header */}
        <div ref={headerRef}>
          <Docker2Header
            docker={docker}
            onToggleCollapse={handleToggleCollapse}
            onToggleTheme={handleToggleTheme}
            onToggleEditMode={handleToggleEditMode}
            onLayoutChange={handleLayoutChange}
            onRename={handleRename}
            availableWidgets={availableWidgets}
            onAddWidget={onAddWidget}
            selectedCount={selectedWidgetIds.length}
            onDockSelected={onDockSelected}
          />
        </div>

        {/* Content Area */}
        {!docker.collapsed && (
          <div
            style={{
              flex: 1,
              padding: docker.layout.padding,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Drop indicators */}
            {isDropTarget && (
              <>
                <DropIndicator
                  zone="top"
                  active={dragState.activeDropZone === 'top'}
                  themeMode={docker.themeMode}
                />
                <DropIndicator
                  zone="center"
                  active={dragState.activeDropZone === 'center'}
                  themeMode={docker.themeMode}
                />
                <DropIndicator
                  zone="bottom"
                  active={dragState.activeDropZone === 'bottom'}
                  themeMode={docker.themeMode}
                />
              </>
            )}

            {/* Widget Stack */}
            <WidgetStack
              widgets={docker.widgets}
              allWidgets={widgets}
              layout={docker.layout}
              containerSize={contentSize}
              editMode={docker.editMode || isEditMode}
              themeMode={docker.themeMode}
              renderWidget={renderWidget}
              onReorder={handleReorder}
              onResize={handleResize}
              onMinimize={handleMinimize}
              onMaximize={handleMaximize}
              onRemove={handleRemove}
            />

            {/* Empty state / Drop zone */}
            {docker.widgets.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: isDropTarget ? theme.colors.accent : theme.colors.textMuted,
                  textAlign: 'center',
                  padding: 20,
                  gap: 12,
                  border: isDropTarget
                    ? `2px dashed ${theme.colors.accent}`
                    : '2px dashed transparent',
                  borderRadius: theme.borderRadius.lg,
                  background: isDropTarget
                    ? `${theme.colors.accentMuted}`
                    : 'transparent',
                  transition: `all ${theme.transitions.fast}`,
                  minHeight: 200,
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity={isDropTarget ? 1 : 0.5}
                  style={{
                    transform: isDropTarget ? 'scale(1.1)' : 'scale(1)',
                    transition: `transform ${theme.transitions.fast}`,
                  }}
                >
                  {isDropTarget ? (
                    // Download/drop icon when hovering
                    <>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </>
                  ) : (
                    // Stack icon when idle
                    <>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </>
                  )}
                </svg>
                <div style={{ fontSize: 14, fontWeight: isDropTarget ? 600 : 400 }}>
                  {isDropTarget ? 'Drop widget here!' : 'Drag widgets here to stack them'}
                </div>
                {!isDropTarget && availableWidgets && availableWidgets.length > 0 && (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Or use the + button to add widgets
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Resize handles - only show when not in fill mode */}
        {!fillContainer && !docker.locked && !docker.collapsed && (
          <>
            <ResizeHandle position="n" onResizeStart={handleResizeStart} />
            <ResizeHandle position="s" onResizeStart={handleResizeStart} />
            <ResizeHandle position="e" onResizeStart={handleResizeStart} />
            <ResizeHandle position="w" onResizeStart={handleResizeStart} />
            <ResizeHandle position="ne" onResizeStart={handleResizeStart} />
            <ResizeHandle position="nw" onResizeStart={handleResizeStart} />
            <ResizeHandle position="se" onResizeStart={handleResizeStart} />
            <ResizeHandle position="sw" onResizeStart={handleResizeStart} />
          </>
        )}
      </div>
    </>
  );
};

export default Docker2Container;
