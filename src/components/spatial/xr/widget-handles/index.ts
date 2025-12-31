/**
 * Widget 3D Handles Module
 *
 * Industry-standard VR widget manipulation system.
 */

// Main component
export { Widget3DHandles, default } from './Widget3DHandles';

// Types
export type {
  Widget3DHandlesProps,
  HandleType,
  HandSide,
  TwoHandedState,
  ManipulationState,
  DragState,
  HapticPattern,
  HapticSequence,
  HapticCapabilities,
  SnapResult,
  AngleSnapResult,
  CornerHandleProps,
  EdgeHandleProps,
  RotationHandleProps,
  DepthHandleProps,
  HandleBaseProps,
} from './types';

export { HANDLE_CONSTANTS, HAPTIC_PRESETS } from './types';

// Individual handle components (for custom compositions)
export {
  CornerHandle,
  EdgeHandle,
  RotationHandle,
  DepthHandle,
  SelectionBorder,
  TwoHandIndicator,
  SizeIndicator,
} from './handles';

// Hooks (for custom implementations)
export { useXRHaptics } from './hooks/useXRHaptics';
export { useTwoHandedGesture } from './hooks/useTwoHandedGesture';

// Utilities (for custom implementations)
export {
  applyGridSnap,
  applyAdaptiveGridSnap,
  applyAngleSnap,
  snapAbsoluteRotation,
  calculateAspectLockedSize,
  clampSize,
  clampDepth,
  isInDeadZone,
} from './utils/snapUtils';

export {
  getCornerPositions,
  getEdgePositions,
  getRotationHandlePosition,
  getDepthHandlePosition,
  getSizeIndicatorPosition,
  calculateResizeFromDrag,
  transformToLocalSpace,
  calculateRotationAngle,
  calculateDistance,
  calculateMidpoint,
  calculateAngleBetweenPoints,
  generateSnapIndicators,
  createSelectionBorderPoints,
} from './utils/geometryUtils';
