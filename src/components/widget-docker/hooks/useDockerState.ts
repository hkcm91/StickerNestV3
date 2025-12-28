/**
 * useDockerState Hook
 * Manages multi-docker state with localStorage persistence
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { WidgetInstance } from '../../../types/domain';
import type { DockedWidget, DockerInstance } from '../WidgetDocker.types';
import { DEFAULT_DOCKER } from '../constants';

// Stable default values to prevent new object/array references on every render
const EMPTY_DOCKED_IDS: string[] = [];
const DEFAULT_POSITION = { x: 20, y: 80 };

export function useDockerState(canvasId?: string) {
  const [visible, setVisible] = useState(false);
  const [dockers, setDockers] = useState<DockerInstance[]>([{ ...DEFAULT_DOCKER }]);
  const [activeDocker, setActiveDocker] = useState('default');
  const [dockedMap, setDockedMap] = useState<Map<string, DockedWidget>>(new Map());

  // Load saved state from localStorage
  useEffect(() => {
    if (!canvasId) return;
    const saved = localStorage.getItem(`sn-docker-state-${canvasId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.dockers) setDockers(data.dockers);
        if (data.activeDocker) setActiveDocker(data.activeDocker);
        if (data.dockedMap) setDockedMap(new Map(data.dockedMap));
        if (data.visible !== undefined) setVisible(data.visible);
      } catch (e) {
        console.warn('Failed to load docker state:', e);
      }
    }
  }, [canvasId]);

  // Save state to localStorage
  useEffect(() => {
    if (!canvasId) return;
    const data = {
      dockers,
      activeDocker,
      dockedMap: Array.from(dockedMap.entries()),
      visible,
    };
    localStorage.setItem(`sn-docker-state-${canvasId}`, JSON.stringify(data));
  }, [canvasId, dockers, activeDocker, dockedMap, visible]);

  const currentDocker = useMemo(
    () => dockers.find((d) => d.id === activeDocker) || dockers[0],
    [dockers, activeDocker]
  );

  const dock = useCallback(
    (widget: WidgetInstance): DockedWidget => {
      const state: DockedWidget = {
        widgetId: widget.id,
        originalPos: { ...widget.position },
        originalSize: { width: widget.width, height: widget.height },
        originalZ: widget.zIndex,
        originalRot: widget.rotation,
      };
      setDockers((prev) =>
        prev.map((d) =>
          d.id === activeDocker
            ? { ...d, dockedIds: d.dockedIds.includes(widget.id) ? d.dockedIds : [...d.dockedIds, widget.id] }
            : d
        )
      );
      setDockedMap((prev) => new Map(prev).set(widget.id, state));
      return state;
    },
    [activeDocker]
  );

  const undock = useCallback((widgetId: string): DockedWidget | undefined => {
    const state = dockedMap.get(widgetId);
    if (!state) return undefined;
    setDockers((prev) =>
      prev.map((d) => ({
        ...d,
        dockedIds: d.dockedIds.filter((id) => id !== widgetId),
        activeTab: Math.min(d.activeTab, Math.max(0, d.dockedIds.length - 2)),
      }))
    );
    setDockedMap((prev) => {
      const m = new Map(prev);
      m.delete(widgetId);
      return m;
    });
    return state;
  }, [dockedMap]);

  const createDocker = useCallback((name: string) => {
    const id = `docker-${Date.now()}`;
    const newDocker: DockerInstance = {
      id,
      name,
      dockedIds: [],
      position: { x: 40 + dockers.length * 20, y: 100 + dockers.length * 20 },
      size: { width: 320, height: 400 },
      collapsed: false,
      activeTab: 0,
    };
    setDockers((prev) => [...prev, newDocker]);
    setActiveDocker(id);
    return newDocker;
  }, [dockers.length]);

  const deleteDocker = useCallback((id: string) => {
    if (dockers.length <= 1) return;
    setDockers((prev) => prev.filter((d) => d.id !== id));
    if (activeDocker === id) {
      setActiveDocker(dockers[0].id === id ? dockers[1]?.id || 'default' : dockers[0].id);
    }
  }, [dockers, activeDocker]);

  const renameDocker = useCallback((id: string, name: string) => {
    setDockers((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  }, []);

  const updateDocker = useCallback((id: string, updates: Partial<DockerInstance>) => {
    setDockers((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  }, []);

  const setPosition = useCallback((pos: { x: number; y: number }) => {
    setDockers((prev) =>
      prev.map((d) => (d.id === activeDocker ? { ...d, position: pos } : d))
    );
  }, [activeDocker]);

  // Memoize stable return values
  const dockedIds = useMemo(
    () => currentDocker?.dockedIds ?? EMPTY_DOCKED_IDS,
    [currentDocker?.dockedIds]
  );

  const position = useMemo(
    () => currentDocker?.position ?? DEFAULT_POSITION,
    [currentDocker?.position]
  );

  const isDockedWidget = useCallback(
    (id: string) => dockers.some((d) => d.dockedIds.includes(id)),
    [dockers]
  );

  const toggle = useCallback(() => setVisible((v) => !v), []);

  return {
    visible,
    setVisible,
    toggle,
    dockers,
    activeDocker,
    setActiveDocker,
    currentDocker,
    dockedIds,
    dockedMap,
    dock,
    undock,
    createDocker,
    deleteDocker,
    renameDocker,
    updateDocker,
    position,
    setPosition,
    isDockedWidget,
  };
}

export default useDockerState;
