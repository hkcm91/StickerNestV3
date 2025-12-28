/**
 * StickerNest v2 - AI Reflection Service
 * The "judge" AI that evaluates generations and drives the self-improvement loop
 *
 * This service:
 * 1. Evaluates widget/image generations against rubrics
 * 2. Decides when prompts need updating
 * 3. Generates improved prompts
 * 4. Creates suggestions for non-critical improvements
 * 5. Identifies when new skills would help
 */

import { useAIReflectionStore, type RubricCriteria, type CriterionScore, type ReflectionEvaluation, type AIImprovementSuggestion } from '../state/useAIReflectionStore';
import { usePromptVersionStore, type PromptDomain } from '../state/usePromptVersionStore';
import { useGenerationMetricsStore, type GenerationRecord, type GenerationType } from '../state/useGenerationMetricsStore';
import { getProviderForTask } from './providers';
import type { AIProvider, TaskType } from './providers';

// ==================
// Types
// ==================

/** Reflection request parameters */
export interface ReflectionRequest {
  targetType: 'widget_generation' | 'image_generation' | 'pipeline' | 'skill';
  forceRun?: boolean;
  recordsToEvaluate?: number;
  customRubric?: RubricCriteria[];
}

/** Reflection result */
export interface ReflectionResult {
  runId: string;
  evaluation: ReflectionEvaluation | null;
  promptChanged: boolean;
  newVersionId?: string;
  suggestions: AIImprovementSuggestion[];
  skipped: boolean;
  skipReason?: string;
}

/** Prompt improvement suggestion from AI */
interface PromptImprovementAnalysis {
  shouldUpdate: boolean;
  confidence: number; // 0-1
  proposedPrompt: string;
  reason: string;
  evidence: string[];
}

/** Skill recommendation from AI */
export interface SkillRecommendation {
  name: string;
  description: string;
  trigger: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high';
}

// ==================
// System Prompts
// ==================

const JUDGE_SYSTEM_PROMPT = `You are a quality evaluator for AI-generated content in StickerNest, a canvas-based design application.

Your role is to evaluate generated widgets and images against a rubric, identifying strengths and weaknesses.

EVALUATION GUIDELINES:
1. Be objective and consistent across evaluations
2. Provide specific evidence for each score
3. Reference actual code/content when critiquing
4. Consider the user's original intent
5. Score conservatively - a 5 is truly exceptional

RESPONSE FORMAT:
Return a JSON object with:
{
  "scores": [
    {
      "criterionName": "Criterion Name",
      "score": 1-5,
      "maxScore": 5,
      "reasoning": "Specific explanation with evidence"
    }
  ],
  "overallAnalysis": "Summary of quality",
  "criticalIssues": ["List of serious problems"],
  "suggestions": ["List of improvements"]
}`;

const PROMPT_IMPROVER_SYSTEM_PROMPT = `You are a prompt engineer for StickerNest's AI generation system.

Your role is to analyze evaluation feedback and propose improved system prompts.

IMPROVEMENT GUIDELINES:
1. Make minimal, targeted changes
2. Address specific failure patterns
3. Maintain backward compatibility
4. Don't overcorrect for edge cases
5. Keep prompts clear and structured

RESPONSE FORMAT:
Return a JSON object with:
{
  "shouldUpdate": true/false,
  "confidence": 0.0-1.0,
  "proposedPrompt": "The improved prompt text",
  "reason": "Why this change is needed",
  "evidence": ["List of specific issues addressed"]
}`;

const SKILL_RECOMMENDER_SYSTEM_PROMPT = `You are a Claude Code skill architect for StickerNest.

Based on patterns in AI interactions, recommend new skills that would help Claude Code better assist developers.

SKILL GUIDELINES:
1. Skills should address repeated patterns
2. Focus on StickerNest-specific tasks
3. Skills should be actionable and specific
4. Consider the existing skill library

RESPONSE FORMAT:
Return a JSON object with:
{
  "recommendations": [
    {
      "name": "skill-name",
      "description": "What this skill helps with",
      "trigger": "When to use this skill",
      "rationale": "Why this skill is needed",
      "priority": "low/medium/high"
    }
  ]
}`;

// ==================
// AI Reflection Service
// ==================

class AIReflectionService {
  private static instance: AIReflectionService;

  private constructor() {}

  static getInstance(): AIReflectionService {
    if (!AIReflectionService.instance) {
      AIReflectionService.instance = new AIReflectionService();
    }
    return AIReflectionService.instance;
  }

  /**
   * Run a reflection cycle
   */
  async runReflection(request: ReflectionRequest): Promise<ReflectionResult> {
    const reflectionStore = useAIReflectionStore.getState();
    const metricsStore = useGenerationMetricsStore.getState();
    const promptStore = usePromptVersionStore.getState();

    // Check cooldown (unless forced)
    if (!request.forceRun && reflectionStore.isInCooldown()) {
      return {
        runId: '',
        evaluation: null,
        promptChanged: false,
        suggestions: [],
        skipped: true,
        skipReason: 'In cooldown period',
      };
    }

    // Check if already running
    if (reflectionStore.currentRunId) {
      return {
        runId: '',
        evaluation: null,
        promptChanged: false,
        suggestions: [],
        skipped: true,
        skipReason: 'Reflection already in progress',
      };
    }

    // Start run
    const runId = reflectionStore.startRun(request.forceRun ? 'manual' : 'scheduled');

    try {
      // Get records to evaluate
      const config = reflectionStore.config;
      const recordsLimit = request.recordsToEvaluate || config.messagesToEvaluate;
      const generationType = this.targetTypeToGenerationType(request.targetType);

      const records = config.evaluateUnevaluatedOnly
        ? metricsStore.getUnevaluatedRecords(generationType)
        : metricsStore.getRecordsByType(generationType, recordsLimit);

      if (records.length === 0) {
        reflectionStore.skipRun(runId);
        return {
          runId,
          evaluation: null,
          promptChanged: false,
          suggestions: [],
          skipped: true,
          skipReason: 'No records to evaluate',
        };
      }

      // Get rubric
      const rubric = request.customRubric || this.getRubricForType(request.targetType);

      // Get current prompt
      const promptDomain = this.targetTypeToPromptDomain(request.targetType);
      const currentPrompt = promptStore.getActivePrompt(promptDomain);

      // Run evaluation
      const evaluation = await this.evaluateRecords(
        request.targetType,
        records.slice(0, recordsLimit),
        rubric,
        currentPrompt
      );

      // Store evaluation
      const evaluationId = reflectionStore.addEvaluation(evaluation);

      // Mark records as evaluated
      records.forEach((r) => metricsStore.markEvaluated(r.id));

      // Check if prompt update is needed
      let promptChanged = false;
      let newVersionId: string | undefined;
      const newSuggestions: AIImprovementSuggestion[] = [];

      if (!evaluation.passed) {
        // Analyze and potentially improve prompt
        const improvement = await this.analyzeForPromptImprovement(
          evaluation,
          currentPrompt || '',
          promptDomain
        );

        if (improvement.shouldUpdate && improvement.confidence >= 0.7) {
          if (config.autoApplyChanges) {
            // Auto-apply the change
            newVersionId = promptStore.createVersion(
              promptDomain,
              improvement.proposedPrompt,
              improvement.reason,
              'ai',
              evaluationId
            );
            promptChanged = true;
            reflectionStore.setCooldown(config.cooldownMinutes);
          } else {
            // Create a proposal for user review
            promptStore.createProposal(
              promptDomain,
              improvement.proposedPrompt,
              improvement.reason,
              improvement.evidence,
              evaluationId
            );
          }
        } else {
          // Create suggestion instead
          const suggestionId = reflectionStore.addSuggestion({
            category: 'prompt',
            severity: evaluation.overallScore < config.scoreThreshold * 0.6 ? 'high' : 'medium',
            title: `Improve ${promptDomain} prompt`,
            description: improvement.reason,
            evidence: improvement.evidence,
            proposedAction: 'Review the evaluation and consider manual prompt adjustments',
          });
          const suggestion = reflectionStore.suggestions.find((s) => s.id === suggestionId);
          if (suggestion) newSuggestions.push(suggestion);
        }
      }

      // Generate non-prompt suggestions
      const additionalSuggestions = await this.generateSuggestions(evaluation, records);
      additionalSuggestions.forEach((s) => {
        const id = reflectionStore.addSuggestion(s);
        const suggestion = reflectionStore.suggestions.find((sug) => sug.id === id);
        if (suggestion) newSuggestions.push(suggestion);
      });

      reflectionStore.completeRun(runId, evaluationId);

      return {
        runId,
        evaluation: { ...evaluation, id: evaluationId, timestamp: new Date().toISOString() },
        promptChanged,
        newVersionId,
        suggestions: newSuggestions,
        skipped: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reflectionStore.failRun(runId, errorMessage);
      throw error;
    }
  }

  /**
   * Evaluate records against rubric using AI
   */
  private async evaluateRecords(
    targetType: ReflectionEvaluation['targetType'],
    records: GenerationRecord[],
    rubric: RubricCriteria[],
    currentPrompt?: string
  ): Promise<Omit<ReflectionEvaluation, 'id' | 'timestamp'>> {
    const config = useAIReflectionStore.getState().config;

    // Build evaluation context
    const recordSummaries = records.map((r) => ({
      id: r.id,
      userPrompt: r.userPrompt,
      result: r.result,
      error: r.errorMessage,
      qualityScore: r.qualityScore,
      feedback: r.feedback,
    }));

    const rubricText = rubric
      .map((c) => `- ${c.name} (weight: ${c.weight}): ${c.description}`)
      .join('\n');

    const evaluationPrompt = `Evaluate these ${targetType} records against the rubric.

CURRENT SYSTEM PROMPT:
${currentPrompt || 'Not available'}

RUBRIC:
${rubricText}

RECORDS TO EVALUATE:
${JSON.stringify(recordSummaries, null, 2)}

Score each criterion from ${rubric[0]?.minScore || 1} to ${rubric[0]?.maxScore || 5}.
Consider patterns across all records, not just individual issues.`;

    // Call AI for evaluation
    const response = await this.callAI('reflection_judge', evaluationPrompt, JUDGE_SYSTEM_PROMPT);
    const parsed = this.parseJSONResponse(response);

    // Calculate scores
    const scores: CriterionScore[] = parsed.scores || [];
    const totalWeight = rubric.reduce((sum, c) => sum + c.weight, 0);
    const weightedScore = scores.reduce((sum, s) => {
      const criterion = rubric.find((c) => c.name === s.criterionName);
      const weight = criterion?.weight || 0;
      const normalized = s.score / s.maxScore;
      return sum + normalized * weight;
    }, 0);
    const overallScore = (weightedScore / totalWeight) * 5; // Scale to 1-5

    return {
      targetType,
      targetId: targetType,
      scores,
      overallScore,
      maxPossibleScore: 5,
      passed: overallScore >= config.scoreThreshold,
      threshold: config.scoreThreshold,
      analysis: parsed.overallAnalysis || '',
      conversationsEvaluated: records.map((r) => r.id),
      suggestedChanges: parsed.suggestions || [],
    };
  }

  /**
   * Analyze evaluation and generate prompt improvement
   */
  private async analyzeForPromptImprovement(
    evaluation: Omit<ReflectionEvaluation, 'id' | 'timestamp'>,
    currentPrompt: string,
    domain: PromptDomain
  ): Promise<PromptImprovementAnalysis> {
    const analysisPrompt = `Based on this evaluation, should the ${domain} system prompt be updated?

CURRENT PROMPT:
${currentPrompt}

EVALUATION RESULTS:
- Overall Score: ${evaluation.overallScore.toFixed(2)} / ${evaluation.maxPossibleScore}
- Passed: ${evaluation.passed}
- Analysis: ${evaluation.analysis}
- Suggested Changes: ${evaluation.suggestedChanges.join(', ')}

SCORE BREAKDOWN:
${evaluation.scores.map((s) => `- ${s.criterionName}: ${s.score}/${s.maxScore} - ${s.reasoning}`).join('\n')}

If changes are needed, provide an improved prompt. Make minimal, targeted changes.`;

    const response = await this.callAI('prompt_improver', analysisPrompt, PROMPT_IMPROVER_SYSTEM_PROMPT);
    const parsed = this.parseJSONResponse(response);

    return {
      shouldUpdate: parsed.shouldUpdate || false,
      confidence: parsed.confidence || 0,
      proposedPrompt: parsed.proposedPrompt || currentPrompt,
      reason: parsed.reason || 'No changes recommended',
      evidence: parsed.evidence || [],
    };
  }

  /**
   * Generate non-prompt suggestions for improvement
   */
  private async generateSuggestions(
    evaluation: Omit<ReflectionEvaluation, 'id' | 'timestamp'>,
    records: GenerationRecord[]
  ): Promise<Omit<AIImprovementSuggestion, 'id' | 'createdAt' | 'addressed' | 'hidden'>[]> {
    const suggestions: Omit<AIImprovementSuggestion, 'id' | 'createdAt' | 'addressed' | 'hidden'>[] = [];

    // Check for patterns in low scores
    const lowScores = evaluation.scores.filter((s) => s.score <= 2);
    lowScores.forEach((score) => {
      suggestions.push({
        category: score.criterionName.toLowerCase().includes('ux') ? 'ux' : 'widget',
        severity: 'medium',
        title: `Improve ${score.criterionName}`,
        description: score.reasoning,
        evidence: [score.reasoning],
        proposedAction: `Focus on improving ${score.criterionName} in future generations`,
      });
    });

    // Check for repeated failures
    const failures = records.filter((r) => r.result === 'failure');
    if (failures.length >= 3) {
      const errorPatterns = new Map<string, number>();
      failures.forEach((f) => {
        const key = f.errorMessage || 'unknown';
        errorPatterns.set(key, (errorPatterns.get(key) || 0) + 1);
      });

      errorPatterns.forEach((count, error) => {
        if (count >= 2) {
          suggestions.push({
            category: 'widget',
            severity: 'high',
            title: 'Repeated generation failures',
            description: `Error "${error}" occurred ${count} times`,
            evidence: failures.filter((f) => f.errorMessage === error).map((f) => f.id),
            proposedAction: 'Investigate root cause of repeated failures',
          });
        }
      });
    }

    // Check negative feedback patterns
    const negativeRecords = records.filter((r) => r.feedback && r.feedback.rating <= 2);
    if (negativeRecords.length >= 2) {
      const tags = negativeRecords.flatMap((r) => r.feedback?.tags || []);
      const tagCounts = new Map<string, number>();
      tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1));

      tagCounts.forEach((count, tag) => {
        if (count >= 2) {
          suggestions.push({
            category: 'ux',
            severity: 'medium',
            title: `User feedback: ${tag}`,
            description: `Users reported "${tag}" ${count} times`,
            evidence: negativeRecords.filter((r) => r.feedback?.tags?.includes(tag)).map((r) => r.id),
            proposedAction: `Address user concern: ${tag}`,
          });
        }
      });
    }

    return suggestions;
  }

  /**
   * Recommend new skills based on patterns
   */
  async recommendSkills(context: {
    recentEvaluations: ReflectionEvaluation[];
    commonIssues: string[];
    existingSkills: string[];
  }): Promise<SkillRecommendation[]> {
    const prompt = `Based on these patterns, recommend new Claude Code skills for StickerNest.

RECENT EVALUATION PATTERNS:
${context.recentEvaluations
  .map((e) => `- ${e.targetType}: Score ${e.overallScore.toFixed(2)}, Issues: ${e.suggestedChanges.join(', ')}`)
  .join('\n')}

COMMON ISSUES:
${context.commonIssues.join('\n')}

EXISTING SKILLS:
${context.existingSkills.join(', ')}

Recommend 1-3 new skills that would help address these patterns.`;

    const response = await this.callAI('skill_recommender', prompt, SKILL_RECOMMENDER_SYSTEM_PROMPT);
    const parsed = this.parseJSONResponse(response);

    return parsed.recommendations || [];
  }

  /**
   * Call AI provider
   */
  private async callAI(task: string, prompt: string, systemPrompt: string): Promise<string> {
    // Get provider for reflection tasks
    const provider = getProviderForTask('other' as TaskType);
    const modelConfig = provider.models['claude-sonnet'] || provider.models[Object.keys(provider.models)[0]];

    // In a real implementation, this would call the API
    // For now, we'll use a mock that returns a reasonable structure
    // This should be replaced with actual API call to Anthropic/OpenAI

    try {
      const response = await fetch('/api/ai/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          prompt,
          systemPrompt,
          model: modelConfig?.id || 'claude-3-5-sonnet-20241022',
        }),
      });

      if (!response.ok) {
        throw new Error(`AI call failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content || data.text || JSON.stringify(data);
    } catch (error) {
      // Fallback for development/testing
      console.warn('AI reflection call failed, using mock response:', error);
      return this.getMockResponse(task);
    }
  }

  /**
   * Parse JSON response from AI
   */
  private parseJSONResponse(response: string): any {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
      // Try direct parse
      return JSON.parse(response);
    } catch {
      // Return empty object if parsing fails
      return {};
    }
  }

  /**
   * Get mock response for development
   */
  private getMockResponse(task: string): string {
    if (task === 'reflection_judge') {
      return JSON.stringify({
        scores: [
          { criterionName: 'Protocol Compliance', score: 4, maxScore: 5, reasoning: 'Good protocol usage' },
          { criterionName: 'Code Quality', score: 4, maxScore: 5, reasoning: 'Clean code structure' },
          { criterionName: 'Functionality', score: 3, maxScore: 5, reasoning: 'Works but could be more robust' },
          { criterionName: 'Port Design', score: 4, maxScore: 5, reasoning: 'Clear port definitions' },
          { criterionName: 'User Experience', score: 3, maxScore: 5, reasoning: 'Functional but basic styling' },
        ],
        overallAnalysis: 'Generation quality is acceptable but has room for improvement',
        criticalIssues: [],
        suggestions: ['Consider adding error handling', 'Improve visual feedback'],
      });
    }

    if (task === 'prompt_improver') {
      return JSON.stringify({
        shouldUpdate: false,
        confidence: 0.5,
        proposedPrompt: '',
        reason: 'Current performance is acceptable, no immediate changes needed',
        evidence: ['Scores are above threshold', 'No critical issues identified'],
      });
    }

    if (task === 'skill_recommender') {
      return JSON.stringify({
        recommendations: [],
      });
    }

    return '{}';
  }

  /**
   * Convert target type to generation type
   */
  private targetTypeToGenerationType(targetType: ReflectionEvaluation['targetType']): GenerationType {
    switch (targetType) {
      case 'widget_generation':
        return 'widget';
      case 'image_generation':
        return 'image';
      case 'pipeline':
        return 'pipeline';
      case 'skill':
        return 'skill';
      default:
        return 'widget';
    }
  }

  /**
   * Convert target type to prompt domain
   */
  private targetTypeToPromptDomain(targetType: ReflectionEvaluation['targetType']): PromptDomain {
    switch (targetType) {
      case 'widget_generation':
        return 'widget_generation';
      case 'image_generation':
        return 'image_generation';
      case 'pipeline':
        return 'pipeline_suggestion';
      case 'skill':
        return 'skill_generator';
      default:
        return 'widget_generation';
    }
  }

  /**
   * Get rubric for target type
   */
  private getRubricForType(targetType: ReflectionEvaluation['targetType']): RubricCriteria[] {
    const store = useAIReflectionStore.getState();
    switch (targetType) {
      case 'widget_generation':
        return store.widgetRubric;
      case 'image_generation':
        return store.imageRubric;
      default:
        return store.widgetRubric;
    }
  }
}

// ==================
// Export singleton
// ==================

export const getAIReflectionService = () => AIReflectionService.getInstance();

// ==================
// Convenience functions
// ==================

/**
 * Run a reflection cycle for widget generation
 */
export async function reflectOnWidgetGeneration(options?: {
  forceRun?: boolean;
  recordsToEvaluate?: number;
}): Promise<ReflectionResult> {
  return getAIReflectionService().runReflection({
    targetType: 'widget_generation',
    ...options,
  });
}

/**
 * Run a reflection cycle for image generation
 */
export async function reflectOnImageGeneration(options?: {
  forceRun?: boolean;
  recordsToEvaluate?: number;
}): Promise<ReflectionResult> {
  return getAIReflectionService().runReflection({
    targetType: 'image_generation',
    ...options,
  });
}

/**
 * Get skill recommendations based on recent patterns
 */
export async function getSkillRecommendations(): Promise<SkillRecommendation[]> {
  const reflectionStore = useAIReflectionStore.getState();
  const recentEvaluations = reflectionStore.evaluations.slice(0, 10);
  const commonIssues = reflectionStore.getActiveSuggestions()
    .map((s) => s.title);

  // Get existing skills from .claude/skills directory
  // In practice, this would read from the filesystem
  const existingSkills = [
    'creating-widgets',
    'creating-components',
    'creating-zustand-stores',
    'connecting-widget-pipelines',
    'testing-widgets',
    'building-skills',
  ];

  return getAIReflectionService().recommendSkills({
    recentEvaluations,
    commonIssues,
    existingSkills,
  });
}
