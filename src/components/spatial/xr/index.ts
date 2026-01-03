/**
 * StickerNest - XR Components
 *
 * WebXR hand tracking, gesture detection, floating UI, and room mapping.
 * Device-agnostic implementations for VR/AR headsets and controllers.
 */

// Gesture detection
export { useHandGestures, usePinchGesture, useMenuGesture } from './useHandGestures';
export type { HandSide, GestureState, HandGesturesResult } from './useHandGestures';

// Floating panels
export { FloatingPanel } from './FloatingPanel';
export type { FloatingPanelProps } from './FloatingPanel';

// Toolbars
export { XRToolbar } from './XRToolbar';
export type { XRToolbarProps, XRToolType } from './XRToolbar';

// VR Tool Hub (3D native toolbar)
export { VRToolHub } from './VRToolHub';
export type { VRToolHubProps, VRToolType as VRToolHubToolType } from './VRToolHub';

// Widget 3D Handles (resize, rotate, move)
export { Widget3DHandles } from './widget-handles';
export type {
  Widget3DHandlesProps,
  HandleType,
  TwoHandedState,
  ManipulationState,
  HapticCapabilities,
} from './widget-handles';

// Widget 3D Handles - Hooks (for custom implementations)
export { useXRHaptics, useTwoHandedGesture } from './widget-handles';

// Widget 3D Handles - Constants
export { HANDLE_CONSTANTS, HAPTIC_PRESETS } from './widget-handles';

// Widget Library
export { XRWidgetLibrary } from './XRWidgetLibrary';
export type { XRWidgetLibraryProps } from './XRWidgetLibrary';

// Room mapping
export { RoomVisualizer } from './RoomVisualizer';
export type { RoomVisualizerProps, PlaneType } from './RoomVisualizer';

export { OcclusionLayer, OcclusionDebug, ARSceneWithOcclusion } from './OcclusionLayer';
export type { OcclusionLayerProps, ARSceneWithOcclusionProps } from './OcclusionLayer';

export { RoomSetupGuide, RoomSetupHint } from './RoomSetupGuide';
export type { RoomSetupGuideProps, RoomSetupHintProps } from './RoomSetupGuide';

// Debug panel
export { VRDebugPanel, vrLog, vrWarn, vrError } from './VRDebugPanel';
export type { } from './VRDebugPanel';
