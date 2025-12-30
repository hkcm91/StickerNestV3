/**
 * StickerNest - XR Components
 *
 * WebXR hand tracking, gesture detection, and floating UI components.
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
