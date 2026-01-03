/**
 * StickerNest - Teleport Spots Widget
 *
 * Allows users to set and jump to specific locations in VR space.
 * Similar to Bigscreen VR's location jumping feature.
 *
 * Features:
 * - Place teleport spots anywhere in the VR environment
 * - Visual spot markers with customizable colors and labels
 * - Click/select a spot to instantly teleport there
 * - Fade transition effect during teleport
 * - Save/load spot configurations
 * - Spot management panel (add, remove, rename)
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Circle, Ring } from '@react-three/drei';
import { useXR } from '@react-three/xr';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface TeleportSpot {
  id: string;
  name: string;
  position: [number, number, number];
  rotation?: number; // Y-axis rotation in radians
  color?: string;
  icon?: string;
}

export interface TeleportSpotsProps {
  /** Initial spots */
  spots?: TeleportSpot[];
  /** Currently active spot ID */
  activeSpotId?: string;
  /** Accent color for spots */
  accentColor?: string;
  /** Spot size in meters */
  spotSize?: number;
  /** Enable teleport fade effect */
  enableFade?: boolean;
  /** Fade duration in ms */
  fadeDuration?: number;
  /** Called when teleport is triggered */
  onTeleport?: (spot: TeleportSpot) => void;
  /** Called when spots change */
  onSpotsChange?: (spots: TeleportSpot[]) => void;
  /** Called when a new spot is added */
  onSpotAdd?: (spot: TeleportSpot) => void;
  /** Show spot labels */
  showLabels?: boolean;
  /** Allow adding new spots */
  allowAdd?: boolean;
}

// ============================================================================
// Default Spots
// ============================================================================

const DEFAULT_SPOTS: TeleportSpot[] = [
  { id: 'center', name: 'Center', position: [0, 0, 0], color: '#8b5cf6', icon: '🏠' },
  { id: 'front', name: 'Front View', position: [0, 0, -2], rotation: 0, color: '#3b82f6', icon: '👀' },
  { id: 'left', name: 'Left Side', position: [-2, 0, 0], rotation: Math.PI / 2, color: '#10b981', icon: '⬅️' },
  { id: 'right', name: 'Right Side', position: [2, 0, 0], rotation: -Math.PI / 2, color: '#f59e0b', icon: '➡️' },
  { id: 'back', name: 'Back View', position: [0, 0, 2], rotation: Math.PI, color: '#ef4444', icon: '🔙' },
];

// ============================================================================
// Teleport Spot Marker Component
// ============================================================================

interface SpotMarkerProps {
  spot: TeleportSpot;
  isActive: boolean;
  spotSize: number;
  showLabel: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

function SpotMarker({
  spot,
  isActive,
  spotSize,
  showLabel,
  onSelect,
  onHover,
}: SpotMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const ringRef = useRef<THREE.Mesh>(null);

  // Animated spring for hover/active states
  const { scale, emissive, ringScale } = useSpring({
    scale: hovered ? 1.15 : isActive ? 1.1 : 1,
    emissive: hovered ? 0.8 : isActive ? 0.5 : 0.2,
    ringScale: hovered ? 1.3 : isActive ? 1.2 : 1,
    config: { tension: 300, friction: 20 },
  });

  // Rotate the ring animation
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    onHover(true);
  }, [onHover]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    onHover(false);
  }, [onHover]);

  const color = spot.color || '#8b5cf6';

  return (
    <group
      ref={groupRef}
      position={spot.position}
      rotation={[0, spot.rotation || 0, 0]}
    >
      {/* Base platform */}
      <animated.mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        scale={scale}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={onSelect}
      >
        <circleGeometry args={[spotSize / 2, 32]} />
        <animated.meshStandardMaterial
          color={color}
          transparent
          opacity={0.8}
          metalness={0.3}
          roughness={0.5}
          emissive={color}
          emissiveIntensity={emissive}
        />
      </animated.mesh>

      {/* Outer ring (animated) */}
      <animated.mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0]}
        scale={ringScale}
      >
        <ringGeometry args={[spotSize / 2 + 0.02, spotSize / 2 + 0.04, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.9 : 0.5}
          side={THREE.DoubleSide}
        />
      </animated.mesh>

      {/* Direction indicator arrow */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, -spotSize / 2 + 0.05]}
      >
        <coneGeometry args={[0.04, 0.08, 3]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Pulsing center beacon */}
      <animated.mesh position={[0, 0.1, 0]} scale={scale}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <animated.meshStandardMaterial
          color="#ffffff"
          emissive={color}
          emissiveIntensity={emissive}
          transparent
          opacity={0.9}
        />
      </animated.mesh>

      {/* Vertical light beam */}
      {(hovered || isActive) && (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.05, 1, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.4 : 0.2}
          />
        </mesh>
      )}

      {/* Icon */}
      <Text
        position={[0, 0.25, 0]}
        fontSize={0.1}
        anchorX="center"
        anchorY="middle"
      >
        {spot.icon || '📍'}
      </Text>

      {/* Label */}
      {showLabel && (
        <Text
          position={[0, 0.4, 0]}
          fontSize={0.06}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.003}
          outlineColor="#000000"
          maxWidth={0.5}
        >
          {spot.name}
        </Text>
      )}

      {/* Active indicator ring */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[spotSize / 2 + 0.06, spotSize / 2 + 0.08, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Add Spot Marker (Placement Mode)
// ============================================================================

interface AddSpotMarkerProps {
  position: [number, number, number];
  onConfirm: () => void;
  onCancel: () => void;
  accentColor: string;
}

function AddSpotMarker({ position, onConfirm, onCancel, accentColor }: AddSpotMarkerProps) {
  const [pulse, setPulse] = useState(0);

  useFrame((state) => {
    setPulse(Math.sin(state.clock.elapsedTime * 3) * 0.5 + 0.5);
  });

  return (
    <group position={position}>
      {/* Dashed circle preview */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.18, 0.22, 32]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.3 + pulse * 0.4}
        />
      </mesh>

      {/* Plus icon */}
      <Text
        position={[0, 0.15, 0]}
        fontSize={0.12}
        color={accentColor}
        anchorX="center"
        anchorY="middle"
      >
        +
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 0.35, 0]}
        fontSize={0.04}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.002}
        outlineColor="#000000"
      >
        Click to place spot
      </Text>

      {/* Confirm/Cancel buttons */}
      <group position={[0, 0.5, 0]}>
        <mesh position={[-0.08, 0, 0]} onClick={onConfirm}>
          <planeGeometry args={[0.12, 0.06]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <Text
          position={[-0.08, 0, 0.001]}
          fontSize={0.03}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          ✓
        </Text>

        <mesh position={[0.08, 0, 0]} onClick={onCancel}>
          <planeGeometry args={[0.12, 0.06]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <Text
          position={[0.08, 0, 0.001]}
          fontSize={0.03}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          ✗
        </Text>
      </group>
    </group>
  );
}

// ============================================================================
// Teleport Fade Overlay
// ============================================================================

interface TeleportFadeProps {
  active: boolean;
  color?: string;
}

function TeleportFade({ active, color = '#000000' }: TeleportFadeProps) {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  const { opacity } = useSpring({
    opacity: active ? 1 : 0,
    config: { duration: 150 },
  });

  // Keep fade overlay in front of camera
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
      meshRef.current.quaternion.copy(camera.quaternion);
      meshRef.current.translateZ(-0.3);
    }
  });

  return (
    <animated.mesh ref={meshRef}>
      <planeGeometry args={[10, 10]} />
      <animated.meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthTest={false}
        depthWrite={false}
      />
    </animated.mesh>
  );
}

// ============================================================================
// Spots Manager Panel
// ============================================================================

interface SpotsManagerProps {
  spots: TeleportSpot[];
  activeSpotId: string | null;
  onSelectSpot: (spot: TeleportSpot) => void;
  onAddSpot: () => void;
  onRemoveSpot: (id: string) => void;
  accentColor: string;
  visible: boolean;
}

function SpotsManagerPanel({
  spots,
  activeSpotId,
  onSelectSpot,
  onAddSpot,
  onRemoveSpot,
  accentColor,
  visible,
}: SpotsManagerProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // Position panel in front of user
  useFrame(() => {
    if (!groupRef.current || !visible) return;

    // Position above and in front of camera
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    groupRef.current.position.set(
      camera.position.x + forward.x * 0.8,
      camera.position.y + 0.3,
      camera.position.z + forward.z * 0.8
    );

    // Face camera
    groupRef.current.lookAt(camera.position);
  });

  if (!visible) return null;

  const panelWidth = 0.5;
  const panelHeight = 0.4;
  const itemHeight = 0.06;

  return (
    <group ref={groupRef}>
      {/* Panel background */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.95} />
      </mesh>

      {/* Border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(panelWidth, panelHeight)]} />
        <lineBasicMaterial color={accentColor} />
      </lineSegments>

      {/* Title */}
      <Text
        position={[0, panelHeight / 2 - 0.04, 0]}
        fontSize={0.035}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        📍 Teleport Spots
      </Text>

      {/* Spot list */}
      {spots.slice(0, 5).map((spot, index) => {
        const y = panelHeight / 2 - 0.1 - index * itemHeight;
        const isActive = spot.id === activeSpotId;

        return (
          <group key={spot.id} position={[0, y, 0]}>
            {/* Spot button */}
            <mesh
              position={[-0.05, 0, 0]}
              onClick={() => onSelectSpot(spot)}
            >
              <planeGeometry args={[panelWidth - 0.1, itemHeight - 0.01]} />
              <meshBasicMaterial
                color={isActive ? accentColor : '#2a2a3e'}
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* Icon */}
            <Text
              position={[-panelWidth / 2 + 0.05, 0, 0.001]}
              fontSize={0.03}
              anchorX="left"
              anchorY="middle"
            >
              {spot.icon || '📍'}
            </Text>

            {/* Name */}
            <Text
              position={[-panelWidth / 2 + 0.1, 0, 0.001]}
              fontSize={0.025}
              color="#ffffff"
              anchorX="left"
              anchorY="middle"
              maxWidth={panelWidth - 0.2}
            >
              {spot.name}
            </Text>

            {/* Delete button */}
            {spot.id !== 'center' && (
              <mesh
                position={[panelWidth / 2 - 0.08, 0, 0.001]}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSpot(spot.id);
                }}
              >
                <circleGeometry args={[0.015, 16]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Add button */}
      <group position={[0, -panelHeight / 2 + 0.05, 0]}>
        <mesh onClick={onAddSpot}>
          <planeGeometry args={[panelWidth - 0.1, 0.05]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.8} />
        </mesh>
        <Text
          position={[0, 0, 0.001]}
          fontSize={0.025}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          + Add Spot
        </Text>
      </group>
    </group>
  );
}

// ============================================================================
// Main Teleport Spots Component
// ============================================================================

export function TeleportSpots3D({
  spots: initialSpots = DEFAULT_SPOTS,
  activeSpotId: initialActiveId,
  accentColor = '#8b5cf6',
  spotSize = 0.4,
  enableFade = true,
  fadeDuration = 300,
  onTeleport,
  onSpotsChange,
  onSpotAdd,
  showLabels = true,
  allowAdd = true,
}: TeleportSpotsProps) {
  const { camera } = useThree();
  const xrSession = useXR((state) => state.session);

  const [spots, setSpots] = useState<TeleportSpot[]>(initialSpots);
  const [activeSpotId, setActiveSpotId] = useState<string | null>(initialActiveId || null);
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [newSpotPosition, setNewSpotPosition] = useState<[number, number, number]>([0, 0, -1]);
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null);

  // Handle teleport to spot
  const handleTeleport = useCallback((spot: TeleportSpot) => {
    if (isTeleporting) return;

    setIsTeleporting(true);
    setActiveSpotId(spot.id);

    // Fade out
    setTimeout(() => {
      // Move camera to spot position
      // In XR, we need to offset the XR origin, not the camera directly
      const [x, y, z] = spot.position;

      if (xrSession) {
        // For XR: Move the reference space origin
        // This is handled by the XR system - we emit an event
        onTeleport?.(spot);
      } else {
        // For desktop preview: Move camera directly
        camera.position.set(x, camera.position.y, z);
        if (spot.rotation !== undefined) {
          camera.rotation.y = spot.rotation;
        }
      }

      // Fade in
      setTimeout(() => {
        setIsTeleporting(false);
      }, fadeDuration / 2);
    }, fadeDuration / 2);

    onTeleport?.(spot);
  }, [isTeleporting, fadeDuration, camera, xrSession, onTeleport]);

  // Add new spot
  const handleAddSpot = useCallback(() => {
    // Get position in front of camera
    const forward = new THREE.Vector3(0, 0, -2);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.add(camera.position);

    setNewSpotPosition([forward.x, 0, forward.z]);
    setIsAddingSpot(true);
  }, [camera]);

  // Confirm new spot
  const handleConfirmAddSpot = useCallback(() => {
    const newSpot: TeleportSpot = {
      id: `spot-${Date.now()}`,
      name: `Spot ${spots.length + 1}`,
      position: newSpotPosition,
      color: accentColor,
      icon: '📍',
    };

    const newSpots = [...spots, newSpot];
    setSpots(newSpots);
    setIsAddingSpot(false);
    onSpotsChange?.(newSpots);
    onSpotAdd?.(newSpot);
  }, [spots, newSpotPosition, accentColor, onSpotsChange, onSpotAdd]);

  // Remove spot
  const handleRemoveSpot = useCallback((id: string) => {
    const newSpots = spots.filter(s => s.id !== id);
    setSpots(newSpots);
    if (activeSpotId === id) {
      setActiveSpotId(null);
    }
    onSpotsChange?.(newSpots);
  }, [spots, activeSpotId, onSpotsChange]);

  // Toggle manager panel
  const handleToggleManager = useCallback(() => {
    setShowManager(prev => !prev);
  }, []);

  return (
    <group name="teleport-spots">
      {/* Render all spots */}
      {spots.map((spot) => (
        <SpotMarker
          key={spot.id}
          spot={spot}
          isActive={spot.id === activeSpotId}
          spotSize={spotSize}
          showLabel={showLabels}
          onSelect={() => handleTeleport(spot)}
          onHover={(hovered) => setHoveredSpotId(hovered ? spot.id : null)}
        />
      ))}

      {/* Add spot preview */}
      {isAddingSpot && (
        <AddSpotMarker
          position={newSpotPosition}
          onConfirm={handleConfirmAddSpot}
          onCancel={() => setIsAddingSpot(false)}
          accentColor={accentColor}
        />
      )}

      {/* Spots manager panel */}
      <SpotsManagerPanel
        spots={spots}
        activeSpotId={activeSpotId}
        onSelectSpot={handleTeleport}
        onAddSpot={handleAddSpot}
        onRemoveSpot={handleRemoveSpot}
        accentColor={accentColor}
        visible={showManager}
      />

      {/* Teleport fade effect */}
      {enableFade && <TeleportFade active={isTeleporting} />}

      {/* Manager toggle button (floating near user) */}
      <ManagerToggleButton
        onToggle={handleToggleManager}
        isOpen={showManager}
        accentColor={accentColor}
      />
    </group>
  );
}

// ============================================================================
// Manager Toggle Button
// ============================================================================

interface ManagerToggleButtonProps {
  onToggle: () => void;
  isOpen: boolean;
  accentColor: string;
}

function ManagerToggleButton({ onToggle, isOpen, accentColor }: ManagerToggleButtonProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Position button to the side of the user
  useFrame(() => {
    if (!groupRef.current) return;

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    groupRef.current.position.set(
      camera.position.x + right.x * 0.5,
      camera.position.y - 0.2,
      camera.position.z + right.z * 0.5
    );

    groupRef.current.lookAt(camera.position);
  });

  return (
    <group ref={groupRef}>
      <mesh
        onClick={onToggle}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={hovered ? 1.1 : 1}
      >
        <circleGeometry args={[0.04, 32]} />
        <meshStandardMaterial
          color={isOpen ? '#22c55e' : accentColor}
          emissive={isOpen ? '#22c55e' : accentColor}
          emissiveIntensity={hovered ? 0.8 : 0.3}
        />
      </mesh>
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.03}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {isOpen ? '✕' : '📍'}
      </Text>
    </group>
  );
}

// ============================================================================
// Widget Manifest
// ============================================================================

export const TeleportSpotsWidgetManifest: WidgetManifest = {
  id: 'stickernest.teleport-spots',
  name: 'Teleport Spots',
  version: '1.0.0',
  kind: '3d',
  entry: 'index.tsx',
  description: 'Set and jump to specific locations in VR space. Place teleport spots around your environment and instantly travel between them.',
  author: 'StickerNest',
  tags: ['spatial', 'vr', 'ar', 'teleport', 'navigation', 'locomotion', 'spots', 'jump', 'travel'],
  inputs: {
    'spots:set': {
      type: 'array',
      description: 'Set all teleport spots',
    },
    'spots:add': {
      type: 'object',
      description: 'Add a new teleport spot { name, position, color }',
    },
    'spots:remove': {
      type: 'string',
      description: 'Remove a spot by ID',
    },
    'teleport:goto': {
      type: 'string',
      description: 'Teleport to a spot by ID',
    },
  },
  outputs: {
    'teleport:started': {
      type: 'object',
      description: 'Teleport started to a spot',
    },
    'teleport:completed': {
      type: 'object',
      description: 'Teleport completed',
    },
    'spots:changed': {
      type: 'array',
      description: 'Spots list changed',
    },
    'spot:added': {
      type: 'object',
      description: 'New spot was added',
    },
  },
  capabilities: {
    draggable: false,
    resizable: false,
    rotatable: false,
    supports3d: true,
  },
  io: {
    inputs: ['spots:set', 'spots:add', 'spots:remove', 'teleport:goto'],
    outputs: ['teleport:started', 'teleport:completed', 'spots:changed', 'spot:added'],
  },
  size: {
    width: 400,
    height: 300,
    minWidth: 300,
    minHeight: 200,
    scaleMode: 'fixed',
  },
};

// ============================================================================
// Widget Export
// ============================================================================

export const TeleportSpotsWidget: BuiltinWidget = {
  manifest: TeleportSpotsWidgetManifest,
  component: TeleportSpots3D,
};

export default TeleportSpotsWidget;
