/**
 * StickerNest v2 - Widget Wrapper Component
 * Clean, minimal container for widgets with drag, resize, crop support
 */

import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { TouchHandle, RESIZE_HANDLES, type HandlePosition } from './TouchHandle';
import { WidgetToolbar } from './WidgetToolbar';
import { CropOverlay, type CropValues } from './CropOverlay';
import { haptic } from '../../utils/haptics';
import { useTouchDevice } from '../../hooks/useResponsive';
import type { WidgetInstance } from '../../types/domain';

export interface WidgetWrapperProps {
  widget: WidgetInstance;
  isSelected: boolean;
  isEditMode: boolean;
  accentColor: string;
  onSelect: (id: string, additive: boolean) => void;
  onDragStart: (id: string, e: React.PointerEvent) => void;
  onDragMove: (e: React.PointerEvent) => void;
  onDragEnd: (e: React.PointerEvent) => void;
  onResizeStart: (id: string, handle: string, e: React.PointerEvent) => void;
  onDelete: (id: string) => void;
  onUpdateWidget?: (id: string, updates: Partial<WidgetInstance>) => void;
  onClose?: (id: string) => void;
  onDock?: (id: string) => void;
  children: React.ReactNode;
}

export const WidgetWrapper = memo(function WidgetWrapper({
  widget,
  isSelected,
  isEditMode,
  accentColor,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onDelete,
  onUpdateWidget,
  onClose,
  children,
}: WidgetWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  // VR controller detection for enhanced interaction
  const { hasVRController } = useTouchDevice();

  // Refs for drag state
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);

  // Crop values (percentages 0-100 from each edge)
  const crop: CropValues = widget.crop || { top: 0, right: 0, bottom: 0, left: 0 };
  const hasCrop = crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0;

  // Content scaling - use uniform scale to maintain aspect ratio (contain behavior)
  const contentSize = widget.contentSize || { width: widget.width, height: widget.height };
  const scaleX = contentSize.width > 0 ? widget.width / contentSize.width : 1;
  const scaleY = contentSize.height > 0 ? widget.height / contentSize.height : 1;
  const uniformScale = Math.min(scaleX, scaleY);
  const scaledWidth = contentSize.width * uniformScale;
  const scaledHeight = contentSize.height * uniformScale;
  const offsetX = (widget.width - scaledWidth) / 2;
  const offsetY = (widget.height - scaledHeight) / 2;

  // Crop drag state
  const cropStateRef = useRef<{
    edge: 'top' | 'right' | 'bottom' | 'left';
    startValue: number;
    startMouse: { x: number; y: number };
  } | null>(null);

  // Toolbar handlers
  const handleToggleCropMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    setIsCropMode(!isCropMode);
  }, [isCropMode]);

  const handleResetCrop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    onUpdateWidget?.(widget.id, { crop: { top: 0, right: 0, bottom: 0, left: 0 } });
    setIsCropMode(false);
  }, [widget.id, onUpdateWidget]);

  const handleRotate90Click = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    const newRotation = ((widget.rotation || 0) + 90) % 360;
    onUpdateWidget?.(widget.id, { rotation: newRotation });
  }, [widget.id, widget.rotation, onUpdateWidget]);

  const handleLockToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    onUpdateWidget?.(widget.id, { locked: !widget.locked });
  }, [widget.id, widget.locked, onUpdateWidget]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('warning');
    onDelete(widget.id);
  }, [widget.id, onDelete]);

  // Mouse/pointer handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditMode) return;
    const target = e.target as HTMLElement;
    if (target.dataset.resizeHandle || target.dataset.cropHandle || target.tagName === 'BUTTON') return;

    e.preventDefault();
    e.stopPropagation();
    haptic('select');
    onSelect(widget.id, e.shiftKey || e.ctrlKey || e.metaKey);

    if (!widget.locked) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }
  }, [isEditMode, widget.id, widget.locked, onSelect]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isEditMode) return;
    const target = e.target as HTMLElement;
    if (target.dataset.resizeHandle || target.dataset.cropHandle || target.tagName === 'BUTTON') return;

    e.preventDefault();
    e.stopPropagation();
    haptic('select');
    onSelect(widget.id, e.shiftKey || e.ctrlKey || e.metaKey);

    if (!widget.locked) {
      isDraggingRef.current = true;
      setIsDragging(true);
      onDragStart(widget.id, e);
      containerRef.current?.setPointerCapture(e.pointerId);
    }
  }, [isEditMode, widget.id, widget.locked, onDragStart, onSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDraggingRef.current || isResizingRef.current) {
      onDragMove(e);
    }
  }, [onDragMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDraggingRef.current || isResizingRef.current) {
      onDragEnd(e);
      isDraggingRef.current = false;
      isResizingRef.current = false;
      setIsDragging(false);
      setIsResizing(false);
      containerRef.current?.releasePointerCapture(e.pointerId);
    }
  }, [onDragEnd]);

  const handleResizeStart = useCallback((handle: HandlePosition, e: React.PointerEvent) => {
    if (!isEditMode || widget.locked) return;
    e.preventDefault();
    e.stopPropagation();
    haptic('dragStart');
    onResizeStart(widget.id, handle, e);
    isResizingRef.current = true;
    setIsResizing(true);
  }, [isEditMode, widget.id, widget.locked, onResizeStart]);

  // Crop handlers
  const handleCropStart = useCallback((edge: 'top' | 'right' | 'bottom' | 'left', e: React.PointerEvent) => {
    if (!isEditMode || widget.locked) return;
    e.preventDefault();
    e.stopPropagation();
    haptic('dragStart');
    cropStateRef.current = {
      edge,
      startValue: crop[edge],
      startMouse: { x: e.clientX, y: e.clientY },
    };
    setIsCropping(true);
  }, [isEditMode, widget.locked, crop]);

  // Document-level crop move/end handlers
  useEffect(() => {
    if (!isCropping || !cropStateRef.current) return;

    const handleDocumentMove = (e: PointerEvent) => {
      if (!cropStateRef.current || !containerRef.current) return;
      const { edge, startValue, startMouse } = cropStateRef.current;

      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - startMouse.x;
      const dy = e.clientY - startMouse.y;

      let deltaPercent = 0;
      switch (edge) {
        case 'top': deltaPercent = (dy / rect.height) * 100; break;
        case 'bottom': deltaPercent = (-dy / rect.height) * 100; break;
        case 'left': deltaPercent = (dx / rect.width) * 100; break;
        case 'right': deltaPercent = (-dx / rect.width) * 100; break;
      }

      const currentCrop = widget.crop || { top: 0, right: 0, bottom: 0, left: 0 };
      const oppositeEdge = edge === 'top' ? 'bottom' : edge === 'bottom' ? 'top' : edge === 'left' ? 'right' : 'left';
      const maxCrop = 90 - currentCrop[oppositeEdge];
      const newValue = Math.max(0, Math.min(maxCrop, startValue + deltaPercent));

      onUpdateWidget?.(widget.id, { crop: { ...currentCrop, [edge]: newValue } });
    };

    const handleDocumentUp = () => {
      cropStateRef.current = null;
      setIsCropping(false);
    };

    document.addEventListener('pointermove', handleDocumentMove);
    document.addEventListener('pointerup', handleDocumentUp);
    document.addEventListener('pointercancel', handleDocumentUp);

    return () => {
      document.removeEventListener('pointermove', handleDocumentMove);
      document.removeEventListener('pointerup', handleDocumentUp);
      document.removeEventListener('pointercancel', handleDocumentUp);
    };
  }, [isCropping, widget.id, widget.crop, onUpdateWidget]);

  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    onClose?.(widget.id);
  }, [widget.id, onClose]);

  // Hover handlers with VR haptic feedback
  const handleHoverEnter = useCallback(() => {
    setIsHovered(true);
    if (hasVRController && isEditMode && !widget.locked) {
      haptic('select');
    }
  }, [hasVRController, isEditMode, widget.locked]);

  const handleHoverLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Don't render if hidden
  if (widget.visible === false) return null;

  const showHoverState = isHovered && isEditMode && !isSelected && !widget.locked;
  const showSelectedState = isSelected && isEditMode;

  // Styles - enhanced for VR controllers
  const getOutlineStyle = (): string => {
    if (showSelectedState) {
      return hasVRController ? `3px solid ${accentColor}` : `2px solid ${accentColor}`;
    }
    if (showHoverState) {
      return hasVRController ? `3px solid ${accentColor}88` : `2px solid ${accentColor}66`;
    }
    return 'none';
  };

  const getBoxShadow = (): string | undefined => {
    if (showSelectedState) {
      return hasVRController
        ? `0 0 0 6px ${accentColor}33, 0 0 20px ${accentColor}40, 0 4px 16px rgba(0,0,0,0.3)`
        : `0 0 0 4px ${accentColor}22, 0 4px 12px rgba(0,0,0,0.2)`;
    }
    if (showHoverState) {
      return hasVRController
        ? `0 0 0 4px ${accentColor}22, 0 0 12px ${accentColor}30, 0 4px 12px rgba(0,0,0,0.2)`
        : `0 2px 8px rgba(0,0,0,0.15)`;
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
        transform: [
          widget.rotation ? `rotate(${widget.rotation}deg)` : '',
          widget.flipX ? 'scaleX(-1)' : '',
          widget.flipY ? 'scaleY(-1)' : '',
        ].filter(Boolean).join(' ') || undefined,
        zIndex: isSelected ? (widget.zIndex || 0) + 1000 : widget.zIndex || 0,
        opacity: widget.opacity ?? 1,
        outline: getOutlineStyle(),
        outlineOffset: 2,
        boxShadow: getBoxShadow(),
        borderRadius: 8,
        cursor: isDragging ? 'grabbing' : isResizing ? 'nwse-resize' : isEditMode && !widget.locked ? 'grab' : 'default',
        transition: isDragging || isResizing ? 'none' : 'outline 0.15s ease, box-shadow 0.15s ease',
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={handleHoverEnter}
      onMouseLeave={handleHoverLeave}
      onPointerEnter={handleHoverEnter}
      onPointerLeave={handleHoverLeave}
    >
      {/* Edit mode overlay for drag handling */}
      {isEditMode && !widget.locked && !isCropMode && (
        <div
          data-edit-overlay="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            cursor: isDragging ? 'grabbing' : 'grab',
            backgroundColor: showHoverState ? `${accentColor}08` : 'transparent',
            borderRadius: 6,
          }}
        />
      )}

      {/* Widget content with crop applied */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: 6,
          pointerEvents: isEditMode ? 'none' : 'auto',
          clipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`,
          WebkitClipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`,
        }}
      >
        <div
          style={{
            width: contentSize.width,
            height: contentSize.height,
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${uniformScale})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>

      {/* Crop mode UI */}
      {isCropMode && showSelectedState && !widget.locked && (
        <CropOverlay
          crop={crop}
          accentColor={accentColor}
          onCropStart={handleCropStart}
        />
      )}

      {/* Resize handles */}
      {isEditMode && isSelected && !widget.locked && !isCropMode && RESIZE_HANDLES.map(handle => (
        <TouchHandle
          key={handle}
          position={handle}
          accentColor={accentColor}
          onDragStart={(e) => handleResizeStart(handle, e)}
          onDragMove={handlePointerMove}
          onDragEnd={handlePointerUp}
        />
      ))}

      {/* Toolbar */}
      {isEditMode && isSelected && (
        <WidgetToolbar
          isLocked={widget.locked || false}
          isCropMode={isCropMode}
          hasCrop={hasCrop}
          hasVRController={hasVRController}
          accentColor={accentColor}
          onRotate={handleRotate90Click}
          onToggleCrop={handleToggleCropMode}
          onResetCrop={handleResetCrop}
          onToggleLock={handleLockToggle}
          onDelete={handleDeleteClick}
        />
      )}

      {/* Lock indicator */}
      {widget.locked && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: 12,
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 4,
            padding: '2px 6px',
          }}
        >
          🔒
        </div>
      )}

      {/* Hover tooltip */}
      {isEditMode && showHoverState && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 10px',
            background: 'rgba(15, 15, 25, 0.95)',
            border: `1px solid ${accentColor}44`,
            borderRadius: 6,
            color: '#e2e8f0',
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

      {/* Close button for view mode */}
      {!isEditMode && onClose && (
        <button
          onClick={handleCloseClick}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isHovered ? 'rgba(30, 30, 40, 0.9)' : 'transparent',
            border: isHovered ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
            borderRadius: 6,
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
            cursor: 'pointer',
            backdropFilter: isHovered ? 'blur(4px)' : 'none',
            transition: 'all 0.2s ease',
            opacity: isHovered ? 1 : 0,
            zIndex: 10,
          }}
          aria-label="Close widget"
        >
          ×
        </button>
      )}
    </div>
  );
});

export default WidgetWrapper;
