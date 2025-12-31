/**
 * StickerNest - Widget 3D Handles (Industry Standard VR Edition)
 *
 * 3D manipulation handles for widgets in VR/AR space with full
 * industry-standard interaction patterns matching Quest and Vision Pro.
 *
 * Features:
 * - Corner handles (spheres): Resize from corners with optional aspect ratio lock
 * - Edge handles (capsules): Resize from edges, single-axis scaling
 * - Rotation handle (torus): Rotate widget around its normal axis with snap angles
 * - Depth handle (cone): Push/pull widget closer or further (Z-axis)
 * - Two-handed manipulation: Pinch-to-zoom with both hands
 * - XR Controller Haptics: Tactile feedback on Quest/Vision Pro
 * - Snap-to-grid: Size snapping for precise alignment
 * - Snap angles: 15°/45°/90° rotation snapping
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useFrame, ThreeEvent, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useXR, useXRInputSourceState } from '@react-three/xr';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

export type HandleType =
  | 'corner-nw' | 'corner-ne' | 'corner-se' | 'corner-sw'
  | 'edge-n' | 'edge-e' | 'edge-s' | 'edge-w'
  | 'rotate'
  | 'depth'
  | 'move';

export interface Widget3DHandlesProps {
  /** Width of the widget panel in meters */
  width: number;
  /** Height of the widget panel in meters */
  height: number;
  /** Current depth (Z position) in meters */
  depth?: number;
  /** Whether the widget is currently selected */
  selected: boolean;
  /** Whether handles should be interactive */
  interactive?: boolean;
  /** Accent color for handles */
  accentColor?: string;
  /** Enable haptic feedback for XR controllers */
  enableHaptics?: boolean;
  /** Enable two-handed manipulation (pinch-to-zoom) */
  enableTwoHanded?: boolean;
  /** Enable snap-to-grid for size */
  snapToGrid?: boolean;
  /** Grid size for snapping in meters */
  gridSize?: number;
  /** Enable snap angles for rotation */
  snapAngles?: boolean;
  /** Snap angle increment in degrees */
  snapAngleIncrement?: number;
  /** Lock aspect ratio during corner resize */
  lockAspectRatio?: boolean;
  /** Called when resize starts */
  onResizeStart?: (handle: HandleType) => void;
  /** Called during resize with new dimensions */
  onResize?: (width: number, height: number, handle: HandleType) => void;
  /** Called when resize ends */
  onResizeEnd?: () => void;
  /** Called when rotation starts */
  onRotateStart?: () => void;
  /** Called during rotation with angle delta */
  onRotate?: (angleDelta: number) => void;
  /** Called when rotation ends */
  onRotateEnd?: () => void;
  /** Called when depth changes */
  onDepthChange?: (depthDelta: number) => void;
  /** Called when move/grab starts */
  onMoveStart?: (point: THREE.Vector3) => void;
  /** Called during move */
  onMove?: (point: THREE.Vector3, delta: THREE.Vector3) => void;
  /** Called when move ends */
  onMoveEnd?: () => void;
  /** Called during two-handed scale */
  onTwoHandedScale?: (scaleFactor: number) => void;
  /** Z offset from widget surface */
  zOffset?: number;
}

export interface TwoHandedState {
  active: boolean;
  initialDistance: number;
  initialWidth: number;
  initialHeight: number;
  leftHandPos: THREE.Vector3;
  rightHandPos: THREE.Vector3;
}

// ============================================================================
// Constants
// ============================================================================

const HANDLE_SIZE = 0.025; // meters - size of corner handles
const EDGE_HANDLE_SIZE = 0.018; // meters - size of edge handles
const EDGE_HANDLE_LENGTH = 0.06; // meters - length of edge handle capsules
const ROTATION_HANDLE_OFFSET = 0.08; // meters - distance above widget
const ROTATION_HANDLE_SIZE = 0.03; // meters
const DEPTH_HANDLE_OFFSET = 0.06; // meters - distance in front of widget
const DEPTH_HANDLE_SIZE = 0.02; // meters
const HOVER_SCALE = 1.3;
const ACTIVE_SCALE = 1.5;
const MIN_SIZE = 0.05; // meters - minimum widget dimension
const MAX_SIZE = 5.0; // meters - maximum widget dimension

// Haptic intensities (0-1)
const HAPTIC = {
  HOVER: 0.1,
  GRAB: 0.6,
  DRAG: 0.15,
  RELEASE: 0.3,
  SNAP: 0.4,
  TWO_HAND_START: 0.8,
};

// Snap thresholds
const SNAP_THRESHOLD = 0.008; // meters - distance to trigger grid snap
const ANGLE_SNAP_THRESHOLD = 3; // degrees - threshold to snap to angle

// ============================================================================
// XR Haptics Hook
// ============================================================================

function useXRHaptics() {
  const leftControllerState = useXRInputSourceState('controller', 'left');
  const rightControllerState = useXRInputSourceState('controller', 'right');

  const triggerHaptic = useCallback((
    hand: 'left' | 'right' | 'both',
    intensity: number,
    duration: number = 50
  ) => {
    const trigger = (state: typeof leftControllerState) => {
      const gamepad = state?.inputSource?.gamepad;
      if (gamepad?.hapticActuators?.[0]) {
        try {
          gamepad.hapticActuators[0].pulse(intensity, duration);
        } catch (e) {
          // Haptics not supported or failed
        }
      }
    };

    if (hand === 'left' || hand === 'both') {
      trigger(leftControllerState);
    }
    if (hand === 'right' || hand === 'both') {
      trigger(rightControllerState);
    }
  }, [leftControllerState, rightControllerState]);

  return { triggerHaptic };
}

// ============================================================================
// Two-Handed Detection Hook
// ============================================================================

function useTwoHandedManipulation(
  enabled: boolean,
  onScaleChange: (factor: number) => void,
  onStart: () => void,
  onEnd: () => void
) {
  const leftControllerState = useXRInputSourceState('controller', 'left');
  const rightControllerState = useXRInputSourceState('controller', 'right');
  const { triggerHaptic } = useXRHaptics();

  const [twoHandState, setTwoHandState] = useState<TwoHandedState | null>(null);
  const lastScaleRef = useRef(1);

  // Check if squeeze (grip) is pressed
  const isSqueezePressed = useCallback((hand: 'left' | 'right'): boolean => {
    const state = hand === 'left' ? leftControllerState : rightControllerState;
    const gamepad = state?.inputSource?.gamepad;
    if (gamepad) {
      return gamepad.buttons[1]?.pressed ?? false;
    }
    return false;
  }, [leftControllerState, rightControllerState]);

  // Get controller position
  const getControllerPosition = useCallback((hand: 'left' | 'right'): THREE.Vector3 | null => {
    const state = hand === 'left' ? leftControllerState : rightControllerState;
    if (!state?.object) return null;
    return state.object.getWorldPosition(new THREE.Vector3());
  }, [leftControllerState, rightControllerState]);

  useFrame(() => {
    if (!enabled) return;

    const leftPressed = isSqueezePressed('left');
    const rightPressed = isSqueezePressed('right');
    const bothPressed = leftPressed && rightPressed;

    if (bothPressed) {
      const leftPos = getControllerPosition('left');
      const rightPos = getControllerPosition('right');

      if (leftPos && rightPos) {
        if (!twoHandState) {
          // Start two-handed manipulation
          const initialDistance = leftPos.distanceTo(rightPos);
          setTwoHandState({
            active: true,
            initialDistance,
            initialWidth: 0, // Will be set by parent
            initialHeight: 0,
            leftHandPos: leftPos.clone(),
            rightHandPos: rightPos.clone(),
          });
          triggerHaptic('both', HAPTIC.TWO_HAND_START, 100);
          onStart();
        } else {
          // Update two-handed manipulation
          const currentDistance = leftPos.distanceTo(rightPos);
          const scaleFactor = currentDistance / twoHandState.initialDistance;

          // Only notify if scale changed significantly
          if (Math.abs(scaleFactor - lastScaleRef.current) > 0.01) {
            lastScaleRef.current = scaleFactor;
            onScaleChange(scaleFactor);
            triggerHaptic('both', HAPTIC.DRAG * scaleFactor, 20);
          }
        }
      }
    } else if (twoHandState) {
      // End two-handed manipulation
      setTwoHandState(null);
      lastScaleRef.current = 1;
      triggerHaptic('both', HAPTIC.RELEASE, 50);
      onEnd();
    }
  });

  return { twoHandState, isActive: !!twoHandState };
}

// ============================================================================
// Snapping Utilities
// ============================================================================

function snapToGrid(value: number, gridSize: number, threshold: number): number {
  const snapped = Math.round(value / gridSize) * gridSize;
  if (Math.abs(value - snapped) < threshold) {
    return snapped;
  }
  return value;
}

function snapToAngle(angle: number, increment: number, threshold: number): { angle: number; snapped: boolean } {
  const degrees = (angle * 180) / Math.PI;
  const snappedDegrees = Math.round(degrees / increment) * increment;
  const diff = Math.abs(degrees - snappedDegrees);

  if (diff < threshold) {
    return { angle: (snappedDegrees * Math.PI) / 180, snapped: true };
  }
  return { angle, snapped: false };
}

// ============================================================================
// Corner Handle Component
// ============================================================================

interface CornerHandleProps {
  position: [number, number, number];
  type: HandleType;
  color: string;
  accentColor: string;
  enableHaptics: boolean;
  onDragStart: (type: HandleType, point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
  onHover: (hovered: boolean) => void;
}

function CornerHandle({
  position,
  type,
  color,
  accentColor,
  enableHaptics,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: CornerHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const { triggerHaptic } = useXRHaptics();

  const { scale, emissiveIntensity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 0.8 : hovered ? 0.5 : 0.2,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(true);
    if (enableHaptics) triggerHaptic('both', HAPTIC.GRAB);
    onDragStart(type, e.point);
  }, [type, onDragStart, enableHaptics, triggerHaptic]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(false);
    if (enableHaptics) triggerHaptic('both', HAPTIC.RELEASE);
    onDragEnd();
  }, [onDragEnd, enableHaptics, triggerHaptic]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (active) {
      onDrag(e.point);
    }
  }, [active, onDrag]);

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    onHover(true);
    if (enableHaptics) triggerHaptic('both', HAPTIC.HOVER);
  }, [onHover, enableHaptics, triggerHaptic]);

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
      ref={meshRef}
      position={position}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <sphereGeometry args={[HANDLE_SIZE / 2, 16, 16]} />
      <animated.meshStandardMaterial
        color={color}
        emissive={accentColor}
        emissiveIntensity={emissiveIntensity}
        metalness={0.4}
        roughness={0.3}
      />
    </animated.mesh>
  );
}

// ============================================================================
// Edge Handle Component
// ============================================================================

interface EdgeHandleProps {
  position: [number, number, number];
  rotation: [number, number, number];
  type: HandleType;
  color: string;
  accentColor: string;
  enableHaptics: boolean;
  onDragStart: (type: HandleType, point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
  onHover: (hovered: boolean) => void;
}

function EdgeHandle({
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
  const { triggerHaptic } = useXRHaptics();

  const { scale, emissiveIntensity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 0.8 : hovered ? 0.5 : 0.15,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(true);
    if (enableHaptics) triggerHaptic('both', HAPTIC.GRAB);
    onDragStart(type, e.point);
  }, [type, onDragStart, enableHaptics, triggerHaptic]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(false);
    if (enableHaptics) triggerHaptic('both', HAPTIC.RELEASE);
    onDragEnd();
  }, [onDragEnd, enableHaptics, triggerHaptic]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (active) {
      onDrag(e.point);
    }
  }, [active, onDrag]);

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    onHover(true);
    if (enableHaptics) triggerHaptic('both', HAPTIC.HOVER);
  }, [onHover, enableHaptics, triggerHaptic]);

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
      <capsuleGeometry args={[EDGE_HANDLE_SIZE / 2, EDGE_HANDLE_LENGTH, 8, 16]} />
      <animated.meshStandardMaterial
        color={color}
        emissive={accentColor}
        emissiveIntensity={emissiveIntensity}
        metalness={0.3}
        roughness={0.4}
      />
    </animated.mesh>
  );
}

// ============================================================================
// Rotation Handle Component
// ============================================================================

interface RotationHandleProps {
  position: [number, number, number];
  color: string;
  accentColor: string;
  enableHaptics: boolean;
  currentAngle?: number;
  snapEnabled?: boolean;
  onDragStart: (point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
  onHover: (hovered: boolean) => void;
}

function RotationHandle({
  position,
  color,
  accentColor,
  enableHaptics,
  currentAngle = 0,
  snapEnabled = false,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: RotationHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const { triggerHaptic } = useXRHaptics();

  const { scale, emissiveIntensity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 1 : hovered ? 0.6 : 0.3,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(true);
    if (enableHaptics) triggerHaptic('both', HAPTIC.GRAB);
    onDragStart(e.point);
  }, [onDragStart, enableHaptics, triggerHaptic]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(false);
    if (enableHaptics) triggerHaptic('both', HAPTIC.RELEASE);
    onDragEnd();
  }, [onDragEnd, enableHaptics, triggerHaptic]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (active) {
      onDrag(e.point);
    }
  }, [active, onDrag]);

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    onHover(true);
    if (enableHaptics) triggerHaptic('both', HAPTIC.HOVER);
  }, [onHover, enableHaptics, triggerHaptic]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    onHover(false);
    if (active) {
      setActive(false);
      onDragEnd();
    }
  }, [active, onDragEnd, onHover]);

  // Snap angle indicators (15° increments)
  const snapIndicators = useMemo(() => {
    if (!snapEnabled || !active) return null;
    const indicators = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i * 15 * Math.PI) / 180;
      const isMainAngle = i % 6 === 0; // 90° increments
      const isMidAngle = i % 3 === 0; // 45° increments
      indicators.push(
        <mesh
          key={i}
          position={[
            Math.sin(angle) * ROTATION_HANDLE_SIZE * 1.3,
            0,
            Math.cos(angle) * ROTATION_HANDLE_SIZE * 1.3,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.002, 0.002, isMainAngle ? 0.015 : isMidAngle ? 0.01 : 0.005, 4]} />
          <meshBasicMaterial
            color={isMainAngle ? '#ffffff' : isMidAngle ? accentColor : '#666666'}
            transparent
            opacity={isMainAngle ? 1 : 0.6}
          />
        </mesh>
      );
    }
    return indicators;
  }, [snapEnabled, active, accentColor]);

  return (
    <group position={position}>
      {/* Connection line to widget */}
      <mesh position={[0, -ROTATION_HANDLE_OFFSET / 2, 0]}>
        <cylinderGeometry args={[0.002, 0.002, ROTATION_HANDLE_OFFSET, 8]} />
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
        <torusGeometry args={[ROTATION_HANDLE_SIZE, 0.006, 8, 32]} />
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
          Math.sin(currentAngle) * ROTATION_HANDLE_SIZE,
          0,
          Math.cos(currentAngle) * ROTATION_HANDLE_SIZE,
        ]}
      >
        <sphereGeometry args={[0.008, 12, 12]} />
        <meshStandardMaterial color="#ffffff" emissive={accentColor} emissiveIntensity={0.8} />
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
}

// ============================================================================
// Depth Handle Component (Z-axis push/pull)
// ============================================================================

interface DepthHandleProps {
  position: [number, number, number];
  color: string;
  accentColor: string;
  enableHaptics: boolean;
  onDragStart: (point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
  onHover: (hovered: boolean) => void;
}

function DepthHandle({
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
  const { triggerHaptic } = useXRHaptics();

  const { scale, emissiveIntensity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 1 : hovered ? 0.6 : 0.3,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(true);
    if (enableHaptics) triggerHaptic('both', HAPTIC.GRAB);
    onDragStart(e.point);
  }, [onDragStart, enableHaptics, triggerHaptic]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(false);
    if (enableHaptics) triggerHaptic('both', HAPTIC.RELEASE);
    onDragEnd();
  }, [onDragEnd, enableHaptics, triggerHaptic]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (active) {
      onDrag(e.point);
    }
  }, [active, onDrag]);

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    onHover(true);
    if (enableHaptics) triggerHaptic('both', HAPTIC.HOVER);
  }, [onHover, enableHaptics, triggerHaptic]);

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
      <mesh position={[0, 0, DEPTH_HANDLE_OFFSET / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, DEPTH_HANDLE_OFFSET, 8]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.4} />
      </mesh>

      {/* Arrow/cone pointing forward */}
      <animated.mesh
        position={[0, 0, DEPTH_HANDLE_OFFSET]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={scale}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <coneGeometry args={[DEPTH_HANDLE_SIZE, DEPTH_HANDLE_SIZE * 2, 8]} />
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
}

// ============================================================================
// Selection Border Component
// ============================================================================

interface SelectionBorderProps {
  width: number;
  height: number;
  color: string;
  zOffset: number;
  isSnapped?: boolean;
}

function SelectionBorder({ width, height, color, zOffset, isSnapped = false }: SelectionBorderProps) {
  const points = useMemo(() => {
    const hw = width / 2;
    const hh = height / 2;
    const r = 0.01;

    const segments: THREE.Vector3[] = [];
    segments.push(new THREE.Vector3(-hw + r, hh, zOffset));
    segments.push(new THREE.Vector3(hw - r, hh, zOffset));
    segments.push(new THREE.Vector3(hw, hh - r, zOffset));
    segments.push(new THREE.Vector3(hw, -hh + r, zOffset));
    segments.push(new THREE.Vector3(hw - r, -hh, zOffset));
    segments.push(new THREE.Vector3(-hw + r, -hh, zOffset));
    segments.push(new THREE.Vector3(-hw, -hh + r, zOffset));
    segments.push(new THREE.Vector3(-hw, hh - r, zOffset));
    segments.push(new THREE.Vector3(-hw + r, hh, zOffset));

    return segments;
  }, [width, height, zOffset]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [points]);

  return (
    <group>
      {/* Dashed selection line */}
      <line geometry={lineGeometry}>
        <lineDashedMaterial
          color={isSnapped ? '#22c55e' : color}
          dashSize={0.015}
          gapSize={0.008}
          linewidth={2}
        />
      </line>

      {/* Solid glow line behind */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color={isSnapped ? '#22c55e' : color}
          transparent
          opacity={isSnapped ? 0.5 : 0.3}
          linewidth={4}
        />
      </line>
    </group>
  );
}

// ============================================================================
// Two-Handed Manipulation Indicator
// ============================================================================

interface TwoHandIndicatorProps {
  active: boolean;
  scaleFactor: number;
  accentColor: string;
}

function TwoHandIndicator({ active, scaleFactor, accentColor }: TwoHandIndicatorProps) {
  const { opacity, ringScale } = useSpring({
    opacity: active ? 0.8 : 0,
    ringScale: active ? 1 : 0.5,
    config: { tension: 300, friction: 20 },
  });

  if (!active) return null;

  return (
    <group>
      {/* Scaling ring indicator */}
      <animated.mesh scale={ringScale}>
        <ringGeometry args={[0.15, 0.16, 32]} />
        <animated.meshBasicMaterial
          color={accentColor}
          transparent
          opacity={opacity}
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
    </group>
  );
}

// ============================================================================
// Main Widget 3D Handles Component
// ============================================================================

export function Widget3DHandles({
  width,
  height,
  depth = 0,
  selected,
  interactive = true,
  accentColor = '#8b5cf6',
  enableHaptics = true,
  enableTwoHanded = true,
  snapToGrid = true,
  gridSize = 0.05,
  snapAngles = true,
  snapAngleIncrement = 15,
  lockAspectRatio = false,
  onResizeStart,
  onResize,
  onResizeEnd,
  onRotateStart,
  onRotate,
  onRotateEnd,
  onDepthChange,
  onMoveStart,
  onMove,
  onMoveEnd,
  onTwoHandedScale,
  zOffset = 0.01,
}: Widget3DHandlesProps) {
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isSnapped, setIsSnapped] = useState(false);
  const [twoHandScale, setTwoHandScale] = useState(1);

  const dragStartRef = useRef<THREE.Vector3 | null>(null);
  const initialSizeRef = useRef<{ width: number; height: number } | null>(null);
  const rotationStartAngleRef = useRef<number>(0);
  const depthStartRef = useRef<number>(0);
  const aspectRatioRef = useRef<number>(1);

  const { triggerHaptic } = useXRHaptics();

  // Two-handed manipulation
  const { isActive: isTwoHandActive } = useTwoHandedManipulation(
    enableTwoHanded && selected && !activeHandle,
    (scaleFactor) => {
      setTwoHandScale(scaleFactor);
      onTwoHandedScale?.(scaleFactor);
    },
    () => {
      // On start
      initialSizeRef.current = { width, height };
    },
    () => {
      // On end - apply final scale
      if (initialSizeRef.current) {
        const newWidth = initialSizeRef.current.width * twoHandScale;
        const newHeight = initialSizeRef.current.height * twoHandScale;
        onResize?.(
          Math.max(MIN_SIZE, Math.min(MAX_SIZE, newWidth)),
          Math.max(MIN_SIZE, Math.min(MAX_SIZE, newHeight)),
          'corner-se'
        );
        onResizeEnd?.();
      }
      setTwoHandScale(1);
    }
  );

  // Don't render if not selected
  if (!selected) return null;

  const hw = width / 2;
  const hh = height / 2;

  // Corner positions
  const cornerPositions: { type: HandleType; pos: [number, number, number] }[] = [
    { type: 'corner-nw', pos: [-hw, hh, zOffset] },
    { type: 'corner-ne', pos: [hw, hh, zOffset] },
    { type: 'corner-se', pos: [hw, -hh, zOffset] },
    { type: 'corner-sw', pos: [-hw, -hh, zOffset] },
  ];

  // Edge positions and rotations
  const edgeHandles: { type: HandleType; pos: [number, number, number]; rot: [number, number, number] }[] = [
    { type: 'edge-n', pos: [0, hh, zOffset], rot: [0, 0, Math.PI / 2] },
    { type: 'edge-s', pos: [0, -hh, zOffset], rot: [0, 0, Math.PI / 2] },
    { type: 'edge-e', pos: [hw, 0, zOffset], rot: [0, 0, 0] },
    { type: 'edge-w', pos: [-hw, 0, zOffset], rot: [0, 0, 0] },
  ];

  const handleColor = '#ffffff';

  // Resize handlers with snapping and aspect ratio lock
  const handleResizeDragStart = useCallback((type: HandleType, point: THREE.Vector3) => {
    if (!interactive) return;
    setActiveHandle(type);
    dragStartRef.current = point.clone();
    initialSizeRef.current = { width, height };
    aspectRatioRef.current = width / height;
    onResizeStart?.(type);
  }, [interactive, width, height, onResizeStart]);

  const handleResizeDrag = useCallback((point: THREE.Vector3) => {
    if (!activeHandle || !dragStartRef.current || !initialSizeRef.current) return;

    const delta = point.clone().sub(dragStartRef.current);
    let newWidth = initialSizeRef.current.width;
    let newHeight = initialSizeRef.current.height;
    const isCorner = activeHandle.startsWith('corner');

    // Apply delta based on handle type
    switch (activeHandle) {
      case 'corner-ne':
        newWidth += delta.x;
        newHeight += delta.y;
        break;
      case 'corner-nw':
        newWidth -= delta.x;
        newHeight += delta.y;
        break;
      case 'corner-se':
        newWidth += delta.x;
        newHeight -= delta.y;
        break;
      case 'corner-sw':
        newWidth -= delta.x;
        newHeight -= delta.y;
        break;
      case 'edge-n':
        newHeight += delta.y;
        break;
      case 'edge-s':
        newHeight -= delta.y;
        break;
      case 'edge-e':
        newWidth += delta.x;
        break;
      case 'edge-w':
        newWidth -= delta.x;
        break;
    }

    // Lock aspect ratio for corner handles if enabled
    if (lockAspectRatio && isCorner) {
      const avgDelta = (Math.abs(delta.x) + Math.abs(delta.y)) / 2;
      const sign = (delta.x + delta.y) > 0 ? 1 : -1;
      newWidth = initialSizeRef.current.width + sign * avgDelta * aspectRatioRef.current;
      newHeight = initialSizeRef.current.height + sign * avgDelta;
    }

    // Apply grid snapping
    let snapped = false;
    if (snapToGrid) {
      const snappedWidth = snapToGrid ? snapToGrid(newWidth, gridSize, SNAP_THRESHOLD) : newWidth;
      const snappedHeight = snapToGrid ? snapToGrid(newHeight, gridSize, SNAP_THRESHOLD) : newHeight;

      if (snappedWidth !== newWidth || snappedHeight !== newHeight) {
        snapped = true;
        if (enableHaptics && !isSnapped) {
          triggerHaptic('both', HAPTIC.SNAP, 30);
        }
      }
      newWidth = snappedWidth;
      newHeight = snappedHeight;
    }
    setIsSnapped(snapped);

    // Clamp to min/max
    newWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newWidth));
    newHeight = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newHeight));

    onResize?.(newWidth, newHeight, activeHandle);
  }, [activeHandle, onResize, snapToGrid, gridSize, lockAspectRatio, enableHaptics, isSnapped, triggerHaptic]);

  const handleResizeDragEnd = useCallback(() => {
    setActiveHandle(null);
    setIsSnapped(false);
    dragStartRef.current = null;
    initialSizeRef.current = null;
    onResizeEnd?.();
  }, [onResizeEnd]);

  // Rotation handlers with angle snapping
  const handleRotationDragStart = useCallback((point: THREE.Vector3) => {
    if (!interactive) return;
    setActiveHandle('rotate');
    dragStartRef.current = point.clone();
    rotationStartAngleRef.current = Math.atan2(point.x, point.y);
    onRotateStart?.();
  }, [interactive, onRotateStart]);

  const handleRotationDrag = useCallback((point: THREE.Vector3) => {
    if (activeHandle !== 'rotate' || !dragStartRef.current) return;

    const currentAngle = Math.atan2(point.x, point.y);
    let angleDelta = currentAngle - rotationStartAngleRef.current;

    // Apply angle snapping
    if (snapAngles) {
      const { angle: snappedAngle, snapped } = snapToAngle(
        angleDelta,
        (snapAngleIncrement * Math.PI) / 180,
        (ANGLE_SNAP_THRESHOLD * Math.PI) / 180
      );

      if (snapped && !isSnapped) {
        if (enableHaptics) triggerHaptic('both', HAPTIC.SNAP, 30);
        setIsSnapped(true);
      } else if (!snapped && isSnapped) {
        setIsSnapped(false);
      }

      angleDelta = snappedAngle;
    }

    rotationStartAngleRef.current = currentAngle;
    onRotate?.(angleDelta);
  }, [activeHandle, onRotate, snapAngles, snapAngleIncrement, enableHaptics, isSnapped, triggerHaptic]);

  const handleRotationDragEnd = useCallback(() => {
    setActiveHandle(null);
    setIsSnapped(false);
    dragStartRef.current = null;
    onRotateEnd?.();
  }, [onRotateEnd]);

  // Depth handlers (Z-axis push/pull)
  const handleDepthDragStart = useCallback((point: THREE.Vector3) => {
    if (!interactive) return;
    setActiveHandle('depth');
    dragStartRef.current = point.clone();
    depthStartRef.current = depth;
  }, [interactive, depth]);

  const handleDepthDrag = useCallback((point: THREE.Vector3) => {
    if (activeHandle !== 'depth' || !dragStartRef.current) return;

    // Use Z delta for depth change
    const delta = point.z - dragStartRef.current.z;
    onDepthChange?.(delta);
  }, [activeHandle, onDepthChange]);

  const handleDepthDragEnd = useCallback(() => {
    setActiveHandle(null);
    dragStartRef.current = null;
  }, []);

  // Hover handler
  const handleHover = useCallback((hovered: boolean) => {
    setIsHovering(hovered);
  }, []);

  return (
    <group>
      {/* Selection border */}
      <SelectionBorder
        width={width}
        height={height}
        color={accentColor}
        zOffset={zOffset - 0.001}
        isSnapped={isSnapped}
      />

      {/* Two-handed manipulation indicator */}
      <TwoHandIndicator
        active={isTwoHandActive}
        scaleFactor={twoHandScale}
        accentColor={accentColor}
      />

      {/* Corner handles */}
      {cornerPositions.map(({ type, pos }) => (
        <CornerHandle
          key={type}
          position={pos}
          type={type}
          color={handleColor}
          accentColor={accentColor}
          enableHaptics={enableHaptics}
          onDragStart={handleResizeDragStart}
          onDrag={handleResizeDrag}
          onDragEnd={handleResizeDragEnd}
          onHover={handleHover}
        />
      ))}

      {/* Edge handles */}
      {edgeHandles.map(({ type, pos, rot }) => (
        <EdgeHandle
          key={type}
          position={pos}
          rotation={rot}
          type={type}
          color={handleColor}
          accentColor={accentColor}
          enableHaptics={enableHaptics}
          onDragStart={handleResizeDragStart}
          onDrag={handleResizeDrag}
          onDragEnd={handleResizeDragEnd}
          onHover={handleHover}
        />
      ))}

      {/* Rotation handle */}
      <RotationHandle
        position={[0, hh + ROTATION_HANDLE_OFFSET, zOffset]}
        color={handleColor}
        accentColor={accentColor}
        enableHaptics={enableHaptics}
        snapEnabled={snapAngles}
        onDragStart={handleRotationDragStart}
        onDrag={handleRotationDrag}
        onDragEnd={handleRotationDragEnd}
        onHover={handleHover}
      />

      {/* Depth handle (Z-axis) */}
      {onDepthChange && (
        <DepthHandle
          position={[hw + 0.04, 0, zOffset]}
          color={handleColor}
          accentColor={accentColor}
          enableHaptics={enableHaptics}
          onDragStart={handleDepthDragStart}
          onDrag={handleDepthDrag}
          onDragEnd={handleDepthDragEnd}
          onHover={handleHover}
        />
      )}

      {/* Size/state indicator */}
      {(activeHandle || isTwoHandActive) && (
        <group position={[0, -hh - 0.05, zOffset]}>
          <mesh>
            <planeGeometry args={[0.16, 0.03]} />
            <meshBasicMaterial color="#1a1a25" transparent opacity={0.95} />
          </mesh>
          <Text
            position={[0, 0, 0.001]}
            fontSize={0.014}
            color={isSnapped ? '#22c55e' : '#ffffff'}
            anchorX="center"
            anchorY="middle"
          >
            {activeHandle === 'rotate'
              ? `${isSnapped ? '⚡' : ''}Rotate`
              : activeHandle === 'depth'
              ? 'Depth'
              : isTwoHandActive
              ? `Scale: ${Math.round(twoHandScale * 100)}%`
              : `${Math.round(width * 100)}×${Math.round(height * 100)}cm${isSnapped ? ' ⚡' : ''}`
            }
          </Text>
        </group>
      )}

      {/* Aspect ratio lock indicator */}
      {lockAspectRatio && activeHandle?.startsWith('corner') && (
        <Text
          position={[0, hh + 0.03, zOffset]}
          fontSize={0.02}
          color={accentColor}
          anchorX="center"
          anchorY="middle"
        >
          🔒
        </Text>
      )}
    </group>
  );
}

export default Widget3DHandles;
