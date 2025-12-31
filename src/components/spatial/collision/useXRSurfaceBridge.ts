/**
 * StickerNest - XR Surface Bridge
 *
 * Bridges WebXR plane and mesh detection with the unified collision store.
 * Automatically registers detected XR surfaces as CollisionSurfaces with
 * proper priority, snap points, and real-time updates.
 *
 * Features:
 * - Converts XR planes to CollisionSurfaces with semantic types
 * - Generates snap points for each detected plane
 * - Updates surfaces when XR detection changes
 * - Cleans up surfaces when planes are removed
 * - Supports both plane detection and mesh detection
 */

import { useEffect, useRef, useCallback } from 'react';
import { useXRPlanes, useXRMeshes, useXR } from '@react-three/xr';
import { Vector3, Box3, Matrix4, Quaternion, BufferGeometry, Mesh } from 'three';
import { useCollisionStore } from '../../../state/useCollisionStore';
import type {
  CollisionSurface,
  SurfaceType,
  SnapPoint,
} from '../../../types/collisionTypes';
import {
  generateSurfaceId,
  SURFACE_SOURCE_PRIORITIES,
} from '../../../types/collisionTypes';
import {
  generateSnapPointsFromXRPolygon,
  generateSnapPoints,
} from '../../../utils/snapPointGeneration';

// ============================================================================
// Configuration
// ============================================================================

export interface XRSurfaceBridgeOptions {
  /** Enable plane detection bridge (default: true) */
  enablePlanes?: boolean;

  /** Enable mesh detection bridge (default: true) */
  enableMeshes?: boolean;

  /** Plane types to detect (default: all) */
  planeTypes?: SurfaceType[];

  /** Minimum plane area to register (m², default: 0.1) */
  minPlaneArea?: number;

  /** Generate grid snap points for large surfaces (default: false) */
  generateGridSnapPoints?: boolean;

  /** Grid spacing for snap points (meters, default: 0.25) */
  gridSpacing?: number;

  /** Debug logging (default: false) */
  debug?: boolean;
}

const DEFAULT_OPTIONS: Required<XRSurfaceBridgeOptions> = {
  enablePlanes: true,
  enableMeshes: true,
  planeTypes: ['wall', 'floor', 'ceiling', 'table', 'couch', 'door', 'window', 'custom'],
  minPlaneArea: 0.1,
  generateGridSnapPoints: false,
  gridSpacing: 0.25,
  debug: false,
};

// ============================================================================
// Semantic Label Mapping
// ============================================================================

/**
 * Map XR semantic labels to our surface types.
 */
function mapSemanticLabel(semanticLabel?: string): SurfaceType {
  if (!semanticLabel) return 'custom';

  const label = semanticLabel.toLowerCase();

  if (label === 'floor') return 'floor';
  if (label === 'wall' || label === 'wall_face') return 'wall';
  if (label === 'ceiling') return 'ceiling';
  if (label === 'table' || label === 'desk') return 'table';
  if (label === 'couch' || label === 'sofa') return 'couch';
  if (label === 'door') return 'door';
  if (label === 'window') return 'window';

  return 'custom';
}

/**
 * Calculate normal vector based on surface type.
 */
function getNormalForSurfaceType(type: SurfaceType): Vector3 {
  switch (type) {
    case 'floor':
    case 'table':
      return new Vector3(0, 1, 0);
    case 'ceiling':
      return new Vector3(0, -1, 0);
    case 'wall':
    case 'door':
    case 'window':
    default:
      return new Vector3(0, 0, 1);
  }
}

/**
 * Calculate approximate area from XR plane polygon.
 */
function calculatePolygonArea(polygon: DOMPointReadOnly[]): number {
  if (polygon.length < 3) return 0;

  // Use shoelace formula for polygon area (assuming roughly planar)
  let area = 0;
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].z;
    area -= polygon[j].x * polygon[i].z;
  }

  return Math.abs(area) / 2;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Bridge XR plane and mesh detection to the collision store.
 *
 * This hook automatically:
 * 1. Detects XR planes and meshes
 * 2. Converts them to CollisionSurfaces
 * 3. Registers them with the collision store
 * 4. Updates surfaces when detection changes
 * 5. Cleans up when surfaces are removed
 *
 * @example
 * ```tsx
 * function ARScene() {
 *   const { planeCount, meshCount, isActive } = useXRSurfaceBridge({
 *     enablePlanes: true,
 *     enableMeshes: true,
 *   });
 *
 *   return (
 *     <group>
 *       {isActive && <Text>Detected {planeCount} surfaces</Text>}
 *     </group>
 *   );
 * }
 * ```
 */
export function useXRSurfaceBridge(options?: XRSurfaceBridgeOptions) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // XR state
  const { isPresenting } = useXR();

  // Get detected planes by type
  const walls = useXRPlanes('wall');
  const floors = useXRPlanes('floor');
  const ceilings = useXRPlanes('ceiling');
  const tables = useXRPlanes('table');
  const couches = useXRPlanes('couch');
  const doors = useXRPlanes('door');
  const windows = useXRPlanes('window');
  const otherPlanes = useXRPlanes('other');

  // Get detected meshes
  const meshes = useXRMeshes();

  // Collision store actions
  const registerSurfaces = useCollisionStore((s) => s.registerSurfaces);
  const unregisterSurface = useCollisionStore((s) => s.unregisterSurface);
  const clearSurfacesBySource = useCollisionStore((s) => s.clearSurfacesBySource);

  // Track registered surface IDs for cleanup
  const registeredPlaneIds = useRef<Set<string>>(new Set());
  const registeredMeshIds = useRef<Set<string>>(new Set());

  /**
   * Convert XR plane to CollisionSurface.
   */
  const convertPlaneToSurface = useCallback(
    (plane: XRPlane, type: SurfaceType): CollisionSurface | null => {
      const polygon = plane.polygon;
      if (!polygon || polygon.length < 3) return null;

      // Check minimum area
      const area = calculatePolygonArea(polygon);
      if (area < opts.minPlaneArea) return null;

      // Generate unique ID
      const id = generateSurfaceId('xr-plane', type);

      // Calculate centroid
      let cx = 0, cy = 0, cz = 0;
      for (const point of polygon) {
        cx += point.x;
        cy += point.y;
        cz += point.z;
      }
      const centroid = new Vector3(
        cx / polygon.length,
        cy / polygon.length,
        cz / polygon.length
      );

      // Calculate bounding box
      const bbox = new Box3();
      for (const point of polygon) {
        bbox.expandByPoint(new Vector3(point.x, point.y, point.z));
      }

      // Get normal based on surface type
      const normal = getNormalForSurfaceType(type);

      // Generate snap points
      const snapPoints = generateSnapPointsFromXRPolygon(
        id,
        polygon,
        new Matrix4(), // Identity matrix - XR space
        type,
        {
          includeCenter: true,
          includeCorners: true,
          includeGrid: opts.generateGridSnapPoints && area > 1.0, // Grid for large surfaces
          gridSpacing: opts.gridSpacing,
        }
      );

      const surface: CollisionSurface = {
        id,
        type,
        source: 'xr-plane',
        priority: SURFACE_SOURCE_PRIORITIES['xr-plane'],
        mesh: null, // XR planes don't have Three.js mesh
        boundingBox: bbox,
        centroid,
        normal,
        area,
        snapPoints,
        xrPlaneSpace: plane.planeSpace,
        semanticLabel: plane.semanticLabel,
        confidence: 0.9, // XR planes have high confidence
        active: true,
        updatedAt: Date.now(),
      };

      if (opts.debug) {
        console.log(`[XR Bridge] Registered plane: ${type} (${polygon.length} vertices, ${area.toFixed(2)}m²)`);
      }

      return surface;
    },
    [opts]
  );

  /**
   * Process all planes and register with collision store.
   */
  const processPlanes = useCallback(() => {
    if (!opts.enablePlanes) return;

    const allPlanes: Array<{ plane: XRPlane; type: SurfaceType }> = [];

    // Collect all planes with their types
    if (opts.planeTypes.includes('wall')) {
      walls.forEach((plane) => allPlanes.push({ plane, type: 'wall' }));
    }
    if (opts.planeTypes.includes('floor')) {
      floors.forEach((plane) => allPlanes.push({ plane, type: 'floor' }));
    }
    if (opts.planeTypes.includes('ceiling')) {
      ceilings.forEach((plane) => allPlanes.push({ plane, type: 'ceiling' }));
    }
    if (opts.planeTypes.includes('table')) {
      tables.forEach((plane) => allPlanes.push({ plane, type: 'table' }));
    }
    if (opts.planeTypes.includes('couch')) {
      couches.forEach((plane) => allPlanes.push({ plane, type: 'couch' }));
    }
    if (opts.planeTypes.includes('door')) {
      doors.forEach((plane) => allPlanes.push({ plane, type: 'door' }));
    }
    if (opts.planeTypes.includes('window')) {
      windows.forEach((plane) => allPlanes.push({ plane, type: 'window' }));
    }
    otherPlanes.forEach((plane) => allPlanes.push({ plane, type: 'custom' }));

    // Convert planes to surfaces
    const newSurfaces: CollisionSurface[] = [];
    const newIds = new Set<string>();

    for (const { plane, type } of allPlanes) {
      const surface = convertPlaneToSurface(plane, type);
      if (surface) {
        newSurfaces.push(surface);
        newIds.add(surface.id);
      }
    }

    // Find surfaces to remove (no longer detected)
    const toRemove: string[] = [];
    for (const id of registeredPlaneIds.current) {
      if (!newIds.has(id)) {
        toRemove.push(id);
      }
    }

    // Unregister removed surfaces
    for (const id of toRemove) {
      unregisterSurface(id);
      registeredPlaneIds.current.delete(id);
    }

    // Register new surfaces
    if (newSurfaces.length > 0) {
      registerSurfaces(newSurfaces);
      newSurfaces.forEach((s) => registeredPlaneIds.current.add(s.id));
    }
  }, [
    opts,
    walls,
    floors,
    ceilings,
    tables,
    couches,
    doors,
    windows,
    otherPlanes,
    convertPlaneToSurface,
    registerSurfaces,
    unregisterSurface,
  ]);

  /**
   * Process meshes and register with collision store.
   */
  const processMeshes = useCallback(() => {
    if (!opts.enableMeshes || meshes.length === 0) return;

    const newSurfaces: CollisionSurface[] = [];
    const newIds = new Set<string>();

    for (const mesh of meshes) {
      const id = generateSurfaceId('xr-mesh', mesh.semanticLabel || 'mesh');

      // For meshes, we treat them as general collision geometry
      const type = mapSemanticLabel(mesh.semanticLabel);

      const surface: CollisionSurface = {
        id,
        type,
        source: 'xr-mesh',
        priority: SURFACE_SOURCE_PRIORITIES['xr-mesh'],
        mesh: null, // Would need to create from XR mesh vertices
        boundingBox: new Box3(),
        centroid: new Vector3(),
        normal: new Vector3(0, 1, 0),
        snapPoints: [], // Meshes are for collision, not snapping
        xrMeshSpace: mesh.meshSpace,
        semanticLabel: mesh.semanticLabel,
        active: true,
        updatedAt: Date.now(),
      };

      newSurfaces.push(surface);
      newIds.add(id);
    }

    // Register new mesh surfaces
    if (newSurfaces.length > 0) {
      registerSurfaces(newSurfaces);
      newSurfaces.forEach((s) => registeredMeshIds.current.add(s.id));
    }

    if (opts.debug) {
      console.log(`[XR Bridge] Registered ${meshes.length} meshes`);
    }
  }, [opts, meshes, registerSurfaces]);

  // Process planes when they change
  useEffect(() => {
    if (isPresenting) {
      processPlanes();
    }
  }, [
    isPresenting,
    walls,
    floors,
    ceilings,
    tables,
    couches,
    doors,
    windows,
    otherPlanes,
    processPlanes,
  ]);

  // Process meshes when they change
  useEffect(() => {
    if (isPresenting) {
      processMeshes();
    }
  }, [isPresenting, meshes, processMeshes]);

  // Cleanup when XR session ends
  useEffect(() => {
    if (!isPresenting) {
      // Clear all XR-sourced surfaces when session ends
      clearSurfacesBySource('xr-plane');
      clearSurfacesBySource('xr-mesh');
      registeredPlaneIds.current.clear();
      registeredMeshIds.current.clear();

      if (opts.debug) {
        console.log('[XR Bridge] XR session ended, cleared all XR surfaces');
      }
    }
  }, [isPresenting, clearSurfacesBySource, opts.debug]);

  // Calculate totals
  const planeCount =
    walls.length +
    floors.length +
    ceilings.length +
    tables.length +
    couches.length +
    doors.length +
    windows.length +
    otherPlanes.length;

  return {
    /** Whether XR session is active */
    isActive: isPresenting,
    /** Number of detected planes */
    planeCount,
    /** Number of detected meshes */
    meshCount: meshes.length,
    /** Number of registered plane surfaces */
    registeredPlaneCount: registeredPlaneIds.current.size,
    /** Number of registered mesh surfaces */
    registeredMeshCount: registeredMeshIds.current.size,
    /** Breakdown by surface type */
    planesByType: {
      wall: walls.length,
      floor: floors.length,
      ceiling: ceilings.length,
      table: tables.length,
      couch: couches.length,
      door: doors.length,
      window: windows.length,
      other: otherPlanes.length,
    },
  };
}

export default useXRSurfaceBridge;
