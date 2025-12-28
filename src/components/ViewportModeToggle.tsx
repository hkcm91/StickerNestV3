/**
 * StickerNest v2 - Viewport Mode Toggle
 *
 * Segmented control for switching between Mobile and Web viewport modes.
 * Compact design for use in toolbars and the fullscreen preview header.
 */

import React, { memo, useCallback } from 'react';
import { useViewportModeStore, type ViewportMode } from '../state/useViewportModeStore';
import { haptic } from '../utils/haptics';
import { Smartphone, Monitor } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ViewportModeToggleProps {
  /** Accent color for active state */
  accentColor?: string;
  /** Compact mode (icons only, no labels) */
  compact?: boolean;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Optional className for container */
  className?: string;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '6px 12px',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  },
  buttonInactive: {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buttonCompact: {
    padding: '6px 10px',
  },
  icon: {
    flexShrink: 0,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ViewportModeToggle = memo(function ViewportModeToggle({
  accentColor = '#8b5cf6',
  compact = false,
  disabled = false,
  className,
}: ViewportModeToggleProps) {
  const { activeMode, setMode } = useViewportModeStore();

  const handleModeChange = useCallback(
    (mode: ViewportMode) => {
      if (disabled || mode === activeMode) return;
      haptic('light');
      setMode(mode);
    },
    [activeMode, setMode, disabled]
  );

  const getButtonStyle = (mode: ViewportMode) => {
    const isActive = activeMode === mode;
    const baseStyle = {
      ...styles.button,
      ...(compact ? styles.buttonCompact : {}),
    };

    if (isActive) {
      return {
        ...baseStyle,
        background: `${accentColor}33`,
        color: '#fff',
        boxShadow: `0 0 0 1px ${accentColor}66`,
      };
    }

    return {
      ...baseStyle,
      ...styles.buttonInactive,
    };
  };

  return (
    <div
      style={{
        ...styles.container,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      className={className}
      role="radiogroup"
      aria-label="Viewport mode"
    >
      <button
        onClick={() => handleModeChange('mobile')}
        style={getButtonStyle('mobile')}
        role="radio"
        aria-checked={activeMode === 'mobile'}
        title="Mobile view - edit layout for mobile devices"
      >
        <Smartphone size={14} style={styles.icon} />
        {!compact && <span>Mobile</span>}
      </button>
      <button
        onClick={() => handleModeChange('web')}
        style={getButtonStyle('web')}
        role="radio"
        aria-checked={activeMode === 'web'}
        title="Web view - edit layout for desktop browsers"
      >
        <Monitor size={14} style={styles.icon} />
        {!compact && <span>Web</span>}
      </button>
    </div>
  );
});

export default ViewportModeToggle;
