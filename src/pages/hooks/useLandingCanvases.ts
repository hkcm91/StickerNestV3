/**
 * useLandingCanvases
 * Manages demo canvas state for the landing page
 */

import { useState, useCallback, useRef } from 'react';
import type { CanvasMode } from '../../canvas/MainCanvas';
import { EventBus } from '../../runtime/EventBus';
import { SocialEventBridge } from '../../runtime/SocialEventBridge';

export interface DemoCanvas {
  id: string;
  title: string;
  subtitle: string;
  userId: string;
  slug: string;
  accentColor: string;
  background?: string;
  size: { width: number; height: number };
}

export interface UseLandingCanvasesOptions {
  demoCanvases: readonly DemoCanvas[];
}

export function useLandingCanvases({ demoCanvases }: UseLandingCanvasesOptions) {
  const canvasIds = demoCanvases.map(c => c.id);

  // Active canvas
  const [activeCanvasIndex, setActiveCanvasIndex] = useState(0);
  const activeCanvasId = canvasIds[activeCanvasIndex];
  const activeCanvas = demoCanvases[activeCanvasIndex];

  // Mode per canvas
  const [modeByCanvas, setModeByCanvas] = useState<Record<string, CanvasMode>>(() => {
    const initial: Record<string, CanvasMode> = {};
    canvasIds.forEach(id => { initial[id] = 'view'; });
    return initial;
  });
  const activeMode = modeByCanvas[activeCanvasId] || 'view';

  // Set mode for ALL canvases at once
  const setModeForAll = useCallback((nextMode: CanvasMode) => {
    setModeByCanvas(() => {
      const updated: Record<string, CanvasMode> = {};
      canvasIds.forEach(id => { updated[id] = nextMode; });
      return updated;
    });
  }, [canvasIds]);

  // Canvas sizes
  const [canvasSizes, setCanvasSizes] = useState<Record<string, { width: number; height: number }>>(() => {
    const initial: Record<string, { width: number; height: number }> = {};
    demoCanvases.forEach(canvas => {
      initial[canvas.id] = canvas.size;
    });
    return initial;
  });
  const activeCanvasSize = canvasSizes[activeCanvasId] || demoCanvases[0].size;

  // Navigation
  const handleCarouselNav = useCallback((direction: 'prev' | 'next') => {
    setActiveCanvasIndex(prev => {
      if (direction === 'prev') {
        return prev === 0 ? canvasIds.length - 1 : prev - 1;
      }
      return prev === canvasIds.length - 1 ? 0 : prev + 1;
    });
  }, [canvasIds.length]);

  // Canvas refs
  const canvasRefs = useRef<Record<string, any>>({});
  const setCanvasInstance = useCallback((id: string, instance: any) => {
    if (instance) {
      canvasRefs.current[id] = instance;
    } else {
      delete canvasRefs.current[id];
    }
  }, []);
  const getCanvasInstance = useCallback((id: string) => canvasRefs.current[id] ?? null, []);
  const getActiveCanvasInstance = useCallback(
    () => canvasRefs.current[activeCanvasId] ?? null,
    [activeCanvasId]
  );

  // Event bus per canvas
  const eventBusMapRef = useRef<Record<string, EventBus>>({});
  const socialBridgeMapRef = useRef<Record<string, SocialEventBridge>>({});

  const getEventBus = useCallback((canvasId: string) => {
    if (!eventBusMapRef.current[canvasId]) {
      eventBusMapRef.current[canvasId] = new EventBus();
    }
    return eventBusMapRef.current[canvasId];
  }, []);

  const getSocialBridge = useCallback((canvasId: string) => {
    if (!socialBridgeMapRef.current[canvasId]) {
      const eventBus = getEventBus(canvasId);
      const bridge = new SocialEventBridge(eventBus);
      socialBridgeMapRef.current[canvasId] = bridge;
    }
    return socialBridgeMapRef.current[canvasId];
  }, [getEventBus]);

  // Get user ID for canvas
  const getUserIdForCanvas = useCallback((canvasId: string): string => {
    const canvas = demoCanvases.find(c => c.id === canvasId);
    return canvas?.userId || 'unknown';
  }, [demoCanvases]);

  // Update canvas size
  const updateCanvasSize = useCallback((canvasId: string, size: { width: number; height: number }) => {
    setCanvasSizes(prev => ({ ...prev, [canvasId]: size }));
  }, []);

  return {
    // Canvas state
    demoCanvases,
    canvasIds,
    activeCanvasIndex,
    activeCanvasId,
    activeCanvas,
    activeCanvasSize,
    canvasSizes,

    // Mode
    modeByCanvas,
    activeMode,
    setModeForAll,
    setModeByCanvas,

    // Navigation
    handleCarouselNav,
    setActiveCanvasIndex,

    // Refs
    setCanvasInstance,
    getCanvasInstance,
    getActiveCanvasInstance,

    // Event bus
    getEventBus,
    getSocialBridge,
    getUserIdForCanvas,
    eventBusMapRef,
    socialBridgeMapRef,

    // Size
    updateCanvasSize,
  };
}
