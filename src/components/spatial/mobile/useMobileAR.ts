/**
 * StickerNest - Mobile AR Detection Hook
 *
 * Detects mobile AR capabilities and provides device-specific configurations.
 * Prioritizes Chrome (Android) over Safari (iOS) per user requirements.
 *
 * Features:
 * - WebXR AR support detection
 * - ARCore (Android) / ARKit (iOS) feature detection
 * - Browser-specific capability mapping
 * - Graceful fallback detection
 */

import { useState, useEffect, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export type MobileBrowser = 'chrome-android' | 'safari-ios' | 'firefox-android' | 'samsung' | 'other';
export type ARCapabilityLevel = 'full' | 'limited' | 'fallback' | 'none';

export interface MobileARCapabilities {
  /** Browser type */
  browser: MobileBrowser;
  /** Is this a mobile device */
  isMobile: boolean;
  /** Is AR available via WebXR */
  hasWebXRAR: boolean;
  /** Has plane detection (horizontal/vertical surfaces) */
  hasPlaneDetection: boolean;
  /** Has hit testing (ray-surface intersection) */
  hasHitTest: boolean;
  /** Has light estimation */
  hasLightEstimation: boolean;
  /** Has depth sensing (ARCore Depth API) */
  hasDepthSensing: boolean;
  /** Has image tracking (QR/marker detection) */
  hasImageTracking: boolean;
  /** Has anchors persistence */
  hasAnchors: boolean;
  /** Capability level summary */
  level: ARCapabilityLevel;
  /** Recommended features to enable */
  recommendedFeatures: string[];
  /** Features that should be disabled */
  disabledFeatures: string[];
  /** Human-readable status message */
  statusMessage: string;
}

// ============================================================================
// Browser Detection
// ============================================================================

function detectBrowser(): MobileBrowser {
  if (typeof navigator === 'undefined') return 'other';

  const ua = navigator.userAgent.toLowerCase();
  const vendor = navigator.vendor?.toLowerCase() || '';

  // Check for iOS (Safari or Chrome on iOS)
  if (/iphone|ipad|ipod/.test(ua)) {
    // All iOS browsers use WebKit, but Safari has specific identifiers
    return 'safari-ios';
  }

  // Android detection
  if (/android/.test(ua)) {
    // Samsung Internet
    if (/samsungbrowser/.test(ua)) {
      return 'samsung';
    }
    // Firefox for Android
    if (/firefox/.test(ua)) {
      return 'firefox-android';
    }
    // Chrome for Android (most common, highest priority)
    if (/chrome/.test(ua) && vendor.includes('google')) {
      return 'chrome-android';
    }
  }

  return 'other';
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(ua) ||
    (navigator.maxTouchPoints > 0 && /mobile|tablet/.test(ua));
}

// ============================================================================
// WebXR AR Feature Detection
// ============================================================================

async function checkWebXRARSupport(): Promise<{
  hasWebXRAR: boolean;
  supportedFeatures: string[];
}> {
  if (typeof navigator === 'undefined' || !('xr' in navigator)) {
    return { hasWebXRAR: false, supportedFeatures: [] };
  }

  try {
    const xr = navigator.xr as XRSystem;
    const isSupported = await xr.isSessionSupported('immersive-ar');

    if (!isSupported) {
      return { hasWebXRAR: false, supportedFeatures: [] };
    }

    // Check which optional features are supported
    const featuresToCheck = [
      'hit-test',
      'plane-detection',
      'light-estimation',
      'depth-sensing',
      'anchors',
      'dom-overlay',
      'camera-access',
    ];

    const supportedFeatures: string[] = [];

    // We can't directly check feature support, but we can track what's typically available
    // Chrome Android supports most features, Safari iOS is limited
    const browser = detectBrowser();

    if (browser === 'chrome-android') {
      // ARCore on Chrome Android typically supports:
      supportedFeatures.push(
        'hit-test',
        'plane-detection',
        'light-estimation',
        'anchors',
        'dom-overlay'
      );
      // Depth sensing requires ARCore Depth API (Pixel, Samsung flagships, etc.)
      // We can't detect this directly, so we include it conditionally
    } else if (browser === 'safari-ios') {
      // Safari iOS has limited WebXR AR support
      // As of 2025, support is experimental behind flags
      supportedFeatures.push('hit-test', 'dom-overlay');
    }

    return { hasWebXRAR: true, supportedFeatures };
  } catch {
    return { hasWebXRAR: false, supportedFeatures: [] };
  }
}

// ============================================================================
// Main Hook
// ============================================================================

export function useMobileAR(): MobileARCapabilities {
  const [capabilities, setCapabilities] = useState<MobileARCapabilities>(() => ({
    browser: 'other',
    isMobile: false,
    hasWebXRAR: false,
    hasPlaneDetection: false,
    hasHitTest: false,
    hasLightEstimation: false,
    hasDepthSensing: false,
    hasImageTracking: false,
    hasAnchors: false,
    level: 'none',
    recommendedFeatures: [],
    disabledFeatures: [],
    statusMessage: 'Detecting AR capabilities...',
  }));

  useEffect(() => {
    async function detect() {
      const browser = detectBrowser();
      const isMobile = isMobileDevice();
      const { hasWebXRAR, supportedFeatures } = await checkWebXRARSupport();

      // Map features to capabilities
      const hasHitTest = supportedFeatures.includes('hit-test');
      const hasPlaneDetection = supportedFeatures.includes('plane-detection');
      const hasLightEstimation = supportedFeatures.includes('light-estimation');
      const hasAnchors = supportedFeatures.includes('anchors');
      const hasDepthSensing = supportedFeatures.includes('depth-sensing');

      // Determine capability level
      let level: ARCapabilityLevel = 'none';
      let statusMessage = '';
      const recommendedFeatures: string[] = [];
      const disabledFeatures: string[] = [];

      if (hasWebXRAR) {
        if (browser === 'chrome-android') {
          // Chrome Android with ARCore - full support
          level = 'full';
          statusMessage = 'Full AR support via Chrome + ARCore';
          recommendedFeatures.push(
            'hit-test',
            'plane-detection',
            'light-estimation',
            'anchors',
            'dom-overlay'
          );
        } else if (browser === 'safari-ios') {
          // Safari iOS - limited support
          level = 'limited';
          statusMessage = 'Limited AR support on Safari iOS';
          recommendedFeatures.push('hit-test', 'dom-overlay');
          disabledFeatures.push('plane-detection', 'light-estimation', 'anchors');
        } else {
          // Other browsers with WebXR AR
          level = 'limited';
          statusMessage = 'AR available with limited features';
          recommendedFeatures.push('hit-test');
        }
      } else if (isMobile) {
        // Mobile without WebXR - offer fallback
        level = 'fallback';
        if (browser === 'safari-ios') {
          statusMessage = 'AR Quick Look available for 3D model preview';
        } else {
          statusMessage = 'WebXR not available - using touch placement mode';
        }
      } else {
        level = 'none';
        statusMessage = 'AR not available on this device';
      }

      setCapabilities({
        browser,
        isMobile,
        hasWebXRAR,
        hasPlaneDetection,
        hasHitTest,
        hasLightEstimation,
        hasDepthSensing,
        hasImageTracking: false, // WebXR doesn't expose this directly
        hasAnchors,
        level,
        recommendedFeatures,
        disabledFeatures,
        statusMessage,
      });
    }

    detect();
  }, []);

  return capabilities;
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Returns true if the device can use full AR features (Chrome Android preferred)
 */
export function useHasFullAR(): boolean {
  const { level } = useMobileAR();
  return level === 'full';
}

/**
 * Returns true if any AR mode is available (including fallbacks)
 */
export function useHasAnyAR(): boolean {
  const { level } = useMobileAR();
  return level !== 'none';
}

/**
 * Returns true if we're on Chrome Android (the preferred platform)
 */
export function useIsPreferredARPlatform(): boolean {
  const { browser, hasWebXRAR } = useMobileAR();
  return browser === 'chrome-android' && hasWebXRAR;
}

/**
 * Get the list of WebXR features to request based on detected capabilities
 */
export function useARSessionFeatures(): { required: string[]; optional: string[] } {
  const { recommendedFeatures, browser } = useMobileAR();

  return useMemo(() => {
    // Base required features for AR
    const required: string[] = ['local-floor'];

    // Optional features based on browser capabilities
    const optional: string[] = [...recommendedFeatures];

    // Chrome Android can handle more optional features
    if (browser === 'chrome-android') {
      if (!optional.includes('hit-test')) optional.push('hit-test');
      if (!optional.includes('plane-detection')) optional.push('plane-detection');
      if (!optional.includes('anchors')) optional.push('anchors');
    }

    return { required, optional };
  }, [recommendedFeatures, browser]);
}

export default useMobileAR;
