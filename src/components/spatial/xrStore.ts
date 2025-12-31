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
  // Features
  handTracking: true,
  // AR/VR features for room-scale and spatial anchoring
  hitTest: true,
  anchors: true,
  // Plane detection for AR surface awareness
  planeDetection: true,
  // Mesh detection for room mapping (Meta Quest)
  meshDetection: true,
  // Depth sensing for occlusion
  depthSensing: true,
});

/**
 * Enter VR mode - call this from a button click handler
 */
export function enterVR() {
  xrStore.enterVR();
}

/**
 * Enter AR mode - call this from a button click handler
 */
export function enterAR() {
  xrStore.enterAR();
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
