/**
 * Widget Lab Theme Tokens
 * Centralized design tokens for consistent styling
 */

export const theme = {
  bg: {
    primary: '#0f0f19',
    secondary: '#1a1a2e',
    tertiary: '#252542',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    tertiary: '#64748b',
  },
  accent: '#3b82f6',
  accentMuted: 'rgba(59, 130, 246, 0.15)',
  accentPurple: '#8b5cf6',
  accentPurpleMuted: 'rgba(139, 92, 246, 0.15)',
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
};

export type Theme = typeof theme;
