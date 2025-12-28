/**
 * Docker 2.0 Touch Gestures Hook
 * Provides touch/mobile gesture support for drag, swipe, and pinch interactions
 */

import { useRef, useCallback, useEffect } from 'react';
import { useDocker2Store } from './useDocker2Store';

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface TouchGestureState {
  /** Whether a touch gesture is active */
  isActive: boolean;
  /** Starting touch point */
  startPoint: TouchPoint | null;
  /** Current touch point */
  currentPoint: TouchPoint | null;
  /** Number of touch points (for pinch detection) */
  touchCount: number;
  /** Initial distance between two fingers (for pinch) */
  initialPinchDistance: number | null;
  /** Current pinch scale */
  pinchScale: number;
}

export interface Docker2TouchOptions {
  /** Docker ID to control */
  dockerId: string;
  /** Container element ref */
  containerRef: React.RefObject<HTMLElement>;
  /** Whether touch gestures are enabled */
  enabled?: boolean;
  /** Minimum swipe distance to trigger action (px) */
  swipeThreshold?: number;
  /** Maximum time for swipe gesture (ms) */
  swipeTimeout?: number;
  /** Callback when swipe left detected */
  onSwipeLeft?: () => void;
  /** Callback when swipe right detected */
  onSwipeRight?: () => void;
  /** Callback when swipe up detected */
  onSwipeUp?: () => void;
  /** Callback when swipe down detected */
  onSwipeDown?: () => void;
  /** Callback when long press detected */
  onLongPress?: (widgetId: string | null) => void;
  /** Callback when double tap detected */
  onDoubleTap?: (widgetId: string | null) => void;
}

export interface Docker2TouchReturn {
  /** Current gesture state */
  gestureState: TouchGestureState;
  /** Whether a drag is in progress */
  isDragging: boolean;
  /** Touch event handlers to spread on container */
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
}

const DEFAULT_SWIPE_THRESHOLD = 50;
const DEFAULT_SWIPE_TIMEOUT = 300;
const LONG_PRESS_DURATION = 500;
const DOUBLE_TAP_TIMEOUT = 300;

interface TouchLike {
  clientX: number;
  clientY: number;
}

const getDistance = (touch1: TouchLike, touch2: TouchLike): number => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getTouchPoint = (touch: TouchLike): TouchPoint => ({
  x: touch.clientX,
  y: touch.clientY,
  timestamp: Date.now(),
});

export const useDocker2Touch = ({
  dockerId,
  containerRef,
  enabled = true,
  swipeThreshold = DEFAULT_SWIPE_THRESHOLD,
  swipeTimeout = DEFAULT_SWIPE_TIMEOUT,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onLongPress,
  onDoubleTap,
}: Docker2TouchOptions): Docker2TouchReturn => {
  // Gesture state refs
  const gestureState = useRef<TouchGestureState>({
    isActive: false,
    startPoint: null,
    currentPoint: null,
    touchCount: 0,
    initialPinchDistance: null,
    pinchScale: 1,
  });

  const isDragging = useRef(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTapTime = useRef<number>(0);
  const lastTapTarget = useRef<string | null>(null);

  // Store actions
  const {
    getDocker,
    updateDocker,
    setLayout,
    toggleEditMode,
    setThemeMode,
  } = useDocker2Store();

  // Clear long press timer
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Get widget ID from touch target
  const getWidgetIdFromTarget = useCallback((target: EventTarget | null): string | null => {
    if (!target || !(target instanceof HTMLElement)) return null;

    // Look for data-widget-id attribute
    const widgetElement = target.closest('[data-widget-id]');
    if (widgetElement) {
      return widgetElement.getAttribute('data-widget-id');
    }
    return null;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const touches = e.touches;
    const touch = touches[0];

    // Record start point
    gestureState.current = {
      isActive: true,
      startPoint: getTouchPoint(touch),
      currentPoint: getTouchPoint(touch),
      touchCount: touches.length,
      initialPinchDistance: touches.length >= 2
        ? getDistance(touches[0], touches[1])
        : null,
      pinchScale: 1,
    };

    // Check for double tap
    const now = Date.now();
    const targetWidgetId = getWidgetIdFromTarget(e.target);

    if (
      now - lastTapTime.current < DOUBLE_TAP_TIMEOUT &&
      lastTapTarget.current === targetWidgetId
    ) {
      // Double tap detected
      e.preventDefault();
      onDoubleTap?.(targetWidgetId);
      lastTapTime.current = 0;
      lastTapTarget.current = null;
      return;
    }

    lastTapTime.current = now;
    lastTapTarget.current = targetWidgetId;

    // Start long press timer
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      if (gestureState.current.isActive) {
        const widgetId = getWidgetIdFromTarget(e.target);
        onLongPress?.(widgetId);

        // Trigger haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, LONG_PRESS_DURATION);
  }, [enabled, clearLongPress, getWidgetIdFromTarget, onDoubleTap, onLongPress]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !gestureState.current.isActive) return;

    const touches = e.touches;
    const touch = touches[0];

    // Update current point
    gestureState.current.currentPoint = getTouchPoint(touch);
    gestureState.current.touchCount = touches.length;

    // Cancel long press if moved significantly
    const startPoint = gestureState.current.startPoint;
    if (startPoint) {
      const dx = Math.abs(touch.clientX - startPoint.x);
      const dy = Math.abs(touch.clientY - startPoint.y);
      if (dx > 10 || dy > 10) {
        clearLongPress();
        isDragging.current = true;
      }
    }

    // Handle pinch gesture (two fingers)
    if (touches.length >= 2 && gestureState.current.initialPinchDistance) {
      const currentDistance = getDistance(touches[0], touches[1]);
      gestureState.current.pinchScale = currentDistance / gestureState.current.initialPinchDistance;

      // Could trigger zoom or other pinch actions here
      e.preventDefault();
    }
  }, [enabled, clearLongPress]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    clearLongPress();

    const state = gestureState.current;
    if (!state.isActive || !state.startPoint || !state.currentPoint) {
      gestureState.current.isActive = false;
      isDragging.current = false;
      return;
    }

    const dx = state.currentPoint.x - state.startPoint.x;
    const dy = state.currentPoint.y - state.startPoint.y;
    const dt = state.currentPoint.timestamp - state.startPoint.timestamp;

    // Check for swipe gesture
    if (dt < swipeTimeout) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > swipeThreshold || absDy > swipeThreshold) {
        e.preventDefault();

        if (absDx > absDy) {
          // Horizontal swipe
          if (dx > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (dy > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }
    }

    // Reset state
    gestureState.current = {
      isActive: false,
      startPoint: null,
      currentPoint: null,
      touchCount: 0,
      initialPinchDistance: null,
      pinchScale: 1,
    };
    isDragging.current = false;
  }, [
    enabled,
    clearLongPress,
    swipeThreshold,
    swipeTimeout,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  ]);

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    clearLongPress();
    gestureState.current = {
      isActive: false,
      startPoint: null,
      currentPoint: null,
      touchCount: 0,
      initialPinchDistance: null,
      pinchScale: 1,
    };
    isDragging.current = false;
  }, [clearLongPress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPress();
    };
  }, [clearLongPress]);

  // Default gesture handlers for Docker 2.0
  useEffect(() => {
    if (!enabled) return;

    const docker = getDocker(dockerId);
    if (!docker) return;

    // Set up default handlers if none provided
    // Swipe left/right to change layout
    // Swipe up to toggle edit mode
    // etc.
  }, [enabled, dockerId, getDocker]);

  return {
    gestureState: gestureState.current,
    isDragging: isDragging.current,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  };
};

/**
 * Pre-configured touch hook with Docker 2.0 defaults
 * Swipe left/right cycles layouts, swipe up toggles edit, double-tap maximizes
 */
export const useDocker2DefaultTouch = (
  dockerId: string,
  containerRef: React.RefObject<HTMLElement>
) => {
  const {
    getDocker,
    setLayout,
    toggleEditMode,
    maximizeWidget,
  } = useDocker2Store();

  const layouts: Array<'vertical' | 'horizontal' | 'grid' | 'tabbed'> = [
    'vertical',
    'horizontal',
    'grid',
    'tabbed',
  ];

  const cycleLayout = useCallback((direction: 1 | -1) => {
    const docker = getDocker(dockerId);
    if (!docker) return;

    const currentIndex = layouts.indexOf(docker.layout.mode);
    const newIndex = (currentIndex + direction + layouts.length) % layouts.length;
    setLayout(dockerId, { mode: layouts[newIndex] });

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [dockerId, getDocker, setLayout]);

  return useDocker2Touch({
    dockerId,
    containerRef,
    enabled: true,
    onSwipeLeft: () => cycleLayout(1),
    onSwipeRight: () => cycleLayout(-1),
    onSwipeUp: () => toggleEditMode(dockerId),
    onDoubleTap: (widgetId) => {
      if (widgetId) {
        maximizeWidget(dockerId, widgetId);
      }
    },
    onLongPress: (widgetId) => {
      // Could show context menu here
      console.log('Long press on widget:', widgetId);
    },
  });
};

export default useDocker2Touch;
