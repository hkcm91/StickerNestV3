/**
 * StickerNest v2 - Advanced Spatial Sticker Store Tests
 * Edge cases, stress tests, and complex integration scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSpatialStickerStore } from './useSpatialStickerStore';
import {
  createSpatialSticker,
  DEFAULT_SPATIAL_SCENE_CONFIG,
} from '../types/spatialEntity';
import type { SpatialSticker, RegisteredQRCode } from '../types/spatialEntity';

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

describe('useSpatialStickerStore - Advanced Tests', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    describe('ID and Reference Handling', () => {
      it('should handle duplicate sticker IDs by overwriting', () => {
        const { addSpatialSticker, getSpatialSticker, getSpatialStickers } =
          useSpatialStickerStore.getState();

        const sticker1 = createSpatialSticker({ canvasId: 'canvas-1', name: 'First' });
        const sticker2 = { ...sticker1, name: 'Second' }; // Same ID, different name

        addSpatialSticker(sticker1);
        addSpatialSticker(sticker2);

        // Should have only one sticker with the duplicate ID
        expect(getSpatialStickers()).toHaveLength(1);
        expect(getSpatialSticker(sticker1.id)?.name).toBe('Second');
      });

      it('should handle very long sticker IDs', () => {
        const { addSpatialSticker, getSpatialSticker } = useSpatialStickerStore.getState();

        const longId = 'a'.repeat(10000);
        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        (sticker as { id: string }).id = longId;

        addSpatialSticker(sticker);

        expect(getSpatialSticker(longId)).toBeDefined();
        expect(getSpatialSticker(longId)?.id).toBe(longId);
      });

      it('should handle special characters in IDs', () => {
        const { addSpatialSticker, getSpatialSticker } = useSpatialStickerStore.getState();

        const specialIds = [
          'sticker-with-émojis-🎨',
          'sticker/with/slashes',
          'sticker.with.dots',
          'sticker with spaces',
          'sticker\twith\ttabs',
          'sticker<with>html',
          "sticker'with'quotes",
          'sticker"with"double"quotes',
        ];

        specialIds.forEach((id, index) => {
          const sticker = createSpatialSticker({
            canvasId: `canvas-${index}`,
            name: `Special ${index}`,
          });
          (sticker as { id: string }).id = id;
          addSpatialSticker(sticker);
        });

        specialIds.forEach((id) => {
          expect(getSpatialSticker(id)).toBeDefined();
        });
      });

      it('should not modify original sticker object when adding', () => {
        const { addSpatialSticker } = useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: 'Original' });
        const originalId = sticker.id;
        const originalName = sticker.name;

        addSpatialSticker(sticker);

        // Original object should be unchanged
        expect(sticker.id).toBe(originalId);
        expect(sticker.name).toBe(originalName);
      });

      it('should handle update on non-existent sticker gracefully', () => {
        const { updateSpatialSticker, getSpatialStickers } = useSpatialStickerStore.getState();

        // Should not throw
        updateSpatialSticker('non-existent-id', { name: 'New Name' });

        expect(getSpatialStickers()).toHaveLength(0);
      });

      it('should handle remove on non-existent sticker gracefully', () => {
        const { removeSpatialSticker, addSpatialSticker, getSpatialStickers } =
          useSpatialStickerStore.getState();

        addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1' }));

        // Should not throw
        removeSpatialSticker('non-existent-id');

        expect(getSpatialStickers()).toHaveLength(1);
      });
    });

    describe('Transform Boundary Values', () => {
      it('should handle extreme position values', () => {
        const { addSpatialSticker, updateSpatialPosition, getSpatialSticker } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        // Very large values
        updateSpatialPosition(sticker.id, {
          x: Number.MAX_SAFE_INTEGER,
          y: Number.MIN_SAFE_INTEGER,
          z: 1e308,
        });

        const updated = getSpatialSticker(sticker.id);
        expect(updated?.transform3D.position.x).toBe(Number.MAX_SAFE_INTEGER);
        expect(updated?.transform3D.position.y).toBe(Number.MIN_SAFE_INTEGER);
        expect(updated?.transform3D.position.z).toBe(1e308);
      });

      it('should handle very small position values (epsilon)', () => {
        const { addSpatialSticker, updateSpatialPosition, getSpatialSticker } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        updateSpatialPosition(sticker.id, {
          x: Number.EPSILON,
          y: -Number.EPSILON,
          z: 1e-308,
        });

        const updated = getSpatialSticker(sticker.id);
        expect(updated?.transform3D.position.x).toBe(Number.EPSILON);
        expect(updated?.transform3D.position.y).toBe(-Number.EPSILON);
      });

      it('should handle zero scale values', () => {
        const { addSpatialSticker, updateSpatialScale, getSpatialSticker } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        updateSpatialScale(sticker.id, { x: 0, y: 0, z: 0 });

        const updated = getSpatialSticker(sticker.id);
        expect(updated?.transform3D.scale).toEqual({ x: 0, y: 0, z: 0 });
      });

      it('should handle negative scale values', () => {
        const { addSpatialSticker, updateSpatialScale, getSpatialSticker } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        updateSpatialScale(sticker.id, { x: -1, y: -2, z: -0.5 });

        const updated = getSpatialSticker(sticker.id);
        expect(updated?.transform3D.scale).toEqual({ x: -1, y: -2, z: -0.5 });
      });

      it('should handle rotation values beyond 360 degrees', () => {
        const { addSpatialSticker, updateSpatialRotation, getSpatialSticker } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        updateSpatialRotation(sticker.id, { x: 720, y: -540, z: 1080 });

        const updated = getSpatialSticker(sticker.id);
        expect(updated?.transform3D.rotation).toEqual({ x: 720, y: -540, z: 1080 });
      });

      it('should handle NaN values in transforms (store accepts them)', () => {
        const { addSpatialSticker, updateSpatialPosition, getSpatialSticker } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        updateSpatialPosition(sticker.id, { x: NaN, y: NaN, z: NaN });

        const updated = getSpatialSticker(sticker.id);
        expect(Number.isNaN(updated?.transform3D.position.x)).toBe(true);
      });

      it('should handle Infinity in transforms', () => {
        const { addSpatialSticker, updateSpatialPosition, getSpatialSticker } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        updateSpatialPosition(sticker.id, {
          x: Infinity,
          y: -Infinity,
          z: Infinity,
        });

        const updated = getSpatialSticker(sticker.id);
        expect(updated?.transform3D.position.x).toBe(Infinity);
        expect(updated?.transform3D.position.y).toBe(-Infinity);
      });
    });

    describe('QR Code Edge Cases', () => {
      it('should handle QR code with empty content', () => {
        const { registerQRCode, getRegisteredQRCode } = useSpatialStickerStore.getState();

        registerQRCode({
          content: '',
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });

        expect(getRegisteredQRCode('')).toBeDefined();
      });

      it('should handle QR code with very long content', () => {
        const { registerQRCode, getRegisteredQRCode } = useSpatialStickerStore.getState();

        const longContent = 'x'.repeat(50000);
        registerQRCode({
          content: longContent,
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });

        expect(getRegisteredQRCode(longContent)).toBeDefined();
      });

      it('should handle attaching same sticker to QR code multiple times', () => {
        const { registerQRCode, addSpatialSticker, attachStickerToQR, getRegisteredQRCode } =
          useSpatialStickerStore.getState();

        registerQRCode({
          content: 'qr-1',
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        // Attach same sticker multiple times
        attachStickerToQR(sticker.id, 'qr-1');
        attachStickerToQR(sticker.id, 'qr-1');
        attachStickerToQR(sticker.id, 'qr-1');

        const qr = getRegisteredQRCode('qr-1');
        // Current implementation allows duplicates (feature or bug depending on requirements)
        expect(qr?.attachedStickerIds.filter((id) => id === sticker.id).length).toBeGreaterThan(0);
      });

      it('should handle detaching sticker not attached to any QR', () => {
        const { registerQRCode, addSpatialSticker, detachStickerFromQR, getRegisteredQRCode } =
          useSpatialStickerStore.getState();

        registerQRCode({
          content: 'qr-1',
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        // Should not throw
        detachStickerFromQR(sticker.id);

        const qr = getRegisteredQRCode('qr-1');
        expect(qr?.attachedStickerIds).toHaveLength(0);
      });

      it('should handle attaching to non-existent QR code', () => {
        const { addSpatialSticker, attachStickerToQR, getRegisteredQRCode } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);

        // Should not throw
        attachStickerToQR(sticker.id, 'non-existent-qr');

        // QR should still not exist
        expect(getRegisteredQRCode('non-existent-qr')).toBeUndefined();
      });
    });

    describe('Detection Pruning Edge Cases', () => {
      it('should prune all detections when maxAge is 0 and detection is old', () => {
        const { updateDetectedQRCode, pruneOldDetections } = useSpatialStickerStore.getState();

        // Add detection with timestamp in the past
        updateDetectedQRCode({
          content: 'qr-1',
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          confidence: 0.9,
          lastSeen: Date.now() - 1, // 1ms ago
        });

        pruneOldDetections(0);

        const { detectedQRCodes } = useSpatialStickerStore.getState();
        expect(detectedQRCodes.size).toBe(0);
      });

      it('should handle pruning empty detections map', () => {
        const { pruneOldDetections } = useSpatialStickerStore.getState();

        // Should not throw
        pruneOldDetections(1000);

        const { detectedQRCodes } = useSpatialStickerStore.getState();
        expect(detectedQRCodes.size).toBe(0);
      });

      it('should handle negative maxAge (prunes everything)', () => {
        const { updateDetectedQRCode, pruneOldDetections } = useSpatialStickerStore.getState();

        updateDetectedQRCode({
          content: 'qr-1',
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          confidence: 0.9,
          lastSeen: Date.now(),
        });

        pruneOldDetections(-1000);

        const { detectedQRCodes } = useSpatialStickerStore.getState();
        expect(detectedQRCodes.size).toBe(0);
      });
    });

    describe('Scene Config Edge Cases', () => {
      it('should handle updating config with empty object', () => {
        const { updateSceneConfig } = useSpatialStickerStore.getState();

        const configBefore = { ...useSpatialStickerStore.getState().sceneConfig };
        updateSceneConfig({});
        const configAfter = useSpatialStickerStore.getState().sceneConfig;

        expect(configAfter).toEqual(configBefore);
      });

      it('should handle extreme ambient intensity values', () => {
        const { updateSceneConfig } = useSpatialStickerStore.getState();

        updateSceneConfig({ ambientIntensity: 1000000 });
        expect(useSpatialStickerStore.getState().sceneConfig.ambientIntensity).toBe(1000000);

        updateSceneConfig({ ambientIntensity: -1000 });
        expect(useSpatialStickerStore.getState().sceneConfig.ambientIntensity).toBe(-1000);
      });
    });

    describe('Selection Edge Cases', () => {
      it('should handle selecting deleted sticker', () => {
        const { addSpatialSticker, selectSpatialSticker, removeSpatialSticker } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
        addSpatialSticker(sticker);
        selectSpatialSticker(sticker.id);
        removeSpatialSticker(sticker.id);

        // Selection should still point to the ID (stale reference)
        expect(useSpatialStickerStore.getState().selectedSpatialStickerId).toBe(sticker.id);
        // But getSpatialSticker should return undefined
        expect(useSpatialStickerStore.getState().getSpatialSticker(sticker.id)).toBeUndefined();
      });

      it('should allow selecting sticker ID that does not exist', () => {
        const { selectSpatialSticker } = useSpatialStickerStore.getState();

        selectSpatialSticker('non-existent-id');

        expect(useSpatialStickerStore.getState().selectedSpatialStickerId).toBe('non-existent-id');
      });
    });

    describe('Import/Export Edge Cases', () => {
      it('should handle importing empty data', () => {
        const { importSpatialStickers, getSpatialStickers } = useSpatialStickerStore.getState();

        importSpatialStickers({ stickers: [], qrCodes: [] });

        expect(getSpatialStickers()).toHaveLength(0);
      });

      it('should handle exporting from empty canvas', () => {
        const { exportSpatialStickers } = useSpatialStickerStore.getState();

        const exported = exportSpatialStickers('empty-canvas');

        expect(exported.stickers).toHaveLength(0);
      });

      it('should merge imported data with existing data', () => {
        const { addSpatialSticker, importSpatialStickers, getSpatialStickers } =
          useSpatialStickerStore.getState();

        addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1', name: 'Existing' }));

        importSpatialStickers({
          stickers: [createSpatialSticker({ canvasId: 'canvas-2', name: 'Imported' })],
          qrCodes: [],
        });

        expect(getSpatialStickers()).toHaveLength(2);
      });

      it('should overwrite sticker with same ID during import', () => {
        const { addSpatialSticker, importSpatialStickers, getSpatialSticker } =
          useSpatialStickerStore.getState();

        const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: 'Original' });
        addSpatialSticker(sticker);

        const importedSticker = { ...sticker, name: 'Imported' };
        importSpatialStickers({ stickers: [importedSticker], qrCodes: [] });

        expect(getSpatialSticker(sticker.id)?.name).toBe('Imported');
      });
    });
  });

  // ============================================================================
  // STRESS TESTS
  // ============================================================================

  describe('Stress Tests', () => {
    it('should handle adding 1000 stickers', () => {
      const { addSpatialSticker, getSpatialStickers, getSpatialStickersByCanvas } =
        useSpatialStickerStore.getState();

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        addSpatialSticker(
          createSpatialSticker({
            canvasId: `canvas-${i % 10}`,
            name: `Sticker ${i}`,
          })
        );
      }

      const endTime = performance.now();

      expect(getSpatialStickers()).toHaveLength(1000);
      expect(getSpatialStickersByCanvas('canvas-0')).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle rapid consecutive updates to same sticker', () => {
      const { addSpatialSticker, updateSpatialPosition, getSpatialSticker } =
        useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);

      // Simulate rapid position updates (like dragging)
      for (let i = 0; i < 1000; i++) {
        updateSpatialPosition(sticker.id, { x: i, y: i * 2, z: i * 3 });
      }

      const final = getSpatialSticker(sticker.id);
      expect(final?.transform3D.position).toEqual({ x: 999, y: 1998, z: 2997 });
    });

    it('should handle rapid add/remove cycles', () => {
      const { addSpatialSticker, removeSpatialSticker, getSpatialStickers } =
        useSpatialStickerStore.getState();

      // Add and remove 500 times
      for (let i = 0; i < 500; i++) {
        const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: `Cycle ${i}` });
        addSpatialSticker(sticker);
        removeSpatialSticker(sticker.id);
      }

      expect(getSpatialStickers()).toHaveLength(0);
    });

    it('should handle many QR codes with many attached stickers', () => {
      const { registerQRCode, addSpatialSticker, attachStickerToQR, getRegisteredQRCode } =
        useSpatialStickerStore.getState();

      // Register 50 QR codes
      for (let i = 0; i < 50; i++) {
        registerQRCode({
          content: `qr-${i}`,
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });
      }

      // Add 200 stickers and attach to QR codes
      for (let i = 0; i < 200; i++) {
        const sticker = createSpatialSticker({ canvasId: 'canvas-1', name: `Sticker ${i}` });
        addSpatialSticker(sticker);
        attachStickerToQR(sticker.id, `qr-${i % 50}`);
      }

      // Each QR should have 4 stickers attached
      expect(getRegisteredQRCode('qr-0')?.attachedStickerIds.length).toBe(4);
      expect(getRegisteredQRCode('qr-49')?.attachedStickerIds.length).toBe(4);
    });

    it('should handle large import operation', () => {
      const { importSpatialStickers, getSpatialStickers } = useSpatialStickerStore.getState();

      const stickers: SpatialSticker[] = [];
      const qrCodes: RegisteredQRCode[] = [];

      for (let i = 0; i < 500; i++) {
        stickers.push(createSpatialSticker({ canvasId: 'canvas-1', name: `Import ${i}` }));
      }

      for (let i = 0; i < 100; i++) {
        qrCodes.push({
          content: `import-qr-${i}`,
          sizeMeters: 0.1,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        });
      }

      const startTime = performance.now();
      importSpatialStickers({ stickers, qrCodes });
      const endTime = performance.now();

      expect(getSpatialStickers()).toHaveLength(500);
      expect(useSpatialStickerStore.getState().registeredQRCodes.size).toBe(100);
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle many persistent anchors', () => {
      const { savePersistentAnchor, getPersistentAnchor } = useSpatialStickerStore.getState();

      for (let i = 0; i < 200; i++) {
        savePersistentAnchor({
          handle: `anchor-${i}`,
          position: [i, i * 2, i * 3],
          rotation: [0, 0, 0, 1],
          label: `Anchor ${i}`,
          createdAt: Date.now(),
        });
      }

      expect(useSpatialStickerStore.getState().persistentAnchors.size).toBe(200);
      expect(getPersistentAnchor('anchor-199')?.label).toBe('Anchor 199');
    });
  });

  // ============================================================================
  // COMPLEX INTEGRATION TESTS
  // ============================================================================

  describe('Complex Integration Tests', () => {
    it('should complete full sticker lifecycle: create → transform → anchor → export → import', () => {
      const store = useSpatialStickerStore.getState();

      // 1. Create sticker
      const sticker = store.createImageSticker('canvas-1', 'Lifecycle Test', '/image.png');
      expect(sticker).toBeDefined();

      // 2. Transform it
      store.updateSpatialPosition(sticker.id, { x: 5, y: 5, z: 5 });
      store.updateSpatialRotation(sticker.id, { x: 45, y: 0, z: 0 });
      store.updateSpatialScale(sticker.id, { x: 2, y: 2, z: 2 });

      // 3. Register QR and anchor to it
      store.registerQRCode({
        content: 'lifecycle-qr',
        sizeMeters: 0.15,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      });
      store.setAnchor(sticker.id, {
        type: 'qr-code',
        qrContent: 'lifecycle-qr',
        worldPosition: { x: 0, y: 1, z: -1 },
        worldRotation: { x: 0, y: 0, z: 0 },
      });

      // 4. Export
      const exported = store.exportSpatialStickers('canvas-1');
      expect(exported.stickers).toHaveLength(1);
      expect(exported.qrCodes).toHaveLength(1);

      // 5. Clear and reimport
      store.clearSpatialStickers('canvas-1');
      expect(store.getSpatialStickersByCanvas('canvas-1')).toHaveLength(0);

      store.importSpatialStickers(exported);

      // 6. Verify everything is restored
      const restored = store.getSpatialSticker(sticker.id);
      expect(restored).toBeDefined();
      expect(restored?.transform3D.position).toEqual({ x: 5, y: 5, z: 5 });
      expect(restored?.transform3D.rotation).toEqual({ x: 45, y: 0, z: 0 });
      expect(restored?.transform3D.scale).toEqual({ x: 2, y: 2, z: 2 });
      expect(restored?.anchor.type).toBe('qr-code');
    });

    it('should maintain canvas isolation', () => {
      const store = useSpatialStickerStore.getState();

      // Create stickers in different canvases
      store.createImageSticker('canvas-a', 'A1', '/a1.png');
      store.createImageSticker('canvas-a', 'A2', '/a2.png');
      store.createImageSticker('canvas-b', 'B1', '/b1.png');
      store.createModelSticker('canvas-c', 'C1', '/c1.glb');

      // Verify isolation
      expect(store.getSpatialStickersByCanvas('canvas-a')).toHaveLength(2);
      expect(store.getSpatialStickersByCanvas('canvas-b')).toHaveLength(1);
      expect(store.getSpatialStickersByCanvas('canvas-c')).toHaveLength(1);

      // Clear one canvas
      store.clearSpatialStickers('canvas-a');

      // Others should be unaffected
      expect(store.getSpatialStickersByCanvas('canvas-a')).toHaveLength(0);
      expect(store.getSpatialStickersByCanvas('canvas-b')).toHaveLength(1);
      expect(store.getSpatialStickersByCanvas('canvas-c')).toHaveLength(1);
    });

    it('should handle complex QR workflow with multiple stickers', () => {
      const store = useSpatialStickerStore.getState();

      // Register two QR codes
      store.registerQRCode({
        content: 'qr-alpha',
        label: 'Alpha QR',
        sizeMeters: 0.1,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      });
      store.registerQRCode({
        content: 'qr-beta',
        label: 'Beta QR',
        sizeMeters: 0.2,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      });

      // Create stickers linked to QRs
      const s1 = store.createQRLinkedSticker('canvas-1', 'QR1', 'qr-alpha');
      const s2 = store.createQRLinkedSticker('canvas-1', 'QR2', 'qr-alpha');
      const s3 = store.createQRLinkedSticker('canvas-1', 'QR3', 'qr-beta');

      // Verify attachments
      expect(store.getRegisteredQRCode('qr-alpha')?.attachedStickerIds).toContain(s1.id);
      expect(store.getRegisteredQRCode('qr-alpha')?.attachedStickerIds).toContain(s2.id);
      expect(store.getRegisteredQRCode('qr-beta')?.attachedStickerIds).toContain(s3.id);

      // Detach one sticker
      store.detachStickerFromQR(s1.id);

      expect(store.getRegisteredQRCode('qr-alpha')?.attachedStickerIds).not.toContain(s1.id);
      expect(store.getRegisteredQRCode('qr-alpha')?.attachedStickerIds).toContain(s2.id);
    });

    it('should handle placement mode with sticker creation', () => {
      const { enterPlacementMode, exitPlacementMode, createModelSticker, selectSpatialSticker } =
        useSpatialStickerStore.getState();

      // Enter placement mode
      enterPlacementMode('3d-model');
      expect(useSpatialStickerStore.getState().isPlacementMode).toBe(true);
      expect(useSpatialStickerStore.getState().placementStickerType).toBe('3d-model');

      // "Place" a sticker
      const sticker = createModelSticker('canvas-1', 'Placed Model', '/model.glb');

      // Exit placement mode
      exitPlacementMode();
      expect(useSpatialStickerStore.getState().isPlacementMode).toBe(false);

      // Select the placed sticker
      selectSpatialSticker(sticker.id);
      expect(useSpatialStickerStore.getState().selectedSpatialStickerId).toBe(sticker.id);
    });

    it('should handle detected QR matching registered QR workflow', () => {
      const store = useSpatialStickerStore.getState();

      // Register QR
      store.registerQRCode({
        content: 'tracked-qr',
        sizeMeters: 0.1,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      });

      // Simulate QR detection over time
      const positions: [number, number, number][] = [
        [0, 0, -1],
        [0.01, 0.01, -1],
        [0.02, 0, -1.01],
        [0.01, -0.01, -1],
      ];

      for (let i = 0; i < positions.length; i++) {
        store.updateDetectedQRCode({
          content: 'tracked-qr',
          position: positions[i],
          rotation: [0, 0, 0, 1],
          confidence: 0.9 + i * 0.02,
          lastSeen: Date.now() + i * 100,
        });
      }

      const detected = useSpatialStickerStore.getState().detectedQRCodes.get('tracked-qr');
      expect(detected).toBeDefined();
      expect(detected?.confidence).toBe(0.96);
      expect(detected?.position).toEqual([0.01, -0.01, -1]);
    });

    it('should handle scene config changes affecting rendering', () => {
      const store = useSpatialStickerStore.getState();

      // Create some stickers
      store.createImageSticker('canvas-1', 'S1', '/s1.png');
      store.createImageSticker('canvas-1', 'S2', '/s2.png');

      // Update scene config
      store.updateSceneConfig({
        vrEnvironment: 'forest',
        enableOcclusion: false,
        enableShadows: true,
        showFloorGrid: true,
        ambientIntensity: 0.8,
      });

      const config = useSpatialStickerStore.getState().sceneConfig;
      expect(config.vrEnvironment).toBe('forest');
      expect(config.enableOcclusion).toBe(false);
      expect(config.showFloorGrid).toBe(true);

      // Reset to defaults
      store.resetSceneConfig();
      expect(useSpatialStickerStore.getState().sceneConfig.vrEnvironment).toBe(
        DEFAULT_SPATIAL_SCENE_CONFIG.vrEnvironment
      );
    });

    it('should handle all primitive types', () => {
      const store = useSpatialStickerStore.getState();

      const cube = store.createPrimitiveSticker('canvas-1', 'Cube', 'cube');
      const sphere = store.createPrimitiveSticker('canvas-1', 'Sphere', 'sphere');
      const cylinder = store.createPrimitiveSticker('canvas-1', 'Cylinder', 'cylinder');

      expect(cube.primitive3DConfig?.primitiveType).toBe('cube');
      expect(sphere.primitive3DConfig?.primitiveType).toBe('sphere');
      expect(cylinder.primitive3DConfig?.primitiveType).toBe('cylinder');

      // All should have default dimensions and material
      [cube, sphere, cylinder].forEach((s) => {
        expect(s.primitive3DConfig?.dimensions).toBeDefined();
        expect(s.primitive3DConfig?.material).toBeDefined();
        expect(s.primitive3DConfig?.material?.color).toBe('#8b5cf6');
      });
    });

    it('should handle all surface types', () => {
      const store = useSpatialStickerStore.getState();

      const floor = store.createSurfaceSticker('canvas-1', 'Floor', 'floor');
      const wall = store.createSurfaceSticker('canvas-1', 'Wall', 'wall');
      const table = store.createSurfaceSticker('canvas-1', 'Table', 'table');

      // Each should have appropriate anchor type
      expect(floor.anchor.type).toBe('floor');
      expect(wall.anchor.type).toBe('wall');
      expect(table.anchor.type).toBe('table');
    });
  });

  // ============================================================================
  // STATE CONSISTENCY TESTS
  // ============================================================================

  describe('State Consistency', () => {
    it('should maintain Map integrity after multiple operations', () => {
      const store = useSpatialStickerStore.getState();

      // Perform many mixed operations
      const ids: string[] = [];
      for (let i = 0; i < 50; i++) {
        const sticker = store.createImageSticker('canvas-1', `S${i}`, `/s${i}.png`);
        ids.push(sticker.id);

        if (i % 3 === 0) {
          store.updateSpatialPosition(sticker.id, { x: i, y: i, z: i });
        }
        if (i % 5 === 0 && i > 0) {
          store.removeSpatialSticker(ids[i - 5]);
        }
      }

      // Verify Map is still valid
      const state = useSpatialStickerStore.getState();
      expect(state.spatialStickers instanceof Map).toBe(true);
      expect(state.spatialStickers.size).toBeGreaterThan(0);
    });

    it('should not leak state between operations', () => {
      const store = useSpatialStickerStore.getState();

      const sticker1 = store.createImageSticker('canvas-1', 'S1', '/s1.png');
      const sticker2 = store.createImageSticker('canvas-1', 'S2', '/s2.png');

      // Update sticker1
      store.updateSpatialPosition(sticker1.id, { x: 100, y: 100, z: 100 });

      // Sticker2 should not be affected
      const s2 = store.getSpatialSticker(sticker2.id);
      expect(s2?.transform3D.position).not.toEqual({ x: 100, y: 100, z: 100 });
    });

    it('should handle concurrent-like updates correctly', () => {
      const store = useSpatialStickerStore.getState();

      const sticker = store.createImageSticker('canvas-1', 'Concurrent', '/c.png');

      // Simulate "concurrent" updates (in JS, these are sequential but rapid)
      const updates = [];
      for (let i = 0; i < 100; i++) {
        updates.push(store.updateSpatialPosition(sticker.id, { x: i, y: i * 2, z: i * 3 }));
      }

      // Final state should reflect last update
      const final = store.getSpatialSticker(sticker.id);
      expect(final?.transform3D.position).toEqual({ x: 99, y: 198, z: 297 });
    });
  });

  // ============================================================================
  // SELECTOR TESTS
  // ============================================================================

  describe('Selector Functions', () => {
    it('should efficiently get stickers by canvas with large dataset', () => {
      const store = useSpatialStickerStore.getState();

      // Add many stickers to multiple canvases
      for (let i = 0; i < 200; i++) {
        store.addSpatialSticker(
          createSpatialSticker({
            canvasId: `canvas-${i % 20}`,
            name: `Sticker ${i}`,
          })
        );
      }

      const startTime = performance.now();
      const canvas5Stickers = store.getSpatialStickersByCanvas('canvas-5');
      const endTime = performance.now();

      expect(canvas5Stickers).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});
