/**
 * StickerNest v2 - Custom Theme Store
 * Zustand store for managing customizable themes
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CustomTheme,
  ThemeMode,
  ThemeUpdate,
  ThemeExport,
  GradientConfig,
} from '../types/customTheme';
import { gradientToCss, isValidTheme } from '../types/customTheme';
import { themePresets, defaultTheme, getPresetByMode } from '../themes/presets';

// ============================================
// Types
// ============================================

interface ThemeState {
  /** Currently active theme ID */
  currentThemeId: string;
  /** Currently active theme object */
  currentTheme: CustomTheme;
  /** Theme mode preference (follows current theme or forced) */
  preferredMode: ThemeMode | 'system';
  /** System color scheme */
  systemMode: ThemeMode;
  /** All preset themes */
  presets: CustomTheme[];
  /** User-created custom themes */
  customThemes: CustomTheme[];
  /** Whether theme has been applied to DOM */
  isApplied: boolean;
}

interface ThemeActions {
  /** Set the active theme by ID */
  setTheme: (themeId: string) => void;
  /** Set preferred color mode */
  setPreferredMode: (mode: ThemeMode | 'system') => void;
  /** Toggle between light and dark mode */
  toggleMode: () => void;
  /** Create a new custom theme from a preset */
  createTheme: (basePresetId: string, name: string) => CustomTheme;
  /** Update a custom theme */
  updateTheme: (themeId: string, updates: ThemeUpdate) => void;
  /** Delete a custom theme */
  deleteTheme: (themeId: string) => void;
  /** Duplicate a theme */
  duplicateTheme: (themeId: string, newName: string) => CustomTheme;
  /** Export a theme as JSON */
  exportTheme: (themeId: string) => ThemeExport | null;
  /** Import a theme from JSON */
  importTheme: (themeExport: ThemeExport) => CustomTheme | null;
  /** Reset to default theme */
  resetToDefault: () => void;
  /** Apply the current theme to DOM */
  applyThemeToDOM: () => void;
  /** Get a theme by ID */
  getTheme: (themeId: string) => CustomTheme | undefined;
  /** Get all available themes */
  getAllThemes: () => CustomTheme[];
  /** Update system mode (called on system preference change) */
  updateSystemMode: (mode: ThemeMode) => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique ID for a new theme
 */
function generateThemeId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert CustomTheme to CSS variables
 */
function themeToCSSVariables(theme: CustomTheme): Record<string, string> {
  const vars: Record<string, string> = {};

  // Theme mode
  vars['--sn-theme-mode'] = theme.mode;

  // Background
  if (theme.appBackground.type === 'solid' && theme.appBackground.color) {
    vars['--sn-bg-primary'] = theme.appBackground.color;
    vars['--sn-bg-gradient'] = theme.appBackground.color;
  } else if (theme.appBackground.type === 'gradient' && theme.appBackground.gradient) {
    vars['--sn-bg-gradient'] = gradientToCss(theme.appBackground.gradient);
    const firstStop = theme.appBackground.gradient.stops[0]?.color || '#0a0a1a';
    const lastStop = theme.appBackground.gradient.stops[theme.appBackground.gradient.stops.length - 1]?.color || '#1a0a2e';
    vars['--sn-bg-primary'] = firstStop;
    vars['--sn-bg-gradient-start'] = firstStop;
    vars['--sn-bg-gradient-end'] = lastStop;
  }

  // Background colors
  vars['--sn-bg-primary'] = theme.colors.background.primary;
  vars['--sn-bg-secondary'] = theme.colors.background.secondary;
  vars['--sn-bg-tertiary'] = theme.colors.background.tertiary;
  vars['--sn-bg-surface'] = theme.colors.background.surface;
  vars['--sn-bg-elevated'] = theme.colors.background.elevated;
  vars['--sn-bg-overlay'] = theme.colors.background.overlay;

  // Text colors
  vars['--sn-text-primary'] = theme.colors.text.primary;
  vars['--sn-text-secondary'] = theme.colors.text.secondary;
  vars['--sn-text-tertiary'] = theme.colors.text.tertiary;
  vars['--sn-text-muted'] = theme.colors.text.muted;
  vars['--sn-text-inverse'] = theme.colors.text.inverse;
  vars['--sn-text-link'] = theme.colors.text.link;

  // Accent colors
  vars['--sn-accent-primary'] = theme.colors.accent.primary;
  vars['--sn-accent-secondary'] = theme.colors.accent.secondary;
  vars['--sn-accent-tertiary'] = theme.colors.accent.tertiary;
  vars['--sn-accent-hover'] = theme.colors.accent.hover;
  vars['--sn-accent-active'] = theme.colors.accent.active;
  vars['--sn-accent-gradient'] = `linear-gradient(135deg, ${theme.colors.accent.secondary} 0%, ${theme.colors.accent.primary} 50%, ${theme.colors.accent.tertiary} 100%)`;

  // Border colors
  vars['--sn-border-primary'] = theme.colors.border.primary;
  vars['--sn-border-secondary'] = theme.colors.border.secondary;
  vars['--sn-border-accent'] = theme.colors.border.accent;
  vars['--sn-border-focus'] = theme.colors.border.focus;

  // Semantic colors
  vars['--sn-success'] = theme.colors.semantic.success;
  vars['--sn-success-bg'] = theme.colors.semantic.successBg;
  vars['--sn-warning'] = theme.colors.semantic.warning;
  vars['--sn-warning-bg'] = theme.colors.semantic.warningBg;
  vars['--sn-error'] = theme.colors.semantic.error;
  vars['--sn-error-bg'] = theme.colors.semantic.errorBg;
  vars['--sn-info'] = theme.colors.semantic.info;
  vars['--sn-info-bg'] = theme.colors.semantic.infoBg;

  // Rainbow colors
  if (theme.rainbow.enabled) {
    vars['--sn-rainbow-red'] = theme.rainbow.colors.red;
    vars['--sn-rainbow-orange'] = theme.rainbow.colors.orange;
    vars['--sn-rainbow-yellow'] = theme.rainbow.colors.yellow;
    vars['--sn-rainbow-green'] = theme.rainbow.colors.green;
    vars['--sn-rainbow-cyan'] = theme.rainbow.colors.cyan;
    vars['--sn-rainbow-blue'] = theme.rainbow.colors.blue;
    vars['--sn-rainbow-purple'] = theme.rainbow.colors.purple;
    vars['--sn-rainbow-pink'] = theme.rainbow.colors.pink;
  }

  // Glass effects
  vars['--sn-glass-blur'] = `${theme.effects.glassBlur}px`;
  const bgOpacity = theme.effects.glassOpacity;
  if (theme.mode === 'dark') {
    vars['--sn-glass-bg'] = `rgba(15, 15, 36, ${bgOpacity})`;
    vars['--sn-glass-border'] = `rgba(255, 255, 255, ${bgOpacity * 0.125})`;
  } else {
    vars['--sn-glass-bg'] = `rgba(255, 255, 255, ${bgOpacity})`;
    vars['--sn-glass-border'] = `rgba(0, 0, 0, ${bgOpacity * 0.1})`;
  }

  // Glow effects
  if (theme.effects.glowEnabled && theme.effects.glowColor) {
    vars['--sn-shadow-glow'] = `0 0 24px ${theme.effects.glowColor}`;
  }

  // Canvas glass effects
  if (theme.effects.canvasGlass?.enabled) {
    vars['--sn-canvas-glass-blur'] = `${theme.effects.canvasGlass.blur}px`;
    vars['--sn-canvas-glass-tint'] = theme.effects.canvasGlass.tint;
    vars['--sn-canvas-glass-border'] = theme.effects.canvasGlass.borderColor;
    vars['--sn-canvas-glass-border-width'] = `${theme.effects.canvasGlass.borderWidth}px`;
    if (theme.effects.canvasGlass.innerShadow) {
      vars['--sn-canvas-glass-inner-shadow'] = theme.effects.canvasGlass.innerShadow;
    }
  }

  // Navbar glass effects
  if (theme.effects.navbarGlass?.enabled) {
    vars['--sn-navbar-glass-blur'] = `${theme.effects.navbarGlass.blur}px`;
    vars['--sn-navbar-glass-tint'] = theme.effects.navbarGlass.tint;
    vars['--sn-navbar-glass-border'] = theme.effects.navbarGlass.borderColor;
  }

  // Parallax settings from custom variables
  if (theme.appBackground.type === 'parallax' && theme.appBackground.parallax) {
    vars['--sn-parallax-intensity'] = String(theme.appBackground.parallax.intensity ?? 0.5);
    vars['--sn-parallax-speed'] = String(theme.appBackground.parallax.animationSpeed ?? 1);
  }

  // Radius scaling
  const radiusScale = theme.effects.radiusScale;
  vars['--sn-radius-sm'] = `${6 * radiusScale}px`;
  vars['--sn-radius-md'] = `${8 * radiusScale}px`;
  vars['--sn-radius-lg'] = `${12 * radiusScale}px`;
  vars['--sn-radius-xl'] = `${16 * radiusScale}px`;
  vars['--sn-radius-2xl'] = `${20 * radiusScale}px`;

  // Custom variables from theme
  if (theme.customVariables) {
    Object.assign(vars, theme.customVariables);
  }

  return vars;
}

/**
 * Apply CSS variables to document root
 */
function applyCSSVariables(variables: Record<string, string>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Set theme data attribute on document
 */
function setThemeAttribute(mode: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', mode);
}

/**
 * Inject custom CSS from theme
 */
function injectThemeCSS(themeId: string, css?: string): void {
  // Remove existing theme CSS
  const existingStyle = document.getElementById('theme-custom-css');
  if (existingStyle) {
    existingStyle.remove();
  }

  if (!css) return;

  const style = document.createElement('style');
  style.id = 'theme-custom-css';
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Detect system color scheme preference
 */
function getSystemMode(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

// ============================================
// Store Creation
// ============================================

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      // Initial state
      currentThemeId: defaultTheme.id,
      currentTheme: defaultTheme,
      preferredMode: 'system',
      systemMode: getSystemMode(),
      presets: themePresets,
      customThemes: [],
      isApplied: false,

      // Actions
      setTheme: (themeId: string) => {
        const theme = get().getTheme(themeId);
        if (!theme) {
          console.warn(`[ThemeStore] Theme "${themeId}" not found`);
          return;
        }

        set({
          currentThemeId: themeId,
          currentTheme: theme,
        });

        get().applyThemeToDOM();
      },

      setPreferredMode: (mode: ThemeMode | 'system') => {
        set({ preferredMode: mode });

        // If switching to a specific mode, find appropriate theme
        if (mode !== 'system') {
          const currentTheme = get().currentTheme;
          if (currentTheme.mode !== mode) {
            // Try to find a theme with the preferred mode
            const alternateTheme = get().getAllThemes().find(t => t.mode === mode);
            if (alternateTheme) {
              get().setTheme(alternateTheme.id);
            }
          }
        } else {
          // System mode - switch to theme matching system preference
          const systemMode = get().systemMode;
          const currentTheme = get().currentTheme;
          if (currentTheme.mode !== systemMode) {
            const alternateTheme = get().getAllThemes().find(t => t.mode === systemMode);
            if (alternateTheme) {
              get().setTheme(alternateTheme.id);
            }
          }
        }
      },

      toggleMode: () => {
        const currentMode = get().currentTheme.mode;
        const newMode = currentMode === 'dark' ? 'light' : 'dark';
        const alternateTheme = get().getAllThemes().find(t => t.mode === newMode);
        if (alternateTheme) {
          get().setTheme(alternateTheme.id);
        }
      },

      createTheme: (basePresetId: string, name: string) => {
        const baseTheme = get().getTheme(basePresetId) || defaultTheme;

        const newTheme: CustomTheme = {
          ...JSON.parse(JSON.stringify(baseTheme)),
          id: generateThemeId(),
          name,
          isCustom: true,
          isPreset: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set(state => ({
          customThemes: [...state.customThemes, newTheme],
        }));

        return newTheme;
      },

      updateTheme: (themeId: string, updates: ThemeUpdate) => {
        set(state => {
          const customThemes = state.customThemes.map(theme => {
            if (theme.id === themeId) {
              const updatedTheme = {
                ...theme,
                ...updates,
                updatedAt: Date.now(),
              };
              // If this is the current theme, update it too
              if (state.currentThemeId === themeId) {
                setTimeout(() => get().applyThemeToDOM(), 0);
                return updatedTheme;
              }
              return updatedTheme;
            }
            return theme;
          });

          // Also update currentTheme if it's the one being edited
          if (state.currentThemeId === themeId) {
            const updatedTheme = customThemes.find(t => t.id === themeId);
            if (updatedTheme) {
              return {
                customThemes,
                currentTheme: updatedTheme,
              };
            }
          }

          return { customThemes };
        });
      },

      deleteTheme: (themeId: string) => {
        const theme = get().getTheme(themeId);
        if (!theme || !theme.isCustom) {
          console.warn('[ThemeStore] Cannot delete preset themes');
          return;
        }

        set(state => ({
          customThemes: state.customThemes.filter(t => t.id !== themeId),
        }));

        // If deleted theme was active, switch to default
        if (get().currentThemeId === themeId) {
          get().setTheme(defaultTheme.id);
        }
      },

      duplicateTheme: (themeId: string, newName: string) => {
        const originalTheme = get().getTheme(themeId);
        if (!originalTheme) {
          throw new Error(`Theme "${themeId}" not found`);
        }

        const newTheme: CustomTheme = {
          ...JSON.parse(JSON.stringify(originalTheme)),
          id: generateThemeId(),
          name: newName,
          isCustom: true,
          isPreset: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set(state => ({
          customThemes: [...state.customThemes, newTheme],
        }));

        return newTheme;
      },

      exportTheme: (themeId: string) => {
        const theme = get().getTheme(themeId);
        if (!theme) return null;

        return {
          version: '1.0' as const,
          exportedAt: Date.now(),
          theme,
        };
      },

      importTheme: (themeExport: ThemeExport) => {
        if (themeExport.version !== '1.0') {
          console.warn('[ThemeStore] Unsupported theme export version');
          return null;
        }

        if (!isValidTheme(themeExport.theme)) {
          console.warn('[ThemeStore] Invalid theme data');
          return null;
        }

        const importedTheme: CustomTheme = {
          ...themeExport.theme,
          id: generateThemeId(),
          isCustom: true,
          isPreset: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set(state => ({
          customThemes: [...state.customThemes, importedTheme],
        }));

        return importedTheme;
      },

      resetToDefault: () => {
        get().setTheme(defaultTheme.id);
      },

      applyThemeToDOM: () => {
        const { currentTheme, isApplied, currentThemeId } = get();

        // Set data-theme attribute
        setThemeAttribute(currentTheme.mode);

        // Convert theme to CSS variables and apply
        const variables = themeToCSSVariables(currentTheme);
        applyCSSVariables(variables);

        // Inject custom CSS if present
        injectThemeCSS(currentTheme.id, currentTheme.customCss);

        // Only update state if not already applied (prevents unnecessary re-renders)
        if (!isApplied) {
          set({ isApplied: true });
        }
      },

      getTheme: (themeId: string) => {
        const { presets, customThemes } = get();
        return [...presets, ...customThemes].find(t => t.id === themeId);
      },

      getAllThemes: () => {
        const { presets, customThemes } = get();
        return [...presets, ...customThemes];
      },

      updateSystemMode: (mode: ThemeMode) => {
        set({ systemMode: mode });

        // If in system mode, switch theme accordingly
        if (get().preferredMode === 'system') {
          const currentTheme = get().currentTheme;
          if (currentTheme.mode !== mode) {
            const alternateTheme = get().getAllThemes().find(t => t.mode === mode);
            if (alternateTheme) {
              get().setTheme(alternateTheme.id);
            }
          }
        }
      },
    }),
    {
      name: 'stickernest-theme-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentThemeId: state.currentThemeId,
        preferredMode: state.preferredMode,
        customThemes: state.customThemes,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Note: presets are NOT persisted (excluded in partialize), so they're already
          // initialized from the default state. No need to re-assign.

          // Find the current theme directly from arrays (don't use getTheme which calls get())
          // Use state.presets which is already initialized, combined with persisted customThemes
          const allThemes = [...state.presets, ...state.customThemes];
          const theme = allThemes.find(t => t.id === state.currentThemeId);
          if (theme) {
            state.currentTheme = theme;
          } else {
            state.currentThemeId = defaultTheme.id;
            state.currentTheme = defaultTheme;
          }

          // Apply theme after store is fully initialized
          // Use getState() instead of captured state reference
          setTimeout(() => {
            useThemeStore.getState().applyThemeToDOM();
          }, 0);
        }
      },
    }
  )
);

// ============================================
// System Theme Listener
// ============================================

if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (e: MediaQueryListEvent) => {
    useThemeStore.getState().updateSystemMode(e.matches ? 'dark' : 'light');
  };

  // Add listener
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
  }
}

// ============================================
// Selector Hooks
// ============================================

/** Get current theme */
export const useCurrentTheme = () => useThemeStore(state => state.currentTheme);

/** Get current theme ID */
export const useCurrentThemeId = () => useThemeStore(state => state.currentThemeId);

/** Get current theme mode */
export const useThemeMode = () => useThemeStore(state => state.currentTheme.mode);

/** Get all available themes */
export const useAllThemes = () => {
  const presets = useThemeStore(state => state.presets);
  const customThemes = useThemeStore(state => state.customThemes);
  return [...presets, ...customThemes];
};

/** Get preset themes only */
export const usePresetThemes = () => useThemeStore(state => state.presets);

/** Get custom themes only */
export const useCustomThemes = () => useThemeStore(state => state.customThemes);

/** Get theme actions - uses shallow comparison to prevent re-renders */
export const useThemeActions = () => {
  const setTheme = useThemeStore(state => state.setTheme);
  const setPreferredMode = useThemeStore(state => state.setPreferredMode);
  const toggleMode = useThemeStore(state => state.toggleMode);
  const createTheme = useThemeStore(state => state.createTheme);
  const updateTheme = useThemeStore(state => state.updateTheme);
  const deleteTheme = useThemeStore(state => state.deleteTheme);
  const duplicateTheme = useThemeStore(state => state.duplicateTheme);
  const exportTheme = useThemeStore(state => state.exportTheme);
  const importTheme = useThemeStore(state => state.importTheme);
  const resetToDefault = useThemeStore(state => state.resetToDefault);

  return {
    setTheme,
    setPreferredMode,
    toggleMode,
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
    exportTheme,
    importTheme,
    resetToDefault,
  };
};

/** Check if rainbow accents are enabled */
export const useRainbowEnabled = () => useThemeStore(state => state.currentTheme.rainbow.enabled);

/** Get rainbow colors */
export const useRainbowColors = () => useThemeStore(state => state.currentTheme.rainbow.colors);

export default useThemeStore;
