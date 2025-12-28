/**
 * StickerNest v2 - Canvas Size Dialog
 * Dialog for changing canvas dimensions with presets and custom sizes
 */

import React, { useState, useMemo } from 'react';
import { CANVAS_SIZE_PRESETS, type CanvasSizePreset } from '../types/domain';

interface CanvasSizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  currentWidth?: number;
  currentHeight?: number;
  onResize: (canvasId: string, width: number, height: number, scaleWidgets: boolean) => Promise<any>;
}

export const CanvasSizeDialog: React.FC<CanvasSizeDialogProps> = ({
  isOpen,
  onClose,
  canvasId,
  currentWidth = 1920,
  currentHeight = 1080,
  onResize,
}) => {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [lockAspect, setLockAspect] = useState(false);
  const [scaleWidgets, setScaleWidgets] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'screen' | 'social' | 'print' | 'custom'>('screen');

  const aspectRatio = currentWidth / currentHeight;

  // Group presets by category
  const presetsByCategory = useMemo(() => {
    return CANVAS_SIZE_PRESETS.reduce((acc, preset) => {
      if (!acc[preset.category]) {
        acc[preset.category] = [];
      }
      acc[preset.category].push(preset);
      return acc;
    }, {} as Record<string, CanvasSizePreset[]>);
  }, []);

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    if (lockAspect) {
      setHeight(Math.round(newWidth / aspectRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    if (lockAspect) {
      setWidth(Math.round(newHeight * aspectRatio));
    }
  };

  const handlePresetSelect = (preset: CanvasSizePreset) => {
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onResize(canvasId, width, height, scaleWidgets);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleSwapDimensions = () => {
    setWidth(height);
    setHeight(width);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Canvas Size</h2>
          <button onClick={onClose} style={styles.closeButton}>x</button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Category tabs */}
          <div style={styles.tabs}>
            {(['screen', 'social', 'print', 'custom'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  ...styles.tab,
                  ...(activeCategory === cat ? styles.tabActive : {}),
                }}
              >
                {cat === 'screen' && '🖥️'}
                {cat === 'social' && '📱'}
                {cat === 'print' && '🖨️'}
                {cat === 'custom' && '📐'}
                {' '}
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Presets grid */}
          {activeCategory !== 'custom' && (
            <div style={styles.presetsGrid}>
              {presetsByCategory[activeCategory]?.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  style={{
                    ...styles.presetCard,
                    ...(width === preset.width && height === preset.height ? styles.presetActive : {}),
                  }}
                >
                  <div style={styles.presetPreview}>
                    <div
                      style={{
                        ...styles.presetBox,
                        aspectRatio: `${preset.width} / ${preset.height}`,
                        maxWidth: preset.width > preset.height ? '100%' : 'auto',
                        maxHeight: preset.width > preset.height ? 'auto' : '100%',
                      }}
                    />
                  </div>
                  <div style={styles.presetName}>{preset.name}</div>
                  <div style={styles.presetDimensions}>
                    {preset.width} x {preset.height}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Custom size inputs */}
          {activeCategory === 'custom' && (
            <div style={styles.customSection}>
              <div style={styles.dimensionInputs}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Width</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                    style={styles.numberInput}
                    min={100}
                    max={10000}
                  />
                  <span style={styles.inputUnit}>px</span>
                </div>
                <button
                  onClick={handleSwapDimensions}
                  style={styles.swapButton}
                  title="Swap dimensions"
                >
                  ⇄
                </button>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Height</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                    style={styles.numberInput}
                    min={100}
                    max={10000}
                  />
                  <span style={styles.inputUnit}>px</span>
                </div>
              </div>

              <div style={styles.aspectInfo}>
                Aspect ratio: {(width / height).toFixed(2)}:1
                {' '}
                ({Math.round(width / gcd(width, height))}:{Math.round(height / gcd(width, height))})
              </div>
            </div>
          )}

          {/* Current size preview */}
          <div style={styles.preview}>
            <div style={styles.previewLabel}>Preview</div>
            <div style={styles.previewContainer}>
              <div
                style={{
                  ...styles.previewCanvas,
                  aspectRatio: `${width} / ${height}`,
                  maxWidth: width > height ? '100%' : 'auto',
                  maxHeight: width > height ? 'auto' : '100%',
                }}
              >
                <span style={styles.previewDimensions}>{width} x {height}</span>
              </div>
            </div>
          </div>

          {/* Options */}
          <div style={styles.options}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={(e) => setLockAspect(e.target.checked)}
                style={styles.checkbox}
              />
              Lock aspect ratio
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={scaleWidgets}
                onChange={(e) => setScaleWidgets(e.target.checked)}
                style={styles.checkbox}
              />
              Scale widgets proportionally
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerInfo}>
            Current: {currentWidth} x {currentHeight}
          </div>
          <div style={styles.footerButtons}>
            <button onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying || (width === currentWidth && height === currentHeight)}
              style={{
                ...styles.applyButton,
                opacity: isApplying || (width === currentWidth && height === currentHeight) ? 0.5 : 1,
              }}
            >
              {isApplying ? 'Applying...' : 'Apply Size'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// GCD helper for aspect ratio calculation
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : Math.abs(a);
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(4px)',
  },
  dialog: {
    background: '#1a1a2e',
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: 0,
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: 600,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 24,
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
  },
  content: {
    padding: 24,
    flex: 1,
    overflow: 'auto',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: '10px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
    color: '#e2e8f0',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  presetCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  presetActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  presetPreview: {
    width: '100%',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  presetBox: {
    background: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 4,
    maxWidth: '100%',
    maxHeight: '100%',
  },
  presetName: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: 500,
    textAlign: 'center',
  },
  presetDimensions: {
    color: '#64748b',
    fontSize: 10,
  },
  customSection: {
    marginBottom: 20,
  },
  dimensionInputs: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 500,
  },
  numberInput: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 6,
    padding: '12px 14px',
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: 600,
    width: '100%',
    outline: 'none',
  },
  inputUnit: {
    position: 'absolute',
    right: 12,
    color: '#64748b',
    fontSize: 12,
  },
  swapButton: {
    background: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 6,
    padding: '12px',
    color: '#a78bfa',
    fontSize: 18,
    cursor: 'pointer',
    marginBottom: 0,
  },
  aspectInfo: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  preview: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 500,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  previewContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  previewCanvas: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(168, 85, 247, 0.2) 100%)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    maxHeight: '100%',
  },
  previewDimensions: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 600,
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
  },
  options: {
    display: 'flex',
    gap: 24,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#94a3b8',
    fontSize: 13,
    cursor: 'pointer',
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: '#8b5cf6',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  footerInfo: {
    color: '#64748b',
    fontSize: 12,
  },
  footerButtons: {
    display: 'flex',
    gap: 12,
  },
  cancelButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  applyButton: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default CanvasSizeDialog;
