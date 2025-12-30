/**
 * StickerNest - XR Entry Buttons
 *
 * Provides buttons to enter VR or AR mode.
 * Automatically detects device capabilities and shows appropriate buttons.
 * Works on both desktop (with WebXR Emulator) and mobile (with ARCore/ARKit).
 */

import React, { useEffect, useCallback } from 'react';
import {
  useSpatialModeStore,
  useActiveSpatialMode,
  useXRCapabilities,
  useXRSessionState,
  useSpatialError,
} from '../../state/useSpatialModeStore';
import { xrStore } from './SpatialCanvas';

// ============================================================================
// XR Entry Helpers
// ============================================================================

/**
 * Attempt to enter XR mode with retry logic.
 * Sometimes the first attempt fails if the XR context isn't fully ready.
 */
async function enterXRWithRetry(
  mode: 'vr' | 'ar',
  maxRetries = 2
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (mode === 'vr') {
        await xrStore.enterVR();
      } else {
        await xrStore.enterAR();
      }
      console.log(`[XREntryButtons] Successfully entered ${mode.toUpperCase()} mode`);
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[XREntryButtons] Attempt ${attempt + 1} to enter ${mode} failed:`, e);

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
// Styles
// ============================================================================

const styles = {
  container: {
    position: 'absolute' as const,
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 12,
    zIndex: 100,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  vrButton: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    color: 'white',
  },
  arButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
  },
  exitButton: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
  },
  disabledButton: {
    background: '#374151',
    color: '#9ca3af',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  loadingButton: {
    background: '#4b5563',
    color: 'white',
    cursor: 'wait',
  },
  errorMessage: {
    position: 'absolute' as const,
    bottom: 70,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 12,
    whiteSpace: 'nowrap' as const,
  },
  capabilityHint: {
    position: 'absolute' as const,
    bottom: 70,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#9ca3af',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 11,
    whiteSpace: 'nowrap' as const,
  },
};

// ============================================================================
// XR Entry Buttons Component
// ============================================================================

interface XREntryButtonsProps {
  /** Show VR button */
  showVR?: boolean;
  /** Show AR button */
  showAR?: boolean;
  /** Custom class name */
  className?: string;
}

export function XREntryButtons({
  showVR = true,
  showAR = true,
  className,
}: XREntryButtonsProps) {
  const spatialMode = useActiveSpatialMode();
  const capabilities = useXRCapabilities();
  const sessionState = useXRSessionState();
  const errorMessage = useSpatialError();
  const setCapabilities = useSpatialModeStore((s) => s.setCapabilities);
  const setActiveMode = useSpatialModeStore((s) => s.setActiveMode);
  const setSessionState = useSpatialModeStore((s) => s.setSessionState);
  const setError = useSpatialModeStore((s) => s.setError);

  const isInXR = spatialMode !== 'desktop';
  const isLoading = sessionState === 'requesting';

  // Check capabilities on mount
  useEffect(() => {
    async function checkCapabilities() {
      if (typeof navigator === 'undefined' || !navigator.xr) {
        setCapabilities({
          webXRAvailable: false,
          vrSupported: false,
          arSupported: false,
        });
        return;
      }

      try {
        const [vrSupported, arSupported] = await Promise.all([
          navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
          navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
        ]);

        setCapabilities({
          webXRAvailable: true,
          vrSupported,
          arSupported,
        });
      } catch {
        setCapabilities({
          webXRAvailable: false,
          vrSupported: false,
          arSupported: false,
        });
      }
    }

    checkCapabilities();
  }, [setCapabilities]);

  // Handle entering VR
  const handleEnterVR = useCallback(async () => {
    if (isLoading || !capabilities.vrSupported) return;

    try {
      setSessionState('requesting');
      setError(null);
      // Use retry logic in case XR context needs more time
      await enterXRWithRetry('vr', 2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enter VR';
      console.error('[XREntryButtons] VR entry failed:', message);
      setError(message);
      setSessionState('error');
    }
  }, [isLoading, capabilities.vrSupported, setSessionState, setError]);

  // Handle entering AR
  const handleEnterAR = useCallback(async () => {
    if (isLoading || !capabilities.arSupported) return;

    try {
      setSessionState('requesting');
      setError(null);
      // Use retry logic in case XR context needs more time
      await enterXRWithRetry('ar', 2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enter AR';
      console.error('[XREntryButtons] AR entry failed:', message);
      setError(message);
      setSessionState('error');
    }
  }, [isLoading, capabilities.arSupported, setSessionState, setError]);

  // Handle exiting XR
  const handleExit = () => {
    const session = xrStore.getState().session;
    if (session) {
      session.end();
    }
    setActiveMode('desktop');
    setSessionState('none');
  };

  // Get button style based on state
  const getButtonStyle = (type: 'vr' | 'ar' | 'exit', supported: boolean) => {
    if (isLoading) {
      return { ...styles.button, ...styles.loadingButton };
    }
    if (!supported && type !== 'exit') {
      return { ...styles.button, ...styles.disabledButton };
    }
    switch (type) {
      case 'vr':
        return { ...styles.button, ...styles.vrButton };
      case 'ar':
        return { ...styles.button, ...styles.arButton };
      case 'exit':
        return { ...styles.button, ...styles.exitButton };
    }
  };

  // Don't show if no XR support at all
  if (!capabilities.webXRAvailable && capabilities.lastChecked > 0) {
    return (
      <div style={styles.container} className={className}>
        <div style={styles.capabilityHint}>
          WebXR not available. Try Chrome with WebXR Emulator extension.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className={className}>
      {/* Error message */}
      {errorMessage && (
        <div style={styles.errorMessage}>{errorMessage}</div>
      )}

      {/* Capability hint */}
      {!isInXR && !capabilities.vrSupported && !capabilities.arSupported && capabilities.lastChecked > 0 && (
        <div style={styles.capabilityHint}>
          No XR device detected. Install WebXR Emulator to test.
        </div>
      )}

      {/* Exit button (when in XR) */}
      {isInXR && (
        <button
          onClick={handleExit}
          style={getButtonStyle('exit', true)}
          aria-label="Exit XR"
        >
          ✕ Exit {spatialMode.toUpperCase()}
        </button>
      )}

      {/* VR button (when not in XR) */}
      {!isInXR && showVR && (
        <button
          onClick={handleEnterVR}
          style={getButtonStyle('vr', capabilities.vrSupported)}
          disabled={!capabilities.vrSupported || isLoading}
          aria-label="Enter VR"
          title={
            capabilities.vrSupported
              ? 'Enter immersive VR mode'
              : 'VR not supported on this device'
          }
        >
          🥽 {isLoading ? 'Starting...' : 'Enter VR'}
        </button>
      )}

      {/* AR button (when not in XR) */}
      {!isInXR && showAR && (
        <button
          onClick={handleEnterAR}
          style={getButtonStyle('ar', capabilities.arSupported)}
          disabled={!capabilities.arSupported || isLoading}
          aria-label="Enter AR"
          title={
            capabilities.arSupported
              ? 'Enter augmented reality mode'
              : 'AR not supported on this device'
          }
        >
          📱 {isLoading ? 'Starting...' : 'Enter AR'}
        </button>
      )}
    </div>
  );
}

export default XREntryButtons;
