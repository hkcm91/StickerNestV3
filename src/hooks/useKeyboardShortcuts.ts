/**
 * StickerNest v2 - Keyboard Shortcuts Hook
 * Provides global keyboard shortcut handling
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  category?: string;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const formatShortcut = (shortcut: Pick<KeyboardShortcut, 'key' | 'ctrl' | 'alt' | 'shift' | 'meta'>): string => {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Win');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');

  // Format key nicely
  const keyDisplay = shortcut.key.length === 1
    ? shortcut.key.toUpperCase()
    : shortcut.key.replace('Arrow', '').replace('Escape', 'Esc');

  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
};

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, preventDefault = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape in inputs
      if (event.key !== 'Escape') return;
    }

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue;

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = (shortcut.ctrl ?? false) === (isMac ? event.metaKey : event.ctrlKey);
      const altMatch = (shortcut.alt ?? false) === event.altKey;
      const shiftMatch = (shortcut.shift ?? false) === event.shiftKey;
      const metaMatch = (shortcut.meta ?? false) === event.metaKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch && (!shortcut.meta || metaMatch)) {
        if (preventDefault) {
          event.preventDefault();
          event.stopPropagation();
        }
        shortcut.action();
        return;
      }
    }
  }, [enabled, preventDefault]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    formatShortcut,
    isMac,
  };
};

// Predefined common shortcuts
export const commonShortcuts = {
  save: { key: 's', ctrl: true, description: 'Save' },
  undo: { key: 'z', ctrl: true, description: 'Undo' },
  redo: { key: 'z', ctrl: true, shift: true, description: 'Redo' },
  copy: { key: 'c', ctrl: true, description: 'Copy' },
  paste: { key: 'v', ctrl: true, description: 'Paste' },
  cut: { key: 'x', ctrl: true, description: 'Cut' },
  search: { key: 'k', ctrl: true, description: 'Search' },
  escape: { key: 'Escape', description: 'Close / Cancel' },
  delete: { key: 'Delete', description: 'Delete' },
  backspace: { key: 'Backspace', description: 'Delete' },
};

export default useKeyboardShortcuts;
