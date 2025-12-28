/**
 * StickerNest v2 - OBS Control Widget
 *
 * Control panel for OBS Studio integration.
 * Allows scene switching, source visibility toggling, and stream control.
 * Mobile-optimized with 48px touch targets and haptic feedback.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const OBSControlWidgetManifest: WidgetManifest = {
  id: 'stickernest.obs-control',
  name: 'OBS Control',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Control OBS scenes, sources, and streaming from your canvas',
  author: 'StickerNest',
  tags: ['obs', 'streaming', 'control', 'scenes', 'broadcast'],
  inputs: {
    connect: {
      type: 'trigger',
      description: 'Trigger to connect to OBS',
    },
    disconnect: {
      type: 'trigger',
      description: 'Trigger to disconnect from OBS',
    },
    switchScene: {
      type: 'string',
      description: 'Switch to a specific scene by name',
    },
    toggleSource: {
      type: 'object',
      description: 'Toggle source visibility { sourceName, visible }',
    },
  },
  outputs: {
    connected: {
      type: 'trigger',
      description: 'Emitted when connected to OBS',
    },
    disconnected: {
      type: 'trigger',
      description: 'Emitted when disconnected from OBS',
    },
    sceneChanged: {
      type: 'string',
      description: 'Emitted when scene changes, contains scene name',
    },
    streamStarted: {
      type: 'trigger',
      description: 'Emitted when streaming starts',
    },
    streamStopped: {
      type: 'trigger',
      description: 'Emitted when streaming stops',
    },
    error: {
      type: 'string',
      description: 'Emitted when an error occurs',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['trigger.connect', 'scene.switch', 'source.toggle'],
    outputs: ['status.changed', 'scene.changed', 'stream.started', 'stream.stopped', 'error.occurred'],
  },
  events: {
    listens: ['obs:scene-changed', 'obs:stream-started', 'obs:stream-stopped', 'obs:source-visibility'],
  },
  size: {
    width: 280,
    height: 320,
    minWidth: 240,
    minHeight: 200,
    scaleMode: 'scale',
  },
};

export const OBSControlWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
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
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      padding: 12px;
      gap: 12px;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
    }
    .status-dot.connected { background: #22c55e; }
    .status-dot.connecting { background: #f59e0b; animation: pulse 1s infinite; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Connection Panel */
    .connection-panel {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 8px;
    }
    .connection-row {
      display: flex;
      gap: 8px;
    }
    .input-field {
      flex: 1;
      min-height: 44px;
      padding: 10px 12px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 6px;
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 14px;
    }
    .input-field:focus {
      outline: none;
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .input-field::placeholder {
      color: var(--sn-text-secondary, #94a3b8);
    }
    .port-input {
      width: 80px;
      flex: none;
    }

    /* Buttons - 48px minimum for mobile touch targets */
    .btn {
      min-height: 48px;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s ease;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .btn:active {
      transform: scale(0.96);
    }
    .btn-primary {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .btn-primary:hover { background: #7c4fe0; }
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .btn-danger:hover { background: #dc2626; }
    .btn-secondary {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    /* Scene List */
    .section-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .scene-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .scene-btn {
      min-height: 48px;
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 14px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .scene-btn:active {
      transform: scale(0.98);
    }
    .scene-btn.active {
      background: var(--sn-accent-primary, #8b5cf6);
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .scene-btn:not(.active):hover {
      background: var(--sn-bg-tertiary, #252538);
      border-color: var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    /* Stream Controls */
    .stream-controls {
      display: flex;
      gap: 8px;
    }
    .stream-btn {
      flex: 1;
    }
    .stream-btn.live {
      background: #ef4444;
      animation: live-pulse 2s infinite;
    }
    @keyframes live-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
    }

    /* Empty State */
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 13px;
      text-align: center;
      padding: 20px;
    }
    .empty-icon {
      font-size: 32px;
      opacity: 0.5;
    }

    /* Hide sections based on state */
    .hidden { display: none !important; }

    /* Scrollbar styling */
    .scene-list::-webkit-scrollbar { width: 4px; }
    .scene-list::-webkit-scrollbar-track { background: transparent; }
    .scene-list::-webkit-scrollbar-thumb { background: var(--sn-border-primary, rgba(139, 92, 246, 0.3)); border-radius: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="title">
        <span class="status-dot" id="statusDot"></span>
        <span>OBS Studio</span>
      </div>
      <span id="statusText" style="font-size: 12px; color: var(--sn-text-secondary, #94a3b8);">Disconnected</span>
    </div>

    <!-- Connection Panel (shown when disconnected) -->
    <div class="connection-panel" id="connectionPanel">
      <div class="connection-row">
        <input type="text" class="input-field" id="hostInput" placeholder="localhost" value="localhost">
        <input type="number" class="input-field port-input" id="portInput" placeholder="4455" value="4455">
      </div>
      <input type="password" class="input-field" id="passwordInput" placeholder="Password (optional)">
      <button class="btn btn-primary" id="connectBtn">Connect to OBS</button>
    </div>

    <!-- Connected Panel (shown when connected) -->
    <div class="hidden" id="connectedPanel">
      <!-- Scene List -->
      <div class="section-title">Scenes</div>
      <div class="scene-list" id="sceneList">
        <!-- Populated dynamically -->
      </div>

      <!-- Stream Controls -->
      <div style="margin-top: 12px;">
        <div class="section-title">Stream</div>
        <div class="stream-controls">
          <button class="btn btn-secondary stream-btn" id="streamBtn">Start Stream</button>
          <button class="btn btn-secondary stream-btn" id="recordBtn">Record</button>
        </div>
      </div>

      <!-- Disconnect -->
      <button class="btn btn-danger" id="disconnectBtn" style="margin-top: 12px;">Disconnect</button>
    </div>

    <!-- Empty State (shown when connected but no scenes) -->
    <div class="empty-state hidden" id="emptyState">
      <div class="empty-icon">📺</div>
      <div>No scenes found</div>
      <div style="font-size: 11px;">Make sure OBS is running with scenes configured</div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // DOM Elements
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');
      const connectionPanel = document.getElementById('connectionPanel');
      const connectedPanel = document.getElementById('connectedPanel');
      const emptyState = document.getElementById('emptyState');
      const sceneList = document.getElementById('sceneList');
      const hostInput = document.getElementById('hostInput');
      const portInput = document.getElementById('portInput');
      const passwordInput = document.getElementById('passwordInput');
      const connectBtn = document.getElementById('connectBtn');
      const disconnectBtn = document.getElementById('disconnectBtn');
      const streamBtn = document.getElementById('streamBtn');
      const recordBtn = document.getElementById('recordBtn');

      // State
      let state = {
        status: 'disconnected', // disconnected, connecting, connected, error
        scenes: [],
        currentScene: null,
        isStreaming: false,
        isRecording: false,
        host: 'localhost',
        port: 4455
      };

      // Haptic feedback helper
      function haptic(type) {
        if (navigator.vibrate) {
          const patterns = {
            light: [10],
            medium: [20],
            success: [10, 50, 10],
            error: [50, 30, 50]
          };
          navigator.vibrate(patterns[type] || patterns.light);
        }
      }

      // Update UI based on state
      function updateUI() {
        // Status indicator
        statusDot.className = 'status-dot';
        if (state.status === 'connected') statusDot.classList.add('connected');
        else if (state.status === 'connecting') statusDot.classList.add('connecting');

        statusText.textContent = {
          disconnected: 'Disconnected',
          connecting: 'Connecting...',
          connected: 'Connected',
          error: 'Error'
        }[state.status] || 'Unknown';

        // Show/hide panels
        const isConnected = state.status === 'connected';
        connectionPanel.classList.toggle('hidden', isConnected);

        if (isConnected) {
          if (state.scenes.length === 0) {
            connectedPanel.classList.add('hidden');
            emptyState.classList.remove('hidden');
          } else {
            connectedPanel.classList.remove('hidden');
            emptyState.classList.add('hidden');
            renderScenes();
          }
        } else {
          connectedPanel.classList.add('hidden');
          emptyState.classList.add('hidden');
        }

        // Stream/Record buttons
        if (state.isStreaming) {
          streamBtn.textContent = 'Stop Stream';
          streamBtn.classList.add('live');
        } else {
          streamBtn.textContent = 'Start Stream';
          streamBtn.classList.remove('live');
        }

        recordBtn.textContent = state.isRecording ? 'Stop Recording' : 'Record';
        recordBtn.style.background = state.isRecording ? '#ef4444' : '';
      }

      // Render scene buttons
      function renderScenes() {
        sceneList.innerHTML = '';
        state.scenes.forEach(scene => {
          const btn = document.createElement('button');
          btn.className = 'scene-btn' + (scene.name === state.currentScene ? ' active' : '');
          btn.textContent = scene.name;
          btn.addEventListener('click', () => {
            haptic('light');
            switchScene(scene.name);
          });
          sceneList.appendChild(btn);
        });
      }

      // Actions (emit to host for actual OBS control)
      function connect() {
        haptic('medium');
        state.host = hostInput.value || 'localhost';
        state.port = parseInt(portInput.value) || 4455;
        state.status = 'connecting';
        updateUI();

        API.emitOutput('trigger.connect', {
          host: state.host,
          port: state.port,
          password: passwordInput.value || undefined
        });
        API.setState({ host: state.host, port: state.port });
      }

      function disconnect() {
        haptic('medium');
        API.emitOutput('trigger.disconnect', {});
        state.status = 'disconnected';
        state.scenes = [];
        state.currentScene = null;
        updateUI();
      }

      function switchScene(sceneName) {
        API.emitOutput('scene.switch', sceneName);
        state.currentScene = sceneName;
        updateUI();
      }

      function toggleStream() {
        haptic('medium');
        if (state.isStreaming) {
          API.emitOutput('stream.stop', {});
        } else {
          API.emitOutput('stream.start', {});
        }
      }

      function toggleRecord() {
        haptic('medium');
        if (state.isRecording) {
          API.emitOutput('record.stop', {});
        } else {
          API.emitOutput('record.start', {});
        }
      }

      // Event handlers
      connectBtn.addEventListener('click', connect);
      disconnectBtn.addEventListener('click', disconnect);
      streamBtn.addEventListener('click', toggleStream);
      recordBtn.addEventListener('click', toggleRecord);

      // Widget API handlers
      API.onMount(function(context) {
        const savedState = context.state || {};
        if (savedState.host) hostInput.value = savedState.host;
        if (savedState.port) portInput.value = savedState.port;
        updateUI();
        API.log('OBSControlWidget mounted');
      });

      // Handle OBS events from EventBus
      API.on('obs:scene-changed', function(event) {
        state.currentScene = event.payload?.sceneName;
        updateUI();
        API.emitOutput('scene.changed', state.currentScene);
      });

      API.on('obs:stream-started', function() {
        state.isStreaming = true;
        updateUI();
        haptic('success');
        API.emitOutput('stream.started', {});
      });

      API.on('obs:stream-stopped', function() {
        state.isStreaming = false;
        updateUI();
        API.emitOutput('stream.stopped', {});
      });

      // Handle inputs from pipelines
      API.onInput('trigger.connect', connect);
      API.onInput('trigger.disconnect', disconnect);
      API.onInput('scene.switch', function(sceneName) {
        switchScene(sceneName);
      });

      // Handle state updates from store (connection status, scenes, etc.)
      API.onStateChange(function(newState) {
        if (newState.status !== undefined) state.status = newState.status;
        if (newState.scenes !== undefined) state.scenes = newState.scenes;
        if (newState.currentScene !== undefined) state.currentScene = newState.currentScene;
        if (newState.isStreaming !== undefined) state.isStreaming = newState.isStreaming;
        if (newState.isRecording !== undefined) state.isRecording = newState.isRecording;
        updateUI();
      });

      API.onDestroy(function() {
        API.log('OBSControlWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const OBSControlWidget: BuiltinWidget = {
  manifest: OBSControlWidgetManifest,
  html: OBSControlWidgetHTML,
};
