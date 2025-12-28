/**
 * StickerNest v2 - Hooks Exports
 * Central export point for all React hooks
 */

export { useCanvasRouter, useCrossCanvasEvents } from './useCanvasRouter';
export { useTrayState, useMultiTrayState } from './useTrayState';
export type { TrayState, UseTrayStateOptions, UseTrayStateReturn } from './useTrayState';

// Canvas Widget Bridge hook - makes canvas behave like a widget
export {
  useCanvasWidgetBridge,
  CanvasWidgetManifest,
  CANVAS_WIDGET_ID,
  CANVAS_WIDGET_DEF_ID,
  isCanvasWidgetId
} from './useCanvasWidgetBridge';
export type { UseCanvasWidgetBridgeOptions, UseCanvasWidgetBridgeResult } from './useCanvasWidgetBridge';
