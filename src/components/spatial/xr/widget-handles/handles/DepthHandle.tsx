/**
 * Widget 3D Handles - Depth Handle Component
 *
 * Cone handle for Z-axis push/pull manipulation.
 */

import React, { useState, useCallback, memo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import type { DepthHandleProps } from '../types';
import { HANDLE_CONSTANTS } from '../types';
import { useXRHaptics } from '../hooks/useXRHaptics';

const { DEPTH_SIZE, DEPTH_OFFSET, HOVER_SCALE, ACTIVE_SCALE } = HANDLE_CONSTANTS;

export const DepthHandle = memo(function DepthHandle({
  position,
  color,
  accentColor,
  enableHaptics,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: DepthHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const { triggerPreset } = useXRHaptics({ enabled: enableHaptics });

  const { scale, emissiveIntensity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 1 : hovered ? 0.6 : 0.3,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(true);
    triggerPreset('both', 'grab');
    onDragStart(e.point);
  }, [onDragStart, triggerPreset]);

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
    <group position={position}>
      {/* Depth axis line (shows Z direction) */}
      <mesh position={[0, 0, DEPTH_OFFSET / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, DEPTH_OFFSET, 8]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.4} />
      </mesh>

      {/* Arrow/cone pointing forward */}
      <animated.mesh
        position={[0, 0, DEPTH_OFFSET]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={scale}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <coneGeometry args={[DEPTH_SIZE, DEPTH_SIZE * 2, 8]} />
        <animated.meshStandardMaterial
          color={color}
          emissive={accentColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.4}
          roughness={0.3}
        />
      </animated.mesh>

      {/* Small sphere at base */}
      <mesh>
        <sphereGeometry args={[0.006, 8, 8]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.6} />
      </mesh>
    </group>
  );
});

export default DepthHandle;
