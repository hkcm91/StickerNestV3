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
import { vrLog } from './VRDebugPanel';

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
 * Find R3F handlers on an object or its ancestors
 * R3F attaches handlers to __r3f.handlers on the mesh or parent groups
 */
function findR3FHandlers(object: THREE.Object3D | null): Record<string, Function> | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const r3f = (current as any).__r3f;
    if (r3f?.handlers && Object.keys(r3f.handlers).length > 0) {
      return r3f.handlers;
    }
    // Also check for eventObject pattern used by some R3F versions
    if (r3f?.eventCount > 0 && r3f?.handlers) {
      return r3f.handlers;
    }
    current = current.parent;
  }
  return null;
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
  const lastHandlersRef = useRef<Record<string, Function> | null>(null);
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

    // Filter intersections to find objects with actual R3F event handlers
    // This prevents hitting texture overlays or non-interactive meshes
    const interactiveIntersect = intersects.find((intersection) => {
      const obj = intersection.object as any;
      const handlers = obj.__r3f?.handlers;
      // Check if object has any actual event handlers
      if (handlers && Object.keys(handlers).length > 0) {
        return true;
      }
      // Also accept objects with widget-interactive name pattern
      if (obj.name?.startsWith('widget-interactive-')) {
        return true;
      }
      return false;
    });

    if (interactiveIntersect) {
      hitObject = interactiveIntersect.object;
      hitPoint = interactiveIntersect.point;
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

    // Create R3F-compatible event object with required properties
    const createR3FEvent = (type: string, intersection: THREE.Intersection | null) => ({
      stopPropagation: () => {},
      point: intersection?.point || hitPoint || new THREE.Vector3(),
      distance: intersection?.distance || 0,
      object: hitObject,
      eventObject: hitObject,
      nativeEvent: new PointerEvent(type, { bubbles: true }),
      intersections: intersects,
      unprojectedPoint: new THREE.Vector3(),
      ray: raycaster.ray,
      camera: state.camera,
      delta: 0,
    });

    const intersection = interactiveIntersect || null;

    // Find handlers for the hit object (searches ancestors too)
    const handlers = hitObject ? findR3FHandlers(hitObject) : null;

    // Handle pointer enter/leave
    if (hitObject !== lastHitRef.current) {
      // Dispatch pointerleave on old object
      if (lastHitRef.current && lastHandlersRef.current) {
        const leaveEvent = createR3FEvent('pointerleave', null);
        lastHandlersRef.current.onPointerLeave?.(leaveEvent);
        vrLog(`[XR] Pointer leave: ${lastHitRef.current.name || 'unnamed'}`);
      }
      // Dispatch pointerenter on new object
      if (hitObject && handlers) {
        const enterEvent = createR3FEvent('pointerenter', intersection);
        handlers.onPointerEnter?.(enterEvent);
        vrLog(`[XR] Pointer enter: ${hitObject.name || 'unnamed'} (handlers: ${Object.keys(handlers).join(', ')})`);
      } else if (hitObject) {
        vrLog(`[XR] Pointer enter: ${hitObject.name || 'unnamed'} (NO HANDLERS FOUND)`);
      }
      lastHitRef.current = hitObject;
      lastHandlersRef.current = handlers;
    }

    // Handle select (trigger press)
    if (isSelecting && !wasSelectingRef.current && hitObject && handlers) {
      // Trigger just pressed - dispatch pointerdown
      const downEvent = createR3FEvent('pointerdown', intersection);
      handlers.onPointerDown?.(downEvent);
      vrLog(`[XR] Pointer down: ${hitObject.name || 'unnamed'}`);
    } else if (!isSelecting && wasSelectingRef.current && hitObject && handlers) {
      // Trigger just released - dispatch pointerup and click
      const upEvent = createR3FEvent('pointerup', intersection);
      handlers.onPointerUp?.(upEvent);

      const clickEvent = createR3FEvent('click', intersection);
      if (handlers.onClick) {
        handlers.onClick(clickEvent);
        vrLog(`[XR] CLICK SUCCESS: ${hitObject.name || 'unnamed'}`);
      } else {
        vrLog(`[XR] CLICK (no onClick handler): ${hitObject.name || 'unnamed'}`);
      }
    } else if (!isSelecting && wasSelectingRef.current && hitObject && !handlers) {
      vrLog(`[XR] CLICK FAILED - no handlers found for: ${hitObject.name || 'unnamed'}`);
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
