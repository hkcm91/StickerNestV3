/**
 * StickerNest v2 - App
 *
 * Minimal app shell that manages runtime initialization and tab navigation.
 * Canvas logic is delegated to CanvasPage for separation of concerns.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { RuntimeContext } from './runtime/RuntimeContext';
import { CanvasRuntime } from './runtime/CanvasRuntime';
import { TransportManager } from './runtime/TransportManager';
import { PresenceManager } from './runtime/PresenceManager';
import { createSocialEventBridge, type SocialEventBridge } from './runtime/SocialEventBridge';
import {
  initializeSelfImproving,
  destroySelfImproving,
} from './runtime/SelfImprovingPipelineIntegration';
import { CollaborationService, disconnectCollaboration } from './services/CollaborationService';
import { getAccessToken } from './services/api/client';
import { ReflectionDashboard } from './components/ai-reflection';
import { DebugPanel } from './components/DebugPanel';
import { DefaultLayout, type AppTab } from './layouts/DefaultLayout';
import { WidgetLab } from './widget-lab/WidgetLab';
import { WidgetLibrary } from './components/WidgetLibrary';
import { useAuth } from './contexts/AuthContext';
import { CanvasPage } from './pages/CanvasPage';
import { useDebugShortcuts } from './hooks/useDebugShortcuts';
import { useViewport } from './hooks/useResponsive';
import { useCanvasManager } from './services/canvasManager';
import { useSocialStore } from './state/useSocialStore';
import './App.css';

// WebSocket server URL - defaults to same host with /ws path
const WS_URL = import.meta.env.VITE_WS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : 'ws://localhost:3001/ws');

// =============================================================================
// Component
// =============================================================================

const App: React.FC = () => {
  const { canvasId: urlCanvasId } = useParams<{ canvasId?: string }>();
  const { profile } = useAuth();
  const { isMobile } = useViewport();

  // Get user ID from profile or use demo user
  const userId = profile?.id || 'demo-user-123';

  // Use canvas manager to get consistent canvasId
  const { currentCanvasId } = useCanvasManager(userId);
  const activeCanvasId = urlCanvasId || currentCanvasId || 'canvas-1';

  const [activeTab, setActiveTab] = useState<AppTab>('canvas');
  const [showAIDashboard, setShowAIDashboard] = useState(false);

  // Listen for AI sidebar toggle event from DefaultLayout
  useEffect(() => {
    const handleAIToggle = () => {
      setShowAIDashboard(prev => !prev);
    };

    window.addEventListener('sn:toggle-ai-sidebar', handleAIToggle);
    return () => window.removeEventListener('sn:toggle-ai-sidebar', handleAIToggle);
  }, []);

  // Initialize runtimes - recreate when canvas changes
  const [runtime, setRuntime] = useState(() => new RuntimeContext(userId, activeCanvasId));
  const [canvasRuntime, setCanvasRuntime] = useState(() => new CanvasRuntime({
    canvasId: activeCanvasId,
    userId: userId,
    mode: 'view',
    debugEnabled: true
  }));

  // Recreate runtime when canvas changes
  useEffect(() => {
    setRuntime(new RuntimeContext(userId, activeCanvasId));
    setCanvasRuntime(new CanvasRuntime({
      canvasId: activeCanvasId,
      userId: userId,
      mode: 'view',
      debugEnabled: true
    }));
  }, [activeCanvasId, userId]);

  // Track SocialEventBridge instance
  const socialBridgeRef = useRef<SocialEventBridge | null>(null);

  // Initialize TransportManager, SocialEventBridge, Collaboration, and Self-Improving AI
  useEffect(() => {
    const initializeSocialInfrastructure = async () => {
      try {
        // Initialize TransportManager with EventBus for cross-tab sync
        if (!TransportManager.isInitialized()) {
          console.log('[App] Initializing TransportManager...');
          await TransportManager.initialize(runtime.eventBus, {
            enableBroadcastChannel: true,
            enableSharedWorker: true,
            // WebSocket is now handled by CollaborationService for multi-user
            autoConnect: true
          });
          console.log('[App] TransportManager initialized:', TransportManager.getStatus());
        }

        // Initialize PresenceManager for cursor/selection tracking
        console.log('[App] Initializing PresenceManager...');
        await PresenceManager.initialize(runtime.eventBus, {
          cursorThrottleMs: 50,
          interpolateCursors: true,
        });
        PresenceManager.setCanvasId(activeCanvasId);
        console.log('[App] PresenceManager initialized');

        // Initialize CollaborationService for real-time multi-user editing
        const authToken = getAccessToken();
        if (authToken && profile) {
          console.log('[App] Initializing CollaborationService...');
          try {
            await CollaborationService.initialize({
              serverUrl: WS_URL,
              authToken,
              user: {
                id: profile.id,
                displayName: profile.username || profile.email,
                avatarUrl: profile.avatarUrl,
              },
              autoReconnect: true,
              maxReconnectAttempts: 10,
              reconnectDelay: 1000,
            }, runtime.eventBus);

            // Auto-join current canvas
            if (activeCanvasId) {
              await CollaborationService.joinCanvas(activeCanvasId);
            }
            console.log('[App] CollaborationService initialized and joined canvas:', activeCanvasId);
          } catch (wsError) {
            // WebSocket connection is optional - don't block other initialization
            console.warn('[App] CollaborationService initialization failed (multi-user disabled):', wsError);
          }
        } else {
          console.log('[App] Skipping CollaborationService - no auth token or profile');
        }

        // Initialize SocialStore with user ID to fetch relationships
        const socialStore = useSocialStore.getState();
        if (userId && socialStore.currentUserId !== userId) {
          console.log('[App] Initializing useSocialStore with userId:', userId);
          await socialStore.initialize(userId);
          console.log('[App] useSocialStore initialized - following:', socialStore.following.size);
        }

        // Initialize SocialEventBridge for social store -> EventBus bridging
        if (!socialBridgeRef.current) {
          console.log('[App] Initializing SocialEventBridge...');
          socialBridgeRef.current = createSocialEventBridge(runtime.eventBus);
          socialBridgeRef.current.initialize();
          console.log('[App] SocialEventBridge initialized');
        }

        // Initialize Self-Improving AI Pipeline Integration
        console.log('[App] Initializing Self-Improving AI...');
        initializeSelfImproving(runtime.eventBus);
        console.log('[App] Self-Improving AI initialized');
      } catch (error) {
        console.error('[App] Failed to initialize social infrastructure:', error);
      }
    };

    initializeSocialInfrastructure();
  }, [runtime.eventBus, userId, activeCanvasId, profile]);

  // Cleanup runtime on unmount
  useEffect(() => {
    return () => {
      runtime.destroy();
      // Cleanup social bridge
      if (socialBridgeRef.current) {
        socialBridgeRef.current.destroy();
        socialBridgeRef.current = null;
      }
      // Cleanup self-improving AI
      destroySelfImproving();
      // Shutdown collaboration service
      disconnectCollaboration();
      // Shutdown presence manager
      PresenceManager.shutdown();
      // Shutdown transport manager
      TransportManager.shutdown();
    };
  }, [runtime]);

  // Debug shortcuts
  useDebugShortcuts({
    toggleDebugPanel: () => setActiveTab(prev => prev === 'debug' ? 'canvas' : 'debug'),
  });

  return (
    <DefaultLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Canvas Tab */}
      <div style={{ height: '100%', display: activeTab === 'canvas' ? 'flex' : 'none', flexDirection: 'column' }}>
        <CanvasPage
          runtime={runtime}
          canvasRuntime={canvasRuntime}
        />
      </div>

      {/* Widget Lab Tab */}
      {activeTab === 'lab' && (
        <WidgetLab runtime={runtime} />
      )}

      {/* Debug Tab */}
      <div style={{
        height: '100%',
        padding: isMobile ? 8 : 20,
        background: 'var(--sn-bg-primary, #0f0f19)',
        display: activeTab === 'debug' ? 'block' : 'none'
      }}>
        <div style={{
          height: '100%',
          background: 'var(--sn-bg-secondary, #1a1a2e)',
          borderRadius: 8,
          border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
          overflow: 'hidden'
        }}>
          <DebugPanel eventBus={runtime.eventBus} isOpen={true} />
        </div>
      </div>

      {/* Library Tab */}
      {activeTab === 'library' && (
        <div style={{
          height: '100%',
          background: 'var(--sn-bg-primary, #0f0f19)',
          overflow: 'auto',
        }}>
          <WidgetLibrary runtime={runtime} />
        </div>
      )}

      {/* Self-Improving AI Dashboard Panel */}
      {showAIDashboard && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowAIDashboard(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 999,
            }}
          />
          {/* Panel */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: isMobile ? '100%' : '480px',
              maxWidth: '100vw',
              background: 'var(--sn-bg-primary, #0f0f19)',
              borderLeft: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.3s ease',
            }}
          >
            {/* Panel Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--sn-text-primary, #e2e8f0)' }}>
                Self-Improving AI
              </h2>
              <button
                onClick={() => setShowAIDashboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--sn-text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  padding: 8,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Panel Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ReflectionDashboard embedded />
            </div>
          </div>
        </>
      )}
    </DefaultLayout>
  );
};

export default App;
