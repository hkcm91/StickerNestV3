/**
 * StickerNest v2 - Editor Context
 *
 * Central state management for the canvas editor.
 * Manages selection, tools, modes, and editor settings.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { WidgetInstance } from '../types/domain';
import type { WidgetManifest } from '../types/manifest';
import type { CanvasMode } from '../types/runtime';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Editor tool types
 */
export type EditorTool =
  | 'select'
  | 'pan'
  | 'text'
  | 'shape'
  | 'image'
  | 'widget'
  | 'connection'
  | 'draw';

/**
 * Shape types for the shape tool
 */
export type ShapeType = 'rectangle' | 'ellipse' | 'triangle' | 'line' | 'arrow';

/**
 * Alignment options
 */
export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/**
 * Distribution options
 */
export type DistributionType = 'horizontal' | 'vertical';

/**
 * Grid settings
 */
export interface GridSettings {
  enabled: boolean;
  snapToGrid: boolean;
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
}

/**
 * Viewport state
 */
export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Selection state
 */
export interface SelectionState {
  selectedIds: Set<string>;
  selectionBox: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
  hoveredId: string | null;
}

/**
 * Clipboard state
 */
export interface ClipboardState {
  items: WidgetInstance[];
  cutIds: Set<string>;
}

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  timestamp: number;
  action: string;
  before: any;
  after: any;
}

/**
 * Complete editor state
 */
export interface EditorState {
  // Mode
  mode: CanvasMode;
  previousMode: CanvasMode;

  // Tools
  activeTool: EditorTool;
  activeShape: ShapeType;

  // Selection
  selection: SelectionState;

  // Grid
  grid: GridSettings;

  // Viewport
  viewport: ViewportState;

  // Clipboard
  clipboard: ClipboardState;

  // History
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // UI State
  propertiesPanelOpen: boolean;
  layersPanelOpen: boolean;
  widgetLibraryOpen: boolean;

  // Editing state
  isEditing: boolean;
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  isConnecting: boolean;

  // Currently edited widget properties
  editingWidgetId: string | null;
  editingWidgetManifest: WidgetManifest | null;
}

/**
 * Editor actions
 */
export interface EditorActions {
  // Mode
  setMode: (mode: CanvasMode) => void;
  toggleMode: () => void;

  // Tools
  setTool: (tool: EditorTool) => void;
  setShape: (shape: ShapeType) => void;

  // Selection
  select: (id: string, additive?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  deselect: (id: string) => void;
  deselectAll: () => void;
  setHovered: (id: string | null) => void;
  setSelectionBox: (box: SelectionState['selectionBox']) => void;

  // Grid
  setGridEnabled: (enabled: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setGridSize: (size: number) => void;
  toggleGrid: () => void;

  // Viewport
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToScreen: () => void;
  setPan: (x: number, y: number) => void;
  resetPan: () => void;

  // Clipboard
  copy: (widgets: WidgetInstance[]) => void;
  cut: (widgets: WidgetInstance[]) => void;
  paste: () => WidgetInstance[];
  clearClipboard: () => void;

  // History
  pushHistory: (action: string, before: any, after: any) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  clearHistory: () => void;

  // Panels
  togglePropertiesPanel: () => void;
  toggleLayersPanel: () => void;
  toggleWidgetLibrary: () => void;

  // Editing state
  setDragging: (dragging: boolean) => void;
  setResizing: (resizing: boolean) => void;
  setRotating: (rotating: boolean) => void;
  setConnecting: (connecting: boolean) => void;

  // Widget editing
  editWidget: (id: string, manifest: WidgetManifest | null) => void;
  stopEditingWidget: () => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const defaultGrid: GridSettings = {
  enabled: true,
  snapToGrid: false,
  showGrid: true,
  gridSize: 10,
  gridColor: 'rgba(255, 255, 255, 0.1)',
};

const defaultViewport: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

const defaultSelection: SelectionState = {
  selectedIds: new Set(),
  selectionBox: null,
  hoveredId: null,
};

const defaultClipboard: ClipboardState = {
  items: [],
  cutIds: new Set(),
};

const defaultState: EditorState = {
  mode: 'edit',
  previousMode: 'view',
  activeTool: 'select',
  activeShape: 'rectangle',
  selection: defaultSelection,
  grid: defaultGrid,
  viewport: defaultViewport,
  clipboard: defaultClipboard,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  propertiesPanelOpen: false,
  layersPanelOpen: false,
  widgetLibraryOpen: false,
  isEditing: false,
  isDragging: false,
  isResizing: false,
  isRotating: false,
  isConnecting: false,
  editingWidgetId: null,
  editingWidgetManifest: null,
};

// ============================================================================
// ZOOM LEVELS
// ============================================================================

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

// ============================================================================
// STORE
// ============================================================================

export const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    ...defaultState,

    // Mode
    setMode: (mode) => set((state) => ({
      mode,
      previousMode: state.mode,
      isEditing: mode === 'edit',
      isConnecting: mode === 'connect',
    })),

    toggleMode: () => set((state) => ({
      mode: state.mode === 'edit' ? 'view' : 'edit',
      previousMode: state.mode,
      isEditing: state.mode !== 'edit',
    })),

    // Tools
    setTool: (tool) => set({ activeTool: tool }),
    setShape: (shape) => set({ activeShape: shape }),

    // Selection
    select: (id, additive = false) => set((state) => {
      const newSelection = new Set(additive ? state.selection.selectedIds : []);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return {
        selection: { ...state.selection, selectedIds: newSelection },
        editingWidgetId: newSelection.size === 1 ? id : null,
        propertiesPanelOpen: newSelection.size === 1 ? true : state.propertiesPanelOpen,
      };
    }),

    selectMultiple: (ids) => set((state) => ({
      selection: { ...state.selection, selectedIds: new Set(ids) },
      editingWidgetId: ids.length === 1 ? ids[0] : null,
    })),

    deselect: (id) => set((state) => {
      const newSelection = new Set(state.selection.selectedIds);
      newSelection.delete(id);
      return {
        selection: { ...state.selection, selectedIds: newSelection },
        editingWidgetId: newSelection.size === 1 ? Array.from(newSelection)[0] : null,
      };
    }),

    deselectAll: () => set((state) => ({
      selection: { ...state.selection, selectedIds: new Set(), selectionBox: null },
      editingWidgetId: null,
    })),

    setHovered: (id) => set((state) => ({
      selection: { ...state.selection, hoveredId: id },
    })),

    setSelectionBox: (box) => set((state) => ({
      selection: { ...state.selection, selectionBox: box },
    })),

    // Grid
    setGridEnabled: (enabled) => set((state) => ({
      grid: { ...state.grid, enabled },
    })),

    setSnapToGrid: (snap) => set((state) => ({
      grid: { ...state.grid, snapToGrid: snap },
    })),

    setShowGrid: (show) => set((state) => ({
      grid: { ...state.grid, showGrid: show },
    })),

    setGridSize: (size) => set((state) => ({
      grid: { ...state.grid, gridSize: Math.max(5, Math.min(100, size)) },
    })),

    toggleGrid: () => set((state) => ({
      grid: { ...state.grid, snapToGrid: !state.grid.snapToGrid },
    })),

    // Viewport
    setZoom: (zoom) => set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)),
      },
    })),

    zoomIn: () => set((state) => {
      const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= state.viewport.zoom);
      const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
      return {
        viewport: { ...state.viewport, zoom: ZOOM_LEVELS[nextIndex] || state.viewport.zoom * 1.25 },
      };
    }),

    zoomOut: () => set((state) => {
      const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= state.viewport.zoom);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return {
        viewport: { ...state.viewport, zoom: ZOOM_LEVELS[prevIndex] || state.viewport.zoom / 1.25 },
      };
    }),

    resetZoom: () => set((state) => ({
      viewport: { ...state.viewport, zoom: 1 },
    })),

    fitToScreen: () => set((state) => ({
      viewport: { ...state.viewport, zoom: 1, panX: 0, panY: 0 },
    })),

    setPan: (x, y) => set((state) => ({
      viewport: { ...state.viewport, panX: x, panY: y },
    })),

    resetPan: () => set((state) => ({
      viewport: { ...state.viewport, panX: 0, panY: 0 },
    })),

    // Clipboard
    copy: (widgets) => set({
      clipboard: {
        items: widgets.map((w) => ({ ...w })),
        cutIds: new Set(),
      },
    }),

    cut: (widgets) => set({
      clipboard: {
        items: widgets.map((w) => ({ ...w })),
        cutIds: new Set(widgets.map((w) => w.id)),
      },
    }),

    paste: () => {
      const { clipboard } = get();
      if (clipboard.items.length === 0) return [];

      // Generate new IDs and offset position
      const pastedWidgets = clipboard.items.map((w) => ({
        ...w,
        id: `${w.id}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        position: {
          x: w.position.x + 20,
          y: w.position.y + 20,
        },
      }));

      // Update clipboard with new offset for next paste
      set({
        clipboard: {
          items: clipboard.items.map((w) => ({
            ...w,
            position: { x: w.position.x + 20, y: w.position.y + 20 },
          })),
          cutIds: new Set(),
        },
      });

      return pastedWidgets;
    },

    clearClipboard: () => set({
      clipboard: { items: [], cutIds: new Set() },
    }),

    // History
    pushHistory: (action, before, after) => set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        timestamp: Date.now(),
        action,
        before,
        after,
      });

      // Trim to max size
      while (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < 0) return null;

      const entry = history[historyIndex];
      set({ historyIndex: historyIndex - 1 });
      return entry;
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length - 1) return null;

      const entry = history[historyIndex + 1];
      set({ historyIndex: historyIndex + 1 });
      return entry;
    },

    clearHistory: () => set({
      history: [],
      historyIndex: -1,
    }),

    // Panels
    togglePropertiesPanel: () => set((state) => ({
      propertiesPanelOpen: !state.propertiesPanelOpen,
    })),

    toggleLayersPanel: () => set((state) => ({
      layersPanelOpen: !state.layersPanelOpen,
    })),

    toggleWidgetLibrary: () => set((state) => ({
      widgetLibraryOpen: !state.widgetLibraryOpen,
    })),

    // Editing state
    setDragging: (dragging) => set({ isDragging: dragging }),
    setResizing: (resizing) => set({ isResizing: resizing }),
    setRotating: (rotating) => set({ isRotating: rotating }),
    setConnecting: (connecting) => set({ isConnecting: connecting }),

    // Widget editing
    editWidget: (id, manifest) => set({
      editingWidgetId: id,
      editingWidgetManifest: manifest,
      propertiesPanelOpen: true,
    }),

    stopEditingWidget: () => set({
      editingWidgetId: null,
      editingWidgetManifest: null,
    }),

    // Reset
    reset: () => set(defaultState),
  }))
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectMode = (state: EditorState) => state.mode;
export const selectActiveTool = (state: EditorState) => state.activeTool;
export const selectSelectedIds = (state: EditorState) => state.selection.selectedIds;
export const selectGrid = (state: EditorState) => state.grid;
export const selectViewport = (state: EditorState) => state.viewport;
export const selectIsEditing = (state: EditorState) => state.mode === 'edit';
export const selectHasSelection = (state: EditorState) => state.selection.selectedIds.size > 0;
