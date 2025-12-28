/**
 * StickerNest v2 - Library Slideout Container
 *
 * A slide-out panel container for the library.
 * Handles positioning, animations, and panel state from the store.
 * Features draggable button with snapping and smooth transitions.
 */

import React, { useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLibraryStore } from '../../state/useLibraryStore';

interface LibrarySlideoutContainerProps {
  /** Panel position */
  position?: 'left' | 'right';
  /** Child content */
  children: React.ReactNode;
}

// Snap positions (vertical percentages)
const SNAP_POSITIONS = [0, 25, 50, 75, 100];
const SNAP_THRESHOLD = 5; // Percentage points

export const LibrarySlideoutContainer: React.FC<LibrarySlideoutContainerProps> = ({
  position = 'left',
  children,
}) => {
  const isPanelOpen = useLibraryStore((s) => s.isPanelOpen);
  const panelWidth = useLibraryStore((s) => s.panelWidth);
  const togglePanel = useLibraryStore((s) => s.togglePanel);
  const buttonVerticalPosition = useLibraryStore((s) => s.buttonVerticalPosition);
  const buttonSide = useLibraryStore((s) => s.buttonSide);
  const setButtonVerticalPosition = useLibraryStore((s) => s.setButtonVerticalPosition);
  const setButtonSide = useLibraryStore((s) => s.setButtonSide);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasDraggedRef = useRef(false);

  // Use buttonSide instead of position prop for button positioning
  const effectiveSide = buttonSide;

  // Calculate snap position
  const getSnapPosition = useCallback((position: number): number => {
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
  }, []);

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
      setDragStartPosition(buttonVerticalPosition);
      setIsTransitioning(false);
    },
    [buttonVerticalPosition]
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setIsDragging(true);
      hasDraggedRef.current = false;
      setDragStartY(touch.clientY);
      setDragStartX(touch.clientX);
      setDragStartPosition(buttonVerticalPosition);
      setIsTransitioning(false);
    },
    [buttonVerticalPosition]
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
      // If button is on left and dragged right past middle, or vice versa
      const screenMiddle = windowWidth / 2;
      const shouldSwitchSide =
        (effectiveSide === 'left' && e.clientX > screenMiddle) ||
        (effectiveSide === 'right' && e.clientX < screenMiddle);

      if (shouldSwitchSide && Math.abs(deltaX) > 50) {
        // Only switch if moved significantly horizontally
        setButtonSide(effectiveSide === 'left' ? 'right' : 'left');
      }
      
      // Always update vertical position
      setButtonVerticalPosition(newPosition);
    },
    [isDragging, dragStartY, dragStartX, dragStartPosition, effectiveSide, setButtonVerticalPosition, setButtonSide]
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
        (effectiveSide === 'left' && touch.clientX > screenMiddle) ||
        (effectiveSide === 'right' && touch.clientX < screenMiddle);

      if (shouldSwitchSide && Math.abs(deltaX) > 50) {
        setButtonSide(effectiveSide === 'left' ? 'right' : 'left');
      }
      
      // Always update vertical position
      setButtonVerticalPosition(newPosition);
    },
    [isDragging, dragStartY, dragStartX, dragStartPosition, effectiveSide, setButtonVerticalPosition, setButtonSide]
  );

  // Handle drag end with snapping
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    const wasDragging = hasDraggedRef.current;
    setIsDragging(false);
    setIsTransitioning(true);

    const snappedPosition = getSnapPosition(buttonVerticalPosition);
    setButtonVerticalPosition(snappedPosition);

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
  }, [isDragging, buttonVerticalPosition, getSnapPosition, setButtonVerticalPosition]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const wasDragging = hasDraggedRef.current;
    setIsDragging(false);
    setIsTransitioning(true);

    const snappedPosition = getSnapPosition(buttonVerticalPosition);
    setButtonVerticalPosition(snappedPosition);

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
  }, [isDragging, buttonVerticalPosition, getSnapPosition, setButtonVerticalPosition]);

  // Attach global event listeners for drag
  React.useEffect(() => {
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
    (e: React.MouseEvent) => {
      if (isDragging || hasDraggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      togglePanel();
    },
    [isDragging, togglePanel]
  );

  return (
    <>
      {/* Panel Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          [position]: 0,
          width: isPanelOpen ? panelWidth : 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--sn-glass-bg-heavy, rgba(15, 15, 25, 0.98))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRight: position === 'left' ? '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))' : undefined,
          borderLeft: position === 'right' ? '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))' : undefined,
          boxShadow: isPanelOpen ? '4px 0 24px rgba(0, 0, 0, 0.4)' : 'none',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      {/* Toggle Button */}
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          position: 'fixed',
          top: `${buttonVerticalPosition}%`,
          [effectiveSide]: isPanelOpen ? panelWidth - 1 : 0,
          transform: `translateY(-50%)${isDragging ? ' scale(1.1)' : ''}`,
          width: 24,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(139, 92, 246, 0.15)', // More subtle: reduced opacity
          border: '1px solid rgba(139, 92, 246, 0.3)', // Subtle border
          borderRadius: effectiveSide === 'left' ? '0 8px 8px 0' : '8px 0 0 8px',
          color: 'rgba(255, 255, 255, 0.7)', // Subtle icon color
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)', // Subtle shadow
          transition: isTransitioning && !isDragging
            ? 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease'
            : 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
          zIndex: 101,
          opacity: isDragging ? 0.9 : 0.75, // Subtle opacity
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.opacity = '0.75';
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
          }
        }}
        aria-label={isPanelOpen ? 'Close library panel' : 'Open library panel'}
      >
        {effectiveSide === 'left' ? (
          isPanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />
        ) : (
          isPanelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />
        )}
      </button>
    </>
  );
};

export default LibrarySlideoutContainer;
