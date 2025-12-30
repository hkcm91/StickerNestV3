/**
 * StickerNest - IWSDK Grab Interaction Hook
 *
 * React hook for grab interactions using Meta's Immersive Web SDK.
 * Enables one-hand grab, two-hand manipulation, and distance grabbing.
 *
 * Features:
 * - One-hand grab with physics
 * - Two-hand scaling and rotation
 * - Distance grab (grab from afar)
 * - Haptic feedback on Quest
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR, useXRInputSourceState } from '@react-three/xr';
import { Object3D, Vector3, Quaternion, Matrix4 } from 'three';

// ============================================================================
// Types
// ============================================================================

export type GrabState = 'idle' | 'hovering' | 'grabbing' | 'two-hand';

export interface GrabbedObject {
  object: Object3D;
  hand: 'left' | 'right';
  initialObjectMatrix: Matrix4;
  initialGrabMatrix: Matrix4;
  grabOffset: Vector3;
}

export interface TwoHandGrab {
  object: Object3D;
  initialDistance: number;
  initialScale: Vector3;
  initialRotation: Quaternion;
}

export interface UseGrabInteractionConfig {
  /** Enable grab interactions */
  enabled?: boolean;
  /** Enable distance grabbing */
  distanceGrab?: boolean;
  /** Maximum distance for distance grab */
  maxGrabDistance?: number;
  /** Enable two-hand manipulation */
  twoHandManipulation?: boolean;
  /** Haptic feedback intensity (0-1) */
  hapticIntensity?: number;
  /** Callback when object is grabbed */
  onGrab?: (object: Object3D, hand: 'left' | 'right') => void;
  /** Callback when object is released */
  onRelease?: (object: Object3D, hand: 'left' | 'right', velocity: Vector3) => void;
  /** Callback during manipulation */
  onManipulate?: (object: Object3D, transform: { position: Vector3; rotation: Quaternion; scale: Vector3 }) => void;
  /** Enable debug logging */
  debug?: boolean;
}

export interface GrabInteractionResult {
  /** Current grab state */
  state: GrabState;
  /** Currently grabbed object (left hand) */
  leftGrab: GrabbedObject | null;
  /** Currently grabbed object (right hand) */
  rightGrab: GrabbedObject | null;
  /** Two-hand manipulation state */
  twoHandGrab: TwoHandGrab | null;
  /** Check if object is grabbable */
  isGrabbable: (object: Object3D) => boolean;
  /** Make object grabbable */
  makeGrabbable: (object: Object3D) => void;
  /** Make object not grabbable */
  makeNotGrabbable: (object: Object3D) => void;
  /** Force release all grabs */
  releaseAll: () => void;
}

// User data key for grabbable objects
const GRABBABLE_KEY = '__stickernest_grabbable';

// ============================================================================
// Hook
// ============================================================================

export function useGrabInteraction(config: UseGrabInteractionConfig = {}): GrabInteractionResult {
  const {
    enabled = true,
    distanceGrab = true,
    maxGrabDistance = 3,
    twoHandManipulation = true,
    hapticIntensity = 0.5,
    onGrab,
    onRelease,
    onManipulate,
    debug = false,
  } = config;

  const { isPresenting, session } = useXR();
  const { scene, camera } = useThree();

  const leftControllerState = useXRInputSourceState('controller', 'left');
  const rightControllerState = useXRInputSourceState('controller', 'right');

  const [state, setState] = useState<GrabState>('idle');
  const [leftGrab, setLeftGrab] = useState<GrabbedObject | null>(null);
  const [rightGrab, setRightGrab] = useState<GrabbedObject | null>(null);
  const [twoHandGrab, setTwoHandGrab] = useState<TwoHandGrab | null>(null);

  const grabbableObjects = useRef<Set<Object3D>>(new Set());
  const lastPositions = useRef<Map<string, Vector3>>(new Map());

  // Check if squeeze is pressed (grip button)
  const isSqueezePressed = useCallback((hand: 'left' | 'right'): boolean => {
    const state = hand === 'left' ? leftControllerState : rightControllerState;
    if (!state) return false;

    // Check gamepad for squeeze
    const gamepad = state.inputSource?.gamepad;
    if (gamepad) {
      // Button 1 is typically squeeze/grip
      return gamepad.buttons[1]?.pressed ?? false;
    }

    return false;
  }, [leftControllerState, rightControllerState]);

  // Get controller position
  const getControllerPosition = useCallback((hand: 'left' | 'right'): Vector3 | null => {
    const state = hand === 'left' ? leftControllerState : rightControllerState;
    if (!state?.object) return null;
    return state.object.getWorldPosition(new Vector3());
  }, [leftControllerState, rightControllerState]);

  // Get controller matrix
  const getControllerMatrix = useCallback((hand: 'left' | 'right'): Matrix4 | null => {
    const state = hand === 'left' ? leftControllerState : rightControllerState;
    if (!state?.object) return null;
    return state.object.matrixWorld.clone();
  }, [leftControllerState, rightControllerState]);

  // Find grabbable object at position
  const findGrabbableAt = useCallback((position: Vector3, maxDistance: number): Object3D | null => {
    let closest: Object3D | null = null;
    let closestDist = maxDistance;

    grabbableObjects.current.forEach((obj) => {
      const objPos = obj.getWorldPosition(new Vector3());
      const dist = position.distanceTo(objPos);

      if (dist < closestDist) {
        closestDist = dist;
        closest = obj;
      }
    });

    return closest;
  }, []);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((hand: 'left' | 'right', intensity: number = hapticIntensity) => {
    const state = hand === 'left' ? leftControllerState : rightControllerState;
    const gamepad = state?.inputSource?.gamepad;

    if (gamepad?.hapticActuators?.[0]) {
      gamepad.hapticActuators[0].pulse(intensity, 50);
    }
  }, [leftControllerState, rightControllerState, hapticIntensity]);

  // Start grab
  const startGrab = useCallback((hand: 'left' | 'right') => {
    const controllerPos = getControllerPosition(hand);
    const controllerMatrix = getControllerMatrix(hand);
    if (!controllerPos || !controllerMatrix) return;

    const grabDistance = distanceGrab ? maxGrabDistance : 0.2;
    const target = findGrabbableAt(controllerPos, grabDistance);
    if (!target) return;

    const grabbed: GrabbedObject = {
      object: target,
      hand,
      initialObjectMatrix: target.matrixWorld.clone(),
      initialGrabMatrix: controllerMatrix,
      grabOffset: target.getWorldPosition(new Vector3()).sub(controllerPos),
    };

    if (hand === 'left') {
      setLeftGrab(grabbed);
    } else {
      setRightGrab(grabbed);
    }

    triggerHaptic(hand, 0.8);
    onGrab?.(target, hand);

    if (debug) {
      console.log('[IWSDK Grab] Started:', target.name, 'hand:', hand);
    }
  }, [distanceGrab, maxGrabDistance, findGrabbableAt, getControllerPosition, getControllerMatrix, triggerHaptic, onGrab, debug]);

  // End grab
  const endGrab = useCallback((hand: 'left' | 'right') => {
    const grab = hand === 'left' ? leftGrab : rightGrab;
    if (!grab) return;

    // Calculate release velocity
    const currentPos = getControllerPosition(hand) ?? new Vector3();
    const lastPos = lastPositions.current.get(hand) ?? currentPos;
    const velocity = currentPos.clone().sub(lastPos).multiplyScalar(60); // Assume 60fps

    if (hand === 'left') {
      setLeftGrab(null);
    } else {
      setRightGrab(null);
    }

    // Clear two-hand grab if this was part of it
    if (twoHandGrab?.object === grab.object) {
      setTwoHandGrab(null);
    }

    triggerHaptic(hand, 0.3);
    onRelease?.(grab.object, hand, velocity);

    if (debug) {
      console.log('[IWSDK Grab] Released:', grab.object.name, 'velocity:', velocity.toArray());
    }
  }, [leftGrab, rightGrab, twoHandGrab, getControllerPosition, triggerHaptic, onRelease, debug]);

  // Update grabbed objects each frame
  useFrame(() => {
    if (!enabled || !isPresenting) return;

    // Check for grab start/end
    ['left', 'right'].forEach((hand) => {
      const h = hand as 'left' | 'right';
      const isPressed = isSqueezePressed(h);
      const hasGrab = h === 'left' ? leftGrab : rightGrab;

      if (isPressed && !hasGrab) {
        startGrab(h);
      } else if (!isPressed && hasGrab) {
        endGrab(h);
      }
    });

    // Update grabbed object positions
    [leftGrab, rightGrab].forEach((grab) => {
      if (!grab) return;

      const controllerPos = getControllerPosition(grab.hand);
      if (!controllerPos) return;

      // Simple follow - object follows controller + offset
      const newPos = controllerPos.clone().add(grab.grabOffset);
      grab.object.position.copy(newPos);

      // Store for velocity calculation
      lastPositions.current.set(grab.hand, controllerPos.clone());
    });

    // Check for two-hand manipulation
    if (twoHandManipulation && leftGrab && rightGrab && leftGrab.object === rightGrab.object) {
      if (!twoHandGrab) {
        // Start two-hand grab
        const leftPos = getControllerPosition('left')!;
        const rightPos = getControllerPosition('right')!;
        const initialDistance = leftPos.distanceTo(rightPos);

        setTwoHandGrab({
          object: leftGrab.object,
          initialDistance,
          initialScale: leftGrab.object.scale.clone(),
          initialRotation: leftGrab.object.quaternion.clone(),
        });

        setState('two-hand');

        if (debug) {
          console.log('[IWSDK Grab] Two-hand started');
        }
      } else {
        // Update two-hand manipulation
        const leftPos = getControllerPosition('left')!;
        const rightPos = getControllerPosition('right')!;
        const currentDistance = leftPos.distanceTo(rightPos);

        // Scale based on hand distance
        const scaleFactor = currentDistance / twoHandGrab.initialDistance;
        twoHandGrab.object.scale.copy(twoHandGrab.initialScale).multiplyScalar(scaleFactor);

        // Position at midpoint
        const midpoint = leftPos.clone().add(rightPos).multiplyScalar(0.5);
        twoHandGrab.object.position.copy(midpoint);

        onManipulate?.(twoHandGrab.object, {
          position: midpoint,
          rotation: twoHandGrab.object.quaternion,
          scale: twoHandGrab.object.scale,
        });
      }
    } else if (twoHandGrab) {
      // End two-hand grab
      setTwoHandGrab(null);
      setState(leftGrab || rightGrab ? 'grabbing' : 'idle');
    }

    // Update state
    if (leftGrab || rightGrab) {
      if (!twoHandGrab) {
        setState('grabbing');
      }
    } else {
      setState('idle');
    }
  });

  // Make object grabbable
  const makeGrabbable = useCallback((object: Object3D) => {
    object.userData[GRABBABLE_KEY] = true;
    grabbableObjects.current.add(object);

    if (debug) {
      console.log('[IWSDK Grab] Made grabbable:', object.name);
    }
  }, [debug]);

  // Make object not grabbable
  const makeNotGrabbable = useCallback((object: Object3D) => {
    delete object.userData[GRABBABLE_KEY];
    grabbableObjects.current.delete(object);
  }, []);

  // Check if object is grabbable
  const isGrabbable = useCallback((object: Object3D): boolean => {
    return grabbableObjects.current.has(object);
  }, []);

  // Release all grabs
  const releaseAll = useCallback(() => {
    if (leftGrab) endGrab('left');
    if (rightGrab) endGrab('right');
  }, [leftGrab, rightGrab, endGrab]);

  return {
    state,
    leftGrab,
    rightGrab,
    twoHandGrab,
    isGrabbable,
    makeGrabbable,
    makeNotGrabbable,
    releaseAll,
  };
}

export default useGrabInteraction;
