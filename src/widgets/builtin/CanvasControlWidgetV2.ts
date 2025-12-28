/**
 * StickerNest v2 - Canvas Control Widget (Enhanced X5)
 *
 * Unified canvas property panel with background, filters, grid,
 * proper pipeline I/O, and useCanvasController integration.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const CanvasControlWidgetV2Manifest: WidgetManifest = {
  id: 'stickernest.canvas-control-v2',
  name: 'Canvas Control Pro',
  version: '2.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Unified canvas control panel for background, filters, grid, and overlay settings',
  author: 'StickerNest',
  tags: ['canvas', 'background', 'filter', 'grid', 'overlay', 'control'],
  capabilities: {
    draggable: true,
    resizable: true,
  },
  inputs: {
    'background.set': {
      type: 'object',
      description: 'Set background color or gradient',
    },
    'filters.set': {
      type: 'object',
      description: 'Set canvas filter values',
    },
    'grid.toggle': {
      type: 'boolean',
      description: 'Toggle grid visibility',
    },
  },
  outputs: {
    'background.changed': {
      type: 'object',
      description: 'Emitted when background changes',
    },
    'filters.changed': {
      type: 'object',
      description: 'Emitted when filters change',
    },
    'settings.changed': {
      type: 'object',
      description: 'All settings changed',
    },
  },
  events: {
    emits: ['canvas:set-background-color', 'canvas:set-background', 'canvas:set-filters', 'canvas:set-overlay'],
    listens: [],
  },
  io: {
    inputs: ['background.set', 'filters.set', 'grid.toggle'],
    outputs: ['background.changed', 'filters.changed', 'settings.changed'],
  },
  size: {
    width: 300,
    height: 520,
    minWidth: 260,
    minHeight: 450,
    maxWidth: 380,
  },
};

export const CanvasControlWidgetV2HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    :root {
      --sn-bg-primary: #0f0f19;
      --sn-bg-secondary: #1a1a2e;
      --sn-bg-tertiary: #252538;
      --sn-text-primary: #e2e8f0;
      --sn-text-secondary: #94a3b8;
      --sn-text-muted: #64748b;
      --sn-accent-primary: #8b5cf6;
      --sn-accent-secondary: #a78bfa;
      --sn-border-primary: rgba(139, 92, 246, 0.2);
      --sn-border-hover: rgba(139, 92, 246, 0.4);
      --sn-radius-sm: 4px;
      --sn-radius-md: 6px;
      --sn-radius-lg: 8px;
      --sn-transition: 0.15s ease;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--sn-bg-primary);
      color: var(--sn-text-primary);
    }

    body { display: flex; flex-direction: column; }

    /* Header */
    .header {
      padding: 12px;
      background: var(--sn-bg-tertiary);
      border-bottom: 1px solid var(--sn-border-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header svg { width: 18px; height: 18px; color: var(--sn-accent-primary); }
    .header span { font-size: 14px; font-weight: 600; }

    /* Controls Panel */
    .controls-panel {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--sn-bg-secondary);
      padding: 12px;
      -webkit-overflow-scrolling: touch;
    }

    .control-section {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--sn-border-primary);
    }

    .control-section:last-child { border-bottom: none; }

    .section-header {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sn-text-secondary);
      margin-bottom: 10px;
    }

    .control-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .control-group { flex: 1; min-width: 0; }
    .control-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--sn-text-secondary); margin-bottom: 4px; }
    .control-value { color: var(--sn-accent-primary); font-weight: 600; font-size: 10px; font-family: monospace; }

    /* Color Grid */
    .color-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 4px;
      margin-bottom: 10px;
    }

    .color-btn {
      aspect-ratio: 1;
      border: 2px solid transparent;
      border-radius: var(--sn-radius-sm);
      cursor: pointer;
      transition: all var(--sn-transition);
    }

    .color-btn:hover { transform: scale(1.1); border-color: var(--sn-accent-primary); }
    .color-btn.active { border-color: white; }

    /* Color Picker Row */
    .picker-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    input[type="color"] {
      width: 40px;
      height: 32px;
      padding: 0;
      border: 2px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      cursor: pointer;
      background: none;
    }

    input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
    input[type="color"]::-webkit-color-swatch { border: none; border-radius: 2px; }

    .color-input {
      flex: 1;
      padding: 8px 10px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-primary);
      font-size: 12px;
      font-family: monospace;
    }

    .color-input:focus { outline: none; border-color: var(--sn-accent-primary); }

    /* Range Sliders */
    input[type="range"] {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      background: var(--sn-bg-primary);
      border-radius: 3px;
      cursor: pointer;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px; height: 16px;
      background: var(--sn-accent-primary);
      border-radius: 50%;
      cursor: pointer;
    }

    /* Toggle Row */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      background: var(--sn-bg-primary);
      border-radius: var(--sn-radius-sm);
      margin-bottom: 8px;
    }

    .toggle-label { font-size: 11px; color: var(--sn-text-secondary); }

    .toggle-switch {
      position: relative;
      width: 36px; height: 20px;
      background: var(--sn-bg-tertiary);
      border-radius: 10px;
      cursor: pointer;
      transition: all var(--sn-transition);
    }

    .toggle-switch.active { background: var(--sn-accent-primary); }

    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px; left: 2px;
      width: 16px; height: 16px;
      background: white;
      border-radius: 50%;
      transition: all var(--sn-transition);
    }

    .toggle-switch.active::after { left: 18px; }

    /* Gradient Buttons */
    .gradient-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .gradient-btn {
      height: 32px;
      border: 2px solid transparent;
      border-radius: var(--sn-radius-sm);
      cursor: pointer;
      transition: all var(--sn-transition);
    }

    .gradient-btn:hover { border-color: var(--sn-accent-primary); }
    .gradient-btn.active { border-color: white; }

    /* Reset Button */
    .reset-btn {
      width: 100%;
      padding: 10px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-md);
      color: var(--sn-text-secondary);
      font-size: 12px;
      cursor: pointer;
      transition: all var(--sn-transition);
      margin-top: 8px;
    }

    .reset-btn:hover { border-color: var(--sn-accent-primary); color: var(--sn-accent-primary); }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--sn-bg-primary); }
    ::-webkit-scrollbar-thumb { background: var(--sn-bg-tertiary); border-radius: 3px; }

    @media (pointer: coarse) {
      .color-btn { min-width: 36px; min-height: 36px; }
      .toggle-switch { width: 44px; height: 24px; }
      .toggle-switch::after { width: 20px; height: 20px; }
      .toggle-switch.active::after { left: 22px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/>
    </svg>
    <span>Canvas Control</span>
  </div>

  <div class="controls-panel">
    <!-- Background Color -->
    <div class="control-section">
      <div class="section-header">Background Color</div>
      <div class="color-grid" id="colorGrid"></div>
      <div class="picker-row">
        <input type="color" id="colorPicker" value="#1a1a2e">
        <input type="text" class="color-input" id="colorInput" value="#1A1A2E" maxlength="7">
      </div>
    </div>

    <!-- Gradients -->
    <div class="control-section">
      <div class="section-header">Gradients</div>
      <div class="gradient-grid" id="gradientGrid"></div>
    </div>

    <!-- Filters -->
    <div class="control-section">
      <div class="section-header">Canvas Filters</div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label"><span>Brightness</span><span class="control-value" id="brightnessValue">100%</span></div>
          <input type="range" id="brightness" min="0" max="200" value="100">
        </div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label"><span>Contrast</span><span class="control-value" id="contrastValue">100%</span></div>
          <input type="range" id="contrast" min="0" max="200" value="100">
        </div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label"><span>Saturation</span><span class="control-value" id="saturationValue">100%</span></div>
          <input type="range" id="saturation" min="0" max="200" value="100">
        </div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label"><span>Blur</span><span class="control-value" id="blurValue">0px</span></div>
          <input type="range" id="blur" min="0" max="20" value="0">
        </div>
      </div>
    </div>

    <!-- Overlay -->
    <div class="control-section">
      <div class="section-header">Overlay Effects</div>
      <div class="toggle-row">
        <span class="toggle-label">Vignette</span>
        <div class="toggle-switch" id="vignetteToggle" role="switch" tabindex="0"></div>
      </div>
      <div class="toggle-row">
        <span class="toggle-label">Scanlines</span>
        <div class="toggle-switch" id="scanlinesToggle" role="switch" tabindex="0"></div>
      </div>
      <div class="toggle-row">
        <span class="toggle-label">Noise</span>
        <div class="toggle-switch" id="noiseToggle" role="switch" tabindex="0"></div>
      </div>
    </div>

    <button class="reset-btn" id="resetBtn">Reset All to Defaults</button>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      const state = {
        background: { type: 'color', color: '#1a1a2e', gradient: null },
        filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0 },
        overlay: { vignette: false, scanlines: false, noise: false },
      };

      // Preset colors
      const presetColors = [
        '#f0f0f0', '#1a1a2e', '#0f172a', '#ffffff',
        '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6',
        '#eab308', '#ec4899', '#14b8a6', '#f97316',
      ];

      // Preset gradients
      const presetGradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      ];

      function renderColorGrid() {
        var grid = document.getElementById('colorGrid');
        grid.innerHTML = presetColors.map(function(color) {
          return '<button class="color-btn" data-color="' + color + '" style="background:' + color + '" title="' + color + '"></button>';
        }).join('');

        grid.querySelectorAll('.color-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            setBackgroundColor(btn.dataset.color);
          });
        });
      }

      function renderGradientGrid() {
        var grid = document.getElementById('gradientGrid');
        grid.innerHTML = presetGradients.map(function(grad, i) {
          return '<button class="gradient-btn" data-gradient="' + grad + '" style="background:' + grad + '" title="Gradient ' + (i + 1) + '"></button>';
        }).join('');

        grid.querySelectorAll('.gradient-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            setBackgroundGradient(btn.dataset.gradient);
          });
        });
      }

      function setBackgroundColor(color) {
        state.background.type = 'color';
        state.background.color = color;
        state.background.gradient = null;

        document.getElementById('colorPicker').value = color;
        document.getElementById('colorInput').value = color.toUpperCase();

        updateColorBtnStates();
        updateGradientBtnStates();
        emitBackgroundChange();
      }

      function setBackgroundGradient(gradient) {
        state.background.type = 'gradient';
        state.background.gradient = gradient;

        updateColorBtnStates();
        updateGradientBtnStates();
        emitBackgroundChange();
      }

      function updateColorBtnStates() {
        document.querySelectorAll('.color-btn').forEach(function(btn) {
          btn.classList.toggle('active', state.background.type === 'color' && btn.dataset.color === state.background.color);
        });
      }

      function updateGradientBtnStates() {
        document.querySelectorAll('.gradient-btn').forEach(function(btn) {
          btn.classList.toggle('active', state.background.type === 'gradient' && btn.dataset.gradient === state.background.gradient);
        });
      }

      // Legacy broadcast for redundancy (fallback if new protocol fails)
      function broadcast(eventType, payload) {
        window.parent.postMessage({
          type: 'widget:broadcast',
          payload: {
            type: eventType,
            payload: payload
          }
        }, '*');
      }

      function emitBackgroundChange() {
        console.log('[CanvasControlWidget] 🎨 Emitting background change:', state.background);
        if (state.background.type === 'color') {
          console.log('[CanvasControlWidget] 📤 Calling API.emit("canvas:set-background-color", { color:', state.background.color, '})');
          API.emit('canvas:set-background-color', { color: state.background.color });
          // Also broadcast via legacy protocol for redundancy
          broadcast('canvas:set-background-color', { color: state.background.color });
        } else {
          console.log('[CanvasControlWidget] 📤 Calling API.emit("canvas:set-background", gradient)');
          API.emit('canvas:set-background', { type: 'gradient', gradient: state.background.gradient });
          // Also broadcast via legacy protocol for redundancy
          broadcast('canvas:set-background', { type: 'gradient', gradient: state.background.gradient });
        }
        API.emitOutput('background.changed', state.background);
        API.emitOutput('settings.changed', state);
        API.setState(state);
      }

      function emitFiltersChange() {
        API.emit('canvas:set-filters', state.filters);
        broadcast('canvas:set-filters', state.filters);
        API.emitOutput('filters.changed', state.filters);
        API.emitOutput('settings.changed', state);
        API.setState(state);
      }

      function emitOverlayChange() {
        API.emit('canvas:set-overlay', state.overlay);
        broadcast('canvas:set-overlay', state.overlay);
        API.emitOutput('settings.changed', state);
        API.setState(state);
      }

      function updateUI() {
        document.getElementById('brightness').value = state.filters.brightness;
        document.getElementById('contrast').value = state.filters.contrast;
        document.getElementById('saturation').value = state.filters.saturation;
        document.getElementById('blur').value = state.filters.blur;

        document.getElementById('brightnessValue').textContent = state.filters.brightness + '%';
        document.getElementById('contrastValue').textContent = state.filters.contrast + '%';
        document.getElementById('saturationValue').textContent = state.filters.saturation + '%';
        document.getElementById('blurValue').textContent = state.filters.blur + 'px';

        document.getElementById('vignetteToggle').classList.toggle('active', state.overlay.vignette);
        document.getElementById('scanlinesToggle').classList.toggle('active', state.overlay.scanlines);
        document.getElementById('noiseToggle').classList.toggle('active', state.overlay.noise);

        updateColorBtnStates();
        updateGradientBtnStates();
      }

      // Events
      document.getElementById('colorPicker').addEventListener('input', function(e) {
        setBackgroundColor(e.target.value);
      });

      document.getElementById('colorInput').addEventListener('input', function(e) {
        var val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          setBackgroundColor(val);
        }
      });

      ['brightness', 'contrast', 'saturation', 'blur'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', function(e) {
          state.filters[id] = parseInt(e.target.value);
          document.getElementById(id + 'Value').textContent = state.filters[id] + (id === 'blur' ? 'px' : '%');
          emitFiltersChange();
        });
      });

      document.getElementById('vignetteToggle').addEventListener('click', function() {
        state.overlay.vignette = !state.overlay.vignette;
        this.classList.toggle('active', state.overlay.vignette);
        emitOverlayChange();
      });

      document.getElementById('scanlinesToggle').addEventListener('click', function() {
        state.overlay.scanlines = !state.overlay.scanlines;
        this.classList.toggle('active', state.overlay.scanlines);
        emitOverlayChange();
      });

      document.getElementById('noiseToggle').addEventListener('click', function() {
        state.overlay.noise = !state.overlay.noise;
        this.classList.toggle('active', state.overlay.noise);
        emitOverlayChange();
      });

      document.getElementById('resetBtn').addEventListener('click', function() {
        state.background = { type: 'color', color: '#1a1a2e', gradient: null };
        state.filters = { brightness: 100, contrast: 100, saturation: 100, blur: 0 };
        state.overlay = { vignette: false, scanlines: false, noise: false };
        document.getElementById('colorPicker').value = '#1a1a2e';
        document.getElementById('colorInput').value = '#1A1A2E';
        updateUI();
        emitBackgroundChange();
        emitFiltersChange();
        emitOverlayChange();
        API.log('Reset to defaults');
      });

      // WidgetAPI Integration
      API.onMount(function(context) {
        if (context.state) {
          if (context.state.background) state.background = { ...state.background, ...context.state.background };
          if (context.state.filters) state.filters = { ...state.filters, ...context.state.filters };
          if (context.state.overlay) state.overlay = { ...state.overlay, ...context.state.overlay };
        }
        renderColorGrid();
        renderGradientGrid();
        updateUI();
        API.log('CanvasControl Pro mounted');
      });

      API.onInput('background.set', function(value) {
        if (value && typeof value === 'object') {
          if (value.color) setBackgroundColor(value.color);
          if (value.gradient) setBackgroundGradient(value.gradient);
        }
      });

      API.onInput('filters.set', function(value) {
        if (value && typeof value === 'object') {
          state.filters = { ...state.filters, ...value };
          updateUI();
          emitFiltersChange();
        }
      });

      API.onInput('grid.toggle', function(value) {
        // Grid toggle handled by canvas directly
        API.log('Grid toggle: ' + value);
      });

      API.onDestroy(function() {
        API.log('CanvasControl Pro destroyed');
      });

    })();
  </script>
</body>
</html>
`;

export const CanvasControlWidgetV2: BuiltinWidget = {
  manifest: CanvasControlWidgetV2Manifest,
  html: CanvasControlWidgetV2HTML,
};
