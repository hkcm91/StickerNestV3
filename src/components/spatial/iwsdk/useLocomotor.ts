/**
 * StickerNest - IWSDK Locomotor Hook
 *
 * React hook wrapping Meta's Immersive Web SDK Locomotor for physics-based
 * locomotion. Provides teleportation, sliding, and jumping with collision detection.
 *
 * Features:
 * - Physics runs in web worker for smooth 90fps on Quest
 * - Automatic environment collision from room mapping
 * - Parabolic teleport arc visualization
 * - Cross-platform: works on Quest, Vision Pro, desktop
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { Vector3, Object3D, Mesh } from 'three';
import { Locomotor, LocomotorConfig, sampleParabolicCurve } from '@iwsdk/locomotor';

// ============================================================================
// Types
// ============================================================================

export interface UseLocomotorConfig extends Omit<LocomotorConfig, 'initialPlayerPosition'> {
  /** Enable locomotion system */
  enabled?: boolean;
  /** Initial position */
  initialPosition?: [number, number, number];
  /** Callback when position changes */
  onPositionChange?: (position: Vector3, isGrounded: boolean) => void;
  /** Enable debug logging */
  debug?: boolean;
}

export interface LocomotorResult {
  /** Current player position */
  position: Vector3;
  /** Whether player is on ground */
  isGrounded: boolean;
  /** Teleport to position (instant) */
  teleport: (position: Vector3 | [number, number, number]) => void;
  /** Slide in direction (continuous movement) */
  slide: (direction: Vector3 | [number, number, number]) => void;
  /** Jump (if grounded) */
  jump: () => void;
  /** Add collision environment (returns handle) */
  addEnvironment: (object: Object3D | Mesh) => number;
  /** Remove collision environment */
  removeEnvironment: (handle: number) => void;
  /** Get teleport arc points for visualization */
  getTeleportArc: (origin: Vector3, direction: Vector3, segments?: number) => Vector3[];
  /** Whether locomotor is initialized */
  isReady: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useLocomotor(config: UseLocomotorConfig = {}): LocomotorResult {
  const {
    enabled = true,
    initialPosition = [0, 0, 0],
    onPositionChange,
    debug = false,
    ...locomotorConfig
  } = config;

  const { isPresenting } = useXR();
  const { scene } = useThree();

  const locomotorRef = useRef<Locomotor | null>(null);
  const envHandlesRef = useRef<Map<Object3D, number>>(new Map());

  const [position, setPosition] = useState<Vector3>(
    () => new Vector3(...initialPosition)
  );
  const [isGrounded, setIsGrounded] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Initialize locomotor
  useEffect(() => {
    if (!enabled) return;

    const locomotor = new Locomotor({
      initialPlayerPosition: new Vector3(...initialPosition),
      useWorker: true, // Use worker for 90fps on Quest
      rayGravity: 9.8,
      maxDropDistance: 10,
      jumpHeight: 1.5,
      jumpCooldown: 0.5,
      ...locomotorConfig,
    });

    locomotor.initialize().then(() => {
      locomotorRef.current = locomotor;
      setIsReady(true);

      if (debug) {
        console.log('[IWSDK Locomotor] Initialized');
      }
    });

    return () => {
      locomotor.terminate();
      locomotorRef.current = null;
      setIsReady(false);
      envHandlesRef.current.clear();

      if (debug) {
        console.log('[IWSDK Locomotor] Terminated');
      }
    };
  }, [enabled]);

  // Update locomotor each frame (only needed for inline mode)
  useFrame((_, delta) => {
    const locomotor = locomotorRef.current;
    if (!locomotor || !locomotor.isInitialized()) return;

    // Update locomotor (no-op in worker mode)
    locomotor.update(delta);

    // Sync position
    if (!locomotor.position.equals(position)) {
      setPosition(locomotor.position.clone());
      setIsGrounded(locomotor.isGrounded);
      onPositionChange?.(locomotor.position, locomotor.isGrounded);
    }
  });

  // Teleport to position
  const teleport = useCallback((pos: Vector3 | [number, number, number]) => {
    const locomotor = locomotorRef.current;
    if (!locomotor) return;

    const targetPos = Array.isArray(pos) ? new Vector3(...pos) : pos;
    locomotor.teleport(targetPos);

    if (debug) {
      console.log('[IWSDK Locomotor] Teleport to:', targetPos.toArray());
    }
  }, [debug]);

  // Slide in direction
  const slide = useCallback((dir: Vector3 | [number, number, number]) => {
    const locomotor = locomotorRef.current;
    if (!locomotor) return;

    const direction = Array.isArray(dir) ? new Vector3(...dir) : dir;
    locomotor.slide(direction);
  }, []);

  // Jump
  const jump = useCallback(() => {
    const locomotor = locomotorRef.current;
    if (!locomotor) return;

    locomotor.jump();

    if (debug) {
      console.log('[IWSDK Locomotor] Jump');
    }
  }, [debug]);

  // Add collision environment
  const addEnvironment = useCallback((object: Object3D | Mesh): number => {
    const locomotor = locomotorRef.current;
    if (!locomotor) return -1;

    // Check if already added
    if (envHandlesRef.current.has(object)) {
      return envHandlesRef.current.get(object)!;
    }

    const handle = locomotor.addEnvironment(object, 'static');
    envHandlesRef.current.set(object, handle);

    if (debug) {
      console.log('[IWSDK Locomotor] Added environment:', object.name, 'handle:', handle);
    }

    return handle;
  }, [debug]);

  // Remove collision environment
  const removeEnvironment = useCallback((handle: number) => {
    const locomotor = locomotorRef.current;
    if (!locomotor) return;

    locomotor.removeEnvironment(handle);

    // Remove from our map
    for (const [obj, h] of envHandlesRef.current) {
      if (h === handle) {
        envHandlesRef.current.delete(obj);
        break;
      }
    }

    if (debug) {
      console.log('[IWSDK Locomotor] Removed environment:', handle);
    }
  }, [debug]);

  // Get teleport arc for visualization
  const getTeleportArc = useCallback(
    (origin: Vector3, direction: Vector3, segments: number = 20): Vector3[] => {
      const points: Vector3[] = [];

      // Use IWSDK's parabolic curve sampling
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = sampleParabolicCurve(
          origin,
          direction,
          locomotorConfig.rayGravity ?? 9.8,
          t * 3 // 3 seconds max arc time
        );
        points.push(point);
      }

      return points;
    },
    [locomotorConfig.rayGravity]
  );

  return {
    position,
    isGrounded,
    teleport,
    slide,
    jump,
    addEnvironment,
    removeEnvironment,
    getTeleportArc,
    isReady,
  };
}

export default useLocomotor;
