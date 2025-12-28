/**
 * Widget Generator 2.0 - Tab 4: Behavior Simulator
 *
 * Live simulation environment:
 * - Click events
 * - Hover events
 * - Mount events
 * - Idle loops
 * - Actions testing
 * - Exposed methods testing
 * - Mod-layer override testing
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { SpecJSON, GeneratedWidgetPackage, EventTrigger } from '../../../types/specjson';

interface BehaviorSimulatorProps {
  spec: SpecJSON;
  package: GeneratedWidgetPackage | null;
}

interface SimulatorEvent {
  id: string;
  type: string;
  timestamp: number;
  data?: unknown;
  direction: 'in' | 'out';
}

interface SimulatorState {
  [key: string]: unknown;
}

export function BehaviorSimulator({ spec, package: pkg }: BehaviorSimulatorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<SimulatorEvent[]>([]);
  const [state, setState] = useState<SimulatorState>({});
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Initialize state from spec
  useEffect(() => {
    const initialState: SimulatorState = {};
    for (const [key, field] of Object.entries(spec.state)) {
      initialState[key] = field.default ?? getDefaultValue(field.type);
    }
    setState(initialState);
  }, [spec]);

  // Load widget in iframe
  const loadWidget = useCallback(() => {
    if (!pkg || !iframeRef.current) return;

    const indexFile = pkg.files.find(f => f.path === 'index.html');
    if (!indexFile) return;

    // Create blob URL for iframe
    const blob = new Blob([indexFile.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;
    setIsRunning(true);

    // Cleanup blob URL on unmount
    return () => URL.revokeObjectURL(url);
  }, [pkg]);

  // Handle messages from widget
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      // Log all events
      const newEvent: SimulatorEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: type || 'unknown',
        timestamp: Date.now(),
        data: payload,
        direction: 'out'
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 100));

      // Handle specific events
      if (type === 'READY') {
        // Send init event
        sendToWidget('INIT', { state });
      } else if (type === 'STATE_PATCH') {
        setState(prev => ({ ...prev, ...payload }));
      } else if (type === 'widget:emit') {
        // Widget emitting an event
      } else if (type === 'widget:output') {
        // Widget emitting output
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [state]);

  // Send message to widget
  const sendToWidget = useCallback((type: string, payload?: unknown) => {
    if (!iframeRef.current?.contentWindow) return;

    const event: SimulatorEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      timestamp: Date.now(),
      data: payload,
      direction: 'in'
    };
    setEvents(prev => [event, ...prev].slice(0, 100));

    iframeRef.current.contentWindow.postMessage({ type, payload }, '*');
  }, []);

  // Trigger an event
  const triggerEvent = useCallback((trigger: EventTrigger) => {
    sendToWidget('widget:event', { type: trigger, data: {} });
  }, [sendToWidget]);

  // Execute an action
  const executeAction = useCallback((actionId: string) => {
    // In a real implementation, this would call the action in the widget
    sendToWidget('widget:event', { type: 'action', data: { action: actionId } });
  }, [sendToWidget]);

  // Call exposed API method
  const callAPIMethod = useCallback((methodId: string) => {
    sendToWidget('widget:api', { method: methodId });
  }, [sendToWidget]);

  // Send pipeline input
  const sendPipelineInput = useCallback((portId: string, value: unknown) => {
    sendToWidget('pipeline:input', { portName: portId, value });
  }, [sendToWidget]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Reset simulator
  const resetSimulator = useCallback(() => {
    setEvents([]);
    const initialState: SimulatorState = {};
    for (const [key, field] of Object.entries(spec.state)) {
      initialState[key] = field.default ?? getDefaultValue(field.type);
    }
    setState(initialState);
    if (isRunning) {
      loadWidget();
    }
  }, [spec, isRunning, loadWidget]);

  return (
    <div className="behavior-simulator">
      {/* Simulator Toolbar */}
      <div className="simulator-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-title">Behavior Simulator</span>
          <span className={`status-badge ${isRunning ? 'running' : 'stopped'}`}>
            {isRunning ? '● Running' : '○ Stopped'}
          </span>
        </div>
        <div className="toolbar-right">
          {!isRunning ? (
            <button className="toolbar-btn primary" onClick={loadWidget} disabled={!pkg}>
              <span>▶️</span> Start Simulation
            </button>
          ) : (
            <button className="toolbar-btn" onClick={() => setIsRunning(false)}>
              <span>⏹️</span> Stop
            </button>
          )}
          <button className="toolbar-btn" onClick={resetSimulator}>
            <span>🔄</span> Reset
          </button>
          <button className="toolbar-btn" onClick={clearEvents}>
            <span>🗑️</span> Clear Events
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="simulator-content">
        {/* Widget Preview */}
        <div className="preview-section">
          <div className="preview-header">
            <span>Widget Preview</span>
            <span className="preview-size">{spec.size?.width || 200}x{spec.size?.height || 200}</span>
          </div>
          <div className="preview-container">
            {!pkg ? (
              <div className="preview-placeholder">
                <span className="placeholder-icon">⚙️</span>
                <p>Generate code first to preview</p>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                className="widget-iframe"
                style={{
                  width: spec.size?.width || 200,
                  height: spec.size?.height || 200
                }}
                sandbox="allow-scripts"
                title="Widget Preview"
              />
            )}
          </div>
        </div>

        {/* Controls Panel */}
        <div className="controls-section">
          {/* Event Triggers */}
          <div className="control-panel">
            <h4>Event Triggers</h4>
            <div className="trigger-grid">
              {(['onClick', 'onDoubleClick', 'onHover', 'onHoverEnd', 'onMount', 'onResize'] as EventTrigger[]).map(trigger => (
                <button
                  key={trigger}
                  className="trigger-btn"
                  onClick={() => triggerEvent(trigger)}
                  disabled={!isRunning}
                >
                  {trigger}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="control-panel">
            <h4>Actions</h4>
            {Object.keys(spec.actions).length === 0 ? (
              <p className="empty-text">No actions defined</p>
            ) : (
              <div className="action-list">
                {Object.entries(spec.actions).map(([id, action]) => (
                  <button
                    key={id}
                    className="action-btn"
                    onClick={() => executeAction(id)}
                    disabled={!isRunning}
                  >
                    <span className="action-type">{action.type}</span>
                    <span className="action-id">{id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* API Methods */}
          <div className="control-panel">
            <h4>Exposed API Methods</h4>
            {spec.api.exposes.length === 0 ? (
              <p className="empty-text">No methods exposed</p>
            ) : (
              <div className="api-list">
                {spec.api.exposes.map(method => (
                  <button
                    key={method.id}
                    className="api-btn"
                    onClick={() => callAPIMethod(method.id)}
                    disabled={!isRunning}
                  >
                    {method.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline Inputs */}
          <div className="control-panel">
            <h4>Pipeline Inputs</h4>
            {spec.api.inputs.length === 0 ? (
              <p className="empty-text">No inputs defined</p>
            ) : (
              <div className="input-list">
                {spec.api.inputs.map(port => (
                  <div key={port.id} className="input-row">
                    <span className="input-name">{port.name}</span>
                    <input
                      type="text"
                      placeholder={`${port.type} value`}
                      className="input-field"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value;
                          sendPipelineInput(port.id, parseValue(value, port.type));
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* State & Events Panel */}
        <div className="monitor-section">
          {/* State Monitor */}
          <div className="monitor-panel">
            <h4>State Monitor</h4>
            <div className="state-grid">
              {Object.entries(state).map(([key, value]) => (
                <div key={key} className="state-row">
                  <span className="state-key">{key}</span>
                  <span className={`state-value type-${typeof value}`}>
                    {JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Log */}
          <div className="monitor-panel events">
            <h4>Event Log ({events.length})</h4>
            <div className="event-log">
              {events.length === 0 ? (
                <p className="empty-text">No events yet</p>
              ) : (
                events.map(event => (
                  <div
                    key={event.id}
                    className={`event-row ${event.direction}`}
                  >
                    <span className="event-direction">
                      {event.direction === 'in' ? '→' : '←'}
                    </span>
                    <span className="event-type">{event.type}</span>
                    <span className="event-time">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    {event.data && (
                      <span className="event-data">
                        {JSON.stringify(event.data).slice(0, 50)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .behavior-simulator {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 16px;
        }

        .simulator-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .toolbar-title {
          font-weight: 600;
          font-size: 14px;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.running {
          background: rgba(46, 204, 113, 0.2);
          color: #2ecc71;
        }

        .status-badge.stopped {
          background: rgba(149, 165, 166, 0.2);
          color: #95a5a6;
        }

        .toolbar-right {
          display: flex;
          gap: 8px;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--bg-tertiary, #252525);
          border: none;
          border-radius: 6px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          font-size: 13px;
        }

        .toolbar-btn:hover:not(:disabled) {
          background: var(--bg-hover, #333);
        }

        .toolbar-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toolbar-btn.primary {
          background: var(--accent-color, #667eea);
        }

        .toolbar-btn.primary:hover:not(:disabled) {
          background: var(--accent-hover, #5a6fd6);
        }

        .simulator-content {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 280px 300px;
          gap: 16px;
          min-height: 0;
        }

        /* Preview Section */
        .preview-section {
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
          overflow: hidden;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          padding: 10px 16px;
          background: var(--bg-tertiary, #252525);
          border-bottom: 1px solid var(--border-color, #333);
          font-size: 13px;
        }

        .preview-size {
          color: var(--text-muted, #666);
          font-family: monospace;
        }

        .preview-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: repeating-conic-gradient(#222 0% 25%, #2a2a2a 0% 50%) 50% / 20px 20px;
        }

        .preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text-muted, #666);
        }

        .placeholder-icon {
          font-size: 48px;
        }

        .widget-iframe {
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          background: white;
        }

        /* Controls Section */
        .controls-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .control-panel {
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
          padding: 12px;
        }

        .control-panel h4 {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary, #888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .trigger-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        .trigger-btn {
          padding: 8px;
          background: var(--bg-tertiary, #252525);
          border: none;
          border-radius: 4px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          font-size: 11px;
        }

        .trigger-btn:hover:not(:disabled) {
          background: var(--accent-color, #667eea);
        }

        .trigger-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-list, .api-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .action-btn {
          display: flex;
          justify-content: space-between;
          padding: 8px 10px;
          background: var(--bg-tertiary, #252525);
          border: none;
          border-radius: 4px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          font-size: 12px;
          text-align: left;
        }

        .action-btn:hover:not(:disabled) {
          background: var(--accent-color, #667eea);
        }

        .action-type {
          font-size: 10px;
          color: var(--text-muted, #666);
        }

        .action-btn:hover .action-type {
          color: rgba(255,255,255,0.7);
        }

        .api-btn {
          padding: 8px 10px;
          background: var(--bg-tertiary, #252525);
          border: none;
          border-radius: 4px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          font-size: 12px;
        }

        .api-btn:hover:not(:disabled) {
          background: var(--accent-color, #667eea);
        }

        .input-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .input-name {
          font-size: 11px;
          color: var(--text-secondary, #888);
          min-width: 60px;
        }

        .input-field {
          flex: 1;
          padding: 6px 8px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          font-size: 12px;
        }

        .empty-text {
          margin: 0;
          padding: 8px;
          text-align: center;
          color: var(--text-muted, #666);
          font-size: 11px;
        }

        /* Monitor Section */
        .monitor-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .monitor-panel {
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
          padding: 12px;
        }

        .monitor-panel h4 {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary, #888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .monitor-panel.events {
          flex: 1;
          min-height: 200px;
        }

        .state-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .state-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 8px;
          background: var(--bg-tertiary, #252525);
          border-radius: 4px;
          font-size: 12px;
        }

        .state-key {
          font-family: monospace;
          color: var(--text-secondary, #888);
        }

        .state-value {
          font-family: monospace;
        }

        .state-value.type-string { color: #ce9178; }
        .state-value.type-number { color: #b5cea8; }
        .state-value.type-boolean { color: #569cd6; }

        .event-log {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 300px;
          overflow-y: auto;
        }

        .event-row {
          display: flex;
          gap: 8px;
          padding: 6px 8px;
          background: var(--bg-tertiary, #252525);
          border-radius: 4px;
          font-size: 11px;
          font-family: monospace;
        }

        .event-row.in {
          border-left: 2px solid var(--accent-color, #667eea);
        }

        .event-row.out {
          border-left: 2px solid #2ecc71;
        }

        .event-direction {
          color: var(--text-muted, #666);
        }

        .event-type {
          color: var(--text-primary, #fff);
          min-width: 100px;
        }

        .event-time {
          color: var(--text-muted, #666);
        }

        .event-data {
          color: var(--text-secondary, #888);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

function getDefaultValue(type: string): unknown {
  switch (type) {
    case 'string': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'object': return {};
    case 'array': return [];
    default: return null;
  }
}

function parseValue(value: string, type: string): unknown {
  switch (type) {
    case 'number': return Number(value);
    case 'boolean': return value === 'true';
    case 'object':
    case 'array':
      try { return JSON.parse(value); }
      catch { return value; }
    default: return value;
  }
}

export default BehaviorSimulator;
