/**
 * StickerNest v2 - AI Widget Generator V2.0
 * Main service class for AI-powered widget generation
 *
 * Features:
 * - Multi-model support (Anthropic, OpenAI, Replicate)
 * - Real-time progress tracking
 * - Quality scoring and feedback
 * - Iterative refinement
 * - Draft management integration
 * - Self-improving AI integration (metrics tracking)
 */

import type {
  GenerationRequest,
  GenerationResult,
  GeneratorConfig,
  GenerationSession,
  QualityScore,
  ParsedWidget,
  AIProviderType,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { getPromptBuilder } from './PromptBuilder';
import { getResponseParser } from './ResponseParser';
import { getQualityAnalyzer } from './QualityAnalyzer';
import { getSessionManager, getStepProgress } from './GenerationSession';
import { getDraftManager, type DraftWidget } from '../../ai/DraftManager';
import { getProtocolEnforcer, type ValidationResult } from '../../ai/ProtocolEnforcer';
import {
  getProviderForTask,
  createProvider,
  type AIProvider,
  type ProviderConfig,
} from '../../ai/providers';
// Self-improving AI integration
import { useGenerationMetricsStore } from '../../state/useGenerationMetricsStore';
import { usePromptVersionStore } from '../../state/usePromptVersionStore';

// ============================================
// AI Widget Generator V2 Class
// ============================================

export class AIWidgetGeneratorV2 {
  private config: GeneratorConfig;

  constructor(config: Partial<GeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a new widget
   */
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const sessionManager = getSessionManager();
    const session = sessionManager.createSession(request);

    try {
      // Step 1: Build prompt
      sessionManager.updateProgress(
        session.id,
        'building-prompt',
        'Building generation prompt...',
        getStepProgress('building-prompt')
      );

      const promptBuilder = getPromptBuilder();
      const systemPrompt = promptBuilder.buildSystemPrompt();
      const userPrompt = promptBuilder.buildGenerationPrompt(request);

      // Step 2: Select AI provider
      const provider = this.selectProvider(request);

      // Step 3: Call AI
      sessionManager.updateProgress(
        session.id,
        'calling-ai',
        `Generating with ${provider.name}...`,
        getStepProgress('calling-ai')
      );

      const startTime = Date.now();
      const aiResponse = await provider.generate(userPrompt, {
        systemPrompt,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      // Step 4: Parse response
      sessionManager.updateProgress(
        session.id,
        'parsing-response',
        'Parsing AI response...',
        getStepProgress('parsing-response')
      );

      const responseParser = getResponseParser();
      // Use parseAndEnsureReady to auto-inject READY signal if missing
      const parseResult = responseParser.parseAndEnsureReady(aiResponse.content);

      if (!parseResult.success || !parseResult.widget) {
        sessionManager.failSession(session.id, parseResult.error || 'Failed to parse response');
        return {
          success: false,
          errors: [parseResult.error || 'Failed to parse AI response'],
          sessionId: session.id,
          metadata: {
            model: provider.model,
            provider: provider.name,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          },
        };
      }

      // Step 5: Validate
      sessionManager.updateProgress(
        session.id,
        'validating',
        'Validating widget protocol...',
        getStepProgress('validating')
      );

      const enforcer = getProtocolEnforcer();
      const validation = enforcer.validateWidget({
        manifest: parseResult.widget.manifest,
        html: parseResult.widget.html,
      });

      // Step 6: Quality scoring
      let quality: QualityScore | undefined;
      if (this.config.enableQualityScoring) {
        sessionManager.updateProgress(
          session.id,
          'scoring-quality',
          'Analyzing quality...',
          getStepProgress('scoring-quality')
        );

        const qualityAnalyzer = getQualityAnalyzer();
        const analysis = qualityAnalyzer.analyze(parseResult.widget);
        quality = analysis.score;
      }

      // Step 7: Create draft
      sessionManager.updateProgress(
        session.id,
        'creating-draft',
        'Creating draft...',
        getStepProgress('creating-draft')
      );

      const draft = this.createDraft(parseResult.widget, request, session.id, provider);
      sessionManager.addWidget(session.id, draft);

      // Set validation result on draft
      const draftManager = getDraftManager();
      draftManager.setValidationResult(draft.id, validation);

      // Complete session
      sessionManager.completeSession(session.id);

      // Record for self-improvement tracking
      const metricsId = this.recordGeneration(
        request.description,
        validation.valid ? 'success' : 'partial',
        provider,
        validation,
        {
          widgetId: draft.id,
          durationMs: Date.now() - startTime,
          qualityScore: quality?.overall,
        }
      );

      return {
        success: validation.valid,
        widget: draft,
        quality,
        validation,
        explanation: parseResult.widget.explanation,
        errors: validation.errors.map(e => e.message),
        suggestions: validation.suggestions,
        sessionId: session.id,
        metricsId, // For feedback linking
        metadata: {
          model: provider.model,
          provider: provider.name,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      sessionManager.failSession(
        session.id,
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Record failed generation
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      const metricsId = this.recordGeneration(
        request.description,
        'failure',
        getProviderForTask('widget'),
        undefined,
        { errorMessage }
      );

      return {
        success: false,
        errors: [errorMessage],
        sessionId: session.id,
        metricsId,
      };
    }
  }

  /**
   * Iterate on an existing widget with feedback
   */
  async iterate(sessionId: string, feedback: string): Promise<GenerationResult> {
    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        errors: ['Session not found'],
      };
    }

    // Get the last widget from the session
    const lastWidget = session.widgets[session.widgets.length - 1];
    if (!lastWidget) {
      return {
        success: false,
        errors: ['No widget in session to iterate on'],
        sessionId,
      };
    }

    // Add user message to conversation
    sessionManager.addMessage(sessionId, {
      role: 'user',
      content: feedback,
    });

    try {
      // Build iteration prompt
      sessionManager.updateProgress(
        sessionId,
        'building-prompt',
        'Building refinement prompt...',
        getStepProgress('building-prompt')
      );

      const promptBuilder = getPromptBuilder();
      const userPrompt = promptBuilder.buildIterationPrompt(
        lastWidget.html,
        lastWidget.manifest,
        feedback
      );

      // Select provider
      const provider = this.selectProvider(session.request);

      // Call AI
      sessionManager.updateProgress(
        sessionId,
        'calling-ai',
        `Refining with ${provider.name}...`,
        getStepProgress('calling-ai')
      );

      const startTime = Date.now();
      const aiResponse = await provider.generate(userPrompt, {
        systemPrompt: promptBuilder.buildSystemPrompt(),
        maxTokens: this.config.maxTokens,
        temperature: 0.4, // Lower temperature for refinement
      });

      // Parse response
      sessionManager.updateProgress(
        sessionId,
        'parsing-response',
        'Parsing response...',
        getStepProgress('parsing-response')
      );

      const responseParser = getResponseParser();
      // Use parseAndEnsureReady to auto-inject READY signal if missing
      const parseResult = responseParser.parseAndEnsureReady(aiResponse.content);

      if (!parseResult.success || !parseResult.widget) {
        return {
          success: false,
          errors: [parseResult.error || 'Failed to parse response'],
          sessionId,
        };
      }

      // Validate
      const enforcer = getProtocolEnforcer();
      const validation = enforcer.validateWidget({
        manifest: parseResult.widget.manifest,
        html: parseResult.widget.html,
      });

      // Quality scoring
      let quality: QualityScore | undefined;
      if (this.config.enableQualityScoring) {
        const qualityAnalyzer = getQualityAnalyzer();
        const analysis = qualityAnalyzer.analyze(parseResult.widget);
        quality = analysis.score;
      }

      // Create new draft version
      const draft = this.createDraft(
        parseResult.widget,
        { ...session.request, mode: 'iterate' },
        sessionId,
        provider
      );
      sessionManager.addWidget(sessionId, draft);

      // Add assistant response to conversation
      sessionManager.addMessage(sessionId, {
        role: 'assistant',
        content: parseResult.widget.explanation || 'Widget refined successfully',
        widgetId: draft.id,
      });

      sessionManager.completeSession(sessionId);

      return {
        success: validation.valid,
        widget: draft,
        quality,
        validation,
        explanation: parseResult.widget.explanation,
        errors: validation.errors.map(e => e.message),
        suggestions: validation.suggestions,
        sessionId,
        metadata: {
          model: provider.model,
          provider: provider.name,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Iteration failed'],
        sessionId,
      };
    }
  }

  /**
   * Create a variation of an existing widget
   */
  async createVariation(
    sourceWidgetId: string,
    variationDescription: string
  ): Promise<GenerationResult> {
    // Get the source widget
    const draftManager = getDraftManager();
    const sourceDraft = draftManager.getDraft(sourceWidgetId);

    if (!sourceDraft) {
      return {
        success: false,
        errors: [`Source widget not found: ${sourceWidgetId}`],
      };
    }

    // Create variation request
    const request: GenerationRequest = {
      description: variationDescription,
      mode: 'variation',
      sourceWidgetId,
    };

    const sessionManager = getSessionManager();
    const session = sessionManager.createSession(request);

    try {
      // Build variation prompt
      sessionManager.updateProgress(
        session.id,
        'building-prompt',
        'Building variation prompt...',
        getStepProgress('building-prompt')
      );

      const promptBuilder = getPromptBuilder();
      const userPrompt = promptBuilder.buildVariationPrompt(
        sourceDraft.html,
        sourceDraft.manifest,
        variationDescription
      );

      // Select provider
      const provider = this.selectProvider(request);

      // Call AI
      sessionManager.updateProgress(
        session.id,
        'calling-ai',
        `Creating variation with ${provider.name}...`,
        getStepProgress('calling-ai')
      );

      const startTime = Date.now();
      const aiResponse = await provider.generate(userPrompt, {
        systemPrompt: promptBuilder.buildSystemPrompt(),
        maxTokens: this.config.maxTokens,
        temperature: 0.8, // Higher temperature for variation
      });

      // Parse and validate (similar to generate)
      const responseParser = getResponseParser();
      // Use parseAndEnsureReady to auto-inject READY signal if missing
      const parseResult = responseParser.parseAndEnsureReady(aiResponse.content);

      if (!parseResult.success || !parseResult.widget) {
        sessionManager.failSession(session.id, parseResult.error || 'Failed to parse');
        return {
          success: false,
          errors: [parseResult.error || 'Failed to parse response'],
          sessionId: session.id,
        };
      }

      const enforcer = getProtocolEnforcer();
      const validation = enforcer.validateWidget({
        manifest: parseResult.widget.manifest,
        html: parseResult.widget.html,
      });

      const draft = this.createDraft(parseResult.widget, request, session.id, provider);
      sessionManager.addWidget(session.id, draft);
      sessionManager.completeSession(session.id);

      return {
        success: validation.valid,
        widget: draft,
        validation,
        explanation: parseResult.widget.explanation,
        errors: validation.errors.map(e => e.message),
        suggestions: validation.suggestions,
        sessionId: session.id,
        metadata: {
          model: provider.model,
          provider: provider.name,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      sessionManager.failSession(session.id, error instanceof Error ? error.message : 'Unknown');
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Variation failed'],
        sessionId: session.id,
      };
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): GenerationSession | null {
    return getSessionManager().getSession(sessionId);
  }

  /**
   * Cancel a generation session
   */
  cancelSession(sessionId: string): void {
    getSessionManager().cancelSession(sessionId);
  }

  /**
   * Subscribe to session progress
   */
  onProgress(
    sessionId: string,
    callback: (update: import('./types').ProgressUpdate) => void
  ): () => void {
    return getSessionManager().onProgress(sessionId, callback);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ============================================
  // Self-Improving AI Integration
  // ============================================

  /**
   * Record a generation to the metrics store for self-improvement tracking
   * Returns the metrics record ID for feedback linking
   */
  private recordGeneration(
    userPrompt: string,
    result: 'success' | 'failure' | 'partial',
    provider: AIProvider,
    validation?: ValidationResult,
    options?: {
      errorMessage?: string;
      widgetId?: string;
      durationMs?: number;
      qualityScore?: number;
    }
  ): string {
    const metricsStore = useGenerationMetricsStore.getState();
    const promptStore = usePromptVersionStore.getState();

    // Get current prompt version for linking
    const activeVersion = promptStore.getActiveVersion('widget_generation');
    const promptVersionId = activeVersion?.id || 'unknown';

    // Track that we're using this prompt version
    if (activeVersion) {
      promptStore.incrementGenerationCount('widget_generation');
    }

    // Calculate quality score from validation if not provided
    let qualityScore = options?.qualityScore;
    if (qualityScore === undefined && validation) {
      qualityScore = 100;
      qualityScore -= validation.errors.length * 15;
      qualityScore -= validation.warnings.length * 5;
      if (validation.valid) qualityScore = Math.min(100, qualityScore + 10);
      qualityScore = Math.max(0, Math.min(100, qualityScore));
    }

    return metricsStore.addRecord({
      type: 'widget',
      promptVersionId,
      userPrompt,
      result,
      errorMessage: options?.errorMessage,
      qualityScore,
      metadata: {
        model: provider.model,
        provider: provider.name,
        widgetId: options?.widgetId,
        durationMs: options?.durationMs,
      },
    });
  }

  // ============================================
  // Private Methods
  // ============================================

  private selectProvider(request: GenerationRequest): AIProvider {
    const providerType = request.provider || this.config.defaultProvider;

    if (providerType === 'auto') {
      // Use the task-based selection
      return getProviderForTask('widget');
    }

    // Create specific provider
    const providerConfigs: Record<AIProviderType, ProviderConfig | null> = {
      anthropic: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      openai: { provider: 'openai', model: 'gpt-4o' },
      replicate: { provider: 'replicate', model: 'meta/meta-llama-3.1-70b-instruct' },
      auto: null,
    };

    const config = providerConfigs[providerType];
    if (!config) {
      return getProviderForTask('widget');
    }

    return createProvider(config);
  }

  private createDraft(
    widget: ParsedWidget,
    request: GenerationRequest,
    sessionId: string,
    provider: AIProvider
  ): DraftWidget {
    const draftManager = getDraftManager();

    return draftManager.createDraft(widget.manifest, widget.html, {
      conversationId: sessionId,
      metadata: {
        prompt: request.description,
        model: provider.model,
        mode: request.mode === 'iterate' ? 'modification' : request.mode === 'variation' ? 'variation' : 'new',
        sourceWidgetId: request.sourceWidgetId,
      },
    });
  }
}

// ============================================
// Singleton Export
// ============================================

let generatorInstance: AIWidgetGeneratorV2 | null = null;

export function getWidgetGeneratorV2(): AIWidgetGeneratorV2 {
  if (!generatorInstance) {
    generatorInstance = new AIWidgetGeneratorV2();
  }
  return generatorInstance;
}

/**
 * Create a new generator instance with custom config
 */
export function createWidgetGeneratorV2(
  config?: Partial<GeneratorConfig>
): AIWidgetGeneratorV2 {
  return new AIWidgetGeneratorV2(config);
}
