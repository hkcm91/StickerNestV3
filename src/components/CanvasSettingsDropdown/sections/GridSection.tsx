/**
 * StickerNest v2 - Grid Section
 * Grid and snap settings with regular and isometric options
 */

import React, { useCallback } from 'react';
import { useCanvasAppearanceStore, type GridType } from '../../../state/useCanvasAppearanceStore';
import { SNToggle } from '../../../shared-ui/SNToggle';
import { SNSlider } from '../../../shared-ui/SNSlider';
import { SNIcon } from '../../../shared-ui/SNIcon';

const GRID_SIZE_PRESETS = [10, 16, 20, 24, 32, 40, 50];

export const GridSection: React.FC = () => {
  const grid = useCanvasAppearanceStore((s) => s.grid);
  const setGrid = useCanvasAppearanceStore((s) => s.setGrid);
  const setGridType = useCanvasAppearanceStore((s) => s.setGridType);

  const handleToggleGrid = useCallback((show: boolean) => {
    setGrid({ showGrid: show });
  }, [setGrid]);

  const handleToggleSnap = useCallback((snap: boolean) => {
    setGrid({ snapToGrid: snap });
  }, [setGrid]);

  const handleToggleCenterSnap = useCallback((snap: boolean) => {
    setGrid({ snapToCenter: snap });
  }, [setGrid]);

  const handleToggleCenterGuides = useCallback((show: boolean) => {
    setGrid({ showCenterGuides: show });
  }, [setGrid]);

  const handleGridSizeChange = useCallback((size: number) => {
    setGrid({ gridSize: size });
  }, [setGrid]);

  const handleGridColorChange = useCallback((color: string) => {
    setGrid({ gridColor: color });
  }, [setGrid]);

  const handleGridOpacityChange = useCallback((opacity: number) => {
    setGrid({ gridOpacity: opacity });
  }, [setGrid]);

  const handleGridTypeChange = useCallback((type: GridType) => {
    setGridType(type);
  }, [setGridType]);

  return (
    <div style={styles.container}>
      {/* Grid Type Toggle */}
      <div style={styles.typeSection}>
        <span style={styles.label}>Grid Type</span>
        <div style={styles.typeButtons}>
          <button
            onClick={() => handleGridTypeChange('regular')}
            style={{
              ...styles.typeButton,
              background: grid.gridType === 'regular'
                ? 'var(--sn-accent-primary)'
                : 'var(--sn-bg-tertiary)',
              color: grid.gridType === 'regular'
                ? 'white'
                : 'var(--sn-text-secondary)',
            }}
          >
            <SNIcon name="grid" size="sm" />
            Regular
          </button>
          <button
            onClick={() => handleGridTypeChange('isometric')}
            style={{
              ...styles.typeButton,
              background: grid.gridType === 'isometric'
                ? 'var(--sn-accent-primary)'
                : 'var(--sn-bg-tertiary)',
              color: grid.gridType === 'isometric'
                ? 'white'
                : 'var(--sn-text-secondary)',
            }}
          >
            <SNIcon name="shapes" size="sm" />
            Isometric
          </button>
        </div>
      </div>

      {/* Show Grid Toggle */}
      <SNToggle
        checked={grid.showGrid}
        onChange={handleToggleGrid}
        label="Show Grid"
        size="sm"
      />

      {/* Grid Size */}
      {grid.showGrid && (
        <>
          <SNSlider
            value={grid.gridSize}
            min={5}
            max={100}
            step={5}
            label="Grid Size"
            showValue
            formatValue={(v) => `${v}px`}
            onChange={handleGridSizeChange}
            size="sm"
          />

          {/* Size Presets */}
          <div style={styles.presetsSection}>
            <span style={styles.presetsLabel}>Quick Sizes</span>
            <div style={styles.presetGrid}>
              {GRID_SIZE_PRESETS.map((size) => (
                <button
                  key={size}
                  onClick={() => handleGridSizeChange(size)}
                  style={{
                    ...styles.presetButton,
                    background: grid.gridSize === size
                      ? 'var(--sn-accent-primary)'
                      : 'var(--sn-bg-tertiary)',
                    color: grid.gridSize === size
                      ? 'white'
                      : 'var(--sn-text-secondary)',
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Color */}
          <div style={styles.colorSection}>
            <span style={styles.label}>Grid Color</span>
            <div style={styles.colorRow}>
              <input
                type="color"
                value={grid.gridColor.startsWith('rgba') ? '#8b5cf6' : grid.gridColor}
                onChange={(e) => handleGridColorChange(e.target.value)}
                style={styles.colorInput}
              />
              <div style={styles.colorPresets}>
                {['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ffffff'].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleGridColorChange(color)}
                    style={{
                      ...styles.colorPreset,
                      background: color,
                      border: grid.gridColor === color ? '2px solid var(--sn-text-primary)' : '1px solid var(--sn-border-secondary)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Grid Opacity */}
          <SNSlider
            value={grid.gridOpacity}
            min={10}
            max={100}
            step={5}
            label="Grid Opacity"
            showValue
            formatValue={(v) => `${v}%`}
            onChange={handleGridOpacityChange}
            size="sm"
          />
        </>
      )}

      {/* Divider */}
      <div style={styles.divider} />

      {/* Snap Settings */}
      <div style={styles.snapSection}>
        <span style={styles.sectionTitle}>Snap Settings</span>

        <SNToggle
          checked={grid.snapToGrid}
          onChange={handleToggleSnap}
          label="Snap to Grid"
          size="sm"
        />

        <SNToggle
          checked={grid.snapToCenter}
          onChange={handleToggleCenterSnap}
          label="Snap to Center"
          size="sm"
        />

        <SNToggle
          checked={grid.showCenterGuides}
          onChange={handleToggleCenterGuides}
          label="Show Center Guides"
          size="sm"
        />
      </div>

      {/* Grid Preview */}
      <div style={styles.preview}>
        <span style={styles.label}>Preview</span>
        <div style={styles.previewBox}>
          {grid.showGrid && (
            <div
              style={{
                ...styles.gridPattern,
                backgroundSize: grid.gridType === 'regular'
                  ? `${grid.gridSize}px ${grid.gridSize}px`
                  : `${grid.gridSize * 2}px ${grid.gridSize * 1.732}px`,
                backgroundImage: grid.gridType === 'regular'
                  ? `
                    linear-gradient(${grid.gridColor} 1px, transparent 1px),
                    linear-gradient(90deg, ${grid.gridColor} 1px, transparent 1px)
                  `
                  : `
                    linear-gradient(30deg, ${grid.gridColor} 12%, transparent 12.5%, transparent 87%, ${grid.gridColor} 87.5%, ${grid.gridColor}),
                    linear-gradient(150deg, ${grid.gridColor} 12%, transparent 12.5%, transparent 87%, ${grid.gridColor} 87.5%, ${grid.gridColor})
                  `,
              }}
            />
          )}
          {grid.showCenterGuides && (
            <>
              <div style={styles.centerLineH} />
              <div style={styles.centerLineV} />
            </>
          )}
        </div>
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
  label: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  typeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  typeButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  typeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    border: '1px solid var(--sn-border-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  presetsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  presetsLabel: {
    fontSize: 10,
    color: 'var(--sn-text-muted)',
  },
  presetGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  presetButton: {
    padding: '4px 8px',
    fontSize: 10,
    fontWeight: 500,
    borderRadius: 4,
    border: '1px solid var(--sn-border-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  divider: {
    height: 1,
    background: 'var(--sn-border-secondary)',
    margin: '4px 0',
  },
  snapSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
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
    background: 'var(--sn-bg-primary)',
    borderRadius: 6,
    overflow: 'hidden',
    border: '1px solid var(--sn-border-secondary)',
  },
  gridPattern: {
    position: 'absolute',
    inset: 0,
  },
  centerLineH: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    background: 'rgba(139, 92, 246, 0.5)',
    borderTop: '1px dashed rgba(139, 92, 246, 0.5)',
  },
  centerLineV: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    background: 'rgba(139, 92, 246, 0.5)',
    borderLeft: '1px dashed rgba(139, 92, 246, 0.5)',
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
};

export default GridSection;
