/**
 * StickerNest v2 - Demo Messaging Page
 * Dual-canvas setup for testing cross-canvas messaging
 * Uses the EventBus and RuntimeMessageDispatcher for cross-context communication
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RuntimeContext } from '../runtime/RuntimeContext';
import { CanvasRenderer } from '../components/CanvasRenderer';
import { CanvasRuntime } from '../runtime/CanvasRuntime';
import { useCanvasStore } from '../state/useCanvasStore';
import { IdentityManager } from '../runtime/IdentityManager';
import { useCrossCanvasEvents } from '../hooks/useCanvasRouter';
import { DEFAULT_CANVAS_SETTINGS } from '../types/domain';
import { SNButton } from '../shared-ui/SNButton';
import { SNIcon } from '../shared-ui/SNIcon';
import type { WidgetInstance } from '../types/domain';

// Demo user and canvas IDs
const DEMO_USER_ID = 'demo-user-messaging';
const CANVAS_A_ID = 'demo-canvas-sender';
const CANVAS_B_ID = 'demo-canvas-receiver';

// Pre-configured widgets for the demo - Using cross-canvas broadcaster/listener widgets
const createBroadcasterWidget = (canvasId: string): WidgetInstance => ({
  id: `widget-broadcaster-${canvasId}`,
  canvasId,
  widgetDefId: 'stickernest.cross-canvas-broadcaster',
  position: { x: 50, y: 50 },
  sizePreset: 'md',
  width: 280,
  height: 200,
  rotation: 0,
  zIndex: 1,
  state: {},
  metadata: { source: 'builtin' }
});

const createListenerWidget = (canvasId: string): WidgetInstance => ({
  id: `widget-listener-${canvasId}`,
  canvasId,
  widgetDefId: 'stickernest.cross-canvas-listener',
  position: { x: 50, y: 50 },
  sizePreset: 'md',
  width: 300,
  height: 250,
  rotation: 0,
  zIndex: 1,
  state: {},
  metadata: { source: 'builtin' }
});

interface CanvasPanelProps {
  title: string;
  canvasId: string;
  userId: string;
  widgets: WidgetInstance[];
  color: string;
}

const CanvasPanel: React.FC<CanvasPanelProps> = ({ title, canvasId, userId, widgets, color }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Create runtime for this canvas
  const runtime = useMemo(() => new RuntimeContext(userId, canvasId), [userId, canvasId]);

  // Create canvas runtime
  const canvasRuntime = useMemo(() => new CanvasRuntime({
    canvasId,
    userId,
    mode: 'view',
    debugEnabled: true
  }), [canvasId, userId]);

  // Enable cross-canvas communication via BroadcastChannel
  // This connects this canvas to the CanvasRouter network
  useCrossCanvasEvents(runtime.eventBus, canvasId, userId);

  // Add widgets to runtime on mount
  useEffect(() => {
    widgets.forEach(widget => {
      if (!runtime.getWidgetInstance(widget.id)) {
        runtime.addWidgetInstance(widget);
      }
    });

    // Load widgets into canvas runtime
    if (canvasRuntime.getContext()) {
      canvasRuntime.loadWidgets(widgets);
    }

    return () => {
      runtime.destroy();
    };
  }, [runtime, canvasRuntime, widgets]);

  // Sync identity manager with this canvas
  useEffect(() => {
    IdentityManager.setCanvasId(canvasId);
    IdentityManager.setUserId(userId);
  }, [canvasId, userId]);

  return (
    <div style={styles.canvasPanel}>
      <div style={{ ...styles.panelHeader, borderColor: color }}>
        <h3 style={{ ...styles.panelTitle, color }}>{title}</h3>
        <div style={styles.canvasInfo}>
          <span style={styles.canvasIdBadge}>{canvasId}</span>
        </div>
      </div>
      <div ref={containerRef} style={styles.canvasContainer}>
        <CanvasRenderer
          runtime={runtime}
          canvasRuntime={canvasRuntime}
          mode="view"
          canvasWidth={800}
          canvasHeight={600}
          settings={DEFAULT_CANVAS_SETTINGS}
        />
      </div>
    </div>
  );
};

const DemoMessagingPage: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [eventLog, setEventLog] = useState<Array<{ time: string; type: string; payload: string }>>([]);

  // Create widgets for each canvas - each canvas gets both broadcaster and listener
  // so we can test bidirectional cross-canvas communication
  const canvasAWidgets = useMemo(() => [
    createBroadcasterWidget(CANVAS_A_ID),
    { ...createListenerWidget(CANVAS_A_ID), position: { x: 350, y: 50 } }
  ], []);
  const canvasBWidgets = useMemo(() => [
    createBroadcasterWidget(CANVAS_B_ID),
    { ...createListenerWidget(CANVAS_B_ID), position: { x: 350, y: 50 } }
  ], []);

  // Initialize the store
  useEffect(() => {
    const store = useCanvasStore.getState();
    store.initialize(CANVAS_A_ID, DEMO_USER_ID);
    setIsReady(true);
  }, []);

  // Global event listener for debugging
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type &&
          (event.data.type.startsWith('cross-canvas:') || event.data.type.startsWith('message:'))) {
        const time = new Date().toLocaleTimeString();
        setEventLog(prev => [
          { time, type: event.data.type, payload: JSON.stringify(event.data.payload || {}).slice(0, 100) },
          ...prev.slice(0, 49) // Keep last 50 events
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isReady) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Initializing demo...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/gallery" style={styles.backLink}>
            <SNIcon name="arrowLeft" size="sm" />
            <span>Back to Gallery</span>
          </Link>
          <h1 style={styles.title}>Cross-Canvas Messaging Demo</h1>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.helpText}>
            <SNIcon name="info" size="sm" />
            <span>Use the widgets below to test message passing between canvases</span>
          </div>
        </div>
      </header>

      {/* Main content - two canvases side by side */}
      <main style={styles.main}>
        <div style={styles.canvasRow}>
          <CanvasPanel
            title="Canvas A"
            canvasId={CANVAS_A_ID}
            userId={DEMO_USER_ID}
            widgets={canvasAWidgets}
            color="#8b5cf6"
          />

          <div style={styles.arrowContainer}>
            <div style={styles.arrow}>
              <SNIcon name="arrowLeftRight" size="lg" />
            </div>
            <div style={styles.arrowLabel}>Cross-Canvas via BroadcastChannel</div>
          </div>

          <CanvasPanel
            title="Canvas B"
            canvasId={CANVAS_B_ID}
            userId={DEMO_USER_ID}
            widgets={canvasBWidgets}
            color="#22c55e"
          />
        </div>

        {/* Event Log Panel */}
        <div style={styles.eventLogPanel}>
          <div style={styles.eventLogHeader}>
            <h3 style={styles.eventLogTitle}>
              <SNIcon name="activity" size="sm" />
              <span>Event Log</span>
            </h3>
            <SNButton
              variant="ghost"
              size="sm"
              leftIcon="trash"
              onClick={() => setEventLog([])}
            >
              Clear
            </SNButton>
          </div>
          <div style={styles.eventLogContent}>
            {eventLog.length === 0 ? (
              <div style={styles.emptyLog}>
                No cross-canvas events yet. Send a message to see events here.
              </div>
            ) : (
              eventLog.map((event, i) => (
                <div key={i} style={styles.eventLogItem}>
                  <span style={styles.eventTime}>{event.time}</span>
                  <span style={styles.eventType}>{event.type}</span>
                  <span style={styles.eventPayload}>{event.payload}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions Panel */}
        <div style={styles.instructionsPanel}>
          <h3 style={styles.instructionsTitle}>How Cross-Canvas Communication Works</h3>
          <div style={styles.instructionsContent}>
            <div style={styles.instructionStep}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepText}>
                <strong>Broadcaster Widget</strong> emits outputs on <code>cross.*</code> ports
                (e.g., cross.broadcast, cross.ping, cross.color).
              </div>
            </div>
            <div style={styles.instructionStep}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepText}>
                <strong>CanvasRouter</strong> detects cross.* port outputs and broadcasts them
                via BroadcastChannel to all connected canvases.
              </div>
            </div>
            <div style={styles.instructionStep}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepText}>
                <strong>Listener Widget</strong> receives events via PipelineRuntime broadcast
                system (registered via manifest events.listens).
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'var(--sn-bg-gradient, linear-gradient(135deg, #0f0f19 0%, #1a1a2e 100%))',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-bg-gradient)',
    gap: 16,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid var(--sn-accent-primary-20)',
    borderTopColor: 'var(--sn-accent-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: 'var(--sn-text-secondary)',
    fontSize: 14,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
    background: 'rgba(15, 15, 25, 0.8)',
    backdropFilter: 'blur(10px)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 8,
    transition: 'all 0.2s ease',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
  },
  helpText: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#64748b',
    fontSize: 13,
  },
  main: {
    padding: 24,
    maxWidth: 1600,
    margin: '0 auto',
  },
  canvasRow: {
    display: 'flex',
    gap: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  canvasPanel: {
    flex: 1,
    maxWidth: 600,
    background: 'rgba(30, 30, 46, 0.6)',
    borderRadius: 16,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '12px 16px',
    borderBottom: '2px solid',
    background: 'rgba(15, 15, 25, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  canvasInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  canvasIdBadge: {
    fontSize: 11,
    padding: '4px 8px',
    background: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 4,
    color: '#a78bfa',
    fontFamily: 'monospace',
  },
  canvasContainer: {
    height: 400,
    position: 'relative',
    overflow: 'hidden',
  },
  arrowContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '0 16px',
  },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b5cf6',
  },
  arrowLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 80,
  },
  eventLogPanel: {
    background: 'rgba(30, 30, 46, 0.6)',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  eventLogHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
    background: 'rgba(15, 15, 25, 0.5)',
  },
  eventLogTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  eventLogContent: {
    maxHeight: 200,
    overflowY: 'auto',
    padding: 12,
  },
  emptyLog: {
    padding: 24,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
  },
  eventLogItem: {
    display: 'grid',
    gridTemplateColumns: '80px 180px 1fr',
    gap: 12,
    padding: '8px 12px',
    background: 'rgba(15, 15, 25, 0.4)',
    borderRadius: 6,
    marginBottom: 6,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  eventTime: {
    color: '#64748b',
  },
  eventType: {
    color: '#8b5cf6',
    fontWeight: 600,
  },
  eventPayload: {
    color: '#94a3b8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  instructionsPanel: {
    background: 'rgba(30, 30, 46, 0.4)',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.1)',
    padding: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 16px 0',
  },
  instructionsContent: {
    display: 'flex',
    gap: 24,
  },
  instructionStep: {
    flex: 1,
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.2)',
    color: '#8b5cf6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  stepText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
};

export default DemoMessagingPage;
