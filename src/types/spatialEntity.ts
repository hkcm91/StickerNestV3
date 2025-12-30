/**
 * StickerNest - Spatial Entity Types
 *
 * Extensions to the entity system for 3D/spatial experiences.
 * Enables stickers and objects to work in both 2D canvas and 3D VR/AR modes.
 *
 * Core Concept: A SpatialSticker is a sticker that can exist in both 2D and 3D,
 * with optional anchoring to real-world objects or locations.
 */

import { WidgetPosition, StickerClickBehavior, StickerMediaType } from './domain';

// ============================================================================
// Spatial Position & Transform
// ============================================================================

/** 3D position in meters (world space) */
export interface SpatialPosition {
  x: number;
  y: number;
  z: number;
}

/** 3D rotation in degrees (Euler angles) */
export interface SpatialRotation {
  x: number;
  y: number;
  z: number;
}

/** 3D scale (1 = original size) */
export interface SpatialScale {
  x: number;
  y: number;
  z: number;
}

/** Complete 3D transform */
export interface SpatialTransform {
  position: SpatialPosition;
  rotation: SpatialRotation;
  scale: SpatialScale;
}

// ============================================================================
// Anchoring System
// ============================================================================

/** How a spatial object is anchored to the real world */
export type AnchorType =
  | 'none'           // Free-floating, no anchor
  | 'floor'          // Anchored to detected floor
  | 'wall'           // Anchored to detected wall
  | 'table'          // Anchored to detected table/horizontal surface
  | 'ceiling'        // Anchored to detected ceiling
  | 'qr-code'        // Anchored via QR code scan
  | 'image-target'   // Anchored via image recognition (future)
  | 'persistent'     // Persistent XR anchor (saved across sessions)
  | 'manual';        // Manually placed at specific coordinates

/** QR code anchor data */
export interface QRCodeAnchor {
  type: 'qr-code';
  /** The QR code content/URL that identifies this anchor */
  qrContent: string;
  /** Offset from QR code center */
  offset: SpatialPosition;
  /** Rotation relative to QR code plane */
  relativeRotation: SpatialRotation;
  /** Physical size of QR code in meters (for scale calculation) */
  qrSizeMeters?: number;
  /** Last time this QR was detected */
  lastDetected?: number;
}

/** Room mapping anchor data (uses WebXR planes) */
export interface RoomMappingAnchor {
  type: 'floor' | 'wall' | 'table' | 'ceiling';
  /** Offset from anchor point on the surface */
  surfaceOffset: { x: number; y: number };
  /** Height above/distance from surface */
  distanceFromSurface: number;
  /** Whether to billboard (always face user) */
  billboard?: boolean;
}

/** Persistent XR anchor (survives app restarts) */
export interface PersistentAnchor {
  type: 'persistent';
  /** WebXR persistent anchor handle (string from requestPersistentHandle) */
  anchorHandle: string;
  /** When the anchor was created */
  createdAt: number;
  /** Human-readable label for the anchor location */
  label?: string;
}

/** Manual coordinate anchor */
export interface ManualAnchor {
  type: 'manual' | 'none';
  /** World-space position */
  worldPosition: SpatialPosition;
  /** World-space rotation */
  worldRotation: SpatialRotation;
}

/** Union of all anchor types */
export type SpatialAnchor =
  | QRCodeAnchor
  | RoomMappingAnchor
  | PersistentAnchor
  | ManualAnchor;

// ============================================================================
// 3D Media Types
// ============================================================================

/** Extended media types for spatial stickers */
export type SpatialMediaType =
  | StickerMediaType        // 'image' | 'lottie' | 'gif' | 'video' | 'emoji' | 'icon'
  | '3d-model'              // GLTF/GLB 3D model
  | '3d-primitive'          // Built-in primitive (cube, sphere, etc.)
  | 'particle-effect'       // Particle system
  | 'spatial-audio';        // 3D positioned audio source

/** 3D model configuration */
export interface Model3DConfig {
  /** Model URL (GLTF/GLB) */
  modelUrl: string;
  /** Model format */
  format: 'gltf' | 'glb' | 'obj';
  /** Animation to play (if model has animations) */
  animation?: string;
  /** Animation loop mode */
  animationLoop?: boolean;
  /** Material overrides */
  materialOverrides?: {
    color?: string;
    metalness?: number;
    roughness?: number;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
}

/** 3D primitive configuration */
export interface Primitive3DConfig {
  /** Primitive type */
  primitiveType: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'ring';
  /** Base dimensions in meters */
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  /** Material settings */
  material: {
    color: string;
    metalness: number;
    roughness: number;
    opacity: number;
    wireframe?: boolean;
    emissive?: string;
    emissiveIntensity?: number;
  };
}

// ============================================================================
// Spatial Sticker
// ============================================================================

/**
 * SpatialSticker - A sticker that works in both 2D and 3D
 *
 * In 2D mode: Renders as normal 2D sticker on canvas
 * In 3D mode: Renders as 3D object in VR/AR space
 *
 * Key Features:
 * - Same click behaviors work in both modes (launch widget, open URL, etc.)
 * - Can be anchored to real-world surfaces or QR codes
 * - Supports both 2D media (images) and 3D media (models)
 */
export interface SpatialSticker {
  id: string;
  canvasId: string;
  name: string;

  // === 2D Properties (for canvas mode) ===
  /** 2D position on canvas */
  position2D: WidgetPosition;
  /** 2D size in pixels */
  size2D: { width: number; height: number };
  /** 2D rotation in degrees */
  rotation2D: number;
  /** Z-index for 2D layering */
  zIndex: number;

  // === 3D Properties (for VR/AR mode) ===
  /** 3D transform in world space */
  transform3D: SpatialTransform;
  /** How this object is anchored in 3D space */
  anchor: SpatialAnchor;
  /** Whether to billboard in 3D (always face camera) */
  billboard3D: boolean;

  // === Media (works in both modes) ===
  /** Media type */
  mediaType: SpatialMediaType;
  /** Media source (URL for images/models, data for primitives) */
  mediaSrc: string;
  /** 3D model config (if mediaType is '3d-model') */
  model3DConfig?: Model3DConfig;
  /** 3D primitive config (if mediaType is '3d-primitive') */
  primitive3DConfig?: Primitive3DConfig;
  /** Fallback 2D image for 3D models (shown in 2D canvas mode) */
  fallback2DImage?: string;

  // === Interaction (same in both modes) ===
  /** Click behavior */
  clickBehavior: StickerClickBehavior;
  /** Associated widget definition ID */
  linkedWidgetDefId?: string;
  /** Associated widget instance ID (if widget is spawned) */
  linkedWidgetInstanceId?: string;
  /** URL to open (for open-url behavior) */
  linkedUrl?: string;
  /** Event to emit (for emit-event behavior) */
  linkedEvent?: string;
  /** Pipeline ID to run (for run-pipeline behavior) */
  linkedPipelineId?: string;
  /** Whether the linked widget is currently visible */
  widgetVisible?: boolean;
  /** Widget spawn position (adapts to mode) */
  widgetSpawnPosition?: 'right' | 'left' | 'above' | 'below' | 'overlay' | 'center' | 'floating';

  // === Visual Effects ===
  /** Opacity (0-1) */
  opacity: number;
  /** Hover animation */
  hoverAnimation?: 'scale' | 'bounce' | 'shake' | 'glow' | 'float' | 'none';
  /** Click animation */
  clickAnimation?: 'pulse' | 'ripple' | 'shrink' | 'none';
  /** Glow/highlight color */
  glowColor?: string;
  /** Cast shadows in 3D */
  castShadow?: boolean;
  /** Receive shadows in 3D */
  receiveShadow?: boolean;

  // === State ===
  /** Whether sticker is locked */
  locked: boolean;
  /** Visibility in each mode */
  visibleIn: {
    desktop: boolean;
    vr: boolean;
    ar: boolean;
  };
  /** Group ID for multi-select */
  groupId?: string;
  /** Layer ID */
  layerId?: string;

  // === Metadata ===
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// QR Code Registration
// ============================================================================

/**
 * Registered QR code that can anchor spatial content
 * Users scan real-world QR codes to attach virtual stickers to them
 */
export interface RegisteredQRCode {
  id: string;
  userId: string;
  /** The QR code content (URL or identifier) */
  content: string;
  /** Human-readable label */
  label: string;
  /** Physical size of QR code in meters */
  sizeMeters: number;
  /** Stickers attached to this QR code */
  attachedStickerIds: string[];
  /** When this QR was registered */
  createdAt: number;
  /** Last time this QR was scanned */
  lastScanned?: number;
}

// ============================================================================
// Spatial Scene Configuration
// ============================================================================

/**
 * Configuration for how spatial content is rendered
 */
export interface SpatialSceneConfig {
  /** Enable room visualization (show detected planes) */
  showRoomVisualization: boolean;
  /** Enable occlusion (virtual objects hidden behind real surfaces) */
  enableOcclusion: boolean;
  /** Enable shadows */
  enableShadows: boolean;
  /** Ambient light intensity (0-1) */
  ambientIntensity: number;
  /** Environment preset for VR */
  vrEnvironment: 'none' | 'sunset' | 'studio' | 'park' | 'night' | 'custom';
  /** Custom environment map URL */
  customEnvironmentUrl?: string;
  /** Floor grid visibility */
  showFloorGrid: boolean;
  /** Snap to surfaces when placing */
  snapToSurfaces: boolean;
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_SPATIAL_POSITION: SpatialPosition = { x: 0, y: 1.5, z: -1 };
export const DEFAULT_SPATIAL_ROTATION: SpatialRotation = { x: 0, y: 0, z: 0 };
export const DEFAULT_SPATIAL_SCALE: SpatialScale = { x: 1, y: 1, z: 1 };

export const DEFAULT_SPATIAL_TRANSFORM: SpatialTransform = {
  position: DEFAULT_SPATIAL_POSITION,
  rotation: DEFAULT_SPATIAL_ROTATION,
  scale: DEFAULT_SPATIAL_SCALE,
};

export const DEFAULT_MANUAL_ANCHOR: ManualAnchor = {
  type: 'none',
  worldPosition: DEFAULT_SPATIAL_POSITION,
  worldRotation: DEFAULT_SPATIAL_ROTATION,
};

export const DEFAULT_SPATIAL_SCENE_CONFIG: SpatialSceneConfig = {
  showRoomVisualization: false,
  enableOcclusion: true,
  enableShadows: true,
  ambientIntensity: 0.5,
  vrEnvironment: 'sunset',
  showFloorGrid: false,
  snapToSurfaces: true,
};

// ============================================================================
// Factory Functions
// ============================================================================

/** Generate unique spatial sticker ID */
export function generateSpatialStickerId(): string {
  return `spatial-sticker-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Create a new spatial sticker with defaults */
export function createSpatialSticker(
  overrides: Partial<SpatialSticker> & { canvasId: string; name: string }
): SpatialSticker {
  const now = Date.now();

  return {
    id: generateSpatialStickerId(),
    canvasId: overrides.canvasId,
    name: overrides.name,

    // 2D defaults
    position2D: { x: 100, y: 100 },
    size2D: { width: 100, height: 100 },
    rotation2D: 0,
    zIndex: 1,

    // 3D defaults
    transform3D: { ...DEFAULT_SPATIAL_TRANSFORM },
    anchor: { ...DEFAULT_MANUAL_ANCHOR },
    billboard3D: false,

    // Media defaults
    mediaType: 'image',
    mediaSrc: '',

    // Interaction defaults
    clickBehavior: 'none',
    widgetVisible: false,

    // Visual defaults
    opacity: 1,
    hoverAnimation: 'scale',
    clickAnimation: 'pulse',
    castShadow: true,
    receiveShadow: true,

    // State defaults
    locked: false,
    visibleIn: {
      desktop: true,
      vr: true,
      ar: true,
    },

    // Metadata
    createdAt: now,
    updatedAt: now,

    // Apply overrides
    ...overrides,
  };
}

/** Create a QR-anchored spatial sticker */
export function createQRAnchoredSticker(
  canvasId: string,
  name: string,
  qrContent: string,
  qrSizeMeters: number = 0.1
): SpatialSticker {
  return createSpatialSticker({
    canvasId,
    name,
    anchor: {
      type: 'qr-code',
      qrContent,
      offset: { x: 0, y: 0.1, z: 0 },
      relativeRotation: { x: 0, y: 0, z: 0 },
      qrSizeMeters,
    },
  });
}

/** Create a surface-anchored spatial sticker */
export function createSurfaceAnchoredSticker(
  canvasId: string,
  name: string,
  surfaceType: 'floor' | 'wall' | 'table' | 'ceiling'
): SpatialSticker {
  return createSpatialSticker({
    canvasId,
    name,
    anchor: {
      type: surfaceType,
      surfaceOffset: { x: 0, y: 0 },
      distanceFromSurface: surfaceType === 'wall' ? 0.05 : 0,
      billboard: surfaceType !== 'wall',
    },
  });
}

// ============================================================================
// Additional Factory Functions
// ============================================================================

/** Click behavior option - can be string or object with type/event/url */
type ClickBehaviorOption =
  | StickerClickBehavior
  | { type: StickerClickBehavior; event?: string; url?: string };

/** Options for creating a primitive sticker */
export interface CreatePrimitiveStickerOptions {
  name: string;
  primitiveType: 'plane' | 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus';
  color?: string;
  transform?: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  };
  visibleIn?: { desktop: boolean; vr: boolean; ar: boolean };
  clickBehavior?: ClickBehaviorOption;
  canvasId?: string;
}

/** Parse click behavior option into behavior string and linked fields */
function parseClickBehavior(opt?: ClickBehaviorOption): {
  clickBehavior: StickerClickBehavior;
  linkedEvent?: string;
  linkedUrl?: string;
} {
  if (!opt) return { clickBehavior: 'none' };
  if (typeof opt === 'string') return { clickBehavior: opt };
  return {
    clickBehavior: opt.type,
    linkedEvent: opt.event,
    linkedUrl: opt.url,
  };
}

/** Create a primitive sticker with detailed options */
export function createPrimitiveSticker(options: CreatePrimitiveStickerOptions): SpatialSticker {
  const {
    name,
    primitiveType,
    color = '#8b5cf6',
    transform,
    visibleIn = { desktop: true, vr: true, ar: true },
    clickBehavior: clickBehaviorOpt,
    canvasId = 'default',
  } = options;

  const { clickBehavior, linkedEvent, linkedUrl } = parseClickBehavior(clickBehaviorOpt);

  return createSpatialSticker({
    canvasId,
    name,
    mediaType: '3d-primitive',
    mediaSrc: primitiveType,
    transform3D: {
      position: transform?.position ?? DEFAULT_SPATIAL_POSITION,
      rotation: transform?.rotation ?? DEFAULT_SPATIAL_ROTATION,
      scale: transform?.scale ?? DEFAULT_SPATIAL_SCALE,
    },
    primitive3DConfig: {
      primitiveType: primitiveType as 'cube' | 'sphere' | 'cylinder',
      dimensions: { width: 1, height: 1, depth: 1 },
      material: {
        color,
        metalness: 0.1,
        roughness: 0.5,
        opacity: 1,
      },
    },
    visibleIn,
    clickBehavior,
    linkedEvent,
    linkedUrl,
  });
}

/** Options for creating an image sticker */
export interface CreateImageStickerOptions {
  name: string;
  src: string;
  transform?: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  };
  visibleIn?: { desktop: boolean; vr: boolean; ar: boolean };
  billboard?: boolean;
  clickBehavior?: ClickBehaviorOption;
  canvasId?: string;
}

/** Create an image sticker with detailed options */
export function createImageSticker(options: CreateImageStickerOptions): SpatialSticker {
  const {
    name,
    src,
    transform,
    visibleIn = { desktop: true, vr: true, ar: true },
    billboard = false,
    clickBehavior: clickBehaviorOpt,
    canvasId = 'default',
  } = options;

  const { clickBehavior, linkedEvent, linkedUrl } = parseClickBehavior(clickBehaviorOpt);

  return createSpatialSticker({
    canvasId,
    name,
    mediaType: 'image',
    mediaSrc: src,
    transform3D: {
      position: transform?.position ?? DEFAULT_SPATIAL_POSITION,
      rotation: transform?.rotation ?? DEFAULT_SPATIAL_ROTATION,
      scale: transform?.scale ?? DEFAULT_SPATIAL_SCALE,
    },
    billboard3D: billboard,
    visibleIn,
    clickBehavior,
    linkedEvent,
    linkedUrl,
  });
}

// ============================================================================
// Type Guards
// ============================================================================

export function isQRCodeAnchor(anchor: SpatialAnchor): anchor is QRCodeAnchor {
  return anchor.type === 'qr-code';
}

export function isRoomMappingAnchor(anchor: SpatialAnchor): anchor is RoomMappingAnchor {
  return ['floor', 'wall', 'table', 'ceiling'].includes(anchor.type);
}

export function isPersistentAnchor(anchor: SpatialAnchor): anchor is PersistentAnchor {
  return anchor.type === 'persistent';
}

export function isManualAnchor(anchor: SpatialAnchor): anchor is ManualAnchor {
  return anchor.type === 'manual' || anchor.type === 'none';
}

export function is3DMediaType(mediaType: SpatialMediaType): boolean {
  return ['3d-model', '3d-primitive', 'particle-effect', 'spatial-audio'].includes(mediaType);
}
