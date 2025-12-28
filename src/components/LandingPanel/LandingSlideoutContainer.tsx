/**
 * StickerNest v2 - Landing Slideout Container
 *
 * A slide-out panel container for the landing page left panel.
 * Handles positioning, animations, and panel state.
 * Features draggable button with snapping and smooth transitions.
 */

import React from 'react';
import { Star } from 'lucide-react';
import { useDraggableButton } from '../../hooks/useDraggableButton';

interface LandingSlideoutContainerProps {
  /** Panel position */
  position?: 'left' | 'right';
  /** Child content */
  children: React.ReactNode;
  /** Whether panel is open */
  isPanelOpen: boolean;
  /** Panel width in pixels */
  panelWidth: number;
  /** Toggle panel open/closed */
  togglePanel: () => void;
  /** Button vertical position (0-100 percentage) */
  buttonVerticalPosition: number;
  /** Button side */
  buttonSide: 'left' | 'right';
  /** Set button vertical position */
  setButtonVerticalPosition: (position: number) => void;
  /** Set button side */
  setButtonSide: (side: 'left' | 'right') => void;
}

export const LandingSlideoutContainer: React.FC<LandingSlideoutContainerProps> = ({
  position = 'left',
  children,
  isPanelOpen,
  panelWidth,
  togglePanel,
  buttonVerticalPosition,
  buttonSide,
  setButtonVerticalPosition,
  setButtonSide,
}) => {
  // Use draggable button hook
  const {
    buttonRef,
    isDragging,
    isTransitioning,
    handleMouseDown,
    handleTouchStart,
    handleClick,
  } = useDraggableButton({
    verticalPosition: buttonVerticalPosition,
    side: buttonSide,
    onVerticalPositionChange: setButtonVerticalPosition,
    onSideChange: setButtonSide,
  });

  // Use buttonSide instead of position prop for button positioning
  const effectiveSide = buttonSide;

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
        onClick={(e) => handleClick(e, togglePanel)}
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
          background: 'rgba(251, 191, 36, 0.15)', // Gold glass background
          border: '1px solid rgba(251, 191, 36, 0.3)', // Gold border
          borderRadius: effectiveSide === 'left' ? '0 8px 8px 0' : '8px 0 0 8px',
          color: 'rgba(251, 191, 36, 0.85)', // Gold icon color
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
            e.currentTarget.style.background = 'rgba(251, 191, 36, 0.25)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.2)';
            e.currentTarget.style.color = 'rgba(251, 191, 36, 1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.opacity = '0.75';
            e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            e.currentTarget.style.color = 'rgba(251, 191, 36, 0.85)';
          }
        }}
        aria-label={isPanelOpen ? 'Close landing panel' : 'Open landing panel'}
      >
        <Star size={16} fill={isPanelOpen ? 'currentColor' : 'none'} />
      </button>
    </>
  );
};

export default LandingSlideoutContainer;

