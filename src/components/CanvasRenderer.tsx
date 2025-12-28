/**
 * StickerNest v2 - CanvasRenderer
 * Renders widgets on canvas with selection, drag, resize, and rotate support
 *
 * REFACTORED (Dec 2024): Extracted hooks and components to ./canvas-renderer/
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { RuntimeContext } from '../runtime/RuntimeContext';
import { CanvasRuntime } from '../runtime/CanvasRuntime';
import { PipelineRuntime } from '../runtime/PipelineRuntime';
import { getWidgetIOBridge, destroyWidgetIOBridge } from '../runtime/WidgetIOBridge';
import { WidgetInstance, Pipeline, CanvasSettings, DEFAULT_CANVAS_SETTINGS, StickerInstance } from '../types/domain';
import { CanvasMode } from '../types/runtime';
import { WidgetManifest } from '../types/manifest';
import { WidgetFrame } from './WidgetFrame';
import { CanvasMinimap } from './CanvasMinimap';
import { StickerFrame } from './StickerFrame';
import { SelectionBox } from './SelectionBox';
import { WidgetConnectionOverlay } from './WidgetConnectionOverlay';
import { WidgetIOPorts } from './WidgetIOPorts';
import { PipelineDebugger } from './PipelineDebugger';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { LayerPanel } from './LayerPanel';
import { BuiltinWidgetWrapper } from './BuiltinWidgetWrapper';
import { getBuiltinWidget } from '../widgets/builtin';
import { FloatingPanelOverlay } from './panels/FloatingPanelOverlay';
import { MarqueeSelection } from './MarqueeSelection';
import { SmartGuides } from './SmartGuides';
import { SelectionBoundsOverlay } from './SelectionBoundsOverlay';
import { WidgetContextMenu } from './WidgetContextMenu';
import { usePanelsStore } from '../state/usePanelsStore';
import { useCanvasStore } from '../state/useCanvasStore';
import { useStickerStore } from '../state/useStickerStore';
import { useCanvasEntityStore } from '../state/useCanvasEntityStore';
import { useCanvasExtendedStore, useIsCanvasLocked } from '../state/useCanvasExtendedStore';
import { useCanvasAppearanceStore } from '../state/useCanvasAppearanceStore';
import { useWidgetSync } from '../hooks/useWidgetSync';
import { useCanvasController } from '../hooks/useCanvasController';
import { useCanvasGestures } from '../hooks/useCanvasGestures';
import { useDesignToolEvents } from '../hooks/useDesignToolEvents';
import { useToolCanvasInteraction } from '../hooks/useToolCanvasInteraction';
import { useCrossCanvasEvents } from '../hooks/useCanvasRouter';
import { useCanvasWidgetBridge } from '../hooks/useCanvasWidgetBridge';
import { listPipelinesForCanvas } from '../services/pipelinesClient';
// Extracted canvas-renderer modules
import {
  VisualEffectsLayer,
  ZoomControlsBar,
  SelectionInfoPanel,
  EmptyCanvasState,
  CanvasToolbarButtons,
  GestureHint,
  DropZoneIndicator,
  StickerAnimationStyles,
  useCanvasKeyboardShortcuts,
  useStickerHandlers,
  useCanvasDragDrop,
  useWidgetHandlers,
} from './canvas-renderer';

interface CanvasRendererProps {
  runtime: RuntimeContext;
  canvasRuntime?: CanvasRuntime;
  mode: CanvasMode;
  gridSnap?: boolean;
  gridSize?: number;
  onModeChange?: (mode: CanvasMode) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  settings?: CanvasSettings;
  showDebuggerButton?: boolean;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  runtime,
  canvasRuntime,
  mode,
  gridSnap = false,
  gridSize = 10,
  onModeChange,
  canvasWidth = 1920,
  canvasHeight = 1080,
  settings = DEFAULT_CANVAS_SETTINGS,
  showDebuggerButton = true,
}) => {
  // Widget sync
  const { widgets } = useWidgetSync({ runtime });
  const canvasBounds = useMemo(() => ({ width: canvasWidth, height: canvasHeight }), [canvasWidth, canvasHeight]);

  // Local state
  const [viewportBounds, setViewportBounds] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineRuntime, setPipelineRuntime] = useState<PipelineRuntime | null>(null);
  const [manifests, setManifests] = useState<Map<string, WidgetManifest>>(new Map());
  const [showDebugger, setShowDebugger] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; widgetId: string | null } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGesturing, setIsGesturing] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasSurfaceRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clipboardRef = useRef<WidgetInstance[] | null>(null);

  // Canvas controller - pass initial background from settings or canvas background config
  const canvasController = useCanvasController({
    eventBus: runtime.eventBus,
    canvasId: runtime.canvasId,
    initialBackground: settings.background,
  });

  // Cross-canvas communication
  useCrossCanvasEvents(runtime.eventBus, runtime.canvasId, runtime.userId);

  // Design tool events
  useDesignToolEvents({
    eventBus: runtime.eventBus,
    runtime,
    canvasId: runtime.canvasId,
    enabled: true,
  });

  // Canvas Widget Bridge
  useCanvasWidgetBridge({
    eventBus: runtime.eventBus,
    canvasId: runtime.canvasId,
    pipelineRuntime,
    enabled: true,
    debug: false,
  });

  // Tool canvas interaction
  const { handleCanvasToolClick, shouldCreateOnClick, getToolCursor } = useToolCanvasInteraction({
    eventBus: runtime.eventBus,
    canvasId: runtime.canvasId,
    enabled: true,
  });

  // Store state
  const selection = useCanvasStore(state => state.selection);
  const select = useCanvasStore(state => state.select);
  const selectMultiple = useCanvasStore(state => state.selectMultiple);
  const deselectAll = useCanvasStore(state => state.deselectAll);
  const setSelectionBox = useCanvasStore(state => state.setSelectionBox);
  const moveSelectedWidgets = useCanvasStore(state => state.moveSelectedWidgets);
  const grid = useCanvasStore(state => state.grid);
  const setGrid = useCanvasStore(state => state.setGrid);
  const storeUpdateWidget = useCanvasStore(state => state.updateWidget);
  const duplicateSelectedWidgets = useCanvasStore(state => state.duplicateSelectedWidgets);
  const bringToFront = useCanvasStore(state => state.bringToFront);
  const sendToBack = useCanvasStore(state => state.sendToBack);
  const alignSelectedWidgets = useCanvasStore(state => state.alignSelectedWidgets);
  const undo = useCanvasStore(state => state.undo);
  const redo = useCanvasStore(state => state.redo);
  const addWidget = useCanvasStore(state => state.addWidget);
  const getSelectedWidgets = useCanvasStore(state => state.getSelectedWidgets);
  const groupSelectedWidgets = useCanvasStore(state => state.groupSelectedWidgets);
  const ungroupSelectedWidgets = useCanvasStore(state => state.ungroupSelectedWidgets);
  const lockSelectedWidgets = useCanvasStore(state => state.lockSelectedWidgets);
  const unlockSelectedWidgets = useCanvasStore(state => state.unlockSelectedWidgets);
  const hideSelectedWidgets = useCanvasStore(state => state.hideSelectedWidgets);

  const effectiveGridSnap = gridSnap || grid.snapToGrid;
  const effectiveGridSize = gridSize || grid.gridSize;

  // Canvas lock state
  const isCanvasLocked = useIsCanvasLocked();
  const toggleCanvasLock = useCanvasExtendedStore(s => s.toggleCanvasLock);

  // Canvas appearance store (for settings dropdown integration)
  const appearanceStyle = useCanvasAppearanceStore(s => s.getCanvasStyle());
  const appearanceBorder = useCanvasAppearanceStore(s => s.border);
  const appearanceBackground = useCanvasAppearanceStore(s => s.background);
  const appearanceGlass = useCanvasAppearanceStore(s => s.glass);

  // Sticker store
  const allStickers = useStickerStore(state => state.stickers);
  const addSticker = useStickerStore(state => state.addSticker);
  const selectSticker = useStickerStore(state => state.selectSticker);
  const selectedStickerId = useStickerStore(state => state.selectedStickerId);
  const moveSticker = useStickerStore(state => state.moveSticker);
  const resizeSticker = useStickerStore(state => state.resizeSticker);
  const rotateSticker = useStickerStore(state => state.rotateSticker);
  const removeSticker = useStickerStore(state => state.removeSticker);
  const setWidgetVisible = useStickerStore(state => state.setWidgetVisible);

  const stickers = useMemo(() =>
    Array.from(allStickers.values()).filter(s => s.canvasId === runtime.canvasId),
    [allStickers, runtime.canvasId]
  );

  // Canvas entities (images, text, shapes, etc.)
  const canvasEntities = useCanvasEntityStore(state => state.entities);

  // Docked widgets
  const dockedPanelWidgets = usePanelsStore(state => state.dockedPanelWidgets);
  const dockedWidgetIds = useMemo(() => new Set(dockedPanelWidgets.keys()), [dockedPanelWidgets]);

  // Canvas gestures
  const { viewport, getGestureState, zoomTo, zoomIn, zoomOut, resetViewport, isSpaceHeld, zoomLevels } = useCanvasGestures(
    containerRef,
    {
      settings,
      enabled: true,
      mode,
      canvasBounds,
      onGestureStart: () => setIsGesturing(true),
      onGestureEnd: () => setIsGesturing(false),
    }
  );

  // Fit to viewport
  const fitToViewport = useCallback(() => {
    if (viewportBounds.width === 0 || viewportBounds.height === 0) return;
    const padding = 40;
    const scaleX = (viewportBounds.width - padding * 2) / canvasWidth;
    const scaleY = (viewportBounds.height - padding * 2) / canvasHeight;
    const fitZoom = Math.min(scaleX, scaleY, 1);
    zoomTo(fitZoom);
    resetViewport();
  }, [viewportBounds, canvasWidth, canvasHeight, zoomTo, resetViewport]);

  // Center offset
  const centerOffset = useMemo(() => {
    if (viewportBounds.width === 0 || viewportBounds.height === 0) {
      return { x: 50, y: 50 };
    }
    const scaledCanvasWidth = canvasWidth * viewport.zoom;
    const scaledCanvasHeight = canvasHeight * viewport.zoom;
    return {
      x: Math.max(50, (viewportBounds.width - scaledCanvasWidth) / 2),
      y: Math.max(50, (viewportBounds.height - scaledCanvasHeight) / 2),
    };
  }, [viewportBounds, canvasWidth, canvasHeight, viewport.zoom]);

  // Widget handlers hook
  const { handleSelect, handleDrag, handleResize, handleRotate } = useWidgetHandlers({
    runtime,
    canvasRuntime,
    isCanvasLocked,
    widgets,
    eventBus: runtime.eventBus,
    select,
    storeUpdateWidget,
  });

  // Sticker handlers hook
  const stickerHandlers = useStickerHandlers({
    mode,
    eventBus: runtime.eventBus,
    deselectAll,
    selectSticker,
    moveSticker,
    resizeSticker,
    rotateSticker,
    removeSticker,
    setWidgetVisible,
  });

  // Drag/drop hook
  const dragDropHandlers = useCanvasDragDrop({
    mode,
    canvasSurfaceRef,
    containerRef,
    viewport,
    canvasBounds,
    widgets,
    eventBus: runtime.eventBus,
    canvasId: runtime.canvasId,
    selection,
    deselectAll,
    selectMultiple,
    setSelectionBox,
    addSticker,
  });

  // Keyboard shortcuts hook
  useCanvasKeyboardShortcuts({
    mode,
    selection,
    widgets,
    effectiveGridSize,
    isCanvasLocked,
    eventBus: runtime.eventBus,
    onModeChange,
    showShortcutsHelp,
    setShowShortcutsHelp,
    setShowLayerPanel,
    settings,
    viewport,
    zoomIn,
    zoomOut,
    zoomTo,
    resetViewport,
    fitToViewport,
    select,
    selectMultiple,
    deselectAll,
    moveSelectedWidgets,
    handleDrag,
    duplicateSelectedWidgets,
    bringToFront,
    sendToBack,
    alignSelectedWidgets,
    storeUpdateWidget,
    addWidget,
    getSelectedWidgets,
    groupSelectedWidgets,
    ungroupSelectedWidgets,
    lockSelectedWidgets,
    unlockSelectedWidgets,
    hideSelectedWidgets,
    toggleCanvasLock,
    grid,
    setGrid,
    undo,
    redo,
    clipboardRef,
  });

  // Update viewport bounds on resize
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        setViewportBounds({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, []);

  // Initialize canvas runtime
  useEffect(() => {
    if (canvasRuntime && containerRef.current && !canvasRuntime.getContext()) {
      const storageUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      canvasRuntime.initialize(containerRef.current, storageUrl, runtime).catch(console.error);
    }
  }, [canvasRuntime, runtime]);

  // Mount HTML-based widgets
  useEffect(() => {
    if (!canvasRuntime || !canvasRuntime.getContext()) return;
    const widgetsToMount = widgets.filter(widget => {
      // Skip if already mounted
      if (canvasRuntime.getMountedWidget(widget.id)) return false;
      // Skip if currently mounting (prevents race condition)
      if (canvasRuntime.isMounting(widget.id)) return false;
      // Skip React component widgets (they render directly)
      const builtin = getBuiltinWidget(widget.widgetDefId);
      if (builtin?.component) return false;
      return true;
    });
    if (widgetsToMount.length > 0) {
      Promise.all(widgetsToMount.map(widget =>
        canvasRuntime.mountWidget(widget).catch(err => console.warn(`Failed to mount widget ${widget.id}:`, err))
      ));
    }
  }, [canvasRuntime, widgets]);

  // Initialize Pipeline Runtime
  useEffect(() => {
    const ioBridge = getWidgetIOBridge({ eventBus: runtime.eventBus, debugEnabled: true });
    const pRuntime = new PipelineRuntime(runtime.canvasId, runtime.eventBus, true);
    setPipelineRuntime(pRuntime);

    const reloadPipelines = async () => {
      try {
        const loadedPipelines = await listPipelinesForCanvas(runtime.canvasId);
        setPipelines(loadedPipelines);
        pRuntime.loadPipelines(loadedPipelines);
      } catch (err) {
        console.warn('Failed to load pipelines:', err);
      }
    };

    reloadPipelines();
    const unsubLoaded = runtime.eventBus.on('dashboard:loaded', reloadPipelines);
    const unsubSaved = runtime.eventBus.on('pipeline:saved', (event) => {
      if (event.payload?.pipeline) pRuntime.updatePipeline(event.payload.pipeline);
      reloadPipelines();
    });
    const unsubDeleted = runtime.eventBus.on('pipeline:deleted', reloadPipelines);

    return () => {
      pRuntime.destroy();
      destroyWidgetIOBridge();
      unsubLoaded();
      unsubSaved();
      unsubDeleted();
    };
  }, [runtime.canvasId, runtime.eventBus]);

  // Clear selection when switching to view mode
  useEffect(() => {
    if (mode === 'view') deselectAll();
  }, [mode, deselectAll]);

  // Load manifests from widget metadata
  useEffect(() => {
    const newManifests = new Map<string, WidgetManifest>();
    widgets.forEach(widget => {
      const manifest = widget.metadata?.generatedContent?.manifest;
      if (manifest) newManifests.set(widget.widgetDefId, manifest);
    });
    setManifests(newManifests);
  }, [widgets]);

  // Register widgets with PipelineRuntime
  useEffect(() => {
    if (!pipelineRuntime) return;
    const widgetList = widgets.map(w => ({ id: w.id, widgetDefId: w.widgetDefId }));
    pipelineRuntime.updateLiveWidgets(widgetList);
    widgets.forEach(widget => {
      const manifest = manifests.get(widget.widgetDefId) || widget.metadata?.generatedContent?.manifest;
      if (manifest?.events?.listens) {
        pipelineRuntime.registerBroadcastListener(widget.id, manifest.events.listens);
      }
    });
  }, [pipelineRuntime, widgets, manifests]);

  // Handle click on canvas background
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const isCanvasBackground = e.target === containerRef.current || e.target === canvasSurfaceRef.current;
    if (!isCanvasBackground) return;
    if (shouldCreateOnClick()) {
      const canvasRect = canvasSurfaceRef.current?.getBoundingClientRect();
      if (canvasRect && handleCanvasToolClick(e, canvasRect)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    deselectAll();
    selectSticker(null);
  }, [deselectAll, selectSticker, shouldCreateOnClick, handleCanvasToolClick]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const widgetFrame = target.closest('[data-widget-frame]');
    const widgetId = widgetFrame?.getAttribute('data-widget-frame') || null;
    setContextMenu({ x: e.clientX, y: e.clientY, widgetId });
  }, []);

  // Get widget content
  const getWidgetContent = (widget: WidgetInstance) => {
    const builtin = getBuiltinWidget(widget.widgetDefId);
    if (builtin?.component) {
      return <BuiltinWidgetWrapper instance={widget} component={builtin.component} runtime={runtime} />;
    }
    if (canvasRuntime) {
      const mounted = canvasRuntime.getMountedWidget(widget.id);
      if (mounted?.sandboxHost) {
        const iframe = mounted.sandboxHost.getIframe();
        if (iframe) {
          return (
            <div style={{ width: '100%', height: '100%', background: '#fff' }}
              ref={(el) => { if (el && iframe && iframe.parentElement !== el) el.appendChild(iframe); }}
            />
          );
        }
      }
    }
    return (
      <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>{widget.widgetDefId}</div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>ID: {widget.id.slice(0, 8)}...</div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="canvas-renderer"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0f0f1a',
        backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0f0f1a 100%)',
        border: mode === 'edit' ? '2px solid #4a9eff' : (mode === 'connect' ? '2px solid #8b5cf6' : '2px solid transparent'),
        boxSizing: 'border-box',
        cursor: isGesturing ? 'grabbing' : (isSpaceHeld || settings.scrollMode === 'pan' ? 'grab' : 'default'),
        touchAction: settings.zoom.pinchZoom || settings.touch.panEnabled ? 'none' : 'auto',
      }}
    >
      {/* Canvas surface */}
      <div
        ref={canvasSurfaceRef}
        className="canvas-surface"
        onClick={handleCanvasClick}
        onContextMenu={handleContextMenu}
        onMouseDown={dragDropHandlers.handleDragSelectStart}
        onMouseMove={dragDropHandlers.handleDragSelectMove}
        onMouseUp={dragDropHandlers.handleDragSelectEnd}
        onMouseLeave={dragDropHandlers.handleDragSelectEnd}
        onDragOver={dragDropHandlers.handleCanvasDragOver}
        onDragLeave={dragDropHandlers.handleCanvasDragLeave}
        onDrop={dragDropHandlers.handleCanvasDrop}
        style={{
          position: 'absolute',
          width: canvasWidth,
          height: canvasHeight,
          overflow: 'hidden',
          ...canvasController.canvasStyles.background,
          backgroundColor: mode === 'connect'
            ? '#1a1a2e'
            : appearanceGlass.enabled
              ? appearanceGlass.tint
              : (canvasController.canvasStyles.background.backgroundColor || appearanceBackground.color || 'rgba(15, 15, 25, 0.25)'),
          cursor: dragDropHandlers.isDragSelecting ? 'crosshair' : (mode === 'connect' ? 'crosshair' : (shouldCreateOnClick() ? getToolCursor() : 'default')),
          touchAction: settings.scrollMode === 'fixed' ? 'none' : 'auto',
          filter: canvasController.canvasStyles.filter,
          left: settings.scrollMode === 'fixed' ? 0 : (centerOffset.x + viewport.panX),
          top: settings.scrollMode === 'fixed' ? 0 : (centerOffset.y + viewport.panY),
          transform: `scale(${settings.scrollMode === 'fixed' ? 1 : viewport.zoom})`,
          transformOrigin: settings.scrollMode === 'fixed' ? 'center center' : 'top left',
          transition: isGesturing ? 'none' : 'transform 0.15s ease-out, left 0.15s ease-out, top 0.15s ease-out',
          boxShadow: appearanceGlass.enabled
            ? '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : '0 0 0 1px rgba(255, 255, 255, 0.1), 0 4px 20px rgba(0, 0, 0, 0.4), 0 8px 40px rgba(0, 0, 0, 0.3)',
          borderRadius: appearanceBorder.radius,
          ...(appearanceBorder.enabled && appearanceBorder.width > 0 && {
            border: `${appearanceBorder.width}px ${appearanceBorder.style} ${appearanceBorder.color}`,
          }),
          ...(appearanceGlass.enabled && {
            backdropFilter: `blur(${appearanceGlass.blur}px) saturate(${appearanceGlass.saturation}%)`,
            WebkitBackdropFilter: `blur(${appearanceGlass.blur}px) saturate(${appearanceGlass.saturation}%)`,
          }),
          backgroundImage: (mode === 'edit' || mode === 'connect') && (effectiveGridSnap || grid.showGrid)
            ? `radial-gradient(circle, ${canvasController.state.grid.color || 'rgba(0,0,0,0.15)'} 1px, transparent 1px)`
            : undefined,
          backgroundSize: (mode === 'edit' || mode === 'connect') && (effectiveGridSnap || grid.showGrid)
            ? `${canvasController.state.grid.size || effectiveGridSize}px ${canvasController.state.grid.size || effectiveGridSize}px`
            : undefined,
          outline: isDragOverCanvas ? '3px dashed #8b5cf6' : 'none',
        }}
      >
        {/* Canvas dimension label */}
        <div style={{ position: 'absolute', top: -28, left: 0, padding: '4px 10px', background: 'rgba(0, 0, 0, 0.7)', color: '#94a3b8', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', fontWeight: 500, pointerEvents: 'none' }}>
          {canvasWidth} × {canvasHeight}
        </div>

        <DropZoneIndicator visible={isDragOverCanvas} />

        {/* Video background */}
        {canvasController.state.background.type === 'video' && canvasController.videoElement && (
          <video ref={videoRef} src={canvasController.state.background.videoSrc} autoPlay loop muted playsInline
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }}
          />
        )}

        {/* Overlay effect */}
        {canvasController.overlayStyles && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 999, ...canvasController.overlayStyles }} />
        )}

        {/* Mode indicator */}
        {(mode === 'edit' || mode === 'connect') && (
          <div style={{ position: 'absolute', top: 8, left: 8, padding: '4px 8px', background: mode === 'connect' ? '#8b5cf6' : '#4a9eff', color: '#fff', borderRadius: 4, fontSize: 11, fontWeight: 'bold', zIndex: 1000, pointerEvents: 'none' }}>
            {mode === 'connect' ? 'CONNECT MODE' : 'EDIT MODE'}
          </div>
        )}

        {/* Grid snap indicator */}
        {mode === 'edit' && gridSnap && (
          <div style={{ position: 'absolute', top: 8, left: 100, padding: '4px 8px', background: '#9acd32', color: '#fff', borderRadius: 4, fontSize: 11, zIndex: 1000, pointerEvents: 'none' }}>
            SNAP: {gridSize}px
          </div>
        )}

        {/* Widgets */}
        {widgets.filter(widget => widget.visible !== false && !dockedWidgetIds.has(widget.id)).map((widget) => (
          <WidgetFrame
            key={widget.id}
            instance={widget}
            selected={selection.selectedIds.has(widget.id)}
            isMultiSelected={selection.selectedIds.size > 1 && selection.selectedIds.has(widget.id)}
            mode={mode}
            gridSnap={effectiveGridSnap}
            gridSize={effectiveGridSize}
            canvasBounds={canvasBounds}
            viewport={viewport}
            scaleMode={widget.scaleMode || manifests.get(widget.widgetDefId)?.size?.scaleMode || settings.widgetDefaults.scaleMode}
            nativeWidth={widget.contentSize?.width || manifests.get(widget.widgetDefId)?.size?.width || widget.width}
            nativeHeight={widget.contentSize?.height || manifests.get(widget.widgetDefId)?.size?.height || widget.height}
            isGesturing={isGesturing}
            onSelect={handleSelect}
            onDrag={handleDrag}
            onResize={handleResize}
            onRotate={handleRotate}
          >
            {getWidgetContent(widget)}
          </WidgetFrame>
        ))}

        {/* Stickers */}
        {stickers.map((sticker) => (
          <StickerFrame
            key={sticker.id}
            sticker={sticker}
            isSelected={selectedStickerId === sticker.id}
            isEditMode={mode === 'edit'}
            viewport={viewport}
            onSelect={stickerHandlers.handleStickerSelect}
            onMove={stickerHandlers.handleStickerMove}
            onResize={stickerHandlers.handleStickerResize}
            onRotate={stickerHandlers.handleStickerRotate}
            onClick={stickerHandlers.handleStickerClick}
            onDoubleClick={stickerHandlers.handleStickerDoubleClick}
            onContextMenu={stickerHandlers.handleStickerContextMenu}
            onDelete={stickerHandlers.handleStickerDelete}
            onOpenProperties={stickerHandlers.handleStickerOpenProperties}
            canvasBounds={canvasBounds}
            gridSnap={effectiveGridSnap}
            gridSize={effectiveGridSize}
          />
        ))}

        {/* Selection Box */}
        {selection.selectionBox && dragDropHandlers.isDragSelecting && (
          <SelectionBox box={selection.selectionBox} />
        )}

        <SelectionInfoPanel selectedIds={selection.selectedIds} widgets={widgets} visible={mode === 'edit'} />

        {/* Widget IO Ports - connect mode */}
        {mode === 'connect' && widgets.map(widget => (
          <div key={`ports-${widget.id}`} style={{ position: 'absolute', left: widget.position.x, top: widget.position.y, width: widget.width, height: widget.height, pointerEvents: 'none', zIndex: widget.zIndex + 1 }}>
            <WidgetIOPorts widgetId={widget.id} manifest={manifests.get(widget.widgetDefId) || widget.metadata?.generatedContent?.manifest || null} width={widget.width} height={widget.height} pipelines={pipelines} interactive={true} showLabels={false} />
          </div>
        ))}

        {/* Widget Connection Overlay */}
        {mode === 'connect' && <WidgetConnectionOverlay widgets={widgets} runtime={runtime} manifests={manifests} canvasId={runtime.canvasId} />}

        {/* Debugger toggle */}
        {showDebuggerButton && (
          <button onClick={() => setShowDebugger(!showDebugger)} title={showDebugger ? 'Close Debugger' : 'Open Debugger'}
            style={{ position: 'absolute', bottom: 8, right: 8, width: 32, height: 32, padding: 0, background: showDebugger ? '#8b5cf6' : 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {showDebugger ? '✕' : '⚡'}
          </button>
        )}

        <PipelineDebugger eventBus={runtime.eventBus} isOpen={showDebugger} onClose={() => setShowDebugger(false)}
          widgetNames={new Map(widgets.map(w => [w.id, manifests.get(w.widgetDefId)?.name || w.widgetDefId.split('/').pop() || w.id.slice(0, 8)]))}
        />
      </div>

      {/* Empty Canvas State */}
      {widgets.length === 0 && stickers.length === 0 && canvasEntities.size === 0 && <EmptyCanvasState mode={mode} />}

      <FloatingPanelOverlay canvasId={runtime.canvasId} canvasBounds={canvasBounds} />

      {/* Canvas info bar */}
      <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pointerEvents: 'none', zIndex: 1002 }}>
        {settings.showSizeIndicator && (
          <div style={{ padding: '4px 8px', background: 'rgba(0, 0, 0, 0.7)', color: '#94a3b8', borderRadius: 4, fontSize: 10, fontFamily: 'monospace' }}>
            {canvasWidth} × {canvasHeight}
          </div>
        )}
        <ZoomControlsBar viewport={viewport} settings={settings} zoomLevels={zoomLevels} zoomIn={zoomIn} zoomOut={zoomOut} zoomTo={zoomTo} fitToViewport={fitToViewport} />
      </div>

      <GestureHint isGesturing={isGesturing} isSpaceHeld={isSpaceHeld} gestureType={getGestureState().gestureType} />
      <StickerAnimationStyles />
      <CanvasToolbarButtons showLayerPanel={showLayerPanel} onToggleLayerPanel={() => setShowLayerPanel(prev => !prev)} onShowShortcutsHelp={() => setShowShortcutsHelp(true)} />
      <KeyboardShortcutsHelp isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
      <LayerPanel isOpen={showLayerPanel} onClose={() => setShowLayerPanel(false)} />

      {mode === 'edit' && isDragging && <SmartGuides canvasBounds={canvasBounds} enabled={true} showCenterGuides={true} />}
      {mode === 'edit' && <SelectionBoundsOverlay enabled={true} canvasBounds={canvasBounds} gridSize={effectiveGridSize} snapToGrid={effectiveGridSnap} />}
      {mode === 'edit' && <MarqueeSelection enabled={true} containerRef={canvasSurfaceRef} viewportOffset={{ x: viewport.panX, y: viewport.panY }} zoom={viewport.zoom} />}

      {contextMenu && <WidgetContextMenu x={contextMenu.x} y={contextMenu.y} widgetId={contextMenu.widgetId} onClose={() => setContextMenu(null)} />}
      <VisualEffectsLayer eventBus={runtime.eventBus} />
      {mode === 'edit' && <CanvasMinimap canvasWidth={canvasWidth} canvasHeight={canvasHeight} containerWidth={containerRef.current?.offsetWidth || 800} containerHeight={containerRef.current?.offsetHeight || 600} widgets={widgets} position="bottom-right" />}
    </div>
  );
};

export default CanvasRenderer;
