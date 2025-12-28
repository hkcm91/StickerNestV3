/**
 * StickerNest v2 - Canvas Functions 2.0
 * Unified Interaction Controller Hook
 * 
 * Provides consistent drag, resize, and rotate functionality for both
 * widgets and stickers with proper viewport zoom/pan handling.
 */

import { useRef, useCallback, useState } from 'react';
import { coordinateService, type Delta } from '../CoordinateService';
import { haptic } from '../../utils/haptics';

// ============================================================================
// TYPES
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export type InteractionType = 'idle' | 'drag' | 'resize' | 'rotate';
export type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface UnifiedInteractionOptions {
  /** Current position */
  position: Position;
  /** Current size */
  size: Size;
  /** Current rotation in degrees */
  rotation: number;
  /** Viewport state for coordinate transformation */
  viewport: ViewportState;
  /** Enable grid snapping */
  snapToGrid?: boolean;
  /** Grid size in pixels */
  gridSize?: number;
  /** Canvas bounds for constraining */
  canvasBounds?: Size;
  /** Minimum size constraints */
  minSize?: Size;
  /** Lock aspect ratio during resize */
  aspectLocked?: boolean;
  /** Whether interaction is enabled */
  enabled?: boolean;
  /** Callback when position changes */
  onPositionChange: (position: Position) => void;
  /** Callback when size changes */
  onSizeChange: (size: Size, position?: Position) => void;
  /** Callback when rotation changes */
  onRotationChange: (rotation: number) => void;
  /** Callback when interaction starts */
  onInteractionStart?: (type: InteractionType) => void;
  /** Callback when interaction ends */
  onInteractionEnd?: (type: InteractionType) => void;
}

export interface UnifiedInteractionResult {
  /** Current interaction type */
  interactionType: InteractionType;
  /** Whether currently interacting */
  isInteracting: boolean;
  /** Active resize handle if resizing */
  activeHandle: ResizeHandle | null;
  
  /** Handlers for the draggable element */
  dragHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
  };
  
  /** Get handlers for a specific resize handle */
  getResizeHandlers: (handle: ResizeHandle) => {
    onPointerDown: (e: React.PointerEvent) => void;
  };
  
  /** Handlers for the rotation handle */
  rotateHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
  };
  
  /** Global move/up handlers - attach to element with pointer capture */
  globalHandlers: {
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MIN_SIZE: Size = { width: 50, height: 50 };

// ============================================================================
// HOOK
// ============================================================================

export function useUnifiedInteraction(options: UnifiedInteractionOptions): UnifiedInteractionResult {
  const {
    position,
    size,
    rotation,
    viewport,
    snapToGrid = false,
    gridSize = 10,
    canvasBounds,
    minSize = DEFAULT_MIN_SIZE,
    aspectLocked = false,
    enabled = true,
    onPositionChange,
    onSizeChange,
    onRotationChange,
    onInteractionStart,
    onInteractionEnd,
  } = options;

  // State
  const [interactionType, setInteractionType] = useState<InteractionType>('idle');
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);

  // Refs for interaction state
  const dragRef = useRef<{
    startMouse: Position;
    startPosition: Position;
  } | null>(null);

  const resizeRef = useRef<{
    startMouse: Position;
    startBounds: Bounds;
    handle: ResizeHandle;
    aspectRatio: number;
  } | null>(null);

  const rotateRef = useRef<{
    startAngle: number;
    startRotation: number;
    center: Position;
  } | null>(null);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const snap = useCallback((value: number): number => {
    if (!snapToGrid || gridSize <= 0) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const constrainPosition = useCallback((pos: Position, objSize: Size): Position => {
    if (!canvasBounds) return pos;
    return {
      x: Math.max(0, Math.min(pos.x, canvasBounds.width - objSize.width)),
      y: Math.max(0, Math.min(pos.y, canvasBounds.height - objSize.height)),
    };
  }, [canvasBounds]);

  const screenToCanvasDelta = useCallback((screenDeltaX: number, screenDeltaY: number): Delta => {
    return coordinateService.screenDeltaToCanvas(screenDeltaX, screenDeltaY, viewport.zoom);
  }, [viewport.zoom]);

  // ============================================================================
  // DRAG HANDLERS
  // ============================================================================

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;

    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      startMouse: { x: e.clientX, y: e.clientY },
      startPosition: { ...position },
    };

    setInteractionType('drag');
    haptic('dragStart');
    onInteractionStart?.('drag');

    // Capture pointer for reliable tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [enabled, position, onInteractionStart]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;

    const { startMouse, startPosition } = dragRef.current;
    const { dx, dy } = screenToCanvasDelta(
      e.clientX - startMouse.x,
      e.clientY - startMouse.y
    );

    const newPosition = constrainPosition(
      {
        x: snap(startPosition.x + dx),
        y: snap(startPosition.y + dy),
      },
      size
    );

    onPositionChange(newPosition);
  }, [screenToCanvasDelta, constrainPosition, snap, size, onPositionChange]);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;

    dragRef.current = null;
    setInteractionType('idle');
    haptic('dragEnd');
    onInteractionEnd?.('drag');

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [onInteractionEnd]);

  // ============================================================================
  // RESIZE HANDLERS
  // ============================================================================

  const handleResizeStart = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    if (!enabled) return;

    e.preventDefault();
    e.stopPropagation();

    resizeRef.current = {
      startMouse: { x: e.clientX, y: e.clientY },
      startBounds: { ...position, ...size },
      handle,
      aspectRatio: size.width / size.height,
    };

    setInteractionType('resize');
    setActiveHandle(handle);
    haptic('resizeStart');
    onInteractionStart?.('resize');

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [enabled, position, size, onInteractionStart]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;

    const { startMouse, startBounds, handle, aspectRatio } = resizeRef.current;
    const { dx, dy } = screenToCanvasDelta(
      e.clientX - startMouse.x,
      e.clientY - startMouse.y
    );

    let newX = startBounds.x;
    let newY = startBounds.y;
    let newWidth = startBounds.width;
    let newHeight = startBounds.height;

    const maintainAspect = e.shiftKey || aspectLocked;
    const isCorner = ['ne', 'nw', 'se', 'sw'].includes(handle);

    // Apply delta based on handle
    if (handle.includes('e')) {
      newWidth = Math.max(minSize.width, startBounds.width + dx);
    } else if (handle.includes('w')) {
      const widthChange = Math.min(dx, startBounds.width - minSize.width);
      newWidth = startBounds.width - widthChange;
      newX = startBounds.x + widthChange;
    }

    if (handle.includes('s')) {
      newHeight = Math.max(minSize.height, startBounds.height + dy);
    } else if (handle.includes('n')) {
      const heightChange = Math.min(dy, startBounds.height - minSize.height);
      newHeight = startBounds.height - heightChange;
      newY = startBounds.y + heightChange;
    }

    // Maintain aspect ratio if Shift held or aspectLocked
    if (maintainAspect && isCorner) {
      const widthRatio = newWidth / startBounds.width;
      const heightRatio = newHeight / startBounds.height;

      if (Math.abs(widthRatio - 1) > Math.abs(heightRatio - 1)) {
        // Width changed more, adjust height
        const adjustedHeight = Math.max(minSize.height, newWidth / aspectRatio);
        if (handle.includes('n')) {
          newY = startBounds.y + startBounds.height - adjustedHeight;
        }
        newHeight = adjustedHeight;
      } else {
        // Height changed more, adjust width
        const adjustedWidth = Math.max(minSize.width, newHeight * aspectRatio);
        if (handle.includes('w')) {
          newX = startBounds.x + startBounds.width - adjustedWidth;
        }
        newWidth = adjustedWidth;
      }
    }

    // Apply snapping
    newX = snap(newX);
    newY = snap(newY);
    newWidth = snap(newWidth);
    newHeight = snap(newHeight);

    onSizeChange(
      { width: newWidth, height: newHeight },
      { x: newX, y: newY }
    );
  }, [screenToCanvasDelta, aspectLocked, minSize, snap, onSizeChange]);

  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;

    resizeRef.current = null;
    setInteractionType('idle');
    setActiveHandle(null);
    haptic('dragEnd');
    onInteractionEnd?.('resize');

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [onInteractionEnd]);

  // ============================================================================
  // ROTATE HANDLERS
  // ============================================================================

  const handleRotateStart = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;

    e.preventDefault();
    e.stopPropagation();

    // Get element center for rotation calculation
    const rect = (e.target as HTMLElement).parentElement?.getBoundingClientRect();
    if (!rect) return;

    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    const startAngle = Math.atan2(
      e.clientY - center.y,
      e.clientX - center.x
    ) * (180 / Math.PI);

    rotateRef.current = {
      startAngle,
      startRotation: rotation,
      center,
    };

    setInteractionType('rotate');
    haptic('rotateStart');
    onInteractionStart?.('rotate');

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [enabled, rotation, onInteractionStart]);

  const handleRotateMove = useCallback((e: React.PointerEvent) => {
    if (!rotateRef.current) return;

    const { startAngle, startRotation, center } = rotateRef.current;

    const currentAngle = Math.atan2(
      e.clientY - center.y,
      e.clientX - center.x
    ) * (180 / Math.PI);

    let newRotation = startRotation + (currentAngle - startAngle);

    // Snap to 15-degree increments if Shift is held
    if (e.shiftKey) {
      newRotation = Math.round(newRotation / 15) * 15;
    }

    // Normalize to 0-360
    newRotation = ((newRotation % 360) + 360) % 360;

    onRotationChange(newRotation);
  }, [onRotationChange]);

  const handleRotateEnd = useCallback((e: React.PointerEvent) => {
    if (!rotateRef.current) return;

    rotateRef.current = null;
    setInteractionType('idle');
    haptic('dragEnd');
    onInteractionEnd?.('rotate');

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [onInteractionEnd]);

  // ============================================================================
  // GLOBAL HANDLERS
  // ============================================================================

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    switch (interactionType) {
      case 'drag':
        handleDragMove(e);
        break;
      case 'resize':
        handleResizeMove(e);
        break;
      case 'rotate':
        handleRotateMove(e);
        break;
    }
  }, [interactionType, handleDragMove, handleResizeMove, handleRotateMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    switch (interactionType) {
      case 'drag':
        handleDragEnd(e);
        break;
      case 'resize':
        handleResizeEnd(e);
        break;
      case 'rotate':
        handleRotateEnd(e);
        break;
    }
  }, [interactionType, handleDragEnd, handleResizeEnd, handleRotateEnd]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    interactionType,
    isInteracting: interactionType !== 'idle',
    activeHandle,

    dragHandlers: {
      onPointerDown: handleDragStart,
    },

    getResizeHandlers: (handle: ResizeHandle) => ({
      onPointerDown: (e: React.PointerEvent) => handleResizeStart(e, handle),
    }),

    rotateHandlers: {
      onPointerDown: handleRotateStart,
    },

    globalHandlers: {
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}

export default useUnifiedInteraction;











