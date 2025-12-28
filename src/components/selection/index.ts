/**
 * StickerNest v2 - Selection Components Export
 * Unified exports for multi-select, layers, and grouping components
 */

export { LayersPanel } from '../LayersPanel';
export { SelectionContextMenu } from '../SelectionContextMenu';

// Re-export selection store types and hooks
export {
  useSelectionStore,
  useSelectedIds,
  useSelectedEntities,
  useSelectedByType,
  usePrimarySelected,
  useSelectionCount,
  useIsMultiSelectActive,
  useHoveredId,
  useIsSelected,
  useIsEditing,
  useIsPrimarySelected,
  useSelectionActions,
  useClipboardActions,
  useDragSelection,
  type SelectionMode,
  type SelectableEntityType,
  type SelectedEntity,
  type SelectionBounds,
  type ClipboardEntry,
} from '../../state/useSelectionStore';

// Re-export layer store types and hooks
export {
  useLayerStore,
  useCanvasLayers,
  useCanvasGroups,
  useActiveLayer,
  useLayer,
  useGroup,
  useLayerActions,
  useGroupActions,
  useZOrderActions,
  type LayerEntityType,
  type EntityRef,
  type GroupBounds,
} from '../../state/useLayerStore';
