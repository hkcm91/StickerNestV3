/**
 * StickerNest v2 - Presence Widget
 * ==================================
 *
 * A real-time widget that shows who is currently viewing or editing the canvas.
 * Displays an avatar stack with online status, activity indicators, and cursor positions.
 * Part of the "hidden" social media layer.
 *
 * ## Features
 * - Avatar stack of active viewers
 * - Online/idle/away status indicators
 * - Friend highlighting
 * - Expandable viewer list
 * - Click to view user profile
 *
 * ## Pipeline Integration
 *
 * Inputs:
 * - canvas.set: Set canvas ID to monitor presence for
 *
 * Outputs:
 * - user.clicked: Emitted when user clicks on a viewer
 * - cursor.hovered: Emitted when hovering over a user (for cursor highlighting)
 *
 * ## Event Listening
 *
 * Listens for:
 * - social:presence-update: User presence changes
 * - social:online-status-changed: User online/offline
 * - presence:user-joined: User joined canvas
 * - presence:user-left: User left canvas
 *
 * @see PresenceManager - Source of presence data
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const PresenceWidgetManifest: WidgetManifest = {
  id: 'stickernest.presence',
  name: 'Who\'s Here',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Show who is currently viewing or editing the canvas in real-time.',
  author: 'StickerNest',
  tags: ['social', 'presence', 'collaboration', 'real-time', 'users'],
  inputs: {
    canvasId: {
      type: 'string',
      description: 'Canvas ID to monitor presence for',
      default: '',
    },
    maxVisible: {
      type: 'number',
      description: 'Maximum avatars to show before collapsing',
      default: 5,
    },
    showCursors: {
      type: 'boolean',
      description: 'Whether to emit cursor position events',
      default: true,
    },
  },
  outputs: {
    userClicked: {
      type: 'object',
      description: 'Emitted when a user avatar is clicked { userId, username }',
    },
    cursorHovered: {
      type: 'object',
      description: 'Emitted when hovering a user { userId, show: boolean }',
    },
    viewerCountChanged: {
      type: 'number',
      description: 'Emitted when viewer count changes',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['canvas.set', 'data.refresh'],
    outputs: ['user.clicked', 'cursor.hovered', 'count.changed'],
  },
  events: {
    listens: [
      'social:presence-update',
      'social:online-status-changed',
      'presence:user-joined',
      'presence:user-left',
      'social:friends-loaded'
    ],
    emits: [],
  },
  size: {
    width: 200,
    height: 60,
    minWidth: 120,
    minHeight: 48,
    scaleMode: 'stretch',
  },
};

export const PresenceWidgetHTML = `
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
      padding: 8px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 8px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      gap: 12px;
    }
    .avatar-stack {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--sn-bg-tertiary, #252538);
      border: 2px solid var(--sn-bg-secondary, #1a1a2e);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: var(--sn-accent-primary, #8b5cf6);
      margin-left: -10px;
      cursor: pointer;
      position: relative;
      transition: transform 0.2s, z-index 0.2s;
      overflow: hidden;
    }
    .avatar:first-child {
      margin-left: 0;
    }
    .avatar:hover {
      transform: scale(1.15);
      z-index: 10;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar.friend {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .status-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid var(--sn-bg-secondary, #1a1a2e);
    }
    .status-dot.online { background: #22c55e; }
    .status-dot.idle { background: #f59e0b; }
    .status-dot.away { background: #94a3b8; }
    .overflow-badge {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--sn-bg-tertiary, #252538);
      border: 2px solid var(--sn-bg-secondary, #1a1a2e);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      color: var(--sn-text-secondary, #94a3b8);
      margin-left: -10px;
      cursor: pointer;
    }
    .overflow-badge:hover {
      background: var(--sn-bg-primary, #0f0f19);
    }
    .info {
      flex: 1;
      min-width: 0;
    }
    .viewer-count {
      font-size: 13px;
      font-weight: 600;
      color: var(--sn-text-primary, #e2e8f0);
      white-space: nowrap;
    }
    .viewer-label {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .expand-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .expand-btn:hover {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .expand-btn svg {
      width: 16px;
      height: 16px;
    }
    .tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      margin-bottom: 4px;
      z-index: 100;
    }
    .avatar:hover .tooltip {
      opacity: 1;
    }
    .empty-state {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 12px;
    }
    .empty-state svg {
      width: 20px;
      height: 20px;
      opacity: 0.5;
    }

    /* Expanded dropdown */
    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 8px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 8px;
      padding: 8px;
      max-height: 200px;
      overflow-y: auto;
      display: none;
      z-index: 100;
    }
    .dropdown.open {
      display: block;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .dropdown-item:hover {
      background: var(--sn-bg-tertiary, #252538);
    }
    .dropdown-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--sn-bg-tertiary, #252538);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      color: var(--sn-accent-primary, #8b5cf6);
      position: relative;
      overflow: hidden;
    }
    .dropdown-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .dropdown-info {
      flex: 1;
    }
    .dropdown-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--sn-text-primary, #e2e8f0);
    }
    .dropdown-status {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="avatar-stack" id="avatarStack"></div>
    <div class="info" id="info">
      <div class="viewer-count" id="viewerCount">0</div>
      <div class="viewer-label">viewing</div>
    </div>
    <button class="expand-btn" id="expandBtn" title="Show all viewers">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
    <div class="dropdown" id="dropdown"></div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        canvasId: '',
        viewers: [],
        friendIds: new Set(),
        maxVisible: 5,
        expanded: false
      };

      // Elements
      const container = document.getElementById('container');
      const avatarStack = document.getElementById('avatarStack');
      const viewerCount = document.getElementById('viewerCount');
      const expandBtn = document.getElementById('expandBtn');
      const dropdown = document.getElementById('dropdown');

      // Utility: Get initials
      function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }

      // Render avatar stack
      function render() {
        avatarStack.innerHTML = '';
        dropdown.innerHTML = '';

        const count = state.viewers.length;
        viewerCount.textContent = count;

        if (count === 0) {
          avatarStack.innerHTML = \`
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Only you</span>
            </div>
          \`;
          return;
        }

        // Determine visible avatars
        const visible = state.viewers.slice(0, state.maxVisible);
        const overflow = count - state.maxVisible;

        // Add overflow badge if needed
        if (overflow > 0) {
          const badge = document.createElement('div');
          badge.className = 'overflow-badge';
          badge.textContent = '+' + overflow;
          badge.addEventListener('click', toggleDropdown);
          avatarStack.appendChild(badge);
        }

        // Add visible avatars (in reverse for stacking)
        [...visible].reverse().forEach(viewer => {
          const avatar = createAvatarElement(viewer);
          avatarStack.appendChild(avatar);
        });

        // Populate dropdown with all viewers
        state.viewers.forEach(viewer => {
          const item = createDropdownItem(viewer);
          dropdown.appendChild(item);
        });
      }

      // Create avatar element
      function createAvatarElement(viewer) {
        const div = document.createElement('div');
        div.className = 'avatar';
        if (state.friendIds.has(viewer.userId)) {
          div.className += ' friend';
        }

        const avatarContent = viewer.avatarUrl
          ? '<img src="' + viewer.avatarUrl + '" alt="" />'
          : getInitials(viewer.username || 'User');

        const statusClass = viewer.status || 'online';

        div.innerHTML = \`
          \${avatarContent}
          <div class="status-dot \${statusClass}"></div>
          <div class="tooltip">\${viewer.username || 'Anonymous'}</div>
        \`;

        div.addEventListener('click', () => handleUserClick(viewer));
        div.addEventListener('mouseenter', () => handleUserHover(viewer, true));
        div.addEventListener('mouseleave', () => handleUserHover(viewer, false));

        return div;
      }

      // Create dropdown item
      function createDropdownItem(viewer) {
        const div = document.createElement('div');
        div.className = 'dropdown-item';

        const avatarContent = viewer.avatarUrl
          ? '<img src="' + viewer.avatarUrl + '" alt="" />'
          : getInitials(viewer.username || 'User');

        const statusText = {
          online: 'Viewing now',
          idle: 'Idle',
          away: 'Away'
        }[viewer.status] || 'Viewing';

        div.innerHTML = \`
          <div class="dropdown-avatar">
            \${avatarContent}
            <div class="status-dot \${viewer.status || 'online'}" style="width:8px;height:8px;bottom:-1px;right:-1px;"></div>
          </div>
          <div class="dropdown-info">
            <div class="dropdown-name">\${viewer.username || 'Anonymous'}</div>
            <div class="dropdown-status">\${statusText}</div>
          </div>
        \`;

        div.addEventListener('click', () => {
          handleUserClick(viewer);
          toggleDropdown();
        });

        return div;
      }

      // Handle user click
      function handleUserClick(viewer) {
        API.emitOutput('user.clicked', {
          userId: viewer.userId,
          username: viewer.username
        });
      }

      // Handle user hover (for cursor highlighting)
      function handleUserHover(viewer, show) {
        API.emitOutput('cursor.hovered', {
          userId: viewer.userId,
          show: show
        });
      }

      // Toggle dropdown
      function toggleDropdown() {
        state.expanded = !state.expanded;
        dropdown.classList.toggle('open', state.expanded);
        expandBtn.querySelector('svg').style.transform = state.expanded ? 'rotate(180deg)' : '';
      }

      expandBtn.addEventListener('click', toggleDropdown);

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (state.expanded && !container.contains(e.target)) {
          state.expanded = false;
          dropdown.classList.remove('open');
          expandBtn.querySelector('svg').style.transform = '';
        }
      });

      // Add or update a viewer
      function upsertViewer(viewer) {
        const existing = state.viewers.findIndex(v => v.userId === viewer.userId);
        if (existing >= 0) {
          state.viewers[existing] = { ...state.viewers[existing], ...viewer };
        } else {
          state.viewers.push(viewer);
        }
        render();
        API.emitOutput('count.changed', state.viewers.length);
      }

      // Remove a viewer
      function removeViewer(userId) {
        state.viewers = state.viewers.filter(v => v.userId !== userId);
        render();
        API.emitOutput('count.changed', state.viewers.length);
      }

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        state.canvasId = saved.canvasId || '';
        state.viewers = saved.viewers || [];
        state.maxVisible = saved.maxVisible || 5;
        if (saved.friendIds) {
          state.friendIds = new Set(saved.friendIds);
        }
        render();
        API.log('PresenceWidget mounted for canvas: ' + state.canvasId);
      });

      // Handle canvas.set input
      API.onInput('canvas.set', function(canvasId) {
        state.canvasId = canvasId;
        state.viewers = [];
        render();
        API.setState({ canvasId: state.canvasId });
      });

      // Handle data.refresh
      API.onInput('data.refresh', function() {
        render();
      });

      // Handle viewers data (batch set)
      API.onInput('viewers.set', function(viewers) {
        state.viewers = viewers;
        render();
        API.emitOutput('count.changed', state.viewers.length);
      });

      // Listen for presence events
      API.on('presence:user-joined', function(payload) {
        if (!state.canvasId || payload.canvasId === state.canvasId) {
          upsertViewer({
            userId: payload.userId,
            username: payload.username || payload.userName || 'Anonymous',
            avatarUrl: payload.avatarUrl || payload.userAvatar,
            status: payload.status || 'online'
          });
        }
      });

      API.on('presence:user-left', function(payload) {
        if (!state.canvasId || payload.canvasId === state.canvasId) {
          removeViewer(payload.userId);
        }
      });

      API.on('social:presence-update', function(payload) {
        if (!state.canvasId || payload.canvasId === state.canvasId) {
          if (payload.status === 'offline') {
            removeViewer(payload.userId);
          } else {
            const existing = state.viewers.find(v => v.userId === payload.userId);
            if (existing) {
              existing.status = payload.status;
              render();
            }
          }
        }
      });

      API.on('social:online-status-changed', function(payload) {
        const viewer = state.viewers.find(v => v.userId === payload.userId);
        if (viewer) {
          viewer.status = payload.isOnline ? 'online' : 'away';
          render();
        }
      });

      API.on('social:friends-loaded', function(payload) {
        state.friendIds = new Set(payload.friendIds || []);
        render();
      });

      API.onDestroy(function() {
        API.log('PresenceWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const PresenceWidget: BuiltinWidget = {
  manifest: PresenceWidgetManifest,
  html: PresenceWidgetHTML,
};
