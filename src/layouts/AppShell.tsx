/**
 * StickerNest v2 - AppShell
 * Main responsive layout container with sidebar, toolbar, and content areas
 */

import React, { useState, useCallback, createContext, useContext } from 'react';
import { useThemeStore } from '../state/useThemeStore';
import { ThemedAppBackground } from '../components/ThemedAppBackground';

// ============================================
// Types
// ============================================

export type BreakpointKey = 'mobile' | 'tablet' | 'desktop';

export interface AppShellContextValue {
  /** Current breakpoint */
  breakpoint: BreakpointKey;
  /** Whether sidebar is visible */
  sidebarVisible: boolean;
  /** Whether sidebar is expanded (desktop only) */
  sidebarExpanded: boolean;
  /** Toggle sidebar visibility */
  toggleSidebar: () => void;
  /** Set sidebar expanded state */
  setSidebarExpanded: (expanded: boolean) => void;
  /** Whether any panel is open (mobile only) */
  panelOpen: string | null;
  /** Set open panel */
  setPanelOpen: (panel: string | null) => void;
}

export interface AppShellProps {
  children: React.ReactNode;
  /** Left sidebar content */
  sidebar?: React.ReactNode;
  /** Top toolbar content */
  toolbar?: React.ReactNode;
  /** Bottom navigation (mobile) */
  bottomNav?: React.ReactNode;
  /** Right panel content */
  rightPanel?: React.ReactNode;
  /** Whether to show gradient background */
  gradientBackground?: boolean;
  /** Custom className */
  className?: string;
}

// ============================================
// Context
// ============================================

const AppShellContext = createContext<AppShellContextValue | null>(null);

export const useAppShell = () => {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error('useAppShell must be used within an AppShell');
  }
  return context;
};

// ============================================
// Hook: Breakpoint Detection
// ============================================

function useBreakpoint(): BreakpointKey {
  const [breakpoint, setBreakpoint] = React.useState<BreakpointKey>('desktop');

  React.useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
}

// ============================================
// Styles
// ============================================

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--sn-bg-primary)',
  },
  shellGradient: {
    background: 'var(--sn-bg-gradient)',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: 'var(--sn-sidebar-width)',
    height: '100%',
    background: 'var(--sn-glass-bg)',
    borderRight: '1px solid var(--sn-glass-border)',
    backdropFilter: 'blur(var(--sn-glass-blur-md))',
    WebkitBackdropFilter: 'blur(var(--sn-glass-blur-md))',
    transition: 'width var(--sn-transition-normal)',
    zIndex: 'var(--sn-z-sidebar)' as unknown as number,
    flexShrink: 0,
  },
  sidebarExpanded: {
    width: 'var(--sn-sidebar-width-expanded)',
  },
  sidebarHidden: {
    width: 0,
    borderRight: 'none',
    overflow: 'hidden',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    height: 'var(--sn-toolbar-height)',
    padding: '0 16px',
    background: 'var(--sn-glass-bg)',
    borderBottom: '1px solid var(--sn-glass-border)',
    backdropFilter: 'blur(var(--sn-glass-blur-md))',
    WebkitBackdropFilter: 'blur(var(--sn-glass-blur-md))',
    flexShrink: 0,
  },
  canvas: {
    flex: 1,
    overflow: 'auto',
    position: 'relative' as const,
  },
  bottomNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'var(--sn-mobile-nav-height)',
    background: 'var(--sn-glass-bg-heavy)',
    borderTop: '1px solid var(--sn-glass-border)',
    backdropFilter: 'blur(var(--sn-glass-blur-lg))',
    WebkitBackdropFilter: 'blur(var(--sn-glass-blur-lg))',
    flexShrink: 0,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  rightPanel: {
    width: 320,
    height: '100%',
    background: 'var(--sn-glass-bg)',
    borderLeft: '1px solid var(--sn-glass-border)',
    backdropFilter: 'blur(var(--sn-glass-blur-md))',
    WebkitBackdropFilter: 'blur(var(--sn-glass-blur-md))',
    overflow: 'auto',
    flexShrink: 0,
  },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'var(--sn-overlay-bg)',
    zIndex: 'var(--sn-z-overlay)' as unknown as number,
    backdropFilter: 'blur(var(--sn-glass-blur-sm))',
    WebkitBackdropFilter: 'blur(var(--sn-glass-blur-sm))',
  },
  mobileSidebar: {
    position: 'fixed' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    background: 'var(--sn-bg-secondary)',
    borderRight: '1px solid var(--sn-glass-border)',
    zIndex: 'var(--sn-z-modal)' as unknown as number,
    transform: 'translateX(-100%)',
    transition: 'transform var(--sn-transition-normal)',
    overflow: 'auto',
  },
  mobileSidebarOpen: {
    transform: 'translateX(0)',
  },
};

// ============================================
// Component
// ============================================

export const AppShell: React.FC<AppShellProps> = ({
  children,
  sidebar,
  toolbar,
  bottomNav,
  rightPanel,
  gradientBackground = true,
  className = '',
}) => {
  const breakpoint = useBreakpoint();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState<string | null>(null);

  // Theme state
  const currentTheme = useThemeStore(state => state.currentTheme);
  const hasParallaxBackground = currentTheme?.appBackground?.type === 'parallax';

  // Apply theme on mount - use getState() to avoid infinite loop
  // (extracting function via selector creates new reference each render)
  React.useEffect(() => {
    useThemeStore.getState().applyThemeToDOM();
  }, []);

  const toggleSidebar = useCallback(() => {
    if (breakpoint === 'mobile') {
      setSidebarVisible(prev => !prev);
    } else {
      setSidebarExpanded(prev => !prev);
    }
  }, [breakpoint]);

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  const contextValue: AppShellContextValue = {
    breakpoint,
    sidebarVisible,
    sidebarExpanded,
    toggleSidebar,
    setSidebarExpanded,
    panelOpen,
    setPanelOpen,
  };

  // Shell styles - transparent when parallax is active
  const shellStyle: React.CSSProperties = {
    ...styles.shell,
    ...(hasParallaxBackground
      ? { background: 'transparent' }
      : gradientBackground ? styles.shellGradient : {}),
  };

  // Sidebar styles based on breakpoint
  const getSidebarStyle = (): React.CSSProperties => {
    if (isMobile) {
      return {
        ...styles.mobileSidebar,
        ...(sidebarVisible ? styles.mobileSidebarOpen : {}),
      };
    }
    if (isTablet) {
      return {
        ...styles.sidebar,
        ...(sidebarVisible ? {} : styles.sidebarHidden),
      };
    }
    return {
      ...styles.sidebar,
      ...(sidebarExpanded ? styles.sidebarExpanded : {}),
    };
  };

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className={`sn-app-shell sn-app-shell-${breakpoint} ${className}`} style={shellStyle}>
        {/* Themed parallax background */}
        {hasParallaxBackground && <ThemedAppBackground />}

        {/* Main content area */}
        <div style={styles.main}>
          {/* Desktop/Tablet Sidebar */}
          {!isMobile && sidebar && (
            <aside style={getSidebarStyle()}>
              {sidebar}
            </aside>
          )}

          {/* Content container */}
          <div style={styles.content}>
            {/* Toolbar */}
            {toolbar && (
              <header style={styles.toolbar}>
                {toolbar}
              </header>
            )}

            {/* Main canvas/content area */}
            <main style={styles.canvas}>
              {children}
            </main>
          </div>

          {/* Right panel (desktop only) */}
          {isDesktop && rightPanel && (
            <aside style={styles.rightPanel}>
              {rightPanel}
            </aside>
          )}
        </div>

        {/* Mobile bottom navigation */}
        {isMobile && bottomNav && (
          <nav style={styles.bottomNav}>
            {bottomNav}
          </nav>
        )}

        {/* Mobile sidebar overlay */}
        {isMobile && sidebarVisible && (
          <>
            <div
              style={styles.overlay}
              onClick={() => setSidebarVisible(false)}
              aria-hidden="true"
            />
            <aside style={getSidebarStyle()}>
              {sidebar}
            </aside>
          </>
        )}
      </div>
    </AppShellContext.Provider>
  );
};

AppShell.displayName = 'AppShell';

export default AppShell;
