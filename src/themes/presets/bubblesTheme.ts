/**
 * StickerNest v2 - Bubbles Theme
 * Cyan/teal color scheme with floating bubbles, sky gradient, and glass effects.
 * Inspired by dreamy aquatic/sky aesthetics.
 */

import { CustomTheme, DEFAULT_RAINBOW_COLORS } from '../../types/customTheme';

export const bubblesTheme: CustomTheme = {
  id: 'bubbles-sky',
  name: 'Bubbles & Sky',
  description: 'Dreamy sky gradient with floating bubbles and glass effects',
  author: 'StickerNest',
  version: '1.0.0',
  mode: 'dark',
  isCustom: false,
  isPreset: true,

  appBackground: {
    type: 'parallax',
    parallax: {
      enabled: true,
      intensity: 0.6,
      mouseParallax: true,
      scrollParallax: false,
      animationSpeed: 0.8,
      backgroundBlur: 0,
      baseGradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: '#1a1a3e', position: 0 },      // Deep purple-blue
          { color: '#2d3a8c', position: 25 },     // Navy blue
          { color: '#4a6fa5', position: 50 },     // Steel blue
          { color: '#7eb8da', position: 75 },     // Sky blue
          { color: '#a8d8ea', position: 100 },    // Light sky
        ],
      },
      layers: [
        // Background bokeh layer (very back, blurry)
        {
          id: 'bokeh-back',
          type: 'particles',
          depth: 0.1,
          opacity: 0.4,
          particles: {
            type: 'bokeh',
            count: 15,
            sizeMin: 80,
            sizeMax: 200,
            colors: ['#4ecdc4', '#45b7d1', '#96deda', '#5bc0de', '#87ceeb'],
            opacityMin: 0.15,
            opacityMax: 0.3,
            speed: 0.3,
            glow: true,
            glowIntensity: 0.6,
            direction: 'float',
          },
          animation: {
            type: 'drift',
            duration: 30000,
            easing: 'ease-in-out',
          },
        },
        // Mid-layer bubbles (medium depth)
        {
          id: 'bubbles-mid',
          type: 'particles',
          depth: 0.4,
          opacity: 0.6,
          particles: {
            type: 'bubbles',
            count: 25,
            sizeMin: 30,
            sizeMax: 80,
            colors: [
              'rgba(78, 205, 196, 0.4)',
              'rgba(69, 183, 209, 0.4)',
              'rgba(150, 222, 218, 0.4)',
              'rgba(135, 206, 235, 0.4)',
            ],
            opacityMin: 0.4,
            opacityMax: 0.7,
            speed: 0.5,
            glow: false,
            direction: 'float',
          },
          animation: {
            type: 'drift',
            duration: 20000,
            easing: 'ease-in-out',
          },
        },
        // Foreground bubbles (large, prominent)
        {
          id: 'bubbles-front',
          type: 'particles',
          depth: 0.8,
          opacity: 0.8,
          particles: {
            type: 'bubbles',
            count: 12,
            sizeMin: 60,
            sizeMax: 150,
            colors: [
              'rgba(255, 255, 255, 0.2)',
              'rgba(78, 205, 196, 0.3)',
              'rgba(69, 183, 209, 0.3)',
            ],
            opacityMin: 0.5,
            opacityMax: 0.85,
            speed: 0.6,
            glow: true,
            glowIntensity: 0.3,
            direction: 'float',
          },
          animation: {
            type: 'drift',
            duration: 15000,
            easing: 'ease-in-out',
          },
        },
        // Tiny sparkle particles
        {
          id: 'sparkles',
          type: 'particles',
          depth: 0.6,
          opacity: 0.5,
          particles: {
            type: 'dust',
            count: 40,
            sizeMin: 2,
            sizeMax: 5,
            colors: ['#ffffff', '#e0f7fa', '#b2ebf2'],
            opacityMin: 0.3,
            opacityMax: 0.7,
            speed: 0.8,
            glow: false,
            direction: 'random',
          },
        },
      ],
    },
  },

  colors: {
    background: {
      primary: '#0f1628',
      secondary: '#1a2540',
      tertiary: '#243352',
      surface: '#141d32',
      elevated: '#1e2d4a',
      overlay: 'rgba(15, 22, 40, 0.9)',
    },
    text: {
      primary: '#f0f8ff',
      secondary: '#a8c5d8',
      tertiary: '#7a9bb8',
      muted: '#4a6b87',
      inverse: '#0f1628',
      link: '#4ecdc4',
    },
    accent: {
      primary: '#4ecdc4',
      secondary: '#45b7d1',
      tertiary: '#96deda',
      hover: '#3dbdb5',
      active: '#2ba8a0',
    },
    border: {
      primary: 'rgba(78, 205, 196, 0.2)',
      secondary: 'rgba(78, 205, 196, 0.1)',
      accent: '#4ecdc4',
      focus: '#45b7d1',
    },
    semantic: {
      success: '#4ecdc4',
      successBg: 'rgba(78, 205, 196, 0.15)',
      warning: '#ffd93d',
      warningBg: 'rgba(255, 217, 61, 0.15)',
      error: '#ff6b6b',
      errorBg: 'rgba(255, 107, 107, 0.15)',
      info: '#45b7d1',
      infoBg: 'rgba(69, 183, 209, 0.15)',
    },
  },

  rainbow: {
    enabled: true,
    colors: {
      ...DEFAULT_RAINBOW_COLORS,
      cyan: '#4ecdc4',
      blue: '#45b7d1',
    },
    animationSpeed: 10000,
    animated: false,
  },

  effects: {
    glassBlur: 16,
    glassOpacity: 0.75,
    shadowIntensity: 1.0,
    radiusScale: 1.2,
    glowEnabled: true,
    glowColor: 'rgba(78, 205, 196, 0.4)',
    canvasGlass: {
      enabled: true,
      blur: 20,
      tint: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      borderWidth: 1,
      innerShadow: 'inset 0 0 60px rgba(78, 205, 196, 0.1)',
    },
    navbarGlass: {
      enabled: true,
      blur: 12,
      tint: 'rgba(15, 22, 40, 0.7)',
      borderColor: 'rgba(78, 205, 196, 0.2)',
    },
  },

  customVariables: {
    '--sn-bg-gradient': 'linear-gradient(180deg, #1a1a3e 0%, #2d3a8c 25%, #4a6fa5 50%, #7eb8da 75%, #a8d8ea 100%)',
    '--sn-accent-gradient': 'linear-gradient(135deg, #45b7d1 0%, #4ecdc4 50%, #96deda 100%)',
    '--sn-glass-bg': 'rgba(20, 29, 50, 0.75)',
    '--sn-glass-border': 'rgba(78, 205, 196, 0.2)',
    '--sn-shadow-glow': '0 0 30px rgba(78, 205, 196, 0.3)',
    '--sn-parallax-intensity': '0.6',
    '--sn-bubble-glow': '0 0 20px rgba(78, 205, 196, 0.5)',
  },
};

export default bubblesTheme;
