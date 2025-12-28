/**
 * useCanvasKeyboardShortcuts
 * Comprehensive keyboard shortcuts for canvas editing (Adobe/Figma/Canva style)
 * Handles mode switching, zoom, selection, clipboard, alignment, and more
 */

import { useEffect, useRef } from 'react';
import type { WidgetInstance } from '../../../types/domain';
import type { CanvasMode } from '../../../types/runtime';
import type { EventBus } from '../../../runtime/EventBus';

interface UseCanvasKeyboardShortcutsOptions {
  mode: CanvasMode;
  selection: {
    selectedIds: Set<string>;
    selectionBox: { startX: number; startY: number; endX: number; endY: number } | null;
  };
  widgets: WidgetInstance[];
  effectiveGridSize: number;
  isCanvasLocked: boolean;
  eventBus: EventBus;

  // Mode/navigation
  onModeChange?: (mode: CanvasMode) => void;
  showShortcutsHelp: boolean;
  setShowShortcutsHelp: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowLayerPanel: (show: boolean | ((prev: boolean) => boolean)) => void;

  // Zoom controls
  settings: {
    zoom: {
      enabled: boolean;
    };
  };
  viewport: {
    zoom: number;
  };
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (level: number) => void;
  resetViewport: () => void;
  fitToViewport: () => void;

  // Selection actions
  select: (id: string, addToSelection: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  deselectAll: () => void;

  // Widget operations
  moveSelectedWidgets: (dx: number, dy: number) => void;
  handleDrag: (instanceId: string, x: number, y: number) => void;
  duplicateSelectedWidgets: () => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  alignSelectedWidgets: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  storeUpdateWidget: (id: string, update: Partial<WidgetInstance>) => void;
  addWidget: (widget: WidgetInstance) => void;
  getSelectedWidgets: () => WidgetInstance[];

  // Group/layer operations
  groupSelectedWidgets: () => void;
  ungroupSelectedWidgets: () => void;
  lockSelectedWidgets: () => void;
  unlockSelectedWidgets: () => void;
  hideSelectedWidgets: () => void;
  toggleCanvasLock: () => void;

  // Grid
  grid: {
    snapToGrid: boolean;
  };
  setGrid: (grid: { snapToGrid: boolean }) => void;

  // History
  undo: () => void;
  redo: () => void;
}

export function useCanvasKeyboardShortcuts(options: UseCanvasKeyboardShortcutsOptions) {
  const {
    mode,
    selection,
    widgets,
    effectiveGridSize,
    isCanvasLocked,
    eventBus,
    onModeChange,
    showShortcutsHelp,
    setShowShortcutsHelp,
    setShowLayerPanel,
    settings,
    viewport,
    zoomIn,
    zoomOut,
    zoomTo,
    resetViewport,
    fitToViewport,
    select,
    selectMultiple,
    deselectAll,
    moveSelectedWidgets,
    handleDrag,
    duplicateSelectedWidgets,
    bringToFront,
    sendToBack,
    alignSelectedWidgets,
    storeUpdateWidget,
    addWidget,
    getSelectedWidgets,
    groupSelectedWidgets,
    ungroupSelectedWidgets,
    lockSelectedWidgets,
    unlockSelectedWidgets,
    hideSelectedWidgets,
    toggleCanvasLock,
    grid,
    setGrid,
    undo,
    redo,
  } = options;

  // Clipboard state for copy/paste
  const clipboardRef = useRef<WidgetInstance[] | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const hasSelection = selection.selectedIds.size > 0;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // ============================================
      // HELP OVERLAY (works everywhere)
      // ============================================
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        if (!isTyping) {
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
          return;
        }
      }

      // Close help with Escape
      if (e.key === 'Escape' && showShortcutsHelp) {
        setShowShortcutsHelp(false);
        return;
      }

      // Skip other shortcuts when typing
      if (isTyping) return;

      // ============================================
      // MODE SWITCHING (V, E, C keys)
      // ============================================
      if (!ctrlOrMeta && !e.altKey && !e.shiftKey) {
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          onModeChange?.('view');
          return;
        }
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          onModeChange?.('edit');
          return;
        }
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          onModeChange?.('connect');
          return;
        }
      }

      // ============================================
      // NAVIGATION & ZOOM (works in all modes)
      // ============================================
      if (settings.zoom.enabled) {
        // Zoom in: + or = (with or without shift)
        if (e.key === '+' || e.key === '=' || (e.key === '=' && e.shiftKey)) {
          if (!hasSelection || ctrlOrMeta) {
            e.preventDefault();
            zoomIn();
            return;
          }
        }

        // Zoom out: - or _
        if (e.key === '-' || e.key === '_') {
          if (!hasSelection || ctrlOrMeta) {
            e.preventDefault();
            zoomOut();
            return;
          }
        }

        // Ctrl+0: Reset zoom to 100%
        if (e.key === '0' && ctrlOrMeta) {
          e.preventDefault();
          zoomTo(1);
          return;
        }

        // Ctrl+1: Zoom to 100%
        if (e.key === '1' && ctrlOrMeta) {
          e.preventDefault();
          zoomTo(1);
          return;
        }

        // Ctrl+2: Zoom to 200%
        if (e.key === '2' && ctrlOrMeta) {
          e.preventDefault();
          zoomTo(2);
          return;
        }

        // Shift+1 (!) or Ctrl+3: Fit to screen
        if ((e.key === '!' || e.key === '1') && e.shiftKey) {
          e.preventDefault();
          fitToViewport();
          return;
        }
        if (e.key === '3' && ctrlOrMeta) {
          e.preventDefault();
          fitToViewport();
          return;
        }

        // Home: Reset pan to center
        if (e.key === 'Home') {
          e.preventDefault();
          resetViewport();
          return;
        }
      }

      // ============================================
      // UNDO/REDO (works in edit mode)
      // ============================================
      if (mode === 'edit' && ctrlOrMeta) {
        // Ctrl+Z: Undo
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }

        // Ctrl+Shift+Z or Ctrl+Y: Redo
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          redo();
          return;
        }
      }

      // ============================================
      // EDIT MODE SHORTCUTS
      // ============================================
      if (mode === 'edit') {
        // Escape: Deselect all
        if (e.key === 'Escape') {
          deselectAll();
          return;
        }

        // Ctrl+A: Select all
        if (ctrlOrMeta && e.key === 'a') {
          e.preventDefault();
          selectMultiple(widgets.map(w => w.id));
          return;
        }

        // Tab / Shift+Tab: Cycle through widgets
        if (e.key === 'Tab') {
          e.preventDefault();
          const widgetIds = widgets.map(w => w.id);
          if (widgetIds.length === 0) return;

          const currentId = selection.selectedIds.size === 1
            ? Array.from(selection.selectedIds)[0]
            : null;
          const currentIndex = currentId ? widgetIds.indexOf(currentId) : -1;

          let nextIndex: number;
          if (e.shiftKey) {
            // Previous widget
            nextIndex = currentIndex <= 0 ? widgetIds.length - 1 : currentIndex - 1;
          } else {
            // Next widget
            nextIndex = currentIndex >= widgetIds.length - 1 ? 0 : currentIndex + 1;
          }
          select(widgetIds[nextIndex], false);
          return;
        }

        // Toggle grid snap: G (without modifiers)
        if ((e.key === 'g' || e.key === 'G') && !ctrlOrMeta && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          setGrid({ snapToGrid: !grid.snapToGrid });
          return;
        }

        // Toggle layer panel: L (without Shift)
        if ((e.key === 'l' || e.key === 'L') && !ctrlOrMeta && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          setShowLayerPanel(prev => !prev);
          return;
        }

        // Toggle canvas lock: Shift+L
        if ((e.key === 'l' || e.key === 'L') && e.shiftKey && !ctrlOrMeta && !e.altKey) {
          e.preventDefault();
          toggleCanvasLock();
          return;
        }

        // Ctrl+G: Group selected widgets
        if (ctrlOrMeta && (e.key === 'g' || e.key === 'G') && !e.shiftKey) {
          e.preventDefault();
          if (selection.selectedIds.size >= 2) {
            groupSelectedWidgets();
          }
          return;
        }

        // Ctrl+Shift+G: Ungroup selected widgets
        if (ctrlOrMeta && (e.key === 'g' || e.key === 'G') && e.shiftKey) {
          e.preventDefault();
          ungroupSelectedWidgets();
          return;
        }

        // Ctrl+L: Lock/unlock selected widgets
        if (ctrlOrMeta && (e.key === 'l' || e.key === 'L') && !e.shiftKey) {
          e.preventDefault();
          if (hasSelection) {
            // Check if all selected are locked
            const selectedWidgets = getSelectedWidgets();
            const allLocked = selectedWidgets.every(w => w.locked);
            if (allLocked) {
              unlockSelectedWidgets();
            } else {
              lockSelectedWidgets();
            }
          }
          return;
        }

        // Ctrl+H: Hide selected widgets
        if (ctrlOrMeta && (e.key === 'h' || e.key === 'H')) {
          e.preventDefault();
          if (hasSelection) {
            hideSelectedWidgets();
          }
          return;
        }

        // ============================================
        // WITH SELECTION
        // ============================================
        if (hasSelection) {
          // Skip modification shortcuts when canvas is locked (Copy is still allowed)
          const isModificationKey = e.key === 'Delete' || e.key === 'Backspace' ||
            (ctrlOrMeta && (e.key === 'd' || e.key === 'x')) ||
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '[', ']'].includes(e.key) ||
            (e.altKey && ['a', 'h', 'd', 'w', 'v', 's'].includes(e.key.toLowerCase()));

          if (isCanvasLocked && isModificationKey) {
            e.preventDefault();
            console.log('[useCanvasKeyboardShortcuts] Canvas is locked, modification blocked');
            return;
          }

          // Delete / Backspace: Delete selected
          if (e.key === 'Delete' || e.key === 'Backspace') {
            selection.selectedIds.forEach(id => {
              eventBus.emit({
                type: 'widget:remove-request',
                scope: 'canvas',
                payload: { widgetInstanceId: id }
              });
            });
            deselectAll();
            return;
          }

          // Ctrl+D: Duplicate
          if (ctrlOrMeta && e.key === 'd') {
            e.preventDefault();
            duplicateSelectedWidgets();
            return;
          }

          // Ctrl+C: Copy
          if (ctrlOrMeta && e.key === 'c') {
            e.preventDefault();
            clipboardRef.current = getSelectedWidgets();
            return;
          }

          // Ctrl+X: Cut
          if (ctrlOrMeta && e.key === 'x') {
            e.preventDefault();
            clipboardRef.current = getSelectedWidgets();
            // Delete the originals
            selection.selectedIds.forEach(id => {
              eventBus.emit({
                type: 'widget:remove-request',
                scope: 'canvas',
                payload: { widgetInstanceId: id }
              });
            });
            deselectAll();
            return;
          }

          // Arrow keys: Move selected
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const step = e.shiftKey ? effectiveGridSize * 5 : effectiveGridSize;
            let deltaX = 0;
            let deltaY = 0;

            switch (e.key) {
              case 'ArrowUp': deltaY = -step; break;
              case 'ArrowDown': deltaY = step; break;
              case 'ArrowLeft': deltaX = -step; break;
              case 'ArrowRight': deltaX = step; break;
            }

            moveSelectedWidgets(deltaX, deltaY);
            selection.selectedIds.forEach(id => {
              const widget = widgets.find(w => w.id === id);
              if (widget) {
                handleDrag(id, widget.position.x + deltaX, widget.position.y + deltaY);
              }
            });
            return;
          }

          // Z-Order shortcuts
          // ]: Bring forward (one step)
          if (e.key === ']' && !ctrlOrMeta) {
            e.preventDefault();
            const selectedId = Array.from(selection.selectedIds)[0];
            const widget = widgets.find(w => w.id === selectedId);
            if (widget) {
              storeUpdateWidget(selectedId, { zIndex: widget.zIndex + 1 });
            }
            return;
          }

          // [: Send backward (one step)
          if (e.key === '[' && !ctrlOrMeta) {
            e.preventDefault();
            const selectedId = Array.from(selection.selectedIds)[0];
            const widget = widgets.find(w => w.id === selectedId);
            if (widget) {
              storeUpdateWidget(selectedId, { zIndex: widget.zIndex - 1 });
            }
            return;
          }

          // Ctrl+]: Bring to front
          if (e.key === ']' && ctrlOrMeta) {
            e.preventDefault();
            selection.selectedIds.forEach(id => bringToFront(id));
            return;
          }

          // Ctrl+[: Send to back
          if (e.key === '[' && ctrlOrMeta) {
            e.preventDefault();
            selection.selectedIds.forEach(id => sendToBack(id));
            return;
          }

          // Alignment shortcuts (Alt + key)
          if (e.altKey && selection.selectedIds.size >= 2) {
            const key = e.key.toLowerCase();
            let alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | null = null;

            switch (key) {
              case 'a': alignment = 'left'; break;
              case 'h': alignment = 'center'; break;
              case 'd': alignment = 'right'; break;
              case 'w': alignment = 'top'; break;
              case 'v': alignment = 'middle'; break;
              case 's': alignment = 'bottom'; break;
            }

            if (alignment) {
              e.preventDefault();
              alignSelectedWidgets(alignment);
              return;
            }
          }
        }

        // Ctrl+V: Paste (works even without selection)
        if (ctrlOrMeta && e.key === 'v' && clipboardRef.current) {
          e.preventDefault();
          // Check canvas lock before pasting
          if (isCanvasLocked) {
            console.log('[useCanvasKeyboardShortcuts] Canvas is locked, paste blocked');
            return;
          }
          const newIds: string[] = [];

          clipboardRef.current.forEach(widget => {
            const newWidget: WidgetInstance = {
              ...widget,
              id: `${widget.id}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
              position: {
                x: widget.position.x + 20,
                y: widget.position.y + 20,
              },
            };
            addWidget(newWidget);
            newIds.push(newWidget.id);
          });

          // Select pasted widgets
          selectMultiple(newIds);

          // Update clipboard positions for next paste
          clipboardRef.current = clipboardRef.current.map(w => ({
            ...w,
            position: { x: w.position.x + 20, y: w.position.y + 20 },
          }));
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode, selection.selectedIds, widgets, effectiveGridSize, handleDrag, eventBus,
    deselectAll, selectMultiple, select, moveSelectedWidgets, settings.zoom, zoomTo, zoomIn, zoomOut,
    viewport.zoom, resetViewport, fitToViewport, showShortcutsHelp, onModeChange,
    duplicateSelectedWidgets, bringToFront, sendToBack, alignSelectedWidgets, undo, redo,
    grid.snapToGrid, setGrid, addWidget, getSelectedWidgets, storeUpdateWidget,
    groupSelectedWidgets, ungroupSelectedWidgets, lockSelectedWidgets, unlockSelectedWidgets,
    hideSelectedWidgets, setShowShortcutsHelp, setShowLayerPanel, toggleCanvasLock, isCanvasLocked,
  ]);

  return {
    clipboardRef,
  };
}

export default useCanvasKeyboardShortcuts;
