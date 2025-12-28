/**
 * StickerNest v2 - Library Types
 * Types for the enhanced widget library panel system
 */

import type { WidgetManifest } from './manifest';
import type { WidgetInstance } from './domain';

// ============================================
// Widget Categories
// ============================================

/**
 * Standard widget categories for organization
 */
export type WidgetCategory =
  | 'display'        // Text, data display, visualizations
  | 'controls'       // Buttons, sliders, inputs
  | 'media'          // Images, video, audio players
  | 'canvas-tools'   // Background, grid, filters
  | 'vector-tools'   // Vector editing, shapes
  | 'timers'         // Clocks, timers, countdowns
  | 'communication'  // Event bridges, sync widgets
  | 'containers'     // Docks, folders, groups
  | 'ai-tools'       // AI generation, pipelines
  | 'data'           // Data transforms, storage
  | 'layout'         // Layout helpers, spacers
  | 'social'         // Social embeds, feeds
  | 'games'          // Game widgets, interactive
  | 'utility'        // Misc utilities
  | 'custom';        // User-defined

/**
 * Widget source/origin
 */
export type WidgetSource =
  | 'builtin'        // Core StickerNest widgets
  | 'official'       // Official StickerNest plugins
  | 'community'      // Community marketplace
  | 'user'           // User-created
  | 'ai-generated'   // AI-generated widgets
  | 'local';         // Local test widgets from /test-widgets/

// ============================================
// Library Widget Item
// ============================================

/**
 * Enhanced widget metadata for library display
 * Extends beyond the manifest with usage and discovery data
 */
export interface LibraryWidgetItem {
  /** Unique widget definition ID */
  id: string;

  /** Full widget manifest */
  manifest: WidgetManifest;

  /** Source/origin of the widget */
  source: WidgetSource;

  // --- Categorization ---

  /** Primary category */
  category: WidgetCategory;

  /** Optional subcategory for finer organization */
  subcategory?: string;

  /** Searchable tags */
  tags: string[];

  // --- Grouping ---

  /** ID of the widget kit this belongs to */
  kitId?: string;

  /** Name of the kit (denormalized for display) */
  kitName?: string;

  /** IDs of complementary/related widgets */
  relatedWidgetIds?: string[];

  // --- Usage & Analytics ---

  /** Number of times this widget has been placed */
  useCount: number;

  /** Timestamp of last use */
  lastUsedAt?: number;

  /** Timestamp when added to library */
  createdAt: number;

  /** Timestamp of last update */
  updatedAt?: number;

  // --- Quality & Discovery ---

  /** Quality score (0-100) for ranking */
  qualityScore: number;

  /** Community popularity score */
  popularityScore?: number;

  /** Whether this is a featured widget */
  isFeatured: boolean;

  /** Whether this is newly added (last 7 days) */
  isNew: boolean;

  /** Whether this widget is deprecated */
  isDeprecated: boolean;

  // --- Visual ---

  /** Thumbnail image URL */
  thumbnailUrl?: string;

  /** Animated preview URL (gif/video) */
  previewUrl?: string;

  /** Emoji icon for quick identification */
  iconEmoji?: string;

  /** Icon image URL */
  iconUrl?: string;

  /** Accent color for the card */
  accentColor?: string;

  // --- AI Metadata ---

  /** AI-enhanced description */
  aiDescription?: string;

  /** List of capabilities this widget provides */
  capabilities: string[];

  /** Suggested use cases */
  useCases: string[];
}

// ============================================
// Widget Kit (Bundle)
// ============================================

/**
 * A collection of related widgets that work well together
 * Note: Named "Kit" to avoid conflict with existing WidgetBundle type
 */
export interface WidgetKit {
  /** Unique kit ID */
  id: string;

  /** Display name */
  name: string;

  /** Description of the kit */
  description: string;

  /** Widget IDs included in this kit */
  widgetIds: string[];

  /** Primary category */
  category: WidgetCategory;

  /** Thumbnail showing stacked previews */
  thumbnailUrl?: string;

  /** Kit author */
  author?: string;

  /** Whether this is an official kit */
  isOfficial: boolean;

  /** Suggested use cases for the kit */
  useCases: string[];

  /** When the kit was created */
  createdAt: number;

  /** When the kit was last updated */
  updatedAt?: number;
}

// ============================================
// Quick Access
// ============================================

/**
 * Item in the quick access section (favorites or recents)
 */
export interface QuickAccessItem {
  /** Widget/sticker/kit ID */
  id: string;

  /** Type of item */
  type: 'widget' | 'sticker' | 'kit';

  /** Whether this is pinned (favorite) */
  isPinned: boolean;

  /** Last access timestamp */
  lastAccessedAt: number;

  /** Total access count */
  accessCount: number;
}

// ============================================
// Sticker Types (Enhanced)
// ============================================

/**
 * Enhanced sticker item for the library
 */
export interface LibraryStickerItem {
  /** Unique sticker ID */
  id: string;

  /** Display name */
  name: string;

  /** Sticker file type */
  type: 'png' | 'gif' | 'svg' | 'lottie' | 'webp';

  /** Full-size URL */
  url: string;

  /** Thumbnail URL (smaller) */
  thumbnailUrl?: string;

  /** Category for organization */
  category?: string;

  /** Pack this sticker belongs to */
  packId?: string;

  /** Pack name (denormalized) */
  packName?: string;

  /** Searchable tags */
  tags: string[];

  /** Whether this sticker is animated */
  isAnimated: boolean;

  /** Whether this is a user favorite */
  isFavorite: boolean;

  /** Upload timestamp */
  createdAt: number;

  /** Source: user upload, pack, or AI generated */
  source: 'user' | 'pack' | 'ai-generated';
}

/**
 * Sticker pack definition
 */
export interface StickerPack {
  /** Unique pack ID */
  id: string;

  /** Pack name */
  name: string;

  /** Pack description */
  description?: string;

  /** Sticker IDs in this pack */
  stickerIds: string[];

  /** Pack thumbnail */
  thumbnailUrl?: string;

  /** Pack author */
  author?: string;

  /** Whether this is a premium pack */
  isPremium: boolean;

  /** When the pack was added */
  createdAt: number;
}

// ============================================
// Library Tabs
// ============================================

/**
 * Configuration for a library tab
 */
export interface LibraryTab {
  /** Unique tab ID */
  id: string;

  /** Display label */
  label: string;

  /** Icon name (from icon system) */
  icon: string;

  /** Tab order (lower = earlier) */
  order: number;

  /** Whether this tab can be closed */
  closeable: boolean;

  /** Whether this tab is visible */
  visible: boolean;

  /** Badge count to display (e.g., new items) */
  badgeCount?: number;

  /** Tab content type for rendering */
  contentType: 'widgets' | 'stickers' | 'upload' | 'templates' | 'marketplace' | 'custom';
}

/**
 * Default tabs configuration
 */
export const DEFAULT_LIBRARY_TABS: LibraryTab[] = [
  {
    id: 'widgets',
    label: 'Widgets',
    icon: 'puzzle',
    order: 0,
    closeable: false,
    visible: true,
    contentType: 'widgets',
  },
  {
    id: 'stickers',
    label: 'Stickers',
    icon: 'image',
    order: 1,
    closeable: false,
    visible: true,
    contentType: 'stickers',
  },
  {
    id: 'upload',
    label: 'Upload',
    icon: 'upload',
    order: 2,
    closeable: false,
    visible: true,
    contentType: 'upload',
  },
];

// ============================================
// Filters & Sorting
// ============================================

/**
 * Filter configuration for the library
 */
export interface LibraryFilter {
  /** Filter type */
  type: 'category' | 'source' | 'capability' | 'tag' | 'kit';

  /** Filter value(s) */
  values: string[];

  /** Whether this filter is active */
  active: boolean;
}

/**
 * Saved filter preset
 */
export interface FilterPreset {
  /** Preset ID */
  id: string;

  /** Preset name */
  name: string;

  /** Filters in this preset */
  filters: LibraryFilter[];

  /** When created */
  createdAt: number;
}

/**
 * Sort options for the library
 */
export type LibrarySortMode =
  | 'newest'
  | 'oldest'
  | 'alpha-asc'
  | 'alpha-desc'
  | 'most-used'
  | 'recently-used'
  | 'popularity'
  | 'quality';

// ============================================
// View Modes
// ============================================

/**
 * Library panel view modes
 */
export type LibraryViewMode = 'grid' | 'list' | 'compact';

/**
 * Grid size options
 */
export type LibraryGridSize = 'sm' | 'md' | 'lg';

// ============================================
// AI Brain Context
// ============================================

/**
 * User preferences learned over time
 */
export interface UserPreferences {
  /** Categories the user frequently uses */
  preferredCategories: WidgetCategory[];

  /** Categories the user rarely uses */
  avoidedCategories: WidgetCategory[];

  /** User's skill level (affects suggestions) */
  skillLevel: 'beginner' | 'intermediate' | 'advanced';

  /** Preferred view mode */
  preferredViewMode: LibraryViewMode;

  /** Whether user prefers AI suggestions */
  showAISuggestions: boolean;
}

/**
 * Current canvas context for AI suggestions
 */
export interface CanvasAIContext {
  /** Current canvas ID */
  canvasId: string;

  /** Widget IDs currently on canvas */
  currentWidgetIds: string[];

  /** Widget types on canvas */
  currentWidgetTypes: string[];

  /** Capabilities present on canvas */
  presentCapabilities: string[];

  /** Capabilities that could enhance the canvas */
  missingCapabilities: string[];

  /** AI-suggested next widgets */
  suggestedWidgetIds: string[];
}

/**
 * Full AI brain context for the library
 */
export interface LibraryAIContext {
  /** User profile data */
  user: {
    id: string;
    totalSessions: number;
    totalWidgetsPlaced: number;
    memberSince: number;
  };

  /** Usage patterns */
  patterns: {
    /** Widget usage frequency by category */
    categoryUsage: Record<WidgetCategory, number>;

    /** Hour-of-day usage patterns (0-23) */
    hourlyUsage: Record<number, string[]>;

    /** Common widget combinations */
    widgetCombinations: Array<[string, string]>;

    /** Average session duration in ms */
    avgSessionDuration: number;
  };

  /** Current session data */
  session: CanvasAIContext;

  /** Learned user preferences */
  preferences: UserPreferences;

  /** Generated suggestions */
  suggestions: {
    /** Top suggested widgets */
    widgets: string[];

    /** Suggested kits */
    kits: string[];

    /** Explanation for top suggestion */
    topSuggestionReason?: string;
  };
}

// ============================================
// Panel State Types
// ============================================

/**
 * Panel position options
 */
export type PanelPosition = 'left' | 'right';

/**
 * Panel dock state
 */
export type PanelDockState = 'floating' | 'docked-left' | 'docked-right';

/**
 * Library panel configuration
 */
export interface LibraryPanelConfig {
  /** Default width */
  defaultWidth: number;

  /** Minimum width */
  minWidth: number;

  /** Maximum width */
  maxWidth: number;

  /** Default position */
  defaultPosition: PanelPosition;

  /** Animation duration in ms */
  animationDuration: number;

  /** Whether to show quick access by default */
  showQuickAccessByDefault: boolean;

  /** Number of recent items to track */
  recentItemsLimit: number;

  /** Number of pinned items allowed */
  pinnedItemsLimit: number;
}

/**
 * Default panel configuration
 */
export const DEFAULT_PANEL_CONFIG: LibraryPanelConfig = {
  defaultWidth: 340,
  minWidth: 280,
  maxWidth: 480,
  defaultPosition: 'left',
  animationDuration: 300,
  showQuickAccessByDefault: true,
  recentItemsLimit: 20,
  pinnedItemsLimit: 20,
};

// ============================================
// Utility Types
// ============================================

/**
 * Search result with match info
 */
export interface LibrarySearchResult<T> {
  /** The matched item */
  item: T;

  /** Search relevance score (0-1) */
  score: number;

  /** Which fields matched */
  matchedFields: string[];
}

/**
 * Grouped items for display
 */
export interface GroupedLibraryItems<T> {
  /** Group key (category, kit, etc.) */
  groupKey: string;

  /** Group display label */
  groupLabel: string;

  /** Items in this group */
  items: T[];

  /** Whether this group is collapsed */
  isCollapsed: boolean;
}

/**
 * Library loading state
 */
export interface LibraryLoadingState {
  /** Initial load in progress */
  isLoading: boolean;

  /** Loading more items (pagination) */
  isLoadingMore: boolean;

  /** Whether there are more items to load */
  hasMore: boolean;

  /** Error message if any */
  error?: string;
}
