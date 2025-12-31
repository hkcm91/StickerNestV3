/**
 * StickerNest - SpatialWidgetContainer
 *
 * Renders 2D widgets in 3D space for VR/AR modes.
 * Each widget becomes a floating panel that can be grabbed, moved, and resized.
 *
 * Key features:
 * - Converts 2D canvas positions to 3D world coordinates
 * - Renders widget HTML as a texture on a 3D plane (via iframe capture)
 * - Supports grab interactions for repositioning
 * - Supports 3D rotation and Z-axis manipulation
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Text, Html, useCursor } from '@react-three/drei';
import { useXRInputSourceState, useXR } from '@react-three/xr';
import { Vector3, Euler, Quaternion, Mesh, Group } from 'three';
import type { WidgetInstance } from '../../types/domain';
import {
  toSpatialPosition,
  toSpatialSize,
  toSpatialRotation,
  PIXELS_PER_METER,
  DEFAULT_WIDGET_Z,
  DEFAULT_EYE_HEIGHT,
} from '../../utils/spatialCoordinates';
import { useActiveSpatialMode } from '../../state/useSpatialModeStore';
import { getBuiltinWidget } from '../../widgets/builtin';
import type { WidgetAPI } from '../../types/runtime';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get an emoji icon for a widget type based on its definition ID
 */
function getWidgetTypeEmoji(widgetDefId: string): string {
  const defLower = widgetDefId.toLowerCase();

  // Media widgets
  if (defLower.includes('image') || defLower.includes('photo')) return '🖼️';
  if (defLower.includes('video')) return '🎬';
  if (defLower.includes('audio') || defLower.includes('music')) return '🎵';
  if (defLower.includes('camera')) return '📷';

  // Social widgets
  if (defLower.includes('chat') || defLower.includes('message')) return '💬';
  if (defLower.includes('feed') || defLower.includes('post')) return '📰';
  if (defLower.includes('profile') || defLower.includes('user')) return '👤';
  if (defLower.includes('friend') || defLower.includes('social')) return '👥';
  if (defLower.includes('notification') || defLower.includes('alert')) return '🔔';

  // Commerce widgets
  if (defLower.includes('cart') || defLower.includes('shopping')) return '🛒';
  if (defLower.includes('product') || defLower.includes('store')) return '🏪';
  if (defLower.includes('payment') || defLower.includes('checkout')) return '💳';
  if (defLower.includes('grocery') || defLower.includes('food')) return '🥬';

  // Utility widgets
  if (defLower.includes('clock') || defLower.includes('time')) return '🕐';
  if (defLower.includes('weather')) return '🌤️';
  if (defLower.includes('calendar') || defLower.includes('date')) return '📅';
  if (defLower.includes('note') || defLower.includes('text')) return '📝';
  if (defLower.includes('list') || defLower.includes('todo')) return '📋';
  if (defLower.includes('chart') || defLower.includes('graph')) return '📊';
  if (defLower.includes('map') || defLower.includes('location')) return '🗺️';

  // Design widgets
  if (defLower.includes('color') || defLower.includes('palette')) return '🎨';
  if (defLower.includes('button')) return '🔘';
  if (defLower.includes('slider') || defLower.includes('range')) return '🎚️';
  if (defLower.includes('frame') || defLower.includes('container')) return '🖼️';

  // Default widget icon
  return '📦';
}

/**
 * Create a minimal WidgetAPI for 3D React component widgets.
 * This provides the essential API methods that widgets need.
 */
function createSpatial3DAPI(widget: WidgetInstance): WidgetAPI {
  return {
    widgetId: widget.id,
    widgetDefId: widget.widgetDefId,

    emitEvent: (event) => {
      console.log('[Spatial3DAPI] emitEvent:', event);
    },

    emitOutput: (port, data) => {
      console.log('[Spatial3DAPI] emitOutput:', port, data);
    },

    onEvent: (type, handler) => {
      // Return unsubscribe function
      return () => {};
    },

    onInput: (port, handler) => {
      // Return unsubscribe function
      return () => {};
    },

    getState: () => widget.state || {},

    setState: (patch) => {
      console.log('[Spatial3DAPI] setState:', patch);
      // In a full implementation, this would update widget state
    },

    getAssetUrl: (path) => path,

    log: (...args) => console.log(`[${widget.widgetDefId}]`, ...args),
    info: (...args) => console.info(`[${widget.widgetDefId}]`, ...args),
    warn: (...args) => console.warn(`[${widget.widgetDefId}]`, ...args),
    error: (...args) => console.error(`[${widget.widgetDefId}]`, ...args),
    debugLog: (...args) => console.debug(`[${widget.widgetDefId}]`, ...args),

    onMount: (callback: (context: { state: any }) => void) => {
      // Call immediately since we're already mounted
      callback({ state: widget.state || {} });
    },
  };
}

/**
 * Check if a widget should be rendered as a 3D React component
 */
function is3DReactWidget(widgetDefId: string): boolean {
  const builtin = getBuiltinWidget(widgetDefId);
  if (!builtin?.component) return false;

  // Check if manifest indicates 3D widget
  const manifest = builtin.manifest;
  return manifest?.kind === '3d' || manifest?.capabilities?.supports3d === true;
}

/**
 * Format widget definition ID for display
 */
function formatWidgetType(widgetDefId: string): string {
  // Remove common prefixes
  let formatted = widgetDefId
    .replace(/^widgets[-_]/, '')
    .replace(/^widget[-_]/, '')
    .replace(/[-_]/g, ' ');

  // Capitalize first letter of each word
  formatted = formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return formatted;
}

// ============================================================================
// Types
// ============================================================================

export interface SpatialWidgetProps {
  /** The widget instance data */
  widget: WidgetInstance;
  /** Whether this widget is selected */
  selected?: boolean;
  /** Called when widget is clicked */
  onClick?: (widget: WidgetInstance) => void;
  /** Called when widget position changes (in 3D space) */
  onPositionChange?: (widgetId: string, position: [number, number, number]) => void;
  /** Called when widget rotation changes (in 3D space) */
  onRotationChange?: (widgetId: string, rotation: [number, number, number]) => void;
  /** Called when widget scale changes */
  onScaleChange?: (widgetId: string, scale: number) => void;
  /** Z-offset in meters from default plane */
  zOffset?: number;
  /** Enable interaction (grab, resize) */
  interactive?: boolean;
  /** Show debug information */
  debug?: boolean;
}

interface SpatialWidgetContainerProps {
  /** Widget instances to render */
  widgets: WidgetInstance[];
  /** Currently selected widget ID */
  selectedWidgetId?: string;
  /** Called when a widget is selected */
  onWidgetSelect?: (widgetId: string) => void;
  /** Called when widget transforms change */
  onWidgetTransformChange?: (
    widgetId: string,
    transform: {
      position?: [number, number, number];
      rotation?: [number, number, number];
      scale?: number;
    }
  ) => void;
  /** Base Z position for all widgets */
  baseZ?: number;
  /** Enable interactions */
  interactive?: boolean;
  /** Show debug info */
  debug?: boolean;
  /** Force render even in desktop mode (for transitions) */
  forceRender?: boolean;
}

// ============================================================================
// Single Widget in 3D Space
// ============================================================================

function SpatialWidget({
  widget,
  selected = false,
  onClick,
  onPositionChange,
  onRotationChange,
  onScaleChange,
  zOffset = 0,
  interactive = true,
  debug = false,
}: SpatialWidgetProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const spatialMode = useActiveSpatialMode();
  // Check if in XR session (replaces deprecated isPresenting)
  const session = useXR((state) => state.session);
  const isPresenting = !!session;

  // Interaction state
  const [hovered, setHovered] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const [grabOffset, setGrabOffset] = useState<Vector3 | null>(null);

  // Cursor feedback
  useCursor(hovered && interactive);

  // Convert 2D position to 3D
  const position3D = useMemo((): [number, number, number] => {
    const basePos = toSpatialPosition(widget.position, DEFAULT_WIDGET_Z + zOffset);
    // Center the widget (2D origin is top-left, 3D is center)
    const size3D = toSpatialSize({ width: widget.width, height: widget.height });
    return [
      basePos[0] + size3D.width / 2,
      basePos[1] - size3D.height / 2,
      basePos[2],
    ];
  }, [widget.position, widget.width, widget.height, zOffset]);

  // Convert 2D size to 3D (meters)
  const size3D = useMemo(() => {
    return toSpatialSize({ width: widget.width, height: widget.height });
  }, [widget.width, widget.height]);

  // Convert rotation
  const rotation3D = useMemo(() => {
    return toSpatialRotation(widget.rotation || 0);
  }, [widget.rotation]);

  // Handle click
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick?.(widget);
    },
    [onClick, widget]
  );

  // Handle pointer down (start grab in VR)
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!interactive) return;
      e.stopPropagation();
      setGrabbed(true);
      // Calculate offset from grab point to widget center
      if (groupRef.current) {
        const offset = new Vector3().subVectors(
          new Vector3(...position3D),
          e.point
        );
        setGrabOffset(offset);
      }
    },
    [interactive, position3D]
  );

  // Handle pointer up (end grab)
  const handlePointerUp = useCallback(() => {
    if (grabbed && groupRef.current) {
      const newPos = groupRef.current.position;
      onPositionChange?.(widget.id, [newPos.x, newPos.y, newPos.z]);
    }
    setGrabbed(false);
    setGrabOffset(null);
  }, [grabbed, widget.id, onPositionChange]);

  // Frame update for grabbed widgets
  useFrame((state) => {
    if (!grabbed || !grabOffset || !groupRef.current) return;

    // In VR, follow the controller
    // In desktop, follow the mouse (raycaster)
    if (isPresenting) {
      // VR mode: use raycaster intersection point
      const intersects = state.raycaster.intersectObjects(state.scene.children, true);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        groupRef.current.position.set(
          point.x + grabOffset.x,
          point.y + grabOffset.y,
          point.z + grabOffset.z
        );
      }
    }
  });

  // Widget panel colors based on state
  const panelColor = selected ? '#6366f1' : hovered ? '#4c1d95' : '#1e1b4b';
  const borderColor = selected ? '#8b5cf6' : hovered ? '#7c3aed' : '#4c1d95';

  return (
    <group
      ref={groupRef}
      position={position3D}
      rotation={rotation3D}
    >
      {/* Main widget panel */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[size3D.width, size3D.height]} />
        <meshStandardMaterial
          color={panelColor}
          transparent
          opacity={0.95}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Selection border */}
      {(selected || hovered) && (
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[size3D.width + 0.02, size3D.height + 0.02]} />
          <meshBasicMaterial
            color={borderColor}
            transparent
            opacity={selected ? 0.8 : 0.4}
          />
        </mesh>
      )}

      {/* Check if this is a 3D React component widget - render actual content */}
      {is3DReactWidget(widget.widgetDefId) ? (
        <>
          {/* Render actual React component via Html */}
          <Html
            transform
            occlude
            distanceFactor={1}
            position={[0, 0, 0.01]}
            style={{
              width: `${widget.width}px`,
              height: `${widget.height}px`,
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: 8,
                background: 'rgba(20, 20, 30, 0.95)',
              }}
            >
              {/* Render the actual React component */}
              {(() => {
                const builtin = getBuiltinWidget(widget.widgetDefId);
                if (builtin?.component) {
                  const Component = builtin.component;
                  const api = createSpatial3DAPI(widget);
                  return <Component api={api} />;
                }
                return null;
              })()}
            </div>
          </Html>
        </>
      ) : (
        <>
          {/* Widget name label (for placeholder widgets) */}
          <Text
            position={[0, size3D.height / 2 + 0.05, 0.01]}
            fontSize={0.05}
            color="white"
            anchorX="center"
            anchorY="bottom"
            maxWidth={size3D.width}
          >
            {widget.name || widget.widgetDefId || 'Widget'}
          </Text>

          {/* Widget type icon and content preview */}
          <group position={[0, 0.05, 0.01]}>
            {/* Widget type icon background */}
            <mesh position={[0, 0, -0.002]}>
              <circleGeometry args={[0.08, 32]} />
              <meshBasicMaterial color="#8b5cf6" transparent opacity={0.8} />
            </mesh>
            {/* Widget type emoji/icon */}
            <Text
              position={[0, 0, 0]}
              fontSize={0.08}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {getWidgetTypeEmoji(widget.widgetDefId)}
            </Text>
          </group>

          {/* Widget definition ID */}
          <Text
            position={[0, -0.08, 0.01]}
            fontSize={0.05}
            color="#a5b4fc"
            anchorX="center"
            anchorY="middle"
            maxWidth={size3D.width * 0.9}
          >
            {formatWidgetType(widget.widgetDefId)}
          </Text>

          {/* Widget dimensions */}
          <Text
            position={[0, -0.18, 0.01]}
            fontSize={0.035}
            color="#6b7280"
            anchorX="center"
            anchorY="middle"
          >
            {Math.round(widget.width)} × {Math.round(widget.height)} px
          </Text>

          {/* Instance ID (smaller, for debugging) */}
          {debug && (
            <Text
              position={[0, -0.26, 0.01]}
              fontSize={0.025}
              color="#4b5563"
              anchorX="center"
              anchorY="middle"
            >
              ID: {widget.id.slice(0, 8)}...
            </Text>
          )}
        </>
      )}

      {/* Grab indicator (when being dragged) */}
      {grabbed && (
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry args={[0.08, 0.1, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Debug info */}
      {debug && (
        <Text
          position={[0, -size3D.height / 2 - 0.08, 0.01]}
          fontSize={0.03}
          color="#9ca3af"
          anchorX="center"
          anchorY="top"
        >
          {`pos: (${position3D[0].toFixed(2)}, ${position3D[1].toFixed(2)}, ${position3D[2].toFixed(2)})`}
        </Text>
      )}
    </group>
  );
}

// ============================================================================
// Main Container Component
// ============================================================================

export function SpatialWidgetContainer({
  widgets,
  selectedWidgetId,
  onWidgetSelect,
  onWidgetTransformChange,
  baseZ = DEFAULT_WIDGET_Z,
  interactive = true,
  debug = false,
  forceRender = false,
}: SpatialWidgetContainerProps) {
  const spatialMode = useActiveSpatialMode();

  // Filter to visible widgets only - MUST be before any conditional returns (React hooks rule)
  const visibleWidgets = useMemo(() => {
    return widgets.filter((w) => w.visible !== false);
  }, [widgets]);

  // Handle widget click - MUST be before any conditional returns
  const handleWidgetClick = useCallback(
    (widget: WidgetInstance) => {
      onWidgetSelect?.(widget.id);
    },
    [onWidgetSelect]
  );

  // Handle position change - MUST be before any conditional returns
  const handlePositionChange = useCallback(
    (widgetId: string, position: [number, number, number]) => {
      onWidgetTransformChange?.(widgetId, { position });
    },
    [onWidgetTransformChange]
  );

  // Handle rotation change - MUST be before any conditional returns
  const handleRotationChange = useCallback(
    (widgetId: string, rotation: [number, number, number]) => {
      onWidgetTransformChange?.(widgetId, { rotation });
    },
    [onWidgetTransformChange]
  );

  // Debug logging
  console.log('[SpatialWidgetContainer] State:', {
    spatialMode,
    forceRender,
    shouldRender: spatialMode !== 'desktop' || forceRender,
    totalWidgets: widgets.length,
    visibleWidgets: visibleWidgets.length,
    widgetNames: widgets.map(w => w.name || w.widgetDefId),
  });

  // Only render in VR/AR modes (or when forceRender is true for transitions)
  if (spatialMode === 'desktop' && !forceRender) {
    console.log('[SpatialWidgetContainer] Not rendering - desktop mode and forceRender=false');
    return null;
  }

  if (visibleWidgets.length === 0) {
    console.log('[SpatialWidgetContainer] Not rendering - no visible widgets');
    // Still render the info panel even if no widgets
  }

  return (
    <group name="spatial-widget-container">
      {visibleWidgets.map((widget, index) => (
        <SpatialWidget
          key={widget.id}
          widget={widget}
          selected={widget.id === selectedWidgetId}
          onClick={handleWidgetClick}
          onPositionChange={handlePositionChange}
          onRotationChange={handleRotationChange}
          zOffset={(index * 0.05)} // Slight Z offset to prevent z-fighting
          interactive={interactive}
          debug={debug}
        />
      ))}

      {/* Info panel showing widget count */}
      <group position={[-3, DEFAULT_EYE_HEIGHT, baseZ]}>
        <mesh>
          <planeGeometry args={[0.8, 0.3]} />
          <meshStandardMaterial color="#111827" transparent opacity={0.9} />
        </mesh>
        <Text
          position={[0, 0.05, 0.01]}
          fontSize={0.06}
          color="white"
          anchorX="center"
        >
          Widgets
        </Text>
        <Text
          position={[0, -0.05, 0.01]}
          fontSize={0.08}
          color="#8b5cf6"
          anchorX="center"
        >
          {visibleWidgets.length}
        </Text>
      </group>
    </group>
  );
}

export default SpatialWidgetContainer;
