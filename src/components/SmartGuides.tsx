/**
 * StickerNest v2 - Smart Guides Component
 * Shows alignment guides when dragging/resizing widgets
 */

import React, { useMemo } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';

interface SmartGuidesProps {
  /** ID of the widget being dragged/resized (excluded from guide calculation) */
  activeWidgetId?: string | null;
  /** IDs of widgets being dragged (for multi-select) */
  activeWidgetIds?: string[];
  /** Canvas bounds */
  canvasBounds?: { width: number; height: number };
  /** Snap threshold in pixels */
  snapThreshold?: number;
  /** Whether to show center guides */
  showCenterGuides?: boolean;
  /** Whether guides are enabled */
  enabled?: boolean;
}

interface Guide {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  source: 'widget' | 'canvas-center' | 'canvas-edge';
}

export const SmartGuides: React.FC<SmartGuidesProps> = ({
  activeWidgetId,
  activeWidgetIds = [],
  canvasBounds,
  snapThreshold = 5,
  showCenterGuides = true,
  enabled = true,
}) => {
  const widgets = useCanvasStore(state => state.getWidgets());
  const selection = useCanvasStore(state => state.selection);
  const grid = useCanvasStore(state => state.grid);

  // Calculate guides based on widget positions
  const guides = useMemo((): Guide[] => {
    if (!enabled) return [];

    const activeIds = activeWidgetIds.length > 0
      ? activeWidgetIds
      : activeWidgetId
        ? [activeWidgetId]
        : Array.from(selection.selectedIds);

    if (activeIds.length === 0) return [];

    const activeWidgets = widgets.filter(w => activeIds.includes(w.id));
    if (activeWidgets.length === 0) return [];

    // Calculate bounding box of active widgets
    const activeBounds = {
      left: Math.min(...activeWidgets.map(w => w.position.x)),
      right: Math.max(...activeWidgets.map(w => w.position.x + w.width)),
      top: Math.min(...activeWidgets.map(w => w.position.y)),
      bottom: Math.max(...activeWidgets.map(w => w.position.y + w.height)),
    };
    const activeCenterX = (activeBounds.left + activeBounds.right) / 2;
    const activeCenterY = (activeBounds.top + activeBounds.bottom) / 2;

    // Get other widgets (not active)
    const otherWidgets = widgets.filter(w => !activeIds.includes(w.id) && w.visible !== false);

    const resultGuides: Guide[] = [];

    // Check alignment with other widgets
    otherWidgets.forEach(widget => {
      const widgetCenterX = widget.position.x + widget.width / 2;
      const widgetCenterY = widget.position.y + widget.height / 2;
      const widgetRight = widget.position.x + widget.width;
      const widgetBottom = widget.position.y + widget.height;

      // Vertical guides (x-alignment)
      // Left edge alignment
      if (Math.abs(activeBounds.left - widget.position.x) < snapThreshold) {
        resultGuides.push({
          type: 'vertical',
          position: widget.position.x,
          start: Math.min(activeBounds.top, widget.position.y),
          end: Math.max(activeBounds.bottom, widgetBottom),
          source: 'widget',
        });
      }
      // Right edge alignment
      if (Math.abs(activeBounds.right - widgetRight) < snapThreshold) {
        resultGuides.push({
          type: 'vertical',
          position: widgetRight,
          start: Math.min(activeBounds.top, widget.position.y),
          end: Math.max(activeBounds.bottom, widgetBottom),
          source: 'widget',
        });
      }
      // Center alignment (x)
      if (showCenterGuides && Math.abs(activeCenterX - widgetCenterX) < snapThreshold) {
        resultGuides.push({
          type: 'vertical',
          position: widgetCenterX,
          start: Math.min(activeBounds.top, widget.position.y),
          end: Math.max(activeBounds.bottom, widgetBottom),
          source: 'widget',
        });
      }
      // Active left to widget right
      if (Math.abs(activeBounds.left - widgetRight) < snapThreshold) {
        resultGuides.push({
          type: 'vertical',
          position: widgetRight,
          start: Math.min(activeBounds.top, widget.position.y),
          end: Math.max(activeBounds.bottom, widgetBottom),
          source: 'widget',
        });
      }
      // Active right to widget left
      if (Math.abs(activeBounds.right - widget.position.x) < snapThreshold) {
        resultGuides.push({
          type: 'vertical',
          position: widget.position.x,
          start: Math.min(activeBounds.top, widget.position.y),
          end: Math.max(activeBounds.bottom, widgetBottom),
          source: 'widget',
        });
      }

      // Horizontal guides (y-alignment)
      // Top edge alignment
      if (Math.abs(activeBounds.top - widget.position.y) < snapThreshold) {
        resultGuides.push({
          type: 'horizontal',
          position: widget.position.y,
          start: Math.min(activeBounds.left, widget.position.x),
          end: Math.max(activeBounds.right, widgetRight),
          source: 'widget',
        });
      }
      // Bottom edge alignment
      if (Math.abs(activeBounds.bottom - widgetBottom) < snapThreshold) {
        resultGuides.push({
          type: 'horizontal',
          position: widgetBottom,
          start: Math.min(activeBounds.left, widget.position.x),
          end: Math.max(activeBounds.right, widgetRight),
          source: 'widget',
        });
      }
      // Center alignment (y)
      if (showCenterGuides && Math.abs(activeCenterY - widgetCenterY) < snapThreshold) {
        resultGuides.push({
          type: 'horizontal',
          position: widgetCenterY,
          start: Math.min(activeBounds.left, widget.position.x),
          end: Math.max(activeBounds.right, widgetRight),
          source: 'widget',
        });
      }
      // Active top to widget bottom
      if (Math.abs(activeBounds.top - widgetBottom) < snapThreshold) {
        resultGuides.push({
          type: 'horizontal',
          position: widgetBottom,
          start: Math.min(activeBounds.left, widget.position.x),
          end: Math.max(activeBounds.right, widgetRight),
          source: 'widget',
        });
      }
      // Active bottom to widget top
      if (Math.abs(activeBounds.bottom - widget.position.y) < snapThreshold) {
        resultGuides.push({
          type: 'horizontal',
          position: widget.position.y,
          start: Math.min(activeBounds.left, widget.position.x),
          end: Math.max(activeBounds.right, widgetRight),
          source: 'widget',
        });
      }
    });

    // Canvas center guides
    if (canvasBounds && showCenterGuides) {
      const canvasCenterX = canvasBounds.width / 2;
      const canvasCenterY = canvasBounds.height / 2;

      if (Math.abs(activeCenterX - canvasCenterX) < snapThreshold) {
        resultGuides.push({
          type: 'vertical',
          position: canvasCenterX,
          start: 0,
          end: canvasBounds.height,
          source: 'canvas-center',
        });
      }
      if (Math.abs(activeCenterY - canvasCenterY) < snapThreshold) {
        resultGuides.push({
          type: 'horizontal',
          position: canvasCenterY,
          start: 0,
          end: canvasBounds.width,
          source: 'canvas-center',
        });
      }
    }

    // Canvas edge guides
    if (canvasBounds) {
      // Left edge
      if (Math.abs(activeBounds.left) < snapThreshold) {
        resultGuides.push({
          type: 'vertical',
          position: 0,
          start: 0,
          end: canvasBounds.height,
          source: 'canvas-edge',
        });
      }
      // Right edge
      if (Math.abs(activeBounds.right - canvasBounds.width) < snapThreshold) {
        resultGuides.push({
          type: 'vertical',
          position: canvasBounds.width,
          start: 0,
          end: canvasBounds.height,
          source: 'canvas-edge',
        });
      }
      // Top edge
      if (Math.abs(activeBounds.top) < snapThreshold) {
        resultGuides.push({
          type: 'horizontal',
          position: 0,
          start: 0,
          end: canvasBounds.width,
          source: 'canvas-edge',
        });
      }
      // Bottom edge
      if (Math.abs(activeBounds.bottom - canvasBounds.height) < snapThreshold) {
        resultGuides.push({
          type: 'horizontal',
          position: canvasBounds.height,
          start: 0,
          end: canvasBounds.width,
          source: 'canvas-edge',
        });
      }
    }

    // Dedupe guides by position and type
    const uniqueGuides: Guide[] = [];
    resultGuides.forEach(guide => {
      const exists = uniqueGuides.some(
        g => g.type === guide.type && Math.abs(g.position - guide.position) < 1
      );
      if (!exists) {
        uniqueGuides.push(guide);
      }
    });

    return uniqueGuides;
  }, [widgets, activeWidgetId, activeWidgetIds, selection.selectedIds, canvasBounds, snapThreshold, showCenterGuides, enabled]);

  if (!enabled || guides.length === 0) return null;

  return (
    <div style={styles.container} data-smart-guides>
      {guides.map((guide, index) => {
        const isCenter = guide.source === 'canvas-center';
        const isEdge = guide.source === 'canvas-edge';

        if (guide.type === 'vertical') {
          return (
            <div
              key={`v-${index}`}
              style={{
                ...styles.guideLine,
                ...styles.verticalGuide,
                left: guide.position,
                top: guide.start,
                height: guide.end - guide.start,
                background: isCenter
                  ? 'var(--sn-accent-secondary, #6d28d9)'
                  : isEdge
                    ? 'var(--sn-accent-success, #10b981)'
                    : 'var(--sn-accent-primary, #8b5cf6)',
              }}
            />
          );
        }

        return (
          <div
            key={`h-${index}`}
            style={{
              ...styles.guideLine,
              ...styles.horizontalGuide,
              top: guide.position,
              left: guide.start,
              width: guide.end - guide.start,
              background: isCenter
                ? 'var(--sn-accent-secondary, #6d28d9)'
                : isEdge
                  ? 'var(--sn-accent-success, #10b981)'
                  : 'var(--sn-accent-primary, #8b5cf6)',
            }}
          />
        );
      })}
    </div>
  );
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1000,
  },
  guideLine: {
    position: 'absolute',
    pointerEvents: 'none',
  },
  verticalGuide: {
    width: 1,
    boxShadow: '0 0 2px rgba(139, 92, 246, 0.5)',
  },
  horizontalGuide: {
    height: 1,
    boxShadow: '0 0 2px rgba(139, 92, 246, 0.5)',
  },
};

// Helper function to get snap values based on guides
export function getSnapValues(
  activeIds: string[],
  widgets: Array<{ id: string; position: { x: number; y: number }; width: number; height: number }>,
  canvasBounds?: { width: number; height: number },
  snapThreshold = 5
): { snapX: number | null; snapY: number | null } {
  const activeWidgets = widgets.filter(w => activeIds.includes(w.id));
  if (activeWidgets.length === 0) return { snapX: null, snapY: null };

  const activeBounds = {
    left: Math.min(...activeWidgets.map(w => w.position.x)),
    right: Math.max(...activeWidgets.map(w => w.position.x + w.width)),
    top: Math.min(...activeWidgets.map(w => w.position.y)),
    bottom: Math.max(...activeWidgets.map(w => w.position.y + w.height)),
  };
  const activeCenterX = (activeBounds.left + activeBounds.right) / 2;
  const activeCenterY = (activeBounds.top + activeBounds.bottom) / 2;

  const otherWidgets = widgets.filter(w => !activeIds.includes(w.id));

  let snapX: number | null = null;
  let snapY: number | null = null;

  // Check alignment with other widgets
  otherWidgets.forEach(widget => {
    const widgetCenterX = widget.position.x + widget.width / 2;
    const widgetCenterY = widget.position.y + widget.height / 2;
    const widgetRight = widget.position.x + widget.width;
    const widgetBottom = widget.position.y + widget.height;

    // X snapping
    if (snapX === null) {
      if (Math.abs(activeBounds.left - widget.position.x) < snapThreshold) {
        snapX = widget.position.x - activeBounds.left;
      } else if (Math.abs(activeBounds.right - widgetRight) < snapThreshold) {
        snapX = widgetRight - activeBounds.right;
      } else if (Math.abs(activeCenterX - widgetCenterX) < snapThreshold) {
        snapX = widgetCenterX - activeCenterX;
      }
    }

    // Y snapping
    if (snapY === null) {
      if (Math.abs(activeBounds.top - widget.position.y) < snapThreshold) {
        snapY = widget.position.y - activeBounds.top;
      } else if (Math.abs(activeBounds.bottom - widgetBottom) < snapThreshold) {
        snapY = widgetBottom - activeBounds.bottom;
      } else if (Math.abs(activeCenterY - widgetCenterY) < snapThreshold) {
        snapY = widgetCenterY - activeCenterY;
      }
    }
  });

  // Canvas center snapping
  if (canvasBounds) {
    const canvasCenterX = canvasBounds.width / 2;
    const canvasCenterY = canvasBounds.height / 2;

    if (snapX === null && Math.abs(activeCenterX - canvasCenterX) < snapThreshold) {
      snapX = canvasCenterX - activeCenterX;
    }
    if (snapY === null && Math.abs(activeCenterY - canvasCenterY) < snapThreshold) {
      snapY = canvasCenterY - activeCenterY;
    }
  }

  return { snapX, snapY };
}

export default SmartGuides;
