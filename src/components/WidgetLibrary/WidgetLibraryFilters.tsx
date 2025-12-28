/**
 * StickerNest v2 - Widget Library Filters
 * Filter chips for widgets and stickers
 */

import React from 'react';
import { useLibraryStore, WidgetFilter, StickerFilter, PipelineGroup } from '../../state/useLibraryStore';
import { getCategoryDisplayName, getCategoryEmoji } from '../../utils/libraryUtils';
import { X, Filter } from 'lucide-react';

// Widget filter configuration
const WIDGET_FILTERS: { id: WidgetFilter; label: string; icon?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'builtin', label: 'Built-in', icon: '📦' },
  { id: 'custom', label: 'Custom', icon: '✨' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'pipeline', label: 'Pipeline', icon: '🔗' },
  { id: 'canvas-tools', label: 'Canvas', icon: '🎨' },
  { id: 'vector-tools', label: 'Vector', icon: '✏️' },
  { id: 'controls', label: 'Controls', icon: '🎛️' },
  { id: 'media', label: 'Media', icon: '🎬' },
  { id: 'utility', label: 'Utility', icon: '🔧' },
];

// Sticker filter configuration
const STICKER_FILTERS: { id: StickerFilter; label: string; icon?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'static', label: 'Static', icon: '🖼️' },
  { id: 'animated', label: 'Animated', icon: '🎭' },
  { id: 'png', label: 'PNG', icon: '🎯' },
  { id: 'lottie', label: 'Lottie', icon: '✨' },
  { id: 'packs', label: 'Packs', icon: '📁' },
  { id: 'favorites', label: 'Favorites', icon: '⭐' },
];

// Pipeline group configuration
const PIPELINE_GROUPS: { id: PipelineGroup; label: string; icon: string }[] = [
  { id: 'ai-tools', label: 'AI Tools', icon: '🤖' },
  { id: 'canvas-tools', label: 'Canvas Tools', icon: '🎨' },
  { id: 'asset-tools', label: 'Asset Tools', icon: '📁' },
  { id: 'media-tools', label: 'Media Tools', icon: '🎬' },
  { id: 'custom', label: 'Custom', icon: '⭐' },
];

export const WidgetLibraryFilters: React.FC = () => {
  const activeTab = useLibraryStore((s) => s.activeTab);
  const widgetFilters = useLibraryStore((s) => s.widgetFilters);
  const stickerFilters = useLibraryStore((s) => s.stickerFilters);
  const pipelineGroupFilter = useLibraryStore((s) => s.pipelineGroupFilter);
  const customWidgetTags = useLibraryStore((s) => s.customWidgetTags);
  const customStickerTags = useLibraryStore((s) => s.customStickerTags);

  const toggleWidgetFilter = useLibraryStore((s) => s.toggleWidgetFilter);
  const toggleStickerFilter = useLibraryStore((s) => s.toggleStickerFilter);
  const setPipelineGroupFilter = useLibraryStore((s) => s.setPipelineGroupFilter);
  const removeCustomWidgetTag = useLibraryStore((s) => s.removeCustomWidgetTag);
  const removeCustomStickerTag = useLibraryStore((s) => s.removeCustomStickerTag);
  const resetFilters = useLibraryStore((s) => s.resetFilters);

  if (activeTab === 'upload') return null;

  const isWidgetTab = activeTab === 'widgets';
  const filters = isWidgetTab ? WIDGET_FILTERS : STICKER_FILTERS;
  const activeFilters = isWidgetTab ? widgetFilters : stickerFilters;
  const toggleFilter = isWidgetTab ? toggleWidgetFilter : toggleStickerFilter;
  const customTags = isWidgetTab ? customWidgetTags : customStickerTags;
  const removeTag = isWidgetTab ? removeCustomWidgetTag : removeCustomStickerTag;

  const hasActiveFilters =
    !activeFilters.includes('all') ||
    pipelineGroupFilter !== null ||
    customTags.length > 0;

  return (
    <>
      <style>{`
        .library-filters {
          margin-bottom: 12px;
        }

        .library-filters-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .library-filters-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .library-filters-clear {
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: rgba(102, 126, 234, 0.8);
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .library-filters-clear:hover {
          color: #667eea;
        }

        .library-filters-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .library-filter-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .library-filter-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .library-filter-chip.active {
          background: rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.4);
          color: #a5b4fc;
        }

        .library-filter-chip-icon {
          font-size: 12px;
        }

        .library-filter-section {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .library-filter-section-title {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .library-custom-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 6px 4px 10px;
          background: rgba(139, 92, 246, 0.2);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          color: #c4b5fd;
          font-size: 11px;
        }

        .library-custom-tag-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .library-custom-tag-remove:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
      `}</style>

      <div className="library-filters">
        <div className="library-filters-header">
          <span className="library-filters-title">
            <Filter size={12} />
            Filters
          </span>
          {hasActiveFilters && (
            <button className="library-filters-clear" onClick={resetFilters}>
              Clear all
            </button>
          )}
        </div>

        <div className="library-filters-chips">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={`library-filter-chip ${
                activeFilters.includes(filter.id as any) ? 'active' : ''
              }`}
              onClick={() => toggleFilter(filter.id as any)}
            >
              {filter.icon && <span className="library-filter-chip-icon">{filter.icon}</span>}
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Pipeline Groups (Widgets only) */}
        {isWidgetTab && (
          <div className="library-filter-section">
            <div className="library-filter-section-title">Pipeline Groups</div>
            <div className="library-filters-chips">
              {PIPELINE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  className={`library-filter-chip ${
                    pipelineGroupFilter === group.id ? 'active' : ''
                  }`}
                  onClick={() =>
                    setPipelineGroupFilter(
                      pipelineGroupFilter === group.id ? null : group.id
                    )
                  }
                >
                  <span className="library-filter-chip-icon">{group.icon}</span>
                  <span>{group.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Tags */}
        {customTags.length > 0 && (
          <div className="library-filter-section">
            <div className="library-filter-section-title">Custom Tags</div>
            <div className="library-filters-chips">
              {customTags.map((tag) => (
                <span key={tag} className="library-custom-tag">
                  #{tag}
                  <button
                    className="library-custom-tag-remove"
                    onClick={() => removeTag(tag)}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WidgetLibraryFilters;
