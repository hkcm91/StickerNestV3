/**
 * StickerNest v2 - Cross-Canvas Listener Widget
 *
 * A tester widget that listens for messages from all canvases.
 * Shows the source canvas (same vs different) and message content.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const CrossCanvasListenerManifest: WidgetManifest = {
  id: 'stickernest.cross-canvas-listener',
  name: 'Cross-Canvas Listener',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Listens for messages from all canvases and shows their source',
  author: 'StickerNest',
  tags: ['cross-canvas', 'communication', 'tester', 'listener'],
  inputs: {
    broadcast: {
      type: 'object',
      description: 'Broadcast messages from other widgets',
    },
    ping: {
      type: 'string',
      description: 'Ping signals from other widgets',
    },
    color: {
      type: 'object',
      description: 'Color signals from other widgets',
    },
  },
  outputs: {
    pong: {
      type: 'string',
      description: 'Response to ping',
    },
  },
  io: {
    inputs: ['cross.broadcast', 'cross.ping', 'cross.color'],
    outputs: ['cross.pong'],
  },
  // Events.listens enables broadcast listener registration - this is how the widget
  // receives cross-canvas messages without explicit pipeline connections
  events: {
    listens: ['cross.broadcast', 'cross.ping', 'cross.color', 'cross.pong'],
  },
  size: {
    width: 300,
    height: 250,
    minWidth: 220,
    minHeight: 180,
  },
};

export const CrossCanvasListenerHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }
    .container {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a2e1a 0%, #0f1910 100%);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .icon {
      font-size: 18px;
    }
    .title {
      font-size: 13px;
      font-weight: 600;
      color: #22c55e;
    }
    .canvas-id {
      font-size: 10px;
      color: #94a3b8;
      background: rgba(34, 197, 94, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: auto;
    }
    .color-bar {
      height: 6px;
      border-radius: 3px;
      background: #333;
      transition: background 0.3s;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .message {
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 11px;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .message.same-canvas {
      background: rgba(34, 197, 94, 0.2);
      border-left: 3px solid #22c55e;
    }
    .message.other-canvas {
      background: rgba(168, 85, 247, 0.2);
      border-left: 3px solid #a855f7;
    }
    .message-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .badge {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    .badge.same {
      background: #22c55e;
      color: #0f1910;
    }
    .badge.cross {
      background: #a855f7;
      color: white;
    }
    .source {
      font-size: 10px;
      color: #64748b;
    }
    .content {
      color: white;
      word-break: break-word;
    }
    .empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 12px;
      text-align: center;
    }
    .stats {
      display: flex;
      gap: 12px;
      font-size: 10px;
      color: #64748b;
      padding-top: 6px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .stat-value {
      color: white;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="icon">👂</span>
      <span class="title">Listener</span>
      <span class="canvas-id" id="canvasId">Canvas: ?</span>
    </div>

    <div class="color-bar" id="colorBar"></div>

    <div class="messages" id="messages">
      <div class="empty">Waiting for messages...<br>Try broadcasting from another widget!</div>
    </div>

    <div class="stats">
      <div class="stat">Same: <span class="stat-value" id="sameCount">0</span></div>
      <div class="stat">Cross: <span class="stat-value" id="crossCount">0</span></div>
      <div class="stat">Total: <span class="stat-value" id="totalCount">0</span></div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      const messagesEl = document.getElementById('messages');
      const colorBar = document.getElementById('colorBar');
      const canvasIdEl = document.getElementById('canvasId');
      const sameCountEl = document.getElementById('sameCount');
      const crossCountEl = document.getElementById('crossCount');
      const totalCountEl = document.getElementById('totalCount');

      let myCanvasId = 'unknown';
      let sameCount = 0;
      let crossCount = 0;
      let messages = [];
      const MAX_MESSAGES = 20;

      function isSameCanvas(fromCanvas) {
        if (!fromCanvas) return true; // Assume same if not specified
        return fromCanvas === myCanvasId;
      }

      function addMessage(type, content, fromCanvas) {
        const same = isSameCanvas(fromCanvas);
        if (same) {
          sameCount++;
        } else {
          crossCount++;
        }

        // Update stats
        sameCountEl.textContent = sameCount;
        crossCountEl.textContent = crossCount;
        totalCountEl.textContent = sameCount + crossCount;

        // Clear empty state
        if (messages.length === 0) {
          messagesEl.innerHTML = '';
        }

        // Create message element
        const msgEl = document.createElement('div');
        msgEl.className = 'message ' + (same ? 'same-canvas' : 'other-canvas');

        const sourceLabel = fromCanvas ? fromCanvas.replace('gallery-', '').replace('demo-', '') : 'unknown';

        msgEl.innerHTML = \`
          <div class="message-header">
            <span class="badge \${same ? 'same' : 'cross'}">\${same ? 'SAME' : 'CROSS'}</span>
            <span class="source">\${type} from \${sourceLabel}</span>
          </div>
          <div class="content">\${content}</div>
        \`;

        // Add to beginning
        messagesEl.insertBefore(msgEl, messagesEl.firstChild);

        // Track and limit messages
        messages.unshift({ type, content, fromCanvas, same });
        if (messages.length > MAX_MESSAGES) {
          messages.pop();
          if (messagesEl.lastChild) {
            messagesEl.removeChild(messagesEl.lastChild);
          }
        }
      }

      // Listen for broadcast messages
      API.onInput('cross.broadcast', function(data) {
        const msg = typeof data === 'object' ? (data.message || JSON.stringify(data)) : String(data);
        const from = data?.fromCanvas || null;
        addMessage('📢 Broadcast', msg, from);
        API.log('Received broadcast: ' + msg + ' from ' + from);
      });

      // Listen for ping signals
      API.onInput('cross.ping', function(data) {
        const from = data?.fromCanvas || null;
        addMessage('🏓 Ping', 'Ping received!', from);
        API.log('Received ping from ' + from);

        // Send pong back
        API.emitOutput('cross.pong', {
          type: 'pong',
          fromCanvas: myCanvasId,
          inResponseTo: from,
          timestamp: Date.now()
        });
      });

      // Listen for color signals
      API.onInput('cross.color', function(data) {
        const color = data?.color || '#333';
        const from = data?.fromCanvas || null;
        addMessage('🎨 Color', color, from);
        colorBar.style.background = color;
        API.log('Received color: ' + color + ' from ' + from);
      });

      // Also listen for pong (in case another listener responds)
      API.onInput('cross.pong', function(data) {
        const from = data?.fromCanvas || null;
        addMessage('🏓 Pong', 'Pong received!', from);
        API.log('Received pong from ' + from);
      });

      API.onMount(function(context) {
        myCanvasId = context.canvasId || context.widgetId?.split('-widget-')[0] || 'unknown';
        canvasIdEl.textContent = 'Canvas: ' + myCanvasId.replace('gallery-', '').replace('demo-', '');
        API.log('Listener mounted on canvas: ' + myCanvasId);
      });
    })();
  </script>
</body>
</html>
`;

export const CrossCanvasListenerWidget: BuiltinWidget = {
  manifest: CrossCanvasListenerManifest,
  html: CrossCanvasListenerHTML,
};
