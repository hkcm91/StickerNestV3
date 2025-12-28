/**
 * StickerNest v2 - Skins Index
 * Exports all built-in skins
 */

import { defaultSkin } from './default';
import { minimalSkin } from './minimal';
import { cozySkin } from './cozy';
import { cyberpunkSkin } from './cyberpunk';
import type { Skin } from '../types/skin';

// Export individual skins
export { defaultSkin } from './default';
export { minimalSkin } from './minimal';
export { cozySkin } from './cozy';
export { cyberpunkSkin } from './cyberpunk';

// All built-in skins as an array
export const builtInSkins: Skin[] = [
  defaultSkin,
  minimalSkin,
  cozySkin,
  cyberpunkSkin,
];

// Skin map for quick lookup
export const skinMap: Map<string, Skin> = new Map(
  builtInSkins.map(skin => [skin.id, skin])
);

// Get a skin by ID
export function getSkinById(id: string): Skin | undefined {
  return skinMap.get(id);
}

// Default export
export default builtInSkins;
