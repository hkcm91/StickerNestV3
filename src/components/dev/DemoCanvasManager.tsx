/**
 * StickerNest v2 - Demo Canvas Manager Panel
 *
 * Admin panel for selecting which canvases appear in the landing page demo.
 */

import React, { useState, useEffect } from 'react';
import {
  useDemoCanvases,
  getAllCanvasOptions,
  type CanvasOption,
} from '../../hooks/useDemoCanvases';

interface DemoCanvasManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoCanvasManager: React.FC<DemoCanvasManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    demoCanvases,
    defaultCanvasId,
    addDemoCanvas,
    removeDemoCanvas,
    updateDemoCanvas,
    setDefaultCanvas,
  } = useDemoCanvases();

  const [canvasOptions, setCanvasOptions] = useState<CanvasOption[]>([]);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');

  // Load all available canvases
  useEffect(() => {
    if (isOpen) {
      setCanvasOptions(getAllCanvasOptions());
    }
  }, [isOpen]);

  const handleToggleDemo = (canvas: CanvasOption) => {
    if (canvas.isDemo) {
      removeDemoCanvas(canvas.id);
    } else {
      addDemoCanvas(canvas.id, canvas.name);
    }
    // Refresh options
    setCanvasOptions(getAllCanvasOptions());
  };

  const handleSetDefault = (canvasId: string) => {
    setDefaultCanvas(canvasId);
  };

  const handleStartEditLabel = (canvasId: string, currentLabel: string) => {
    setEditingLabel(canvasId);
    setLabelInput(currentLabel);
  };

  const handleSaveLabel = (canvasId: string) => {
    updateDemoCanvas(canvasId, { label: labelInput });
    setEditingLabel(null);
    setLabelInput('');
  };

  if (!isOpen) return null;

  const demoCount = demoCanvases.length;
  const availableCount = canvasOptions.length;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>Demo Canvas Manager</h3>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Stats */}
        <div style={styles.stats}>
          <span style={styles.stat}>
            {demoCount} demo{demoCount !== 1 ? 's' : ''} configured
          </span>
          <span style={styles.statDivider}>•</span>
          <span style={styles.stat}>{availableCount} canvases available</span>
        </div>

        {/* Canvas List */}
        <div style={styles.content}>
          {canvasOptions.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📋</span>
              <p style={styles.emptyText}>No canvases found</p>
              <p style={styles.emptyHint}>
                Create a canvas in the app first, then return here to mark it as
                a demo.
              </p>
            </div>
          ) : (
            <div style={styles.canvasList}>
              {canvasOptions.map((canvas) => {
                const demoConfig = demoCanvases.find(
                  (d) => d.canvasId === canvas.id
                );
                const isDefault = defaultCanvasId === canvas.id;
                const isEditing = editingLabel === canvas.id;

                return (
                  <div
                    key={canvas.id}
                    style={{
                      ...styles.canvasItem,
                      ...(canvas.isDemo ? styles.canvasItemActive : {}),
                    }}
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleDemo(canvas)}
                      style={{
                        ...styles.toggleButton,
                        ...(canvas.isDemo ? styles.toggleButtonActive : {}),
                      }}
                    >
                      {canvas.isDemo ? '✓' : ''}
                    </button>

                    {/* Canvas Info */}
                    <div style={styles.canvasInfo}>
                      <div style={styles.canvasName}>{canvas.name}</div>
                      <div style={styles.canvasMeta}>
                        {canvas.widgetCount} widgets •{' '}
                        <span style={styles.canvasId}>{canvas.id.slice(0, 12)}...</span>
                      </div>

                      {/* Demo Label (editable) */}
                      {canvas.isDemo && (
                        <div style={styles.labelRow}>
                          {isEditing ? (
                            <div style={styles.labelEdit}>
                              <input
                                type="text"
                                value={labelInput}
                                onChange={(e) => setLabelInput(e.target.value)}
                                style={styles.labelInput}
                                placeholder="Demo label"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveLabel(canvas.id);
                                  if (e.key === 'Escape') setEditingLabel(null);
                                }}
                              />
                              <button
                                onClick={() => handleSaveLabel(canvas.id)}
                                style={styles.labelSaveButton}
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div style={styles.labelDisplay}>
                              <span style={styles.labelText}>
                                Label: {demoConfig?.label || canvas.name}
                              </span>
                              <button
                                onClick={() =>
                                  handleStartEditLabel(
                                    canvas.id,
                                    demoConfig?.label || canvas.name
                                  )
                                }
                                style={styles.editButton}
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Default badge / Set default button */}
                    {canvas.isDemo && (
                      <div style={styles.defaultSection}>
                        {isDefault ? (
                          <span style={styles.defaultBadge}>Default</span>
                        ) : (
                          <button
                            onClick={() => handleSetDefault(canvas.id)}
                            style={styles.setDefaultButton}
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Demo canvases appear in the landing page dropdown. The default canvas
            loads first.
          </p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

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
  },
  panel: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80vh',
    background: '#1a1a2e',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 18,
    cursor: 'pointer',
    padding: 4,
  },
  stats: {
    padding: '10px 20px',
    background: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stat: {
    fontSize: 12,
    color: '#64748b',
  },
  statDivider: {
    color: '#4b5563',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 16,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
    display: 'block',
  },
  emptyText: {
    color: '#e2e8f0',
    fontSize: 15,
    margin: '0 0 8px',
  },
  emptyHint: {
    color: '#64748b',
    fontSize: 13,
    margin: 0,
    lineHeight: 1.5,
  },
  canvasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  canvasItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    border: '1px solid transparent',
    transition: 'all 0.2s',
  },
  canvasItemActive: {
    background: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  toggleButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: '2px solid #4b5563',
    background: 'transparent',
    color: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 2,
  },
  toggleButtonActive: {
    background: '#8b5cf6',
    borderColor: '#8b5cf6',
    color: '#fff',
  },
  canvasInfo: {
    flex: 1,
    minWidth: 0,
  },
  canvasName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  canvasMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  canvasId: {
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  labelRow: {
    marginTop: 8,
  },
  labelDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  labelText: {
    fontSize: 12,
    color: '#a78bfa',
  },
  editButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    fontSize: 12,
  },
  labelEdit: {
    display: 'flex',
    gap: 8,
  },
  labelInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 12,
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 4,
    color: '#e2e8f0',
    outline: 'none',
  },
  labelSaveButton: {
    padding: '6px 12px',
    fontSize: 12,
    background: '#8b5cf6',
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    cursor: 'pointer',
  },
  defaultSection: {
    flexShrink: 0,
  },
  defaultBadge: {
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    borderRadius: 4,
  },
  setDefaultButton: {
    padding: '4px 8px',
    fontSize: 11,
    background: 'transparent',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 4,
    color: '#a78bfa',
    cursor: 'pointer',
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid rgba(139, 92, 246, 0.2)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
};

export default DemoCanvasManager;
