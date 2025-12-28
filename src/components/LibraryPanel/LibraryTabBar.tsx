/**
 * StickerNest v2 - Library Tab Bar
 *
 * Tab navigation for the library panel.
 * Features:
 * - Icon + label tabs
 * - Active tab indicator with animation
 * - Badge counts for each tab
 * - Extensible tab configuration
 */

import React, { useCallback } from 'react';
import { Puzzle, Image, Upload, Sparkles, ShoppingBag, Workflow } from 'lucide-react';
import { useLibraryStore, type LibraryTab } from '../../state/useLibraryStore';

// ============================================
// Types
// ============================================

interface TabConfig {
  id: LibraryTab;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

interface LibraryTabBarProps {
  /** Optional callback when tab changes */
  onTabChange?: (tab: LibraryTab) => void;
  /** Optional badge counts for each tab */
  badgeCounts?: Partial<Record<LibraryTab, number>>;
}

// ============================================
// Constants
// ============================================

const DEFAULT_TABS: TabConfig[] = [
  { id: 'widgets', label: 'Widgets', icon: <Puzzle size={16} /> },
  { id: 'stickers', label: 'Stickers', icon: <Image size={16} /> },
  { id: 'pipelines', label: 'Pipelines', icon: <Workflow size={16} /> },
  { id: 'upload', label: 'Upload', icon: <Upload size={16} /> },
];

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 4,
    padding: '8px 12px',
    background: 'rgba(0, 0, 0, 0.15)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },

  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    position: 'relative',
  },

  tabActive: {
    background: 'rgba(139, 92, 246, 0.15)',
  },

  tabHover: {
    background: 'rgba(255, 255, 255, 0.05)',
  },

  tabIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'inherit',
  },

  tabLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'inherit',
  },

  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 9,
    fontSize: 10,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    color: '#fff',
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 32,
    height: 3,
    borderRadius: '3px 3px 0 0',
    background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
  },
};

// ============================================
// Component
// ============================================

export const LibraryTabBar: React.FC<LibraryTabBarProps> = ({
  onTabChange,
  badgeCounts = {},
}) => {
  const activeTab = useLibraryStore((s) => s.activeTab);
  const setActiveTab = useLibraryStore((s) => s.setActiveTab);

  const [hoveredTab, setHoveredTab] = React.useState<LibraryTab | null>(null);

  const handleTabClick = useCallback(
    (tabId: LibraryTab) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [setActiveTab, onTabChange]
  );

  return (
    <div style={styles.container}>
      {DEFAULT_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const isHovered = hoveredTab === tab.id && !isActive;
        const badgeCount = badgeCounts[tab.id] || tab.badgeCount;

        return (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : {}),
              ...(isHovered ? styles.tabHover : {}),
              color: isActive ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)',
            }}
            onClick={() => handleTabClick(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
          >
            <span style={styles.tabIcon}>{tab.icon}</span>
            <span style={styles.tabLabel}>{tab.label}</span>

            {badgeCount !== undefined && badgeCount > 0 && (
              <span style={styles.badge}>{badgeCount > 99 ? '99+' : badgeCount}</span>
            )}

            {isActive && <div style={styles.activeIndicator} />}
          </button>
        );
      })}
    </div>
  );
};

export default LibraryTabBar;
