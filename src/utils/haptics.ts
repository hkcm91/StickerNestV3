/**
 * StickerNest v2 - Haptic Feedback Utility
 * Provides haptic feedback for mobile interactions using the Vibration API
 */

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Haptic feedback patterns
 */
export const HapticPatterns = {
  // Light tap - selection, toggle
  light: [10],
  // Medium tap - button press, confirm
  medium: [20],
  // Heavy tap - important action, error
  heavy: [40],
  // Success - completion, save
  success: [10, 50, 20],
  // Warning - caution, attention
  warning: [30, 50, 30],
  // Error - failure, invalid action
  error: [50, 30, 50, 30, 50],
  // Double tap - double click, zoom
  doubleTap: [10, 50, 10],
  // Drag start
  dragStart: [15],
  // Drag end/drop
  dragEnd: [25],
  // Resize start
  resizeStart: [15],
  // Rotate start
  rotateStart: [15],
  // Selection change
  select: [8],
  // Multi-select add
  multiSelect: [5, 30, 5],
  // Snap to grid/guide
  snap: [5],
} as const;

export type HapticPattern = keyof typeof HapticPatterns;

/**
 * Trigger haptic feedback
 * @param pattern - The haptic pattern to play
 * @returns true if haptic was triggered, false if not supported
 */
export function haptic(pattern: HapticPattern | number[]): boolean {
  if (!isHapticSupported()) {
    return false;
  }

  try {
    const vibrationPattern = Array.isArray(pattern)
      ? pattern
      : HapticPatterns[pattern];

    navigator.vibrate(vibrationPattern);
    return true;
  } catch (e) {
    // Silently fail - haptics are non-essential
    return false;
  }
}

/**
 * Cancel any ongoing haptic feedback
 */
export function cancelHaptic(): void {
  if (isHapticSupported()) {
    try {
      navigator.vibrate(0);
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * React hook for haptic feedback
 * Returns a function that triggers haptic feedback only if the device supports it
 */
export function useHaptic() {
  const triggerHaptic = (pattern: HapticPattern | number[]) => {
    return haptic(pattern);
  };

  return {
    haptic: triggerHaptic,
    isSupported: isHapticSupported(),
    patterns: HapticPatterns,
  };
}

export default haptic;
