/**
 * StickerNest v2 - Default Skin
 * The base dark theme that ships with StickerNest
 */

import type { Skin } from '../types/skin';

export const defaultSkin: Skin = {
  id: 'default',
  name: 'Default Dark',
  description: 'The default StickerNest dark theme',
  author: 'StickerNest Team',
  version: '1.0.0',
  tokens: {
    backgrounds: {
      'sn-bg-primary': '#0f0f19',
      'sn-bg-secondary': '#1a1a2e',
      'sn-bg-tertiary': '#252542',
      'sn-bg-surface': '#16162a',
      'sn-bg-elevated': '#1e1e38',
    },
    text: {
      'sn-text-primary': '#e2e8f0',
      'sn-text-secondary': '#94a3b8',
      'sn-text-tertiary': '#64748b',
    },
    accents: {
      'sn-accent-primary': '#8b5cf6',
      'sn-accent-secondary': '#6366f1',
      'sn-accent-tertiary': '#a78bfa',
    },
  },
  variables: {},
};

export default defaultSkin;
