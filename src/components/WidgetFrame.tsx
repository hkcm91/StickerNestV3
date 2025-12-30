/**
 * StickerNest v2 - WidgetFrame
 * Wrapper component for widget instances with drag, resize, and rotate handles
 * Supports edit mode interaction and view mode passthrough
 *
 * Updated with new design system: SNIcon, glass effects
 */

import React, { useRef, useCallback, useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import type { WidgetInstance } from '../types/domain';
import type { CanvasMode } from '../types/runtime';
import { useStickerStore } from '../state/useStickerStore';
import { useSelectionStore, useIsMultiSelectActive } from '../state/useSelectionStore';
import { SNIcon } from '../shared-ui/SNIcon';

/** Scale mode for widget content within the frame */
export type WidgetScaleMode = 'crop' | 'scale' | 'stretch' | 'contain';

interface WidgetFrameProps {
  instance: WidgetInstance;
  selected: boolean;
  /** Whether this widget is part of a multi-selection */
  isMultiSelected?: boolean;
  mode: CanvasMode;
  gridSnap?: boolean;
  gridSize?: number;
  canvasBounds?: { width: number; height: number };
  /**
   * Scale mode for widget content:
   * - crop: No scaling, content clips to frame boundaries
   * - scale: Scale content proportionally as frame resizes
   * - stretch: Stretch content to fill frame (may distort)
   * - contain: Scale to fit inside frame, maintain aspect ratio (letterbox)
   */
  scaleMode?: WidgetScaleMode;
  /** Native/original content dimensions for scale calculations */
  nativeWidth?: number;
  nativeHeight?: number;
  /** Whether this widget is currently docked */
  isDocked?: boolean;
  onSelect: (instanceId: string, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => void;
  onDrag: (instanceId: string, x: number, y: number) => void;
  onResize: (instanceId: string, width: number, height: number, x?: number, y?: number) => void;
  onRotate: (instanceId: string, rotation: number) => void;
  children: React.ReactNode;
}

type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
type InteractionMode = 'idle' | 'dragging' | 'resizing' | 'rotating';

const MIN_WIDTH = 50;
const MIN_HEIGHT = 50;
const HANDLE_SIZE = 10;
const ROTATION_HANDLE_OFFSET = 25;

const WidgetFrameComponent: React.FC<WidgetFrameProps> = ({
  instance,
  selected,
  isMultiSelected = false,
  mode,
  gridSnap = false,
  gridSize = 10,
  canvasBounds,
  scaleMode = 'contain',
  nativeWidth,
  nativeHeight,
  isDocked = false,
  onSelect,
  onDrag,
  onResize,
  onRotate,
  children
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [isDraggingToDock, setIsDraggingToDock] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const resizeStartRef = useRef<{
    x: number; y: number;
    startX: number; startY: number;
    startWidth: number; startHeight: number;
  } | null>(null);
  const rotateStartRef = useRef<{
    angle: number;
    startRotation: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const { setDraggedWidget, isWidgetDocked, dockWidget, getDockZonesByCanvas, updateDockZone } = useStickerStore();

  // Multi-select state from selection store
  const handleEntityClick = useSelectionStore((s) => s.handleEntityClick);
  const isMultiSelectActiveGlobal = useIsMultiSelectActive();

  const isEditMode = mode === 'edit';
  const widgetIsDocked = isDocked || isWidgetDocked(instance.id);

  // Calculate content scaling based on scale mode
  const getContentStyle = useCallback((): React.CSSProperties => {
    // Use native dimensions or fall back to current frame dimensions
    const contentWidth = nativeWidth || instance.width;
    const contentHeight = nativeHeight || instance.height;
    const frameWidth = instance.width;
    const frameHeight = instance.height;

    switch (scaleMode) {
      case 'crop':
        // No scaling, content at native size, overflow hidden
        return {
          width: contentWidth,
          height: contentHeight,
          overflow: 'hidden',
        };

      case 'scale': {
        // Scale proportionally to fit frame
        const scaleX = frameWidth / contentWidth;
        const scaleY = frameHeight / contentHeight;
        const scale = Math.min(scaleX, scaleY);
        return {
          width: contentWidth,
          height: contentHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        };
      }

      case 'stretch':
        // Stretch to fill frame (may distort aspect ratio)
        return {
          width: '100%',
          height: '100%',
        };

      case 'contain': {
        // Scale to fit inside frame, maintain aspect ratio (letterbox)
        const scaleX = frameWidth / contentWidth;
        const scaleY = frameHeight / contentHeight;
        const scale = Math.min(scaleX, scaleY);
        const scaledWidth = contentWidth * scale;
        const scaledHeight = contentHeight * scale;
        // Center the content
        const offsetX = (frameWidth - scaledWidth) / 2;
        const offsetY = (frameHeight - scaledHeight) / 2;
        return {
          width: contentWidth,
          height: contentHeight,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: 'top left',
        };
      }

      default:
        return {
          width: '100%',
          height: '100%',
        };
    }
  }, [scaleMode, instance.width, instance.height, nativeWidth, nativeHeight]);

  // Snap value to grid
  const snapToGrid = useCallback((value: number): number => {
    if (!gridSnap) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [gridSnap, gridSize]);

  // Constrain position to canvas bounds
  const constrainToBounds = useCallback((x: number, y: number, width: number, height: number) => {
    if (!canvasBounds) return { x, y };
    return {
      x: Math.max(0, Math.min(x, canvasBounds.width - width)),
      y: Math.max(0, Math.min(y, canvasBounds.height - height))
    };
  }, [canvasBounds]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (!isEditMode) {
      return;
    }

    // Don't capture pointer if clicking on the dock button - let HTML5 drag handle it
    const target = e.target as HTMLElement;
    if (target.closest('[data-dock-handle]')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    onSelect(instance.id);
    setInteractionMode('dragging');

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: instance.position.x,
      startY: instance.position.y
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isEditMode, instance.id, instance.position, onSelect]);

  // Handle drag move
  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (interactionMode !== 'dragging' || !dragStartRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    let newX = snapToGrid(dragStartRef.current.startX + deltaX);
    let newY = snapToGrid(dragStartRef.current.startY + deltaY);

    const constrained = constrainToBounds(newX, newY, instance.width, instance.height);
    onDrag(instance.id, constrained.x, constrained.y);
  }, [interactionMode, instance.id, instance.width, instance.height, snapToGrid, constrainToBounds, onDrag]);

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
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    setInteractionMode('resizing');
    setActiveHandle(handle);

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: instance.position.x,
      startY: instance.position.y,
      startWidth: instance.width,
      startHeight: instance.height
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isEditMode, instance.position, instance.width, instance.height]);

  // Handle resize move
  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (interactionMode !== 'resizing' || !resizeStartRef.current || !activeHandle) return;

    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;

    let newWidth = resizeStartRef.current.startWidth;
    let newHeight = resizeStartRef.current.startHeight;
    let newX = resizeStartRef.current.startX;
    let newY = resizeStartRef.current.startY;

    // Handle horizontal resize
    if (activeHandle.includes('e')) {
      newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startWidth + deltaX);
    } else if (activeHandle.includes('w')) {
      const widthDelta = Math.min(deltaX, resizeStartRef.current.startWidth - MIN_WIDTH);
      newWidth = resizeStartRef.current.startWidth - widthDelta;
      newX = resizeStartRef.current.startX + widthDelta;
    }

    // Handle vertical resize
    if (activeHandle.includes('s')) {
      newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight + deltaY);
    } else if (activeHandle.includes('n')) {
      const heightDelta = Math.min(deltaY, resizeStartRef.current.startHeight - MIN_HEIGHT);
      newHeight = resizeStartRef.current.startHeight - heightDelta;
      newY = resizeStartRef.current.startY + heightDelta;
    }

    // Apply grid snapping
    newWidth = snapToGrid(newWidth);
    newHeight = snapToGrid(newHeight);
    newX = snapToGrid(newX);
    newY = snapToGrid(newY);

    onResize(instance.id, newWidth, newHeight, newX, newY);
  }, [interactionMode, activeHandle, instance.id, snapToGrid, onResize]);

  // Handle resize end
  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (interactionMode === 'resizing') {
      setInteractionMode('idle');
      setActiveHandle(null);
      resizeStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [interactionMode]);

  // Handle rotate start
  const handleRotateStart = useCallback((e: React.PointerEvent) => {
    if (!isEditMode || !frameRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    setInteractionMode('rotating');

    const rect = frameRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    rotateStartRef.current = {
      angle,
      startRotation: instance.rotation,
      centerX,
      centerY
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isEditMode, instance.rotation]);

  // Handle rotate move
  const handleRotateMove = useCallback((e: React.PointerEvent) => {
    if (interactionMode !== 'rotating' || !rotateStartRef.current) return;

    const currentAngle = Math.atan2(
      e.clientY - rotateStartRef.current.centerY,
      e.clientX - rotateStartRef.current.centerX
    ) * (180 / Math.PI);

    const angleDelta = currentAngle - rotateStartRef.current.angle;
    let newRotation = rotateStartRef.current.startRotation + angleDelta;

    // Normalize rotation to 0-360
    newRotation = ((newRotation % 360) + 360) % 360;

    // Snap to 15 degree increments if grid snapping is enabled
    if (gridSnap) {
      newRotation = Math.round(newRotation / 15) * 15;
    }

    onRotate(instance.id, newRotation);
  }, [interactionMode, instance.id, gridSnap, onRotate]);

  // Handle rotate end
  const handleRotateEnd = useCallback((e: React.PointerEvent) => {
    if (interactionMode === 'rotating') {
      setInteractionMode('idle');
      rotateStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [interactionMode]);

  // Combined pointer move handler
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    switch (interactionMode) {
      case 'dragging':
        handleDragMove(e);
        break;
      case 'resizing':
        handleResizeMove(e);
        break;
      case 'rotating':
        handleRotateMove(e);
        break;
    }
  }, [interactionMode, handleDragMove, handleResizeMove, handleRotateMove]);

  // Combined pointer up handler
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    switch (interactionMode) {
      case 'dragging':
        handleDragEnd(e);
        break;
      case 'resizing':
        handleResizeEnd(e);
        break;
      case 'rotating':
        handleRotateEnd(e);
        break;
    }
  }, [interactionMode, handleDragEnd, handleResizeEnd, handleRotateEnd]);

  // Click handler for selection with multi-select support
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isEditMode) {
      return;
    }
    e.stopPropagation();

    // Use unified selection store for Ctrl+click multi-select
    handleEntityClick(instance.id, 'widget', {
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
    });

    // Also call the parent's onSelect for compatibility
    onSelect(instance.id, {
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
    });
  }, [isEditMode, instance.id, onSelect, handleEntityClick]);

  // HTML5 Drag handlers for docking functionality
  const handleDragStartForDock = useCallback((e: React.DragEvent) => {
    if (!isEditMode) {
      e.preventDefault();
      return;
    }

    // Set the widget ID in dataTransfer for the dock panel to receive
    e.dataTransfer.setData('text/widget-id', instance.id);
    e.dataTransfer.effectAllowed = 'move';

    // Create a drag image
    const dragImage = document.createElement('div');
    dragImage.style.width = '100px';
    dragImage.style.height = '60px';
    dragImage.style.background = 'rgba(139, 92, 246, 0.8)';
    dragImage.style.borderRadius = '8px';
    dragImage.style.display = 'flex';
    dragImage.style.alignItems = 'center';
    dragImage.style.justifyContent = 'center';
    dragImage.style.color = 'white';
    dragImage.style.fontSize = '12px';
    dragImage.style.fontWeight = '600';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.textContent = 'Dock Widget';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 30);

    // Clean up drag image after a short delay
    setTimeout(() => document.body.removeChild(dragImage), 0);

    setIsDraggingToDock(true);
    setDraggedWidget(instance.id);
  }, [isEditMode, instance.id, setDraggedWidget]);

  const handleDragEndForDock = useCallback(() => {
    setIsDraggingToDock(false);
    setDraggedWidget(null);
  }, [setDraggedWidget]);

  // Click handler to dock widget directly
  const handleClickToDock = useCallback(() => {
    if (!isEditMode) return;

    const dockZones = getDockZonesByCanvas(instance.canvasId);
    const targetZone = dockZones.find(z => z.acceptsDrops);

    if (targetZone) {
      // Dock the widget
      dockWidget(instance.id, targetZone.id, undefined, {
        position: { x: instance.position.x, y: instance.position.y },
        size: { width: instance.width, height: instance.height }
      });
      // Make the dock zone visible so user can see the docked widget
      updateDockZone(targetZone.id, { visible: true });
    }
  }, [isEditMode, instance, getDockZonesByCanvas, dockWidget, updateDockZone]);

  // Get cursor style based on handle
  const getHandleCursor = (handle: ResizeHandle): string => {
    // TODO: Adjust cursor based on rotation (instance.rotation)
    const cursors: Record<ResizeHandle, string> = {
      n: 'ns-resize',
      ne: 'nesw-resize',
      e: 'ew-resize',
      se: 'nwse-resize',
      s: 'ns-resize',
      sw: 'nesw-resize',
      w: 'ew-resize',
      nw: 'nwse-resize'
    };
    return cursors[handle];
  };

  // Render resize handles
  const renderResizeHandles = () => {
    if (!isEditMode || !selected) return null;

    const handles: ResizeHandle[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

    const handlePositions: Record<ResizeHandle, React.CSSProperties> = {
      n: { top: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)' },
      ne: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
      e: { top: '50%', right: -HANDLE_SIZE / 2, transform: 'translateY(-50%)' },
      se: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
      s: { bottom: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)' },
      sw: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
      w: { top: '50%', left: -HANDLE_SIZE / 2, transform: 'translateY(-50%)' },
      nw: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 }
    };

    return handles.map(handle => (
      <div
        key={handle}
        onPointerDown={(e) => handleResizeStart(e, handle)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'absolute',
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          background: 'var(--sn-accent-primary, #8b5cf6)',
          border: '2px solid rgba(255, 255, 255, 0.8)',
          borderRadius: 3,
          cursor: getHandleCursor(handle),
          zIndex: 10,
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
          ...handlePositions[handle]
        }}
      />
    ));
  };

  // Render rotation handle
  const renderRotationHandle = () => {
    if (!isEditMode || !selected) return null;

    return (
      <>
        {/* Line connecting to rotation handle */}
        <div style={{
          position: 'absolute',
          top: -ROTATION_HANDLE_OFFSET,
          left: '50%',
          width: 2,
          height: ROTATION_HANDLE_OFFSET - HANDLE_SIZE / 2,
          background: 'var(--sn-accent-primary, #8b5cf6)',
          transform: 'translateX(-50%)',
          opacity: 0.6,
        }} />
        {/* Rotation handle */}
        <div
          onPointerDown={handleRotateStart}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'absolute',
            top: -ROTATION_HANDLE_OFFSET - HANDLE_SIZE / 2,
            left: '50%',
            width: HANDLE_SIZE + 2,
            height: HANDLE_SIZE + 2,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
            cursor: 'grab',
            transform: 'translateX(-50%)',
            zIndex: 10,
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
          }}
        />
      </>
    );
  };

  // Portal target state
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const portalCheckRafRef = useRef<number | null>(null);

  // Check for portal target when docked
  useEffect(() => {
    // Cancel any pending RAF from previous effect
    if (portalCheckRafRef.current !== null) {
      cancelAnimationFrame(portalCheckRafRef.current);
      portalCheckRafRef.current = null;
    }

    if (widgetIsDocked) {
      let retryCount = 0;
      const maxRetries = 60; // ~1 second at 60fps

      const checkTarget = () => {
        const target = document.getElementById(`dock-slot-${instance.id}`);
        if (target) {
          setPortalTarget(target);
          portalCheckRafRef.current = null;
        } else if (retryCount < maxRetries) {
          // Retry if not found immediately (dock panel might be rendering)
          retryCount++;
          portalCheckRafRef.current = requestAnimationFrame(checkTarget);
        } else {
          // Give up after max retries to prevent infinite loop
          console.warn(`WidgetFrame: Could not find dock-slot-${instance.id} after ${maxRetries} attempts`);
          portalCheckRafRef.current = null;
        }
      };
      checkTarget();
    } else {
      setPortalTarget(null);
    }

    // Cleanup function to cancel RAF on unmount or dependency change
    return () => {
      if (portalCheckRafRef.current !== null) {
        cancelAnimationFrame(portalCheckRafRef.current);
        portalCheckRafRef.current = null;
      }
    };
  }, [widgetIsDocked, instance.id]);

  const content = (
    <div
      ref={frameRef}
      onClick={handleClick}
      onPointerDown={handleDragStart}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-widget-frame={instance.id}
      data-widget-docked={widgetIsDocked}
      style={{
        position: widgetIsDocked ? 'relative' : 'absolute',
        left: widgetIsDocked ? 0 : instance.position.x,
        top: widgetIsDocked ? 0 : instance.position.y,
        width: widgetIsDocked ? '100%' : instance.width,
        height: widgetIsDocked ? '100%' : instance.height,
        transform: (!widgetIsDocked && instance.rotation !== 0) ? `rotate(${instance.rotation}deg)` : undefined,
        transformOrigin: 'center center',
        zIndex: isDraggingToDock ? 10000 : instance.zIndex,
        cursor: isEditMode ? (interactionMode === 'dragging' ? 'grabbing' : 'grab') : 'default',
        userSelect: 'none',
        touchAction: 'none',
        // Use box-shadow instead of outline for selection
        // (outline is NOT clipped by overflow:hidden, but box-shadow IS)
        boxShadow: selected && isEditMode && !widgetIsDocked
          ? isMultiSelected
            ? '0 0 0 2px #9acd32, 0 0 0 6px rgba(154, 205, 50, 0.2)'
            : '0 0 0 2px #4a9eff, 0 0 0 6px rgba(74, 158, 255, 0.2)'
          : undefined,
        opacity: isDraggingToDock ? 0.5 : 1,
        display: 'block',
      }}
    >
      {/* Widget content - with scale mode support */}
      <div style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'auto',
        position: 'relative',
      }}>
        <div style={{
          ...getContentStyle(),
          pointerEvents: 'auto',
        }}>
          {children}
        </div>
      </div>

      {/* Edit mode overlay - captures pointer events so iframe doesn't block dragging */}
      {isEditMode && (
        <div
          onClick={handleClick}
          onPointerDown={handleDragStart}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'transparent',
            cursor: interactionMode === 'dragging' ? 'grabbing' : 'grab',
            zIndex: 5
          }}
        />
      )}

      {/* Resize handles */}
      {renderResizeHandles()}

      {/* Rotation handle */}
      {renderRotationHandle()}

      {/* Selection border overlay and controls */}
      {selected && isEditMode && (
        <>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: isMultiSelected
              ? '1px dashed rgba(154, 205, 50, 0.5)'
              : '1px dashed rgba(74, 158, 255, 0.5)',
            pointerEvents: 'none'
          }} />

          {/* Control buttons container */}
          <div style={{
            position: 'absolute',
            top: -34,
            right: 0,
            display: 'flex',
            gap: 4,
            zIndex: 100,
          }}>
            {/* Dock button - click or drag to dock */}
            <button
              data-dock-handle="true"
              draggable
              onClick={(e) => {
                e.stopPropagation();
                handleClickToDock();
              }}
              onDragStart={handleDragStartForDock}
              onDragEnd={handleDragEndForDock}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, var(--sn-accent-primary, #8b5cf6) 0%, var(--sn-accent-secondary, #6d28d9) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                userSelect: 'none',
                backdropFilter: 'blur(8px)',
              }}
              title="Click to dock widget"
            >
              <SNIcon name="pin" size="xs" /> Dock
            </button>
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                background: 'var(--sn-error, #ff4d4f)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <SNIcon name="delete" size="xs" /> Delete
            </button>
          </div>
        </>
      )}

      {/* Multi-selection indicator badge */}
      {isMultiSelected && isEditMode && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#9acd32',
          border: '2px solid #fff',
          zIndex: 11,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );

  if (widgetIsDocked && portalTarget) {
    return createPortal(content, portalTarget);
  }

  // If docked but target not found yet, don't render (or render hidden)
  if (widgetIsDocked && !portalTarget) {
    return null;
  }

  return content;
};

/**
 * Memoized WidgetFrame to prevent unnecessary re-renders.
 * Only re-renders when props change (instance, selected, mode, etc.)
 */
export const WidgetFrame = memo(WidgetFrameComponent);

export default WidgetFrame;
