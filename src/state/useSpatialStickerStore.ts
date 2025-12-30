/**
 * StickerNest - Spatial Sticker Store (Zustand)
 *
 * State management for spatial stickers in VR/AR modes.
 * Handles 3D positioning, anchoring, and QR code associations.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import {
  SpatialSticker,
  SpatialTransform,
  SpatialAnchor,
  RegisteredQRCode,
  SpatialSceneConfig,
  DEFAULT_SPATIAL_SCENE_CONFIG,
  createSpatialSticker,
  createQRAnchoredSticker,
  createSurfaceAnchoredSticker,
} from '../types/spatialEntity';

// ============================================================================
// Types
// ============================================================================

/** Detected QR code with position in world space */
export interface DetectedQRCode {
  content: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  confidence: number;
  lastSeen: number;
}

/** Persistent XR anchor data (loaded/saved from storage) */
export interface PersistentAnchorData {
  handle: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  label?: string;
  createdAt: number;
}

export interface SpatialStickerState {
  // Spatial stickers
  spatialStickers: Map<string, SpatialSticker>;

  // Registered QR codes
  registeredQRCodes: Map<string, RegisteredQRCode>;

  // Detected QR codes (runtime state, not persisted)
  detectedQRCodes: Map<string, DetectedQRCode>;

  // Persistent XR anchors
  persistentAnchors: Map<string, PersistentAnchorData>;

  // Scene configuration
  sceneConfig: SpatialSceneConfig;

  // Selection
  selectedSpatialStickerId: string | null;

  // UI state
  isPlacementMode: boolean;
  placementStickerType: 'image' | '3d-model' | '3d-primitive' | null;

  // Debug
  showDebugInfo: boolean;
}

export interface SpatialStickerActions {
  // Spatial Sticker CRUD
  addSpatialSticker: (sticker: SpatialSticker) => void;
  updateSpatialSticker: (id: string, updates: Partial<SpatialSticker>) => void;
  removeSpatialSticker: (id: string) => void;
  getSpatialSticker: (id: string) => SpatialSticker | undefined;
  getSpatialStickers: () => SpatialSticker[];
  getSpatialStickersByCanvas: (canvasId: string) => SpatialSticker[];

  // Spatial Transform
  setSpatialTransform: (id: string, transform: SpatialTransform) => void;
  updateSpatialPosition: (id: string, position: { x: number; y: number; z: number }) => void;
  updateSpatialRotation: (id: string, rotation: { x: number; y: number; z: number }) => void;
  updateSpatialScale: (id: string, scale: { x: number; y: number; z: number }) => void;

  // Anchoring
  setAnchor: (stickerId: string, anchor: SpatialAnchor) => void;
  clearAnchor: (stickerId: string) => void;

  // QR Code Registration
  registerQRCode: (qrCode: RegisteredQRCode) => void;
  unregisterQRCode: (qrContent: string) => void;
  getRegisteredQRCode: (qrContent: string) => RegisteredQRCode | undefined;
  attachStickerToQR: (stickerId: string, qrContent: string) => void;
  detachStickerFromQR: (stickerId: string) => void;

  // QR Code Detection (runtime)
  updateDetectedQRCode: (code: DetectedQRCode) => void;
  clearDetectedQRCodes: () => void;
  pruneOldDetections: (maxAgeMs: number) => void;

  // Persistent Anchors
  savePersistentAnchor: (data: PersistentAnchorData) => void;
  removePersistentAnchor: (handle: string) => void;
  getPersistentAnchor: (handle: string) => PersistentAnchorData | undefined;

  // Scene Configuration
  updateSceneConfig: (updates: Partial<SpatialSceneConfig>) => void;
  resetSceneConfig: () => void;

  // Selection
  selectSpatialSticker: (id: string | null) => void;

  // Placement Mode
  enterPlacementMode: (stickerType: 'image' | '3d-model' | '3d-primitive') => void;
  exitPlacementMode: () => void;

  // Debug
  setShowDebugInfo: (show: boolean) => void;

  // Factory functions
  createImageSticker: (canvasId: string, name: string, imageSrc: string) => SpatialSticker;
  createModelSticker: (canvasId: string, name: string, modelUrl: string) => SpatialSticker;
  createPrimitiveSticker: (
    canvasId: string,
    name: string,
    primitiveType: 'cube' | 'sphere' | 'cylinder'
  ) => SpatialSticker;
  createQRLinkedSticker: (canvasId: string, name: string, qrContent: string) => SpatialSticker;
  createSurfaceSticker: (
    canvasId: string,
    name: string,
    surfaceType: 'floor' | 'wall' | 'table'
  ) => SpatialSticker;

  // Bulk operations
  clearSpatialStickers: (canvasId: string) => void;

  // Serialization
  exportSpatialStickers: (canvasId: string) => {
    stickers: SpatialSticker[];
    qrCodes: RegisteredQRCode[];
  };
  importSpatialStickers: (data: {
    stickers: SpatialSticker[];
    qrCodes: RegisteredQRCode[];
  }) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: SpatialStickerState = {
  spatialStickers: new Map(),
  registeredQRCodes: new Map(),
  detectedQRCodes: new Map(),
  persistentAnchors: new Map(),
  sceneConfig: { ...DEFAULT_SPATIAL_SCENE_CONFIG },
  selectedSpatialStickerId: null,
  isPlacementMode: false,
  placementStickerType: null,
  showDebugInfo: false,
};

// ============================================================================
// JSON Serialization Helpers
// ============================================================================

const jsonReviver = (_key: string, value: unknown) => {
  if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Map') {
    return new Map((value as { entries: [string, unknown][] }).entries);
  }
  return value;
};

const jsonReplacer = (_key: string, value: unknown) => {
  if (value instanceof Map) {
    return { __type: 'Map', entries: Array.from(value.entries()) };
  }
  return value;
};

// ============================================================================
// Store
// ============================================================================

export const useSpatialStickerStore = create<SpatialStickerState & SpatialStickerActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================
        // Spatial Sticker CRUD
        // ==================

        addSpatialSticker: (sticker) => {
          set((state) => {
            const spatialStickers = new Map(state.spatialStickers);
            spatialStickers.set(sticker.id, sticker);
            return { spatialStickers };
          });
        },

        updateSpatialSticker: (id, updates) => {
          set((state) => {
            const spatialStickers = new Map(state.spatialStickers);
            const existing = spatialStickers.get(id);
            if (existing) {
              spatialStickers.set(id, {
                ...existing,
                ...updates,
                updatedAt: Date.now(),
              });
            }
            return { spatialStickers };
          });
        },

        removeSpatialSticker: (id) => {
          set((state) => {
            const spatialStickers = new Map(state.spatialStickers);
            spatialStickers.delete(id);
            return { spatialStickers };
          });
        },

        getSpatialSticker: (id) => get().spatialStickers.get(id),

        getSpatialStickers: () => Array.from(get().spatialStickers.values()),

        getSpatialStickersByCanvas: (canvasId) =>
          Array.from(get().spatialStickers.values()).filter((s) => s.canvasId === canvasId),

        // ==================
        // Spatial Transform
        // ==================

        setSpatialTransform: (id, transform) => {
          get().updateSpatialSticker(id, { transform3D: transform });
        },

        updateSpatialPosition: (id, position) => {
          const sticker = get().getSpatialSticker(id);
          if (sticker) {
            get().updateSpatialSticker(id, {
              transform3D: {
                ...sticker.transform3D,
                position,
              },
            });
          }
        },

        updateSpatialRotation: (id, rotation) => {
          const sticker = get().getSpatialSticker(id);
          if (sticker) {
            get().updateSpatialSticker(id, {
              transform3D: {
                ...sticker.transform3D,
                rotation,
              },
            });
          }
        },

        updateSpatialScale: (id, scale) => {
          const sticker = get().getSpatialSticker(id);
          if (sticker) {
            get().updateSpatialSticker(id, {
              transform3D: {
                ...sticker.transform3D,
                scale,
              },
            });
          }
        },

        // ==================
        // Anchoring
        // ==================

        setAnchor: (stickerId, anchor) => {
          get().updateSpatialSticker(stickerId, { anchor });
        },

        clearAnchor: (stickerId) => {
          get().updateSpatialSticker(stickerId, {
            anchor: {
              type: 'none',
              worldPosition: { x: 0, y: 1.5, z: -1 },
              worldRotation: { x: 0, y: 0, z: 0 },
            },
          });
        },

        // ==================
        // QR Code Registration
        // ==================

        registerQRCode: (qrCode) => {
          set((state) => {
            const registeredQRCodes = new Map(state.registeredQRCodes);
            registeredQRCodes.set(qrCode.content, qrCode);
            return { registeredQRCodes };
          });
        },

        unregisterQRCode: (qrContent) => {
          set((state) => {
            const registeredQRCodes = new Map(state.registeredQRCodes);
            registeredQRCodes.delete(qrContent);
            return { registeredQRCodes };
          });
        },

        getRegisteredQRCode: (qrContent) => get().registeredQRCodes.get(qrContent),

        attachStickerToQR: (stickerId, qrContent) => {
          const qr = get().getRegisteredQRCode(qrContent);
          if (qr) {
            set((state) => {
              const registeredQRCodes = new Map(state.registeredQRCodes);
              registeredQRCodes.set(qrContent, {
                ...qr,
                attachedStickerIds: [...qr.attachedStickerIds, stickerId],
              });
              return { registeredQRCodes };
            });
          }
        },

        detachStickerFromQR: (stickerId) => {
          set((state) => {
            const registeredQRCodes = new Map(state.registeredQRCodes);
            for (const [content, qr] of registeredQRCodes) {
              if (qr.attachedStickerIds.includes(stickerId)) {
                registeredQRCodes.set(content, {
                  ...qr,
                  attachedStickerIds: qr.attachedStickerIds.filter((id) => id !== stickerId),
                });
              }
            }
            return { registeredQRCodes };
          });
        },

        // ==================
        // QR Code Detection (Runtime)
        // ==================

        updateDetectedQRCode: (code) => {
          set((state) => {
            const detectedQRCodes = new Map(state.detectedQRCodes);
            detectedQRCodes.set(code.content, code);
            return { detectedQRCodes };
          });
        },

        clearDetectedQRCodes: () => {
          set({ detectedQRCodes: new Map() });
        },

        pruneOldDetections: (maxAgeMs) => {
          const now = Date.now();
          set((state) => {
            const detectedQRCodes = new Map(state.detectedQRCodes);
            for (const [content, code] of detectedQRCodes) {
              if (now - code.lastSeen > maxAgeMs) {
                detectedQRCodes.delete(content);
              }
            }
            return { detectedQRCodes };
          });
        },

        // ==================
        // Persistent Anchors
        // ==================

        savePersistentAnchor: (data) => {
          set((state) => {
            const persistentAnchors = new Map(state.persistentAnchors);
            persistentAnchors.set(data.handle, data);
            return { persistentAnchors };
          });
        },

        removePersistentAnchor: (handle) => {
          set((state) => {
            const persistentAnchors = new Map(state.persistentAnchors);
            persistentAnchors.delete(handle);
            return { persistentAnchors };
          });
        },

        getPersistentAnchor: (handle) => get().persistentAnchors.get(handle),

        // ==================
        // Scene Configuration
        // ==================

        updateSceneConfig: (updates) => {
          set((state) => ({
            sceneConfig: { ...state.sceneConfig, ...updates },
          }));
        },

        resetSceneConfig: () => {
          set({ sceneConfig: { ...DEFAULT_SPATIAL_SCENE_CONFIG } });
        },

        // ==================
        // Selection
        // ==================

        selectSpatialSticker: (id) => {
          set({ selectedSpatialStickerId: id });
        },

        // ==================
        // Placement Mode
        // ==================

        enterPlacementMode: (stickerType) => {
          set({ isPlacementMode: true, placementStickerType: stickerType });
        },

        exitPlacementMode: () => {
          set({ isPlacementMode: false, placementStickerType: null });
        },

        // ==================
        // Debug
        // ==================

        setShowDebugInfo: (show) => {
          set({ showDebugInfo: show });
        },

        // ==================
        // Factory Functions
        // ==================

        createImageSticker: (canvasId, name, imageSrc) => {
          const sticker = createSpatialSticker({
            canvasId,
            name,
            mediaType: 'image',
            mediaSrc: imageSrc,
          });
          get().addSpatialSticker(sticker);
          return sticker;
        },

        createModelSticker: (canvasId, name, modelUrl) => {
          const sticker = createSpatialSticker({
            canvasId,
            name,
            mediaType: '3d-model',
            mediaSrc: modelUrl,
            model3DConfig: {
              modelUrl,
              format: modelUrl.endsWith('.glb') ? 'glb' : 'gltf',
            },
          });
          get().addSpatialSticker(sticker);
          return sticker;
        },

        createPrimitiveSticker: (canvasId, name, primitiveType) => {
          const sticker = createSpatialSticker({
            canvasId,
            name,
            mediaType: '3d-primitive',
            mediaSrc: primitiveType,
            primitive3DConfig: {
              primitiveType,
              dimensions: { width: 0.2, height: 0.2, depth: 0.2 },
              material: {
                color: '#8b5cf6',
                metalness: 0.3,
                roughness: 0.4,
                opacity: 1,
              },
            },
          });
          get().addSpatialSticker(sticker);
          return sticker;
        },

        createQRLinkedSticker: (canvasId, name, qrContent) => {
          const sticker = createQRAnchoredSticker(canvasId, name, qrContent);
          get().addSpatialSticker(sticker);
          get().attachStickerToQR(sticker.id, qrContent);
          return sticker;
        },

        createSurfaceSticker: (canvasId, name, surfaceType) => {
          const sticker = createSurfaceAnchoredSticker(canvasId, name, surfaceType);
          get().addSpatialSticker(sticker);
          return sticker;
        },

        // ==================
        // Bulk Operations
        // ==================

        clearSpatialStickers: (canvasId) => {
          set((state) => {
            const spatialStickers = new Map(state.spatialStickers);
            for (const [id, sticker] of spatialStickers) {
              if (sticker.canvasId === canvasId) {
                spatialStickers.delete(id);
              }
            }
            return { spatialStickers };
          });
        },

        // ==================
        // Serialization
        // ==================

        exportSpatialStickers: (canvasId) => {
          const state = get();
          const stickers = Array.from(state.spatialStickers.values()).filter(
            (s) => s.canvasId === canvasId
          );
          const qrCodes = Array.from(state.registeredQRCodes.values());
          return { stickers, qrCodes };
        },

        importSpatialStickers: (data) => {
          set((state) => {
            const spatialStickers = new Map(state.spatialStickers);
            const registeredQRCodes = new Map(state.registeredQRCodes);

            data.stickers.forEach((s) => spatialStickers.set(s.id, s));
            data.qrCodes.forEach((qr) => registeredQRCodes.set(qr.content, qr));

            return { spatialStickers, registeredQRCodes };
          });
        },
      }),
      {
        name: 'stickernest-spatial-stickers',
        storage: createJSONStorage(() => localStorage, {
          reviver: jsonReviver,
          replacer: jsonReplacer,
        }),
        partialize: (state) => ({
          spatialStickers: state.spatialStickers,
          registeredQRCodes: state.registeredQRCodes,
          persistentAnchors: state.persistentAnchors,
          sceneConfig: state.sceneConfig,
        }),
      }
    ),
    { name: 'SpatialStickerStore', enabled: import.meta.env.DEV }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useSpatialStickers = () =>
  useSpatialStickerStore((state) => state.spatialStickers);

export const useSpatialStickersByCanvas = (canvasId: string) =>
  useSpatialStickerStore((state) => state.getSpatialStickersByCanvas(canvasId));

export const useSelectedSpatialSticker = () =>
  useSpatialStickerStore((state) =>
    state.selectedSpatialStickerId
      ? state.spatialStickers.get(state.selectedSpatialStickerId)
      : null
  );

export const useRegisteredQRCodes = () =>
  useSpatialStickerStore((state) => state.registeredQRCodes);

export const useDetectedQRCodes = () =>
  useSpatialStickerStore((state) => state.detectedQRCodes);

export const useSpatialSceneConfig = () =>
  useSpatialStickerStore((state) => state.sceneConfig);

export const useIsPlacementMode = () =>
  useSpatialStickerStore((state) => state.isPlacementMode);

export default useSpatialStickerStore;
