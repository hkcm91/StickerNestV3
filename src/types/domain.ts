/**
 * StickerNest v2 - Domain Types
 * Core domain entities for users, canvases, widgets, and instances
 */

export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export type CanvasVisibility = "private" | "unlisted" | "public";

/** Canvas size preset identifiers */
export type CanvasSizePresetId =
  | 'fullscreen' | 'hd' | 'qhd' | '4k' | 'portrait-hd'
  | 'square' | 'instagram-post' | 'instagram-story'
  | 'facebook-cover' | 'twitter-header' | 'youtube-thumbnail' | 'og-image'
  | 'a4-portrait' | 'a4-landscape' | 'letter-portrait' | 'poster-24x36' | 'business-card'
  | 'custom';

/** Canvas size preset definition */
export interface CanvasSizePreset {
  id: CanvasSizePresetId;
  name: string;
  width: number;
  height: number;
  category: 'screen' | 'social' | 'print' | 'custom';
}

/** Built-in canvas size presets */
export const CANVAS_SIZE_PRESETS: CanvasSizePreset[] = [
  // Screen sizes
  { id: 'fullscreen', name: 'Fullscreen (Chrome)', width: 1920, height: 937, category: 'screen' },
  { id: 'hd', name: 'HD (1920x1080)', width: 1920, height: 1080, category: 'screen' },
  { id: 'qhd', name: 'QHD (2560x1440)', width: 2560, height: 1440, category: 'screen' },
  { id: '4k', name: '4K UHD (3840x2160)', width: 3840, height: 2160, category: 'screen' },
  { id: 'portrait-hd', name: 'Portrait HD (1080x1920)', width: 1080, height: 1920, category: 'screen' },
  // Social media
  { id: 'square', name: 'Square (1080x1080)', width: 1080, height: 1080, category: 'social' },
  { id: 'instagram-post', name: 'Instagram Post (1080x1350)', width: 1080, height: 1350, category: 'social' },
  { id: 'instagram-story', name: 'Story (1080x1920)', width: 1080, height: 1920, category: 'social' },
  { id: 'facebook-cover', name: 'Facebook Cover (820x312)', width: 820, height: 312, category: 'social' },
  { id: 'twitter-header', name: 'Twitter Header (1500x500)', width: 1500, height: 500, category: 'social' },
  { id: 'youtube-thumbnail', name: 'YouTube Thumbnail (1280x720)', width: 1280, height: 720, category: 'social' },
  { id: 'og-image', name: 'OG Image (1200x630)', width: 1200, height: 630, category: 'social' },
  // Print sizes
  { id: 'a4-portrait', name: 'A4 Portrait', width: 2480, height: 3508, category: 'print' },
  { id: 'a4-landscape', name: 'A4 Landscape', width: 3508, height: 2480, category: 'print' },
  { id: 'letter-portrait', name: 'Letter Portrait', width: 2550, height: 3300, category: 'print' },
  { id: 'poster-24x36', name: 'Poster 24x36"', width: 7200, height: 10800, category: 'print' },
  { id: 'business-card', name: 'Business Card', width: 1050, height: 600, category: 'print' },
];

export interface Canvas {
  id: string;
  userId: string;
  name: string;
  visibility: CanvasVisibility;
  slug?: string;
  createdAt: string;
  /** Canvas width in pixels */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
  /** Whether canvas requires password for access */
  hasPassword?: boolean;
  /** Canvas description */
  description?: string;
  /** Thumbnail URL for previews */
  thumbnailUrl?: string;
  /** View count for public canvases */
  viewCount?: number;
  /** Background configuration */
  backgroundConfig?: CanvasBackground;
}

/** Canvas sharing configuration */
export interface CanvasShareSettings {
  /** Visibility level */
  visibility: CanvasVisibility;
  /** Custom slug (URL path) */
  slug?: string;
  /** Password for protected access (plain text, will be hashed) */
  password?: string;
  /** Whether to allow embedding */
  allowEmbed?: boolean;
  /** Expiration date for shared link */
  expiresAt?: string;
}

/** Canvas access session for password-protected canvases */
export interface CanvasAccessSession {
  canvasId: string;
  sessionToken: string;
  expiresAt: string;
}

export type WidgetKind = "2d" | "3d" | "audio" | "video" | "hybrid" | "container" | "display" | "interactive";

export interface WidgetCapabilities {
  draggable: boolean;
  resizable: boolean;
  rotatable?: boolean;
  supports3d?: boolean;
  supportsAudio?: boolean;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  version: string;
  kind: WidgetKind;
  entry: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  capabilities: WidgetCapabilities;
  assets?: string[];
  sandbox?: boolean;
}

export type WidgetSizePreset = "xs" | "sm" | "md" | "lg" | "xl" | "banner" | "full";

export interface WidgetPosition {
  x: number;
  y: number;
}

/**
 * Responsive layout for a specific viewport mode
 * Stores position and size overrides for mobile/tablet modes
 */
export interface ResponsiveLayout {
  /** Position in this viewport mode */
  position: WidgetPosition;
  /** Width in this viewport mode */
  width: number;
  /** Height in this viewport mode */
  height: number;
  /** Whether widget is visible in this mode (can hide widgets per mode) */
  visible?: boolean;
}

/** Scale mode for widget content within the frame */
export type WidgetScaleMode = 'crop' | 'scale' | 'stretch' | 'contain';

export interface WidgetInstance {
  id: string;
  canvasId: string;
  widgetDefId: string;
  version?: string;
  position: WidgetPosition;
  sizePreset: WidgetSizePreset;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  state: Record<string, any>;
  /** Optional metadata for widget source tracking */
  metadata?: {
    source?: 'user' | 'official' | 'local' | 'generated';
    /** For AI-generated widgets: inline content */
    generatedContent?: {
      html: string;
      manifest: any;
    };
    [key: string]: any;
  };
  /** Parent widget ID for nested/container widgets */
  parentId?: string;
  /** Whether this widget is a container that can host children */
  isContainer?: boolean;
  /** Child widget IDs for container widgets */
  childIds?: string[];
  /** Display name for the widget in layer panel */
  name?: string;
  /** Group ID this widget belongs to */
  groupId?: string;
  /** Layer ID this widget belongs to */
  layerId?: string;
  /** Whether widget is locked (cannot be selected/moved) */
  locked?: boolean;
  /** Whether widget is visible */
  visible?: boolean;
  /** Widget opacity (0-1) */
  opacity?: number;
  /**
   * Scale mode for widget content within its frame:
   * - crop: No scaling, content at native size, clips to frame boundaries
   * - scale: Scale content proportionally to fit frame (may leave gaps)
   * - stretch: Stretch content to fill frame (may distort)
   * - contain: Scale to fit inside frame, center content (letterbox)
   * If not set, defaults from manifest or canvas settings
   */
  scaleMode?: WidgetScaleMode;
  /**
   * Original/native content dimensions for scale calculations.
   * Captured when widget is first placed so resizing scales correctly.
   * If not set, widget's initial width/height are used.
   */
  contentSize?: { width: number; height: number };
  /**
   * Crop state for widget content - defines visible area of content
   * Values are percentages (0-100) from each edge
   */
  crop?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /**
   * Flip state for widget transformations
   */
  flipX?: boolean;
  flipY?: boolean;
  /**
   * Lock aspect ratio when resizing
   */
  aspectLocked?: boolean;
  /**
   * Mobile-specific layout overrides.
   * When viewport is in mobile mode, these values are used instead of the root position/size.
   * If not set, the widget uses its root position/size for mobile mode.
   */
  mobileLayout?: ResponsiveLayout;
}

/**
 * Widget Group - A collection of widgets that can be manipulated together
 */
export interface WidgetGroup {
  id: string;
  canvasId: string;
  /** Display name for the group */
  name: string;
  /** IDs of widgets in this group */
  widgetIds: string[];
  /** Whether group is locked */
  locked?: boolean;
  /** Whether group is visible */
  visible?: boolean;
  /** Group opacity (applied to all children) */
  opacity?: number;
  /** Z-index for the group (all children share this base z-index) */
  zIndex: number;
  /** Nested group ID (for groups within groups) */
  parentGroupId?: string;
  /** Computed bounding box (updated when children change) */
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Whether group is collapsed in layers panel */
  collapsed?: boolean;
  /** Group color for visual identification */
  color?: string;
  /** Group blend mode */
  blendMode?: string;
}

/**
 * Container widget configuration
 * Extends WidgetInstance with container-specific properties
 */
export interface ContainerWidgetConfig {
  /** Layout mode for children */
  layout: 'free' | 'grid' | 'stack-h' | 'stack-v';
  /** Padding inside container */
  padding: number;
  /** Gap between children (for grid/stack layouts) */
  gap: number;
  /** Grid columns (for grid layout) */
  gridColumns?: number;
  /** Whether children clip to container bounds */
  clipChildren: boolean;
  /** Whether children inherit container theme */
  inheritTheme: boolean;
}

/**
 * Pipeline - A data flow graph connecting widget inputs and outputs
 * Designed for simple I/O routing; can be extended for logic nodes in future
 */
export interface Pipeline {
  id: string;
  canvasId: string;
  name: string;
  description?: string;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  /** Whether pipeline is active and should route events */
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** Widget edits required for this pipeline (AI-generated) */
  widgetEdits?: PipelineWidgetEdit[];
  /** Pipeline version for migrations */
  version?: number;
}

/**
 * Widget edit required for pipeline compatibility
 * Generated by AI when widgets need capability upgrades
 */
export interface PipelineWidgetEdit {
  /** Widget ID to modify */
  widgetId: string;
  /** Widget name for display */
  widgetName: string;
  /** Capabilities to add */
  addInputs?: string[];
  addOutputs?: string[];
  /** Code changes required */
  codeChanges?: Array<{
    type: 'add-handler' | 'add-emitter' | 'modify-manifest' | 'add-state';
    description: string;
    code?: string;
  }>;
  /** Whether this edit has been applied */
  applied?: boolean;
  /** Edit complexity */
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex';
}

/**
 * Pipeline node types:
 * - "widget": backed by a WidgetInstance
 * - "transform": data transformation node (future Phase 9+)
 * - "system": system-level node like canvas events (future Phase 9+)
 */
export type PipelineNodeType = "widget" | "transform" | "system";

/**
 * Direction for pipeline ports
 */
export type PipelineDirection = "input" | "output";

/**
 * Port definition for pipeline nodes
 * References manifest.inputs or manifest.outputs schema
 */
export interface PipelinePort {
  name: string;
  direction: PipelineDirection;
  type: string; // Data type (string, number, boolean, object, any)
  description?: string;
}

/**
 * Pipeline node - represents a widget or system component in the pipeline graph
 */
export interface PipelineNode {
  id: string;
  /** Widget instance ID for widget-backed nodes, null for system/transform nodes */
  widgetInstanceId: string | null;
  /** Node type - determines behavior */
  type: PipelineNodeType;
  /** Position for visual node editor (future Phase 9) */
  position: WidgetPosition;
  /** Optional label override */
  label?: string;
  /** Cached port definitions from widget manifest */
  inputs?: PipelinePort[];
  outputs?: PipelinePort[];
}

/**
 * Connection endpoint reference
 */
export interface PipelineEndpoint {
  nodeId: string;
  portName: string;
}

/**
 * Pipeline connection - routes data from one node's output to another's input
 */
export interface PipelineConnection {
  id: string;
  from: PipelineEndpoint;
  to: PipelineEndpoint;
  /** Whether this connection is active */
  enabled?: boolean;
}

// Legacy type aliases for backwards compatibility
export type PipelineConnectionLegacy = {
  id: string;
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
};

// ============================================
// Canvas Background & Multi-Canvas Support
// ============================================

/**
 * Canvas background content types
 * The canvas itself can render various background content types
 */
export type CanvasBackgroundType =
  | 'color'      // Solid color
  | 'gradient'   // CSS gradient
  | 'image'      // Static image
  | 'video'      // Video playback
  | 'pattern'    // Repeating pattern
  | '3d'         // Three.js 3D scene
  | 'vector'     // SVG vector graphics
  | 'visualizer' // Audio visualizer
  | 'shader'     // Custom WebGL shader
  | 'widget'     // Another widget as background
  | 'parallax';  // Themed parallax background with layers

/**
 * Canvas background configuration
 */
export interface CanvasBackground {
  type: CanvasBackgroundType;
  /** For color type: CSS color */
  color?: string;
  /** For gradient type: CSS gradient string */
  gradient?: string;
  /** For image/video type: URL or blob (legacy) */
  src?: string;
  /** For image/pattern type: URL */
  imageUrl?: string;
  /** For video type: URL or MediaStream ID */
  videoSrc?: string;
  /** Background size: cover, contain, or specific size */
  size?: 'cover' | 'contain' | string;
  /** Background position */
  position?: string;
  /** Background repeat for patterns */
  repeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
  /** For 3d type: Three.js scene configuration */
  scene3d?: Canvas3DScene;
  /** For vector type: SVG content or URL */
  vectorContent?: string;
  /** For visualizer type: audio visualization config */
  visualizerConfig?: CanvasVisualizerConfig;
  /** For shader type: GLSL shader code */
  shaderCode?: string;
  /** For widget type: widget instance ID */
  widgetId?: string;
  /** For parallax type: parallax configuration */
  parallaxConfig?: import('./customTheme').ParallaxConfig;
  /** Opacity of background (0-1) */
  opacity?: number;
  /** Blur filter amount in px */
  blur?: number;
  /** Blend mode with widgets */
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
  /** Whether background is interactive */
  interactive?: boolean;
}

/**
 * 3D scene configuration for canvas background
 */
export interface Canvas3DScene {
  /** Scene preset: skybox, particles, terrain, custom */
  preset?: 'skybox' | 'particles' | 'terrain' | 'custom';
  /** Camera position */
  cameraPosition?: { x: number; y: number; z: number };
  /** Camera target */
  cameraTarget?: { x: number; y: number; z: number };
  /** Ambient light color */
  ambientLight?: string;
  /** Scene objects (for custom preset) */
  objects?: Canvas3DObject[];
  /** Animation settings */
  animation?: {
    autoRotate?: boolean;
    rotateSpeed?: number;
  };
}

/**
 * 3D object in canvas scene
 */
export interface Canvas3DObject {
  id: string;
  type: 'mesh' | 'light' | 'particle-system' | 'model';
  geometry?: string;
  material?: Record<string, any>;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  modelUrl?: string;
}

/**
 * Audio visualizer configuration
 */
export interface CanvasVisualizerConfig {
  /** Visualization type */
  type: 'bars' | 'waveform' | 'circular' | 'particles' | 'custom';
  /** Color scheme */
  colors?: string[];
  /** Sensitivity (0-1) */
  sensitivity?: number;
  /** Smoothing factor (0-1) */
  smoothing?: number;
  /** Audio source: microphone, audio element, or widget output */
  audioSource?: 'microphone' | 'element' | 'widget';
  /** Audio element ID or widget ID */
  audioSourceId?: string;
}

/**
 * Extended Canvas with background and dimensions
 */
export interface CanvasExtended extends Canvas {
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Canvas background configuration */
  background?: CanvasBackground;
  /** Default zoom level */
  defaultZoom?: number;
  /** Canvas thumbnail for multi-canvas view */
  thumbnail?: string;
  /** Canvas description */
  description?: string;
  /** Canvas tags for organization */
  tags?: string[];
  /** Canvas order in list */
  order?: number;
}

// ============================================
// Widget Groups & Layers
// ============================================

/**
 * Widget group - groups multiple widgets together
 * Grouped widgets move, resize, and rotate together
 */


/**
 * Canvas layer - organizational layer for widgets
 * Each layer can contain widgets and groups
 */
export interface CanvasLayer {
  id: string;
  canvasId: string;
  name: string;
  /** Order in layer stack (higher = on top) */
  order: number;
  /** Whether layer is visible */
  visible: boolean;
  /** Whether layer is locked (widgets cannot be selected/modified) */
  locked: boolean;
  /** Layer opacity (affects all widgets on layer) */
  opacity: number;
  /** Layer blend mode */
  blendMode?: string;
  /** Layer color for identification */
  color?: string;
  /** Whether layer is collapsed in panel */
  collapsed?: boolean;
}

/**
 * Extended WidgetInstance with layer and lock support
 */
export interface WidgetInstanceExtended extends WidgetInstance {
  /** Layer ID this widget belongs to */
  layerId?: string;
  /** Group ID this widget belongs to */
  groupId?: string;
  /** Whether widget position is locked */
  locked?: boolean;
  /** Widget-level opacity (separate from layer opacity) */
  opacity?: number;
  /** Widget-level visibility */
  visible?: boolean;
  /** Widget-level blend mode */
  blendMode?: string;
  /** Original position before any group transform */
  originalPosition?: WidgetPosition;
  /** Original size before any resize */
  originalSize?: { width: number; height: number };
}

// ============================================
// Undo/Redo System
// ============================================

/**
 * Canvas action types for undo/redo
 */
export type CanvasActionType =
  | 'widget:add'
  | 'widget:remove'
  | 'widget:move'
  | 'widget:resize'
  | 'widget:rotate'
  | 'widget:update'
  | 'widget:lock'
  | 'widget:unlock'
  | 'widget:reorder'
  | 'group:create'
  | 'group:delete'
  | 'group:add-widget'
  | 'group:remove-widget'
  | 'layer:create'
  | 'layer:delete'
  | 'layer:reorder'
  | 'layer:update'
  | 'canvas:resize'
  | 'canvas:background'
  | 'selection:change'
  | 'batch'; // For grouping multiple actions

/**
 * Canvas action for undo/redo history
 */
export interface CanvasAction {
  id: string;
  type: CanvasActionType;
  timestamp: number;
  /** Data before the action (for undo) */
  before: any;
  /** Data after the action (for redo) */
  after: any;
  /** Description for UI */
  description?: string;
  /** For batch actions: nested actions */
  actions?: CanvasAction[];
}

/**
 * Canvas history state
 */
export interface CanvasHistory {
  /** Past actions (for undo) */
  past: CanvasAction[];
  /** Future actions (for redo) */
  future: CanvasAction[];
  /** Maximum history size */
  maxSize: number;
  /** Whether currently in batch mode */
  isBatching: boolean;
  /** Current batch actions */
  currentBatch: CanvasAction[];
}

// ============================================
// Stickers - Interactive Canvas Elements
// ============================================

/**
 * Sticker media type - the visual representation
 */
export type StickerMediaType =
  | 'image'      // PNG, JPG, WebP, SVG
  | 'lottie'     // Lottie JSON animation
  | 'gif'        // Animated GIF
  | 'video'      // Short video loop
  | 'emoji'      // System emoji
  | 'icon';      // Icon font or SVG icon

/**
 * Sticker behavior when clicked
 */
export type StickerClickBehavior =
  | 'toggle-widget'    // Show/hide associated widget
  | 'launch-widget'    // Always show widget (create if not exists)
  | 'open-url'         // Open external URL
  | 'emit-event'       // Emit custom event
  | 'run-pipeline'     // Trigger a pipeline
  | 'none';            // Decorative only

/**
 * Sticker instance on canvas
 * A sticker is an interactive visual element that can launch/house widgets
 */
export interface StickerInstance {
  id: string;
  canvasId: string;
  /** Display name */
  name: string;
  /** Media type */
  mediaType: StickerMediaType;
  /** Media source URL or data */
  mediaSrc: string;
  /** Position on canvas */
  position: WidgetPosition;
  /** Size in pixels */
  width: number;
  height: number;
  /** Rotation in degrees */
  rotation: number;
  /** Z-index for layering */
  zIndex: number;
  /** Click behavior */
  clickBehavior: StickerClickBehavior;
  /** Associated widget definition ID (for toggle/launch behaviors) */
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
  /** Widget spawn position relative to sticker */
  widgetSpawnPosition?: 'right' | 'left' | 'above' | 'below' | 'overlay' | 'center';
  /** Widget spawn offset from sticker */
  widgetSpawnOffset?: { x: number; y: number };
  /** Animation on hover */
  hoverAnimation?: 'scale' | 'bounce' | 'shake' | 'glow' | 'none';
  /** Animation on click */
  clickAnimation?: 'pulse' | 'ripple' | 'shrink' | 'none';
  /** Opacity (0-1) */
  opacity?: number;
  /** Whether sticker is locked */
  locked?: boolean;
  /** Layer ID */
  layerId?: string;
  /** Group ID */
  groupId?: string;
  /** Custom CSS filter */
  filter?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Whether to show badge when widget has updates */
  showBadge?: boolean;
  /** Badge content (number or text) */
  badgeContent?: string | number;
}

// ============================================
// Dock System - Widget Housing
// ============================================

/**
 * Dock zone type - where widgets can be docked
 */
export type DockZoneType =
  | 'panel'       // Scrollable panel with tabs
  | 'toolbar'     // Horizontal/vertical toolbar
  | 'tray'        // System tray style
  | 'deck'        // Grid of slots (Steam Deck style)
  | 'sidebar'     // Collapsible sidebar
  | 'slot';       // Single widget slot

/**
 * Dock zone - an area that can house widgets
 * Can be part of a widget or a standalone canvas element
 */
export interface DockZone {
  id: string;
  canvasId: string;
  /** Zone type */
  type: DockZoneType;
  /** Display name */
  name: string;
  /** Position (if standalone) */
  position?: WidgetPosition;
  /** Size */
  width: number;
  height: number;
  /** Parent widget ID (if zone is inside a widget) */
  parentWidgetId?: string;
  /** Relative position within parent widget (0-1) */
  relativePosition?: { x: number; y: number };
  /** IDs of docked widgets */
  dockedWidgetIds: string[];
  /** Maximum widgets this zone can hold */
  maxWidgets?: number;
  /** Layout direction for multiple widgets */
  layout: 'horizontal' | 'vertical' | 'grid' | 'tabs';
  /** Grid columns (for grid layout) */
  gridColumns?: number;
  /** Gap between docked widgets */
  gap?: number;
  /** Padding inside zone */
  padding?: number;
  /** Whether zone is collapsed */
  collapsed?: boolean;
  /** Whether zone accepts drops */
  acceptsDrops: boolean;
  /** Widget definition IDs this zone accepts (empty = all) */
  acceptedWidgetTypes?: string[];
  /** Background color/style */
  background?: string;
  /** Border style */
  border?: string;
  /** Border radius */
  borderRadius?: number;
  /** Z-index */
  zIndex: number;
  /** Whether zone is visible */
  visible: boolean;
  /** Tab labels (for tabs layout) */
  tabLabels?: string[];
  /** Active tab index */
  activeTab?: number;
}

/**
 * Docked widget state - additional state for widgets that are docked
 */
export interface DockedWidgetState {
  /** Widget instance ID */
  widgetInstanceId: string;
  /** Dock zone ID */
  dockZoneId: string;
  /** Position within dock zone (index or grid position) */
  dockPosition: number | { row: number; col: number };
  /** Tab index (for tabbed docks) */
  tabIndex?: number;
  /** Original position before docking */
  originalPosition: WidgetPosition;
  /** Original size before docking */
  originalSize: { width: number; height: number };
  /** Whether widget is minimized in dock */
  minimized?: boolean;
  /** Custom size within dock (overrides default) */
  dockedSize?: { width: number; height: number };
}

/**
 * Saved dock configuration - reusable dock layout
 */
export interface DockConfiguration {
  /** Unique ID */
  id: string;
  /** Configuration name */
  name: string;
  /** Description */
  description?: string;
  /** When created */
  createdAt: number;
  /** Last modified */
  updatedAt: number;
  /** Dock zones in this configuration (without canvas-specific IDs) */
  zones: DockZoneTemplate[];
  /** Tags for organization */
  tags?: string[];
  /** Whether this is a favorite */
  isFavorite?: boolean;
}

/**
 * Dock zone template - used in saved configurations
 */
export interface DockZoneTemplate {
  /** Template ID (will be replaced when applied) */
  templateId: string;
  /** Zone type */
  type: DockZoneType;
  /** Display name */
  name: string;
  /** Relative position (percentage of canvas) */
  relativeX: number;
  relativeY: number;
  /** Size */
  width: number;
  height: number;
  /** Layout */
  layout: 'horizontal' | 'vertical' | 'grid' | 'tabs';
  /** Grid columns */
  gridColumns?: number;
  /** Gap */
  gap?: number;
  /** Padding */
  padding?: number;
  /** Tab labels */
  tabLabels?: string[];
  /** Widget definition IDs to pre-populate (optional) */
  preloadWidgetDefIds?: string[];
  /** Styling */
  background?: string;
  border?: string;
  borderRadius?: number;
}

/**
 * Sticker library item - saved sticker template
 */
export interface StickerLibraryItem {
  id: string;
  /** Display name */
  name: string;
  /** Media type */
  mediaType: StickerMediaType;
  /** Media source (URL or base64) */
  mediaSrc: string;
  /** Thumbnail for library view */
  thumbnail?: string;
  /** Category for organization */
  category: string;
  /** Tags for search */
  tags: string[];
  /** Default size */
  defaultWidth: number;
  defaultHeight: number;
  /** Default click behavior */
  defaultBehavior?: StickerClickBehavior;
  /** Whether this is a user-uploaded sticker */
  isUserUploaded?: boolean;
  /** Upload date */
  createdAt?: string;
}

/**
 * Sticker pack - collection of stickers
 */
export interface StickerPack {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  stickers: StickerLibraryItem[];
  /** Author/source */
  author?: string;
  /** License */
  license?: string;
  /** Download URL for pack */
  downloadUrl?: string;
}

// ============================================
// Canvas Controller - Canvas as a Widget
// ============================================

/**
 * Canvas controller state - exposed inputs/outputs for the canvas
 * Note: CanvasBackground and CanvasBackgroundType are defined above
 */
export interface CanvasControllerState {
  /** Current background configuration */
  background: CanvasBackground;
  /** Grid configuration */
  grid: {
    visible: boolean;
    size: number;
    color: string;
    opacity: number;
  };
  /** Canvas filters */
  filters: {
    brightness?: number;  // 0-200, default 100
    contrast?: number;    // 0-200, default 100
    saturation?: number;  // 0-200, default 100
    hue?: number;         // 0-360
    blur?: number;        // 0-20
    grayscale?: number;   // 0-100
  };
  /** Canvas transform */
  transform: {
    zoom: number;         // 0.1-5, default 1
    rotation: number;     // 0-360
    flipX: boolean;
    flipY: boolean;
  };
  /** Overlay effects */
  overlay?: {
    type: 'none' | 'vignette' | 'scanlines' | 'noise' | 'custom';
    intensity: number;    // 0-100
    customCss?: string;
  };
  /** Canvas border radius in pixels */
  borderRadius?: number;  // 0-100, default 16
}

/**
 * Canvas input event types - events the canvas listens for
 */
export type CanvasInputEvent =
  | { type: 'canvas:set-background'; payload: Partial<CanvasBackground> }
  | { type: 'canvas:set-background-color'; payload: { color: string } }
  | { type: 'canvas:set-background-image'; payload: { url: string; size?: string } }
  | { type: 'canvas:set-background-video'; payload: { src: string } }
  | { type: 'canvas:set-grid'; payload: Partial<CanvasControllerState['grid']> }
  | { type: 'canvas:set-filters'; payload: Partial<CanvasControllerState['filters']> }
  | { type: 'canvas:set-transform'; payload: Partial<CanvasControllerState['transform']> }
  | { type: 'canvas:set-overlay'; payload: CanvasControllerState['overlay'] }
  | { type: 'canvas:set-border-radius'; payload: { radius: number } }
  | { type: 'canvas:reset'; payload?: undefined }
  | { type: 'canvas:screenshot'; payload?: { format?: 'png' | 'jpeg'; quality?: number } };

/**
 * Canvas output event types - events the canvas emits
 */
export type CanvasOutputEvent =
  | { type: 'canvas:clicked'; payload: { x: number; y: number } }
  | { type: 'canvas:double-clicked'; payload: { x: number; y: number } }
  | { type: 'canvas:background-changed'; payload: CanvasBackground }
  | { type: 'canvas:zoom-changed'; payload: { zoom: number } }
  | { type: 'canvas:screenshot-ready'; payload: { dataUrl: string } };

// ============================================
// Canvas Settings - User configurable options
// ============================================

/**
 * Canvas scroll/pan behavior
 */
export type CanvasScrollMode =
  | 'fixed'        // Canvas fits viewport, no scrolling
  | 'scroll'       // Standard scrollbars when canvas > viewport
  | 'pan'          // Click and drag to pan (no scrollbars)
  | 'infinite';    // Infinite canvas, auto-expands

/**
 * Canvas interaction mode for viewers
 */
export type CanvasInteractionMode =
  | 'view-only'     // Viewers can only look, no interaction
  | 'interact'      // Viewers can interact with widgets but not move them
  | 'full';         // Viewers have full edit access

/**
 * Zoom behavior settings
 */
export interface CanvasZoomSettings {
  /** Enable zoom controls */
  enabled: boolean;
  /** Minimum zoom level (0.1 = 10%) */
  min: number;
  /** Maximum zoom level (5 = 500%) */
  max: number;
  /** Zoom step for buttons/scroll (0.1 = 10% increments) */
  step: number;
  /** Enable scroll wheel zoom */
  wheelZoom: boolean;
  /** Enable pinch-to-zoom on touch devices */
  pinchZoom: boolean;
  /** Modifier key required for wheel zoom (null = no modifier) */
  wheelModifier: 'ctrl' | 'meta' | 'shift' | null;
}

/**
 * Touch/mobile specific settings
 */
export interface CanvasTouchSettings {
  /** Enable touch pan (two-finger drag) */
  panEnabled: boolean;
  /** Enable single-finger pan in view mode */
  singleFingerPan: boolean;
  /** Enable long-press to select */
  longPressSelect: boolean;
  /** Long press duration in ms */
  longPressDuration: number;
  /** Enable swipe gestures */
  swipeGestures: boolean;
}

/**
 * Widget default settings
 */
export interface CanvasWidgetDefaults {
  /** Default width for widgets without size config */
  defaultWidth: number;
  /** Default height for widgets without size config */
  defaultHeight: number;
  /** Default scale mode for widgets */
  scaleMode: 'crop' | 'scale' | 'stretch' | 'contain';
  /** Snap new widgets to grid */
  snapToGrid: boolean;
  /** Stack new widgets with offset */
  stackOffset: { x: number; y: number };
}

/**
 * Full canvas settings configuration
 */
export interface CanvasSettings {
  /** Canvas scroll/pan behavior */
  scrollMode: CanvasScrollMode;
  /** Interaction mode for viewers */
  interactionMode: CanvasInteractionMode;
  /** Zoom settings */
  zoom: CanvasZoomSettings;
  /** Touch/mobile settings */
  touch: CanvasTouchSettings;
  /** Widget defaults */
  widgetDefaults: CanvasWidgetDefaults;
  /** Show minimap for large canvases */
  showMinimap: boolean;
  /** Show canvas size indicator */
  showSizeIndicator: boolean;
  /** Auto-fit canvas to viewport on load */
  autoFitOnLoad: boolean;
  /** Center canvas in viewport when smaller than viewport */
  centerWhenSmaller: boolean;
  /** Enable keyboard shortcuts */
  keyboardShortcuts: boolean;
  /** Canvas background configuration */
  background?: CanvasBackground;
}

/**
 * Default canvas settings
 */
export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  scrollMode: 'scroll',
  interactionMode: 'full',
  zoom: {
    enabled: true,
    min: 0.1,
    max: 5,
    step: 0.1,
    wheelZoom: true,
    pinchZoom: true,
    wheelModifier: 'ctrl',
  },
  touch: {
    panEnabled: true,
    singleFingerPan: false,
    longPressSelect: true,
    longPressDuration: 500,
    swipeGestures: false,
  },
  widgetDefaults: {
    defaultWidth: 320,
    defaultHeight: 240,
    scaleMode: 'contain',
    snapToGrid: false,
    stackOffset: { x: 30, y: 30 },
  },
  showMinimap: false,
  showSizeIndicator: true,
  autoFitOnLoad: false,
  centerWhenSmaller: true,
  keyboardShortcuts: true,
};
