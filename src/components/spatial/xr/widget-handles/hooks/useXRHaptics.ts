/**
 * Widget 3D Handles - XR Haptics Hook
 *
 * Provides haptic feedback for XR controllers with pattern support,
 * device detection, and user preferences.
 */

import { useCallback, useMemo } from 'react';
import { useXRInputSourceState } from '@react-three/xr';
import type { HandSide, HapticPattern, HapticCapabilities } from '../types';
import { HAPTIC_PRESETS } from '../types';

interface UseXRHapticsOptions {
  /** Enable haptics (can be disabled for accessibility) */
  enabled?: boolean;
  /** Intensity multiplier (0-1) for user preference */
  intensityMultiplier?: number;
}

interface UseXRHapticsResult {
  /** Trigger a single haptic pulse */
  triggerHaptic: (hand: HandSide, intensity: number, duration?: number) => void;
  /** Trigger a preset haptic pattern */
  triggerPreset: (hand: HandSide, preset: keyof typeof HAPTIC_PRESETS) => void;
  /** Trigger a custom pattern sequence */
  triggerPattern: (hand: HandSide, patterns: HapticPattern[]) => void;
  /** Device haptic capabilities */
  capabilities: HapticCapabilities;
}

export function useXRHaptics(options: UseXRHapticsOptions = {}): UseXRHapticsResult {
  const { enabled = true, intensityMultiplier = 1 } = options;

  const leftControllerState = useXRInputSourceState('controller', 'left');
  const rightControllerState = useXRInputSourceState('controller', 'right');

  // Detect haptic capabilities
  const capabilities = useMemo((): HapticCapabilities => {
    const leftGamepad = leftControllerState?.inputSource?.gamepad;
    const rightGamepad = rightControllerState?.inputSource?.gamepad;
    const gamepad = leftGamepad || rightGamepad;

    if (!gamepad?.hapticActuators?.[0]) {
      return {
        supported: false,
        hdHaptics: false,
        maxIntensity: 0,
        maxDuration: 0,
      };
    }

    // Quest 3 has HD haptics, Quest 2 does not
    // We detect this by checking the gamepad id or haptic actuator type
    const isHDHaptics = gamepad.id?.includes('Quest 3') ||
                        gamepad.id?.includes('Quest Pro') ||
                        false;

    return {
      supported: true,
      hdHaptics: isHDHaptics,
      maxIntensity: 1,
      maxDuration: 5000,
    };
  }, [leftControllerState, rightControllerState]);

  // Get actuator for a specific hand
  const getActuator = useCallback((hand: 'left' | 'right') => {
    const state = hand === 'left' ? leftControllerState : rightControllerState;
    return state?.inputSource?.gamepad?.hapticActuators?.[0];
  }, [leftControllerState, rightControllerState]);

  // Trigger a single pulse
  const triggerHaptic = useCallback((
    hand: HandSide,
    intensity: number,
    duration: number = 50
  ) => {
    if (!enabled || !capabilities.supported) return;

    const adjustedIntensity = Math.min(1, intensity * intensityMultiplier);

    const pulse = (h: 'left' | 'right') => {
      const actuator = getActuator(h);
      if (actuator) {
        try {
          actuator.pulse(adjustedIntensity, duration);
        } catch (e) {
          // Haptics failed - device may not support it
        }
      }
    };

    if (hand === 'left' || hand === 'both') {
      pulse('left');
    }
    if (hand === 'right' || hand === 'both') {
      pulse('right');
    }
  }, [enabled, capabilities.supported, intensityMultiplier, getActuator]);

  // Trigger a preset
  const triggerPreset = useCallback((
    hand: HandSide,
    preset: keyof typeof HAPTIC_PRESETS
  ) => {
    const pattern = HAPTIC_PRESETS[preset];
    triggerHaptic(hand, pattern.intensity, pattern.duration);
  }, [triggerHaptic]);

  // Trigger a pattern sequence
  const triggerPattern = useCallback((
    hand: HandSide,
    patterns: HapticPattern[]
  ) => {
    if (!enabled || !capabilities.supported) return;

    let delay = 0;
    patterns.forEach((pattern) => {
      setTimeout(() => {
        triggerHaptic(hand, pattern.intensity, pattern.duration);
      }, delay);
      delay += pattern.duration;
    });
  }, [enabled, capabilities.supported, triggerHaptic]);

  return {
    triggerHaptic,
    triggerPreset,
    triggerPattern,
    capabilities,
  };
}

export default useXRHaptics;
