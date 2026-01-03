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
      this.hostElement.style.cssText = `
        position: fixed;
        left: -9999px;
        top: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
        pointer-events: none;
        visibility: hidden;
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

  // Create widget HTML content
  const widgetHtml = useMemo(() => {
    const builtin = getBuiltinWidget(widget.widgetDefId);

    // For React components, we can't easily render to texture
    // Return null to signal we need a different approach
    if (builtin?.component) {
      return null;
    }

    const html = getWidgetHtml(widget);
    if (!html) return null;

    // Inject widget API mock
    const state = { ...widget.state };
    const apiScript = `
      <script>
        window.WidgetAPI = {
          widgetId: '${widget.id}',
          widgetDefId: '${widget.widgetDefId}',
          emit: function() {},
          emitEvent: function() {},
          emitOutput: function() {},
          onEvent: function() { return function() {}; },
          onInput: function() { return function() {}; },
          getState: function() { return ${JSON.stringify(state)}; },
          setState: function() {},
          getAssetUrl: function(path) { return path; },
          log: function() {},
          onMount: function(cb) { setTimeout(function() { cb({ state: ${JSON.stringify(state)} }); }, 0); },
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
  }, [widget, pixelWidth, pixelHeight]);

  // Setup offscreen container with iframe
  useEffect(() => {
    if (!widgetHtml) {
      setIsLoading(false);
      return;
    }

    const container = offscreenManager.createContainer(widget.id, pixelWidth, pixelHeight);
    containerRef.current = container;

    // Create iframe for widget content
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
    `;
    iframe.sandbox.add('allow-scripts', 'allow-same-origin');
    container.appendChild(iframe);

    // Write content to iframe
    iframe.srcdoc = widgetHtml;

    // Wait for iframe to load then capture
    iframe.onload = () => {
      if (!isMountedRef.current) return;

      // Give content time to render
      setTimeout(() => {
        if (!isMountedRef.current) return;
        captureToTexture();
      }, 500);
    };

    return () => {
      offscreenManager.removeContainer(widget.id);
      containerRef.current = null;
    };
  }, [widget.id, widgetHtml, pixelWidth, pixelHeight]);

  // Capture container to texture
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
      console.error('[VRWidgetTexture] Capture failed:', err);
      setError(err instanceof Error ? err : new Error('Capture failed'));
      setIsLoading(false);
    }
  }, [pixelWidth, pixelHeight]);

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
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#2d2a4a" transparent opacity={0.9} />
      </mesh>
    );
  }

  // Render textured plane
  return (
    <mesh position={[0, 0, 0.01]}>
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

  const builtin = getBuiltinWidget(widget.widgetDefId);
  const hasComponent = !!builtin?.component;

  // Setup offscreen container with React component
  useEffect(() => {
    if (!hasComponent || !builtin?.component) {
      setIsLoading(false);
      return;
    }

    // Create offscreen container
    const container = offscreenManager.createContainer(
      `react-${widget.id}`,
      pixelWidth,
      pixelHeight
    );
    containerRef.current = container;

    // Add Tailwind-compatible base styles
    container.style.cssText += `
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // Create a wrapper div for the React component
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;
    container.appendChild(wrapper);

    // Create React root and render component
    const Component = builtin.component as React.ComponentType<{ api?: any }>;
    const api = createSpatial3DAPI(widget);

    rootRef.current = createRoot(wrapper);
    rootRef.current.render(
      React.createElement(Component, { api })
    );

    // Give component time to render, then capture
    const captureTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        captureToTexture();
      }
    }, 800);

    return () => {
      clearTimeout(captureTimeout);
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
      offscreenManager.removeContainer(`react-${widget.id}`);
      containerRef.current = null;
    };
  }, [widget.id, widget.widgetDefId, hasComponent, pixelWidth, pixelHeight]);

  // Re-render when widget state changes
  useEffect(() => {
    if (!hasComponent || !builtin?.component || !rootRef.current) return;

    const Component = builtin.component as React.ComponentType<{ api?: any }>;
    const api = createSpatial3DAPI(widget);

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
  }, [widget.state]);

  // Capture container to texture
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

  // Periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0 || !containerRef.current || !hasComponent) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current >= Math.max(refreshInterval, MIN_REFRESH_INTERVAL)) {
        captureToTexture();
      }
    }, Math.max(refreshInterval, MIN_REFRESH_INTERVAL));

    return () => clearInterval(interval);
  }, [refreshInterval, captureToTexture, hasComponent]);

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
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#2d2a4a" transparent opacity={0.9} />
      </mesh>
    );
  }

  // Render textured plane
  return (
    <mesh position={[0, 0, 0.01]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

export default VRWidgetTexture;
