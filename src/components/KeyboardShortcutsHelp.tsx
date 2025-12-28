/**
 * Keyboard Shortcuts Help Overlay
 * Shows all available keyboard shortcuts in a modal
 */

import React from 'react';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation & Zoom',
    shortcuts: [
      { keys: ['Scroll'], description: 'Pan canvas' },
      { keys: ['Ctrl', 'Scroll'], description: 'Zoom in/out at cursor' },
      { keys: ['Space', 'Drag'], description: 'Pan canvas (hand tool)' },
      { keys: ['Middle Mouse', 'Drag'], description: 'Pan canvas' },
      { keys: ['Double Click'], description: 'Toggle zoom (100% ↔ 200%)' },
      { keys: ['+', '='], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
      { keys: ['Ctrl', '0'], description: 'Reset to 100%' },
      { keys: ['Ctrl', '1'], description: 'Zoom to 100%' },
      { keys: ['Ctrl', '2'], description: 'Zoom to 200%' },
      { keys: ['Shift', '1'], description: 'Fit to screen' },
      { keys: ['Home'], description: 'Reset pan to center' },
    ],
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: ['Click'], description: 'Select widget' },
      { keys: ['Shift', 'Click'], description: 'Add to selection' },
      { keys: ['Ctrl', 'Click'], description: 'Toggle selection' },
      { keys: ['Ctrl', 'A'], description: 'Select all widgets' },
      { keys: ['Escape'], description: 'Deselect all' },
      { keys: ['Tab'], description: 'Select next widget' },
      { keys: ['Shift', 'Tab'], description: 'Select previous widget' },
    ],
  },
  {
    title: 'Widget Actions',
    shortcuts: [
      { keys: ['Delete'], description: 'Delete selected' },
      { keys: ['Backspace'], description: 'Delete selected' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate selected' },
      { keys: ['Ctrl', 'C'], description: 'Copy selected' },
      { keys: ['Ctrl', 'V'], description: 'Paste' },
      { keys: ['Ctrl', 'X'], description: 'Cut selected' },
      { keys: ['Arrow Keys'], description: 'Move selected (by grid)' },
      { keys: ['Shift', 'Arrow Keys'], description: 'Move selected (5x grid)' },
    ],
  },
  {
    title: 'Layer Order (Z-Index)',
    shortcuts: [
      { keys: [']'], description: 'Bring forward' },
      { keys: ['['], description: 'Send backward' },
      { keys: ['Ctrl', ']'], description: 'Bring to front' },
      { keys: ['Ctrl', '['], description: 'Send to back' },
    ],
  },
  {
    title: 'Grouping & Layers',
    shortcuts: [
      { keys: ['Ctrl', 'G'], description: 'Group selected (2+)' },
      { keys: ['Ctrl', 'Shift', 'G'], description: 'Ungroup selected' },
      { keys: ['L'], description: 'Toggle layer panel' },
      { keys: ['Ctrl', 'L'], description: 'Lock/unlock selected' },
      { keys: ['Ctrl', 'H'], description: 'Hide/show selected' },
    ],
  },
  {
    title: 'Alignment (with 2+ selected)',
    shortcuts: [
      { keys: ['Alt', 'A'], description: 'Align left' },
      { keys: ['Alt', 'H'], description: 'Align center horizontal' },
      { keys: ['Alt', 'D'], description: 'Align right' },
      { keys: ['Alt', 'W'], description: 'Align top' },
      { keys: ['Alt', 'V'], description: 'Align center vertical' },
      { keys: ['Alt', 'S'], description: 'Align bottom' },
    ],
  },
  {
    title: 'History',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo (alternative)' },
    ],
  },
  {
    title: 'Mode Switching',
    shortcuts: [
      { keys: ['V'], description: 'View mode' },
      { keys: ['E'], description: 'Edit mode' },
      { keys: ['C'], description: 'Connect mode (pipelines)' },
    ],
  },
  {
    title: 'Other',
    shortcuts: [
      { keys: ['?'], description: 'Show this help' },
      { keys: ['G'], description: 'Toggle grid snap' },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          maxWidth: 900,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, color: '#fff', fontWeight: 600 }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 6,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#999',
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: 24,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3
                style={{
                  margin: '0 0 12px 0',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4a9eff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {group.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                    }}
                  >
                    <span style={{ color: '#999', fontSize: 13 }}>
                      {shortcut.description}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {shortcut.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          {keyIdx > 0 && (
                            <span style={{ color: '#666', fontSize: 11 }}>+</span>
                          )}
                          <kbd
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontSize: 11,
                              fontFamily: 'monospace',
                              color: '#fff',
                              minWidth: 24,
                              textAlign: 'center',
                            }}
                          >
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            color: '#666',
            fontSize: 12,
          }}
        >
          Press <kbd style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
          }}>?</kbd> or <kbd style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
          }}>Escape</kbd> to close
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
