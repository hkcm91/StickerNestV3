/**
 * Widget 3D Handles - Two-Handed Gesture Hook
 *
 * Detects and manages two-handed manipulation (pinch-to-zoom)
 * for both controllers and hand tracking.
 *
 * Features:
 * - Controller grip detection
 * - Hand tracking pinch detection
 * - Dead zone to prevent accidental activation
 * - Live scale and rotation feedback
 * - Haptic feedback during manipulation
 */

import { useCallback, useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR, useXRInputSourceState } from '@react-three/xr';
import * as THREE from 'three';
import type { TwoHandedState } from '../types';
import { HANDLE_CONSTANTS } from '../types';
import { useXRHaptics } from './useXRHaptics';
import { calculateDistance, calculateAngleBetweenPoints } from '../utils/geometryUtils';

// Hand tracking constants
const PINCH_THRESHOLD = 0.025; // 2.5cm - thumb to index distance for pinch
const PINCH_HYSTERESIS = 0.01; // 1cm hysteresis to prevent flickering

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
  /** Input type being used */
  inputType: 'controllers' | 'hands' | 'mixed' | null;
}

interface HandState {
  isPinching: boolean;
  position: THREE.Vector3 | null;
  confidence: number;
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
  const [inputType, setInputType] = useState<'controllers' | 'hands' | 'mixed' | null>(null);

  const lastScaleRef = useRef(1);
  const lastRotationRef = useRef(0);
  const activationDistanceRef = useRef(0);
  const handStateRef = useRef<{ left: HandState; right: HandState }>({
    left: { isPinching: false, position: null, confidence: 0 },
    right: { isPinching: false, position: null, confidence: 0 },
  });

  // Temp vectors for calculations
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const thumbPos = useMemo(() => new THREE.Vector3(), []);
  const indexPos = useMemo(() => new THREE.Vector3(), []);

  // Check if grip is pressed on controller
  const isGripPressed = useCallback(
    (hand: 'left' | 'right'): boolean => {
      const state = hand === 'left' ? leftControllerState : rightControllerState;
      const gamepad = state?.inputSource?.gamepad;
      if (gamepad) {
        // Button 1 is typically grip/squeeze
        return gamepad.buttons[1]?.pressed ?? false;
      }
      return false;
    },
    [leftControllerState, rightControllerState]
  );

  // Get controller world position
  const getControllerPosition = useCallback(
    (hand: 'left' | 'right'): THREE.Vector3 | null => {
      const state = hand === 'left' ? leftControllerState : rightControllerState;
      if (!state?.object) return null;
      return state.object.getWorldPosition(tempVec.clone());
    },
    [leftControllerState, rightControllerState, tempVec]
  );

  // Get hand tracking state with proper joint detection
  const getHandState = useCallback(
    (handedness: 'left' | 'right', referenceSpace: XRReferenceSpace | null): HandState => {
      const defaultState: HandState = { isPinching: false, position: null, confidence: 0 };

      if (!session || !referenceSpace) return defaultState;

      // Find the hand input source
      for (const inputSource of session.inputSources) {
        if (inputSource.handedness !== handedness) continue;
        if (!inputSource.hand) continue;

        const hand = inputSource.hand;

        // Get joint positions for pinch detection
        const thumbTipJoint = hand.get('thumb-tip');
        const indexTipJoint = hand.get('index-finger-tip');

        if (!thumbTipJoint || !indexTipJoint) {
          return defaultState;
        }

        // We need a frame to get joint poses
        // This will be called within useFrame, so we can access the current frame
        // For now, use the hand's grip space as an approximation
        const gripSpace = inputSource.gripSpace;
        if (!gripSpace) return defaultState;

        // Get wrist position as the hand position
        const wristJoint = hand.get('wrist');
        if (wristJoint) {
          // In a real implementation, we'd use frame.getJointPose
          // For now, we estimate based on grip space
        }

        // Check if we have valid joint tracking
        // The actual pinch detection happens in the XR frame callback
        return {
          isPinching: handStateRef.current[handedness].isPinching,
          position: handStateRef.current[handedness].position,
          confidence: 1,
        };
      }

      return defaultState;
    },
    [session]
  );

  // Unified input detection - combines controllers and hand tracking
  const getInputState = useCallback(
    (
      hand: 'left' | 'right'
    ): { isGrabbing: boolean; position: THREE.Vector3 | null; type: 'controller' | 'hand' } => {
      // First check controllers (higher priority - more reliable)
      if (isGripPressed(hand)) {
        return {
          isGrabbing: true,
          position: getControllerPosition(hand),
          type: 'controller',
        };
      }

      // Fall back to hand tracking
      const handState = handStateRef.current[hand];
      if (handState.isPinching && handState.position) {
        return {
          isGrabbing: true,
          position: handState.position,
          type: 'hand',
        };
      }

      return {
        isGrabbing: false,
        position: null,
        type: 'controller',
      };
    },
    [isGripPressed, getControllerPosition]
  );

  // Update hand tracking state from XR frame
  const updateHandTracking = useCallback(
    (frame: XRFrame, referenceSpace: XRReferenceSpace) => {
      if (!session) return;

      for (const inputSource of session.inputSources) {
        if (!inputSource.hand) continue;

        const handedness = inputSource.handedness as 'left' | 'right';
        if (handedness !== 'left' && handedness !== 'right') continue;

        const hand = inputSource.hand;
        const thumbTipJoint = hand.get('thumb-tip');
        const indexTipJoint = hand.get('index-finger-tip');
        const wristJoint = hand.get('wrist');

        if (!thumbTipJoint || !indexTipJoint) continue;

        try {
          const thumbPose = frame.getJointPose(thumbTipJoint, referenceSpace);
          const indexPose = frame.getJointPose(indexTipJoint, referenceSpace);
          const wristPose = wristJoint ? frame.getJointPose(wristJoint, referenceSpace) : null;

          if (thumbPose && indexPose) {
            thumbPos.set(
              thumbPose.transform.position.x,
              thumbPose.transform.position.y,
              thumbPose.transform.position.z
            );
            indexPos.set(
              indexPose.transform.position.x,
              indexPose.transform.position.y,
              indexPose.transform.position.z
            );

            const distance = thumbPos.distanceTo(indexPos);
            const wasPinching = handStateRef.current[handedness].isPinching;

            // Apply hysteresis to prevent flickering
            const isPinching = wasPinching
              ? distance < PINCH_THRESHOLD + PINCH_HYSTERESIS
              : distance < PINCH_THRESHOLD;

            // Use wrist position or midpoint between thumb and index
            const position = wristPose
              ? new THREE.Vector3(
                  wristPose.transform.position.x,
                  wristPose.transform.position.y,
                  wristPose.transform.position.z
                )
              : thumbPos.clone().add(indexPos).multiplyScalar(0.5);

            handStateRef.current[handedness] = {
              isPinching,
              position,
              confidence: 1,
            };
          }
        } catch {
          // Joint pose not available
        }
      }
    },
    [session, thumbPos, indexPos]
  );

  useFrame((state, delta, xrFrame) => {
    if (!enabled) return;

    // Update hand tracking if XR frame is available
    const frame = xrFrame as XRFrame | undefined;
    const referenceSpace = state.gl.xr.getReferenceSpace();
    if (frame && referenceSpace) {
      updateHandTracking(frame, referenceSpace);
    }

    const leftInput = getInputState('left');
    const rightInput = getInputState('right');
    const bothGrabbing = leftInput.isGrabbing && rightInput.isGrabbing;

    if (bothGrabbing && leftInput.position && rightInput.position) {
      const leftPos = leftInput.position;
      const rightPos = rightInput.position;

      // Determine input type
      const newInputType =
        leftInput.type === rightInput.type
          ? (leftInput.type === 'controller' ? 'controllers' : 'hands')
          : 'mixed';

      if (!twoHandState) {
        // Check activation threshold (hands must move before activating)
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

        setInputType(newInputType);
        triggerPreset('both', 'twoHandStart');
        onStart?.();
      } else {
        // Update two-handed manipulation
        const currentDistance = calculateDistance(leftPos, rightPos);
        const currentAngle = calculateAngleBetweenPoints(leftPos, rightPos);

        // Calculate scale factor
        const newScaleFactor = currentDistance / twoHandState.initialDistance;

        // Apply dead zone for scale
        const effectiveScale =
          Math.abs(newScaleFactor - 1) < HANDLE_CONSTANTS.SCALE_DEAD_ZONE ? 1 : newScaleFactor;

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
          const rotDelta = newRotationDelta - lastRotationRef.current;
          lastRotationRef.current = newRotationDelta;
          setRotationDelta(newRotationDelta);
          onRotationChange?.(rotDelta);
        }

        setInputType(newInputType);
      }
    } else if (twoHandState) {
      // End two-handed manipulation
      const finalScale = scaleFactor;
      const finalRotation = rotationDelta;

      setTwoHandState(null);
      setScaleFactor(1);
      setRotationDelta(0);
      setInputType(null);
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
    inputType,
  };
}

export default useTwoHandedGesture;
