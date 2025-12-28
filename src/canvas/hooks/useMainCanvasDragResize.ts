/**
 * useMainCanvasDragResize
 * Widget drag/resize and canvas resize handlers for MainCanvas
 */

import { useRef, useState, useCallback } from 'react';
import type { WidgetInstance, WidgetScaleMode, ResponsiveLayout } from '../../types/domain';
import type { CanvasMode } from '../MainCanvas';
import type { ViewportMode } from '../../state/useViewportModeStore';

export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface CanvasProperties {
  snapToGrid: boolean;
  gridSize: number;
}

export interface UseMainCanvasDragResizeOptions {
  widgets: WidgetInstance[];
  setWidgets: React.Dispatch<React.SetStateAction<WidgetInstance[]>>;
  selectedIds: Set<string>;
  viewport: Viewport;
  properties: CanvasProperties;
  mode: CanvasMode;
  isCanvasResizeMode: boolean;
  setIsCanvasResizeMode: (value: boolean) => void;
  deselectAll: () => void;
  selectSticker: (id: string | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  /** Initial canvas width */
  initialWidth?: number;
  /** Initial canvas height */
  initialHeight?: number;
  /** Called when canvas is resized via drag handles */
  onCanvasResize?: (width: number, height: number) => void;
  /** Current viewport mode (mobile vs web) for responsive layouts */
  viewportMode?: ViewportMode;
}

/**
 * Get the effective position for a widget based on the current viewport mode.
 */
function getEffectivePosition(widget: WidgetInstance, mode: ViewportMode): { x: number; y: number } {
  if (mode === 'mobile' && widget.mobileLayout) {
    return widget.mobileLayout.position;
  }
  return widget.position;
}

/**
 * Update widget position based on viewport mode.
 * In mobile mode, updates mobileLayout. In web mode, updates root position.
 */
function updateWidgetPosition(
  widget: WidgetInstance,
  newPosition: { x: number; y: number },
  mode: ViewportMode
): WidgetInstance {
  if (mode === 'mobile') {
    // Initialize mobileLayout if it doesn't exist
    const currentMobileLayout = widget.mobileLayout || {
      position: widget.position,
      width: widget.width,
      height: widget.height,
    };
    return {
      ...widget,
      mobileLayout: {
        ...currentMobileLayout,
        position: newPosition,
      },
    };
  }
  // Web mode - update root position
  return { ...widget, position: newPosition };
}

/**
 * Update widget bounds (position and size) based on viewport mode.
 */
function updateWidgetBounds(
  widget: WidgetInstance,
  bounds: { x: number; y: number; width: number; height: number },
  mode: ViewportMode
): WidgetInstance {
  if (mode === 'mobile') {
    // Initialize mobileLayout if it doesn't exist
    const currentMobileLayout = widget.mobileLayout || {
      position: widget.position,
      width: widget.width,
      height: widget.height,
    };
    return {
      ...widget,
      mobileLayout: {
        ...currentMobileLayout,
        position: { x: bounds.x, y: bounds.y },
        width: bounds.width,
        height: bounds.height,
      },
    };
  }
  // Web mode - update root properties
  return {
    ...widget,
    position: { x: bounds.x, y: bounds.y },
    width: bounds.width,
    height: bounds.height,
  };
}

export function useMainCanvasDragResize(options: UseMainCanvasDragResizeOptions) {
  const {
    widgets,
    setWidgets,
    selectedIds,
    viewport,
    properties,
    mode,
    isCanvasResizeMode,
    setIsCanvasResizeMode,
    deselectAll,
    selectSticker,
    setHasUnsavedChanges,
    initialWidth = 1920,
    initialHeight = 1080,
    onCanvasResize,
    viewportMode = 'web',
  } = options;

  // Canvas size state - initialize with provided dimensions
  const [canvasSize, setCanvasSize] = useState({ width: initialWidth, height: initialHeight });

  // Drag state refs
  const dragStateRef = useRef<{
    widgetId: string;
    startMouse: { x: number; y: number };
    initialPositions: Map<string, { x: number; y: number }>;
  } | null>(null);

  const resizeStateRef = useRef<{
    widgetId: string;
    handle: string;
    startBounds: { x: number; y: number; width: number; height: number };
    startMouse: { x: number; y: number };
    scaleMode?: WidgetScaleMode;
    aspectRatio?: number;
  } | null>(null);

  // Canvas resize ref
  const canvasResizeRef = useRef<{
    handle: string;
    startSize: { width: number; height: number };
    startMouse: { x: number; y: number };
  } | null>(null);

  // Widget drag handlers
  const handleDragStart = useCallback((widgetId: string, e: React.PointerEvent) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const toMove = selectedIds.has(widgetId)
      ? widgets.filter(w => selectedIds.has(w.id) && !w.locked)
      : [widget];

    // Store positions based on current viewport mode
    const positions = new Map<string, { x: number; y: number }>();
    toMove.forEach(w => {
      const effectivePos = getEffectivePosition(w, viewportMode);
      positions.set(w.id, { ...effectivePos });
    });

    dragStateRef.current = {
      widgetId,
      startMouse: { x: e.clientX, y: e.clientY },
      initialPositions: positions,
    };
  }, [widgets, selectedIds, viewportMode]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (dragStateRef.current) {
      const { startMouse, initialPositions } = dragStateRef.current;
      const dx = (e.clientX - startMouse.x) / viewport.zoom;
      const dy = (e.clientY - startMouse.y) / viewport.zoom;

      setWidgets(prev => prev.map(w => {
        const start = initialPositions.get(w.id);
        if (!start) return w;

        let newX = start.x + dx;
        let newY = start.y + dy;

        if (properties.snapToGrid) {
          newX = Math.round(newX / properties.gridSize) * properties.gridSize;
          newY = Math.round(newY / properties.gridSize) * properties.gridSize;
        }

        // Update position based on current viewport mode
        return updateWidgetPosition(w, { x: newX, y: newY }, viewportMode);
      }));
    } else if (resizeStateRef.current) {
      const { widgetId, handle, startBounds, startMouse, aspectRatio } = resizeStateRef.current;
      const dx = (e.clientX - startMouse.x) / viewport.zoom;
      const dy = (e.clientY - startMouse.y) / viewport.zoom;
      const isCorner = ['ne', 'nw', 'se', 'sw'].includes(handle);
      const maintainAspect = isCorner && !e.shiftKey;

      setWidgets(prev => prev.map(w => {
        if (w.id !== widgetId) return w;

        let { x, y, width: nw, height: nh } = startBounds;

        if (handle.includes('e')) nw = Math.max(50, startBounds.width + dx);
        if (handle.includes('w')) {
          const c = Math.min(dx, startBounds.width - 50);
          nw = startBounds.width - c;
          x = startBounds.x + c;
        }
        if (handle.includes('s')) nh = Math.max(50, startBounds.height + dy);
        if (handle.includes('n')) {
          const c = Math.min(dy, startBounds.height - 50);
          nh = startBounds.height - c;
          y = startBounds.y + c;
        }

        // Maintain aspect ratio for proportional scaling
        if (maintainAspect && aspectRatio) {
          const widthRatio = nw / startBounds.width;
          const heightRatio = nh / startBounds.height;

          if (Math.abs(widthRatio - 1) > Math.abs(heightRatio - 1)) {
            const adjustedHeight = Math.max(50, nw / aspectRatio);
            if (handle.includes('n')) {
              y = startBounds.y + startBounds.height - adjustedHeight;
            }
            nh = adjustedHeight;
          } else {
            const adjustedWidth = Math.max(50, nh * aspectRatio);
            if (handle.includes('w')) {
              x = startBounds.x + startBounds.width - adjustedWidth;
            }
            nw = adjustedWidth;
          }
        }

        // Update bounds based on current viewport mode
        return updateWidgetBounds(w, { x, y, width: nw, height: nh }, viewportMode);
      }));
    }
  }, [viewport.zoom, properties.snapToGrid, properties.gridSize, setWidgets, viewportMode]);

  const handleDragEnd = useCallback(() => {
    dragStateRef.current = null;
    resizeStateRef.current = null;
  }, []);

  const handleResizeStart = useCallback((widgetId: string, handle: string, e: React.PointerEvent, scaleMode?: WidgetScaleMode) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    // Get effective bounds based on viewport mode
    const effectivePos = getEffectivePosition(widget, viewportMode);
    const effectiveWidth = viewportMode === 'mobile' && widget.mobileLayout
      ? widget.mobileLayout.width
      : widget.width;
    const effectiveHeight = viewportMode === 'mobile' && widget.mobileLayout
      ? widget.mobileLayout.height
      : widget.height;

    resizeStateRef.current = {
      widgetId,
      handle,
      startBounds: { ...effectivePos, width: effectiveWidth, height: effectiveHeight },
      startMouse: { x: e.clientX, y: e.clientY },
      scaleMode: scaleMode || widget.scaleMode || 'scale',
      aspectRatio: effectiveWidth / effectiveHeight,
    };
  }, [widgets, viewportMode]);

  // Canvas resize handlers
  const handleCanvasResizeStart = useCallback((handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    canvasResizeRef.current = {
      handle,
      startSize: { ...canvasSize },
      startMouse: { x: e.clientX, y: e.clientY },
    };

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [canvasSize]);

  const handleCanvasResizeMove = useCallback((e: React.PointerEvent) => {
    if (!canvasResizeRef.current) return;

    const { handle, startSize, startMouse } = canvasResizeRef.current;
    const dx = (e.clientX - startMouse.x) / viewport.zoom;
    const dy = (e.clientY - startMouse.y) / viewport.zoom;

    let newWidth = startSize.width;
    let newHeight = startSize.height;

    if (handle.includes('e')) newWidth = Math.max(200, startSize.width + dx);
    if (handle.includes('w')) newWidth = Math.max(200, startSize.width - dx);
    if (handle.includes('s')) newHeight = Math.max(200, startSize.height + dy);
    if (handle.includes('n')) newHeight = Math.max(200, startSize.height - dy);

    // Snap to common sizes
    const snapTargets = [800, 1080, 1280, 1920, 2560, 3840];
    const snapThreshold = 20;
    snapTargets.forEach(target => {
      if (Math.abs(newWidth - target) < snapThreshold) newWidth = target;
      if (Math.abs(newHeight - target) < snapThreshold) newHeight = target;
    });

    setCanvasSize({ width: newWidth, height: newHeight });
    setHasUnsavedChanges(true);
  }, [viewport.zoom, setHasUnsavedChanges]);

  const handleCanvasResizeEnd = useCallback((e: React.PointerEvent) => {
    if (canvasResizeRef.current) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      canvasResizeRef.current = null;
      // Notify parent of final canvas size
      onCanvasResize?.(canvasSize.width, canvasSize.height);
    }
  }, [canvasSize, onCanvasResize]);

  // Handle double-click on canvas background to toggle resize mode
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (mode !== 'edit') return;

    const target = e.target as HTMLElement;
    const isBackground = target.dataset.canvasBackground !== undefined ||
                         target.dataset.canvasTransform !== undefined;

    if (isBackground) {
      setIsCanvasResizeMode(!isCanvasResizeMode);
      if (!isCanvasResizeMode) {
        deselectAll();
        selectSticker(null);
      }
    }
  }, [mode, isCanvasResizeMode, setIsCanvasResizeMode, deselectAll, selectSticker]);

  // Initialize canvas size
  const initCanvasSize = useCallback((width: number, height: number) => {
    setCanvasSize({ width, height });
  }, []);

  return {
    // Canvas size
    canvasSize,
    setCanvasSize,
    initCanvasSize,

    // Widget drag/resize
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleResizeStart,

    // Canvas resize
    handleCanvasResizeStart,
    handleCanvasResizeMove,
    handleCanvasResizeEnd,
    handleCanvasDoubleClick,
    canvasResizeRef,
  };
}
