/**
 * StickerNest v2 - Widget Library Tabs
 * Tab navigation for Widgets, Stickers, and Upload
 */

import React from 'react';
import { useLibraryStore, LibraryTab } from '../../state/useLibraryStore';

interface TabConfig {
  id: LibraryTab;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'widgets', label: 'Widgets', icon: '🧩' },
  { id: 'stickers', label: 'Stickers', icon: '🎨' },
  { id: 'upload', label: 'Upload', icon: '📤' },
];

export const WidgetLibraryTabs: React.FC = () => {
  const activeTab = useLibraryStore((s) => s.activeTab);
  const setActiveTab = useLibraryStore((s) => s.setActiveTab);

  return (
    <>
      <style>{`
        .library-tabs {
          display: flex;
          gap: 2px;
          padding: 4px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .library-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .library-tab:hover {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.05);
        }

        .library-tab.active {
          color: white;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .library-tab-icon {
          font-size: 14px;
        }

        .library-tab-label {
          font-family: inherit;
        }
      `}</style>

      <div className="library-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`library-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="library-tab-icon">{tab.icon}</span>
            <span className="library-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

export default WidgetLibraryTabs;
