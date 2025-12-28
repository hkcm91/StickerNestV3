/**
 * StickerNest v2 - Selection Store
 * Zustand store for managing unified selection state across all entity types
 * Supports widgets, stickers, and canvas entities with Ctrl+click multi-select
 */

import { create } from 'zustand';

// ==================
// Types
// ==================

export type SelectionMode = 'view' | 'edit' | 'connect';

/** Entity types that can be selected */
export type SelectableEntityType = 'widget' | 'sticker' | 'entity';

/** Reference to a selected entity */
export interface SelectedEntity {
  id: string;
  type: SelectableEntityType;
}

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface WidgetSelection {
  widgetId: string;
  bounds: SelectionBounds;
  isMultiSelect?: boolean;
}

/** Clipboard entry with entity info */
export interface ClipboardEntry {
  id: string;
  type: SelectableEntityType;
}

interface SelectionState {
  /** Current mode */
  mode: SelectionMode;
  /** Currently selected entity IDs (unified Set for all types) */
  selectedIds: Set<string>;
  /** Map of entity ID to entity type for selected items */
  selectedTypes: Map<string, SelectableEntityType>;
  /** Primary selected entity (last clicked in multi-select) */
  primarySelectedId: string | null;
  /** Currently hovered entity ID */
  hoveredId: string | null;
  /** Currently hovered entity type */
  hoveredType: SelectableEntityType | null;
  /** Active editing entity ID (single selection for editing) */
  activeEditId: string | null;
  /** Whether drag selection is active */
  isDragSelecting: boolean;
  /** Drag selection bounds */
  dragBounds: SelectionBounds | null;
  /** Clipboard (cut/copied entity refs) */
  clipboard: ClipboardEntry[];
  /** Whether clipboard is cut (vs copy) */
  isCut: boolean;
}

interface SelectionActions {
  /** Set the selection mode */
  setMode: (mode: SelectionMode) => void;

  // === Single Entity Selection ===
  /** Select a single entity (clears previous selection) */
  select: (entityId: string, entityType?: SelectableEntityType) => void;
  /** Add an entity to selection (multi-select) */
  addToSelection: (entityId: string, entityType?: SelectableEntityType) => void;
  /** Remove an entity from selection */
  removeFromSelection: (entityId: string) => void;
  /** Toggle entity selection */
  toggleSelection: (entityId: string, entityType?: SelectableEntityType) => void;

  // === Multi-Entity Selection ===
  /** Select multiple entities */
  selectMultiple: (entities: SelectedEntity[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Get all selected entities with their types */
  getSelectedEntities: () => SelectedEntity[];
  /** Get selected entities of a specific type */
  getSelectedByType: (type: SelectableEntityType) => string[];

  // === Ctrl+Click Handler ===
  /** Handle click with modifier keys (Ctrl/Cmd for multi-select) */
  handleEntityClick: (
    entityId: string,
    entityType: SelectableEntityType,
    modifiers: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean }
  ) => void;

  // === Hover State ===
  /** Set hovered entity */
  setHovered: (entityId: string | null, entityType?: SelectableEntityType | null) => void;

  // === Edit Mode ===
  /** Start editing an entity */
  startEditing: (entityId: string) => void;
  /** Stop editing */
  stopEditing: () => void;
  /** Check if an entity is selected */
  isSelected: (entityId: string) => boolean;
  /** Check if an entity is being edited */
  isEditing: (entityId: string) => boolean;

  // === Drag Selection (Marquee) ===
  /** Start drag selection */
  startDragSelect: (bounds: SelectionBounds) => void;
  /** Update drag selection */
  updateDragSelect: (bounds: SelectionBounds) => void;
  /** End drag selection */
  endDragSelect: (entities: SelectedEntity[]) => void;

  // === Clipboard ===
  /** Copy selected entities */
  copySelected: () => void;
  /** Cut selected entities */
  cutSelected: () => void;
  /** Clear clipboard */
  clearClipboard: () => void;
  /** Get clipboard contents */
  getClipboard: () => { entries: ClipboardEntry[]; isCut: boolean };

  // === Selection Info ===
  /** Get count of selected entities */
  getSelectionCount: () => number;
  /** Check if multi-select is active (more than 1 selected) */
  isMultiSelectActive: () => boolean;
  /** Get primary selected entity */
  getPrimarySelected: () => SelectedEntity | null;
}

// ==================
// Store
// ==================

export const useSelectionStore = create<SelectionState & SelectionActions>((set, get) => ({
  // Initial state
  mode: 'view',
  selectedIds: new Set(),
  selectedTypes: new Map(),
  primarySelectedId: null,
  hoveredId: null,
  hoveredType: null,
  activeEditId: null,
  isDragSelecting: false,
  dragBounds: null,
  clipboard: [],
  isCut: false,

  // Actions
  setMode: (mode: SelectionMode) => {
    // Clear edit mode when changing modes
    if (mode !== 'edit') {
      set({ mode, activeEditId: null });
    } else {
      set({ mode });
    }
  },

  // === Single Entity Selection ===

  select: (entityId: string, entityType: SelectableEntityType = 'widget') => {
    const newSelectedIds = new Set([entityId]);
    const newSelectedTypes = new Map<string, SelectableEntityType>();
    newSelectedTypes.set(entityId, entityType);

    set({
      selectedIds: newSelectedIds,
      selectedTypes: newSelectedTypes,
      primarySelectedId: entityId,
      activeEditId: get().mode === 'edit' ? entityId : null,
    });
  },

  addToSelection: (entityId: string, entityType: SelectableEntityType = 'widget') => {
    const { selectedIds, selectedTypes } = get();
    const newSelectedIds = new Set(selectedIds);
    const newSelectedTypes = new Map(selectedTypes);

    newSelectedIds.add(entityId);
    newSelectedTypes.set(entityId, entityType);

    set({
      selectedIds: newSelectedIds,
      selectedTypes: newSelectedTypes,
      primarySelectedId: entityId,
    });
  },

  removeFromSelection: (entityId: string) => {
    const { selectedIds, selectedTypes, activeEditId, primarySelectedId } = get();
    const newSelectedIds = new Set(selectedIds);
    const newSelectedTypes = new Map(selectedTypes);

    newSelectedIds.delete(entityId);
    newSelectedTypes.delete(entityId);

    // Update primary if removed
    let newPrimaryId = primarySelectedId === entityId ? null : primarySelectedId;
    if (!newPrimaryId && newSelectedIds.size > 0) {
      newPrimaryId = Array.from(newSelectedIds)[0];
    }

    set({
      selectedIds: newSelectedIds,
      selectedTypes: newSelectedTypes,
      primarySelectedId: newPrimaryId,
      activeEditId: activeEditId === entityId ? null : activeEditId,
    });
  },

  toggleSelection: (entityId: string, entityType: SelectableEntityType = 'widget') => {
    const { selectedIds } = get();
    if (selectedIds.has(entityId)) {
      get().removeFromSelection(entityId);
    } else {
      get().addToSelection(entityId, entityType);
    }
  },

  // === Multi-Entity Selection ===

  selectMultiple: (entities: SelectedEntity[]) => {
    const newSelectedIds = new Set<string>();
    const newSelectedTypes = new Map<string, SelectableEntityType>();

    for (const entity of entities) {
      newSelectedIds.add(entity.id);
      newSelectedTypes.set(entity.id, entity.type);
    }

    set({
      selectedIds: newSelectedIds,
      selectedTypes: newSelectedTypes,
      primarySelectedId: entities.length > 0 ? entities[entities.length - 1].id : null,
    });
  },

  clearSelection: () => {
    set({
      selectedIds: new Set(),
      selectedTypes: new Map(),
      primarySelectedId: null,
      activeEditId: null,
    });
  },

  getSelectedEntities: () => {
    const { selectedIds, selectedTypes } = get();
    return Array.from(selectedIds).map(id => ({
      id,
      type: selectedTypes.get(id) || 'widget',
    }));
  },

  getSelectedByType: (type: SelectableEntityType) => {
    const { selectedIds, selectedTypes } = get();
    return Array.from(selectedIds).filter(id => selectedTypes.get(id) === type);
  },

  // === Ctrl+Click Handler ===

  handleEntityClick: (entityId, entityType, modifiers) => {
    const { ctrlKey, shiftKey, metaKey } = modifiers;
    const isMultiSelectKey = ctrlKey || metaKey;

    if (isMultiSelectKey) {
      // Ctrl/Cmd+click: toggle selection
      get().toggleSelection(entityId, entityType);
    } else if (shiftKey) {
      // Shift+click: add to selection
      get().addToSelection(entityId, entityType);
    } else {
      // Regular click: single select
      get().select(entityId, entityType);
    }
  },

  // === Hover State ===

  setHovered: (entityId: string | null, entityType: SelectableEntityType | null = null) => {
    set({ hoveredId: entityId, hoveredType: entityType });
  },

  // === Edit Mode ===

  startEditing: (entityId: string) => {
    const entityType = get().selectedTypes.get(entityId) || 'widget';
    set({
      mode: 'edit',
      selectedIds: new Set([entityId]),
      selectedTypes: new Map([[entityId, entityType]]),
      primarySelectedId: entityId,
      activeEditId: entityId,
    });
  },

  stopEditing: () => {
    set({ activeEditId: null });
  },

  isSelected: (entityId: string) => {
    return get().selectedIds.has(entityId);
  },

  isEditing: (entityId: string) => {
    return get().activeEditId === entityId;
  },

  // === Drag Selection (Marquee) ===

  startDragSelect: (bounds: SelectionBounds) => {
    set({
      isDragSelecting: true,
      dragBounds: bounds,
    });
  },

  updateDragSelect: (bounds: SelectionBounds) => {
    set({ dragBounds: bounds });
  },

  endDragSelect: (entities: SelectedEntity[]) => {
    const newSelectedIds = new Set<string>();
    const newSelectedTypes = new Map<string, SelectableEntityType>();

    for (const entity of entities) {
      newSelectedIds.add(entity.id);
      newSelectedTypes.set(entity.id, entity.type);
    }

    set({
      isDragSelecting: false,
      dragBounds: null,
      selectedIds: newSelectedIds,
      selectedTypes: newSelectedTypes,
      primarySelectedId: entities.length > 0 ? entities[entities.length - 1].id : null,
    });
  },

  // === Clipboard ===

  copySelected: () => {
    const entities = get().getSelectedEntities();
    set({
      clipboard: entities,
      isCut: false,
    });
  },

  cutSelected: () => {
    const entities = get().getSelectedEntities();
    set({
      clipboard: entities,
      isCut: true,
    });
  },

  clearClipboard: () => {
    set({
      clipboard: [],
      isCut: false,
    });
  },

  getClipboard: () => {
    const { clipboard, isCut } = get();
    return { entries: clipboard, isCut };
  },

  // === Selection Info ===

  getSelectionCount: () => {
    return get().selectedIds.size;
  },

  isMultiSelectActive: () => {
    return get().selectedIds.size > 1;
  },

  getPrimarySelected: () => {
    const { primarySelectedId, selectedTypes } = get();
    if (!primarySelectedId) return null;
    return {
      id: primarySelectedId,
      type: selectedTypes.get(primarySelectedId) || 'widget',
    };
  },
}));

// ==================
// Selector Hooks
// ==================

/** Get current mode */
export const useSelectionMode = () => useSelectionStore(state => state.mode);

/** Get selected IDs */
export const useSelectedIds = () => useSelectionStore(state => Array.from(state.selectedIds));

/** Get selected entities with types */
export const useSelectedEntities = () => useSelectionStore(state => state.getSelectedEntities());

/** Get selected entities of a specific type */
export const useSelectedByType = (type: SelectableEntityType) =>
  useSelectionStore(state => state.getSelectedByType(type));

/** Get primary selected entity */
export const usePrimarySelected = () => useSelectionStore(state => state.getPrimarySelected());

/** Get selection count */
export const useSelectionCount = () => useSelectionStore(state => state.selectedIds.size);

/** Check if multi-select is active */
export const useIsMultiSelectActive = () => useSelectionStore(state => state.selectedIds.size > 1);

/** Get hovered ID */
export const useHoveredId = () => useSelectionStore(state => state.hoveredId);

/** Get hovered entity type */
export const useHoveredType = () => useSelectionStore(state => state.hoveredType);

/** Check if entity is selected */
export const useIsSelected = (entityId: string) =>
  useSelectionStore(state => state.selectedIds.has(entityId));

/** Check if entity is being edited */
export const useIsEditing = (entityId: string) =>
  useSelectionStore(state => state.activeEditId === entityId);

/** Check if entity is the primary selection */
export const useIsPrimarySelected = (entityId: string) =>
  useSelectionStore(state => state.primarySelectedId === entityId);

/** Get selection actions */
export const useSelectionActions = () => useSelectionStore(state => ({
  setMode: state.setMode,
  select: state.select,
  addToSelection: state.addToSelection,
  removeFromSelection: state.removeFromSelection,
  toggleSelection: state.toggleSelection,
  selectMultiple: state.selectMultiple,
  clearSelection: state.clearSelection,
  setHovered: state.setHovered,
  startEditing: state.startEditing,
  stopEditing: state.stopEditing,
  handleEntityClick: state.handleEntityClick,
  getSelectedEntities: state.getSelectedEntities,
  getSelectedByType: state.getSelectedByType,
  copySelected: state.copySelected,
  cutSelected: state.cutSelected,
  getClipboard: state.getClipboard,
}));

/** Get clipboard actions */
export const useClipboardActions = () => useSelectionStore(state => ({
  copySelected: state.copySelected,
  cutSelected: state.cutSelected,
  clearClipboard: state.clearClipboard,
  getClipboard: state.getClipboard,
}));

/** Get drag selection state */
export const useDragSelection = () => useSelectionStore(state => ({
  isDragSelecting: state.isDragSelecting,
  dragBounds: state.dragBounds,
  startDragSelect: state.startDragSelect,
  updateDragSelect: state.updateDragSelect,
  endDragSelect: state.endDragSelect,
}));

export default useSelectionStore;
