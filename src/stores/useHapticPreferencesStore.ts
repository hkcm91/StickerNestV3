/**
 * Haptic Preferences Store
 *
 * Zustand store for user haptic feedback preferences.
 * Persisted to localStorage for cross-session consistency.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export type HapticIntensityLevel = 'off' | 'low' | 'medium' | 'high';

export interface HapticPreferences {
  /** Master haptic enable/disable */
  enabled: boolean;
  /** Intensity multiplier level */
  intensity: HapticIntensityLevel;
  /** Reduce motion for accessibility */
  reduceMotion: boolean;
  /** Enable continuous haptics during drag */
  continuousFeedback: boolean;
  /** Enable snap feedback */
  snapFeedback: boolean;
}

export interface HapticPreferencesState extends HapticPreferences {
  // Actions
  setEnabled: (enabled: boolean) => void;
  setIntensity: (intensity: HapticIntensityLevel) => void;
  setReduceMotion: (reduce: boolean) => void;
  setContinuousFeedback: (enabled: boolean) => void;
  setSnapFeedback: (enabled: boolean) => void;
  resetToDefaults: () => void;

  // Computed
  getIntensityMultiplier: () => number;
}

const DEFAULT_PREFERENCES: HapticPreferences = {
  enabled: true,
  intensity: 'medium',
  reduceMotion: false,
  continuousFeedback: true,
  snapFeedback: true,
};

/**
 * Get intensity multiplier from level
 */
function getMultiplier(level: HapticIntensityLevel): number {
  switch (level) {
    case 'off':
      return 0;
    case 'low':
      return 0.4;
    case 'medium':
      return 0.7;
    case 'high':
      return 1.0;
  }
}

export const useHapticPreferencesStore = create<HapticPreferencesState>()(
  devtools(
    persist(
      (set, get) => ({
        ...DEFAULT_PREFERENCES,

        setEnabled: (enabled) => set({ enabled }),

        setIntensity: (intensity) => set({ intensity }),

        setReduceMotion: (reduceMotion) => set({ reduceMotion }),

        setContinuousFeedback: (continuousFeedback) => set({ continuousFeedback }),

        setSnapFeedback: (snapFeedback) => set({ snapFeedback }),

        resetToDefaults: () => set(DEFAULT_PREFERENCES),

        getIntensityMultiplier: () => {
          const { enabled, intensity, reduceMotion } = get();
          if (!enabled) return 0;
          if (reduceMotion) return getMultiplier(intensity) * 0.5;
          return getMultiplier(intensity);
        },
      }),
      {
        name: 'stickernest-haptic-preferences',
        version: 1,
      }
    ),
    { name: 'HapticPreferences' }
  )
);

/**
 * Selector hooks for common use cases
 */
export const useHapticEnabled = () =>
  useHapticPreferencesStore((state) => state.enabled);

export const useHapticIntensity = () =>
  useHapticPreferencesStore((state) => state.getIntensityMultiplier());

export const useSnapHapticsEnabled = () =>
  useHapticPreferencesStore((state) => state.enabled && state.snapFeedback);
