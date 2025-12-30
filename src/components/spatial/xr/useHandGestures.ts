/**
 * StickerNest - Hand Gesture Detection Hook
 *
 * Device-agnostic gesture detection using WebXR Hand Input API.
 * Detects pinch, grab, point gestures for both hands.
 * Works with Meta Quest, Pico, and other WebXR-compatible devices.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { Vector3, Quaternion } from 'three';

// ============================================================================
// Types
// ============================================================================

export type HandSide = 'left' | 'right';

export interface GestureState {
  /** Is hand currently tracked */
  isTracking: boolean;
  /** Pinch gesture (thumb + index finger) */
  isPinching: boolean;
  /** Pinch strength 0-1 */
  pinchStrength: number;
  /** Grab gesture (all fingers curled) */
  isGrabbing: boolean;
  /** Grab strength 0-1 */
  grabStrength: number;
  /** Pointing gesture (index extended) */
  isPointing: boolean;
  /** Palm facing direction */
  palmDirection: 'up' | 'down' | 'forward' | 'side';
  /** Position of pinch point (between thumb and index) */
  pinchPosition: Vector3;
  /** Wrist position */
  wristPosition: Vector3;
  /** Palm position (center of hand) */
  palmPosition: Vector3;
  /** Palm rotation */
  palmRotation: Quaternion;
}

export interface HandGesturesResult {
  left: GestureState;
  right: GestureState;
  /** Either hand is pinching */
  anyPinching: boolean;
  /** Either hand is grabbing */
  anyGrabbing: boolean;
  /** Get the active pinching hand */
  activePinchHand: HandSide | null;
  /** Get the active grabbing hand */
  activeGrabHand: HandSide | null;
}

// ============================================================================
// Constants
// ============================================================================

// Pinch detection thresholds (in meters)
const PINCH_START_DISTANCE = 0.02; // 2cm to start pinch
const PINCH_END_DISTANCE = 0.04;   // 4cm to end pinch (hysteresis)

// Grab detection thresholds
const GRAB_CURL_THRESHOLD = 0.7;   // Finger curl amount for grab

// Joint indices for WebXR hand tracking
const JOINT = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 9,
  INDEX_METACARPAL: 5,
  MIDDLE_TIP: 14,
  MIDDLE_METACARPAL: 10,
  RING_TIP: 19,
  RING_METACARPAL: 15,
  PINKY_TIP: 24,
  PINKY_METACARPAL: 20,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

function createDefaultGestureState(): GestureState {
  return {
    isTracking: false,
    isPinching: false,
    pinchStrength: 0,
    isGrabbing: false,
    grabStrength: 0,
    isPointing: false,
    palmDirection: 'forward',
    pinchPosition: new Vector3(),
    wristPosition: new Vector3(),
    palmPosition: new Vector3(),
    palmRotation: new Quaternion(),
  };
}

function getJointPosition(
  hand: XRHand,
  jointIndex: number,
  frame: XRFrame,
  referenceSpace: XRReferenceSpace
): Vector3 | null {
  const joints = Array.from(hand.values());
  const joint = joints[jointIndex];
  if (!joint) return null;

  const pose = frame.getJointPose?.(joint, referenceSpace);
  if (!pose) return null;

  return new Vector3(
    pose.transform.position.x,
    pose.transform.position.y,
    pose.transform.position.z
  );
}

function getJointRadius(
  hand: XRHand,
  jointIndex: number,
  frame: XRFrame,
  referenceSpace: XRReferenceSpace
): number {
  const joints = Array.from(hand.values());
  const joint = joints[jointIndex];
  if (!joint) return 0;

  const pose = frame.getJointPose?.(joint, referenceSpace);
  return pose?.radius ?? 0;
}

function calculateFingerCurl(
  hand: XRHand,
  tipIndex: number,
  metacarpalIndex: number,
  frame: XRFrame,
  referenceSpace: XRReferenceSpace,
  wristPos: Vector3
): number {
  const tip = getJointPosition(hand, tipIndex, frame, referenceSpace);
  const metacarpal = getJointPosition(hand, metacarpalIndex, frame, referenceSpace);

  if (!tip || !metacarpal) return 0;

  // Calculate how much the fingertip is curled toward the wrist
  const tipToWrist = tip.distanceTo(wristPos);
  const metacarpalToWrist = metacarpal.distanceTo(wristPos);

  // If tip is closer to wrist than metacarpal, finger is curled
  const curl = 1 - Math.min(1, tipToWrist / metacarpalToWrist);
  return Math.max(0, Math.min(1, curl));
}

function detectPalmDirection(palmNormal: Vector3): 'up' | 'down' | 'forward' | 'side' {
  const absX = Math.abs(palmNormal.x);
  const absY = Math.abs(palmNormal.y);
  const absZ = Math.abs(palmNormal.z);

  if (absY > absX && absY > absZ) {
    return palmNormal.y > 0 ? 'up' : 'down';
  }
  if (absZ > absX) {
    return 'forward';
  }
  return 'side';
}

// ============================================================================
// Main Hook
// ============================================================================

export function useHandGestures(): HandGesturesResult {
  const { session } = useXR();
  const [leftState, setLeftState] = useState<GestureState>(createDefaultGestureState);
  const [rightState, setRightState] = useState<GestureState>(createDefaultGestureState);

  // Track previous pinch state for hysteresis
  const prevPinchRef = useRef({ left: false, right: false });

  // Reusable vectors to avoid GC
  const tempVec1 = useRef(new Vector3());
  const tempVec2 = useRef(new Vector3());

  useFrame((state, delta, frame: XRFrame | undefined) => {
    if (!frame || !session) {
      // Reset states when not in XR
      if (leftState.isTracking || rightState.isTracking) {
        setLeftState(createDefaultGestureState());
        setRightState(createDefaultGestureState());
      }
      return;
    }

    const referenceSpace = state.gl.xr.getReferenceSpace();
    if (!referenceSpace) return;

    // Process each input source
    for (const inputSource of session.inputSources) {
      if (!inputSource.hand) continue;

      const hand = inputSource.hand;
      const isLeft = inputSource.handedness === 'left';

      // Get key joint positions
      const wristPos = getJointPosition(hand, JOINT.WRIST, frame, referenceSpace);
      const thumbTip = getJointPosition(hand, JOINT.THUMB_TIP, frame, referenceSpace);
      const indexTip = getJointPosition(hand, JOINT.INDEX_TIP, frame, referenceSpace);
      const middleTip = getJointPosition(hand, JOINT.MIDDLE_TIP, frame, referenceSpace);

      if (!wristPos || !thumbTip || !indexTip) continue;

      // Calculate pinch distance
      const pinchDistance = thumbTip.distanceTo(indexTip);
      const prevPinching = isLeft ? prevPinchRef.current.left : prevPinchRef.current.right;

      // Hysteresis for pinch detection
      let isPinching = prevPinching
        ? pinchDistance < PINCH_END_DISTANCE
        : pinchDistance < PINCH_START_DISTANCE;

      const pinchStrength = 1 - Math.min(1, pinchDistance / PINCH_END_DISTANCE);

      // Update prev pinch ref
      if (isLeft) {
        prevPinchRef.current.left = isPinching;
      } else {
        prevPinchRef.current.right = isPinching;
      }

      // Calculate pinch position (midpoint between thumb and index)
      const pinchPosition = tempVec1.current
        .copy(thumbTip)
        .add(indexTip)
        .multiplyScalar(0.5);

      // Calculate grab gesture (all fingers curled)
      const indexCurl = calculateFingerCurl(
        hand, JOINT.INDEX_TIP, JOINT.INDEX_METACARPAL,
        frame, referenceSpace, wristPos
      );
      const middleCurl = calculateFingerCurl(
        hand, JOINT.MIDDLE_TIP, JOINT.MIDDLE_METACARPAL,
        frame, referenceSpace, wristPos
      );
      const ringCurl = calculateFingerCurl(
        hand, JOINT.RING_TIP, JOINT.RING_METACARPAL,
        frame, referenceSpace, wristPos
      );
      const pinkyCurl = calculateFingerCurl(
        hand, JOINT.PINKY_TIP, JOINT.PINKY_METACARPAL,
        frame, referenceSpace, wristPos
      );

      const avgCurl = (indexCurl + middleCurl + ringCurl + pinkyCurl) / 4;
      const isGrabbing = avgCurl > GRAB_CURL_THRESHOLD;
      const grabStrength = avgCurl;

      // Detect pointing (index extended, others curled)
      const isPointing = indexCurl < 0.3 && middleCurl > 0.5 && ringCurl > 0.5;

      // Calculate palm position (between wrist and middle fingertip)
      const palmPosition = tempVec2.current
        .copy(wristPos)
        .add(middleTip || indexTip)
        .multiplyScalar(0.5);

      // Get palm rotation from wrist joint
      const joints = Array.from(hand.values());
      const wristJoint = joints[JOINT.WRIST];
      const wristPose = wristJoint ? frame.getJointPose?.(wristJoint, referenceSpace) : null;

      const palmRotation = new Quaternion();
      let palmDirection: 'up' | 'down' | 'forward' | 'side' = 'forward';

      if (wristPose) {
        palmRotation.set(
          wristPose.transform.orientation.x,
          wristPose.transform.orientation.y,
          wristPose.transform.orientation.z,
          wristPose.transform.orientation.w
        );

        // Calculate palm normal for direction
        const palmNormal = new Vector3(0, -1, 0).applyQuaternion(palmRotation);
        palmDirection = detectPalmDirection(palmNormal);
      }

      // Update state
      const newState: GestureState = {
        isTracking: true,
        isPinching,
        pinchStrength,
        isGrabbing,
        grabStrength,
        isPointing,
        palmDirection,
        pinchPosition: pinchPosition.clone(),
        wristPosition: wristPos.clone(),
        palmPosition: palmPosition.clone(),
        palmRotation: palmRotation.clone(),
      };

      if (isLeft) {
        setLeftState(newState);
      } else {
        setRightState(newState);
      }
    }
  });

  // Computed values
  const anyPinching = leftState.isPinching || rightState.isPinching;
  const anyGrabbing = leftState.isGrabbing || rightState.isGrabbing;

  const activePinchHand: HandSide | null = leftState.isPinching
    ? 'left'
    : rightState.isPinching
    ? 'right'
    : null;

  const activeGrabHand: HandSide | null = leftState.isGrabbing
    ? 'left'
    : rightState.isGrabbing
    ? 'right'
    : null;

  return {
    left: leftState,
    right: rightState,
    anyPinching,
    anyGrabbing,
    activePinchHand,
    activeGrabHand,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/** Hook for just pinch detection on a specific hand */
export function usePinchGesture(hand: HandSide = 'right') {
  const gestures = useHandGestures();
  const state = hand === 'left' ? gestures.left : gestures.right;

  return {
    isPinching: state.isPinching,
    pinchStrength: state.pinchStrength,
    pinchPosition: state.pinchPosition,
    isTracking: state.isTracking,
  };
}

/** Hook for detecting if user is making a "menu" gesture (palm up) */
export function useMenuGesture(hand: HandSide = 'left') {
  const gestures = useHandGestures();
  const state = hand === 'left' ? gestures.left : gestures.right;

  // Menu gesture: palm facing up, hand relatively flat
  const isMenuGesture = state.isTracking &&
    state.palmDirection === 'up' &&
    !state.isGrabbing &&
    !state.isPinching;

  return {
    isMenuGesture,
    palmPosition: state.palmPosition,
    palmRotation: state.palmRotation,
    isTracking: state.isTracking,
  };
}

export default useHandGestures;
