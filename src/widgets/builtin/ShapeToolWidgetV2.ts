/**
 * StickerNest v2 - Shape Tool Widget (Enhanced X5)
 *
 * Adobe-style vector shape tool with comprehensive shape controls,
 * proper pipeline I/O, canvas entity integration, and mobile support.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ShapeToolWidgetV2Manifest: WidgetManifest = {
  id: 'stickernest.shape-tool-v2',
  name: 'Shape Tool Pro',
  version: '2.0.0',
  kind: '2d',
  entry: 'index.html',
  description: 'Professional shape tool for adding vector shapes with fill, stroke, shadows, and advanced styling',
  author: 'StickerNest',
  tags: ['shape', 'vector', 'design', 'tool', 'graphics', 'svg'],
  capabilities: {
    draggable: true,
    resizable: true,
    canEdit: ['shape', 'vector'],
    canCreate: ['shape'],
    isDesignTool: true,
  },
  inputs: {
    'shape.load': {
      type: 'object',
      description: 'Load shape properties from external source',
    },
    'style.apply': {
      type: 'object',
      description: 'Apply style preset or custom styles',
    },
    'color.set': {
      type: 'string',
      description: 'Set fill color from color picker',
    },
    'entity:selected': {
      type: 'object',
      description: 'Entity selected on canvas',
    },
  },
  outputs: {
    'shape.created': {
      type: 'object',
      description: 'Emitted when shape is added to canvas',
    },
    'shape.style-changed': {
      type: 'object',
      description: 'Emitted when shape style changes',
    },
  },
  events: {
    emits: ['canvas:add-shape', 'canvas:style-changed'],
    listens: ['widget:selected', 'widget:deselected', 'entity:selected', 'selection:cleared', 'brand:color-changed'],
  },
  io: {
    inputs: ['shape.load', 'style.apply', 'color.set'],
    outputs: ['shape.created', 'shape.style-changed'],
  },
  size: {
    width: 320,
    height: 700,
    minWidth: 280,
    minHeight: 550,
    maxWidth: 450,
  },
};

export const ShapeToolWidgetV2HTML = `
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
      --sn-accent-gradient: linear-gradient(135deg, #8b5cf6, #06b6d4);
      --sn-border-primary: rgba(139, 92, 246, 0.2);
      --sn-border-hover: rgba(139, 92, 246, 0.4);
      --sn-radius-sm: 4px;
      --sn-radius-md: 6px;
      --sn-radius-lg: 8px;
      --sn-transition: 0.15s ease;
      --sn-success: #22c55e;
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
    }

    .add-btn {
      width: 100%;
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

    /* Preview Canvas */
    .preview-canvas {
      flex: 0 0 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sn-bg-tertiary);
      border-bottom: 1px solid var(--sn-border-primary);
    }

    #shapePreview { max-width: 80px; max-height: 80px; }

    /* Shape Grid */
    .shape-picker {
      padding: 10px;
      background: var(--sn-bg-tertiary);
      border-bottom: 1px solid var(--sn-border-primary);
    }

    .shape-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 4px;
    }

    .shape-btn {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sn-bg-primary);
      border: 2px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      cursor: pointer;
      transition: all var(--sn-transition);
      padding: 5px;
      touch-action: manipulation;
    }

    .shape-btn:hover { border-color: var(--sn-border-hover); transform: scale(1.05); }
    .shape-btn.active { border-color: var(--sn-accent-primary); background: rgba(139, 92, 246, 0.1); }
    .shape-btn svg { width: 100%; height: 100%; fill: var(--sn-text-secondary); }
    .shape-btn.active svg { fill: var(--sn-accent-primary); }

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
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--sn-border-primary);
    }

    .control-section:last-child { border-bottom: none; }

    .section-header {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sn-text-secondary);
      margin-bottom: 8px;
    }

    .control-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
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
      transition: transform var(--sn-transition);
    }

    input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.15); }

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

    /* Color Row */
    .color-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    input[type="color"] {
      width: 36px; height: 32px;
      padding: 0;
      border: 2px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      cursor: pointer;
      background: none;
    }

    input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
    input[type="color"]::-webkit-color-swatch { border: none; border-radius: 2px; }

    .color-hex {
      flex: 1;
      padding: 8px 10px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-primary);
      font-size: 12px;
      font-family: monospace;
    }

    /* Color Presets */
    .color-presets {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .color-preset {
      width: 22px; height: 22px;
      border-radius: 4px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all var(--sn-transition);
    }

    .color-preset:hover { transform: scale(1.15); }
    .color-preset.active { border-color: white; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--sn-bg-primary); }
    ::-webkit-scrollbar-thumb { background: var(--sn-bg-tertiary); border-radius: 3px; }

    /* Mobile */
    @media (pointer: coarse) {
      .shape-btn { min-height: 44px; }
      .toggle-switch { width: 44px; height: 24px; }
      .toggle-switch::after { width: 20px; height: 20px; }
      .toggle-switch.active::after { left: 22px; }
      input[type="range"]::-webkit-slider-thumb { width: 20px; height: 20px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <button class="add-btn" id="addShapeBtn" aria-label="Add shape to canvas">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
      Add Shape to Canvas
    </button>
  </div>

  <div class="selection-status" id="selectionStatus" role="status" aria-live="polite">
    <span class="dot"></span>
    <span id="statusText">No shape selected</span>
  </div>

  <div class="preview-canvas">
    <svg id="shapePreview" viewBox="0 0 100 100" width="70" height="70">
      <rect id="shapeElement" x="10" y="10" width="80" height="80" fill="#8b5cf6"/>
    </svg>
  </div>

  <div class="shape-picker">
    <div class="shape-grid">
      <button class="shape-btn active" data-shape="rectangle" title="Rectangle">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="0"/></svg>
      </button>
      <button class="shape-btn" data-shape="roundedRect" title="Rounded Rectangle">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>
      </button>
      <button class="shape-btn" data-shape="circle" title="Circle">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>
      </button>
      <button class="shape-btn" data-shape="ellipse" title="Ellipse">
        <svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="10" ry="6"/></svg>
      </button>
      <button class="shape-btn" data-shape="triangle" title="Triangle">
        <svg viewBox="0 0 24 24"><polygon points="12,3 22,21 2,21"/></svg>
      </button>
      <button class="shape-btn" data-shape="polygon" title="Hexagon">
        <svg viewBox="0 0 24 24"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/></svg>
      </button>
      <button class="shape-btn" data-shape="star" title="Star">
        <svg viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg>
      </button>
      <button class="shape-btn" data-shape="heart" title="Heart">
        <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </button>
      <button class="shape-btn" data-shape="diamond" title="Diamond">
        <svg viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12"/></svg>
      </button>
      <button class="shape-btn" data-shape="arrow" title="Arrow">
        <svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg>
      </button>
      <button class="shape-btn" data-shape="pentagon" title="Pentagon">
        <svg viewBox="0 0 24 24"><polygon points="12,2 22,9 18,21 6,21 2,9"/></svg>
      </button>
      <button class="shape-btn" data-shape="octagon" title="Octagon">
        <svg viewBox="0 0 24 24"><polygon points="7,2 17,2 22,7 22,17 17,22 7,22 2,17 2,7"/></svg>
      </button>
    </div>
  </div>

  <div class="controls-panel">
    <!-- Fill -->
    <div class="control-section">
      <div class="section-header">Fill</div>
      <div class="toggle-row">
        <span class="toggle-label">Enable Fill</span>
        <div class="toggle-switch active" id="fillEnabled" role="switch" aria-checked="true" tabindex="0"></div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label"><span>Fill Color</span></div>
          <div class="color-row">
            <input type="color" id="fillColor" value="#8b5cf6" aria-label="Fill color">
            <input type="text" class="color-hex" id="fillHex" value="#8B5CF6" aria-label="Fill hex code">
          </div>
        </div>
      </div>
      <div class="color-presets">
        <div class="color-preset active" style="background:#8b5cf6" data-color="#8b5cf6"></div>
        <div class="color-preset" style="background:#ec4899" data-color="#ec4899"></div>
        <div class="color-preset" style="background:#06b6d4" data-color="#06b6d4"></div>
        <div class="color-preset" style="background:#22c55e" data-color="#22c55e"></div>
        <div class="color-preset" style="background:#f97316" data-color="#f97316"></div>
        <div class="color-preset" style="background:#ef4444" data-color="#ef4444"></div>
        <div class="color-preset" style="background:#fbbf24" data-color="#fbbf24"></div>
        <div class="color-preset" style="background:#e2e8f0" data-color="#e2e8f0"></div>
      </div>
    </div>

    <!-- Stroke -->
    <div class="control-section">
      <div class="section-header">Stroke</div>
      <div class="toggle-row">
        <span class="toggle-label">Enable Stroke</span>
        <div class="toggle-switch" id="strokeEnabled" role="switch" aria-checked="false" tabindex="0"></div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label">
            <span>Width</span>
            <span class="control-value" id="strokeWidthValue">0px</span>
          </div>
          <input type="range" id="strokeWidth" min="0" max="20" value="0" aria-label="Stroke width">
        </div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label"><span>Stroke Color</span></div>
          <div class="color-row">
            <input type="color" id="strokeColor" value="#6d28d9" aria-label="Stroke color">
            <input type="text" class="color-hex" id="strokeHex" value="#6D28D9" aria-label="Stroke hex code">
          </div>
        </div>
      </div>
    </div>

    <!-- Corner Radius -->
    <div class="control-section" id="radiusSection">
      <div class="section-header">Corner Radius</div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label">
            <span>Radius</span>
            <span class="control-value" id="radiusValue">0px</span>
          </div>
          <input type="range" id="cornerRadius" min="0" max="50" value="0" aria-label="Corner radius">
        </div>
      </div>
    </div>

    <!-- Opacity -->
    <div class="control-section">
      <div class="section-header">Opacity</div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label">
            <span>Opacity</span>
            <span class="control-value" id="opacityValue">100%</span>
          </div>
          <input type="range" id="opacity" min="0" max="100" value="100" aria-label="Opacity">
        </div>
      </div>
    </div>

    <!-- Shadow -->
    <div class="control-section">
      <div class="section-header">Shadow</div>
      <div class="toggle-row">
        <span class="toggle-label">Enable Shadow</span>
        <div class="toggle-switch" id="shadowEnabled" role="switch" aria-checked="false" tabindex="0"></div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label">
            <span>Blur</span>
            <span class="control-value" id="shadowBlurValue">4px</span>
          </div>
          <input type="range" id="shadowBlur" min="0" max="30" value="4" aria-label="Shadow blur">
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      const state = {
        shape: 'rectangle',
        fill: { enabled: true, color: '#8b5cf6' },
        stroke: { enabled: false, color: '#6d28d9', width: 0 },
        cornerRadius: 0,
        opacity: 100,
        shadow: { enabled: false, blur: 4, color: '#000000' },
        selectedId: null,
      };

      // Shape paths for preview
      const shapePaths = {
        rectangle: function() { return '<rect x="10" y="10" width="80" height="80" rx="' + state.cornerRadius + '"/>'; },
        roundedRect: function() { return '<rect x="10" y="10" width="80" height="80" rx="' + Math.max(state.cornerRadius, 10) + '"/>'; },
        circle: function() { return '<circle cx="50" cy="50" r="40"/>'; },
        ellipse: function() { return '<ellipse cx="50" cy="50" rx="40" ry="25"/>'; },
        triangle: function() { return '<polygon points="50,10 90,90 10,90"/>'; },
        pentagon: function() { return createPolygon(5, 40, 50, 50); },
        polygon: function() { return createPolygon(6, 40, 50, 50); },
        octagon: function() { return createPolygon(8, 40, 50, 50); },
        star: function() { return createStar(5, 40, 20, 50, 50); },
        heart: function() { return '<path d="M50 85 C50 85 15 60 15 35 C15 15 35 5 50 25 C65 5 85 15 85 35 C85 60 50 85 50 85 Z"/>'; },
        diamond: function() { return '<polygon points="50,10 90,50 50,90 10,50"/>'; },
        arrow: function() { return '<path d="M20 50 L70 50 L70 35 L90 50 L70 65 L70 50"/>'; },
      };

      function createPolygon(sides, radius, cx, cy) {
        var points = [];
        for (var i = 0; i < sides; i++) {
          var angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
          var x = cx + radius * Math.cos(angle);
          var y = cy + radius * Math.sin(angle);
          points.push(x + ',' + y);
        }
        return '<polygon points="' + points.join(' ') + '"/>';
      }

      function createStar(pts, outerR, innerR, cx, cy) {
        var points = [];
        for (var i = 0; i < pts * 2; i++) {
          var r = i % 2 === 0 ? outerR : innerR;
          var angle = (i * Math.PI / pts) - Math.PI / 2;
          var x = cx + r * Math.cos(angle);
          var y = cy + r * Math.sin(angle);
          points.push(x + ',' + y);
        }
        return '<polygon points="' + points.join(' ') + '"/>';
      }

      function renderPreview() {
        var svg = document.getElementById('shapePreview');
        var path = shapePaths[state.shape] ? shapePaths[state.shape]() : shapePaths.rectangle();
        var fill = state.fill.enabled ? state.fill.color : 'none';
        var stroke = state.stroke.enabled ? state.stroke.color : 'none';
        var strokeWidth = state.stroke.enabled ? state.stroke.width : 0;
        var opacity = state.opacity / 100;
        var filter = state.shadow.enabled ? 'url(#shadowFilter)' : 'none';

        svg.innerHTML = '<defs><filter id="shadowFilter" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="2" dy="2" stdDeviation="' + state.shadow.blur + '" flood-color="' + state.shadow.color + '80"/></filter></defs><g fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + strokeWidth + '" opacity="' + opacity + '" filter="' + filter + '">' + path + '</g>';
      }

      function updateUI() {
        document.querySelectorAll('.shape-btn').forEach(function(b) { b.classList.remove('active'); });
        var activeBtn = document.querySelector('[data-shape="' + state.shape + '"]');
        if (activeBtn) activeBtn.classList.add('active');

        document.getElementById('fillEnabled').classList.toggle('active', state.fill.enabled);
        document.getElementById('fillEnabled').setAttribute('aria-checked', state.fill.enabled);
        document.getElementById('strokeEnabled').classList.toggle('active', state.stroke.enabled);
        document.getElementById('strokeEnabled').setAttribute('aria-checked', state.stroke.enabled);
        document.getElementById('shadowEnabled').classList.toggle('active', state.shadow.enabled);
        document.getElementById('shadowEnabled').setAttribute('aria-checked', state.shadow.enabled);

        document.getElementById('fillColor').value = state.fill.color;
        document.getElementById('fillHex').value = state.fill.color.toUpperCase();
        document.getElementById('strokeColor').value = state.stroke.color;
        document.getElementById('strokeHex').value = state.stroke.color.toUpperCase();
        document.getElementById('strokeWidth').value = state.stroke.width;
        document.getElementById('cornerRadius').value = state.cornerRadius;
        document.getElementById('opacity').value = state.opacity;
        document.getElementById('shadowBlur').value = state.shadow.blur;

        document.getElementById('strokeWidthValue').textContent = state.stroke.width + 'px';
        document.getElementById('radiusValue').textContent = state.cornerRadius + 'px';
        document.getElementById('opacityValue').textContent = state.opacity + '%';
        document.getElementById('shadowBlurValue').textContent = state.shadow.blur + 'px';

        document.getElementById('radiusSection').style.display = ['rectangle', 'roundedRect'].includes(state.shape) ? 'block' : 'none';

        document.querySelectorAll('.color-preset').forEach(function(p) {
          p.classList.toggle('active', p.dataset.color === state.fill.color);
        });

        renderPreview();
      }

      function updateSelectionStatus() {
        var status = document.getElementById('selectionStatus');
        var text = document.getElementById('statusText');
        if (state.selectedId) {
          status.classList.add('has-selection');
          text.textContent = 'Editing: ' + state.selectedId.slice(0, 12) + '...';
        } else {
          status.classList.remove('has-selection');
          text.textContent = 'No shape selected';
        }
      }

      function getStyleData() {
        return {
          type: state.shape,
          fill: { enabled: state.fill.enabled, color: state.fill.color },
          stroke: { enabled: state.stroke.enabled, color: state.stroke.color, width: state.stroke.width },
          cornerRadius: state.cornerRadius,
          opacity: state.opacity,
          shadow: { enabled: state.shadow.enabled, blur: state.shadow.blur, color: state.shadow.color },
        };
      }

      function emitStyleChange() {
        var styleData = getStyleData();
        API.emit('canvas:style-changed', { targetType: 'shape', targetId: state.selectedId, styles: styleData });
        API.emitOutput('shape.style-changed', styleData);
        API.setState(state);
      }

      // Event Handlers
      document.getElementById('addShapeBtn').addEventListener('click', function() {
        var styleData = getStyleData();
        API.emit('canvas:add-shape', styleData);
        API.emitOutput('shape.created', styleData);
        API.log('Added shape to canvas: ' + state.shape);
      });

      document.querySelectorAll('.shape-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          state.shape = btn.dataset.shape;
          updateUI();
          emitStyleChange();
        });
      });

      document.getElementById('fillEnabled').addEventListener('click', function() {
        state.fill.enabled = !state.fill.enabled;
        updateUI();
        emitStyleChange();
      });

      document.getElementById('strokeEnabled').addEventListener('click', function() {
        state.stroke.enabled = !state.stroke.enabled;
        updateUI();
        emitStyleChange();
      });

      document.getElementById('shadowEnabled').addEventListener('click', function() {
        state.shadow.enabled = !state.shadow.enabled;
        updateUI();
        emitStyleChange();
      });

      document.getElementById('fillColor').addEventListener('input', function(e) {
        state.fill.color = e.target.value;
        document.getElementById('fillHex').value = e.target.value.toUpperCase();
        updateUI();
        emitStyleChange();
      });

      document.getElementById('fillHex').addEventListener('input', function(e) {
        var hex = e.target.value;
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          state.fill.color = hex;
          document.getElementById('fillColor').value = hex;
          updateUI();
          emitStyleChange();
        }
      });

      document.getElementById('strokeColor').addEventListener('input', function(e) {
        state.stroke.color = e.target.value;
        document.getElementById('strokeHex').value = e.target.value.toUpperCase();
        updateUI();
        emitStyleChange();
      });

      document.getElementById('strokeHex').addEventListener('input', function(e) {
        var hex = e.target.value;
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          state.stroke.color = hex;
          document.getElementById('strokeColor').value = hex;
          updateUI();
          emitStyleChange();
        }
      });

      document.getElementById('strokeWidth').addEventListener('input', function(e) {
        state.stroke.width = parseInt(e.target.value);
        document.getElementById('strokeWidthValue').textContent = state.stroke.width + 'px';
        updateUI();
        emitStyleChange();
      });

      document.getElementById('cornerRadius').addEventListener('input', function(e) {
        state.cornerRadius = parseInt(e.target.value);
        document.getElementById('radiusValue').textContent = state.cornerRadius + 'px';
        updateUI();
        emitStyleChange();
      });

      document.getElementById('opacity').addEventListener('input', function(e) {
        state.opacity = parseInt(e.target.value);
        document.getElementById('opacityValue').textContent = state.opacity + '%';
        updateUI();
        emitStyleChange();
      });

      document.getElementById('shadowBlur').addEventListener('input', function(e) {
        state.shadow.blur = parseInt(e.target.value);
        document.getElementById('shadowBlurValue').textContent = state.shadow.blur + 'px';
        updateUI();
        emitStyleChange();
      });

      document.querySelectorAll('.color-preset').forEach(function(preset) {
        preset.addEventListener('click', function() {
          state.fill.color = preset.dataset.color;
          updateUI();
          emitStyleChange();
        });
      });

      // WidgetAPI Integration
      API.onMount(function(context) {
        if (context.state) Object.assign(state, context.state);
        updateUI();
        updateSelectionStatus();
        API.log('ShapeTool Pro mounted');
      });

      API.onInput('shape.load', function(value) {
        if (value && typeof value === 'object') {
          if (value.shape) state.shape = value.shape;
          if (value.fill) state.fill = { ...state.fill, ...value.fill };
          if (value.stroke) state.stroke = { ...state.stroke, ...value.stroke };
          if (value.cornerRadius !== undefined) state.cornerRadius = value.cornerRadius;
          if (value.opacity !== undefined) state.opacity = value.opacity;
          if (value.shadow) state.shadow = { ...state.shadow, ...value.shadow };
          updateUI();
        }
      });

      API.onInput('style.apply', function(value) {
        if (value && typeof value === 'object') {
          if (value.fill) state.fill = { ...state.fill, ...value.fill };
          if (value.stroke) state.stroke = { ...state.stroke, ...value.stroke };
          updateUI();
          emitStyleChange();
        }
      });

      API.onInput('color.set', function(value) {
        if (value && typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) {
          state.fill.color = value;
          updateUI();
          emitStyleChange();
        }
      });

      API.on('entity:selected', function(event) {
        if (event.payload && (event.payload.entityType === 'shape' || event.payload.entityType === 'vector' || event.payload.type === 'vector')) {
          state.selectedId = event.payload.id || event.payload.widgetInstanceId;
          if (event.payload.styles) {
            if (event.payload.styles.fill) state.fill = { ...state.fill, ...event.payload.styles.fill };
            if (event.payload.styles.stroke) state.stroke = { ...state.stroke, ...event.payload.styles.stroke };
            if (event.payload.styles.cornerRadius !== undefined) state.cornerRadius = event.payload.styles.cornerRadius;
            if (event.payload.styles.opacity !== undefined) state.opacity = event.payload.styles.opacity;
            if (event.payload.styles.shadow) state.shadow = { ...state.shadow, ...event.payload.styles.shadow };
            if (event.payload.styles.shape) state.shape = event.payload.styles.shape;
          }
          updateUI();
          updateSelectionStatus();
        }
      });

      API.on('selection:cleared', function() {
        state.selectedId = null;
        updateSelectionStatus();
      });

      API.on('brand:color-changed', function(event) {
        if (event.payload && event.payload.color) {
          state.fill.color = event.payload.color;
          updateUI();
          emitStyleChange();
        }
      });

      API.onDestroy(function() {
        API.log('ShapeTool Pro destroyed');
      });

    })();
  </script>
</body>
</html>
`;

export const ShapeToolWidgetV2: BuiltinWidget = {
  manifest: ShapeToolWidgetV2Manifest,
  html: ShapeToolWidgetV2HTML,
};
