/**
 * StickerNest v2 - Glass Section
 * Glassmorphism settings for canvas appearance
 */

import React, { useCallback } from 'react';
import { useCanvasAppearanceStore } from '../../../state/useCanvasAppearanceStore';
import { SNToggle } from '../../../shared-ui/SNToggle';
import { SNSlider } from '../../../shared-ui/SNSlider';

const TINT_PRESETS = [
  { label: 'Light', value: 'rgba(255, 255, 255, 0.08)' },
  { label: 'Dark', value: 'rgba(0, 0, 0, 0.15)' },
  { label: 'Purple', value: 'rgba(139, 92, 246, 0.1)' },
  { label: 'Blue', value: 'rgba(59, 130, 246, 0.1)' },
  { label: 'Cyan', value: 'rgba(6, 182, 212, 0.1)' },
  { label: 'Pink', value: 'rgba(236, 72, 153, 0.1)' },
];

export const GlassSection: React.FC = () => {
  const glass = useCanvasAppearanceStore((s) => s.glass);
  const setGlass = useCanvasAppearanceStore((s) => s.setGlass);
  const toggleGlass = useCanvasAppearanceStore((s) => s.toggleGlass);

  const handleBlurChange = useCallback((blur: number) => {
    setGlass({ blur });
  }, [setGlass]);

  const handleOpacityChange = useCallback((opacity: number) => {
    setGlass({ opacity });
  }, [setGlass]);

  const handleSaturationChange = useCallback((saturation: number) => {
    setGlass({ saturation });
  }, [setGlass]);

  const handleTintChange = useCallback((tint: string) => {
    setGlass({ tint });
  }, [setGlass]);

  return (
    <div style={styles.container}>
      {/* Enable Toggle */}
      <SNToggle
        checked={glass.enabled}
        onChange={toggleGlass}
        label="Enable Glassmorphism"
        size="sm"
      />

      {glass.enabled && (
        <>
          {/* Blur */}
          <SNSlider
            value={glass.blur}
            min={0}
            max={40}
            step={2}
            label="Blur Intensity"
            showValue
            formatValue={(v) => `${v}px`}
            onChange={handleBlurChange}
            size="sm"
          />

          {/* Saturation */}
          <SNSlider
            value={glass.saturation}
            min={100}
            max={200}
            step={10}
            label="Saturation"
            showValue
            formatValue={(v) => `${v}%`}
            onChange={handleSaturationChange}
            size="sm"
          />

          {/* Tint Color */}
          <div style={styles.tintSection}>
            <span style={styles.label}>Glass Tint</span>
            <div style={styles.tintGrid}>
              {TINT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleTintChange(preset.value)}
                  style={{
                    ...styles.tintButton,
                    background: preset.value,
                    boxShadow: glass.tint === preset.value
                      ? '0 0 0 2px var(--sn-accent-primary)'
                      : 'none',
                  }}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={styles.preview}>
            <span style={styles.label}>Preview</span>
            <div style={styles.previewContainer}>
              {/* Background pattern */}
              <div style={styles.previewPattern} />
              {/* Glass overlay */}
              <div
                style={{
                  ...styles.previewGlass,
                  backdropFilter: `blur(${glass.blur}px) saturate(${glass.saturation}%)`,
                  WebkitBackdropFilter: `blur(${glass.blur}px) saturate(${glass.saturation}%)`,
                  background: glass.tint,
                }}
              >
                <span style={styles.previewText}>Glass Effect</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tintSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  tintGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  tintButton: {
    width: '100%',
    aspectRatio: '2',
    borderRadius: 6,
    border: '2px solid var(--sn-border-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewPattern: {
    position: 'absolute',
    inset: 0,
    background: `
      linear-gradient(45deg, #8b5cf6 25%, transparent 25%),
      linear-gradient(-45deg, #8b5cf6 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #3b82f6 75%),
      linear-gradient(-45deg, transparent 75%, #ec4899 75%)
    `,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  },
  previewGlass: {
    position: 'absolute',
    inset: 10,
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    fontSize: 12,
    fontWeight: 600,
    color: 'white',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  },
};

export default GlassSection;
