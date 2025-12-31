/**
 * StickerNest v2 - useWidgetSync Hook (Canvas Functions 2.0)
 * 
 * Unified widget state management hook
 * Syncs RuntimeContext (source of truth) with Zustand store
 * Provides single source of truth for widget state across the app
 * 
 * Updated with improved sync reliability and better event handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WidgetInstance } from '../types/domain';
import type { RuntimeContext } from '../runtime/RuntimeContext';
import { useCanvasStore } from '../state/useCanvasStore';

interface UseWidgetSyncOptions {
  runtime: RuntimeContext;
}

interface UseWidgetSyncResult {
  /** All widget instances - single source of truth */
  widgets: WidgetInstance[];
  /** Get a single widget by ID */
  getWidget: (id: string) => WidgetInstance | undefined;
  /** Force refresh widgets from runtime */
  refresh: () => void;
  /** Whether widgets are currently syncing */
  isSyncing: boolean;
}

/**
 * Hook that provides unified widget state by syncing RuntimeContext with Zustand store.
 * RuntimeContext is the source of truth - this hook keeps the store in sync.
 */
export function useWidgetSync({ runtime }: UseWidgetSyncOptions): UseWidgetSyncResult {
  // Local state derived from runtime (source of truth)
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Track sync to prevent double-updates
  const syncInProgressRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Sync widgets from runtime to local state and Zustand store
   * Uses a debounce mechanism to prevent excessive updates during rapid changes
   */
  const syncFromRuntime = useCallback((immediate = false) => {
    // Clear any pending debounced sync
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const performSync = () => {
      // Prevent concurrent syncs
      if (syncInProgressRef.current) return;
      syncInProgressRef.current = true;
      setIsSyncing(true);

      try {
        // Get fresh widgets from runtime
        const runtimeWidgets = [...runtime.widgetInstances];
        
        // Update local state
        setWidgets(runtimeWidgets);

        // Get current store state imperatively (not reactively) to avoid infinite loops
        const store = useCanvasStore.getState();
        const storeWidgets = store.widgets;

        // Create sets for efficient comparison
        const runtimeIds = new Set(runtimeWidgets.map(w => w.id));
        const storeIds = new Set(storeWidgets.keys());

        // Track if we need to batch updates
        let hasChanges = false;

        // Add new widgets to store
        runtimeWidgets.forEach(widget => {
          const storeWidget = storeWidgets.get(widget.id);
          if (!storeWidget) {
            // New widget - add to store
            store.addWidget(widget);
            hasChanges = true;
          } else {
            // Check if widget needs update (compare key properties)
            const needsUpdate =
              storeWidget.position.x !== widget.position.x ||
              storeWidget.position.y !== widget.position.y ||
              storeWidget.width !== widget.width ||
              storeWidget.height !== widget.height ||
              storeWidget.rotation !== widget.rotation ||
              storeWidget.zIndex !== widget.zIndex ||
              storeWidget.visible !== widget.visible ||
              storeWidget.locked !== widget.locked;

            if (needsUpdate) {
              store.updateWidget(widget.id, {
                position: widget.position,
                width: widget.width,
                height: widget.height,
                rotation: widget.rotation,
                zIndex: widget.zIndex,
                visible: widget.visible,
                locked: widget.locked,
              });
              hasChanges = true;
            }
          }
        });

        // NOTE: We intentionally do NOT remove widgets from the store here.
        // Widgets in the store but not in the runtime may be:
        // 1. Loaded from localStorage/persistence before runtime sync
        // 2. Temporarily missing during mode transitions (desktop <-> VR/AR)
        // Widget removal should only happen via explicit events (widget:removed)
        // This ensures widgets persist across rendering mode changes.
        // See: CanvasPage comment "Keep widgets synced to Zustand store at page level"

        lastSyncTimeRef.current = Date.now();

        if (hasChanges) {
          console.log(`[useWidgetSync] Synced ${runtimeWidgets.length} widgets to store`);
        }
      } catch (error) {
        console.error('[useWidgetSync] Error syncing widgets:', error);
      } finally {
        syncInProgressRef.current = false;
        setIsSyncing(false);
      }
    };

    if (immediate) {
      performSync();
    } else {
      // Debounce the sync to prevent rapid updates
      debounceTimerRef.current = setTimeout(performSync, 16); // ~1 frame
    }
  }, [runtime]);

  /**
   * Force an immediate sync - useful when you need widgets right away
   */
  const forceSync = useCallback(() => {
    syncFromRuntime(true);
  }, [syncFromRuntime]);

  // Subscribe to runtime events
  useEffect(() => {
    // Initial sync - immediate
    syncFromRuntime(true);

    // Event handlers
    const handleWidgetAdded = () => {
      console.log('[useWidgetSync] Widget added event');
      syncFromRuntime();
    };

    const handleWidgetRemoved = (event?: { payload?: { widgetInstanceId?: string } }) => {
      console.log('[useWidgetSync] Widget removed event');
      // If we have the widget ID, remove it explicitly from the store
      const widgetId = event?.payload?.widgetInstanceId;
      if (widgetId) {
        const store = useCanvasStore.getState();
        if (store.widgets.has(widgetId)) {
          store.removeWidget(widgetId);
          console.log(`[useWidgetSync] Explicitly removed widget ${widgetId} from store`);
        }
      }
      // Also sync to update any other state
      syncFromRuntime();
    };

    const handleWidgetUpdated = () => {
      syncFromRuntime();
    };

    const handleDashboardLoaded = () => {
      console.log('[useWidgetSync] Dashboard loaded - force syncing');
      syncFromRuntime(true);
    };

    // Subscribe to all relevant events
    const unsubs = [
      runtime.eventBus.on('context:widgetAdded', handleWidgetAdded),
      runtime.eventBus.on('context:widgetRemoved', handleWidgetRemoved),
      runtime.eventBus.on('context:widgetUpdated', handleWidgetUpdated),
      runtime.eventBus.on('widget:update', handleWidgetUpdated),
      runtime.eventBus.on('widget:added', handleWidgetAdded),
      runtime.eventBus.on('widget:removed', handleWidgetRemoved),
      runtime.eventBus.on('dashboard:loaded', handleDashboardLoaded),
    ];

    // Also poll for changes periodically in case events are missed
    // This is a safety net, not the primary sync mechanism
    const pollInterval = setInterval(() => {
      const currentWidgetCount = runtime.widgetInstances.length;
      const stateWidgetCount = widgets.length;
      
      // Only sync if counts differ (indicates missed event)
      if (currentWidgetCount !== stateWidgetCount) {
        console.log('[useWidgetSync] Poll detected mismatch, syncing...');
        syncFromRuntime();
      }
    }, 2000); // Check every 2 seconds

    return () => {
      // Clean up subscriptions
      unsubs.forEach(unsub => unsub());
      
      // Clean up poll interval
      clearInterval(pollInterval);
      
      // Clean up debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [runtime, syncFromRuntime, widgets.length]);

  // Get widget by ID
  const getWidget = useCallback((id: string): WidgetInstance | undefined => {
    return widgets.find(w => w.id === id);
  }, [widgets]);

  return {
    widgets,
    getWidget,
    refresh: forceSync,
    isSyncing,
  };
}

export default useWidgetSync;
