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

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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
 *
 * IMPORTANT: Reference space configuration determines how the scene is positioned:
 * - 'local-floor': Standing experiences, floor at y=0, limited tracking (default)
 * - 'bounded-floor': Room-scale with guardian boundaries (Meta Quest)
 * - 'unbounded': Large area tracking without boundaries
 *
 * Without proper reference space, the scene will be HEAD-LOCKED (moves with headset).
 */
export const xrStore = createXRStore({
  // CRITICAL: Reference space determines world-space vs head-locked rendering
  // 'local-floor' places the origin at floor level and tracks position in world space
  // This is what allows you to look around and have the scene stay stationary
  referenceSpace: 'local-floor',

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
  // AR/VR features for room-scale and spatial anchoring
  hitTest: true,
  anchors: true,
  // Plane detection for AR surface awareness
  planeDetection: true,
  // Mesh detection for room mapping (Meta Quest)
  meshDetection: true,
  // Depth sensing for occlusion
  depthSensing: true,
});

// ============================================================================
// Frame Loop Controller
// ============================================================================

/**
 * Controls the render loop based on visibility.
 * When hidden, we use "demand" mode to stop continuous rendering.
 * When visible or in XR, we use "always" for smooth animation.
 */
function FrameLoopController({ shouldRender }: { shouldRender: boolean }) {
  const { set } = useThree();

  useEffect(() => {
    // When hidden, pause the frame loop to save resources
    // When visible, ensure continuous rendering
    set({ frameloop: shouldRender ? 'always' : 'never' });
  }, [shouldRender, set]);

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
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const spatialMode = useActiveSpatialMode();

  // Track if we've mounted the Canvas (for XR readiness)
  const [canvasReady, setCanvasReady] = useState(false);

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

  // Determine if the 3D canvas should be visible
  // The Canvas/XR MUST always be mounted, but visibility can be controlled
  // Canvas is visible when:
  // 1. `active` prop is true (parent wants it visible), OR
  // 2. An XR session is active or being requested (need to show VR/AR content)
  const isXRActive = sessionState === 'active' || sessionState === 'requesting';
  const shouldShowCanvas = active || isXRActive;

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
        }}
        camera={{
          position: [0, 1.6, 3], // Eye height, slightly back
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        // Start with frame loop paused - FrameLoopController will enable when needed
        frameloop="never"
        onCreated={() => {
          // Mark canvas as ready for XR sessions
          setCanvasReady(true);
          console.log('[SpatialCanvas] Canvas created and ready for XR');
        }}
      >
        {/* Frame loop controller - pauses rendering when hidden */}
        <FrameLoopController shouldRender={shouldShowCanvas} />

        <XR
          store={xrStore}
          onSessionStart={() => {
            console.log('[SpatialCanvas] XR session started');
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
            console.log('[SpatialCanvas] XR session ended');
            setSessionState('none');
            setActiveMode('desktop');
          }}
        >
          {/* Only render scene content when the canvas should be visible */}
          {/* This prevents interference with 2D modes and saves resources */}
          {shouldShowCanvas && (
            <>
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

              {/* Desktop controls - ONLY when canvas is visible AND in desktop spatial mode */}
              {/* This prevents OrbitControls from capturing mouse events when hidden */}
              {spatialMode === 'desktop' && (
                <OrbitControls
                  enablePan
                  enableZoom
                  enableRotate
                  target={[0, 1.5, 0]}
                  maxPolarAngle={Math.PI * 0.85}
                />
              )}
            </>
          )}
        </XR>
      </Canvas>

      {/* XR Entry Buttons (DOM overlay) - only show when canvas is visible */}
      {shouldShowCanvas && <XREntryButtons showVR showAR />}
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
