/**
 * StickerNest v2 - Notification Widget
 * ======================================
 *
 * A real-time widget that displays a stream of notifications.
 * Shows follows, likes, comments, mentions, and system notifications.
 * Part of the "hidden" social media layer.
 *
 * ## Features
 * - Live notification stream
 * - Unread count badge
 * - Mark as read (single or all)
 * - Notification grouping
 * - Click to navigate to related content
 *
 * ## Pipeline Integration
 *
 * Outputs:
 * - notification.clicked: Emitted when a notification is clicked
 * - notification.dismissed: Emitted when notification is dismissed
 * - user.clicked: Emitted when actor avatar is clicked
 * - unread.changed: Emitted when unread count changes
 *
 * ## Event Listening
 *
 * Listens for:
 * - social:notification-new: New notification received
 * - social:notification-read: Notification marked as read
 *
 * @see useNotificationStore - For notification state
 * @see NotificationService - For API calls
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const NotificationWidgetManifest: WidgetManifest = {
  id: 'stickernest.notifications',
  name: 'Notifications',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Display a live stream of notifications with unread badge.',
  author: 'StickerNest',
  tags: ['social', 'notifications', 'real-time', 'alerts', 'updates'],
  inputs: {
    maxVisible: {
      type: 'number',
      description: 'Maximum notifications to display',
      default: 10,
    },
    showTypes: {
      type: 'array',
      description: 'Notification types to show (empty = all)',
      default: [],
    },
  },
  outputs: {
    notificationClicked: {
      type: 'object',
      description: 'Emitted when notification clicked { notification }',
    },
    notificationDismissed: {
      type: 'object',
      description: 'Emitted when notification dismissed { notificationId }',
    },
    userClicked: {
      type: 'object',
      description: 'Emitted when actor clicked { userId, username }',
    },
    unreadChanged: {
      type: 'number',
      description: 'Emitted when unread count changes',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['data.refresh', 'notifications.set'],
    outputs: ['notification.clicked', 'notification.dismissed', 'user.clicked', 'unread.changed'],
  },
  events: {
    listens: ['social:notification-new', 'social:notification-read'],
    emits: [],
  },
  size: {
    width: 320,
    height: 380,
    minWidth: 280,
    minHeight: 200,
    scaleMode: 'stretch',
  },
};

export const NotificationWidgetHTML = `
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
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-icon {
      width: 18px;
      height: 18px;
      opacity: 0.8;
    }
    .header-title {
      font-weight: 600;
      font-size: 14px;
    }
    .unread-badge {
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      min-width: 20px;
      text-align: center;
    }
    .unread-badge.hidden {
      display: none;
    }
    .mark-all-btn {
      background: none;
      border: none;
      color: var(--sn-accent-primary, #8b5cf6);
      font-size: 12px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .mark-all-btn:hover {
      background: var(--sn-bg-tertiary, #252538);
    }
    .mark-all-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .notification-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .notification {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 4px;
      background: var(--sn-bg-secondary, #1a1a2e);
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-16px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .notification:hover {
      background: var(--sn-bg-tertiary, #252538);
    }
    .notification.unread {
      border-left: 3px solid var(--sn-accent-primary, #8b5cf6);
    }
    .notification-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .notification-icon.follow { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .notification-icon.like { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .notification-icon.comment { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .notification-icon.mention { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
    .notification-icon.fork { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .notification-icon.system { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    .notification-icon svg {
      width: 20px;
      height: 20px;
    }
    .notification-content {
      flex: 1;
      min-width: 0;
    }
    .notification-text {
      font-size: 13px;
      line-height: 1.4;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 4px;
    }
    .notification-text strong {
      color: var(--sn-text-primary, #e2e8f0);
      font-weight: 600;
    }
    .notification-time {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      opacity: 0.7;
    }
    .notification-dismiss {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.2s;
    }
    .notification:hover .notification-dismiss {
      opacity: 1;
    }
    .notification-dismiss:hover {
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 24px;
      text-align: center;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }
    .empty-state p {
      font-size: 13px;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--sn-bg-tertiary, #252538);
      border-top-color: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="header-title">Notifications</span>
        <span class="unread-badge hidden" id="unreadBadge">0</span>
      </div>
      <button class="mark-all-btn" id="markAllBtn" disabled>Mark all read</button>
    </div>

    <div class="notification-list" id="notificationList">
      <div class="empty-state" id="emptyState">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <p>No notifications yet.<br>You're all caught up!</p>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        notifications: [],
        readIds: new Set(),
        maxVisible: 10
      };

      // Elements
      const notificationList = document.getElementById('notificationList');
      const emptyState = document.getElementById('emptyState');
      const unreadBadge = document.getElementById('unreadBadge');
      const markAllBtn = document.getElementById('markAllBtn');

      // Notification type icons
      const typeIcons = {
        follow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
        like: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
        comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        mention: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>',
        fork: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9M12 12v3"/></svg>',
        system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      };

      // Utility: Format time ago
      function timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        return new Date(timestamp).toLocaleDateString();
      }

      // Get notification message
      function getNotificationMessage(notification) {
        const actor = notification.profiles?.username || 'Someone';
        const object = notification.metadata?.title || notification.object_type || 'something';

        switch (notification.type) {
          case 'follow':
            return '<strong>' + escapeHtml(actor) + '</strong> started following you';
          case 'like':
            return '<strong>' + escapeHtml(actor) + '</strong> liked your <strong>' + escapeHtml(object) + '</strong>';
          case 'comment':
            return '<strong>' + escapeHtml(actor) + '</strong> commented on your <strong>' + escapeHtml(object) + '</strong>';
          case 'mention':
            return '<strong>' + escapeHtml(actor) + '</strong> mentioned you in a comment';
          case 'fork':
            return '<strong>' + escapeHtml(actor) + '</strong> forked your <strong>' + escapeHtml(object) + '</strong>';
          case 'system':
            return notification.message || 'System notification';
          default:
            return notification.message || 'New notification';
        }
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Calculate unread count
      function getUnreadCount() {
        return state.notifications.filter(n => !n.read_at && !state.readIds.has(n.id)).length;
      }

      // Render notifications
      function render() {
        const unreadCount = getUnreadCount();

        // Update badge
        unreadBadge.textContent = unreadCount;
        unreadBadge.classList.toggle('hidden', unreadCount === 0);
        markAllBtn.disabled = unreadCount === 0;

        // Emit unread count change
        API.emitOutput('unread.changed', unreadCount);

        if (state.notifications.length === 0) {
          emptyState.style.display = 'flex';
          return;
        }

        emptyState.style.display = 'none';

        // Clear and render
        Array.from(notificationList.children).forEach(child => {
          if (child.id !== 'emptyState') child.remove();
        });

        const visible = state.notifications.slice(0, state.maxVisible);

        visible.forEach(notification => {
          const el = createNotificationElement(notification);
          notificationList.appendChild(el);
        });
      }

      // Create notification element
      function createNotificationElement(notification) {
        const div = document.createElement('div');
        const isUnread = !notification.read_at && !state.readIds.has(notification.id);
        div.className = 'notification' + (isUnread ? ' unread' : '');
        div.dataset.id = notification.id;

        const type = notification.type || 'system';
        const icon = typeIcons[type] || typeIcons.system;
        const message = getNotificationMessage(notification);

        div.innerHTML = \`
          <div class="notification-icon \${type}">
            \${icon}
          </div>
          <div class="notification-content">
            <div class="notification-text">\${message}</div>
            <div class="notification-time">\${timeAgo(notification.created_at)}</div>
          </div>
          <button class="notification-dismiss" title="Dismiss">×</button>
        \`;

        // Main click handler
        div.addEventListener('click', (e) => {
          if (e.target.closest('.notification-dismiss')) return;
          handleNotificationClick(notification);
        });

        // Dismiss button
        div.querySelector('.notification-dismiss').addEventListener('click', (e) => {
          e.stopPropagation();
          handleDismiss(notification);
        });

        return div;
      }

      // Handle notification click
      function handleNotificationClick(notification) {
        // Mark as read
        if (!notification.read_at && !state.readIds.has(notification.id)) {
          state.readIds.add(notification.id);
          render();
        }

        API.emitOutput('notification.clicked', { notification });

        // Also emit user click if actor exists
        if (notification.actor_id && notification.profiles) {
          API.emitOutput('user.clicked', {
            userId: notification.actor_id,
            username: notification.profiles.username
          });
        }
      }

      // Handle dismiss
      function handleDismiss(notification) {
        state.notifications = state.notifications.filter(n => n.id !== notification.id);
        render();
        API.emitOutput('notification.dismissed', { notificationId: notification.id });
        API.setState({ notifications: state.notifications });
      }

      // Mark all as read
      markAllBtn.addEventListener('click', () => {
        state.notifications.forEach(n => {
          if (!n.read_at) {
            state.readIds.add(n.id);
          }
        });
        render();
        API.setState({ readIds: Array.from(state.readIds) });
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        state.notifications = saved.notifications || [];
        state.readIds = new Set(saved.readIds || []);
        state.maxVisible = saved.maxVisible || 10;
        render();
        API.log('NotificationWidget mounted');
      });

      // Handle notifications.set input
      API.onInput('notifications.set', function(notifications) {
        state.notifications = notifications;
        render();
        API.setState({ notifications: state.notifications });
      });

      // Handle data.refresh
      API.onInput('data.refresh', function() {
        render();
      });

      // Listen for new notifications
      API.on('social:notification-new', function(payload) {
        const notification = payload.notification;

        // Don't add duplicates
        if (!state.notifications.some(n => n.id === notification.id)) {
          state.notifications.unshift(notification);

          // Trim to max
          if (state.notifications.length > state.maxVisible * 2) {
            state.notifications = state.notifications.slice(0, state.maxVisible * 2);
          }

          render();
          API.setState({ notifications: state.notifications });
        }
      });

      // Listen for read events
      API.on('social:notification-read', function(payload) {
        if (payload.allRead) {
          state.notifications.forEach(n => state.readIds.add(n.id));
        } else if (payload.notificationId) {
          state.readIds.add(payload.notificationId);
        }
        render();
      });

      API.onDestroy(function() {
        API.log('NotificationWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const NotificationWidget: BuiltinWidget = {
  manifest: NotificationWidgetManifest,
  html: NotificationWidgetHTML,
};
