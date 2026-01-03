/**
 * XRLocomotion - VR movement and teleportation components
 *
 * Provides thumbstick-based smooth movement and click-to-teleport functionality.
 */

import React from 'react';
import { useXRControllerLocomotion, TeleportTarget } from '@react-three/xr';
import { Grid } from '@react-three/drei';
import type { Group } from 'three';
import * as THREE from 'three';

// ============================================================================
// Locomotion Controller - Thumbstick movement
// ============================================================================

interface LocomotionControllerProps {
  originRef: React.RefObject<Group>;
  speed?: number;
}

/**
 * Enables thumbstick locomotion for VR controllers.
 * Left stick = movement, Right stick = rotation
 */
export function LocomotionController({ originRef, speed = 2.5 }: LocomotionControllerProps) {
  useXRControllerLocomotion(originRef, {
    speed,
  });

  return null;
}

// ============================================================================
// Teleport Floor - Click to teleport
// ============================================================================

interface TeleportFloorProps {
  onTeleport: (point: THREE.Vector3) => void;
  radius?: number;
  showGrid?: boolean;
}

/**
 * Large floor area that supports click-to-teleport.
 * Optionally shows a grid pattern for spatial reference.
 */
export function TeleportFloor({
  onTeleport,
  radius = 15,
  showGrid = true,
}: TeleportFloorProps) {
  return (
    <TeleportTarget onTeleport={onTeleport}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial
          color="#1a1a2e"
          transparent
          opacity={0.3}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>
      {showGrid && (
        <Grid
          position={[0, 0.02, 0]}
          args={[radius * 2, radius * 2]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#3b3b5c"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#6366f1"
          fadeDistance={20}
          fadeStrength={1}
          followCamera={false}
        />
      )}
    </TeleportTarget>
  );
}
