/**
 * StickerNest v2 - Canvas Gestures Hook
 * Unified gesture handling for canvas navigation
 * Supports touch (pinch, pan, double-tap) and mouse (wheel, drag, double-click)
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '../state/useCanvasStore';
import { useMomentum } from './useMomentum';
import { haptic } from '../utils/haptics';
import type { CanvasSettings } from '../types/domain';

// Zoom levels for snapping
export const ZOOM_LEVELS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

export interface CanvasGesturesOptions {
  settings: CanvasSettings;
  enabled: boolean;
  mode: 'view' | 'edit' | 'connect';
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  canvasBounds: { width: number; height: number };
}

interface GestureState {
  isGesturing: boolean;
  gestureType: 'none' | 'pan' | 'zoom' | 'long-press';
  initialPinchDistance: number;
  initialZoom: number;
  pinchCenter: { x: number; y: number };
  touchStart: { x: number; y: number; time: number } | null;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  lastTapTime: number;
  lastTapPosition: { x: number; y: number } | null;
  isSpaceHeld: boolean;
  lastClickTime: number;
  lastClickPosition: { x: number; y: number } | null;
}

// Utility functions
function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches: TouchList): { x: number; y: number } {
  if (touches.length < 2) {
    return { x: touches[0].clientX, y: touches[0].clientY };
  }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function getNearestZoomLevel(zoom: number, direction: 'in' | 'out'): number {
  if (direction === 'in') {
    for (const level of ZOOM_LEVELS) {
      if (level > zoom + 0.01) return level;
    }
    return ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  } else {
    for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--) {
      if (ZOOM_LEVELS[i] < zoom - 0.01) return ZOOM_LEVELS[i];
    }
    return ZOOM_LEVELS[0];
  }
}

/**
 * Hook for handling canvas gestures (zoom, pan, touch)
 */
export function useCanvasGestures(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: CanvasGesturesOptions
) {
  const { settings, enabled, mode, onGestureStart, onGestureEnd } = options;

  const pan = useCanvasStore(state => state.pan);
  const zoom = useCanvasStore(state => state.zoom);
  const viewport = useCanvasStore(state => state.viewport);
  const setViewport = useCanvasStore(state => state.setViewport);
  const resetViewport = useCanvasStore(state => state.resetViewport);

  const momentum = useMomentum({ friction: 0.92, minVelocity: 0.5 });
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  const gestureStateRef = useRef<GestureState>({
    isGesturing: false,
    gestureType: 'none',
    initialPinchDistance: 0,
    initialZoom: 1,
    pinchCenter: { x: 0, y: 0 },
    touchStart: null,
    longPressTimer: null,
    lastTapTime: 0,
    lastTapPosition: null,
    isSpaceHeld: false,
    lastClickTime: 0,
    lastClickPosition: null,
  });

  const lastPanRef = useRef<{ x: number; y: number } | null>(null);

  // Wheel handler (vertical scroll zooms, horizontal scroll pans)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enabled) return;
    e.preventDefault();

    // Horizontal scroll (side scroll wheel) → pan left/right
    if (e.deltaX !== 0) {
      pan(-e.deltaX, 0);
      return;
    }

    const isPanModifier = e.ctrlKey || e.metaKey || e.shiftKey;

    if (isPanModifier) {
      // Ctrl/Cmd/Shift + scroll = pan
      const deltaX = e.deltaX !== 0 ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      const deltaY = e.shiftKey ? 0 : e.deltaY;
      pan(-deltaX, -deltaY);
    } else if (settings.zoom.enabled && settings.zoom.wheelZoom) {
      // Vertical scroll (main mouse wheel) → zoom in/out
      if (e.deltaY !== 0) {
        const delta = -e.deltaY;
        const zoomStep = settings.zoom.step * 0.5;
        const zoomFactor = delta > 0 ? (1 + zoomStep) : (1 / (1 + zoomStep));

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          zoom(zoomFactor, e.clientX - rect.left, e.clientY - rect.top);
        }
      }
    }
  }, [enabled, settings.zoom, pan, zoom, containerRef]);

  // Touch start handler
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    momentum.stopMomentum();
    momentum.resetTracking();

    const state = gestureStateRef.current;
    const touches = e.touches;

    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    if (touches.length === 2) {
      e.preventDefault();
      state.isGesturing = true;
      state.gestureType = 'zoom';
      state.initialPinchDistance = getTouchDistance(touches);
      state.initialZoom = viewport.zoom;
      state.pinchCenter = getTouchCenter(touches);
      lastPanRef.current = state.pinchCenter;
      momentum.trackVelocity(state.pinchCenter.x, state.pinchCenter.y);
      haptic.light();
      onGestureStart?.();
    } else if (touches.length === 1) {
      const touch = touches[0];
      state.touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };

      const target = e.target as HTMLElement;
      const isOnCanvas = !target.closest('[data-widget-id]');
      const canPan = (mode === 'view' && settings.touch.singleFingerPan) ||
                     (isOnCanvas && settings.touch.panEnabled);

      if (canPan) {
        lastPanRef.current = { x: touch.clientX, y: touch.clientY };
        momentum.trackVelocity(touch.clientX, touch.clientY);
      }

      if (settings.touch.longPressSelect && mode === 'edit') {
        state.longPressTimer = setTimeout(() => {
          if (state.touchStart) {
            state.gestureType = 'long-press';
            state.isGesturing = true;
            haptic.medium();
            onGestureStart?.();
          }
        }, settings.touch.longPressDuration);
      }
    }
  }, [enabled, settings, mode, viewport.zoom, onGestureStart, momentum]);

  // Touch move handler
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const state = gestureStateRef.current;
    const touches = e.touches;

    // Cancel long press on movement
    if (state.longPressTimer && state.touchStart && touches.length === 1) {
      const touch = touches[0];
      const moved = Math.sqrt(
        Math.pow(touch.clientX - state.touchStart.x, 2) +
        Math.pow(touch.clientY - state.touchStart.y, 2)
      );

      if (moved > 10) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;

        if (lastPanRef.current && !state.isGesturing) {
          state.isGesturing = true;
          state.gestureType = 'pan';
          onGestureStart?.();
        }
      }
    }

    // Two-finger gesture (zoom + pan)
    if (touches.length === 2 && state.gestureType === 'zoom') {
      e.preventDefault();

      const currentDistance = getTouchDistance(touches);
      const currentCenter = getTouchCenter(touches);

      if (settings.zoom.pinchZoom && state.initialPinchDistance > 0) {
        const scale = currentDistance / state.initialPinchDistance;
        const newZoom = Math.max(settings.zoom.min, Math.min(settings.zoom.max, state.initialZoom * scale));

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const zoomFactor = newZoom / viewport.zoom;
          zoom(zoomFactor, currentCenter.x - rect.left, currentCenter.y - rect.top);
        }
      }

      if (lastPanRef.current) {
        pan(currentCenter.x - lastPanRef.current.x, currentCenter.y - lastPanRef.current.y);
      }
      lastPanRef.current = currentCenter;
    }

    // Single finger pan
    if (touches.length === 1 && state.gestureType === 'pan' && lastPanRef.current) {
      e.preventDefault();
      const touch = touches[0];
      pan(touch.clientX - lastPanRef.current.x, touch.clientY - lastPanRef.current.y);
      lastPanRef.current = { x: touch.clientX, y: touch.clientY };
      momentum.trackVelocity(touch.clientX, touch.clientY);
    }
  }, [enabled, settings, viewport.zoom, pan, zoom, containerRef, onGestureStart, momentum]);

  // Touch end handler
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const state = gestureStateRef.current;

    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    if (e.touches.length > 0) {
      if (e.touches.length === 1 && state.gestureType === 'zoom') {
        if (mode === 'view' && settings.touch.singleFingerPan) {
          state.gestureType = 'pan';
          lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          momentum.resetTracking();
          momentum.trackVelocity(e.touches[0].clientX, e.touches[0].clientY);
        } else {
          state.isGesturing = false;
          state.gestureType = 'none';
          onGestureEnd?.();
        }
      }
      return;
    }

    // Apply momentum on release
    if (state.isGesturing && (state.gestureType === 'pan' || state.gestureType === 'zoom')) {
      const velocity = momentum.calculateVelocity();
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      if (speed > 2) {
        momentum.applyMomentum((dx, dy) => pan(dx, dy));
      }
    }

    // Double-tap detection
    if (state.touchStart && settings.zoom.pinchZoom) {
      const now = Date.now();
      const elapsed = now - state.touchStart.time;

      if (elapsed < 200) {
        const pos = { x: state.touchStart.x, y: state.touchStart.y };

        if (state.lastTapPosition && (now - state.lastTapTime) < 300) {
          const dist = Math.sqrt(
            Math.pow(pos.x - state.lastTapPosition.x, 2) +
            Math.pow(pos.y - state.lastTapPosition.y, 2)
          );

          if (dist < 40) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              haptic.doubleTap();
              const factor = viewport.zoom < 1.5 ? 2 / viewport.zoom : 1 / viewport.zoom;
              zoom(factor, pos.x - rect.left, pos.y - rect.top);
            }
            state.lastTapTime = 0;
            state.lastTapPosition = null;
          } else {
            state.lastTapTime = now;
            state.lastTapPosition = pos;
          }
        } else {
          state.lastTapTime = now;
          state.lastTapPosition = pos;
        }
      }
    }

    state.isGesturing = false;
    state.gestureType = 'none';
    state.touchStart = null;
    lastPanRef.current = null;
    onGestureEnd?.();
  }, [mode, settings, viewport.zoom, pan, zoom, containerRef, onGestureEnd, momentum]);

  // Pointer down (mouse pan)
  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!enabled || e.pointerType === 'touch') return;
    momentum.stopMomentum();

    const state = gestureStateRef.current;
    const target = e.target as HTMLElement;
    const isOnCanvas = !target.closest('[data-widget-id]');

    // Double-click zoom detection
    if (e.button === 0 && isOnCanvas && settings.zoom.enabled) {
      const now = Date.now();
      if (state.lastClickPosition && (now - state.lastClickTime) < 300) {
        const dist = Math.sqrt(
          Math.pow(e.clientX - state.lastClickPosition.x, 2) +
          Math.pow(e.clientY - state.lastClickPosition.y, 2)
        );

        if (dist < 20) {
          e.preventDefault();
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const factor = viewport.zoom > 0.9 && viewport.zoom < 1.1 ? 2 / viewport.zoom :
                          viewport.zoom >= 1.8 ? 1 / viewport.zoom : 1 / viewport.zoom;
            zoom(factor, e.clientX - rect.left, e.clientY - rect.top);
          }
          state.lastClickTime = 0;
          state.lastClickPosition = null;
          return;
        }
      }
      state.lastClickTime = now;
      state.lastClickPosition = { x: e.clientX, y: e.clientY };
    }

    // Pan with middle button, space+left, or in pan mode
    const isMiddle = e.button === 1;
    const isSpaceDrag = e.button === 0 && state.isSpaceHeld;
    const isPanMode = e.button === 0 && settings.scrollMode === 'pan' && isOnCanvas;

    if (isMiddle || isSpaceDrag || isPanMode) {
      e.preventDefault();
      state.isGesturing = true;
      state.gestureType = 'pan';
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      momentum.trackVelocity(e.clientX, e.clientY);

      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }
      onGestureStart?.();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [enabled, settings, viewport.zoom, zoom, containerRef, onGestureStart, momentum]);

  // Pointer move
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const state = gestureStateRef.current;
    if (!state.isGesturing || state.gestureType !== 'pan' || !lastPanRef.current) return;

    pan(e.clientX - lastPanRef.current.x, e.clientY - lastPanRef.current.y);
    lastPanRef.current = { x: e.clientX, y: e.clientY };
    momentum.trackVelocity(e.clientX, e.clientY);
  }, [pan, momentum]);

  // Pointer up
  const handlePointerUp = useCallback((e: PointerEvent) => {
    const state = gestureStateRef.current;
    if (!state.isGesturing || state.gestureType !== 'pan') return;

    const velocity = momentum.calculateVelocity();
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > 2) {
      momentum.applyMomentum((dx, dy) => pan(dx, dy));
    }

    state.isGesturing = false;
    state.gestureType = 'none';
    lastPanRef.current = null;

    if (containerRef.current) {
      containerRef.current.style.cursor = state.isSpaceHeld ? 'grab' : '';
    }
    onGestureEnd?.();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [pan, containerRef, onGestureEnd, momentum]);

  // Keyboard handlers for space+drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

        e.preventDefault();
        gestureStateRef.current.isSpaceHeld = true;
        setIsSpaceHeld(true);
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        gestureStateRef.current.isSpaceHeld = false;
        setIsSpaceHeld(false);
        if (containerRef.current && !gestureStateRef.current.isGesturing) {
          containerRef.current.style.cursor = '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [containerRef]);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, handlePointerDown, handlePointerMove, handlePointerUp, containerRef]);

  // Cleanup
  useEffect(() => () => momentum.stopMomentum(), [momentum]);

  // Public API
  const zoomTo = useCallback((level: number) => {
    momentum.stopMomentum();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      zoom(level / viewport.zoom, rect.width / 2, rect.height / 2);
    }
  }, [viewport.zoom, zoom, containerRef, momentum]);

  const zoomIn = useCallback(() => {
    zoomTo(Math.min(getNearestZoomLevel(viewport.zoom, 'in'), settings.zoom.max));
  }, [viewport.zoom, settings.zoom.max, zoomTo]);

  const zoomOut = useCallback(() => {
    zoomTo(Math.max(getNearestZoomLevel(viewport.zoom, 'out'), settings.zoom.min));
  }, [viewport.zoom, settings.zoom.min, zoomTo]);

  return {
    viewport,
    isSpaceHeld,
    zoomTo,
    zoomIn,
    zoomOut,
    setViewport,
    resetViewport,
    stopMomentum: momentum.stopMomentum,
    getGestureState: () => ({
      isGesturing: gestureStateRef.current.isGesturing,
      gestureType: gestureStateRef.current.gestureType,
    }),
    zoomLevels: ZOOM_LEVELS,
  };
}

export default useCanvasGestures;
