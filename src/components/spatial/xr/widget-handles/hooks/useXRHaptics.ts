/**
 * Widget 3D Handles - XR Haptics Hook
 *
 * Provides haptic feedback for XR controllers with:
 * - Pattern sequencing
 * - Device capability detection
 * - User preferences integration
 * - Vibration API fallback for non-XR devices
 */

import { useCallback, useMemo, useRef } from 'react';
import { useXRInputSourceState } from '@react-three/xr';
import type { HandSide, HapticPattern, HapticSequence, HapticCapabilities } from '../types';
import { HAPTIC_PRESETS } from '../types';
import { useHapticPreferencesStore } from '../../../../../stores/useHapticPreferencesStore';

interface UseXRHapticsOptions {
  /** Enable haptics (can be disabled per-component) */
  enabled?: boolean;
  /** Override intensity multiplier (default uses store) */
  intensityMultiplier?: number;
}

interface UseXRHapticsResult {
  /** Trigger a single haptic pulse */
  triggerHaptic: (hand: HandSide, intensity: number, duration?: number) => void;
  /** Trigger a preset haptic pattern */
  triggerPreset: (hand: HandSide, preset: keyof typeof HAPTIC_PRESETS) => void;
  /** Trigger a custom pattern sequence */
  triggerPattern: (hand: HandSide, sequence: HapticSequence) => void;
  /** Stop any ongoing pattern */
  stopPattern: () => void;
  /** Device haptic capabilities */
  capabilities: HapticCapabilities;
  /** Whether haptics are currently enabled */
  isEnabled: boolean;
}

// Waveform pattern presets for complex feedback
const WAVEFORM_PATTERNS: Record<string, HapticSequence> = {
  grab: [
    { intensity: 0.3, duration: 10 },
    { intensity: 0.6, duration: 30 },
    { intensity: 0.3, duration: 10 },
  ],
  release: [
    { intensity: 0.4, duration: 20 },
    { intensity: 0.2, duration: 20 },
  ],
  snap: [
    { intensity: 0.5, duration: 15 },
    { intensity: 0, duration: 30 }, // pause
    { intensity: 0.3, duration: 15 },
  ],
  error: [
    { intensity: 0.8, duration: 50 },
    { intensity: 0, duration: 50 },
    { intensity: 0.8, duration: 50 },
  ],
  success: [
    { intensity: 0.3, duration: 30 },
    { intensity: 0.5, duration: 40 },
    { intensity: 0.3, duration: 30 },
  ],
  twoHandStart: [
    { intensity: 0.4, duration: 20 },
    { intensity: 0.8, duration: 40 },
    { intensity: 0.4, duration: 20 },
  ],
};

export function useXRHaptics(options: UseXRHapticsOptions = {}): UseXRHapticsResult {
  const { enabled: componentEnabled = true, intensityMultiplier: overrideMultiplier } = options;

  // Get preferences from store
  const storeEnabled = useHapticPreferencesStore((s) => s.enabled);
  const storeMultiplier = useHapticPreferencesStore((s) => s.getIntensityMultiplier());
  const reduceMotion = useHapticPreferencesStore((s) => s.reduceMotion);
  const snapFeedback = useHapticPreferencesStore((s) => s.snapFeedback);
  const continuousFeedback = useHapticPreferencesStore((s) => s.continuousFeedback);

  // Combine enabled states
  const isEnabled = componentEnabled && storeEnabled;
  const intensityMultiplier = overrideMultiplier ?? storeMultiplier;

  // Pattern playback tracking
  const patternTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const leftControllerState = useXRInputSourceState('controller', 'left');
  const rightControllerState = useXRInputSourceState('controller', 'right');

  // Detect haptic capabilities
  const capabilities = useMemo((): HapticCapabilities => {
    const leftGamepad = leftControllerState?.inputSource?.gamepad;
    const rightGamepad = rightControllerState?.inputSource?.gamepad;
    const gamepad = leftGamepad || rightGamepad;

    // Check for XR haptics
    if (gamepad?.hapticActuators?.[0]) {
      // Quest 3/Pro has HD haptics with more nuanced feedback
      const isHDHaptics =
        gamepad.id?.includes('Quest 3') ||
        gamepad.id?.includes('Quest Pro') ||
        gamepad.id?.includes('Vision') ||
        false;

      return {
        supported: true,
        hdHaptics: isHDHaptics,
        maxIntensity: 1,
        maxDuration: 5000,
        supportsWaveform: isHDHaptics,
      };
    }

    // Check for Vibration API fallback (mobile/desktop)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      return {
        supported: true,
        hdHaptics: false,
        maxIntensity: 1,
        maxDuration: 1000, // Vibration API has shorter limits
        supportsWaveform: false,
        usesVibrationAPI: true,
      };
    }

    return {
      supported: false,
      hdHaptics: false,
      maxIntensity: 0,
      maxDuration: 0,
    };
  }, [leftControllerState, rightControllerState]);

  // Get actuator for a specific hand
  const getActuator = useCallback(
    (hand: 'left' | 'right') => {
      const state = hand === 'left' ? leftControllerState : rightControllerState;
      return state?.inputSource?.gamepad?.hapticActuators?.[0];
    },
    [leftControllerState, rightControllerState]
  );

  // Trigger via Vibration API fallback
  const triggerVibration = useCallback(
    (duration: number) => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(duration);
        } catch {
          // Vibration not available
        }
      }
    },
    []
  );

  // Trigger a single pulse
  const triggerHaptic = useCallback(
    (hand: HandSide, intensity: number, duration: number = 50) => {
      if (!isEnabled || !capabilities.supported) return;

      // Apply intensity multiplier and reduce motion preference
      let adjustedIntensity = Math.min(1, intensity * intensityMultiplier);
      let adjustedDuration = duration;

      if (reduceMotion) {
        adjustedIntensity *= 0.5;
        adjustedDuration = Math.min(duration, 30);
      }

      // Use Vibration API fallback if no XR
      if (capabilities.usesVibrationAPI) {
        triggerVibration(adjustedDuration);
        return;
      }

      const pulse = (h: 'left' | 'right') => {
        const actuator = getActuator(h);
        if (actuator) {
          try {
            actuator.pulse(adjustedIntensity, adjustedDuration);
          } catch {
            // Haptics failed
          }
        }
      };

      if (hand === 'left' || hand === 'both') {
        pulse('left');
      }
      if (hand === 'right' || hand === 'both') {
        pulse('right');
      }
    },
    [isEnabled, capabilities, intensityMultiplier, reduceMotion, getActuator, triggerVibration]
  );

  // Stop any ongoing pattern
  const stopPattern = useCallback(() => {
    patternTimeoutsRef.current.forEach(clearTimeout);
    patternTimeoutsRef.current = [];
  }, []);

  // Trigger a preset
  const triggerPreset = useCallback(
    (hand: HandSide, preset: keyof typeof HAPTIC_PRESETS) => {
      // Check if this preset type is enabled
      if (preset === 'snap' && !snapFeedback) return;
      if (preset === 'drag' && !continuousFeedback) return;

      const pattern = HAPTIC_PRESETS[preset];

      // For simple presets, use single pulse
      if (!capabilities.hdHaptics || reduceMotion) {
        triggerHaptic(hand, pattern.intensity, pattern.duration);
        return;
      }

      // For HD haptics, use waveform pattern if available
      const waveform = WAVEFORM_PATTERNS[preset];
      if (waveform) {
        triggerPatternInternal(hand, waveform);
      } else {
        triggerHaptic(hand, pattern.intensity, pattern.duration);
      }
    },
    [snapFeedback, continuousFeedback, capabilities.hdHaptics, reduceMotion, triggerHaptic]
  );

  // Internal pattern trigger
  const triggerPatternInternal = useCallback(
    (hand: HandSide, sequence: HapticSequence) => {
      if (!isEnabled || !capabilities.supported) return;

      // Stop any existing pattern
      stopPattern();

      let delay = 0;
      sequence.forEach((step) => {
        const timeout = setTimeout(() => {
          if (step.intensity > 0) {
            triggerHaptic(hand, step.intensity, step.duration);
          }
        }, delay);
        patternTimeoutsRef.current.push(timeout);
        delay += step.duration;
      });
    },
    [isEnabled, capabilities.supported, stopPattern, triggerHaptic]
  );

  // Trigger a custom pattern sequence
  const triggerPattern = useCallback(
    (hand: HandSide, sequence: HapticSequence) => {
      triggerPatternInternal(hand, sequence);
    },
    [triggerPatternInternal]
  );

  return {
    triggerHaptic,
    triggerPreset,
    triggerPattern,
    stopPattern,
    capabilities,
    isEnabled,
  };
}

export default useXRHaptics;

// Re-export waveform patterns for custom use
export { WAVEFORM_PATTERNS };
