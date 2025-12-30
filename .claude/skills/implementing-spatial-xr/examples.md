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
