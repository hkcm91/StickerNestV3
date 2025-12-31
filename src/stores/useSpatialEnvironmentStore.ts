/**
 * Spatial Environment Store
 *
 * Controls the 3D canvas environment: lighting, background, floor, and post-processing.
 * Widgets can request environment changes via Protocol messages.
 *
 * The 3D space IS the canvas - this makes it fully themeable.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

// ============================================================================
// Lighting Types
// ============================================================================

export interface AmbientLightConfig {
  intensity: number;
  color: string;
}

export interface DirectionalLightConfig {
  intensity: number;
  color: string;
  position: [number, number, number];
  castShadow: boolean;
}

export interface PointLightConfig {
  id: string;
  intensity: number;
  color: string;
  position: [number, number, number];
  distance: number;
  decay: number;
}

export interface LightingConfig {
  ambient: AmbientLightConfig;
  directional: DirectionalLightConfig;
  points: PointLightConfig[];
  /** HDR environment map URL (null for none) */
  environmentMap: string | null;
  /** Environment map intensity */
  environmentIntensity: number;
}

// ============================================================================
// Background Types
// ============================================================================

export type BackgroundType = 'solid' | 'gradient' | 'skybox' | 'hdri' | 'transparent';

export interface SolidBackgroundConfig {
  type: 'solid';
  color: string;
}

export interface GradientBackgroundConfig {
  type: 'gradient';
  topColor: string;
  bottomColor: string;
  /** Angle in degrees (0 = vertical) */
  angle: number;
}

export interface SkyboxBackgroundConfig {
  type: 'skybox';
  /** Preset name or custom texture URLs */
  preset: 'day' | 'night' | 'sunset' | 'studio' | 'custom';
  /** Custom texture URLs [px, nx, py, ny, pz, nz] */
  textures?: string[];
}

export interface HdriBackgroundConfig {
  type: 'hdri';
  url: string;
  /** Background blur (0-1) */
  blur: number;
}

export interface TransparentBackgroundConfig {
  type: 'transparent';
}

export type BackgroundConfig =
  | SolidBackgroundConfig
  | GradientBackgroundConfig
  | SkyboxBackgroundConfig
  | HdriBackgroundConfig
  | TransparentBackgroundConfig;

// ============================================================================
// Floor Types
// ============================================================================

export type FloorType = 'none' | 'grid' | 'solid' | 'reflective' | 'custom';

export interface FloorConfig {
  type: FloorType;
  /** Y position of the floor */
  height: number;
  /** Floor color */
  color: string;
  /** Grid line color (for grid type) */
  gridColor: string;
  /** Grid cell size in meters */
  gridSize: number;
  /** Reflectivity (0-1, for reflective type) */
  reflectivity: number;
  /** Floor opacity */
  opacity: number;
  /** Floor size (radius for circular, side for square) */
  size: number;
  /** Floor shape */
  shape: 'infinite' | 'circular' | 'square';
}

// ============================================================================
// Post-Processing / Filters
// ============================================================================

export interface BloomConfig {
  enabled: boolean;
  intensity: number;
  threshold: number;
  radius: number;
}

export interface VignetteConfig {
  enabled: boolean;
  offset: number;
  darkness: number;
}

export interface ColorGradingConfig {
  enabled: boolean;
  saturation: number;
  contrast: number;
  brightness: number;
  /** Tint color (multiplied) */
  tint: string;
}

export interface DepthOfFieldConfig {
  enabled: boolean;
  focusDistance: number;
  focalLength: number;
  bokehScale: number;
}

export interface FiltersConfig {
  bloom: BloomConfig;
  vignette: VignetteConfig;
  colorGrading: ColorGradingConfig;
  depthOfField: DepthOfFieldConfig;
}

// ============================================================================
// Fog
// ============================================================================

export interface FogConfig {
  enabled: boolean;
  type: 'linear' | 'exponential';
  color: string;
  near: number;
  far: number;
  density: number;
}

// ============================================================================
// Complete Environment State
// ============================================================================

export interface SpatialEnvironmentState {
  lighting: LightingConfig;
  background: BackgroundConfig;
  floor: FloorConfig;
  filters: FiltersConfig;
  fog: FogConfig;
}

// ============================================================================
// Presets
// ============================================================================

export const ENVIRONMENT_PRESETS: Record<string, Partial<SpatialEnvironmentState>> = {
  default: {
    lighting: {
      ambient: { intensity: 0.4, color: '#ffffff' },
      directional: {
        intensity: 1,
        color: '#ffffff',
        position: [5, 10, 5],
        castShadow: true,
      },
      points: [],
      environmentMap: null,
      environmentIntensity: 1,
    },
    background: { type: 'solid', color: '#1a1a2e' },
    floor: {
      type: 'grid',
      height: -1,
      color: '#1a1a2e',
      gridColor: '#333355',
      gridSize: 1,
      reflectivity: 0,
      opacity: 1,
      size: 50,
      shape: 'infinite',
    },
  },
  studio: {
    lighting: {
      ambient: { intensity: 0.6, color: '#ffffff' },
      directional: {
        intensity: 0.8,
        color: '#ffeedd',
        position: [3, 8, 3],
        castShadow: true,
      },
      points: [],
      environmentMap: null,
      environmentIntensity: 1,
    },
    background: {
      type: 'gradient',
      topColor: '#2a2a3e',
      bottomColor: '#1a1a2e',
      angle: 0,
    },
    floor: {
      type: 'reflective',
      height: -1,
      color: '#1a1a2e',
      gridColor: '#333355',
      gridSize: 1,
      reflectivity: 0.3,
      opacity: 1,
      size: 20,
      shape: 'circular',
    },
  },
  dark: {
    lighting: {
      ambient: { intensity: 0.2, color: '#4444ff' },
      directional: {
        intensity: 0.5,
        color: '#8888ff',
        position: [0, 10, 0],
        castShadow: true,
      },
      points: [],
      environmentMap: null,
      environmentIntensity: 0.5,
    },
    background: { type: 'solid', color: '#0a0a15' },
    floor: {
      type: 'grid',
      height: -1,
      color: '#0a0a15',
      gridColor: '#1a1a3e',
      gridSize: 0.5,
      reflectivity: 0,
      opacity: 0.5,
      size: 50,
      shape: 'infinite',
    },
  },
  neon: {
    lighting: {
      ambient: { intensity: 0.3, color: '#ff00ff' },
      directional: {
        intensity: 0.6,
        color: '#00ffff',
        position: [5, 5, 5],
        castShadow: true,
      },
      points: [],
      environmentMap: null,
      environmentIntensity: 1,
    },
    background: { type: 'solid', color: '#0a0015' },
    floor: {
      type: 'grid',
      height: -1,
      color: '#0a0015',
      gridColor: '#ff00ff',
      gridSize: 1,
      reflectivity: 0.5,
      opacity: 1,
      size: 50,
      shape: 'infinite',
    },
    filters: {
      bloom: { enabled: true, intensity: 1.5, threshold: 0.3, radius: 0.8 },
      vignette: { enabled: true, offset: 0.3, darkness: 0.8 },
      colorGrading: { enabled: false, saturation: 1, contrast: 1, brightness: 1, tint: '#ffffff' },
      depthOfField: { enabled: false, focusDistance: 2, focalLength: 0.05, bokehScale: 2 },
    },
  },
  nature: {
    lighting: {
      ambient: { intensity: 0.5, color: '#fffaf0' },
      directional: {
        intensity: 1.2,
        color: '#ffeedd',
        position: [10, 15, 5],
        castShadow: true,
      },
      points: [],
      environmentMap: null,
      environmentIntensity: 1,
    },
    background: {
      type: 'gradient',
      topColor: '#87ceeb',
      bottomColor: '#98d8c8',
      angle: 0,
    },
    floor: {
      type: 'solid',
      height: -1,
      color: '#2d5a27',
      gridColor: '#3d6a37',
      gridSize: 1,
      reflectivity: 0,
      opacity: 1,
      size: 100,
      shape: 'infinite',
    },
    fog: {
      enabled: true,
      type: 'exponential',
      color: '#98d8c8',
      near: 10,
      far: 50,
      density: 0.02,
    },
  },
  void: {
    lighting: {
      ambient: { intensity: 0.1, color: '#ffffff' },
      directional: {
        intensity: 0,
        color: '#ffffff',
        position: [0, 10, 0],
        castShadow: false,
      },
      points: [],
      environmentMap: null,
      environmentIntensity: 0,
    },
    background: { type: 'solid', color: '#000000' },
    floor: {
      type: 'none',
      height: -1,
      color: '#000000',
      gridColor: '#000000',
      gridSize: 1,
      reflectivity: 0,
      opacity: 0,
      size: 0,
      shape: 'infinite',
    },
  },
};

// ============================================================================
// Default State
// ============================================================================

const DEFAULT_STATE: SpatialEnvironmentState = {
  lighting: ENVIRONMENT_PRESETS.default.lighting!,
  background: ENVIRONMENT_PRESETS.default.background!,
  floor: ENVIRONMENT_PRESETS.default.floor!,
  filters: {
    bloom: { enabled: false, intensity: 1, threshold: 0.5, radius: 0.5 },
    vignette: { enabled: false, offset: 0.5, darkness: 0.5 },
    colorGrading: { enabled: false, saturation: 1, contrast: 1, brightness: 1, tint: '#ffffff' },
    depthOfField: { enabled: false, focusDistance: 2, focalLength: 0.05, bokehScale: 2 },
  },
  fog: {
    enabled: false,
    type: 'linear',
    color: '#ffffff',
    near: 10,
    far: 50,
    density: 0.01,
  },
};

// ============================================================================
// Store Interface
// ============================================================================

export interface SpatialEnvironmentStore extends SpatialEnvironmentState {
  // Preset actions
  applyPreset: (presetName: keyof typeof ENVIRONMENT_PRESETS) => void;

  // Lighting actions
  setAmbientLight: (config: Partial<AmbientLightConfig>) => void;
  setDirectionalLight: (config: Partial<DirectionalLightConfig>) => void;
  addPointLight: (config: Omit<PointLightConfig, 'id'>) => string;
  removePointLight: (id: string) => void;
  updatePointLight: (id: string, config: Partial<PointLightConfig>) => void;
  setEnvironmentMap: (url: string | null, intensity?: number) => void;

  // Background actions
  setBackground: (config: BackgroundConfig) => void;
  setBackgroundColor: (color: string) => void;

  // Floor actions
  setFloor: (config: Partial<FloorConfig>) => void;
  setFloorType: (type: FloorType) => void;

  // Filter actions
  setBloom: (config: Partial<BloomConfig>) => void;
  setVignette: (config: Partial<VignetteConfig>) => void;
  setColorGrading: (config: Partial<ColorGradingConfig>) => void;
  setDepthOfField: (config: Partial<DepthOfFieldConfig>) => void;

  // Fog actions
  setFog: (config: Partial<FogConfig>) => void;

  // Bulk update (for widget requests)
  updateEnvironment: (updates: Partial<SpatialEnvironmentState>) => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useSpatialEnvironmentStore = create<SpatialEnvironmentStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...DEFAULT_STATE,

        applyPreset: (presetName) => {
          const preset = ENVIRONMENT_PRESETS[presetName];
          if (preset) {
            set((state) => ({
              ...state,
              ...preset,
            }));
          }
        },

        setAmbientLight: (config) =>
          set((state) => ({
            lighting: {
              ...state.lighting,
              ambient: { ...state.lighting.ambient, ...config },
            },
          })),

        setDirectionalLight: (config) =>
          set((state) => ({
            lighting: {
              ...state.lighting,
              directional: { ...state.lighting.directional, ...config },
            },
          })),

        addPointLight: (config) => {
          const id = `point-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          set((state) => ({
            lighting: {
              ...state.lighting,
              points: [...state.lighting.points, { ...config, id }],
            },
          }));
          return id;
        },

        removePointLight: (id) =>
          set((state) => ({
            lighting: {
              ...state.lighting,
              points: state.lighting.points.filter((p) => p.id !== id),
            },
          })),

        updatePointLight: (id, config) =>
          set((state) => ({
            lighting: {
              ...state.lighting,
              points: state.lighting.points.map((p) =>
                p.id === id ? { ...p, ...config } : p
              ),
            },
          })),

        setEnvironmentMap: (url, intensity) =>
          set((state) => ({
            lighting: {
              ...state.lighting,
              environmentMap: url,
              environmentIntensity: intensity ?? state.lighting.environmentIntensity,
            },
          })),

        setBackground: (config) => set({ background: config }),

        setBackgroundColor: (color) =>
          set({ background: { type: 'solid', color } }),

        setFloor: (config) =>
          set((state) => ({
            floor: { ...state.floor, ...config },
          })),

        setFloorType: (type) =>
          set((state) => ({
            floor: { ...state.floor, type },
          })),

        setBloom: (config) =>
          set((state) => ({
            filters: {
              ...state.filters,
              bloom: { ...state.filters.bloom, ...config },
            },
          })),

        setVignette: (config) =>
          set((state) => ({
            filters: {
              ...state.filters,
              vignette: { ...state.filters.vignette, ...config },
            },
          })),

        setColorGrading: (config) =>
          set((state) => ({
            filters: {
              ...state.filters,
              colorGrading: { ...state.filters.colorGrading, ...config },
            },
          })),

        setDepthOfField: (config) =>
          set((state) => ({
            filters: {
              ...state.filters,
              depthOfField: { ...state.filters.depthOfField, ...config },
            },
          })),

        setFog: (config) =>
          set((state) => ({
            fog: { ...state.fog, ...config },
          })),

        updateEnvironment: (updates) =>
          set((state) => ({
            ...state,
            ...updates,
            lighting: updates.lighting
              ? { ...state.lighting, ...updates.lighting }
              : state.lighting,
            filters: updates.filters
              ? { ...state.filters, ...updates.filters }
              : state.filters,
          })),

        reset: () => set(DEFAULT_STATE),
      }),
      {
        name: 'stickernest-spatial-environment',
        version: 1,
      }
    ),
    { name: 'SpatialEnvironment' }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useLighting = () => useSpatialEnvironmentStore((s) => s.lighting);
export const useBackground = () => useSpatialEnvironmentStore((s) => s.background);
export const useFloor = () => useSpatialEnvironmentStore((s) => s.floor);
export const useFilters = () => useSpatialEnvironmentStore((s) => s.filters);
export const useFog = () => useSpatialEnvironmentStore((s) => s.fog);
