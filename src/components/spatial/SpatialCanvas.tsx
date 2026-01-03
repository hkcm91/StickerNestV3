/**
 * StickerNest - SpatialCanvas
 *
 * The WebGL/Three.js renderer for VR and AR modes.
 * Runs in parallel with the DOM renderer (CanvasRenderer).
 * When spatial mode is 'vr' or 'ar', this component handles all rendering.
 *
 * IMPORTANT: The Canvas and XR components must ALWAYS be mounted for XR sessions
 * to work. The `active` prop controls visibility, NOT mounting. This is because
 * @react-three/xr requires the <XR> component to be in the React tree before
 * xrStore.enterVR() or xrStore.enterAR() can establish a WebXR session.
 *
 * However, to avoid interference with 2D modes:
 * - Scene content only renders when active
 * - Frame loop is paused when hidden (frameloop="demand")
 * - No interactive elements when hidden
 */

import React, { Suspense, useEffect, useState, useMemo, useRef, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { XR, XROrigin, useXR, useXRControllerLocomotion, TeleportTarget } from '@react-three/xr';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import type { Group } from 'three';
import { useSpatialModeStore, useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { SpatialScene } from './SpatialScene';
import { xrStore } from './xrStore';
import * as THREE from 'three';
import { initializeBVH, isBVHInitialized } from '../../utils/bvhSetup';
import { AmbientEnvironment } from './AmbientEnvironment';
import { VRBackground } from './VRBackground';
import { XRControllerDebug } from './xr/XRControllerDebug';

// ============================================================================
// XR Error Boundary - Catches XR-related errors without crashing the app
// ============================================================================

interface XRErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class XRErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, XRErrorBoundaryState> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): XRErrorBoundaryState {
    console.error('[XRErrorBoundary] Caught XR error:', error.message);
    console.error('[XRErrorBoundary] Full error:', error);
    console.error('[XRErrorBoundary] Stack:', error.stack);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[XRErrorBoundary] XR component error:', error.message);
    console.error('[XRErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Show the actual error in the fallback
      return this.props.fallback ?? <XRErrorFallbackWithError error={this.state.error} />;
    }
    return this.props.children;
  }
}

/**
 * Error fallback that shows the actual error message
 * Uses simple mesh geometry to avoid any font loading issues
 */
function XRErrorFallbackWithError({ error }: { error: Error | null }) {
  const errorMsg = error?.message || 'Unknown error';
  console.error('[XRErrorFallbackWithError] Displaying error:', errorMsg);

  // Log the error to console for easy debugging
  useEffect(() => {
    console.error('===========================================');
    console.error('XR ERROR - Check the message below:');
    console.error(errorMsg);
    console.error('===========================================');
  }, [errorMsg]);

  return (
    <group>
      {/* Simple visual indicator - a red X made of cubes */}
      <mesh position={[0, 1.6, -2]}>
        <boxGeometry args={[0.5, 0.1, 0.1]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 1.6, -2]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.5, 0.1, 0.1]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 1.6, -2]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.5, 0.1, 0.1]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Text showing error - using simple Text from drei */}
      {/* If this fails to render, at least the X will show */}
      <Text
        position={[0, 1.3, -2]}
        fontSize={0.05}
        color="#ef4444"
        anchorX="center"
        anchorY="middle"
      >
        XR Error - See Console
      </Text>
      <Text
        position={[0, 1.15, -2]}
        fontSize={0.035}
        color="#f59e0b"
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
        textAlign="center"
      >
        {errorMsg}
      </Text>
    </group>
  );
}

/**
 * Fallback 3D content when XR has errors - shows message instead of crashing
 */
function XRErrorFallback() {
  return (
    <group>
      <Text
        position={[0, 1.6, -2]}
        fontSize={0.08}
        color="#f59e0b"
        anchorX="center"
        anchorY="middle"
      >
        XR Features Limited
      </Text>
      <Text
        position={[0, 1.45, -2]}
        fontSize={0.05}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
        textAlign="center"
      >
        3D preview available. VR/AR features may need updated dependencies.
      </Text>
    </group>
  );
}

/**
 * Interactive test cube - click to toggle color, shows hover state
 */
interface InteractiveCubeProps {
  position: [number, number, number];
  color: string;
  hoverColor: string;
  activeColor: string;
  size?: number;
  label?: string;
}

function InteractiveCube({ position, color, hoverColor, activeColor, size = 0.2, label }: InteractiveCubeProps) {
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        scale={clicked ? 1.2 : hovered ? 1.1 : 1}
        onClick={(e) => {
          e.stopPropagation();
          console.log(`[InteractiveCube] ${label || 'Cube'} CLICKED!`);
          setClicked(!clicked);
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial
          color={clicked ? activeColor : hovered ? hoverColor : color}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>
      {label && (
        <Text
          position={[0, size + 0.1, 0]}
          fontSize={0.05}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
        >
          {label}
        </Text>
      )}
    </group>
  );
}

/**
 * Interactive sphere for variety
 */
function InteractiveSphere({ position, color, size = 0.15, label }: { position: [number, number, number]; color: string; size?: number; label?: string }) {
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        scale={clicked ? 1.3 : hovered ? 1.15 : 1}
        onClick={(e) => {
          e.stopPropagation();
          console.log(`[InteractiveSphere] ${label || 'Sphere'} CLICKED!`);
          setClicked(!clicked);
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={clicked ? '#22c55e' : hovered ? '#fbbf24' : color}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.4 : 0}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      {label && (
        <Text
          position={[0, size + 0.12, 0]}
          fontSize={0.04}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
        >
          {label}
        </Text>
      )}
    </group>
  );
}

/**
 * Interactive test area with multiple objects to click
 * Arranged in a semicircle around the user
 */
function InteractiveTestArea() {
  return (
    <group>
      {/* Front row - easy to reach */}
      <InteractiveCube
        position={[0, 1.2, -1.5]}
        color="#8b5cf6"
        hoverColor="#a78bfa"
        activeColor="#22c55e"
        size={0.2}
        label="Purple"
      />
      <InteractiveCube
        position={[-0.5, 1.2, -1.5]}
        color="#ef4444"
        hoverColor="#f87171"
        activeColor="#22c55e"
        size={0.2}
        label="Red"
      />
      <InteractiveCube
        position={[0.5, 1.2, -1.5]}
        color="#3b82f6"
        hoverColor="#60a5fa"
        activeColor="#22c55e"
        size={0.2}
        label="Blue"
      />

      {/* Higher row */}
      <InteractiveSphere position={[-0.3, 1.8, -1.8]} color="#f59e0b" label="Gold" />
      <InteractiveSphere position={[0.3, 1.8, -1.8]} color="#ec4899" label="Pink" />

      {/* Side objects - test peripheral interaction */}
      <InteractiveCube
        position={[-1.2, 1.4, -1.0]}
        color="#10b981"
        hoverColor="#34d399"
        activeColor="#fbbf24"
        size={0.25}
        label="Left"
      />
      <InteractiveCube
        position={[1.2, 1.4, -1.0]}
        color="#06b6d4"
        hoverColor="#22d3ee"
        activeColor="#fbbf24"
        size={0.25}
        label="Right"
      />

      {/* Far objects - test distance interaction */}
      <InteractiveCube
        position={[0, 1.5, -3]}
        color="#6366f1"
        hoverColor="#818cf8"
        activeColor="#22c55e"
        size={0.4}
        label="Far"
      />
      <InteractiveSphere position={[-1, 1.5, -3]} color="#f43f5e" size={0.2} label="Far Left" />
      <InteractiveSphere position={[1, 1.5, -3]} color="#14b8a6" size={0.2} label="Far Right" />

      {/* Low objects - test looking down */}
      <InteractiveCube
        position={[0, 0.5, -1.2]}
        color="#84cc16"
        hoverColor="#a3e635"
        activeColor="#22c55e"
        size={0.15}
        label="Low"
      />
    </group>
  );
}

/**
 * Simple test cube to verify XR pointer events work
 * Click it to see if onClick fires - will turn green and log
 */
function XRTestCube() {
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      position={[0, 1.5, -1.5]}
      scale={clicked ? 1.3 : 1}
      onClick={(e) => {
        e.stopPropagation();
        console.log('[XRTestCube] CLICKED! Event:', e);
        setClicked(!clicked);
      }}
      onPointerEnter={(e) => {
        console.log('[XRTestCube] Pointer ENTER');
        setHovered(true);
      }}
      onPointerLeave={(e) => {
        console.log('[XRTestCube] Pointer LEAVE');
        setHovered(false);
      }}
      onPointerDown={(e) => {
        console.log('[XRTestCube] Pointer DOWN');
      }}
      onPointerUp={(e) => {
        console.log('[XRTestCube] Pointer UP');
      }}
    >
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial
        color={clicked ? '#22c55e' : hovered ? '#a78bfa' : '#8b5cf6'}
        emissive={hovered ? '#4c1d95' : '#000000'}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

/**
 * Locomotion controller - enables thumbstick movement and teleportation
 */
function LocomotionController({ originRef }: { originRef: React.RefObject<Group> }) {
  // Enable thumbstick locomotion
  // Left stick = movement, Right stick = rotation
  useXRControllerLocomotion(originRef, {
    speed: 2.5, // meters per second
  });

  return null;
}

/**
 * Teleportable floor - click to teleport
 */
function TeleportFloor({ onTeleport }: { onTeleport: (point: THREE.Vector3) => void }) {
  return (
    <TeleportTarget onTeleport={onTeleport}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[15, 64]} />
        <meshStandardMaterial
          color="#1a1a2e"
          transparent
          opacity={0.8}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>
      {/* Visual grid on floor */}
      <Grid
        position={[0, 0.02, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3b3b5c"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#6366f1"
        fadeDistance={20}
        fadeStrength={1}
        followCamera={false}
      />
    </TeleportTarget>
  );
}

// ============================================================================
// Grabbable Object System - Pick up, hold, and throw objects in VR
// ============================================================================

interface GrabbableObjectProps {
  initialPosition: [number, number, number];
  color: string;
  size?: number;
  shape?: 'box' | 'sphere';
  label?: string;
  mass?: number; // Affects throw distance
}

/**
 * Grabbable object that can be picked up with grip, held, and thrown.
 * Supports both near grab (touching) and far grab (pointing + grip).
 * Velocity is tracked for realistic throwing.
 */
function GrabbableObject({
  initialPosition,
  color,
  size = 0.15,
  shape = 'box',
  label,
  mass = 1,
}: GrabbableObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Object state
  const [position, setPosition] = useState<THREE.Vector3>(() => new THREE.Vector3(...initialPosition));
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [grabbingController, setGrabbingController] = useState<'left' | 'right' | null>(null);

  // Velocity tracking for throwing
  const velocityRef = useRef(new THREE.Vector3());
  const lastPositionRef = useRef(new THREE.Vector3(...initialPosition));
  const positionHistoryRef = useRef<THREE.Vector3[]>([]);

  // Physics state for thrown objects
  const [isFlying, setIsFlying] = useState(false);
  const flyingVelocityRef = useRef(new THREE.Vector3());

  // Grab offset (where on the object the controller grabbed it)
  const grabOffsetRef = useRef(new THREE.Vector3());

  // Get controller states from XR
  const session = useXR((state) => state.session);

  // Handle pointer down (start grab) - works for both near and far
  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();

    // Determine which controller is grabbing based on the event
    const inputSource = e.nativeEvent?.inputSource;
    const handedness = inputSource?.handedness || 'right';

    console.log(`[GrabbableObject] ${label} GRABBED by ${handedness} controller`);

    setIsGrabbed(true);
    setGrabbingController(handedness as 'left' | 'right');
    setIsFlying(false);

    // Calculate grab offset (difference between controller and object position)
    if (meshRef.current && e.point) {
      grabOffsetRef.current.copy(position).sub(e.point);
    }

    // Reset velocity tracking
    positionHistoryRef.current = [];
    velocityRef.current.set(0, 0, 0);
  }, [position, label]);

  // Handle pointer up (release and potentially throw)
  const handlePointerUp = useCallback((e: any) => {
    if (!isGrabbed) return;
    e.stopPropagation();

    console.log(`[GrabbableObject] ${label} RELEASED with velocity:`, velocityRef.current.toArray());

    setIsGrabbed(false);
    setGrabbingController(null);

    // Apply throw velocity if significant
    const speed = velocityRef.current.length();
    if (speed > 0.5) {
      console.log(`[GrabbableObject] ${label} THROWN with speed:`, speed);
      flyingVelocityRef.current.copy(velocityRef.current);
      setIsFlying(true);
    }
  }, [isGrabbed, label]);

  // Update position while grabbed and handle flying physics
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (isGrabbed) {
      // Get the controller that's grabbing
      const controllers = state.gl.xr.getSession()?.inputSources;
      if (controllers) {
        for (const controller of controllers) {
          if (controller.handedness === grabbingController && controller.gripSpace) {
            // Get controller world position
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

                // Add grab offset for more natural holding
                newPos.add(grabOffsetRef.current);

                // Track position history for velocity calculation
                positionHistoryRef.current.push(newPos.clone());
                if (positionHistoryRef.current.length > 5) {
                  positionHistoryRef.current.shift();
                }

                // Calculate velocity from position history
                if (positionHistoryRef.current.length >= 2) {
                  const oldest = positionHistoryRef.current[0];
                  const newest = positionHistoryRef.current[positionHistoryRef.current.length - 1];
                  const timeSpan = (positionHistoryRef.current.length - 1) * delta;
                  if (timeSpan > 0) {
                    velocityRef.current.subVectors(newest, oldest).divideScalar(timeSpan);
                    // Amplify velocity for more satisfying throws
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
      // Apply physics while flying
      const gravity = -9.8 * delta;
      flyingVelocityRef.current.y += gravity;

      // Apply drag
      flyingVelocityRef.current.multiplyScalar(0.99);

      // Update position
      const newPos = position.clone().add(
        flyingVelocityRef.current.clone().multiplyScalar(delta)
      );

      // Floor collision
      if (newPos.y < size / 2) {
        newPos.y = size / 2;
        flyingVelocityRef.current.y *= -0.5; // Bounce with energy loss

        // Stop if moving slowly
        if (Math.abs(flyingVelocityRef.current.y) < 0.2) {
          flyingVelocityRef.current.y = 0;
        }

        // Friction on ground
        flyingVelocityRef.current.x *= 0.9;
        flyingVelocityRef.current.z *= 0.9;
      }

      // Stop flying if very slow
      if (flyingVelocityRef.current.length() < 0.05 && newPos.y <= size / 2 + 0.01) {
        setIsFlying(false);
        flyingVelocityRef.current.set(0, 0, 0);
      }

      setPosition(newPos);
    }
  });

  // Visual feedback colors
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
      {label && (
        <Text
          position={[0, size + 0.08, 0]}
          fontSize={0.04}
          color={isGrabbed ? '#22c55e' : '#ffffff'}
          anchorX="center"
          anchorY="bottom"
        >
          {isGrabbed ? `${label} (Holding)` : label}
        </Text>
      )}
    </group>
  );
}

/**
 * Area with grabbable test objects in various positions
 */
function GrabbableTestArea() {
  return (
    <group>
      {/* Table-height grabbables (easy to reach) */}
      <GrabbableObject
        initialPosition={[-0.8, 1.0, -1.2]}
        color="#ef4444"
        size={0.12}
        shape="box"
        label="Red Box"
        mass={1}
      />
      <GrabbableObject
        initialPosition={[-0.4, 1.0, -1.2]}
        color="#3b82f6"
        size={0.14}
        shape="sphere"
        label="Blue Ball"
        mass={0.8}
      />
      <GrabbableObject
        initialPosition={[0, 1.0, -1.2]}
        color="#22c55e"
        size={0.1}
        shape="box"
        label="Green Cube"
        mass={0.5}
      />
      <GrabbableObject
        initialPosition={[0.4, 1.0, -1.2]}
        color="#f59e0b"
        size={0.13}
        shape="sphere"
        label="Gold Orb"
        mass={1.2}
      />
      <GrabbableObject
        initialPosition={[0.8, 1.0, -1.2]}
        color="#8b5cf6"
        size={0.11}
        shape="box"
        label="Purple Box"
        mass={0.7}
      />

      {/* Floating grabbables (need to reach or far-grab) */}
      <GrabbableObject
        initialPosition={[-0.5, 1.8, -2]}
        color="#ec4899"
        size={0.15}
        shape="sphere"
        label="Pink Float"
        mass={0.6}
      />
      <GrabbableObject
        initialPosition={[0.5, 1.8, -2]}
        color="#06b6d4"
        size={0.15}
        shape="sphere"
        label="Cyan Float"
        mass={0.6}
      />

      {/* Side grabbables */}
      <GrabbableObject
        initialPosition={[-1.5, 1.2, -0.8]}
        color="#84cc16"
        size={0.18}
        shape="box"
        label="Left Heavy"
        mass={2}
      />
      <GrabbableObject
        initialPosition={[1.5, 1.2, -0.8]}
        color="#f43f5e"
        size={0.08}
        shape="box"
        label="Right Light"
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

// ============================================================================
// XR Debug Logger (inside XR context)
// ============================================================================

/**
 * Logs XR session state changes for debugging.
 * Frame loop is now always running (frameloop="always" on Canvas).
 */
function XRDebugLogger() {
  const session = useXR((state) => state.session);

  useEffect(() => {
    if (session) {
      const mode = (session as unknown as { mode?: string })?.mode;
      console.log('[XRDebugLogger] XR session ACTIVE:', { mode, session });
    } else {
      console.log('[XRDebugLogger] No XR session');
    }
  }, [session]);

  return null;
}

// ============================================================================
// XR Background Controller - Manages canvas transparency for VR/AR
// ============================================================================

/**
 * Controls the WebGL clear color based on spatial mode:
 * - VR mode: Fully OPAQUE background (dark space environment)
 * - AR mode: Fully TRANSPARENT (real-world passthrough)
 * - Desktop 3D: Opaque for preview
 */
function XRBackgroundController() {
  const { gl } = useThree();
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);

  useEffect(() => {
    // Determine if we're in AR mode (or transitioning to AR)
    const isARMode = spatialMode === 'ar' ||
      (sessionState === 'requesting' && targetMode === 'ar') ||
      (sessionState === 'active' && targetMode === 'ar');

    if (isARMode) {
      // AR: Fully transparent - only widgets visible, real world shows through
      gl.setClearColor(0x000000, 0);
      console.log('[XRBackgroundController] AR mode: transparent background (alpha=0)');
    } else {
      // VR/Desktop: Fully opaque dark background
      gl.setClearColor(0x0a0a0f, 1);
      console.log('[XRBackgroundController] VR/Desktop mode: opaque background (alpha=1)');
    }
  }, [gl, spatialMode, sessionState, targetMode]);

  return null;
}

// ============================================================================
// XR Session State Tracker
// ============================================================================

/**
 * Tracks XR session state from within the XR context and syncs to our store.
 * This component must be inside the <XR> provider to access useXR hooks.
 *
 * IMPORTANT: This tracker must NOT reset to desktop mode when in preview mode.
 * Preview mode (mobile VR/AR) deliberately runs without an XR session.
 */
function XRSessionStateTracker() {
  const session = useXR((state) => state.session);
  const activeMode = useSpatialModeStore((s) => s.activeMode);
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const setActiveMode = useSpatialModeStore((s) => s.setActiveMode);
  const setSessionState = useSpatialModeStore((s) => s.setSessionState);

  useEffect(() => {
    if (session) {
      // WebXR session.mode exists but TypeScript types may be outdated
      const sessionMode = (session as unknown as { mode?: string }).mode;
      console.log('[XRSessionStateTracker] Active XR session detected:', sessionMode);
      setSessionState('active');
      if (sessionMode === 'immersive-ar') {
        setActiveMode('ar');
      } else {
        setActiveMode('vr');
      }
    } else {
      // IMPORTANT: Don't reset to desktop if we're in preview mode!
      // Preview mode (used on mobile) runs VR/AR without an actual XR session.
      // Only reset if we previously had an active session that ended.
      const isInPreviewMode = (activeMode === 'vr' || activeMode === 'ar') && sessionState === 'none';

      if (isInPreviewMode) {
        console.log('[XRSessionStateTracker] In preview mode, keeping current mode:', activeMode);
        // Don't change anything - we're in preview mode
      } else if (sessionState === 'active') {
        // Only reset if we had an active session that ended
        console.log('[XRSessionStateTracker] XR session ended, resetting to desktop');
        setSessionState('none');
        setActiveMode('desktop');
      }
      // If sessionState is 'none' and activeMode is 'desktop', do nothing
    }
  }, [session, activeMode, sessionState, setActiveMode, setSessionState]);

  return null;
}

// ============================================================================
// Device Orientation Controls (for Mobile VR Preview)
// ============================================================================

/**
 * Device orientation controls for mobile VR/AR preview mode.
 * Uses the phone's gyroscope to allow users to look around by moving their device.
 * Only active when in VR/AR mode WITHOUT an actual XR session (preview mode).
 */
function DeviceOrientationControls({ enabled = true }: { enabled?: boolean }) {
  const { camera } = useThree();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Store the initial camera quaternion and device orientation
  const initialQuaternion = useRef(new THREE.Quaternion());
  const deviceQuaternion = useRef(new THREE.Quaternion());
  const screenOrientation = useRef(0);

  // Helper quaternions for orientation calculation
  const zee = useRef(new THREE.Vector3(0, 0, 1));
  const euler = useRef(new THREE.Euler());
  const q0 = useRef(new THREE.Quaternion());
  const q1 = useRef(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))); // - PI/2 around X axis

  // Track if we've initialized
  const initialized = useRef(false);

  // Request permission for device orientation (required on iOS 13+)
  const requestPermission = useCallback(async () => {
    // Check if DeviceOrientationEvent exists and has requestPermission
    const DOE = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DOE?.requestPermission === 'function') {
      try {
        const permission = await DOE.requestPermission();
        setHasPermission(permission === 'granted');
        console.log('[DeviceOrientationControls] Permission:', permission);
      } catch (err) {
        console.warn('[DeviceOrientationControls] Permission request failed:', err);
        setHasPermission(false);
      }
    } else {
      // No permission needed (Android, older iOS)
      setHasPermission(true);
    }
  }, []);

  // Check support and request permission on mount
  useEffect(() => {
    if (!enabled) return;

    // Check if device orientation is supported
    if (!('DeviceOrientationEvent' in window)) {
      console.log('[DeviceOrientationControls] DeviceOrientationEvent not supported');
      setIsSupported(false);
      return;
    }

    // Store initial camera orientation
    initialQuaternion.current.copy(camera.quaternion);

    // Request permission
    requestPermission();
  }, [enabled, camera, requestPermission]);

  // Handle device orientation changes
  useEffect(() => {
    if (!enabled || !hasPermission || !isSupported) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha ?? 0; // Z axis (compass direction)
      const beta = event.beta ?? 0;   // X axis (front-back tilt)
      const gamma = event.gamma ?? 0; // Y axis (left-right tilt)

      // Convert degrees to radians
      const alphaRad = THREE.MathUtils.degToRad(alpha);
      const betaRad = THREE.MathUtils.degToRad(beta);
      const gammaRad = THREE.MathUtils.degToRad(gamma);

      // Set euler angles in 'YXZ' order (standard for device orientation)
      euler.current.set(betaRad, alphaRad, -gammaRad, 'YXZ');

      // Convert to quaternion
      deviceQuaternion.current.setFromEuler(euler.current);

      // Adjust for screen orientation
      deviceQuaternion.current.multiply(q1.current);

      // Apply screen orientation rotation
      q0.current.setFromAxisAngle(zee.current, -screenOrientation.current);
      deviceQuaternion.current.multiply(q0.current);
    };

    const handleOrientationChange = () => {
      screenOrientation.current = THREE.MathUtils.degToRad(window.orientation as number || 0);
    };

    // Initialize screen orientation
    handleOrientationChange();

    // Add listeners
    window.addEventListener('deviceorientation', handleOrientation, true);
    window.addEventListener('orientationchange', handleOrientationChange, false);

    console.log('[DeviceOrientationControls] Listeners attached');

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('orientationchange', handleOrientationChange, false);
      console.log('[DeviceOrientationControls] Listeners removed');
    };
  }, [enabled, hasPermission, isSupported]);

  // Update camera each frame
  useFrame(() => {
    if (!enabled || !hasPermission || !isSupported) return;

    // Apply the device orientation to the camera
    camera.quaternion.copy(deviceQuaternion.current);
  });

  // Show permission button if needed (iOS)
  if (enabled && hasPermission === false) {
    return null; // Permission denied - could show UI feedback
  }

  return null;
}

// ============================================================================
// Loading Fallback
// ============================================================================

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#8b5cf6" wireframe />
    </mesh>
  );
}

// ============================================================================
// 360 Grid Environment (Customizable VR Room)
// ============================================================================

export interface GridEnvironment360Props {
  /** Radius of the environment sphere */
  radius?: number;
  /** Primary grid color */
  gridColor?: string;
  /** Secondary/accent grid color */
  gridColorAccent?: string;
  /** Background color */
  backgroundColor?: string;
  /** Major grid line spacing in meters */
  majorGridSpacing?: number;
  /** Minor grid line spacing in meters */
  minorGridSpacing?: number;
  /** Line width for grid */
  lineWidth?: number;
  /** Enable glow effect on grid lines */
  glow?: boolean;
  /** Opacity of grid lines (0-1) */
  gridOpacity?: number;
}

/**
 * Creates a shader material for the 360 grid environment.
 * Renders a spherical grid pattern with panoramic sky and stars.
 */
function useGridSphereMaterial(props: GridEnvironment360Props) {
  const {
    gridColor = '#4f46e5', // Indigo
    gridColorAccent = '#8b5cf6', // Violet
    backgroundColor = '#0a0a0f',
    majorGridSpacing = 2.0,
    minorGridSpacing = 0.5,
    gridOpacity = 0.8, // Increased for better visibility
    glow = true,
  } = props;

  return useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uGridColor: { value: new THREE.Color(gridColor) },
        uGridColorAccent: { value: new THREE.Color(gridColorAccent) },
        uBackgroundColor: { value: new THREE.Color(backgroundColor) },
        uMajorSpacing: { value: majorGridSpacing },
        uMinorSpacing: { value: minorGridSpacing },
        uGridOpacity: { value: gridOpacity },
        uGlow: { value: glow ? 1.0 : 0.0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          vPosition = position;
          vNormal = normal;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uGridColor;
        uniform vec3 uGridColorAccent;
        uniform vec3 uBackgroundColor;
        uniform float uMajorSpacing;
        uniform float uMinorSpacing;
        uniform float uGridOpacity;
        uniform float uGlow;
        uniform float uTime;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;

        // Simple hash function for stars
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // Star field function - enhanced for VR visibility
        float stars(vec2 uv, float density, float threshold) {
          vec2 cell = floor(uv * density);
          vec2 offset = fract(uv * density) - 0.5;
          float starVal = hash(cell);
          float brightness = step(threshold, starVal);
          float dist = length(offset);
          // Larger, brighter stars
          return brightness * smoothstep(0.25, 0.0, dist) * (0.6 + 0.4 * starVal);
        }

        float grid(vec2 coord, float spacing, float thickness) {
          vec2 grid = abs(fract(coord / spacing - 0.5) - 0.5) / fwidth(coord / spacing);
          float line = min(grid.x, grid.y);
          return 1.0 - min(line, 1.0);
        }

        void main() {
          // Convert sphere position to spherical coordinates for consistent grid
          vec3 pos = normalize(vPosition);
          float theta = atan(pos.z, pos.x); // Longitude
          float phi = acos(pos.y); // Latitude

          // Map to UV-like coordinates
          vec2 sphereUV = vec2(theta / 3.14159, phi / 3.14159) * 10.0;

          // Also use world position for horizontal/vertical lines
          vec2 worldCoord = vec2(
            length(vec2(vPosition.x, vPosition.z)), // Distance from Y axis
            vPosition.y
          );

          // Calculate grid lines
          float majorLine = grid(worldCoord, uMajorSpacing, 0.02);
          float minorLine = grid(worldCoord, uMinorSpacing, 0.01) * 0.5;

          // Spherical grid overlay - reduced for cleaner look
          float sphereGrid = grid(sphereUV, 1.0, 0.02) * 0.2;

          // Combine grids
          float totalGrid = max(majorLine, max(minorLine, sphereGrid));

          // === PANORAMIC SKY - Enhanced for VR immersion ===
          // Create a gradient from horizon to zenith
          float heightFactor = pos.y; // -1 (floor) to +1 (ceiling)

          // Sky colors: richer, more colorful space environment
          vec3 zenithColor = vec3(0.03, 0.02, 0.12); // Deep purple-blue space
          vec3 midSkyColor = vec3(0.06, 0.04, 0.18); // Rich purple mid-sky
          vec3 horizonColor = vec3(0.12, 0.06, 0.22); // Bright purple horizon
          vec3 nadirColor = vec3(0.02, 0.02, 0.06); // Dark at floor

          // Add subtle nebula-like color variations
          float nebulaPattern = hash(floor(vec2(theta * 2.0, phi * 2.0)));
          vec3 nebulaColor1 = vec3(0.15, 0.05, 0.25); // Deep purple
          vec3 nebulaColor2 = vec3(0.05, 0.08, 0.20); // Blue tint
          vec3 nebulaBlend = mix(nebulaColor1, nebulaColor2, nebulaPattern);

          // Smooth gradient based on height with nebula influence
          vec3 skyColor;
          if (heightFactor > 0.0) {
            // Upper hemisphere: horizon to zenith with mid-sky transition
            float t1 = smoothstep(0.0, 0.4, heightFactor);
            float t2 = smoothstep(0.4, 0.9, heightFactor);
            skyColor = mix(horizonColor, midSkyColor, t1);
            skyColor = mix(skyColor, zenithColor, t2);
            // Add subtle nebula coloring in upper sky
            float nebulaStrength = smoothstep(0.2, 0.7, heightFactor) * 0.3 * nebulaPattern;
            skyColor = mix(skyColor, nebulaBlend, nebulaStrength);
          } else {
            // Lower hemisphere: horizon to nadir (floor area)
            float t = smoothstep(0.0, -0.3, heightFactor);
            skyColor = mix(horizonColor, nadirColor, t);
          }

          // Add stars throughout the sky - much more visible
          float starIntensity = 0.0;
          if (heightFactor > -0.2) {
            vec2 starUV = vec2(theta, phi);
            // Multiple star layers with different densities and sizes
            // Bright prominent stars (fewer but more visible)
            starIntensity = stars(starUV * 3.0, 30.0, 0.92) * 1.2;
            // Medium stars
            starIntensity += stars(starUV * 6.0, 60.0, 0.94) * 0.8;
            // Dim background stars
            starIntensity += stars(starUV * 12.0, 120.0, 0.96) * 0.5;
            // Extra dense star cluster regions
            float clusterNoise = hash(floor(starUV * 2.0));
            if (clusterNoise > 0.7) {
              starIntensity += stars(starUV * 20.0, 200.0, 0.93) * 0.6;
            }
            starIntensity *= smoothstep(-0.2, 0.2, heightFactor); // Fade near horizon
          }
          // Colored stars - slight tint variations
          float starHue = hash(floor(vec2(theta, phi) * 10.0));
          vec3 starTint = mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.9, 0.8), starHue * 0.3);
          vec3 starColor = starTint * starIntensity;

          // Horizon glow - more prominent atmospheric effect
          float horizonGlow = exp(-abs(heightFactor) * 6.0) * 0.25;
          float horizonGlow2 = exp(-abs(heightFactor) * 12.0) * 0.15; // Tighter inner glow
          vec3 horizonGlowColor = vec3(0.4, 0.2, 0.6) * horizonGlow;
          vec3 horizonGlowColor2 = vec3(0.3, 0.15, 0.5) * horizonGlow2;

          // Add distant nebula clouds in the sky (larger scale pattern)
          float cloudPattern = 0.0;
          if (heightFactor > 0.1) {
            vec2 cloudUV = vec2(theta * 0.5, phi * 0.5);
            float c1 = hash(floor(cloudUV * 3.0));
            float c2 = hash(floor(cloudUV * 5.0 + 0.5));
            cloudPattern = smoothstep(0.6, 0.8, c1) * smoothstep(0.5, 0.7, c2);
            cloudPattern *= smoothstep(0.1, 0.5, heightFactor);
          }
          vec3 nebulaCloudColor = mix(vec3(0.2, 0.1, 0.35), vec3(0.1, 0.15, 0.3), hash(vec2(theta, phi)));
          vec3 cloudContribution = nebulaCloudColor * cloudPattern * 0.4;

          // Combine sky
          vec3 finalSky = skyColor + starColor + horizonGlowColor + horizonGlowColor2 + cloudContribution;

          // === GRID OVERLAY ===
          // Add glow effect
          float glowAmount = uGlow * totalGrid * 0.5;

          // Mix colors for grid
          vec3 gridMix = mix(uGridColor, uGridColorAccent, majorLine);

          // Apply grid on top of sky
          vec3 finalColor = mix(finalSky, gridMix, totalGrid * uGridOpacity);

          // Add subtle glow
          finalColor += gridMix * glowAmount * 0.4;

          // Fade grid at poles to avoid singularity
          float poleFade = smoothstep(0.0, 0.3, abs(pos.y - 1.0)) *
                          smoothstep(0.0, 0.3, abs(pos.y + 1.0));
          finalColor = mix(finalSky, finalColor, poleFade);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide, // Render inside of sphere
    });

    return material;
  }, [gridColor, gridColorAccent, backgroundColor, majorGridSpacing, minorGridSpacing, gridOpacity, glow]);
}

/**
 * 360 Grid Environment for VR mode and 3D preview.
 * Creates an immersive grid-sphere environment like a holodeck.
 */
function GridEnvironment360(props: GridEnvironment360Props & { forceShow?: boolean; isXRSession?: boolean }) {
  const { radius = 50, forceShow = false, isXRSession = false } = props;
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);

  const material = useGridSphereMaterial(props);

  // SIMPLIFIED LOGIC: Show environment when:
  // 1. forceShow is true (3D preview mode on desktop)
  // 2. isXRSession is true AND we're not in AR mode
  // 3. spatialMode is 'vr' (active VR session confirmed)
  // 4. sessionState is 'active' and targetMode is not 'ar'
  // AR mode check includes both active AR sessions AND transitions to AR
  const isARSession = spatialMode === 'ar' ||
    (sessionState === 'active' && targetMode === 'ar') ||
    (sessionState === 'requesting' && targetMode === 'ar');
  const shouldShow = forceShow || isXRSession || spatialMode === 'vr' ||
    (sessionState === 'active' && !isARSession) ||
    (sessionState === 'requesting' && targetMode === 'vr');

  // Never show in AR mode (real world passthrough) - includes during transition
  if (isARSession) {
    console.log('[GridEnvironment360] Hiding for AR mode (including transition)');
    return null;
  }

  if (!shouldShow) {
    console.log('[GridEnvironment360] Not showing:', { spatialMode, sessionState, targetMode, forceShow, isXRSession });
    return null;
  }

  console.log('[GridEnvironment360] RENDERING environment:', { spatialMode, sessionState, targetMode, forceShow, isXRSession, shouldShow });

  return (
    <group name="grid-environment-360">
      {/* Main environment sphere */}
      <mesh material={material}>
        <sphereGeometry args={[radius, 64, 64]} />
      </mesh>

      {/* Horizon glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[radius * 0.8, radius, 64]} />
        <meshBasicMaterial
          color="#4f46e5"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center reference marker */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.5} />
      </mesh>

      {/* Axis reference lines at origin for spatial orientation */}
      <group name="origin-axes">
        {/* X axis - red */}
        <mesh position={[1, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.01, 0.01, 2, 8]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
        {/* Z axis - blue */}
        <mesh position={[0, 0.02, 1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 2, 8]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// Ground Plane
// ============================================================================

function GroundPlane() {
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);

  // In AR mode (or transitioning to AR), the real floor is the ground
  const isARMode = spatialMode === 'ar' ||
    (sessionState === 'requesting' && targetMode === 'ar');

  if (isARMode) return null;

  return (
    <>
      {/* Visual grid for orientation */}
      <Grid
        position={[0, 0, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#4a4a4a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#6366f1"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={true}
        infiniteGrid
      />
    </>
  );
}

// ============================================================================
// Main SpatialCanvas Component
// ============================================================================

interface SpatialCanvasProps {
  /** Whether the canvas should be visible/active */
  active: boolean;
  /** Optional className for styling the container */
  className?: string;
  /** Optional style overrides */
  style?: React.CSSProperties;
}

export function SpatialCanvas({ active, className, style }: SpatialCanvasProps) {
  const setActiveMode = useSpatialModeStore((s) => s.setActiveMode);
  const setSessionState = useSpatialModeStore((s) => s.setSessionState);
  const setCapabilities = useSpatialModeStore((s) => s.setCapabilities);
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);
  const spatialMode = useActiveSpatialMode();

  // Track if we've mounted the Canvas (for XR readiness)
  const [canvasReady, setCanvasReady] = useState(false);

  // XROrigin ref and position for locomotion
  const originRef = useRef<Group>(null);
  const [originPosition, setOriginPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Handle teleportation
  const handleTeleport = useCallback((point: THREE.Vector3) => {
    console.log('[SpatialCanvas] Teleporting to:', point);
    setOriginPosition([point.x, 0, point.z]);
  }, []);

  // Reset any stuck session state on mount (e.g., from browser close during XR request)
  // This prevents the SpatialCanvas from blocking interaction on app restart
  useEffect(() => {
    if (sessionState === 'requesting' || sessionState === 'ending') {
      console.log('[SpatialCanvas] Resetting stuck session state:', sessionState);
      setSessionState('none');
      setActiveMode('desktop');
    }
  }, []); // Only run once on mount

  // Check XR capabilities on mount
  useEffect(() => {
    async function checkCapabilities() {
      if (typeof navigator === 'undefined' || !navigator.xr) {
        setCapabilities({ webXRAvailable: false, vrSupported: false, arSupported: false });
        return;
      }

      try {
        const [vrSupported, arSupported] = await Promise.all([
          navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
          navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
        ]);

        setCapabilities({ webXRAvailable: true, vrSupported, arSupported });
      } catch {
        setCapabilities({ webXRAvailable: false, vrSupported: false, arSupported: false });
      }
    }

    checkCapabilities();
  }, [setCapabilities]);

  // Initialize BVH (Bounding Volume Hierarchy) for accelerated raycasting
  // This extends THREE.js with faster collision detection
  useEffect(() => {
    if (!isBVHInitialized()) {
      initializeBVH();
    }
  }, []);

  // Determine if the 3D canvas should be visible
  // The Canvas/XR MUST always be mounted, but visibility can be controlled
  // Canvas is visible when:
  // 1. `active` prop is true (parent wants it visible), OR
  // 2. An XR session is ACTUALLY active, OR
  // 3. We're transitioning into VR/AR mode (requesting state with targetMode set)
  //    This ensures the canvas is visible during XR session initialization
  const isXRActive = sessionState === 'active';
  const isTransitioningToXR = sessionState === 'requesting' && (targetMode === 'vr' || targetMode === 'ar');
  const shouldShowCanvas = active || isXRActive || isTransitioningToXR;

  // Debug logging for state transitions
  useEffect(() => {
    console.log('[SpatialCanvas] State:', {
      active,
      spatialMode,
      sessionState,
      targetMode,
      isXRActive,
      isTransitioningToXR,
      shouldShowCanvas,
      canvasReady,
    });
  }, [active, spatialMode, sessionState, targetMode, isXRActive, isTransitioningToXR, shouldShowCanvas, canvasReady]);

  // Subscribe to XR store session changes
  useEffect(() => {
    const unsubscribe = xrStore.subscribe((state, prevState) => {
      // Session started
      if (state.session && !prevState.session) {
        console.log('[SpatialCanvas] XR session started via subscription');
        setSessionState('active');
        const mode = (state.session as unknown as { mode?: string })?.mode;
        console.log('[SpatialCanvas] XR session mode:', mode);
        if (mode === 'immersive-ar') {
          setActiveMode('ar');
        } else {
          setActiveMode('vr');
        }
      }
      // Session ended
      if (!state.session && prevState.session) {
        console.log('[SpatialCanvas] XR session ended via subscription');
        setSessionState('none');
        setActiveMode('desktop');
      }
    });

    return () => unsubscribe();
  }, [setActiveMode, setSessionState]);

  // IMPORTANT: We ALWAYS render the Canvas and XR components at FULL SIZE.
  // This is required because:
  // 1. @react-three/xr needs the <XR> component to be mounted in the React tree
  //    before xrStore.enterVR()/enterAR() can successfully request a WebXR session.
  // 2. Three.js/WebGL needs a reasonably sized canvas to initialize properly.
  //    A 1x1px canvas won't work!
  //
  // The `shouldShowCanvas` flag controls VISIBILITY (via z-index/opacity), not SIZE.

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        // CRITICAL: Canvas must always be full size for WebGL to work properly!
        // We control visibility via z-index and opacity, NOT by shrinking.
        // When hidden: behind other content (z-index: -1), invisible (opacity: 0)
        // When visible: on top (z-index: 10), fully visible (opacity: 1)
        zIndex: shouldShowCanvas ? 10 : -1,
        opacity: shouldShowCanvas ? 1 : 0,
        pointerEvents: shouldShowCanvas ? 'auto' : 'none',
        transition: 'opacity 0.3s ease-in-out',
        ...style,
      }}
      data-spatial-canvas="true"
      data-canvas-visible={shouldShowCanvas}
      data-xr-ready={canvasReady}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          // Enable high-resolution rendering for VR/AR
          // This ensures textures and rendered content stay crisp at close viewing distances
          preserveDrawingBuffer: true,
          precision: 'highp',
        }}
        // Use device pixel ratio for crisp rendering on high-DPI displays
        // Clamp to max 2 to prevent performance issues on very high DPI devices
        dpr={Math.min(window.devicePixelRatio || 1, 2)}
        camera={{
          position: [0, 1.6, 3], // Eye height, slightly back
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        // CRITICAL: Frame loop must ALWAYS run for XR to work!
        // XR sessions require an active render loop to initialize and present frames.
        // We control visibility via CSS (z-index/opacity), not by pausing rendering.
        frameloop="always"
        onCreated={({ gl }) => {
          // Mark canvas as ready for XR sessions
          setCanvasReady(true);
          console.log('[SpatialCanvas] Canvas created and ready for XR');
          console.log('[SpatialCanvas] WebGL XR compatible:', gl.xr?.enabled);
          console.log('[SpatialCanvas] Device pixel ratio:', window.devicePixelRatio);

          // Enable anisotropic filtering for textures (improves quality at angles)
          const ext = gl.getContext().getExtension('EXT_texture_filter_anisotropic') ||
                      gl.getContext().getExtension('MOZ_EXT_texture_filter_anisotropic') ||
                      gl.getContext().getExtension('WEBKIT_EXT_texture_filter_anisotropic');
          if (ext) {
            const maxAnisotropy = gl.getContext().getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            console.log('[SpatialCanvas] Anisotropic filtering available, max:', maxAnisotropy);
            // Store for use by texture loaders
            (gl as any).anisotropyExt = ext;
            (gl as any).maxAnisotropy = maxAnisotropy;
          }
        }}
      >
        {/* DEBUG: Ambient light OUTSIDE XR to verify Canvas is rendering */}
        <ambientLight intensity={0.5} />

        {/* DEBUG: Cube OUTSIDE XR tree - should always be visible */}
        {/* If you see this yellow cube, Canvas works but XR is failing */}
        <mesh position={[2, 1.5, -3]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>

        {/* We use our own SpatialModeToggle in the toolbar for XR entry */}
        {/* STRIPPED DOWN XR - Only bare minimum to diagnose black screen issue */}
        {/* The XRErrorBoundary now always shows actual error messages */}
        <XRErrorBoundary>
          <XR store={xrStore}>
            {/* ABSOLUTE MINIMUM TEST - Just a light and visible cube */}
            {/* If this doesn't render, the issue is with XR itself */}
            <ambientLight intensity={1.5} />

            {/* Bright green cube at eye level - should be unmissable */}
            <mesh position={[0, 1.5, -2]}>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>

            {/* Gray floor plane */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[10, 10]} />
              <meshBasicMaterial color="#555555" />
            </mesh>

            {/* Red reference cube to the left */}
            <mesh position={[-1, 1.5, -2]}>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>

            {/* Blue reference cube to the right */}
            <mesh position={[1, 1.5, -2]}>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>

            {/* XROrigin with ref for locomotion - position updates on teleport */}
            <XROrigin ref={originRef} position={originPosition}>
              {/* Locomotion controller - thumbstick movement */}
              <LocomotionController originRef={originRef} />
            </XROrigin>

            {/* Background controller - sets clear color */}
            <XRBackgroundController />

            {/* Only show the rest of the scene if the basic test works */}
            {/* Uncomment these one by one to find which component causes the error */}

            {/* <XRDebugLogger /> */}
            {/* <XRSessionStateTracker /> */}
            {/* <VRBackground forceShow={active} /> */}

            {/* Additional lighting */}
            <directionalLight position={[5, 10, 5]} intensity={1.0} />
            <hemisphereLight args={['#87CEEB', '#362D59', 0.3]} />

            {/* Controller debug with rays */}
            <XRControllerDebug
              showDebugText={false}
              showFallbackRays={true}
              rayColor="#8b5cf6"
              rayLength={10}
            />

            {/* Interactive test area with multiple clickable objects */}
            <InteractiveTestArea />

            {/* Grabbable objects - pick up, hold, and throw */}
            <GrabbableTestArea />

            {/* Keep the original test cube for reference */}
            <XRTestCube />

            {/* Teleportable floor - click to teleport */}
            <TeleportFloor onTeleport={handleTeleport} />

            {/* Ground reference grid (on top of teleport floor) */}
            <GroundPlane />

            {/* 360 Grid Environment - immersive space with stars */}
            <GridEnvironment360
              gridColor="#4f46e5"
              gridColorAccent="#8b5cf6"
              backgroundColor="#0a0a0f"
              majorGridSpacing={2.0}
              minorGridSpacing={0.5}
              gridOpacity={0.6}
              glow={true}
              radius={50}
              forceShow={true}
            />

            {/* Ambient environment - particles, nebulae, structures */}
            <AmbientEnvironment
              particles={true}
              particleCount={150}
              nebulae={true}
              structures={true}
              aurora={true}
              rings={true}
              intensity={0.8}
            />

            {/* Desktop controls */}
            {spatialMode === 'desktop' && shouldShowCanvas && (
              <OrbitControls
                enablePan
                enableZoom
                enableRotate
                target={[0, 1.5, 0]}
                maxPolarAngle={Math.PI * 0.85}
              />
            )}

            {/* Mobile preview controls */}
            {(spatialMode === 'vr' || spatialMode === 'ar') && sessionState !== 'active' && shouldShowCanvas && (
              <DeviceOrientationControls enabled={true} />
            )}
          </XR>
        </XRErrorBoundary>
      </Canvas>
    </div>
  );
}

// ============================================================================
// Re-exports from xrStore for backwards compatibility
// ============================================================================

export { xrStore, enterVR, enterAR, exitXR } from './xrStore';

export default SpatialCanvas;
