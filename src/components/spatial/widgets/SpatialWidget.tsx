/**
 * StickerNest - SpatialWidget
 *
 * Renders a single widget as a 3D panel in VR/AR space.
 * Supports grab interactions, resize handles, and rotation.
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, useCursor } from '@react-three/drei';
import { useXR } from '@react-three/xr';
import { Vector3, Mesh, Group } from 'three';
import type { WidgetInstance } from '../../../types/domain';
import {
  toSpatialSize,
  toSpatialRotation,
  PIXELS_PER_METER,
  DEFAULT_WIDGET_Z,
  DEFAULT_EYE_HEIGHT,
} from '../../../utils/spatialCoordinates';
import { useActiveSpatialMode } from '../../../state/useSpatialModeStore';
import { Widget3DHandles, type HandleType } from '../xr/Widget3DHandles';
import { canRenderWidget, isReactWidget } from './spatialWidgetUtils';
import {
  getCachedWidgetHtml,
  getWidgetFetchStatus,
  fetchAndCacheWidgetHtml,
} from './vrWidgetHtmlCache';
import { WidgetPlaceholder, WidgetHtmlContent } from './SpatialWidgetContent';
import { VRWidgetTexture, VRReactWidgetTexture } from './VRWidgetTexture';

// ============================================================================
// Types
// ============================================================================

export interface SpatialWidgetProps {
  widget: WidgetInstance;
  selected?: boolean;
  onClick?: (widget: WidgetInstance) => void;
  onPositionChange?: (widgetId: string, position: [number, number, number]) => void;
  onRotationChange?: (widgetId: string, rotation: [number, number, number]) => void;
  onScaleChange?: (widgetId: string, scale: number) => void;
  onSizeChange?: (widgetId: string, width: number, height: number) => void;
  zOffset?: number;
  interactive?: boolean;
  debug?: boolean;
  accentColor?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function SpatialWidget({
  widget,
  selected = false,
  onClick,
  onPositionChange,
  onRotationChange,
  onScaleChange,
  onSizeChange,
  zOffset = 0,
  interactive = true,
  debug = false,
  accentColor = '#8b5cf6',
}: SpatialWidgetProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const spatialMode = useActiveSpatialMode();
  const session = useXR((state) => state.session);
  const isPresenting = !!session;

  // Interaction state
  const [hovered, setHovered] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const [grabOffset, setGrabOffset] = useState<Vector3 | null>(null);

  // Resize state
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Rotation state
  const [additionalRotation, setAdditionalRotation] = useState(0);

  // HTML loading state
  const [htmlLoadState, setHtmlLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [, forceUpdate] = useState({});

  // Fetch HTML for local widgets
  useEffect(() => {
    const source = widget.metadata?.source;
    if (source !== 'local') return;

    const cached = getCachedWidgetHtml(widget.widgetDefId);
    if (cached) {
      setHtmlLoadState('loaded');
      return;
    }

    const status = getWidgetFetchStatus(widget.widgetDefId);
    if (status === 'success') {
      setHtmlLoadState('loaded');
      return;
    }
    if (status === 'error') {
      setHtmlLoadState('error');
      return;
    }

    setHtmlLoadState('loading');
    fetchAndCacheWidgetHtml(widget.widgetDefId, source).then((html) => {
      if (html) {
        setHtmlLoadState('loaded');
        forceUpdate({});
      } else {
        setHtmlLoadState('error');
      }
    });
  }, [widget.widgetDefId, widget.metadata?.source]);

  useCursor(hovered && interactive);

  // Calculate 3D position from 2D canvas position
  const position3D = useMemo((): [number, number, number] => {
    const rawX = widget.position.x / PIXELS_PER_METER;
    const rawY = widget.position.y / PIXELS_PER_METER;

    const maxSpreadX = 3;
    const maxSpreadY = 1.5;

    const normalizedX = Math.min(1, rawX / 19.2);
    const normalizedY = Math.min(1, rawY / 10.8);

    const arcX = (normalizedX - 0.5) * 2 * maxSpreadX;
    const arcY = DEFAULT_EYE_HEIGHT - (normalizedY - 0.5) * maxSpreadY;

    const baseZ = DEFAULT_WIDGET_Z + zOffset;
    const curveAmount = 0.5;
    const curvedZ = baseZ - (Math.abs(arcX) / maxSpreadX) * curveAmount;

    const size3D = toSpatialSize({ width: widget.width, height: widget.height });

    return [arcX + size3D.width / 2, arcY - size3D.height / 2, curvedZ];
  }, [widget.position, widget.width, widget.height, zOffset]);

  // Convert 2D size to 3D
  const size3D = useMemo(() => {
    if (isResizing && liveSize) {
      return { width: liveSize.width, height: liveSize.height };
    }
    return toSpatialSize({ width: widget.width, height: widget.height });
  }, [widget.width, widget.height, isResizing, liveSize]);

  // Calculate rotation to face user
  const rotation3D = useMemo((): [number, number, number] => {
    const widgetX = position3D[0];
    const widgetZ = position3D[2];
    const facingAngleY = Math.atan2(-widgetX, -widgetZ);
    const existingRotation = toSpatialRotation(widget.rotation || 0);
    return [existingRotation[0], facingAngleY, existingRotation[2] + additionalRotation];
  }, [widget.rotation, position3D, additionalRotation]);

  // Resize handlers
  const handleResizeStart = useCallback((handle: HandleType) => {
    setIsResizing(true);
    setLiveSize({ width: size3D.width, height: size3D.height });
  }, [size3D.width, size3D.height]);

  const handleResize = useCallback((newWidth: number, newHeight: number, handle: HandleType) => {
    setLiveSize({ width: newWidth, height: newHeight });
  }, []);

  const handleResizeEnd = useCallback(() => {
    if (liveSize) {
      const widthPx = liveSize.width * PIXELS_PER_METER;
      const heightPx = liveSize.height * PIXELS_PER_METER;
      onSizeChange?.(widget.id, widthPx, heightPx);
    }
    setIsResizing(false);
    setLiveSize(null);
  }, [liveSize, widget.id, onSizeChange]);

  // Rotation handlers
  const handleRotateStart = useCallback(() => {}, []);

  const handleRotate = useCallback((angleDelta: number) => {
    setAdditionalRotation(prev => prev + angleDelta);
  }, []);

  const handleRotateEnd = useCallback(() => {
    if (additionalRotation !== 0) {
      const currentRotationDeg = widget.rotation || 0;
      const additionalDeg = (additionalRotation * 180) / Math.PI;
      const newRotationDeg = currentRotationDeg + additionalDeg;
      onRotationChange?.(widget.id, [0, rotation3D[1], newRotationDeg]);
    }
    setAdditionalRotation(0);
  }, [additionalRotation, widget.id, widget.rotation, rotation3D, onRotationChange]);

  // Interaction handlers
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    console.log('[SpatialWidget] CLICK:', widget.id, widget.name);
    onClick?.(widget);
  }, [onClick, widget]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    setGrabbed(true);
    if (groupRef.current) {
      const offset = new Vector3().subVectors(new Vector3(...position3D), e.point);
      setGrabOffset(offset);
    }
  }, [interactive, position3D]);

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

    if (isPresenting) {
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

  const panelColor = selected ? '#6366f1' : hovered ? '#4c1d95' : '#1e1b4b';
  const borderColor = selected ? '#8b5cf6' : hovered ? '#7c3aed' : '#4c1d95';
  const canRender = canRenderWidget(widget);

  return (
    <group ref={groupRef} position={position3D} rotation={rotation3D}>
      {/* Main widget panel */}
      {/* CRITICAL: pointerEventsType="all" is required for @react-three/xr v6 */}
      {/* Without it, ray pointer events from controllers won't reach this mesh */}
      <mesh
        ref={meshRef}
        name={`widget-interactive-${widget.id}`}
        onClick={handleClick}
        onPointerEnter={() => {
          setHovered(true);
          console.log('[SpatialWidget] Pointer ENTER:', widget.id, widget.name);
        }}
        onPointerLeave={() => {
          setHovered(false);
          console.log('[SpatialWidget] Pointer LEAVE:', widget.id);
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        pointerEventsType="all"
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

      {/* Hover border */}
      {hovered && !selected && (
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[size3D.width + 0.02, size3D.height + 0.02]} />
          <meshBasicMaterial color={borderColor} transparent opacity={0.4} />
        </mesh>
      )}

      {/* 3D Resize/Rotate handles */}
      <Widget3DHandles
        width={size3D.width}
        height={size3D.height}
        selected={selected}
        interactive={interactive}
        accentColor={accentColor}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
        onRotateStart={handleRotateStart}
        onRotate={handleRotate}
        onRotateEnd={handleRotateEnd}
      />

      {/* Widget content - texture in VR, Html in desktop preview */}
      {canRender ? (
        isPresenting ? (
          // VR mode: render widget content to a texture
          // Use VRReactWidgetTexture for React components, VRWidgetTexture for HTML
          isReactWidget(widget.widgetDefId) ? (
            <VRReactWidgetTexture
              widget={widget}
              width={size3D.width}
              height={size3D.height}
              refreshInterval={2000}
            />
          ) : (
            <VRWidgetTexture
              widget={widget}
              width={size3D.width}
              height={size3D.height}
              refreshInterval={2000}
            />
          )
        ) : (
          // Desktop mode: use Html overlay
          <WidgetHtmlContent widget={widget} htmlLoadState={htmlLoadState} />
        )
      ) : (
        // Fallback placeholder for widgets that can't render
        <WidgetPlaceholder widget={widget} size3D={size3D} debug={debug} />
      )}

      {/* Grab indicator */}
      {grabbed && (
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry args={[0.08, 0.1, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Debug info */}
      {debug && (
        <>
          <Text
            position={[0, -size3D.height / 2 - 0.08, 0.01]}
            fontSize={0.03}
            color="#9ca3af"
            anchorX="center"
            anchorY="top"
          >
            {`pos: (${position3D[0].toFixed(2)}, ${position3D[1].toFixed(2)}, ${position3D[2].toFixed(2)})`}
          </Text>
          <Text
            position={[0, -size3D.height / 2 - 0.14, 0.01]}
            fontSize={0.025}
            color={htmlLoadState === 'error' ? '#f87171' : htmlLoadState === 'loaded' ? '#22c55e' : '#fbbf24'}
            anchorX="center"
            anchorY="top"
          >
            {`source: ${widget.metadata?.source || 'unknown'} | html: ${htmlLoadState}`}
          </Text>
        </>
      )}
    </group>
  );
}

export default SpatialWidget;
