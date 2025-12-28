/**
 * Docker 2.0 Theme System
 * Glassmorphism design with light/dark mode support
 */

import type { Docker2Theme, Docker2ThemeMode, Docker2ThemeColors } from './Docker2.types';

// ==================
// Color Palettes
// ==================

const darkColors: Docker2ThemeColors = {
  // Backgrounds - Deep purple-black tones
  bgPrimary: 'rgba(15, 15, 25, 0.95)',
  bgSecondary: 'rgba(22, 22, 35, 0.92)',
  bgTertiary: 'rgba(30, 30, 45, 0.90)',
  bgGlass: 'rgba(25, 25, 40, 0.75)',
  bgGlassHover: 'rgba(35, 35, 55, 0.80)',
  bgGlassActive: 'rgba(45, 45, 70, 0.85)',

  // Text - Light on dark
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.70)',
  textMuted: 'rgba(255, 255, 255, 0.45)',

  // Accents - Purple theme
  accent: '#8b5cf6',
  accentHover: '#a78bfa',
  accentMuted: 'rgba(139, 92, 246, 0.25)',

  // Semantic colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',

  // Borders & Shadows
  borderPrimary: 'rgba(255, 255, 255, 0.08)',
  borderSecondary: 'rgba(255, 255, 255, 0.04)',
  borderAccent: 'rgba(139, 92, 246, 0.40)',
  shadowColor: 'rgba(0, 0, 0, 0.50)',

  // Glassmorphism specifics
  glassBlur: '20px',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
};

const lightColors: Docker2ThemeColors = {
  // Backgrounds - Soft whites with subtle purple tint
  bgPrimary: 'rgba(255, 255, 255, 0.85)',
  bgSecondary: 'rgba(248, 247, 255, 0.90)',
  bgTertiary: 'rgba(240, 238, 255, 0.92)',
  bgGlass: 'rgba(255, 255, 255, 0.65)',
  bgGlassHover: 'rgba(255, 255, 255, 0.75)',
  bgGlassActive: 'rgba(255, 255, 255, 0.85)',

  // Text - Dark on light
  textPrimary: 'rgba(15, 15, 35, 0.95)',
  textSecondary: 'rgba(15, 15, 35, 0.70)',
  textMuted: 'rgba(15, 15, 35, 0.45)',

  // Accents - Purple theme (slightly deeper for contrast)
  accent: '#7c3aed',
  accentHover: '#6d28d9',
  accentMuted: 'rgba(124, 58, 237, 0.15)',

  // Semantic colors (adjusted for light bg)
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',

  // Borders & Shadows
  borderPrimary: 'rgba(15, 15, 35, 0.10)',
  borderSecondary: 'rgba(15, 15, 35, 0.05)',
  borderAccent: 'rgba(124, 58, 237, 0.35)',
  shadowColor: 'rgba(15, 15, 35, 0.15)',

  // Glassmorphism specifics
  glassBlur: '24px',
  glassBorder: 'rgba(255, 255, 255, 0.60)',
  glassHighlight: 'rgba(255, 255, 255, 0.80)',
};

// ==================
// Theme Objects
// ==================

const sharedConfig = {
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '400ms ease',
  },
  borderRadius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
  },
};

export const darkTheme: Docker2Theme = {
  mode: 'dark',
  colors: darkColors,
  ...sharedConfig,
};

export const lightTheme: Docker2Theme = {
  mode: 'light',
  colors: lightColors,
  ...sharedConfig,
};

// ==================
// Theme Utilities
// ==================

export const getTheme = (mode: Docker2ThemeMode): Docker2Theme => {
  return mode === 'light' ? lightTheme : darkTheme;
};

export const toggleThemeMode = (current: Docker2ThemeMode): Docker2ThemeMode => {
  return current === 'light' ? 'dark' : 'light';
};

// ==================
// CSS Variable Generator
// ==================

export const generateCSSVariables = (theme: Docker2Theme): Record<string, string> => {
  const { colors, transitions, borderRadius } = theme;

  return {
    // Backgrounds
    '--d2-bg-primary': colors.bgPrimary,
    '--d2-bg-secondary': colors.bgSecondary,
    '--d2-bg-tertiary': colors.bgTertiary,
    '--d2-bg-glass': colors.bgGlass,
    '--d2-bg-glass-hover': colors.bgGlassHover,
    '--d2-bg-glass-active': colors.bgGlassActive,

    // Text
    '--d2-text-primary': colors.textPrimary,
    '--d2-text-secondary': colors.textSecondary,
    '--d2-text-muted': colors.textMuted,

    // Accents
    '--d2-accent': colors.accent,
    '--d2-accent-hover': colors.accentHover,
    '--d2-accent-muted': colors.accentMuted,

    // Semantic
    '--d2-success': colors.success,
    '--d2-warning': colors.warning,
    '--d2-error': colors.error,

    // Borders & Shadows
    '--d2-border-primary': colors.borderPrimary,
    '--d2-border-secondary': colors.borderSecondary,
    '--d2-border-accent': colors.borderAccent,
    '--d2-shadow-color': colors.shadowColor,

    // Glassmorphism
    '--d2-glass-blur': colors.glassBlur,
    '--d2-glass-border': colors.glassBorder,
    '--d2-glass-highlight': colors.glassHighlight,

    // Transitions
    '--d2-transition-fast': transitions.fast,
    '--d2-transition-normal': transitions.normal,
    '--d2-transition-slow': transitions.slow,

    // Border radius
    '--d2-radius-sm': borderRadius.sm,
    '--d2-radius-md': borderRadius.md,
    '--d2-radius-lg': borderRadius.lg,
    '--d2-radius-xl': borderRadius.xl,
  };
};

// ==================
// Glassmorphism Style Generators
// ==================

export interface GlassStyleOptions {
  blur?: number;
  opacity?: number;
  border?: boolean;
  highlight?: boolean;
  shadow?: boolean;
}

export const getGlassStyle = (
  theme: Docker2Theme,
  options: GlassStyleOptions = {}
): React.CSSProperties => {
  const {
    blur = 20,
    opacity = 0.75,
    border = true,
    highlight = true,
    shadow = true,
  } = options;

  const { colors, borderRadius } = theme;

  const bgOpacity = theme.mode === 'dark' ? opacity : opacity + 0.1;
  const bgBase = theme.mode === 'dark'
    ? `rgba(25, 25, 40, ${bgOpacity})`
    : `rgba(255, 255, 255, ${bgOpacity})`;

  const style: React.CSSProperties = {
    background: bgBase,
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    borderRadius: borderRadius.lg,
    transition: `all ${theme.transitions.normal}`,
  };

  if (border) {
    style.border = `1px solid ${colors.glassBorder}`;
  }

  if (shadow) {
    const shadowIntensity = theme.mode === 'dark' ? 0.4 : 0.15;
    style.boxShadow = `
      0 8px 32px rgba(0, 0, 0, ${shadowIntensity}),
      inset 0 1px 0 ${colors.glassHighlight}
    `;
  }

  if (highlight && theme.mode === 'dark') {
    // Add subtle top highlight for depth
    style.backgroundImage = `linear-gradient(
      180deg,
      ${colors.glassHighlight} 0%,
      transparent 40%
    )`;
  }

  return style;
};

// ==================
// Pre-built Component Styles
// ==================

export const getContainerStyle = (theme: Docker2Theme): React.CSSProperties => ({
  ...getGlassStyle(theme, { blur: 24, opacity: 0.85, shadow: true }),
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const getHeaderStyle = (theme: Docker2Theme): React.CSSProperties => ({
  background: theme.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)'
    : 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
  borderBottom: `1px solid ${theme.colors.borderPrimary}`,
  padding: '10px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  userSelect: 'none',
});

export const getButtonStyle = (
  theme: Docker2Theme,
  variant: 'default' | 'accent' | 'danger' = 'default'
): React.CSSProperties => {
  const { colors, borderRadius, transitions } = theme;

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    borderRadius: borderRadius.sm,
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: `all ${transitions.fast}`,
    outline: 'none',
  };

  switch (variant) {
    case 'accent':
      return {
        ...baseStyle,
        background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentHover})`,
        color: '#ffffff',
        boxShadow: `0 2px 8px ${colors.accentMuted}`,
      };
    case 'danger':
      return {
        ...baseStyle,
        background: `rgba(239, 68, 68, 0.15)`,
        color: colors.error,
        border: `1px solid rgba(239, 68, 68, 0.3)`,
      };
    default:
      return {
        ...baseStyle,
        background: colors.bgGlass,
        color: colors.textPrimary,
        border: `1px solid ${colors.borderPrimary}`,
      };
  }
};

export const getIconButtonStyle = (theme: Docker2Theme): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: theme.borderRadius.sm,
  border: 'none',
  background: 'transparent',
  color: theme.colors.textSecondary,
  cursor: 'pointer',
  transition: `all ${theme.transitions.fast}`,
  padding: 0,
});

export const getDropZoneStyle = (
  theme: Docker2Theme,
  active: boolean
): React.CSSProperties => ({
  position: 'absolute',
  background: active
    ? `linear-gradient(135deg, ${theme.colors.accentMuted}, transparent)`
    : 'transparent',
  border: active
    ? `2px dashed ${theme.colors.accent}`
    : `2px dashed transparent`,
  borderRadius: theme.borderRadius.md,
  transition: `all ${theme.transitions.fast}`,
  pointerEvents: active ? 'auto' : 'none',
});

export const getWidgetCardStyle = (
  theme: Docker2Theme,
  minimized: boolean = false,
  maximized: boolean = false
): React.CSSProperties => ({
  ...getGlassStyle(theme, { blur: 12, opacity: 0.6, border: true }),
  flex: maximized ? 1 : minimized ? '0 0 auto' : undefined,
  minHeight: minimized ? '36px' : '80px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

// ==================
// Animation Keyframes (as CSS strings)
// ==================

export const animations = {
  fadeIn: `
    @keyframes d2FadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `,
  slideIn: `
    @keyframes d2SlideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  pulse: `
    @keyframes d2Pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `,
  shimmer: `
    @keyframes d2Shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
};

// Export all animations as a single CSS block
export const animationStyles = Object.values(animations).join('\n');

// ==================
// Default Export
// ==================

export default {
  dark: darkTheme,
  light: lightTheme,
  getTheme,
  toggleThemeMode,
  generateCSSVariables,
  getGlassStyle,
  getContainerStyle,
  getHeaderStyle,
  getButtonStyle,
  getIconButtonStyle,
  getDropZoneStyle,
  getWidgetCardStyle,
  animations,
  animationStyles,
};
