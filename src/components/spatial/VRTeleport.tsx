/**
 * StickerNest - VR Teleportation Component
 *
 * Enables locomotion in VR via teleportation.
 * Point at the floor and press trigger to teleport.
 *
 * Supports two modes:
 * - Standard: Uses @react-three/xr TeleportTarget
 * - IWSDK: Uses Meta's Immersive Web SDK Locomotor for physics-based movement
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { XROrigin, TeleportTarget, useXR } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import { Vector3, Line, BufferGeometry, LineBasicMaterial } from 'three';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { useLocomotor } from './iwsdk';

// ============================================================================
// Types
// ============================================================================

interface VRTeleportProps {
  /** Initial user position */
  initialPosition?: [number, number, number];
  /** Floor size (width, depth) */
  floorSize?: [number, number];
  /** Floor color */
  floorColor?: string;
  /** Whether teleportation is enabled */
  enabled?: boolean;
  /** Callback when user teleports */
  onTeleport?: (position: [number, number, number]) => void;
  /** Use IWSDK locomotor for physics-based movement (recommended for Quest) */
  useIWSDK?: boolean;
  /** Enable sliding movement (IWSDK mode only) */
  enableSlide?: boolean;
  /** Enable jumping (IWSDK mode only) */
  enableJump?: boolean;
}

// ============================================================================
// Teleportable Floor Component
// ============================================================================

interface TeleportFloorProps {
  size: [number, number];
  color: string;
  onTeleport: (point: { x: number; y: number; z: number }) => void;
}

function TeleportFloor({ size, color, onTeleport }: TeleportFloorProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <TeleportTarget onTeleport={onTeleport}>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.001, 0]} // Slightly above 0 to avoid z-fighting
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <planeGeometry args={size} />
        <meshStandardMaterial
          color={hovered ? '#4c1d95' : color}
          transparent
          opacity={hovered ? 0.3 : 0.1}
          roughness={0.8}
        />
      </mesh>
    </TeleportTarget>
  );
}

// ============================================================================
// VR Teleport Component
// ============================================================================

export function VRTeleport({
  initialPosition = [0, 0, 0],
  floorSize = [20, 20],
  floorColor = '#1f2937',
  enabled = true,
  onTeleport,
  useIWSDK = true,
  enableSlide = false,
  enableJump = true,
}: VRTeleportProps) {
  const spatialMode = useActiveSpatialMode();
  const { isPresenting } = useXR();
  const [userPosition, setUserPosition] = useState<[number, number, number]>(initialPosition);

  // Only active in VR mode
  const isVRMode = spatialMode === 'vr';

  // IWSDK Locomotor (physics-based movement)
  const locomotor = useLocomotor({
    enabled: useIWSDK && isVRMode && isPresenting,
    initialPosition,
    onPositionChange: useCallback((pos: Vector3, isGrounded: boolean) => {
      const newPos: [number, number, number] = [pos.x, pos.y, pos.z];
      setUserPosition(newPos);
      onTeleport?.(newPos);
    }, [onTeleport]),
    debug: false,
  });

  // Standard teleport handler (non-IWSDK)
  const handleTeleport = useCallback(
    (point: { x: number; y: number; z: number }) => {
      if (!enabled) return;

      if (useIWSDK && locomotor.isReady) {
        // Use IWSDK locomotor
        locomotor.teleport(new Vector3(point.x, point.y, point.z));
      } else {
        // Standard teleport
        const newPosition: [number, number, number] = [point.x, 0, point.z];
        setUserPosition(newPosition);
        onTeleport?.(newPosition);
      }
    },
    [enabled, useIWSDK, locomotor, onTeleport]
  );

  // Sync position from IWSDK
  const currentPosition = useMemo((): [number, number, number] => {
    if (useIWSDK && locomotor.isReady) {
      return [locomotor.position.x, locomotor.position.y, locomotor.position.z];
    }
    return userPosition;
  }, [useIWSDK, locomotor.isReady, locomotor.position, userPosition]);

  // Don't render teleport floor if not in VR mode
  if (!isVRMode) {
    return <XROrigin position={currentPosition} />;
  }

  return (
    <>
      {/* User position (feet) */}
      <XROrigin position={currentPosition} />

      {/* Teleportable floor */}
      <TeleportFloor
        size={floorSize}
        color={floorColor}
        onTeleport={handleTeleport}
      />

      {/* IWSDK status indicator (dev only) */}
      {useIWSDK && locomotor.isReady && (
        <mesh position={[currentPosition[0], 0.01, currentPosition[2]]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshBasicMaterial
            color={locomotor.isGrounded ? '#22c55e' : '#f59e0b'}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}
    </>
  );
}

// ============================================================================
// Teleport Boundary Indicator
// ============================================================================

interface TeleportBoundaryProps {
  size: [number, number];
  color?: string;
}

export function TeleportBoundary({ size, color = '#6366f1' }: TeleportBoundaryProps) {
  const halfWidth = size[0] / 2;
  const halfDepth = size[1] / 2;

  // Create corner markers
  const corners = [
    [-halfWidth, 0, -halfDepth],
    [halfWidth, 0, -halfDepth],
    [halfWidth, 0, halfDepth],
    [-halfWidth, 0, halfDepth],
  ] as const;

  return (
    <group>
      {corners.map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default VRTeleport;
