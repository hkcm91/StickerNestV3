/**
 * Docker 2.0 Types
 * Enhanced widget docker with stacking, drag-drop, and glassmorphism theming
 */

import type { WidgetInstance } from '../../types/domain';

// ==================
// Theme Types
// ==================

export type Docker2ThemeMode = 'light' | 'dark';

export interface Docker2ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgGlass: string;
  bgGlassHover: string;
  bgGlassActive: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accents
  accent: string;
  accentHover: string;
  accentMuted: string;

  // Semantic
  success: string;
  warning: string;
  error: string;

  // Borders & Shadows
  borderPrimary: string;
  borderSecondary: string;
  borderAccent: string;
  shadowColor: string;

  // Glassmorphism specific
  glassBlur: string;
  glassBorder: string;
  glassHighlight: string;
}

export interface Docker2Theme {
  mode: Docker2ThemeMode;
  colors: Docker2ThemeColors;
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// ==================
// Layout Types
// ==================

export type LayoutMode = 'vertical' | 'horizontal' | 'grid' | 'tabbed';

export interface GridConfig {
  columns: number;
  gap: number;
  autoFit: boolean;
}

export interface LayoutConfig {
  mode: LayoutMode;
  grid?: GridConfig;
  gap: number;
  padding: number;
}

// ==================
// Widget Stack Types
// ==================

export interface StackedWidget {
  /** Unique widget ID */
  widgetId: string;
  /** Order in the stack (0 = first) */
  order: number;
  /** Height percentage (for vertical) or width percentage (for horizontal) */
  sizePercent: number;
  /** Minimum size in pixels */
  minSize: number;
  /** Whether widget is minimized/collapsed */
  minimized: boolean;
  /** Whether widget is maximized (full docker) */
  maximized: boolean;
  /** Original canvas position (for undocking) */
  originalPosition: { x: number; y: number };
  /** Original canvas size (for undocking) */
  originalSize: { width: number; height: number };
  /** Original z-index */
  originalZIndex: number;
  /** Original rotation */
  originalRotation: number;
  /** Custom title override */
  customTitle?: string;
}

// ==================
// Docker Instance Types
// ==================

export interface Docker2Instance {
  /** Unique docker ID */
  id: string;
  /** Display name */
  name: string;
  /** Stacked widgets in this docker */
  widgets: StackedWidget[];
  /** Current layout configuration */
  layout: LayoutConfig;
  /** Docker position on screen */
  position: { x: number; y: number };
  /** Docker dimensions */
  size: { width: number; height: number };
  /** Minimum size constraints */
  minSize: { width: number; height: number };
  /** Maximum size constraints */
  maxSize: { width: number; height: number };
  /** Whether docker is collapsed */
  collapsed: boolean;
  /** Theme mode for this docker */
  themeMode: Docker2ThemeMode;
  /** Whether edit mode is active */
  editMode: boolean;
  /** Active widget ID (for tabbed mode) */
  activeWidgetId: string | null;
  /** Z-index of the docker */
  zIndex: number;
  /** Whether docker is locked (no resize/move) */
  locked: boolean;
  /** Created timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

// ==================
// Drag & Drop Types
// ==================

export type DragSource = 'canvas' | 'docker' | 'library';
export type DropZone = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'between';

export interface DragState {
  /** Whether a drag is in progress */
  isDragging: boolean;
  /** Source of the drag */
  source: DragSource | null;
  /** Widget being dragged */
  widgetId: string | null;
  /** Current drop zone being hovered */
  activeDropZone: DropZone | null;
  /** Index position for insertion */
  insertIndex: number | null;
  /** Preview position */
  previewPosition: { x: number; y: number } | null;
}

export interface DropResult {
  zone: DropZone;
  index: number;
  widgetId: string;
  dockerId: string;
}

// ==================
// State Types
// ==================

export interface Docker2State {
  /** All docker instances */
  dockers: Docker2Instance[];
  /** Currently active docker ID */
  activeDockerById: string | null;
  /** Global drag state */
  dragState: DragState;
  /** Undo history stack */
  undoStack: Docker2Instance[][];
  /** Redo history stack */
  redoStack: Docker2Instance[][];
  /** Maximum undo history size */
  maxUndoSize: number;
}

// ==================
// Preset Types
// ==================

export interface Docker2Preset {
  id: string;
  name: string;
  description?: string;
  savedAt: number;
  dockers: Docker2Instance[];
  thumbnail?: string;
}

// ==================
// Component Props Types
// ==================

export interface Docker2ContainerProps {
  /** Docker instance to render */
  docker: Docker2Instance;
  /** All widgets available on canvas */
  widgets: WidgetInstance[];
  /** Whether global edit mode is active */
  isEditMode: boolean;
  /** Callback when widget is docked */
  onDock: (widget: WidgetInstance) => void;
  /** Callback when widget is undocked */
  onUndock: (widgetId: string) => void;
  /** Render function for widget content */
  renderWidget: (
    widget: WidgetInstance,
    containerSize: { width: number; height: number }
  ) => React.ReactNode;
  /** Available widgets for adding */
  availableWidgets?: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
  }>;
  /** Callback when a widget definition is selected to add */
  onAddWidget?: (defId: string) => void;
  /** Callback when docker state changes */
  onDockerChange?: (docker: Docker2Instance) => void;
  /** Canvas ID for state isolation */
  canvasId?: string;
  /** Class name for styling */
  className?: string;
  /** Fill parent container instead of using absolute positioning */
  fillContainer?: boolean;
  /** Currently selected widget IDs on canvas */
  selectedWidgetIds?: string[];
  /** Callback to dock selected widget from canvas */
  onDockSelected?: () => void;
}

export interface Docker2HeaderProps {
  docker: Docker2Instance;
  onToggleCollapse: () => void;
  onToggleTheme: () => void;
  onToggleEditMode: () => void;
  onLayoutChange: (mode: LayoutMode) => void;
  onClose?: () => void;
  onRename?: (name: string) => void;
  /** Available widgets for the "Add Widget" dropdown */
  availableWidgets?: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
  }>;
  /** Callback when a widget is selected to add */
  onAddWidget?: (defId: string) => void;
  /** Number of selected widgets on canvas */
  selectedCount?: number;
  /** Callback to dock selected widget from canvas */
  onDockSelected?: () => void;
}

export interface WidgetStackProps {
  widgets: StackedWidget[];
  allWidgets: WidgetInstance[];
  layout: LayoutConfig;
  containerSize: { width: number; height: number };
  editMode: boolean;
  themeMode: Docker2ThemeMode;
  renderWidget: (
    widget: WidgetInstance,
    containerSize: { width: number; height: number }
  ) => React.ReactNode;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onResize: (widgetId: string, newSizePercent: number) => void;
  onMinimize: (widgetId: string) => void;
  onMaximize: (widgetId: string) => void;
  onRemove: (widgetId: string) => void;
  onSettings?: (widgetId: string) => void;
}

export interface DropIndicatorProps {
  zone: DropZone;
  active: boolean;
  themeMode: Docker2ThemeMode;
}

export interface DragPreviewProps {
  widgetId: string;
  widget: WidgetInstance | null;
  position: { x: number; y: number };
  themeMode: Docker2ThemeMode;
}

// ==================
// Hook Types
// ==================

export interface UseDocker2Actions {
  // Docker management
  createDocker: (name?: string) => string;
  deleteDocker: (id: string) => void;
  setActiveDocker: (id: string) => void;
  updateDocker: (id: string, updates: Partial<Docker2Instance>) => void;
  duplicateDocker: (id: string) => string;

  // Widget management
  dockWidget: (dockerId: string, widget: WidgetInstance, insertIndex?: number) => void;
  undockWidget: (dockerId: string, widgetId: string) => StackedWidget | undefined;
  reorderWidgets: (dockerId: string, fromIndex: number, toIndex: number) => void;
  resizeWidget: (dockerId: string, widgetId: string, newSizePercent: number) => void;
  minimizeWidget: (dockerId: string, widgetId: string) => void;
  maximizeWidget: (dockerId: string, widgetId: string) => void;
  removeWidget: (dockerId: string, widgetId: string) => void;

  // Layout management
  setLayout: (dockerId: string, layout: Partial<LayoutConfig>) => void;
  setThemeMode: (dockerId: string, mode: Docker2ThemeMode) => void;
  toggleEditMode: (dockerId: string) => void;

  // Drag & drop
  startDrag: (source: DragSource, widgetId: string) => void;
  updateDrag: (dropZone: DropZone | null, insertIndex: number | null, position?: { x: number; y: number }) => void;
  endDrag: () => void;
  cancelDrag: () => void;

  // History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Presets
  savePreset: (name: string, description?: string) => Docker2Preset;
  loadPreset: (preset: Docker2Preset) => void;
  deletePreset: (id: string) => void;
  getPresets: () => Docker2Preset[];

  // Utilities
  getDocker: (id: string) => Docker2Instance | undefined;
  getActiveDocker: () => Docker2Instance | undefined;
  getDockedWidgetIds: (dockerId: string) => string[];
  isWidgetDocked: (widgetId: string) => boolean;
  exportState: () => string;
  importState: (json: string) => boolean;
}
