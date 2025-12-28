/**
 * StickerNest v2 - Theme Presets
 * Export all built-in theme presets
 */

import { CustomTheme } from '../../types/customTheme';
import { darkBlueTheme } from './darkBlue';
import { lightCleanTheme } from './lightClean';
import { bubblesTheme } from './bubblesTheme';
import { autumnTheme } from './autumnTheme';

export const themePresets: CustomTheme[] = [
  darkBlueTheme,
  lightCleanTheme,
  bubblesTheme,
  autumnTheme,
];

export const defaultTheme = darkBlueTheme;

export { darkBlueTheme, lightCleanTheme, bubblesTheme, autumnTheme };

export function getPresetById(id: string): CustomTheme | undefined {
  return themePresets.find(theme => theme.id === id);
}

export function getPresetByMode(mode: 'dark' | 'light'): CustomTheme {
  return themePresets.find(theme => theme.mode === mode) || darkBlueTheme;
}

/**
 * Get all parallax-enabled theme presets
 */
export function getParallaxThemes(): CustomTheme[] {
  return themePresets.filter(theme => theme.appBackground.type === 'parallax');
}
