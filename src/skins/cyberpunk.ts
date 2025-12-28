/**
 * StickerNest v2 - Cyberpunk Skin
 * A neon-infused dark theme with vibrant accents
 */

import type { Skin } from '../types/skin';

export const cyberpunkSkin: Skin = {
  id: 'cyberpunk',
  name: 'Cyberpunk',
  description: 'A neon-infused dark theme with vibrant accents',
  author: 'StickerNest Team',
  version: '1.0.0',
  tokens: {
    backgrounds: {
      'sn-bg-primary': '#0a0a0f',
      'sn-bg-secondary': '#12121a',
      'sn-bg-tertiary': '#1a1a25',
      'sn-bg-surface': '#0f0f18',
      'sn-bg-elevated': '#15151f',
      'sn-bg-canvas': '#0d0d12',
    },
    text: {
      'sn-text-primary': '#f0f0f5',
      'sn-text-secondary': '#a0a0b0',
      'sn-text-tertiary': '#707080',
      'sn-text-link': '#00ffff',
    },
    accents: {
      'sn-accent-primary': '#ff00ff',
      'sn-accent-secondary': '#00ffff',
      'sn-accent-tertiary': '#ff66ff',
      'sn-accent-hover': '#cc00cc',
    },
    borders: {
      'sn-border-primary': 'rgba(255, 0, 255, 0.3)',
      'sn-border-secondary': 'rgba(0, 255, 255, 0.2)',
      'sn-border-accent': '#ff00ff',
    },
    shadows: {
      'sn-shadow-sm': '0 0 4px rgba(255, 0, 255, 0.2)',
      'sn-shadow-md': '0 0 8px rgba(255, 0, 255, 0.3)',
      'sn-shadow-lg': '0 0 16px rgba(255, 0, 255, 0.4)',
      'sn-shadow-glow': '0 0 30px rgba(255, 0, 255, 0.5)',
    },
    custom: {
      'sn-success': '#00ff88',
      'sn-warning': '#ffff00',
      'sn-error': '#ff3366',
      'sn-info': '#00ccff',
      'sn-pipeline-port-number': '#00ffff',
      'sn-pipeline-port-string': '#00ff88',
      'sn-pipeline-port-event': '#ff00ff',
    },
  },
  variables: {},
  css: `
    /* Cyberpunk-specific styles */
    .sn-panel {
      border: 1px solid rgba(255, 0, 255, 0.3);
      box-shadow: 0 0 10px rgba(255, 0, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.05);
    }
    .sn-btn-primary {
      text-shadow: 0 0 10px currentColor;
    }
  `,
};

export default cyberpunkSkin;
