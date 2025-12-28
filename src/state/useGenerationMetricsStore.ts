/**
 * StickerNest v2 - Generation Metrics Store (Zustand)
 * Tracks AI generation quality, user feedback, and success rates
 * Feeds data into the self-improvement reflection loop
 */

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';

// ==================
// Types
// ==================

/** Generation type */
export type GenerationType = 'widget' | 'image' | 'pipeline' | 'skill';

/** User feedback on a generation */
export interface GenerationFeedback {
  id: string;
  generationId: string;
  timestamp: string;
  rating: 1 | 2 | 3 | 4 | 5; // 1-5 star rating
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'rating' | 'comment';
  comment?: string;
  tags?: string[]; // e.g., ['too_verbose', 'wrong_style', 'perfect']
}

/** A single generation record */
export interface GenerationRecord {
  id: string;
  type: GenerationType;
  timestamp: string;
  promptVersionId: string;
  userPrompt: string;
  result: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  qualityScore?: number; // 0-100 from automated evaluation
  feedback?: GenerationFeedback;
  metadata: {
    model?: string;
    provider?: string;
    tokensUsed?: number;
    durationMs?: number;
    widgetId?: string;
    imageUrl?: string;
    pipelineId?: string;
  };
  evaluated: boolean;
  evaluatedAt?: string;
}

/** Aggregated metrics for a time period */
export interface PeriodMetrics {
  period: string; // ISO date or period identifier
  type: GenerationType;
  totalGenerations: number;
  successCount: number;
  failureCount: number;
  averageQualityScore: number;
  averageRating: number;
  feedbackCount: number;
  positiveCount: number; // thumbs up or rating >= 4
  negativeCount: number; // thumbs down or rating <= 2
}

/** Feedback tag with frequency */
export interface FeedbackTag {
  tag: string;
  count: number;
  lastUsed: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

// ==================
// Store State
// ==================

export interface GenerationMetricsState {
  /** All generation records */
  records: GenerationRecord[];
  /** Aggregated period metrics */
  periodMetrics: PeriodMetrics[];
  /** Common feedback tags */
  feedbackTags: FeedbackTag[];
  /** IDs of records not yet evaluated */
  unevaluatedIds: Set<string>;
  /** Current session stats */
  sessionStats: {
    startedAt: string;
    generationCount: number;
    successCount: number;
    feedbackCount: number;
  };
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

// ==================
// Store Actions
// ==================

export interface GenerationMetricsActions {
  // Record management
  addRecord: (record: Omit<GenerationRecord, 'id' | 'timestamp' | 'evaluated'>) => string;
  updateRecord: (id: string, updates: Partial<GenerationRecord>) => void;
  getRecord: (id: string) => GenerationRecord | undefined;
  getRecordsByType: (type: GenerationType, limit?: number) => GenerationRecord[];
  getUnevaluatedRecords: (type?: GenerationType) => GenerationRecord[];
  markEvaluated: (id: string) => void;
  markAllEvaluated: (type?: GenerationType) => void;

  // Feedback
  addFeedback: (
    generationId: string,
    feedbackType: GenerationFeedback['feedbackType'],
    rating?: GenerationFeedback['rating'],
    comment?: string,
    tags?: string[]
  ) => void;
  getFeedbackByGeneration: (generationId: string) => GenerationFeedback | undefined;

  // Metrics
  calculatePeriodMetrics: (type: GenerationType, periodDays: number) => PeriodMetrics;
  getSuccessRate: (type: GenerationType, lastN?: number) => number;
  getAverageRating: (type: GenerationType, lastN?: number) => number;
  getAverageQualityScore: (type: GenerationType, lastN?: number) => number;
  getTopFeedbackTags: (type: GenerationType, limit?: number) => FeedbackTag[];

  // Tags
  recordFeedbackTag: (tag: string, sentiment: FeedbackTag['sentiment']) => void;

  // Session
  resetSession: () => void;

  // Data export (for reflection loop)
  exportForReflection: (
    type: GenerationType,
    options?: {
      limit?: number;
      includeSuccessOnly?: boolean;
      includeFailuresOnly?: boolean;
      sinceTimestamp?: string;
    }
  ) => {
    records: GenerationRecord[];
    metrics: {
      total: number;
      successRate: number;
      averageQuality: number;
      averageRating: number;
      commonIssues: string[];
    };
  };

  // State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Cleanup
  pruneOldRecords: (olderThanDays: number) => number;
}

// ==================
// Initial State
// ==================

const initialState: GenerationMetricsState = {
  records: [],
  periodMetrics: [],
  feedbackTags: [],
  unevaluatedIds: new Set(),
  sessionStats: {
    startedAt: new Date().toISOString(),
    generationCount: 0,
    successCount: 0,
    feedbackCount: 0,
  },
  isLoading: false,
  error: null,
};

// ==================
// Store Creation
// ==================

export const useGenerationMetricsStore = create<GenerationMetricsState & GenerationMetricsActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Record management
        addRecord: (record) => {
          const id = crypto.randomUUID();
          const fullRecord: GenerationRecord = {
            ...record,
            id,
            timestamp: new Date().toISOString(),
            evaluated: false,
          };

          set(
            (state) => ({
              records: [fullRecord, ...state.records].slice(0, 1000), // Keep last 1000
              unevaluatedIds: new Set([id, ...state.unevaluatedIds]),
              sessionStats: {
                ...state.sessionStats,
                generationCount: state.sessionStats.generationCount + 1,
                successCount:
                  state.sessionStats.successCount + (record.result === 'success' ? 1 : 0),
              },
            }),
            false,
            'addRecord'
          );

          return id;
        },

        updateRecord: (id, updates) => {
          set(
            (state) => ({
              records: state.records.map((r) => (r.id === id ? { ...r, ...updates } : r)),
            }),
            false,
            'updateRecord'
          );
        },

        getRecord: (id) => {
          return get().records.find((r) => r.id === id);
        },

        getRecordsByType: (type, limit = 100) => {
          return get()
            .records.filter((r) => r.type === type)
            .slice(0, limit);
        },

        getUnevaluatedRecords: (type) => {
          const { records, unevaluatedIds } = get();
          return records.filter(
            (r) => unevaluatedIds.has(r.id) && (!type || r.type === type)
          );
        },

        markEvaluated: (id) => {
          set(
            (state) => {
              const newUnevaluated = new Set(state.unevaluatedIds);
              newUnevaluated.delete(id);
              return {
                unevaluatedIds: newUnevaluated,
                records: state.records.map((r) =>
                  r.id === id ? { ...r, evaluated: true, evaluatedAt: new Date().toISOString() } : r
                ),
              };
            },
            false,
            'markEvaluated'
          );
        },

        markAllEvaluated: (type) => {
          set(
            (state) => {
              const newRecords = state.records.map((r) => {
                if (state.unevaluatedIds.has(r.id) && (!type || r.type === type)) {
                  return { ...r, evaluated: true, evaluatedAt: new Date().toISOString() };
                }
                return r;
              });

              const newUnevaluated = type
                ? new Set([...state.unevaluatedIds].filter((id) => {
                    const record = state.records.find((r) => r.id === id);
                    return record && record.type !== type;
                  }))
                : new Set<string>();

              return {
                records: newRecords,
                unevaluatedIds: newUnevaluated,
              };
            },
            false,
            'markAllEvaluated'
          );
        },

        // Feedback
        addFeedback: (generationId, feedbackType, rating, comment, tags) => {
          const feedback: GenerationFeedback = {
            id: crypto.randomUUID(),
            generationId,
            timestamp: new Date().toISOString(),
            rating: rating || (feedbackType === 'thumbs_up' ? 5 : feedbackType === 'thumbs_down' ? 1 : 3),
            feedbackType,
            comment,
            tags,
          };

          // Record tags
          tags?.forEach((tag) => {
            const sentiment = rating && rating >= 4 ? 'positive' : rating && rating <= 2 ? 'negative' : 'neutral';
            get().recordFeedbackTag(tag, sentiment);
          });

          set(
            (state) => ({
              records: state.records.map((r) =>
                r.id === generationId ? { ...r, feedback } : r
              ),
              sessionStats: {
                ...state.sessionStats,
                feedbackCount: state.sessionStats.feedbackCount + 1,
              },
            }),
            false,
            'addFeedback'
          );
        },

        getFeedbackByGeneration: (generationId) => {
          return get().records.find((r) => r.id === generationId)?.feedback;
        },

        // Metrics
        calculatePeriodMetrics: (type, periodDays) => {
          const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
          const records = get().records.filter(
            (r) => r.type === type && new Date(r.timestamp) >= cutoff
          );

          const successCount = records.filter((r) => r.result === 'success').length;
          const recordsWithQuality = records.filter((r) => r.qualityScore !== undefined);
          const recordsWithFeedback = records.filter((r) => r.feedback);

          return {
            period: `last_${periodDays}_days`,
            type,
            totalGenerations: records.length,
            successCount,
            failureCount: records.filter((r) => r.result === 'failure').length,
            averageQualityScore:
              recordsWithQuality.length > 0
                ? recordsWithQuality.reduce((sum, r) => sum + (r.qualityScore || 0), 0) /
                  recordsWithQuality.length
                : 0,
            averageRating:
              recordsWithFeedback.length > 0
                ? recordsWithFeedback.reduce((sum, r) => sum + (r.feedback?.rating || 0), 0) /
                  recordsWithFeedback.length
                : 0,
            feedbackCount: recordsWithFeedback.length,
            positiveCount: recordsWithFeedback.filter(
              (r) => r.feedback?.rating && r.feedback.rating >= 4
            ).length,
            negativeCount: recordsWithFeedback.filter(
              (r) => r.feedback?.rating && r.feedback.rating <= 2
            ).length,
          };
        },

        getSuccessRate: (type, lastN = 100) => {
          const records = get().getRecordsByType(type, lastN);
          if (records.length === 0) return 0;
          const successCount = records.filter((r) => r.result === 'success').length;
          return (successCount / records.length) * 100;
        },

        getAverageRating: (type, lastN = 100) => {
          const records = get()
            .getRecordsByType(type, lastN)
            .filter((r) => r.feedback?.rating);
          if (records.length === 0) return 0;
          const totalRating = records.reduce((sum, r) => sum + (r.feedback?.rating || 0), 0);
          return totalRating / records.length;
        },

        getAverageQualityScore: (type, lastN = 100) => {
          const records = get()
            .getRecordsByType(type, lastN)
            .filter((r) => r.qualityScore !== undefined);
          if (records.length === 0) return 0;
          const totalScore = records.reduce((sum, r) => sum + (r.qualityScore || 0), 0);
          return totalScore / records.length;
        },

        getTopFeedbackTags: (type, limit = 10) => {
          const records = get().records.filter((r) => r.type === type && r.feedback?.tags);
          const tagCounts = new Map<string, number>();

          records.forEach((r) => {
            r.feedback?.tags?.forEach((tag) => {
              tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });
          });

          return get()
            .feedbackTags.filter((t) => tagCounts.has(t.tag))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
        },

        // Tags
        recordFeedbackTag: (tag, sentiment) => {
          set(
            (state) => {
              const existingIndex = state.feedbackTags.findIndex((t) => t.tag === tag);
              if (existingIndex >= 0) {
                const updated = [...state.feedbackTags];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  count: updated[existingIndex].count + 1,
                  lastUsed: new Date().toISOString(),
                };
                return { feedbackTags: updated };
              }
              return {
                feedbackTags: [
                  ...state.feedbackTags,
                  { tag, count: 1, lastUsed: new Date().toISOString(), sentiment },
                ],
              };
            },
            false,
            'recordFeedbackTag'
          );
        },

        // Session
        resetSession: () => {
          set(
            {
              sessionStats: {
                startedAt: new Date().toISOString(),
                generationCount: 0,
                successCount: 0,
                feedbackCount: 0,
              },
            },
            false,
            'resetSession'
          );
        },

        // Data export
        exportForReflection: (type, options = {}) => {
          const {
            limit = 50,
            includeSuccessOnly = false,
            includeFailuresOnly = false,
            sinceTimestamp,
          } = options;

          let records = get().records.filter((r) => r.type === type);

          if (sinceTimestamp) {
            records = records.filter((r) => r.timestamp >= sinceTimestamp);
          }

          if (includeSuccessOnly) {
            records = records.filter((r) => r.result === 'success');
          } else if (includeFailuresOnly) {
            records = records.filter((r) => r.result === 'failure');
          }

          records = records.slice(0, limit);

          // Find common issues from negative feedback
          const issues: string[] = [];
          records
            .filter((r) => r.feedback?.rating && r.feedback.rating <= 2)
            .forEach((r) => {
              if (r.feedback?.comment) issues.push(r.feedback.comment);
              r.feedback?.tags?.forEach((tag) => issues.push(tag));
            });

          // Deduplicate and count issues
          const issueCount = new Map<string, number>();
          issues.forEach((issue) => {
            issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
          });

          const commonIssues = [...issueCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([issue]) => issue);

          return {
            records,
            metrics: {
              total: records.length,
              successRate: get().getSuccessRate(type, limit),
              averageQuality: get().getAverageQualityScore(type, limit),
              averageRating: get().getAverageRating(type, limit),
              commonIssues,
            },
          };
        },

        // State
        setLoading: (isLoading) => {
          set({ isLoading }, false, 'setLoading');
        },

        setError: (error) => {
          set({ error }, false, 'setError');
        },

        reset: () => {
          set(initialState, false, 'reset');
        },

        // Cleanup
        pruneOldRecords: (olderThanDays) => {
          const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
          const { records } = get();
          const keptRecords = records.filter((r) => new Date(r.timestamp) >= cutoff);
          const prunedCount = records.length - keptRecords.length;

          set({ records: keptRecords }, false, 'pruneOldRecords');
          return prunedCount;
        },
      }),
      {
        name: 'generation-metrics-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          records: state.records.slice(0, 500), // Only persist last 500
          periodMetrics: state.periodMetrics,
          feedbackTags: state.feedbackTags,
          // Convert Set to Array for serialization
          unevaluatedIds: Array.from(state.unevaluatedIds),
        }),
        version: 1,
        // Rehydrate Set from Array
        onRehydrateStorage: () => (state) => {
          if (state && Array.isArray(state.unevaluatedIds)) {
            state.unevaluatedIds = new Set(state.unevaluatedIds as any);
          }
        },
      }
    ),
    {
      name: 'GenerationMetricsStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==================
// Selector Hooks
// ==================

export const useGenerationRecords = (type?: GenerationType) =>
  useGenerationMetricsStore((s) => (type ? s.records.filter((r) => r.type === type) : s.records));
export const useUnevaluatedRecords = (type?: GenerationType) =>
  useGenerationMetricsStore((s) => s.getUnevaluatedRecords(type));
export const useSessionStats = () => useGenerationMetricsStore((s) => s.sessionStats);
export const useFeedbackTags = () => useGenerationMetricsStore((s) => s.feedbackTags);
export const useGenerationMetricsLoading = () => useGenerationMetricsStore((s) => s.isLoading);
export const useGenerationMetricsError = () => useGenerationMetricsStore((s) => s.error);

// Computed selectors
export const useWidgetSuccessRate = () =>
  useGenerationMetricsStore((s) => s.getSuccessRate('widget'));
export const useImageSuccessRate = () =>
  useGenerationMetricsStore((s) => s.getSuccessRate('image'));
export const useWidgetAverageRating = () =>
  useGenerationMetricsStore((s) => s.getAverageRating('widget'));
export const useImageAverageRating = () =>
  useGenerationMetricsStore((s) => s.getAverageRating('image'));
