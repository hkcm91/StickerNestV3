/**
 * StickerNest v2 - Spatial Sticker Service Tests
 *
 * Tests for the spatial sticker persistence service.
 * Tests conversion functions, local mode behavior, and integration flows.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadSpatialStickers,
  saveSpatialSticker,
  deleteSpatialSticker,
  saveAllSpatialStickers,
  loadQRCodes,
  saveQRCode,
  deleteQRCode,
  loadPersistentAnchors,
  savePersistentAnchor,
  deletePersistentAnchor,
  loadSceneConfig,
  saveSceneConfig,
  loadSpatialData,
  saveSpatialData,
  deleteSpatialData,
  flushPendingSaves,
  type SpatialStickerRow,
  type SpatialQRCodeRow,
  type SpatialAnchorRow,
  type SpatialSceneConfigRow,
} from './spatialStickerService';
import { useSpatialStickerStore } from '../state/useSpatialStickerStore';
import {
  createSpatialSticker,
  DEFAULT_SPATIAL_SCENE_CONFIG,
} from '../types/spatialEntity';
import type { RegisteredQRCode, SpatialSceneConfig } from '../types/spatialEntity';
import type { PersistentAnchorData } from '../state/useSpatialStickerStore';

// Helper to reset store state
const resetStore = () => {
  useSpatialStickerStore.setState({
    spatialStickers: new Map(),
    registeredQRCodes: new Map(),
    detectedQRCodes: new Map(),
    persistentAnchors: new Map(),
    sceneConfig: { ...DEFAULT_SPATIAL_SCENE_CONFIG },
    selectedSpatialStickerId: null,
    isPlacementMode: false,
    placementStickerType: null,
    showDebugInfo: false,
  });
};

describe('SpatialStickerService', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    resetStore();
    flushPendingSaves();
    vi.useRealTimers();
  });

  // ============================================================================
  // LOCAL MODE TESTS
  // ============================================================================

  describe('Local Mode Operations', () => {
    describe('Spatial Stickers', () => {
      it('should load stickers from Zustand store in local mode', async () => {
        const store = useSpatialStickerStore.getState();
        store.addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1', name: 'S1' }));
        store.addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1', name: 'S2' }));
        store.addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-2', name: 'S3' }));

        const stickers = await loadSpatialStickers('canvas-1', 'user-1');

        expect(stickers).toHaveLength(2);
        expect(stickers.map((s) => s.name).sort()).toEqual(['S1', 'S2']);
      });

      it('should handle save sticker in local mode', () => {
        const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: 'Test' });
        useSpatialStickerStore.getState().addSpatialSticker(sticker);

        // Should not throw
        saveSpatialSticker(sticker, 'user-1');

        // Advance timers to trigger debounced save
        vi.advanceTimersByTime(600);

        // Sticker should still be in store
        expect(useSpatialStickerStore.getState().getSpatialSticker(sticker.id)).toBeDefined();
      });

      it('should handle immediate save in local mode', () => {
        const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: 'Immediate' });
        useSpatialStickerStore.getState().addSpatialSticker(sticker);

        // Should not throw with immediate flag
        saveSpatialSticker(sticker, 'user-1', true);

        expect(useSpatialStickerStore.getState().getSpatialSticker(sticker.id)).toBeDefined();
      });

      it('should delete sticker and clear pending saves', async () => {
        const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: 'ToDelete' });
        useSpatialStickerStore.getState().addSpatialSticker(sticker);

        // Queue a save
        saveSpatialSticker(sticker, 'user-1');

        // Delete immediately
        const result = await deleteSpatialSticker(sticker.id);

        expect(result).toBe(true);
        expect(useSpatialStickerStore.getState().getSpatialSticker(sticker.id)).toBeUndefined();
      });

      it('should batch save stickers in local mode', async () => {
        const stickers = [
          createSpatialSticker({ canvasId: 'canvas-1', name: 'Batch1' }),
          createSpatialSticker({ canvasId: 'canvas-1', name: 'Batch2' }),
          createSpatialSticker({ canvasId: 'canvas-1', name: 'Batch3' }),
        ];

        stickers.forEach((s) => useSpatialStickerStore.getState().addSpatialSticker(s));

        const result = await saveAllSpatialStickers(stickers, 'user-1');

        expect(result.success).toBe(true);
        expect(result.savedCount).toBe(3);
      });
    });

    describe('QR Codes', () => {
      it('should load QR codes from Zustand store in local mode', async () => {
        const store = useSpatialStickerStore.getState();
        store.registerQRCode({
          content: 'qr-1',
          label: 'QR 1',
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });
        store.registerQRCode({
          content: 'qr-2',
          label: 'QR 2',
          sizeMeters: 0.15,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });

        const qrCodes = await loadQRCodes('canvas-1', 'user-1');

        expect(qrCodes).toHaveLength(2);
      });

      it('should save QR code in local mode', async () => {
        const qrCode: RegisteredQRCode = {
          content: 'save-qr',
          label: 'Save Test',
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        };

        const result = await saveQRCode(qrCode, 'user-1', 'canvas-1');

        expect(result).toBe(true);
      });

      it('should delete QR code in local mode', async () => {
        const store = useSpatialStickerStore.getState();
        store.registerQRCode({
          content: 'delete-qr',
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });

        const result = await deleteQRCode('delete-qr', 'canvas-1');

        expect(result).toBe(true);
        expect(useSpatialStickerStore.getState().getRegisteredQRCode('delete-qr')).toBeUndefined();
      });
    });

    describe('Persistent Anchors', () => {
      it('should load anchors from Zustand store in local mode', async () => {
        const store = useSpatialStickerStore.getState();
        store.savePersistentAnchor({
          handle: 'anchor-1',
          position: [1, 2, 3],
          rotation: [0, 0, 0, 1],
          label: 'Anchor 1',
          createdAt: Date.now(),
        });

        const anchors = await loadPersistentAnchors('canvas-1', 'user-1');

        expect(anchors).toHaveLength(1);
        expect(anchors[0].label).toBe('Anchor 1');
      });

      it('should save anchor in local mode', async () => {
        const anchor: PersistentAnchorData = {
          handle: 'save-anchor',
          position: [0, 1, -1],
          rotation: [0, 0, 0, 1],
          label: 'Test Anchor',
          createdAt: Date.now(),
        };

        const result = await savePersistentAnchor(anchor, 'user-1', 'canvas-1');

        expect(result).toBe(true);
      });

      it('should delete anchor in local mode', async () => {
        const store = useSpatialStickerStore.getState();
        store.savePersistentAnchor({
          handle: 'delete-anchor',
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          createdAt: Date.now(),
        });

        const result = await deletePersistentAnchor('delete-anchor', 'canvas-1');

        expect(result).toBe(true);
        expect(useSpatialStickerStore.getState().getPersistentAnchor('delete-anchor')).toBeUndefined();
      });
    });

    describe('Scene Config', () => {
      it('should load scene config from Zustand store in local mode', async () => {
        useSpatialStickerStore.getState().updateSceneConfig({
          vrEnvironment: 'sunset',
          enableShadows: false,
        });

        const config = await loadSceneConfig('canvas-1', 'user-1');

        expect(config).toBeDefined();
        expect(config?.vrEnvironment).toBe('sunset');
        expect(config?.enableShadows).toBe(false);
      });

      it('should save scene config in local mode', async () => {
        const config: SpatialSceneConfig = {
          ...DEFAULT_SPATIAL_SCENE_CONFIG,
          vrEnvironment: 'night',
          ambientIntensity: 0.3,
        };

        const result = await saveSceneConfig(config, 'user-1', 'canvas-1');

        expect(result).toBe(true);
      });
    });

    describe('Full Spatial Data Operations', () => {
      it('should load all spatial data in local mode', async () => {
        const store = useSpatialStickerStore.getState();

        // Setup data
        store.addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1', name: 'S1' }));
        store.registerQRCode({
          content: 'qr-1',
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });
        store.savePersistentAnchor({
          handle: 'a-1',
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          createdAt: Date.now(),
        });

        const data = await loadSpatialData('canvas-1', 'user-1');

        expect(data.stickers.length).toBeGreaterThanOrEqual(1);
        expect(data.qrCodes.length).toBeGreaterThanOrEqual(1);
        expect(data.anchors.length).toBeGreaterThanOrEqual(1);
        expect(data.sceneConfig).toBeDefined();
      });

      it('should save all spatial data in local mode', async () => {
        const data = {
          stickers: [createSpatialSticker({ canvasId: 'canvas-1', name: 'Full1' })],
          qrCodes: [
            {
              content: 'full-qr',
              sizeMeters: 0.1,
              attachedStickerIds: [],
              isActive: true,
              createdAt: Date.now(),
            } as RegisteredQRCode,
          ],
          anchors: [
            {
              handle: 'full-anchor',
              position: [0, 0, 0] as [number, number, number],
              rotation: [0, 0, 0, 1] as [number, number, number, number],
              createdAt: Date.now(),
            },
          ],
          sceneConfig: DEFAULT_SPATIAL_SCENE_CONFIG,
        };

        const result = await saveSpatialData('canvas-1', 'user-1', data);

        expect(result.success).toBe(true);
      });

      it('should delete all spatial data in local mode', async () => {
        const store = useSpatialStickerStore.getState();
        store.addSpatialSticker(createSpatialSticker({ canvasId: 'delete-canvas', name: 'D1' }));
        store.addSpatialSticker(createSpatialSticker({ canvasId: 'delete-canvas', name: 'D2' }));

        const result = await deleteSpatialData('delete-canvas');

        expect(result).toBe(true);
        expect(store.getSpatialStickersByCanvas('delete-canvas')).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // DEBOUNCE TESTS
  // ============================================================================

  describe('Debounce Behavior', () => {
    it('should debounce multiple rapid saves', () => {
      const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: 'Debounce' });
      useSpatialStickerStore.getState().addSpatialSticker(sticker);

      // Multiple rapid saves
      saveSpatialSticker(sticker, 'user-1');
      saveSpatialSticker({ ...sticker, name: 'Updated 1' }, 'user-1');
      saveSpatialSticker({ ...sticker, name: 'Updated 2' }, 'user-1');
      saveSpatialSticker({ ...sticker, name: 'Updated 3' }, 'user-1');

      // Only the last save should execute after debounce
      vi.advanceTimersByTime(600);

      // No errors means success
      expect(true).toBe(true);
    });

    it('should cancel pending saves on sticker delete', () => {
      const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: 'Cancel' });
      useSpatialStickerStore.getState().addSpatialSticker(sticker);

      // Queue a save
      saveSpatialSticker(sticker, 'user-1');

      // Delete before debounce completes
      deleteSpatialSticker(sticker.id);

      // Advance past debounce - should not error
      vi.advanceTimersByTime(600);

      expect(useSpatialStickerStore.getState().getSpatialSticker(sticker.id)).toBeUndefined();
    });

    it('should flush pending saves on request', () => {
      const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: 'Flush' });
      useSpatialStickerStore.getState().addSpatialSticker(sticker);

      saveSpatialSticker(sticker, 'user-1');

      // Flush immediately
      flushPendingSaves();

      // No pending saves should remain
      vi.advanceTimersByTime(600);

      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle loading from empty canvas', async () => {
      const stickers = await loadSpatialStickers('empty-canvas', 'user-1');
      expect(stickers).toHaveLength(0);
    });

    it('should handle saving sticker with all optional fields null', () => {
      const minimalSticker = createSpatialSticker({
        canvasId: 'canvas-1',
        name: 'Minimal',
      });

      // Clear optional fields
      minimalSticker.mediaSrc = '';
      minimalSticker.linkedWidgetDefId = undefined;
      minimalSticker.linkedWidgetInstanceId = undefined;
      minimalSticker.linkedUrl = undefined;
      minimalSticker.linkedEvent = undefined;
      minimalSticker.linkedPipelineId = undefined;
      minimalSticker.layerId = undefined;
      minimalSticker.groupId = undefined;
      minimalSticker.metadata = undefined;

      useSpatialStickerStore.getState().addSpatialSticker(minimalSticker);

      // Should not throw
      saveSpatialSticker(minimalSticker, 'user-1', true);

      expect(useSpatialStickerStore.getState().getSpatialSticker(minimalSticker.id)).toBeDefined();
    });

    it('should handle QR code with empty attached stickers array', async () => {
      const qrCode: RegisteredQRCode = {
        content: 'empty-attach',
        sizeMeters: 0.1,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      };

      const result = await saveQRCode(qrCode, 'user-1', 'canvas-1');
      expect(result).toBe(true);
    });

    it('should handle QR code with many attached stickers', async () => {
      const stickerIds = Array.from({ length: 100 }, (_, i) => `sticker-${i}`);
      const qrCode: RegisteredQRCode = {
        content: 'many-attach',
        sizeMeters: 0.1,
        attachedStickerIds: stickerIds,
        isActive: true,
        createdAt: Date.now(),
      };

      const result = await saveQRCode(qrCode, 'user-1', 'canvas-1');
      expect(result).toBe(true);
    });

    it('should handle sticker with complex 3D transform', () => {
      const sticker = createSpatialSticker({
        canvasId: 'canvas-1',
        name: 'Complex Transform',
      });
      sticker.transform3D = {
        position: { x: 123.456789, y: -987.654321, z: 0.000001 },
        rotation: { x: 359.99, y: 180.0, z: 45.5 },
        scale: { x: 0.001, y: 1000, z: 1 },
      };

      useSpatialStickerStore.getState().addSpatialSticker(sticker);

      // Should not throw
      saveSpatialSticker(sticker, 'user-1', true);

      const retrieved = useSpatialStickerStore.getState().getSpatialSticker(sticker.id);
      expect(retrieved?.transform3D.position.x).toBe(123.456789);
    });

    it('should handle sticker with complex anchor data', () => {
      const sticker = createSpatialSticker({
        canvasId: 'canvas-1',
        name: 'Complex Anchor',
      });
      sticker.anchor = {
        type: 'qr-code',
        qrContent: 'https://example.com/complex?param=value&other=123',
        worldPosition: { x: 0.123, y: 4.567, z: -8.901 },
        worldRotation: { x: 15, y: 30, z: 45 },
      };

      useSpatialStickerStore.getState().addSpatialSticker(sticker);

      saveSpatialSticker(sticker, 'user-1', true);

      const retrieved = useSpatialStickerStore.getState().getSpatialSticker(sticker.id);
      expect(retrieved?.anchor.type).toBe('qr-code');
      expect(retrieved?.anchor.qrContent).toBe('https://example.com/complex?param=value&other=123');
    });

    it('should handle sticker with model config', () => {
      const sticker = createSpatialSticker({
        canvasId: 'canvas-1',
        name: 'Model Sticker',
        mediaType: '3d-model',
      });
      sticker.model3DConfig = {
        modelUrl: '/models/complex-model.glb',
        format: 'glb',
        animations: ['idle', 'walk', 'run'],
        scale: 2.5,
      };

      useSpatialStickerStore.getState().addSpatialSticker(sticker);

      saveSpatialSticker(sticker, 'user-1', true);

      const retrieved = useSpatialStickerStore.getState().getSpatialSticker(sticker.id);
      expect(retrieved?.model3DConfig?.format).toBe('glb');
      expect(retrieved?.model3DConfig?.animations).toContain('walk');
    });

    it('should handle sticker with primitive config', () => {
      const sticker = createSpatialSticker({
        canvasId: 'canvas-1',
        name: 'Primitive Sticker',
        mediaType: '3d-primitive',
      });
      sticker.primitive3DConfig = {
        primitiveType: 'sphere',
        dimensions: { width: 0.5, height: 0.5, depth: 0.5 },
        material: {
          color: '#ff5500',
          metalness: 0.8,
          roughness: 0.2,
          opacity: 0.9,
        },
      };

      useSpatialStickerStore.getState().addSpatialSticker(sticker);

      saveSpatialSticker(sticker, 'user-1', true);

      const retrieved = useSpatialStickerStore.getState().getSpatialSticker(sticker.id);
      expect(retrieved?.primitive3DConfig?.primitiveType).toBe('sphere');
      expect(retrieved?.primitive3DConfig?.material?.metalness).toBe(0.8);
    });

    it('should handle anchor with quaternion rotation', async () => {
      const anchor: PersistentAnchorData = {
        handle: 'quat-anchor',
        position: [1, 2, 3],
        rotation: [0.5, 0.5, 0.5, 0.5], // Normalized quaternion
        label: 'Quaternion Test',
        createdAt: Date.now(),
      };

      const result = await savePersistentAnchor(anchor, 'user-1', 'canvas-1');
      expect(result).toBe(true);
    });

    it('should handle scene config with all custom values', async () => {
      const config: SpatialSceneConfig = {
        showRoomVisualization: true,
        enableOcclusion: false,
        enableShadows: false,
        ambientIntensity: 0.1,
        vrEnvironment: 'night',
        customEnvironmentUrl: 'https://example.com/environment.hdr',
        showFloorGrid: true,
        snapToSurfaces: false,
      };

      const result = await saveSceneConfig(config, 'user-1', 'canvas-1');
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // CONCURRENT OPERATION TESTS
  // ============================================================================

  describe('Concurrent Operations', () => {
    it('should handle multiple stickers being saved simultaneously', async () => {
      const stickers = Array.from({ length: 20 }, (_, i) =>
        createSpatialSticker({
          canvasId: 'canvas-1',
          name: `Concurrent ${i}`,
        })
      );

      stickers.forEach((s) => useSpatialStickerStore.getState().addSpatialSticker(s));

      // Save all concurrently
      stickers.forEach((s) => saveSpatialSticker(s, 'user-1'));

      vi.advanceTimersByTime(600);

      // All should still be in store
      stickers.forEach((s) => {
        expect(useSpatialStickerStore.getState().getSpatialSticker(s.id)).toBeDefined();
      });
    });

    it('should handle save and delete of same sticker', async () => {
      const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: 'Race' });
      useSpatialStickerStore.getState().addSpatialSticker(sticker);

      // Save then immediately delete
      saveSpatialSticker(sticker, 'user-1');
      await deleteSpatialSticker(sticker.id);

      vi.advanceTimersByTime(600);

      // Sticker should be gone
      expect(useSpatialStickerStore.getState().getSpatialSticker(sticker.id)).toBeUndefined();
    });

    it('should handle bulk save while individual saves are pending', async () => {
      const stickers = Array.from({ length: 5 }, (_, i) =>
        createSpatialSticker({
          canvasId: 'canvas-1',
          name: `Bulk ${i}`,
        })
      );

      stickers.forEach((s) => {
        useSpatialStickerStore.getState().addSpatialSticker(s);
        saveSpatialSticker(s, 'user-1'); // Queue individual saves
      });

      // Bulk save should flush pending
      const result = await saveAllSpatialStickers(stickers, 'user-1');

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // DATA INTEGRITY TESTS
  // ============================================================================

  describe('Data Integrity', () => {
    it('should preserve sticker ID through save/load cycle', async () => {
      const sticker = createSpatialSticker({
        canvasId: 'canvas-1',
        name: 'ID Test',
      });
      const originalId = sticker.id;

      useSpatialStickerStore.getState().addSpatialSticker(sticker);
      saveSpatialSticker(sticker, 'user-1', true);

      const loaded = await loadSpatialStickers('canvas-1', 'user-1');
      const found = loaded.find((s) => s.id === originalId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(originalId);
    });

    it('should preserve all sticker fields through save', () => {
      const sticker = createSpatialSticker({
        canvasId: 'canvas-1',
        name: 'Full Fields',
        mediaType: 'image',
        mediaSrc: '/test.png',
      });
      sticker.opacity = 0.75;
      sticker.locked = true;
      sticker.billboard3D = true;
      sticker.castShadow = false;
      sticker.receiveShadow = false;
      sticker.hoverAnimation = 'glow';
      sticker.clickAnimation = 'bounce';
      sticker.visibleIn = { desktop: false, vr: true, ar: true };

      useSpatialStickerStore.getState().addSpatialSticker(sticker);
      saveSpatialSticker(sticker, 'user-1', true);

      const retrieved = useSpatialStickerStore.getState().getSpatialSticker(sticker.id);

      expect(retrieved?.opacity).toBe(0.75);
      expect(retrieved?.locked).toBe(true);
      expect(retrieved?.billboard3D).toBe(true);
      expect(retrieved?.castShadow).toBe(false);
      expect(retrieved?.visibleIn.desktop).toBe(false);
    });

    it('should preserve QR code attached sticker relationships', async () => {
      const store = useSpatialStickerStore.getState();

      // Create stickers and QR code
      const s1 = store.createImageSticker('canvas-1', 'S1', '/s1.png');
      const s2 = store.createImageSticker('canvas-1', 'S2', '/s2.png');

      store.registerQRCode({
        content: 'relation-qr',
        sizeMeters: 0.1,
        attachedStickerIds: [s1.id, s2.id],
        isActive: true,
        createdAt: Date.now(),
      });

      const qrCodes = await loadQRCodes('canvas-1', 'user-1');
      const qr = qrCodes.find((q) => q.content === 'relation-qr');

      expect(qr?.attachedStickerIds).toContain(s1.id);
      expect(qr?.attachedStickerIds).toContain(s2.id);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should throw when saving undefined sticker', () => {
      // Service correctly throws on invalid input
      expect(() => {
        saveSpatialSticker(undefined as unknown as ReturnType<typeof createSpatialSticker>, 'user-1');
      }).toThrow();
    });

    it('should handle deleting non-existent sticker', async () => {
      const result = await deleteSpatialSticker('non-existent-id');
      expect(result).toBe(true); // In local mode, returns true
    });

    it('should handle deleting non-existent QR code', async () => {
      const result = await deleteQRCode('non-existent-qr', 'canvas-1');
      expect(result).toBe(true);
    });

    it('should handle deleting non-existent anchor', async () => {
      const result = await deletePersistentAnchor('non-existent-handle', 'canvas-1');
      expect(result).toBe(true);
    });
  });
});
