/**
 * StickerNest v2 - Spatial/VR Demo Canvas Initialization
 *
 * Creates a pre-configured spatial canvas with 3D widgets and spatial stickers
 * demonstrating VR/AR capabilities: green screens, 3D objects, QR anchors, etc.
 */

import type { WidgetInstance } from '../types/domain';

// ==================
// Constants
// ==================

const SPATIAL_CANVAS_ID = 'spatial-vr-demo';
const CANVAS_PREFIX = 'stickernest-canvas-';
const CANVAS_INDEX_KEY = 'stickernest-canvas-index';
const DEMO_CONFIG_KEY = 'sn_demo_canvases';

// ==================
// Spatial Canvas Data
// ==================

const SPATIAL_CANVAS_DATA = {
  canvas: {
    id: SPATIAL_CANVAS_ID,
    userId: 'demo-creator',
    name: 'Spatial VR/AR Demo',
    slug: 'spatial-vr-demo',
    visibility: 'public' as const,
    createdAt: new Date().toISOString(),
    width: 1400,
    height: 900,
    hasPassword: false,
    description: 'Experience stickers in VR and AR! Green screens, 3D objects, and spatial anchors.',
    backgroundConfig: {
      type: 'gradient' as const,
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
    },
  },
  widgets: [
    // ========================================
    // HEADER - Title
    // ========================================
    {
      id: 'spatial-widget-title',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 40, y: 20 },
      sizePreset: 'lg' as const,
      width: 500,
      height: 70,
      rotation: 0,
      zIndex: 100,
      state: {
        text: 'Spatial VR/AR Demo',
        fontSize: 36,
        fontFamily: 'system-ui',
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#f8fafc',
      },
      visible: true,
      locked: false,
    },

    // Subtitle/Instructions
    {
      id: 'spatial-widget-subtitle',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 40, y: 85 },
      sizePreset: 'md' as const,
      width: 600,
      height: 40,
      rotation: 0,
      zIndex: 99,
      state: {
        text: 'Click the VR or AR button in the toolbar to enter immersive mode',
        fontSize: 14,
        fontFamily: 'system-ui',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#94a3b8',
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // INFO CARDS
    // ========================================

    // VR Mode Info Card
    {
      id: 'spatial-widget-vr-info',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 40, y: 150 },
      sizePreset: 'md' as const,
      width: 320,
      height: 180,
      rotation: 0,
      zIndex: 95,
      state: {
        text: '🥽 VR Mode\n\nFull virtual environment with green screen planes, 3D objects, and spatial audio.\n\nRequires VR headset or WebXR-compatible browser.',
        fontSize: 13,
        fontFamily: 'system-ui',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#e2e8f0',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        padding: 16,
        borderRadius: 12,
      },
      visible: true,
      locked: false,
    },

    // AR Mode Info Card
    {
      id: 'spatial-widget-ar-info',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 380, y: 150 },
      sizePreset: 'md' as const,
      width: 320,
      height: 180,
      rotation: 0,
      zIndex: 95,
      state: {
        text: '📱 AR Mode\n\nOverlay stickers on the real world using your phone camera.\n\nRequires AR-capable device (iOS/Android with ARCore/ARKit).',
        fontSize: 13,
        fontFamily: 'system-ui',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#e2e8f0',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        padding: 16,
        borderRadius: 12,
      },
      visible: true,
      locked: false,
    },

    // Desktop 3D Info Card
    {
      id: 'spatial-widget-desktop-info',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 720, y: 150 },
      sizePreset: 'md' as const,
      width: 320,
      height: 180,
      rotation: 0,
      zIndex: 95,
      state: {
        text: '🖥️ Desktop 3D\n\nView the 3D scene with mouse/keyboard controls. Orbit, pan, and zoom.\n\nNo special hardware required.',
        fontSize: 13,
        fontFamily: 'system-ui',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#e2e8f0',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        padding: 16,
        borderRadius: 12,
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // SPATIAL FEATURES SHOWCASE
    // ========================================

    // Green Screen Section Header
    {
      id: 'spatial-widget-greenscreen-header',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 40, y: 360 },
      sizePreset: 'sm' as const,
      width: 300,
      height: 30,
      rotation: 0,
      zIndex: 90,
      state: {
        text: '🟢 Green Screen Planes',
        fontSize: 18,
        fontFamily: 'system-ui',
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#22c55e',
      },
      visible: true,
      locked: false,
    },

    // Green Screen Description
    {
      id: 'spatial-widget-greenscreen-desc',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 40, y: 395 },
      sizePreset: 'sm' as const,
      width: 400,
      height: 60,
      rotation: 0,
      zIndex: 89,
      state: {
        text: 'Use chroma key planes for video production. Perfect for streaming backgrounds and virtual sets.',
        fontSize: 12,
        fontFamily: 'system-ui',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#94a3b8',
      },
      visible: true,
      locked: false,
    },

    // 3D Objects Section Header
    {
      id: 'spatial-widget-3d-header',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 500, y: 360 },
      sizePreset: 'sm' as const,
      width: 300,
      height: 30,
      rotation: 0,
      zIndex: 90,
      state: {
        text: '🎲 3D Primitives',
        fontSize: 18,
        fontFamily: 'system-ui',
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#8b5cf6',
      },
      visible: true,
      locked: false,
    },

    // 3D Objects Description
    {
      id: 'spatial-widget-3d-desc',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 500, y: 395 },
      sizePreset: 'sm' as const,
      width: 400,
      height: 60,
      rotation: 0,
      zIndex: 89,
      state: {
        text: 'Basic 3D shapes with customizable materials. Cubes, spheres, cylinders, and more.',
        fontSize: 12,
        fontFamily: 'system-ui',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#94a3b8',
      },
      visible: true,
      locked: false,
    },

    // QR Anchors Section Header
    {
      id: 'spatial-widget-qr-header',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 960, y: 360 },
      sizePreset: 'sm' as const,
      width: 300,
      height: 30,
      rotation: 0,
      zIndex: 90,
      state: {
        text: '📍 QR Code Anchors',
        fontSize: 18,
        fontFamily: 'system-ui',
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#f59e0b',
      },
      visible: true,
      locked: false,
    },

    // QR Anchors Description
    {
      id: 'spatial-widget-qr-desc',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 960, y: 395 },
      sizePreset: 'sm' as const,
      width: 400,
      height: 60,
      rotation: 0,
      zIndex: 89,
      state: {
        text: 'Attach 3D content to real-world QR codes. Content appears when the code is scanned.',
        fontSize: 12,
        fontFamily: 'system-ui',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#94a3b8',
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // FOOTER - Controls Info
    // ========================================
    {
      id: 'spatial-widget-controls',
      canvasId: SPATIAL_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 40, y: 800 },
      sizePreset: 'sm' as const,
      width: 1000,
      height: 80,
      rotation: 0,
      zIndex: 80,
      state: {
        text: 'Desktop Controls: Left-click drag to orbit • Right-click drag to pan • Scroll to zoom • WASD to move\nVR Controls: Point and click teleportation • Grip to grab objects • Trigger to interact',
        fontSize: 11,
        fontFamily: 'monospace',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#64748b',
      },
      visible: true,
      locked: false,
    },
  ] as WidgetInstance[],
};

// ==================
// Spatial Stickers (Lazy loaded)
// ==================

let stickersInitialized = false;

/**
 * Create demo spatial stickers - called lazily when canvas is opened
 * This function is exported so it can be called when needed
 */
export async function createDemoSpatialStickers(): Promise<void> {
  if (stickersInitialized) return;

  try {
    // Dynamic import to avoid loading Zustand at module init time
    const { useSpatialStickerStore } = await import('../state/useSpatialStickerStore');
    const { createPrimitiveSticker } = await import('../types/spatialEntity');

    const store = useSpatialStickerStore.getState();

    // Clear existing stickers for this canvas
    store.clearSpatialStickers(SPATIAL_CANVAS_ID);

    // Front Green Screen
    const frontGreenScreen = createPrimitiveSticker({
      name: 'Front Green Screen',
      primitiveType: 'plane',
      color: '#00FF00',
      canvasId: SPATIAL_CANVAS_ID,
      transform: {
        position: { x: 0, y: 1.5, z: -3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 4, y: 2.5, z: 1 },
      },
      visibleIn: { desktop: true, vr: true, ar: true },
    });
    store.addSpatialSticker(frontGreenScreen);

    // Left Blue Screen
    const leftBlueScreen = createPrimitiveSticker({
      name: 'Left Blue Screen',
      primitiveType: 'plane',
      color: '#0066FF',
      canvasId: SPATIAL_CANVAS_ID,
      transform: {
        position: { x: -3, y: 1.5, z: 0 },
        rotation: { x: 0, y: 90, z: 0 },
        scale: { x: 3, y: 2.5, z: 1 },
      },
      visibleIn: { desktop: true, vr: true, ar: false },
    });
    store.addSpatialSticker(leftBlueScreen);

    // Interactive Cube
    const interactiveCube = createPrimitiveSticker({
      name: 'Interactive Cube',
      primitiveType: 'box',
      color: '#8b5cf6',
      canvasId: SPATIAL_CANVAS_ID,
      transform: {
        position: { x: -1, y: 0.5, z: -1.5 },
        rotation: { x: 0, y: 45, z: 0 },
        scale: { x: 0.5, y: 0.5, z: 0.5 },
      },
      visibleIn: { desktop: true, vr: true, ar: true },
      clickBehavior: { type: 'emit-event', event: 'cube:clicked' },
    });
    store.addSpatialSticker(interactiveCube);

    // Floating Sphere
    const floatingSphere = createPrimitiveSticker({
      name: 'Floating Sphere',
      primitiveType: 'sphere',
      color: '#f59e0b',
      canvasId: SPATIAL_CANVAS_ID,
      transform: {
        position: { x: 1, y: 1.2, z: -1 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.3, y: 0.3, z: 0.3 },
      },
      visibleIn: { desktop: true, vr: true, ar: true },
    });
    store.addSpatialSticker(floatingSphere);

    // Floor Marker Cylinder
    const floorMarker = createPrimitiveSticker({
      name: 'Floor Marker',
      primitiveType: 'cylinder',
      color: '#22c55e',
      canvasId: SPATIAL_CANVAS_ID,
      transform: {
        position: { x: 0, y: 0.05, z: -1 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.5, y: 0.1, z: 0.5 },
      },
      visibleIn: { desktop: true, vr: true, ar: true },
    });
    store.addSpatialSticker(floorMarker);

    // Register a demo QR code
    store.registerQRCode({
      content: 'https://stickernest.com/spatial-demo',
      label: 'StickerNest Demo QR',
      sizeMeters: 0.15,
      attachedStickerIds: [],
      isActive: true,
      createdAt: Date.now(),
    });

    // Update scene config for VR
    store.updateSceneConfig({
      vrEnvironment: 'studio',
      enableShadows: true,
      enableOcclusion: true,
      showFloorGrid: true,
      ambientIntensity: 0.6,
    });

    stickersInitialized = true;
    console.log('[initSpatialCanvas] Created demo spatial stickers');
  } catch (error) {
    console.warn('[initSpatialCanvas] Could not create spatial stickers:', error);
  }
}

// ==================
// Storage Helpers
// ==================

function saveCanvas(): void {
  const key = CANVAS_PREFIX + SPATIAL_CANVAS_ID;
  localStorage.setItem(key, JSON.stringify(SPATIAL_CANVAS_DATA));
}

function updateCanvasIndex(): void {
  const indexStr = localStorage.getItem(CANVAS_INDEX_KEY);
  let index: string[] = [];
  try {
    if (indexStr) {
      const parsed = JSON.parse(indexStr);
      if (Array.isArray(parsed)) {
        index = parsed;
      }
    }
  } catch {
    index = [];
  }

  if (!index.includes(SPATIAL_CANVAS_ID)) {
    index.unshift(SPATIAL_CANVAS_ID);
    localStorage.setItem(CANVAS_INDEX_KEY, JSON.stringify(index));
  }
}

function registerAsDemoCanvas(): void {
  const demoStr = localStorage.getItem(DEMO_CONFIG_KEY);
  let config: { canvases: { canvasId: string; label: string; description?: string }[]; defaultCanvasId?: string } = {
    canvases: [],
    defaultCanvasId: undefined,
  };
  try {
    if (demoStr) {
      const parsed = JSON.parse(demoStr);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.canvases)) {
        config = parsed;
      }
    }
  } catch {
    // Use default config
  }

  // Check if already registered
  const alreadyRegistered = config.canvases.some(
    (c: { canvasId: string }) => c.canvasId === SPATIAL_CANVAS_ID
  );

  if (!alreadyRegistered) {
    config.canvases.unshift({
      canvasId: SPATIAL_CANVAS_ID,
      label: 'Spatial VR/AR Demo',
      description: 'Experience 3D stickers in VR and AR modes',
    });

    localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(config));
  }
}

function spatialCanvasExists(): boolean {
  const key = CANVAS_PREFIX + SPATIAL_CANVAS_ID;
  return localStorage.getItem(key) !== null;
}

// ==================
// Export Functions
// ==================

/**
 * Initialize the spatial/VR demo canvas if it doesn't exist
 * Note: Spatial stickers are created lazily via createDemoSpatialStickers()
 */
export function initSpatialCanvas(): void {
  // Guard against SSR/non-browser environments
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  const exists = spatialCanvasExists();

  if (!exists) {
    console.log('[initSpatialCanvas] Creating spatial VR/AR demo canvas...');
    saveCanvas();
    updateCanvasIndex();
    registerAsDemoCanvas();
    console.log('[initSpatialCanvas] Spatial canvas created and registered');
  } else {
    // Just ensure it's registered as a demo
    registerAsDemoCanvas();
    console.log('[initSpatialCanvas] Spatial canvas already exists, ensured registration');
  }
}

/**
 * Force reset the spatial canvas to default state
 */
export async function resetSpatialCanvas(): Promise<void> {
  // Guard against SSR/non-browser environments
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  console.log('[initSpatialCanvas] Resetting spatial canvas to defaults...');
  saveCanvas();
  updateCanvasIndex();
  registerAsDemoCanvas();
  stickersInitialized = false; // Reset flag so stickers can be recreated
  await createDemoSpatialStickers();
  console.log('[initSpatialCanvas] Spatial canvas reset complete');
}

/**
 * Get the spatial canvas ID for reference
 */
export function getSpatialCanvasId(): string {
  return SPATIAL_CANVAS_ID;
}
