/**
 * StickerNest - Mobile AR Module
 *
 * React components and hooks for mobile AR experiences.
 * Prioritizes Chrome Android (ARCore) with Safari iOS fallbacks.
 */

// AR Capability Detection
export {
  useMobileAR,
  useHasFullAR,
  useHasAnyAR,
  useIsPreferredARPlatform,
  useARSessionFeatures,
} from './useMobileAR';
export type {
  MobileBrowser,
  ARCapabilityLevel,
  MobileARCapabilities,
} from './useMobileAR';

// Touch-based Sticker Placement
export { useTouchPlacement } from './useTouchPlacement';
export type {
  TouchPlacementResult,
  UseTouchPlacementConfig,
  TouchPlacementState,
} from './useTouchPlacement';

// Pinch-to-Scale/Rotate Gestures
export {
  usePinchGestures,
  useObjectManipulation,
} from './usePinchGestures';
export type {
  PinchGestureState,
  UsePinchGesturesConfig,
  PinchGesturesResult,
  UseObjectManipulationConfig,
} from './usePinchGestures';

// Mobile AR Manager Component
export {
  MobileARManager,
  MobileARButton,
  ARCapabilityBadge,
} from './MobileARManager';
export type { MobileARManagerProps } from './MobileARManager';
