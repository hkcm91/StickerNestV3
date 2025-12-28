/**
 * StickerNest v2 - Canvas Size Section
 * Canvas dimension settings with presets
 */

import React, { useState, useCallback } from 'react';
import { useCanvasExtendedStore } from '../../../state/useCanvasExtendedStore';
import { CANVAS_SIZE_PRESETS, type CanvasSizePreset } from '../../../types/domain';
import { SNIcon } from '../../../shared-ui/SNIcon';

type Category = 'screen' | 'social' | 'print' | 'custom';

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'screen', label: 'Screen', icon: 'maximize' },
  { id: 'social', label: 'Social', icon: 'share' },
  { id: 'print', label: 'Print', icon: 'file' },
  { id: 'custom', label: 'Custom', icon: 'edit' },
];

interface CanvasSizeSectionProps {
  onSizeChange?: (width: number, height: number) => void;
}

export const CanvasSizeSection: React.FC<CanvasSizeSectionProps> = ({ onSizeChange }) => {
  const dimensions = useCanvasExtendedStore((s) => s.canvasDimensions);
  const setCanvasDimensions = useCanvasExtendedStore((s) => s.setCanvasDimensions);

  const [activeCategory, setActiveCategory] = useState<Category>('screen');
  const [customWidth, setCustomWidth] = useState(dimensions.width.toString());
  const [customHeight, setCustomHeight] = useState(dimensions.height.toString());

  const presetsByCategory = CANVAS_SIZE_PRESETS.filter(
    (p) => p.category === activeCategory
  );

  const handlePresetSelect = useCallback((preset: CanvasSizePreset) => {
    setCanvasDimensions(preset.width, preset.height, true);
    onSizeChange?.(preset.width, preset.height);
    setCustomWidth(preset.width.toString());
    setCustomHeight(preset.height.toString());
  }, [setCanvasDimensions, onSizeChange]);

  const handleCustomApply = useCallback(() => {
    const width = parseInt(customWidth, 10);
    const height = parseInt(customHeight, 10);
    if (width > 0 && height > 0) {
      setCanvasDimensions(width, height, true);
      onSizeChange?.(width, height);
    }
  }, [customWidth, customHeight, setCanvasDimensions, onSizeChange]);

  const isCurrentSize = (preset: CanvasSizePreset) =>
    dimensions.width === preset.width && dimensions.height === preset.height;

  return (
    <div style={styles.container}>
      {/* Current Size Display */}
      <div style={styles.currentSize}>
        <span style={styles.currentLabel}>Current Size:</span>
        <span style={styles.currentValue}>
          {dimensions.width} × {dimensions.height}
        </span>
      </div>

      {/* Category Tabs */}
      <div style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              ...styles.tab,
              background: activeCategory === cat.id
                ? 'var(--sn-accent-primary)'
                : 'var(--sn-bg-tertiary)',
              color: activeCategory === cat.id
                ? 'white'
                : 'var(--sn-text-secondary)',
            }}
          >
            <SNIcon name={cat.icon as any} size="xs" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Presets Grid */}
      {activeCategory !== 'custom' ? (
        <div style={styles.presetList}>
          {presetsByCategory.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              style={{
                ...styles.presetButton,
                borderColor: isCurrentSize(preset)
                  ? 'var(--sn-accent-primary)'
                  : 'var(--sn-border-secondary)',
                background: isCurrentSize(preset)
                  ? 'rgba(139, 92, 246, 0.1)'
                  : 'var(--sn-bg-tertiary)',
              }}
            >
              <span style={styles.presetName}>{preset.name}</span>
              <span style={styles.presetDimensions}>
                {preset.width} × {preset.height}
              </span>
              {isCurrentSize(preset) && (
                <SNIcon name="check" size="xs" color="var(--sn-accent-primary)" />
              )}
            </button>
          ))}
        </div>
      ) : (
        /* Custom Size Input */
        <div style={styles.customSection}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Width (px)</label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              style={styles.input}
              min={100}
              max={10000}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Height (px)</label>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              style={styles.input}
              min={100}
              max={10000}
            />
          </div>
          <button onClick={handleCustomApply} style={styles.applyButton}>
            Apply Size
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  currentSize: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 6,
  },
  currentLabel: {
    fontSize: 11,
    color: 'var(--sn-text-secondary)',
  },
  currentValue: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    fontFamily: 'monospace',
  },
  tabs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 4,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '6px 4px',
    fontSize: 10,
    fontWeight: 500,
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  presetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 180,
    overflowY: 'auto',
  },
  presetButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    border: '1px solid',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  presetName: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--sn-text-primary)',
  },
  presetDimensions: {
    fontSize: 11,
    color: 'var(--sn-text-muted)',
    fontFamily: 'monospace',
  },
  customSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    color: 'var(--sn-text-secondary)',
  },
  input: {
    padding: '8px 12px',
    fontSize: 13,
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-secondary)',
    borderRadius: 6,
    color: 'var(--sn-text-primary)',
    outline: 'none',
  },
  applyButton: {
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: 'var(--sn-accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

export default CanvasSizeSection;
