/**
 * StickerNest v2 - StickerFrame Component
 * Renders individual stickers with click-to-launch widget functionality
 * Supports images, Lottie animations, GIFs, and emojis
 * Enhanced with Ctrl+click multi-select support
 */

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import type { StickerInstance, WidgetPosition } from '../types/domain';
import { useSelectionStore, useIsMultiSelectActive, useIsSelected } from '../state/useSelectionStore';

interface StickerFrameProps {
  sticker: StickerInstance;
  isSelected: boolean;
  isEditMode: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onMove: (id: string, position: WidgetPosition) => void;
  onResize: (id: string, width: number, height: number) => void;
  onRotate: (id: string, rotation: number) => void;
  onClick: (sticker: StickerInstance) => void;
  onDoubleClick?: (sticker: StickerInstance) => void;
  onContextMenu?: (e: React.MouseEvent, sticker: StickerInstance) => void;
  onDelete?: (stickerId: string) => void;
  onOpenProperties?: (sticker: StickerInstance) => void;
  canvasBounds?: { width: number; height: number };
  gridSnap?: boolean;
  gridSize?: number;
  viewport?: { zoom: number; panX: number; panY: number };
}

const StickerFrameComponent: React.FC<StickerFrameProps> = ({
  sticker,
  isSelected,
  isEditMode,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDelete,
  onOpenProperties,
  canvasBounds = { width: 1920, height: 1080 },
  gridSnap = false,
  gridSize = 20,
  viewport,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startX: 0, startY: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, startX: 0, startY: 0 });

  // Multi-select state from selection store
  const handleEntityClick = useSelectionStore((s) => s.handleEntityClick);
  const isMultiSelectActive = useIsMultiSelectActive();
  const isSelectedInStore = useIsSelected(sticker.id);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditMode || sticker.locked) return;

    e.stopPropagation();

    // Use unified selection store for Ctrl+click multi-select
    handleEntityClick(sticker.id, 'sticker', {
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
    });

    // Also call the parent's onSelect for compatibility
    onSelect(sticker.id, e.shiftKey || e.ctrlKey || e.metaKey);

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: sticker.position.x,
      startY: sticker.position.y,
    });
  }, [isEditMode, sticker, onSelect, handleEntityClick]);

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      let newX = dragStart.startX + dx;
      let newY = dragStart.startY + dy;

      // Snap to grid if enabled
      if (gridSnap) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      // Clamp to canvas bounds
      newX = Math.max(0, Math.min(newX, canvasBounds.width - sticker.width));
      newY = Math.max(0, Math.min(newY, canvasBounds.height - sticker.height));

      onMove(sticker.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, sticker, onMove, canvasBounds, gridSnap, gridSize]);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    if (!isEditMode || sticker.locked) return;
    e.stopPropagation();

    setIsResizing(true);
    setResizeStart({
      width: sticker.width,
      height: sticker.height,
      startX: e.clientX,
      startY: e.clientY,
    });
  }, [isEditMode, sticker]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.startX;
      const dy = e.clientY - resizeStart.startY;

      const newWidth = Math.max(32, resizeStart.width + dx);
      const newHeight = Math.max(32, resizeStart.height + dy);

      onResize(sticker.id, newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, sticker.id, onResize]);

  // Handle click in view mode
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging || isResizing) return;

    if (!isEditMode) {
      onClick(sticker);
    }
  }, [isEditMode, isDragging, isResizing, onClick, sticker]);

  // Handle double-click in edit mode to open properties
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditMode && onDoubleClick) {
      onDoubleClick(sticker);
    }
  }, [isEditMode, onDoubleClick, sticker]);

  // Get hover animation style
  const getHoverStyle = (): React.CSSProperties => {
    if (!isHovered || isEditMode) return {};

    switch (sticker.hoverAnimation) {
      case 'scale':
        return { transform: `rotate(${sticker.rotation}deg) scale(1.1)` };
      case 'bounce':
        return { animation: 'stickerBounce 0.5s ease' };
      case 'shake':
        return { animation: 'stickerShake 0.5s ease' };
      case 'glow':
        return { filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.8))' };
      default:
        return {};
    }
  };

  // Render media content
  const renderMedia = () => {
    const mediaStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      pointerEvents: 'none',
      userSelect: 'none',
    };

    switch (sticker.mediaType) {
      case 'image':
      case 'gif':
        return (
          <img
            src={sticker.mediaSrc}
            alt={sticker.name}
            style={mediaStyle}
            draggable={false}
          />
        );

      case 'emoji':
        return (
          <div style={{
            ...mediaStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.min(sticker.width, sticker.height) * 0.8,
          }}>
            {sticker.mediaSrc}
          </div>
        );

      case 'lottie':
        // Lottie player would be integrated here
        // For now, show a placeholder
        return (
          <div style={{
            ...mediaStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: 8,
            fontSize: 12,
            color: '#8b5cf6',
          }}>
            Lottie
          </div>
        );

      case 'video':
        return (
          <video
            src={sticker.mediaSrc}
            style={mediaStyle}
            autoPlay
            loop
            muted
            playsInline
          />
        );

      case 'icon':
        return (
          <div style={{
            ...mediaStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.min(sticker.width, sticker.height) * 0.6,
          }}>
            <i className={sticker.mediaSrc} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={frameRef}
      data-sticker-id={sticker.id}
      style={{
        position: 'absolute',
        left: sticker.position.x,
        top: sticker.position.y,
        width: sticker.width,
        height: sticker.height,
        transform: `rotate(${sticker.rotation}deg)`,
        opacity: sticker.opacity ?? 1,
        filter: sticker.filter,
        cursor: isEditMode
          ? (sticker.locked ? 'not-allowed' : 'move')
          : (sticker.clickBehavior !== 'none' ? 'pointer' : 'default'),
        zIndex: sticker.zIndex,
        transition: isDragging || isResizing ? 'none' : 'transform 0.2s ease',
        ...getHoverStyle(),
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, sticker);
      }}
      title={sticker.tooltip}
    >
      {/* Media content */}
      {renderMedia()}

      {/* Widget visible indicator */}
      {sticker.widgetVisible && (
        <div style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#22c55e',
          border: '2px solid #1a1a2e',
        }} />
      )}

      {/* Badge */}
      {sticker.showBadge && sticker.badgeContent && (
        <div style={{
          position: 'absolute',
          top: -6,
          right: -6,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          background: '#ef4444',
          color: 'white',
          fontSize: 10,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px',
          border: '2px solid #1a1a2e',
        }}>
          {sticker.badgeContent}
        </div>
      )}

      {/* Selection outline - different color for multi-select */}
      {(isSelected || isSelectedInStore) && isEditMode && (
        <div style={{
          position: 'absolute',
          inset: -2,
          border: isMultiSelectActive
            ? '2px solid #9acd32'  // Lime green for multi-select
            : '2px solid #8b5cf6', // Purple for single select
          borderRadius: 4,
          pointerEvents: 'none',
        }} />
      )}

      {/* Multi-selection badge indicator */}
      {isMultiSelectActive && (isSelected || isSelectedInStore) && isEditMode && (
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

      {/* Resize handle */}
      {(isSelected || isSelectedInStore) && isEditMode && !sticker.locked && (
        <div
          style={{
            position: 'absolute',
            right: -6,
            bottom: -6,
            width: 12,
            height: 12,
            background: '#8b5cf6',
            borderRadius: 2,
            cursor: 'se-resize',
          }}
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        />
      )}

      {/* Lock indicator */}
      {sticker.locked && isEditMode && (
        <div style={{
          position: 'absolute',
          top: -8,
          left: -8,
          fontSize: 12,
        }}>
          🔒
        </div>
      )}

      {/* Edit mode action buttons - shown when selected */}
      {(isSelected || isSelectedInStore) && isEditMode && !sticker.locked && (
        <div style={{
          position: 'absolute',
          top: -32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 4,
          background: 'rgba(26, 26, 46, 0.95)',
          borderRadius: 6,
          padding: '4px 6px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 10,
        }}>
          {/* Settings/Properties button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenProperties) {
                onOpenProperties(sticker);
              } else if (onDoubleClick) {
                onDoubleClick(sticker);
              }
            }}
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: 4,
              color: '#c4b5fd',
              cursor: 'pointer',
              fontSize: 12,
              padding: 0,
            }}
            title="Open properties (double-click)"
          >
            ⚙
          </button>
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) {
                onDelete(sticker.id);
              }
            }}
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 4,
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: 12,
              padding: 0,
            }}
            title="Delete sticker (Del)"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

// CSS animations (would be in a stylesheet)
const stickerAnimations = `
  @keyframes stickerBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes stickerShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;

/**
 * Memoized StickerFrame to prevent unnecessary re-renders.
 * Only re-renders when sticker props change.
 */
export const StickerFrame = memo(StickerFrameComponent);

export default StickerFrame;
