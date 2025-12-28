/**
 * StickerNest v2 - Widget Interaction Wrapper
 *
 * Handles all widget interactions (drag, resize, rotate) using the proper
 * controller hooks. Properly records commands for undo/redo support.
 */

import React, { useCallback, useRef, useState, memo } from 'react';
import type { WidgetInstance } from '../../types/domain';
import { useCanvasStore } from '../../state/useCanvasStore';
import { useCanvasExtendedStore } from '../../state/useCanvasExtendedStore';
import { coordinateService } from '../../canvas/CoordinateService';
import { createMoveCommand, createMultiMoveCommand, createResizeCommand, createRotateCommand } from '../../canvas/history';

// ============================================================================
// TYPES
// ============================================================================

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface WidgetInteractionWrapperProps {
  widget: WidgetInstance;
  isSelected: boolean;
  isEditing: boolean;
  isDockTarget?: boolean;
  onDelete?: () => void;
  onDockToDocker?: () => void;
  onContextMenu?: (e: React.MouseEvent, widgetId: string) => void;
  children: React.ReactNode;
}

interface DragState {
  startPosition: { x: number; y: number };
  startMousePosition: { x: number; y: number };
  initialPositions: Map<string, { x: number; y: number }>;
}

interface ResizeState {
  handle: ResizeHandle;
  startBounds: { x: number; y: number; width: number; height: number };
  startMousePosition: { x: number; y: number };
  aspectRatio: number;
}

interface RotationState {
  startRotation: number;
  startMouseAngle: number;
  widgetCenter: { x: number; y: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RESIZE_HANDLE_SIZE = 10;
const MIN_WIDGET_SIZE = 50;

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

// ============================================================================
// COMPONENT
// ============================================================================

export const WidgetInteractionWrapper = memo(function WidgetInteractionWrapper({
  widget,
  isSelected,
  isEditing,
  isDockTarget,
  onDelete,
  onDockToDocker,
  onContextMenu,
  children,
}: WidgetInteractionWrapperProps) {
  // State refs for smooth interactions
  const dragStateRef = useRef<DragState | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const rotationStateRef = useRef<RotationState | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state for visual feedback
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(widget.rotation || 0);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);

  // Store access
  const updateWidget = useCanvasStore(state => state.updateWidget);
  const select = useCanvasStore(state => state.select);
  const getSelectedWidgets = useCanvasStore(state => state.getSelectedWidgets);
  const recordCommand = useCanvasStore(state => state.recordCommand);
  const viewport = useCanvasStore(state => state.viewport);
  const grid = useCanvasStore(state => state.grid);
  const isCanvasLocked = useCanvasExtendedStore(state => state.isCanvasLocked);

  // Snap to grid helper
  const snap = useCallback((value: number): number => {
    return coordinateService.snapToGrid(value, grid.gridSize, grid.snapToGrid);
  }, [grid.gridSize, grid.snapToGrid]);

  // ============================================================================
  // DRAG HANDLERS
  // ============================================================================

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (!isEditing || widget.locked || isCanvasLocked()) return;

    // Ignore if clicking on resize handles or buttons
    const target = e.target as HTMLElement;
    if (target.closest('[data-resize-handle]') || target.closest('button')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Handle selection
    select(widget.id, e.shiftKey);

    // Get all selected widgets for multi-drag
    const selectedWidgets = getSelectedWidgets();
    const isMultiDrag = selectedWidgets.some(w => w.id === widget.id) && selectedWidgets.length > 1;

    // Store initial positions
    const initialPositions = new Map<string, { x: number; y: number }>();
    if (isMultiDrag) {
      selectedWidgets.forEach(w => {
        if (!w.locked) {
          initialPositions.set(w.id, { x: w.position.x, y: w.position.y });
        }
      });
    } else {
      initialPositions.set(widget.id, { x: widget.position.x, y: widget.position.y });
    }

    dragStateRef.current = {
      startPosition: { x: widget.position.x, y: widget.position.y },
      startMousePosition: { x: e.clientX, y: e.clientY },
      initialPositions,
    };

    setIsDragging(true);
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [isEditing, widget, isCanvasLocked, select, getSelectedWidgets]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragStateRef.current) return;

    const { startMousePosition, initialPositions } = dragStateRef.current;

    // Calculate delta accounting for zoom
    const { dx, dy } = coordinateService.screenDeltaToCanvas(
      e.clientX - startMousePosition.x,
      e.clientY - startMousePosition.y,
      viewport.zoom
    );

    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Schedule batched update
    rafIdRef.current = requestAnimationFrame(() => {
      initialPositions.forEach((startPos, id) => {
        const newX = snap(startPos.x + dx);
        const newY = snap(startPos.y + dy);
        updateWidget(id, { position: { x: newX, y: newY } });
      });
      rafIdRef.current = null;
    });
  }, [viewport.zoom, snap, updateWidget]);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!dragStateRef.current) return;

    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const { initialPositions } = dragStateRef.current;

    // Record command for undo/redo
    if (initialPositions.size === 1) {
      // Single widget move
      const startPos = initialPositions.get(widget.id);
      const currentWidget = useCanvasStore.getState().widgets.get(widget.id);
      if (startPos && currentWidget) {
        const hasMoved = startPos.x !== currentWidget.position.x || startPos.y !== currentWidget.position.y;
        if (hasMoved) {
          const command = createMoveCommand(widget.id, startPos, currentWidget.position);
          recordCommand(command);
        }
      }
    } else {
      // Multi-widget move
      const moves: Array<{
        widgetId: string;
        fromPosition: { x: number; y: number };
        toPosition: { x: number; y: number };
      }> = [];

      initialPositions.forEach((fromPos, id) => {
        const currentWidget = useCanvasStore.getState().widgets.get(id);
        if (currentWidget) {
          const hasMoved = fromPos.x !== currentWidget.position.x || fromPos.y !== currentWidget.position.y;
          if (hasMoved) {
            moves.push({
              widgetId: id,
              fromPosition: fromPos,
              toPosition: currentWidget.position,
            });
          }
        }
      });

      if (moves.length > 0) {
        const command = createMultiMoveCommand(moves);
        recordCommand(command);
      }
    }

    // Release pointer capture
    containerRef.current?.releasePointerCapture(e.pointerId);

    // Clear state
    dragStateRef.current = null;
    setIsDragging(false);
  }, [widget.id, recordCommand]);

  // ============================================================================
  // RESIZE HANDLERS
  // ============================================================================

  const handleResizeStart = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    if (!isEditing || widget.locked || isCanvasLocked()) return;

    e.preventDefault();
    e.stopPropagation();

    resizeStateRef.current = {
      handle,
      startBounds: {
        x: widget.position.x,
        y: widget.position.y,
        width: widget.width,
        height: widget.height,
      },
      startMousePosition: { x: e.clientX, y: e.clientY },
      aspectRatio: widget.width / widget.height,
    };

    setIsResizing(true);
    setActiveHandle(handle);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isEditing, widget, isCanvasLocked]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeStateRef.current) return;

    const { handle, startBounds, startMousePosition, aspectRatio } = resizeStateRef.current;
    const { dx, dy } = coordinateService.screenDeltaToCanvas(
      e.clientX - startMousePosition.x,
      e.clientY - startMousePosition.y,
      viewport.zoom
    );

    let newX = startBounds.x;
    let newY = startBounds.y;
    let newWidth = startBounds.width;
    let newHeight = startBounds.height;

    const maintainAspect = e.shiftKey;
    const resizeFromCenter = e.altKey;

    // Apply delta based on handle
    if (handle.includes('e')) {
      newWidth = Math.max(MIN_WIDGET_SIZE, startBounds.width + dx);
    } else if (handle.includes('w')) {
      const widthChange = Math.min(dx, startBounds.width - MIN_WIDGET_SIZE);
      newWidth = startBounds.width - widthChange;
      newX = startBounds.x + widthChange;
    }

    if (handle.includes('s')) {
      newHeight = Math.max(MIN_WIDGET_SIZE, startBounds.height + dy);
    } else if (handle.includes('n')) {
      const heightChange = Math.min(dy, startBounds.height - MIN_WIDGET_SIZE);
      newHeight = startBounds.height - heightChange;
      newY = startBounds.y + heightChange;
    }

    // Maintain aspect ratio if Shift is held (corners only)
    const isCorner = ['ne', 'nw', 'se', 'sw'].includes(handle);
    if (maintainAspect && isCorner) {
      const widthRatio = newWidth / startBounds.width;
      const heightRatio = newHeight / startBounds.height;

      if (Math.abs(widthRatio - 1) > Math.abs(heightRatio - 1)) {
        const adjustedHeight = Math.max(MIN_WIDGET_SIZE, newWidth / aspectRatio);
        if (handle.includes('n')) {
          newY = startBounds.y + startBounds.height - adjustedHeight;
        }
        newHeight = adjustedHeight;
      } else {
        const adjustedWidth = Math.max(MIN_WIDGET_SIZE, newHeight * aspectRatio);
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
      newX = startBounds.x - widthDelta / 2;
      newY = startBounds.y - heightDelta / 2;
    }

    // Apply snapping
    newX = snap(newX);
    newY = snap(newY);
    newWidth = snap(newWidth);
    newHeight = snap(newHeight);

    updateWidget(widget.id, {
      position: { x: newX, y: newY },
      width: newWidth,
      height: newHeight,
    });
  }, [viewport.zoom, snap, updateWidget, widget.id]);

  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (!resizeStateRef.current) return;

    const { startBounds } = resizeStateRef.current;
    const currentWidget = useCanvasStore.getState().widgets.get(widget.id);

    if (currentWidget) {
      const endBounds = {
        x: currentWidget.position.x,
        y: currentWidget.position.y,
        width: currentWidget.width,
        height: currentWidget.height,
      };

      // Only record if something changed
      const hasChanged =
        startBounds.x !== endBounds.x ||
        startBounds.y !== endBounds.y ||
        startBounds.width !== endBounds.width ||
        startBounds.height !== endBounds.height;

      if (hasChanged) {
        const command = createResizeCommand(widget.id, startBounds, endBounds);
        recordCommand(command);
      }
    }

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    resizeStateRef.current = null;
    setIsResizing(false);
    setActiveHandle(null);
  }, [widget.id, recordCommand]);

  // ============================================================================
  // ROTATION HANDLERS
  // ============================================================================

  const handleRotationStart = useCallback((e: React.PointerEvent) => {
    if (!isEditing || widget.locked || isCanvasLocked()) return;

    e.preventDefault();
    e.stopPropagation();

    // Calculate widget center (in canvas coordinates)
    const widgetCenter = {
      x: widget.position.x + widget.width / 2,
      y: widget.position.y + widget.height / 2,
    };

    // Get mouse position in canvas coordinates
    const rect = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const mousePos = coordinateService.screenToCanvas(
      e.clientX - rect.left,
      e.clientY - rect.top,
      viewport
    );

    // Calculate initial angle from center to mouse
    const startMouseAngle = Math.atan2(
      mousePos.y - widgetCenter.y,
      mousePos.x - widgetCenter.x
    ) * (180 / Math.PI);

    rotationStateRef.current = {
      startRotation: widget.rotation || 0,
      startMouseAngle,
      widgetCenter,
    };

    setIsRotating(true);
    setCurrentRotation(widget.rotation || 0);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isEditing, widget, isCanvasLocked, viewport]);

  const handleRotationMove = useCallback((e: React.PointerEvent) => {
    if (!rotationStateRef.current) return;

    const { startRotation, startMouseAngle, widgetCenter } = rotationStateRef.current;

    // Get current mouse position in canvas coordinates
    const rect = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const mousePos = coordinateService.screenToCanvas(
      e.clientX - rect.left,
      e.clientY - rect.top,
      viewport
    );

    // Calculate current angle
    const currentAngle = Math.atan2(
      mousePos.y - widgetCenter.y,
      mousePos.x - widgetCenter.x
    ) * (180 / Math.PI);

    // Calculate rotation delta
    let rotation = startRotation + (currentAngle - startMouseAngle);

    // Shift key snaps to 15 degree increments
    if (e.shiftKey) {
      rotation = Math.round(rotation / 15) * 15;
    }

    // Normalize to 0-360
    rotation = ((rotation % 360) + 360) % 360;

    setCurrentRotation(rotation);
    updateWidget(widget.id, { rotation });
  }, [viewport, updateWidget, widget.id]);

  const handleRotationEnd = useCallback((e: React.PointerEvent) => {
    if (!rotationStateRef.current) return;

    const { startRotation } = rotationStateRef.current;
    const endRotation = currentRotation;

    // Only record if rotation changed
    if (Math.abs(startRotation - endRotation) > 0.1) {
      const command = createRotateCommand(widget.id, startRotation, endRotation);
      recordCommand(command);
    }

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    rotationStateRef.current = null;
    setIsRotating(false);
  }, [widget.id, currentRotation, recordCommand]);

  // ============================================================================
  // POINTER EVENT HANDLERS
  // ============================================================================

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStateRef.current) {
      handleDragMove(e);
    } else if (resizeStateRef.current) {
      handleResizeMove(e);
    } else if (rotationStateRef.current) {
      handleRotationMove(e);
    }
  }, [handleDragMove, handleResizeMove, handleRotationMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragStateRef.current) {
      handleDragEnd(e);
    } else if (resizeStateRef.current) {
      handleResizeEnd(e);
    } else if (rotationStateRef.current) {
      handleRotationEnd(e);
    }
  }, [handleDragEnd, handleResizeEnd, handleRotationEnd]);

  // ============================================================================
  // RESIZE HANDLE RENDERING
  // ============================================================================

  const handles: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  const getHandleStyle = (handle: ResizeHandle): React.CSSProperties => {
    const half = RESIZE_HANDLE_SIZE / 2;
    const base: React.CSSProperties = {
      position: 'absolute',
      width: RESIZE_HANDLE_SIZE,
      height: RESIZE_HANDLE_SIZE,
      backgroundColor: activeHandle === handle ? 'var(--sn-accent-active)' : 'var(--sn-accent-primary)',
      border: '1.5px solid #fff',
      borderRadius: 2,
      zIndex: 10,
      cursor: HANDLE_CURSORS[handle],
      boxShadow: 'var(--sn-shadow-sm, 0 1px 3px rgba(0,0,0,0.3))',
    };

    switch (handle) {
      case 'n':
        return { ...base, top: -half, left: '50%', marginLeft: -half };
      case 's':
        return { ...base, bottom: -half, left: '50%', marginLeft: -half };
      case 'e':
        return { ...base, right: -half, top: '50%', marginTop: -half };
      case 'w':
        return { ...base, left: -half, top: '50%', marginTop: -half };
      case 'ne':
        return { ...base, top: -half, right: -half };
      case 'nw':
        return { ...base, top: -half, left: -half };
      case 'se':
        return { ...base, bottom: -half, right: -half };
      case 'sw':
        return { ...base, bottom: -half, left: -half };
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Determine visual states for styling
  const showHoverState = isHovered && isEditing && !isSelected && !widget.locked;
  const showSelectedState = isSelected && isEditing;
  const isInteracting = isDragging || isResizing || isRotating;

  // Build outline style based on state
  const getOutlineStyle = (): string => {
    if (isDockTarget) {
      return '3px dashed var(--sn-cozy-mint)';
    }
    if (showSelectedState) {
      return `2px solid ${isInteracting ? 'var(--sn-accent-active)' : 'var(--sn-accent-primary)'}`;
    }
    if (showHoverState) {
      return '2px solid var(--sn-accent-primary-40, rgba(139, 92, 246, 0.4))';
    }
    return 'none';
  };

  // Build box-shadow for visual feedback
  const getBoxShadow = (): string | undefined => {
    if (showSelectedState) {
      return '0 0 0 4px rgba(139, 92, 246, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3)';
    }
    if (showHoverState) {
      return '0 0 0 3px rgba(139, 92, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.2)';
    }
    return undefined;
  };

  return (
    <div
      ref={containerRef}
      data-widget-id={widget.id}
      data-interactive="true"
      style={{
        position: 'absolute',
        left: widget.position.x,
        top: widget.position.y,
        width: widget.width,
        height: widget.height,
        transform: widget.rotation ? `rotate(${widget.rotation}deg)` : 'none',
        zIndex: isSelected ? (widget.zIndex || 0) + 1000 : widget.zIndex || 0,
        opacity: widget.visible === false ? 0.5 : (widget.opacity ?? 1),
        pointerEvents: widget.locked ? 'none' : 'auto',
        outline: getOutlineStyle(),
        outlineOffset: isDockTarget ? 4 : 2,
        boxShadow: getBoxShadow(),
        borderRadius: 6,
        transition: isInteracting ? 'none' : 'outline 0.15s ease, box-shadow 0.15s ease',
        cursor: isDragging ? 'grabbing' : isRotating ? 'grabbing' : isResizing ? 'nwse-resize' : isEditing && !widget.locked ? 'grab' : 'default',
      }}
      onPointerDown={handleDragStart}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => onContextMenu?.(e, widget.id)}
    >
      {/* Selection Crop Bars - diagonal stripe border pattern */}
      {showSelectedState && !widget.locked && (
        <div
          style={{
            position: 'absolute',
            inset: -4,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {/* Top crop bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 8,
            right: 8,
            height: 3,
            background: 'repeating-linear-gradient(90deg, var(--sn-accent-primary) 0px, var(--sn-accent-primary) 6px, transparent 6px, transparent 12px)',
            borderRadius: 1,
          }} />
          {/* Bottom crop bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 8,
            right: 8,
            height: 3,
            background: 'repeating-linear-gradient(90deg, var(--sn-accent-primary) 0px, var(--sn-accent-primary) 6px, transparent 6px, transparent 12px)',
            borderRadius: 1,
          }} />
          {/* Left crop bar */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            background: 'repeating-linear-gradient(180deg, var(--sn-accent-primary) 0px, var(--sn-accent-primary) 6px, transparent 6px, transparent 12px)',
            borderRadius: 1,
          }} />
          {/* Right crop bar */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: 8,
            bottom: 8,
            width: 3,
            background: 'repeating-linear-gradient(180deg, var(--sn-accent-primary) 0px, var(--sn-accent-primary) 6px, transparent 6px, transparent 12px)',
            borderRadius: 1,
          }} />
          {/* Corner markers */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 8, height: 3, background: 'var(--sn-accent-primary)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: 8, background: 'var(--sn-accent-primary)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 3, background: 'var(--sn-accent-primary)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: 8, background: 'var(--sn-accent-primary)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 8, height: 3, background: 'var(--sn-accent-primary)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 3, height: 8, background: 'var(--sn-accent-primary)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 3, background: 'var(--sn-accent-primary)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 3, height: 8, background: 'var(--sn-accent-primary)', borderRadius: 1 }} />
        </div>
      )}

      {/* Edit Mode Hover Overlay - visual feedback */}
      {isEditing && !widget.locked && (
        <div
          data-edit-overlay="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none', // Parent handles events
            backgroundColor: showHoverState ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
            borderRadius: 4,
            transition: 'background-color 0.15s ease',
          }}
        />
      )}

      {/* Widget Content */}
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: 4,
          pointerEvents: isEditing ? 'none' : 'auto',
        }}
      >
        {children}
      </div>

      {/* Resize Handles (only in edit mode when selected and not locked) */}
      {isEditing && isSelected && !widget.locked && (
        <>
          {handles.map(handle => (
            <div
              key={handle}
              data-resize-handle={handle}
              style={getHandleStyle(handle)}
              onPointerDown={(e) => handleResizeStart(e, handle)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          ))}

          {/* Rotation Handle - positioned above widget */}
          <div
            style={{
              position: 'absolute',
              top: -36,
              left: '50%',
              marginLeft: -1,
              width: 2,
              height: 20,
              backgroundColor: isRotating ? 'var(--sn-accent-active)' : 'var(--sn-accent-primary)',
              pointerEvents: 'none',
            }}
          />
          <div
            data-rotation-handle
            style={{
              position: 'absolute',
              top: -48,
              left: '50%',
              marginLeft: -8,
              width: 16,
              height: 16,
              backgroundColor: isRotating ? 'var(--sn-accent-active)' : 'var(--sn-accent-primary)',
              border: '2px solid #fff',
              borderRadius: '50%',
              cursor: 'grab',
              boxShadow: 'var(--sn-shadow-md, 0 2px 6px rgba(0, 0, 0, 0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
            }}
            onPointerDown={handleRotationStart}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8" />
            </svg>
          </div>
        </>
      )}

      {/* Rotation Angle Indicator */}
      {isRotating && (
        <div
          style={{
            position: 'absolute',
            top: -72,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '3px 8px',
            backgroundColor: 'var(--sn-accent-primary)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: 'var(--sn-shadow-md, 0 2px 4px rgba(0, 0, 0, 0.3))',
          }}
        >
          {Math.round(currentRotation)}°
        </div>
      )}

      {/* Widget Name Label and Action Buttons */}
      {isEditing && isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: 'var(--sn-accent-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: widget.width - 80,
              fontWeight: 500,
            }}
          >
            {widget.name || widget.widgetDefId.split('.').pop()}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {/* Dock button */}
            {onDockToDocker && !widget.locked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDockToDocker();
                }}
                style={{
                  height: 22,
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: 'var(--sn-accent-gradient)',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600,
                }}
                title="Dock widget"
              >
                <span style={{ fontSize: 12 }}>⊞</span> Dock
              </button>
            )}
            {/* Delete button */}
            {onDelete && !widget.locked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--sn-error)',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 'bold',
                }}
                title="Delete widget"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lock Indicator */}
      {widget.locked && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: 12,
            color: 'var(--sn-text-secondary)',
            background: 'var(--sn-glass-bg)',
            borderRadius: 4,
            padding: '2px 4px',
          }}
        >
          🔒
        </div>
      )}

      {/* Widget Name Tooltip - shows on hover in edit mode when not selected */}
      {isEditing && showHoverState && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 10px',
            background: 'var(--sn-glass-bg-heavy, rgba(15, 15, 25, 0.95))',
            border: '1px solid var(--sn-accent-primary-40, rgba(139, 92, 246, 0.4))',
            borderRadius: 6,
            color: 'var(--sn-text-primary, #e2e8f0)',
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 100,
          }}
        >
          {widget.name || widget.widgetDefId?.split('.').pop() || 'Widget'}
        </div>
      )}

      {/* Modifier key hint during resize */}
      {isResizing && (
        <div
          style={{
            position: 'absolute',
            bottom: -24,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9,
            color: 'var(--sn-text-secondary)',
            whiteSpace: 'nowrap',
            background: 'var(--sn-glass-bg-heavy)',
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          Shift: aspect ratio • Alt: from center
        </div>
      )}

      {/* Modifier key hint during rotation */}
      {isRotating && !isResizing && (
        <div
          style={{
            position: 'absolute',
            bottom: -24,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9,
            color: 'var(--sn-text-secondary)',
            whiteSpace: 'nowrap',
            background: 'var(--sn-glass-bg-heavy)',
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          Shift: snap to 15°
        </div>
      )}
    </div>
  );
});

export default WidgetInteractionWrapper;
