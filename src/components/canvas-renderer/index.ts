/**
 * Canvas Renderer Module
 * Extracted components and hooks for the CanvasRenderer
 *
 * REFACTORING NOTE (Dec 2024):
 * The following have been extracted from the main CanvasRenderer.tsx:
 * - VisualEffectsLayer - Global CSS filter effects overlay
 * - ZoomControls - Mobile-friendly zoom control bar (legacy)
 * - ZoomControlsBar - New compact zoom controls
 * - SelectionInfoPanel - Widget selection information display
 * - EmptyCanvasState - Empty canvas placeholder
 * - CanvasToolbarButtons - Top-right toolbar buttons
 * - GestureHint - Gesture feedback overlay
 * - DropZoneIndicator - Drag/drop visual feedback
 * - StickerAnimationStyles - CSS keyframe animations
 * - useCanvasKeyboardShortcuts - Comprehensive keyboard shortcut handling (~425 lines)
 * - useStickerHandlers - All sticker interaction callbacks (~225 lines)
 * - useCanvasDragDrop - Drag selection and library drop handling (~200 lines)
 */

// Components
export { VisualEffectsLayer } from './VisualEffectsLayer';
export { ZoomControls } from './ZoomControls';
export { ZoomControlsBar } from './ZoomControlsBar';
export { SelectionInfoPanel } from './SelectionInfoPanel';
export { EmptyCanvasState } from './EmptyCanvasState';
export { CanvasToolbarButtons } from './CanvasToolbarButtons';
export { GestureHint } from './GestureHint';
export { DropZoneIndicator } from './DropZoneIndicator';
export { StickerAnimationStyles } from './StickerAnimationStyles';

// Hooks
export * from './hooks';
