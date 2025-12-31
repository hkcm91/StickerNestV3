/**
 * StickerNest - VR Tool Hub Store
 *
 * Persisted state for the VR Tool Hub including curve amount,
 * pinned position, and expanded sections.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Vector3 } from 'three';

// ============================================================================
// Types
// ============================================================================

export type VRToolType = 'select' | 'move' | 'resize' | 'rotate' | 'draw' | 'widget';

export interface VRToolHubState {
  // Curve settings
  curveAmount: number; // 0 = flat, 1 = fully curved

  // Position
  isPinned: boolean;
  pinnedPosition: { x: number; y: number; z: number } | null;
  pinnedRotation: { x: number; y: number; z: number } | null;

  // Active tool
  activeTool: VRToolType;

  // Expanded sections
  showSettings: boolean;
  showWidgetLibrary: boolean;
  showColorPicker: boolean;

  // Appearance
  accentColor: string;
  hapticFeedback: boolean;
  buttonSize: 'small' | 'medium' | 'large';

  // Recent tools (for quick access)
  recentTools: VRToolType[];
}

export interface VRToolHubActions {
  // Curve
  setCurveAmount: (amount: number) => void;

  // Position
  pin: (position?: { x: number; y: number; z: number }) => void;
  unpin: () => void;
  togglePin: () => void;
  setPinnedPosition: (position: { x: number; y: number; z: number }) => void;
  setPinnedRotation: (rotation: { x: number; y: number; z: number }) => void;

  // Tool selection
  setActiveTool: (tool: VRToolType) => void;
  cycleToNextTool: () => void;
  cycleToPreviousTool: () => void;

  // Sections
  toggleSettings: () => void;
  toggleWidgetLibrary: () => void;
  toggleColorPicker: () => void;
  closeAllPanels: () => void;

  // Appearance
  setAccentColor: (color: string) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setButtonSize: (size: 'small' | 'medium' | 'large') => void;

  // Reset
  resetToDefaults: () => void;
}

// ============================================================================
// Tool order for cycling
// ============================================================================

const TOOL_ORDER: VRToolType[] = ['select', 'move', 'resize', 'rotate', 'draw', 'widget'];

// ============================================================================
// Default state
// ============================================================================

const defaultState: VRToolHubState = {
  curveAmount: 0.35,
  isPinned: false,
  pinnedPosition: null,
  pinnedRotation: null,
  activeTool: 'select',
  showSettings: false,
  showWidgetLibrary: false,
  showColorPicker: false,
  accentColor: '#8b5cf6',
  hapticFeedback: true,
  buttonSize: 'medium',
  recentTools: ['select'],
};

// ============================================================================
// Store
// ============================================================================

export const useVRToolHubStore = create<VRToolHubState & VRToolHubActions>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // Curve
      setCurveAmount: (amount) =>
        set({ curveAmount: Math.max(0, Math.min(1, amount)) }),

      // Position
      pin: (position) =>
        set({
          isPinned: true,
          pinnedPosition: position || get().pinnedPosition,
        }),

      unpin: () =>
        set({
          isPinned: false,
        }),

      togglePin: () => {
        const { isPinned } = get();
        if (isPinned) {
          get().unpin();
        } else {
          get().pin();
        }
      },

      setPinnedPosition: (position) =>
        set({ pinnedPosition: position }),

      setPinnedRotation: (rotation) =>
        set({ pinnedRotation: rotation }),

      // Tool selection
      setActiveTool: (tool) => {
        const { recentTools } = get();
        const newRecent = [tool, ...recentTools.filter((t) => t !== tool)].slice(0, 5);
        set({ activeTool: tool, recentTools: newRecent });
      },

      cycleToNextTool: () => {
        const { activeTool } = get();
        const currentIndex = TOOL_ORDER.indexOf(activeTool);
        const nextIndex = (currentIndex + 1) % TOOL_ORDER.length;
        get().setActiveTool(TOOL_ORDER[nextIndex]);
      },

      cycleToPreviousTool: () => {
        const { activeTool } = get();
        const currentIndex = TOOL_ORDER.indexOf(activeTool);
        const prevIndex = (currentIndex - 1 + TOOL_ORDER.length) % TOOL_ORDER.length;
        get().setActiveTool(TOOL_ORDER[prevIndex]);
      },

      // Sections
      toggleSettings: () =>
        set((state) => ({
          showSettings: !state.showSettings,
          showWidgetLibrary: false,
          showColorPicker: false,
        })),

      toggleWidgetLibrary: () =>
        set((state) => ({
          showWidgetLibrary: !state.showWidgetLibrary,
          showSettings: false,
          showColorPicker: false,
        })),

      toggleColorPicker: () =>
        set((state) => ({
          showColorPicker: !state.showColorPicker,
        })),

      closeAllPanels: () =>
        set({
          showSettings: false,
          showWidgetLibrary: false,
          showColorPicker: false,
        }),

      // Appearance
      setAccentColor: (color) => set({ accentColor: color }),

      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),

      setButtonSize: (size) => set({ buttonSize: size }),

      // Reset
      resetToDefaults: () => set(defaultState),
    }),
    {
      name: 'stickernest-vr-toolhub',
      partialize: (state) => ({
        curveAmount: state.curveAmount,
        accentColor: state.accentColor,
        hapticFeedback: state.hapticFeedback,
        buttonSize: state.buttonSize,
        // Don't persist runtime state
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const useVRToolHubCurve = () => useVRToolHubStore((s) => s.curveAmount);
export const useVRToolHubActiveTool = () => useVRToolHubStore((s) => s.activeTool);
export const useVRToolHubAccentColor = () => useVRToolHubStore((s) => s.accentColor);
export const useVRToolHubIsPinned = () => useVRToolHubStore((s) => s.isPinned);
