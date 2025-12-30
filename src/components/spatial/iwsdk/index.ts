/**
 * StickerNest - Meta Immersive Web SDK Integration
 *
 * React adapters for Meta's Immersive Web SDK (IWSDK).
 * Provides enhanced VR/AR functionality while maintaining cross-platform compatibility.
 *
 * IWSDK is open source (MIT) and built on WebXR standards.
 * It's optimized for Quest but works on any WebXR device.
 *
 * @see https://github.com/facebook/immersive-web-sdk
 * @see https://iwsdk.dev
 */

// Locomotion - physics-based movement with web worker
export { useLocomotor } from './useLocomotor';
export type { UseLocomotorConfig, LocomotorResult } from './useLocomotor';

// Grab interactions - one-hand, two-hand, distance grab
export { useGrabInteraction } from './useGrabInteraction';
export type {
  UseGrabInteractionConfig,
  GrabInteractionResult,
  GrabState,
  GrabbedObject,
  TwoHandGrab,
} from './useGrabInteraction';
