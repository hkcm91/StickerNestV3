/**
 * StickerNest v2 - Autumn Theme
 * Warm amber/orange color scheme with fireflies, autumn leaves, and cozy glow effects.
 * Inspired by magical autumn forests and warm evening light.
 */

import { CustomTheme, DEFAULT_RAINBOW_COLORS } from '../../types/customTheme';

export const autumnTheme: CustomTheme = {
  id: 'autumn-fireflies',
  name: 'Autumn Fireflies',
  description: 'Warm autumn gradient with glowing fireflies and floating leaves',
  author: 'StickerNest',
  version: '1.0.0',
  mode: 'dark',
  isCustom: false,
  isPreset: true,

  appBackground: {
    type: 'parallax',
    parallax: {
      enabled: true,
      intensity: 0.5,
      mouseParallax: true,
      scrollParallax: false,
      animationSpeed: 0.7,
      backgroundBlur: 0,
      baseGradient: {
        type: 'radial',
        stops: [
          { color: '#1a0f0a', position: 0 },      // Deep brown-black center
          { color: '#2d1810', position: 30 },     // Dark brown
          { color: '#3d2218', position: 50 },     // Warm brown
          { color: '#4a2c1c', position: 70 },     // Amber brown
          { color: '#1a0f0a', position: 100 },    // Deep brown edge
        ],
      },
      layers: [
        // Background warm bokeh (ambient glow)
        {
          id: 'bokeh-warm',
          type: 'particles',
          depth: 0.1,
          opacity: 0.5,
          blendMode: 'screen',
          particles: {
            type: 'bokeh',
            count: 20,
            sizeMin: 100,
            sizeMax: 250,
            colors: [
              'rgba(255, 170, 100, 0.3)',
              'rgba(255, 140, 66, 0.25)',
              'rgba(255, 200, 150, 0.2)',
              'rgba(200, 100, 50, 0.2)',
            ],
            opacityMin: 0.15,
            opacityMax: 0.35,
            speed: 0.2,
            glow: true,
            glowIntensity: 0.8,
            direction: 'float',
          },
          animation: {
            type: 'pulse',
            duration: 8000,
            easing: 'ease-in-out',
          },
        },
        // Leaf silhouettes (decorative shapes)
        {
          id: 'leaves-back',
          type: 'shapes',
          depth: 0.2,
          opacity: 0.15,
          blendMode: 'overlay',
          shapes: {
            type: 'leaf',
            count: 8,
            sizeMin: 80,
            sizeMax: 180,
            colors: [
              'rgba(60, 30, 15, 0.6)',
              'rgba(80, 40, 20, 0.5)',
              'rgba(100, 50, 25, 0.4)',
            ],
            opacityMin: 0.1,
            opacityMax: 0.25,
            rotate: true,
            blur: 3,
          },
        },
        // Mid-layer fireflies (medium glow)
        {
          id: 'fireflies-mid',
          type: 'particles',
          depth: 0.5,
          opacity: 0.8,
          blendMode: 'screen',
          particles: {
            type: 'fireflies',
            count: 30,
            sizeMin: 3,
            sizeMax: 8,
            colors: [
              '#ffd700',   // Gold
              '#ffb347',   // Orange
              '#ffa500',   // Amber
              '#ff8c00',   // Dark orange
              '#ffe066',   // Light gold
            ],
            opacityMin: 0.4,
            opacityMax: 1.0,
            speed: 0.6,
            glow: true,
            glowIntensity: 1.0,
            direction: 'random',
            interactive: true,
          },
          animation: {
            type: 'drift',
            duration: 15000,
            easing: 'ease-in-out',
          },
        },
        // Floating leaves (foreground)
        {
          id: 'leaves-front',
          type: 'shapes',
          depth: 0.7,
          opacity: 0.3,
          shapes: {
            type: 'leaf',
            count: 6,
            sizeMin: 40,
            sizeMax: 100,
            colors: [
              'rgba(180, 90, 40, 0.5)',
              'rgba(200, 100, 50, 0.4)',
              'rgba(220, 120, 60, 0.4)',
              'rgba(160, 80, 30, 0.5)',
            ],
            opacityMin: 0.2,
            opacityMax: 0.4,
            rotate: true,
            blur: 1,
          },
        },
        // Foreground fireflies (bright, close)
        {
          id: 'fireflies-front',
          type: 'particles',
          depth: 0.9,
          opacity: 1.0,
          blendMode: 'screen',
          particles: {
            type: 'fireflies',
            count: 15,
            sizeMin: 4,
            sizeMax: 12,
            colors: [
              '#fff3cd',   // Warm white
              '#ffd700',   // Gold
              '#ffb347',   // Orange
            ],
            opacityMin: 0.6,
            opacityMax: 1.0,
            speed: 0.8,
            glow: true,
            glowIntensity: 1.2,
            direction: 'random',
            interactive: true,
          },
          animation: {
            type: 'drift',
            duration: 10000,
            easing: 'ease-in-out',
          },
        },
        // Ambient dust particles
        {
          id: 'dust',
          type: 'particles',
          depth: 0.4,
          opacity: 0.4,
          particles: {
            type: 'dust',
            count: 50,
            sizeMin: 1,
            sizeMax: 3,
            colors: ['#ffd7a8', '#e8c39e', '#d4a574'],
            opacityMin: 0.2,
            opacityMax: 0.5,
            speed: 0.3,
            glow: false,
            direction: 'float',
          },
        },
      ],
    },
  },

  colors: {
    background: {
      primary: '#1a0f0a',
      secondary: '#2d1810',
      tertiary: '#3d2218',
      surface: '#251410',
      elevated: '#3a2015',
      overlay: 'rgba(26, 15, 10, 0.92)',
    },
    text: {
      primary: '#fff3e0',
      secondary: '#d4a574',
      tertiary: '#b8896a',
      muted: '#8b6550',
      inverse: '#1a0f0a',
      link: '#ffa726',
    },
    accent: {
      primary: '#ff9800',
      secondary: '#ffa726',
      tertiary: '#ffb74d',
      hover: '#f57c00',
      active: '#e65100',
    },
    border: {
      primary: 'rgba(255, 152, 0, 0.2)',
      secondary: 'rgba(255, 152, 0, 0.1)',
      accent: '#ff9800',
      focus: '#ffa726',
    },
    semantic: {
      success: '#8bc34a',
      successBg: 'rgba(139, 195, 74, 0.15)',
      warning: '#ffc107',
      warningBg: 'rgba(255, 193, 7, 0.15)',
      error: '#f44336',
      errorBg: 'rgba(244, 67, 54, 0.15)',
      info: '#ff9800',
      infoBg: 'rgba(255, 152, 0, 0.15)',
    },
  },

  rainbow: {
    enabled: true,
    colors: {
      ...DEFAULT_RAINBOW_COLORS,
      red: '#e64a19',
      orange: '#ff9800',
      yellow: '#ffc107',
    },
    animationSpeed: 12000,
    animated: false,
  },

  effects: {
    glassBlur: 14,
    glassOpacity: 0.78,
    shadowIntensity: 1.1,
    radiusScale: 1.1,
    glowEnabled: true,
    glowColor: 'rgba(255, 152, 0, 0.35)',
    canvasGlass: {
      enabled: true,
      blur: 18,
      tint: 'rgba(26, 15, 10, 0.1)',
      borderColor: 'rgba(255, 152, 0, 0.2)',
      borderWidth: 1,
      innerShadow: 'inset 0 0 80px rgba(255, 152, 0, 0.08)',
    },
    navbarGlass: {
      enabled: true,
      blur: 12,
      tint: 'rgba(26, 15, 10, 0.8)',
      borderColor: 'rgba(255, 152, 0, 0.15)',
    },
  },

  customVariables: {
    '--sn-bg-gradient': 'radial-gradient(ellipse at center, #1a0f0a 0%, #2d1810 30%, #3d2218 50%, #4a2c1c 70%, #1a0f0a 100%)',
    '--sn-accent-gradient': 'linear-gradient(135deg, #e65100 0%, #ff9800 50%, #ffb74d 100%)',
    '--sn-glass-bg': 'rgba(37, 20, 16, 0.78)',
    '--sn-glass-border': 'rgba(255, 152, 0, 0.2)',
    '--sn-shadow-glow': '0 0 35px rgba(255, 152, 0, 0.25)',
    '--sn-parallax-intensity': '0.5',
    '--sn-firefly-glow': '0 0 15px rgba(255, 215, 0, 0.8)',
  },
};

export default autumnTheme;
