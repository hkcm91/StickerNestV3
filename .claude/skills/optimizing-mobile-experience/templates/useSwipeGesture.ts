/**
 * Swipe Gesture Hook
 *
 * Provides swipe detection for touch interfaces with configurable
 * threshold, velocity, and direction support.
 *
 * Usage:
 * const { handlers } = useSwipeGesture({
 *   onSwipeLeft: () => goToNextSlide(),
 *   onSwipeRight: () => goToPrevSlide(),
 *   threshold: 50,
 *   velocity: 0.3
 * });
 *
 * return <div {...handlers}>Swipeable content</div>;
 */

import { useRef, useCallback, useMemo } from 'react';
import { haptic } from '@/utils/haptics';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type SwipeAxis = 'horizontal' | 'vertical' | 'both';

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  isSwiping: boolean;
  direction: SwipeDirection | null;
}

interface SwipeConfig {
  /** Minimum distance (px) to trigger swipe. Default: 50 */
  threshold?: number;
  /** Minimum velocity (px/ms) to trigger swipe. Default: 0.3 */
  velocity?: number;
  /** Which axis/axes to detect swipes on. Default: 'both' */
  axis?: SwipeAxis;
  /** Called when swipe left detected */
  onSwipeLeft?: () => void;
  /** Called when swipe right detected */
  onSwipeRight?: () => void;
  /** Called when swipe up detected */
  onSwipeUp?: () => void;
  /** Called when swipe down detected */
  onSwipeDown?: () => void;
  /** Called with swipe direction when any swipe detected */
  onSwipe?: (direction: SwipeDirection) => void;
  /** Called during swipe with progress (-1 to 1 on each axis) */
  onSwipeProgress?: (progress: { x: number; y: number }) => void;
  /** Called when swipe starts */
  onSwipeStart?: () => void;
  /** Called when swipe ends (even if threshold not met) */
  onSwipeEnd?: (completed: boolean, direction: SwipeDirection | null) => void;
  /** Provide haptic feedback on swipe. Default: true */
  enableHaptics?: boolean;
  /** Maximum distance (px) for progress calculation. Default: 200 */
  maxProgressDistance?: number;
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
}

interface SwipeResult {
  /** Event handlers to spread on the swipeable element */
  handlers: SwipeHandlers;
  /** Whether a swipe is currently in progress */
  isSwiping: boolean;
  /** Reset the swipe state manually */
  reset: () => void;
}

export function useSwipeGesture(config: SwipeConfig): SwipeResult {
  const {
    threshold = 50,
    velocity = 0.3,
    axis = 'both',
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    onSwipeProgress,
    onSwipeStart,
    onSwipeEnd,
    enableHaptics = true,
    maxProgressDistance = 200
  } = config;

  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isSwiping: false,
    direction: null
  });

  const reset = useCallback(() => {
    stateRef.current = {
      startX: 0,
      startY: 0,
      startTime: 0,
      isSwiping: false,
      direction: null
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isSwiping: true,
      direction: null
    };

    onSwipeStart?.();
  }, [onSwipeStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!stateRef.current.isSwiping) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - stateRef.current.startX;
    const deltaY = touch.clientY - stateRef.current.startY;

    // Calculate progress
    if (onSwipeProgress) {
      const progressX = Math.max(-1, Math.min(1, deltaX / maxProgressDistance));
      const progressY = Math.max(-1, Math.min(1, deltaY / maxProgressDistance));
      onSwipeProgress({ x: progressX, y: progressY });
    }

    // Determine initial direction if not set
    if (!stateRef.current.direction) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > 10 || absY > 10) {
        if (axis === 'horizontal' || (axis === 'both' && absX > absY)) {
          stateRef.current.direction = deltaX > 0 ? 'right' : 'left';
        } else if (axis === 'vertical' || (axis === 'both' && absY > absX)) {
          stateRef.current.direction = deltaY > 0 ? 'down' : 'up';
        }
      }
    }
  }, [axis, maxProgressDistance, onSwipeProgress]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!stateRef.current.isSwiping) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - stateRef.current.startX;
    const deltaY = touch.clientY - stateRef.current.startY;
    const elapsed = Date.now() - stateRef.current.startTime;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const velocityX = absX / elapsed;
    const velocityY = absY / elapsed;

    let detectedDirection: SwipeDirection | null = null;
    let swipeCompleted = false;

    // Check horizontal swipe
    if (
      (axis === 'horizontal' || axis === 'both') &&
      absX > threshold &&
      velocityX > velocity &&
      absX > absY
    ) {
      detectedDirection = deltaX > 0 ? 'right' : 'left';
      swipeCompleted = true;

      if (enableHaptics) {
        haptic.medium();
      }

      if (detectedDirection === 'left') {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }

    // Check vertical swipe
    if (
      (axis === 'vertical' || axis === 'both') &&
      absY > threshold &&
      velocityY > velocity &&
      absY > absX
    ) {
      detectedDirection = deltaY > 0 ? 'down' : 'up';
      swipeCompleted = true;

      if (enableHaptics) {
        haptic.medium();
      }

      if (detectedDirection === 'up') {
        onSwipeUp?.();
      } else {
        onSwipeDown?.();
      }
    }

    // Generic swipe callback
    if (swipeCompleted && detectedDirection) {
      onSwipe?.(detectedDirection);
    }

    onSwipeEnd?.(swipeCompleted, detectedDirection);
    reset();
  }, [
    axis,
    threshold,
    velocity,
    enableHaptics,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    onSwipeEnd,
    reset
  ]);

  const handleTouchCancel = useCallback(() => {
    if (stateRef.current.isSwiping) {
      onSwipeEnd?.(false, null);
      reset();
    }
  }, [onSwipeEnd, reset]);

  const handlers = useMemo<SwipeHandlers>(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel
  }), [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return {
    handlers,
    isSwiping: stateRef.current.isSwiping,
    reset
  };
}

/**
 * Utility hook for swipe-to-dismiss pattern
 */
export function useSwipeToDismiss({
  onDismiss,
  direction = 'down',
  threshold = 100,
  enableHaptics = true
}: {
  onDismiss: () => void;
  direction?: SwipeDirection;
  threshold?: number;
  enableHaptics?: boolean;
}) {
  const axis: SwipeAxis = (direction === 'left' || direction === 'right')
    ? 'horizontal'
    : 'vertical';

  return useSwipeGesture({
    axis,
    threshold,
    enableHaptics,
    onSwipeLeft: direction === 'left' ? onDismiss : undefined,
    onSwipeRight: direction === 'right' ? onDismiss : undefined,
    onSwipeUp: direction === 'up' ? onDismiss : undefined,
    onSwipeDown: direction === 'down' ? onDismiss : undefined
  });
}

/**
 * Utility hook for swipe navigation (carousel, tabs, etc.)
 */
export function useSwipeNavigation({
  onNext,
  onPrev,
  direction = 'horizontal',
  threshold = 50,
  enableHaptics = true
}: {
  onNext: () => void;
  onPrev: () => void;
  direction?: 'horizontal' | 'vertical';
  threshold?: number;
  enableHaptics?: boolean;
}) {
  return useSwipeGesture({
    axis: direction,
    threshold,
    enableHaptics,
    // Horizontal: left = next, right = prev
    // Vertical: up = next, down = prev
    onSwipeLeft: direction === 'horizontal' ? onNext : undefined,
    onSwipeRight: direction === 'horizontal' ? onPrev : undefined,
    onSwipeUp: direction === 'vertical' ? onNext : undefined,
    onSwipeDown: direction === 'vertical' ? onPrev : undefined
  });
}

export default useSwipeGesture;
