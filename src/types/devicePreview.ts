/**
 * StickerNest v2 - Device Preview Types
 *
 * Type definitions for device viewport simulation in fullscreen preview.
 */

// ============================================================================
// DEVICE PRESET TYPES
// ============================================================================

export interface DeviceSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'phone' | 'tablet' | 'desktop' | 'custom';
  hasNotch?: boolean;
  hasDynamicIsland?: boolean;
  hasHomeIndicator?: boolean;
  safeArea?: DeviceSafeArea;
  bezelRadius?: number;
}

// ============================================================================
// DEVICE PREVIEW STATE
// ============================================================================

export type DeviceOrientation = 'portrait' | 'landscape';

export interface DevicePreviewState {
  /** Whether device preview mode is enabled */
  enabled: boolean;
  /** Show realistic device frame with bezel */
  showFrame: boolean;
  /** Current orientation */
  orientation: DeviceOrientation;
  /** Selected preset (null = custom dimensions) */
  preset: DevicePreset | null;
  /** Custom dimensions when no preset selected */
  customDimensions: {
    width: number;
    height: number;
  };
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

export interface DevicePreviewActions {
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setShowFrame: (show: boolean) => void;
  toggleShowFrame: () => void;
  setOrientation: (orientation: DeviceOrientation) => void;
  toggleOrientation: () => void;
  setPreset: (preset: DevicePreset | null) => void;
  setCustomDimensions: (width: number, height: number) => void;
  reset: () => void;
}

// ============================================================================
// COMMON DEVICE PRESETS (for future use)
// ============================================================================

export const DEVICE_PRESETS: DevicePreset[] = [
  // Phones
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    width: 393,
    height: 852,
    category: 'phone',
    hasDynamicIsland: true,
    hasHomeIndicator: true,
    safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
    bezelRadius: 55,
  },
  {
    id: 'iphone-14',
    name: 'iPhone 14',
    width: 390,
    height: 844,
    category: 'phone',
    hasNotch: true,
    hasHomeIndicator: true,
    safeArea: { top: 47, right: 0, bottom: 34, left: 0 },
    bezelRadius: 47,
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE',
    width: 375,
    height: 667,
    category: 'phone',
    safeArea: { top: 20, right: 0, bottom: 0, left: 0 },
    bezelRadius: 0,
  },
  {
    id: 'pixel-7',
    name: 'Pixel 7',
    width: 412,
    height: 915,
    category: 'phone',
    hasNotch: false,
    safeArea: { top: 24, right: 0, bottom: 0, left: 0 },
    bezelRadius: 40,
  },
  {
    id: 'samsung-s23',
    name: 'Samsung S23',
    width: 360,
    height: 780,
    category: 'phone',
    hasNotch: false,
    safeArea: { top: 24, right: 0, bottom: 0, left: 0 },
    bezelRadius: 35,
  },

  // Tablets
  {
    id: 'ipad-pro-11',
    name: 'iPad Pro 11"',
    width: 834,
    height: 1194,
    category: 'tablet',
    hasHomeIndicator: true,
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
    bezelRadius: 18,
  },
  {
    id: 'ipad-pro-12',
    name: 'iPad Pro 12.9"',
    width: 1024,
    height: 1366,
    category: 'tablet',
    hasHomeIndicator: true,
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
    bezelRadius: 18,
  },
  {
    id: 'ipad-mini',
    name: 'iPad Mini',
    width: 744,
    height: 1133,
    category: 'tablet',
    hasHomeIndicator: true,
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
    bezelRadius: 18,
  },

  // Desktop
  {
    id: 'macbook-pro-14',
    name: 'MacBook Pro 14"',
    width: 1512,
    height: 982,
    category: 'desktop',
    hasNotch: true,
    bezelRadius: 10,
  },
  {
    id: 'desktop-1080p',
    name: 'Desktop 1080p',
    width: 1920,
    height: 1080,
    category: 'desktop',
    bezelRadius: 0,
  },
  {
    id: 'desktop-1440p',
    name: 'Desktop 1440p',
    width: 2560,
    height: 1440,
    category: 'desktop',
    bezelRadius: 0,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get effective dimensions based on orientation
 */
export function getEffectiveDimensions(
  width: number,
  height: number,
  orientation: DeviceOrientation
): { width: number; height: number } {
  if (orientation === 'landscape') {
    return { width: Math.max(width, height), height: Math.min(width, height) };
  }
  return { width: Math.min(width, height), height: Math.max(width, height) };
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find(p => p.id === id);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: DevicePreset['category']): DevicePreset[] {
  return DEVICE_PRESETS.filter(p => p.category === category);
}
