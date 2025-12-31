# VR Productivity Examples

Extended code examples for implementing VR productivity features in StickerNest.

## Complete Unified Input Implementation

```tsx
// src/xr/input/useUnifiedInput.ts

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3, Quaternion } from 'three';
import { useXR, useXREvent, useXRInputSourceState } from '@react-three/xr';
import { useThree, useFrame } from '@react-three/fiber';
import { useHandGestures } from '../../components/spatial/xr/useHandGestures';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type InputMode = 'controllers' | 'hands' | 'gaze-pinch' | 'touch' | 'unknown';

export type InputIntent =
  | { type: 'select'; point?: Vector3; hand?: 'left' | 'right' | 'gaze' }
  | { type: 'grab-start'; point: Vector3; hand?: 'left' | 'right' }
  | { type: 'grab-move'; point: Vector3; delta: Vector3; hand?: 'left' | 'right' }
  | { type: 'grab-end'; hand?: 'left' | 'right' }
  | { type: 'focus'; target: THREE.Object3D | null; point?: Vector3 }
  | { type: 'pinch-scale'; scale: number; center: Vector3 }
  | { type: 'rotate'; angle: number; axis: Vector3 }
  | { type: 'teleport'; destination: Vector3 }
  | { type: 'menu-toggle'; hand: 'left' | 'right' };

export interface UnifiedInputState {
  mode: InputMode;
  primaryPoint: Vector3 | null;
  primaryDirection: Vector3 | null;
  isSelecting: boolean;
  isGrabbing: boolean;
  activeHand: 'left' | 'right' | 'gaze' | null;
  grabStartPoint: Vector3 | null;
}

interface UseUnifiedInputOptions {
  onIntent?: (intent: InputIntent) => void;
  enableTeleport?: boolean;
  enableMenu?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────

export function useUnifiedInput(options: UseUnifiedInputOptions = {}) {
  const { onIntent, enableTeleport = true, enableMenu = true } = options;

  const { gl } = useThree();
  const { isHandTracking, session } = useXR();
  const handGestures = useHandGestures();

  // State
  const [state, setState] = useState<UnifiedInputState>({
    mode: 'unknown',
    primaryPoint: null,
    primaryDirection: null,
    isSelecting: false,
    isGrabbing: false,
    activeHand: null,
    grabStartPoint: null,
  });

  const grabStartRef = useRef<Vector3 | null>(null);
  const lastPinchPositionRef = useRef<{ left: Vector3 | null; right: Vector3 | null }>({
    left: null,
    right: null,
  });

  // ─────────────────────────────────────────────────────────
  // Detect Input Mode
  // ─────────────────────────────────────────────────────────

  const inputMode = useMemo((): InputMode => {
    if (!session) return 'unknown';

    const sources = Array.from(session.inputSources);

    // Vision Pro: transient-pointer
    if (sources.some((s) => s.targetRayMode === 'transient-pointer')) {
      return 'gaze-pinch';
    }

    // Hand tracking active
    if (isHandTracking && sources.some((s) => s.hand !== null)) {
      return 'hands';
    }

    // Controllers
    if (sources.some((s) => s.targetRayMode === 'tracked-pointer')) {
      return 'controllers';
    }

    // Mobile touch
    if (sources.some((s) => s.targetRayMode === 'screen')) {
      return 'touch';
    }

    return 'unknown';
  }, [session, isHandTracking]);

  useEffect(() => {
    setState((s) => ({ ...s, mode: inputMode }));
  }, [inputMode]);

  // ─────────────────────────────────────────────────────────
  // Controller Events
  // ─────────────────────────────────────────────────────────

  // Select (trigger press)
  useXREvent('select', (event) => {
    if (inputMode !== 'controllers') return;

    const hand = event.inputSource.handedness as 'left' | 'right';
    const point = event.intersection?.point;

    onIntent?.({
      type: 'select',
      hand,
      point: point ? new Vector3().copy(point) : undefined,
    });
  });

  // Squeeze (grip press)
  useXREvent('squeezestart', (event) => {
    if (inputMode !== 'controllers') return;

    const hand = event.inputSource.handedness as 'left' | 'right';
    const point = event.intersection?.point || new Vector3();

    grabStartRef.current = new Vector3().copy(point);
    setState((s) => ({
      ...s,
      isGrabbing: true,
      activeHand: hand,
      grabStartPoint: grabStartRef.current,
    }));

    onIntent?.({
      type: 'grab-start',
      hand,
      point: new Vector3().copy(point),
    });
  });

  useXREvent('squeezeend', (event) => {
    if (inputMode !== 'controllers') return;

    const hand = event.inputSource.handedness as 'left' | 'right';

    setState((s) => ({
      ...s,
      isGrabbing: false,
      activeHand: null,
      grabStartPoint: null,
    }));

    onIntent?.({ type: 'grab-end', hand });
    grabStartRef.current = null;
  });

  // ─────────────────────────────────────────────────────────
  // Vision Pro Gaze+Pinch Events
  // ─────────────────────────────────────────────────────────

  useXREvent('select', (event) => {
    if (event.inputSource.targetRayMode !== 'transient-pointer') return;

    const point = event.intersection?.point;

    onIntent?.({
      type: 'select',
      hand: 'gaze',
      point: point ? new Vector3().copy(point) : undefined,
    });
  });

  // ─────────────────────────────────────────────────────────
  // Hand Tracking Frame Updates
  // ─────────────────────────────────────────────────────────

  useFrame(() => {
    if (inputMode !== 'hands') return;

    const { left, right, anyPinching, anyGrabbing, activePinchHand, activeGrabHand } =
      handGestures;

    // Handle pinch (select)
    if (anyPinching && activePinchHand) {
      const gesture = activePinchHand === 'left' ? left : right;
      const prevPosition = lastPinchPositionRef.current[activePinchHand];

      // Smooth pinch position
      const smoothedPosition = prevPosition
        ? new Vector3().lerpVectors(prevPosition, gesture.pinchPosition, 0.3)
        : gesture.pinchPosition.clone();

      lastPinchPositionRef.current[activePinchHand] = smoothedPosition;

      // First frame of pinch
      if (!state.isSelecting) {
        onIntent?.({
          type: 'select',
          hand: activePinchHand,
          point: smoothedPosition,
        });
        setState((s) => ({ ...s, isSelecting: true, activeHand: activePinchHand }));
      }
    } else {
      if (state.isSelecting) {
        setState((s) => ({ ...s, isSelecting: false, activeHand: null }));
      }
      lastPinchPositionRef.current = { left: null, right: null };
    }

    // Handle grab
    if (anyGrabbing && activeGrabHand) {
      const gesture = activeGrabHand === 'left' ? left : right;
      const palmPos = gesture.palmPosition;

      if (!state.isGrabbing) {
        // Grab start
        grabStartRef.current = palmPos.clone();
        setState((s) => ({
          ...s,
          isGrabbing: true,
          activeHand: activeGrabHand,
          grabStartPoint: palmPos.clone(),
        }));

        onIntent?.({
          type: 'grab-start',
          hand: activeGrabHand,
          point: palmPos.clone(),
        });
      } else {
        // Grab move
        const delta = new Vector3().subVectors(palmPos, grabStartRef.current!);

        onIntent?.({
          type: 'grab-move',
          hand: activeGrabHand,
          point: palmPos.clone(),
          delta,
        });
      }
    } else if (state.isGrabbing) {
      // Grab end
      onIntent?.({ type: 'grab-end', hand: state.activeHand as 'left' | 'right' });
      setState((s) => ({
        ...s,
        isGrabbing: false,
        activeHand: null,
        grabStartPoint: null,
      }));
      grabStartRef.current = null;
    }

    // Menu gesture (palm up, flat hand)
    if (enableMenu) {
      const checkMenuGesture = (hand: 'left' | 'right') => {
        const gesture = hand === 'left' ? left : right;
        if (!gesture.isTracking) return false;

        const isPalmUp = gesture.palmDirection.y > 0.7;
        const isFlat = gesture.fingerCurls.every((curl) => curl < 0.3);
        return isPalmUp && isFlat && !gesture.isPinching;
      };

      // Check left hand menu
      if (checkMenuGesture('left') && left.isTracking) {
        onIntent?.({ type: 'menu-toggle', hand: 'left' });
      }
    }
  });

  // ─────────────────────────────────────────────────────────
  // Return Value
  // ─────────────────────────────────────────────────────────

  return {
    ...state,
    mode: inputMode,
  };
}
```

---

## Complete Floating Panel System

```tsx
// src/components/spatial/productivity/FloatingPanelSystem.tsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Vector3, Euler, Quaternion } from 'three';
import { useSpring, animated } from '@react-spring/three';
import { Html } from '@react-three/drei';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Panel {
  id: string;
  position: Vector3;
  rotation: Euler;
  width: number;
  height: number;
  content: React.ReactNode;
  curved: boolean;
  curveRadius: number;
  zIndex: number;
  locked: boolean;
  focused: boolean;
}

interface PanelSystemState {
  panels: Map<string, Panel>;
  activePanel: string | null;
  layout: 'single' | 'dual' | 'triple' | 'cockpit' | 'custom';
}

interface PanelSystemActions {
  addPanel: (panel: Omit<Panel, 'id'>) => string;
  removePanel: (id: string) => void;
  updatePanel: (id: string, updates: Partial<Panel>) => void;
  focusPanel: (id: string) => void;
  unfocusPanel: (id: string) => void;
  movePanel: (id: string, position: Vector3) => void;
  resizePanel: (id: string, width: number, height: number) => void;
  applyLayout: (layout: PanelSystemState['layout']) => void;
}

// ─────────────────────────────────────────────────────────────
// Layouts
// ─────────────────────────────────────────────────────────────

const LAYOUTS = {
  single: [
    { position: [0, 1.5, -1.2], width: 1.4, height: 0.9, curved: false },
  ],
  dual: [
    { position: [-0.75, 1.5, -1.2], width: 1.2, height: 0.8, curved: false },
    { position: [0.75, 1.5, -1.2], width: 1.2, height: 0.8, curved: false },
  ],
  triple: [
    { position: [-1.3, 1.5, -1.0], width: 1.0, height: 0.7, curved: false },
    { position: [0, 1.5, -1.3], width: 1.4, height: 0.9, curved: false },
    { position: [1.3, 1.5, -1.0], width: 1.0, height: 0.7, curved: false },
  ],
  cockpit: [
    { position: [0, 1.5, -1.5], width: 2.4, height: 0.9, curved: true, curveRadius: 2.0 },
    { position: [-1.2, 1.8, -0.8], width: 0.6, height: 0.4, curved: false },
    { position: [1.2, 1.8, -0.8], width: 0.6, height: 0.4, curved: false },
  ],
};

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const PanelSystemContext = createContext<
  (PanelSystemState & PanelSystemActions) | null
>(null);

export function usePanelSystem() {
  const ctx = useContext(PanelSystemContext);
  if (!ctx) throw new Error('usePanelSystem must be used within PanelSystemProvider');
  return ctx;
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function PanelSystemProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PanelSystemState>({
    panels: new Map(),
    activePanel: null,
    layout: 'single',
  });

  const addPanel = useCallback((panel: Omit<Panel, 'id'>) => {
    const id = `panel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setState((s) => {
      const panels = new Map(s.panels);
      panels.set(id, { ...panel, id });
      return { ...s, panels };
    });
    return id;
  }, []);

  const removePanel = useCallback((id: string) => {
    setState((s) => {
      const panels = new Map(s.panels);
      panels.delete(id);
      return {
        ...s,
        panels,
        activePanel: s.activePanel === id ? null : s.activePanel,
      };
    });
  }, []);

  const updatePanel = useCallback((id: string, updates: Partial<Panel>) => {
    setState((s) => {
      const panels = new Map(s.panels);
      const panel = panels.get(id);
      if (panel) {
        panels.set(id, { ...panel, ...updates });
      }
      return { ...s, panels };
    });
  }, []);

  const focusPanel = useCallback((id: string) => {
    setState((s) => {
      const panels = new Map(s.panels);
      panels.forEach((p, pId) => {
        panels.set(pId, { ...p, focused: pId === id });
      });
      return { ...s, panels, activePanel: id };
    });
  }, []);

  const unfocusPanel = useCallback((id: string) => {
    updatePanel(id, { focused: false });
  }, [updatePanel]);

  const movePanel = useCallback((id: string, position: Vector3) => {
    updatePanel(id, { position });
  }, [updatePanel]);

  const resizePanel = useCallback((id: string, width: number, height: number) => {
    updatePanel(id, { width, height });
  }, [updatePanel]);

  const applyLayout = useCallback((layout: PanelSystemState['layout']) => {
    const layoutConfig = LAYOUTS[layout];
    if (!layoutConfig) return;

    setState((s) => {
      const panels = new Map(s.panels);
      const panelIds = Array.from(panels.keys());

      layoutConfig.forEach((config, i) => {
        if (panelIds[i]) {
          const panel = panels.get(panelIds[i])!;
          panels.set(panelIds[i], {
            ...panel,
            position: new Vector3(...config.position),
            width: config.width,
            height: config.height,
            curved: config.curved || false,
            curveRadius: config.curveRadius || 0,
          });
        }
      });

      return { ...s, panels, layout };
    });
  }, []);

  return (
    <PanelSystemContext.Provider
      value={{
        ...state,
        addPanel,
        removePanel,
        updatePanel,
        focusPanel,
        unfocusPanel,
        movePanel,
        resizePanel,
        applyLayout,
      }}
    >
      {children}
    </PanelSystemContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Panel Component
// ─────────────────────────────────────────────────────────────

interface FloatingPanelProps {
  panel: Panel;
  onGrabStart?: (id: string, point: Vector3) => void;
  onGrabMove?: (id: string, point: Vector3, delta: Vector3) => void;
  onGrabEnd?: (id: string) => void;
}

export function FloatingPanel({
  panel,
  onGrabStart,
  onGrabMove,
  onGrabEnd,
}: FloatingPanelProps) {
  const { focusPanel } = usePanelSystem();

  // Focus animation
  const { scale, emissiveIntensity } = useSpring({
    scale: panel.focused ? 1.05 : 1,
    emissiveIntensity: panel.focused ? 0.1 : 0,
    config: { tension: 300, friction: 30 },
  });

  // Calculate look-at rotation
  const rotation = new Euler();
  const lookAtCenter = new Vector3(0, panel.position.y, 0);
  const quaternion = new Quaternion();
  const matrix = new THREE.Matrix4().lookAt(panel.position, lookAtCenter, new Vector3(0, 1, 0));
  quaternion.setFromRotationMatrix(matrix);
  rotation.setFromQuaternion(quaternion);

  return (
    <animated.group
      position={panel.position}
      rotation={rotation}
      scale={scale}
      onClick={() => focusPanel(panel.id)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onGrabStart?.(panel.id, e.point);
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) {
          onGrabMove?.(panel.id, e.point, new Vector3());
        }
      }}
      onPointerUp={() => onGrabEnd?.(panel.id)}
    >
      {/* Panel frame */}
      <mesh>
        <planeGeometry args={[panel.width + 0.02, panel.height + 0.02]} />
        <animated.meshStandardMaterial
          color="#1e1e2e"
          emissive="#4f46e5"
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.98}
        />
      </mesh>

      {/* Panel content */}
      <Html
        transform
        distanceFactor={1.5}
        position={[0, 0, 0.01]}
        style={{
          width: `${panel.width * 800}px`,
          height: `${panel.height * 800}px`,
          pointerEvents: 'auto',
        }}
        occlude="blending"
      >
        <div
          className="panel-content"
          style={{
            width: '100%',
            height: '100%',
            background: '#1e1e2e',
            borderRadius: '8px',
            overflow: 'auto',
            padding: '16px',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {panel.content}
        </div>
      </Html>

      {/* Resize handles (corners) */}
      {!panel.locked && (
        <>
          <ResizeHandle
            position={[panel.width / 2, -panel.height / 2, 0.02]}
            onResize={(delta) => {
              // Handle resize
            }}
          />
        </>
      )}
    </animated.group>
  );
}

function ResizeHandle({
  position,
  onResize,
}: {
  position: [number, number, number];
  onResize: (delta: Vector3) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      position={position}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial color={hovered ? '#4f46e5' : '#6b7280'} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// Panel System Renderer
// ─────────────────────────────────────────────────────────────

export function PanelSystemRenderer() {
  const { panels } = usePanelSystem();

  return (
    <group>
      {Array.from(panels.values()).map((panel) => (
        <FloatingPanel key={panel.id} panel={panel} />
      ))}
    </group>
  );
}
```

---

## Performance Monitor Component

```tsx
// src/components/spatial/productivity/PerformanceMonitor.tsx

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useXR } from '@react-three/xr';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  targetFps: number;
  isStable: boolean;
}

export function usePerformanceMonitor() {
  const { gl } = useThree();
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    targetFps: 90,
    isStable: true,
  });

  // Determine target FPS based on device
  useEffect(() => {
    const session = gl.xr.getSession();
    if (session) {
      // Quest 3 can do 120fps, Quest 2 does 72-90
      const frameRate = session.supportedFrameRates;
      if (frameRate) {
        const maxRate = Math.max(...frameRate);
        setMetrics((m) => ({ ...m, targetFps: maxRate }));
      }
    }
  }, [gl.xr]);

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Track frame times
    frameTimesRef.current.push(delta);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Calculate metrics every 30 frames
    if (frameTimesRef.current.length % 30 === 0) {
      const avgFrameTime =
        frameTimesRef.current.reduce((a, b) => a + b, 0) /
        frameTimesRef.current.length;
      const fps = 1000 / avgFrameTime;
      const info = gl.info;

      // Check stability (fps within 10% of target)
      const isStable = fps >= metrics.targetFps * 0.9;

      setMetrics({
        fps: Math.round(fps),
        frameTime: avgFrameTime,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        targetFps: metrics.targetFps,
        isStable,
      });
    }
  });

  return metrics;
}

// Visual debug panel
export function PerformancePanel({ visible = false }: { visible?: boolean }) {
  const metrics = usePerformanceMonitor();

  if (!visible) return null;

  const color = metrics.isStable ? '#22c55e' : '#ef4444';

  return (
    <group position={[-0.8, 1.8, -1]}>
      <mesh>
        <planeGeometry args={[0.3, 0.2]} />
        <meshBasicMaterial color="#1e1e2e" transparent opacity={0.9} />
      </mesh>

      <Text position={[0, 0.06, 0.01]} fontSize={0.02} color={color}>
        FPS: {metrics.fps} / {metrics.targetFps}
      </Text>
      <Text position={[0, 0.02, 0.01]} fontSize={0.015} color="white">
        Frame: {metrics.frameTime.toFixed(1)}ms
      </Text>
      <Text position={[0, -0.02, 0.01]} fontSize={0.015} color="white">
        Draw calls: {metrics.drawCalls}
      </Text>
      <Text position={[0, -0.06, 0.01]} fontSize={0.015} color="white">
        Triangles: {(metrics.triangles / 1000).toFixed(1)}k
      </Text>
    </group>
  );
}

// Adaptive quality hook
export function useAdaptiveQuality() {
  const metrics = usePerformanceMonitor();
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    const ratio = metrics.fps / metrics.targetFps;

    if (ratio < 0.7) {
      setQuality('low');
    } else if (ratio < 0.9) {
      setQuality('medium');
    } else {
      setQuality('high');
    }
  }, [metrics.fps, metrics.targetFps]);

  return quality;
}
```

---

## Wrist Menu Implementation

```tsx
// src/components/spatial/productivity/WristMenu.tsx

import { useState, useEffect } from 'react';
import { Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import { useHandGestures } from '../xr/useHandGestures';

interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface WristMenuProps {
  items: MenuItem[];
  hand?: 'left' | 'right';
  offset?: Vector3;
}

export function WristMenu({
  items,
  hand = 'left',
  offset = new Vector3(0, 0.1, 0),
}: WristMenuProps) {
  const handGestures = useHandGestures();
  const gesture = hand === 'left' ? handGestures.left : handGestures.right;

  const [isVisible, setIsVisible] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Detect menu gesture: palm facing user, hand flat (not pinching/grabbing)
  useFrame(() => {
    if (!gesture.isTracking) {
      setIsVisible(false);
      return;
    }

    // Palm must face user (negative Z in hand space)
    const isPalmFacingUser = gesture.palmDirection.z < -0.5;
    // Hand must be relatively flat (fingers not curled)
    const isHandFlat = gesture.fingerCurls.every((curl) => curl < 0.4);
    // Must not be actively pinching or grabbing
    const isIdle = !gesture.isPinching && !gesture.isGrabbing;

    setIsVisible(isPalmFacingUser && isHandFlat && isIdle);
  });

  // Animation
  const { scale, opacity } = useSpring({
    scale: isVisible ? 1 : 0.5,
    opacity: isVisible ? 1 : 0,
    config: { tension: 400, friction: 30 },
  });

  if (!gesture.isTracking) return null;

  const menuPosition = gesture.wristPosition.clone().add(offset);

  return (
    <animated.group
      position={menuPosition}
      quaternion={gesture.palmRotation}
      scale={scale}
    >
      {/* Menu background */}
      <mesh position={[0, items.length * 0.02, 0]}>
        <planeGeometry args={[0.14, items.length * 0.04 + 0.02]} />
        <animated.meshBasicMaterial
          color="#1e1e2e"
          transparent
          opacity={opacity.to((o) => o * 0.95)}
        />
      </mesh>

      {/* Menu items */}
      {items.map((item, i) => {
        const y = (items.length - 1 - i) * 0.04;
        const isHovered = hoveredItem === item.id;

        return (
          <group key={item.id} position={[0, y, 0.001]}>
            {/* Item background */}
            <mesh
              onPointerEnter={() => setHoveredItem(item.id)}
              onPointerLeave={() => setHoveredItem(null)}
              onClick={() => !item.disabled && item.onClick()}
            >
              <planeGeometry args={[0.12, 0.035]} />
              <meshBasicMaterial
                color={isHovered ? '#4f46e5' : '#374151'}
                transparent
                opacity={item.disabled ? 0.3 : 0.9}
              />
            </mesh>

            {/* Item icon */}
            {item.icon && (
              <Text
                position={[-0.045, 0, 0.001]}
                fontSize={0.018}
                color={item.disabled ? '#6b7280' : 'white'}
              >
                {item.icon}
              </Text>
            )}

            {/* Item label */}
            <Text
              position={[item.icon ? 0.01 : 0, 0, 0.001]}
              fontSize={0.014}
              color={item.disabled ? '#6b7280' : 'white'}
              anchorX={item.icon ? 'left' : 'center'}
            >
              {item.label}
            </Text>
          </group>
        );
      })}

      {/* Close hint */}
      <Text
        position={[0, -0.03, 0.001]}
        fontSize={0.01}
        color="#6b7280"
        anchorX="center"
      >
        Pinch to select
      </Text>
    </animated.group>
  );
}
```

---

## Usage Example: Complete Productivity Scene

```tsx
// src/scenes/ProductivityScene.tsx

import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { Environment } from '@react-three/drei';

import {
  PanelSystemProvider,
  PanelSystemRenderer,
  usePanelSystem,
} from '../components/spatial/productivity/FloatingPanelSystem';
import { useUnifiedInput } from '../xr/input/useUnifiedInput';
import { WristMenu } from '../components/spatial/productivity/WristMenu';
import { PerformancePanel } from '../components/spatial/productivity/PerformanceMonitor';
import { useSpatialModeStore } from '../state/useSpatialModeStore';

const xrStore = createXRStore({
  handTracking: true,
  hand: { teleportPointer: true },
  controller: { teleportPointer: true },
  frameRate: 'high',
  foveation: 1,
});

function ProductivityContent() {
  const { addPanel, applyLayout } = usePanelSystem();

  // Unified input handling
  const { mode } = useUnifiedInput({
    onIntent: (intent) => {
      console.log('Input intent:', intent);
      // Handle intents...
    },
  });

  // Wrist menu items
  const menuItems = [
    { id: 'layout-single', label: 'Single Panel', onClick: () => applyLayout('single') },
    { id: 'layout-dual', label: 'Dual Panels', onClick: () => applyLayout('dual') },
    { id: 'layout-cockpit', label: 'Cockpit', onClick: () => applyLayout('cockpit') },
    { id: 'add-panel', label: 'Add Panel', onClick: () => {
      addPanel({
        position: new Vector3(0, 1.5, -1.5),
        rotation: new Euler(),
        width: 1.2,
        height: 0.8,
        content: <div>New Panel</div>,
        curved: false,
        curveRadius: 0,
        zIndex: 0,
        locked: false,
        focused: false,
      });
    }},
  ];

  return (
    <>
      {/* Render all panels */}
      <PanelSystemRenderer />

      {/* Wrist menu */}
      <WristMenu items={menuItems} hand="left" />

      {/* Performance monitor (debug) */}
      <PerformancePanel visible={import.meta.env.DEV} />

      {/* VR environment */}
      <Environment preset="apartment" background />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
    </>
  );
}

export function ProductivityScene() {
  return (
    <>
      <button onClick={() => xrStore.enterVR()}>Enter VR</button>
      <button onClick={() => xrStore.enterAR()}>Enter AR</button>

      <Canvas>
        <XR store={xrStore}>
          <PanelSystemProvider>
            <ProductivityContent />
          </PanelSystemProvider>
        </XR>
      </Canvas>
    </>
  );
}
```

---

## Testing Checklist

Use this checklist when implementing VR productivity features:

- [ ] **Input works on Quest with controllers**
- [ ] **Input works on Quest with hand tracking**
- [ ] **Input works on Vision Pro (gaze+pinch)**
- [ ] **Panels readable at 1m distance**
- [ ] **Frame rate stays above 72fps**
- [ ] **Menu accessible without moving**
- [ ] **Grab/move feels responsive**
- [ ] **Focus animation provides feedback**
- [ ] **Works in both VR and AR modes**
- [ ] **Graceful fallback on unsupported devices**
