/**
 * StickerNest v2 - Canvas Editor (Landing Page)
 *
 * Main canvas editing experience with:
 * - Single canvas editing (from URL or new)
 * - Save/Share functionality
 * - Full theme support via CSS variables
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LibraryPanel } from '../components/LibraryPanel';
import { useLibraryStore } from '../state/useLibraryStore';
import { useStickerStore } from '../state/useStickerStore';
import { useThemeStore } from '../state/useThemeStore';
import { useCanvasAppearanceStore } from '../state/useCanvasAppearanceStore';
import { useCanvasExtendedStore } from '../state/useCanvasExtendedStore';
import { useLandingStore } from '../state/useLandingStore';
import { LandingSlideoutContainer } from '../components/LandingPanel/LandingSlideoutContainer';
import { useAuth } from '../contexts/AuthContext';
import { useTabsStore } from '../state/useTabsStore';
import { TabContainerWrapper } from '../components/DraggableTab/TabContainerWrapper';
import { CreateTabDialog } from '../components/CreateTabDialog';
import { useViewport, useSafeArea } from '../hooks/useResponsive';
import { BUILTIN_WIDGETS } from '../widgets/builtin';
import { MainCanvas, MainCanvasRef, CanvasMode } from '../canvas/MainCanvas';
import { WidgetSandboxHost, SandboxConfig } from '../runtime/WidgetSandboxHost';
import { EventBus } from '../runtime/EventBus';
import { ThemedAppBackground } from '../components/ThemedAppBackground';
import { landingStyles as styles, landingAnimationsCSS } from './LandingPage.styles';
import { FullscreenPreview, NavigationHint } from '../components/LandingCanvas';
import { LandingControlsBar } from './components';
import {
  Save,
  Plus,
  FolderOpen,
  Lock,
  Link2,
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import type { CanvasVisibility, CanvasShareSettings } from '../types/domain';
import { generateShareUrl } from '../router/AppRouter';
import { WidgetDocker, useDockerState } from '../components/WidgetDocker';
import { InviteDialog } from '../components/permissions';
import { haptic } from '../utils/haptics';
import { useCanvasManager } from '../services/canvasManager';
import { useCanvasStore } from '../state/useCanvasStore';
import type { WidgetManifest } from '../types/manifest';
import type { WidgetInstance, StickerInstance } from '../types/domain';
import { SpatialCanvas } from '../components/spatial';
import { useActiveSpatialMode } from '../state/useSpatialModeStore';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CANVAS_SIZE = { width: 1920, height: 1080 };

// =============================================================================
// Component
// =============================================================================

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { canvasId: urlCanvasId } = useParams<{ canvasId?: string }>();
  const { isMobile } = useViewport();
  const { user } = useAuth();
  const spatialMode = useActiveSpatialMode();
  const isDesktopMode = spatialMode === 'desktop';

  // Canvas manager
  const {
    canvases,
    currentCanvasId,
    isLoading: canvasLoading,
    createCanvas,
    loadCanvas,
    saveCanvas,
    updateShareSettings,
    resizeCanvas,
  } = useCanvasManager(user?.id || 'demo-user');

  // Determine active canvas - create fresh one if no URL param
  const [freshCanvasId] = useState(() => `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const activeCanvasId = urlCanvasId || freshCanvasId;
  const activeCanvas = canvases.find(c => c.id === activeCanvasId);

  // Canvas state
  const [mode, setMode] = useState<CanvasMode>('edit');
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [mountedWidgets, setMountedWidgets] = useState<Map<string, { sandbox: WidgetSandboxHost; element: HTMLDivElement }>>(new Map());
  const pendingMountsRef = useRef<Set<string>>(new Set());
  const [testWidgetManifests, setTestWidgetManifests] = useState<WidgetManifest[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenWidgets, setFullscreenWidgets] = useState<WidgetInstance[]>([]);
  const [canvasSize, setCanvasSize] = useState(activeCanvas?.width && activeCanvas?.height
    ? { width: activeCanvas.width, height: activeCanvas.height }
    : DEFAULT_CANVAS_SIZE
  );
  const [showNavHint, setShowNavHint] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Save & Share state
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [visibility, setVisibility] = useState<CanvasVisibility>(activeCanvas?.visibility || 'private');
  const [customSlug, setCustomSlug] = useState(activeCanvas?.slug || '');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Panel state
  const isLandingPanelOpen = useLandingStore((s) => s.isLandingPanelOpen);
  const [isControlsBarCollapsed, setIsControlsBarCollapsed] = useState(false);
  const landingPanelWidth = useLandingStore((s) => s.landingPanelWidth);
  const toggleLandingPanel = useLandingStore((s) => s.toggleLandingPanel);
  const landingButtonVerticalPosition = useLandingStore((s) => s.landingButtonVerticalPosition);
  const landingButtonSide = useLandingStore((s) => s.landingButtonSide);
  const setLandingButtonVerticalPosition = useLandingStore((s) => s.setLandingButtonVerticalPosition);
  const setLandingButtonSide = useLandingStore((s) => s.setLandingButtonSide);

  // Canvas refs
  const canvasRef = useRef<MainCanvasRef | null>(null);
  const eventBusRef = useRef<EventBus>(new EventBus());

  // Docker state
  const docker = useDockerState(activeCanvasId);

  // Store state
  const isPanelOpen = useLibraryStore((s) => s.isPanelOpen);
  const togglePanel = useLibraryStore((s) => s.togglePanel);
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const addSticker = useStickerStore((s) => s.addSticker);

  // Canvas appearance settings
  const glassSettings = useCanvasAppearanceStore((s) => s.glass);
  const borderSettings = useCanvasAppearanceStore((s) => s.border);
  const backgroundSettings = useCanvasAppearanceStore((s) => s.background);

  // Tabs state
  const tabs = useTabsStore((s) => s.tabs);
  const deleteTab = useTabsStore((s) => s.deleteTab);
  const updateTab = useTabsStore((s) => s.updateTab);
  const updateTabConfig = useTabsStore((s) => s.updateTabConfig);

  // Create tab dialog state
  const [isCreateTabDialogOpen, setIsCreateTabDialogOpen] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const hasParallaxBackground = currentTheme?.appBackground?.type === 'parallax';
  const accentColor = currentTheme?.colors?.accent?.primary || '#8b5cf6';
  const safeArea = useSafeArea();
  const showAdvancedUI = !isMobile;

  // Initialize
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    // Sync initial canvas size to extended store
    useCanvasExtendedStore.getState().setCanvasDimensions(canvasSize.width, canvasSize.height, false);
    return () => clearTimeout(timer);
  }, []);

  // Hide navigation hint after timeout
  useEffect(() => {
    const timer = setTimeout(() => setShowNavHint(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-fit canvas on load
  useEffect(() => {
    const timer = setTimeout(() => {
      canvasRef.current?.fitToView();
    }, 300);
    return () => clearTimeout(timer);
  }, [activeCanvasId, canvasSize]);

  // Load test widget manifests
  useEffect(() => {
    const loadTestWidgets = async () => {
      try {
        const indexRes = await fetch('/test-widgets/index.json');
        let widgetIds: string[];
        if (indexRes.ok) {
          widgetIds = await indexRes.json();
        } else {
          widgetIds = ['gallery-widget', 'notes-widget', 'sticky-notes-widget', 'polaroid-widget', 'color-sender', 'color-receiver'];
        }
        const manifests = await Promise.all(
          widgetIds.map(async (id) => {
            try {
              const res = await fetch(`/test-widgets/${id}/manifest.json`);
              return res.ok ? await res.json() : null;
            } catch { return null; }
          })
        );
        setTestWidgetManifests(manifests.filter((m): m is WidgetManifest => !!m));
      } catch { console.warn('Failed to load test widgets'); }
    };
    loadTestWidgets();
  }, []);

  // Widget manifests map
  const widgetManifests = useMemo(() => {
    const manifests = new Map<string, WidgetManifest>();
    Object.values(BUILTIN_WIDGETS).forEach((def) => manifests.set(def.manifest.id, def.manifest));
    testWidgetManifests.forEach((m) => manifests.set(m.id, m));
    return manifests;
  }, [testWidgetManifests]);

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleCreateCanvas = useCallback(async () => {
    const result = await createCanvas({
      name: 'New Canvas',
      width: 1920,
      height: 1080,
      visibility: 'private',
    });

    if (result.success && result.data) {
      navigate(`/create/${result.data.id}`);
      setSaveStatus('Canvas created!');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [createCanvas, navigate]);

  // Generate random slug
  const generateRandomSlug = useCallback(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 8; i++) {
      slug += chars[Math.floor(Math.random() * chars.length)];
    }
    return slug;
  }, []);

  // Initialize slug when opening save panel
  useEffect(() => {
    if (showSavePanel && !customSlug) {
      setCustomSlug(generateRandomSlug());
    }
  }, [showSavePanel, customSlug, generateRandomSlug]);

  // Update visibility/slug/size when canvas changes
  useEffect(() => {
    if (activeCanvas) {
      setVisibility(activeCanvas.visibility || 'private');
      setCustomSlug(activeCanvas.slug || '');
      // Sync canvas size from loaded canvas
      if (activeCanvas.width && activeCanvas.height) {
        setCanvasSize({ width: activeCanvas.width, height: activeCanvas.height });
        // Also sync to extended store for save operations
        useCanvasExtendedStore.getState().setCanvasDimensions(activeCanvas.width, activeCanvas.height, false);
      }
    }
  }, [activeCanvas]);

  const handleSaveWithVisibility = useCallback(async () => {
    setIsSaving(true);
    try {
      const slug = customSlug || generateRandomSlug();
      if (!customSlug) {
        setCustomSlug(slug);
      }

      // Force sync widgets to store before saving
      if (canvasRef.current) {
        const canvasWidgets = canvasRef.current.getWidgets();
        const store = useCanvasStore.getState();

        const storeWidgetIds = Array.from(store.widgets.keys());
        storeWidgetIds.forEach(id => store.removeWidget(id));
        canvasWidgets.forEach(widget => store.addWidget(widget));
      }

      const existingCanvas = canvases.find(c => c.id === activeCanvasId);

      if (!existingCanvas) {
        const currentWidgets = canvasRef.current?.getWidgets() || [];

        const createResult = await createCanvas({
          name: 'New Canvas',
          width: canvasSize.width,
          height: canvasSize.height,
          visibility: visibility,
          slug: visibility !== 'private' ? slug : undefined,
        });

        if (!createResult.success || !createResult.data) {
          setSaveStatus('Failed to create canvas');
          haptic('error');
          return;
        }

        const newCanvasId = createResult.data.id;
        const store = useCanvasStore.getState();
        store.initialize(newCanvasId, user?.id || 'demo-user');
        currentWidgets.forEach(widget => {
          store.addWidget({ ...widget, canvasId: newCanvasId });
        });

        await saveCanvas();

        if (visibility !== 'private') {
          const generatedUrl = generateShareUrl(slug);
          setShareUrl(generatedUrl);
          setSaveStatus('Canvas created & published!');
        } else {
          setShareUrl(null);
          setSaveStatus('Canvas created!');
        }

        navigate(`/create/${newCanvasId}`, { replace: true });
        haptic('success');
      } else {
        await saveCanvas();

        if (visibility !== 'private') {
          const settings: CanvasShareSettings = { visibility, slug };
          await updateShareSettings(activeCanvasId, settings);
          const generatedUrl = generateShareUrl(slug);
          setShareUrl(generatedUrl);
          setSaveStatus('Saved & Published!');
        } else {
          setShareUrl(null);
          setSaveStatus('Saved!');
        }
        haptic('success');
      }

      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('Save failed');
      haptic('error');
    } finally {
      setIsSaving(false);
    }
  }, [saveCanvas, updateShareSettings, activeCanvasId, visibility, customSlug, generateRandomSlug, canvases, createCanvas, canvasSize, navigate, user?.id]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      haptic('light');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleSizeChange = useCallback(async (width: number, height: number) => {
    haptic('medium');
    setCanvasSize({ width, height });
    // Update the extended store so saveCurrentCanvas picks up the new dimensions
    useCanvasExtendedStore.getState().setCanvasDimensions(width, height, false);
    // Also persist to storage if canvas already exists
    if (activeCanvas) {
      await resizeCanvas(activeCanvasId, width, height, false);
    }
  }, [activeCanvasId, activeCanvas, resizeCanvas]);

  const handleModeChange = useCallback((newMode: CanvasMode) => {
    canvasRef.current?.setMode(newMode);
    setMode(newMode);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    haptic('light');
    if (!isFullscreen && canvasRef.current) {
      setFullscreenWidgets(canvasRef.current.getWidgets());
    }
    setIsFullscreen(prev => !prev);
  }, [isFullscreen]);

  // Keyboard shortcut for fullscreen (F to toggle, Escape to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleFullscreenToggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleFullscreenToggle]);

  const handleAddWidget = useCallback((widgetDefId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const manifest = widgetManifests.get(widgetDefId);
    if (!manifest) return;
    const currentWidgets = canvas.getWidgets();
    canvas.addWidget({
      widgetDefId, version: manifest.version, name: manifest.name,
      position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
      width: manifest.size?.width || 300, height: manifest.size?.height || 200,
      sizePreset: 'md', rotation: 0, zIndex: currentWidgets.length + 1, state: {},
      visible: true, locked: false, opacity: 1, metadata: { source: 'user' },
    });
    if (mode !== 'edit') handleModeChange('edit');
  }, [widgetManifests, mode, handleModeChange]);

  const handleAddSticker = useCallback((sticker: StickerInstance) => {
    addSticker({ ...sticker, canvasId: activeCanvasId });
    if (mode !== 'edit') handleModeChange('edit');
  }, [addSticker, activeCanvasId, mode, handleModeChange]);

  const handleUndo = useCallback(() => { console.log('Undo'); }, []);
  const handleRedo = useCallback(() => { console.log('Redo'); }, []);
  const canUndo = false;
  const canRedo = false;

  // Sync widgets from MainCanvas to local state AND Zustand store
  useEffect(() => {
    const store = useCanvasStore.getState();
    if (activeCanvasId && store.canvasId !== activeCanvasId) {
      store.initialize(activeCanvasId, user?.id || 'demo-user');
    }

    const syncWidgets = () => {
      if (canvasRef.current) {
        const canvasWidgets = canvasRef.current.getWidgets();
        setWidgets(canvasWidgets);

        const store = useCanvasStore.getState();
        const storeWidgetIds = new Set(store.widgets.keys());
        const canvasWidgetIds = new Set(canvasWidgets.map(w => w.id));

        canvasWidgets.forEach(widget => {
          const existing = store.widgets.get(widget.id);
          if (!existing) {
            store.addWidget(widget);
          } else if (existing.position.x !== widget.position.x || existing.position.y !== widget.position.y) {
            store.updateWidget(widget.id, widget);
          }
        });

        storeWidgetIds.forEach(id => {
          if (!canvasWidgetIds.has(id)) store.removeWidget(id);
        });
      }
    };
    syncWidgets();
    const interval = setInterval(syncWidgets, 500);
    return () => clearInterval(interval);
  }, [activeCanvasId, user?.id]);

  // Docker handlers
  const handleUndockFromDocker = useCallback((widgetId: string) => {
    const dockedState = docker.undock(widgetId);
    if (dockedState && canvasRef.current) {
      canvasRef.current.updateWidget(widgetId, {
        position: dockedState.originalPos,
        width: dockedState.originalSize.width,
        height: dockedState.originalSize.height,
        zIndex: Math.max(dockedState.originalZ, widgets.length + 5),
        rotation: dockedState.originalRot,
      });
    }
    return dockedState;
  }, [docker, widgets]);

  const handleDockToDocker = useCallback((widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) { docker.dock(widget); docker.setVisible(true); }
  }, [widgets, docker]);

  const handleAddWidgetToDocker = useCallback((widgetDefId: string) => {
    const manifest = widgetManifests.get(widgetDefId);
    const canvas = canvasRef.current;
    if (!manifest || !canvas) return;

    canvas.addWidget({
      widgetDefId, version: manifest.version, name: manifest.name,
      position: { x: -1000, y: -1000 },
      width: manifest.size?.width || 300, height: manifest.size?.height || 200,
      sizePreset: 'md', rotation: 0, zIndex: canvas.getWidgets().length, state: {},
      visible: true, locked: false, opacity: 1, metadata: { source: 'user' },
    });

    setTimeout(() => {
      const updatedWidgets = canvas.getWidgets();
      const addedWidget = updatedWidgets.find(w => w.widgetDefId === widgetDefId && w.position.x === -1000);
      if (addedWidget) docker.dock(addedWidget);
    }, 100);
  }, [widgetManifests, docker]);

  const renderDockerWidget = useCallback((widget: WidgetInstance, containerSize?: { width: number; height: number }) => {
    const mounted = mountedWidgets.get(widget.id);
    if (mounted?.element) {
      return <div ref={el => { if (el && mounted.element.parentElement !== el) el.appendChild(mounted.element); }} style={{ width: containerSize?.width || '100%', height: containerSize?.height || '100%', minHeight: 150, overflow: 'auto' }} />;
    }
    return <div style={{ padding: 16, fontSize: 12, color: 'var(--sn-text-muted)' }}>{widget.name || 'Loading...'}</div>;
  }, [mountedWidgets]);

  const availableWidgetsForDocker = useMemo(() =>
    Array.from(widgetManifests.values()).map(m => ({ id: m.id, name: m.name, description: m.description })),
    [widgetManifests]
  );

  // Widget renderer
  const renderWidget = useCallback((widget: WidgetInstance) => {
    const mounted = mountedWidgets.get(widget.id);
    if (mounted) {
      return <div style={{ width: '100%', height: '100%' }} ref={(el) => { if (el && mounted.element.parentElement !== el) el.appendChild(mounted.element); }} />;
    }
    if (pendingMountsRef.current.has(widget.id)) {
      const manifest = widgetManifests.get(widget.widgetDefId);
      return <div style={styles.widgetLoading}>Loading {manifest?.name || 'widget'}...</div>;
    }
    const manifest = widgetManifests.get(widget.widgetDefId);
    if (!manifest) return <div style={styles.widgetNotFound}>Widget "{widget.widgetDefId}" not found</div>;

    pendingMountsRef.current.add(widget.id);
    const builtin = BUILTIN_WIDGETS[widget.widgetDefId];
    const isTestWidget = !builtin && testWidgetManifests.some(m => m.id === widget.widgetDefId);
    const containerElement = document.createElement('div');
    containerElement.style.cssText = 'width:100%;height:100%';
    const config: SandboxConfig = {
      widgetInstance: widget, manifest,
      assetBaseUrl: isTestWidget ? `/test-widgets/${widget.widgetDefId}` : `/widgets/${widget.widgetDefId}`,
      debugEnabled: true, generatedHtml: builtin?.html,
      creatorId: user?.id,
    };
    const sandbox = WidgetSandboxHost.fromConfig(config, eventBusRef.current);
    setTimeout(() => {
      sandbox.mount(containerElement);
      pendingMountsRef.current.delete(widget.id);
      setMountedWidgets(prev => new Map(prev).set(widget.id, { sandbox, element: containerElement }));
    }, 0);
    return <div style={styles.widgetLoading}>Loading {manifest.name}...</div>;
  }, [mountedWidgets, widgetManifests, testWidgetManifests, user?.id]);

  // Cleanup
  useEffect(() => () => { mountedWidgets.forEach(({ sandbox }) => sandbox.destroy()); }, []);

  // Canvas background style from appearance store
  const backgroundStyle: React.CSSProperties = {
    background: glassSettings.enabled ? glassSettings.tint : backgroundSettings.color,
    borderRadius: borderSettings.radius,
    border: borderSettings.enabled ? `${borderSettings.width}px ${borderSettings.style} ${borderSettings.color}` : 'none',
    backdropFilter: glassSettings.enabled ? `blur(${glassSettings.blur}px) saturate(${glassSettings.saturation}%)` : 'none',
    WebkitBackdropFilter: glassSettings.enabled ? `blur(${glassSettings.blur}px) saturate(${glassSettings.saturation}%)` : 'none',
    boxShadow: glassSettings.enabled ? '0 8px 32px rgba(0,0,0,0.12)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
    ...(backgroundSettings.imageUrl && { backgroundImage: `url(${backgroundSettings.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }),
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div style={{ ...styles.page, background: hasParallaxBackground ? 'transparent' : styles.page.background }} className="sn-landing-page">
      {hasParallaxBackground ? <ThemedAppBackground /> : (
        <div style={styles.orbContainer} aria-hidden="true">
          <div style={styles.orbPurple} className="sn-orb sn-orb-float sn-orb-pulse" />
          <div style={styles.orbPink} className="sn-orb sn-orb-float-delayed sn-orb-pulse" />
          <div style={styles.orbCoral} className="sn-orb sn-orb-float sn-orb-pulse" />
          <div style={styles.orbCyan} className="sn-orb sn-orb-float-delayed" />
        </div>
      )}

      {/* Left Panel - Slideout */}
      <LandingSlideoutContainer
        position="left"
        isPanelOpen={isLandingPanelOpen}
        panelWidth={landingPanelWidth}
        togglePanel={toggleLandingPanel}
        buttonVerticalPosition={landingButtonVerticalPosition}
        buttonSide={landingButtonSide}
        setButtonVerticalPosition={setLandingButtonVerticalPosition}
        setButtonSide={setLandingButtonSide}
      >
        <aside className="sn-left-panel" style={{ ...styles.leftPanel, opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateX(0)' : 'translateX(-20px)', width: '100%', height: '100%', padding: '36px 32px' }}>
          <div style={styles.logoSection} className="sn-logo-section">
            <div style={styles.logo}>
              <span style={styles.logoText} className="sn-logo-text">StickerNest</span>
              <div style={styles.nestIcon} className="sn-nest-icon">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="nestGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#92704A"/><stop offset="100%" stopColor="#5D4037"/></linearGradient><radialGradient id="eggShine" cx="30%" cy="25%" r="60%"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#FEF3C7"/></radialGradient></defs><ellipse cx="16" cy="19" rx="10" ry="5.5" fill="url(#nestGrad)"/><ellipse cx="16" cy="19" rx="7" ry="3" fill="#4A3728"/><path d="M7 18c3-1 6-1.5 9-1.5s6 .5 9 1.5" stroke="#A67C52" strokeWidth="0.8" strokeLinecap="round"/><ellipse cx="12" cy="16.5" rx="2.8" ry="3.5" fill="url(#eggShine)"/><ellipse cx="16" cy="15.5" rx="3" ry="3.8" fill="url(#eggShine)"/><ellipse cx="20" cy="16.5" rx="2.6" ry="3.3" fill="url(#eggShine)"/><ellipse cx="11" cy="15" rx="0.8" ry="1" fill="white" opacity="0.8"/><ellipse cx="15" cy="14" rx="0.9" ry="1.1" fill="white" opacity="0.85"/><ellipse cx="19" cy="15" rx="0.7" ry="0.9" fill="white" opacity="0.75"/></svg>
              </div>
            </div>
            <span style={styles.alphaTag} className="sn-alpha-tag">alpha</span>
          </div>

          {/* Canvas Info */}
          <div style={styles.heroSection} className="sn-hero-section">
            <h1 style={{ ...styles.headline, fontSize: 32 }} className="sn-headline">{activeCanvas?.name || 'New Canvas'}</h1>
            <p style={styles.subheadline}>
              {canvasSize.width} x {canvasSize.height}
              {activeCanvas?.visibility && <span style={{ marginLeft: 8, opacity: 0.7 }}>({activeCanvas.visibility})</span>}
            </p>
          </div>

          {/* Save & Share Panel */}
          {showAdvancedUI && (
            <div style={styles.featuresSection} className="sn-features">
              <button onClick={() => setShowSavePanel(!showSavePanel)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sn-text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Save size={16} style={{ color: 'var(--sn-cozy-mint)' }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Save & Share</span>
                </div>
                {showSavePanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showSavePanel && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: 'var(--sn-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Visibility</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setVisibility('private')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', background: visibility === 'private' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)', border: `1px solid ${visibility === 'private' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: 8, cursor: 'pointer' }}>
                        <Lock size={18} style={{ color: visibility === 'private' ? '#a78bfa' : '#94a3b8' }} />
                        <span style={{ fontSize: 12, color: visibility === 'private' ? '#e2e8f0' : '#94a3b8', fontWeight: 500 }}>Private</span>
                      </button>
                      <button onClick={() => setVisibility('unlisted')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', background: visibility === 'unlisted' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(255, 255, 255, 0.05)', border: `1px solid ${visibility === 'unlisted' ? 'rgba(251, 146, 60, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: 8, cursor: 'pointer' }}>
                        <Link2 size={18} style={{ color: visibility === 'unlisted' ? '#fb923c' : '#94a3b8' }} />
                        <span style={{ fontSize: 12, color: visibility === 'unlisted' ? '#e2e8f0' : '#94a3b8', fontWeight: 500 }}>Unlisted</span>
                      </button>
                      <button onClick={() => setVisibility('public')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', background: visibility === 'public' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)', border: `1px solid ${visibility === 'public' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: 8, cursor: 'pointer' }}>
                        <Globe size={18} style={{ color: visibility === 'public' ? '#10b981' : '#94a3b8' }} />
                        <span style={{ fontSize: 12, color: visibility === 'public' ? '#e2e8f0' : '#94a3b8', fontWeight: 500 }}>Public</span>
                      </button>
                    </div>
                  </div>

                  {visibility !== 'private' && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, color: 'var(--sn-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Share URL</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, border: '1px solid rgba(139, 92, 246, 0.2)', overflow: 'hidden' }}>
                        <span style={{ padding: '10px 0 10px 12px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>/c/</span>
                        <input type="text" value={customSlug} onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="your-url" style={{ flex: 1, background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 12, padding: '10px 0', outline: 'none' }} />
                        <button onClick={() => setCustomSlug(generateRandomSlug())} style={{ background: 'rgba(139, 92, 246, 0.2)', border: 'none', padding: '10px 12px', cursor: 'pointer', color: '#a78bfa', display: 'flex', alignItems: 'center' }} title="Generate random URL"><RefreshCw size={14} /></button>
                      </div>
                    </div>
                  )}

                  {shareUrl && visibility !== 'private' && (
                    <div style={{ marginBottom: 16, padding: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 8 }}>
                      <label style={{ fontSize: 11, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>Share Link</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="text" value={shareUrl} readOnly style={{ flex: 1, background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: '8px 10px', color: '#10b981', fontSize: 11, fontFamily: 'monospace' }} />
                        <button onClick={() => copyToClipboard(shareUrl)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: '8px 12px', color: '#10b981', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  <button onClick={handleSaveWithVisibility} disabled={isSaving} style={{ width: '100%', padding: '12px 16px', background: isSaving ? 'rgba(139, 92, 246, 0.3)' : 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(168, 85, 247, 0.8) 100%)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)' }}>
                    <Save size={16} />{isSaving ? 'Saving...' : saveStatus || (visibility === 'private' ? 'Save Canvas' : 'Save & Publish')}
                  </button>
                </div>
              )}

              {!showSavePanel && (
                <>
                  <button onClick={handleCreateCanvas} style={{ ...styles.featureItem, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', padding: '8px 0' }}>
                    <Plus size={16} style={{ color: 'var(--sn-cozy-pink)' }} /><span>Create New Canvas</span>
                  </button>
                  <Link to="/gallery" style={{ ...styles.featureItem, textDecoration: 'none', padding: '8px 0' }}>
                    <FolderOpen size={16} style={{ color: 'var(--sn-cozy-coral-soft)' }} /><span>Open Gallery</span>
                  </Link>
                </>
              )}
            </div>
          )}

          {isMobile && (
            <div className="sn-mobile-actions" style={styles.mobileActions}>
              <Link to="/gallery" className="sn-mobile-gallery-btn" style={styles.mobileGalleryBtn}>Gallery<span style={{ marginLeft: 4 }}>→</span></Link>
              <button className="sn-mobile-widgets-btn" onClick={() => { togglePanel(); if (!isPanelOpen) handleModeChange('edit'); }} style={styles.mobileWidgetsBtn}>Widgets<span style={{ marginLeft: 4 }}>+</span></button>
            </div>
          )}

          <div style={styles.navSection} className="sn-nav-section">
            <Link to="/gallery" style={styles.galleryLink}>Open Gallery<span style={styles.linkArrow}>→</span></Link>
          </div>
        </aside>
      </LandingSlideoutContainer>

      {/* Main Canvas Area */}
      <main className="sn-main-area" style={{ ...styles.mainArea, opacity: isLoaded ? 1 : 0, position: 'relative' }}>
        <LandingControlsBar
          activeAccentColor={accentColor}
          mode={mode}
          onModeChange={handleModeChange}
          onFullscreenToggle={handleFullscreenToggle}
          dockerVisible={docker.visible}
          onDockerToggle={() => { docker.toggle(); if (!docker.visible) handleModeChange('edit'); }}
          isPanelOpen={isPanelOpen}
          onPanelToggle={() => { togglePanel(); if (!isPanelOpen) handleModeChange('edit'); }}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onCreateTab={() => setIsCreateTabDialogOpen(true)}
          onInvite={() => setShowInviteDialog(true)}
          currentTheme={currentTheme}
          onThemeChange={setTheme}
          showAdvancedUI={showAdvancedUI}
          isMobile={isMobile}
          isCollapsed={isControlsBarCollapsed}
          onToggleCollapse={() => setIsControlsBarCollapsed(!isControlsBarCollapsed)}
          canvasName={activeCanvas?.name || 'New Canvas'}
          onSizeChange={handleSizeChange}
        />

        <div className="canvas-container" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'transparent', margin: hasParallaxBackground ? 16 : 0, cursor: mode === 'view' ? (isPanning ? 'grabbing' : 'grab') : 'default', zIndex: 1 }} onMouseDown={() => mode === 'view' && setIsPanning(true)} onMouseUp={() => setIsPanning(false)} onMouseLeave={() => setIsPanning(false)}>
          <MainCanvas
            ref={canvasRef}
            canvasId={activeCanvasId}
            mode={mode}
            width={canvasSize.width}
            height={canvasSize.height}
            renderWidget={renderWidget}
            onModeChange={setMode}
            externalWidgetManifests={widgetManifests}
            onDockWidget={handleDockToDocker}
            showModeToggle={false}
            showZoomControls={false}
            showMinimap={false}
            showNavigator={false}
            showModeHint={false}
            autoSaveInterval={30000}
            accentColor={accentColor}
            backgroundStyle={backgroundStyle}
            eventBus={eventBusRef.current}
            onCanvasResize={handleSizeChange}
          >
            <WidgetDocker
              widgets={widgets}
              dockedIds={docker.dockedIds}
              isEditMode={mode === 'edit'}
              visible={docker.visible}
              onToggle={docker.toggle}
              onDock={docker.dock}
              onUndock={handleUndockFromDocker}
              renderWidget={renderDockerWidget}
              availableWidgets={availableWidgetsForDocker}
              onAddWidget={handleAddWidgetToDocker}
              position={docker.position}
              onPositionChange={docker.setPosition}
              canvasId={activeCanvasId}
            />
          </MainCanvas>

          {showNavHint && !isMobile && <NavigationHint mode={mode} accentColor={accentColor} onDismiss={() => setShowNavHint(false)} />}

          {/* WebGL/XR Renderer for VR/AR modes */}
          <SpatialCanvas active={!isDesktopMode} />
        </div>

        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: `8px 12px ${safeArea.bottom + 8}px`, background: 'rgba(15,15,25,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: `1px solid ${accentColor}22` }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 3, gap: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
              <button onClick={() => { haptic('light'); handleModeChange('view'); }} style={{ padding: '8px 14px', minHeight: 38, fontSize: 13, fontWeight: 500, background: mode === 'view' ? `${accentColor}33` : 'transparent', border: 'none', borderRadius: 8, color: mode === 'view' ? 'var(--sn-cozy-lavender)' : '#94a3b8', cursor: 'pointer' }}>View</button>
              <button onClick={() => { haptic('light'); handleModeChange('edit'); }} style={{ padding: '8px 14px', minHeight: 38, fontSize: 13, fontWeight: 500, background: mode === 'edit' ? `${accentColor}33` : 'transparent', border: 'none', borderRadius: 8, color: mode === 'edit' ? 'var(--sn-cozy-lavender)' : '#94a3b8', cursor: 'pointer' }}>Edit</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => canvasRef.current?.zoomTo(0.8)} style={{ width: 38, height: 38, background: `${accentColor}25`, border: 'none', borderRadius: 8, color: '#e2e8f0', fontSize: 18, cursor: 'pointer' }}>−</button>
              <button onClick={() => canvasRef.current?.fitToView()} style={{ padding: '6px 12px', minHeight: 38, background: 'transparent', border: `1px solid ${accentColor}33`, borderRadius: 8, color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>Fit</button>
              <button onClick={() => canvasRef.current?.zoomTo(1.25)} style={{ width: 38, height: 38, background: `${accentColor}25`, border: 'none', borderRadius: 8, color: '#e2e8f0', fontSize: 18, cursor: 'pointer' }}>+</button>
            </div>
          </div>
        )}
      </main>

      <LibraryPanel widgetManifests={widgetManifests} onAddWidget={handleAddWidget} onAddSticker={handleAddSticker} canvasId={activeCanvasId} position="right" />

      <FullscreenPreview
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Canvas Preview"
        accentColor={accentColor}
        onZoomIn={() => canvasRef.current?.zoomTo(1.25)}
        onZoomOut={() => canvasRef.current?.zoomTo(0.8)}
        onResetView={() => canvasRef.current?.fitToView()}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
        renderCanvas={(deviceWidth, deviceHeight) => (
          <MainCanvas
            canvasId={activeCanvasId}
            mode="view"
            width={deviceWidth}
            height={deviceHeight}
            renderWidget={renderWidget}
            externalWidgetManifests={widgetManifests}
            showModeToggle={false}
            showZoomControls={false}
            showMinimap={false}
            showNavigator={false}
            accentColor={accentColor}
            constrainToCanvas={true}
            initialWidgets={fullscreenWidgets}
            backgroundStyle={backgroundStyle}
          />
        )}
      >
        <MainCanvas
          canvasId={activeCanvasId}
          mode="view"
          width={canvasSize.width}
          height={canvasSize.height}
          renderWidget={renderWidget}
          externalWidgetManifests={widgetManifests}
          showModeToggle={false}
          showZoomControls={false}
          showMinimap={false}
          showNavigator={false}
          accentColor={accentColor}
          constrainToCanvas={true}
          initialWidgets={fullscreenWidgets}
          backgroundStyle={backgroundStyle}
        />
      </FullscreenPreview>

      <CreateTabDialog isOpen={isCreateTabDialogOpen} onClose={() => setIsCreateTabDialogOpen(false)} accentColor={accentColor} />
      <InviteDialog canvasId={activeCanvasId} isOpen={showInviteDialog} onClose={() => setShowInviteDialog(false)} canInvite={true} />

      {tabs.map((tab) => (
        <TabContainerWrapper
          key={tab.id}
          tabId={tab.id}
          title={tab.title}
          isOpen={tab.isOpen}
          panelWidth={tab.panelWidth}
          buttonVerticalPosition={tab.buttonVerticalPosition}
          buttonSide={tab.buttonSide}
          togglePanel={() => updateTab(tab.id, { isOpen: !tab.isOpen })}
          onClose={() => deleteTab(tab.id)}
          setButtonVerticalPosition={(position) => updateTab(tab.id, { buttonVerticalPosition: position })}
          setButtonSide={(side) => updateTab(tab.id, { buttonSide: side })}
          widgets={widgets}
          isEditMode={mode === 'edit'}
          renderWidget={renderWidget}
          availableWidgets={availableWidgetsForDocker}
          onAddWidget={handleAddWidgetToDocker}
          canvasId={activeCanvasId}
          tabConfig={tab.config}
          tabIcon={tab.icon}
          onConfigChange={updateTabConfig}
          accentColor={accentColor}
        />
      ))}

      <style>{landingAnimationsCSS}</style>
    </div>
  );
};

export default LandingPage;
