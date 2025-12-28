/**
 * StickerNest v2 - FloatingPanelOverlay Component
 * Canvas overlay that renders all floating panels for a given canvas
 * Manages z-index stacking and global panel interactions
 */

import React, { useCallback, useMemo } from 'react';
import { FloatingPanelContainer } from './FloatingPanelContainer';
import { usePanelsStore, usePanelsByCanvas } from '../../state/usePanelsStore';
import { useCanvasStore } from '../../state/useCanvasStore';
import type { PanelId, FloatingPanel, CreatePanelOptions } from '../../types/panels';

// ============================================
// Types
// ============================================

interface FloatingPanelOverlayProps {
  canvasId: string;
  canvasBounds?: { width: number; height: number };
  onPanelClose?: (panelId: PanelId) => void;
}

// ============================================
// Styles
// ============================================

const styles = {
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as const,
    overflow: 'visible', // Allow panels to overflow
    zIndex: 9000, // High z-index to be above widgets (widgets use 0-100 range)
  } as React.CSSProperties,
  panelWrapper: {
    pointerEvents: 'auto' as const,
  } as React.CSSProperties,
};

// ============================================
// Component
// ============================================

export const FloatingPanelOverlay: React.FC<FloatingPanelOverlayProps> = ({
  canvasId,
  canvasBounds,
  onPanelClose,
}) => {
  // Get panels for this canvas
  const panels = usePanelsByCanvas(canvasId);

  // Store actions
  const deletePanel = usePanelsStore((s) => s.deletePanel);
  const focusPanel = usePanelsStore((s) => s.focusPanel);
  const setDropTargetPanel = usePanelsStore((s) => s.setDropTargetPanel);

  // Sort panels by z-index for rendering order
  const sortedPanels = useMemo(() => {
    return [...panels].sort((a, b) => a.zIndex - b.zIndex);
  }, [panels]);

  // Handle panel close
  const handlePanelClose = useCallback((panelId: PanelId) => {
    if (onPanelClose) {
      onPanelClose(panelId);
    } else {
      deletePanel(panelId);
    }
  }, [onPanelClose, deletePanel]);

  // Handle click on overlay background (deselect all panels)
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // Only if clicking directly on overlay, not on a panel
    if (e.target === e.currentTarget) {
      setDropTargetPanel(null, null);
    }
  }, [setDropTargetPanel]);

  // Clear drop target when drag leaves overlay
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the overlay entirely
    if (e.relatedTarget === null || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDropTargetPanel(null, null);
    }
  }, [setDropTargetPanel]);

  // Always render overlay (for drop target), but panels only when they exist
  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      onDragLeave={handleDragLeave}
      data-panel-overlay
    >
      {sortedPanels.map((panel) => (
        <div key={panel.id} style={styles.panelWrapper}>
          <FloatingPanelContainer
            panel={panel}
            canvasBounds={canvasBounds}
            onClose={handlePanelClose}
          />
        </div>
      ))}
    </div>
  );
};

// ============================================
// Panel Creation Helper Hook
// ============================================

/**
 * Hook for creating and managing panels on a canvas
 */
export function usePanelActions(canvasId: string) {
  const createPanel = usePanelsStore((s) => s.createPanel);
  const deletePanel = usePanelsStore((s) => s.deletePanel);
  const savePanelPreset = usePanelsStore((s) => s.savePanelPreset);
  const loadPanelPreset = usePanelsStore((s) => s.loadPanelPreset);
  const getPanelPresets = usePanelsStore((s) => s.getPanelPresets);
  const panels = usePanelsByCanvas(canvasId);

  const viewport = useCanvasStore((s) => s.viewport);

  const create = useCallback((options?: Partial<Omit<CreatePanelOptions, 'canvasId'>>) => {
    // Calculate a cascade position if there are existing panels
    let position = options?.position;
    if (!position && panels.length > 0) {
      const lastPanel = panels[panels.length - 1];
      position = {
        x: Math.min(lastPanel.position.x + 30, (viewport.width || 800) - 350),
        y: Math.min(lastPanel.position.y + 30, (viewport.height || 600) - 450),
      };
    }

    return createPanel({
      canvasId,
      title: options?.title || `Panel ${panels.length + 1}`,
      position: position || { x: 100, y: 100 },
      ...options,
    });
  }, [canvasId, createPanel, panels, viewport]);

  const savePreset = useCallback((panelId: PanelId, name: string, description?: string) => {
    return savePanelPreset(panelId, name, description);
  }, [savePanelPreset]);

  const loadPreset = useCallback((presetId: string, bounds?: { width: number; height: number }) => {
    const canvasBounds = bounds || { width: viewport.width || 800, height: viewport.height || 600 };
    return loadPanelPreset(presetId, canvasId, canvasBounds);
  }, [canvasId, loadPanelPreset, viewport]);

  return {
    panels,
    create,
    delete: deletePanel,
    savePreset,
    loadPreset,
    getPresets: getPanelPresets,
  };
}

export default FloatingPanelOverlay;
