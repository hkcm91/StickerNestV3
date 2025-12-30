/**
 * StickerNest v2 - Canvas Entity Wrapper
 *
 * Wraps canvas entities with selection UI, resize handles, and interaction handlers.
 * This is the equivalent of WidgetWrapper but for design entities.
 */

import React, { useCallback, useMemo } from 'react';
import type { CanvasEntity } from '../../../types/canvasEntity';
import { useCanvasEntityStore } from '../../../state/useCanvasEntityStore';

// ============================================================================
// Types
// ============================================================================

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface CanvasEntityWrapperProps {
  entity: CanvasEntity;
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  onMouseDown: (e: React.MouseEvent, entity: CanvasEntity) => void;
  onResizeMouseDown: (e: React.MouseEvent, entity: CanvasEntity, handle: ResizeHandle) => void;
  onDoubleClick?: (e: React.MouseEvent, entity: CanvasEntity) => void;
  children: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const RESIZE_HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 24;

// ============================================================================
// Component
// ============================================================================

export function CanvasEntityWrapper({
  entity,
  isSelected,
  isHovered,
  isEditing,
  onMouseDown,
  onResizeMouseDown,
  onDoubleClick,
  children,
}: CanvasEntityWrapperProps) {
  const bringToFront = useCanvasEntityStore((s) => s.bringToFront);
  const removeEntity = useCanvasEntityStore((s) => s.removeEntity);

  const handles: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  // Handle styles for each resize handle position
  const getHandleStyle = useCallback((handle: ResizeHandle): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: RESIZE_HANDLE_SIZE,
      height: RESIZE_HANDLE_SIZE,
      backgroundColor: 'var(--sn-accent-primary)',
      border: '1px solid #fff',
      borderRadius: 2,
      zIndex: 10,
      pointerEvents: 'auto',
    };

    const half = RESIZE_HANDLE_SIZE / 2;

    switch (handle) {
      case 'n':
        return { ...base, top: -half, left: '50%', marginLeft: -half, cursor: 'ns-resize' };
      case 's':
        return { ...base, bottom: -half, left: '50%', marginLeft: -half, cursor: 'ns-resize' };
      case 'e':
        return { ...base, right: -half, top: '50%', marginTop: -half, cursor: 'ew-resize' };
      case 'w':
        return { ...base, left: -half, top: '50%', marginTop: -half, cursor: 'ew-resize' };
      case 'ne':
        return { ...base, top: -half, right: -half, cursor: 'nesw-resize' };
      case 'nw':
        return { ...base, top: -half, left: -half, cursor: 'nwse-resize' };
      case 'se':
        return { ...base, bottom: -half, right: -half, cursor: 'nwse-resize' };
      case 'sw':
        return { ...base, bottom: -half, left: -half, cursor: 'nesw-resize' };
    }
  }, []);

  // Compute wrapper style
  const wrapperStyle = useMemo((): React.CSSProperties => {
    return {
      position: 'absolute',
      left: entity.x,
      top: entity.y,
      width: entity.width,
      height: entity.height,
      transform: entity.rotation ? `rotate(${entity.rotation}deg)` : 'none',
      transformOrigin: 'center center',
      zIndex: entity.zIndex,
      opacity: entity.visible ? entity.opacity : 0.3,
      pointerEvents: entity.locked ? 'none' : 'auto',
      // Use box-shadow instead of outline for selection
      // (outline is NOT clipped by overflow:hidden, but box-shadow IS)
      boxShadow: isSelected
        ? '0 0 0 2px var(--sn-accent-primary), 0 0 0 6px rgba(var(--sn-accent-primary-rgb), 0.2)'
        : isHovered
          ? '0 0 0 1px var(--sn-accent-primary-50)'
          : 'none',
      cursor: entity.locked ? 'not-allowed' : 'move',
    };
  }, [entity, isSelected, isHovered]);

  // Handle click
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (entity.locked) return;
      e.stopPropagation();
      onMouseDown(e, entity);
    },
    [entity, onMouseDown]
  );

  // Handle double click (for text editing)
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (entity.locked) return;
      e.stopPropagation();
      onDoubleClick?.(e, entity);
    },
    [entity, onDoubleClick]
  );

  // Handle delete
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeEntity(entity.id);
    },
    [entity.id, removeEntity]
  );

  // Handle bring to front
  const handleBringToFront = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      bringToFront(entity.id);
    },
    [entity.id, bringToFront]
  );

  return (
    <div
      style={wrapperStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      data-entity-id={entity.id}
      data-entity-type={entity.type}
    >
      {/* Entity Content */}
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          pointerEvents: isEditing ? 'auto' : 'none',
        }}
      >
        {children}
      </div>

      {/* Resize Handles (only when selected and editing) */}
      {isEditing && isSelected && !entity.locked && (
        <>
          {handles.map((handle) => (
            <div
              key={handle}
              style={getHandleStyle(handle)}
              onMouseDown={(e) => {
                e.stopPropagation();
                onResizeMouseDown(e, entity, handle);
              }}
            />
          ))}

          {/* Rotation Handle */}
          <div
            style={{
              position: 'absolute',
              top: -ROTATION_HANDLE_OFFSET,
              left: '50%',
              marginLeft: -4,
              width: 8,
              height: 8,
              backgroundColor: 'var(--sn-accent-primary)',
              border: '1px solid #fff',
              borderRadius: '50%',
              cursor: 'grab',
              zIndex: 10,
            }}
            title="Rotate"
          />
          {/* Line connecting to rotation handle */}
          <div
            style={{
              position: 'absolute',
              top: -ROTATION_HANDLE_OFFSET + 8,
              left: '50%',
              width: 1,
              height: ROTATION_HANDLE_OFFSET - 8,
              backgroundColor: 'var(--sn-accent-primary)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* Entity Label and Actions (when selected) */}
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
            pointerEvents: 'auto',
          }}
        >
          {/* Entity Name */}
          <div
            style={{
              fontSize: 10,
              color: 'var(--sn-accent-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: entity.width - 60,
              textTransform: 'capitalize',
            }}
          >
            {entity.name || `${entity.type}`}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {/* Bring to Front button */}
            <button
              onClick={handleBringToFront}
              style={{
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--sn-accent-gradient)',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 10,
              }}
              title="Bring to front"
            >
              ↑
            </button>

            {/* Delete button */}
            {!entity.locked && (
              <button
                onClick={handleDelete}
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
                  fontSize: 12,
                  fontWeight: 'bold',
                }}
                title="Delete"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lock Indicator */}
      {entity.locked && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: 12,
            color: 'var(--sn-text-secondary)',
            pointerEvents: 'none',
          }}
        >
          🔒
        </div>
      )}

      {/* Hidden Indicator */}
      {!entity.visible && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            fontSize: 12,
            color: 'var(--sn-text-secondary)',
            pointerEvents: 'none',
          }}
        >
          👁️‍🗨️
        </div>
      )}
    </div>
  );
}

export default CanvasEntityWrapper;
