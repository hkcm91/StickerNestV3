/**
 * StickerNest v2 - Canvas Interactions Module
 * Exports all interaction controller hooks
 */

export { useDragController } from './useDragController';
export { useResizeController } from './useResizeController';
export {
  useUnifiedInteraction,
  type UnifiedInteractionOptions,
  type UnifiedInteractionResult,
  type Position,
  type Size,
  type Bounds,
  type ViewportState,
  type InteractionType,
  type ResizeHandle,
} from './useUnifiedInteraction';
