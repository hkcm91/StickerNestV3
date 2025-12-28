/**
 * useWidgetHandlers
 * Handles widget selection, drag, resize, and rotation
 */

import { useCallback } from 'react';
import type { WidgetInstance } from '../../../types/domain';
import type { EventBus } from '../../../runtime/EventBus';
import type { RuntimeContext } from '../../../runtime/RuntimeContext';
import type { CanvasRuntime } from '../../../runtime/CanvasRuntime';

interface UseWidgetHandlersOptions {
  runtime: RuntimeContext;
  canvasRuntime?: CanvasRuntime;
  isCanvasLocked: boolean;
  widgets: WidgetInstance[];
  eventBus: EventBus;
  select: (id: string, addToSelection: boolean) => void;
  storeUpdateWidget: (id: string, update: Partial<WidgetInstance>) => void;
}

export function useWidgetHandlers(options: UseWidgetHandlersOptions) {
  const {
    runtime,
    canvasRuntime,
    isCanvasLocked,
    widgets,
    eventBus,
    select,
    storeUpdateWidget,
  } = options;

  // Handle widget selection with multi-select support
  const handleSelect = useCallback((instanceId: string, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
    // V3: Check canvas lock - don't allow selection when canvas is locked
    if (isCanvasLocked) {
      console.log('[WidgetHandlers] Selection blocked - canvas is locked!');
      return;
    }

    // Check if widget is locked - don't allow selection of locked widgets
    const widget = widgets.find(w => w.id === instanceId);
    if (widget?.locked) {
      console.log('[WidgetHandlers] Selection blocked - widget is locked!');
      return;
    }

    const isMultiSelectModifier = event?.shiftKey || event?.ctrlKey || event?.metaKey;

    if (isMultiSelectModifier) {
      // Add to or remove from selection
      select(instanceId, true);
    } else {
      // Single select (clears previous selection)
      select(instanceId, false);
    }

    // Emit selection event
    eventBus.emit({
      type: 'widget:selected',
      scope: 'canvas',
      payload: {
        widgetInstanceId: instanceId,
        isMultiSelect: isMultiSelectModifier
      },
      sourceWidgetId: instanceId
    });
  }, [eventBus, select, isCanvasLocked, widgets]);

  // Handle widget drag
  const handleDrag = useCallback((instanceId: string, x: number, y: number) => {
    // V3: Check canvas lock - don't allow dragging when canvas is locked
    if (isCanvasLocked) {
      return;
    }

    if (canvasRuntime) {
      canvasRuntime.updateWidgetPosition(instanceId, x, y);
    } else {
      // Fallback: update context directly
      runtime.updateWidgetInstance(instanceId, { position: { x, y } });
    }

    // Sync with store
    storeUpdateWidget(instanceId, { position: { x, y } });

    // Emit drag event
    eventBus.emit({
      type: 'widget:dragged',
      scope: 'canvas',
      payload: { widgetInstanceId: instanceId, x, y },
      sourceWidgetId: instanceId
    });
  }, [canvasRuntime, runtime, storeUpdateWidget, isCanvasLocked, eventBus]);

  // Handle widget resize
  const handleResize = useCallback((instanceId: string, width: number, height: number, x?: number, y?: number) => {
    // V3: Check canvas lock - don't allow resizing when canvas is locked
    if (isCanvasLocked) {
      return;
    }

    if (canvasRuntime) {
      canvasRuntime.updateWidgetSize(instanceId, width, height);
      if (x !== undefined && y !== undefined) {
        canvasRuntime.updateWidgetPosition(instanceId, x, y);
      }
    } else {
      // Fallback: update context directly
      const update: Partial<WidgetInstance> = { width, height };
      if (x !== undefined && y !== undefined) {
        update.position = { x, y };
      }
      runtime.updateWidgetInstance(instanceId, update);
    }

    // Emit resize event
    eventBus.emit({
      type: 'widget:resized',
      scope: 'canvas',
      payload: { widgetInstanceId: instanceId, width, height, x, y },
      sourceWidgetId: instanceId
    });
  }, [canvasRuntime, runtime, isCanvasLocked, eventBus]);

  // Handle widget rotation
  const handleRotate = useCallback((instanceId: string, rotation: number) => {
    // V3: Check canvas lock - don't allow rotation when canvas is locked
    if (isCanvasLocked) {
      return;
    }

    if (canvasRuntime) {
      canvasRuntime.updateWidgetRotation(instanceId, rotation);
    } else {
      // Fallback: update context directly
      runtime.updateWidgetInstance(instanceId, { rotation });
    }

    // Emit rotation event
    eventBus.emit({
      type: 'widget:rotated',
      scope: 'canvas',
      payload: { widgetInstanceId: instanceId, rotation },
      sourceWidgetId: instanceId
    });
  }, [canvasRuntime, runtime, isCanvasLocked, eventBus]);

  return {
    handleSelect,
    handleDrag,
    handleResize,
    handleRotate,
  };
}
