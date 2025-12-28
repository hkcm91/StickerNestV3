/**
 * StickerNest v2 - Typography Widget
 *
 * Font and text styling controls for design tools.
 * Skinnable widget following the established pattern.
 *
 * Features:
 * - Font family dropdown
 * - Font size with slider
 * - Font weight selector
 * - Text alignment buttons
 * - Letter spacing & line height
 * - Live preview
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

// ============================================================================
// Manifest
// ============================================================================

export const TypographyManifest: WidgetManifest = {
  id: 'stickernest.typography',
  name: 'Typography',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Font and text styling controls. Font family, size, weight, alignment.',
  author: 'StickerNest',
  tags: ['typography', 'font', 'text', 'design', 'tools', 'vector-tools', 'canvas-tools'],

  inputs: {
    'style.set': {
      type: 'object',
      description: 'Set text style { fontFamily, fontSize, fontWeight, textAlign, color }',
    },
    'selection.info': {
      type: 'object',
      description: 'Info about selected text entity',
    },
    'skin.apply': {
      type: 'object',
      description: 'Apply skin overrides',
    },
  },

  outputs: {
    'style.changed': {
      type: 'object',
      description: 'Text style changed',
    },
    'font.changed': {
      type: 'string',
      description: 'Font family changed',
    },
  },

  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },

  size: {
    width: 220,
    height: 280,
    minWidth: 180,
    minHeight: 200,
    maxWidth: 320,
    maxHeight: 400,
  },

  io: {
    inputs: ['style.set', 'selection.info', 'skin.apply'],
    outputs: ['style.changed', 'font.changed'],
  },

  events: {
    emits: ['typography:changed', 'canvas:style-changed'],
    listens: ['entity:selected'],
  },

  skin: {
    themeable: true,
    defaultSkin: 'typography-default',
    slots: [
      { name: 'panel-bg', type: 'color', defaultValue: '#1a1a2e', description: 'Panel background' },
      { name: 'input-bg', type: 'color', defaultValue: '#252538', description: 'Input background' },
      { name: 'input-border', type: 'color', defaultValue: 'rgba(139, 92, 246, 0.2)', description: 'Input border' },
      { name: 'btn-active-bg', type: 'color', defaultValue: '#8b5cf6', description: 'Active button bg' },
      { name: 'label-color', type: 'color', defaultValue: '#94a3b8', description: 'Label color' },
    ],
    usesVariables: ['--sn-bg-secondary', '--sn-text-secondary', '--sn-accent-primary'],
  },
};

// ============================================================================
// HTML Template
// ============================================================================

export const TypographyHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Montserrat:wght@100;300;400;500;600;700;800;900&family=Roboto:wght@100;300;400;500;700;900&family=Poppins:wght@100;200;300;400;500;600;700;800;900&family=Open+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Bebas+Neue&family=Dancing+Script:wght@400;500;600;700&display=swap" rel="stylesheet">
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
      --btn-active-bg: var(--sn-btn-active-bg, var(--sn-accent-primary, #8b5cf6));
      --label-color: var(--sn-label-color, var(--sn-text-secondary, #94a3b8));
      --text-color: var(--sn-text-primary, #e2e8f0);
    }

    .panel {
      width: 100%;
      min-height: 100%;
      background: var(--panel-bg);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--label-color);
    }

    select, input[type="number"] {
      width: 100%;
      padding: 8px 10px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      color: var(--text-color);
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    }

    select:focus, input:focus {
      border-color: var(--btn-active-bg);
    }

    .row {
      display: flex;
      gap: 8px;
    }

    .row > * {
      flex: 1;
    }

    .btn-group {
      display: flex;
      gap: 2px;
      background: var(--input-bg);
      border-radius: 6px;
      padding: 2px;
    }

    .btn-group button {
      flex: 1;
      padding: 6px 8px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--label-color);
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-group button:hover {
      background: rgba(139, 92, 246, 0.1);
      color: var(--text-color);
    }

    .btn-group button.active {
      background: var(--btn-active-bg);
      color: white;
    }

    .btn-group button svg {
      width: 14px;
      height: 14px;
    }

    .slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .slider-row input[type="range"] {
      flex: 1;
      -webkit-appearance: none;
      height: 4px;
      background: var(--input-bg);
      border-radius: 2px;
      outline: none;
    }

    .slider-row input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      background: var(--btn-active-bg);
      border-radius: 50%;
      cursor: pointer;
    }

    .slider-row .value {
      width: 40px;
      text-align: right;
      font-size: 12px;
      color: var(--text-color);
      font-family: 'Monaco', 'Menlo', monospace;
    }

    .preview {
      padding: 12px;
      background: var(--input-bg);
      border-radius: 6px;
      text-align: center;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .preview-text {
      color: var(--text-color);
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="panel">
    <!-- Font Family -->
    <div class="section">
      <div class="label">Font Family</div>
      <select id="font-family">
        <option value="Inter, system-ui, sans-serif">Inter</option>
        <option value="Montserrat, sans-serif">Montserrat</option>
        <option value="Roboto, sans-serif">Roboto</option>
        <option value="Poppins, sans-serif">Poppins</option>
        <option value="Open Sans, sans-serif">Open Sans</option>
        <option value="Playfair Display, serif">Playfair Display</option>
        <option value="Bebas Neue, cursive">Bebas Neue</option>
        <option value="Dancing Script, cursive">Dancing Script</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Arial, sans-serif">Arial</option>
      </select>
    </div>

    <!-- Size & Weight -->
    <div class="row">
      <div class="section">
        <div class="label">Size</div>
        <input type="number" id="font-size" value="24" min="8" max="200" step="1">
      </div>
      <div class="section">
        <div class="label">Weight</div>
        <select id="font-weight">
          <option value="100">Thin</option>
          <option value="200">Extra Light</option>
          <option value="300">Light</option>
          <option value="400" selected>Regular</option>
          <option value="500">Medium</option>
          <option value="600">Semi Bold</option>
          <option value="700">Bold</option>
          <option value="800">Extra Bold</option>
          <option value="900">Black</option>
        </select>
      </div>
    </div>

    <!-- Alignment -->
    <div class="section">
      <div class="label">Alignment</div>
      <div class="btn-group" id="align-group">
        <button data-align="left" class="active" title="Left">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
        </button>
        <button data-align="center" title="Center">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm3 4h12v2H6V9zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg>
        </button>
        <button data-align="right" title="Right">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm6 4h12v2H9V9zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/></svg>
        </button>
        <button data-align="justify" title="Justify">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>
        </button>
      </div>
    </div>

    <!-- Letter Spacing -->
    <div class="section">
      <div class="label">Letter Spacing</div>
      <div class="slider-row">
        <input type="range" id="letter-spacing" min="-5" max="20" value="0" step="0.5">
        <span class="value" id="letter-spacing-value">0px</span>
      </div>
    </div>

    <!-- Line Height -->
    <div class="section">
      <div class="label">Line Height</div>
      <div class="slider-row">
        <input type="range" id="line-height" min="0.8" max="3" value="1.5" step="0.1">
        <span class="value" id="line-height-value">1.5</span>
      </div>
    </div>

    <!-- Preview -->
    <div class="section">
      <div class="label">Preview</div>
      <div class="preview">
        <span class="preview-text" id="preview">Sample Text</span>
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
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 24,
        fontWeight: 400,
        textAlign: 'left',
        letterSpacing: 0,
        lineHeight: 1.5,
        color: '#e2e8f0',
      };

      // ================================================================
      // DOM References
      // ================================================================
      const fontFamilySelect = document.getElementById('font-family');
      const fontSizeInput = document.getElementById('font-size');
      const fontWeightSelect = document.getElementById('font-weight');
      const alignGroup = document.getElementById('align-group');
      const letterSpacingSlider = document.getElementById('letter-spacing');
      const letterSpacingValue = document.getElementById('letter-spacing-value');
      const lineHeightSlider = document.getElementById('line-height');
      const lineHeightValue = document.getElementById('line-height-value');
      const preview = document.getElementById('preview');

      // ================================================================
      // UI Updates
      // ================================================================
      function updateUI() {
        fontFamilySelect.value = state.fontFamily;
        fontSizeInput.value = state.fontSize;
        fontWeightSelect.value = state.fontWeight;
        letterSpacingSlider.value = state.letterSpacing;
        letterSpacingValue.textContent = state.letterSpacing + 'px';
        lineHeightSlider.value = state.lineHeight;
        lineHeightValue.textContent = state.lineHeight.toFixed(1);

        // Update alignment buttons
        alignGroup.querySelectorAll('button').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.align === state.textAlign);
        });

        updatePreview();
      }

      function updatePreview() {
        preview.style.fontFamily = state.fontFamily;
        preview.style.fontSize = state.fontSize + 'px';
        preview.style.fontWeight = state.fontWeight;
        preview.style.textAlign = state.textAlign;
        preview.style.letterSpacing = state.letterSpacing + 'px';
        preview.style.lineHeight = state.lineHeight;
      }

      function emitChanges() {
        const styleData = {
          fontFamily: state.fontFamily,
          fontSize: state.fontSize,
          fontWeight: state.fontWeight,
          textAlign: state.textAlign,
          letterSpacing: state.letterSpacing,
          lineHeight: state.lineHeight,
          color: state.color,
        };

        API.setState(state);
        API.emitOutput('style.changed', styleData);
        API.emit('typography:changed', styleData);

        // Emit to update selected text entities
        API.emit('canvas:style-changed', {
          targetType: 'text',
          styles: styleData,
        });
      }

      // ================================================================
      // Event Handlers
      // ================================================================
      fontFamilySelect.addEventListener('change', (e) => {
        state.fontFamily = e.target.value;
        updatePreview();
        emitChanges();
        API.emitOutput('font.changed', state.fontFamily);
      });

      fontSizeInput.addEventListener('input', (e) => {
        state.fontSize = parseInt(e.target.value) || 24;
        updatePreview();
        emitChanges();
      });

      fontWeightSelect.addEventListener('change', (e) => {
        state.fontWeight = parseInt(e.target.value);
        updatePreview();
        emitChanges();
      });

      alignGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.align) {
          state.textAlign = btn.dataset.align;
          updateUI();
          emitChanges();
        }
      });

      letterSpacingSlider.addEventListener('input', (e) => {
        state.letterSpacing = parseFloat(e.target.value);
        letterSpacingValue.textContent = state.letterSpacing + 'px';
        updatePreview();
        emitChanges();
      });

      lineHeightSlider.addEventListener('input', (e) => {
        state.lineHeight = parseFloat(e.target.value);
        lineHeightValue.textContent = state.lineHeight.toFixed(1);
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
        API.log('Typography mounted');
      });

      API.onInput('style.set', function(styles) {
        if (!styles) return;
        state = { ...state, ...styles };
        updateUI();
      });

      API.onInput('selection.info', function(info) {
        if (info && info.type === 'text' && info.styles) {
          state = { ...state, ...info.styles };
          updateUI();
        }
      });

      // Listen for entity selection
      API.on('entity:selected', function(event) {
        if (event.entityType === 'text' && event.styles) {
          state = { ...state, ...event.styles };
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
        API.log('Typography destroyed');
      });
    })();
  </script>
</body>
</html>
`;

// ============================================================================
// Export
// ============================================================================

export const TypographyWidget: BuiltinWidget = {
  manifest: TypographyManifest,
  html: TypographyHTML,
};
