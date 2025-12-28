/**
 * StickerNest v2 - Command Palette
 * Quick command access via Ctrl/Cmd+K
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from './SNIcon';
import { useKeyboardShortcuts, formatShortcut, type KeyboardShortcut } from '../hooks/useKeyboardShortcuts';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: Partial<KeyboardShortcut>;
  action: () => void;
  category?: string;
  keywords?: string[];
}

interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  registerCommands: (commands: Command[]) => void;
  unregisterCommands: (ids: string[]) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
};

interface CommandPaletteProviderProps {
  children: React.ReactNode;
}

export const CommandPaletteProvider: React.FC<CommandPaletteProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dynamicCommands, setDynamicCommands] = useState<Command[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Default navigation commands
  const defaultCommands: Command[] = useMemo(() => [
    {
      id: 'nav-profile',
      label: 'Go to Profile',
      icon: 'user',
      category: 'Navigation',
      action: () => navigate('/profile'),
      keywords: ['home', 'main', 'canvases', 'gallery'],
    },
    {
      id: 'nav-editor',
      label: 'Open Editor',
      icon: 'edit',
      category: 'Navigation',
      action: () => navigate('/editor'),
      keywords: ['canvas', 'create'],
    },
    {
      id: 'nav-marketplace',
      label: 'Browse Marketplace',
      icon: 'cart',
      category: 'Navigation',
      action: () => navigate('/marketplace'),
      keywords: ['widgets', 'store', 'shop'],
    },
    {
      id: 'nav-settings',
      label: 'Open Settings',
      icon: 'settings',
      category: 'Navigation',
      shortcut: { key: ',', ctrl: true },
      action: () => navigate('/settings'),
      keywords: ['preferences', 'config'],
    },
    {
      id: 'nav-profile',
      label: 'View Profile',
      icon: 'user',
      category: 'Navigation',
      action: () => navigate('/settings?tab=profile'),
      keywords: ['account', 'me'],
    },
    {
      id: 'action-new-canvas',
      label: 'Create New Canvas',
      icon: 'plus',
      category: 'Actions',
      shortcut: { key: 'n', ctrl: true },
      action: () => navigate('/create'),
      keywords: ['create', 'new', 'blank'],
    },
    {
      id: 'action-help',
      label: 'Help & Documentation',
      icon: 'help',
      category: 'Help',
      shortcut: { key: '/', ctrl: true },
      action: () => window.open('https://docs.stickernest.com', '_blank'),
      keywords: ['docs', 'guide', 'tutorial'],
    },
    {
      id: 'action-shortcuts',
      label: 'Keyboard Shortcuts',
      icon: 'keyboard',
      category: 'Help',
      shortcut: { key: '?', shift: true },
      action: () => {
        // Show shortcuts modal - this would be implemented elsewhere
        console.log('Show shortcuts');
      },
      keywords: ['keys', 'hotkeys'],
    },
  ], [navigate]);

  const allCommands = useMemo(
    () => [...defaultCommands, ...dynamicCommands],
    [defaultCommands, dynamicCommands]
  );

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;

    const lowerQuery = query.toLowerCase();
    return allCommands.filter(cmd => {
      const matchLabel = cmd.label.toLowerCase().includes(lowerQuery);
      const matchDescription = cmd.description?.toLowerCase().includes(lowerQuery);
      const matchKeywords = cmd.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
      const matchCategory = cmd.category?.toLowerCase().includes(lowerQuery);
      return matchLabel || matchDescription || matchKeywords || matchCategory;
    });
  }, [allCommands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of filteredCommands) {
      const category = cmd.category || 'General';
      if (!groups[category]) groups[category] = [];
      groups[category].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  const registerCommands = useCallback((commands: Command[]) => {
    setDynamicCommands(prev => [...prev, ...commands]);
  }, []);

  const unregisterCommands = useCallback((ids: string[]) => {
    setDynamicCommands(prev => prev.filter(cmd => !ids.includes(cmd.id)));
  }, []);

  const executeCommand = useCallback((command: Command) => {
    close();
    command.action();
  }, [close]);

  // Keyboard navigation
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      description: 'Open command palette',
      action: open,
    },
    {
      key: 'Escape',
      description: 'Close command palette',
      action: close,
      enabled: isOpen,
    },
  ]);

  // Handle arrow keys in palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, executeCommand]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || !isOpen) return;
    const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, open, close, toggle, registerCommands, unregisterCommands }}>
      {children}

      {isOpen && (
        <div style={styles.overlay} onClick={close}>
          <div style={styles.container} onClick={e => e.stopPropagation()}>
            {/* Search Input */}
            <div style={styles.inputWrapper}>
              <SNIcon name="search" size="sm" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                style={styles.input}
                autoFocus
              />
              <div style={styles.shortcutHint}>
                <kbd style={styles.kbd}>Esc</kbd>
              </div>
            </div>

            {/* Results */}
            <div ref={listRef} style={styles.results}>
              {filteredCommands.length === 0 ? (
                <div style={styles.empty}>
                  <SNIcon name="search" size="lg" />
                  <p>No commands found</p>
                </div>
              ) : (
                Object.entries(groupedCommands).map(([category, commands]) => (
                  <div key={category}>
                    <div style={styles.category}>{category}</div>
                    {commands.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <div
                          key={cmd.id}
                          data-index={globalIndex}
                          style={{
                            ...styles.item,
                            ...(isSelected ? styles.itemSelected : {}),
                          }}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div style={styles.itemIcon}>
                            <SNIcon name={(cmd.icon as any) || 'chevronRight'} size="sm" />
                          </div>
                          <div style={styles.itemContent}>
                            <div style={styles.itemLabel}>{cmd.label}</div>
                            {cmd.description && (
                              <div style={styles.itemDescription}>{cmd.description}</div>
                            )}
                          </div>
                          {cmd.shortcut && (
                            <div style={styles.itemShortcut}>
                              <kbd style={styles.kbd}>
                                {formatShortcut(cmd.shortcut as any)}
                              </kbd>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <div style={styles.footerHint}>
                <kbd style={styles.kbdSmall}>↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div style={styles.footerHint}>
                <kbd style={styles.kbdSmall}>↵</kbd>
                <span>Select</span>
              </div>
              <div style={styles.footerHint}>
                <kbd style={styles.kbdSmall}>Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </CommandPaletteContext.Provider>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 100,
    zIndex: 10000,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    background: 'rgba(30, 30, 46, 0.98)',
    borderRadius: 16,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
    color: '#64748b',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 16,
    color: '#f1f5f9',
  },
  shortcutHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  results: {
    maxHeight: 400,
    overflowY: 'auto',
    padding: '8px 0',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#64748b',
    textAlign: 'center',
  },
  category: {
    padding: '8px 20px',
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 20px',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  itemSelected: {
    background: 'rgba(139, 92, 246, 0.15)',
  },
  itemIcon: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#a78bfa',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: '#f1f5f9',
  },
  itemDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  itemShortcut: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
    height: 24,
    padding: '0 6px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  kbdSmall: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    padding: '0 4px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 500,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 20px',
    borderTop: '1px solid rgba(139, 92, 246, 0.1)',
    background: 'rgba(15, 15, 25, 0.4)',
  },
  footerHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#64748b',
  },
};

export default CommandPaletteProvider;
