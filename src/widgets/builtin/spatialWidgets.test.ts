/**
 * Spatial Widgets Test Suite
 * Verifies that all spatial widgets are properly structured and loadable
 */

import { describe, it, expect } from 'vitest';
import {
  GreenScreenPlaneWidget,
  GreenScreenPlaneWidgetManifest,
} from './GreenScreenPlaneWidget';
import {
  PanoramicOverlayWidget,
  PanoramicOverlayWidgetManifest,
} from './PanoramicOverlayWidget';
import { BUILTIN_WIDGETS } from './index';

describe('Spatial Widgets', () => {
  describe('GreenScreenPlaneWidget', () => {
    it('should have valid manifest', () => {
      expect(GreenScreenPlaneWidget.manifest).toBeDefined();
      expect(GreenScreenPlaneWidget.manifest.id).toBe('stickernest.green-screen-plane');
      expect(GreenScreenPlaneWidget.manifest.name).toBe('Green Screen Plane');
      expect(GreenScreenPlaneWidget.manifest.version).toBe('1.0.0');
      expect(GreenScreenPlaneWidget.manifest.kind).toBe('3d');
    });

    it('should have HTML content', () => {
      expect(GreenScreenPlaneWidget.html).toBeDefined();
      expect(GreenScreenPlaneWidget.html).toContain('<!DOCTYPE html>');
      expect(GreenScreenPlaneWidget.html).toContain('GreenScreenPlaneWidget');
    });

    it('should have proper inputs', () => {
      const { inputs } = GreenScreenPlaneWidgetManifest;
      expect(inputs).toBeDefined();
      expect(inputs.setColor).toBeDefined();
      expect(inputs.setColor.type).toBe('string');
      expect(inputs.setSize).toBeDefined();
      expect(inputs.setSize.type).toBe('object');
      expect(inputs.setOpacity).toBeDefined();
      expect(inputs.setOpacity.type).toBe('number');
      expect(inputs.alignToSurface).toBeDefined();
      expect(inputs.toggleEmissive).toBeDefined();
      expect(inputs.toggleEmissive.type).toBe('trigger');
    });

    it('should have proper outputs', () => {
      const { outputs } = GreenScreenPlaneWidgetManifest;
      expect(outputs).toBeDefined();
      expect(outputs.planeData).toBeDefined();
      expect(outputs.planeData.type).toBe('object');
      expect(outputs.surfaceAligned).toBeDefined();
      expect(outputs.colorChanged).toBeDefined();
      expect(outputs.colorChanged.type).toBe('string');
    });

    it('should have 3D capabilities', () => {
      const { capabilities } = GreenScreenPlaneWidgetManifest;
      expect(capabilities).toBeDefined();
      expect(capabilities.supports3d).toBe(true);
      expect(capabilities.draggable).toBe(true);
      expect(capabilities.resizable).toBe(true);
      expect(capabilities.rotatable).toBe(true);
    });

    it('should have io declarations for AI wiring', () => {
      const { io } = GreenScreenPlaneWidgetManifest;
      expect(io).toBeDefined();
      expect(io.inputs).toContain('color.set');
      expect(io.inputs).toContain('size.set');
      expect(io.inputs).toContain('opacity.set');
      expect(io.inputs).toContain('surface.align');
      expect(io.inputs).toContain('emissive.toggle');
      expect(io.outputs).toContain('plane.data');
      expect(io.outputs).toContain('surface.aligned');
      expect(io.outputs).toContain('color.changed');
    });

    it('should have spatial tags', () => {
      const { tags } = GreenScreenPlaneWidgetManifest;
      expect(tags).toBeDefined();
      expect(tags).toContain('green-screen');
      expect(tags).toContain('vr');
      expect(tags).toContain('ar');
      expect(tags).toContain('spatial');
      expect(tags).toContain('chroma-key');
    });

    it('should have size configuration', () => {
      const { size } = GreenScreenPlaneWidgetManifest;
      expect(size).toBeDefined();
      expect(size.width).toBe(280);
      expect(size.height).toBe(200);
      expect(size.minWidth).toBe(200);
      expect(size.minHeight).toBe(150);
    });

    it('should contain green screen UI elements in HTML', () => {
      const html = GreenScreenPlaneWidget.html;
      expect(html).toContain('Green Screen Plane');
      expect(html).toContain('color-presets');
      expect(html).toContain('#00FF00'); // Default green
      expect(html).toContain('emissiveToggle');
      expect(html).toContain('opacitySlider');
    });
  });

  describe('PanoramicOverlayWidget', () => {
    it('should have valid manifest', () => {
      expect(PanoramicOverlayWidget.manifest).toBeDefined();
      expect(PanoramicOverlayWidget.manifest.id).toBe('stickernest.panoramic-overlay');
      expect(PanoramicOverlayWidget.manifest.name).toBe('Panoramic Overlay');
      expect(PanoramicOverlayWidget.manifest.version).toBe('1.0.0');
      expect(PanoramicOverlayWidget.manifest.kind).toBe('3d');
    });

    it('should have HTML content', () => {
      expect(PanoramicOverlayWidget.html).toBeDefined();
      expect(PanoramicOverlayWidget.html).toContain('<!DOCTYPE html>');
      expect(PanoramicOverlayWidget.html).toContain('PanoramicOverlayWidget');
    });

    it('should have proper inputs', () => {
      const { inputs } = PanoramicOverlayWidgetManifest;
      expect(inputs).toBeDefined();
      expect(inputs.setSource).toBeDefined();
      expect(inputs.setSource.type).toBe('string');
      expect(inputs.setRotation).toBeDefined();
      expect(inputs.setRotation.type).toBe('number');
      expect(inputs.setOpacity).toBeDefined();
      expect(inputs.setBlendMode).toBeDefined();
      expect(inputs.setBlendMode.type).toBe('string');
      expect(inputs.play).toBeDefined();
      expect(inputs.play.type).toBe('trigger');
      expect(inputs.pause).toBeDefined();
      expect(inputs.pause.type).toBe('trigger');
    });

    it('should have proper outputs', () => {
      const { outputs } = PanoramicOverlayWidgetManifest;
      expect(outputs).toBeDefined();
      expect(outputs.sourceLoaded).toBeDefined();
      expect(outputs.sourceLoaded.type).toBe('object');
      expect(outputs.playbackState).toBeDefined();
      expect(outputs.playbackState.type).toBe('string');
      expect(outputs.rotationChanged).toBeDefined();
      expect(outputs.rotationChanged.type).toBe('number');
      expect(outputs.textureReady).toBeDefined();
    });

    it('should have 3D capabilities', () => {
      const { capabilities } = PanoramicOverlayWidgetManifest;
      expect(capabilities).toBeDefined();
      expect(capabilities.supports3d).toBe(true);
      expect(capabilities.draggable).toBe(true);
      expect(capabilities.resizable).toBe(true);
      // Panorama rotation shouldn't be rotatable (you use the slider instead)
      expect(capabilities.rotatable).toBe(false);
    });

    it('should have io declarations for AI wiring', () => {
      const { io } = PanoramicOverlayWidgetManifest;
      expect(io).toBeDefined();
      expect(io.inputs).toContain('source.set');
      expect(io.inputs).toContain('rotation.set');
      expect(io.inputs).toContain('opacity.set');
      expect(io.inputs).toContain('blend.set');
      expect(io.inputs).toContain('playback.play');
      expect(io.inputs).toContain('playback.pause');
      expect(io.outputs).toContain('source.loaded');
      expect(io.outputs).toContain('playback.state');
      expect(io.outputs).toContain('rotation.changed');
      expect(io.outputs).toContain('texture.ready');
    });

    it('should have panorama tags', () => {
      const { tags } = PanoramicOverlayWidgetManifest;
      expect(tags).toBeDefined();
      expect(tags).toContain('panorama');
      expect(tags).toContain('360');
      expect(tags).toContain('vr');
      expect(tags).toContain('ar');
      expect(tags).toContain('skybox');
      expect(tags).toContain('environment');
    });

    it('should have size configuration with aspect ratio', () => {
      const { size } = PanoramicOverlayWidgetManifest;
      expect(size).toBeDefined();
      expect(size.width).toBe(320);
      expect(size.height).toBe(240);
      expect(size.aspectRatio).toBe(4 / 3);
    });

    it('should contain panorama presets in HTML', () => {
      const html = PanoramicOverlayWidget.html;
      expect(html).toContain('preset:stars');
      expect(html).toContain('preset:sunset');
      expect(html).toContain('preset:mountains');
      expect(html).toContain('preset:studio');
      expect(html).toContain('preset:gradient');
    });

    it('should contain video controls in HTML', () => {
      const html = PanoramicOverlayWidget.html;
      expect(html).toContain('video-controls');
      expect(html).toContain('playPauseBtn');
      expect(html).toContain('videoProgress');
    });

    it('should contain blend mode options in HTML', () => {
      const html = PanoramicOverlayWidget.html;
      expect(html).toContain('blendSelect');
      expect(html).toContain('normal');
      expect(html).toContain('multiply');
      expect(html).toContain('screen');
      expect(html).toContain('overlay');
    });
  });

  describe('BUILTIN_WIDGETS registry', () => {
    it('should contain green screen plane widget', () => {
      expect(BUILTIN_WIDGETS['stickernest.green-screen-plane']).toBeDefined();
      expect(BUILTIN_WIDGETS['stickernest.green-screen-plane'].manifest.id).toBe('stickernest.green-screen-plane');
    });

    it('should contain panoramic overlay widget', () => {
      expect(BUILTIN_WIDGETS['stickernest.panoramic-overlay']).toBeDefined();
      expect(BUILTIN_WIDGETS['stickernest.panoramic-overlay'].manifest.id).toBe('stickernest.panoramic-overlay');
    });

    it('should have valid manifests for spatial widgets', () => {
      const spatialWidgetIds = [
        'stickernest.green-screen-plane',
        'stickernest.panoramic-overlay',
      ];

      for (const id of spatialWidgetIds) {
        const widget = BUILTIN_WIDGETS[id];
        expect(widget).toBeDefined();
        expect(widget.manifest.id).toBe(id);
        expect(widget.manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(widget.manifest.kind).toBe('3d');
        expect(widget.html).toBeDefined();
        expect(widget.html.length).toBeGreaterThan(100);
      }
    });

    it('should have unique widget IDs for spatial widgets', () => {
      const spatialIds = Object.keys(BUILTIN_WIDGETS).filter(id =>
        id.includes('green-screen') || id.includes('panoramic')
      );
      const uniqueIds = new Set(spatialIds);
      expect(uniqueIds.size).toBe(spatialIds.length);
    });
  });

  describe('Widget Cross-compatibility', () => {
    it('green screen and panoramic widgets should work together', () => {
      // Both widgets should have compatible io for chaining
      const greenIo = GreenScreenPlaneWidgetManifest.io;
      const panoIo = PanoramicOverlayWidgetManifest.io;

      // Both have opacity outputs that could be used for compositing
      expect(greenIo.outputs).toContain('plane.data');
      expect(panoIo.outputs).toContain('texture.ready');
    });

    it('both widgets should support 3D mode', () => {
      expect(GreenScreenPlaneWidgetManifest.capabilities.supports3d).toBe(true);
      expect(PanoramicOverlayWidgetManifest.capabilities.supports3d).toBe(true);
    });

    it('both widgets should have VR/AR tags', () => {
      expect(GreenScreenPlaneWidgetManifest.tags).toContain('vr');
      expect(GreenScreenPlaneWidgetManifest.tags).toContain('ar');
      expect(PanoramicOverlayWidgetManifest.tags).toContain('vr');
      expect(PanoramicOverlayWidgetManifest.tags).toContain('ar');
    });
  });
});
