/**
 * StickerNest v2 - AI Types
 * Shared type definitions for the AI module
 */

/** Widget complexity level */
export type ComplexityLevel = 'basic' | 'standard' | 'advanced' | 'professional';

/** Widget style preset */
export type StylePreset = 'minimal' | 'polished' | 'elaborate' | 'glassmorphism' | 'neon' | 'retro';

/** Feature requirements */
export interface FeatureRequirements {
  /** Include smooth animations */
  animations?: boolean;
  /** Include hover/click interactions */
  microInteractions?: boolean;
  /** Include loading states */
  loadingStates?: boolean;
  /** Include error handling UI */
  errorHandling?: boolean;
  /** Include keyboard shortcuts */
  keyboardShortcuts?: boolean;
  /** Include sound effects */
  soundEffects?: boolean;
  /** Include responsive design */
  responsive?: boolean;
  /** Include accessibility features */
  accessibility?: boolean;
  /** Include data persistence */
  persistence?: boolean;
  /** Include real-time updates */
  realtime?: boolean;
}
