/**
 * CanvasResizeHandles
 * Resize handles for canvas resize mode
 */

import React from 'react';

export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface CanvasResizeHandlesProps {
  viewport: Viewport;
  canvasSize: { width: number; height: number };
  accentColor: string;
  onResizeStart: (handle: string, e: React.PointerEvent) => void;
  onResizeMove: (e: React.PointerEvent) => void;
  onResizeEnd: (e: React.PointerEvent) => void;
}

export const CanvasResizeHandles: React.FC<CanvasResizeHandlesProps> = ({
  viewport,
  canvasSize,
  accentColor,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}) => {
  return (
    <>
      {/* Corner handles */}
      {(['nw', 'ne', 'sw', 'se'] as const).map(handle => {
        const isTop = handle.includes('n');
        const isLeft = handle.includes('w');
        const cursor = handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize';

        return (
          <div
            key={handle}
            data-canvas-resize-handle={handle}
            style={{
              position: 'absolute',
              left: isLeft
                ? viewport.panX - 6
                : viewport.panX + canvasSize.width * viewport.zoom - 6,
              top: isTop
                ? viewport.panY - 6
                : viewport.panY + canvasSize.height * viewport.zoom - 6,
              width: 12,
              height: 12,
              background: accentColor,
              border: '2px solid #fff',
              borderRadius: 3,
              cursor,
              zIndex: 1000,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
            onPointerDown={(e) => onResizeStart(handle, e)}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onPointerCancel={onResizeEnd}
          />
        );
      })}

      {/* Edge handles */}
      {(['n', 'e', 's', 'w'] as const).map(handle => {
        const isHorizontal = handle === 'n' || handle === 's';
        const cursor = isHorizontal ? 'ns-resize' : 'ew-resize';

        const style: React.CSSProperties = {
          position: 'absolute',
          background: accentColor,
          border: '2px solid #fff',
          borderRadius: 3,
          cursor,
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        };

        if (handle === 'n') {
          style.left = viewport.panX + (canvasSize.width * viewport.zoom) / 2 - 20;
          style.top = viewport.panY - 5;
          style.width = 40;
          style.height = 10;
        } else if (handle === 's') {
          style.left = viewport.panX + (canvasSize.width * viewport.zoom) / 2 - 20;
          style.top = viewport.panY + canvasSize.height * viewport.zoom - 5;
          style.width = 40;
          style.height = 10;
        } else if (handle === 'w') {
          style.left = viewport.panX - 5;
          style.top = viewport.panY + (canvasSize.height * viewport.zoom) / 2 - 20;
          style.width = 10;
          style.height = 40;
        } else if (handle === 'e') {
          style.left = viewport.panX + canvasSize.width * viewport.zoom - 5;
          style.top = viewport.panY + (canvasSize.height * viewport.zoom) / 2 - 20;
          style.width = 10;
          style.height = 40;
        }

        return (
          <div
            key={handle}
            data-canvas-resize-handle={handle}
            style={style}
            onPointerDown={(e) => onResizeStart(handle, e)}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onPointerCancel={onResizeEnd}
          />
        );
      })}

      {/* Selection border around canvas */}
      <div
        style={{
          position: 'absolute',
          left: viewport.panX,
          top: viewport.panY,
          width: canvasSize.width * viewport.zoom,
          height: canvasSize.height * viewport.zoom,
          border: `2px dashed ${accentColor}`,
          borderRadius: 8,
          pointerEvents: 'none',
          zIndex: 999,
        }}
      />
    </>
  );
};
