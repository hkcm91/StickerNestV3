/**
 * StickerNest v2 - Minimal Skin
 * A clean, light theme with minimal visual noise
 */

import type { Skin } from '../types/skin';

export const minimalSkin: Skin = {
  id: 'minimal',
  name: 'Minimal Light',
  description: 'A clean, light theme with minimal visual noise',
  author: 'StickerNest Team',
  version: '1.0.0',
  tokens: {
    backgrounds: {
      'sn-bg-primary': '#ffffff',
      'sn-bg-secondary': '#f8fafc',
      'sn-bg-tertiary': '#f1f5f9',
      'sn-bg-surface': '#ffffff',
      'sn-bg-elevated': '#ffffff',
      'sn-bg-canvas': '#f8fafc',
    },
    text: {
      'sn-text-primary': '#0f172a',
      'sn-text-secondary': '#475569',
      'sn-text-tertiary': '#64748b',
      'sn-text-muted': '#94a3b8',
    },
    accents: {
      'sn-accent-primary': '#3b82f6',
      'sn-accent-secondary': '#2563eb',
      'sn-accent-tertiary': '#60a5fa',
      'sn-accent-hover': '#1d4ed8',
    },
    borders: {
      'sn-border-primary': 'rgba(0, 0, 0, 0.1)',
      'sn-border-secondary': 'rgba(0, 0, 0, 0.05)',
    },
    shadows: {
      'sn-shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
      'sn-shadow-md': '0 4px 6px rgba(0, 0, 0, 0.07)',
      'sn-shadow-lg': '0 8px 16px rgba(0, 0, 0, 0.1)',
    },
  },
  variables: {},
};

export default minimalSkin;
