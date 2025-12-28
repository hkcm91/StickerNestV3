/**
 * StickerNest v2 - Landing Store (Zustand)
 * State management for landing page panel and UI state
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

// ==================
// Types
// ==================

export interface LandingState {
  /** Whether the landing panel is open */
  isLandingPanelOpen: boolean;
  
  /** Landing panel width in pixels */
  landingPanelWidth: number;
  
  /** Landing panel button vertical position (0-100 percentage) */
  landingButtonVerticalPosition: number;
  
  /** Landing panel button side */
  landingButtonSide: 'left' | 'right';
}

export interface LandingActions {
  /** Toggle landing panel open/closed */
  toggleLandingPanel: () => void;
  
  /** Set landing panel width */
  setLandingPanelWidth: (width: number) => void;
  
  /** Set landing button vertical position */
  setLandingButtonVerticalPosition: (position: number) => void;
  
  /** Set landing button side */
  setLandingButtonSide: (side: 'left' | 'right') => void;
}

// ==================
// Initial State
// ==================

const PANEL_CONFIG = {
  defaultWidth: 400,
  minWidth: 300,
  maxWidth: 500,
};

const initialState: LandingState = {
  isLandingPanelOpen: true, // Open by default on landing page
  landingPanelWidth: PANEL_CONFIG.defaultWidth,
  landingButtonVerticalPosition: 20, // Start closer to top (20% from top)
  landingButtonSide: 'left',
};

// ==================
// Store
// ==================

export const useLandingStore = create<LandingState & LandingActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        toggleLandingPanel: () => set((state) => ({ isLandingPanelOpen: !state.isLandingPanelOpen }), false, 'toggleLandingPanel'),

        setLandingPanelWidth: (width) => {
          const clampedWidth = Math.min(
            Math.max(width, PANEL_CONFIG.minWidth),
            PANEL_CONFIG.maxWidth
          );
          set({ landingPanelWidth: clampedWidth }, false, 'setLandingPanelWidth');
        },

        setLandingButtonVerticalPosition: (position) => {
          const clampedPosition = Math.min(Math.max(position, 0), 100);
          set({ landingButtonVerticalPosition: clampedPosition }, false, 'setLandingButtonVerticalPosition');
        },

        setLandingButtonSide: (side) => set({ landingButtonSide: side }, false, 'setLandingButtonSide'),
      }),
      {
        name: 'stickernest-landing',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          isLandingPanelOpen: state.isLandingPanelOpen,
          landingPanelWidth: state.landingPanelWidth,
          landingButtonVerticalPosition: state.landingButtonVerticalPosition,
          landingButtonSide: state.landingButtonSide,
        }),
      }
    ),
    { name: 'LandingStore', enabled: import.meta.env.DEV }
  )
);

