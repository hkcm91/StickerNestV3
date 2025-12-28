/**
 * StickerNest v2 - Layer & Group Store (Zustand)
 * Manages canvas layers, widget/sticker groups, and z-order
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import type { CanvasLayer, WidgetGroup, WidgetPosition } from '../types/domain';

// ==================
// Types
// ==================

/** Entity type for unified management */
export type LayerEntityType = 'widget' | 'sticker' | 'entity';

/** Reference to any canvas entity */
export interface EntityRef {
  id: string;
  type: LayerEntityType;
}

/** Group bounds computed from member positions */
export interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ==================
// Store State
// ==================

export interface LayerState {
  /** All layers by canvas ID */
  layersByCanvas: Map<string, CanvasLayer[]>;
  /** All groups by canvas ID */
  groupsByCanvas: Map<string, WidgetGroup[]>;
  /** Next z-index counter by canvas */
  nextZIndexByCanvas: Map<string, number>;
  /** Currently active layer ID by canvas */
  activeLayerByCanvas: Map<string, string>;
}

// ==================
// Store Actions
// ==================

export interface LayerActions {
  // === Layer Management ===
  /** Create a new layer */
  createLayer: (canvasId: string, name?: string) => CanvasLayer;
  /** Delete a layer (moves contents to default layer) */
  deleteLayer: (canvasId: string, layerId: string) => void;
  /** Update layer properties */
  updateLayer: (canvasId: string, layerId: string, updates: Partial<CanvasLayer>) => void;
  /** Reorder layers */
  reorderLayers: (canvasId: string, layerIds: string[]) => void;
  /** Get all layers for a canvas */
  getLayers: (canvasId: string) => CanvasLayer[];
  /** Get layer by ID */
  getLayer: (canvasId: string, layerId: string) => CanvasLayer | undefined;
  /** Set active layer */
  setActiveLayer: (canvasId: string, layerId: string) => void;
  /** Get active layer */
  getActiveLayer: (canvasId: string) => CanvasLayer | undefined;
  /** Toggle layer visibility */
  toggleLayerVisibility: (canvasId: string, layerId: string) => void;
  /** Toggle layer lock */
  toggleLayerLock: (canvasId: string, layerId: string) => void;

  // === Group Management ===
  /** Create a group from selected entities */
  createGroup: (canvasId: string, entityRefs: EntityRef[], name?: string) => WidgetGroup;
  /** Delete a group (keeps entities) */
  deleteGroup: (canvasId: string, groupId: string) => void;
  /** Update group properties */
  updateGroup: (canvasId: string, groupId: string, updates: Partial<WidgetGroup>) => void;
  /** Add entities to a group */
  addToGroup: (canvasId: string, groupId: string, entityRefs: EntityRef[]) => void;
  /** Remove entities from a group */
  removeFromGroup: (canvasId: string, groupId: string, entityRefs: EntityRef[]) => void;
  /** Get all groups for a canvas */
  getGroups: (canvasId: string) => WidgetGroup[];
  /** Get group by ID */
  getGroup: (canvasId: string, groupId: string) => WidgetGroup | undefined;
  /** Update group bounds */
  updateGroupBounds: (canvasId: string, groupId: string, bounds: GroupBounds) => void;
  /** Toggle group collapsed state */
  toggleGroupCollapsed: (canvasId: string, groupId: string) => void;
  /** Ungroup all entities in a group */
  ungroup: (canvasId: string, groupId: string) => EntityRef[];

  // === Z-Order Management ===
  /** Get next z-index for a canvas */
  getNextZIndex: (canvasId: string) => number;
  /** Bring entity to front */
  bringToFront: (canvasId: string, entityRef: EntityRef) => number;
  /** Send entity to back */
  sendToBack: (canvasId: string, entityRef: EntityRef) => number;
  /** Bring entity forward one level */
  bringForward: (canvasId: string, entityRef: EntityRef, allEntities: EntityRef[]) => void;
  /** Send entity backward one level */
  sendBackward: (canvasId: string, entityRef: EntityRef, allEntities: EntityRef[]) => void;

  // === Utilities ===
  /** Initialize default layer for a canvas */
  initializeCanvas: (canvasId: string) => void;
  /** Reset store */
  reset: () => void;
}

// ==================
// Initial State
// ==================

const initialState: LayerState = {
  layersByCanvas: new Map(),
  groupsByCanvas: new Map(),
  nextZIndexByCanvas: new Map(),
  activeLayerByCanvas: new Map(),
};

// ==================
// Helper Functions
// ==================

const generateId = () => crypto.randomUUID();

const createDefaultLayer = (canvasId: string): CanvasLayer => ({
  id: generateId(),
  canvasId,
  name: 'Layer 1',
  order: 0,
  visible: true,
  locked: false,
  opacity: 1,
  collapsed: false,
});

// ==================
// Store Creation
// ==================

export const useLayerStore = create<LayerState & LayerActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // === Layer Management ===

        createLayer: (canvasId, name) => {
          const layers = get().layersByCanvas.get(canvasId) || [];
          const maxOrder = layers.reduce((max, l) => Math.max(max, l.order), -1);

          const newLayer: CanvasLayer = {
            id: generateId(),
            canvasId,
            name: name || `Layer ${layers.length + 1}`,
            order: maxOrder + 1,
            visible: true,
            locked: false,
            opacity: 1,
            collapsed: false,
          };

          set((state) => {
            const newLayersByCanvas = new Map(state.layersByCanvas);
            const existingLayers = newLayersByCanvas.get(canvasId) || [];
            newLayersByCanvas.set(canvasId, [...existingLayers, newLayer]);
            return { layersByCanvas: newLayersByCanvas };
          }, false, 'createLayer');

          return newLayer;
        },

        deleteLayer: (canvasId, layerId) => {
          set((state) => {
            const newLayersByCanvas = new Map(state.layersByCanvas);
            const layers = newLayersByCanvas.get(canvasId) || [];

            // Don't delete the last layer
            if (layers.length <= 1) return state;

            newLayersByCanvas.set(canvasId, layers.filter(l => l.id !== layerId));

            // Update active layer if needed
            const newActiveLayerByCanvas = new Map(state.activeLayerByCanvas);
            if (newActiveLayerByCanvas.get(canvasId) === layerId) {
              const remaining = layers.filter(l => l.id !== layerId);
              if (remaining.length > 0) {
                newActiveLayerByCanvas.set(canvasId, remaining[0].id);
              }
            }

            return { layersByCanvas: newLayersByCanvas, activeLayerByCanvas: newActiveLayerByCanvas };
          }, false, 'deleteLayer');
        },

        updateLayer: (canvasId, layerId, updates) => {
          set((state) => {
            const newLayersByCanvas = new Map(state.layersByCanvas);
            const layers = newLayersByCanvas.get(canvasId) || [];
            newLayersByCanvas.set(
              canvasId,
              layers.map(l => l.id === layerId ? { ...l, ...updates } : l)
            );
            return { layersByCanvas: newLayersByCanvas };
          }, false, 'updateLayer');
        },

        reorderLayers: (canvasId, layerIds) => {
          set((state) => {
            const newLayersByCanvas = new Map(state.layersByCanvas);
            const layers = newLayersByCanvas.get(canvasId) || [];

            // Create a map of layer ID to layer
            const layerMap = new Map(layers.map(l => [l.id, l]));

            // Reorder based on the provided IDs
            const reorderedLayers = layerIds
              .map((id, index) => {
                const layer = layerMap.get(id);
                return layer ? { ...layer, order: index } : null;
              })
              .filter((l): l is CanvasLayer => l !== null);

            newLayersByCanvas.set(canvasId, reorderedLayers);
            return { layersByCanvas: newLayersByCanvas };
          }, false, 'reorderLayers');
        },

        getLayers: (canvasId) => {
          const layers = get().layersByCanvas.get(canvasId) || [];
          return [...layers].sort((a, b) => a.order - b.order);
        },

        getLayer: (canvasId, layerId) => {
          const layers = get().layersByCanvas.get(canvasId) || [];
          return layers.find(l => l.id === layerId);
        },

        setActiveLayer: (canvasId, layerId) => {
          set((state) => {
            const newActiveLayerByCanvas = new Map(state.activeLayerByCanvas);
            newActiveLayerByCanvas.set(canvasId, layerId);
            return { activeLayerByCanvas: newActiveLayerByCanvas };
          }, false, 'setActiveLayer');
        },

        getActiveLayer: (canvasId) => {
          const activeLayerId = get().activeLayerByCanvas.get(canvasId);
          if (!activeLayerId) {
            const layers = get().getLayers(canvasId);
            return layers[0];
          }
          return get().getLayer(canvasId, activeLayerId);
        },

        toggleLayerVisibility: (canvasId, layerId) => {
          const layer = get().getLayer(canvasId, layerId);
          if (layer) {
            get().updateLayer(canvasId, layerId, { visible: !layer.visible });
          }
        },

        toggleLayerLock: (canvasId, layerId) => {
          const layer = get().getLayer(canvasId, layerId);
          if (layer) {
            get().updateLayer(canvasId, layerId, { locked: !layer.locked });
          }
        },

        // === Group Management ===

        createGroup: (canvasId, entityRefs, name) => {
          const groups = get().groupsByCanvas.get(canvasId) || [];
          const zIndex = get().getNextZIndex(canvasId);

          // Extract widget IDs (for compatibility with WidgetGroup type)
          const widgetIds = entityRefs
            .filter(ref => ref.type === 'widget')
            .map(ref => ref.id);

          const newGroup: WidgetGroup = {
            id: generateId(),
            canvasId,
            name: name || `Group ${groups.length + 1}`,
            widgetIds,
            zIndex,
            collapsed: false,
          };

          set((state) => {
            const newGroupsByCanvas = new Map(state.groupsByCanvas);
            const existingGroups = newGroupsByCanvas.get(canvasId) || [];
            newGroupsByCanvas.set(canvasId, [...existingGroups, newGroup]);
            return { groupsByCanvas: newGroupsByCanvas };
          }, false, 'createGroup');

          return newGroup;
        },

        deleteGroup: (canvasId, groupId) => {
          set((state) => {
            const newGroupsByCanvas = new Map(state.groupsByCanvas);
            const groups = newGroupsByCanvas.get(canvasId) || [];
            newGroupsByCanvas.set(canvasId, groups.filter(g => g.id !== groupId));
            return { groupsByCanvas: newGroupsByCanvas };
          }, false, 'deleteGroup');
        },

        updateGroup: (canvasId, groupId, updates) => {
          set((state) => {
            const newGroupsByCanvas = new Map(state.groupsByCanvas);
            const groups = newGroupsByCanvas.get(canvasId) || [];
            newGroupsByCanvas.set(
              canvasId,
              groups.map(g => g.id === groupId ? { ...g, ...updates } : g)
            );
            return { groupsByCanvas: newGroupsByCanvas };
          }, false, 'updateGroup');
        },

        addToGroup: (canvasId, groupId, entityRefs) => {
          const group = get().getGroup(canvasId, groupId);
          if (!group) return;

          const newWidgetIds = entityRefs
            .filter(ref => ref.type === 'widget')
            .map(ref => ref.id);

          const mergedWidgetIds = [...new Set([...group.widgetIds, ...newWidgetIds])];
          get().updateGroup(canvasId, groupId, { widgetIds: mergedWidgetIds });
        },

        removeFromGroup: (canvasId, groupId, entityRefs) => {
          const group = get().getGroup(canvasId, groupId);
          if (!group) return;

          const idsToRemove = new Set(entityRefs.map(ref => ref.id));
          const newWidgetIds = group.widgetIds.filter(id => !idsToRemove.has(id));

          if (newWidgetIds.length === 0) {
            // Delete empty group
            get().deleteGroup(canvasId, groupId);
          } else {
            get().updateGroup(canvasId, groupId, { widgetIds: newWidgetIds });
          }
        },

        getGroups: (canvasId) => {
          return get().groupsByCanvas.get(canvasId) || [];
        },

        getGroup: (canvasId, groupId) => {
          const groups = get().groupsByCanvas.get(canvasId) || [];
          return groups.find(g => g.id === groupId);
        },

        updateGroupBounds: (canvasId, groupId, bounds) => {
          get().updateGroup(canvasId, groupId, { bounds });
        },

        toggleGroupCollapsed: (canvasId, groupId) => {
          const group = get().getGroup(canvasId, groupId);
          if (group) {
            get().updateGroup(canvasId, groupId, { collapsed: !group.collapsed });
          }
        },

        ungroup: (canvasId, groupId) => {
          const group = get().getGroup(canvasId, groupId);
          if (!group) return [];

          const entityRefs: EntityRef[] = group.widgetIds.map(id => ({
            id,
            type: 'widget' as const,
          }));

          get().deleteGroup(canvasId, groupId);
          return entityRefs;
        },

        // === Z-Order Management ===

        getNextZIndex: (canvasId) => {
          const current = get().nextZIndexByCanvas.get(canvasId) || 1;
          set((state) => {
            const newNextZIndexByCanvas = new Map(state.nextZIndexByCanvas);
            newNextZIndexByCanvas.set(canvasId, current + 1);
            return { nextZIndexByCanvas: newNextZIndexByCanvas };
          }, false, 'getNextZIndex');
          return current;
        },

        bringToFront: (canvasId, entityRef) => {
          const zIndex = get().getNextZIndex(canvasId);
          // The actual z-index update should be done by the entity's store
          // This just returns the new z-index
          return zIndex;
        },

        sendToBack: (canvasId, entityRef) => {
          // Return z-index 0 for sending to back
          // The actual z-index update and reordering should be done by the entity's store
          return 0;
        },

        bringForward: (canvasId, entityRef, allEntities) => {
          // Z-order manipulation is complex and requires access to all entities
          // This is a placeholder - actual implementation depends on entity stores
        },

        sendBackward: (canvasId, entityRef, allEntities) => {
          // Z-order manipulation is complex and requires access to all entities
          // This is a placeholder - actual implementation depends on entity stores
        },

        // === Utilities ===

        initializeCanvas: (canvasId) => {
          const layers = get().layersByCanvas.get(canvasId);
          if (!layers || layers.length === 0) {
            const defaultLayer = createDefaultLayer(canvasId);
            set((state) => {
              const newLayersByCanvas = new Map(state.layersByCanvas);
              newLayersByCanvas.set(canvasId, [defaultLayer]);

              const newActiveLayerByCanvas = new Map(state.activeLayerByCanvas);
              newActiveLayerByCanvas.set(canvasId, defaultLayer.id);

              const newNextZIndexByCanvas = new Map(state.nextZIndexByCanvas);
              if (!newNextZIndexByCanvas.has(canvasId)) {
                newNextZIndexByCanvas.set(canvasId, 1);
              }

              return {
                layersByCanvas: newLayersByCanvas,
                activeLayerByCanvas: newActiveLayerByCanvas,
                nextZIndexByCanvas: newNextZIndexByCanvas,
              };
            }, false, 'initializeCanvas');
          }
        },

        reset: () => {
          set(initialState, false, 'reset');
        },
      }),
      {
        name: 'layer-store',
        storage: createJSONStorage(() => localStorage, {
          reviver: (key, value: any) => {
            if (value && typeof value === 'object' && value.__type === 'Map') {
              return new Map(value.entries);
            }
            return value;
          },
          replacer: (key, value) => {
            if (value instanceof Map) {
              return { __type: 'Map', entries: Array.from(value.entries()) };
            }
            return value;
          },
        }),
        partialize: (state) => ({
          layersByCanvas: state.layersByCanvas,
          groupsByCanvas: state.groupsByCanvas,
          nextZIndexByCanvas: state.nextZIndexByCanvas,
          activeLayerByCanvas: state.activeLayerByCanvas,
        }),
      }
    ),
    {
      name: 'LayerStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==================
// Selector Hooks
// ==================

/** Get layers for current canvas */
export const useCanvasLayers = (canvasId: string) =>
  useLayerStore((state) => state.getLayers(canvasId));

/** Get groups for current canvas */
export const useCanvasGroups = (canvasId: string) =>
  useLayerStore((state) => state.getGroups(canvasId));

/** Get active layer */
export const useActiveLayer = (canvasId: string) =>
  useLayerStore((state) => state.getActiveLayer(canvasId));

/** Get a specific layer */
export const useLayer = (canvasId: string, layerId: string) =>
  useLayerStore((state) => state.getLayer(canvasId, layerId));

/** Get a specific group */
export const useGroup = (canvasId: string, groupId: string) =>
  useLayerStore((state) => state.getGroup(canvasId, groupId));

/** Get layer actions */
export const useLayerActions = () =>
  useLayerStore((state) => ({
    createLayer: state.createLayer,
    deleteLayer: state.deleteLayer,
    updateLayer: state.updateLayer,
    reorderLayers: state.reorderLayers,
    setActiveLayer: state.setActiveLayer,
    toggleLayerVisibility: state.toggleLayerVisibility,
    toggleLayerLock: state.toggleLayerLock,
    initializeCanvas: state.initializeCanvas,
  }));

/** Get group actions */
export const useGroupActions = () =>
  useLayerStore((state) => ({
    createGroup: state.createGroup,
    deleteGroup: state.deleteGroup,
    updateGroup: state.updateGroup,
    addToGroup: state.addToGroup,
    removeFromGroup: state.removeFromGroup,
    toggleGroupCollapsed: state.toggleGroupCollapsed,
    ungroup: state.ungroup,
    updateGroupBounds: state.updateGroupBounds,
  }));

/** Get z-order actions */
export const useZOrderActions = () =>
  useLayerStore((state) => ({
    getNextZIndex: state.getNextZIndex,
    bringToFront: state.bringToFront,
    sendToBack: state.sendToBack,
    bringForward: state.bringForward,
    sendBackward: state.sendBackward,
  }));

export default useLayerStore;
