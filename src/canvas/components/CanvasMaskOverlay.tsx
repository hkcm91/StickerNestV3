/**
 * CanvasMaskOverlay
 * Renders an overlay that covers everything outside the canvas bounds,
 * effectively masking/hiding content that extends beyond the canvas.
 */

import React, { useMemo } from 'react';
import { useMaskSettings } from '../../state/useCanvasAppearanceStore';

export interface CanvasMaskOverlayProps {
  /** Canvas position and zoom */
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
  /** Canvas dimensions */
  canvasSize: {
    width: number;
    height: number;
  };
  /** Border radius from canvas settings */
  borderRadius?: number;
}

export const CanvasMaskOverlay: React.FC<CanvasMaskOverlayProps> = ({
  viewport,
  canvasSize,
  borderRadius = 16,
}) => {
  const mask = useMaskSettings();

  // Calculate the canvas rectangle in screen coordinates
  // Must be called before any conditional returns to satisfy React hooks rules
  const canvasRect = useMemo(() => {
    const x = viewport.panX;
    const y = viewport.panY;
    const width = canvasSize.width * viewport.zoom;
    const height = canvasSize.height * viewport.zoom;
    return { x, y, width, height };
  }, [viewport.panX, viewport.panY, viewport.zoom, canvasSize.width, canvasSize.height]);

  // Don't render if mask is disabled
  if (!mask.enabled) return null;

  // Common overlay styles
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: mask.color,
    opacity: mask.opacity / 100,
    pointerEvents: 'none',
    zIndex: 50, // Above widgets but below controls
    transition: 'opacity 0.3s ease',
  };

  // Apply blur effect to edges if enabled
  const edgeBlurStyle = mask.blur > 0 ? {
    filter: `blur(${mask.blur}px)`,
  } : {};

  return (
    <>
      {/* Top overlay - covers from top of container to top of canvas */}
      <div
        data-mask-overlay="top"
        style={{
          ...overlayStyle,
          top: 0,
          left: 0,
          right: 0,
          height: Math.max(0, canvasRect.y),
          ...edgeBlurStyle,
        }}
      />

      {/* Bottom overlay - covers from bottom of canvas to bottom of container */}
      <div
        data-mask-overlay="bottom"
        style={{
          ...overlayStyle,
          top: canvasRect.y + canvasRect.height,
          left: 0,
          right: 0,
          bottom: 0,
          ...edgeBlurStyle,
        }}
      />

      {/* Left overlay - covers from left of container to left of canvas */}
      <div
        data-mask-overlay="left"
        style={{
          ...overlayStyle,
          top: canvasRect.y,
          left: 0,
          width: Math.max(0, canvasRect.x),
          height: canvasRect.height,
          ...edgeBlurStyle,
        }}
      />

      {/* Right overlay - covers from right of canvas to right of container */}
      <div
        data-mask-overlay="right"
        style={{
          ...overlayStyle,
          top: canvasRect.y,
          left: canvasRect.x + canvasRect.width,
          right: 0,
          height: canvasRect.height,
          ...edgeBlurStyle,
        }}
      />

      {/* Corner overlays with matching border radius (inverted corners) */}
      {borderRadius > 0 && (
        <>
          {/* Top-left corner */}
          <svg
            data-mask-overlay="corner-tl"
            style={{
              position: 'absolute',
              left: canvasRect.x,
              top: canvasRect.y,
              width: borderRadius,
              height: borderRadius,
              pointerEvents: 'none',
              zIndex: 51,
              overflow: 'visible',
            }}
          >
            <path
              d={`M 0 0 L ${borderRadius} 0 L ${borderRadius} ${borderRadius} A ${borderRadius} ${borderRadius} 0 0 0 0 ${borderRadius} Z`}
              fill={mask.color}
              fillOpacity={mask.opacity / 100}
            />
          </svg>

          {/* Top-right corner */}
          <svg
            data-mask-overlay="corner-tr"
            style={{
              position: 'absolute',
              left: canvasRect.x + canvasRect.width - borderRadius,
              top: canvasRect.y,
              width: borderRadius,
              height: borderRadius,
              pointerEvents: 'none',
              zIndex: 51,
              overflow: 'visible',
            }}
          >
            <path
              d={`M 0 0 L ${borderRadius} 0 L ${borderRadius} ${borderRadius} L 0 ${borderRadius} A ${borderRadius} ${borderRadius} 0 0 1 0 0 Z`}
              fill={mask.color}
              fillOpacity={mask.opacity / 100}
            />
          </svg>

          {/* Bottom-left corner */}
          <svg
            data-mask-overlay="corner-bl"
            style={{
              position: 'absolute',
              left: canvasRect.x,
              top: canvasRect.y + canvasRect.height - borderRadius,
              width: borderRadius,
              height: borderRadius,
              pointerEvents: 'none',
              zIndex: 51,
              overflow: 'visible',
            }}
          >
            <path
              d={`M 0 0 L ${borderRadius} 0 A ${borderRadius} ${borderRadius} 0 0 0 ${borderRadius} ${borderRadius} L 0 ${borderRadius} Z`}
              fill={mask.color}
              fillOpacity={mask.opacity / 100}
            />
          </svg>

          {/* Bottom-right corner */}
          <svg
            data-mask-overlay="corner-br"
            style={{
              position: 'absolute',
              left: canvasRect.x + canvasRect.width - borderRadius,
              top: canvasRect.y + canvasRect.height - borderRadius,
              width: borderRadius,
              height: borderRadius,
              pointerEvents: 'none',
              zIndex: 51,
              overflow: 'visible',
            }}
          >
            <path
              d={`M 0 0 A ${borderRadius} ${borderRadius} 0 0 1 ${borderRadius} 0 L ${borderRadius} ${borderRadius} L 0 ${borderRadius} Z`}
              fill={mask.color}
              fillOpacity={mask.opacity / 100}
            />
          </svg>
        </>
      )}
    </>
  );
};

export default CanvasMaskOverlay;
