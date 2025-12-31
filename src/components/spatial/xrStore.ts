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
 *
 * QUEST 3 COMPATIBILITY:
 * - Quest 3 browser reports both VR and AR as supported
 * - VR mode works reliably with most features enabled
 * - AR passthrough can be unstable with too many features - keep it minimal
 * - Hand tracking + AR passthrough together can cause performance issues
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
  // Hand tracking - Note: Can be resource-intensive with AR passthrough on Quest 3
  hand: {
    left: true,
    right: true,
    teleportPointer: true,
  },
  // Performance settings
  // Use 'default' instead of 'high' for better AR stability on Quest 3
  frameRate: 'default',
  foveation: 1,
  // Core features - be conservative for Quest 3 AR compatibility
  // Hand tracking: Enable for VR, but AR sessions request this separately
  handTracking: true,
  // Hit test: Essential for AR placement, but can be unstable - request as optional
  hitTest: false,  // Changed to false - request explicitly when needed
  // Anchors: Useful but not required for basic AR
  anchors: false,  // Changed to false - request explicitly when needed
  // Optional features - keep disabled to avoid session request failures
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
