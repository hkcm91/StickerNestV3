/**
 * StickerNest v2 - Home Page
 *
 * Landing page with embedded demo canvas using Canvas 2.0
 * Full theme support via CSS variables
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LibraryPanel } from '../components/LibraryPanel';
import { useLibraryStore } from '../state/useLibraryStore';
import { useThemeStore } from '../state/useThemeStore';
import { BUILTIN_WIDGETS } from '../widgets/builtin';
import { MainCanvas, MainCanvasRef, CanvasMode } from '../canvas/MainCanvas';
import { WidgetSandboxHost, SandboxConfig } from '../runtime/WidgetSandboxHost';
import { EventBus } from '../runtime/EventBus';
import { ThemedAppBackground } from '../components/ThemedAppBackground';
import type { WidgetInstance } from '../types/domain';
import type { WidgetManifest } from '../types/manifest';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEMO_CANVAS_ID = 'demo-canvas-home';

const DEMO_WIDGETS: Omit<WidgetInstance, 'id' | 'canvasId'>[] = [
  {
    widgetDefId: 'stickernest.basic-text', version: '1.0.0', name: 'Welcome Text',
    position: { x: 300, y: 60 }, width: 600, height: 80, sizePreset: 'lg', rotation: 0, zIndex: 10,
    state: { text: 'Welcome to StickerNest', fontSize: 32, fontFamily: 'system-ui', fontWeight: 'bold', textAlign: 'center', color: '#e2e8f0' },
    visible: true, locked: false, opacity: 1, metadata: { source: 'official' },
  },
  {
    widgetDefId: 'stickernest.clock', version: '1.0.0', name: 'Clock',
    position: { x: 950, y: 60 }, width: 200, height: 120, sizePreset: 'sm', rotation: 0, zIndex: 5,
    state: { format: '12h', showSeconds: true, showDate: true },
    visible: true, locked: false, opacity: 1, metadata: { source: 'official' },
  },
  {
    widgetDefId: 'stickernest.counter', version: '1.0.0', name: 'Click Counter',
    position: { x: 100, y: 220 }, width: 280, height: 180, sizePreset: 'md', rotation: 0, zIndex: 5,
    state: { count: 0, label: 'Clicks', step: 1 },
    visible: true, locked: false, opacity: 1, metadata: { source: 'official' },
  },
  {
    widgetDefId: 'stickernest.todo-list', version: '1.0.0', name: 'Quick Start',
    position: { x: 420, y: 200 }, width: 360, height: 320, sizePreset: 'md', rotation: 0, zIndex: 6,
    state: { title: 'Quick Start Guide', items: [
      { id: '1', text: 'Click widgets to interact', completed: true },
      { id: '2', text: 'Switch to Edit mode', completed: false },
      { id: '3', text: 'Drag widgets to move them', completed: false },
      { id: '4', text: 'Open Widget Library to add more', completed: false },
    ]},
    visible: true, locked: false, opacity: 1, metadata: { source: 'official' },
  },
  {
    widgetDefId: 'stickernest.timer', version: '1.0.0', name: 'Timer',
    position: { x: 820, y: 220 }, width: 280, height: 180, sizePreset: 'md', rotation: 0, zIndex: 5,
    state: { duration: 300, isRunning: false, showControls: true },
    visible: true, locked: false, opacity: 1, metadata: { source: 'official' },
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const canvasRef = useRef<MainCanvasRef>(null);
  const eventBusRef = useRef<EventBus>(new EventBus());

  const [mode, setMode] = useState<CanvasMode>('view');
  const [mountedWidgets, setMountedWidgets] = useState<Map<string, { sandbox: WidgetSandboxHost; element: HTMLDivElement }>>(new Map());
  const [testWidgetManifests, setTestWidgetManifests] = useState<WidgetManifest[]>([]);

  const isPanelOpen = useLibraryStore((s) => s.isPanelOpen);
  const togglePanel = useLibraryStore((s) => s.togglePanel);
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const hasParallaxBackground = currentTheme?.appBackground?.type === 'parallax';

  const widgetManifests = useMemo(() => {
    const manifests: WidgetManifest[] = [];
    Object.values(BUILTIN_WIDGETS).forEach((w) => manifests.push(w.manifest));
    testWidgetManifests.forEach((m) => manifests.push(m));
    return manifests;
  }, [testWidgetManifests]);

  const manifestsMap = useMemo(() => {
    const map = new Map<string, WidgetManifest>();
    widgetManifests.forEach((m) => map.set(m.id, m));
    return map;
  }, [widgetManifests]);

  // Initialize demo canvas
  useEffect(() => {
    const key = `stickernest-canvas-${DEMO_CANVAS_ID}`;
    if (!localStorage.getItem(key)) {
      const now = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify({
        canvas: { id: DEMO_CANVAS_ID, userId: 'demo-showcase', name: 'StickerNest Demo', visibility: 'public', createdAt: now, updatedAt: now, width: 1200, height: 600,
          properties: { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', filter: 'none', opacity: 1, blur: 0, showGrid: false, gridSize: 20, snapToGrid: true }},
        widgets: DEMO_WIDGETS.map((w, i) => ({ ...w, id: `demo-widget-${i}-${Date.now()}`, canvasId: DEMO_CANVAS_ID })),
        pipelines: [], entities: [],
      }));
      const indexKey = 'stickernest-canvas-index';
      const index: string[] = JSON.parse(localStorage.getItem(indexKey) || '[]');
      if (!index.includes(DEMO_CANVAS_ID)) { index.push(DEMO_CANVAS_ID); localStorage.setItem(indexKey, JSON.stringify(index)); }
    }
  }, []);

  // Load test widgets
  useEffect(() => {
    const loadTestWidgets = async () => {
      try {
        const res = await fetch('/test-widgets/index.json');
        if (res.ok) {
          const ids: string[] = await res.json();
          const manifests = await Promise.all(ids.map(async (id: string) => {
            try { const r = await fetch(`/test-widgets/${id}/manifest.json`); return r.ok ? await r.json() : null; } catch { return null; }
          }));
          setTestWidgetManifests(manifests.filter(Boolean));
        }
      } catch {}
    };
    loadTestWidgets();
  }, []);

  // Widget renderer
  const renderWidget = useCallback((widget: WidgetInstance) => {
    const mounted = mountedWidgets.get(widget.id);
    if (mounted) { return <div style={{ width: '100%', height: '100%' }} ref={(el) => { if (el && mounted.element.parentElement !== el) el.appendChild(mounted.element); }} />; }
    const manifest = manifestsMap.get(widget.widgetDefId);
    if (!manifest) { return <div style={styles.widgetNotFound}>Widget not found</div>; }
    const builtin = BUILTIN_WIDGETS[widget.widgetDefId];
    // React component widgets render directly without sandbox
    if (builtin?.component) {
      const WidgetComponent = builtin.component;
      return <WidgetComponent />;
    }
    const isTestWidget = !builtin && testWidgetManifests.some((m) => m.id === widget.widgetDefId);
    const containerElement = document.createElement('div');
    containerElement.style.cssText = 'width:100%;height:100%';
    const sandbox = WidgetSandboxHost.fromConfig({
      widgetInstance: widget, manifest,
      assetBaseUrl: isTestWidget ? `/test-widgets/${widget.widgetDefId}` : `/widgets/${widget.widgetDefId}`,
      debugEnabled: false, generatedHtml: builtin?.html,
    }, eventBusRef.current);
    setTimeout(() => { sandbox.mount(containerElement); setMountedWidgets((prev) => new Map(prev).set(widget.id, { sandbox, element: containerElement })); }, 0);
    return <div style={styles.widgetLoading}>Loading...</div>;
  }, [mountedWidgets, manifestsMap, testWidgetManifests]);

  useEffect(() => () => { mountedWidgets.forEach(({ sandbox }) => sandbox.destroy()); }, []);

  const handleModeChange = useCallback((newMode: CanvasMode) => setMode(newMode), []);

  const handleAddWidget = useCallback((widgetDefId: string) => {
    if (!canvasRef.current) return;
    const manifest = manifestsMap.get(widgetDefId);
    if (!manifest) return;
    canvasRef.current.addWidget({
      widgetDefId, version: manifest.version, name: manifest.name,
      position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 200 },
      width: manifest.size?.width || 300, height: manifest.size?.height || 200,
      sizePreset: 'md', rotation: 0, zIndex: (canvasRef.current.getWidgets().length || 0) + 1,
      state: {}, visible: true, locked: false, opacity: 1, metadata: { source: 'official' },
    });
    if (mode !== 'edit') { canvasRef.current.setMode('edit'); setMode('edit'); }
  }, [manifestsMap, mode]);

  // Glass styles from theme
  const canvasGlassStyles: React.CSSProperties = useMemo(() => {
    if (!currentTheme?.effects?.canvasGlass?.enabled) return {};
    const glass = currentTheme.effects.canvasGlass;
    return {
      background: glass.tint || 'rgba(255, 255, 255, 0.05)',
      backdropFilter: `blur(${glass.blur || 20}px)`,
      WebkitBackdropFilter: `blur(${glass.blur || 20}px)`,
      border: `${glass.borderWidth || 1}px solid ${glass.borderColor || 'rgba(255, 255, 255, 0.1)'}`,
      boxShadow: glass.innerShadow || 'inset 0 0 60px rgba(139, 92, 246, 0.05)',
      borderRadius: 16,
    };
  }, [currentTheme]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{ ...styles.page, background: hasParallaxBackground ? 'transparent' : styles.page.background }}>
      {hasParallaxBackground && <ThemedAppBackground />}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/" style={styles.logo}>
            <div style={styles.logoIcon}>🎨</div>
            <span style={styles.logoText}>StickerNest</span>
          </Link>
        </div>
        <div style={styles.headerCenter}>
          <button onClick={() => togglePanel()} style={{ ...styles.headerButton, ...(isPanelOpen ? styles.headerButtonActive : {}) }}>
            📚 Widget Library
          </button>
        </div>
        <div style={styles.headerRight}>
          <Link to="/gallery" style={styles.navLink}>My Canvases</Link>
          {isAuthenticated ? (
            <span style={styles.userBadge}>👤 {user?.username || 'User'}</span>
          ) : (
            <Link to="/login" style={styles.signInButton}>Sign In</Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <section style={{ ...styles.canvasSection, ...(hasParallaxBackground ? canvasGlassStyles : {}), margin: hasParallaxBackground ? 16 : 0 }}>
          <MainCanvas
            ref={canvasRef}
            canvasId={DEMO_CANVAS_ID}
            mode={mode}
            width={1200}
            height={600}
            renderWidget={renderWidget}
            onModeChange={handleModeChange}
            showModeToggle={true}
            autoSaveInterval={10000}
            accentColor={currentTheme?.colors?.accent?.primary || '#8b5cf6'}
            eventBus={eventBusRef.current}
          />
        </section>

        <footer style={styles.footer}>
          <span style={styles.footerText}>
            {mode === 'edit' ? '✨ Edit Mode: Drag widgets to move • Corners to resize • Press Del to delete' : '👆 View Mode: Click widgets to interact • Switch to Edit mode to customize'}
          </span>
          <Link to="/gallery" style={styles.footerLink}>Create your own canvas →</Link>
        </footer>
      </main>

      <LibraryPanel widgetManifests={widgetManifests} onAddWidget={handleAddWidget} />
    </div>
  );
};

// ============================================================================
// STYLES - Using CSS Variables
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--sn-bg-primary)',
    color: 'var(--sn-text-primary)',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'var(--sn-glass-bg)',
    borderBottom: '1px solid var(--sn-accent-primary-15)',
    backdropFilter: 'blur(var(--sn-glass-blur, 12px))',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  headerCenter: { display: 'flex', alignItems: 'center', gap: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  logo: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  logoIcon: {
    width: 36,
    height: 36,
    background: 'var(--sn-accent-gradient)',
    borderRadius: 'var(--sn-radius-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  },
  logoText: { fontSize: 18, fontWeight: 700, color: 'var(--sn-text-primary)' },
  headerButton: {
    padding: '10px 20px',
    background: 'var(--sn-accent-primary-10)',
    border: '1px solid var(--sn-accent-primary-20)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-accent-tertiary)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast, all 0.15s ease)',
  },
  headerButtonActive: {
    background: 'var(--sn-accent-primary-20)',
    borderColor: 'var(--sn-accent-primary-30)',
    color: 'var(--sn-cozy-lavender)',
  },
  navLink: {
    color: 'var(--sn-text-secondary)',
    textDecoration: 'none',
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 'var(--sn-radius-sm)',
    transition: 'color 0.2s',
  },
  userBadge: {
    padding: '6px 12px',
    background: 'var(--sn-accent-primary-15)',
    borderRadius: 'var(--sn-radius-sm)',
    fontSize: 13,
    color: 'var(--sn-accent-tertiary)',
  },
  signInButton: {
    padding: '10px 20px',
    background: 'var(--sn-accent-gradient)',
    borderRadius: 'var(--sn-radius-md)',
    color: '#fff',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column' },
  canvasSection: { flex: 1, minHeight: 500, padding: 16, overflow: 'hidden' },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    background: 'var(--sn-glass-bg)',
    borderTop: '1px solid var(--sn-accent-primary-10)',
  },
  footerText: { fontSize: 13, color: 'var(--sn-text-muted)' },
  footerLink: { color: 'var(--sn-accent-primary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  widgetNotFound: {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--sn-bg-secondary)', color: 'var(--sn-text-muted)', fontSize: 12,
  },
  widgetLoading: {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--sn-bg-secondary)', color: 'var(--sn-text-secondary)', fontSize: 12,
  },
};

export default HomePage;
