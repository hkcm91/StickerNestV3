/**
 * StickerNest v2 - Cross-Canvas Broadcaster Widget
 *
 * A tester widget that broadcasts messages to all canvases.
 * Shows which canvas it's on and lets users send custom messages.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const CrossCanvasBroadcasterManifest: WidgetManifest = {
  id: 'stickernest.cross-canvas-broadcaster',
  name: 'Cross-Canvas Broadcaster',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Broadcasts messages across all connected canvases',
  author: 'StickerNest',
  tags: ['cross-canvas', 'communication', 'tester', 'broadcast'],
  inputs: {},
  outputs: {
    broadcast: {
      type: 'object',
      description: 'Broadcast message sent to all canvases',
    },
    ping: {
      type: 'string',
      description: 'Ping signal for testing',
    },
  },
  io: {
    inputs: [],
    outputs: ['cross.broadcast', 'cross.ping', 'cross.color'],
  },
  size: {
    width: 280,
    height: 200,
    minWidth: 200,
    minHeight: 160,
  },
};

export const CrossCanvasBroadcasterHTML = `
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
      background: linear-gradient(135deg, #1e3a5f 0%, #0f1922 100%);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .icon {
      font-size: 20px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      color: #60a5fa;
    }
    .canvas-id {
      font-size: 11px;
      color: #94a3b8;
      background: rgba(96, 165, 250, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: auto;
    }
    .input-row {
      display: flex;
      gap: 8px;
    }
    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid rgba(96, 165, 250, 0.3);
      border-radius: 6px;
      background: rgba(15, 25, 34, 0.8);
      color: white;
      font-size: 13px;
    }
    input:focus {
      outline: none;
      border-color: #60a5fa;
    }
    .buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-broadcast {
      background: #60a5fa;
      color: #0f1922;
    }
    .btn-broadcast:hover {
      background: #3b82f6;
    }
    .btn-ping {
      background: #22c55e;
      color: #0f1922;
    }
    .btn-ping:hover {
      background: #16a34a;
    }
    .btn-color {
      background: #f59e0b;
      color: #0f1922;
    }
    .btn-color:hover {
      background: #d97706;
    }
    .status {
      font-size: 11px;
      color: #64748b;
      text-align: center;
      margin-top: auto;
    }
    .status.sent {
      color: #22c55e;
    }
    .color-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    input[type="color"] {
      width: 40px;
      height: 30px;
      padding: 0;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="icon">📡</span>
      <span class="title">Broadcaster</span>
      <span class="canvas-id" id="canvasId">Canvas: ?</span>
    </div>

    <div class="input-row">
      <input type="text" id="message" placeholder="Enter message..." value="Hello!" />
    </div>

    <div class="color-row">
      <input type="color" id="color" value="#60a5fa" />
      <button class="btn btn-color" id="sendColor">Send Color</button>
    </div>

    <div class="buttons">
      <button class="btn btn-broadcast" id="broadcast">📢 Broadcast</button>
      <button class="btn btn-ping" id="ping">🏓 Ping</button>
    </div>

    <div class="status" id="status">Ready to broadcast</div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      const messageInput = document.getElementById('message');
      const colorInput = document.getElementById('color');
      const broadcastBtn = document.getElementById('broadcast');
      const pingBtn = document.getElementById('ping');
      const sendColorBtn = document.getElementById('sendColor');
      const statusEl = document.getElementById('status');
      const canvasIdEl = document.getElementById('canvasId');

      let canvasId = 'unknown';
      let messageCount = 0;

      function showStatus(text, duration = 2000) {
        statusEl.textContent = text;
        statusEl.classList.add('sent');
        setTimeout(() => {
          statusEl.textContent = 'Ready to broadcast';
          statusEl.classList.remove('sent');
        }, duration);
      }

      broadcastBtn.addEventListener('click', function() {
        const msg = messageInput.value || 'Hello!';
        messageCount++;

        API.emitOutput('cross.broadcast', {
          message: msg,
          fromCanvas: canvasId,
          timestamp: Date.now(),
          count: messageCount
        });

        showStatus('📢 Broadcast sent: ' + msg);
        API.log('Broadcast sent from ' + canvasId + ': ' + msg);
      });

      pingBtn.addEventListener('click', function() {
        API.emitOutput('cross.ping', {
          type: 'ping',
          fromCanvas: canvasId,
          timestamp: Date.now()
        });

        showStatus('🏓 Ping sent!');
        API.log('Ping sent from ' + canvasId);
      });

      sendColorBtn.addEventListener('click', function() {
        const color = colorInput.value;

        API.emitOutput('cross.color', {
          color: color,
          fromCanvas: canvasId,
          timestamp: Date.now()
        });

        showStatus('🎨 Color sent: ' + color);
        API.log('Color sent from ' + canvasId + ': ' + color);
      });

      // Allow Enter key to broadcast
      messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          broadcastBtn.click();
        }
      });

      API.onMount(function(context) {
        canvasId = context.canvasId || context.widgetId?.split('-widget-')[0] || 'unknown';
        canvasIdEl.textContent = 'Canvas: ' + canvasId.replace('gallery-', '').replace('demo-', '');
        API.log('Broadcaster mounted on canvas: ' + canvasId);
      });
    })();
  </script>
</body>
</html>
`;

export const CrossCanvasBroadcasterWidget: BuiltinWidget = {
  manifest: CrossCanvasBroadcasterManifest,
  html: CrossCanvasBroadcasterHTML,
};
