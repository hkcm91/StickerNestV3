/**
 * StickerNest - SpatialScene
 *
 * The 3D scene content for VR/AR modes.
 * This component renders widgets, entities, and canvases in 3D space.
 * Currently a placeholder that will be expanded to mirror CanvasRenderer content.
 */

import React, { useState } from 'react';
import { Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { DEFAULT_WIDGET_Z, DEFAULT_EYE_HEIGHT } from '../../utils/spatialCoordinates';

// ============================================================================
// Placeholder Canvas Panel
// ============================================================================

interface CanvasPanel3DProps {
  position?: [number, number, number];
  width?: number;
  height?: number;
}

/**
 * A placeholder 3D panel representing where the 2D canvas would be displayed.
 * In the future, this will render actual widgets/entities.
 */
function CanvasPanel3D({
  position = [0, DEFAULT_EYE_HEIGHT, DEFAULT_WIDGET_Z],
  width = 4,
  height = 3,
}: CanvasPanel3DProps) {
  const [hovered, setHovered] = useState(false);
  const spatialMode = useActiveSpatialMode();

  return (
    <group position={position}>
      {/* Main canvas panel */}
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color={hovered ? '#4c1d95' : '#1f2937'}
          transparent
          opacity={0.9}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Border glow when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[width + 0.05, height + 0.05]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Title text */}
      <Text
        position={[0, height / 2 + 0.15, 0.01]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        StickerNest Canvas
      </Text>

      {/* Mode indicator */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.2}
        color="#8b5cf6"
        anchorX="center"
        anchorY="middle"
      >
        {spatialMode === 'vr' ? '🥽 VR Mode' : spatialMode === 'ar' ? '📱 AR Mode' : '🖥️ Preview'}
      </Text>

      {/* Instructions */}
      <Text
        position={[0, -0.5, 0.01]}
        fontSize={0.08}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
        textAlign="center"
      >
        {spatialMode === 'vr'
          ? 'Point and click to interact • Use thumbstick to teleport'
          : spatialMode === 'ar'
          ? 'Point at surfaces to place content'
          : 'Use mouse to orbit • Click VR button to enter immersive mode'}
      </Text>
    </group>
  );
}

// ============================================================================
// Interactive Demo Object
// ============================================================================

interface InteractiveBoxProps {
  position: [number, number, number];
  color?: string;
}

/**
 * A simple interactive box to test VR/AR interactions.
 */
function InteractiveBox({ position, color = '#8b5cf6' }: InteractiveBoxProps) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setClicked(!clicked);
  };

  return (
    <mesh
      position={position}
      scale={clicked ? 1.2 : 1}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial
        color={clicked ? '#22c55e' : hovered ? '#a78bfa' : color}
        roughness={0.4}
        metalness={0.3}
      />
    </mesh>
  );
}

// ============================================================================
// Main SpatialScene Component
// ============================================================================

export function SpatialScene() {
  const spatialMode = useActiveSpatialMode();

  return (
    <group>
      {/* Main canvas panel at comfortable viewing distance */}
      <CanvasPanel3D />

      {/* Demo interactive objects */}
      <InteractiveBox position={[-1.5, 1, -2]} color="#ef4444" />
      <InteractiveBox position={[1.5, 1, -2]} color="#3b82f6" />
      <InteractiveBox position={[0, 0.5, -1.5]} color="#f59e0b" />

      {/* Floating info panel */}
      <group position={[2.5, 1.8, -2]} rotation={[0, -0.3, 0]}>
        <mesh>
          <planeGeometry args={[1.2, 0.8]} />
          <meshStandardMaterial color="#111827" transparent opacity={0.9} />
        </mesh>
        <Text
          position={[0, 0.25, 0.01]}
          fontSize={0.08}
          color="white"
          anchorX="center"
        >
          Spatial Mode
        </Text>
        <Text
          position={[0, 0.05, 0.01]}
          fontSize={0.12}
          color="#8b5cf6"
          anchorX="center"
        >
          {spatialMode.toUpperCase()}
        </Text>
        <Text
          position={[0, -0.2, 0.01]}
          fontSize={0.06}
          color="#6b7280"
          anchorX="center"
          maxWidth={1}
          textAlign="center"
        >
          Click boxes to interact
        </Text>
      </group>
    </group>
  );
}

export default SpatialScene;
