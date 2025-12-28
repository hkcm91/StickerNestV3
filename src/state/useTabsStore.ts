/**
 * StickerNest v2 - Tabs Store (Zustand)
 * State management for draggable tabs with widget dockers, URL previews, and canvas tabs
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import type {
  TabConfig,
  TabType,
  TypedTab,
  CreateTabAction,
  TAB_TYPE_METADATA,
} from '../components/tabs/types';
import { getDefaultConfig, getTabTypeIcon } from '../components/tabs/types';

// ==================
// Types
// ==================

/** Legacy Tab interface for backwards compatibility */
export interface Tab {
  id: string;
  title: string;
  /** Vertical position of the draggable button (0-100 percentage) */
  buttonVerticalPosition: number;
  /** Side of the button ('left' | 'right') */
  buttonSide: 'left' | 'right';
  /** Whether the tab panel is open */
  isOpen: boolean;
  /** Panel width in pixels */
  panelWidth: number;
  /** Created timestamp */
  createdAt: number;
  /** Tab type configuration (new) */
  config?: TabConfig;
  /** Icon for tab button */
  icon?: string;
}

export interface TabsState {
  /** All tabs */
  tabs: Tab[];
  /** Currently active tab ID */
  activeTabId: string | null;
}

export interface TabsActions {
  /** Create a new tab (legacy - defaults to widget-docker) */
  createTab: (title?: string) => string;

  /** Create a typed tab with configuration */
  createTypedTab: (action: CreateTabAction) => string;

  /** Delete a tab */
  deleteTab: (id: string) => void;

  /** Set active tab */
  setActiveTab: (id: string) => void;

  /** Update tab properties */
  updateTab: (id: string, updates: Partial<Omit<Tab, 'id' | 'createdAt'>>) => void;

  /** Update tab configuration */
  updateTabConfig: (id: string, config: Partial<TabConfig>) => void;

  /** Get a specific tab */
  getTab: (id: string) => Tab | undefined;

  /** Get tabs by type */
  getTabsByType: (type: TabType) => Tab[];
}

// ==================
// Initial State
// ==================

const PANEL_CONFIG = {
  defaultWidth: 400,
  minWidth: 300,
  maxWidth: 600,
};

const initialState: TabsState = {
  tabs: [],
  activeTabId: null,
};

// ==================
// Store
// ==================

export const useTabsStore = create<TabsState & TabsActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        createTab: (title) => {
          const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const newTab: Tab = {
            id,
            title: title || `Tab ${get().tabs.length + 1}`,
            buttonVerticalPosition: 30 + (get().tabs.length * 15), // Stagger vertically
            buttonSide: 'right',
            isOpen: true,
            panelWidth: PANEL_CONFIG.defaultWidth,
            createdAt: Date.now(),
            config: { type: 'widget-docker' },
            icon: 'W',
          };

          set((state) => ({
            tabs: [...state.tabs, newTab],
            activeTabId: id,
          }), false, 'createTab');

          return id;
        },

        createTypedTab: (action) => {
          const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const tabType = action.config.type;

          // Get default panel width based on tab type
          let defaultWidth = PANEL_CONFIG.defaultWidth;
          if (tabType === 'url-preview') {
            defaultWidth = 500;
          } else if (tabType === 'canvas') {
            defaultWidth = 500;
          }

          const newTab: Tab = {
            id,
            title: action.title,
            buttonVerticalPosition: action.buttonVerticalPosition ?? (30 + (get().tabs.length * 15)),
            buttonSide: action.buttonSide || 'right',
            isOpen: true,
            panelWidth: action.panelWidth || defaultWidth,
            createdAt: Date.now(),
            config: action.config,
            icon: getTabTypeIcon(tabType),
          };

          set((state) => ({
            tabs: [...state.tabs, newTab],
            activeTabId: id,
          }), false, 'createTypedTab');

          return id;
        },

        deleteTab: (id) => {
          set((state) => {
            const newTabs = state.tabs.filter(t => t.id !== id);
            const newActiveTabId = state.activeTabId === id
              ? (newTabs.length > 0 ? newTabs[0].id : null)
              : state.activeTabId;
            return {
              tabs: newTabs,
              activeTabId: newActiveTabId,
            };
          }, false, 'deleteTab');
        },

        setActiveTab: (id) => {
          set({ activeTabId: id }, false, 'setActiveTab');
        },

        updateTab: (id, updates) => {
          set((state) => ({
            tabs: state.tabs.map(tab =>
              tab.id === id ? { ...tab, ...updates } : tab
            ),
          }), false, 'updateTab');
        },

        updateTabConfig: (id, configUpdates) => {
          set((state) => ({
            tabs: state.tabs.map(tab => {
              if (tab.id !== id || !tab.config) return tab;
              return {
                ...tab,
                config: { ...tab.config, ...configUpdates } as TabConfig,
              };
            }),
          }), false, 'updateTabConfig');
        },

        getTab: (id) => {
          return get().tabs.find(t => t.id === id);
        },

        getTabsByType: (type) => {
          return get().tabs.filter(t => t.config?.type === type);
        },
      }),
      {
        name: 'stickernest-tabs',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          tabs: state.tabs,
          activeTabId: state.activeTabId,
        }),
      }
    ),
    { name: 'TabsStore', enabled: import.meta.env.DEV }
  )
);


