/**
 * StickerNest v2 - useCanvasTab Hook
 * Manages loading and state for canvas tabs
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getCanvasManager, type CanvasData } from '../../../services/canvasManager';
import type { CanvasTabConfig, CanvasTabState } from '../types';

interface UseCanvasTabOptions {
  /** Tab configuration */
  config: CanvasTabConfig;
  /** Callback when password is required */
  onPasswordRequired?: () => void;
  /** Callback when canvas is loaded */
  onLoaded?: (data: CanvasData) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

interface UseCanvasTabReturn extends CanvasTabState {
  /** Reload the canvas */
  reload: () => Promise<void>;
  /** Submit password for protected canvas */
  submitPassword: (password: string) => Promise<boolean>;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Set pan offset */
  setPanOffset: (offset: { x: number; y: number }) => void;
  /** Reset view to default */
  resetView: () => void;
  /** Fit canvas to container */
  fitToView: () => void;
}

export function useCanvasTab(options: UseCanvasTabOptions): UseCanvasTabReturn {
  const { config, onPasswordRequired, onLoaded, onError } = options;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  // Load canvas data
  const loadCanvas = useCallback(async (password?: string) => {
    const identifier = config.slug || config.canvasId;
    if (!identifier) {
      setError('No canvas specified');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const manager = getCanvasManager('viewer');
      let result;

      // Load by slug or ID
      if (config.slug) {
        result = await manager.loadCanvasBySlug(config.slug, password || config.password);
      } else if (config.canvasId) {
        result = await manager.loadCanvas(config.canvasId, password || config.password);
      } else {
        throw new Error('No canvas identifier provided');
      }

      if (!result.success) {
        if (result.error === 'Password required') {
          setRequiresPassword(true);
          onPasswordRequired?.();
        } else if (result.error === 'Invalid password') {
          setError('Incorrect password');
        } else {
          setError(result.error || 'Failed to load canvas');
          onError?.(result.error || 'Failed to load canvas');
        }
        setIsLoading(false);
        return;
      }

      // Successfully loaded
      setCanvasData(result.data!);
      setRequiresPassword(false);
      onLoaded?.(result.data!);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load canvas';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [config.slug, config.canvasId, config.password, onPasswordRequired, onLoaded, onError]);

  // Initial load
  useEffect(() => {
    if (!hasLoadedRef.current && (config.slug || config.canvasId)) {
      hasLoadedRef.current = true;
      loadCanvas();
    }
  }, [config.slug, config.canvasId, loadCanvas]);

  // Reload when config changes
  useEffect(() => {
    if (hasLoadedRef.current) {
      loadCanvas();
    }
  }, [config.slug, config.canvasId]);

  // Submit password
  const submitPassword = useCallback(async (password: string): Promise<boolean> => {
    await loadCanvas(password);
    return !requiresPassword && !error;
  }, [loadCanvas, requiresPassword, error]);

  // Reload canvas
  const reload = useCallback(async () => {
    hasLoadedRef.current = false;
    setCanvasData(null);
    await loadCanvas();
  }, [loadCanvas]);

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Fit to view (placeholder - actual implementation depends on container size)
  const fitToView = useCallback(() => {
    // This will be implemented by the CanvasTab component
    // which has access to container dimensions
    resetView();
  }, [resetView]);

  return {
    // State
    isLoading,
    error,
    requiresPassword,
    canvasData,
    zoom,
    panOffset,

    // Actions
    reload,
    submitPassword,
    setZoom,
    setPanOffset,
    resetView,
    fitToView,
  };
}

export default useCanvasTab;
