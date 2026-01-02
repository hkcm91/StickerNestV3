/**
 * StickerNest v2 - Responsive Hooks
 * React hooks for responsive design and device detection
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ==========================================
// BREAKPOINT DEFINITIONS
// ==========================================

export const BREAKPOINTS = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ==========================================
// VIEWPORT HOOK
// ==========================================

export interface ViewportSize {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
}

export function useViewport(): ViewportSize {
  const [viewport, setViewport] = useState<ViewportSize>(() => getViewportSize());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewport(getViewportSize());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial update
    setViewport(getViewportSize());

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return viewport;
}

function getViewportSize(): ViewportSize {
  // SSR fallback - use desktop dimensions
  // The actual dimensions will be set on client-side mount
  if (typeof window === 'undefined') {
    return {
      width: 1024,
      height: 768,
      breakpoint: 'lg',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLandscape: true,
      isPortrait: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  const breakpoint = getBreakpoint(width);
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  const isLandscape = width > height;
  const isPortrait = height >= width;

  return {
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    isPortrait,
  };
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

// ==========================================
// MEDIA QUERY HOOK
// ==========================================

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Convenience hooks for common queries
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

// ==========================================
// TOUCH DETECTION HOOK
// ==========================================

export interface TouchCapabilities {
  hasTouch: boolean;
  hasMouse: boolean;
  hasCoarsePointer: boolean;
  hasFinePointer: boolean;
  isHybrid: boolean;
  hasVRController: boolean;
  isMetaQuest: boolean;
  hasXRSupport: boolean;
}

export function useTouchDevice(): TouchCapabilities {
  const [capabilities, setCapabilities] = useState<TouchCapabilities>(() => detectTouchCapabilities());

  useEffect(() => {
    // Re-detect on pointer changes (e.g., tablet with keyboard attached)
    const detectCapabilities = () => {
      setCapabilities(detectTouchCapabilities());
    };

    // Some devices can change between touch/mouse
    window.addEventListener('pointerdown', detectCapabilities, { once: true });

    return () => {
      window.removeEventListener('pointerdown', detectCapabilities);
    };
  }, []);

  return capabilities;
}

function detectTouchCapabilities(): TouchCapabilities {
  if (typeof window === 'undefined') {
    return {
      hasTouch: false,
      hasMouse: true,
      hasCoarsePointer: false,
      hasFinePointer: true,
      isHybrid: false,
      hasVRController: false,
      isMetaQuest: false,
      hasXRSupport: false,
    };
  }

  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const hasMouse = window.matchMedia('(hover: hover)').matches;
  const isHybrid = hasTouch && hasMouse;

  // VR/XR Detection
  const userAgent = navigator.userAgent.toLowerCase();
  const isMetaQuest = userAgent.includes('quest') || userAgent.includes('oculus');
  const hasXRSupport = 'xr' in navigator;

  // VR controllers detected via Meta Quest browser or XR gamepad API
  // Meta Quest browser reports as having touch + XR support
  const hasVRController = isMetaQuest || (
    hasXRSupport &&
    hasCoarsePointer &&
    // Quest browser has specific viewport characteristics
    (window.innerWidth >= 1800 || userAgent.includes('vr'))
  );

  return {
    hasTouch,
    hasMouse,
    hasCoarsePointer,
    hasFinePointer,
    isHybrid,
    hasVRController,
    isMetaQuest,
    hasXRSupport,
  };
}

// ==========================================
// ORIENTATION HOOK
// ==========================================

export type Orientation = 'portrait' | 'landscape';

export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(() => getOrientation());

  useEffect(() => {
    const handleChange = () => {
      setOrientation(getOrientation());
    };

    // Use both methods for better compatibility
    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);

    // Screen orientation API
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleChange);
    }

    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleChange);
      }
    };
  }, []);

  return orientation;
}

function getOrientation(): Orientation {
  if (typeof window === 'undefined') return 'landscape';

  // Try screen.orientation API first
  if (screen.orientation) {
    return screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
  }

  // Fallback to comparing dimensions
  return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape';
}

// ==========================================
// SAFE AREA HOOK (for notched devices)
// ==========================================

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function useSafeArea(): SafeAreaInsets {
  const [safeArea, setSafeArea] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-top') || '0', 10) || 0,
        right: parseInt(computedStyle.getPropertyValue('--safe-area-right') || '0', 10) || 0,
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-bottom') || '0', 10) || 0,
        left: parseInt(computedStyle.getPropertyValue('--safe-area-left') || '0', 10) || 0,
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  return safeArea;
}

// ==========================================
// RESPONSIVE VALUE HOOK
// ==========================================

type ResponsiveValue<T> = {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
  base: T;
};

export function useResponsiveValue<T>(values: ResponsiveValue<T>): T {
  const { breakpoint } = useViewport();

  return useMemo(() => {
    // Check breakpoints from largest to smallest
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);

    // Find the first defined value at or below current breakpoint
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp] as T;
      }
    }

    return values.base;
  }, [breakpoint, values]);
}

// ==========================================
// KEYBOARD VISIBILITY HOOK (mobile)
// ==========================================

export function useKeyboardVisible(): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only relevant on mobile
    if (typeof visualViewport === 'undefined') return;

    const handleResize = () => {
      // Keyboard is likely visible if viewport height shrinks significantly
      const heightDiff = window.innerHeight - (visualViewport?.height || window.innerHeight);
      setIsVisible(heightDiff > 150);
    };

    visualViewport?.addEventListener('resize', handleResize);
    return () => visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  return isVisible;
}

// ==========================================
// SCROLL LOCK HOOK
// ==========================================

export function useScrollLock(lock: boolean): void {
  useEffect(() => {
    if (!lock) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    const scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [lock]);
}

// ==========================================
// COMBINED RESPONSIVE CONTEXT
// ==========================================

export interface ResponsiveContext {
  viewport: ViewportSize;
  touch: TouchCapabilities;
  orientation: Orientation;
  safeArea: SafeAreaInsets;
  isKeyboardVisible: boolean;
  prefersReducedMotion: boolean;
}

export function useResponsive(): ResponsiveContext {
  const viewport = useViewport();
  const touch = useTouchDevice();
  const orientation = useOrientation();
  const safeArea = useSafeArea();
  const isKeyboardVisible = useKeyboardVisible();
  const prefersReducedMotion = usePrefersReducedMotion();

  return {
    viewport,
    touch,
    orientation,
    safeArea,
    isKeyboardVisible,
    prefersReducedMotion,
  };
}

export default useResponsive;
