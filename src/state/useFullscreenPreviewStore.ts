/**
 * StickerNest v2 - Fullscreen Preview Store
 *
 * Manages fullscreen preview settings like background style.
 * Persisted to localStorage so preferences are remembered.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export type PreviewBackground = 'black' | 'canvas';

export interface FullscreenPreviewState {
  /** Background style for fullscreen preview */
  background: PreviewBackground;
}

export interface FullscreenPreviewActions {
  /** Set the background style */
  setBackground: (bg: PreviewBackground) => void;
  /** Toggle between black and theme background */
  toggleBackground: () => void;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const DEFAULT_STATE: FullscreenPreviewState = {
  background: 'canvas',
};

// ============================================================================
// STORE
// ============================================================================

type FullscreenPreviewStore = FullscreenPreviewState & FullscreenPreviewActions;

export const useFullscreenPreviewStore = create<FullscreenPreviewStore>()(
  persist(
    (set) => ({
      // State
      ...DEFAULT_STATE,

      // Actions
      setBackground: (background: PreviewBackground) => set({ background }),

      toggleBackground: () =>
        set((state) => ({
          background: state.background === 'black' ? 'theme' : 'black',
        })),
    }),
    {
      name: 'stickernest-fullscreen-preview',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Get the current background preference
 */
export function usePreviewBackground(): PreviewBackground {
  return useFullscreenPreviewStore((state) => state.background);
}

/**
 * Check if using canvas background
 */
export function useIsCanvasBackground(): boolean {
  return useFullscreenPreviewStore((state) => state.background === 'canvas');
}

export default useFullscreenPreviewStore;
