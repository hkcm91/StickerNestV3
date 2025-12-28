/**
 * StickerNest v2 - Custom Theme Types
 * Extended type definitions for user-customizable themes
 */

/**
 * Theme mode - dark or light base
 */
export type ThemeMode = 'dark' | 'light';

/**
 * Gradient definition for backgrounds
 */
export interface GradientConfig {
  /** Gradient type */
  type: 'linear' | 'radial' | 'conic';
  /** Angle for linear gradient (degrees) */
  angle?: number;
  /** Color stops */
  stops: Array<{
    color: string;
    position: number; // 0-100
  }>;
}

/**
 * Parallax layer configuration for animated backgrounds
 */
export interface ParallaxLayer {
  /** Unique identifier for the layer */
  id: string;
  /** Layer type */
  type: 'gradient' | 'image' | 'particles' | 'shapes';
  /** Depth factor (0 = background, 1 = foreground) - affects parallax speed */
  depth: number;
  /** Opacity of this layer (0-1) */
  opacity: number;
  /** Blend mode for the layer */
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
  /** For gradient layers */
  gradient?: GradientConfig;
  /** For image layers */
  imageUrl?: string;
  /** For particle layers */
  particles?: ParticleConfig;
  /** For shape layers (floating shapes like leaves, bubbles) */
  shapes?: ShapeConfig;
  /** Animation settings for this layer */
  animation?: LayerAnimation;
}

/**
 * Particle configuration for animated particle effects
 */
export interface ParticleConfig {
  /** Type of particle effect */
  type: 'bubbles' | 'fireflies' | 'bokeh' | 'dust' | 'stars' | 'snow' | 'rain' | 'custom';
  /** Number of particles */
  count: number;
  /** Minimum particle size in pixels */
  sizeMin: number;
  /** Maximum particle size in pixels */
  sizeMax: number;
  /** Colors for particles (will be randomly selected) */
  colors: string[];
  /** Particle opacity range */
  opacityMin: number;
  opacityMax: number;
  /** Animation speed multiplier (1 = normal) */
  speed: number;
  /** Whether particles glow */
  glow?: boolean;
  /** Glow intensity (0-1) */
  glowIntensity?: number;
  /** Movement direction: 'up' | 'down' | 'random' | 'float' */
  direction?: 'up' | 'down' | 'random' | 'float';
  /** Whether particles should respond to mouse */
  interactive?: boolean;
}

/**
 * Shape configuration for floating decorative shapes
 */
export interface ShapeConfig {
  /** Type of shape */
  type: 'circle' | 'blob' | 'leaf' | 'custom';
  /** Number of shapes */
  count: number;
  /** Minimum size */
  sizeMin: number;
  /** Maximum size */
  sizeMax: number;
  /** Colors for shapes */
  colors: string[];
  /** Opacity range */
  opacityMin: number;
  opacityMax: number;
  /** Rotation animation */
  rotate?: boolean;
  /** Custom SVG path for 'custom' type */
  customPath?: string;
  /** Blur amount for shapes (creates soft effect) */
  blur?: number;
}

/**
 * Animation settings for a parallax layer
 */
export interface LayerAnimation {
  /** Animation type */
  type: 'drift' | 'pulse' | 'wave' | 'rotate' | 'none';
  /** Duration in milliseconds */
  duration: number;
  /** Easing function */
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  /** Animation delay */
  delay?: number;
}

/**
 * Complete parallax background configuration
 */
export interface ParallaxConfig {
  /** Whether parallax effect is enabled */
  enabled: boolean;
  /** Parallax intensity (0-1, how much layers move on mouse) */
  intensity: number;
  /** Base gradient for the background */
  baseGradient?: GradientConfig;
  /** Parallax layers (rendered from back to front by depth) */
  layers: ParallaxLayer[];
  /** Whether to respond to mouse movement */
  mouseParallax?: boolean;
  /** Whether to respond to scroll */
  scrollParallax?: boolean;
  /** Overall animation speed multiplier */
  animationSpeed?: number;
  /** Global blur for background layers (creates depth) */
  backgroundBlur?: number;
}

/**
 * Rainbow/multicolor accent configuration
 */
export interface RainbowAccentConfig {
  /** Whether rainbow accents are enabled */
  enabled: boolean;
  /** Rainbow color palette */
  colors: {
    red: string;
    orange: string;
    yellow: string;
    green: string;
    cyan: string;
    blue: string;
    purple: string;
    pink: string;
  };
  /** Animation speed for rainbow effects (ms) */
  animationSpeed?: number;
  /** Whether to use animated gradients */
  animated?: boolean;
}

/**
 * Background configuration supporting solid, gradient, image, or parallax
 */
export interface BackgroundConfig {
  /** Background type */
  type: 'solid' | 'gradient' | 'image' | 'parallax';
  /** Solid color (when type is 'solid') */
  color?: string;
  /** Gradient config (when type is 'gradient') */
  gradient?: GradientConfig;
  /** Image URL (when type is 'image') */
  imageUrl?: string;
  /** Overlay color for image backgrounds */
  overlay?: string;
  /** Parallax config (when type is 'parallax') */
  parallax?: ParallaxConfig;
}

/**
 * Custom theme color palette
 */
export interface ThemeColors {
  /** Background colors */
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    surface: string;
    elevated: string;
    overlay: string;
  };
  /** Text colors */
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    inverse: string;
    link: string;
  };
  /** Primary accent color (can be gradient) */
  accent: {
    primary: string;
    secondary: string;
    tertiary: string;
    hover: string;
    active: string;
  };
  /** Border colors */
  border: {
    primary: string;
    secondary: string;
    accent: string;
    focus: string;
  };
  /** Semantic colors */
  semantic: {
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    error: string;
    errorBg: string;
    info: string;
    infoBg: string;
  };
}

/**
 * Theme effects configuration
 */
export interface ThemeEffects {
  /** Glass/blur effect intensity (0-20) */
  glassBlur: number;
  /** Glass background opacity (0-1) */
  glassOpacity: number;
  /** Shadow intensity multiplier (0-2) */
  shadowIntensity: number;
  /** Border radius scale multiplier (0.5-2) */
  radiusScale: number;
  /** Enable glow effects */
  glowEnabled: boolean;
  /** Glow color (uses accent if not set) */
  glowColor?: string;
  /** Canvas wrapper glass/frost effect */
  canvasGlass?: {
    /** Whether canvas glass effect is enabled */
    enabled: boolean;
    /** Backdrop blur amount (0-30px) */
    blur: number;
    /** Background tint color with opacity */
    tint: string;
    /** Border color for glass panels */
    borderColor: string;
    /** Border width */
    borderWidth: number;
    /** Inner shadow for depth */
    innerShadow?: string;
  };
  /** Navbar glass effect configuration */
  navbarGlass?: {
    /** Whether navbar glass effect is enabled */
    enabled: boolean;
    /** Backdrop blur amount */
    blur: number;
    /** Background tint color with opacity */
    tint: string;
    /** Border on bottom of navbar */
    borderColor: string;
  };
}

/**
 * Complete custom theme definition
 */
export interface CustomTheme {
  /** Unique theme identifier */
  id: string;
  /** Display name */
  name: string;
  /** Theme description */
  description?: string;
  /** Theme author */
  author?: string;
  /** Theme version */
  version?: string;
  /** Base mode (dark or light) */
  mode: ThemeMode;
  /** Whether this is a user-created theme */
  isCustom: boolean;
  /** Whether this is a built-in preset */
  isPreset?: boolean;
  /** Preview thumbnail (base64 or URL) */
  preview?: string;
  /** Creation timestamp */
  createdAt?: number;
  /** Last modified timestamp */
  updatedAt?: number;

  /** App background configuration */
  appBackground: BackgroundConfig;
  /** Color palette */
  colors: ThemeColors;
  /** Rainbow accent configuration */
  rainbow: RainbowAccentConfig;
  /** Visual effects configuration */
  effects: ThemeEffects;

  /** Additional CSS variable overrides */
  customVariables?: Record<string, string>;
  /** Raw CSS to inject */
  customCss?: string;
}

/**
 * Theme preset - a starting point for customization
 */
export interface ThemePreset extends Omit<CustomTheme, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'> {
  /** Preset identifier */
  presetId: string;
}

/**
 * Partial theme for updates
 */
export type ThemeUpdate = Partial<Omit<CustomTheme, 'id' | 'isPreset'>>;

/**
 * Theme export format
 */
export interface ThemeExport {
  /** Export format version */
  version: '1.0';
  /** Export timestamp */
  exportedAt: number;
  /** Theme data */
  theme: CustomTheme;
}

/**
 * Default rainbow colors
 */
export const DEFAULT_RAINBOW_COLORS: RainbowAccentConfig['colors'] = {
  red: '#ff6b6b',
  orange: '#ffa06b',
  yellow: '#ffd93d',
  green: '#6bcb77',
  cyan: '#4ecdc4',
  blue: '#6b9fff',
  purple: '#a855f7',
  pink: '#f472b6',
};

/**
 * Generate CSS gradient string from gradient config
 */
export function gradientToCss(gradient: GradientConfig): string {
  const stops = gradient.stops
    .map(s => `${s.color} ${s.position}%`)
    .join(', ');

  switch (gradient.type) {
    case 'linear':
      return `linear-gradient(${gradient.angle || 135}deg, ${stops})`;
    case 'radial':
      return `radial-gradient(circle, ${stops})`;
    case 'conic':
      return `conic-gradient(from ${gradient.angle || 0}deg, ${stops})`;
    default:
      return `linear-gradient(135deg, ${stops})`;
  }
}

/**
 * Generate rainbow gradient CSS
 */
export function rainbowGradientCss(colors: RainbowAccentConfig['colors'], angle = 135): string {
  return `linear-gradient(${angle}deg, ${colors.red}, ${colors.orange}, ${colors.yellow}, ${colors.green}, ${colors.cyan}, ${colors.blue}, ${colors.purple}, ${colors.pink})`;
}

/**
 * Check if a theme is valid
 */
export function isValidTheme(theme: unknown): theme is CustomTheme {
  if (!theme || typeof theme !== 'object') return false;
  const t = theme as Partial<CustomTheme>;
  return !!(
    t.id &&
    t.name &&
    t.mode &&
    t.appBackground &&
    t.colors &&
    t.rainbow &&
    t.effects
  );
}
