/**
 * StickerNest - VR Teleportation Component
 *
 * Enables locomotion in VR via teleportation.
 * Point at the floor and press trigger to teleport.
 * Uses teleport pointer from @react-three/xr.
 */

import React, { useState, useCallback } from 'react';
import { XROrigin, TeleportTarget } from '@react-three/xr';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';

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
}: VRTeleportProps) {
  const spatialMode = useActiveSpatialMode();
  const [userPosition, setUserPosition] = useState<[number, number, number]>(initialPosition);

  // Only active in VR mode
  const isVRMode = spatialMode === 'vr';

  const handleTeleport = useCallback(
    (point: { x: number; y: number; z: number }) => {
      if (!enabled) return;

      const newPosition: [number, number, number] = [point.x, 0, point.z];
      setUserPosition(newPosition);
      onTeleport?.(newPosition);
    },
    [enabled, onTeleport]
  );

  // Don't render teleport floor if not in VR mode
  if (!isVRMode) {
    return <XROrigin position={userPosition} />;
  }

  return (
    <>
      {/* User position (feet) */}
      <XROrigin position={userPosition} />

      {/* Teleportable floor */}
      <TeleportFloor
        size={floorSize}
        color={floorColor}
        onTeleport={handleTeleport}
      />
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
