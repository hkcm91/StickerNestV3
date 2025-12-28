/**
 * StickerNest v2 - Cozy Skin
 * A warm, comfortable theme with soft colors
 */

import type { Skin } from '../types/skin';

export const cozySkin: Skin = {
  id: 'cozy',
  name: 'Cozy',
  description: 'A warm, comfortable theme with soft colors and rounded edges',
  author: 'StickerNest Team',
  version: '1.0.0',
  tokens: {
    backgrounds: {
      'sn-bg-primary': '#1a1512',
      'sn-bg-secondary': '#2a221c',
      'sn-bg-tertiary': '#3a3028',
      'sn-bg-surface': '#241e18',
      'sn-bg-elevated': '#322920',
      'sn-bg-canvas': '#f5ebe0',
      'sn-bg-widget': '#faf7f2',
    },
    text: {
      'sn-text-primary': '#f5ebe0',
      'sn-text-secondary': '#d4c4b0',
      'sn-text-tertiary': '#a89880',
      'sn-text-muted': '#8a7a68',
    },
    accents: {
      'sn-accent-primary': '#d4a574',
      'sn-accent-secondary': '#c4956a',
      'sn-accent-tertiary': '#e4b584',
      'sn-accent-hover': '#b48560',
    },
    borders: {
      'sn-border-primary': 'rgba(212, 165, 116, 0.2)',
      'sn-border-secondary': 'rgba(212, 165, 116, 0.1)',
      'sn-radius-sm': '6px',
      'sn-radius-md': '10px',
      'sn-radius-lg': '14px',
      'sn-radius-xl': '18px',
    },
    shadows: {
      'sn-shadow-sm': '0 2px 4px rgba(26, 21, 18, 0.15)',
      'sn-shadow-md': '0 4px 8px rgba(26, 21, 18, 0.2)',
      'sn-shadow-lg': '0 8px 20px rgba(26, 21, 18, 0.25)',
      'sn-shadow-glow': '0 0 20px rgba(212, 165, 116, 0.2)',
    },
    custom: {
      'sn-success': '#7cb342',
      'sn-warning': '#ffa726',
      'sn-error': '#e57373',
      'sn-info': '#64b5f6',
    },
  },
  variables: {},
};

export default cozySkin;
