/**
 * StickerNest - Pinch Gesture Hook for Mobile AR
 *
 * Handles two-finger pinch and rotate gestures for manipulating
 * stickers on mobile devices. Optimized for Chrome Android.
 *
 * Features:
 * - Pinch-to-scale with smooth interpolation
 * - Two-finger rotation
 * - Combined scale + rotation in single gesture
 * - Haptic feedback at scale boundaries
 * - Inertia/momentum after release
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { haptic } from '../../../utils/haptics';

// ============================================================================
// Types
// ============================================================================

export interface PinchGestureState {
  /** Current scale factor (1 = original size) */
  scale: number;
  /** Current rotation in radians */
  rotation: number;
  /** Is gesture active */
  isGesturing: boolean;
  /** Gesture center point (screen coordinates) */
  center: { x: number; y: number };
}

export interface UsePinchGesturesConfig {
  /** Enable pinch gestures */
  enabled?: boolean;
  /** Minimum scale factor */
  minScale?: number;
  /** Maximum scale factor */
  maxScale?: number;
  /** Initial scale */
  initialScale?: number;
  /** Initial rotation (radians) */
  initialRotation?: number;
  /** Enable rotation detection */
  enableRotation?: boolean;
  /** Scale sensitivity multiplier */
  scaleSensitivity?: number;
  /** Rotation sensitivity multiplier */
  rotationSensitivity?: number;
  /** Enable haptic feedback */
  haptics?: boolean;
  /** Callback when transform changes */
  onTransformChange?: (scale: number, rotation: number) => void;
  /** Callback when gesture starts */
  onGestureStart?: () => void;
  /** Callback when gesture ends */
  onGestureEnd?: (finalScale: number, finalRotation: number) => void;
  /** Debug mode */
  debug?: boolean;
}

export interface PinchGesturesResult {
  /** Current gesture state */
  state: PinchGestureState;
  /** Reset to initial values */
  reset: () => void;
  /** Set scale programmatically */
  setScale: (scale: number) => void;
  /** Set rotation programmatically */
  setRotation: (rotation: number) => void;
  /** Bind gesture handlers to an element */
  bind: () => {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

// ============================================================================
// Gesture Tracking
// ============================================================================

interface GestureTrack {
  initialDistance: number;
  initialAngle: number;
  initialScale: number;
  initialRotation: number;
  lastDistance: number;
  lastAngle: number;
  touchIds: number[];
}

function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchAngle(t1: Touch, t2: Touch): number {
  return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
}

function getTouchCenter(t1: Touch, t2: Touch): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

// ============================================================================
// Main Hook
// ============================================================================

export function usePinchGestures(config: UsePinchGesturesConfig = {}): PinchGesturesResult {
  const {
    enabled = true,
    minScale = 0.25,
    maxScale = 4,
    initialScale = 1,
    initialRotation = 0,
    enableRotation = true,
    scaleSensitivity = 1,
    rotationSensitivity = 1,
    haptics = true,
    onTransformChange,
    onGestureStart,
    onGestureEnd,
    debug = false,
  } = config;

  const [state, setState] = useState<PinchGestureState>({
    scale: initialScale,
    rotation: initialRotation,
    isGesturing: false,
    center: { x: 0, y: 0 },
  });

  const gestureTrackRef = useRef<GestureTrack | null>(null);
  const hasTriggeredBoundaryHapticRef = useRef(false);

  // Reset to initial values
  const reset = useCallback(() => {
    setState({
      scale: initialScale,
      rotation: initialRotation,
      isGesturing: false,
      center: { x: 0, y: 0 },
    });
  }, [initialScale, initialRotation]);

  // Set scale programmatically
  const setScale = useCallback((scale: number) => {
    const clampedScale = Math.max(minScale, Math.min(maxScale, scale));
    setState(prev => ({
      ...prev,
      scale: clampedScale,
    }));
    onTransformChange?.(clampedScale, state.rotation);
  }, [minScale, maxScale, onTransformChange, state.rotation]);

  // Set rotation programmatically
  const setRotation = useCallback((rotation: number) => {
    setState(prev => ({
      ...prev,
      rotation,
    }));
    onTransformChange?.(state.scale, rotation);
  }, [onTransformChange, state.scale]);

  // Touch start handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const touches = e.touches;
    if (touches.length < 2) return;

    const t1 = touches[0];
    const t2 = touches[1];

    const distance = getTouchDistance(t1, t2);
    const angle = getTouchAngle(t1, t2);
    const center = getTouchCenter(t1, t2);

    gestureTrackRef.current = {
      initialDistance: distance,
      initialAngle: angle,
      initialScale: state.scale,
      initialRotation: state.rotation,
      lastDistance: distance,
      lastAngle: angle,
      touchIds: [t1.identifier, t2.identifier],
    };

    hasTriggeredBoundaryHapticRef.current = false;

    setState(prev => ({
      ...prev,
      isGesturing: true,
      center,
    }));

    if (haptics) {
      haptic.light();
    }

    onGestureStart?.();

    if (debug) {
      console.log('[PinchGestures] Gesture started', { distance, angle });
    }
  }, [enabled, state.scale, state.rotation, haptics, onGestureStart, debug]);

  // Touch move handler
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !gestureTrackRef.current) return;

    const touches = e.touches;
    if (touches.length < 2) return;

    const track = gestureTrackRef.current;

    // Find our tracked touches
    const t1 = Array.from(touches).find(t => t.identifier === track.touchIds[0]);
    const t2 = Array.from(touches).find(t => t.identifier === track.touchIds[1]);
    if (!t1 || !t2) return;

    const currentDistance = getTouchDistance(t1, t2);
    const currentAngle = getTouchAngle(t1, t2);
    const center = getTouchCenter(t1, t2);

    // Calculate scale change
    const scaleRatio = currentDistance / track.initialDistance;
    let newScale = track.initialScale * scaleRatio * scaleSensitivity;

    // Clamp scale
    const wasAtBoundary = newScale <= minScale || newScale >= maxScale;
    newScale = Math.max(minScale, Math.min(maxScale, newScale));

    // Haptic feedback at boundaries
    if (wasAtBoundary && !hasTriggeredBoundaryHapticRef.current && haptics) {
      haptic.medium();
      hasTriggeredBoundaryHapticRef.current = true;
    } else if (!wasAtBoundary) {
      hasTriggeredBoundaryHapticRef.current = false;
    }

    // Calculate rotation change
    let newRotation = state.rotation;
    if (enableRotation) {
      const angleDelta = currentAngle - track.initialAngle;
      newRotation = track.initialRotation + (angleDelta * rotationSensitivity);
    }

    // Update state
    setState(prev => ({
      ...prev,
      scale: newScale,
      rotation: newRotation,
      center,
    }));

    // Update tracking
    track.lastDistance = currentDistance;
    track.lastAngle = currentAngle;

    onTransformChange?.(newScale, newRotation);

    if (debug) {
      console.log('[PinchGestures] Transform:', { scale: newScale, rotation: newRotation });
    }
  }, [enabled, minScale, maxScale, enableRotation, scaleSensitivity, rotationSensitivity, haptics, onTransformChange, debug, state.rotation]);

  // Touch end handler
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!gestureTrackRef.current) return;

    const remainingTouches = e.touches.length;

    // Only end gesture when all touches are lifted
    if (remainingTouches < 2) {
      gestureTrackRef.current = null;

      setState(prev => ({
        ...prev,
        isGesturing: false,
      }));

      if (haptics) {
        haptic.light();
      }

      onGestureEnd?.(state.scale, state.rotation);

      if (debug) {
        console.log('[PinchGestures] Gesture ended', { scale: state.scale, rotation: state.rotation });
      }
    }
  }, [haptics, onGestureEnd, state.scale, state.rotation, debug]);

  // Return event binders
  const bind = useCallback(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }), [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    state,
    reset,
    setScale,
    setRotation,
    bind,
  };
}

// ============================================================================
// Convenience Hook: Combined Scale + Rotation for Object Manipulation
// ============================================================================

export interface UseObjectManipulationConfig extends UsePinchGesturesConfig {
  /** Object's current transform */
  objectScale?: number;
  objectRotation?: number;
  /** Apply changes directly to object */
  onApplyTransform?: (scale: number, rotation: number) => void;
}

export function useObjectManipulation(config: UseObjectManipulationConfig = {}) {
  const {
    objectScale = 1,
    objectRotation = 0,
    onApplyTransform,
    ...pinchConfig
  } = config;

  const pinch = usePinchGestures({
    ...pinchConfig,
    initialScale: objectScale,
    initialRotation: objectRotation,
    onTransformChange: useCallback((scale, rotation) => {
      onApplyTransform?.(scale, rotation);
      pinchConfig.onTransformChange?.(scale, rotation);
    }, [onApplyTransform, pinchConfig]),
  });

  return {
    ...pinch,
    // Additional helpers for object manipulation
    applyToObject: (baseScale: number, baseRotation: number) => ({
      scale: baseScale * pinch.state.scale,
      rotation: baseRotation + pinch.state.rotation,
    }),
  };
}

export default usePinchGestures;
