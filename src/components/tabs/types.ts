/**
 * StickerNest v2 - Tab Types
 * Type definitions for the multi-tab system supporting widget dockers,
 * URL previews, and canvas tabs.
 */

import type { WidgetInstance } from '../../types/domain';
import type { CanvasData } from '../../services/canvasManager';

// ==================
// Tab Type Enum
// ==================

export type TabType = 'widget-docker' | 'widget-docker-v2' | 'url-preview' | 'canvas';

// ==================
// Tab Type Configurations
// ==================

/** Configuration for widget docker tabs (v1 - legacy) */
export interface WidgetDockerTabConfig {
  type: 'widget-docker';
  /** Optional: specific docker instance ID */
  dockerId?: string;
}

/** Configuration for Docker 2.0 tabs (v2 - enhanced) */
export interface Docker2TabConfig {
  type: 'widget-docker-v2';
  /** Optional: specific docker instance ID */
  dockerId?: string;
  /** Display name for the docker */
  dockerName?: string;
  /** Initial layout mode */
  layoutMode?: 'vertical' | 'horizontal' | 'grid' | 'tabbed';
  /** Initial theme mode */
  themeMode?: 'light' | 'dark';
}

/** Configuration for URL preview tabs */
export interface UrlPreviewTabConfig {
  type: 'url-preview';
  /** URL to display in iframe */
  url: string;
  /** Whether to show navigation controls */
  showControls?: boolean;
  /** Allow fullscreen */
  allowFullscreen?: boolean;
  /** Custom sandbox permissions */
  sandboxPermissions?: string[];
  /** Whether to use proxy mode to bypass X-Frame-Options (default: auto) */
  proxyMode?: 'auto' | 'always' | 'never';
}

/** URL metadata from Open Graph and other meta tags */
export interface UrlMetadata {
  url: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  type: string | null;
  themeColor: string | null;
  canEmbed: boolean;
  embedError: string | null;
}

/** Configuration for canvas tabs */
export interface CanvasTabConfig {
  type: 'canvas';
  /** Canvas slug for loading */
  slug?: string;
  /** Canvas ID (alternative to slug) */
  canvasId?: string;
  /** Owner info for display */
  ownerName?: string;
  /** Whether this is the user's own canvas */
  isOwn?: boolean;
  /** Password for protected canvases */
  password?: string;
  /** Last known canvas name */
  canvasName?: string;
  /** Fit mode for canvas display */
  fitMode?: 'contain' | 'cover' | 'fill';
  /** Canvas width in pixels */
  canvasWidth?: number;
  /** Canvas height in pixels */
  canvasHeight?: number;
}

/** Union type for all tab configurations */
export type TabConfig = WidgetDockerTabConfig | Docker2TabConfig | UrlPreviewTabConfig | CanvasTabConfig;

// ==================
// Extended Tab Interface
// ==================

/** Extended tab with type configuration */
export interface TypedTab {
  id: string;
  title: string;
  /** Tab type configuration */
  config: TabConfig;
  /** Vertical position of the draggable button (0-100 percentage) */
  buttonVerticalPosition: number;
  /** Side of the button ('left' | 'right') */
  buttonSide: 'left' | 'right';
  /** Whether the tab panel is open */
  isOpen: boolean;
  /** Panel width in pixels */
  panelWidth: number;
  /** Created timestamp */
  createdAt: number;
  /** Icon for tab button (optional) */
  icon?: string;
}

// ==================
// Canvas Tab State
// ==================

/** State for a loaded canvas tab */
export interface CanvasTabState {
  /** Loading state */
  isLoading: boolean;
  /** Error message if load failed */
  error: string | null;
  /** Whether password is required */
  requiresPassword: boolean;
  /** Loaded canvas data */
  canvasData: CanvasData | null;
  /** Current zoom level */
  zoom: number;
  /** Pan offset */
  panOffset: { x: number; y: number };
}

// ==================
// Tab Selection Option
// ==================

/** Option for tab type selection in dialog */
export interface TabTypeOption {
  type: TabType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// ==================
// Canvas Browser Types
// ==================

/** Canvas item for browser display */
export interface CanvasBrowserItem {
  id: string;
  slug?: string;
  name: string;
  ownerName?: string;
  thumbnailUrl?: string;
  visibility: 'private' | 'unlisted' | 'public';
  hasPassword: boolean;
  widgetCount: number;
  width: number;
  height: number;
  updatedAt: string;
  isOwn: boolean;
}

/** Canvas browser filter options */
export interface CanvasBrowserFilters {
  source: 'my-canvases' | 'public' | 'shared-with-me' | 'url';
  searchQuery: string;
}

// ==================
// Tab Action Types
// ==================

/** Action to create a new tab */
export interface CreateTabAction {
  title: string;
  config: TabConfig;
  buttonSide?: 'left' | 'right';
  buttonVerticalPosition?: number;
  panelWidth?: number;
}

/** Action to update tab configuration */
export interface UpdateTabConfigAction {
  tabId: string;
  config: Partial<TabConfig>;
}

// ==================
// URL Preview Utilities
// ==================

/** URL validation result */
export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  error?: string;
  isSecure: boolean;
}

/**
 * Default sandbox permissions for URL preview iframes
 * SECURITY NOTE: These permissions are for external URL previews only.
 * Widget iframes should use 'allow-scripts' only (no allow-same-origin).
 * Using allow-scripts + allow-same-origin together can allow sandbox escape.
 */
export const DEFAULT_IFRAME_SANDBOX = [
  'allow-scripts',
  'allow-same-origin', // Required for external sites to function properly
  'allow-forms',       // Allow form submission
  // Note: popups disabled by default for security
] as const;

// ==================
// Tab Type Metadata
// ==================

/** Metadata for each tab type */
export const TAB_TYPE_METADATA: Record<TabType, {
  label: string;
  defaultTitle: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}> = {
  'widget-docker': {
    label: 'Widget Docker (Legacy)',
    defaultTitle: 'Widgets',
    defaultWidth: 400,
    minWidth: 300,
    maxWidth: 600,
  },
  'widget-docker-v2': {
    label: 'Widget Stack 2.0',
    defaultTitle: 'Widget Stack',
    defaultWidth: 420,
    minWidth: 320,
    maxWidth: 700,
  },
  'url-preview': {
    label: 'URL Preview',
    defaultTitle: 'Web Preview',
    defaultWidth: 500,
    minWidth: 320,
    maxWidth: 800,
  },
  'canvas': {
    label: 'Canvas',
    defaultTitle: 'Canvas',
    defaultWidth: 500,
    minWidth: 350,
    maxWidth: 900,
  },
};

// ==================
// Type Guards
// ==================

export function isWidgetDockerConfig(config: TabConfig): config is WidgetDockerTabConfig {
  return config.type === 'widget-docker';
}

export function isDocker2Config(config: TabConfig): config is Docker2TabConfig {
  return config.type === 'widget-docker-v2';
}

export function isUrlPreviewConfig(config: TabConfig): config is UrlPreviewTabConfig {
  return config.type === 'url-preview';
}

export function isCanvasConfig(config: TabConfig): config is CanvasTabConfig {
  return config.type === 'canvas';
}

// ==================
// Helper Functions
// ==================

/** Get icon character for tab type */
export function getTabTypeIcon(type: TabType): string {
  switch (type) {
    case 'widget-docker': return 'W';
    case 'widget-docker-v2': return '⚡';
    case 'url-preview': return 'U';
    case 'canvas': return 'C';
    default: return 'T';
  }
}

/** Get default config for tab type */
export function getDefaultConfig(type: TabType): TabConfig {
  switch (type) {
    case 'widget-docker':
      return { type: 'widget-docker' };
    case 'widget-docker-v2':
      return { type: 'widget-docker-v2', layoutMode: 'vertical', themeMode: 'dark' };
    case 'url-preview':
      return { type: 'url-preview', url: '', showControls: true, allowFullscreen: true };
    case 'canvas':
      return { type: 'canvas', fitMode: 'contain' };
  }
}
