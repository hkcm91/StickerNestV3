/**
 * StickerNest - Collision Detection Module
 *
 * Provides unified collision detection and surface snapping for VR/AR.
 *
 * Architecture:
 * - Collision Store: Unified registry of all collision surfaces
 * - XR Surface Bridge: Bridges WebXR planes/meshes to collision store
 * - Collision Raycast: BVH-accelerated raycasting against surfaces
 * - Snap Points: Pre-computed positions where widgets can attach
 * - Visual Feedback: Snap indicators, surface highlights, placement previews
 *
 * Usage:
 * ```tsx
 * import {
 *   useCollisionStore,
 *   useXRSurfaceBridge,
 *   useCollisionRaycast,
 *   useSnapToSurface,
 *   ActiveSnapFeedback,
 *   CollisionDebugView,
 * } from './components/spatial/collision';
 *
 * function ARScene() {
 *   // Bridge XR planes to collision store
 *   useXRSurfaceBridge({ enablePlanes: true });
 *
 *   // Raycast against all surfaces
 *   const { raycast } = useCollisionRaycast();
 *
 *   // Get nearest surface
 *   const getNearestSurface = useCollisionStore((s) => s.getNearestSurface);
 *
 *   return (
 *     <group>
 *       {/* Visual snap feedback during drag */}
 *       <ActiveSnapFeedback />
 *       {/* Debug visualization (enable via store) */}
 *       <CollisionDebugView />
 *     </group>
 *   );
 * }
 * ```
 */

// Store
export { useCollisionStore, useSnapConfig, useActiveSnap, useSnapEnabled, useActiveEnvironmentId, useSurfaceStats } from '../../../state/useCollisionStore';
export type { } from '../../../state/useCollisionStore';

// Types
export type {
  CollisionSurface,
  CollisionEnvironment,
  SnapPoint,
  SnapConfig,
  ActiveSnapState,
  SurfaceType,
  SurfaceSource,
  SnapPointType,
  CollisionRaycastResult,
  EnvironmentAlignmentAnchor,
} from '../../../types/collisionTypes';

export {
  generateSurfaceId,
  generateSnapPointId,
  isXRSurface,
  isEnvironmentSurface,
  isHorizontalSurface,
  isVerticalSurface,
  DEFAULT_SNAP_CONFIG,
  DEFAULT_ACTIVE_SNAP_STATE,
  SURFACE_SOURCE_PRIORITIES,
} from '../../../types/collisionTypes';

// Hooks
export {
  useXRSurfaceBridge,
  type XRSurfaceBridgeOptions,
} from './useXRSurfaceBridge';

export {
  useCollisionRaycast,
  useSnapToSurface,
  type CollisionRaycastOptions,
  type UseCollisionRaycastResult,
} from './useCollisionRaycast';

// Utilities
export {
  initializeBVH,
  isBVHInitialized,
  computeMeshBVH,
  disposeMeshBVH,
  recomputeMeshBVH,
  hasBVH,
  computeBVHForScene,
  disposeBVHForScene,
  createBVHHelper,
  DEFAULT_BVH_OPTIONS,
  FAST_BUILD_BVH_OPTIONS,
  type BVHOptions,
} from '../../../utils/bvhSetup';

export {
  generateSnapPoints,
  generateSnapPointsFromGeometry,
  generateSnapPointsFromXRPolygon,
  calculateRotationFromNormal,
  calculateBillboardRotation,
  findClosestSnapPoint,
  projectPointOntoPlane,
  type SnapPointGenerationOptions,
} from '../../../utils/snapPointGeneration';

// Visual Feedback Components
export {
  SnapPointIndicator,
  SurfaceHighlight,
  SnapPreview,
  SnapGuideLine,
  ActiveSnapFeedback,
  CollisionDebugView,
  SURFACE_COLORS,
  SNAP_ACTIVE_COLOR,
  SNAP_PREVIEW_COLOR,
  type SnapPointIndicatorProps,
  type SurfaceHighlightProps,
  type SnapPreviewProps,
  type SnapGuideLineProps,
  type ActiveSnapFeedbackProps,
  type CollisionDebugViewProps,
} from './SnapIndicators';
