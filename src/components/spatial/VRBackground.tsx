/**
 * StickerNest - VR Background
 *
 * Provides a solid, opaque background for VR mode.
 * This ensures VR experiences have a proper environment rather than
 * seeing through to transparency.
 *
 * - VR Mode: Renders a dark space-like sphere environment
 * - AR Mode: Does NOT render (passthrough should show real world)
 * - Desktop 3D Preview: Renders when active for consistency
 *
 * IMPORTANT: WebXR VR sessions need actual geometry to render as background.
 * The gl.setClearColor() alone is not sufficient - we need a physical
 * background mesh that the VR headset can display.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useXR } from '@react-three/xr';
import { useSpatialModeStore, useActiveSpatialMode } from '../../state/useSpatialModeStore';

// ============================================================================
// VR Background Sphere Material
// ============================================================================

/**
 * Creates a shader material for the VR background.
 * Renders a dark space environment with subtle gradient and stars.
 */
function useVRBackgroundMaterial() {
  return useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color('#0a0a1a') },      // Deep space at top
        uMidColor: { value: new THREE.Color('#0d0d1f') },      // Mid-space
        uBottomColor: { value: new THREE.Color('#050510') },   // Darker at bottom
        uHorizonColor: { value: new THREE.Color('#1a1a3a') },  // Subtle horizon glow
      },
      vertexShader: `
        varying vec3 vWorldPosition;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uBottomColor;
        uniform vec3 uHorizonColor;

        varying vec3 vWorldPosition;

        // Simple hash for stars
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // Star field
        float stars(vec2 uv, float density) {
          vec2 cell = floor(uv * density);
          vec2 offset = fract(uv * density) - 0.5;
          float starVal = hash(cell);
          float brightness = step(0.97, starVal);
          float dist = length(offset);
          return brightness * smoothstep(0.15, 0.0, dist) * (0.5 + 0.5 * starVal);
        }

        void main() {
          vec3 pos = normalize(vWorldPosition);
          float height = pos.y; // -1 to 1

          // Gradient from bottom to top
          vec3 color;
          if (height > 0.0) {
            // Upper half: mid to top
            float t = smoothstep(0.0, 0.8, height);
            color = mix(uMidColor, uTopColor, t);
          } else {
            // Lower half: bottom to mid
            float t = smoothstep(-0.8, 0.0, height);
            color = mix(uBottomColor, uMidColor, t);
          }

          // Horizon glow
          float horizonGlow = exp(-abs(height) * 8.0) * 0.15;
          color = mix(color, uHorizonColor, horizonGlow);

          // Stars (only in upper hemisphere)
          if (height > -0.2) {
            float theta = atan(pos.z, pos.x);
            float phi = acos(pos.y);
            vec2 starUV = vec2(theta, phi);

            float starIntensity = 0.0;
            starIntensity += stars(starUV * 5.0, 40.0) * 0.8;
            starIntensity += stars(starUV * 10.0, 80.0) * 0.5;
            starIntensity += stars(starUV * 20.0, 160.0) * 0.3;
            starIntensity *= smoothstep(-0.2, 0.3, height);

            color += vec3(starIntensity);
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    return material;
  }, []);
}

// ============================================================================
// VR Background Component
// ============================================================================

interface VRBackgroundProps {
  /** Radius of the background sphere (should be large) */
  radius?: number;
  /** Force show even in non-VR mode (for 3D preview) */
  forceShow?: boolean;
}

/**
 * Renders a solid background sphere for VR mode.
 * Automatically hides in AR mode to allow passthrough.
 */
export function VRBackground({ radius = 100, forceShow = false }: VRBackgroundProps) {
  const session = useXR((state) => state.session);
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);

  const material = useVRBackgroundMaterial();

  // Determine if we're in AR mode (should NOT show background)
  const isARMode = spatialMode === 'ar' ||
    (sessionState === 'requesting' && targetMode === 'ar') ||
    (sessionState === 'active' && targetMode === 'ar');

  // Check session type directly
  const sessionMode = session ? (session as unknown as { mode?: string })?.mode : null;
  const isARSession = sessionMode === 'immersive-ar';

  // Don't render in AR mode - we want passthrough
  if (isARMode || isARSession) {
    console.log('[VRBackground] Hidden for AR mode');
    return null;
  }

  // Determine if we should show background
  // Show when:
  // 1. forceShow is true (desktop 3D preview)
  // 2. In VR mode (spatialMode === 'vr')
  // 3. Active XR session that's NOT AR
  // 4. Transitioning to VR
  const isVRSession = sessionMode === 'immersive-vr';
  const isTransitioningToVR = sessionState === 'requesting' && targetMode === 'vr';
  const shouldShow = forceShow ||
    spatialMode === 'vr' ||
    isVRSession ||
    isTransitioningToVR ||
    sessionState === 'active';

  if (!shouldShow) {
    return null;
  }

  console.log('[VRBackground] Rendering opaque background for VR');

  return (
    <mesh material={material} renderOrder={-1000}>
      <sphereGeometry args={[radius, 64, 64]} />
    </mesh>
  );
}

export default VRBackground;
