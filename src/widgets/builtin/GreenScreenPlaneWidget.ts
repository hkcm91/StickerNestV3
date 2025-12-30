/**
 * StickerNest v2 - Green Screen Plane Widget
 *
 * Places virtual green screen planes in VR/AR space.
 * Maps physical walls/surfaces to green screens for compositing.
 * Use with WebcamWidget's chroma key to replace backgrounds.
 *
 * Features:
 * - Place green screen planes on room surfaces
 * - Adjustable size, color, and opacity
 * - AR surface detection integration
 * - Outputs plane data for external compositors
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const GreenScreenPlaneWidgetManifest: WidgetManifest = {
  id: 'stickernest.green-screen-plane',
  name: 'Green Screen Plane',
  version: '1.0.0',
  kind: '3d',
  entry: 'index.html',
  description: 'Place virtual green screen planes on room surfaces for VR/AR compositing',
  author: 'StickerNest',
  tags: ['green-screen', 'vr', 'ar', 'compositing', 'spatial', 'room-mapping', 'chroma-key'],
  inputs: {
    setColor: {
      type: 'string',
      description: 'Set green screen color (hex)',
    },
    setSize: {
      type: 'object',
      description: 'Set plane size { width, height } in meters',
    },
    setOpacity: {
      type: 'number',
      description: 'Set plane opacity (0-1)',
    },
    alignToSurface: {
      type: 'object',
      description: 'Align to detected surface { position, normal }',
    },
    toggleEmissive: {
      type: 'trigger',
      description: 'Toggle emissive (self-lit) mode',
    },
  },
  outputs: {
    planeData: {
      type: 'object',
      description: 'Plane transform data { position, rotation, size, color }',
    },
    surfaceAligned: {
      type: 'object',
      description: 'Emitted when aligned to AR surface',
    },
    colorChanged: {
      type: 'string',
      description: 'Emitted when color changes',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
    supports3d: true,
  },
  io: {
    inputs: ['color.set', 'size.set', 'opacity.set', 'surface.align', 'emissive.toggle'],
    outputs: ['plane.data', 'surface.aligned', 'color.changed'],
  },
  size: {
    width: 280,
    height: 200,
    minWidth: 200,
    minHeight: 150,
    scaleMode: 'scale',
  },
};

export const GreenScreenPlaneWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container {
      width: 100%;
      height: 100%;
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .header-icon {
      font-size: 20px;
    }
    .header-title {
      font-size: 14px;
      font-weight: 600;
    }

    /* Preview */
    .preview-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }
    .preview-plane {
      width: 80%;
      height: 70%;
      border-radius: 4px;
      position: relative;
      transition: all 0.2s ease;
    }
    .preview-plane.emissive {
      box-shadow: 0 0 40px currentColor;
    }
    .preview-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px);
      background-size: 20px 20px;
      pointer-events: none;
    }
    .preview-label {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 11px;
      color: rgba(0,0,0,0.7);
      background: rgba(255,255,255,0.2);
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
    }

    /* Controls */
    .controls {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .control-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .control-label {
      font-size: 12px;
      color: var(--sn-text-secondary, #94a3b8);
      min-width: 60px;
    }

    /* Color presets */
    .color-presets {
      display: flex;
      gap: 6px;
    }
    .color-preset {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .color-preset:hover {
      transform: scale(1.1);
    }
    .color-preset.selected {
      border-color: white;
    }
    .color-preset.custom {
      background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
      position: relative;
    }
    .color-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }

    /* Size inputs */
    .size-inputs {
      display: flex;
      gap: 8px;
      flex: 1;
    }
    .size-input-group {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
    }
    .size-input {
      width: 100%;
      height: 32px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 6px;
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      padding: 0 8px;
      text-align: center;
    }
    .size-input:focus {
      outline: none;
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .size-unit {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    /* Slider */
    .slider-container {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    input[type="range"] {
      flex: 1;
      height: 32px;
      -webkit-appearance: none;
      background: transparent;
    }
    input[type="range"]::-webkit-slider-track {
      height: 4px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 2px;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      cursor: pointer;
      margin-top: -6px;
    }
    .slider-value {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      min-width: 36px;
      text-align: right;
    }

    /* Toggle */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .toggle {
      width: 44px;
      height: 24px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 12px;
      position: relative;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .toggle.on {
      background: var(--sn-accent-primary, #8b5cf6);
    }
    .toggle::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      top: 3px;
      left: 3px;
      transition: transform 0.2s ease;
    }
    .toggle.on::after {
      transform: translateX(20px);
    }

    /* Status */
    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
      padding-top: 8px;
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 4px;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--sn-success, #22c55e);
    }
    .status-dot.inactive {
      background: var(--sn-text-secondary, #94a3b8);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="header-icon">🟢</span>
      <span class="header-title">Green Screen Plane</span>
    </div>

    <div class="preview-container">
      <div class="preview-plane" id="previewPlane">
        <div class="preview-grid"></div>
        <div class="preview-label" id="sizeLabel">2.0m × 1.5m</div>
      </div>
    </div>

    <div class="controls">
      <div class="control-row">
        <span class="control-label">Color</span>
        <div class="color-presets" id="colorPresets">
          <div class="color-preset selected" data-color="#00FF00" style="background: #00FF00;" title="Green"></div>
          <div class="color-preset" data-color="#0000FF" style="background: #0000FF;" title="Blue"></div>
          <div class="color-preset" data-color="#FF00FF" style="background: #FF00FF;" title="Magenta"></div>
          <div class="color-preset" data-color="#FFFFFF" style="background: #FFFFFF;" title="White"></div>
          <div class="color-preset custom" title="Custom">
            <input type="color" class="color-input" id="customColor" value="#00FF00">
          </div>
        </div>
      </div>

      <div class="control-row">
        <span class="control-label">Size</span>
        <div class="size-inputs">
          <div class="size-input-group">
            <input type="number" class="size-input" id="widthInput" value="2.0" min="0.5" max="10" step="0.1">
            <span class="size-unit">m</span>
          </div>
          <span style="color: var(--sn-text-secondary);">×</span>
          <div class="size-input-group">
            <input type="number" class="size-input" id="heightInput" value="1.5" min="0.5" max="10" step="0.1">
            <span class="size-unit">m</span>
          </div>
        </div>
      </div>

      <div class="control-row">
        <span class="control-label">Opacity</span>
        <div class="slider-container">
          <input type="range" id="opacitySlider" min="0" max="100" value="100">
          <span class="slider-value" id="opacityValue">100%</span>
        </div>
      </div>

      <div class="control-row toggle-row">
        <span class="control-label">Emissive</span>
        <div class="toggle" id="emissiveToggle" title="Self-illuminated (glows in VR)"></div>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-badge">
        <div class="status-dot" id="statusDot"></div>
        <span id="statusText">Ready</span>
      </div>
      <span id="modeLabel">Desktop</span>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // DOM
      const previewPlane = document.getElementById('previewPlane');
      const sizeLabel = document.getElementById('sizeLabel');
      const colorPresets = document.getElementById('colorPresets');
      const customColor = document.getElementById('customColor');
      const widthInput = document.getElementById('widthInput');
      const heightInput = document.getElementById('heightInput');
      const opacitySlider = document.getElementById('opacitySlider');
      const opacityValue = document.getElementById('opacityValue');
      const emissiveToggle = document.getElementById('emissiveToggle');
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');
      const modeLabel = document.getElementById('modeLabel');

      // State
      let state = {
        color: '#00FF00',
        width: 2.0,
        height: 1.5,
        opacity: 1.0,
        emissive: false,
        position: { x: 0, y: 1.5, z: -2 },
        rotation: { x: 0, y: 0, z: 0 },
        surfaceId: null,
      };

      // Update preview
      function updatePreview() {
        previewPlane.style.backgroundColor = state.color;
        previewPlane.style.opacity = state.opacity;
        previewPlane.classList.toggle('emissive', state.emissive);
        sizeLabel.textContent = state.width.toFixed(1) + 'm × ' + state.height.toFixed(1) + 'm';

        // Adjust preview aspect ratio
        const aspectRatio = state.width / state.height;
        if (aspectRatio > 1.5) {
          previewPlane.style.width = '85%';
          previewPlane.style.height = (85 / aspectRatio) + '%';
        } else {
          previewPlane.style.height = '70%';
          previewPlane.style.width = (70 * aspectRatio) + '%';
        }
      }

      // Emit plane data
      function emitPlaneData() {
        const data = {
          color: state.color,
          width: state.width,
          height: state.height,
          opacity: state.opacity,
          emissive: state.emissive,
          position: state.position,
          rotation: state.rotation,
          surfaceId: state.surfaceId,
        };
        API.emitOutput('plane.data', data);
        API.setState(state);
      }

      // Color selection
      colorPresets.addEventListener('click', (e) => {
        const preset = e.target.closest('.color-preset');
        if (!preset || preset.classList.contains('custom')) return;

        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
        preset.classList.add('selected');
        state.color = preset.dataset.color;
        updatePreview();
        emitPlaneData();
        API.emitOutput('color.changed', state.color);
      });

      customColor.addEventListener('input', (e) => {
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
        customColor.parentElement.classList.add('selected');
        state.color = e.target.value;
        updatePreview();
        emitPlaneData();
        API.emitOutput('color.changed', state.color);
      });

      // Size inputs
      widthInput.addEventListener('change', () => {
        state.width = Math.max(0.5, Math.min(10, parseFloat(widthInput.value) || 2));
        widthInput.value = state.width.toFixed(1);
        updatePreview();
        emitPlaneData();
      });

      heightInput.addEventListener('change', () => {
        state.height = Math.max(0.5, Math.min(10, parseFloat(heightInput.value) || 1.5));
        heightInput.value = state.height.toFixed(1);
        updatePreview();
        emitPlaneData();
      });

      // Opacity slider
      opacitySlider.addEventListener('input', () => {
        state.opacity = opacitySlider.value / 100;
        opacityValue.textContent = opacitySlider.value + '%';
        updatePreview();
        emitPlaneData();
      });

      // Emissive toggle
      emissiveToggle.addEventListener('click', () => {
        state.emissive = !state.emissive;
        emissiveToggle.classList.toggle('on', state.emissive);
        updatePreview();
        emitPlaneData();
      });

      // Widget API
      API.onMount(function(context) {
        const savedState = context.state || {};
        Object.assign(state, savedState);

        // Restore UI
        widthInput.value = state.width.toFixed(1);
        heightInput.value = state.height.toFixed(1);
        opacitySlider.value = state.opacity * 100;
        opacityValue.textContent = Math.round(state.opacity * 100) + '%';
        emissiveToggle.classList.toggle('on', state.emissive);
        customColor.value = state.color;

        // Select matching color preset
        const matchingPreset = document.querySelector('.color-preset[data-color="' + state.color + '"]');
        if (matchingPreset) {
          document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
          matchingPreset.classList.add('selected');
        }

        updatePreview();
        API.log('GreenScreenPlaneWidget mounted');
      });

      // Input handlers
      API.onInput('color.set', function(color) {
        state.color = color;
        customColor.value = color;
        updatePreview();
        emitPlaneData();
        API.emitOutput('color.changed', color);
      });

      API.onInput('size.set', function(size) {
        if (size.width) state.width = size.width;
        if (size.height) state.height = size.height;
        widthInput.value = state.width.toFixed(1);
        heightInput.value = state.height.toFixed(1);
        updatePreview();
        emitPlaneData();
      });

      API.onInput('opacity.set', function(opacity) {
        state.opacity = Math.max(0, Math.min(1, opacity));
        opacitySlider.value = state.opacity * 100;
        opacityValue.textContent = Math.round(state.opacity * 100) + '%';
        updatePreview();
        emitPlaneData();
      });

      API.onInput('surface.align', function(surface) {
        state.position = surface.position || state.position;
        state.rotation = surface.rotation || state.rotation;
        state.surfaceId = surface.id || null;

        statusDot.classList.remove('inactive');
        statusText.textContent = 'Aligned to surface';
        modeLabel.textContent = 'AR Mode';

        API.emitOutput('surface.aligned', {
          surfaceId: state.surfaceId,
          position: state.position,
          rotation: state.rotation,
        });

        emitPlaneData();
      });

      API.onInput('emissive.toggle', function() {
        state.emissive = !state.emissive;
        emissiveToggle.classList.toggle('on', state.emissive);
        updatePreview();
        emitPlaneData();
      });

      // Listen for mode changes
      API.on('spatialMode', function(mode) {
        modeLabel.textContent = mode === 'ar' ? 'AR Mode' : mode === 'vr' ? 'VR Mode' : 'Desktop';
      });

      API.onDestroy(function() {
        API.log('GreenScreenPlaneWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const GreenScreenPlaneWidget: BuiltinWidget = {
  manifest: GreenScreenPlaneWidgetManifest,
  html: GreenScreenPlaneWidgetHTML,
};
