/**
 * StickerNest v2 - SNTooltip Component
 * Lightweight tooltip component for icon buttons
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ============================================
// Types
// ============================================

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface SNTooltipProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Trigger element */
  children: React.ReactElement;
  /** Tooltip position */
  position?: TooltipPosition;
  /** Delay before showing (ms) */
  delay?: number;
  /** Whether tooltip is disabled */
  disabled?: boolean;
  /** Custom offset from trigger */
  offset?: number;
  /** Maximum width of tooltip */
  maxWidth?: number;
  /** Whether to show arrow */
  arrow?: boolean;
  /** Custom className for tooltip */
  className?: string;
}

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  tooltip: {
    position: 'fixed',
    zIndex: 9999,
    padding: '6px 10px',
    fontSize: 'var(--sn-text-xs, 11px)',
    fontWeight: 500,
    lineHeight: 1.4,
    color: 'var(--sn-text-primary, #f0f4f8)',
    background: 'var(--sn-bg-elevated, #1e1e42)',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
    borderRadius: 'var(--sn-radius-md, 8px)',
    boxShadow: 'var(--sn-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.3))',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    opacity: 0,
    transform: 'scale(0.95)',
    transition: 'opacity 150ms ease, transform 150ms ease',
  },
  visible: {
    opacity: 1,
    transform: 'scale(1)',
  },
  arrow: {
    position: 'absolute',
    width: 8,
    height: 8,
    background: 'inherit',
    border: 'inherit',
    borderRight: 'none',
    borderBottom: 'none',
    transform: 'rotate(45deg)',
  },
};

// Arrow positions
const arrowPositions: Record<TooltipPosition, React.CSSProperties> = {
  top: {
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    transform: 'rotate(-135deg)',
  },
  bottom: {
    top: -4,
    left: '50%',
    marginLeft: -4,
    transform: 'rotate(45deg)',
  },
  left: {
    right: -4,
    top: '50%',
    marginTop: -4,
    transform: 'rotate(135deg)',
  },
  right: {
    left: -4,
    top: '50%',
    marginTop: -4,
    transform: 'rotate(-45deg)',
  },
};

// ============================================
// Component
// ============================================

export const SNTooltip: React.FC<SNTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 400,
  disabled = false,
  offset = 8,
  maxWidth = 200,
  arrow = true,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate tooltip position
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.top - tooltipRect.height - offset;
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.bottom + offset;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - offset;
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
      case 'right':
        x = triggerRect.right + offset;
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
    }

    // Keep tooltip within viewport
    const padding = 8;
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

    setCoords({ x, y });
  }, [position, offset]);

  // Show tooltip
  const show = useCallback(() => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [disabled, delay]);

  // Hide tooltip
  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  // Update position when visible
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone child element with event handlers
  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      show();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      children.props.onBlur?.(e);
    },
  });

  // Don't render tooltip if disabled or no content
  if (disabled || !content) {
    return <>{children}</>;
  }

  const tooltipStyle: React.CSSProperties = {
    ...styles.tooltip,
    ...(isVisible ? styles.visible : {}),
    left: coords.x,
    top: coords.y,
    maxWidth,
  };

  const tooltipElement = (
    <div
      ref={tooltipRef}
      role="tooltip"
      className={`sn-tooltip ${className}`}
      style={tooltipStyle}
    >
      {content}
      {arrow && (
        <div
          style={{
            ...styles.arrow,
            ...arrowPositions[position],
          }}
        />
      )}
    </div>
  );

  return (
    <>
      {trigger}
      {typeof document !== 'undefined' &&
        createPortal(tooltipElement, document.body)}
    </>
  );
};

SNTooltip.displayName = 'SNTooltip';

export default SNTooltip;
