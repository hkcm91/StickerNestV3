/**
 * StickerNest v2 - Device Preview Store
 *
 * Manages device viewport simulation state for fullscreen preview.
 * Persisted to localStorage so device settings are remembered.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  DevicePreviewState,
  DevicePreviewActions,
  DevicePreset,
  DeviceOrientation,
} from '../types/devicePreview';
import { getEffectiveDimensions } from '../types/devicePreview';

// ============================================================================
// DEFAULT STATE
// ============================================================================

const DEFAULT_STATE: DevicePreviewState = {
  enabled: false,
  showFrame: true,
  orientation: 'portrait',
  preset: null,
  customDimensions: {
    width: 390,
    height: 844,
  },
};

// ============================================================================
// STORE
// ============================================================================

type DevicePreviewStore = DevicePreviewState & DevicePreviewActions;

export const useDevicePreviewStore = create<DevicePreviewStore>()(
  persist(
    (set, get) => ({
      // State
      ...DEFAULT_STATE,

      // Actions
      setEnabled: (enabled: boolean) => set({ enabled }),

      toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),

      setShowFrame: (showFrame: boolean) => set({ showFrame }),

      toggleShowFrame: () => set((state) => ({ showFrame: !state.showFrame })),

      setOrientation: (orientation: DeviceOrientation) => set({ orientation }),

      toggleOrientation: () =>
        set((state) => ({
          orientation: state.orientation === 'portrait' ? 'landscape' : 'portrait',
        })),

      setPreset: (preset: DevicePreset | null) => {
        if (preset) {
          set({
            preset,
            customDimensions: {
              width: preset.width,
              height: preset.height,
            },
          });
        } else {
          set({ preset: null });
        }
      },

      setCustomDimensions: (width: number, height: number) =>
        set({
          customDimensions: { width, height },
          preset: null, // Clear preset when using custom dimensions
        }),

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'stickernest-device-preview',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        showFrame: state.showFrame,
        orientation: state.orientation,
        preset: state.preset,
        customDimensions: state.customDimensions,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Get the current effective viewport dimensions
 * Takes into account orientation (swaps width/height for landscape)
 */
export function useDeviceViewportDimensions(): { width: number; height: number } {
  const { preset, customDimensions, orientation } = useDevicePreviewStore();

  const baseWidth = preset?.width ?? customDimensions.width;
  const baseHeight = preset?.height ?? customDimensions.height;

  return getEffectiveDimensions(baseWidth, baseHeight, orientation);
}

/**
 * Get whether device preview is currently active
 */
export function useDevicePreviewEnabled(): boolean {
  return useDevicePreviewStore((state) => state.enabled);
}

/**
 * Get whether device frame should be shown
 */
export function useDeviceFrameVisible(): boolean {
  return useDevicePreviewStore((state) => state.enabled && state.showFrame);
}

export default useDevicePreviewStore;
