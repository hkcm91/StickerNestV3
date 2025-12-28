/**
 * StickerNest v2 - UI Constants
 *
 * Centralized constants for UI dimensions, spacing, timing, and z-index values.
 * Using named constants improves maintainability and consistency across the app.
 */

// =============================================================================
// Spacing & Sizing
// =============================================================================

/**
 * Base spacing unit (8px grid system)
 */
export const SPACING = {
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 20px */
  xl: 20,
  /** 24px */
  xxl: 24,
  /** 32px */
  xxxl: 32,
} as const;

/**
 * Border radius values
 */
export const RADIUS = {
  /** 4px - Small elements like badges */
  sm: 4,
  /** 6px - Buttons, inputs */
  md: 6,
  /** 8px - Cards, panels */
  lg: 8,
  /** 12px - Modals */
  xl: 12,
  /** 16px - Large containers */
  xxl: 16,
  /** Full circle */
  full: 9999,
} as const;

/**
 * Font sizes
 */
export const FONT_SIZE = {
  /** 10px - Labels, hints */
  xs: 10,
  /** 11px - Secondary text */
  sm: 11,
  /** 12px - Body small */
  md: 12,
  /** 13px - Body */
  base: 13,
  /** 14px - Body large */
  lg: 14,
  /** 16px - Subheadings */
  xl: 16,
  /** 18px - Headings */
  xxl: 18,
  /** 24px - Large headings */
  h2: 24,
  /** 32px - Page titles */
  h1: 32,
} as const;

// =============================================================================
// Z-Index Layers
// =============================================================================

/**
 * Z-index layering system to prevent z-index conflicts
 */
export const Z_INDEX = {
  /** Base layer for widgets */
  widget: 1,
  /** Selected widget */
  widgetSelected: 100,
  /** Drag preview */
  dragPreview: 500,
  /** Floating panels (properties, library) */
  panel: 1000,
  /** Toolbars */
  toolbar: 1001,
  /** Dropdowns and menus */
  dropdown: 1100,
  /** Tooltips */
  tooltip: 1200,
  /** Modals and dialogs */
  modal: 2000,
  /** Modal backdrop */
  modalBackdrop: 1999,
  /** Notifications/toasts */
  notification: 3000,
  /** Debug overlays */
  debug: 9000,
  /** Visual effects layer */
  effects: 9999,
} as const;

// =============================================================================
// Animation Timing
// =============================================================================

/**
 * Animation duration values (in milliseconds)
 */
export const DURATION = {
  /** 100ms - Micro interactions */
  fast: 100,
  /** 150ms - Quick feedback */
  quick: 150,
  /** 200ms - Standard transitions */
  normal: 200,
  /** 300ms - Medium animations */
  medium: 300,
  /** 500ms - Slow animations */
  slow: 500,
} as const;

/**
 * Animation duration values (in CSS format)
 */
export const DURATION_CSS = {
  fast: '100ms',
  quick: '150ms',
  normal: '200ms',
  medium: '300ms',
  slow: '500ms',
} as const;

// =============================================================================
// Component-Specific Sizes
// =============================================================================

/**
 * Button sizes
 */
export const BUTTON_SIZE = {
  sm: {
    padding: '4px 8px',
    fontSize: 11,
    minHeight: 28,
  },
  md: {
    padding: '6px 12px',
    fontSize: 12,
    minHeight: 32,
  },
  lg: {
    padding: '10px 16px',
    fontSize: 14,
    minHeight: 44,
  },
} as const;

/**
 * Touch target minimum sizes (for mobile accessibility)
 */
export const TOUCH_TARGET = {
  /** Minimum touch target size */
  min: 44,
  /** Recommended touch target size */
  recommended: 48,
} as const;

/**
 * Panel widths
 */
export const PANEL_WIDTH = {
  /** Narrow sidebar */
  narrow: 240,
  /** Standard sidebar */
  standard: 280,
  /** Wide sidebar */
  wide: 320,
  /** Properties panel */
  properties: 300,
  /** Library panel */
  library: 320,
} as const;

/**
 * Modal sizes
 */
export const MODAL_SIZE = {
  sm: {
    width: 400,
    maxHeight: '80vh',
  },
  md: {
    width: 500,
    maxHeight: '85vh',
  },
  lg: {
    width: 700,
    maxHeight: '90vh',
  },
  xl: {
    width: 900,
    maxHeight: '90vh',
  },
} as const;

// =============================================================================
// Canvas Constants
// =============================================================================

/**
 * Default canvas dimensions
 */
export const CANVAS = {
  /** Default width */
  defaultWidth: 1920,
  /** Default height */
  defaultHeight: 1080,
  /** Minimum width */
  minWidth: 320,
  /** Minimum height */
  minHeight: 240,
  /** Maximum width */
  maxWidth: 7680,
  /** Maximum height */
  maxHeight: 4320,
} as const;

/**
 * Grid settings
 */
export const GRID = {
  /** Default grid size */
  defaultSize: 10,
  /** Minimum grid size */
  minSize: 5,
  /** Maximum grid size */
  maxSize: 100,
} as const;

/**
 * Zoom settings
 */
export const ZOOM = {
  /** Minimum zoom level */
  min: 0.1,
  /** Maximum zoom level */
  max: 5,
  /** Default zoom level */
  default: 1,
  /** Zoom step for buttons */
  step: 0.1,
  /** Zoom levels for preset menu */
  presets: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4],
} as const;

// =============================================================================
// Widget Constants
// =============================================================================

/**
 * Widget size defaults
 */
export const WIDGET = {
  /** Default width */
  defaultWidth: 300,
  /** Default height */
  defaultHeight: 200,
  /** Minimum width */
  minWidth: 50,
  /** Minimum height */
  minHeight: 50,
  /** Handle size for resize */
  handleSize: 10,
  /** Selection border width */
  selectionBorder: 2,
} as const;

/**
 * Sticker size defaults
 */
export const STICKER = {
  /** Default size */
  defaultSize: 100,
  /** Minimum size */
  minSize: 24,
  /** Maximum size */
  maxSize: 500,
} as const;

// =============================================================================
// Breakpoints
// =============================================================================

/**
 * Responsive breakpoints
 */
export const BREAKPOINT = {
  /** Mobile: 0-767px */
  mobile: 768,
  /** Tablet: 768-1023px */
  tablet: 1024,
  /** Desktop: 1024-1279px */
  desktop: 1280,
  /** Large desktop: 1280+ */
  large: 1440,
} as const;

// =============================================================================
// API & Network
// =============================================================================

/**
 * API timeout values (in milliseconds)
 */
export const TIMEOUT = {
  /** Short timeout for quick requests */
  short: 5000,
  /** Standard timeout */
  standard: 10000,
  /** Long timeout for uploads */
  long: 30000,
  /** Very long timeout for generation */
  generation: 60000,
} as const;

/**
 * Retry settings
 */
export const RETRY = {
  /** Maximum retry attempts */
  maxAttempts: 3,
  /** Base delay between retries (ms) */
  baseDelay: 1000,
  /** Delay multiplier for exponential backoff */
  multiplier: 2,
} as const;

// =============================================================================
// Debounce & Throttle
// =============================================================================

/**
 * Debounce delay values (in milliseconds)
 */
export const DEBOUNCE = {
  /** Fast: 100ms - For immediate feedback */
  fast: 100,
  /** Short: 200ms - For typing */
  short: 200,
  /** Normal: 300ms - Standard debounce */
  normal: 300,
  /** Long: 500ms - For expensive operations */
  long: 500,
} as const;
