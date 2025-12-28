/**
 * StickerNest v2 - Transform Widget
 *
 * Position, size, and rotation controls for selected entities.
 * Skinnable widget following the established pattern.
 *
 * Features:
 * - X/Y position inputs
 * - Width/Height with lock aspect ratio
 * - Rotation angle
 * - Flip horizontal/vertical
 * - Reset transform
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

// ============================================================================
// Manifest
// ============================================================================

export const TransformManifest: WidgetManifest = {
  id: 'stickernest.transform',
  name: 'Transform',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Position, size, and rotation controls for selected entities.',
  author: 'StickerNest',
  tags: ['transform', 'position', 'size', 'rotation', 'design', 'tools', 'vector-tools', 'canvas-tools'],

  inputs: {
    'transform.set': {
      type: 'object',
      description: 'Set transform { x, y, width, height, rotation }',
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
    'transform.changed': {
      type: 'object',
      description: 'Transform changed { x, y, width, height, rotation }',
    },
    'flip.horizontal': {
      type: 'boolean',
      description: 'Flip horizontally triggered',
    },
    'flip.vertical': {
      type: 'boolean',
      description: 'Flip vertically triggered',
    },
  },

  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },

  size: {
    width: 200,
    height: 240,
    minWidth: 160,
    minHeight: 180,
    maxWidth: 280,
    maxHeight: 320,
  },

  io: {
    inputs: ['transform.set', 'selection.info', 'skin.apply'],
    outputs: ['transform.changed', 'flip.horizontal', 'flip.vertical'],
  },

  events: {
    emits: ['transform:changed', 'entity:transform'],
    listens: ['entity:selected'],
  },

  skin: {
    themeable: true,
    defaultSkin: 'transform-default',
    slots: [
      { name: 'panel-bg', type: 'color', defaultValue: '#1a1a2e', description: 'Panel background' },
      { name: 'input-bg', type: 'color', defaultValue: '#252538', description: 'Input background' },
      { name: 'btn-hover-bg', type: 'color', defaultValue: 'rgba(139, 92, 246, 0.2)', description: 'Button hover' },
      { name: 'icon-color', type: 'color', defaultValue: '#94a3b8', description: 'Icon color' },
    ],
    usesVariables: ['--sn-bg-secondary', '--sn-text-secondary', '--sn-accent-primary'],
  },
};

// ============================================================================
// HTML Template
// ============================================================================

export const TransformHTML = `
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
      --btn-hover-bg: var(--sn-btn-hover-bg, rgba(139, 92, 246, 0.2));
      --icon-color: var(--sn-icon-color, var(--sn-text-secondary, #94a3b8));
      --text-color: var(--sn-text-primary, #e2e8f0);
      --label-color: var(--sn-text-secondary, #94a3b8);
      --accent: var(--sn-accent-primary, #8b5cf6);
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

    .input-row {
      display: flex;
      gap: 8px;
    }

    .input-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .input-group .mini-label {
      font-size: 9px;
      color: var(--icon-color);
      text-transform: uppercase;
    }

    input[type="number"] {
      width: 100%;
      padding: 8px 10px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      color: var(--text-color);
      font-size: 13px;
      font-family: 'Monaco', 'Menlo', monospace;
      outline: none;
      transition: border-color 0.15s;
    }

    input:focus {
      border-color: var(--accent);
    }

    .lock-btn {
      width: 32px;
      height: 32px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      color: var(--icon-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      align-self: flex-end;
      transition: all 0.15s;
    }

    .lock-btn:hover {
      background: var(--btn-hover-bg);
    }

    .lock-btn.locked {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }

    .lock-btn svg {
      width: 14px;
      height: 14px;
    }

    .btn-row {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      flex: 1;
      padding: 8px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      color: var(--icon-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 11px;
      transition: all 0.15s;
    }

    .action-btn:hover {
      background: var(--btn-hover-bg);
      color: var(--text-color);
    }

    .action-btn svg {
      width: 14px;
      height: 14px;
    }

    .rotation-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rotation-row input[type="number"] {
      flex: 1;
    }

    .rotation-row .unit {
      color: var(--label-color);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="panel">
    <!-- Position -->
    <div class="section">
      <div class="label">Position</div>
      <div class="input-row">
        <div class="input-group">
          <span class="mini-label">X</span>
          <input type="number" id="pos-x" value="0" step="1">
        </div>
        <div class="input-group">
          <span class="mini-label">Y</span>
          <input type="number" id="pos-y" value="0" step="1">
        </div>
      </div>
    </div>

    <!-- Size -->
    <div class="section">
      <div class="label">Size</div>
      <div class="input-row">
        <div class="input-group">
          <span class="mini-label">W</span>
          <input type="number" id="size-w" value="100" min="1" step="1">
        </div>
        <div class="input-group">
          <span class="mini-label">H</span>
          <input type="number" id="size-h" value="100" min="1" step="1">
        </div>
        <button class="lock-btn locked" id="lock-aspect" title="Lock Aspect Ratio">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="lock-icon">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Rotation -->
    <div class="section">
      <div class="label">Rotation</div>
      <div class="rotation-row">
        <input type="number" id="rotation" value="0" min="-360" max="360" step="1">
        <span class="unit">deg</span>
      </div>
    </div>

    <!-- Flip -->
    <div class="section">
      <div class="label">Flip</div>
      <div class="btn-row">
        <button class="action-btn" id="flip-h" title="Flip Horizontal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v18M8 8l-4 4 4 4M16 8l4 4-4 4"/>
          </svg>
          Horizontal
        </button>
        <button class="action-btn" id="flip-v" title="Flip Vertical">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M8 8l4-4 4 4M8 16l4 4 4-4"/>
          </svg>
          Vertical
        </button>
      </div>
    </div>

    <!-- Reset -->
    <div class="section">
      <button class="action-btn" id="reset-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        Reset Transform
      </button>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // ================================================================
      // State
      // ================================================================
      let state = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        lockAspect: true,
        aspectRatio: 1,
      };

      // ================================================================
      // DOM References
      // ================================================================
      const posX = document.getElementById('pos-x');
      const posY = document.getElementById('pos-y');
      const sizeW = document.getElementById('size-w');
      const sizeH = document.getElementById('size-h');
      const rotationInput = document.getElementById('rotation');
      const lockBtn = document.getElementById('lock-aspect');
      const flipH = document.getElementById('flip-h');
      const flipV = document.getElementById('flip-v');
      const resetBtn = document.getElementById('reset-btn');

      // ================================================================
      // UI Updates
      // ================================================================
      function updateUI() {
        posX.value = Math.round(state.x);
        posY.value = Math.round(state.y);
        sizeW.value = Math.round(state.width);
        sizeH.value = Math.round(state.height);
        rotationInput.value = Math.round(state.rotation);
        lockBtn.classList.toggle('locked', state.lockAspect);
      }

      function emitChanges() {
        const transform = {
          x: state.x,
          y: state.y,
          width: state.width,
          height: state.height,
          rotation: state.rotation,
        };

        API.setState(state);
        API.emitOutput('transform.changed', transform);
        API.emit('transform:changed', transform);
        API.emit('entity:transform', transform);
      }

      // ================================================================
      // Event Handlers
      // ================================================================
      posX.addEventListener('input', (e) => {
        state.x = parseFloat(e.target.value) || 0;
        emitChanges();
      });

      posY.addEventListener('input', (e) => {
        state.y = parseFloat(e.target.value) || 0;
        emitChanges();
      });

      sizeW.addEventListener('input', (e) => {
        const newWidth = parseFloat(e.target.value) || 1;
        if (state.lockAspect && state.aspectRatio) {
          state.height = newWidth / state.aspectRatio;
          sizeH.value = Math.round(state.height);
        }
        state.width = newWidth;
        emitChanges();
      });

      sizeH.addEventListener('input', (e) => {
        const newHeight = parseFloat(e.target.value) || 1;
        if (state.lockAspect && state.aspectRatio) {
          state.width = newHeight * state.aspectRatio;
          sizeW.value = Math.round(state.width);
        }
        state.height = newHeight;
        emitChanges();
      });

      rotationInput.addEventListener('input', (e) => {
        state.rotation = parseFloat(e.target.value) || 0;
        emitChanges();
      });

      lockBtn.addEventListener('click', () => {
        state.lockAspect = !state.lockAspect;
        if (state.lockAspect && state.width && state.height) {
          state.aspectRatio = state.width / state.height;
        }
        lockBtn.classList.toggle('locked', state.lockAspect);
        API.setState(state);
      });

      flipH.addEventListener('click', () => {
        API.emitOutput('flip.horizontal', true);
        API.emit('entity:flip', { direction: 'horizontal' });
      });

      flipV.addEventListener('click', () => {
        API.emitOutput('flip.vertical', true);
        API.emit('entity:flip', { direction: 'vertical' });
      });

      resetBtn.addEventListener('click', () => {
        state.rotation = 0;
        updateUI();
        emitChanges();
        API.emit('entity:reset-transform', {});
      });

      // ================================================================
      // API Handlers
      // ================================================================
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
          if (state.width && state.height) {
            state.aspectRatio = state.width / state.height;
          }
        }
        updateUI();
        API.log('Transform mounted');
      });

      API.onInput('transform.set', function(transform) {
        if (!transform) return;
        state = { ...state, ...transform };
        if (state.width && state.height) {
          state.aspectRatio = state.width / state.height;
        }
        updateUI();
      });

      API.onInput('selection.info', function(info) {
        if (info) {
          state.x = info.x ?? state.x;
          state.y = info.y ?? state.y;
          state.width = info.width ?? state.width;
          state.height = info.height ?? state.height;
          state.rotation = info.rotation ?? state.rotation;
          if (state.width && state.height) {
            state.aspectRatio = state.width / state.height;
          }
          updateUI();
        }
      });

      API.on('entity:selected', function(event) {
        if (event) {
          state.x = event.x ?? state.x;
          state.y = event.y ?? state.y;
          state.width = event.width ?? state.width;
          state.height = event.height ?? state.height;
          state.rotation = event.rotation ?? state.rotation;
          if (state.width && state.height) {
            state.aspectRatio = state.width / state.height;
          }
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
        API.log('Transform destroyed');
      });
    })();
  </script>
</body>
</html>
`;

// ============================================================================
// Export
// ============================================================================

export const TransformWidget: BuiltinWidget = {
  manifest: TransformManifest,
  html: TransformHTML,
};
