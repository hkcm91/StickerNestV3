/**
 * StickerNest - Occlusion Layer
 *
 * Renders room meshes to the depth buffer only, allowing virtual objects
 * to appear occluded by real-world surfaces. This creates the illusion
 * that virtual content is behind walls, tables, etc.
 *
 * Requires mesh detection support (Quest 3/3S, Vision Pro).
 * Falls back gracefully on devices without mesh detection.
 */

import React from 'react';
import {
  useXRMeshes,
  useXRPlanes,
  XRMeshModel,
  XRPlaneModel,
  XRSpace,
} from '@react-three/xr';
import { DoubleSide } from 'three';

// ============================================================================
// Types
// ============================================================================

export interface OcclusionLayerProps {
  /** Enable mesh-based occlusion (Quest 3+) */
  useMeshes?: boolean;
  /** Enable plane-based occlusion (fallback for Quest 2) */
  usePlanes?: boolean;
  /** Render order (lower = renders first) */
  renderOrder?: number;
  /** Enable debug mode to visualize occlusion surfaces */
  debug?: boolean;
  /** Debug visualization color */
  debugColor?: string;
  /** Debug visualization opacity */
  debugOpacity?: number;
}

// ============================================================================
// Main Component
// ============================================================================

export function OcclusionLayer({
  useMeshes = true,
  usePlanes = true,
  renderOrder = 0,
  debug = false,
  debugColor = '#ff00ff',
  debugOpacity = 0.3,
}: OcclusionLayerProps) {
  // Get room meshes (Quest 3+)
  const meshes = useXRMeshes();

  // Get planes as fallback
  const walls = useXRPlanes('wall');
  const floors = useXRPlanes('floor');
  const ceilings = useXRPlanes('ceiling');
  const tables = useXRPlanes('table');

  const allPlanes = [...walls, ...floors, ...ceilings, ...tables];

  // Prefer meshes, fall back to planes if no meshes available
  const hasMeshes = meshes.length > 0;
  const shouldUseMeshes = useMeshes && hasMeshes;
  const shouldUsePlanes = usePlanes && !hasMeshes && allPlanes.length > 0;

  return (
    <group name="occlusion-layer" renderOrder={renderOrder}>
      {/* Mesh-based occlusion (higher quality, Quest 3+) */}
      {shouldUseMeshes && meshes.map((mesh, index) => (
        <XRSpace key={`occlusion-mesh-${index}`} space={mesh.meshSpace}>
          <XRMeshModel mesh={mesh}>
            {debug ? (
              <meshBasicMaterial
                color={debugColor}
                transparent
                opacity={debugOpacity}
                side={DoubleSide}
              />
            ) : (
              <meshBasicMaterial
                colorWrite={false}
                depthWrite={true}
                side={DoubleSide}
              />
            )}
          </XRMeshModel>
        </XRSpace>
      ))}

      {/* Plane-based occlusion (fallback for Quest 2) */}
      {shouldUsePlanes && allPlanes.map((plane, index) => (
        <XRSpace key={`occlusion-plane-${index}`} space={plane.planeSpace}>
          <XRPlaneModel plane={plane}>
            {debug ? (
              <meshBasicMaterial
                color={debugColor}
                transparent
                opacity={debugOpacity}
                side={DoubleSide}
              />
            ) : (
              <meshBasicMaterial
                colorWrite={false}
                depthWrite={true}
                side={DoubleSide}
              />
            )}
          </XRPlaneModel>
        </XRSpace>
      ))}
    </group>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Debug version of OcclusionLayer that shows surfaces in magenta
 */
export function OcclusionDebug(props: Omit<OcclusionLayerProps, 'debug'>) {
  return <OcclusionLayer {...props} debug={true} />;
}

/**
 * AR Scene wrapper that automatically handles occlusion
 */
export interface ARSceneWithOcclusionProps {
  children: React.ReactNode;
  /** Enable occlusion */
  enabled?: boolean;
  /** Show debug visualization */
  debug?: boolean;
}

export function ARSceneWithOcclusion({
  children,
  enabled = true,
  debug = false,
}: ARSceneWithOcclusionProps) {
  return (
    <group>
      {/* Occlusion layer renders first */}
      {enabled && <OcclusionLayer debug={debug} renderOrder={0} />}

      {/* Virtual content renders after, gets occluded by depth buffer */}
      <group renderOrder={1}>
        {children}
      </group>
    </group>
  );
}

export default OcclusionLayer;
