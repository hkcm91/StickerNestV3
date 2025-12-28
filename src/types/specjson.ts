/**
 * Widget Generator 2.0 - SpecJSON Types
 *
 * The canonical specification format for declarative widget definition.
 * AI writes SpecJSON only. Templates produce deterministic code output.
 *
 * VERSION: 2.0.0
 */

// ============================================================================
// CORE SPECJSON TYPES
// ============================================================================

/**
 * The canonical SpecJSON format - single source of truth for widget definition
 */
export interface SpecJSON {
  /** Unique widget identifier (kebab-case) */
  id: string;

  /** Semantic version (e.g., 1.0.0) */
  version: string;

  /** Human-readable display name */
  displayName: string;

  /** Widget category for organization */
  category: WidgetCategory;

  /** Short description of widget functionality */
  description: string;

  /** Visual asset configuration */
  visual: VisualSpec;

  /** State schema definition */
  state: StateSpec;

  /** Event trigger definitions */
  events: EventSpec;

  /** Action definitions */
  actions: ActionSpec;

  /** API contract - exposed methods and accepted calls */
  api: APISpec;

  /** External dependencies */
  dependencies: DependencySpec;

  /** Marketplace and pipeline permissions */
  permissions: PermissionSpec;

  /** Optional moddlet definitions for behavior overrides */
  moddlets?: ModdletSpec[];

  /** Optional AI capabilities */
  ai?: AISpec;

  /** Size configuration */
  size?: SizeSpec;

  /** Tags for discovery */
  tags?: string[];

  /** Author information */
  author?: string;
}

// ============================================================================
// VISUAL SPECIFICATION
// ============================================================================

export type VisualType = 'png' | 'svg' | 'lottie' | 'css' | 'canvas' | 'html';

export interface VisualSpec {
  /** Primary visual rendering type */
  type: VisualType;

  /** Default asset path (relative to assets folder) */
  defaultAsset?: string;

  /** Available skins/themes */
  skins: SkinSpec[];

  /** Sprite sheet configuration for animations */
  spriteSheet?: SpriteSheetSpec;

  /** Lottie animation configuration */
  lottie?: LottieSpec;

  /** CSS variables exposed for theming */
  cssVariables?: CSSVariableSpec[];

  /** Background configuration */
  background?: BackgroundSpec;
}

export interface SkinSpec {
  id: string;
  name: string;
  previewAsset?: string;
  cssVariables?: Record<string, string>;
  assets?: string[];
}

export interface SpriteSheetSpec {
  asset: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps?: number;
  animations?: Record<string, { start: number; end: number; loop?: boolean }>;
}

export interface LottieSpec {
  asset: string;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
  segments?: Record<string, [number, number]>;
}

export interface CSSVariableSpec {
  name: string;
  defaultValue: string;
  description?: string;
  type?: 'color' | 'size' | 'font' | 'number' | 'string';
}

export interface BackgroundSpec {
  type: 'color' | 'gradient' | 'image' | 'transparent';
  value?: string;
}

// ============================================================================
// STATE SPECIFICATION
// ============================================================================

export type StateValueType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';

export interface StateSpec {
  [key: string]: StateFieldSpec;
}

export interface StateFieldSpec {
  type: StateValueType;
  default?: unknown;
  description?: string;
  persist?: boolean;
  validate?: StateValidation;
}

export interface StateValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: unknown[];
  required?: boolean;
}

// ============================================================================
// EVENT SPECIFICATION
// ============================================================================

export type EventTrigger =
  | 'onClick'
  | 'onDoubleClick'
  | 'onHover'
  | 'onHoverEnd'
  | 'onMount'
  | 'onUnmount'
  | 'onResize'
  | 'onFocus'
  | 'onBlur'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'onDragStart'
  | 'onDrag'
  | 'onDragEnd'
  | 'onDrop'
  | 'onContextMenu'
  | 'onWheel'
  | 'onTouchStart'
  | 'onTouchMove'
  | 'onTouchEnd'
  | 'onAnimationEnd'
  | 'onTransitionEnd'
  | 'onInterval'
  | 'onTimeout'
  | 'onIdle'
  | 'onVisibilityChange'
  | 'onStateChange'
  | 'onInput'
  | 'onOutput'
  | 'onError';

export interface EventSpec {
  /** Event trigger to action mappings */
  triggers: Record<EventTrigger, string[]>;

  /** Custom event definitions */
  custom?: CustomEventSpec[];

  /** Events this widget broadcasts */
  broadcasts?: BroadcastSpec[];

  /** Events this widget listens for */
  subscriptions?: SubscriptionSpec[];
}

export interface CustomEventSpec {
  id: string;
  name: string;
  description?: string;
  payload?: Record<string, StateValueType>;
}

export interface BroadcastSpec {
  event: string;
  description?: string;
  payload?: Record<string, StateValueType>;
}

export interface SubscriptionSpec {
  event: string;
  handler: string;
}

// ============================================================================
// ACTION SPECIFICATION
// ============================================================================

export interface ActionSpec {
  [actionId: string]: ActionDefinition;
}

export type ActionType =
  | 'setState'
  | 'toggleState'
  | 'incrementState'
  | 'decrementState'
  | 'resetState'
  | 'emit'
  | 'broadcast'
  | 'animate'
  | 'playSound'
  | 'navigate'
  | 'fetch'
  | 'custom'
  | 'conditional'
  | 'sequence'
  | 'parallel';

export interface ActionDefinition {
  type: ActionType;
  description?: string;
  params?: ActionParams;
  condition?: ActionCondition;
}

export interface ActionParams {
  /** For setState: the state key to modify */
  stateKey?: string;
  /** For setState: the value to set (or expression) */
  value?: unknown;
  /** For toggleState: the state key to toggle */
  toggleKey?: string;
  /** For increment/decrement: the state key and amount */
  amount?: number;
  /** For emit: the event type */
  eventType?: string;
  /** For emit: the event payload */
  eventPayload?: unknown;
  /** For broadcast: the broadcast event */
  broadcastEvent?: string;
  /** For animate: animation name/keyframes */
  animation?: string;
  /** For animate: duration in ms */
  duration?: number;
  /** For playSound: audio asset path */
  sound?: string;
  /** For navigate: URL or route */
  url?: string;
  /** For fetch: API endpoint */
  endpoint?: string;
  /** For fetch: HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** For custom: custom code reference */
  customHandler?: string;
  /** For sequence/parallel: list of actions to execute */
  actions?: string[];
}

export interface ActionCondition {
  type: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'custom';
  stateKey?: string;
  value?: unknown;
  expression?: string;
}

// ============================================================================
// API SPECIFICATION
// ============================================================================

export interface APISpec {
  /** Methods this widget exposes for external calls */
  exposes: ExposedMethodSpec[];

  /** Methods this widget accepts from other widgets */
  accepts: AcceptedMethodSpec[];

  /** Pipeline input ports */
  inputs: PortSpec[];

  /** Pipeline output ports */
  outputs: PortSpec[];
}

export interface ExposedMethodSpec {
  id: string;
  name: string;
  description?: string;
  params?: Record<string, StateValueType>;
  returns?: StateValueType;
}

export interface AcceptedMethodSpec {
  id: string;
  description?: string;
  handler: string;
}

export interface PortSpec {
  id: string;
  name: string;
  type: StateValueType;
  description?: string;
  required?: boolean;
  default?: unknown;
}

// ============================================================================
// DEPENDENCY SPECIFICATION
// ============================================================================

export interface DependencySpec {
  /** NPM packages (for React/compiled widgets) */
  npm?: Record<string, string>;

  /** CDN scripts to load */
  cdn?: CDNDependency[];

  /** Other widgets this widget depends on */
  widgets?: string[];

  /** Required browser APIs */
  browserAPIs?: BrowserAPI[];
}

export interface CDNDependency {
  name: string;
  url: string;
  integrity?: string;
  global?: string;
}

export type BrowserAPI =
  | 'localStorage'
  | 'sessionStorage'
  | 'indexedDB'
  | 'webGL'
  | 'webAudio'
  | 'webRTC'
  | 'geolocation'
  | 'notifications'
  | 'clipboard'
  | 'fullscreen'
  | 'mediaDevices';

// ============================================================================
// PERMISSION SPECIFICATION
// ============================================================================

export interface PermissionSpec {
  /** Whether this widget can be used in pipelines */
  allowPipelineUse: boolean;

  /** Whether this widget can be forked/modified */
  allowForking: boolean;

  /** Whether this widget can be sold on marketplace */
  allowMarketplace: boolean;

  /** Revenue share configuration for marketplace */
  revenueShare?: RevenueShareSpec;

  /** License type */
  license?: LicenseType;

  /** Required capabilities for this widget */
  requiredCapabilities?: string[];

  /** Usage tracking metadata */
  tracking?: TrackingSpec;
}

export interface RevenueShareSpec {
  creator: number;
  platform: number;
  referrer?: number;
}

export type LicenseType =
  | 'MIT'
  | 'Apache-2.0'
  | 'GPL-3.0'
  | 'BSD-3-Clause'
  | 'proprietary'
  | 'custom';

export interface TrackingSpec {
  trackUsage: boolean;
  trackRevenue: boolean;
  anonymizeData?: boolean;
}

// ============================================================================
// MODDLET SPECIFICATION
// ============================================================================

export interface ModdletSpec {
  id: string;
  name: string;
  description?: string;
  type: ModdletType;
  target: string;
  modification: unknown;
}

export type ModdletType =
  | 'skin'
  | 'behavior'
  | 'action'
  | 'event'
  | 'state';

// ============================================================================
// AI SPECIFICATION
// ============================================================================

export interface AISpec {
  /** Whether AI features are enabled */
  enabled: boolean;

  /** AI-powered suggestions */
  suggestions?: AISuggestionSpec;

  /** AI behavior customization */
  behavior?: AIBehaviorSpec;

  /** AI content generation */
  contentGeneration?: AIContentSpec;
}

export interface AISuggestionSpec {
  enableAutoComplete?: boolean;
  enableSmartConnections?: boolean;
  contextKeywords?: string[];
}

export interface AIBehaviorSpec {
  personality?: string;
  responseStyle?: 'concise' | 'detailed' | 'creative';
  adaptToUser?: boolean;
}

export interface AIContentSpec {
  allowTextGeneration?: boolean;
  allowImageGeneration?: boolean;
  allowCodeGeneration?: boolean;
}

// ============================================================================
// SIZE SPECIFICATION
// ============================================================================

export interface SizeSpec {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  lockAspectRatio?: boolean;
  scaleMode?: 'crop' | 'scale' | 'stretch' | 'contain';
}

// ============================================================================
// WIDGET CATEGORIES
// ============================================================================

export type WidgetCategory =
  | 'productivity'
  | 'creativity'
  | 'social'
  | 'games'
  | 'media'
  | 'data'
  | 'utility'
  | 'education'
  | 'business'
  | 'lifestyle'
  | 'developer'
  | 'ai'
  | 'integration'
  | 'custom';

// ============================================================================
// WORKSPACE TYPES (Multi-Widget Batch Support)
// ============================================================================

/**
 * Workspace manifest for batch widget generation
 */
export interface WorkspaceManifest {
  /** Unique workspace ID */
  id: string;

  /** Workspace name */
  name: string;

  /** Workspace version */
  version: string;

  /** Creation timestamp */
  createdAt: number;

  /** Last update timestamp */
  updatedAt: number;

  /** List of widget specs in this workspace */
  widgets: WorkspaceWidgetEntry[];

  /** Shared dependencies across widgets */
  sharedDependencies?: DependencySpec;

  /** Shared assets */
  sharedAssets?: string[];

  /** Export configuration */
  exportConfig?: WorkspaceExportConfig;
}

export interface WorkspaceWidgetEntry {
  /** Reference to SpecJSON */
  spec: SpecJSON;

  /** Widget folder name in workspace */
  folderName: string;

  /** Build status */
  status: 'pending' | 'building' | 'ready' | 'error';

  /** Error message if status is 'error' */
  error?: string;

  /** Last build timestamp */
  lastBuildAt?: number;
}

export interface WorkspaceExportConfig {
  /** Export format */
  format: 'separate' | 'bundle' | 'zip';

  /** Include source specs */
  includeSpecs: boolean;

  /** Include test files */
  includeTests: boolean;

  /** Minify output */
  minify: boolean;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface SpecValidationResult {
  valid: boolean;
  errors: SpecValidationError[];
  warnings: SpecValidationWarning[];
}

export interface SpecValidationError {
  path: string;
  code: string;
  message: string;
}

export interface SpecValidationWarning {
  path: string;
  code: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// GENERATION TYPES
// ============================================================================

export interface GeneratedWidgetPackage {
  /** Widget ID */
  id: string;

  /** Source SpecJSON */
  spec: SpecJSON;

  /** Generated files */
  files: GeneratedFile[];

  /** Generation timestamp */
  generatedAt: number;

  /** Template version used */
  templateVersion: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'manifest' | 'index' | 'state' | 'actions' | 'styles' | 'test' | 'asset';
}

// ============================================================================
// DEFAULT SPEC FACTORY
// ============================================================================

export function createDefaultSpecJSON(overrides: Partial<SpecJSON> = {}): SpecJSON {
  return {
    id: 'new-widget',
    version: '1.0.0',
    displayName: 'New Widget',
    category: 'utility',
    description: 'A new widget created with Widget Generator 2.0',
    visual: {
      type: 'html',
      skins: []
    },
    state: {},
    events: {
      triggers: {} as Record<EventTrigger, string[]>,
      custom: [],
      broadcasts: [],
      subscriptions: []
    },
    actions: {},
    api: {
      exposes: [],
      accepts: [],
      inputs: [],
      outputs: []
    },
    dependencies: {},
    permissions: {
      allowPipelineUse: true,
      allowForking: true,
      allowMarketplace: false,
      revenueShare: {
        creator: 0.8,
        platform: 0.2
      }
    },
    ...overrides
  };
}

/**
 * Example SpecJSON for a Pomodoro Timer widget
 */
export const EXAMPLE_POMODORO_SPEC: SpecJSON = {
  id: 'pomodoro-timer',
  version: '1.0.0',
  displayName: 'Pomodoro Timer',
  category: 'productivity',
  description: 'A simple timer widget for productivity using the Pomodoro technique.',
  visual: {
    type: 'html',
    defaultAsset: 'timer.png',
    skins: [
      { id: 'default', name: 'Default' },
      { id: 'minimal', name: 'Minimal' },
      { id: 'neon', name: 'Neon Glow' }
    ],
    cssVariables: [
      { name: '--timer-color', defaultValue: '#e74c3c', type: 'color' },
      { name: '--timer-bg', defaultValue: '#1a1a1a', type: 'color' }
    ]
  },
  state: {
    timeLeft: { type: 'number', default: 1500, description: 'Time remaining in seconds' },
    isRunning: { type: 'boolean', default: false, description: 'Whether timer is active' },
    totalTime: { type: 'number', default: 1500, description: 'Total session time' },
    sessionsCompleted: { type: 'number', default: 0, persist: true }
  },
  events: {
    triggers: {
      onClick: ['toggleTimer'],
      onMount: ['initTimer']
    } as Record<EventTrigger, string[]>,
    broadcasts: [
      { event: 'timer:complete', description: 'Emitted when timer reaches zero' },
      { event: 'timer:tick', description: 'Emitted every second', payload: { timeLeft: 'number' } }
    ]
  },
  actions: {
    toggleTimer: {
      type: 'toggleState',
      description: 'Toggle timer running state',
      params: { toggleKey: 'isRunning' }
    },
    initTimer: {
      type: 'setState',
      description: 'Initialize timer on mount',
      params: { stateKey: 'timeLeft', value: 1500 }
    },
    resetTimer: {
      type: 'sequence',
      description: 'Reset timer to initial state',
      params: {
        actions: ['stopTimer', 'setTimeToDefault']
      }
    }
  },
  api: {
    exposes: [
      { id: 'start', name: 'Start Timer', description: 'Start the timer' },
      { id: 'stop', name: 'Stop Timer', description: 'Stop the timer' },
      { id: 'reset', name: 'Reset Timer', description: 'Reset to default time' }
    ],
    accepts: [],
    inputs: [
      { id: 'setTime', name: 'Set Time', type: 'number', description: 'Set timer duration in seconds' }
    ],
    outputs: [
      { id: 'tick', name: 'Tick', type: 'number', description: 'Current time remaining' },
      { id: 'complete', name: 'Complete', type: 'boolean', description: 'Timer completed signal' }
    ]
  },
  dependencies: {},
  permissions: {
    allowPipelineUse: true,
    allowForking: true,
    allowMarketplace: true,
    revenueShare: {
      creator: 0.8,
      platform: 0.2
    }
  },
  size: {
    width: 200,
    height: 200,
    minWidth: 100,
    minHeight: 100
  },
  tags: ['timer', 'productivity', 'pomodoro']
};
