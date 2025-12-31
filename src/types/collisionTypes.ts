/**
 * StickerNest - Collision & Surface Types
 *
 * Types for the unified collision detection and surface snapping system.
 * Supports surfaces from multiple sources: WebXR planes, WebXR meshes,
 * custom 3D environments, and manual definitions.
 *
 * Core Concept: All collision surfaces are unified into a single registry
 * with priority-based selection (XR > environment > manual).
 */

import type { Mesh, Vector3, Quaternion, Box3, BufferGeometry } from 'three';

// ============================================================================
// Surface Types
// ============================================================================

/** Semantic type of a collision surface */
export type SurfaceType =
  | 'wall'
  | 'floor'
  | 'ceiling'
  | 'table'
  | 'couch'
  | 'door'
  | 'window'
  | 'custom';

/** Source of the collision surface */
export type SurfaceSource =
  | 'xr-plane'      // WebXR plane detection
  | 'xr-mesh'       // WebXR mesh detection (Quest 3+)
  | 'environment'   // Custom 3D environment
  | 'manual';       // Manually defined

/**
 * CollisionSurface - A surface that can be used for collision detection and snapping
 *
 * Surfaces can come from various sources but are unified into this single type
 * for consistent handling throughout the application.
 */
export interface CollisionSurface {
  /** Unique identifier */
  id: string;

  /** Semantic type of the surface */
  type: SurfaceType;

  /** Where this surface came from */
  source: SurfaceSource;

  /**
   * Priority for surface selection (higher = prefer)
   * Default priorities:
   * - xr-plane: 100
   * - xr-mesh: 90
   * - environment: 50
   * - manual: 10
   */
  priority: number;

  // === Geometry ===

  /** Reference to Three.js mesh for raycasting (null for XR planes without mesh) */
  mesh: Mesh | null;

  /** Bounding box in world space */
  boundingBox: Box3;

  /** Center point of the surface in world space */
  centroid: Vector3;

  /** Surface normal (points outward from surface) */
  normal: Vector3;

  /** Surface area in square meters (approximate) */
  area?: number;

  // === Snap Points ===

  /** Pre-computed snap points on this surface */
  snapPoints: SnapPoint[];

  /** Grid spacing for snap points (if using grid) */
  snapGridSize?: number;

  // === Source Tracking ===

  /** Environment ID if from custom environment */
  environmentId?: string;

  /** XR plane reference (for updates) */
  xrPlaneSpace?: XRSpace;

  /** XR mesh reference (for updates) */
  xrMeshSpace?: XRSpace;

  // === Metadata ===

  /** Human-readable label */
  label?: string;

  /** Semantic label from XR (e.g., 'TABLE', 'WALL_FACE') */
  semanticLabel?: string;

  /** Confidence score (0-1) for XR-detected surfaces */
  confidence?: number;

  /** Whether this surface is currently active/visible */
  active: boolean;

  /** Last update timestamp */
  updatedAt: number;
}

// ============================================================================
// Snap Points
// ============================================================================

/** Type of snap point */
export type SnapPointType =
  | 'center'   // Center of the surface
  | 'corner'   // Corner of bounding box
  | 'edge'     // Midpoint of an edge
  | 'grid';    // Point on a regular grid

/**
 * SnapPoint - A position on a surface where widgets can snap to
 */
export interface SnapPoint {
  /** Unique identifier */
  id: string;

  /** Parent surface ID */
  surfaceId: string;

  /** World-space position */
  position: Vector3;

  /** Surface normal at this point */
  normal: Vector3;

  /** Rotation to face away from surface */
  rotation: Quaternion;

  /** Type of snap point */
  type: SnapPointType;

  /** Grid coordinates (if type is 'grid') */
  gridCoords?: { x: number; y: number };
}

// ============================================================================
// Raycast Results
// ============================================================================

/**
 * Result of a collision raycast
 */
export interface CollisionRaycastResult {
  /** Whether the ray hit anything */
  hit: boolean;

  /** World-space hit point */
  point: Vector3;

  /** Surface normal at hit point */
  normal: Vector3;

  /** Distance from ray origin */
  distance: number;

  /** The surface that was hit (null if no hit) */
  surface: CollisionSurface | null;

  /** Nearest snap point within threshold (null if none) */
  snapPoint: SnapPoint | null;

  /** Face index on the mesh (for debugging) */
  faceIndex?: number;
}

// ============================================================================
// Environment Types
// ============================================================================

/**
 * A loaded 3D environment that provides collision surfaces
 */
export interface CollisionEnvironment {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** URL to the GLTF/GLB model */
  modelUrl: string;

  /** World-space transform */
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  };

  /** IDs of collision surfaces extracted from this environment */
  surfaceIds: string[];

  /** Alignment anchors for AR positioning */
  alignmentAnchors: EnvironmentAlignmentAnchor[];

  /** Loading state */
  loadState: 'idle' | 'loading' | 'loaded' | 'error';

  /** Error message if loadState is 'error' */
  error?: string;

  /** Thumbnail image URL */
  thumbnailUrl?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Anchor point for aligning environment to real world in AR
 */
export interface EnvironmentAlignmentAnchor {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Position in environment-local coordinates */
  localPosition: [number, number, number];

  /** Rotation in environment-local coordinates */
  localRotation: [number, number, number, number];

  /** Type of marker for alignment */
  markerType: 'qr' | 'image' | 'manual';

  /** QR code content or image URL for marker */
  markerData?: string;
}

// ============================================================================
// Store State Types
// ============================================================================

/**
 * Snapping configuration
 */
export interface SnapConfig {
  /** Whether snapping is enabled */
  enabled: boolean;

  /** Distance threshold for snapping (meters) */
  threshold: number;

  /** Surface types to snap to (empty = all) */
  surfaceTypes: SurfaceType[];

  /** Whether to show visual feedback during snapping */
  showIndicators: boolean;

  /** Whether to show debug visualization */
  showDebug: boolean;
}

/**
 * Current snapping state during a drag operation
 */
export interface ActiveSnapState {
  /** Whether currently in a snapping operation */
  isSnapping: boolean;

  /** The widget/sticker being snapped */
  targetId: string | null;

  /** Current candidate snap point */
  snapPoint: SnapPoint | null;

  /** Current target surface */
  surface: CollisionSurface | null;

  /** Preview position (where object will snap to) */
  previewPosition: Vector3 | null;

  /** Preview rotation (how object will be oriented) */
  previewRotation: Quaternion | null;
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  threshold: 0.15, // 15cm
  surfaceTypes: [], // All types
  showIndicators: true,
  showDebug: false,
};

export const DEFAULT_ACTIVE_SNAP_STATE: ActiveSnapState = {
  isSnapping: false,
  targetId: null,
  snapPoint: null,
  surface: null,
  previewPosition: null,
  previewRotation: null,
};

/** Default priorities for surface sources */
export const SURFACE_SOURCE_PRIORITIES: Record<SurfaceSource, number> = {
  'xr-plane': 100,
  'xr-mesh': 90,
  'environment': 50,
  'manual': 10,
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate a unique collision surface ID
 */
export function generateSurfaceId(source: SurfaceSource, hint?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  const hintPart = hint ? `-${hint}` : '';
  return `surface-${source}${hintPart}-${timestamp}-${random}`;
}

/**
 * Generate a unique snap point ID
 */
export function generateSnapPointId(surfaceId: string, type: SnapPointType, index?: number): string {
  const indexPart = index !== undefined ? `-${index}` : '';
  return `${surfaceId}-snap-${type}${indexPart}`;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isXRSurface(surface: CollisionSurface): boolean {
  return surface.source === 'xr-plane' || surface.source === 'xr-mesh';
}

export function isEnvironmentSurface(surface: CollisionSurface): boolean {
  return surface.source === 'environment';
}

export function isHorizontalSurface(surface: CollisionSurface): boolean {
  return surface.type === 'floor' || surface.type === 'ceiling' || surface.type === 'table';
}

export function isVerticalSurface(surface: CollisionSurface): boolean {
  return surface.type === 'wall' || surface.type === 'door' || surface.type === 'window';
}
