/**
 * StickerNest v2 - Skin Types
 * Type definitions for the skinning system
 */

/**
 * A single CSS variable override
 */
export interface SkinToken {
  /** CSS variable name (without --) */
  name: string;
  /** CSS value */
  value: string;
}

/**
 * A collection of token overrides grouped by category
 */
export interface SkinTokens {
  /** Background color overrides */
  backgrounds?: Record<string, string>;
  /** Text color overrides */
  text?: Record<string, string>;
  /** Accent color overrides */
  accents?: Record<string, string>;
  /** Border/radius overrides */
  borders?: Record<string, string>;
  /** Shadow overrides */
  shadows?: Record<string, string>;
  /** Typography overrides */
  typography?: Record<string, string>;
  /** Spacing overrides */
  spacing?: Record<string, string>;
  /** Custom tokens */
  custom?: Record<string, string>;
}

/**
 * Complete skin definition
 */
export interface Skin {
  /** Unique skin identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description?: string;
  /** Skin author */
  author?: string;
  /** Skin version */
  version?: string;
  /** Preview image URL */
  preview?: string;
  /** Base theme this extends (for inheritance) */
  extends?: string;
  /** Token overrides */
  tokens: SkinTokens;
  /** Raw CSS variable overrides (for advanced use) */
  variables?: Record<string, string>;
  /** Skin-specific CSS (injected as style tag) */
  css?: string;
}

/**
 * Widget-level skin configuration
 */
export interface WidgetSkinConfig {
  /** Skin ID to apply */
  skinId?: string;
  /** Token overrides specific to this widget */
  overrides?: Record<string, string>;
  /** Skin slots this widget exposes */
  slots?: string[];
}

/**
 * Skin slot definition in manifest
 */
export interface SkinSlot {
  /** Slot name */
  name: string;
  /** Slot description */
  description?: string;
  /** Default value */
  defaultValue?: string;
  /** Value type (color, size, etc.) */
  type?: 'color' | 'size' | 'font' | 'shadow' | 'radius' | 'custom';
  /** CSS variable name this slot maps to */
  variable?: string;
}

/**
 * Skin context state
 */
export interface SkinContextState {
  /** Currently active global skin */
  currentSkin: Skin | null;
  /** All available skins */
  availableSkins: Skin[];
  /** Widget-specific skin overrides */
  widgetOverrides: Map<string, Record<string, string>>;
  /** Whether skins are loading */
  isLoading: boolean;
}

/**
 * Skin context actions
 */
export interface SkinContextActions {
  /** Set the global skin */
  setSkin: (skinId: string) => void;
  /** Register a new skin */
  registerSkin: (skin: Skin) => void;
  /** Unregister a skin */
  unregisterSkin: (skinId: string) => void;
  /** Set widget-specific overrides */
  setWidgetOverrides: (widgetId: string, overrides: Record<string, string>) => void;
  /** Clear widget-specific overrides */
  clearWidgetOverrides: (widgetId: string) => void;
  /** Get computed styles for a widget */
  getWidgetStyles: (widgetId: string) => Record<string, string>;
  /** Reset to default skin */
  resetSkin: () => void;
}

export type SkinContext = SkinContextState & SkinContextActions;
