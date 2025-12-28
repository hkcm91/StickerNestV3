/**
 * StickerNest v2 - Color Sync Widget
 *
 * A widget that syncs its color across all canvases.
 * When you pick a color, all Color Sync widgets update.
 * Shows source badge to indicate same-canvas vs cross-canvas updates.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ColorSyncManifest: WidgetManifest = {
  id: 'stickernest.color-sync',
  name: 'Color Sync',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Syncs color across all connected canvases',
  author: 'StickerNest',
  tags: ['cross-canvas', 'communication', 'tester', 'color', 'sync'],
  inputs: {
    color: {
      type: 'object',
      description: 'Color sync from other widgets',
    },
  },
  outputs: {
    color: {
      type: 'object',
      description: 'Color sync to other widgets',
    },
  },
  io: {
    inputs: ['sync.color'],
    outputs: ['sync.color'],
  },
  size: {
    width: 200,
    height: 180,
    minWidth: 150,
    minHeight: 140,
  },
};

export const ColorSyncHTML = `
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
      background: #1a1a2e;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .icon {
      font-size: 18px;
    }
    .title {
      font-size: 13px;
      font-weight: 600;
      color: #f1f5f9;
    }
    .canvas-badge {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: auto;
    }
    .canvas-badge.canvas-1 {
      background: rgba(139, 92, 246, 0.3);
      color: #a78bfa;
    }
    .canvas-badge.canvas-2 {
      background: rgba(34, 197, 94, 0.3);
      color: #22c55e;
    }
    .color-display {
      width: 100%;
      flex: 1;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s ease;
      position: relative;
      cursor: pointer;
      border: 2px solid rgba(255,255,255,0.1);
    }
    .color-display:hover {
      border-color: rgba(255,255,255,0.3);
    }
    .color-value {
      font-size: 14px;
      font-weight: 600;
      color: white;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      text-transform: uppercase;
    }
    .source-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .source-badge.show {
      opacity: 1;
    }
    .source-badge.same {
      background: #22c55e;
      color: #0f1910;
    }
    .source-badge.cross {
      background: #a855f7;
      color: white;
    }
    .source-badge.local {
      background: #3b82f6;
      color: white;
    }
    input[type="color"] {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    .footer {
      font-size: 10px;
      color: #64748b;
      text-align: center;
    }
    .sync-count {
      color: white;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="icon">🎨</span>
      <span class="title">Color Sync</span>
      <span class="canvas-badge" id="canvasBadge">?</span>
    </div>

    <div class="color-display" id="colorDisplay" style="background: #8b5cf6;">
      <input type="color" id="colorPicker" value="#8b5cf6" />
      <span class="color-value" id="colorValue">#8b5cf6</span>
      <span class="source-badge" id="sourceBadge">LOCAL</span>
    </div>

    <div class="footer">
      Syncs: <span class="sync-count" id="syncCount">0</span> | Click to change color
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      const colorDisplay = document.getElementById('colorDisplay');
      const colorPicker = document.getElementById('colorPicker');
      const colorValue = document.getElementById('colorValue');
      const sourceBadge = document.getElementById('sourceBadge');
      const canvasBadge = document.getElementById('canvasBadge');
      const syncCountEl = document.getElementById('syncCount');

      let myCanvasId = 'unknown';
      let currentColor = '#8b5cf6';
      let syncCount = 0;
      let badgeTimeout = null;

      function showBadge(type) {
        clearTimeout(badgeTimeout);
        sourceBadge.className = 'source-badge show ' + type;
        sourceBadge.textContent = type.toUpperCase();
        badgeTimeout = setTimeout(() => {
          sourceBadge.classList.remove('show');
        }, 2000);
      }

      function setColor(color, fromCanvas, isLocal) {
        currentColor = color;
        colorDisplay.style.background = color;
        colorValue.textContent = color;
        colorPicker.value = color;

        if (isLocal) {
          showBadge('local');
        } else if (fromCanvas === myCanvasId) {
          showBadge('same');
        } else {
          showBadge('cross');
        }

        if (!isLocal) {
          syncCount++;
          syncCountEl.textContent = syncCount;
        }

        API.setState({ color: currentColor });
      }

      // When user picks a color
      colorPicker.addEventListener('input', function(e) {
        const color = e.target.value;
        setColor(color, myCanvasId, true);

        // Broadcast to all canvases
        API.emitOutput('sync.color', {
          color: color,
          fromCanvas: myCanvasId,
          timestamp: Date.now()
        });

        API.log('Color changed locally: ' + color);
      });

      // Listen for color sync from other widgets
      API.onInput('sync.color', function(data) {
        const color = data?.color;
        const from = data?.fromCanvas;

        if (color && color !== currentColor) {
          setColor(color, from, false);
          API.log('Color synced from ' + from + ': ' + color);
        }
      });

      API.onMount(function(context) {
        myCanvasId = context.canvasId || context.widgetId?.split('-widget-')[0] || 'unknown';

        // Set canvas badge
        const shortId = myCanvasId.replace('gallery-', '').replace('demo-', '');
        canvasBadge.textContent = shortId;

        if (myCanvasId.includes('1') || myCanvasId.includes('main')) {
          canvasBadge.classList.add('canvas-1');
        } else {
          canvasBadge.classList.add('canvas-2');
        }

        // Restore saved color
        if (context.state?.color) {
          setColor(context.state.color, myCanvasId, true);
        }

        API.log('Color Sync mounted on canvas: ' + myCanvasId);
      });

      API.onStateChange(function(newState) {
        if (newState.color && newState.color !== currentColor) {
          setColor(newState.color, myCanvasId, true);
        }
      });
    })();
  </script>
</body>
</html>
`;

export const ColorSyncWidget: BuiltinWidget = {
  manifest: ColorSyncManifest,
  html: ColorSyncHTML,
};
