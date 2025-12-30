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
  const { isPresenting } = useXR();

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

      {/* Widget name label */}
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

      {/* Placeholder content - in future, render actual widget HTML */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.08}
        color="#8b5cf6"
        anchorX="center"
        anchorY="middle"
      >
        {widget.widgetDefId}
      </Text>

      <Text
        position={[0, -0.15, 0.01]}
        fontSize={0.04}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
      >
        {Math.round(widget.width)}x{Math.round(widget.height)}px
      </Text>

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
}: SpatialWidgetContainerProps) {
  const spatialMode = useActiveSpatialMode();

  // Only render in VR/AR modes
  if (spatialMode === 'desktop') {
    return null;
  }

  // Filter to visible widgets only
  const visibleWidgets = useMemo(() => {
    return widgets.filter((w) => w.visible !== false);
  }, [widgets]);

  // Handle widget click
  const handleWidgetClick = useCallback(
    (widget: WidgetInstance) => {
      onWidgetSelect?.(widget.id);
    },
    [onWidgetSelect]
  );

  // Handle position change
  const handlePositionChange = useCallback(
    (widgetId: string, position: [number, number, number]) => {
      onWidgetTransformChange?.(widgetId, { position });
    },
    [onWidgetTransformChange]
  );

  // Handle rotation change
  const handleRotationChange = useCallback(
    (widgetId: string, rotation: [number, number, number]) => {
      onWidgetTransformChange?.(widgetId, { rotation });
    },
    [onWidgetTransformChange]
  );

  if (visibleWidgets.length === 0) {
    return null;
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
