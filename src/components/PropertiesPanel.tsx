/**
 * StickerNest v2 - Properties Panel
 * Sidebar panel for editing selected widget properties
 * Shows different controls based on selection type
 *
 * Updated with new design system: SNIcon, SNIconButton, glass effects
 * Now mobile-responsive with bottom sheet layout on mobile devices
 */

import React, { useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { SNButton } from '../shared-ui/SNButton';
import type { WidgetInstance, WidgetScaleMode } from '../types/domain';
import { useViewport, useTouchDevice, useSafeArea, useScrollLock } from '../hooks/useResponsive';

interface PropertiesPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel is closed */
  onClose?: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ isOpen, onClose }) => {
  // Responsive hooks
  const { isMobile, isTablet } = useViewport();
  const touch = useTouchDevice();
  const safeArea = useSafeArea();

  // Determine layout mode
  const useMobileLayout = isMobile || isTablet;
  const useTouchTargets = touch.hasCoarsePointer || touch.hasTouch;

  // Lock scroll when mobile panel is open
  useScrollLock(isOpen && useMobileLayout);

  // Use primitive selectors to avoid Map/Set reference changes causing re-renders
  const primaryId = useCanvasStore(state => state.selection.primaryId);
  const selectionCount = useCanvasStore(state => state.selection.selectedIds.size);
  const updateWidget = useCanvasStore(state => state.updateWidget);
  const bringToFront = useCanvasStore(state => state.bringToFront);
  const sendToBack = useCanvasStore(state => state.sendToBack);

  const [localValues, setLocalValues] = useState<Partial<WidgetInstance>>({});

  // Get selected widget from store at render time
  const selectedWidget = primaryId ? useCanvasStore.getState().widgets.get(primaryId) : undefined;

  // Update local values when selection changes
  useEffect(() => {
    // Get fresh widget data when primaryId changes
    const widget = primaryId ? useCanvasStore.getState().widgets.get(primaryId) : undefined;
    if (widget) {
      setLocalValues({
        position: { ...widget.position },
        width: widget.width,
        height: widget.height,
        rotation: widget.rotation,
        zIndex: widget.zIndex,
        scaleMode: widget.scaleMode,
        contentSize: widget.contentSize,
      });
    }
  }, [primaryId]); // Only depend on the primitive ID, not the widget object

  // Apply changes
  const applyChange = (updates: Partial<WidgetInstance>) => {
    if (!primaryId) return;
    updateWidget(primaryId, updates);
  };

  // Handle number input change
  const handleNumberChange = (
    field: 'x' | 'y' | 'width' | 'height' | 'rotation' | 'zIndex',
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    if (field === 'x' || field === 'y') {
      const newPos = { ...localValues.position!, [field]: numValue };
      setLocalValues({ ...localValues, position: newPos });
      applyChange({ position: newPos });
    } else {
      setLocalValues({ ...localValues, [field]: numValue });
      applyChange({ [field]: numValue });
    }
  };

  // Handle scale mode change
  const handleScaleModeChange = (mode: WidgetScaleMode) => {
    setLocalValues({ ...localValues, scaleMode: mode });
    applyChange({ scaleMode: mode });
  };

  // Reset content size to current widget dimensions (re-capture "native" size)
  const handleResetContentSize = () => {
    if (selectedWidget) {
      const newContentSize = { width: selectedWidget.width, height: selectedWidget.height };
      setLocalValues({ ...localValues, contentSize: newContentSize });
      applyChange({ contentSize: newContentSize });
    }
  };

  if (!isOpen) return null;

  // Responsive panel styles
  const panelStyle: React.CSSProperties = useMobileLayout
    ? {
        // Mobile: Bottom sheet
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '70vh',
        width: '100%',
        backgroundColor: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.95))',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--sn-glass-border, rgba(255, 255, 255, 0.1))',
        borderBottom: 'none',
        paddingBottom: safeArea.bottom || 0,
      }
    : styles.panel;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {useMobileLayout && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
          }}
        />
      )}
      <div style={panelStyle} className={useMobileLayout ? 'sn-panel-enter-up' : 'sn-panel-enter-right'}>
        {/* Mobile drag handle indicator */}
        {useMobileLayout && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 0 4px',
          }}>
            <div style={{
              width: 36,
              height: 4,
              background: 'var(--sn-border-primary, rgba(255, 255, 255, 0.2))',
              borderRadius: 2,
            }} />
          </div>
        )}
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <SNIcon name="sliders" size="sm" />
          <span>
            {selectionCount === 0
              ? 'Properties'
              : selectionCount === 1
              ? 'Widget Properties'
              : `${selectionCount} Widgets`}
          </span>
        </div>
        {onClose && (
          <SNIconButton
            icon="close"
            variant="ghost"
            size="sm"
            tooltip="Close panel"
            onClick={onClose}
          />
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {selectionCount === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <SNIcon name="widget" size="xl" />
            </div>
            <p style={styles.emptyText}>Select a widget to edit its properties</p>
          </div>
        ) : selectionCount === 1 && selectedWidget ? (
          <>
            {/* Widget Info */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>
                <SNIcon name="info" size="xs" />
                Widget
              </span>
              <div style={styles.widgetInfo}>
                <div style={styles.widgetName}>
                  {selectedWidget.widgetDefId}
                </div>
                <div style={styles.widgetId}>
                  ID: {selectedWidget.id.slice(0, 16)}...
                </div>
              </div>
            </div>

            {/* Position */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>
                <SNIcon name="move" size="xs" />
                Position
              </span>
              <div style={styles.inputRow}>
                <span style={styles.inputLabel}>X</span>
                <input
                  type="number"
                  style={styles.input}
                  className="sn-input-animated"
                  value={localValues.position?.x ?? 0}
                  onChange={(e) => handleNumberChange('x', e.target.value)}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.inputLabel}>Y</span>
                <input
                  type="number"
                  style={styles.input}
                  className="sn-input-animated"
                  value={localValues.position?.y ?? 0}
                  onChange={(e) => handleNumberChange('y', e.target.value)}
                />
              </div>
            </div>

            {/* Size */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>
                <SNIcon name="resize" size="xs" />
                Size
              </span>
              <div style={styles.inputRow}>
                <span style={styles.inputLabel}>W</span>
                <input
                  type="number"
                  style={styles.input}
                  className="sn-input-animated"
                  value={localValues.width ?? 0}
                  min={50}
                  onChange={(e) => handleNumberChange('width', e.target.value)}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.inputLabel}>H</span>
                <input
                  type="number"
                  style={styles.input}
                  className="sn-input-animated"
                  value={localValues.height ?? 0}
                  min={50}
                  onChange={(e) => handleNumberChange('height', e.target.value)}
                />
              </div>
            </div>

            {/* Scale Mode */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>
                <SNIcon name="resize" size="xs" />
                Content Scaling
              </span>
              <div style={styles.scaleModeContainer}>
                {(['crop', 'scale', 'stretch', 'contain'] as WidgetScaleMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleScaleModeChange(mode)}
                    style={{
                      ...styles.scaleModeButton,
                      ...(localValues.scaleMode === mode || (!localValues.scaleMode && mode === 'contain')
                        ? styles.scaleModeButtonActive
                        : {}),
                    }}
                    title={
                      mode === 'crop' ? 'Crop: Show at native size, clip to frame' :
                      mode === 'scale' ? 'Scale: Fit proportionally within frame' :
                      mode === 'stretch' ? 'Stretch: Fill frame, may distort' :
                      'Contain: Fit inside frame, maintain aspect ratio'
                    }
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              <div style={styles.scaleModeHint}>
                {localValues.scaleMode === 'crop' || (!localValues.scaleMode && false)
                  ? 'Content at native size, clips to frame'
                  : localValues.scaleMode === 'scale'
                  ? 'Scales proportionally to fit frame'
                  : localValues.scaleMode === 'stretch'
                  ? 'Stretches to fill frame (may distort)'
                  : 'Fits inside frame, centered (letterbox)'}
              </div>
              {localValues.contentSize && (
                <div style={styles.contentSizeInfo}>
                  <span style={styles.contentSizeLabel}>
                    Content: {localValues.contentSize.width} × {localValues.contentSize.height}
                  </span>
                  <button
                    onClick={handleResetContentSize}
                    style={styles.resetButton}
                    title="Recapture current size as native content size"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Transform */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>
                <SNIcon name="rotate" size="xs" />
                Transform
              </span>
              <div style={styles.inputRow}>
                <span style={{ ...styles.inputLabel, width: 50 }}>Rotate</span>
                <input
                  type="number"
                  style={styles.input}
                  className="sn-input-animated"
                  value={localValues.rotation ?? 0}
                  onChange={(e) => handleNumberChange('rotation', e.target.value)}
                />
                <span style={styles.inputUnit}>°</span>
              </div>
              <div style={styles.buttonRow}>
                <SNButton
                  variant={selectedWidget?.flipX ? 'primary' : 'glass'}
                  size="sm"
                  leftIcon="flipHorizontal"
                  onClick={() => {
                    if (primaryId) {
                      applyChange({ flipX: !selectedWidget?.flipX });
                    }
                  }}
                >
                  Flip H
                </SNButton>
                <SNButton
                  variant={selectedWidget?.flipY ? 'primary' : 'glass'}
                  size="sm"
                  leftIcon="flipVertical"
                  onClick={() => {
                    if (primaryId) {
                      applyChange({ flipY: !selectedWidget?.flipY });
                    }
                  }}
                >
                  Flip V
                </SNButton>
              </div>
            </div>

            {/* Appearance */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>
                <SNIcon name="palette" size="xs" />
                Appearance
              </span>
              <div style={styles.inputRow}>
                <span style={{ ...styles.inputLabel, width: 50 }}>Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  style={styles.slider}
                  value={selectedWidget?.opacity ?? 1}
                  onChange={(e) => {
                    if (primaryId) {
                      applyChange({ opacity: parseFloat(e.target.value) });
                    }
                  }}
                />
                <span style={styles.inputUnit}>{Math.round((selectedWidget?.opacity ?? 1) * 100)}%</span>
              </div>
              <div style={styles.toggleRow}>
                <SNIconButton
                  icon={selectedWidget?.visible !== false ? 'visible' : 'hidden'}
                  variant={selectedWidget?.visible !== false ? 'glass' : 'danger'}
                  size="sm"
                  tooltip={selectedWidget?.visible !== false ? 'Hide Widget' : 'Show Widget'}
                  onClick={() => {
                    if (primaryId) {
                      applyChange({ visible: !(selectedWidget?.visible !== false) });
                    }
                  }}
                />
                <SNIconButton
                  icon={selectedWidget?.locked ? 'lock' : 'unlock'}
                  variant={selectedWidget?.locked ? 'danger' : 'glass'}
                  size="sm"
                  tooltip={selectedWidget?.locked ? 'Unlock Widget' : 'Lock Widget'}
                  onClick={() => {
                    if (primaryId) {
                      applyChange({ locked: !selectedWidget?.locked });
                    }
                  }}
                />
                <span style={styles.toggleLabel}>
                  {selectedWidget?.visible !== false ? 'Visible' : 'Hidden'} • {selectedWidget?.locked ? 'Locked' : 'Unlocked'}
                </span>
              </div>
            </div>

            {/* Layer */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>
                <SNIcon name="layers" size="xs" />
                Layer
              </span>
              <div style={styles.inputRow}>
                <span style={{ ...styles.inputLabel, width: 50 }}>Z-Index</span>
                <input
                  type="number"
                  style={styles.input}
                  className="sn-input-animated"
                  value={localValues.zIndex ?? 0}
                  onChange={(e) => handleNumberChange('zIndex', e.target.value)}
                />
              </div>
              <div style={styles.buttonRow}>
                <SNButton
                  variant="glass"
                  size="sm"
                  leftIcon="chevronUp"
                  onClick={() => bringToFront(selectedWidget.id)}
                >
                  Front
                </SNButton>
                <SNButton
                  variant="glass"
                  size="sm"
                  leftIcon="chevronDown"
                  onClick={() => sendToBack(selectedWidget.id)}
                >
                  Back
                </SNButton>
              </div>
            </div>

            {/* State (read-only preview) */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>
                <SNIcon name="code" size="xs" />
                Widget State
              </span>
              <pre style={styles.statePreview}>
                {JSON.stringify(selectedWidget.state, null, 2) || '{}'}
              </pre>
            </div>
          </>
        ) : (
          // Multi-selection info
          <div style={styles.section}>
            <span style={styles.sectionLabel}>
              <SNIcon name="group" size="xs" />
              Multi-Selection
            </span>
            <div style={styles.multiSelectInfo}>
              <p style={styles.multiSelectCount}>
                {selectionCount} widgets selected
              </p>
              <p style={styles.multiSelectHint}>
                Use the toolbar to align, distribute, or modify multiple widgets at once.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <SNIcon name="info" size="xs" />
        <span>Tip: Use arrow keys to nudge selected widgets</span>
      </div>
    </div>
    </>
  );
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 280,
    height: '100vh',
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.9))',
    borderLeft: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
    boxShadow: 'var(--sn-shadow-lg, -2px 0 20px rgba(0, 0, 0, 0.3))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--sn-glass-bg, rgba(0, 0, 0, 0.2))',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    fontSize: 'var(--sn-text-md, 14px)',
    color: 'var(--sn-text-primary, #f0f4f8)',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
  },
  emptyState: {
    padding: 32,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    color: 'var(--sn-text-tertiary, #718096)',
    opacity: 0.5,
  },
  emptyText: {
    margin: 0,
    fontSize: 'var(--sn-text-sm, 13px)',
    color: 'var(--sn-text-secondary, #a0aec0)',
  },
  section: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--sn-border-secondary, rgba(255, 255, 255, 0.04))',
  },
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--sn-text-tertiary, #718096)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 10,
  },
  widgetInfo: {
    background: 'var(--sn-glass-bg-light, rgba(255, 255, 255, 0.05))',
    padding: 10,
    borderRadius: 'var(--sn-radius-md, 8px)',
  },
  widgetName: {
    fontSize: 'var(--sn-text-sm, 13px)',
    fontWeight: 500,
    color: 'var(--sn-text-primary, #f0f4f8)',
    marginBottom: 4,
  },
  widgetId: {
    fontSize: 'var(--sn-text-xs, 11px)',
    color: 'var(--sn-text-tertiary, #718096)',
    fontFamily: 'monospace',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    width: 20,
    fontSize: 'var(--sn-text-sm, 12px)',
    color: 'var(--sn-text-secondary, #a0aec0)',
    textAlign: 'right',
  },
  input: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.1))',
    borderRadius: 'var(--sn-radius-sm, 6px)',
    fontSize: 'var(--sn-text-sm, 12px)',
    background: 'var(--sn-bg-primary, rgba(0, 0, 0, 0.3))',
    color: 'var(--sn-text-primary, #f0f4f8)',
    outline: 'none',
    transition: 'border-color var(--sn-transition-fast, 100ms ease-out)',
    width: '100%',
  },
  inputUnit: {
    fontSize: 'var(--sn-text-sm, 12px)',
    color: 'var(--sn-text-tertiary, #718096)',
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
  slider: {
    flex: 1,
    height: 4,
    appearance: 'none' as const,
    background: 'var(--sn-border-primary, rgba(255, 255, 255, 0.1))',
    borderRadius: 2,
    cursor: 'pointer',
    outline: 'none',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: '8px 10px',
    background: 'var(--sn-glass-bg-light, rgba(255, 255, 255, 0.05))',
    borderRadius: 'var(--sn-radius-md, 8px)',
  },
  toggleLabel: {
    flex: 1,
    fontSize: 'var(--sn-text-xs, 11px)',
    color: 'var(--sn-text-tertiary, #718096)',
  },
  statePreview: {
    background: 'var(--sn-bg-primary, rgba(0, 0, 0, 0.3))',
    padding: 10,
    borderRadius: 'var(--sn-radius-md, 8px)',
    fontSize: 10,
    overflow: 'auto',
    maxHeight: 150,
    margin: 0,
    color: 'var(--sn-text-secondary, #a0aec0)',
    fontFamily: 'monospace',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
  },
  scaleModeContainer: {
    display: 'flex',
    gap: 4,
    marginBottom: 8,
  },
  scaleModeButton: {
    flex: 1,
    padding: '6px 4px',
    border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.1))',
    borderRadius: 'var(--sn-radius-sm, 4px)',
    background: 'var(--sn-bg-primary, rgba(0, 0, 0, 0.3))',
    color: 'var(--sn-text-secondary, #a0aec0)',
    fontSize: 10,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--sn-transition-fast, 100ms ease-out)',
  },
  scaleModeButtonActive: {
    background: 'var(--sn-accent-primary, #8b5cf6)',
    borderColor: 'var(--sn-accent-primary, #8b5cf6)',
    color: '#fff',
  },
  scaleModeHint: {
    fontSize: 10,
    color: 'var(--sn-text-tertiary, #718096)',
    marginBottom: 8,
  },
  contentSizeInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    background: 'var(--sn-glass-bg-light, rgba(255, 255, 255, 0.05))',
    borderRadius: 'var(--sn-radius-sm, 4px)',
  },
  contentSizeLabel: {
    fontSize: 10,
    color: 'var(--sn-text-tertiary, #718096)',
    fontFamily: 'monospace',
  },
  resetButton: {
    padding: '2px 8px',
    border: 'none',
    borderRadius: 'var(--sn-radius-sm, 4px)',
    background: 'var(--sn-border-primary, rgba(255, 255, 255, 0.1))',
    color: 'var(--sn-text-secondary, #a0aec0)',
    fontSize: 9,
    cursor: 'pointer',
    transition: 'all var(--sn-transition-fast, 100ms ease-out)',
  },
  multiSelectInfo: {
    padding: 10,
  },
  multiSelectCount: {
    fontSize: 'var(--sn-text-sm, 12px)',
    color: 'var(--sn-text-primary, #f0f4f8)',
    margin: '0 0 8px 0',
  },
  multiSelectHint: {
    fontSize: 'var(--sn-text-xs, 11px)',
    color: 'var(--sn-text-tertiary, #718096)',
    margin: 0,
    lineHeight: 1.5,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
    background: 'var(--sn-glass-bg, rgba(0, 0, 0, 0.2))',
    fontSize: 'var(--sn-text-xs, 11px)',
    color: 'var(--sn-text-tertiary, #718096)',
  },
};

export default PropertiesPanel;
