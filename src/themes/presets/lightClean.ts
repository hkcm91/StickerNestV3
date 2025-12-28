/**
 * StickerNest v2 - Light Clean Theme
 * Clean white/light grey with rainbow accents
 */

import { CustomTheme, DEFAULT_RAINBOW_COLORS } from '../../types/customTheme';

export const lightCleanTheme: CustomTheme = {
  id: 'light-clean',
  name: 'Crystal Light',
  description: 'Clean and minimal light theme with rainbow accents',
  author: 'StickerNest',
  version: '1.0.0',
  mode: 'light',
  isCustom: false,
  isPreset: true,

  appBackground: {
    type: 'gradient',
    gradient: {
      type: 'linear',
      angle: 180,
      stops: [
        { color: '#ffffff', position: 0 },
        { color: '#f8f9fc', position: 50 },
        { color: '#f0f2f8', position: 100 },
      ],
    },
  },

  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f7f8fa',
      tertiary: '#eef0f4',
      surface: '#fafbfc',
      elevated: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.4)',
    },
    text: {
      primary: '#1a1a2e',
      secondary: '#4a5568',
      tertiary: '#718096',
      muted: '#a0aec0',
      inverse: '#ffffff',
      link: '#4f46e5',
    },
    accent: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      tertiary: '#a78bfa',
      hover: '#4f46e5',
      active: '#4338ca',
    },
    border: {
      primary: 'rgba(0, 0, 0, 0.08)',
      secondary: 'rgba(0, 0, 0, 0.04)',
      accent: '#6366f1',
      focus: '#8b5cf6',
    },
    semantic: {
      success: '#22c55e',
      successBg: 'rgba(34, 197, 94, 0.1)',
      warning: '#f59e0b',
      warningBg: 'rgba(245, 158, 11, 0.1)',
      error: '#ef4444',
      errorBg: 'rgba(239, 68, 68, 0.1)',
      info: '#3b82f6',
      infoBg: 'rgba(59, 130, 246, 0.1)',
    },
  },

  rainbow: {
    enabled: true,
    colors: {
      // Slightly more saturated for light backgrounds
      red: '#ff5252',
      orange: '#ff9100',
      yellow: '#ffc400',
      green: '#00e676',
      cyan: '#00e5ff',
      blue: '#448aff',
      purple: '#7c4dff',
      pink: '#ff4081',
    },
    animationSpeed: 8000,
    animated: false,
  },

  effects: {
    glassBlur: 16,
    glassOpacity: 0.9,
    shadowIntensity: 0.8,
    radiusScale: 1,
    glowEnabled: true,
    glowColor: 'rgba(99, 102, 241, 0.2)',
  },

  customVariables: {
    '--sn-bg-gradient': 'linear-gradient(180deg, #ffffff 0%, #f8f9fc 50%, #f0f2f8 100%)',
    '--sn-accent-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    '--sn-glass-bg': 'rgba(255, 255, 255, 0.9)',
    '--sn-glass-border': 'rgba(0, 0, 0, 0.08)',
    '--sn-shadow-glow': '0 0 24px rgba(99, 102, 241, 0.2)',
  },
};

export default lightCleanTheme;
