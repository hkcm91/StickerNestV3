/**
 * StickerNest v2 - Collaborator List Widget
 * Displays collaborators in current session with presence status
 * Shows role badges, activity indicators, and quick actions
 * Mobile-optimized with 48px touch targets
 */

import type { BuiltinWidget } from './index';
import type { WidgetManifest } from '../../types/manifest';

// ==================
// Manifest
// ==================

const manifest: WidgetManifest = {
  id: 'stickernest.collaborator-list',
  name: 'Collaborators',
  version: '1.0.0',
  description: 'See who is in the session and their activity',
  author: 'StickerNest',
  category: 'collaboration',
  tags: ['collab', 'users', 'presence', 'team', 'participants'],
  icon: 'users',

  // Sizing
  defaultSize: { width: 260, height: 350 },
  minSize: { width: 200, height: 150 },
  maxSize: { width: 400, height: 600 },

  // Pipeline ports
  inputs: [
    {
      id: 'collaborators',
      name: 'Collaborators',
      type: 'array',
      description: 'List of collaborators in session',
    },
    {
      id: 'localUserId',
      name: 'Local User ID',
      type: 'string',
      description: 'Current user ID for highlighting',
    },
  ],
  outputs: [
    {
      id: 'follow',
      name: 'Follow User',
      type: 'event',
      description: 'Emitted when user clicks to follow',
    },
    {
      id: 'invite',
      name: 'Invite',
      type: 'event',
      description: 'Emitted when invite button clicked',
    },
    {
      id: 'kick',
      name: 'Kick User',
      type: 'event',
      description: 'Emitted when kick action triggered',
    },
    {
      id: 'roleChange',
      name: 'Role Changed',
      type: 'event',
      description: 'Emitted when role is changed',
    },
  ],

  // Settings
  settings: [
    {
      id: 'showAvatars',
      name: 'Show Avatars',
      type: 'boolean',
      default: true,
    },
    {
      id: 'showRoles',
      name: 'Show Roles',
      type: 'boolean',
      default: true,
    },
    {
      id: 'showActivity',
      name: 'Show Activity',
      type: 'boolean',
      default: true,
    },
    {
      id: 'allowInvite',
      name: 'Allow Invite',
      type: 'boolean',
      default: true,
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
  <title>Collaborators</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-hover: #1e2a4a;
      --text-primary: #eee;
      --text-secondary: #888;
      --accent: #4ecdc4;
      --accent-hover: #45b7aa;
      --success: #2ecc71;
      --warning: #f1c40f;
      --danger: #e74c3c;
      --owner-badge: #9b59b6;
      --editor-badge: #3498db;
      --viewer-badge: #95a5a6;
      --border: rgba(255,255,255,0.08);
      --radius: 10px;
      --transition: 150ms ease;
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
      margin-bottom: 16px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
    }

    .title-icon {
      width: 18px;
      height: 18px;
      fill: var(--accent);
    }

    .online-count {
      background: var(--success);
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Invite Button */
    .invite-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition);
      min-height: 36px;
    }

    .invite-btn:hover {
      background: var(--accent-hover);
    }

    .invite-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }

    /* User List */
    .user-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* User Card */
    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--bg-secondary);
      border-radius: var(--radius);
      cursor: pointer;
      transition: all var(--transition);
      position: relative;
      min-height: 56px;
    }

    .user-card:hover {
      background: var(--bg-hover);
    }

    .user-card.local {
      border-left: 3px solid var(--accent);
    }

    .user-card.idle {
      opacity: 0.6;
    }

    /* Avatar */
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
      color: white;
      flex-shrink: 0;
      position: relative;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .status-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--bg-secondary);
    }

    .status-dot.online { background: var(--success); }
    .status-dot.idle { background: var(--warning); }
    .status-dot.offline { background: var(--text-secondary); }

    /* User Info */
    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .you-badge {
      font-size: 10px;
      color: var(--accent);
      font-weight: 400;
    }

    .user-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }

    /* Role Badge */
    .role-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .role-badge.owner {
      background: var(--owner-badge);
      color: white;
    }

    .role-badge.editor {
      background: var(--editor-badge);
      color: white;
    }

    .role-badge.viewer {
      background: var(--viewer-badge);
      color: white;
    }

    /* Activity */
    .activity {
      font-size: 11px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .activity-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
      animation: pulse 2s infinite;
    }

    /* Device Icon */
    .device-icon {
      width: 14px;
      height: 14px;
      fill: var(--text-secondary);
    }

    /* Actions */
    .actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity var(--transition);
    }

    .user-card:hover .actions {
      opacity: 1;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition);
    }

    .action-btn:hover {
      background: var(--bg-primary);
    }

    .action-btn svg {
      width: 16px;
      height: 16px;
      fill: var(--text-secondary);
    }

    .action-btn:hover svg {
      fill: var(--text-primary);
    }

    .action-btn.danger:hover svg {
      fill: var(--danger);
    }

    .action-btn.follow:hover svg {
      fill: var(--accent);
    }

    /* Connection Quality */
    .connection-quality {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: flex-end;
      gap: 1px;
    }

    .connection-bar {
      width: 3px;
      background: var(--text-secondary);
      border-radius: 1px;
    }

    .connection-bar:nth-child(1) { height: 4px; }
    .connection-bar:nth-child(2) { height: 8px; }
    .connection-bar:nth-child(3) { height: 12px; }
    .connection-bar:nth-child(4) { height: 16px; }

    .connection-quality.excellent .connection-bar { background: var(--success); }
    .connection-quality.good .connection-bar:nth-child(-n+3) { background: var(--success); }
    .connection-quality.poor .connection-bar:nth-child(-n+2) { background: var(--warning); }
    .connection-quality.disconnected .connection-bar:nth-child(1) { background: var(--danger); }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      text-align: center;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      fill: var(--text-secondary);
      margin-bottom: 16px;
    }

    .empty-text {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    /* Role Menu (dropdown) */
    .role-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--bg-secondary);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      padding: 4px;
      z-index: 100;
      min-width: 120px;
      display: none;
    }

    .role-menu.show {
      display: block;
      animation: fadeIn 150ms ease;
    }

    .role-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: background var(--transition);
    }

    .role-option:hover {
      background: var(--bg-hover);
    }

    .role-option .check {
      width: 14px;
      height: 14px;
      fill: var(--accent);
      opacity: 0;
    }

    .role-option.selected .check {
      opacity: 1;
    }

    /* Animations */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Touch targets */
    @media (pointer: coarse) {
      .user-card {
        min-height: 64px;
        padding: 12px 14px;
      }

      .action-btn {
        width: 44px;
        height: 44px;
      }

      .actions {
        opacity: 1;
      }

      .invite-btn {
        min-height: 44px;
        padding: 10px 16px;
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
        <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z"/>
      </svg>
      <span>Collaborators</span>
      <span class="online-count" id="onlineCount">0</span>
    </div>
    <button class="invite-btn" id="inviteBtn" onclick="handleInvite()">
      <svg viewBox="0 0 24 24">
        <path d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C12.79 4 11 5.79 11 8C11 10.21 12.79 12 15 12ZM6 10V7H4V10H1V12H4V15H6V12H9V10H6ZM15 14C12.33 14 7 15.34 7 18V20H23V18C23 15.34 17.67 14 15 14Z"/>
      </svg>
      <span>Invite</span>
    </button>
  </div>

  <div class="user-list" id="userList">
    <div class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24">
        <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13Z"/>
      </svg>
      <p class="empty-text">No one else is here yet</p>
      <button class="invite-btn" onclick="handleInvite()">
        <svg viewBox="0 0 24 24">
          <path d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C12.79 4 11 5.79 11 8C11 10.21 12.79 12 15 12ZM6 10V7H4V10H1V12H4V15H6V12H9V10H6ZM15 14C12.33 14 7 15.34 7 18V20H23V18C23 15.34 17.67 14 15 14Z"/>
        </svg>
        <span>Invite Someone</span>
      </button>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // Haptic feedback helper
      function haptic(type) {
        if (navigator.vibrate) {
          const patterns = { light: [10], medium: [20], heavy: [50] };
          navigator.vibrate(patterns[type] || patterns.light);
        }
      }

      // State
      let state = {
        collaborators: [],
        localUserId: null,
        isOwner: false,
        settings: {
          showAvatars: true,
          showRoles: true,
          showActivity: true,
          allowInvite: true
        }
      };

      // DOM
      const userList = document.getElementById('userList');
      const onlineCount = document.getElementById('onlineCount');
      const inviteBtn = document.getElementById('inviteBtn');

      // Widget API handlers
      API.onMount(function(context) {
        const savedState = context.state || {};
        if (savedState.collaborators) state.collaborators = savedState.collaborators;
        if (savedState.localUserId) state.localUserId = savedState.localUserId;
        render();
        API.log('CollaboratorListWidget mounted');
      });

      API.onInput('collaborators', function(collaborators) {
        state.collaborators = collaborators || [];
        render();
      });

      API.onInput('localUserId', function(userId) {
        state.localUserId = userId;
        render();
      });

      API.onSettingsChange(function(settings) {
        state.settings = { ...state.settings, ...settings };
        render();
      });

      // Get activity text
      function getActivityText(user) {
        if (!user.isActive) return 'Idle';
        if (user.currentCanvasId) return 'Viewing canvas';
        return 'Active';
      }

      // Render user list
      function render() {
        const { collaborators, localUserId, settings } = state;
        const onlineUsers = collaborators.filter(function(u) { return u.connectionQuality !== 'disconnected'; });
        onlineCount.textContent = onlineUsers.length;
        inviteBtn.style.display = settings.allowInvite ? 'flex' : 'none';

        const localUser = collaborators.find(function(u) { return u.id === localUserId; });
        state.isOwner = localUser && localUser.role === 'owner';

        if (collaborators.length === 0) {
          userList.innerHTML = '<div class="empty-state"><svg class="empty-icon" viewBox="0 0 24 24"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13Z"/></svg><p class="empty-text">No one else is here yet</p>' + (settings.allowInvite ? '<button class="invite-btn" onclick="handleInvite()"><svg viewBox="0 0 24 24"><path d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C12.79 4 11 5.79 11 8C11 10.21 12.79 12 15 12ZM6 10V7H4V10H1V12H4V15H6V12H9V10H6ZM15 14C12.33 14 7 15.34 7 18V20H23V18C23 15.34 17.67 14 15 14Z"/></svg><span>Invite Someone</span></button>' : '') + '</div>';
          return;
        }

        const sorted = collaborators.slice().sort(function(a, b) {
          if (a.role === 'owner') return -1;
          if (b.role === 'owner') return 1;
          return a.displayName.localeCompare(b.displayName);
        });

        userList.innerHTML = sorted.map(function(user) {
          const isLocal = user.id === localUserId;
          const isIdle = !user.isActive;
          const status = user.connectionQuality === 'disconnected' ? 'offline' : (isIdle ? 'idle' : 'online');
          let html = '<div class="user-card ' + (isLocal ? 'local ' : '') + (isIdle ? 'idle' : '') + '" data-user-id="' + user.id + '">';
          if (settings.showAvatars) {
            html += '<div class="avatar" style="background:' + user.color + '">' + (user.avatarUrl ? '<img src="' + user.avatarUrl + '" alt="">' : user.displayName.charAt(0).toUpperCase()) + '<div class="status-dot ' + status + '"></div></div>';
          }
          html += '<div class="user-info"><div class="user-name">' + user.displayName + (isLocal ? ' <span class="you-badge">(you)</span>' : '') + '</div><div class="user-meta">';
          if (settings.showRoles) html += '<span class="role-badge ' + user.role + '">' + user.role + '</span>';
          if (settings.showActivity) html += '<span class="activity">' + (user.isActive ? '<span class="activity-dot"></span>' : '') + getActivityText(user) + '</span>';
          html += '</div></div>';
          html += '<div class="connection-quality ' + user.connectionQuality + '"><div class="connection-bar"></div><div class="connection-bar"></div><div class="connection-bar"></div><div class="connection-bar"></div></div>';
          if (!isLocal) {
            html += '<div class="actions"><button class="action-btn follow" onclick="event.stopPropagation();followUser(\\'' + user.id + '\\')" title="Follow"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5S21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12S9.24 7 12 7 17 9.24 17 12 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12S10.34 15 12 15 15 13.66 15 12 13.66 9 12 9Z"/></svg></button>';
            if (state.isOwner) {
              html += '<button class="action-btn" onclick="event.stopPropagation();showRoleMenu(\\'' + user.id + '\\')" title="Change Role"><svg viewBox="0 0 24 24"><path d="M12 8C13.1 8 14 7.1 14 6S13.1 4 12 4 10 4.9 10 6 10.9 8 12 8ZM12 10C10.9 10 10 10.9 10 12S10.9 14 12 14 14 13.1 14 12 13.1 10 12 10ZM12 16C10.9 16 10 16.9 10 18S10.9 20 12 20 14 19.1 14 18 13.1 16 12 16Z"/></svg></button>';
              html += '<button class="action-btn danger" onclick="event.stopPropagation();kickUser(\\'' + user.id + '\\')" title="Remove"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/></svg></button>';
            }
            html += '</div>';
          }
          html += '</div>';
          return html;
        }).join('');
      }

      // Handlers
      function handleInvite() {
        haptic('light');
        API.emitOutput('invite', {});
      }
      window.handleInvite = handleInvite;

      function followUser(userId) {
        haptic('medium');
        API.emitOutput('follow', { userId });
      }
      window.followUser = followUser;

      function kickUser(userId) {
        if (confirm('Remove this user from the session?')) {
          haptic('heavy');
          API.emitOutput('kick', { userId });
        }
      }
      window.kickUser = kickUser;

      function showRoleMenu(userId) {
        haptic('light');
        const user = state.collaborators.find(u => u.id === userId);
        const newRole = prompt('Change role for ' + (user?.displayName || '') + '\\nCurrent: ' + (user?.role || '') + '\\nEnter: owner, editor, or viewer');
        if (newRole && ['owner', 'editor', 'viewer'].includes(newRole.toLowerCase())) {
          API.emitOutput('roleChange', { userId, role: newRole.toLowerCase() });
        }
      }
      window.showRoleMenu = showRoleMenu;

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

export const CollaboratorListWidget: BuiltinWidget = {
  manifest,
  html,
};

export default CollaboratorListWidget;
