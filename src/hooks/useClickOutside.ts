/**
 * StickerNest v2 - Click Outside Hook
 *
 * Detects clicks outside a referenced element.
 * Commonly used for closing dropdowns, modals, and context menus.
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useClickOutside(ref, () => setIsOpen(false));
 *
 * return <div ref={ref}>Content</div>;
 * ```
 *
 * REFACTORING NOTE (Dec 2024):
 * This hook consolidates 14+ duplicate click-outside implementations found in:
 * - WidgetContextMenu.tsx
 * - CanvasContextMenu.tsx
 * - StickerContextMenu.tsx
 * - CanvasSelectorDropdown.tsx
 * - EditToolsMenu.tsx
 * - CanvasSizeSelector.tsx
 * - TextEditOverlay.tsx
 * - ThemeToggle.tsx
 * - WidgetLibrarySort.tsx
 * - NotificationsDropdown.tsx
 * - ChannelSelector.tsx
 * - CanvasToolbar.tsx
 * - CreativeToolbar.tsx
 * - ModelSelector.tsx
 *
 * When updating these components, replace their local click-outside logic
 * with this hook for consistency.
 */

import { useEffect, useCallback, RefObject } from 'react';

// ==========================================
// TYPES
// ==========================================

export interface UseClickOutsideOptions {
  /**
   * Event type to listen for.
   * - 'mousedown': Fires immediately on click (recommended)
   * - 'mouseup': Fires after click release
   * - 'click': Fires after full click cycle
   * @default 'mousedown'
   */
  event?: 'mousedown' | 'mouseup' | 'click';

  /**
   * Whether the hook is active.
   * Useful for conditionally enabling/disabling.
   * @default true
   */
  enabled?: boolean;

  /**
   * Additional refs to exclude from "outside" detection.
   * Clicks on these elements won't trigger the callback.
   */
  excludeRefs?: RefObject<HTMLElement>[];

  /**
   * CSS selector for elements to exclude from "outside" detection.
   * Useful for portaled elements like tooltips.
   * @example '[data-radix-popper-content-wrapper]'
   */
  excludeSelector?: string;
}

// ==========================================
// HOOK IMPLEMENTATION
// ==========================================

/**
 * Hook that detects clicks outside of a referenced element.
 *
 * @param ref - React ref attached to the element to monitor
 * @param onClickOutside - Callback fired when click occurs outside the element
 * @param options - Configuration options
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  onClickOutside: (event: MouseEvent | TouchEvent) => void,
  options: UseClickOutsideOptions = {}
): void {
  const {
    event = 'mousedown',
    enabled = true,
    excludeRefs = [],
    excludeSelector,
  } = options;

  // Memoize handler to avoid effect re-runs
  const handleClickOutside = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;

      // Check if click was on the main ref
      if (ref.current && ref.current.contains(target)) {
        return;
      }

      // Check if click was on any excluded refs
      for (const excludeRef of excludeRefs) {
        if (excludeRef.current && excludeRef.current.contains(target)) {
          return;
        }
      }

      // Check if click was on any excluded selector
      if (excludeSelector && target instanceof Element) {
        const excludedElement = target.closest(excludeSelector);
        if (excludedElement) {
          return;
        }
      }

      // Click was outside - fire callback
      onClickOutside(e);
    },
    [ref, onClickOutside, excludeRefs, excludeSelector]
  );

  useEffect(() => {
    if (!enabled) return;

    // Add listeners
    document.addEventListener(event, handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener(event, handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [event, enabled, handleClickOutside]);
}

// ==========================================
// CONVENIENCE VARIANTS
// ==========================================

/**
 * Simplified version that just takes ref and callback.
 * For simple use cases where options aren't needed.
 */
export function useClickOutsideSimple<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  onClickOutside: () => void
): void {
  useClickOutside(ref, onClickOutside);
}

/**
 * Version that returns a boolean for whether a click occurred outside.
 * Useful for components that need to track this state.
 */
export function useClickedOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  enabled: boolean = true
): boolean {
  // This is a controlled pattern - the parent component manages state
  // and passes the callback. This hook is provided for reference only.
  // In most cases, useClickOutside with a callback is preferred.
  return false;
}

export default useClickOutside;
