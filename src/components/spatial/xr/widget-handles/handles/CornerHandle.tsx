/**
 * Widget 3D Handles - Corner Handle Component
 *
 * Spherical handles at widget corners for diagonal resize.
 * Supports optional aspect ratio lock via double-tap.
 */

import React, { useState, useCallback, memo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import type { CornerHandleProps, HandleType } from '../types';
import { HANDLE_CONSTANTS, HAPTIC_PRESETS } from '../types';
import { useXRHaptics } from '../hooks/useXRHaptics';

const { CORNER_SIZE, HOVER_SCALE, ACTIVE_SCALE } = HANDLE_CONSTANTS;

export const CornerHandle = memo(function CornerHandle({
  position,
  type,
  color,
  accentColor,
  enableHaptics,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
  onDoubleTap,
}: CornerHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const { triggerPreset } = useXRHaptics({ enabled: enableHaptics });

  // Track double-tap
  const lastTapRef = React.useRef<number>(0);

  const { scale, emissiveIntensity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 0.8 : hovered ? 0.5 : 0.2,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    // Check for double-tap
    const now = Date.now();
    if (now - lastTapRef.current < 300 && onDoubleTap) {
      onDoubleTap();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    setActive(true);
    triggerPreset('both', 'grab');
    onDragStart(type, e.point);
  }, [type, onDragStart, triggerPreset, onDoubleTap]);

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
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <sphereGeometry args={[CORNER_SIZE / 2, 16, 16]} />
      <animated.meshStandardMaterial
        color={color}
        emissive={accentColor}
        emissiveIntensity={emissiveIntensity}
        metalness={0.4}
        roughness={0.3}
      />
    </animated.mesh>
  );
});

export default CornerHandle;
