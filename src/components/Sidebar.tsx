/**
 * StickerNest v2 - Sidebar
 * Desktop sidebar with icon navigation and optional labels
 */

import React from 'react';
import { SNIcon, IconName } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { SNTooltip } from '../shared-ui/SNTooltip';
import { useAppShell } from '../layouts/AppShell';
import { useThemeStore } from '../state/useThemeStore';

// ============================================
// Types
// ============================================

export interface SidebarItem {
  id: string;
  icon: IconName;
  label: string;
  badge?: number | string;
  disabled?: boolean;
}

export interface SidebarProps {
  /** Navigation items */
  items: SidebarItem[];
  /** Currently active item ID */
  activeId?: string;
  /** Callback when item is clicked */
  onItemClick?: (id: string) => void;
  /** Footer items (e.g., settings, theme toggle) */
  footerItems?: SidebarItem[];
  /** Logo/brand element */
  logo?: React.ReactNode;
  /** Whether to show theme toggle */
  showThemeToggle?: boolean;
}

// ============================================
// Styles
// ============================================

const styles = {
  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    padding: '8px 0',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginBottom: 8,
    flexShrink: 0,
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    padding: '0 8px',
    overflow: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 'var(--sn-radius-md, 8px)',
    color: 'var(--sn-text-secondary, #a0aec0)',
    cursor: 'pointer',
    transition: 'all var(--sn-transition-fast, 100ms ease-out)',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    fontSize: 'var(--sn-text-sm, 12px)',
    fontWeight: 500,
    textDecoration: 'none',
    position: 'relative' as const,
  },
  navItemHover: {
    background: 'var(--sn-glass-bg-light, rgba(255, 255, 255, 0.08))',
    color: 'var(--sn-text-primary, #f0f4f8)',
  },
  navItemActive: {
    background: 'rgba(139, 92, 246, 0.15)',
    color: 'var(--sn-accent-primary, #8b5cf6)',
  },
  navItemDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    flexShrink: 0,
  },
  label: {
    flex: 1,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
    height: 18,
    padding: '0 6px',
    fontSize: 10,
    fontWeight: 600,
    color: '#ffffff',
    background: 'var(--sn-accent-primary, #8b5cf6)',
    borderRadius: 'var(--sn-radius-full, 9999px)',
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    padding: '8px',
    borderTop: '1px solid var(--sn-border-secondary, rgba(255, 255, 255, 0.04))',
    marginTop: 'auto',
  },
  themeToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  activeIndicator: {
    position: 'absolute' as const,
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 20,
    background: 'var(--sn-accent-primary, #8b5cf6)',
    borderRadius: '0 3px 3px 0',
  },
  collapsedItem: {
    padding: '10px 0',
    justifyContent: 'center',
  },
};

// ============================================
// Navigation Item Component
// ============================================

interface NavItemProps {
  item: SidebarItem;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, active, expanded, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const itemStyle: React.CSSProperties = {
    ...styles.navItem,
    ...(expanded ? {} : styles.collapsedItem),
    ...(isHovered && !item.disabled ? styles.navItemHover : {}),
    ...(active ? styles.navItemActive : {}),
    ...(item.disabled ? styles.navItemDisabled : {}),
  };

  const content = (
    <button
      style={itemStyle}
      onClick={item.disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={item.disabled}
      aria-current={active ? 'page' : undefined}
    >
      {active && <span style={styles.activeIndicator} />}
      <span style={styles.iconWrapper}>
        <SNIcon name={item.icon} size="md" />
      </span>
      {expanded && (
        <>
          <span style={styles.label}>{item.label}</span>
          {item.badge && <span style={styles.badge}>{item.badge}</span>}
        </>
      )}
    </button>
  );

  // Show tooltip only when collapsed
  if (!expanded) {
    return (
      <SNTooltip content={item.label} position="right">
        {content}
      </SNTooltip>
    );
  }

  return content;
};

// ============================================
// Main Sidebar Component
// ============================================

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeId,
  onItemClick,
  footerItems,
  logo,
  showThemeToggle = true,
}) => {
  const { sidebarExpanded } = useAppShell();
  const toggleMode = useThemeStore(state => state.toggleMode);
  const currentTheme = useThemeStore(state => state.currentTheme);
  const isDark = currentTheme.mode === 'dark';

  return (
    <div style={styles.sidebar}>
      {/* Logo */}
      {logo && <div style={styles.logo}>{logo}</div>}

      {/* Main navigation */}
      <nav style={styles.nav}>
        {items.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activeId === item.id}
            expanded={sidebarExpanded}
            onClick={() => onItemClick?.(item.id)}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={styles.footer}>
        {/* Footer items */}
        {footerItems?.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activeId === item.id}
            expanded={sidebarExpanded}
            onClick={() => onItemClick?.(item.id)}
          />
        ))}

        {/* Theme toggle */}
        {showThemeToggle && (
          <div style={styles.themeToggle}>
            <SNIconButton
              icon={isDark ? 'sun' : 'moon'}
              variant="ghost"
              size="md"
              tooltip={isDark ? 'Light mode' : 'Dark mode'}
              tooltipPosition="right"
              onClick={toggleMode}
            />
          </div>
        )}
      </div>
    </div>
  );
};

Sidebar.displayName = 'Sidebar';

export default Sidebar;
