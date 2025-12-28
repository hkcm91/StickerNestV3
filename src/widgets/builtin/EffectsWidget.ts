/**
 * StickerNest v2 - Effects Widget
 *
 * Visual effects controls: shadow, blur, opacity, blend modes.
 * Skinnable widget following the established pattern.
 *
 * Features:
 * - Drop shadow (blur, offset, color)
 * - Opacity slider
 * - Blur effect
 * - Blend mode selector
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

// ============================================================================
// Manifest
// ============================================================================

export const EffectsManifest: WidgetManifest = {
  id: 'stickernest.effects',
  name: 'Effects',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Visual effects: shadow, blur, opacity, blend modes for entities.',
  author: 'StickerNest',
  tags: ['effects', 'shadow', 'blur', 'opacity', 'blend', 'design', 'tools', 'vector-tools', 'canvas-tools'],

  inputs: {
    'effects.set': {
      type: 'object',
      description: 'Set effects { shadow, opacity, blur, blendMode }',
    },
    'selection.info': {
      type: 'object',
      description: 'Info about selected entity',
    },
    'skin.apply': {
      type: 'object',
      description: 'Apply skin overrides',
    },
  },

  outputs: {
    'effects.changed': {
      type: 'object',
      description: 'Effects changed',
    },
    'shadow.changed': {
      type: 'object',
      description: 'Shadow settings changed',
    },
  },

  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },

  size: {
    width: 220,
    height: 320,
    minWidth: 180,
    minHeight: 240,
    maxWidth: 300,
    maxHeight: 420,
  },

  io: {
    inputs: ['effects.set', 'selection.info', 'skin.apply'],
    outputs: ['effects.changed', 'shadow.changed'],
  },

  events: {
    emits: ['effects:changed', 'canvas:style-changed'],
    listens: ['entity:selected'],
  },

  skin: {
    themeable: true,
    defaultSkin: 'effects-default',
    slots: [
      { name: 'panel-bg', type: 'color', defaultValue: '#1a1a2e', description: 'Panel background' },
      { name: 'input-bg', type: 'color', defaultValue: '#252538', description: 'Input background' },
      { name: 'slider-track', type: 'color', defaultValue: '#252538', description: 'Slider track' },
      { name: 'slider-thumb', type: 'color', defaultValue: '#8b5cf6', description: 'Slider thumb' },
    ],
    usesVariables: ['--sn-bg-secondary', '--sn-text-secondary', '--sn-accent-primary'],
  },
};

// ============================================================================
// HTML Template
// ============================================================================

export const EffectsHTML = `
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
      overflow-y: auto;
      overflow-x: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    :root {
      --panel-bg: var(--sn-panel-bg, var(--sn-bg-secondary, #1a1a2e));
      --input-bg: var(--sn-input-bg, #252538);
      --input-border: var(--sn-input-border, rgba(139, 92, 246, 0.2));
      --slider-track: var(--sn-slider-track, #252538);
      --slider-thumb: var(--sn-slider-thumb, var(--sn-accent-primary, #8b5cf6));
      --text-color: var(--sn-text-primary, #e2e8f0);
      --label-color: var(--sn-text-secondary, #94a3b8);
    }

    .panel {
      width: 100%;
      min-height: 100%;
      background: var(--panel-bg);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--label-color);
    }

    .toggle {
      width: 36px;
      height: 20px;
      background: var(--input-bg);
      border-radius: 10px;
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
    }

    .toggle.active {
      background: var(--slider-thumb);
    }

    .toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .toggle.active::after {
      transform: translateX(16px);
    }

    .slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .slider-row .mini-label {
      font-size: 9px;
      color: var(--label-color);
      text-transform: uppercase;
      width: 50px;
    }

    .slider-row input[type="range"] {
      flex: 1;
      -webkit-appearance: none;
      height: 4px;
      background: var(--slider-track);
      border-radius: 2px;
      outline: none;
    }

    .slider-row input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      background: var(--slider-thumb);
      border-radius: 50%;
      cursor: pointer;
    }

    .slider-row .value {
      width: 40px;
      text-align: right;
      font-size: 11px;
      color: var(--text-color);
      font-family: 'Monaco', 'Menlo', monospace;
    }

    .color-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .color-row .mini-label {
      font-size: 9px;
      color: var(--label-color);
      text-transform: uppercase;
      width: 50px;
    }

    .color-swatch {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 2px solid rgba(255,255,255,0.2);
      cursor: pointer;
    }

    .color-input {
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
      pointer-events: none;
    }

    .color-hex {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 11px;
      color: var(--label-color);
    }

    select {
      width: 100%;
      padding: 8px 10px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      color: var(--text-color);
      font-size: 12px;
      outline: none;
    }

    select:focus {
      border-color: var(--slider-thumb);
    }

    .preview-box {
      width: 100%;
      height: 60px;
      background: var(--input-bg);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .preview-shape {
      width: 40px;
      height: 40px;
      background: var(--slider-thumb);
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="panel">
    <!-- Opacity -->
    <div class="section">
      <div class="label">Opacity</div>
      <div class="slider-row">
        <input type="range" id="opacity" min="0" max="100" value="100">
        <span class="value" id="opacity-value">100%</span>
      </div>
    </div>

    <!-- Shadow -->
    <div class="section">
      <div class="section-header">
        <span class="label">Drop Shadow</span>
        <div class="toggle active" id="shadow-toggle"></div>
      </div>
      <div id="shadow-controls">
        <div class="slider-row">
          <span class="mini-label">Blur</span>
          <input type="range" id="shadow-blur" min="0" max="50" value="10">
          <span class="value" id="shadow-blur-value">10px</span>
        </div>
        <div class="slider-row">
          <span class="mini-label">Offset X</span>
          <input type="range" id="shadow-x" min="-50" max="50" value="0">
          <span class="value" id="shadow-x-value">0px</span>
        </div>
        <div class="slider-row">
          <span class="mini-label">Offset Y</span>
          <input type="range" id="shadow-y" min="-50" max="50" value="4">
          <span class="value" id="shadow-y-value">4px</span>
        </div>
        <div class="color-row">
          <span class="mini-label">Color</span>
          <div class="color-swatch" id="shadow-color-swatch" style="background: rgba(0,0,0,0.3)"></div>
          <span class="color-hex" id="shadow-color-hex">rgba(0,0,0,0.3)</span>
          <input type="color" class="color-input" id="shadow-color-input" value="#000000">
        </div>
      </div>
    </div>

    <!-- Blur -->
    <div class="section">
      <div class="label">Blur</div>
      <div class="slider-row">
        <input type="range" id="blur" min="0" max="20" value="0" step="0.5">
        <span class="value" id="blur-value">0px</span>
      </div>
    </div>

    <!-- Blend Mode -->
    <div class="section">
      <div class="label">Blend Mode</div>
      <select id="blend-mode">
        <option value="normal">Normal</option>
        <option value="multiply">Multiply</option>
        <option value="screen">Screen</option>
        <option value="overlay">Overlay</option>
        <option value="darken">Darken</option>
        <option value="lighten">Lighten</option>
        <option value="color-dodge">Color Dodge</option>
        <option value="color-burn">Color Burn</option>
        <option value="hard-light">Hard Light</option>
        <option value="soft-light">Soft Light</option>
        <option value="difference">Difference</option>
        <option value="exclusion">Exclusion</option>
        <option value="hue">Hue</option>
        <option value="saturation">Saturation</option>
        <option value="color">Color</option>
        <option value="luminosity">Luminosity</option>
      </select>
    </div>

    <!-- Preview -->
    <div class="section">
      <div class="label">Preview</div>
      <div class="preview-box">
        <div class="preview-shape" id="preview-shape"></div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // ================================================================
      // State
      // ================================================================
      let state = {
        opacity: 100,
        shadow: {
          enabled: true,
          blur: 10,
          x: 0,
          y: 4,
          color: 'rgba(0,0,0,0.3)',
        },
        blur: 0,
        blendMode: 'normal',
      };

      // ================================================================
      // DOM References
      // ================================================================
      const opacitySlider = document.getElementById('opacity');
      const opacityValue = document.getElementById('opacity-value');
      const shadowToggle = document.getElementById('shadow-toggle');
      const shadowControls = document.getElementById('shadow-controls');
      const shadowBlur = document.getElementById('shadow-blur');
      const shadowBlurValue = document.getElementById('shadow-blur-value');
      const shadowX = document.getElementById('shadow-x');
      const shadowXValue = document.getElementById('shadow-x-value');
      const shadowY = document.getElementById('shadow-y');
      const shadowYValue = document.getElementById('shadow-y-value');
      const shadowColorSwatch = document.getElementById('shadow-color-swatch');
      const shadowColorHex = document.getElementById('shadow-color-hex');
      const shadowColorInput = document.getElementById('shadow-color-input');
      const blurSlider = document.getElementById('blur');
      const blurValue = document.getElementById('blur-value');
      const blendModeSelect = document.getElementById('blend-mode');
      const previewShape = document.getElementById('preview-shape');

      // ================================================================
      // UI Updates
      // ================================================================
      function updateUI() {
        opacitySlider.value = state.opacity;
        opacityValue.textContent = state.opacity + '%';

        shadowToggle.classList.toggle('active', state.shadow.enabled);
        shadowControls.style.display = state.shadow.enabled ? 'block' : 'none';
        shadowBlur.value = state.shadow.blur;
        shadowBlurValue.textContent = state.shadow.blur + 'px';
        shadowX.value = state.shadow.x;
        shadowXValue.textContent = state.shadow.x + 'px';
        shadowY.value = state.shadow.y;
        shadowYValue.textContent = state.shadow.y + 'px';
        shadowColorSwatch.style.background = state.shadow.color;
        shadowColorHex.textContent = state.shadow.color;

        blurSlider.value = state.blur;
        blurValue.textContent = state.blur + 'px';

        blendModeSelect.value = state.blendMode;

        updatePreview();
      }

      function updatePreview() {
        const shadow = state.shadow.enabled
          ? state.shadow.x + 'px ' + state.shadow.y + 'px ' + state.shadow.blur + 'px ' + state.shadow.color
          : 'none';

        previewShape.style.opacity = state.opacity / 100;
        previewShape.style.boxShadow = shadow;
        previewShape.style.filter = state.blur > 0 ? 'blur(' + state.blur + 'px)' : 'none';
        previewShape.style.mixBlendMode = state.blendMode;
      }

      function emitChanges() {
        API.setState(state);
        API.emitOutput('effects.changed', state);
        API.emit('effects:changed', state);

        // Emit for entities
        API.emit('canvas:style-changed', {
          targetType: 'shape',
          styles: {
            opacity: state.opacity,
            shadow: state.shadow,
            blur: state.blur,
            blendMode: state.blendMode,
          },
        });
      }

      // ================================================================
      // Event Handlers
      // ================================================================
      opacitySlider.addEventListener('input', (e) => {
        state.opacity = parseInt(e.target.value);
        opacityValue.textContent = state.opacity + '%';
        updatePreview();
        emitChanges();
      });

      shadowToggle.addEventListener('click', () => {
        state.shadow.enabled = !state.shadow.enabled;
        updateUI();
        emitChanges();
      });

      shadowBlur.addEventListener('input', (e) => {
        state.shadow.blur = parseInt(e.target.value);
        shadowBlurValue.textContent = state.shadow.blur + 'px';
        updatePreview();
        emitChanges();
      });

      shadowX.addEventListener('input', (e) => {
        state.shadow.x = parseInt(e.target.value);
        shadowXValue.textContent = state.shadow.x + 'px';
        updatePreview();
        emitChanges();
      });

      shadowY.addEventListener('input', (e) => {
        state.shadow.y = parseInt(e.target.value);
        shadowYValue.textContent = state.shadow.y + 'px';
        updatePreview();
        emitChanges();
      });

      shadowColorSwatch.addEventListener('click', () => {
        shadowColorInput.click();
      });

      shadowColorInput.addEventListener('input', (e) => {
        // Convert hex to rgba with 0.3 alpha
        const hex = e.target.value;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        state.shadow.color = 'rgba(' + r + ',' + g + ',' + b + ',0.3)';
        shadowColorSwatch.style.background = state.shadow.color;
        shadowColorHex.textContent = state.shadow.color;
        updatePreview();
        emitChanges();
      });

      blurSlider.addEventListener('input', (e) => {
        state.blur = parseFloat(e.target.value);
        blurValue.textContent = state.blur + 'px';
        updatePreview();
        emitChanges();
      });

      blendModeSelect.addEventListener('change', (e) => {
        state.blendMode = e.target.value;
        updatePreview();
        emitChanges();
      });

      // ================================================================
      // API Handlers
      // ================================================================
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        updateUI();
        API.log('Effects mounted');
      });

      API.onInput('effects.set', function(effects) {
        if (!effects) return;
        state = { ...state, ...effects };
        updateUI();
      });

      API.onInput('selection.info', function(info) {
        if (info && info.effects) {
          state = { ...state, ...info.effects };
          updateUI();
        }
      });

      API.on('entity:selected', function(event) {
        if (event) {
          if (event.opacity !== undefined) state.opacity = event.opacity;
          if (event.shadow) state.shadow = { ...state.shadow, ...event.shadow };
          if (event.blur !== undefined) state.blur = event.blur;
          if (event.blendMode) state.blendMode = event.blendMode;
          updateUI();
        }
      });

      API.onInput('skin.apply', function(overrides) {
        if (!overrides) return;
        const root = document.documentElement;
        for (const [key, value] of Object.entries(overrides)) {
          const varName = key.startsWith('--') ? key : '--sn-' + key;
          root.style.setProperty(varName, value);
        }
      });

      API.onDestroy(function() {
        API.log('Effects destroyed');
      });
    })();
  </script>
</body>
</html>
`;

// ============================================================================
// Export
// ============================================================================

export const EffectsWidget: BuiltinWidget = {
  manifest: EffectsManifest,
  html: EffectsHTML,
};
