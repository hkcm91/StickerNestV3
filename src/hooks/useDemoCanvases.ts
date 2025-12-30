/**
 * StickerNest v2 - Demo Canvases Hook
 *
 * Manages which canvases are available for the landing page demo.
 * Admin can mark canvases as demo-eligible via DevPanel or localStorage.
 */

import { useState, useEffect, useCallback } from 'react';

// ==================
// Types
// ==================

export interface DemoCanvasItem {
  canvasId: string;
  label: string;
  description?: string;
}

interface DemoCanvasConfig {
  canvases: DemoCanvasItem[];
  defaultCanvasId?: string;
}

// ==================
// Storage Keys
// ==================

const STORAGE_KEY = 'sn_demo_canvases';
const CANVAS_PREFIX = 'stickernest-canvas-';
const CANVAS_INDEX_KEY = 'stickernest-canvas-index';

// ==================
// Default Demo Config
// ==================

const DEFAULT_CONFIG: DemoCanvasConfig = {
  canvases: [],
  defaultCanvasId: undefined,
};

// ==================
// Helper Functions
// ==================

function loadConfig(): DemoCanvasConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate config structure
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.canvases)) {
        return {
          canvases: parsed.canvases,
          defaultCanvasId: parsed.defaultCanvasId,
        };
      }
    }
  } catch (e) {
    console.error('[useDemoCanvases] Failed to load config:', e);
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: DemoCanvasConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('[useDemoCanvases] Failed to save config:', e);
  }
}

// ==================
// Get All Available Canvases (for admin selection)
// ==================

export interface CanvasOption {
  id: string;
  name: string;
  widgetCount: number;
  isDemo: boolean;
}

export function getAllCanvasOptions(): CanvasOption[] {
  try {
    const indexStr = localStorage.getItem(CANVAS_INDEX_KEY);
    let index: string[] = [];
    if (indexStr) {
      const parsed = JSON.parse(indexStr);
      if (Array.isArray(parsed)) {
        index = parsed;
      }
    }
    const config = loadConfig();
    const demoIds = new Set(config.canvases.map(c => c.canvasId));

    const options: CanvasOption[] = [];

    for (const canvasId of index) {
      try {
        const data = localStorage.getItem(`${CANVAS_PREFIX}${canvasId}`);
        if (data) {
          const parsed = JSON.parse(data);
          options.push({
            id: canvasId,
            name: parsed.canvas?.name || canvasId,
            widgetCount: parsed.widgets?.length || 0,
            isDemo: demoIds.has(canvasId),
          });
        }
      } catch (e) {
        // Skip invalid canvas data
      }
    }

    return options;
  } catch (e) {
    console.error('[useDemoCanvases] Failed to get canvas options:', e);
    return [];
  }
}

// ==================
// Hook
// ==================

export function useDemoCanvases() {
  const [config, setConfig] = useState<DemoCanvasConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load config on mount
  useEffect(() => {
    setConfig(loadConfig());
    setIsLoaded(true);
  }, []);

  // Get demo canvases
  const demoCanvases = config.canvases;
  const defaultCanvasId = config.defaultCanvasId || config.canvases[0]?.canvasId;

  // Add a canvas to demo list
  const addDemoCanvas = useCallback((canvasId: string, label: string, description?: string) => {
    setConfig(prev => {
      // Don't add duplicates
      if (prev.canvases.some(c => c.canvasId === canvasId)) {
        return prev;
      }

      const newConfig: DemoCanvasConfig = {
        ...prev,
        canvases: [...prev.canvases, { canvasId, label, description }],
        defaultCanvasId: prev.defaultCanvasId || canvasId,
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Remove a canvas from demo list
  const removeDemoCanvas = useCallback((canvasId: string) => {
    setConfig(prev => {
      const newCanvases = prev.canvases.filter(c => c.canvasId !== canvasId);
      const newConfig: DemoCanvasConfig = {
        ...prev,
        canvases: newCanvases,
        defaultCanvasId: prev.defaultCanvasId === canvasId
          ? newCanvases[0]?.canvasId
          : prev.defaultCanvasId,
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Update a demo canvas label/description
  const updateDemoCanvas = useCallback((canvasId: string, updates: Partial<DemoCanvasItem>) => {
    setConfig(prev => {
      const newCanvases = prev.canvases.map(c =>
        c.canvasId === canvasId ? { ...c, ...updates } : c
      );
      const newConfig: DemoCanvasConfig = {
        ...prev,
        canvases: newCanvases,
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Set default canvas
  const setDefaultCanvas = useCallback((canvasId: string) => {
    setConfig(prev => {
      const newConfig: DemoCanvasConfig = {
        ...prev,
        defaultCanvasId: canvasId,
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Toggle canvas demo status
  const toggleDemoCanvas = useCallback((canvasId: string, label?: string) => {
    const isDemo = config.canvases.some(c => c.canvasId === canvasId);
    if (isDemo) {
      removeDemoCanvas(canvasId);
    } else {
      addDemoCanvas(canvasId, label || canvasId);
    }
  }, [config.canvases, addDemoCanvas, removeDemoCanvas]);

  // Check if canvas is in demo list
  const isDemoCanvas = useCallback((canvasId: string) => {
    return config.canvases.some(c => c.canvasId === canvasId);
  }, [config.canvases]);

  return {
    demoCanvases,
    defaultCanvasId,
    isLoaded,
    addDemoCanvas,
    removeDemoCanvas,
    updateDemoCanvas,
    setDefaultCanvas,
    toggleDemoCanvas,
    isDemoCanvas,
  };
}

// ==================
// Utility: Load canvas data by ID
// ==================

export interface LoadedCanvasData {
  canvas: {
    id: string;
    name: string;
    width: number;
    height: number;
    userId: string;
    visibility: string;
  };
  widgets: any[];
  pipelines: any[];
}

export function loadCanvasById(canvasId: string): LoadedCanvasData | null {
  try {
    const data = localStorage.getItem(`${CANVAS_PREFIX}${canvasId}`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[useDemoCanvases] Failed to load canvas:', e);
  }
  return null;
}
