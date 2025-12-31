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
