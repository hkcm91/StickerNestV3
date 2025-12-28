/**
 * StickerNest v2 - Canvas Store (Zustand)
 * Global state management for canvas, selection, entities, and mode
 * Provides persistence middleware and reactive state updates
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import type { WidgetInstance, Pipeline, WidgetGroup } from '../types/domain';
import type { CanvasMode } from '../types/runtime';
import type { Entity, EntityType } from '../types/entities';
import type { Command, CommandStackState } from '../canvas/history';
import { initialCommandStackState, commandStackOperations } from '../canvas/history';

// ==================
// Types
// ==================

/** Selection state */
export interface SelectionState {
  /** Set of selected widget IDs */
  selectedIds: Set<string>;
  /** Primary selection (for single-select operations) */
  primaryId: string | null;
  /** Selection mode */
  mode: 'single' | 'multi';
  /** Whether selection is active (user is selecting) */
  isSelecting: boolean;
  /** Selection box coordinates (for drag selection) */
  selectionBox: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
}

/** Canvas viewport state */
export interface ViewportState {
  /** Pan offset X */
  panX: number;
  /** Pan offset Y */
  panY: number;
  /** Zoom level (1 = 100%) */
  zoom: number;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
}

/** Grid/snap settings */
export interface GridSettings {
  /** Enable grid snap */
  snapToGrid: boolean;
  /** Grid size in pixels */
  gridSize: number;
  /** Show grid lines */
  showGrid: boolean;
  /** Snap to center lines */
  snapToCenter: boolean;
  /** Show center guides when dragging */
  showCenterGuides: boolean;
}

/** Canvas store state */
export interface CanvasState {
  // Core identifiers
  canvasId: string;
  userId: string;

  // Mode
  mode: CanvasMode;

  // Widgets
  widgets: Map<string, WidgetInstance>;

  // Groups
  groups: Map<string, WidgetGroup>;

  // Entities
  entities: Map<string, Entity>;

  // Pipelines
  pipelines: Map<string, Pipeline>;

  // Selection
  selection: SelectionState;

  // Viewport
  viewport: ViewportState;

  // Grid settings
  grid: GridSettings;

  // UI state
  isPropertiesPanelOpen: boolean;
  isAISidebarOpen: boolean;
  isFullscreen: boolean;

  // Undo/redo history (DEPRECATED: snapshot-based, kept for backwards compatibility)
  historyIndex: number;
  history: CanvasSnapshot[];
  maxHistorySize: number;

  // Command-based history (new, more efficient)
  commandStack: CommandStackState;
}

/** Snapshot for undo/redo */
export interface CanvasSnapshot {
  widgets: Map<string, WidgetInstance>;
  entities: Map<string, Entity>;
  pipelines: Map<string, Pipeline>;
  timestamp: number;
}

/** Canvas store actions */
export interface CanvasActions {
  // Initialization
  initialize: (canvasId: string, userId: string) => void;
  reset: () => void;

  // Mode
  setMode: (mode: CanvasMode) => void;
  toggleMode: () => void;

  // Widget CRUD
  addWidget: (widget: WidgetInstance) => void;
  updateWidget: (id: string, updates: Partial<WidgetInstance>) => void;
  removeWidget: (id: string) => void;
  getWidget: (id: string) => WidgetInstance | undefined;
  getWidgets: () => WidgetInstance[];

  // Entity CRUD
  addEntity: (entity: Entity) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  removeEntity: (id: string) => void;
  getEntity: (id: string) => Entity | undefined;
  getEntities: () => Entity[];
  getEntitiesByType: (type: EntityType) => Entity[];
  getEntitiesByWidget: (widgetId: string) => Entity[];

  // Pipeline CRUD
  addPipeline: (pipeline: Pipeline) => void;
  updatePipeline: (id: string, updates: Partial<Pipeline>) => void;
  removePipeline: (id: string) => void;
  getPipeline: (id: string) => Pipeline | undefined;
  getPipelines: () => Pipeline[];

  // Selection
  select: (id: string, addToSelection?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  deselect: (id: string) => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  setSelectionBox: (box: SelectionState['selectionBox']) => void;
  getSelectedWidgets: () => WidgetInstance[];
  isSelected: (id: string) => boolean;

  // Viewport
  setViewport: (viewport: Partial<ViewportState>) => void;
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (factor: number, centerX?: number, centerY?: number) => void;
  resetViewport: () => void;

  // Grid
  setGridSettings: (settings: Partial<GridSettings>) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;

  // UI
  setPropertiesPanelOpen: (open: boolean) => void;
  setAISidebarOpen: (open: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  toggleFullscreen: () => void;

  // History (undo/redo) - DEPRECATED: snapshot-based
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Command-based history (new, preferred)
  executeCommand: (command: Command) => void;
  /** Record a command without executing it (for operations already applied during drag/resize) */
  recordCommand: (command: Command) => void;
  undoCommand: () => void;
  redoCommand: () => void;
  canUndoCommand: () => boolean;
  canRedoCommand: () => boolean;
  getUndoName: () => string | null;
  getRedoName: () => string | null;

  // Bulk operations
  moveSelectedWidgets: (deltaX: number, deltaY: number) => void;
  deleteSelectedWidgets: () => void;
  duplicateSelectedWidgets: () => void;
  alignSelectedWidgets: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelectedWidgets: (direction: 'horizontal' | 'vertical') => void;

  // Z-index operations
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // Group operations
  createGroup: (widgetIds: string[], name?: string) => string;
  ungroup: (groupId: string) => void;
  groupSelectedWidgets: () => string | null;
  ungroupSelectedWidgets: () => void;
  addToGroup: (groupId: string, widgetIds: string[]) => void;
  removeFromGroup: (widgetIds: string[]) => void;
  getGroup: (groupId: string) => WidgetGroup | undefined;
  getGroups: () => WidgetGroup[];
  getWidgetsInGroup: (groupId: string) => WidgetInstance[];
  updateGroup: (groupId: string, updates: Partial<WidgetGroup>) => void;
  deleteGroup: (groupId: string) => void;

  // Lock/visibility operations
  toggleLock: (id: string) => void;
  toggleVisibility: (id: string) => void;
  setLocked: (id: string, locked: boolean) => void;
  setVisible: (id: string, visible: boolean) => void;
  lockSelectedWidgets: () => void;
  unlockSelectedWidgets: () => void;
  hideSelectedWidgets: () => void;
  showSelectedWidgets: () => void;

  // Layer helpers
  getLayerOrder: () => Array<{ id: string; type: 'widget' | 'group'; zIndex: number; name: string }>;
  setZIndex: (id: string, zIndex: number) => void;
  reorderLayers: (orderedIds: string[]) => void;

  // Grid alias for setGridSettings
  setGrid: (settings: Partial<GridSettings>) => void;
}

// ==================
// Initial State
// ==================

const initialSelectionState: SelectionState = {
  selectedIds: new Set(),
  primaryId: null,
  mode: 'single',
  isSelecting: false,
  selectionBox: null,
};

const initialViewportState: ViewportState = {
  panX: 0,
  panY: 0,
  zoom: 1,
  width: 0,
  height: 0,
};

const initialGridSettings: GridSettings = {
  snapToGrid: false,
  gridSize: 10,
  showGrid: false,
  snapToCenter: true,
  showCenterGuides: true,
};

const initialState: CanvasState = {
  canvasId: '',
  userId: '',
  mode: 'view',
  widgets: new Map(),
  groups: new Map(),
  entities: new Map(),
  pipelines: new Map(),
  selection: initialSelectionState,
  viewport: initialViewportState,
  grid: initialGridSettings,
  isPropertiesPanelOpen: false,
  isAISidebarOpen: false,
  isFullscreen: false,
  historyIndex: -1,
  history: [],
  maxHistorySize: 50,
  commandStack: initialCommandStackState,
};

// ==================
// Store Creation
// ==================

/** Custom JSON reviver for Maps and Sets */
const jsonReviver = (_key: string, value: unknown) => {
  // Revive Maps from arrays
  if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Map') {
    return new Map((value as { entries: [string, unknown][] }).entries);
  }
  // Revive Sets from arrays
  if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Set') {
    return new Set((value as { values: unknown[] }).values);
  }
  return value;
};

/** Custom JSON replacer for Maps and Sets */
const jsonReplacer = (_key: string, value: unknown) => {
  // Convert Maps to serializable format
  if (value instanceof Map) {
    return { __type: 'Map', entries: Array.from(value.entries()) };
  }
  // Convert Sets to serializable format
  if (value instanceof Set) {
    return { __type: 'Set', values: Array.from(value) };
  }
  return value;
};

/** Custom storage that handles Map serialization */
const mapStorage = createJSONStorage(() => localStorage, {
  reviver: jsonReviver,
  replacer: jsonReplacer,
});

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  devtools(
    persist(
      (set, get) => ({
      ...initialState,

      // ==================
      // Initialization
      // ==================

      initialize: (canvasId: string, userId: string) => {
        set({ canvasId, userId });
      },

      reset: () => {
        set({
          ...initialState,
          canvasId: get().canvasId,
          userId: get().userId,
        });
      },

      // ==================
      // Mode
      // ==================

      setMode: (mode: CanvasMode) => {
        set({ mode });
        if (mode === 'view') {
          // Clear selection when switching to view mode
          set({ selection: { ...initialSelectionState } });
        }
      },

      toggleMode: () => {
        const currentMode = get().mode;
        get().setMode(currentMode === 'edit' ? 'view' : 'edit');
      },

      // ==================
      // Widget CRUD
      // ==================

      addWidget: (widget: WidgetInstance) => {
        const widgets = new Map(get().widgets);
        // Capture initial dimensions as contentSize if not already set
        // This ensures scaling calculations work correctly even when manifest doesn't specify size
        const widgetWithContentSize: WidgetInstance = widget.contentSize
          ? widget
          : {
              ...widget,
              contentSize: { width: widget.width, height: widget.height }
            };
        widgets.set(widget.id, widgetWithContentSize);
        set({ widgets });
        get().saveSnapshot();
      },

      updateWidget: (id: string, updates: Partial<WidgetInstance>) => {
        const widgets = new Map(get().widgets);
        const existing = widgets.get(id);
        if (existing) {
          widgets.set(id, { ...existing, ...updates });
          set({ widgets });
        }
      },

      removeWidget: (id: string) => {
        const widgets = new Map(get().widgets);
        widgets.delete(id);
        
        // Also deselect
        const selection = { ...get().selection };
        selection.selectedIds = new Set(selection.selectedIds);
        selection.selectedIds.delete(id);
        if (selection.primaryId === id) {
          selection.primaryId = selection.selectedIds.size > 0 
            ? Array.from(selection.selectedIds)[0] 
            : null;
        }
        
        set({ widgets, selection });
        get().saveSnapshot();
      },

      getWidget: (id: string) => get().widgets.get(id),

      getWidgets: () => Array.from(get().widgets.values()),

      // ==================
      // Entity CRUD
      // ==================

      addEntity: (entity: Entity) => {
        const entities = new Map(get().entities);
        entities.set(entity.id, entity);
        set({ entities });
      },

      updateEntity: (id: string, updates: Partial<Entity>) => {
        const entities = new Map(get().entities);
        const existing = entities.get(id);
        if (existing) {
          entities.set(id, { ...existing, ...updates, updatedAt: Date.now() } as Entity);
          set({ entities });
        }
      },

      removeEntity: (id: string) => {
        const entities = new Map(get().entities);
        entities.delete(id);
        set({ entities });
      },

      getEntity: (id: string) => get().entities.get(id),

      getEntities: () => Array.from(get().entities.values()),

      getEntitiesByType: (type: EntityType) => 
        get().getEntities().filter(e => e.type === type),

      getEntitiesByWidget: (widgetId: string) =>
        get().getEntities().filter(e => e.widgetInstanceId === widgetId),

      // ==================
      // Pipeline CRUD
      // ==================

      addPipeline: (pipeline: Pipeline) => {
        const pipelines = new Map(get().pipelines);
        pipelines.set(pipeline.id, pipeline);
        set({ pipelines });
      },

      updatePipeline: (id: string, updates: Partial<Pipeline>) => {
        const pipelines = new Map(get().pipelines);
        const existing = pipelines.get(id);
        if (existing) {
          pipelines.set(id, { ...existing, ...updates });
          set({ pipelines });
        }
      },

      removePipeline: (id: string) => {
        const pipelines = new Map(get().pipelines);
        pipelines.delete(id);
        set({ pipelines });
      },

      getPipeline: (id: string) => get().pipelines.get(id),

      getPipelines: () => Array.from(get().pipelines.values()),

      // ==================
      // Selection
      // ==================

      select: (id: string, addToSelection = false) => {
        const selection = { ...get().selection };
        selection.selectedIds = new Set(selection.selectedIds);

        if (addToSelection) {
          selection.selectedIds.add(id);
          selection.mode = 'multi';
        } else {
          selection.selectedIds.clear();
          selection.selectedIds.add(id);
          selection.mode = 'single';
        }
        selection.primaryId = id;

        set({ selection });
      },

      selectMultiple: (ids: string[]) => {
        const selection = { ...get().selection };
        selection.selectedIds = new Set(ids);
        selection.primaryId = ids.length > 0 ? ids[0] : null;
        selection.mode = ids.length > 1 ? 'multi' : 'single';
        set({ selection });
      },

      deselect: (id: string) => {
        const selection = { ...get().selection };
        selection.selectedIds = new Set(selection.selectedIds);
        selection.selectedIds.delete(id);
        
        if (selection.primaryId === id) {
          selection.primaryId = selection.selectedIds.size > 0
            ? Array.from(selection.selectedIds)[0]
            : null;
        }
        selection.mode = selection.selectedIds.size > 1 ? 'multi' : 'single';

        set({ selection });
      },

      deselectAll: () => {
        set({ selection: { ...initialSelectionState } });
      },

      toggleSelection: (id: string) => {
        const selection = get().selection;
        if (selection.selectedIds.has(id)) {
          get().deselect(id);
        } else {
          get().select(id, true);
        }
      },

      selectAll: () => {
        const widgets = get().getWidgets();
        const ids = widgets.map(w => w.id);
        get().selectMultiple(ids);
      },

      setSelectionBox: (box: SelectionState['selectionBox']) => {
        set({
          selection: {
            ...get().selection,
            selectionBox: box,
            isSelecting: box !== null,
          },
        });
      },

      getSelectedWidgets: () => {
        const selection = get().selection;
        const widgets = get().widgets;
        return Array.from(selection.selectedIds)
          .map(id => widgets.get(id))
          .filter((w): w is WidgetInstance => w !== undefined);
      },

      isSelected: (id: string) => get().selection.selectedIds.has(id),

      // ==================
      // Viewport
      // ==================

      setViewport: (viewport: Partial<ViewportState>) => {
        set({ viewport: { ...get().viewport, ...viewport } });
      },

      pan: (deltaX: number, deltaY: number) => {
        const viewport = get().viewport;
        set({
          viewport: {
            ...viewport,
            panX: viewport.panX + deltaX,
            panY: viewport.panY + deltaY,
          },
        });
      },

      zoom: (factor: number, centerX?: number, centerY?: number) => {
        const viewport = get().viewport;
        const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * factor));
        
        // Zoom towards center point if provided
        let newPanX = viewport.panX;
        let newPanY = viewport.panY;
        
        if (centerX !== undefined && centerY !== undefined) {
          const zoomRatio = newZoom / viewport.zoom;
          newPanX = centerX - (centerX - viewport.panX) * zoomRatio;
          newPanY = centerY - (centerY - viewport.panY) * zoomRatio;
        }

        set({
          viewport: {
            ...viewport,
            zoom: newZoom,
            panX: newPanX,
            panY: newPanY,
          },
        });
      },

      resetViewport: () => {
        set({ viewport: initialViewportState });
      },

      // ==================
      // Grid
      // ==================

      setGridSettings: (settings: Partial<GridSettings>) => {
        set({ grid: { ...get().grid, ...settings } });
      },

      toggleGrid: () => {
        const grid = get().grid;
        set({ grid: { ...grid, showGrid: !grid.showGrid } });
      },

      toggleSnapToGrid: () => {
        const grid = get().grid;
        set({ grid: { ...grid, snapToGrid: !grid.snapToGrid } });
      },

      // ==================
      // UI
      // ==================

      setPropertiesPanelOpen: (open: boolean) => {
        set({ isPropertiesPanelOpen: open });
      },

      setAISidebarOpen: (open: boolean) => {
        set({ isAISidebarOpen: open });
      },

      setFullscreen: (fullscreen: boolean) => {
        set({ isFullscreen: fullscreen });
      },

      toggleFullscreen: () => {
        set({ isFullscreen: !get().isFullscreen });
      },

      // ==================
      // History (undo/redo)
      // ==================

      saveSnapshot: () => {
        const state = get();
        const snapshot: CanvasSnapshot = {
          widgets: new Map(state.widgets),
          entities: new Map(state.entities),
          pipelines: new Map(state.pipelines),
          timestamp: Date.now(),
        };

        const history = state.history.slice(0, state.historyIndex + 1);
        history.push(snapshot);

        // Trim history if too long
        while (history.length > state.maxHistorySize) {
          history.shift();
        }

        set({
          history,
          historyIndex: history.length - 1,
        });
      },

      undo: () => {
        const { historyIndex, history } = get();
        if (historyIndex > 0) {
          const snapshot = history[historyIndex - 1];
          set({
            widgets: new Map(snapshot.widgets),
            entities: new Map(snapshot.entities),
            pipelines: new Map(snapshot.pipelines),
            historyIndex: historyIndex - 1,
          });
        }
      },

      redo: () => {
        const { historyIndex, history } = get();
        if (historyIndex < history.length - 1) {
          const snapshot = history[historyIndex + 1];
          set({
            widgets: new Map(snapshot.widgets),
            entities: new Map(snapshot.entities),
            pipelines: new Map(snapshot.pipelines),
            historyIndex: historyIndex + 1,
          });
        }
      },

      canUndo: () => get().historyIndex > 0,

      canRedo: () => get().historyIndex < get().history.length - 1,

      // ==================
      // Command-Based History (New)
      // ==================

      executeCommand: (command: Command) => {
        const newStack = commandStackOperations.executeCommand(get().commandStack, command);
        set({ commandStack: newStack });
      },

      recordCommand: (command: Command) => {
        // Record a command without executing it - used for drag/resize
        // where the operation was already applied during the interaction
        const currentStack = get().commandStack;

        // Try to merge with the last command
        const undoStack = [...currentStack.undoStack];
        const lastCommand = undoStack[undoStack.length - 1];

        if (lastCommand && command.merge) {
          const merged = command.merge(lastCommand);
          if (merged) {
            // Replace last command with merged version
            undoStack[undoStack.length - 1] = merged;
            set({
              commandStack: {
                undoStack,
                redoStack: [], // Clear redo stack on new action
                isExecuting: false,
              }
            });
            return;
          }
        }

        // Add as new command
        undoStack.push(command);

        // Trim history if too long
        if (undoStack.length > 100) {
          undoStack.shift();
        }

        set({
          commandStack: {
            undoStack,
            redoStack: [], // Clear redo stack on new action
            isExecuting: false,
          }
        });
      },

      undoCommand: () => {
        const newStack = commandStackOperations.undo(get().commandStack);
        set({ commandStack: newStack });
      },

      redoCommand: () => {
        const newStack = commandStackOperations.redo(get().commandStack);
        set({ commandStack: newStack });
      },

      canUndoCommand: () => commandStackOperations.canUndo(get().commandStack),

      canRedoCommand: () => commandStackOperations.canRedo(get().commandStack),

      getUndoName: () => commandStackOperations.getUndoName(get().commandStack),

      getRedoName: () => commandStackOperations.getRedoName(get().commandStack),

      // ==================
      // Bulk Operations
      // ==================

      moveSelectedWidgets: (deltaX: number, deltaY: number) => {
        const selectedWidgets = get().getSelectedWidgets();
        const widgets = new Map(get().widgets);
        const { snapToGrid, gridSize } = get().grid;

        selectedWidgets.forEach(widget => {
          let newX = widget.position.x + deltaX;
          let newY = widget.position.y + deltaY;

          if (snapToGrid) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
          }

          widgets.set(widget.id, {
            ...widget,
            position: { x: newX, y: newY },
          });
        });

        set({ widgets });
      },

      deleteSelectedWidgets: () => {
        const selectedIds = Array.from(get().selection.selectedIds);
        selectedIds.forEach(id => get().removeWidget(id));
        get().deselectAll();
      },

      duplicateSelectedWidgets: () => {
        const selectedWidgets = get().getSelectedWidgets();
        const newIds: string[] = [];

        selectedWidgets.forEach(widget => {
          const newWidget: WidgetInstance = {
            ...widget,
            id: `${widget.id}-${Date.now().toString(36)}`,
            position: {
              x: widget.position.x + 20,
              y: widget.position.y + 20,
            },
          };
          get().addWidget(newWidget);
          newIds.push(newWidget.id);
        });

        // Select the new widgets
        get().selectMultiple(newIds);
      },

      alignSelectedWidgets: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        const selectedWidgets = get().getSelectedWidgets();
        if (selectedWidgets.length < 2) return;

        const widgets = new Map(get().widgets);

        // Calculate bounds
        const bounds = selectedWidgets.reduce(
          (acc, w) => ({
            minX: Math.min(acc.minX, w.position.x),
            maxX: Math.max(acc.maxX, w.position.x + w.width),
            minY: Math.min(acc.minY, w.position.y),
            maxY: Math.max(acc.maxY, w.position.y + w.height),
          }),
          { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        );

        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        selectedWidgets.forEach(widget => {
          let newX = widget.position.x;
          let newY = widget.position.y;

          switch (alignment) {
            case 'left':
              newX = bounds.minX;
              break;
            case 'center':
              newX = centerX - widget.width / 2;
              break;
            case 'right':
              newX = bounds.maxX - widget.width;
              break;
            case 'top':
              newY = bounds.minY;
              break;
            case 'middle':
              newY = centerY - widget.height / 2;
              break;
            case 'bottom':
              newY = bounds.maxY - widget.height;
              break;
          }

          widgets.set(widget.id, {
            ...widget,
            position: { x: newX, y: newY },
          });
        });

        set({ widgets });
        get().saveSnapshot();
      },

      distributeSelectedWidgets: (direction: 'horizontal' | 'vertical') => {
        const selectedWidgets = get().getSelectedWidgets();
        if (selectedWidgets.length < 3) return;

        const widgets = new Map(get().widgets);

        // Sort by position
        const sorted = [...selectedWidgets].sort((a, b) =>
          direction === 'horizontal'
            ? a.position.x - b.position.x
            : a.position.y - b.position.y
        );

        // Calculate total span and spacing
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        
        if (direction === 'horizontal') {
          const totalSpan = (last.position.x + last.width) - first.position.x;
          const totalWidgetWidth = sorted.reduce((sum, w) => sum + w.width, 0);
          const spacing = (totalSpan - totalWidgetWidth) / (sorted.length - 1);

          let currentX = first.position.x;
          sorted.forEach((widget, index) => {
            if (index > 0) {
              widgets.set(widget.id, {
                ...widget,
                position: { x: currentX, y: widget.position.y },
              });
            }
            currentX += widget.width + spacing;
          });
        } else {
          const totalSpan = (last.position.y + last.height) - first.position.y;
          const totalWidgetHeight = sorted.reduce((sum, w) => sum + w.height, 0);
          const spacing = (totalSpan - totalWidgetHeight) / (sorted.length - 1);

          let currentY = first.position.y;
          sorted.forEach((widget, index) => {
            if (index > 0) {
              widgets.set(widget.id, {
                ...widget,
                position: { x: widget.position.x, y: currentY },
              });
            }
            currentY += widget.height + spacing;
          });
        }

        set({ widgets });
        get().saveSnapshot();
      },

      // ==================
      // Z-index Operations
      // ==================

      bringToFront: (id: string) => {
        const widgets = get().getWidgets();
        const maxZ = Math.max(...widgets.map(w => w.zIndex), 0);
        get().updateWidget(id, { zIndex: maxZ + 1 });
        get().saveSnapshot();
      },

      sendToBack: (id: string) => {
        const widgets = get().getWidgets();
        const minZ = Math.min(...widgets.map(w => w.zIndex), 0);
        get().updateWidget(id, { zIndex: minZ - 1 });
        get().saveSnapshot();
      },

      bringForward: (id: string) => {
        const widget = get().getWidget(id);
        if (widget) {
          get().updateWidget(id, { zIndex: widget.zIndex + 1 });
          get().saveSnapshot();
        }
      },

      sendBackward: (id: string) => {
        const widget = get().getWidget(id);
        if (widget) {
          get().updateWidget(id, { zIndex: widget.zIndex - 1 });
          get().saveSnapshot();
        }
      },

      // ==================
      // Group Operations
      // ==================

      createGroup: (widgetIds: string[], name?: string) => {
        if (widgetIds.length < 2) return '';

        const groups = new Map(get().groups);
        const widgets = new Map(get().widgets);
        const canvasId = get().canvasId;

        // Generate unique group ID
        const groupId = `group-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;

        // Calculate bounding box
        const groupWidgets = widgetIds.map(id => widgets.get(id)).filter(Boolean) as WidgetInstance[];
        if (groupWidgets.length < 2) return '';

        const bounds = {
          x: Math.min(...groupWidgets.map(w => w.position.x)),
          y: Math.min(...groupWidgets.map(w => w.position.y)),
          width: Math.max(...groupWidgets.map(w => w.position.x + w.width)) - Math.min(...groupWidgets.map(w => w.position.x)),
          height: Math.max(...groupWidgets.map(w => w.position.y + w.height)) - Math.min(...groupWidgets.map(w => w.position.y)),
        };

        // Get max zIndex from widgets in group
        const maxZIndex = Math.max(...groupWidgets.map(w => w.zIndex));

        // Create the group
        const group: WidgetGroup = {
          id: groupId,
          canvasId,
          name: name || `Group ${groups.size + 1}`,
          widgetIds,
          zIndex: maxZIndex,
          bounds,
          locked: false,
          visible: true,
        };

        // Update widgets with groupId
        widgetIds.forEach(id => {
          const widget = widgets.get(id);
          if (widget) {
            widgets.set(id, { ...widget, groupId });
          }
        });

        groups.set(groupId, group);
        set({ groups, widgets });
        get().saveSnapshot();

        return groupId;
      },

      ungroup: (groupId: string) => {
        const groups = new Map(get().groups);
        const widgets = new Map(get().widgets);
        const group = groups.get(groupId);

        if (!group) return;

        // Remove groupId from all widgets in this group
        group.widgetIds.forEach(id => {
          const widget = widgets.get(id);
          if (widget) {
            const { groupId: _, ...rest } = widget;
            widgets.set(id, rest as WidgetInstance);
          }
        });

        // Delete the group
        groups.delete(groupId);
        set({ groups, widgets });
        get().saveSnapshot();
      },

      groupSelectedWidgets: () => {
        const selectedIds = Array.from(get().selection.selectedIds);
        if (selectedIds.length < 2) return null;

        // Filter out locked widgets
        const widgets = get().widgets;
        const unlocked = selectedIds.filter(id => {
          const w = widgets.get(id);
          return w && !w.locked;
        });

        if (unlocked.length < 2) return null;

        return get().createGroup(unlocked);
      },

      ungroupSelectedWidgets: () => {
        const selectedIds = Array.from(get().selection.selectedIds);
        const widgets = get().widgets;

        // Find unique groups from selected widgets
        const groupIds = new Set<string>();
        selectedIds.forEach(id => {
          const widget = widgets.get(id);
          if (widget?.groupId) {
            groupIds.add(widget.groupId);
          }
        });

        // Ungroup each
        groupIds.forEach(groupId => get().ungroup(groupId));
      },

      addToGroup: (groupId: string, widgetIds: string[]) => {
        const groups = new Map(get().groups);
        const widgets = new Map(get().widgets);
        const group = groups.get(groupId);

        if (!group) return;

        // Update group's widgetIds
        const newWidgetIds = [...new Set([...group.widgetIds, ...widgetIds])];

        // Update widgets with groupId
        widgetIds.forEach(id => {
          const widget = widgets.get(id);
          if (widget) {
            widgets.set(id, { ...widget, groupId });
          }
        });

        // Recalculate bounds
        const groupWidgets = newWidgetIds.map(id => widgets.get(id)).filter(Boolean) as WidgetInstance[];
        const bounds = {
          x: Math.min(...groupWidgets.map(w => w.position.x)),
          y: Math.min(...groupWidgets.map(w => w.position.y)),
          width: Math.max(...groupWidgets.map(w => w.position.x + w.width)) - Math.min(...groupWidgets.map(w => w.position.x)),
          height: Math.max(...groupWidgets.map(w => w.position.y + w.height)) - Math.min(...groupWidgets.map(w => w.position.y)),
        };

        groups.set(groupId, { ...group, widgetIds: newWidgetIds, bounds });
        set({ groups, widgets });
        get().saveSnapshot();
      },

      removeFromGroup: (widgetIds: string[]) => {
        const groups = new Map(get().groups);
        const widgets = new Map(get().widgets);

        widgetIds.forEach(id => {
          const widget = widgets.get(id);
          if (widget?.groupId) {
            const group = groups.get(widget.groupId);
            if (group) {
              const newWidgetIds = group.widgetIds.filter(wId => wId !== id);
              if (newWidgetIds.length < 2) {
                // Ungroup if less than 2 widgets remain
                get().ungroup(widget.groupId);
              } else {
                groups.set(widget.groupId, { ...group, widgetIds: newWidgetIds });
              }
            }
            // Remove groupId from widget
            const { groupId: _, ...rest } = widget;
            widgets.set(id, rest as WidgetInstance);
          }
        });

        set({ groups, widgets });
        get().saveSnapshot();
      },

      getGroup: (groupId: string) => get().groups.get(groupId),

      getGroups: () => Array.from(get().groups.values()),

      getWidgetsInGroup: (groupId: string) => {
        const group = get().groups.get(groupId);
        if (!group) return [];
        return group.widgetIds.map(id => get().widgets.get(id)).filter(Boolean) as WidgetInstance[];
      },

      updateGroup: (groupId: string, updates: Partial<WidgetGroup>) => {
        const groups = new Map(get().groups);
        const group = groups.get(groupId);
        if (group) {
          groups.set(groupId, { ...group, ...updates });
          set({ groups });
        }
      },

      deleteGroup: (groupId: string) => {
        // Ungroup first, then delete all widgets
        const group = get().groups.get(groupId);
        if (group) {
          get().ungroup(groupId);
          // Optionally delete widgets too - for now just ungroup
        }
      },

      // ==================
      // Lock/Visibility Operations
      // ==================

      toggleLock: (id: string) => {
        const widget = get().getWidget(id);
        if (widget) {
          get().updateWidget(id, { locked: !widget.locked });
        } else {
          const group = get().getGroup(id);
          if (group) {
            get().updateGroup(id, { locked: !group.locked });
            // Also lock/unlock all widgets in group
            group.widgetIds.forEach(wId => {
              get().updateWidget(wId, { locked: !group.locked });
            });
          }
        }
      },

      toggleVisibility: (id: string) => {
        const widget = get().getWidget(id);
        if (widget) {
          get().updateWidget(id, { visible: widget.visible === false ? true : false });
        } else {
          const group = get().getGroup(id);
          if (group) {
            const newVisible = group.visible === false ? true : false;
            get().updateGroup(id, { visible: newVisible });
            // Also hide/show all widgets in group
            group.widgetIds.forEach(wId => {
              get().updateWidget(wId, { visible: newVisible });
            });
          }
        }
      },

      setLocked: (id: string, locked: boolean) => {
        const widget = get().getWidget(id);
        if (widget) {
          get().updateWidget(id, { locked });
        } else {
          const group = get().getGroup(id);
          if (group) {
            get().updateGroup(id, { locked });
            group.widgetIds.forEach(wId => {
              get().updateWidget(wId, { locked });
            });
          }
        }
      },

      setVisible: (id: string, visible: boolean) => {
        const widget = get().getWidget(id);
        if (widget) {
          get().updateWidget(id, { visible });
        } else {
          const group = get().getGroup(id);
          if (group) {
            get().updateGroup(id, { visible });
            group.widgetIds.forEach(wId => {
              get().updateWidget(wId, { visible });
            });
          }
        }
      },

      lockSelectedWidgets: () => {
        get().selection.selectedIds.forEach(id => {
          get().setLocked(id, true);
        });
      },

      unlockSelectedWidgets: () => {
        get().selection.selectedIds.forEach(id => {
          get().setLocked(id, false);
        });
      },

      hideSelectedWidgets: () => {
        get().selection.selectedIds.forEach(id => {
          get().setVisible(id, false);
        });
        get().deselectAll();
      },

      showSelectedWidgets: () => {
        get().selection.selectedIds.forEach(id => {
          get().setVisible(id, true);
        });
      },

      // ==================
      // Layer Helpers
      // ==================

      getLayerOrder: () => {
        const widgets = Array.from(get().widgets.values());
        const groups = Array.from(get().groups.values());

        // Get ungrouped widgets
        const ungroupedWidgets = widgets.filter(w => !w.groupId);

        // Build layer list
        const layers: Array<{ id: string; type: 'widget' | 'group'; zIndex: number; name: string }> = [];

        // Add groups
        groups.forEach(g => {
          layers.push({
            id: g.id,
            type: 'group',
            zIndex: g.zIndex,
            name: g.name,
          });
        });

        // Add ungrouped widgets
        ungroupedWidgets.forEach(w => {
          layers.push({
            id: w.id,
            type: 'widget',
            zIndex: w.zIndex,
            name: w.name || w.widgetDefId.split('/').pop() || w.id.slice(0, 8),
          });
        });

        // Sort by zIndex (highest first for UI display)
        return layers.sort((a, b) => b.zIndex - a.zIndex);
      },

      setZIndex: (id: string, zIndex: number) => {
        const widget = get().getWidget(id);
        if (widget) {
          get().updateWidget(id, { zIndex });
        } else {
          const group = get().getGroup(id);
          if (group) {
            get().updateGroup(id, { zIndex });
            // Update all widgets in group to match
            group.widgetIds.forEach(wId => {
              get().updateWidget(wId, { zIndex });
            });
          }
        }
        get().saveSnapshot();
      },

      reorderLayers: (orderedIds: string[]) => {
        const widgets = new Map(get().widgets);
        const groups = new Map(get().groups);

        // Assign new z-indices based on order (reversed - first in array = highest zIndex)
        orderedIds.forEach((id, index) => {
          const zIndex = orderedIds.length - index;

          const widget = widgets.get(id);
          if (widget) {
            widgets.set(id, { ...widget, zIndex });
          } else {
            const group = groups.get(id);
            if (group) {
              groups.set(id, { ...group, zIndex });
              // Update all widgets in group
              group.widgetIds.forEach(wId => {
                const w = widgets.get(wId);
                if (w) {
                  widgets.set(wId, { ...w, zIndex });
                }
              });
            }
          }
        });

        set({ widgets, groups });
        get().saveSnapshot();
      },

      // Grid alias
      setGrid: (settings: Partial<GridSettings>) => {
        get().setGridSettings(settings);
      },
    }),
      {
        name: 'stickernest-canvas-store',
        storage: mapStorage,
        partialize: (state) => ({
          // Only persist certain parts of state
          canvasId: state.canvasId,
          userId: state.userId,
          widgets: state.widgets,
          entities: state.entities,
          pipelines: state.pipelines,
          grid: state.grid,
        }),
      }
    ),
    { name: 'CanvasStore', enabled: import.meta.env.DEV }
  )
);

// ==================
// Selector Hooks
// ==================

/** Select widgets as array */
export const useWidgets = () => useCanvasStore(state => state.getWidgets());

/** Select a single widget */
export const useWidget = (id: string) => useCanvasStore(state => state.widgets.get(id));

/** Select current selection */
export const useSelection = () => useCanvasStore(state => state.selection);

/** Select selected widget IDs */
export const useSelectedIds = () => useCanvasStore(state => Array.from(state.selection.selectedIds));

/** Select canvas mode */
export const useCanvasMode = () => useCanvasStore(state => state.mode);

/** Select grid settings */
export const useGridSettings = () => useCanvasStore(state => state.grid);

/** Select viewport */
export const useViewport = () => useCanvasStore(state => state.viewport);

/** Check if in edit mode */
export const useIsEditMode = () => useCanvasStore(state => state.mode === 'edit');

/** Get selected widgets count */
export const useSelectionCount = () => useCanvasStore(state => state.selection.selectedIds.size);

/** Check if widget is selected */
export const useIsWidgetSelected = (id: string) =>
  useCanvasStore(state => state.selection.selectedIds.has(id));

/** Check if in fullscreen mode */
export const useIsFullscreen = () => useCanvasStore(state => state.isFullscreen);

