/**
 * Widget 3D Handles - Rotation Handle Component
 *
 * Torus handle above widget for rotation with:
 * - Snap angle indicators (shown on hover)
 * - Fine-tune mode for slow/precise rotation
 * - Cumulative angle tracking for accurate snapping
 * - Visual feedback for snap and fine-tune states
 */

import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import type { RotationHandleProps } from '../types';
import { HANDLE_CONSTANTS } from '../types';
import { useXRHaptics } from '../hooks/useXRHaptics';

const { ROTATION_SIZE, ROTATION_OFFSET, HOVER_SCALE, ACTIVE_SCALE } = HANDLE_CONSTANTS;

// Fine-tune mode thresholds
const FINE_TUNE_SPEED_THRESHOLD = 0.005; // rad/frame - below this triggers fine-tune
const FINE_TUNE_SNAP_MULTIPLIER = 0.3; // Reduced snap strength in fine-tune mode

interface ExtendedRotationHandleProps extends RotationHandleProps {
  /** Total accumulated rotation (for display) */
  totalRotation?: number;
  /** Callback for fine-tune mode changes */
  onFineTuneModeChange?: (enabled: boolean) => void;
}

export const RotationHandle = memo(function RotationHandle({
  position,
  color,
  accentColor,
  enableHaptics,
  currentAngle = 0,
  totalRotation = 0,
  snapEnabled = false,
  snapIncrement = 15,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
  onFineTuneModeChange,
}: ExtendedRotationHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const [fineTuneMode, setFineTuneMode] = useState(false);
  const [nearestSnap, setNearestSnap] = useState<number | null>(null);

  const { triggerPreset, triggerHaptic } = useXRHaptics({ enabled: enableHaptics });

  // Track rotation speed for fine-tune detection
  const lastAngleRef = useRef(currentAngle);
  const speedRef = useRef(0);
  const fineTuneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { scale, emissiveIntensity, indicatorOpacity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 1 : hovered ? 0.6 : 0.3,
    // Show indicators on hover OR active
    indicatorOpacity: (hovered || active) && snapEnabled ? 1 : 0,
    config: { tension: 400, friction: 25 },
  });

  // Track rotation speed
  useFrame(() => {
    if (active) {
      const angleDelta = Math.abs(currentAngle - lastAngleRef.current);
      speedRef.current = angleDelta;
      lastAngleRef.current = currentAngle;

      // Detect fine-tune mode based on slow rotation
      const shouldFineTune = angleDelta < FINE_TUNE_SPEED_THRESHOLD && angleDelta > 0;

      if (shouldFineTune && !fineTuneMode) {
        // Debounce entering fine-tune mode
        if (!fineTuneTimeoutRef.current) {
          fineTuneTimeoutRef.current = setTimeout(() => {
            setFineTuneMode(true);
            onFineTuneModeChange?.(true);
            triggerHaptic('both', 0.2, 30);
          }, 200);
        }
      } else if (!shouldFineTune && fineTuneMode) {
        // Exit fine-tune mode immediately when moving fast
        if (fineTuneTimeoutRef.current) {
          clearTimeout(fineTuneTimeoutRef.current);
          fineTuneTimeoutRef.current = null;
        }
        setFineTuneMode(false);
        onFineTuneModeChange?.(false);
      }

      // Calculate nearest snap angle for visual feedback
      if (snapEnabled) {
        const snapRad = (snapIncrement * Math.PI) / 180;
        const nearest = Math.round(totalRotation / snapRad) * snapRad;
        const nearestDeg = Math.round((nearest * 180) / Math.PI);
        setNearestSnap(nearestDeg);
      }
    }
  });

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setActive(true);
      setFineTuneMode(false);
      lastAngleRef.current = currentAngle;
      triggerPreset('both', 'grab');
      onDragStart(e.point);
    },
    [currentAngle, onDragStart, triggerPreset]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setActive(false);
      setFineTuneMode(false);
      setNearestSnap(null);

      if (fineTuneTimeoutRef.current) {
        clearTimeout(fineTuneTimeoutRef.current);
        fineTuneTimeoutRef.current = null;
      }

      triggerPreset('both', 'release');
      onDragEnd();
    },
    [onDragEnd, triggerPreset]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (active) {
        onDrag(e.point);
      }
    },
    [active, onDrag]
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
      setFineTuneMode(false);
      onDragEnd();
    }
  }, [active, onDragEnd, onHover]);

  // Generate snap indicators dynamically based on increment
  const snapIndicators = useMemo(() => {
    if (!snapEnabled) return null;

    const indicators: Array<{
      angle: number;
      isMain: boolean;
      isMid: boolean;
      position: [number, number, number];
    }> = [];

    const count = Math.floor(360 / snapIncrement);

    for (let i = 0; i < count; i++) {
      const angleDeg = i * snapIncrement;
      const angleRad = (angleDeg * Math.PI) / 180;
      const isMain = angleDeg % 90 === 0;
      const isMid = angleDeg % 45 === 0;

      indicators.push({
        angle: angleDeg,
        isMain,
        isMid,
        position: [
          Math.sin(angleRad) * ROTATION_SIZE * 1.3,
          0,
          Math.cos(angleRad) * ROTATION_SIZE * 1.3,
        ] as [number, number, number],
      });
    }

    return indicators;
  }, [snapEnabled, snapIncrement]);

  // Format angle for display
  const displayAngle = useMemo(() => {
    const deg = Math.round((totalRotation * 180) / Math.PI);
    return `${deg >= 0 ? '+' : ''}${deg}°`;
  }, [totalRotation]);

  return (
    <group position={position}>
      {/* Connection line to widget */}
      <mesh position={[0, -ROTATION_OFFSET / 2, 0]}>
        <cylinderGeometry args={[0.002, 0.002, ROTATION_OFFSET, 8]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.5} />
      </mesh>

      {/* Snap angle indicators - visible on hover or active */}
      {snapIndicators?.map((indicator, i) => (
        <animated.mesh
          key={i}
          position={indicator.position}
          rotation={[Math.PI / 2, 0, 0]}
          scale={indicatorOpacity.to((o) => [1, 1, o])}
        >
          <cylinderGeometry
            args={[0.002, 0.002, indicator.isMain ? 0.015 : indicator.isMid ? 0.01 : 0.005, 4]}
          />
          <animated.meshBasicMaterial
            color={
              nearestSnap === indicator.angle
                ? '#22c55e'
                : indicator.isMain
                ? '#ffffff'
                : indicator.isMid
                ? accentColor
                : '#666666'
            }
            transparent
            opacity={indicatorOpacity.to((o) => (indicator.isMain ? o : o * 0.6))}
          />
        </animated.mesh>
      ))}

      {/* Outer guide ring (shows on hover) */}
      <animated.mesh rotation={[Math.PI / 2, 0, 0]} scale={indicatorOpacity.to((o) => [1.3, 1.3, o])}>
        <torusGeometry args={[ROTATION_SIZE * 1.3, 0.002, 8, 64]} />
        <animated.meshBasicMaterial
          color={accentColor}
          transparent
          opacity={indicatorOpacity.to((o) => o * 0.3)}
        />
      </animated.mesh>

      {/* Main rotation ring */}
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
          color={fineTuneMode ? '#fbbf24' : color}
          emissive={fineTuneMode ? '#fbbf24' : accentColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.5}
          roughness={0.3}
        />
      </animated.mesh>

      {/* Current angle indicator (moves with rotation) */}
      <mesh
        position={[
          Math.sin(currentAngle) * ROTATION_SIZE,
          0,
          Math.cos(currentAngle) * ROTATION_SIZE,
        ]}
      >
        <sphereGeometry args={[0.008, 12, 12]} />
        <meshStandardMaterial
          color={nearestSnap !== null ? '#22c55e' : '#ffffff'}
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

      {/* Angle display */}
      {active && (
        <Text
          position={[0, 0.05, 0]}
          fontSize={0.02}
          color={nearestSnap !== null ? '#22c55e' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.001}
          outlineColor="#000000"
        >
          {displayAngle}
        </Text>
      )}

      {/* Fine-tune mode indicator */}
      {fineTuneMode && (
        <Text
          position={[0, -0.04, 0]}
          fontSize={0.012}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
        >
          Fine-tune
        </Text>
      )}

      {/* Nearest snap indicator (when snapping) */}
      {active && snapEnabled && nearestSnap !== null && (
        <Text
          position={[0, 0.08, 0]}
          fontSize={0.012}
          color="#22c55e"
          anchorX="center"
          anchorY="middle"
        >
          → {nearestSnap}°
        </Text>
      )}
    </group>
  );
});

export default RotationHandle;
