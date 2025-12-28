/**
 * StickerNest v2 - Canvas Widget Bridge Hook
 *
 * React hook that initializes and manages the CanvasWidgetBridge,
 * making the canvas behave like a widget that can receive inputs
 * from other widgets through the pipeline system.
 *
 * Usage:
 * ```tsx
 * function CanvasEditor() {
 *   const eventBus = useEventBus();
 *   const pipelineRuntime = usePipelineRuntime();
 *
 *   // Make canvas act like a widget
 *   useCanvasWidgetBridge({
 *     eventBus,
 *     canvasId: 'editor',
 *     pipelineRuntime,
 *     enabled: true,
 *   });
 *
 *   return <Canvas ... />;
 * }
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  CanvasWidgetBridge,
  getCanvasWidgetBridge,
  destroyCanvasWidgetBridge,
  CanvasWidgetManifest,
  CANVAS_WIDGET_ID,
  CANVAS_WIDGET_DEF_ID,
} from '../runtime/CanvasWidgetBridge';
import type { EventBus } from '../runtime/EventBus';
import type { PipelineRuntime } from '../runtime/PipelineRuntime';

// ============================================================================
// Types
// ============================================================================

export interface UseCanvasWidgetBridgeOptions {
  /** EventBus instance for communication */
  eventBus: EventBus | null;
  /** Canvas ID to bridge */
  canvasId: string;
  /** Optional PipelineRuntime for widget registration */
  pipelineRuntime?: PipelineRuntime | null;
  /** Enable/disable the bridge */
  enabled?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseCanvasWidgetBridgeResult {
  /** The bridge instance (null if not enabled) */
  bridge: CanvasWidgetBridge | null;
  /** Canvas widget ID for pipeline connections */
  canvasWidgetId: string;
  /** Manually emit an output from the canvas */
  emitOutput: (portName: string, value: unknown) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to make the canvas behave like a widget in the pipeline system.
 *
 * This hook:
 * 1. Creates a CanvasWidgetBridge instance
 * 2. Registers the canvas manifest with PipelineRuntime
 * 3. Sets up the canvas as a valid widget target for pipelines
 * 4. Cleans up on unmount
 */
export function useCanvasWidgetBridge(
  options: UseCanvasWidgetBridgeOptions
): UseCanvasWidgetBridgeResult {
  const { eventBus, canvasId, pipelineRuntime, enabled = true, debug = false } = options;

  const bridgeRef = useRef<CanvasWidgetBridge | null>(null);
  const registeredRef = useRef(false);

  // Calculate the canvas widget ID
  const canvasWidgetId = `${CANVAS_WIDGET_ID}:${canvasId}`;

  // Initialize bridge
  useEffect(() => {
    if (!enabled || !eventBus) {
      // Cleanup if disabled
      if (bridgeRef.current) {
        destroyCanvasWidgetBridge(canvasId);
        bridgeRef.current = null;
      }
      return;
    }

    // Create or get bridge instance
    const bridge = getCanvasWidgetBridge({
      eventBus,
      canvasId,
      debugEnabled: debug,
    });
    bridgeRef.current = bridge;

    // Register canvas manifest with PipelineRuntime if available
    if (pipelineRuntime && !registeredRef.current) {
      // Register the canvas widget manifest
      pipelineRuntime.registerManifest(CANVAS_WIDGET_DEF_ID, CanvasWidgetManifest);

      // Register the canvas as a live widget for ID resolution
      pipelineRuntime.registerWidget(canvasWidgetId, CANVAS_WIDGET_DEF_ID);

      // Also register with alternative ID patterns
      pipelineRuntime.registerWidget(CANVAS_WIDGET_ID, CANVAS_WIDGET_DEF_ID);

      // Register broadcast listeners from manifest
      if (CanvasWidgetManifest.events?.listens) {
        pipelineRuntime.registerBroadcastListener(
          canvasWidgetId,
          CanvasWidgetManifest.events.listens
        );
      }

      registeredRef.current = true;

      if (debug) {
        console.log('[useCanvasWidgetBridge] Registered canvas as widget:', {
          canvasWidgetId,
          defId: CANVAS_WIDGET_DEF_ID,
          inputs: Object.keys(CanvasWidgetManifest.inputs),
          outputs: Object.keys(CanvasWidgetManifest.outputs),
        });
      }
    }

    // Cleanup on unmount
    return () => {
      if (bridgeRef.current) {
        destroyCanvasWidgetBridge(canvasId);
        bridgeRef.current = null;
      }
      if (pipelineRuntime && registeredRef.current) {
        pipelineRuntime.unregisterWidget(canvasWidgetId);
        pipelineRuntime.unregisterWidget(CANVAS_WIDGET_ID);
        registeredRef.current = false;
      }
    };
  }, [enabled, eventBus, canvasId, pipelineRuntime, debug, canvasWidgetId]);

  // Emit output helper
  const emitOutput = useCallback(
    (portName: string, value: unknown) => {
      if (bridgeRef.current) {
        bridgeRef.current.emitOutput(portName, value);
      }
    },
    []
  );

  return {
    bridge: bridgeRef.current,
    canvasWidgetId,
    emitOutput,
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Get canvas widget manifest for external use
 */
export { CanvasWidgetManifest, CANVAS_WIDGET_ID, CANVAS_WIDGET_DEF_ID };

/**
 * Check if a widget ID refers to the canvas
 */
export function isCanvasWidgetId(widgetId: string): boolean {
  return (
    widgetId === CANVAS_WIDGET_ID ||
    widgetId.startsWith(`${CANVAS_WIDGET_ID}:`) ||
    widgetId === CANVAS_WIDGET_DEF_ID ||
    widgetId.startsWith(`${CANVAS_WIDGET_DEF_ID}:`)
  );
}

export default useCanvasWidgetBridge;
