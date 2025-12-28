/**
 * StickerNest v2 - Selection Bounds Overlay
 * Shows a bounding box around multiple selected widgets with transform handles
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';
import { SNIcon } from '../shared-ui/SNIcon';

interface SelectionBoundsOverlayProps {
  /** Whether the overlay is enabled */
  enabled?: boolean;
  /** Canvas bounds for constraint */
  canvasBounds?: { width: number; height: number };
  /** Grid size for snapping */
  gridSize?: number;
  /** Whether to snap to grid */
  snapToGrid?: boolean;
}

type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const HANDLE_SIZE = 10;
const ROTATION_HANDLE_OFFSET = 30;

export const SelectionBoundsOverlay: React.FC<SelectionBoundsOverlayProps> = ({
  enabled = true,
  canvasBounds,
  gridSize = 10,
  snapToGrid = false,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);

  const resizeStartRef = useRef<{
    bounds: { x: number; y: number; width: number; height: number };
    mouseX: number;
    mouseY: number;
    widgetPositions: Map<string, { x: number; y: number; width: number; height: number }>;
  } | null>(null);

  const rotateStartRef = useRef<{
    angle: number;
    centerX: number;
    centerY: number;
    widgetRotations: Map<string, number>;
  } | null>(null);

  // Canvas store
  const selectedIds = useCanvasStore(state => Array.from(state.selection.selectedIds));
  const widgets = useCanvasStore(state => state.widgets);
  const updateWidget = useCanvasStore(state => state.updateWidget);
  const saveSnapshot = useCanvasStore(state => state.saveSnapshot);
  const mode = useCanvasStore(state => state.mode);

  const isEditMode = mode === 'edit';
  const hasMultipleSelection = selectedIds.length >= 2;

  // Calculate selection bounds
  const bounds = useMemo(() => {
    if (!hasMultipleSelection) return null;

    const selectedWidgets = selectedIds
      .map(id => widgets.get(id))
      .filter(Boolean);

    if (selectedWidgets.length < 2) return null;

    const minX = Math.min(...selectedWidgets.map(w => w!.position.x));
    const minY = Math.min(...selectedWidgets.map(w => w!.position.y));
    const maxX = Math.max(...selectedWidgets.map(w => w!.position.x + w!.width));
    const maxY = Math.max(...selectedWidgets.map(w => w!.position.y + w!.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }, [selectedIds, widgets, hasMultipleSelection]);

  // Snap value to grid
  const snap = useCallback((value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Handle group resize start
  const handleResizeStart = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    if (!bounds) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setActiveHandle(handle);

    // Store initial widget positions
    const widgetPositions = new Map<string, { x: number; y: number; width: number; height: number }>();
    selectedIds.forEach(id => {
      const widget = widgets.get(id);
      if (widget) {
        widgetPositions.set(id, {
          x: widget.position.x,
          y: widget.position.y,
          width: widget.width,
          height: widget.height,
        });
      }
    });

    resizeStartRef.current = {
      bounds: { ...bounds },
      mouseX: e.clientX,
      mouseY: e.clientY,
      widgetPositions,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [bounds, selectedIds, widgets]);

  // Handle group resize move
  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing || !resizeStartRef.current || !activeHandle || !bounds) return;

    const { bounds: startBounds, mouseX, mouseY, widgetPositions } = resizeStartRef.current;
    const deltaX = e.clientX - mouseX;
    const deltaY = e.clientY - mouseY;

    // Calculate new bounds based on handle
    let newX = startBounds.x;
    let newY = startBounds.y;
    let newWidth = startBounds.width;
    let newHeight = startBounds.height;

    if (activeHandle.includes('e')) {
      newWidth = Math.max(50, startBounds.width + deltaX);
    } else if (activeHandle.includes('w')) {
      const widthDelta = Math.min(deltaX, startBounds.width - 50);
      newWidth = startBounds.width - widthDelta;
      newX = startBounds.x + widthDelta;
    }

    if (activeHandle.includes('s')) {
      newHeight = Math.max(50, startBounds.height + deltaY);
    } else if (activeHandle.includes('n')) {
      const heightDelta = Math.min(deltaY, startBounds.height - 50);
      newHeight = startBounds.height - heightDelta;
      newY = startBounds.y + heightDelta;
    }

    // Maintain aspect ratio with Shift key
    if (e.shiftKey && (activeHandle === 'ne' || activeHandle === 'nw' || activeHandle === 'se' || activeHandle === 'sw')) {
      const aspectRatio = startBounds.width / startBounds.height;
      if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
      } else {
        newHeight = newWidth / aspectRatio;
      }
    }

    // Calculate scale factors
    const scaleX = newWidth / startBounds.width;
    const scaleY = newHeight / startBounds.height;

    // Update all selected widgets proportionally
    widgetPositions.forEach((startPos, id) => {
      // Calculate widget position relative to original bounds
      const relX = startPos.x - startBounds.x;
      const relY = startPos.y - startBounds.y;

      // Scale position and size
      const scaledX = snap(newX + relX * scaleX);
      const scaledY = snap(newY + relY * scaleY);
      const scaledWidth = snap(startPos.width * scaleX);
      const scaledHeight = snap(startPos.height * scaleY);

      updateWidget(id, {
        position: { x: scaledX, y: scaledY },
        width: Math.max(20, scaledWidth),
        height: Math.max(20, scaledHeight),
      });
    });
  }, [isResizing, activeHandle, bounds, snap, updateWidget]);

  // Handle group resize end
  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      setActiveHandle(null);
      resizeStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      saveSnapshot();
    }
  }, [isResizing, saveSnapshot]);

  // Handle group rotate start
  const handleRotateStart = useCallback((e: React.PointerEvent) => {
    if (!bounds) return;
    e.preventDefault();
    e.stopPropagation();

    setIsRotating(true);

    // Store initial widget rotations
    const widgetRotations = new Map<string, number>();
    selectedIds.forEach(id => {
      const widget = widgets.get(id);
      if (widget) {
        widgetRotations.set(id, widget.rotation);
      }
    });

    const angle = Math.atan2(e.clientY - bounds.centerY, e.clientX - bounds.centerX) * (180 / Math.PI);

    rotateStartRef.current = {
      angle,
      centerX: bounds.centerX,
      centerY: bounds.centerY,
      widgetRotations,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [bounds, selectedIds, widgets]);

  // Handle group rotate move
  const handleRotateMove = useCallback((e: React.PointerEvent) => {
    if (!isRotating || !rotateStartRef.current || !bounds) return;

    const { angle: startAngle, centerX, centerY, widgetRotations } = rotateStartRef.current;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    let deltaAngle = currentAngle - startAngle;

    // Snap to 15 degrees with Shift
    if (e.shiftKey) {
      deltaAngle = Math.round(deltaAngle / 15) * 15;
    }

    // Update all selected widgets
    widgetRotations.forEach((startRotation, id) => {
      let newRotation = ((startRotation + deltaAngle) % 360 + 360) % 360;
      updateWidget(id, { rotation: newRotation });
    });
  }, [isRotating, bounds, updateWidget]);

  // Handle group rotate end
  const handleRotateEnd = useCallback((e: React.PointerEvent) => {
    if (isRotating) {
      setIsRotating(false);
      rotateStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      saveSnapshot();
    }
  }, [isRotating, saveSnapshot]);

  // Get cursor for resize handle
  const getHandleCursor = (handle: ResizeHandle): string => {
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

  if (!enabled || !isEditMode || !bounds || !hasMultipleSelection) return null;

  const handles: ResizeHandle[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

  const handlePositions: Record<ResizeHandle, React.CSSProperties> = {
    n: { top: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)' },
    ne: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
    e: { top: '50%', right: -HANDLE_SIZE / 2, transform: 'translateY(-50%)' },
    se: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
    s: { bottom: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)' },
    sw: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
    w: { top: '50%', left: -HANDLE_SIZE / 2, transform: 'translateY(-50%)' },
    nw: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        pointerEvents: 'none',
        zIndex: 50,
      }}
      data-selection-bounds
    >
      {/* Bounding box */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: '2px dashed #9acd32',
          borderRadius: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Resize handles */}
      {handles.map(handle => (
        <div
          key={handle}
          style={{
            position: 'absolute',
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            background: '#9acd32',
            border: '2px solid white',
            borderRadius: 2,
            cursor: getHandleCursor(handle),
            pointerEvents: 'auto',
            zIndex: 51,
            ...handlePositions[handle],
          }}
          onPointerDown={(e) => handleResizeStart(e, handle)}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
        />
      ))}

      {/* Rotation handle */}
      <div
        style={{
          position: 'absolute',
          top: -ROTATION_HANDLE_OFFSET,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            width: 2,
            height: ROTATION_HANDLE_OFFSET - HANDLE_SIZE,
            background: '#9acd32',
            opacity: 0.6,
          }}
        />
        <div
          style={{
            width: HANDLE_SIZE + 4,
            height: HANDLE_SIZE + 4,
            background: 'linear-gradient(135deg, #9acd32 0%, #6b8e23 100%)',
            border: '2px solid white',
            borderRadius: '50%',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPointerDown={handleRotateStart}
          onPointerMove={handleRotateMove}
          onPointerUp={handleRotateEnd}
        >
          <SNIcon name="rotate" size="xs" />
        </div>
      </div>

      {/* Size info */}
      <div
        style={{
          position: 'absolute',
          bottom: -24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {Math.round(bounds.width)} × {Math.round(bounds.height)} • {selectedIds.length} items
      </div>
    </div>
  );
};

export default SelectionBoundsOverlay;
