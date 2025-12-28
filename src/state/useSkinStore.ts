/**
 * StickerNest v2 - Skin Store
 * Zustand store for managing skin state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Skin, SkinTokens } from '../types/skin';
import { builtInSkins, defaultSkin } from '../skins';

// ============================================
// Types
// ============================================

interface SkinState {
  /** Currently active skin ID */
  currentSkinId: string;
  /** Currently active skin object */
  currentSkin: Skin;
  /** All registered skins */
  skins: Map<string, Skin>;
  /** Widget-specific overrides */
  widgetOverrides: Map<string, Record<string, string>>;
  /** Whether skin CSS has been injected */
  cssInjected: boolean;
}

interface SkinActions {
  /** Set the active skin by ID */
  setSkin: (skinId: string) => void;
  /** Register a new skin */
  registerSkin: (skin: Skin) => void;
  /** Unregister a skin */
  unregisterSkin: (skinId: string) => void;
  /** Set widget-specific token overrides */
  setWidgetOverrides: (widgetId: string, overrides: Record<string, string>) => void;
  /** Clear widget-specific overrides */
  clearWidgetOverrides: (widgetId: string) => void;
  /** Get all overrides for a widget (merged with current skin) */
  getWidgetStyles: (widgetId: string) => Record<string, string>;
  /** Reset to default skin */
  resetSkin: () => void;
  /** Apply the current skin to the DOM */
  applySkinToDOM: () => void;
  /** Get a skin by ID */
  getSkin: (skinId: string) => Skin | undefined;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert skin tokens to flat CSS variables
 */
function flattenTokens(tokens: SkinTokens): Record<string, string> {
  const result: Record<string, string> = {};

  const categories = [
    'backgrounds',
    'text',
    'accents',
    'borders',
    'shadows',
    'typography',
    'spacing',
    'custom',
  ] as const;

  for (const category of categories) {
    const categoryTokens = tokens[category];
    if (categoryTokens) {
      for (const [key, value] of Object.entries(categoryTokens)) {
        // Ensure the key starts with -- for CSS variables
        const varName = key.startsWith('--') ? key : `--${key}`;
        result[varName] = value;
      }
    }
  }

  return result;
}

/**
 * Apply CSS variables to the document root
 */
function applyCSSVariables(variables: Record<string, string>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Remove CSS variables from the document root
 */
function removeCSSVariables(variables: Record<string, string>): void {
  const root = document.documentElement;
  for (const key of Object.keys(variables)) {
    root.style.removeProperty(key);
  }
}

/**
 * Inject custom CSS from a skin
 */
function injectSkinCSS(skinId: string, css: string): void {
  // Remove existing skin CSS
  const existingStyle = document.getElementById(`skin-css-${skinId}`);
  if (existingStyle) {
    existingStyle.remove();
  }

  if (!css) return;

  // Inject new CSS
  const style = document.createElement('style');
  style.id = `skin-css-${skinId}`;
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Remove skin CSS
 */
function removeSkinCSS(skinId: string): void {
  const existingStyle = document.getElementById(`skin-css-${skinId}`);
  if (existingStyle) {
    existingStyle.remove();
  }
}

// ============================================
// Store Creation
// ============================================

// Initialize skins map with built-in skins
const initialSkins = new Map<string, Skin>(
  builtInSkins.map(skin => [skin.id, skin])
);

// Custom storage for Maps
const mapStorage = createJSONStorage(() => localStorage, {
  reviver: (_key: string, value: unknown) => {
    if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Map') {
      return new Map((value as { entries: [string, unknown][] }).entries);
    }
    return value;
  },
  replacer: (_key: string, value: unknown) => {
    if (value instanceof Map) {
      return { __type: 'Map', entries: Array.from(value.entries()) };
    }
    return value;
  },
});

export const useSkinStore = create<SkinState & SkinActions>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSkinId: 'default',
      currentSkin: defaultSkin,
      skins: initialSkins,
      widgetOverrides: new Map(),
      cssInjected: false,

      // Actions
      setSkin: (skinId: string) => {
        const skin = get().skins.get(skinId);
        if (!skin) {
          console.warn(`[SkinStore] Skin "${skinId}" not found`);
          return;
        }

        // Remove old skin CSS
        removeSkinCSS(get().currentSkinId);

        set({
          currentSkinId: skinId,
          currentSkin: skin,
        });

        // Apply new skin
        get().applySkinToDOM();
      },

      registerSkin: (skin: Skin) => {
        const skins = new Map(get().skins);
        skins.set(skin.id, skin);
        set({ skins });
      },

      unregisterSkin: (skinId: string) => {
        if (skinId === 'default') {
          console.warn('[SkinStore] Cannot unregister default skin');
          return;
        }

        const skins = new Map(get().skins);
        skins.delete(skinId);
        set({ skins });

        // If the removed skin was active, switch to default
        if (get().currentSkinId === skinId) {
          get().setSkin('default');
        }
      },

      setWidgetOverrides: (widgetId: string, overrides: Record<string, string>) => {
        const widgetOverrides = new Map(get().widgetOverrides);
        widgetOverrides.set(widgetId, overrides);
        set({ widgetOverrides });
      },

      clearWidgetOverrides: (widgetId: string) => {
        const widgetOverrides = new Map(get().widgetOverrides);
        widgetOverrides.delete(widgetId);
        set({ widgetOverrides });
      },

      getWidgetStyles: (widgetId: string) => {
        const { currentSkin, widgetOverrides } = get();

        // Start with flattened skin tokens
        const skinVars = flattenTokens(currentSkin.tokens);

        // Merge with skin's direct variables
        const baseVars = { ...skinVars, ...(currentSkin.variables || {}) };

        // Merge with widget-specific overrides
        const widgetVars = widgetOverrides.get(widgetId) || {};

        return { ...baseVars, ...widgetVars };
      },

      resetSkin: () => {
        get().setSkin('default');
        set({ widgetOverrides: new Map() });
      },

      applySkinToDOM: () => {
        const { currentSkin } = get();

        // Flatten and apply CSS variables
        const variables = flattenTokens(currentSkin.tokens);
        const allVariables = { ...variables, ...(currentSkin.variables || {}) };
        applyCSSVariables(allVariables);

        // Inject custom CSS if present
        if (currentSkin.css) {
          injectSkinCSS(currentSkin.id, currentSkin.css);
        }

        set({ cssInjected: true });
      },

      getSkin: (skinId: string) => {
        return get().skins.get(skinId);
      },
    }),
    {
      name: 'stickernest-skin-store',
      storage: mapStorage,
      partialize: (state) => ({
        currentSkinId: state.currentSkinId,
        widgetOverrides: state.widgetOverrides,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-apply skin after rehydration
        if (state) {
          // Re-initialize skins map with built-ins
          state.skins = initialSkins;

          // Get the current skin from the rehydrated ID
          const skin = state.skins.get(state.currentSkinId);
          if (skin) {
            state.currentSkin = skin;
          } else {
            state.currentSkinId = 'default';
            state.currentSkin = defaultSkin;
          }

          // Apply to DOM after a tick
          setTimeout(() => {
            state.applySkinToDOM();
          }, 0);
        }
      },
    }
  )
);

// ============================================
// Selector Hooks
// ============================================

/** Get current skin */
export const useCurrentSkin = () => useSkinStore(state => state.currentSkin);

/** Get current skin ID */
export const useCurrentSkinId = () => useSkinStore(state => state.currentSkinId);

/** Get all available skins */
export const useAvailableSkins = () => useSkinStore(state => Array.from(state.skins.values()));

/** Get skin actions */
export const useSkinActions = () => useSkinStore(state => ({
  setSkin: state.setSkin,
  registerSkin: state.registerSkin,
  unregisterSkin: state.unregisterSkin,
  setWidgetOverrides: state.setWidgetOverrides,
  clearWidgetOverrides: state.clearWidgetOverrides,
  resetSkin: state.resetSkin,
}));

export default useSkinStore;
