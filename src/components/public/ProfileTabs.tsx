/**
 * ProfileTabs Component
 * Tabbed navigation for profile sections
 */

import React from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import type { ProfileTab } from '../../types/profile';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  canvasCounts?: {
    all: number;
    collections: number;
    favorites: number;
  };
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  canvasCounts = { all: 0, collections: 0, favorites: 0 },
}) => {
  const tabs: { id: ProfileTab; label: string; icon: string; count?: number }[] = [
    { id: 'canvases', label: 'Canvases', icon: 'layout', count: canvasCounts.all },
    { id: 'collections', label: 'Collections', icon: 'folder', count: canvasCounts.collections },
    { id: 'favorites', label: 'Favorites', icon: 'heart', count: canvasCounts.favorites },
    { id: 'about', label: 'About', icon: 'info' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.tabList}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => onTabChange(tab.id)}
          >
            <SNIcon
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.id ? '#8b5cf6' : '#64748b'}
            />
            <span style={styles.tabLabel}>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                style={{
                  ...styles.tabCount,
                  ...(activeTab === tab.id ? styles.tabCountActive : {}),
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: 32,
  },
  tabList: {
    display: 'flex',
    gap: 8,
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 40px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '16px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    marginBottom: -1,
  },
  tabActive: {
    color: '#f1f5f9',
    borderBottomColor: '#8b5cf6',
  },
  tabLabel: {
    // inherit color
  },
  tabCount: {
    padding: '2px 8px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    fontSize: 12,
    color: '#64748b',
  },
  tabCountActive: {
    background: 'rgba(139, 92, 246, 0.15)',
    color: '#a78bfa',
  },
};

export default ProfileTabs;
