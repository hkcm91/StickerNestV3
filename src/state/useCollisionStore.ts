/**
 * StickerNest - Collision Store
 *
 * Zustand store for managing collision surfaces from all sources:
 * - WebXR plane detection
 * - WebXR mesh detection
 * - Custom 3D environments
 * - Manual definitions
 *
 * Provides a unified interface for surface queries regardless of source,
 * with priority-based selection when multiple surfaces overlap.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { Vector3, Quaternion, Box3 } from 'three';
import type {
  CollisionSurface,
  CollisionEnvironment,
  SnapPoint,
  SnapConfig,
  ActiveSnapState,
  SurfaceType,
  SurfaceSource,
  CollisionRaycastResult,
  DEFAULT_SNAP_CONFIG,
  DEFAULT_ACTIVE_SNAP_STATE,
  SURFACE_SOURCE_PRIORITIES,
} from '../types/collisionTypes';

// ============================================================================
// Store Interface
// ============================================================================

interface CollisionState {
  // === Surface Registry ===

  /** All registered collision surfaces */
  surfaces: Map<string, CollisionSurface>;

  /** IDs of currently active surfaces (for quick filtering) */
  activeSurfaceIds: Set<string>;

  // === Environment Management ===

  /** Loaded 3D environments */
  environments: Map<string, CollisionEnvironment>;

  /** Currently active environment ID */
  activeEnvironmentId: string | null;

  // === Snap Configuration ===

  /** Snap settings */
  snapConfig: SnapConfig;

  /** Current snapping state (during drag operations) */
  activeSnap: ActiveSnapState;

  // === Debug ===

  /** Show debug visualization */
  showDebugVisualization: boolean;

  /** Last raycast result (for debugging) */
  lastRaycastResult: CollisionRaycastResult | null;
}

interface CollisionActions {
  // === Surface Registration ===

  /** Register a new collision surface */
  registerSurface: (surface: CollisionSurface) => void;

  /** Register multiple surfaces at once */
  registerSurfaces: (surfaces: CollisionSurface[]) => void;

  /** Unregister a surface by ID */
  unregisterSurface: (id: string) => void;

  /** Update an existing surface */
  updateSurface: (id: string, updates: Partial<CollisionSurface>) => void;

  /** Clear all surfaces from a specific source */
  clearSurfacesBySource: (source: SurfaceSource) => void;

  /** Set active state for a surface */
  setSurfaceActive: (id: string, active: boolean) => void;

  // === Environment Management ===

  /** Register a new environment */
  registerEnvironment: (environment: CollisionEnvironment) => void;

  /** Set the active environment */
  setActiveEnvironment: (id: string | null) => void;

  /** Update environment loading state */
  updateEnvironmentLoadState: (
    id: string,
    state: CollisionEnvironment['loadState'],
    error?: string
  ) => void;

  /** Register surfaces from an environment */
  registerEnvironmentSurfaces: (environmentId: string, surfaces: CollisionSurface[]) => void;

  /** Clear all surfaces from an environment */
  clearEnvironmentSurfaces: (environmentId: string) => void;

  /** Remove an environment and its surfaces */
  removeEnvironment: (id: string) => void;

  // === Snap Configuration ===

  /** Update snap configuration */
  setSnapConfig: (config: Partial<SnapConfig>) => void;

  /** Enable/disable snapping */
  setSnapEnabled: (enabled: boolean) => void;

  /** Set snap threshold (distance in meters) */
  setSnapThreshold: (threshold: number) => void;

  // === Active Snapping ===

  /** Start a snapping operation */
  startSnapping: (targetId: string) => void;

  /** Update snap state during drag */
  updateSnapState: (
    position: Vector3,
    snapPoint: SnapPoint | null,
    surface: CollisionSurface | null
  ) => void;

  /** End snapping operation */
  endSnapping: () => void;

  // === Queries ===

  /** Get all surfaces of a specific type */
  getSurfacesByType: (type: SurfaceType) => CollisionSurface[];

  /** Get all surfaces from a specific source */
  getSurfacesBySource: (source: SurfaceSource) => CollisionSurface[];

  /** Get all active surfaces */
  getActiveSurfaces: () => CollisionSurface[];

  /** Find nearest surface to a position */
  getNearestSurface: (
    position: Vector3,
    options?: {
      maxDistance?: number;
      types?: SurfaceType[];
      sources?: SurfaceSource[];
    }
  ) => CollisionSurface | null;

  /** Find nearest snap point to a position */
  getNearestSnapPoint: (
    position: Vector3,
    options?: {
      maxDistance?: number;
      surfaceTypes?: SurfaceType[];
    }
  ) => { snapPoint: SnapPoint; surface: CollisionSurface } | null;

  /** Find all surfaces within a bounding box */
  getSurfacesInBounds: (bounds: Box3) => CollisionSurface[];

  // === Debug ===

  /** Toggle debug visualization */
  setShowDebugVisualization: (show: boolean) => void;

  /** Store last raycast result for debugging */
  setLastRaycastResult: (result: CollisionRaycastResult | null) => void;

  /** Reset the store to initial state */
  reset: () => void;
}

type CollisionStore = CollisionState & CollisionActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: CollisionState = {
  surfaces: new Map(),
  activeSurfaceIds: new Set(),
  environments: new Map(),
  activeEnvironmentId: null,
  snapConfig: {
    enabled: true,
    threshold: 0.15,
    surfaceTypes: [],
    showIndicators: true,
    showDebug: false,
  },
  activeSnap: {
    isSnapping: false,
    targetId: null,
    snapPoint: null,
    surface: null,
    previewPosition: null,
    previewRotation: null,
  },
  showDebugVisualization: false,
  lastRaycastResult: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useCollisionStore = create<CollisionStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // === Surface Registration ===

      registerSurface: (surface) => {
        set((state) => {
          const newSurfaces = new Map(state.surfaces);
          newSurfaces.set(surface.id, surface);

          const newActiveIds = new Set(state.activeSurfaceIds);
          if (surface.active) {
            newActiveIds.add(surface.id);
          }

          return { surfaces: newSurfaces, activeSurfaceIds: newActiveIds };
        });
      },

      registerSurfaces: (surfaces) => {
        set((state) => {
          const newSurfaces = new Map(state.surfaces);
          const newActiveIds = new Set(state.activeSurfaceIds);

          for (const surface of surfaces) {
            newSurfaces.set(surface.id, surface);
            if (surface.active) {
              newActiveIds.add(surface.id);
            }
          }

          return { surfaces: newSurfaces, activeSurfaceIds: newActiveIds };
        });
      },

      unregisterSurface: (id) => {
        set((state) => {
          const newSurfaces = new Map(state.surfaces);
          newSurfaces.delete(id);

          const newActiveIds = new Set(state.activeSurfaceIds);
          newActiveIds.delete(id);

          return { surfaces: newSurfaces, activeSurfaceIds: newActiveIds };
        });
      },

      updateSurface: (id, updates) => {
        set((state) => {
          const surface = state.surfaces.get(id);
          if (!surface) return state;

          const newSurfaces = new Map(state.surfaces);
          newSurfaces.set(id, { ...surface, ...updates, updatedAt: Date.now() });

          const newActiveIds = new Set(state.activeSurfaceIds);
          if (updates.active !== undefined) {
            if (updates.active) {
              newActiveIds.add(id);
            } else {
              newActiveIds.delete(id);
            }
          }

          return { surfaces: newSurfaces, activeSurfaceIds: newActiveIds };
        });
      },

      clearSurfacesBySource: (source) => {
        set((state) => {
          const newSurfaces = new Map(state.surfaces);
          const newActiveIds = new Set(state.activeSurfaceIds);

          for (const [id, surface] of newSurfaces) {
            if (surface.source === source) {
              newSurfaces.delete(id);
              newActiveIds.delete(id);
            }
          }

          return { surfaces: newSurfaces, activeSurfaceIds: newActiveIds };
        });
      },

      setSurfaceActive: (id, active) => {
        set((state) => {
          const surface = state.surfaces.get(id);
          if (!surface) return state;

          const newSurfaces = new Map(state.surfaces);
          newSurfaces.set(id, { ...surface, active, updatedAt: Date.now() });

          const newActiveIds = new Set(state.activeSurfaceIds);
          if (active) {
            newActiveIds.add(id);
          } else {
            newActiveIds.delete(id);
          }

          return { surfaces: newSurfaces, activeSurfaceIds: newActiveIds };
        });
      },

      // === Environment Management ===

      registerEnvironment: (environment) => {
        set((state) => {
          const newEnvironments = new Map(state.environments);
          newEnvironments.set(environment.id, environment);
          return { environments: newEnvironments };
        });
      },

      setActiveEnvironment: (id) => {
        set({ activeEnvironmentId: id });
      },

      updateEnvironmentLoadState: (id, loadState, error) => {
        set((state) => {
          const environment = state.environments.get(id);
          if (!environment) return state;

          const newEnvironments = new Map(state.environments);
          newEnvironments.set(id, { ...environment, loadState, error });
          return { environments: newEnvironments };
        });
      },

      registerEnvironmentSurfaces: (environmentId, surfaces) => {
        set((state) => {
          const environment = state.environments.get(environmentId);
          if (!environment) return state;

          const newSurfaces = new Map(state.surfaces);
          const newActiveIds = new Set(state.activeSurfaceIds);
          const surfaceIds: string[] = [];

          for (const surface of surfaces) {
            // Ensure environment ID is set
            const surfaceWithEnv = {
              ...surface,
              environmentId,
              source: 'environment' as const,
            };
            newSurfaces.set(surface.id, surfaceWithEnv);
            surfaceIds.push(surface.id);

            if (surface.active) {
              newActiveIds.add(surface.id);
            }
          }

          // Update environment with surface IDs
          const newEnvironments = new Map(state.environments);
          newEnvironments.set(environmentId, {
            ...environment,
            surfaceIds: [...environment.surfaceIds, ...surfaceIds],
          });

          return {
            surfaces: newSurfaces,
            activeSurfaceIds: newActiveIds,
            environments: newEnvironments,
          };
        });
      },

      clearEnvironmentSurfaces: (environmentId) => {
        set((state) => {
          const environment = state.environments.get(environmentId);
          if (!environment) return state;

          const newSurfaces = new Map(state.surfaces);
          const newActiveIds = new Set(state.activeSurfaceIds);

          for (const surfaceId of environment.surfaceIds) {
            newSurfaces.delete(surfaceId);
            newActiveIds.delete(surfaceId);
          }

          const newEnvironments = new Map(state.environments);
          newEnvironments.set(environmentId, { ...environment, surfaceIds: [] });

          return {
            surfaces: newSurfaces,
            activeSurfaceIds: newActiveIds,
            environments: newEnvironments,
          };
        });
      },

      removeEnvironment: (id) => {
        const { clearEnvironmentSurfaces } = get();
        clearEnvironmentSurfaces(id);

        set((state) => {
          const newEnvironments = new Map(state.environments);
          newEnvironments.delete(id);

          const newActiveEnvironmentId =
            state.activeEnvironmentId === id ? null : state.activeEnvironmentId;

          return {
            environments: newEnvironments,
            activeEnvironmentId: newActiveEnvironmentId,
          };
        });
      },

      // === Snap Configuration ===

      setSnapConfig: (config) => {
        set((state) => ({
          snapConfig: { ...state.snapConfig, ...config },
        }));
      },

      setSnapEnabled: (enabled) => {
        set((state) => ({
          snapConfig: { ...state.snapConfig, enabled },
        }));
      },

      setSnapThreshold: (threshold) => {
        set((state) => ({
          snapConfig: { ...state.snapConfig, threshold },
        }));
      },

      // === Active Snapping ===

      startSnapping: (targetId) => {
        set({
          activeSnap: {
            isSnapping: true,
            targetId,
            snapPoint: null,
            surface: null,
            previewPosition: null,
            previewRotation: null,
          },
        });
      },

      updateSnapState: (position, snapPoint, surface) => {
        set((state) => ({
          activeSnap: {
            ...state.activeSnap,
            snapPoint,
            surface,
            previewPosition: snapPoint?.position ?? position,
            previewRotation: snapPoint?.rotation ?? null,
          },
        }));
      },

      endSnapping: () => {
        set({
          activeSnap: {
            isSnapping: false,
            targetId: null,
            snapPoint: null,
            surface: null,
            previewPosition: null,
            previewRotation: null,
          },
        });
      },

      // === Queries ===

      getSurfacesByType: (type) => {
        const { surfaces } = get();
        return Array.from(surfaces.values()).filter((s) => s.type === type && s.active);
      },

      getSurfacesBySource: (source) => {
        const { surfaces } = get();
        return Array.from(surfaces.values()).filter((s) => s.source === source && s.active);
      },

      getActiveSurfaces: () => {
        const { surfaces, activeSurfaceIds } = get();
        return Array.from(activeSurfaceIds)
          .map((id) => surfaces.get(id))
          .filter((s): s is CollisionSurface => s !== undefined);
      },

      getNearestSurface: (position, options = {}) => {
        const { maxDistance = 10, types, sources } = options;
        const { surfaces } = get();

        let nearest: CollisionSurface | null = null;
        let minDist = maxDistance;

        for (const surface of surfaces.values()) {
          // Skip inactive surfaces
          if (!surface.active) continue;

          // Filter by type if specified
          if (types && types.length > 0 && !types.includes(surface.type)) continue;

          // Filter by source if specified
          if (sources && sources.length > 0 && !sources.includes(surface.source)) continue;

          // Calculate distance to centroid
          const dist = position.distanceTo(surface.centroid);

          if (dist < minDist) {
            minDist = dist;
            nearest = surface;
          }
        }

        return nearest;
      },

      getNearestSnapPoint: (position, options = {}) => {
        const { maxDistance, surfaceTypes } = options;
        const { surfaces, snapConfig } = get();

        const threshold = maxDistance ?? snapConfig.threshold;

        let nearestPoint: SnapPoint | null = null;
        let nearestSurface: CollisionSurface | null = null;
        let minDist = threshold;

        for (const surface of surfaces.values()) {
          // Skip inactive surfaces
          if (!surface.active) continue;

          // Filter by type if specified
          if (surfaceTypes && surfaceTypes.length > 0 && !surfaceTypes.includes(surface.type)) {
            continue;
          }

          // Check all snap points on this surface
          for (const snapPoint of surface.snapPoints) {
            const dist = position.distanceTo(snapPoint.position);

            if (dist < minDist) {
              minDist = dist;
              nearestPoint = snapPoint;
              nearestSurface = surface;
            }
          }
        }

        if (nearestPoint && nearestSurface) {
          return { snapPoint: nearestPoint, surface: nearestSurface };
        }

        return null;
      },

      getSurfacesInBounds: (bounds) => {
        const { surfaces } = get();
        return Array.from(surfaces.values()).filter(
          (s) => s.active && bounds.intersectsBox(s.boundingBox)
        );
      },

      // === Debug ===

      setShowDebugVisualization: (show) => {
        set({ showDebugVisualization: show });
      },

      setLastRaycastResult: (result) => {
        set({ lastRaycastResult: result });
      },

      reset: () => {
        set(initialState);
      },
    })),
    { name: 'collision-store' }
  )
);

// ============================================================================
// Selectors (for optimized subscriptions)
// ============================================================================

/** Select snap configuration */
export const selectSnapConfig = (state: CollisionStore) => state.snapConfig;

/** Select active snap state */
export const selectActiveSnap = (state: CollisionStore) => state.activeSnap;

/** Select whether snapping is enabled */
export const selectSnapEnabled = (state: CollisionStore) => state.snapConfig.enabled;

/** Select snap threshold */
export const selectSnapThreshold = (state: CollisionStore) => state.snapConfig.threshold;

/** Select active environment ID */
export const selectActiveEnvironmentId = (state: CollisionStore) => state.activeEnvironmentId;

/** Select surface count */
export const selectSurfaceCount = (state: CollisionStore) => state.surfaces.size;

/** Select active surface count */
export const selectActiveSurfaceCount = (state: CollisionStore) => state.activeSurfaceIds.size;

/** Select debug visualization state */
export const selectShowDebug = (state: CollisionStore) => state.showDebugVisualization;

// ============================================================================
// Convenience Hooks
// ============================================================================

/** Get snap configuration */
export function useSnapConfig() {
  return useCollisionStore(selectSnapConfig);
}

/** Get active snap state */
export function useActiveSnap() {
  return useCollisionStore(selectActiveSnap);
}

/** Check if snapping is enabled */
export function useSnapEnabled() {
  return useCollisionStore(selectSnapEnabled);
}

/** Get active environment ID */
export function useActiveEnvironmentId() {
  return useCollisionStore(selectActiveEnvironmentId);
}

/** Get surface count stats */
export function useSurfaceStats() {
  const total = useCollisionStore(selectSurfaceCount);
  const active = useCollisionStore(selectActiveSurfaceCount);
  return { total, active };
}

export default useCollisionStore;
