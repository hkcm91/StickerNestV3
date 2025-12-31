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
 * NOTE: AR passthrough works automatically when:
 * 1. Session mode is 'immersive-ar' (handled by enterAR())
 * 2. WebGL context has alpha: true (set in SpatialCanvas)
 * 3. Scene has no opaque background (GridEnvironment360 hides in AR)
 */
export const xrStore = createXRStore({
  // CRITICAL: Reference space determines world-space vs head-locked rendering
  // 'local-floor' places the origin at floor level and tracks position in world space
  // This is what allows you to look around and have the scene stay stationary
  referenceSpace: 'local-floor',

  // Controller configuration
  controller: {
    left: true,
    right: true,
    teleportPointer: true,
  },
  // Hand tracking
  hand: {
    left: true,
    right: true,
    teleportPointer: true,
  },
  // Performance settings
  frameRate: 'high',
  foveation: 1,
  // Core features (widely supported)
  handTracking: true,
  hitTest: true,
  anchors: true,
  // Optional features - set to false to request as optional, avoiding session failures
  // on devices that don't support these newer features
  planeDetection: false,  // Request as optional - not all devices support
  meshDetection: false,   // Request as optional - Meta Quest specific
  depthSensing: false,    // Request as optional - experimental feature
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
