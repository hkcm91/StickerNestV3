/**
 * StickerNest v2 - AI Widget Generator V2.0
 * Main entry point for the widget generation service
 *
 * @module widget-generator-v2
 * @version 2.0.0
 */

// ============================================
// Core Service
// ============================================

export {
  AIWidgetGeneratorV2,
  getWidgetGeneratorV2,
  createWidgetGeneratorV2,
} from './AIWidgetGeneratorV2';

// ============================================
// Types
// ============================================

export type {
  // Request/Response
  GenerationRequest,
  GenerationResult,
  GenerationMetadata,
  // Quality
  QualityScore,
  // Session/Progress
  GenerationSession,
  GenerationStep,
  ProgressUpdate,
  ConversationMessage,
  // Parsing
  ParsedWidget,
  ParseResult,
  // Configuration
  GeneratorConfig,
  ComplexityLevel,
  StylePreset,
  GenerationMode,
  AIProviderType,
  FeatureRequirements,
} from './types';

export { DEFAULT_CONFIG } from './types';

// ============================================
// Supporting Modules
// ============================================

export {
  PromptBuilder,
  getPromptBuilder,
} from './PromptBuilder';

export {
  ResponseParser,
  getResponseParser,
} from './ResponseParser';

export {
  QualityAnalyzer,
  getQualityAnalyzer,
} from './QualityAnalyzer';

export {
  SessionManager,
  getSessionManager,
  createSessionManager,
  STEP_CONFIG,
  getStepLabel,
  getStepProgress,
} from './GenerationSession';

export {
  PipelineIntegration,
  analyzeWidgetConnections,
  groupSuggestionsByWidget,
  getCompatibilityLabel,
  suggestCommonConnections,
  type ConnectionSuggestion,
  type AutoWireResult,
  type CanvasWidget,
} from './PipelineIntegration';
