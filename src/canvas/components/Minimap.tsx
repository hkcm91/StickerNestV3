/**
 * StickerNest v2 - Minimap Navigator
 *
 * Shows a small overview of the canvas with current viewport indicator.
 * Allows clicking to navigate to different areas of the canvas.
 */

import React, { memo, useCallback, useRef } from 'react';
import { haptic } from '../../utils/haptics';
import type { WidgetInstance } from '../../types/domain';

interface MinimapProps {
  canvasWidth: number;
  canvasHeight: number;
  viewportZoom: number;
  viewportPanX: number;
  viewportPanY: number;
  containerWidth: number;
  containerHeight: number;
  widgets: WidgetInstance[];
  onNavigate: (panX: number, panY: number) => void;
  accentColor: string;
  minimapSize?: number;
}

export const Minimap = memo(function Minimap({
  canvasWidth,
  canvasHeight,
  viewportZoom,
  viewportPanX,
  viewportPanY,
  containerWidth,
  containerHeight,
  widgets,
  onNavigate,
  accentColor,
  minimapSize = 150,
}: MinimapProps) {
  const minimapRef = useRef<HTMLDivElement>(null);

  // Calculate scale to fit canvas in minimap
  const scale = Math.min(
    minimapSize / canvasWidth,
    minimapSize / canvasHeight
  );

  const minimapWidth = canvasWidth * scale;
  const minimapHeight = canvasHeight * scale;

  // Calculate viewport rectangle in minimap coordinates
  const visibleWidth = containerWidth / viewportZoom;
  const visibleHeight = containerHeight / viewportZoom;
  const visibleX = -viewportPanX / viewportZoom;
  const visibleY = -viewportPanY / viewportZoom;

  const viewportRect = {
    x: visibleX * scale,
    y: visibleY * scale,
    width: visibleWidth * scale,
    height: visibleHeight * scale,
  };

  // Handle click on minimap to navigate
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = minimapRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Get click position relative to minimap
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert to canvas coordinates
      const canvasX = clickX / scale;
      const canvasY = clickY / scale;

      // Calculate new pan to center the clicked point
      const newPanX = containerWidth / 2 - canvasX * viewportZoom;
      const newPanY = containerHeight / 2 - canvasY * viewportZoom;

      haptic('light');
      onNavigate(newPanX, newPanY);
    },
    [scale, viewportZoom, containerWidth, containerHeight, onNavigate]
  );

  return (
    <div
      ref={minimapRef}
      onClick={handleClick}
      style={{
        width: minimapWidth,
        height: minimapHeight,
        background: 'rgba(15, 15, 25, 0.95)',
        borderRadius: 8,
        border: `1px solid ${accentColor}33`,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        backdropFilter: 'blur(8px)',
      }}
      role="navigation"
      aria-label="Canvas minimap"
    >
      {/* Canvas background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26, 26, 46, 0.5)',
          borderRadius: 6,
        }}
      />

      {/* Widget indicators */}
      {widgets.map((widget) => {
        if (widget.visible === false) return null;

        const x = widget.position.x * scale;
        const y = widget.position.y * scale;
        const w = widget.width * scale;
        const h = widget.height * scale;

        // Skip if too small to see
        if (w < 2 && h < 2) return null;

        return (
          <div
            key={widget.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: Math.max(2, w),
              height: Math.max(2, h),
              background: `${accentColor}66`,
              borderRadius: 1,
            }}
          />
        );
      })}

      {/* Viewport indicator */}
      <div
        style={{
          position: 'absolute',
          left: Math.max(0, viewportRect.x),
          top: Math.max(0, viewportRect.y),
          width: Math.min(minimapWidth - viewportRect.x, viewportRect.width),
          height: Math.min(minimapHeight - viewportRect.y, viewportRect.height),
          border: `2px solid ${accentColor}`,
          borderRadius: 2,
          background: `${accentColor}11`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
});

export default Minimap;
