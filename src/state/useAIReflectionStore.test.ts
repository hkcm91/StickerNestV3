/**
 * StickerNest v2 - AI Reflection Store Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAIReflectionStore } from './useAIReflectionStore';

describe('useAIReflectionStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAIReflectionStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have default config', () => {
      const { config } = useAIReflectionStore.getState();

      expect(config.enabled).toBe(true);
      expect(config.intervalMinutes).toBe(60);
      expect(config.scoreThreshold).toBe(3.5);
      expect(config.cooldownMinutes).toBe(30);
      expect(config.autoApplyChanges).toBe(false);
    });

    it('should have empty evaluations initially', () => {
      const { evaluations } = useAIReflectionStore.getState();
      expect(evaluations).toHaveLength(0);
    });

    it('should have empty suggestions initially', () => {
      const { suggestions } = useAIReflectionStore.getState();
      expect(suggestions).toHaveLength(0);
    });

    it('should have default widget rubric', () => {
      const { widgetRubric } = useAIReflectionStore.getState();

      expect(widgetRubric).toHaveLength(5);
      expect(widgetRubric.map((r) => r.name)).toContain('Protocol Compliance');
      expect(widgetRubric.map((r) => r.name)).toContain('Code Quality');
    });
  });

  describe('Evaluation Management', () => {
    it('should add evaluation', () => {
      const { addEvaluation, evaluations } = useAIReflectionStore.getState();

      const id = addEvaluation({
        targetType: 'widget_generation',
        targetId: 'test',
        scores: [
          { criterionName: 'Test', score: 4, maxScore: 5, reasoning: 'Good' },
        ],
        overallScore: 4,
        maxPossibleScore: 5,
        passed: true,
        threshold: 3.5,
        analysis: 'Test analysis',
        conversationsEvaluated: ['conv1'],
        suggestedChanges: [],
      });

      expect(id).toBeDefined();
      expect(useAIReflectionStore.getState().evaluations).toHaveLength(1);
    });

    it('should get evaluation by ID', () => {
      const { addEvaluation, getEvaluation } = useAIReflectionStore.getState();

      const id = addEvaluation({
        targetType: 'widget_generation',
        targetId: 'test',
        scores: [],
        overallScore: 4,
        maxPossibleScore: 5,
        passed: true,
        threshold: 3.5,
        analysis: '',
        conversationsEvaluated: [],
        suggestedChanges: [],
      });

      const evaluation = getEvaluation(id);
      expect(evaluation).toBeDefined();
      expect(evaluation?.id).toBe(id);
    });

    it('should filter evaluations by target type', () => {
      const { addEvaluation, getEvaluationsByTarget } = useAIReflectionStore.getState();

      addEvaluation({
        targetType: 'widget_generation',
        targetId: 'widget1',
        scores: [],
        overallScore: 4,
        maxPossibleScore: 5,
        passed: true,
        threshold: 3.5,
        analysis: '',
        conversationsEvaluated: [],
        suggestedChanges: [],
      });

      addEvaluation({
        targetType: 'image_generation',
        targetId: 'image1',
        scores: [],
        overallScore: 3,
        maxPossibleScore: 5,
        passed: false,
        threshold: 3.5,
        analysis: '',
        conversationsEvaluated: [],
        suggestedChanges: [],
      });

      const widgetEvals = getEvaluationsByTarget('widget_generation');
      const imageEvals = getEvaluationsByTarget('image_generation');

      expect(widgetEvals).toHaveLength(1);
      expect(imageEvals).toHaveLength(1);
    });

    it('should limit stored evaluations to 100', () => {
      const { addEvaluation } = useAIReflectionStore.getState();

      // Add 110 evaluations
      for (let i = 0; i < 110; i++) {
        addEvaluation({
          targetType: 'widget_generation',
          targetId: `test-${i}`,
          scores: [],
          overallScore: 4,
          maxPossibleScore: 5,
          passed: true,
          threshold: 3.5,
          analysis: '',
          conversationsEvaluated: [],
          suggestedChanges: [],
        });
      }

      expect(useAIReflectionStore.getState().evaluations.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Suggestion Management', () => {
    it('should add suggestion', () => {
      const { addSuggestion } = useAIReflectionStore.getState();

      const id = addSuggestion({
        category: 'prompt',
        severity: 'medium',
        title: 'Test Suggestion',
        description: 'Description',
        evidence: ['ev1'],
        proposedAction: 'Action',
      });

      expect(id).toBeDefined();
      expect(useAIReflectionStore.getState().suggestions).toHaveLength(1);
    });

    it('should mark suggestion as addressed', () => {
      const { addSuggestion, markSuggestionAddressed, suggestions } =
        useAIReflectionStore.getState();

      const id = addSuggestion({
        category: 'prompt',
        severity: 'high',
        title: 'Test',
        description: '',
        evidence: [],
        proposedAction: '',
      });

      markSuggestionAddressed(id);

      const updated = useAIReflectionStore.getState().suggestions.find((s) => s.id === id);
      expect(updated?.addressed).toBe(true);
      expect(updated?.addressedAt).toBeDefined();
    });

    it('should hide suggestion', () => {
      const { addSuggestion, hideSuggestion } = useAIReflectionStore.getState();

      const id = addSuggestion({
        category: 'widget',
        severity: 'low',
        title: 'Test',
        description: '',
        evidence: [],
        proposedAction: '',
      });

      hideSuggestion(id);

      const updated = useAIReflectionStore.getState().suggestions.find((s) => s.id === id);
      expect(updated?.hidden).toBe(true);
    });

    it('should get active suggestions (not addressed, not hidden)', () => {
      const { addSuggestion, markSuggestionAddressed, hideSuggestion, getActiveSuggestions } =
        useAIReflectionStore.getState();

      const id1 = addSuggestion({
        category: 'prompt',
        severity: 'high',
        title: 'Active',
        description: '',
        evidence: [],
        proposedAction: '',
      });

      const id2 = addSuggestion({
        category: 'prompt',
        severity: 'medium',
        title: 'Addressed',
        description: '',
        evidence: [],
        proposedAction: '',
      });

      const id3 = addSuggestion({
        category: 'prompt',
        severity: 'low',
        title: 'Hidden',
        description: '',
        evidence: [],
        proposedAction: '',
      });

      markSuggestionAddressed(id2);
      hideSuggestion(id3);

      const active = getActiveSuggestions();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(id1);
    });
  });

  describe('Run Management', () => {
    it('should start and complete a run', () => {
      const { startRun, completeRun, runs, currentRunId } = useAIReflectionStore.getState();

      const runId = startRun('manual');
      expect(useAIReflectionStore.getState().currentRunId).toBe(runId);
      expect(useAIReflectionStore.getState().runs[0].status).toBe('running');

      completeRun(runId, 'eval-123');

      const completedRun = useAIReflectionStore.getState().runs.find((r) => r.id === runId);
      expect(completedRun?.status).toBe('completed');
      expect(completedRun?.evaluationId).toBe('eval-123');
      expect(useAIReflectionStore.getState().currentRunId).toBeNull();
    });

    it('should fail a run', () => {
      const { startRun, failRun } = useAIReflectionStore.getState();

      const runId = startRun('scheduled');
      failRun(runId, 'Test error');

      const failedRun = useAIReflectionStore.getState().runs.find((r) => r.id === runId);
      expect(failedRun?.status).toBe('failed');
      expect(failedRun?.error).toBe('Test error');
    });
  });

  describe('Cooldown Management', () => {
    it('should set and check cooldown', () => {
      const { setCooldown, isInCooldown, clearCooldown } = useAIReflectionStore.getState();

      setCooldown(30);
      expect(isInCooldown()).toBe(true);

      clearCooldown();
      expect(isInCooldown()).toBe(false);
    });
  });

  describe('Config Management', () => {
    it('should update config', () => {
      const { updateConfig } = useAIReflectionStore.getState();

      updateConfig({
        intervalMinutes: 120,
        scoreThreshold: 4.0,
        autoApplyChanges: true,
      });

      const { config } = useAIReflectionStore.getState();
      expect(config.intervalMinutes).toBe(120);
      expect(config.scoreThreshold).toBe(4.0);
      expect(config.autoApplyChanges).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should calculate stats correctly', () => {
      const { addEvaluation, addSuggestion, getStats } = useAIReflectionStore.getState();

      // Add 4 evaluations: 3 passed, 1 failed
      addEvaluation({
        targetType: 'widget_generation',
        targetId: '1',
        scores: [],
        overallScore: 4.5,
        maxPossibleScore: 5,
        passed: true,
        threshold: 3.5,
        analysis: '',
        conversationsEvaluated: [],
        suggestedChanges: [],
      });

      addEvaluation({
        targetType: 'widget_generation',
        targetId: '2',
        scores: [],
        overallScore: 4.0,
        maxPossibleScore: 5,
        passed: true,
        threshold: 3.5,
        analysis: '',
        conversationsEvaluated: [],
        suggestedChanges: [],
      });

      addEvaluation({
        targetType: 'widget_generation',
        targetId: '3',
        scores: [],
        overallScore: 3.5,
        maxPossibleScore: 5,
        passed: true,
        threshold: 3.5,
        analysis: '',
        conversationsEvaluated: [],
        suggestedChanges: [],
      });

      addEvaluation({
        targetType: 'widget_generation',
        targetId: '4',
        scores: [],
        overallScore: 2.5,
        maxPossibleScore: 5,
        passed: false,
        threshold: 3.5,
        analysis: '',
        conversationsEvaluated: [],
        suggestedChanges: [],
      });

      // Add 2 active suggestions
      addSuggestion({
        category: 'prompt',
        severity: 'high',
        title: 'Suggestion 1',
        description: '',
        evidence: [],
        proposedAction: '',
      });

      addSuggestion({
        category: 'widget',
        severity: 'medium',
        title: 'Suggestion 2',
        description: '',
        evidence: [],
        proposedAction: '',
      });

      const stats = getStats();

      expect(stats.totalEvaluations).toBe(4);
      expect(stats.passRate).toBe(75); // 3/4 * 100
      expect(stats.averageScore).toBe(3.625); // (4.5 + 4.0 + 3.5 + 2.5) / 4
      expect(stats.activeSuggestions).toBe(2);
    });
  });
});
