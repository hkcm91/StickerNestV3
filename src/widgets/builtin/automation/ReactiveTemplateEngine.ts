/**
 * Reactive Template Engine
 *
 * Computes dynamic zone bounds based on user input length.
 * Black zones (text areas) grow/shrink to fit content,
 * while maintaining template aesthetics.
 */

import type {
  ContentZone,
  ZoneBounds,
  UserFormData,
  TemplateDimensions,
} from './types';

// =============================================================================
// Reactive Zone Configuration Types
// =============================================================================

export interface ReactiveZoneRules {
  /** Whether this zone should resize based on content */
  reactive: boolean;

  /** Minimum width as percentage of template width */
  minWidth?: number;

  /** Maximum width as percentage of template width */
  maxWidth?: number;

  /** Minimum height as percentage of template height */
  minHeight?: number;

  /** Maximum height as percentage of template height */
  maxHeight?: number;

  /** How to handle overflow: grow zone or use ellipsis */
  overflowBehavior?: 'grow' | 'ellipsis' | 'scale';

  /** Characters per unit width (for estimating text width) */
  charsPerUnitWidth?: number;

  /** Lines per unit height (for estimating text height) */
  linesPerUnitHeight?: number;

  /** Padding around text content in pixels */
  contentPadding?: number;

  /** Zones that should move when this zone grows */
  pushesZones?: string[];

  /** Direction to grow: 'right', 'down', 'both' */
  growDirection?: 'right' | 'down' | 'both';
}

export interface ReactiveContentZone extends ContentZone {
  /** Reactive sizing rules */
  reactiveRules?: ReactiveZoneRules;
}

export interface ReactiveTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;

  dimensions: TemplateDimensions;
  zones: ReactiveContentZone[];

  promptTemplate: string;
  negativePromptBase: string;
  styleHints: string[];

  defaultColors: {
    primary: string;
    secondary: string;
    accent?: string;
    background?: string;
    text?: string;
  };

  /** AI Compositor instruction explaining black/white zones */
  compositorPrompt: string;

  thumbnail?: string;
  version: string;
  tags?: string[];
}

// =============================================================================
// Text Measurement Utilities
// =============================================================================

interface TextMeasurement {
  width: number;
  height: number;
  lines: number;
}

/**
 * Estimates text dimensions based on font size and content
 */
function measureText(
  text: string,
  fontSize: number,
  maxWidth: number,
  fontWeight: string = 'normal'
): TextMeasurement {
  // Character width estimation (varies by font weight)
  const charWidthRatio = fontWeight === 'bold' ? 0.65 : 0.55;
  const avgCharWidth = fontSize * charWidthRatio;

  // Line height estimation
  const lineHeight = fontSize * 1.4;

  // Calculate text width
  const textWidth = text.length * avgCharWidth;

  // Calculate lines needed
  const lines = Math.max(1, Math.ceil(textWidth / maxWidth));

  // Calculate total width (capped at maxWidth if multiline)
  const width = lines > 1 ? maxWidth : textWidth;

  // Calculate height
  const height = lines * lineHeight;

  return { width, height, lines };
}

/**
 * Measures actual text width using canvas (for more accurate sizing)
 */
function measureTextCanvas(
  text: string,
  fontSize: number,
  fontFamily: string = 'system-ui',
  fontWeight: string = 'normal'
): number {
  // Create offscreen canvas for measurement
  if (typeof document === 'undefined') {
    // Fallback for non-browser environments
    return text.length * fontSize * 0.55;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * fontSize * 0.55;

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
}

// =============================================================================
// Reactive Zone Calculator
// =============================================================================

export interface ComputedZone extends ContentZone {
  /** Computed bounds after reactive adjustment */
  computedBounds: ZoneBounds;

  /** Original bounds before adjustment */
  originalBounds: ZoneBounds;

  /** The text content that was used for sizing */
  textContent?: string;
}

/**
 * Computes reactive zone bounds based on user data
 */
export function computeReactiveZones(
  template: ReactiveTemplate,
  userData: UserFormData
): ComputedZone[] {
  const { dimensions, zones } = template;

  // Track cumulative offsets for zones that push others
  const offsets: Record<string, { x: number; y: number }> = {};

  // First pass: compute individual zone sizes
  const computedZones: ComputedZone[] = zones.map(zone => {
    const computed = computeSingleZone(zone, userData, dimensions);
    return computed;
  });

  // Second pass: apply push rules
  for (const zone of computedZones) {
    const rules = (zone as ReactiveContentZone).reactiveRules;
    if (!rules?.pushesZones?.length) continue;

    const growthX = zone.computedBounds.width - zone.originalBounds.width;
    const growthY = zone.computedBounds.height - zone.originalBounds.height;

    for (const targetId of rules.pushesZones) {
      const targetZone = computedZones.find(z => z.id === targetId);
      if (!targetZone) continue;

      // Apply offset based on grow direction
      if (rules.growDirection === 'right' || rules.growDirection === 'both') {
        targetZone.computedBounds.x += growthX;
      }
      if (rules.growDirection === 'down' || rules.growDirection === 'both') {
        targetZone.computedBounds.y += growthY;
      }
    }
  }

  return computedZones;
}

/**
 * Computes bounds for a single reactive zone
 */
function computeSingleZone(
  zone: ReactiveContentZone,
  userData: UserFormData,
  dimensions: TemplateDimensions
): ComputedZone {
  const originalBounds = { ...zone.bounds };
  let computedBounds = { ...zone.bounds };

  const rules = zone.reactiveRules;
  let textContent: string | undefined;

  // If zone is not reactive or not a text zone, return as-is
  if (!rules?.reactive || zone.type !== 'text' || !zone.textConfig) {
    return {
      ...zone,
      computedBounds,
      originalBounds,
    };
  }

  // Get the mapped field value
  const fieldName = zone.textConfig.fieldMapping;
  textContent = userData[fieldName] || '';

  if (!textContent) {
    return {
      ...zone,
      computedBounds,
      originalBounds,
      textContent: '',
    };
  }

  // Convert bounds to pixels for calculation
  let boundsInPx = {
    x: (originalBounds.x / 100) * dimensions.width,
    y: (originalBounds.y / 100) * dimensions.height,
    width: (originalBounds.width / 100) * dimensions.width,
    height: (originalBounds.height / 100) * dimensions.height,
  };

  // Measure the text
  const fontSize = zone.textConfig.fontSize;
  const fontWeight = zone.textConfig.fontWeight || 'normal';

  // Calculate required dimensions
  const measurement = measureText(
    textContent,
    fontSize,
    boundsInPx.width,
    fontWeight
  );

  // Add padding
  const padding = rules.contentPadding ?? 8;
  const requiredWidth = measurement.width + padding * 2;
  const requiredHeight = measurement.height + padding * 2;

  // Apply min/max constraints
  const minWidth = rules.minWidth
    ? (rules.minWidth / 100) * dimensions.width
    : boundsInPx.width * 0.5;
  const maxWidth = rules.maxWidth
    ? (rules.maxWidth / 100) * dimensions.width
    : boundsInPx.width * 2;
  const minHeight = rules.minHeight
    ? (rules.minHeight / 100) * dimensions.height
    : boundsInPx.height * 0.5;
  const maxHeight = rules.maxHeight
    ? (rules.maxHeight / 100) * dimensions.height
    : boundsInPx.height * 2;

  // Compute new dimensions based on grow direction
  let newWidth = boundsInPx.width;
  let newHeight = boundsInPx.height;

  if (rules.growDirection === 'right' || rules.growDirection === 'both') {
    newWidth = Math.min(maxWidth, Math.max(minWidth, requiredWidth));
  }

  if (rules.growDirection === 'down' || rules.growDirection === 'both') {
    newHeight = Math.min(maxHeight, Math.max(minHeight, requiredHeight));
  }

  // Convert back to percentage
  computedBounds = {
    ...originalBounds,
    width: (newWidth / dimensions.width) * 100,
    height: (newHeight / dimensions.height) * 100,
  };

  return {
    ...zone,
    computedBounds,
    originalBounds,
    textContent,
  };
}

// =============================================================================
// Mask Generation with Reactive Zones
// =============================================================================

export interface GeneratedMask {
  /** Base64 PNG data URL of the mask */
  dataUrl: string;

  /** Width of the mask */
  width: number;

  /** Height of the mask */
  height: number;

  /** Computed zones with bounds */
  zones: ComputedZone[];

  /** SVG path data for vector representation */
  svgPaths: string[];
}

/**
 * Generates a composition mask from computed reactive zones
 * Black zones = content areas (AI avoids)
 * White zones = design space (AI fills)
 */
export function generateReactiveMask(
  template: ReactiveTemplate,
  computedZones: ComputedZone[]
): GeneratedMask {
  const { width, height } = template.dimensions;

  // Create canvas
  if (typeof document === 'undefined') {
    // Return placeholder for non-browser environments
    return {
      dataUrl: '',
      width,
      height,
      zones: computedZones,
      svgPaths: [],
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      dataUrl: '',
      width,
      height,
      zones: computedZones,
      svgPaths: [],
    };
  }

  // Fill with white (AI design space)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Draw black zones (content areas)
  ctx.fillStyle = '#000000';

  const svgPaths: string[] = [];

  for (const zone of computedZones) {
    // Only draw zones with maskValue = 0 (black/content)
    if (zone.maskValue !== 0) continue;

    const bounds = zone.computedBounds;

    // Convert percentage to pixels
    const x = bounds.unit === 'percent'
      ? (bounds.x / 100) * width
      : bounds.x;
    const y = bounds.unit === 'percent'
      ? (bounds.y / 100) * height
      : bounds.y;
    const w = bounds.unit === 'percent'
      ? (bounds.width / 100) * width
      : bounds.width;
    const h = bounds.unit === 'percent'
      ? (bounds.height / 100) * height
      : bounds.height;

    // Add mask padding
    const padding = zone.maskPadding || 4;
    const px = Math.max(0, x - padding);
    const py = Math.max(0, y - padding);
    const pw = Math.min(width - px, w + padding * 2);
    const ph = Math.min(height - py, h + padding * 2);

    // Draw rectangle
    ctx.fillRect(px, py, pw, ph);

    // Generate SVG path for vector representation
    svgPaths.push(`M ${px} ${py} H ${px + pw} V ${py + ph} H ${px} Z`);
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
    zones: computedZones,
    svgPaths,
  };
}

// =============================================================================
// AI Compositor Prompt Builder
// =============================================================================

/**
 * Builds the AI prompt with zone awareness
 */
export function buildCompositorAwarePrompt(
  template: ReactiveTemplate,
  mask: GeneratedMask,
  stylePrompt: string
): { prompt: string; systemPrompt: string } {
  // Base prompt from template
  let prompt = template.promptTemplate;

  // Add style prompt
  prompt = prompt.replace(/\{\{stylePrompt\}\}/gi, stylePrompt);

  // System prompt explaining the mask
  const systemPrompt = `
${template.compositorPrompt}

MASK ZONES:
${mask.zones
  .filter(z => z.maskValue === 0)
  .map(z => `- ${z.id}: ${z.type} zone at (${z.computedBounds.x.toFixed(1)}%, ${z.computedBounds.y.toFixed(1)}%) - ${z.computedBounds.width.toFixed(1)}% x ${z.computedBounds.height.toFixed(1)}%`)
  .join('\n')}

INSTRUCTIONS:
- BLACK areas in the mask are reserved for text/content overlay
- WHITE areas should be filled with beautiful, contextual design
- Design should complement the text areas without competing
- Maintain visual balance and professional aesthetics
`.trim();

  return { prompt, systemPrompt };
}

// =============================================================================
// Template Validation
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateReactiveTemplate(template: ReactiveTemplate): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!template.id) errors.push('Template ID is required');
  if (!template.name) errors.push('Template name is required');
  if (!template.dimensions) errors.push('Template dimensions are required');
  if (!template.zones?.length) errors.push('At least one zone is required');
  if (!template.promptTemplate) errors.push('Prompt template is required');
  if (!template.compositorPrompt) warnings.push('Compositor prompt is recommended');

  // Validate zones
  for (const zone of template.zones || []) {
    if (!zone.id) errors.push('Zone ID is required');
    if (!zone.bounds) errors.push(`Zone ${zone.id}: bounds are required`);
    if (zone.maskValue !== 0 && zone.maskValue !== 255) {
      errors.push(`Zone ${zone.id}: maskValue must be 0 or 255`);
    }

    // Check reactive rules
    if (zone.reactiveRules?.reactive) {
      if (zone.type !== 'text') {
        warnings.push(`Zone ${zone.id}: reactive sizing only applies to text zones`);
      }
      if (!zone.textConfig?.fieldMapping) {
        errors.push(`Zone ${zone.id}: reactive text zone needs fieldMapping`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default {
  computeReactiveZones,
  generateReactiveMask,
  buildCompositorAwarePrompt,
  validateReactiveTemplate,
};
