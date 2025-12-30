/**
 * StickerNest - Spatial Demo Canvas
 *
 * A demo scene with pre-populated spatial stickers for testing VR/AR.
 * Includes green screen planes, panoramic backgrounds, and interactive objects.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { useSpatialStickerStore } from '../../state/useSpatialStickerStore';
import { SpatialSticker, createImageSticker, createPrimitiveSticker } from '../../types/spatialEntity';

// ============================================================================
// Demo Green Screen Plane
// ============================================================================

interface GreenScreenPlane3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  color?: string;
  emissive?: boolean;
  opacity?: number;
  label?: string;
}

export function GreenScreenPlane3D({
  position,
  rotation = [0, 0, 0],
  size = [2, 1.5],
  color = '#00FF00',
  emissive = false,
  opacity = 1,
  label,
}: GreenScreenPlane3DProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation={rotation.map(r => r * Math.PI / 180) as [number, number, number]}
    >
      {/* Main green screen plane */}
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <planeGeometry args={size} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={emissive ? color : '#000000'}
          emissiveIntensity={emissive ? 0.3 : 0}
          roughness={0.8}
          metalness={0}
        />
      </mesh>

      {/* Selection outline */}
      {hovered && (
        <mesh position={[0, 0, -0.001]}>
          <planeGeometry args={[size[0] + 0.02, size[1] + 0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Label */}
      {label && (
        <Text
          position={[0, -size[1] / 2 - 0.1, 0.01]}
          fontSize={0.08}
          color="#ffffff"
          anchorX="center"
          anchorY="top"
        >
          {label}
        </Text>
      )}

      {/* Calibration grid */}
      <group position={[0, 0, 0.001]}>
        {/* Center cross */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.02, size[1] * 0.8]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.15} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[size[0] * 0.8, 0.02]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.15} />
        </mesh>
        {/* Corner markers */}
        {[
          [-size[0] / 2 + 0.1, size[1] / 2 - 0.1],
          [size[0] / 2 - 0.1, size[1] / 2 - 0.1],
          [-size[0] / 2 + 0.1, -size[1] / 2 + 0.1],
          [size[0] / 2 - 0.1, -size[1] / 2 + 0.1],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <circleGeometry args={[0.03, 16]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ============================================================================
// Demo Panoramic Skybox
// ============================================================================

interface PanoramicSkybox3DProps {
  preset?: 'stars' | 'sunset' | 'mountains' | 'studio' | 'gradient';
  rotation?: number;
  opacity?: number;
}

export function PanoramicSkybox3D({
  preset = 'gradient',
  rotation = 0,
  opacity = 1,
}: PanoramicSkybox3DProps) {
  // Render a simple gradient dome for demo
  const colors: Record<string, [string, string, string]> = {
    stars: ['#0a0a1a', '#1a1a3a', '#0a0a1a'],
    sunset: ['#ff7e5f', '#feb47b', '#1a0a3a'],
    mountains: ['#2c3e50', '#4ca1af', '#c9d6ff'],
    studio: ['#1a1a2e', '#16213e', '#0f0f19'],
    gradient: ['#667eea', '#764ba2', '#1a1a2e'],
  };

  const [top, mid, bottom] = colors[preset];

  return (
    <group rotation={[0, rotation * Math.PI / 180, 0]}>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial
          transparent
          opacity={opacity}
          color={mid}
        />
      </mesh>

      {/* Gradient dome for top */}
      <mesh position={[0, 25, 0]} scale={[-1, 1, 1]}>
        <hemisphereLight args={[top, bottom, 0.3]} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Demo Floating Widget Panel
// ============================================================================

interface FloatingWidgetPanel3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  widgetId?: string;
  title?: string;
  size?: [number, number];
}

export function FloatingWidgetPanel3D({
  position,
  rotation = [0, 0, 0],
  widgetId = 'demo-widget',
  title = 'Widget',
  size = [0.8, 0.6],
}: FloatingWidgetPanel3DProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  return (
    <group
      position={position}
      rotation={rotation.map(r => r * Math.PI / 180) as [number, number, number]}
    >
      {/* Panel background */}
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={() => setActive(!active)}
      >
        <planeGeometry args={size} />
        <meshStandardMaterial
          color={active ? '#1e1b4b' : '#1f2937'}
          transparent
          opacity={0.95}
          roughness={0.9}
        />
      </mesh>

      {/* Border */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[size[0] + 0.01, size[1] + 0.01]} />
        <meshBasicMaterial
          color={hovered ? '#8b5cf6' : active ? '#22c55e' : '#374151'}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Title bar */}
      <mesh position={[0, size[1] / 2 - 0.04, 0.001]}>
        <planeGeometry args={[size[0] - 0.02, 0.06]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.8} />
      </mesh>

      <Text
        position={[0, size[1] / 2 - 0.04, 0.002]}
        fontSize={0.035}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>

      {/* Content placeholder */}
      <Text
        position={[0, 0, 0.002]}
        fontSize={0.05}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
      >
        {active ? '✓ Active' : 'Click to activate'}
      </Text>
    </group>
  );
}

// ============================================================================
// Demo Scene Setup
// ============================================================================

export function useSpatialDemoSetup() {
  const addSpatialSticker = useSpatialStickerStore((state) => state.addSpatialSticker);
  const spatialStickers = useSpatialStickerStore((state) => state.getSpatialStickers());
  const [initialized, setInitialized] = useState(false);

  const setupDemoScene = useCallback(() => {
    if (spatialStickers.length > 0) {
      console.log('[SpatialDemo] Scene already has stickers, skipping setup');
      return;
    }

    console.log('[SpatialDemo] Setting up demo scene...');

    // Add demo stickers
    const demoStickers: SpatialSticker[] = [
      // Front wall green screen
      createPrimitiveSticker({
        name: 'Front Green Screen',
        primitiveType: 'plane',
        color: '#00FF00',
        transform: {
          position: { x: 0, y: 1.5, z: -3 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 3, y: 2, z: 1 },
        },
        visibleIn: { desktop: true, vr: true, ar: true },
      }),

      // Left wall green screen
      createPrimitiveSticker({
        name: 'Left Green Screen',
        primitiveType: 'plane',
        color: '#00FF00',
        transform: {
          position: { x: -3, y: 1.5, z: 0 },
          rotation: { x: 0, y: 90, z: 0 },
          scale: { x: 2, y: 2, z: 1 },
        },
        visibleIn: { desktop: true, vr: true, ar: false },
      }),

      // Right wall blue screen
      createPrimitiveSticker({
        name: 'Right Blue Screen',
        primitiveType: 'plane',
        color: '#0000FF',
        transform: {
          position: { x: 3, y: 1.5, z: 0 },
          rotation: { x: 0, y: -90, z: 0 },
          scale: { x: 2, y: 2, z: 1 },
        },
        visibleIn: { desktop: true, vr: true, ar: false },
      }),

      // Floor marker
      createPrimitiveSticker({
        name: 'Floor Marker',
        primitiveType: 'cylinder',
        color: '#8b5cf6',
        transform: {
          position: { x: 0, y: 0.05, z: -1 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.3, y: 0.1, z: 0.3 },
        },
        visibleIn: { desktop: true, vr: true, ar: true },
      }),

      // Demo info cube
      createPrimitiveSticker({
        name: 'Info Cube',
        primitiveType: 'box',
        color: '#ef4444',
        transform: {
          position: { x: -1.5, y: 0.3, z: -2 },
          rotation: { x: 0, y: 45, z: 0 },
          scale: { x: 0.4, y: 0.4, z: 0.4 },
        },
        visibleIn: { desktop: true, vr: true, ar: false },
        clickBehavior: {
          type: 'emit-event',
          event: 'demo:cube-clicked',
        },
      }),
    ];

    demoStickers.forEach((sticker) => {
      addSpatialSticker(sticker);
    });

    setInitialized(true);
    console.log('[SpatialDemo] Demo scene setup complete with', demoStickers.length, 'stickers');
  }, [addSpatialSticker, spatialStickers.length]);

  return { setupDemoScene, initialized };
}

// ============================================================================
// Main Demo Component
// ============================================================================

export function SpatialDemoScene() {
  const spatialMode = useActiveSpatialMode();
  const { setupDemoScene, initialized } = useSpatialDemoSetup();

  // Setup demo scene on first render
  useEffect(() => {
    if (!initialized) {
      setupDemoScene();
    }
  }, [setupDemoScene, initialized]);

  return (
    <group name="spatial-demo-scene">
      {/* Environment skybox */}
      <PanoramicSkybox3D
        preset={spatialMode === 'ar' ? 'studio' : 'gradient'}
        opacity={spatialMode === 'ar' ? 0.3 : 1}
      />

      {/* Demo green screens (3D rendered versions) */}
      <GreenScreenPlane3D
        position={[0, 1.5, -4]}
        size={[4, 2.5]}
        color="#00FF00"
        emissive={true}
        label="Main Green Screen"
      />

      <GreenScreenPlane3D
        position={[-4, 1.5, 0]}
        rotation={[0, 90, 0]}
        size={[3, 2]}
        color="#00FF00"
        label="Left Wall"
      />

      <GreenScreenPlane3D
        position={[4, 1.5, 0]}
        rotation={[0, -90, 0]}
        size={[3, 2]}
        color="#0000FF"
        label="Blue Screen"
      />

      {/* Demo widget panels */}
      <FloatingWidgetPanel3D
        position={[-1.2, 1.8, -2]}
        rotation={[0, 15, 0]}
        title="Webcam"
        size={[0.6, 0.45]}
      />

      <FloatingWidgetPanel3D
        position={[1.2, 1.8, -2]}
        rotation={[0, -15, 0]}
        title="Panorama"
        size={[0.6, 0.45]}
      />

      {/* Floor grid */}
      <gridHelper args={[10, 10, '#374151', '#1f2937']} position={[0, 0.001, 0]} />

      {/* Demo instructions */}
      <group position={[0, 2.5, -3]}>
        <Text
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          🎬 Spatial Demo
        </Text>
        <Text
          position={[0, -0.25, 0]}
          fontSize={0.06}
          color="#9ca3af"
          anchorX="center"
          anchorY="middle"
          maxWidth={3}
          textAlign="center"
        >
          {spatialMode === 'vr'
            ? 'Green screens are ready for chroma key compositing. Grab and move objects with controllers.'
            : spatialMode === 'ar'
            ? 'Tap surfaces to place markers. Green screens work with your camera feed.'
            : 'Enter VR or AR mode to interact with the spatial environment.'}
        </Text>
      </group>

      {/* Mode-specific elements */}
      {spatialMode === 'ar' && (
        <Text
          position={[0, 0.3, -1]}
          fontSize={0.1}
          color="#22c55e"
          anchorX="center"
          anchorY="middle"
        >
          📱 AR Mode Active
        </Text>
      )}
    </group>
  );
}

export default SpatialDemoScene;
