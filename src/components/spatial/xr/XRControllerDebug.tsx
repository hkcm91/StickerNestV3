/**
 * StickerNest - XR Controller Debug Component
 *
 * Debug overlay that shows XR controller state and helps diagnose interaction issues.
 * Also provides fallback ray visualization if the default rays aren't showing.
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
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
function findR3FHandlers(object: any): Record<string, Function> | null {
  try {
    let current = object;
    while (current) {
      const r3f = current.__r3f;
      if (r3f?.handlers && Object.keys(r3f.handlers).length > 0) {
        return r3f.handlers;
      }
      // Also check for eventObject pattern used by some R3F versions
      if (r3f?.eventCount > 0 && r3f?.handlers) {
        return r3f.handlers;
      }
      current = current.parent;
    }
  } catch (err) {
    console.warn('[findR3FHandlers] Error searching for handlers:', err);
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
  const lastTriggerLogRef = useRef(0);
  // State for visual feedback (isSelecting is updated in useFrame, but we need it for render)
  const [isSelectingState, setIsSelectingState] = useState(false);

  useFrame((state) => {
    try {
      if (!rayRef.current || !controllerState?.object) return;

      // Check trigger state EVERY FRAME (not via useMemo which doesn't update)
      const gamepad = controllerState.inputSource?.gamepad;
      const isSelecting = gamepad?.buttons[0]?.pressed ?? false;

      // Update state for visual feedback (throttled to avoid excessive re-renders)
      if (isSelecting !== isSelectingState) {
        setIsSelectingState(isSelecting);
      }

      // Log trigger state periodically for debugging
      const now = Date.now();
      if (now - lastTriggerLogRef.current > 500) {
        if (isSelecting) {
          vrLog(`[XR] Trigger PRESSED (${handedness})`);
        }
        lastTriggerLogRef.current = now;
      }

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

      // Handle select (trigger press/release)
      // Log state transitions
      if (isSelecting !== wasSelectingRef.current) {
        vrLog(`[XR] Trigger ${isSelecting ? 'PRESSED' : 'RELEASED'} (${handedness})`);
        vrLog(`[XR] At release: hitObject=${hitObject?.name || 'null'}, handlers=${handlers ? 'yes' : 'no'}`);
      }

      if (isSelecting && !wasSelectingRef.current && hitObject && handlers) {
        // Trigger just pressed - dispatch pointerdown
        const downEvent = createR3FEvent('pointerdown', intersection);
        handlers.onPointerDown?.(downEvent);
        vrLog(`[XR] Pointer DOWN: ${hitObject.name || 'unnamed'}`);
      } else if (!isSelecting && wasSelectingRef.current) {
        // Trigger just released
        vrLog(`[XR] Processing trigger release...`);

        if (hitObject && handlers) {
          // Dispatch pointerup and click
          const upEvent = createR3FEvent('pointerup', intersection);
          handlers.onPointerUp?.(upEvent);
          vrLog(`[XR] Pointer UP: ${hitObject.name || 'unnamed'}`);

          const clickEvent = createR3FEvent('click', intersection);
          if (handlers.onClick) {
            vrLog(`[XR] Invoking onClick for: ${hitObject.name || 'unnamed'}`);
            try {
              handlers.onClick(clickEvent);
              vrLog(`[XR] CLICK SUCCESS: ${hitObject.name || 'unnamed'}`);
            } catch (err) {
              vrLog(`[XR] CLICK ERROR: ${err}`);
            }
          } else {
            const handlerKeys = Object.keys(handlers);
            vrLog(`[XR] No onClick handler. Available: ${handlerKeys.join(', ')}`);
          }
        } else if (hitObject && !handlers) {
          vrLog(`[XR] CLICK FAILED - hitObject exists but no handlers: ${hitObject.name || 'unnamed'}`);
        } else if (!hitObject) {
          vrLog(`[XR] CLICK FAILED - no hitObject at release (ray not on target)`);
        }
      }

      wasSelectingRef.current = isSelecting;
    } catch (err) {
      console.error('[FallbackControllerRay] useFrame error:', err);
    }
  });

  // Log controller detection status
  useEffect(() => {
    if (controllerState) {
      console.log(`[XRControllerDebug] ${handedness} controller DETECTED!`);
      vrLog(`[XR] ${handedness} controller DETECTED`);
    } else {
      console.log(`[XRControllerDebug] ${handedness} controller NOT found`);
      vrLog(`[XR] ${handedness} controller NOT found`);
    }
  }, [controllerState, handedness]);

  if (!controllerState) {
    // Return a visual indicator that controller is not found
    const xPos = handedness === 'left' ? -0.3 : 0.3;
    return (
      <group position={[xPos, 1.2, -0.8]}>
        <Text
          fontSize={0.03}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {`${handedness} controller not detected`}
        </Text>
      </group>
    );
  }

  return (
    <group>
      {/* Ray beam - positioned at controller and pointing forward */}
      <mesh ref={rayRef}>
        <cylinderGeometry args={[0.003, 0.001, length, 8]} />
        <meshBasicMaterial
          color={isSelectingState ? '#22c55e' : color}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Hit point indicator */}
      <mesh ref={hitPointRef}>
        <ringGeometry args={[0.01, 0.02, 32]} />
        <meshBasicMaterial
          color={isSelectingState ? '#22c55e' : color}
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
  // Note: controller and hand are configuration options in createXRStore, not state properties

  const leftController = useXRInputSourceState('controller', 'left');
  const rightController = useXRInputSourceState('controller', 'right');
  const leftHand = useXRInputSourceState('hand', 'left');
  const rightHand = useXRInputSourceState('hand', 'right');

  const debugLines = useMemo(() => {
    const lines: string[] = [];
    lines.push(`Session: ${session ? 'Active' : 'None'}`);
    lines.push(`Mode: ${mode || 'N/A'}`);
    lines.push(`Input Sources: ${inputSourceStates?.length || 0}`);
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
  }, [session, mode, inputSourceStates, leftController, rightController, leftHand, rightHand]);

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
 * XR Status Panel - Shows XR status even without controllers
 * This helps diagnose issues when controllers aren't detected
 */
function XRStatusPanel() {
  const session = useXR((s) => s.session);
  const mode = useXR((s) => s.mode);
  const inputSourceStates = useXR((s) => s.inputSourceStates);

  // Count controllers and hands
  const controllerCount = inputSourceStates?.filter(s => s.type === 'controller').length || 0;
  const handCount = inputSourceStates?.filter(s => s.type === 'hand').length || 0;

  // Log status every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      vrLog(`[XR Status] session=${session ? 'YES' : 'NO'} mode=${mode || 'N/A'} inputs=${inputSourceStates?.length || 0} controllers=${controllerCount} hands=${handCount}`);
    }, 2000);
    return () => clearInterval(interval);
  }, [session, mode, inputSourceStates, controllerCount, handCount]);

  // Always show status
  return (
    <group position={[0.5, 1.8, -1.5]}>
      {/* Background */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.5, 0.25]} />
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.9} />
      </mesh>

      {/* Status text */}
      <Text
        position={[0, 0.08, 0]}
        fontSize={0.025}
        color={session ? '#22c55e' : '#ef4444'}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {session ? `XR Active: ${mode || 'unknown'}` : 'XR: No Session'}
      </Text>

      <Text
        position={[0, 0.03, 0]}
        fontSize={0.02}
        color={controllerCount > 0 ? '#22c55e' : '#f59e0b'}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {`Controllers: ${controllerCount}`}
      </Text>

      <Text
        position={[0, -0.02, 0]}
        fontSize={0.02}
        color={handCount > 0 ? '#22c55e' : '#9ca3af'}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {`Hands: ${handCount}`}
      </Text>

      <Text
        position={[0, -0.07, 0]}
        fontSize={0.018}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {`Total inputs: ${inputSourceStates?.length || 0}`}
      </Text>
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

  // Log when component renders
  useEffect(() => {
    vrLog(`[XRControllerDebug] Mounted. session=${session ? 'YES' : 'NO'}`);
    if (session) {
      vrLog(`[XRControllerDebug] Session mode: ${(session as any).mode || 'unknown'}`);
    }
  }, [session]);

  // Always show status panel in XR for debugging
  // Even without a session, show something so we know the component rendered
  return (
    <group>
      {/* Always show status panel in XR */}
      {session && <XRStatusPanel />}

      {showDebugText && session && <XRDebugText />}

      {showFallbackRays && session && (
        <>
          <FallbackControllerRay handedness="left" color={rayColor} length={rayLength} />
          <FallbackControllerRay handedness="right" color={rayColor} length={rayLength} />
        </>
      )}

      {/* Show message when no session */}
      {!session && (
        <group position={[0, 1.6, -1.5]}>
          <Text
            fontSize={0.05}
            color="#f59e0b"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            XRControllerDebug: Waiting for XR session...
          </Text>
        </group>
      )}
    </group>
  );
}

export default XRControllerDebug;
