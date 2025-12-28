/**
 * StickerNest v2 - Canvas Entity Store (Zustand)
 *
 * Manages canvas entities (shapes, text, images) that render directly on the canvas.
 * Provides CRUD operations, selection state, and z-ordering.
 *
 * Note: This store manages CanvasEntity objects which are renderable.
 * For pure data entities, see entityStore.ts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CanvasEntity,
  CanvasEntityType,
  CanvasVectorEntity,
  CanvasTextEntity,
  CanvasImageEntity,
  Canvas3DEntity,
} from '../types/canvasEntity';
import {
  createCanvasVectorEntity,
  createCanvasTextEntity,
  createCanvasImageEntity,
  createCanvas3DEntity,
  cloneCanvasEntity,
} from '../types/canvasEntity';

// ============================================================================
// Types
// ============================================================================

/** Selection mode */
export type EntitySelectionMode = 'single' | 'multi';

/** Selection state */
export interface EntitySelectionState {
  /** Set of selected entity IDs */
  selectedIds: Set<string>;
  /** Primary selected entity (for multi-select, the last clicked) */
  primaryId: string | null;
  /** Currently hovered entity ID */
  hoveredId: string | null;
  /** Selection mode */
  mode: EntitySelectionMode;
}

/** Clipboard state for copy/paste */
export interface EntityClipboard {
  /** Copied entity data */
  entities: CanvasEntity[];
  /** Whether this is a cut operation */
  isCut: boolean;
}

// ============================================================================
// Store State
// ============================================================================

export interface CanvasEntityState {
  /** Map of entity ID to entity */
  entities: Map<string, CanvasEntity>;
  /** Selection state */
  selection: EntitySelectionState;
  /** Clipboard for copy/paste */
  clipboard: EntityClipboard | null;
  /** Next z-index to assign */
  nextZIndex: number;
  /** Canvas ID this store belongs to */
  canvasId: string;
}

// ============================================================================
// Store Actions
// ============================================================================

export interface CanvasEntityActions {
  // === CRUD ===
  /** Add a new entity */
  addEntity: (entity: CanvasEntity) => void;
  /** Add multiple entities */
  addEntities: (entities: CanvasEntity[]) => void;
  /** Update an entity */
  updateEntity: (id: string, updates: Partial<CanvasEntity>) => void;
  /** Update multiple entities */
  updateEntities: (updates: Array<{ id: string; updates: Partial<CanvasEntity> }>) => void;
  /** Remove an entity */
  removeEntity: (id: string) => void;
  /** Remove multiple entities */
  removeEntities: (ids: string[]) => void;
  /** Clear all entities */
  clearEntities: () => void;
  /** Get entity by ID */
  getEntity: (id: string) => CanvasEntity | undefined;

  // === Factory Methods ===
  /** Create and add a vector entity */
  createVector: (overrides?: Partial<Omit<CanvasVectorEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>>) => CanvasVectorEntity;
  /** Create and add a text entity */
  createText: (overrides?: Partial<Omit<CanvasTextEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>>) => CanvasTextEntity;
  /** Create and add an image entity */
  createImage: (src: string, overrides?: Partial<Omit<CanvasImageEntity, 'type' | 'id' | 'src' | 'createdAt' | 'updatedAt'>>) => CanvasImageEntity;
  /** Create and add a 3D entity */
  create3D: (overrides?: Partial<Omit<Canvas3DEntity, 'type' | 'id' | 'createdAt' | 'updatedAt'>>) => Canvas3DEntity;

  // === Selection ===
  /** Select an entity */
  selectEntity: (id: string, additive?: boolean) => void;
  /** Select multiple entities */
  selectEntities: (ids: string[], replace?: boolean) => void;
  /** Deselect an entity */
  deselectEntity: (id: string) => void;
  /** Deselect all entities */
  deselectAll: () => void;
  /** Toggle entity selection */
  toggleSelection: (id: string) => void;
  /** Set hovered entity */
  setHoveredEntity: (id: string | null) => void;
  /** Select all entities */
  selectAll: () => void;

  // === Z-Ordering ===
  /** Bring entity to front */
  bringToFront: (id: string) => void;
  /** Send entity to back */
  sendToBack: (id: string) => void;
  /** Move entity up one layer */
  moveUp: (id: string) => void;
  /** Move entity down one layer */
  moveDown: (id: string) => void;

  // === Clipboard ===
  /** Copy selected entities */
  copySelected: () => void;
  /** Cut selected entities */
  cutSelected: () => void;
  /** Paste from clipboard */
  paste: (offset?: { x: number; y: number }) => void;
  /** Duplicate selected entities */
  duplicateSelected: () => void;

  // === Bulk Operations ===
  /** Delete selected entities */
  deleteSelected: () => void;
  /** Lock selected entities */
  lockSelected: () => void;
  /** Unlock selected entities */
  unlockSelected: () => void;
  /** Hide selected entities */
  hideSelected: () => void;
  /** Show selected entities */
  showSelected: () => void;

  // === State ===
  /** Set canvas ID */
  setCanvasId: (canvasId: string) => void;
  /** Reset store to initial state */
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialSelection: EntitySelectionState = {
  selectedIds: new Set(),
  primaryId: null,
  hoveredId: null,
  mode: 'single',
};

const initialState: CanvasEntityState = {
  entities: new Map(),
  selection: initialSelection,
  clipboard: null,
  nextZIndex: 1,
  canvasId: 'default',
};

// ============================================================================
// Custom Storage for Maps and Sets
// ============================================================================

const customStorage = createJSONStorage(() => localStorage, {
  reviver: (_key: string, value: unknown) => {
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (obj.__type === 'Map') {
        return new Map(obj.entries as Array<[string, unknown]>);
      }
      if (obj.__type === 'Set') {
        return new Set(obj.values as unknown[]);
      }
    }
    return value;
  },
  replacer: (_key: string, value: unknown) => {
    if (value instanceof Map) {
      return { __type: 'Map', entries: Array.from(value.entries()) };
    }
    if (value instanceof Set) {
      return { __type: 'Set', values: Array.from(value.values()) };
    }
    return value;
  },
});

// ============================================================================
// Store Creation
// ============================================================================

export const useCanvasEntityStore = create<CanvasEntityState & CanvasEntityActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // === CRUD ===
      addEntity: (entity) => {
        set((state) => {
          const entities = new Map(state.entities);
          // Assign z-index if not set
          if (entity.zIndex === 0) {
            entity = { ...entity, zIndex: state.nextZIndex };
          }
          entities.set(entity.id, entity);
          return {
            entities,
            nextZIndex: Math.max(state.nextZIndex, entity.zIndex + 1),
          };
        });
      },

      addEntities: (newEntities) => {
        set((state) => {
          const entities = new Map(state.entities);
          let maxZ = state.nextZIndex;
          newEntities.forEach((entity) => {
            if (entity.zIndex === 0) {
              entity = { ...entity, zIndex: maxZ++ };
            }
            entities.set(entity.id, entity);
            maxZ = Math.max(maxZ, entity.zIndex + 1);
          });
          return { entities, nextZIndex: maxZ };
        });
      },

      updateEntity: (id, updates) => {
        set((state) => {
          const entity = state.entities.get(id);
          if (!entity) return state;

          const entities = new Map(state.entities);
          entities.set(id, {
            ...entity,
            ...updates,
            updatedAt: Date.now(),
          } as CanvasEntity);
          return { entities };
        });
      },

      updateEntities: (updates) => {
        set((state) => {
          const entities = new Map(state.entities);
          const now = Date.now();
          updates.forEach(({ id, updates: entityUpdates }) => {
            const entity = entities.get(id);
            if (entity) {
              entities.set(id, {
                ...entity,
                ...entityUpdates,
                updatedAt: now,
              } as CanvasEntity);
            }
          });
          return { entities };
        });
      },

      removeEntity: (id) => {
        set((state) => {
          const entities = new Map(state.entities);
          entities.delete(id);

          // Also remove from selection
          const selectedIds = new Set(state.selection.selectedIds);
          selectedIds.delete(id);

          return {
            entities,
            selection: {
              ...state.selection,
              selectedIds,
              primaryId: state.selection.primaryId === id ? null : state.selection.primaryId,
              hoveredId: state.selection.hoveredId === id ? null : state.selection.hoveredId,
            },
          };
        });
      },

      removeEntities: (ids) => {
        set((state) => {
          const entities = new Map(state.entities);
          const selectedIds = new Set(state.selection.selectedIds);
          ids.forEach((id) => {
            entities.delete(id);
            selectedIds.delete(id);
          });

          return {
            entities,
            selection: {
              ...state.selection,
              selectedIds,
              primaryId: ids.includes(state.selection.primaryId || '') ? null : state.selection.primaryId,
              hoveredId: ids.includes(state.selection.hoveredId || '') ? null : state.selection.hoveredId,
            },
          };
        });
      },

      clearEntities: () => {
        set({
          entities: new Map(),
          selection: initialSelection,
          nextZIndex: 1,
        });
      },

      getEntity: (id) => get().entities.get(id),

      // === Factory Methods ===
      createVector: (overrides) => {
        const entity = createCanvasVectorEntity({
          ...overrides,
          zIndex: get().nextZIndex,
        });
        get().addEntity(entity);
        return entity;
      },

      createText: (overrides) => {
        const entity = createCanvasTextEntity({
          ...overrides,
          zIndex: get().nextZIndex,
        });
        get().addEntity(entity);
        return entity;
      },

      createImage: (src, overrides) => {
        const entity = createCanvasImageEntity(src, {
          ...overrides,
          zIndex: get().nextZIndex,
        });
        get().addEntity(entity);
        return entity;
      },

      create3D: (overrides) => {
        const entity = createCanvas3DEntity({
          ...overrides,
          zIndex: get().nextZIndex,
        });
        get().addEntity(entity);
        return entity;
      },

      // === Selection ===
      selectEntity: (id, additive = false) => {
        set((state) => {
          if (!state.entities.has(id)) return state;

          const selectedIds = additive ? new Set(state.selection.selectedIds) : new Set<string>();
          selectedIds.add(id);

          return {
            selection: {
              ...state.selection,
              selectedIds,
              primaryId: id,
              mode: selectedIds.size > 1 ? 'multi' : 'single',
            },
          };
        });
      },

      selectEntities: (ids, replace = true) => {
        set((state) => {
          const validIds = ids.filter((id) => state.entities.has(id));
          if (validIds.length === 0) return state;

          const selectedIds = replace ? new Set(validIds) : new Set([...state.selection.selectedIds, ...validIds]);

          return {
            selection: {
              ...state.selection,
              selectedIds,
              primaryId: validIds[validIds.length - 1],
              mode: selectedIds.size > 1 ? 'multi' : 'single',
            },
          };
        });
      },

      deselectEntity: (id) => {
        set((state) => {
          const selectedIds = new Set(state.selection.selectedIds);
          selectedIds.delete(id);

          return {
            selection: {
              ...state.selection,
              selectedIds,
              primaryId: state.selection.primaryId === id
                ? (selectedIds.size > 0 ? Array.from(selectedIds)[0] : null)
                : state.selection.primaryId,
              mode: selectedIds.size > 1 ? 'multi' : 'single',
            },
          };
        });
      },

      deselectAll: () => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedIds: new Set(),
            primaryId: null,
            mode: 'single',
          },
        }));
      },

      toggleSelection: (id) => {
        const { selection } = get();
        if (selection.selectedIds.has(id)) {
          get().deselectEntity(id);
        } else {
          get().selectEntity(id, true);
        }
      },

      setHoveredEntity: (id) => {
        set((state) => ({
          selection: { ...state.selection, hoveredId: id },
        }));
      },

      selectAll: () => {
        set((state) => {
          const ids = Array.from(state.entities.keys());
          return {
            selection: {
              ...state.selection,
              selectedIds: new Set(ids),
              primaryId: ids.length > 0 ? ids[ids.length - 1] : null,
              mode: ids.length > 1 ? 'multi' : 'single',
            },
          };
        });
      },

      // === Z-Ordering ===
      bringToFront: (id) => {
        set((state) => {
          const entity = state.entities.get(id);
          if (!entity) return state;

          const entities = new Map(state.entities);
          entities.set(id, { ...entity, zIndex: state.nextZIndex, updatedAt: Date.now() } as CanvasEntity);

          return { entities, nextZIndex: state.nextZIndex + 1 };
        });
      },

      sendToBack: (id) => {
        set((state) => {
          const entity = state.entities.get(id);
          if (!entity) return state;

          // Shift all other entities up by 1
          const entities = new Map<string, CanvasEntity>();
          state.entities.forEach((e, eId) => {
            if (eId === id) {
              entities.set(eId, { ...e, zIndex: 0, updatedAt: Date.now() } as CanvasEntity);
            } else {
              entities.set(eId, { ...e, zIndex: e.zIndex + 1 } as CanvasEntity);
            }
          });

          return { entities, nextZIndex: state.nextZIndex + 1 };
        });
      },

      moveUp: (id) => {
        set((state) => {
          const entity = state.entities.get(id);
          if (!entity) return state;

          // Find entity directly above
          const sortedEntities = Array.from(state.entities.values())
            .sort((a, b) => a.zIndex - b.zIndex);
          const currentIndex = sortedEntities.findIndex((e) => e.id === id);
          if (currentIndex === sortedEntities.length - 1) return state; // Already at top

          const aboveEntity = sortedEntities[currentIndex + 1];

          // Swap z-indices
          const entities = new Map(state.entities);
          entities.set(id, { ...entity, zIndex: aboveEntity.zIndex, updatedAt: Date.now() } as CanvasEntity);
          entities.set(aboveEntity.id, { ...aboveEntity, zIndex: entity.zIndex, updatedAt: Date.now() } as CanvasEntity);

          return { entities };
        });
      },

      moveDown: (id) => {
        set((state) => {
          const entity = state.entities.get(id);
          if (!entity) return state;

          // Find entity directly below
          const sortedEntities = Array.from(state.entities.values())
            .sort((a, b) => a.zIndex - b.zIndex);
          const currentIndex = sortedEntities.findIndex((e) => e.id === id);
          if (currentIndex === 0) return state; // Already at bottom

          const belowEntity = sortedEntities[currentIndex - 1];

          // Swap z-indices
          const entities = new Map(state.entities);
          entities.set(id, { ...entity, zIndex: belowEntity.zIndex, updatedAt: Date.now() } as CanvasEntity);
          entities.set(belowEntity.id, { ...belowEntity, zIndex: entity.zIndex, updatedAt: Date.now() } as CanvasEntity);

          return { entities };
        });
      },

      // === Clipboard ===
      copySelected: () => {
        const { selection, entities } = get();
        const copiedEntities = Array.from(selection.selectedIds)
          .map((id) => entities.get(id))
          .filter((e): e is CanvasEntity => e !== undefined);

        if (copiedEntities.length > 0) {
          set({ clipboard: { entities: copiedEntities, isCut: false } });
        }
      },

      cutSelected: () => {
        get().copySelected();
        set((state) => ({
          clipboard: state.clipboard ? { ...state.clipboard, isCut: true } : null,
        }));
      },

      paste: (offset = { x: 20, y: 20 }) => {
        const { clipboard } = get();
        if (!clipboard || clipboard.entities.length === 0) return;

        const newEntities = clipboard.entities.map((entity) =>
          cloneCanvasEntity(entity, offset)
        );

        get().addEntities(newEntities);
        get().selectEntities(newEntities.map((e) => e.id));

        // If it was a cut, delete originals and clear clipboard
        if (clipboard.isCut) {
          get().removeEntities(clipboard.entities.map((e) => e.id));
          set({ clipboard: null });
        }
      },

      duplicateSelected: () => {
        get().copySelected();
        get().paste({ x: 20, y: 20 });
      },

      // === Bulk Operations ===
      deleteSelected: () => {
        const { selection } = get();
        get().removeEntities(Array.from(selection.selectedIds));
      },

      lockSelected: () => {
        const { selection } = get();
        get().updateEntities(
          Array.from(selection.selectedIds).map((id) => ({ id, updates: { locked: true } }))
        );
      },

      unlockSelected: () => {
        const { selection } = get();
        get().updateEntities(
          Array.from(selection.selectedIds).map((id) => ({ id, updates: { locked: false } }))
        );
      },

      hideSelected: () => {
        const { selection } = get();
        get().updateEntities(
          Array.from(selection.selectedIds).map((id) => ({ id, updates: { visible: false } }))
        );
      },

      showSelected: () => {
        const { selection } = get();
        get().updateEntities(
          Array.from(selection.selectedIds).map((id) => ({ id, updates: { visible: true } }))
        );
      },

      // === State ===
      setCanvasId: (canvasId) => set({ canvasId }),

      reset: () => set(initialState),
    }),
    {
      name: 'stickernest-canvas-entities',
      storage: customStorage,
      partialize: (state) => ({
        entities: state.entities,
        nextZIndex: state.nextZIndex,
        canvasId: state.canvasId,
      }),
    }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

/** Get entities Map (stable reference) */
export const useCanvasEntitiesMap = () =>
  useCanvasEntityStore((state) => state.entities);

/** Get all entities as array (sorted by z-index) - use with useMemo in components */
export const useCanvasEntities = () => {
  const entities = useCanvasEntityStore((state) => state.entities);
  // Note: This creates a new array each time, wrap usage in useMemo if needed
  return Array.from(entities.values()).sort((a, b) => a.zIndex - b.zIndex);
};

/** Get entities of a specific type */
export const useCanvasEntitiesByType = <T extends CanvasEntity>(type: CanvasEntityType) => {
  const entities = useCanvasEntityStore((state) => state.entities);
  return Array.from(entities.values())
    .filter((e): e is T => e.type === type)
    .sort((a, b) => a.zIndex - b.zIndex);
};

/** Get selected entity IDs */
export const useSelectedEntityIds = () =>
  useCanvasEntityStore((state) => state.selection.selectedIds);

/** Get selected entities */
export const useSelectedEntities = () => {
  const entities = useCanvasEntityStore((state) => state.entities);
  const selectedIds = useCanvasEntityStore((state) => state.selection.selectedIds);
  return Array.from(selectedIds)
    .map((id) => entities.get(id))
    .filter((e): e is CanvasEntity => e !== undefined);
};

/** Get primary selected entity */
export const usePrimarySelectedEntity = () =>
  useCanvasEntityStore((state) =>
    state.selection.primaryId ? state.entities.get(state.selection.primaryId) : undefined
  );

/** Get hovered entity */
export const useHoveredEntity = () =>
  useCanvasEntityStore((state) =>
    state.selection.hoveredId ? state.entities.get(state.selection.hoveredId) : undefined
  );

/** Check if entity is selected */
export const useIsEntitySelected = (id: string) =>
  useCanvasEntityStore((state) => state.selection.selectedIds.has(id));

/** Get selection count */
export const useSelectionCount = () =>
  useCanvasEntityStore((state) => state.selection.selectedIds.size);

/** Check if any entities are selected */
export const useHasSelection = () =>
  useCanvasEntityStore((state) => state.selection.selectedIds.size > 0);

/** Get entity actions */
export const useCanvasEntityActions = () =>
  useCanvasEntityStore((state) => ({
    addEntity: state.addEntity,
    updateEntity: state.updateEntity,
    removeEntity: state.removeEntity,
    selectEntity: state.selectEntity,
    deselectAll: state.deselectAll,
    bringToFront: state.bringToFront,
    sendToBack: state.sendToBack,
    deleteSelected: state.deleteSelected,
    duplicateSelected: state.duplicateSelected,
    createVector: state.createVector,
    createText: state.createText,
    createImage: state.createImage,
  }));

export default useCanvasEntityStore;
