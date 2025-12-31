/**
 * Widget 3D Handles - Rotation Handle Component
 *
 * Torus handle above widget for rotation with snap angle indicators.
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import type { RotationHandleProps } from '../types';
import { HANDLE_CONSTANTS } from '../types';
import { useXRHaptics } from '../hooks/useXRHaptics';
import { generateSnapIndicators } from '../utils/geometryUtils';

const { ROTATION_SIZE, ROTATION_OFFSET, HOVER_SCALE, ACTIVE_SCALE } = HANDLE_CONSTANTS;

export const RotationHandle = memo(function RotationHandle({
  position,
  color,
  accentColor,
  enableHaptics,
  currentAngle = 0,
  snapEnabled = false,
  snapIncrement = 15,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: RotationHandleProps) {
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

  // Snap angle indicators (only shown when active)
  const snapIndicators = useMemo(() => {
    if (!snapEnabled || !active) return null;

    const indicators = generateSnapIndicators(snapIncrement, ROTATION_SIZE * 1.3);

    return indicators.map((indicator, i) => (
      <mesh
        key={i}
        position={indicator.position}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[
          0.002,
          0.002,
          indicator.isMain ? 0.015 : indicator.isMid ? 0.01 : 0.005,
          4
        ]} />
        <meshBasicMaterial
          color={indicator.isMain ? '#ffffff' : indicator.isMid ? accentColor : '#666666'}
          transparent
          opacity={indicator.isMain ? 1 : 0.6}
        />
      </mesh>
    ));
  }, [snapEnabled, active, snapIncrement, accentColor]);

  return (
    <group position={position}>
      {/* Connection line to widget */}
      <mesh position={[0, -ROTATION_OFFSET / 2, 0]}>
        <cylinderGeometry args={[0.002, 0.002, ROTATION_OFFSET, 8]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.5} />
      </mesh>

      {/* Snap angle indicators */}
      {snapIndicators}

      {/* Rotation ring */}
      <animated.mesh
        rotation={[Math.PI / 2, 0, 0]}
        scale={scale}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <torusGeometry args={[ROTATION_SIZE, 0.006, 8, 32]} />
        <animated.meshStandardMaterial
          color={color}
          emissive={accentColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.5}
          roughness={0.3}
        />
      </animated.mesh>

      {/* Current angle indicator */}
      <mesh
        position={[
          Math.sin(currentAngle) * ROTATION_SIZE,
          0,
          Math.cos(currentAngle) * ROTATION_SIZE,
        ]}
      >
        <sphereGeometry args={[0.008, 12, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={accentColor}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Center indicator */}
      <animated.mesh scale={scale}>
        <sphereGeometry args={[0.008, 12, 12]} />
        <animated.meshStandardMaterial
          color="#ffffff"
          emissive={accentColor}
          emissiveIntensity={emissiveIntensity}
        />
      </animated.mesh>
    </group>
  );
});

export default RotationHandle;
