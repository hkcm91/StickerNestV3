/**
 * StickerNest v2 - Event Debugger
 * Diagnoses widget event issues and offers AI-powered fixes
 * Shows registered listeners, recent events, and mismatches
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { RuntimeContext } from '../../runtime/RuntimeContext';
import type { Event } from '../../types/runtime';
import { getWidgetPipelineAI } from '../../ai';
import { getDraftManager } from '../../ai/DraftManager';

interface EventDebuggerProps {
  runtime: RuntimeContext;
  onFixApplied?: (widgetId: string) => void;
}

interface WidgetEventInfo {
  instanceId: string;
  name: string;
  registeredListeners: string[];
  recentEventsReceived: string[];
  recentEventsMissed: string[];
  isAIGenerated: boolean;
  manifest?: any;
}

interface RecentEvent {
  type: string;
  sourceWidgetId: string;
  sourceName: string;
  timestamp: number;
  deliveredTo: string[];
}

// Theme tokens (matching AISidebar)
const theme = {
  bg: {
    primary: '#0f0f19',
    secondary: '#1a1a2e',
    tertiary: '#252542',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    tertiary: '#64748b',
  },
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  border: 'rgba(255, 255, 255, 0.08)',
};

export const EventDebugger: React.FC<EventDebuggerProps> = ({
  runtime,
  onFixApplied,
}) => {
  const [widgetEvents, setWidgetEvents] = useState<Map<string, WidgetEventInfo>>(new Map());
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<{ widgetId: string; success: boolean; message: string } | null>(null);

  // Collect widget event registration info
  const refreshWidgetInfo = useCallback(() => {
    // Use widgetInstances from runtime context - pipelineRuntime and canvasState were deprecated
    const widgets = runtime.widgetInstances || [];
    const newWidgetEvents = new Map<string, WidgetEventInfo>();

    // Access broadcastListeners from runtime (we'll need to expose this)
    // For now, extract from manifests
    widgets.forEach((widget: any) => {
      const manifest = widget.metadata?.generatedContent?.manifest;
      const listeners = manifest?.events?.listens || [];

      newWidgetEvents.set(widget.id, {
        instanceId: widget.id,
        name: manifest?.name || widget.widgetDefId || 'Unknown Widget',
        registeredListeners: listeners,
        recentEventsReceived: [],
        recentEventsMissed: [],
        isAIGenerated: !!widget.metadata?.generatedContent,
        manifest,
      });
    });

    setWidgetEvents(newWidgetEvents);
  }, [runtime]);

  // Listen for events to track what's flowing
  useEffect(() => {
    refreshWidgetInfo();

    const eventBus = runtime.eventBus;
    if (!eventBus) return;

    // Track broadcast events
    const unsubOutput = eventBus.on('widget:output', (event: Event) => {
      const { widgetInstanceId, portName, value } = event.payload || {};
      if (!widgetInstanceId || !portName) return;

      // Find source widget name
      const widgets = runtime.widgetInstances || [];
      const sourceWidget = widgets.find(w => w.id === widgetInstanceId);
      const sourceName = sourceWidget?.metadata?.generatedContent?.manifest?.name || 'Unknown';

      // Determine which widgets received this event
      const deliveredTo: string[] = [];
      widgetEvents.forEach((info, id) => {
        if (id === widgetInstanceId) return; // Skip source

        // Check if widget listens for this event
        const listensExact = info.registeredListeners.includes(portName);
        const namespace = portName.includes(':') ? portName.split(':')[0] : null;
        const listensWildcard = namespace && info.registeredListeners.includes(`${namespace}:*`);
        const listensAll = info.registeredListeners.includes('*');

        if (listensExact || listensWildcard || listensAll) {
          deliveredTo.push(id);
        }
      });

      setRecentEvents(prev => [{
        type: portName,
        sourceWidgetId: widgetInstanceId,
        sourceName,
        timestamp: Date.now(),
        deliveredTo,
      }, ...prev.slice(0, 49)]); // Keep last 50
    });

    return () => {
      unsubOutput();
    };
  }, [runtime, refreshWidgetInfo, widgetEvents]);

  // Refresh periodically
  useEffect(() => {
    const interval = setInterval(refreshWidgetInfo, 2000);
    return () => clearInterval(interval);
  }, [refreshWidgetInfo]);

  // AI Fix function
  const handleAIFix = async (widgetId: string) => {
    const widgetInfo = widgetEvents.get(widgetId);
    if (!widgetInfo || !widgetInfo.isAIGenerated) {
      setFixResult({
        widgetId,
        success: false,
        message: 'Can only fix AI-generated widgets',
      });
      return;
    }

    setIsFixing(widgetId);
    setFixResult(null);

    try {
      // Analyze what events the widget should be listening for
      const allRecentEventTypes = [...new Set(recentEvents.map(e => e.type))];
      const namespace = widgetInfo.name.toLowerCase().includes('farm') ? 'farm' :
                       widgetInfo.name.toLowerCase().includes('audio') ? 'audio' :
                       widgetInfo.name.toLowerCase().includes('vector') ? 'vector' :
                       null;

      // Find events in same namespace that this widget isn't listening to
      const relevantEvents = namespace
        ? allRecentEventTypes.filter(e => e.startsWith(`${namespace}:`))
        : allRecentEventTypes;

      const missingEvents = relevantEvents.filter(e => {
        const listensExact = widgetInfo.registeredListeners.includes(e);
        const ns = e.includes(':') ? e.split(':')[0] : null;
        const listensWildcard = ns && widgetInfo.registeredListeners.includes(`${ns}:*`);
        return !listensExact && !listensWildcard;
      });

      if (missingEvents.length === 0 && widgetInfo.registeredListeners.length > 0) {
        setFixResult({
          widgetId,
          success: true,
          message: 'Widget is already listening for all relevant events!',
        });
        setIsFixing(null);
        return;
      }

      // Generate fix instructions
      const ai = getWidgetPipelineAI();
      const draftManager = getDraftManager();

      // Find the draft for this widget
      const widget = ((runtime.widgetInstances || []) as any[]).find(w => w.id === widgetId);
      if (!widget?.metadata?.generatedContent) {
        throw new Error('Cannot find widget draft');
      }

      const suggestedListeners = namespace
        ? [`${namespace}:*`] // Use wildcard for family
        : missingEvents;

      // Create modification request
      const fixInstructions = `
Fix the event listeners for this widget. Current issue: Widget is not receiving events.

Current listeners: ${JSON.stringify(widgetInfo.registeredListeners)}
Missing events: ${JSON.stringify(missingEvents)}

Please update the manifest to include these listeners: ${JSON.stringify(suggestedListeners)}

Also ensure the widget's JavaScript handles these events with a proper message handler like:
window.addEventListener('message', (e) => {
  if (e.data.type === 'EVENT' || e.data.type === 'widget:event') {
    const eventType = e.data.payload?.type || e.data.eventType;
    handleEvent(eventType, e.data.payload);
  }
});
`;

      const result = await ai.modifyWidget({
        widgetId: widget.metadata?.draftId || widgetId,
        instructions: fixInstructions,
        modificationType: 'add-events',
      });

      if (result.success && result.widget) {
        // Update the widget on canvas
        const newManifest = result.widget.manifest;
        const newHtml = result.widget.html;

        // Update draft
        draftManager.updateDraft(result.widget.id, {
          manifest: newManifest,
          html: newHtml,
        });

        setFixResult({
          widgetId,
          success: true,
          message: `Fixed! Now listening for: ${newManifest.events?.listens?.join(', ') || 'updated events'}`,
        });

        onFixApplied?.(widgetId);
      } else {
        throw new Error((result as any).errors?.[0] || (result as any).error || 'Fix failed');
      }
    } catch (error) {
      setFixResult({
        widgetId,
        success: false,
        message: error instanceof Error ? error.message : 'Fix failed',
      });
    } finally {
      setIsFixing(null);
    }
  };

  // Quick fix - just update manifest listeners
  const handleQuickFix = (widgetId: string) => {
    const widgetInfo = widgetEvents.get(widgetId);
    const widget = ((runtime.widgetInstances || []) as any[]).find(w => w.id === widgetId);

    if (!widgetInfo || !widget?.metadata?.generatedContent?.manifest) {
      setFixResult({
        widgetId,
        success: false,
        message: 'Cannot quick-fix this widget',
      });
      return;
    }

    // Detect namespace from widget name
    const name = widgetInfo.name.toLowerCase();
    let namespace = 'app';
    if (name.includes('farm')) namespace = 'farm';
    else if (name.includes('audio')) namespace = 'audio';
    else if (name.includes('vector')) namespace = 'vector';
    else if (name.includes('task')) namespace = 'tasks';

    // Update manifest with wildcard listener
    const manifest = widget.metadata.generatedContent.manifest;
    manifest.events = manifest.events || {};
    manifest.events.listens = manifest.events.listens || [];

    if (!manifest.events.listens.includes(`${namespace}:*`)) {
      manifest.events.listens.push(`${namespace}:*`);
    }

    // Force re-registration by updating widget
    // TODO: implement widget update - runtime.updateWidgetInstance was called here
    // For now, update local metadata only
    if (widget) {
      widget.metadata = {
        ...widget.metadata,
        generatedContent: {
          ...widget.metadata.generatedContent,
          manifest,
        },
      };
    }

    setFixResult({
      widgetId,
      success: true,
      message: `Added ${namespace}:* listener. Reload widget to apply.`,
    });

    refreshWidgetInfo();
  };

  const getEventNamespace = (eventType: string): string | null => {
    return eventType.includes(':') ? eventType.split(':')[0] : null;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      color: theme.text.primary,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 600 }}>Event Debugger</span>
        <button
          onClick={refreshWidgetInfo}
          style={{
            padding: '4px 8px',
            background: theme.bg.tertiary,
            border: 'none',
            borderRadius: 4,
            color: theme.text.secondary,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Widget List */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 12,
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11,
            color: theme.text.tertiary,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            Widgets ({widgetEvents.size})
          </div>

          {Array.from(widgetEvents.values()).map(info => {
            const hasListeners = info.registeredListeners.length > 0;
            const isSelected = selectedWidget === info.instanceId;

            return (
              <div
                key={info.instanceId}
                onClick={() => setSelectedWidget(isSelected ? null : info.instanceId)}
                style={{
                  padding: '10px 12px',
                  marginBottom: 8,
                  background: isSelected ? theme.bg.tertiary : theme.bg.secondary,
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? theme.accent : theme.border}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <span style={{ fontWeight: 500 }}>{info.name}</span>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: hasListeners ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: hasListeners ? theme.success : theme.error,
                  }}>
                    {hasListeners ? `${info.registeredListeners.length} listeners` : 'No listeners'}
                  </span>
                </div>

                {info.registeredListeners.length > 0 ? (
                  <div style={{ fontSize: 12, color: theme.text.secondary }}>
                    {info.registeredListeners.map(l => (
                      <span key={l} style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        marginRight: 4,
                        marginBottom: 4,
                        background: theme.bg.primary,
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: 11,
                      }}>
                        {l}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: theme.error }}>
                    ⚠️ Not listening for any events
                  </div>
                )}

                {/* Fix buttons */}
                {isSelected && info.isAIGenerated && (
                  <div style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${theme.border}`,
                    display: 'flex',
                    gap: 8,
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickFix(info.instanceId); }}
                      disabled={isFixing === info.instanceId}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: theme.warning,
                        border: 'none',
                        borderRadius: 6,
                        color: '#000',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      Quick Fix (Add Wildcard)
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAIFix(info.instanceId); }}
                      disabled={isFixing === info.instanceId}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: theme.accent,
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      {isFixing === info.instanceId ? 'Fixing...' : 'AI Fix'}
                    </button>
                  </div>
                )}

                {/* Fix result */}
                {fixResult && fixResult.widgetId === info.instanceId && (
                  <div style={{
                    marginTop: 8,
                    padding: 8,
                    background: fixResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 4,
                    fontSize: 12,
                    color: fixResult.success ? theme.success : theme.error,
                  }}>
                    {fixResult.message}
                  </div>
                )}
              </div>
            );
          })}

          {widgetEvents.size === 0 && (
            <div style={{
              padding: 20,
              textAlign: 'center',
              color: theme.text.tertiary,
              fontSize: 13,
            }}>
              No widgets on canvas
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div>
          <div style={{
            fontSize: 11,
            color: theme.text.tertiary,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            Recent Events ({recentEvents.length})
          </div>

          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {recentEvents.slice(0, 20).map((event, idx) => (
              <div
                key={`${event.type}-${event.timestamp}-${idx}`}
                style={{
                  padding: '8px 10px',
                  marginBottom: 4,
                  background: theme.bg.secondary,
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                  <span style={{
                    fontFamily: 'monospace',
                    color: theme.accent,
                  }}>
                    {event.type}
                  </span>
                  <span style={{ color: theme.text.tertiary, fontSize: 10 }}>
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                <div style={{ color: theme.text.secondary, fontSize: 11 }}>
                  From: {event.sourceName} → {event.deliveredTo.length} widget(s)
                </div>
              </div>
            ))}

            {recentEvents.length === 0 && (
              <div style={{
                padding: 16,
                textAlign: 'center',
                color: theme.text.tertiary,
                fontSize: 12,
              }}>
                No events yet. Interact with widgets to see events flow.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help text */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${theme.border}`,
        fontSize: 11,
        color: theme.text.tertiary,
        lineHeight: 1.5,
      }}>
        <strong>Tips:</strong> Click a widget to see fix options.
        "Quick Fix" adds a wildcard listener. "AI Fix" regenerates the event handling code.
      </div>
    </div>
  );
};

export default EventDebugger;
