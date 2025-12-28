/**
 * StickerNest v2 - Sticker Store (Zustand)
 * State management for stickers, dock zones, and docked widgets
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import type {
  StickerInstance,
  DockZone,
  DockedWidgetState,
  StickerLibraryItem,
  WidgetPosition,
  DockConfiguration,
  DockZoneTemplate,
} from '../types/domain';

// ==================
// Types
// ==================

export interface StickerState {
  // Stickers on canvas
  stickers: Map<string, StickerInstance>;

  // Dock zones
  dockZones: Map<string, DockZone>;

  // Docked widget states
  dockedWidgets: Map<string, DockedWidgetState>;

  // Saved dock configurations (reusable across canvases/projects)
  savedDockConfigs: DockConfiguration[];

  // Sticker library (user's saved stickers)
  stickerLibrary: StickerLibraryItem[];

  // Selection
  selectedStickerId: string | null;
  selectedDockZoneId: string | null;

  // UI state
  isStickerLibraryOpen: boolean;
  isDockPanelOpen: boolean;

  // Drag state
  draggedStickerId: string | null;
  draggedWidgetId: string | null;
  dropTargetZoneId: string | null;
}

export interface StickerActions {
  // Sticker CRUD
  addSticker: (sticker: StickerInstance) => void;
  updateSticker: (id: string, updates: Partial<StickerInstance>) => void;
  removeSticker: (id: string) => void;
  getSticker: (id: string) => StickerInstance | undefined;
  getStickers: () => StickerInstance[];
  getStickersByCanvas: (canvasId: string) => StickerInstance[];

  // Sticker position/transform
  moveSticker: (id: string, position: WidgetPosition) => void;
  resizeSticker: (id: string, width: number, height: number) => void;
  rotateSticker: (id: string, rotation: number) => void;

  // Sticker-widget association
  linkWidgetToSticker: (stickerId: string, widgetDefId: string) => void;
  unlinkWidgetFromSticker: (stickerId: string) => void;
  setWidgetVisible: (stickerId: string, visible: boolean) => void;
  setLinkedWidgetInstance: (stickerId: string, widgetInstanceId: string | undefined) => void;

  // Dock Zone CRUD
  addDockZone: (zone: DockZone) => void;
  updateDockZone: (id: string, updates: Partial<DockZone>) => void;
  removeDockZone: (id: string) => void;
  getDockZone: (id: string) => DockZone | undefined;
  getDockZones: () => DockZone[];
  getDockZonesByCanvas: (canvasId: string) => DockZone[];

  // Docking operations
  dockWidget: (widgetId: string, zoneId: string, position?: number, originalState?: { position: { x: number; y: number }; size: { width: number; height: number } }) => void;
  undockWidget: (widgetId: string) => void;
  moveDockWidget: (widgetId: string, newZoneId: string, newPosition?: number) => void;
  getDockedWidgetState: (widgetId: string) => DockedWidgetState | undefined;
  getWidgetsInZone: (zoneId: string) => DockedWidgetState[];
  isWidgetDocked: (widgetId: string) => boolean;

  // Sticker Library
  addToLibrary: (item: StickerLibraryItem) => void;
  removeFromLibrary: (id: string) => void;
  getLibraryItems: () => StickerLibraryItem[];
  getLibraryItemsByCategory: (category: string) => StickerLibraryItem[];

  // Selection
  selectSticker: (id: string | null) => void;
  selectDockZone: (id: string | null) => void;

  // UI
  setStickerLibraryOpen: (open: boolean) => void;
  setDockPanelOpen: (open: boolean) => void;

  // Drag & Drop
  setDraggedSticker: (id: string | null) => void;
  setDraggedWidget: (id: string | null) => void;
  setDropTargetZone: (id: string | null) => void;

  // Bulk operations
  clearStickers: (canvasId: string) => void;
  clearDockZones: (canvasId: string) => void;

  // Serialization
  exportStickers: (canvasId: string) => { stickers: StickerInstance[]; dockZones: DockZone[]; dockedWidgets: DockedWidgetState[] };
  importStickers: (data: { stickers: StickerInstance[]; dockZones: DockZone[]; dockedWidgets: DockedWidgetState[] }) => void;

  // Dock Configuration Management
  saveDockConfig: (name: string, canvasId: string, description?: string, tags?: string[]) => DockConfiguration;
  loadDockConfig: (configId: string, canvasId: string, canvasBounds: { width: number; height: number }) => void;
  updateDockConfig: (configId: string, updates: Partial<Omit<DockConfiguration, 'id' | 'createdAt'>>) => void;
  deleteDockConfig: (configId: string) => void;
  getSavedDockConfigs: () => DockConfiguration[];
  toggleDockConfigFavorite: (configId: string) => void;

  // Dock Zone Tab Management
  setTabLabel: (zoneId: string, tabIndex: number, label: string) => void;
  setActiveTab: (zoneId: string, tabIndex: number) => void;
  renameDockZone: (zoneId: string, name: string) => void;

  // Multiple Dock Zones
  createDockZone: (canvasId: string, name: string, options?: Partial<Omit<DockZone, 'id' | 'canvasId' | 'name' | 'dockedWidgetIds'>>) => DockZone;
  duplicateDockZone: (zoneId: string) => DockZone | null;
}

// ==================
// Initial State
// ==================

const initialState: StickerState = {
  stickers: new Map(),
  dockZones: new Map(),
  dockedWidgets: new Map(),
  savedDockConfigs: [],
  stickerLibrary: [],
  selectedStickerId: null,
  selectedDockZoneId: null,
  isStickerLibraryOpen: false,
  isDockPanelOpen: false,
  draggedStickerId: null,
  draggedWidgetId: null,
  dropTargetZoneId: null,
};

// ==================
// Store
// ==================

/** Custom JSON reviver for Maps */
const jsonReviver = (_key: string, value: unknown) => {
  if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Map') {
    return new Map((value as { entries: [string, unknown][] }).entries);
  }
  return value;
};

/** Custom JSON replacer for Maps */
const jsonReplacer = (_key: string, value: unknown) => {
  if (value instanceof Map) {
    return { __type: 'Map', entries: Array.from(value.entries()) };
  }
  return value;
};

export const useStickerStore = create<StickerState & StickerActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================
        // Sticker CRUD
        // ==================

        addSticker: (sticker) => {
          set((state) => {
            const stickers = new Map(state.stickers);
            stickers.set(sticker.id, sticker);
            return { stickers };
          });
        },

        updateSticker: (id, updates) => {
          set((state) => {
            const stickers = new Map(state.stickers);
            const existing = stickers.get(id);
            if (existing) {
              stickers.set(id, { ...existing, ...updates });
            }
            return { stickers };
          });
        },

        removeSticker: (id) => {
          set((state) => {
            const stickers = new Map(state.stickers);
            stickers.delete(id);
            return { stickers };
          });
        },

        getSticker: (id) => get().stickers.get(id),

        getStickers: () => Array.from(get().stickers.values()),

        getStickersByCanvas: (canvasId) =>
          Array.from(get().stickers.values()).filter((s) => s.canvasId === canvasId),

        // ==================
        // Sticker Transform
        // ==================

        moveSticker: (id, position) => {
          get().updateSticker(id, { position });
        },

        resizeSticker: (id, width, height) => {
          get().updateSticker(id, { width, height });
        },

        rotateSticker: (id, rotation) => {
          get().updateSticker(id, { rotation });
        },

        // ==================
        // Sticker-Widget Association
        // ==================

        linkWidgetToSticker: (stickerId, widgetDefId) => {
          get().updateSticker(stickerId, {
            linkedWidgetDefId: widgetDefId,
            clickBehavior: 'toggle-widget',
          });
        },

        unlinkWidgetFromSticker: (stickerId) => {
          get().updateSticker(stickerId, {
            linkedWidgetDefId: undefined,
            linkedWidgetInstanceId: undefined,
            widgetVisible: false,
            clickBehavior: 'none',
          });
        },

        setWidgetVisible: (stickerId, visible) => {
          get().updateSticker(stickerId, { widgetVisible: visible });
        },

        setLinkedWidgetInstance: (stickerId, widgetInstanceId) => {
          get().updateSticker(stickerId, { linkedWidgetInstanceId: widgetInstanceId });
        },

        // ==================
        // Dock Zone CRUD
        // ==================

        addDockZone: (zone) => {
          set((state) => {
            const dockZones = new Map(state.dockZones);
            dockZones.set(zone.id, zone);
            return { dockZones };
          });
        },

        updateDockZone: (id, updates) => {
          set((state) => {
            const dockZones = new Map(state.dockZones);
            const existing = dockZones.get(id);
            if (existing) {
              dockZones.set(id, { ...existing, ...updates });
            }
            return { dockZones };
          });
        },

        removeDockZone: (id) => {
          set((state) => {
            const dockZones = new Map(state.dockZones);
            dockZones.delete(id);

            // Also remove docked widgets in this zone
            const dockedWidgets = new Map(state.dockedWidgets);
            for (const [widgetId, docked] of dockedWidgets) {
              if (docked.dockZoneId === id) {
                dockedWidgets.delete(widgetId);
              }
            }

            return { dockZones, dockedWidgets };
          });
        },

        getDockZone: (id) => get().dockZones.get(id),

        getDockZones: () => Array.from(get().dockZones.values()),

        getDockZonesByCanvas: (canvasId) =>
          Array.from(get().dockZones.values()).filter((z) => z.canvasId === canvasId),

        // ==================
        // Docking Operations
        // ==================

        dockWidget: (widgetId, zoneId, position, originalState) => {
          set((state) => {
            const zone = state.dockZones.get(zoneId);
            if (!zone) return state;

            // Check if widget is already docked
            if (state.dockedWidgets.has(widgetId)) {
              return state;
            }

            // Check if zone can accept more widgets
            if (zone.maxWidgets && zone.dockedWidgetIds.length >= zone.maxWidgets) {
              return state;
            }

            const dockPosition = position ?? zone.dockedWidgetIds.length;

            const dockedWidgets = new Map(state.dockedWidgets);
            dockedWidgets.set(widgetId, {
              widgetInstanceId: widgetId,
              dockZoneId: zoneId,
              dockPosition,
              originalPosition: originalState?.position || { x: 0, y: 0 },
              originalSize: originalState?.size || { width: 300, height: 200 },
            });

            // Update zone's docked widget list
            const dockZones = new Map(state.dockZones);
            const updatedZone = {
              ...zone,
              dockedWidgetIds: [...zone.dockedWidgetIds, widgetId],
            };
            dockZones.set(zoneId, updatedZone);

            // Clear the dragged widget
            return { dockedWidgets, dockZones, draggedWidgetId: null };
          });
        },

        undockWidget: (widgetId) => {
          set((state) => {
            const docked = state.dockedWidgets.get(widgetId);
            if (!docked) return state;

            const dockedWidgets = new Map(state.dockedWidgets);
            dockedWidgets.delete(widgetId);

            // Update zone's docked widget list
            const dockZones = new Map(state.dockZones);
            const zone = dockZones.get(docked.dockZoneId);
            if (zone) {
              dockZones.set(docked.dockZoneId, {
                ...zone,
                dockedWidgetIds: zone.dockedWidgetIds.filter((id) => id !== widgetId),
              });
            }

            return { dockedWidgets, dockZones };
          });
        },

        moveDockWidget: (widgetId, newZoneId, newPosition) => {
          const state = get();
          state.undockWidget(widgetId);
          state.dockWidget(widgetId, newZoneId, newPosition);
        },

        getDockedWidgetState: (widgetId) => get().dockedWidgets.get(widgetId),

        getWidgetsInZone: (zoneId) =>
          Array.from(get().dockedWidgets.values()).filter((d) => d.dockZoneId === zoneId),

        isWidgetDocked: (widgetId) => get().dockedWidgets.has(widgetId),

        // ==================
        // Sticker Library
        // ==================

        addToLibrary: (item) => {
          set((state) => ({
            stickerLibrary: [...state.stickerLibrary, item],
          }));
        },

        removeFromLibrary: (id) => {
          set((state) => ({
            stickerLibrary: state.stickerLibrary.filter((s) => s.id !== id),
          }));
        },

        getLibraryItems: () => get().stickerLibrary,

        getLibraryItemsByCategory: (category) =>
          get().stickerLibrary.filter((s) => s.category === category),

        // ==================
        // Selection
        // ==================

        selectSticker: (id) => set({ selectedStickerId: id }),
        selectDockZone: (id) => set({ selectedDockZoneId: id }),

        // ==================
        // UI
        // ==================

        setStickerLibraryOpen: (open) => set({ isStickerLibraryOpen: open }),
        setDockPanelOpen: (open) => set({ isDockPanelOpen: open }),

        // ==================
        // Drag & Drop
        // ==================

        setDraggedSticker: (id) => set({ draggedStickerId: id }),
        setDraggedWidget: (id) => set({ draggedWidgetId: id }),
        setDropTargetZone: (id) => set({ dropTargetZoneId: id }),

        // ==================
        // Bulk Operations
        // ==================

        clearStickers: (canvasId) => {
          set((state) => {
            const stickers = new Map(state.stickers);
            for (const [id, sticker] of stickers) {
              if (sticker.canvasId === canvasId) {
                stickers.delete(id);
              }
            }
            return { stickers };
          });
        },

        clearDockZones: (canvasId) => {
          set((state) => {
            const dockZones = new Map(state.dockZones);
            const dockedWidgets = new Map(state.dockedWidgets);

            for (const [id, zone] of dockZones) {
              if (zone.canvasId === canvasId) {
                // Remove docked widgets in this zone
                for (const widgetId of zone.dockedWidgetIds) {
                  dockedWidgets.delete(widgetId);
                }
                dockZones.delete(id);
              }
            }

            return { dockZones, dockedWidgets };
          });
        },

        // ==================
        // Serialization
        // ==================

        exportStickers: (canvasId) => {
          const state = get();
          const stickers = Array.from(state.stickers.values()).filter(
            (s) => s.canvasId === canvasId
          );
          const dockZones = Array.from(state.dockZones.values()).filter(
            (z) => z.canvasId === canvasId
          );
          const zoneIds = new Set(dockZones.map((z) => z.id));
          const dockedWidgets = Array.from(state.dockedWidgets.values()).filter(
            (d) => zoneIds.has(d.dockZoneId)
          );

          return { stickers, dockZones, dockedWidgets };
        },

        importStickers: (data) => {
          set((state) => {
            const stickers = new Map(state.stickers);
            const dockZones = new Map(state.dockZones);
            const dockedWidgets = new Map(state.dockedWidgets);

            data.stickers.forEach((s) => stickers.set(s.id, s));
            data.dockZones.forEach((z) => dockZones.set(z.id, z));
            data.dockedWidgets.forEach((d) => dockedWidgets.set(d.widgetInstanceId, d));

            return { stickers, dockZones, dockedWidgets };
          });
        },

        // ==================
        // Dock Configuration Management
        // ==================

        saveDockConfig: (name, canvasId, description, tags) => {
          const state = get();
          const zones = Array.from(state.dockZones.values()).filter(
            (z) => z.canvasId === canvasId
          );

          // Convert zones to templates (relative positioning)
          const zoneTemplates: DockZoneTemplate[] = zones.map((zone) => ({
            templateId: `template-${zone.id}`,
            type: zone.type,
            name: zone.name,
            relativeX: zone.position?.x || 0,
            relativeY: zone.position?.y || 0,
            width: zone.width,
            height: zone.height,
            layout: zone.layout,
            gridColumns: zone.gridColumns,
            gap: zone.gap,
            padding: zone.padding,
            tabLabels: zone.tabLabels,
            background: zone.background,
            border: zone.border,
            borderRadius: zone.borderRadius,
          }));

          const config: DockConfiguration = {
            id: `dock-config-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name,
            description,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            zones: zoneTemplates,
            tags,
            isFavorite: false,
          };

          set((state) => ({
            savedDockConfigs: [...state.savedDockConfigs, config],
          }));

          return config;
        },

        loadDockConfig: (configId, canvasId, canvasBounds) => {
          const state = get();
          const config = state.savedDockConfigs.find((c) => c.id === configId);
          if (!config) return;

          set((state) => {
            const dockZones = new Map(state.dockZones);

            // Create new zones from templates
            config.zones.forEach((template) => {
              const zoneId = `dock-${canvasId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
              const zone: DockZone = {
                id: zoneId,
                canvasId,
                type: template.type,
                name: template.name,
                position: {
                  x: template.relativeX,
                  y: template.relativeY,
                },
                width: template.width,
                height: template.height,
                dockedWidgetIds: [],
                layout: template.layout,
                gridColumns: template.gridColumns,
                gap: template.gap || 8,
                padding: template.padding || 8,
                tabLabels: template.tabLabels,
                acceptsDrops: true,
                zIndex: 1,
                visible: true,
                background: template.background,
                border: template.border,
                borderRadius: template.borderRadius,
              };
              dockZones.set(zoneId, zone);
            });

            return { dockZones };
          });
        },

        updateDockConfig: (configId, updates) => {
          set((state) => ({
            savedDockConfigs: state.savedDockConfigs.map((c) =>
              c.id === configId
                ? { ...c, ...updates, updatedAt: Date.now() }
                : c
            ),
          }));
        },

        deleteDockConfig: (configId) => {
          set((state) => ({
            savedDockConfigs: state.savedDockConfigs.filter((c) => c.id !== configId),
          }));
        },

        getSavedDockConfigs: () => get().savedDockConfigs,

        toggleDockConfigFavorite: (configId) => {
          set((state) => ({
            savedDockConfigs: state.savedDockConfigs.map((c) =>
              c.id === configId
                ? { ...c, isFavorite: !c.isFavorite, updatedAt: Date.now() }
                : c
            ),
          }));
        },

        // ==================
        // Dock Zone Tab Management
        // ==================

        setTabLabel: (zoneId, tabIndex, label) => {
          set((state) => {
            const zone = state.dockZones.get(zoneId);
            if (!zone) return state;

            const tabLabels = [...(zone.tabLabels || [])];
            // Extend array if needed
            while (tabLabels.length <= tabIndex) {
              tabLabels.push(`Tab ${tabLabels.length + 1}`);
            }
            tabLabels[tabIndex] = label;

            const dockZones = new Map(state.dockZones);
            dockZones.set(zoneId, { ...zone, tabLabels });
            return { dockZones };
          });
        },

        setActiveTab: (zoneId, tabIndex) => {
          set((state) => {
            const zone = state.dockZones.get(zoneId);
            if (!zone) return state;

            const dockZones = new Map(state.dockZones);
            dockZones.set(zoneId, { ...zone, activeTab: tabIndex });
            return { dockZones };
          });
        },

        renameDockZone: (zoneId, name) => {
          set((state) => {
            const zone = state.dockZones.get(zoneId);
            if (!zone) return state;

            const dockZones = new Map(state.dockZones);
            dockZones.set(zoneId, { ...zone, name });
            return { dockZones };
          });
        },

        // ==================
        // Multiple Dock Zones
        // ==================

        createDockZone: (canvasId, name, options) => {
          const zoneId = `dock-${canvasId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const zone: DockZone = {
            id: zoneId,
            canvasId,
            type: options?.type || 'sidebar',
            name,
            position: options?.position || { x: 20, y: 100 },
            width: options?.width || 300,
            height: options?.height || 400,
            dockedWidgetIds: [],
            layout: options?.layout || 'vertical',
            gridColumns: options?.gridColumns,
            gap: options?.gap || 8,
            padding: options?.padding || 8,
            acceptsDrops: options?.acceptsDrops ?? true,
            zIndex: options?.zIndex || 1,
            visible: options?.visible ?? true,
            tabLabels: options?.tabLabels,
            background: options?.background,
            border: options?.border,
            borderRadius: options?.borderRadius,
          };

          set((state) => {
            const dockZones = new Map(state.dockZones);
            dockZones.set(zoneId, zone);
            return { dockZones };
          });

          return zone;
        },

        duplicateDockZone: (zoneId) => {
          const state = get();
          const zone = state.dockZones.get(zoneId);
          if (!zone) return null;

          const newZoneId = `dock-${zone.canvasId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const newZone: DockZone = {
            ...zone,
            id: newZoneId,
            name: `${zone.name} (Copy)`,
            position: zone.position
              ? { x: zone.position.x + 30, y: zone.position.y + 30 }
              : undefined,
            dockedWidgetIds: [], // Don't copy docked widgets
          };

          set((state) => {
            const dockZones = new Map(state.dockZones);
            dockZones.set(newZoneId, newZone);
            return { dockZones };
          });

          return newZone;
        },
      }),
      {
        name: 'stickernest-stickers',
        storage: createJSONStorage(() => localStorage, {
          reviver: jsonReviver,
          replacer: jsonReplacer,
        }),
        partialize: (state) => ({
          stickers: state.stickers,
          dockZones: state.dockZones,
          dockedWidgets: state.dockedWidgets,
          savedDockConfigs: state.savedDockConfigs,
          stickerLibrary: state.stickerLibrary,
        }),
      }
    ),
    { name: 'StickerStore', enabled: import.meta.env.DEV }
  )
);

// ==================
// Selector Hooks
// ==================

export const useStickers = () => useStickerStore((state) => state.stickers);
export const useStickersByCanvas = (canvasId: string) =>
  useStickerStore((state) => state.getStickersByCanvas(canvasId));
export const useSelectedSticker = () =>
  useStickerStore((state) =>
    state.selectedStickerId ? state.stickers.get(state.selectedStickerId) : null
  );
export const useDockZones = () => useStickerStore((state) => state.dockZones);
export const useDockedWidgets = () => useStickerStore((state) => state.dockedWidgets);
export const useSavedDockConfigs = () => useStickerStore((state) => state.savedDockConfigs);
export const useStickerLibrary = () => useStickerStore((state) => state.stickerLibrary);

export default useStickerStore;
