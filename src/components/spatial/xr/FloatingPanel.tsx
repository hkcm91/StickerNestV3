/**
 * StickerNest - Floating Panel Component
 *
 * A grabbable 3D panel that can be picked up and moved in VR/AR.
 * Similar to Meta Quest's floating menu system.
 *
 * Features:
 * - Grabbable with pinch gesture or controller grip
 * - Smooth physics-based follow when grabbed
 * - Lock to world space when released
 * - Optional billboard mode (always face user)
 * - Works with both hands and controllers
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR, useXRControllerState } from '@react-three/xr';
import { Group, Vector3, Quaternion, Euler, PlaneGeometry } from 'three';
import { Html } from '@react-three/drei';
import { useHandGestures, type HandSide } from './useHandGestures';

// ============================================================================
// Types
// ============================================================================

export interface FloatingPanelProps {
  /** Initial position in world space */
  position?: [number, number, number];
  /** Initial rotation (euler angles) */
  rotation?: [number, number, number];
  /** Panel width in meters */
  width?: number;
  /** Panel height in meters */
  height?: number;
  /** Background color */
  backgroundColor?: string;
  /** Border color when hovered/grabbed */
  accentColor?: string;
  /** Panel opacity */
  opacity?: number;
  /** Always face the user */
  billboard?: boolean;
  /** Lock position (can't be moved) */
  locked?: boolean;
  /** Spawn attached to hand initially */
  attachToHand?: HandSide;
  /** Distance from hand when attached */
  handOffset?: number;
  /** Called when panel is grabbed */
  onGrab?: () => void;
  /** Called when panel is released */
  onRelease?: (position: Vector3, rotation: Quaternion) => void;
  /** Children (HTML content via drei Html component) */
  children?: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const GRAB_DISTANCE = 0.15; // 15cm to grab panel
const FOLLOW_SPEED = 12;    // Smooth follow speed
const ROTATION_SPEED = 8;   // Smooth rotation speed

// ============================================================================
// Component
// ============================================================================

export function FloatingPanel({
  position = [0, 1.5, -0.5],
  rotation = [0, 0, 0],
  width = 0.4,
  height = 0.3,
  backgroundColor = 'rgba(20, 20, 30, 0.9)',
  accentColor = '#8b5cf6',
  opacity = 0.95,
  billboard = false,
  locked = false,
  attachToHand,
  handOffset = 0.15,
  onGrab,
  onRelease,
  children,
}: FloatingPanelProps) {
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();
  const { isPresenting } = useXR();

  // Gesture detection
  const gestures = useHandGestures();

  // Controllers for fallback
  const leftController = useXRControllerState('left');
  const rightController = useXRControllerState('right');

  // State
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [grabbedBy, setGrabbedBy] = useState<'left-hand' | 'right-hand' | 'left-controller' | 'right-controller' | null>(null);

  // Target position/rotation for smooth following
  const targetPosition = useRef(new Vector3(...position));
  const targetRotation = useRef(new Quaternion().setFromEuler(
    new Euler(...rotation)
  ));

  // Grab offset (where on the panel was grabbed)
  const grabOffset = useRef(new Vector3());

  // Initialize position
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...position);
    }
    targetPosition.current.set(...position);
  }, []);

  // Check if a point is within grab range of the panel
  const isInGrabRange = useCallback((point: Vector3): boolean => {
    if (!groupRef.current) return false;

    const panelPos = groupRef.current.position;
    const distance = point.distanceTo(panelPos);

    return distance < GRAB_DISTANCE + Math.max(width, height) / 2;
  }, [width, height]);

  // Handle grab start
  const handleGrabStart = useCallback((
    grabberType: 'left-hand' | 'right-hand' | 'left-controller' | 'right-controller',
    grabPosition: Vector3
  ) => {
    if (locked || isGrabbed) return;

    setIsGrabbed(true);
    setGrabbedBy(grabberType);

    // Calculate grab offset from panel center
    if (groupRef.current) {
      grabOffset.current.copy(groupRef.current.position).sub(grabPosition);
    }

    onGrab?.();
  }, [locked, isGrabbed, onGrab]);

  // Handle grab end
  const handleGrabEnd = useCallback(() => {
    if (!isGrabbed) return;

    setIsGrabbed(false);
    setGrabbedBy(null);

    if (groupRef.current) {
      onRelease?.(
        groupRef.current.position.clone(),
        groupRef.current.quaternion.clone()
      );
    }
  }, [isGrabbed, onRelease]);

  // Frame update for gesture detection and smooth following
  useFrame((state, delta) => {
    if (!groupRef.current || !isPresenting) return;

    const group = groupRef.current;

    // --- Gesture/Controller Detection ---

    // Check left hand pinch
    if (gestures.left.isTracking && gestures.left.isPinching) {
      const pinchPos = gestures.left.pinchPosition;

      if (!isGrabbed && isInGrabRange(pinchPos)) {
        handleGrabStart('left-hand', pinchPos);
      } else if (isGrabbed && grabbedBy === 'left-hand') {
        // Update target position
        targetPosition.current.copy(pinchPos).add(grabOffset.current);
        targetRotation.current.copy(gestures.left.palmRotation);
      }
    } else if (grabbedBy === 'left-hand') {
      handleGrabEnd();
    }

    // Check right hand pinch
    if (gestures.right.isTracking && gestures.right.isPinching) {
      const pinchPos = gestures.right.pinchPosition;

      if (!isGrabbed && isInGrabRange(pinchPos)) {
        handleGrabStart('right-hand', pinchPos);
      } else if (isGrabbed && grabbedBy === 'right-hand') {
        targetPosition.current.copy(pinchPos).add(grabOffset.current);
        targetRotation.current.copy(gestures.right.palmRotation);
      }
    } else if (grabbedBy === 'right-hand') {
      handleGrabEnd();
    }

    // Check controllers (fallback when no hand tracking)
    if (leftController?.gamepad) {
      const gamepad = leftController.gamepad;
      const squeezePressed = gamepad.buttons[1]?.pressed; // Grip button

      if (squeezePressed && leftController.object) {
        const controllerPos = leftController.object.position;

        if (!isGrabbed && isInGrabRange(controllerPos)) {
          handleGrabStart('left-controller', controllerPos);
        } else if (isGrabbed && grabbedBy === 'left-controller') {
          targetPosition.current.copy(controllerPos).add(grabOffset.current);
          targetRotation.current.copy(leftController.object.quaternion);
        }
      } else if (grabbedBy === 'left-controller') {
        handleGrabEnd();
      }
    }

    if (rightController?.gamepad) {
      const gamepad = rightController.gamepad;
      const squeezePressed = gamepad.buttons[1]?.pressed;

      if (squeezePressed && rightController.object) {
        const controllerPos = rightController.object.position;

        if (!isGrabbed && isInGrabRange(controllerPos)) {
          handleGrabStart('right-controller', controllerPos);
        } else if (isGrabbed && grabbedBy === 'right-controller') {
          targetPosition.current.copy(controllerPos).add(grabOffset.current);
          targetRotation.current.copy(rightController.object.quaternion);
        }
      } else if (grabbedBy === 'right-controller') {
        handleGrabEnd();
      }
    }

    // --- Attach to hand mode (like Quest menu spawning from palm) ---
    if (attachToHand && !isGrabbed) {
      const handState = attachToHand === 'left' ? gestures.left : gestures.right;

      if (handState.isTracking && handState.palmDirection === 'up') {
        // Position above palm
        const palmPos = handState.palmPosition;
        targetPosition.current.set(
          palmPos.x,
          palmPos.y + handOffset,
          palmPos.z
        );

        // Face the camera
        const toCamera = camera.position.clone().sub(palmPos).normalize();
        const angle = Math.atan2(toCamera.x, toCamera.z);
        targetRotation.current.setFromAxisAngle(new Vector3(0, 1, 0), angle);
      }
    }

    // --- Billboard mode ---
    if (billboard && !isGrabbed) {
      const toCamera = camera.position.clone().sub(group.position).normalize();
      const angle = Math.atan2(toCamera.x, toCamera.z);
      targetRotation.current.setFromAxisAngle(new Vector3(0, 1, 0), angle);
    }

    // --- Smooth position/rotation interpolation ---
    const lerpFactor = 1 - Math.exp(-FOLLOW_SPEED * delta);
    const rotLerpFactor = 1 - Math.exp(-ROTATION_SPEED * delta);

    group.position.lerp(targetPosition.current, isGrabbed ? lerpFactor : lerpFactor * 0.5);
    group.quaternion.slerp(targetRotation.current, rotLerpFactor);

    // --- Hover detection ---
    let newHovered = false;
    if (gestures.left.isTracking) {
      newHovered = newHovered || isInGrabRange(gestures.left.pinchPosition);
    }
    if (gestures.right.isTracking) {
      newHovered = newHovered || isInGrabRange(gestures.right.pinchPosition);
    }
    if (leftController?.object) {
      newHovered = newHovered || isInGrabRange(leftController.object.position);
    }
    if (rightController?.object) {
      newHovered = newHovered || isInGrabRange(rightController.object.position);
    }

    if (newHovered !== isHovered) {
      setIsHovered(newHovered);
    }
  });

  // Visual styling
  const borderColor = isGrabbed ? accentColor : isHovered ? `${accentColor}88` : 'rgba(255,255,255,0.2)';
  const borderWidth = isGrabbed ? 3 : isHovered ? 2 : 1;

  return (
    <group ref={groupRef}>
      {/* Panel background mesh */}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={backgroundColor}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>

      {/* Border */}
      <lineSegments>
        <edgesGeometry args={[new PlaneGeometry(width, height)]} />
        <lineBasicMaterial color={borderColor} linewidth={borderWidth} />
      </lineSegments>

      {/* Grab indicator dots at corners */}
      {!locked && (
        <>
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, y], i) => (
            <mesh
              key={i}
              position={[x * width * 0.45, y * height * 0.45, 0.001]}
            >
              <circleGeometry args={[0.008, 16]} />
              <meshBasicMaterial
                color={isGrabbed || isHovered ? accentColor : 'rgba(255,255,255,0.4)'}
                transparent
              />
            </mesh>
          ))}
        </>
      )}

      {/* HTML content */}
      <Html
        transform
        occlude
        distanceFactor={1}
        position={[0, 0, 0.001]}
        style={{
          width: `${width * 1000}px`,
          height: `${height * 1000}px`,
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}

export default FloatingPanel;
