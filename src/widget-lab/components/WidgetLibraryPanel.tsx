/**
 * Widget Library Panel Component
 * Shows library stats, browseable widgets, and coverage gaps
 * With clear explanations for non-technical users
 */

import React, { useState } from 'react';
import { theme } from '../theme';

// Define types locally to avoid circular import
interface LibraryWidgetDisplay {
  id: string;
  name: string;
  quality: number;
  category: string;
  inputCount: number;
  outputCount: number;
}

interface LibraryStats {
  total: number;
  averageQuality: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
}

interface WidgetLibraryPanelProps {
  stats: LibraryStats;
  onSuggestionClick: (suggestion: string) => void;
  // Callbacks to get data without importing library directly
  getWidgets: () => LibraryWidgetDisplay[];
  getCoverageGaps: () => string[];
}

// Help text for the library panel
const LIBRARY_HELP = {
  quality: {
    high: { min: 80, label: 'Excellent', color: '#4ade80', description: 'Well-documented with proper inputs/outputs' },
    medium: { min: 60, label: 'Good', color: '#fbbf24', description: 'Functional but could use improvements' },
    low: { min: 0, label: 'Basic', color: '#f87171', description: 'May need refinement' },
  },
  whatIsLibrary: 'Your collection of reusable widgets. Higher quality widgets connect better with others.',
  whatAreInputs: 'Data the widget can receive from other widgets',
  whatAreOutputs: 'Data the widget sends to other widgets',
};

export const WidgetLibraryPanel: React.FC<WidgetLibraryPanelProps> = ({
  stats,
  onSuggestionClick,
  getWidgets,
  getCoverageGaps,
}) => {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(236, 72, 153, 0.12))',
      borderRadius: '12px',
      border: '2px solid rgba(168, 85, 247, 0.3)',
      padding: '16px 20px',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📚</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary }}>
            Widget Library
          </span>
          <span style={{ fontSize: '12px', color: theme.text.secondary }}>
            {stats.total} widgets • Avg quality: {stats.total > 0 ? Math.round(stats.averageQuality) : 0}%
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Category chips */}
          {Object.entries(stats.byCategory)
            .filter(([, count]) => count > 0)
            .slice(0, 4)
            .map(([category, count]) => (
              <span
                key={category}
                style={{
                  padding: '4px 10px',
                  background: theme.bg.tertiary,
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: theme.text.secondary,
                }}
              >
                {category}: {count}
              </span>
            ))}
          <button
            onClick={() => setShowPanel(!showPanel)}
            style={{
              padding: '6px 12px',
              background: showPanel ? theme.accent : theme.bg.secondary,
              border: `1px solid ${showPanel ? theme.accent : theme.border}`,
              borderRadius: '6px',
              color: showPanel ? 'white' : theme.text.primary,
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {showPanel ? 'Hide' : 'Browse'}
          </button>
        </div>
      </div>

      {/* Expanded Library Panel */}
      {showPanel && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: theme.bg.secondary,
          borderRadius: '8px',
          maxHeight: '360px',
          overflow: 'auto',
        }}>
          {/* Quality legend */}
          <div style={{
            marginBottom: '12px',
            padding: '10px 12px',
            background: theme.bg.tertiary,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '11px', color: theme.text.tertiary }}>Quality:</span>
            {Object.entries(LIBRARY_HELP.quality).map(([key, info]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: info.color,
                }} />
                <span style={{ fontSize: '10px', color: theme.text.secondary }}>
                  {info.label} ({info.min}%+)
                </span>
              </div>
            ))}
            <span style={{ fontSize: '10px', color: theme.text.tertiary, marginLeft: 'auto' }}>
              IN = receives data | OUT = sends data
            </span>
          </div>

          {stats.total === 0 ? (
            <div style={{ textAlign: 'center', color: theme.text.tertiary, fontSize: '13px', padding: '20px' }}>
              <div style={{ marginBottom: '8px' }}>No widgets in library yet.</div>
              <div style={{ fontSize: '12px' }}>
                Use <strong>Quick Test</strong> above to add some widgets, or describe what you need in the <strong>AI Workflow Builder</strong>.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {getWidgets().map((widget) => {
                const qualityInfo = widget.quality >= 80
                  ? LIBRARY_HELP.quality.high
                  : widget.quality >= 60
                    ? LIBRARY_HELP.quality.medium
                    : LIBRARY_HELP.quality.low;

                return (
                  <div
                    key={widget.id}
                    style={{
                      padding: '12px',
                      background: theme.bg.tertiary,
                      borderRadius: '8px',
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text.primary }}>
                        {widget.name}
                      </span>
                      <span
                        title={qualityInfo.description}
                        style={{
                          padding: '2px 6px',
                          background: `${qualityInfo.color}20`,
                          color: qualityInfo.color,
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'help',
                        }}
                      >
                        {widget.quality}%
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: theme.text.tertiary, marginBottom: '6px' }}>
                      {widget.category}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      fontSize: '10px',
                    }}>
                      <span
                        title={LIBRARY_HELP.whatAreInputs}
                        style={{
                          padding: '2px 6px',
                          background: widget.inputCount > 0 ? 'rgba(59, 130, 246, 0.15)' : theme.bg.secondary,
                          color: widget.inputCount > 0 ? theme.accent : theme.text.tertiary,
                          borderRadius: '3px',
                          cursor: 'help',
                        }}
                      >
                        IN: {widget.inputCount}
                      </span>
                      <span
                        title={LIBRARY_HELP.whatAreOutputs}
                        style={{
                          padding: '2px 6px',
                          background: widget.outputCount > 0 ? 'rgba(34, 197, 94, 0.15)' : theme.bg.secondary,
                          color: widget.outputCount > 0 ? theme.success : theme.text.tertiary,
                          borderRadius: '3px',
                          cursor: 'help',
                        }}
                      >
                        OUT: {widget.outputCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Coverage gaps */}
          {getCoverageGaps().length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: theme.accent, marginBottom: '8px' }}>
                Suggested Next Widgets:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {getCoverageGaps().slice(0, 5).map((gap, i) => (
                  <span
                    key={i}
                    onClick={() => onSuggestionClick(gap)}
                    style={{
                      padding: '4px 10px',
                      background: theme.accentMuted,
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: theme.accent,
                      cursor: 'pointer',
                    }}
                  >
                    + {gap}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
