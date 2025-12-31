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

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { XR, XROrigin, useXR } from '@react-three/xr';
import { OrbitControls, Grid } from '@react-three/drei';
import { useSpatialModeStore, useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { SpatialScene } from './SpatialScene';
import { xrStore } from './xrStore';
import * as THREE from 'three';

// ============================================================================
// Frame Loop Controller (inside XR context)
// ============================================================================

/**
 * Controls the render loop based on visibility and XR state.
 * Frame loop must ALWAYS run during XR sessions.
 *
 * IMPORTANT: This component must be placed INSIDE the <XR> provider
 * so it can use useXR to detect active sessions.
 */
function FrameLoopController({ shouldRender }: { shouldRender: boolean }) {
  const { set } = useThree();
  const session = useXR((state) => state.session);
  const isXRActive = !!session;

  useEffect(() => {
    // Frame loop must run when:
    // 1. Canvas should be visible on screen (shouldRender), OR
    // 2. An XR session is active
    const frameloop = (shouldRender || isXRActive) ? 'always' : 'never';
    console.log('[FrameLoopController] Setting frameloop to:', frameloop, { shouldRender, isXRActive });
    set({ frameloop });
  }, [shouldRender, isXRActive, set]);

  return null;
}

// ============================================================================
// XR Session State Tracker
// ============================================================================

/**
 * Tracks XR session state from within the XR context and syncs to our store.
 * This component must be inside the <XR> provider to access useXR hooks.
 */
function XRSessionStateTracker() {
  const session = useXR((state) => state.session);
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
      console.log('[XRSessionStateTracker] No active XR session');
    }
  }, [session, setActiveMode, setSessionState]);

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
 * Renders a spherical grid pattern that can be customized.
 */
function useGridSphereMaterial(props: GridEnvironment360Props) {
  const {
    gridColor = '#4f46e5', // Indigo
    gridColorAccent = '#8b5cf6', // Violet
    backgroundColor = '#0a0a0f',
    majorGridSpacing = 2.0,
    minorGridSpacing = 0.5,
    gridOpacity = 0.6,
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
          float minorLine = grid(worldCoord, uMinorSpacing, 0.01) * 0.4;

          // Spherical grid overlay
          float sphereGrid = grid(sphereUV, 1.0, 0.02) * 0.3;

          // Combine grids
          float totalGrid = max(majorLine, max(minorLine, sphereGrid));

          // Add glow effect
          float glowAmount = uGlow * totalGrid * 0.5;

          // Mix colors
          vec3 gridMix = mix(uGridColor, uGridColorAccent, majorLine);
          vec3 finalColor = mix(uBackgroundColor, gridMix, totalGrid * uGridOpacity);

          // Add subtle glow
          finalColor += gridMix * glowAmount * 0.3;

          // Fade at poles to avoid singularity
          float poleFade = smoothstep(0.0, 0.3, abs(pos.y - 1.0)) *
                          smoothstep(0.0, 0.3, abs(pos.y + 1.0));
          finalColor = mix(uBackgroundColor, finalColor, poleFade);

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
  const isARSession = spatialMode === 'ar' || (sessionState === 'active' && targetMode === 'ar');
  const shouldShow = forceShow || isXRSession || spatialMode === 'vr' ||
    (sessionState === 'active' && !isARSession) ||
    (sessionState === 'requesting' && targetMode === 'vr');

  // Never show in AR mode (real world passthrough)
  if (isARSession) {
    console.log('[GridEnvironment360] Hiding for AR mode');
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

  // Determine if the 3D canvas should be visible
  // The Canvas/XR MUST always be mounted, but visibility can be controlled
  // Canvas is visible when:
  // 1. `active` prop is true (parent wants it visible), OR
  // 2. An XR session is ACTUALLY active (NOT 'requesting' - that would block 2D interaction)
  // IMPORTANT: Don't show canvas during 'requesting' state - it blocks pointer events on 2D canvas!
  const isXRActive = sessionState === 'active';
  const shouldShowCanvas = active || isXRActive;

  // Debug logging for state transitions
  useEffect(() => {
    console.log('[SpatialCanvas] State:', {
      active,
      spatialMode,
      sessionState,
      isXRActive,
      shouldShowCanvas,
      canvasReady,
    });
  }, [active, spatialMode, sessionState, isXRActive, shouldShowCanvas, canvasReady]);

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
        {/* We use our own SpatialModeToggle in the toolbar for XR entry */}
        <XR store={xrStore}>
          {/* Frame loop controller - must be inside XR to detect session state */}
          <FrameLoopController shouldRender={shouldShowCanvas} />

          {/* XR Session State Tracker - always render to sync state */}
          <XRSessionStateTracker />

          {/*
            CRITICAL: Scene content must ALWAYS be rendered, not conditional!
            XR sessions require the 3D scene graph to exist BEFORE the session starts.
            If we conditionally render based on shouldShowCanvas, the XR session
            starts but finds an empty scene, resulting in a blank view.

            The visibility of the canvas container (z-index, opacity) controls
            what the user sees on the 2D screen. The 3D content inside XR
            must always exist so XR can render it.
          */}

          {/* Lighting - essential for seeing anything! */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1.0}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <hemisphereLight args={['#87CEEB', '#362D59', 0.3]} />

          {/* User origin (feet position) */}
          <XROrigin />

          {/* 360 Grid Environment (VR and 3D preview - customizable) */}
          {/* Pass isXRSession=true when we're in an active XR session */}
          <GridEnvironment360
            forceShow={active}
            isXRSession={isXRActive}
          />

          {/* Ground reference */}
          <GroundPlane />

          {/* Main scene content */}
          <Suspense fallback={<LoadingFallback />}>
            <SpatialScene />
          </Suspense>

          {/* Desktop controls - ONLY when canvas is visible AND in desktop spatial mode */}
          {/* This prevents OrbitControls from capturing mouse events when hidden */}
          {spatialMode === 'desktop' && shouldShowCanvas && (
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
    </div>
  );
}

// ============================================================================
// Re-exports from xrStore for backwards compatibility
// ============================================================================

export { xrStore, enterVR, enterAR, exitXR } from './xrStore';

export default SpatialCanvas;
