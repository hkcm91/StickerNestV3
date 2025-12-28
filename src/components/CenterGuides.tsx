/**
 * StickerNest v2 - Center Guides
 * Visual guide lines that appear when dragging widgets near center alignment
 * Helps with precise positioning
 */

import React, { useMemo } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';

interface CenterGuidesProps {
  /** Canvas width */
  canvasWidth: number;
  /** Canvas height */
  canvasHeight: number;
  /** Threshold for snapping (in pixels) */
  snapThreshold?: number;
  /** Guide line color */
  guideColor?: string;
}

interface GuideLineState {
  showHorizontalCenter: boolean;
  showVerticalCenter: boolean;
  showWidgetAlignH: boolean;
  showWidgetAlignV: boolean;
  alignedWidgetId?: string;
  widgetAlignX?: number;
  widgetAlignY?: number;
}

export const CenterGuides: React.FC<CenterGuidesProps> = ({
  canvasWidth,
  canvasHeight,
  snapThreshold = 10,
  guideColor = 'rgba(74, 158, 255, 0.6)',
}) => {
  // Use primitive selectors to avoid reference changes causing re-renders
  const selectedIdsSize = useCanvasStore(state => state.selection.selectedIds.size);
  const primaryId = useCanvasStore(state => state.selection.primaryId);
  const snapToCenter = useCanvasStore(state => state.grid.snapToCenter);
  const showCenterGuides = useCanvasStore(state => state.grid.showCenterGuides);
  const mode = useCanvasStore(state => state.mode);

  // Calculate guide line positions - use getState() inside to avoid Map/Set deps
  const guides = useMemo((): GuideLineState => {
    const result: GuideLineState = {
      showHorizontalCenter: false,
      showVerticalCenter: false,
      showWidgetAlignH: false,
      showWidgetAlignV: false,
    };

    // Only show in edit mode with snap enabled
    if (mode !== 'edit' || !snapToCenter) {
      return result;
    }

    // Only show when dragging (one widget selected and being moved)
    if (selectedIdsSize !== 1) {
      return result;
    }

    // Get current widgets from store at calculation time (avoids Map reference dep)
    const storeState = useCanvasStore.getState();
    const widgets = storeState.widgets;
    const selection = storeState.selection;

    const selectedId = Array.from(selection.selectedIds)[0];
    const selectedWidget = widgets.get(selectedId);
    if (!selectedWidget) {
      return result;
    }

    const widgetCenterX = selectedWidget.position.x + selectedWidget.width / 2;
    const widgetCenterY = selectedWidget.position.y + selectedWidget.height / 2;
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    // Check canvas center alignment
    if (Math.abs(widgetCenterX - canvasCenterX) < snapThreshold) {
      result.showVerticalCenter = true;
    }
    if (Math.abs(widgetCenterY - canvasCenterY) < snapThreshold) {
      result.showHorizontalCenter = true;
    }

    // Check alignment with other widgets
    for (const [id, widget] of widgets.entries()) {
      if (id === selectedId) continue;

      const otherCenterX = widget.position.x + widget.width / 2;
      const otherCenterY = widget.position.y + widget.height / 2;

      // Vertical alignment (same X center)
      if (Math.abs(widgetCenterX - otherCenterX) < snapThreshold) {
        result.showWidgetAlignV = true;
        result.widgetAlignX = otherCenterX;
        result.alignedWidgetId = id;
      }

      // Horizontal alignment (same Y center)
      if (Math.abs(widgetCenterY - otherCenterY) < snapThreshold) {
        result.showWidgetAlignH = true;
        result.widgetAlignY = otherCenterY;
        result.alignedWidgetId = id;
      }

      // Edge alignments
      // Left edge
      if (Math.abs(selectedWidget.position.x - widget.position.x) < snapThreshold) {
        result.showWidgetAlignV = true;
        result.widgetAlignX = widget.position.x;
      }
      // Right edge
      if (Math.abs(selectedWidget.position.x + selectedWidget.width - (widget.position.x + widget.width)) < snapThreshold) {
        result.showWidgetAlignV = true;
        result.widgetAlignX = widget.position.x + widget.width;
      }
      // Top edge
      if (Math.abs(selectedWidget.position.y - widget.position.y) < snapThreshold) {
        result.showWidgetAlignH = true;
        result.widgetAlignY = widget.position.y;
      }
      // Bottom edge
      if (Math.abs(selectedWidget.position.y + selectedWidget.height - (widget.position.y + widget.height)) < snapThreshold) {
        result.showWidgetAlignH = true;
        result.widgetAlignY = widget.position.y + widget.height;
      }
    }

    return result;
  }, [selectedIdsSize, primaryId, canvasWidth, canvasHeight, snapThreshold, mode, snapToCenter]);

  // Don't render if not in edit mode or no guides to show
  if (mode !== 'edit' || !showCenterGuides) {
    return null;
  }

  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    background: guideColor,
    pointerEvents: 'none',
    zIndex: 9998,
  };

  const dashedStyle: React.CSSProperties = {
    ...lineStyle,
    backgroundImage: `repeating-linear-gradient(90deg, ${guideColor}, ${guideColor} 4px, transparent 4px, transparent 8px)`,
  };

  return (
    <>
      {/* Canvas vertical center line */}
      {guides.showVerticalCenter && (
        <div
          style={{
            ...lineStyle,
            left: canvasWidth / 2,
            top: 0,
            width: 1,
            height: canvasHeight,
          }}
        />
      )}

      {/* Canvas horizontal center line */}
      {guides.showHorizontalCenter && (
        <div
          style={{
            ...lineStyle,
            left: 0,
            top: canvasHeight / 2,
            width: canvasWidth,
            height: 1,
          }}
        />
      )}

      {/* Widget vertical alignment line */}
      {guides.showWidgetAlignV && guides.widgetAlignX !== undefined && (
        <div
          style={{
            ...dashedStyle,
            left: guides.widgetAlignX,
            top: 0,
            width: 1,
            height: canvasHeight,
            background: 'none',
            borderLeft: `1px dashed ${guideColor}`,
          }}
        />
      )}

      {/* Widget horizontal alignment line */}
      {guides.showWidgetAlignH && guides.widgetAlignY !== undefined && (
        <div
          style={{
            ...dashedStyle,
            left: 0,
            top: guides.widgetAlignY,
            width: canvasWidth,
            height: 1,
            background: 'none',
            borderTop: `1px dashed ${guideColor}`,
          }}
        />
      )}
    </>
  );
};

export default CenterGuides;

