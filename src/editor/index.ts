/**
 * StickerNest v2 - Editor Module
 *
 * Central exports for the canvas editor functionality.
 */

// Editor state management
export {
  useEditorStore,
  selectMode,
  selectActiveTool,
  selectSelectedIds,
  selectGrid,
  selectViewport,
  selectIsEditing,
  selectHasSelection,
} from './EditorContext';

export type {
  EditorState,
  EditorActions,
  EditorTool,
  ShapeType,
  AlignmentType,
  DistributionType,
  GridSettings,
  ViewportState,
  SelectionState,
  ClipboardState,
  HistoryEntry,
} from './EditorContext';
