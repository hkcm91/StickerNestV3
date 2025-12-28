/**
 * StickerNest v2 - Shared Canvas Page
 * Public view for shared canvases accessed via slug URL
 * Uses MainCanvas for consistent rendering with the editor
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { MainCanvas, MainCanvasRef } from '../canvas/MainCanvas';
import { WidgetSandboxHost, SandboxConfig } from '../runtime/WidgetSandboxHost';
import { EventBus } from '../runtime/EventBus';
import { BUILTIN_WIDGETS } from '../widgets/builtin';
import { getCanvasManager, type CanvasData } from '../services/canvasManager';
import { useStickerStore } from '../state/useStickerStore';
import { useThemeStore } from '../state/useThemeStore';
import { useAuth } from '../contexts/AuthContext';
import { PasswordEntryModal } from '../components/access';
import { ThemedAppBackground } from '../components/ThemedAppBackground';
import type { WidgetManifest } from '../types/manifest';
import type { WidgetInstance } from '../types/domain';
import styles from './SharedCanvasPage.module.css';

const SharedCanvasPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Get password from URL
  const urlPassword = searchParams.get('p') || undefined;

  const { isLoading: isAuthLoading, user } = useAuth();

  // Widget rendering state (same as CanvasEditorPage)
  const [mountedWidgets, setMountedWidgets] = useState<Map<string, { sandbox: WidgetSandboxHost; element: HTMLDivElement }>>(new Map());
  const pendingMountsRef = useRef<Set<string>>(new Set());
  const [testWidgetManifests, setTestWidgetManifests] = useState<WidgetManifest[]>([]);

  // Canvas refs
  const canvasRef = useRef<MainCanvasRef | null>(null);
  const eventBusRef = useRef<EventBus>(new EventBus());

  // Theme
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const hasParallaxBackground = currentTheme?.appBackground?.type === 'parallax';
  const accentColor = currentTheme?.colors?.accent?.primary || '#8b5cf6';

  // Sticker store for loading saved stickers
  const addSticker = useStickerStore((s) => s.addSticker);

  // Load test widget manifests
  useEffect(() => {
    const loadTestWidgets = async () => {
      try {
        const indexRes = await fetch('/test-widgets/index.json');
        let widgetIds: string[];
        if (indexRes.ok) {
          widgetIds = await indexRes.json();
        } else {
          widgetIds = [
            'gallery-widget', 'notes-widget', 'sticky-notes-widget', 'polaroid-widget',
            'photobooth-widget', 'slideshow-widget', 'color-sender', 'color-receiver',
          ];
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

  // Load canvas data
  useEffect(() => {
    console.log('[SharedCanvasPage] useEffect triggered:', { slug, isAuthLoading, urlPassword });
    if (!slug || isAuthLoading) {
      if (!slug) {
        console.log('[SharedCanvasPage] No slug provided');
        setError('Invalid canvas URL');
        setIsLoading(false);
      }
      return;
    }

    console.log('[SharedCanvasPage] Loading canvas with slug:', slug);
    loadSharedCanvas(slug, urlPassword);
  }, [slug, urlPassword, isAuthLoading]);

  const loadSharedCanvas = async (slug: string, password?: string) => {
    console.log('[SharedCanvasPage] loadSharedCanvas called:', { slug, hasPassword: !!password });
    setIsLoading(true);
    setError(null);
    setPasswordError(null);

    try {
      const manager = getCanvasManager('viewer');
      console.log('[SharedCanvasPage] Calling manager.loadCanvasBySlug...');
      const result = await manager.loadCanvasBySlug(slug, password);
      console.log('[SharedCanvasPage] loadCanvasBySlug result:', result);

      if (!result.success) {
        if (result.error === 'Password required') {
          setRequiresPassword(true);
          setIsLoading(false);
          return;
        }
        if (result.error === 'Invalid password') {
          setPasswordError('Incorrect password');
          setRequiresPassword(true);
          setIsLoading(false);
          return;
        }
        throw new Error(result.error || 'Failed to load canvas');
      }

      const data = result.data!;
      console.log('[SharedCanvasPage] Canvas loaded:', {
        id: data.canvas.id,
        name: data.canvas.name,
        widgetCount: data.widgets.length,
        stickerCount: data.stickers?.length || 0,
      });

      setCanvasData(data);
      setRequiresPassword(false);

      // Load stickers into store if present
      if (data.stickers && data.stickers.length > 0) {
        data.stickers.forEach(sticker => {
          addSticker(sticker);
        });
        console.log('[SharedCanvasPage] Loaded', data.stickers.length, 'stickers');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load canvas');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize canvas with widgets after data loads
  // Track if widgets have been added to avoid duplicates
  const widgetsAddedRef = useRef(false);

  useEffect(() => {
    if (!canvasData || !canvasRef.current || widgetsAddedRef.current) return;

    // Use requestAnimationFrame to ensure the canvas is properly laid out
    const frameId = requestAnimationFrame(() => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;

      // Add widgets to the canvas
      canvasData.widgets.forEach(widget => {
        canvas.addWidget(widget);
      });
      widgetsAddedRef.current = true;

      console.log('[SharedCanvasPage] Added', canvasData.widgets.length, 'widgets to canvas');

      // Fit to view after the canvas has proper dimensions
      // Use a longer delay to ensure CSS has fully applied
      setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.fitToView();
          console.log('[SharedCanvasPage] Fitted canvas to view');
        }
      }, 100);
    });

    return () => cancelAnimationFrame(frameId);
  }, [canvasData]);

  // Widget renderer (same as CanvasEditorPage)
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

    if (pendingMountsRef.current.has(widget.id)) {
      const manifest = widgetManifests.get(widget.widgetDefId);
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: 'var(--sn-text-muted)',
          fontSize: 12,
        }}>
          Loading {manifest?.name || 'widget'}...
        </div>
      );
    }

    const manifest = widgetManifests.get(widget.widgetDefId);
    if (!manifest) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: '#ef4444',
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

    pendingMountsRef.current.add(widget.id);
    const isTestWidget = !builtin && testWidgetManifests.some(m => m.id === widget.widgetDefId);

    const containerElement = document.createElement('div');
    containerElement.style.cssText = 'width:100%;height:100%';

    const config: SandboxConfig = {
      widgetInstance: widget,
      manifest,
      assetBaseUrl: isTestWidget ? `/test-widgets/${widget.widgetDefId}` : `/widgets/${widget.widgetDefId}`,
      debugEnabled: false,
      generatedHtml: builtin?.html,
      creatorId: user?.id,
    };

    const sandbox = WidgetSandboxHost.fromConfig(config, eventBusRef.current);

    setTimeout(() => {
      sandbox.mount(containerElement);
      pendingMountsRef.current.delete(widget.id);
      setMountedWidgets(prev => new Map(prev).set(widget.id, { sandbox, element: containerElement }));
    }, 0);

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        color: 'var(--sn-text-muted)',
        fontSize: 12,
      }}>
        Loading {manifest.name}...
      </div>
    );
  }, [mountedWidgets, widgetManifests, testWidgetManifests]);

  // Cleanup mounted widgets
  useEffect(() => {
    return () => {
      mountedWidgets.forEach(({ sandbox }) => sandbox.destroy());
    };
  }, [mountedWidgets]);

  // Canvas background style
  const backgroundStyle: React.CSSProperties = {
    background: 'rgba(15, 15, 25, 0.25)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Loading canvas...</span>
        </div>
      </div>
    );
  }

  // Password required state
  if (requiresPassword) {
    const handlePasswordVerify = async (password: string): Promise<boolean> => {
      if (!slug) return false;
      setPasswordError(null);

      try {
        const manager = getCanvasManager('viewer');
        const result = await manager.loadCanvasBySlug(slug, password);

        if (result.success && result.data) {
          setCanvasData(result.data);
          setRequiresPassword(false);

          if (result.data.stickers) {
            result.data.stickers.forEach(sticker => addSticker(sticker));
          }
          return true;
        }

        if (result.error === 'Invalid password') {
          setPasswordError('Incorrect password');
          return false;
        }

        setPasswordError(result.error || 'Failed to verify password');
        return false;
      } catch {
        setPasswordError('An error occurred. Please try again.');
        return false;
      }
    };

    return (
      <div className={styles.container}>
        <PasswordEntryModal
          isOpen={true}
          canvasName="Protected Canvas"
          ownerName="Canvas Owner"
          onSubmit={handlePasswordVerify}
          onCancel={() => navigate('/')}
          error={passwordError}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>Canvas Not Found</h2>
          <p className={styles.errorText}>{error}</p>
          <button
            onClick={() => navigate('/')}
            className={styles.homeButton}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // No data yet
  if (!canvasData) {
    return null;
  }

  const canvasSize = {
    width: canvasData.canvas.width || 1920,
    height: canvasData.canvas.height || 1080,
  };

  return (
    <div
      className={styles.canvasPage}
      style={{
        background: hasParallaxBackground ? 'transparent' : 'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      {/* Background */}
      {hasParallaxBackground && <ThemedAppBackground />}

      {/* Canvas IS the page */}
      <MainCanvas
        ref={canvasRef}
        canvasId={canvasData.canvas.id}
        mode="view"
        width={canvasSize.width}
        height={canvasSize.height}
        renderWidget={renderWidget}
        externalWidgetManifests={widgetManifests}
        showModeToggle={false}
        showZoomControls={true}
        showMinimap={false}
        showNavigator={false}
        showModeHint={false}
        accentColor={accentColor}
        backgroundStyle={backgroundStyle}
        eventBus={eventBusRef.current}
        constrainToCanvas={true}
      />
    </div>
  );
};

export default SharedCanvasPage;
