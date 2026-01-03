/**
 * GrabbableObjects - VR grabbable object system with physics
 *
 * Supports near and far grabbing, velocity tracking for throws,
 * and basic physics simulation (gravity, bouncing, friction).
 */

import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

// ============================================================================
// Grabbable Object Component
// ============================================================================

export interface GrabbableObjectProps {
  initialPosition: [number, number, number];
  color: string;
  size?: number;
  shape?: 'box' | 'sphere';
  mass?: number;
}

/**
 * Grabbable object that can be picked up with grip, held, and thrown.
 * Supports both near grab (touching) and far grab (pointing + grip).
 * Velocity is tracked for realistic throwing.
 */
export function GrabbableObject({
  initialPosition,
  color,
  size = 0.15,
  shape = 'box',
  mass = 1,
}: GrabbableObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Object state
  const [position, setPosition] = useState<THREE.Vector3>(
    () => new THREE.Vector3(...initialPosition)
  );
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [grabbingController, setGrabbingController] = useState<'left' | 'right' | null>(null);

  // Velocity tracking for throwing
  const velocityRef = useRef(new THREE.Vector3());
  const positionHistoryRef = useRef<THREE.Vector3[]>([]);

  // Physics state for thrown objects
  const [isFlying, setIsFlying] = useState(false);
  const flyingVelocityRef = useRef(new THREE.Vector3());

  // Grab offset (where on the object the controller grabbed it)
  const grabOffsetRef = useRef(new THREE.Vector3());

  // Handle pointer down (start grab) - works for both near and far
  const handlePointerDown = useCallback(
    (e: any) => {
      e.stopPropagation();

      const inputSource = e.nativeEvent?.inputSource;
      const handedness = inputSource?.handedness || 'right';

      setIsGrabbed(true);
      setGrabbingController(handedness as 'left' | 'right');
      setIsFlying(false);

      if (meshRef.current && e.point) {
        grabOffsetRef.current.copy(position).sub(e.point);
      }

      positionHistoryRef.current = [];
      velocityRef.current.set(0, 0, 0);
    },
    [position]
  );

  // Handle pointer up (release and potentially throw)
  const handlePointerUp = useCallback(
    (e: any) => {
      if (!isGrabbed) return;
      e.stopPropagation();

      setIsGrabbed(false);
      setGrabbingController(null);

      const speed = velocityRef.current.length();
      if (speed > 0.5) {
        flyingVelocityRef.current.copy(velocityRef.current);
        setIsFlying(true);
      }
    },
    [isGrabbed]
  );

  // Update position while grabbed and handle flying physics
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (isGrabbed) {
      const controllers = state.gl.xr.getSession()?.inputSources;
      if (controllers) {
        for (const controller of controllers) {
          if (controller.handedness === grabbingController && controller.gripSpace) {
            const referenceSpace = state.gl.xr.getReferenceSpace();
            if (referenceSpace) {
              const frame = state.gl.xr.getFrame();
              const pose = frame?.getPose(controller.gripSpace, referenceSpace);
              if (pose) {
                const newPos = new THREE.Vector3(
                  pose.transform.position.x,
                  pose.transform.position.y,
                  pose.transform.position.z
                );

                newPos.add(grabOffsetRef.current);

                positionHistoryRef.current.push(newPos.clone());
                if (positionHistoryRef.current.length > 5) {
                  positionHistoryRef.current.shift();
                }

                if (positionHistoryRef.current.length >= 2) {
                  const oldest = positionHistoryRef.current[0];
                  const newest = positionHistoryRef.current[positionHistoryRef.current.length - 1];
                  const timeSpan = (positionHistoryRef.current.length - 1) * delta;
                  if (timeSpan > 0) {
                    velocityRef.current.subVectors(newest, oldest).divideScalar(timeSpan);
                    velocityRef.current.multiplyScalar(2.5 / mass);
                  }
                }

                setPosition(newPos.clone());
              }
            }
          }
        }
      }
    } else if (isFlying) {
      const gravity = -9.8 * delta;
      flyingVelocityRef.current.y += gravity;
      flyingVelocityRef.current.multiplyScalar(0.99);

      const newPos = position
        .clone()
        .add(flyingVelocityRef.current.clone().multiplyScalar(delta));

      if (newPos.y < size / 2) {
        newPos.y = size / 2;
        flyingVelocityRef.current.y *= -0.5;

        if (Math.abs(flyingVelocityRef.current.y) < 0.2) {
          flyingVelocityRef.current.y = 0;
        }

        flyingVelocityRef.current.x *= 0.9;
        flyingVelocityRef.current.z *= 0.9;
      }

      if (flyingVelocityRef.current.length() < 0.05 && newPos.y <= size / 2 + 0.01) {
        setIsFlying(false);
        flyingVelocityRef.current.set(0, 0, 0);
      }

      setPosition(newPos);
    }
  });

  const currentColor = isGrabbed ? '#22c55e' : isHovered ? '#fbbf24' : color;
  const emissiveColor = isGrabbed ? '#166534' : isHovered ? '#92400e' : '#000000';
  const scale = isGrabbed ? 1.15 : isHovered ? 1.08 : 1;

  return (
    <group ref={groupRef} position={position.toArray()}>
      <mesh
        ref={meshRef}
        scale={scale}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        {shape === 'box' ? (
          <boxGeometry args={[size, size, size]} />
        ) : (
          <sphereGeometry args={[size / 2, 32, 32]} />
        )}
        <meshStandardMaterial
          color={currentColor}
          emissive={emissiveColor}
          emissiveIntensity={isGrabbed ? 0.5 : isHovered ? 0.3 : 0}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// Grabbable Test Area - Collection of grabbable objects
// ============================================================================

/**
 * Area with grabbable objects in various positions for testing
 */
export function GrabbableTestArea() {
  return (
    <group>
      {/* Table-height grabbables (easy to reach) */}
      <GrabbableObject
        initialPosition={[-0.8, 1.0, -1.2]}
        color="#ef4444"
        size={0.12}
        shape="box"
        mass={1}
      />
      <GrabbableObject
        initialPosition={[-0.4, 1.0, -1.2]}
        color="#3b82f6"
        size={0.14}
        shape="sphere"
        mass={0.8}
      />
      <GrabbableObject
        initialPosition={[0, 1.0, -1.2]}
        color="#22c55e"
        size={0.1}
        shape="box"
        mass={0.5}
      />
      <GrabbableObject
        initialPosition={[0.4, 1.0, -1.2]}
        color="#f59e0b"
        size={0.13}
        shape="sphere"
        mass={1.2}
      />
      <GrabbableObject
        initialPosition={[0.8, 1.0, -1.2]}
        color="#8b5cf6"
        size={0.11}
        shape="box"
        mass={0.7}
      />

      {/* Floating grabbables (need to reach or far-grab) */}
      <GrabbableObject
        initialPosition={[-0.5, 1.8, -2]}
        color="#ec4899"
        size={0.15}
        shape="sphere"
        mass={0.6}
      />
      <GrabbableObject
        initialPosition={[0.5, 1.8, -2]}
        color="#06b6d4"
        size={0.15}
        shape="sphere"
        mass={0.6}
      />

      {/* Side grabbables */}
      <GrabbableObject
        initialPosition={[-1.5, 1.2, -0.8]}
        color="#84cc16"
        size={0.18}
        shape="box"
        mass={2}
      />
      <GrabbableObject
        initialPosition={[1.5, 1.2, -0.8]}
        color="#f43f5e"
        size={0.08}
        shape="box"
        mass={0.3}
      />

      {/* Visual platform/table for grabbables */}
      <mesh position={[0, 0.9, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 0.6]} />
        <meshStandardMaterial
          color="#2d2d3d"
          transparent
          opacity={0.5}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}
