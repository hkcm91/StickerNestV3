/**
 * Widget 3D Handles - Depth Handle Component
 *
 * Bidirectional handle for Z-axis push/pull manipulation.
 * Shows both push and pull arrows for clearer affordance.
 */

import React, { useState, useCallback, memo, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import type { DepthHandleProps } from '../types';
import { HANDLE_CONSTANTS } from '../types';
import { useXRHaptics } from '../hooks/useXRHaptics';

const { DEPTH_SIZE, DEPTH_OFFSET, HOVER_SCALE, ACTIVE_SCALE, MIN_DEPTH, MAX_DEPTH } =
  HANDLE_CONSTANTS;

interface ExtendedDepthHandleProps extends DepthHandleProps {
  /** Current depth value for display */
  currentDepth?: number;
  /** Widget's quaternion for rotation compensation */
  widgetRotation?: THREE.Quaternion;
  /** Show depth label */
  showLabel?: boolean;
}

export const DepthHandle = memo(function DepthHandle({
  position,
  color,
  accentColor,
  enableHaptics,
  currentDepth = 1,
  widgetRotation,
  showLabel = true,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: ExtendedDepthHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const [dragDirection, setDragDirection] = useState<'push' | 'pull' | null>(null);
  const { triggerPreset, triggerHaptic } = useXRHaptics({ enabled: enableHaptics });

  const dragStartRef = useRef<THREE.Vector3 | null>(null);
  const lastDepthRef = useRef(currentDepth);

  // Inverse quaternion for rotation compensation
  const inverseRotation = useMemo(() => {
    if (!widgetRotation) return null;
    return widgetRotation.clone().invert();
  }, [widgetRotation]);

  const { scale, emissiveIntensity, pushScale, pullScale } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 1 : hovered ? 0.6 : 0.3,
    pushScale: dragDirection === 'push' ? 1.3 : 1,
    pullScale: dragDirection === 'pull' ? 1.3 : 1,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setActive(true);
      dragStartRef.current = e.point.clone();
      lastDepthRef.current = currentDepth;
      triggerPreset('both', 'grab');
      onDragStart(e.point);
    },
    [currentDepth, onDragStart, triggerPreset]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setActive(false);
      setDragDirection(null);
      dragStartRef.current = null;
      triggerPreset('both', 'release');
      onDragEnd();
    },
    [onDragEnd, triggerPreset]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!active || !dragStartRef.current) return;

      // Calculate delta in world space
      let delta = e.point.clone().sub(dragStartRef.current);

      // Apply rotation compensation if widget is rotated
      if (inverseRotation) {
        delta.applyQuaternion(inverseRotation);
      }

      // Use Z component for depth change
      const depthDelta = delta.z;

      // Determine drag direction for visual feedback
      if (Math.abs(depthDelta) > 0.01) {
        setDragDirection(depthDelta > 0 ? 'push' : 'pull');

        // Haptic feedback at limits
        const newDepth = lastDepthRef.current + depthDelta;
        if (newDepth <= MIN_DEPTH || newDepth >= MAX_DEPTH) {
          triggerHaptic('both', 0.5, 30);
        }
      }

      onDrag(e.point);
    },
    [active, inverseRotation, onDrag, triggerHaptic]
  );

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
      setDragDirection(null);
      dragStartRef.current = null;
      onDragEnd();
    }
  }, [active, onDragEnd, onHover]);

  // Format depth for display
  const depthLabel = useMemo(() => {
    if (currentDepth >= 1) {
      return `${currentDepth.toFixed(1)}m`;
    }
    return `${Math.round(currentDepth * 100)}cm`;
  }, [currentDepth]);

  return (
    <group position={position}>
      {/* Center connection line */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, DEPTH_OFFSET * 2, 8]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.4} />
      </mesh>

      {/* Push arrow (forward/away from user) */}
      <animated.mesh
        position={[0, 0, DEPTH_OFFSET]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={pushScale.to((s) => [s * (hovered || active ? 1 : 0.8), s, s * (hovered || active ? 1 : 0.8)])}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <coneGeometry args={[DEPTH_SIZE, DEPTH_SIZE * 2, 8]} />
        <animated.meshStandardMaterial
          color={dragDirection === 'push' ? '#22c55e' : color}
          emissive={accentColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.4}
          roughness={0.3}
        />
      </animated.mesh>

      {/* Pull arrow (backward/toward user) */}
      <animated.mesh
        position={[0, 0, -DEPTH_OFFSET]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={pullScale.to((s) => [s * (hovered || active ? 1 : 0.8), s, s * (hovered || active ? 1 : 0.8)])}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <coneGeometry args={[DEPTH_SIZE, DEPTH_SIZE * 2, 8]} />
        <animated.meshStandardMaterial
          color={dragDirection === 'pull' ? '#22c55e' : color}
          emissive={accentColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.4}
          roughness={0.3}
        />
      </animated.mesh>

      {/* Center sphere (grab point) */}
      <animated.mesh scale={scale}>
        <sphereGeometry args={[0.01, 12, 12]} />
        <animated.meshStandardMaterial
          color={color}
          emissive={accentColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.4}
          roughness={0.3}
        />
      </animated.mesh>

      {/* Depth label */}
      {showLabel && (hovered || active) && (
        <Text
          position={[0, 0.04, 0]}
          fontSize={0.018}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.001}
          outlineColor="#000000"
        >
          {depthLabel}
        </Text>
      )}

      {/* Direction hint when active */}
      {active && dragDirection && (
        <Text
          position={[0, -0.04, 0]}
          fontSize={0.012}
          color={accentColor}
          anchorX="center"
          anchorY="middle"
        >
          {dragDirection === 'push' ? '→ Push' : '← Pull'}
        </Text>
      )}
    </group>
  );
});

export default DepthHandle;
