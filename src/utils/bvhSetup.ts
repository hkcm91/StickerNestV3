/**
 * StickerNest - BVH (Bounding Volume Hierarchy) Setup
 *
 * Extends Three.js with accelerated raycasting using three-mesh-bvh.
 * This enables 500+ raycasts against 80k polygon meshes at 60fps.
 *
 * IMPORTANT: Call initializeBVH() once at app startup before any raycasting.
 *
 * @see https://github.com/gkjohnson/three-mesh-bvh
 */

import * as THREE from 'three';
import {
  MeshBVH,
  MeshBVHHelper,
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
  CENTER,
  SAH,
  AVERAGE,
} from 'three-mesh-bvh';

// ============================================================================
// Type Extensions
// ============================================================================

// Extend Three.js types to include BVH methods
declare module 'three' {
  interface BufferGeometry {
    boundsTree?: MeshBVH;
    computeBoundsTree(options?: BVHOptions): void;
    disposeBoundsTree(): void;
  }

  interface Mesh {
    raycast: typeof acceleratedRaycast;
  }
}

// ============================================================================
// Configuration
// ============================================================================

/** Options for BVH construction */
export interface BVHOptions {
  /**
   * Maximum triangles per leaf node.
   * Lower = more memory, faster queries.
   * Higher = less memory, slower queries.
   * Default: 10
   */
  maxLeafTris?: number;

  /**
   * Split strategy for building the tree.
   * - CENTER: Split at center of bounding box (fastest build)
   * - AVERAGE: Split at average of triangle centroids (balanced)
   * - SAH: Surface Area Heuristic (best query performance, slowest build)
   * Default: SAH for best raycasting performance
   */
  strategy?: typeof CENTER | typeof AVERAGE | typeof SAH;

  /**
   * Whether to generate indices if not present.
   * Default: true
   */
  indirect?: boolean;

  /**
   * Verbose logging during BVH construction.
   * Default: false
   */
  verbose?: boolean;
}

/** Default options optimized for real-time raycasting */
export const DEFAULT_BVH_OPTIONS: BVHOptions = {
  maxLeafTris: 5,
  strategy: SAH,
  indirect: true,
  verbose: false,
};

/** Options optimized for faster BVH construction (use for dynamic geometry) */
export const FAST_BUILD_BVH_OPTIONS: BVHOptions = {
  maxLeafTris: 10,
  strategy: CENTER,
  indirect: true,
  verbose: false,
};

// ============================================================================
// Initialization
// ============================================================================

let isInitialized = false;

/**
 * Initialize BVH support for Three.js.
 * Call this once at app startup before performing any raycasting.
 *
 * This extends:
 * - THREE.Mesh.prototype.raycast with accelerated version
 * - THREE.BufferGeometry.prototype with computeBoundsTree/disposeBoundsTree
 *
 * @example
 * ```typescript
 * // In your app entry point (main.tsx or App.tsx)
 * import { initializeBVH } from './utils/bvhSetup';
 * initializeBVH();
 * ```
 */
export function initializeBVH(): void {
  if (isInitialized) {
    console.warn('[BVH] Already initialized, skipping.');
    return;
  }

  // Extend BufferGeometry prototype
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

  // Extend Mesh prototype with accelerated raycast
  THREE.Mesh.prototype.raycast = acceleratedRaycast;

  isInitialized = true;
  console.log('[BVH] Three.js BVH acceleration initialized.');
}

/**
 * Check if BVH has been initialized.
 */
export function isBVHInitialized(): boolean {
  return isInitialized;
}

// ============================================================================
// BVH Management
// ============================================================================

/**
 * Compute BVH for a mesh's geometry.
 *
 * The BVH is stored on the geometry and will be automatically used
 * for accelerated raycasting.
 *
 * @param mesh - The mesh to compute BVH for
 * @param options - BVH construction options
 * @returns true if BVH was computed, false if already exists or failed
 *
 * @example
 * ```typescript
 * const mesh = new THREE.Mesh(geometry, material);
 * computeMeshBVH(mesh);
 * // Now mesh.raycast() uses accelerated BVH queries
 * ```
 */
export function computeMeshBVH(mesh: THREE.Mesh, options?: BVHOptions): boolean {
  if (!mesh.geometry) {
    console.warn('[BVH] Mesh has no geometry, cannot compute BVH.');
    return false;
  }

  if (mesh.geometry.boundsTree) {
    // BVH already exists
    return false;
  }

  try {
    const opts = { ...DEFAULT_BVH_OPTIONS, ...options };
    mesh.geometry.computeBoundsTree(opts);
    return true;
  } catch (error) {
    console.error('[BVH] Failed to compute BVH:', error);
    return false;
  }
}

/**
 * Dispose of a mesh's BVH to free memory.
 *
 * Call this when a mesh is no longer needed for raycasting,
 * or when the geometry changes and BVH needs recomputation.
 *
 * @param mesh - The mesh to dispose BVH for
 * @returns true if BVH was disposed, false if none existed
 */
export function disposeMeshBVH(mesh: THREE.Mesh): boolean {
  if (!mesh.geometry?.boundsTree) {
    return false;
  }

  try {
    mesh.geometry.disposeBoundsTree();
    return true;
  } catch (error) {
    console.error('[BVH] Failed to dispose BVH:', error);
    return false;
  }
}

/**
 * Recompute BVH for a mesh (dispose existing and create new).
 *
 * Use this when geometry has been modified and BVH needs to be rebuilt.
 *
 * @param mesh - The mesh to recompute BVH for
 * @param options - BVH construction options
 */
export function recomputeMeshBVH(mesh: THREE.Mesh, options?: BVHOptions): boolean {
  disposeMeshBVH(mesh);
  return computeMeshBVH(mesh, options);
}

/**
 * Check if a mesh has a computed BVH.
 */
export function hasBVH(mesh: THREE.Mesh): boolean {
  return !!mesh.geometry?.boundsTree;
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Compute BVH for all meshes in a scene graph.
 *
 * Useful for preparing an entire 3D environment for raycasting.
 *
 * @param root - The root object to traverse
 * @param options - BVH construction options
 * @returns Number of meshes that had BVH computed
 */
export function computeBVHForScene(root: THREE.Object3D, options?: BVHOptions): number {
  let count = 0;

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (computeMeshBVH(child, options)) {
        count++;
      }
    }
  });

  return count;
}

/**
 * Dispose BVH for all meshes in a scene graph.
 *
 * @param root - The root object to traverse
 * @returns Number of meshes that had BVH disposed
 */
export function disposeBVHForScene(root: THREE.Object3D): number {
  let count = 0;

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (disposeMeshBVH(child)) {
        count++;
      }
    }
  });

  return count;
}

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Create a visual helper to display BVH structure.
 *
 * Useful for debugging and understanding BVH partitioning.
 *
 * @param mesh - The mesh with computed BVH
 * @param depth - Maximum depth to visualize (default: 10)
 * @returns Helper object to add to scene, or null if no BVH
 */
export function createBVHHelper(mesh: THREE.Mesh, depth: number = 10): MeshBVHHelper | null {
  if (!mesh.geometry?.boundsTree) {
    console.warn('[BVH] Cannot create helper - mesh has no BVH.');
    return null;
  }

  const helper = new MeshBVHHelper(mesh, depth);
  helper.update();
  return helper;
}

// ============================================================================
// Exports
// ============================================================================

export {
  MeshBVH,
  MeshBVHHelper,
  acceleratedRaycast,
  CENTER,
  SAH,
  AVERAGE,
};
