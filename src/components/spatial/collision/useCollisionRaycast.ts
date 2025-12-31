/**
 * StickerNest - Collision Raycast Hook
 *
 * Provides BVH-accelerated raycasting against collision surfaces.
 * Supports both environment meshes and XR-detected surfaces.
 *
 * Features:
 * - BVH-accelerated raycasting for environment meshes
 * - Fallback to bounding box intersection for XR planes
 * - Automatic snap point detection
 * - Continuous raycasting during drag operations
 * - Debug visualization support
 */

import { useCallback, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Vector3,
  Raycaster,
  Object3D,
  Mesh,
  Intersection,
  Camera,
  Vector2,
} from 'three';
import { useCollisionStore } from '../../../state/useCollisionStore';
import type {
  CollisionSurface,
  CollisionRaycastResult,
  SnapPoint,
  SurfaceType,
} from '../../../types/collisionTypes';
import { findClosestSnapPoint } from '../../../utils/snapPointGeneration';
import { hasBVH } from '../../../utils/bvhSetup';

// ============================================================================
// Configuration
// ============================================================================

export interface CollisionRaycastOptions {
  /** Maximum raycast distance (meters, default: 50) */
  maxDistance?: number;

  /** Only return first hit (faster, default: true) */
  firstHitOnly?: boolean;

  /** Surface types to include (empty = all) */
  surfaceTypes?: SurfaceType[];

  /** Include snap point in result (default: true) */
  findSnapPoint?: boolean;

  /** Snap distance threshold (meters, default: from store) */
  snapThreshold?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

const DEFAULT_OPTIONS: Required<CollisionRaycastOptions> = {
  maxDistance: 50,
  firstHitOnly: true,
  surfaceTypes: [],
  findSnapPoint: true,
  snapThreshold: 0.15,
  debug: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an empty raycast result.
 */
function createEmptyResult(): CollisionRaycastResult {
  return {
    hit: false,
    point: new Vector3(),
    normal: new Vector3(),
    distance: Infinity,
    surface: null,
    snapPoint: null,
  };
}

/**
 * Check if a point is within a surface's bounding box.
 */
function isPointNearSurface(
  point: Vector3,
  surface: CollisionSurface,
  threshold: number
): boolean {
  const expandedBox = surface.boundingBox.clone();
  expandedBox.expandByScalar(threshold);
  return expandedBox.containsPoint(point);
}

// ============================================================================
// Main Hook
// ============================================================================

export interface UseCollisionRaycastResult {
  /** Perform a single raycast */
  raycast: (origin: Vector3, direction: Vector3) => CollisionRaycastResult;

  /** Raycast from screen position (mouse/touch) */
  raycastFromScreen: (screenPosition: Vector2) => CollisionRaycastResult;

  /** Raycast from camera center (VR gaze) */
  raycastFromCamera: () => CollisionRaycastResult;

  /** Start continuous raycasting (call in useFrame) */
  startContinuousRaycast: (
    getOriginAndDirection: () => { origin: Vector3; direction: Vector3 } | null
  ) => void;

  /** Stop continuous raycasting */
  stopContinuousRaycast: () => void;

  /** Current continuous raycast result */
  continuousResult: CollisionRaycastResult | null;

  /** Whether continuous raycasting is active */
  isContinuousActive: boolean;
}

/**
 * Hook for performing collision raycasts against registered surfaces.
 *
 * Uses BVH-accelerated raycasting for environment meshes and
 * bounding box intersection for XR planes.
 *
 * @example
 * ```tsx
 * function DragHandler() {
 *   const { raycast, raycastFromScreen } = useCollisionRaycast();
 *
 *   const handlePointerMove = (e) => {
 *     const result = raycastFromScreen(new Vector2(e.clientX, e.clientY));
 *     if (result.hit) {
 *       console.log('Hit surface:', result.surface?.type);
 *       console.log('Snap point:', result.snapPoint?.position);
 *     }
 *   };
 *
 *   return <mesh onPointerMove={handlePointerMove} />;
 * }
 * ```
 */
export function useCollisionRaycast(
  options?: CollisionRaycastOptions
): UseCollisionRaycastResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const { camera, size } = useThree();

  // Collision store
  const surfaces = useCollisionStore((s) => s.surfaces);
  const snapThreshold = useCollisionStore((s) => s.snapConfig.threshold);
  const setLastRaycastResult = useCollisionStore((s) => s.setLastRaycastResult);

  // Use provided threshold or store threshold
  const effectiveSnapThreshold = opts.snapThreshold ?? snapThreshold;

  // Raycaster instance (reused for performance)
  const raycasterRef = useRef(new Raycaster());

  // Continuous raycast state
  const continuousRef = useRef<{
    active: boolean;
    getOriginAndDirection: (() => { origin: Vector3; direction: Vector3 } | null) | null;
    result: CollisionRaycastResult | null;
  }>({
    active: false,
    getOriginAndDirection: null,
    result: null,
  });

  /**
   * Get meshes from surfaces for raycasting.
   */
  const getMeshesForRaycast = useCallback((): Mesh[] => {
    const meshes: Mesh[] = [];

    for (const surface of surfaces.values()) {
      // Skip inactive surfaces
      if (!surface.active) continue;

      // Filter by surface type if specified
      if (opts.surfaceTypes.length > 0 && !opts.surfaceTypes.includes(surface.type)) {
        continue;
      }

      // Only include surfaces with meshes
      if (surface.mesh) {
        meshes.push(surface.mesh);
      }
    }

    return meshes;
  }, [surfaces, opts.surfaceTypes]);

  /**
   * Find the surface that owns a mesh.
   */
  const findSurfaceByMesh = useCallback(
    (mesh: Object3D): CollisionSurface | null => {
      for (const surface of surfaces.values()) {
        if (surface.mesh === mesh) {
          return surface;
        }
      }
      return null;
    },
    [surfaces]
  );

  /**
   * Perform raycast against mesh-based surfaces using BVH.
   */
  const raycastMeshes = useCallback(
    (origin: Vector3, direction: Vector3): CollisionRaycastResult => {
      const raycaster = raycasterRef.current;
      raycaster.set(origin, direction.clone().normalize());
      raycaster.far = opts.maxDistance;
      raycaster.firstHitOnly = opts.firstHitOnly;

      const meshes = getMeshesForRaycast();
      if (meshes.length === 0) {
        return createEmptyResult();
      }

      // Perform raycast
      const intersections = raycaster.intersectObjects(meshes, false);

      if (intersections.length === 0) {
        return createEmptyResult();
      }

      // Get first hit
      const hit = intersections[0];
      const surface = findSurfaceByMesh(hit.object);

      if (!surface) {
        return createEmptyResult();
      }

      // Calculate normal at hit point
      const normal = hit.face?.normal.clone() ?? surface.normal.clone();

      // Transform normal to world space if mesh has rotation
      if (hit.object instanceof Mesh) {
        normal.applyQuaternion(hit.object.quaternion);
      }

      // Find nearest snap point if requested
      let snapPoint: SnapPoint | null = null;
      if (opts.findSnapPoint && surface.snapPoints.length > 0) {
        snapPoint = findClosestSnapPoint(
          hit.point,
          surface.snapPoints,
          effectiveSnapThreshold
        );
      }

      const result: CollisionRaycastResult = {
        hit: true,
        point: hit.point.clone(),
        normal,
        distance: hit.distance,
        surface,
        snapPoint,
        faceIndex: hit.faceIndex,
      };

      if (opts.debug) {
        console.log('[Raycast] Hit:', surface.type, 'at distance:', hit.distance.toFixed(2));
      }

      return result;
    },
    [opts, getMeshesForRaycast, findSurfaceByMesh, effectiveSnapThreshold]
  );

  /**
   * Perform raycast against XR planes (no mesh, use bounding box).
   */
  const raycastXRPlanes = useCallback(
    (origin: Vector3, direction: Vector3): CollisionRaycastResult => {
      let closestResult: CollisionRaycastResult = createEmptyResult();
      let minDistance = opts.maxDistance;

      for (const surface of surfaces.values()) {
        // Skip inactive surfaces
        if (!surface.active) continue;

        // Only process XR planes without meshes
        if (surface.source !== 'xr-plane' || surface.mesh) continue;

        // Filter by surface type if specified
        if (opts.surfaceTypes.length > 0 && !opts.surfaceTypes.includes(surface.type)) {
          continue;
        }

        // Simple ray-plane intersection
        // Using the plane equation: dot(normal, point - planePoint) = 0
        const normal = surface.normal;
        const denom = direction.dot(normal);

        if (Math.abs(denom) < 0.0001) {
          // Ray is parallel to plane
          continue;
        }

        const t = surface.centroid.clone().sub(origin).dot(normal) / denom;

        if (t < 0 || t > minDistance) {
          // Behind ray origin or too far
          continue;
        }

        // Calculate intersection point
        const point = origin.clone().add(direction.clone().multiplyScalar(t));

        // Check if point is within surface bounds
        if (!surface.boundingBox.containsPoint(point)) {
          continue;
        }

        // This is the closest hit so far
        minDistance = t;

        // Find nearest snap point
        let snapPoint: SnapPoint | null = null;
        if (opts.findSnapPoint && surface.snapPoints.length > 0) {
          snapPoint = findClosestSnapPoint(
            point,
            surface.snapPoints,
            effectiveSnapThreshold
          );
        }

        closestResult = {
          hit: true,
          point,
          normal: normal.clone(),
          distance: t,
          surface,
          snapPoint,
        };
      }

      return closestResult;
    },
    [surfaces, opts, effectiveSnapThreshold]
  );

  /**
   * Main raycast function - combines mesh and plane raycasting.
   */
  const raycast = useCallback(
    (origin: Vector3, direction: Vector3): CollisionRaycastResult => {
      // Raycast against meshes (BVH-accelerated)
      const meshResult = raycastMeshes(origin, direction);

      // Raycast against XR planes (analytical)
      const planeResult = raycastXRPlanes(origin, direction);

      // Return closest hit
      let result: CollisionRaycastResult;
      if (!meshResult.hit && !planeResult.hit) {
        result = createEmptyResult();
      } else if (!meshResult.hit) {
        result = planeResult;
      } else if (!planeResult.hit) {
        result = meshResult;
      } else {
        // Both hit - return closest
        result = meshResult.distance <= planeResult.distance ? meshResult : planeResult;
      }

      // Store result for debugging
      setLastRaycastResult(result);

      return result;
    },
    [raycastMeshes, raycastXRPlanes, setLastRaycastResult]
  );

  /**
   * Raycast from screen position (normalized device coordinates).
   */
  const raycastFromScreen = useCallback(
    (screenPosition: Vector2): CollisionRaycastResult => {
      // Convert screen position to NDC (-1 to 1)
      const ndc = new Vector2(
        (screenPosition.x / size.width) * 2 - 1,
        -(screenPosition.y / size.height) * 2 + 1
      );

      // Set up raycaster from camera
      raycasterRef.current.setFromCamera(ndc, camera);

      const origin = raycasterRef.current.ray.origin.clone();
      const direction = raycasterRef.current.ray.direction.clone();

      return raycast(origin, direction);
    },
    [size, camera, raycast]
  );

  /**
   * Raycast from camera center (for VR gaze-based interaction).
   */
  const raycastFromCamera = useCallback((): CollisionRaycastResult => {
    const origin = new Vector3();
    const direction = new Vector3(0, 0, -1);

    // Get camera world position and direction
    camera.getWorldPosition(origin);
    camera.getWorldDirection(direction);

    return raycast(origin, direction);
  }, [camera, raycast]);

  /**
   * Start continuous raycasting.
   */
  const startContinuousRaycast = useCallback(
    (getOriginAndDirection: () => { origin: Vector3; direction: Vector3 } | null) => {
      continuousRef.current.active = true;
      continuousRef.current.getOriginAndDirection = getOriginAndDirection;
    },
    []
  );

  /**
   * Stop continuous raycasting.
   */
  const stopContinuousRaycast = useCallback(() => {
    continuousRef.current.active = false;
    continuousRef.current.getOriginAndDirection = null;
    continuousRef.current.result = null;
  }, []);

  // Continuous raycasting in frame loop
  useFrame(() => {
    if (!continuousRef.current.active || !continuousRef.current.getOriginAndDirection) {
      return;
    }

    const ray = continuousRef.current.getOriginAndDirection();
    if (ray) {
      continuousRef.current.result = raycast(ray.origin, ray.direction);
    }
  });

  return {
    raycast,
    raycastFromScreen,
    raycastFromCamera,
    startContinuousRaycast,
    stopContinuousRaycast,
    continuousResult: continuousRef.current.result,
    isContinuousActive: continuousRef.current.active,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Simplified hook for snap-to-surface during drag operations.
 */
export function useSnapToSurface(options?: CollisionRaycastOptions) {
  const { raycast, raycastFromScreen } = useCollisionRaycast(options);
  const updateSnapState = useCollisionStore((s) => s.updateSnapState);
  const startSnapping = useCollisionStore((s) => s.startSnapping);
  const endSnapping = useCollisionStore((s) => s.endSnapping);

  const startDrag = useCallback(
    (targetId: string) => {
      startSnapping(targetId);
    },
    [startSnapping]
  );

  const updateDrag = useCallback(
    (origin: Vector3, direction: Vector3) => {
      const result = raycast(origin, direction);
      updateSnapState(
        result.hit ? result.point : origin,
        result.snapPoint,
        result.surface
      );
      return result;
    },
    [raycast, updateSnapState]
  );

  const updateDragFromScreen = useCallback(
    (screenPosition: Vector2) => {
      const result = raycastFromScreen(screenPosition);
      updateSnapState(
        result.hit ? result.point : new Vector3(),
        result.snapPoint,
        result.surface
      );
      return result;
    },
    [raycastFromScreen, updateSnapState]
  );

  const finishDrag = useCallback(() => {
    endSnapping();
  }, [endSnapping]);

  return {
    startDrag,
    updateDrag,
    updateDragFromScreen,
    finishDrag,
  };
}

export default useCollisionRaycast;
