/**
 * StickerNest v2 - Library Store (Zustand)
 * State management for Widget Library Panel
 * Handles tabs, search, sorting, filtering, usage tracking, and panel state
 *
 * Enhanced in v2.1 with:
 * - Slide-out panel mechanics
 * - Quick access (favorites + recents)
 * - View mode options
 * - AI suggestions foundation
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import type { WidgetManifest } from '../types/manifest';
import type { LibraryWidget, WidgetCategory } from '../runtime/WidgetLibrary';
import type {
  QuickAccessItem,
  LibraryViewMode,
  LibraryGridSize,
} from '../types/library';

// ==================
// Types
// ==================

export type LibraryTab = 'widgets' | 'stickers' | 'pipelines' | 'upload';

export type SortMode =
  | 'newest'
  | 'oldest'
  | 'alpha-asc'
  | 'alpha-desc'
  | 'most-used'
  | 'least-used'
  | 'by-type'
  | 'by-pipeline'
  | 'recently-updated';

export type WidgetFilter =
  | 'all'
  | 'builtin'
  | 'custom'
  | 'pipeline'
  | 'ai'
  | 'media'
  | 'utility'
  | 'canvas-tools'
  | 'vector-tools'
  | 'data-display'
  | 'controls'
  | 'timers'
  | 'communication'
  | 'layout';

export type StickerFilter =
  | 'all'
  | 'static'
  | 'animated'
  | 'png'
  | 'lottie'
  | 'packs'
  | 'favorites';

export type PipelineGroup =
  | 'ai-tools'
  | 'canvas-tools'
  | 'asset-tools'
  | 'media-tools'
  | 'custom';

export interface WidgetUsageRecord {
  widgetId: string;
  lastUsedAt: number;
  useCount: number;
}

export interface StickerLibraryItem {
  id: string;
  name: string;
  type: 'png' | 'lottie' | 'gif' | 'svg';
  url: string;
  thumbnailUrl?: string;
  category?: string;
  pack?: string;
  tags: string[];
  createdAt: number;
  isAnimated: boolean;
  isFavorite: boolean;
}

export interface LibraryState {
  // Tab state
  activeTab: LibraryTab;

  // Search
  searchQuery: string;
  searchHistory: string[];
  isAISearchMode: boolean;

  // Sorting (per-tab)
  widgetSortMode: SortMode;
  stickerSortMode: SortMode;

  // Filtering (per-tab)
  widgetFilters: WidgetFilter[];
  stickerFilters: StickerFilter[];

  // Custom tag filters
  customWidgetTags: string[];
  customStickerTags: string[];

  // Pipeline group filter
  pipelineGroupFilter: PipelineGroup | null;

  // Usage tracking
  widgetUsage: Map<string, WidgetUsageRecord>;
  recentlyAddedWidgets: string[];
  recentlyAddedStickers: string[];

  // Sticker library
  stickerLibrary: StickerLibraryItem[];
  stickerPacks: string[];

  // UI State
  isDetailsDrawerOpen: boolean;
  selectedItemId: string | null;
  selectedItemType: 'widget' | 'sticker' | null;

  // Collapsed categories
  collapsedCategories: Set<string>;

  // === NEW: Panel State ===

  /** Whether the panel is open */
  isPanelOpen: boolean;

  /** Whether the panel is pinned (stays open) */
  isPanelPinned: boolean;

  /** Current panel width in pixels */
  panelWidth: number;

  /** View mode for widget/sticker display */
  viewMode: LibraryViewMode;

  /** Grid size for grid view */
  gridSize: LibraryGridSize;

  /** Whether quick access section is expanded */
  isQuickAccessExpanded: boolean;

  /** Whether filter section is expanded */
  isFilterExpanded: boolean;

  /** Button vertical position as percentage (0-100) */
  buttonVerticalPosition: number;

  /** Button side ('left' | 'right') */
  buttonSide: 'left' | 'right';

  // === NEW: Quick Access ===

  /** Pinned/favorite items */
  pinnedItems: QuickAccessItem[];

  /** Recently accessed items (auto-tracked) */
  recentItems: QuickAccessItem[];

  // === NEW: AI Suggestions ===

  /** Whether to show AI suggestions */
  showAISuggestions: boolean;

  /** Current AI-suggested widget IDs */
  aiSuggestedWidgetIds: string[];

  // === NEW: Multi-select ===

  /** IDs of items selected for bulk actions */
  multiSelectedIds: Set<string>;

  /** Whether multi-select mode is active */
  isMultiSelectMode: boolean;
}

export interface LibraryActions {
  // Tab
  setActiveTab: (tab: LibraryTab) => void;

  // Search
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  setAISearchMode: (enabled: boolean) => void;

  // Sorting
  setWidgetSortMode: (mode: SortMode) => void;
  setStickerSortMode: (mode: SortMode) => void;

  // Filtering
  toggleWidgetFilter: (filter: WidgetFilter) => void;
  setWidgetFilters: (filters: WidgetFilter[]) => void;
  clearWidgetFilters: () => void;
  toggleStickerFilter: (filter: StickerFilter) => void;
  setStickerFilters: (filters: StickerFilter[]) => void;
  clearStickerFilters: () => void;

  // Custom tags
  addCustomWidgetTag: (tag: string) => void;
  removeCustomWidgetTag: (tag: string) => void;
  addCustomStickerTag: (tag: string) => void;
  removeCustomStickerTag: (tag: string) => void;

  // Pipeline groups
  setPipelineGroupFilter: (group: PipelineGroup | null) => void;

  // Usage tracking
  recordWidgetUsage: (widgetId: string) => void;
  getWidgetUsage: (widgetId: string) => WidgetUsageRecord | undefined;
  getMostUsedWidgets: (limit?: number) => string[];
  getRecentlyUsedWidgets: (limit?: number) => string[];

  // Recently added
  addToRecentlyAdded: (type: 'widget' | 'sticker', id: string) => void;
  getRecentlyAddedWidgets: (limit?: number) => string[];
  getRecentlyAddedStickers: (limit?: number) => string[];

  // Sticker library
  addSticker: (sticker: StickerLibraryItem) => void;
  removeSticker: (id: string) => void;
  updateSticker: (id: string, updates: Partial<StickerLibraryItem>) => void;
  toggleStickerFavorite: (id: string) => void;
  getStickersByPack: (pack: string) => StickerLibraryItem[];
  getStickersByCategory: (category: string) => StickerLibraryItem[];

  // Sticker packs
  addStickerPack: (packName: string) => void;
  removeStickerPack: (packName: string) => void;

  // Details drawer
  openDetailsDrawer: (type: 'widget' | 'sticker', id: string) => void;
  closeDetailsDrawer: () => void;

  // Categories
  toggleCategoryCollapse: (category: string) => void;
  isCategoryCollapsed: (category: string) => boolean;

  // Reset
  resetFilters: () => void;
  resetAll: () => void;

  // === NEW: Panel Actions ===

  /** Open the library panel */
  openPanel: () => void;

  /** Close the library panel */
  closePanel: () => void;

  /** Toggle panel open/closed */
  togglePanel: () => void;

  /** Set panel pinned state */
  setPanelPinned: (pinned: boolean) => void;

  /** Set panel width */
  setPanelWidth: (width: number) => void;

  /** Set button vertical position (0-100 percentage) */
  setButtonVerticalPosition: (position: number) => void;

  /** Set button side ('left' | 'right') */
  setButtonSide: (side: 'left' | 'right') => void;

  /** Set view mode */
  setViewMode: (mode: LibraryViewMode) => void;

  /** Set grid size */
  setGridSize: (size: LibraryGridSize) => void;

  /** Toggle quick access section */
  toggleQuickAccess: () => void;

  /** Toggle filter section */
  toggleFilterExpanded: () => void;

  // === NEW: Quick Access Actions ===

  /** Add item to pinned/favorites */
  pinItem: (id: string, type: 'widget' | 'sticker' | 'kit') => void;

  /** Remove item from pinned/favorites */
  unpinItem: (id: string) => void;

  /** Check if item is pinned */
  isItemPinned: (id: string) => boolean;

  /** Track item access (updates recents) */
  trackItemAccess: (id: string, type: 'widget' | 'sticker' | 'kit') => void;

  /** Clear recent items */
  clearRecentItems: () => void;

  /** Get pinned items of a type */
  getPinnedItems: (type?: 'widget' | 'sticker' | 'kit') => QuickAccessItem[];

  /** Get recent items of a type */
  getRecentItems: (type?: 'widget' | 'sticker' | 'kit', limit?: number) => QuickAccessItem[];

  // === NEW: AI Actions ===

  /** Toggle AI suggestions visibility */
  toggleAISuggestions: () => void;

  /** Set AI suggested widgets */
  setAISuggestedWidgets: (widgetIds: string[]) => void;

  // === NEW: Multi-select Actions ===

  /** Toggle multi-select mode */
  toggleMultiSelectMode: () => void;

  /** Add item to multi-selection */
  addToMultiSelect: (id: string) => void;

  /** Remove item from multi-selection */
  removeFromMultiSelect: (id: string) => void;

  /** Clear multi-selection */
  clearMultiSelect: () => void;

  /** Check if item is multi-selected */
  isMultiSelected: (id: string) => boolean;
}

// ==================
// Initial State
// ==================

/** Default panel configuration values */
const PANEL_CONFIG = {
  defaultWidth: 340,
  minWidth: 280,
  maxWidth: 480,
  recentItemsLimit: 20,
  pinnedItemsLimit: 20,
  searchHistoryLimit: 10,
};

const initialState: LibraryState = {
  activeTab: 'widgets',
  searchQuery: '',
  searchHistory: [],
  isAISearchMode: false,
  widgetSortMode: 'newest',
  stickerSortMode: 'newest',
  widgetFilters: ['all'],
  stickerFilters: ['all'],
  customWidgetTags: [],
  customStickerTags: [],
  pipelineGroupFilter: null,
  widgetUsage: new Map(),
  recentlyAddedWidgets: [],
  recentlyAddedStickers: [],
  stickerLibrary: [],
  stickerPacks: [],
  isDetailsDrawerOpen: false,
  selectedItemId: null,
  selectedItemType: null,
  collapsedCategories: new Set(),

  // Panel state - closed by default for mobile-first experience
  isPanelOpen: false,
  isPanelPinned: false,
  panelWidth: PANEL_CONFIG.defaultWidth,
  viewMode: 'grid',
  gridSize: 'md',
  isQuickAccessExpanded: true,
  isFilterExpanded: false,

  // Button position state
  buttonVerticalPosition: 20, // Start closer to top (20% from top)
  buttonSide: 'right', // Default to right side

  // Quick access
  pinnedItems: [],
  recentItems: [],

  // AI suggestions
  showAISuggestions: true,
  aiSuggestedWidgetIds: [],

  // Multi-select
  multiSelectedIds: new Set(),
  isMultiSelectMode: false,
};

// ==================
// Store
// ==================

export const useLibraryStore = create<LibraryState & LibraryActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Tab
        setActiveTab: (tab) => set({ activeTab: tab }, false, 'setActiveTab'),

        // Search
        setSearchQuery: (query) => set({ searchQuery: query }, false, 'setSearchQuery'),
        clearSearch: () => set({ searchQuery: '' }, false, 'clearSearch'),

        // Sorting
        setWidgetSortMode: (mode) => set({ widgetSortMode: mode }, false, 'setWidgetSortMode'),
        setStickerSortMode: (mode) => set({ stickerSortMode: mode }, false, 'setStickerSortMode'),

        // Widget Filtering
        toggleWidgetFilter: (filter) => {
          const current = get().widgetFilters;
          if (filter === 'all') {
            set({ widgetFilters: ['all'] }, false, 'toggleWidgetFilter');
            return;
          }
          const withoutAll = current.filter((f) => f !== 'all');
          if (current.includes(filter)) {
            const newFilters = withoutAll.filter((f) => f !== filter);
            set({ widgetFilters: newFilters.length === 0 ? ['all'] : newFilters }, false, 'toggleWidgetFilter');
          } else {
            set({ widgetFilters: [...withoutAll, filter] }, false, 'toggleWidgetFilter');
          }
        },
        setWidgetFilters: (filters) => set({ widgetFilters: filters }, false, 'setWidgetFilters'),
        clearWidgetFilters: () => set({ widgetFilters: ['all'] }, false, 'clearWidgetFilters'),

        // Sticker Filtering
        toggleStickerFilter: (filter) => {
          const current = get().stickerFilters;
          if (filter === 'all') {
            set({ stickerFilters: ['all'] }, false, 'toggleStickerFilter');
            return;
          }
          const withoutAll = current.filter((f) => f !== 'all');
          if (current.includes(filter)) {
            const newFilters = withoutAll.filter((f) => f !== filter);
            set({ stickerFilters: newFilters.length === 0 ? ['all'] : newFilters }, false, 'toggleStickerFilter');
          } else {
            set({ stickerFilters: [...withoutAll, filter] }, false, 'toggleStickerFilter');
          }
        },
        setStickerFilters: (filters) => set({ stickerFilters: filters }, false, 'setStickerFilters'),
        clearStickerFilters: () => set({ stickerFilters: ['all'] }, false, 'clearStickerFilters'),

        // Custom tags
        addCustomWidgetTag: (tag) => {
          const current = get().customWidgetTags;
          if (!current.includes(tag)) {
            set({ customWidgetTags: [...current, tag] }, false, 'addCustomWidgetTag');
          }
        },
        removeCustomWidgetTag: (tag) => {
          set({ customWidgetTags: get().customWidgetTags.filter((t) => t !== tag) }, false, 'removeCustomWidgetTag');
        },
        addCustomStickerTag: (tag) => {
          const current = get().customStickerTags;
          if (!current.includes(tag)) {
            set({ customStickerTags: [...current, tag] }, false, 'addCustomStickerTag');
          }
        },
        removeCustomStickerTag: (tag) => {
          set({ customStickerTags: get().customStickerTags.filter((t) => t !== tag) }, false, 'removeCustomStickerTag');
        },

        // Pipeline groups
        setPipelineGroupFilter: (group) => set({ pipelineGroupFilter: group }, false, 'setPipelineGroupFilter'),

        // Usage tracking
        recordWidgetUsage: (widgetId) => {
          const usage = new Map(get().widgetUsage);
          const existing = usage.get(widgetId);
          usage.set(widgetId, {
            widgetId,
            lastUsedAt: Date.now(),
            useCount: (existing?.useCount || 0) + 1,
          });
          set({ widgetUsage: usage }, false, 'recordWidgetUsage');
        },
        getWidgetUsage: (widgetId) => get().widgetUsage.get(widgetId),
        getMostUsedWidgets: (limit = 10) => {
          const usage = Array.from(get().widgetUsage.values());
          return usage
            .sort((a, b) => b.useCount - a.useCount)
            .slice(0, limit)
            .map((u) => u.widgetId);
        },
        getRecentlyUsedWidgets: (limit = 10) => {
          const usage = Array.from(get().widgetUsage.values());
          return usage
            .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
            .slice(0, limit)
            .map((u) => u.widgetId);
        },

        // Recently added
        addToRecentlyAdded: (type, id) => {
          if (type === 'widget') {
            const recent = get().recentlyAddedWidgets.filter((w) => w !== id);
            set({ recentlyAddedWidgets: [id, ...recent].slice(0, 50) }, false, 'addToRecentlyAdded');
          } else {
            const recent = get().recentlyAddedStickers.filter((s) => s !== id);
            set({ recentlyAddedStickers: [id, ...recent].slice(0, 50) }, false, 'addToRecentlyAdded');
          }
        },
        getRecentlyAddedWidgets: (limit = 10) => get().recentlyAddedWidgets.slice(0, limit),
        getRecentlyAddedStickers: (limit = 10) => get().recentlyAddedStickers.slice(0, limit),

        // Sticker library
        addSticker: (sticker) => {
          const library = get().stickerLibrary;
          if (!library.find((s) => s.id === sticker.id)) {
            set({ stickerLibrary: [...library, sticker] }, false, 'addSticker');
          }
        },
        removeSticker: (id) => {
          set({ stickerLibrary: get().stickerLibrary.filter((s) => s.id !== id) }, false, 'removeSticker');
        },
        updateSticker: (id, updates) => {
          set({
            stickerLibrary: get().stickerLibrary.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          }, false, 'updateSticker');
        },
        toggleStickerFavorite: (id) => {
          set({
            stickerLibrary: get().stickerLibrary.map((s) =>
              s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
            ),
          }, false, 'toggleStickerFavorite');
        },
        getStickersByPack: (pack) => get().stickerLibrary.filter((s) => s.pack === pack),
        getStickersByCategory: (category) => get().stickerLibrary.filter((s) => s.category === category),

        // Sticker packs
        addStickerPack: (packName) => {
          const packs = get().stickerPacks;
          if (!packs.includes(packName)) {
            set({ stickerPacks: [...packs, packName] }, false, 'addStickerPack');
          }
        },
        removeStickerPack: (packName) => {
          set({ stickerPacks: get().stickerPacks.filter((p) => p !== packName) }, false, 'removeStickerPack');
        },

        // Details drawer
        openDetailsDrawer: (type, id) => {
          set({
            isDetailsDrawerOpen: true,
            selectedItemId: id,
            selectedItemType: type,
          }, false, 'openDetailsDrawer');
        },
        closeDetailsDrawer: () => {
          set({
            isDetailsDrawerOpen: false,
            selectedItemId: null,
            selectedItemType: null,
          }, false, 'closeDetailsDrawer');
        },

        // Categories
        toggleCategoryCollapse: (category) => {
          const collapsed = new Set(get().collapsedCategories);
          if (collapsed.has(category)) {
            collapsed.delete(category);
          } else {
            collapsed.add(category);
          }
          set({ collapsedCategories: collapsed }, false, 'toggleCategoryCollapse');
        },
        isCategoryCollapsed: (category) => get().collapsedCategories.has(category),

        // Reset
        resetFilters: () => {
          set({
            widgetFilters: ['all'],
            stickerFilters: ['all'],
            customWidgetTags: [],
            customStickerTags: [],
            pipelineGroupFilter: null,
            searchQuery: '',
          }, false, 'resetFilters');
        },
        resetAll: () => set(initialState, false, 'resetAll'),

        // === NEW: Search History Actions ===
        addToSearchHistory: (query) => {
          if (!query.trim()) return;
          const history = get().searchHistory.filter((q) => q !== query);
          set(
            { searchHistory: [query, ...history].slice(0, PANEL_CONFIG.searchHistoryLimit) },
            false,
            'addToSearchHistory'
          );
        },
        clearSearchHistory: () => set({ searchHistory: [] }, false, 'clearSearchHistory'),
        setAISearchMode: (enabled) => set({ isAISearchMode: enabled }, false, 'setAISearchMode'),

        // === NEW: Panel Actions ===
        openPanel: () => set({ isPanelOpen: true }, false, 'openPanel'),
        closePanel: () => set({ isPanelOpen: false }, false, 'closePanel'),
        togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen }), false, 'togglePanel'),
        setPanelPinned: (pinned) => set({ isPanelPinned: pinned }, false, 'setPanelPinned'),
        setPanelWidth: (width) => {
          const clampedWidth = Math.min(
            Math.max(width, PANEL_CONFIG.minWidth),
            PANEL_CONFIG.maxWidth
          );
          set({ panelWidth: clampedWidth }, false, 'setPanelWidth');
        },
        setButtonVerticalPosition: (position) => {
          const clampedPosition = Math.min(Math.max(position, 0), 100);
          set({ buttonVerticalPosition: clampedPosition }, false, 'setButtonVerticalPosition');
        },
        setButtonSide: (side) => set({ buttonSide: side }, false, 'setButtonSide'),
        setViewMode: (mode) => set({ viewMode: mode }, false, 'setViewMode'),
        setGridSize: (size) => set({ gridSize: size }, false, 'setGridSize'),
        toggleQuickAccess: () =>
          set((state) => ({ isQuickAccessExpanded: !state.isQuickAccessExpanded }), false, 'toggleQuickAccess'),
        toggleFilterExpanded: () =>
          set((state) => ({ isFilterExpanded: !state.isFilterExpanded }), false, 'toggleFilterExpanded'),

        // === NEW: Quick Access Actions ===
        pinItem: (id, type) => {
          const pinnedItems = get().pinnedItems;
          if (pinnedItems.some((item) => item.id === id)) return;
          if (pinnedItems.length >= PANEL_CONFIG.pinnedItemsLimit) return;

          const newItem: QuickAccessItem = {
            id,
            type,
            isPinned: true,
            lastAccessedAt: Date.now(),
            accessCount: 1,
          };
          set({ pinnedItems: [...pinnedItems, newItem] }, false, 'pinItem');
        },
        unpinItem: (id) => {
          set(
            { pinnedItems: get().pinnedItems.filter((item) => item.id !== id) },
            false,
            'unpinItem'
          );
        },
        isItemPinned: (id) => get().pinnedItems.some((item) => item.id === id),
        trackItemAccess: (id, type) => {
          const recentItems = get().recentItems;
          const existingIndex = recentItems.findIndex((item) => item.id === id);

          let updatedItems: QuickAccessItem[];
          if (existingIndex >= 0) {
            // Update existing item
            const existing = recentItems[existingIndex];
            const updated: QuickAccessItem = {
              ...existing,
              lastAccessedAt: Date.now(),
              accessCount: existing.accessCount + 1,
            };
            updatedItems = [
              updated,
              ...recentItems.slice(0, existingIndex),
              ...recentItems.slice(existingIndex + 1),
            ];
          } else {
            // Add new item
            const newItem: QuickAccessItem = {
              id,
              type,
              isPinned: false,
              lastAccessedAt: Date.now(),
              accessCount: 1,
            };
            updatedItems = [newItem, ...recentItems];
          }

          set(
            { recentItems: updatedItems.slice(0, PANEL_CONFIG.recentItemsLimit) },
            false,
            'trackItemAccess'
          );
        },
        clearRecentItems: () => set({ recentItems: [] }, false, 'clearRecentItems'),
        getPinnedItems: (type) => {
          const items = get().pinnedItems;
          return type ? items.filter((item) => item.type === type) : items;
        },
        getRecentItems: (type, limit = 10) => {
          let items = get().recentItems;
          if (type) {
            items = items.filter((item) => item.type === type);
          }
          return items.slice(0, limit);
        },

        // === NEW: AI Actions ===
        toggleAISuggestions: () =>
          set((state) => ({ showAISuggestions: !state.showAISuggestions }), false, 'toggleAISuggestions'),
        setAISuggestedWidgets: (widgetIds) =>
          set({ aiSuggestedWidgetIds: widgetIds }, false, 'setAISuggestedWidgets'),

        // === NEW: Multi-select Actions ===
        toggleMultiSelectMode: () => {
          const isActive = get().isMultiSelectMode;
          set(
            {
              isMultiSelectMode: !isActive,
              multiSelectedIds: isActive ? new Set() : get().multiSelectedIds,
            },
            false,
            'toggleMultiSelectMode'
          );
        },
        addToMultiSelect: (id) => {
          const selected = new Set(get().multiSelectedIds);
          selected.add(id);
          set({ multiSelectedIds: selected }, false, 'addToMultiSelect');
        },
        removeFromMultiSelect: (id) => {
          const selected = new Set(get().multiSelectedIds);
          selected.delete(id);
          set({ multiSelectedIds: selected }, false, 'removeFromMultiSelect');
        },
        clearMultiSelect: () =>
          set({ multiSelectedIds: new Set(), isMultiSelectMode: false }, false, 'clearMultiSelect'),
        isMultiSelected: (id) => get().multiSelectedIds.has(id),
      }),
      {
        name: 'stickernest-library',
        storage: createJSONStorage(() => localStorage, {
          replacer: (key, value) => {
            if (value instanceof Map) {
              return { __type: 'Map', value: Array.from(value.entries()) };
            }
            if (value instanceof Set) {
              return { __type: 'Set', value: Array.from(value) };
            }
            return value;
          },
          reviver: (key, value) => {
            if (value && typeof value === 'object' && '__type' in value) {
              if (value.__type === 'Map') {
                return new Map(value.value);
              }
              if (value.__type === 'Set') {
                return new Set(value.value);
              }
            }
            return value;
          },
        }),
        partialize: (state) => ({
          // Original persisted state
          widgetSortMode: state.widgetSortMode,
          stickerSortMode: state.stickerSortMode,
          widgetUsage: state.widgetUsage,
          recentlyAddedWidgets: state.recentlyAddedWidgets,
          recentlyAddedStickers: state.recentlyAddedStickers,
          stickerLibrary: state.stickerLibrary,
          stickerPacks: state.stickerPacks,
          customWidgetTags: state.customWidgetTags,
          customStickerTags: state.customStickerTags,
          collapsedCategories: state.collapsedCategories,

          // NEW: Panel state persistence
          isPanelPinned: state.isPanelPinned,
          panelWidth: state.panelWidth,
          viewMode: state.viewMode,
          gridSize: state.gridSize,
          isQuickAccessExpanded: state.isQuickAccessExpanded,

          // NEW: Quick access persistence
          pinnedItems: state.pinnedItems,
          recentItems: state.recentItems,

          // NEW: Search history
          searchHistory: state.searchHistory,

          // NEW: AI preferences
          showAISuggestions: state.showAISuggestions,
        }),
      }
    ),
    { name: 'LibraryStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// ==================
// Selectors
// ==================

export const selectActiveTab = (state: LibraryState) => state.activeTab;
export const selectSearchQuery = (state: LibraryState) => state.searchQuery;
export const selectWidgetSortMode = (state: LibraryState) => state.widgetSortMode;
export const selectStickerSortMode = (state: LibraryState) => state.stickerSortMode;
export const selectWidgetFilters = (state: LibraryState) => state.widgetFilters;
export const selectStickerFilters = (state: LibraryState) => state.stickerFilters;
export const selectStickerLibrary = (state: LibraryState) => state.stickerLibrary;
export const selectIsDetailsDrawerOpen = (state: LibraryState) => state.isDetailsDrawerOpen;

// NEW: Panel selectors
export const selectIsPanelOpen = (state: LibraryState) => state.isPanelOpen;
export const selectIsPanelPinned = (state: LibraryState) => state.isPanelPinned;
export const selectPanelWidth = (state: LibraryState) => state.panelWidth;
export const selectViewMode = (state: LibraryState) => state.viewMode;
export const selectGridSize = (state: LibraryState) => state.gridSize;
export const selectIsQuickAccessExpanded = (state: LibraryState) => state.isQuickAccessExpanded;
export const selectIsFilterExpanded = (state: LibraryState) => state.isFilterExpanded;

// NEW: Quick access selectors
export const selectPinnedItems = (state: LibraryState) => state.pinnedItems;
export const selectRecentItems = (state: LibraryState) => state.recentItems;

// NEW: Search selectors
export const selectSearchHistory = (state: LibraryState) => state.searchHistory;
export const selectIsAISearchMode = (state: LibraryState) => state.isAISearchMode;

// NEW: AI selectors
export const selectShowAISuggestions = (state: LibraryState) => state.showAISuggestions;
export const selectAISuggestedWidgetIds = (state: LibraryState) => state.aiSuggestedWidgetIds;

// NEW: Multi-select selectors
export const selectMultiSelectedIds = (state: LibraryState) => state.multiSelectedIds;
export const selectIsMultiSelectMode = (state: LibraryState) => state.isMultiSelectMode;

// Compound selectors
export const selectHasActiveFilters = (state: LibraryState) => {
  const widgetFiltersActive = state.widgetFilters.length > 0 && !state.widgetFilters.includes('all');
  const stickerFiltersActive = state.stickerFilters.length > 0 && !state.stickerFilters.includes('all');
  const hasCustomTags = state.customWidgetTags.length > 0 || state.customStickerTags.length > 0;
  const hasPipelineFilter = state.pipelineGroupFilter !== null;
  return widgetFiltersActive || stickerFiltersActive || hasCustomTags || hasPipelineFilter;
};

export const selectPinnedWidgetIds = (state: LibraryState) =>
  state.pinnedItems.filter((item) => item.type === 'widget').map((item) => item.id);

export const selectRecentWidgetIds = (state: LibraryState) =>
  state.recentItems.filter((item) => item.type === 'widget').map((item) => item.id);
