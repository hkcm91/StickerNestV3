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

      // Desktop mode is always supported
      // VR/AR preview modes don't require actual XR hardware

      haptic('medium');

      // For VR/AR modes, try to start a real WebXR session
      // If that fails, fall back to "preview mode" (3D view without XR session)
      if (mode === 'vr' || mode === 'ar') {
        // Update state to show we're requesting the mode
        requestMode(mode);

        // Detect mobile devices - use preview mode by default on phones
        // Real WebXR sessions on mobile are meant for cardboard headsets
        // but most users just want to see the 3D view on their screen
        //
        // IMPORTANT: User agent detection alone is NOT reliable because:
        // - Chrome "desktop view mode" spoofs desktop user agent on mobile
        // - Some tablets report as mobile
        // We use multiple signals to detect mobile:
        // 1. User agent (traditional check)
        // 2. Touch support (most reliable for actual mobile devices)
        // 3. Screen size (phones have small screens)
        const userAgentMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 1024 && window.innerHeight <= 1366;
        const isTabletUserAgent = /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);

        // Consider it a mobile phone if:
        // - Has touch support AND small screen (catches "desktop view mode")
        // - OR user agent says mobile (but not tablet)
        const isMobilePhone = (hasTouchSupport && isSmallScreen) || (userAgentMobile && !isTabletUserAgent);

        // For VR mode on phones, always use preview mode
        // Real WebXR VR is meant for headsets, not phones
        if (isMobilePhone && mode === 'vr') {
          console.log('[SpatialModeToggle] Mobile phone detected (touch + small screen), using VR preview mode', {
            userAgentMobile,
            hasTouchSupport,
            isSmallScreen,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
          });
          useSpatialModeStore.getState().enterPreviewMode('vr');
          return;
        }

        // If XR isn't supported at all, go directly to preview mode
        if (!capabilities.vrSupported && mode === 'vr') {
          console.log('[SpatialModeToggle] VR not supported, entering VR preview mode');
          // Use enterPreviewMode to show 3D canvas without XR session
          useSpatialModeStore.getState().enterPreviewMode('vr');
          return;
        }

        if (!capabilities.arSupported && mode === 'ar') {
          console.log('[SpatialModeToggle] AR not supported, cannot enter AR mode');
          useSpatialModeStore.getState().setSessionState('none');
          requestMode('desktop');
          return;
        }

        // Wait for the SpatialCanvas to be ready
        const canvasReady = await waitForCanvasReady(3000);
        if (!canvasReady) {
          console.error('[SpatialModeToggle] Canvas not ready, entering preview mode');
          // Fall back to preview mode
          useSpatialModeStore.getState().enterPreviewMode(mode);
          return;
        }

        const store = await getXRStore();
        if (store) {
          try {
            // Use retry logic in case XR context needs more time
            // Add timeout to prevent infinite requesting state
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('XR entry timed out')), 10000);
            });
            await Promise.race([
              enterXRWithRetry(store, mode, 2),
              timeoutPromise,
            ]);
          } catch (e) {
            console.error(`[SpatialModeToggle] Failed to enter ${mode}, using preview mode:`, e);
            // Fall back to preview mode instead of resetting to desktop
            // This allows users to see the VR/3D view in their browser
            useSpatialModeStore.getState().enterPreviewMode(mode);
          }
        } else {
          console.warn('[SpatialModeToggle] XR store not available, entering preview mode');
          useSpatialModeStore.getState().enterPreviewMode(mode);
        }
      } else {
        // Desktop mode - just update state, exit any active session
        const store = await getXRStore();
        if (store) {
          const session = store.getState().session;
          if (session) {
            try {
              session.end();
            } catch (e) {
              console.warn('[SpatialModeToggle] Error ending session:', e);
            }
          }
        }
        // Force reset session state to ensure we exit properly
        useSpatialModeStore.getState().setSessionState('none');
        requestMode(mode);
      }
    },
    [activeMode, capabilities, requestMode, disabled]
  );

  const getButtonStyle = (mode: SpatialMode) => {
    const isActive = activeMode === mode;
    // VR always has preview mode available, AR requires hardware
    const isSupported =
      mode === 'desktop' ||
      mode === 'vr' || // VR preview always available
      (mode === 'ar' && capabilities.arSupported);
    const isRequesting = sessionState === 'requesting';
    const isPreviewMode = mode === 'vr' && !capabilities.vrSupported;

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

    // Preview mode available but not full XR - show with slight opacity
    if (isPreviewMode) {
      return {
        ...baseStyle,
        ...styles.buttonInactive,
        opacity: 0.8,
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
        : 'VR Preview - view 3D scene in browser (no headset)',
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
  // Note: VR always shows because it has a preview mode available
  const visibleModes = hideUnsupported
    ? modes.filter(
        (m) =>
          m.mode === 'desktop' ||
          m.mode === 'vr' || // VR preview always available
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
