/**
 * StickerNest v2 - Canvas Entity Types
 *
 * CanvasEntity represents a renderable entity on the canvas.
 * Unlike Entity (pure data), CanvasEntity includes position, size, and visual state.
 *
 * Architecture:
 * - Entity = data (content, style properties)
 * - CanvasEntity = renderable (position, size, selection state)
 * - CanvasEntity.entityId links to Entity for data
 */

import type { EntityType, VectorShapeType, Object3DPrimitiveType } from './entities';

// ============================================================================
// Core Canvas Entity Interface
// ============================================================================

/** Base properties for all canvas entities */
export interface CanvasEntityBase {
  /** Unique canvas entity ID */
  id: string;
  /** Reference to data entity in EntityStore (optional - some canvas entities are ephemeral) */
  entityId?: string;
  /** Entity type discriminator */
  type: CanvasEntityType;
  /** Display name */
  name: string;
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Rotation in degrees */
  rotation: number;
  /** Z-index for layering */
  zIndex: number;
  /** Whether entity is locked (cannot be moved/resized) */
  locked: boolean;
  /** Whether entity is visible */
  visible: boolean;
  /** Opacity (0-1) */
  opacity: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/** Canvas entity types (subset of EntityType that can render on canvas) */
export type CanvasEntityType = 'vector' | 'text' | 'image' | 'object3d';

// ============================================================================
// Specific Canvas Entity Types
// ============================================================================

/** Vector shape canvas entity */
export interface CanvasVectorEntity extends CanvasEntityBase {
  type: 'vector';
  /** Shape type */
  shapeType: VectorShapeType;
  /** Fill color */
  fill: string;
  /** Fill opacity (0-1) */
  fillOpacity: number;
  /** Stroke color */
  stroke: string;
  /** Stroke width in pixels */
  strokeWidth: number;
  /** Stroke opacity (0-1) */
  strokeOpacity: number;
  /** Corner radius for rectangles */
  cornerRadius: number;
  /** Number of sides for polygons */
  sides?: number;
  /** Number of points for stars */
  points?: number;
  /** Inner radius ratio for stars (0-1) */
  innerRadius?: number;
  /** SVG path data (for custom shapes) */
  pathData?: string;
  /** Line start point (for lines/arrows) */
  startPoint?: { x: number; y: number };
  /** Line end point (for lines/arrows) */
  endPoint?: { x: number; y: number };
  /** Arrow head style */
  arrowHead?: 'none' | 'arrow' | 'triangle' | 'circle' | 'square';
  /** Arrow tail style */
  arrowTail?: 'none' | 'arrow' | 'triangle' | 'circle' | 'square';
}

/** Text canvas entity */
export interface CanvasTextEntity extends CanvasEntityBase {
  type: 'text';
  /** Text content */
  content: string;
  /** Font family */
  fontFamily: string;
  /** Font size in pixels */
  fontSize: number;
  /** Font weight */
  fontWeight: number | 'normal' | 'bold';
  /** Text color */
  color: string;
  /** Text alignment */
  textAlign: 'left' | 'center' | 'right' | 'justify';
  /** Line height multiplier */
  lineHeight: number;
  /** Letter spacing in pixels */
  letterSpacing: number;
  /** Text decoration */
  textDecoration: 'none' | 'underline' | 'line-through';
  /** Whether text is currently being edited */
  isEditing?: boolean;
}

/** Image canvas entity */
export interface CanvasImageEntity extends CanvasEntityBase {
  type: 'image';
  /** Image source URL or data URL */
  src: string;
  /** Original image width */
  naturalWidth: number;
  /** Original image height */
  naturalHeight: number;
  /** Object fit mode */
  objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Alt text for accessibility */
  alt: string;
  /** Border radius in pixels */
  borderRadius: number;
  /** Image filters */
  filters?: CanvasImageFilters;
}

/** Image filter settings */
export interface CanvasImageFilters {
  brightness?: number;  // 0-200, 100 = normal
  contrast?: number;    // 0-200, 100 = normal
  saturation?: number;  // 0-200, 100 = normal
  blur?: number;        // pixels
  grayscale?: number;   // 0-100
}

/** 3D object canvas entity */
export interface Canvas3DEntity extends CanvasEntityBase {
  type: 'object3d';
  /** Primitive type */
  primitiveType: Object3DPrimitiveType;
  /** Depth for 3D */
  depth: number;
  /** Material color */
  color: string;
  /** Material type */
  materialType: 'basic' | 'standard' | 'phong' | 'toon' | 'wireframe';
  /** Metalness for PBR materials (0-1) */
  metalness: number;
  /** Roughness for PBR materials (0-1) */
  roughness: number;
  /** 3D rotation { x, y, z } in degrees */
  rotation3D: { x: number; y: number; z: number };
  /** 3D scale { x, y, z } */
  scale3D: { x: number; y: number; z: number };
  /** Model URL for custom objects */
  modelUrl?: string;
  /** Texture URL */
  textureUrl?: string;
  /** Cast shadows */
  castShadow: boolean;
  /** Receive shadows */
  receiveShadow: boolean;
}

/** Union of all canvas entity types */
export type CanvasEntity =
  | CanvasVectorEntity
  | CanvasTextEntity
  | CanvasImageEntity
  | Canvas3DEntity;

// ============================================================================
// Type Guards
// ============================================================================

/** Type guard for CanvasVectorEntity */
export function isCanvasVectorEntity(entity: CanvasEntity): entity is CanvasVectorEntity {
  return entity.type === 'vector';
}

/** Type guard for CanvasTextEntity */
export function isCanvasTextEntity(entity: CanvasEntity): entity is CanvasTextEntity {
  return entity.type === 'text';
}

/** Type guard for CanvasImageEntity */
export function isCanvasImageEntity(entity: CanvasEntity): entity is CanvasImageEntity {
  return entity.type === 'image';
}

/** Type guard for Canvas3DEntity */
export function isCanvas3DEntity(entity: CanvasEntity): entity is Canvas3DEntity {
  return entity.type === 'object3d';
}

// ============================================================================
// Default Values
// ============================================================================

/** Default base properties */
const DEFAULT_BASE: Omit<CanvasEntityBase, 'id' | 'name' | 'type' | 'createdAt' | 'updatedAt'> = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  zIndex: 0,
  locked: false,
  visible: true,
  opacity: 1,
};

/** Default vector entity properties */
export const DEFAULT_CANVAS_VECTOR: Omit<CanvasVectorEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'> = {
  ...DEFAULT_BASE,
  type: 'vector',
  shapeType: 'rectangle',
  fill: '#8b5cf6',
  fillOpacity: 1,
  stroke: '#ffffff',
  strokeWidth: 0,
  strokeOpacity: 1,
  cornerRadius: 0,
};

/** Default text entity properties */
export const DEFAULT_CANVAS_TEXT: Omit<CanvasTextEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'> = {
  ...DEFAULT_BASE,
  type: 'text',
  width: 200,
  height: 50,
  content: 'Text',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 24,
  fontWeight: 'normal',
  color: '#1f2937',
  textAlign: 'left',
  lineHeight: 1.5,
  letterSpacing: 0,
  textDecoration: 'none',
};

/** Default image entity properties */
export const DEFAULT_CANVAS_IMAGE: Omit<CanvasImageEntity, 'id' | 'name' | 'src' | 'createdAt' | 'updatedAt'> = {
  ...DEFAULT_BASE,
  type: 'image',
  width: 200,
  height: 200,
  naturalWidth: 0,
  naturalHeight: 0,
  objectFit: 'contain',
  alt: '',
  borderRadius: 0,
};

/** Default 3D entity properties */
export const DEFAULT_CANVAS_3D: Omit<Canvas3DEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'> = {
  ...DEFAULT_BASE,
  type: 'object3d',
  primitiveType: 'cube',
  depth: 100,
  color: '#8b5cf6',
  materialType: 'standard',
  metalness: 0.1,
  roughness: 0.5,
  rotation3D: { x: 0, y: 0, z: 0 },
  scale3D: { x: 1, y: 1, z: 1 },
  castShadow: true,
  receiveShadow: true,
};

// ============================================================================
// Factory Functions
// ============================================================================

/** Generate unique canvas entity ID */
export function generateCanvasEntityId(type: CanvasEntityType): string {
  return `ce-${type}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Create a new canvas vector entity */
export function createCanvasVectorEntity(
  overrides: Partial<Omit<CanvasVectorEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>> = {}
): CanvasVectorEntity {
  const now = Date.now();
  return {
    ...DEFAULT_CANVAS_VECTOR,
    ...overrides,
    id: generateCanvasEntityId('vector'),
    name: overrides.name || `Shape ${now % 1000}`,
    createdAt: now,
    updatedAt: now,
  };
}

/** Create a new canvas text entity */
export function createCanvasTextEntity(
  overrides: Partial<Omit<CanvasTextEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>> = {}
): CanvasTextEntity {
  const now = Date.now();
  return {
    ...DEFAULT_CANVAS_TEXT,
    ...overrides,
    id: generateCanvasEntityId('text'),
    name: overrides.name || `Text ${now % 1000}`,
    createdAt: now,
    updatedAt: now,
  };
}

/** Create a new canvas image entity */
export function createCanvasImageEntity(
  src: string,
  overrides: Partial<Omit<CanvasImageEntity, 'type' | 'id' | 'src' | 'createdAt' | 'updatedAt'>> = {}
): CanvasImageEntity {
  const now = Date.now();
  return {
    ...DEFAULT_CANVAS_IMAGE,
    ...overrides,
    src,
    id: generateCanvasEntityId('image'),
    name: overrides.name || `Image ${now % 1000}`,
    createdAt: now,
    updatedAt: now,
  };
}

/** Create a new canvas 3D entity */
export function createCanvas3DEntity(
  overrides: Partial<Omit<Canvas3DEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>> = {}
): Canvas3DEntity {
  const now = Date.now();
  return {
    ...DEFAULT_CANVAS_3D,
    ...overrides,
    id: generateCanvasEntityId('object3d'),
    name: overrides.name || `3D Object ${now % 1000}`,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Get bounding box for a canvas entity */
export function getEntityBounds(entity: CanvasEntity): {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
} {
  return {
    x: entity.x,
    y: entity.y,
    width: entity.width,
    height: entity.height,
    right: entity.x + entity.width,
    bottom: entity.y + entity.height,
    centerX: entity.x + entity.width / 2,
    centerY: entity.y + entity.height / 2,
  };
}

/** Check if a point is inside an entity's bounds (ignoring rotation) */
export function isPointInEntity(
  entity: CanvasEntity,
  pointX: number,
  pointY: number
): boolean {
  const bounds = getEntityBounds(entity);
  return (
    pointX >= bounds.x &&
    pointX <= bounds.right &&
    pointY >= bounds.y &&
    pointY <= bounds.bottom
  );
}

/** Check if two entities overlap (ignoring rotation) */
export function doEntitiesOverlap(a: CanvasEntity, b: CanvasEntity): boolean {
  const boundsA = getEntityBounds(a);
  const boundsB = getEntityBounds(b);

  return !(
    boundsA.right < boundsB.x ||
    boundsB.right < boundsA.x ||
    boundsA.bottom < boundsB.y ||
    boundsB.bottom < boundsA.y
  );
}

/** Clone a canvas entity with a new ID */
export function cloneCanvasEntity<T extends CanvasEntity>(
  entity: T,
  offset: { x?: number; y?: number } = { x: 20, y: 20 }
): T {
  const now = Date.now();
  return {
    ...entity,
    id: generateCanvasEntityId(entity.type),
    name: `${entity.name} (copy)`,
    x: entity.x + (offset.x || 0),
    y: entity.y + (offset.y || 0),
    createdAt: now,
    updatedAt: now,
  };
}
