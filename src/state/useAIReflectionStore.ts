/**
 * StickerNest v2 - AI Reflection Store (Zustand)
 * Manages self-improving AI reflection logs, evaluations, and suggestions
 * This is the core store for the AI self-improvement loop
 */

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';

// ==================
// Types
// ==================

/** Evaluation rubric criteria */
export interface RubricCriteria {
  name: string;
  description: string;
  weight: number; // 0-1, all weights should sum to 1
  minScore: number;
  maxScore: number;
}

/** Individual criterion score */
export interface CriterionScore {
  criterionName: string;
  score: number;
  maxScore: number;
  reasoning: string;
}

/** Reflection evaluation result */
export interface ReflectionEvaluation {
  id: string;
  timestamp: string;
  targetType: 'widget_generation' | 'image_generation' | 'pipeline' | 'skill';
  targetId: string;
  scores: CriterionScore[];
  overallScore: number;
  maxPossibleScore: number;
  passed: boolean;
  threshold: number;
  analysis: string;
  conversationsEvaluated: string[];
  suggestedChanges: string[];
}

/** AI suggestion for improvement */
export interface AIImprovementSuggestion {
  id: string;
  createdAt: string;
  category: 'prompt' | 'widget' | 'pipeline' | 'skill' | 'ux';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  evidence: string[];
  proposedAction: string;
  addressed: boolean;
  addressedAt?: string;
  hidden: boolean;
}

/** Reflection loop configuration */
export interface ReflectionConfig {
  enabled: boolean;
  intervalMinutes: number;
  evaluateUnevaluatedOnly: boolean;
  messagesToEvaluate: number;
  scoreThreshold: number;
  cooldownMinutes: number;
  autoApplyChanges: boolean;
}

/** Reflection run status */
export interface ReflectionRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  evaluationId?: string;
  error?: string;
  triggeredBy: 'scheduled' | 'manual' | 'event';
}

// ==================
// Store State
// ==================

export interface AIReflectionState {
  /** All reflection evaluations */
  evaluations: ReflectionEvaluation[];
  /** Improvement suggestions */
  suggestions: AIImprovementSuggestion[];
  /** Reflection loop configuration */
  config: ReflectionConfig;
  /** Reflection run history */
  runs: ReflectionRun[];
  /** Currently running reflection */
  currentRunId: string | null;
  /** Last reflection timestamp */
  lastReflectionAt: string | null;
  /** Cooldown until (prevents too frequent updates) */
  cooldownUntil: string | null;
  /** Default rubric for widget generation */
  widgetRubric: RubricCriteria[];
  /** Default rubric for image generation */
  imageRubric: RubricCriteria[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

// ==================
// Store Actions
// ==================

export interface AIReflectionActions {
  // Evaluation actions
  addEvaluation: (evaluation: Omit<ReflectionEvaluation, 'id' | 'timestamp'>) => string;
  getEvaluation: (id: string) => ReflectionEvaluation | undefined;
  getEvaluationsByTarget: (targetType: string, targetId?: string) => ReflectionEvaluation[];
  getLatestEvaluation: (targetType: string) => ReflectionEvaluation | undefined;

  // Suggestion actions
  addSuggestion: (suggestion: Omit<AIImprovementSuggestion, 'id' | 'createdAt' | 'addressed' | 'hidden'>) => string;
  markSuggestionAddressed: (id: string) => void;
  hideSuggestion: (id: string) => void;
  getActiveSuggestions: () => AIImprovementSuggestion[];
  getSuggestionsByCategory: (category: AIImprovementSuggestion['category']) => AIImprovementSuggestion[];

  // Run actions
  startRun: (triggeredBy: ReflectionRun['triggeredBy']) => string;
  completeRun: (runId: string, evaluationId?: string) => void;
  failRun: (runId: string, error: string) => void;
  skipRun: (runId: string) => void;

  // Config actions
  updateConfig: (updates: Partial<ReflectionConfig>) => void;
  setCooldown: (minutes: number) => void;
  clearCooldown: () => void;
  isInCooldown: () => boolean;

  // Rubric actions
  setWidgetRubric: (rubric: RubricCriteria[]) => void;
  setImageRubric: (rubric: RubricCriteria[]) => void;

  // State actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Stats
  getStats: () => {
    totalEvaluations: number;
    passRate: number;
    averageScore: number;
    activeSuggestions: number;
    totalRuns: number;
    lastReflection: string | null;
  };
}

// ==================
// Default Rubrics
// ==================

const defaultWidgetRubric: RubricCriteria[] = [
  {
    name: 'Protocol Compliance',
    description: 'Widget follows Protocol v3.0 correctly (READY signal, postMessage)',
    weight: 0.25,
    minScore: 1,
    maxScore: 5,
  },
  {
    name: 'Code Quality',
    description: 'Clean, readable code without errors or anti-patterns',
    weight: 0.20,
    minScore: 1,
    maxScore: 5,
  },
  {
    name: 'Functionality',
    description: 'Widget performs intended function correctly',
    weight: 0.25,
    minScore: 1,
    maxScore: 5,
  },
  {
    name: 'Port Design',
    description: 'Appropriate inputs/outputs with clear types and names',
    weight: 0.15,
    minScore: 1,
    maxScore: 5,
  },
  {
    name: 'User Experience',
    description: 'Good visual design, responsive, intuitive interaction',
    weight: 0.15,
    minScore: 1,
    maxScore: 5,
  },
];

const defaultImageRubric: RubricCriteria[] = [
  {
    name: 'Prompt Accuracy',
    description: 'Generated image matches the prompt intent',
    weight: 0.30,
    minScore: 1,
    maxScore: 5,
  },
  {
    name: 'Visual Quality',
    description: 'Image is clear, well-composed, no artifacts',
    weight: 0.25,
    minScore: 1,
    maxScore: 5,
  },
  {
    name: 'Style Consistency',
    description: 'Matches requested style and aesthetic',
    weight: 0.20,
    minScore: 1,
    maxScore: 5,
  },
  {
    name: 'Usability',
    description: 'Image is suitable for sticker/design use',
    weight: 0.25,
    minScore: 1,
    maxScore: 5,
  },
];

// ==================
// Initial State
// ==================

const initialState: AIReflectionState = {
  evaluations: [],
  suggestions: [],
  config: {
    enabled: true,
    intervalMinutes: 60,
    evaluateUnevaluatedOnly: true,
    messagesToEvaluate: 20,
    scoreThreshold: 3.5,
    cooldownMinutes: 30,
    autoApplyChanges: false,
  },
  runs: [],
  currentRunId: null,
  lastReflectionAt: null,
  cooldownUntil: null,
  widgetRubric: defaultWidgetRubric,
  imageRubric: defaultImageRubric,
  isLoading: false,
  error: null,
};

// ==================
// Store Creation
// ==================

export const useAIReflectionStore = create<AIReflectionState & AIReflectionActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Evaluation actions
        addEvaluation: (evaluation) => {
          const id = crypto.randomUUID();
          const fullEvaluation: ReflectionEvaluation = {
            ...evaluation,
            id,
            timestamp: new Date().toISOString(),
          };
          set(
            (state) => ({
              evaluations: [fullEvaluation, ...state.evaluations].slice(0, 100), // Keep last 100
              lastReflectionAt: fullEvaluation.timestamp,
            }),
            false,
            'addEvaluation'
          );
          return id;
        },

        getEvaluation: (id) => {
          return get().evaluations.find((e) => e.id === id);
        },

        getEvaluationsByTarget: (targetType, targetId) => {
          return get().evaluations.filter(
            (e) => e.targetType === targetType && (!targetId || e.targetId === targetId)
          );
        },

        getLatestEvaluation: (targetType) => {
          return get().evaluations.find((e) => e.targetType === targetType);
        },

        // Suggestion actions
        addSuggestion: (suggestion) => {
          const id = crypto.randomUUID();
          const fullSuggestion: AIImprovementSuggestion = {
            ...suggestion,
            id,
            createdAt: new Date().toISOString(),
            addressed: false,
            hidden: false,
          };
          set(
            (state) => ({
              suggestions: [fullSuggestion, ...state.suggestions],
            }),
            false,
            'addSuggestion'
          );
          return id;
        },

        markSuggestionAddressed: (id) => {
          set(
            (state) => ({
              suggestions: state.suggestions.map((s) =>
                s.id === id ? { ...s, addressed: true, addressedAt: new Date().toISOString() } : s
              ),
            }),
            false,
            'markSuggestionAddressed'
          );
        },

        hideSuggestion: (id) => {
          set(
            (state) => ({
              suggestions: state.suggestions.map((s) =>
                s.id === id ? { ...s, hidden: true } : s
              ),
            }),
            false,
            'hideSuggestion'
          );
        },

        getActiveSuggestions: () => {
          return get().suggestions.filter((s) => !s.addressed && !s.hidden);
        },

        getSuggestionsByCategory: (category) => {
          return get().suggestions.filter((s) => s.category === category && !s.hidden);
        },

        // Run actions
        startRun: (triggeredBy) => {
          const id = crypto.randomUUID();
          const run: ReflectionRun = {
            id,
            startedAt: new Date().toISOString(),
            status: 'running',
            triggeredBy,
          };
          set(
            (state) => ({
              runs: [run, ...state.runs].slice(0, 50), // Keep last 50 runs
              currentRunId: id,
            }),
            false,
            'startRun'
          );
          return id;
        },

        completeRun: (runId, evaluationId) => {
          set(
            (state) => ({
              runs: state.runs.map((r) =>
                r.id === runId
                  ? { ...r, status: 'completed' as const, completedAt: new Date().toISOString(), evaluationId }
                  : r
              ),
              currentRunId: state.currentRunId === runId ? null : state.currentRunId,
            }),
            false,
            'completeRun'
          );
        },

        failRun: (runId, error) => {
          set(
            (state) => ({
              runs: state.runs.map((r) =>
                r.id === runId
                  ? { ...r, status: 'failed' as const, completedAt: new Date().toISOString(), error }
                  : r
              ),
              currentRunId: state.currentRunId === runId ? null : state.currentRunId,
              error,
            }),
            false,
            'failRun'
          );
        },

        skipRun: (runId) => {
          set(
            (state) => ({
              runs: state.runs.map((r) =>
                r.id === runId
                  ? { ...r, status: 'skipped' as const, completedAt: new Date().toISOString() }
                  : r
              ),
              currentRunId: state.currentRunId === runId ? null : state.currentRunId,
            }),
            false,
            'skipRun'
          );
        },

        // Config actions
        updateConfig: (updates) => {
          set(
            (state) => ({
              config: { ...state.config, ...updates },
            }),
            false,
            'updateConfig'
          );
        },

        setCooldown: (minutes) => {
          const cooldownUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
          set({ cooldownUntil }, false, 'setCooldown');
        },

        clearCooldown: () => {
          set({ cooldownUntil: null }, false, 'clearCooldown');
        },

        isInCooldown: () => {
          const { cooldownUntil } = get();
          if (!cooldownUntil) return false;
          return new Date(cooldownUntil) > new Date();
        },

        // Rubric actions
        setWidgetRubric: (rubric) => {
          set({ widgetRubric: rubric }, false, 'setWidgetRubric');
        },

        setImageRubric: (rubric) => {
          set({ imageRubric: rubric }, false, 'setImageRubric');
        },

        // State actions
        setLoading: (isLoading) => {
          set({ isLoading }, false, 'setLoading');
        },

        setError: (error) => {
          set({ error }, false, 'setError');
        },

        reset: () => {
          set(initialState, false, 'reset');
        },

        // Stats
        getStats: () => {
          const state = get();
          const passedEvals = state.evaluations.filter((e) => e.passed);
          const totalScore = state.evaluations.reduce((sum, e) => sum + e.overallScore, 0);

          return {
            totalEvaluations: state.evaluations.length,
            passRate: state.evaluations.length > 0
              ? (passedEvals.length / state.evaluations.length) * 100
              : 0,
            averageScore: state.evaluations.length > 0
              ? totalScore / state.evaluations.length
              : 0,
            activeSuggestions: state.suggestions.filter((s) => !s.addressed && !s.hidden).length,
            totalRuns: state.runs.length,
            lastReflection: state.lastReflectionAt,
          };
        },
      }),
      {
        name: 'ai-reflection-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          evaluations: state.evaluations.slice(0, 50), // Only persist last 50
          suggestions: state.suggestions.filter((s) => !s.hidden).slice(0, 100),
          config: state.config,
          runs: state.runs.slice(0, 20),
          lastReflectionAt: state.lastReflectionAt,
          widgetRubric: state.widgetRubric,
          imageRubric: state.imageRubric,
        }),
        version: 1,
      }
    ),
    {
      name: 'AIReflectionStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==================
// Selector Hooks
// ==================

export const useReflectionEvaluations = () => useAIReflectionStore((s) => s.evaluations);
export const useReflectionSuggestions = () => useAIReflectionStore((s) => s.suggestions);
export const useReflectionConfig = () => useAIReflectionStore((s) => s.config);
export const useReflectionRuns = () => useAIReflectionStore((s) => s.runs);
export const useCurrentRunId = () => useAIReflectionStore((s) => s.currentRunId);
export const useIsReflecting = () => useAIReflectionStore((s) => s.currentRunId !== null);
export const useReflectionLoading = () => useAIReflectionStore((s) => s.isLoading);
export const useReflectionError = () => useAIReflectionStore((s) => s.error);
export const useWidgetRubric = () => useAIReflectionStore((s) => s.widgetRubric);
export const useImageRubric = () => useAIReflectionStore((s) => s.imageRubric);
