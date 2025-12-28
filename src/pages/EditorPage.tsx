import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Canvas,
  PropertiesPanel,
  LayersPanel,
  WidgetLibraryPanel,
  SlideOutTray,
} from '../components/editor';
import type { TrayTab } from '../components/editor';
import { LibraryPanel } from '../components/LibraryPanel';
import { useLibraryStore } from '../state/useLibraryStore';
import { WidgetDocker, useDockerState } from '../components/WidgetDocker';
import { useCanvasStore } from '../state/useCanvasStore';
import { CreativeToolbar } from '../components/CreativeToolbar';
import { useStickerStore } from '../state/useStickerStore';
import { useCanvasKeyboardShortcuts } from '../hooks/useCanvasKeyboardShortcuts';
import { KeyboardShortcutsPanel } from '../components/editor/KeyboardShortcutsPanel';
import { EventBus } from '../runtime/EventBus';
import { WidgetSandboxHost, SandboxConfig } from '../runtime/WidgetSandboxHost';
import type { WidgetInstance } from '../types/domain';
import type { WidgetManifest } from '../types/manifest';
import { BUILTIN_WIDGETS } from '../widgets/builtin';
import { useAuth } from '../contexts/AuthContext';
import { useCanvasManager } from '../services/canvasManager';
import { canvasApi, api, type CanvasWidget } from '../services/apiClient';
import { LayoutGrid, Layers, Settings, Sliders, Container } from 'lucide-react';
import { useThemeStore } from '../state/useThemeStore';
import { ThemedAppBackground } from '../components/ThemedAppBackground';

// ============================================================================
// TYPES
// ============================================================================

interface MountedWidget {
  instance: WidgetInstance;
  sandbox: WidgetSandboxHost;
  containerElement: HTMLDivElement;
}

// ============================================================================
// EDITOR PAGE COMPONENT
// ============================================================================

export function EditorPage() {
  const { canvasId } = useParams<{ canvasId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || 'demo-user';

  // Theme state
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const hasParallaxBackground = currentTheme?.appBackground?.type === 'parallax';

  // Canvas store - migrated from useEditorStore for single source of truth
  const mode = useCanvasStore(state => state.mode);
  const selection = useCanvasStore(state => state.selection);
  const select = useCanvasStore(state => state.select);
  const deselectAll = useCanvasStore(state => state.deselectAll);
  const setMode = useCanvasStore(state => state.setMode);

  // Delete handler ref - needs to be set after handleWidgetDelete is defined
  const deleteSelectedWidgetsRef = useRef<() => void>(() => {});

  // Keyboard shortcuts panel state
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);

  // Initialize keyboard shortcuts with custom shortcut handler for local state operations
  const { shortcuts, getShortcutsByCategory } = useCanvasKeyboardShortcuts({
    enabled: true,
    onShortcutTriggered: (shortcut) => {
      // Handle delete with local widget state since widgets are managed locally
      if ((shortcut.key === 'Delete' || shortcut.key === 'Backspace') && deleteSelectedWidgetsRef.current) {
        deleteSelectedWidgetsRef.current();
      }
    },
  });

  // Widget Docker State
  const docker = useDockerState();

  // Library Panel State
  const isPanelOpen = useLibraryStore((s) => s.isPanelOpen);
  const togglePanel = useLibraryStore((s) => s.togglePanel);

  // Sticker Store
  const setDraggedWidgetId = useStickerStore(state => state.setDraggedWidget);
  const addSticker = useStickerStore(state => state.addSticker);

  // Canvas manager
  const {
    loadCanvas,
  } = useCanvasManager(userId);

  // Local state
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [mountedWidgets, setMountedWidgets] = useState<Map<string, MountedWidget>>(new Map());
  const [eventBus] = useState(() => new EventBus());

  // Slide-out tray state
  const [leftTrayOpen, setLeftTrayOpen] = useState(true);
  const [leftTrayTab, setLeftTrayTab] = useState<string>('library');
  const [rightTrayOpen, setRightTrayOpen] = useState(false);
  const [rightTrayTab, setRightTrayTab] = useState<string>('properties');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [, setLastSaved] = useState<Date | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [canvasVisibility, setCanvasVisibility] = useState<'private' | 'unlisted' | 'public'>('private');
  const { isLocalDevMode } = useAuth();

  // State for test widget manifests loaded from public folder
  const [testWidgetManifests, setTestWidgetManifests] = useState<WidgetManifest[]>([]);

  // Derived state
  const manifestsMap = useMemo(() => {
    const map = new Map<string, WidgetManifest>();
    Object.values(BUILTIN_WIDGETS).forEach(w => map.set(w.manifest.id, w.manifest));
    testWidgetManifests.forEach(m => map.set(m.id, m));
    return map;
  }, [testWidgetManifests]);

  const selectedWidget = useMemo(() => {
    if (selection.selectedIds.size !== 1) return null;
    const id = Array.from(selection.selectedIds)[0];
    return widgets.find(w => w.id === id) || null;
  }, [selection.selectedIds, widgets]);

  const selectedManifest = selectedWidget ? manifestsMap.get(selectedWidget.widgetDefId) : null;
  // State for saved widget presets
  const [savedPresets, setSavedPresets] = useState<WidgetManifest[]>([]);
  const [presetStates, setPresetStates] = useState<Map<string, any>>(new Map());

  // Handle Save Preset
  const handleSavePreset = useCallback((containerId: string) => {
    const container = widgets.find(w => w.id === containerId);
    if (!container) return;

    const defaultName = container.name || "My Dock";
    const name = window.prompt("Enter a name for this dock preset:", defaultName);
    if (!name) return;

    const presetId = `preset-${Date.now()}`;
    const baseManifest = BUILTIN_WIDGETS['stickernest.container'].manifest;

    const presetManifest: WidgetManifest = {
      ...baseManifest,
      id: presetId,
      name: name,
      description: `Saved dock preset with ${container.state?.children?.length || 0} widgets`,
      kind: 'container',
      tags: [...(baseManifest.tags || []), 'preset']
    };

    setSavedPresets(prev => [...prev, presetManifest]);
    setPresetStates(prev => {
      const next = new Map(prev);
      next.set(presetId, container.state);
      return next;
    });
    alert(`Saved dock "${name}" to library!`);
  }, [widgets]);

  // Load test widget manifests on mount
  useEffect(() => {
    const loadTestWidgets = async () => {
      try {
        const response = await fetch('/test-widgets/');
        if (!response.ok) {
          const indexResponse = await fetch('/test-widgets/index.json');
          if (indexResponse.ok) {
            const widgetIds = await indexResponse.json();
            const manifests = await Promise.all(
              widgetIds.map(async (id: string) => {
                try {
                  const manifestRes = await fetch(`/test-widgets/${id}/manifest.json`);
                  if (manifestRes.ok) return await manifestRes.json();
                } catch (e) { /* ignore */ }
                return null;
              })
            );
            setTestWidgetManifests(manifests.filter((m): m is WidgetManifest => !!m));
            return;
          }
          // Fallback list - all test widgets from public/test-widgets directory
          const knownWidgets = [
            // Media & Gallery
            'gallery-widget', 'notes-widget', 'sticky-notes-widget', 'polaroid-widget',
            'photobooth-widget', 'slideshow-widget', 'photo-generation-widget', 'video-generation-widget',
            'youtube-playlist-widget', 'spotify-playlist-widget',
            // Image & Text Tools
            'image-editor', 'image-tool', 'image-crop-mask', 'text-editor', 'text-tool', 'text-styles',
            'text-effects', 'text-block', 'shape-tool', 'shape-generator', 'shape-element', 'shape-spawner',
            'gradient-maker', 'word-processor-widget',
            // Buttons & Controls
            'button-element', 'link-button', 'buttonpad', 'button-deck',
            // Communication & Messaging
            'color-sender', 'color-receiver', 'ping-sender', 'ping-receiver',
            'type-sender', 'type-receiver', 'message-sender', 'message-receiver',
            // Canvas Tools
            'canvas-grid', 'canvas-filters', 'canvas-bg-color', 'canvas-bg-pattern',
            'canvas-dimension-listener', 'drop-shadow-control', 'filter-overlay',
            // Vector Tools
            'vector-canvas', 'vector-editor', 'vector-transform', 'vector-style-panel',
            'vector-export', 'vector-color-picker', 'vector-layers', 'isometric-grid',
            // Dashboard & Productivity
            'dashboard-analytics', 'project-tracker', 'activity-feed', 'chat-room',
            'notification-center', 'kanban-board', 'time-tracker',
            // Game & Farm Widgets
            'game-character', 'farm-crop-plot', 'farm-seed-bag', 'farm-stats', 'farm-weather',
            'farm-sprinkler', 'sprite-manager',
            // Tamagotchi Widgets
            'tamagotchi-hub', 'tamagotchi-moodlet', 'tamagotchi-pet', 'tamagotchi-todo',
            // Audio & Media
            'synth-master', 'source-audio', 'source-video', 'transport-monitor',
            // Pipeline Widgets
            'pipeline-button', 'pipeline-text', 'pipeline-progressbar', 'pipeline-timer',
            'pipeline-visualizer', 'preview-player-widget',
            // AI Widgets
            'prompt-options-widget', 'api-settings-widget', 'lora-training-widget',
            'ai-widget-generator',
            // Debug & Testing Widgets
            'cursor-tracker', 'state-mirror', 'echo-widget', 'event-flooder',
            'random-state-mutator', 'identity-debugger', 'latency-simulator', 'sandbox-breaker',
            'stress-generator',
            // Effects & Misc
            'effect-glitch', 'folder-widget'
          ];
          const manifests = await Promise.all(
            knownWidgets.map(async (id) => {
              try {
                const manifestRes = await fetch(`/test-widgets/${id}/manifest.json`);
                if (manifestRes.ok) return await manifestRes.json();
              } catch (e) { /* ignore */ }
              return null;
            })
          );
          setTestWidgetManifests(manifests.filter((m): m is WidgetManifest => !!m));
        }
      } catch (error) {
        console.warn('Failed to load test widgets:', error);
      }
    };
    loadTestWidgets();
  }, []);

  // Get manifests
  const widgetManifests = useMemo(() => {
    const manifests = new Map<string, WidgetManifest>();
    Object.values(BUILTIN_WIDGETS).forEach((def) => {
      manifests.set(def.manifest.id, def.manifest);
    });
    testWidgetManifests.forEach((manifest) => {
      manifests.set(manifest.id, manifest);
    });
    savedPresets.forEach((manifest) => {
      manifests.set(manifest.id, manifest);
    });
    return manifests;
  }, [testWidgetManifests, savedPresets]);

  // Load canvas from localStorage or API when canvasId changes
  useEffect(() => {
    if (!canvasId) return;
    
    const loadCanvasData = async () => {
      console.log('[EditorPage] Loading canvas:', canvasId);
      
      if (isLocalDevMode) {
        // Load from localStorage in local dev mode
        const key = `stickernest-canvas-${canvasId}`;
        const canvasStr = localStorage.getItem(key);
        
        if (canvasStr) {
          try {
            const canvasData = JSON.parse(canvasStr);
            console.log('[EditorPage] Loaded canvas data:', canvasData.canvas?.name, 'widgets:', canvasData.widgets?.length);
            
            // Load widgets from saved data
            if (canvasData.widgets && Array.isArray(canvasData.widgets)) {
              setWidgets(canvasData.widgets.map((w: any) => ({
                id: w.id,
                canvasId: canvasId,
                widgetDefId: w.widgetDefId,
                version: w.version || '1.0.0',
                name: w.name,
                position: w.position || { x: 100, y: 100 },
                width: w.width || 300,
                height: w.height || 200,
                sizePreset: w.sizePreset || 'md',
                rotation: w.rotation || 0,
                state: w.state || {},
                zIndex: w.zIndex || 0,
                visible: w.visible !== false,
                locked: w.locked || false,
                opacity: w.opacity ?? 1,
                metadata: w.metadata || {},
              })));
            }
          } catch (e) {
            console.error('[EditorPage] Failed to parse canvas data:', e);
          }
        } else {
          console.log('[EditorPage] No canvas data found for:', canvasId);
          // Initialize empty canvas in localStorage
          const now = new Date().toISOString();
          const newCanvasData = {
            canvas: {
              id: canvasId,
              userId: userId,
              name: 'Untitled Canvas',
              visibility: 'private',
              createdAt: now,
              updatedAt: now,
              width: 1920,
              height: 1080,
            },
            widgets: [],
            pipelines: [],
            entities: [],
          };
          localStorage.setItem(key, JSON.stringify(newCanvasData));
          
          // Add to index if not present
          const indexStr = localStorage.getItem('stickernest-canvas-index');
          const index: string[] = indexStr ? JSON.parse(indexStr) : [];
          if (!index.includes(canvasId)) {
            index.push(canvasId);
            localStorage.setItem('stickernest-canvas-index', JSON.stringify(index));
          }
        }
        return;
      }
      
      // Load from API for non-local dev mode
      try {
        const result = await loadCanvas(canvasId);
        if (result.success && result.data) {
          setWidgets(result.data.widgets || []);
        }
      } catch (error) {
        console.error('[EditorPage] Failed to load canvas:', error);
      }
    };
    
    loadCanvasData();
  }, [canvasId, isLocalDevMode, userId, loadCanvas]);

  // Mount/unmount
  useEffect(() => {
    const newMounted = new Map<string, MountedWidget>();
    widgets.forEach(widget => {
      const existing = mountedWidgets.get(widget.id);
      if (existing) {
        newMounted.set(widget.id, existing);
      } else {
        const manifest = widgetManifests.get(widget.widgetDefId);
        if (!manifest) return;
        const builtin = BUILTIN_WIDGETS[widget.widgetDefId];
        // Skip React component widgets - they don't need SandboxHost/iframe
        if (builtin?.component) return;
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
        const sandbox = WidgetSandboxHost.fromConfig(config, eventBus);
        newMounted.set(widget.id, { instance: widget, sandbox, containerElement });
      }
    });

    mountedWidgets.forEach((mounted, id) => {
      if (!newMounted.has(id)) mounted.sandbox.destroy();
    });

    setMountedWidgets(newMounted);

    setTimeout(() => {
      newMounted.forEach((mounted) => {
        if (!mounted.containerElement.querySelector('iframe')) {
          mounted.sandbox.mount(mounted.containerElement);
        }
      });
    }, 0);
  // Note: mountedWidgets intentionally excluded to prevent infinite loop
  }, [widgets, widgetManifests, testWidgetManifests, eventBus]);

  // Update
  const handleWidgetUpdate = useCallback((id: string, updates: Partial<WidgetInstance>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    const mounted = mountedWidgets.get(id);
    if (mounted) {
      if (updates.width || updates.height) {
        mounted.sandbox.sendResize(updates.width || mounted.instance.width, updates.height || mounted.instance.height);
      }
      if (updates.state) mounted.sandbox.setState(updates.state);
    }
  }, [mountedWidgets]);

  // Delete single widget
  const handleWidgetDelete = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    const mounted = mountedWidgets.get(id);
    if (mounted) {
      mounted.sandbox.destroy();
      setMountedWidgets(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
    deselectAll();
  }, [mountedWidgets, deselectAll]);

  // Delete all selected widgets (for keyboard shortcut)
  const handleDeleteSelectedWidgets = useCallback(() => {
    const selectedIds = Array.from(selection.selectedIds);
    if (selectedIds.length === 0) return;

    selectedIds.forEach(id => {
      const mounted = mountedWidgets.get(id);
      if (mounted) {
        mounted.sandbox.destroy();
      }
    });

    setWidgets(prev => prev.filter(w => !selectedIds.includes(w.id)));
    setMountedWidgets(prev => {
      const next = new Map(prev);
      selectedIds.forEach(id => next.delete(id));
      return next;
    });
    deselectAll();
  }, [selection.selectedIds, mountedWidgets, deselectAll]);

  // Update ref for keyboard shortcut access
  useEffect(() => {
    deleteSelectedWidgetsRef.current = handleDeleteSelectedWidgets;
  }, [handleDeleteSelectedWidgets]);

  // Add Widget
  const handleAddWidget = useCallback((widgetDefId: string, position?: { x: number; y: number }) => {
    const manifest = widgetManifests.get(widgetDefId);
    if (!manifest) return;

    const isBuiltin = !!BUILTIN_WIDGETS[widgetDefId];
    const isTestWidget = testWidgetManifests.some(m => m.id === widgetDefId);
    const isPreset = presetStates.has(widgetDefId);

    let initialState = {};
    if (isPreset) {
      initialState = JSON.parse(JSON.stringify(presetStates.get(widgetDefId)));
    }

    const newWidget: WidgetInstance = {
      id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      canvasId: canvasId || 'sandbox',
      widgetDefId,
      version: manifest.version,
      name: manifest.name,
      position: position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      width: manifest.size?.width || 300,
      height: manifest.size?.height || 200,
      sizePreset: 'md',
      rotation: 0,
      state: initialState,
      zIndex: widgets.length,
      visible: true,
      locked: false,
      opacity: 1,
      metadata: { source: isBuiltin ? 'official' : isTestWidget ? 'local' : 'user' }
    };
    setWidgets(prev => [...prev, newWidget]);
  }, [widgetManifests, testWidgetManifests, widgets.length, presetStates, canvasId]);

  // Add Multiple Widgets (for pipelines)
  const handleAddMultipleWidgets = useCallback((widgetDefIds: string[]) => {
    const newWidgets: WidgetInstance[] = [];
    let baseX = 100;
    let baseY = 100;
    const spacing = 320; // Space between widgets
    const columns = 3;

    widgetDefIds.forEach((widgetDefId, index) => {
      const manifest = widgetManifests.get(widgetDefId);
      if (!manifest) return;

      const isBuiltin = !!BUILTIN_WIDGETS[widgetDefId];
      const isTestWidget = testWidgetManifests.some(m => m.id === widgetDefId);

      // Calculate grid position
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = baseX + col * spacing + Math.random() * 20;
      const y = baseY + row * spacing + Math.random() * 20;

      const newWidget: WidgetInstance = {
        id: `widget-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
        canvasId: canvasId || 'sandbox',
        widgetDefId,
        version: manifest.version,
        name: manifest.name,
        position: { x, y },
        width: manifest.size?.width || 300,
        height: manifest.size?.height || 200,
        sizePreset: 'md',
        rotation: 0,
        state: {},
        zIndex: widgets.length + index,
        visible: true,
        locked: false,
        opacity: 1,
        metadata: { source: isBuiltin ? 'official' : isTestWidget ? 'local' : 'user' }
      };
      newWidgets.push(newWidget);
    });

    if (newWidgets.length > 0) {
      setWidgets(prev => [...prev, ...newWidgets]);
    }
  }, [widgetManifests, testWidgetManifests, widgets.length, canvasId]);

  // Render Widget
  const renderWidget = useCallback((widget: WidgetInstance) => {
    const mounted = mountedWidgets.get(widget.id);
    if (!mounted) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sn-bg-secondary)', color: 'var(--sn-text-muted)', fontSize: 12 }}>
          Loading...
        </div>
      );
    }
    return (
      <div style={{ width: '100%', height: '100%' }} ref={(el) => {
        if (el && mounted.containerElement.parentElement !== el) el.appendChild(mounted.containerElement);
      }} />
    );
  }, [mountedWidgets]);

  // Save
  const handleSave = useCallback(async () => {
    if (!canvasId) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (isLocalDevMode) {
        // Actually save to localStorage in local dev mode
        const key = `stickernest-canvas-${canvasId}`;
        const existingStr = localStorage.getItem(key);
        let canvasData;
        
        if (existingStr) {
          try {
            canvasData = JSON.parse(existingStr);
          } catch {
            canvasData = null;
          }
        }
        
        const now = new Date().toISOString();
        
        // Create or update canvas data
        const newCanvasData = {
          canvas: canvasData?.canvas || {
            id: canvasId,
            userId: userId,
            name: 'Untitled Canvas',
            visibility: 'private',
            createdAt: now,
            width: 1920,
            height: 1080,
          },
          widgets: widgets.map(w => ({
            id: w.id,
            canvasId: canvasId,
            widgetDefId: w.widgetDefId,
            position: w.position,
            sizePreset: w.sizePreset || 'md',
            width: w.width,
            height: w.height,
            rotation: w.rotation,
            zIndex: w.zIndex,
            state: w.state || {},
            metadata: w.metadata,
          })),
          pipelines: canvasData?.pipelines || [],
          entities: canvasData?.entities || [],
        };
        
        // Update the updatedAt timestamp
        newCanvasData.canvas.updatedAt = now;
        
        // Save to localStorage
        localStorage.setItem(key, JSON.stringify(newCanvasData));
        
        // Ensure canvas is in index
        const indexStr = localStorage.getItem('stickernest-canvas-index');
        const index: string[] = indexStr ? JSON.parse(indexStr) : [];
        if (!index.includes(canvasId)) {
          index.push(canvasId);
          localStorage.setItem('stickernest-canvas-index', JSON.stringify(index));
        }
        
        console.log('[EditorPage] Saved canvas to localStorage:', canvasId, 'widgets:', widgets.length);
        
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        setIsSaving(false);
        return;
      }
      const apiWidgets: CanvasWidget[] = widgets.map(w => ({
        id: w.id,
        canvas_id: canvasId,
        type: w.widgetDefId,
        position: w.position,
        size: { width: w.width, height: w.height },
        config: w.state || {},
        zIndex: w.zIndex,
      }));
      const response = await canvasApi.update(canvasId, { widgets: apiWidgets });
      if (response.success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
      } else {
        setSaveError(response.error?.message || 'Failed to save canvas');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save canvas');
    } finally {
      setIsSaving(false);
    }
  }, [canvasId, widgets, isLocalDevMode, userId]);

  // Publish
  const handlePublish = useCallback(async () => {
    if (!canvasId) return;
    setIsPublishing(true);
    try {
      if (isLocalDevMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setPublishedUrl(`${window.location.origin}/c/mock-canvas-slug`);
        setIsPublishing(false);
        return;
      }
      if (hasUnsavedChanges) await handleSave();
      const response = await api.put(`/canvas/${canvasId}/share`, { visibility: canvasVisibility });
      if (response.success && response.data) {
        const slug = (response.data as { slug?: string })?.slug || canvasId;
        setPublishedUrl(`${window.location.origin}/c/${slug}`);
      } else {
        setSaveError(response.error?.message || 'Failed to publish canvas');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish canvas');
    } finally {
      setIsPublishing(false);
    }
  }, [canvasId, canvasVisibility, hasUnsavedChanges, handleSave, isLocalDevMode]);

  const copyPublishedUrl = () => {
    if (publishedUrl) navigator.clipboard.writeText(publishedUrl);
  };

  // Tracking
  const initialWidgetsRef = useRef<string>('');
  useEffect(() => {
    if (widgets.length > 0 && !initialWidgetsRef.current) {
      initialWidgetsRef.current = JSON.stringify(widgets);
    } else if (initialWidgetsRef.current) {
      const currentWidgets = JSON.stringify(widgets);
      setHasUnsavedChanges(currentWidgets !== initialWidgetsRef.current);
    }
  }, [widgets]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const autoSaveTimer = setTimeout(() => { handleSave(); }, 30000);
    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, handleSave]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // '?' key to open keyboard shortcuts panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if target is input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowShortcutsPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // Dock Logic
  const handleWidgetDock = useCallback((draggedId: string, targetId: string) => {
    const draggedWidget = widgets.find(w => w.id === draggedId);
    const targetContainer = widgets.find(w => w.id === targetId);
    if (!draggedWidget || !targetContainer) return;

    const builtinDef = BUILTIN_WIDGETS[draggedWidget.widgetDefId];
    const newWidgets = widgets.filter(w => w.id !== draggedWidget.id);
    setWidgets(newWidgets);

    const newChildren = [
      ...(targetContainer.state?.children || []),
      {
        id: draggedWidget.id,
        name: draggedWidget.name || 'Widget',
        widgetDefId: draggedWidget.widgetDefId,
        savedInstance: draggedWidget,
        html: builtinDef?.html,
        manifest: builtinDef?.manifest
      }
    ];

    const newContainerState = { ...targetContainer.state, children: newChildren };
    setWidgets(prev => prev.map(w => w.id === targetId ? { ...w, state: newContainerState } : w));

    const mounted = mountedWidgets.get(targetId);
    if (mounted) mounted.sandbox.setState(newContainerState);
  }, [widgets, mountedWidgets]);

  // Undock Logic
  const handleUndock = useCallback((containerId: string, childId: string) => {
    const container = widgets.find(w => w.id === containerId);
    if (!container || !container.state || !container.state.children) return;

    const child = container.state.children.find((c: { id: string;[key: string]: any }) => c.id === childId);
    if (!child) return;

    const newChildren = container.state.children.filter((c: { id: string }) => c.id !== childId);
    const newContainerState = { ...container.state, children: newChildren };

    const mountedContainer = mountedWidgets.get(containerId);
    if (mountedContainer) mountedContainer.sandbox.setState(newContainerState);

    const updatedWidgets = widgets.map(w => w.id === containerId ? { ...w, state: newContainerState } : w);

    const restoredWidget: WidgetInstance = {
      ...(child.savedInstance || {}),
      id: child.id,
      canvasId: canvasId || 'sandbox',
      widgetDefId: child.widgetDefId,
      position: { x: container.position.x + container.width + 20, y: container.position.y },
      zIndex: widgets.length + 10,
      visible: true,
      width: child.savedInstance?.width || 200,
      height: child.savedInstance?.height || 200,
      state: child.savedInstance?.state || {}
    };

    setWidgets([...updatedWidgets, restoredWidget]);
  }, [widgets, mountedWidgets, canvasId]);

  // Remove Logic
  const handleRemoveChild = useCallback((containerId: string, childId: string) => {
    const container = widgets.find(w => w.id === containerId);
    if (!container) return;

    const newChildren = (container.state?.children || []).filter((c: { id: string }) => c.id !== childId);
    const newContainerState = { ...container.state, children: newChildren };

    const mounted = mountedWidgets.get(containerId);
    if (mounted) mounted.sandbox.setState(newContainerState);

    setWidgets(prev => prev.map(w => w.id === containerId ? { ...w, state: newContainerState } : w));
  }, [widgets, mountedWidgets]);

  // EventBus Listener
  useEffect(() => {
    const unsubscribe = eventBus.on('*', (event: { type: string, payload: any, sourceWidgetId?: string }) => {
      if (event.type === 'widget:stateChanged') {
        const { widgetInstanceId, state } = event.payload;
        setWidgets(prev => prev.map(w =>
          w.id === widgetInstanceId
            ? { ...w, state: { ...w.state, ...state } }
            : w
        ));
      }
      if (event.type === 'widget:output') {
        if (event.payload?.portName === 'action.triggered' ||
          (event.payload?.value && event.payload.value.action)) {

          const data = event.payload.value;
          if (data && data.action && event.sourceWidgetId) {
            const containerId = event.sourceWidgetId;
            if (data.action === 'undock') {
              handleUndock(containerId, data.childId);
            } else if (data.action === 'remove') {
              handleRemoveChild(containerId, data.childId);
            } else if (data.action === 'save_preset') {
              handleSavePreset(containerId);
            }
          }
        }
      }
    });
    return () => unsubscribe();
  }, [eventBus, handleUndock, handleRemoveChild, handleSavePreset]);

  // Docker Widget Rendering - supports responsive container size
  const handleDockerRender = useCallback((widget: WidgetInstance, containerSize?: { width: number; height: number }) => {
    const mounted = mountedWidgets.get(widget.id);
    if (mounted && mounted.containerElement) {
      return (
        <div
          ref={el => { if (el && mounted.containerElement.parentElement !== el) el.appendChild(mounted.containerElement); }}
          style={{ 
            width: containerSize?.width || '100%', 
            height: containerSize?.height || '100%', 
            minHeight: 150,
            overflow: 'auto',
          }}
        />
      );
    }
    return <div style={{ padding: 16, fontSize: 12, color: 'var(--sn-text-muted)' }}>{widget.name || 'Loading...'}</div>;
  }, [mountedWidgets]);

  // Handle undocking from docker and restoring widget position
  const handleUndockFromDocker = useCallback((widgetId: string) => {
    const dockedState = docker.undock(widgetId);
    if (dockedState) {
      // Restore widget to original position
      setWidgets(prev => prev.map(w =>
        w.id === widgetId
          ? {
              ...w,
              position: dockedState.originalPos,
              width: dockedState.originalSize.width,
              height: dockedState.originalSize.height,
              zIndex: Math.max(dockedState.originalZ, widgets.length + 5),
              rotation: dockedState.originalRot,
            }
          : w
      ));
    }
    return dockedState;
  }, [docker, widgets.length]);

  // Handle adding a widget and docking it immediately
  const handleAddWidgetToDocker = useCallback((widgetDefId: string) => {
    const manifest = widgetManifests.get(widgetDefId);
    if (!manifest) return;

    const newWidget: WidgetInstance = {
      id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      canvasId: canvasId || 'sandbox',
      widgetDefId,
      version: manifest.version,
      name: manifest.name,
      position: { x: -1000, y: -1000 }, // Off-screen position since it's docked
      width: manifest.size?.width || 300,
      height: manifest.size?.height || 200,
      sizePreset: 'md',
      rotation: 0,
      state: {},
      zIndex: widgets.length,
      visible: true,
      locked: false,
      opacity: 1,
      metadata: { source: 'docker' },
    };

    setWidgets(prev => [...prev, newWidget]);

    // Dock the widget after creation
    setTimeout(() => {
      docker.dock(newWidget);
    }, 50);
  }, [widgetManifests, canvasId, widgets.length, docker]);

  // Available widgets for the docker widget picker
  const availableWidgetsForDocker = useMemo(() => {
    return Array.from(widgetManifests.values()).map(m => ({
      id: m.id,
      name: m.name,
      icon: m.icon,
      description: m.description,
    }));
  }, [widgetManifests]);

  // JSX
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: hasParallaxBackground ? 'transparent' : 'var(--sn-bg-primary)',
      color: 'var(--sn-text-primary)',
      position: 'relative',
    }}>
      {/* Themed parallax background */}
      {hasParallaxBackground && <ThemedAppBackground />}

      {/* New Slide-out Library Panel */}
      <LibraryPanel
        widgetManifests={widgetManifests}
        onAddWidget={handleAddWidget}
        onAddMultipleWidgets={handleAddMultipleWidgets}
        onAddSticker={addSticker}
        canvasId={canvasId || 'sandbox'}
        position="left"
      />

      {/* Header */}
      <div style={{
        height: 48,
        borderBottom: '1px solid var(--sn-glass-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: hasParallaxBackground ? 'var(--sn-glass-bg)' : 'var(--sn-bg-primary)',
        backdropFilter: hasParallaxBackground ? 'blur(var(--sn-glass-blur-md))' : 'none',
        WebkitBackdropFilter: hasParallaxBackground ? 'blur(var(--sn-glass-blur-md))' : 'none',
        zIndex: 10,
      }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', color: 'var(--sn-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          ← Back to Profile
        </button>
        <div style={{ width: 1, height: 24, background: 'var(--sn-border-primary)', margin: '0 16px' }} />
        <span style={{ fontWeight: 500 }}>Canvas Editor</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', background: 'var(--sn-bg-tertiary)', padding: 2, borderRadius: 6, marginRight: 8 }}>
            <button
              onClick={() => setMode('edit')}
              style={{
                padding: '4px 12px',
                background: mode === 'edit' ? 'var(--sn-bg-elevated)' : 'transparent',
                color: mode === 'edit' ? 'var(--sn-text-primary)' : 'var(--sn-text-muted)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 13
              }}
            >
              Edit
            </button>
            <button
              onClick={() => {
                setMode('view');
                deselectAll();
              }}
              style={{
                padding: '4px 12px',
                background: mode === 'view' ? 'var(--sn-bg-elevated)' : 'transparent',
                color: mode === 'view' ? 'var(--sn-text-primary)' : 'var(--sn-text-muted)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 13
              }}
            >
              Preview
            </button>
          </div>
          <button onClick={docker.toggle} style={{ padding: '6px 12px', background: docker.visible ? 'var(--sn-bg-elevated)' : 'transparent', border: '1px solid var(--sn-border-secondary)', borderRadius: 6, color: 'var(--sn-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Container size={14} />
            Docker
          </button>
          <button onClick={() => setLeftTrayOpen(!leftTrayOpen)} style={{ padding: '6px 12px', background: leftTrayOpen ? 'var(--sn-bg-elevated)' : 'transparent', border: '1px solid var(--sn-border-secondary)', borderRadius: 6, color: 'var(--sn-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LayoutGrid size={14} />
            Library
          </button>
          <button onClick={() => setRightTrayOpen(!rightTrayOpen)} style={{ padding: '6px 12px', background: rightTrayOpen ? 'var(--sn-bg-elevated)' : 'transparent', border: '1px solid var(--sn-border-secondary)', borderRadius: 6, color: 'var(--sn-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sliders size={14} />
            Properties
          </button>
          <button onClick={() => window.open(`/canvas/${canvasId}?tab=lab`, '_self')} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--sn-border-secondary)', borderRadius: 6, color: 'var(--sn-text-primary)', cursor: 'pointer' }}>
            Widget Lab
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--sn-border-primary)', margin: '0 8px' }} />
          {canvasId && (
            <>
              <button onClick={() => setShowPublishModal(true)} style={{ padding: '6px 12px', background: 'var(--sn-bg-elevated)', border: 'none', borderRadius: 6, color: 'var(--sn-text-primary)', cursor: 'pointer' }}>
                Publish
              </button>
              <button onClick={handleSave} disabled={isSaving} style={{ padding: '6px 12px', background: 'var(--sn-accent-primary)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Main Canvas - Full width, panels overlay */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: hasParallaxBackground ? 'transparent' : 'var(--sn-bg-secondary)' }}>
          {/* Creative Toolbar - Vertically Centered (Edit Mode Only) */}
          {mode === 'edit' && (
            <div style={{ position: 'absolute', top: '50%', left: leftTrayOpen ? 340 : 16, transform: 'translateY(-50%)', zIndex: 100, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <CreativeToolbar />
            </div>
          )}
          <Canvas
            widgets={widgets.filter(w => !docker.dockedIds.includes(w.id))}
            renderWidget={renderWidget}
            onWidgetUpdate={handleWidgetUpdate}
            onWidgetDock={handleWidgetDock}
            onDockToDocker={(widgetId) => {
              const widget = widgets.find(w => w.id === widgetId);
              if (widget) {
                docker.dock(widget);
                docker.setVisible(true);
              }
            }}
            eventBus={eventBus}
            onWidgetDragStart={(id) => setDraggedWidgetId(id)}
            onWidgetDragEnd={() => setDraggedWidgetId(null)}
            canvasId={canvasId || 'sandbox'}
            onAddWidget={handleAddWidget}
          >
            {/* Widget Docker */}
            <WidgetDocker
              widgets={widgets}
              dockedIds={docker.dockedIds}
              isEditMode={mode === 'edit'}
              visible={docker.visible}
              onToggle={docker.toggle}
              onDock={docker.dock}
              onUndock={handleUndockFromDocker}
              renderWidget={handleDockerRender}
              availableWidgets={availableWidgetsForDocker}
              onAddWidget={handleAddWidgetToDocker}
              position={docker.position}
              onPositionChange={docker.setPosition}
              canvasId={canvasId}
            />
          </Canvas>

          {/* Left Slide-Out Tray */}
          <SlideOutTray
            id="left-tray"
            position="left"
            isOpen={leftTrayOpen}
            onToggle={setLeftTrayOpen}
            activeTab={leftTrayTab}
            onTabChange={setLeftTrayTab}
            width={320}
            minWidth={280}
            maxWidth={450}
            showCloseButton={false}
            tabs={[
              {
                id: 'library',
                label: 'Library',
                icon: <LayoutGrid size={16} />,
                content: (
                  <div style={{ height: '100%', overflow: 'auto' }}>
                    <WidgetLibraryPanel onAddWidget={handleAddWidget} customWidgets={savedPresets} />
                  </div>
                ),
              },
              {
                id: 'layers',
                label: 'Layers',
                icon: <Layers size={16} />,
                badge: widgets.length > 0 ? widgets.length : undefined,
                content: (
                  <div style={{ height: '100%', overflow: 'auto' }}>
                    <LayersPanel
                      widgets={widgets}
                      manifests={manifestsMap}
                      onSelect={(id, additive) => select(id, additive)}
                      onReorder={(id, zIndex) => handleWidgetUpdate(id, { zIndex })}
                      onVisibilityToggle={(id, visible) => {
                        const w = widgets.find(wi => wi.id === id);
                        if (w) handleWidgetUpdate(id, { state: { ...w.state, visible } });
                      }}
                      onLockToggle={(id, locked) => handleWidgetUpdate(id, { locked })}
                      onDelete={(id) => handleWidgetDelete(id)}
                    />
                  </div>
                ),
              },
            ] as TrayTab[]}
          />

          {/* Right Slide-Out Tray */}
          <SlideOutTray
            id="right-tray"
            position="right"
            isOpen={rightTrayOpen}
            onToggle={setRightTrayOpen}
            activeTab={rightTrayTab}
            onTabChange={setRightTrayTab}
            width={300}
            minWidth={260}
            maxWidth={400}
            showCloseButton={false}
            tabs={[
              {
                id: 'properties',
                label: 'Properties',
                icon: <Sliders size={16} />,
                content: (
                  <div style={{ height: '100%', overflow: 'auto' }}>
                    {selectedWidget ? (
                      <PropertiesPanel
                        widget={selectedWidget}
                        manifest={selectedManifest || null}
                        onPropertyChange={(prop, value) => {
                          if (['opacity', 'rotation', 'zIndex', 'borderRadius', 'shadow'].includes(prop)) {
                            handleWidgetUpdate(selectedWidget.id, { [prop]: value });
                          } else {
                            handleWidgetUpdate(selectedWidget.id, { state: { ...selectedWidget.state, [prop]: value } });
                          }
                        }}
                        onPositionChange={(x, y) => handleWidgetUpdate(selectedWidget.id, { position: { x, y } })}
                        onSizeChange={(width, height) => handleWidgetUpdate(selectedWidget.id, { width, height })}
                        onClose={() => setRightTrayOpen(false)}
                      />
                    ) : (
                      <div style={{ padding: 20, color: 'var(--sn-text-muted)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                        <Settings size={32} style={{ opacity: 0.5 }} />
                        <span>Select a widget to edit properties</span>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: 'settings',
                label: 'Settings',
                icon: <Settings size={16} />,
                content: (
                  <div style={{ padding: 16, color: 'var(--sn-text-muted)' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--sn-text-primary)' }}>Canvas Settings</div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>More settings coming soon...</div>
                  </div>
                ),
              },
            ] as TrayTab[]}
          />
        </div>
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--sn-overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(var(--sn-glass-blur-sm))' }}>
          <div style={{ width: 400, background: 'var(--sn-glass-card-bg)', padding: 24, borderRadius: 12, border: '1px solid var(--sn-glass-border)', backdropFilter: 'blur(var(--sn-glass-blur-lg))' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--sn-text-primary)' }}>Publish Canvas</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--sn-text-muted)' }}>Visibility</label>
              <select value={canvasVisibility} onChange={e => setCanvasVisibility(e.target.value as 'private' | 'unlisted' | 'public')} style={{ width: '100%', padding: 8, background: 'var(--sn-bg-tertiary)', border: '1px solid var(--sn-border-secondary)', borderRadius: 6, color: 'var(--sn-text-primary)' }}>
                <option value="private">Private</option>
                <option value="unlisted">Unlisted (Anyone with link)</option>
                <option value="public">Public</option>
              </select>
            </div>
            {publishedUrl && (
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--sn-bg-tertiary)', borderRadius: 6, wordBreak: 'break-all' }}>
                <div style={{ fontSize: 12, color: 'var(--sn-text-muted)', marginBottom: 4 }}>Public URL</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, flex: 1, color: 'var(--sn-text-primary)' }}>{publishedUrl}</span>
                  <button onClick={copyPublishedUrl} style={{ padding: '4px 8px', fontSize: 12, background: 'var(--sn-bg-elevated)', border: 'none', borderRadius: 4, color: 'var(--sn-text-primary)', cursor: 'pointer' }}>Copy</button>
                </div>
              </div>
            )}
            {saveError && <div style={{ marginBottom: 16, color: 'var(--sn-error)', fontSize: 14 }}>{saveError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPublishModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--sn-border-secondary)', borderRadius: 6, color: 'var(--sn-text-primary)', cursor: 'pointer' }}>Close</button>
              <button onClick={handlePublish} disabled={isPublishing} style={{ padding: '8px 16px', background: 'var(--sn-accent-primary)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer' }}>{isPublishing ? 'Publishing...' : 'Publish Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel
        isOpen={showShortcutsPanel}
        onClose={() => setShowShortcutsPanel(false)}
        shortcuts={shortcuts}
      />
    </div>
  );
}

export default EditorPage;
