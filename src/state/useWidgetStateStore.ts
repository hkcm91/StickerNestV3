/**
 * StickerNest v2 - Widget State Store (Zustand)
 *
 * Centralized persistent storage for widget instance state.
 * This store ensures widget state survives page refreshes,
 * navigation, and is independent of canvas auto-save cycles.
 *
 * Key Features:
 * - Persists to localStorage automatically
 * - Keyed by widget instance ID for fast lookups
 * - Supports debounced saves to prevent excessive writes
 * - Canvas-aware for bulk operations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==================
// Types
// ==================

/** Widget state entry with metadata */
export interface WidgetStateEntry {
  /** Widget instance ID */
  widgetId: string;
  /** Canvas ID this widget belongs to */
  canvasId: string;
  /** Widget definition ID (type) */
  widgetDefId: string;
  /** The actual widget state data */
  state: Record<string, unknown>;
  /** Last updated timestamp */
  updatedAt: number;
  /** Version for potential migrations */
  version: number;
}

// ==================
// Store State
// ==================

export interface WidgetStateStoreState {
  /** Widget states keyed by widget instance ID */
  widgetStates: Record<string, WidgetStateEntry>;
  /** Last save timestamp for debugging */
  lastSaveAt: number | null;
}

// ==================
// Store Actions
// ==================

export interface WidgetStateStoreActions {
  /**
   * Get widget state by instance ID
   * Returns undefined if not found
   */
  getWidgetState: (widgetId: string) => Record<string, unknown> | undefined;

  /**
   * Get full widget state entry with metadata
   */
  getWidgetStateEntry: (widgetId: string) => WidgetStateEntry | undefined;

  /**
   * Set/update widget state (merges with existing)
   */
  setWidgetState: (
    widgetId: string,
    state: Record<string, unknown>,
    metadata?: { canvasId?: string; widgetDefId?: string }
  ) => void;

  /**
   * Replace entire widget state (doesn't merge)
   */
  replaceWidgetState: (
    widgetId: string,
    state: Record<string, unknown>,
    metadata?: { canvasId?: string; widgetDefId?: string }
  ) => void;

  /**
   * Remove widget state
   */
  removeWidgetState: (widgetId: string) => void;

  /**
   * Remove all widget states for a canvas
   */
  removeCanvasWidgetStates: (canvasId: string) => void;

  /**
   * Get all widget states for a canvas
   */
  getCanvasWidgetStates: (canvasId: string) => WidgetStateEntry[];

  /**
   * Check if widget has persisted state
   */
  hasWidgetState: (widgetId: string) => boolean;

  /**
   * Clear all widget states (use with caution)
   */
  clearAllWidgetStates: () => void;

  /**
   * Get statistics about stored widget states
   */
  getStats: () => {
    totalWidgets: number;
    canvasCount: number;
    lastSaveAt: number | null;
  };
}

// ==================
// Initial State
// ==================

const initialState: WidgetStateStoreState = {
  widgetStates: {},
  lastSaveAt: null,
};

// ==================
// Store Version (for migrations)
// ==================

const STORE_VERSION = 1;

// ==================
// Store Creation
// ==================

export const useWidgetStateStore = create<WidgetStateStoreState & WidgetStateStoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      getWidgetState: (widgetId) => {
        const entry = get().widgetStates[widgetId];
        return entry?.state;
      },

      getWidgetStateEntry: (widgetId) => {
        return get().widgetStates[widgetId];
      },

      setWidgetState: (widgetId, state, metadata = {}) => {
        set((currentState) => {
          const existing = currentState.widgetStates[widgetId];
          const now = Date.now();

          const newEntry: WidgetStateEntry = {
            widgetId,
            canvasId: metadata.canvasId || existing?.canvasId || 'unknown',
            widgetDefId: metadata.widgetDefId || existing?.widgetDefId || 'unknown',
            state: {
              ...(existing?.state || {}),
              ...state,
            },
            updatedAt: now,
            version: STORE_VERSION,
          };

          return {
            widgetStates: {
              ...currentState.widgetStates,
              [widgetId]: newEntry,
            },
            lastSaveAt: now,
          };
        });
      },

      replaceWidgetState: (widgetId, state, metadata = {}) => {
        set((currentState) => {
          const existing = currentState.widgetStates[widgetId];
          const now = Date.now();

          const newEntry: WidgetStateEntry = {
            widgetId,
            canvasId: metadata.canvasId || existing?.canvasId || 'unknown',
            widgetDefId: metadata.widgetDefId || existing?.widgetDefId || 'unknown',
            state,
            updatedAt: now,
            version: STORE_VERSION,
          };

          return {
            widgetStates: {
              ...currentState.widgetStates,
              [widgetId]: newEntry,
            },
            lastSaveAt: now,
          };
        });
      },

      removeWidgetState: (widgetId) => {
        set((currentState) => {
          const { [widgetId]: _, ...rest } = currentState.widgetStates;
          return {
            widgetStates: rest,
            lastSaveAt: Date.now(),
          };
        });
      },

      removeCanvasWidgetStates: (canvasId) => {
        set((currentState) => {
          const filtered = Object.fromEntries(
            Object.entries(currentState.widgetStates).filter(
              ([_, entry]) => entry.canvasId !== canvasId
            )
          );
          return {
            widgetStates: filtered,
            lastSaveAt: Date.now(),
          };
        });
      },

      getCanvasWidgetStates: (canvasId) => {
        const states = get().widgetStates;
        return Object.values(states).filter((entry) => entry.canvasId === canvasId);
      },

      hasWidgetState: (widgetId) => {
        return widgetId in get().widgetStates;
      },

      clearAllWidgetStates: () => {
        set({
          widgetStates: {},
          lastSaveAt: Date.now(),
        });
      },

      getStats: () => {
        const states = get().widgetStates;
        const entries = Object.values(states);
        const canvasIds = new Set(entries.map((e) => e.canvasId));

        return {
          totalWidgets: entries.length,
          canvasCount: canvasIds.size,
          lastSaveAt: get().lastSaveAt,
        };
      },
    }),
    {
      name: 'sn-widget-states',
      storage: createJSONStorage(() => localStorage),
      version: STORE_VERSION,

      // Migrate from older versions if needed
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as WidgetStateStoreState;

        if (version === 0) {
          // Future migration logic from v0 to v1
          return {
            ...state,
            lastSaveAt: Date.now(),
          };
        }

        return state;
      },

      // Only persist the widget states, not transient data
      partialize: (state) => ({
        widgetStates: state.widgetStates,
        lastSaveAt: state.lastSaveAt,
      }),
    }
  )
);

// ==================
// Selector Hooks
// ==================

/** Get all widget states */
export const useAllWidgetStates = () =>
  useWidgetStateStore((state) => state.widgetStates);

/** Get widget state for a specific widget */
export const useWidgetState = (widgetId: string) =>
  useWidgetStateStore((state) => state.widgetStates[widgetId]?.state);

/** Get widget states for a specific canvas */
export const useCanvasWidgetStates = (canvasId: string) =>
  useWidgetStateStore((state) =>
    Object.values(state.widgetStates).filter((entry) => entry.canvasId === canvasId)
  );

/** Check if any widget states exist */
export const useHasWidgetStates = () =>
  useWidgetStateStore((state) => Object.keys(state.widgetStates).length > 0);

// ==================
// Non-React Accessors (for use in non-component code)
// ==================

/**
 * Get widget state outside of React components
 * Use this in WidgetSandboxHost, event handlers, etc.
 */
export const getWidgetState = (widgetId: string): Record<string, unknown> | undefined => {
  return useWidgetStateStore.getState().getWidgetState(widgetId);
};

/**
 * Set widget state outside of React components
 */
export const setWidgetState = (
  widgetId: string,
  state: Record<string, unknown>,
  metadata?: { canvasId?: string; widgetDefId?: string }
): void => {
  useWidgetStateStore.getState().setWidgetState(widgetId, state, metadata);
};

/**
 * Get full widget state entry outside of React components
 */
export const getWidgetStateEntry = (widgetId: string): WidgetStateEntry | undefined => {
  return useWidgetStateStore.getState().getWidgetStateEntry(widgetId);
};

/**
 * Check if widget has persisted state outside of React components
 */
export const hasWidgetState = (widgetId: string): boolean => {
  return useWidgetStateStore.getState().hasWidgetState(widgetId);
};

// ==================
// Debug Utilities
// ==================

/**
 * Log widget state store stats to console (for debugging)
 */
export const logWidgetStateStats = (): void => {
  const stats = useWidgetStateStore.getState().getStats();
  console.log('[WidgetStateStore] Stats:', stats);
};

/**
 * Subscribe to widget state changes (for debugging or external sync)
 */
export const subscribeToWidgetStateChanges = (
  callback: (state: WidgetStateStoreState) => void
): (() => void) => {
  return useWidgetStateStore.subscribe(callback);
};
