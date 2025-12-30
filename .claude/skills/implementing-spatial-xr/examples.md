# Spatial XR Examples

Extended code examples for implementing XR features in StickerNest.

## Complete VR Scene Setup

```tsx
// src/components/spatial/VRCanvas.tsx
import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore, XROrigin, TeleportTarget } from '@react-three/xr';
import { Environment, OrbitControls } from '@react-three/drei';
import { useSpatialModeStore, useActiveSpatialMode } from '../../state/useSpatialModeStore';

// Create XR store with full configuration
const xrStore = createXRStore({
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
  // Performance
  frameRate: 'high',
  foveation: 1,
  frameBufferScaling: 1,
  // Features
  handTracking: true,
  // AR features (optional)
  hitTest: false,
  planeDetection: false,
  anchors: false,
});

interface VRCanvasProps {
  children: React.ReactNode;
}

export function VRCanvas({ children }: VRCanvasProps) {
  const [userPosition, setUserPosition] = useState<[number, number, number]>([0, 0, 0]);
  const spatialMode = useActiveSpatialMode();
  const setActiveMode = useSpatialModeStore((s) => s.setActiveMode);
  const setSessionState = useSpatialModeStore((s) => s.setSessionState);
  const setCapabilities = useSpatialModeStore((s) => s.setCapabilities);

  // Check XR capabilities on mount
  useEffect(() => {
    async function checkCapabilities() {
      if (!navigator.xr) {
        setCapabilities({ webXRAvailable: false, vrSupported: false, arSupported: false });
        return;
      }

      const [vrSupported, arSupported] = await Promise.all([
        navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
        navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
      ]);

      setCapabilities({ webXRAvailable: true, vrSupported, arSupported });
    }

    checkCapabilities();
  }, [setCapabilities]);

  const handleTeleport = (point: { x: number; y: number; z: number }) => {
    setUserPosition([point.x, 0, point.z]);
  };

  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 1.6, 3], fov: 75 }}
    >
      <XR
        store={xrStore}
        onSessionStart={() => {
          setSessionState('active');
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
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />

        {/* User origin with teleportation support */}
        <XROrigin position={userPosition} />

        {/* Environment (VR only) */}
        {spatialMode === 'vr' && (
          <Environment preset="sunset" background />
        )}

        {/* Teleportable floor */}
        <TeleportTarget onTeleport={handleTeleport}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
        </TeleportTarget>

        {/* Desktop controls when not in XR */}
        {spatialMode === 'desktop' && <OrbitControls />}

        {/* Scene content */}
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </XR>
    </Canvas>
  );
}

export { xrStore };
```

---

## VR Entry Buttons Component

```tsx
// src/components/spatial/XREntryButtons.tsx
import React from 'react';
import { useSpatialModeStore, useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { xrStore } from './VRCanvas';

export function XREntryButtons() {
  const spatialMode = useActiveSpatialMode();
  const capabilities = useSpatialModeStore((s) => s.capabilities);
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const errorMessage = useSpatialModeStore((s) => s.errorMessage);

  const isInXR = spatialMode !== 'desktop';
  const isLoading = sessionState === 'requesting';

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {/* VR Button */}
      {capabilities.vrSupported && (
        <button
          onClick={() => isInXR ? xrStore.getState().session?.end() : xrStore.enterVR()}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: spatialMode === 'vr' ? '#8b5cf6' : '#374151',
            color: 'white',
            cursor: isLoading ? 'wait' : 'pointer',
          }}
        >
          {isLoading ? 'Loading...' : spatialMode === 'vr' ? 'Exit VR' : 'Enter VR'}
        </button>
      )}

      {/* AR Button */}
      {capabilities.arSupported && (
        <button
          onClick={() => isInXR ? xrStore.getState().session?.end() : xrStore.enterAR()}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: spatialMode === 'ar' ? '#10b981' : '#374151',
            color: 'white',
            cursor: isLoading ? 'wait' : 'pointer',
          }}
        >
          {isLoading ? 'Loading...' : spatialMode === 'ar' ? 'Exit AR' : 'Enter AR'}
        </button>
      )}

      {/* No XR support message */}
      {!capabilities.vrSupported && !capabilities.arSupported && capabilities.lastChecked > 0 && (
        <span style={{ color: '#9ca3af', fontSize: 14 }}>
          XR not supported on this device
        </span>
      )}

      {/* Error message */}
      {errorMessage && (
        <span style={{ color: '#ef4444', fontSize: 14 }}>
          {errorMessage}
        </span>
      )}
    </div>
  );
}
```

---

## Intent-Based Interaction Handler

```tsx
// src/components/spatial/InteractionHandler.tsx
import React, { useCallback, useRef } from 'react';
import { useXREvent } from '@react-three/xr';
import { ThreeEvent } from '@react-three/fiber';

export type InteractionIntent =
  | 'select'
  | 'focus'
  | 'grab'
  | 'move'
  | 'resize'
  | 'rotate'
  | 'release';

interface IntentEvent {
  intent: InteractionIntent;
  point?: { x: number; y: number; z: number };
  inputSource?: 'mouse' | 'touch' | 'controller' | 'hand';
}

interface InteractiveObjectProps {
  children: React.ReactNode;
  onIntent: (event: IntentEvent) => void;
  disabled?: boolean;
}

export function InteractiveObject({ children, onIntent, disabled }: InteractiveObjectProps) {
  const isGrabbing = useRef(false);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (disabled) return;
    e.stopPropagation();
    onIntent({
      intent: 'select',
      point: e.point,
      inputSource: 'mouse',
    });
  }, [onIntent, disabled]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (disabled) return;
    e.stopPropagation();
    isGrabbing.current = true;
    onIntent({
      intent: 'grab',
      point: e.point,
      inputSource: e.pointerType === 'touch' ? 'touch' : 'mouse',
    });
  }, [onIntent, disabled]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (disabled) return;
    e.stopPropagation();
    if (isGrabbing.current) {
      isGrabbing.current = false;
      onIntent({
        intent: 'release',
        point: e.point,
        inputSource: e.pointerType === 'touch' ? 'touch' : 'mouse',
      });
    }
  }, [onIntent, disabled]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (disabled || !isGrabbing.current) return;
    onIntent({
      intent: 'move',
      point: e.point,
      inputSource: e.pointerType === 'touch' ? 'touch' : 'mouse',
    });
  }, [onIntent, disabled]);

  const handlePointerEnter = useCallback(() => {
    if (disabled) return;
    onIntent({ intent: 'focus' });
  }, [onIntent, disabled]);

  const handlePointerLeave = useCallback(() => {
    if (disabled) return;
    isGrabbing.current = false;
    onIntent({ intent: 'focus', point: undefined });
  }, [onIntent, disabled]);

  return (
    <group
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </group>
  );
}
```

---

## AR Hit Test Component

```tsx
// src/components/spatial/ARHitTestIndicator.tsx
import React, { useRef } from 'react';
import { useHitTest } from '@react-three/xr';
import { Mesh, Matrix4 } from 'three';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';

interface ARHitTestIndicatorProps {
  onPlacement?: (position: [number, number, number], rotation: [number, number, number, number]) => void;
}

export function ARHitTestIndicator({ onPlacement }: ARHitTestIndicatorProps) {
  const indicatorRef = useRef<Mesh>(null);
  const spatialMode = useActiveSpatialMode();
  const lastHitMatrix = useRef<Matrix4>(new Matrix4());

  // Only active in AR mode
  useHitTest((hitMatrix) => {
    if (indicatorRef.current && spatialMode === 'ar') {
      lastHitMatrix.current.copy(hitMatrix);
      hitMatrix.decompose(
        indicatorRef.current.position,
        indicatorRef.current.quaternion,
        indicatorRef.current.scale
      );
      indicatorRef.current.visible = true;
    }
  });

  const handleClick = () => {
    if (onPlacement && indicatorRef.current) {
      const pos = indicatorRef.current.position;
      const quat = indicatorRef.current.quaternion;
      onPlacement(
        [pos.x, pos.y, pos.z],
        [quat.x, quat.y, quat.z, quat.w]
      );
    }
  };

  // Only render in AR mode
  if (spatialMode !== 'ar') return null;

  return (
    <mesh
      ref={indicatorRef}
      visible={false}
      rotation-x={-Math.PI / 2}
      onClick={handleClick}
    >
      <ringGeometry args={[0.08, 0.12, 32]} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.8} />
    </mesh>
  );
}
```

---

## Accessible VR Widget

```tsx
// src/components/spatial/AccessibleWidget.tsx
import React, { useState, useCallback } from 'react';
import { Text } from '@react-three/drei';
import { useSpatialModeStore } from '../../state/useSpatialModeStore';
import { InteractiveObject, IntentEvent } from './InteractionHandler';

interface AccessibleWidgetProps {
  position: [number, number, number];
  title: string;
  content: React.ReactNode;
  onSelect?: () => void;
}

export function AccessibleWidget({ position, title, content, onSelect }: AccessibleWidgetProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [scale, setScale] = useState(1);
  const reducedMotion = useSpatialModeStore((s) => s.reducedMotion);

  // Allow user to scale widget for accessibility
  const minScale = 0.5;
  const maxScale = 3; // Beyond "realistic" as per accessibility requirements

  const handleIntent = useCallback((event: IntentEvent) => {
    switch (event.intent) {
      case 'select':
        onSelect?.();
        break;
      case 'focus':
        setIsHovered(event.point !== undefined);
        break;
      case 'resize':
        // Handle pinch-to-zoom or similar
        break;
    }
  }, [onSelect]);

  // Keyboard support for accessibility
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onSelect?.();
    }
    if (e.key === '+' || e.key === '=') {
      setScale((s) => Math.min(s + 0.1, maxScale));
    }
    if (e.key === '-') {
      setScale((s) => Math.max(s - 0.1, minScale));
    }
  }, [onSelect]);

  return (
    <InteractiveObject onIntent={handleIntent}>
      <group position={position} scale={scale}>
        {/* Background panel */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[2, 1.5]} />
          <meshStandardMaterial
            color={isHovered ? '#4c1d95' : '#1f2937'}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Title */}
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {title}
        </Text>

        {/* Content area */}
        <group position={[0, -0.1, 0]}>
          {content}
        </group>

        {/* Focus indicator for accessibility */}
        {isHovered && (
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[2.1, 1.6]} />
            <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
          </mesh>
        )}

        {/* Scale controls (visible when focused) */}
        {isHovered && (
          <group position={[0.9, -0.6, 0]}>
            <Text fontSize={0.08} color="#9ca3af">
              +/- to resize
            </Text>
          </group>
        )}
      </group>
    </InteractiveObject>
  );
}
```

---

## Spatial Scene Renderer (Mode-Agnostic)

```tsx
// src/components/spatial/SpatialSceneRenderer.tsx
import React from 'react';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';

interface SpatialObject {
  id: string;
  type: 'widget' | 'canvas' | 'sticker';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  data: unknown;
}

interface SpatialSceneRendererProps {
  objects: SpatialObject[];
  onObjectIntent: (objectId: string, intent: string, data?: unknown) => void;
}

export function SpatialSceneRenderer({ objects, onObjectIntent }: SpatialSceneRendererProps) {
  const spatialMode = useActiveSpatialMode();

  return (
    <group>
      {objects.map((obj) => (
        <group
          key={obj.id}
          position={[obj.position.x, obj.position.y, obj.position.z]}
          rotation={[obj.rotation.x, obj.rotation.y, obj.rotation.z]}
          scale={[obj.scale.x, obj.scale.y, obj.scale.z]}
        >
          {/* Render based on object type */}
          {obj.type === 'widget' && (
            <WidgetRenderer
              data={obj.data}
              onIntent={(intent, data) => onObjectIntent(obj.id, intent, data)}
            />
          )}
          {obj.type === 'canvas' && (
            <CanvasRenderer
              data={obj.data}
              onIntent={(intent, data) => onObjectIntent(obj.id, intent, data)}
            />
          )}
          {obj.type === 'sticker' && (
            <StickerRenderer
              data={obj.data}
              onIntent={(intent, data) => onObjectIntent(obj.id, intent, data)}
            />
          )}
        </group>
      ))}
    </group>
  );
}

// These would be implemented based on your widget/canvas system
function WidgetRenderer({ data, onIntent }: { data: unknown; onIntent: (intent: string, data?: unknown) => void }) {
  return (
    <mesh onClick={() => onIntent('select')}>
      <boxGeometry args={[1, 1, 0.1]} />
      <meshStandardMaterial color="#8b5cf6" />
    </mesh>
  );
}

function CanvasRenderer({ data, onIntent }: { data: unknown; onIntent: (intent: string, data?: unknown) => void }) {
  return (
    <mesh onClick={() => onIntent('select')}>
      <planeGeometry args={[2, 1.5]} />
      <meshStandardMaterial color="#1f2937" />
    </mesh>
  );
}

function StickerRenderer({ data, onIntent }: { data: unknown; onIntent: (intent: string, data?: unknown) => void }) {
  return (
    <mesh onClick={() => onIntent('select')}>
      <circleGeometry args={[0.2, 32]} />
      <meshStandardMaterial color="#f59e0b" />
    </mesh>
  );
}
```

---

## Reduced Motion Support

```tsx
// src/components/spatial/ReducedMotionProvider.tsx
import React, { useEffect } from 'react';
import { useSpatialModeStore } from '../../state/useSpatialModeStore';

export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  const setReducedMotion = useSpatialModeStore((s) => s.setReducedMotion);

  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [setReducedMotion]);

  return <>{children}</>;
}
```

---

## Room Mapping Components

### Complete Room Visualizer

```tsx
// src/components/spatial/RoomVisualizer.tsx
import React, { useState } from 'react';
import {
  useXRPlanes,
  useXRMeshes,
  XRPlaneModel,
  XRMeshModel,
  XRSpace,
} from '@react-three/xr';
import { Text } from '@react-three/drei';

interface RoomVisualizerProps {
  showPlanes?: boolean;
  showMesh?: boolean;
  showLabels?: boolean;
  planeOpacity?: number;
  meshOpacity?: number;
}

export function RoomVisualizer({
  showPlanes = true,
  showMesh = true,
  showLabels = true,
  planeOpacity = 0.3,
  meshOpacity = 0.1,
}: RoomVisualizerProps) {
  // Get detected planes by type
  const walls = useXRPlanes('wall');
  const floors = useXRPlanes('floor');
  const ceilings = useXRPlanes('ceiling');
  const tables = useXRPlanes('table');
  const couches = useXRPlanes('couch');
  const doors = useXRPlanes('door');
  const windows = useXRPlanes('window');
  const otherPlanes = useXRPlanes('other');

  // Get room meshes
  const meshes = useXRMeshes();

  // Color mapping for different surface types
  const planeColors = {
    wall: '#6366f1',    // Indigo
    floor: '#22c55e',   // Green
    ceiling: '#f59e0b', // Amber
    table: '#8b5cf6',   // Purple
    couch: '#ec4899',   // Pink
    door: '#14b8a6',    // Teal
    window: '#3b82f6',  // Blue
    other: '#6b7280',   // Gray
  };

  const renderPlanes = (planes: XRPlane[], type: string, color: string) => (
    <>
      {planes.map((plane, index) => (
        <XRSpace key={`${type}-${index}`} space={plane.planeSpace}>
          <XRPlaneModel plane={plane}>
            <meshBasicMaterial
              color={color}
              transparent
              opacity={planeOpacity}
              side={2}
            />
          </XRPlaneModel>
          {showLabels && (
            <Text
              position={[0, 0.1, 0]}
              fontSize={0.05}
              color="white"
              anchorX="center"
            >
              {type}
            </Text>
          )}
        </XRSpace>
      ))}
    </>
  );

  return (
    <group>
      {/* Render detected planes */}
      {showPlanes && (
        <>
          {renderPlanes(walls, 'Wall', planeColors.wall)}
          {renderPlanes(floors, 'Floor', planeColors.floor)}
          {renderPlanes(ceilings, 'Ceiling', planeColors.ceiling)}
          {renderPlanes(tables, 'Table', planeColors.table)}
          {renderPlanes(couches, 'Couch', planeColors.couch)}
          {renderPlanes(doors, 'Door', planeColors.door)}
          {renderPlanes(windows, 'Window', planeColors.window)}
          {renderPlanes(otherPlanes, 'Surface', planeColors.other)}
        </>
      )}

      {/* Render room mesh */}
      {showMesh && meshes.map((mesh, index) => (
        <XRSpace key={`mesh-${index}`} space={mesh.meshSpace}>
          <XRMeshModel mesh={mesh}>
            <meshBasicMaterial
              color="#ffffff"
              wireframe
              transparent
              opacity={meshOpacity}
            />
          </XRMeshModel>
        </XRSpace>
      ))}

      {/* Room stats display */}
      {showLabels && (
        <group position={[0, 2, -1]}>
          <Text fontSize={0.06} color="white" anchorX="center">
            {`Planes: ${walls.length + floors.length + tables.length} | Meshes: ${meshes.length}`}
          </Text>
        </group>
      )}
    </group>
  );
}
```

---

### AR Canvas with Occlusion

```tsx
// src/components/spatial/ARCanvasWithOcclusion.tsx
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore, useXRMeshes, XRMeshModel, XRSpace } from '@react-three/xr';
import { useSpatialModeStore } from '../../state/useSpatialModeStore';

// Create AR store with room mapping enabled
const arStore = createXRStore({
  // AR session
  frameRate: 'high',
  foveation: 1,

  // Room mapping features
  hitTest: true,
  planeDetection: true,
  meshDetection: true,
  anchors: true,

  // Request all spatial features
  optionalFeatures: [
    'plane-detection',
    'mesh-detection',
    'anchors',
    'depth-sensing',
  ],
});

// Occlusion layer - renders room mesh to depth buffer only
function OcclusionLayer() {
  const meshes = useXRMeshes();

  return (
    <group renderOrder={0}>
      {meshes.map((mesh, index) => (
        <XRSpace key={`occlusion-${index}`} space={mesh.meshSpace}>
          <XRMeshModel mesh={mesh}>
            <meshBasicMaterial
              colorWrite={false}
              depthWrite={true}
            />
          </XRMeshModel>
        </XRSpace>
      ))}
    </group>
  );
}

// Debug visualization of room mesh
function DebugRoomMesh({ visible }: { visible: boolean }) {
  const meshes = useXRMeshes();

  if (!visible) return null;

  return (
    <group renderOrder={1}>
      {meshes.map((mesh, index) => (
        <XRSpace key={`debug-${index}`} space={mesh.meshSpace}>
          <XRMeshModel mesh={mesh}>
            <meshBasicMaterial
              color="#8b5cf6"
              wireframe
              transparent
              opacity={0.3}
            />
          </XRMeshModel>
        </XRSpace>
      ))}
    </group>
  );
}

interface ARCanvasWithOcclusionProps {
  children: React.ReactNode;
  showDebugMesh?: boolean;
}

export function ARCanvasWithOcclusion({
  children,
  showDebugMesh = false,
}: ARCanvasWithOcclusionProps) {
  const setActiveMode = useSpatialModeStore((s) => s.setActiveMode);
  const setSessionState = useSpatialModeStore((s) => s.setSessionState);

  return (
    <>
      <button onClick={() => arStore.enterAR()}>Enter AR</button>

      <Canvas gl={{ antialias: true, alpha: true }}>
        <XR
          store={arStore}
          onSessionStart={() => {
            setSessionState('active');
            setActiveMode('ar');
          }}
          onSessionEnd={() => {
            setSessionState('none');
            setActiveMode('desktop');
          }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.4} />

          {/* Occlusion mesh (renders first) */}
          <OcclusionLayer />

          {/* Debug visualization */}
          <DebugRoomMesh visible={showDebugMesh} />

          {/* Virtual content (will be occluded by real surfaces) */}
          <group renderOrder={2}>
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </group>
        </XR>
      </Canvas>
    </>
  );
}

export { arStore };
```

---

### Persistent Widget Anchors

```tsx
// src/components/spatial/PersistentWidgetAnchor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useXR, XRSpace, requestXRAnchor, useXRAnchor } from '@react-three/xr';
import { Text } from '@react-three/drei';
import { Vector3 } from 'three';

interface AnchorData {
  handle: string;
  widgetId: string;
  createdAt: number;
}

// Storage key for persistent anchors
const ANCHORS_STORAGE_KEY = 'stickernest_persistent_anchors';

// Load saved anchors from localStorage
function loadSavedAnchors(): AnchorData[] {
  try {
    const saved = localStorage.getItem(ANCHORS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save anchors to localStorage
function saveAnchors(anchors: AnchorData[]) {
  localStorage.setItem(ANCHORS_STORAGE_KEY, JSON.stringify(anchors));
}

interface PersistentWidgetProps {
  widgetId: string;
  children: React.ReactNode;
  onAnchorCreated?: (handle: string) => void;
  onAnchorLost?: () => void;
}

export function PersistentWidget({
  widgetId,
  children,
  onAnchorCreated,
  onAnchorLost,
}: PersistentWidgetProps) {
  const { session } = useXR();
  const [anchorHandle, setAnchorHandle] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  // Try to restore saved anchor on mount
  useEffect(() => {
    const savedAnchors = loadSavedAnchors();
    const savedAnchor = savedAnchors.find((a) => a.widgetId === widgetId);
    if (savedAnchor) {
      setAnchorHandle(savedAnchor.handle);
    }
  }, [widgetId]);

  // Restore anchor from handle
  const anchor = useXRAnchor(anchorHandle);

  // Create new anchor at position
  const createAnchorAtPosition = useCallback(async (position: Vector3) => {
    if (!session) return;

    try {
      const newAnchor = await requestXRAnchor(session, {
        space: 'local-floor',
        position: [position.x, position.y, position.z],
      });

      if (newAnchor) {
        // Try to get persistent handle (Meta Quest feature)
        const handle = await newAnchor.requestPersistentHandle?.();

        if (handle) {
          // Save to localStorage
          const savedAnchors = loadSavedAnchors();
          const updatedAnchors = savedAnchors.filter((a) => a.widgetId !== widgetId);
          updatedAnchors.push({
            handle,
            widgetId,
            createdAt: Date.now(),
          });
          saveAnchors(updatedAnchors);

          setAnchorHandle(handle);
          onAnchorCreated?.(handle);
        }
      }
    } catch (error) {
      console.error('Failed to create anchor:', error);
    }

    setIsPlacing(false);
  }, [session, widgetId, onAnchorCreated]);

  // Delete anchor
  const deleteAnchor = useCallback(() => {
    const savedAnchors = loadSavedAnchors();
    const updatedAnchors = savedAnchors.filter((a) => a.widgetId !== widgetId);
    saveAnchors(updatedAnchors);
    setAnchorHandle(null);
    onAnchorLost?.();
  }, [widgetId, onAnchorLost]);

  // If we have an anchor, render at its position
  if (anchor) {
    return (
      <XRSpace space={anchor.anchorSpace}>
        <group>
          {children}
          {/* Anchor indicator */}
          <mesh position={[0, -0.02, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.03, 0.04, 32]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </group>
      </XRSpace>
    );
  }

  // If placing, show placement UI
  if (isPlacing) {
    return (
      <PlacementMode onPlace={createAnchorAtPosition} onCancel={() => setIsPlacing(false)} />
    );
  }

  // Show "place widget" prompt
  return (
    <group position={[0, 1.5, -1]}>
      <mesh onClick={() => setIsPlacing(true)}>
        <planeGeometry args={[0.4, 0.15]} />
        <meshBasicMaterial color="#8b5cf6" />
      </mesh>
      <Text position={[0, 0, 0.01]} fontSize={0.04} color="white" anchorX="center">
        Tap to place widget
      </Text>
    </group>
  );
}

// Placement mode with hit testing
function PlacementMode({
  onPlace,
  onCancel,
}: {
  onPlace: (position: Vector3) => void;
  onCancel: () => void;
}) {
  const indicatorRef = useRef<Mesh>(null);
  const lastPosition = useRef(new Vector3());

  useHitTest((hitMatrix) => {
    if (indicatorRef.current) {
      hitMatrix.decompose(
        indicatorRef.current.position,
        indicatorRef.current.quaternion,
        indicatorRef.current.scale
      );
      lastPosition.current.copy(indicatorRef.current.position);
    }
  });

  return (
    <group>
      {/* Placement indicator */}
      <mesh
        ref={indicatorRef}
        rotation-x={-Math.PI / 2}
        onClick={() => onPlace(lastPosition.current.clone())}
      >
        <ringGeometry args={[0.08, 0.12, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.8} />
      </mesh>

      {/* Cancel button */}
      <group position={[0, 1.8, -1]}>
        <mesh onClick={onCancel}>
          <planeGeometry args={[0.3, 0.1]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <Text position={[0, 0, 0.01]} fontSize={0.04} color="white" anchorX="center">
          Cancel
        </Text>
      </group>
    </group>
  );
}
```

---

### Surface-Aware Widget Placement

```tsx
// src/components/spatial/SurfaceAwarePlacement.tsx
import React, { useState, useCallback } from 'react';
import {
  useXRPlanes,
  XRPlaneModel,
  XRSpace,
} from '@react-three/xr';
import { Text } from '@react-three/drei';
import { Vector3 } from 'three';

type PlacementSurface = 'floor' | 'table' | 'wall';

interface PlacedObject {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  surfaceType: PlacementSurface;
}

interface SurfaceAwarePlacementProps {
  allowedSurfaces?: PlacementSurface[];
  onPlace: (object: PlacedObject) => void;
  children: (placedObjects: PlacedObject[]) => React.ReactNode;
}

export function SurfaceAwarePlacement({
  allowedSurfaces = ['floor', 'table', 'wall'],
  onPlace,
  children,
}: SurfaceAwarePlacementProps) {
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [hoveredPlane, setHoveredPlane] = useState<XRPlane | null>(null);

  // Get planes for allowed surface types
  const floors = useXRPlanes('floor');
  const tables = useXRPlanes('table');
  const walls = useXRPlanes('wall');

  // Combine allowed planes
  const activePlanes: { plane: XRPlane; type: PlacementSurface }[] = [
    ...(allowedSurfaces.includes('floor') ? floors.map((p) => ({ plane: p, type: 'floor' as const })) : []),
    ...(allowedSurfaces.includes('table') ? tables.map((p) => ({ plane: p, type: 'table' as const })) : []),
    ...(allowedSurfaces.includes('wall') ? walls.map((p) => ({ plane: p, type: 'wall' as const })) : []),
  ];

  const handlePlaneClick = useCallback((
    event: ThreeEvent<MouseEvent>,
    surfaceType: PlacementSurface
  ) => {
    event.stopPropagation();

    const newObject: PlacedObject = {
      id: `obj-${Date.now()}`,
      position: [event.point.x, event.point.y, event.point.z],
      rotation: surfaceType === 'wall' ? [0, Math.PI, 0] : [0, 0, 0],
      surfaceType,
    };

    setPlacedObjects((prev) => [...prev, newObject]);
    onPlace(newObject);
  }, [onPlace]);

  // Color for each surface type
  const surfaceColors = {
    floor: '#22c55e',
    table: '#8b5cf6',
    wall: '#3b82f6',
  };

  return (
    <group>
      {/* Render interactive placement surfaces */}
      {activePlanes.map(({ plane, type }, index) => (
        <XRSpace key={`${type}-${index}`} space={plane.planeSpace}>
          <XRPlaneModel
            plane={plane}
            onPointerEnter={() => setHoveredPlane(plane)}
            onPointerLeave={() => setHoveredPlane(null)}
            onClick={(e) => handlePlaneClick(e, type)}
          >
            <meshBasicMaterial
              color={surfaceColors[type]}
              transparent
              opacity={hoveredPlane === plane ? 0.5 : 0.15}
            />
          </XRPlaneModel>
        </XRSpace>
      ))}

      {/* Render placed objects */}
      {children(placedObjects)}

      {/* Surface legend */}
      <group position={[-1, 2, -1]}>
        {allowedSurfaces.includes('floor') && (
          <Text position={[0, 0, 0]} fontSize={0.04} color={surfaceColors.floor}>
            ● Floor
          </Text>
        )}
        {allowedSurfaces.includes('table') && (
          <Text position={[0, -0.06, 0]} fontSize={0.04} color={surfaceColors.table}>
            ● Table
          </Text>
        )}
        {allowedSurfaces.includes('wall') && (
          <Text position={[0, -0.12, 0]} fontSize={0.04} color={surfaceColors.wall}>
            ● Wall
          </Text>
        )}
      </group>
    </group>
  );
}
```

---

### Room Setup Guide Component

```tsx
// src/components/spatial/RoomSetupGuide.tsx
import React from 'react';
import { useXRPlanes, useXRMeshes, useXR } from '@react-three/xr';
import { Text } from '@react-three/drei';

export function RoomSetupGuide() {
  const { isPresenting } = useXR();
  const allPlanes = useXRPlanes();
  const meshes = useXRMeshes();

  // Only show in AR mode when no room data
  if (!isPresenting) return null;

  const hasPlanes = allPlanes.length > 0;
  const hasMeshes = meshes.length > 0;

  // If we have room data, don't show guide
  if (hasPlanes || hasMeshes) return null;

  return (
    <group position={[0, 1.5, -1]}>
      {/* Background panel */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshBasicMaterial color="#1f2937" transparent opacity={0.95} />
      </mesh>

      {/* Title */}
      <Text
        position={[0, 0.18, 0]}
        fontSize={0.06}
        color="#f59e0b"
        anchorX="center"
        fontWeight="bold"
      >
        Room Setup Required
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 0.02, 0]}
        fontSize={0.04}
        color="white"
        anchorX="center"
        textAlign="center"
        maxWidth={1}
      >
        For the best AR experience, please set up{'\n'}
        your room boundaries in your headset.
      </Text>

      {/* Steps */}
      <Text
        position={[0, -0.15, 0]}
        fontSize={0.035}
        color="#9ca3af"
        anchorX="center"
        textAlign="center"
        maxWidth={1}
      >
        Meta Quest: Settings → Guardian → Room Setup{'\n'}
        Draw walls, floor, and furniture
      </Text>
    </group>
  );
}
```
