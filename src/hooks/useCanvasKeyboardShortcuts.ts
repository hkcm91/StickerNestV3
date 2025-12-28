/**
 * StickerNest v3 - Canvas Keyboard Shortcuts Hook
 * Provides keyboard shortcuts for canvas operations including undo/redo,
 * z-index manipulation, selection, and canvas controls
 */

import { useEffect, useCallback, useRef } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';
import { useCanvasExtendedStore } from '../state/useCanvasExtendedStore';
import { useStickerStore } from '../state/useStickerStore';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /** Key to press (e.g., 'z', 'Delete', 'ArrowUp') */
  key: string;
  /** Whether Ctrl/Cmd is required */
  ctrl?: boolean;
  /** Whether Shift is required */
  shift?: boolean;
  /** Whether Alt is required */
  alt?: boolean;
  /** Description for UI display */
  description: string;
  /** Category for grouping in help UI */
  category: 'edit' | 'selection' | 'view' | 'canvas' | 'z-index';
  /** Action to perform */
  action: () => void;
}

/**
 * Options for the keyboard shortcuts hook
 */
export interface UseCanvasKeyboardShortcutsOptions {
  /** Whether keyboard shortcuts are enabled */
  enabled?: boolean;
  /** Element to attach listeners to (default: document) */
  targetRef?: React.RefObject<HTMLElement>;
  /** Callback when a shortcut is triggered */
  onShortcutTriggered?: (shortcut: KeyboardShortcut) => void;
}

/**
 * Check if the event target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}

/**
 * Hook that provides keyboard shortcuts for canvas operations
 */
export function useCanvasKeyboardShortcuts(
  options: UseCanvasKeyboardShortcutsOptions = {}
): {
  shortcuts: KeyboardShortcut[];
  getShortcutsByCategory: (category: KeyboardShortcut['category']) => KeyboardShortcut[];
} {
  const { enabled = true, targetRef, onShortcutTriggered } = options;

  // Canvas store actions - use command-based undo/redo for proper command history
  const undo = useCanvasStore(s => s.undoCommand);
  const redo = useCanvasStore(s => s.redoCommand);
  const canUndo = useCanvasStore(s => s.canUndoCommand);
  const canRedo = useCanvasStore(s => s.canRedoCommand);
  const selectAll = useCanvasStore(s => s.selectAll);
  const deselectAll = useCanvasStore(s => s.deselectAll);
  const deleteSelectedWidgets = useCanvasStore(s => s.deleteSelectedWidgets);
  const duplicateSelectedWidgets = useCanvasStore(s => s.duplicateSelectedWidgets);
  const bringToFront = useCanvasStore(s => s.bringToFront);
  const sendToBack = useCanvasStore(s => s.sendToBack);
  const bringForward = useCanvasStore(s => s.bringForward);
  const sendBackward = useCanvasStore(s => s.sendBackward);
  const groupSelectedWidgets = useCanvasStore(s => s.groupSelectedWidgets);
  const ungroupSelectedWidgets = useCanvasStore(s => s.ungroupSelectedWidgets);
  const toggleGrid = useCanvasStore(s => s.toggleGrid);
  const toggleSnapToGrid = useCanvasStore(s => s.toggleSnapToGrid);
  const lockSelectedWidgets = useCanvasStore(s => s.lockSelectedWidgets);
  const unlockSelectedWidgets = useCanvasStore(s => s.unlockSelectedWidgets);
  const setMode = useCanvasStore(s => s.setMode);
  const mode = useCanvasStore(s => s.mode);
  const moveSelectedWidgets = useCanvasStore(s => s.moveSelectedWidgets);
  const saveSnapshot = useCanvasStore(s => s.saveSnapshot);

  // Extended store actions for v3
  const toggleCanvasLock = useCanvasExtendedStore(s => s.toggleCanvasLock);
  const isCanvasLocked = useCanvasExtendedStore(s => s.isCanvasLocked);
  const setCanvasScale = useCanvasExtendedStore(s => s.setCanvasScale);
  const getCanvasScale = useCanvasExtendedStore(s => s.getCanvasScale);
  const resetCanvasScale = useCanvasExtendedStore(s => s.resetCanvasScale);
  const zoomToFit = useCanvasExtendedStore(s => s.zoomToFit);

  // Sticker store actions
  const removeSticker = useStickerStore(s => s.removeSticker);
  const selectSticker = useStickerStore(s => s.selectSticker);

  // Selection state
  const getSelection = useCallback(() => {
    return useCanvasStore.getState().selection;
  }, []);

  // Get selected sticker
  const getSelectedStickerId = useCallback(() => {
    return useStickerStore.getState().selectedStickerId;
  }, []);

  // Build shortcuts list
  const shortcuts = useRef<KeyboardShortcut[]>([]);

  // Update shortcuts whenever dependencies change
  useEffect(() => {
    shortcuts.current = [
      // Edit category
      {
        key: 'z',
        ctrl: true,
        description: 'Undo',
        category: 'edit',
        action: () => {
          if (canUndo()) undo();
        },
      },
      {
        key: 'z',
        ctrl: true,
        shift: true,
        description: 'Redo',
        category: 'edit',
        action: () => {
          if (canRedo()) redo();
        },
      },
      {
        key: 'y',
        ctrl: true,
        description: 'Redo (Alt)',
        category: 'edit',
        action: () => {
          if (canRedo()) redo();
        },
      },
      {
        key: 'd',
        ctrl: true,
        description: 'Duplicate selection',
        category: 'edit',
        action: duplicateSelectedWidgets,
      },
      {
        key: 'Delete',
        description: 'Delete selection',
        category: 'edit',
        action: () => {
          // Delete selected sticker if any
          const selectedStickerId = getSelectedStickerId();
          if (selectedStickerId) {
            removeSticker(selectedStickerId);
            selectSticker(null);
          }
          // Also delete selected widgets
          deleteSelectedWidgets();
        },
      },
      {
        key: 'Backspace',
        description: 'Delete selection (Alt)',
        category: 'edit',
        action: () => {
          // Delete selected sticker if any
          const selectedStickerId = getSelectedStickerId();
          if (selectedStickerId) {
            removeSticker(selectedStickerId);
            selectSticker(null);
          }
          // Also delete selected widgets
          deleteSelectedWidgets();
        },
      },

      // Selection category
      {
        key: 'a',
        ctrl: true,
        description: 'Select all',
        category: 'selection',
        action: selectAll,
      },
      {
        key: 'Escape',
        description: 'Deselect all',
        category: 'selection',
        action: deselectAll,
      },
      {
        key: 'g',
        ctrl: true,
        description: 'Group selection',
        category: 'selection',
        action: () => {
          const selection = getSelection();
          if (selection.selectedIds.size >= 2) {
            groupSelectedWidgets();
          }
        },
      },
      {
        key: 'g',
        ctrl: true,
        shift: true,
        description: 'Ungroup selection',
        category: 'selection',
        action: ungroupSelectedWidgets,
      },
      {
        key: 'l',
        ctrl: true,
        description: 'Lock selection',
        category: 'selection',
        action: () => {
          if (!isCanvasLocked()) lockSelectedWidgets();
        },
      },
      {
        key: 'l',
        ctrl: true,
        shift: true,
        description: 'Unlock selection',
        category: 'selection',
        action: unlockSelectedWidgets,
      },

      // Z-index category
      {
        key: ']',
        ctrl: true,
        description: 'Bring to front',
        category: 'z-index',
        action: () => {
          const selection = getSelection();
          if (selection.primaryId && !isCanvasLocked()) {
            bringToFront(selection.primaryId);
          }
        },
      },
      {
        key: '[',
        ctrl: true,
        description: 'Send to back',
        category: 'z-index',
        action: () => {
          const selection = getSelection();
          if (selection.primaryId && !isCanvasLocked()) {
            sendToBack(selection.primaryId);
          }
        },
      },
      {
        key: ']',
        ctrl: true,
        shift: true,
        description: 'Bring forward',
        category: 'z-index',
        action: () => {
          const selection = getSelection();
          if (selection.primaryId && !isCanvasLocked()) {
            bringForward(selection.primaryId);
          }
        },
      },
      {
        key: '[',
        ctrl: true,
        shift: true,
        description: 'Send backward',
        category: 'z-index',
        action: () => {
          const selection = getSelection();
          if (selection.primaryId && !isCanvasLocked()) {
            sendBackward(selection.primaryId);
          }
        },
      },

      // View category
      {
        key: '\'',
        ctrl: true,
        description: 'Toggle grid',
        category: 'view',
        action: toggleGrid,
      },
      {
        key: ';',
        ctrl: true,
        description: 'Toggle snap to grid',
        category: 'view',
        action: toggleSnapToGrid,
      },
      {
        key: '0',
        ctrl: true,
        description: 'Reset zoom to 100%',
        category: 'view',
        action: resetCanvasScale,
      },
      {
        key: '1',
        ctrl: true,
        description: 'Zoom to fit',
        category: 'view',
        action: zoomToFit,
      },
      {
        key: '=',
        ctrl: true,
        description: 'Zoom in',
        category: 'view',
        action: () => {
          const currentScale = getCanvasScale();
          setCanvasScale(currentScale + 0.1);
        },
      },
      {
        key: '-',
        ctrl: true,
        description: 'Zoom out',
        category: 'view',
        action: () => {
          const currentScale = getCanvasScale();
          setCanvasScale(currentScale - 0.1);
        },
      },

      // Canvas category
      {
        key: 'e',
        description: 'Toggle edit mode',
        category: 'canvas',
        action: () => {
          setMode(mode === 'edit' ? 'view' : 'edit');
        },
      },
      {
        key: 'l',
        shift: true,
        description: 'Toggle canvas lock',
        category: 'canvas',
        action: toggleCanvasLock,
      },

      // Arrow key nudge - edit category
      {
        key: 'ArrowUp',
        description: 'Nudge up (1px)',
        category: 'edit',
        action: () => {
          if (!isCanvasLocked() && getSelection().selectedIds.size > 0) {
            moveSelectedWidgets(0, -1);
            saveSnapshot();
          }
        },
      },
      {
        key: 'ArrowDown',
        description: 'Nudge down (1px)',
        category: 'edit',
        action: () => {
          if (!isCanvasLocked() && getSelection().selectedIds.size > 0) {
            moveSelectedWidgets(0, 1);
            saveSnapshot();
          }
        },
      },
      {
        key: 'ArrowLeft',
        description: 'Nudge left (1px)',
        category: 'edit',
        action: () => {
          if (!isCanvasLocked() && getSelection().selectedIds.size > 0) {
            moveSelectedWidgets(-1, 0);
            saveSnapshot();
          }
        },
      },
      {
        key: 'ArrowRight',
        description: 'Nudge right (1px)',
        category: 'edit',
        action: () => {
          if (!isCanvasLocked() && getSelection().selectedIds.size > 0) {
            moveSelectedWidgets(1, 0);
            saveSnapshot();
          }
        },
      },
      {
        key: 'ArrowUp',
        shift: true,
        description: 'Nudge up (10px)',
        category: 'edit',
        action: () => {
          if (!isCanvasLocked() && getSelection().selectedIds.size > 0) {
            moveSelectedWidgets(0, -10);
            saveSnapshot();
          }
        },
      },
      {
        key: 'ArrowDown',
        shift: true,
        description: 'Nudge down (10px)',
        category: 'edit',
        action: () => {
          if (!isCanvasLocked() && getSelection().selectedIds.size > 0) {
            moveSelectedWidgets(0, 10);
            saveSnapshot();
          }
        },
      },
      {
        key: 'ArrowLeft',
        shift: true,
        description: 'Nudge left (10px)',
        category: 'edit',
        action: () => {
          if (!isCanvasLocked() && getSelection().selectedIds.size > 0) {
            moveSelectedWidgets(-10, 0);
            saveSnapshot();
          }
        },
      },
      {
        key: 'ArrowRight',
        shift: true,
        description: 'Nudge right (10px)',
        category: 'edit',
        action: () => {
          if (!isCanvasLocked() && getSelection().selectedIds.size > 0) {
            moveSelectedWidgets(10, 0);
            saveSnapshot();
          }
        },
      },
    ];
  }, [
    undo,
    redo,
    canUndo,
    canRedo,
    selectAll,
    deselectAll,
    deleteSelectedWidgets,
    duplicateSelectedWidgets,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    groupSelectedWidgets,
    ungroupSelectedWidgets,
    toggleGrid,
    toggleSnapToGrid,
    lockSelectedWidgets,
    unlockSelectedWidgets,
    setMode,
    mode,
    toggleCanvasLock,
    isCanvasLocked,
    setCanvasScale,
    getCanvasScale,
    resetCanvasScale,
    zoomToFit,
    getSelection,
    moveSelectedWidgets,
    saveSnapshot,
    removeSticker,
    selectSticker,
    getSelectedStickerId,
  ]);

  // Handle keydown events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if shortcuts are disabled or target is input
      if (!enabled || isInputElement(event.target)) return;

      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
      const ctrl = ctrlKey || metaKey; // Handle both Ctrl and Cmd on Mac

      // Find matching shortcut
      const matchingShortcut = shortcuts.current.find((shortcut) => {
        const keyMatch = shortcut.key.toLowerCase() === key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === ctrl;
        const shiftMatch = !!shortcut.shift === shiftKey;
        const altMatch = !!shortcut.alt === altKey;
        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
        onShortcutTriggered?.(matchingShortcut);
      }
    },
    [enabled, onShortcutTriggered]
  );

  // Attach event listeners
  useEffect(() => {
    const target = targetRef?.current ?? document;
    target.addEventListener('keydown', handleKeyDown as EventListener);
    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [handleKeyDown, targetRef]);

  // Helper to get shortcuts by category
  const getShortcutsByCategory = useCallback(
    (category: KeyboardShortcut['category']) => {
      return shortcuts.current.filter((s) => s.category === category);
    },
    []
  );

  return {
    shortcuts: shortcuts.current,
    getShortcutsByCategory,
  };
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  if (shortcut.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format special keys
  let keyDisplay = shortcut.key;
  switch (shortcut.key.toLowerCase()) {
    case 'delete':
      keyDisplay = isMac ? '⌫' : 'Del';
      break;
    case 'backspace':
      keyDisplay = isMac ? '⌫' : 'Backspace';
      break;
    case 'escape':
      keyDisplay = 'Esc';
      break;
    case 'arrowup':
      keyDisplay = '↑';
      break;
    case 'arrowdown':
      keyDisplay = '↓';
      break;
    case 'arrowleft':
      keyDisplay = '←';
      break;
    case 'arrowright':
      keyDisplay = '→';
      break;
    default:
      keyDisplay = shortcut.key.toUpperCase();
  }

  parts.push(keyDisplay);
  return parts.join(isMac ? '' : '+');
}

export default useCanvasKeyboardShortcuts;
