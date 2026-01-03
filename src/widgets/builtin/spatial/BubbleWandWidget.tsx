/**
 * StickerNest - Bubble Wand Widget
 *
 * A fun VR widget that turns your controller into a bubble wand!
 * Wave it around to create beautiful, physics-simulated bubbles.
 *
 * Physics:
 * - Faster movement = more bubbles spawn
 * - Slower movement = larger bubbles
 * - Bubbles float upward with realistic wobble
 * - Bubbles have slight iridescent shimmer
 * - Touch or collide with bubbles to pop them
 * - Bubbles pop with satisfying particle effects
 *
 * Features:
 * - Works with VR controllers and hand tracking
 * - Realistic soap bubble physics
 * - Iridescent rainbow materials
 * - Pop particles and effects
 * - Bubble lifetime with natural fade
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Sphere, Trail } from '@react-three/drei';
import { useXR, useXRInputSourceState } from '@react-three/xr';
import * as THREE from 'three';
import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

// ============================================================================
// Types
// ============================================================================

interface Bubble {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  age: number;
  maxAge: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  hue: number;
  popped: boolean;
  popTime: number;
}

interface PopParticle {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  size: number;
  hue: number;
}

export interface BubbleWandProps {
  /** Which hand holds the wand */
  hand?: 'left' | 'right';
  /** Maximum number of bubbles */
  maxBubbles?: number;
  /** Bubble spawn rate multiplier */
  spawnRateMultiplier?: number;
  /** Bubble size multiplier */
  sizeMultiplier?: number;
  /** Enable pop particles */
  enableParticles?: boolean;
  /** Gravity strength (negative = float up) */
  gravity?: number;
  /** Wind strength for bubble drift */
  windStrength?: number;
  /** Bubble lifetime in seconds */
  bubbleLifetime?: number;
  /** Wand color */
  wandColor?: string;
  /** Called when bubble pops */
  onBubblePop?: (bubble: Bubble) => void;
  /** Called when bubble spawns */
  onBubbleSpawn?: (bubble: Bubble) => void;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_BUBBLE_RADIUS = 0.02;
const MAX_BUBBLE_RADIUS = 0.12;
const MIN_SPAWN_VELOCITY = 0.1; // m/s - minimum controller speed to spawn
const MAX_SPAWN_VELOCITY = 2.0; // m/s - velocity for max spawn rate
const SPAWN_COOLDOWN = 0.05; // seconds between spawns
const POP_PARTICLE_COUNT = 8;
const BUBBLE_WOBBLE_AMPLITUDE = 0.02;

// ============================================================================
// Bubble Material (Iridescent soap bubble effect)
// ============================================================================

function createBubbleMaterial(hue: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setHSL(hue, 0.8, 0.6),
    metalness: 0.1,
    roughness: 0.0,
    transmission: 0.95,
    thickness: 0.02,
    ior: 1.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    iridescence: 1.0,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 400],
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  });
}

// ============================================================================
// Single Bubble Component
// ============================================================================

interface BubbleComponentProps {
  bubble: Bubble;
  onPop: (id: string) => void;
}

function BubbleComponent({ bubble, onPop }: BubbleComponentProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Create iridescent material
  const material = useMemo(() => createBubbleMaterial(bubble.hue), [bubble.hue]);

  // Calculate opacity based on age
  const opacity = useMemo(() => {
    const lifeRatio = bubble.age / bubble.maxAge;
    if (lifeRatio > 0.8) {
      return 0.6 * (1 - (lifeRatio - 0.8) / 0.2);
    }
    return 0.6;
  }, [bubble.age, bubble.maxAge]);

  // Update material opacity
  useEffect(() => {
    material.opacity = opacity;
  }, [material, opacity]);

  // Handle pop on click/touch
  const handlePointerDown = useCallback(() => {
    onPop(bubble.id);
  }, [bubble.id, onPop]);

  if (bubble.popped) return null;

  return (
    <mesh
      ref={meshRef}
      position={bubble.position}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <sphereGeometry args={[bubble.radius, 32, 32]} />
      <primitive object={material} attach="material" />

      {/* Inner highlight sphere for depth */}
      <mesh scale={0.3} position={[bubble.radius * 0.3, bubble.radius * 0.3, 0]}>
        <sphereGeometry args={[bubble.radius * 0.2, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>
    </mesh>
  );
}

// ============================================================================
// Pop Particles Component
// ============================================================================

interface PopParticlesProps {
  particles: PopParticle[];
}

function PopParticles({ particles }: PopParticlesProps) {
  return (
    <group>
      {particles.map((particle) => {
        const opacity = 1 - particle.age / particle.maxAge;
        return (
          <mesh key={particle.id} position={particle.position}>
            <sphereGeometry args={[particle.size, 8, 8]} />
            <meshBasicMaterial
              color={new THREE.Color().setHSL(particle.hue, 0.9, 0.7)}
              transparent
              opacity={opacity * 0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// Bubble Wand Model
// ============================================================================

interface WandProps {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  color: string;
  isActive: boolean;
}

function BubbleWandModel({ position, rotation, color, isActive }: WandProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.quaternion.copy(rotation);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Wand handle */}
      <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.01, 0.2, 8]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Wand ring (bubble loop) */}
      <mesh position={[0, 0, -0.02]}>
        <torusGeometry args={[0.04, 0.004, 8, 32]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={isActive ? 0.5 : 0.1}
        />
      </mesh>

      {/* Soap film in the ring (when active) */}
      {isActive && (
        <mesh position={[0, 0, -0.02]}>
          <circleGeometry args={[0.038, 32]} />
          <meshPhysicalMaterial
            color="#88ccff"
            transparent
            opacity={0.3}
            transmission={0.8}
            roughness={0}
            metalness={0}
            iridescence={1}
            iridescenceIOR={1.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Decorative star on handle */}
      <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <octahedronGeometry args={[0.015]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// Main Bubble Wand Component
// ============================================================================

export function BubbleWand3D({
  hand = 'right',
  maxBubbles = 50,
  spawnRateMultiplier = 1,
  sizeMultiplier = 1,
  enableParticles = true,
  gravity = -0.3,
  windStrength = 0.1,
  bubbleLifetime = 8,
  wandColor = '#ff69b4',
  onBubblePop,
  onBubbleSpawn,
}: BubbleWandProps) {
  const { camera } = useThree();
  const xrSession = useXR((state) => state.session);

  // Controller states
  const leftController = useXRInputSourceState('controller', 'left');
  const rightController = useXRInputSourceState('controller', 'right');

  // State
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popParticles, setPopParticles] = useState<PopParticle[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Refs for tracking
  const lastPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const lastSpawnTimeRef = useRef(0);
  const velocityHistoryRef = useRef<number[]>([]);
  const wandPositionRef = useRef(new THREE.Vector3());
  const wandRotationRef = useRef(new THREE.Quaternion());

  // Get controller based on hand preference
  const controller = hand === 'left' ? leftController : rightController;

  // Spawn a bubble
  const spawnBubble = useCallback((position: THREE.Vector3, velocity: number) => {
    // Size inversely proportional to velocity (slower = bigger)
    const velocityFactor = Math.max(0, 1 - velocity / MAX_SPAWN_VELOCITY);
    const radius = (MIN_BUBBLE_RADIUS + velocityFactor * (MAX_BUBBLE_RADIUS - MIN_BUBBLE_RADIUS)) * sizeMultiplier;

    const bubble: Bubble = {
      id: `bubble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.1 + 0.05,
        (Math.random() - 0.5) * 0.2
      ),
      radius,
      age: 0,
      maxAge: bubbleLifetime + Math.random() * 2,
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 1 + Math.random() * 2,
      hue: Math.random(),
      popped: false,
      popTime: 0,
    };

    setBubbles(prev => {
      const newBubbles = [...prev, bubble];
      // Remove oldest if over limit
      if (newBubbles.length > maxBubbles) {
        return newBubbles.slice(-maxBubbles);
      }
      return newBubbles;
    });

    onBubbleSpawn?.(bubble);
  }, [maxBubbles, sizeMultiplier, bubbleLifetime, onBubbleSpawn]);

  // Pop a bubble
  const popBubble = useCallback((id: string) => {
    setBubbles(prev => {
      const bubble = prev.find(b => b.id === id);
      if (bubble && !bubble.popped) {
        // Create pop particles
        if (enableParticles) {
          const newParticles: PopParticle[] = [];
          for (let i = 0; i < POP_PARTICLE_COUNT; i++) {
            const angle = (i / POP_PARTICLE_COUNT) * Math.PI * 2;
            const speed = 0.5 + Math.random() * 0.5;
            newParticles.push({
              id: `particle-${Date.now()}-${i}`,
              position: bubble.position.clone(),
              velocity: new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.random() * speed,
                Math.sin(angle) * speed
              ),
              age: 0,
              maxAge: 0.5,
              size: bubble.radius * 0.1,
              hue: bubble.hue,
            });
          }
          setPopParticles(prev => [...prev, ...newParticles]);
        }

        onBubblePop?.(bubble);

        // Mark as popped
        return prev.map(b => b.id === id ? { ...b, popped: true, popTime: Date.now() } : b);
      }
      return prev;
    });
  }, [enableParticles, onBubblePop]);

  // Main physics update
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Get wand position from controller or fallback to in front of camera
    let currentPosition = new THREE.Vector3();
    let currentRotation = new THREE.Quaternion();

    if (controller?.object) {
      controller.object.getWorldPosition(currentPosition);
      controller.object.getWorldQuaternion(currentRotation);
      setIsActive(true);
    } else if (xrSession) {
      // No controller available in XR, don't render wand
      setIsActive(false);
    } else {
      // Desktop mode: position in front of camera for testing
      const forward = new THREE.Vector3(0, -0.3, -0.5);
      forward.applyQuaternion(camera.quaternion);
      currentPosition.copy(camera.position).add(forward);
      currentRotation.copy(camera.quaternion);
      setIsActive(true);
    }

    wandPositionRef.current.copy(currentPosition);
    wandRotationRef.current.copy(currentRotation);

    // Calculate velocity
    const velocity = currentPosition.distanceTo(lastPositionRef.current) / Math.max(delta, 0.001);
    velocityHistoryRef.current.push(velocity);
    if (velocityHistoryRef.current.length > 10) {
      velocityHistoryRef.current.shift();
    }
    const avgVelocity = velocityHistoryRef.current.reduce((a, b) => a + b, 0) / velocityHistoryRef.current.length;

    lastPositionRef.current.copy(currentPosition);

    // Spawn bubbles based on velocity
    if (isActive && avgVelocity > MIN_SPAWN_VELOCITY && time - lastSpawnTimeRef.current > SPAWN_COOLDOWN) {
      // Spawn rate proportional to velocity
      const spawnChance = Math.min(1, (avgVelocity / MAX_SPAWN_VELOCITY) * spawnRateMultiplier);

      if (Math.random() < spawnChance) {
        // Spawn position at wand ring
        const spawnPos = currentPosition.clone();
        const forward = new THREE.Vector3(0, 0, -0.05);
        forward.applyQuaternion(currentRotation);
        spawnPos.add(forward);

        spawnBubble(spawnPos, avgVelocity);
        lastSpawnTimeRef.current = time;
      }
    }

    // Update bubble physics
    setBubbles(prev => prev.filter(bubble => {
      if (bubble.popped) return false;
      if (bubble.age > bubble.maxAge) return false;

      // Update age
      bubble.age += delta;

      // Apply gravity (negative = float up)
      bubble.velocity.y -= gravity * delta;

      // Apply wind
      bubble.velocity.x += (Math.sin(time * 0.5) * windStrength) * delta;
      bubble.velocity.z += (Math.cos(time * 0.7) * windStrength) * delta;

      // Apply drag
      bubble.velocity.multiplyScalar(0.99);

      // Wobble motion
      const wobble = Math.sin(time * bubble.wobbleSpeed + bubble.wobbleOffset) * BUBBLE_WOBBLE_AMPLITUDE;

      // Update position
      bubble.position.add(bubble.velocity.clone().multiplyScalar(delta));
      bubble.position.x += wobble * delta;
      bubble.position.z += Math.cos(time * bubble.wobbleSpeed * 1.3 + bubble.wobbleOffset) * BUBBLE_WOBBLE_AMPLITUDE * delta;

      // Check collision with controller/hand (pop on touch)
      if (controller?.object) {
        const controllerPos = new THREE.Vector3();
        controller.object.getWorldPosition(controllerPos);
        const distance = bubble.position.distanceTo(controllerPos);
        if (distance < bubble.radius + 0.05) {
          popBubble(bubble.id);
          return false;
        }
      }

      // Check collision with other bubbles
      for (const other of prev) {
        if (other.id !== bubble.id && !other.popped) {
          const distance = bubble.position.distanceTo(other.position);
          const minDist = bubble.radius + other.radius;
          if (distance < minDist * 0.8) {
            // Pop the smaller one
            if (bubble.radius <= other.radius) {
              popBubble(bubble.id);
              return false;
            }
          }
        }
      }

      // Pop if too old
      if (bubble.age > bubble.maxAge * 0.95) {
        popBubble(bubble.id);
        return false;
      }

      return true;
    }));

    // Update pop particles
    setPopParticles(prev => prev.filter(particle => {
      particle.age += delta;
      if (particle.age > particle.maxAge) return false;

      // Apply gravity and update position
      particle.velocity.y -= 2 * delta;
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));

      return true;
    }));
  });

  return (
    <group name="bubble-wand">
      {/* The wand model */}
      <BubbleWandModel
        position={wandPositionRef.current}
        rotation={wandRotationRef.current}
        color={wandColor}
        isActive={isActive}
      />

      {/* All bubbles */}
      {bubbles.map(bubble => (
        <BubbleComponent
          key={bubble.id}
          bubble={bubble}
          onPop={popBubble}
        />
      ))}

      {/* Pop particles */}
      <PopParticles particles={popParticles} />

      {/* Bubble count indicator (debug) */}
      {false && (
        <Text
          position={[0, 2, -1]}
          fontSize={0.1}
          color="#ffffff"
          anchorX="center"
        >
          Bubbles: {bubbles.length}
        </Text>
      )}
    </group>
  );
}

// ============================================================================
// Widget Manifest
// ============================================================================

export const BubbleWandWidgetManifest: WidgetManifest = {
  id: 'stickernest.bubble-wand',
  name: 'Bubble Wand',
  version: '1.0.0',
  kind: '3d',
  entry: 'index.tsx',
  description: 'Wave your VR controller like a bubble wand! Faster movement creates more bubbles, slower creates larger ones. Touch bubbles to pop them!',
  author: 'StickerNest',
  tags: ['spatial', 'vr', 'ar', 'fun', 'bubbles', 'interactive', 'physics', 'toy', 'wand'],
  inputs: {
    'wand:setHand': {
      type: 'string',
      description: 'Set which hand holds the wand: left or right',
    },
    'bubbles:popAll': {
      type: 'boolean',
      description: 'Pop all existing bubbles',
    },
    'wand:setColor': {
      type: 'string',
      description: 'Set wand color',
    },
  },
  outputs: {
    'bubble:spawned': {
      type: 'object',
      description: 'A bubble was created',
    },
    'bubble:popped': {
      type: 'object',
      description: 'A bubble was popped',
    },
    'bubbles:count': {
      type: 'number',
      description: 'Current bubble count changed',
    },
  },
  capabilities: {
    draggable: false,
    resizable: false,
    rotatable: false,
    supports3d: true,
  },
  io: {
    inputs: ['wand:setHand', 'bubbles:popAll', 'wand:setColor'],
    outputs: ['bubble:spawned', 'bubble:popped', 'bubbles:count'],
  },
  size: {
    width: 300,
    height: 200,
    minWidth: 200,
    minHeight: 150,
    scaleMode: 'fixed',
  },
};

// ============================================================================
// Widget Export
// ============================================================================

export const BubbleWandWidget: BuiltinWidget = {
  manifest: BubbleWandWidgetManifest,
  component: BubbleWand3D,
};

export default BubbleWandWidget;
