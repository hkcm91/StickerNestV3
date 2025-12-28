/**
 * @deprecated This file is deprecated. Use MainCanvas from '../../canvas/MainCanvas' instead.
 *
 * This editor Canvas component is being phased out in favor of MainCanvas,
 * which combines the best of Canvas2 navigation with editor capabilities.
 *
 * Migration:
 * - import { MainCanvas } from '../../canvas/MainCanvas'
 *
 * ---
 *
 * StickerNest v2 - Canvas Editor Component (DEPRECATED)
 *
 * Main canvas component for the editor with drag/resize/selection capabilities.
 * Uses WidgetInteractionWrapper for all widget interactions with proper undo/redo.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../../state/useCanvasStore';
import { useToolStore } from '../../state/useToolStore';
import { useCanvasExtendedStore } from '../../state/useCanvasExtendedStore';
import { useCanvasEntityStore } from '../../state/useCanvasEntityStore';
import { useThemeStore } from '../../state/useThemeStore';
import { useStickerStore } from '../../state/useStickerStore';
import type { WidgetInstance, StickerInstance } from '../../types/domain';
import { useToolCanvasInteraction } from '../../hooks/useToolCanvasInteraction';
import { useCanvasEntityEvents } from '../../hooks/useCanvasEntityEvents';
import { useCanvasController } from '../../hooks/useCanvasController';
import { EventBus } from '../../runtime/EventBus';
import { CanvasMinimap } from '../CanvasMinimap';
import { WidgetInteractionWrapper } from './WidgetInteractionWrapper';
import { CanvasContextMenu } from './CanvasContextMenu';
import { coordinateService } from '../../canvas/CoordinateService';
import { CanvasEntityLayer } from './CanvasEntityLayer';
import { StickerFrame } from '../StickerFrame';

// ============================================================================
// TYPES
// ============================================================================

interface CanvasProps {
  widgets: WidgetInstance[];
  onWidgetUpdate?: (id: string, updates: Partial<WidgetInstance>) => void;
  onWidgetDelete?: (id: string) => void;
  onWidgetDock?: (draggedId: string, targetId: string) => void;
  onDockToDocker?: (widgetId: string) => void;
  renderWidget: (widget: WidgetInstance) => React.ReactNode;
  eventBus?: EventBus;
  className?: string;
  children?: React.ReactNode;
  onWidgetDragStart?: (widgetId: string) => void;
  onWidgetDragEnd?: () => void;
  /** Canvas ID for filtering stickers */
  canvasId?: string;
  /** Callback when widget is added via drag-drop */
  onAddWidget?: (widgetDefId: string, position?: { x: number; y: number }) => void;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

// ============================================================================
// CANVAS COMPONENT
// ============================================================================

export function Canvas({
  widgets,
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetDock,
  onDockToDocker,
  renderWidget,
  eventBus,
  className = '',
  children,
  canvasId = 'editor',
  onAddWidget,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Theme state
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const hasParallaxBackground = currentTheme?.appBackground?.type === 'parallax';

  // Use useCanvasStore instead of useEditorStore (migration from duplicate state)
  const mode = useCanvasStore(state => state.mode);
  const selection = useCanvasStore(state => state.selection);
  const grid = useCanvasStore(state => state.grid);
  const viewport = useCanvasStore(state => state.viewport);
  const select = useCanvasStore(state => state.select);
  const selectMultiple = useCanvasStore(state => state.selectMultiple);
  const deselectAll = useCanvasStore(state => state.deselectAll);
  const setViewport = useCanvasStore(state => state.setViewport);

  // Extended store for canvas lock
  const isCanvasLocked = useCanvasExtendedStore(state => state.isCanvasLocked);

  const activeTool = useToolStore(state => state.activeTool);

  // Sticker store integration
  const allStickers = useStickerStore(state => state.stickers);
  const addSticker = useStickerStore(state => state.addSticker);
  const updateSticker = useStickerStore(state => state.updateSticker);
  const removeSticker = useStickerStore(state => state.removeSticker);
  const selectSticker = useStickerStore(state => state.selectSticker);
  const selectedStickerId = useStickerStore(state => state.selectedStickerId);
  const moveSticker = useStickerStore(state => state.moveSticker);
  const resizeSticker = useStickerStore(state => state.resizeSticker);
  const rotateSticker = useStickerStore(state => state.rotateSticker);

  // Get stickers for current canvas
  const stickers = useMemo(() =>
    Array.from(allStickers.values()).filter(s => s.canvasId === canvasId),
    [allStickers, canvasId]
  );

  const { handleCanvasToolClick, getToolCursor } = useToolCanvasInteraction({
    eventBus: (eventBus || { emit: () => {} }) as unknown as EventBus,
    canvasId: 'editor',
    enabled: mode === 'edit',
  });

  // Wire canvas events to entity creation
  useCanvasEntityEvents({
    eventBus: eventBus || null,
    canvasId: 'editor',
    enabled: mode === 'edit'
  });

  // Canvas controller for widget-driven property changes (background, filters, etc.)
  const canvasController = useCanvasController({
    eventBus: eventBus || null,
    canvasId,
    initialBackground: {
      type: 'color',
      color: '#2d2d3d', // Default canvas work area color
    },
  });

  // Entity selection state (to coordinate with widget selection)
  const deselectAllEntities = useCanvasEntityStore((s) => s.deselectAll);

  // Local state for interactions
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [dockTargetId, setDockTargetId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number } | null;
    targetWidgetId: string | null;
  }>({ position: null, targetWidgetId: null });

  // Center canvas on mount
  const [isCentered, setIsCentered] = useState(false);
  useEffect(() => {
    if (!isCentered && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = (rect.width - CANVAS_WIDTH) / 2;
      const centerY = (rect.height - CANVAS_HEIGHT) / 2;
      setViewport({ panX: centerX, panY: centerY });
      setIsCentered(true);
    }
  }, [isCentered, setViewport]);

  // Check if a widget is selected
  const isSelected = useCallback(
    (id: string) => selection.selectedIds.has(id),
    [selection.selectedIds]
  );

  // Get selected widgets
  const selectedWidgets = useMemo(
    () => widgets.filter(w => selection.selectedIds.has(w.id)),
    [widgets, selection.selectedIds]
  );

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: screenX, y: screenY };
      return coordinateService.screenToCanvas(
        screenX - rect.left,
        screenY - rect.top,
        viewport
      );
    },
    [viewport]
  );

  // Context menu handler
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, widgetId: string | null) => {
      e.preventDefault();
      e.stopPropagation();

      // Select the widget if not already selected
      if (widgetId && !selection.selectedIds.has(widgetId)) {
        select(widgetId, false);
        // Deselect entities when selecting widgets (mutually exclusive)
        deselectAllEntities();
      }

      setContextMenu({
        position: { x: e.clientX, y: e.clientY },
        targetWidgetId: widgetId,
      });
    },
    [selection.selectedIds, select, deselectAllEntities]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu({ position: null, targetWidgetId: null });
  }, []);

  // ============================================================================
  // STICKER HANDLERS
  // ============================================================================

  const handleStickerSelect = useCallback((id: string, multi: boolean) => {
    selectSticker(id);
    // Deselect widgets when selecting stickers
    if (!multi) {
      deselectAll();
    }
  }, [selectSticker, deselectAll]);

  const handleStickerMove = useCallback((id: string, position: { x: number; y: number }) => {
    moveSticker(id, position);
  }, [moveSticker]);

  const handleStickerResize = useCallback((id: string, width: number, height: number) => {
    resizeSticker(id, width, height);
  }, [resizeSticker]);

  const handleStickerRotate = useCallback((id: string, rotation: number) => {
    rotateSticker(id, rotation);
  }, [rotateSticker]);

  const handleStickerClick = useCallback((sticker: StickerInstance) => {
    // Handle sticker click behavior (e.g., toggle linked widget)
  }, []);

  const handleStickerDoubleClick = useCallback((sticker: StickerInstance) => {
    // Handle sticker double-click - open properties via event
    selectSticker(sticker.id);
    eventBus?.emit({
      type: 'sticker:double-click',
      scope: 'canvas',
      payload: { stickerId: sticker.id }
    });
  }, [selectSticker, eventBus]);

  const handleStickerDelete = useCallback((stickerId: string) => {
    removeSticker(stickerId);
    selectSticker(null);
    eventBus?.emit({
      type: 'sticker:removed',
      scope: 'canvas',
      payload: { stickerId }
    });
  }, [removeSticker, selectSticker, eventBus]);

  const handleStickerOpenProperties = useCallback((sticker: StickerInstance) => {
    selectSticker(sticker.id);
    eventBus?.emit({
      type: 'sticker:double-click',
      scope: 'canvas',
      payload: { stickerId: sticker.id }
    });
  }, [selectSticker, eventBus]);

  const handleStickerContextMenu = useCallback((e: React.MouseEvent, sticker: StickerInstance) => {
    e.preventDefault();
    // Could show sticker-specific context menu
  }, []);

  // ============================================================================
  // DRAG & DROP HANDLERS (for widgets/stickers from library)
  // ============================================================================

  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Check if this is a widget or sticker being dragged from the library
    const hasWidgetData = e.dataTransfer.types.includes('text/widget-def-id');
    const hasStickerData = e.dataTransfer.types.includes('text/sticker-library-id');
    if (!hasWidgetData && !hasStickerData) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverCanvas(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set to false if we're leaving the canvas
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!canvasRef.current?.contains(relatedTarget)) {
      setIsDragOverCanvas(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);

    // Calculate drop position relative to canvas
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Convert screen position to canvas position
    const dropX = (e.clientX - rect.left - viewport.panX) / viewport.zoom;
    const dropY = (e.clientY - rect.top - viewport.panY) / viewport.zoom;

    // Check if this is a sticker drop
    const stickerLibraryId = e.dataTransfer.getData('text/sticker-library-id');
    if (stickerLibraryId) {
      // Get sticker data from transfer
      const name = e.dataTransfer.getData('text/sticker-name') || 'Sticker';
      const mediaType = e.dataTransfer.getData('text/sticker-media-type') as StickerInstance['mediaType'] || 'emoji';
      const mediaSrc = e.dataTransfer.getData('text/sticker-media-src') || '';
      const width = parseInt(e.dataTransfer.getData('text/sticker-width')) || 64;
      const height = parseInt(e.dataTransfer.getData('text/sticker-height')) || 64;
      const clickBehavior = e.dataTransfer.getData('text/sticker-behavior') as StickerInstance['clickBehavior'] || 'toggle-widget';
      const linkedWidgetDefId = e.dataTransfer.getData('text/sticker-linked-widget') || undefined;
      const widgetSpawnPosition = e.dataTransfer.getData('text/sticker-spawn-position') as StickerInstance['widgetSpawnPosition'] || 'right';

      // Create sticker instance
      const sticker: StickerInstance = {
        id: crypto.randomUUID(),
        canvasId,
        name,
        mediaType,
        mediaSrc,
        position: { x: dropX - width / 2, y: dropY - height / 2 },
        width,
        height,
        rotation: 0,
        zIndex: 100,
        clickBehavior,
        hoverAnimation: 'scale',
        clickAnimation: 'pulse',
        ...(linkedWidgetDefId && {
          linkedWidgetDefId,
          widgetSpawnPosition,
        }),
      };

      addSticker(sticker);
      return;
    }

    // Handle widget drop
    const widgetDefId = e.dataTransfer.getData('text/widget-def-id');
    if (widgetDefId && onAddWidget) {
      onAddWidget(widgetDefId, { x: dropX - 150, y: dropY - 100 });
    }
  }, [viewport.panX, viewport.panY, viewport.zoom, canvasId, addSticker, onAddWidget]);

  // ============================================================================
  // CANVAS MOUSE HANDLERS
  // ============================================================================

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== canvasRef.current) return;

      // Check for tool click (shape, text, etc.)
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && handleCanvasToolClick(e, rect)) {
        return;
      }

      // Pan with space+drag, middle mouse, or pan tool
      if (e.button === 1 || (e.button === 0 && activeTool.category === 'pan')) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({
          x: e.clientX,
          y: e.clientY,
          offsetX: viewport.panX,
          offsetY: viewport.panY,
        });
        return;
      }

      // Selection rectangle in edit mode with select tool
      if (mode === 'edit' && activeTool.category === 'select') {
        if (!e.shiftKey) {
          deselectAll();
        }

        const canvas = screenToCanvas(e.clientX, e.clientY);
        setSelectionRect({
          startX: canvas.x,
          startY: canvas.y,
          endX: canvas.x,
          endY: canvas.y,
        });
      }
    },
    [mode, activeTool, viewport, deselectAll, screenToCanvas, handleCanvasToolClick]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Handle panning
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setViewport({
          panX: panStart.offsetX + dx,
          panY: panStart.offsetY + dy,
        });
        return;
      }

      // Handle selection rectangle
      if (selectionRect) {
        const canvas = screenToCanvas(e.clientX, e.clientY);
        setSelectionRect(prev =>
          prev
            ? {
                ...prev,
                endX: canvas.x,
                endY: canvas.y,
              }
            : null
        );
      }
    },
    [isPanning, panStart, setViewport, selectionRect, screenToCanvas]
  );

  const handleMouseUp = useCallback(() => {
    // Complete selection rectangle
    if (selectionRect) {
      const minX = Math.min(selectionRect.startX, selectionRect.endX);
      const maxX = Math.max(selectionRect.startX, selectionRect.endX);
      const minY = Math.min(selectionRect.startY, selectionRect.endY);
      const maxY = Math.max(selectionRect.startY, selectionRect.endY);

      // Select widgets within rectangle
      const selectedIds: string[] = [];
      widgets.forEach(widget => {
        const wx = widget.position.x;
        const wy = widget.position.y;
        const ww = widget.width;
        const wh = widget.height;

        // Check if widget intersects selection rectangle
        if (wx < maxX && wx + ww > minX && wy < maxY && wy + wh > minY) {
          selectedIds.push(widget.id);
        }
      });

      if (selectedIds.length > 0) {
        selectMultiple(selectedIds);
      }
    }

    setSelectionRect(null);
    setIsPanning(false);
  }, [selectionRect, widgets, selectMultiple]);

  // ============================================================================
  // WHEEL HANDLER (ZOOM)
  // ============================================================================

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(4, viewport.zoom * delta));
        setViewport({ zoom: newZoom });
      }
    },
    [viewport.zoom, setViewport]
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // ============================================================================
  // MINIMAP
  // ============================================================================

  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (canvasRef.current) {
      const updateDimensions = () => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setContainerDimensions({ width: rect.width, height: rect.height });
        }
      };
      updateDimensions();
      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(canvasRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // ============================================================================
  // CURSOR
  // ============================================================================

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (activeTool.category === 'pan') return 'grab';
    if (isCanvasLocked()) return 'not-allowed';
    // In edit mode with select tool, use default cursor on canvas background
    // so widget cursors are visible
    if (mode === 'edit' && activeTool.category === 'select') return 'default';
    return getToolCursor();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      ref={canvasRef}
      className={`canvas-editor ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: hasParallaxBackground ? 'transparent' : 'var(--sn-canvas-bg)',
        backgroundImage: hasParallaxBackground ? 'none' : 'var(--sn-canvas-bg-gradient)',
        cursor: getCursor(),
        outline: isDragOverCanvas ? '2px dashed var(--sn-accent-primary)' : 'none',
        outlineOffset: '-2px',
      }}
      onMouseDown={handleCanvasMouseDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Canvas dimension label */}
      <div
        style={{
          position: 'absolute',
          left: viewport.panX + (CANVAS_WIDTH * viewport.zoom) / 2,
          top: viewport.panY - 24,
          transform: 'translateX(-50%)',
          fontSize: 11,
          color: 'var(--sn-text-tertiary)',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}
      >
        {CANVAS_WIDTH} × {CANVAS_HEIGHT}
      </div>

      {/* Canvas Workspace - The visible canvas work area */}
      <div
        style={{
          position: 'absolute',
          left: viewport.panX,
          top: viewport.panY,
          width: CANVAS_WIDTH * viewport.zoom,
          height: CANVAS_HEIGHT * viewport.zoom,
          // Use canvasController styles for widget-driven background changes
          // The controller handles all background types (color, gradient, image, video)
          ...canvasController.canvasStyles.background,
          filter: canvasController.canvasStyles.filter !== 'none'
            ? canvasController.canvasStyles.filter
            : undefined,
          borderRadius: 8 * viewport.zoom,
          boxShadow: 'var(--sn-canvas-shadow)',
          transition: 'background 0.3s, filter 0.3s',
          pointerEvents: 'none',
        }}
      />

      {/* Grid Background */}
      {grid.showGrid && (
        <div
          style={{
            position: 'absolute',
            left: viewport.panX,
            top: viewport.panY,
            width: CANVAS_WIDTH * viewport.zoom,
            height: CANVAS_HEIGHT * viewport.zoom,
            backgroundImage: 'var(--sn-canvas-grid-pattern)',
            backgroundSize: `${grid.gridSize * viewport.zoom}px ${grid.gridSize * viewport.zoom}px`,
            backgroundPosition: '0 0',
            pointerEvents: 'none',
            borderRadius: 8 * viewport.zoom,
          }}
        />
      )}

      {/* Canvas Lock Indicator */}
      {isCanvasLocked() && (
        <div
          style={{
            position: 'absolute',
            left: viewport.panX + CANVAS_WIDTH * viewport.zoom - 100,
            top: viewport.panY + 10,
            padding: '4px 8px',
            background: 'var(--sn-error)',
            color: 'white',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Canvas Locked
        </div>
      )}

      {/* Canvas Transform Container */}
      <div
        style={{
          position: 'absolute',
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Canvas Entities (shapes, text, images - render below widgets) */}
        <CanvasEntityLayer
          isEditing={mode === 'edit'}
          zoom={viewport.zoom}
          snapToGrid={grid.snapToGrid}
          gridSize={grid.gridSize}
        />

        {/* Widget Instances using WidgetInteractionWrapper */}
        {widgets.map(widget => (
          <WidgetInteractionWrapper
            key={widget.id}
            widget={widget}
            isSelected={isSelected(widget.id)}
            isEditing={mode === 'edit'}
            isDockTarget={dockTargetId === widget.id}
            onDelete={onWidgetDelete ? () => onWidgetDelete(widget.id) : undefined}
            onDockToDocker={onDockToDocker ? () => onDockToDocker(widget.id) : undefined}
            onContextMenu={handleContextMenu}
          >
            {renderWidget(widget)}
          </WidgetInteractionWrapper>
        ))}

        {/* Stickers */}
        {stickers.map((sticker) => (
          <StickerFrame
            key={sticker.id}
            sticker={sticker}
            isSelected={selectedStickerId === sticker.id}
            isEditMode={mode === 'edit'}
            onSelect={handleStickerSelect}
            onMove={handleStickerMove}
            onResize={handleStickerResize}
            onRotate={handleStickerRotate}
            onClick={handleStickerClick}
            onDoubleClick={handleStickerDoubleClick}
            onContextMenu={handleStickerContextMenu}
            onDelete={handleStickerDelete}
            onOpenProperties={handleStickerOpenProperties}
            canvasBounds={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            gridSnap={grid.snapToGrid}
            gridSize={grid.gridSize}
          />
        ))}
      </div>

      {/* Children Overlays (DockPanel, etc) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
          {children}
        </div>
      </div>

      {/* Empty Canvas State */}
      {widgets.length === 0 && (
        <div
          style={{
            position: 'absolute',
            left: viewport.panX + (CANVAS_WIDTH * viewport.zoom) / 2,
            top: viewport.panY + (CANVAS_HEIGHT * viewport.zoom) / 2,
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'var(--sn-text-secondary)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              margin: '0 auto 16px',
              borderRadius: 16,
              background: 'var(--sn-accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}
          >
            📦
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--sn-text-primary)' }}>Empty Canvas</h3>
          <p style={{ margin: 0, fontSize: 14, maxWidth: 280, color: 'var(--sn-text-muted)' }}>
            Click the <strong style={{ color: 'var(--sn-accent-primary)' }}>+ Add</strong> button or open the
            Widget Library panel to add widgets to your canvas.
          </p>
        </div>
      )}

      {/* Selection Rectangle */}
      {selectionRect && (
        <div
          style={{
            position: 'absolute',
            left:
              Math.min(selectionRect.startX, selectionRect.endX) * viewport.zoom + viewport.panX,
            top:
              Math.min(selectionRect.startY, selectionRect.endY) * viewport.zoom + viewport.panY,
            width: Math.abs(selectionRect.endX - selectionRect.startX) * viewport.zoom,
            height: Math.abs(selectionRect.endY - selectionRect.startY) * viewport.zoom,
            border: '1px dashed var(--sn-selection-border)',
            backgroundColor: 'var(--sn-selection-bg)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Minimap for navigation */}
      {containerDimensions.width > 0 && (
        <CanvasMinimap
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
          containerWidth={containerDimensions.width}
          containerHeight={containerDimensions.height}
          widgets={widgets}
          position="bottom-right"
          viewport={viewport}
          onPan={(panX, panY) => setViewport({ panX, panY })}
        />
      )}

      {/* Context Menu */}
      <CanvasContextMenu
        position={contextMenu.position}
        targetWidgetId={contextMenu.targetWidgetId}
        onClose={closeContextMenu}
        onDelete={onWidgetDelete}
      />
    </div>
  );
}

export default Canvas;
