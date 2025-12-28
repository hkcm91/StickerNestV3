/**
 * StickerNest v2 - Keyboard Shortcuts Panel
 *
 * Displays all available keyboard shortcuts in a modal overlay.
 * Opened with '?' key, grouped by category.
 */

import React, { useEffect, useCallback } from 'react';
import { formatShortcut, type KeyboardShortcut } from '../../hooks/useCanvasKeyboardShortcuts';

// ============================================================================
// TYPES
// ============================================================================

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

interface CategoryConfig {
  id: KeyboardShortcut['category'];
  label: string;
  icon: React.ReactNode;
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'edit',
    label: 'Edit',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    id: 'selection',
    label: 'Selection',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3h18v18H3z" strokeDasharray="4 4" />
      </svg>
    ),
  },
  {
    id: 'z-index',
    label: 'Layering',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="8" y="8" width="12" height="12" rx="1" />
        <path d="M4 16V6a2 2 0 0 1 2-2h10" />
      </svg>
    ),
  },
  {
    id: 'view',
    label: 'View',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: 'canvas',
    label: 'Canvas',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function KeyboardShortcutsPanel({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsPanelProps) {
  // Close on escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Group shortcuts by category
  const shortcutsByCategory = CATEGORIES.map(category => ({
    ...category,
    shortcuts: shortcuts.filter(s => s.category === category.id),
  })).filter(c => c.shortcuts.length > 0);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--sn-bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200000,
        backdropFilter: 'blur(var(--sn-glass-blur-sm, 4px))',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 800,
          maxHeight: '85vh',
          backgroundColor: 'var(--sn-bg-secondary)',
          borderRadius: 12,
          border: '1px solid var(--sn-accent-primary-30)',
          boxShadow: 'var(--sn-shadow-xl, 0 16px 64px rgba(0, 0, 0, 0.5))',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--sn-accent-primary-20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--sn-accent-primary)" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h12" />
            </svg>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--sn-text-primary)', fontWeight: 600 }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'transparent',
              border: '1px solid var(--sn-accent-primary-30)',
              borderRadius: 6,
              color: 'var(--sn-text-secondary)',
              cursor: 'pointer',
              fontSize: 18,
            }}
            title="Close (Esc)"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
            }}
          >
            {shortcutsByCategory.map(category => (
              <div key={category.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    color: 'var(--sn-accent-primary)',
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {category.icon}
                  {category.label}
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--sn-accent-primary-5)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  {category.shortcuts.map((shortcut, index) => (
                    <div
                      key={`${shortcut.key}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderBottom:
                          index < category.shortcuts.length - 1
                            ? '1px solid var(--sn-accent-primary-10)'
                            : 'none',
                      }}
                    >
                      <span style={{ color: 'var(--sn-text-primary)', fontSize: 13 }}>
                        {shortcut.description}
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                        }}
                      >
                        {formatShortcut(shortcut).split('+').map((key, i) => (
                          <kbd
                            key={i}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 24,
                              height: 24,
                              padding: '0 6px',
                              backgroundColor: 'var(--sn-bg-tertiary)',
                              border: '1px solid var(--sn-accent-primary-30)',
                              borderRadius: 4,
                              color: 'var(--sn-accent-tertiary)',
                              fontSize: 11,
                              fontFamily: 'monospace',
                              fontWeight: 500,
                            }}
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--sn-accent-primary-20)',
            backgroundColor: 'var(--sn-accent-primary-5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--sn-text-muted)',
            fontSize: 12,
          }}
        >
          <span>Press</span>
          <kbd
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              backgroundColor: 'var(--sn-bg-tertiary)',
              border: '1px solid var(--sn-accent-primary-30)',
              borderRadius: 4,
              color: 'var(--sn-accent-tertiary)',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
          >
            ?
          </kbd>
          <span>or</span>
          <kbd
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 8px',
              height: 22,
              backgroundColor: 'var(--sn-bg-tertiary)',
              border: '1px solid var(--sn-accent-primary-30)',
              borderRadius: 4,
              color: 'var(--sn-accent-tertiary)',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            Esc
          </kbd>
          <span>to close</span>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsPanel;
