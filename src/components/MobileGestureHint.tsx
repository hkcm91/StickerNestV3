/**
 * StickerNest v2 - Mobile Gesture Hint Component
 * Shows a brief, non-intrusive hint about mobile gestures
 */

import React, { useEffect, useState } from 'react';
import { useViewport, useTouchDevice } from '../hooks/useResponsive';
import styles from '../canvas/MainCanvas.module.css';

const STORAGE_KEY = 'sn_gesture_hints_shown';
const HINT_DISPLAY_DURATION = 4000; // Show for 4 seconds total
const INITIAL_DELAY = 1500; // Wait 1.5s before showing

export function MobileGestureHint() {
  const { isMobile } = useViewport();
  const { hasTouch } = useTouchDevice();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show if not mobile or already shown
    if (!isMobile || !hasTouch) return;

    const hasShown = localStorage.getItem(STORAGE_KEY) === 'true';
    if (hasShown) return;

    // Show hint after initial delay
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, INITIAL_DELAY);

    // Auto-dismiss after duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, INITIAL_DELAY + HINT_DISPLAY_DURATION);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isMobile, hasTouch]);

  // Manual dismiss on tap
  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isVisible) return null;

  return (
    <div
      className={styles.gestureHint}
      onClick={handleDismiss}
      role="status"
      aria-live="polite"
      style={{
        animation: 'fadeInSlideUp 0.3s ease forwards',
      }}
    >
      <div className={styles.gestureHintContent}>
        <span className={styles.gestureHintIcon}>👌</span>
        <strong>Touch Gestures:</strong> Pinch to zoom • Drag to pan • Double-tap to reset
      </div>
      <div className={styles.gestureHintDismiss}>Tap to dismiss</div>
    </div>
  );
}

/**
 * Reset gesture hints (useful for debugging or user preference reset)
 */
export function resetGestureHints() {
  localStorage.removeItem(STORAGE_KEY);
}

export default MobileGestureHint;
