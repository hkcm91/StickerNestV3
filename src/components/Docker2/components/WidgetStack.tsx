/**
 * Docker 2.0 Widget Stack
 * Manages and displays multiple widgets with different layouts
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { WidgetStackProps, StackedWidget, LayoutMode } from '../Docker2.types';
import type { WidgetInstance } from '../../../types/domain';
import { getTheme, getWidgetCardStyle, getIconButtonStyle } from '../Docker2Theme';
import { BetweenIndicator } from './DropIndicator';

// ==================
// Widget Card Component
// ==================

interface WidgetCardProps {
  stackedWidget: StackedWidget;
  widget: WidgetInstance | undefined;
  index: number;
  totalWidgets: number;
  layout: WidgetStackProps['layout'];
  containerSize: { width: number; height: number };
  editMode: boolean;
  themeMode: 'light' | 'dark';
  renderWidget: WidgetStackProps['renderWidget'];
  onMinimize: () => void;
  onMaximize: () => void;
  onRemove: () => void;
  onResize: (newSizePercent: number) => void;
  onSettings?: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragTarget: boolean;
  isBeingDragged: boolean;
}

const WidgetCard: React.FC<WidgetCardProps> = ({
  stackedWidget,
  widget,
  index,
  totalWidgets,
  layout,
  containerSize,
  editMode,
  themeMode,
  renderWidget,
  onMinimize,
  onMaximize,
  onRemove,
  onResize,
  onSettings,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragTarget,
  isBeingDragged,
}) => {
  const theme = useMemo(() => getTheme(themeMode), [themeMode]);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ y: number; percent: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate size based on layout
  const cardSize = useMemo(() => {
    const { minimized, maximized, sizePercent } = stackedWidget;
    const { gap, padding } = layout;

    if (maximized) {
      return {
        width: containerSize.width,
        height: containerSize.height,
      };
    }

    if (minimized) {
      return {
        width: layout.mode === 'horizontal' ? 40 : containerSize.width,
        height: layout.mode === 'vertical' ? 40 : containerSize.height,
      };
    }

    // Calculate based on layout mode
    switch (layout.mode) {
      case 'vertical': {
        const availableHeight = containerSize.height - (gap * (totalWidgets - 1));
        return {
          width: containerSize.width,
          height: Math.max(80, (availableHeight * sizePercent) / 100),
        };
      }
      case 'horizontal': {
        const availableWidth = containerSize.width - (gap * (totalWidgets - 1));
        return {
          width: Math.max(80, (availableWidth * sizePercent) / 100),
          height: containerSize.height,
        };
      }
      case 'grid': {
        const columns = layout.grid?.columns ?? 2;
        const rows = Math.ceil(totalWidgets / columns);
        const itemWidth = (containerSize.width - (gap * (columns - 1))) / columns;
        const itemHeight = (containerSize.height - (gap * (rows - 1))) / rows;
        return {
          width: itemWidth,
          height: itemHeight,
        };
      }
      case 'tabbed':
      default:
        return {
          width: containerSize.width,
          height: containerSize.height,
        };
    }
  }, [stackedWidget, layout, containerSize, totalWidgets]);

  const cardStyle: React.CSSProperties = useMemo(() => ({
    ...getWidgetCardStyle(theme, stackedWidget.minimized, stackedWidget.maximized),
    width: cardSize.width,
    height: cardSize.height,
    opacity: isBeingDragged ? 0.5 : 1,
    transform: isDragTarget ? 'scale(1.02)' : 'scale(1)',
    boxShadow: isDragTarget
      ? `0 0 0 2px ${theme.colors.accent}, 0 8px 24px ${theme.colors.shadowColor}`
      : undefined,
    cursor: editMode ? 'grab' : 'default',
    transition: `transform ${theme.transitions.fast}, opacity ${theme.transitions.fast}, box-shadow ${theme.transitions.fast}`,
  }), [theme, stackedWidget, cardSize, isBeingDragged, isDragTarget, editMode]);

  const widgetTitle = widget?.name || stackedWidget.customTitle || 'Widget';

  // Resize handlers
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    if (!editMode || stackedWidget.minimized || stackedWidget.maximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      y: e.clientY,
      percent: stackedWidget.sizePercent,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [editMode, stackedWidget.minimized, stackedWidget.maximized, stackedWidget.sizePercent]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing || !resizeStartRef.current) return;
    e.preventDefault();

    const dy = e.clientY - resizeStartRef.current.y;
    const containerHeight = containerSize.height;
    const percentDelta = (dy / containerHeight) * 100;
    const newPercent = Math.max(10, Math.min(90, resizeStartRef.current.percent + percentDelta));

    onResize(newPercent);
  }, [isResizing, containerSize.height, onResize]);

  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;
    setIsResizing(false);
    resizeStartRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [isResizing]);

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      draggable={editMode && !isResizing}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-widget-id={stackedWidget.widgetId}
    >
      {/* Widget Header (always visible in edit mode or when minimized) */}
      {(editMode || stackedWidget.minimized || isHovered) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            background: theme.colors.bgGlass,
            borderBottom: stackedWidget.minimized ? 'none' : `1px solid ${theme.colors.borderSecondary}`,
            minHeight: 32,
            gap: 6,
          }}
        >
          {/* Drag handle + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            {editMode && (
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.colors.textMuted}
                strokeWidth="2"
                style={{ flexShrink: 0, cursor: 'grab' }}
              >
                <circle cx="9" cy="5" r="1" fill="currentColor" />
                <circle cx="9" cy="12" r="1" fill="currentColor" />
                <circle cx="9" cy="19" r="1" fill="currentColor" />
                <circle cx="15" cy="5" r="1" fill="currentColor" />
                <circle cx="15" cy="12" r="1" fill="currentColor" />
                <circle cx="15" cy="19" r="1" fill="currentColor" />
              </svg>
            )}
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: theme.colors.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {widgetTitle}
            </span>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Minimize */}
            <button
              onClick={onMinimize}
              style={{
                ...getIconButtonStyle(theme),
                width: 22,
                height: 22,
              }}
              title={stackedWidget.minimized ? 'Restore' : 'Minimize'}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {stackedWidget.minimized ? (
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                ) : (
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                )}
              </svg>
            </button>

            {/* Maximize */}
            <button
              onClick={onMaximize}
              style={{
                ...getIconButtonStyle(theme),
                width: 22,
                height: 22,
                color: stackedWidget.maximized ? theme.colors.accent : theme.colors.textSecondary,
              }}
              title={stackedWidget.maximized ? 'Restore' : 'Maximize'}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {stackedWidget.maximized ? (
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                ) : (
                  <polyline points="15 3 21 3 21 9" />
                )}
                {!stackedWidget.maximized && <polyline points="9 21 3 21 3 15" />}
                {!stackedWidget.maximized && <line x1="21" y1="3" x2="14" y2="10" />}
                {!stackedWidget.maximized && <line x1="3" y1="21" x2="10" y2="14" />}
              </svg>
            </button>

            {/* Settings (if callback provided) */}
            {onSettings && (
              <button
                onClick={onSettings}
                style={{
                  ...getIconButtonStyle(theme),
                  width: 22,
                  height: 22,
                }}
                title="Widget settings"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}

            {/* Remove */}
            {editMode && (
              <button
                onClick={onRemove}
                style={{
                  ...getIconButtonStyle(theme),
                  width: 22,
                  height: 22,
                  color: theme.colors.error,
                }}
                title="Remove from docker"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Widget Content */}
      {!stackedWidget.minimized && widget && (
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* The header is 32px minHeight + 12px padding + 1px border = ~45px when visible */}
          {renderWidget(widget, {
            width: Math.max(50, cardSize.width - 2), // Account for borders
            height: Math.max(50, cardSize.height - (editMode || stackedWidget.minimized || isHovered ? 46 : 2)),
          })}
        </div>
      )}

      {/* Resize handle (only in edit mode and vertical/horizontal layouts) */}
      {editMode && !stackedWidget.minimized && !stackedWidget.maximized &&
       (layout.mode === 'vertical' || layout.mode === 'horizontal') && (
        <div
          style={{
            position: 'absolute',
            bottom: layout.mode === 'vertical' ? 0 : undefined,
            right: layout.mode === 'horizontal' ? 0 : undefined,
            left: layout.mode === 'vertical' ? 0 : undefined,
            top: layout.mode === 'horizontal' ? 0 : undefined,
            width: layout.mode === 'vertical' ? '100%' : 8,
            height: layout.mode === 'vertical' ? 8 : '100%',
            cursor: layout.mode === 'vertical' ? 'ns-resize' : 'ew-resize',
            background: isResizing
              ? theme.colors.accent
              : 'transparent',
            transition: `background ${theme.transitions.fast}`,
            zIndex: 10,
          }}
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${theme.colors.accentMuted}`;
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {/* Resize grip lines */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: layout.mode === 'vertical' ? 'row' : 'column',
              gap: 2,
              opacity: 0.6,
            }}
          >
            <div style={{ width: layout.mode === 'vertical' ? 20 : 2, height: layout.mode === 'vertical' ? 2 : 20, background: theme.colors.textMuted, borderRadius: 1 }} />
            <div style={{ width: layout.mode === 'vertical' ? 20 : 2, height: layout.mode === 'vertical' ? 2 : 20, background: theme.colors.textMuted, borderRadius: 1 }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ==================
// Main Widget Stack Component
// ==================

export const WidgetStack: React.FC<WidgetStackProps> = ({
  widgets: stackedWidgets,
  allWidgets,
  layout,
  containerSize,
  editMode,
  themeMode,
  renderWidget,
  onReorder,
  onResize,
  onMinimize,
  onMaximize,
  onRemove,
  onSettings,
}) => {
  const theme = useMemo(() => getTheme(themeMode), [themeMode]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Filter visible widgets based on layout mode
  const visibleWidgets = useMemo(() => {
    // In tabbed mode, only show one widget at a time (handled elsewhere)
    // Otherwise show all non-maximized, or only the maximized one
    const maximized = stackedWidgets.find((w) => w.maximized);
    if (maximized) {
      return [maximized];
    }
    return stackedWidgets;
  }, [stackedWidgets]);

  // Get actual widget instances
  const getWidgetInstance = useCallback(
    (widgetId: string): WidgetInstance | undefined => {
      return allWidgets.find((w) => w.id === widgetId);
    },
    [allWidgets]
  );

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/widget-index', index.toString());
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      onReorder(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, onReorder]);

  // Container style based on layout
  const containerStyle: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {
      display: 'flex',
      gap: layout.gap,
      width: '100%',
      height: '100%',
      overflow: 'auto',
    };

    switch (layout.mode) {
      case 'vertical':
        return { ...base, flexDirection: 'column' };
      case 'horizontal':
        return { ...base, flexDirection: 'row' };
      case 'grid':
        return {
          ...base,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
        };
      case 'tabbed':
        return { ...base, flexDirection: 'column' };
      default:
        return base;
    }
  }, [layout]);

  return (
    <div ref={containerRef} style={containerStyle}>
      {visibleWidgets.map((stackedWidget, index) => {
        const widget = getWidgetInstance(stackedWidget.widgetId);
        const isBeingDragged = dragIndex === index;
        const isDragTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

        return (
          <React.Fragment key={stackedWidget.widgetId}>
            {/* Between indicator */}
            {editMode && index > 0 && (
              <BetweenIndicator
                index={index}
                active={dragOverIndex === index && dragIndex !== null}
                themeMode={themeMode}
                orientation={layout.mode === 'horizontal' ? 'horizontal' : 'vertical'}
              />
            )}

            <WidgetCard
              stackedWidget={stackedWidget}
              widget={widget}
              index={index}
              totalWidgets={visibleWidgets.length}
              layout={layout}
              containerSize={containerSize}
              editMode={editMode}
              themeMode={themeMode}
              renderWidget={renderWidget}
              onMinimize={() => onMinimize(stackedWidget.widgetId)}
              onMaximize={() => onMaximize(stackedWidget.widgetId)}
              onRemove={() => onRemove(stackedWidget.widgetId)}
              onResize={(newSizePercent) => onResize(stackedWidget.widgetId, newSizePercent)}
              onSettings={onSettings ? () => onSettings(stackedWidget.widgetId) : undefined}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              isDragTarget={isDragTarget}
              isBeingDragged={isBeingDragged}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WidgetStack;
