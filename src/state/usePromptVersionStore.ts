/**
 * StickerNest v2 - Prompt Version Store (Zustand)
 * Version control for AI system prompts with rollback capability
 * Tracks prompt evolution through the self-improvement loop
 */

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';

// ==================
// Types
// ==================

/** Prompt domain types */
export type PromptDomain =
  | 'widget_generation'
  | 'image_generation'
  | 'pipeline_suggestion'
  | 'reflection_judge'
  | 'skill_generator'
  | 'connection_analyzer';

/** A single prompt version */
export interface PromptVersion {
  id: string;
  domain: PromptDomain;
  version: number;
  content: string;
  createdAt: string;
  createdBy: 'user' | 'ai' | 'system';
  reason: string;
  evaluationId?: string; // Link to the evaluation that triggered this change
  parentVersionId?: string; // Previous version ID
  metrics?: {
    generationsUsed: number;
    averageScore: number;
    passRate: number;
  };
  isActive: boolean;
  tags: string[];
}

/** Prompt change proposal (pending AI suggestion) */
export interface PromptChangeProposal {
  id: string;
  domain: PromptDomain;
  currentVersionId: string;
  proposedContent: string;
  reason: string;
  evidence: string[];
  evaluationId: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewedAt?: string;
  reviewedBy?: 'user' | 'auto';
}

// ==================
// Store State
// ==================

export interface PromptVersionState {
  /** All prompt versions indexed by domain */
  versions: Map<PromptDomain, PromptVersion[]>;
  /** Currently active version ID per domain */
  activeVersionIds: Map<PromptDomain, string>;
  /** Pending change proposals */
  proposals: PromptChangeProposal[];
  /** Version comparison mode */
  compareMode: {
    enabled: boolean;
    versionA: string | null;
    versionB: string | null;
  };
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

// ==================
// Store Actions
// ==================

export interface PromptVersionActions {
  // Version management
  createVersion: (
    domain: PromptDomain,
    content: string,
    reason: string,
    createdBy: PromptVersion['createdBy'],
    evaluationId?: string
  ) => string;
  getVersion: (id: string) => PromptVersion | undefined;
  getVersionsByDomain: (domain: PromptDomain) => PromptVersion[];
  getActiveVersion: (domain: PromptDomain) => PromptVersion | undefined;
  getActivePrompt: (domain: PromptDomain) => string | undefined;

  // Version control
  activateVersion: (versionId: string) => void;
  revertToVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;

  // Metrics
  updateVersionMetrics: (
    versionId: string,
    metrics: Partial<PromptVersion['metrics']>
  ) => void;
  incrementGenerationCount: (domain: PromptDomain) => void;

  // Proposals
  createProposal: (
    domain: PromptDomain,
    proposedContent: string,
    reason: string,
    evidence: string[],
    evaluationId: string
  ) => string;
  approveProposal: (proposalId: string, reviewedBy?: 'user' | 'auto') => string | null;
  rejectProposal: (proposalId: string, reviewedBy?: 'user' | 'auto') => void;
  expireProposal: (proposalId: string) => void;
  getPendingProposals: (domain?: PromptDomain) => PromptChangeProposal[];

  // Comparison
  enableCompareMode: (versionA: string, versionB: string) => void;
  disableCompareMode: () => void;

  // Tags
  addTag: (versionId: string, tag: string) => void;
  removeTag: (versionId: string, tag: string) => void;

  // State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Initialize with default prompts
  initializeDefaults: () => void;
}

// ==================
// Default Prompts
// ==================

const DEFAULT_PROMPTS: Record<PromptDomain, string> = {
  widget_generation: `You are an expert widget generator for StickerNest, a canvas-based design application.

Generate self-contained HTML widgets that follow Protocol v3.0:
1. Signal READY: window.parent.postMessage({ type: 'READY' }, '*')
2. Emit events: window.parent.postMessage({ type: 'widget:emit', payload: { type: 'event-name', payload: data } }, '*')
3. Listen for events: window.addEventListener('message', handler)

Requirements:
- Single HTML file with embedded CSS and JavaScript
- Clean, readable code
- Responsive design
- Clear input/output ports with typed interfaces
- No external dependencies (inline everything)

Return JSON with: { manifest: {...}, html: "..." }`,

  image_generation: `You are an AI image generation assistant for StickerNest.

When generating image prompts:
1. Be specific about style, composition, and details
2. Include sticker-appropriate elements (clean edges, bold colors)
3. Avoid complex backgrounds unless requested
4. Optimize for design use cases

Format prompts for maximum clarity with the target model.`,

  pipeline_suggestion: `You are a pipeline architect for StickerNest widget connections.

When suggesting connections:
1. Analyze port types and semantic meaning
2. Consider data flow direction
3. Suggest transformations when types don't match exactly
4. Explain the reasoning for each connection

Prioritize logical data flow over forcing connections.`,

  reflection_judge: `You are a quality evaluator for AI-generated content in StickerNest.

Evaluate each item against the provided rubric criteria:
1. Score each criterion from 1-5 with specific reasoning
2. Be objective and consistent
3. Identify specific issues with evidence
4. Suggest actionable improvements

Format response as JSON with scores, reasoning, and suggestions.`,

  skill_generator: `You are a Claude Code skill generator for StickerNest.

Create skills that:
1. Follow YAML frontmatter format with description and triggers
2. Include clear step-by-step instructions
3. Reference relevant files and patterns
4. Are focused on specific, actionable tasks

Skills should help Claude Code understand StickerNest patterns.`,

  connection_analyzer: `You are a semantic analyzer for widget port connections.

Analyze compatibility based on:
1. Data type matching (exact, compatible, convertible)
2. Semantic meaning from port names
3. Common patterns (value→display, trigger→action)
4. Context from widget purposes

Return compatibility scores with transformation suggestions.`,
};

// ==================
// Initial State
// ==================

const createInitialVersions = (): Map<PromptDomain, PromptVersion[]> => {
  const versions = new Map<PromptDomain, PromptVersion[]>();
  const now = new Date().toISOString();

  (Object.keys(DEFAULT_PROMPTS) as PromptDomain[]).forEach((domain) => {
    const version: PromptVersion = {
      id: `${domain}-v1-initial`,
      domain,
      version: 1,
      content: DEFAULT_PROMPTS[domain],
      createdAt: now,
      createdBy: 'system',
      reason: 'Initial system prompt',
      isActive: true,
      tags: ['initial', 'default'],
      metrics: {
        generationsUsed: 0,
        averageScore: 0,
        passRate: 0,
      },
    };
    versions.set(domain, [version]);
  });

  return versions;
};

const createInitialActiveIds = (): Map<PromptDomain, string> => {
  const activeIds = new Map<PromptDomain, string>();
  (Object.keys(DEFAULT_PROMPTS) as PromptDomain[]).forEach((domain) => {
    activeIds.set(domain, `${domain}-v1-initial`);
  });
  return activeIds;
};

const initialState: PromptVersionState = {
  versions: createInitialVersions(),
  activeVersionIds: createInitialActiveIds(),
  proposals: [],
  compareMode: {
    enabled: false,
    versionA: null,
    versionB: null,
  },
  isLoading: false,
  error: null,
};

// ==================
// Store Creation
// ==================

export const usePromptVersionStore = create<PromptVersionState & PromptVersionActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Version management
        createVersion: (domain, content, reason, createdBy, evaluationId) => {
          const versions = get().versions.get(domain) || [];
          const currentVersion = versions.find((v) => v.isActive);
          const newVersionNumber = currentVersion ? currentVersion.version + 1 : 1;
          const id = `${domain}-v${newVersionNumber}-${Date.now()}`;

          const newVersion: PromptVersion = {
            id,
            domain,
            version: newVersionNumber,
            content,
            createdAt: new Date().toISOString(),
            createdBy,
            reason,
            evaluationId,
            parentVersionId: currentVersion?.id,
            isActive: true,
            tags: [],
            metrics: {
              generationsUsed: 0,
              averageScore: 0,
              passRate: 0,
            },
          };

          set(
            (state) => {
              const domainVersions = state.versions.get(domain) || [];
              const updatedVersions = domainVersions.map((v) => ({ ...v, isActive: false }));
              const newVersions = new Map(state.versions);
              newVersions.set(domain, [newVersion, ...updatedVersions]);

              const newActiveIds = new Map(state.activeVersionIds);
              newActiveIds.set(domain, id);

              return {
                versions: newVersions,
                activeVersionIds: newActiveIds,
              };
            },
            false,
            'createVersion'
          );

          return id;
        },

        getVersion: (id) => {
          for (const versions of get().versions.values()) {
            const found = versions.find((v) => v.id === id);
            if (found) return found;
          }
          return undefined;
        },

        getVersionsByDomain: (domain) => {
          return get().versions.get(domain) || [];
        },

        getActiveVersion: (domain) => {
          const versions = get().versions.get(domain);
          return versions?.find((v) => v.isActive);
        },

        getActivePrompt: (domain) => {
          return get().getActiveVersion(domain)?.content;
        },

        activateVersion: (versionId) => {
          const version = get().getVersion(versionId);
          if (!version) return;

          set(
            (state) => {
              const domainVersions = state.versions.get(version.domain) || [];
              const updatedVersions = domainVersions.map((v) => ({
                ...v,
                isActive: v.id === versionId,
              }));

              const newVersions = new Map(state.versions);
              newVersions.set(version.domain, updatedVersions);

              const newActiveIds = new Map(state.activeVersionIds);
              newActiveIds.set(version.domain, versionId);

              return {
                versions: newVersions,
                activeVersionIds: newActiveIds,
              };
            },
            false,
            'activateVersion'
          );
        },

        revertToVersion: (versionId) => {
          const version = get().getVersion(versionId);
          if (!version) return;

          // Create a new version that's a copy, but as a revert
          get().createVersion(
            version.domain,
            version.content,
            `Reverted to version ${version.version}`,
            'user'
          );
        },

        deleteVersion: (versionId) => {
          const version = get().getVersion(versionId);
          if (!version || version.isActive) return; // Can't delete active version

          set(
            (state) => {
              const domainVersions = state.versions.get(version.domain) || [];
              const filteredVersions = domainVersions.filter((v) => v.id !== versionId);

              const newVersions = new Map(state.versions);
              newVersions.set(version.domain, filteredVersions);

              return { versions: newVersions };
            },
            false,
            'deleteVersion'
          );
        },

        // Metrics
        updateVersionMetrics: (versionId, metrics) => {
          const version = get().getVersion(versionId);
          if (!version) return;

          set(
            (state) => {
              const domainVersions = state.versions.get(version.domain) || [];
              const updatedVersions = domainVersions.map((v) =>
                v.id === versionId
                  ? { ...v, metrics: { ...v.metrics, ...metrics } as PromptVersion['metrics'] }
                  : v
              );

              const newVersions = new Map(state.versions);
              newVersions.set(version.domain, updatedVersions);

              return { versions: newVersions };
            },
            false,
            'updateVersionMetrics'
          );
        },

        incrementGenerationCount: (domain) => {
          const activeVersion = get().getActiveVersion(domain);
          if (!activeVersion?.metrics) return;

          get().updateVersionMetrics(activeVersion.id, {
            generationsUsed: activeVersion.metrics.generationsUsed + 1,
          });
        },

        // Proposals
        createProposal: (domain, proposedContent, reason, evidence, evaluationId) => {
          const activeVersion = get().getActiveVersion(domain);
          if (!activeVersion) return '';

          const id = crypto.randomUUID();
          const proposal: PromptChangeProposal = {
            id,
            domain,
            currentVersionId: activeVersion.id,
            proposedContent,
            reason,
            evidence,
            evaluationId,
            createdAt: new Date().toISOString(),
            status: 'pending',
          };

          set(
            (state) => ({
              proposals: [proposal, ...state.proposals],
            }),
            false,
            'createProposal'
          );

          return id;
        },

        approveProposal: (proposalId, reviewedBy = 'user') => {
          const proposal = get().proposals.find((p) => p.id === proposalId);
          if (!proposal || proposal.status !== 'pending') return null;

          // Create new version from proposal
          const newVersionId = get().createVersion(
            proposal.domain,
            proposal.proposedContent,
            proposal.reason,
            'ai',
            proposal.evaluationId
          );

          set(
            (state) => ({
              proposals: state.proposals.map((p) =>
                p.id === proposalId
                  ? { ...p, status: 'approved' as const, reviewedAt: new Date().toISOString(), reviewedBy }
                  : p
              ),
            }),
            false,
            'approveProposal'
          );

          return newVersionId;
        },

        rejectProposal: (proposalId, reviewedBy = 'user') => {
          set(
            (state) => ({
              proposals: state.proposals.map((p) =>
                p.id === proposalId
                  ? { ...p, status: 'rejected' as const, reviewedAt: new Date().toISOString(), reviewedBy }
                  : p
              ),
            }),
            false,
            'rejectProposal'
          );
        },

        expireProposal: (proposalId) => {
          set(
            (state) => ({
              proposals: state.proposals.map((p) =>
                p.id === proposalId
                  ? { ...p, status: 'expired' as const, reviewedAt: new Date().toISOString() }
                  : p
              ),
            }),
            false,
            'expireProposal'
          );
        },

        getPendingProposals: (domain) => {
          return get().proposals.filter(
            (p) => p.status === 'pending' && (!domain || p.domain === domain)
          );
        },

        // Comparison
        enableCompareMode: (versionA, versionB) => {
          set(
            {
              compareMode: { enabled: true, versionA, versionB },
            },
            false,
            'enableCompareMode'
          );
        },

        disableCompareMode: () => {
          set(
            {
              compareMode: { enabled: false, versionA: null, versionB: null },
            },
            false,
            'disableCompareMode'
          );
        },

        // Tags
        addTag: (versionId, tag) => {
          const version = get().getVersion(versionId);
          if (!version) return;

          set(
            (state) => {
              const domainVersions = state.versions.get(version.domain) || [];
              const updatedVersions = domainVersions.map((v) =>
                v.id === versionId && !v.tags.includes(tag)
                  ? { ...v, tags: [...v.tags, tag] }
                  : v
              );

              const newVersions = new Map(state.versions);
              newVersions.set(version.domain, updatedVersions);

              return { versions: newVersions };
            },
            false,
            'addTag'
          );
        },

        removeTag: (versionId, tag) => {
          const version = get().getVersion(versionId);
          if (!version) return;

          set(
            (state) => {
              const domainVersions = state.versions.get(version.domain) || [];
              const updatedVersions = domainVersions.map((v) =>
                v.id === versionId ? { ...v, tags: v.tags.filter((t) => t !== tag) } : v
              );

              const newVersions = new Map(state.versions);
              newVersions.set(version.domain, updatedVersions);

              return { versions: newVersions };
            },
            false,
            'removeTag'
          );
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

        initializeDefaults: () => {
          // Re-initialize with defaults (useful after reset or first load)
          set(
            {
              versions: createInitialVersions(),
              activeVersionIds: createInitialActiveIds(),
            },
            false,
            'initializeDefaults'
          );
        },
      }),
      {
        name: 'prompt-version-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Convert Maps to arrays for serialization
          versions: Array.from(state.versions.entries()),
          activeVersionIds: Array.from(state.activeVersionIds.entries()),
          proposals: state.proposals.slice(0, 50),
        }),
        version: 1,
        // Rehydrate Maps from arrays
        onRehydrateStorage: () => (state) => {
          if (state) {
            if (Array.isArray(state.versions)) {
              state.versions = new Map(state.versions as any);
            }
            if (Array.isArray(state.activeVersionIds)) {
              state.activeVersionIds = new Map(state.activeVersionIds as any);
            }
          }
        },
      }
    ),
    {
      name: 'PromptVersionStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==================
// Selector Hooks
// ==================

export const usePromptVersions = (domain: PromptDomain) =>
  usePromptVersionStore((s) => s.versions.get(domain) || []);
export const useActivePromptVersion = (domain: PromptDomain) =>
  usePromptVersionStore((s) => s.getActiveVersion(domain));
export const useActivePrompt = (domain: PromptDomain) =>
  usePromptVersionStore((s) => s.getActivePrompt(domain));
export const usePendingProposals = (domain?: PromptDomain) =>
  usePromptVersionStore((s) => s.getPendingProposals(domain));
export const useCompareMode = () => usePromptVersionStore((s) => s.compareMode);
export const usePromptVersionLoading = () => usePromptVersionStore((s) => s.isLoading);
export const usePromptVersionError = () => usePromptVersionStore((s) => s.error);
