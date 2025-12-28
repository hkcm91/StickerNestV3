/**
 * StickerNest v2 - Panels Store (Zustand)
 * State management for Floating Panel Widget System
 *
 * Provides CRDT-safe state updates for:
 * - Floating panel CRUD operations
 * - Tab management within panels
 * - Widget docking/undocking
 * - Panel preset save/load
 * - Z-index and focus management
 */

import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  FloatingPanel,
  PanelPreset,
  PanelPresetTemplate,
  PanelTab,
  PanelId,
  WidgetInstanceId,
  DockedPanelWidgetState,
  PanelState,
  PanelActions,
  CreatePanelOptions,
  PanelStyleConfig,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_MIN_PANEL_WIDTH,
  DEFAULT_MIN_PANEL_HEIGHT,
  DEFAULT_PANEL_Z_INDEX,
  MAX_PANEL_PRESETS,
  DEFAULT_PANEL_STYLE,
} from '../types/panels';
import type { WidgetPosition } from '../types/domain';

// Re-export constants for use in this file
const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 400;
const MIN_PANEL_WIDTH = 200;
const MIN_PANEL_HEIGHT = 150;
const PANEL_Z_INDEX = 1000;
const PRESETS_LIMIT = 15;
const PANEL_STYLE: PanelStyleConfig = {
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

// ==================
// Utility Functions
// ==================

/**
 * Generate a unique ID for panels
 */
function generatePanelId(): PanelId {
  return `panel-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique ID for tabs
 */
function generateTabId(): string {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique ID for presets
 */
function generatePresetId(): string {
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a default tab
 */
function createDefaultTab(label: string = 'Tab 1'): PanelTab {
  return {
    id: generateTabId(),
    label,
    closeable: true,
    pinned: false,
  };
}

// ==================
// Initial State
// ==================

const initialState: PanelState = {
  panels: new Map(),
  dockedPanelWidgets: new Map(),
  panelPresets: [],
  maxPresets: PRESETS_LIMIT,
  draggedWidgetId: null,
  dropTargetPanelId: null,
  dropTargetTabId: null,
  focusedPanelId: null,
};

// ==================
// Custom JSON Storage
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

// ==================
// Store Creation
// ==================

export const usePanelsStore = create<PanelState & PanelActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================
        // Panel CRUD
        // ==================

        createPanel: (options: CreatePanelOptions): FloatingPanel => {
          const panelId = generatePanelId();
          const now = Date.now();

          // Ensure at least one tab exists
          const tabs = options.tabs && options.tabs.length > 0
            ? options.tabs
            : [createDefaultTab()];

          // Initialize widgetsByTab with empty arrays for each tab
          const widgetsByTab: Record<string, WidgetInstanceId[]> = {};
          tabs.forEach(tab => {
            widgetsByTab[tab.id] = [];
          });

          // Filter out undefined values from options.style to prevent overriding defaults
          const cleanStyle = options.style
            ? Object.fromEntries(
                Object.entries(options.style).filter(([_, v]) => v !== undefined)
              )
            : {};

          const panel: FloatingPanel = {
            id: panelId,
            canvasId: options.canvasId,
            title: options.title || 'Panel',
            position: options.position || { x: 100, y: 100 },
            size: options.size || { width: PANEL_WIDTH, height: PANEL_HEIGHT },
            minSize: { width: MIN_PANEL_WIDTH, height: MIN_PANEL_HEIGHT },
            zIndex: get().getNextZIndex(),
            tabs,
            activeTab: tabs[0].id,
            widgetsByTab,
            style: { ...PANEL_STYLE, ...cleanStyle },
            layoutMode: options.layoutMode || 'flex-column',
            collapsed: false,
            maximized: false,
            visible: true,
            locked: false,
            dockPosition: 'floating',
            icon: options.icon,
            acceptsDrops: options.acceptsDrops ?? true,
            createdAt: now,
            updatedAt: now,
          };

          set((state) => {
            const panels = new Map(state.panels);
            panels.set(panelId, panel);
            return { panels, focusedPanelId: panelId };
          });

          return panel;
        },

        updatePanel: (panelId: PanelId, updates: Partial<FloatingPanel>): void => {
          set((state) => {
            const panels = new Map(state.panels);
            const existing = panels.get(panelId);
            if (existing) {
              // If updates include style, merge with existing and filter undefined values
              let mergedStyle = existing.style;
              if (updates.style) {
                const cleanStyle = Object.fromEntries(
                  Object.entries(updates.style).filter(([_, v]) => v !== undefined)
                );
                mergedStyle = { ...existing.style, ...cleanStyle };
              }

              panels.set(panelId, {
                ...existing,
                ...updates,
                style: mergedStyle,
                updatedAt: Date.now(),
              });
            }
            return { panels };
          });
        },

        deletePanel: (panelId: PanelId): void => {
          set((state) => {
            const panels = new Map(state.panels);
            const panel = panels.get(panelId);

            if (!panel) return state;

            // Undock all widgets in this panel
            const dockedPanelWidgets = new Map(state.dockedPanelWidgets);
            for (const [widgetId, docked] of dockedPanelWidgets) {
              if (docked.panelId === panelId) {
                dockedPanelWidgets.delete(widgetId);
              }
            }

            panels.delete(panelId);

            return {
              panels,
              dockedPanelWidgets,
              focusedPanelId: state.focusedPanelId === panelId ? null : state.focusedPanelId,
            };
          });
        },

        getPanel: (panelId: PanelId): FloatingPanel | undefined => {
          return get().panels.get(panelId);
        },

        getPanels: (): FloatingPanel[] => {
          return Array.from(get().panels.values());
        },

        getPanelsByCanvas: (canvasId: string): FloatingPanel[] => {
          return Array.from(get().panels.values()).filter(p => p.canvasId === canvasId);
        },

        // ==================
        // Panel Position/Size
        // ==================

        updatePanelPosition: (panelId: PanelId, position: WidgetPosition): void => {
          get().updatePanel(panelId, { position });
        },

        updatePanelSize: (panelId: PanelId, size: { width: number; height: number }): void => {
          const panel = get().getPanel(panelId);
          if (!panel) return;

          // Apply constraints
          const constrainedSize = {
            width: Math.max(
              panel.minSize?.width || MIN_PANEL_WIDTH,
              Math.min(size.width, panel.maxSize?.width || 800)
            ),
            height: Math.max(
              panel.minSize?.height || MIN_PANEL_HEIGHT,
              Math.min(size.height, panel.maxSize?.height || 1000)
            ),
          };

          get().updatePanel(panelId, { size: constrainedSize });
        },

        focusPanel: (panelId: PanelId): void => {
          const panels = get().panels;
          const panel = panels.get(panelId);
          if (!panel) return;

          // Get maximum z-index
          let maxZ = PANEL_Z_INDEX;
          for (const p of panels.values()) {
            if (p.zIndex > maxZ) maxZ = p.zIndex;
          }

          // Only update if not already on top
          if (panel.zIndex < maxZ) {
            get().updatePanel(panelId, { zIndex: maxZ + 1 });
          }

          set({ focusedPanelId: panelId });
        },

        togglePanelCollapsed: (panelId: PanelId): void => {
          const panel = get().getPanel(panelId);
          if (panel) {
            get().updatePanel(panelId, { collapsed: !panel.collapsed });
          }
        },

        togglePanelMaximized: (panelId: PanelId): void => {
          const panel = get().getPanel(panelId);
          if (panel) {
            get().updatePanel(panelId, { maximized: !panel.maximized });
          }
        },

        // ==================
        // Tab Operations
        // ==================

        addTab: (panelId: PanelId, tabOptions?: Partial<PanelTab>): PanelTab => {
          const panel = get().getPanel(panelId);
          if (!panel) {
            throw new Error(`Panel ${panelId} not found`);
          }

          const tab: PanelTab = {
            id: generateTabId(),
            label: tabOptions?.label || `Tab ${panel.tabs.length + 1}`,
            icon: tabOptions?.icon,
            closeable: tabOptions?.closeable ?? true,
            pinned: tabOptions?.pinned ?? false,
          };

          set((state) => {
            const panels = new Map(state.panels);
            const existing = panels.get(panelId);
            if (existing) {
              const newWidgetsByTab = { ...existing.widgetsByTab, [tab.id]: [] };
              panels.set(panelId, {
                ...existing,
                tabs: [...existing.tabs, tab],
                widgetsByTab: newWidgetsByTab,
                updatedAt: Date.now(),
              });
            }
            return { panels };
          });

          return tab;
        },

        removeTab: (panelId: PanelId, tabId: string): void => {
          const panel = get().getPanel(panelId);
          if (!panel || panel.tabs.length <= 1) {
            // Cannot remove the last tab
            return;
          }

          const tabIndex = panel.tabs.findIndex(t => t.id === tabId);
          if (tabIndex === -1) return;

          // Undock widgets in this tab
          const widgetsInTab = panel.widgetsByTab[tabId] || [];
          widgetsInTab.forEach(widgetId => {
            get().removeWidgetFromPanelTab(panelId, tabId, widgetId);
          });

          set((state) => {
            const panels = new Map(state.panels);
            const existing = panels.get(panelId);
            if (existing) {
              const newTabs = existing.tabs.filter(t => t.id !== tabId);
              const { [tabId]: _, ...newWidgetsByTab } = existing.widgetsByTab;

              // Switch active tab if necessary
              let newActiveTab = existing.activeTab;
              if (existing.activeTab === tabId) {
                newActiveTab = tabIndex > 0 ? newTabs[tabIndex - 1].id : newTabs[0].id;
              }

              panels.set(panelId, {
                ...existing,
                tabs: newTabs,
                activeTab: newActiveTab,
                widgetsByTab: newWidgetsByTab,
                updatedAt: Date.now(),
              });
            }
            return { panels };
          });
        },

        renameTab: (panelId: PanelId, tabId: string, label: string): void => {
          set((state) => {
            const panels = new Map(state.panels);
            const panel = panels.get(panelId);
            if (panel) {
              const newTabs = panel.tabs.map(t =>
                t.id === tabId ? { ...t, label } : t
              );
              panels.set(panelId, {
                ...panel,
                tabs: newTabs,
                updatedAt: Date.now(),
              });
            }
            return { panels };
          });
        },

        switchTab: (panelId: PanelId, tabId: string): void => {
          const panel = get().getPanel(panelId);
          if (panel && panel.tabs.some(t => t.id === tabId)) {
            get().updatePanel(panelId, { activeTab: tabId });
          }
        },

        reorderTabs: (panelId: PanelId, tabIds: string[]): void => {
          const panel = get().getPanel(panelId);
          if (!panel) return;

          // Validate all tab IDs exist
          const existingIds = new Set(panel.tabs.map(t => t.id));
          if (!tabIds.every(id => existingIds.has(id))) return;

          set((state) => {
            const panels = new Map(state.panels);
            const existing = panels.get(panelId);
            if (existing) {
              const tabMap = new Map(existing.tabs.map(t => [t.id, t]));
              const reorderedTabs = tabIds.map(id => tabMap.get(id)!);
              panels.set(panelId, {
                ...existing,
                tabs: reorderedTabs,
                updatedAt: Date.now(),
              });
            }
            return { panels };
          });
        },

        // ==================
        // Widget Docking
        // ==================

        addWidgetToPanelTab: (
          panelId: PanelId,
          tabId: string,
          widgetId: WidgetInstanceId,
          originalState: {
            position: WidgetPosition;
            size: { width: number; height: number };
            zIndex: number;
            rotation: number;
          }
        ): void => {
          const panel = get().getPanel(panelId);
          if (!panel) return;

          // Check if widget is already docked somewhere
          if (get().isWidgetDockedInPanel(widgetId)) {
            // Remove from existing location first
            const existingState = get().getDockedWidgetState(widgetId);
            if (existingState) {
              get().removeWidgetFromPanelTab(
                existingState.panelId,
                existingState.tabId,
                widgetId
              );
            }
          }

          // Validate tab exists
          if (!panel.tabs.some(t => t.id === tabId)) return;

          const currentWidgets = panel.widgetsByTab[tabId] || [];

          // Create docked widget state
          const dockedState: DockedPanelWidgetState = {
            widgetId,
            panelId,
            tabId,
            orderIndex: currentWidgets.length,
            originalPosition: originalState.position,
            originalSize: originalState.size,
            originalZIndex: originalState.zIndex,
            originalRotation: originalState.rotation,
            minimized: false,
            dockedAt: Date.now(),
          };

          set((state) => {
            const panels = new Map(state.panels);
            const dockedPanelWidgets = new Map(state.dockedPanelWidgets);

            // Update panel's widgetsByTab
            const existing = panels.get(panelId);
            if (existing) {
              const newWidgetsByTab = {
                ...existing.widgetsByTab,
                [tabId]: [...(existing.widgetsByTab[tabId] || []), widgetId],
              };
              panels.set(panelId, {
                ...existing,
                widgetsByTab: newWidgetsByTab,
                updatedAt: Date.now(),
              });
            }

            // Add docked widget state
            dockedPanelWidgets.set(widgetId, dockedState);

            return { panels, dockedPanelWidgets };
          });
        },

        removeWidgetFromPanelTab: (
          panelId: PanelId,
          tabId: string,
          widgetId: WidgetInstanceId
        ): DockedPanelWidgetState | undefined => {
          const dockedState = get().dockedPanelWidgets.get(widgetId);
          if (!dockedState || dockedState.panelId !== panelId) return undefined;

          set((state) => {
            const panels = new Map(state.panels);
            const dockedPanelWidgets = new Map(state.dockedPanelWidgets);

            // Update panel's widgetsByTab
            const panel = panels.get(panelId);
            if (panel) {
              const newWidgetsByTab = {
                ...panel.widgetsByTab,
                [tabId]: (panel.widgetsByTab[tabId] || []).filter(id => id !== widgetId),
              };
              panels.set(panelId, {
                ...panel,
                widgetsByTab: newWidgetsByTab,
                updatedAt: Date.now(),
              });
            }

            // Remove docked widget state
            dockedPanelWidgets.delete(widgetId);

            return { panels, dockedPanelWidgets };
          });

          return dockedState;
        },

        moveWidgetBetweenTabs: (
          panelId: PanelId,
          widgetId: WidgetInstanceId,
          fromTab: string,
          toTab: string
        ): void => {
          const dockedState = get().getDockedWidgetState(widgetId);
          if (!dockedState || dockedState.panelId !== panelId) return;

          const panel = get().getPanel(panelId);
          if (!panel) return;

          // Validate both tabs exist
          if (!panel.tabs.some(t => t.id === fromTab) ||
              !panel.tabs.some(t => t.id === toTab)) return;

          set((state) => {
            const panels = new Map(state.panels);
            const dockedPanelWidgets = new Map(state.dockedPanelWidgets);

            // Update panel's widgetsByTab
            const existing = panels.get(panelId);
            if (existing) {
              const newWidgetsByTab = {
                ...existing.widgetsByTab,
                [fromTab]: (existing.widgetsByTab[fromTab] || []).filter(id => id !== widgetId),
                [toTab]: [...(existing.widgetsByTab[toTab] || []), widgetId],
              };
              panels.set(panelId, {
                ...existing,
                widgetsByTab: newWidgetsByTab,
                updatedAt: Date.now(),
              });
            }

            // Update docked state
            const existingDocked = dockedPanelWidgets.get(widgetId);
            if (existingDocked) {
              dockedPanelWidgets.set(widgetId, {
                ...existingDocked,
                tabId: toTab,
                orderIndex: (existing?.widgetsByTab[toTab] || []).length,
              });
            }

            return { panels, dockedPanelWidgets };
          });
        },

        reorderWidgetsInTab: (
          panelId: PanelId,
          tabId: string,
          widgetIds: WidgetInstanceId[]
        ): void => {
          const panel = get().getPanel(panelId);
          if (!panel) return;

          // Validate all widget IDs exist in tab
          const existingIds = new Set(panel.widgetsByTab[tabId] || []);
          if (!widgetIds.every(id => existingIds.has(id))) return;

          set((state) => {
            const panels = new Map(state.panels);
            const dockedPanelWidgets = new Map(state.dockedPanelWidgets);

            // Update panel's widgetsByTab
            const existing = panels.get(panelId);
            if (existing) {
              const newWidgetsByTab = {
                ...existing.widgetsByTab,
                [tabId]: widgetIds,
              };
              panels.set(panelId, {
                ...existing,
                widgetsByTab: newWidgetsByTab,
                updatedAt: Date.now(),
              });
            }

            // Update order indices
            widgetIds.forEach((widgetId, index) => {
              const docked = dockedPanelWidgets.get(widgetId);
              if (docked) {
                dockedPanelWidgets.set(widgetId, {
                  ...docked,
                  orderIndex: index,
                });
              }
            });

            return { panels, dockedPanelWidgets };
          });
        },

        getDockedWidgetState: (widgetId: WidgetInstanceId): DockedPanelWidgetState | undefined => {
          return get().dockedPanelWidgets.get(widgetId);
        },

        isWidgetDockedInPanel: (widgetId: WidgetInstanceId): boolean => {
          return get().dockedPanelWidgets.has(widgetId);
        },

        getWidgetsInPanelTab: (panelId: PanelId, tabId: string): WidgetInstanceId[] => {
          const panel = get().getPanel(panelId);
          return panel?.widgetsByTab[tabId] || [];
        },

        // ==================
        // Preset Operations
        // ==================

        savePanelPreset: (panelId: PanelId, name: string, description?: string): PanelPreset => {
          const panel = get().getPanel(panelId);
          if (!panel) {
            throw new Error(`Panel ${panelId} not found`);
          }

          // Create template from panel (without instance-specific data)
          const template: PanelPresetTemplate = {
            title: panel.title,
            relativePosition: {
              x: panel.position.x,
              y: panel.position.y,
            },
            size: panel.size,
            tabs: panel.tabs.map(t => ({
              ...t,
              id: generateTabId(), // Generate new IDs for template
            })),
            defaultActiveTab: panel.tabs[0]?.id || '',
            style: panel.style,
            layoutMode: panel.layoutMode,
            icon: panel.icon,
            acceptsDrops: panel.acceptsDrops,
            acceptedWidgetTypes: panel.acceptedWidgetTypes,
          };

          const now = Date.now();
          const preset: PanelPreset = {
            id: generatePresetId(),
            name,
            description,
            panel: template,
            isFavorite: false,
            createdAt: now,
            updatedAt: now,
          };

          set((state) => {
            let presets = [...state.panelPresets, preset];

            // Enforce maximum preset limit
            if (presets.length > state.maxPresets) {
              // Remove oldest non-favorite presets
              const favorites = presets.filter(p => p.isFavorite);
              const nonFavorites = presets.filter(p => !p.isFavorite);
              nonFavorites.sort((a, b) => a.createdAt - b.createdAt);

              while (presets.length > state.maxPresets && nonFavorites.length > 0) {
                const toRemove = nonFavorites.shift();
                if (toRemove) {
                  presets = presets.filter(p => p.id !== toRemove.id);
                }
              }
            }

            return { panelPresets: presets };
          });

          return preset;
        },

        loadPanelPreset: (
          presetId: string,
          canvasId: string,
          canvasBounds: { width: number; height: number }
        ): FloatingPanel | undefined => {
          const preset = get().panelPresets.find(p => p.id === presetId);
          if (!preset) return undefined;

          const template = preset.panel;

          // Create new panel from template
          const panelId = generatePanelId();
          const now = Date.now();

          // Generate new tab IDs
          const tabs = template.tabs.map(t => ({
            ...t,
            id: generateTabId(),
          }));

          // Initialize widgetsByTab
          const widgetsByTab: Record<string, WidgetInstanceId[]> = {};
          tabs.forEach(tab => {
            widgetsByTab[tab.id] = [];
          });

          const panel: FloatingPanel = {
            id: panelId,
            canvasId,
            title: template.title,
            position: {
              x: Math.min(template.relativePosition.x, canvasBounds.width - template.size.width),
              y: Math.min(template.relativePosition.y, canvasBounds.height - template.size.height),
            },
            size: template.size,
            minSize: { width: MIN_PANEL_WIDTH, height: MIN_PANEL_HEIGHT },
            zIndex: get().getNextZIndex(),
            tabs,
            activeTab: tabs[0]?.id || '',
            widgetsByTab,
            // Filter out undefined values from template.style to prevent style errors
            style: {
              ...PANEL_STYLE,
              ...(template.style
                ? Object.fromEntries(
                    Object.entries(template.style).filter(([_, v]) => v !== undefined)
                  )
                : {}),
            },
            layoutMode: template.layoutMode,
            collapsed: false,
            maximized: false,
            visible: true,
            locked: false,
            dockPosition: 'floating',
            icon: template.icon,
            acceptsDrops: template.acceptsDrops,
            acceptedWidgetTypes: template.acceptedWidgetTypes,
            createdAt: now,
            updatedAt: now,
          };

          set((state) => {
            const panels = new Map(state.panels);
            panels.set(panelId, panel);
            return { panels, focusedPanelId: panelId };
          });

          return panel;
        },

        deletePanelPreset: (presetId: string): void => {
          set((state) => ({
            panelPresets: state.panelPresets.filter(p => p.id !== presetId),
          }));
        },

        duplicatePanelPreset: (presetId: string): PanelPreset | undefined => {
          const preset = get().panelPresets.find(p => p.id === presetId);
          if (!preset) return undefined;

          const now = Date.now();
          const duplicated: PanelPreset = {
            ...preset,
            id: generatePresetId(),
            name: `${preset.name} (Copy)`,
            isFavorite: false,
            createdAt: now,
            updatedAt: now,
          };

          set((state) => {
            const presets = [...state.panelPresets];
            if (presets.length < state.maxPresets) {
              presets.push(duplicated);
            }
            return { panelPresets: presets };
          });

          return duplicated;
        },

        getPanelPresets: (): PanelPreset[] => {
          return get().panelPresets;
        },

        togglePresetFavorite: (presetId: string): void => {
          set((state) => ({
            panelPresets: state.panelPresets.map(p =>
              p.id === presetId
                ? { ...p, isFavorite: !p.isFavorite, updatedAt: Date.now() }
                : p
            ),
          }));
        },

        // ==================
        // Drag & Drop State
        // ==================

        setDraggedWidgetForPanel: (widgetId: WidgetInstanceId | null): void => {
          set({ draggedWidgetId: widgetId });
        },

        setDropTargetPanel: (panelId: PanelId | null, tabId?: string | null): void => {
          set({
            dropTargetPanelId: panelId,
            dropTargetTabId: tabId ?? null,
          });
        },

        getDragState: () => ({
          draggedWidgetId: get().draggedWidgetId,
          dropTargetPanelId: get().dropTargetPanelId,
          dropTargetTabId: get().dropTargetTabId,
        }),

        // ==================
        // Internal Helpers
        // ==================

        getNextZIndex: (): number => {
          const panels = get().panels;
          let maxZ = PANEL_Z_INDEX;
          for (const p of panels.values()) {
            if (p.zIndex > maxZ) maxZ = p.zIndex;
          }
          return maxZ + 1;
        },
      }),
      {
        name: 'stickernest-panels',
        storage: createJSONStorage(() => localStorage, {
          reviver: jsonReviver,
          replacer: jsonReplacer,
        }),
        partialize: (state) => ({
          panels: state.panels,
          dockedPanelWidgets: state.dockedPanelWidgets,
          panelPresets: state.panelPresets,
        }),
      }
    ),
    { name: 'PanelsStore', enabled: import.meta.env.DEV }
  )
);

// ==================
// Selector Hooks
// ==================

/** Select all panels as array - uses shallow comparison to prevent infinite loops */
export const usePanels = () =>
  usePanelsStore(
    useShallow((state) => Array.from(state.panels.values()))
  );

/** Select panels for a specific canvas - uses shallow comparison to prevent infinite loops */
export const usePanelsByCanvas = (canvasId: string) =>
  usePanelsStore(
    useShallow((state) =>
      Array.from(state.panels.values()).filter(p => p.canvasId === canvasId)
    )
  );

/** Select a single panel by ID */
export const usePanel = (panelId: PanelId) =>
  usePanelsStore((state) => state.panels.get(panelId));

/** Select focused panel ID */
export const useFocusedPanelId = () =>
  usePanelsStore((state) => state.focusedPanelId);

/** Select panel presets */
export const usePanelPresets = () =>
  usePanelsStore((state) => state.panelPresets);

/** Select favorite presets - uses shallow comparison */
export const useFavoritePanelPresets = () =>
  usePanelsStore(
    useShallow((state) => state.panelPresets.filter(p => p.isFavorite))
  );

/** Check if a widget is docked in any panel */
export const useIsWidgetDockedInPanel = (widgetId: WidgetInstanceId) =>
  usePanelsStore((state) => state.dockedPanelWidgets.has(widgetId));

/** Get docked widget state */
export const useDockedPanelWidgetState = (widgetId: WidgetInstanceId) =>
  usePanelsStore((state) => state.dockedPanelWidgets.get(widgetId));

/** Select drag state - uses shallow comparison */
export const usePanelDragState = () =>
  usePanelsStore(
    useShallow((state) => ({
      draggedWidgetId: state.draggedWidgetId,
      dropTargetPanelId: state.dropTargetPanelId,
      dropTargetTabId: state.dropTargetTabId,
    }))
  );

/** Check if a panel is the drop target */
export const useIsPanelDropTarget = (panelId: PanelId) =>
  usePanelsStore((state) => state.dropTargetPanelId === panelId);

export default usePanelsStore;
