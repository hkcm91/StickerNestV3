/**
 * StickerNest v2 - MainCanvas
 *
 * The unified, optimized canvas component combining the best of Canvas2 navigation
 * with editor capabilities. Full gesture support for mobile and desktop.
 *
 * Mode Behavior:
 * - 'view': Read-only interaction with widgets (click behaviors work)
 * - 'edit': Full editing - drag, resize, select stickers/widgets, open properties
 * - 'preview': Same as view but indicates preview context
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useCanvasGestures } from '../hooks/useCanvasGestures';
import { useViewportIsolation } from '../hooks/useViewportIsolation';
import { useCanvasController } from '../hooks/useCanvasController';
import { useCanvasEntityEvents } from '../hooks/useCanvasEntityEvents';
import { WidgetWrapper, CanvasControlsLayout, CanvasNavigator, Minimap, CanvasMaskOverlay } from './components';
import { useSafeArea, useViewport } from '../hooks/useResponsive';
import { StickerFrame } from '../components/StickerFrame';
import { StickerPropertiesPanel } from '../components/StickerPropertiesPanel';
import { CanvasEntityLayer } from '../components/editor/CanvasEntityLayer';
import { MobileGestureHint } from '../components/MobileGestureHint';
import { MobileToolbar } from '../components/MobileToolbar';
import { DEFAULT_CANVAS_SETTINGS, type WidgetInstance, type CanvasSettings, type ResponsiveLayout } from '../types/domain';
import type { WidgetManifest } from '../types/manifest';
import type { EventBus } from '../runtime/EventBus';
import {
  useViewportModeStore,
  useInitializeViewportForDevice,
  type ViewportMode,
} from '../state/useViewportModeStore';
import { useDeviceCanvas, useContainerDimensions } from '../hooks/useDeviceCanvas';
import {
  useMainCanvasWidgets,
  useMainCanvasStickers,
  useMainCanvasNavigation,
  useMainCanvasDragResize,
} from './hooks';
import { CanvasBackground } from './components/CanvasBackground';
import { CanvasResizeHandles } from './components/CanvasResizeHandles';
import { MarqueeSelection } from './components/MarqueeSelection';
import { CanvasEmptyState } from './components/CanvasEmptyState';
import { fitCanvasToView } from './utils/navigationHelpers';
import { useBorderSettings } from '../state/useCanvasAppearanceStore';
import { useUndoRedoStore } from '../state/useUndoRedoStore';

// ============================================================================
// TYPES
// ============================================================================

export type CanvasMode = 'view' | 'edit' | 'preview';

export interface CanvasProperties {
  background: string;
  filter: string;
  opacity: number;
  blur: number;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
}

export interface MainCanvasProps {
  canvasId: string;
  mode?: CanvasMode;
  width?: number;
  height?: number;
  renderWidget: (widget: WidgetInstance) => React.ReactNode;
  onCanvasPropertiesChange?: (props: CanvasProperties) => void;
  onWidgetAdd?: (widget: WidgetInstance) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onModeChange?: (mode: CanvasMode) => void;
  onStickerSpawnWidget?: (stickerId: string, widgetDefId: string, position: string) => void;
  externalWidgetManifests?: Map<string, WidgetManifest>;
  eventBus?: EventBus | null;
  children?: React.ReactNode;
  onDockWidget?: (widgetId: string) => void;
  className?: string;
  showModeToggle?: boolean;
  showZoomControls?: boolean;
  showMinimap?: boolean;
  showNavigator?: boolean;
  autoSaveInterval?: number;
  accentColor?: string;
  showModeHint?: boolean;
  backgroundStyle?: React.CSSProperties;
  constrainToCanvas?: boolean;
  initialWidgets?: WidgetInstance[];
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Called when canvas is resized via drag handles */
  onCanvasResize?: (width: number, height: number) => void;
}

export interface MainCanvasRef {
  getProperties: () => CanvasProperties;
  setProperties: (props: Partial<CanvasProperties>) => void;
  addWidget: (widget: Omit<WidgetInstance, 'id' | 'canvasId'>) => string;
  updateWidget: (widgetId: string, updates: Partial<WidgetInstance>) => void;
  removeWidget: (widgetId: string) => void;
  getWidgets: () => WidgetInstance[];
  getSelectedIds: () => string[];
  save: () => Promise<void>;
  resetViewport: () => void;
  setMode: (mode: CanvasMode) => void;
  fitToView: () => void;
  fitToContent: () => void;
  centerCanvas: () => void;
  zoomTo: (zoom: number) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PROPERTIES: CanvasProperties = {
  background: '#1a1a2e',
  filter: 'none',
  opacity: 1,
  blur: 0,
  showGrid: false,
  gridSize: 20,
  snapToGrid: true,
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the effective layout for a widget based on the current viewport mode.
 * In mobile mode, uses mobileLayout if available, otherwise falls back to default.
 */
function getWidgetLayout(
  widget: WidgetInstance,
  mode: ViewportMode
): { position: { x: number; y: number }; width: number; height: number; visible: boolean } {
  if (mode === 'mobile' && widget.mobileLayout) {
    return {
      position: widget.mobileLayout.position,
      width: widget.mobileLayout.width,
      height: widget.mobileLayout.height,
      visible: widget.mobileLayout.visible ?? true,
    };
  }
  return {
    position: widget.position,
    width: widget.width,
    height: widget.height,
    visible: widget.visible ?? true,
  };
}

/**
 * Apply the effective layout to a widget instance for the current mode.
 * Returns a new widget object with position/size from the appropriate layout.
 */
function applyViewportLayout(widget: WidgetInstance, mode: ViewportMode): WidgetInstance {
  const layout = getWidgetLayout(widget, mode);
  return {
    ...widget,
    position: layout.position,
    width: layout.width,
    height: layout.height,
    visible: layout.visible,
  };
}

// ============================================================================
// CANVAS COMPONENT
// ============================================================================

export const MainCanvas = memo(forwardRef<MainCanvasRef, MainCanvasProps>(function MainCanvas(
  {
    canvasId,
    mode: initialMode = 'view',
    width = 1920,
    height = 1080,
    renderWidget,
    onCanvasPropertiesChange,
    onWidgetAdd,
    onWidgetRemove,
    onModeChange,
    externalWidgetManifests,
    eventBus = null,
    children,
    onDockWidget,
    className = '',
    showModeToggle = true,
    showZoomControls = true,
    showMinimap = true,
    showNavigator = true,
    autoSaveInterval = 30000,
    accentColor = '#8b5cf6',
    showModeHint = true,
    backgroundStyle,
    constrainToCanvas = false,
    initialWidgets,
    onSelectionChange,
    onCanvasResize,
  },
  ref
) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state
  const [internalMode, setInternalMode] = useState<CanvasMode>(initialMode);
  const mode = initialMode;
  const setMode = setInternalMode;
  const [properties, setProperties] = useState<CanvasProperties>(DEFAULT_PROPERTIES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize viewport mode for current device (auto-switches to mobile on mobile devices)
  useInitializeViewportForDevice();

  // Get viewport info early (needed for dimension calculations)
  const { isMobile } = useViewport();

  // Viewport mode for responsive layouts (mobile vs web)
  const viewportMode = useViewportModeStore((state) => state.activeMode);
  const mobileWidth = useViewportModeStore((state) => state.mobileWidth);
  const mobileHeight = useViewportModeStore((state) => state.mobileHeight);

  // Get device-native canvas dimensions (for mobile devices)
  const deviceCanvas = useDeviceCanvas({
    defaultWidth: width,
    defaultHeight: height,
  });

  // Get container dimensions with proper measurement (for fit-to-view)
  const containerDimensions = useContainerDimensions(containerRef);

  // Compute effective canvas dimensions based on viewport mode and device
  // On mobile DEVICES (not just mobile mode), use device-native dimensions
  // On desktop in mobile MODE (for preview), use the configured mobile dimensions
  const effectiveWidth = isMobile
    ? deviceCanvas.width // Mobile device: use actual screen width
    : viewportMode === 'mobile'
    ? mobileWidth // Desktop in mobile preview mode
    : width; // Desktop in web mode

  const effectiveHeight = isMobile
    ? deviceCanvas.height // Mobile device: use actual screen height
    : viewportMode === 'mobile'
    ? mobileHeight // Desktop in mobile preview mode
    : height; // Desktop in web mode

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);
  const [isCanvasResizeMode, setIsCanvasResizeMode] = useState(false);

  // Canvas controller for widget-driven property changes
  const canvasController = useCanvasController({
    eventBus,
    canvasId,
    initialBackground: { type: 'color', color: properties.background },
  });

  // Wire canvas events to entity creation (text, shapes, images from tool widgets)
  useCanvasEntityEvents({
    eventBus,
    canvasId,
    enabled: mode === 'edit',
  });

  // Viewport isolation
  useViewportIsolation({
    enabled: true,
    preventPullToRefresh: true,
    preventPageZoom: true,
  });

  // Border settings for mask overlay
  const borderSettings = useBorderSettings();

  // Undo/Redo system
  const undoRedoStore = useUndoRedoStore();
  const canUndo = undoRedoStore.canUndo();
  const canRedo = undoRedoStore.canRedo();

  // Canvas gestures
  const gestures = useCanvasGestures(containerRef, {
    settings: DEFAULT_CANVAS_SETTINGS,
    enabled: true,
    mode: mode === 'preview' ? 'view' : mode,
    canvasBounds: { width: effectiveWidth, height: effectiveHeight },
  });

  // Widget management hook
  const widgetHook = useMainCanvasWidgets({
    canvasId,
    initialWidgets,
    autoSaveInterval,
    onWidgetAdd,
    onWidgetRemove,
    eventBus,
  });

  // Sync widgets with hook state
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  useEffect(() => {
    setWidgets(widgetHook.widgets);
  }, [widgetHook.widgets]);

  // Drag/resize hook
  const dragResizeHook = useMainCanvasDragResize({
    widgets,
    setWidgets: widgetHook.setWidgets,
    selectedIds,
    viewport: gestures.viewport,
    properties,
    mode,
    isCanvasResizeMode,
    setIsCanvasResizeMode,
    deselectAll: () => setSelectedIds(new Set()),
    selectSticker: () => {},
    setHasUnsavedChanges,
    initialWidth: effectiveWidth,
    initialHeight: effectiveHeight,
    onCanvasResize,
    viewportMode,
  });

  // Initialize/update canvas size when dimensions or viewport mode changes
  useEffect(() => {
    dragResizeHook.initCanvasSize(effectiveWidth, effectiveHeight);
  }, [effectiveWidth, effectiveHeight, viewportMode]);

  // Track if initial fit has been performed (per-device-type)
  const initialFitDoneRef = useRef(false);
  const lastIsMobileRef = useRef<boolean | null>(null);

  // Reset fit tracking when switching between mobile/desktop
  if (lastIsMobileRef.current !== null && lastIsMobileRef.current !== isMobile) {
    initialFitDoneRef.current = false;
  }
  lastIsMobileRef.current = isMobile;

  // Store setViewport in a ref to avoid dependency issues
  const setViewportRef = useRef(gestures.setViewport);
  setViewportRef.current = gestures.setViewport;

  // Auto-fit canvas to view on mobile (runs once after container is measured)
  useEffect(() => {
    // Only run on mobile devices
    if (!isMobile) return;
    // Skip if already fitted
    if (initialFitDoneRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    // Use the canvas size from the hook (which uses effectiveWidth/Height)
    const canvasWidth = dragResizeHook.canvasSize.width;
    const canvasHeight = dragResizeHook.canvasSize.height;

    // Skip if canvas size isn't initialized yet
    if (canvasWidth < 100 || canvasHeight < 100) return;

    let retryCount = 0;
    const maxRetries = 10;
    let cancelled = false;
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;
    let pendingRaf: number | null = null;

    // Wait for container to have valid dimensions
    const attemptFit = (): boolean => {
      if (cancelled) return true; // Pretend success to stop retries

      const rect = container.getBoundingClientRect();

      // Use container dimensions if valid, otherwise fallback to window dimensions
      // minus estimated toolbar/header heights
      let containerWidth = rect.width;
      let containerHeight = rect.height;

      // Fallback to window dimensions if container not measured
      if (containerWidth < 100 || containerHeight < 100) {
        containerWidth = window.innerWidth;
        containerHeight = window.innerHeight - 150; // Subtract header/toolbar estimate
      }

      // Still invalid? Try again later
      if (containerWidth < 100 || containerHeight < 100) {
        return false;
      }

      // Calculate fit: scale canvas to fit container with padding
      const padding = 16;
      const availableWidth = containerWidth - padding * 2;
      const availableHeight = containerHeight - padding * 2;

      // Calculate zoom to fit canvas in container
      const scaleX = availableWidth / canvasWidth;
      const scaleY = availableHeight / canvasHeight;
      const zoom = Math.min(scaleX, scaleY, 1); // Don't zoom beyond 100%

      // Calculate pan to center canvas
      const scaledWidth = canvasWidth * zoom;
      const scaledHeight = canvasHeight * zoom;
      const panX = (containerWidth - scaledWidth) / 2;
      const panY = (containerHeight - scaledHeight) / 2;

      setViewportRef.current({ zoom, panX, panY });
      initialFitDoneRef.current = true;
      return true;
    };

    // Retry loop with increasing delays
    const scheduleRetry = () => {
      if (cancelled) return;

      if (retryCount >= maxRetries) {
        // Last resort: just center with zoom 1
        const fallbackPanX = Math.max(0, (window.innerWidth - canvasWidth) / 2);
        const fallbackPanY = Math.max(0, (window.innerHeight - 150 - canvasHeight) / 2);
        setViewportRef.current({ zoom: 1, panX: fallbackPanX, panY: fallbackPanY });
        initialFitDoneRef.current = true;
        return;
      }

      retryCount++;
      const delay = retryCount * 50; // 50ms, 100ms, 150ms, etc.

      pendingRaf = requestAnimationFrame(() => {
        if (cancelled) return;
        if (!attemptFit()) {
          pendingTimeout = setTimeout(scheduleRetry, delay);
        }
      });
    };

    // Try immediately
    if (!attemptFit()) {
      scheduleRetry();
    }

    // Cleanup on unmount
    return () => {
      cancelled = true;
      if (pendingTimeout) clearTimeout(pendingTimeout);
      if (pendingRaf) cancelAnimationFrame(pendingRaf);
    };
  }, [isMobile, dragResizeHook.canvasSize.width, dragResizeHook.canvasSize.height]);

  // Sticker hook
  const stickerHook = useMainCanvasStickers({
    canvasId,
    mode,
    externalWidgetManifests,
    addWidget: widgetHook.addWidget,
    setWidgets: widgetHook.setWidgets,
    deselectAll: () => setSelectedIds(new Set()),
    setIsCanvasResizeMode,
    isCanvasResizeMode,
  });

  // Navigation hook
  const navHook = useMainCanvasNavigation({
    containerRef,
    canvasSize: dragResizeHook.canvasSize,
    viewport: gestures.viewport,
    setViewport: gestures.setViewport,
    zoomIn: gestures.zoomIn,
    zoomOut: gestures.zoomOut,
    widgets,
    mode,
    selectedIds,
    selectedStickerId: stickerHook.selectedStickerId,
    isCanvasResizeMode,
    showStickerProperties: stickerHook.showStickerProperties,
    removeWidget: widgetHook.removeWidget,
    saveCanvas: widgetHook.saveCanvas,
    deselectAll: () => setSelectedIds(new Set()),
    selectSticker: stickerHook.selectSticker,
    handleStickerDelete: stickerHook.handleStickerDelete,
    handleCloseStickerProperties: stickerHook.handleCloseStickerProperties,
    setIsCanvasResizeMode,
  });

  // Auto-fit and center canvas when viewport mode changes (desktop mode switching)
  // Track the previous viewport mode to detect changes
  const prevViewportModeRef = useRef(viewportMode);
  useEffect(() => {
    // Only run when viewport mode actually changes (not on initial render)
    if (prevViewportModeRef.current === viewportMode) return;
    prevViewportModeRef.current = viewportMode;

    // Wait for container to be measured
    if (!containerDimensions.measured) return;

    const containerSize = {
      width: containerDimensions.width,
      height: containerDimensions.height,
    };

    // For mobile devices with screen-sized canvas, just center
    if (isMobile && Math.abs(effectiveWidth - containerSize.width) < 50) {
      setViewportRef.current({
        zoom: 1,
        panX: (containerSize.width - effectiveWidth) / 2,
        panY: (containerSize.height - effectiveHeight) / 2,
      });
    } else {
      // Fit canvas to view
      const newViewport = fitCanvasToView(
        effectiveWidth,
        effectiveHeight,
        containerSize,
        isMobile ? 16 : 40
      );
      setViewportRef.current(newViewport);
    }
  }, [viewportMode, containerDimensions.measured, containerDimensions.width, containerDimensions.height, effectiveWidth, effectiveHeight, isMobile]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRedoStore.undo();
      }

      // Ctrl+Y or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        undoRedoStore.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoRedoStore]);

  // Selection handler
  const handleSelect = useCallback((id: string, additive: boolean) => {
    if (isCanvasResizeMode) setIsCanvasResizeMode(false);
    setSelectedIds(prev => {
      const next = new Set(additive ? prev : []);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [isCanvasResizeMode]);

  // Mode change handler
  const handleModeChange = useCallback((newMode: CanvasMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
    if (newMode === 'view' || newMode === 'preview') {
      setSelectedIds(new Set());
      stickerHook.selectSticker(null);
      stickerHook.handleCloseStickerProperties();
    }
  }, [onModeChange, stickerHook]);

  // Canvas pointer handlers
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (!navHook.isCanvasBackground(e)) return;

    // Right click = marquee selection in edit mode
    if (e.button === 2 && mode === 'edit') {
      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
        setSelectedIds(new Set());
        stickerHook.selectSticker(null);
      }
      navHook.marqueeStartRef.current = { x: e.clientX, y: e.clientY };
      navHook.setIsMarqueeSelecting(true);
      navHook.setMarqueeRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }

    // Left click = panning
    if (e.button === 0) {
      navHook.setIsPanning(true);
      navHook.panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: gestures.viewport.panX,
        panY: gestures.viewport.panY,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }
  }, [navHook, mode, stickerHook, gestures.viewport]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    // Marquee selection
    if (navHook.isMarqueeSelecting && navHook.marqueeStartRef.current) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const { x: startX, y: startY } = navHook.marqueeStartRef.current;
      const currentX = e.clientX;
      const currentY = e.clientY;

      navHook.setMarqueeRect({
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      });

      // Convert to canvas coordinates and select intersecting widgets
      const startCanvasX = (startX - containerRect.left - gestures.viewport.panX) / gestures.viewport.zoom;
      const startCanvasY = (startY - containerRect.top - gestures.viewport.panY) / gestures.viewport.zoom;
      const currentCanvasX = (currentX - containerRect.left - gestures.viewport.panX) / gestures.viewport.zoom;
      const currentCanvasY = (currentY - containerRect.top - gestures.viewport.panY) / gestures.viewport.zoom;

      const box = {
        x: Math.min(startCanvasX, currentCanvasX),
        y: Math.min(startCanvasY, currentCanvasY),
        width: Math.abs(currentCanvasX - startCanvasX),
        height: Math.abs(currentCanvasY - startCanvasY),
      };

      const intersecting = widgets.filter(w => {
        if (w.locked) return false;
        // Use effective layout for hit testing in current viewport mode
        const layout = getWidgetLayout(w, viewportMode);
        if (!layout.visible) return false;
        return !(layout.position.x > box.x + box.width || layout.position.x + layout.width < box.x ||
                 layout.position.y > box.y + box.height || layout.position.y + layout.height < box.y);
      });

      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          intersecting.forEach(w => next.add(w.id));
          return next;
        });
      } else {
        setSelectedIds(new Set(intersecting.map(w => w.id)));
      }
      return;
    }

    // Panning
    if (!navHook.isPanning || !navHook.panStartRef.current) return;
    const deltaX = e.clientX - navHook.panStartRef.current.x;
    const deltaY = e.clientY - navHook.panStartRef.current.y;
    gestures.setViewport({
      panX: navHook.panStartRef.current.panX + deltaX,
      panY: navHook.panStartRef.current.panY + deltaY,
    });
  }, [navHook, gestures, widgets]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent) => {
    if (navHook.isMarqueeSelecting) {
      navHook.setIsMarqueeSelecting(false);
      navHook.marqueeStartRef.current = null;
      navHook.setMarqueeRect(null);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      return;
    }
    if (!navHook.isPanning) return;
    navHook.setIsPanning(false);
    navHook.panStartRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, [navHook]);

  // Canvas click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isBackground = target.dataset.canvasBackground !== undefined;
    const isContainer = target.dataset.canvasContainer !== undefined;
    const isResizeHandle = target.dataset.canvasResizeHandle !== undefined;

    if (isCanvasResizeMode && !isResizeHandle) {
      setIsCanvasResizeMode(false);
    }

    if (!navHook.isPanning && (isBackground || isContainer)) {
      setSelectedIds(new Set());
      stickerHook.selectSticker(null);
    }

    // Emit canvas click event
    if (isBackground && eventBus && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasX = (screenX - gestures.viewport.panX) / gestures.viewport.zoom;
      const canvasY = (screenY - gestures.viewport.panY) / gestures.viewport.zoom;

      if (canvasX >= 0 && canvasX <= dragResizeHook.canvasSize.width &&
          canvasY >= 0 && canvasY <= dragResizeHook.canvasSize.height) {
        eventBus.emit({
          type: 'canvas.click',
          scope: 'canvas',
          payload: {
            x: screenX,
            y: screenY,
            canvasX: Math.round(canvasX),
            canvasY: Math.round(canvasY),
            button: e.button,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            sourceCanvasId: canvasId,
          },
          timestamp: Date.now(),
        });
      }
    }
  }, [isCanvasResizeMode, navHook.isPanning, stickerHook, eventBus, gestures.viewport, dragResizeHook.canvasSize, canvasId]);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    getProperties: () => properties,
    setProperties: (p) => {
      setProperties(prev => { const next = { ...prev, ...p }; onCanvasPropertiesChange?.(next); return next; });
      setHasUnsavedChanges(true);
    },
    addWidget: widgetHook.addWidget,
    updateWidget: widgetHook.updateWidget,
    removeWidget: widgetHook.removeWidget,
    getWidgets: () => widgets,
    getSelectedIds: () => Array.from(selectedIds),
    save: widgetHook.saveCanvas,
    resetViewport: gestures.resetViewport,
    setMode: handleModeChange,
    fitToView: navHook.handleFitToView,
    fitToContent: navHook.handleFitToContent,
    centerCanvas: navHook.handleCenterCanvas,
    zoomTo: navHook.handleZoomTo,
  }), [properties, onCanvasPropertiesChange, widgetHook, widgets, selectedIds, gestures.resetViewport, handleModeChange, navHook]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const { viewport } = gestures;
  const safeArea = useSafeArea();
  const { canvasSize } = dragResizeHook;

  return (
    <div
      ref={containerRef}
      data-canvas-container
      className={`canvas2 ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'transparent',
        touchAction: 'none',
        overscrollBehavior: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: navHook.isPanning ? 'grabbing' : 'default',
      }}
      onClick={handleCanvasClick}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerLeave={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerUp}
      onDoubleClick={dragResizeHook.handleCanvasDoubleClick}
      onContextMenu={(e) => {
        if (mode === 'edit' && navHook.isCanvasBackground(e as any)) {
          e.preventDefault();
        }
      }}
    >
      {/* Canvas Background */}
      <CanvasBackground
        canvasId={canvasId}
        viewport={viewport}
        canvasSize={canvasSize}
        properties={properties}
        canvasController={canvasController}
        backgroundStyle={backgroundStyle}
        mode={mode}
        isPanning={navHook.isPanning}
        isCanvasResizeMode={isCanvasResizeMode}
      />

      {/* Canvas Resize Handles */}
      {isCanvasResizeMode && (
        <CanvasResizeHandles
          viewport={viewport}
          canvasSize={canvasSize}
          accentColor={accentColor}
          onResizeStart={dragResizeHook.handleCanvasResizeStart}
          onResizeMove={dragResizeHook.handleCanvasResizeMove}
          onResizeEnd={dragResizeHook.handleCanvasResizeEnd}
        />
      )}

      {/* Widget Transform Container */}
      <div
        data-canvas-transform
        style={{
          position: 'absolute',
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          width: canvasSize.width,
          height: canvasSize.height,
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        {/* Empty State */}
        {widgets.length === 0 && stickerHook.stickers.length === 0 && (
          <CanvasEmptyState mode={mode} />
        )}

        {/* Widgets */}
        {widgets.map(widget => {
          // Apply viewport-specific layout (mobile vs web mode)
          const effectiveWidget = applyViewportLayout(widget, viewportMode);

          // Skip rendering if widget is hidden in this viewport mode
          if (!effectiveWidget.visible) return null;

          return (
            <WidgetWrapper
              key={widget.id}
              widget={effectiveWidget}
              isSelected={selectedIds.has(widget.id)}
              isEditMode={mode === 'edit'}
              accentColor={accentColor}
              onSelect={handleSelect}
              onDragStart={dragResizeHook.handleDragStart}
              onDragMove={dragResizeHook.handleDragMove}
              onDragEnd={dragResizeHook.handleDragEnd}
              onResizeStart={dragResizeHook.handleResizeStart}
              onDelete={widgetHook.removeWidget}
              onUpdateWidget={widgetHook.updateWidget}
              onClose={stickerHook.widgetToStickerMap.has(widget.id) ? stickerHook.handleWidgetClose : undefined}
              onDock={onDockWidget}
            >
              {renderWidget(effectiveWidget)}
            </WidgetWrapper>
          );
        })}

        {/* Stickers */}
        {stickerHook.stickers.map((sticker) => (
          <StickerFrame
            key={sticker.id}
            sticker={sticker}
            isSelected={stickerHook.selectedStickerId === sticker.id}
            isEditMode={mode === 'edit'}
            viewport={viewport}
            onSelect={stickerHook.handleStickerSelect}
            onMove={stickerHook.handleStickerMove}
            onResize={stickerHook.handleStickerResize}
            onRotate={stickerHook.handleStickerRotate}
            onClick={stickerHook.handleStickerClick}
            onDoubleClick={stickerHook.handleStickerDoubleClick}
            onContextMenu={stickerHook.handleStickerContextMenu}
            onDelete={stickerHook.handleStickerDelete}
            onOpenProperties={stickerHook.handleStickerOpenProperties}
            canvasBounds={{ width: canvasSize.width, height: canvasSize.height }}
            gridSnap={properties.snapToGrid}
            gridSize={properties.gridSize}
          />
        ))}

        {/* Marquee Selection Box */}
        {navHook.isMarqueeSelecting && navHook.marqueeRect && (
          <MarqueeSelection rect={navHook.marqueeRect} accentColor={accentColor} />
        )}

        {/* Canvas Entities */}
        <CanvasEntityLayer
          isEditing={mode === 'edit'}
          zoom={viewport.zoom}
          snapToGrid={properties.snapToGrid}
          gridSize={properties.gridSize}
        />
      </div>

      {/* Canvas Mask Overlay - hides content outside canvas bounds */}
      <CanvasMaskOverlay
        viewport={viewport}
        canvasSize={canvasSize}
        borderRadius={borderSettings.radius}
      />

      {/* Controls */}
      <CanvasControlsLayout
        mode={mode}
        onModeChange={handleModeChange}
        zoom={viewport.zoom}
        onZoomIn={gestures.zoomIn}
        onZoomOut={gestures.zoomOut}
        onZoomReset={gestures.resetViewport}
        hasUnsavedChanges={hasUnsavedChanges}
        showModeToggle={showModeToggle}
        showZoomControls={showZoomControls}
        accentColor={accentColor}
        showModeHint={showModeHint}
      />

      {/* Navigator */}
      {!isMobile && showNavigator && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: safeArea.right + 8,
            transform: 'translateY(-50%)',
            zIndex: 100,
          }}
        >
          <CanvasNavigator
            zoom={viewport.zoom}
            onFitToView={navHook.handleFitToView}
            onFitToContent={navHook.handleFitToContent}
            onZoomTo={navHook.handleZoomTo}
            onCenterCanvas={navHook.handleCenterCanvas}
            hasContent={widgets.length > 0}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Minimap */}
      {!isMobile && showMinimap && (
        <div
          style={{
            position: 'absolute',
            bottom: safeArea.bottom + 60,
            left: safeArea.left + 8,
            zIndex: 99,
          }}
        >
          <Minimap
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            viewportZoom={viewport.zoom}
            viewportPanX={viewport.panX}
            viewportPanY={viewport.panY}
            containerWidth={containerRef.current?.clientWidth || 800}
            containerHeight={containerRef.current?.clientHeight || 600}
            widgets={widgets.map(w => applyViewportLayout(w, viewportMode)).filter(w => w.visible !== false)}
            onNavigate={navHook.handleMinimapNavigate}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Sticker Properties Panel */}
      {stickerHook.showStickerProperties && stickerHook.editingSticker && (
        <StickerPropertiesPanel
          sticker={stickerHook.editingSticker}
          availableWidgets={stickerHook.availableWidgets}
          onClose={stickerHook.handleCloseStickerProperties}
          onDelete={stickerHook.handleStickerDelete}
        />
      )}

      {/* Mobile Gesture Hints */}
      <MobileGestureHint />

      {/* Mobile Toolbar */}
      {isMobile && (
        <MobileToolbar
          mode={mode}
          showModeToggle={showModeToggle}
          canUndo={canUndo}
          canRedo={canRedo}
          hasSelection={selectedIds.size > 0}
          onUndo={() => undoRedoStore.undo()}
          onRedo={() => undoRedoStore.redo()}
          onAdd={() => {
            widgetHook.addWidget({
              defId: 'stickernest.basic-text',
              position: { x: 100, y: 100 },
              width: 200,
              height: 100,
            });
          }}
          onDelete={() => {
            selectedIds.forEach(id => widgetHook.removeWidget(id));
            setSelectedIds(new Set());
          }}
          onFitView={navHook.handleFitToView}
          onModeChange={handleModeChange}
        />
      )}

      {/* Children */}
      {children && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
          <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}));

export default MainCanvas;

// Re-export types for backwards compatibility
export type { MainCanvasProps as Canvas2Props, MainCanvasRef as Canvas2Ref };
export { MainCanvas as Canvas2 };
