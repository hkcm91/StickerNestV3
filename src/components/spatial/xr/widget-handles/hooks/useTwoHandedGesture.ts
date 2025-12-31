/**
 * Widget 3D Handles - Two-Handed Gesture Hook
 *
 * Detects and manages two-handed manipulation (pinch-to-zoom)
 * for both controllers and hand tracking.
 */

import { useCallback, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR, useXRInputSourceState } from '@react-three/xr';
import * as THREE from 'three';
import type { TwoHandedState } from '../types';
import { HANDLE_CONSTANTS } from '../types';
import { useXRHaptics } from './useXRHaptics';
import { calculateDistance, calculateAngleBetweenPoints } from '../utils/geometryUtils';

interface UseTwoHandedGestureOptions {
  /** Enable two-handed manipulation */
  enabled: boolean;
  /** Initial width for scale calculation */
  initialWidth: number;
  /** Initial height for scale calculation */
  initialHeight: number;
  /** Callback when scale changes */
  onScaleChange?: (scaleFactor: number) => void;
  /** Callback when rotation changes (during two-handed) */
  onRotationChange?: (angleDelta: number) => void;
  /** Callback when manipulation starts */
  onStart?: () => void;
  /** Callback when manipulation ends */
  onEnd?: (finalScale: number, finalRotation: number) => void;
}

interface UseTwoHandedGestureResult {
  /** Current two-handed state */
  state: TwoHandedState | null;
  /** Whether two-handed manipulation is active */
  isActive: boolean;
  /** Current scale factor */
  scaleFactor: number;
  /** Current rotation delta */
  rotationDelta: number;
}

export function useTwoHandedGesture(
  options: UseTwoHandedGestureOptions
): UseTwoHandedGestureResult {
  const {
    enabled,
    initialWidth,
    initialHeight,
    onScaleChange,
    onRotationChange,
    onStart,
    onEnd,
  } = options;

  const { triggerPreset, triggerHaptic } = useXRHaptics();
  const { session } = useXR();

  const leftControllerState = useXRInputSourceState('controller', 'left');
  const rightControllerState = useXRInputSourceState('controller', 'right');

  const [twoHandState, setTwoHandState] = useState<TwoHandedState | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [rotationDelta, setRotationDelta] = useState(0);

  const lastScaleRef = useRef(1);
  const lastRotationRef = useRef(0);
  const activationDistanceRef = useRef(0);

  // Check if grip is pressed on controller
  const isGripPressed = useCallback((hand: 'left' | 'right'): boolean => {
    const state = hand === 'left' ? leftControllerState : rightControllerState;
    const gamepad = state?.inputSource?.gamepad;
    if (gamepad) {
      // Button 1 is typically grip/squeeze
      return gamepad.buttons[1]?.pressed ?? false;
    }
    return false;
  }, [leftControllerState, rightControllerState]);

  // Get controller world position
  const getControllerPosition = useCallback((hand: 'left' | 'right'): THREE.Vector3 | null => {
    const state = hand === 'left' ? leftControllerState : rightControllerState;
    if (!state?.object) return null;
    return state.object.getWorldPosition(new THREE.Vector3());
  }, [leftControllerState, rightControllerState]);

  // Check for hand tracking pinch (if available)
  const isHandPinching = useCallback((hand: 'left' | 'right'): boolean => {
    if (!session) return false;

    for (const inputSource of session.inputSources) {
      if (inputSource.handedness !== hand) continue;
      if (!inputSource.hand) continue;

      // Get thumb and index tip positions
      const thumbTip = inputSource.hand.get('thumb-tip');
      const indexTip = inputSource.hand.get('index-finger-tip');

      if (thumbTip && indexTip) {
        // This is a simplified check - in practice you'd get joint positions
        // For now, we rely on the transient-pointer events
        return false; // Fallback to controller-based detection
      }
    }
    return false;
  }, [session]);

  // Unified grip/pinch check
  const isGrabbing = useCallback((hand: 'left' | 'right'): boolean => {
    return isGripPressed(hand) || isHandPinching(hand);
  }, [isGripPressed, isHandPinching]);

  useFrame(() => {
    if (!enabled) return;

    const leftGrabbing = isGrabbing('left');
    const rightGrabbing = isGrabbing('right');
    const bothGrabbing = leftGrabbing && rightGrabbing;

    if (bothGrabbing) {
      const leftPos = getControllerPosition('left');
      const rightPos = getControllerPosition('right');

      if (leftPos && rightPos) {
        if (!twoHandState) {
          // Check activation threshold (hands must move 10cm before activating)
          const currentDistance = calculateDistance(leftPos, rightPos);

          if (activationDistanceRef.current === 0) {
            activationDistanceRef.current = currentDistance;
            return; // Wait for movement
          }

          const movement = Math.abs(currentDistance - activationDistanceRef.current);
          if (movement < HANDLE_CONSTANTS.ACTIVATION_THRESHOLD) {
            return; // Still in dead zone
          }

          // Start two-handed manipulation
          const initialDistance = currentDistance;
          const initialAngle = calculateAngleBetweenPoints(leftPos, rightPos);

          setTwoHandState({
            active: true,
            initialDistance,
            initialWidth,
            initialHeight,
            initialAngle,
            leftHandPos: leftPos.clone(),
            rightHandPos: rightPos.clone(),
          });

          triggerPreset('both', 'twoHandStart');
          onStart?.();
        } else {
          // Update two-handed manipulation
          const currentDistance = calculateDistance(leftPos, rightPos);
          const currentAngle = calculateAngleBetweenPoints(leftPos, rightPos);

          // Calculate scale factor
          const newScaleFactor = currentDistance / twoHandState.initialDistance;

          // Apply dead zone for scale
          const effectiveScale = Math.abs(newScaleFactor - 1) < HANDLE_CONSTANTS.SCALE_DEAD_ZONE
            ? 1
            : newScaleFactor;

          // Calculate rotation delta
          const newRotationDelta = currentAngle - twoHandState.initialAngle;

          // Only notify if changed significantly
          if (Math.abs(effectiveScale - lastScaleRef.current) > 0.01) {
            lastScaleRef.current = effectiveScale;
            setScaleFactor(effectiveScale);
            onScaleChange?.(effectiveScale);

            // Haptic feedback proportional to scale change
            const hapticIntensity = Math.min(0.3, Math.abs(effectiveScale - 1) * 0.5);
            triggerHaptic('both', hapticIntensity, 20);
          }

          if (Math.abs(newRotationDelta - lastRotationRef.current) > 0.01) {
            lastRotationRef.current = newRotationDelta;
            setRotationDelta(newRotationDelta);
            onRotationChange?.(newRotationDelta - rotationDelta);
          }
        }
      }
    } else if (twoHandState) {
      // End two-handed manipulation
      const finalScale = scaleFactor;
      const finalRotation = rotationDelta;

      setTwoHandState(null);
      setScaleFactor(1);
      setRotationDelta(0);
      lastScaleRef.current = 1;
      lastRotationRef.current = 0;
      activationDistanceRef.current = 0;

      triggerPreset('both', 'release');
      onEnd?.(finalScale, finalRotation);
    } else {
      // Reset activation distance when not grabbing
      activationDistanceRef.current = 0;
    }
  });

  return {
    state: twoHandState,
    isActive: !!twoHandState,
    scaleFactor,
    rotationDelta,
  };
}

export default useTwoHandedGesture;
