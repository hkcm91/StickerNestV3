/**
 * StickerNest - XR Controller Debug Component
 *
 * Debug overlay that shows XR controller state and helps diagnose interaction issues.
 * Also provides fallback ray visualization if the default rays aren't showing.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR, useXRInputSourceState } from '@react-three/xr';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface XRControllerDebugProps {
  /** Show debug text overlay */
  showDebugText?: boolean;
  /** Show fallback rays if needed */
  showFallbackRays?: boolean;
  /** Ray color */
  rayColor?: string;
  /** Ray length in meters */
  rayLength?: number;
}

/**
 * Fallback ray visualization for a single controller
 * This also dispatches pointer events when the trigger is pressed
 */
function FallbackControllerRay({
  handedness,
  color,
  length,
}: {
  handedness: 'left' | 'right';
  color: string;
  length: number;
}) {
  const controllerState = useXRInputSourceState('controller', handedness);
  const { scene, gl } = useThree();
  const rayRef = useRef<THREE.Mesh>(null);
  const hitPointRef = useRef<THREE.Mesh>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const lastHitRef = useRef<THREE.Object3D | null>(null);
  const wasSelectingRef = useRef(false);

  // Check if trigger is pressed
  const isSelecting = useMemo(() => {
    if (!controllerState?.inputSource?.gamepad) return false;
    // Trigger is usually button 0
    return controllerState.inputSource.gamepad.buttons[0]?.pressed ?? false;
  }, [controllerState?.inputSource?.gamepad?.buttons]);

  useFrame((state) => {
    if (!rayRef.current || !controllerState?.object) return;

    // Get controller world position and direction
    const controllerMatrix = controllerState.object.matrixWorld;
    const position = new THREE.Vector3();
    const direction = new THREE.Vector3(0, 0, -1);

    position.setFromMatrixPosition(controllerMatrix);
    direction.transformDirection(controllerMatrix);

    // Position and orient the ray
    rayRef.current.position.copy(position);
    rayRef.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction
    );

    // Do a raycast
    raycaster.set(position, direction);
    raycaster.far = length;
    const intersects = raycaster.intersectObjects(scene.children, true);

    let hitObject: THREE.Object3D | null = null;
    let hitPoint: THREE.Vector3 | null = null;

    if (intersects.length > 0) {
      hitObject = intersects[0].object;
      hitPoint = intersects[0].point;
    }

    // Update hit point visualization
    if (hitPointRef.current) {
      if (hitPoint) {
        hitPointRef.current.visible = true;
        hitPointRef.current.position.copy(hitPoint);
      } else {
        hitPointRef.current.visible = false;
      }
    }

    // Dispatch pointer events
    const domElement = gl.domElement;

    // Handle pointer enter/leave
    if (hitObject !== lastHitRef.current) {
      if (lastHitRef.current) {
        // Dispatch pointerleave on old object
        const leaveEvent = new PointerEvent('pointerleave', { bubbles: true });
        (lastHitRef.current as any).__r3f?.handlers?.onPointerLeave?.(leaveEvent);
      }
      if (hitObject) {
        // Dispatch pointerenter on new object
        const enterEvent = new PointerEvent('pointerenter', { bubbles: true });
        (hitObject as any).__r3f?.handlers?.onPointerEnter?.(enterEvent);
      }
      lastHitRef.current = hitObject;
    }

    // Handle select (trigger press)
    if (isSelecting && !wasSelectingRef.current && hitObject) {
      // Trigger just pressed - dispatch pointerdown and click
      const downEvent = new PointerEvent('pointerdown', { bubbles: true });
      (hitObject as any).__r3f?.handlers?.onPointerDown?.(downEvent);
    } else if (!isSelecting && wasSelectingRef.current && hitObject) {
      // Trigger just released - dispatch pointerup and click
      const upEvent = new PointerEvent('pointerup', { bubbles: true });
      (hitObject as any).__r3f?.handlers?.onPointerUp?.(upEvent);

      const clickEvent = new MouseEvent('click', { bubbles: true });
      (hitObject as any).__r3f?.handlers?.onClick?.(clickEvent);
    }

    wasSelectingRef.current = isSelecting;
  });

  // Log when controller is detected
  useEffect(() => {
    if (controllerState) {
      console.log(`[XRControllerDebug] ${handedness} controller detected!`);
    }
  }, [controllerState, handedness]);

  if (!controllerState) {
    return null;
  }

  return (
    <group>
      {/* Ray beam - positioned at controller and pointing forward */}
      <mesh ref={rayRef}>
        <cylinderGeometry args={[0.003, 0.001, length, 8]} />
        <meshBasicMaterial
          color={isSelecting ? '#22c55e' : color}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Hit point indicator */}
      <mesh ref={hitPointRef}>
        <ringGeometry args={[0.01, 0.02, 32]} />
        <meshBasicMaterial
          color={isSelecting ? '#22c55e' : color}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Debug text showing XR state
 */
function XRDebugText() {
  const session = useXR((s) => s.session);
  const mode = useXR((s) => s.mode);
  const inputSourceStates = useXR((s) => s.inputSourceStates);
  const controller = useXR((s) => s.controller);
  const hand = useXR((s) => s.hand);

  const leftController = useXRInputSourceState('controller', 'left');
  const rightController = useXRInputSourceState('controller', 'right');
  const leftHand = useXRInputSourceState('hand', 'left');
  const rightHand = useXRInputSourceState('hand', 'right');

  const debugLines = useMemo(() => {
    const lines: string[] = [];
    lines.push(`Session: ${session ? 'Active' : 'None'}`);
    lines.push(`Mode: ${mode || 'N/A'}`);
    lines.push(`Input Sources: ${inputSourceStates?.length || 0}`);
    lines.push(`Controller Config: ${typeof controller}`);
    lines.push(`Hand Config: ${typeof hand}`);
    lines.push('---');
    lines.push(`Left Controller: ${leftController ? 'YES' : 'NO'}`);
    lines.push(`Right Controller: ${rightController ? 'YES' : 'NO'}`);
    lines.push(`Left Hand: ${leftHand ? 'YES' : 'NO'}`);
    lines.push(`Right Hand: ${rightHand ? 'YES' : 'NO'}`);

    // Log input source types
    if (inputSourceStates?.length > 0) {
      lines.push('---');
      inputSourceStates.forEach((state, i) => {
        lines.push(`[${i}] ${state.type} - ${state.inputSource?.handedness}`);
      });
    }

    return lines;
  }, [session, mode, inputSourceStates, controller, hand, leftController, rightController, leftHand, rightHand]);

  // Position the debug text in front of user
  return (
    <group position={[0, 1.6, -1]}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.4, 0.35]} />
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.9} />
      </mesh>
      <Text
        position={[0, 0.12, 0]}
        fontSize={0.02}
        color="#8b5cf6"
        anchorX="center"
        anchorY="top"
        font={undefined}
      >
        XR Debug
      </Text>
      {debugLines.map((line, i) => (
        <Text
          key={i}
          position={[0, 0.08 - i * 0.022, 0]}
          fontSize={0.015}
          color={line.includes('YES') ? '#22c55e' : line.includes('NO') ? '#ef4444' : '#ffffff'}
          anchorX="center"
          anchorY="top"
          font={undefined}
        >
          {line}
        </Text>
      ))}
    </group>
  );
}

/**
 * Main XR Controller Debug Component
 *
 * Add this to your scene to debug XR controller issues:
 * - Shows debug info about XR state
 * - Provides fallback ray visualization
 */
export function XRControllerDebug({
  showDebugText = true,
  showFallbackRays = true,
  rayColor = '#8b5cf6',
  rayLength = 5,
}: XRControllerDebugProps) {
  const session = useXR((s) => s.session);

  // Only render in XR mode
  if (!session) return null;

  return (
    <group>
      {showDebugText && <XRDebugText />}
      {showFallbackRays && (
        <>
          <FallbackControllerRay handedness="left" color={rayColor} length={rayLength} />
          <FallbackControllerRay handedness="right" color={rayColor} length={rayLength} />
        </>
      )}
    </group>
  );
}

export default XRControllerDebug;
