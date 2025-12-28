/**
 * StickerNest v2 - Canvas Components
 */

export { TouchHandle, RESIZE_HANDLES, CORNER_HANDLES } from './TouchHandle';
export type { HandlePosition } from './TouchHandle';

export { WidgetWrapper } from './WidgetWrapper';
export type { WidgetWrapperProps } from './WidgetWrapper';

export {
  ModeToggle,
  ZoomControls,
  SaveIndicator,
  ModeHint,
  EmptyState,
  CanvasControlsLayout,
} from './CanvasControls';

export { CanvasNavigator } from './CanvasNavigator';
export { Minimap } from './Minimap';

// Canvas UI components extracted from MainCanvas
export { CanvasBackground } from './CanvasBackground';
export { CanvasResizeHandles } from './CanvasResizeHandles';
export { MarqueeSelection } from './MarqueeSelection';
export { CanvasEmptyState } from './CanvasEmptyState';
export { CanvasMaskOverlay } from './CanvasMaskOverlay';
