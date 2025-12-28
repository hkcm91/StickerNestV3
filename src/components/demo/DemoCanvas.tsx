/**
 * StickerNest v2 - Demo Canvas Component
 *
 * A fully interactive canvas viewer for the landing page.
 * Supports edit/preview modes, fullscreen, and widget docker.
 * Changes are not persisted (demo mode).
 *
 * The canvas functions like a widget - other widgets can control its
 * properties via the event bus (background, filters, zoom, etc.)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CanvasRenderer } from '../CanvasRenderer';
import { RuntimeContext } from '../../runtime/RuntimeContext';
import { CanvasRuntime } from '../../runtime/CanvasRuntime';
// DockPanel removed - using WidgetDocker instead
import { loadCanvasById, type LoadedCanvasData } from '../../hooks/useDemoCanvases';
import { useCanvasStore } from '../../state/useCanvasStore';
import { useStickerStore } from '../../state/useStickerStore';
import { useCanvasController } from '../../hooks/useCanvasController';
import { useCrossCanvasEvents } from '../../hooks/useCanvasRouter';
import { CanvasMode } from '../../types/runtime';
import type { DockZone, WidgetInstance, CanvasControllerState, CanvasSettings } from '../../types/domain';
import { DEFAULT_CANVAS_SETTINGS } from '../../types/domain';

// ==================
// Types
// ==================

export type DemoViewMode = 'embedded' | 'fullscreen';

interface DemoCanvasProps {
  canvasId: string;
  initialMode?: CanvasMode;
  viewMode?: DemoViewMode;
  onViewModeChange?: (mode: DemoViewMode) => void;
  onModeChange?: (mode: CanvasMode) => void;
  showDock?: boolean;
  height?: number | string;
  onRuntimeReady?: (runtime: RuntimeContext) => void;
  onCanvasControllerReady?: (controller: CanvasControllerAPI) => void;
  startEmpty?: boolean; // Start with empty canvas (no pre-loaded widgets)
}

// Canvas controller API exposed to parent
export interface CanvasControllerAPI {
  setBackgroundColor: (color: string) => void;
  setBackgroundImage: (url: string, size?: string) => void;
  setFilters: (filters: Partial<CanvasControllerState['filters']>) => void;
  setTransform: (transform: Partial<CanvasControllerState['transform']>) => void;
  setGrid: (grid: Partial<CanvasControllerState['grid']>) => void;
  setOverlay: (overlay: CanvasControllerState['overlay']) => void;
  reset: () => void;
  getState: () => CanvasControllerState;
}

// ==================
// Component
// ==================

export const DemoCanvas: React.FC<DemoCanvasProps> = ({
  canvasId,
  initialMode = 'view',
  viewMode = 'embedded',
  onViewModeChange,
  onModeChange,
  showDock = true,
  height = 500,
  onRuntimeReady,
  onCanvasControllerReady,
  startEmpty = false,
}) => {
  // State
  const [canvasData, setCanvasData] = useState<LoadedCanvasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CanvasMode>(initialMode);
  const [runtime, setRuntime] = useState<RuntimeContext | null>(null);
  const [canvasRuntime, setCanvasRuntime] = useState<CanvasRuntime | null>(null);
  const controllerReadyRef = useRef(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Canvas dimensions
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 600;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitializedDockRef = useRef<string | null>(null); // Guard for dock zone initialization

  // GRANULAR STORE SELECTORS - Only subscribe to specific data needed for render
  const storeWidgets = useCanvasStore(state => state.widgets);
  const dockZonesMap = useStickerStore(state => state.dockZones);
  const draggedWidgetId = useStickerStore(state => state.draggedWidgetId);

  // STABILIZE DERIVED DATA - Use useMemo to prevent array recreation on every render
  const mainDockZone = useMemo(() =>
    Array.from(dockZonesMap.values()).find(
      (z: DockZone) => z.canvasId === canvasId && z.type === 'sidebar' && z.name === 'Demo Dock'
    ),
    [dockZonesMap, canvasId]
  );

  // Demo user ID
  const DEMO_USER_ID = 'demo-viewer';

  // Load canvas data
  useEffect(() => {
    if (!canvasId) {
      setError('No canvas selected');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const data = loadCanvasById(canvasId);

    if (!data) {
      setError('Canvas not found');
      setIsLoading(false);
      return;
    }

    setCanvasData(data);

    // Initialize canvas store
    useCanvasStore.getState().initialize(canvasId, DEMO_USER_ID);

    // Create runtime instances
    const newRuntime = new RuntimeContext(DEMO_USER_ID, canvasId);
    const newCanvasRuntime = new CanvasRuntime({
      canvasId: canvasId,
      userId: DEMO_USER_ID,
      mode: mode,
      debugEnabled: false,
    });

    // Add widgets to runtime context (unless startEmpty is true)
    // This makes them available for useWidgetSync to sync to the store
    if (!startEmpty && data.widgets.length > 0) {
      data.widgets.forEach(widget => {
        newRuntime.addWidgetInstance(widget);
      });
    }

    setRuntime(newRuntime);
    setCanvasRuntime(newCanvasRuntime);
    setIsLoading(false);

    // Notify parent that runtime is ready
    onRuntimeReady?.(newRuntime);

    // Cleanup on unmount or canvas change
    return () => {
      newCanvasRuntime.destroy();
      newRuntime.destroy();
    };
  }, [canvasId, mode, onRuntimeReady, startEmpty]);

  // Canvas Controller - makes the canvas act like a widget with inputs
  // This hook listens for canvas:set-* events and applies them
  // Note: Hook must be called unconditionally - pass null eventBus when runtime isn't ready
  const canvasController = useCanvasController({
    eventBus: runtime?.eventBus ?? null,
    canvasId: canvasId,
    initialBackground: {
      type: 'color',
      color: '#0f0f19', // Demo dark theme
    },
  });

  // Cross-Canvas Communication - enables widgets to communicate across different canvases
  // This creates a CanvasRouter that uses BroadcastChannel to send/receive events
  useCrossCanvasEvents(
    runtime?.eventBus ?? null as any,
    canvasId,
    DEMO_USER_ID
  );

  // Expose canvas controller API to parent
  useEffect(() => {
    if (!runtime || controllerReadyRef.current) return;

    const controllerAPI: CanvasControllerAPI = {
      setBackgroundColor: canvasController.setBackgroundColor,
      setBackgroundImage: canvasController.setBackgroundImage,
      setFilters: canvasController.setFilters,
      setTransform: canvasController.setTransform,
      setGrid: canvasController.setGrid,
      setOverlay: canvasController.setOverlay,
      reset: canvasController.reset,
      getState: () => canvasController.state,
    };

    controllerReadyRef.current = true;
    onCanvasControllerReady?.(controllerAPI);
  }, [canvasController, runtime, onCanvasControllerReady]);

  // GUARD INITIALIZATION - Create dock zone for demo exactly once per canvas
  useEffect(() => {
    if (!canvasId || !showDock) return;

    // STOP if we've already initialized this canvas
    const initKey = `${canvasId}-${showDock}`;
    if (hasInitializedDockRef.current === initKey) return;

    // Check if dock zone already exists
    const existingDockZone = Array.from(useStickerStore.getState().dockZones.values()).find(
      (z: DockZone) => z.canvasId === canvasId && z.type === 'sidebar' && z.name === 'Demo Dock'
    );

    if (!existingDockZone) {
      useStickerStore.getState().addDockZone({
        id: `demo-dock-${canvasId}`,
        canvasId: canvasId,
        type: 'sidebar',
        name: 'Demo Dock',
        width: 280,
        height: 350,
        position: { x: 20, y: 80 },
        dockedWidgetIds: [],
        layout: 'vertical',
        gap: 8,
        padding: 8,
        acceptsDrops: true,
        zIndex: 1000,
        visible: false,
      });
    }

    // Mark as initialized
    hasInitializedDockRef.current = initKey;
  }, [canvasId, showDock]);

  // Handle mode change
  const handleModeChange = useCallback((newMode: CanvasMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  }, [onModeChange]);

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    const newViewMode = viewMode === 'fullscreen' ? 'embedded' : 'fullscreen';
    onViewModeChange?.(newViewMode);
  }, [viewMode, onViewModeChange]);

  // Handle escape key for fullscreen
  useEffect(() => {
    if (viewMode !== 'fullscreen') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onViewModeChange?.('embedded');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, onViewModeChange]);

  // Track container size for responsive scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    // Initial size
    updateSize();

    // Observe size changes
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate scale to fit canvas within container
  const canvasScale = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return 1;
    const scaleX = containerSize.width / CANVAS_WIDTH;
    const scaleY = containerSize.height / CANVAS_HEIGHT;
    // Use the smaller scale to fit both dimensions, but never scale up
    return Math.min(scaleX, scaleY, 1);
  }, [containerSize.width, containerSize.height]);

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span style={styles.loadingText}>Loading demo...</span>
      </div>
    );
  }

  // Error state
  if (error || !canvasData || !runtime || !canvasRuntime) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <span style={styles.errorText}>{error || 'Failed to load canvas'}</span>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = viewMode === 'fullscreen'
    ? styles.fullscreenContainer
    : { ...styles.embeddedContainer, height };

  // Combine controller styles with base container styles
  const canvasBackgroundStyle: React.CSSProperties = {
    ...canvasController.canvasStyles.background,
    filter: canvasController.canvasStyles.filter,
    transform: canvasController.canvasStyles.transform,
    transition: 'all 0.3s ease',
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* Fixed-size Canvas Wrapper - NO SCROLLING, isolated from page */}
      <div style={styles.fixedCanvasContainer}>
        {/* Canvas background layer - isolated */}
        <div style={{
          position: 'absolute',
          inset: 0,
          ...canvasController.canvasStyles.background,
          filter: canvasController.canvasStyles.filter,
          transition: 'all 0.3s ease',
          zIndex: 0,
        }} />

        {/* Scaled canvas container for responsive fit */}
        <div style={{
          position: 'relative',
          transform: `scale(${canvasScale}) ${canvasController.canvasStyles.transform || ''}`,
          transformOrigin: 'center center',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          zIndex: 1,
          // Prevent any scroll offset on the canvas container
          overflow: 'hidden',
        }}>
          <CanvasRenderer
            runtime={runtime}
            canvasRuntime={canvasRuntime}
            mode={mode}
            canvasWidth={CANVAS_WIDTH}
            canvasHeight={CANVAS_HEIGHT}
            showDebuggerButton={false}
            settings={{
              ...DEFAULT_CANVAS_SETTINGS,
              scrollMode: 'fixed', // Disable scrolling in demo
              zoom: { ...DEFAULT_CANVAS_SETTINGS.zoom, enabled: false, wheelZoom: false, pinchZoom: false },
              touch: { ...DEFAULT_CANVAS_SETTINGS.touch, panEnabled: false },
              showSizeIndicator: false,
              showMinimap: false,
            }}
          />
        </div>

        {/* Canvas overlay (vignette, scanlines, etc.) */}
        {canvasController?.overlayStyles && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              ...canvasController.overlayStyles,
            }}
          />
        )}

        {/* Grid overlay */}
        {canvasController?.state.grid.visible && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(${canvasController.state.grid.color} 1px, transparent 1px),
                linear-gradient(90deg, ${canvasController.state.grid.color} 1px, transparent 1px)
              `,
              backgroundSize: `${canvasController.state.grid.size}px ${canvasController.state.grid.size}px`,
              opacity: canvasController.state.grid.opacity,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Fullscreen exit hint */}
      {viewMode === 'fullscreen' && (
        <div style={styles.fullscreenHint}>
          Press <kbd style={styles.kbd}>ESC</kbd> to exit fullscreen
        </div>
      )}
    </div>
  );
};

// ==================
// Styles
// ==================

const styles: Record<string, React.CSSProperties> = {
  embeddedContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
    background: '#0a0a0f',
    border: 'none',
    isolation: 'isolate',
  },
  fullscreenContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    background: '#0f0f19',
  },
  canvasWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    background: 'rgba(15, 15, 25, 0.8)',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    background: 'rgba(15, 15, 25, 0.8)',
    borderRadius: 12,
    border: '1px solid rgba(239, 68, 68, 0.3)',
    gap: 12,
  },
  errorIcon: {
    fontSize: 32,
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  fixedCanvasContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden', // NO SCROLLING
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    isolation: 'isolate', // CSS isolation context
    contain: 'paint layout', // CSS containment
  },
  fullscreenHint: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    background: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    opacity: 0.8,
  },
  kbd: {
    padding: '2px 6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'monospace',
  },
};

export default DemoCanvas;
