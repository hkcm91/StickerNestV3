/**
 * StickerNest v2 - Self-Improving Pipeline Integration
 * Connects the self-improving AI system to the widget pipeline runtime
 *
 * This module:
 * 1. Broadcasts stats updates to dashboard widgets
 * 2. Listens for reflection triggers from widgets
 * 3. Integrates with the EventBus for real-time updates
 * 4. Schedules automatic reflection cycles
 */

import { EventBus } from './EventBus';
import { useAIReflectionStore } from '../state/useAIReflectionStore';
import { usePromptVersionStore } from '../state/usePromptVersionStore';
import { useGenerationMetricsStore } from '../state/useGenerationMetricsStore';
import {
  reflectOnWidgetGeneration,
  reflectOnImageGeneration,
  type ReflectionResult,
} from '../ai/AIReflectionService';
import { analyzeSkillGaps } from '../ai/SkillRecommendationService';

// ==================
// Types
// ==================

export interface StatsPayload {
  stats: {
    passRate: number;
    averageScore: number;
    totalEvaluations: number;
    activeSuggestions: number;
    lastReflection: string | null;
  };
  evaluations: Array<{
    id: string;
    type: string;
    passed: boolean;
    score: number;
    timestamp: string;
  }>;
  suggestions: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
  }>;
}

export interface ReflectionTriggerPayload {
  forceRun?: boolean;
  targetType?: 'widget' | 'image' | 'all';
}

// ==================
// Event Names
// ==================

const EVENTS = {
  // Outgoing (to widgets)
  STATS_UPDATE: 'self-improving:stats:update',
  EVALUATION_RESULT: 'self-improving:evaluation:result',
  REFLECTION_STARTED: 'self-improving:reflection:started',
  REFLECTION_COMPLETED: 'self-improving:reflection:completed',
  SKILL_GAP_DETECTED: 'self-improving:skill-gap:detected',

  // Incoming (from widgets)
  REQUEST_STATS: 'request:stats',
  REQUEST_REFLECT: 'request:reflect',
};

// ==================
// Integration Service
// ==================

class SelfImprovingPipelineIntegration {
  private static instance: SelfImprovingPipelineIntegration;
  private eventBus: EventBus | null = null;
  private scheduledInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SelfImprovingPipelineIntegration {
    if (!SelfImprovingPipelineIntegration.instance) {
      SelfImprovingPipelineIntegration.instance = new SelfImprovingPipelineIntegration();
    }
    return SelfImprovingPipelineIntegration.instance;
  }

  /**
   * Initialize the integration with the EventBus
   */
  initialize(eventBus: EventBus): void {
    if (this.isInitialized) {
      console.warn('SelfImprovingPipelineIntegration already initialized');
      return;
    }

    this.eventBus = eventBus;
    this.setupEventListeners();
    this.startScheduledReflections();
    this.isInitialized = true;

    console.log('[Self-Improving] Pipeline integration initialized');
  }

  /**
   * Cleanup and stop the integration
   */
  destroy(): void {
    this.stopScheduledReflections();
    this.removeEventListeners();
    this.isInitialized = false;
    console.log('[Self-Improving] Pipeline integration destroyed');
  }

  /**
   * Setup event listeners for incoming widget requests
   */
  private setupEventListeners(): void {
    if (!this.eventBus) return;

    // Listen for stats requests
    this.eventBus.on(EVENTS.REQUEST_STATS, () => {
      this.broadcastStats();
    });

    // Listen for reflection requests
    this.eventBus.on(EVENTS.REQUEST_REFLECT, async (payload: ReflectionTriggerPayload) => {
      await this.handleReflectionRequest(payload);
    });

    // Subscribe to store changes for real-time updates
    useAIReflectionStore.subscribe(
      (state) => state.evaluations,
      (evaluations) => {
        if (evaluations.length > 0) {
          this.broadcastLatestEvaluation();
        }
      }
    );

    useAIReflectionStore.subscribe(
      (state) => state.currentRunId,
      (runId) => {
        if (runId) {
          this.broadcastReflectionStarted();
        }
      }
    );
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (!this.eventBus) return;
    this.eventBus.off(EVENTS.REQUEST_STATS);
    this.eventBus.off(EVENTS.REQUEST_REFLECT);
  }

  /**
   * Start scheduled reflection cycles
   */
  private startScheduledReflections(): void {
    const config = useAIReflectionStore.getState().config;

    if (!config.enabled) {
      console.log('[Self-Improving] Scheduled reflections disabled');
      return;
    }

    // Clear any existing interval
    this.stopScheduledReflections();

    // Schedule reflections
    this.scheduledInterval = setInterval(async () => {
      const currentConfig = useAIReflectionStore.getState().config;
      if (!currentConfig.enabled) return;

      console.log('[Self-Improving] Running scheduled reflection');
      await this.runFullReflectionCycle();
    }, config.intervalMinutes * 60 * 1000);

    console.log(`[Self-Improving] Scheduled reflections every ${config.intervalMinutes} minutes`);
  }

  /**
   * Stop scheduled reflection cycles
   */
  private stopScheduledReflections(): void {
    if (this.scheduledInterval) {
      clearInterval(this.scheduledInterval);
      this.scheduledInterval = null;
    }
  }

  /**
   * Handle reflection request from widget
   */
  private async handleReflectionRequest(payload: ReflectionTriggerPayload): Promise<void> {
    const { forceRun = true, targetType = 'all' } = payload;

    this.broadcastReflectionStarted();

    try {
      const results: ReflectionResult[] = [];

      if (targetType === 'widget' || targetType === 'all') {
        const widgetResult = await reflectOnWidgetGeneration({ forceRun });
        results.push(widgetResult);
      }

      if (targetType === 'image' || targetType === 'all') {
        const imageResult = await reflectOnImageGeneration({ forceRun });
        results.push(imageResult);
      }

      // Broadcast completion
      this.broadcastReflectionCompleted(results);

      // Check for skill gaps after reflection
      this.checkForSkillGaps();

      // Update stats
      this.broadcastStats();
    } catch (error) {
      console.error('[Self-Improving] Reflection failed:', error);
      this.eventBus?.emit(EVENTS.REFLECTION_COMPLETED, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Run a full reflection cycle
   */
  async runFullReflectionCycle(): Promise<void> {
    await this.handleReflectionRequest({ forceRun: false, targetType: 'all' });
  }

  /**
   * Broadcast current stats to all listening widgets
   */
  broadcastStats(): void {
    if (!this.eventBus) return;

    const reflectionStore = useAIReflectionStore.getState();
    const stats = reflectionStore.getStats();
    const evaluations = reflectionStore.evaluations.slice(0, 5);
    const suggestions = reflectionStore.getActiveSuggestions().slice(0, 5);

    const payload: StatsPayload = {
      stats: {
        passRate: stats.passRate,
        averageScore: stats.averageScore,
        totalEvaluations: stats.totalEvaluations,
        activeSuggestions: stats.activeSuggestions,
        lastReflection: stats.lastReflection,
      },
      evaluations: evaluations.map((e) => ({
        id: e.id,
        type: e.targetType,
        passed: e.passed,
        score: e.overallScore,
        timestamp: e.timestamp,
      })),
      suggestions: suggestions.map((s) => ({
        id: s.id,
        severity: s.severity,
        title: s.title,
        description: s.description,
      })),
    };

    this.eventBus.emit(EVENTS.STATS_UPDATE, payload);
  }

  /**
   * Broadcast latest evaluation result
   */
  private broadcastLatestEvaluation(): void {
    if (!this.eventBus) return;

    const evaluation = useAIReflectionStore.getState().evaluations[0];
    if (!evaluation) return;

    this.eventBus.emit(EVENTS.EVALUATION_RESULT, {
      id: evaluation.id,
      type: evaluation.targetType,
      passed: evaluation.passed,
      score: evaluation.overallScore,
      timestamp: evaluation.timestamp,
      analysis: evaluation.analysis,
    });
  }

  /**
   * Broadcast reflection started
   */
  private broadcastReflectionStarted(): void {
    if (!this.eventBus) return;

    this.eventBus.emit(EVENTS.REFLECTION_STARTED, {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast reflection completed
   */
  private broadcastReflectionCompleted(results: ReflectionResult[]): void {
    if (!this.eventBus) return;

    const hasChanges = results.some((r) => r.promptChanged);
    const allPassed = results.every((r) => r.evaluation?.passed ?? true);
    const totalSuggestions = results.reduce((sum, r) => sum + r.suggestions.length, 0);

    this.eventBus.emit(EVENTS.REFLECTION_COMPLETED, {
      success: true,
      timestamp: new Date().toISOString(),
      promptChanged: hasChanges,
      allPassed,
      newSuggestions: totalSuggestions,
      results: results.map((r) => ({
        runId: r.runId,
        passed: r.evaluation?.passed,
        score: r.evaluation?.overallScore,
        promptChanged: r.promptChanged,
      })),
    });
  }

  /**
   * Check for skill gaps and broadcast if found
   */
  private checkForSkillGaps(): void {
    if (!this.eventBus) return;

    const gaps = analyzeSkillGaps();
    const highPriorityGaps = gaps.filter(
      (g) => g.priority === 'critical' || g.priority === 'high'
    );

    if (highPriorityGaps.length > 0) {
      this.eventBus.emit(EVENTS.SKILL_GAP_DETECTED, {
        gaps: highPriorityGaps.map((g) => ({
          name: g.name,
          description: g.description,
          priority: g.priority,
        })),
      });
    }
  }

  /**
   * Manually trigger a reflection
   */
  async triggerReflection(options?: ReflectionTriggerPayload): Promise<void> {
    await this.handleReflectionRequest(options || { forceRun: true });
  }

  /**
   * Get current integration status
   */
  getStatus(): {
    initialized: boolean;
    schedulerRunning: boolean;
    reflectionEnabled: boolean;
  } {
    const config = useAIReflectionStore.getState().config;

    return {
      initialized: this.isInitialized,
      schedulerRunning: this.scheduledInterval !== null,
      reflectionEnabled: config.enabled,
    };
  }
}

// ==================
// Export
// ==================

export const getSelfImprovingIntegration = () => SelfImprovingPipelineIntegration.getInstance();

/**
 * Initialize self-improving pipeline integration
 */
export function initializeSelfImproving(eventBus: EventBus): void {
  getSelfImprovingIntegration().initialize(eventBus);
}

/**
 * Destroy self-improving pipeline integration
 */
export function destroySelfImproving(): void {
  getSelfImprovingIntegration().destroy();
}

/**
 * Manually trigger a reflection cycle
 */
export async function triggerReflectionCycle(options?: ReflectionTriggerPayload): Promise<void> {
  await getSelfImprovingIntegration().triggerReflection(options);
}

/**
 * Broadcast current stats to all widgets
 */
export function broadcastSelfImprovingStats(): void {
  getSelfImprovingIntegration().broadcastStats();
}
