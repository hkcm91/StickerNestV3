/**
 * StickerNest v2 - AI Widget Generator V2.0 Types
 * Type definitions for the widget generation system
 */

import type { WidgetManifest } from '../../types/manifest';
import type { ValidationResult } from '../../ai/ProtocolEnforcer';
import type { DraftWidget } from '../../ai/DraftManager';

// ============================================
// Generation Request Types
// ============================================

/** Complexity levels for widget generation */
export type ComplexityLevel = 'basic' | 'standard' | 'advanced' | 'professional';

/** Visual style presets */
export type StylePreset = 'minimal' | 'polished' | 'elaborate' | 'glassmorphism' | 'neon' | 'retro';

/** Generation mode */
export type GenerationMode = 'new' | 'variation' | 'iterate' | 'template';

/** AI provider selection */
export type AIProviderType = 'anthropic' | 'openai' | 'replicate' | 'auto';

/** Feature requirements for generation */
export interface FeatureRequirements {
  animations?: boolean;
  microInteractions?: boolean;
  loadingStates?: boolean;
  errorHandling?: boolean;
  keyboardShortcuts?: boolean;
  responsive?: boolean;
  accessibility?: boolean;
  persistence?: boolean;
  soundEffects?: boolean;
}

/** Generation request configuration */
export interface GenerationRequest {
  /** Description of the widget to generate */
  description: string;
  /** Generation mode */
  mode: GenerationMode;
  /** Complexity level */
  complexity?: ComplexityLevel;
  /** Visual style preset */
  stylePreset?: StylePreset;
  /** Feature requirements */
  features?: FeatureRequirements;
  /** AI provider to use */
  provider?: AIProviderType;
  /** Specific model to use */
  model?: string;
  /** Template ID for template mode */
  templateId?: string;
  /** Source widget ID for variation/iterate modes */
  sourceWidgetId?: string;
  /** Session ID for iterative refinement */
  sessionId?: string;
  /** Widget family/namespace */
  widgetFamily?: string;
  /** Expected input events */
  inputEvents?: string[];
  /** Expected output events */
  outputEvents?: string[];
  /** Additional instructions */
  additionalInstructions?: string;
  /** Image reference for design inspiration */
  imageReference?: {
    url: string;
    extractColors?: boolean;
    extractLayout?: boolean;
  };
}

// ============================================
// Generation Result Types
// ============================================

/** Quality score breakdown */
export interface QualityScore {
  /** Overall score 0-100 */
  overall: number;
  /** Protocol compliance score */
  protocolCompliance: number;
  /** Code quality score */
  codeQuality: number;
  /** Visual quality score */
  visualQuality: number;
  /** Functionality score */
  functionality: number;
}

/** Generation result */
export interface GenerationResult {
  /** Whether generation succeeded */
  success: boolean;
  /** Generated widget draft */
  widget?: DraftWidget;
  /** Quality analysis */
  quality?: QualityScore;
  /** Validation result */
  validation?: ValidationResult;
  /** AI explanation of what was generated */
  explanation?: string;
  /** Error messages if failed */
  errors?: string[];
  /** Improvement suggestions */
  suggestions?: string[];
  /** Session ID for iterative refinement */
  sessionId?: string;
  /** Metrics record ID for feedback linking (self-improving AI) */
  metricsId?: string;
  /** Generation metadata */
  metadata?: GenerationMetadata;
}

/** Metadata about the generation */
export interface GenerationMetadata {
  /** AI model used */
  model: string;
  /** AI provider used */
  provider: string;
  /** Prompt tokens used */
  promptTokens?: number;
  /** Completion tokens used */
  completionTokens?: number;
  /** Generation duration in ms */
  duration: number;
  /** Timestamp */
  timestamp: number;
}

// ============================================
// Session & Progress Types
// ============================================

/** Generation step */
export type GenerationStep =
  | 'preparing'
  | 'building-prompt'
  | 'calling-ai'
  | 'parsing-response'
  | 'validating'
  | 'scoring-quality'
  | 'creating-draft'
  | 'complete'
  | 'failed';

/** Progress update */
export interface ProgressUpdate {
  /** Current step */
  step: GenerationStep;
  /** Step description */
  message: string;
  /** Progress percentage 0-100 */
  progress: number;
  /** Timestamp */
  timestamp: number;
}

/** Generation session for tracking progress */
export interface GenerationSession {
  /** Session ID */
  id: string;
  /** Original request */
  request: GenerationRequest;
  /** Current status */
  status: 'active' | 'complete' | 'failed' | 'cancelled';
  /** Progress updates */
  progress: ProgressUpdate[];
  /** Generated widgets in this session */
  widgets: DraftWidget[];
  /** Conversation history for iterate mode */
  conversation?: ConversationMessage[];
  /** Created timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivity: number;
}

/** Conversation message for iterate mode */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /** Widget generated in this message */
  widgetId?: string;
}

// ============================================
// Parsed Response Types
// ============================================

/** Parsed widget from AI response */
export interface ParsedWidget {
  manifest: WidgetManifest;
  html: string;
  explanation?: string;
}

/** Parse result */
export interface ParseResult {
  success: boolean;
  widget?: ParsedWidget;
  error?: string;
  rawResponse?: string;
}

// ============================================
// Configuration Types
// ============================================

/** Generator configuration */
export interface GeneratorConfig {
  /** Default complexity level */
  defaultComplexity: ComplexityLevel;
  /** Default style preset */
  defaultStyle: StylePreset;
  /** Default provider */
  defaultProvider: AIProviderType;
  /** Maximum tokens for generation */
  maxTokens: number;
  /** Temperature for generation (0-1) */
  temperature: number;
  /** Auto-validate generated widgets */
  autoValidate: boolean;
  /** Auto-save drafts */
  autoSaveDrafts: boolean;
  /** Enable quality scoring */
  enableQualityScoring: boolean;
}

/** Default configuration */
export const DEFAULT_CONFIG: GeneratorConfig = {
  defaultComplexity: 'standard',
  defaultStyle: 'polished',
  defaultProvider: 'auto',
  maxTokens: 8000,
  temperature: 0.6,
  autoValidate: true,
  autoSaveDrafts: true,
  enableQualityScoring: true,
};
