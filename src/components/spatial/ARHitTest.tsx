/**
 * StickerNest - AR Hit Test Component
 *
 * Enables placing objects on real-world surfaces in AR mode.
 * Works on mobile devices with ARCore (Android) or ARKit (iOS).
 * Uses WebXR hit-test feature to find surfaces.
 */

import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR, useXRHitTest } from '@react-three/xr';
import { Mesh, Matrix4, Vector3, Quaternion } from 'three';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';

// ============================================================================
// Types
// ============================================================================

interface ARHitTestProps {
  /** Called when user places an object */
  onPlace?: (position: [number, number, number], rotation: [number, number, number, number]) => void;
  /** Color of the placement indicator */
  indicatorColor?: string;
  /** Size of the placement indicator */
  indicatorSize?: number;
  /** Whether placement is enabled */
  enabled?: boolean;
}

// ============================================================================
// Placement Indicator Component
// ============================================================================

interface PlacementIndicatorProps {
  visible: boolean;
  color: string;
  size: number;
}

function PlacementIndicator({ visible, color, size }: PlacementIndicatorProps) {
  const ref = useRef<Mesh>(null);
  const [pulse, setPulse] = useState(0);

  // Animate the indicator
  useFrame((_, delta) => {
    setPulse((prev) => (prev + delta * 2) % (Math.PI * 2));
    if (ref.current) {
      const scale = 1 + Math.sin(pulse) * 0.1;
      ref.current.scale.set(scale, scale, 1);
    }
  });

  if (!visible) return null;

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[size * 0.8, size, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

// ============================================================================
// AR Hit Test Component
// ============================================================================

export function ARHitTest({
  onPlace,
  indicatorColor = '#8b5cf6',
  indicatorSize = 0.15,
  enabled = true,
}: ARHitTestProps) {
  const spatialMode = useActiveSpatialMode();
  const indicatorRef = useRef<Mesh>(null);
  const [hitDetected, setHitDetected] = useState(false);
  const lastPosition = useRef(new Vector3());
  const lastQuaternion = useRef(new Quaternion());

  // Only active in AR mode
  const isARMode = spatialMode === 'ar';

  // Use the hit test hook from @react-three/xr v6
  // The hook performs hit testing relative to the viewer looking at planes
  useXRHitTest(
    (results, frame) => {
      if (!enabled || !isARMode || results.length === 0) {
        setHitDetected(false);
        return;
      }

      // Get the first hit result
      const hit = results[0];
      const pose = hit.getPose(frame.session.inputSources[0]?.targetRaySpace || hit.getPose);

      if (pose && indicatorRef.current) {
        const matrix = new Matrix4().fromArray(pose.transform.matrix);

        // Decompose the matrix to get position and rotation
        const position = new Vector3();
        const quaternion = new Quaternion();
        const scale = new Vector3();
        matrix.decompose(position, quaternion, scale);

        // Store for placement
        lastPosition.current.copy(position);
        lastQuaternion.current.copy(quaternion);

        // Update indicator position
        indicatorRef.current.position.copy(position);
        indicatorRef.current.quaternion.copy(quaternion);

        setHitDetected(true);
      }
    },
    'viewer', // Hit test from viewer position
    'plane'   // Test against detected planes
  );

  // Handle tap to place
  const handleClick = useCallback(() => {
    if (!enabled || !isARMode || !hitDetected) return;

    const pos = lastPosition.current;
    const quat = lastQuaternion.current;

    onPlace?.(
      [pos.x, pos.y, pos.z],
      [quat.x, quat.y, quat.z, quat.w]
    );
  }, [enabled, isARMode, hitDetected, onPlace]);

  // Don't render if not in AR mode
  if (!isARMode) return null;

  return (
    <group ref={indicatorRef} onClick={handleClick}>
      <PlacementIndicator
        visible={hitDetected}
        color={indicatorColor}
        size={indicatorSize}
      />

      {/* Tap target - larger invisible mesh for easier tapping */}
      {hitDetected && (
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[indicatorSize * 2, 32]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// AR Placed Object Component
// ============================================================================

interface ARPlacedObjectProps {
  position: [number, number, number];
  rotation?: [number, number, number, number];
  children?: React.ReactNode;
}

export function ARPlacedObject({ position, rotation, children }: ARPlacedObjectProps) {
  return (
    <group position={position} quaternion={rotation}>
      {children || (
        // Default placed object - a simple marker
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 32]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// AR Session Info Component
// ============================================================================

export function ARSessionInfo() {
  const { isPresenting } = useXR();
  const spatialMode = useActiveSpatialMode();

  if (spatialMode !== 'ar' || !isPresenting) return null;

  return (
    <group position={[0, 0.1, -0.5]}>
      {/* This would be HTML overlay in real implementation */}
    </group>
  );
}

export default ARHitTest;
