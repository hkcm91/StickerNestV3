/**
 * Docker 2.0 Keyboard Shortcuts Hook
 * Provides keyboard navigation and shortcuts for the docker
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDocker2Store } from './useDocker2Store';

export interface Docker2KeyboardOptions {
  /** Docker ID to control */
  dockerId: string;
  /** Whether keyboard shortcuts are enabled */
  enabled?: boolean;
  /** Callback when escape is pressed */
  onEscape?: () => void;
  /** Callback when a widget is selected via number key */
  onWidgetSelect?: (widgetId: string, index: number) => void;
}

export interface Docker2KeyboardShortcuts {
  // Navigation
  'Escape': string;
  '1-9': string;
  'ArrowUp': string;
  'ArrowDown': string;
  'ArrowLeft': string;
  'ArrowRight': string;
  // Actions
  'e': string;
  't': string;
  'Delete': string;
  'Backspace': string;
  'm': string;
  'f': string;
  // Undo/Redo
  'Ctrl+z': string;
  'Ctrl+Shift+z': string;
  'Ctrl+y': string;
  // Layout
  'v': string;
  'h': string;
  'g': string;
  'Tab': string;
}

export const DOCKER2_SHORTCUTS: Docker2KeyboardShortcuts = {
  // Navigation
  'Escape': 'Exit edit mode / Deselect',
  '1-9': 'Select widget by position',
  'ArrowUp': 'Select previous widget',
  'ArrowDown': 'Select next widget',
  'ArrowLeft': 'Move widget up in order (edit mode)',
  'ArrowRight': 'Move widget down in order (edit mode)',
  // Actions
  'e': 'Toggle edit mode',
  't': 'Toggle theme (light/dark)',
  'Delete': 'Remove selected widget (edit mode)',
  'Backspace': 'Remove selected widget (edit mode)',
  'm': 'Minimize/restore selected widget',
  'f': 'Maximize/restore selected widget (fullscreen)',
  // Undo/Redo
  'Ctrl+z': 'Undo',
  'Ctrl+Shift+z': 'Redo',
  'Ctrl+y': 'Redo',
  // Layout
  'v': 'Switch to vertical layout',
  'h': 'Switch to horizontal layout',
  'g': 'Switch to grid layout',
  'Tab': 'Switch to tabbed layout',
};

export const useDocker2Keyboard = ({
  dockerId,
  enabled = true,
  onEscape,
  onWidgetSelect,
}: Docker2KeyboardOptions) => {
  const selectedWidgetIndex = useRef<number>(-1);

  // Store actions
  const {
    getDocker,
    updateDocker,
    setThemeMode,
    toggleEditMode,
    setLayout,
    reorderWidgets,
    minimizeWidget,
    maximizeWidget,
    removeWidget,
    undo,
    redo,
  } = useDocker2Store();

  // Get current docker state
  const getDockerState = useCallback(() => {
    return getDocker(dockerId);
  }, [dockerId, getDocker]);

  // Handle widget selection
  const selectWidget = useCallback((index: number) => {
    const docker = getDockerState();
    if (!docker || docker.widgets.length === 0) return;

    // Clamp index to valid range
    const clampedIndex = Math.max(0, Math.min(index, docker.widgets.length - 1));
    selectedWidgetIndex.current = clampedIndex;

    const widget = docker.widgets[clampedIndex];
    if (widget) {
      updateDocker(dockerId, { activeWidgetId: widget.widgetId });
      onWidgetSelect?.(widget.widgetId, clampedIndex);
    }
  }, [dockerId, getDockerState, updateDocker, onWidgetSelect]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const docker = getDockerState();
    if (!docker) return;

    // Check if we're in an input/textarea
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Only handle Escape in inputs
      if (e.key === 'Escape') {
        target.blur();
        e.preventDefault();
      }
      return;
    }

    const { key, ctrlKey, shiftKey, metaKey } = e;
    const isModifier = ctrlKey || metaKey;

    // ==================
    // Undo/Redo (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
    // ==================
    if (isModifier && key.toLowerCase() === 'z') {
      e.preventDefault();
      if (shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    if (isModifier && key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    // Skip other shortcuts if modifier is held
    if (isModifier) return;

    // ==================
    // Escape - Exit edit mode / Deselect
    // ==================
    if (key === 'Escape') {
      e.preventDefault();
      if (docker.editMode) {
        toggleEditMode(dockerId);
      }
      selectedWidgetIndex.current = -1;
      updateDocker(dockerId, { activeWidgetId: null });
      onEscape?.();
      return;
    }

    // ==================
    // Number keys 1-9 - Select widget by position
    // ==================
    if (/^[1-9]$/.test(key)) {
      e.preventDefault();
      const index = parseInt(key, 10) - 1;
      if (index < docker.widgets.length) {
        selectWidget(index);
      }
      return;
    }

    // ==================
    // Arrow keys - Navigation
    // ==================
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = selectedWidgetIndex.current;
      const newIndex = key === 'ArrowUp'
        ? Math.max(0, currentIndex - 1)
        : Math.min(docker.widgets.length - 1, currentIndex + 1);

      if (newIndex !== currentIndex && docker.widgets.length > 0) {
        selectWidget(newIndex);
      }
      return;
    }

    // Arrow left/right - Reorder widgets (edit mode only)
    if ((key === 'ArrowLeft' || key === 'ArrowRight') && docker.editMode) {
      e.preventDefault();
      const currentIndex = selectedWidgetIndex.current;
      if (currentIndex < 0 || currentIndex >= docker.widgets.length) return;

      const newIndex = key === 'ArrowLeft'
        ? Math.max(0, currentIndex - 1)
        : Math.min(docker.widgets.length - 1, currentIndex + 1);

      if (newIndex !== currentIndex) {
        reorderWidgets(dockerId, currentIndex, newIndex);
        selectedWidgetIndex.current = newIndex;
      }
      return;
    }

    // ==================
    // Edit mode toggle - 'e'
    // ==================
    if (key.toLowerCase() === 'e') {
      e.preventDefault();
      toggleEditMode(dockerId);
      return;
    }

    // ==================
    // Theme toggle - 't'
    // ==================
    if (key.toLowerCase() === 't') {
      e.preventDefault();
      setThemeMode(dockerId, docker.themeMode === 'dark' ? 'light' : 'dark');
      return;
    }

    // ==================
    // Layout shortcuts
    // ==================
    if (key.toLowerCase() === 'v') {
      e.preventDefault();
      setLayout(dockerId, { mode: 'vertical' });
      return;
    }

    if (key.toLowerCase() === 'h') {
      e.preventDefault();
      setLayout(dockerId, { mode: 'horizontal' });
      return;
    }

    if (key.toLowerCase() === 'g') {
      e.preventDefault();
      setLayout(dockerId, { mode: 'grid' });
      return;
    }

    if (key === 'Tab' && !shiftKey) {
      e.preventDefault();
      setLayout(dockerId, { mode: 'tabbed' });
      return;
    }

    // ==================
    // Widget actions (require selection)
    // ==================
    const currentIndex = selectedWidgetIndex.current;
    if (currentIndex < 0 || currentIndex >= docker.widgets.length) return;

    const selectedWidget = docker.widgets[currentIndex];
    if (!selectedWidget) return;

    // Delete/Backspace - Remove widget (edit mode only)
    if ((key === 'Delete' || key === 'Backspace') && docker.editMode) {
      e.preventDefault();
      removeWidget(dockerId, selectedWidget.widgetId);
      // Select next widget or previous
      if (docker.widgets.length > 1) {
        const newIndex = Math.min(currentIndex, docker.widgets.length - 2);
        selectWidget(newIndex);
      } else {
        selectedWidgetIndex.current = -1;
      }
      return;
    }

    // 'm' - Minimize/restore widget
    if (key.toLowerCase() === 'm') {
      e.preventDefault();
      minimizeWidget(dockerId, selectedWidget.widgetId);
      return;
    }

    // 'f' - Maximize/restore widget (fullscreen)
    if (key.toLowerCase() === 'f') {
      e.preventDefault();
      maximizeWidget(dockerId, selectedWidget.widgetId);
      return;
    }
  }, [
    enabled,
    dockerId,
    getDockerState,
    updateDocker,
    toggleEditMode,
    setThemeMode,
    setLayout,
    reorderWidgets,
    minimizeWidget,
    maximizeWidget,
    removeWidget,
    undo,
    redo,
    selectWidget,
    onEscape,
  ]);

  // Set up event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // Return current selection state and manual controls
  return {
    selectedWidgetIndex: selectedWidgetIndex.current,
    selectWidget,
    shortcuts: DOCKER2_SHORTCUTS,
  };
};

export default useDocker2Keyboard;
