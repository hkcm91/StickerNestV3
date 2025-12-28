/**
 * StickerNest v2 - Floating Panel Types
 * Type definitions for the Floating Panel Widget System
 *
 * Floating Panels are detachable IDE-style containers that can:
 * - House multiple widgets with tabbed organization
 * - Be dragged, resized, and docked
 * - Persist their configuration as reusable presets
 * - Integrate with the canvas document protocol for CRDT-safe sync
 */

import type { WidgetPosition } from './domain';

// ============================================
// Core Panel Types
// ============================================

/**
 * Unique identifier for a widget instance within a panel
 */
export type WidgetInstanceId = string;

/**
 * Unique identifier for a panel
 */
export type PanelId = string;

/**
 * Panel layout mode for widget arrangement
 */
export type PanelLayoutMode = 'flex-column' | 'flex-row' | 'grid' | 'masonry';

/**
 * Panel docking position on canvas edges
 */
export type PanelDockPosition = 'left' | 'right' | 'top' | 'bottom' | 'floating';

/**
 * Panel style configuration
 */
export interface PanelStyleConfig {
  /** Background color or gradient */
  background?: string;
  /** Border style */
  border?: string;
  /** Border radius in pixels */
  borderRadius?: number;
  /** Header background color */
  headerBackground?: string;
  /** Header text color */
  headerTextColor?: string;
  /** Tab active color */
  tabActiveColor?: string;
  /** Tab inactive color */
  tabInactiveColor?: string;
  /** Panel shadow */
  boxShadow?: string;
  /** Backdrop filter (blur effect) */
  backdropFilter?: string;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Tab configuration within a panel
 */
export interface PanelTab {
  /** Tab ID (also serves as key in widgetsByTab) */
  id: string;
  /** Tab display label */
  label: string;
  /** Tab icon (icon name from SNIcon) */
  icon?: string;
  /** Whether tab can be closed */
  closeable?: boolean;
  /** Whether tab is pinned (cannot be reordered) */
  pinned?: boolean;
}

/**
 * Widget state when docked in a panel
 */
export interface DockedPanelWidgetState {
  /** Widget instance ID */
  widgetId: WidgetInstanceId;
  /** Panel ID this widget is docked in */
  panelId: PanelId;
  /** Tab ID within the panel */
  tabId: string;
  /** Position within the tab (for ordering) */
  orderIndex: number;
  /** Original position before docking (for undocking) */
  originalPosition: WidgetPosition;
  /** Original size before docking */
  originalSize: { width: number; height: number };
  /** Original z-index */
  originalZIndex: number;
  /** Original rotation */
  originalRotation: number;
  /** Custom height within panel (null = auto) */
  dockedHeight?: number | null;
  /** Whether widget is minimized/collapsed in panel */
  minimized?: boolean;
  /** Timestamp when docked */
  dockedAt: number;
}

/**
 * Floating Panel - Core data model
 * Represents a standalone widget container with tabs and scrolling
 */
export interface FloatingPanel {
  /** Unique panel identifier */
  id: PanelId;
  /** Canvas this panel belongs to */
  canvasId: string;
  /** Panel display title */
  title: string;
  /** Panel position on canvas */
  position: WidgetPosition;
  /** Panel dimensions */
  size: { width: number; height: number };
  /** Minimum size constraints */
  minSize?: { width: number; height: number };
  /** Maximum size constraints */
  maxSize?: { width: number; height: number };
  /** Z-index for stacking order */
  zIndex: number;
  /** Tab definitions */
  tabs: PanelTab[];
  /** Currently active tab ID */
  activeTab: string;
  /** Widget instances organized by tab ID */
  widgetsByTab: Record<string, WidgetInstanceId[]>;
  /** Panel style configuration */
  style?: PanelStyleConfig;
  /** Layout mode for widgets within tabs */
  layoutMode: PanelLayoutMode;
  /** Whether panel is collapsed (only header visible) */
  collapsed: boolean;
  /** Whether panel is maximized (fills canvas) */
  maximized: boolean;
  /** Whether panel is visible */
  visible: boolean;
  /** Whether panel is locked (cannot be moved/resized) */
  locked: boolean;
  /** Panel docking position (or floating) */
  dockPosition: PanelDockPosition;
  /** Panel icon (shown in header) */
  icon?: string;
  /** Panel description */
  description?: string;
  /** Whether panel accepts widget drops */
  acceptsDrops: boolean;
  /** Widget definition IDs this panel accepts (empty = all) */
  acceptedWidgetTypes?: string[];
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

// ============================================
// Panel Preset Types
// ============================================

/**
 * Panel Preset - Saveable panel configuration
 * Used to save and restore panel layouts
 */
export interface PanelPreset {
  /** Unique preset identifier */
  id: string;
  /** Preset display name */
  name: string;
  /** Preset description */
  description?: string;
  /** Panel configuration (without instance-specific IDs) */
  panel: PanelPresetTemplate;
  /** Preset tags for organization */
  tags?: string[];
  /** Whether preset is a favorite */
  isFavorite?: boolean;
  /** Preset icon */
  icon?: string;
  /** Preset category */
  category?: string;
  /** User who created this preset */
  createdBy?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Panel template for presets (without canvas-specific IDs)
 */
export interface PanelPresetTemplate {
  /** Panel title */
  title: string;
  /** Relative position (percentage of canvas, 0-1) */
  relativePosition: { x: number; y: number };
  /** Panel size */
  size: { width: number; height: number };
  /** Tab definitions */
  tabs: PanelTab[];
  /** Default active tab */
  defaultActiveTab: string;
  /** Widget definition IDs to pre-populate by tab */
  widgetDefIdsByTab?: Record<string, string[]>;
  /** Panel style */
  style?: PanelStyleConfig;
  /** Layout mode */
  layoutMode: PanelLayoutMode;
  /** Panel icon */
  icon?: string;
  /** Whether panel accepts drops */
  acceptsDrops: boolean;
  /** Accepted widget types */
  acceptedWidgetTypes?: string[];
}

// ============================================
// Panel Event Types
// ============================================

/**
 * Panel-related event types for EventBus
 */
export type PanelEventType =
  | 'panel:created'
  | 'panel:deleted'
  | 'panel:updated'
  | 'panel:moved'
  | 'panel:resized'
  | 'panel:focused'
  | 'panel:collapsed'
  | 'panel:maximized'
  | 'panel:tab-created'
  | 'panel:tab-deleted'
  | 'panel:tab-renamed'
  | 'panel:tab-switched'
  | 'panel:tab-reordered'
  | 'panel:widget-docked'
  | 'panel:widget-undocked'
  | 'panel:widget-moved'
  | 'panel:preset-saved'
  | 'panel:preset-loaded'
  | 'panel:preset-deleted'
  | 'panel:drop-target-entered'
  | 'panel:drop-target-left';

/**
 * Panel event payload types
 */
export interface PanelEventPayloads {
  'panel:created': { panel: FloatingPanel };
  'panel:deleted': { panelId: PanelId };
  'panel:updated': { panelId: PanelId; updates: Partial<FloatingPanel> };
  'panel:moved': { panelId: PanelId; position: WidgetPosition };
  'panel:resized': { panelId: PanelId; size: { width: number; height: number } };
  'panel:focused': { panelId: PanelId };
  'panel:collapsed': { panelId: PanelId; collapsed: boolean };
  'panel:maximized': { panelId: PanelId; maximized: boolean };
  'panel:tab-created': { panelId: PanelId; tab: PanelTab };
  'panel:tab-deleted': { panelId: PanelId; tabId: string };
  'panel:tab-renamed': { panelId: PanelId; tabId: string; label: string };
  'panel:tab-switched': { panelId: PanelId; tabId: string };
  'panel:tab-reordered': { panelId: PanelId; tabIds: string[] };
  'panel:widget-docked': { panelId: PanelId; widgetId: WidgetInstanceId; tabId: string };
  'panel:widget-undocked': { panelId: PanelId; widgetId: WidgetInstanceId };
  'panel:widget-moved': { panelId: PanelId; widgetId: WidgetInstanceId; fromTab: string; toTab: string };
  'panel:preset-saved': { preset: PanelPreset };
  'panel:preset-loaded': { presetId: string; panelId: PanelId };
  'panel:preset-deleted': { presetId: string };
  'panel:drop-target-entered': { panelId: PanelId; tabId?: string };
  'panel:drop-target-left': { panelId: PanelId };
}

// ============================================
// Panel Action Types
// ============================================

/**
 * Panel action types for the store
 */
export interface PanelActions {
  // Panel CRUD
  createPanel: (options: CreatePanelOptions) => FloatingPanel;
  updatePanel: (panelId: PanelId, updates: Partial<FloatingPanel>) => void;
  deletePanel: (panelId: PanelId) => void;
  getPanel: (panelId: PanelId) => FloatingPanel | undefined;
  getPanels: () => FloatingPanel[];
  getPanelsByCanvas: (canvasId: string) => FloatingPanel[];

  // Panel position/size
  updatePanelPosition: (panelId: PanelId, position: WidgetPosition) => void;
  updatePanelSize: (panelId: PanelId, size: { width: number; height: number }) => void;
  focusPanel: (panelId: PanelId) => void;
  togglePanelCollapsed: (panelId: PanelId) => void;
  togglePanelMaximized: (panelId: PanelId) => void;

  // Tab operations
  addTab: (panelId: PanelId, tab?: Partial<PanelTab>) => PanelTab;
  removeTab: (panelId: PanelId, tabId: string) => void;
  renameTab: (panelId: PanelId, tabId: string, label: string) => void;
  switchTab: (panelId: PanelId, tabId: string) => void;
  reorderTabs: (panelId: PanelId, tabIds: string[]) => void;

  // Widget docking
  addWidgetToPanelTab: (panelId: PanelId, tabId: string, widgetId: WidgetInstanceId, originalState: {
    position: WidgetPosition;
    size: { width: number; height: number };
    zIndex: number;
    rotation: number;
  }) => void;
  removeWidgetFromPanelTab: (panelId: PanelId, tabId: string, widgetId: WidgetInstanceId) => DockedPanelWidgetState | undefined;
  moveWidgetBetweenTabs: (panelId: PanelId, widgetId: WidgetInstanceId, fromTab: string, toTab: string) => void;
  reorderWidgetsInTab: (panelId: PanelId, tabId: string, widgetIds: WidgetInstanceId[]) => void;
  getDockedWidgetState: (widgetId: WidgetInstanceId) => DockedPanelWidgetState | undefined;
  isWidgetDockedInPanel: (widgetId: WidgetInstanceId) => boolean;
  getWidgetsInPanelTab: (panelId: PanelId, tabId: string) => WidgetInstanceId[];

  // Preset operations
  savePanelPreset: (panelId: PanelId, name: string, description?: string) => PanelPreset;
  loadPanelPreset: (presetId: string, canvasId: string, canvasBounds: { width: number; height: number }) => FloatingPanel | undefined;
  deletePanelPreset: (presetId: string) => void;
  duplicatePanelPreset: (presetId: string) => PanelPreset | undefined;
  getPanelPresets: () => PanelPreset[];
  togglePresetFavorite: (presetId: string) => void;

  // Drag & drop state
  setDraggedWidgetForPanel: (widgetId: WidgetInstanceId | null) => void;
  setDropTargetPanel: (panelId: PanelId | null, tabId?: string | null) => void;
  getDragState: () => { draggedWidgetId: WidgetInstanceId | null; dropTargetPanelId: PanelId | null; dropTargetTabId: string | null };

  // Z-index management
  getNextZIndex: () => number;
}

/**
 * Options for creating a new panel
 */
export interface CreatePanelOptions {
  /** Canvas ID */
  canvasId: string;
  /** Panel title */
  title?: string;
  /** Initial position */
  position?: WidgetPosition;
  /** Initial size */
  size?: { width: number; height: number };
  /** Initial tabs (at least one required) */
  tabs?: PanelTab[];
  /** Style configuration */
  style?: PanelStyleConfig;
  /** Layout mode */
  layoutMode?: PanelLayoutMode;
  /** Panel icon */
  icon?: string;
  /** Whether panel accepts drops */
  acceptsDrops?: boolean;
}

// ============================================
// Panel State Types
// ============================================

/**
 * Panel store state
 */
export interface PanelState {
  /** All floating panels indexed by ID */
  panels: Map<PanelId, FloatingPanel>;
  /** Docked widget states indexed by widget ID */
  dockedPanelWidgets: Map<WidgetInstanceId, DockedPanelWidgetState>;
  /** Saved panel presets */
  panelPresets: PanelPreset[];
  /** Maximum number of presets to save */
  maxPresets: number;
  /** Currently dragged widget ID (for docking) */
  draggedWidgetId: WidgetInstanceId | null;
  /** Current drop target panel ID */
  dropTargetPanelId: PanelId | null;
  /** Current drop target tab ID */
  dropTargetTabId: string | null;
  /** Currently focused panel ID (for z-index management) */
  focusedPanelId: PanelId | null;
}

// ============================================
// Constants
// ============================================

/** Default panel width */
export const DEFAULT_PANEL_WIDTH = 320;

/** Default panel height */
export const DEFAULT_PANEL_HEIGHT = 400;

/** Default minimum panel width */
export const DEFAULT_MIN_PANEL_WIDTH = 200;

/** Default minimum panel height */
export const DEFAULT_MIN_PANEL_HEIGHT = 150;

/** Default maximum panel width */
export const DEFAULT_MAX_PANEL_WIDTH = 800;

/** Default maximum panel height */
export const DEFAULT_MAX_PANEL_HEIGHT = 1000;

/** Default panel z-index base */
export const DEFAULT_PANEL_Z_INDEX = 1000;

/** Maximum number of panel presets */
export const MAX_PANEL_PRESETS = 15;

/** Default panel style */
export const DEFAULT_PANEL_STYLE: PanelStyleConfig = {
  background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(37, 37, 56, 0.95) 100%)',
  border: '1px solid rgba(139, 92, 246, 0.3)',
  borderRadius: 12,
  headerBackground: 'rgba(0, 0, 0, 0.4)',
  headerTextColor: '#e2e8f0',
  tabActiveColor: 'rgba(139, 92, 246, 0.3)',
  tabInactiveColor: 'transparent',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  backdropFilter: 'blur(12px)',
};

// ============================================
// Utility Types
// ============================================

/**
 * Helper type for panel update operations
 */
export type PanelUpdate = Partial<Omit<FloatingPanel, 'id' | 'canvasId' | 'createdAt'>>;

/**
 * Helper type for serialized panel state (for persistence)
 */
export interface SerializedPanelState {
  panels: Array<[PanelId, FloatingPanel]>;
  dockedPanelWidgets: Array<[WidgetInstanceId, DockedPanelWidgetState]>;
  panelPresets: PanelPreset[];
}
