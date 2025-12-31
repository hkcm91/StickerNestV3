/**
 * StickerNest - Widget 3D Handles
 *
 * 3D manipulation handles for widgets in VR/AR space.
 * Provides resize, rotate, and move functionality similar to 2D canvas
 * but designed for spatial interaction with hands and controllers.
 *
 * Handle Types:
 * - Corner handles (spheres): Resize from corners, maintains aspect ratio with pinch
 * - Edge handles (capsules): Resize from edges, single-axis scaling
 * - Rotation handle (torus): Rotate widget around its normal axis
 * - Move handle (center grab): Reposition widget in space
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

export type HandleType =
  | 'corner-nw' | 'corner-ne' | 'corner-se' | 'corner-sw'
  | 'edge-n' | 'edge-e' | 'edge-s' | 'edge-w'
  | 'rotate'
  | 'move';

export interface Widget3DHandlesProps {
  /** Width of the widget panel in meters */
  width: number;
  /** Height of the widget panel in meters */
  height: number;
  /** Whether the widget is currently selected */
  selected: boolean;
  /** Whether handles should be interactive */
  interactive?: boolean;
  /** Accent color for handles */
  accentColor?: string;
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
  /** Called when move/grab starts */
  onMoveStart?: (point: THREE.Vector3) => void;
  /** Called during move */
  onMove?: (point: THREE.Vector3, delta: THREE.Vector3) => void;
  /** Called when move ends */
  onMoveEnd?: () => void;
  /** Z offset from widget surface */
  zOffset?: number;
}

// ============================================================================
// Constants
// ============================================================================

const HANDLE_SIZE = 0.025; // meters - size of corner handles
const EDGE_HANDLE_SIZE = 0.018; // meters - size of edge handles
const EDGE_HANDLE_LENGTH = 0.06; // meters - length of edge handle capsules
const ROTATION_HANDLE_OFFSET = 0.08; // meters - distance above widget
const ROTATION_HANDLE_SIZE = 0.03; // meters
const SELECTION_BORDER_WIDTH = 0.004; // meters
const HOVER_SCALE = 1.3;
const ACTIVE_SCALE = 1.5;

// ============================================================================
// Corner Handle Component
// ============================================================================

interface CornerHandleProps {
  position: [number, number, number];
  type: HandleType;
  color: string;
  accentColor: string;
  onDragStart: (type: HandleType, point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
}

function CornerHandle({
  position,
  type,
  color,
  accentColor,
  onDragStart,
  onDrag,
  onDragEnd,
}: CornerHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const { scale, emissiveIntensity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 0.8 : hovered ? 0.5 : 0.2,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(true);
    onDragStart(type, e.point);
  }, [type, onDragStart]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(false);
    onDragEnd();
  }, [onDragEnd]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (active) {
      onDrag(e.point);
    }
  }, [active, onDrag]);

  return (
    <animated.mesh
      ref={meshRef}
      position={position}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        if (active) {
          setActive(false);
          onDragEnd();
        }
      }}
    >
      {/* Main sphere */}
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
  onDragStart: (type: HandleType, point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
}

function EdgeHandle({
  position,
  rotation,
  type,
  color,
  accentColor,
  onDragStart,
  onDrag,
  onDragEnd,
}: EdgeHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const { scale, emissiveIntensity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 0.8 : hovered ? 0.5 : 0.15,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(true);
    onDragStart(type, e.point);
  }, [type, onDragStart]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(false);
    onDragEnd();
  }, [onDragEnd]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (active) {
      onDrag(e.point);
    }
  }, [active, onDrag]);

  return (
    <animated.mesh
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        if (active) {
          setActive(false);
          onDragEnd();
        }
      }}
    >
      {/* Capsule shape for edge */}
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
  onDragStart: (point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
}

function RotationHandle({
  position,
  color,
  accentColor,
  onDragStart,
  onDrag,
  onDragEnd,
}: RotationHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const { scale, emissiveIntensity, ringOpacity } = useSpring({
    scale: active ? ACTIVE_SCALE : hovered ? HOVER_SCALE : 1,
    emissiveIntensity: active ? 1 : hovered ? 0.6 : 0.3,
    ringOpacity: active ? 0.8 : hovered ? 0.5 : 0.3,
    config: { tension: 400, friction: 25 },
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(true);
    onDragStart(e.point);
  }, [onDragStart]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive(false);
    onDragEnd();
  }, [onDragEnd]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (active) {
      onDrag(e.point);
    }
  }, [active, onDrag]);

  return (
    <group position={position}>
      {/* Connection line to widget */}
      <mesh position={[0, -ROTATION_HANDLE_OFFSET / 2, 0]}>
        <cylinderGeometry args={[0.002, 0.002, ROTATION_HANDLE_OFFSET, 8]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.5} />
      </mesh>

      {/* Rotation ring */}
      <animated.mesh
        rotation={[Math.PI / 2, 0, 0]}
        scale={scale}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => {
          setHovered(false);
          if (active) {
            setActive(false);
            onDragEnd();
          }
        }}
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
// Selection Border Component
// ============================================================================

interface SelectionBorderProps {
  width: number;
  height: number;
  color: string;
  zOffset: number;
}

function SelectionBorder({ width, height, color, zOffset }: SelectionBorderProps) {
  // Create a rounded rectangle outline using line segments
  const points = useMemo(() => {
    const hw = width / 2;
    const hh = height / 2;
    const r = 0.01; // corner radius

    // Create points for rounded rectangle
    const segments: THREE.Vector3[] = [];

    // Top edge
    segments.push(new THREE.Vector3(-hw + r, hh, zOffset));
    segments.push(new THREE.Vector3(hw - r, hh, zOffset));

    // Top-right corner
    segments.push(new THREE.Vector3(hw, hh - r, zOffset));

    // Right edge
    segments.push(new THREE.Vector3(hw, -hh + r, zOffset));

    // Bottom-right corner
    segments.push(new THREE.Vector3(hw - r, -hh, zOffset));

    // Bottom edge
    segments.push(new THREE.Vector3(-hw + r, -hh, zOffset));

    // Bottom-left corner
    segments.push(new THREE.Vector3(-hw, -hh + r, zOffset));

    // Left edge
    segments.push(new THREE.Vector3(-hw, hh - r, zOffset));

    // Close the loop
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
          color={color}
          dashSize={0.015}
          gapSize={0.008}
          linewidth={2}
        />
      </line>

      {/* Solid glow line behind */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.3} linewidth={4} />
      </line>
    </group>
  );
}

// ============================================================================
// Main Widget 3D Handles Component
// ============================================================================

export function Widget3DHandles({
  width,
  height,
  selected,
  interactive = true,
  accentColor = '#8b5cf6',
  onResizeStart,
  onResize,
  onResizeEnd,
  onRotateStart,
  onRotate,
  onRotateEnd,
  onMoveStart,
  onMove,
  onMoveEnd,
  zOffset = 0.01,
}: Widget3DHandlesProps) {
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const dragStartRef = useRef<THREE.Vector3 | null>(null);
  const initialSizeRef = useRef<{ width: number; height: number } | null>(null);
  const rotationStartAngleRef = useRef<number>(0);

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

  // Handle colors
  const handleColor = '#ffffff';

  // Resize handlers
  const handleResizeDragStart = useCallback((type: HandleType, point: THREE.Vector3) => {
    if (!interactive) return;
    setActiveHandle(type);
    dragStartRef.current = point.clone();
    initialSizeRef.current = { width, height };
    onResizeStart?.(type);
  }, [interactive, width, height, onResizeStart]);

  const handleResizeDrag = useCallback((point: THREE.Vector3) => {
    if (!activeHandle || !dragStartRef.current || !initialSizeRef.current) return;

    const delta = point.clone().sub(dragStartRef.current);
    let newWidth = initialSizeRef.current.width;
    let newHeight = initialSizeRef.current.height;

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

    // Minimum size constraints (50px = 0.05m at 100px/m scale)
    const minSize = 0.05;
    newWidth = Math.max(minSize, newWidth);
    newHeight = Math.max(minSize, newHeight);

    onResize?.(newWidth, newHeight, activeHandle);
  }, [activeHandle, onResize]);

  const handleResizeDragEnd = useCallback(() => {
    setActiveHandle(null);
    dragStartRef.current = null;
    initialSizeRef.current = null;
    onResizeEnd?.();
  }, [onResizeEnd]);

  // Rotation handlers
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
    const angleDelta = currentAngle - rotationStartAngleRef.current;
    rotationStartAngleRef.current = currentAngle;

    onRotate?.(angleDelta);
  }, [activeHandle, onRotate]);

  const handleRotationDragEnd = useCallback(() => {
    setActiveHandle(null);
    dragStartRef.current = null;
    onRotateEnd?.();
  }, [onRotateEnd]);

  return (
    <group>
      {/* Selection border */}
      <SelectionBorder
        width={width}
        height={height}
        color={accentColor}
        zOffset={zOffset - 0.001}
      />

      {/* Corner handles */}
      {cornerPositions.map(({ type, pos }) => (
        <CornerHandle
          key={type}
          position={pos}
          type={type}
          color={handleColor}
          accentColor={accentColor}
          onDragStart={handleResizeDragStart}
          onDrag={handleResizeDrag}
          onDragEnd={handleResizeDragEnd}
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
          onDragStart={handleResizeDragStart}
          onDrag={handleResizeDrag}
          onDragEnd={handleResizeDragEnd}
        />
      ))}

      {/* Rotation handle */}
      <RotationHandle
        position={[0, hh + ROTATION_HANDLE_OFFSET, zOffset]}
        color={handleColor}
        accentColor={accentColor}
        onDragStart={handleRotationDragStart}
        onDrag={handleRotationDrag}
        onDragEnd={handleRotationDragEnd}
      />

      {/* Size indicator (shown during resize) */}
      {activeHandle && activeHandle.startsWith('corner') || activeHandle?.startsWith('edge') ? (
        <group position={[0, -hh - 0.04, zOffset]}>
          <mesh>
            <planeGeometry args={[0.12, 0.025]} />
            <meshBasicMaterial color="#1a1a25" transparent opacity={0.9} />
          </mesh>
          <Text
            position={[0, 0, 0.001]}
            fontSize={0.012}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {`${Math.round(width * 100)}×${Math.round(height * 100)}`}
          </Text>
        </group>
      ) : null}
    </group>
  );
}

export default Widget3DHandles;
