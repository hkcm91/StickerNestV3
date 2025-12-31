/**
 * StickerNest - 3D Environment Loader
 *
 * Loads GLTF/GLB 3D environments and extracts collision surfaces.
 * Supports automatic collision mesh detection via naming conventions
 * and GLTF extras metadata.
 *
 * Naming Conventions for Collision Meshes:
 * - *_collision - Generic collision mesh (hidden from rendering)
 * - *_wall - Wall collision surface
 * - *_floor - Floor collision surface
 * - *_ceiling - Ceiling collision surface
 * - *_table - Table/horizontal surface
 *
 * GLTF Extras:
 * - userData.collision = true - Mark as collision mesh
 * - userData.surfaceType = 'wall' | 'floor' | etc.
 * - userData.snapPoints = true - Generate snap points for this surface
 */

import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  Group,
  Mesh,
  Object3D,
  Box3,
  Vector3,
  Matrix4,
  BufferGeometry,
  Material,
  MeshStandardMaterial,
} from 'three';
import { useCollisionStore } from '../../../state/useCollisionStore';
import type {
  CollisionSurface,
  CollisionEnvironment,
  SurfaceType,
  SnapPoint,
} from '../../../types/collisionTypes';
import {
  generateSurfaceId,
  SURFACE_SOURCE_PRIORITIES,
} from '../../../types/collisionTypes';
import {
  computeMeshBVH,
  disposeMeshBVH,
  computeBVHForScene,
} from '../../../utils/bvhSetup';
import {
  generateSnapPointsFromGeometry,
} from '../../../utils/snapPointGeneration';

// ============================================================================
// Types
// ============================================================================

export interface Environment3DLoaderProps {
  /** Unique identifier for this environment */
  id: string;

  /** URL to the GLTF/GLB model */
  modelUrl: string;

  /** Display name */
  name?: string;

  /** Position in world space */
  position?: [number, number, number];

  /** Rotation in radians (Euler XYZ) */
  rotation?: [number, number, number];

  /** Uniform scale factor */
  scale?: number;

  /** Called when environment finishes loading */
  onLoad?: (environment: LoadedEnvironment) => void;

  /** Called on load error */
  onError?: (error: Error) => void;

  /** Whether to show collision meshes (for debugging) */
  showCollisionMeshes?: boolean;

  /** Whether to generate grid snap points (default: false) */
  generateGridSnapPoints?: boolean;

  /** Grid spacing for snap points (meters, default: 0.25) */
  gridSpacing?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** Children to render inside the environment */
  children?: React.ReactNode;
}

export interface LoadedEnvironment {
  id: string;
  name: string;
  scene: Group;
  collisionMeshes: Mesh[];
  surfaceCount: number;
  boundingBox: Box3;
}

interface CollisionMeshInfo {
  mesh: Mesh;
  surfaceType: SurfaceType;
  isCollisionOnly: boolean;
}

// ============================================================================
// Collision Mesh Detection
// ============================================================================

/**
 * Check if an object is a collision mesh based on name or userData.
 */
function isCollisionMesh(object: Object3D): object is Mesh {
  if (!(object instanceof Mesh)) return false;

  const name = object.name.toLowerCase();

  // Check naming conventions
  if (name.includes('_collision')) return true;
  if (name.includes('_collider')) return true;
  if (name.includes('_wall')) return true;
  if (name.includes('_floor')) return true;
  if (name.includes('_ceiling')) return true;
  if (name.includes('_table')) return true;
  if (name.includes('_surface')) return true;

  // Check userData
  if (object.userData?.collision === true) return true;
  if (object.userData?.collider === true) return true;
  if (object.userData?.surfaceType) return true;

  return false;
}

/**
 * Determine surface type from mesh name or userData.
 */
function getSurfaceType(mesh: Mesh): SurfaceType {
  // Check userData first (highest priority)
  if (mesh.userData?.surfaceType) {
    const type = mesh.userData.surfaceType.toLowerCase();
    if (['wall', 'floor', 'ceiling', 'table', 'couch', 'door', 'window'].includes(type)) {
      return type as SurfaceType;
    }
  }

  // Check naming conventions
  const name = mesh.name.toLowerCase();

  if (name.includes('wall')) return 'wall';
  if (name.includes('floor') || name.includes('ground')) return 'floor';
  if (name.includes('ceiling') || name.includes('roof')) return 'ceiling';
  if (name.includes('table') || name.includes('desk')) return 'table';
  if (name.includes('couch') || name.includes('sofa')) return 'couch';
  if (name.includes('door')) return 'door';
  if (name.includes('window')) return 'window';

  return 'custom';
}

/**
 * Check if collision mesh should be hidden from rendering.
 */
function isCollisionOnly(mesh: Mesh): boolean {
  const name = mesh.name.toLowerCase();

  // Meshes with _collision or _collider suffix are collision-only
  if (name.includes('_collision') || name.includes('_collider')) return true;

  // Check userData
  if (mesh.userData?.collisionOnly === true) return true;
  if (mesh.userData?.visible === false) return true;

  return false;
}

/**
 * Extract all collision meshes from a scene.
 */
function extractCollisionMeshes(scene: Group): CollisionMeshInfo[] {
  const meshes: CollisionMeshInfo[] = [];

  scene.traverse((child) => {
    if (isCollisionMesh(child)) {
      meshes.push({
        mesh: child,
        surfaceType: getSurfaceType(child),
        isCollisionOnly: isCollisionOnly(child),
      });
    }
  });

  return meshes;
}

// ============================================================================
// Main Component
// ============================================================================

export function Environment3DLoader({
  id,
  modelUrl,
  name = 'Environment',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onLoad,
  onError,
  showCollisionMeshes = false,
  generateGridSnapPoints = false,
  gridSpacing = 0.25,
  debug = false,
  children,
}: Environment3DLoaderProps) {
  const groupRef = useRef<Group>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load GLTF model
  const { scene, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, groupRef);

  // Collision store actions
  const registerEnvironment = useCollisionStore((s) => s.registerEnvironment);
  const registerEnvironmentSurfaces = useCollisionStore((s) => s.registerEnvironmentSurfaces);
  const clearEnvironmentSurfaces = useCollisionStore((s) => s.clearEnvironmentSurfaces);
  const removeEnvironment = useCollisionStore((s) => s.removeEnvironment);
  const updateEnvironmentLoadState = useCollisionStore((s) => s.updateEnvironmentLoadState);

  // Clone scene for this instance
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    return clone;
  }, [scene]);

  // Extract and process collision meshes
  const collisionMeshes = useMemo(() => {
    return extractCollisionMeshes(clonedScene);
  }, [clonedScene]);

  // Register environment and surfaces with collision store
  useEffect(() => {
    if (!groupRef.current) return;

    try {
      // Register environment metadata
      const environment: CollisionEnvironment = {
        id,
        name,
        modelUrl,
        transform: {
          position,
          rotation,
          scale,
        },
        surfaceIds: [],
        alignmentAnchors: [],
        loadState: 'loading',
      };

      registerEnvironment(environment);

      // Process collision meshes
      const surfaces: CollisionSurface[] = [];

      for (const { mesh, surfaceType, isCollisionOnly: hideFromRender } of collisionMeshes) {
        // Update world matrix
        mesh.updateWorldMatrix(true, false);

        // Compute BVH for accelerated raycasting
        computeMeshBVH(mesh);

        // Calculate world-space bounding box
        const bbox = new Box3().setFromObject(mesh);

        // Calculate centroid
        const centroid = new Vector3();
        bbox.getCenter(centroid);

        // Calculate normal based on surface type
        const normal = new Vector3();
        if (surfaceType === 'floor' || surfaceType === 'table') {
          normal.set(0, 1, 0);
        } else if (surfaceType === 'ceiling') {
          normal.set(0, -1, 0);
        } else {
          // For walls, try to infer from mesh orientation
          normal.set(0, 0, 1);
          normal.applyQuaternion(mesh.quaternion);
        }

        // Generate snap points
        const snapPoints = generateSnapPointsFromGeometry(
          generateSurfaceId('environment', surfaceType),
          mesh.geometry,
          mesh.matrixWorld,
          surfaceType,
          {
            includeCenter: true,
            includeCorners: true,
            includeGrid: generateGridSnapPoints,
            gridSpacing,
          }
        );

        // Create collision surface
        const surfaceId = generateSurfaceId('environment', `${id}-${surfaceType}`);

        // Store reference to surface ID on mesh for later lookup
        mesh.userData.collisionSurfaceId = surfaceId;

        const surface: CollisionSurface = {
          id: surfaceId,
          type: surfaceType,
          source: 'environment',
          priority: SURFACE_SOURCE_PRIORITIES['environment'],
          mesh,
          boundingBox: bbox,
          centroid,
          normal,
          snapPoints,
          environmentId: id,
          label: mesh.name || `${surfaceType}-surface`,
          active: true,
          updatedAt: Date.now(),
        };

        surfaces.push(surface);

        // Hide collision-only meshes
        if (hideFromRender && !showCollisionMeshes) {
          mesh.visible = false;
        }

        if (debug) {
          console.log(`[Environment3D] Registered surface: ${surfaceType} (${snapPoints.length} snap points)`);
        }
      }

      // Register all surfaces with store
      if (surfaces.length > 0) {
        registerEnvironmentSurfaces(id, surfaces);
      }

      // Update load state
      updateEnvironmentLoadState(id, 'loaded');

      // Calculate overall bounding box
      const overallBbox = new Box3().setFromObject(groupRef.current);

      // Notify load callback
      const loadedEnv: LoadedEnvironment = {
        id,
        name,
        scene: clonedScene,
        collisionMeshes: collisionMeshes.map((c) => c.mesh),
        surfaceCount: surfaces.length,
        boundingBox: overallBbox,
      };

      onLoad?.(loadedEnv);
      setIsLoaded(true);

      if (debug) {
        console.log(`[Environment3D] Loaded "${name}" with ${surfaces.length} collision surfaces`);
      }
    } catch (error) {
      console.error('[Environment3D] Failed to load environment:', error);
      updateEnvironmentLoadState(id, 'error', String(error));
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }

    // Cleanup on unmount
    return () => {
      // Dispose BVH for all collision meshes
      for (const { mesh } of collisionMeshes) {
        disposeMeshBVH(mesh);
      }

      // Remove from collision store
      removeEnvironment(id);

      if (debug) {
        console.log(`[Environment3D] Unloaded "${name}"`);
      }
    };
  }, [
    id,
    name,
    modelUrl,
    position,
    rotation,
    scale,
    clonedScene,
    collisionMeshes,
    registerEnvironment,
    registerEnvironmentSurfaces,
    updateEnvironmentLoadState,
    removeEnvironment,
    showCollisionMeshes,
    generateGridSnapPoints,
    gridSpacing,
    onLoad,
    onError,
    debug,
  ]);

  // Play default animation if available
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = Object.values(actions)[0];
      firstAction?.play();
    }
  }, [actions]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={[scale, scale, scale]}
      name={`environment-${id}`}
    >
      <primitive object={clonedScene} />

      {/* Debug visualization for collision meshes */}
      {showCollisionMeshes && (
        <group name="collision-debug">
          {collisionMeshes.map(({ mesh, surfaceType }, index) => (
            <CollisionMeshDebug
              key={index}
              mesh={mesh}
              surfaceType={surfaceType}
            />
          ))}
        </group>
      )}

      {/* Child content (widgets, stickers, etc.) */}
      {children}
    </group>
  );
}

// ============================================================================
// Debug Visualization
// ============================================================================

interface CollisionMeshDebugProps {
  mesh: Mesh;
  surfaceType: SurfaceType;
}

const SURFACE_DEBUG_COLORS: Record<SurfaceType, string> = {
  wall: '#6366f1',
  floor: '#22c55e',
  ceiling: '#f59e0b',
  table: '#8b5cf6',
  couch: '#ec4899',
  door: '#14b8a6',
  window: '#3b82f6',
  custom: '#ffffff',
};

function CollisionMeshDebug({ mesh, surfaceType }: CollisionMeshDebugProps) {
  const color = SURFACE_DEBUG_COLORS[surfaceType];

  return (
    <mesh
      geometry={mesh.geometry}
      position={mesh.position}
      rotation={mesh.rotation}
      scale={mesh.scale}
    >
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================================================
// Preload Helper
// ============================================================================

/**
 * Preload a GLTF model for faster loading.
 */
Environment3DLoader.preload = (url: string) => {
  useGLTF.preload(url);
};

// ============================================================================
// Hook for Environment Management
// ============================================================================

export interface UseEnvironmentOptions {
  /** Auto-set as active environment when loaded */
  autoActivate?: boolean;
}

/**
 * Hook for managing environment state.
 */
export function useEnvironment(environmentId: string, options: UseEnvironmentOptions = {}) {
  const { autoActivate = true } = options;

  const environment = useCollisionStore((s) => s.environments.get(environmentId));
  const activeEnvironmentId = useCollisionStore((s) => s.activeEnvironmentId);
  const setActiveEnvironment = useCollisionStore((s) => s.setActiveEnvironment);
  const getSurfacesBySource = useCollisionStore((s) => s.getSurfacesBySource);

  const isActive = activeEnvironmentId === environmentId;
  const isLoaded = environment?.loadState === 'loaded';

  // Auto-activate when loaded
  useEffect(() => {
    if (autoActivate && isLoaded && !activeEnvironmentId) {
      setActiveEnvironment(environmentId);
    }
  }, [autoActivate, isLoaded, activeEnvironmentId, environmentId, setActiveEnvironment]);

  const activate = useCallback(() => {
    setActiveEnvironment(environmentId);
  }, [environmentId, setActiveEnvironment]);

  const deactivate = useCallback(() => {
    if (isActive) {
      setActiveEnvironment(null);
    }
  }, [isActive, setActiveEnvironment]);

  return {
    environment,
    isActive,
    isLoaded,
    isLoading: environment?.loadState === 'loading',
    hasError: environment?.loadState === 'error',
    error: environment?.error,
    activate,
    deactivate,
  };
}

export default Environment3DLoader;
