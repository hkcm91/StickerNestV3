/**
 * StickerNest v2 - Basic Text Widget
 *
 * A simple text display widget that supports styling and dynamic content.
 * Can receive text input from pipeline connections.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const BasicTextWidgetManifest: WidgetManifest = {
  id: 'stickernest.basic-text',
  name: 'Basic Text',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'A simple text display widget with styling support',
  author: 'StickerNest',
  tags: ['text', 'display', 'basic', 'core'],
  inputs: {
    content: {
      type: 'string',
      description: 'Text content to display',
      default: 'Hello, World!',
    },
    fontSize: {
      type: 'number',
      description: 'Font size in pixels',
      default: 16,
    },
    color: {
      type: 'string',
      description: 'Text color (CSS color value)',
      default: '#ffffff',
    },
    align: {
      type: 'string',
      description: 'Text alignment (left, center, right)',
      default: 'center',
    },
  },
  outputs: {
    clicked: {
      type: 'trigger',
      description: 'Emitted when text is clicked',
    },
    contentChanged: {
      type: 'string',
      description: 'Emitted when content changes',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['text.set', 'text.style', 'ui.show', 'ui.hide'],
    outputs: ['ui.clicked', 'text.changed'],
  },
  size: {
    width: 200,
    height: 60,
    minWidth: 50,
    minHeight: 30,
    scaleMode: 'scale',
  },
};

export const BasicTextWidgetHTML = `
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
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      cursor: pointer;
      user-select: none;
      transition: transform 0.1s ease;
    }
    .container:active {
      transform: scale(0.98);
    }
    .text {
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <span class="text" id="text">Hello, World!</span>
  </div>
  <script>
    (function() {
      const container = document.getElementById('container');
      const textEl = document.getElementById('text');
      const API = window.WidgetAPI;

      // State
      let content = 'Hello, World!';
      let fontSize = 16;
      let color = '#ffffff';
      let align = 'center';

      function updateDisplay() {
        textEl.textContent = content;
        textEl.style.fontSize = fontSize + 'px';
        textEl.style.color = color;
        textEl.style.textAlign = align;
        container.style.justifyContent =
          align === 'left' ? 'flex-start' :
          align === 'right' ? 'flex-end' : 'center';
      }

      // Initialize from state
      API.onMount(function(context) {
        const state = context.state || {};
        content = state.content || content;
        fontSize = state.fontSize || fontSize;
        color = state.color || color;
        align = state.align || align;
        updateDisplay();
        API.log('BasicTextWidget mounted');
      });

      // Handle text.set input
      API.onInput('text.set', function(value) {
        if (typeof value === 'string') {
          content = value;
        } else if (value && typeof value.content === 'string') {
          content = value.content;
        }
        updateDisplay();
        API.setState({ content: content });
        API.emitOutput('text.changed', content);
      });

      // Handle text.style input
      API.onInput('text.style', function(style) {
        if (style.fontSize) fontSize = style.fontSize;
        if (style.color) color = style.color;
        if (style.align) align = style.align;
        updateDisplay();
        API.setState({ fontSize, color, align });
      });

      // Handle ui.show
      API.onInput('ui.show', function() {
        container.style.display = 'flex';
      });

      // Handle ui.hide
      API.onInput('ui.hide', function() {
        container.style.display = 'none';
      });

      // Handle click
      container.addEventListener('click', function() {
        API.emitOutput('ui.clicked', { content: content });
        API.emit('clicked', { content: content });
      });

      // Handle state changes from external sources
      API.onStateChange(function(newState) {
        if (newState.content !== undefined) content = newState.content;
        if (newState.fontSize !== undefined) fontSize = newState.fontSize;
        if (newState.color !== undefined) color = newState.color;
        if (newState.align !== undefined) align = newState.align;
        updateDisplay();
      });

      API.onDestroy(function() {
        API.log('BasicTextWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const BasicTextWidget: BuiltinWidget = {
  manifest: BasicTextWidgetManifest,
  html: BasicTextWidgetHTML,
};
