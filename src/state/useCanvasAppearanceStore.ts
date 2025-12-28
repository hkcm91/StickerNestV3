/**
 * StickerNest v2 - Canvas Appearance Store
 * Manages canvas visual styling including glassmorphism, borders, colors, grid, and background
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==================
// Types
// ==================

export type GridType = 'regular' | 'isometric';
export type BorderStyle = 'solid' | 'dashed' | 'dotted';

export interface GlassmorphismSettings {
  enabled: boolean;
  blur: number; // 0-40px
  opacity: number; // 0-100
  tint: string; // rgba color
  saturation: number; // 100-200%
}

export interface BorderSettings {
  enabled: boolean;
  width: number; // 0-8px
  color: string;
  style: BorderStyle;
  radius: number; // 0-32px
}

export interface GridSettings {
  showGrid: boolean;
  gridType: GridType;
  gridSize: number; // 5-100px
  gridColor: string;
  gridOpacity: number; // 0-100
  snapToGrid: boolean;
  snapToCenter: boolean;
  showCenterGuides: boolean;
}

export interface BackgroundSettings {
  type: 'color' | 'image' | 'gradient';
  color: string;
  imageUrl?: string;
  imageOpacity: number; // 0-100
  imageBlur: number; // 0-20px
  imageFixed: boolean;
  gradientStart?: string;
  gradientEnd?: string;
  gradientAngle?: number;
}

export interface ColorSettings {
  accentColor: string;
  backgroundColor: string;
}

export interface MaskSettings {
  enabled: boolean;
  color: string; // Color of the mask overlay
  opacity: number; // 0-100
  blur: number; // 0-20px blur on the mask edge
}

// ==================
// Store State
// ==================

export interface CanvasAppearanceState {
  glass: GlassmorphismSettings;
  border: BorderSettings;
  grid: GridSettings;
  background: BackgroundSettings;
  colors: ColorSettings;
  mask: MaskSettings;
}

// ==================
// Store Actions
// ==================

export interface CanvasAppearanceActions {
  // Glass
  setGlass: (settings: Partial<GlassmorphismSettings>) => void;
  toggleGlass: () => void;

  // Border
  setBorder: (settings: Partial<BorderSettings>) => void;
  toggleBorder: () => void;
  setRadius: (radius: number) => void;

  // Grid
  setGrid: (settings: Partial<GridSettings>) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setGridType: (type: GridType) => void;

  // Background
  setBackground: (settings: Partial<BackgroundSettings>) => void;
  setBackgroundImage: (url: string | undefined) => void;
  removeBackgroundImage: () => void;

  // Colors
  setColors: (settings: Partial<ColorSettings>) => void;
  setAccentColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;

  // Mask
  setMask: (settings: Partial<MaskSettings>) => void;
  toggleMask: () => void;

  // Reset
  reset: () => void;

  // Get computed canvas style
  getCanvasStyle: () => React.CSSProperties;
}

// ==================
// Initial State - Glassmorphism Default
// ==================

const initialState: CanvasAppearanceState = {
  glass: {
    enabled: true,
    blur: 24,
    opacity: 25,
    tint: 'rgba(255, 255, 255, 0.08)',
    saturation: 180,
  },
  border: {
    enabled: true,
    width: 1,
    color: 'rgba(255, 255, 255, 0.18)',
    style: 'solid',
    radius: 16,
  },
  grid: {
    showGrid: false,
    gridType: 'regular',
    gridSize: 20,
    gridColor: 'rgba(139, 92, 246, 0.15)',
    gridOpacity: 50,
    snapToGrid: false,
    snapToCenter: true,
    showCenterGuides: false,
  },
  background: {
    type: 'color',
    color: 'rgba(15, 15, 25, 0.25)',
    imageUrl: undefined,
    imageOpacity: 100,
    imageBlur: 0,
    imageFixed: false,
    gradientStart: '#0f0f19',
    gradientEnd: '#1a1a2e',
    gradientAngle: 135,
  },
  colors: {
    accentColor: '#8b5cf6',
    backgroundColor: 'rgba(15, 15, 25, 0.25)',
  },
  mask: {
    enabled: false,
    color: '#0a0a0f',
    opacity: 95,
    blur: 0,
  },
};

// ==================
// Store Creation
// ==================

export const useCanvasAppearanceStore = create<CanvasAppearanceState & CanvasAppearanceActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Glass actions
      setGlass: (settings) => {
        set((state) => ({
          glass: { ...state.glass, ...settings },
        }));
      },

      toggleGlass: () => {
        set((state) => ({
          glass: { ...state.glass, enabled: !state.glass.enabled },
        }));
      },

      // Border actions
      setBorder: (settings) => {
        set((state) => ({
          border: { ...state.border, ...settings },
        }));
      },

      toggleBorder: () => {
        set((state) => ({
          border: { ...state.border, enabled: !state.border.enabled },
        }));
      },

      setRadius: (radius) => {
        set((state) => ({
          border: { ...state.border, radius },
        }));
      },

      // Grid actions
      setGrid: (settings) => {
        set((state) => ({
          grid: { ...state.grid, ...settings },
        }));
      },

      toggleGrid: () => {
        set((state) => ({
          grid: { ...state.grid, showGrid: !state.grid.showGrid },
        }));
      },

      toggleSnap: () => {
        set((state) => ({
          grid: { ...state.grid, snapToGrid: !state.grid.snapToGrid },
        }));
      },

      setGridType: (gridType) => {
        set((state) => ({
          grid: { ...state.grid, gridType },
        }));
      },

      // Background actions
      setBackground: (settings) => {
        set((state) => ({
          background: { ...state.background, ...settings },
        }));
      },

      setBackgroundImage: (url) => {
        set((state) => ({
          background: { ...state.background, type: 'image', imageUrl: url },
        }));
      },

      removeBackgroundImage: () => {
        set((state) => ({
          background: { ...state.background, type: 'color', imageUrl: undefined },
        }));
      },

      // Color actions
      setColors: (settings) => {
        set((state) => ({
          colors: { ...state.colors, ...settings },
        }));
      },

      setAccentColor: (accentColor) => {
        set((state) => ({
          colors: { ...state.colors, accentColor },
        }));
      },

      setBackgroundColor: (backgroundColor) => {
        set((state) => ({
          colors: { ...state.colors, backgroundColor },
          background: { ...state.background, color: backgroundColor },
        }));
      },

      // Mask actions
      setMask: (settings) => {
        set((state) => ({
          mask: { ...state.mask, ...settings },
        }));
      },

      toggleMask: () => {
        set((state) => ({
          mask: { ...state.mask, enabled: !state.mask.enabled },
        }));
      },

      // Reset
      reset: () => {
        set(initialState);
      },

      // Computed canvas style
      getCanvasStyle: () => {
        const { glass, border, background, colors } = get();

        const style: React.CSSProperties = {
          borderRadius: border.radius,
        };

        // Background
        if (background.type === 'image' && background.imageUrl) {
          style.backgroundImage = `url(${background.imageUrl})`;
          style.backgroundSize = 'cover';
          style.backgroundPosition = 'center';
          style.backgroundAttachment = background.imageFixed ? 'fixed' : 'scroll';
        } else if (background.type === 'gradient') {
          style.background = `linear-gradient(${background.gradientAngle}deg, ${background.gradientStart}, ${background.gradientEnd})`;
        } else {
          style.background = background.color;
        }

        // Glassmorphism
        if (glass.enabled) {
          style.backdropFilter = `blur(${glass.blur}px) saturate(${glass.saturation}%)`;
          style.WebkitBackdropFilter = `blur(${glass.blur}px) saturate(${glass.saturation}%)`;
          // Mix background with tint for glass effect
          if (background.type === 'color') {
            style.background = glass.tint;
          }
        }

        // Border
        if (border.enabled && border.width > 0) {
          style.border = `${border.width}px ${border.style} ${border.color}`;
        }

        // Box shadow for depth
        if (glass.enabled) {
          style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
        }

        return style;
      },
    }),
    {
      name: 'stickernest-canvas-appearance',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        glass: state.glass,
        border: state.border,
        grid: state.grid,
        background: state.background,
        colors: state.colors,
        mask: state.mask,
      }),
    }
  )
);

// ==================
// Selector Hooks
// ==================

export const useGlassSettings = () => useCanvasAppearanceStore((s) => s.glass);
export const useBorderSettings = () => useCanvasAppearanceStore((s) => s.border);
export const useGridSettings = () => useCanvasAppearanceStore((s) => s.grid);
export const useBackgroundSettings = () => useCanvasAppearanceStore((s) => s.background);
export const useColorSettings = () => useCanvasAppearanceStore((s) => s.colors);
export const useMaskSettings = () => useCanvasAppearanceStore((s) => s.mask);
export const useCanvasStyle = () => useCanvasAppearanceStore((s) => s.getCanvasStyle());

export default useCanvasAppearanceStore;
