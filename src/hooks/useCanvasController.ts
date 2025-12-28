/**
 * StickerNest v2 - Canvas Controller Hook
 * Makes the canvas function like a widget with inputs/outputs
 * Listens for canvas control events and manages canvas state
 * Syncs background changes with useCanvasExtendedStore for persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CanvasBackground, CanvasControllerState } from '../types/domain';
import type { EventBus } from '../runtime/EventBus';
import { useCanvasExtendedStore } from '../state/useCanvasExtendedStore';

interface UseCanvasControllerOptions {
  eventBus: EventBus | null;
  canvasId: string;
  initialBackground?: Partial<CanvasBackground>;
}

const DEFAULT_STATE: CanvasControllerState = {
  background: {
    type: 'color',
    color: '#f0f0f0',
    opacity: 1,
  },
  grid: {
    visible: false,
    size: 20,
    color: 'rgba(0,0,0,0.1)',
    opacity: 0.5,
  },
  filters: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    grayscale: 0,
  },
  transform: {
    zoom: 1,
    rotation: 0,
    flipX: false,
    flipY: false,
  },
  overlay: {
    type: 'none',
    intensity: 0,
  },
  borderRadius: 16,
};

export function useCanvasController({ eventBus, canvasId, initialBackground }: UseCanvasControllerOptions) {
  // Get initial background from extended store if available
  const extendedStore = useCanvasExtendedStore.getState();
  const storedCanvas = extendedStore.canvases.get(canvasId);
  const storedBackground = storedCanvas?.background;

  const [state, setState] = useState<CanvasControllerState>(() => ({
    ...DEFAULT_STATE,
    // Priority: storedBackground > initialBackground > DEFAULT_STATE
    background: { ...DEFAULT_STATE.background, ...initialBackground, ...storedBackground },
  }));

  // Sync background from extended store when canvas ID changes
  useEffect(() => {
    const extendedStore = useCanvasExtendedStore.getState();
    const canvas = extendedStore.canvases.get(canvasId);
    if (canvas?.background) {
      setState(prev => ({
        ...prev,
        background: { ...prev.background, ...canvas.background },
      }));
    }
  }, [canvasId]);

  // Video element ref for video backgrounds
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // Update background
  // Note: We use a ref pattern to avoid recreating this callback when state changes
  // Also syncs to useCanvasExtendedStore for persistence
  const setBackground = useCallback((updates: Partial<CanvasBackground>) => {
    setState(prev => {
      const newBackground = { ...prev.background, ...updates };
      // Emit change event with the new state (not stale closure)
      // Using setTimeout to ensure emit happens after state update
      if (eventBus) {
        setTimeout(() => {
          eventBus.emit({
            type: 'canvas:background-changed',
            scope: 'canvas',
            payload: newBackground,
          });
        }, 0);
      }
      // Sync to extended store for persistence and cross-component sync
      const extendedStore = useCanvasExtendedStore.getState();
      if (canvasId) {
        // Ensure canvas exists in extended store
        if (!extendedStore.canvases.has(canvasId)) {
          extendedStore.createCanvas('Untitled', 1920, 1080);
          // Update the canvas ID
          const newCanvases = new Map(extendedStore.canvases);
          const lastCanvas = Array.from(newCanvases.values()).pop();
          if (lastCanvas) {
            newCanvases.delete(lastCanvas.id);
            lastCanvas.id = canvasId;
            newCanvases.set(canvasId, lastCanvas);
          }
        }
        extendedStore.setCanvasBackground(canvasId, newBackground);
      }
      return {
        ...prev,
        background: newBackground,
      };
    });
  }, [eventBus, canvasId]); // Include canvasId in deps

  // Set background color
  const setBackgroundColor = useCallback((color: string) => {
    setBackground({ type: 'color', color });
  }, [setBackground]);

  // Set background image
  const setBackgroundImage = useCallback((url: string, size: string = 'cover') => {
    setBackground({ type: 'image', imageUrl: url, size });
  }, [setBackground]);

  // Set background video
  const setBackgroundVideo = useCallback((src: string) => {
    // Create video element if needed
    const video = document.createElement('video');
    video.src = src;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.play().catch(console.error);
    setVideoElement(video);
    setBackground({ type: 'video', videoSrc: src });
  }, [setBackground]);

  // Set grid
  const setGrid = useCallback((updates: Partial<CanvasControllerState['grid']>) => {
    setState(prev => ({
      ...prev,
      grid: { ...prev.grid, ...updates },
    }));
  }, []);

  // Set filters
  const setFilters = useCallback((updates: Partial<CanvasControllerState['filters']>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...updates },
    }));
  }, []);

  // Set transform
  const setTransform = useCallback((updates: Partial<CanvasControllerState['transform']>) => {
    setState(prev => ({
      ...prev,
      transform: { ...prev.transform, ...updates },
    }));

    if (updates.zoom !== undefined && eventBus) {
      eventBus.emit({
        type: 'canvas:zoom-changed',
        scope: 'canvas',
        payload: { zoom: updates.zoom },
      });
    }
  }, [eventBus]);

  // Set overlay
  const setOverlay = useCallback((overlay: CanvasControllerState['overlay']) => {
    setState(prev => ({ ...prev, overlay }));
  }, []);

  // Set border radius
  const setBorderRadius = useCallback((radius: number) => {
    setState(prev => ({
      ...prev,
      borderRadius: Math.max(0, Math.min(100, radius)), // Clamp between 0 and 100
    }));
  }, []);

  // Reset to defaults
  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    setVideoElement(null);
  }, []);

  // Listen for canvas control events
  useEffect(() => {
    if (!eventBus) {
      console.warn('[useCanvasController] ⚠️ No eventBus provided - canvas events will NOT work!');
      return;
    }

    console.log('[useCanvasController] ✅ Setting up event listeners for canvas:', canvasId, 'on EventBus:', eventBus.id);

    const handlers = [
      eventBus.on('canvas:set-background', (event) => {
        console.log('[useCanvasController] 📥 Received canvas:set-background', event.payload);
        if (event.payload) setBackground(event.payload);
      }),
      eventBus.on('canvas:set-background-color', (event) => {
        console.log('[useCanvasController] 📥 Received canvas:set-background-color', event.payload);
        if (event.payload?.color) setBackgroundColor(event.payload.color);
      }),
      eventBus.on('canvas:set-background-image', (event) => {
        if (event.payload?.url) setBackgroundImage(event.payload.url, event.payload.size);
      }),
      eventBus.on('canvas:set-background-video', (event) => {
        if (event.payload?.src) setBackgroundVideo(event.payload.src);
      }),
      eventBus.on('canvas:set-grid', (event) => {
        if (event.payload) setGrid(event.payload);
      }),
      eventBus.on('canvas:set-filters', (event) => {
        if (event.payload) setFilters(event.payload);
      }),
      eventBus.on('canvas:set-transform', (event) => {
        if (event.payload) setTransform(event.payload);
      }),
      eventBus.on('canvas:set-overlay', (event) => {
        if (event.payload) setOverlay(event.payload);
      }),
      eventBus.on('canvas:set-border-radius', (event) => {
        if (event.payload?.radius !== undefined) setBorderRadius(event.payload.radius);
      }),
      eventBus.on('canvas:reset', () => {
        reset();
      }),
    ];

    return () => {
      console.log('[useCanvasController] 🧹 Cleaning up event listeners for canvas:', canvasId);
      handlers.forEach(unsubscribe => unsubscribe());
    };
  }, [eventBus, setBackground, setBackgroundColor, setBackgroundImage, setBackgroundVideo, setGrid, setFilters, setTransform, setOverlay, setBorderRadius, reset]);

  // Cleanup video on unmount
  useEffect(() => {
    return () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
      }
    };
  }, [videoElement]);

  // Generate CSS styles for the canvas
  const canvasStyles = useMemo(() => {
    const { background, filters, transform, overlay } = state;

    // Background styles
    let backgroundStyle: React.CSSProperties = {};

    switch (background.type) {
      case 'color':
        backgroundStyle.backgroundColor = background.color || '#f0f0f0';
        break;
      case 'gradient':
        backgroundStyle.background = background.gradient || 'linear-gradient(135deg, #1a1a2e 0%, #252538 100%)';
        break;
      case 'image':
      case 'pattern':
        if (background.imageUrl) {
          backgroundStyle.backgroundImage = `url(${background.imageUrl})`;
          backgroundStyle.backgroundSize = background.size || 'cover';
          backgroundStyle.backgroundPosition = background.position || 'center';
          backgroundStyle.backgroundRepeat = background.repeat || (background.type === 'pattern' ? 'repeat' : 'no-repeat');
        }
        break;
      case 'video':
        // Video handled separately
        break;
    }

    if (background.opacity !== undefined && background.opacity < 1) {
      backgroundStyle.opacity = background.opacity;
    }

    // Filter styles
    const filterParts: string[] = [];
    if (filters.brightness !== undefined && filters.brightness !== 100) {
      filterParts.push(`brightness(${filters.brightness}%)`);
    }
    if (filters.contrast !== undefined && filters.contrast !== 100) {
      filterParts.push(`contrast(${filters.contrast}%)`);
    }
    if (filters.saturation !== undefined && filters.saturation !== 100) {
      filterParts.push(`saturate(${filters.saturation}%)`);
    }
    if (filters.hue !== undefined && filters.hue !== 0) {
      filterParts.push(`hue-rotate(${filters.hue}deg)`);
    }
    if (filters.blur !== undefined && filters.blur > 0) {
      filterParts.push(`blur(${filters.blur}px)`);
    }
    if (filters.grayscale !== undefined && filters.grayscale > 0) {
      filterParts.push(`grayscale(${filters.grayscale}%)`);
    }

    const filterStyle = filterParts.length > 0 ? filterParts.join(' ') : 'none';

    // Transform styles
    const transformParts: string[] = [];
    if (transform.zoom !== 1) {
      transformParts.push(`scale(${transform.zoom})`);
    }
    if (transform.rotation !== 0) {
      transformParts.push(`rotate(${transform.rotation}deg)`);
    }
    if (transform.flipX) {
      transformParts.push('scaleX(-1)');
    }
    if (transform.flipY) {
      transformParts.push('scaleY(-1)');
    }

    const transformStyle = transformParts.length > 0 ? transformParts.join(' ') : 'none';

    return {
      background: backgroundStyle,
      filter: filterStyle,
      transform: transformStyle,
      borderRadius: state.borderRadius ?? 16,
    };
  }, [state]);

  // Generate overlay CSS
  const overlayStyles = useMemo(() => {
    const { overlay } = state;
    if (!overlay || overlay.type === 'none') return null;

    const intensity = overlay.intensity / 100;

    switch (overlay.type) {
      case 'vignette':
        return {
          background: `radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,${intensity * 0.8}) 100%)`,
          pointerEvents: 'none' as const,
        };
      case 'scanlines':
        return {
          background: `repeating-linear-gradient(
            0deg,
            rgba(0,0,0,${intensity * 0.1}),
            rgba(0,0,0,${intensity * 0.1}) 1px,
            transparent 1px,
            transparent 2px
          )`,
          pointerEvents: 'none' as const,
        };
      case 'noise':
        return {
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: intensity * 0.3,
          mixBlendMode: 'overlay' as const,
          pointerEvents: 'none' as const,
        };
      case 'custom':
        return overlay.customCss ? JSON.parse(overlay.customCss) : null;
      default:
        return null;
    }
  }, [state]);

  return {
    state,
    videoElement,
    canvasStyles,
    overlayStyles,
    setBackground,
    setBackgroundColor,
    setBackgroundImage,
    setBackgroundVideo,
    setGrid,
    setFilters,
    setTransform,
    setOverlay,
    setBorderRadius,
    reset,
  };
}

export default useCanvasController;
