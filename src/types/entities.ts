/**
 * StickerNest v2 - Entity Types
 * Typed entity system for canvas objects (text, images, widgets, animations)
 * Entities are the atomic data units that widgets can manipulate
 */

/** Base entity properties shared by all entity types */
export interface EntityBase {
  /** Unique entity identifier */
  id: string;
  /** Entity type discriminator */
  type: EntityType;
  /** Display name */
  name: string;
  /** Parent widget instance ID (if bound to a widget) */
  widgetInstanceId?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/** All supported entity types */
export type EntityType = 'text' | 'image' | 'lottie' | 'widget' | 'timer' | 'data' | 'audio' | 'video' | 'vector' | 'object3d';

/** Text entity for editable text content */
export interface TextEntity extends EntityBase {
  type: 'text';
  /** Text content */
  content: string;
  /** Font family */
  fontFamily: string;
  /** Font size in pixels */
  fontSize: number;
  /** Font weight (100-900 or 'normal', 'bold') */
  fontWeight: number | 'normal' | 'bold';
  /** Text color (CSS color string) */
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

/** Image entity for visual content */
export interface ImageEntity extends EntityBase {
  type: 'image';
  /** Image source URL or data URL */
  src: string;
  /** Original image width */
  naturalWidth: number;
  /** Original image height */
  naturalHeight: number;
  /** Display width */
  width: number;
  /** Display height */
  height: number;
  /** Object fit mode */
  objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Alt text for accessibility */
  alt: string;
  /** Border radius in pixels */
  borderRadius: number;
  /** Opacity (0-1) */
  opacity: number;
  /** Optional filters */
  filters?: ImageFilters;
}

/** Image filter settings */
export interface ImageFilters {
  brightness?: number; // 0-200, 100 = normal
  contrast?: number;   // 0-200, 100 = normal
  saturation?: number; // 0-200, 100 = normal
  blur?: number;       // pixels
  grayscale?: number;  // 0-100
}

/** Lottie animation entity */
export interface LottieEntity extends EntityBase {
  type: 'lottie';
  /** Animation JSON data or URL */
  animationData: object | string;
  /** Playback state */
  playState: 'playing' | 'paused' | 'stopped';
  /** Loop animation */
  loop: boolean;
  /** Playback speed (1 = normal) */
  speed: number;
  /** Current frame */
  currentFrame: number;
  /** Total frames */
  totalFrames: number;
  /** Animation direction */
  direction: 1 | -1;
  /** Auto-play on load */
  autoplay: boolean;
}

/** Widget instance entity (reference to a mounted widget) */
export interface WidgetInstanceEntity extends EntityBase {
  type: 'widget';
  /** Referenced widget definition ID */
  widgetDefId: string;
  /** Widget version */
  version: string;
  /** Widget-specific state */
  state: Record<string, unknown>;
  /** Widget source */
  source: 'official' | 'user' | 'generated' | 'local';
}

/** Timer entity for time-based operations */
export interface TimerEntity extends EntityBase {
  type: 'timer';
  /** Duration in milliseconds */
  duration: number;
  /** Elapsed time in milliseconds */
  elapsed: number;
  /** Timer state */
  state: 'idle' | 'running' | 'paused' | 'completed';
  /** Whether to repeat */
  repeat: boolean;
  /** Repeat count (-1 for infinite) */
  repeatCount: number;
  /** Current repeat iteration */
  currentIteration: number;
}

/** Generic data entity for arbitrary data */
export interface DataEntity extends EntityBase {
  type: 'data';
  /** Data value (any JSON-serializable value) */
  value: unknown;
  /** Data schema/type hint */
  schema?: string;
}

/** Audio entity for sound content */
export interface AudioEntity extends EntityBase {
  type: 'audio';
  /** Audio source URL */
  src: string;
  /** Playback state */
  playState: 'playing' | 'paused' | 'stopped';
  /** Volume (0-1) */
  volume: number;
  /** Muted state */
  muted: boolean;
  /** Loop audio */
  loop: boolean;
  /** Current time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
}

/** Video entity for video content */
export interface VideoEntity extends EntityBase {
  type: 'video';
  /** Video source URL */
  src: string;
  /** Playback state */
  playState: 'playing' | 'paused' | 'stopped';
  /** Volume (0-1) */
  volume: number;
  /** Muted state */
  muted: boolean;
  /** Loop video */
  loop: boolean;
  /** Current time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Display width */
  width: number;
  /** Display height */
  height: number;
  /** Poster image URL */
  poster?: string;
}

/** Vector shape types */
export type VectorShapeType = 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'star' | 'ellipse' | 'line' | 'arrow';

/** Vector shape entity for 2D graphics */
export interface VectorShapeEntity extends EntityBase {
  type: 'vector';
  /** Shape type */
  shapeType: VectorShapeType;
  /** Display width */
  width: number;
  /** Display height */
  height: number;
  /** Fill color (CSS color string) */
  fill: string;
  /** Fill opacity (0-1) */
  fillOpacity: number;
  /** Stroke color (CSS color string) */
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
  /** Rotation in degrees */
  rotation: number;
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

/** 3D object primitive types */
export type Object3DPrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'custom';

/** 3D object entity for 3D graphics */
export interface Object3DEntity extends EntityBase {
  type: 'object3d';
  /** Primitive type or 'custom' for loaded models */
  primitiveType: Object3DPrimitiveType;
  /** Display width */
  width: number;
  /** Display height */
  height: number;
  /** Depth for 3D */
  depth: number;
  /** Material color */
  color: string;
  /** Material type */
  materialType: 'basic' | 'standard' | 'phong' | 'toon' | 'wireframe';
  /** Material opacity (0-1) */
  opacity: number;
  /** Metalness for PBR materials (0-1) */
  metalness: number;
  /** Roughness for PBR materials (0-1) */
  roughness: number;
  /** Rotation in degrees { x, y, z } */
  rotation3D: { x: number; y: number; z: number };
  /** Scale { x, y, z } */
  scale3D: { x: number; y: number; z: number };
  /** Model URL for custom objects */
  modelUrl?: string;
  /** Model format */
  modelFormat?: 'gltf' | 'glb' | 'obj' | 'fbx';
  /** Texture URL */
  textureUrl?: string;
  /** Environment map URL */
  envMapUrl?: string;
  /** Cast shadows */
  castShadow: boolean;
  /** Receive shadows */
  receiveShadow: boolean;
}

/** Union type of all entity types */
export type Entity =
  | TextEntity
  | ImageEntity
  | LottieEntity
  | WidgetInstanceEntity
  | TimerEntity
  | DataEntity
  | AudioEntity
  | VideoEntity
  | VectorShapeEntity
  | Object3DEntity;

/** Type guard for TextEntity */
export function isTextEntity(entity: Entity): entity is TextEntity {
  return entity.type === 'text';
}

/** Type guard for ImageEntity */
export function isImageEntity(entity: Entity): entity is ImageEntity {
  return entity.type === 'image';
}

/** Type guard for LottieEntity */
export function isLottieEntity(entity: Entity): entity is LottieEntity {
  return entity.type === 'lottie';
}

/** Type guard for WidgetInstanceEntity */
export function isWidgetInstanceEntity(entity: Entity): entity is WidgetInstanceEntity {
  return entity.type === 'widget';
}

/** Type guard for TimerEntity */
export function isTimerEntity(entity: Entity): entity is TimerEntity {
  return entity.type === 'timer';
}

/** Type guard for DataEntity */
export function isDataEntity(entity: Entity): entity is DataEntity {
  return entity.type === 'data';
}

/** Type guard for AudioEntity */
export function isAudioEntity(entity: Entity): entity is AudioEntity {
  return entity.type === 'audio';
}

/** Type guard for VideoEntity */
export function isVideoEntity(entity: Entity): entity is VideoEntity {
  return entity.type === 'video';
}

/** Type guard for VectorShapeEntity */
export function isVectorShapeEntity(entity: Entity): entity is VectorShapeEntity {
  return entity.type === 'vector';
}

/** Type guard for Object3DEntity */
export function isObject3DEntity(entity: Entity): entity is Object3DEntity {
  return entity.type === 'object3d';
}

/** Default values for creating new entities */
export const DEFAULT_TEXT_ENTITY: Omit<TextEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'> = {
  type: 'text',
  content: '',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 16,
  fontWeight: 'normal',
  color: '#e2e8f0',
  textAlign: 'left',
  lineHeight: 1.5,
  letterSpacing: 0,
  textDecoration: 'none',
};

export const DEFAULT_IMAGE_ENTITY: Omit<ImageEntity, 'id' | 'name' | 'src' | 'createdAt' | 'updatedAt'> = {
  type: 'image',
  naturalWidth: 0,
  naturalHeight: 0,
  width: 200,
  height: 200,
  objectFit: 'contain',
  alt: '',
  borderRadius: 0,
  opacity: 1,
};

export const DEFAULT_LOTTIE_ENTITY: Omit<LottieEntity, 'id' | 'name' | 'animationData' | 'createdAt' | 'updatedAt'> = {
  type: 'lottie',
  playState: 'stopped',
  loop: true,
  speed: 1,
  currentFrame: 0,
  totalFrames: 0,
  direction: 1,
  autoplay: true,
};

export const DEFAULT_TIMER_ENTITY: Omit<TimerEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'> = {
  type: 'timer',
  duration: 60000, // 1 minute
  elapsed: 0,
  state: 'idle',
  repeat: false,
  repeatCount: 0,
  currentIteration: 0,
};

export const DEFAULT_VECTOR_SHAPE_ENTITY: Omit<VectorShapeEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'> = {
  type: 'vector',
  shapeType: 'rectangle',
  width: 100,
  height: 100,
  fill: '#8b5cf6',
  fillOpacity: 1,
  stroke: '#ffffff',
  strokeWidth: 0,
  strokeOpacity: 1,
  cornerRadius: 0,
  rotation: 0,
};

export const DEFAULT_OBJECT3D_ENTITY: Omit<Object3DEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'> = {
  type: 'object3d',
  primitiveType: 'cube',
  width: 100,
  height: 100,
  depth: 100,
  color: '#8b5cf6',
  materialType: 'standard',
  opacity: 1,
  metalness: 0.1,
  roughness: 0.5,
  rotation3D: { x: 0, y: 0, z: 0 },
  scale3D: { x: 1, y: 1, z: 1 },
  castShadow: true,
  receiveShadow: true,
};

/** Generate a unique entity ID */
export function generateEntityId(type: EntityType): string {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Create a new entity with defaults */
export function createEntity<T extends Entity>(
  type: T['type'],
  overrides: Partial<Omit<T, 'type' | 'id' | 'createdAt' | 'updatedAt'>> & { name?: string }
): T {
  const now = Date.now();
  const base: EntityBase = {
    id: generateEntityId(type),
    type,
    name: overrides.name || `New ${type}`,
    createdAt: now,
    updatedAt: now,
  };

  switch (type) {
    case 'text':
      return { ...base, ...DEFAULT_TEXT_ENTITY, ...overrides } as T;
    case 'image':
      return { ...base, ...DEFAULT_IMAGE_ENTITY, src: '', ...overrides } as T;
    case 'lottie':
      return { ...base, ...DEFAULT_LOTTIE_ENTITY, animationData: {}, ...overrides } as T;
    case 'timer':
      return { ...base, ...DEFAULT_TIMER_ENTITY, ...overrides } as T;
    case 'widget':
      return {
        ...base,
        widgetDefId: '',
        version: '1.0.0',
        state: {},
        source: 'user',
        ...overrides,
      } as T;
    case 'data':
      return { ...base, value: null, ...overrides } as T;
    case 'audio':
      return {
        ...base,
        src: '',
        playState: 'stopped',
        volume: 1,
        muted: false,
        loop: false,
        currentTime: 0,
        duration: 0,
        ...overrides,
      } as T;
    case 'video':
      return {
        ...base,
        src: '',
        playState: 'stopped',
        volume: 1,
        muted: false,
        loop: false,
        currentTime: 0,
        duration: 0,
        width: 640,
        height: 360,
        ...overrides,
      } as T;
    case 'vector':
      return { ...base, ...DEFAULT_VECTOR_SHAPE_ENTITY, ...overrides } as T;
    case 'object3d':
      return { ...base, ...DEFAULT_OBJECT3D_ENTITY, ...overrides } as T;
    default:
      throw new Error(`Unknown entity type: ${type}`);
  }
}

