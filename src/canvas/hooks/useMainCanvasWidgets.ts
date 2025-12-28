/**
 * useMainCanvasWidgets
 * Widget CRUD operations and persistence for MainCanvas
 */

import { useState, useCallback, useEffect } from 'react';
import type { WidgetInstance } from '../../types/domain';

export interface UseMainCanvasWidgetsOptions {
  canvasId: string;
  initialWidgets?: WidgetInstance[];
  autoSaveInterval?: number;
  onWidgetAdd?: (widget: WidgetInstance) => void;
  onWidgetRemove?: (widgetId: string) => void;
}

export function useMainCanvasWidgets(options: UseMainCanvasWidgetsOptions) {
  const {
    canvasId,
    initialWidgets,
    autoSaveInterval = 30000,
    onWidgetAdd,
    onWidgetRemove,
  } = options;

  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load widgets from localStorage or initial prop
  useEffect(() => {
    if (initialWidgets && initialWidgets.length > 0) {
      setWidgets(initialWidgets.map((w: WidgetInstance) => ({
        ...w,
        canvasId,
        position: w.position || { x: 100, y: 100 },
        width: w.width || 300,
        height: w.height || 200,
        scaleMode: w.scaleMode || 'contain',
        contentSize: w.contentSize || { width: w.width || 300, height: w.height || 200 },
      })));
      return;
    }

    const key = `stickernest-canvas-${canvasId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.widgets) {
          setWidgets(data.widgets.map((w: WidgetInstance) => ({
            ...w,
            canvasId,
            position: w.position || { x: 100, y: 100 },
            width: w.width || 300,
            height: w.height || 200,
            scaleMode: w.scaleMode || 'contain',
            contentSize: w.contentSize || { width: w.width || 300, height: w.height || 200 },
          })));
        }
      } catch (e) {
        console.error('[useMainCanvasWidgets] Failed to load:', e);
      }
    }
  }, [canvasId, initialWidgets]);

  // Save function
  const saveCanvas = useCallback(async (properties?: Record<string, unknown>) => {
    const key = `stickernest-canvas-${canvasId}`;

    let existingData: Record<string, unknown> = {};
    try {
      const stored = localStorage.getItem(key);
      if (stored) existingData = JSON.parse(stored);
    } catch { /* Ignore */ }

    const data = {
      ...existingData,
      canvas: {
        ...(existingData.canvas as Record<string, unknown> || {}),
        id: canvasId,
        properties,
      },
      widgets,
    };

    localStorage.setItem(key, JSON.stringify(data));
    setHasUnsavedChanges(false);
  }, [canvasId, widgets]);

  // Auto-save
  useEffect(() => {
    if (!autoSaveInterval || !hasUnsavedChanges) return;
    const timer = setTimeout(() => saveCanvas(), autoSaveInterval);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, autoSaveInterval, saveCanvas]);

  // Mark unsaved on widget change
  useEffect(() => setHasUnsavedChanges(true), [widgets]);

  // CRUD operations
  const addWidget = useCallback((data: Omit<WidgetInstance, 'id' | 'canvasId'>): string => {
    const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const widget: WidgetInstance = {
      ...data,
      id,
      canvasId,
      scaleMode: data.scaleMode || 'contain',
      contentSize: data.contentSize || { width: data.width, height: data.height },
    };
    setWidgets(prev => [...prev, widget]);
    onWidgetAdd?.(widget);
    return id;
  }, [canvasId, onWidgetAdd]);

  const removeWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(widgetId); return n; });
    onWidgetRemove?.(widgetId);
  }, [onWidgetRemove]);

  const updateWidget = useCallback((widgetId: string, updates: Partial<WidgetInstance>) => {
    setWidgets(prev => prev.map(w =>
      w.id === widgetId ? { ...w, ...updates } : w
    ));
    setHasUnsavedChanges(true);
  }, []);

  // Selection
  const handleSelect = useCallback((id: string, additive: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(additive ? prev : []);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  return {
    widgets,
    setWidgets,
    selectedIds,
    setSelectedIds,
    hasUnsavedChanges,
    addWidget,
    removeWidget,
    updateWidget,
    handleSelect,
    deselectAll,
    selectMultiple,
    saveCanvas,
  };
}
