/**
 * Widget 3D Handles - Selection Border Component
 *
 * Dashed border around selected widget with proper computeLineDistances.
 */

import React, { useMemo, useRef, useEffect, memo } from 'react';
import * as THREE from 'three';
import { createSelectionBorderPoints } from '../utils/geometryUtils';

interface SelectionBorderProps {
  width: number;
  height: number;
  color: string;
  zOffset: number;
  isSnapped?: boolean;
}

export const SelectionBorder = memo(function SelectionBorder({
  width,
  height,
  color,
  zOffset,
  isSnapped = false,
}: SelectionBorderProps) {
  const dashedLineRef = useRef<THREE.Line>(null);
  const solidLineRef = useRef<THREE.Line>(null);

  const points = useMemo(() => {
    return createSelectionBorderPoints(width, height, zOffset);
  }, [width, height, zOffset]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    // Compute line distances for dashed material to work
    geometry.computeBoundingBox();
    return geometry;
  }, [points]);

  // Compute line distances after mount for dashed line
  useEffect(() => {
    if (dashedLineRef.current) {
      dashedLineRef.current.computeLineDistances();
    }
  }, [points]);

  const displayColor = isSnapped ? '#22c55e' : color;

  return (
    <group>
      {/* Dashed selection line - needs computeLineDistances */}
      <line ref={dashedLineRef} geometry={lineGeometry}>
        <lineDashedMaterial
          color={displayColor}
          dashSize={0.015}
          gapSize={0.008}
          linewidth={2}
        />
      </line>

      {/* Solid glow line behind */}
      <line ref={solidLineRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color={displayColor}
          transparent
          opacity={isSnapped ? 0.5 : 0.3}
          linewidth={4}
        />
      </line>
    </group>
  );
});

export default SelectionBorder;
