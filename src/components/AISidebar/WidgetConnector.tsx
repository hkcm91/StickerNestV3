/**
 * StickerNest v2 - Widget Connector
 * UI for selecting widgets to connect and viewing AI-suggested connections
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { RuntimeContext } from '../../runtime/RuntimeContext';
import type { WidgetInstance } from '../../types/domain';
import type { WidgetManifest } from '../../types/manifest';
import type { DraftWidget } from '../../ai/DraftManager';
import { analyzeConnections, type ConnectionSuggestion } from '../../ai/ConnectionAnalyzer';

export interface WidgetConnectorProps {
  runtime: RuntimeContext;
  currentDraft: DraftWidget | null;
  onConnectionSelect: (suggestion: ConnectionSuggestion) => void;
  onApplyConnections: (suggestions: ConnectionSuggestion[]) => void;
}

interface CanvasWidget {
  instance: WidgetInstance;
  manifest: WidgetManifest | null;
}

export const WidgetConnector: React.FC<WidgetConnectorProps> = ({
  runtime,
  currentDraft,
  onConnectionSelect,
  onApplyConnections,
}) => {
  const [canvasWidgets, setCanvasWidgets] = useState<CanvasWidget[]>([]);
  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load canvas widgets
  useEffect(() => {
    const loadCanvasWidgets = async () => {
      try {
        // Get all widget instances from the canvas
        const instances = runtime.getInstancesByZIndex();
        
        // Load manifests for each widget
        const widgetsWithManifests: CanvasWidget[] = [];
        for (const instance of instances) {
          // Try to get manifest from metadata or loader
          let manifest: WidgetManifest | null = null;
          
          if (instance.metadata?.generatedContent?.manifest) {
            manifest = instance.metadata.generatedContent.manifest;
          }
          
          widgetsWithManifests.push({ instance, manifest });
        }
        
        setCanvasWidgets(widgetsWithManifests);
      } catch (error) {
        console.error('Failed to load canvas widgets:', error);
      }
    };

    loadCanvasWidgets();

    // Subscribe to widget changes
    const unsubAdd = runtime.eventBus.on('widget:added', loadCanvasWidgets);
    const unsubRemove = runtime.eventBus.on('widget:removed', loadCanvasWidgets);

    return () => {
      unsubAdd();
      unsubRemove();
    };
  }, [runtime]);

  // Toggle widget selection
  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets(prev => {
      const next = new Set(prev);
      if (next.has(widgetId)) {
        next.delete(widgetId);
      } else {
        next.add(widgetId);
      }
      return next;
    });
  };

  // Analyze connections when draft or selection changes
  const analyzeSelectedConnections = async () => {
    if (!currentDraft?.manifest) {
      setSuggestions([]);
      return;
    }

    setIsAnalyzing(true);
    try {
      const selectedManifests = canvasWidgets
        .filter(w => selectedWidgets.has(w.instance.id) && w.manifest)
        .map(w => ({ instanceId: w.instance.id, manifest: w.manifest! }));

      const newSuggestions = await analyzeConnections(
        currentDraft.manifest,
        selectedManifests
      );

      setSuggestions(newSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Connection analysis failed:', error);
      setSuggestions([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze when draft or selection changes
  useEffect(() => {
    if (currentDraft && selectedWidgets.size > 0) {
      analyzeSelectedConnections();
    } else {
      setSuggestions([]);
    }
  }, [currentDraft?.id, selectedWidgets.size]);

  // Get compatible suggestions
  const compatibleSuggestions = useMemo(() => 
    suggestions.filter(s => s.compatibility > 0.5),
    [suggestions]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '0.9rem' }}>
          🔗 Widget Connections
        </h4>
        {selectedWidgets.size > 0 && (
          <span style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>
            {selectedWidgets.size} selected
          </span>
        )}
      </div>

      {/* Current Draft Info */}
      {currentDraft ? (
        <div style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 6,
          padding: '8px 12px',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginBottom: 4 }}>
            Connecting from:
          </div>
          <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>
            {currentDraft.manifest?.name || currentDraft.id}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
            Outputs: {Object.keys(currentDraft.manifest?.outputs || {}).join(', ') || 'none'}
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 6,
          padding: '12px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.85rem',
        }}>
          Generate or select a widget to see connection options
        </div>
      )}

      {/* Canvas Widgets List */}
      <div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#94a3b8', 
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>Canvas Widgets ({canvasWidgets.length})</span>
          {canvasWidgets.length > 0 && (
            <button
              onClick={() => {
                if (selectedWidgets.size === canvasWidgets.length) {
                  setSelectedWidgets(new Set());
                } else {
                  setSelectedWidgets(new Set(canvasWidgets.map(w => w.instance.id)));
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b5cf6',
                fontSize: '0.7rem',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {selectedWidgets.size === canvasWidgets.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        <div style={{ 
          maxHeight: 200, 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          {canvasWidgets.length === 0 ? (
            <div style={{ 
              color: '#64748b', 
              fontSize: '0.8rem',
              padding: '12px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 6,
            }}>
              No widgets on canvas yet
            </div>
          ) : (
            canvasWidgets.map(widget => (
              <div
                key={widget.instance.id}
                onClick={() => toggleWidget(widget.instance.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: selectedWidgets.has(widget.instance.id)
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'rgba(255,255,255,0.03)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: selectedWidgets.has(widget.instance.id)
                    ? '1px solid rgba(139, 92, 246, 0.4)'
                    : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedWidgets.has(widget.instance.id)}
                  onChange={() => {}}
                  style={{ accentColor: '#8b5cf6' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    color: '#e2e8f0', 
                    fontSize: '0.8rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {widget.manifest?.name || widget.instance.widgetDefId}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    {widget.manifest ? (
                      <>
                        In: {Object.keys(widget.manifest.inputs || {}).length} | 
                        Out: {Object.keys(widget.manifest.outputs || {}).length}
                      </>
                    ) : (
                      'Manifest unknown'
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Analyze Button */}
      {currentDraft && selectedWidgets.size > 0 && (
        <button
          onClick={analyzeSelectedConnections}
          disabled={isAnalyzing}
          style={{
            padding: '10px',
            background: isAnalyzing ? 'rgba(139, 92, 246, 0.3)' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: isAnalyzing ? 'default' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isAnalyzing ? (
            <>
              <span className="spinner">⚙️</span>
              Analyzing...
            </>
          ) : (
            <>
              🔍 Analyze Connections
            </>
          )}
        </button>
      )}

      {/* Connection Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#94a3b8', 
            marginBottom: 8,
          }}>
            Suggested Connections ({compatibleSuggestions.length})
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 6,
            maxHeight: 200,
            overflowY: 'auto',
          }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => onConnectionSelect(suggestion)}
                style={{
                  padding: '10px',
                  background: suggestion.compatibility > 0.7 
                    ? 'rgba(16, 185, 129, 0.1)'
                    : suggestion.compatibility > 0.5
                    ? 'rgba(251, 191, 36, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: `1px solid ${
                    suggestion.compatibility > 0.7 
                      ? 'rgba(16, 185, 129, 0.3)'
                      : suggestion.compatibility > 0.5
                      ? 'rgba(251, 191, 36, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'
                  }`,
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                  <span style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>
                    {suggestion.fromPort} → {suggestion.toPort}
                  </span>
                  <span style={{ 
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: suggestion.compatibility > 0.7 
                      ? 'rgba(16, 185, 129, 0.2)'
                      : suggestion.compatibility > 0.5
                      ? 'rgba(251, 191, 36, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)',
                    color: suggestion.compatibility > 0.7 
                      ? '#10b981'
                      : suggestion.compatibility > 0.5
                      ? '#fbbf24'
                      : '#ef4444',
                  }}>
                    {Math.round(suggestion.compatibility * 100)}%
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {suggestion.description}
                </div>
              </div>
            ))}
          </div>

          {/* Apply Connections */}
          {compatibleSuggestions.length > 0 && (
            <button
              onClick={() => onApplyConnections(compatibleSuggestions)}
              style={{
                marginTop: 8,
                padding: '10px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
                width: '100%',
              }}
            >
              ✓ Apply {compatibleSuggestions.length} Connection{compatibleSuggestions.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WidgetConnector;

