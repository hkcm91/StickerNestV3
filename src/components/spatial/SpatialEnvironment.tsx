/**
 * Spatial Environment Controller
 *
 * Applies spatial environment settings to the 3D scene:
 * - Lighting (ambient, directional, point lights, environment maps)
 * - Background (solid, gradient, skybox, HDRI)
 * - Floor (grid, solid, reflective)
 * - Fog
 *
 * Post-processing effects are handled separately via EffectComposer.
 */

import React, { useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import {
  Environment,
  Sky,
  Grid,
  GradientTexture,
  ContactShadows,
  MeshReflectorMaterial,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  useSpatialEnvironmentStore,
  useLighting,
  useBackground,
  useFloor,
  useFog,
} from '../../stores/useSpatialEnvironmentStore';

// ============================================================================
// Lighting Component
// ============================================================================

function EnvironmentLighting() {
  const lighting = useLighting();

  return (
    <>
      {/* Ambient light */}
      <ambientLight
        intensity={lighting.ambient.intensity}
        color={lighting.ambient.color}
      />

      {/* Main directional light */}
      <directionalLight
        intensity={lighting.directional.intensity}
        color={lighting.directional.color}
        position={lighting.directional.position}
        castShadow={lighting.directional.castShadow}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Point lights */}
      {lighting.points.map((point) => (
        <pointLight
          key={point.id}
          intensity={point.intensity}
          color={point.color}
          position={point.position}
          distance={point.distance}
          decay={point.decay}
        />
      ))}

      {/* Environment map for reflections/IBL */}
      {lighting.environmentMap && (
        <Environment
          files={lighting.environmentMap}
          background={false}
        />
      )}
    </>
  );
}

// ============================================================================
// Background Component
// ============================================================================

function EnvironmentBackground() {
  const background = useBackground();
  const { scene } = useThree();

  // Apply background based on type
  useMemo(() => {
    switch (background.type) {
      case 'solid':
        scene.background = new THREE.Color(background.color);
        break;

      case 'gradient':
        // Gradient backgrounds are handled via a fullscreen quad
        scene.background = null;
        break;

      case 'transparent':
        scene.background = null;
        break;

      case 'skybox':
      case 'hdri':
        // Handled by Environment component
        break;
    }
  }, [background, scene]);

  // Gradient background implementation
  if (background.type === 'gradient') {
    return (
      <mesh position={[0, 0, -100]} scale={[200, 200, 1]}>
        <planeGeometry />
        <meshBasicMaterial>
          <GradientTexture
            stops={[0, 1]}
            colors={[background.topColor, background.bottomColor]}
            rotation={background.angle * (Math.PI / 180)}
          />
        </meshBasicMaterial>
      </mesh>
    );
  }

  // HDRI background
  if (background.type === 'hdri') {
    return (
      <Environment
        files={background.url}
        background
        blur={background.blur}
      />
    );
  }

  // Skybox presets
  if (background.type === 'skybox') {
    switch (background.preset) {
      case 'day':
        return <Sky sunPosition={[100, 20, 100]} />;
      case 'sunset':
        return <Sky sunPosition={[100, 2, 100]} />;
      case 'night':
        return <Sky sunPosition={[100, -10, 100]} />;
      case 'studio':
        return <Environment preset="studio" background />;
      case 'custom':
        // Custom cubemap textures
        return null;
    }
  }

  return null;
}

// ============================================================================
// Floor Component
// ============================================================================

function EnvironmentFloor() {
  const floor = useFloor();
  const meshRef = useRef<THREE.Mesh>(null);

  if (floor.type === 'none') return null;

  // Grid floor
  if (floor.type === 'grid') {
    return (
      <Grid
        position={[0, floor.height, 0]}
        args={[floor.size * 2, floor.size * 2]}
        cellSize={floor.gridSize}
        cellThickness={1}
        cellColor={floor.gridColor}
        sectionSize={floor.gridSize * 5}
        sectionThickness={1.5}
        sectionColor={floor.color}
        fadeDistance={floor.size}
        fadeStrength={1}
        followCamera={floor.shape === 'infinite'}
        infiniteGrid={floor.shape === 'infinite'}
      />
    );
  }

  // Solid floor
  if (floor.type === 'solid') {
    return (
      <mesh
        ref={meshRef}
        position={[0, floor.height, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        {floor.shape === 'circular' ? (
          <circleGeometry args={[floor.size, 64]} />
        ) : (
          <planeGeometry args={[floor.size * 2, floor.size * 2]} />
        )}
        <meshStandardMaterial
          color={floor.color}
          transparent={floor.opacity < 1}
          opacity={floor.opacity}
        />
      </mesh>
    );
  }

  // Reflective floor
  if (floor.type === 'reflective') {
    return (
      <mesh
        position={[0, floor.height, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        {floor.shape === 'circular' ? (
          <circleGeometry args={[floor.size, 64]} />
        ) : (
          <planeGeometry args={[floor.size * 2, floor.size * 2]} />
        )}
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={floor.reflectivity * 10}
          roughness={1 - floor.reflectivity}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color={floor.color}
          metalness={floor.reflectivity * 0.5}
          mirror={floor.reflectivity}
        />
      </mesh>
    );
  }

  return null;
}

// ============================================================================
// Fog Component
// ============================================================================

function EnvironmentFog() {
  const fog = useFog();
  const { scene } = useThree();

  useMemo(() => {
    if (!fog.enabled) {
      scene.fog = null;
      return;
    }

    if (fog.type === 'linear') {
      scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
    } else {
      scene.fog = new THREE.FogExp2(fog.color, fog.density);
    }
  }, [fog, scene]);

  return null;
}

// ============================================================================
// Main Component
// ============================================================================

export interface SpatialEnvironmentProps {
  /** Disable all environment rendering */
  disabled?: boolean;
  /** Override lighting */
  overrideLighting?: boolean;
  /** Override background */
  overrideBackground?: boolean;
  /** Override floor */
  overrideFloor?: boolean;
  /** Add contact shadows under objects */
  contactShadows?: boolean;
}

export function SpatialEnvironment({
  disabled = false,
  overrideLighting = false,
  overrideBackground = false,
  overrideFloor = false,
  contactShadows = true,
}: SpatialEnvironmentProps) {
  const floor = useFloor();

  if (disabled) return null;

  return (
    <>
      {!overrideLighting && <EnvironmentLighting />}
      {!overrideBackground && <EnvironmentBackground />}
      {!overrideFloor && <EnvironmentFloor />}
      <EnvironmentFog />

      {/* Contact shadows for grounded objects */}
      {contactShadows && floor.type !== 'none' && (
        <ContactShadows
          position={[0, floor.height + 0.001, 0]}
          opacity={0.4}
          scale={20}
          blur={2}
          far={4}
        />
      )}
    </>
  );
}

export default SpatialEnvironment;
