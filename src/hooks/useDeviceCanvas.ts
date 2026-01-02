/**
 * StickerNest v2 - Device Canvas Hook
 *
 * Provides device-native canvas dimensions for mobile devices.
 * Automatically accounts for toolbars, safe areas, and orientation.
 */

import { useState, useEffect, useMemo } from 'react';
import { useViewport, useSafeArea, useOrientation } from './useResponsive';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Height of the mobile bottom toolbar */
const MOBILE_TOOLBAR_HEIGHT = 64;

/** Optional header height (set to 0 if no header) */
const MOBILE_HEADER_HEIGHT = 0;

/** Minimum canvas dimensions */
const MIN_CANVAS_WIDTH = 320;
const MIN_CANVAS_HEIGHT = 400;

/** Padding around canvas when fitting to view */
const CANVAS_PADDING = 16;

// ============================================================================
// TYPES
// ============================================================================

export interface DeviceCanvasDimensions {
  /** Full available width for canvas */
  width: number;
  /** Full available height for canvas (minus chrome) */
  height: number;
  /** Width with padding for fit-to-view */
  paddedWidth: number;
  /** Height with padding for fit-to-view */
  paddedHeight: number;
  /** Whether dimensions are for a mobile device */
  isMobile: boolean;
  /** Current orientation */
  orientation: 'portrait' | 'landscape';
  /** Safe area insets */
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to get device-native canvas dimensions
 *
 * On mobile devices, returns dimensions that fit the screen minus toolbars.
 * On desktop, returns standard dimensions or the provided overrides.
 *
 * @example
 * ```tsx
 * const { width, height, isMobile } = useDeviceCanvas();
 *
 * // Use for canvas sizing
 * <Canvas width={width} height={height} />
 * ```
 */
export function useDeviceCanvas(options: {
  /** Override width (used on desktop or when not using device-native) */
  defaultWidth?: number;
  /** Override height (used on desktop or when not using device-native) */
  defaultHeight?: number;
  /** Force use of device dimensions even on desktop (for preview) */
  forceDeviceDimensions?: boolean;
} = {}): DeviceCanvasDimensions {
  const {
    defaultWidth = 1920,
    defaultHeight = 1080,
    forceDeviceDimensions = false,
  } = options;

  const { width: viewportWidth, height: viewportHeight, isMobile } = useViewport();
  const safeArea = useSafeArea();
  const orientation = useOrientation();

  // Track if we should use device dimensions
  const useDeviceDimensions = isMobile || forceDeviceDimensions;

  const dimensions = useMemo(() => {
    if (!useDeviceDimensions) {
      // Desktop: use default dimensions
      return {
        width: defaultWidth,
        height: defaultHeight,
        paddedWidth: defaultWidth,
        paddedHeight: defaultHeight,
        isMobile: false,
        orientation,
        safeArea: {
          top: safeArea.top,
          bottom: safeArea.bottom,
          left: safeArea.left,
          right: safeArea.right,
        },
      };
    }

    // Mobile: calculate device-native dimensions
    // Account for safe areas (notch, home indicator)
    const availableWidth = viewportWidth - safeArea.left - safeArea.right;
    const availableHeight =
      viewportHeight -
      safeArea.top -
      safeArea.bottom -
      MOBILE_TOOLBAR_HEIGHT -
      MOBILE_HEADER_HEIGHT;

    // Ensure minimum dimensions
    const canvasWidth = Math.max(availableWidth, MIN_CANVAS_WIDTH);
    const canvasHeight = Math.max(availableHeight, MIN_CANVAS_HEIGHT);

    // Padded dimensions for fit-to-view calculations
    const paddedWidth = canvasWidth - CANVAS_PADDING * 2;
    const paddedHeight = canvasHeight - CANVAS_PADDING * 2;

    return {
      width: canvasWidth,
      height: canvasHeight,
      paddedWidth: Math.max(paddedWidth, MIN_CANVAS_WIDTH - CANVAS_PADDING * 2),
      paddedHeight: Math.max(paddedHeight, MIN_CANVAS_HEIGHT - CANVAS_PADDING * 2),
      isMobile: true,
      orientation,
      safeArea: {
        top: safeArea.top,
        bottom: safeArea.bottom,
        left: safeArea.left,
        right: safeArea.right,
      },
    };
  }, [
    useDeviceDimensions,
    viewportWidth,
    viewportHeight,
    safeArea,
    orientation,
    defaultWidth,
    defaultHeight,
  ]);

  return dimensions;
}

/**
 * Hook to get container dimensions with proper measurement
 * Uses ResizeObserver for accurate, real-time measurements
 */
export function useContainerDimensions(
  containerRef: React.RefObject<HTMLElement>
): { width: number; height: number; measured: boolean } {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    measured: false,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurement
    const measure = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({
          width: rect.width,
          height: rect.height,
          measured: true,
        });
      }
    };

    // Measure immediately
    measure();

    // Use ResizeObserver for updates
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width,
            height,
            measured: true,
          });
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return dimensions;
}

/**
 * Calculate optimal canvas dimensions for the current device
 * Static helper for non-hook contexts
 */
export function calculateDeviceCanvasDimensions(): {
  width: number;
  height: number;
} {
  if (typeof window === 'undefined') {
    return { width: 390, height: 844 };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Simple safe area detection
  const computedStyle = getComputedStyle(document.documentElement);
  const safeAreaTop =
    parseInt(computedStyle.getPropertyValue('--safe-area-top') || '0', 10) || 0;
  const safeAreaBottom =
    parseInt(computedStyle.getPropertyValue('--safe-area-bottom') || '0', 10) || 0;

  const canvasHeight =
    height - safeAreaTop - safeAreaBottom - MOBILE_TOOLBAR_HEIGHT - MOBILE_HEADER_HEIGHT;

  return {
    width: Math.max(width, MIN_CANVAS_WIDTH),
    height: Math.max(canvasHeight, MIN_CANVAS_HEIGHT),
  };
}

export default useDeviceCanvas;
