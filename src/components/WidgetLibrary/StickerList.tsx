/**
 * StickerNest v2 - Sticker List
 * Grid of stickers with grouping support
 */

import React, { useMemo, useCallback } from 'react';
import { StickerListItem } from './StickerListItem';
import { useLibraryStore, StickerLibraryItem } from '../../state/useLibraryStore';
import {
  processStickers,
  groupStickersByPack,
  groupStickersByCategory,
} from '../../utils/libraryUtils';
import { ChevronDown, ChevronRight, Image } from 'lucide-react';
import type { RuntimeContext } from '../../runtime/RuntimeContext';

interface Props {
  groupBy?: 'none' | 'pack' | 'category';
  isCompact?: boolean;
  runtime?: RuntimeContext;
}

export const StickerList: React.FC<Props> = ({
  groupBy = 'pack',
  isCompact = false,
  runtime,
}) => {
  const stickerLibrary = useLibraryStore((s) => s.stickerLibrary);
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const stickerSortMode = useLibraryStore((s) => s.stickerSortMode);
  const stickerFilters = useLibraryStore((s) => s.stickerFilters);
  const customStickerTags = useLibraryStore((s) => s.customStickerTags);
  const collapsedCategories = useLibraryStore((s) => s.collapsedCategories);
  const toggleCategoryCollapse = useLibraryStore((s) => s.toggleCategoryCollapse);
  const openDetailsDrawer = useLibraryStore((s) => s.openDetailsDrawer);

  // Process stickers with search, filter, sort
  const processedStickers = useMemo(() => {
    return processStickers(stickerLibrary, {
      searchQuery,
      sortMode: stickerSortMode,
      filters: stickerFilters,
      customTags: customStickerTags,
    });
  }, [stickerLibrary, searchQuery, stickerSortMode, stickerFilters, customStickerTags]);

  // Group stickers
  const groupedStickers = useMemo(() => {
    if (groupBy === 'none' || searchQuery) {
      return null;
    }
    if (groupBy === 'pack') {
      return groupStickersByPack(processedStickers);
    }
    return groupStickersByCategory(processedStickers);
  }, [processedStickers, groupBy, searchQuery]);

  // Add sticker to canvas
  const handleAddSticker = useCallback((sticker: StickerLibraryItem) => {
    if (runtime?.eventBus) {
      runtime.eventBus.emit({
        type: 'sticker:add-request',
        scope: 'canvas',
        payload: {
          stickerId: sticker.id,
          url: sticker.url,
          type: sticker.type,
          name: sticker.name,
        },
      });
    }
  }, [runtime]);

  // Open details drawer
  const handleOpenDetails = useCallback((sticker: StickerLibraryItem) => {
    openDetailsDrawer('sticker', sticker.id);
  }, [openDetailsDrawer]);

  if (processedStickers.length === 0) {
    return (
      <>
        <style>{`
          .sticker-list-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
          }

          .sticker-list-empty-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            color: rgba(255, 255, 255, 0.3);
            margin-bottom: 12px;
          }

          .sticker-list-empty-title {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 4px;
          }

          .sticker-list-empty-subtitle {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
          }
        `}</style>
        <div className="sticker-list-empty">
          <div className="sticker-list-empty-icon">
            <Image size={24} />
          </div>
          <div className="sticker-list-empty-title">No stickers found</div>
          <div className="sticker-list-empty-subtitle">
            Upload some stickers or adjust your filters
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .sticker-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-bottom: 20px;
        }

        .sticker-list-count {
          padding: 8px 12px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 8px;
        }

        .sticker-list-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 8px;
          padding: 0 2px;
        }

        .sticker-list-grid.compact {
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 6px;
        }

        .sticker-list-group {
          margin-bottom: 16px;
        }

        .sticker-list-group-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          margin-bottom: 8px;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s ease;
        }

        .sticker-list-group-header:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        .sticker-list-group-icon {
          font-size: 14px;
        }

        .sticker-list-group-name {
          flex: 1;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }

        .sticker-list-group-count {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 10px;
        }

        .sticker-list-group-chevron {
          color: rgba(255, 255, 255, 0.4);
          transition: transform 0.2s ease;
        }

        .sticker-list-group-header.collapsed .sticker-list-group-chevron {
          transform: rotate(-90deg);
        }
      `}</style>

      <div className="sticker-list-count">
        {processedStickers.length} sticker{processedStickers.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      <div className="sticker-list">
        {groupedStickers ? (
          Object.entries(groupedStickers).map(([group, stickers]) => {
            const isCollapsed = collapsedCategories.has(group);
            return (
              <div key={group} className="sticker-list-group">
                <div
                  className={`sticker-list-group-header ${isCollapsed ? 'collapsed' : ''}`}
                  onClick={() => toggleCategoryCollapse(group)}
                >
                  <span className="sticker-list-group-icon">📁</span>
                  <span className="sticker-list-group-name">{group}</span>
                  <span className="sticker-list-group-count">{stickers.length}</span>
                  {isCollapsed ? (
                    <ChevronRight size={14} className="sticker-list-group-chevron" />
                  ) : (
                    <ChevronDown size={14} className="sticker-list-group-chevron" />
                  )}
                </div>
                {!isCollapsed && (
                  <div className={`sticker-list-grid ${isCompact ? 'compact' : ''}`}>
                    {stickers.map((sticker) => (
                      <StickerListItem
                        key={sticker.id}
                        sticker={sticker}
                        onAdd={handleAddSticker}
                        onOpenDetails={handleOpenDetails}
                        isCompact={isCompact}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className={`sticker-list-grid ${isCompact ? 'compact' : ''}`}>
            {processedStickers.map((sticker) => (
              <StickerListItem
                key={sticker.id}
                sticker={sticker}
                onAdd={handleAddSticker}
                onOpenDetails={handleOpenDetails}
                isCompact={isCompact}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default StickerList;
