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

// Import XR store functions to actually start sessions
let xrStore: { enterVR: () => Promise<void>; enterAR: () => Promise<void>; getState: () => { session: XRSession | null } } | null = null;

// Lazy load the xrStore to avoid import issues
async function getXRStore() {
  if (!xrStore) {
    try {
      const module = await import('./spatial/SpatialCanvas');
      xrStore = module.xrStore;
    } catch (e) {
      console.warn('[SpatialModeToggle] Could not load xrStore:', e);
    }
  }
  return xrStore;
}

/**
 * Wait for the SpatialCanvas to be ready before attempting XR entry.
 * The canvas must be mounted and have initialized the XR context.
 */
async function waitForCanvasReady(maxWaitMs = 3000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 100;

  while (Date.now() - startTime < maxWaitMs) {
    // Check if the spatial canvas element exists and reports ready
    const canvas = document.querySelector('[data-spatial-canvas="true"]');
    if (canvas && canvas.getAttribute('data-xr-ready') === 'true') {
      return true;
    }

    // Also check if there's a WebGL canvas inside the spatial container
    if (canvas && canvas.querySelector('canvas')) {
      // Small additional delay to ensure XR context is initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  console.warn('[SpatialModeToggle] Timed out waiting for canvas to be ready');
  return false;
}

/**
 * Attempt to enter XR mode with retry logic.
 * Sometimes the first attempt fails if the XR context isn't fully ready.
 */
async function enterXRWithRetry(
  store: { enterVR: () => Promise<void>; enterAR: () => Promise<void> },
  mode: 'vr' | 'ar',
  maxRetries = 2
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (mode === 'vr') {
        await store.enterVR();
      } else {
        await store.enterAR();
      }
      console.log(`[SpatialModeToggle] Successfully entered ${mode.toUpperCase()} mode`);
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[SpatialModeToggle] Attempt ${attempt + 1} to enter ${mode} failed:`, e);

      if (attempt < maxRetries) {
        // Wait before retrying, with exponential backoff
        const delay = 200 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`Failed to enter ${mode} after ${maxRetries + 1} attempts`);
}

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
    async (mode: SpatialMode) => {
      if (disabled) return;
      if (mode === activeMode) return;

      // Check if mode is supported
      if (mode === 'vr' && !capabilities.vrSupported) return;
      if (mode === 'ar' && !capabilities.arSupported) return;

      haptic('medium');

      // For VR/AR modes, actually start the WebXR session
      if (mode === 'vr' || mode === 'ar') {
        // Update state to show we're requesting the mode
        requestMode(mode);

        // Wait for the SpatialCanvas to be ready
        const canvasReady = await waitForCanvasReady(3000);
        if (!canvasReady) {
          console.error('[SpatialModeToggle] Canvas not ready, cannot enter XR');
          requestMode('desktop');
          return;
        }

        const store = await getXRStore();
        if (store) {
          try {
            // Use retry logic in case XR context needs more time
            await enterXRWithRetry(store, mode, 2);
          } catch (e) {
            console.error(`[SpatialModeToggle] Failed to enter ${mode}:`, e);
            // Reset to desktop on failure
            requestMode('desktop');
          }
        } else {
          console.warn('[SpatialModeToggle] XR store not available');
          requestMode('desktop');
        }
      } else {
        // Desktop mode - just update state, exit any active session
        const store = await getXRStore();
        if (store) {
          const session = store.getState().session;
          if (session) {
            session.end();
          }
        }
        requestMode(mode);
      }
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
