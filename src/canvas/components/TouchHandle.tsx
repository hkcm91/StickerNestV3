/**
 * StickerNest v2 - Touch-Optimized Resize Handle
 * Clean, minimal resize handles with proper touch hit areas
 */

import React, { useRef, useState, useCallback, memo } from 'react';
import { useTouchDevice } from '../../hooks/useResponsive';
import { haptic } from '../../utils/haptics';

export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface TouchHandleProps {
  position: HandlePosition;
  accentColor: string;
  onDragStart: (e: React.PointerEvent) => void;
  onDragMove: (e: React.PointerEvent) => void;
  onDragEnd: (e: React.PointerEvent) => void;
  disabled?: boolean;
}

// Cursor styles for each handle
const HANDLE_CURSORS: Record<HandlePosition, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

// Position styles for each handle
function getPositionStyle(position: HandlePosition, hitArea: number): React.CSSProperties {
  const half = hitArea / 2;
  const offset = -half;

  const base: React.CSSProperties = {
    position: 'absolute',
    width: hitArea,
    height: hitArea,
  };

  switch (position) {
    case 'nw':
      return { ...base, top: offset, left: offset };
    case 'n':
      return { ...base, top: offset, left: '50%', marginLeft: offset };
    case 'ne':
      return { ...base, top: offset, right: offset };
    case 'e':
      return { ...base, top: '50%', right: offset, marginTop: offset };
    case 'se':
      return { ...base, bottom: offset, right: offset };
    case 's':
      return { ...base, bottom: offset, left: '50%', marginLeft: offset };
    case 'sw':
      return { ...base, bottom: offset, left: offset };
    case 'w':
      return { ...base, top: '50%', left: offset, marginTop: offset };
    default:
      return base;
  }
}

// Is this a corner handle?
function isCorner(position: HandlePosition): boolean {
  return ['nw', 'ne', 'se', 'sw'].includes(position);
}

export const TouchHandle = memo(function TouchHandle({
  position,
  accentColor,
  onDragStart,
  onDragMove,
  onDragEnd,
  disabled = false,
}: TouchHandleProps) {
  const { hasTouch } = useTouchDevice();
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Touch-friendly sizing: 44px hit area on touch, 16px on desktop
  const hitArea = hasTouch ? 44 : 16;
  // Visual size: corners are slightly larger
  const visualSize = isCorner(position) ? (hasTouch ? 14 : 10) : (hasTouch ? 12 : 8);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    haptic('dragStart');
    onDragStart(e);
    handleRef.current?.setPointerCapture(e.pointerId);
  }, [disabled, onDragStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    onDragMove(e);
  }, [isDragging, onDragMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    haptic('dragEnd');
    onDragEnd(e);
    handleRef.current?.releasePointerCapture(e.pointerId);
  }, [isDragging, onDragEnd]);

  const positionStyle = getPositionStyle(position, hitArea);

  return (
    <div
      ref={handleRef}
      data-resize-handle={position}
      style={{
        ...positionStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : HANDLE_CURSORS[position],
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: 10,
        opacity: disabled ? 0.4 : 1,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Visual handle - clean, minimal design */}
      <div
        style={{
          width: visualSize,
          height: visualSize,
          backgroundColor: '#fff',
          border: `2px solid ${accentColor}`,
          borderRadius: isCorner(position) ? 2 : visualSize / 2,
          boxShadow: isDragging
            ? `0 0 0 2px ${accentColor}40, 0 2px 8px rgba(0,0,0,0.3)`
            : '0 1px 3px rgba(0,0,0,0.2)',
          transform: isDragging ? 'scale(1.2)' : 'scale(1)',
          transition: isDragging ? 'none' : 'transform 0.1s ease, box-shadow 0.1s ease',
        }}
      />
    </div>
  );
});

// Standard 8-direction resize handles
export const RESIZE_HANDLES: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

// Corner-only handles for simpler UI
export const CORNER_HANDLES: HandlePosition[] = ['nw', 'ne', 'se', 'sw'];

export default TouchHandle;
