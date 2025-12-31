/**
 * Widget 3D Handles - Snap Utilities
 *
 * Pure functions for grid and angle snapping.
 */

import type { SnapResult, AngleSnapResult } from '../types';
import { HANDLE_CONSTANTS } from '../types';

/**
 * Snap a value to a grid if within threshold
 */
export function applyGridSnap(
  value: number,
  gridSize: number,
  threshold: number = HANDLE_CONSTANTS.GRID_SNAP_THRESHOLD
): SnapResult {
  const snappedValue = Math.round(value / gridSize) * gridSize;
  const distance = Math.abs(value - snappedValue);

  if (distance < threshold) {
    return { value: snappedValue, snapped: true };
  }

  return { value, snapped: false };
}

/**
 * Snap a value to grid with adaptive threshold based on size
 */
export function applyAdaptiveGridSnap(
  value: number,
  gridSize: number,
  referenceSize: number
): SnapResult {
  // Threshold is 10% of reference size, but capped at standard threshold
  const adaptiveThreshold = Math.min(
    HANDLE_CONSTANTS.GRID_SNAP_THRESHOLD,
    referenceSize * 0.1
  );

  return applyGridSnap(value, gridSize, adaptiveThreshold);
}

/**
 * Snap an angle to increments (in radians)
 */
export function applyAngleSnap(
  angleRadians: number,
  incrementDegrees: number,
  thresholdDegrees: number = HANDLE_CONSTANTS.ANGLE_SNAP_THRESHOLD
): AngleSnapResult {
  const degrees = (angleRadians * 180) / Math.PI;
  const snappedDegrees = Math.round(degrees / incrementDegrees) * incrementDegrees;
  const distance = Math.abs(degrees - snappedDegrees);

  if (distance < thresholdDegrees) {
    return {
      angle: (snappedDegrees * Math.PI) / 180,
      snapped: true,
      nearestSnap: snappedDegrees,
    };
  }

  return {
    angle: angleRadians,
    snapped: false,
    nearestSnap: snappedDegrees,
  };
}

/**
 * Snap absolute rotation (not delta) to prevent accumulation errors
 */
export function snapAbsoluteRotation(
  currentAngle: number,
  initialAngle: number,
  accumulatedDelta: number,
  incrementDegrees: number
): { finalAngle: number; snapped: boolean } {
  const totalRotation = initialAngle + accumulatedDelta;
  const result = applyAngleSnap(totalRotation, incrementDegrees);

  return {
    finalAngle: result.snapped ? result.angle : totalRotation,
    snapped: result.snapped,
  };
}

/**
 * Calculate size with aspect ratio preserved
 */
export function calculateAspectLockedSize(
  deltaX: number,
  deltaY: number,
  initialWidth: number,
  initialHeight: number,
  aspectRatio: number
): { width: number; height: number } {
  // Use the larger delta to drive both dimensions
  const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
  const sign = (deltaX + deltaY) > 0 ? 1 : -1;

  const newWidth = initialWidth + sign * maxDelta;
  const newHeight = newWidth / aspectRatio;

  return { width: newWidth, height: newHeight };
}

/**
 * Clamp size to min/max constraints
 */
export function clampSize(
  width: number,
  height: number,
  min: number = HANDLE_CONSTANTS.MIN_SIZE,
  max: number = HANDLE_CONSTANTS.MAX_SIZE
): { width: number; height: number } {
  return {
    width: Math.max(min, Math.min(max, width)),
    height: Math.max(min, Math.min(max, height)),
  };
}

/**
 * Clamp depth to min/max constraints
 */
export function clampDepth(
  depth: number,
  min: number = HANDLE_CONSTANTS.MIN_DEPTH,
  max: number = HANDLE_CONSTANTS.MAX_DEPTH
): number {
  return Math.max(min, Math.min(max, depth));
}

/**
 * Check if a value is within dead zone
 */
export function isInDeadZone(
  value: number,
  deadZone: number = HANDLE_CONSTANTS.SCALE_DEAD_ZONE
): boolean {
  return Math.abs(value - 1) < deadZone;
}
