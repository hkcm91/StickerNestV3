/**
 * useMainCanvasStickers
 * Sticker handlers and behaviors for MainCanvas
 */

import { useState, useCallback, useMemo } from 'react';
import { useStickerStore } from '../../state/useStickerStore';
import { BUILTIN_WIDGETS } from '../../widgets/builtin';
import type { StickerInstance, WidgetInstance } from '../../types/domain';
import type { WidgetManifest } from '../../types/manifest';
import type { CanvasMode } from '../MainCanvas';

export interface UseMainCanvasStickersOptions {
  canvasId: string;
  mode: CanvasMode;
  externalWidgetManifests?: Map<string, WidgetManifest>;
  addWidget: (data: Omit<WidgetInstance, 'id' | 'canvasId'>) => string;
  setWidgets: React.Dispatch<React.SetStateAction<WidgetInstance[]>>;
  deselectAll: () => void;
  setIsCanvasResizeMode: (value: boolean) => void;
  isCanvasResizeMode: boolean;
}

export function useMainCanvasStickers(options: UseMainCanvasStickersOptions) {
  const {
    canvasId,
    mode,
    externalWidgetManifests,
    addWidget,
    setWidgets,
    deselectAll,
    setIsCanvasResizeMode,
    isCanvasResizeMode,
  } = options;

  // Sticker properties panel state
  const [showStickerProperties, setShowStickerProperties] = useState(false);
  const [editingSticker, setEditingSticker] = useState<StickerInstance | null>(null);

  // Sticker store integration
  const allStickers = useStickerStore(state => state.stickers);
  const selectedStickerId = useStickerStore(state => state.selectedStickerId);
  const selectSticker = useStickerStore(state => state.selectSticker);
  const moveSticker = useStickerStore(state => state.moveSticker);
  const resizeSticker = useStickerStore(state => state.resizeSticker);
  const rotateSticker = useStickerStore(state => state.rotateSticker);
  const removeSticker = useStickerStore(state => state.removeSticker);
  const setWidgetVisible = useStickerStore(state => state.setWidgetVisible);
  const setLinkedWidgetInstance = useStickerStore(state => state.setLinkedWidgetInstance);

  // Get stickers for this canvas
  const stickers = useMemo(() =>
    Array.from(allStickers.values()).filter(s => s.canvasId === canvasId),
    [allStickers, canvasId]
  );

  // Build available widgets list for sticker properties panel
  const availableWidgets = useMemo(() => {
    const widgetList: Array<{ id: string; name: string }> = [];

    // Add builtin widgets
    Object.values(BUILTIN_WIDGETS).forEach((def) => {
      widgetList.push({ id: def.manifest.id, name: def.manifest.name });
    });

    // Add external manifests if provided
    if (externalWidgetManifests) {
      externalWidgetManifests.forEach((manifest) => {
        // Avoid duplicates
        if (!widgetList.some(w => w.id === manifest.id)) {
          widgetList.push({ id: manifest.id, name: manifest.name });
        }
      });
    }

    return widgetList;
  }, [externalWidgetManifests]);

  // Build map of widget IDs to their source sticker IDs
  const widgetToStickerMap = useMemo(() => {
    const map = new Map<string, string>();
    allStickers.forEach((sticker, stickerId) => {
      if (sticker.linkedWidgetInstanceId) {
        map.set(sticker.linkedWidgetInstanceId, stickerId);
      }
    });
    return map;
  }, [allStickers]);

  // Helper: Calculate spawn position for widget relative to sticker
  const calculateWidgetSpawnPosition = useCallback((
    sticker: StickerInstance,
    spawnPosition: string,
    widgetWidth: number = 300,
    widgetHeight: number = 200
  ): { x: number; y: number } => {
    const offset = sticker.widgetSpawnOffset || { x: 20, y: 0 };
    const stickerX = sticker.position.x;
    const stickerY = sticker.position.y;
    const stickerW = sticker.width;
    const stickerH = sticker.height;

    switch (spawnPosition) {
      case 'right':
        return { x: stickerX + stickerW + offset.x, y: stickerY + offset.y };
      case 'left':
        return { x: stickerX - widgetWidth - offset.x, y: stickerY + offset.y };
      case 'top':
        return { x: stickerX + offset.x, y: stickerY - widgetHeight - offset.y };
      case 'bottom':
        return { x: stickerX + offset.x, y: stickerY + stickerH + offset.y };
      case 'center':
        return { x: stickerX + (stickerW - widgetWidth) / 2, y: stickerY + (stickerH - widgetHeight) / 2 };
      default:
        return { x: stickerX + stickerW + offset.x, y: stickerY + offset.y };
    }
  }, []);

  // Helper: Spawn a widget from a sticker click
  const spawnWidgetFromSticker = useCallback((sticker: StickerInstance) => {
    if (!sticker.linkedWidgetDefId) return null;

    // Get widget manifest for default size
    const builtinWidget = BUILTIN_WIDGETS[sticker.linkedWidgetDefId];
    const externalManifest = externalWidgetManifests?.get(sticker.linkedWidgetDefId);
    const manifest = builtinWidget?.manifest || externalManifest;

    const widgetWidth = manifest?.size?.width || 300;
    const widgetHeight = manifest?.size?.height || 200;

    // Calculate spawn position
    const position = calculateWidgetSpawnPosition(
      sticker,
      sticker.widgetSpawnPosition || 'right',
      widgetWidth,
      widgetHeight
    );

    // Create the widget with all required fields
    const widgetId = addWidget({
      widgetDefId: sticker.linkedWidgetDefId,
      position,
      width: widgetWidth,
      height: widgetHeight,
      sizePreset: 'md',
      rotation: 0,
      zIndex: 100,
      state: {},
      visible: true,
      locked: false,
      scaleMode: 'scale',
      contentSize: { width: widgetWidth, height: widgetHeight },
    });

    // Link the widget instance to the sticker
    setLinkedWidgetInstance(sticker.id, widgetId);
    console.log(`[useMainCanvasStickers] Spawned widget ${widgetId} from sticker ${sticker.id}`);

    return widgetId;
  }, [addWidget, calculateWidgetSpawnPosition, externalWidgetManifests, setLinkedWidgetInstance]);

  // Helper: Toggle widget visibility (show/hide existing or spawn new)
  const toggleStickerWidget = useCallback((sticker: StickerInstance, forceState?: boolean) => {
    if (!sticker.linkedWidgetDefId) {
      console.warn(`[useMainCanvasStickers] Sticker ${sticker.id} has no linkedWidgetDefId`);
      return;
    }

    // Read current state from the store
    const currentSticker = allStickers.get(sticker.id);
    const currentVisible = currentSticker?.widgetVisible ?? false;
    const linkedInstanceId = currentSticker?.linkedWidgetInstanceId || sticker.linkedWidgetInstanceId;

    // Determine new visibility state
    const newVisible = forceState !== undefined ? forceState : !currentVisible;
    setWidgetVisible(sticker.id, newVisible);

    if (newVisible) {
      if (linkedInstanceId) {
        // Show existing widget
        setWidgets(prev => prev.map(w =>
          w.id === linkedInstanceId ? { ...w, visible: true } : w
        ));
      } else {
        // Spawn new widget
        spawnWidgetFromSticker(sticker);
      }
    } else {
      // Hide widget
      if (linkedInstanceId) {
        setWidgets(prev => prev.map(w =>
          w.id === linkedInstanceId ? { ...w, visible: false } : w
        ));
      }
    }
  }, [allStickers, setWidgetVisible, spawnWidgetFromSticker, setWidgets]);

  // Handle sticker selection (in edit mode)
  const handleStickerSelect = useCallback((id: string, _multi: boolean) => {
    if (mode !== 'edit') return;
    // Exit canvas resize mode when selecting a sticker
    if (isCanvasResizeMode) {
      setIsCanvasResizeMode(false);
    }
    selectSticker(id);
    // Deselect widgets when selecting a sticker
    deselectAll();
  }, [mode, selectSticker, deselectAll, isCanvasResizeMode, setIsCanvasResizeMode]);

  // Handle sticker move (in edit mode)
  const handleStickerMove = useCallback((id: string, position: { x: number; y: number }) => {
    moveSticker(id, position);
  }, [moveSticker]);

  // Handle sticker resize (in edit mode)
  const handleStickerResize = useCallback((id: string, newWidth: number, newHeight: number) => {
    resizeSticker(id, newWidth, newHeight);
  }, [resizeSticker]);

  // Handle sticker rotate (in edit mode)
  const handleStickerRotate = useCallback((id: string, rotation: number) => {
    rotateSticker(id, rotation);
  }, [rotateSticker]);

  // Handle sticker click - executes click behavior in view/preview mode
  const handleStickerClick = useCallback((sticker: StickerInstance) => {
    // In edit mode, clicks are handled by the selection handler
    if (mode === 'edit') return;

    // Execute click behavior based on sticker configuration
    switch (sticker.clickBehavior) {
      case 'none':
        break;
      case 'toggle-widget':
        toggleStickerWidget(sticker);
        break;
      case 'launch-widget':
        toggleStickerWidget(sticker, true);
        break;
      case 'open-url':
        if (sticker.linkedUrl) {
          window.open(sticker.linkedUrl, '_blank', 'noopener,noreferrer');
        }
        break;
      case 'emit-event':
        console.log('[useMainCanvasStickers] Sticker emitting event:', sticker.linkedEvent);
        break;
      case 'run-pipeline':
        console.log('[useMainCanvasStickers] Sticker triggering pipeline:', sticker.linkedPipelineId);
        break;
      default:
        console.warn(`[useMainCanvasStickers] Unknown sticker click behavior: ${sticker.clickBehavior}`);
    }
  }, [mode, toggleStickerWidget]);

  // Handle sticker double-click to open properties panel (edit mode only)
  const handleStickerDoubleClick = useCallback((sticker: StickerInstance) => {
    if (mode !== 'edit') return;
    setEditingSticker(sticker);
    setShowStickerProperties(true);
  }, [mode]);

  // Handle sticker context menu
  const handleStickerContextMenu = useCallback((e: React.MouseEvent, sticker: StickerInstance) => {
    e.preventDefault();
    if (mode === 'edit') {
      selectSticker(sticker.id);
    }
  }, [mode, selectSticker]);

  // Handle sticker delete (in edit mode)
  const handleStickerDelete = useCallback((stickerId: string) => {
    removeSticker(stickerId);
    selectSticker(null);
  }, [removeSticker, selectSticker]);

  // Handle opening sticker properties panel
  const handleStickerOpenProperties = useCallback((sticker: StickerInstance) => {
    if (mode !== 'edit') return;
    setEditingSticker(sticker);
    setShowStickerProperties(true);
  }, [mode]);

  // Handle closing sticker properties panel
  const handleCloseStickerProperties = useCallback(() => {
    setShowStickerProperties(false);
    setEditingSticker(null);
  }, []);

  // Handle closing a sticker-spawned widget (from close button)
  const handleWidgetClose = useCallback((widgetId: string) => {
    const stickerId = widgetToStickerMap.get(widgetId);
    if (stickerId) {
      const sticker = allStickers.get(stickerId);
      if (sticker) {
        toggleStickerWidget(sticker, false);
        console.log(`[useMainCanvasStickers] Closed widget ${widgetId} via sticker ${stickerId}`);
      }
    }
  }, [widgetToStickerMap, allStickers, toggleStickerWidget]);

  return {
    // State
    stickers,
    selectedStickerId,
    showStickerProperties,
    editingSticker,
    availableWidgets,
    widgetToStickerMap,

    // Selection
    selectSticker,

    // Handlers
    handleStickerSelect,
    handleStickerMove,
    handleStickerResize,
    handleStickerRotate,
    handleStickerClick,
    handleStickerDoubleClick,
    handleStickerContextMenu,
    handleStickerDelete,
    handleStickerOpenProperties,
    handleCloseStickerProperties,
    handleWidgetClose,
    toggleStickerWidget,
  };
}
