/**
 * StickerNest v2 - Image Tool Widget (Enhanced X5)
 *
 * Professional image tool with upload, filters, masks,
 * proper pipeline I/O, canvas entity integration, and mobile support.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ImageToolWidgetV2Manifest: WidgetManifest = {
  id: 'stickernest.image-tool-v2',
  name: 'Image Tool Pro',
  version: '2.0.0',
  kind: '2d',
  entry: 'index.html',
  description: 'Professional image tool for adding images with filters, masks, and adjustments',
  author: 'StickerNest',
  tags: ['image', 'photo', 'design', 'tool', 'filter', 'mask', 'upload'],
  capabilities: {
    draggable: true,
    resizable: true,
    canEdit: ['image'],
    canCreate: ['image'],
    isDesignTool: true,
  },
  inputs: {
    'image.load': {
      type: 'string',
      description: 'Load image from URL or data URL',
    },
    'filter.apply': {
      type: 'object',
      description: 'Apply filter adjustments',
    },
    'entity:selected': {
      type: 'object',
      description: 'Entity selected on canvas',
    },
  },
  outputs: {
    'image.created': {
      type: 'object',
      description: 'Emitted when image is added to canvas',
    },
    'image.style-changed': {
      type: 'object',
      description: 'Emitted when image style changes',
    },
  },
  events: {
    emits: ['canvas:add-image', 'canvas:style-changed'],
    listens: ['widget:selected', 'widget:deselected', 'entity:selected', 'selection:cleared', 'asset:image-selected'],
  },
  io: {
    inputs: ['image.load', 'filter.apply'],
    outputs: ['image.created', 'image.style-changed'],
  },
  size: {
    width: 320,
    height: 720,
    minWidth: 280,
    minHeight: 600,
    maxWidth: 450,
  },
};

export const ImageToolWidgetV2HTML = `
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
      --sn-accent-gradient: linear-gradient(135deg, #ec4899, #8b5cf6);
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

    .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .add-btn:active { transform: scale(0.98); }
    .add-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
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
    .selection-status .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sn-text-muted); }
    .selection-status.has-selection .dot { background: var(--sn-success); }

    /* Preview Canvas */
    .preview-canvas {
      flex: 0 0 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sn-bg-tertiary);
      border-bottom: 1px solid var(--sn-border-primary);
      position: relative;
      overflow: hidden;
    }

    .preview-canvas.empty {
      border: 2px dashed var(--sn-border-primary);
      margin: 10px;
      border-radius: 8px;
      cursor: pointer;
    }

    .preview-canvas.empty:hover { border-color: var(--sn-accent-primary); }
    .preview-canvas.empty::after {
      content: 'Click or drop image';
      position: absolute;
      color: var(--sn-text-secondary);
      font-size: 12px;
    }

    .preview-image {
      max-width: 120px;
      max-height: 120px;
      object-fit: contain;
      border-radius: var(--sn-radius-sm);
      transition: all var(--sn-transition);
    }

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

    .control-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .control-group { flex: 1; min-width: 0; }
    .control-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--sn-text-secondary); margin-bottom: 4px; }
    .control-value { color: var(--sn-accent-primary); font-weight: 600; font-size: 10px; font-family: monospace; }

    /* Load Button */
    .load-btn {
      width: 100%;
      padding: 10px;
      background: var(--sn-bg-primary);
      border: 2px dashed var(--sn-border-primary);
      border-radius: var(--sn-radius-md);
      color: var(--sn-text-secondary);
      font-size: 12px;
      cursor: pointer;
      margin-bottom: 10px;
      transition: all var(--sn-transition);
    }

    .load-btn:hover { border-color: var(--sn-accent-primary); color: var(--sn-accent-primary); }

    .url-input {
      width: 100%;
      padding: 8px 10px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-primary);
      font-size: 12px;
    }

    .url-input:focus { outline: none; border-color: var(--sn-accent-primary); }

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

    /* Mask Grid */
    .mask-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .mask-btn {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sn-bg-primary);
      border: 2px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      cursor: pointer;
      transition: all var(--sn-transition);
      padding: 4px;
    }

    .mask-btn:hover { border-color: var(--sn-border-hover); transform: scale(1.05); }
    .mask-btn.active { border-color: var(--sn-accent-primary); background: rgba(139, 92, 246, 0.1); }
    .mask-btn .preview { width: 100%; height: 100%; background: var(--sn-accent-primary); }

    .mask-btn[data-mask="rect"] .preview { clip-path: inset(0); }
    .mask-btn[data-mask="rounded"] .preview { border-radius: 20%; }
    .mask-btn[data-mask="circle"] .preview { clip-path: circle(50% at 50% 50%); }
    .mask-btn[data-mask="triangle"] .preview { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }
    .mask-btn[data-mask="diamond"] .preview { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); }
    .mask-btn[data-mask="hexagon"] .preview { clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
    .mask-btn[data-mask="star"] .preview { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
    .mask-btn[data-mask="heart"] .preview { clip-path: polygon(50% 15%, 30% 0%, 0% 15%, 0% 45%, 50% 100%, 100% 45%, 100% 15%, 70% 0%); }

    select {
      width: 100%;
      padding: 8px 10px;
      background: var(--sn-bg-primary);
      border: 1px solid var(--sn-border-primary);
      border-radius: var(--sn-radius-sm);
      color: var(--sn-text-primary);
      font-size: 12px;
      cursor: pointer;
    }

    select:focus { outline: none; border-color: var(--sn-accent-primary); }

    #fileInput { display: none; }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--sn-bg-primary); }
    ::-webkit-scrollbar-thumb { background: var(--sn-bg-tertiary); border-radius: 3px; }

    @media (pointer: coarse) {
      .mask-btn { min-height: 44px; }
      input[type="range"]::-webkit-slider-thumb { width: 20px; height: 20px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <button class="add-btn" id="addImageBtn" disabled aria-label="Add image to canvas">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
      Add Image to Canvas
    </button>
  </div>

  <div class="selection-status" id="selectionStatus" role="status">
    <span class="dot"></span>
    <span id="statusText">No image selected</span>
  </div>

  <div class="preview-canvas empty" id="previewCanvas">
    <img class="preview-image" id="previewImage" src="" alt="Preview" style="display: none;">
  </div>

  <div class="controls-panel">
    <!-- Load Image -->
    <div class="control-section">
      <div class="section-header">Load Image</div>
      <button class="load-btn" id="loadImageBtn">Click to browse or drop image</button>
      <input type="text" class="url-input" id="imageUrl" placeholder="Or paste image URL...">
      <input type="file" id="fileInput" accept="image/*">
    </div>

    <!-- Mask Shape -->
    <div class="control-section">
      <div class="section-header">Mask Shape</div>
      <div class="mask-grid">
        <button class="mask-btn active" data-mask="rect" title="Rectangle"><div class="preview"></div></button>
        <button class="mask-btn" data-mask="rounded" title="Rounded"><div class="preview"></div></button>
        <button class="mask-btn" data-mask="circle" title="Circle"><div class="preview"></div></button>
        <button class="mask-btn" data-mask="triangle" title="Triangle"><div class="preview"></div></button>
        <button class="mask-btn" data-mask="diamond" title="Diamond"><div class="preview"></div></button>
        <button class="mask-btn" data-mask="hexagon" title="Hexagon"><div class="preview"></div></button>
        <button class="mask-btn" data-mask="star" title="Star"><div class="preview"></div></button>
        <button class="mask-btn" data-mask="heart" title="Heart"><div class="preview"></div></button>
      </div>
    </div>

    <!-- Object Fit -->
    <div class="control-section">
      <div class="section-header">Object Fit</div>
      <select id="objectFit">
        <option value="contain">Contain</option>
        <option value="cover" selected>Cover</option>
        <option value="fill">Fill</option>
        <option value="none">None</option>
      </select>
    </div>

    <!-- Adjustments -->
    <div class="control-section">
      <div class="section-header">Adjustments</div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label"><span>Opacity</span><span class="control-value" id="opacityValue">100%</span></div>
          <input type="range" id="opacity" min="0" max="100" value="100">
        </div>
      </div>
      <div class="control-row">
        <div class="control-group">
          <div class="control-label"><span>Border Radius</span><span class="control-value" id="borderRadiusValue">0px</span></div>
          <input type="range" id="borderRadius" min="0" max="100" value="0">
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="control-section">
      <div class="section-header">Filters</div>
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
      <div class="control-row">
        <div class="control-group">
          <div class="control-label"><span>Grayscale</span><span class="control-value" id="grayscaleValue">0%</span></div>
          <input type="range" id="grayscale" min="0" max="100" value="0">
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      const state = {
        src: null,
        naturalWidth: 0,
        naturalHeight: 0,
        mask: 'rect',
        objectFit: 'cover',
        opacity: 100,
        borderRadius: 0,
        filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0 },
        selectedId: null,
      };

      // DOM
      const previewCanvas = document.getElementById('previewCanvas');
      const previewImage = document.getElementById('previewImage');
      const fileInput = document.getElementById('fileInput');
      const addBtn = document.getElementById('addImageBtn');

      function loadImage(src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
          state.src = src;
          state.naturalWidth = img.width;
          state.naturalHeight = img.height;
          previewImage.src = src;
          previewImage.style.display = 'block';
          previewCanvas.classList.remove('empty');
          addBtn.disabled = false;
          updatePreview();
          emitStyleChange();
          API.log('Image loaded: ' + img.width + 'x' + img.height);
        };
        img.onerror = function() { API.log('Failed to load image'); };
        img.src = src;
      }

      function updatePreview() {
        if (!state.src) return;
        const clipPaths = {
          rect: 'none', rounded: 'none',
          circle: 'circle(50% at 50% 50%)',
          triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
          heart: 'polygon(50% 15%, 30% 0%, 0% 15%, 0% 45%, 50% 100%, 100% 45%, 100% 15%, 70% 0%)',
        };
        previewImage.style.clipPath = clipPaths[state.mask] || 'none';
        previewImage.style.borderRadius = ['rounded', 'rect'].includes(state.mask) ? state.borderRadius + 'px' : '0';
        previewImage.style.opacity = state.opacity / 100;
        previewImage.style.objectFit = state.objectFit;

        var filterParts = [];
        if (state.filters.brightness !== 100) filterParts.push('brightness(' + state.filters.brightness + '%)');
        if (state.filters.contrast !== 100) filterParts.push('contrast(' + state.filters.contrast + '%)');
        if (state.filters.saturation !== 100) filterParts.push('saturate(' + state.filters.saturation + '%)');
        if (state.filters.blur > 0) filterParts.push('blur(' + state.filters.blur + 'px)');
        if (state.filters.grayscale > 0) filterParts.push('grayscale(' + state.filters.grayscale + '%)');
        previewImage.style.filter = filterParts.join(' ') || 'none';
      }

      function updateUI() {
        document.querySelectorAll('.mask-btn').forEach(function(b) { b.classList.remove('active'); });
        var activeBtn = document.querySelector('[data-mask="' + state.mask + '"]');
        if (activeBtn) activeBtn.classList.add('active');

        document.getElementById('objectFit').value = state.objectFit;
        document.getElementById('opacity').value = state.opacity;
        document.getElementById('borderRadius').value = state.borderRadius;
        document.getElementById('brightness').value = state.filters.brightness;
        document.getElementById('contrast').value = state.filters.contrast;
        document.getElementById('saturation').value = state.filters.saturation;
        document.getElementById('blur').value = state.filters.blur;
        document.getElementById('grayscale').value = state.filters.grayscale;

        document.getElementById('opacityValue').textContent = state.opacity + '%';
        document.getElementById('borderRadiusValue').textContent = state.borderRadius + 'px';
        document.getElementById('brightnessValue').textContent = state.filters.brightness + '%';
        document.getElementById('contrastValue').textContent = state.filters.contrast + '%';
        document.getElementById('saturationValue').textContent = state.filters.saturation + '%';
        document.getElementById('blurValue').textContent = state.filters.blur + 'px';
        document.getElementById('grayscaleValue').textContent = state.filters.grayscale + '%';

        updatePreview();
      }

      function updateSelectionStatus() {
        var status = document.getElementById('selectionStatus');
        var text = document.getElementById('statusText');
        if (state.selectedId) {
          status.classList.add('has-selection');
          text.textContent = 'Editing: ' + state.selectedId.slice(0, 12) + '...';
        } else {
          status.classList.remove('has-selection');
          text.textContent = 'No image selected';
        }
      }

      function getStyleData() {
        return {
          src: state.src,
          naturalWidth: state.naturalWidth,
          naturalHeight: state.naturalHeight,
          mask: state.mask,
          objectFit: state.objectFit,
          opacity: state.opacity,
          borderRadius: state.borderRadius,
          filters: { ...state.filters },
        };
      }

      function emitStyleChange() {
        var styleData = getStyleData();
        API.emit('canvas:style-changed', { targetType: 'image', targetId: state.selectedId, styles: styleData });
        API.emitOutput('image.style-changed', styleData);
        API.setState(state);
      }

      // Events
      addBtn.addEventListener('click', function() {
        if (!state.src) return;
        var styleData = getStyleData();
        API.emit('canvas:add-image', styleData);
        API.emitOutput('image.created', styleData);
        API.log('Added image to canvas');
      });

      document.getElementById('loadImageBtn').addEventListener('click', function() { fileInput.click(); });
      previewCanvas.addEventListener('click', function() {
        if (previewCanvas.classList.contains('empty')) fileInput.click();
      });

      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) {
          var reader = new FileReader();
          reader.onload = function(e) { loadImage(e.target.result); };
          reader.readAsDataURL(file);
        }
      });

      document.getElementById('imageUrl').addEventListener('change', function(e) {
        if (e.target.value) loadImage(e.target.value);
      });

      previewCanvas.addEventListener('dragover', function(e) {
        e.preventDefault();
        previewCanvas.style.borderColor = 'var(--sn-accent-primary)';
      });

      previewCanvas.addEventListener('dragleave', function() {
        previewCanvas.style.borderColor = '';
      });

      previewCanvas.addEventListener('drop', function(e) {
        e.preventDefault();
        previewCanvas.style.borderColor = '';
        var file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          var reader = new FileReader();
          reader.onload = function(e) { loadImage(e.target.result); };
          reader.readAsDataURL(file);
        }
      });

      document.querySelectorAll('.mask-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          state.mask = btn.dataset.mask;
          updateUI();
          emitStyleChange();
        });
      });

      document.getElementById('objectFit').addEventListener('change', function(e) {
        state.objectFit = e.target.value;
        updateUI();
        emitStyleChange();
      });

      ['opacity', 'borderRadius', 'brightness', 'contrast', 'saturation', 'blur', 'grayscale'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', function(e) {
          var val = parseInt(e.target.value);
          if (['brightness', 'contrast', 'saturation', 'blur', 'grayscale'].includes(id)) {
            state.filters[id] = val;
          } else {
            state[id] = val;
          }
          document.getElementById(id + 'Value').textContent = val + (id === 'blur' || id === 'borderRadius' ? 'px' : '%');
          updatePreview();
          emitStyleChange();
        });
      });

      // WidgetAPI Integration
      API.onMount(function(context) {
        if (context.state) Object.assign(state, context.state);
        if (state.src) {
          previewImage.src = state.src;
          previewImage.style.display = 'block';
          previewCanvas.classList.remove('empty');
          addBtn.disabled = false;
        }
        updateUI();
        updateSelectionStatus();
        API.log('ImageTool Pro mounted');
      });

      API.onInput('image.load', function(value) {
        if (value && typeof value === 'string') loadImage(value);
      });

      API.onInput('filter.apply', function(value) {
        if (value && typeof value === 'object') {
          state.filters = { ...state.filters, ...value };
          updateUI();
          emitStyleChange();
        }
      });

      API.on('entity:selected', function(event) {
        if (event.payload && event.payload.type === 'image') {
          state.selectedId = event.payload.id;
          if (event.payload.src) loadImage(event.payload.src);
          if (event.payload.styles) {
            if (event.payload.styles.mask) state.mask = event.payload.styles.mask;
            if (event.payload.styles.objectFit) state.objectFit = event.payload.styles.objectFit;
            if (event.payload.styles.opacity !== undefined) state.opacity = event.payload.styles.opacity;
            if (event.payload.styles.borderRadius !== undefined) state.borderRadius = event.payload.styles.borderRadius;
            if (event.payload.styles.filters) state.filters = { ...state.filters, ...event.payload.styles.filters };
          }
          updateUI();
          updateSelectionStatus();
        }
      });

      API.on('selection:cleared', function() {
        state.selectedId = null;
        updateSelectionStatus();
      });

      API.on('asset:image-selected', function(event) {
        if (event.payload && event.payload.url) loadImage(event.payload.url);
      });

      API.onDestroy(function() {
        API.log('ImageTool Pro destroyed');
      });

    })();
  </script>
</body>
</html>
`;

export const ImageToolWidgetV2: BuiltinWidget = {
  manifest: ImageToolWidgetV2Manifest,
  html: ImageToolWidgetV2HTML,
};
