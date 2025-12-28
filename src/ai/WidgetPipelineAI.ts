/**
 * StickerNest v2 - Widget Pipeline AI
 * Main orchestrator for AI-powered widget creation, modification, and pipeline management
 * Enforces all StickerNest protocol rules and security constraints
 *
 * Integrated with self-improving AI system:
 * - Uses versioned prompts from PromptVersionStore
 * - Records all generations to GenerationMetricsStore
 * - Quality scores feed into the reflection loop
 */

import type { WidgetManifest } from '../types/manifest';
import type { Pipeline } from '../types/domain';
import type { AIProvider, TaskType } from './providers';
import { getProviderForTask, getModelRegistry } from './providers';
import { getProtocolEnforcer, type ValidationResult, type WidgetCode } from './ProtocolEnforcer';
import { getDraftManager, type DraftWidget } from './DraftManager';
import { WIDGET_TEMPLATES, findMatchingTemplates } from './WidgetTemplates';
import { WIDGET_PROTOCOL } from '../services/widgetGenerator';
import {
  IMPROVED_SYSTEM_PROMPT,
  generateImprovedPrompt,
  generateModificationPrompt,
} from './prompts/ImprovedWidgetPrompt';
import { enhancePrompt, getWidgetFamiliesSummary } from './PromptEnhancer';
// Self-improving AI integration
import { usePromptVersionStore } from '../state/usePromptVersionStore';
import { useGenerationMetricsStore } from '../state/useGenerationMetricsStore';

// Re-export types from types.ts to maintain backwards compatibility
export type { ComplexityLevel, StylePreset, FeatureRequirements } from './types';
import type { ComplexityLevel, StylePreset, FeatureRequirements } from './types';

/** Conversation message */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** Generated widgets in this message */
  widgets?: DraftWidget[];
  /** Errors encountered */
  errors?: string[];
}

/** Conversation state */
export interface AIConversation {
  id: string;
  messages: ConversationMessage[];
  context: ConversationContext;
  createdAt: number;
  lastActivity: number;
}

/** Conversation context for AI */
export interface ConversationContext {
  /** Current working widget IDs */
  activeWidgets: string[];
  /** Current pipeline being edited */
  activePipeline?: string;
  /** Task type for model selection */
  currentTask: TaskType;
  /** User preferences */
  preferences: {
    style?: 'minimal' | 'detailed';
    includeComments?: boolean;
  };
}

/** Widget generation request */
export interface WidgetGenerationRequest {
  /** Description of the widget */
  description: string;
  /** Generation mode */
  mode: 'new' | 'variation' | 'layer';
  /** Template ID to use (optional) */
  templateId?: string;
  /** Source widget for variations */
  sourceWidgetId?: string;
  /** Target pipeline for layers */
  pipelineId?: string;
  /** Widget family for event namespacing (e.g., 'farm', 'audio', 'vector') */
  widgetFamily?: string;
  /** Expected input events */
  inputEvents?: string[];
  /** Expected output events */
  outputEvents?: string[];
  /** Model preset to use */
  modelPreset?: string;
  /** Conversation ID for context */
  conversationId?: string;
  /** Complexity level */
  complexity?: ComplexityLevel;
  /** Visual style preset */
  stylePreset?: StylePreset;
  /** Feature requirements */
  features?: FeatureRequirements;
  /** Additional instructions */
  additionalInstructions?: string;
}

/** Widget modification request */
export interface WidgetModificationRequest {
  /** Widget ID or draft ID to modify */
  widgetId: string;
  /** Modification instructions */
  instructions: string;
  /** Type of modification */
  modificationType: 'refactor' | 'add-feature' | 'fix-bug' | 'update-style' | 'add-events';
  /** Conversation ID for context */
  conversationId?: string;
}

/** Pipeline expansion request */
export interface PipelineExpansionRequest {
  /** Pipeline ID to expand */
  pipelineId?: string;
  /** Description of new pipeline or expansion */
  description: string;
  /** Widgets to include (by ID) */
  includeWidgets?: string[];
  /** Create new pipeline or add to existing */
  mode: 'new' | 'expand';
}

/** AI generation result */
export interface AIGenerationResult {
  success: boolean;
  /** Generated or modified widget draft */
  widget?: DraftWidget;
  /** Validation result */
  validation?: ValidationResult;
  /** AI explanation */
  explanation?: string;
  /** Errors encountered */
  errors?: string[];
  /** Suggested next steps */
  suggestions?: string[];
}

/** Pipeline generation result */
export interface PipelineGenerationResult {
  success: boolean;
  /** Generated pipeline */
  pipeline?: Pipeline;
  /** Generated widgets */
  widgets?: DraftWidget[];
  /** Validation issues */
  validationIssues?: string[];
  /** Explanation */
  explanation?: string;
}

/**
 * Widget Pipeline AI - Main orchestrator
 */
export class WidgetPipelineAI {
  private conversations: Map<string, AIConversation> = new Map();
  private provider: AIProvider;

  constructor(modelPreset?: string) {
    if (modelPreset) {
      const registry = getModelRegistry();
      const config = registry.getProviderConfig(modelPreset);
      if (config) {
        this.provider = getProviderForTask('widget');
      } else {
        this.provider = getProviderForTask('widget');
      }
    } else {
      this.provider = getProviderForTask('widget');
    }
  }

  /**
   * Start a new conversation
   */
  startConversation(context?: Partial<ConversationContext>): AIConversation {
    const id = this.generateId('conv');
    const now = Date.now();

    const conversation: AIConversation = {
      id,
      messages: [],
      context: {
        activeWidgets: [],
        currentTask: 'widget',
        preferences: {},
        ...context,
      },
      createdAt: now,
      lastActivity: now,
    };

    // Add system message with protocol
    conversation.messages.push({
      id: this.generateId('msg'),
      role: 'system',
      content: this.buildSystemPrompt(),
      timestamp: now,
    });

    this.conversations.set(id, conversation);
    return conversation;
  }

  /**
   * Get an existing conversation
   */
  getConversation(id: string): AIConversation | null {
    return this.conversations.get(id) || null;
  }

  /**
   * Send a chat message and get a response
   */
  async chat(conversationId: string, message: string): Promise<ConversationMessage> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Add user message
    const userMessage: ConversationMessage = {
      id: this.generateId('msg'),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    conversation.messages.push(userMessage);

    // Detect intent
    const intent = this.detectIntent(message);
    conversation.context.currentTask = intent.task;

    // Switch provider based on task if needed
    this.provider = getProviderForTask(intent.task);

    // Build prompt with conversation history
    const prompt = this.buildChatPrompt(conversation, intent);

    try {
      // Generate response
      const result = await this.provider.generate(prompt, {
        maxTokens: 8000,
        temperature: 0.6,
      });

      // Parse response
      const parsed = this.parseResponse(result.content, intent);

      // Create assistant message
      const assistantMessage: ConversationMessage = {
        id: this.generateId('msg'),
        role: 'assistant',
        content: parsed.explanation || result.content,
        timestamp: Date.now(),
        widgets: parsed.widgets,
        errors: parsed.errors,
      };

      conversation.messages.push(assistantMessage);
      conversation.lastActivity = Date.now();

      return assistantMessage;
    } catch (error) {
      const errorMessage: ConversationMessage = {
        id: this.generateId('msg'),
        role: 'assistant',
        content: 'I encountered an error while processing your request.',
        timestamp: Date.now(),
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };

      conversation.messages.push(errorMessage);
      return errorMessage;
    }
  }

  /**
   * Generate a new widget
   * Integrated with self-improving AI: records all generations for reflection loop
   */
  async generateWidget(request: WidgetGenerationRequest): Promise<AIGenerationResult> {
    const startTime = Date.now();

    // Find matching template
    const templates = request.templateId
      ? [WIDGET_TEMPLATES.find(t => t.id === request.templateId)]
      : findMatchingTemplates(request.description);

    const template = templates[0];

    // Build generation prompt
    const prompt = this.buildWidgetGenerationPrompt(request, template);

    // Select model based on complexity - provider already set above
    this.provider = getProviderForTask('widget');

    try {
      const result = await this.provider.generate(prompt, {
        maxTokens: 8000,
        temperature: request.mode === 'variation' ? 0.8 : 0.6,
      });

      // Parse the generated widget
      const parsed = this.parseWidgetResponse(result.content);

      if (!parsed.manifest || !parsed.html) {
        // Record failed generation (parse error)
        this.recordGeneration(
          request.description,
          'failure',
          undefined,
          {
            errorMessage: 'Failed to parse AI response - missing manifest or HTML',
            durationMs: Date.now() - startTime,
          }
        );

        return {
          success: false,
          errors: ['Failed to parse AI response - missing manifest or HTML'],
          suggestions: ['Try rephrasing your description', 'Be more specific about widget functionality'],
        };
      }

      // Validate against protocol
      const enforcer = getProtocolEnforcer();
      const widgetCode: WidgetCode = {
        manifest: parsed.manifest,
        html: parsed.html,
      };
      const validation = enforcer.validateWidget(widgetCode);

      // Create draft
      const draftManager = getDraftManager();
      const draft = draftManager.createDraft(parsed.manifest, parsed.html, {
        conversationId: request.conversationId,
        metadata: {
          prompt: request.description,
          model: this.provider.model,
          mode: request.mode === 'layer' ? 'new' : request.mode,
          sourceWidgetId: request.sourceWidgetId,
        },
      });

      // Set validation result
      draftManager.setValidationResult(draft.id, validation);

      // Record generation for self-improvement tracking
      this.recordGeneration(
        request.description,
        validation.valid ? 'success' : 'partial',
        validation,
        {
          widgetId: draft.id,
          durationMs: Date.now() - startTime,
        }
      );

      return {
        success: validation.valid,
        widget: draft,
        validation,
        explanation: parsed.explanation,
        errors: validation.errors.map(e => e.message),
        suggestions: validation.suggestions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';

      // Record failed generation
      this.recordGeneration(
        request.description,
        'failure',
        undefined,
        {
          errorMessage,
          durationMs: Date.now() - startTime,
        }
      );

      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Modify an existing widget
   * Integrated with self-improving AI: records all modifications for reflection loop
   */
  async modifyWidget(request: WidgetModificationRequest): Promise<AIGenerationResult> {
    const startTime = Date.now();

    // Get the existing widget code
    const existingCode = await this.getWidgetCode(request.widgetId);

    if (!existingCode) {
      return {
        success: false,
        errors: [`Widget not found: ${request.widgetId}`],
      };
    }

    // Build modification prompt
    const prompt = this.buildModificationPrompt(request, existingCode);

    // Use quality model for modifications
    this.provider = getProviderForTask('modify');

    try {
      const result = await this.provider.generate(prompt, {
        maxTokens: 10000,
        temperature: 0.4, // Lower temperature for more precise edits
      });

      const parsed = this.parseWidgetResponse(result.content);

      if (!parsed.manifest || !parsed.html) {
        // Record failed modification
        this.recordGeneration(
          `[MODIFY ${request.widgetId}] ${request.instructions}`,
          'failure',
          undefined,
          {
            errorMessage: 'Failed to parse modification response',
            durationMs: Date.now() - startTime,
          }
        );

        return {
          success: false,
          errors: ['Failed to parse modification response'],
        };
      }

      // Validate
      const enforcer = getProtocolEnforcer();
      const validation = enforcer.validateWidget({
        manifest: parsed.manifest,
        html: parsed.html,
      });

      // Create draft with modification metadata
      const draftManager = getDraftManager();
      const draft = draftManager.createDraft(parsed.manifest, parsed.html, {
        conversationId: request.conversationId,
        metadata: {
          prompt: request.instructions,
          model: this.provider.model,
          mode: 'modification',
          sourceWidgetId: request.widgetId,
        },
      });

      draftManager.setValidationResult(draft.id, validation);

      // Record modification for self-improvement tracking
      this.recordGeneration(
        `[MODIFY ${request.widgetId}] ${request.instructions}`,
        validation.valid ? 'success' : 'partial',
        validation,
        {
          widgetId: draft.id,
          durationMs: Date.now() - startTime,
        }
      );

      return {
        success: validation.valid,
        widget: draft,
        validation,
        explanation: parsed.explanation,
        errors: validation.errors.map(e => e.message),
        suggestions: validation.suggestions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Modification failed';

      // Record failed modification
      this.recordGeneration(
        `[MODIFY ${request.widgetId}] ${request.instructions}`,
        'failure',
        undefined,
        {
          errorMessage,
          durationMs: Date.now() - startTime,
        }
      );

      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Generate or expand a pipeline
   */
  async generatePipeline(request: PipelineExpansionRequest): Promise<PipelineGenerationResult> {
    // Use quality model for pipeline generation
    this.provider = getProviderForTask('pipeline');

    const prompt = this.buildPipelinePrompt(request);

    try {
      const result = await this.provider.generate(prompt, {
        maxTokens: 12000,
        temperature: 0.5,
      });

      const parsed = this.parsePipelineResponse(result.content);

      if (!parsed.pipeline) {
        return {
          success: false,
          validationIssues: ['Failed to parse pipeline structure'],
        };
      }

      // Validate pipeline
      const enforcer = getProtocolEnforcer();
      const validation = enforcer.validatePipeline(parsed.pipeline, new Map());

      // Create drafts for generated widgets
      const draftManager = getDraftManager();
      const widgetDrafts: DraftWidget[] = [];

      for (const widget of parsed.widgets || []) {
        const draft = draftManager.createDraft(widget.manifest, widget.html, {
          metadata: {
            prompt: request.description,
            model: this.provider.model,
            mode: 'new',
          },
        });
        widgetDrafts.push(draft);
      }

      return {
        success: validation.valid,
        pipeline: parsed.pipeline,
        widgets: widgetDrafts,
        validationIssues: validation.errors.map(e => e.message),
        explanation: parsed.explanation,
      };
    } catch (error) {
      return {
        success: false,
        validationIssues: [error instanceof Error ? error.message : 'Pipeline generation failed'],
      };
    }
  }

  /**
   * Switch the AI model
   */
  setModel(presetId: string): void {
    const registry = getModelRegistry();
    const config = registry.getProviderConfig(presetId);
    
    if (config) {
      this.provider = getProviderForTask('widget');
    }
  }

  // Private methods

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Calculate quality score (0-100) from validation results
   * Used by the self-improving system to track generation quality
   */
  private calculateQualityScore(validation: ValidationResult): number {
    // Start with base score of 100
    let score = 100;

    // Deduct for errors (major issues)
    const errorWeight = 15;
    score -= validation.errors.length * errorWeight;

    // Deduct for warnings (minor issues)
    const warningWeight = 5;
    score -= validation.warnings.length * warningWeight;

    // Bonus if valid (passed all checks)
    if (validation.valid) {
      score = Math.min(100, score + 10);
    }

    // Ensure score stays in 0-100 range
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Record a generation to the metrics store for self-improvement tracking
   */
  private recordGeneration(
    userPrompt: string,
    result: 'success' | 'failure' | 'partial',
    validation?: ValidationResult,
    options?: {
      errorMessage?: string;
      model?: string;
      widgetId?: string;
      durationMs?: number;
    }
  ): string {
    const metricsStore = useGenerationMetricsStore.getState();
    const promptStore = usePromptVersionStore.getState();

    // Get current prompt version for linking
    const activeVersion = promptStore.getActiveVersion('widget_generation');
    const promptVersionId = activeVersion?.id || 'unknown';

    // Calculate quality score from validation
    const qualityScore = validation ? this.calculateQualityScore(validation) : undefined;

    return metricsStore.addRecord({
      type: 'widget',
      promptVersionId,
      userPrompt,
      result,
      errorMessage: options?.errorMessage,
      qualityScore,
      metadata: {
        model: options?.model || this.provider.model,
        provider: this.provider.name,
        widgetId: options?.widgetId,
        durationMs: options?.durationMs,
      },
    });
  }

  private buildSystemPrompt(): string {
    // Use versioned prompt from self-improving system if available
    const promptStore = usePromptVersionStore.getState();
    const versionedPrompt = promptStore.getActivePrompt('widget_generation');

    if (versionedPrompt) {
      // Track that we're using this prompt version
      promptStore.incrementGenerationCount('widget_generation');
      return versionedPrompt;
    }

    // Fallback to improved system prompt which includes comprehensive protocol documentation,
    // design system CSS variables, and complete widget examples
    return IMPROVED_SYSTEM_PROMPT;
  }

  private detectIntent(message: string): { task: TaskType; action: string } {
    const lower = message.toLowerCase();

    if (lower.includes('create') || lower.includes('generate') || lower.includes('make') || lower.includes('build')) {
      if (lower.includes('pipeline')) {
        return { task: 'pipeline', action: 'create' };
      }
      return { task: 'widget', action: 'create' };
    }

    if (lower.includes('modify') || lower.includes('change') || lower.includes('update') || lower.includes('edit')) {
      return { task: 'modify', action: 'modify' };
    }

    if (lower.includes('security') || lower.includes('safe') || lower.includes('validate')) {
      return { task: 'security', action: 'validate' };
    }

    if (lower.includes('pipeline') || lower.includes('connect') || lower.includes('wire')) {
      return { task: 'pipeline', action: 'create' };
    }

    return { task: 'chat', action: 'chat' };
  }

  private buildChatPrompt(conversation: AIConversation, intent: { task: TaskType; action: string }): string {
    // Include recent conversation history
    const recentMessages = conversation.messages.slice(-10);
    
    let prompt = '';
    
    for (const msg of recentMessages) {
      if (msg.role === 'system') {
        prompt += `System: ${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n\n`;
      } else {
        prompt += `Assistant: ${msg.content}\n\n`;
      }
    }

    // Add task context
    if (intent.action === 'create') {
      prompt += '\nGenerate a complete widget following the protocol. Output as JSON with manifest, html, and explanation fields.';
    } else if (intent.action === 'modify') {
      prompt += '\nProvide the modified widget code following the protocol. Output as JSON with manifest, html, and explanation fields.';
    }

    return prompt;
  }

  private buildWidgetGenerationPrompt(request: WidgetGenerationRequest, template?: any): string {
    const complexity = request.complexity || 'standard';
    const stylePreset = request.stylePreset || 'polished';

    // Enhance the user's prompt with event system knowledge
    // If widgetFamily is explicitly provided, use it; otherwise auto-detect
    const enhanced = enhancePrompt(request.description, request.widgetFamily);

    // Log what we detected/selected for debugging
    const family = enhanced.detectedFamily;
    if (family) {
      console.log(`[WidgetPipelineAI] Widget family: ${family}${request.widgetFamily ? ' (user-selected)' : ' (auto-detected)'}`);
      console.log(`[WidgetPipelineAI] Suggested events:`, enhanced.suggestedEvents);
      if (enhanced.useWildcard) {
        console.log(`[WidgetPipelineAI] Using wildcard: ${family}:*`);
      }
    }

    // Use the improved prompt generator which provides comprehensive documentation
    const improvedPrompt = generateImprovedPrompt(enhanced.enhancedDescription, {
      complexity,
      style: stylePreset,
      features: request.features || {},
      inputEvents: request.inputEvents || enhanced.suggestedEvents.listens,
      outputEvents: request.outputEvents || enhanced.suggestedEvents.emits,
      pipelineName: request.pipelineId ? `Pipeline ${request.pipelineId}` : undefined,
      existingWidgets: [], // Will be populated by WidgetLab
      additionalInstructions: request.additionalInstructions,
    });

    // Include a concrete example for the AI to follow
    const exampleWidget = this.getExampleWidget(complexity, stylePreset);

    // Build family context if detected
    const familyContext = enhanced.detectedFamily
      ? `\n## Widget Family Context\nThis widget is part of the "${enhanced.detectedFamily}" family.\n${enhanced.technicalNotes.join('\n')}\n`
      : '';

    return `${improvedPrompt}

${getWidgetFamiliesSummary()}
${familyContext}

## Reference Example
Here's an example of a well-made widget at the ${complexity} quality level:

${exampleWidget}

IMPORTANT REMINDERS:
1. The HTML must be COMPLETE with DOCTYPE, head, body, styles, and scripts
2. Include substantial CSS styling (use CSS variables from the design system)
3. Include meaningful JavaScript functionality with proper WidgetAPI usage
4. Add hover effects, transitions, visual feedback
5. Make it look PROFESSIONAL, not like a demo
6. Escape all quotes in the HTML string properly
7. Return ONLY valid JSON with "manifest" and "html" fields
8. MUST include "events" block in manifest with "emits" and "listens" arrays
9. Use namespace:action format for all events (e.g., "farm:harvest", "audio:beat")
10. Handle BOTH "EVENT" and "widget:event" message types for compatibility

Generate the widget JSON now:`;
  }

  private getExampleWidget(complexity: ComplexityLevel, style: StylePreset): string {
    // Provide a concrete example based on complexity
    if (complexity === 'basic') {
      return `{
  "manifest": {
    "id": "click-counter",
    "name": "Click Counter",
    "version": "1.0.0",
    "kind": "2d",
    "entry": "index.html",
    "capabilities": {"draggable": true, "resizable": true, "rotatable": false},
    "events": {
      "emits": ["counter:value-changed"],
      "listens": ["counter:reset", "counter:set-value"]
    }
  },
  "html": "<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#1a1a2e;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;padding:16px}.header{display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1)}.header-icon{font-size:1.5rem}.title{font-size:1rem;font-weight:600}.counter-display{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}.count{font-size:4rem;font-weight:700;background:linear-gradient(135deg,#8b5cf6,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 30px rgba(139,92,246,0.3)}.btn{padding:12px 32px;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;transition:all 0.2s}.btn-primary{background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white}.btn-primary:hover{transform:scale(1.05);box-shadow:0 4px 20px rgba(139,92,246,0.4)}.btn-primary:active{transform:scale(0.98)}.btn-secondary{background:rgba(255,255,255,0.1);color:#94a3b8}.btn-secondary:hover{background:rgba(255,255,255,0.15)}.buttons{display:flex;gap:12px}.status{margin-top:auto;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.75rem;color:#64748b;text-align:center}</style></head><body><div class=\\"header\\"><span class=\\"header-icon\\">🔢</span><span class=\\"title\\">Click Counter</span></div><div class=\\"counter-display\\"><div class=\\"count\\" id=\\"count\\">0</div><div class=\\"buttons\\"><button class=\\"btn btn-primary\\" id=\\"increment\\">+ Click Me</button><button class=\\"btn btn-secondary\\" id=\\"reset\\">Reset</button></div></div><div class=\\"status\\">Click to count • Emits count on change</div><script>(function(){let count=0;const countEl=document.getElementById('count');const incBtn=document.getElementById('increment');const resetBtn=document.getElementById('reset');function updateDisplay(){countEl.textContent=count;countEl.style.transform='scale(1.1)';setTimeout(()=>countEl.style.transform='scale(1)',150);if(window.WidgetAPI){window.WidgetAPI.emitEvent({type:'count-changed',payload:{count}});window.WidgetAPI.setState({count})}}incBtn.addEventListener('click',()=>{count++;updateDisplay()});resetBtn.addEventListener('click',()=>{count=0;updateDisplay()});function init(){if(window.WidgetAPI){const state=window.WidgetAPI.getState();if(state&&state.count)count=state.count;updateDisplay();window.WidgetAPI.onEvent('reset',()=>{count=0;updateDisplay()});window.WidgetAPI.log('Click Counter initialized')}else{setTimeout(init,100)}}init()})();</script></body></html>",
  "explanation": "A click counter with increment and reset buttons, animated count display, and state persistence."
}`;
    }
    
    return `{
  "manifest": {
    "id": "task-manager",
    "name": "Task Manager",
    "version": "1.0.0",
    "kind": "2d",
    "entry": "index.html",
    "capabilities": {"draggable": true, "resizable": true, "rotatable": false},
    "events": {
      "emits": ["tasks:task-completed", "tasks:task-added", "tasks:progress-updated"],
      "listens": ["tasks:add-task", "tasks:clear-completed", "tasks:*"]
    }
  },
  "html": "<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#1a1a2e;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;overflow:hidden}.widget-container{display:flex;flex-direction:column;height:100vh;padding:16px}.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1)}.header-left{display:flex;align-items:center;gap:10px}.header-icon{font-size:1.5rem}.title{font-size:1.1rem;font-weight:600}.badge{background:linear-gradient(135deg,#8b5cf6,#6366f1);padding:4px 10px;border-radius:12px;font-size:0.75rem;font-weight:600}.add-form{display:flex;gap:8px;margin-bottom:16px}.input{flex:1;padding:12px 16px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9rem;transition:all 0.2s}.input:focus{outline:none;border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,0.2)}.input::placeholder{color:#64748b}.btn{padding:12px 20px;border:none;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.2s}.btn-add{background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white}.btn-add:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(139,92,246,0.4)}.btn-add:active{transform:translateY(0)}.btn-add:disabled{opacity:0.5;cursor:not-allowed;transform:none}.tasks{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px}.task{display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.05);transition:all 0.2s}.task:hover{background:rgba(255,255,255,0.06);transform:translateX(4px)}.task.completed{opacity:0.6}.task.completed .task-text{text-decoration:line-through;color:#64748b}.checkbox{width:22px;height:22px;border-radius:6px;border:2px solid #64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0}.checkbox:hover{border-color:#8b5cf6}.checkbox.checked{background:#8b5cf6;border-color:#8b5cf6}.checkbox.checked::after{content:'✓';color:white;font-size:14px}.task-text{flex:1;font-size:0.9rem}.delete-btn{width:32px;height:32px;border-radius:6px;border:none;background:transparent;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;opacity:0}.task:hover .delete-btn{opacity:1}.delete-btn:hover{background:rgba(239,68,68,0.2);color:#ef4444}.empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#64748b;gap:12px}.empty-icon{font-size:3rem;opacity:0.5}.empty-text{font-size:0.9rem}.stats{display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.75rem;color:#64748b}.progress-bar{height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;margin-top:8px}.progress-fill{height:100%;background:linear-gradient(90deg,#8b5cf6,#10b981);border-radius:2px;transition:width 0.3s ease-out}@keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}.task{animation:slideIn 0.2s ease-out}</style></head><body><div class=\\"widget-container\\"><div class=\\"header\\"><div class=\\"header-left\\"><span class=\\"header-icon\\">📋</span><span class=\\"title\\">Task Manager</span></div><span class=\\"badge\\" id=\\"task-count\\">0 tasks</span></div><div class=\\"add-form\\"><input type=\\"text\\" class=\\"input\\" id=\\"task-input\\" placeholder=\\"Add a new task...\\" /><button class=\\"btn btn-add\\" id=\\"add-btn\\">+ Add</button></div><div class=\\"tasks\\" id=\\"tasks-container\\"><div class=\\"empty-state\\" id=\\"empty-state\\"><span class=\\"empty-icon\\">📝</span><span class=\\"empty-text\\">No tasks yet. Add one above!</span></div></div><div class=\\"stats\\"><span id=\\"stats-text\\">0 completed</span><span id=\\"stats-remaining\\">0 remaining</span></div><div class=\\"progress-bar\\"><div class=\\"progress-fill\\" id=\\"progress\\" style=\\"width:0%\\"></div></div></div><script>(function(){let tasks=[];const input=document.getElementById('task-input');const addBtn=document.getElementById('add-btn');const container=document.getElementById('tasks-container');const emptyState=document.getElementById('empty-state');const taskCount=document.getElementById('task-count');const statsText=document.getElementById('stats-text');const statsRemaining=document.getElementById('stats-remaining');const progress=document.getElementById('progress');function generateId(){return Date.now().toString(36)+Math.random().toString(36).substr(2)}function renderTasks(){container.innerHTML='';if(tasks.length===0){container.appendChild(emptyState.cloneNode(true));emptyState.style.display='flex'}else{emptyState.style.display='none';tasks.forEach(task=>{const el=document.createElement('div');el.className='task'+(task.completed?' completed':'');el.innerHTML=\`<div class=\\"checkbox\${task.completed?' checked':'\\"}\\"></div><span class=\\"task-text\\">\${escapeHtml(task.text)}</span><button class=\\"delete-btn\\">×</button>\`;el.querySelector('.checkbox').onclick=()=>toggleTask(task.id);el.querySelector('.delete-btn').onclick=()=>deleteTask(task.id);container.appendChild(el)})}updateStats()}function escapeHtml(text){const div=document.createElement('div');div.textContent=text;return div.innerHTML}function updateStats(){const total=tasks.length;const completed=tasks.filter(t=>t.completed).length;const remaining=total-completed;taskCount.textContent=\`\${total} task\${total!==1?'s':''}\`;statsText.textContent=\`\${completed} completed\`;statsRemaining.textContent=\`\${remaining} remaining\`;progress.style.width=total>0?\`\${(completed/total)*100}%\`:'0%';saveState()}function addTask(text){if(!text.trim())return;tasks.unshift({id:generateId(),text:text.trim(),completed:false});renderTasks();input.value='';if(window.WidgetAPI)window.WidgetAPI.log('Task added: '+text)}function toggleTask(id){const task=tasks.find(t=>t.id===id);if(task){task.completed=!task.completed;renderTasks();if(task.completed&&window.WidgetAPI){window.WidgetAPI.emitEvent({type:'task-completed',payload:{task}})}}}function deleteTask(id){tasks=tasks.filter(t=>t.id!==id);renderTasks()}function saveState(){if(window.WidgetAPI)window.WidgetAPI.setState({tasks})}function loadState(){if(window.WidgetAPI){const state=window.WidgetAPI.getState();if(state&&state.tasks)tasks=state.tasks}}addBtn.onclick=()=>addTask(input.value);input.onkeypress=e=>{if(e.key==='Enter')addTask(input.value)};input.oninput=()=>{addBtn.disabled=!input.value.trim()};addBtn.disabled=true;function init(){if(window.WidgetAPI){loadState();renderTasks();window.WidgetAPI.onEvent('add-task',e=>{if(e.payload&&e.payload.text)addTask(e.payload.text)});window.WidgetAPI.log('Task Manager initialized')}else{setTimeout(init,100)}}init()})();</script></body></html>",
  "explanation": "A full-featured task manager with add/complete/delete functionality, progress tracking, animations, and state persistence."
}`;
  }

  private getComplexityRequirements(level: ComplexityLevel): string {
    const requirements: Record<ComplexityLevel, string> = {
      basic: `
- Simple, single-purpose functionality
- Clean but minimal UI
- Essential interactivity only
- 100-200 lines of code`,
      
      standard: `
- Full-featured implementation
- Polished UI with clear visual hierarchy
- Multiple interactive elements
- Smooth animations and transitions
- Proper state management
- 200-400 lines of code`,
      
      advanced: `
- Comprehensive feature set
- Sophisticated UI with attention to detail
- Complex state management
- Multiple interaction patterns
- Keyboard shortcuts
- Accessibility considerations
- Custom animations
- 400-700 lines of code`,
      
      professional: `
- Production-ready implementation
- Exceptional UI/UX with micro-interactions
- Robust error handling and edge cases
- Performance optimizations
- Full accessibility support
- Comprehensive state management
- Custom visual effects
- Sound effects where appropriate
- Keyboard navigation
- Context menus
- 700+ lines of code`
    };
    
    return requirements[level];
  }

  private getStyleGuide(preset: StylePreset): string {
    const styles: Record<StylePreset, string> = {
      minimal: `
- Clean, whitespace-focused design
- Subtle colors: #1a1a2e bg, #e2e8f0 text
- Thin borders, minimal shadows
- Simple geometric shapes
- Focus on typography`,

      polished: `
- Modern, professional appearance
- Rich color palette: #1a1a2e bg, #e2e8f0 text, #8b5cf6 primary accent, #10b981 success, #f59e0b warning, #ef4444 error
- Layered shadows for depth
- Rounded corners (8-12px)
- Gradient accents
- Subtle hover effects with scale/glow`,

      elaborate: `
- Highly detailed, crafted design
- Multiple accent colors with careful contrast
- Complex gradients and patterns
- Decorative elements and icons
- Animated backgrounds or particles
- Rich shadows and layering
- Custom cursor states
- Elaborate hover animations`,

      glassmorphism: `
- Frosted glass effect (backdrop-filter: blur)
- Semi-transparent backgrounds (rgba with 0.1-0.3 alpha)
- Subtle borders with white/light opacity
- Soft shadows
- Light, airy feeling
- Colors: rgba(255,255,255,0.1) containers, #e2e8f0 text, #a78bfa accents`,

      neon: `
- Dark background (#0a0a0f)
- Bright neon colors: #00ff88 (green), #ff00ff (magenta), #00ffff (cyan), #ffff00 (yellow)
- Glow effects using multiple box-shadows
- Sharp contrasts
- Animated glow pulsing
- Cyberpunk aesthetic
- Monospace fonts`,

      retro: `
- Vintage computer aesthetic
- CRT screen effect (optional scanlines)
- Pixel-style borders or elements
- Limited color palette: #00ff00, #ffff00, #ff0000 on dark
- Monospace fonts
- Chunky borders
- 8-bit inspired graphics`
    };
    
    return styles[preset];
  }

  private getFeatureRequirements(features: FeatureRequirements): string {
    const requirements: string[] = [];
    
    // Always include these basics
    requirements.push('✓ Clear visual feedback for all actions');
    requirements.push('✓ Proper WidgetAPI initialization pattern');
    requirements.push('✓ Event emission for meaningful state changes');
    
    if (features.animations !== false) {
      requirements.push('✓ Smooth CSS transitions (transform, opacity) on interactive elements');
      requirements.push('✓ Entrance animations for dynamic content');
    }
    
    if (features.microInteractions !== false) {
      requirements.push('✓ Hover effects (scale, color change, shadow)');
      requirements.push('✓ Click/active states');
      requirements.push('✓ Focus states for accessibility');
    }
    
    if (features.loadingStates) {
      requirements.push('✓ Loading spinner or skeleton screens');
      requirements.push('✓ Progress indicators where appropriate');
    }
    
    if (features.errorHandling) {
      requirements.push('✓ Error state UI with clear messaging');
      requirements.push('✓ Recovery options (retry buttons)');
      requirements.push('✓ Input validation with inline feedback');
    }
    
    if (features.keyboardShortcuts) {
      requirements.push('✓ Keyboard shortcuts for main actions');
      requirements.push('✓ Keyboard hint display');
      requirements.push('✓ Focus management');
    }
    
    if (features.responsive) {
      requirements.push('✓ Flexible layout that adapts to container size');
      requirements.push('✓ Proper text wrapping and overflow handling');
    }
    
    if (features.accessibility) {
      requirements.push('✓ ARIA labels on interactive elements');
      requirements.push('✓ Sufficient color contrast');
      requirements.push('✓ Focus visible indicators');
      requirements.push('✓ Screen reader friendly structure');
    }
    
    if (features.persistence) {
      requirements.push('✓ State persistence using WidgetAPI.setState/getState');
      requirements.push('✓ Restore state on widget reload');
    }
    
    if (features.soundEffects) {
      requirements.push('✓ Subtle audio feedback (clicks, success, errors)');
      requirements.push('✓ Mute option');
    }
    
    return requirements.join('\n');
  }

  private buildModificationPrompt(request: WidgetModificationRequest, existingCode: { html: string; manifest: WidgetManifest }): string {
    // Use the improved modification prompt generator
    return generateModificationPrompt(
      existingCode.html,
      existingCode.manifest,
      `Type: ${request.modificationType}\n\n${request.instructions}`
    );
  }

  private buildPipelinePrompt(request: PipelineExpansionRequest): string {
    return `${request.mode === 'new' ? 'Create a new' : 'Expand the'} StickerNest pipeline:

Description: ${request.description}
${request.includeWidgets?.length ? `Include widgets: ${request.includeWidgets.join(', ')}` : ''}

${WIDGET_PROTOCOL}

Respond with JSON:
{
  "pipeline": {
    "id": "pipeline-id",
    "canvasId": "canvas-1",
    "name": "Pipeline Name",
    "description": "What this pipeline does",
    "nodes": [
      {
        "id": "node-1",
        "widgetInstanceId": "widget-instance-1",
        "type": "widget",
        "position": { "x": 100, "y": 100 }
      }
    ],
    "connections": [
      {
        "id": "conn-1",
        "from": { "nodeId": "node-1", "portName": "output-port" },
        "to": { "nodeId": "node-2", "portName": "input-port" }
      }
    ],
    "enabled": true
  },
  "widgets": [
    {
      "manifest": { ... },
      "html": "..."
    }
  ],
  "explanation": "How this pipeline works"
}`;
  }

  private parseResponse(content: string, _intent: { task: TaskType; action: string }): {
    explanation?: string;
    widgets?: DraftWidget[];
    errors?: string[];
  } {
    // Try to extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      // No JSON found, return as explanation
      return { explanation: content };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.manifest && parsed.html) {
        // Single widget response
        const draftManager = getDraftManager();
        const draft = draftManager.createDraft(parsed.manifest, parsed.html);
        
        return {
          explanation: parsed.explanation,
          widgets: [draft],
        };
      }

      return { explanation: parsed.explanation || content };
    } catch {
      return { explanation: content };
    }
  }

  private parseWidgetResponse(content: string): {
    manifest?: WidgetManifest;
    html?: string;
    explanation?: string;
  } {
    console.log('[WidgetPipelineAI] Parsing response, length:', content.length);
    console.log('[WidgetPipelineAI] Response preview:', content.substring(0, 500));
    
    // Try multiple extraction strategies
    let jsonStr = content;
    
    // Strategy 1: Look for JSON in code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
      console.log('[WidgetPipelineAI] Found JSON in code block');
    } else {
      // Strategy 2: Find the outermost JSON object
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = content.substring(firstBrace, lastBrace + 1);
        console.log('[WidgetPipelineAI] Extracted JSON object from positions', firstBrace, 'to', lastBrace);
      }
    }

    try {
      // Clean up common JSON issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
      
      const parsed = JSON.parse(jsonStr);
      console.log('[WidgetPipelineAI] Successfully parsed JSON, has manifest:', !!parsed.manifest, 'has html:', !!parsed.html);
      
      return {
        manifest: parsed.manifest,
        html: parsed.html,
        explanation: parsed.explanation,
      };
    } catch (error) {
      console.error('[WidgetPipelineAI] JSON parse error:', error);
      console.error('[WidgetPipelineAI] Failed JSON string:', jsonStr.substring(0, 1000));
      
      // Strategy 3: Try to extract parts separately
      const manifestMatch = content.match(/"manifest"\s*:\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})/);
      const htmlMatch = content.match(/"html"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      
      if (manifestMatch && htmlMatch) {
        try {
          const manifest = JSON.parse(manifestMatch[1]);
          const html = JSON.parse(`"${htmlMatch[1]}"`); // Unescape the HTML string
          console.log('[WidgetPipelineAI] Extracted manifest and html separately');
          return { manifest, html };
        } catch {
          console.error('[WidgetPipelineAI] Failed to extract parts separately');
        }
      }
      
      return {};
    }
  }

  private parsePipelineResponse(content: string): {
    pipeline?: Pipeline;
    widgets?: Array<{ manifest: WidgetManifest; html: string }>;
    explanation?: string;
  } {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        pipeline: parsed.pipeline,
        widgets: parsed.widgets,
        explanation: parsed.explanation,
      };
    } catch {
      return {};
    }
  }

  private async getWidgetCode(widgetId: string): Promise<{ html: string; manifest: WidgetManifest } | null> {
    // Check drafts first
    const draftManager = getDraftManager();
    const draft = draftManager.getDraft(widgetId);
    
    if (draft) {
      return {
        html: draft.html,
        manifest: draft.manifest,
      };
    }

    // Try loading from test-widgets folder
    try {
      const manifestResponse = await fetch(`/test-widgets/${widgetId}/manifest.json`);
      if (!manifestResponse.ok) return null;
      
      const manifest = await manifestResponse.json();
      
      const htmlResponse = await fetch(`/test-widgets/${widgetId}/${manifest.entry}`);
      if (!htmlResponse.ok) return null;
      
      const html = await htmlResponse.text();
      
      return { html, manifest };
    } catch {
      return null;
    }
  }
}

/** Singleton instance */
let aiInstance: WidgetPipelineAI | null = null;

/**
 * Get the Widget Pipeline AI singleton
 */
export function getWidgetPipelineAI(): WidgetPipelineAI {
  if (!aiInstance) {
    aiInstance = new WidgetPipelineAI();
  }
  return aiInstance;
}

/**
 * Create a new Widget Pipeline AI instance
 */
export function createWidgetPipelineAI(modelPreset?: string): WidgetPipelineAI {
  return new WidgetPipelineAI(modelPreset);
}

