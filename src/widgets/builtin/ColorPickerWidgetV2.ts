/**
 * StickerNest v2 - Color Picker Widget (Enhanced X5)
 *
 * Professional color picker with formats, presets, history,
 * proper pipeline I/O, and canvas entity integration.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ColorPickerWidgetV2Manifest: WidgetManifest = {
  id: 'stickernest.color-picker-v2',
  name: 'Color Picker Pro',
  version: '2.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Professional color picker with formats, presets, and history for design tools',
  author: 'StickerNest',
  tags: ['color', 'picker', 'design', 'tool', 'palette'],
  capabilities: {
    draggable: true,
    resizable: true,
  },
  inputs: {
    'color.set': {
      type: 'string',
      description: 'Set color from external source',
    },
    'palette.set': {
      type: 'object',
      description: 'Set color palette',
    },
  },
  outputs: {
    'color.primary': {
      type: 'string',
      description: 'Primary color selection',
    },
    'color.secondary': {
      type: 'string',
      description: 'Secondary color selection',
    },
    'color.changed': {
      type: 'object',
      description: 'Emitted when any color changes',
    },
  },
  events: {
    emits: ['color:primary-changed', 'color:secondary-changed', 'brand:color-changed'],
    listens: ['entity:selected', 'selection:cleared'],
  },
  io: {
    inputs: ['color.set', 'palette.set'],
    outputs: ['color.primary', 'color.secondary', 'color.changed'],
  },
  size: {
    width: 280,
    height: 400,
    minWidth: 240,
    minHeight: 350,
    maxWidth: 350,
  },
};

export const ColorPickerWidgetV2HTML = `
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

    body { display: flex; flex-direction: column; padding: 12px; }

    .section-header {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sn-text-secondary);
      margin-bottom: 8px;
    }

    /* Color Swatches */
    .swatches-row {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      align-items: center;
    }

    .swatch-container {
      position: relative;
      width: 52px;
      height: 52px;
    }

    .primary-swatch, .secondary-swatch {
      position: absolute;
      border-radius: var(--sn-radius-md);
      cursor: pointer;
      border: 3px solid var(--sn-bg-tertiary);
      transition: all var(--sn-transition);
    }

    .primary-swatch {
      width: 44px;
      height: 44px;
      top: 0;
      left: 0;
      z-index: 2;
      background: #8b5cf6;
    }

    .secondary-swatch {
      width: 36px;
      height: 36px;
      bottom: 0;
      right: 0;
      z-index: 1;
      background: #e2e8f0;
    }

    .primary-swatch.active, .secondary-swatch.active {
      border-color: white;
      box-shadow: 0 0 0 2px var(--sn-accent-primary);
    }

    .swap-btn {
      width: 28px;
      height: 28px;
      background: var(--sn-bg-tertiary);
      border: 1px solid var(--sn-border-primary);
      border-radius: 50%;
      color: var(--sn-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--sn-transition);
    }

    .swap-btn:hover { background: var(--sn-accent-primary); color: white; }
    .swap-btn svg { width: 14px; height: 14px; }

    .swatch-label {
      font-size: 11px;
      color: var(--sn-text-secondary);
      margin-top: 4px;
    }

    /* Color Picker Area */
    .picker-area {
      flex: 0 0 120px;
      background: var(--sn-bg-secondary);
      border-radius: var(--sn-radius-md);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .color-input-large {
      width: 100%;
      height: 100%;
      border: none;
      cursor: pointer;
      background: none;
    }

    .color-input-large::-webkit-color-swatch-wrapper { padding: 0; }
    .color-input-large::-webkit-color-swatch { border: none; border-radius: var(--sn-radius-md); }

    /* Hex Input */
    .hex-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .hex-input {
      flex: 1;
      padding: 10px 12px;
      background: var(--sn-bg-secondary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-primary);
      font-size: 14px;
      font-family: monospace;
      text-transform: uppercase;
      text-align: center;
    }

    .hex-input:focus { outline: none; border-color: var(--sn-accent-primary); }

    /* Presets */
    .presets-section { margin-bottom: 12px; }

    .preset-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 4px;
    }

    .preset-color {
      aspect-ratio: 1;
      border-radius: var(--sn-radius-sm);
      cursor: pointer;
      border: 2px solid transparent;
      transition: all var(--sn-transition);
    }

    .preset-color:hover { transform: scale(1.15); }
    .preset-color.active { border-color: white; }

    /* History */
    .history-section { margin-bottom: 12px; }

    .history-grid {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .history-color {
      width: 24px;
      height: 24px;
      border-radius: var(--sn-radius-sm);
      cursor: pointer;
      border: 1px solid var(--sn-border-primary);
      transition: all var(--sn-transition);
    }

    .history-color:hover { transform: scale(1.1); }

    /* Format Selector */
    .format-row {
      display: flex;
      gap: 4px;
    }

    .format-btn {
      flex: 1;
      padding: 6px 8px;
      background: var(--sn-bg-secondary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-secondary);
      font-size: 10px;
      cursor: pointer;
      transition: all var(--sn-transition);
    }

    .format-btn:hover { background: var(--sn-bg-tertiary); color: var(--sn-text-primary); }
    .format-btn.active { background: var(--sn-accent-primary); border-color: var(--sn-accent-primary); color: white; }

    @media (pointer: coarse) {
      .preset-color { min-width: 32px; min-height: 32px; }
      .history-color { width: 32px; height: 32px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body>
  <!-- Color Swatches -->
  <div class="swatches-row">
    <div class="swatch-container">
      <div class="primary-swatch active" id="primarySwatch" title="Primary Color"></div>
      <div class="secondary-swatch" id="secondarySwatch" title="Secondary Color"></div>
    </div>
    <button class="swap-btn" id="swapBtn" title="Swap Colors (X)">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/>
      </svg>
    </button>
    <div style="flex:1">
      <div class="swatch-label" id="activeLabel">Primary</div>
    </div>
  </div>

  <!-- Color Picker -->
  <div class="picker-area">
    <input type="color" class="color-input-large" id="colorPicker" value="#8b5cf6">
  </div>

  <!-- Hex Input -->
  <div class="hex-row">
    <input type="text" class="hex-input" id="hexInput" value="#8B5CF6" maxlength="7" placeholder="#000000">
  </div>

  <!-- Format -->
  <div style="margin-bottom: 12px">
    <div class="section-header">Format</div>
    <div class="format-row">
      <button class="format-btn active" data-format="hex">HEX</button>
      <button class="format-btn" data-format="rgb">RGB</button>
      <button class="format-btn" data-format="hsl">HSL</button>
    </div>
  </div>

  <!-- Presets -->
  <div class="presets-section">
    <div class="section-header">Presets</div>
    <div class="preset-grid" id="presetGrid"></div>
  </div>

  <!-- History -->
  <div class="history-section">
    <div class="section-header">Recent</div>
    <div class="history-grid" id="historyGrid"></div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      const state = {
        primary: '#8b5cf6',
        secondary: '#e2e8f0',
        activeSwatch: 'primary',
        format: 'hex',
        history: [],
      };

      // Preset colors
      const presets = [
        '#ef4444', '#f97316', '#fbbf24', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
        '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777',
        '#991b1b', '#9a3412', '#92400e', '#166534', '#155e75', '#1d4ed8', '#5b21b6', '#9d174d',
        '#ffffff', '#f1f5f9', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a',
      ];

      // DOM
      const primarySwatch = document.getElementById('primarySwatch');
      const secondarySwatch = document.getElementById('secondarySwatch');
      const colorPicker = document.getElementById('colorPicker');
      const hexInput = document.getElementById('hexInput');
      const activeLabel = document.getElementById('activeLabel');

      // Color utilities
      function hexToRgb(hex) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return { r: r, g: g, b: b };
      }

      function hexToHsl(hex) {
        var rgb = hexToRgb(hex);
        var r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
          var d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
      }

      function formatColor(hex) {
        if (state.format === 'rgb') {
          var rgb = hexToRgb(hex);
          return 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
        } else if (state.format === 'hsl') {
          var hsl = hexToHsl(hex);
          return 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';
        }
        return hex.toUpperCase();
      }

      function updateUI() {
        primarySwatch.style.background = state.primary;
        secondarySwatch.style.background = state.secondary;
        primarySwatch.classList.toggle('active', state.activeSwatch === 'primary');
        secondarySwatch.classList.toggle('active', state.activeSwatch === 'secondary');
        activeLabel.textContent = state.activeSwatch === 'primary' ? 'Primary' : 'Secondary';

        var activeColor = state.activeSwatch === 'primary' ? state.primary : state.secondary;
        colorPicker.value = activeColor;
        hexInput.value = formatColor(activeColor);

        document.querySelectorAll('[data-format]').forEach(function(btn) {
          btn.classList.toggle('active', btn.dataset.format === state.format);
        });

        renderHistory();
      }

      function renderPresets() {
        var grid = document.getElementById('presetGrid');
        grid.innerHTML = presets.map(function(color) {
          return '<div class="preset-color" data-color="' + color + '" style="background:' + color + '" title="' + color + '"></div>';
        }).join('');

        grid.querySelectorAll('.preset-color').forEach(function(el) {
          el.addEventListener('click', function() {
            setColor(el.dataset.color);
          });
        });
      }

      function renderHistory() {
        var grid = document.getElementById('historyGrid');
        grid.innerHTML = state.history.slice(0, 12).map(function(color) {
          return '<div class="history-color" data-color="' + color + '" style="background:' + color + '" title="' + color + '"></div>';
        }).join('');

        grid.querySelectorAll('.history-color').forEach(function(el) {
          el.addEventListener('click', function() {
            setColor(el.dataset.color);
          });
        });
      }

      function addToHistory(color) {
        state.history = [color].concat(state.history.filter(function(c) { return c !== color; })).slice(0, 24);
      }

      function setColor(color) {
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return;
        if (state.activeSwatch === 'primary') {
          state.primary = color;
          API.emit('color:primary-changed', { color: color });
          API.emit('brand:color-changed', { color: color });
          API.emitOutput('color.primary', color);
        } else {
          state.secondary = color;
          API.emit('color:secondary-changed', { color: color });
          API.emitOutput('color.secondary', color);
        }
        addToHistory(color);
        API.emitOutput('color.changed', { primary: state.primary, secondary: state.secondary });
        API.setState(state);
        updateUI();
      }

      // Events
      primarySwatch.addEventListener('click', function() {
        state.activeSwatch = 'primary';
        updateUI();
      });

      secondarySwatch.addEventListener('click', function() {
        state.activeSwatch = 'secondary';
        updateUI();
      });

      document.getElementById('swapBtn').addEventListener('click', function() {
        var temp = state.primary;
        state.primary = state.secondary;
        state.secondary = temp;
        API.emit('color:primary-changed', { color: state.primary });
        API.emit('color:secondary-changed', { color: state.secondary });
        API.emitOutput('color.primary', state.primary);
        API.emitOutput('color.secondary', state.secondary);
        API.emitOutput('color.changed', { primary: state.primary, secondary: state.secondary });
        API.setState(state);
        updateUI();
      });

      colorPicker.addEventListener('input', function(e) {
        setColor(e.target.value);
      });

      hexInput.addEventListener('input', function(e) {
        var val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          setColor(val);
        }
      });

      document.querySelectorAll('[data-format]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          state.format = btn.dataset.format;
          updateUI();
        });
      });

      // Keyboard shortcut (X to swap)
      document.addEventListener('keydown', function(e) {
        if (e.key === 'x' || e.key === 'X') {
          document.getElementById('swapBtn').click();
        }
      });

      // WidgetAPI Integration
      API.onMount(function(context) {
        if (context.state) {
          Object.assign(state, context.state);
        }
        renderPresets();
        updateUI();
        API.log('ColorPicker Pro mounted');
      });

      API.onInput('color.set', function(value) {
        if (value && typeof value === 'string') {
          setColor(value);
        }
      });

      API.onInput('palette.set', function(value) {
        if (value && Array.isArray(value)) {
          // Custom palette support
          renderPresets();
        }
      });

      API.on('entity:selected', function(event) {
        if (event.payload && event.payload.styles && event.payload.styles.color) {
          state.primary = event.payload.styles.color;
          updateUI();
        }
      });

      API.onDestroy(function() {
        API.log('ColorPicker Pro destroyed');
      });

    })();
  </script>
</body>
</html>
`;

export const ColorPickerWidgetV2: BuiltinWidget = {
  manifest: ColorPickerWidgetV2Manifest,
  html: ColorPickerWidgetV2HTML,
};
