/**
 * StickerNest v2 - Text Tool Widget (Enhanced X5)
 *
 * Adobe-style text tool with comprehensive typography controls,
 * proper pipeline I/O, canvas entity integration, and mobile support.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const TextToolWidgetV2Manifest: WidgetManifest = {
  id: 'stickernest.text-tool-v2',
  name: 'Text Tool Pro',
  version: '2.0.0',
  kind: '2d',
  entry: 'index.html',
  description: 'Professional text tool for adding and styling text on the canvas with typography presets, effects, and real-time editing',
  author: 'StickerNest',
  tags: ['text', 'typography', 'design', 'tool', 'editor', 'fonts', 'styling'],
  capabilities: {
    draggable: true,
    resizable: true,
    canEdit: ['text'],
    canCreate: ['text'],
    isDesignTool: true,
  },
  inputs: {
    'text.load': {
      type: 'object',
      description: 'Load text properties from external source',
    },
    'style.apply': {
      type: 'object',
      description: 'Apply style preset or custom styles',
    },
    'color.set': {
      type: 'string',
      description: 'Set text color from color picker',
    },
    'entity:selected': {
      type: 'object',
      description: 'Entity selected on canvas',
    },
  },
  outputs: {
    'text.created': {
      type: 'object',
      description: 'Emitted when text is added to canvas',
    },
    'text.style-changed': {
      type: 'object',
      description: 'Emitted when text style changes',
    },
    'text.content': {
      type: 'string',
      description: 'Current text content',
    },
  },
  events: {
    emits: ['canvas:add-text', 'canvas:style-changed'],
    listens: ['widget:selected', 'widget:deselected', 'entity:selected', 'selection:cleared', 'brand:color-changed', 'brand:font-changed'],
  },
  io: {
    inputs: ['text.load', 'style.apply', 'color.set'],
    outputs: ['text.created', 'text.style-changed', 'text.content'],
  },
  size: {
    width: 320,
    height: 650,
    minWidth: 280,
    minHeight: 500,
    maxWidth: 450,
  },
};

export const TextToolWidgetV2HTML = `
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
      --sn-accent-gradient: linear-gradient(135deg, #8b5cf6, #ec4899);
      --sn-border-primary: rgba(139, 92, 246, 0.2);
      --sn-border-hover: rgba(139, 92, 246, 0.4);
      --sn-radius-sm: 4px;
      --sn-radius-md: 6px;
      --sn-radius-lg: 8px;
      --sn-transition: 0.15s ease;
      --sn-success: #22c55e;
      --sn-error: #ef4444;
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

    body {
      display: flex;
      flex-direction: column;
    }

    /* Header with Add Button */
    .header {
      padding: 12px;
      background: var(--sn-bg-tertiary);
      border-bottom: 1px solid var(--sn-border-primary);
      display: flex;
      gap: 8px;
    }

    .add-btn {
      flex: 1;
      padding: 12px 16px;
      background: var(--sn-accent-gradient);
      border: none;
      border-radius: var(--sn-radius-md);
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all var(--sn-transition);
      touch-action: manipulation;
    }

    .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
    .add-btn:active { transform: scale(0.98); }
    .add-btn svg { width: 18px; height: 18px; }

    /* Selection Status */
    .selection-status {
      padding: 8px 12px;
      background: var(--sn-bg-secondary);
      border-bottom: 1px solid var(--sn-border-primary);
      font-size: 11px;
      color: var(--sn-text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .selection-status.has-selection { color: var(--sn-success); }
    .selection-status .dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--sn-text-muted);
    }
    .selection-status.has-selection .dot { background: var(--sn-success); }

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
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sn-text-secondary);
      margin-bottom: 10px;
    }

    .control-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }

    .control-group { flex: 1; min-width: 0; }

    .control-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--sn-text-secondary);
      margin-bottom: 4px;
    }

    .control-value {
      color: var(--sn-accent-primary);
      font-weight: 600;
      font-size: 10px;
      font-family: monospace;
    }

    /* Text Area */
    textarea {
      width: 100%;
      padding: 10px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-primary);
      font-size: 13px;
      resize: vertical;
      min-height: 70px;
      font-family: inherit;
      transition: border-color var(--sn-transition);
    }

    textarea:focus {
      outline: none;
      border-color: var(--sn-accent-primary);
    }

    /* Select */
    select {
      width: 100%;
      padding: 8px 10px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-primary);
      font-size: 12px;
      cursor: pointer;
      transition: all var(--sn-transition);
    }

    select:hover { border-color: var(--sn-border-hover); }
    select:focus { outline: none; border-color: var(--sn-accent-primary); }

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
      width: 16px;
      height: 16px;
      background: var(--sn-accent-primary);
      border-radius: 50%;
      cursor: pointer;
      transition: transform var(--sn-transition);
    }

    input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.15); }

    /* Color Input */
    .color-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    input[type="color"] {
      width: 40px;
      height: 36px;
      padding: 0;
      border: 2px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      cursor: pointer;
      background: none;
    }

    input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
    input[type="color"]::-webkit-color-swatch { border: none; border-radius: 3px; }

    .color-hex {
      flex: 1;
      padding: 8px 10px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-primary);
      font-size: 12px;
      font-family: monospace;
      text-transform: uppercase;
    }

    /* Button Groups */
    .btn-group {
      display: flex;
      gap: 4px;
    }

    .btn {
      flex: 1;
      padding: 8px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-secondary);
      font-size: 11px;
      cursor: pointer;
      transition: all var(--sn-transition);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      touch-action: manipulation;
    }

    .btn:hover {
      background: var(--sn-bg-tertiary);
      border-color: var(--sn-border-hover);
      color: var(--sn-text-primary);
    }

    .btn.active {
      background: var(--sn-accent-primary);
      border-color: var(--sn-accent-primary);
      color: white;
    }

    .btn svg { width: 14px; height: 14px; fill: currentColor; }

    /* Preset Grid */
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }

    .preset-btn {
      padding: 10px 8px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-secondary);
      font-size: 10px;
      cursor: pointer;
      transition: all var(--sn-transition);
      text-align: left;
      touch-action: manipulation;
    }

    .preset-btn:hover {
      border-color: var(--sn-accent-primary);
      color: var(--sn-accent-primary);
    }

    .preset-btn .preview {
      margin-bottom: 4px;
      color: var(--sn-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .preset-btn[data-preset="headline"] .preview { font-weight: 700; font-size: 14px; }
    .preset-btn[data-preset="subheading"] .preview { font-weight: 600; font-size: 12px; }
    .preset-btn[data-preset="body"] .preview { font-weight: 400; font-size: 11px; }
    .preset-btn[data-preset="caption"] .preview { font-weight: 400; font-size: 9px; color: var(--sn-text-secondary); }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--sn-bg-primary); }
    ::-webkit-scrollbar-thumb { background: var(--sn-bg-tertiary); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--sn-accent-primary); }

    /* Mobile Touch Improvements */
    @media (pointer: coarse) {
      .btn { min-height: 44px; }
      .preset-btn { min-height: 56px; }
      input[type="range"]::-webkit-slider-thumb { width: 20px; height: 20px; }
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Playfair+Display:wght@400;700&family=Montserrat:wght@100;300;400;500;600;700;800;900&family=Poppins:wght@100;300;400;500;600;700;800;900&family=Bebas+Neue&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="header">
    <button class="add-btn" id="addTextBtn" aria-label="Add text to canvas">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
      Add Text to Canvas
    </button>
  </div>

  <div class="selection-status" id="selectionStatus" role="status" aria-live="polite">
    <span class="dot"></span>
    <span id="statusText">No text selected</span>
  </div>

  <div class="controls-panel">
    <!-- Text Content -->
    <div class="control-section">
      <div class="section-header"><span>Text Content</span></div>
      <textarea id="textContent" placeholder="Enter your text..." aria-label="Text content">Sample Text</textarea>
    </div>

    <!-- Font Family -->
    <div class="control-section">
      <div class="section-header"><span>Font Family</span></div>
      <select id="fontFamily" aria-label="Font family">
        <optgroup label="Sans-Serif">
          <option value="Inter" selected>Inter</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Poppins">Poppins</option>
          <option value="system-ui">System UI</option>
        </optgroup>
        <optgroup label="Serif">
          <option value="Playfair Display">Playfair Display</option>
          <option value="Georgia">Georgia</option>
        </optgroup>
        <optgroup label="Display">
          <option value="Bebas Neue">Bebas Neue</option>
        </optgroup>
        <optgroup label="Script">
          <option value="Dancing Script">Dancing Script</option>
        </optgroup>
      </select>
    </div>

    <!-- Size & Weight -->
    <div class="control-section">
      <div class="section-header"><span>Size & Weight</span></div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label">
            <span>Font Size</span>
            <span class="control-value" id="fontSizeValue">32px</span>
          </div>
          <input type="range" id="fontSize" min="8" max="200" value="32" aria-label="Font size">
        </div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label">
            <span>Font Weight</span>
            <span class="control-value" id="fontWeightValue">400</span>
          </div>
          <input type="range" id="fontWeight" min="100" max="900" step="100" value="400" aria-label="Font weight">
        </div>
      </div>
    </div>

    <!-- Color -->
    <div class="control-section">
      <div class="section-header"><span>Color</span></div>
      <div class="color-row">
        <input type="color" id="textColor" value="#e2e8f0" aria-label="Text color">
        <input type="text" class="color-hex" id="colorHex" value="#E2E8F0" maxlength="7" aria-label="Color hex code">
      </div>
    </div>

    <!-- Spacing -->
    <div class="control-section">
      <div class="section-header"><span>Spacing</span></div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label">
            <span>Letter Spacing</span>
            <span class="control-value" id="letterSpacingValue">0px</span>
          </div>
          <input type="range" id="letterSpacing" min="-10" max="30" value="0" step="0.5" aria-label="Letter spacing">
        </div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label">
            <span>Line Height</span>
            <span class="control-value" id="lineHeightValue">1.5</span>
          </div>
          <input type="range" id="lineHeight" min="0.8" max="3" value="1.5" step="0.1" aria-label="Line height">
        </div>
      </div>
    </div>

    <!-- Alignment -->
    <div class="control-section">
      <div class="section-header"><span>Alignment</span></div>
      <div class="btn-group" role="group" aria-label="Text alignment">
        <button class="btn active" data-align="left" aria-pressed="true" title="Align Left">
          <svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z"/></svg>
        </button>
        <button class="btn" data-align="center" aria-pressed="false" title="Align Center">
          <svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm3 4h12v2H6V7zm-3 4h18v2H3v-2zm3 4h12v2H6v-2zm-3 4h18v2H3v-2z"/></svg>
        </button>
        <button class="btn" data-align="right" aria-pressed="false" title="Align Right">
          <svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm6 4h12v2H9V7zm-6 4h18v2H3v-2zm6 4h12v2H9v-2zm-6 4h18v2H3v-2z"/></svg>
        </button>
      </div>
    </div>

    <!-- Style Options -->
    <div class="control-section">
      <div class="section-header"><span>Style Options</span></div>
      <div class="btn-group" role="group" aria-label="Text styles">
        <button class="btn" id="toggleItalic" aria-pressed="false" title="Italic">
          <svg viewBox="0 0 24 24"><path d="M10 4v2h2.21l-3.42 12H6v2h8v-2h-2.21l3.42-12H18V4h-8z"/></svg>
        </button>
        <button class="btn" id="toggleUnderline" aria-pressed="false" title="Underline">
          <svg viewBox="0 0 24 24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
        </button>
        <button class="btn" id="toggleStrike" aria-pressed="false" title="Strikethrough">
          <svg viewBox="0 0 24 24"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>
        </button>
      </div>
    </div>

    <!-- Text Transform -->
    <div class="control-section">
      <div class="section-header"><span>Text Transform</span></div>
      <div class="btn-group" role="group" aria-label="Text transform">
        <button class="btn active" data-transform="none" aria-pressed="true">Aa</button>
        <button class="btn" data-transform="uppercase" aria-pressed="false">AA</button>
        <button class="btn" data-transform="lowercase" aria-pressed="false">aa</button>
        <button class="btn" data-transform="capitalize" aria-pressed="false">Aa</button>
      </div>
    </div>

    <!-- Quick Presets -->
    <div class="control-section">
      <div class="section-header"><span>Quick Presets</span></div>
      <div class="preset-grid">
        <button class="preset-btn" data-preset="headline">
          <div class="preview">Headline</div>
          <span>Bold 48px</span>
        </button>
        <button class="preset-btn" data-preset="subheading">
          <div class="preview">Subheading</div>
          <span>Semibold 24px</span>
        </button>
        <button class="preset-btn" data-preset="body">
          <div class="preview">Body Text</div>
          <span>Regular 16px</span>
        </button>
        <button class="preset-btn" data-preset="caption">
          <div class="preview">Caption</div>
          <span>Regular 12px</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      const state = {
        content: 'Sample Text',
        fontFamily: 'Inter',
        fontSize: 32,
        fontWeight: 400,
        color: '#e2e8f0',
        letterSpacing: 0,
        lineHeight: 1.5,
        textAlign: 'left',
        textTransform: 'none',
        fontStyle: 'normal',
        textDecoration: 'none',
        selectedId: null,
      };

      // Presets
      const presets = {
        headline: { fontFamily: 'Montserrat', fontSize: 48, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 },
        subheading: { fontFamily: 'Inter', fontSize: 24, fontWeight: 600, letterSpacing: 0, lineHeight: 1.3 },
        body: { fontFamily: 'Inter', fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: 1.6 },
        caption: { fontFamily: 'Inter', fontSize: 12, fontWeight: 400, letterSpacing: 0.5, lineHeight: 1.4 },
      };

      // DOM References
      const elements = {
        textContent: document.getElementById('textContent'),
        fontFamily: document.getElementById('fontFamily'),
        fontSize: document.getElementById('fontSize'),
        fontWeight: document.getElementById('fontWeight'),
        textColor: document.getElementById('textColor'),
        colorHex: document.getElementById('colorHex'),
        letterSpacing: document.getElementById('letterSpacing'),
        lineHeight: document.getElementById('lineHeight'),
        selectionStatus: document.getElementById('selectionStatus'),
        statusText: document.getElementById('statusText'),
      };

      // Update UI from state
      function updateUI() {
        elements.textContent.value = state.content;
        elements.fontFamily.value = state.fontFamily;
        elements.fontSize.value = state.fontSize;
        elements.fontWeight.value = state.fontWeight;
        elements.textColor.value = state.color;
        elements.colorHex.value = state.color.toUpperCase();
        elements.letterSpacing.value = state.letterSpacing;
        elements.lineHeight.value = state.lineHeight;

        document.getElementById('fontSizeValue').textContent = state.fontSize + 'px';
        document.getElementById('fontWeightValue').textContent = state.fontWeight;
        document.getElementById('letterSpacingValue').textContent = state.letterSpacing + 'px';
        document.getElementById('lineHeightValue').textContent = state.lineHeight.toFixed(1);

        // Update button states
        document.querySelectorAll('[data-align]').forEach(function(btn) {
          const isActive = btn.dataset.align === state.textAlign;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-pressed', isActive);
        });

        document.querySelectorAll('[data-transform]').forEach(function(btn) {
          const isActive = btn.dataset.transform === state.textTransform;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-pressed', isActive);
        });

        const italicBtn = document.getElementById('toggleItalic');
        const underlineBtn = document.getElementById('toggleUnderline');
        const strikeBtn = document.getElementById('toggleStrike');

        italicBtn.classList.toggle('active', state.fontStyle === 'italic');
        italicBtn.setAttribute('aria-pressed', state.fontStyle === 'italic');
        underlineBtn.classList.toggle('active', state.textDecoration.includes('underline'));
        underlineBtn.setAttribute('aria-pressed', state.textDecoration.includes('underline'));
        strikeBtn.classList.toggle('active', state.textDecoration.includes('line-through'));
        strikeBtn.setAttribute('aria-pressed', state.textDecoration.includes('line-through'));
      }

      function updateSelectionStatus() {
        if (state.selectedId) {
          elements.selectionStatus.classList.add('has-selection');
          elements.statusText.textContent = 'Editing: ' + state.selectedId.slice(0, 12) + '...';
        } else {
          elements.selectionStatus.classList.remove('has-selection');
          elements.statusText.textContent = 'No text selected';
        }
      }

      function getStyleData() {
        return {
          content: state.content,
          fontFamily: state.fontFamily,
          fontSize: state.fontSize,
          fontWeight: state.fontWeight,
          color: state.color,
          letterSpacing: state.letterSpacing,
          lineHeight: state.lineHeight,
          textAlign: state.textAlign,
          textTransform: state.textTransform,
          fontStyle: state.fontStyle,
          textDecoration: state.textDecoration,
        };
      }

      function emitStyleChange() {
        const styleData = getStyleData();

        // Emit broadcast event for canvas
        API.emit('canvas:style-changed', {
          targetType: 'text',
          targetId: state.selectedId,
          styles: styleData
        });

        // Emit pipeline output
        API.emitOutput('text.style-changed', styleData);
        API.emitOutput('text.content', state.content);

        // Persist state
        API.setState(state);
      }

      // Event Handlers
      document.getElementById('addTextBtn').addEventListener('click', function() {
        const styleData = getStyleData();

        // Emit broadcast to create text on canvas
        API.emit('canvas:add-text', styleData);

        // Emit pipeline output
        API.emitOutput('text.created', styleData);

        API.log('Added text to canvas');
      });

      elements.textContent.addEventListener('input', function(e) {
        state.content = e.target.value;
        emitStyleChange();
      });

      elements.fontFamily.addEventListener('change', function(e) {
        state.fontFamily = e.target.value;
        emitStyleChange();
      });

      elements.fontSize.addEventListener('input', function(e) {
        state.fontSize = parseInt(e.target.value);
        document.getElementById('fontSizeValue').textContent = state.fontSize + 'px';
        emitStyleChange();
      });

      elements.fontWeight.addEventListener('input', function(e) {
        state.fontWeight = parseInt(e.target.value);
        document.getElementById('fontWeightValue').textContent = state.fontWeight;
        emitStyleChange();
      });

      elements.textColor.addEventListener('input', function(e) {
        state.color = e.target.value;
        elements.colorHex.value = state.color.toUpperCase();
        emitStyleChange();
      });

      elements.colorHex.addEventListener('input', function(e) {
        var hex = e.target.value;
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          state.color = hex;
          elements.textColor.value = hex;
          emitStyleChange();
        }
      });

      elements.letterSpacing.addEventListener('input', function(e) {
        state.letterSpacing = parseFloat(e.target.value);
        document.getElementById('letterSpacingValue').textContent = state.letterSpacing + 'px';
        emitStyleChange();
      });

      elements.lineHeight.addEventListener('input', function(e) {
        state.lineHeight = parseFloat(e.target.value);
        document.getElementById('lineHeightValue').textContent = state.lineHeight.toFixed(1);
        emitStyleChange();
      });

      // Alignment buttons
      document.querySelectorAll('[data-align]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          state.textAlign = btn.dataset.align;
          updateUI();
          emitStyleChange();
        });
      });

      // Transform buttons
      document.querySelectorAll('[data-transform]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          state.textTransform = btn.dataset.transform;
          updateUI();
          emitStyleChange();
        });
      });

      // Style toggles
      document.getElementById('toggleItalic').addEventListener('click', function() {
        state.fontStyle = state.fontStyle === 'italic' ? 'normal' : 'italic';
        updateUI();
        emitStyleChange();
      });

      document.getElementById('toggleUnderline').addEventListener('click', function() {
        if (state.textDecoration.includes('underline')) {
          state.textDecoration = state.textDecoration.replace('underline', '').trim() || 'none';
        } else {
          state.textDecoration = state.textDecoration === 'none' ? 'underline' : state.textDecoration + ' underline';
        }
        updateUI();
        emitStyleChange();
      });

      document.getElementById('toggleStrike').addEventListener('click', function() {
        if (state.textDecoration.includes('line-through')) {
          state.textDecoration = state.textDecoration.replace('line-through', '').trim() || 'none';
        } else {
          state.textDecoration = state.textDecoration === 'none' ? 'line-through' : state.textDecoration + ' line-through';
        }
        updateUI();
        emitStyleChange();
      });

      // Presets
      document.querySelectorAll('.preset-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var preset = presets[btn.dataset.preset];
          if (preset) {
            Object.assign(state, preset);
            updateUI();
            emitStyleChange();
            API.log('Applied preset: ' + btn.dataset.preset);
          }
        });
      });

      // WidgetAPI Integration
      API.onMount(function(context) {
        if (context.state) {
          Object.assign(state, context.state);
        }
        updateUI();
        updateSelectionStatus();
        API.log('TextTool Pro mounted');
      });

      // Pipeline inputs
      API.onInput('text.load', function(value) {
        if (value && typeof value === 'object') {
          Object.entries(value).forEach(function(entry) {
            if (entry[0] in state) state[entry[0]] = entry[1];
          });
          updateUI();
        }
      });

      API.onInput('style.apply', function(value) {
        if (value && typeof value === 'object') {
          Object.entries(value).forEach(function(entry) {
            if (entry[0] in state) state[entry[0]] = entry[1];
          });
          updateUI();
          emitStyleChange();
        }
      });

      API.onInput('color.set', function(value) {
        if (value && typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) {
          state.color = value;
          updateUI();
          emitStyleChange();
        }
      });

      // Broadcast events
      API.on('entity:selected', function(event) {
        if (event.payload && (event.payload.entityType === 'text' || event.payload.type === 'text')) {
          state.selectedId = event.payload.id || event.payload.widgetInstanceId;
          if (event.payload.styles) {
            Object.entries(event.payload.styles).forEach(function(entry) {
              if (entry[0] in state) state[entry[0]] = entry[1];
            });
          }
          if (event.payload.content) state.content = event.payload.content;
          updateUI();
          updateSelectionStatus();
        }
      });

      API.on('selection:cleared', function() {
        state.selectedId = null;
        updateSelectionStatus();
      });

      API.on('widget:deselected', function() {
        state.selectedId = null;
        updateSelectionStatus();
      });

      API.on('brand:color-changed', function(event) {
        if (event.payload && event.payload.color) {
          state.color = event.payload.color;
          updateUI();
          emitStyleChange();
        }
      });

      API.on('brand:font-changed', function(event) {
        if (event.payload && event.payload.fontFamily) {
          state.fontFamily = event.payload.fontFamily;
          updateUI();
          emitStyleChange();
        }
      });

      API.onDestroy(function() {
        API.log('TextTool Pro destroyed');
      });

    })();
  </script>
</body>
</html>
`;

export const TextToolWidgetV2: BuiltinWidget = {
  manifest: TextToolWidgetV2Manifest,
  html: TextToolWidgetV2HTML,
};
