/**
 * StickerNest v2 - Connection Tester
 * Widget Lab component for testing widget connections and debugging pipelines
 *
 * Features:
 * - Port visualization showing inputs/outputs
 * - Test event sender UI for triggering ports
 * - Connection status indicators
 * - Real-time event flow visualization
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { WidgetManifest } from '../../types/manifest';
import { EventBus } from '../../runtime/EventBus';
import { theme } from '../theme';

interface PortInfo {
  name: string;
  type: string;
  description?: string;
  ioId?: string; // From io.inputs/outputs
}

interface EventLogEntry {
  id: string;
  timestamp: number;
  direction: 'in' | 'out';
  portId: string;
  payload: any;
  source?: string;
}

interface ConnectionTesterProps {
  manifest: WidgetManifest | null;
  eventBus: EventBus;
  onSendEvent?: (portId: string, payload: any) => void;
}

// Port type colors for visual differentiation
const PORT_TYPE_COLORS: Record<string, string> = {
  trigger: '#ef4444',
  string: '#3b82f6',
  number: '#22c55e',
  boolean: '#f59e0b',
  object: '#8b5cf6',
  array: '#ec4899',
  any: '#64748b',
};

export const ConnectionTester: React.FC<ConnectionTesterProps> = ({
  manifest,
  eventBus,
  onSendEvent,
}) => {
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [testPayload, setTestPayload] = useState<string>('{}');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'ports' | 'events' | 'flow'>('ports');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Extract ports from manifest
  const inputPorts: PortInfo[] = React.useMemo(() => {
    if (!manifest) return [];
    const ports: PortInfo[] = [];

    // From inputs definition
    if (manifest.inputs) {
      Object.entries(manifest.inputs).forEach(([name, def]) => {
        ports.push({
          name,
          type: (def as any).type || 'any',
          description: (def as any).description,
        });
      });
    }

    // From io.inputs
    if (manifest.io?.inputs) {
      manifest.io.inputs.forEach(ioId => {
        if (!ports.find(p => p.name === ioId)) {
          ports.push({
            name: ioId,
            type: 'any',
            ioId,
          });
        }
      });
    }

    return ports;
  }, [manifest]);

  const outputPorts: PortInfo[] = React.useMemo(() => {
    if (!manifest) return [];
    const ports: PortInfo[] = [];

    // From outputs definition
    if (manifest.outputs) {
      Object.entries(manifest.outputs).forEach(([name, def]) => {
        ports.push({
          name,
          type: (def as any).type || 'any',
          description: (def as any).description,
        });
      });
    }

    // From io.outputs
    if (manifest.io?.outputs) {
      manifest.io.outputs.forEach(ioId => {
        if (!ports.find(p => p.name === ioId)) {
          ports.push({
            name: ioId,
            type: 'any',
            ioId,
          });
        }
      });
    }

    return ports;
  }, [manifest]);

  // Subscribe to events
  useEffect(() => {
    if (!eventBus) return;

    setIsConnected(true);

    // Listen for all widget outputs
    const unsubOutput = eventBus.on('widget:output', (event) => {
      const { type, payload } = event.payload || {};
      setEventLog(prev => [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        direction: 'out',
        portId: type || 'unknown',
        payload,
      }, ...prev].slice(0, 100));
    });

    // Listen for pipeline events
    const unsubPipeline = eventBus.on('pipeline:event', (event) => {
      const { sourcePortId, targetPortId, value } = event.payload || {};
      setEventLog(prev => [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        direction: 'in',
        portId: targetPortId || sourcePortId || 'pipeline',
        payload: value,
        source: sourcePortId,
      }, ...prev].slice(0, 100));
    });

    return () => {
      unsubOutput();
      unsubPipeline();
      setIsConnected(false);
    };
  }, [eventBus]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog]);

  // Validate payload JSON
  const validatePayload = useCallback((value: string) => {
    setTestPayload(value);
    try {
      JSON.parse(value);
      setPayloadError(null);
    } catch (e) {
      setPayloadError('Invalid JSON');
    }
  }, []);

  // Send test event
  const handleSendEvent = useCallback(() => {
    if (!selectedPort || payloadError) return;

    try {
      const payload = JSON.parse(testPayload);

      // Emit to event bus
      eventBus.emit('widget:input', {
        type: selectedPort,
        payload,
      });

      // Add to log
      setEventLog(prev => [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        direction: 'in',
        portId: selectedPort,
        payload,
        source: 'Test',
      }, ...prev].slice(0, 100));

      // Callback
      onSendEvent?.(selectedPort, payload);
    } catch (e) {
      console.error('Failed to send event:', e);
    }
  }, [selectedPort, testPayload, payloadError, eventBus, onSendEvent]);

  // Quick payload templates
  const payloadTemplates = [
    { label: 'Empty', value: '{}' },
    { label: 'Trigger', value: '{ "triggered": true }' },
    { label: 'String', value: '{ "value": "Hello!" }' },
    { label: 'Number', value: '{ "value": 42 }' },
    { label: 'Color', value: '{ "color": "#3b82f6" }' },
  ];

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  if (!manifest) {
    return (
      <div style={{
        padding: 24,
        textAlign: 'center',
        color: theme.text.secondary,
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔌</div>
        <div>Select a widget to test connections</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: theme.bg.primary,
      color: theme.text.primary,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: theme.bg.secondary,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔌</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{manifest.name}</div>
            <div style={{ fontSize: 11, color: theme.text.secondary }}>
              {inputPorts.length} inputs • {outputPorts.length} outputs
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: isConnected ? theme.success : theme.text.tertiary,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isConnected ? theme.success : theme.text.tertiary,
          }} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${theme.border}`,
        background: theme.bg.secondary,
      }}>
        {(['ports', 'events', 'flow'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === tab ? theme.bg.tertiary : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : '2px solid transparent',
              color: activeTab === tab ? theme.text.primary : theme.text.secondary,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          >
            {tab === 'ports' && '📍 '}{tab === 'events' && '📜 '}{tab === 'flow' && '🌊 '}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'ports' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {/* Inputs */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: theme.text.secondary,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ color: '#22c55e' }}>▶</span> INPUTS
              </div>
              {inputPorts.length === 0 ? (
                <div style={{ fontSize: 12, color: theme.text.tertiary, fontStyle: 'italic' }}>
                  No input ports defined
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {inputPorts.map(port => (
                    <button
                      key={port.name}
                      onClick={() => setSelectedPort(port.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        background: selectedPort === port.name ? theme.accentMuted : theme.bg.tertiary,
                        border: selectedPort === port.name ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: PORT_TYPE_COLORS[port.type] || PORT_TYPE_COLORS.any,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: theme.text.primary, fontFamily: 'monospace' }}>
                          {port.name}
                        </div>
                        {port.description && (
                          <div style={{ fontSize: 10, color: theme.text.tertiary }}>
                            {port.description}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: PORT_TYPE_COLORS[port.type] || PORT_TYPE_COLORS.any,
                        background: 'rgba(255,255,255,0.1)',
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}>
                        {port.type}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Outputs */}
            <div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: theme.text.secondary,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ color: '#ef4444' }}>◀</span> OUTPUTS
              </div>
              {outputPorts.length === 0 ? (
                <div style={{ fontSize: 12, color: theme.text.tertiary, fontStyle: 'italic' }}>
                  No output ports defined
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {outputPorts.map(port => (
                    <div
                      key={port.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        background: theme.bg.tertiary,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 6,
                      }}
                    >
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: PORT_TYPE_COLORS[port.type] || PORT_TYPE_COLORS.any,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: theme.text.primary, fontFamily: 'monospace' }}>
                          {port.name}
                        </div>
                        {port.description && (
                          <div style={{ fontSize: 10, color: theme.text.tertiary }}>
                            {port.description}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: PORT_TYPE_COLORS[port.type] || PORT_TYPE_COLORS.any,
                        background: 'rgba(255,255,255,0.1)',
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}>
                        {port.type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Event Log */}
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {eventLog.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 24,
                  color: theme.text.tertiary,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
                  <div style={{ fontSize: 12 }}>No events yet</div>
                  <div style={{ fontSize: 11 }}>Send a test event or interact with the widget</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {eventLog.map(entry => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '6px 10px',
                        background: entry.direction === 'in' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderLeft: `3px solid ${entry.direction === 'in' ? '#22c55e' : '#ef4444'}`,
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: theme.text.tertiary, fontFamily: 'monospace', fontSize: 10 }}>
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <span style={{ color: entry.direction === 'in' ? '#22c55e' : '#ef4444' }}>
                        {entry.direction === 'in' ? '▶' : '◀'}
                      </span>
                      <span style={{ color: theme.accent, fontFamily: 'monospace' }}>
                        {entry.portId}
                      </span>
                      {entry.source && (
                        <span style={{ color: theme.text.tertiary }}>
                          from {entry.source}
                        </span>
                      )}
                      <span style={{
                        flex: 1,
                        color: theme.text.secondary,
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {JSON.stringify(entry.payload)}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>

            {/* Clear Log Button */}
            <div style={{
              padding: '8px 12px',
              borderTop: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setEventLog([])}
                style={{
                  padding: '4px 12px',
                  background: theme.bg.tertiary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 4,
                  color: theme.text.secondary,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Clear Log
              </button>
            </div>
          </div>
        )}

        {activeTab === 'flow' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {/* Visual Flow Diagram */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 40,
              padding: 20,
            }}>
              {/* Inputs Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                {inputPorts.map(port => (
                  <div
                    key={port.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 10, color: theme.text.secondary, fontFamily: 'monospace' }}>
                      {port.name}
                    </span>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: PORT_TYPE_COLORS[port.type] || PORT_TYPE_COLORS.any,
                      border: '2px solid rgba(255,255,255,0.3)',
                    }} />
                  </div>
                ))}
                {inputPorts.length === 0 && (
                  <div style={{ fontSize: 10, color: theme.text.tertiary }}>No inputs</div>
                )}
              </div>

              {/* Widget Box */}
              <div style={{
                padding: '20px 30px',
                background: theme.bg.tertiary,
                border: `2px solid ${theme.accent}`,
                borderRadius: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🧩</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{manifest.name}</div>
                <div style={{ fontSize: 10, color: theme.text.tertiary }}>{manifest.kind}</div>
              </div>

              {/* Outputs Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                {outputPorts.map(port => (
                  <div
                    key={port.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: PORT_TYPE_COLORS[port.type] || PORT_TYPE_COLORS.any,
                      border: '2px solid rgba(255,255,255,0.3)',
                    }} />
                    <span style={{ fontSize: 10, color: theme.text.secondary, fontFamily: 'monospace' }}>
                      {port.name}
                    </span>
                  </div>
                ))}
                {outputPorts.length === 0 && (
                  <div style={{ fontSize: 10, color: theme.text.tertiary }}>No outputs</div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div style={{
              marginTop: 20,
              padding: 12,
              background: theme.bg.secondary,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: theme.text.secondary }}>
                Port Type Legend
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {Object.entries(PORT_TYPE_COLORS).map(([type, color]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: color,
                    }} />
                    <span style={{ fontSize: 10, color: theme.text.tertiary }}>{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Event Sender */}
      {selectedPort && (
        <div style={{
          padding: 12,
          borderTop: `1px solid ${theme.border}`,
          background: theme.bg.secondary,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.text.secondary,
            marginBottom: 8,
          }}>
            Send Test Event to: <span style={{ color: theme.accent }}>{selectedPort}</span>
          </div>

          {/* Quick Templates */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {payloadTemplates.map(tmpl => (
              <button
                key={tmpl.label}
                onClick={() => validatePayload(tmpl.value)}
                style={{
                  padding: '4px 8px',
                  background: theme.bg.tertiary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 4,
                  color: theme.text.secondary,
                  cursor: 'pointer',
                  fontSize: 10,
                }}
              >
                {tmpl.label}
              </button>
            ))}
          </div>

          {/* Payload Input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={testPayload}
              onChange={(e) => validatePayload(e.target.value)}
              placeholder='{"key": "value"}'
              style={{
                flex: 1,
                padding: 8,
                background: theme.bg.primary,
                border: payloadError ? '1px solid #ef4444' : `1px solid ${theme.border}`,
                borderRadius: 6,
                color: theme.text.primary,
                fontFamily: 'monospace',
                fontSize: 11,
                minHeight: 60,
                resize: 'vertical',
              }}
            />
            <button
              onClick={handleSendEvent}
              disabled={!!payloadError}
              style={{
                padding: '8px 16px',
                background: payloadError ? theme.bg.tertiary : theme.accent,
                border: 'none',
                borderRadius: 6,
                color: payloadError ? theme.text.tertiary : '#fff',
                cursor: payloadError ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Send
            </button>
          </div>
          {payloadError && (
            <div style={{ fontSize: 10, color: theme.error, marginTop: 4 }}>
              {payloadError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionTester;
