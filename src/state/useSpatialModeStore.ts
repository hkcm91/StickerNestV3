/**
 * StickerNest v2 - Spatial Mode Store
 *
 * Manages spatial rendering mode state (desktop/VR/AR).
 * VR and AR are rendering + input modes, not separate applications.
 * All modes share the same core systems - widgets, canvas, scene graph.
 * Mode-specific logic lives in adapters, not forks.
 *
 * Persisted to localStorage so mode preference is remembered.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Spatial rendering modes:
 * - desktop: Traditional 2D view with optional depth cues
 * - vr: Immersive VR with environment enabled (WebXR immersive-vr)
 * - ar: Immersive AR with real-world passthrough (WebXR immersive-ar)
 */
export type SpatialMode = 'desktop' | 'vr' | 'ar';

/**
 * WebXR session state
 */
export type XRSessionState = 'none' | 'requesting' | 'active' | 'ending' | 'error';

/**
 * XR device capabilities detected
 */
export interface XRCapabilities {
  /** Whether immersive-vr is supported */
  vrSupported: boolean;
  /** Whether immersive-ar is supported */
  arSupported: boolean;
  /** Whether WebXR API is available */
  webXRAvailable: boolean;
  /** Last capability check timestamp */
  lastChecked: number;
}

export interface SpatialModeState {
  /** Active spatial rendering mode */
  activeMode: SpatialMode;
  /** Target mode when requesting XR session */
  targetMode: SpatialMode | null;
  /** Current XR session state */
  sessionState: XRSessionState;
  /** Device XR capabilities */
  capabilities: XRCapabilities;
  /** Error message if session failed */
  errorMessage: string | null;
  /** Whether user prefers reduced motion (accessibility) */
  reducedMotion: boolean;
  /** Whether to show depth cues in desktop mode */
  depthCuesEnabled: boolean;
}

export interface SpatialModeActions {
  /** Request to enter a spatial mode (may trigger XR session) */
  requestMode: (mode: SpatialMode) => void;
  /** Set the active mode directly (used by adapters) */
  setActiveMode: (mode: SpatialMode) => void;
  /** Update XR session state */
  setSessionState: (state: XRSessionState) => void;
  /** Set error message */
  setError: (message: string | null) => void;
  /** Update detected XR capabilities */
  setCapabilities: (capabilities: Partial<XRCapabilities>) => void;
  /** Toggle VR mode (desktop <-> vr) */
  toggleVR: () => void;
  /** Toggle AR mode (desktop <-> ar) */
  toggleAR: () => void;
  /** Exit immersive mode and return to desktop */
  exitImmersive: () => void;
  /** Set reduced motion preference */
  setReducedMotion: (enabled: boolean) => void;
  /** Toggle depth cues in desktop mode */
  toggleDepthCues: () => void;
  /** Reset to default state */
  reset: () => void;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const DEFAULT_CAPABILITIES: XRCapabilities = {
  vrSupported: false,
  arSupported: false,
  webXRAvailable: typeof navigator !== 'undefined' && 'xr' in navigator,
  lastChecked: 0,
};

const DEFAULT_STATE: SpatialModeState = {
  activeMode: 'desktop',
  targetMode: null,
  sessionState: 'none',
  capabilities: DEFAULT_CAPABILITIES,
  errorMessage: null,
  reducedMotion: false,
  depthCuesEnabled: true,
};

// ============================================================================
// STORE
// ============================================================================

type SpatialModeStore = SpatialModeState & SpatialModeActions;

export const useSpatialModeStore = create<SpatialModeStore>()(
  persist(
    (set, get) => ({
      // State
      ...DEFAULT_STATE,

      // Actions
      requestMode: (mode: SpatialMode) => {
        const { activeMode, capabilities } = get();

        // Already in requested mode
        if (activeMode === mode) return;

        // Desktop mode - no XR session needed
        if (mode === 'desktop') {
          set({
            targetMode: 'desktop',
            activeMode: 'desktop',
            sessionState: 'none',
            errorMessage: null,
          });
          return;
        }

        // Check VR support
        if (mode === 'vr' && !capabilities.vrSupported && capabilities.lastChecked > 0) {
          set({ errorMessage: 'VR not supported on this device' });
          return;
        }

        // Check AR support
        if (mode === 'ar' && !capabilities.arSupported && capabilities.lastChecked > 0) {
          set({ errorMessage: 'AR not supported on this device' });
          return;
        }

        // Request the mode - actual session start is handled by adapter
        set({
          targetMode: mode,
          sessionState: 'requesting',
          errorMessage: null,
        });
      },

      setActiveMode: (mode: SpatialMode) => {
        set({
          activeMode: mode,
          targetMode: null,
          sessionState: mode === 'desktop' ? 'none' : 'active',
          errorMessage: null,
        });
      },

      setSessionState: (sessionState: XRSessionState) => {
        const updates: Partial<SpatialModeState> = { sessionState };

        // If session ended or errored, return to desktop
        if (sessionState === 'none' || sessionState === 'error') {
          updates.activeMode = 'desktop';
          updates.targetMode = null;
        }

        set(updates);
      },

      setError: (message: string | null) => {
        set({
          errorMessage: message,
          sessionState: message ? 'error' : get().sessionState,
        });
      },

      setCapabilities: (capabilities: Partial<XRCapabilities>) => {
        set({
          capabilities: {
            ...get().capabilities,
            ...capabilities,
            lastChecked: Date.now(),
          },
        });
      },

      toggleVR: () => {
        const { activeMode } = get();
        get().requestMode(activeMode === 'vr' ? 'desktop' : 'vr');
      },

      toggleAR: () => {
        const { activeMode } = get();
        get().requestMode(activeMode === 'ar' ? 'desktop' : 'ar');
      },

      exitImmersive: () => {
        set({
          targetMode: 'desktop',
          sessionState: 'ending',
        });
      },

      setReducedMotion: (enabled: boolean) => {
        set({ reducedMotion: enabled });
      },

      toggleDepthCues: () => {
        set((state) => ({ depthCuesEnabled: !state.depthCuesEnabled }));
      },

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'stickernest-spatial-mode',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist preferences, not session state
        reducedMotion: state.reducedMotion,
        depthCuesEnabled: state.depthCuesEnabled,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Get the active spatial mode
 */
export function useActiveSpatialMode(): SpatialMode {
  return useSpatialModeStore((state) => state.activeMode);
}

/**
 * Check if currently in desktop mode
 */
export function useIsDesktopMode(): boolean {
  return useSpatialModeStore((state) => state.activeMode === 'desktop');
}

/**
 * Check if currently in VR mode
 */
export function useIsVRMode(): boolean {
  return useSpatialModeStore((state) => state.activeMode === 'vr');
}

/**
 * Check if currently in AR mode
 */
export function useIsARMode(): boolean {
  return useSpatialModeStore((state) => state.activeMode === 'ar');
}

/**
 * Check if in any immersive mode (VR or AR)
 */
export function useIsImmersiveMode(): boolean {
  return useSpatialModeStore((state) => state.activeMode !== 'desktop');
}

/**
 * Get XR session state
 */
export function useXRSessionState(): XRSessionState {
  return useSpatialModeStore((state) => state.sessionState);
}

/**
 * Get XR capabilities
 */
export function useXRCapabilities(): XRCapabilities {
  return useSpatialModeStore((state) => state.capabilities);
}

/**
 * Check if VR is supported
 */
export function useIsVRSupported(): boolean {
  return useSpatialModeStore((state) => state.capabilities.vrSupported);
}

/**
 * Check if AR is supported
 */
export function useIsARSupported(): boolean {
  return useSpatialModeStore((state) => state.capabilities.arSupported);
}

/**
 * Get error message if any
 */
export function useSpatialError(): string | null {
  return useSpatialModeStore((state) => state.errorMessage);
}

/**
 * Check if XR session is in progress (requesting or active)
 */
export function useIsXRSessionActive(): boolean {
  return useSpatialModeStore((state) =>
    state.sessionState === 'requesting' || state.sessionState === 'active'
  );
}

export default useSpatialModeStore;
