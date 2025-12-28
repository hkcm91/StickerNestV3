/**
 * StickerNest v2 - Radius Section
 * Border radius settings for canvas elements
 */

import React, { useCallback } from 'react';
import { useCanvasAppearanceStore } from '../../../state/useCanvasAppearanceStore';
import { SNSlider } from '../../../shared-ui/SNSlider';

const RADIUS_PRESETS = [0, 4, 8, 12, 16, 20, 24, 32];

export const RadiusSection: React.FC = () => {
  const radius = useCanvasAppearanceStore((s) => s.border.radius);
  const setRadius = useCanvasAppearanceStore((s) => s.setRadius);

  const handleRadiusChange = useCallback((value: number) => {
    setRadius(value);
  }, [setRadius]);

  const handlePresetClick = useCallback((value: number) => {
    setRadius(value);
  }, [setRadius]);

  return (
    <div style={styles.container}>
      {/* Slider */}
      <SNSlider
        value={radius}
        min={0}
        max={32}
        step={1}
        label="Corner Radius"
        showValue
        formatValue={(v) => `${v}px`}
        onChange={handleRadiusChange}
        size="sm"
      />

      {/* Presets */}
      <div style={styles.presets}>
        <span style={styles.presetsLabel}>Presets</span>
        <div style={styles.presetGrid}>
          {RADIUS_PRESETS.map((value) => (
            <button
              key={value}
              onClick={() => handlePresetClick(value)}
              style={{
                ...styles.presetButton,
                background: radius === value
                  ? 'var(--sn-accent-primary)'
                  : 'var(--sn-bg-tertiary)',
                color: radius === value
                  ? 'white'
                  : 'var(--sn-text-secondary)',
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div style={styles.preview}>
        <span style={styles.previewLabel}>Preview</span>
        <div
          style={{
            ...styles.previewBox,
            borderRadius: radius,
          }}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  presets: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
  },
  presetButton: {
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 4,
    border: '1px solid var(--sn-border-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  previewBox: {
    width: '100%',
    height: 48,
    background: 'linear-gradient(135deg, var(--sn-accent-secondary), var(--sn-accent-primary))',
    border: '2px solid var(--sn-border-primary)',
    transition: 'border-radius 0.2s ease',
  },
};

export default RadiusSection;
