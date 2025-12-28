/**
 * StickerNest v2 - Widget Library Panel (Rebuilt)
 *
 * A comprehensive, modular widget library panel featuring:
 * - Multi-tab interface: Widgets, Stickers, Upload
 * - Advanced search with fuzzy matching
 * - Multiple sort options
 * - Category and pipeline-based filtering
 * - Virtualized lists for performance
 * - Details drawer for widget/sticker inspection
 *
 * Integration:
 * - Uses widgetRegistry and stickerRegistry
 * - Communicates via EventBus for canvas operations
 * - State persisted via Zustand with localStorage
 *
 * Extension Strategy:
 * - Add new categories by extending CATEGORY_CONFIG in libraryUtils
 * - New filters added to useLibraryStore filter types
 * - Custom pipelines register via PIPELINE_GROUP_TAGS mapping
 */

import React, { useMemo, useEffect, useState } from 'react';
import { useLibraryStore } from '../../state/useLibraryStore';
import { WidgetLibraryTabs } from './WidgetLibraryTabs';
import { WidgetLibrarySearch } from './WidgetLibrarySearch';
import { WidgetLibrarySort } from './WidgetLibrarySort';
import { WidgetLibraryFilters } from './WidgetLibraryFilters';
import { WidgetList } from './WidgetList';
import { StickerList } from './StickerList';
import { UploaderTab } from './UploaderTab';
import { WidgetDetailsDrawer } from './WidgetDetailsDrawer';
import type { WidgetListItem } from '../../utils/libraryUtils';
import type { WidgetManifest } from '../../types/manifest';
import type { RuntimeContext } from '../../runtime/RuntimeContext';
import { X, Minimize2, Maximize2, Settings } from 'lucide-react';

// Fetch built-in widget manifests
async function fetchBuiltinManifests(): Promise<WidgetListItem[]> {
  try {
    // Try to get from the test-widgets folder
    const response = await fetch('/test-widgets/');
    if (!response.ok) return [];

    // Parse the directory listing or use known widgets
    const knownWidgets = [
      'text-block', 'button-element', 'ping-sender', 'ping-receiver',
      'color-sender', 'color-receiver', 'pipeline-button', 'pipeline-text',
      'pipeline-timer', 'canvas-bg-color', 'shape-spawner', 'vector-canvas',
      'vector-color-picker', 'vector-layers', 'vector-transform',
    ];

    const manifests: WidgetListItem[] = [];

    for (const widget of knownWidgets) {
      try {
        const manifestRes = await fetch(`/test-widgets/${widget}/manifest.json`);
        if (manifestRes.ok) {
          const manifest: WidgetManifest = await manifestRes.json();
          manifests.push({
            id: manifest.id || widget,
            manifest,
            source: 'builtin',
            category: detectCategory(manifest),
            createdAt: Date.now(),
            tags: manifest.tags,
          });
        }
      } catch {
        // Skip widgets that fail to load
      }
    }

    return manifests;
  } catch {
    return [];
  }
}

function detectCategory(manifest: WidgetManifest): string {
  const tags = (manifest.tags || []).map((t) => t.toLowerCase());
  const name = manifest.name.toLowerCase();
  const desc = (manifest.description || '').toLowerCase();
  const combined = [...tags, name, desc].join(' ');

  if (combined.includes('vector') || combined.includes('shape') || combined.includes('canvas')) {
    return 'vector-tools';
  }
  if (combined.includes('timer') || combined.includes('clock') || combined.includes('countdown')) {
    return 'timers';
  }
  if (combined.includes('button') || combined.includes('input') || combined.includes('slider') || combined.includes('control')) {
    return 'controls';
  }
  if (combined.includes('text') || combined.includes('display') || combined.includes('data')) {
    return 'data-display';
  }
  if (combined.includes('pipeline') || combined.includes('bridge') || combined.includes('relay')) {
    return 'communication';
  }
  if (combined.includes('color') || combined.includes('style') || combined.includes('layer')) {
    return 'canvas-tools';
  }
  return 'utility';
}

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
  defaultWidth?: number;
  runtime?: RuntimeContext;
}

export const WidgetLibraryPanel: React.FC<Props> = ({
  isOpen = true,
  onClose,
  defaultWidth = 320,
  runtime,
}) => {
  const activeTab = useLibraryStore((s) => s.activeTab);
  const isDetailsDrawerOpen = useLibraryStore((s) => s.isDetailsDrawerOpen);

  const [widgets, setWidgets] = useState<WidgetListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [panelWidth, setPanelWidth] = useState(defaultWidth);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Load widgets on mount
  useEffect(() => {
    setIsLoading(true);
    fetchBuiltinManifests()
      .then((loaded) => {
        setWidgets(loaded);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .widget-library-panel {
          display: flex;
          flex-direction: column;
          width: ${panelWidth}px;
          height: 100%;
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #fff;
          overflow: hidden;
          transition: width 0.2s ease;
        }

        .widget-library-panel.minimized {
          width: 48px;
        }

        .widget-library-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .widget-library-title {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
        }

        .widget-library-panel.minimized .widget-library-title {
          display: none;
        }

        .widget-library-header-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .widget-library-header-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .widget-library-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 12px;
          overflow: hidden;
        }

        .widget-library-panel.minimized .widget-library-content {
          display: none;
        }

        .widget-library-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .widget-library-controls-left {
          flex: 1;
        }

        .widget-library-filters-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .widget-library-filters-toggle:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }

        .widget-library-filters-toggle.active {
          background: rgba(102, 126, 234, 0.15);
          border-color: rgba(102, 126, 234, 0.3);
          color: #a5b4fc;
        }

        .widget-library-filters-section {
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .widget-library-filters-section.collapsed {
          max-height: 0;
        }

        .widget-library-filters-section.expanded {
          max-height: 500px;
        }

        .widget-library-list-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .widget-library-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
        }

        .widget-library-loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .widget-library-minimized-icons {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 0;
        }

        .widget-library-minimized-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 8px;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .widget-library-minimized-btn:hover {
          background: rgba(102, 126, 234, 0.2);
          transform: scale(1.05);
        }

        .widget-library-minimized-btn.active {
          background: rgba(102, 126, 234, 0.3);
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.4);
        }
      `}</style>

      <div className={`widget-library-panel ${isMinimized ? 'minimized' : ''}`}>
        {/* Header */}
        <div className="widget-library-header">
          <span className="widget-library-title">Library</span>
          <button
            className="widget-library-header-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          {onClose && (
            <button
              className="widget-library-header-btn"
              onClick={onClose}
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Minimized State */}
        {isMinimized && (
          <div className="widget-library-minimized-icons">
            <button
              className={`widget-library-minimized-btn ${activeTab === 'widgets' ? 'active' : ''}`}
              onClick={() => {
                useLibraryStore.getState().setActiveTab('widgets');
                setIsMinimized(false);
              }}
              title="Widgets"
            >
              🧩
            </button>
            <button
              className={`widget-library-minimized-btn ${activeTab === 'stickers' ? 'active' : ''}`}
              onClick={() => {
                useLibraryStore.getState().setActiveTab('stickers');
                setIsMinimized(false);
              }}
              title="Stickers"
            >
              🎨
            </button>
            <button
              className={`widget-library-minimized-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => {
                useLibraryStore.getState().setActiveTab('upload');
                setIsMinimized(false);
              }}
              title="Upload"
            >
              📤
            </button>
          </div>
        )}

        {/* Main Content */}
        {!isMinimized && (
          <div className="widget-library-content">
            {/* Tabs */}
            <WidgetLibraryTabs />

            {/* Search & Sort Controls */}
            {activeTab !== 'upload' && (
              <>
                <WidgetLibrarySearch />

                <div className="widget-library-controls">
                  <button
                    className={`widget-library-filters-toggle ${isFiltersExpanded ? 'active' : ''}`}
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  >
                    <Settings size={12} />
                    Filters
                  </button>
                  <WidgetLibrarySort />
                </div>

                {/* Filters Section */}
                <div
                  className={`widget-library-filters-section ${
                    isFiltersExpanded ? 'expanded' : 'collapsed'
                  }`}
                >
                  <WidgetLibraryFilters />
                </div>
              </>
            )}

            {/* Content Area */}
            <div className="widget-library-list-container">
              {isLoading && activeTab === 'widgets' ? (
                <div className="widget-library-loading">
                  <div className="widget-library-loading-spinner" />
                  Loading widgets...
                </div>
              ) : (
                <>
                  {activeTab === 'widgets' && (
                    <WidgetList widgets={widgets} groupByCategory runtime={runtime} />
                  )}
                  {activeTab === 'stickers' && (
                    <StickerList groupBy="pack" runtime={runtime} />
                  )}
                  {activeTab === 'upload' && (
                    <UploaderTab />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Details Drawer */}
        {isDetailsDrawerOpen && <WidgetDetailsDrawer widgets={widgets} runtime={runtime} />}
      </div>
    </>
  );
};

export default WidgetLibraryPanel;
