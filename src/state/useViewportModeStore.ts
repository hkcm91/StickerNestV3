/**
 * StickerNest v2 - Viewport Mode Store
 *
 * Manages responsive viewport mode state (mobile vs web).
 * Users can create separate widget layouts for each mode.
 * Persisted to localStorage so mode preference is remembered.
 *
 * IMPORTANT: On mobile devices, this store auto-initializes to 'mobile' mode
 * with device-native dimensions to ensure canvas visibility on first load.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Mobile breakpoint threshold (matches useResponsive.ts) */
const MOBILE_BREAKPOINT = 768;

/** Toolbar and chrome heights for calculating usable canvas area */
const MOBILE_TOOLBAR_HEIGHT = 64;
const MOBILE_HEADER_HEIGHT = 0; // No header by default

/** Common mobile device presets */
export const MOBILE_PRESETS = {
  'iphone-se': { width: 375, height: 667 },
  'iphone-14': { width: 390, height: 844 },
  'iphone-14-pro-max': { width: 430, height: 932 },
  'android-small': { width: 360, height: 640 },
  'android-large': { width: 412, height: 915 },
} as const;

export type MobilePreset = keyof typeof MOBILE_PRESETS;

// ============================================================================
// TYPES
// ============================================================================

export type ViewportMode = 'mobile' | 'web';

export interface ViewportModeState {
  /** Active viewport mode */
  activeMode: ViewportMode;
  /** Mobile viewport width (used when editing in mobile mode) */
  mobileWidth: number;
  /** Mobile viewport height (used when editing in mobile mode) */
  mobileHeight: number;
  /** Whether device-aware initialization has been performed */
  deviceInitialized: boolean;
  /** Whether user has manually overridden the mode (prevents auto-switch) */
  userOverride: boolean;
}

export interface ViewportModeActions {
  /** Set the active viewport mode */
  setMode: (mode: ViewportMode) => void;
  /** Toggle between mobile and web modes */
  toggleMode: () => void;
  /** Set mobile viewport dimensions */
  setMobileDimensions: (width: number, height: number) => void;
  /** Apply a preset mobile size */
  applyPreset: (preset: MobilePreset) => void;
  /** Initialize for current device (called on app mount) */
  initializeForDevice: () => void;
  /** Reset to default state */
  reset: () => void;
}

// ============================================================================
// DEVICE DETECTION HELPERS
// ============================================================================

/**
 * Check if current device is mobile based on viewport width
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Get device-native canvas dimensions
 * Accounts for toolbar and safe areas
 */
function getDeviceCanvasDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 390, height: 844 };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Get safe area insets if available
  const computedStyle = getComputedStyle(document.documentElement);
  const safeAreaTop = parseInt(computedStyle.getPropertyValue('--safe-area-top') || '0', 10) || 0;
  const safeAreaBottom = parseInt(computedStyle.getPropertyValue('--safe-area-bottom') || '0', 10) || 0;

  // Calculate usable canvas height (subtract toolbars and safe areas)
  const usableHeight = height - MOBILE_TOOLBAR_HEIGHT - MOBILE_HEADER_HEIGHT - safeAreaTop - safeAreaBottom;

  return {
    width: Math.max(width, 320), // Minimum 320px width
    height: Math.max(usableHeight, 400), // Minimum 400px height
  };
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const DEFAULT_STATE: ViewportModeState = {
  activeMode: 'web',
  mobileWidth: 390,
  mobileHeight: 844,
  deviceInitialized: false,
  userOverride: false,
};

// ============================================================================
// STORE
// ============================================================================

type ViewportModeStore = ViewportModeState & ViewportModeActions;

export const useViewportModeStore = create<ViewportModeStore>()(
  persist(
    (set, get) => ({
      // State
      ...DEFAULT_STATE,

      // Actions
      setMode: (mode: ViewportMode) =>
        set({
          activeMode: mode,
          userOverride: true, // User explicitly chose a mode
        }),

      toggleMode: () =>
        set((state) => ({
          activeMode: state.activeMode === 'web' ? 'mobile' : 'web',
          userOverride: true, // User explicitly toggled
        })),

      setMobileDimensions: (width: number, height: number) =>
        set({
          mobileWidth: Math.max(100, Math.min(4000, width)),
          mobileHeight: Math.max(100, Math.min(4000, height)),
        }),

      applyPreset: (preset: MobilePreset) => {
        const dimensions = MOBILE_PRESETS[preset];
        set({
          mobileWidth: dimensions.width,
          mobileHeight: dimensions.height,
        });
      },

      initializeForDevice: () => {
        const state = get();

        // Skip if already initialized or user has overridden
        if (state.deviceInitialized || state.userOverride) {
          return;
        }

        const isMobile = isMobileDevice();

        if (isMobile) {
          // On mobile device: switch to mobile mode with device dimensions
          const dimensions = getDeviceCanvasDimensions();
          set({
            activeMode: 'mobile',
            mobileWidth: dimensions.width,
            mobileHeight: dimensions.height,
            deviceInitialized: true,
          });
        } else {
          // On desktop: just mark as initialized, keep current mode
          set({ deviceInitialized: true });
        }
      },

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'stickernest-viewport-mode',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeMode: state.activeMode,
        mobileWidth: state.mobileWidth,
        mobileHeight: state.mobileHeight,
        // Note: We intentionally don't persist deviceInitialized or userOverride
        // so each session can re-detect the device
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Get the active viewport mode
 */
export function useActiveViewportMode(): ViewportMode {
  return useViewportModeStore((state) => state.activeMode);
}

/**
 * Check if currently in mobile mode
 */
export function useIsMobileMode(): boolean {
  return useViewportModeStore((state) => state.activeMode === 'mobile');
}

/**
 * Check if currently in web mode
 */
export function useIsWebMode(): boolean {
  return useViewportModeStore((state) => state.activeMode === 'web');
}

/**
 * Get mobile viewport dimensions
 */
export function useMobileDimensions(): { width: number; height: number } {
  return useViewportModeStore((state) => ({
    width: state.mobileWidth,
    height: state.mobileHeight,
  }));
}

/**
 * Check if device initialization has been performed
 */
export function useDeviceInitialized(): boolean {
  return useViewportModeStore((state) => state.deviceInitialized);
}

/**
 * Hook to initialize viewport mode for current device
 * Call this once on app mount (e.g., in App.tsx or a layout component)
 */
export function useInitializeViewportForDevice(): void {
  const initializeForDevice = useViewportModeStore((state) => state.initializeForDevice);
  const deviceInitialized = useViewportModeStore((state) => state.deviceInitialized);

  // Run initialization once on mount
  if (!deviceInitialized && typeof window !== 'undefined') {
    // Use setTimeout to avoid SSR issues and ensure DOM is ready
    setTimeout(() => {
      initializeForDevice();
    }, 0);
  }
}

// Re-export helpers for external use
export { isMobileDevice, getDeviceCanvasDimensions };

export default useViewportModeStore;
