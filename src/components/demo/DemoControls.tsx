/**
 * StickerNest v2 - Demo Controls Component
 *
 * Header controls for the landing page demo canvas.
 * Includes canvas selector dropdown and mode buttons.
 */

import React from 'react';
import { CanvasMode } from '../../types/runtime';
import type { DemoCanvasItem } from '../../hooks/useDemoCanvases';
import type { DemoViewMode } from './DemoCanvas';

// ==================
// Types
// ==================

interface DemoControlsProps {
  // Canvas selection
  canvases: DemoCanvasItem[];
  selectedCanvasId: string | undefined;
  onCanvasChange: (canvasId: string) => void;

  // Mode controls
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;

  // View mode
  viewMode: DemoViewMode;
  onViewModeChange: (mode: DemoViewMode) => void;

  // Optional
  showWidgetLibrary?: boolean;
  onToggleWidgetLibrary?: () => void;
  showDock?: boolean;
  onToggleDock?: () => void;

  // Mobile
  isMobile?: boolean;
}

// ==================
// Component
// ==================

export const DemoControls: React.FC<DemoControlsProps> = ({
  canvases,
  selectedCanvasId,
  onCanvasChange,
  mode,
  onModeChange,
  viewMode,
  onViewModeChange,
  showWidgetLibrary,
  onToggleWidgetLibrary,
  showDock,
  onToggleDock,
  isMobile = false,
}) => {
  const hasCanvases = canvases.length > 0;

  return (
    <div style={styles.container}>
      {/* Left side - Canvas selector */}
      <div style={styles.leftSection}>
        <span style={styles.label}>Demo:</span>
        {hasCanvases ? (
          <select
            value={selectedCanvasId || ''}
            onChange={(e) => onCanvasChange(e.target.value)}
            style={styles.select}
          >
            {canvases.map((canvas) => (
              <option key={canvas.canvasId} value={canvas.canvasId}>
                {canvas.label}
              </option>
            ))}
          </select>
        ) : (
          <span style={styles.noCanvases}>No demos available</span>
        )}
      </div>

      {/* Right side - Mode controls */}
      <div style={styles.rightSection}>
        {/* Mode buttons */}
        <div style={styles.modeButtons}>
          <button
            onClick={() => onModeChange('view')}
            style={{
              ...styles.modeButton,
              ...(mode === 'view' ? styles.modeButtonActive : {}),
            }}
            title="Preview mode - interact with widgets"
          >
            {isMobile ? '👁' : 'Preview'}
          </button>
          <button
            onClick={() => onModeChange('edit')}
            style={{
              ...styles.modeButton,
              ...(mode === 'edit' ? styles.modeButtonActive : {}),
            }}
            title="Edit mode - drag, resize, rotate widgets"
          >
            {isMobile ? '✏️' : 'Edit'}
          </button>
        </div>

        {/* Widget Library Toggle (Edit mode only) */}
        {mode === 'edit' && onToggleWidgetLibrary && !isMobile && (
          <button
            onClick={onToggleWidgetLibrary}
            style={{
              ...styles.iconButton,
              ...(showWidgetLibrary ? styles.iconButtonActive : {}),
            }}
            title="Toggle widget library"
          >
            📦
          </button>
        )}

        {/* Dock Toggle */}
        {onToggleDock && !isMobile && (
          <button
            onClick={onToggleDock}
            style={{
              ...styles.iconButton,
              ...(showDock ? styles.iconButtonActive : {}),
            }}
            title="Toggle widget dock"
          >
            📌
          </button>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={() =>
            onViewModeChange(viewMode === 'fullscreen' ? 'embedded' : 'fullscreen')
          }
          style={styles.iconButton}
          title={viewMode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {viewMode === 'fullscreen' ? '⛶' : '⛶'}
        </button>
      </div>
    </div>
  );
};

// ==================
// Styles
// ==================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'rgba(26, 26, 46, 0.95)',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '12px 12px 0 0',
    flexWrap: 'wrap',
    gap: 12,
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: 500,
  },
  select: {
    padding: '8px 12px',
    fontSize: 14,
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 6,
    color: '#e2e8f0',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 150,
  },
  noCanvases: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  modeButtons: {
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  modeButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modeButtonActive: {
    background: 'rgba(139, 92, 246, 0.3)',
    color: '#e2e8f0',
  },
  iconButton: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 6,
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 16,
    transition: 'all 0.2s',
  },
  iconButtonActive: {
    background: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
    color: '#e2e8f0',
  },
};

export default DemoControls;
