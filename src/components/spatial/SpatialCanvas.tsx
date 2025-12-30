/**
 * StickerNest - SpatialCanvas
 *
 * The WebGL/Three.js renderer for VR and AR modes.
 * Runs in parallel with the DOM renderer (CanvasRenderer).
 * When spatial mode is 'vr' or 'ar', this component handles all rendering.
 */

import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore, XROrigin } from '@react-three/xr';
import { Environment, OrbitControls, Grid } from '@react-three/drei';
import { useSpatialModeStore, useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { SpatialScene } from './SpatialScene';
import { XREntryButtons } from './XREntryButtons';

// ============================================================================
// XR Store Configuration
// ============================================================================

/**
 * XR store is created outside the component to persist across renders.
 * This manages WebXR session state, controllers, and hands.
 */
export const xrStore = createXRStore({
  // Controller configuration
  controller: {
    left: true,
    right: true,
    teleportPointer: true,
  },
  // Hand tracking
  hand: {
    left: true,
    right: true,
    teleportPointer: true,
  },
  // Performance settings
  frameRate: 'high',
  foveation: 1,
  // Features
  handTracking: true,
  // AR features (for future AR mode)
  hitTest: true,
  anchors: true,
});

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
// VR Environment
// ============================================================================

interface VREnvironmentProps {
  preset?: 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby';
}

function VREnvironment({ preset = 'sunset' }: VREnvironmentProps) {
  const spatialMode = useActiveSpatialMode();

  // Only show environment in VR mode, not AR (AR uses real world)
  if (spatialMode !== 'vr') return null;

  return <Environment preset={preset} background />;
}

// ============================================================================
// Ground Plane
// ============================================================================

function GroundPlane() {
  const spatialMode = useActiveSpatialMode();

  // In AR mode, the real floor is the ground
  if (spatialMode === 'ar') return null;

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
        followCamera={false}
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
  const spatialMode = useActiveSpatialMode();

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

  // Don't render if not active
  if (!active) return null;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        ...style,
      }}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        camera={{
          position: [0, 1.6, 3], // Eye height, slightly back
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
      >
        <XR
          store={xrStore}
          onSessionStart={() => {
            setSessionState('active');
            // Detect mode from session type
            const session = xrStore.getState().session;
            if (session?.mode === 'immersive-ar') {
              setActiveMode('ar');
            } else {
              setActiveMode('vr');
            }
          }}
          onSessionEnd={() => {
            setSessionState('none');
            setActiveMode('desktop');
          }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

          {/* User origin (feet position) */}
          <XROrigin />

          {/* Environment (VR only) */}
          <VREnvironment />

          {/* Ground reference */}
          <GroundPlane />

          {/* Main scene content */}
          <Suspense fallback={<LoadingFallback />}>
            <SpatialScene />
          </Suspense>

          {/* Desktop controls (when not in XR) */}
          {spatialMode === 'desktop' && (
            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              target={[0, 1.5, 0]}
              maxPolarAngle={Math.PI * 0.85}
            />
          )}
        </XR>
      </Canvas>

      {/* XR Entry Buttons (DOM overlay) */}
      <XREntryButtons showVR showAR />
    </div>
  );
}

// ============================================================================
// XR Entry Functions (exported for use in UI)
// ============================================================================

/**
 * Enter VR mode - call this from a button click handler
 */
export function enterVR() {
  xrStore.enterVR();
}

/**
 * Enter AR mode - call this from a button click handler
 */
export function enterAR() {
  xrStore.enterAR();
}

/**
 * Exit XR session
 */
export function exitXR() {
  const session = xrStore.getState().session;
  if (session) {
    session.end();
  }
}

export default SpatialCanvas;
