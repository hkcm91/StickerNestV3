/**
 * StickerNest v2 - Color Section
 * Color controls for canvas background and accents
 */

import React, { useCallback } from 'react';
import { useCanvasAppearanceStore } from '../../../state/useCanvasAppearanceStore';
import { SNIcon } from '../../../shared-ui/SNIcon';

const ACCENT_PRESETS = [
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Pink', value: '#ec4899' },
];

const BG_PRESETS = [
  { label: 'Glass Dark', value: 'rgba(15, 15, 25, 0.25)' },
  { label: 'Glass Light', value: 'rgba(255, 255, 255, 0.1)' },
  { label: 'Deep Purple', value: 'rgba(15, 15, 25, 0.85)' },
  { label: 'Dark Blue', value: 'rgba(10, 22, 40, 0.85)' },
  { label: 'Charcoal', value: 'rgba(26, 26, 26, 0.85)' },
  { label: 'Navy', value: 'rgba(13, 27, 42, 0.85)' },
  { label: 'Frosted', value: 'rgba(255, 255, 255, 0.15)' },
  { label: 'Smoke', value: 'rgba(0, 0, 0, 0.4)' },
];

export const ColorSection: React.FC = () => {
  const colors = useCanvasAppearanceStore((s) => s.colors);
  const setAccentColor = useCanvasAppearanceStore((s) => s.setAccentColor);
  const setBackgroundColor = useCanvasAppearanceStore((s) => s.setBackgroundColor);

  const handleAccentChange = useCallback((color: string) => {
    setAccentColor(color);
  }, [setAccentColor]);

  const handleBgChange = useCallback((color: string) => {
    setBackgroundColor(color);
  }, [setBackgroundColor]);

  return (
    <div style={styles.container}>
      {/* Accent Color */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <SNIcon name="zap" size="sm" />
          <span style={styles.label}>Accent Color</span>
        </div>
        <div style={styles.colorGrid}>
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleAccentChange(preset.value)}
              style={{
                ...styles.colorButton,
                background: preset.value,
                boxShadow: colors.accentColor === preset.value
                  ? `0 0 0 3px ${preset.value}40, inset 0 0 0 2px white`
                  : 'none',
              }}
              title={preset.label}
            />
          ))}
        </div>
        <div style={styles.customColor}>
          <span style={styles.customLabel}>Custom:</span>
          <input
            type="color"
            value={colors.accentColor}
            onChange={(e) => handleAccentChange(e.target.value)}
            style={styles.colorInput}
          />
          <span style={styles.colorValue}>{colors.accentColor}</span>
        </div>
      </div>

      {/* Background Color */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <SNIcon name="pipette" size="sm" />
          <span style={styles.label}>Canvas Tint</span>
        </div>
        <div style={styles.colorGrid}>
          {BG_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleBgChange(preset.value)}
              style={{
                ...styles.colorButton,
                background: preset.value,
                border: '2px solid var(--sn-border-secondary)',
                boxShadow: colors.backgroundColor === preset.value
                  ? '0 0 0 3px var(--sn-accent-primary)'
                  : 'none',
              }}
              title={preset.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--sn-text-primary)',
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  colorButton: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  customColor: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  customLabel: {
    fontSize: 11,
    color: 'var(--sn-text-secondary)',
  },
  colorInput: {
    width: 32,
    height: 24,
    padding: 0,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  colorValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: 'var(--sn-text-muted)',
  },
};

export default ColorSection;
