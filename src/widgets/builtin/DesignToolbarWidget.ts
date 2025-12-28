/**
 * StickerNest v2 - Design Toolbar Widget
 *
 * Professional design toolbar with skinnable UI.
 * This is the FIRST fully skinnable widget, establishing patterns for:
 * - Widget skin slots in manifest
 * - CSS variable integration
 * - AI-generatable skin presets
 *
 * Tools: Select, Hand, Shape (dropdown), Text, Line, Image
 * Features: Keyboard shortcuts, tool activation events, dockable slots
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

// ============================================================================
// Manifest with Skin Configuration
// ============================================================================

export const DesignToolbarManifest: WidgetManifest = {
  id: 'stickernest.design-toolbar',
  name: 'Design Toolbar',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Professional design toolbar with shape, text, and image tools. Fully skinnable.',
  author: 'StickerNest',
  tags: ['toolbar', 'tools', 'design', 'shapes', 'text', 'drawing'],

  inputs: {
    'tool.set': {
      type: 'string',
      description: 'Set active tool (select, pan, shape, text, line, image)',
    },
    'shape.set': {
      type: 'string',
      description: 'Set active shape type when shape tool is selected',
    },
    'skin.apply': {
      type: 'object',
      description: 'Apply skin overrides { variable: value }',
    },
  },

  outputs: {
    'tool.activated': {
      type: 'string',
      description: 'Currently active tool ID',
    },
    'tool.action': {
      type: 'object',
      description: 'Tool action event { tool, action, params }',
    },
    'shape.selected': {
      type: 'string',
      description: 'Selected shape type',
    },
  },

  capabilities: {
    draggable: true,
    resizable: false,
    rotatable: false,
  },

  size: {
    width: 320,
    height: 48,
    minWidth: 200,
    minHeight: 44,
    maxHeight: 96,
  },

  io: {
    inputs: ['tool.set', 'shape.set', 'skin.apply'],
    outputs: ['tool.activated', 'tool.action', 'shape.selected'],
  },

  events: {
    emits: ['tool:changed', 'shape:changed'],
    listens: ['tool:request', 'keyboard:shortcut'],
  },

  // ============================================================================
  // SKIN CONFIGURATION - The Skinning Foundation
  // ============================================================================
  // This establishes the pattern for all skinnable widgets.
  // AI can generate new skins by providing values for these slots.
  // ============================================================================

  skin: {
    themeable: true,
    defaultSkin: 'toolbar-default',

    // Skin slots define customizable properties
    slots: [
      // Background
      {
        name: 'toolbar-bg',
        description: 'Toolbar background color',
        type: 'color',
        defaultValue: '#1a1a2e',
        variable: '--toolbar-bg',
      },
      {
        name: 'toolbar-bg-hover',
        description: 'Toolbar background on hover',
        type: 'color',
        defaultValue: '#252538',
        variable: '--toolbar-bg-hover',
      },
      {
        name: 'toolbar-border',
        description: 'Toolbar border color',
        type: 'color',
        defaultValue: 'rgba(139, 92, 246, 0.2)',
        variable: '--toolbar-border',
      },
      {
        name: 'toolbar-radius',
        description: 'Toolbar border radius',
        type: 'radius',
        defaultValue: '8px',
        variable: '--toolbar-radius',
      },
      {
        name: 'toolbar-shadow',
        description: 'Toolbar box shadow',
        type: 'shadow',
        defaultValue: '0 4px 12px rgba(0, 0, 0, 0.3)',
        variable: '--toolbar-shadow',
      },

      // Tool buttons
      {
        name: 'tool-bg',
        description: 'Tool button background',
        type: 'color',
        defaultValue: 'transparent',
        variable: '--tool-bg',
      },
      {
        name: 'tool-bg-hover',
        description: 'Tool button background on hover',
        type: 'color',
        defaultValue: 'rgba(139, 92, 246, 0.15)',
        variable: '--tool-bg-hover',
      },
      {
        name: 'tool-bg-active',
        description: 'Tool button background when active',
        type: 'color',
        defaultValue: 'rgba(139, 92, 246, 0.3)',
        variable: '--tool-bg-active',
      },
      {
        name: 'tool-color',
        description: 'Tool icon color',
        type: 'color',
        defaultValue: '#94a3b8',
        variable: '--tool-color',
      },
      {
        name: 'tool-color-hover',
        description: 'Tool icon color on hover',
        type: 'color',
        defaultValue: '#e2e8f0',
        variable: '--tool-color-hover',
      },
      {
        name: 'tool-color-active',
        description: 'Tool icon color when active',
        type: 'color',
        defaultValue: '#8b5cf6',
        variable: '--tool-color-active',
      },

      // Dropdown
      {
        name: 'dropdown-bg',
        description: 'Dropdown menu background',
        type: 'color',
        defaultValue: '#1a1a2e',
        variable: '--dropdown-bg',
      },
      {
        name: 'dropdown-border',
        description: 'Dropdown border color',
        type: 'color',
        defaultValue: 'rgba(139, 92, 246, 0.3)',
        variable: '--dropdown-border',
      },
      {
        name: 'dropdown-item-hover',
        description: 'Dropdown item hover background',
        type: 'color',
        defaultValue: 'rgba(139, 92, 246, 0.2)',
        variable: '--dropdown-item-hover',
      },

      // Divider
      {
        name: 'divider-color',
        description: 'Divider line color',
        type: 'color',
        defaultValue: 'rgba(148, 163, 184, 0.2)',
        variable: '--divider-color',
      },

      // Tooltip
      {
        name: 'tooltip-bg',
        description: 'Tooltip background',
        type: 'color',
        defaultValue: '#0f0f19',
        variable: '--tooltip-bg',
      },
      {
        name: 'tooltip-color',
        description: 'Tooltip text color',
        type: 'color',
        defaultValue: '#e2e8f0',
        variable: '--tooltip-color',
      },
    ],

    // CSS variables the widget uses from the global theme
    usesVariables: [
      '--sn-bg-primary',
      '--sn-bg-secondary',
      '--sn-text-primary',
      '--sn-text-secondary',
      '--sn-accent-primary',
      '--sn-border-primary',
      '--sn-radius-md',
    ],
  },
};

// ============================================================================
// HTML Template
// ============================================================================

export const DesignToolbarHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* ================================================================
       SKINNABLE CSS VARIABLES
       These can be overridden via skin slots or widget state
       ================================================================ */
    :root {
      /* Toolbar container */
      --toolbar-bg: var(--sn-toolbar-bg, var(--sn-bg-secondary, #1a1a2e));
      --toolbar-bg-hover: var(--sn-toolbar-bg-hover, #252538);
      --toolbar-border: var(--sn-toolbar-border, var(--sn-border-primary, rgba(139, 92, 246, 0.2)));
      --toolbar-radius: var(--sn-toolbar-radius, var(--sn-radius-md, 8px));
      --toolbar-shadow: var(--sn-toolbar-shadow, 0 4px 12px rgba(0, 0, 0, 0.3));

      /* Tool buttons */
      --tool-bg: transparent;
      --tool-bg-hover: var(--sn-tool-bg-hover, rgba(139, 92, 246, 0.15));
      --tool-bg-active: var(--sn-tool-bg-active, rgba(139, 92, 246, 0.3));
      --tool-color: var(--sn-tool-color, var(--sn-text-secondary, #94a3b8));
      --tool-color-hover: var(--sn-tool-color-hover, var(--sn-text-primary, #e2e8f0));
      --tool-color-active: var(--sn-tool-color-active, var(--sn-accent-primary, #8b5cf6));
      --tool-size: 36px;
      --tool-icon-size: 18px;

      /* Dropdown */
      --dropdown-bg: var(--sn-dropdown-bg, var(--sn-bg-secondary, #1a1a2e));
      --dropdown-border: var(--sn-dropdown-border, rgba(139, 92, 246, 0.3));
      --dropdown-item-hover: var(--sn-dropdown-item-hover, rgba(139, 92, 246, 0.2));

      /* Divider */
      --divider-color: var(--sn-divider-color, rgba(148, 163, 184, 0.2));

      /* Tooltip */
      --tooltip-bg: var(--sn-tooltip-bg, #0f0f19);
      --tooltip-color: var(--sn-tooltip-color, #e2e8f0);
    }

    /* ================================================================
       BASE STYLES
       ================================================================ */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 100%;
      padding: 4px 8px;
      background: var(--toolbar-bg);
      border: 1px solid var(--toolbar-border);
      border-radius: var(--toolbar-radius);
      box-shadow: var(--toolbar-shadow);
    }

    /* ================================================================
       TOOL BUTTONS
       ================================================================ */
    .tool-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--tool-size);
      height: var(--tool-size);
      border: none;
      border-radius: 6px;
      background: var(--tool-bg);
      color: var(--tool-color);
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
    }

    .tool-btn:hover {
      background: var(--tool-bg-hover);
      color: var(--tool-color-hover);
    }

    .tool-btn.active {
      background: var(--tool-bg-active);
      color: var(--tool-color-active);
    }

    .tool-btn svg {
      width: var(--tool-icon-size);
      height: var(--tool-icon-size);
      fill: currentColor;
    }

    /* Dropdown indicator */
    .tool-btn.has-dropdown::after {
      content: '';
      position: absolute;
      right: 4px;
      bottom: 4px;
      width: 0;
      height: 0;
      border-left: 3px solid transparent;
      border-right: 3px solid transparent;
      border-top: 4px solid currentColor;
      opacity: 0.6;
    }

    /* ================================================================
       DIVIDER
       ================================================================ */
    .divider {
      width: 1px;
      height: 24px;
      background: var(--divider-color);
      margin: 0 4px;
    }

    /* ================================================================
       DROPDOWN MENU
       ================================================================ */
    .dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      min-width: 140px;
      background: var(--dropdown-bg);
      border: 1px solid var(--dropdown-border);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      padding: 4px;
      z-index: 1000;
      display: none;
    }

    .dropdown.open {
      display: block;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--tool-color);
      font-size: 12px;
      cursor: pointer;
      width: 100%;
      text-align: left;
      transition: all 0.15s ease;
    }

    .dropdown-item:hover {
      background: var(--dropdown-item-hover);
      color: var(--tool-color-hover);
    }

    .dropdown-item.selected {
      color: var(--tool-color-active);
    }

    .dropdown-item svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    /* ================================================================
       TOOLTIP
       ================================================================ */
    .tool-btn[data-tooltip]::before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 8px;
      background: var(--tooltip-bg);
      color: var(--tooltip-color);
      font-size: 11px;
      border-radius: 4px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .tool-btn[data-tooltip]:hover::before {
      opacity: 1;
    }

    /* ================================================================
       TOOL SLOT (for dockable widgets)
       ================================================================ */
    .tool-slot {
      width: var(--tool-size);
      height: var(--tool-size);
      border: 2px dashed var(--divider-color);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--tool-color);
      opacity: 0.5;
      transition: all 0.15s ease;
    }

    .tool-slot:hover {
      opacity: 1;
      border-color: var(--tool-color-active);
    }

    .tool-slot.occupied {
      border: none;
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="toolbar" id="toolbar">
    <!-- Select Tool -->
    <button class="tool-btn active" data-tool="select" data-tooltip="Select (V)" id="tool-select">
      <svg viewBox="0 0 24 24"><path d="M7 2l10 10-4 1 3 6-2 1-3-6-4 4V2z"/></svg>
    </button>

    <!-- Hand/Pan Tool -->
    <button class="tool-btn" data-tool="pan" data-tooltip="Pan (H)" id="tool-pan">
      <svg viewBox="0 0 24 24"><path d="M10 5a1 1 0 0 1 2 0v4a1 1 0 0 1 2 0V6a1 1 0 0 1 2 0v4a1 1 0 0 1 2 0v6c0 3.3-2.7 6-6 6s-6-2.7-6-6v-3a1 1 0 0 1 2 0v1a1 1 0 0 1 2 0V5z"/></svg>
    </button>

    <div class="divider"></div>

    <!-- Shape Tool (dropdown) -->
    <button class="tool-btn has-dropdown" data-tool="shape" data-tooltip="Shape (U)" id="tool-shape">
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
    </button>
    <div class="dropdown" id="shape-dropdown">
      <button class="dropdown-item selected" data-shape="rectangle">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        Rectangle
      </button>
      <button class="dropdown-item" data-shape="circle">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        Circle
      </button>
      <button class="dropdown-item" data-shape="triangle">
        <svg viewBox="0 0 24 24"><polygon points="12,3 22,21 2,21" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        Triangle
      </button>
      <button class="dropdown-item" data-shape="polygon">
        <svg viewBox="0 0 24 24"><polygon points="12,2 22,9 19,21 5,21 2,9" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        Polygon
      </button>
      <button class="dropdown-item" data-shape="star">
        <svg viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        Star
      </button>
    </div>

    <!-- Text Tool -->
    <button class="tool-btn" data-tool="text" data-tooltip="Text (T)" id="tool-text">
      <svg viewBox="0 0 24 24"><path d="M5 4h14v3h-1.5V5.5h-5V18h2v1.5H9.5V18h2V5.5h-5V7H5V4z"/></svg>
    </button>

    <!-- Line Tool -->
    <button class="tool-btn" data-tool="line" data-tooltip="Line (L)" id="tool-line">
      <svg viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>

    <div class="divider"></div>

    <!-- Image Tool -->
    <button class="tool-btn" data-tool="image" data-tooltip="Image (I)" id="tool-image">
      <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="10" r="2" fill="currentColor"/><path d="M21 17l-4-4-3 3-4-4-7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
    </button>

    <div class="divider"></div>

    <!-- Empty Slot for dockable tools -->
    <div class="tool-slot" id="slot-1" title="Drag a tool here">
      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none"/></svg>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // ================================================================
      // State
      // ================================================================
      let state = {
        activeTool: 'select',
        activeShape: 'rectangle',
        dropdownOpen: false,
      };

      // ================================================================
      // DOM References
      // ================================================================
      const toolbar = document.getElementById('toolbar');
      const shapeDropdown = document.getElementById('shape-dropdown');
      const toolButtons = document.querySelectorAll('.tool-btn');
      const dropdownItems = document.querySelectorAll('.dropdown-item');

      // ================================================================
      // Tool Activation
      // ================================================================
      function setActiveTool(tool) {
        state.activeTool = tool;

        // Update UI
        toolButtons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Close dropdown
        shapeDropdown.classList.remove('open');
        state.dropdownOpen = false;

        // Emit output
        API.emitOutput('tool.activated', tool);
        API.emit('tool:changed', { tool });
        API.setState({ activeTool: tool, activeShape: state.activeShape });

        API.log('Tool activated: ' + tool);
      }

      function setActiveShape(shape) {
        state.activeShape = shape;

        // Update dropdown UI
        dropdownItems.forEach(item => {
          item.classList.toggle('selected', item.dataset.shape === shape);
        });

        // Update shape button icon to match selected shape
        const shapeBtn = document.getElementById('tool-shape');
        const selectedItem = document.querySelector('[data-shape="' + shape + '"]');
        if (selectedItem && shapeBtn) {
          const svg = selectedItem.querySelector('svg').cloneNode(true);
          shapeBtn.innerHTML = '';
          shapeBtn.appendChild(svg);
        }

        // Emit output
        API.emitOutput('shape.selected', shape);
        API.emit('shape:changed', { shape });
        API.setState({ activeTool: state.activeTool, activeShape: shape });

        API.log('Shape selected: ' + shape);
      }

      // ================================================================
      // Event Handlers
      // ================================================================
      toolButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tool = btn.dataset.tool;

          // Toggle dropdown for shape tool
          if (tool === 'shape') {
            state.dropdownOpen = !state.dropdownOpen;
            shapeDropdown.classList.toggle('open', state.dropdownOpen);

            if (state.activeTool !== 'shape') {
              setActiveTool('shape');
            }
            return;
          }

          setActiveTool(tool);
        });
      });

      dropdownItems.forEach(item => {
        item.addEventListener('click', () => {
          setActiveShape(item.dataset.shape);
          shapeDropdown.classList.remove('open');
          state.dropdownOpen = false;
        });
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.tool-btn[data-tool="shape"]') && !e.target.closest('.dropdown')) {
          shapeDropdown.classList.remove('open');
          state.dropdownOpen = false;
        }
      });

      // ================================================================
      // Keyboard Shortcuts
      // ================================================================
      document.addEventListener('keydown', (e) => {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 'h':
            setActiveTool('pan');
            break;
          case 'u':
            setActiveTool('shape');
            shapeDropdown.classList.add('open');
            state.dropdownOpen = true;
            break;
          case 't':
            setActiveTool('text');
            break;
          case 'l':
            setActiveTool('line');
            break;
          case 'i':
            setActiveTool('image');
            break;
        }
      });

      // ================================================================
      // API Handlers
      // ================================================================
      API.onMount(function(context) {
        state = { ...state, ...(context.state || {}) };

        // Restore state
        if (state.activeTool) {
          setActiveTool(state.activeTool);
        }
        if (state.activeShape) {
          setActiveShape(state.activeShape);
        }

        API.log('Design Toolbar mounted');
      });

      API.onInput('tool.set', function(tool) {
        if (tool) setActiveTool(tool);
      });

      API.onInput('shape.set', function(shape) {
        if (shape) setActiveShape(shape);
      });

      API.onInput('skin.apply', function(overrides) {
        if (!overrides) return;

        // Apply CSS variable overrides
        const root = document.documentElement;
        for (const [key, value] of Object.entries(overrides)) {
          const varName = key.startsWith('--') ? key : '--' + key;
          root.style.setProperty(varName, value);
        }

        API.log('Skin applied: ' + JSON.stringify(overrides));
      });

      API.onDestroy(function() {
        API.log('Design Toolbar destroyed');
      });
    })();
  </script>
</body>
</html>
`;

// ============================================================================
// Export
// ============================================================================

export const DesignToolbarWidget: BuiltinWidget = {
  manifest: DesignToolbarManifest,
  html: DesignToolbarHTML,
};
