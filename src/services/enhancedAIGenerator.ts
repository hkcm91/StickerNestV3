/**
 * Widget Generator 2.0 - Enhanced AI Generation System
 *
 * Features:
 * - Capability-aware generation (uses platform capabilities)
 * - Image reference support for visual guidance
 * - Style gallery for CSS/Tailwind inspiration
 * - Skeleton-first workflow (sketch → review → full generation)
 * - Multi-turn refinement with clarifying questions
 * - Learning from existing widgets
 *
 * VERSION: 2.1.0
 */

import type { SpecJSON, WidgetCategory, VisualType, PortSpec } from '../types/specjson';
import type {
  CapabilityId,
  CapabilityDefinition,
  StandardInputCapability,
  StandardOutputCapability
} from '../types/capabilities';
import {
  STANDARD_INPUT_CAPABILITIES,
  STANDARD_OUTPUT_CAPABILITIES,
  getStandardCapability,
  areCapabilitiesCompatible
} from '../types/capabilities';
import { createDefaultSpecJSON } from '../types/specjson';
import { validateSpecJSON } from '../utils/specJsonValidator';

// ============================================================================
// TYPES - Image References
// ============================================================================

export interface ImageReference {
  id: string;
  type: 'upload' | 'url' | 'paste' | 'screenshot';
  data: string; // base64 or URL
  name?: string;
  description?: string;
  analyzedFeatures?: ImageAnalysis;
  createdAt: number;
}

export interface ImageAnalysis {
  /** Detected color palette */
  colors: string[];
  /** Detected layout type */
  layout: 'card' | 'list' | 'grid' | 'dashboard' | 'form' | 'media' | 'custom';
  /** Detected UI elements */
  elements: UIElement[];
  /** Detected style */
  style: 'minimal' | 'modern' | 'playful' | 'professional' | 'retro' | 'glassmorphic';
  /** Suggested widget types */
  suggestedTypes: string[];
  /** Extracted text (if any) */
  extractedText?: string[];
}

export interface UIElement {
  type: 'button' | 'input' | 'text' | 'image' | 'icon' | 'chart' | 'toggle' | 'slider' | 'card';
  position: { x: number; y: number; width: number; height: number };
  properties?: Record<string, unknown>;
}

// ============================================================================
// TYPES - Style Gallery
// ============================================================================

/** Snippet types - expanded to support more content types */
export type SnippetType =
  | 'css'
  | 'tailwind'
  | 'scss'
  | 'styled-components'
  | 'color-palette'
  | 'effect'
  | 'animation'
  | 'html'
  | 'javascript'
  | 'typescript'
  | 'svg'
  | 'gradient';

export interface StyleSnippet {
  id: string;
  name: string;
  description?: string;
  source?: string; // URL where found
  type: SnippetType;
  code: string;
  tags: string[];
  colors?: string[];
  previewImage?: string;
  /** For color palettes: structured color data */
  colorPalette?: ColorPalette;
  /** For effects: animation/transition metadata */
  effectMeta?: EffectMetadata;
  /** Preview settings */
  previewSettings?: PreviewSettings;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

/** Color palette structure for saved palettes */
export interface ColorPalette {
  name: string;
  colors: PaletteColor[];
  /** Palette style: complementary, analogous, triadic, etc. */
  harmony?: 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic' | 'monochromatic' | 'custom';
}

export interface PaletteColor {
  hex: string;
  name?: string;
  role?: 'primary' | 'secondary' | 'accent' | 'background' | 'text' | 'border' | 'custom';
  cssVar?: string; // e.g., --color-primary
}

/** Effect metadata for animations/transitions */
export interface EffectMetadata {
  effectType: 'animation' | 'transition' | 'transform' | 'filter' | 'shadow' | 'gradient' | 'hover' | 'scroll';
  duration?: string;
  timing?: string;
  delay?: string;
  iterations?: string;
  /** CSS properties affected */
  properties?: string[];
}

/** Preview settings for code snippets */
export interface PreviewSettings {
  /** Background color for preview */
  backgroundColor?: string;
  /** Width of preview area */
  width?: number;
  /** Height of preview area */
  height?: number;
  /** Whether to show as inline or block */
  display?: 'inline' | 'block';
  /** Custom wrapper HTML */
  wrapperHtml?: string;
  /** Additional CSS for preview */
  additionalCss?: string;
}

export interface StyleGallery {
  id: string;
  name: string;
  snippets: StyleSnippet[];
  categories: StyleCategory[];
  /** Saved color palettes (quick access) */
  palettes: ColorPalette[];
  createdAt: number;
  updatedAt: number;
}

export interface StyleCategory {
  id: string;
  name: string;
  description?: string;
  snippetIds: string[];
}

// ============================================================================
// TYPES - Skeleton-First Workflow
// ============================================================================

export type GenerationPhase = 'skeleton' | 'review' | 'refinement' | 'full';

export interface WidgetSkeleton {
  id: string;
  displayName: string;
  description: string;
  category: WidgetCategory;

  /** High-level structure */
  structure: {
    layout: 'single' | 'split' | 'grid' | 'stacked' | 'sidebar';
    mainElements: SkeletonElement[];
    interactions: SkeletonInteraction[];
  };

  /** Suggested state fields */
  suggestedState: Array<{
    name: string;
    type: string;
    purpose: string;
  }>;

  /** Suggested capabilities */
  suggestedCapabilities: {
    inputs: CapabilityId[];
    outputs: CapabilityId[];
  };

  /** AI reasoning about the design */
  reasoning: string;

  /** Questions AI wants to ask */
  clarifyingQuestions?: ClarifyingQuestion[];

  /** Confidence score 0-1 */
  confidence: number;
}

export interface SkeletonElement {
  type: 'header' | 'content' | 'footer' | 'sidebar' | 'button' | 'input' | 'display' | 'media';
  name: string;
  purpose: string;
  position: 'top' | 'center' | 'bottom' | 'left' | 'right';
}

export interface SkeletonInteraction {
  trigger: string; // e.g., "click button", "hover element"
  action: string; // e.g., "update counter", "show modal"
  stateChange?: string; // e.g., "count += 1"
}

// ============================================================================
// TYPES - Multi-Turn Refinement
// ============================================================================

export interface ClarifyingQuestion {
  id: string;
  question: string;
  type: 'choice' | 'text' | 'boolean' | 'multiselect';
  options?: string[];
  context: string; // Why we're asking
  impact: string; // How the answer affects generation
  priority: 'required' | 'recommended' | 'optional';
}

export interface RefinementSession {
  id: string;
  initialDescription: string;
  imageReferences: ImageReference[];
  styleReferences: StyleSnippet[];

  /** Current phase */
  phase: GenerationPhase;

  /** Skeleton (phase 1) */
  skeleton?: WidgetSkeleton;

  /** Questions and answers */
  clarifications: Array<{
    question: ClarifyingQuestion;
    answer: string | string[] | boolean;
  }>;

  /** Iterations of the spec */
  iterations: Array<{
    spec: SpecJSON;
    feedback?: string;
    changes?: string[];
  }>;

  /** Final spec */
  finalSpec?: SpecJSON;

  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// TYPES - Generation Request/Result
// ============================================================================

export interface EnhancedGenerationRequest {
  /** Natural language description */
  description: string;

  /** Image references for visual guidance */
  imageReferences?: ImageReference[];

  /** Style snippets for inspiration */
  styleReferences?: StyleSnippet[];

  /** Category hint */
  category?: WidgetCategory;

  /** Visual type hint */
  visualType?: VisualType;

  /** Whether to use skeleton-first workflow */
  useSkeletonWorkflow?: boolean;

  /** Existing session to continue */
  sessionId?: string;

  /** Answer to a clarifying question */
  clarificationAnswer?: {
    questionId: string;
    answer: string | string[] | boolean;
  };

  /** Feedback on current iteration */
  feedback?: string;

  /** Complexity preference */
  complexity?: 'simple' | 'standard' | 'advanced';

  /** Explicit capability requirements */
  requiredCapabilities?: {
    inputs?: CapabilityId[];
    outputs?: CapabilityId[];
  };
}

export interface EnhancedGenerationResult {
  success: boolean;

  /** Current phase */
  phase: GenerationPhase;

  /** Session for multi-turn refinement */
  session: RefinementSession;

  /** Skeleton (if in skeleton phase) */
  skeleton?: WidgetSkeleton;

  /** Questions needing answers */
  pendingQuestions?: ClarifyingQuestion[];

  /** Current spec iteration */
  currentSpec?: SpecJSON;

  /** Final spec (if complete) */
  finalSpec?: SpecJSON;

  /** Suggestions for improvement */
  suggestions?: string[];

  /** Capability recommendations */
  capabilityRecommendations?: CapabilityRecommendation[];

  /** Error if failed */
  error?: string;
}

export interface CapabilityRecommendation {
  capability: CapabilityDefinition;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  implementationHint: string;
}

// ============================================================================
// CAPABILITY-AWARE GENERATION
// ============================================================================

/**
 * Analyze description and recommend capabilities
 */
export function analyzeCapabilityNeeds(description: string): {
  inputs: CapabilityRecommendation[];
  outputs: CapabilityRecommendation[];
} {
  const lowerDesc = description.toLowerCase();
  const inputRecs: CapabilityRecommendation[] = [];
  const outputRecs: CapabilityRecommendation[] = [];

  // Text-related keywords
  if (/text|input|edit|type|write|note/i.test(lowerDesc)) {
    inputRecs.push({
      capability: getStandardCapability('text.set')!,
      reason: 'Widget handles text content',
      priority: 'high',
      implementationHint: 'Add a text.set input handler to update text content'
    });
    outputRecs.push({
      capability: getStandardCapability('text.changed')!,
      reason: 'Notify when text changes',
      priority: 'high',
      implementationHint: 'Emit text.changed when content is modified'
    });
  }

  // Timer-related keywords
  if (/timer|countdown|stopwatch|clock|time|duration/i.test(lowerDesc)) {
    inputRecs.push({
      capability: getStandardCapability('timer.start')!,
      reason: 'Widget has timer functionality',
      priority: 'high',
      implementationHint: 'Add timer.start to begin countdown'
    });
    inputRecs.push({
      capability: getStandardCapability('timer.pause')!,
      reason: 'Allow pausing the timer',
      priority: 'medium',
      implementationHint: 'Add timer.pause to pause countdown'
    });
    outputRecs.push({
      capability: getStandardCapability('timer.tick')!,
      reason: 'Emit progress updates',
      priority: 'high',
      implementationHint: 'Emit timer.tick every second with progress'
    });
    outputRecs.push({
      capability: getStandardCapability('timer.complete')!,
      reason: 'Notify when timer finishes',
      priority: 'high',
      implementationHint: 'Emit timer.complete when countdown reaches zero'
    });
  }

  // Button/Click keywords
  if (/button|click|press|tap|trigger/i.test(lowerDesc)) {
    outputRecs.push({
      capability: getStandardCapability('button.pressed')!,
      reason: 'Widget has clickable elements',
      priority: 'high',
      implementationHint: 'Emit button.pressed on click events'
    });
    outputRecs.push({
      capability: getStandardCapability('ui.clicked')!,
      reason: 'General click tracking',
      priority: 'medium',
      implementationHint: 'Emit ui.clicked with coordinates'
    });
  }

  // Animation keywords
  if (/animat|lottie|motion|transition|effect/i.test(lowerDesc)) {
    inputRecs.push({
      capability: getStandardCapability('animation.play')!,
      reason: 'Widget has animations',
      priority: 'high',
      implementationHint: 'Add animation.play to start animations'
    });
    outputRecs.push({
      capability: getStandardCapability('animation.completed')!,
      reason: 'Notify when animation ends',
      priority: 'medium',
      implementationHint: 'Emit animation.completed when done'
    });
  }

  // Data/Value keywords
  if (/data|value|number|count|score|stat/i.test(lowerDesc)) {
    inputRecs.push({
      capability: getStandardCapability('data.set')!,
      reason: 'Widget displays data values',
      priority: 'high',
      implementationHint: 'Add data.set to receive data updates'
    });
    outputRecs.push({
      capability: getStandardCapability('data.changed')!,
      reason: 'Notify when data changes',
      priority: 'high',
      implementationHint: 'Emit data.changed on value updates'
    });
  }

  // Selection keywords
  if (/select|choose|pick|option|dropdown|list/i.test(lowerDesc)) {
    outputRecs.push({
      capability: getStandardCapability('selection.changed')!,
      reason: 'Widget has selectable items',
      priority: 'high',
      implementationHint: 'Emit selection.changed when selection changes'
    });
  }

  // UI visibility keywords
  if (/show|hide|toggle|visible|modal|popup/i.test(lowerDesc)) {
    inputRecs.push({
      capability: getStandardCapability('ui.show')!,
      reason: 'Widget visibility can be controlled',
      priority: 'medium',
      implementationHint: 'Add ui.show to make widget visible'
    });
    inputRecs.push({
      capability: getStandardCapability('ui.hide')!,
      reason: 'Widget can be hidden',
      priority: 'medium',
      implementationHint: 'Add ui.hide to hide widget'
    });
  }

  // Always recommend state.changed for reactive widgets
  if (inputRecs.length > 0 || outputRecs.length > 0) {
    outputRecs.push({
      capability: getStandardCapability('state.changed')!,
      reason: 'Notify when widget state changes',
      priority: 'low',
      implementationHint: 'Emit state.changed for any state modifications'
    });
    outputRecs.push({
      capability: getStandardCapability('ready')!,
      reason: 'Notify when widget is initialized',
      priority: 'low',
      implementationHint: 'Emit ready after initialization'
    });
  }

  return { inputs: inputRecs, outputs: outputRecs };
}

/**
 * Convert capability recommendations to SpecJSON ports
 */
export function capabilitiesToPorts(
  recommendations: { inputs: CapabilityRecommendation[]; outputs: CapabilityRecommendation[] }
): { inputs: PortSpec[]; outputs: PortSpec[] } {
  const inputs: PortSpec[] = recommendations.inputs
    .filter(r => r.priority !== 'low')
    .map(r => ({
      id: r.capability.id.replace('.', '-'),
      name: r.capability.name,
      type: r.capability.payload[0]?.type || 'any',
      description: r.capability.description
    }));

  const outputs: PortSpec[] = recommendations.outputs
    .filter(r => r.priority !== 'low')
    .map(r => ({
      id: r.capability.id.replace('.', '-'),
      name: r.capability.name,
      type: r.capability.payload[0]?.type || 'any',
      description: r.capability.description
    }));

  return { inputs, outputs };
}

// ============================================================================
// SKELETON GENERATION
// ============================================================================

/**
 * Generate a widget skeleton from description
 * This is Phase 1 of the skeleton-first workflow
 */
export async function generateSkeleton(
  request: EnhancedGenerationRequest
): Promise<WidgetSkeleton> {
  const { description, category, imageReferences, styleReferences } = request;

  // Analyze capabilities needed
  const capabilityNeeds = analyzeCapabilityNeeds(description);

  // Detect layout from description and images
  const layout = detectLayout(description, imageReferences);

  // Generate skeleton elements
  const elements = generateSkeletonElements(description, layout);

  // Generate interactions
  const interactions = generateInteractions(description, elements);

  // Generate state suggestions
  const suggestedState = generateStateSuggestions(description, interactions);

  // Generate clarifying questions
  const questions = generateClarifyingQuestions(description, elements, interactions);

  // Calculate confidence
  const confidence = calculateSkeletonConfidence(description, elements, questions);

  return {
    id: generateId(description),
    displayName: generateDisplayName(description),
    description: description.slice(0, 200),
    category: category || inferCategory(description),
    structure: {
      layout,
      mainElements: elements,
      interactions
    },
    suggestedState,
    suggestedCapabilities: {
      inputs: capabilityNeeds.inputs.map(r => r.capability.id as CapabilityId),
      outputs: capabilityNeeds.outputs.map(r => r.capability.id as CapabilityId)
    },
    reasoning: generateReasoning(description, elements, interactions),
    clarifyingQuestions: questions.length > 0 ? questions : undefined,
    confidence
  };
}

function detectLayout(
  description: string,
  images?: ImageReference[]
): WidgetSkeleton['structure']['layout'] {
  const lower = description.toLowerCase();

  if (/sidebar|menu|nav/i.test(lower)) return 'sidebar';
  if (/grid|gallery|tile/i.test(lower)) return 'grid';
  if (/split|two.?column|side.?by.?side/i.test(lower)) return 'split';
  if (/stack|vertical|list/i.test(lower)) return 'stacked';

  // Check images for layout hints
  if (images?.some(img => img.analyzedFeatures?.layout)) {
    const layouts = images.map(img => img.analyzedFeatures?.layout).filter(Boolean);
    if (layouts.includes('grid')) return 'grid';
    if (layouts.includes('dashboard')) return 'split';
  }

  return 'single';
}

function generateSkeletonElements(
  description: string,
  layout: WidgetSkeleton['structure']['layout']
): SkeletonElement[] {
  const elements: SkeletonElement[] = [];
  const lower = description.toLowerCase();

  // Always add main content area
  elements.push({
    type: 'content',
    name: 'Main Content',
    purpose: 'Primary widget content area',
    position: 'center'
  });

  // Detect specific elements from keywords
  if (/button|click|press|action/i.test(lower)) {
    elements.push({
      type: 'button',
      name: 'Action Button',
      purpose: 'Primary interaction trigger',
      position: 'bottom'
    });
  }

  if (/input|text|type|enter|field/i.test(lower)) {
    elements.push({
      type: 'input',
      name: 'Text Input',
      purpose: 'User text entry',
      position: 'center'
    });
  }

  if (/display|show|value|number|count/i.test(lower)) {
    elements.push({
      type: 'display',
      name: 'Value Display',
      purpose: 'Show current value/state',
      position: 'center'
    });
  }

  if (/image|photo|picture|media|video/i.test(lower)) {
    elements.push({
      type: 'media',
      name: 'Media Element',
      purpose: 'Visual content display',
      position: 'center'
    });
  }

  if (/title|header|heading/i.test(lower)) {
    elements.push({
      type: 'header',
      name: 'Header',
      purpose: 'Widget title and info',
      position: 'top'
    });
  }

  return elements;
}

function generateInteractions(
  description: string,
  elements: SkeletonElement[]
): SkeletonInteraction[] {
  const interactions: SkeletonInteraction[] = [];
  const lower = description.toLowerCase();

  // Detect interaction patterns
  if (/increment|increase|add|plus/i.test(lower)) {
    interactions.push({
      trigger: 'click increment button',
      action: 'increase value',
      stateChange: 'value += 1'
    });
  }

  if (/decrement|decrease|subtract|minus/i.test(lower)) {
    interactions.push({
      trigger: 'click decrement button',
      action: 'decrease value',
      stateChange: 'value -= 1'
    });
  }

  if (/toggle|switch|on.?off/i.test(lower)) {
    interactions.push({
      trigger: 'click toggle',
      action: 'toggle state',
      stateChange: 'isOn = !isOn'
    });
  }

  if (/submit|send|save/i.test(lower)) {
    interactions.push({
      trigger: 'click submit',
      action: 'submit form data',
      stateChange: 'submitted = true'
    });
  }

  if (/hover|mouse.?over/i.test(lower)) {
    interactions.push({
      trigger: 'hover element',
      action: 'show tooltip/highlight',
      stateChange: 'isHovered = true'
    });
  }

  // Add default mount interaction
  interactions.push({
    trigger: 'widget mounts',
    action: 'initialize state',
    stateChange: 'initialize defaults'
  });

  return interactions;
}

function generateStateSuggestions(
  description: string,
  interactions: SkeletonInteraction[]
): WidgetSkeleton['suggestedState'] {
  const suggestions: WidgetSkeleton['suggestedState'] = [];
  const lower = description.toLowerCase();

  // Detect state needs from description
  if (/count|number|value|score/i.test(lower)) {
    suggestions.push({
      name: 'value',
      type: 'number',
      purpose: 'Store the current numeric value'
    });
  }

  if (/toggle|switch|on|off|active|enabled/i.test(lower)) {
    suggestions.push({
      name: 'isActive',
      type: 'boolean',
      purpose: 'Track on/off state'
    });
  }

  if (/text|message|content|input/i.test(lower)) {
    suggestions.push({
      name: 'text',
      type: 'string',
      purpose: 'Store text content'
    });
  }

  if (/list|items|array|collection/i.test(lower)) {
    suggestions.push({
      name: 'items',
      type: 'array',
      purpose: 'Store list of items'
    });
  }

  if (/timer|time|duration/i.test(lower)) {
    suggestions.push({
      name: 'timeRemaining',
      type: 'number',
      purpose: 'Track remaining time'
    });
    suggestions.push({
      name: 'isRunning',
      type: 'boolean',
      purpose: 'Track if timer is running'
    });
  }

  // Derive from interactions
  for (const interaction of interactions) {
    if (interaction.stateChange?.includes('isHovered')) {
      if (!suggestions.find(s => s.name === 'isHovered')) {
        suggestions.push({
          name: 'isHovered',
          type: 'boolean',
          purpose: 'Track hover state'
        });
      }
    }
  }

  return suggestions;
}

function generateClarifyingQuestions(
  description: string,
  elements: SkeletonElement[],
  interactions: SkeletonInteraction[]
): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];
  const lower = description.toLowerCase();

  // Ask about unclear elements
  if (elements.some(e => e.type === 'button') && !/what|when|how/.test(lower)) {
    questions.push({
      id: 'button-action',
      question: 'What should happen when the button is clicked?',
      type: 'text',
      context: 'I detected a button but the action is unclear',
      impact: 'Determines the primary interaction behavior',
      priority: 'required'
    });
  }

  // Ask about visual style
  if (!lower.includes('style') && !lower.includes('design')) {
    questions.push({
      id: 'visual-style',
      question: 'What visual style would you prefer?',
      type: 'choice',
      options: ['Minimal/Clean', 'Modern/Sleek', 'Playful/Colorful', 'Professional/Corporate', 'Glassmorphic'],
      context: 'No style preference was specified',
      impact: 'Affects colors, spacing, and overall aesthetic',
      priority: 'recommended'
    });
  }

  // Ask about sizing
  if (!lower.includes('size') && !lower.includes('width') && !lower.includes('height')) {
    questions.push({
      id: 'widget-size',
      question: 'What size should the widget be?',
      type: 'choice',
      options: ['Small (100x100)', 'Medium (200x200)', 'Large (300x300)', 'Wide (400x200)', 'Tall (200x400)'],
      context: 'No size was specified',
      impact: 'Determines widget dimensions',
      priority: 'recommended'
    });
  }

  // Ask about pipeline connectivity
  if (interactions.length > 0) {
    questions.push({
      id: 'pipeline-needs',
      question: 'Should this widget connect to other widgets in a pipeline?',
      type: 'boolean',
      context: 'Widget has interactive elements',
      impact: 'Adds input/output ports for widget connectivity',
      priority: 'recommended'
    });
  }

  return questions;
}

function calculateSkeletonConfidence(
  description: string,
  elements: SkeletonElement[],
  questions: ClarifyingQuestion[]
): number {
  let confidence = 0.5;

  // More descriptive = higher confidence
  if (description.length > 50) confidence += 0.1;
  if (description.length > 100) confidence += 0.1;

  // More elements detected = higher confidence
  if (elements.length >= 2) confidence += 0.1;
  if (elements.length >= 4) confidence += 0.1;

  // Fewer required questions = higher confidence
  const requiredQs = questions.filter(q => q.priority === 'required');
  if (requiredQs.length === 0) confidence += 0.2;
  else if (requiredQs.length === 1) confidence += 0.1;

  return Math.min(0.95, confidence);
}

function generateReasoning(
  description: string,
  elements: SkeletonElement[],
  interactions: SkeletonInteraction[]
): string {
  const parts: string[] = [];

  parts.push(`Based on "${description.slice(0, 50)}..."`);

  if (elements.length > 0) {
    const elementTypes = elements.map(e => e.type).join(', ');
    parts.push(`I identified these UI elements: ${elementTypes}.`);
  }

  if (interactions.length > 0) {
    parts.push(`The widget will have ${interactions.length} main interactions.`);
  }

  return parts.join(' ');
}

// ============================================================================
// FULL SPEC GENERATION FROM SKELETON
// ============================================================================

/**
 * Generate full SpecJSON from a reviewed skeleton
 */
export function skeletonToSpec(
  skeleton: WidgetSkeleton,
  answers: Record<string, string | string[] | boolean>,
  styleReferences?: StyleSnippet[]
): SpecJSON {
  // Get capability recommendations
  const capabilities = {
    inputs: skeleton.suggestedCapabilities.inputs,
    outputs: skeleton.suggestedCapabilities.outputs
  };

  // Convert to ports
  const ports = capabilitiesToPorts(
    analyzeCapabilityNeeds(skeleton.description)
  );

  // Build state from suggestions
  const state: SpecJSON['state'] = {};
  for (const suggestion of skeleton.suggestedState) {
    state[suggestion.name] = {
      type: suggestion.type as any,
      default: getDefaultForType(suggestion.type),
      description: suggestion.purpose
    };
  }

  // Build actions from interactions
  const actions: SpecJSON['actions'] = {};
  const events: SpecJSON['events'] = {
    triggers: {} as Record<string, string[]>,
    broadcasts: [],
    subscriptions: []
  };

  for (const interaction of skeleton.structure.interactions) {
    const actionId = camelCase(interaction.action);
    actions[actionId] = {
      type: 'custom',
      description: interaction.action,
      params: {}
    };

    // Map trigger to event
    if (interaction.trigger.includes('click')) {
      if (!events.triggers.onClick) events.triggers.onClick = [];
      events.triggers.onClick.push(actionId);
    }
    if (interaction.trigger.includes('hover')) {
      if (!events.triggers.onHover) events.triggers.onHover = [];
      events.triggers.onHover.push(actionId);
    }
    if (interaction.trigger.includes('mount')) {
      if (!events.triggers.onMount) events.triggers.onMount = [];
      events.triggers.onMount.push(actionId);
    }
  }

  // Determine size from answers
  let size = { width: 200, height: 200 };
  if (answers['widget-size']) {
    const sizeStr = answers['widget-size'] as string;
    if (sizeStr.includes('Small')) size = { width: 100, height: 100 };
    else if (sizeStr.includes('Large')) size = { width: 300, height: 300 };
    else if (sizeStr.includes('Wide')) size = { width: 400, height: 200 };
    else if (sizeStr.includes('Tall')) size = { width: 200, height: 400 };
  }

  // Extract CSS variables from style references
  const cssVariables = extractCSSVariables(styleReferences);

  const spec: SpecJSON = {
    id: skeleton.id,
    version: '1.0.0',
    displayName: skeleton.displayName,
    category: skeleton.category,
    description: skeleton.description,
    visual: {
      type: 'html',
      skins: [],
      cssVariables
    },
    state,
    events,
    actions,
    api: {
      exposes: Object.keys(actions).map(id => ({
        id,
        name: capitalizeWords(id),
        description: actions[id].description
      })),
      accepts: [],
      inputs: ports.inputs,
      outputs: ports.outputs
    },
    dependencies: {},
    permissions: {
      allowPipelineUse: answers['pipeline-needs'] === true,
      allowForking: true,
      allowMarketplace: false
    },
    size,
    tags: generateTags(skeleton.description)
  };

  return spec;
}

function extractCSSVariables(styles?: StyleSnippet[]): SpecJSON['visual']['cssVariables'] {
  if (!styles || styles.length === 0) return [];

  const variables: SpecJSON['visual']['cssVariables'] = [];

  for (const style of styles) {
    // Extract CSS custom properties
    const matches = style.code.matchAll(/--([a-zA-Z-]+):\s*([^;]+);/g);
    for (const match of matches) {
      variables.push({
        name: `--${match[1]}`,
        defaultValue: match[2].trim(),
        type: match[2].includes('#') || match[2].includes('rgb') ? 'color' : 'string'
      });
    }

    // Extract colors
    if (style.colors) {
      style.colors.forEach((color, i) => {
        variables.push({
          name: `--color-${i + 1}`,
          defaultValue: color,
          type: 'color'
        });
      });
    }
  }

  return variables.slice(0, 10); // Limit to 10 variables
}

// ============================================================================
// STYLE GALLERY MANAGEMENT
// ============================================================================

/**
 * Create a new style gallery
 */
export function createStyleGallery(name: string): StyleGallery {
  return {
    id: `gallery-${Date.now()}`,
    name,
    snippets: [],
    categories: [
      { id: 'buttons', name: 'Buttons', description: 'Button styles', snippetIds: [] },
      { id: 'cards', name: 'Cards', description: 'Card layouts', snippetIds: [] },
      { id: 'forms', name: 'Forms', description: 'Form elements', snippetIds: [] },
      { id: 'animations', name: 'Animations', description: 'CSS animations & transitions', snippetIds: [] },
      { id: 'layouts', name: 'Layouts', description: 'Layout patterns', snippetIds: [] },
      { id: 'effects', name: 'Effects', description: 'Visual effects (shadows, blur, etc.)', snippetIds: [] },
      { id: 'colors', name: 'Color Palettes', description: 'Saved color schemes', snippetIds: [] },
      { id: 'gradients', name: 'Gradients', description: 'Gradient backgrounds', snippetIds: [] },
      { id: 'code', name: 'Code Snippets', description: 'Reusable HTML/JS/TS snippets', snippetIds: [] },
      { id: 'hover', name: 'Hover Effects', description: 'Interactive hover states', snippetIds: [] }
    ],
    palettes: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Add a style snippet to the gallery
 */
export function addStyleSnippet(
  gallery: StyleGallery,
  snippet: Omit<StyleSnippet, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
): StyleSnippet {
  const newSnippet: StyleSnippet = {
    ...snippet,
    id: `snippet-${Date.now()}`,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  gallery.snippets.push(newSnippet);
  gallery.updatedAt = Date.now();

  // Auto-categorize based on tags
  for (const category of gallery.categories) {
    if (snippet.tags.some(tag => category.id.includes(tag) || tag.includes(category.id))) {
      category.snippetIds.push(newSnippet.id);
    }
  }

  return newSnippet;
}

/**
 * Search style gallery
 */
export function searchStyleGallery(
  gallery: StyleGallery,
  query: string,
  filters?: { type?: StyleSnippet['type']; category?: string }
): StyleSnippet[] {
  const lower = query.toLowerCase();

  return gallery.snippets.filter(snippet => {
    // Text search
    const matchesQuery = !query ||
      snippet.name.toLowerCase().includes(lower) ||
      snippet.description?.toLowerCase().includes(lower) ||
      snippet.tags.some(t => t.toLowerCase().includes(lower));

    // Type filter
    const matchesType = !filters?.type || snippet.type === filters.type;

    // Category filter
    const matchesCategory = !filters?.category ||
      gallery.categories.find(c => c.id === filters.category)?.snippetIds.includes(snippet.id);

    return matchesQuery && matchesType && matchesCategory;
  });
}

// ============================================================================
// IMAGE REFERENCE HANDLING
// ============================================================================

/**
 * Create an image reference from file upload
 */
export function createImageReferenceFromFile(
  file: File,
  dataUrl: string
): ImageReference {
  return {
    id: `img-${Date.now()}`,
    type: 'upload',
    data: dataUrl,
    name: file.name,
    createdAt: Date.now()
  };
}

/**
 * Create an image reference from URL
 */
export function createImageReferenceFromUrl(url: string): ImageReference {
  return {
    id: `img-${Date.now()}`,
    type: 'url',
    data: url,
    createdAt: Date.now()
  };
}

/**
 * Create an image reference from paste
 */
export function createImageReferenceFromPaste(dataUrl: string): ImageReference {
  return {
    id: `img-${Date.now()}`,
    type: 'paste',
    data: dataUrl,
    createdAt: Date.now()
  };
}

/**
 * Analyze an image for features (mock implementation)
 * In production, this would call a vision AI model
 */
export async function analyzeImage(image: ImageReference): Promise<ImageAnalysis> {
  // Mock analysis - in production this would use Claude Vision or similar
  return {
    colors: ['#667eea', '#764ba2', '#ffffff', '#1a1a1a'],
    layout: 'card',
    elements: [
      { type: 'button', position: { x: 50, y: 80, width: 100, height: 40 } },
      { type: 'text', position: { x: 20, y: 20, width: 160, height: 30 } }
    ],
    style: 'modern',
    suggestedTypes: ['button', 'card', 'interactive']
  };
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

const activeSessions = new Map<string, RefinementSession>();

/**
 * Create a new refinement session
 */
export function createSession(request: EnhancedGenerationRequest): RefinementSession {
  const session: RefinementSession = {
    id: `session-${Date.now()}`,
    initialDescription: request.description,
    imageReferences: request.imageReferences || [],
    styleReferences: request.styleReferences || [],
    phase: 'skeleton',
    clarifications: [],
    iterations: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  activeSessions.set(session.id, session);
  return session;
}

/**
 * Get an existing session
 */
export function getSession(sessionId: string): RefinementSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Update session with clarification answer
 */
export function addClarification(
  session: RefinementSession,
  questionId: string,
  answer: string | string[] | boolean
): void {
  const question = session.skeleton?.clarifyingQuestions?.find(q => q.id === questionId);
  if (question) {
    session.clarifications.push({ question, answer });
    session.updatedAt = Date.now();
  }
}

// ============================================================================
// MAIN GENERATION WORKFLOW
// ============================================================================

/**
 * Main entry point for enhanced generation
 */
export async function generateEnhanced(
  request: EnhancedGenerationRequest
): Promise<EnhancedGenerationResult> {
  // Get or create session
  let session: RefinementSession;

  if (request.sessionId) {
    const existing = getSession(request.sessionId);
    if (!existing) {
      return {
        success: false,
        phase: 'skeleton',
        session: createSession(request),
        error: 'Session not found'
      };
    }
    session = existing;

    // Process clarification answer if provided
    if (request.clarificationAnswer) {
      addClarification(session, request.clarificationAnswer.questionId, request.clarificationAnswer.answer);
    }
  } else {
    session = createSession(request);
  }

  // Handle skeleton workflow
  if (request.useSkeletonWorkflow !== false) {
    // Phase 1: Generate skeleton
    if (session.phase === 'skeleton' && !session.skeleton) {
      const skeleton = await generateSkeleton(request);
      session.skeleton = skeleton;
      session.phase = skeleton.clarifyingQuestions?.length ? 'review' : 'refinement';

      return {
        success: true,
        phase: session.phase,
        session,
        skeleton,
        pendingQuestions: skeleton.clarifyingQuestions
      };
    }

    // Phase 2: Wait for clarifications
    if (session.phase === 'review') {
      const requiredQs = session.skeleton?.clarifyingQuestions?.filter(q => q.priority === 'required') || [];
      const answeredIds = session.clarifications.map(c => c.question.id);
      const pendingRequired = requiredQs.filter(q => !answeredIds.includes(q.id));

      if (pendingRequired.length > 0) {
        return {
          success: true,
          phase: 'review',
          session,
          skeleton: session.skeleton,
          pendingQuestions: pendingRequired
        };
      }

      // All required questions answered, move to refinement
      session.phase = 'refinement';
    }

    // Phase 3: Generate full spec from skeleton
    if (session.phase === 'refinement' && session.skeleton) {
      const answers = Object.fromEntries(
        session.clarifications.map(c => [c.question.id, c.answer])
      );

      const spec = skeletonToSpec(session.skeleton, answers, session.styleReferences);
      session.iterations.push({ spec });

      // Handle feedback if provided
      if (request.feedback) {
        session.iterations[session.iterations.length - 1].feedback = request.feedback;
        // Could refine spec based on feedback here
      }

      // Validate
      const validation = validateSpecJSON(spec);
      if (validation.valid) {
        session.finalSpec = spec;
        session.phase = 'full';
      }

      // Generate recommendations
      const capRecs = analyzeCapabilityNeeds(session.initialDescription);

      return {
        success: true,
        phase: session.phase,
        session,
        currentSpec: spec,
        finalSpec: validation.valid ? spec : undefined,
        suggestions: validation.warnings.map(w => w.message),
        capabilityRecommendations: [...capRecs.inputs, ...capRecs.outputs]
      };
    }
  }

  // Direct generation (no skeleton workflow)
  const capRecs = analyzeCapabilityNeeds(request.description);
  const ports = capabilitiesToPorts(capRecs);

  const spec = createDefaultSpecJSON({
    id: generateId(request.description),
    displayName: generateDisplayName(request.description),
    description: request.description,
    category: request.category || inferCategory(request.description)
  });

  spec.api.inputs = ports.inputs;
  spec.api.outputs = ports.outputs;

  session.iterations.push({ spec });
  session.finalSpec = spec;
  session.phase = 'full';

  return {
    success: true,
    phase: 'full',
    session,
    finalSpec: spec,
    capabilityRecommendations: [...capRecs.inputs, ...capRecs.outputs]
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .join('-')
    .substring(0, 30) || 'widget';
}

function generateDisplayName(description: string): string {
  const words = description.split(/\s+/).slice(0, 4);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function inferCategory(description: string): WidgetCategory {
  const lower = description.toLowerCase();
  const categoryKeywords: Record<WidgetCategory, string[]> = {
    productivity: ['task', 'todo', 'timer', 'pomodoro', 'schedule', 'calendar', 'note'],
    creativity: ['draw', 'paint', 'design', 'color', 'art', 'creative'],
    social: ['chat', 'message', 'social', 'share'],
    games: ['game', 'play', 'score', 'level', 'puzzle'],
    media: ['video', 'audio', 'music', 'player', 'image'],
    data: ['chart', 'graph', 'data', 'analytics'],
    utility: ['counter', 'toggle', 'switch', 'clock', 'calculator'],
    education: ['learn', 'study', 'quiz', 'flashcard'],
    business: ['invoice', 'report', 'sales'],
    lifestyle: ['weather', 'fitness', 'health'],
    developer: ['code', 'debug', 'api', 'json'],
    ai: ['ai', 'ml', 'assistant'],
    integration: ['webhook', 'api', 'connect'],
    custom: []
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category as WidgetCategory;
    }
  }
  return 'utility';
}

function generateTags(description: string): string[] {
  const words = description.toLowerCase().split(/\s+/);
  const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'with', 'for', 'and', 'or', 'but', 'that', 'this']);
  return words
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 5)
    .map(w => w.replace(/[^a-z0-9-]/g, ''));
}

function camelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

function getDefaultForType(type: string): unknown {
  switch (type) {
    case 'number': return 0;
    case 'boolean': return false;
    case 'string': return '';
    case 'array': return [];
    case 'object': return {};
    default: return null;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  analyzeCapabilityNeeds,
  capabilitiesToPorts,
  generateSkeleton,
  skeletonToSpec,
  createStyleGallery,
  addStyleSnippet,
  searchStyleGallery,
  createImageReferenceFromFile,
  createImageReferenceFromUrl,
  createImageReferenceFromPaste,
  analyzeImage,
  createSession,
  getSession,
  generateEnhanced
};
