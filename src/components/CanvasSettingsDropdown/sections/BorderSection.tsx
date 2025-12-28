/**
 * StickerNest v2 - Border Section
 * Border settings for canvas and widgets
 */

import React, { useCallback } from 'react';
import { useCanvasAppearanceStore } from '../../../state/useCanvasAppearanceStore';
import { SNSlider } from '../../../shared-ui/SNSlider';
import { SNToggle } from '../../../shared-ui/SNToggle';

const BORDER_COLORS = [
  { label: 'White Glass', value: 'rgba(255, 255, 255, 0.18)' },
  { label: 'Accent', value: 'var(--sn-accent-primary)' },
  { label: 'White', value: 'rgba(255, 255, 255, 0.4)' },
  { label: 'None', value: 'transparent' },
];

const BORDER_STYLES = ['solid', 'dashed', 'dotted'] as const;

export const BorderSection: React.FC = () => {
  const border = useCanvasAppearanceStore((s) => s.border);
  const setBorder = useCanvasAppearanceStore((s) => s.setBorder);
  const toggleBorder = useCanvasAppearanceStore((s) => s.toggleBorder);

  const handleWidthChange = useCallback((width: number) => {
    setBorder({ width });
  }, [setBorder]);

  const handleColorChange = useCallback((color: string) => {
    setBorder({ color });
  }, [setBorder]);

  const handleStyleChange = useCallback((style: typeof BORDER_STYLES[number]) => {
    setBorder({ style });
  }, [setBorder]);

  return (
    <div style={styles.container}>
      {/* Enable Toggle */}
      <SNToggle
        checked={border.enabled}
        onChange={toggleBorder}
        label="Show Border"
        size="sm"
      />

      {border.enabled && (
        <>
          {/* Width */}
          <SNSlider
            value={border.width}
            min={0}
            max={8}
            step={1}
            label="Width"
            showValue
            formatValue={(v) => `${v}px`}
            onChange={handleWidthChange}
            size="sm"
          />

          {/* Color */}
          <div style={styles.colorSection}>
            <span style={styles.label}>Color</span>
            <div style={styles.colorGrid}>
              {BORDER_COLORS.map((colorOption) => (
                <button
                  key={colorOption.label}
                  onClick={() => handleColorChange(colorOption.value)}
                  style={{
                    ...styles.colorButton,
                    background: colorOption.value === 'transparent'
                      ? 'repeating-linear-gradient(45deg, #666, #666 2px, #999 2px, #999 4px)'
                      : colorOption.value.startsWith('var')
                        ? 'var(--sn-accent-primary)'
                        : colorOption.value,
                    boxShadow: border.color === colorOption.value
                      ? '0 0 0 2px var(--sn-accent-primary)'
                      : 'none',
                  }}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>

          {/* Style */}
          <div style={styles.styleSection}>
            <span style={styles.label}>Style</span>
            <div style={styles.styleGrid}>
              {BORDER_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => handleStyleChange(style)}
                  style={{
                    ...styles.styleButton,
                    background: border.style === style
                      ? 'var(--sn-accent-primary)'
                      : 'var(--sn-bg-tertiary)',
                    color: border.style === style
                      ? 'white'
                      : 'var(--sn-text-secondary)',
                  }}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={styles.preview}>
            <span style={styles.label}>Preview</span>
            <div
              style={{
                ...styles.previewBox,
                border: `${border.width}px ${border.style} ${border.color}`,
                borderRadius: 8,
              }}
            />
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
  colorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  colorGrid: {
    display: 'flex',
    gap: 8,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: '2px solid var(--sn-border-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  styleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  styleGrid: {
    display: 'flex',
    gap: 6,
  },
  styleButton: {
    flex: 1,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 4,
    border: '1px solid var(--sn-border-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textTransform: 'capitalize',
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  previewBox: {
    width: '100%',
    height: 48,
    background: 'var(--sn-bg-tertiary)',
    transition: 'border 0.2s ease',
  },
};

export default BorderSection;
