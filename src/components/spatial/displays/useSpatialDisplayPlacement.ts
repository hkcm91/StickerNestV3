/**
 * StickerNest - Spatial Display Placement Hook
 *
 * Manages placement of SpatialDisplay components on collision surfaces.
 * Uses the collision system for surface detection and snap-to-surface behavior.
 */

import { useCallback, useState, useMemo } from 'react';
import { Vector3, Quaternion } from 'three';
import { useCollisionStore } from '../../../state/useCollisionStore';
import { useCollisionRaycast, useSnapToSurface } from '../collision';
import { calculateRotationFromNormal } from '../../../utils/snapPointGeneration';
import type { CollisionSurface, SnapPoint, SurfaceType } from '../../../types/collisionTypes';
import type { MediaSource } from './SpatialDisplay';

// ============================================================================
// Types
// ============================================================================

export interface PlacedDisplay {
  id: string;
  name: string;
  position: Vector3;
  rotation: Quaternion;
  size: [number, number];
  surfaceId: string | null;
  surfaceType: SurfaceType | null;
  snapPointId: string | null;
  media: MediaSource;
  emissive: boolean;
  showFrame: boolean;
}

export interface DisplayPlacementState {
  /** Currently placed displays */
  displays: Map<string, PlacedDisplay>;

  /** Display being dragged/placed */
  placingDisplay: PlacedDisplay | null;

  /** Whether placement mode is active */
  isPlacing: boolean;

  /** Preview position during placement */
  previewPosition: Vector3 | null;

  /** Preview rotation during placement */
  previewRotation: Quaternion | null;

  /** Target surface during placement */
  targetSurface: CollisionSurface | null;

  /** Target snap point during placement */
  targetSnapPoint: SnapPoint | null;
}

// ============================================================================
// Display ID Generation
// ============================================================================

let displayCounter = 0;

function generateDisplayId(): string {
  return `display_${Date.now()}_${++displayCounter}`;
}

// ============================================================================
// Default Display Configuration
// ============================================================================

const DEFAULT_DISPLAY: Omit<PlacedDisplay, 'id'> = {
  name: 'New Display',
  position: new Vector3(0, 1.5, -2),
  rotation: new Quaternion(),
  size: [1.6, 0.9],
  surfaceId: null,
  surfaceType: null,
  snapPointId: null,
  media: { type: 'color', color: '#111111' },
  emissive: true,
  showFrame: true,
};

// ============================================================================
// Main Hook
// ============================================================================

export interface UseSpatialDisplayPlacementOptions {
  /** Surface types allowed for placement */
  allowedSurfaces?: SurfaceType[];

  /** Auto-snap to nearest surface */
  autoSnap?: boolean;

  /** Offset from surface in meters */
  surfaceOffset?: number;

  /** Default display size */
  defaultSize?: [number, number];

  /** Default emissive setting */
  defaultEmissive?: boolean;
}

export function useSpatialDisplayPlacement(options?: UseSpatialDisplayPlacementOptions) {
  const opts = {
    allowedSurfaces: ['wall', 'door', 'window', 'ceiling', 'floor', 'table', 'custom'] as SurfaceType[],
    autoSnap: true,
    surfaceOffset: 0.01,
    defaultSize: [1.6, 0.9] as [number, number],
    defaultEmissive: true,
    ...options,
  };

  // State
  const [displays, setDisplays] = useState<Map<string, PlacedDisplay>>(new Map());
  const [placingDisplay, setPlacingDisplay] = useState<PlacedDisplay | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  // Collision hooks
  const { raycastFromScreen, raycastFromCamera } = useCollisionRaycast({
    surfaceTypes: opts.allowedSurfaces,
    findSnapPoint: true,
  });

  const snapToSurface = useSnapToSurface({
    surfaceTypes: opts.allowedSurfaces,
  });

  // ============================================================================
  // Placement Actions
  // ============================================================================

  /**
   * Start placing a new display
   */
  const startPlacement = useCallback((initialMedia?: MediaSource) => {
    const id = generateDisplayId();
    const newDisplay: PlacedDisplay = {
      id,
      ...DEFAULT_DISPLAY,
      size: opts.defaultSize,
      emissive: opts.defaultEmissive,
      media: initialMedia || DEFAULT_DISPLAY.media,
    };

    setPlacingDisplay(newDisplay);
    setIsPlacing(true);

    console.log('[DisplayPlacement] Started placement:', id);
  }, [opts.defaultSize, opts.defaultEmissive]);

  /**
   * Update placement position based on raycast
   */
  const updatePlacement = useCallback((screenX: number, screenY: number) => {
    if (!placingDisplay) return null;

    const result = raycastFromScreen(new (window as any).THREE.Vector2(screenX, screenY));

    if (result.hit && result.surface) {
      // Calculate position with offset from surface
      const offsetPosition = result.point.clone().add(
        result.normal.clone().multiplyScalar(opts.surfaceOffset)
      );

      // Calculate rotation to face away from surface
      const rotation = calculateRotationFromNormal(result.normal);

      // Update placing display
      const updated: PlacedDisplay = {
        ...placingDisplay,
        position: offsetPosition,
        rotation,
        surfaceId: result.surface.id,
        surfaceType: result.surface.type,
        snapPointId: result.snapPoint?.id || null,
      };

      setPlacingDisplay(updated);

      return {
        position: offsetPosition,
        rotation,
        surface: result.surface,
        snapPoint: result.snapPoint,
      };
    }

    return null;
  }, [placingDisplay, raycastFromScreen, opts.surfaceOffset]);

  /**
   * Update placement from VR controller/gaze
   */
  const updatePlacementFromCamera = useCallback(() => {
    if (!placingDisplay) return null;

    const result = raycastFromCamera();

    if (result.hit && result.surface) {
      const offsetPosition = result.point.clone().add(
        result.normal.clone().multiplyScalar(opts.surfaceOffset)
      );

      const rotation = calculateRotationFromNormal(result.normal);

      const updated: PlacedDisplay = {
        ...placingDisplay,
        position: offsetPosition,
        rotation,
        surfaceId: result.surface.id,
        surfaceType: result.surface.type,
        snapPointId: result.snapPoint?.id || null,
      };

      setPlacingDisplay(updated);

      return {
        position: offsetPosition,
        rotation,
        surface: result.surface,
        snapPoint: result.snapPoint,
      };
    }

    return null;
  }, [placingDisplay, raycastFromCamera, opts.surfaceOffset]);

  /**
   * Confirm placement and add display
   */
  const confirmPlacement = useCallback(() => {
    if (!placingDisplay) return null;

    // Add to displays map
    setDisplays((prev) => {
      const next = new Map(prev);
      next.set(placingDisplay.id, placingDisplay);
      return next;
    });

    const placed = placingDisplay;
    setPlacingDisplay(null);
    setIsPlacing(false);

    console.log('[DisplayPlacement] Confirmed:', placed.id, 'on', placed.surfaceType);

    return placed;
  }, [placingDisplay]);

  /**
   * Cancel current placement
   */
  const cancelPlacement = useCallback(() => {
    setPlacingDisplay(null);
    setIsPlacing(false);
    console.log('[DisplayPlacement] Cancelled');
  }, []);

  /**
   * Remove a placed display
   */
  const removeDisplay = useCallback((displayId: string) => {
    setDisplays((prev) => {
      const next = new Map(prev);
      next.delete(displayId);
      return next;
    });
    console.log('[DisplayPlacement] Removed:', displayId);
  }, []);

  /**
   * Update display media
   */
  const updateDisplayMedia = useCallback((displayId: string, media: MediaSource) => {
    setDisplays((prev) => {
      const display = prev.get(displayId);
      if (!display) return prev;

      const next = new Map(prev);
      next.set(displayId, { ...display, media });
      return next;
    });
  }, []);

  /**
   * Update display properties
   */
  const updateDisplay = useCallback((displayId: string, updates: Partial<PlacedDisplay>) => {
    setDisplays((prev) => {
      const display = prev.get(displayId);
      if (!display) return prev;

      const next = new Map(prev);
      next.set(displayId, { ...display, ...updates });
      return next;
    });
  }, []);

  /**
   * Get displays grouped by surface type
   */
  const displaysBySurface = useMemo(() => {
    const grouped: Record<string, PlacedDisplay[]> = {};

    for (const display of displays.values()) {
      const key = display.surfaceType || 'floating';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(display);
    }

    return grouped;
  }, [displays]);

  /**
   * Get all display IDs
   */
  const displayIds = useMemo(() => {
    return Array.from(displays.keys());
  }, [displays]);

  return {
    // State
    displays,
    displayIds,
    displaysBySurface,
    placingDisplay,
    isPlacing,

    // Placement actions
    startPlacement,
    updatePlacement,
    updatePlacementFromCamera,
    confirmPlacement,
    cancelPlacement,

    // Display management
    removeDisplay,
    updateDisplay,
    updateDisplayMedia,

    // Helpers
    getDisplay: (id: string) => displays.get(id),
    hasDisplay: (id: string) => displays.has(id),
    displayCount: displays.size,
  };
}

export default useSpatialDisplayPlacement;
