/**
 * StickerNest v2 - Dark Blue/Purple Theme
 * Deep blue to purple gradient with rainbow accents
 */

import { CustomTheme, DEFAULT_RAINBOW_COLORS } from '../../types/customTheme';

export const darkBlueTheme: CustomTheme = {
  id: 'dark-blue',
  name: 'Midnight Aurora',
  description: 'Deep blue to purple gradient with vibrant rainbow accents',
  author: 'StickerNest',
  version: '1.0.0',
  mode: 'dark',
  isCustom: false,
  isPreset: true,

  appBackground: {
    type: 'gradient',
    gradient: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#0a0a1a', position: 0 },
        { color: '#0f0a20', position: 35 },
        { color: '#150a28', position: 65 },
        { color: '#1a0a2e', position: 100 },
      ],
    },
  },

  colors: {
    background: {
      primary: '#0a0a1a',
      secondary: '#12122a',
      tertiary: '#1a1a3a',
      surface: '#0f0f24',
      elevated: '#1e1e42',
      overlay: 'rgba(5, 5, 15, 0.85)',
    },
    text: {
      primary: '#f0f4f8',
      secondary: '#a0aec0',
      tertiary: '#718096',
      muted: '#4a5568',
      inverse: '#0a0a1a',
      link: '#6b9fff',
    },
    accent: {
      primary: '#8b5cf6',
      secondary: '#6366f1',
      tertiary: '#a78bfa',
      hover: '#7c3aed',
      active: '#6d28d9',
    },
    border: {
      primary: 'rgba(255, 255, 255, 0.08)',
      secondary: 'rgba(255, 255, 255, 0.04)',
      accent: '#8b5cf6',
      focus: '#6366f1',
    },
    semantic: {
      success: '#22c55e',
      successBg: 'rgba(34, 197, 94, 0.15)',
      warning: '#f59e0b',
      warningBg: 'rgba(245, 158, 11, 0.15)',
      error: '#ef4444',
      errorBg: 'rgba(239, 68, 68, 0.15)',
      info: '#3b82f6',
      infoBg: 'rgba(59, 130, 246, 0.15)',
    },
  },

  rainbow: {
    enabled: true,
    colors: DEFAULT_RAINBOW_COLORS,
    animationSpeed: 8000,
    animated: false,
  },

  effects: {
    glassBlur: 12,
    glassOpacity: 0.8,
    shadowIntensity: 1.2,
    radiusScale: 1,
    glowEnabled: true,
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },

  customVariables: {
    '--sn-bg-gradient': 'linear-gradient(135deg, #0a0a1a 0%, #0f0a20 35%, #150a28 65%, #1a0a2e 100%)',
    '--sn-accent-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    '--sn-glass-bg': 'rgba(15, 15, 36, 0.8)',
    '--sn-glass-border': 'rgba(255, 255, 255, 0.1)',
    '--sn-shadow-glow': '0 0 24px rgba(139, 92, 246, 0.4)',
  },
};

export default darkBlueTheme;
