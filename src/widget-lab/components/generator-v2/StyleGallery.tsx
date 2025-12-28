/**
 * StickerNest v2 - Style Gallery Component
 * Visual selection of style presets for widget generation
 */

import React from 'react';
import { theme } from '../../theme';
import type { StylePreset, ComplexityLevel } from '../../../services/widget-generator-v2';

// Style preset definitions with visual preview colors
const STYLE_PRESETS: Record<StylePreset, {
  name: string;
  description: string;
  colors: { bg: string; accent: string; text: string };
  features: string[];
}> = {
  minimal: {
    name: 'Minimal',
    description: 'Clean and simple',
    colors: { bg: '#1a1a2e', accent: '#64748b', text: '#e2e8f0' },
    features: ['Whitespace', 'Subtle', 'Typography'],
  },
  polished: {
    name: 'Polished',
    description: 'Modern and refined',
    colors: { bg: '#1a1a2e', accent: '#8b5cf6', text: '#e2e8f0' },
    features: ['Shadows', 'Gradients', 'Transitions'],
  },
  elaborate: {
    name: 'Elaborate',
    description: 'Rich and detailed',
    colors: { bg: '#1a1a2e', accent: '#f59e0b', text: '#fef3c7' },
    features: ['Decorative', 'Animations', 'Patterns'],
  },
  glassmorphism: {
    name: 'Glass',
    description: 'Frosted glass effect',
    colors: { bg: 'rgba(255,255,255,0.1)', accent: '#a78bfa', text: '#f8fafc' },
    features: ['Blur', 'Transparency', 'Layered'],
  },
  neon: {
    name: 'Neon',
    description: 'Bright and glowing',
    colors: { bg: '#0a0a0f', accent: '#00ff88', text: '#00ffff' },
    features: ['Glow', 'Cyberpunk', 'Bold'],
  },
  retro: {
    name: 'Retro',
    description: 'Vintage computing',
    colors: { bg: '#0d1117', accent: '#00ff00', text: '#39ff14' },
    features: ['Pixelated', 'Monospace', '8-bit'],
  },
};

// Complexity level definitions
const COMPLEXITY_LEVELS: Record<ComplexityLevel, {
  name: string;
  description: string;
  codeLines: string;
  icon: string;
}> = {
  basic: {
    name: 'Basic',
    description: 'Simple, single-purpose',
    codeLines: '50-100',
    icon: '🌱',
  },
  standard: {
    name: 'Standard',
    description: 'Full-featured',
    codeLines: '150-300',
    icon: '🌿',
  },
  advanced: {
    name: 'Advanced',
    description: 'Sophisticated',
    codeLines: '300-500',
    icon: '🌳',
  },
  professional: {
    name: 'Professional',
    description: 'Production-ready',
    codeLines: '500+',
    icon: '🏔️',
  },
};

interface StyleGalleryProps {
  selectedStyle: StylePreset;
  selectedComplexity: ComplexityLevel;
  onStyleChange: (style: StylePreset) => void;
  onComplexityChange: (complexity: ComplexityLevel) => void;
  compact?: boolean;
}

export const StyleGallery: React.FC<StyleGalleryProps> = ({
  selectedStyle,
  selectedComplexity,
  onStyleChange,
  onComplexityChange,
  compact = false,
}) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Style Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 600,
          color: theme.text.secondary,
          marginBottom: '8px',
        }}>
          Visual Style
        </label>

        <div style={{
          display: 'grid',
          gridTemplateColumns: compact ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
          gap: '8px',
        }}>
          {(Object.entries(STYLE_PRESETS) as [StylePreset, typeof STYLE_PRESETS[StylePreset]][]).map(
            ([key, preset]) => (
              <button
                key={key}
                onClick={() => onStyleChange(key)}
                style={{
                  padding: compact ? '8px' : '12px',
                  background: selectedStyle === key
                    ? theme.accentMuted
                    : theme.bg.secondary,
                  border: `2px solid ${selectedStyle === key ? theme.accent : theme.border}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                {/* Color Preview */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '4px',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: preset.colors.bg,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }} />
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: preset.colors.accent,
                    boxShadow: key === 'neon' ? `0 0 10px ${preset.colors.accent}` : 'none',
                  }} />
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: preset.colors.text,
                  }} />
                </div>

                {/* Name */}
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: selectedStyle === key ? theme.text.primary : theme.text.secondary,
                  marginBottom: '2px',
                }}>
                  {preset.name}
                </div>

                {/* Description */}
                {!compact && (
                  <div style={{
                    fontSize: '10px',
                    color: theme.text.tertiary,
                  }}>
                    {preset.description}
                  </div>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Complexity Selection */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 600,
          color: theme.text.secondary,
          marginBottom: '8px',
        }}>
          Complexity Level
        </label>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
        }}>
          {(Object.entries(COMPLEXITY_LEVELS) as [ComplexityLevel, typeof COMPLEXITY_LEVELS[ComplexityLevel]][]).map(
            ([key, level]) => (
              <button
                key={key}
                onClick={() => onComplexityChange(key)}
                style={{
                  padding: '10px',
                  background: selectedComplexity === key
                    ? theme.accentMuted
                    : theme.bg.secondary,
                  border: `2px solid ${selectedComplexity === key ? theme.accent : theme.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: '20px',
                  marginBottom: '4px',
                }}>
                  {level.icon}
                </div>

                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: selectedComplexity === key ? theme.text.primary : theme.text.secondary,
                }}>
                  {level.name}
                </div>

                <div style={{
                  fontSize: '10px',
                  color: theme.text.tertiary,
                }}>
                  ~{level.codeLines} lines
                </div>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
