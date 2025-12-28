/**
 * StickerNest v2 - Data Display Widget
 *
 * A versatile data display widget for showing pipeline outputs.
 * Supports various data formats: text, JSON, table, charts, etc.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const DataDisplayWidgetManifest: WidgetManifest = {
  id: 'stickernest.data-display',
  name: 'Data Display',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'A versatile data display widget for showing pipeline outputs',
  author: 'StickerNest',
  tags: ['data', 'display', 'json', 'table', 'output', 'pipeline', 'core'],
  inputs: {
    data: {
      type: 'any',
      description: 'Data to display',
      default: null,
    },
    format: {
      type: 'string',
      description: 'Display format: auto, text, json, table, list, card, number',
      default: 'auto',
    },
    title: {
      type: 'string',
      description: 'Display title',
      default: '',
    },
    theme: {
      type: 'string',
      description: 'Color theme: dark, light, gradient',
      default: 'dark',
    },
  },
  outputs: {
    dataReceived: {
      type: 'any',
      description: 'Emitted when new data is received',
    },
    clicked: {
      type: 'object',
      description: 'Emitted when display is clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['data.set', 'data.update', 'data.clear', 'data.refresh', 'state.set'],
    outputs: ['data.changed', 'ui.clicked', 'state.changed'],
  },
  size: {
    width: 300,
    height: 200,
    minWidth: 150,
    minHeight: 80,
    scaleMode: 'stretch',
  },
};

export const DataDisplayWidgetHTML = `
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
      flex-direction: column;
      background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
      border-radius: 8px;
      overflow: hidden;
    }
    .container.light {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      color: #333;
    }
    .container.gradient {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .header {
      display: none;
      padding: 12px 16px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .header.visible {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .title {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
    }
    .container.light .title {
      color: #333;
    }
    .format-badge {
      font-size: 9px;
      padding: 2px 6px;
      background: rgba(255,255,255,0.15);
      border-radius: 4px;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content {
      flex: 1;
      overflow: auto;
      padding: 16px;
      color: rgba(255,255,255,0.9);
    }
    .container.light .content {
      color: #333;
    }
    .placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.4);
    }
    .container.light .placeholder {
      color: rgba(0,0,0,0.3);
    }
    .placeholder-icon {
      font-size: 36px;
      margin-bottom: 8px;
    }
    .placeholder-text {
      font-size: 12px;
    }

    /* Text format */
    .text-display {
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Number format */
    .number-display {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .number-value {
      font-size: 48px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      background: linear-gradient(135deg, #4fd1c5, #38b2ac);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .number-label {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      margin-top: 4px;
    }
    .container.light .number-label {
      color: rgba(0,0,0,0.5);
    }

    /* JSON format */
    .json-display {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre;
      overflow-x: auto;
    }
    .json-key { color: #a78bfa; }
    .json-string { color: #34d399; }
    .json-number { color: #fbbf24; }
    .json-boolean { color: #60a5fa; }
    .json-null { color: #94a3b8; }
    .container.light .json-key { color: #7c3aed; }
    .container.light .json-string { color: #059669; }
    .container.light .json-number { color: #d97706; }
    .container.light .json-boolean { color: #2563eb; }

    /* Table format */
    .table-display {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .table-display th,
    .table-display td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .container.light .table-display th,
    .container.light .table-display td {
      border-color: rgba(0,0,0,0.1);
    }
    .table-display th {
      background: rgba(0,0,0,0.2);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .table-display tr:hover td {
      background: rgba(255,255,255,0.05);
    }

    /* List format */
    .list-display {
      list-style: none;
    }
    .list-item {
      padding: 8px 12px;
      margin-bottom: 4px;
      background: rgba(255,255,255,0.05);
      border-radius: 6px;
      font-size: 13px;
      transition: background 0.2s;
    }
    .list-item:hover {
      background: rgba(255,255,255,0.1);
    }

    /* Card format */
    .card-display {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 8px;
    }
    .card-item {
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      text-align: center;
    }
    .card-value {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .card-label {
      font-size: 10px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
    }
    .container.light .card-label {
      color: rgba(0,0,0,0.5);
    }

    /* Timestamp */
    .timestamp {
      font-size: 9px;
      color: rgba(255,255,255,0.3);
      text-align: right;
      padding: 4px 16px 8px;
    }
    .container.light .timestamp {
      color: rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="header" id="header">
      <span class="title" id="title"></span>
      <span class="format-badge" id="formatBadge">auto</span>
    </div>
    <div class="content" id="content">
      <div class="placeholder" id="placeholder">
        <div class="placeholder-icon">📊</div>
        <div class="placeholder-text">Waiting for data...</div>
      </div>
    </div>
    <div class="timestamp" id="timestamp"></div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const container = document.getElementById('container');
      const header = document.getElementById('header');
      const title = document.getElementById('title');
      const formatBadge = document.getElementById('formatBadge');
      const content = document.getElementById('content');
      const placeholder = document.getElementById('placeholder');
      const timestamp = document.getElementById('timestamp');

      let currentData = null;
      let format = 'auto';
      let theme = 'dark';

      function detectFormat(data) {
        if (data === null || data === undefined) return 'placeholder';
        if (typeof data === 'number') return 'number';
        if (typeof data === 'string') return 'text';
        if (typeof data === 'boolean') return 'text';
        if (Array.isArray(data)) {
          if (data.length > 0 && typeof data[0] === 'object') return 'table';
          return 'list';
        }
        if (typeof data === 'object') {
          const keys = Object.keys(data);
          if (keys.length <= 6 && keys.every(k => typeof data[k] !== 'object')) {
            return 'card';
          }
          return 'json';
        }
        return 'text';
      }

      function formatJSON(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        const type = typeof obj;

        if (obj === null) {
          return '<span class="json-null">null</span>';
        }
        if (type === 'boolean') {
          return '<span class="json-boolean">' + obj + '</span>';
        }
        if (type === 'number') {
          return '<span class="json-number">' + obj + '</span>';
        }
        if (type === 'string') {
          return '<span class="json-string">"' + escapeHtml(obj) + '"</span>';
        }
        if (Array.isArray(obj)) {
          if (obj.length === 0) return '[]';
          const items = obj.map((item, i) =>
            spaces + '  ' + formatJSON(item, indent + 1) + (i < obj.length - 1 ? ',' : '')
          ).join('\\n');
          return '[\\n' + items + '\\n' + spaces + ']';
        }
        if (type === 'object') {
          const keys = Object.keys(obj);
          if (keys.length === 0) return '{}';
          const items = keys.map((key, i) =>
            spaces + '  <span class="json-key">"' + escapeHtml(key) + '"</span>: ' +
            formatJSON(obj[key], indent + 1) + (i < keys.length - 1 ? ',' : '')
          ).join('\\n');
          return '{\\n' + items + '\\n' + spaces + '}';
        }
        return String(obj);
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function render() {
        const displayFormat = format === 'auto' ? detectFormat(currentData) : format;
        formatBadge.textContent = displayFormat;

        if (currentData === null || currentData === undefined) {
          content.innerHTML = '';
          content.appendChild(placeholder);
          placeholder.style.display = 'flex';
          timestamp.textContent = '';
          return;
        }

        placeholder.style.display = 'none';
        timestamp.textContent = 'Updated: ' + new Date().toLocaleTimeString();

        switch (displayFormat) {
          case 'number':
            const numValue = typeof currentData === 'number' ? currentData :
                           (currentData.value !== undefined ? currentData.value : currentData);
            const numLabel = currentData.label || currentData.unit || '';
            content.innerHTML = \`
              <div class="number-display">
                <div class="number-value">\${typeof numValue === 'number' ? numValue.toLocaleString() : numValue}</div>
                \${numLabel ? '<div class="number-label">' + escapeHtml(numLabel) + '</div>' : ''}
              </div>
            \`;
            break;

          case 'text':
            content.innerHTML = '<div class="text-display">' + escapeHtml(String(currentData)) + '</div>';
            break;

          case 'json':
            content.innerHTML = '<pre class="json-display">' + formatJSON(currentData) + '</pre>';
            break;

          case 'table':
            if (Array.isArray(currentData) && currentData.length > 0) {
              const headers = Object.keys(currentData[0]);
              content.innerHTML = \`
                <table class="table-display">
                  <thead>
                    <tr>\${headers.map(h => '<th>' + escapeHtml(h) + '</th>').join('')}</tr>
                  </thead>
                  <tbody>
                    \${currentData.map(row => '<tr>' +
                      headers.map(h => '<td>' + escapeHtml(String(row[h] ?? '')) + '</td>').join('') +
                    '</tr>').join('')}
                  </tbody>
                </table>
              \`;
            }
            break;

          case 'list':
            const items = Array.isArray(currentData) ? currentData : [currentData];
            content.innerHTML = \`
              <ul class="list-display">
                \${items.map(item => '<li class="list-item">' + escapeHtml(String(item)) + '</li>').join('')}
              </ul>
            \`;
            break;

          case 'card':
            const entries = typeof currentData === 'object' ? Object.entries(currentData) : [];
            content.innerHTML = \`
              <div class="card-display">
                \${entries.map(([key, value]) => \`
                  <div class="card-item">
                    <div class="card-value">\${escapeHtml(String(value))}</div>
                    <div class="card-label">\${escapeHtml(key)}</div>
                  </div>
                \`).join('')}
              </div>
            \`;
            break;

          default:
            content.innerHTML = '<div class="text-display">' + escapeHtml(JSON.stringify(currentData)) + '</div>';
        }
      }

      function updateHeader() {
        const titleText = API.getState().title || '';
        if (titleText) {
          header.classList.add('visible');
          title.textContent = titleText;
        } else {
          header.classList.remove('visible');
        }
      }

      function applyTheme() {
        container.className = 'container ' + theme;
      }

      // Initialize
      API.onMount(function(context) {
        const state = context.state || {};
        currentData = state.data;
        format = state.format || 'auto';
        theme = state.theme || 'dark';

        applyTheme();
        updateHeader();
        render();
        API.log('DataDisplayWidget mounted');
      });

      // Click handler
      content.addEventListener('click', function() {
        API.emitOutput('ui.clicked', { data: currentData, format: format });
        API.emit('clicked', { data: currentData });
      });

      // Pipeline inputs
      API.onInput('data.set', function(value) {
        currentData = value;
        API.setState({ data: currentData });
        render();
        API.emitOutput('data.changed', currentData);
      });

      API.onInput('data.update', function(patch) {
        if (typeof currentData === 'object' && currentData !== null && typeof patch === 'object') {
          currentData = Object.assign({}, currentData, patch);
        } else {
          currentData = patch;
        }
        API.setState({ data: currentData });
        render();
        API.emitOutput('data.changed', currentData);
      });

      API.onInput('data.clear', function() {
        currentData = null;
        API.setState({ data: null });
        render();
        API.emitOutput('data.changed', null);
      });

      API.onInput('data.refresh', function() {
        render();
      });

      API.onInput('state.set', function(state) {
        if (state.data !== undefined) currentData = state.data;
        if (state.format !== undefined) format = state.format;
        if (state.theme !== undefined) { theme = state.theme; applyTheme(); }
        if (state.title !== undefined) {
          API.setState({ title: state.title });
          updateHeader();
        }
        render();
        API.setState(state);
      });

      // Also accept any event as data input
      API.onEvent('*', function(event) {
        // Skip internal events
        if (event.type.startsWith('widget:') || event.type.startsWith('pipeline:') ||
            event.type.startsWith('bridge:') || event.type === 'data.set') {
          return;
        }
        // Use event payload as data
        if (event.payload !== undefined) {
          currentData = event.payload;
          API.setState({ data: currentData, lastEventType: event.type });
          render();
          API.emitOutput('data.changed', currentData);
        }
      });

      API.onDestroy(function() {
        API.log('DataDisplayWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const DataDisplayWidget: BuiltinWidget = {
  manifest: DataDisplayWidgetManifest,
  html: DataDisplayWidgetHTML,
};
