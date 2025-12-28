/**
 * Widget Lab Constants
 * Configuration options for widget generation
 */

import type { ComplexityLevel, StylePreset, FeatureRequirements } from '../ai';

export const COMPLEXITY_OPTIONS: { id: ComplexityLevel; label: string; description: string }[] = [
  { id: 'basic', label: 'Basic', description: 'Simple widget' },
  { id: 'standard', label: 'Standard', description: 'Full-featured' },
  { id: 'advanced', label: 'Advanced', description: 'Sophisticated' },
  { id: 'professional', label: 'Professional', description: 'Production-ready' },
];

export const STYLE_OPTIONS: { id: StylePreset; label: string }[] = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'polished', label: 'Polished' },
  { id: 'elaborate', label: 'Elaborate' },
  { id: 'glassmorphism', label: 'Glass' },
  { id: 'neon', label: 'Neon' },
  { id: 'retro', label: 'Retro' },
];

export const FEATURE_OPTIONS: { id: keyof FeatureRequirements; label: string; default: boolean }[] = [
  { id: 'animations', label: 'Animations', default: true },
  { id: 'microInteractions', label: 'Hover Effects', default: true },
  { id: 'responsive', label: 'Responsive', default: true },
  { id: 'persistence', label: 'Save State', default: false },
  { id: 'loadingStates', label: 'Loading States', default: false },
  { id: 'errorHandling', label: 'Error Handling', default: false },
  { id: 'keyboardShortcuts', label: 'Keyboard Nav', default: false },
  { id: 'accessibility', label: 'Accessibility', default: false },
];

export const EXAMPLE_PROMPTS = [
  'A color picker with RGB sliders that emits color-changed events',
  'A task manager with add, complete, and delete functionality',
  'A countdown timer with start, pause, and reset controls',
  'A dice roller with animation and history of rolls',
  'A random quote generator that fetches and displays quotes',
  'A volume control slider with mute toggle',
  'A progress tracker showing completion percentage',
  'An emoji picker grid that emits selected emoji',
];

export const TEST_WIDGET_TYPES = [
  { type: 'vector-control' as const, label: 'Vector Control', icon: '🎨', desc: 'Controls fill & shadow' },
  { type: 'timer' as const, label: 'Timer', icon: '⏱️', desc: 'Countdown timer' },
  { type: 'button' as const, label: 'Button', icon: '🔘', desc: 'Trigger button' },
  { type: 'display' as const, label: 'Display', icon: '📺', desc: 'Shows values' },
] as const;

export type TestWidgetType = typeof TEST_WIDGET_TYPES[number]['type'];

// Default features for new widgets
export const getDefaultFeatures = (): FeatureRequirements => {
  const initial: FeatureRequirements = {};
  FEATURE_OPTIONS.forEach(opt => {
    initial[opt.id] = opt.default;
  });
  return initial;
};
