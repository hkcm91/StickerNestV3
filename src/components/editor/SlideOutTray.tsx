import React, { useState, useRef, useEffect, ReactNode, CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface TrayTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  badge?: string | number;
}

export interface SlideOutTrayProps {
  /** Unique identifier for the tray */
  id: string;
  /** Position of the tray (left or right edge) */
  position: 'left' | 'right';
  /** Whether the tray is currently open */
  isOpen: boolean;
  /** Callback when tray open state changes */
  onToggle: (isOpen: boolean) => void;
  /** Array of tabs to display */
  tabs: TrayTab[];
  /** Currently active tab ID */
  activeTab?: string;
  /** Callback when active tab changes */
  onTabChange?: (tabId: string) => void;
  /** Width of the tray when open */
  width?: number;
  /** Minimum width when resizable */
  minWidth?: number;
  /** Maximum width when resizable */
  maxWidth?: number;
  /** Whether the tray can be resized */
  resizable?: boolean;
  /** Custom header content */
  headerContent?: ReactNode;
  /** Show close button */
  showCloseButton?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: CSSProperties;
  /** Z-index for stacking */
  zIndex?: number;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  trayContainer: (position: 'left' | 'right', isOpen: boolean, width: number, zIndex: number): CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    [position]: 0,
    width: isOpen ? width : 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--sn-glass-bg-heavy)',
    borderLeft: position === 'right' ? '1px solid var(--sn-accent-primary-20)' : 'none',
    borderRight: position === 'left' ? '1px solid var(--sn-accent-primary-20)' : 'none',
    boxShadow: isOpen ? 'var(--sn-shadow-lg)' : 'none',
    backdropFilter: 'blur(var(--sn-glass-blur-lg))',
    WebkitBackdropFilter: 'blur(var(--sn-glass-blur-lg))',
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
    overflow: 'hidden',
    zIndex,
  }),

  toggleButton: (position: 'left' | 'right', isOpen: boolean): CSSProperties => ({
    position: 'absolute',
    top: '50%',
    [position === 'left' ? 'right' : 'left']: isOpen ? -16 : -32,
    transform: 'translateY(-50%)',
    width: 32,
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-accent-gradient)',
    border: 'none',
    borderRadius: position === 'left' ? '0 8px 8px 0' : '8px 0 0 8px',
    color: 'white',
    cursor: 'pointer',
    boxShadow: 'var(--sn-shadow-glow)',
    transition: 'all 0.2s ease, right 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1,
  }),

  tabBar: {
    display: 'flex',
    background: 'var(--sn-bg-overlay)',
    borderBottom: '1px solid var(--sn-border-primary)',
    padding: '4px 4px 0',
    gap: 2,
    minHeight: 44,
    flexShrink: 0,
  } as CSSProperties,

  tab: (isActive: boolean): CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 12px',
    background: isActive
      ? 'var(--sn-accent-primary-15)'
      : 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--sn-accent-primary)' : '2px solid transparent',
    borderRadius: '8px 8px 0 0',
    color: isActive ? 'var(--sn-text-primary)' : 'var(--sn-text-secondary)',
    fontSize: 13,
    fontWeight: isActive ? 600 : 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
    height: 18,
    padding: '0 6px',
    background: 'var(--sn-accent-gradient)',
    borderRadius: 9,
    fontSize: 10,
    fontWeight: 700,
    color: 'white',
  } as CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--sn-border-secondary)',
    background: 'var(--sn-bg-overlay)',
    flexShrink: 0,
  } as CSSProperties,

  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    background: 'var(--sn-glass-bg-light)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 6,
    color: 'var(--sn-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as CSSProperties,

  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  } as CSSProperties,

  resizeHandle: (position: 'left' | 'right'): CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    [position === 'left' ? 'right' : 'left']: 0,
    width: 4,
    cursor: 'ew-resize',
    background: 'transparent',
    transition: 'background 0.15s ease',
    zIndex: 2,
  }),
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SlideOutTray({
  id,
  position,
  isOpen,
  onToggle,
  tabs,
  activeTab,
  onTabChange,
  width = 320,
  minWidth = 240,
  maxWidth = 500,
  resizable = true,
  headerContent,
  showCloseButton = true,
  className,
  style,
  zIndex = 50,
}: SlideOutTrayProps) {
  // Track the current width for resizing
  const [currentWidth, setCurrentWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);

  // Determine active tab
  const currentActiveTab = activeTab || (tabs.length > 0 ? tabs[0].id : '');
  const activeTabContent = tabs.find(t => t.id === currentActiveTab);

  // Handle tab click
  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  // Handle resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      width: currentWidth,
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;

      const delta = position === 'left'
        ? e.clientX - resizeStartRef.current.x
        : resizeStartRef.current.x - e.clientX;

      const newWidth = Math.min(maxWidth, Math.max(minWidth, resizeStartRef.current.width + delta));
      setCurrentWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, position, minWidth, maxWidth]);

  // Update width when prop changes (if not currently resizing)
  useEffect(() => {
    if (!isResizing) {
      setCurrentWidth(width);
    }
  }, [width, isResizing]);

  return (
    <div
      ref={containerRef}
      data-tray-id={id}
      className={className}
      style={{
        ...styles.trayContainer(position, isOpen, currentWidth, zIndex),
        ...style,
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => onToggle(!isOpen)}
        style={styles.toggleButton(position, isOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px var(--sn-accent-primary-50)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          e.currentTarget.style.boxShadow = 'var(--sn-shadow-glow)';
        }}
        aria-label={isOpen ? `Close ${position} panel` : `Open ${position} panel`}
      >
        {position === 'left' ? (
          isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />
        ) : (
          isOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />
        )}
      </button>

      {/* Tab Bar */}
      {tabs.length > 0 && (
        <div style={styles.tabBar}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={styles.tab(tab.id === currentActiveTab)}
              onMouseEnter={(e) => {
                if (tab.id !== currentActiveTab) {
                  e.currentTarget.style.background = 'var(--sn-glass-bg-light)';
                  e.currentTarget.style.color = 'var(--sn-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (tab.id !== currentActiveTab) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--sn-text-secondary)';
                }
              }}
            >
              {tab.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span style={styles.badge}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Optional Header */}
      {(headerContent || showCloseButton) && (
        <div style={styles.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {headerContent}
          </div>
          {showCloseButton && (
            <button
              onClick={() => onToggle(false)}
              style={styles.closeButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--sn-glass-bg-light)';
                e.currentTarget.style.color = 'var(--sn-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--sn-glass-bg-light)';
                e.currentTarget.style.color = 'var(--sn-text-secondary)';
              }}
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div style={styles.content}>
        {activeTabContent?.content}
      </div>

      {/* Resize Handle */}
      {resizable && isOpen && (
        <div
          style={{
            ...styles.resizeHandle(position),
            background: isResizing ? 'var(--sn-accent-primary-50)' : undefined,
          }}
          onMouseDown={handleResizeStart}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = 'var(--sn-accent-primary-30)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        />
      )}
    </div>
  );
}

export default SlideOutTray;
