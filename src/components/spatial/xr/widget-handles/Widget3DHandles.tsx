/**
 * Widget 3D Handles - Main Orchestrator Component
 *
 * Industry-standard VR widget manipulation handles with:
 * - Corner/edge handles for resize
 * - Rotation handle with snap angles
 * - Depth handle for Z-axis push/pull
 * - Two-handed pinch-to-zoom
 * - XR controller haptics
 * - Snap-to-grid support
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// Types
import type { Widget3DHandlesProps, HandleType, DragState, ManipulationState } from './types';
import { HANDLE_CONSTANTS } from './types';

// Hooks
import { useXRHaptics } from './hooks/useXRHaptics';
import { useTwoHandedGesture } from './hooks/useTwoHandedGesture';

// Utilities
import {
  applyGridSnap,
  applyAngleSnap,
  calculateAspectLockedSize,
  clampSize,
  clampDepth,
} from './utils/snapUtils';
import {
  getCornerPositions,
  getEdgePositions,
  getRotationHandlePosition,
  getDepthHandlePosition,
  getSizeIndicatorPosition,
  calculateResizeFromDrag,
} from './utils/geometryUtils';

// Handle Components
import {
  CornerHandle,
  EdgeHandle,
  RotationHandle,
  DepthHandle,
  SelectionBorder,
  TwoHandIndicator,
  SizeIndicator,
} from './handles';

const { MIN_SIZE, MAX_SIZE, MIN_DEPTH, MAX_DEPTH, ROTATION_OFFSET } = HANDLE_CONSTANTS;

export function Widget3DHandles({
  width,
  height,
  depth = 1,
  selected,
  interactive = true,
  accentColor = '#8b5cf6',
  enableHaptics = true,
  enableTwoHanded = true,
  snapToGrid = true,
  gridSize = 0.05,
  snapAngles = true,
  snapAngleIncrement = 15,
  lockAspectRatio = false,
  onResizeStart,
  onResize,
  onResizeEnd,
  onRotateStart,
  onRotate,
  onRotateEnd,
  onDepthChange,
  onMoveStart,
  onMove,
  onMoveEnd,
  onTwoHandedScale,
  onToggleAspectLock,
  zOffset = 0.01,
}: Widget3DHandlesProps) {
  // Manipulation state
  const [state, setState] = useState<ManipulationState>({
    activeHandle: null,
    isHovering: false,
    isSnapped: false,
    twoHandScale: 1,
    twoHandRotation: 0,
  });

  // Drag tracking refs
  const dragRef = useRef<DragState>({
    startPoint: null,
    initialSize: null,
    initialRotation: 0,
    initialDepth: depth,
    aspectRatio: width / height,
  });

  const { triggerPreset } = useXRHaptics({ enabled: enableHaptics });

  // Two-handed gesture handling
  const twoHandedResult = useTwoHandedGesture({
    enabled: enableTwoHanded && selected && !state.activeHandle,
    initialWidth: width,
    initialHeight: height,
    onScaleChange: (scaleFactor) => {
      setState(s => ({ ...s, twoHandScale: scaleFactor }));
      onTwoHandedScale?.(scaleFactor);
    },
    onRotationChange: (angleDelta) => {
      setState(s => ({ ...s, twoHandRotation: s.twoHandRotation + angleDelta }));
      onRotate?.(angleDelta);
    },
    onStart: () => {
      dragRef.current.initialSize = { width, height };
    },
    onEnd: (finalScale, finalRotation) => {
      if (dragRef.current.initialSize) {
        const newWidth = dragRef.current.initialSize.width * finalScale;
        const newHeight = dragRef.current.initialSize.height * finalScale;
        const clamped = clampSize(newWidth, newHeight);
        onResize?.(clamped.width, clamped.height, 'two-hand');
        onResizeEnd?.();
      }
      setState(s => ({ ...s, twoHandScale: 1, twoHandRotation: 0 }));
    },
  });

  // Don't render if not selected
  if (!selected) return null;

  // Calculate handle positions
  const cornerPositions = useMemo(
    () => getCornerPositions(width, height, zOffset),
    [width, height, zOffset]
  );

  const edgePositions = useMemo(
    () => getEdgePositions(width, height, zOffset),
    [width, height, zOffset]
  );

  const rotationPosition = useMemo(
    () => getRotationHandlePosition(height, zOffset),
    [height, zOffset]
  );

  const depthPosition = useMemo(
    () => getDepthHandlePosition(width, zOffset),
    [width, zOffset]
  );

  const sizeIndicatorPosition = useMemo(
    () => getSizeIndicatorPosition(height, zOffset),
    [height, zOffset]
  );

  const handleColor = '#ffffff';

  // ========== Resize Handlers ==========

  const handleResizeDragStart = useCallback((type: HandleType, point: THREE.Vector3) => {
    if (!interactive) return;
    setState(s => ({ ...s, activeHandle: type }));
    dragRef.current = {
      startPoint: point.clone(),
      initialSize: { width, height },
      initialRotation: 0,
      initialDepth: depth,
      aspectRatio: width / height,
    };
    onResizeStart?.(type);
  }, [interactive, width, height, depth, onResizeStart]);

  const handleResizeDrag = useCallback((point: THREE.Vector3) => {
    const { activeHandle } = state;
    const { startPoint, initialSize, aspectRatio } = dragRef.current;

    if (!activeHandle || !startPoint || !initialSize) return;

    const delta = point.clone().sub(startPoint);
    const isCorner = activeHandle.startsWith('corner');

    let newSize: { width: number; height: number };

    // Lock aspect ratio for corner handles if enabled
    if (lockAspectRatio && isCorner) {
      newSize = calculateAspectLockedSize(
        delta.x,
        delta.y,
        initialSize.width,
        initialSize.height,
        aspectRatio
      );
    } else {
      newSize = calculateResizeFromDrag(
        activeHandle,
        delta,
        initialSize.width,
        initialSize.height
      );
    }

    // Apply grid snapping
    let snapped = false;
    if (snapToGrid) {
      const snappedWidth = applyGridSnap(newSize.width, gridSize);
      const snappedHeight = applyGridSnap(newSize.height, gridSize);

      if (snappedWidth.snapped || snappedHeight.snapped) {
        snapped = true;
        if (!state.isSnapped) {
          triggerPreset('both', 'snap');
        }
      }

      newSize.width = snappedWidth.value;
      newSize.height = snappedHeight.value;
    }

    setState(s => ({ ...s, isSnapped: snapped }));

    // Clamp and emit
    const clamped = clampSize(newSize.width, newSize.height);
    onResize?.(clamped.width, clamped.height, activeHandle);
  }, [state, lockAspectRatio, snapToGrid, gridSize, triggerPreset, onResize]);

  const handleResizeDragEnd = useCallback(() => {
    setState(s => ({ ...s, activeHandle: null, isSnapped: false }));
    dragRef.current.startPoint = null;
    dragRef.current.initialSize = null;
    onResizeEnd?.();
  }, [onResizeEnd]);

  // ========== Rotation Handlers ==========

  const handleRotationDragStart = useCallback((point: THREE.Vector3) => {
    if (!interactive) return;
    setState(s => ({ ...s, activeHandle: 'rotate' }));
    dragRef.current.startPoint = point.clone();
    dragRef.current.initialRotation = Math.atan2(point.x, point.y);
    onRotateStart?.();
  }, [interactive, onRotateStart]);

  const handleRotationDrag = useCallback((point: THREE.Vector3) => {
    const { activeHandle } = state;
    const { initialRotation } = dragRef.current;

    if (activeHandle !== 'rotate') return;

    const currentAngle = Math.atan2(point.x, point.y);
    let angleDelta = currentAngle - initialRotation;

    // Apply angle snapping
    let snapped = false;
    if (snapAngles) {
      const result = applyAngleSnap(angleDelta, snapAngleIncrement);

      if (result.snapped && !state.isSnapped) {
        triggerPreset('both', 'snap');
      }

      snapped = result.snapped;
      angleDelta = result.angle;
    }

    setState(s => ({ ...s, isSnapped: snapped }));
    dragRef.current.initialRotation = currentAngle;
    onRotate?.(angleDelta);
  }, [state, snapAngles, snapAngleIncrement, triggerPreset, onRotate]);

  const handleRotationDragEnd = useCallback(() => {
    setState(s => ({ ...s, activeHandle: null, isSnapped: false }));
    dragRef.current.startPoint = null;
    onRotateEnd?.();
  }, [onRotateEnd]);

  // ========== Depth Handlers ==========

  const handleDepthDragStart = useCallback((point: THREE.Vector3) => {
    if (!interactive) return;
    setState(s => ({ ...s, activeHandle: 'depth' }));
    dragRef.current.startPoint = point.clone();
    dragRef.current.initialDepth = depth;
  }, [interactive, depth]);

  const handleDepthDrag = useCallback((point: THREE.Vector3) => {
    const { activeHandle } = state;
    const { startPoint, initialDepth } = dragRef.current;

    if (activeHandle !== 'depth' || !startPoint) return;

    // Use Z delta for depth change
    const delta = point.z - startPoint.z;
    const newDepth = clampDepth(initialDepth + delta);
    onDepthChange?.(newDepth - initialDepth);
  }, [state, onDepthChange]);

  const handleDepthDragEnd = useCallback(() => {
    setState(s => ({ ...s, activeHandle: null }));
    dragRef.current.startPoint = null;
  }, []);

  // ========== Hover Handler ==========

  const handleHover = useCallback((hovered: boolean) => {
    setState(s => ({ ...s, isHovering: hovered }));
  }, []);

  // ========== Double-tap for aspect lock toggle ==========

  const handleCornerDoubleTap = useCallback(() => {
    onToggleAspectLock?.();
  }, [onToggleAspectLock]);

  return (
    <group>
      {/* Selection border */}
      <SelectionBorder
        width={width}
        height={height}
        color={accentColor}
        zOffset={zOffset - 0.001}
        isSnapped={state.isSnapped}
      />

      {/* Two-handed manipulation indicator */}
      <TwoHandIndicator
        active={twoHandedResult.isActive}
        scaleFactor={state.twoHandScale}
        rotationDelta={state.twoHandRotation}
        accentColor={accentColor}
      />

      {/* Corner handles */}
      {cornerPositions.map(({ type, position }) => (
        <CornerHandle
          key={type}
          position={position}
          type={type}
          color={handleColor}
          accentColor={accentColor}
          enableHaptics={enableHaptics}
          onDragStart={handleResizeDragStart}
          onDrag={handleResizeDrag}
          onDragEnd={handleResizeDragEnd}
          onHover={handleHover}
          onDoubleTap={handleCornerDoubleTap}
        />
      ))}

      {/* Edge handles */}
      {edgePositions.map(({ type, position, rotation }) => (
        <EdgeHandle
          key={type}
          position={position}
          rotation={rotation}
          type={type}
          color={handleColor}
          accentColor={accentColor}
          enableHaptics={enableHaptics}
          onDragStart={handleResizeDragStart}
          onDrag={handleResizeDrag}
          onDragEnd={handleResizeDragEnd}
          onHover={handleHover}
        />
      ))}

      {/* Rotation handle */}
      <RotationHandle
        position={rotationPosition}
        color={handleColor}
        accentColor={accentColor}
        enableHaptics={enableHaptics}
        snapEnabled={snapAngles}
        snapIncrement={snapAngleIncrement}
        onDragStart={handleRotationDragStart}
        onDrag={handleRotationDrag}
        onDragEnd={handleRotationDragEnd}
        onHover={handleHover}
      />

      {/* Depth handle (Z-axis) */}
      {onDepthChange && (
        <DepthHandle
          position={depthPosition}
          color={handleColor}
          accentColor={accentColor}
          enableHaptics={enableHaptics}
          onDragStart={handleDepthDragStart}
          onDrag={handleDepthDrag}
          onDragEnd={handleDepthDragEnd}
          onHover={handleHover}
        />
      )}

      {/* Size/state indicator */}
      <SizeIndicator
        position={sizeIndicatorPosition}
        width={width}
        height={height}
        activeHandle={state.activeHandle}
        isTwoHandActive={twoHandedResult.isActive}
        twoHandScale={state.twoHandScale}
        isSnapped={state.isSnapped}
        accentColor={accentColor}
      />

      {/* Aspect ratio lock indicator */}
      {lockAspectRatio && state.activeHandle?.startsWith('corner') && (
        <Text
          position={[0, height / 2 + 0.03, zOffset]}
          fontSize={0.02}
          color={accentColor}
          anchorX="center"
          anchorY="middle"
        >
          Locked
        </Text>
      )}
    </group>
  );
}

export default Widget3DHandles;
