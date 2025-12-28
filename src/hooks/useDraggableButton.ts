/**
 * StickerNest v2 - Draggable Button Hook
 *
 * Reusable hook for creating draggable buttons with snapping and smooth transitions.
 * Can be used for any floating button that needs drag functionality.
 */

import { useRef, useState, useCallback, useEffect } from 'react';

// Snap positions (vertical percentages)
const SNAP_POSITIONS = [0, 25, 50, 75, 100];
const SNAP_THRESHOLD = 5; // Percentage points

export interface UseDraggableButtonOptions {
  /** Current vertical position (0-100 percentage) */
  verticalPosition: number;
  /** Current side ('left' | 'right') */
  side: 'left' | 'right';
  /** Callback to update vertical position */
  onVerticalPositionChange: (position: number) => void;
  /** Callback to update side */
  onSideChange: (side: 'left' | 'right') => void;
  /** Default vertical position if not provided */
  defaultVerticalPosition?: number;
  /** Default side if not provided */
  defaultSide?: 'left' | 'right';
}

export interface UseDraggableButtonReturn {
  /** Button ref to attach to button element */
  buttonRef: React.RefObject<HTMLButtonElement>;
  /** Whether button is currently being dragged */
  isDragging: boolean;
  /** Whether button is transitioning after drag */
  isTransitioning: boolean;
  /** Mouse down handler */
  handleMouseDown: (e: React.MouseEvent) => void;
  /** Touch start handler */
  handleTouchStart: (e: React.TouchEvent) => void;
  /** Click handler (prevents click if dragged) */
  handleClick: (e: React.MouseEvent, onClick: () => void) => void;
}

/**
 * Calculate snap position based on current position
 */
function getSnapPosition(position: number): number {
  let closestSnap = SNAP_POSITIONS[0];
  let minDistance = Math.abs(position - closestSnap);

  for (const snap of SNAP_POSITIONS) {
    const distance = Math.abs(position - snap);
    if (distance < minDistance) {
      minDistance = distance;
      closestSnap = snap;
    }
  }

  // Only snap if within threshold
  return minDistance <= SNAP_THRESHOLD ? closestSnap : position;
}

/**
 * Reusable hook for draggable buttons with snapping and smooth transitions
 */
export function useDraggableButton(options: UseDraggableButtonOptions): UseDraggableButtonReturn {
  const {
    verticalPosition,
    side,
    onVerticalPositionChange,
    onSideChange,
  } = options;

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasDraggedRef = useRef(false);

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag on left mouse button
      if (e.button !== 0) return;
      
      e.preventDefault();
      setIsDragging(true);
      hasDraggedRef.current = false;
      setDragStartY(e.clientY);
      setDragStartX(e.clientX);
      setDragStartPosition(verticalPosition);
      setIsTransitioning(false);
    },
    [verticalPosition]
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setIsDragging(true);
      hasDraggedRef.current = false;
      setDragStartY(touch.clientY);
      setDragStartX(touch.clientX);
      setDragStartPosition(verticalPosition);
      setIsTransitioning(false);
    },
    [verticalPosition]
  );

  // Handle drag move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = e.clientY - dragStartY;
      const deltaX = e.clientX - dragStartX;
      
      // Mark as dragged if moved more than 5px
      if (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5) {
        hasDraggedRef.current = true;
      }

      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      const deltaPercent = (deltaY / windowHeight) * 100;
      const newPosition = Math.min(Math.max(dragStartPosition + deltaPercent, 0), 100);

      // Check if dragged to the other side (crossed middle of screen)
      const screenMiddle = windowWidth / 2;
      const shouldSwitchSide =
        (side === 'left' && e.clientX > screenMiddle) ||
        (side === 'right' && e.clientX < screenMiddle);

      if (shouldSwitchSide && Math.abs(deltaX) > 50) {
        // Only switch if moved significantly horizontally
        onSideChange(side === 'left' ? 'right' : 'left');
      }
      
      // Always update vertical position
      onVerticalPositionChange(newPosition);
    },
    [isDragging, dragStartY, dragStartX, dragStartPosition, side, onVerticalPositionChange, onSideChange]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      e.preventDefault(); // Prevent scrolling while dragging

      const touch = e.touches[0];
      const deltaY = touch.clientY - dragStartY;
      const deltaX = touch.clientX - dragStartX;
      
      // Mark as dragged if moved more than 5px
      if (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5) {
        hasDraggedRef.current = true;
      }

      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      const deltaPercent = (deltaY / windowHeight) * 100;
      const newPosition = Math.min(Math.max(dragStartPosition + deltaPercent, 0), 100);

      // Check if dragged to the other side
      const screenMiddle = windowWidth / 2;
      const shouldSwitchSide =
        (side === 'left' && touch.clientX > screenMiddle) ||
        (side === 'right' && touch.clientX < screenMiddle);

      if (shouldSwitchSide && Math.abs(deltaX) > 50) {
        onSideChange(side === 'left' ? 'right' : 'left');
      }
      
      // Always update vertical position
      onVerticalPositionChange(newPosition);
    },
    [isDragging, dragStartY, dragStartX, dragStartPosition, side, onVerticalPositionChange, onSideChange]
  );

  // Handle drag end with snapping
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    const wasDragging = hasDraggedRef.current;
    setIsDragging(false);
    setIsTransitioning(true);

    const snappedPosition = getSnapPosition(verticalPosition);
    onVerticalPositionChange(snappedPosition);

    // Reset transition state after animation
    setTimeout(() => {
      setIsTransitioning(false);
      // Reset drag flag after a short delay to prevent click
      if (wasDragging) {
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 100);
      } else {
        hasDraggedRef.current = false;
      }
    }, 300);
  }, [isDragging, verticalPosition, onVerticalPositionChange]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const wasDragging = hasDraggedRef.current;
    setIsDragging(false);
    setIsTransitioning(true);

    const snappedPosition = getSnapPosition(verticalPosition);
    onVerticalPositionChange(snappedPosition);

    setTimeout(() => {
      setIsTransitioning(false);
      // Reset drag flag after a short delay to prevent click
      if (wasDragging) {
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 100);
      } else {
        hasDraggedRef.current = false;
      }
    }, 300);
  }, [isDragging, verticalPosition, onVerticalPositionChange]);

  // Attach global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Handle click (only if not dragging and didn't just drag)
  const handleClick = useCallback(
    (e: React.MouseEvent, onClick: () => void) => {
      if (isDragging || hasDraggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick();
    },
    [isDragging]
  );

  return {
    buttonRef,
    isDragging,
    isTransitioning,
    handleMouseDown,
    handleTouchStart,
    handleClick,
  };
}

