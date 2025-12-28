/**
 * StickerNest v2 - Modular Toolbar Widget (Inline HTML version)
 *
 * A modular toolbar with dark neon UI that spawns text, shapes, and anchor points
 * directly on the canvas. Converted from React component to inline HTML for sandbox.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from '../builtin';

export const ModularToolbarManifest: WidgetManifest = {
  id: 'stickernest.modular-toolbar',
  name: 'Modular Toolbar',
  version: '1.1.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'A modular toolbar with dark neon UI that spawns text, shapes, and anchor points directly on the canvas',
  author: 'StickerNest',
  tags: ['toolbar', 'design', 'ui', 'canvas-tool', 'glassmorphic', 'modular', 'drawing'],
  inputs: {
    activeTool: {
      type: 'string',
      description: 'Currently active tool: select, move, text, pen, shapes, bucket, eraser',
      default: 'select',
    },
    theme: {
      type: 'string',
      description: 'Theme mode: light or dark',
      default: 'dark',
    },
    canvasClick: {
      type: 'object',
      description: 'Receives canvas click events with position for tool actions',
    },
  },
  outputs: {
    'tool:changed': {
      type: 'object',
      description: 'Emitted when a tool is selected',
    },
    'tool:mode': {
      type: 'object',
      description: 'Emits current tool mode for canvas interaction',
    },
    'spawn:text': {
      type: 'object',
      description: 'Spawn a text element on the canvas',
    },
    'spawn:shape': {
      type: 'object',
      description: 'Spawn a shape (rect, circle, triangle, etc.) on the canvas',
    },
    'spawn:anchor': {
      type: 'object',
      description: 'Spawn an anchor point for pen/path tool',
    },
    'spawn:path': {
      type: 'object',
      description: 'Spawn a path/line element',
    },
    'canvas:fill': {
      type: 'object',
      description: 'Fill canvas or selected element with color',
    },
    'canvas:erase': {
      type: 'object',
      description: 'Erase element at position',
    },
    'theme:changed': {
      type: 'object',
      description: 'Emitted when theme is toggled',
    },
    'toolbar:saved': {
      type: 'object',
      description: 'Emitted when save button is clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['canvas.click', 'canvas.mode', 'state.set'],
    outputs: [
      'tool.mode',
      'spawn.text',
      'spawn.shape',
      'spawn.anchor',
      'spawn.path',
      'canvas.fill',
      'canvas.erase',
    ],
  },
  size: {
    width: 88,
    height: 520,
    minWidth: 88,
    minHeight: 400,
    scaleMode: 'crop',
  },
};

export const ModularToolbarHTML = `
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
      background: transparent;
    }

    .toolbar-container {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      padding: 8px;
      width: 100%;
      height: 100%;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      flex-direction: column;
      padding: 12px;
      gap: 12px;
      border-radius: 24px;
      transition: all 0.5s ease-out;
      position: relative;
      overflow: hidden;
      width: 76px;
    }

    .toolbar.dark {
      background: rgba(26, 27, 38, 0.6);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
    }

    .toolbar.light {
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
    }

    .toolbar::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 24px;
      pointer-events: none;
    }

    .toolbar.dark::after {
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    }

    .toolbar.light::after {
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    }

    /* Tool Button */
    .tool-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 16px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.3s ease-out;
      outline: none;
    }

    .tool-btn.dark {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.4);
    }

    .tool-btn.dark:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.9);
      transform: scale(1.05);
    }

    .tool-btn.dark.active {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(34, 211, 238, 0.2));
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.25);
      color: white;
    }

    .tool-btn.light {
      background: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.4);
    }

    .tool-btn.light:hover {
      background: rgba(0, 0, 0, 0.1);
      border-color: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.8);
      transform: scale(1.05);
    }

    .tool-btn.light.active {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1));
      border-color: rgba(0, 0, 0, 0.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      color: #4f46e5;
    }

    /* Active indicator dot */
    .tool-btn.active::after {
      content: '';
      position: absolute;
      right: -6px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 16px;
      border-radius: 4px;
    }

    .tool-btn.dark.active::after {
      background: #22d3ee;
      box-shadow: 0 0 8px rgba(34, 211, 238, 0.8);
    }

    .tool-btn.light.active::after {
      background: #6366f1;
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
    }

    /* Divider */
    .divider {
      width: 100%;
      height: 1px;
      margin: 4px 0;
    }

    .divider.dark { background: rgba(255, 255, 255, 0.1); }
    .divider.light { background: rgba(0, 0, 0, 0.05); }

    /* Action buttons row */
    .action-row {
      display: flex;
      gap: 6px;
      width: 100%;
    }

    .action-btn {
      flex: 1;
      height: 32px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .action-btn.dark {
      background: transparent;
      color: rgba(255, 255, 255, 0.6);
    }

    .action-btn.dark:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .action-btn.light {
      background: transparent;
      color: rgba(0, 0, 0, 0.6);
    }

    .action-btn.light:hover {
      background: rgba(0, 0, 0, 0.05);
      color: black;
    }

    /* Submenu */
    .submenu {
      position: absolute;
      left: calc(100% + 8px);
      top: 0;
      padding: 8px;
      border-radius: 16px;
      z-index: 50;
      display: none;
      min-width: 120px;
    }

    .submenu.show { display: flex; flex-direction: column; gap: 4px; }

    .submenu.dark {
      background: rgba(26, 27, 38, 0.9);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
    }

    .submenu.light {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
    }

    .submenu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
      background: transparent;
    }

    .submenu-item.dark {
      color: rgba(255, 255, 255, 0.6);
    }

    .submenu-item.dark:hover, .submenu-item.dark.selected {
      background: rgba(168, 85, 247, 0.2);
      color: white;
    }

    .submenu-item.light {
      color: rgba(0, 0, 0, 0.6);
    }

    .submenu-item.light:hover, .submenu-item.light.selected {
      background: rgba(99, 102, 241, 0.2);
      color: #4f46e5;
    }

    /* Color grid */
    .color-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
    }

    .color-swatch {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .color-swatch:hover { transform: scale(1.1); }
    .color-swatch.selected { border-color: #22d3ee; transform: scale(1.1); }

    /* Color indicator on bucket */
    .color-indicator {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 12px;
      height: 12px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    /* Path counter badge */
    .path-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      background: #06b6d4;
      border-radius: 50%;
      font-size: 10px;
      font-weight: bold;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Status bar */
    .status-bar {
      position: absolute;
      bottom: 8px;
      left: 8px;
      right: 8px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .status-bar.dark {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.6);
    }

    .status-bar.light {
      background: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.6);
    }

    .status-bar .tool-name { color: #22d3ee; font-weight: 600; }
    .status-bar.light .tool-name { color: #6366f1; }
    .status-bar .shape-name { color: #a855f7; font-weight: 600; }

    /* SVG icons */
    svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  </style>
</head>
<body>
  <div class="toolbar-container">
    <div class="toolbar dark" id="toolbar">
      <button class="tool-btn dark active" id="btn-select" title="Select (V)">
        <svg viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
      </button>

      <button class="tool-btn dark" id="btn-move" title="Move (M)">
        <svg viewBox="0 0 24 24"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
      </button>

      <button class="tool-btn dark" id="btn-text" title="Text (T) - Click canvas to add">
        <svg viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
      </button>

      <button class="tool-btn dark" id="btn-pen" title="Pen (P) - Click to add anchor points">
        <svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
        <span class="path-badge" id="path-badge" style="display: none;">0</span>
      </button>

      <div style="position: relative;">
        <button class="tool-btn dark" id="btn-shapes" title="Shapes (S) - Click again for options">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>
        <div class="submenu dark" id="shape-menu">
          <button class="submenu-item dark selected" data-shape="rectangle">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            <span>Rectangle</span>
          </button>
          <button class="submenu-item dark" data-shape="circle">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/></svg>
            <span>Circle</span>
          </button>
          <button class="submenu-item dark" data-shape="triangle">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M12 2l10 20H2L12 2z"/></svg>
            <span>Triangle</span>
          </button>
          <button class="submenu-item dark" data-shape="line">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px"><line x1="4" y1="12" x2="20" y2="12"/></svg>
            <span>Line</span>
          </button>
          <button class="submenu-item dark" data-shape="star">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Star</span>
          </button>
          <button class="submenu-item dark" data-shape="hexagon">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <span>Hexagon</span>
          </button>
        </div>
      </div>

      <div style="position: relative;">
        <button class="tool-btn dark" id="btn-bucket" title="Fill (G) - Click again for colors">
          <svg viewBox="0 0 24 24"><path d="M19 11l-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11z"/><path d="M5 2l5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4z"/></svg>
          <span class="color-indicator" id="color-indicator" style="background: #8b5cf6;"></span>
        </button>
        <div class="submenu dark" id="color-menu">
          <div class="color-grid">
            <button class="color-swatch" style="background: #ef4444;" data-color="#ef4444"></button>
            <button class="color-swatch" style="background: #f97316;" data-color="#f97316"></button>
            <button class="color-swatch" style="background: #eab308;" data-color="#eab308"></button>
            <button class="color-swatch" style="background: #22c55e;" data-color="#22c55e"></button>
            <button class="color-swatch" style="background: #06b6d4;" data-color="#06b6d4"></button>
            <button class="color-swatch" style="background: #3b82f6;" data-color="#3b82f6"></button>
            <button class="color-swatch selected" style="background: #8b5cf6;" data-color="#8b5cf6"></button>
            <button class="color-swatch" style="background: #ec4899;" data-color="#ec4899"></button>
            <button class="color-swatch" style="background: #ffffff;" data-color="#ffffff"></button>
            <button class="color-swatch" style="background: #000000;" data-color="#000000"></button>
          </div>
        </div>
      </div>

      <button class="tool-btn dark" id="btn-eraser" title="Eraser (E)">
        <svg viewBox="0 0 24 24"><path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8l10-10c.8-.8 2-.8 2.8 0l6.4 6.4c.8.8.8 2 0 2.8L13 21"/><path d="M6 11l8 8"/></svg>
      </button>

      <div class="divider dark"></div>

      <button class="tool-btn dark" id="btn-add" title="Add Tool" style="opacity: 0.4; cursor: default;">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      <div class="divider dark"></div>

      <div class="action-row">
        <button class="action-btn dark" id="btn-theme" title="Toggle Theme">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px" id="theme-icon"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
        <button class="action-btn dark" id="btn-save" title="Save">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        </button>
      </div>
    </div>

    <div class="status-bar dark" id="status-bar">
      <span>Tool: <span class="tool-name" id="status-tool">select</span></span>
      <span id="status-extra"></span>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let activeTool = 'select';
      let theme = 'dark';
      let selectedShape = 'rectangle';
      let selectedColor = '#8b5cf6';
      let pathPoints = [];

      // Elements
      const toolbar = document.getElementById('toolbar');
      const statusBar = document.getElementById('status-bar');
      const statusTool = document.getElementById('status-tool');
      const statusExtra = document.getElementById('status-extra');
      const pathBadge = document.getElementById('path-badge');
      const colorIndicator = document.getElementById('color-indicator');
      const shapeMenu = document.getElementById('shape-menu');
      const colorMenu = document.getElementById('color-menu');
      const themeIcon = document.getElementById('theme-icon');

      const toolButtons = {
        select: document.getElementById('btn-select'),
        move: document.getElementById('btn-move'),
        text: document.getElementById('btn-text'),
        pen: document.getElementById('btn-pen'),
        shapes: document.getElementById('btn-shapes'),
        bucket: document.getElementById('btn-bucket'),
        eraser: document.getElementById('btn-eraser')
      };

      // Update theme classes
      function updateTheme() {
        const isDark = theme === 'dark';
        const elements = document.querySelectorAll('.dark, .light');
        elements.forEach(el => {
          el.classList.remove('dark', 'light');
          el.classList.add(theme);
        });

        // Update theme icon
        if (isDark) {
          themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
        } else {
          themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
        }
      }

      // Update active tool UI
      function updateToolUI() {
        Object.keys(toolButtons).forEach(tool => {
          const btn = toolButtons[tool];
          if (btn) {
            btn.classList.toggle('active', tool === activeTool);
          }
        });

        statusTool.textContent = activeTool;

        // Update status extra info
        if (activeTool === 'shapes') {
          statusExtra.innerHTML = 'Shape: <span class="shape-name">' + selectedShape + '</span>';
        } else if (activeTool === 'pen' && pathPoints.length > 0) {
          statusExtra.innerHTML = 'Points: <span class="tool-name">' + pathPoints.length + '</span>';
        } else {
          statusExtra.innerHTML = '';
        }

        // Update path badge
        pathBadge.style.display = pathPoints.length > 0 ? 'flex' : 'none';
        pathBadge.textContent = pathPoints.length;
      }

      // Emit tool mode
      function emitToolMode() {
        API.emitOutput('tool.mode', {
          tool: activeTool,
          shape: activeTool === 'shapes' ? selectedShape : undefined,
          color: activeTool === 'bucket' ? selectedColor : undefined,
          timestamp: Date.now()
        });
      }

      // Handle tool change
      function setTool(tool) {
        // Close menus
        shapeMenu.classList.remove('show');
        colorMenu.classList.remove('show');

        // Reset path on tool switch
        if (tool !== 'pen') {
          pathPoints = [];
        }

        activeTool = tool;
        updateToolUI();
        API.setState({ activeTool: tool });
        API.emitOutput('tool:changed', { tool });
        emitToolMode();
      }

      // Handle canvas click (forwarded from canvas)
      function handleCanvasClick(event) {
        const { canvasX, canvasY, shiftKey } = event;

        switch (activeTool) {
          case 'text':
            API.emitOutput('spawn.text', {
              type: 'text',
              x: canvasX,
              y: canvasY,
              text: 'Double-click to edit',
              fontSize: 16,
              fontFamily: 'Inter, sans-serif',
              color: selectedColor,
              id: 'text-' + Date.now()
            });
            API.log('Spawned text at (' + canvasX + ', ' + canvasY + ')');
            break;

          case 'shapes':
            API.emitOutput('spawn.shape', {
              type: 'shape',
              shapeType: selectedShape,
              x: canvasX,
              y: canvasY,
              width: 100,
              height: selectedShape === 'line' ? 2 : 100,
              fill: selectedColor,
              stroke: theme === 'dark' ? '#ffffff' : '#000000',
              strokeWidth: 2,
              id: 'shape-' + Date.now()
            });
            API.log('Spawned ' + selectedShape + ' at (' + canvasX + ', ' + canvasY + ')');
            break;

          case 'pen':
            const newPoint = { x: canvasX, y: canvasY };

            if (shiftKey || pathPoints.length === 0) {
              pathPoints = [newPoint];
              API.emitOutput('spawn.anchor', {
                type: 'anchor',
                x: canvasX,
                y: canvasY,
                isStart: true,
                pathId: 'path-' + Date.now(),
                id: 'anchor-' + Date.now()
              });
            } else {
              const lastPoint = pathPoints[pathPoints.length - 1];
              pathPoints.push(newPoint);

              API.emitOutput('spawn.anchor', {
                type: 'anchor',
                x: canvasX,
                y: canvasY,
                isStart: false,
                pathId: 'path-continue',
                id: 'anchor-' + Date.now()
              });

              API.emitOutput('spawn.path', {
                type: 'path',
                points: [lastPoint, newPoint],
                stroke: selectedColor,
                strokeWidth: 2,
                id: 'pathseg-' + Date.now()
              });
            }

            updateToolUI();
            API.log('Added anchor at (' + canvasX + ', ' + canvasY + '), path length: ' + pathPoints.length);
            break;

          case 'bucket':
            API.emitOutput('canvas.fill', {
              type: 'fill',
              x: canvasX,
              y: canvasY,
              color: selectedColor,
              timestamp: Date.now()
            });
            API.log('Fill at (' + canvasX + ', ' + canvasY + ') with ' + selectedColor);
            break;

          case 'eraser':
            API.emitOutput('canvas.erase', {
              type: 'erase',
              x: canvasX,
              y: canvasY,
              radius: 20,
              timestamp: Date.now()
            });
            API.log('Erase at (' + canvasX + ', ' + canvasY + ')');
            break;
        }
      }

      // Tool button handlers
      toolButtons.select.onclick = () => setTool('select');
      toolButtons.move.onclick = () => setTool('move');
      toolButtons.text.onclick = () => setTool('text');
      toolButtons.pen.onclick = () => setTool('pen');
      toolButtons.eraser.onclick = () => setTool('eraser');

      // Shapes button - toggle menu or set tool
      toolButtons.shapes.onclick = () => {
        if (activeTool === 'shapes') {
          shapeMenu.classList.toggle('show');
          colorMenu.classList.remove('show');
        } else {
          setTool('shapes');
        }
      };

      // Bucket button - toggle menu or set tool
      toolButtons.bucket.onclick = () => {
        if (activeTool === 'bucket') {
          colorMenu.classList.toggle('show');
          shapeMenu.classList.remove('show');
        } else {
          setTool('bucket');
        }
      };

      // Shape menu items
      shapeMenu.querySelectorAll('.submenu-item').forEach(item => {
        item.onclick = () => {
          selectedShape = item.dataset.shape;
          shapeMenu.querySelectorAll('.submenu-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          shapeMenu.classList.remove('show');
          API.setState({ selectedShape });
          emitToolMode();
          updateToolUI();
        };
      });

      // Color swatches
      colorMenu.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.onclick = () => {
          selectedColor = swatch.dataset.color;
          colorMenu.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
          swatch.classList.add('selected');
          colorIndicator.style.background = selectedColor;
          colorMenu.classList.remove('show');
          API.setState({ selectedColor });
          if (activeTool === 'bucket') {
            emitToolMode();
          }
        };
      });

      // Theme toggle
      document.getElementById('btn-theme').onclick = () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        updateTheme();
        API.setState({ theme });
        API.emitOutput('theme:changed', { theme });
      };

      // Save button
      document.getElementById('btn-save').onclick = () => {
        API.emitOutput('toolbar:saved', {
          activeTool,
          theme,
          selectedShape,
          selectedColor,
          timestamp: Date.now()
        });
      };

      // Initialize
      API.onMount(function(context) {
        const state = context.state || {};
        if (state.activeTool) activeTool = state.activeTool;
        if (state.theme) theme = state.theme;
        if (state.selectedShape) selectedShape = state.selectedShape;
        if (state.selectedColor) {
          selectedColor = state.selectedColor;
          colorIndicator.style.background = selectedColor;
        }

        updateTheme();
        updateToolUI();
        emitToolMode();
        API.log('ModularToolbar mounted');
      });

      // Listen for canvas clicks
      API.onInput('canvas.click', handleCanvasClick);

      // Handle external tool changes
      API.onInput('activeTool', function(tool) {
        setTool(tool);
      });

      // Handle external theme changes
      API.onInput('theme', function(newTheme) {
        theme = newTheme;
        updateTheme();
        API.setState({ theme });
      });

      // Handle state changes
      API.onStateChange(function(newState) {
        if (newState.activeTool) {
          activeTool = newState.activeTool;
          updateToolUI();
        }
        if (newState.theme) {
          theme = newState.theme;
          updateTheme();
        }
      });

      API.onDestroy(function() {
        API.log('ModularToolbar destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const ModularToolbarWidget: BuiltinWidget = {
  manifest: ModularToolbarManifest,
  html: ModularToolbarHTML,
};
