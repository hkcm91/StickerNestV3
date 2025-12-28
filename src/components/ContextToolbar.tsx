/**
 * StickerNest v2 - ContextToolbar
 * Dynamic toolbar that changes based on current selection
 * Shows different controls for no selection, single widget, or multi-widget selection
 *
 * Updated with new design system: SNIcon, SNIconButton, glass effects
 */

import React, { useCallback } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';
import { usePanelsStore, usePanelsByCanvas } from '../state/usePanelsStore';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';

interface ContextToolbarProps {
  /** Additional class name */
  className?: string;
}

export const ContextToolbar: React.FC<ContextToolbarProps> = ({ className = '' }) => {
  // Selection state
  const selection = useCanvasStore(state => state.selection);
  const mode = useCanvasStore(state => state.mode);
  const grid = useCanvasStore(state => state.grid);
  const canvasId = useCanvasStore(state => state.canvasId);

  // Panel store
  const createPanel = usePanelsStore(state => state.createPanel);
  const panels = usePanelsByCanvas(canvasId);

  // Actions
  const deselectAll = useCanvasStore(state => state.deselectAll);
  const deleteSelectedWidgets = useCanvasStore(state => state.deleteSelectedWidgets);
  const duplicateSelectedWidgets = useCanvasStore(state => state.duplicateSelectedWidgets);
  const alignSelectedWidgets = useCanvasStore(state => state.alignSelectedWidgets);
  const distributeSelectedWidgets = useCanvasStore(state => state.distributeSelectedWidgets);
  const bringToFront = useCanvasStore(state => state.bringToFront);
  const sendToBack = useCanvasStore(state => state.sendToBack);
  const toggleSnapToGrid = useCanvasStore(state => state.toggleSnapToGrid);
  const toggleGrid = useCanvasStore(state => state.toggleGrid);
  const setGridSettings = useCanvasStore(state => state.setGridSettings);

  const selectedCount = selection.selectedIds.size;
  const hasSelection = selectedCount > 0;
  const isMultiSelect = selectedCount > 1;
  const primaryId = selection.primaryId;
  const isEditMode = mode === 'edit';

  // Create new floating panel
  const handleCreatePanel = useCallback(() => {
    if (!canvasId) return;

    // Calculate cascaded position based on existing panels
    let position = { x: 100, y: 100 };
    if (panels.length > 0) {
      const lastPanel = panels[panels.length - 1];
      position = {
        x: Math.min(lastPanel.position.x + 30, 600),
        y: Math.min(lastPanel.position.y + 30, 400),
      };
    }

    createPanel({
      canvasId,
      title: `Panel ${panels.length + 1}`,
      position,
      size: { width: 320, height: 400 },
    });
  }, [canvasId, panels, createPanel]);

  return (
    <div
      className={`context-toolbar ${className}`}
      style={styles.toolbar}
    >
      {/* Mode indicator */}
      <div style={styles.section}>
        <span style={{
          ...styles.modeIndicator,
          background: isEditMode ? 'var(--sn-accent-primary, #8b5cf6)' : 'var(--sn-accent-info, #3b82f6)',
        }}>
          <SNIcon name={isEditMode ? 'edit' : 'visible'} size="xs" />
          <span>{isEditMode ? 'Edit' : 'View'}</span>
        </span>
      </div>

      <div style={styles.divider} />

      {/* Panel creation - edit mode only */}
      {isEditMode && (
        <>
          <div style={styles.section}>
            <SNIconButton
              icon="panel"
              variant={panels.length > 0 ? 'primary' : 'glass'}
              size="sm"
              tooltip={`New Floating Panel (${panels.length} active)`}
              badge={panels.length > 0 ? panels.length : undefined}
              onClick={handleCreatePanel}
            />
          </div>
          <div style={styles.divider} />
        </>
      )}

      {/* Selection info */}
      <div style={styles.section}>
        <span style={styles.selectionInfo}>
          {hasSelection ? (
            <>
              <SNIcon name={isMultiSelect ? 'group' : 'widget'} size="sm" />
              <span>
                {isMultiSelect ? `${selectedCount} selected` : 'Widget selected'}
              </span>
            </>
          ) : (
            <>
              <SNIcon name="circle" size="sm" />
              <span style={{ opacity: 0.6 }}>No selection</span>
            </>
          )}
        </span>
      </div>

      <div style={styles.divider} />

      {/* Selection actions - edit mode only */}
      {hasSelection && isEditMode && (
        <>
          <div style={styles.section}>
            <SNIconButton
              icon="copy"
              variant="glass"
              size="sm"
              tooltip="Duplicate (Ctrl+D)"
              onClick={duplicateSelectedWidgets}
            />
            <SNIconButton
              icon="delete"
              variant="danger"
              size="sm"
              tooltip="Delete (Delete)"
              onClick={deleteSelectedWidgets}
            />
          </div>

          <div style={styles.divider} />

          {/* Z-index controls */}
          <div style={styles.section}>
            <span style={styles.label}>
              <SNIcon name="layers" size="xs" />
            </span>
            <SNIconButton
              icon="chevronUp"
              variant="glass"
              size="sm"
              tooltip="Bring to Front"
              onClick={() => primaryId && bringToFront(primaryId)}
              disabled={!primaryId}
            />
            <SNIconButton
              icon="chevronDown"
              variant="glass"
              size="sm"
              tooltip="Send to Back"
              onClick={() => primaryId && sendToBack(primaryId)}
              disabled={!primaryId}
            />
          </div>

          <div style={styles.divider} />
        </>
      )}

      {/* Multi-select alignment tools - edit mode only */}
      {isMultiSelect && isEditMode && (
        <>
          <div style={styles.section}>
            <span style={styles.label}>
              <SNIcon name="align" size="xs" />
            </span>
            <SNIconButton
              icon="alignLeft"
              variant="glass"
              size="sm"
              tooltip="Align Left"
              onClick={() => alignSelectedWidgets('left')}
            />
            <SNIconButton
              icon="align"
              variant="glass"
              size="sm"
              tooltip="Align Center"
              onClick={() => alignSelectedWidgets('center')}
            />
            <SNIconButton
              icon="alignRight"
              variant="glass"
              size="sm"
              tooltip="Align Right"
              onClick={() => alignSelectedWidgets('right')}
            />
            <SNIconButton
              icon="alignTop"
              variant="glass"
              size="sm"
              tooltip="Align Top"
              onClick={() => alignSelectedWidgets('top')}
            />
            <SNIconButton
              icon="alignBottom"
              variant="glass"
              size="sm"
              tooltip="Align Bottom"
              onClick={() => alignSelectedWidgets('bottom')}
            />
          </div>

          {selectedCount >= 3 && (
            <>
              <div style={styles.divider} />
              <div style={styles.section}>
                <span style={styles.label}>
                  <SNIcon name="distribute" size="xs" />
                </span>
                <SNIconButton
                  icon="distribute"
                  variant="glass"
                  size="sm"
                  tooltip="Distribute Horizontally"
                  onClick={() => distributeSelectedWidgets('horizontal')}
                />
                <SNIconButton
                  icon="rows"
                  variant="glass"
                  size="sm"
                  tooltip="Distribute Vertically"
                  onClick={() => distributeSelectedWidgets('vertical')}
                />
              </div>
            </>
          )}

          <div style={styles.divider} />
        </>
      )}

      {/* Grid controls - always visible */}
      <div style={{ ...styles.section, marginLeft: 'auto' }}>
        <span style={styles.label}>
          <SNIcon name="grid" size="xs" />
        </span>
        <SNIconButton
          icon="grid"
          variant={grid.showGrid ? 'primary' : 'glass'}
          size="sm"
          tooltip="Toggle Grid (G)"
          active={grid.showGrid}
          onClick={toggleGrid}
        />
        <SNIconButton
          icon="magnet"
          variant={grid.snapToGrid ? 'primary' : 'glass'}
          size="sm"
          tooltip="Toggle Snap to Grid"
          active={grid.snapToGrid}
          onClick={toggleSnapToGrid}
          disabled={!isEditMode}
        />
        <select
          value={grid.gridSize}
          onChange={(e) => setGridSettings({ gridSize: Number(e.target.value) })}
          style={styles.select}
        >
          <option value={5}>5px</option>
          <option value={10}>10px</option>
          <option value={20}>20px</option>
          <option value={50}>50px</option>
        </select>
      </div>

      {/* Deselect button - works in any mode if selection exists */}
      {hasSelection && (
        <>
          <div style={styles.divider} />
          <SNIconButton
            icon="close"
            variant="ghost"
            size="sm"
            tooltip="Deselect All (Escape)"
            onClick={deselectAll}
          />
        </>
      )}
    </div>
  );
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.9))',
    borderBottom: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    gap: 8,
    flexWrap: 'wrap',
    minHeight: 44,
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  modeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 'var(--sn-radius-full, 999px)',
    fontSize: 'var(--sn-text-xs, 11px)',
    fontWeight: 600,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  selectionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 'var(--sn-text-sm, 12px)',
    fontWeight: 500,
    color: 'var(--sn-text-primary, #f0f4f8)',
    minWidth: 100,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--sn-text-tertiary, #718096)',
    marginRight: 4,
  },
  divider: {
    width: 1,
    height: 24,
    background: 'var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
    margin: '0 4px',
  },
  select: {
    padding: '6px 10px',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.1))',
    borderRadius: 'var(--sn-radius-sm, 6px)',
    fontSize: 'var(--sn-text-sm, 12px)',
    cursor: 'pointer',
    background: 'var(--sn-bg-primary, rgba(0, 0, 0, 0.3))',
    color: 'var(--sn-text-primary, #f0f4f8)',
    outline: 'none',
  },
};

export default ContextToolbar;
