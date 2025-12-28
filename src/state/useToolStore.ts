/**
 * StickerNest v2 - Tool Store (Zustand)
 * Manages active tool state for the creative toolbar
 */

import { create } from 'zustand';
import type { VectorShapeType, Object3DPrimitiveType } from '../types/entities';

// ==================
// Tool Types
// ==================

/** Tool categories */
export type ToolCategory = 'select' | 'pan' | 'shape' | 'line' | 'text' | 'image' | 'object3d' | 'more' | 'container';

/** Active tool configuration */
export interface ActiveTool {
  category: ToolCategory;
  /** Shape type when category is 'shape' */
  shapeType?: VectorShapeType;
  /** 3D primitive type when category is 'object3d' */
  object3dType?: Object3DPrimitiveType;
}

/** Tool defaults for new shapes */
export interface ShapeDefaults {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
  cornerRadius: number;
}

/** Tool defaults for new text */
export interface TextDefaults {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | 'normal' | 'bold';
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
}

/** Tool defaults for new 3D objects */
export interface Object3DDefaults {
  color: string;
  materialType: 'basic' | 'standard' | 'phong' | 'toon' | 'wireframe';
  opacity: number;
  metalness: number;
  roughness: number;
}

// ==================
// Store State
// ==================

export interface ToolState {
  /** Currently active tool */
  activeTool: ActiveTool;
  /** Whether the shape submenu is expanded */
  shapeSubmenuOpen: boolean;
  /** Whether the 3D object submenu is expanded */
  object3dSubmenuOpen: boolean;
  /** Default settings for shapes */
  shapeDefaults: ShapeDefaults;
  /** Default settings for text */
  textDefaults: TextDefaults;
  /** Default settings for 3D objects */
  object3dDefaults: Object3DDefaults;
}

export interface ToolActions {
  /** Set the active tool */
  setActiveTool: (tool: ActiveTool) => void;
  /** Select a specific shape tool */
  selectShapeTool: (shapeType: VectorShapeType) => void;
  /** Select a specific 3D object tool */
  selectObject3DTool: (primitiveType: Object3DPrimitiveType) => void;
  /** Toggle shape submenu */
  toggleShapeSubmenu: () => void;
  /** Toggle 3D object submenu */
  toggleObject3DSubmenu: () => void;
  /** Close all submenus */
  closeAllSubmenus: () => void;
  /** Update shape defaults */
  setShapeDefaults: (defaults: Partial<ShapeDefaults>) => void;
  /** Update text defaults */
  setTextDefaults: (defaults: Partial<TextDefaults>) => void;
  /** Update 3D object defaults */
  setObject3DDefaults: (defaults: Partial<Object3DDefaults>) => void;
  /** Reset to select tool */
  resetToSelect: () => void;
}

// ==================
// Initial State
// ==================

const initialShapeDefaults: ShapeDefaults = {
  fill: '#8b5cf6',
  fillOpacity: 1,
  stroke: '#ffffff',
  strokeWidth: 0,
  strokeOpacity: 1,
  cornerRadius: 0,
};

const initialTextDefaults: TextDefaults = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 24,
  fontWeight: 'normal',
  color: '#e2e8f0',
  textAlign: 'left',
};

const initialObject3DDefaults: Object3DDefaults = {
  color: '#8b5cf6',
  materialType: 'standard',
  opacity: 1,
  metalness: 0.1,
  roughness: 0.5,
};

const initialState: ToolState = {
  activeTool: { category: 'select' },
  shapeSubmenuOpen: false,
  object3dSubmenuOpen: false,
  shapeDefaults: initialShapeDefaults,
  textDefaults: initialTextDefaults,
  object3dDefaults: initialObject3DDefaults,
};

// ==================
// Store Creation
// ==================

export const useToolStore = create<ToolState & ToolActions>()((set, get) => ({
  ...initialState,

  setActiveTool: (tool: ActiveTool) => {
    set({
      activeTool: tool,
      shapeSubmenuOpen: false,
      object3dSubmenuOpen: false,
    });
  },

  selectShapeTool: (shapeType: VectorShapeType) => {
    set({
      activeTool: { category: 'shape', shapeType },
      shapeSubmenuOpen: false,
    });
  },

  selectObject3DTool: (primitiveType: Object3DPrimitiveType) => {
    set({
      activeTool: { category: 'object3d', object3dType: primitiveType },
      object3dSubmenuOpen: false,
    });
  },

  toggleShapeSubmenu: () => {
    const { shapeSubmenuOpen } = get();
    set({
      shapeSubmenuOpen: !shapeSubmenuOpen,
      object3dSubmenuOpen: false,
    });
  },

  toggleObject3DSubmenu: () => {
    const { object3dSubmenuOpen } = get();
    set({
      object3dSubmenuOpen: !object3dSubmenuOpen,
      shapeSubmenuOpen: false,
    });
  },

  closeAllSubmenus: () => {
    set({
      shapeSubmenuOpen: false,
      object3dSubmenuOpen: false,
    });
  },

  setShapeDefaults: (defaults: Partial<ShapeDefaults>) => {
    set({ shapeDefaults: { ...get().shapeDefaults, ...defaults } });
  },

  setTextDefaults: (defaults: Partial<TextDefaults>) => {
    set({ textDefaults: { ...get().textDefaults, ...defaults } });
  },

  setObject3DDefaults: (defaults: Partial<Object3DDefaults>) => {
    set({ object3dDefaults: { ...get().object3dDefaults, ...defaults } });
  },

  resetToSelect: () => {
    set({
      activeTool: { category: 'select' },
      shapeSubmenuOpen: false,
      object3dSubmenuOpen: false,
    });
  },
}));

// ==================
// Selector Hooks
// ==================

export const useActiveTool = () => useToolStore(state => state.activeTool);
export const useActiveToolCategory = () => useToolStore(state => state.activeTool.category);
export const useShapeSubmenuOpen = () => useToolStore(state => state.shapeSubmenuOpen);
export const useObject3DSubmenuOpen = () => useToolStore(state => state.object3dSubmenuOpen);
export const useShapeDefaults = () => useToolStore(state => state.shapeDefaults);
export const useTextDefaults = () => useToolStore(state => state.textDefaults);
export const useObject3DDefaults = () => useToolStore(state => state.object3dDefaults);
