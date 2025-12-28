/**
 * StickerNest v2 - Viewport Isolation Hook
 *
 * Prevents browser-level zoom/scroll while allowing canvas gestures.
 * Sets up the proper viewport meta tag and CSS for mobile isolation.
 */

import { useEffect, useRef } from 'react';

interface ViewportIsolationOptions {
  /** Enable viewport isolation (default: true) */
  enabled?: boolean;
  /** Prevent pull-to-refresh (default: true) */
  preventPullToRefresh?: boolean;
  /** Prevent pinch zoom on the page (default: true) */
  preventPageZoom?: boolean;
  /** Allow scrolling outside the canvas (default: true) */
  allowPageScroll?: boolean;
}

/**
 * Hook to isolate canvas zoom/gestures from browser zoom/gestures.
 *
 * This ensures:
 * 1. Pinch-to-zoom only affects the canvas, not the browser
 * 2. Pull-to-refresh is disabled
 * 3. The page doesn't scroll when panning the canvas
 * 4. The viewport meta tag is properly configured for mobile
 */
export function useViewportIsolation(options: ViewportIsolationOptions = {}) {
  const {
    enabled = true,
    preventPullToRefresh = true,
    preventPageZoom = true,
    allowPageScroll = true,
  } = options;

  const originalViewportRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Store original viewport content
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      originalViewportRef.current = viewportMeta.getAttribute('content');
    }

    // Set viewport to prevent browser zoom
    // user-scalable=no prevents double-tap and pinch zoom at browser level
    // maximum-scale=1 ensures consistent 1:1 scaling
    if (preventPageZoom) {
      const newContent = [
        'width=device-width',
        'initial-scale=1',
        'maximum-scale=1',
        'minimum-scale=1',
        'user-scalable=no',
        'viewport-fit=cover', // For notched devices
      ].join(', ');

      if (viewportMeta) {
        viewportMeta.setAttribute('content', newContent);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = newContent;
        document.head.appendChild(meta);
      }
    }

    // Prevent pull-to-refresh
    if (preventPullToRefresh) {
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
    }

    // Prevent touch move on body (except for allowed scrollable areas)
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;

      // Allow scrolling in designated scrollable areas
      if (allowPageScroll) {
        const scrollableParent = target.closest('[data-scrollable], .scrollable, [style*="overflow"]');
        if (scrollableParent) return;
      }

      // Prevent two-finger gestures at page level (let canvas handle them)
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    };

    // Prevent gesture events (Safari)
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    // Prevent wheel zoom (Ctrl+scroll)
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;

      // Only prevent if Ctrl/Cmd is held (zoom gesture) and not on canvas
      if ((e.ctrlKey || e.metaKey) && !target.closest('[data-canvas-container]')) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('gesturestart', handleGestureStart);
    document.addEventListener('gesturechange', handleGestureStart);
    document.addEventListener('gestureend', handleGestureStart);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      // Restore original viewport
      if (originalViewportRef.current && viewportMeta) {
        viewportMeta.setAttribute('content', originalViewportRef.current);
      }

      // Restore body styles
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';

      // Remove listeners
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('gesturechange', handleGestureStart);
      document.removeEventListener('gestureend', handleGestureStart);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, preventPullToRefresh, preventPageZoom, allowPageScroll]);
}

export default useViewportIsolation;
