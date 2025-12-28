/**
 * StickerNest v2 - Reflection Dashboard
 * Main dashboard for the self-improving AI system
 * Shows metrics, evaluations, and controls for the reflection loop
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  useAIReflectionStore,
  useReflectionEvaluations,
  useReflectionConfig,
  useReflectionRuns,
  useIsReflecting,
} from '../../state/useAIReflectionStore';
import { usePromptVersionStore } from '../../state/usePromptVersionStore';
import { useGenerationMetricsStore } from '../../state/useGenerationMetricsStore';
import { reflectOnWidgetGeneration, reflectOnImageGeneration } from '../../ai/AIReflectionService';

// ==================
// Types
// ==================

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

// ==================
// Tabs
// ==================

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'reflections', label: 'Reflections', icon: '🔍' },
  { id: 'prompts', label: 'Prompts', icon: '📝' },
  { id: 'suggestions', label: 'Suggestions', icon: '💡' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

// ==================
// Sub-components
// ==================

const StatCard: React.FC<{
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}> = ({ label, value, subtext, color = 'var(--sn-accent-primary)' }) => (
  <div
    style={{
      background: 'var(--sn-bg-tertiary)',
      borderRadius: 'var(--sn-radius-lg)',
      padding: 'var(--sn-space-4)',
      flex: 1,
      minWidth: 120,
    }}
  >
    <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)', marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 24, fontWeight: 600, color }}>{value}</div>
    {subtext && (
      <div style={{ fontSize: 11, color: 'var(--sn-text-muted)', marginTop: 2 }}>
        {subtext}
      </div>
    )}
  </div>
);

const ScoreBadge: React.FC<{ score: number; max: number }> = ({ score, max }) => {
  const percentage = (score / max) * 100;
  const color =
    percentage >= 70 ? 'var(--sn-success)' : percentage >= 50 ? 'var(--sn-warning)' : 'var(--sn-error)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 'var(--sn-radius-full)',
        background: `${color}20`,
        color,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {score.toFixed(1)}/{max}
    </span>
  );
};

const PassFailBadge: React.FC<{ passed: boolean }> = ({ passed }) => (
  <span
    style={{
      padding: '2px 8px',
      borderRadius: 'var(--sn-radius-full)',
      background: passed ? 'var(--sn-success)20' : 'var(--sn-error)20',
      color: passed ? 'var(--sn-success)' : 'var(--sn-error)',
      fontSize: 12,
      fontWeight: 500,
    }}
  >
    {passed ? 'PASS' : 'FAIL'}
  </span>
);

// ==================
// Overview Tab
// ==================

const OverviewTab: React.FC = () => {
  const stats = useAIReflectionStore((s) => s.getStats());
  const widgetSuccessRate = useGenerationMetricsStore((s) => s.getSuccessRate('widget'));
  const imageSuccessRate = useGenerationMetricsStore((s) => s.getSuccessRate('image'));
  const sessionStats = useGenerationMetricsStore((s) => s.sessionStats);
  const pendingProposals = usePromptVersionStore((s) => s.getPendingProposals());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sn-space-4)' }}>
      {/* Stats Grid */}
      <div style={{ display: 'flex', gap: 'var(--sn-space-3)', flexWrap: 'wrap' }}>
        <StatCard
          label="Total Evaluations"
          value={stats.totalEvaluations}
          subtext={`${stats.passRate.toFixed(0)}% pass rate`}
        />
        <StatCard
          label="Average Score"
          value={stats.averageScore.toFixed(2)}
          subtext="out of 5.0"
          color={stats.averageScore >= 3.5 ? 'var(--sn-success)' : 'var(--sn-warning)'}
        />
        <StatCard
          label="Active Suggestions"
          value={stats.activeSuggestions}
          color={stats.activeSuggestions > 5 ? 'var(--sn-warning)' : 'var(--sn-info)'}
        />
        <StatCard
          label="Pending Proposals"
          value={pendingProposals.length}
          color={pendingProposals.length > 0 ? 'var(--sn-accent-primary)' : 'var(--sn-text-muted)'}
        />
      </div>

      {/* Generation Success Rates */}
      <div
        style={{
          background: 'var(--sn-bg-tertiary)',
          borderRadius: 'var(--sn-radius-lg)',
          padding: 'var(--sn-space-4)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--sn-space-3)' }}>
          Generation Success Rates
        </div>
        <div style={{ display: 'flex', gap: 'var(--sn-space-6)' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)' }}>Widget</div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{widgetSuccessRate.toFixed(0)}%</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)' }}>Image</div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{imageSuccessRate.toFixed(0)}%</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)' }}>Session Total</div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{sessionStats.generationCount}</div>
          </div>
        </div>
      </div>

      {/* Last Reflection */}
      {stats.lastReflection && (
        <div
          style={{
            background: 'var(--sn-bg-tertiary)',
            borderRadius: 'var(--sn-radius-lg)',
            padding: 'var(--sn-space-4)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)' }}>Last Reflection</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            {new Date(stats.lastReflection).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================
// Reflections Tab
// ==================

const ReflectionsTab: React.FC = () => {
  const evaluations = useReflectionEvaluations();
  const runs = useReflectionRuns();
  const isReflecting = useIsReflecting();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleReflectNow = useCallback(async (type: 'widget' | 'image') => {
    if (type === 'widget') {
      await reflectOnWidgetGeneration({ forceRun: true });
    } else {
      await reflectOnImageGeneration({ forceRun: true });
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sn-space-4)' }}>
      {/* Reflect Now Buttons */}
      <div style={{ display: 'flex', gap: 'var(--sn-space-2)' }}>
        <button
          onClick={() => handleReflectNow('widget')}
          disabled={isReflecting}
          style={{
            padding: '8px 16px',
            background: 'var(--sn-accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--sn-radius-md)',
            cursor: isReflecting ? 'not-allowed' : 'pointer',
            opacity: isReflecting ? 0.5 : 1,
            fontSize: 14,
          }}
        >
          {isReflecting ? 'Reflecting...' : 'Reflect on Widgets'}
        </button>
        <button
          onClick={() => handleReflectNow('image')}
          disabled={isReflecting}
          style={{
            padding: '8px 16px',
            background: 'var(--sn-bg-tertiary)',
            color: 'var(--sn-text-primary)',
            border: '1px solid var(--sn-border-primary)',
            borderRadius: 'var(--sn-radius-md)',
            cursor: isReflecting ? 'not-allowed' : 'pointer',
            opacity: isReflecting ? 0.5 : 1,
            fontSize: 14,
          }}
        >
          Reflect on Images
        </button>
      </div>

      {/* Evaluation History */}
      <div style={{ fontSize: 14, fontWeight: 600 }}>Evaluation History</div>
      {evaluations.length === 0 ? (
        <div style={{ color: 'var(--sn-text-secondary)', fontSize: 14 }}>
          No evaluations yet. Run a reflection to start.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sn-space-2)' }}>
          {evaluations.slice(0, 20).map((evaluation) => (
            <div
              key={evaluation.id}
              style={{
                background: 'var(--sn-bg-tertiary)',
                borderRadius: 'var(--sn-radius-md)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                onClick={() => setExpandedId(expandedId === evaluation.id ? null : evaluation.id)}
                style={{
                  padding: 'var(--sn-space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sn-space-3)' }}>
                  <PassFailBadge passed={evaluation.passed} />
                  <span style={{ fontSize: 13 }}>{evaluation.targetType}</span>
                  <ScoreBadge score={evaluation.overallScore} max={evaluation.maxPossibleScore} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--sn-text-muted)' }}>
                  {new Date(evaluation.timestamp).toLocaleDateString()}
                </span>
              </div>

              {/* Expanded Details */}
              {expandedId === evaluation.id && (
                <div
                  style={{
                    padding: 'var(--sn-space-3)',
                    borderTop: '1px solid var(--sn-border-secondary)',
                    fontSize: 13,
                  }}
                >
                  {/* Scores */}
                  <div style={{ marginBottom: 'var(--sn-space-3)' }}>
                    <div style={{ fontWeight: 500, marginBottom: 'var(--sn-space-2)' }}>Scores</div>
                    {evaluation.scores.map((score) => (
                      <div
                        key={score.criterionName}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '4px 0',
                        }}
                      >
                        <span style={{ color: 'var(--sn-text-secondary)' }}>{score.criterionName}</span>
                        <ScoreBadge score={score.score} max={score.maxScore} />
                      </div>
                    ))}
                  </div>

                  {/* Analysis */}
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 'var(--sn-space-2)' }}>Analysis</div>
                    <div style={{ color: 'var(--sn-text-secondary)', lineHeight: 1.5 }}>
                      {evaluation.analysis}
                    </div>
                  </div>

                  {/* Suggested Changes */}
                  {evaluation.suggestedChanges.length > 0 && (
                    <div style={{ marginTop: 'var(--sn-space-3)' }}>
                      <div style={{ fontWeight: 500, marginBottom: 'var(--sn-space-2)' }}>
                        Suggested Changes
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--sn-text-secondary)' }}>
                        {evaluation.suggestedChanges.map((change, i) => (
                          <li key={i}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================
// Prompts Tab
// ==================

const PromptsTab: React.FC = () => {
  const promptStore = usePromptVersionStore();
  const [selectedDomain, setSelectedDomain] = useState<string>('widget_generation');
  const [showDiff, setShowDiff] = useState(false);

  const versions = promptStore.getVersionsByDomain(selectedDomain as any);
  const activeVersion = promptStore.getActiveVersion(selectedDomain as any);
  const pendingProposals = promptStore.getPendingProposals(selectedDomain as any);

  const domains = [
    'widget_generation',
    'image_generation',
    'pipeline_suggestion',
    'reflection_judge',
    'skill_generator',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sn-space-4)' }}>
      {/* Domain Selector */}
      <div style={{ display: 'flex', gap: 'var(--sn-space-2)', flexWrap: 'wrap' }}>
        {domains.map((domain) => (
          <button
            key={domain}
            onClick={() => setSelectedDomain(domain)}
            style={{
              padding: '6px 12px',
              background: selectedDomain === domain ? 'var(--sn-accent-primary)' : 'var(--sn-bg-tertiary)',
              color: selectedDomain === domain ? 'white' : 'var(--sn-text-secondary)',
              border: 'none',
              borderRadius: 'var(--sn-radius-md)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {domain.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Pending Proposals */}
      {pendingProposals.length > 0 && (
        <div
          style={{
            background: 'var(--sn-accent-primary)15',
            border: '1px solid var(--sn-accent-primary)',
            borderRadius: 'var(--sn-radius-md)',
            padding: 'var(--sn-space-3)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 'var(--sn-space-2)' }}>
            {pendingProposals.length} Pending Proposal{pendingProposals.length > 1 ? 's' : ''}
          </div>
          {pendingProposals.map((proposal) => (
            <div
              key={proposal.id}
              style={{
                background: 'var(--sn-bg-tertiary)',
                borderRadius: 'var(--sn-radius-md)',
                padding: 'var(--sn-space-3)',
                marginBottom: 'var(--sn-space-2)',
              }}
            >
              <div style={{ fontSize: 13, marginBottom: 'var(--sn-space-2)' }}>{proposal.reason}</div>
              <div style={{ display: 'flex', gap: 'var(--sn-space-2)' }}>
                <button
                  onClick={() => promptStore.approveProposal(proposal.id)}
                  style={{
                    padding: '4px 12px',
                    background: 'var(--sn-success)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--sn-radius-sm)',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => promptStore.rejectProposal(proposal.id)}
                  style={{
                    padding: '4px 12px',
                    background: 'var(--sn-error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--sn-radius-sm)',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Version */}
      {activeVersion && (
        <div
          style={{
            background: 'var(--sn-bg-tertiary)',
            borderRadius: 'var(--sn-radius-lg)',
            padding: 'var(--sn-space-4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sn-space-3)' }}>
            <div>
              <span style={{ fontWeight: 600 }}>Version {activeVersion.version}</span>
              <span
                style={{
                  marginLeft: 8,
                  padding: '2px 8px',
                  background: 'var(--sn-success)20',
                  color: 'var(--sn-success)',
                  borderRadius: 'var(--sn-radius-full)',
                  fontSize: 11,
                }}
              >
                ACTIVE
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--sn-text-muted)' }}>
              {activeVersion.createdBy} • {new Date(activeVersion.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)', marginBottom: 'var(--sn-space-2)' }}>
            {activeVersion.reason}
          </div>
          {activeVersion.metrics && (
            <div style={{ display: 'flex', gap: 'var(--sn-space-4)', fontSize: 12 }}>
              <span>Used: {activeVersion.metrics.generationsUsed}x</span>
              <span>Avg Score: {activeVersion.metrics.averageScore.toFixed(2)}</span>
              <span>Pass Rate: {activeVersion.metrics.passRate.toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Version History */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--sn-space-3)' }}>Version History</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sn-space-2)' }}>
          {versions.slice(0, 10).map((version) => (
            <div
              key={version.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--sn-space-2) var(--sn-space-3)',
                background: version.isActive ? 'var(--sn-accent-primary)15' : 'var(--sn-bg-secondary)',
                borderRadius: 'var(--sn-radius-md)',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sn-space-2)' }}>
                <span>v{version.version}</span>
                <span style={{ color: 'var(--sn-text-muted)' }}>•</span>
                <span style={{ color: 'var(--sn-text-secondary)' }}>{version.createdBy}</span>
              </div>
              {!version.isActive && (
                <button
                  onClick={() => promptStore.revertToVersion(version.id)}
                  style={{
                    padding: '2px 8px',
                    background: 'var(--sn-bg-tertiary)',
                    color: 'var(--sn-text-secondary)',
                    border: '1px solid var(--sn-border-secondary)',
                    borderRadius: 'var(--sn-radius-sm)',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Revert
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================
// Suggestions Tab
// ==================

const SuggestionsTab: React.FC = () => {
  const suggestions = useAIReflectionStore((s) => s.getActiveSuggestions());
  const { markSuggestionAddressed, hideSuggestion } = useAIReflectionStore();

  const severityColors = {
    low: 'var(--sn-info)',
    medium: 'var(--sn-warning)',
    high: 'var(--sn-error)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sn-space-3)' }}>
      {suggestions.length === 0 ? (
        <div style={{ color: 'var(--sn-text-secondary)', fontSize: 14, padding: 'var(--sn-space-4)' }}>
          No active suggestions. The AI will generate suggestions during reflections.
        </div>
      ) : (
        suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            style={{
              background: 'var(--sn-bg-tertiary)',
              borderRadius: 'var(--sn-radius-md)',
              padding: 'var(--sn-space-4)',
              borderLeft: `3px solid ${severityColors[suggestion.severity]}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sn-space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sn-space-2)' }}>
                <span
                  style={{
                    padding: '2px 6px',
                    background: `${severityColors[suggestion.severity]}20`,
                    color: severityColors[suggestion.severity],
                    borderRadius: 'var(--sn-radius-sm)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  {suggestion.severity}
                </span>
                <span
                  style={{
                    padding: '2px 6px',
                    background: 'var(--sn-bg-elevated)',
                    borderRadius: 'var(--sn-radius-sm)',
                    fontSize: 10,
                    color: 'var(--sn-text-muted)',
                  }}
                >
                  {suggestion.category}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--sn-text-muted)' }}>
                {new Date(suggestion.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div style={{ fontWeight: 500, marginBottom: 'var(--sn-space-2)' }}>{suggestion.title}</div>
            <div style={{ fontSize: 13, color: 'var(--sn-text-secondary)', marginBottom: 'var(--sn-space-3)' }}>
              {suggestion.description}
            </div>

            <div style={{ fontSize: 12, color: 'var(--sn-text-muted)', marginBottom: 'var(--sn-space-3)' }}>
              <strong>Proposed Action:</strong> {suggestion.proposedAction}
            </div>

            <div style={{ display: 'flex', gap: 'var(--sn-space-2)' }}>
              <button
                onClick={() => markSuggestionAddressed(suggestion.id)}
                style={{
                  padding: '4px 12px',
                  background: 'var(--sn-success)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--sn-radius-sm)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Mark Addressed
              </button>
              <button
                onClick={() => hideSuggestion(suggestion.id)}
                style={{
                  padding: '4px 12px',
                  background: 'transparent',
                  color: 'var(--sn-text-secondary)',
                  border: '1px solid var(--sn-border-secondary)',
                  borderRadius: 'var(--sn-radius-sm)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Hide
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ==================
// Settings Tab
// ==================

const SettingsTab: React.FC = () => {
  const config = useReflectionConfig();
  const { updateConfig, clearCooldown, isInCooldown } = useAIReflectionStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sn-space-4)' }}>
      {/* Enable Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--sn-bg-tertiary)',
          padding: 'var(--sn-space-3)',
          borderRadius: 'var(--sn-radius-md)',
        }}
      >
        <div>
          <div style={{ fontWeight: 500 }}>Enable Self-Improvement</div>
          <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)' }}>
            Automatically evaluate and improve AI prompts
          </div>
        </div>
        <button
          onClick={() => updateConfig({ enabled: !config.enabled })}
          style={{
            width: 48,
            height: 24,
            borderRadius: 'var(--sn-radius-full)',
            background: config.enabled ? 'var(--sn-accent-primary)' : 'var(--sn-bg-elevated)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: 2,
              left: config.enabled ? 26 : 2,
              transition: 'left 0.2s',
            }}
          />
        </button>
      </div>

      {/* Interval */}
      <div style={{ background: 'var(--sn-bg-tertiary)', padding: 'var(--sn-space-3)', borderRadius: 'var(--sn-radius-md)' }}>
        <div style={{ fontWeight: 500, marginBottom: 'var(--sn-space-2)' }}>Reflection Interval</div>
        <div style={{ display: 'flex', gap: 'var(--sn-space-2)' }}>
          {[15, 30, 60, 120].map((mins) => (
            <button
              key={mins}
              onClick={() => updateConfig({ intervalMinutes: mins })}
              style={{
                padding: '6px 12px',
                background: config.intervalMinutes === mins ? 'var(--sn-accent-primary)' : 'var(--sn-bg-elevated)',
                color: config.intervalMinutes === mins ? 'white' : 'var(--sn-text-secondary)',
                border: 'none',
                borderRadius: 'var(--sn-radius-sm)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {mins < 60 ? `${mins}m` : `${mins / 60}h`}
            </button>
          ))}
        </div>
      </div>

      {/* Score Threshold */}
      <div style={{ background: 'var(--sn-bg-tertiary)', padding: 'var(--sn-space-3)', borderRadius: 'var(--sn-radius-md)' }}>
        <div style={{ fontWeight: 500, marginBottom: 'var(--sn-space-2)' }}>
          Score Threshold: {config.scoreThreshold.toFixed(1)}
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="0.1"
          value={config.scoreThreshold}
          onChange={(e) => updateConfig({ scoreThreshold: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--sn-text-muted)' }}>
          <span>1 (lenient)</span>
          <span>5 (strict)</span>
        </div>
      </div>

      {/* Messages to Evaluate */}
      <div style={{ background: 'var(--sn-bg-tertiary)', padding: 'var(--sn-space-3)', borderRadius: 'var(--sn-radius-md)' }}>
        <div style={{ fontWeight: 500, marginBottom: 'var(--sn-space-2)' }}>Messages to Evaluate</div>
        <div style={{ display: 'flex', gap: 'var(--sn-space-2)' }}>
          {[10, 20, 50, 100].map((count) => (
            <button
              key={count}
              onClick={() => updateConfig({ messagesToEvaluate: count })}
              style={{
                padding: '6px 12px',
                background: config.messagesToEvaluate === count ? 'var(--sn-accent-primary)' : 'var(--sn-bg-elevated)',
                color: config.messagesToEvaluate === count ? 'white' : 'var(--sn-text-secondary)',
                border: 'none',
                borderRadius: 'var(--sn-radius-sm)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Evaluation Mode */}
      <div style={{ background: 'var(--sn-bg-tertiary)', padding: 'var(--sn-space-3)', borderRadius: 'var(--sn-radius-md)' }}>
        <div style={{ fontWeight: 500, marginBottom: 'var(--sn-space-2)' }}>Evaluation Mode</div>
        <div style={{ display: 'flex', gap: 'var(--sn-space-2)' }}>
          <button
            onClick={() => updateConfig({ evaluateUnevaluatedOnly: true })}
            style={{
              flex: 1,
              padding: '8px',
              background: config.evaluateUnevaluatedOnly ? 'var(--sn-accent-primary)' : 'var(--sn-bg-elevated)',
              color: config.evaluateUnevaluatedOnly ? 'white' : 'var(--sn-text-secondary)',
              border: 'none',
              borderRadius: 'var(--sn-radius-sm)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Unevaluated Only
          </button>
          <button
            onClick={() => updateConfig({ evaluateUnevaluatedOnly: false })}
            style={{
              flex: 1,
              padding: '8px',
              background: !config.evaluateUnevaluatedOnly ? 'var(--sn-accent-primary)' : 'var(--sn-bg-elevated)',
              color: !config.evaluateUnevaluatedOnly ? 'white' : 'var(--sn-text-secondary)',
              border: 'none',
              borderRadius: 'var(--sn-radius-sm)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Last N Messages
          </button>
        </div>
      </div>

      {/* Auto Apply */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--sn-bg-tertiary)',
          padding: 'var(--sn-space-3)',
          borderRadius: 'var(--sn-radius-md)',
        }}
      >
        <div>
          <div style={{ fontWeight: 500 }}>Auto-Apply Changes</div>
          <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)' }}>
            Automatically apply prompt improvements (otherwise creates proposals)
          </div>
        </div>
        <button
          onClick={() => updateConfig({ autoApplyChanges: !config.autoApplyChanges })}
          style={{
            width: 48,
            height: 24,
            borderRadius: 'var(--sn-radius-full)',
            background: config.autoApplyChanges ? 'var(--sn-accent-primary)' : 'var(--sn-bg-elevated)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: 2,
              left: config.autoApplyChanges ? 26 : 2,
              transition: 'left 0.2s',
            }}
          />
        </button>
      </div>

      {/* Cooldown */}
      {isInCooldown() && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--sn-warning)15',
            border: '1px solid var(--sn-warning)',
            padding: 'var(--sn-space-3)',
            borderRadius: 'var(--sn-radius-md)',
          }}
        >
          <span>Cooldown active - prompt updates paused</span>
          <button
            onClick={clearCooldown}
            style={{
              padding: '4px 12px',
              background: 'var(--sn-warning)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--sn-radius-sm)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

// ==================
// Main Component
// ==================

export interface ReflectionDashboardProps {
  /** Whether the panel is open (optional - defaults to true when used inline) */
  isOpen?: boolean;
  /** Callback when close is requested (optional - hide close button if not provided) */
  onClose?: () => void;
  /** Whether this is embedded in another container (removes fixed positioning) */
  embedded?: boolean;
}

export const ReflectionDashboard: React.FC<ReflectionDashboardProps> = ({
  isOpen = true,
  onClose,
  embedded = false,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'reflections':
        return <ReflectionsTab />;
      case 'prompts':
        return <PromptsTab />;
      case 'suggestions':
        return <SuggestionsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        ...(embedded
          ? { height: '100%' }
          : {
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 420,
              boxShadow: 'var(--sn-elevation-panel)',
              zIndex: 1000,
            }),
        background: 'var(--sn-glass-bg, #0f0f19)',
        backdropFilter: 'var(--sn-glass-blur)',
        borderLeft: embedded ? 'none' : '1px solid var(--sn-border-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header - only show if standalone with close */}
      {!embedded && onClose && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--sn-space-4)',
            borderBottom: '1px solid var(--sn-border-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sn-space-2)' }}>
            <span style={{ fontSize: 18 }}>🧠</span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Self-Improving AI</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--sn-text-secondary)',
              cursor: 'pointer',
              padding: 'var(--sn-space-1)',
              fontSize: 18,
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--sn-border-secondary)',
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: 'var(--sn-space-3)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--sn-accent-primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--sn-text-primary)' : 'var(--sn-text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ marginRight: 4 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--sn-space-4)' }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ReflectionDashboard;
