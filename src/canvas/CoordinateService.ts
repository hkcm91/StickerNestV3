/**
 * StickerNest v2 - Coordinate Transformation Service
 * Single source of truth for all coordinate transformations between
 * screen space, canvas space, and widget space.
 */

import type { ViewportState } from '../state/useCanvasStore';

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Delta (change) in 2D space
 */
export interface Delta {
  dx: number;
  dy: number;
}

/**
 * Coordinate transformation service
 * Handles all conversions between screen pixels and canvas coordinates
 */
export const coordinateService = {
  /**
   * Convert screen pixel coordinates to canvas coordinates
   * Accounts for zoom level and pan offset
   *
   * @param screenX - X position in screen pixels
   * @param screenY - Y position in screen pixels
   * @param viewport - Current viewport state (zoom, panX, panY)
   * @returns Canvas coordinates
   */
  screenToCanvas(screenX: number, screenY: number, viewport: ViewportState): Point {
    return {
      x: (screenX - viewport.panX) / viewport.zoom,
      y: (screenY - viewport.panY) / viewport.zoom,
    };
  },

  /**
   * Convert canvas coordinates to screen pixel coordinates
   *
   * @param canvasX - X position in canvas coordinates
   * @param canvasY - Y position in canvas coordinates
   * @param viewport - Current viewport state
   * @returns Screen pixel coordinates
   */
  canvasToScreen(canvasX: number, canvasY: number, viewport: ViewportState): Point {
    return {
      x: canvasX * viewport.zoom + viewport.panX,
      y: canvasY * viewport.zoom + viewport.panY,
    };
  },

  /**
   * Convert a screen pixel delta (mouse movement) to canvas coordinate delta
   * Used for dragging operations
   *
   * @param deltaX - Change in X screen pixels
   * @param deltaY - Change in Y screen pixels
   * @param zoom - Current zoom level
   * @returns Delta in canvas coordinates
   */
  screenDeltaToCanvas(deltaX: number, deltaY: number, zoom: number): Delta {
    return {
      dx: deltaX / zoom,
      dy: deltaY / zoom,
    };
  },

  /**
   * Convert a canvas coordinate delta to screen pixel delta
   *
   * @param dx - Change in canvas X
   * @param dy - Change in canvas Y
   * @param zoom - Current zoom level
   * @returns Delta in screen pixels
   */
  canvasDeltaToScreen(dx: number, dy: number, zoom: number): Delta {
    return {
      dx: dx * zoom,
      dy: dy * zoom,
    };
  },

  /**
   * Get the canvas point at the center of the viewport
   *
   * @param viewportWidth - Width of the viewport in pixels
   * @param viewportHeight - Height of the viewport in pixels
   * @param viewport - Current viewport state
   * @returns Canvas coordinates at viewport center
   */
  getViewportCenter(viewportWidth: number, viewportHeight: number, viewport: ViewportState): Point {
    return this.screenToCanvas(viewportWidth / 2, viewportHeight / 2, viewport);
  },

  /**
   * Calculate viewport state to center on a specific canvas point
   *
   * @param canvasX - Canvas X to center on
   * @param canvasY - Canvas Y to center on
   * @param viewportWidth - Width of the viewport
   * @param viewportHeight - Height of the viewport
   * @param zoom - Desired zoom level
   * @returns New panX and panY values
   */
  centerOnPoint(
    canvasX: number,
    canvasY: number,
    viewportWidth: number,
    viewportHeight: number,
    zoom: number
  ): { panX: number; panY: number } {
    return {
      panX: viewportWidth / 2 - canvasX * zoom,
      panY: viewportHeight / 2 - canvasY * zoom,
    };
  },

  /**
   * Snap a value to a grid
   *
   * @param value - Value to snap
   * @param gridSize - Grid size to snap to
   * @param enabled - Whether snapping is enabled
   * @returns Snapped value (or original if disabled)
   */
  snapToGrid(value: number, gridSize: number, enabled: boolean = true): number {
    if (!enabled || gridSize <= 0) return value;
    return Math.round(value / gridSize) * gridSize;
  },

  /**
   * Snap a point to a grid
   *
   * @param point - Point to snap
   * @param gridSize - Grid size
   * @param enabled - Whether snapping is enabled
   * @returns Snapped point
   */
  snapPointToGrid(point: Point, gridSize: number, enabled: boolean = true): Point {
    return {
      x: this.snapToGrid(point.x, gridSize, enabled),
      y: this.snapToGrid(point.y, gridSize, enabled),
    };
  },
};

export default coordinateService;
