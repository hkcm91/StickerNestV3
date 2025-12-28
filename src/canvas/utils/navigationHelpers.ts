/**
 * StickerNest v2 - Canvas Navigation Helpers
 *
 * Utility functions for canvas viewport navigation.
 */

import type { WidgetInstance } from '../../types/domain';

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Calculate the bounding box of all widgets
 */
export function getContentBounds(widgets: WidgetInstance[]): Bounds | null {
  if (widgets.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  widgets.forEach((widget) => {
    if (widget.visible === false) return;

    const left = widget.position.x;
    const top = widget.position.y;
    const right = left + widget.width;
    const bottom = top + widget.height;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  if (!isFinite(minX)) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate viewport to fit entire canvas in view
 */
export function fitCanvasToView(
  canvasWidth: number,
  canvasHeight: number,
  containerSize: ContainerSize,
  padding = 40
): ViewportState {
  const availableWidth = containerSize.width - padding * 2;
  const availableHeight = containerSize.height - padding * 2;

  const scaleX = availableWidth / canvasWidth;
  const scaleY = availableHeight / canvasHeight;
  const zoom = Math.min(scaleX, scaleY, 1); // Don't zoom beyond 100%

  const scaledWidth = canvasWidth * zoom;
  const scaledHeight = canvasHeight * zoom;

  const panX = (containerSize.width - scaledWidth) / 2;
  const panY = (containerSize.height - scaledHeight) / 2;

  return { zoom, panX, panY };
}

/**
 * Calculate viewport to fit all content (widgets) in view
 */
export function fitContentToView(
  widgets: WidgetInstance[],
  containerSize: ContainerSize,
  padding = 60
): ViewportState | null {
  const bounds = getContentBounds(widgets);
  if (!bounds) return null;

  // Add padding around content
  const contentWidth = bounds.width + padding * 2;
  const contentHeight = bounds.height + padding * 2;

  const scaleX = containerSize.width / contentWidth;
  const scaleY = containerSize.height / contentHeight;
  const zoom = Math.min(scaleX, scaleY, 2); // Cap at 200%

  // Center the content
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;

  const panX = containerSize.width / 2 - centerX * zoom;
  const panY = containerSize.height / 2 - centerY * zoom;

  return { zoom, panX, panY };
}

/**
 * Calculate viewport to center on a specific widget
 */
export function centerOnWidget(
  widget: WidgetInstance,
  containerSize: ContainerSize,
  currentZoom: number
): ViewportState {
  const centerX = widget.position.x + widget.width / 2;
  const centerY = widget.position.y + widget.height / 2;

  const panX = containerSize.width / 2 - centerX * currentZoom;
  const panY = containerSize.height / 2 - centerY * currentZoom;

  return { zoom: currentZoom, panX, panY };
}

/**
 * Calculate viewport to center canvas at a specific point
 */
export function centerAtPoint(
  x: number,
  y: number,
  containerSize: ContainerSize,
  zoom: number
): ViewportState {
  const panX = containerSize.width / 2 - x * zoom;
  const panY = containerSize.height / 2 - y * zoom;

  return { zoom, panX, panY };
}

/**
 * Calculate viewport for a specific zoom level while maintaining center point
 */
export function zoomToLevel(
  targetZoom: number,
  currentViewport: ViewportState,
  containerSize: ContainerSize
): ViewportState {
  // Find current center point in canvas coordinates
  const centerX = (containerSize.width / 2 - currentViewport.panX) / currentViewport.zoom;
  const centerY = (containerSize.height / 2 - currentViewport.panY) / currentViewport.zoom;

  // Calculate new pan to maintain center
  const panX = containerSize.width / 2 - centerX * targetZoom;
  const panY = containerSize.height / 2 - centerY * targetZoom;

  return { zoom: targetZoom, panX, panY };
}

/**
 * Clamp viewport to keep canvas visible
 */
export function clampViewport(
  viewport: ViewportState,
  canvasWidth: number,
  canvasHeight: number,
  containerSize: ContainerSize,
  minVisible = 100
): ViewportState {
  const scaledWidth = canvasWidth * viewport.zoom;
  const scaledHeight = canvasHeight * viewport.zoom;

  // Ensure at least minVisible pixels of canvas are visible
  const minPanX = minVisible - scaledWidth;
  const maxPanX = containerSize.width - minVisible;
  const minPanY = minVisible - scaledHeight;
  const maxPanY = containerSize.height - minVisible;

  return {
    zoom: viewport.zoom,
    panX: Math.max(minPanX, Math.min(maxPanX, viewport.panX)),
    panY: Math.max(minPanY, Math.min(maxPanY, viewport.panY)),
  };
}

/** Common zoom presets */
export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;

/**
 * Find the next zoom preset up or down from current zoom
 */
export function getNextZoomPreset(
  currentZoom: number,
  direction: 'in' | 'out'
): number {
  if (direction === 'in') {
    for (const preset of ZOOM_PRESETS) {
      if (preset > currentZoom + 0.01) return preset;
    }
    return ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
  } else {
    for (let i = ZOOM_PRESETS.length - 1; i >= 0; i--) {
      if (ZOOM_PRESETS[i] < currentZoom - 0.01) return ZOOM_PRESETS[i];
    }
    return ZOOM_PRESETS[0];
  }
}
