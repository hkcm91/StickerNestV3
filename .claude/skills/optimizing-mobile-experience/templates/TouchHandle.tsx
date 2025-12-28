/**
 * Touch-Friendly Resize/Rotate Handle Component
 *
 * This template provides a touch-optimized handle for widget manipulation
 * with proper touch target sizing, visual feedback, and haptic support.
 *
 * Usage:
 * <TouchHandle
 *   position="se"
 *   type="resize"
 *   onDragStart={() => haptic.dragStart()}
 *   onDrag={(delta) => resizeWidget(delta)}
 *   onDragEnd={() => haptic.dragEnd()}
 * />
 */

import React, { useRef, useCallback, useState } from 'react';
import { useTouchDevice } from '@/hooks/useResponsive';
import { haptic } from '@/utils/haptics';

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';
type HandleType = 'resize' | 'rotate';

interface TouchHandleProps {
  position: HandlePosition;
  type: HandleType;
  onDragStart?: () => void;
  onDrag: (delta: { x: number; y: number }) => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  className?: string;
}

// Position transforms for each handle location
const POSITION_STYLES: Record<HandlePosition, React.CSSProperties> = {
  nw: { top: 0, left: 0, transform: 'translate(-50%, -50%)', cursor: 'nwse-resize' },
  n: { top: 0, left: '50%', transform: 'translate(-50%, -50%)', cursor: 'ns-resize' },
  ne: { top: 0, right: 0, transform: 'translate(50%, -50%)', cursor: 'nesw-resize' },
  e: { top: '50%', right: 0, transform: 'translate(50%, -50%)', cursor: 'ew-resize' },
  se: { bottom: 0, right: 0, transform: 'translate(50%, 50%)', cursor: 'nwse-resize' },
  s: { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)', cursor: 'ns-resize' },
  sw: { bottom: 0, left: 0, transform: 'translate(-50%, 50%)', cursor: 'nesw-resize' },
  w: { top: '50%', left: 0, transform: 'translate(-50%, -50%)', cursor: 'ew-resize' },
  rotate: { top: -40, left: '50%', transform: 'translate(-50%, 0)', cursor: 'grab' }
};

export function TouchHandle({
  position,
  type,
  onDragStart,
  onDrag,
  onDragEnd,
  disabled = false,
  className = ''
}: TouchHandleProps) {
  const { hasTouch } = useTouchDevice();
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const handleRef = useRef<HTMLDivElement>(null);

  // Touch targets: 44px minimum on touch, 12px on desktop
  const hitAreaSize = hasTouch ? 44 : 16;
  const visualSize = hasTouch ? 20 : 10;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;

    e.stopPropagation();
    e.preventDefault();

    // Capture pointer for tracking outside element
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    lastPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);

    haptic.dragStart();
    onDragStart?.();
  }, [disabled, onDragStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    const delta = {
      x: e.clientX - lastPos.current.x,
      y: e.clientY - lastPos.current.y
    };

    lastPos.current = { x: e.clientX, y: e.clientY };
    onDrag(delta);
  }, [isDragging, onDrag]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);

    haptic.dragEnd();
    onDragEnd?.();
  }, [isDragging, onDragEnd]);

  const positionStyle = POSITION_STYLES[position];

  return (
    <div
      ref={handleRef}
      className={`touch-handle ${className} ${isDragging ? 'dragging' : ''} ${type}`}
      style={{
        position: 'absolute',
        width: hitAreaSize,
        height: hitAreaSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: 100,
        ...positionStyle,
        cursor: disabled ? 'not-allowed' : positionStyle.cursor,
        opacity: disabled ? 0.5 : 1
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Visual indicator - smaller than hit area */}
      <div
        className="touch-handle-visual"
        style={{
          width: visualSize,
          height: visualSize,
          borderRadius: type === 'rotate' ? '50%' : 2,
          backgroundColor: isDragging ? 'var(--color-primary-600)' : 'var(--color-primary-500)',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: isDragging ? 'none' : 'transform 0.15s ease, background-color 0.15s ease',
          transform: isDragging ? 'scale(1.2)' : 'scale(1)'
        }}
      >
        {/* Rotate icon for rotation handle */}
        {type === 'rotate' && (
          <svg
            viewBox="0 0 24 24"
            width={visualSize - 4}
            height={visualSize - 4}
            fill="white"
            style={{ display: 'block', margin: 'auto' }}
          >
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
        )}
      </div>
    </div>
  );
}

/**
 * Preset handle configurations for common use cases
 */
export const RESIZE_HANDLES: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export const CORNER_HANDLES: HandlePosition[] = ['nw', 'ne', 'se', 'sw'];
export const EDGE_HANDLES: HandlePosition[] = ['n', 'e', 's', 'w'];

/**
 * Component that renders all resize handles for a widget
 */
export function ResizeHandles({
  onResize,
  handles = RESIZE_HANDLES,
  showRotate = false,
  onRotate,
  disabled = false
}: {
  onResize: (position: HandlePosition, delta: { x: number; y: number }) => void;
  handles?: HandlePosition[];
  showRotate?: boolean;
  onRotate?: (delta: { x: number; y: number }) => void;
  disabled?: boolean;
}) {
  return (
    <>
      {handles.map((pos) => (
        <TouchHandle
          key={pos}
          position={pos}
          type="resize"
          onDrag={(delta) => onResize(pos, delta)}
          disabled={disabled}
        />
      ))}
      {showRotate && onRotate && (
        <TouchHandle
          position="rotate"
          type="rotate"
          onDrag={onRotate}
          disabled={disabled}
        />
      )}
    </>
  );
}

export default TouchHandle;
