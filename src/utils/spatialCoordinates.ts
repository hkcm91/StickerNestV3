/**
 * StickerNest - Spatial Coordinate Utilities
 *
 * Converts between 2D DOM coordinates (pixels) and 3D spatial coordinates (meters).
 * Used by the parallel rendering architecture to keep DOM and WebGL in sync.
 */

// Conversion factor: how many pixels equal 1 meter in 3D space
export const PIXELS_PER_METER = 100;

// Default Z-depth for flat widgets (in meters, positioned in front of user)
export const DEFAULT_WIDGET_Z = -2;

// Eye height in meters (standing user)
export const DEFAULT_EYE_HEIGHT = 1.6;

/**
 * 2D DOM position to 3D spatial position
 *
 * @param pos2D - Position in pixels { x, y }
 * @param z - Optional Z depth in meters (default: DEFAULT_WIDGET_Z)
 * @returns Three.js compatible [x, y, z] tuple in meters
 */
export function toSpatialPosition(
  pos2D: { x: number; y: number },
  z: number = DEFAULT_WIDGET_Z
): [number, number, number] {
  return [
    pos2D.x / PIXELS_PER_METER,
    // Y is inverted: DOM Y grows down, 3D Y grows up
    // Also offset to eye height so canvas is at comfortable viewing level
    DEFAULT_EYE_HEIGHT - (pos2D.y / PIXELS_PER_METER),
    z
  ];
}

/**
 * 3D spatial position to 2D DOM position
 *
 * @param pos3D - Position in meters [x, y, z]
 * @returns DOM position in pixels { x, y }
 */
export function toDOMPosition(pos3D: [number, number, number]): { x: number; y: number } {
  return {
    x: pos3D[0] * PIXELS_PER_METER,
    y: (DEFAULT_EYE_HEIGHT - pos3D[1]) * PIXELS_PER_METER
  };
}

/**
 * Convert pixel dimensions to meters
 */
export function toSpatialSize(
  size: { width: number; height: number }
): { width: number; height: number } {
  return {
    width: size.width / PIXELS_PER_METER,
    height: size.height / PIXELS_PER_METER
  };
}

/**
 * Convert meter dimensions to pixels
 */
export function toDOMSize(
  size: { width: number; height: number }
): { width: number; height: number } {
  return {
    width: size.width * PIXELS_PER_METER,
    height: size.height * PIXELS_PER_METER
  };
}

/**
 * Convert rotation from degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert rotation from radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Create a 3D rotation from a 2D rotation (around Z axis)
 *
 * @param rotationDeg - Rotation in degrees (2D, around Z)
 * @returns Euler angles [x, y, z] in radians
 */
export function toSpatialRotation(rotationDeg: number): [number, number, number] {
  return [0, 0, toRadians(-rotationDeg)]; // Negative because DOM rotates opposite
}

/**
 * Interface for full spatial transform (position + rotation + scale)
 */
export interface SpatialTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

/**
 * Convert a 2D widget/entity transform to full 3D spatial transform
 */
export function toSpatialTransform(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scale?: number;
  z?: number;
}): SpatialTransform {
  const { x, y, width, height, rotation = 0, scale = 1, z = DEFAULT_WIDGET_Z } = params;

  return {
    position: toSpatialPosition({ x, y }, z),
    rotation: toSpatialRotation(rotation),
    scale: [scale, scale, scale]
  };
}
