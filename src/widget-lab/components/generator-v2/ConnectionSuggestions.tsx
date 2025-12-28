/**
 * StickerNest v2 - Connection Suggestions Component
 * Shows pipeline auto-wiring suggestions for generated widgets
 */

import React, { useState, useMemo } from 'react';
import { theme } from '../../theme';
import type { ConnectionSuggestion } from '../../../services/widget-generator-v2';
import { getCompatibilityLabel } from '../../../services/widget-generator-v2';

interface ConnectionSuggestionsProps {
  suggestions: ConnectionSuggestion[];
  onApply?: (suggestions: ConnectionSuggestion[]) => void;
  onDismiss?: () => void;
  widgetName: string;
}

export const ConnectionSuggestions: React.FC<ConnectionSuggestionsProps> = ({
  suggestions,
  onApply,
  onDismiss,
  widgetName,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  // Group by direction
  const grouped = useMemo(() => {
    const outgoing = suggestions.filter(s => s.direction === 'outgoing');
    const incoming = suggestions.filter(s => s.direction === 'incoming');
    return { outgoing, incoming };
  }, [suggestions]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(suggestions.map(s => s.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    const selected = suggestions.filter(s => selectedIds.has(s.id));
    onApply?.(selected);
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: theme.bg.secondary,
      borderRadius: '12px',
      border: `1px solid ${theme.border}`,
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: 'none',
          borderBottom: isExpanded ? `1px solid ${theme.border}` : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>🔗</span>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: theme.text.primary,
          }}>
            Connection Suggestions
          </span>
          <span style={{
            padding: '2px 8px',
            background: theme.accent,
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'white',
          }}>
            {suggestions.length}
          </span>
        </div>
        <span style={{
          fontSize: '12px',
          color: theme.text.tertiary,
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
          transition: 'transform 0.2s ease',
        }}>
          ▶
        </span>
      </button>

      {isExpanded && (
        <>
          {/* Description */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${theme.border}`,
            fontSize: '12px',
            color: theme.text.secondary,
          }}>
            We found compatible widgets that can connect to <strong>{widgetName}</strong>.
            Select the connections you want to create.
          </div>

          {/* Selection controls */}
          <div style={{
            padding: '8px 16px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            gap: '8px',
          }}>
            <button
              onClick={selectAll}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                fontSize: '11px',
                color: theme.text.secondary,
                cursor: 'pointer',
              }}
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                fontSize: '11px',
                color: theme.text.secondary,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: theme.text.tertiary,
            }}>
              {selectedIds.size} of {suggestions.length} selected
            </span>
          </div>

          {/* Outgoing connections */}
          {grouped.outgoing.length > 0 && (
            <div>
              <div style={{
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: 600,
                color: theme.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: theme.bg.tertiary,
              }}>
                Outputs from {widgetName} →
              </div>
              {grouped.outgoing.map(suggestion => (
                <SuggestionItem
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSelected={selectedIds.has(suggestion.id)}
                  onToggle={() => toggleSelection(suggestion.id)}
                />
              ))}
            </div>
          )}

          {/* Incoming connections */}
          {grouped.incoming.length > 0 && (
            <div>
              <div style={{
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: 600,
                color: theme.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: theme.bg.tertiary,
              }}>
                → Inputs to {widgetName}
              </div>
              {grouped.incoming.map(suggestion => (
                <SuggestionItem
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSelected={selectedIds.has(suggestion.id)}
                  onToggle={() => toggleSelection(suggestion.id)}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{
            padding: '12px 16px',
            borderTop: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}>
            <button
              onClick={onDismiss}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                fontSize: '12px',
                color: theme.text.secondary,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={handleApply}
              disabled={selectedIds.size === 0}
              style={{
                padding: '8px 16px',
                background: selectedIds.size === 0
                  ? theme.bg.tertiary
                  : theme.accent,
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: selectedIds.size === 0
                  ? theme.text.tertiary
                  : 'white',
                cursor: selectedIds.size === 0
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              Apply {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Individual suggestion item
const SuggestionItem: React.FC<{
  suggestion: ConnectionSuggestion;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ suggestion, isSelected, onToggle }) => {
  const compatLabel = getCompatibilityLabel(suggestion.compatibility);

  return (
    <div
      onClick={onToggle}
      style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${theme.border}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '4px',
        border: `2px solid ${isSelected ? theme.accent : theme.border}`,
        background: isSelected ? theme.accent : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px',
        flexShrink: 0,
      }}>
        {isSelected && '✓'}
      </div>

      {/* Connection info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '2px',
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            color: theme.text.primary,
          }}>
            {suggestion.sourcePort.name}
          </span>
          <span style={{
            color: theme.text.tertiary,
            fontSize: '11px',
          }}>
            →
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            color: theme.text.primary,
          }}>
            {suggestion.targetPort.name}
          </span>
        </div>
        <div style={{
          fontSize: '11px',
          color: theme.text.secondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {suggestion.direction === 'outgoing'
            ? `→ ${suggestion.targetWidgetName}`
            : `← ${suggestion.sourceWidgetName}`
          }
        </div>
      </div>

      {/* Compatibility badge */}
      <div style={{
        padding: '2px 8px',
        background: `${compatLabel.color}20`,
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        color: compatLabel.color,
        flexShrink: 0,
      }}>
        {Math.round(suggestion.compatibility * 100)}%
      </div>
    </div>
  );
};

export default ConnectionSuggestions;
