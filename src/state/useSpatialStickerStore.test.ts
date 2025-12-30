/**
 * StickerNest v2 - useSpatialStickerStore Tests
 * Tests for the spatial sticker state management including
 * sticker CRUD, 3D transforms, anchoring, QR codes, and scene config
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSpatialStickerStore } from './useSpatialStickerStore';
import {
  createSpatialSticker,
  DEFAULT_SPATIAL_SCENE_CONFIG,
} from '../types/spatialEntity';
import type { SpatialSticker, RegisteredQRCode } from '../types/spatialEntity';

describe('useSpatialStickerStore', () => {
  // Reset store state before each test
  beforeEach(() => {
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
  });

  afterEach(() => {
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
  });

  describe('Spatial Sticker CRUD Operations', () => {
    it('should add a spatial sticker', () => {
      const { addSpatialSticker, getSpatialSticker, getSpatialStickers } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({
        canvasId: 'canvas-1',
        name: 'Test Sticker',
        mediaType: 'image',
        mediaSrc: '/test.png',
      });

      addSpatialSticker(sticker);

      const retrieved = getSpatialSticker(sticker.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Sticker');
      expect(retrieved?.canvasId).toBe('canvas-1');
      expect(getSpatialStickers()).toHaveLength(1);
    });

    it('should update a spatial sticker', () => {
      const { addSpatialSticker, updateSpatialSticker, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({
        canvasId: 'canvas-1',
        name: 'Original Name',
      });
      addSpatialSticker(sticker);

      updateSpatialSticker(sticker.id, { name: 'Updated Name' });

      const updated = getSpatialSticker(sticker.id);
      expect(updated?.name).toBe('Updated Name');
      // updatedAt should be set (may be equal to createdAt if test runs fast)
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(sticker.createdAt);
    });

    it('should remove a spatial sticker', () => {
      const { addSpatialSticker, removeSpatialSticker, getSpatialSticker, getSpatialStickers } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);
      expect(getSpatialStickers()).toHaveLength(1);

      removeSpatialSticker(sticker.id);

      expect(getSpatialSticker(sticker.id)).toBeUndefined();
      expect(getSpatialStickers()).toHaveLength(0);
    });

    it('should get stickers by canvas', () => {
      const { addSpatialSticker, getSpatialStickersByCanvas } = useSpatialStickerStore.getState();

      addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1', name: 'Sticker 1' }));
      addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1', name: 'Sticker 2' }));
      addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-2', name: 'Sticker 3' }));

      const canvas1Stickers = getSpatialStickersByCanvas('canvas-1');
      const canvas2Stickers = getSpatialStickersByCanvas('canvas-2');

      expect(canvas1Stickers).toHaveLength(2);
      expect(canvas2Stickers).toHaveLength(1);
      expect(canvas2Stickers[0].name).toBe('Sticker 3');
    });

    it('should return undefined for non-existent sticker', () => {
      const { getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = getSpatialSticker('non-existent-id');

      expect(sticker).toBeUndefined();
    });
  });

  describe('3D Transform Operations', () => {
    it('should set spatial transform', () => {
      const { addSpatialSticker, setSpatialTransform, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);

      const newTransform = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 45, y: 90, z: 0 },
        scale: { x: 1.5, y: 1.5, z: 1.5 },
      };

      setSpatialTransform(sticker.id, newTransform);

      const updated = getSpatialSticker(sticker.id);
      expect(updated?.transform3D.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(updated?.transform3D.rotation).toEqual({ x: 45, y: 90, z: 0 });
      expect(updated?.transform3D.scale).toEqual({ x: 1.5, y: 1.5, z: 1.5 });
    });

    it('should update spatial position only', () => {
      const { addSpatialSticker, updateSpatialPosition, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);

      updateSpatialPosition(sticker.id, { x: 5, y: 6, z: 7 });

      const updated = getSpatialSticker(sticker.id);
      expect(updated?.transform3D.position).toEqual({ x: 5, y: 6, z: 7 });
      // Scale should remain unchanged
      expect(updated?.transform3D.scale).toEqual({ x: 1, y: 1, z: 1 });
    });

    it('should update spatial rotation only', () => {
      const { addSpatialSticker, updateSpatialRotation, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);

      updateSpatialRotation(sticker.id, { x: 30, y: 60, z: 90 });

      const updated = getSpatialSticker(sticker.id);
      expect(updated?.transform3D.rotation).toEqual({ x: 30, y: 60, z: 90 });
    });

    it('should update spatial scale only', () => {
      const { addSpatialSticker, updateSpatialScale, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);

      updateSpatialScale(sticker.id, { x: 2, y: 2, z: 2 });

      const updated = getSpatialSticker(sticker.id);
      expect(updated?.transform3D.scale).toEqual({ x: 2, y: 2, z: 2 });
    });
  });

  describe('Anchoring Operations', () => {
    it('should set anchor on a sticker', () => {
      const { addSpatialSticker, setAnchor, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);

      const anchor = {
        type: 'qr-code' as const,
        qrContent: 'https://example.com',
        worldPosition: { x: 0, y: 1, z: -1 },
        worldRotation: { x: 0, y: 0, z: 0 },
      };

      setAnchor(sticker.id, anchor);

      const updated = getSpatialSticker(sticker.id);
      expect(updated?.anchor.type).toBe('qr-code');
      expect(updated?.anchor.qrContent).toBe('https://example.com');
    });

    it('should clear anchor', () => {
      const { addSpatialSticker, setAnchor, clearAnchor, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);

      setAnchor(sticker.id, {
        type: 'surface',
        surfaceType: 'wall',
        worldPosition: { x: 0, y: 1, z: -1 },
        worldRotation: { x: 0, y: 0, z: 0 },
      });

      clearAnchor(sticker.id);

      const updated = getSpatialSticker(sticker.id);
      expect(updated?.anchor.type).toBe('none');
    });
  });

  describe('QR Code Registration', () => {
    it('should register a QR code', () => {
      const { registerQRCode, getRegisteredQRCode } = useSpatialStickerStore.getState();

      const qrCode: RegisteredQRCode = {
        content: 'https://example.com/qr1',
        label: 'Test QR',
        sizeMeters: 0.1,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      };

      registerQRCode(qrCode);

      const retrieved = getRegisteredQRCode('https://example.com/qr1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.label).toBe('Test QR');
      expect(retrieved?.sizeMeters).toBe(0.1);
    });

    it('should unregister a QR code', () => {
      const { registerQRCode, unregisterQRCode, getRegisteredQRCode } = useSpatialStickerStore.getState();

      registerQRCode({
        content: 'https://example.com/qr1',
        sizeMeters: 0.1,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      });

      unregisterQRCode('https://example.com/qr1');

      expect(getRegisteredQRCode('https://example.com/qr1')).toBeUndefined();
    });

    it('should attach sticker to QR code', () => {
      const { registerQRCode, addSpatialSticker, attachStickerToQR, getRegisteredQRCode } = useSpatialStickerStore.getState();

      registerQRCode({
        content: 'https://example.com/qr1',
        sizeMeters: 0.1,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      });

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);

      attachStickerToQR(sticker.id, 'https://example.com/qr1');

      const qr = getRegisteredQRCode('https://example.com/qr1');
      expect(qr?.attachedStickerIds).toContain(sticker.id);
    });

    it('should detach sticker from QR code', () => {
      const { registerQRCode, addSpatialSticker, attachStickerToQR, detachStickerFromQR, getRegisteredQRCode } = useSpatialStickerStore.getState();

      registerQRCode({
        content: 'https://example.com/qr1',
        sizeMeters: 0.1,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      });

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);
      attachStickerToQR(sticker.id, 'https://example.com/qr1');

      detachStickerFromQR(sticker.id);

      const qr = getRegisteredQRCode('https://example.com/qr1');
      expect(qr?.attachedStickerIds).not.toContain(sticker.id);
    });
  });

  describe('QR Code Detection (Runtime)', () => {
    it('should update detected QR code', () => {
      const { updateDetectedQRCode } = useSpatialStickerStore.getState();

      updateDetectedQRCode({
        content: 'https://example.com/detected',
        position: [1, 2, 3],
        rotation: [0, 0, 0, 1],
        confidence: 0.95,
        lastSeen: Date.now(),
      });

      const detectedQRCodes = useSpatialStickerStore.getState().detectedQRCodes;
      expect(detectedQRCodes.has('https://example.com/detected')).toBe(true);

      const detected = detectedQRCodes.get('https://example.com/detected');
      expect(detected?.confidence).toBe(0.95);
      expect(detected?.position).toEqual([1, 2, 3]);
    });

    it('should clear detected QR codes', () => {
      const { updateDetectedQRCode, clearDetectedQRCodes } = useSpatialStickerStore.getState();

      updateDetectedQRCode({
        content: 'https://example.com/qr1',
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        confidence: 0.9,
        lastSeen: Date.now(),
      });
      updateDetectedQRCode({
        content: 'https://example.com/qr2',
        position: [1, 1, 1],
        rotation: [0, 0, 0, 1],
        confidence: 0.8,
        lastSeen: Date.now(),
      });

      clearDetectedQRCodes();

      expect(useSpatialStickerStore.getState().detectedQRCodes.size).toBe(0);
    });

    it('should prune old detections', () => {
      const { updateDetectedQRCode, pruneOldDetections } = useSpatialStickerStore.getState();

      const now = Date.now();

      // Add old detection
      updateDetectedQRCode({
        content: 'https://example.com/old',
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        confidence: 0.9,
        lastSeen: now - 10000, // 10 seconds ago
      });

      // Add recent detection
      updateDetectedQRCode({
        content: 'https://example.com/new',
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        confidence: 0.9,
        lastSeen: now,
      });

      pruneOldDetections(5000); // Prune anything older than 5 seconds

      const detectedQRCodes = useSpatialStickerStore.getState().detectedQRCodes;
      expect(detectedQRCodes.has('https://example.com/old')).toBe(false);
      expect(detectedQRCodes.has('https://example.com/new')).toBe(true);
    });
  });

  describe('Persistent Anchors', () => {
    it('should save persistent anchor', () => {
      const { savePersistentAnchor, getPersistentAnchor } = useSpatialStickerStore.getState();

      savePersistentAnchor({
        handle: 'anchor-1',
        position: [1, 2, 3],
        rotation: [0, 0, 0, 1],
        label: 'Test Anchor',
        createdAt: Date.now(),
      });

      const anchor = getPersistentAnchor('anchor-1');
      expect(anchor).toBeDefined();
      expect(anchor?.label).toBe('Test Anchor');
      expect(anchor?.position).toEqual([1, 2, 3]);
    });

    it('should remove persistent anchor', () => {
      const { savePersistentAnchor, removePersistentAnchor, getPersistentAnchor } = useSpatialStickerStore.getState();

      savePersistentAnchor({
        handle: 'anchor-1',
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        createdAt: Date.now(),
      });

      removePersistentAnchor('anchor-1');

      expect(getPersistentAnchor('anchor-1')).toBeUndefined();
    });
  });

  describe('Scene Configuration', () => {
    it('should update scene config', () => {
      const { updateSceneConfig } = useSpatialStickerStore.getState();

      updateSceneConfig({
        vrEnvironment: 'sunset',
        showFloorGrid: true,
        enableOcclusion: false,
      });

      const config = useSpatialStickerStore.getState().sceneConfig;
      expect(config.vrEnvironment).toBe('sunset');
      expect(config.showFloorGrid).toBe(true);
      expect(config.enableOcclusion).toBe(false);
      // Unchanged values should remain
      expect(config.enableShadows).toBe(true);
    });

    it('should reset scene config to defaults', () => {
      const { updateSceneConfig, resetSceneConfig } = useSpatialStickerStore.getState();

      updateSceneConfig({
        vrEnvironment: 'night',
        ambientIntensity: 0.9,
      });

      resetSceneConfig();

      const config = useSpatialStickerStore.getState().sceneConfig;
      expect(config.vrEnvironment).toBe(DEFAULT_SPATIAL_SCENE_CONFIG.vrEnvironment);
      expect(config.ambientIntensity).toBe(DEFAULT_SPATIAL_SCENE_CONFIG.ambientIntensity);
    });
  });

  describe('Selection', () => {
    it('should select a spatial sticker', () => {
      const { addSpatialSticker, selectSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);

      selectSpatialSticker(sticker.id);

      expect(useSpatialStickerStore.getState().selectedSpatialStickerId).toBe(sticker.id);
    });

    it('should deselect by selecting null', () => {
      const { addSpatialSticker, selectSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSpatialSticker({ canvasId: 'canvas-1' });
      addSpatialSticker(sticker);
      selectSpatialSticker(sticker.id);

      selectSpatialSticker(null);

      expect(useSpatialStickerStore.getState().selectedSpatialStickerId).toBeNull();
    });
  });

  describe('Placement Mode', () => {
    it('should enter placement mode', () => {
      const { enterPlacementMode } = useSpatialStickerStore.getState();

      enterPlacementMode('3d-model');

      const state = useSpatialStickerStore.getState();
      expect(state.isPlacementMode).toBe(true);
      expect(state.placementStickerType).toBe('3d-model');
    });

    it('should exit placement mode', () => {
      const { enterPlacementMode, exitPlacementMode } = useSpatialStickerStore.getState();

      enterPlacementMode('image');
      exitPlacementMode();

      const state = useSpatialStickerStore.getState();
      expect(state.isPlacementMode).toBe(false);
      expect(state.placementStickerType).toBeNull();
    });
  });

  describe('Factory Functions', () => {
    it('should create an image sticker', () => {
      const { createImageSticker, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createImageSticker('canvas-1', 'My Image', '/path/to/image.png');

      expect(sticker.name).toBe('My Image');
      expect(sticker.mediaType).toBe('image');
      expect(sticker.mediaSrc).toBe('/path/to/image.png');
      expect(getSpatialSticker(sticker.id)).toBeDefined();
    });

    it('should create a model sticker', () => {
      const { createModelSticker, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createModelSticker('canvas-1', 'My Model', '/path/to/model.glb');

      expect(sticker.name).toBe('My Model');
      expect(sticker.mediaType).toBe('3d-model');
      expect(sticker.mediaSrc).toBe('/path/to/model.glb');
      expect(sticker.model3DConfig?.format).toBe('glb');
      expect(getSpatialSticker(sticker.id)).toBeDefined();
    });

    it('should create a primitive sticker', () => {
      const { createPrimitiveSticker, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createPrimitiveSticker('canvas-1', 'My Cube', 'cube');

      expect(sticker.name).toBe('My Cube');
      expect(sticker.mediaType).toBe('3d-primitive');
      expect(sticker.primitive3DConfig?.primitiveType).toBe('cube');
      expect(getSpatialSticker(sticker.id)).toBeDefined();
    });

    it('should create a QR-linked sticker', () => {
      const { registerQRCode, createQRLinkedSticker, getSpatialSticker, getRegisteredQRCode } = useSpatialStickerStore.getState();

      registerQRCode({
        content: 'https://example.com/qr',
        sizeMeters: 0.1,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      });

      const sticker = createQRLinkedSticker('canvas-1', 'QR Sticker', 'https://example.com/qr');

      expect(sticker.anchor.type).toBe('qr-code');
      expect(sticker.anchor.qrContent).toBe('https://example.com/qr');

      const qr = getRegisteredQRCode('https://example.com/qr');
      expect(qr?.attachedStickerIds).toContain(sticker.id);
    });

    it('should create a surface sticker', () => {
      const { createSurfaceSticker, getSpatialSticker } = useSpatialStickerStore.getState();

      const sticker = createSurfaceSticker('canvas-1', 'Wall Sticker', 'wall');

      // Surface stickers have anchor.type set to the surface type
      expect(sticker.anchor.type).toBe('wall');
      expect(getSpatialSticker(sticker.id)).toBeDefined();
    });
  });

  describe('Bulk Operations', () => {
    it('should clear all stickers for a canvas', () => {
      const { addSpatialSticker, clearSpatialStickers, getSpatialStickersByCanvas } = useSpatialStickerStore.getState();

      addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1' }));
      addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1' }));
      addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-2' }));

      clearSpatialStickers('canvas-1');

      expect(getSpatialStickersByCanvas('canvas-1')).toHaveLength(0);
      expect(getSpatialStickersByCanvas('canvas-2')).toHaveLength(1);
    });
  });

  describe('Serialization', () => {
    it('should export spatial stickers', () => {
      const { addSpatialSticker, registerQRCode, exportSpatialStickers } = useSpatialStickerStore.getState();

      addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1', name: 'Sticker 1' }));
      addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-1', name: 'Sticker 2' }));
      addSpatialSticker(createSpatialSticker({ canvasId: 'canvas-2', name: 'Sticker 3' }));

      registerQRCode({
        content: 'qr-1',
        sizeMeters: 0.1,
        attachedStickerIds: [],
        isActive: true,
        createdAt: Date.now(),
      });

      const exported = exportSpatialStickers('canvas-1');

      expect(exported.stickers).toHaveLength(2);
      expect(exported.qrCodes).toHaveLength(1);
    });

    it('should import spatial stickers', () => {
      const { importSpatialStickers, getSpatialStickers, getRegisteredQRCode } = useSpatialStickerStore.getState();

      const stickers = [
        createSpatialSticker({ canvasId: 'canvas-1', name: 'Imported 1' }),
        createSpatialSticker({ canvasId: 'canvas-1', name: 'Imported 2' }),
      ];

      const qrCodes: RegisteredQRCode[] = [
        {
          content: 'imported-qr',
          sizeMeters: 0.15,
          attachedStickerIds: [],
          isActive: true,
          createdAt: Date.now(),
        },
      ];

      importSpatialStickers({ stickers, qrCodes });

      expect(getSpatialStickers()).toHaveLength(2);
      expect(getRegisteredQRCode('imported-qr')).toBeDefined();
      expect(getRegisteredQRCode('imported-qr')?.sizeMeters).toBe(0.15);
    });
  });

  describe('Debug Mode', () => {
    it('should toggle debug info', () => {
      const { setShowDebugInfo } = useSpatialStickerStore.getState();

      setShowDebugInfo(true);
      expect(useSpatialStickerStore.getState().showDebugInfo).toBe(true);

      setShowDebugInfo(false);
      expect(useSpatialStickerStore.getState().showDebugInfo).toBe(false);
    });
  });
});
