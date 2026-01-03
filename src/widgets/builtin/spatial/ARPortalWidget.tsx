/**
 * StickerNest - AR Portal Widget
 *
 * Creates a "portal" or "window" into the real world while in VR mode.
 * Similar to how Immersed, Immersion, and other productivity VR apps
 * allow users to see their physical environment through portals.
 *
 * How it works:
 * - In VR mode, the portal mesh clears the depth buffer in its area
 * - This allows the WebXR passthrough layer to show through
 * - The frame provides visual context and grabbable handles
 * - Multiple portals can be placed around the VR environment
 *
 * Features:
 * - Rectangular portal with decorative frame
 * - Grabbable and resizable
 * - Multiple portal shapes (rectangle, circle, rounded)
 * - Frame color customization
 * - Opacity control for frame
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ARPortalProps {
  /** Portal width in meters */
  width?: number;
  /** Portal height in meters */
  height?: number;
  /** Portal shape */
  shape?: 'rectangle' | 'rounded' | 'circle';
  /** Frame color */
  frameColor?: string;
  /** Frame thickness in meters */
  frameThickness?: number;
  /** Frame opacity */
  frameOpacity?: number;
  /** Whether portal is active (showing passthrough) */
  active?: boolean;
  /** Portal label */
  label?: string;
  /** Called when portal is grabbed */
  onGrab?: () => void;
  /** Called when portal is released */
  onRelease?: () => void;
}

// ============================================================================
// Portal Frame Geometry
// ============================================================================

function createFrameGeometry(
  width: number,
  height: number,
  thickness: number,
  shape: 'rectangle' | 'rounded' | 'circle'
): THREE.BufferGeometry {
  const outerWidth = width + thickness * 2;
  const outerHeight = height + thickness * 2;

  if (shape === 'circle') {
    // Circle frame - ring geometry
    const outerRadius = Math.max(width, height) / 2 + thickness;
    const innerRadius = Math.max(width, height) / 2;
    return new THREE.RingGeometry(innerRadius, outerRadius, 64);
  }

  // Rectangle or rounded - custom shape with hole
  const outerShape = new THREE.Shape();
  const innerPath = new THREE.Path();

  if (shape === 'rounded') {
    const cornerRadius = Math.min(width, height) * 0.1;
    const outerCorner = cornerRadius + thickness;

    // Outer rounded rectangle
    outerShape.moveTo(-outerWidth / 2 + outerCorner, -outerHeight / 2);
    outerShape.lineTo(outerWidth / 2 - outerCorner, -outerHeight / 2);
    outerShape.quadraticCurveTo(outerWidth / 2, -outerHeight / 2, outerWidth / 2, -outerHeight / 2 + outerCorner);
    outerShape.lineTo(outerWidth / 2, outerHeight / 2 - outerCorner);
    outerShape.quadraticCurveTo(outerWidth / 2, outerHeight / 2, outerWidth / 2 - outerCorner, outerHeight / 2);
    outerShape.lineTo(-outerWidth / 2 + outerCorner, outerHeight / 2);
    outerShape.quadraticCurveTo(-outerWidth / 2, outerHeight / 2, -outerWidth / 2, outerHeight / 2 - outerCorner);
    outerShape.lineTo(-outerWidth / 2, -outerHeight / 2 + outerCorner);
    outerShape.quadraticCurveTo(-outerWidth / 2, -outerHeight / 2, -outerWidth / 2 + outerCorner, -outerHeight / 2);

    // Inner rounded rectangle (hole)
    innerPath.moveTo(-width / 2 + cornerRadius, -height / 2);
    innerPath.lineTo(width / 2 - cornerRadius, -height / 2);
    innerPath.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + cornerRadius);
    innerPath.lineTo(width / 2, height / 2 - cornerRadius);
    innerPath.quadraticCurveTo(width / 2, height / 2, width / 2 - cornerRadius, height / 2);
    innerPath.lineTo(-width / 2 + cornerRadius, height / 2);
    innerPath.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - cornerRadius);
    innerPath.lineTo(-width / 2, -height / 2 + cornerRadius);
    innerPath.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + cornerRadius, -height / 2);
  } else {
    // Simple rectangle
    outerShape.moveTo(-outerWidth / 2, -outerHeight / 2);
    outerShape.lineTo(outerWidth / 2, -outerHeight / 2);
    outerShape.lineTo(outerWidth / 2, outerHeight / 2);
    outerShape.lineTo(-outerWidth / 2, outerHeight / 2);
    outerShape.lineTo(-outerWidth / 2, -outerHeight / 2);

    innerPath.moveTo(-width / 2, -height / 2);
    innerPath.lineTo(width / 2, -height / 2);
    innerPath.lineTo(width / 2, height / 2);
    innerPath.lineTo(-width / 2, height / 2);
    innerPath.lineTo(-width / 2, -height / 2);
  }

  outerShape.holes.push(innerPath);
  return new THREE.ShapeGeometry(outerShape);
}

// ============================================================================
// Portal Mesh Component (The "hole" that shows passthrough)
// ============================================================================

interface PortalMeshProps {
  width: number;
  height: number;
  shape: 'rectangle' | 'rounded' | 'circle';
}

function PortalMesh({ width, height, shape }: PortalMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create portal geometry based on shape
  const geometry = useMemo(() => {
    if (shape === 'circle') {
      const radius = Math.max(width, height) / 2;
      return new THREE.CircleGeometry(radius, 64);
    }
    if (shape === 'rounded') {
      const cornerRadius = Math.min(width, height) * 0.1;
      const roundedShape = new THREE.Shape();
      roundedShape.moveTo(-width / 2 + cornerRadius, -height / 2);
      roundedShape.lineTo(width / 2 - cornerRadius, -height / 2);
      roundedShape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + cornerRadius);
      roundedShape.lineTo(width / 2, height / 2 - cornerRadius);
      roundedShape.quadraticCurveTo(width / 2, height / 2, width / 2 - cornerRadius, height / 2);
      roundedShape.lineTo(-width / 2 + cornerRadius, height / 2);
      roundedShape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - cornerRadius);
      roundedShape.lineTo(-width / 2, -height / 2 + cornerRadius);
      roundedShape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + cornerRadius, -height / 2);
      return new THREE.ShapeGeometry(roundedShape);
    }
    return new THREE.PlaneGeometry(width, height);
  }, [width, height, shape]);

  /**
   * The portal effect works by:
   * 1. Rendering this mesh with colorWrite: false (doesn't draw pixels)
   * 2. But depthWrite: true (clears the depth buffer in this area)
   * 3. WebXR passthrough is rendered as the "background" of the scene
   * 4. By clearing depth, passthrough shows through this "hole"
   *
   * Additionally, we set renderOrder to -1 so this renders first,
   * ensuring the depth buffer is cleared before other objects render.
   */
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      renderOrder={-1}
      position={[0, 0, 0.001]} // Slightly in front of frame
    >
      <meshBasicMaterial
        colorWrite={false}
        depthWrite={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============================================================================
// Portal Frame Component
// ============================================================================

interface PortalFrameProps {
  width: number;
  height: number;
  thickness: number;
  shape: 'rectangle' | 'rounded' | 'circle';
  color: string;
  opacity: number;
  hovered: boolean;
  grabbed: boolean;
}

function PortalFrame({
  width,
  height,
  thickness,
  shape,
  color,
  opacity,
  hovered,
  grabbed,
}: PortalFrameProps) {
  const geometry = useMemo(
    () => createFrameGeometry(width, height, thickness, shape),
    [width, height, thickness, shape]
  );

  // Glow effect when hovered or grabbed
  const emissiveIntensity = grabbed ? 0.8 : hovered ? 0.4 : 0.1;

  return (
    <group>
      {/* Main frame */}
      <mesh geometry={geometry} renderOrder={1}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          metalness={0.6}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Frame depth (extrusion) for 3D effect */}
      <mesh position={[0, 0, -0.01]} renderOrder={0}>
        <boxGeometry args={[width + thickness * 2, height + thickness * 2, 0.02]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* Inner edge highlight */}
      {shape !== 'circle' && (
        <lineSegments renderOrder={2}>
          <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
          <lineBasicMaterial color={color} transparent opacity={opacity * 0.8} />
        </lineSegments>
      )}
    </group>
  );
}

// ============================================================================
// Corner Handles for Resizing
// ============================================================================

interface CornerHandleProps {
  position: [number, number, number];
  color: string;
  onPointerDown: (e: THREE.Event) => void;
}

function CornerHandle({ position, color, onPointerDown }: CornerHandleProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      position={position}
      scale={hovered ? 1.3 : 1}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={onPointerDown}
    >
      <sphereGeometry args={[0.02, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered ? 0.8 : 0.3}
        metalness={0.5}
        roughness={0.3}
      />
    </mesh>
  );
}

// ============================================================================
// Main AR Portal Component
// ============================================================================

export function ARPortal3D({
  width = 0.6,
  height = 0.4,
  shape = 'rounded',
  frameColor = '#8b5cf6',
  frameThickness = 0.025,
  frameOpacity = 0.9,
  active = true,
  label = 'AR Portal',
  onGrab,
  onRelease,
}: ARPortalProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const [hovered, setHovered] = useState(false);
  const [grabbed, setGrabbed] = useState(false);

  // Face the camera
  useFrame(() => {
    if (!groupRef.current) return;

    // Billboard effect - always face the camera
    const cameraPos = camera.position;
    const portalPos = groupRef.current.position;

    const direction = new THREE.Vector3(
      cameraPos.x - portalPos.x,
      0,
      cameraPos.z - portalPos.z
    ).normalize();

    const angle = Math.atan2(direction.x, direction.z);
    groupRef.current.rotation.y = angle;
  });

  const handlePointerDown = useCallback(() => {
    setGrabbed(true);
    onGrab?.();
  }, [onGrab]);

  const handlePointerUp = useCallback(() => {
    setGrabbed(false);
    onRelease?.();
  }, [onRelease]);

  // Corner positions for resize handles
  const hw = width / 2 + frameThickness;
  const hh = height / 2 + frameThickness;
  const cornerPositions: [number, number, number][] = [
    [-hw, hh, 0.02],
    [hw, hh, 0.02],
    [hw, -hh, 0.02],
    [-hw, -hh, 0.02],
  ];

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* The passthrough portal "hole" */}
      {active && (
        <PortalMesh width={width} height={height} shape={shape} />
      )}

      {/* Decorative frame */}
      <PortalFrame
        width={width}
        height={height}
        thickness={frameThickness}
        shape={shape}
        color={frameColor}
        opacity={frameOpacity}
        hovered={hovered}
        grabbed={grabbed}
      />

      {/* Corner resize handles */}
      {shape !== 'circle' && cornerPositions.map((pos, i) => (
        <CornerHandle
          key={i}
          position={pos}
          color={frameColor}
          onPointerDown={handlePointerDown}
        />
      ))}

      {/* Portal label */}
      {label && (
        <Text
          position={[0, height / 2 + frameThickness + 0.05, 0.01]}
          fontSize={0.03}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.002}
          outlineColor="#000000"
        >
          {label}
        </Text>
      )}

      {/* Active indicator */}
      <mesh position={[0, -height / 2 - frameThickness - 0.03, 0.01]}>
        <circleGeometry args={[0.01, 16]} />
        <meshBasicMaterial color={active ? '#22c55e' : '#ef4444'} />
      </mesh>

      {/* "AR" badge */}
      <group position={[width / 2 + frameThickness - 0.02, height / 2 + frameThickness - 0.02, 0.02]}>
        <mesh>
          <planeGeometry args={[0.06, 0.025]} />
          <meshBasicMaterial color="#8b5cf6" />
        </mesh>
        <Text
          position={[0, 0, 0.001]}
          fontSize={0.015}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Bold.woff"
        >
          AR
        </Text>
      </group>
    </group>
  );
}

// ============================================================================
// Widget Manifest
// ============================================================================

export const ARPortalWidgetManifest: WidgetManifest = {
  id: 'stickernest.ar-portal',
  name: 'AR Portal',
  version: '1.0.0',
  kind: '3d',
  entry: 'index.tsx',
  description: 'Create windows into the real world while in VR mode. Place multiple portals to see your physical environment through passthrough.',
  author: 'StickerNest',
  tags: ['spatial', 'vr', 'ar', 'portal', 'passthrough', 'immersive', 'mixed-reality', 'window'],
  inputs: {
    'portal:toggle': {
      type: 'boolean',
      description: 'Toggle portal active state',
    },
    'portal:resize': {
      type: 'object',
      description: 'Resize portal { width, height }',
    },
    'portal:setShape': {
      type: 'string',
      description: 'Set portal shape: rectangle, rounded, circle',
    },
  },
  outputs: {
    'portal:activated': {
      type: 'object',
      description: 'Portal was activated/deactivated',
    },
    'portal:resized': {
      type: 'object',
      description: 'Portal was resized',
    },
    'portal:grabbed': {
      type: 'object',
      description: 'Portal was grabbed for moving',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
    supports3d: true,
  },
  io: {
    inputs: ['portal:toggle', 'portal:resize', 'portal:setShape'],
    outputs: ['portal:activated', 'portal:resized', 'portal:grabbed'],
  },
  size: {
    width: 600,
    height: 400,
    minWidth: 200,
    minHeight: 200,
    scaleMode: 'scale',
  },
};

// ============================================================================
// Widget Export
// ============================================================================

export const ARPortalWidget: BuiltinWidget = {
  manifest: ARPortalWidgetManifest,
  component: ARPortal3D,
};

export default ARPortalWidget;
