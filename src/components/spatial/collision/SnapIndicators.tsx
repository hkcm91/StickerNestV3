/**
 * StickerNest - Snap Indicators
 *
 * Visual feedback components for surface snapping during widget placement.
 * Shows users where widgets will snap to, highlights target surfaces,
 * and provides debug visualization for collision surfaces.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Line, Ring, Sphere } from '@react-three/drei';
import {
  Vector3,
  Quaternion,
  Color,
  DoubleSide,
  Mesh,
  Group,
  BufferGeometry,
  LineBasicMaterial,
} from 'three';
import { useCollisionStore, useActiveSnap } from '../../../state/useCollisionStore';
import type {
  CollisionSurface,
  SnapPoint,
  SurfaceType,
} from '../../../types/collisionTypes';

// ============================================================================
// Constants
// ============================================================================

const SURFACE_COLORS: Record<SurfaceType, string> = {
  wall: '#6366f1',
  floor: '#22c55e',
  ceiling: '#f59e0b',
  table: '#8b5cf6',
  couch: '#ec4899',
  door: '#14b8a6',
  window: '#3b82f6',
  custom: '#ffffff',
};

const SNAP_ACTIVE_COLOR = '#22c55e';
const SNAP_PREVIEW_COLOR = '#8b5cf6';
const SNAP_INDICATOR_SIZE = 0.08;

// ============================================================================
// Snap Point Indicator
// ============================================================================

export interface SnapPointIndicatorProps {
  /** Snap point to visualize */
  snapPoint: SnapPoint;

  /** Whether this snap point is currently active/targeted */
  active?: boolean;

  /** Surface type for color coding */
  surfaceType?: SurfaceType;

  /** Custom color override */
  color?: string;

  /** Size multiplier */
  scale?: number;

  /** Show direction arrow */
  showNormal?: boolean;

  /** Animate when active */
  animate?: boolean;
}

/**
 * Visual indicator for a single snap point.
 * Shows a ring with optional normal direction arrow.
 */
export function SnapPointIndicator({
  snapPoint,
  active = false,
  surfaceType = 'custom',
  color,
  scale = 1,
  showNormal = true,
  animate = true,
}: SnapPointIndicatorProps) {
  const ringRef = useRef<Mesh>(null);

  // Determine color
  const indicatorColor = color ?? (active ? SNAP_ACTIVE_COLOR : SURFACE_COLORS[surfaceType]);

  // Animate when active
  useFrame((state) => {
    if (!ringRef.current || !animate) return;

    if (active) {
      // Pulse animation
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
      ringRef.current.scale.setScalar(pulse * scale);
    } else {
      ringRef.current.scale.setScalar(scale);
    }
  });

  const position = snapPoint.position.toArray() as [number, number, number];

  return (
    <group position={position} quaternion={snapPoint.rotation}>
      {/* Main ring indicator */}
      <Ring
        ref={ringRef}
        args={[SNAP_INDICATOR_SIZE * 0.6, SNAP_INDICATOR_SIZE, 32]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          color={indicatorColor}
          transparent
          opacity={active ? 0.9 : 0.5}
          side={DoubleSide}
          depthWrite={false}
        />
      </Ring>

      {/* Center dot */}
      <Sphere args={[SNAP_INDICATOR_SIZE * 0.15, 16, 16]} position={[0, 0.002, 0]}>
        <meshBasicMaterial color={active ? '#ffffff' : indicatorColor} />
      </Sphere>

      {/* Normal direction arrow */}
      {showNormal && active && (
        <Line
          points={[
            [0, 0, 0],
            [0, SNAP_INDICATOR_SIZE * 2, 0],
          ]}
          color={SNAP_ACTIVE_COLOR}
          lineWidth={2}
        />
      )}
    </group>
  );
}

// ============================================================================
// Surface Highlight
// ============================================================================

export interface SurfaceHighlightProps {
  /** Surface to highlight */
  surface: CollisionSurface;

  /** Highlight intensity (0-1) */
  intensity?: number;

  /** Custom color override */
  color?: string;

  /** Whether surface is actively targeted */
  active?: boolean;
}

/**
 * Highlights a collision surface during snap targeting.
 */
export function SurfaceHighlight({
  surface,
  intensity = 0.3,
  color,
  active = false,
}: SurfaceHighlightProps) {
  const meshRef = useRef<Mesh>(null);

  // Determine color
  const highlightColor = color ?? (active ? SNAP_ACTIVE_COLOR : SURFACE_COLORS[surface.type]);

  // Animate intensity when active
  useFrame((state) => {
    if (!meshRef.current) return;

    if (active) {
      const pulse = 0.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      (meshRef.current.material as any).opacity = pulse + intensity * 0.5;
    }
  });

  // Only render if surface has a mesh
  if (!surface.mesh) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={surface.mesh.geometry}
      position={surface.mesh.position}
      rotation={surface.mesh.rotation}
      scale={surface.mesh.scale}
      renderOrder={1}
    >
      <meshBasicMaterial
        color={highlightColor}
        transparent
        opacity={intensity}
        side={DoubleSide}
        depthWrite={false}
        depthTest={true}
      />
    </mesh>
  );
}

// ============================================================================
// Snap Preview (shows where object will land)
// ============================================================================

export interface SnapPreviewProps {
  /** Preview position */
  position: Vector3;

  /** Preview rotation */
  rotation: Quaternion;

  /** Size of the preview widget (width, height) */
  size?: [number, number];

  /** Whether snap is active */
  active?: boolean;

  /** Surface type for styling */
  surfaceType?: SurfaceType;
}

/**
 * Shows a preview of where the widget will be placed when snapped.
 */
export function SnapPreview({
  position,
  rotation,
  size = [0.3, 0.2],
  active = true,
  surfaceType = 'wall',
}: SnapPreviewProps) {
  const groupRef = useRef<Group>(null);

  // Pulse animation
  useFrame((state) => {
    if (!groupRef.current || !active) return;

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
    groupRef.current.scale.setScalar(pulse);
  });

  const color = active ? SNAP_ACTIVE_COLOR : SNAP_PREVIEW_COLOR;

  return (
    <group ref={groupRef} position={position} quaternion={rotation}>
      {/* Preview rectangle outline */}
      <Line
        points={[
          [-size[0] / 2, -size[1] / 2, 0],
          [size[0] / 2, -size[1] / 2, 0],
          [size[0] / 2, size[1] / 2, 0],
          [-size[0] / 2, size[1] / 2, 0],
          [-size[0] / 2, -size[1] / 2, 0],
        ]}
        color={color}
        lineWidth={2}
      />

      {/* Corner markers */}
      {[
        [-size[0] / 2, -size[1] / 2],
        [size[0] / 2, -size[1] / 2],
        [size[0] / 2, size[1] / 2],
        [-size[0] / 2, size[1] / 2],
      ].map(([x, y], i) => (
        <Sphere key={i} args={[0.015, 8, 8]} position={[x, y, 0]}>
          <meshBasicMaterial color={color} />
        </Sphere>
      ))}

      {/* Center crosshair */}
      <Line
        points={[
          [-0.02, 0, 0],
          [0.02, 0, 0],
        ]}
        color={color}
        lineWidth={1}
      />
      <Line
        points={[
          [0, -0.02, 0],
          [0, 0.02, 0],
        ]}
        color={color}
        lineWidth={1}
      />
    </group>
  );
}

// ============================================================================
// Guide Line (connects dragged object to snap point)
// ============================================================================

export interface SnapGuideLineProps {
  /** Start position (current object position) */
  from: Vector3;

  /** End position (snap target) */
  to: Vector3;

  /** Line color */
  color?: string;

  /** Whether to show dashed line */
  dashed?: boolean;
}

/**
 * Dashed line connecting dragged object to snap target.
 */
export function SnapGuideLine({
  from,
  to,
  color = SNAP_ACTIVE_COLOR,
  dashed = true,
}: SnapGuideLineProps) {
  return (
    <Line
      points={[from.toArray(), to.toArray()]}
      color={color}
      lineWidth={1}
      dashed={dashed}
      dashSize={0.05}
      gapSize={0.03}
    />
  );
}

// ============================================================================
// Active Snap Feedback (auto-displays based on store state)
// ============================================================================

export interface ActiveSnapFeedbackProps {
  /** Show guide line from object to snap point */
  showGuideLine?: boolean;

  /** Show surface highlight */
  showSurfaceHighlight?: boolean;

  /** Show snap point indicator */
  showSnapIndicator?: boolean;

  /** Show placement preview */
  showPreview?: boolean;

  /** Current object position (for guide line) */
  objectPosition?: Vector3;

  /** Widget size for preview */
  widgetSize?: [number, number];
}

/**
 * Automatically displays snap feedback based on collision store state.
 * Use this component to show snap indicators during drag operations.
 */
export function ActiveSnapFeedback({
  showGuideLine = true,
  showSurfaceHighlight = true,
  showSnapIndicator = true,
  showPreview = true,
  objectPosition,
  widgetSize = [0.3, 0.2],
}: ActiveSnapFeedbackProps) {
  const activeSnap = useActiveSnap();

  // Don't render if not snapping
  if (!activeSnap.isSnapping) {
    return null;
  }

  const { snapPoint, surface, previewPosition, previewRotation } = activeSnap;

  return (
    <group name="snap-feedback">
      {/* Surface highlight */}
      {showSurfaceHighlight && surface && (
        <SurfaceHighlight
          surface={surface}
          active={!!snapPoint}
          intensity={snapPoint ? 0.4 : 0.2}
        />
      )}

      {/* Snap point indicator */}
      {showSnapIndicator && snapPoint && (
        <SnapPointIndicator
          snapPoint={snapPoint}
          active={true}
          surfaceType={surface?.type}
          showNormal={true}
        />
      )}

      {/* Guide line from object to snap point */}
      {showGuideLine && objectPosition && snapPoint && (
        <SnapGuideLine from={objectPosition} to={snapPoint.position} />
      )}

      {/* Placement preview */}
      {showPreview && previewPosition && previewRotation && (
        <SnapPreview
          position={previewPosition}
          rotation={previewRotation}
          size={widgetSize}
          active={!!snapPoint}
          surfaceType={surface?.type}
        />
      )}
    </group>
  );
}

// ============================================================================
// Collision Debug View
// ============================================================================

export interface CollisionDebugViewProps {
  /** Show surface bounding boxes */
  showBoundingBoxes?: boolean;

  /** Show surface normals */
  showNormals?: boolean;

  /** Show snap points */
  showSnapPoints?: boolean;

  /** Show labels */
  showLabels?: boolean;

  /** Only show specific surface types */
  surfaceTypes?: SurfaceType[];

  /** Opacity for surfaces */
  opacity?: number;
}

/**
 * Debug visualization for all collision surfaces.
 * Useful for development and troubleshooting.
 */
export function CollisionDebugView({
  showBoundingBoxes = true,
  showNormals = true,
  showSnapPoints = true,
  showLabels = true,
  surfaceTypes,
  opacity = 0.3,
}: CollisionDebugViewProps) {
  const showDebug = useCollisionStore((s) => s.showDebugVisualization);
  const surfaces = useCollisionStore((s) => s.surfaces);

  if (!showDebug) {
    return null;
  }

  const filteredSurfaces = useMemo(() => {
    let result = Array.from(surfaces.values()).filter((s) => s.active);

    if (surfaceTypes && surfaceTypes.length > 0) {
      result = result.filter((s) => surfaceTypes.includes(s.type));
    }

    return result;
  }, [surfaces, surfaceTypes]);

  return (
    <group name="collision-debug-view">
      {filteredSurfaces.map((surface) => (
        <SurfaceDebugView
          key={surface.id}
          surface={surface}
          showBoundingBox={showBoundingBoxes}
          showNormal={showNormals}
          showSnapPoints={showSnapPoints}
          showLabel={showLabels}
          opacity={opacity}
        />
      ))}
    </group>
  );
}

// ============================================================================
// Surface Debug View (individual surface)
// ============================================================================

interface SurfaceDebugViewProps {
  surface: CollisionSurface;
  showBoundingBox?: boolean;
  showNormal?: boolean;
  showSnapPoints?: boolean;
  showLabel?: boolean;
  opacity?: number;
}

function SurfaceDebugView({
  surface,
  showBoundingBox = true,
  showNormal = true,
  showSnapPoints = true,
  showLabel = true,
  opacity = 0.3,
}: SurfaceDebugViewProps) {
  const color = SURFACE_COLORS[surface.type];
  const centroid = surface.centroid.toArray() as [number, number, number];

  // Calculate bounding box dimensions
  const size = new Vector3();
  surface.boundingBox.getSize(size);

  const center = new Vector3();
  surface.boundingBox.getCenter(center);

  return (
    <group name={`debug-${surface.id}`}>
      {/* Surface mesh wireframe (if available) */}
      {surface.mesh && (
        <mesh
          geometry={surface.mesh.geometry}
          position={surface.mesh.position}
          rotation={surface.mesh.rotation}
          scale={surface.mesh.scale}
        >
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={opacity}
          />
        </mesh>
      )}

      {/* Bounding box */}
      {showBoundingBox && (
        <mesh position={center}>
          <boxGeometry args={[size.x, size.y, size.z]} />
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={opacity * 0.5}
          />
        </mesh>
      )}

      {/* Normal direction arrow */}
      {showNormal && (
        <Line
          points={[
            centroid,
            [
              centroid[0] + surface.normal.x * 0.3,
              centroid[1] + surface.normal.y * 0.3,
              centroid[2] + surface.normal.z * 0.3,
            ],
          ]}
          color={color}
          lineWidth={2}
        />
      )}

      {/* Snap points */}
      {showSnapPoints &&
        surface.snapPoints.map((sp) => (
          <Sphere
            key={sp.id}
            args={[0.02, 8, 8]}
            position={sp.position.toArray() as [number, number, number]}
          >
            <meshBasicMaterial color={SNAP_ACTIVE_COLOR} />
          </Sphere>
        ))}

      {/* Label */}
      {showLabel && (
        <Text
          position={[centroid[0], centroid[1] + 0.1, centroid[2]]}
          fontSize={0.05}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.003}
          outlineColor="black"
        >
          {`${surface.type} (${surface.source})`}
        </Text>
      )}
    </group>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  SURFACE_COLORS,
  SNAP_ACTIVE_COLOR,
  SNAP_PREVIEW_COLOR,
};
