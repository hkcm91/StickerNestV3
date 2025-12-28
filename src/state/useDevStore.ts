/**
 * StickerNest v2 - Dev Store (Zustand)
 * State management for dev tools and developer settings
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

// ==================
// Types
// ==================

export interface DevState {
  /** Dev toolbar button vertical position (0-100 percentage) */
  toolbarButtonVerticalPosition: number;
  
  /** Dev toolbar button side */
  toolbarButtonSide: 'left' | 'right';
}

export interface DevActions {
  /** Set toolbar button vertical position */
  setToolbarButtonVerticalPosition: (position: number) => void;
  
  /** Set toolbar button side */
  setToolbarButtonSide: (side: 'left' | 'right') => void;
}

// ==================
// Initial State
// ==================

const initialState: DevState = {
  toolbarButtonVerticalPosition: 20, // Start closer to top (20% from top)
  toolbarButtonSide: 'left',
};

// ==================
// Store
// ==================

export const useDevStore = create<DevState & DevActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setToolbarButtonVerticalPosition: (position) => {
          const clampedPosition = Math.min(Math.max(position, 0), 100);
          set({ toolbarButtonVerticalPosition: clampedPosition }, false, 'setToolbarButtonVerticalPosition');
        },

        setToolbarButtonSide: (side) => set({ toolbarButtonSide: side }, false, 'setToolbarButtonSide'),
      }),
      {
        name: 'stickernest-dev',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          toolbarButtonVerticalPosition: state.toolbarButtonVerticalPosition,
          toolbarButtonSide: state.toolbarButtonSide,
        }),
      }
    ),
    { name: 'DevStore', enabled: import.meta.env.DEV }
  )
);

