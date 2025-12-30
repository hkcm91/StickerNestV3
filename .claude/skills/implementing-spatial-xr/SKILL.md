---
name: implementing-spatial-xr
description: Implementing WebXR, VR, and AR features for StickerNest's spatial platform. Use when the user asks about VR mode, AR mode, WebXR integration, immersive sessions, XR controllers, hand tracking, hit testing, plane detection, teleportation, XR accessibility, or spatial rendering. Covers @react-three/xr, useSpatialModeStore, XR adapters, and intent-based input.
---

# Implementing Spatial XR for StickerNest

This skill guides you through implementing VR and AR features following StickerNest's spatial platform architecture where **VR and AR are rendering modes, not separate applications**.

## Core Design Principles (DO NOT VIOLATE)

1. **One System, Multiple Modes**: Desktop, VR, and AR share the same widget system, canvas system, scene graph, and interaction model
2. **Mode-Specific Logic in Adapters**: Rendering differences live in adapters, not forked code
3. **Intent-Based Interaction**: All input normalized to semantic intents (select, grab, move, etc.)
4. **Accessibility First**: All features must support reduced motion, keyboard navigation, and flexible input

---

## Technology Stack

### Required Dependencies
```bash
npm install three @react-three/fiber @react-three/xr@latest @react-three/drei
```

### Key Libraries
- **@react-three/xr** (v6+): React bindings for WebXR
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers and components

---

## StickerNest Spatial Mode Integration

### State Management: useSpatialModeStore

The spatial mode store at `src/state/useSpatialModeStore.ts` manages rendering modes:

```typescript
import { useSpatialModeStore, useActiveSpatialMode, useIsVRMode } from '../state/useSpatialModeStore';

// Access mode state
const spatialMode = useActiveSpatialMode(); // 'desktop' | 'vr' | 'ar'
const isVRMode = useIsVRMode();

// Toggle modes
const toggleVR = useSpatialModeStore((s) => s.toggleVR);
const toggleAR = useSpatialModeStore((s) => s.toggleAR);

// Check capabilities
const capabilities = useSpatialModeStore((s) => s.capabilities);
// { vrSupported: boolean, arSupported: boolean, webXRAvailable: boolean }

// Session state
const sessionState = useSpatialModeStore((s) => s.sessionState);
// 'none' | 'requesting' | 'active' | 'ending' | 'error'

// Accessibility preferences
const reducedMotion = useSpatialModeStore((s) => s.reducedMotion);
```

---

## Setting Up XR with React Three Fiber

### Basic XR Scene Setup

```tsx
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { useSpatialModeStore } from '../state/useSpatialModeStore';

// Create store outside component
const xrStore = createXRStore({
  // Input configuration
  controller: { teleportPointer: true },
  hand: { teleportPointer: true },

  // Session features
  frameRate: 'high',
  foveation: 1,
  handTracking: true,

  // AR features (when needed)
  hitTest: true,
  planeDetection: true,
  anchors: true,
});

function SpatialCanvas() {
  const setActiveMode = useSpatialModeStore((s) => s.setActiveMode);
  const setSessionState = useSpatialModeStore((s) => s.setSessionState);

  return (
    <>
      {/* Entry buttons - place in your UI */}
      <button onClick={() => xrStore.enterVR()}>Enter VR</button>
      <button onClick={() => xrStore.enterAR()}>Enter AR</button>

      <Canvas>
        <XR
          store={xrStore}
          onSessionStart={() => {
            setSessionState('active');
            // Detect mode from session
            const mode = xrStore.getState().session?.mode;
            setActiveMode(mode?.includes('ar') ? 'ar' : 'vr');
          }}
          onSessionEnd={() => {
            setSessionState('none');
            setActiveMode('desktop');
          }}
        >
          {/* Your 3D content here */}
          <ambientLight intensity={0.5} />
          <SpatialScene />
        </XR>
      </Canvas>
    </>
  );
}
```

---

## WebXR Session Types

### immersive-vr
Full VR with environment replacement:
```typescript
xrStore.enterVR(); // Requests immersive-vr session
```

### immersive-ar
AR with real-world passthrough:
```typescript
xrStore.enterAR(); // Requests immersive-ar session
```

### inline
Non-immersive, renders in page (useful for previews):
```typescript
// Inline sessions don't require XR hardware
// Content renders directly in the canvas
```

---

## Reference Spaces

Reference spaces define the coordinate system origin:

| Type | Use Case | Y=0 Position |
|------|----------|--------------|
| `viewer` | Head-locked UI, no movement | At eyes |
| `local` | Seated experiences | Near eyes at start |
| `local-floor` | Standing, limited movement | At floor level |
| `bounded-floor` | Room-scale with boundaries | At floor, bounded |
| `unbounded` | Large area, free movement | At floor |

### Configuring Reference Space
```typescript
const xrStore = createXRStore({
  // Default is 'local-floor'
  referenceSpace: 'local-floor',
});
```

---

## XR Origin and Teleportation

### XROrigin Component
The XROrigin represents the user's feet position:

```tsx
import { XROrigin, TeleportTarget } from '@react-three/xr';
import { useState } from 'react';

function TeleportableScene() {
  const [position, setPosition] = useState([0, 0, 0]);

  return (
    <>
      <XROrigin position={position} />

      {/* Floor that user can teleport to */}
      <TeleportTarget onTeleport={(point) => setPosition([point.x, 0, point.z])}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#444" />
        </mesh>
      </TeleportTarget>
    </>
  );
}
```

---

## Input Handling: Intent-Based System

Following StickerNest's architecture, normalize all input to semantic intents:

### Core Intents
```typescript
type InteractionIntent =
  | 'select'    // Primary action (click, trigger, pinch)
  | 'focus'     // Hover/gaze target
  | 'grab'      // Start dragging
  | 'move'      // While dragging
  | 'resize'    // Scale gesture
  | 'rotate'    // Rotation gesture
  | 'release';  // End interaction
```

### Using Pointer Events (Unified Input)
```tsx
function InteractiveWidget({ onIntent }) {
  return (
    <mesh
      // These work across mouse, touch, controller, and hand
      onClick={() => onIntent('select')}
      onPointerDown={() => onIntent('grab')}
      onPointerUp={() => onIntent('release')}
      onPointerMove={(e) => onIntent('move', e.point)}
      onPointerEnter={() => onIntent('focus')}
      onPointerLeave={() => onIntent('focus', null)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="purple" />
    </mesh>
  );
}
```

### Controller-Specific Events
```tsx
import { useXREvent } from '@react-three/xr';

function ControllerHandler() {
  // Handle squeeze (grip button)
  useXREvent('squeeze', (event) => {
    console.log('Grip pressed on', event.inputSource.handedness);
  });

  // Handle select (trigger)
  useXREvent('select', (event) => {
    console.log('Trigger pressed');
  });

  return null;
}
```

---

## Hand Tracking

Enable and use hand tracking:

```typescript
// In store configuration
const xrStore = createXRStore({
  handTracking: true,
  hand: {
    teleportPointer: true,
    // Hand model options
  },
});
```

### Detecting Hand Tracking State
```tsx
import { useXR } from '@react-three/xr';

function HandAwareComponent() {
  const isHandTracking = useXR((state) => state.isHandTracking);

  if (isHandTracking) {
    // User is using hands, not controllers
  }

  return null;
}
```

---

## AR Features

### Hit Testing (Ray Against Real World)
```tsx
import { useHitTest } from '@react-three/xr';

function ARPlacementIndicator() {
  const ref = useRef();

  useHitTest((hitMatrix) => {
    // hitMatrix is a Matrix4 of the intersection point
    if (ref.current) {
      hitMatrix.decompose(
        ref.current.position,
        ref.current.quaternion,
        ref.current.scale
      );
    }
  });

  return (
    <mesh ref={ref}>
      <ringGeometry args={[0.1, 0.15, 32]} />
      <meshBasicMaterial color="white" />
    </mesh>
  );
}
```

### Plane Detection
```typescript
const xrStore = createXRStore({
  planeDetection: true,
});
```

### Anchors (Persistent Positions)
```typescript
const xrStore = createXRStore({
  anchors: true,
});
```

---

## Accessibility Requirements

### Motion Sickness Prevention
```tsx
function AccessibleScene() {
  const reducedMotion = useSpatialModeStore((s) => s.reducedMotion);

  return (
    <>
      {/* Reduce peripheral motion for comfort */}
      {reducedMotion && <VignetteEffect />}

      {/* Use teleportation instead of smooth locomotion */}
      <TeleportTarget />

      {/* Maintain stable frame rate */}
      <AdaptivePerformance />
    </>
  );
}
```

### Size and Reach Flexibility
```tsx
function AccessibleWidget({ children }) {
  // Allow scaling beyond "realistic" sizes
  const [scale, setScale] = useState(1);

  return (
    <group scale={scale}>
      {children}
      {/* UI to adjust scale for accessibility */}
    </group>
  );
}
```

### Focus Mode (Bring Content Closer)
```tsx
function FocusMode({ target, enabled }) {
  const { camera } = useThree();

  useEffect(() => {
    if (enabled && target) {
      // Bring content to comfortable viewing distance
      // without requiring user movement
    }
  }, [enabled, target]);

  return null;
}
```

### No Required Locomotion
- All interactions reachable without movement
- Teleportation as optional enhancement
- World can come to user, not just user to world

---

## Rendering Mode Adapter Pattern

Create adapters that consume the same SpatialScene but render differently:

```tsx
// src/adapters/DesktopRenderAdapter.tsx
function DesktopRenderAdapter({ scene }) {
  return (
    <Canvas>
      <PerspectiveCamera />
      <DesktopControls />
      <SpatialSceneRenderer scene={scene} />
    </Canvas>
  );
}

// src/adapters/VRRenderAdapter.tsx
function VRRenderAdapter({ scene }) {
  return (
    <Canvas>
      <XR store={xrStore}>
        <XROrigin />
        <VREnvironment />
        <SpatialSceneRenderer scene={scene} />
      </XR>
    </Canvas>
  );
}

// src/adapters/ARRenderAdapter.tsx
function ARRenderAdapter({ scene }) {
  return (
    <Canvas>
      <XR store={xrStore}>
        <XROrigin />
        {/* No environment - real world is visible */}
        <SpatialSceneRenderer scene={scene} />
        <ARHitTestIndicator />
      </XR>
    </Canvas>
  );
}
```

---

## Environment Provider (VR-Only)

```tsx
import { Environment } from '@react-three/drei';

function VREnvironment() {
  const spatialMode = useActiveSpatialMode();

  // Only show environment in VR, not AR
  if (spatialMode !== 'vr') return null;

  return (
    <Environment
      preset="sunset" // or load 360° panorama
      background
    />
  );
}
```

---

## Detecting XR Capabilities

```tsx
function XRCapabilityCheck() {
  const setCapabilities = useSpatialModeStore((s) => s.setCapabilities);

  useEffect(() => {
    async function checkXR() {
      if (!navigator.xr) {
        setCapabilities({ webXRAvailable: false });
        return;
      }

      const [vrSupported, arSupported] = await Promise.all([
        navigator.xr.isSessionSupported('immersive-vr'),
        navigator.xr.isSessionSupported('immersive-ar'),
      ]);

      setCapabilities({ vrSupported, arSupported, webXRAvailable: true });
    }

    checkXR();
  }, []);

  return null;
}
```

---

## Testing Without Hardware

Use the WebXR Emulator browser extension:
- Chrome: "WebXR API Emulator"
- Firefox: "WebXR API Emulator"

The extension allows simulating headset position, controllers, and hand tracking.

---

## Common Patterns

### Pattern: Mode-Agnostic Widget
```tsx
// Widgets don't know their rendering mode
function StickerWidget({ position, content, onIntent }) {
  return (
    <group position={position}>
      <mesh
        onClick={() => onIntent('select')}
        onPointerDown={() => onIntent('grab')}
        onPointerUp={() => onIntent('release')}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial>
          {/* Widget content */}
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}
```

### Pattern: Spatial Transform
```typescript
// All canvas objects use spatial transforms
interface SpatialTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

// 2D canvases are just z=0 spatial objects
const flatCanvas: SpatialTransform = {
  position: { x: 0, y: 1.5, z: -2 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};
```

---

## Reference Files

- **Spatial Mode Store**: `src/state/useSpatialModeStore.ts`
- **Creative Toolbar (VR Toggle)**: `src/components/CreativeToolbar.tsx`
- **Entity Types**: `src/types/entities.ts`
- **Tool Store**: `src/state/useToolStore.ts`

---

## Troubleshooting

### Issue: XR session fails to start
**Cause**: Missing HTTPS or unsupported browser
**Fix**:
- Use HTTPS (required for WebXR)
- Check `navigator.xr.isSessionSupported()` first
- Verify browser compatibility (Chrome, Edge, Firefox, Oculus Browser)

### Issue: Controllers not appearing
**Cause**: Controller configuration disabled
**Fix**: Ensure `controller: true` in createXRStore config

### Issue: Hand tracking not working
**Cause**: Device doesn't support or feature not enabled
**Fix**:
- Check device supports hand tracking (Quest, Vision Pro)
- Enable `handTracking: true` in config
- Request `hand-tracking` feature

### Issue: AR passthrough is black
**Cause**: Using immersive-vr instead of immersive-ar
**Fix**: Use `xrStore.enterAR()` for passthrough experiences

---

## Explicit Non-Goals (v1)

Per StickerNest architecture, do NOT implement:
- Object recognition
- Room scanning
- Physics simulation
- Occlusion mapping
- Multiplayer synchronization
- Native-only features

These are future possibilities, not foundations.
