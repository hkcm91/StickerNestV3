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

import React, { Suspense, useEffect, useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { XR, XROrigin, useXR } from '@react-three/xr';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import { useSpatialModeStore, useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { SpatialScene } from './SpatialScene';
import { xrStore } from './xrStore';
import * as THREE from 'three';

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
    console.warn('[XRErrorBoundary] Caught XR error:', error.message);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[XRErrorBoundary] XR component error (non-fatal):', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
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

        // Star field function
        float stars(vec2 uv, float density) {
          vec2 cell = floor(uv * density);
          vec2 offset = fract(uv * density) - 0.5;
          float starVal = hash(cell);
          float brightness = step(0.97, starVal);
          float dist = length(offset);
          return brightness * smoothstep(0.2, 0.0, dist) * (0.5 + 0.5 * starVal);
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

          // === PANORAMIC SKY ===
          // Create a gradient from horizon to zenith
          float heightFactor = pos.y; // -1 (floor) to +1 (ceiling)

          // Sky colors: darker at zenith, lighter at horizon
          vec3 zenithColor = vec3(0.02, 0.02, 0.08); // Deep space blue
          vec3 horizonColor = vec3(0.08, 0.06, 0.15); // Purple-tinted horizon
          vec3 nadirColor = vec3(0.01, 0.01, 0.02); // Very dark at floor

          // Smooth gradient based on height
          vec3 skyColor;
          if (heightFactor > 0.0) {
            // Upper hemisphere: horizon to zenith
            float t = smoothstep(0.0, 0.8, heightFactor);
            skyColor = mix(horizonColor, zenithColor, t);
          } else {
            // Lower hemisphere: horizon to nadir (floor area)
            float t = smoothstep(0.0, -0.3, heightFactor);
            skyColor = mix(horizonColor, nadirColor, t);
          }

          // Add stars in upper hemisphere
          float starIntensity = 0.0;
          if (heightFactor > -0.1) {
            vec2 starUV = vec2(theta, phi);
            starIntensity = stars(starUV * 8.0, 100.0) * 0.6;
            starIntensity += stars(starUV * 4.0, 50.0) * 0.4;
            starIntensity *= smoothstep(-0.1, 0.3, heightFactor); // Fade near horizon
          }
          vec3 starColor = vec3(0.9, 0.95, 1.0) * starIntensity;

          // Horizon glow
          float horizonGlow = exp(-abs(heightFactor) * 8.0) * 0.15;
          vec3 horizonGlowColor = vec3(0.3, 0.2, 0.5) * horizonGlow;

          // Combine sky
          vec3 finalSky = skyColor + starColor + horizonGlowColor;

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
  const targetMode = useSpatialModeStore((s) => s.targetMode);
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
        }}
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
        }}
      >
        {/* We use our own SpatialModeToggle in the toolbar for XR entry */}
        {/* Wrap entire XR tree in error boundary to prevent crashes */}
        <XRErrorBoundary fallback={<XRErrorFallback />}>
          <XR store={xrStore}>
            {/* Debug logger for XR session state */}
            <XRDebugLogger />

            {/* XR Session State Tracker - syncs XR state to our store */}
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

            {/* User origin (feet position) - wrap in error boundary */}
            <XRErrorBoundary>
              <XROrigin />
            </XRErrorBoundary>

            {/* 360 Grid Environment (VR and 3D preview - customizable) */}
            {/* Pass isXRSession=true when we're in an active XR session */}
            <GridEnvironment360
              forceShow={active}
              isXRSession={isXRActive}
            />

            {/* Ground reference */}
            <GroundPlane />

            {/* Main scene content - wrap in error boundary for XR-related errors */}
            <XRErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <SpatialScene />
              </Suspense>
            </XRErrorBoundary>

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
