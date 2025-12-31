/**
 * Widget 3D Handles - Two-Handed Manipulation Indicator
 *
 * Visual feedback during two-handed pinch-to-zoom gestures.
 */

import React, { memo } from 'react';
import { Text } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';

interface TwoHandIndicatorProps {
  active: boolean;
  scaleFactor: number;
  rotationDelta?: number;
  accentColor: string;
}

export const TwoHandIndicator = memo(function TwoHandIndicator({
  active,
  scaleFactor,
  rotationDelta = 0,
  accentColor,
}: TwoHandIndicatorProps) {
  const { opacity, ringScale } = useSpring({
    opacity: active ? 0.8 : 0,
    ringScale: active ? 1 : 0.5,
    config: { tension: 300, friction: 20 },
  });

  if (!active) return null;

  // Show rotation if significant
  const showRotation = Math.abs(rotationDelta) > 0.01;
  const rotationDeg = Math.round((rotationDelta * 180) / Math.PI);

  return (
    <group>
      {/* Scaling ring indicator */}
      <animated.mesh scale={ringScale} rotation={[0, 0, rotationDelta]}>
        <ringGeometry args={[0.15, 0.16, 32]} />
        <animated.meshBasicMaterial
          color={accentColor}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </animated.mesh>

      {/* Inner ring for visual depth */}
      <animated.mesh scale={ringScale} rotation={[0, 0, rotationDelta]}>
        <ringGeometry args={[0.12, 0.125, 32]} />
        <animated.meshBasicMaterial
          color={accentColor}
          transparent
          opacity={opacity.to(o => o * 0.5)}
          side={THREE.DoubleSide}
        />
      </animated.mesh>

      {/* Scale factor display */}
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.04}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.002}
        outlineColor="#000000"
      >
        {`${Math.round(scaleFactor * 100)}%`}
      </Text>

      {/* Rotation display (if rotating) */}
      {showRotation && (
        <Text
          position={[0, 0.15, 0]}
          fontSize={0.025}
          color={accentColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.001}
          outlineColor="#000000"
        >
          {`${rotationDeg > 0 ? '+' : ''}${rotationDeg}°`}
        </Text>
      )}
    </group>
  );
});

export default TwoHandIndicator;
