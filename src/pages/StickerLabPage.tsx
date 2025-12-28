/**
 * StickerNest v2 - Sticker Lab 3.0
 * =================================
 *
 * Standalone widget development environment.
 * Generate, test, iterate, and export widgets before adding to your main canvas.
 *
 * Features:
 * - AI-powered widget generation
 * - Isolated test canvas with same protocol as main app
 * - Live widget preview and iteration
 * - Export widgets as HTML, bundle, or archive
 * - Draft management for work-in-progress widgets
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RuntimeContext } from '../runtime/RuntimeContext';
import { WidgetLab } from '../widget-lab/WidgetLab';
import { WidgetPreview } from '../widget-lab/WidgetPreview';
import { CanvasRenderer } from '../components/CanvasRenderer';
import { getDraftManager, type DraftWidget } from '../ai/DraftManager';
import { exportWidget, downloadExport, type ExportFormat, type ExportOptions } from '../services/widgetExporter';
import { useAuth } from '../contexts/AuthContext';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';
import type { WidgetInstance } from '../types/domain';

// Design tokens
const theme = {
  bg: {
    primary: '#0f0f19',
    secondary: '#1a1a2e',
    tertiary: '#252542',
    elevated: '#1e1e38',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    tertiary: '#64748b',
  },
  accent: '#8b5cf6',
  accentHover: '#7c3aed',
  accentMuted: 'rgba(139, 92, 246, 0.15)',
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#22c55e',
  error: '#ef4444',
};

type LabView = 'split' | 'canvas' | 'generator';

export const StickerLabPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLocalDevMode } = useAuth();
  const userId = user?.id || 'lab-user';

  // Runtime for the test canvas
  const [runtime] = useState(() => new RuntimeContext(userId, 'lab-canvas'));

  // View state
  const [view, setView] = useState<LabView>('split');
  const [sidebarWidth, setSidebarWidth] = useState(480);

  // Widget state
  const [testWidgets, setTestWidgets] = useState<WidgetInstance[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DraftWidget | null>(null);
  const [drafts, setDrafts] = useState<DraftWidget[]>(() => getDraftManager().getAllDrafts());

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('html');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'html',
    includeWidgetAPI: true,
    includeMetadata: true,
    minify: false,
  });

  // Subscribe to draft changes
  useEffect(() => {
    const draftManager = getDraftManager();
    const unsubscribe = draftManager.subscribe((event) => {
      setDrafts(draftManager.getAllDrafts());
      if (event.type === 'created' || event.type === 'updated') {
        setSelectedDraft(event.draft);
      }
    });
    return unsubscribe;
  }, []);

  // Add widget to test canvas
  const handleAddToTestCanvas = useCallback((draft: DraftWidget) => {
    const newWidget: WidgetInstance = {
      id: `test-${Date.now()}`,
      widgetDefId: draft.manifest.id,
      position: { x: 100 + (testWidgets.length * 50), y: 100 + (testWidgets.length * 50) },
      size: draft.manifest.defaultSize || { width: 300, height: 200 },
      zIndex: testWidgets.length + 1,
      metadata: {
        name: draft.manifest.name,
        html: draft.html,
        manifest: draft.manifest,
      },
    };
    setTestWidgets((prev) => [...prev, newWidget]);
    setSelectedDraft(draft);
  }, [testWidgets.length]);

  // Clear test canvas
  const handleClearCanvas = useCallback(() => {
    setTestWidgets([]);
  }, []);

  // Export widget
  const handleExport = useCallback(async () => {
    if (!selectedDraft) return;

    const result = await exportWidget(selectedDraft, {
      ...exportOptions,
      format: exportFormat,
    });

    if (result.success) {
      downloadExport(result);
      setShowExportModal(false);
    } else {
      console.error('Export failed:', result.error);
    }
  }, [selectedDraft, exportFormat, exportOptions]);

  // Delete draft
  const handleDeleteDraft = useCallback((draftId: string) => {
    const draftManager = getDraftManager();
    draftManager.deleteDraft(draftId);
    if (selectedDraft?.id === draftId) {
      setSelectedDraft(null);
    }
  }, [selectedDraft]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <SNIconButton
            icon="arrow-left"
            onClick={() => navigate(-1)}
            tooltip="Back"
            size={32}
          />
          <div style={styles.logo}>
            <SNIcon name="flask" size={24} color={theme.accent} />
            <span style={styles.logoText}>Sticker Lab 3.0</span>
          </div>
        </div>

        <div style={styles.headerCenter}>
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.viewButton,
                ...(view === 'generator' ? styles.viewButtonActive : {}),
              }}
              onClick={() => setView('generator')}
            >
              <SNIcon name="wand" size={16} />
              Generator
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(view === 'split' ? styles.viewButtonActive : {}),
              }}
              onClick={() => setView('split')}
            >
              <SNIcon name="columns" size={16} />
              Split
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(view === 'canvas' ? styles.viewButtonActive : {}),
              }}
              onClick={() => setView('canvas')}
            >
              <SNIcon name="layout" size={16} />
              Canvas
            </button>
          </div>
        </div>

        <div style={styles.headerRight}>
          {selectedDraft && (
            <button
              style={styles.exportButton}
              onClick={() => setShowExportModal(true)}
            >
              <SNIcon name="download" size={16} />
              Export Widget
            </button>
          )}
          <button
            style={styles.helpButton}
            onClick={() => window.open('https://docs.stickernest.com/lab', '_blank')}
          >
            <SNIcon name="help-circle" size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Generator Panel */}
        {(view === 'split' || view === 'generator') && (
          <div
            style={{
              ...styles.generatorPanel,
              width: view === 'split' ? sidebarWidth : '100%',
            }}
          >
            <WidgetLab
              runtime={runtime}
              onSwitchToCanvas={() => setView('canvas')}
            />
          </div>
        )}

        {/* Resize Handle */}
        {view === 'split' && (
          <div
            style={styles.resizeHandle}
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = sidebarWidth;
              const onMouseMove = (e: MouseEvent) => {
                const newWidth = Math.max(320, Math.min(800, startWidth + e.clientX - startX));
                setSidebarWidth(newWidth);
              };
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          />
        )}

        {/* Test Canvas */}
        {(view === 'split' || view === 'canvas') && (
          <div style={styles.canvasPanel}>
            {/* Canvas Header */}
            <div style={styles.canvasHeader}>
              <span style={styles.canvasTitle}>
                <SNIcon name="layout" size={16} color={theme.text.tertiary} />
                Test Canvas
              </span>
              <span style={styles.widgetCount}>
                {testWidgets.length} widget{testWidgets.length !== 1 ? 's' : ''}
              </span>
              <div style={styles.canvasActions}>
                <SNIconButton
                  icon="trash-2"
                  onClick={handleClearCanvas}
                  tooltip="Clear Canvas"
                  size={28}
                  disabled={testWidgets.length === 0}
                />
              </div>
            </div>

            {/* Canvas Area */}
            <div style={styles.canvasArea}>
              {testWidgets.length === 0 ? (
                <div style={styles.emptyCanvas}>
                  <SNIcon name="box" size={48} color={theme.text.muted} />
                  <p style={styles.emptyTitle}>No widgets on test canvas</p>
                  <p style={styles.emptySubtitle}>
                    Generate a widget and click "Add to Canvas" to test it here
                  </p>
                </div>
              ) : (
                <div style={styles.widgetGrid}>
                  {testWidgets.map((widget) => (
                    <div key={widget.id} style={styles.widgetSlot}>
                      <div style={styles.widgetFrame}>
                        <iframe
                          srcDoc={widget.metadata?.html as string}
                          style={styles.widgetIframe}
                          sandbox="allow-scripts"
                          title={widget.metadata?.name as string}
                        />
                      </div>
                      <div style={styles.widgetLabel}>
                        {widget.metadata?.name as string}
                      </div>
                      <button
                        style={styles.removeWidget}
                        onClick={() => setTestWidgets((prev) => prev.filter((w) => w.id !== widget.id))}
                      >
                        <SNIcon name="x" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Draft Quick Actions Bar */}
      {drafts.length > 0 && (
        <div style={styles.draftsBar}>
          <span style={styles.draftsLabel}>Recent Drafts:</span>
          <div style={styles.draftsList}>
            {drafts.slice(0, 5).map((draft) => (
              <button
                key={draft.id}
                style={{
                  ...styles.draftChip,
                  ...(selectedDraft?.id === draft.id ? styles.draftChipActive : {}),
                }}
                onClick={() => setSelectedDraft(draft)}
              >
                {draft.manifest.name}
              </button>
            ))}
          </div>
          {selectedDraft && (
            <div style={styles.draftActions}>
              <button
                style={styles.draftAction}
                onClick={() => handleAddToTestCanvas(selectedDraft)}
              >
                <SNIcon name="plus" size={14} />
                Add to Canvas
              </button>
              <button
                style={styles.draftAction}
                onClick={() => setShowExportModal(true)}
              >
                <SNIcon name="download" size={14} />
                Export
              </button>
            </div>
          )}
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && selectedDraft && (
        <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Export Widget</h3>
            <p style={styles.modalSubtitle}>
              Export "{selectedDraft.manifest.name}" for use outside StickerNest
            </p>

            {/* Format Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Format</label>
              <div style={styles.formatOptions}>
                {(['html', 'bundle', 'zip'] as ExportFormat[]).map((fmt) => (
                  <label key={fmt} style={styles.formatOption}>
                    <input
                      type="radio"
                      name="format"
                      value={fmt}
                      checked={exportFormat === fmt}
                      onChange={() => setExportFormat(fmt)}
                      style={styles.radio}
                    />
                    <div>
                      <span style={styles.formatName}>
                        {fmt === 'html' ? 'HTML File' : fmt === 'bundle' ? 'Bundle (JSON)' : 'Archive (.snw)'}
                      </span>
                      <span style={styles.formatDesc}>
                        {fmt === 'html'
                          ? 'Single HTML file, standalone'
                          : fmt === 'bundle'
                          ? 'Manifest + HTML as JSON'
                          : 'Full widget archive'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Options */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Options</label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={exportOptions.includeWidgetAPI}
                  onChange={(e) => setExportOptions((prev) => ({ ...prev, includeWidgetAPI: e.target.checked }))}
                />
                Include WidgetAPI mock (for standalone testing)
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => setExportOptions((prev) => ({ ...prev, includeMetadata: e.target.checked }))}
                />
                Include metadata comments
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={exportOptions.minify}
                  onChange={(e) => setExportOptions((prev) => ({ ...prev, minify: e.target.checked }))}
                />
                Minify output
              </label>
            </div>

            {/* Actions */}
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button style={styles.downloadButton} onClick={handleExport}>
                <SNIcon name="download" size={16} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: theme.bg.primary,
    color: theme.text.primary,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid ${theme.border}`,
    background: theme.bg.secondary,
    gap: 16,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: theme.text.primary,
  },
  headerCenter: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  viewToggle: {
    display: 'flex',
    background: theme.bg.tertiary,
    borderRadius: 8,
    padding: 4,
  },
  viewButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: theme.text.secondary,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  viewButtonActive: {
    background: theme.accent,
    color: '#fff',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  exportButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: theme.accent,
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  helpButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    background: 'transparent',
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    color: theme.text.secondary,
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  generatorPanel: {
    height: '100%',
    borderRight: `1px solid ${theme.border}`,
    overflow: 'auto',
  },
  resizeHandle: {
    width: 4,
    cursor: 'col-resize',
    background: 'transparent',
    transition: 'background 0.15s',
  },
  canvasPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  canvasHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderBottom: `1px solid ${theme.border}`,
    background: theme.bg.secondary,
  },
  canvasTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.9rem',
    fontWeight: 500,
    color: theme.text.primary,
  },
  widgetCount: {
    fontSize: '0.8rem',
    color: theme.text.tertiary,
  },
  canvasActions: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 4,
  },
  canvasArea: {
    flex: 1,
    overflow: 'auto',
    background: `repeating-linear-gradient(
      45deg,
      ${theme.bg.primary},
      ${theme.bg.primary} 10px,
      ${theme.bg.secondary} 10px,
      ${theme.bg.secondary} 20px
    )`,
  },
  emptyCanvas: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 12,
    color: theme.text.tertiary,
  },
  emptyTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 500,
  },
  emptySubtitle: {
    margin: 0,
    fontSize: '0.85rem',
    color: theme.text.muted,
  },
  widgetGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    padding: 24,
  },
  widgetSlot: {
    position: 'relative',
    width: 320,
    height: 240,
  },
  widgetFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    border: `1px solid ${theme.border}`,
  },
  widgetIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  widgetLabel: {
    position: 'absolute',
    bottom: -24,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: '0.8rem',
    color: theme.text.secondary,
  },
  removeWidget: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    background: 'rgba(0, 0, 0, 0.6)',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderTop: `1px solid ${theme.border}`,
    background: theme.bg.secondary,
  },
  draftsLabel: {
    fontSize: '0.8rem',
    color: theme.text.tertiary,
  },
  draftsList: {
    display: 'flex',
    gap: 8,
    flex: 1,
    overflow: 'auto',
  },
  draftChip: {
    padding: '6px 12px',
    background: theme.bg.tertiary,
    border: 'none',
    borderRadius: 16,
    color: theme.text.secondary,
    fontSize: '0.8rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  draftChipActive: {
    background: theme.accentMuted,
    color: theme.accent,
  },
  draftActions: {
    display: 'flex',
    gap: 8,
  },
  draftAction: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    background: 'transparent',
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    color: theme.text.secondary,
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: 420,
    background: theme.bg.secondary,
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    margin: '0 0 4px',
    fontSize: '1.2rem',
    fontWeight: 600,
  },
  modalSubtitle: {
    margin: '0 0 20px',
    fontSize: '0.9rem',
    color: theme.text.tertiary,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: '0.85rem',
    fontWeight: 500,
    color: theme.text.secondary,
  },
  formatOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  formatOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 12px',
    background: theme.bg.tertiary,
    borderRadius: 8,
    cursor: 'pointer',
  },
  radio: {
    marginTop: 3,
    accentColor: theme.accent,
  },
  formatName: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  formatDesc: {
    display: 'block',
    fontSize: '0.8rem',
    color: theme.text.tertiary,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    fontSize: '0.85rem',
    color: theme.text.secondary,
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    padding: '10px 20px',
    background: 'transparent',
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    color: theme.text.secondary,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  downloadButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    background: theme.accent,
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default StickerLabPage;
