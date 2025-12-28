/**
 * StickerNest v2 - Widget List
 * Virtualized list of widgets with grouping support
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { WidgetListItem } from './WidgetListItem';
import type { WidgetListItem as WidgetItemType } from '../../utils/libraryUtils';
import { useLibraryStore } from '../../state/useLibraryStore';
import {
  processWidgets,
  groupWidgetsByCategory,
  getCategoryDisplayName,
  getCategoryEmoji,
} from '../../utils/libraryUtils';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import type { RuntimeContext } from '../../runtime/RuntimeContext';

interface Props {
  widgets: WidgetItemType[];
  groupByCategory?: boolean;
  isCompact?: boolean;
  runtime?: RuntimeContext;
}

// Simple virtualization - render visible items only
const ITEM_HEIGHT = 72;
const COMPACT_ITEM_HEIGHT = 52;
const GROUP_HEADER_HEIGHT = 36;
const BUFFER_SIZE = 5;

export const WidgetList: React.FC<Props> = ({
  widgets,
  groupByCategory = true,
  isCompact = false,
  runtime,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const widgetSortMode = useLibraryStore((s) => s.widgetSortMode);
  const widgetFilters = useLibraryStore((s) => s.widgetFilters);
  const pipelineGroupFilter = useLibraryStore((s) => s.pipelineGroupFilter);
  const customWidgetTags = useLibraryStore((s) => s.customWidgetTags);
  const widgetUsage = useLibraryStore((s) => s.widgetUsage);
  const collapsedCategories = useLibraryStore((s) => s.collapsedCategories);
  const toggleCategoryCollapse = useLibraryStore((s) => s.toggleCategoryCollapse);
  const openDetailsDrawer = useLibraryStore((s) => s.openDetailsDrawer);

  // Process widgets with search, filter, sort
  const processedWidgets = useMemo(() => {
    return processWidgets(widgets, {
      searchQuery,
      sortMode: widgetSortMode,
      filters: widgetFilters,
      pipelineGroup: pipelineGroupFilter,
      customTags: customWidgetTags,
      usageMap: widgetUsage,
    });
  }, [widgets, searchQuery, widgetSortMode, widgetFilters, pipelineGroupFilter, customWidgetTags, widgetUsage]);

  // Group widgets if enabled
  const groupedWidgets = useMemo(() => {
    if (!groupByCategory || searchQuery) {
      return null;
    }
    return groupWidgetsByCategory(processedWidgets);
  }, [processedWidgets, groupByCategory, searchQuery]);

  // Calculate virtual list items
  const virtualItems = useMemo(() => {
    const items: { type: 'header' | 'widget'; data: any; height: number }[] = [];
    const itemHeight = isCompact ? COMPACT_ITEM_HEIGHT : ITEM_HEIGHT;

    if (groupedWidgets) {
      for (const [category, categoryWidgets] of Object.entries(groupedWidgets)) {
        items.push({
          type: 'header',
          data: { category, count: categoryWidgets.length },
          height: GROUP_HEADER_HEIGHT,
        });

        const isCollapsed = collapsedCategories.has(category);
        if (!isCollapsed) {
          for (const widget of categoryWidgets) {
            items.push({
              type: 'widget',
              data: widget,
              height: itemHeight,
            });
          }
        }
      }
    } else {
      for (const widget of processedWidgets) {
        items.push({
          type: 'widget',
          data: widget,
          height: itemHeight,
        });
      }
    }

    return items;
  }, [groupedWidgets, processedWidgets, collapsedCategories, isCompact]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return virtualItems.reduce((sum, item) => sum + item.height, 0);
  }, [virtualItems]);

  // Calculate visible items
  const visibleItems = useMemo(() => {
    let offset = 0;
    const visible: { item: typeof virtualItems[0]; offset: number; index: number }[] = [];

    for (let i = 0; i < virtualItems.length; i++) {
      const item = virtualItems[i];
      const itemEnd = offset + item.height;

      if (itemEnd >= scrollTop - BUFFER_SIZE * (isCompact ? COMPACT_ITEM_HEIGHT : ITEM_HEIGHT) &&
          offset <= scrollTop + containerHeight + BUFFER_SIZE * (isCompact ? COMPACT_ITEM_HEIGHT : ITEM_HEIGHT)) {
        visible.push({ item, offset, index: i });
      }

      offset = itemEnd;
    }

    return visible;
  }, [virtualItems, scrollTop, containerHeight, isCompact]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Update container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Add widget to canvas
  const handleAddWidget = useCallback((widget: WidgetItemType) => {
    if (runtime?.eventBus) {
      runtime.eventBus.emit({
        type: 'widget:add-request',
        scope: 'canvas',
        payload: {
          widgetDefId: widget.id,
          version: widget.manifest.version,
          source: widget.source,
        },
      });
    }
  }, [runtime]);

  // Open details drawer
  const handleOpenDetails = useCallback((widget: WidgetItemType) => {
    openDetailsDrawer('widget', widget.id);
  }, [openDetailsDrawer]);

  if (processedWidgets.length === 0) {
    return (
      <>
        <style>{`
          .widget-list-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
          }

          .widget-list-empty-icon {
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

          .widget-list-empty-title {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 4px;
          }

          .widget-list-empty-subtitle {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
          }
        `}</style>
        <div className="widget-list-empty">
          <div className="widget-list-empty-icon">
            <Package size={24} />
          </div>
          <div className="widget-list-empty-title">No widgets found</div>
          <div className="widget-list-empty-subtitle">
            Try adjusting your search or filters
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .widget-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .widget-list-inner {
          position: relative;
        }

        .widget-list-item-wrapper {
          position: absolute;
          left: 0;
          right: 0;
          padding: 0 2px;
        }

        .widget-list-group-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          margin-bottom: 4px;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s ease;
        }

        .widget-list-group-header:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        .widget-list-group-icon {
          font-size: 14px;
        }

        .widget-list-group-name {
          flex: 1;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }

        .widget-list-group-count {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 10px;
        }

        .widget-list-group-chevron {
          color: rgba(255, 255, 255, 0.4);
          transition: transform 0.2s ease;
        }

        .widget-list-group-header.collapsed .widget-list-group-chevron {
          transform: rotate(-90deg);
        }

        .widget-list-count {
          padding: 8px 12px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 8px;
        }
      `}</style>

      <div className="widget-list-count">
        {processedWidgets.length} widget{processedWidgets.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      <div
        ref={containerRef}
        className="widget-list"
        onScroll={handleScroll}
      >
        <div className="widget-list-inner" style={{ height: totalHeight }}>
          {visibleItems.map(({ item, offset, index }) => (
            <div
              key={index}
              className="widget-list-item-wrapper"
              style={{
                top: offset,
                height: item.height,
              }}
            >
              {item.type === 'header' ? (
                <div
                  className={`widget-list-group-header ${
                    collapsedCategories.has(item.data.category) ? 'collapsed' : ''
                  }`}
                  onClick={() => toggleCategoryCollapse(item.data.category)}
                >
                  <span className="widget-list-group-icon">
                    {getCategoryEmoji(item.data.category)}
                  </span>
                  <span className="widget-list-group-name">
                    {getCategoryDisplayName(item.data.category)}
                  </span>
                  <span className="widget-list-group-count">{item.data.count}</span>
                  {collapsedCategories.has(item.data.category) ? (
                    <ChevronRight size={14} className="widget-list-group-chevron" />
                  ) : (
                    <ChevronDown size={14} className="widget-list-group-chevron" />
                  )}
                </div>
              ) : (
                <WidgetListItem
                  widget={item.data}
                  onAdd={handleAddWidget}
                  onOpenDetails={handleOpenDetails}
                  isCompact={isCompact}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default WidgetList;
