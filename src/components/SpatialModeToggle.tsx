/**
 * StickerNest v2 - Spatial Mode Toggle
 *
 * Segmented control for switching between Desktop, VR, and AR spatial modes.
 * Shows device capability status and handles WebXR session requests.
 */

import React, { memo, useCallback, useEffect } from 'react';
import { useSpatialModeStore, type SpatialMode } from '../state/useSpatialModeStore';
import { haptic } from '../utils/haptics';
import { Monitor, Glasses, Smartphone } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface SpatialModeToggleProps {
  /** Accent color for active state */
  accentColor?: string;
  /** Compact mode (icons only, no labels) */
  compact?: boolean;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Optional className for container */
  className?: string;
  /** Show only available modes (hide unsupported) */
  hideUnsupported?: boolean;
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
    position: 'relative' as const,
  },
  buttonInactive: {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buttonDisabled: {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.3)',
    cursor: 'not-allowed',
  },
  buttonCompact: {
    padding: '6px 10px',
  },
  icon: {
    flexShrink: 0,
  },
  badge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: '50%',
    fontSize: 8,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const SpatialModeToggle = memo(function SpatialModeToggle({
  accentColor = '#8b5cf6',
  compact = false,
  disabled = false,
  className,
  hideUnsupported = false,
}: SpatialModeToggleProps) {
  const {
    activeMode,
    capabilities,
    sessionState,
    requestMode,
    setCapabilities,
  } = useSpatialModeStore();

  // Check XR capabilities on mount
  useEffect(() => {
    async function checkXRSupport() {
      if (typeof navigator === 'undefined' || !('xr' in navigator)) {
        setCapabilities({
          webXRAvailable: false,
          vrSupported: false,
          arSupported: false,
        });
        return;
      }

      try {
        const xr = navigator.xr;
        if (!xr) return;

        const [vrSupported, arSupported] = await Promise.all([
          xr.isSessionSupported('immersive-vr').catch(() => false),
          xr.isSessionSupported('immersive-ar').catch(() => false),
        ]);

        setCapabilities({
          webXRAvailable: true,
          vrSupported,
          arSupported,
        });
      } catch (e) {
        console.warn('[SpatialModeToggle] Error checking XR support:', e);
      }
    }

    checkXRSupport();
  }, [setCapabilities]);

  const handleModeChange = useCallback(
    (mode: SpatialMode) => {
      if (disabled) return;
      if (mode === activeMode) return;

      // Check if mode is supported
      if (mode === 'vr' && !capabilities.vrSupported) return;
      if (mode === 'ar' && !capabilities.arSupported) return;

      haptic('medium');
      requestMode(mode);
    },
    [activeMode, capabilities, requestMode, disabled]
  );

  const getButtonStyle = (mode: SpatialMode) => {
    const isActive = activeMode === mode;
    const isSupported =
      mode === 'desktop' ||
      (mode === 'vr' && capabilities.vrSupported) ||
      (mode === 'ar' && capabilities.arSupported);
    const isRequesting = sessionState === 'requesting';

    const baseStyle = {
      ...styles.button,
      ...(compact ? styles.buttonCompact : {}),
    };

    if (!isSupported) {
      return {
        ...baseStyle,
        ...styles.buttonDisabled,
      };
    }

    if (isActive) {
      return {
        ...baseStyle,
        background: `${accentColor}33`,
        color: '#fff',
        boxShadow: `0 0 0 1px ${accentColor}66`,
        ...(isRequesting ? { animation: 'pulse 1s infinite' } : {}),
      };
    }

    return {
      ...baseStyle,
      ...styles.buttonInactive,
    };
  };

  const modes: { mode: SpatialMode; icon: typeof Monitor; label: string; title: string }[] = [
    {
      mode: 'desktop',
      icon: Monitor,
      label: '2D',
      title: 'Desktop view - traditional 2D canvas editing',
    },
    {
      mode: 'vr',
      icon: Glasses,
      label: 'VR',
      title: capabilities.vrSupported
        ? 'VR mode - immersive virtual reality editing'
        : 'VR not supported on this device',
    },
    {
      mode: 'ar',
      icon: Smartphone,
      label: 'AR',
      title: capabilities.arSupported
        ? 'AR mode - augmented reality with camera passthrough'
        : 'AR not supported on this device',
    },
  ];

  // Filter modes if hideUnsupported is true
  const visibleModes = hideUnsupported
    ? modes.filter(
        (m) =>
          m.mode === 'desktop' ||
          (m.mode === 'vr' && capabilities.vrSupported) ||
          (m.mode === 'ar' && capabilities.arSupported)
      )
    : modes;

  // Don't render if only desktop is available and hideUnsupported is true
  if (hideUnsupported && visibleModes.length === 1) {
    return null;
  }

  return (
    <div
      style={{
        ...styles.container,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      className={className}
      role="radiogroup"
      aria-label="Spatial mode"
    >
      {visibleModes.map(({ mode, icon: Icon, label, title }) => {
        const isSupported =
          mode === 'desktop' ||
          (mode === 'vr' && capabilities.vrSupported) ||
          (mode === 'ar' && capabilities.arSupported);

        return (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            style={getButtonStyle(mode)}
            role="radio"
            aria-checked={activeMode === mode}
            aria-disabled={!isSupported}
            title={title}
            disabled={!isSupported}
          >
            <Icon size={14} style={styles.icon} />
            {!compact && <span>{label}</span>}
            {/* Show indicator for active XR session */}
            {activeMode === mode && mode !== 'desktop' && sessionState === 'active' && (
              <span
                style={{
                  ...styles.badge,
                  background: '#22c55e',
                }}
                title="XR session active"
              />
            )}
          </button>
        );
      })}
    </div>
  );
});

export default SpatialModeToggle;
