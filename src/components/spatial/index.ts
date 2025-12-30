/**
 * StickerNest - Spatial Components
 *
 * WebGL/Three.js components for VR and AR rendering modes.
 * These run in parallel with the DOM renderer.
 */

export { SpatialCanvas, xrStore, enterVR, enterAR, exitXR } from './SpatialCanvas';
export { SpatialScene } from './SpatialScene';
export { ARHitTest, ARPlacedObject } from './ARHitTest';
export { VRTeleport, TeleportBoundary } from './VRTeleport';
export { XREntryButtons } from './XREntryButtons';

// XR hand tracking and floating UI
export * from './xr';

// IWSDK integration (Meta Immersive Web SDK)
export * from './iwsdk';

// Spatial stickers
export * from './stickers';

// Spatial anchors
export * from './anchors';

// QR code detection and anchoring
export * from './qr';

// Mobile AR support (Chrome Android priority, Safari fallback)
export * from './mobile';

// Demo scene with green screens and panoramic backgrounds
export {
  SpatialDemoScene,
  GreenScreenPlane3D,
  PanoramicSkybox3D,
  FloatingWidgetPanel3D,
  useSpatialDemoSetup,
} from './SpatialDemo';
