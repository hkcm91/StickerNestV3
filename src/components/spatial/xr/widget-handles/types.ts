/**
 * Widget 3D Handles - Type Definitions
 */

import * as THREE from 'three';

// ============================================================================
// Handle Types
// ============================================================================

export type HandleType =
  | 'corner-nw' | 'corner-ne' | 'corner-se' | 'corner-sw'
  | 'edge-n' | 'edge-e' | 'edge-s' | 'edge-w'
  | 'rotate'
  | 'depth'
  | 'move'
  | 'two-hand';

export type HandSide = 'left' | 'right' | 'both';

// ============================================================================
// Props Interfaces
// ============================================================================

export interface Widget3DHandlesProps {
  /** Width of the widget panel in meters */
  width: number;
  /** Height of the widget panel in meters */
  height: number;
  /** Current depth (Z position) in meters */
  depth?: number;
  /** Whether the widget is currently selected */
  selected: boolean;
  /** Whether handles should be interactive */
  interactive?: boolean;
  /** Accent color for handles */
  accentColor?: string;
  /** Enable haptic feedback for XR controllers */
  enableHaptics?: boolean;
  /** Enable two-handed manipulation (pinch-to-zoom) */
  enableTwoHanded?: boolean;
  /** Enable snap-to-grid for size */
  snapToGrid?: boolean;
  /** Grid size for snapping in meters */
  gridSize?: number;
  /** Enable snap angles for rotation */
  snapAngles?: boolean;
  /** Snap angle increment in degrees */
  snapAngleIncrement?: number;
  /** Lock aspect ratio during corner resize */
  lockAspectRatio?: boolean;
  /** Called when resize starts */
  onResizeStart?: (handle: HandleType) => void;
  /** Called during resize with new dimensions */
  onResize?: (width: number, height: number, handle: HandleType) => void;
  /** Called when resize ends */
  onResizeEnd?: () => void;
  /** Called when rotation starts */
  onRotateStart?: () => void;
  /** Called during rotation with angle delta */
  onRotate?: (angleDelta: number) => void;
  /** Called when rotation ends */
  onRotateEnd?: () => void;
  /** Called when depth changes */
  onDepthChange?: (depthDelta: number) => void;
  /** Called when move/grab starts */
  onMoveStart?: (point: THREE.Vector3) => void;
  /** Called during move */
  onMove?: (point: THREE.Vector3, delta: THREE.Vector3) => void;
  /** Called when move ends */
  onMoveEnd?: () => void;
  /** Called during two-handed scale */
  onTwoHandedScale?: (scaleFactor: number) => void;
  /** Called to toggle aspect ratio lock */
  onToggleAspectLock?: () => void;
  /** Z offset from widget surface */
  zOffset?: number;
}

export interface HandleBaseProps {
  position: [number, number, number];
  color: string;
  accentColor: string;
  enableHaptics: boolean;
  onHover: (hovered: boolean) => void;
}

export interface CornerHandleProps extends HandleBaseProps {
  type: HandleType;
  onDragStart: (type: HandleType, point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
  onDoubleTap?: () => void;
}

export interface EdgeHandleProps extends HandleBaseProps {
  type: HandleType;
  rotation: [number, number, number];
  onDragStart: (type: HandleType, point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
}

export interface RotationHandleProps extends HandleBaseProps {
  currentAngle?: number;
  snapEnabled?: boolean;
  snapIncrement?: number;
  onDragStart: (point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
}

export interface DepthHandleProps extends HandleBaseProps {
  onDragStart: (point: THREE.Vector3) => void;
  onDrag: (point: THREE.Vector3) => void;
  onDragEnd: () => void;
}

// ============================================================================
// State Interfaces
// ============================================================================

export interface TwoHandedState {
  active: boolean;
  initialDistance: number;
  initialWidth: number;
  initialHeight: number;
  initialAngle: number;
  leftHandPos: THREE.Vector3;
  rightHandPos: THREE.Vector3;
}

export interface ManipulationState {
  activeHandle: HandleType | null;
  isHovering: boolean;
  isSnapped: boolean;
  twoHandScale: number;
  twoHandRotation: number;
}

export interface DragState {
  startPoint: THREE.Vector3 | null;
  initialSize: { width: number; height: number } | null;
  initialRotation: number;
  initialDepth: number;
  aspectRatio: number;
}

// ============================================================================
// Haptic Types
// ============================================================================

export interface HapticPattern {
  intensity: number;
  duration: number;
}

export interface HapticSequence {
  patterns: (HapticPattern | { pause: number })[];
}

export interface HapticCapabilities {
  supported: boolean;
  hdHaptics: boolean;
  maxIntensity: number;
  maxDuration: number;
}

export const HAPTIC_PRESETS = {
  hover: { intensity: 0.1, duration: 20 },
  grab: { intensity: 0.6, duration: 50 },
  drag: { intensity: 0.15, duration: 20 },
  release: { intensity: 0.3, duration: 50 },
  snap: { intensity: 0.4, duration: 30 },
  twoHandStart: { intensity: 0.8, duration: 100 },
} as const;

// ============================================================================
// Snap Types
// ============================================================================

export interface SnapResult {
  value: number;
  snapped: boolean;
}

export interface AngleSnapResult {
  angle: number;
  snapped: boolean;
  nearestSnap: number;
}

// ============================================================================
// Constants
// ============================================================================

export const HANDLE_CONSTANTS = {
  // Sizes in meters
  CORNER_SIZE: 0.025,
  EDGE_SIZE: 0.018,
  EDGE_LENGTH: 0.06,
  ROTATION_OFFSET: 0.08,
  ROTATION_SIZE: 0.03,
  DEPTH_OFFSET: 0.06,
  DEPTH_SIZE: 0.02,

  // Animation scales
  HOVER_SCALE: 1.3,
  ACTIVE_SCALE: 1.5,

  // Constraints
  MIN_SIZE: 0.05,
  MAX_SIZE: 5.0,
  MIN_DEPTH: 0.3,
  MAX_DEPTH: 5.0,

  // Snap thresholds
  GRID_SNAP_THRESHOLD: 0.008,
  ANGLE_SNAP_THRESHOLD: 3, // degrees

  // Two-handed
  ACTIVATION_THRESHOLD: 0.1,
  SCALE_DEAD_ZONE: 0.05,
} as const;
