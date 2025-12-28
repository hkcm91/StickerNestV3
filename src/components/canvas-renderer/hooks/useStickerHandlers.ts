/**
 * useStickerHandlers
 * Handles all sticker-related interactions including selection, move,
 * resize, rotate, click behaviors, and context menu
 */

import { useCallback } from 'react';
import type { StickerInstance } from '../../../types/domain';
import type { CanvasMode } from '../../../types/runtime';
import type { EventBus } from '../../../runtime/EventBus';

interface UseStickerHandlersOptions {
  mode: CanvasMode;
  eventBus: EventBus;
  deselectAll: () => void;
  selectSticker: (id: string | null) => void;
  moveSticker: (id: string, position: { x: number; y: number }) => void;
  resizeSticker: (id: string, width: number, height: number) => void;
  rotateSticker: (id: string, rotation: number) => void;
  removeSticker: (id: string) => void;
  setWidgetVisible: (id: string, visible: boolean) => void;
}

export function useStickerHandlers(options: UseStickerHandlersOptions) {
  const {
    mode,
    eventBus,
    deselectAll,
    selectSticker,
    moveSticker,
    resizeSticker,
    rotateSticker,
    removeSticker,
    setWidgetVisible,
  } = options;

  // Handle sticker selection
  const handleStickerSelect = useCallback((id: string, multi: boolean) => {
    if (multi) {
      // Multi-select not yet implemented for stickers, just select
      selectSticker(id);
    } else {
      selectSticker(id);
      // Deselect widgets when selecting a sticker
      deselectAll();
    }

    eventBus.emit({
      type: 'sticker:selected',
      scope: 'canvas',
      payload: { stickerId: id }
    });
  }, [selectSticker, deselectAll, eventBus]);

  // Handle sticker move
  const handleStickerMove = useCallback((id: string, position: { x: number; y: number }) => {
    moveSticker(id, position);

    eventBus.emit({
      type: 'sticker:moved',
      scope: 'canvas',
      payload: { stickerId: id, position }
    });
  }, [moveSticker, eventBus]);

  // Handle sticker resize
  const handleStickerResize = useCallback((id: string, width: number, height: number) => {
    resizeSticker(id, width, height);

    eventBus.emit({
      type: 'sticker:resized',
      scope: 'canvas',
      payload: { stickerId: id, width, height }
    });
  }, [resizeSticker, eventBus]);

  // Handle sticker rotation
  const handleStickerRotate = useCallback((id: string, rotation: number) => {
    rotateSticker(id, rotation);

    eventBus.emit({
      type: 'sticker:rotated',
      scope: 'canvas',
      payload: { stickerId: id, rotation }
    });
  }, [rotateSticker, eventBus]);

  // Handle sticker click (executes click behavior)
  const handleStickerClick = useCallback((sticker: StickerInstance) => {
    // Only handle click behavior in view mode
    if (mode === 'edit') return;

    eventBus.emit({
      type: 'sticker:clicked',
      scope: 'canvas',
      payload: { stickerId: sticker.id, behavior: sticker.clickBehavior }
    });

    switch (sticker.clickBehavior) {
      case 'none':
        // Decorative only, no action
        break;

      case 'toggle-widget':
        // Toggle visibility of linked widget
        if (sticker.linkedWidgetDefId) {
          const newVisible = !sticker.widgetVisible;
          setWidgetVisible(sticker.id, newVisible);

          if (newVisible && !sticker.linkedWidgetInstanceId) {
            // Widget needs to be created - emit event for App to handle
            eventBus.emit({
              type: 'sticker:spawn-widget',
              scope: 'canvas',
              payload: {
                stickerId: sticker.id,
                widgetDefId: sticker.linkedWidgetDefId,
                position: sticker.widgetSpawnPosition || 'right',
                offset: sticker.widgetSpawnOffset || { x: 20, y: 0 }
              }
            });
          } else if (!newVisible && sticker.linkedWidgetInstanceId) {
            // Hide the widget
            eventBus.emit({
              type: 'widget:visibility-change',
              scope: 'canvas',
              payload: {
                widgetInstanceId: sticker.linkedWidgetInstanceId,
                visible: false
              }
            });
          } else if (newVisible && sticker.linkedWidgetInstanceId) {
            // Show existing widget
            eventBus.emit({
              type: 'widget:visibility-change',
              scope: 'canvas',
              payload: {
                widgetInstanceId: sticker.linkedWidgetInstanceId,
                visible: true
              }
            });
          }
        }
        break;

      case 'launch-widget':
        // Always show widget (create if needed)
        if (sticker.linkedWidgetDefId) {
          setWidgetVisible(sticker.id, true);

          if (!sticker.linkedWidgetInstanceId) {
            eventBus.emit({
              type: 'sticker:spawn-widget',
              scope: 'canvas',
              payload: {
                stickerId: sticker.id,
                widgetDefId: sticker.linkedWidgetDefId,
                position: sticker.widgetSpawnPosition || 'right',
                offset: sticker.widgetSpawnOffset || { x: 20, y: 0 }
              }
            });
          } else {
            eventBus.emit({
              type: 'widget:visibility-change',
              scope: 'canvas',
              payload: {
                widgetInstanceId: sticker.linkedWidgetInstanceId,
                visible: true
              }
            });
          }
        }
        break;

      case 'open-url':
        // Open URL in new tab
        if (sticker.linkedUrl) {
          window.open(sticker.linkedUrl, '_blank', 'noopener,noreferrer');
        }
        break;

      case 'emit-event':
        // Emit custom event
        if (sticker.linkedEvent) {
          eventBus.emit({
            type: sticker.linkedEvent as any,
            scope: 'canvas',
            payload: { stickerId: sticker.id, triggeredBy: 'sticker-click' }
          });
        }
        break;

      case 'run-pipeline':
        // Trigger pipeline execution
        if (sticker.linkedPipelineId) {
          eventBus.emit({
            type: 'pipeline:trigger',
            scope: 'canvas',
            payload: {
              pipelineId: sticker.linkedPipelineId,
              triggeredBy: 'sticker-click',
              stickerId: sticker.id
            }
          });
        }
        break;

      default:
        console.warn(`Unknown sticker click behavior: ${sticker.clickBehavior}`);
    }
  }, [mode, eventBus, setWidgetVisible]);

  // Handle sticker context menu
  const handleStickerContextMenu = useCallback((e: React.MouseEvent, sticker: StickerInstance) => {
    e.preventDefault();
    // Could show a context menu here in the future
    selectSticker(sticker.id);

    eventBus.emit({
      type: 'sticker:context-menu',
      scope: 'canvas',
      payload: { stickerId: sticker.id, x: e.clientX, y: e.clientY }
    });
  }, [selectSticker, eventBus]);

  // Handle sticker double-click to open properties
  const handleStickerDoubleClick = useCallback((sticker: StickerInstance) => {
    selectSticker(sticker.id);

    eventBus.emit({
      type: 'sticker:double-click',
      scope: 'canvas',
      payload: { stickerId: sticker.id }
    });
  }, [selectSticker, eventBus]);

  // Handle sticker delete
  const handleStickerDelete = useCallback((stickerId: string) => {
    removeSticker(stickerId);
    selectSticker(null);

    eventBus.emit({
      type: 'sticker:removed',
      scope: 'canvas',
      payload: { stickerId }
    });
  }, [removeSticker, selectSticker, eventBus]);

  // Handle sticker open properties (same as double-click)
  const handleStickerOpenProperties = useCallback((sticker: StickerInstance) => {
    selectSticker(sticker.id);

    eventBus.emit({
      type: 'sticker:double-click',
      scope: 'canvas',
      payload: { stickerId: sticker.id }
    });
  }, [selectSticker, eventBus]);

  return {
    handleStickerSelect,
    handleStickerMove,
    handleStickerResize,
    handleStickerRotate,
    handleStickerClick,
    handleStickerContextMenu,
    handleStickerDoubleClick,
    handleStickerDelete,
    handleStickerOpenProperties,
  };
}

export default useStickerHandlers;
