/**
 * StickerNest - XR Store
 *
 * Centralized XR store configuration for WebXR sessions.
 * This file is separate from SpatialCanvas to avoid circular imports.
 */

import { createXRStore } from '@react-three/xr';

/**
 * XR store manages WebXR session state, controllers, and hands.
 *
 * IMPORTANT: Reference space configuration determines how the scene is positioned:
 * - 'local-floor': Standing experiences, floor at y=0, limited tracking (default)
 * - 'bounded-floor': Room-scale with guardian boundaries (Meta Quest)
 * - 'unbounded': Large area tracking without boundaries
 *
 * Without proper reference space, the scene will be HEAD-LOCKED (moves with headset).
 *
 * CONTROLLER INTERACTION (@react-three/xr v6):
 * - Setting controller/hand to `true` uses DefaultXRController/DefaultXRHand
 * - DefaultXRController renders: model + grabPointer + rayPointer (with visible ray!)
 * - DefaultXRHand renders: model + grabPointer + touchPointer + rayPointer
 * - The ray pointer emits standard R3F pointer events (onClick, onPointerDown, etc.)
 *
 * QUEST 3 COMPATIBILITY:
 * - Quest 3 browser reports both VR and AR as supported
 * - VR mode works reliably with most features enabled
 * - AR passthrough can be unstable with too many features - keep it minimal
 */
export const xrStore = createXRStore({
  // CRITICAL: Reference space determines world-space vs head-locked rendering
  referenceSpace: 'local-floor',

  // Controller configuration - use `true` to get DefaultXRController with all features
  // DefaultXRController includes: model + visible ray + grab pointer + cursor
  controller: true,

  // Hand tracking configuration - use `true` to get DefaultXRHand with all features
  // DefaultXRHand includes: model + visible ray + touch pointer + grab pointer
  hand: true,

  // Performance settings
  foveation: 1,

  // Core features
  handTracking: true,

  // AR features - disabled by default for stability
  hitTest: false,
  anchors: false,
  planeDetection: false,
  meshDetection: false,
  depthSensing: false,
});

/**
 * Enter VR mode - call this from a button click handler
 * Returns the session promise for proper async handling
 */
export function enterVR() {
  return xrStore.enterVR();
}

/**
 * Enter AR mode - call this from a button click handler
 * Returns the session promise for proper async handling
 */
export function enterAR() {
  return xrStore.enterAR();
}

/**
 * Exit XR session
 */
export function exitXR() {
  const session = xrStore.getState().session;
  if (session) {
    session.end();
  }
}
