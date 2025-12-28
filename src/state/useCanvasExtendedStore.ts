/**
 * StickerNest v2 - Extended Canvas Store
 * Additional state management for layers, groups, lock/unlock, and multi-canvas
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CanvasLayer,
  WidgetGroup,
  CanvasExtended,
  CanvasBackground,
  CanvasAction,
  CanvasHistory
} from '../types/domain';

// ==================
// Types
// ==================

/**
 * Canvas lock state for v3
 * When locked, the canvas prevents all widget manipulation
 */
export interface CanvasLockState {
  /** Whether the entire canvas is locked */
  isLocked: boolean;
  /** Lock reason for display */
  lockReason?: string;
  /** Who locked the canvas (for collaborative features) */
  lockedBy?: string;
  /** When the canvas was locked */
  lockedAt?: number;
}

/**
 * Canvas scale state for v3
 * Separate from viewport zoom - this is a global scale multiplier
 */
export interface CanvasScaleState {
  /** Global scale multiplier (1 = 100%) */
  scale: number;
  /** Minimum scale allowed */
  minScale: number;
  /** Maximum scale allowed */
  maxScale: number;
  /** Whether to scale widgets proportionally */
  scaleWidgets: boolean;
  /** Origin point for scaling (default center) */
  scaleOrigin: { x: number; y: number };
}

export interface CanvasExtendedState {
  // Multi-canvas support
  canvases: Map<string, CanvasExtended>;
  activeCanvasId: string | null;

  // Layers
  layers: Map<string, CanvasLayer>;
  activeLayerId: string | null;

  // Groups
  groups: Map<string, WidgetGroup>;
  activeGroupId: string | null;

  // Locked widgets
  lockedWidgetIds: Set<string>;

  // Canvas dimensions for resize
  canvasDimensions: { width: number; height: number };
  originalDimensions: { width: number; height: number } | null;

  // Detailed action history
  actionHistory: CanvasHistory;

  // V3: Canvas lock state
  canvasLock: CanvasLockState;

  // V3: Canvas scale state
  canvasScale: CanvasScaleState;
}

export interface CanvasExtendedActions {
  // Multi-canvas
  createCanvas: (name: string, width?: number, height?: number) => CanvasExtended;
  deleteCanvas: (id: string) => void;
  switchCanvas: (id: string) => void;
  updateCanvas: (id: string, updates: Partial<CanvasExtended>) => void;
  getCanvas: (id: string) => CanvasExtended | undefined;
  getCanvases: () => CanvasExtended[];
  duplicateCanvas: (id: string) => CanvasExtended;
  setCanvasBackground: (canvasId: string, background: CanvasBackground) => void;

  // Layers
  createLayer: (name?: string) => CanvasLayer;
  deleteLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  setActiveLayer: (id: string | null) => void;
  getLayer: (id: string) => CanvasLayer | undefined;
  getLayers: () => CanvasLayer[];
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  assignWidgetToLayer: (widgetId: string, layerId: string) => void;
  getWidgetsOnLayer: (layerId: string) => string[];

  // Groups
  createGroup: (widgetIds: string[], name?: string) => WidgetGroup;
  deleteGroup: (id: string) => void;
  updateGroup: (id: string, updates: Partial<WidgetGroup>) => void;
  addToGroup: (groupId: string, widgetIds: string[]) => void;
  removeFromGroup: (groupId: string, widgetIds: string[]) => void;
  setActiveGroup: (id: string | null) => void;
  getGroup: (id: string) => WidgetGroup | undefined;
  getGroups: () => WidgetGroup[];
  getWidgetsInGroup: (groupId: string) => string[];
  getGroupForWidget: (widgetId: string) => WidgetGroup | undefined;
  ungroupAll: (groupId: string) => void;

  // Lock/unlock
  lockWidget: (id: string) => void;
  unlockWidget: (id: string) => void;
  toggleWidgetLock: (id: string) => void;
  isWidgetLocked: (id: string) => boolean;
  lockSelectedWidgets: (widgetIds: string[]) => void;
  unlockSelectedWidgets: (widgetIds: string[]) => void;

  // Canvas resize with proportional scaling
  setCanvasDimensions: (width: number, height: number, scaleWidgets?: boolean) => void;
  startResize: () => void;
  endResize: () => void;
  getScaleFactor: () => { x: number; y: number };

  // Action history (more detailed undo/redo)
  recordAction: (action: Omit<CanvasAction, 'id' | 'timestamp'>) => void;
  undoAction: () => CanvasAction | null;
  redoAction: () => CanvasAction | null;
  startBatch: (description?: string) => void;
  endBatch: () => void;
  clearHistory: () => void;

  // V3: Canvas lock operations
  lockCanvas: (reason?: string) => void;
  unlockCanvas: () => void;
  toggleCanvasLock: () => void;
  isCanvasLocked: () => boolean;

  // V3: Canvas scale operations
  setCanvasScale: (scale: number) => void;
  getCanvasScale: () => number;
  resetCanvasScale: () => void;
  setScaleOrigin: (origin: { x: number; y: number }) => void;
  setScaleWidgets: (enabled: boolean) => void;
  zoomToFit: () => void;
  zoomToActualSize: () => void;
}

// ==================
// Initial State
// ==================

const initialHistory: CanvasHistory = {
  past: [],
  future: [],
  maxSize: 100,
  isBatching: false,
  currentBatch: [],
};

const initialCanvasLock: CanvasLockState = {
  isLocked: false,
  lockReason: undefined,
  lockedBy: undefined,
  lockedAt: undefined,
};

const initialCanvasScale: CanvasScaleState = {
  scale: 1,
  minScale: 0.1,
  maxScale: 5,
  scaleWidgets: true,
  scaleOrigin: { x: 0.5, y: 0.5 }, // Center by default
};

const initialState: CanvasExtendedState = {
  canvases: new Map(),
  activeCanvasId: null,
  layers: new Map(),
  activeLayerId: null,
  groups: new Map(),
  activeGroupId: null,
  lockedWidgetIds: new Set(),
  canvasDimensions: { width: 1920, height: 1080 },
  originalDimensions: null,
  actionHistory: initialHistory,
  canvasLock: initialCanvasLock,
  canvasScale: initialCanvasScale,
};

// ==================
// Helpers
// ==================

const generateId = () => crypto.randomUUID();

/** Custom JSON reviver for Maps and Sets */
const jsonReviver = (_key: string, value: unknown) => {
  if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Map') {
    return new Map((value as { entries: [string, unknown][] }).entries);
  }
  if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Set') {
    return new Set((value as { values: unknown[] }).values);
  }
  return value;
};

/** Custom JSON replacer for Maps and Sets */
const jsonReplacer = (_key: string, value: unknown) => {
  if (value instanceof Map) {
    return { __type: 'Map', entries: Array.from(value.entries()) };
  }
  if (value instanceof Set) {
    return { __type: 'Set', values: Array.from(value) };
  }
  return value;
};

const mapStorage = createJSONStorage(() => localStorage, {
  reviver: jsonReviver,
  replacer: jsonReplacer,
});

// ==================
// Store
// ==================

export const useCanvasExtendedStore = create<CanvasExtendedState & CanvasExtendedActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ==================
      // Multi-canvas
      // ==================

      createCanvas: (name: string, width = 1920, height = 1080) => {
        const id = generateId();
        const canvas: CanvasExtended = {
          id,
          userId: '', // Will be set by the app
          name,
          visibility: 'private',
          createdAt: new Date().toISOString(),
          width,
          height,
          background: { type: 'color', color: '#1a1a2e' },
          defaultZoom: 1,
          order: get().canvases.size,
        };

        const canvases = new Map(get().canvases);
        canvases.set(id, canvas);
        set({ canvases, activeCanvasId: id });

        // Create default layer for new canvas
        get().createLayer('Background');

        return canvas;
      },

      deleteCanvas: (id: string) => {
        const canvases = new Map(get().canvases);
        canvases.delete(id);

        const activeCanvasId = get().activeCanvasId === id
          ? (canvases.size > 0 ? Array.from(canvases.keys())[0] : null)
          : get().activeCanvasId;

        set({ canvases, activeCanvasId });
      },

      switchCanvas: (id: string) => {
        if (get().canvases.has(id)) {
          set({ activeCanvasId: id });
        }
      },

      updateCanvas: (id: string, updates: Partial<CanvasExtended>) => {
        const canvases = new Map(get().canvases);
        const existing = canvases.get(id);
        if (existing) {
          canvases.set(id, { ...existing, ...updates });
          set({ canvases });
        }
      },

      getCanvas: (id: string) => get().canvases.get(id),

      getCanvases: () => Array.from(get().canvases.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),

      duplicateCanvas: (id: string) => {
        const original = get().canvases.get(id);
        if (!original) throw new Error(`Canvas ${id} not found`);

        const newCanvas = get().createCanvas(
          `${original.name} (copy)`,
          original.width,
          original.height
        );
        get().updateCanvas(newCanvas.id, {
          background: original.background,
          defaultZoom: original.defaultZoom,
          description: original.description,
          tags: original.tags,
        });

        return newCanvas;
      },

      setCanvasBackground: (canvasId: string, background: CanvasBackground) => {
        const canvases = new Map(get().canvases);
        const canvas = canvases.get(canvasId);
        if (canvas) {
          canvases.set(canvasId, { ...canvas, background });
          set({ canvases });
        }
      },

      // ==================
      // Layers
      // ==================

      createLayer: (name?: string) => {
        const id = generateId();
        const layers = get().getLayers();
        const maxOrder = layers.length > 0 ? Math.max(...layers.map(l => l.order)) : -1;

        const layer: CanvasLayer = {
          id,
          canvasId: get().activeCanvasId || '',
          name: name || `Layer ${layers.length + 1}`,
          order: maxOrder + 1,
          visible: true,
          locked: false,
          opacity: 1,
        };

        const layersMap = new Map(get().layers);
        layersMap.set(id, layer);
        set({ layers: layersMap, activeLayerId: id });

        return layer;
      },

      deleteLayer: (id: string) => {
        const layers = new Map(get().layers);
        layers.delete(id);

        const activeLayerId = get().activeLayerId === id
          ? (layers.size > 0 ? Array.from(layers.keys())[0] : null)
          : get().activeLayerId;

        set({ layers, activeLayerId });
      },

      updateLayer: (id: string, updates: Partial<CanvasLayer>) => {
        const layers = new Map(get().layers);
        const existing = layers.get(id);
        if (existing) {
          layers.set(id, { ...existing, ...updates });
          set({ layers });
        }
      },

      setActiveLayer: (id: string | null) => {
        set({ activeLayerId: id });
      },

      getLayer: (id: string) => get().layers.get(id),

      getLayers: () => {
        const canvasId = get().activeCanvasId;
        return Array.from(get().layers.values())
          .filter(l => l.canvasId === canvasId)
          .sort((a, b) => b.order - a.order); // Higher order = on top
      },

      moveLayerUp: (id: string) => {
        const layers = get().getLayers();
        const index = layers.findIndex(l => l.id === id);
        if (index > 0) {
          const layersMap = new Map(get().layers);
          const current = layersMap.get(id)!;
          const above = layers[index - 1];

          // Swap orders
          layersMap.set(id, { ...current, order: above.order });
          layersMap.set(above.id, { ...above, order: current.order });
          set({ layers: layersMap });
        }
      },

      moveLayerDown: (id: string) => {
        const layers = get().getLayers();
        const index = layers.findIndex(l => l.id === id);
        if (index < layers.length - 1) {
          const layersMap = new Map(get().layers);
          const current = layersMap.get(id)!;
          const below = layers[index + 1];

          // Swap orders
          layersMap.set(id, { ...current, order: below.order });
          layersMap.set(below.id, { ...below, order: current.order });
          set({ layers: layersMap });
        }
      },

      toggleLayerVisibility: (id: string) => {
        const layer = get().layers.get(id);
        if (layer) {
          get().updateLayer(id, { visible: !layer.visible });
        }
      },

      toggleLayerLock: (id: string) => {
        const layer = get().layers.get(id);
        if (layer) {
          get().updateLayer(id, { locked: !layer.locked });
        }
      },

      assignWidgetToLayer: (widgetId: string, layerId: string) => {
        // This would need to update the widget's layerId in the main canvas store
        // For now, emit an event or callback
        console.log(`[CanvasExtendedStore] Assign widget ${widgetId} to layer ${layerId}`);
      },

      getWidgetsOnLayer: (layerId: string) => {
        // This would query the main canvas store for widgets on this layer
        // Placeholder implementation
        return [];
      },

      // ==================
      // Groups
      // ==================

      createGroup: (widgetIds: string[], name?: string) => {
        const id = generateId();
        const groups = get().getGroups();

        const group: WidgetGroup = {
          id,
          canvasId: get().activeCanvasId || '',
          name: name || `Group ${groups.length + 1}`,
          widgetIds: [...widgetIds],
          locked: false,
          visible: true,
        };

        const groupsMap = new Map(get().groups);
        groupsMap.set(id, group);
        set({ groups: groupsMap, activeGroupId: id });

        return group;
      },

      deleteGroup: (id: string) => {
        const groups = new Map(get().groups);
        groups.delete(id);

        const activeGroupId = get().activeGroupId === id ? null : get().activeGroupId;
        set({ groups, activeGroupId });
      },

      updateGroup: (id: string, updates: Partial<WidgetGroup>) => {
        const groups = new Map(get().groups);
        const existing = groups.get(id);
        if (existing) {
          groups.set(id, { ...existing, ...updates });
          set({ groups });
        }
      },

      addToGroup: (groupId: string, widgetIds: string[]) => {
        const group = get().groups.get(groupId);
        if (group) {
          const newWidgetIds = [...new Set([...group.widgetIds, ...widgetIds])];
          get().updateGroup(groupId, { widgetIds: newWidgetIds });
        }
      },

      removeFromGroup: (groupId: string, widgetIds: string[]) => {
        const group = get().groups.get(groupId);
        if (group) {
          const newWidgetIds = group.widgetIds.filter(id => !widgetIds.includes(id));
          if (newWidgetIds.length === 0) {
            get().deleteGroup(groupId);
          } else {
            get().updateGroup(groupId, { widgetIds: newWidgetIds });
          }
        }
      },

      setActiveGroup: (id: string | null) => {
        set({ activeGroupId: id });
      },

      getGroup: (id: string) => get().groups.get(id),

      getGroups: () => {
        const canvasId = get().activeCanvasId;
        return Array.from(get().groups.values())
          .filter(g => g.canvasId === canvasId);
      },

      getWidgetsInGroup: (groupId: string) => {
        const group = get().groups.get(groupId);
        return group?.widgetIds || [];
      },

      getGroupForWidget: (widgetId: string) => {
        return get().getGroups().find(g => g.widgetIds.includes(widgetId));
      },

      ungroupAll: (groupId: string) => {
        get().deleteGroup(groupId);
      },

      // ==================
      // Lock/unlock
      // ==================

      lockWidget: (id: string) => {
        const lockedWidgetIds = new Set(get().lockedWidgetIds);
        lockedWidgetIds.add(id);
        set({ lockedWidgetIds });
      },

      unlockWidget: (id: string) => {
        const lockedWidgetIds = new Set(get().lockedWidgetIds);
        lockedWidgetIds.delete(id);
        set({ lockedWidgetIds });
      },

      toggleWidgetLock: (id: string) => {
        if (get().isWidgetLocked(id)) {
          get().unlockWidget(id);
        } else {
          get().lockWidget(id);
        }
      },

      isWidgetLocked: (id: string) => {
        // Check direct lock
        if (get().lockedWidgetIds.has(id)) return true;

        // Check if widget is on a locked layer
        // (would need to check widget's layerId against locked layers)

        // Check if widget is in a locked group
        const group = get().getGroupForWidget(id);
        if (group?.locked) return true;

        return false;
      },

      lockSelectedWidgets: (widgetIds: string[]) => {
        const lockedWidgetIds = new Set(get().lockedWidgetIds);
        widgetIds.forEach(id => lockedWidgetIds.add(id));
        set({ lockedWidgetIds });
      },

      unlockSelectedWidgets: (widgetIds: string[]) => {
        const lockedWidgetIds = new Set(get().lockedWidgetIds);
        widgetIds.forEach(id => lockedWidgetIds.delete(id));
        set({ lockedWidgetIds });
      },

      // ==================
      // Canvas resize with proportional scaling
      // ==================

      setCanvasDimensions: (width: number, height: number, scaleWidgets = true) => {
        const prev = get().canvasDimensions;
        const original = get().originalDimensions || prev;

        set({
          canvasDimensions: { width, height },
          originalDimensions: original,
        });

        // If scaling is enabled, we return the scale factor
        // The actual widget scaling would be done by the component using this
        if (scaleWidgets) {
          const scaleX = width / original.width;
          const scaleY = height / original.height;
          console.log(`[CanvasExtendedStore] Scale widgets by ${scaleX}x${scaleY}`);
        }
      },

      startResize: () => {
        // Store original dimensions when starting resize
        if (!get().originalDimensions) {
          set({ originalDimensions: { ...get().canvasDimensions } });
        }
      },

      endResize: () => {
        // Update original dimensions to current after resize is complete
        set({ originalDimensions: { ...get().canvasDimensions } });
      },

      getScaleFactor: () => {
        const current = get().canvasDimensions;
        const original = get().originalDimensions || current;
        return {
          x: current.width / original.width,
          y: current.height / original.height,
        };
      },

      // ==================
      // Action history
      // ==================

      recordAction: (action: Omit<CanvasAction, 'id' | 'timestamp'>) => {
        const history = { ...get().actionHistory };
        const fullAction: CanvasAction = {
          ...action,
          id: generateId(),
          timestamp: Date.now(),
        };

        if (history.isBatching) {
          history.currentBatch.push(fullAction);
        } else {
          history.past.push(fullAction);
          history.future = []; // Clear redo stack on new action

          // Trim history if too long
          while (history.past.length > history.maxSize) {
            history.past.shift();
          }
        }

        set({ actionHistory: history });
      },

      undoAction: () => {
        const history = { ...get().actionHistory };
        if (history.past.length === 0) return null;

        const action = history.past.pop()!;
        history.future.unshift(action);
        set({ actionHistory: history });

        return action;
      },

      redoAction: () => {
        const history = { ...get().actionHistory };
        if (history.future.length === 0) return null;

        const action = history.future.shift()!;
        history.past.push(action);
        set({ actionHistory: history });

        return action;
      },

      startBatch: (description?: string) => {
        const history = { ...get().actionHistory };
        history.isBatching = true;
        history.currentBatch = [];
        set({ actionHistory: history });
      },

      endBatch: () => {
        const history = { ...get().actionHistory };
        if (!history.isBatching) return;

        if (history.currentBatch.length > 0) {
          const batchAction: CanvasAction = {
            id: generateId(),
            type: 'batch',
            timestamp: Date.now(),
            before: null,
            after: null,
            description: `Batch of ${history.currentBatch.length} actions`,
            actions: history.currentBatch,
          };
          history.past.push(batchAction);
          history.future = [];
        }

        history.isBatching = false;
        history.currentBatch = [];
        set({ actionHistory: history });
      },

      clearHistory: () => {
        set({ actionHistory: { ...initialHistory } });
      },

      // ==================
      // V3: Canvas Lock Operations
      // ==================

      lockCanvas: (reason?: string) => {
        set({
          canvasLock: {
            isLocked: true,
            lockReason: reason,
            lockedBy: undefined, // Could be set from auth context
            lockedAt: Date.now(),
          },
        });
      },

      unlockCanvas: () => {
        set({ canvasLock: { ...initialCanvasLock } });
      },

      toggleCanvasLock: () => {
        const current = get().canvasLock;
        if (current.isLocked) {
          get().unlockCanvas();
        } else {
          get().lockCanvas();
        }
      },

      isCanvasLocked: () => get().canvasLock.isLocked,

      // ==================
      // V3: Canvas Scale Operations
      // ==================

      setCanvasScale: (scale: number) => {
        const { minScale, maxScale } = get().canvasScale;
        const clampedScale = Math.max(minScale, Math.min(maxScale, scale));
        set({
          canvasScale: {
            ...get().canvasScale,
            scale: clampedScale,
          },
        });
      },

      getCanvasScale: () => get().canvasScale.scale,

      resetCanvasScale: () => {
        set({
          canvasScale: {
            ...get().canvasScale,
            scale: 1,
          },
        });
      },

      setScaleOrigin: (origin: { x: number; y: number }) => {
        set({
          canvasScale: {
            ...get().canvasScale,
            scaleOrigin: origin,
          },
        });
      },

      setScaleWidgets: (enabled: boolean) => {
        set({
          canvasScale: {
            ...get().canvasScale,
            scaleWidgets: enabled,
          },
        });
      },

      zoomToFit: () => {
        // Calculate scale to fit canvas in viewport
        // This would typically need viewport dimensions from CanvasRenderer
        // For now, set to a reasonable fit scale
        const { width, height } = get().canvasDimensions;
        const viewportWidth = window.innerWidth - 300; // Account for sidebars
        const viewportHeight = window.innerHeight - 150; // Account for toolbars
        const scaleX = viewportWidth / width;
        const scaleY = viewportHeight / height;
        const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
        get().setCanvasScale(fitScale);
      },

      zoomToActualSize: () => {
        get().setCanvasScale(1);
      },
    }),
    {
      name: 'stickernest-canvas-extended-store',
      storage: mapStorage,
      partialize: (state) => ({
        canvases: state.canvases,
        activeCanvasId: state.activeCanvasId,
        layers: state.layers,
        groups: state.groups,
        lockedWidgetIds: state.lockedWidgetIds,
        canvasDimensions: state.canvasDimensions,
        // NOTE: canvasLock is intentionally NOT persisted - it's a transient state
        // that should always start unlocked on page load
        canvasScale: state.canvasScale,
      }),
      // Ensure canvas is always unlocked on startup (handles legacy persisted lock state)
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Always reset canvas lock on startup
          state.canvasLock = { ...initialCanvasLock };
        }
      },
    }
  )
);

// ==================
// Selector Hooks
// ==================

export const useCanvases = () => useCanvasExtendedStore(state => state.getCanvases());
export const useActiveCanvas = () => useCanvasExtendedStore(state =>
  state.activeCanvasId ? state.canvases.get(state.activeCanvasId) : undefined
);
export const useLayers = () => useCanvasExtendedStore(state => state.getLayers());
export const useActiveLayer = () => useCanvasExtendedStore(state =>
  state.activeLayerId ? state.layers.get(state.activeLayerId) : undefined
);
export const useGroups = () => useCanvasExtendedStore(state => state.getGroups());
export const useIsWidgetLocked = (id: string) => useCanvasExtendedStore(state => state.isWidgetLocked(id));
export const useCanvasDimensions = () => useCanvasExtendedStore(state => state.canvasDimensions);
export const useCanUndo = () => useCanvasExtendedStore(state => state.actionHistory.past.length > 0);
export const useCanRedo = () => useCanvasExtendedStore(state => state.actionHistory.future.length > 0);

// V3: Canvas Lock Selectors
export const useCanvasLock = () => useCanvasExtendedStore(state => state.canvasLock);
export const useIsCanvasLocked = () => useCanvasExtendedStore(state => state.canvasLock.isLocked);

// V3: Canvas Scale Selectors
export const useCanvasScale = () => useCanvasExtendedStore(state => state.canvasScale);
export const useCanvasScaleValue = () => useCanvasExtendedStore(state => state.canvasScale.scale);
