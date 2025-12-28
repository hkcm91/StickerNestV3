/**
 * StickerNest v2 - Resize Controller Hook
 * Provides resize handling with Shift (aspect ratio) and Alt (from center) modifiers.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '../../state/useCanvasStore';
import { coordinateService } from '../CoordinateService';

type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResizeControllerOptions {
  /** Widget ID being resized */
  widgetId: string;
  /** Initial bounds */
  bounds: Bounds;
  /** Whether resize is enabled */
  enabled?: boolean;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Whether aspect ratio is locked by default */
  aspectLocked?: boolean;
  /** Callback when resize starts */
  onResizeStart?: () => void;
  /** Callback when resize ends */
  onResizeEnd?: (startBounds: Bounds, endBounds: Bounds) => void;
  /** Callback during resize with new bounds */
  onResize?: (bounds: Bounds) => void;
}

interface ResizeState {
  isResizing: boolean;
  handle: ResizeHandle;
  startBounds: Bounds;
  startMousePosition: { x: number; y: number };
  aspectRatio: number;
}

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
  nw: 'nwse-resize',
};

/**
 * Hook that provides resize handling with modifier key support
 */
export function useResizeController(options: ResizeControllerOptions) {
  const {
    widgetId,
    bounds,
    enabled = true,
    minWidth = 50,
    minHeight = 50,
    aspectLocked = false,
    onResizeStart,
    onResizeEnd,
    onResize,
  } = options;

  const resizeStateRef = useRef<ResizeState | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);

  const updateWidget = useCanvasStore(state => state.updateWidget);
  const viewport = useCanvasStore(state => state.viewport);

  // Calculate new bounds based on handle, delta, and modifiers
  const calculateNewBounds = useCallback((
    startBounds: Bounds,
    deltaX: number,
    deltaY: number,
    handle: ResizeHandle,
    shiftKey: boolean,
    altKey: boolean,
    aspectRatio: number
  ): Bounds => {
    let newX = startBounds.x;
    let newY = startBounds.y;
    let newWidth = startBounds.width;
    let newHeight = startBounds.height;

    const maintainAspect = shiftKey || aspectLocked;
    const resizeFromCenter = altKey;
    const isCorner = ['ne', 'nw', 'se', 'sw'].includes(handle);

    // Apply delta based on handle direction
    if (handle.includes('e')) {
      newWidth = Math.max(minWidth, startBounds.width + deltaX);
    } else if (handle.includes('w')) {
      const widthChange = Math.min(deltaX, startBounds.width - minWidth);
      newWidth = startBounds.width - widthChange;
      newX = startBounds.x + widthChange;
    }

    if (handle.includes('s')) {
      newHeight = Math.max(minHeight, startBounds.height + deltaY);
    } else if (handle.includes('n')) {
      const heightChange = Math.min(deltaY, startBounds.height - minHeight);
      newHeight = startBounds.height - heightChange;
      newY = startBounds.y + heightChange;
    }

    // Maintain aspect ratio if Shift is held or aspectLocked
    if (maintainAspect && isCorner) {
      const widthRatio = newWidth / startBounds.width;
      const heightRatio = newHeight / startBounds.height;

      // Use the larger change as the basis
      if (Math.abs(widthRatio - 1) > Math.abs(heightRatio - 1)) {
        // Width changed more, adjust height
        const adjustedHeight = Math.max(minHeight, newWidth / aspectRatio);
        if (handle.includes('n')) {
          newY = startBounds.y + startBounds.height - adjustedHeight;
        }
        newHeight = adjustedHeight;
      } else {
        // Height changed more, adjust width
        const adjustedWidth = Math.max(minWidth, newHeight * aspectRatio);
        if (handle.includes('w')) {
          newX = startBounds.x + startBounds.width - adjustedWidth;
        }
        newWidth = adjustedWidth;
      }
    }

    // Resize from center if Alt is held
    if (resizeFromCenter) {
      const widthDelta = newWidth - startBounds.width;
      const heightDelta = newHeight - startBounds.height;

      // Center the size change
      newX = startBounds.x - widthDelta / 2;
      newY = startBounds.y - heightDelta / 2;
      newWidth = startBounds.width + widthDelta;
      newHeight = startBounds.height + heightDelta;

      // For corners with aspect ratio, recalculate
      if (maintainAspect && isCorner) {
        const size = Math.max(newWidth, newHeight * aspectRatio);
        newWidth = size;
        newHeight = size / aspectRatio;
        newX = startBounds.x + (startBounds.width - newWidth) / 2;
        newY = startBounds.y + (startBounds.height - newHeight) / 2;
      }
    }

    return {
      x: newX,
      y: newY,
      width: Math.max(minWidth, newWidth),
      height: Math.max(minHeight, newHeight),
    };
  }, [minWidth, minHeight, aspectLocked]);

  // Get handler props for a specific handle
  const getHandleProps = useCallback((handle: ResizeHandle) => {
    return {
      'data-resize-handle': handle,
      style: { cursor: HANDLE_CURSORS[handle] },

      onPointerDown: (e: React.PointerEvent) => {
        if (!enabled) return;
        e.preventDefault();
        e.stopPropagation();

        resizeStateRef.current = {
          isResizing: true,
          handle,
          startBounds: { ...bounds },
          startMousePosition: { x: e.clientX, y: e.clientY },
          aspectRatio: bounds.width / bounds.height,
        };

        setActiveHandle(handle);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onResizeStart?.();
      },

      onPointerMove: (e: React.PointerEvent) => {
        if (!resizeStateRef.current?.isResizing) return;

        const { startBounds, startMousePosition, aspectRatio } = resizeStateRef.current;

        // Calculate delta using coordinate service
        const screenDeltaX = e.clientX - startMousePosition.x;
        const screenDeltaY = e.clientY - startMousePosition.y;
        const { dx, dy } = coordinateService.screenDeltaToCanvas(
          screenDeltaX,
          screenDeltaY,
          viewport.zoom
        );

        const newBounds = calculateNewBounds(
          startBounds,
          dx,
          dy,
          resizeStateRef.current.handle,
          e.shiftKey,
          e.altKey,
          aspectRatio
        );

        // Update widget
        updateWidget(widgetId, {
          position: { x: newBounds.x, y: newBounds.y },
          width: newBounds.width,
          height: newBounds.height,
        });

        onResize?.(newBounds);
      },

      onPointerUp: (e: React.PointerEvent) => {
        if (!resizeStateRef.current?.isResizing) return;

        const { startBounds } = resizeStateRef.current;
        const widget = useCanvasStore.getState().widgets.get(widgetId);
        const endBounds: Bounds = widget
          ? { x: widget.position.x, y: widget.position.y, width: widget.width, height: widget.height }
          : startBounds;

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        onResizeEnd?.(startBounds, endBounds);

        resizeStateRef.current = null;
        setActiveHandle(null);
      },
    };
  }, [enabled, bounds, widgetId, viewport.zoom, updateWidget, calculateNewBounds, onResizeStart, onResizeEnd, onResize]);

  // Cleanup
  useEffect(() => {
    return () => {
      resizeStateRef.current = null;
    };
  }, []);

  return {
    /** Get props to spread on a resize handle element */
    getHandleProps,
    /** Currently active handle (if resizing) */
    activeHandle,
    /** Whether currently resizing */
    isResizing: activeHandle !== null,
    /** Cursor for the active handle */
    cursor: activeHandle ? HANDLE_CURSORS[activeHandle] : undefined,
  };
}

export default useResizeController;
