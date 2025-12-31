/**
 * Protocol Environment Handlers
 *
 * Allows widgets to request environment changes via Protocol messages.
 * Provides a secure, capability-based interface to the spatial environment.
 *
 * Message types:
 * - environment:get - Get current environment state
 * - environment:set - Set environment properties
 * - environment:preset - Apply a preset
 * - environment:lighting - Modify lighting
 * - environment:background - Change background
 * - environment:floor - Modify floor
 * - environment:filter - Toggle filters/effects
 */

import {
  useSpatialEnvironmentStore,
  ENVIRONMENT_PRESETS,
  type SpatialEnvironmentState,
  type BackgroundConfig,
  type FloorConfig,
  type LightingConfig,
} from '../../../stores/useSpatialEnvironmentStore';

export interface EnvironmentRequest {
  type: string;
  payload?: unknown;
}

export interface EnvironmentResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Capability levels for environment control
export type EnvironmentCapability =
  | 'environment:read'      // Can read environment state
  | 'environment:lighting'  // Can modify lighting
  | 'environment:background'// Can change background
  | 'environment:floor'     // Can modify floor
  | 'environment:filters'   // Can toggle effects
  | 'environment:preset'    // Can apply presets
  | 'environment:full';     // Full access

/**
 * Check if a widget has a specific capability
 */
function hasCapability(
  widgetCapabilities: EnvironmentCapability[],
  required: EnvironmentCapability
): boolean {
  if (widgetCapabilities.includes('environment:full')) return true;
  return widgetCapabilities.includes(required);
}

/**
 * Handle environment protocol messages
 */
export function handleEnvironmentMessage(
  message: EnvironmentRequest,
  widgetCapabilities: EnvironmentCapability[] = ['environment:read']
): EnvironmentResponse {
  const store = useSpatialEnvironmentStore.getState();

  switch (message.type) {
    // ========== Read Operations ==========

    case 'environment:get': {
      if (!hasCapability(widgetCapabilities, 'environment:read')) {
        return { success: false, error: 'Permission denied: environment:read required' };
      }

      const { payload } = message as { payload?: { property?: string } };

      if (payload?.property) {
        // Get specific property
        const prop = payload.property as keyof SpatialEnvironmentState;
        if (prop in store) {
          return { success: true, data: store[prop] };
        }
        return { success: false, error: `Unknown property: ${payload.property}` };
      }

      // Get full state
      return {
        success: true,
        data: {
          lighting: store.lighting,
          background: store.background,
          floor: store.floor,
          filters: store.filters,
          fog: store.fog,
        },
      };
    }

    case 'environment:presets': {
      if (!hasCapability(widgetCapabilities, 'environment:read')) {
        return { success: false, error: 'Permission denied' };
      }
      return {
        success: true,
        data: Object.keys(ENVIRONMENT_PRESETS),
      };
    }

    // ========== Preset Operations ==========

    case 'environment:preset': {
      if (!hasCapability(widgetCapabilities, 'environment:preset')) {
        return { success: false, error: 'Permission denied: environment:preset required' };
      }

      const { payload } = message as { payload?: { name?: string } };
      if (!payload?.name || !(payload.name in ENVIRONMENT_PRESETS)) {
        return {
          success: false,
          error: `Invalid preset. Available: ${Object.keys(ENVIRONMENT_PRESETS).join(', ')}`,
        };
      }

      store.applyPreset(payload.name as keyof typeof ENVIRONMENT_PRESETS);
      return { success: true, data: { applied: payload.name } };
    }

    // ========== Lighting Operations ==========

    case 'environment:lighting': {
      if (!hasCapability(widgetCapabilities, 'environment:lighting')) {
        return { success: false, error: 'Permission denied: environment:lighting required' };
      }

      const { payload } = message as { payload?: Partial<LightingConfig> };
      if (!payload) {
        return { success: false, error: 'Missing lighting configuration' };
      }

      if (payload.ambient) {
        store.setAmbientLight(payload.ambient);
      }
      if (payload.directional) {
        store.setDirectionalLight(payload.directional);
      }
      if (payload.environmentMap !== undefined) {
        store.setEnvironmentMap(payload.environmentMap, payload.environmentIntensity);
      }

      return { success: true };
    }

    case 'environment:lighting:ambient': {
      if (!hasCapability(widgetCapabilities, 'environment:lighting')) {
        return { success: false, error: 'Permission denied' };
      }

      const { payload } = message as { payload?: { intensity?: number; color?: string } };
      if (payload) {
        store.setAmbientLight(payload);
      }
      return { success: true };
    }

    case 'environment:lighting:point:add': {
      if (!hasCapability(widgetCapabilities, 'environment:lighting')) {
        return { success: false, error: 'Permission denied' };
      }

      const { payload } = message as {
        payload?: {
          intensity: number;
          color: string;
          position: [number, number, number];
          distance?: number;
          decay?: number;
        };
      };

      if (!payload) {
        return { success: false, error: 'Missing point light configuration' };
      }

      const id = store.addPointLight({
        intensity: payload.intensity,
        color: payload.color,
        position: payload.position,
        distance: payload.distance ?? 10,
        decay: payload.decay ?? 2,
      });

      return { success: true, data: { id } };
    }

    case 'environment:lighting:point:remove': {
      if (!hasCapability(widgetCapabilities, 'environment:lighting')) {
        return { success: false, error: 'Permission denied' };
      }

      const { payload } = message as { payload?: { id: string } };
      if (!payload?.id) {
        return { success: false, error: 'Missing point light id' };
      }

      store.removePointLight(payload.id);
      return { success: true };
    }

    // ========== Background Operations ==========

    case 'environment:background': {
      if (!hasCapability(widgetCapabilities, 'environment:background')) {
        return { success: false, error: 'Permission denied: environment:background required' };
      }

      const { payload } = message as { payload?: BackgroundConfig };
      if (!payload) {
        return { success: false, error: 'Missing background configuration' };
      }

      store.setBackground(payload);
      return { success: true };
    }

    case 'environment:background:color': {
      if (!hasCapability(widgetCapabilities, 'environment:background')) {
        return { success: false, error: 'Permission denied' };
      }

      const { payload } = message as { payload?: { color: string } };
      if (!payload?.color) {
        return { success: false, error: 'Missing color' };
      }

      store.setBackgroundColor(payload.color);
      return { success: true };
    }

    // ========== Floor Operations ==========

    case 'environment:floor': {
      if (!hasCapability(widgetCapabilities, 'environment:floor')) {
        return { success: false, error: 'Permission denied: environment:floor required' };
      }

      const { payload } = message as { payload?: Partial<FloorConfig> };
      if (!payload) {
        return { success: false, error: 'Missing floor configuration' };
      }

      store.setFloor(payload);
      return { success: true };
    }

    case 'environment:floor:type': {
      if (!hasCapability(widgetCapabilities, 'environment:floor')) {
        return { success: false, error: 'Permission denied' };
      }

      const { payload } = message as {
        payload?: { type: 'none' | 'grid' | 'solid' | 'reflective' };
      };
      if (!payload?.type) {
        return { success: false, error: 'Missing floor type' };
      }

      store.setFloorType(payload.type);
      return { success: true };
    }

    // ========== Filter Operations ==========

    case 'environment:filter:bloom': {
      if (!hasCapability(widgetCapabilities, 'environment:filters')) {
        return { success: false, error: 'Permission denied: environment:filters required' };
      }

      const { payload } = message as {
        payload?: { enabled?: boolean; intensity?: number; threshold?: number; radius?: number };
      };
      if (payload) {
        store.setBloom(payload);
      }
      return { success: true };
    }

    case 'environment:filter:vignette': {
      if (!hasCapability(widgetCapabilities, 'environment:filters')) {
        return { success: false, error: 'Permission denied' };
      }

      const { payload } = message as {
        payload?: { enabled?: boolean; offset?: number; darkness?: number };
      };
      if (payload) {
        store.setVignette(payload);
      }
      return { success: true };
    }

    case 'environment:filter:colorgrading': {
      if (!hasCapability(widgetCapabilities, 'environment:filters')) {
        return { success: false, error: 'Permission denied' };
      }

      const { payload } = message as {
        payload?: {
          enabled?: boolean;
          saturation?: number;
          contrast?: number;
          brightness?: number;
          tint?: string;
        };
      };
      if (payload) {
        store.setColorGrading(payload);
      }
      return { success: true };
    }

    case 'environment:fog': {
      if (!hasCapability(widgetCapabilities, 'environment:filters')) {
        return { success: false, error: 'Permission denied' };
      }

      const { payload } = message as {
        payload?: {
          enabled?: boolean;
          type?: 'linear' | 'exponential';
          color?: string;
          near?: number;
          far?: number;
          density?: number;
        };
      };
      if (payload) {
        store.setFog(payload);
      }
      return { success: true };
    }

    // ========== Bulk Update ==========

    case 'environment:set': {
      // Requires full access for bulk updates
      if (!hasCapability(widgetCapabilities, 'environment:full')) {
        return { success: false, error: 'Permission denied: environment:full required' };
      }

      const { payload } = message as { payload?: Partial<SpatialEnvironmentState> };
      if (payload) {
        store.updateEnvironment(payload);
      }
      return { success: true };
    }

    // ========== Reset ==========

    case 'environment:reset': {
      if (!hasCapability(widgetCapabilities, 'environment:full')) {
        return { success: false, error: 'Permission denied' };
      }

      store.reset();
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown environment message type: ${message.type}` };
  }
}

/**
 * Convenience function to create environment messages
 */
export const EnvironmentMessages = {
  getState: () => ({ type: 'environment:get' }),
  getPresets: () => ({ type: 'environment:presets' }),

  applyPreset: (name: string) => ({
    type: 'environment:preset',
    payload: { name },
  }),

  setBackgroundColor: (color: string) => ({
    type: 'environment:background:color',
    payload: { color },
  }),

  setAmbientLight: (intensity: number, color?: string) => ({
    type: 'environment:lighting:ambient',
    payload: { intensity, ...(color && { color }) },
  }),

  addPointLight: (config: {
    intensity: number;
    color: string;
    position: [number, number, number];
  }) => ({
    type: 'environment:lighting:point:add',
    payload: config,
  }),

  setFloorType: (type: 'none' | 'grid' | 'solid' | 'reflective') => ({
    type: 'environment:floor:type',
    payload: { type },
  }),

  enableBloom: (intensity = 1) => ({
    type: 'environment:filter:bloom',
    payload: { enabled: true, intensity },
  }),

  disableBloom: () => ({
    type: 'environment:filter:bloom',
    payload: { enabled: false },
  }),
};
