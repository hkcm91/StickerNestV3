/**
 * Widget 3D Handles - Edge Handle Component
 *
 * Capsule handles at widget edges for single-axis resize.
 */

import React, { useState, useCallback, memo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import type { EdgeHandleProps } from '../types';
import { HANDLE_CONSTANTS } from '../types';
import { useXRHaptics } from '../hooks/useXRHaptics';

const { EDGE_SIZE, EDGE_LENGTH, HOVER_SCALE, ACTIVE_SCALE } = HANDLE_CONSTANTS;

export const EdgeHandle = memo(function EdgeHandle({
  position,
  rotation,
  type,
  color,
  accentColor,
  enableHaptics,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: EdgeHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const { triggerPreset } = useXRHaptics({ enabled: enableHaptics });

  const { scale, emissiveIntensity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 0.8 : hovered ? 0.5 : 0.15,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(true);
    triggerPreset('both', 'grab');
    onDragStart(type, e.point);
  }, [type, onDragStart, triggerPreset]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(false);
    triggerPreset('both', 'release');
    onDragEnd();
  }, [onDragEnd, triggerPreset]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (active) {
      onDrag(e.point);
    }
  }, [active, onDrag]);

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    onHover(true);
    triggerPreset('both', 'hover');
  }, [onHover, triggerPreset]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    onHover(false);
    if (active) {
      setActive(false);
      onDragEnd();
    }
  }, [active, onDragEnd, onHover]);

  return (
    <animated.mesh
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <capsuleGeometry args={[EDGE_SIZE / 2, EDGE_LENGTH, 8, 16]} />
      <animated.meshStandardMaterial
        color={color}
        emissive={accentColor}
        emissiveIntensity={emissiveIntensity}
        metalness={0.3}
        roughness={0.4}
      />
    </animated.mesh>
  );
});

export default EdgeHandle;
