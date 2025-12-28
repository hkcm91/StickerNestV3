/**
 * StickerNest v2 - DebugPanel
 * Displays debug information, events, and widget messages
 * Shows parent↔widget message bridge traffic
 * Groups messages by widget instance
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Event, DebugMessage } from '../types/runtime';
import type { EventBus } from '../runtime/EventBus';
import { TransportManager, type TransportStatus } from '../runtime/TransportManager';
import { PresenceManager, type PresenceEntry } from '../runtime/PresenceManager';
import { IdentityManager } from '../runtime/IdentityManager';

interface DebugPanelProps {
  eventBus: EventBus | null;
  maxEvents?: number;
  maxMessages?: number;
  isOpen?: boolean;
  onToggle?: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Bridge message tracking */
interface BridgeMessage {
  direction: 'parentToWidget' | 'widgetToParent';
  messageType: string;
  instanceId: string;
  timestamp: number;
}

/** Interaction event tracking */
type InteractionEventType = 'select' | 'drag' | 'resize' | 'rotate' | 'mode';

interface InteractionEvent {
  type: InteractionEventType;
  widgetId?: string;
  details: string;
  timestamp: number;
}

/** Pipeline activity tracking */
interface PipelineActivity {
  pipelineId: string;
  pipelineName: string;
  connectionId: string;
  from: { widgetInstanceId: string; portName: string };
  to: { widgetInstanceId: string; portName: string };
  value: any;
  timestamp: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  count,
  defaultOpen = true,
  children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="debug-section">
      <button
        className="debug-section-header"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          background: '#2a2a2a',
          border: 'none',
          color: '#ddd',
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'monospace'
        }}
      >
        <span style={{ color: '#888' }}>{isOpen ? '▼' : '▶'}</span>
        <span style={{ fontWeight: 'bold' }}>{title}</span>
        {count !== undefined && (
          <span style={{ color: '#888', marginLeft: 'auto' }}>({count})</span>
        )}
      </button>
      {isOpen && <div className="debug-section-content">{children}</div>}
    </div>
  );
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
};

const getLogLevelColor = (level: DebugMessage['level']): string => {
  switch (level) {
    case 'error': return '#ff6b6b';
    case 'warn': return '#ffd93d';
    case 'info': return '#6bcfff';
    default: return '#aaa';
  }
};

const getEventTypeColor = (type: string): string => {
  // Interaction events
  if (type === 'widget:selected' || type === 'widget:deselected') return '#ff69b4';
  if (type === 'widget:dragged' || type === 'widget:positionChanged') return '#ff8c00';
  if (type === 'widget:resized' || type === 'widget:sizeChanged') return '#00ced1';
  if (type === 'widget:rotated' || type === 'widget:rotationChanged') return '#ba55d3';
  if (type === 'widget:update') return '#ffd700';
  // Canvas mode events
  if (type === 'canvas:modeChanged') return '#ff4500';
  // Pipeline events
  if (type.startsWith('pipeline:')) return '#ff7f50';
  if (type === 'widget:input' || type === 'widget:output') return '#32cd32';
  // General categories
  if (type.startsWith('widget:')) return '#9acd32';
  if (type.startsWith('canvas:')) return '#6bcfff';
  if (type.startsWith('bridge:')) return '#dda0dd';
  if (type.startsWith('debug:')) return '#ffa500';
  return '#888';
};

const truncateId = (id: string): string => {
  if (!id) return '';
  return id.length > 8 ? id.slice(0, 8) + '...' : id;
};

export const DebugPanel: React.FC<DebugPanelProps> = ({
  eventBus,
  maxEvents = 100,
  maxMessages = 100,
  isOpen = true,
  onToggle
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<DebugMessage[]>([]);
  const [bridgeMessages, setBridgeMessages] = useState<BridgeMessage[]>([]);
  const [interactions, setInteractions] = useState<InteractionEvent[]>([]);
  const [pipelineActivity, setPipelineActivity] = useState<PipelineActivity[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [groupByWidget, setGroupByWidget] = useState(false);
  const [showBridge, setShowBridge] = useState(true);
  const [showInteractions] = useState(true);
  const [showPipelines] = useState(true);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  // Suppress unused setter warnings - these may be used in future UI toggles
  void setShowBridge;
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to all events from event bus
  useEffect(() => {
    if (!eventBus) return;

    const unsubscribe = eventBus.on('*', (event: Event) => {
      // Track bridge messages separately
      if (event.type === 'bridge:parentToWidget') {
        setBridgeMessages(prev => {
          const msg: BridgeMessage = {
            direction: 'parentToWidget',
            messageType: event.payload.eventType || 'unknown',
            instanceId: event.payload.targetInstanceId || '',
            timestamp: Date.now()
          };
          const newMsgs = [...prev, msg];
          return newMsgs.length > 50 ? newMsgs.slice(-50) : newMsgs;
        });
      } else if (event.type === 'bridge:widgetToParent') {
        setBridgeMessages(prev => {
          const msg: BridgeMessage = {
            direction: 'widgetToParent',
            messageType: event.payload.messageType || 'unknown',
            instanceId: event.payload.instanceId || '',
            timestamp: Date.now()
          };
          const newMsgs = [...prev, msg];
          return newMsgs.length > 50 ? newMsgs.slice(-50) : newMsgs;
        });
      }

      // Track pipeline activity
      if (showPipelines && event.type === 'pipeline:activity') {
        setPipelineActivity(prev => {
          const activity: PipelineActivity = {
            pipelineId: event.payload.pipelineId,
            pipelineName: event.payload.pipelineName,
            connectionId: event.payload.connectionId,
            from: event.payload.from,
            to: event.payload.to,
            value: event.payload.value,
            timestamp: event.payload.timestamp || Date.now()
          };
          const newActivity = [...prev, activity];
          return newActivity.length > 50 ? newActivity.slice(-50) : newActivity;
        });
      }

      // Track interaction events
      if (showInteractions) {
        if (event.type === 'widget:selected') {
          const newEvent: InteractionEvent = {
            type: 'select' as const,
            widgetId: event.payload.widgetInstanceId,
            details: `Selected widget ${truncateId(event.payload.widgetInstanceId || '')}`,
            timestamp: Date.now()
          };
          setInteractions(prev => [...prev, newEvent].slice(-50));
        } else if (event.type === 'widget:deselected') {
          const newEvent: InteractionEvent = {
            type: 'select' as const,
            details: 'Deselected all widgets',
            timestamp: Date.now()
          };
          setInteractions(prev => [...prev, newEvent].slice(-50));
        } else if (event.type === 'widget:dragged') {
          const newEvent: InteractionEvent = {
            type: 'drag' as const,
            widgetId: event.payload.widgetInstanceId,
            details: `Dragged to (${event.payload.x}, ${event.payload.y})`,
            timestamp: Date.now()
          };
          setInteractions(prev => [...prev, newEvent].slice(-50));
        } else if (event.type === 'widget:resized') {
          const newEvent: InteractionEvent = {
            type: 'resize' as const,
            widgetId: event.payload.widgetInstanceId,
            details: `Resized to ${event.payload.width}x${event.payload.height}`,
            timestamp: Date.now()
          };
          setInteractions(prev => [...prev, newEvent].slice(-50));
        } else if (event.type === 'widget:rotated') {
          const newEvent: InteractionEvent = {
            type: 'rotate' as const,
            widgetId: event.payload.widgetInstanceId,
            details: `Rotated to ${event.payload.rotation.toFixed(1)}°`,
            timestamp: Date.now()
          };
          setInteractions(prev => [...prev, newEvent].slice(-50));
        } else if (event.type === 'canvas:modeChanged') {
          const newEvent: InteractionEvent = {
            type: 'mode' as const,
            details: `Mode changed: ${event.payload.previousMode} → ${event.payload.mode}`,
            timestamp: Date.now()
          };
          setInteractions(prev => [...prev, newEvent].slice(-50));
        }
      }

      // Skip bridge events from main event list if desired
      if (!showBridge && event.type.startsWith('bridge:')) {
        return;
      }

      setEvents(prev => {
        const eventWithTimestamp = { ...event, timestamp: event.timestamp || Date.now() };
        const newEvents = [...prev, eventWithTimestamp];
        if (newEvents.length > maxEvents) {
          return newEvents.slice(-maxEvents);
        }
        return newEvents;
      });
    });

    return unsubscribe;
  }, [eventBus, maxEvents, showBridge]);

  // Subscribe to debug messages
  useEffect(() => {
    if (!eventBus) return;

    const unsubscribe = eventBus.on('debug:message', (event: Event) => {
      const message = event.payload as DebugMessage;
      setMessages(prev => {
        const newMessages = [...prev, message];
        if (newMessages.length > maxMessages) {
          return newMessages.slice(-maxMessages);
        }
        return newMessages;
      });
    });

    return unsubscribe;
  }, [eventBus, maxMessages]);

  // Auto-scroll to bottom when new items arrive
  useEffect(() => {
    if (autoScroll && eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const clearEvents = useCallback(() => setEvents([]), []);
  const clearMessages = useCallback(() => setMessages([]), []);
  const clearBridge = useCallback(() => setBridgeMessages([]), []);
  const clearInteractions = useCallback(() => setInteractions([]), []);
  const clearPipelineActivity = useCallback(() => setPipelineActivity([]), []);
  const clearAll = useCallback(() => {
    setEvents([]);
    setMessages([]);
    setBridgeMessages([]);
    setInteractions([]);
    setPipelineActivity([]);
  }, []);

  // Copy all logs to clipboard
  const copyAllLogs = useCallback(async () => {
    const lines: string[] = [];

    lines.push('=== StickerNest Debug Log ===');
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push('');

    // Widget Messages
    if (messages.length > 0) {
      lines.push('--- Widget Messages ---');
      messages.forEach(msg => {
        const ts = formatTimestamp(msg.timestamp);
        const widgetId = msg.widgetInstanceId ? truncateId(msg.widgetInstanceId) : 'unknown';
        lines.push(`${ts} [${msg.level.toUpperCase()}] ${widgetId}: ${msg.message}`);
        if (msg.data) {
          lines.push(`  Data: ${JSON.stringify(msg.data)}`);
        }
      });
      lines.push('');
    }

    // Events
    if (events.length > 0) {
      lines.push('--- Events ---');
      events.forEach(event => {
        const ts = formatTimestamp(event.timestamp || Date.now());
        const source = event.sourceWidgetId ? ` ← ${truncateId(event.sourceWidgetId)}` : '';
        const target = event.targetWidgetId ? ` → ${truncateId(event.targetWidgetId)}` : '';
        lines.push(`${ts} ${event.type}${source}${target}`);
        if (event.payload && Object.keys(event.payload).length > 0) {
          lines.push(`  Payload: ${JSON.stringify(event.payload)}`);
        }
      });
      lines.push('');
    }

    // Interactions
    if (interactions.length > 0) {
      lines.push('--- Interactions ---');
      interactions.forEach(interaction => {
        const ts = formatTimestamp(interaction.timestamp);
        const widgetId = interaction.widgetId ? ` [${truncateId(interaction.widgetId)}]` : '';
        lines.push(`${ts} ${interaction.type.toUpperCase()}${widgetId}: ${interaction.details}`);
      });
      lines.push('');
    }

    // Pipeline Activity
    if (pipelineActivity.length > 0) {
      lines.push('--- Pipeline Activity ---');
      pipelineActivity.forEach(activity => {
        const ts = formatTimestamp(activity.timestamp);
        lines.push(`${ts} ${activity.pipelineName}: ${truncateId(activity.from.widgetInstanceId)}:${activity.from.portName} → ${truncateId(activity.to.widgetInstanceId)}:${activity.to.portName}`);
        lines.push(`  Value: ${JSON.stringify(activity.value)}`);
      });
      lines.push('');
    }

    const text = lines.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
      // Fallback: open in new window
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<pre>${text}</pre>`);
      }
    }
  }, [events, messages, interactions, pipelineActivity]);

  // Filter events and messages
  const filteredEvents = useMemo(() => filter
    ? events.filter(e =>
        e.type.toLowerCase().includes(filter.toLowerCase()) ||
        JSON.stringify(e.payload).toLowerCase().includes(filter.toLowerCase())
      )
    : events, [events, filter]);

  const filteredMessages = useMemo(() => filter
    ? messages.filter(m =>
        m.message.toLowerCase().includes(filter.toLowerCase()) ||
        (m.data && JSON.stringify(m.data).toLowerCase().includes(filter.toLowerCase()))
      )
    : messages, [messages, filter]);

  // Group messages by widget instance
  const groupedMessages = useMemo(() => {
    if (!groupByWidget) return null;
    const groups = new Map<string, DebugMessage[]>();
    filteredMessages.forEach(msg => {
      const id = msg.widgetInstanceId || 'unknown';
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id)!.push(msg);
    });
    return groups;
  }, [filteredMessages, groupByWidget]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        type="button"
        title="Open Debug Panel"
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          padding: '6px 12px',
          background: '#333',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: 4,
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 12
        }}
      >
        [Debug]
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: 450,
      maxHeight: '60vh',
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '8px 0 0 0',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
      fontSize: 11,
      color: '#ddd',
      zIndex: 9999
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        background: '#2a2a2a',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>Debug Panel</span>
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            padding: '4px 8px',
            background: '#333',
            border: '1px solid #444',
            borderRadius: 3,
            color: '#fff',
            fontSize: 11
          }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto
        </label>
        <button
          id="copy-logs-btn"
          onClick={copyAllLogs}
          title="Copy all logs to clipboard"
          style={{
            padding: '4px 12px',
            background: copyStatus === 'copied' ? '#22c55e' : copyStatus === 'error' ? '#ef4444' : '#3b82f6',
            border: 'none',
            color: '#fff',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'background 0.2s',
          }}
        >
          <span style={{ fontSize: 14 }}>{copyStatus === 'copied' ? '✓' : copyStatus === 'error' ? '✗' : '📋'}</span>
          {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Error' : 'Copy All'}
        </button>
        <button onClick={clearAll} style={{ padding: '2px 8px', background: '#444', border: 'none', color: '#fff', borderRadius: 3, cursor: 'pointer' }}>
          Clear
        </button>
        {onToggle && (
          <button onClick={onToggle} style={{ padding: '2px 8px', background: '#444', border: 'none', color: '#fff', borderRadius: 3, cursor: 'pointer' }}>
            ✕
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Events Section */}
        <CollapsibleSection title="Events" count={filteredEvents.length}>
          <div style={{ maxHeight: 200, overflow: 'auto', padding: 4 }}>
            {filteredEvents.length === 0 ? (
              <div style={{ color: '#666', padding: 8, fontStyle: 'italic' }}>No events recorded</div>
            ) : (
              filteredEvents.map((event, index) => (
                <div key={`event-${index}-${event.timestamp}`} style={{
                  padding: '3px 6px',
                  borderBottom: '1px solid #2a2a2a',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#666', fontSize: 10 }}>
                    {formatTimestamp(event.timestamp || Date.now())}
                  </span>
                  <span style={{ color: getEventTypeColor(event.type), fontWeight: 'bold' }}>
                    {event.type}
                  </span>
                  {event.sourceWidgetId && (
                    <span style={{ color: '#888', fontSize: 10 }}>
                      ← {truncateId(event.sourceWidgetId)}
                    </span>
                  )}
                  {event.targetWidgetId && (
                    <span style={{ color: '#888', fontSize: 10 }}>
                      → {truncateId(event.targetWidgetId)}
                    </span>
                  )}
                  <details style={{ flex: '1 0 100%', marginTop: 2 }}>
                    <summary style={{ color: '#666', cursor: 'pointer', fontSize: 10 }}>payload</summary>
                    <pre style={{ margin: 0, padding: 4, background: '#222', borderRadius: 3, overflow: 'auto', maxHeight: 100, fontSize: 10 }}>
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
            <div ref={eventsEndRef} />
          </div>
          <button onClick={clearEvents} style={{ width: '100%', padding: 4, background: '#333', border: 'none', color: '#888', cursor: 'pointer', fontSize: 10 }}>
            Clear Events
          </button>
        </CollapsibleSection>

        {/* Widget Messages Section */}
        <CollapsibleSection title="Widget Messages" count={filteredMessages.length}>
          <div style={{ padding: '4px 8px', background: '#222', borderBottom: '1px solid #333', display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 10 }}>
              <input
                type="checkbox"
                checked={groupByWidget}
                onChange={(e) => setGroupByWidget(e.target.checked)}
              />
              Group by widget
            </label>
          </div>
          <div style={{ maxHeight: 200, overflow: 'auto', padding: 4 }}>
            {filteredMessages.length === 0 ? (
              <div style={{ color: '#666', padding: 8, fontStyle: 'italic' }}>No messages recorded</div>
            ) : groupByWidget && groupedMessages ? (
              // Grouped view
              Array.from(groupedMessages.entries()).map(([widgetId, msgs]) => (
                <CollapsibleSection key={widgetId} title={`Widget: ${truncateId(widgetId)}`} count={msgs.length} defaultOpen={false}>
                  {msgs.map((msg, index) => (
                    <MessageItem key={`msg-${index}-${msg.timestamp}`} msg={msg} />
                  ))}
                </CollapsibleSection>
              ))
            ) : (
              // Flat view
              filteredMessages.map((msg, index) => (
                <MessageItem key={`msg-${index}-${msg.timestamp}`} msg={msg} showWidget />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <button onClick={clearMessages} style={{ width: '100%', padding: 4, background: '#333', border: 'none', color: '#888', cursor: 'pointer', fontSize: 10 }}>
            Clear Messages
          </button>
        </CollapsibleSection>

        {/* Interactions Section */}
        <CollapsibleSection title="Interactions" count={interactions.length} defaultOpen={true}>
          <div style={{ maxHeight: 150, overflow: 'auto', padding: 4 }}>
            {interactions.length === 0 ? (
              <div style={{ color: '#666', padding: 8, fontStyle: 'italic' }}>No interactions recorded</div>
            ) : (
              interactions.slice(-30).map((interaction, index) => (
                <div key={`interaction-${index}-${interaction.timestamp}`} style={{
                  padding: '2px 6px',
                  borderBottom: '1px solid #2a2a2a',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  fontSize: 10
                }}>
                  <span style={{ color: '#666' }}>{formatTimestamp(interaction.timestamp)}</span>
                  <span style={{
                    color: interaction.type === 'select' ? '#ff69b4' :
                           interaction.type === 'drag' ? '#ff8c00' :
                           interaction.type === 'resize' ? '#00ced1' :
                           interaction.type === 'rotate' ? '#ba55d3' :
                           '#ff4500',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    {interaction.type}
                  </span>
                  {interaction.widgetId && (
                    <span style={{ color: '#888' }}>{truncateId(interaction.widgetId)}</span>
                  )}
                  <span style={{ color: '#aaa', flex: 1 }}>{interaction.details}</span>
                </div>
              ))
            )}
          </div>
          <button onClick={clearInteractions} style={{ width: '100%', padding: 4, background: '#333', border: 'none', color: '#888', cursor: 'pointer', fontSize: 10 }}>
            Clear Interactions
          </button>
        </CollapsibleSection>

        {/* Pipeline Activity Section */}
        <CollapsibleSection title="Pipeline Activity" count={pipelineActivity.length} defaultOpen={true}>
          <div style={{ maxHeight: 150, overflow: 'auto', padding: 4 }}>
            {pipelineActivity.length === 0 ? (
              <div style={{ color: '#666', padding: 8, fontStyle: 'italic' }}>No pipeline activity</div>
            ) : (
              pipelineActivity.slice(-30).map((activity, index) => (
                <div key={`pipeline-${index}-${activity.timestamp}`} style={{
                  padding: '4px 6px',
                  borderBottom: '1px solid #2a2a2a',
                  fontSize: 10
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ color: '#666' }}>{formatTimestamp(activity.timestamp)}</span>
                    <span style={{ color: '#ff7f50', fontWeight: 'bold' }}>{activity.pipelineName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', color: '#aaa' }}>
                    <span style={{ color: '#9acd32' }}>{truncateId(activity.from.widgetInstanceId)}</span>
                    <span style={{ color: '#888' }}>:{activity.from.portName}</span>
                    <span style={{ color: '#32cd32' }}>→</span>
                    <span style={{ color: '#6bcfff' }}>{truncateId(activity.to.widgetInstanceId)}</span>
                    <span style={{ color: '#888' }}>:{activity.to.portName}</span>
                  </div>
                  <details style={{ marginTop: 2 }}>
                    <summary style={{ color: '#666', cursor: 'pointer' }}>value</summary>
                    <pre style={{ margin: 0, padding: 4, background: '#222', borderRadius: 3, overflow: 'auto', maxHeight: 60, fontSize: 9 }}>
                      {JSON.stringify(activity.value, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
          <button onClick={clearPipelineActivity} style={{ width: '100%', padding: 4, background: '#333', border: 'none', color: '#888', cursor: 'pointer', fontSize: 10 }}>
            Clear Activity
          </button>
        </CollapsibleSection>

        {/* Bridge Messages Section */}
        <CollapsibleSection title="Message Bridge" count={bridgeMessages.length} defaultOpen={false}>
          <div style={{ maxHeight: 150, overflow: 'auto', padding: 4 }}>
            {bridgeMessages.length === 0 ? (
              <div style={{ color: '#666', padding: 8, fontStyle: 'italic' }}>No bridge traffic</div>
            ) : (
              bridgeMessages.slice(-30).map((msg, index) => (
                <div key={`bridge-${index}-${msg.timestamp}`} style={{
                  padding: '2px 6px',
                  borderBottom: '1px solid #2a2a2a',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  fontSize: 10
                }}>
                  <span style={{ color: '#666' }}>{formatTimestamp(msg.timestamp)}</span>
                  <span style={{ color: msg.direction === 'parentToWidget' ? '#6bcfff' : '#9acd32' }}>
                    {msg.direction === 'parentToWidget' ? 'Parent→Widget' : 'Widget→Parent'}
                  </span>
                  <span style={{ color: '#dda0dd' }}>{msg.messageType}</span>
                  <span style={{ color: '#888' }}>{truncateId(msg.instanceId)}</span>
                </div>
              ))
            )}
          </div>
          <button onClick={clearBridge} style={{ width: '100%', padding: 4, background: '#333', border: 'none', color: '#888', cursor: 'pointer', fontSize: 10 }}>
            Clear Bridge
          </button>
        </CollapsibleSection>

        {/* Transport Inspector */}
        <TransportInspector />

        {/* Presence Inspector */}
        <PresenceInspector />

        {/* Runtime Info */}
        <CollapsibleSection title="Runtime Info" defaultOpen={false}>
          <div style={{ padding: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>EventBus:</span>
              <span style={{ color: eventBus ? '#9acd32' : '#ff6b6b' }}>
                {eventBus ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>Events:</span>
              <span>{events.length} / {maxEvents}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>Messages:</span>
              <span>{messages.length} / {maxMessages}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>Bridge:</span>
              <span>{bridgeMessages.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>Interactions:</span>
              <span>{interactions.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Pipeline Activity:</span>
              <span>{pipelineActivity.length}</span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Identity Info */}
        <IdentityInspector />
      </div>
    </div>
  );
};

/** Individual message item component */
const MessageItem: React.FC<{ msg: DebugMessage; showWidget?: boolean }> = ({ msg, showWidget = false }) => (
  <div style={{
    padding: '3px 6px',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center'
  }}>
    <span style={{ color: '#666', fontSize: 10 }}>{formatTimestamp(msg.timestamp)}</span>
    <span style={{
      color: getLogLevelColor(msg.level),
      fontWeight: msg.level === 'error' ? 'bold' : 'normal',
      textTransform: 'uppercase',
      fontSize: 10
    }}>
      [{msg.level}]
    </span>
    {showWidget && (
      <span style={{ color: '#888', fontSize: 10 }}>
        {truncateId(msg.widgetInstanceId)}
      </span>
    )}
    <span style={{ flex: 1 }}>{msg.message}</span>
    {msg.data && (
      <details style={{ flex: '1 0 100%', marginTop: 2 }}>
        <summary style={{ color: '#666', cursor: 'pointer', fontSize: 10 }}>data</summary>
        <pre style={{ margin: 0, padding: 4, background: '#222', borderRadius: 3, overflow: 'auto', maxHeight: 80, fontSize: 10 }}>
          {JSON.stringify(msg.data, null, 2)}
        </pre>
      </details>
    )}
  </div>
);

/** Transport Inspector component */
const TransportInspector: React.FC = () => {
  const [status, setStatus] = useState<TransportStatus | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Initial status
    if (TransportManager.isInitialized()) {
      setStatus(TransportManager.getStatus());
    }

    // Subscribe to changes
    const unsubscribe = TransportManager.onConnectionChange((newStatus) => {
      setStatus(newStatus);
    });

    // Poll for status updates (backup)
    const interval = setInterval(() => {
      if (TransportManager.isInitialized()) {
        setStatus(TransportManager.getStatus());
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getStatusIndicator = (connected: boolean) => (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: connected ? '#10b981' : '#6b7280',
      marginRight: 6
    }} />
  );

  return (
    <div className="debug-section">
      <button
        className="debug-section-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          background: '#2a2a2a',
          border: 'none',
          color: '#ddd',
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'monospace'
        }}
      >
        <span style={{ color: '#888' }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontWeight: 'bold' }}>Transports</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {status?.broadcastChannel.connected && <span title="BroadcastChannel" style={{ color: '#3b82f6' }}>BC</span>}
          {status?.sharedWorker.connected && <span title="SharedWorker" style={{ color: '#8b5cf6' }}>SW</span>}
          {status?.webSocket.connected && <span title="WebSocket" style={{ color: '#10b981' }}>WS</span>}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: 8, fontSize: 10 }}>
          {!status ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>Transport Manager not initialized</div>
          ) : (
            <>
              {/* BroadcastChannel */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  {getStatusIndicator(status.broadcastChannel.connected)}
                  <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>BroadcastChannel</span>
                </div>
                <div style={{ paddingLeft: 14, color: '#888' }}>
                  <div>Enabled: {status.broadcastChannel.enabled ? 'Yes' : 'No'}</div>
                  <div>Status: {status.broadcastChannel.connected ? 'Connected' : 'Disconnected'}</div>
                </div>
              </div>

              {/* SharedWorker */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  {getStatusIndicator(status.sharedWorker.connected)}
                  <span style={{ fontWeight: 'bold', color: '#8b5cf6' }}>SharedWorker</span>
                </div>
                <div style={{ paddingLeft: 14, color: '#888' }}>
                  <div>Enabled: {status.sharedWorker.enabled ? 'Yes' : 'No'}</div>
                  <div>Status: {status.sharedWorker.connected ? 'Connected' : 'Disconnected'}</div>
                  <div>Connected Tabs: {status.sharedWorker.connectedTabs}</div>
                </div>
              </div>

              {/* WebSocket */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  {getStatusIndicator(status.webSocket.connected)}
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>WebSocket</span>
                </div>
                <div style={{ paddingLeft: 14, color: '#888' }}>
                  <div>Enabled: {status.webSocket.enabled ? 'Yes' : 'No'}</div>
                  <div>State: {status.webSocket.state}</div>
                  <div>Remote Users: {status.webSocket.remoteUsers}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/** Presence Inspector component */
const PresenceInspector: React.FC = () => {
  const [presences, setPresences] = useState<PresenceEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = PresenceManager.onPresenceChange((entries) => {
      setPresences(entries);
    });

    return unsubscribe;
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'idle': return '#f59e0b';
      case 'away': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="debug-section">
      <button
        className="debug-section-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          background: '#2a2a2a',
          border: 'none',
          color: '#ddd',
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'monospace'
        }}
      >
        <span style={{ color: '#888' }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontWeight: 'bold' }}>Presence</span>
        <span style={{ marginLeft: 'auto', color: '#888' }}>
          ({presences.length} user{presences.length !== 1 ? 's' : ''})
        </span>
      </button>
      {expanded && (
        <div style={{ padding: 8, fontSize: 10 }}>
          {presences.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>No other users present</div>
          ) : (
            presences.map((presence) => (
              <div key={presence.id} style={{
                padding: '6px 8px',
                marginBottom: 4,
                background: '#222',
                borderRadius: 4,
                borderLeft: `3px solid ${presence.color}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: getStatusColor(presence.status)
                  }} />
                  <span style={{ fontWeight: 'bold', color: presence.color }}>
                    {presence.displayName}
                  </span>
                  <span style={{ color: '#666', fontSize: 9 }}>
                    {presence.isSameDevice ? '(same device)' : '(remote)'}
                  </span>
                </div>
                <div style={{ color: '#888', paddingLeft: 12 }}>
                  <div>Status: {presence.status}</div>
                  {presence.cursor && (
                    <div>Cursor: ({Math.round(presence.cursor.x)}, {Math.round(presence.cursor.y)})</div>
                  )}
                  {presence.selection.selectedWidgetIds.length > 0 && (
                    <div>Selected: {presence.selection.selectedWidgetIds.length} widget(s)</div>
                  )}
                  {presence.latency !== undefined && (
                    <div>Latency: {presence.latency}ms</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/** Identity Inspector component */
const IdentityInspector: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  const identity = IdentityManager.getIdentity();
  const shortName = IdentityManager.getShortTabName();

  return (
    <div className="debug-section">
      <button
        className="debug-section-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          background: '#2a2a2a',
          border: 'none',
          color: '#ddd',
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'monospace'
        }}
      >
        <span style={{ color: '#888' }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontWeight: 'bold' }}>Identity</span>
        <span style={{ marginLeft: 'auto', color: '#f59e0b' }}>
          Tab: {shortName}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: 8, fontSize: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#888' }}>Device ID:</span>
            <span style={{ color: '#6bcfff', fontFamily: 'monospace' }}>{identity.deviceId.slice(-12)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#888' }}>Tab ID:</span>
            <span style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{identity.tabId.slice(-12)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#888' }}>Session ID:</span>
            <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>{identity.sessionId.slice(-12)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#888' }}>User ID:</span>
            <span style={{ color: identity.userId ? '#10b981' : '#666' }}>
              {identity.userId ? identity.userId.slice(-12) : 'Not authenticated'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>Canvas ID:</span>
            <span style={{ color: identity.canvasId ? '#ec4899' : '#666' }}>
              {identity.canvasId ? identity.canvasId.slice(-12) : 'None'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
