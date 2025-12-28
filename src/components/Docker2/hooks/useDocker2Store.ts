/**
 * Docker 2.0 Zustand Store
 * State management with persistence, undo/redo, and preset support
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import type {
  Docker2State,
  Docker2Instance,
  StackedWidget,
  LayoutConfig,
  LayoutMode,
  DragState,
  DragSource,
  DropZone,
  Docker2Preset,
  Docker2ThemeMode,
  UseDocker2Actions,
} from '../Docker2.types';
import type { WidgetInstance } from '../../../types/domain';

// ==================
// Constants
// ==================

const STORAGE_KEY = 'stickernest-docker2';
const PRESETS_KEY = 'stickernest-docker2-presets';
const MAX_UNDO_SIZE = 50;

// ==================
// Default Values
// ==================

const defaultLayout: LayoutConfig = {
  mode: 'vertical',
  gap: 8,
  padding: 10,
  grid: {
    columns: 2,
    gap: 8,
    autoFit: true,
  },
};

const defaultDragState: DragState = {
  isDragging: false,
  source: null,
  widgetId: null,
  activeDropZone: null,
  insertIndex: null,
  previewPosition: null,
};

const createDefaultDocker = (name?: string, id?: string): Docker2Instance => ({
  id: id || `docker2-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  name: name || 'Widget Stack',
  widgets: [],
  layout: { ...defaultLayout },
  position: { x: 100, y: 100 },
  size: { width: 380, height: 500 },
  minSize: { width: 280, height: 200 },
  maxSize: { width: 800, height: 1000 },
  collapsed: false,
  themeMode: 'dark',
  editMode: false,
  activeWidgetId: null,
  zIndex: 1000,
  locked: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const initialState: Docker2State = {
  dockers: [],
  activeDockerById: null,
  dragState: defaultDragState,
  undoStack: [],
  redoStack: [],
  maxUndoSize: MAX_UNDO_SIZE,
};

// ==================
// Presets Storage (separate from main state)
// ==================

const loadPresets = (): Docker2Preset[] => {
  try {
    const stored = localStorage.getItem(PRESETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const savePresets = (presets: Docker2Preset[]): void => {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save Docker2 presets:', e);
  }
};

// ==================
// Store Definition
// ==================

interface Docker2Store extends Docker2State, UseDocker2Actions {}

export const useDocker2Store = create<Docker2Store>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================
        // Docker Management
        // ==================

        createDocker: (name) => {
          const newDocker = createDefaultDocker(name);

          set((state) => ({
            dockers: [...state.dockers, newDocker],
            activeDockerById: newDocker.id,
          }), false, 'createDocker');

          return newDocker.id;
        },

        deleteDocker: (id) => {
          set((state) => {
            const newDockers = state.dockers.filter((d) => d.id !== id);
            const newActiveId = state.activeDockerById === id
              ? (newDockers.length > 0 ? newDockers[0].id : null)
              : state.activeDockerById;

            return {
              dockers: newDockers,
              activeDockerById: newActiveId,
            };
          }, false, 'deleteDocker');
        },

        setActiveDocker: (id) => {
          set({ activeDockerById: id }, false, 'setActiveDocker');
        },

        updateDocker: (id, updates) => {
          set((state) => ({
            dockers: state.dockers.map((d) =>
              d.id === id
                ? { ...d, ...updates, updatedAt: Date.now() }
                : d
            ),
          }), false, 'updateDocker');
        },

        duplicateDocker: (id) => {
          const docker = get().dockers.find((d) => d.id === id);
          if (!docker) return '';

          const newId = `docker2-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const duplicate: Docker2Instance = {
            ...docker,
            id: newId,
            name: `${docker.name} (Copy)`,
            position: {
              x: docker.position.x + 30,
              y: docker.position.y + 30,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          set((state) => ({
            dockers: [...state.dockers, duplicate],
            activeDockerById: newId,
          }), false, 'duplicateDocker');

          return newId;
        },

        // ==================
        // Widget Management
        // ==================

        dockWidget: (dockerId, widget, insertIndex) => {
          get().saveToHistory();

          const currentDocker = get().dockers.find((d) => d.id === dockerId);
          const currentWidgetCount = currentDocker?.widgets.length ?? 0;

          const stackedWidget: StackedWidget = {
            widgetId: widget.id,
            order: insertIndex ?? currentWidgetCount,
            sizePercent: 100 / (currentWidgetCount + 1 || 1),
            minSize: 80,
            minimized: false,
            maximized: false,
            originalPosition: { x: widget.position?.x ?? 0, y: widget.position?.y ?? 0 },
            originalSize: { width: widget.width ?? 200, height: widget.height ?? 150 },
            originalZIndex: widget.zIndex ?? 1,
            originalRotation: widget.rotation ?? 0,
          };

          set((state) => ({
            dockers: state.dockers.map((d) => {
              if (d.id !== dockerId) return d;

              let widgets = [...d.widgets];
              if (insertIndex !== undefined && insertIndex >= 0) {
                widgets.splice(insertIndex, 0, stackedWidget);
              } else {
                widgets.push(stackedWidget);
              }

              // Recalculate sizes
              const activeCount = widgets.filter((w) => !w.minimized).length;
              widgets = widgets.map((w, i) => ({
                ...w,
                order: i,
                sizePercent: w.minimized ? 0 : 100 / activeCount,
              }));

              return {
                ...d,
                widgets,
                activeWidgetId: d.activeWidgetId || widget.id,
                updatedAt: Date.now(),
              };
            }),
          }), false, 'dockWidget');
        },

        undockWidget: (dockerId, widgetId) => {
          const docker = get().dockers.find((d) => d.id === dockerId);
          const widget = docker?.widgets.find((w) => w.widgetId === widgetId);

          if (!widget) return undefined;

          get().saveToHistory();

          set((state) => ({
            dockers: state.dockers.map((d) => {
              if (d.id !== dockerId) return d;

              let widgets = d.widgets.filter((w) => w.widgetId !== widgetId);

              // Recalculate sizes
              const activeCount = widgets.filter((w) => !w.minimized).length;
              widgets = widgets.map((w, i) => ({
                ...w,
                order: i,
                sizePercent: activeCount > 0 ? (w.minimized ? 0 : 100 / activeCount) : 100,
              }));

              return {
                ...d,
                widgets,
                activeWidgetId: d.activeWidgetId === widgetId
                  ? (widgets.length > 0 ? widgets[0].widgetId : null)
                  : d.activeWidgetId,
                updatedAt: Date.now(),
              };
            }),
          }), false, 'undockWidget');

          return widget;
        },

        reorderWidgets: (dockerId, fromIndex, toIndex) => {
          if (fromIndex === toIndex) return;

          get().saveToHistory();

          set((state) => ({
            dockers: state.dockers.map((d) => {
              if (d.id !== dockerId) return d;

              const widgets = [...d.widgets];
              const [moved] = widgets.splice(fromIndex, 1);
              widgets.splice(toIndex, 0, moved);

              // Update orders
              const reordered = widgets.map((w, i) => ({ ...w, order: i }));

              return { ...d, widgets: reordered, updatedAt: Date.now() };
            }),
          }), false, 'reorderWidgets');
        },

        resizeWidget: (dockerId, widgetId, newSizePercent) => {
          set((state) => ({
            dockers: state.dockers.map((d) => {
              if (d.id !== dockerId) return d;

              const widgets = d.widgets.map((w) =>
                w.widgetId === widgetId
                  ? { ...w, sizePercent: Math.max(10, Math.min(90, newSizePercent)) }
                  : w
              );

              return { ...d, widgets, updatedAt: Date.now() };
            }),
          }), false, 'resizeWidget');
        },

        minimizeWidget: (dockerId, widgetId) => {
          set((state) => ({
            dockers: state.dockers.map((d) => {
              if (d.id !== dockerId) return d;

              let widgets = d.widgets.map((w) =>
                w.widgetId === widgetId
                  ? { ...w, minimized: !w.minimized, maximized: false }
                  : w
              );

              // Recalculate sizes
              const activeCount = widgets.filter((w) => !w.minimized).length;
              widgets = widgets.map((w) => ({
                ...w,
                sizePercent: w.minimized ? 0 : (activeCount > 0 ? 100 / activeCount : 100),
              }));

              return { ...d, widgets, updatedAt: Date.now() };
            }),
          }), false, 'minimizeWidget');
        },

        maximizeWidget: (dockerId, widgetId) => {
          set((state) => ({
            dockers: state.dockers.map((d) => {
              if (d.id !== dockerId) return d;

              const widgets = d.widgets.map((w) => ({
                ...w,
                maximized: w.widgetId === widgetId ? !w.maximized : false,
                minimized: w.widgetId === widgetId ? false : w.minimized,
              }));

              return { ...d, widgets, activeWidgetId: widgetId, updatedAt: Date.now() };
            }),
          }), false, 'maximizeWidget');
        },

        removeWidget: (dockerId, widgetId) => {
          // Just calls undockWidget
          get().undockWidget(dockerId, widgetId);
        },

        // ==================
        // Layout Management
        // ==================

        setLayout: (dockerId, layoutUpdates) => {
          set((state) => ({
            dockers: state.dockers.map((d) =>
              d.id === dockerId
                ? {
                    ...d,
                    layout: { ...d.layout, ...layoutUpdates },
                    updatedAt: Date.now(),
                  }
                : d
            ),
          }), false, 'setLayout');
        },

        setThemeMode: (dockerId, mode) => {
          set((state) => ({
            dockers: state.dockers.map((d) =>
              d.id === dockerId
                ? { ...d, themeMode: mode, updatedAt: Date.now() }
                : d
            ),
          }), false, 'setThemeMode');
        },

        toggleEditMode: (dockerId) => {
          set((state) => ({
            dockers: state.dockers.map((d) =>
              d.id === dockerId
                ? { ...d, editMode: !d.editMode, updatedAt: Date.now() }
                : d
            ),
          }), false, 'toggleEditMode');
        },

        // ==================
        // Drag & Drop
        // ==================

        startDrag: (source, widgetId) => {
          set({
            dragState: {
              isDragging: true,
              source,
              widgetId,
              activeDropZone: null,
              insertIndex: null,
              previewPosition: null,
            },
          }, false, 'startDrag');
        },

        updateDrag: (dropZone, insertIndex, position) => {
          set((state) => ({
            dragState: {
              ...state.dragState,
              activeDropZone: dropZone,
              insertIndex,
              previewPosition: position ?? state.dragState.previewPosition,
            },
          }), false, 'updateDrag');
        },

        endDrag: () => {
          set({ dragState: defaultDragState }, false, 'endDrag');
        },

        cancelDrag: () => {
          set({ dragState: defaultDragState }, false, 'cancelDrag');
        },

        // ==================
        // History (Undo/Redo)
        // ==================

        saveToHistory: () => {
          const { dockers, undoStack, maxUndoSize } = get();

          const newStack = [...undoStack, JSON.parse(JSON.stringify(dockers))];
          if (newStack.length > maxUndoSize) {
            newStack.shift();
          }

          set({
            undoStack: newStack,
            redoStack: [], // Clear redo on new action
          }, false, 'saveToHistory');
        },

        undo: () => {
          const { dockers, undoStack, redoStack } = get();

          if (undoStack.length === 0) return;

          const previousState = undoStack[undoStack.length - 1];
          const newUndoStack = undoStack.slice(0, -1);

          set({
            dockers: previousState,
            undoStack: newUndoStack,
            redoStack: [...redoStack, JSON.parse(JSON.stringify(dockers))],
          }, false, 'undo');
        },

        redo: () => {
          const { dockers, undoStack, redoStack } = get();

          if (redoStack.length === 0) return;

          const nextState = redoStack[redoStack.length - 1];
          const newRedoStack = redoStack.slice(0, -1);

          set({
            dockers: nextState,
            undoStack: [...undoStack, JSON.parse(JSON.stringify(dockers))],
            redoStack: newRedoStack,
          }, false, 'redo');
        },

        // ==================
        // Presets
        // ==================

        savePreset: (name, description) => {
          const { dockers } = get();

          const preset: Docker2Preset = {
            id: `preset-${Date.now()}`,
            name,
            description,
            savedAt: Date.now(),
            dockers: JSON.parse(JSON.stringify(dockers)),
          };

          const presets = loadPresets();
          presets.push(preset);
          savePresets(presets);

          return preset;
        },

        loadPreset: (preset) => {
          get().saveToHistory();

          // Regenerate IDs to avoid conflicts
          const loadedDockers = preset.dockers.map((d) => ({
            ...d,
            id: `docker2-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

          set({
            dockers: loadedDockers,
            activeDockerById: loadedDockers.length > 0 ? loadedDockers[0].id : null,
          }, false, 'loadPreset');
        },

        deletePreset: (id) => {
          const presets = loadPresets().filter((p) => p.id !== id);
          savePresets(presets);
        },

        getPresets: () => loadPresets(),

        // ==================
        // Utilities
        // ==================

        getDocker: (id) => {
          return get().dockers.find((d) => d.id === id);
        },

        getActiveDocker: () => {
          const { dockers, activeDockerById } = get();
          return dockers.find((d) => d.id === activeDockerById);
        },

        getDockedWidgetIds: (dockerId) => {
          const docker = get().dockers.find((d) => d.id === dockerId);
          return docker?.widgets.map((w) => w.widgetId) ?? [];
        },

        isWidgetDocked: (widgetId) => {
          return get().dockers.some((d) =>
            d.widgets.some((w) => w.widgetId === widgetId)
          );
        },

        exportState: () => {
          const { dockers } = get();
          return JSON.stringify({ version: '2.0', dockers }, null, 2);
        },

        importState: (json) => {
          try {
            const parsed = JSON.parse(json);
            if (parsed.version !== '2.0' || !Array.isArray(parsed.dockers)) {
              console.error('Invalid Docker2 state format');
              return false;
            }

            get().saveToHistory();

            set({
              dockers: parsed.dockers,
              activeDockerById: parsed.dockers.length > 0 ? parsed.dockers[0].id : null,
            }, false, 'importState');

            return true;
          } catch (e) {
            console.error('Failed to import Docker2 state:', e);
            return false;
          }
        },
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          dockers: state.dockers,
          activeDockerById: state.activeDockerById,
        }),
      }
    ),
    { name: 'Docker2Store', enabled: import.meta.env.DEV }
  )
);

// ==================
// Selector Hooks
// ==================

export const useActiveDocker = () => {
  return useDocker2Store((state) => {
    const { dockers, activeDockerById } = state;
    return dockers.find((d) => d.id === activeDockerById);
  });
};

export const useDockerWidgets = (dockerId: string) => {
  return useDocker2Store((state) => {
    const docker = state.dockers.find((d) => d.id === dockerId);
    return docker?.widgets ?? [];
  });
};

export const useDragState = () => {
  return useDocker2Store((state) => state.dragState);
};

export const useCanUndo = () => {
  return useDocker2Store((state) => state.undoStack.length > 0);
};

export const useCanRedo = () => {
  return useDocker2Store((state) => state.redoStack.length > 0);
};

export default useDocker2Store;
