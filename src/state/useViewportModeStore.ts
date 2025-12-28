/**
 * StickerNest v2 - Viewport Mode Store
 *
 * Manages responsive viewport mode state (mobile vs web).
 * Users can create separate widget layouts for each mode.
 * Persisted to localStorage so mode preference is remembered.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
}

export interface ViewportModeActions {
  /** Set the active viewport mode */
  setMode: (mode: ViewportMode) => void;
  /** Toggle between mobile and web modes */
  toggleMode: () => void;
  /** Set mobile viewport dimensions */
  setMobileDimensions: (width: number, height: number) => void;
  /** Reset to default state */
  reset: () => void;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const DEFAULT_STATE: ViewportModeState = {
  activeMode: 'web',
  mobileWidth: 390,
  mobileHeight: 844,
};

// ============================================================================
// STORE
// ============================================================================

type ViewportModeStore = ViewportModeState & ViewportModeActions;

export const useViewportModeStore = create<ViewportModeStore>()(
  persist(
    (set) => ({
      // State
      ...DEFAULT_STATE,

      // Actions
      setMode: (mode: ViewportMode) => set({ activeMode: mode }),

      toggleMode: () =>
        set((state) => ({
          activeMode: state.activeMode === 'web' ? 'mobile' : 'web',
        })),

      setMobileDimensions: (width: number, height: number) =>
        set({
          mobileWidth: Math.max(100, Math.min(4000, width)),
          mobileHeight: Math.max(100, Math.min(4000, height)),
        }),

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'stickernest-viewport-mode',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeMode: state.activeMode,
        mobileWidth: state.mobileWidth,
        mobileHeight: state.mobileHeight,
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

export default useViewportModeStore;
