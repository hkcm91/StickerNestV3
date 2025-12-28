/**
 * StickerNest v2 - Canvas Minimap
 * A small overview showing the entire canvas with viewport indicator
 * Allows click/drag navigation
 */

import React, { useRef, useCallback, useState, useMemo } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';
import type { WidgetInstance } from '../types/domain';

interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

interface CanvasMinimapProps {
  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;
  /** Container dimensions (viewport) */
  containerWidth: number;
  containerHeight: number;
  /** Widgets to show on minimap */
  widgets: WidgetInstance[];
  /** Position of minimap */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Optional external viewport state (if not using useCanvasStore) */
  viewport?: ViewportState;
  /** Optional external pan function (if not using useCanvasStore) */
  onPan?: (panX: number, panY: number) => void;
}

const MINIMAP_MAX_WIDTH = 200;
const MINIMAP_MAX_HEIGHT = 150;
const MINIMAP_PADDING = 16;

export const CanvasMinimap: React.FC<CanvasMinimapProps> = ({
  canvasWidth,
  canvasHeight,
  containerWidth,
  containerHeight,
  widgets,
  position = 'bottom-right',
  viewport: externalViewport,
  onPan,
}) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Get viewport and pan function from store (fallback if not provided externally)
  const storeViewport = useCanvasStore(state => state.viewport);
  const setStoreViewport = useCanvasStore(state => state.setViewport);

  // Use external viewport if provided, otherwise use store
  const viewport = externalViewport || storeViewport;
  const setViewport = onPan
    ? (v: Partial<ViewportState>) => onPan(v.panX ?? viewport.panX, v.panY ?? viewport.panY)
    : setStoreViewport;

  // Calculate minimap scale to fit canvas within max dimensions
  const minimapScale = useMemo(() => {
    const scaleX = MINIMAP_MAX_WIDTH / canvasWidth;
    const scaleY = MINIMAP_MAX_HEIGHT / canvasHeight;
    return Math.min(scaleX, scaleY, 0.15); // Cap at 15% scale
  }, [canvasWidth, canvasHeight]);

  const minimapWidth = canvasWidth * minimapScale;
  const minimapHeight = canvasHeight * minimapScale;

  // Calculate viewport rectangle on minimap
  const viewportRect = useMemo(() => {
    // The visible area in canvas coordinates
    const visibleWidth = containerWidth / viewport.zoom;
    const visibleHeight = containerHeight / viewport.zoom;

    // Position in canvas coordinates (accounting for pan)
    const x = -viewport.panX / viewport.zoom;
    const y = -viewport.panY / viewport.zoom;

    return {
      x: x * minimapScale,
      y: y * minimapScale,
      width: visibleWidth * minimapScale,
      height: visibleHeight * minimapScale,
    };
  }, [viewport, containerWidth, containerHeight, minimapScale]);

  // Convert minimap click to canvas pan position
  const handleMinimapClick = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    if (!minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click position to canvas coordinates
    const canvasX = clickX / minimapScale;
    const canvasY = clickY / minimapScale;

    // Center viewport on clicked position
    const visibleWidth = containerWidth / viewport.zoom;
    const visibleHeight = containerHeight / viewport.zoom;

    const newPanX = -(canvasX - visibleWidth / 2) * viewport.zoom;
    const newPanY = -(canvasY - visibleHeight / 2) * viewport.zoom;

    setViewport({ panX: newPanX, panY: newPanY });
  }, [minimapScale, containerWidth, containerHeight, viewport.zoom, setViewport]);

  // Drag handlers for viewport rectangle
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMinimapClick(e);
  }, [handleMinimapClick]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    handleMinimapClick(e);
  }, [isDragging, handleMinimapClick]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Position styles based on position prop
  const positionStyles: React.CSSProperties = {
    'bottom-right': { bottom: MINIMAP_PADDING, right: MINIMAP_PADDING },
    'bottom-left': { bottom: MINIMAP_PADDING, left: MINIMAP_PADDING },
    'top-right': { top: MINIMAP_PADDING + 60, right: MINIMAP_PADDING }, // Account for toolbar
    'top-left': { top: MINIMAP_PADDING + 60, left: MINIMAP_PADDING },
  }[position];

  return (
    <div
      ref={minimapRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        ...positionStyles,
        width: minimapWidth,
        height: minimapHeight,
        background: 'var(--sn-glass-bg)',
        borderRadius: 8,
        border: '1px solid var(--sn-glass-border)',
        boxShadow: 'var(--sn-shadow-lg)',
        overflow: 'hidden',
        cursor: 'crosshair',
        zIndex: 90,
        opacity: isHovered || isDragging ? 1 : 0.7,
        transition: 'opacity 0.2s ease',
        backdropFilter: 'blur(var(--sn-glass-blur-sm))',
      }}
    >
      {/* Canvas background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: minimapWidth,
          height: minimapHeight,
          background: 'var(--sn-glass-bg-light)',
        }}
      />

      {/* Widget representations */}
      {widgets.map(widget => (
        <div
          key={widget.id}
          style={{
            position: 'absolute',
            left: widget.position.x * minimapScale,
            top: widget.position.y * minimapScale,
            width: Math.max(2, widget.width * minimapScale),
            height: Math.max(2, widget.height * minimapScale),
            background: 'var(--sn-accent-primary-50)',
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Viewport indicator */}
      <div
        style={{
          position: 'absolute',
          left: viewportRect.x,
          top: viewportRect.y,
          width: viewportRect.width,
          height: viewportRect.height,
          border: '2px solid var(--sn-cozy-mint)',
          borderRadius: 2,
          background: 'var(--sn-cozy-mint-10)',
          pointerEvents: 'none',
          boxShadow: '0 0 8px var(--sn-cozy-mint-40)',
        }}
      />

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          fontSize: 9,
          color: 'var(--sn-text-muted)',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}
      >
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
};

export default CanvasMinimap;
