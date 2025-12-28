/**
 * useMainCanvasNavigation
 * Navigation, panning, and keyboard shortcuts for MainCanvas
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  fitCanvasToView,
  fitContentToView,
  centerAtPoint,
  zoomToLevel,
} from '../utils/navigationHelpers';
import type { WidgetInstance } from '../../types/domain';
import type { CanvasMode } from '../MainCanvas';

export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface UseMainCanvasNavigationOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  canvasSize: { width: number; height: number };
  viewport: Viewport;
  setViewport: (updates: Partial<Viewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  widgets: WidgetInstance[];
  mode: CanvasMode;
  selectedIds: Set<string>;
  selectedStickerId: string | null;
  isCanvasResizeMode: boolean;
  showStickerProperties: boolean;
  // Callbacks
  removeWidget: (id: string) => void;
  saveCanvas: () => Promise<void>;
  deselectAll: () => void;
  selectSticker: (id: string | null) => void;
  handleStickerDelete: (id: string) => void;
  handleCloseStickerProperties: () => void;
  setIsCanvasResizeMode: (value: boolean) => void;
}

export function useMainCanvasNavigation(options: UseMainCanvasNavigationOptions) {
  const {
    containerRef,
    canvasSize,
    viewport,
    setViewport,
    zoomIn,
    zoomOut,
    widgets,
    mode,
    selectedIds,
    selectedStickerId,
    isCanvasResizeMode,
    showStickerProperties,
    removeWidget,
    saveCanvas,
    deselectAll,
    selectSticker,
    handleStickerDelete,
    handleCloseStickerProperties,
    setIsCanvasResizeMode,
  } = options;

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Get container size helper
  const getContainerSize = useCallback(() => {
    if (!containerRef.current) return { width: 800, height: 600 };
    const rect = containerRef.current.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, [containerRef]);

  // Navigation handlers
  const handleFitToView = useCallback(() => {
    const containerSize = getContainerSize();
    const newViewport = fitCanvasToView(canvasSize.width, canvasSize.height, containerSize);
    setViewport(newViewport);
  }, [canvasSize.width, canvasSize.height, getContainerSize, setViewport]);

  const handleFitToContent = useCallback(() => {
    const containerSize = getContainerSize();
    const newViewport = fitContentToView(widgets, containerSize);
    if (newViewport) {
      setViewport(newViewport);
    }
  }, [widgets, getContainerSize, setViewport]);

  const handleCenterCanvas = useCallback(() => {
    const containerSize = getContainerSize();
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const newViewport = centerAtPoint(centerX, centerY, containerSize, viewport.zoom);
    setViewport(newViewport);
  }, [canvasSize.width, canvasSize.height, getContainerSize, viewport.zoom, setViewport]);

  const handleZoomTo = useCallback((targetZoom: number) => {
    const containerSize = getContainerSize();
    const newViewport = zoomToLevel(targetZoom, viewport, containerSize);
    setViewport(newViewport);
  }, [getContainerSize, viewport, setViewport]);

  const handleMinimapNavigate = useCallback((panX: number, panY: number) => {
    setViewport({ panX, panY });
  }, [setViewport]);

  // Check if event target is canvas background
  const isCanvasBackground = useCallback((e: React.PointerEvent | React.MouseEvent): boolean => {
    const target = e.target as HTMLElement;

    if (
      target.closest('[data-widget-id]') ||
      target.closest('[data-sticker-id]') ||
      target.closest('[data-sticker-frame]') ||
      target.closest('[data-edit-overlay]') ||
      target.closest('[data-resize-handle]') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[data-interactive]')
    ) {
      return false;
    }

    return Boolean(
      target.dataset.canvasBackground ||
      target.dataset.canvasTransform ||
      target.closest('[data-canvas-background]') === target ||
      target.closest('[data-canvas-transform]') === target
    );
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

      // Delete selected widgets or stickers
      if ((e.key === 'Delete' || e.key === 'Backspace') && mode === 'edit') {
        e.preventDefault();
        if (selectedStickerId) {
          handleStickerDelete(selectedStickerId);
        }
        if (selectedIds.size > 0) {
          selectedIds.forEach(id => removeWidget(id));
        }
      }
      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCanvas();
      }
      // Escape
      if (e.key === 'Escape') {
        if (isCanvasResizeMode) {
          setIsCanvasResizeMode(false);
        } else if (showStickerProperties) {
          handleCloseStickerProperties();
        } else {
          deselectAll();
          selectSticker(null);
        }
      }
      // Navigation shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleZoomTo(1);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        handleFitToView();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        handleFitToContent();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
      if (e.key === 'Home') {
        e.preventDefault();
        handleCenterCanvas();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedIds, selectedStickerId, mode, removeWidget, saveCanvas,
    deselectAll, selectSticker, handleStickerDelete, showStickerProperties,
    handleCloseStickerProperties, handleFitToView, handleFitToContent,
    handleCenterCanvas, handleZoomTo, zoomIn, zoomOut, isCanvasResizeMode,
    setIsCanvasResizeMode,
  ]);

  return {
    // Pan state
    isPanning,
    setIsPanning,
    panStartRef,

    // Marquee state
    isMarqueeSelecting,
    setIsMarqueeSelecting,
    marqueeStartRef,
    marqueeRect,
    setMarqueeRect,

    // Navigation
    handleFitToView,
    handleFitToContent,
    handleCenterCanvas,
    handleZoomTo,
    handleMinimapNavigate,

    // Utilities
    isCanvasBackground,
    getContainerSize,
  };
}
