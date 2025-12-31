/**
 * Widget 3D Handles - Geometry Utilities
 *
 * Functions for calculating handle positions and transforms.
 */

import * as THREE from 'three';
import type { HandleType } from '../types';
import { HANDLE_CONSTANTS } from '../types';

/**
 * Calculate corner handle positions
 */
export function getCornerPositions(
  width: number,
  height: number,
  zOffset: number
): Array<{ type: HandleType; position: [number, number, number] }> {
  const hw = width / 2;
  const hh = height / 2;

  return [
    { type: 'corner-nw', position: [-hw, hh, zOffset] },
    { type: 'corner-ne', position: [hw, hh, zOffset] },
    { type: 'corner-se', position: [hw, -hh, zOffset] },
    { type: 'corner-sw', position: [-hw, -hh, zOffset] },
  ];
}

/**
 * Calculate edge handle positions and rotations
 */
export function getEdgePositions(
  width: number,
  height: number,
  zOffset: number
): Array<{ type: HandleType; position: [number, number, number]; rotation: [number, number, number] }> {
  const hw = width / 2;
  const hh = height / 2;

  return [
    { type: 'edge-n', position: [0, hh, zOffset], rotation: [0, 0, Math.PI / 2] },
    { type: 'edge-s', position: [0, -hh, zOffset], rotation: [0, 0, Math.PI / 2] },
    { type: 'edge-e', position: [hw, 0, zOffset], rotation: [0, 0, 0] },
    { type: 'edge-w', position: [-hw, 0, zOffset], rotation: [0, 0, 0] },
  ];
}

/**
 * Calculate rotation handle position
 */
export function getRotationHandlePosition(
  height: number,
  zOffset: number
): [number, number, number] {
  const hh = height / 2;
  return [0, hh + HANDLE_CONSTANTS.ROTATION_OFFSET, zOffset];
}

/**
 * Calculate depth handle position
 */
export function getDepthHandlePosition(
  width: number,
  zOffset: number
): [number, number, number] {
  const hw = width / 2;
  return [hw + 0.04, 0, zOffset];
}

/**
 * Calculate size indicator position
 */
export function getSizeIndicatorPosition(
  height: number,
  zOffset: number
): [number, number, number] {
  const hh = height / 2;
  return [0, -hh - 0.05, zOffset];
}

/**
 * Calculate new size based on handle drag
 */
export function calculateResizeFromDrag(
  handleType: HandleType,
  delta: THREE.Vector3,
  initialWidth: number,
  initialHeight: number
): { width: number; height: number } {
  let newWidth = initialWidth;
  let newHeight = initialHeight;

  switch (handleType) {
    case 'corner-ne':
      newWidth += delta.x;
      newHeight += delta.y;
      break;
    case 'corner-nw':
      newWidth -= delta.x;
      newHeight += delta.y;
      break;
    case 'corner-se':
      newWidth += delta.x;
      newHeight -= delta.y;
      break;
    case 'corner-sw':
      newWidth -= delta.x;
      newHeight -= delta.y;
      break;
    case 'edge-n':
      newHeight += delta.y;
      break;
    case 'edge-s':
      newHeight -= delta.y;
      break;
    case 'edge-e':
      newWidth += delta.x;
      break;
    case 'edge-w':
      newWidth -= delta.x;
      break;
  }

  return { width: newWidth, height: newHeight };
}

/**
 * Transform a delta vector to widget's local space
 * (for rotation-aware depth manipulation)
 */
export function transformToLocalSpace(
  delta: THREE.Vector3,
  quaternion: THREE.Quaternion
): THREE.Vector3 {
  return delta.clone().applyQuaternion(quaternion.clone().invert());
}

/**
 * Calculate rotation angle from drag position
 */
export function calculateRotationAngle(point: THREE.Vector3): number {
  return Math.atan2(point.x, point.y);
}

/**
 * Calculate distance between two 3D points
 */
export function calculateDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b);
}

/**
 * Calculate midpoint between two 3D points
 */
export function calculateMidpoint(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
  return a.clone().add(b).multiplyScalar(0.5);
}

/**
 * Calculate angle between two points (for two-handed rotation)
 */
export function calculateAngleBetweenPoints(
  left: THREE.Vector3,
  right: THREE.Vector3
): number {
  return Math.atan2(right.y - left.y, right.x - left.x);
}

/**
 * Generate snap indicator positions for rotation handle
 */
export function generateSnapIndicators(
  incrementDegrees: number,
  radius: number
): Array<{ angle: number; position: [number, number, number]; isMain: boolean; isMid: boolean }> {
  const count = 360 / incrementDegrees;
  const indicators = [];

  for (let i = 0; i < count; i++) {
    const angleDeg = i * incrementDegrees;
    const angleRad = (angleDeg * Math.PI) / 180;

    indicators.push({
      angle: angleRad,
      position: [
        Math.sin(angleRad) * radius,
        0,
        Math.cos(angleRad) * radius,
      ] as [number, number, number],
      isMain: angleDeg % 90 === 0,
      isMid: angleDeg % 45 === 0,
    });
  }

  return indicators;
}

/**
 * Create selection border points
 */
export function createSelectionBorderPoints(
  width: number,
  height: number,
  zOffset: number,
  cornerRadius: number = 0.01
): THREE.Vector3[] {
  const hw = width / 2;
  const hh = height / 2;
  const r = cornerRadius;

  return [
    new THREE.Vector3(-hw + r, hh, zOffset),
    new THREE.Vector3(hw - r, hh, zOffset),
    new THREE.Vector3(hw, hh - r, zOffset),
    new THREE.Vector3(hw, -hh + r, zOffset),
    new THREE.Vector3(hw - r, -hh, zOffset),
    new THREE.Vector3(-hw + r, -hh, zOffset),
    new THREE.Vector3(-hw, -hh + r, zOffset),
    new THREE.Vector3(-hw, hh - r, zOffset),
    new THREE.Vector3(-hw + r, hh, zOffset), // Close the loop
  ];
}
