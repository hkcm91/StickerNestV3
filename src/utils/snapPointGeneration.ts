/**
 * StickerNest - Snap Point Generation
 *
 * Generates snap points on collision surfaces where widgets can attach.
 * Snap points provide:
 * - Position: Where the widget will be placed
 * - Normal: Direction the surface faces (for orientation)
 * - Rotation: Quaternion to orient widget facing outward from surface
 */

import {
  Vector3,
  Quaternion,
  Matrix4,
  Box3,
  BufferGeometry,
  Mesh,
  Euler,
} from 'three';
import type {
  SnapPoint,
  SnapPointType,
  SurfaceType,
  CollisionSurface,
} from '../types/collisionTypes';
import { generateSnapPointId } from '../types/collisionTypes';

// ============================================================================
// Configuration
// ============================================================================

export interface SnapPointGenerationOptions {
  /** Include center snap point (default: true) */
  includeCenter?: boolean;

  /** Include corner snap points (default: true) */
  includeCorners?: boolean;

  /** Include edge midpoint snap points (default: false) */
  includeEdges?: boolean;

  /** Include grid snap points (default: false) */
  includeGrid?: boolean;

  /** Grid spacing in meters (default: 0.25) */
  gridSpacing?: number;

  /** Minimum surface area to generate grid points (default: 0.5 m²) */
  minAreaForGrid?: number;

  /** Offset distance from surface along normal (default: 0.001) */
  normalOffset?: number;
}

const DEFAULT_OPTIONS: Required<SnapPointGenerationOptions> = {
  includeCenter: true,
  includeCorners: true,
  includeEdges: false,
  includeGrid: false,
  gridSpacing: 0.25,
  minAreaForGrid: 0.5,
  normalOffset: 0.001, // 1mm offset to prevent z-fighting
};

// ============================================================================
// Main Generation Function
// ============================================================================

/**
 * Generate snap points for a collision surface.
 *
 * @param surface - The collision surface to generate snap points for
 * @param options - Generation options
 * @returns Array of snap points
 */
export function generateSnapPoints(
  surface: CollisionSurface,
  options?: SnapPointGenerationOptions
): SnapPoint[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const snapPoints: SnapPoint[] = [];

  // Use provided normal or calculate from surface type
  const normal = surface.normal.clone().normalize();
  const rotation = calculateRotationFromNormal(normal, surface.type);

  // Center snap point
  if (opts.includeCenter) {
    const centerPos = surface.centroid.clone();
    centerPos.addScaledVector(normal, opts.normalOffset);

    snapPoints.push({
      id: generateSnapPointId(surface.id, 'center'),
      surfaceId: surface.id,
      position: centerPos,
      normal: normal.clone(),
      rotation: rotation.clone(),
      type: 'center',
    });
  }

  // Corner snap points from bounding box
  if (opts.includeCorners && surface.boundingBox) {
    const corners = getBoundingBoxCorners(surface.boundingBox);

    corners.forEach((corner, index) => {
      // Offset slightly from surface
      const cornerPos = corner.clone();
      cornerPos.addScaledVector(normal, opts.normalOffset);

      snapPoints.push({
        id: generateSnapPointId(surface.id, 'corner', index),
        surfaceId: surface.id,
        position: cornerPos,
        normal: normal.clone(),
        rotation: rotation.clone(),
        type: 'corner',
      });
    });
  }

  // Edge midpoint snap points
  if (opts.includeEdges && surface.boundingBox) {
    const edges = getBoundingBoxEdgeMidpoints(surface.boundingBox);

    edges.forEach((edge, index) => {
      const edgePos = edge.clone();
      edgePos.addScaledVector(normal, opts.normalOffset);

      snapPoints.push({
        id: generateSnapPointId(surface.id, 'edge', index),
        surfaceId: surface.id,
        position: edgePos,
        normal: normal.clone(),
        rotation: rotation.clone(),
        type: 'edge',
      });
    });
  }

  // Grid snap points
  if (opts.includeGrid && surface.boundingBox) {
    const area = calculateSurfaceArea(surface.boundingBox, surface.type);

    if (area >= opts.minAreaForGrid) {
      const gridPoints = generateGridPoints(
        surface.boundingBox,
        surface.type,
        normal,
        opts.gridSpacing,
        opts.normalOffset
      );

      gridPoints.forEach((gridPoint, index) => {
        snapPoints.push({
          id: generateSnapPointId(surface.id, 'grid', index),
          surfaceId: surface.id,
          position: gridPoint.position,
          normal: normal.clone(),
          rotation: rotation.clone(),
          type: 'grid',
          gridCoords: gridPoint.coords,
        });
      });
    }
  }

  return snapPoints;
}

// ============================================================================
// Rotation Calculation
// ============================================================================

/**
 * Calculate rotation quaternion to orient content facing outward from surface.
 *
 * The resulting rotation will:
 * - For walls: Face into the room (away from wall)
 * - For floors: Face upward
 * - For ceilings: Face downward
 * - For tables: Face upward
 */
export function calculateRotationFromNormal(
  normal: Vector3,
  surfaceType?: SurfaceType
): Quaternion {
  const quaternion = new Quaternion();

  // Handle special cases based on surface type
  if (surfaceType === 'floor' || surfaceType === 'table') {
    // Content should lie flat on horizontal surface, facing up
    // Rotate -90 degrees around X axis
    quaternion.setFromEuler(new Euler(-Math.PI / 2, 0, 0));
    return quaternion;
  }

  if (surfaceType === 'ceiling') {
    // Content should hang from ceiling, facing down
    // Rotate 90 degrees around X axis
    quaternion.setFromEuler(new Euler(Math.PI / 2, 0, 0));
    return quaternion;
  }

  // For walls and other vertical surfaces, face away from the surface
  // Calculate rotation to align Z-axis with surface normal
  const up = new Vector3(0, 1, 0);

  // Handle degenerate case where normal is parallel to up
  if (Math.abs(normal.dot(up)) > 0.999) {
    // Normal is pointing up or down - use Z as reference instead
    up.set(0, 0, 1);
  }

  // Build rotation matrix from normal
  const right = new Vector3().crossVectors(up, normal).normalize();
  const adjustedUp = new Vector3().crossVectors(normal, right).normalize();

  const rotationMatrix = new Matrix4();
  rotationMatrix.makeBasis(right, adjustedUp, normal);
  quaternion.setFromRotationMatrix(rotationMatrix);

  return quaternion;
}

/**
 * Calculate rotation to make content billboard toward a target position.
 *
 * @param contentPosition - Position of the content
 * @param targetPosition - Position to face toward (usually camera/user)
 * @param upVector - Up direction (default: Y-up)
 */
export function calculateBillboardRotation(
  contentPosition: Vector3,
  targetPosition: Vector3,
  upVector: Vector3 = new Vector3(0, 1, 0)
): Quaternion {
  const quaternion = new Quaternion();
  const matrix = new Matrix4();

  // Calculate direction from content to target
  const direction = new Vector3()
    .subVectors(targetPosition, contentPosition)
    .normalize();

  // Build look-at matrix
  matrix.lookAt(contentPosition, targetPosition, upVector);
  quaternion.setFromRotationMatrix(matrix);

  return quaternion;
}

// ============================================================================
// Bounding Box Helpers
// ============================================================================

/**
 * Get the 8 corners of a bounding box.
 */
function getBoundingBoxCorners(bbox: Box3): Vector3[] {
  const { min, max } = bbox;

  return [
    new Vector3(min.x, min.y, min.z),
    new Vector3(max.x, min.y, min.z),
    new Vector3(min.x, max.y, min.z),
    new Vector3(max.x, max.y, min.z),
    new Vector3(min.x, min.y, max.z),
    new Vector3(max.x, min.y, max.z),
    new Vector3(min.x, max.y, max.z),
    new Vector3(max.x, max.y, max.z),
  ];
}

/**
 * Get the midpoints of the 12 edges of a bounding box.
 */
function getBoundingBoxEdgeMidpoints(bbox: Box3): Vector3[] {
  const { min, max } = bbox;
  const mid = new Vector3().addVectors(min, max).multiplyScalar(0.5);

  return [
    // Bottom face edges
    new Vector3(mid.x, min.y, min.z),
    new Vector3(max.x, min.y, mid.z),
    new Vector3(mid.x, min.y, max.z),
    new Vector3(min.x, min.y, mid.z),
    // Top face edges
    new Vector3(mid.x, max.y, min.z),
    new Vector3(max.x, max.y, mid.z),
    new Vector3(mid.x, max.y, max.z),
    new Vector3(min.x, max.y, mid.z),
    // Vertical edges
    new Vector3(min.x, mid.y, min.z),
    new Vector3(max.x, mid.y, min.z),
    new Vector3(max.x, mid.y, max.z),
    new Vector3(min.x, mid.y, max.z),
  ];
}

/**
 * Calculate approximate surface area based on bounding box and surface type.
 */
function calculateSurfaceArea(bbox: Box3, surfaceType: SurfaceType): number {
  const size = new Vector3();
  bbox.getSize(size);

  // Estimate area based on surface orientation
  if (surfaceType === 'floor' || surfaceType === 'ceiling' || surfaceType === 'table') {
    // Horizontal surface: width * depth
    return size.x * size.z;
  } else {
    // Vertical surface: width * height
    return size.x * size.y;
  }
}

// ============================================================================
// Grid Generation
// ============================================================================

interface GridPoint {
  position: Vector3;
  coords: { x: number; y: number };
}

/**
 * Generate a grid of snap points across a surface.
 */
function generateGridPoints(
  bbox: Box3,
  surfaceType: SurfaceType,
  normal: Vector3,
  spacing: number,
  normalOffset: number
): GridPoint[] {
  const points: GridPoint[] = [];
  const size = new Vector3();
  bbox.getSize(size);

  // Determine which axes to use for grid based on surface orientation
  let primaryAxis: 'x' | 'y' | 'z';
  let secondaryAxis: 'x' | 'y' | 'z';
  let fixedAxis: 'x' | 'y' | 'z';
  let fixedValue: number;

  if (surfaceType === 'floor' || surfaceType === 'ceiling' || surfaceType === 'table') {
    // Horizontal surface: grid on X-Z plane
    primaryAxis = 'x';
    secondaryAxis = 'z';
    fixedAxis = 'y';
    fixedValue = surfaceType === 'ceiling' ? bbox.max.y : bbox.min.y;
  } else {
    // Vertical surface: grid on X-Y plane
    primaryAxis = 'x';
    secondaryAxis = 'y';
    fixedAxis = 'z';
    // Use the side facing the normal direction
    fixedValue = normal.z > 0 ? bbox.max.z : bbox.min.z;
  }

  // Calculate grid dimensions
  const primarySize = size[primaryAxis];
  const secondarySize = size[secondaryAxis];
  const primaryCount = Math.max(1, Math.floor(primarySize / spacing));
  const secondaryCount = Math.max(1, Math.floor(secondarySize / spacing));

  // Generate grid points
  for (let i = 0; i <= primaryCount; i++) {
    for (let j = 0; j <= secondaryCount; j++) {
      const primaryPos = bbox.min[primaryAxis] + (i / primaryCount) * primarySize;
      const secondaryPos = bbox.min[secondaryAxis] + (j / secondaryCount) * secondarySize;

      const position = new Vector3();
      position[primaryAxis] = primaryPos;
      position[secondaryAxis] = secondaryPos;
      position[fixedAxis] = fixedValue;

      // Apply normal offset
      position.addScaledVector(normal, normalOffset);

      points.push({
        position,
        coords: { x: i, y: j },
      });
    }
  }

  return points;
}

// ============================================================================
// Geometry-Based Generation
// ============================================================================

/**
 * Generate snap points from mesh geometry (more accurate than bounding box).
 *
 * This analyzes the actual mesh faces to find optimal snap positions.
 */
export function generateSnapPointsFromGeometry(
  surfaceId: string,
  geometry: BufferGeometry,
  worldMatrix: Matrix4,
  surfaceType: SurfaceType,
  options?: SnapPointGenerationOptions
): SnapPoint[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const snapPoints: SnapPoint[] = [];

  // Ensure geometry has computed bounds
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return snapPoints;

  // Transform bounding box to world space
  const worldBbox = geometry.boundingBox.clone();
  worldBbox.applyMatrix4(worldMatrix);

  // Calculate centroid
  const centroid = new Vector3();
  worldBbox.getCenter(centroid);

  // Calculate normal from geometry or infer from surface type
  const normal = inferNormalFromSurfaceType(surfaceType);
  normal.applyQuaternion(new Quaternion().setFromRotationMatrix(worldMatrix));
  normal.normalize();

  const rotation = calculateRotationFromNormal(normal, surfaceType);

  // Generate center point
  if (opts.includeCenter) {
    const centerPos = centroid.clone();
    centerPos.addScaledVector(normal, opts.normalOffset);

    snapPoints.push({
      id: generateSnapPointId(surfaceId, 'center'),
      surfaceId,
      position: centerPos,
      normal: normal.clone(),
      rotation: rotation.clone(),
      type: 'center',
    });
  }

  // Generate corners from world-space bounding box
  if (opts.includeCorners) {
    const corners = getBoundingBoxCorners(worldBbox);

    corners.forEach((corner, index) => {
      const cornerPos = corner.clone();
      cornerPos.addScaledVector(normal, opts.normalOffset);

      snapPoints.push({
        id: generateSnapPointId(surfaceId, 'corner', index),
        surfaceId,
        position: cornerPos,
        normal: normal.clone(),
        rotation: rotation.clone(),
        type: 'corner',
      });
    });
  }

  return snapPoints;
}

/**
 * Infer surface normal based on surface type.
 */
function inferNormalFromSurfaceType(surfaceType: SurfaceType): Vector3 {
  switch (surfaceType) {
    case 'floor':
    case 'table':
      return new Vector3(0, 1, 0); // Up
    case 'ceiling':
      return new Vector3(0, -1, 0); // Down
    case 'wall':
    default:
      return new Vector3(0, 0, 1); // Forward (will be transformed by world matrix)
  }
}

// ============================================================================
// XR Plane Snap Point Generation
// ============================================================================

/**
 * Generate snap points from XR plane polygon.
 *
 * XR planes provide a polygon outline that can be used to create
 * more accurate snap points than a simple bounding box.
 */
export function generateSnapPointsFromXRPolygon(
  surfaceId: string,
  polygon: DOMPointReadOnly[],
  planeTransform: Matrix4,
  surfaceType: SurfaceType,
  options?: SnapPointGenerationOptions
): SnapPoint[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const snapPoints: SnapPoint[] = [];

  if (polygon.length === 0) return snapPoints;

  // Calculate centroid from polygon
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

  // Transform to world space
  centroid.applyMatrix4(planeTransform);

  // Calculate normal based on surface type
  const normal = inferNormalFromSurfaceType(surfaceType);
  const quaternion = new Quaternion().setFromRotationMatrix(planeTransform);
  normal.applyQuaternion(quaternion);
  normal.normalize();

  const rotation = calculateRotationFromNormal(normal, surfaceType);

  // Center snap point
  if (opts.includeCenter) {
    const centerPos = centroid.clone();
    centerPos.addScaledVector(normal, opts.normalOffset);

    snapPoints.push({
      id: generateSnapPointId(surfaceId, 'center'),
      surfaceId,
      position: centerPos,
      normal: normal.clone(),
      rotation: rotation.clone(),
      type: 'center',
    });
  }

  // Corner snap points from polygon vertices
  if (opts.includeCorners) {
    polygon.forEach((point, index) => {
      const cornerPos = new Vector3(point.x, point.y, point.z);
      cornerPos.applyMatrix4(planeTransform);
      cornerPos.addScaledVector(normal, opts.normalOffset);

      snapPoints.push({
        id: generateSnapPointId(surfaceId, 'corner', index),
        surfaceId,
        position: cornerPos,
        normal: normal.clone(),
        rotation: rotation.clone(),
        type: 'corner',
      });
    });
  }

  return snapPoints;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find the closest snap point to a given position.
 */
export function findClosestSnapPoint(
  position: Vector3,
  snapPoints: SnapPoint[],
  maxDistance: number = Infinity
): SnapPoint | null {
  let closest: SnapPoint | null = null;
  let minDist = maxDistance;

  for (const point of snapPoints) {
    const dist = position.distanceTo(point.position);
    if (dist < minDist) {
      minDist = dist;
      closest = point;
    }
  }

  return closest;
}

/**
 * Project a point onto a plane defined by a point and normal.
 */
export function projectPointOntoPlane(
  point: Vector3,
  planePoint: Vector3,
  planeNormal: Vector3
): Vector3 {
  const normalizedNormal = planeNormal.clone().normalize();
  const pointToPlane = new Vector3().subVectors(point, planePoint);
  const distance = pointToPlane.dot(normalizedNormal);

  return point.clone().sub(normalizedNormal.multiplyScalar(distance));
}
