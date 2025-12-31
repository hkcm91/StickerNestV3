/**
 * Spatial Theme Tokens
 *
 * CSS-like tokens for 3D spatial environment theming.
 * These extend the existing theme system to include:
 * - Lighting properties
 * - Background/environment colors
 * - Floor appearance
 * - Effect intensities
 *
 * Tokens can be referenced in theme definitions and resolved
 * at runtime to drive the SpatialEnvironment component.
 */

import type {
  SpatialEnvironmentState,
  BackgroundConfig,
  FloorConfig,
  LightingConfig,
  FiltersConfig,
} from '../stores/useSpatialEnvironmentStore';

// ============================================================================
// Token Types
// ============================================================================

export interface SpatialTokens {
  // Lighting
  '--spatial-ambient-intensity': number;
  '--spatial-ambient-color': string;
  '--spatial-directional-intensity': number;
  '--spatial-directional-color': string;
  '--spatial-environment-intensity': number;

  // Background
  '--spatial-background-type': BackgroundConfig['type'];
  '--spatial-background-color': string;
  '--spatial-background-gradient-top': string;
  '--spatial-background-gradient-bottom': string;

  // Floor
  '--spatial-floor-type': FloorConfig['type'];
  '--spatial-floor-height': number;
  '--spatial-floor-color': string;
  '--spatial-floor-grid-color': string;
  '--spatial-floor-grid-size': number;
  '--spatial-floor-reflectivity': number;
  '--spatial-floor-opacity': number;

  // Fog
  '--spatial-fog-enabled': boolean;
  '--spatial-fog-color': string;
  '--spatial-fog-near': number;
  '--spatial-fog-far': number;
  '--spatial-fog-density': number;

  // Effects
  '--spatial-bloom-enabled': boolean;
  '--spatial-bloom-intensity': number;
  '--spatial-bloom-threshold': number;
  '--spatial-vignette-enabled': boolean;
  '--spatial-vignette-darkness': number;
  '--spatial-saturation': number;
  '--spatial-contrast': number;
  '--spatial-brightness': number;
}

// ============================================================================
// Token Presets (matching environment presets)
// ============================================================================

export const SPATIAL_TOKEN_PRESETS: Record<string, Partial<SpatialTokens>> = {
  default: {
    '--spatial-ambient-intensity': 0.4,
    '--spatial-ambient-color': '#ffffff',
    '--spatial-directional-intensity': 1,
    '--spatial-directional-color': '#ffffff',
    '--spatial-background-type': 'solid',
    '--spatial-background-color': '#1a1a2e',
    '--spatial-floor-type': 'grid',
    '--spatial-floor-color': '#1a1a2e',
    '--spatial-floor-grid-color': '#333355',
    '--spatial-floor-grid-size': 1,
    '--spatial-floor-reflectivity': 0,
  },

  dark: {
    '--spatial-ambient-intensity': 0.2,
    '--spatial-ambient-color': '#4444ff',
    '--spatial-directional-intensity': 0.5,
    '--spatial-directional-color': '#8888ff',
    '--spatial-background-type': 'solid',
    '--spatial-background-color': '#0a0a15',
    '--spatial-floor-type': 'grid',
    '--spatial-floor-color': '#0a0a15',
    '--spatial-floor-grid-color': '#1a1a3e',
    '--spatial-floor-grid-size': 0.5,
    '--spatial-fog-enabled': false,
  },

  neon: {
    '--spatial-ambient-intensity': 0.3,
    '--spatial-ambient-color': '#ff00ff',
    '--spatial-directional-intensity': 0.6,
    '--spatial-directional-color': '#00ffff',
    '--spatial-background-type': 'solid',
    '--spatial-background-color': '#0a0015',
    '--spatial-floor-type': 'grid',
    '--spatial-floor-color': '#0a0015',
    '--spatial-floor-grid-color': '#ff00ff',
    '--spatial-floor-reflectivity': 0.5,
    '--spatial-bloom-enabled': true,
    '--spatial-bloom-intensity': 1.5,
    '--spatial-bloom-threshold': 0.3,
    '--spatial-vignette-enabled': true,
    '--spatial-vignette-darkness': 0.8,
  },

  nature: {
    '--spatial-ambient-intensity': 0.5,
    '--spatial-ambient-color': '#fffaf0',
    '--spatial-directional-intensity': 1.2,
    '--spatial-directional-color': '#ffeedd',
    '--spatial-background-type': 'gradient',
    '--spatial-background-gradient-top': '#87ceeb',
    '--spatial-background-gradient-bottom': '#98d8c8',
    '--spatial-floor-type': 'solid',
    '--spatial-floor-color': '#2d5a27',
    '--spatial-fog-enabled': true,
    '--spatial-fog-color': '#98d8c8',
    '--spatial-fog-density': 0.02,
  },

  studio: {
    '--spatial-ambient-intensity': 0.6,
    '--spatial-ambient-color': '#ffffff',
    '--spatial-directional-intensity': 0.8,
    '--spatial-directional-color': '#ffeedd',
    '--spatial-background-type': 'gradient',
    '--spatial-background-gradient-top': '#2a2a3e',
    '--spatial-background-gradient-bottom': '#1a1a2e',
    '--spatial-floor-type': 'reflective',
    '--spatial-floor-color': '#1a1a2e',
    '--spatial-floor-reflectivity': 0.3,
  },

  void: {
    '--spatial-ambient-intensity': 0.1,
    '--spatial-ambient-color': '#ffffff',
    '--spatial-directional-intensity': 0,
    '--spatial-background-type': 'solid',
    '--spatial-background-color': '#000000',
    '--spatial-floor-type': 'none',
    '--spatial-fog-enabled': false,
    '--spatial-bloom-enabled': false,
    '--spatial-vignette-enabled': false,
  },
};

// ============================================================================
// Token Resolution
// ============================================================================

/**
 * Resolve spatial tokens to environment state
 */
export function resolveSpatialTokens(
  tokens: Partial<SpatialTokens>
): Partial<SpatialEnvironmentState> {
  const result: Partial<SpatialEnvironmentState> = {};

  // Lighting
  const lighting: Partial<LightingConfig> = {};
  if (tokens['--spatial-ambient-intensity'] !== undefined || tokens['--spatial-ambient-color']) {
    lighting.ambient = {
      intensity: tokens['--spatial-ambient-intensity'] ?? 0.4,
      color: tokens['--spatial-ambient-color'] ?? '#ffffff',
    };
  }
  if (tokens['--spatial-directional-intensity'] !== undefined || tokens['--spatial-directional-color']) {
    lighting.directional = {
      intensity: tokens['--spatial-directional-intensity'] ?? 1,
      color: tokens['--spatial-directional-color'] ?? '#ffffff',
      position: [5, 10, 5],
      castShadow: true,
    };
  }
  if (tokens['--spatial-environment-intensity'] !== undefined) {
    lighting.environmentIntensity = tokens['--spatial-environment-intensity'];
  }
  if (Object.keys(lighting).length > 0) {
    result.lighting = lighting as LightingConfig;
  }

  // Background
  if (tokens['--spatial-background-type']) {
    if (tokens['--spatial-background-type'] === 'solid') {
      result.background = {
        type: 'solid',
        color: tokens['--spatial-background-color'] ?? '#1a1a2e',
      };
    } else if (tokens['--spatial-background-type'] === 'gradient') {
      result.background = {
        type: 'gradient',
        topColor: tokens['--spatial-background-gradient-top'] ?? '#2a2a3e',
        bottomColor: tokens['--spatial-background-gradient-bottom'] ?? '#1a1a2e',
        angle: 0,
      };
    }
  }

  // Floor
  if (tokens['--spatial-floor-type']) {
    result.floor = {
      type: tokens['--spatial-floor-type'],
      height: tokens['--spatial-floor-height'] ?? -1,
      color: tokens['--spatial-floor-color'] ?? '#1a1a2e',
      gridColor: tokens['--spatial-floor-grid-color'] ?? '#333355',
      gridSize: tokens['--spatial-floor-grid-size'] ?? 1,
      reflectivity: tokens['--spatial-floor-reflectivity'] ?? 0,
      opacity: tokens['--spatial-floor-opacity'] ?? 1,
      size: 50,
      shape: 'infinite',
    };
  }

  // Fog
  if (tokens['--spatial-fog-enabled'] !== undefined) {
    result.fog = {
      enabled: tokens['--spatial-fog-enabled'],
      type: 'exponential',
      color: tokens['--spatial-fog-color'] ?? '#ffffff',
      near: tokens['--spatial-fog-near'] ?? 10,
      far: tokens['--spatial-fog-far'] ?? 50,
      density: tokens['--spatial-fog-density'] ?? 0.01,
    };
  }

  // Filters
  const filters: Partial<FiltersConfig> = {};
  if (tokens['--spatial-bloom-enabled'] !== undefined) {
    filters.bloom = {
      enabled: tokens['--spatial-bloom-enabled'],
      intensity: tokens['--spatial-bloom-intensity'] ?? 1,
      threshold: tokens['--spatial-bloom-threshold'] ?? 0.5,
      radius: 0.5,
    };
  }
  if (tokens['--spatial-vignette-enabled'] !== undefined) {
    filters.vignette = {
      enabled: tokens['--spatial-vignette-enabled'],
      offset: 0.5,
      darkness: tokens['--spatial-vignette-darkness'] ?? 0.5,
    };
  }
  if (
    tokens['--spatial-saturation'] !== undefined ||
    tokens['--spatial-contrast'] !== undefined ||
    tokens['--spatial-brightness'] !== undefined
  ) {
    filters.colorGrading = {
      enabled: true,
      saturation: tokens['--spatial-saturation'] ?? 1,
      contrast: tokens['--spatial-contrast'] ?? 1,
      brightness: tokens['--spatial-brightness'] ?? 1,
      tint: '#ffffff',
    };
  }
  if (Object.keys(filters).length > 0) {
    result.filters = filters as FiltersConfig;
  }

  return result;
}

/**
 * Apply a token preset to the environment store
 */
export function applySpatialTokenPreset(
  presetName: keyof typeof SPATIAL_TOKEN_PRESETS,
  applyToStore: (state: Partial<SpatialEnvironmentState>) => void
): void {
  const tokens = SPATIAL_TOKEN_PRESETS[presetName];
  if (tokens) {
    const resolved = resolveSpatialTokens(tokens);
    applyToStore(resolved);
  }
}

// ============================================================================
// CSS Variable Integration (for hybrid 2D/3D themes)
// ============================================================================

/**
 * Generate CSS custom properties from spatial tokens
 * Useful for syncing 3D theme with 2D UI components
 */
export function spatialTokensToCSS(tokens: Partial<SpatialTokens>): string {
  return Object.entries(tokens)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return `${key}: ${value ? '1' : '0'};`;
      }
      if (typeof value === 'number') {
        return `${key}: ${value};`;
      }
      return `${key}: ${value};`;
    })
    .join('\n');
}

/**
 * Parse CSS custom properties back to spatial tokens
 */
export function cssToSpatialTokens(css: string): Partial<SpatialTokens> {
  const tokens: Partial<SpatialTokens> = {};
  const lines = css.split(';').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const [key, value] = line.split(':').map((s) => s.trim());
    if (key?.startsWith('--spatial-') && value) {
      // Type coercion based on known token types
      if (key.includes('enabled')) {
        (tokens as any)[key] = value === '1' || value === 'true';
      } else if (key.includes('intensity') || key.includes('size') || key.includes('height')) {
        (tokens as any)[key] = parseFloat(value);
      } else {
        (tokens as any)[key] = value;
      }
    }
  }

  return tokens;
}
