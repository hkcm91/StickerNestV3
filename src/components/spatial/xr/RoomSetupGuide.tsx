/**
 * StickerNest - Room Setup Guide
 *
 * Displays a helpful guide when room mapping data is not available.
 * Guides users through the Meta Quest room setup process.
 * Only shown in AR mode when no planes/meshes are detected.
 */

import React, { useState } from 'react';
import { useXRPlanes, useXRMeshes, useXR } from '@react-three/xr';
import { Text, RoundedBox } from '@react-three/drei';

// ============================================================================
// Types
// ============================================================================

export interface RoomSetupGuideProps {
  /** Position of the guide panel */
  position?: [number, number, number];
  /** Whether to show even if some planes exist */
  showAlways?: boolean;
  /** Callback when user dismisses the guide */
  onDismiss?: () => void;
  /** Custom title text */
  title?: string;
  /** Custom message text */
  message?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PANEL_WIDTH = 0.5;
const PANEL_HEIGHT = 0.35;
const CORNER_RADIUS = 0.02;

// ============================================================================
// Main Component
// ============================================================================

export function RoomSetupGuide({
  position = [0, 1.5, -0.8],
  showAlways = false,
  onDismiss,
  title = 'Room Setup Required',
  message = 'For the best AR experience, please set up your room boundaries.',
}: RoomSetupGuideProps) {
  const { isPresenting } = useXR();
  const allPlanes = useXRPlanes();
  const meshes = useXRMeshes();
  const [isDismissed, setIsDismissed] = useState(false);

  // Determine if we should show the guide
  const hasPlanes = allPlanes.length > 0;
  const hasMeshes = meshes.length > 0;
  const hasRoomData = hasPlanes || hasMeshes;

  // Don't show if:
  // - Not in XR session
  // - Already dismissed
  // - Has room data (unless showAlways is true)
  if (!isPresenting || isDismissed || (hasRoomData && !showAlways)) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <group position={position} name="room-setup-guide">
      {/* Panel background */}
      <RoundedBox
        args={[PANEL_WIDTH, PANEL_HEIGHT, 0.015]}
        radius={CORNER_RADIUS}
        smoothness={4}
        position={[0, 0, -0.008]}
      >
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.95} />
      </RoundedBox>

      {/* Accent border */}
      <RoundedBox
        args={[PANEL_WIDTH + 0.006, PANEL_HEIGHT + 0.006, 0.012]}
        radius={CORNER_RADIUS}
        smoothness={4}
        position={[0, 0, -0.014]}
      >
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
      </RoundedBox>

      {/* Warning icon */}
      <group position={[0, 0.1, 0]}>
        <mesh>
          <circleGeometry args={[0.025, 3]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        <Text
          position={[0, -0.002, 0.001]}
          fontSize={0.025}
          color="#1a1a2e"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          !
        </Text>
      </group>

      {/* Title */}
      <Text
        position={[0, 0.05, 0.001]}
        fontSize={0.028}
        color="#f59e0b"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {title}
      </Text>

      {/* Message */}
      <Text
        position={[0, -0.01, 0.001]}
        fontSize={0.018}
        color="white"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={PANEL_WIDTH - 0.04}
      >
        {message}
      </Text>

      {/* Instructions */}
      <Text
        position={[0, -0.065, 0.001]}
        fontSize={0.015}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={PANEL_WIDTH - 0.04}
      >
        Meta Quest: Settings → Guardian → Room Setup
      </Text>

      {/* Additional tip */}
      <Text
        position={[0, -0.095, 0.001]}
        fontSize={0.012}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={PANEL_WIDTH - 0.04}
      >
        Draw walls, floor, and furniture for best results
      </Text>

      {/* Dismiss button */}
      {onDismiss && (
        <group
          position={[PANEL_WIDTH / 2 - 0.03, PANEL_HEIGHT / 2 - 0.03, 0.001]}
          onClick={handleDismiss}
        >
          <mesh>
            <circleGeometry args={[0.015, 16]} />
            <meshBasicMaterial color="#374151" />
          </mesh>
          <Text
            fontSize={0.015}
            color="#9ca3af"
            anchorX="center"
            anchorY="middle"
          >
            ×
          </Text>
        </group>
      )}
    </group>
  );
}

// ============================================================================
// Compact Version
// ============================================================================

export interface RoomSetupHintProps {
  position?: [number, number, number];
}

/**
 * Compact hint shown in corner when room data is missing
 */
export function RoomSetupHint({ position = [-0.4, 1.8, -1] }: RoomSetupHintProps) {
  const { isPresenting } = useXR();
  const allPlanes = useXRPlanes();
  const meshes = useXRMeshes();

  const hasRoomData = allPlanes.length > 0 || meshes.length > 0;

  if (!isPresenting || hasRoomData) {
    return null;
  }

  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[0.25, 0.04]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} />
      </mesh>
      <Text
        position={[0, 0, 0.001]}
        fontSize={0.015}
        color="#1a1a2e"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        ⚠ Room Setup Needed
      </Text>
    </group>
  );
}

export default RoomSetupGuide;
