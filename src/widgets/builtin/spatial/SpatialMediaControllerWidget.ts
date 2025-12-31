/**
 * StickerNest - Spatial Media Controller Widget
 *
 * Controls multiple SpatialDisplay instances in VR/AR space.
 * Can target individual displays or broadcast to all displays.
 *
 * Features:
 * - Discover all active SpatialDisplays
 * - Control individual displays by ID
 * - Broadcast media to all displays
 * - Group displays by surface type
 * - Media library with presets
 * - Video playback controls
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const SpatialMediaControllerWidgetManifest: WidgetManifest = {
  id: 'stickernest.spatial-media-controller',
  name: 'Spatial Media Controller',
  version: '1.0.0',
  kind: 'control',
  entry: 'index.html',
  description: 'Control multiple spatial displays on walls, doors, windows, and more',
  author: 'StickerNest',
  tags: ['spatial', 'media', 'controller', 'vr', 'ar', 'display', 'video', 'green-screen'],
  inputs: {
    'display:register': {
      type: 'object',
      description: 'Register a new display { id, name, surfaceType }',
    },
    'display:unregister': {
      type: 'string',
      description: 'Unregister a display by ID',
    },
    'display:status': {
      type: 'object',
      description: 'Update display status { id, isPlaying, currentTime, duration }',
    },
  },
  outputs: {
    'media:load': {
      type: 'object',
      description: 'Load media on target { targetId, type, url }',
    },
    'media:play': {
      type: 'string',
      description: 'Play media on target display ID (or "all")',
    },
    'media:pause': {
      type: 'string',
      description: 'Pause media on target display ID (or "all")',
    },
    'media:stop': {
      type: 'string',
      description: 'Stop media on target display ID (or "all")',
    },
    'media:volume': {
      type: 'object',
      description: 'Set volume { targetId, volume }',
    },
    'media:seek': {
      type: 'object',
      description: 'Seek to time { targetId, time }',
    },
    'display:selected': {
      type: 'string',
      description: 'Currently selected display ID',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    supports3d: true,
  },
  io: {
    inputs: ['display:register', 'display:unregister', 'display:status'],
    outputs: ['media:load', 'media:play', 'media:pause', 'media:stop', 'media:volume', 'media:seek', 'display:selected'],
  },
  size: {
    width: 360,
    height: 480,
    minWidth: 300,
    minHeight: 400,
  },
};

export const SpatialMediaControllerWidgetHTML = `
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
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    .header {
      padding: 12px 16px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-icon { font-size: 20px; }
    .header-title {
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    }
    .display-count {
      font-size: 11px;
      background: var(--sn-accent-primary, #8b5cf6);
      padding: 2px 8px;
      border-radius: 10px;
    }

    /* Tabs */
    .tabs {
      display: flex;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .tab {
      flex: 1;
      padding: 10px;
      text-align: center;
      font-size: 12px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .tab:hover {
      background: rgba(139, 92, 246, 0.1);
    }
    .tab.active {
      color: var(--sn-accent-primary, #8b5cf6);
      border-bottom-color: var(--sn-accent-primary, #8b5cf6);
    }

    /* Content area */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }

    /* Display list */
    .display-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .display-item {
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .display-item:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .display-item.selected {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: rgba(139, 92, 246, 0.1);
    }
    .display-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .display-icon { font-size: 16px; }
    .display-name {
      font-size: 13px;
      font-weight: 500;
      flex: 1;
    }
    .display-surface {
      font-size: 10px;
      padding: 2px 6px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 4px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .display-status {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--sn-text-secondary, #94a3b8);
    }
    .status-dot.playing { background: var(--sn-success, #22c55e); }
    .status-dot.paused { background: var(--sn-warning, #f59e0b); }

    /* Media input */
    .media-input-group {
      margin-bottom: 16px;
    }
    .input-label {
      font-size: 12px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 6px;
      display: block;
    }
    .media-input {
      width: 100%;
      height: 40px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 8px;
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 13px;
      padding: 0 12px;
    }
    .media-input:focus {
      outline: none;
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .media-input::placeholder {
      color: var(--sn-text-secondary, #94a3b8);
    }

    /* Media type buttons */
    .media-types {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .media-type-btn {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 8px;
      background: var(--sn-bg-secondary, #1a1a2e);
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
    }
    .media-type-btn:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .media-type-btn.active {
      background: rgba(139, 92, 246, 0.2);
      border-color: var(--sn-accent-primary, #8b5cf6);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .media-type-icon { font-size: 20px; }

    /* Control buttons */
    .controls {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .control-btn {
      flex: 1;
      height: 44px;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .control-btn.primary {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .control-btn.primary:hover {
      background: var(--sn-accent-secondary, #7c3aed);
    }
    .control-btn.secondary {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .control-btn.secondary:hover {
      background: var(--sn-bg-primary, #0f0f19);
    }

    /* Presets */
    .presets-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .preset-item {
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    }
    .preset-item:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .preset-icon { font-size: 24px; margin-bottom: 4px; }
    .preset-name { font-size: 11px; color: var(--sn-text-secondary, #94a3b8); }

    /* Broadcast toggle */
    .broadcast-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .broadcast-label {
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toggle-switch {
      width: 44px;
      height: 24px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 12px;
      position: relative;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .toggle-switch.on {
      background: var(--sn-accent-primary, #8b5cf6);
    }
    .toggle-switch::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      top: 3px;
      left: 3px;
      transition: transform 0.2s ease;
    }
    .toggle-switch.on::after {
      transform: translateX(20px);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
    .empty-text { font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="header-icon">📺</span>
      <span class="header-title">Spatial Media Controller</span>
      <span class="display-count" id="displayCount">0</span>
    </div>

    <div class="tabs">
      <div class="tab active" data-tab="displays">Displays</div>
      <div class="tab" data-tab="media">Media</div>
      <div class="tab" data-tab="presets">Presets</div>
    </div>

    <div class="content">
      <!-- Displays Tab -->
      <div class="tab-content active" id="displaysTab">
        <div class="broadcast-toggle">
          <span class="broadcast-label">📡 Broadcast to All</span>
          <div class="toggle-switch" id="broadcastToggle"></div>
        </div>
        <div class="display-list" id="displayList">
          <div class="empty-state">
            <div class="empty-icon">📺</div>
            <div class="empty-text">No displays detected.<br>Place SpatialDisplay widgets on surfaces.</div>
          </div>
        </div>
      </div>

      <!-- Media Tab -->
      <div class="tab-content" id="mediaTab">
        <div class="media-types">
          <button class="media-type-btn active" data-type="video">
            <span class="media-type-icon">🎬</span>
            Video
          </button>
          <button class="media-type-btn" data-type="image">
            <span class="media-type-icon">🖼️</span>
            Image
          </button>
          <button class="media-type-btn" data-type="color">
            <span class="media-type-icon">🎨</span>
            Color
          </button>
        </div>

        <div class="media-input-group" id="urlInputGroup">
          <label class="input-label">Media URL</label>
          <input type="text" class="media-input" id="mediaUrl" placeholder="https://example.com/video.mp4">
        </div>

        <div class="media-input-group" id="colorInputGroup" style="display: none;">
          <label class="input-label">Display Color</label>
          <input type="color" class="media-input" id="mediaColor" value="#00FF00" style="height: 48px; padding: 4px;">
        </div>
      </div>

      <!-- Presets Tab -->
      <div class="tab-content" id="presetsTab">
        <div class="presets-grid" id="presetsList">
          <div class="preset-item" data-preset="green">
            <div class="preset-icon">🟢</div>
            <div class="preset-name">Green Screen</div>
          </div>
          <div class="preset-item" data-preset="blue">
            <div class="preset-icon">🔵</div>
            <div class="preset-name">Blue Screen</div>
          </div>
          <div class="preset-item" data-preset="black">
            <div class="preset-icon">⬛</div>
            <div class="preset-name">Blackout</div>
          </div>
          <div class="preset-item" data-preset="white">
            <div class="preset-icon">⬜</div>
            <div class="preset-name">Whiteout</div>
          </div>
          <div class="preset-item" data-preset="test-pattern">
            <div class="preset-icon">📊</div>
            <div class="preset-name">Test Pattern</div>
          </div>
          <div class="preset-item" data-preset="ambient">
            <div class="preset-icon">🌈</div>
            <div class="preset-name">Ambient</div>
          </div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button class="control-btn secondary" id="btnStop">⏹️</button>
      <button class="control-btn secondary" id="btnPause">⏸️</button>
      <button class="control-btn primary" id="btnPlay">▶️</button>
      <button class="control-btn secondary" id="btnLoad">📤</button>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        displays: {},          // id -> { id, name, surfaceType, isPlaying, currentTime, duration }
        selectedId: null,
        broadcastMode: false,
        mediaType: 'video',
        mediaUrl: '',
        mediaColor: '#00FF00',
      };

      // DOM
      const displayCount = document.getElementById('displayCount');
      const displayList = document.getElementById('displayList');
      const broadcastToggle = document.getElementById('broadcastToggle');
      const mediaUrl = document.getElementById('mediaUrl');
      const mediaColor = document.getElementById('mediaColor');
      const urlInputGroup = document.getElementById('urlInputGroup');
      const colorInputGroup = document.getElementById('colorInputGroup');

      const btnPlay = document.getElementById('btnPlay');
      const btnPause = document.getElementById('btnPause');
      const btnStop = document.getElementById('btnStop');
      const btnLoad = document.getElementById('btnLoad');

      // Presets
      const PRESETS = {
        'green': { type: 'color', color: '#00FF00' },
        'blue': { type: 'color', color: '#0000FF' },
        'black': { type: 'color', color: '#000000' },
        'white': { type: 'color', color: '#FFFFFF' },
        'test-pattern': { type: 'image', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f00" x="0" y="0" width="50" height="50"/><rect fill="#0f0" x="50" y="0" width="50" height="50"/><rect fill="#00f" x="0" y="50" width="50" height="50"/><rect fill="#ff0" x="50" y="50" width="50" height="50"/></svg>') },
        'ambient': { type: 'color', color: '#1a1a2e' },
      };

      // Surface type icons
      const SURFACE_ICONS = {
        wall: '🧱',
        door: '🚪',
        window: '🪟',
        ceiling: '⬆️',
        floor: '⬇️',
        table: '🪑',
        tv: '📺',
        frame: '🖼️',
        custom: '📐',
      };

      // Update UI
      function updateUI() {
        // Display count
        const count = Object.keys(state.displays).length;
        displayCount.textContent = count;

        // Broadcast toggle
        broadcastToggle.classList.toggle('on', state.broadcastMode);

        // Display list
        if (count === 0) {
          displayList.innerHTML = '<div class="empty-state"><div class="empty-icon">📺</div><div class="empty-text">No displays detected.<br>Place SpatialDisplay widgets on surfaces.</div></div>';
        } else {
          displayList.innerHTML = Object.values(state.displays).map(d => {
            const icon = SURFACE_ICONS[d.surfaceType] || '📺';
            const isSelected = d.id === state.selectedId && !state.broadcastMode;
            const statusClass = d.isPlaying ? 'playing' : 'paused';
            const statusText = d.isPlaying ? 'Playing' : 'Idle';

            return '<div class="display-item' + (isSelected ? ' selected' : '') + '" data-id="' + d.id + '">' +
              '<div class="display-header">' +
                '<span class="display-icon">' + icon + '</span>' +
                '<span class="display-name">' + (d.name || 'Display') + '</span>' +
                '<span class="display-surface">' + (d.surfaceType || 'floating') + '</span>' +
              '</div>' +
              '<div class="display-status">' +
                '<span class="status-dot ' + statusClass + '"></span>' +
                '<span>' + statusText + '</span>' +
              '</div>' +
            '</div>';
          }).join('');
        }

        // Media type UI
        urlInputGroup.style.display = state.mediaType !== 'color' ? 'block' : 'none';
        colorInputGroup.style.display = state.mediaType === 'color' ? 'block' : 'none';

        API.setState(state);
      }

      // Get target ID (selected or "all" for broadcast)
      function getTargetId() {
        return state.broadcastMode ? 'all' : state.selectedId;
      }

      // Emit media command
      function emitMediaCommand(command, payload) {
        const targetId = getTargetId();
        if (!targetId) {
          API.warn('No display selected');
          return;
        }

        API.emitOutput('media:' + command, typeof payload === 'object' ? { targetId, ...payload } : targetId);
        API.log('Media command:', command, targetId, payload);
      }

      // Tab switching
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
        });
      });

      // Media type switching
      document.querySelectorAll('.media-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.media-type-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.mediaType = btn.dataset.type;
          updateUI();
        });
      });

      // Display selection
      displayList.addEventListener('click', (e) => {
        const item = e.target.closest('.display-item');
        if (item) {
          state.selectedId = item.dataset.id;
          API.emitOutput('display:selected', state.selectedId);
          updateUI();
        }
      });

      // Broadcast toggle
      broadcastToggle.addEventListener('click', () => {
        state.broadcastMode = !state.broadcastMode;
        updateUI();
      });

      // Control buttons
      btnPlay.addEventListener('click', () => emitMediaCommand('play'));
      btnPause.addEventListener('click', () => emitMediaCommand('pause'));
      btnStop.addEventListener('click', () => emitMediaCommand('stop'));

      btnLoad.addEventListener('click', () => {
        const targetId = getTargetId();
        if (!targetId) {
          API.warn('No display selected');
          return;
        }

        let media;
        if (state.mediaType === 'color') {
          media = { type: 'color', color: mediaColor.value };
        } else {
          media = { type: state.mediaType, url: mediaUrl.value };
        }

        API.emitOutput('media:load', { targetId, ...media });
        API.log('Loading media:', media);
      });

      // Preset clicks
      document.getElementById('presetsList').addEventListener('click', (e) => {
        const item = e.target.closest('.preset-item');
        if (item) {
          const preset = PRESETS[item.dataset.preset];
          if (preset) {
            const targetId = getTargetId();
            if (!targetId) {
              API.warn('No display selected');
              return;
            }
            API.emitOutput('media:load', { targetId, ...preset });
            API.log('Applied preset:', item.dataset.preset);
          }
        }
      });

      // Media URL input
      mediaUrl.addEventListener('change', () => {
        state.mediaUrl = mediaUrl.value;
      });

      mediaColor.addEventListener('input', () => {
        state.mediaColor = mediaColor.value;
      });

      // API handlers
      API.onMount(function(context) {
        const savedState = context.state || {};
        Object.assign(state, savedState);
        mediaUrl.value = state.mediaUrl || '';
        mediaColor.value = state.mediaColor || '#00FF00';
        updateUI();
        API.log('SpatialMediaController mounted');

        // Check for existing displays
        if (window.__spatialDisplays) {
          for (const [id, display] of Object.entries(window.__spatialDisplays)) {
            const status = display.getStatus();
            state.displays[id] = {
              id,
              name: status.name,
              surfaceType: 'custom',
              isPlaying: status.isPlaying,
            };
          }
          updateUI();
        }
      });

      // Handle display registration
      API.onInput('display:register', function(display) {
        state.displays[display.id] = {
          id: display.id,
          name: display.name || 'Display',
          surfaceType: display.surfaceType || 'custom',
          isPlaying: false,
        };
        if (!state.selectedId) {
          state.selectedId = display.id;
        }
        updateUI();
        API.log('Display registered:', display.id);
      });

      API.onInput('display:unregister', function(displayId) {
        delete state.displays[displayId];
        if (state.selectedId === displayId) {
          state.selectedId = Object.keys(state.displays)[0] || null;
        }
        updateUI();
        API.log('Display unregistered:', displayId);
      });

      API.onInput('display:status', function(status) {
        if (state.displays[status.id]) {
          Object.assign(state.displays[status.id], status);
          updateUI();
        }
      });

      // Broadcast listener for display discovery
      API.onEvent('spatialDisplay:ready', function(data) {
        state.displays[data.id] = {
          id: data.id,
          name: data.name || 'Display',
          surfaceType: data.surfaceType || 'custom',
          isPlaying: false,
        };
        updateUI();
        API.log('Display discovered via broadcast:', data.id);
      });

    })();
  </script>
</body>
</html>
`;

export const SpatialMediaControllerWidget: BuiltinWidget = {
  manifest: SpatialMediaControllerWidgetManifest,
  html: SpatialMediaControllerWidgetHTML,
};
