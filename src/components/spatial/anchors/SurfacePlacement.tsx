/**
 * StickerNest - Surface Placement
 *
 * Visual indicator and interaction for placing stickers on room surfaces.
 * Shows available surfaces and allows tap-to-place on floors, walls, tables.
 */

import React, { useState, useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXRPlanes, XRSpace, XRPlaneModel } from '@react-three/xr';
import { Text } from '@react-three/drei';
import { Mesh, Vector3, MathUtils } from 'three';
import { useSpatialAnchors } from './useSpatialAnchors';

// ============================================================================
// Types
// ============================================================================

export interface SurfacePlacementProps {
  /** Whether placement mode is active */
  active: boolean;
  /** Surface types to show */
  surfaceTypes?: ('floor' | 'wall' | 'table' | 'ceiling')[];
  /** Callback when surface is selected */
  onPlacement?: (
    surfaceType: 'floor' | 'wall' | 'table' | 'ceiling',
    position: [number, number, number],
    normal: [number, number, number]
  ) => void;
  /** Highlight color */
  highlightColor?: string;
  /** Opacity of surface preview */
  opacity?: number;
  /** Show surface labels */
  showLabels?: boolean;
}

// ============================================================================
// Surface Highlight
// ============================================================================

interface SurfaceHighlightProps {
  plane: XRPlane;
  type: 'floor' | 'wall' | 'table' | 'ceiling';
  color: string;
  opacity: number;
  showLabel: boolean;
  onSelect?: () => void;
}

function SurfaceHighlight({
  plane,
  type,
  color,
  opacity,
  showLabel,
  onSelect,
}: SurfaceHighlightProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<Mesh>(null);

  // Pulse animation when hovered
  useFrame((_, delta) => {
    if (meshRef.current && hovered) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
    }
  });

  const handleClick = () => {
    if (onSelect) {
      onSelect();
    }
  };

  // Get label position based on surface type
  const labelPosition: [number, number, number] =
    type === 'floor' || type === 'table' ? [0, 0.1, 0] :
    type === 'ceiling' ? [0, -0.1, 0] :
    [0, 0, 0.1];

  const labelRotation: [number, number, number] =
    type === 'floor' || type === 'table' || type === 'ceiling'
      ? [-Math.PI / 2, 0, 0]
      : [0, 0, 0];

  return (
    <XRSpace space={plane.planeSpace}>
      <group>
        <XRPlaneModel
          plane={plane}
          onClick={handleClick}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <meshBasicMaterial
            ref={meshRef}
            color={hovered ? '#22c55e' : color}
            transparent
            opacity={hovered ? 0.4 : opacity}
            depthWrite={false}
          />
        </XRPlaneModel>

        {/* Surface label */}
        {showLabel && (
          <Text
            position={labelPosition}
            rotation={labelRotation}
            fontSize={0.08}
            color={hovered ? '#22c55e' : 'white'}
            anchorX="center"
            anchorY="middle"
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
        )}

        {/* Placement indicator when hovered */}
        {hovered && (
          <mesh position={labelPosition}>
            <ringGeometry args={[0.04, 0.06, 32]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
          </mesh>
        )}
      </group>
    </XRSpace>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SurfacePlacement({
  active,
  surfaceTypes = ['floor', 'wall', 'table'],
  onPlacement,
  highlightColor = '#8b5cf6',
  opacity = 0.2,
  showLabels = true,
}: SurfacePlacementProps) {
  const { snapToSurface } = useSpatialAnchors({ enabled: active });

  // Get planes for each surface type
  const floors = useXRPlanes('floor');
  const walls = useXRPlanes('wall');
  const tables = useXRPlanes('table');
  const ceilings = useXRPlanes('ceiling');

  // Create placement handler for each surface type
  const createPlacementHandler = useCallback(
    (type: 'floor' | 'wall' | 'table' | 'ceiling', plane: XRPlane) => () => {
      // Get plane center
      const polygon = plane.polygon;
      if (!polygon || polygon.length === 0) return;

      let cx = 0, cy = 0, cz = 0;
      for (const point of polygon) {
        cx += point.x;
        cy += point.y;
        cz += point.z;
      }
      cx /= polygon.length;
      cy /= polygon.length;
      cz /= polygon.length;

      // Determine normal based on surface type
      const normal: [number, number, number] =
        type === 'floor' || type === 'table' ? [0, 1, 0] :
        type === 'ceiling' ? [0, -1, 0] :
        [0, 0, 1]; // Wall - simplified

      onPlacement?.(type, [cx, cy, cz], normal);
    },
    [onPlacement]
  );

  if (!active) return null;

  return (
    <group name="surface-placement">
      {/* Floor surfaces */}
      {surfaceTypes.includes('floor') && floors.map((plane, i) => (
        <SurfaceHighlight
          key={`floor-${i}`}
          plane={plane}
          type="floor"
          color={highlightColor}
          opacity={opacity}
          showLabel={showLabels}
          onSelect={createPlacementHandler('floor', plane)}
        />
      ))}

      {/* Wall surfaces */}
      {surfaceTypes.includes('wall') && walls.map((plane, i) => (
        <SurfaceHighlight
          key={`wall-${i}`}
          plane={plane}
          type="wall"
          color={highlightColor}
          opacity={opacity}
          showLabel={showLabels}
          onSelect={createPlacementHandler('wall', plane)}
        />
      ))}

      {/* Table surfaces */}
      {surfaceTypes.includes('table') && tables.map((plane, i) => (
        <SurfaceHighlight
          key={`table-${i}`}
          plane={plane}
          type="table"
          color="#22c55e"
          opacity={opacity}
          showLabel={showLabels}
          onSelect={createPlacementHandler('table', plane)}
        />
      ))}

      {/* Ceiling surfaces */}
      {surfaceTypes.includes('ceiling') && ceilings.map((plane, i) => (
        <SurfaceHighlight
          key={`ceiling-${i}`}
          plane={plane}
          type="ceiling"
          color="#f59e0b"
          opacity={opacity}
          showLabel={showLabels}
          onSelect={createPlacementHandler('ceiling', plane)}
        />
      ))}

      {/* Instructions */}
      <group position={[0, 1.8, -1]}>
        <Text
          fontSize={0.05}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.002}
          outlineColor="black"
        >
          Tap a surface to place sticker
        </Text>
      </group>
    </group>
  );
}

export default SurfacePlacement;
