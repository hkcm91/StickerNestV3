/**
 * StickerNest v2 - Widget Wrapper Component
 * Clean, minimal container for widgets with drag, resize, crop support
 */

import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { TouchHandle, RESIZE_HANDLES, type HandlePosition } from './TouchHandle';
import { haptic } from '../../utils/haptics';
import type { WidgetInstance } from '../../types/domain';

// Clean SVG icons
const RotateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/>
  </svg>
);

const CropIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"/>
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

const UnlockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/>
  </svg>
);

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
  onDock,
  children,
}: WidgetWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);

  // Refs for drag state
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);

  // Crop values (percentages 0-100 from each edge)
  const crop = widget.crop || { top: 0, right: 0, bottom: 0, left: 0 };
  const hasCrop = crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0;

  // Content scaling - use uniform scale to maintain aspect ratio (contain behavior)
  // This is the industry standard approach (like CSS object-fit: contain)
  const contentSize = widget.contentSize || { width: widget.width, height: widget.height };
  const scaleX = contentSize.width > 0 ? widget.width / contentSize.width : 1;
  const scaleY = contentSize.height > 0 ? widget.height / contentSize.height : 1;
  // Use minimum scale to fit all content (contain behavior)
  const uniformScale = Math.min(scaleX, scaleY);
  // Calculate centering offsets for letterboxing
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

  // Toggle crop mode
  const handleToggleCropMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    setIsCropMode(!isCropMode);
  }, [isCropMode]);

  // Reset crop
  const handleResetCrop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    onUpdateWidget?.(widget.id, { crop: { top: 0, right: 0, bottom: 0, left: 0 } });
    setIsCropMode(false);
  }, [widget.id, onUpdateWidget]);

  // Mouse/pointer handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditMode) return;
    const target = e.target as HTMLElement;
    if (target.dataset.resizeHandle || target.dataset.cropHandle || target.tagName === 'BUTTON') return;

    e.preventDefault();
    e.stopPropagation();
    haptic('select');
    onSelect(widget.id, e.shiftKey || e.ctrlKey || e.metaKey);

    // Only allow dragging if not locked
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

    // Only allow dragging if not locked
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

  // Crop state for dragging
  const [isCropping, setIsCropping] = useState(false);

  // Crop handle handlers - use document-level listeners for reliable drag
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

      // Get actual rendered size of widget (accounts for zoom)
      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - startMouse.x;
      const dy = e.clientY - startMouse.y;

      let deltaPercent = 0;
      switch (edge) {
        case 'top':
          deltaPercent = (dy / rect.height) * 100;
          break;
        case 'bottom':
          deltaPercent = (-dy / rect.height) * 100;
          break;
        case 'left':
          deltaPercent = (dx / rect.width) * 100;
          break;
        case 'right':
          deltaPercent = (-dx / rect.width) * 100;
          break;
      }

      // Allow crop up to 90% (leave at least 10% visible)
      const currentCrop = widget.crop || { top: 0, right: 0, bottom: 0, left: 0 };
      const oppositeEdge = edge === 'top' ? 'bottom' : edge === 'bottom' ? 'top' : edge === 'left' ? 'right' : 'left';
      const maxCrop = 90 - currentCrop[oppositeEdge]; // Ensure at least 10% remains
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

  // Button handlers
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('warning');
    onDelete(widget.id);
  }, [widget.id, onDelete]);

  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    onClose?.(widget.id);
  }, [widget.id, onClose]);

  const handleRotate90Click = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    const newRotation = ((widget.rotation || 0) + 90) % 360;
    onUpdateWidget?.(widget.id, { rotation: newRotation });
  }, [widget.id, widget.rotation, onUpdateWidget]);

  // Lock toggle handler
  const handleLockToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic('select');
    onUpdateWidget?.(widget.id, { locked: !widget.locked });
  }, [widget.id, widget.locked, onUpdateWidget]);

  // Don't render if hidden
  if (widget.visible === false) return null;

  const showHoverState = isHovered && isEditMode && !isSelected && !widget.locked;
  const showSelectedState = isSelected && isEditMode;

  // Styles
  const getOutlineStyle = (): string => {
    if (showSelectedState) return `2px solid ${accentColor}`;
    if (showHoverState) return `2px solid ${accentColor}66`;
    return 'none';
  };

  const getBoxShadow = (): string | undefined => {
    if (showSelectedState) return `0 0 0 4px ${accentColor}22, 0 4px 12px rgba(0,0,0,0.2)`;
    if (showHoverState) return `0 2px 8px rgba(0,0,0,0.15)`;
    return undefined;
  };

  // Button styles
  const buttonBase: React.CSSProperties = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(30, 30, 40, 0.9)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    color: '#fff',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
  };

  // Crop handle style - sleek thin lines with drag affordance
  const cropHandleStyle = (edge: 'top' | 'right' | 'bottom' | 'left'): React.CSSProperties => {
    const isVertical = edge === 'top' || edge === 'bottom';
    const cropPercent = crop[edge];

    // Base positioning
    const base: React.CSSProperties = {
      position: 'absolute',
      background: 'transparent',
      cursor: isVertical ? 'ns-resize' : 'ew-resize',
      touchAction: 'none',
      zIndex: 100,
    };

    // The visible line element will be a pseudo-element via the inner div
    if (isVertical) {
      return {
        ...base,
        left: 0,
        right: 0,
        height: 20, // Larger hit area
        ...(edge === 'top' && { top: `${cropPercent}%`, transform: 'translateY(-50%)' }),
        ...(edge === 'bottom' && { bottom: `${cropPercent}%`, transform: 'translateY(50%)' }),
      };
    } else {
      return {
        ...base,
        top: 0,
        bottom: 0,
        width: 20, // Larger hit area
        ...(edge === 'left' && { left: `${cropPercent}%`, transform: 'translateX(-50%)' }),
        ...(edge === 'right' && { right: `${cropPercent}%`, transform: 'translateX(50%)' }),
      };
    }
  };

  // Inner line style for crop handles
  const cropLineStyle = (edge: 'top' | 'right' | 'bottom' | 'left'): React.CSSProperties => {
    const isVertical = edge === 'top' || edge === 'bottom';
    return {
      position: 'absolute',
      background: accentColor,
      borderRadius: 1,
      boxShadow: `0 0 4px ${accentColor}`,
      ...(isVertical ? {
        left: 8,
        right: 8,
        top: '50%',
        height: 3,
        transform: 'translateY(-50%)',
      } : {
        top: 8,
        bottom: 8,
        left: '50%',
        width: 3,
        transform: 'translateX(-50%)',
      }),
    };
  };

  // Center grip indicator
  const cropGripStyle = (edge: 'top' | 'right' | 'bottom' | 'left'): React.CSSProperties => {
    const isVertical = edge === 'top' || edge === 'bottom';
    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: isVertical ? 32 : 6,
      height: isVertical ? 6 : 32,
      background: '#fff',
      borderRadius: 3,
      boxShadow: `0 1px 4px rgba(0,0,0,0.3), 0 0 0 1px ${accentColor}`,
    };
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit mode overlay for drag handling - disabled during crop mode */}
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

      {/* Widget content with crop applied via clip-path */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: 6,
          pointerEvents: isEditMode ? 'none' : 'auto',
          // Use clip-path for cropping - inset(top right bottom left)
          clipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`,
          WebkitClipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`,
        }}
      >
        {/* Inner content with uniform scaling and centering (contain behavior) */}
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

      {/* Crop mode UI - Edge handles */}
      {isCropMode && showSelectedState && !widget.locked && (
        <>
          {/* Crop overlay showing cropped areas */}
          {hasCrop && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 40,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {crop.top > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: `${crop.top}%`,
                  background: `${accentColor}30`,
                  borderBottom: `2px dashed ${accentColor}`,
                }} />
              )}
              {crop.bottom > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: `${crop.bottom}%`,
                  background: `${accentColor}30`,
                  borderTop: `2px dashed ${accentColor}`,
                }} />
              )}
              {crop.left > 0 && (
                <div style={{
                  position: 'absolute',
                  top: `${crop.top}%`, left: 0,
                  bottom: `${crop.bottom}%`,
                  width: `${crop.left}%`,
                  background: `${accentColor}30`,
                  borderRight: `2px dashed ${accentColor}`,
                }} />
              )}
              {crop.right > 0 && (
                <div style={{
                  position: 'absolute',
                  top: `${crop.top}%`, right: 0,
                  bottom: `${crop.bottom}%`,
                  width: `${crop.right}%`,
                  background: `${accentColor}30`,
                  borderLeft: `2px dashed ${accentColor}`,
                }} />
              )}
            </div>
          )}

          {/* Crop handles - sleek lines with center grip */}
          {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
            <div
              key={edge}
              data-crop-handle={edge}
              style={{
                ...cropHandleStyle(edge),
                pointerEvents: 'auto',
              }}
              onPointerDown={(e) => handleCropStart(edge, e)}
            >
              {/* Thin colored line */}
              <div style={cropLineStyle(edge)} />
              {/* Center grip affordance */}
              <div style={cropGripStyle(edge)} />
            </div>
          ))}
        </>
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

      {/* Toolbar - Clean, minimal design */}
      {isEditMode && isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: 0,
            display: 'flex',
            gap: 4,
            padding: 4,
            background: 'rgba(20, 20, 30, 0.85)',
            borderRadius: 8,
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 100,
            pointerEvents: 'auto',
          }}
        >
          {/* Buttons only available when not locked */}
          {!widget.locked && (
            <>
              {/* Rotate button */}
              <button
                onClick={handleRotate90Click}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                title="Rotate 90°"
                style={buttonBase}
              >
                <RotateIcon />
              </button>

              {/* Crop button */}
              <button
                onClick={handleToggleCropMode}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                title={isCropMode ? 'Exit crop mode' : 'Crop'}
                style={{
                  ...buttonBase,
                  background: isCropMode ? accentColor : buttonBase.background,
                  border: isCropMode ? `1px solid ${accentColor}` : buttonBase.border,
                }}
              >
                <CropIcon />
              </button>

              {/* Reset crop - only show when cropped */}
              {hasCrop && (
                <button
                  onClick={handleResetCrop}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Reset crop"
                  style={{
                    ...buttonBase,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Reset
                </button>
              )}
            </>
          )}

          {/* Lock button - always visible */}
          <button
            onClick={handleLockToggle}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            title={widget.locked ? 'Unlock widget' : 'Lock widget'}
            style={{
              ...buttonBase,
              background: widget.locked ? '#f59e0b' : buttonBase.background,
              border: widget.locked ? '1px solid #f59e0b' : buttonBase.border,
            }}
          >
            {widget.locked ? <LockIcon /> : <UnlockIcon />}
          </button>

          {/* Delete button - only when not locked */}
          {!widget.locked && (
            <button
              onClick={handleDeleteClick}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              title="Delete"
              style={{
                ...buttonBase,
                background: '#dc2626',
                borderColor: '#dc2626',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>
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
