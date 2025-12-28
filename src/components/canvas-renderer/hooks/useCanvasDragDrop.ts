/**
 * useCanvasDragDrop
 * Handles drag selection (marquee) and drag-drop of widgets/stickers onto the canvas
 */

import { useCallback, useState, useRef } from 'react';
import type { WidgetInstance, StickerInstance } from '../../../types/domain';
import type { CanvasMode } from '../../../types/runtime';
import type { EventBus } from '../../../runtime/EventBus';

interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

interface CanvasBounds {
  width: number;
  height: number;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface Selection {
  selectedIds: Set<string>;
  selectionBox: SelectionBox | null;
}

interface UseCanvasDragDropOptions {
  mode: CanvasMode;
  canvasId: string;
  eventBus: EventBus;
  viewport: Viewport;
  canvasBounds: CanvasBounds;
  widgets: WidgetInstance[];
  canvasSurfaceRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  selection: Selection;
  deselectAll: () => void;
  selectMultiple: (ids: string[]) => void;
  setSelectionBox: (box: SelectionBox | null) => void;
  addSticker: (sticker: StickerInstance) => void;
}

export function useCanvasDragDrop(options: UseCanvasDragDropOptions) {
  const {
    mode,
    canvasId,
    eventBus,
    viewport,
    canvasBounds,
    widgets,
    canvasSurfaceRef,
    containerRef,
    selection,
    deselectAll,
    selectMultiple,
    setSelectionBox,
    addSticker,
  } = options;

  // Drag selection state
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Drag-and-drop state for widgets from library
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

  // Handle drag selection start - unified for mouse and touch
  const handleDragSelectStart = useCallback((e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    // Check if click is on the canvas surface or viewport (background)
    const isCanvasBackground = e.target === canvasSurfaceRef.current || e.target === containerRef.current;
    if (mode !== 'edit' || !isCanvasBackground) return;

    // Get coordinates from different event types
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Get position relative to canvas surface (accounting for scroll, zoom, and pan)
    const surfaceRect = canvasSurfaceRef.current?.getBoundingClientRect();
    if (!surfaceRect) return;

    // Convert screen coordinates to canvas coordinates (account for zoom and pan)
    const startX = (clientX - surfaceRect.left - viewport.panX) / viewport.zoom;
    const startY = (clientY - surfaceRect.top - viewport.panY) / viewport.zoom;

    dragStartRef.current = { x: startX, y: startY };
    setIsDragSelecting(true);
    setSelectionBox({ startX, startY, endX: startX, endY: startY });

    // Clear selection if not holding modifier (mouse events only have these)
    const hasModifier = 'shiftKey' in e && (e.shiftKey || e.ctrlKey || e.metaKey);
    if (!hasModifier) {
      deselectAll();
    }
  }, [mode, deselectAll, setSelectionBox, viewport.panX, viewport.panY, viewport.zoom, canvasSurfaceRef, containerRef]);

  // Handle drag selection move - unified for mouse and touch
  const handleDragSelectMove = useCallback((e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (!isDragSelecting || !dragStartRef.current || !canvasSurfaceRef.current) return;

    // Get coordinates from different event types
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Get position relative to canvas surface (account for zoom and pan)
    const surfaceRect = canvasSurfaceRef.current.getBoundingClientRect();
    const endX = Math.max(0, Math.min((clientX - surfaceRect.left - viewport.panX) / viewport.zoom, canvasBounds.width));
    const endY = Math.max(0, Math.min((clientY - surfaceRect.top - viewport.panY) / viewport.zoom, canvasBounds.height));

    setSelectionBox({
      startX: dragStartRef.current.x,
      startY: dragStartRef.current.y,
      endX,
      endY
    });
  }, [isDragSelecting, setSelectionBox, canvasBounds, viewport.panX, viewport.panY, viewport.zoom, canvasSurfaceRef]);

  // Handle drag selection end
  const handleDragSelectEnd = useCallback(() => {
    if (!isDragSelecting || !selection.selectionBox) {
      setIsDragSelecting(false);
      dragStartRef.current = null;
      return;
    }

    const box = selection.selectionBox;
    const minX = Math.min(box.startX, box.endX);
    const maxX = Math.max(box.startX, box.endX);
    const minY = Math.min(box.startY, box.endY);
    const maxY = Math.max(box.startY, box.endY);

    // Find widgets within the selection box
    const selectedIds = widgets
      .filter(widget => {
        const widgetRight = widget.position.x + widget.width;
        const widgetBottom = widget.position.y + widget.height;

        // Check if widget intersects with selection box
        return (
          widget.position.x < maxX &&
          widgetRight > minX &&
          widget.position.y < maxY &&
          widgetBottom > minY
        );
      })
      .map(w => w.id);

    if (selectedIds.length > 0) {
      selectMultiple(selectedIds);
    }

    setIsDragSelecting(false);
    dragStartRef.current = null;
    setSelectionBox(null);
  }, [isDragSelecting, selection.selectionBox, widgets, selectMultiple, setSelectionBox]);

  // Handle drag over for widgets and stickers from library
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    // Check if this is a widget or sticker being dragged from the library
    const hasWidgetData = e.dataTransfer.types.includes('text/widget-def-id');
    const hasStickerData = e.dataTransfer.types.includes('text/sticker-library-id');
    if (!hasWidgetData && !hasStickerData) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverCanvas(true);
  }, []);

  // Handle drag leave
  const handleCanvasDragLeave = useCallback((e: React.DragEvent) => {
    // Only set to false if we're leaving the canvas (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!canvasSurfaceRef.current?.contains(relatedTarget)) {
      setIsDragOverCanvas(false);
    }
  }, [canvasSurfaceRef]);

  // Handle drop of widgets and stickers from library onto canvas
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);

    // Calculate drop position relative to canvas surface
    const surfaceRect = canvasSurfaceRef.current?.getBoundingClientRect();
    if (!surfaceRect) return;

    // Account for viewport zoom and pan
    const dropX = (e.clientX - surfaceRect.left - viewport.panX) / viewport.zoom;
    const dropY = (e.clientY - surfaceRect.top - viewport.panY) / viewport.zoom;

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
        position: { x: dropX - width / 2, y: dropY - height / 2 }, // Center on drop point
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

      // Add sticker to store
      addSticker(sticker);

      console.log('[useCanvasDragDrop] Sticker dropped on canvas:', { stickerLibraryId, name, x: dropX, y: dropY });
      return;
    }

    // Handle widget drop
    const widgetDefId = e.dataTransfer.getData('text/widget-def-id');
    const widgetSource = e.dataTransfer.getData('text/widget-source') || 'local';

    if (!widgetDefId) return;

    // Emit widget add request with drop position
    eventBus.emit({
      type: 'widget:add-request',
      scope: 'canvas',
      payload: {
        widgetDefId,
        version: '1.0.0',
        source: widgetSource,
        positionOffset: { x: dropX - 150, y: dropY - 100 } // Center the widget on drop point
      }
    });

    console.log('[useCanvasDragDrop] Widget dropped on canvas:', { widgetDefId, widgetSource, x: dropX, y: dropY });
  }, [eventBus, canvasId, viewport.panX, viewport.panY, viewport.zoom, addSticker, canvasSurfaceRef]);

  return {
    isDragSelecting,
    isDragOverCanvas,
    handleDragSelectStart,
    handleDragSelectMove,
    handleDragSelectEnd,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
  };
}

export default useCanvasDragDrop;
