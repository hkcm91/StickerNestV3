/**
 * StickerNest v2 - View Switcher Widget
 * Allows switching between canvases in collaborative sessions
 * Shows who is viewing which canvas with live presence indicators
 * Mobile-optimized with 48px touch targets and swipe gestures
 */

import type { BuiltinWidget } from './index';
import type { WidgetManifest } from '../../types/manifest';

// ==================
// Manifest
// ==================

const manifest: WidgetManifest = {
  id: 'stickernest.view-switcher',
  name: 'View Switcher',
  version: '1.0.0',
  description: 'Switch between canvases and see who is viewing what',
  author: 'StickerNest',
  category: 'collaboration',
  tags: ['collab', 'views', 'canvas', 'switcher', 'presence'],
  icon: 'layers',

  // Sizing - designed for sidebar or floating panel
  defaultSize: { width: 280, height: 400 },
  minSize: { width: 200, height: 200 },
  maxSize: { width: 400, height: 800 },

  // Pipeline ports
  inputs: [
    {
      id: 'canvases',
      name: 'Canvas List',
      type: 'array',
      description: 'List of available canvases',
    },
    {
      id: 'activeCanvas',
      name: 'Active Canvas',
      type: 'string',
      description: 'Currently active canvas ID',
    },
  ],
  outputs: [
    {
      id: 'switch',
      name: 'Canvas Switched',
      type: 'event',
      description: 'Emitted when user switches canvas',
    },
    {
      id: 'follow',
      name: 'Follow User',
      type: 'event',
      description: 'Emitted when user starts following someone',
    },
  ],

  // Settings
  settings: [
    {
      id: 'showThumbnails',
      name: 'Show Thumbnails',
      type: 'boolean',
      default: true,
    },
    {
      id: 'showPresence',
      name: 'Show Presence',
      type: 'boolean',
      default: true,
    },
    {
      id: 'compactMode',
      name: 'Compact Mode',
      type: 'boolean',
      default: false,
    },
    {
      id: 'sortBy',
      name: 'Sort By',
      type: 'select',
      options: ['name', 'viewers', 'recent'],
      default: 'name',
    },
  ],

  permissions: ['storage', 'events'],
  sandboxed: true,
  protocolVersion: '3.0',
};

// ==================
// Widget HTML
// ==================

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>View Switcher</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eee;
      --text-secondary: #aaa;
      --accent: #4ecdc4;
      --accent-hover: #45b7aa;
      --border: rgba(255,255,255,0.1);
      --shadow: 0 4px 12px rgba(0,0,0,0.3);
      --radius: 12px;
      --transition: 200ms ease;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 12px;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }

    .title {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-icon {
      width: 20px;
      height: 20px;
      fill: var(--accent);
    }

    .view-count {
      font-size: 12px;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      padding: 2px 8px;
      border-radius: 10px;
    }

    /* Canvas List */
    .canvas-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      max-height: calc(100vh - 100px);
      padding-right: 4px;
    }

    .canvas-list::-webkit-scrollbar {
      width: 4px;
    }

    .canvas-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .canvas-list::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 2px;
    }

    /* Canvas Card */
    .canvas-card {
      background: var(--bg-secondary);
      border-radius: var(--radius);
      padding: 12px;
      cursor: pointer;
      transition: all var(--transition);
      border: 2px solid transparent;
      min-height: 48px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      touch-action: manipulation;
    }

    .canvas-card:hover {
      background: var(--bg-tertiary);
      transform: translateX(4px);
    }

    .canvas-card:active {
      transform: scale(0.98);
    }

    .canvas-card.active {
      border-color: var(--accent);
      background: var(--bg-tertiary);
    }

    .canvas-card.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 24px;
      background: var(--accent);
      border-radius: 0 4px 4px 0;
    }

    .canvas-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Thumbnail */
    .thumbnail {
      width: 48px;
      height: 36px;
      background: var(--bg-primary);
      border-radius: 6px;
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumbnail-placeholder {
      width: 20px;
      height: 20px;
      fill: var(--text-secondary);
    }

    .canvas-info {
      flex: 1;
      min-width: 0;
    }

    .canvas-name {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .canvas-meta {
      font-size: 11px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }

    /* Presence Dots */
    .presence-row {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .presence-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: white;
      cursor: pointer;
      transition: transform var(--transition);
      position: relative;
    }

    .presence-dot:hover {
      transform: scale(1.2);
      z-index: 10;
    }

    .presence-dot.active::after {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px solid currentColor;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .presence-overflow {
      font-size: 10px;
      color: var(--text-secondary);
      padding: 0 6px;
    }

    /* Follow Button */
    .follow-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all var(--transition);
    }

    .canvas-card:hover .follow-btn {
      opacity: 1;
    }

    .follow-btn:hover {
      background: var(--accent-hover);
      transform: translateY(-50%) scale(1.1);
    }

    .follow-btn svg {
      width: 16px;
      height: 16px;
      fill: white;
    }

    /* Compact Mode */
    .compact .canvas-card {
      padding: 8px 12px;
      flex-direction: row;
      align-items: center;
    }

    .compact .thumbnail {
      width: 32px;
      height: 24px;
    }

    .compact .presence-row {
      margin-left: auto;
    }

    .compact .canvas-meta {
      display: none;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      fill: var(--text-secondary);
      margin-bottom: 16px;
    }

    .empty-text {
      font-size: 14px;
      color: var(--text-secondary);
    }

    /* Following Banner */
    .following-banner {
      background: var(--accent);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      animation: slideIn 200ms ease;
    }

    .following-banner button {
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      color: white;
      cursor: pointer;
      font-size: 11px;
    }

    .following-banner button:hover {
      background: rgba(255,255,255,0.3);
    }

    /* Animations */
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Touch targets for mobile - 48px minimum */
    @media (pointer: coarse) {
      .canvas-card {
        min-height: 56px;
        padding: 14px;
      }

      .presence-dot {
        width: 32px;
        height: 32px;
        font-size: 12px;
      }

      .follow-btn {
        width: 44px;
        height: 44px;
        opacity: 1;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <svg class="title-icon" viewBox="0 0 24 24">
        <path d="M12 3L4 9V21H20V9L12 3M12 5.7L18 10.2V19H6V10.2L12 5.7M8 13H16V15H8V13M8 17H14V19H8V17"/>
      </svg>
      <span>Views</span>
    </div>
    <span class="view-count" id="viewCount">0 canvases</span>
  </div>

  <div id="followingBanner" class="following-banner" style="display: none;">
    <span>Following <strong id="followingName"></strong></span>
    <button onclick="stopFollowing()">Stop</button>
  </div>

  <div class="canvas-list" id="canvasList">
    <div class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24">
        <path d="M12 3L4 9V21H20V9L12 3Z"/>
      </svg>
      <p class="empty-text">No canvases available</p>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // Haptic feedback helper
      function haptic(type) {
        if (navigator.vibrate) {
          const patterns = { light: [10], medium: [20], heavy: [50], success: [10, 50, 10] };
          navigator.vibrate(patterns[type] || patterns.light);
        }
      }

      // State
      let state = {
        canvases: [],
        activeCanvasId: null,
        collaborators: new Map(),
        followingUserId: null,
        settings: {
          showThumbnails: true,
          showPresence: true,
          compactMode: false,
          sortBy: 'name'
        }
      };

      // DOM elements
      const canvasList = document.getElementById('canvasList');
      const viewCount = document.getElementById('viewCount');
      const followingBanner = document.getElementById('followingBanner');
      const followingName = document.getElementById('followingName');

      // Widget API handlers
      API.onMount(function(context) {
        const savedState = context.state || {};
        if (savedState.canvases) state.canvases = savedState.canvases;
        if (savedState.activeCanvasId) state.activeCanvasId = savedState.activeCanvasId;
        render();
        API.log('ViewSwitcherWidget mounted');
      });

      // Handle canvas list input
      API.onInput('canvases', function(canvases) {
        state.canvases = canvases || [];
        render();
      });

      // Handle active canvas input
      API.onInput('activeCanvas', function(canvasId) {
        state.activeCanvasId = canvasId;
        render();
      });

      // Handle settings changes
      API.onSettingsChange(function(settings) {
        state.settings = { ...state.settings, ...settings };
        render();
      });

      // Listen for collaboration events
      API.on('collab:presence', function(event) {
        if (event.payload?.collaborators) {
          state.collaborators = new Map(Object.entries(event.payload.collaborators));
          render();
        }
      });

      API.on('collab:following', function(event) {
        state.followingUserId = event.payload?.userId;
        updateFollowingBanner();
      });

      // Get viewers on a specific canvas
      function getViewersOnCanvas(canvasId) {
        const viewers = [];
        for (const [id, user] of state.collaborators) {
          if (user.currentCanvasId === canvasId) {
            viewers.push(user);
          }
        }
        return viewers;
      }

      // Get viewer count for a canvas
      function getViewerCount(canvasId) {
        return getViewersOnCanvas(canvasId).length;
      }

      // Render canvas list
      function render() {
        const { canvases, activeCanvasId, collaborators, settings } = state;
        viewCount.textContent = canvases.length + ' canvas' + (canvases.length !== 1 ? 'es' : '');

        if (canvases.length === 0) {
          canvasList.innerHTML = '<div class="empty-state"><svg class="empty-icon" viewBox="0 0 24 24"><path d="M12 3L4 9V21H20V9L12 3Z"/></svg><p class="empty-text">No canvases available</p></div>';
          return;
        }

        const sorted = [...canvases].sort((a, b) => {
          switch (settings.sortBy) {
            case 'viewers': return getViewerCount(b.id) - getViewerCount(a.id);
            case 'recent': return (b.lastModified || 0) - (a.lastModified || 0);
            default: return (a.name || '').localeCompare(b.name || '');
          }
        });

        canvasList.className = 'canvas-list ' + (settings.compactMode ? 'compact' : '');
        canvasList.innerHTML = sorted.map(function(canvas) {
          const isActive = canvas.id === activeCanvasId;
          const viewers = getViewersOnCanvas(canvas.id);
          let html = '<div class="canvas-card ' + (isActive ? 'active' : '') + '" data-canvas-id="' + canvas.id + '" onclick="switchCanvas(\\'' + canvas.id + '\\')" role="button" tabindex="0">';
          html += '<div class="canvas-header">';
          if (settings.showThumbnails) {
            html += '<div class="thumbnail">';
            html += canvas.thumbnail ? '<img src="' + canvas.thumbnail + '" alt="">' : '<svg class="thumbnail-placeholder" viewBox="0 0 24 24"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/></svg>';
            html += '</div>';
          }
          html += '<div class="canvas-info"><div class="canvas-name">' + (canvas.name || 'Untitled') + '</div>';
          html += '<div class="canvas-meta"><span>' + (canvas.widgetCount || 0) + ' widgets</span>';
          if (viewers.length > 0) html += '<span>' + viewers.length + ' viewing</span>';
          html += '</div></div></div>';
          if (settings.showPresence && viewers.length > 0) {
            html += '<div class="presence-row">';
            viewers.slice(0, 5).forEach(function(user) {
              html += '<div class="presence-dot ' + (user.isActive ? 'active' : '') + '" style="background:' + user.color + '" title="' + user.displayName + '" onclick="event.stopPropagation();followUser(\\'' + user.id + '\\')">' + user.displayName.charAt(0).toUpperCase() + '</div>';
            });
            if (viewers.length > 5) html += '<span class="presence-overflow">+' + (viewers.length - 5) + '</span>';
            html += '</div>';
          }
          html += '</div>';
          return html;
        }).join('');
      }

      // Switch to canvas
      function switchCanvas(canvasId) {
        if (canvasId === state.activeCanvasId) return;
        haptic('light');
        API.emitOutput('switch', { canvasId });
        state.activeCanvasId = canvasId;
        render();
      }
      // Make switchCanvas available globally for onclick
      window.switchCanvas = switchCanvas;

      // Follow a user
      function followUser(userId) {
        haptic('medium');
        API.emitOutput('follow', { userId });
        state.followingUserId = userId;
        updateFollowingBanner();
      }
      window.followUser = followUser;

      // Stop following
      function stopFollowing() {
        API.emitOutput('follow', { userId: null });
        state.followingUserId = null;
        updateFollowingBanner();
      }
      window.stopFollowing = stopFollowing;

      // Update following banner
      function updateFollowingBanner() {
        if (state.followingUserId) {
          const user = state.collaborators.get(state.followingUserId);
          if (user) {
            followingName.textContent = user.displayName;
            followingBanner.style.display = 'flex';
          }
        } else {
          followingBanner.style.display = 'none';
        }
      }

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const cards = document.querySelectorAll('.canvas-card');
          const current = document.activeElement;
          const idx = Array.from(cards).indexOf(current);
          if (e.key === 'ArrowDown' && idx < cards.length - 1) {
            cards[idx + 1].focus();
          } else if (e.key === 'ArrowUp' && idx > 0) {
            cards[idx - 1].focus();
          }
        } else if (e.key === 'Enter') {
          const canvasId = document.activeElement?.dataset?.canvasId;
          if (canvasId) switchCanvas(canvasId);
        }
      });

      // Touch swipe to switch
      let touchStartX = 0;
      canvasList.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });

      canvasList.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 100) {
          const currentIdx = state.canvases.findIndex(c => c.id === state.activeCanvasId);
          if (diff > 0 && currentIdx > 0) {
            switchCanvas(state.canvases[currentIdx - 1].id);
          } else if (diff < 0 && currentIdx < state.canvases.length - 1) {
            switchCanvas(state.canvases[currentIdx + 1].id);
          }
        }
      }, { passive: true });

      // Initial render
      render();
    })();
  </script>
</body>
</html>
`;

// ==================
// Export Widget
// ==================

export const ViewSwitcherWidget: BuiltinWidget = {
  manifest,
  html,
};

export default ViewSwitcherWidget;
