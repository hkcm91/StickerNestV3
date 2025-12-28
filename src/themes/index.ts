/**
 * StickerNest v2 - Theme System
 * Main exports for the theming system
 */

// Theme presets
export {
  themePresets,
  defaultTheme,
  darkBlueTheme,
  lightCleanTheme,
  getPresetById,
  getPresetByMode,
} from './presets';

// Theme types
export type {
  CustomTheme,
  ThemeMode,
  ThemeColors,
  ThemeEffects,
  GradientConfig,
  BackgroundConfig,
  RainbowAccentConfig,
  ThemeUpdate,
  ThemeExport,
  ThemePreset,
} from '../types/customTheme';

// Theme utilities
export {
  gradientToCss,
  rainbowGradientCss,
  isValidTheme,
  DEFAULT_RAINBOW_COLORS,
} from '../types/customTheme';
