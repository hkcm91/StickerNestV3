/**
 * StickerNest v2 - Library Widget Grid
 *
 * Displays widgets in a responsive grid or list layout.
 * Features:
 * - Grid/List/Compact view modes
 * - Category grouping
 * - Search filtering
 * - Drag-to-canvas support
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Search, Filter, Grid, List, LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react';
import { WidgetCard } from './WidgetCard';
import { useLibraryStore } from '../../state/useLibraryStore';
import { useIsMobile } from '../../hooks/useResponsive';
import type { WidgetManifest } from '../../types/manifest';
import type { LibraryViewMode, WidgetCategory } from '../../types/library';

// ============================================
// Types
// ============================================

interface LibraryWidgetGridProps {
  /** Widget manifests to display */
  widgets: Map<string, WidgetManifest>;
  /** Handler when widget is added to canvas */
  onAddWidget?: (widgetId: string) => void;
  /** Handler when widget details are requested */
  onShowDetails?: (widgetId: string) => void;
}

interface CategoryGroup {
  category: WidgetCategory | 'uncategorized';
  label: string;
  widgets: WidgetManifest[];
}

// ============================================
// Constants
// ============================================

const CATEGORY_LABELS: Record<string, string> = {
  display: 'Display',
  controls: 'Controls',
  media: 'Media',
  'canvas-tools': 'Canvas Tools',
  'vector-tools': 'Vector Tools',
  timers: 'Timers',
  communication: 'Communication',
  containers: 'Containers',
  'ai-tools': 'AI Tools',
  data: 'Data',
  layout: 'Layout',
  social: 'Social',
  games: 'Games',
  utility: 'Utility',
  custom: 'Custom',
  uncategorized: 'Other',
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid var(--sn-border-secondary)',
  },

  searchContainer: {
    flex: 1,
    position: 'relative',
  },

  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 36px',
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 8,
    color: 'var(--sn-text-primary)',
    fontSize: 13,
    outline: 'none',
    transition: 'var(--sn-transition-fast)',
  },

  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--sn-text-muted)',
    pointerEvents: 'none',
  },

  viewToggle: {
    display: 'flex',
    gap: 2,
    padding: 2,
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 6,
  },

  viewButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    padding: 0,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: 'var(--sn-text-secondary)',
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast)',
  },

  viewButtonActive: {
    background: 'var(--sn-accent-bg, rgba(139, 92, 246, 0.2))',
    color: 'var(--sn-accent-secondary)',
  },

  content: {
    flex: 1,
    overflow: 'auto',
    padding: 12,
  },

  categorySection: {
    marginBottom: 16,
  },

  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
    cursor: 'pointer',
    userSelect: 'none',
  },

  categoryLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--sn-text-secondary)',
  },

  categoryCount: {
    fontSize: 10,
    color: 'var(--sn-text-muted)',
  },

  categoryChevron: {
    color: 'var(--sn-text-muted)',
  },

  grid: {
    display: 'grid',
    gap: 16,
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-secondary)',
    padding: 16,
    borderRadius: 12,
    position: 'relative',
    overflow: 'visible',
    isolation: 'isolate',
  },

  emptyState: {
    padding: 24,
    textAlign: 'center',
    color: 'var(--sn-text-secondary)',
  },

  emptyIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 4,
    color: 'var(--sn-text-primary)',
  },

  emptyText: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
  },
};

// ============================================
// Helper Functions
// ============================================

const getGridColumns = (viewMode: LibraryViewMode): string => {
  switch (viewMode) {
    case 'grid':
      return 'repeat(auto-fill, minmax(180px, 1fr))';
    case 'list':
      return '1fr';
    case 'compact':
      return 'repeat(auto-fill, minmax(80px, 1fr))';
    default:
      return 'repeat(auto-fill, minmax(180px, 1fr))';
  }
};

const categorizeWidget = (manifest: WidgetManifest): WidgetCategory | 'uncategorized' => {
  // Try to determine category from tags or manifest fields
  const tags = manifest.tags || [];

  if (tags.includes('canvas') || tags.includes('canvas-tool')) return 'canvas-tools';
  if (tags.includes('vector') || tags.includes('svg')) return 'vector-tools';
  if (tags.includes('media') || tags.includes('video') || tags.includes('audio')) return 'media';
  if (tags.includes('ai') || tags.includes('generation')) return 'ai-tools';
  if (tags.includes('game') || tags.includes('gaming')) return 'games';
  if (tags.includes('social')) return 'social';
  if (tags.includes('container') || manifest.kind === 'container') return 'containers';
  if (tags.includes('timer') || tags.includes('clock')) return 'timers';
  if (tags.includes('communication') || tags.includes('chat')) return 'communication';
  if (tags.includes('data') || tags.includes('chart')) return 'data';
  if (tags.includes('layout')) return 'layout';
  if (tags.includes('control') || tags.includes('button')) return 'controls';
  if (tags.includes('display') || tags.includes('text')) return 'display';
  if (tags.includes('utility') || tags.includes('tool')) return 'utility';

  return 'uncategorized';
};

// ============================================
// Component
// ============================================

export const LibraryWidgetGrid: React.FC<LibraryWidgetGridProps> = ({
  widgets,
  onAddWidget,
  onShowDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const isMobile = useIsMobile();
  const storeViewMode = useLibraryStore((s) => s.viewMode);
  const setViewMode = useLibraryStore((s) => s.setViewMode);
  const pinnedItems = useLibraryStore((s) => s.pinnedItems);
  const pinItem = useLibraryStore((s) => s.pinItem);
  const unpinItem = useLibraryStore((s) => s.unpinItem);
  const trackItemAccess = useLibraryStore((s) => s.trackItemAccess);

  // On mobile, force compact view for better touch targets
  const viewMode: LibraryViewMode = isMobile ? 'compact' : storeViewMode;

  // Filter widgets by search query
  const filteredWidgets = useMemo(() => {
    const widgetList = Array.from(widgets.values());

    if (!searchQuery.trim()) return widgetList;

    const query = searchQuery.toLowerCase();
    return widgetList.filter((w) => {
      const name = w.name.toLowerCase();
      const description = (w.description || '').toLowerCase();
      const tags = (w.tags || []).join(' ').toLowerCase();

      return name.includes(query) || description.includes(query) || tags.includes(query);
    });
  }, [widgets, searchQuery]);

  // Group widgets by category
  const categoryGroups = useMemo((): CategoryGroup[] => {
    const groups = new Map<string, WidgetManifest[]>();

    filteredWidgets.forEach((widget) => {
      const category = categorizeWidget(widget);
      const existing = groups.get(category) || [];
      groups.set(category, [...existing, widget]);
    });

    // Sort groups and convert to array
    const sortedCategories = Array.from(groups.entries())
      .sort(([a], [b]) => {
        // Put 'uncategorized' at the end
        if (a === 'uncategorized') return 1;
        if (b === 'uncategorized') return -1;
        return (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b);
      })
      .map(([category, widgets]) => ({
        category: category as WidgetCategory | 'uncategorized',
        label: CATEGORY_LABELS[category] || category,
        widgets: widgets.sort((a, b) => a.name.localeCompare(b.name)),
      }));

    return sortedCategories;
  }, [filteredWidgets]);

  // Check if widget is favorited
  const isWidgetFavorite = useCallback(
    (widgetId: string) => pinnedItems.some((item) => item.id === widgetId && item.type === 'widget'),
    [pinnedItems]
  );

  // Toggle category collapse
  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Handle widget add
  const handleAddWidget = useCallback(
    (widgetId: string) => {
      trackItemAccess(widgetId, 'widget');
      onAddWidget?.(widgetId);
    },
    [trackItemAccess, onAddWidget]
  );

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(
    (widgetId: string) => {
      if (isWidgetFavorite(widgetId)) {
        unpinItem(widgetId);
      } else {
        pinItem(widgetId, 'widget');
      }
    },
    [isWidgetFavorite, pinItem, unpinItem]
  );

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* Search */}
        <div style={styles.searchContainer as React.CSSProperties}>
          <Search size={14} style={styles.searchIcon as React.CSSProperties} />
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* View Mode Toggle */}
        <div style={styles.viewToggle}>
          <button
            style={{
              ...styles.viewButton,
              ...(viewMode === 'grid' ? styles.viewButtonActive : {}),
            }}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <Grid size={14} />
          </button>
          <button
            style={{
              ...styles.viewButton,
              ...(viewMode === 'list' ? styles.viewButtonActive : {}),
            }}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List size={14} />
          </button>
          <button
            style={{
              ...styles.viewButton,
              ...(viewMode === 'compact' ? styles.viewButtonActive : {}),
            }}
            onClick={() => setViewMode('compact')}
            title="Compact view"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {categoryGroups.length === 0 ? (
          <div style={styles.emptyState as React.CSSProperties}>
            <Search size={32} style={styles.emptyIcon} />
            <div style={styles.emptyTitle}>No widgets found</div>
            <div style={styles.emptyText}>
              {searchQuery ? 'Try a different search term' : 'No widgets available'}
            </div>
          </div>
        ) : (
          categoryGroups.map((group) => {
            const isCollapsed = collapsedCategories.has(group.category);

            return (
              <div key={group.category} style={styles.categorySection}>
                {/* Category Header */}
                <div style={styles.categoryHeader} onClick={() => toggleCategory(group.category)}>
                  <span style={styles.categoryChevron}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </span>
                  <span style={styles.categoryLabel}>{group.label}</span>
                  <span style={styles.categoryCount}>({group.widgets.length})</span>
                </div>

                {/* Category Grid */}
                {!isCollapsed && (
                  <div
                    style={{
                      ...styles.grid,
                      gridTemplateColumns: getGridColumns(viewMode),
                    }}
                  >
                    {group.widgets.map((widget) => (
                      <WidgetCard
                        key={widget.id}
                        widget={{
                          id: widget.id,
                          manifest: widget,
                          source: 'official',
                          // Cast to valid category or undefined for uncategorized
                          category: (() => {
                            const cat = categorizeWidget(widget);
                            return cat === 'uncategorized' ? undefined : cat as WidgetCategory;
                          })(),
                        }}
                        viewMode={viewMode}
                        isFavorite={isWidgetFavorite(widget.id)}
                        onAdd={handleAddWidget}
                        onShowDetails={onShowDetails}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LibraryWidgetGrid;
