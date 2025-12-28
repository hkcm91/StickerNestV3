/**
 * StickerNest - Editor Page (Canvas 2.0)
 * 
 * Full-featured canvas editor using the unified Canvas 2.0 component.
 * Provides widget library, properties panel, and all editing tools.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LibraryPanel } from '../components/LibraryPanel';
import { useLibraryStore } from '../state/useLibraryStore';
import { MainCanvas, MainCanvasRef, CanvasMode } from '../canvas/MainCanvas';
import { WidgetSandboxHost, SandboxConfig } from '../runtime/WidgetSandboxHost';
import { EventBus } from '../runtime/EventBus';
import { BUILTIN_WIDGETS } from '../widgets/builtin';
import type { WidgetInstance } from '../types/domain';
import type { WidgetManifest } from '../types/manifest';

// ============================================================================
// EDITOR PAGE COMPONENT
// ============================================================================

export function EditorPage2() {
  const { canvasId } = useParams<{ canvasId: string }>();
  const navigate = useNavigate();
  const { user, isLocalDevMode } = useAuth();
  
  const canvasRef = useRef<MainCanvasRef>(null);
  const eventBusRef = useRef<EventBus>(new EventBus());

  // DEBUG: Expose eventBus globally for testing
  useEffect(() => {
    (window as any).__DEBUG_EVENT_BUS__ = eventBusRef.current;
    console.log('[EditorPage2] 🔧 EventBus exposed as window.__DEBUG_EVENT_BUS__');
    console.log('[EditorPage2] 🔧 EventBus ID:', eventBusRef.current.id);
    console.log('[EditorPage2] 🔧 Test with: window.__DEBUG_EVENT_BUS__.emit({ type: "canvas:set-background-color", scope: "canvas", payload: { color: "#ff0000" } })');
    return () => {
      delete (window as any).__DEBUG_EVENT_BUS__;
    };
  }, []);
  
  // State
  const [mode, setMode] = useState<CanvasMode>('edit');
  const [canvasName, setCanvasName] = useState('Untitled Canvas');
  const [mountedWidgets, setMountedWidgets] = useState<Map<string, { sandbox: WidgetSandboxHost; element: HTMLDivElement }>>(new Map());
  const [testWidgetManifests, setTestWidgetManifests] = useState<WidgetManifest[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Library panel
  const isPanelOpen = useLibraryStore(s => s.isPanelOpen);
  const togglePanel = useLibraryStore(s => s.togglePanel);
  const openPanel = useLibraryStore(s => s.openPanel);
  
  // Combined widget manifests
  const widgetManifests = useMemo(() => {
    const manifests: WidgetManifest[] = [];
    Object.values(BUILTIN_WIDGETS).forEach(w => manifests.push(w.manifest));
    testWidgetManifests.forEach(m => manifests.push(m));
    return manifests;
  }, [testWidgetManifests]);
  
  const manifestsMap = useMemo(() => {
    const map = new Map<string, WidgetManifest>();
    widgetManifests.forEach(m => map.set(m.id, m));
    return map;
  }, [widgetManifests]);

  // ============================================================================
  // LOAD CANVAS NAME
  // ============================================================================
  
  useEffect(() => {
    if (!canvasId) return;
    
    const key = `stickernest-canvas-${canvasId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setCanvasName(data.canvas?.name || 'Untitled Canvas');
      } catch {}
    }
  }, [canvasId]);

  // ============================================================================
  // LOAD TEST WIDGETS
  // ============================================================================
  
  useEffect(() => {
    const loadTestWidgets = async () => {
      try {
        const indexResponse = await fetch('/test-widgets/index.json');
        if (indexResponse.ok) {
          const widgetIds = await indexResponse.json();
          const manifests = await Promise.all(
            widgetIds.map(async (id: string) => {
              try {
                const res = await fetch(`/test-widgets/${id}/manifest.json`);
                if (res.ok) return await res.json();
              } catch {}
              return null;
            })
          );
          setTestWidgetManifests(manifests.filter(Boolean));
        }
      } catch {}
    };
    loadTestWidgets();
  }, []);

  // ============================================================================
  // WIDGET RENDERING
  // ============================================================================
  
  const renderWidget = useCallback((widget: WidgetInstance) => {
    const mounted = mountedWidgets.get(widget.id);
    
    if (mounted) {
      return (
        <div
          style={{ width: '100%', height: '100%' }}
          ref={(el) => {
            if (el && mounted.element.parentElement !== el) {
              el.appendChild(mounted.element);
            }
          }}
        />
      );
    }
    
    // Create new sandbox
    const manifest = manifestsMap.get(widget.widgetDefId);
    if (!manifest) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a2e',
          color: '#64748b',
          fontSize: 12,
        }}>
          Widget "{widget.widgetDefId}" not found
        </div>
      );
    }

    const builtin = BUILTIN_WIDGETS[widget.widgetDefId];

    // React component widgets render directly without sandbox
    if (builtin?.component) {
      const WidgetComponent = builtin.component;
      return <WidgetComponent />;
    }

    const isTestWidget = !builtin && testWidgetManifests.some(m => m.id === widget.widgetDefId);

    const containerElement = document.createElement('div');
    containerElement.style.width = '100%';
    containerElement.style.height = '100%';
    
    const config: SandboxConfig = {
      widgetInstance: widget,
      manifest,
      assetBaseUrl: isTestWidget ? `/test-widgets/${widget.widgetDefId}` : `/widgets/${widget.widgetDefId}`,
      debugEnabled: true,
      generatedHtml: builtin?.html,
      creatorId: user?.id,
    };
    
    const sandbox = WidgetSandboxHost.fromConfig(config, eventBusRef.current);
    
    // Mount asynchronously
    setTimeout(() => {
      sandbox.mount(containerElement);
      setMountedWidgets(prev => {
        const next = new Map(prev);
        next.set(widget.id, { sandbox, element: containerElement });
        return next;
      });
    }, 0);
    
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#94a3b8',
        fontSize: 12,
      }}>
        Loading {manifest.name}...
      </div>
    );
  }, [mountedWidgets, manifestsMap, testWidgetManifests]);

  // Cleanup sandboxes
  useEffect(() => {
    return () => {
      mountedWidgets.forEach(({ sandbox }) => sandbox.destroy());
    };
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleAddWidget = useCallback((widgetDefId: string) => {
    if (!canvasRef.current) return;
    
    const manifest = manifestsMap.get(widgetDefId);
    if (!manifest) return;
    
    const widgets = canvasRef.current.getWidgets();
    
    canvasRef.current.addWidget({
      widgetDefId,
      version: manifest.version,
      name: manifest.name,
      position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
      width: manifest.size?.width || 300,
      height: manifest.size?.height || 200,
      sizePreset: 'md',
      rotation: 0,
      zIndex: widgets.length + 1,
      state: {},
      visible: true,
      locked: false,
      opacity: 1,
      metadata: { source: 'user' },
    });
    
    // Ensure we're in edit mode
    if (mode !== 'edit') {
      canvasRef.current.setMode('edit');
      setMode('edit');
    }
  }, [manifestsMap, mode]);
  
  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return;
    
    setIsSaving(true);
    try {
      await canvasRef.current.save();
      setLastSaved(new Date());
    } catch (err) {
      console.error('[EditorPage2] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);
  
  const handleModeChange = useCallback((newMode: CanvasMode) => {
    setMode(newMode);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Tab to toggle library panel
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          togglePanel();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, togglePanel]);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (!canvasId) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorContent}>
          <h2 style={styles.errorTitle}>No Canvas Selected</h2>
          <p style={styles.errorText}>Please select a canvas from the gallery.</p>
          <Link to="/gallery" style={styles.errorButton}>
            Go to Gallery
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/gallery" style={styles.backButton}>
            ← Back
          </Link>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>{canvasName}</h1>
            <span style={styles.canvasId}>{canvasId}</span>
          </div>
        </div>
        
        <div style={styles.headerCenter}>
          <button
            onClick={() => togglePanel()}
            style={{
              ...styles.toolButton,
              ...(isPanelOpen ? styles.toolButtonActive : {}),
            }}
          >
            📚 Widgets
          </button>
          <button
            onClick={() => canvasRef.current?.setMode(mode === 'edit' ? 'view' : 'edit')}
            style={{
              ...styles.toolButton,
              ...(mode === 'edit' ? styles.toolButtonActive : {}),
            }}
          >
            {mode === 'edit' ? '✏️ Editing' : '👁️ Viewing'}
          </button>
        </div>
        
        <div style={styles.headerRight}>
          {lastSaved && (
            <span style={styles.savedIndicator}>
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          >
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <MainCanvas
          ref={canvasRef}
          canvasId={canvasId}
          mode={mode}
          width={1920}
          height={1080}
          renderWidget={renderWidget}
          onModeChange={handleModeChange}
          showModeToggle={false}
          autoSaveInterval={30000}
          accentColor="#8b5cf6"
          eventBus={eventBusRef.current}
        />
      </main>

      {/* Library Panel */}
      <LibraryPanel
        widgetManifests={widgetManifests}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a12',
    color: '#e2e8f0',
    overflow: 'hidden',
  },
  
  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    background: 'rgba(15, 15, 25, 0.98)',
    borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: '8px 12px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 6,
    color: '#a78bfa',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  canvasId: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  toolButton: {
    padding: '8px 16px',
    background: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    borderRadius: 6,
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  toolButtonActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    color: '#c4b5fd',
  },
  savedIndicator: {
    fontSize: 12,
    color: '#64748b',
  },
  saveButton: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  
  // Main
  main: {
    flex: 1,
    overflow: 'hidden',
  },
  
  // Error
  errorContainer: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a12',
  },
  errorContent: {
    textAlign: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 12px',
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    margin: '0 0 24px',
  },
  errorButton: {
    display: 'inline-block',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    borderRadius: 8,
    color: '#fff',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
};

export default EditorPage2;

