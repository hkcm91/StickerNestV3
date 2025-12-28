/**
 * StickerNest v2 - Pipeline Debugger
 * Real-time event stream viewer and pipeline activity monitor
 *
 * Features:
 * - Live event stream with filtering
 * - Active pipeline highlighting
 * - Payload inspector
 * - Error display
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Event } from '../types/runtime';
import type { EventBus } from '../runtime/EventBus';

// ============================================
// Types
// ============================================

interface PipelineEvent {
  id: string;
  timestamp: number;
  type: 'emit' | 'forward' | 'receive' | 'error';
  eventType: string;
  sourceWidgetId?: string;
  sourceWidgetName?: string;
  targetWidgetId?: string;
  targetWidgetName?: string;
  portName?: string;
  payload: any;
  pipelineId?: string;
  connectionId?: string;
  error?: string;
}

interface PipelineDebuggerProps {
  eventBus: EventBus;
  isOpen: boolean;
  onClose: () => void;
  widgetNames?: Map<string, string>;  // widgetId -> display name
}

// ============================================
// Pipeline Debugger Component
// ============================================

export const PipelineDebugger: React.FC<PipelineDebuggerProps> = ({
  eventBus,
  isOpen,
  onClose,
  widgetNames = new Map(),
}) => {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [filter, setFilter] = useState('');
  const [filterWidget, setFilterWidget] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'emit' | 'forward' | 'receive' | 'error'>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PipelineEvent | null>(null);
  const [maxEvents] = useState(500);
  const eventListRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Get unique widget IDs from events - memoized to prevent re-renders
  const widgetIds = useMemo(() =>
    Array.from(new Set(
      events.flatMap(e => [e.sourceWidgetId, e.targetWidgetId].filter(Boolean))
    )) as string[],
    [events]
  );

  // Subscribe to pipeline events
  useEffect(() => {
    if (!eventBus) return;

    const unsubscribers: (() => void)[] = [];

    // Listen for widget output events
    unsubscribers.push(eventBus.on('widget:output', (event: Event) => {
      if (isPaused) return;
      const { widgetInstanceId, portName, value } = event.payload || {};
      addEvent({
        type: 'emit',
        eventType: 'widget:output',
        sourceWidgetId: widgetInstanceId || event.sourceWidgetId,
        sourceWidgetName: widgetNames.get(widgetInstanceId || event.sourceWidgetId || ''),
        portName,
        payload: value,
      });
    }));

    // Listen for widget input events
    unsubscribers.push(eventBus.on('widget:input', (event: Event) => {
      if (isPaused) return;
      const { targetWidgetId, portName, value, sourceWidgetId, sourcePortName, connectionId } = event.payload || {};
      addEvent({
        type: 'receive',
        eventType: 'widget:input',
        sourceWidgetId,
        sourceWidgetName: widgetNames.get(sourceWidgetId || ''),
        targetWidgetId,
        targetWidgetName: widgetNames.get(targetWidgetId || ''),
        portName,
        payload: value,
        connectionId,
      });
    }));

    // Listen for pipeline activity
    unsubscribers.push(eventBus.on('pipeline:activity', (event: Event) => {
      if (isPaused) return;
      const { pipelineId, connectionId, from, to, value } = event.payload || {};
      addEvent({
        type: 'forward',
        eventType: 'pipeline:activity',
        sourceWidgetId: from?.widgetInstanceId,
        sourceWidgetName: widgetNames.get(from?.widgetInstanceId || ''),
        targetWidgetId: to?.widgetInstanceId,
        targetWidgetName: widgetNames.get(to?.widgetInstanceId || ''),
        portName: `${from?.portName} → ${to?.portName}`,
        payload: value,
        pipelineId,
        connectionId,
      });
    }));

    // Listen for widget errors
    unsubscribers.push(eventBus.on('widget:error', (event: Event) => {
      if (isPaused) return;
      const { widgetInstanceId, error } = event.payload || {};
      addEvent({
        type: 'error',
        eventType: 'widget:error',
        sourceWidgetId: widgetInstanceId || event.sourceWidgetId,
        sourceWidgetName: widgetNames.get(widgetInstanceId || event.sourceWidgetId || ''),
        payload: error,
        error: typeof error === 'string' ? error : error?.message,
      });
    }));

    // Listen for bridge events (for debugging)
    unsubscribers.push(eventBus.on('bridge:widgetToParent', (event: Event) => {
      if (isPaused) return;
      const { messageType, instanceId } = event.payload || {};
      addEvent({
        type: 'emit',
        eventType: `bridge:${messageType}`,
        sourceWidgetId: instanceId || event.sourceWidgetId,
        sourceWidgetName: widgetNames.get(instanceId || event.sourceWidgetId || ''),
        payload: event.payload,
      });
    }));

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [eventBus, isPaused, widgetNames]);

  // Add event to list
  const addEvent = useCallback((eventData: Omit<PipelineEvent, 'id' | 'timestamp'>) => {
    setEvents(prev => {
      const newEvent: PipelineEvent = {
        ...eventData,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      const updated = [newEvent, ...prev];
      return updated.slice(0, maxEvents);
    });
  }, [maxEvents]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && eventListRef.current) {
      eventListRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  // Filter events
  const filteredEvents = events.filter(event => {
    // Type filter
    if (filterType !== 'all' && event.type !== filterType) return false;

    // Widget filter
    if (filterWidget && event.sourceWidgetId !== filterWidget && event.targetWidgetId !== filterWidget) {
      return false;
    }

    // Text search
    if (filter) {
      const searchText = filter.toLowerCase();
      const matchesType = event.eventType.toLowerCase().includes(searchText);
      const matchesPort = event.portName?.toLowerCase().includes(searchText);
      const matchesPayload = JSON.stringify(event.payload).toLowerCase().includes(searchText);
      const matchesSource = event.sourceWidgetName?.toLowerCase().includes(searchText);
      const matchesTarget = event.targetWidgetName?.toLowerCase().includes(searchText);
      if (!matchesType && !matchesPort && !matchesPayload && !matchesSource && !matchesTarget) {
        return false;
      }
    }

    return true;
  });

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setSelectedEvent(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h3 style={styles.title}>Pipeline Debugger</h3>
            <span style={styles.eventCount}>{filteredEvents.length} events</span>
          </div>
          <div style={styles.headerRight}>
            <button
              style={{
                ...styles.headerButton,
                ...(isPaused ? styles.headerButtonActive : {}),
              }}
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button style={styles.headerButton} onClick={clearEvents}>
              Clear
            </button>
            <button style={styles.closeButton} onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="Search events..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            style={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="emit">Emit</option>
            <option value="forward">Forward</option>
            <option value="receive">Receive</option>
            <option value="error">Error</option>
          </select>
          <select
            value={filterWidget}
            onChange={e => setFilterWidget(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">All Widgets</option>
            {widgetIds.map(id => (
              <option key={id} value={id}>
                {widgetNames.get(id) || id.slice(0, 8)}
              </option>
            ))}
          </select>
          <label style={styles.autoScrollLabel}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={e => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>

        {/* Event List and Inspector */}
        <div style={styles.content}>
          {/* Event List */}
          <div style={styles.eventList} ref={eventListRef}>
            {filteredEvents.length === 0 ? (
              <div style={styles.emptyState}>
                {isPaused ? 'Paused - No new events' : 'Waiting for pipeline events...'}
              </div>
            ) : (
              filteredEvents.map(event => (
                <EventRow
                  key={event.id}
                  event={event}
                  isSelected={selectedEvent?.id === event.id}
                  onClick={() => setSelectedEvent(event)}
                />
              ))
            )}
          </div>

          {/* Payload Inspector */}
          {selectedEvent && (
            <PayloadInspector
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Event Row Component
// ============================================

interface EventRowProps {
  event: PipelineEvent;
  isSelected: boolean;
  onClick: () => void;
}

const EventRow: React.FC<EventRowProps> = ({ event, isSelected, onClick }) => {
  const typeColors: Record<string, string> = {
    emit: '#22c55e',
    forward: '#8b5cf6',
    receive: '#3b82f6',
    error: '#ef4444',
  };

  const typeIcons: Record<string, string> = {
    emit: '↑',
    forward: '→',
    receive: '↓',
    error: '!',
  };

  const date = new Date(event.timestamp);
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + '.' + String(date.getMilliseconds()).padStart(3, '0');

  return (
    <div
      style={{
        ...styles.eventRow,
        ...(isSelected ? styles.eventRowSelected : {}),
        ...(event.type === 'error' ? styles.eventRowError : {}),
      }}
      onClick={onClick}
    >
      <span style={{ ...styles.eventType, color: typeColors[event.type] || '#94a3b8' }}>
        {typeIcons[event.type] || '•'}
      </span>
      <span style={styles.eventTime}>{time}</span>
      <span style={styles.eventName}>{event.eventType}</span>
      {event.portName && (
        <span style={styles.eventPort}>{event.portName}</span>
      )}
      <span style={styles.eventWidgets}>
        {event.sourceWidgetName || event.sourceWidgetId?.slice(0, 8) || '?'}
        {event.targetWidgetId && (
          <>
            {' → '}
            {event.targetWidgetName || event.targetWidgetId?.slice(0, 8)}
          </>
        )}
      </span>
      {event.error && (
        <span style={styles.eventError}>{event.error}</span>
      )}
    </div>
  );
};

// ============================================
// Payload Inspector Component
// ============================================

interface PayloadInspectorProps {
  event: PipelineEvent;
  onClose: () => void;
}

const PayloadInspector: React.FC<PayloadInspectorProps> = ({ event, onClose }) => {
  const [expanded, setExpanded] = useState(true);

  const formatPayload = (payload: any): string => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };

  return (
    <div style={styles.inspector}>
      <div style={styles.inspectorHeader}>
        <span style={styles.inspectorTitle}>Payload Inspector</span>
        <button style={styles.inspectorClose} onClick={onClose}>×</button>
      </div>
      <div style={styles.inspectorContent}>
        <div style={styles.inspectorRow}>
          <span style={styles.inspectorLabel}>Event:</span>
          <span style={styles.inspectorValue}>{event.eventType}</span>
        </div>
        <div style={styles.inspectorRow}>
          <span style={styles.inspectorLabel}>Time:</span>
          <span style={styles.inspectorValue}>
            {new Date(event.timestamp).toISOString()}
          </span>
        </div>
        {event.sourceWidgetId && (
          <div style={styles.inspectorRow}>
            <span style={styles.inspectorLabel}>Source:</span>
            <span style={styles.inspectorValue}>
              {event.sourceWidgetName || event.sourceWidgetId}
            </span>
          </div>
        )}
        {event.targetWidgetId && (
          <div style={styles.inspectorRow}>
            <span style={styles.inspectorLabel}>Target:</span>
            <span style={styles.inspectorValue}>
              {event.targetWidgetName || event.targetWidgetId}
            </span>
          </div>
        )}
        {event.portName && (
          <div style={styles.inspectorRow}>
            <span style={styles.inspectorLabel}>Port:</span>
            <span style={styles.inspectorValue}>{event.portName}</span>
          </div>
        )}
        {event.pipelineId && (
          <div style={styles.inspectorRow}>
            <span style={styles.inspectorLabel}>Pipeline:</span>
            <span style={styles.inspectorValue}>{event.pipelineId.slice(0, 8)}</span>
          </div>
        )}
        {event.connectionId && (
          <div style={styles.inspectorRow}>
            <span style={styles.inspectorLabel}>Connection:</span>
            <span style={styles.inspectorValue}>{event.connectionId.slice(0, 8)}</span>
          </div>
        )}
        <div style={styles.inspectorSection}>
          <button
            style={styles.inspectorToggle}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼' : '▶'} Payload
          </button>
          {expanded && (
            <pre style={styles.payloadCode}>
              {formatPayload(event.payload)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 350,
    zIndex: 1500,
    pointerEvents: 'auto',
  },
  panel: {
    height: '100%',
    background: 'rgba(15, 15, 25, 0.98)',
    borderTop: '1px solid rgba(139, 92, 246, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    backdropFilter: 'blur(12px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(139, 92, 246, 0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#a78bfa',
  },
  eventCount: {
    fontSize: 11,
    color: '#64748b',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  headerButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 4,
    color: '#94a3b8',
    fontSize: 11,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  headerButtonActive: {
    background: 'rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
  },
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  searchInput: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    color: '#e2e8f0',
    fontSize: 12,
    padding: '6px 10px',
    maxWidth: 200,
  },
  filterSelect: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    color: '#e2e8f0',
    fontSize: 11,
    padding: '6px 8px',
  },
  autoScrollLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#64748b',
    fontSize: 11,
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  eventList: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  emptyState: {
    padding: 24,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  eventRowSelected: {
    background: 'rgba(139, 92, 246, 0.15)',
  },
  eventRowError: {
    background: 'rgba(239, 68, 68, 0.1)',
  },
  eventType: {
    width: 16,
    textAlign: 'center',
    fontWeight: 700,
  },
  eventTime: {
    color: '#64748b',
    minWidth: 90,
  },
  eventName: {
    color: '#a78bfa',
    minWidth: 120,
  },
  eventPort: {
    color: '#22c55e',
    minWidth: 100,
  },
  eventWidgets: {
    color: '#94a3b8',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eventError: {
    color: '#f87171',
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  inspector: {
    width: 320,
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  inspectorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  inspectorTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  inspectorClose: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 16,
    cursor: 'pointer',
  },
  inspectorContent: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
  },
  inspectorRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 8,
    fontSize: 11,
  },
  inspectorLabel: {
    color: '#64748b',
    minWidth: 70,
  },
  inspectorValue: {
    color: '#e2e8f0',
    wordBreak: 'break-all',
  },
  inspectorSection: {
    marginTop: 12,
  },
  inspectorToggle: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 11,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 8,
  },
  payloadCode: {
    margin: 0,
    padding: 10,
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
    fontSize: 10,
    color: '#e2e8f0',
    overflow: 'auto',
    maxHeight: 150,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
};

export default PipelineDebugger;
