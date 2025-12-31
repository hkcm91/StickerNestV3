/**
 * StickerNest v2 - Canvas Page
 *
 * Main canvas editing page - extracted from App.tsx for better separation of concerns.
 * Handles canvas viewing, editing, widget management, and sticker interactions.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useParams, useNavigate } from 'react-router-dom';
import { RuntimeContext } from '../runtime/RuntimeContext';
import { CanvasRenderer } from '../components/CanvasRenderer';
import { CanvasRuntime } from '../runtime/CanvasRuntime';
import { CanvasMode } from '../types/runtime';
import { WidgetLibrary, LOCAL_TEST_WIDGETS } from '../components/WidgetLibrary';
import { getAllBuiltinManifests } from '../widgets/builtin';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { ContextToolbar } from '../components/ContextToolbar';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { CenterGuides } from '../components/CenterGuides';
import { useCanvasStore } from '../state/useCanvasStore';
import { useCanvasManager } from '../services/canvasManager';
import { savePipeline } from '../services/pipelinesClient';
import { DashboardManager } from '../components/DashboardManager';
import { ShareDialog } from '../components/ShareDialog';
import { CanvasSizeDialog } from '../components/CanvasSizeDialog';
import { CanvasSelectorDropdown } from '../components/CanvasSelectorDropdown';
import { CanvasSettingsDialog } from '../components/CanvasSettingsDialog';
import { StickerLibrary } from '../components/StickerLibrary';
import { StickerPropertiesPanel } from '../components/StickerPropertiesPanel';
import { DockPanel } from '../components/DockPanel';
import { CreativeToolbar } from '../components/CreativeToolbar';
import { CanvasToolbar } from '../components/canvas/CanvasToolbar';
import { DEFAULT_CANVAS_SETTINGS, CanvasSettings } from '../types/domain';
import { useStickerStore } from '../state/useStickerStore';
import { useViewport } from '../hooks/useResponsive';
import { MobileBottomSheet, MobileActionButton } from '../components/MobileNav';
import { useDebugShortcuts, useShowShortcutsHint } from '../hooks/useDebugShortcuts';
import { useCanvasKeyboardShortcuts } from '../hooks/useCanvasKeyboardShortcuts';
import { debug } from '../utils/debug';
import { SocialManager } from '../runtime/SocialManager';
import { CursorOverlay, SelectionHighlight, CollaboratorAvatars, PresenceBadge } from '../components/collaboration';
import { useCollaboration } from '../hooks/useCollaboration';
import { CollaborationService } from '../services/CollaborationService';
import { CollaboratorManager, InviteDialog } from '../components/permissions';
import { CanvasPermissionService, type PermissionCheckResult, type CollabRole } from '../services/CanvasPermissionService';
import { SpatialCanvas } from '../components/spatial';
import { useActiveSpatialMode } from '../state/useSpatialModeStore';
import { useWidgetSync } from '../hooks/useWidgetSync';
import styles from './CanvasPage.module.css';

// =============================================================================
// Types
// =============================================================================

interface CanvasPageProps {
  runtime: RuntimeContext;
  canvasRuntime: CanvasRuntime;
  onModeChange?: (mode: CanvasMode) => void;
}

// =============================================================================
// Component
// =============================================================================

export const CanvasPage: React.FC<CanvasPageProps> = ({
  runtime,
  canvasRuntime,
  onModeChange,
}) => {
  // Router hooks
  const { canvasId: urlCanvasId } = useParams<{ canvasId?: string }>();
  const navigate = useNavigate();

  // Auth state
  const { profile, isAuthenticated, signOut, isLocalDevMode } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Use profile from auth context, fallback to demo user
  const user = profile || { userId: 'demo-user-123', username: 'Demo User', role: 'user' as const };

  // Canvas manager hook
  const {
    canvases,
    currentCanvasId,
    isLoading: canvasLoading,
    createCanvas,
    loadCanvas,
    saveCanvas,
    deleteCanvas,
    updateShareSettings,
    updateCanvasMetadata,
    resizeCanvas,
    refreshCanvases,
  } = useCanvasManager(user.userId);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasBounds, setCanvasBounds] = useState({ width: 0, height: 0 });

  // Responsive hooks
  const { isMobile } = useViewport();

  // Spatial mode (VR/AR/Desktop)
  const spatialMode = useActiveSpatialMode();
  const isDesktopMode = spatialMode === 'desktop';

  // IMPORTANT: Keep widgets synced to Zustand store at page level
  // This ensures SpatialScene can access widgets even when CanvasRenderer is unmounted
  const { widgets: syncedWidgets, refresh: refreshWidgets } = useWidgetSync({ runtime });

  // Refresh widget sync when entering VR/AR mode
  useEffect(() => {
    if (!isDesktopMode) {
      console.log('[CanvasPage] Entering spatial mode, refreshing widgets...');
      refreshWidgets();
    }
  }, [isDesktopMode, refreshWidgets]);

  // Determine active canvas ID
  const activeCanvasId = urlCanvasId || currentCanvasId || 'canvas-1';

  // Get current canvas data for dimensions
  const currentCanvas = canvases.find(c => c.id === activeCanvasId);

  // Canvas store integration
  const storeMode = useCanvasStore(state => state.mode);
  const setStoreMode = useCanvasStore(state => state.setMode);
  const isPropertiesPanelOpen = useCanvasStore(state => state.isPropertiesPanelOpen);
  const setPropertiesPanelOpen = useCanvasStore(state => state.setPropertiesPanelOpen);
  const initialize = useCanvasStore(state => state.initialize);
  const storeWidgets = useCanvasStore(state => state.widgets);

  // Dashboard save/load state
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showSizeDialog, setShowSizeDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showCollaboratorManager, setShowCollaboratorManager] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Permission state
  const [permissions, setPermissions] = useState<PermissionCheckResult>({
    hasAccess: true,
    role: null,
    canEdit: true,
    canInvite: false,
    canManage: false,
    isOwner: false,
  });

  // Canvas settings state
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(DEFAULT_CANVAS_SETTINGS);

  // Mobile-specific state
  const [showMobileWidgetLibrary, setShowMobileWidgetLibrary] = useState(false);
  const [showStickerLibrary, setShowStickerLibrary] = useState(false);
  const [showStickerProperties, setShowStickerProperties] = useState(false);

  // Fullscreen mode (from store for toolbar integration)
  const isFullscreen = useCanvasStore(state => state.isFullscreen);
  const setFullscreen = useCanvasStore(state => state.setFullscreen);

  // Sticker store - use useShallow to prevent infinite loops
  const {
    addSticker,
    removeSticker,
    addDockZone,
    getDockZonesByCanvas,
    updateDockZone,
    dockWidget,
    undockWidget,
    draggedWidgetId,
    selectedStickerId,
    selectSticker,
    stickers: allStickers,
  } = useStickerStore(useShallow((s) => ({
    addSticker: s.addSticker,
    removeSticker: s.removeSticker,
    addDockZone: s.addDockZone,
    getDockZonesByCanvas: s.getDockZonesByCanvas,
    updateDockZone: s.updateDockZone,
    dockWidget: s.dockWidget,
    undockWidget: s.undockWidget,
    draggedWidgetId: s.draggedWidgetId,
    selectedStickerId: s.selectedStickerId,
    selectSticker: s.selectSticker,
    stickers: s.stickers,
  })));

  // Get selected sticker instance
  const selectedSticker = selectedStickerId ? allStickers.get(selectedStickerId) : null;

  // Debug shortcuts
  useShowShortcutsHint();
  useDebugShortcuts({
    dumpState: () => {
      debug.group('State Dump', () => {
        console.log('Canvas Store:', useCanvasStore.getState());
        console.log('Sticker Store:', useStickerStore.getState());
        console.log('Runtime Widgets:', runtime.widgetInstances);
      });
    },
  });

  // Canvas keyboard shortcuts (Ctrl+Z undo, Ctrl+Y redo, Delete, etc.)
  useCanvasKeyboardShortcuts({ enabled: storeMode === 'edit' || storeMode === 'connect' });

  // Initialize canvas store and load canvas from URL
  useEffect(() => {
    initialize(activeCanvasId, user.userId);
  }, [initialize, user.userId, activeCanvasId]);

  // Check permissions when canvas changes
  useEffect(() => {
    const checkPermissions = async () => {
      if (!activeCanvasId || !isAuthenticated) {
        // For unauthenticated users or no canvas, use dev mode permissions
        setPermissions({
          hasAccess: true,
          role: isLocalDevMode ? 'owner' as CollabRole : 'viewer' as CollabRole,
          canEdit: isLocalDevMode,
          canInvite: isLocalDevMode, // Allow inviting in dev mode
          canManage: isLocalDevMode, // Allow managing in dev mode
          isOwner: isLocalDevMode,   // Treat as owner in dev mode
        });
        return;
      }

      const result = await CanvasPermissionService.checkAccess(activeCanvasId);
      setPermissions(result);

      // If no access, redirect or show error
      if (!result.hasAccess) {
        setSaveStatus('You do not have access to this canvas');
      }
    };

    checkPermissions();
  }, [activeCanvasId, isAuthenticated, isLocalDevMode]);

  // Create default dock zone for the canvas if one doesn't exist
  const dockZones = getDockZonesByCanvas(activeCanvasId);
  const mainDockZone = dockZones.find(z => z.type === 'sidebar' && z.name === 'Widget Dock');

  useEffect(() => {
    const zones = getDockZonesByCanvas(activeCanvasId);
    const existingDockZone = zones.find(z => z.type === 'sidebar' && z.name === 'Widget Dock');

    if (!existingDockZone && activeCanvasId) {
      addDockZone({
        id: `dock-${activeCanvasId}-sidebar`,
        canvasId: activeCanvasId,
        type: 'sidebar',
        name: 'Widget Dock',
        width: 300,
        height: 400,
        position: { x: 20, y: 100 },
        dockedWidgetIds: [],
        layout: 'vertical',
        gap: 8,
        padding: 8,
        acceptsDrops: true,
        zIndex: 1000,
        visible: false,
      });
    }
  }, [activeCanvasId, addDockZone, getDockZonesByCanvas]);

  // Load canvas when URL changes
  useEffect(() => {
    const loadCanvasData = async () => {
      if (!urlCanvasId) return;

      const result = await loadCanvas(urlCanvasId);
      if (result.success && result.data) {
        const { widgets, pipelines } = result.data;

        runtime.widgetInstances.forEach(w => runtime.removeWidgetInstance(w.id));
        widgets.forEach(widget => runtime.addWidgetInstance(widget));

        if (canvasRuntime.getContext()) {
          await canvasRuntime.loadWidgets(widgets);
        }

        runtime.eventBus.emit({
          type: 'dashboard:loaded',
          scope: 'canvas',
          payload: { canvasId: urlCanvasId, widgetCount: widgets.length }
        });
      }
    };

    loadCanvasData();
  }, [urlCanvasId, loadCanvas, runtime, canvasRuntime]);

  // Track canvas container size
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCanvasBounds({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize SocialManager
  useEffect(() => {
    new SocialManager(runtime.eventBus, user.userId);
  }, [runtime.eventBus, user.userId]);

  // Collaboration hook for cursor/selection broadcasting
  const {
    isConnected: isCollabConnected,
    collaboratorCount,
    broadcastCursor,
    broadcastSelection,
    broadcastWidgetMove,
    broadcastWidgetResize,
    broadcastWidgetCreate,
    broadcastWidgetDelete,
  } = useCollaboration();

  // Canvas viewport for cursor overlay
  const canvasScale = useCanvasStore((s) => s.scale);
  const canvasPan = useCanvasStore((s) => s.pan);

  // Broadcast cursor position on mouse move over canvas
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isCollabConnected) return;

    // Get position relative to canvas container
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Convert to canvas coordinates (accounting for pan and zoom)
    const x = (e.clientX - rect.left - canvasPan.x) / canvasScale;
    const y = (e.clientY - rect.top - canvasPan.y) / canvasScale;

    broadcastCursor(x, y);
  }, [isCollabConnected, canvasPan, canvasScale, broadcastCursor]);

  // Broadcast selection changes when selection changes
  // Use the raw Set to avoid creating new array references on each render
  const selectionSet = useCanvasStore((s) => s.selection);
  const selectedWidgetIds = useMemo(() => Array.from(selectionSet), [selectionSet]);
  useEffect(() => {
    if (isCollabConnected) {
      broadcastSelection(selectedWidgetIds);
    }
  }, [selectedWidgetIds, isCollabConnected, broadcastSelection]);

  // Listen for local widget changes and broadcast to collaborators
  useEffect(() => {
    if (!isCollabConnected) return;

    const unsubMove = runtime.eventBus.on('widget:move', (event) => {
      const { widgetId, position } = event.payload || {};
      if (widgetId && position) {
        broadcastWidgetMove(widgetId, position);
      }
    });

    const unsubResize = runtime.eventBus.on('widget:resize', (event) => {
      const { widgetId, width, height } = event.payload || {};
      if (widgetId && width && height) {
        broadcastWidgetResize(widgetId, { width, height });
      }
    });

    const unsubAdded = runtime.eventBus.on('widget:added', (event) => {
      const widget = event.payload;
      if (widget?.widgetInstanceId) {
        const instance = runtime.getWidgetInstance(widget.widgetInstanceId);
        if (instance) {
          broadcastWidgetCreate({
            id: instance.id,
            widgetDefId: instance.widgetDefId,
            version: instance.version,
            position: instance.position,
            width: instance.width,
            height: instance.height,
            zIndex: instance.zIndex,
            state: instance.state,
          });
        }
      }
    });

    const unsubRemoved = runtime.eventBus.on('widget:removed', (event) => {
      const { widgetInstanceId } = event.payload || {};
      if (widgetInstanceId) {
        broadcastWidgetDelete(widgetInstanceId);
      }
    });

    return () => {
      unsubMove();
      unsubResize();
      unsubAdded();
      unsubRemoved();
    };
  }, [isCollabConnected, runtime, broadcastWidgetMove, broadcastWidgetResize, broadcastWidgetCreate, broadcastWidgetDelete]);

  // Toggle fullscreen with browser API
  const enterFullscreen = useCallback(async () => {
    setFullscreen(true);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      // Browser fullscreen may fail (user gesture required), but our CSS fullscreen still works
      console.debug('Browser fullscreen not available:', err);
    }
  }, [setFullscreen]);

  const exitFullscreen = useCallback(async () => {
    setFullscreen(false);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.debug('Exit fullscreen error:', err);
    }
  }, [setFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Handle keyboard shortcuts for fullscreen (F to toggle, ESC to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      } else if (e.key === 'f' || e.key === 'F') {
        // Only toggle with F if not holding modifier keys
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, exitFullscreen, toggleFullscreen]);

  // Sync state with browser fullscreen changes (e.g., user presses browser's ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen, setFullscreen]);

  // Listen for sticker events
  useEffect(() => {
    const unsubContextMenu = runtime.eventBus.on('sticker:context-menu', (event) => {
      if (storeMode === 'edit' && event.payload?.stickerId) {
        selectSticker(event.payload.stickerId);
        setShowStickerProperties(true);
      }
    });

    const unsubDoubleClick = runtime.eventBus.on('sticker:double-click', (event) => {
      if (storeMode === 'edit' && event.payload?.stickerId) {
        selectSticker(event.payload.stickerId);
        setShowStickerProperties(true);
      }
    });

    const unsubSpawnWidget = runtime.eventBus.on('sticker:spawn-widget', (event) => {
      const { stickerId, widgetDefId, position, offset } = event.payload || {};
      if (!stickerId || !widgetDefId) return;

      const sticker = useStickerStore.getState().stickers.get(stickerId);
      if (!sticker) return;

      let widgetX = sticker.position.x;
      let widgetY = sticker.position.y;

      switch (position) {
        case 'right':
          widgetX = sticker.position.x + sticker.width + (offset?.x || 20);
          widgetY = sticker.position.y + (offset?.y || 0);
          break;
        case 'left':
          widgetX = sticker.position.x - 320 - (offset?.x || 20);
          widgetY = sticker.position.y + (offset?.y || 0);
          break;
        case 'above':
          widgetX = sticker.position.x + (offset?.x || 0);
          widgetY = sticker.position.y - 240 - (offset?.y || 20);
          break;
        case 'below':
          widgetX = sticker.position.x + (offset?.x || 0);
          widgetY = sticker.position.y + sticker.height + (offset?.y || 20);
          break;
        case 'center':
          widgetX = 400;
          widgetY = 200;
          break;
        case 'overlay':
        default:
          widgetX = sticker.position.x + (offset?.x || 0);
          widgetY = sticker.position.y + (offset?.y || 0);
          break;
      }

      runtime.eventBus.emit({
        type: 'widget:add-request',
        scope: 'canvas',
        payload: {
          widgetDefId,
          version: '1.0.0',
          source: 'local',
          positionOffset: { x: widgetX - 100, y: widgetY - 100 },
          stickerId
        }
      });
    });

    const unsubWidgetAdded = runtime.eventBus.on('widget:added', (event) => {
      const { widgetInstanceId, stickerId: stickerIdFromEvent } = event.payload || {};
      if (stickerIdFromEvent && widgetInstanceId) {
        useStickerStore.getState().setLinkedWidgetInstance(stickerIdFromEvent, widgetInstanceId);
      }
    });

    const unsubWidgetRemoved = runtime.eventBus.on('widget:removed', (event) => {
      const { widgetInstanceId } = event.payload || {};
      if (widgetInstanceId) {
        const stickers = useStickerStore.getState().stickers;
        for (const [stickerId, sticker] of stickers) {
          if (sticker.linkedWidgetInstanceId === widgetInstanceId) {
            useStickerStore.getState().setLinkedWidgetInstance(stickerId, undefined);
            useStickerStore.getState().setWidgetVisible(stickerId, false);
            break;
          }
        }
      }
    });

    const unsubVisibilityChange = runtime.eventBus.on('widget:visibility-change', (event) => {
      const { widgetInstanceId, visible } = event.payload || {};
      if (widgetInstanceId !== undefined && visible !== undefined) {
        useCanvasStore.getState().setVisible(widgetInstanceId, visible);

        // Also sync sticker widgetVisible state
        const stickers = useStickerStore.getState().stickers;
        for (const [stickerId, sticker] of stickers) {
          if (sticker.linkedWidgetInstanceId === widgetInstanceId) {
            useStickerStore.getState().setWidgetVisible(stickerId, visible);
            break;
          }
        }
      }
    });

    return () => {
      unsubContextMenu();
      unsubDoubleClick();
      unsubSpawnWidget();
      unsubWidgetAdded();
      unsubWidgetRemoved();
      unsubVisibilityChange();
    };
  }, [runtime.eventBus, storeMode, selectSticker]);

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleCanvasModeChange = useCallback((mode: CanvasMode) => {
    // Check permissions for edit modes
    if ((mode === 'edit' || mode === 'connect') && !permissions.canEdit) {
      setSaveStatus('You do not have edit permission on this canvas');
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    setStoreMode(mode);
    onModeChange?.(mode);
  }, [setStoreMode, onModeChange, permissions.canEdit]);

  const handleSaveDashboard = useCallback(async () => {
    // Check edit permission
    if (!permissions.canEdit) {
      setSaveStatus('You do not have permission to save this canvas');
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const result = await saveCanvas();
      const widgetCount = storeWidgets.size;

      if (result.success) {
        setSaveStatus(`Saved! (${widgetCount} widgets)`);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus(`Save failed: ${result.error}`);
      }
    } catch (error) {
      setSaveStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [saveCanvas, storeWidgets.size, permissions.canEdit]);

  const handleLoadDashboard = useCallback(async (canvasId: string) => {
    setIsLoading(true);
    setShowLoadDialog(false);
    try {
      const result = await loadCanvas(canvasId);
      if (result.success && result.data) {
        const { widgets, pipelines } = result.data;

        runtime.widgetInstances.forEach(w => runtime.removeWidgetInstance(w.id));
        widgets.forEach(widget => runtime.addWidgetInstance(widget));
        await canvasRuntime.loadWidgets(widgets);

        if (pipelines && pipelines.length > 0) {
          for (const pipeline of pipelines) {
            await savePipeline(pipeline);
          }
        }

        runtime.eventBus.emit({
          type: 'dashboard:loaded',
          scope: 'canvas',
          payload: {
            canvasId,
            widgetCount: widgets.length,
            pipelineCount: pipelines.length
          }
        });

        navigate(`/canvas/${canvasId}`);
        setSaveStatus(`Loaded! (${widgets.length} widgets, ${pipelines.length} pipelines)`);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus(`Load failed: ${result.error}`);
      }
    } catch (error) {
      setSaveStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadCanvas, runtime, canvasRuntime, navigate]);

  const handleCreateCanvas = useCallback(async () => {
    const result = await createCanvas({
      name: 'New Canvas',
      width: 1920,
      height: 1080,
      visibility: 'private',
    });

    if (result.success && result.data) {
      navigate(`/canvas/${result.data.id}`);
      setSaveStatus('New canvas created!');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [createCanvas, navigate]);

  const handleRenameCanvas = useCallback(async (canvasId: string, newName: string) => {
    // Only owners can rename
    if (!permissions.isOwner && canvasId === activeCanvasId) {
      setSaveStatus('Only the owner can rename this canvas');
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    const result = await updateCanvasMetadata(canvasId, { name: newName });
    if (result.success) {
      await refreshCanvases();
      setSaveStatus(`Renamed to "${newName}"`);
      setTimeout(() => setSaveStatus(null), 2000);
    }
  }, [updateCanvasMetadata, refreshCanvases, permissions.isOwner, activeCanvasId]);

  const handleDeleteCanvas = useCallback(async (canvasId: string) => {
    // Only owners can delete
    if (!permissions.isOwner && canvasId === activeCanvasId) {
      setSaveStatus('Only the owner can delete this canvas');
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    const result = await deleteCanvas(canvasId);
    if (result.success) {
      if (canvasId === activeCanvasId) {
        navigate('/');
      }
      setSaveStatus('Canvas deleted');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  }, [deleteCanvas, activeCanvasId, navigate, permissions.isOwner]);

  const handleSelectCanvas = useCallback((canvasId: string) => {
    navigate(`/canvas/${canvasId}`);
  }, [navigate]);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
      {/* Header Bar - hidden in fullscreen */}
      {!isFullscreen && (
      <header className={`${styles.header} ${isMobile ? styles.headerMobile : ''}`}>
        {/* Mode selector */}
        <div className={styles.modeSelector}>
          {!isMobile && <strong className={styles.modeLabel}>Mode:</strong>}
          <select
            value={storeMode}
            onChange={(e) => handleCanvasModeChange(e.target.value as CanvasMode)}
            className={`sn-touch-target ${styles.modeSelect} ${isMobile ? styles.modeSelectMobile : ''}`}
          >
            <option value="view">View</option>
            <option value="edit" disabled={!permissions.canEdit}>
              Edit {!permissions.canEdit ? '(no permission)' : ''}
            </option>
            <option value="connect" disabled={!permissions.canEdit}>
              Connect {!permissions.canEdit ? '(no permission)' : ''}
            </option>
          </select>
        </div>

        {/* Canvas Toolbar - Desktop only */}
        {!isMobile && (
          <>
            <div className={styles.divider} />
            <CanvasToolbar />
          </>
        )}

        {/* Canvas Selector Dropdown */}
        {!isMobile && (
          <>
            <div className={styles.divider} />
            <CanvasSelectorDropdown
              canvases={canvases}
              currentCanvasId={activeCanvasId}
              onSelect={handleSelectCanvas}
              onRename={handleRenameCanvas}
              onDelete={handleDeleteCanvas}
              onCreate={handleCreateCanvas}
              isLoading={canvasLoading}
            />
            <div className={styles.divider} />
          </>
        )}

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            onClick={handleSaveDashboard}
            disabled={isSaving || !permissions.canEdit}
            className={`sn-touch-target ${styles.saveButton}`}
            title={!permissions.canEdit ? 'You do not have edit permission' : undefined}
          >
            {isSaving ? 'Saving...' : (isMobile ? '💾' : '💾 Save')}
          </button>
          <button
            onClick={() => setShowLoadDialog(true)}
            disabled={isLoading}
            className={`sn-touch-target ${styles.loadButton}`}
          >
            {isLoading ? 'Loading...' : (isMobile ? '📂' : '📂 Load')}
          </button>
          <button
            onClick={() => setShowShareDialog(true)}
            className={`sn-touch-target ${styles.shareButton}`}
          >
            {isMobile ? '🔗' : '🔗 Share'}
          </button>
          {/* Invite button - available to all users */}
          {!isMobile && (
            <button
              onClick={() => setShowInviteDialog(true)}
              className={`sn-touch-target ${styles.secondaryButton}`}
              title="Invite collaborators"
            >
              👥 Invite
            </button>
          )}
          {/* Collaborators button - only if user can manage */}
          {(permissions.canManage || permissions.isOwner) && !isMobile && (
            <button
              onClick={() => setShowCollaboratorManager(true)}
              className={`sn-touch-target ${styles.secondaryButton}`}
              title="Manage collaborators"
            >
              ⚙️ Access
            </button>
          )}

          {/* Desktop-only buttons */}
          {!isMobile && (
            <>
              <button
                onClick={enterFullscreen}
                className={`sn-touch-target ${styles.secondaryButton}`}
                title="Enter fullscreen (F to toggle, Esc to exit)"
              >
                ⛶ Fullscreen
              </button>
              <button
                onClick={() => setShowSizeDialog(true)}
                className={`sn-touch-target ${styles.secondaryButton}`}
                title="Change canvas size"
              >
                📐 Size
              </button>
              <button
                onClick={() => setShowSettingsDialog(true)}
                className={`sn-touch-target ${styles.secondaryButton}`}
                title="Canvas settings"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => setShowStickerLibrary(!showStickerLibrary)}
                className={`sn-touch-target ${styles.secondaryButton} ${showStickerLibrary ? styles.active : ''}`}
                title="Add stickers"
              >
                🎨 Stickers
              </button>
              <button
                onClick={() => {
                  if (mainDockZone) {
                    updateDockZone(mainDockZone.id, { visible: !mainDockZone.visible });
                  }
                }}
                className={`sn-touch-target ${styles.secondaryButton} ${mainDockZone?.visible ? styles.active : ''}`}
                title="Widget dock panel"
              >
                📌 Dock
              </button>
            </>
          )}
        </div>

        {/* Save status */}
        {saveStatus && !isMobile && (
          <span className={`${styles.statusMessage} ${saveStatus.includes('Saved') || saveStatus.includes('Loaded') ? styles.success : styles.error}`}>
            {saveStatus}
          </span>
        )}

        {/* Properties toggle */}
        {!isMobile && (
          <>
            <div className={styles.divider} />
            <button
              onClick={() => setPropertiesPanelOpen(!isPropertiesPanelOpen)}
              className={`sn-touch-target ${styles.propertiesToggle} ${isPropertiesPanelOpen ? styles.active : ''}`}
            >
              {isPropertiesPanelOpen ? 'Hide Properties' : 'Show Properties'}
            </button>
          </>
        )}

        {/* Collaboration status */}
        {!isMobile && (
          <div className={styles.collaborationStatus}>
            <CollaboratorAvatars
              maxVisible={4}
              size={28}
              showStatus={true}
            />
            {collaboratorCount === 0 && (
              <PresenceBadge
                showCount={false}
                showStatus={true}
                compact={false}
              />
            )}
          </div>
        )}

        {/* User menu */}
        <div className={styles.userMenu}>
          {!isMobile && (
            <span className={styles.username}>
              {user.username || user.email || 'User'}
            </span>
          )}
          {isLocalDevMode ? (
            <span className={styles.devBadge}>DEV</span>
          ) : (
            <button
              onClick={() => isAuthenticated ? signOut() : setShowAuthModal(true)}
              className={`${styles.authButton} ${isAuthenticated ? styles.signOut : styles.signIn}`}
            >
              {isAuthenticated ? 'Sign Out' : 'Sign In'}
            </button>
          )}
        </div>
      </header>
      )}

      {/* Context Toolbar - Desktop only (hidden in fullscreen) */}
      {!isMobile && !isFullscreen && <ContextToolbar />}

      {/* Canvas Area */}
      <div
        ref={canvasContainerRef}
        className={styles.canvasArea}
        onMouseMove={handleCanvasMouseMove}
      >
        {/* DOM Renderer - visible only in desktop mode */}
        {isDesktopMode && (
          <CanvasRenderer
            runtime={runtime}
            canvasRuntime={canvasRuntime}
            mode={storeMode}
            canvasWidth={currentCanvas?.width || 1920}
            canvasHeight={currentCanvas?.height || 1080}
            settings={canvasSettings}
          />
        )}

        {/* WebGL/XR Renderer - visible in VR/AR modes */}
        <SpatialCanvas active={!isDesktopMode} />

        {/* Collaboration Overlays - Remote cursors and selections */}
        {isCollabConnected && (
          <>
            <CursorOverlay
              zoom={canvasScale}
              panOffset={canvasPan}
              staleTimeout={3000}
              interpolate={true}
              showLabels={true}
            />
            <SelectionHighlight
              zoom={canvasScale}
              panOffset={canvasPan}
              staleTimeout={5000}
              showLabels={true}
            />
          </>
        )}

        {/* Fullscreen controls - only shown in fullscreen mode */}
        {isFullscreen && (
          <div className={styles.fullscreenControls}>
            <div className={styles.fullscreenControlsInner}>
              <button
                onClick={() => useCanvasStore.getState().zoom(1.25)}
                className={styles.fullscreenControlButton}
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={() => useCanvasStore.getState().zoom(0.8)}
                className={styles.fullscreenControlButton}
                title="Zoom out"
              >
                −
              </button>
              <button
                onClick={() => useCanvasStore.getState().resetViewport()}
                className={styles.fullscreenControlButton}
                title="Reset view"
              >
                ⟲
              </button>
              <div className={styles.fullscreenDivider} />
              <button
                onClick={exitFullscreen}
                className={`${styles.fullscreenControlButton} ${styles.exitButton}`}
                title="Exit fullscreen (Esc or F)"
              >
                ✕
              </button>
            </div>
            <span className={styles.fullscreenHint}>Press F or Esc to exit</span>
          </div>
        )}

        {/* Creative Toolbar - hidden in fullscreen */}
        {!isMobile && !isFullscreen && (
          <div className={styles.creativeToolbarWrapper}>
            <CreativeToolbar />
          </div>
        )}

        {/* Center Guides - hidden in fullscreen */}
        {!isMobile && !isFullscreen && (
          <CenterGuides
            canvasWidth={canvasBounds.width}
            canvasHeight={canvasBounds.height}
          />
        )}

        {/* Dock Panel - hidden in fullscreen */}
        {!isMobile && !isFullscreen && mainDockZone && (mainDockZone.visible || draggedWidgetId) && (
          <DockPanel
            zone={mainDockZone}
            widgets={mainDockZone.dockedWidgetIds
              .map(id => Array.from(storeWidgets.values()).find(w => w.id === id))
              .filter((w): w is NonNullable<typeof w> => w !== undefined)}
            isEditMode={storeMode === 'edit'}
            onWidgetSelect={(widgetId) => {
              runtime.eventBus.emit({
                type: 'widget:select-request',
                scope: 'canvas',
                payload: { widgetInstanceId: widgetId }
              });
            }}
            onWidgetUndock={(widgetId) => {
              undockWidget(widgetId);
              runtime.eventBus.emit({
                type: 'widget:undocked',
                scope: 'canvas',
                payload: { widgetInstanceId: widgetId }
              });
            }}
            onZoneUpdate={(zoneId, updates) => {
              updateDockZone(zoneId, updates);
            }}
            canvasBounds={{
              width: currentCanvas?.width || 1920,
              height: currentCanvas?.height || 1080
            }}
            canvasRuntime={canvasRuntime}
            onDockWidget={(widgetId) => {
              const widget = Array.from(storeWidgets.values()).find(w => w.id === widgetId);
              if (widget) {
                dockWidget(widgetId, mainDockZone.id, undefined, {
                  position: { x: widget.position.x, y: widget.position.y },
                  size: { width: widget.width, height: widget.height }
                });
              } else {
                dockWidget(widgetId, mainDockZone.id);
              }
              updateDockZone(mainDockZone.id, { visible: true });
            }}
            onDockDefinition={(defId, source) => {
              const handleWidgetAdded = (event: any) => {
                if (event.type === 'widget:added') {
                  const { widgetInstanceId } = event.payload;
                  dockWidget(widgetInstanceId, mainDockZone.id);
                  runtime.eventBus.off('widget:added', handleWidgetAdded);
                }
              };
              runtime.eventBus.on('widget:added', handleWidgetAdded);

              runtime.eventBus.emit({
                type: 'widget:add-request',
                scope: 'canvas',
                payload: {
                  widgetDefId: defId,
                  version: '1.0.0',
                  source: source,
                  positionOffset: { x: 0, y: 0 }
                }
              });
            }}
            onWidgetRender={(widget) => {
              if (canvasRuntime) {
                const mounted = canvasRuntime.getMountedWidget(widget.id);
                if (mounted?.containerElement) {
                  return (
                    <div
                      className={styles.dockedWidgetContainer}
                      ref={(el) => {
                        if (el) {
                          const iframe = mounted.containerElement.querySelector('iframe');
                          if (iframe && iframe.parentElement !== el) {
                            el.appendChild(iframe);
                          }
                        }
                      }}
                    />
                  );
                }
              }
              return (
                <div className={styles.dockedWidgetPlaceholder}>
                  <div className={styles.placeholderTitle}>{widget.widgetDefId.split('/').pop()}</div>
                  <div className={styles.placeholderId}>{widget.id.slice(0, 8)}</div>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Properties Panel - hidden in fullscreen */}
      {!isMobile && !isFullscreen && (
        <PropertiesPanel
          isOpen={isPropertiesPanelOpen}
          onClose={() => setPropertiesPanelOpen(false)}
        />
      )}

      {/* Sticker Library Panel - hidden in fullscreen */}
      {!isMobile && !isFullscreen && showStickerLibrary && (
        <div className={styles.stickerLibraryPanel}>
          <StickerLibrary
            canvasId={activeCanvasId}
            onAddSticker={(sticker) => {
              addSticker(sticker);
              runtime.eventBus.emit({
                type: 'sticker:added',
                scope: 'canvas',
                payload: { sticker }
              });
            }}
            onClose={() => setShowStickerLibrary(false)}
          />
        </div>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <MobileActionButton
          icon="add"
          label="Add Widget"
          onClick={() => setShowMobileWidgetLibrary(true)}
          position="right"
          variant="primary"
        />
      )}

      {/* Mobile Widget Library */}
      {isMobile && (
        <MobileBottomSheet
          isOpen={showMobileWidgetLibrary}
          onClose={() => setShowMobileWidgetLibrary(false)}
          title="Add Widget"
          height="half"
        >
          <div className={styles.mobileLibraryContent}>
            <WidgetLibrary runtime={runtime} />
          </div>
        </MobileBottomSheet>
      )}

      {/* Mobile status toast */}
      {isMobile && saveStatus && (
        <div className={`${styles.mobileToast} ${saveStatus.includes('Saved') || saveStatus.includes('Loaded') ? styles.success : styles.error}`}>
          {saveStatus}
        </div>
      )}

      {/* Dialogs */}
      <DashboardManager
        isOpen={showLoadDialog}
        onClose={() => setShowLoadDialog(false)}
        onLoadDashboard={handleLoadDashboard}
        currentCanvasId={activeCanvasId}
        onCreateCanvas={handleCreateCanvas}
      />

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        canvasId={activeCanvasId}
        onUpdateSettings={updateShareSettings}
      />

      <CanvasSizeDialog
        isOpen={showSizeDialog}
        onClose={() => setShowSizeDialog(false)}
        canvasId={activeCanvasId}
        currentWidth={currentCanvas?.width || 1920}
        currentHeight={currentCanvas?.height || 1080}
        onResize={async (canvasId, width, height, scaleWidgets) => {
          const result = await resizeCanvas(canvasId, width, height, scaleWidgets);
          if (result.success) {
            await refreshCanvases();
            setSaveStatus(`Canvas resized to ${width}x${height}`);
            setTimeout(() => setSaveStatus(null), 2000);
          }
          return result;
        }}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <CanvasSettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        settings={canvasSettings}
        onSave={setCanvasSettings}
      />

      {/* Collaborator Manager */}
      <CollaboratorManager
        canvasId={activeCanvasId}
        isOpen={showCollaboratorManager}
        onClose={() => setShowCollaboratorManager(false)}
        currentUserRole={permissions.role}
        canManage={permissions.canManage || permissions.isOwner}
        onLeave={() => navigate('/shared')}
      />

      {/* Invite Dialog */}
      <InviteDialog
        canvasId={activeCanvasId}
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        canInvite={true}
      />

      {/* Sticker Properties Panel */}
      {showStickerProperties && selectedSticker && (
        <StickerPropertiesPanel
          sticker={selectedSticker}
          availableWidgets={[
            // Built-in widgets
            ...getAllBuiltinManifests().map(m => ({ id: m.id, name: m.name })),
            // Local test widgets from the library
            ...LOCAL_TEST_WIDGETS.map(w => ({ id: w.id, name: w.name })),
          ]}
          onClose={() => setShowStickerProperties(false)}
          onDelete={(stickerId) => {
            removeSticker(stickerId);
            selectSticker(null);
            setShowStickerProperties(false);
            runtime.eventBus.emit({
              type: 'sticker:removed',
              scope: 'canvas',
              payload: { stickerId }
            });
          }}
        />
      )}
    </div>
  );
};

export default CanvasPage;
