/**
 * Widget 3D Handles - Size Indicator Component
 *
 * Displays current widget dimensions and state during manipulation.
 */

import React, { memo } from 'react';
import { Text } from '@react-three/drei';
import type { HandleType } from '../types';

interface SizeIndicatorProps {
  position: [number, number, number];
  width: number;
  height: number;
  activeHandle: HandleType | null;
  isTwoHandActive: boolean;
  twoHandScale: number;
  isSnapped: boolean;
  accentColor: string;
}

export const SizeIndicator = memo(function SizeIndicator({
  position,
  width,
  height,
  activeHandle,
  isTwoHandActive,
  twoHandScale,
  isSnapped,
  accentColor,
}: SizeIndicatorProps) {
  // Only show when manipulating
  if (!activeHandle && !isTwoHandActive) return null;

  // Determine display text
  let displayText = '';
  if (activeHandle === 'rotate') {
    displayText = `${isSnapped ? '⚡ ' : ''}Rotate`;
  } else if (activeHandle === 'depth') {
    displayText = 'Depth';
  } else if (isTwoHandActive) {
    displayText = `Scale: ${Math.round(twoHandScale * 100)}%`;
  } else {
    // Resize - show dimensions in centimeters
    displayText = `${Math.round(width * 100)}×${Math.round(height * 100)}cm${isSnapped ? ' ⚡' : ''}`;
  }

  return (
    <group position={position}>
      {/* Background panel */}
      <mesh>
        <planeGeometry args={[0.18, 0.035]} />
        <meshBasicMaterial color="#1a1a25" transparent opacity={0.95} />
      </mesh>

      {/* Text label */}
      <Text
        position={[0, 0, 0.001]}
        fontSize={0.014}
        color={isSnapped ? '#22c55e' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
      >
        {displayText}
      </Text>
    </group>
  );
});

export default SizeIndicator;
