/**
 * Pipeline Builder Section
 * AI-powered pipeline creation from existing widgets
 */

import React from 'react';
import { theme } from '../theme';
import { SECTIONS, TOOLTIPS } from '../help';
import type {
  LibraryWidgetInfo,
  AISuggestedConnection,
  WIDGET_CATEGORIES
} from '../WidgetLab.types';
import { WIDGET_CATEGORIES as CATEGORIES } from '../WidgetLab.types';

export interface PipelineBuilderSectionProps {
  libraryWidgets: LibraryWidgetInfo[];
  selectedLibraryWidgets: string[];
  setSelectedLibraryWidgets: React.Dispatch<React.SetStateAction<string[]>>;
  pipelinePrompt: string;
  setPipelinePrompt: React.Dispatch<React.SetStateAction<string>>;
  newPipelineName: string;
  setNewPipelineName: React.Dispatch<React.SetStateAction<string>>;
  aiSuggestedConnections: AISuggestedConnection[];
  setAiSuggestedConnections: React.Dispatch<React.SetStateAction<AISuggestedConnection[]>>;
  expandedCategories: Set<string>;
  setExpandedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
  isAiAnalyzing: boolean;
  isCreatingPipeline: boolean;
  selectedModel: string;
  onAiAnalyzePipeline: () => Promise<void>;
  onCreatePipeline: () => Promise<void>;
}

// Group widgets by category
function groupWidgetsByCategory(libraryWidgets: LibraryWidgetInfo[]) {
  const groups: Record<string, LibraryWidgetInfo[]> = {};
  const assigned = new Set<string>();

  for (const cat of CATEGORIES) {
    groups[cat.id] = [];
  }

  for (const widget of libraryWidgets) {
    const id = widget.id.toLowerCase();
    for (const cat of CATEGORIES) {
      if (cat.id !== 'Other' && cat.match(id) && !assigned.has(widget.id)) {
        groups[cat.id].push(widget);
        assigned.add(widget.id);
        break;
      }
    }
  }

  // Add remaining to Other
  for (const widget of libraryWidgets) {
    if (!assigned.has(widget.id)) {
      groups['Other'].push(widget);
    }
  }

  return groups;
}

export const PipelineBuilderSection: React.FC<PipelineBuilderSectionProps> = ({
  libraryWidgets,
  selectedLibraryWidgets,
  setSelectedLibraryWidgets,
  pipelinePrompt,
  setPipelinePrompt,
  newPipelineName,
  setNewPipelineName,
  aiSuggestedConnections,
  setAiSuggestedConnections,
  expandedCategories,
  setExpandedCategories,
  isAiAnalyzing,
  isCreatingPipeline,
  onAiAnalyzePipeline,
  onCreatePipeline,
}) => {
  const groupedWidgets = React.useMemo(
    () => groupWidgetsByCategory(libraryWidgets),
    [libraryWidgets]
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12))',
      borderRadius: '12px',
      border: `2px solid rgba(139, 92, 246, 0.3)`,
      padding: '20px',
      marginBottom: '24px',
    }}>
      {/* Header with help text */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <span style={{ fontSize: '28px' }}>🧩</span>
        <div style={{ flex: 1 }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: theme.text.primary,
          }}>
            {SECTIONS.pipelineBuilder.title}
          </h2>
          <p style={{
            margin: '4px 0 0',
            fontSize: '13px',
            color: theme.text.secondary,
          }}>
            {SECTIONS.pipelineBuilder.help}
          </p>
        </div>
      </div>

      {/* AI Prompt Input */}
      <div style={{
        marginBottom: '16px',
        padding: '16px',
        background: theme.bg.secondary,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
      }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          color: theme.accent,
          fontWeight: 600,
          marginBottom: '8px',
          textTransform: 'uppercase',
        }}>
          Describe Your Pipeline Goal
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="e.g., Create a color picker that sends colors to a receiver widget..."
            value={pipelinePrompt}
            onChange={(e) => setPipelinePrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isAiAnalyzing && onAiAnalyzePipeline()}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: theme.bg.tertiary,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              color: theme.text.primary,
              fontSize: '13px',
            }}
          />
          <button
            onClick={onAiAnalyzePipeline}
            disabled={isAiAnalyzing || !pipelinePrompt.trim()}
            title={TOOLTIPS.aiSelect}
            style={{
              padding: '12px 20px',
              background: isAiAnalyzing || !pipelinePrompt.trim()
                ? theme.bg.tertiary
                : theme.accent,
              border: 'none',
              borderRadius: '6px',
              color: isAiAnalyzing || !pipelinePrompt.trim() ? theme.text.tertiary : 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isAiAnalyzing || !pipelinePrompt.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            {isAiAnalyzing ? (
              <>
                <span style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Analyzing...
              </>
            ) : (
              <>&#10024; AI Select</>
            )}
          </button>
        </div>
        {/* Help text for pipeline builder */}
        <p style={{
          margin: '10px 0 0',
          fontSize: '11px',
          color: theme.text.tertiary,
          fontStyle: 'italic',
        }}>
          {SECTIONS.pipelineBuilder.learnMore}
        </p>
        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['Color sender to receiver', 'Button triggers progress bar', 'Timer controls text display'].map(example => (
            <button
              key={example}
              onClick={() => setPipelinePrompt(example)}
              style={{
                padding: '4px 8px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text.tertiary,
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Widget Categories */}
      <div style={{
        marginBottom: '16px',
        background: theme.bg.tertiary,
        borderRadius: '8px',
        maxHeight: '280px',
        overflowY: 'auto',
      }}>
        {CATEGORIES.map(category => {
          const widgets = groupedWidgets[category.id] || [];
          if (widgets.length === 0) return null;
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div key={category.id}>
              {/* Category Header */}
              <button
                onClick={() => {
                  setExpandedCategories(prev => {
                    const next = new Set(prev);
                    if (next.has(category.id)) {
                      next.delete(category.id);
                    } else {
                      next.add(category.id);
                    }
                    return next;
                  });
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: theme.bg.secondary,
                  border: 'none',
                  borderBottom: `1px solid ${theme.border}`,
                  color: theme.text.primary,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  display: 'inline-block',
                  fontSize: '10px',
                }}>▶</span>
                <span>{category.icon}</span>
                <span>{category.id}</span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '10px',
                  color: theme.text.tertiary,
                  background: theme.bg.tertiary,
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}>
                  {widgets.filter(w => selectedLibraryWidgets.includes(w.id)).length}/{widgets.length}
                </span>
              </button>

              {/* Category Widgets */}
              {isExpanded && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '6px',
                  padding: '10px',
                }}>
                  {widgets.map(widget => (
                    <label
                      key={widget.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px 10px',
                        background: selectedLibraryWidgets.includes(widget.id)
                          ? theme.accentMuted
                          : theme.bg.secondary,
                        border: selectedLibraryWidgets.includes(widget.id)
                          ? `1px solid ${theme.accent}`
                          : `1px solid ${theme.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLibraryWidgets.includes(widget.id)}
                        onChange={() => {
                          setSelectedLibraryWidgets(prev =>
                            prev.includes(widget.id)
                              ? prev.filter(id => id !== widget.id)
                              : [...prev, widget.id]
                          );
                          setAiSuggestedConnections([]); // Clear AI suggestions on manual change
                        }}
                        style={{ accentColor: theme.accent, marginTop: '2px' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '11px',
                          color: selectedLibraryWidgets.includes(widget.id)
                            ? theme.text.primary
                            : theme.text.secondary,
                          fontWeight: selectedLibraryWidgets.includes(widget.id) ? 500 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {widget.name}
                        </div>
                        {(widget.inputs || widget.outputs) && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {widget.inputs && Object.keys(widget.inputs).length > 0 && (
                              <span style={{ fontSize: '9px', color: theme.accent, background: 'rgba(59,130,246,0.15)', padding: '1px 4px', borderRadius: '3px' }}>
                                IN:{Object.keys(widget.inputs).length}
                              </span>
                            )}
                            {widget.outputs && Object.keys(widget.outputs).length > 0 && (
                              <span style={{ fontSize: '9px', color: theme.success, background: 'rgba(34,197,94,0.15)', padding: '1px 4px', borderRadius: '3px' }}>
                                OUT:{Object.keys(widget.outputs).length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {libraryWidgets.length === 0 && (
          <div style={{
            padding: '30px',
            textAlign: 'center',
            color: theme.text.tertiary,
            fontSize: '12px',
          }}>
            Loading widgets...
          </div>
        )}
      </div>

      {/* AI Suggested Connections */}
      {aiSuggestedConnections.length > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '8px',
          border: `1px solid ${theme.success}`,
        }}>
          <div style={{
            fontSize: '11px',
            color: theme.success,
            fontWeight: 600,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            ✓ AI Suggested {aiSuggestedConnections.length} Connection{aiSuggestedConnections.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {aiSuggestedConnections.map((conn, idx) => (
              <div key={idx} style={{
                fontSize: '11px',
                color: theme.text.secondary,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{ color: theme.accent, fontFamily: 'monospace' }}>{conn.from}</span>
                <span style={{ color: theme.text.tertiary }}>→</span>
                <span style={{ color: theme.success, fontFamily: 'monospace' }}>{conn.to}</span>
                <span style={{ color: theme.text.tertiary, fontSize: '10px' }}>({conn.fromPort} → {conn.toPort})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected count and actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '13px',
            color: selectedLibraryWidgets.length >= 2 ? theme.success : theme.text.tertiary,
            fontWeight: 500,
          }}>
            {selectedLibraryWidgets.length} widget{selectedLibraryWidgets.length !== 1 ? 's' : ''} selected
            {selectedLibraryWidgets.length < 2 && ' (select 2+)'}
          </span>
          {selectedLibraryWidgets.length > 0 && (
            <button
              onClick={() => {
                setSelectedLibraryWidgets([]);
                setAiSuggestedConnections([]);
                setNewPipelineName('');
              }}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text.tertiary,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Clear All
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            placeholder="Pipeline name..."
            value={newPipelineName}
            onChange={(e) => setNewPipelineName(e.target.value)}
            style={{
              padding: '10px 14px',
              background: theme.bg.secondary,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              color: theme.text.primary,
              fontSize: '13px',
              width: '180px',
            }}
          />
          <button
            onClick={onCreatePipeline}
            disabled={isCreatingPipeline || selectedLibraryWidgets.length < 2}
            style={{
              padding: '10px 20px',
              background: isCreatingPipeline || selectedLibraryWidgets.length < 2
                ? theme.bg.tertiary
                : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              border: 'none',
              borderRadius: '6px',
              color: isCreatingPipeline || selectedLibraryWidgets.length < 2
                ? theme.text.tertiary
                : 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isCreatingPipeline || selectedLibraryWidgets.length < 2
                ? 'not-allowed'
                : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            {isCreatingPipeline ? (
              <>
                <span style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Creating...
              </>
            ) : (
              <>🔗 Create Pipeline</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipelineBuilderSection;
