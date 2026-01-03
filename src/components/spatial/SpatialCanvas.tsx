/**
 * StickerNest - SpatialCanvas
 *
 * The WebGL/Three.js renderer for VR and AR modes.
 * Runs in parallel with the DOM renderer (CanvasRenderer).
 *
 * IMPORTANT: The Canvas and XR components must ALWAYS be mounted for XR sessions
 * to work. The `active` prop controls visibility, NOT mounting.
 */

import React, { useEffect, useState, useRef, useCallback, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, XROrigin } from '@react-three/xr';
import { OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import * as THREE from 'three';

import { useSpatialModeStore, useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { xrStore } from './xrStore';
import { initializeBVH, isBVHInitialized } from '../../utils/bvhSetup';
import { AmbientEnvironment } from './AmbientEnvironment';
import { XRControllerDebug } from './xr/XRControllerDebug';

// Extracted components
import { GrabbableTestArea } from './xr/GrabbableObjects';
import { LocomotionController, TeleportFloor } from './xr/XRLocomotion';
import { SpaceEnvironment, VRFloor } from './xr/XREnvironment';
import {
  XRBackgroundController,
  DeviceOrientationControls,
} from './xr/XRSessionManager';

// ============================================================================
// XR Error Boundary
// ============================================================================

interface XRErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class XRErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  XRErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): XRErrorBoundaryState {
    console.error('[XRErrorBoundary] Caught XR error:', error.message);
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

// ============================================================================
// Main SpatialCanvas Component
// ============================================================================

interface SpatialCanvasProps {
  active: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function SpatialCanvas({ active, className, style }: SpatialCanvasProps) {
  const setActiveMode = useSpatialModeStore((s) => s.setActiveMode);
  const setSessionState = useSpatialModeStore((s) => s.setSessionState);
  const setCapabilities = useSpatialModeStore((s) => s.setCapabilities);
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);
  const spatialMode = useActiveSpatialMode();

  const [canvasReady, setCanvasReady] = useState(false);

  // XROrigin ref and position for locomotion
  const originRef = useRef<Group>(null);
  const [originPosition, setOriginPosition] = useState<[number, number, number]>([0, 0, 0]);

  const handleTeleport = useCallback((point: THREE.Vector3) => {
    setOriginPosition([point.x, 0, point.z]);
  }, []);

  // Reset stuck session state on mount
  useEffect(() => {
    if (sessionState === 'requesting' || sessionState === 'ending') {
      setSessionState('none');
      setActiveMode('desktop');
    }
  }, []);

  // Check XR capabilities
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

  // Initialize BVH for raycasting
  useEffect(() => {
    if (!isBVHInitialized()) {
      initializeBVH();
    }
  }, []);

  // Visibility logic
  const isXRActive = sessionState === 'active';
  const isTransitioningToXR =
    sessionState === 'requesting' && (targetMode === 'vr' || targetMode === 'ar');
  const shouldShowCanvas = active || isXRActive || isTransitioningToXR;

  // Subscribe to XR store session changes
  useEffect(() => {
    const unsubscribe = xrStore.subscribe((state, prevState) => {
      if (state.session && !prevState.session) {
        setSessionState('active');
        const mode = (state.session as unknown as { mode?: string })?.mode;
        setActiveMode(mode === 'immersive-ar' ? 'ar' : 'vr');
      }
      if (!state.session && prevState.session) {
        setSessionState('none');
        setActiveMode('desktop');
      }
    });
    return () => unsubscribe();
  }, [setActiveMode, setSessionState]);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
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
          preserveDrawingBuffer: true,
          precision: 'highp',
        }}
        dpr={Math.min(window.devicePixelRatio || 1, 2)}
        camera={{
          position: [0, 1.6, 3],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        frameloop="always"
        onCreated={() => setCanvasReady(true)}
      >
        <XRErrorBoundary>
          <XR store={xrStore}>
            {/* Lighting */}
            <ambientLight intensity={1.2} />
            <directionalLight position={[5, 10, 5]} intensity={0.8} />
            <hemisphereLight args={['#87CEEB', '#362D59', 0.3]} />

            {/* XROrigin for locomotion */}
            <XROrigin ref={originRef} position={originPosition}>
              <LocomotionController originRef={originRef} />
            </XROrigin>

            {/* Background controller */}
            <XRBackgroundController />

            {/* Controller rays */}
            <XRControllerDebug
              showDebugText={false}
              showFallbackRays={true}
              rayColor="#8b5cf6"
              rayLength={10}
            />

            {/* Grabbable objects */}
            <GrabbableTestArea />

            {/* Teleportable floor */}
            <TeleportFloor onTeleport={handleTeleport} showGrid={false} />

            {/* Dark floor */}
            <VRFloor />

            {/* Space environment - stars and nebulae */}
            <SpaceEnvironment radius={50} />

            {/* Ambient environment - particles and structures */}
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
            {(spatialMode === 'vr' || spatialMode === 'ar') &&
              sessionState !== 'active' &&
              shouldShowCanvas && <DeviceOrientationControls enabled={true} />}
          </XR>
        </XRErrorBoundary>
      </Canvas>
    </div>
  );
}

// Re-exports
export { xrStore, enterVR, enterAR, exitXR } from './xrStore';
export default SpatialCanvas;
