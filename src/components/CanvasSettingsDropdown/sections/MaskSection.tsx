/**
 * StickerNest v2 - Mask Section
 * Canvas masking settings to hide content outside the canvas bounds
 */

import React, { useCallback } from 'react';
import { useCanvasAppearanceStore } from '../../../state/useCanvasAppearanceStore';
import { SNToggle } from '../../../shared-ui/SNToggle';
import { SNSlider } from '../../../shared-ui/SNSlider';
import { SNIcon } from '../../../shared-ui/SNIcon';

const COLOR_PRESETS = [
  { color: '#0a0a0f', label: 'Dark' },
  { color: '#000000', label: 'Black' },
  { color: '#1a1a2e', label: 'Navy' },
  { color: '#0f172a', label: 'Slate' },
  { color: '#18181b', label: 'Zinc' },
  { color: '#ffffff', label: 'White' },
];

export const MaskSection: React.FC = () => {
  const mask = useCanvasAppearanceStore((s) => s.mask);
  const setMask = useCanvasAppearanceStore((s) => s.setMask);

  const handleToggleMask = useCallback((enabled: boolean) => {
    setMask({ enabled });
  }, [setMask]);

  const handleOpacityChange = useCallback((opacity: number) => {
    setMask({ opacity });
  }, [setMask]);

  const handleBlurChange = useCallback((blur: number) => {
    setMask({ blur });
  }, [setMask]);

  const handleColorChange = useCallback((color: string) => {
    setMask({ color });
  }, [setMask]);

  return (
    <div style={styles.container}>
      {/* Description */}
      <div style={styles.description}>
        <SNIcon name="eyeOff" size="sm" />
        <span>Hide content that extends beyond the canvas boundaries</span>
      </div>

      {/* Enable Mask Toggle */}
      <SNToggle
        checked={mask.enabled}
        onChange={handleToggleMask}
        label="Enable Canvas Mask"
        size="sm"
      />

      {/* Mask Settings (only show when enabled) */}
      {mask.enabled && (
        <>
          {/* Mask Opacity */}
          <SNSlider
            value={mask.opacity}
            min={50}
            max={100}
            step={5}
            label="Mask Opacity"
            showValue
            formatValue={(v) => `${v}%`}
            onChange={handleOpacityChange}
            size="sm"
          />

          {/* Mask Blur (edge softness) */}
          <SNSlider
            value={mask.blur}
            min={0}
            max={20}
            step={1}
            label="Edge Softness"
            showValue
            formatValue={(v) => `${v}px`}
            onChange={handleBlurChange}
            size="sm"
          />

          {/* Mask Color */}
          <div style={styles.colorSection}>
            <span style={styles.label}>Mask Color</span>
            <div style={styles.colorRow}>
              <input
                type="color"
                value={mask.color}
                onChange={(e) => handleColorChange(e.target.value)}
                style={styles.colorInput}
              />
              <div style={styles.colorPresets}>
                {COLOR_PRESETS.map(({ color, label }) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    title={label}
                    style={{
                      ...styles.colorPreset,
                      background: color,
                      border: mask.color === color
                        ? '2px solid var(--sn-accent-primary)'
                        : '1px solid var(--sn-border-secondary)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={styles.preview}>
            <span style={styles.label}>Preview</span>
            <div style={styles.previewBox}>
              {/* Simulated mask overlay */}
              <div
                style={{
                  ...styles.previewMask,
                  background: mask.color,
                  opacity: mask.opacity / 100,
                }}
              />
              {/* Simulated canvas area */}
              <div
                style={{
                  ...styles.previewCanvas,
                  boxShadow: mask.blur > 0
                    ? `0 0 ${mask.blur * 2}px ${mask.blur}px ${mask.color}`
                    : undefined,
                }}
              >
                <SNIcon name="image" size="sm" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Info */}
      <div style={styles.info}>
        <SNIcon name="info" size="xs" />
        <span>
          When enabled, only the canvas area is visible. Content outside is hidden.
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  description: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    color: 'var(--sn-text-secondary)',
    padding: '8px 10px',
    background: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 6,
    border: '1px solid rgba(139, 92, 246, 0.15)',
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  colorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  colorInput: {
    width: 32,
    height: 32,
    padding: 0,
    border: '1px solid var(--sn-border-secondary)',
    borderRadius: 6,
    cursor: 'pointer',
    background: 'transparent',
  },
  colorPresets: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  colorPreset: {
    width: 20,
    height: 20,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  previewBox: {
    position: 'relative',
    width: '100%',
    height: 80,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)',
    borderRadius: 6,
    overflow: 'hidden',
    border: '1px solid var(--sn-border-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMask: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  previewCanvas: {
    position: 'relative',
    width: 60,
    height: 40,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--sn-text-primary)',
    zIndex: 1,
  },
  info: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontSize: 10,
    color: 'var(--sn-text-muted)',
    lineHeight: 1.4,
  },
};

export default MaskSection;
