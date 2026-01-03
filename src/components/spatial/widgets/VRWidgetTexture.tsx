/**
 * StickerNest - VR Widget Texture Renderer
 *
 * Renders widget HTML content to a canvas texture for display in VR/AR.
 * Uses html2canvas to capture widget content and displays it on a 3D plane.
 *
 * Supports both:
 * - HTML-based widgets (rendered via iframe)
 * - React component widgets (rendered via ReactDOM portal)
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';
import * as THREE from 'three';
import html2canvas from 'html2canvas';
import type { WidgetInstance } from '../../../types/domain';
import { getBuiltinWidget } from '../../../widgets/builtin';
import {
  getWidgetHtml,
  createSpatial3DAPI,
  getWidgetResolutionScale,
  isReactWidget,
} from './spatialWidgetUtils';

// ============================================================================
// Types
// ============================================================================

interface VRWidgetTextureProps {
  widget: WidgetInstance;
  width: number;  // 3D width in meters
  height: number; // 3D height in meters
  refreshInterval?: number; // ms between texture updates (0 = manual only)
  onError?: (error: Error) => void;
}

interface WidgetContainerState {
  container: HTMLDivElement | null;
  iframe: HTMLIFrameElement | null;
  isReady: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TEXTURE_RESOLUTION = 512; // Base resolution for textures
const MIN_REFRESH_INTERVAL = 100; // Minimum ms between updates
const CONTAINER_ID_PREFIX = 'vr-widget-container-';

// ============================================================================
// Offscreen Widget Container Manager
// ============================================================================

class OffscreenWidgetManager {
  private containers = new Map<string, HTMLDivElement>();
  private hostElement: HTMLDivElement | null = null;

  private getHost(): HTMLDivElement {
    if (!this.hostElement) {
      this.hostElement = document.createElement('div');
      this.hostElement.id = 'vr-widget-offscreen-host';
      // html2canvas requires elements to be visible (not visibility:hidden)
      // Position off-screen but keep visible for proper rendering
      this.hostElement.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: auto;
        height: auto;
        overflow: visible;
        pointer-events: none;
        z-index: -1000;
      `;
      document.body.appendChild(this.hostElement);
    }
    return this.hostElement;
  }

  createContainer(widgetId: string, width: number, height: number): HTMLDivElement {
    // Remove existing container if any
    this.removeContainer(widgetId);

    const container = document.createElement('div');
    container.id = `${CONTAINER_ID_PREFIX}${widgetId}`;
    container.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      background: #1e1b4b;
      overflow: hidden;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    this.getHost().appendChild(container);
    this.containers.set(widgetId, container);
    return container;
  }

  getContainer(widgetId: string): HTMLDivElement | null {
    return this.containers.get(widgetId) || null;
  }

  removeContainer(widgetId: string): void {
    const container = this.containers.get(widgetId);
    if (container) {
      container.remove();
      this.containers.delete(widgetId);
    }
  }

  cleanup(): void {
    this.containers.forEach((container) => container.remove());
    this.containers.clear();
    if (this.hostElement) {
      this.hostElement.remove();
      this.hostElement = null;
    }
  }
}

// Singleton instance
const offscreenManager = new OffscreenWidgetManager();

// ============================================================================
// Hook: useWidgetTexture
// ============================================================================

function useWidgetTexture(
  widget: WidgetInstance,
  pixelWidth: number,
  pixelHeight: number,
  refreshInterval: number
) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastUpdateRef = useRef(0);
  const isMountedRef = useRef(true);
  const pixelDimensionsRef = useRef({ width: pixelWidth, height: pixelHeight });

  // Update ref when dimensions change
  pixelDimensionsRef.current = { width: pixelWidth, height: pixelHeight };

  // Stable references to widget properties to prevent infinite loops
  const widgetId = widget.id;
  const widgetDefId = widget.widgetDefId;
  const widgetMetadataSource = widget.metadata?.source;
  const widgetGeneratedHtml = widget.metadata?.generatedContent?.html;
  const widgetStateJson = useMemo(() => {
    try {
      return JSON.stringify(widget.state || {});
    } catch {
      return '{}';
    }
  }, [widget.state]);

  // Create widget HTML content - use stable dependencies only
  const widgetHtml = useMemo(() => {
    const builtin = getBuiltinWidget(widgetDefId);

    // For React components, we can't easily render to texture
    // Return null to signal we need a different approach
    if (builtin?.component) {
      return null;
    }

    // Inline HTML retrieval to avoid passing full widget object
    let html: string | null = null;
    if (builtin?.html) {
      html = typeof builtin.html === 'function' ? builtin.html() : builtin.html;
    } else if (widgetMetadataSource === 'generated' && widgetGeneratedHtml) {
      html = widgetGeneratedHtml;
    } else if (widgetMetadataSource === 'local') {
      const { getCachedWidgetHtml } = require('./vrWidgetHtmlCache');
      html = getCachedWidgetHtml(widgetDefId);
    }

    if (!html) return null;

    // Inject widget API mock
    const apiScript = `
      <script>
        window.WidgetAPI = {
          widgetId: '${widgetId}',
          widgetDefId: '${widgetDefId}',
          emit: function() {},
          emitEvent: function() {},
          emitOutput: function() {},
          onEvent: function() { return function() {}; },
          onInput: function() { return function() {}; },
          getState: function() { return ${widgetStateJson}; },
          setState: function() {},
          getAssetUrl: function(path) { return path; },
          log: function() {},
          onMount: function(cb) { setTimeout(function() { cb({ state: ${widgetStateJson} }); }, 0); },
        };
      </script>
    `;

    // Wrap in full HTML document
    if (html.includes('<html>') || html.includes('<!DOCTYPE')) {
      return html.replace('<head>', `<head>${apiScript}`);
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background: #1e1b4b;
              color: white;
              font-family: system-ui, sans-serif;
              width: ${pixelWidth}px;
              height: ${pixelHeight}px;
              overflow: hidden;
            }
          </style>
          ${apiScript}
        </head>
        <body>${html}</body>
      </html>
    `;
  }, [widgetId, widgetDefId, widgetMetadataSource, widgetGeneratedHtml, widgetStateJson, pixelWidth, pixelHeight]);

  // Setup offscreen container with direct HTML (not iframe - html2canvas can't capture iframes)
  useEffect(() => {
    if (!widgetHtml) {
      console.log('[VRWidgetTexture] No widget HTML for:', widget.widgetDefId);
      setIsLoading(false);
      return;
    }

    console.log('[VRWidgetTexture] Setting up container for:', widget.widgetDefId);

    const container = offscreenManager.createContainer(widget.id, pixelWidth, pixelHeight);
    containerRef.current = container;

    // Extract just the body content and styles from the HTML
    // We render directly to a div instead of iframe for html2canvas compatibility
    let bodyContent = '';
    let styles = '';

    // Extract body content
    const bodyMatch = widgetHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    } else {
      bodyContent = widgetHtml;
    }

    // Extract style content
    const styleMatches = widgetHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    for (const match of styleMatches) {
      styles += match[1];
    }

    // Create style element - rewrite selectors to work in div context
    if (styles) {
      // Transform html/body selectors to target our container class
      // Widgets use html, body {} which won't match in a div context
      let transformedStyles = styles
        .replace(/\bhtml\s*,\s*body\b/gi, '.widget-content')
        .replace(/\bbody\s*\{/gi, '.widget-content {')
        .replace(/\bhtml\s*\{/gi, '.widget-content {');

      const styleEl = document.createElement('style');
      styleEl.textContent = transformedStyles;
      container.appendChild(styleEl);
    }

    // Make container visible for proper rendering
    container.style.visibility = 'visible';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';

    // CRITICAL: Inject mock WidgetAPI BEFORE adding content with scripts
    const state = { ...widget.state };
    const apiScript = document.createElement('script');
    apiScript.textContent = `
      window.WidgetAPI = {
        widgetId: '${widget.id}',
        widgetDefId: '${widget.widgetDefId}',
        emit: function() { console.log('[VR WidgetAPI] emit:', arguments); },
        emitEvent: function() { console.log('[VR WidgetAPI] emitEvent:', arguments); },
        emitOutput: function() { console.log('[VR WidgetAPI] emitOutput:', arguments); },
        onEvent: function() { return function() {}; },
        onInput: function() { return function() {}; },
        getState: function() { return ${JSON.stringify(state)}; },
        setState: function(patch) { console.log('[VR WidgetAPI] setState:', patch); },
        getAssetUrl: function(path) { return path; },
        log: function() { console.log('[VR Widget ${widget.widgetDefId}]', ...arguments); },
        onMount: function(cb) {
          console.log('[VR WidgetAPI] onMount registered');
          setTimeout(function() {
            console.log('[VR WidgetAPI] calling onMount callback');
            cb({ state: ${JSON.stringify(state)} });
          }, 50);
        },
        onStateChange: function() { return function() {}; },
        onDestroy: function() {},
      };
      console.log('[VR WidgetAPI] Injected for ${widget.widgetDefId}');
    `;
    container.appendChild(apiScript);

    // Create content wrapper - let widget define its own background
    const wrapper = document.createElement('div');
    wrapper.className = 'widget-content';
    wrapper.style.cssText = `
      width: ${pixelWidth}px;
      height: ${pixelHeight}px;
      overflow: hidden;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      box-sizing: border-box;
    `;
    container.appendChild(wrapper);

    // Strip script tags from content first, we'll execute them separately
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const scriptContents: string[] = [];
    let match;
    while ((match = scriptRegex.exec(bodyContent)) !== null) {
      scriptContents.push(match[1]);
    }
    const htmlWithoutScripts = bodyContent.replace(scriptRegex, '');
    wrapper.innerHTML = htmlWithoutScripts;

    // Execute widget scripts after DOM content is added
    scriptContents.forEach((scriptContent, idx) => {
      const newScript = document.createElement('script');
      newScript.textContent = scriptContent;
      container.appendChild(newScript);
      console.log('[VRWidgetTexture] Executed script', idx + 1, 'of', scriptContents.length);
    });

    // Capture function defined inline to avoid dependency issues
    const doCapture = async () => {
      const cont = containerRef.current;
      if (!cont || !isMountedRef.current) return;

      try {
        console.log('[VRWidgetTexture] Starting html2canvas capture');
        const canvas = await html2canvas(cont, {
          backgroundColor: '#1e1b4b',
          scale: 1,
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: pixelDimensionsRef.current.width,
          height: pixelDimensionsRef.current.height,
        });

        if (!isMountedRef.current) return;

        console.log('[VRWidgetTexture] Capture successful, creating texture');

        // Create or update texture
        if (textureRef.current) {
          textureRef.current.image = canvas;
          textureRef.current.needsUpdate = true;
        } else {
          const newTexture = new THREE.CanvasTexture(canvas);
          newTexture.minFilter = THREE.LinearFilter;
          newTexture.magFilter = THREE.LinearFilter;
          newTexture.colorSpace = THREE.SRGBColorSpace;
          textureRef.current = newTexture;
          setTexture(newTexture);
        }

        setIsLoading(false);
        setError(null);
        lastUpdateRef.current = Date.now();
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('[VRWidgetTexture] Capture failed:', err);
        setError(err instanceof Error ? err : new Error('Capture failed'));
        setIsLoading(false);
      }
    };

    // Give content time to render and scripts to execute, then capture
    // Use longer timeout for more complex widgets
    const captureTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('[VRWidgetTexture] Capturing texture for:', widget.widgetDefId, 'container:', containerRef.current?.innerHTML?.substring(0, 200));
        doCapture();
      }
    }, 1200);

    return () => {
      clearTimeout(captureTimeout);
      offscreenManager.removeContainer(widget.id);
      containerRef.current = null;
    };
  }, [widget.id, widgetHtml, pixelWidth, pixelHeight]);

  // Capture container to texture (for external calls and periodic refresh)
  const captureToTexture = useCallback(async () => {
    const container = containerRef.current;
    if (!container || !isMountedRef.current) return;

    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#1e1b4b',
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: pixelDimensionsRef.current.width,
        height: pixelDimensionsRef.current.height,
      });

      if (!isMountedRef.current) return;

      // Create or update texture
      if (textureRef.current) {
        textureRef.current.image = canvas;
        textureRef.current.needsUpdate = true;
      } else {
        const newTexture = new THREE.CanvasTexture(canvas);
        newTexture.minFilter = THREE.LinearFilter;
        newTexture.magFilter = THREE.LinearFilter;
        newTexture.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = newTexture;
        setTexture(newTexture);
      }

      setIsLoading(false);
      setError(null);
      lastUpdateRef.current = Date.now();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('[VRWidgetTexture] Capture failed:', err);
      setError(err instanceof Error ? err : new Error('Capture failed'));
      setIsLoading(false);
    }
  }, []);

  // Periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0 || !containerRef.current) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current >= Math.max(refreshInterval, MIN_REFRESH_INTERVAL)) {
        captureToTexture();
      }
    }, Math.max(refreshInterval, MIN_REFRESH_INTERVAL));

    return () => clearInterval(interval);
  }, [refreshInterval, captureToTexture]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, []);

  return { texture, isLoading, error, refresh: captureToTexture, hasHtml: !!widgetHtml };
}

// ============================================================================
// VR Widget Texture Component
// ============================================================================

export function VRWidgetTexture({
  widget,
  width,
  height,
  refreshInterval = 1000, // Update every second by default
  onError,
}: VRWidgetTextureProps) {
  // Calculate pixel dimensions (higher res for VR readability)
  const resolutionScale = getWidgetResolutionScale(widget.width, widget.height);
  const pixelWidth = Math.round(widget.width * resolutionScale);
  const pixelHeight = Math.round(widget.height * resolutionScale);

  const { texture, isLoading, error, hasHtml } = useWidgetTexture(
    widget,
    pixelWidth,
    pixelHeight,
    refreshInterval
  );

  // Report errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // If no HTML content (React component widget), return null
  // The parent should handle this case
  if (!hasHtml) {
    return null;
  }

  // Loading state
  if (isLoading || !texture) {
    return (
      <mesh position={[0, 0, 0.01]} raycast={() => null}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#2d2a4a" transparent opacity={0.9} />
      </mesh>
    );
  }

  // Render textured plane - raycast disabled so parent widget mesh receives events
  return (
    <mesh position={[0, 0, 0.01]} raycast={() => null}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

// ============================================================================
// Hook: useReactWidgetTexture
// Renders React component widgets to a texture
// ============================================================================

function useReactWidgetTexture(
  widget: WidgetInstance,
  pixelWidth: number,
  pixelHeight: number,
  refreshInterval: number
) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastUpdateRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // Stable references to widget properties to prevent infinite loops
  const widgetId = widget.id;
  const widgetDefId = widget.widgetDefId;
  const widgetRef = useRef(widget);
  widgetRef.current = widget; // Keep ref updated without triggering re-renders

  // Memoize builtin lookup to prevent recalculation
  const builtin = useMemo(() => getBuiltinWidget(widgetDefId), [widgetDefId]);
  const hasComponent = !!builtin?.component;

  // Stable reference to widget state for comparison
  const stateJsonRef = useRef<string>('');
  const currentStateJson = useMemo(() => {
    try {
      return JSON.stringify(widget.state || {});
    } catch {
      return '{}';
    }
  }, [widget.state]);

  // Capture container to texture - defined first so it can be used in effects
  const captureToTexture = useCallback(async () => {
    const container = containerRef.current;
    if (!container || !isMountedRef.current) return;

    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#1e1b4b',
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: pixelWidth,
        height: pixelHeight,
      });

      if (!isMountedRef.current) return;

      // Create or update texture
      if (textureRef.current) {
        textureRef.current.image = canvas;
        textureRef.current.needsUpdate = true;
      } else {
        const newTexture = new THREE.CanvasTexture(canvas);
        newTexture.minFilter = THREE.LinearFilter;
        newTexture.magFilter = THREE.LinearFilter;
        newTexture.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = newTexture;
        setTexture(newTexture);
      }

      setIsLoading(false);
      setError(null);
      lastUpdateRef.current = Date.now();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('[VRWidgetTexture] React component capture failed:', err);
      setError(err instanceof Error ? err : new Error('Capture failed'));
      setIsLoading(false);
    }
  }, [pixelWidth, pixelHeight]);

  // Setup offscreen container with React component - runs once
  useEffect(() => {
    if (!hasComponent || !builtin?.component || hasInitializedRef.current) {
      if (!hasComponent) setIsLoading(false);
      return;
    }

    hasInitializedRef.current = true;

    // Create offscreen container
    const container = offscreenManager.createContainer(
      `react-${widgetId}`,
      pixelWidth,
      pixelHeight
    );
    containerRef.current = container;

    // Add Tailwind-compatible base styles and ensure visibility for html2canvas
    container.style.cssText += `
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      visibility: visible;
    `;

    // Create a wrapper div for the React component
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
    `;
    container.appendChild(wrapper);

    // Create React root and render component
    const Component = builtin.component as React.ComponentType<{ api?: any }>;
    const api = createSpatial3DAPI(widgetRef.current);

    console.log('[VRReactWidgetTexture] Rendering React component:', widgetDefId);

    rootRef.current = createRoot(wrapper);
    rootRef.current.render(
      React.createElement(Component, { api })
    );

    stateJsonRef.current = currentStateJson;

    // Give component time to render, then capture (longer for React components)
    const captureTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('[VRReactWidgetTexture] Capturing:', widgetDefId);
        captureToTexture();
      }
    }, 1500);

    return () => {
      clearTimeout(captureTimeout);
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
      offscreenManager.removeContainer(`react-${widgetId}`);
      containerRef.current = null;
      hasInitializedRef.current = false;
    };
  }, [widgetId, widgetDefId, hasComponent, pixelWidth, pixelHeight, builtin, captureToTexture, currentStateJson]);

  // Re-render when widget state actually changes (deep comparison)
  useEffect(() => {
    // Skip if not initialized or state hasn't changed
    if (!hasComponent || !builtin?.component || !rootRef.current) return;
    if (stateJsonRef.current === currentStateJson) return;

    stateJsonRef.current = currentStateJson;

    const Component = builtin.component as React.ComponentType<{ api?: any }>;
    const api = createSpatial3DAPI(widgetRef.current);

    rootRef.current.render(
      React.createElement(Component, { api })
    );

    // Recapture after state update
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        captureToTexture();
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [currentStateJson, hasComponent, builtin, captureToTexture]);

  // Periodic refresh - only after initial render
  useEffect(() => {
    if (refreshInterval <= 0 || !hasComponent || isLoading) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current >= Math.max(refreshInterval, MIN_REFRESH_INTERVAL)) {
        captureToTexture();
      }
    }, Math.max(refreshInterval, MIN_REFRESH_INTERVAL));

    return () => clearInterval(interval);
  }, [refreshInterval, captureToTexture, hasComponent, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, []);

  return { texture, isLoading, error, refresh: captureToTexture, hasComponent };
}

// ============================================================================
// React Component Widget Texture (for widgets with React components)
// ============================================================================

interface VRReactWidgetTextureProps {
  widget: WidgetInstance;
  width: number;
  height: number;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

export function VRReactWidgetTexture({
  widget,
  width,
  height,
  refreshInterval = 2000,
  onError,
}: VRReactWidgetTextureProps) {
  const resolutionScale = getWidgetResolutionScale(widget.width, widget.height);
  const pixelWidth = Math.round(widget.width * resolutionScale);
  const pixelHeight = Math.round(widget.height * resolutionScale);

  const { texture, isLoading, error, hasComponent } = useReactWidgetTexture(
    widget,
    pixelWidth,
    pixelHeight,
    refreshInterval
  );

  // Report errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  if (!hasComponent) {
    return null;
  }

  // Loading state
  if (isLoading || !texture) {
    return (
      <mesh position={[0, 0, 0.01]} raycast={() => null}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#2d2a4a" transparent opacity={0.9} />
      </mesh>
    );
  }

  // Render textured plane - raycast disabled so parent widget mesh receives events
  return (
    <mesh position={[0, 0, 0.01]} raycast={() => null}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

export default VRWidgetTexture;
