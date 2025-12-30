/**
 * StickerNest - Room Visualizer
 *
 * Renders detected planes and meshes from the user's room setup.
 * Uses WebXR plane detection and mesh detection APIs.
 * Works across Meta Quest 2/3/Pro, Vision Pro, and other AR devices.
 */

import React, { useMemo } from 'react';
import {
  useXRPlanes,
  useXRMeshes,
  XRPlaneModel,
  XRMeshModel,
  XRSpace,
} from '@react-three/xr';
import { Text } from '@react-three/drei';
import { DoubleSide } from 'three';

// ============================================================================
// Types
// ============================================================================

export type PlaneType = 'wall' | 'floor' | 'ceiling' | 'table' | 'couch' | 'door' | 'window' | 'other';

export interface RoomVisualizerProps {
  /** Show detected planes */
  showPlanes?: boolean;
  /** Show room mesh (Quest 3+ only) */
  showMesh?: boolean;
  /** Show labels on surfaces */
  showLabels?: boolean;
  /** Plane opacity (0-1) */
  planeOpacity?: number;
  /** Mesh opacity (0-1) */
  meshOpacity?: number;
  /** Only show specific plane types */
  planeTypes?: PlaneType[];
  /** Custom colors for plane types */
  planeColors?: Partial<Record<PlaneType, string>>;
  /** Show stats overlay */
  showStats?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PLANE_COLORS: Record<PlaneType, string> = {
  wall: '#6366f1',    // Indigo
  floor: '#22c55e',   // Green
  ceiling: '#f59e0b', // Amber
  table: '#8b5cf6',   // Purple
  couch: '#ec4899',   // Pink
  door: '#14b8a6',    // Teal
  window: '#3b82f6',  // Blue
  other: '#6b7280',   // Gray
};

// ============================================================================
// Helper Components
// ============================================================================

interface PlaneGroupProps {
  planes: readonly XRPlane[];
  type: PlaneType;
  color: string;
  opacity: number;
  showLabel: boolean;
}

function PlaneGroup({ planes, type, color, opacity, showLabel }: PlaneGroupProps) {
  return (
    <>
      {planes.map((plane, index) => (
        <XRSpace key={`${type}-${index}`} space={plane.planeSpace}>
          <XRPlaneModel plane={plane}>
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              side={DoubleSide}
              depthWrite={false}
            />
          </XRPlaneModel>
          {showLabel && (
            <Text
              position={[0, 0.1, 0]}
              fontSize={0.05}
              color="white"
              anchorX="center"
              outlineWidth={0.005}
              outlineColor="black"
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          )}
        </XRSpace>
      ))}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RoomVisualizer({
  showPlanes = true,
  showMesh = true,
  showLabels = false,
  planeOpacity = 0.25,
  meshOpacity = 0.08,
  planeTypes,
  planeColors: customColors,
  showStats = false,
}: RoomVisualizerProps) {
  // Get detected planes by type
  const walls = useXRPlanes('wall');
  const floors = useXRPlanes('floor');
  const ceilings = useXRPlanes('ceiling');
  const tables = useXRPlanes('table');
  const couches = useXRPlanes('couch');
  const doors = useXRPlanes('door');
  const windows = useXRPlanes('window');
  const otherPlanes = useXRPlanes('other');

  // Get room meshes (Quest 3+ only)
  const meshes = useXRMeshes();

  // Merge custom colors with defaults
  const colors = useMemo(() => ({
    ...DEFAULT_PLANE_COLORS,
    ...customColors,
  }), [customColors]);

  // Filter plane types if specified
  const shouldShowType = (type: PlaneType) => {
    if (!planeTypes) return true;
    return planeTypes.includes(type);
  };

  // Count total planes
  const totalPlanes = walls.length + floors.length + ceilings.length +
    tables.length + couches.length + doors.length + windows.length + otherPlanes.length;

  return (
    <group name="room-visualizer">
      {/* Render detected planes */}
      {showPlanes && (
        <>
          {shouldShowType('wall') && (
            <PlaneGroup
              planes={walls}
              type="wall"
              color={colors.wall}
              opacity={planeOpacity}
              showLabel={showLabels}
            />
          )}
          {shouldShowType('floor') && (
            <PlaneGroup
              planes={floors}
              type="floor"
              color={colors.floor}
              opacity={planeOpacity}
              showLabel={showLabels}
            />
          )}
          {shouldShowType('ceiling') && (
            <PlaneGroup
              planes={ceilings}
              type="ceiling"
              color={colors.ceiling}
              opacity={planeOpacity}
              showLabel={showLabels}
            />
          )}
          {shouldShowType('table') && (
            <PlaneGroup
              planes={tables}
              type="table"
              color={colors.table}
              opacity={planeOpacity}
              showLabel={showLabels}
            />
          )}
          {shouldShowType('couch') && (
            <PlaneGroup
              planes={couches}
              type="couch"
              color={colors.couch}
              opacity={planeOpacity}
              showLabel={showLabels}
            />
          )}
          {shouldShowType('door') && (
            <PlaneGroup
              planes={doors}
              type="door"
              color={colors.door}
              opacity={planeOpacity}
              showLabel={showLabels}
            />
          )}
          {shouldShowType('window') && (
            <PlaneGroup
              planes={windows}
              type="window"
              color={colors.window}
              opacity={planeOpacity}
              showLabel={showLabels}
            />
          )}
          {shouldShowType('other') && (
            <PlaneGroup
              planes={otherPlanes}
              type="other"
              color={colors.other}
              opacity={planeOpacity}
              showLabel={showLabels}
            />
          )}
        </>
      )}

      {/* Render room mesh (wireframe) */}
      {showMesh && meshes.map((mesh, index) => (
        <XRSpace key={`mesh-${index}`} space={mesh.meshSpace}>
          <XRMeshModel mesh={mesh}>
            <meshBasicMaterial
              color="#ffffff"
              wireframe
              transparent
              opacity={meshOpacity}
            />
          </XRMeshModel>
        </XRSpace>
      ))}

      {/* Stats overlay */}
      {showStats && (
        <group position={[0, 2.2, -1.5]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[0.8, 0.25]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.7} />
          </mesh>
          <Text
            position={[0, 0.05, 0]}
            fontSize={0.04}
            color="white"
            anchorX="center"
          >
            Room Mapping
          </Text>
          <Text
            position={[0, -0.05, 0]}
            fontSize={0.035}
            color="#9ca3af"
            anchorX="center"
          >
            {`${totalPlanes} planes | ${meshes.length} meshes`}
          </Text>
        </group>
      )}
    </group>
  );
}

export default RoomVisualizer;
