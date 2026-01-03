/**
 * XREnvironment - Immersive VR/AR environment components
 *
 * Provides starfield skybox and ambient environment effects.
 * Grid-free for a cleaner, more immersive experience.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useSpatialModeStore, useActiveSpatialMode } from '../../../state/useSpatialModeStore';

// ============================================================================
// Space Environment - Stars and Nebulae (No Grid)
// ============================================================================

export interface SpaceEnvironmentProps {
  radius?: number;
}

/**
 * Creates a shader material for the space environment.
 * Renders stars, nebulae, and atmospheric effects without grid lines.
 */
function useSpaceSphereMaterial() {
  return useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;

        varying vec3 vPosition;
        varying vec2 vUv;

        // Hash function for procedural generation
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // Star field function
        float stars(vec2 uv, float density, float threshold) {
          vec2 cell = floor(uv * density);
          vec2 offset = fract(uv * density) - 0.5;
          float starVal = hash(cell);
          float brightness = step(threshold, starVal);
          float dist = length(offset);
          return brightness * smoothstep(0.25, 0.0, dist) * (0.6 + 0.4 * starVal);
        }

        void main() {
          vec3 pos = normalize(vPosition);
          float theta = atan(pos.z, pos.x);
          float phi = acos(pos.y);
          float heightFactor = pos.y;

          // Sky gradient colors
          vec3 zenithColor = vec3(0.02, 0.01, 0.08);
          vec3 midSkyColor = vec3(0.04, 0.02, 0.12);
          vec3 horizonColor = vec3(0.08, 0.04, 0.16);
          vec3 nadirColor = vec3(0.01, 0.01, 0.03);

          // Nebula variations
          float nebulaPattern = hash(floor(vec2(theta * 2.0, phi * 2.0)));
          vec3 nebulaColor1 = vec3(0.12, 0.04, 0.20);
          vec3 nebulaColor2 = vec3(0.04, 0.06, 0.16);
          vec3 nebulaBlend = mix(nebulaColor1, nebulaColor2, nebulaPattern);

          // Build sky gradient
          vec3 skyColor;
          if (heightFactor > 0.0) {
            float t1 = smoothstep(0.0, 0.4, heightFactor);
            float t2 = smoothstep(0.4, 0.9, heightFactor);
            skyColor = mix(horizonColor, midSkyColor, t1);
            skyColor = mix(skyColor, zenithColor, t2);
            float nebulaStrength = smoothstep(0.2, 0.7, heightFactor) * 0.25 * nebulaPattern;
            skyColor = mix(skyColor, nebulaBlend, nebulaStrength);
          } else {
            float t = smoothstep(0.0, -0.3, heightFactor);
            skyColor = mix(horizonColor, nadirColor, t);
          }

          // Stars - multiple layers
          float starIntensity = 0.0;
          if (heightFactor > -0.2) {
            vec2 starUV = vec2(theta, phi);
            // Bright stars
            starIntensity = stars(starUV * 3.0, 30.0, 0.92) * 1.4;
            // Medium stars
            starIntensity += stars(starUV * 6.0, 60.0, 0.94) * 0.9;
            // Dim stars
            starIntensity += stars(starUV * 12.0, 120.0, 0.96) * 0.6;
            // Star clusters
            float clusterNoise = hash(floor(starUV * 2.0));
            if (clusterNoise > 0.7) {
              starIntensity += stars(starUV * 20.0, 200.0, 0.93) * 0.7;
            }
            starIntensity *= smoothstep(-0.2, 0.2, heightFactor);
          }

          // Star color variation
          float starHue = hash(floor(vec2(theta, phi) * 10.0));
          vec3 starTint = mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.9, 0.8), starHue * 0.3);
          vec3 starColor = starTint * starIntensity;

          // Horizon glow
          float horizonGlow = exp(-abs(heightFactor) * 6.0) * 0.2;
          vec3 horizonGlowColor = vec3(0.3, 0.15, 0.5) * horizonGlow;

          // Nebula clouds
          float cloudPattern = 0.0;
          if (heightFactor > 0.1) {
            vec2 cloudUV = vec2(theta * 0.5, phi * 0.5);
            float c1 = hash(floor(cloudUV * 3.0));
            float c2 = hash(floor(cloudUV * 5.0 + 0.5));
            cloudPattern = smoothstep(0.6, 0.8, c1) * smoothstep(0.5, 0.7, c2);
            cloudPattern *= smoothstep(0.1, 0.5, heightFactor);
          }
          vec3 nebulaCloudColor = mix(vec3(0.15, 0.08, 0.28), vec3(0.08, 0.12, 0.25), hash(vec2(theta, phi)));
          vec3 cloudContribution = nebulaCloudColor * cloudPattern * 0.35;

          // Combine all elements
          vec3 finalColor = skyColor + starColor + horizonGlowColor + cloudContribution;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    return material;
  }, []);
}

/**
 * Space environment for VR - starfield with nebulae and atmospheric effects.
 * No grid lines for a cleaner, more immersive experience.
 */
export function SpaceEnvironment({ radius = 50 }: SpaceEnvironmentProps) {
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);

  const material = useSpaceSphereMaterial();

  // Check if we're in AR mode
  const isARSession =
    spatialMode === 'ar' ||
    (sessionState === 'active' && targetMode === 'ar') ||
    (sessionState === 'requesting' && targetMode === 'ar');

  // Only show in VR or desktop 3D preview
  const shouldShow =
    spatialMode === 'vr' ||
    (sessionState === 'active' && !isARSession) ||
    (sessionState === 'requesting' && targetMode === 'vr');

  if (isARSession || !shouldShow) {
    return null;
  }

  return (
    <group name="space-environment">
      <mesh material={material}>
        <sphereGeometry args={[radius, 64, 64]} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Floor - Simple dark floor for VR
// ============================================================================

export function VRFloor() {
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);

  // Hide in AR mode
  const isARMode =
    spatialMode === 'ar' || (sessionState === 'requesting' && targetMode === 'ar');

  if (isARMode) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <circleGeometry args={[30, 64]} />
      <meshStandardMaterial
        color="#0a0a12"
        metalness={0.3}
        roughness={0.7}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}
