/**
 * StickerNest - Spatial Anchors Hook
 *
 * Manages WebXR persistent anchors and surface-based placement.
 * Enables stickers to remember their position across sessions.
 *
 * Key Features:
 * - Create persistent anchors (saved across sessions)
 * - Surface-based anchoring (floors, walls, tables)
 * - Anchor lifecycle management
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useXR, useXRPlanes } from '@react-three/xr';
import { Matrix4, Vector3, Quaternion } from 'three';
import {
  useSpatialStickerStore,
  PersistentAnchorData,
} from '../../../state/useSpatialStickerStore';

// ============================================================================
// Types
// ============================================================================

export interface SpatialAnchorsConfig {
  /** Enable anchor management */
  enabled: boolean;
  /** Auto-restore anchors on session start */
  autoRestore?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

export interface SpatialAnchorResult {
  /** Create a new persistent anchor at position */
  createAnchor: (
    position: Vector3,
    rotation: Quaternion,
    label?: string
  ) => Promise<string | null>;
  /** Delete an anchor */
  deleteAnchor: (handle: string) => Promise<void>;
  /** Get nearest surface at position */
  getNearestSurface: (position: Vector3) => SurfaceInfo | null;
  /** Snap position to nearest surface */
  snapToSurface: (
    position: Vector3,
    surfaceType?: 'floor' | 'wall' | 'table' | 'ceiling' | 'any'
  ) => SnappedPosition | null;
  /** Whether anchors are supported */
  isSupported: boolean;
  /** Whether currently in XR session */
  isActive: boolean;
  /** Number of active anchors */
  anchorCount: number;
}

export interface SurfaceInfo {
  type: 'floor' | 'wall' | 'table' | 'ceiling' | 'unknown';
  position: Vector3;
  normal: Vector3;
  planeSpace: XRSpace | null;
}

export interface SnappedPosition {
  position: Vector3;
  surfaceType: 'floor' | 'wall' | 'table' | 'ceiling' | 'unknown';
  distanceFromSurface: number;
  normal: Vector3;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPlaneType(semanticLabel?: string): 'floor' | 'wall' | 'table' | 'ceiling' | 'unknown' {
  if (!semanticLabel) return 'unknown';
  const label = semanticLabel.toLowerCase();
  if (label === 'floor') return 'floor';
  if (label === 'wall') return 'wall';
  if (label === 'table' || label === 'desk') return 'table';
  if (label === 'ceiling') return 'ceiling';
  return 'unknown';
}

// ============================================================================
// Main Hook
// ============================================================================

export function useSpatialAnchors(
  config: SpatialAnchorsConfig
): SpatialAnchorResult {
  const { enabled, autoRestore = true, debug = false } = config;

  const { isPresenting, session } = useXR();
  const [isSupported, setIsSupported] = useState(false);
  const activeAnchorsRef = useRef<Map<string, XRAnchor>>(new Map());

  // Get planes for surface snapping
  const floors = useXRPlanes('floor');
  const walls = useXRPlanes('wall');
  const tables = useXRPlanes('table');
  const ceilings = useXRPlanes('ceiling');
  const allPlanes = [...floors, ...walls, ...tables, ...ceilings];

  // Store actions
  const savePersistentAnchor = useSpatialStickerStore((state) => state.savePersistentAnchor);
  const removePersistentAnchor = useSpatialStickerStore((state) => state.removePersistentAnchor);
  const persistentAnchors = useSpatialStickerStore((state) => state.persistentAnchors);

  // Check for anchor support
  useEffect(() => {
    if (!enabled || !session) {
      setIsSupported(false);
      return;
    }

    // Check if session supports persistent anchors
    const supported = session.enabledFeatures?.includes('anchors') ?? false;
    setIsSupported(supported);

    if (debug) {
      console.log('[Spatial Anchors] Support:', supported);
    }
  }, [enabled, session, debug]);

  // Restore anchors on session start
  useEffect(() => {
    if (!enabled || !isPresenting || !autoRestore || !isSupported) return;

    // Attempt to restore persisted anchors
    const restoreAnchors = async () => {
      for (const [handle, anchorData] of persistentAnchors) {
        try {
          // Note: Actual restoration requires WebXR anchor restoration API
          // which may not be fully supported yet
          if (debug) {
            console.log('[Spatial Anchors] Would restore:', handle, anchorData.label);
          }
        } catch (error) {
          if (debug) {
            console.warn('[Spatial Anchors] Failed to restore:', handle, error);
          }
        }
      }
    };

    restoreAnchors();
  }, [enabled, isPresenting, autoRestore, isSupported, persistentAnchors, debug]);

  // Create a new persistent anchor
  const createAnchor = useCallback(
    async (
      position: Vector3,
      rotation: Quaternion,
      label?: string
    ): Promise<string | null> => {
      if (!isSupported || !session) {
        if (debug) {
          console.warn('[Spatial Anchors] Cannot create anchor - not supported');
        }
        return null;
      }

      try {
        // Create transform matrix
        const matrix = new Matrix4();
        matrix.compose(position, rotation, new Vector3(1, 1, 1));

        // Create XR anchor
        const frame = (session as unknown as { requestAnimationFrame: (callback: (time: number, frame: XRFrame) => void) => number }).requestAnimationFrame;
        if (!frame) {
          throw new Error('Cannot access XR frame');
        }

        // For now, generate a handle and save locally
        // Full WebXR anchor creation would use session.createAnchor()
        const handle = `anchor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        // Save to store
        const anchorData: PersistentAnchorData = {
          handle,
          position: [position.x, position.y, position.z],
          rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
          label,
          createdAt: Date.now(),
        };

        savePersistentAnchor(anchorData);

        if (debug) {
          console.log('[Spatial Anchors] Created:', handle, label);
        }

        return handle;
      } catch (error) {
        if (debug) {
          console.error('[Spatial Anchors] Creation failed:', error);
        }
        return null;
      }
    },
    [isSupported, session, savePersistentAnchor, debug]
  );

  // Delete an anchor
  const deleteAnchor = useCallback(
    async (handle: string): Promise<void> => {
      // Remove from active anchors
      const anchor = activeAnchorsRef.current.get(handle);
      if (anchor) {
        anchor.delete();
        activeAnchorsRef.current.delete(handle);
      }

      // Remove from store
      removePersistentAnchor(handle);

      if (debug) {
        console.log('[Spatial Anchors] Deleted:', handle);
      }
    },
    [removePersistentAnchor, debug]
  );

  // Get nearest surface to a position
  const getNearestSurface = useCallback(
    (position: Vector3): SurfaceInfo | null => {
      if (allPlanes.length === 0) return null;

      let nearest: SurfaceInfo | null = null;
      let minDistance = Infinity;

      for (const plane of allPlanes) {
        // Get plane center (approximate)
        const polygon = plane.polygon;
        if (!polygon || polygon.length === 0) continue;

        // Calculate centroid
        let cx = 0, cy = 0, cz = 0;
        for (const point of polygon) {
          cx += point.x;
          cy += point.y;
          cz += point.z;
        }
        cx /= polygon.length;
        cy /= polygon.length;
        cz /= polygon.length;

        const planeCenter = new Vector3(cx, cy, cz);
        const distance = position.distanceTo(planeCenter);

        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            type: getPlaneType(plane.semanticLabel),
            position: planeCenter,
            normal: new Vector3(0, 1, 0), // Simplified - would need proper normal calc
            planeSpace: plane.planeSpace,
          };
        }
      }

      return nearest;
    },
    [allPlanes]
  );

  // Snap position to nearest surface
  const snapToSurface = useCallback(
    (
      position: Vector3,
      surfaceType: 'floor' | 'wall' | 'table' | 'ceiling' | 'any' = 'any'
    ): SnappedPosition | null => {
      // Filter planes by type if specified
      let candidates = allPlanes;
      if (surfaceType !== 'any') {
        candidates = allPlanes.filter(
          (p) => getPlaneType(p.semanticLabel) === surfaceType
        );
      }

      if (candidates.length === 0) return null;

      let nearest: SnappedPosition | null = null;
      let minDistance = Infinity;

      for (const plane of candidates) {
        const polygon = plane.polygon;
        if (!polygon || polygon.length === 0) continue;

        // Calculate centroid
        let cx = 0, cy = 0, cz = 0;
        for (const point of polygon) {
          cx += point.x;
          cy += point.y;
          cz += point.z;
        }
        cx /= polygon.length;
        cy /= polygon.length;
        cz /= polygon.length;

        const planeType = getPlaneType(plane.semanticLabel);

        // For floors/tables, snap Y to surface
        // For walls, snap to closest point on wall
        let snappedPos: Vector3;
        let normal: Vector3;

        if (planeType === 'floor' || planeType === 'table') {
          snappedPos = new Vector3(position.x, cy, position.z);
          normal = new Vector3(0, 1, 0);
        } else if (planeType === 'ceiling') {
          snappedPos = new Vector3(position.x, cy, position.z);
          normal = new Vector3(0, -1, 0);
        } else {
          // Wall - project onto wall plane
          snappedPos = new Vector3(cx, position.y, cz);
          normal = new Vector3(0, 0, 1); // Simplified
        }

        const distance = position.distanceTo(snappedPos);

        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            position: snappedPos,
            surfaceType: planeType,
            distanceFromSurface: distance,
            normal,
          };
        }
      }

      return nearest;
    },
    [allPlanes]
  );

  return {
    createAnchor,
    deleteAnchor,
    getNearestSurface,
    snapToSurface,
    isSupported,
    isActive: isPresenting && enabled,
    anchorCount: persistentAnchors.size,
  };
}

export default useSpatialAnchors;
