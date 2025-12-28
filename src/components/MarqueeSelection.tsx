/**
 * StickerNest v2 - Marquee Selection Component
 * Provides drag-to-select functionality for selecting multiple widgets
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';

interface MarqueeSelectionProps {
  /** Whether marquee selection is enabled */
  enabled?: boolean;
  /** Container element for bounds calculation */
  containerRef?: React.RefObject<HTMLElement>;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Viewport offset for accurate position calculation */
  viewportOffset?: { x: number; y: number };
  /** Zoom level for accurate position calculation */
  zoom?: number;
}

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const MarqueeSelection: React.FC<MarqueeSelectionProps> = ({
  enabled = true,
  containerRef,
  onSelectionChange,
  viewportOffset = { x: 0, y: 0 },
  zoom = 1,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Canvas store
  const widgets = useCanvasStore(state => state.getWidgets());
  const selectMultiple = useCanvasStore(state => state.selectMultiple);
  const mode = useCanvasStore(state => state.mode);

  const isEditMode = mode === 'edit';

  // Convert client coordinates to canvas coordinates
  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const container = containerRef?.current;
    if (!container) return { x: clientX, y: clientY };

    const rect = container.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewportOffset.x) / zoom,
      y: (clientY - rect.top - viewportOffset.y) / zoom,
    };
  }, [containerRef, viewportOffset, zoom]);

  // Calculate normalized selection box (handles negative dimensions)
  const getNormalizedBox = useCallback(() => {
    if (!selectionBox) return null;

    const x = Math.min(selectionBox.startX, selectionBox.currentX);
    const y = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);

    return { x, y, width, height };
  }, [selectionBox]);

  // Check if a widget intersects with the selection box
  const widgetIntersectsBox = useCallback((
    widget: { position: { x: number; y: number }; width: number; height: number },
    box: { x: number; y: number; width: number; height: number }
  ) => {
    const widgetRight = widget.position.x + widget.width;
    const widgetBottom = widget.position.y + widget.height;
    const boxRight = box.x + box.width;
    const boxBottom = box.y + box.height;

    return !(
      widget.position.x > boxRight ||
      widgetRight < box.x ||
      widget.position.y > boxBottom ||
      widgetBottom < box.y
    );
  }, []);

  // Handle mouse down to start selection
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled || !isEditMode) return;

    // Only start selection if clicking on the canvas background (not on a widget)
    const target = e.target as HTMLElement;
    if (target.closest('[data-widget-frame]')) return;

    // Must be left click
    if (e.button !== 0) return;

    const canvasPos = clientToCanvas(e.clientX, e.clientY);

    startPositionRef.current = canvasPos;
    setSelectionBox({
      startX: canvasPos.x,
      startY: canvasPos.y,
      currentX: canvasPos.x,
      currentY: canvasPos.y,
    });
    setIsSelecting(true);

    e.preventDefault();
  }, [enabled, isEditMode, clientToCanvas]);

  // Handle mouse move during selection
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isSelecting || !startPositionRef.current) return;

    const canvasPos = clientToCanvas(e.clientX, e.clientY);

    setSelectionBox(prev => prev ? {
      ...prev,
      currentX: canvasPos.x,
      currentY: canvasPos.y,
    } : null);
  }, [isSelecting, clientToCanvas]);

  // Handle mouse up to finish selection
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isSelecting) return;

    const box = getNormalizedBox();

    if (box && box.width > 5 && box.height > 5) {
      // Find widgets that intersect with the selection box
      const selectedWidgets = widgets.filter(widget =>
        !widget.locked &&
        widget.visible !== false &&
        widgetIntersectsBox(widget, box)
      );

      const selectedIds = selectedWidgets.map(w => w.id);

      if (e.shiftKey) {
        // Add to existing selection
        const currentSelection = useCanvasStore.getState().selection.selectedIds;
        const newSelection = [...new Set([...Array.from(currentSelection), ...selectedIds])];
        selectMultiple(newSelection);
        onSelectionChange?.(newSelection);
      } else {
        // Replace selection
        selectMultiple(selectedIds);
        onSelectionChange?.(selectedIds);
      }
    }

    setIsSelecting(false);
    setSelectionBox(null);
    startPositionRef.current = null;
  }, [isSelecting, getNormalizedBox, widgets, widgetIntersectsBox, selectMultiple, onSelectionChange]);

  // Handle escape to cancel selection
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isSelecting) {
      setIsSelecting(false);
      setSelectionBox(null);
      startPositionRef.current = null;
    }
  }, [isSelecting]);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef?.current ?? document;

    container.addEventListener('mousedown', handleMouseDown as EventListener);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown as EventListener);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, containerRef]);

  // Don't render anything if not selecting
  if (!isSelecting || !selectionBox) return null;

  const box = getNormalizedBox();
  if (!box) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: box.x * zoom + viewportOffset.x,
        top: box.y * zoom + viewportOffset.y,
        width: box.width * zoom,
        height: box.height * zoom,
        border: '2px dashed var(--sn-accent-primary, #8b5cf6)',
        background: 'rgba(139, 92, 246, 0.1)',
        pointerEvents: 'none',
        zIndex: 9999,
        borderRadius: 2,
      }}
      data-marquee-selection
    />
  );
};

export default MarqueeSelection;
