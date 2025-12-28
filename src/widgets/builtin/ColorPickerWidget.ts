/**
 * StickerNest v2 - Color Picker Widget
 *
 * @deprecated Prefer ColorPickerWidgetV2 ('stickernest.color-picker-v2') for new canvases.
 * This widget is kept for backwards compatibility with existing canvases.
 *
 * NOTE: V1 and V2 have different I/O ports and are NOT interchangeable:
 * - V1 ports: primary.set, secondary.set → primary.changed, secondary.changed
 * - V2 ports: color.set, palette.set → color.primary, color.secondary, color.changed
 *
 * Professional color picker with primary/secondary colors.
 * Skinnable widget following the established pattern.
 *
 * Features:
 * - Primary/secondary color swatches (like MS Paint)
 * - Swap colors button (X key)
 * - Color picker popup with palette
 * - HSL/RGB/HEX input
 * - Recent colors history
 * - Emits color changes to tool store
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

// ============================================================================
// Manifest with Skin Configuration
// ============================================================================

export const ColorPickerManifest: WidgetManifest = {
  id: 'stickernest.color-picker',
  name: 'Color Picker',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Primary/secondary color picker with palette and history. Connects to drawing colors.',
  author: 'StickerNest',
  tags: ['color', 'picker', 'palette', 'design', 'tools', 'vector-tools', 'canvas-tools'],

  inputs: {
    'primary.set': {
      type: 'string',
      description: 'Set primary color (hex)',
    },
    'secondary.set': {
      type: 'string',
      description: 'Set secondary color (hex)',
    },
    'skin.apply': {
      type: 'object',
      description: 'Apply skin overrides { variable: value }',
    },
  },

  outputs: {
    'primary.changed': {
      type: 'string',
      description: 'Primary color changed (hex)',
    },
    'secondary.changed': {
      type: 'string',
      description: 'Secondary color changed (hex)',
    },
    'colors.swapped': {
      type: 'object',
      description: 'Colors were swapped { primary, secondary }',
    },
  },

  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },

  size: {
    width: 180,
    height: 120,
    minWidth: 120,
    minHeight: 80,
    maxWidth: 300,
    maxHeight: 200,
  },

  io: {
    inputs: ['primary.set', 'secondary.set', 'skin.apply'],
    outputs: ['primary.changed', 'secondary.changed', 'colors.swapped'],
  },

  events: {
    emits: ['color:primary-changed', 'color:secondary-changed', 'color:swapped'],
    listens: ['color:request-primary', 'color:request-secondary'],
  },

  skin: {
    themeable: true,
    defaultSkin: 'color-picker-default',
    slots: [
      { name: 'picker-bg', type: 'color', defaultValue: '#1a1a2e', description: 'Background' },
      { name: 'picker-border', type: 'color', defaultValue: 'rgba(139, 92, 246, 0.2)', description: 'Border' },
      { name: 'swatch-border', type: 'color', defaultValue: '#ffffff', description: 'Swatch border' },
      { name: 'swap-btn-bg', type: 'color', defaultValue: '#252538', description: 'Swap button bg' },
      { name: 'swap-btn-color', type: 'color', defaultValue: '#94a3b8', description: 'Swap button icon' },
      { name: 'label-color', type: 'color', defaultValue: '#94a3b8', description: 'Label text' },
    ],
    usesVariables: ['--sn-bg-secondary', '--sn-text-secondary', '--sn-border-primary'],
  },
};

// ============================================================================
// HTML Template
// ============================================================================

export const ColorPickerHTML = `
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

    :root {
      --picker-bg: var(--sn-picker-bg, var(--sn-bg-secondary, #1a1a2e));
      --picker-border: var(--sn-picker-border, var(--sn-border-primary, rgba(139, 92, 246, 0.2)));
      --swatch-border: var(--sn-swatch-border, #ffffff);
      --swap-btn-bg: var(--sn-swap-btn-bg, #252538);
      --swap-btn-color: var(--sn-swap-btn-color, var(--sn-text-secondary, #94a3b8));
      --label-color: var(--sn-label-color, var(--sn-text-secondary, #94a3b8));
    }

    .container {
      width: 100%;
      height: 100%;
      background: var(--picker-bg);
      border: 1px solid var(--picker-border);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--label-color);
    }

    .color-swatches {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .swatch-stack {
      position: relative;
      width: 56px;
      height: 56px;
    }

    .swatch {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 6px;
      border: 2px solid var(--swatch-border);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    .swatch:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
    }

    .swatch.primary {
      top: 0;
      left: 0;
      z-index: 2;
    }

    .swatch.secondary {
      bottom: 0;
      right: 0;
      z-index: 1;
    }

    .swap-btn {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: var(--swap-btn-bg);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--swap-btn-color);
      transition: all 0.15s ease;
    }

    .swap-btn:hover {
      background: var(--picker-border);
      transform: rotate(180deg);
    }

    .swap-btn svg {
      width: 14px;
      height: 14px;
    }

    .color-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .color-value {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 11px;
      color: var(--label-color);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .color-value .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .color-value .hex {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Color input popup */
    .color-input {
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
      pointer-events: none;
    }

    .recent-colors {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .recent-color {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 1px solid rgba(255,255,255,0.2);
      cursor: pointer;
      transition: transform 0.1s ease;
    }

    .recent-color:hover {
      transform: scale(1.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="label">Colors</div>

    <div class="color-swatches">
      <div class="swatch-stack">
        <div class="swatch primary" id="primary-swatch" title="Primary Color (click to change)"></div>
        <div class="swatch secondary" id="secondary-swatch" title="Secondary Color (click to change)"></div>
      </div>

      <button class="swap-btn" id="swap-btn" title="Swap Colors (X)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      </button>

      <div class="color-info">
        <div class="color-value">
          <span class="dot" id="primary-dot"></span>
          <span class="hex" id="primary-hex">#8b5cf6</span>
        </div>
        <div class="color-value">
          <span class="dot" id="secondary-dot"></span>
          <span class="hex" id="secondary-hex">#1e1b4b</span>
        </div>
      </div>
    </div>

    <div class="recent-colors" id="recent-colors"></div>

    <!-- Hidden color inputs -->
    <input type="color" class="color-input" id="primary-input">
    <input type="color" class="color-input" id="secondary-input">
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // ================================================================
      // State
      // ================================================================
      let state = {
        primary: '#8b5cf6',
        secondary: '#1e1b4b',
        recentColors: [],
      };

      const MAX_RECENT = 8;

      // ================================================================
      // DOM References
      // ================================================================
      const primarySwatch = document.getElementById('primary-swatch');
      const secondarySwatch = document.getElementById('secondary-swatch');
      const swapBtn = document.getElementById('swap-btn');
      const primaryInput = document.getElementById('primary-input');
      const secondaryInput = document.getElementById('secondary-input');
      const primaryDot = document.getElementById('primary-dot');
      const secondaryDot = document.getElementById('secondary-dot');
      const primaryHex = document.getElementById('primary-hex');
      const secondaryHex = document.getElementById('secondary-hex');
      const recentColorsContainer = document.getElementById('recent-colors');

      // ================================================================
      // UI Updates
      // ================================================================
      function updateUI() {
        primarySwatch.style.backgroundColor = state.primary;
        secondarySwatch.style.backgroundColor = state.secondary;
        primaryDot.style.backgroundColor = state.primary;
        secondaryDot.style.backgroundColor = state.secondary;
        primaryHex.textContent = state.primary.toUpperCase();
        secondaryHex.textContent = state.secondary.toUpperCase();
        primaryInput.value = state.primary;
        secondaryInput.value = state.secondary;
        updateRecentColors();
      }

      function addToRecent(color) {
        const normalized = color.toLowerCase();
        state.recentColors = state.recentColors.filter(c => c !== normalized);
        state.recentColors.unshift(normalized);
        if (state.recentColors.length > MAX_RECENT) {
          state.recentColors = state.recentColors.slice(0, MAX_RECENT);
        }
        updateRecentColors();
      }

      function updateRecentColors() {
        recentColorsContainer.innerHTML = '';
        state.recentColors.forEach(color => {
          const el = document.createElement('div');
          el.className = 'recent-color';
          el.style.backgroundColor = color;
          el.title = color.toUpperCase();
          el.addEventListener('click', () => setPrimary(color));
          el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            setSecondary(color);
          });
          recentColorsContainer.appendChild(el);
        });
      }

      // ================================================================
      // Color Actions
      // ================================================================
      function setPrimary(color) {
        state.primary = color;
        addToRecent(color);
        updateUI();
        API.setState({ primary: color, secondary: state.secondary, recentColors: state.recentColors });
        API.emitOutput('primary.changed', color);
        API.emit('color:primary-changed', { color });
        API.log('Primary color: ' + color);
      }

      function setSecondary(color) {
        state.secondary = color;
        addToRecent(color);
        updateUI();
        API.setState({ primary: state.primary, secondary: color, recentColors: state.recentColors });
        API.emitOutput('secondary.changed', color);
        API.emit('color:secondary-changed', { color });
        API.log('Secondary color: ' + color);
      }

      function swapColors() {
        const temp = state.primary;
        state.primary = state.secondary;
        state.secondary = temp;
        updateUI();
        API.setState({ primary: state.primary, secondary: state.secondary, recentColors: state.recentColors });
        API.emitOutput('colors.swapped', { primary: state.primary, secondary: state.secondary });
        API.emit('color:swapped', { primary: state.primary, secondary: state.secondary });
        API.log('Colors swapped');
      }

      // ================================================================
      // Event Handlers
      // ================================================================
      primarySwatch.addEventListener('click', () => primaryInput.click());
      secondarySwatch.addEventListener('click', () => secondaryInput.click());
      swapBtn.addEventListener('click', swapColors);

      primaryInput.addEventListener('input', (e) => setPrimary(e.target.value));
      secondaryInput.addEventListener('input', (e) => setSecondary(e.target.value));

      // Keyboard shortcut
      document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'x' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          swapColors();
        }
      });

      // ================================================================
      // API Handlers
      // ================================================================
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        updateUI();
        API.log('ColorPicker mounted');
      });

      API.onInput('primary.set', function(color) {
        if (color && typeof color === 'string') {
          setPrimary(color);
        }
      });

      API.onInput('secondary.set', function(color) {
        if (color && typeof color === 'string') {
          setSecondary(color);
        }
      });

      API.onInput('skin.apply', function(overrides) {
        if (!overrides) return;
        const root = document.documentElement;
        for (const [key, value] of Object.entries(overrides)) {
          const varName = key.startsWith('--') ? key : '--sn-' + key;
          root.style.setProperty(varName, value);
        }
        API.log('Skin applied');
      });

      API.onDestroy(function() {
        API.log('ColorPicker destroyed');
      });
    })();
  </script>
</body>
</html>
`;

// ============================================================================
// Export
// ============================================================================

export const ColorPickerWidget: BuiltinWidget = {
  manifest: ColorPickerManifest,
  html: ColorPickerHTML,
};
