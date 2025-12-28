/**
 * StickerNest v2 - Text Tool Widget
 *
 * @deprecated Prefer TextToolWidgetV2 ('stickernest.text-tool-v2') for new canvases.
 * This widget is kept for backwards compatibility with existing canvases.
 *
 * NOTE: V1 and V2 have different I/O ports and are NOT interchangeable.
 * V2 has enhanced formatting options and better canvas entity integration.
 *
 * A simple widget for adding text entities to the canvas.
 * Text entities can be edited and scaled in edit mode.
 *
 * Features:
 * - Text input field
 * - Font family selector
 * - Font size control
 * - Color picker
 * - Add to canvas button
 * - Quick add (Enter key)
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

// ============================================================================
// Manifest
// ============================================================================

export const TextToolManifest: WidgetManifest = {
  id: 'stickernest.text-tool',
  name: 'Text Tool',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Add editable and scalable text to the canvas. Double-click text on canvas to edit.',
  author: 'StickerNest',
  tags: ['text', 'tool', 'canvas', 'design', 'typography', 'canvas-tools'],

  inputs: {
    'text.set': {
      type: 'string',
      description: 'Set the text content',
    },
    'style.set': {
      type: 'object',
      description: 'Set text styles { fontFamily, fontSize, color }',
    },
    'trigger.add': {
      type: 'trigger',
      description: 'Trigger adding text to canvas',
    },
  },

  outputs: {
    'text.add': {
      type: 'object',
      description: 'Add text to canvas { content, fontFamily, fontSize, color, x, y }',
    },
    'text.preview': {
      type: 'object',
      description: 'Preview of text to be added',
    },
  },

  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },

  size: {
    width: 260,
    height: 320,
    minWidth: 200,
    minHeight: 260,
    maxWidth: 400,
    maxHeight: 500,
  },

  io: {
    inputs: ['text.set', 'style.set', 'trigger.add'],
    outputs: ['text.add', 'text.preview'],
  },

  events: {
    emits: ['entity:request-add'],
    listens: [],
  },

  skin: {
    themeable: true,
    defaultSkin: 'text-tool-default',
    slots: [
      { name: 'panel-bg', type: 'color', defaultValue: '#1a1a2e', description: 'Panel background' },
      { name: 'input-bg', type: 'color', defaultValue: '#252538', description: 'Input background' },
      { name: 'accent', type: 'color', defaultValue: '#8b5cf6', description: 'Accent color' },
    ],
    usesVariables: ['--sn-bg-secondary', '--sn-accent-primary', '--sn-text-primary'],
  },
};

// ============================================================================
// HTML Template
// ============================================================================

export const TextToolHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Poppins:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&family=Playfair+Display:wght@400;700&family=Bebas+Neue&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    :root {
      --panel-bg: var(--sn-bg-secondary, #1a1a2e);
      --input-bg: var(--sn-bg-tertiary, #252538);
      --accent: var(--sn-accent-primary, #8b5cf6);
      --text-color: var(--sn-text-primary, #e2e8f0);
      --text-muted: var(--sn-text-secondary, #94a3b8);
      --border-color: rgba(139, 92, 246, 0.2);
      --success: var(--sn-success, #22c55e);
    }

    .panel {
      width: 100%;
      height: 100%;
      background: var(--panel-bg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }

    .header-icon {
      width: 20px;
      height: 20px;
      color: var(--accent);
    }

    .header-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }

    .text-input {
      width: 100%;
      padding: 12px;
      background: var(--input-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-color);
      font-size: 14px;
      outline: none;
      resize: none;
      min-height: 80px;
      transition: border-color 0.2s;
    }

    .text-input:focus {
      border-color: var(--accent);
    }

    .text-input::placeholder {
      color: var(--text-muted);
    }

    .row {
      display: flex;
      gap: 10px;
    }

    .row > * {
      flex: 1;
    }

    select, input[type="number"] {
      width: 100%;
      padding: 10px 12px;
      background: var(--input-bg);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      color: var(--text-color);
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    select:focus, input[type="number"]:focus {
      border-color: var(--accent);
    }

    .color-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .color-input {
      width: 40px;
      height: 40px;
      padding: 0;
      border: 2px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      overflow: hidden;
    }

    .color-input::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .color-input::-webkit-color-swatch {
      border: none;
      border-radius: 6px;
    }

    .color-value {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      color: var(--text-muted);
    }

    .add-btn {
      width: 100%;
      padding: 14px;
      background: var(--accent);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      margin-top: auto;
    }

    .add-btn:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .add-btn:active {
      transform: translateY(0);
    }

    .add-btn.success {
      background: var(--success);
    }

    .add-btn svg {
      width: 18px;
      height: 18px;
    }

    .hint {
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
      opacity: 0.8;
    }

    .preview {
      padding: 12px;
      background: var(--input-bg);
      border-radius: 8px;
      min-height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .preview-text {
      color: var(--text-color);
      word-break: break-word;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="panel">
    <!-- Header -->
    <div class="header">
      <svg class="header-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 5h14v2H5V5zm0 4h14v2H5V9zm0 4h14v2H5v-2zm0 4h8v2H5v-2z"/>
      </svg>
      <span class="header-title">Add Text to Canvas</span>
    </div>

    <!-- Text Input -->
    <div class="section">
      <div class="label">Text Content</div>
      <textarea class="text-input" id="text-content" placeholder="Enter your text here...&#10;Press Enter to add to canvas"></textarea>
    </div>

    <!-- Font & Size Row -->
    <div class="row">
      <div class="section">
        <div class="label">Font</div>
        <select id="font-family">
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="Montserrat, sans-serif">Montserrat</option>
          <option value="Roboto, sans-serif">Roboto</option>
          <option value="Poppins, sans-serif">Poppins</option>
          <option value="Open Sans, sans-serif">Open Sans</option>
          <option value="Playfair Display, serif">Playfair Display</option>
          <option value="Bebas Neue, cursive">Bebas Neue</option>
          <option value="Dancing Script, cursive">Dancing Script</option>
        </select>
      </div>
      <div class="section">
        <div class="label">Size</div>
        <input type="number" id="font-size" value="32" min="8" max="200" step="1">
      </div>
    </div>

    <!-- Color -->
    <div class="section">
      <div class="label">Color</div>
      <div class="color-section">
        <input type="color" class="color-input" id="text-color" value="#e2e8f0">
        <span class="color-value" id="color-value">#e2e8f0</span>
      </div>
    </div>

    <!-- Preview -->
    <div class="section">
      <div class="label">Preview</div>
      <div class="preview">
        <span class="preview-text" id="preview">Your text here</span>
      </div>
    </div>

    <!-- Add Button -->
    <button class="add-btn" id="add-btn">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4v16m-8-8h16"/>
      </svg>
      <span id="btn-text">Add to Canvas</span>
    </button>

    <div class="hint">Double-click text on canvas to edit. Drag corners to scale.</div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // ================================================================
      // State
      // ================================================================
      let state = {
        content: '',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 32,
        color: '#e2e8f0',
        addCount: 0,
      };

      // ================================================================
      // DOM References
      // ================================================================
      const textContent = document.getElementById('text-content');
      const fontFamilySelect = document.getElementById('font-family');
      const fontSizeInput = document.getElementById('font-size');
      const textColorInput = document.getElementById('text-color');
      const colorValue = document.getElementById('color-value');
      const preview = document.getElementById('preview');
      const addBtn = document.getElementById('add-btn');
      const btnText = document.getElementById('btn-text');

      // ================================================================
      // UI Updates
      // ================================================================
      function updateUI() {
        textContent.value = state.content;
        fontFamilySelect.value = state.fontFamily;
        fontSizeInput.value = state.fontSize;
        textColorInput.value = state.color;
        colorValue.textContent = state.color;
        updatePreview();
      }

      function updatePreview() {
        const displayText = state.content || 'Your text here';
        preview.textContent = displayText;
        preview.style.fontFamily = state.fontFamily;
        preview.style.fontSize = Math.min(state.fontSize, 24) + 'px';
        preview.style.color = state.color;
      }

      function showSuccess() {
        addBtn.classList.add('success');
        btnText.textContent = 'Added!';
        setTimeout(() => {
          addBtn.classList.remove('success');
          btnText.textContent = 'Add to Canvas';
        }, 1500);
      }

      // ================================================================
      // Add Text to Canvas
      // ================================================================
      function addTextToCanvas() {
        const content = state.content.trim();
        if (!content) {
          textContent.focus();
          textContent.style.borderColor = 'var(--sn-error, #ef4444)';
          setTimeout(() => {
            textContent.style.borderColor = '';
          }, 1000);
          return;
        }

        // Calculate position (center of viewport with slight offset based on count)
        const offset = (state.addCount % 5) * 30;
        const x = 100 + offset;
        const y = 100 + offset;

        // Create text entity data
        const textData = {
          content: content,
          fontFamily: state.fontFamily,
          fontSize: state.fontSize,
          color: state.color,
          x: x,
          y: y,
          width: Math.max(200, content.length * (state.fontSize * 0.6)),
          height: state.fontSize * 1.5,
          name: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
        };

        // Emit to canvas via pipeline output
        API.emitOutput('text.add', textData);

        // Also emit broadcast event that canvas listens to
        // entity:request-add is handled by CanvasWidgetBridge
        API.emit('entity:request-add', {
          type: 'text',
          ...textData,
        });

        // Update state
        state.addCount++;
        API.setState({ addCount: state.addCount });

        // Show success feedback
        showSuccess();

        // Clear the input for next text
        state.content = '';
        textContent.value = '';
        updatePreview();

        API.log('Text added to canvas:', content);
      }

      // ================================================================
      // Event Handlers
      // ================================================================
      textContent.addEventListener('input', (e) => {
        state.content = e.target.value;
        updatePreview();
        API.emitOutput('text.preview', {
          content: state.content,
          fontFamily: state.fontFamily,
          fontSize: state.fontSize,
          color: state.color,
        });
      });

      textContent.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          addTextToCanvas();
        }
      });

      fontFamilySelect.addEventListener('change', (e) => {
        state.fontFamily = e.target.value;
        updatePreview();
        API.setState({ fontFamily: state.fontFamily });
      });

      fontSizeInput.addEventListener('input', (e) => {
        state.fontSize = parseInt(e.target.value) || 32;
        updatePreview();
        API.setState({ fontSize: state.fontSize });
      });

      textColorInput.addEventListener('input', (e) => {
        state.color = e.target.value;
        colorValue.textContent = state.color;
        updatePreview();
        API.setState({ color: state.color });
      });

      addBtn.addEventListener('click', addTextToCanvas);

      // ================================================================
      // API Handlers
      // ================================================================
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        updateUI();
        API.log('TextTool mounted');
      });

      API.onInput('text.set', function(text) {
        if (typeof text === 'string') {
          state.content = text;
          updateUI();
        }
      });

      API.onInput('style.set', function(styles) {
        if (!styles) return;
        if (styles.fontFamily) state.fontFamily = styles.fontFamily;
        if (styles.fontSize) state.fontSize = styles.fontSize;
        if (styles.color) state.color = styles.color;
        updateUI();
      });

      API.onInput('trigger.add', function() {
        addTextToCanvas();
      });

      API.onStateChange(function(newState) {
        state = { ...state, ...newState };
        updateUI();
      });

      API.onDestroy(function() {
        API.log('TextTool destroyed');
      });
    })();
  </script>
</body>
</html>
`;

// ============================================================================
// Export
// ============================================================================

export const TextToolWidget: BuiltinWidget = {
  manifest: TextToolManifest,
  html: TextToolHTML,
};
