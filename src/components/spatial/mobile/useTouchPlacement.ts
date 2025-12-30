/**
 * StickerNest - Touch-based Sticker Placement Hook
 *
 * Enables placing stickers via touch on mobile devices.
 * Works with both WebXR AR (hit-test) and fallback touch modes.
 *
 * Features:
 * - Tap-to-place stickers on detected surfaces
 * - Touch-and-hold for placement preview
 * - Drag to adjust position before confirming
 * - Haptic feedback on Chrome Android
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { Vector3, Quaternion, Raycaster, Plane, Camera } from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useXR, useXRHitTest } from '@react-three/xr';
import { haptic } from '../../../utils/haptics';
import { useMobileAR } from './useMobileAR';

// ============================================================================
// Types
// ============================================================================

export interface TouchPlacementResult {
  position: Vector3;
  rotation: Quaternion;
  normal: Vector3;
  isOnSurface: boolean;
  surfaceType: 'horizontal' | 'vertical' | 'unknown';
}

export interface UseTouchPlacementConfig {
  /** Enable touch placement */
  enabled?: boolean;
  /** Fixed height above detected surface (meters) */
  heightOffset?: number;
  /** Callback when placement position updates */
  onPositionUpdate?: (result: TouchPlacementResult | null) => void;
  /** Callback when user confirms placement */
  onPlace?: (result: TouchPlacementResult) => void;
  /** Callback when user cancels placement */
  onCancel?: () => void;
  /** Enable haptic feedback */
  haptics?: boolean;
  /** Placement mode */
  mode?: 'tap' | 'hold-and-drag' | 'continuous';
  /** Debug mode */
  debug?: boolean;
}

export interface TouchPlacementState {
  /** Is placement active */
  isPlacing: boolean;
  /** Current placement preview position */
  previewPosition: TouchPlacementResult | null;
  /** Is user currently touching */
  isTouching: boolean;
  /** Confirm current placement */
  confirmPlacement: () => void;
  /** Cancel current placement */
  cancelPlacement: () => void;
  /** Start placement mode */
  startPlacement: () => void;
  /** Stop placement mode */
  stopPlacement: () => void;
}

// ============================================================================
// Touch State Tracking
// ============================================================================

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  identifier: number;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useTouchPlacement(config: UseTouchPlacementConfig = {}): TouchPlacementState {
  const {
    enabled = true,
    heightOffset = 0.02,
    onPositionUpdate,
    onPlace,
    onCancel,
    haptics = true,
    mode = 'tap',
    debug = false,
  } = config;

  const { camera, gl } = useThree();
  const { isPresenting, session } = useXR();
  const arCapabilities = useMobileAR();

  const [isPlacing, setIsPlacing] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<TouchPlacementResult | null>(null);

  const touchStateRef = useRef<TouchState | null>(null);
  const raycasterRef = useRef(new Raycaster());
  const groundPlaneRef = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const lastHitResultRef = useRef<TouchPlacementResult | null>(null);

  // WebXR Hit Test (Chrome Android with ARCore)
  useXRHitTest(
    (results, frame) => {
      if (!enabled || !isPlacing || !isPresenting) return;

      if (results.length > 0) {
        const hit = results[0];
        // Get pose relative to reference space
        const referenceSpace = frame.session.requestReferenceSpace?.('local-floor');
        if (!referenceSpace) return;

        // In @react-three/xr v6, we need to handle the pose differently
        try {
          const pose = hit.getPose(frame);
          if (pose) {
            const matrix = pose.transform.matrix;
            const position = new Vector3(matrix[12], matrix[13] + heightOffset, matrix[14]);

            // Extract rotation from matrix
            const rotation = new Quaternion().setFromRotationMatrix({
              elements: matrix,
            } as any);

            // Estimate surface normal (up for horizontal, forward for vertical)
            const normal = new Vector3(0, 1, 0).applyQuaternion(rotation);
            const isHorizontal = Math.abs(normal.y) > 0.7;

            const result: TouchPlacementResult = {
              position,
              rotation,
              normal,
              isOnSurface: true,
              surfaceType: isHorizontal ? 'horizontal' : 'vertical',
            };

            lastHitResultRef.current = result;
            setPreviewPosition(result);
            onPositionUpdate?.(result);
          }
        } catch {
          // Hit test failed, ignore
        }
      }
    },
    'viewer',
    'plane'
  );

  // Fallback touch raycasting (non-WebXR)
  const handleTouchRaycast = useCallback((x: number, y: number) => {
    if (isPresenting) return; // Use WebXR hit test instead

    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();

    // Normalize coordinates
    const normalizedX = ((x - rect.left) / rect.width) * 2 - 1;
    const normalizedY = -((y - rect.top) / rect.height) * 2 + 1;

    // Cast ray from touch point
    raycasterRef.current.setFromCamera({ x: normalizedX, y: normalizedY }, camera as Camera);

    // Intersect with ground plane
    const intersection = new Vector3();
    const ray = raycasterRef.current.ray;

    if (ray.intersectPlane(groundPlaneRef.current, intersection)) {
      const result: TouchPlacementResult = {
        position: intersection.add(new Vector3(0, heightOffset, 0)),
        rotation: new Quaternion(),
        normal: new Vector3(0, 1, 0),
        isOnSurface: true,
        surfaceType: 'horizontal',
      };

      lastHitResultRef.current = result;
      setPreviewPosition(result);
      onPositionUpdate?.(result);
    }
  }, [camera, gl, isPresenting, heightOffset, onPositionUpdate]);

  // Touch event handlers
  useEffect(() => {
    if (!enabled || !isPlacing) return;

    const canvas = gl.domElement;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now(),
        identifier: touch.identifier,
      };

      setIsTouching(true);

      if (mode === 'continuous' || mode === 'hold-and-drag') {
        handleTouchRaycast(touch.clientX, touch.clientY);
      }

      if (haptics) {
        haptic.light();
      }

      if (debug) {
        console.log('[TouchPlacement] Touch start:', touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStateRef.current) return;

      const touch = Array.from(e.touches).find(
        t => t.identifier === touchStateRef.current?.identifier
      );
      if (!touch) return;

      touchStateRef.current.currentX = touch.clientX;
      touchStateRef.current.currentY = touch.clientY;

      if (mode === 'continuous' || mode === 'hold-and-drag') {
        handleTouchRaycast(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchState = touchStateRef.current;
      if (!touchState) return;

      const elapsed = Date.now() - touchState.startTime;
      const moved = Math.sqrt(
        Math.pow(touchState.currentX - touchState.startX, 2) +
        Math.pow(touchState.currentY - touchState.startY, 2)
      );

      setIsTouching(false);

      // Tap detection (quick touch, minimal movement)
      if (mode === 'tap' && elapsed < 300 && moved < 20) {
        handleTouchRaycast(touchState.currentX, touchState.currentY);

        // Small delay to allow raycast to complete
        setTimeout(() => {
          if (lastHitResultRef.current) {
            confirmPlacement();
          }
        }, 50);
      }

      // Hold-and-drag: confirm on release
      if (mode === 'hold-and-drag' && lastHitResultRef.current) {
        confirmPlacement();
      }

      touchStateRef.current = null;

      if (debug) {
        console.log('[TouchPlacement] Touch end - elapsed:', elapsed, 'moved:', moved);
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, isPlacing, mode, haptics, debug, gl, handleTouchRaycast]);

  // Confirm placement
  const confirmPlacement = useCallback(() => {
    if (!lastHitResultRef.current) return;

    if (haptics) {
      haptic.medium();
    }

    onPlace?.(lastHitResultRef.current);
    setPreviewPosition(null);
    lastHitResultRef.current = null;

    if (debug) {
      console.log('[TouchPlacement] Placement confirmed');
    }
  }, [haptics, onPlace, debug]);

  // Cancel placement
  const cancelPlacement = useCallback(() => {
    if (haptics) {
      haptic.light();
    }

    onCancel?.();
    setPreviewPosition(null);
    lastHitResultRef.current = null;
    touchStateRef.current = null;
    setIsTouching(false);

    if (debug) {
      console.log('[TouchPlacement] Placement cancelled');
    }
  }, [haptics, onCancel, debug]);

  // Start placement mode
  const startPlacement = useCallback(() => {
    setIsPlacing(true);
    if (debug) {
      console.log('[TouchPlacement] Placement mode started');
    }
  }, [debug]);

  // Stop placement mode
  const stopPlacement = useCallback(() => {
    setIsPlacing(false);
    cancelPlacement();
    if (debug) {
      console.log('[TouchPlacement] Placement mode stopped');
    }
  }, [cancelPlacement, debug]);

  return {
    isPlacing,
    previewPosition,
    isTouching,
    confirmPlacement,
    cancelPlacement,
    startPlacement,
    stopPlacement,
  };
}

export default useTouchPlacement;
