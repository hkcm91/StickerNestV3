/**
 * StickerNest v2 - Widget Library Panel (Redesigned)
 *
 * A premium glassmorphic widget library panel with:
 * - Enhanced search with live filtering
 * - Category tabs with pill styling
 * - View mode toggle (Grid/List/Compact)
 * - Premium widget cards with I/O indicators
 */

import React, { useState, useMemo, useEffect } from 'react';
import type { WidgetManifest } from '../../types/manifest';
import { getAllBuiltinManifests } from '../../widgets/builtin';
import {
  Search,
  Grid,
  List,
  LayoutGrid,
  Sparkles,
  Puzzle,
  User,
  Folder,
  X,
} from 'lucide-react';
import { WidgetCardV2 } from '../LibraryPanel/WidgetCardV2';

// Local test widgets to load from /test-widgets/ directory
// These are HTML/JS based widgets stored in public/test-widgets/
const LOCAL_TEST_WIDGET_IDS = [
  // Organization
  'folder-widget',
  // Gallery & Photos
  'gallery-widget',
  'polaroid-widget',
  'photobooth-widget',
  'slideshow-widget',
  // Productivity
  'word-processor-widget',
  'kanban-board',
  'sticky-notes-widget',
  'project-tracker',
  'time-tracker',
  'notes-widget',
  // AI Tools
  'ai-widget-generator',
  'photo-generation-widget',
  'video-generation-widget',
  'lora-training-widget',
  // Design Tools
  'gradient-maker',
  'image-crop-mask',
  'vector-editor',
  // Media
  'youtube-playlist-widget',
  'spotify-playlist-widget',
  'synth-master',
];

// ============================================================================
// TYPES
// ============================================================================

interface WidgetLibraryPanelProps {
  onAddWidget: (widgetDefId: string) => void;
  customWidgets?: WidgetManifest[];
}

type ViewMode = 'grid' | 'list' | 'compact';
type CategoryFilter = 'all' | 'builtin' | 'custom' | 'local';

// ============================================================================
// STYLES
// ============================================================================

const panelStyles = `
  .widget-library-panel-v2 {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: var(--sn-text-primary);
    background: var(--sn-glass-bg-heavy);
  }

  /* Header Section */
  .wlp-header {
    padding: 16px;
    border-bottom: 1px solid var(--sn-border-primary);
  }

  /* Search Box */
  .wlp-search-container {
    position: relative;
    margin-bottom: 14px;
  }

  .wlp-search-input {
    width: 100%;
    padding: 12px 16px 12px 42px;
    background: var(--sn-glass-bg-light);
    border: 1px solid var(--sn-border-secondary);
    border-radius: 12px;
    color: var(--sn-text-primary);
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: all 0.2s ease;
  }

  .wlp-search-input::placeholder {
    color: var(--sn-text-muted);
  }

  .wlp-search-input:focus {
    background: var(--sn-glass-bg);
    border-color: var(--sn-accent-primary-50);
    box-shadow: 0 0 0 3px var(--sn-accent-primary-10);
  }

  .wlp-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--sn-text-muted);
    pointer-events: none;
  }

  .wlp-search-clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sn-glass-bg-light);
    border: none;
    border-radius: 6px;
    color: var(--sn-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .wlp-search-clear:hover {
    background: var(--sn-glass-bg);
    color: var(--sn-text-primary);
  }

  /* Controls Row */
  .wlp-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Category Pills */
  .wlp-category-pills {
    display: flex;
    gap: 6px;
    flex: 1;
  }

  .wlp-category-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: transparent;
    border: 1px solid var(--sn-border-secondary);
    border-radius: 20px;
    color: var(--sn-text-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .wlp-category-pill:hover {
    background: var(--sn-glass-bg-light);
    color: var(--sn-text-primary);
  }

  .wlp-category-pill.active {
    background: linear-gradient(135deg, var(--sn-accent-primary-20) 0%, var(--sn-accent-primary-10) 100%);
    border-color: var(--sn-accent-primary-40);
    color: var(--sn-accent-text);
  }

  .wlp-category-pill svg {
    width: 14px;
    height: 14px;
  }

  /* View Mode Toggle */
  .wlp-view-toggle {
    display: flex;
    background: var(--sn-glass-bg-light);
    border-radius: 8px;
    padding: 3px;
    border: 1px solid var(--sn-border-primary);
  }

  .wlp-view-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--sn-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .wlp-view-btn:hover {
    color: var(--sn-text-secondary);
  }

  .wlp-view-btn.active {
    background: var(--sn-accent-primary-30);
    color: var(--sn-accent-text);
  }

  .wlp-view-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Widget List Container */
  .wlp-list-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px;
  }

  .wlp-list-container::-webkit-scrollbar {
    width: 6px;
  }

  .wlp-list-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .wlp-list-container::-webkit-scrollbar-thumb {
    background: var(--sn-scrollbar-thumb);
    border-radius: 3px;
  }

  .wlp-list-container::-webkit-scrollbar-thumb:hover {
    background: var(--sn-scrollbar-thumb-hover);
  }

  /* Grid Layout */
  .wlp-grid {
    display: grid;
    gap: 12px;
  }

  .wlp-grid.grid-view {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .wlp-grid.list-view {
    grid-template-columns: 1fr;
  }

  .wlp-grid.compact-view {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }

  /* Empty State */
  .wlp-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }

  .wlp-empty-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sn-accent-primary-10);
    border-radius: 16px;
    margin-bottom: 16px;
    color: var(--sn-accent-primary-50);
  }

  .wlp-empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--sn-text-primary);
    margin-bottom: 6px;
  }

  .wlp-empty-text {
    font-size: 13px;
    color: var(--sn-text-muted);
  }

  /* Results Count */
  .wlp-results-count {
    padding: 8px 16px;
    font-size: 11px;
    color: var(--sn-text-muted);
    border-bottom: 1px solid var(--sn-border-subtle);
  }

  .wlp-results-count strong {
    color: var(--sn-text-secondary);
    font-weight: 600;
  }
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WidgetLibraryPanel: React.FC<WidgetLibraryPanelProps> = ({
  onAddWidget,
  customWidgets = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [localWidgets, setLocalWidgets] = useState<WidgetManifest[]>([]);

  // Get built-in manifests
  const builtinManifests = useMemo(
    () => getAllBuiltinManifests().filter((m) => m.id !== 'stickernest.container'),
    []
  );

  // Load local test widget manifests
  useEffect(() => {
    const loadLocalWidgets = async () => {
      const loaded: WidgetManifest[] = [];

      for (const id of LOCAL_TEST_WIDGET_IDS) {
        try {
          const response = await fetch(`/test-widgets/${id}/manifest.json`);
          if (response.ok) {
            const manifest = await response.json();
            loaded.push(manifest);
          }
        } catch (err) {
          console.warn(`Failed to load manifest for ${id}:`, err);
        }
      }

      setLocalWidgets(loaded);
    };

    loadLocalWidgets();
  }, []);

  // Filter widgets based on search and category
  const filteredWidgets = useMemo(() => {
    let widgets: { manifest: WidgetManifest; isBuiltin: boolean; isLocal: boolean }[] = [];

    if (activeCategory === 'all' || activeCategory === 'builtin') {
      widgets.push(...builtinManifests.map((m) => ({ manifest: m, isBuiltin: true, isLocal: false })));
    }

    if (activeCategory === 'all' || activeCategory === 'local') {
      widgets.push(...localWidgets.map((m) => ({ manifest: m, isBuiltin: false, isLocal: true })));
    }

    if (activeCategory === 'all' || activeCategory === 'custom') {
      widgets.push(...customWidgets.map((m) => ({ manifest: m, isBuiltin: false, isLocal: false })));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      widgets = widgets.filter(
        ({ manifest }) =>
          manifest.name.toLowerCase().includes(query) ||
          manifest.description?.toLowerCase().includes(query) ||
          manifest.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return widgets;
  }, [builtinManifests, localWidgets, customWidgets, activeCategory, searchQuery]);

  // Get counts for each category
  const counts = useMemo(
    () => ({
      all: builtinManifests.length + localWidgets.length + customWidgets.length,
      builtin: builtinManifests.length,
      local: localWidgets.length,
      custom: customWidgets.length,
    }),
    [builtinManifests, localWidgets, customWidgets]
  );

  return (
    <div className="widget-library-panel-v2">
      <style>{panelStyles}</style>

      {/* Header */}
      <div className="wlp-header">
        {/* Search */}
        <div className="wlp-search-container">
          <Search className="wlp-search-icon" size={16} />
          <input
            type="text"
            className="wlp-search-input"
            placeholder="Search widgets by name, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="wlp-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="wlp-controls">
          {/* Category Pills */}
          <div className="wlp-category-pills">
            <button
              className={`wlp-category-pill ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              <Sparkles />
              All ({counts.all})
            </button>
            <button
              className={`wlp-category-pill ${activeCategory === 'builtin' ? 'active' : ''}`}
              onClick={() => setActiveCategory('builtin')}
            >
              <Puzzle />
              Core
            </button>
            <button
              className={`wlp-category-pill ${activeCategory === 'local' ? 'active' : ''}`}
              onClick={() => setActiveCategory('local')}
            >
              <Folder />
              Local ({counts.local})
            </button>
            <button
              className={`wlp-category-pill ${activeCategory === 'custom' ? 'active' : ''}`}
              onClick={() => setActiveCategory('custom')}
            >
              <User />
              Custom
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="wlp-view-toggle">
            <button
              className={`wlp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <Grid />
            </button>
            <button
              className={`wlp-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List />
            </button>
            <button
              className={`wlp-view-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
              title="Compact view"
            >
              <LayoutGrid />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div className="wlp-results-count">
          Found <strong>{filteredWidgets.length}</strong> widget
          {filteredWidgets.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      {/* Widget List */}
      <div className="wlp-list-container">
        {filteredWidgets.length === 0 ? (
          <div className="wlp-empty">
            <div className="wlp-empty-icon">
              <Search size={28} />
            </div>
            <div className="wlp-empty-title">
              {searchQuery ? 'No widgets found' : 'No widgets available'}
            </div>
            <div className="wlp-empty-text">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Add custom widgets to get started'}
            </div>
          </div>
        ) : (
          <div className={`wlp-grid ${viewMode}-view`}>
            {filteredWidgets.map(({ manifest, isBuiltin, isLocal }) => (
              <WidgetCardV2
                key={manifest.id}
                widget={{
                  id: manifest.id,
                  manifest,
                  source: isBuiltin ? 'builtin' : isLocal ? 'local' : 'user',
                }}
                viewMode={viewMode}
                onAdd={() => onAddWidget(manifest.id)}
                onShowDetails={() => {
                  // Could open a details drawer/modal
                  console.log('Show details for:', manifest.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetLibraryPanel;
