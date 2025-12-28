/**
 * StickerNest v2 - Keyboard Shortcuts Store (Zustand)
 * Manages customizable keyboard shortcuts with persistence and conflict detection.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

// ==================
// Types
// ==================

/** Shortcut category for organization */
export type ShortcutCategory =
  | 'edit'
  | 'selection'
  | 'view'
  | 'canvas'
  | 'z-index'
  | 'layer'
  | 'group'
  | 'tool';

/** Platform key mapping */
export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

/** A single shortcut binding */
export interface ShortcutBinding {
  /** Primary key (e.g., 'z', 'Delete', 'ArrowUp') */
  key: string;
  /** Modifier keys required */
  modifiers: ModifierKey[];
}

/** Complete shortcut definition */
export interface ShortcutDefinition {
  /** Unique action identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description for help UI */
  description: string;
  /** Category for grouping */
  category: ShortcutCategory;
  /** Default key binding */
  defaultBinding: ShortcutBinding;
  /** Current key binding (may differ from default if customized) */
  binding: ShortcutBinding;
  /** Whether this shortcut is enabled */
  enabled: boolean;
  /** Whether this can be customized */
  customizable: boolean;
}

/** Shortcut execution context */
export interface ShortcutContext {
  /** Current canvas ID */
  canvasId?: string;
  /** Whether selection exists */
  hasSelection: boolean;
  /** Number of selected items */
  selectionCount: number;
  /** Whether canvas is in edit mode */
  isEditMode: boolean;
  /** Whether canvas is locked */
  isCanvasLocked: boolean;
}

// ==================
// Store State
// ==================

export interface KeyboardShortcutsState {
  /** All registered shortcuts */
  shortcuts: Map<string, ShortcutDefinition>;
  /** Whether shortcuts are globally enabled */
  globalEnabled: boolean;
  /** Conflicts detected between shortcuts */
  conflicts: Array<{ shortcut1: string; shortcut2: string; binding: string }>;
  /** Last triggered shortcut (for UI feedback) */
  lastTriggered: string | null;
}

// ==================
// Store Actions
// ==================

export interface KeyboardShortcutsActions {
  /** Register a new shortcut */
  register: (shortcut: Omit<ShortcutDefinition, 'binding'> & { binding?: ShortcutBinding }) => void;
  /** Unregister a shortcut */
  unregister: (id: string) => void;
  /** Update shortcut binding */
  setBinding: (id: string, binding: ShortcutBinding) => void;
  /** Reset shortcut to default binding */
  resetBinding: (id: string) => void;
  /** Reset all shortcuts to defaults */
  resetAllBindings: () => void;
  /** Enable/disable a shortcut */
  setEnabled: (id: string, enabled: boolean) => void;
  /** Enable/disable all shortcuts */
  setGlobalEnabled: (enabled: boolean) => void;
  /** Get shortcut by ID */
  getShortcut: (id: string) => ShortcutDefinition | undefined;
  /** Get shortcuts by category */
  getByCategory: (category: ShortcutCategory) => ShortcutDefinition[];
  /** Find shortcut by binding */
  findByBinding: (binding: ShortcutBinding) => ShortcutDefinition | undefined;
  /** Check for binding conflicts */
  detectConflicts: () => void;
  /** Format binding for display */
  formatBinding: (binding: ShortcutBinding) => string;
  /** Parse key event to binding */
  parseKeyEvent: (event: KeyboardEvent) => ShortcutBinding;
  /** Match key event to shortcut */
  matchKeyEvent: (event: KeyboardEvent) => ShortcutDefinition | null;
  /** Mark shortcut as triggered (for UI feedback) */
  setLastTriggered: (id: string | null) => void;
  /** Reset store */
  reset: () => void;
}

// ==================
// Default Shortcuts
// ==================

const DEFAULT_SHORTCUTS: Array<Omit<ShortcutDefinition, 'binding'>> = [
  // Edit
  { id: 'undo', name: 'Undo', description: 'Undo last action', category: 'edit', defaultBinding: { key: 'z', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'redo', name: 'Redo', description: 'Redo last undone action', category: 'edit', defaultBinding: { key: 'z', modifiers: ['ctrl', 'shift'] }, enabled: true, customizable: true },
  { id: 'redo-alt', name: 'Redo (Alt)', description: 'Redo last undone action', category: 'edit', defaultBinding: { key: 'y', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'delete', name: 'Delete', description: 'Delete selected items', category: 'edit', defaultBinding: { key: 'Delete', modifiers: [] }, enabled: true, customizable: true },
  { id: 'delete-alt', name: 'Delete (Alt)', description: 'Delete selected items', category: 'edit', defaultBinding: { key: 'Backspace', modifiers: [] }, enabled: true, customizable: true },
  { id: 'duplicate', name: 'Duplicate', description: 'Duplicate selected items', category: 'edit', defaultBinding: { key: 'd', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'copy', name: 'Copy', description: 'Copy selected items', category: 'edit', defaultBinding: { key: 'c', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'cut', name: 'Cut', description: 'Cut selected items', category: 'edit', defaultBinding: { key: 'x', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'paste', name: 'Paste', description: 'Paste items from clipboard', category: 'edit', defaultBinding: { key: 'v', modifiers: ['ctrl'] }, enabled: true, customizable: true },

  // Selection
  { id: 'select-all', name: 'Select All', description: 'Select all items', category: 'selection', defaultBinding: { key: 'a', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'deselect', name: 'Deselect', description: 'Deselect all items', category: 'selection', defaultBinding: { key: 'Escape', modifiers: [] }, enabled: true, customizable: true },

  // Grouping
  { id: 'group', name: 'Group', description: 'Group selected items', category: 'group', defaultBinding: { key: 'g', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'ungroup', name: 'Ungroup', description: 'Ungroup selected group', category: 'group', defaultBinding: { key: 'g', modifiers: ['ctrl', 'shift'] }, enabled: true, customizable: true },

  // Lock
  { id: 'lock', name: 'Lock', description: 'Lock selected items', category: 'selection', defaultBinding: { key: 'l', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'unlock', name: 'Unlock', description: 'Unlock selected items', category: 'selection', defaultBinding: { key: 'l', modifiers: ['ctrl', 'shift'] }, enabled: true, customizable: true },

  // Z-Index
  { id: 'bring-front', name: 'Bring to Front', description: 'Move to front', category: 'z-index', defaultBinding: { key: ']', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'send-back', name: 'Send to Back', description: 'Move to back', category: 'z-index', defaultBinding: { key: '[', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'bring-forward', name: 'Bring Forward', description: 'Move forward one layer', category: 'z-index', defaultBinding: { key: ']', modifiers: ['ctrl', 'shift'] }, enabled: true, customizable: true },
  { id: 'send-backward', name: 'Send Backward', description: 'Move backward one layer', category: 'z-index', defaultBinding: { key: '[', modifiers: ['ctrl', 'shift'] }, enabled: true, customizable: true },

  // Layer
  { id: 'new-layer', name: 'New Layer', description: 'Create new layer', category: 'layer', defaultBinding: { key: 'n', modifiers: ['ctrl', 'shift'] }, enabled: true, customizable: true },
  { id: 'delete-layer', name: 'Delete Layer', description: 'Delete active layer', category: 'layer', defaultBinding: { key: 'Delete', modifiers: ['ctrl', 'shift'] }, enabled: true, customizable: true },
  { id: 'layer-up', name: 'Move Layer Up', description: 'Move layer up in stack', category: 'layer', defaultBinding: { key: 'ArrowUp', modifiers: ['ctrl', 'alt'] }, enabled: true, customizable: true },
  { id: 'layer-down', name: 'Move Layer Down', description: 'Move layer down in stack', category: 'layer', defaultBinding: { key: 'ArrowDown', modifiers: ['ctrl', 'alt'] }, enabled: true, customizable: true },

  // View
  { id: 'toggle-grid', name: 'Toggle Grid', description: 'Show/hide grid', category: 'view', defaultBinding: { key: '\'', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'toggle-snap', name: 'Toggle Snap', description: 'Enable/disable snap to grid', category: 'view', defaultBinding: { key: ';', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'zoom-reset', name: 'Reset Zoom', description: 'Reset zoom to 100%', category: 'view', defaultBinding: { key: '0', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'zoom-fit', name: 'Zoom to Fit', description: 'Fit canvas in view', category: 'view', defaultBinding: { key: '1', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'zoom-in', name: 'Zoom In', description: 'Zoom in', category: 'view', defaultBinding: { key: '=', modifiers: ['ctrl'] }, enabled: true, customizable: true },
  { id: 'zoom-out', name: 'Zoom Out', description: 'Zoom out', category: 'view', defaultBinding: { key: '-', modifiers: ['ctrl'] }, enabled: true, customizable: true },

  // Canvas
  { id: 'toggle-mode', name: 'Toggle Mode', description: 'Switch between edit/view mode', category: 'canvas', defaultBinding: { key: 'e', modifiers: [] }, enabled: true, customizable: true },
  { id: 'toggle-canvas-lock', name: 'Lock Canvas', description: 'Lock/unlock canvas', category: 'canvas', defaultBinding: { key: 'l', modifiers: ['shift'] }, enabled: true, customizable: true },

  // Nudge
  { id: 'nudge-up', name: 'Nudge Up', description: 'Move selection up 1px', category: 'edit', defaultBinding: { key: 'ArrowUp', modifiers: [] }, enabled: true, customizable: true },
  { id: 'nudge-down', name: 'Nudge Down', description: 'Move selection down 1px', category: 'edit', defaultBinding: { key: 'ArrowDown', modifiers: [] }, enabled: true, customizable: true },
  { id: 'nudge-left', name: 'Nudge Left', description: 'Move selection left 1px', category: 'edit', defaultBinding: { key: 'ArrowLeft', modifiers: [] }, enabled: true, customizable: true },
  { id: 'nudge-right', name: 'Nudge Right', description: 'Move selection right 1px', category: 'edit', defaultBinding: { key: 'ArrowRight', modifiers: [] }, enabled: true, customizable: true },
  { id: 'nudge-up-10', name: 'Nudge Up 10px', description: 'Move selection up 10px', category: 'edit', defaultBinding: { key: 'ArrowUp', modifiers: ['shift'] }, enabled: true, customizable: true },
  { id: 'nudge-down-10', name: 'Nudge Down 10px', description: 'Move selection down 10px', category: 'edit', defaultBinding: { key: 'ArrowDown', modifiers: ['shift'] }, enabled: true, customizable: true },
  { id: 'nudge-left-10', name: 'Nudge Left 10px', description: 'Move selection left 10px', category: 'edit', defaultBinding: { key: 'ArrowLeft', modifiers: ['shift'] }, enabled: true, customizable: true },
  { id: 'nudge-right-10', name: 'Nudge Right 10px', description: 'Move selection right 10px', category: 'edit', defaultBinding: { key: 'ArrowRight', modifiers: ['shift'] }, enabled: true, customizable: true },
];

// ==================
// Initial State
// ==================

function createInitialShortcuts(): Map<string, ShortcutDefinition> {
  const map = new Map<string, ShortcutDefinition>();
  DEFAULT_SHORTCUTS.forEach(s => {
    map.set(s.id, { ...s, binding: { ...s.defaultBinding } });
  });
  return map;
}

const initialState: KeyboardShortcutsState = {
  shortcuts: createInitialShortcuts(),
  globalEnabled: true,
  conflicts: [],
  lastTriggered: null,
};

// ==================
// Helper Functions
// ==================

function bindingToString(binding: ShortcutBinding): string {
  const parts = [...binding.modifiers.sort(), binding.key.toLowerCase()];
  return parts.join('+');
}

function bindingsEqual(a: ShortcutBinding, b: ShortcutBinding): boolean {
  return bindingToString(a) === bindingToString(b);
}

// ==================
// Store Creation
// ==================

export const useKeyboardShortcutsStore = create<KeyboardShortcutsState & KeyboardShortcutsActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        register: (shortcut) => {
          set((state) => {
            const shortcuts = new Map(state.shortcuts);
            shortcuts.set(shortcut.id, {
              ...shortcut,
              binding: shortcut.binding || { ...shortcut.defaultBinding },
            });
            return { shortcuts };
          }, false, 'register');
          get().detectConflicts();
        },

        unregister: (id) => {
          set((state) => {
            const shortcuts = new Map(state.shortcuts);
            shortcuts.delete(id);
            return { shortcuts };
          }, false, 'unregister');
        },

        setBinding: (id, binding) => {
          set((state) => {
            const shortcuts = new Map(state.shortcuts);
            const shortcut = shortcuts.get(id);
            if (shortcut && shortcut.customizable) {
              shortcuts.set(id, { ...shortcut, binding });
            }
            return { shortcuts };
          }, false, 'setBinding');
          get().detectConflicts();
        },

        resetBinding: (id) => {
          set((state) => {
            const shortcuts = new Map(state.shortcuts);
            const shortcut = shortcuts.get(id);
            if (shortcut) {
              shortcuts.set(id, { ...shortcut, binding: { ...shortcut.defaultBinding } });
            }
            return { shortcuts };
          }, false, 'resetBinding');
          get().detectConflicts();
        },

        resetAllBindings: () => {
          set((state) => {
            const shortcuts = new Map(state.shortcuts);
            shortcuts.forEach((shortcut, id) => {
              shortcuts.set(id, { ...shortcut, binding: { ...shortcut.defaultBinding } });
            });
            return { shortcuts };
          }, false, 'resetAllBindings');
          get().detectConflicts();
        },

        setEnabled: (id, enabled) => {
          set((state) => {
            const shortcuts = new Map(state.shortcuts);
            const shortcut = shortcuts.get(id);
            if (shortcut) {
              shortcuts.set(id, { ...shortcut, enabled });
            }
            return { shortcuts };
          }, false, 'setEnabled');
        },

        setGlobalEnabled: (globalEnabled) => {
          set({ globalEnabled }, false, 'setGlobalEnabled');
        },

        getShortcut: (id) => {
          return get().shortcuts.get(id);
        },

        getByCategory: (category) => {
          const { shortcuts } = get();
          return Array.from(shortcuts.values()).filter(s => s.category === category);
        },

        findByBinding: (binding) => {
          const { shortcuts } = get();
          for (const shortcut of shortcuts.values()) {
            if (shortcut.enabled && bindingsEqual(shortcut.binding, binding)) {
              return shortcut;
            }
          }
          return undefined;
        },

        detectConflicts: () => {
          const { shortcuts } = get();
          const conflicts: Array<{ shortcut1: string; shortcut2: string; binding: string }> = [];
          const bindingMap = new Map<string, string[]>();

          shortcuts.forEach((shortcut) => {
            if (!shortcut.enabled) return;
            const key = bindingToString(shortcut.binding);
            const existing = bindingMap.get(key) || [];
            existing.push(shortcut.id);
            bindingMap.set(key, existing);
          });

          bindingMap.forEach((ids, binding) => {
            if (ids.length > 1) {
              for (let i = 0; i < ids.length - 1; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                  conflicts.push({
                    shortcut1: ids[i],
                    shortcut2: ids[j],
                    binding,
                  });
                }
              }
            }
          });

          set({ conflicts }, false, 'detectConflicts');
        },

        formatBinding: (binding) => {
          const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
          const parts: string[] = [];

          if (binding.modifiers.includes('ctrl')) {
            parts.push(isMac ? '⌘' : 'Ctrl');
          }
          if (binding.modifiers.includes('meta')) {
            parts.push(isMac ? '⌘' : 'Win');
          }
          if (binding.modifiers.includes('shift')) {
            parts.push(isMac ? '⇧' : 'Shift');
          }
          if (binding.modifiers.includes('alt')) {
            parts.push(isMac ? '⌥' : 'Alt');
          }

          // Format special keys
          let keyDisplay = binding.key;
          switch (binding.key.toLowerCase()) {
            case 'delete': keyDisplay = isMac ? '⌫' : 'Del'; break;
            case 'backspace': keyDisplay = isMac ? '⌫' : 'Backspace'; break;
            case 'escape': keyDisplay = 'Esc'; break;
            case 'arrowup': keyDisplay = '↑'; break;
            case 'arrowdown': keyDisplay = '↓'; break;
            case 'arrowleft': keyDisplay = '←'; break;
            case 'arrowright': keyDisplay = '→'; break;
            default: keyDisplay = binding.key.toUpperCase();
          }

          parts.push(keyDisplay);
          return parts.join(isMac ? '' : '+');
        },

        parseKeyEvent: (event) => {
          const modifiers: ModifierKey[] = [];
          if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
          if (event.shiftKey) modifiers.push('shift');
          if (event.altKey) modifiers.push('alt');

          return {
            key: event.key,
            modifiers,
          };
        },

        matchKeyEvent: (event) => {
          const state = get();
          if (!state.globalEnabled) return null;

          const binding = state.parseKeyEvent(event);
          const shortcut = state.findByBinding(binding);

          return shortcut || null;
        },

        setLastTriggered: (id) => {
          set({ lastTriggered: id }, false, 'setLastTriggered');
          // Auto-clear after 1 second
          if (id) {
            setTimeout(() => {
              const current = get().lastTriggered;
              if (current === id) {
                set({ lastTriggered: null }, false, 'clearLastTriggered');
              }
            }, 1000);
          }
        },

        reset: () => {
          set({
            shortcuts: createInitialShortcuts(),
            globalEnabled: true,
            conflicts: [],
            lastTriggered: null,
          }, false, 'reset');
        },
      }),
      {
        name: 'keyboard-shortcuts-store',
        storage: createJSONStorage(() => localStorage, {
          reviver: (key, value: any) => {
            if (value && typeof value === 'object' && value.__type === 'Map') {
              return new Map(value.entries);
            }
            return value;
          },
          replacer: (key, value) => {
            if (value instanceof Map) {
              return { __type: 'Map', entries: Array.from(value.entries()) };
            }
            return value;
          },
        }),
        partialize: (state) => ({
          shortcuts: state.shortcuts,
          globalEnabled: state.globalEnabled,
        }),
      }
    ),
    {
      name: 'KeyboardShortcutsStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==================
// Selector Hooks
// ==================

export const useShortcut = (id: string) =>
  useKeyboardShortcutsStore((state) => state.shortcuts.get(id));

export const useShortcutsByCategory = (category: ShortcutCategory) =>
  useKeyboardShortcutsStore((state) => state.getByCategory(category));

export const useShortcutsEnabled = () =>
  useKeyboardShortcutsStore((state) => state.globalEnabled);

export const useShortcutConflicts = () =>
  useKeyboardShortcutsStore((state) => state.conflicts);

export const useLastTriggeredShortcut = () =>
  useKeyboardShortcutsStore((state) => state.lastTriggered);

export const useShortcutActions = () =>
  useKeyboardShortcutsStore((state) => ({
    register: state.register,
    unregister: state.unregister,
    setBinding: state.setBinding,
    resetBinding: state.resetBinding,
    resetAllBindings: state.resetAllBindings,
    setEnabled: state.setEnabled,
    setGlobalEnabled: state.setGlobalEnabled,
    formatBinding: state.formatBinding,
    matchKeyEvent: state.matchKeyEvent,
    setLastTriggered: state.setLastTriggered,
  }));

export default useKeyboardShortcutsStore;
