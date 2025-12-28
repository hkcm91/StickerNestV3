/**
 * StickerNest v2 - User Card Widget
 * ===================================
 *
 * A compact social widget that displays a user's profile card.
 * Shows avatar, username, bio, follower counts, and follow button.
 * Part of the "hidden" social media layer.
 *
 * ## Features
 * - Display user profile information
 * - Follow/unfollow button
 * - Online status indicator
 * - Follower/following counts
 * - Click to view full profile
 *
 * ## Pipeline Integration
 *
 * Inputs:
 * - user.set: Set user ID to display
 * - data.set: Set full user data object
 *
 * Outputs:
 * - follow.toggled: Emitted when follow button clicked
 * - profile.clicked: Emitted when card clicked to view profile
 * - message.clicked: Emitted when message button clicked
 *
 * ## Event Listening
 *
 * Listens for:
 * - social:online-status-changed: User online/offline status
 * - social:follow-new: Someone followed this user
 *
 * @see SocialEventBridge - Events are routed through this
 * @see useSocialStore - For relationship state
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const UserCardWidgetManifest: WidgetManifest = {
  id: 'stickernest.user-card',
  name: 'User Card',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Display a user profile card with follow button and stats.',
  author: 'StickerNest',
  tags: ['social', 'profile', 'user', 'card', 'community'],
  inputs: {
    userId: {
      type: 'string',
      description: 'User ID to display',
      default: '',
    },
    showFollowButton: {
      type: 'boolean',
      description: 'Whether to show the follow button',
      default: true,
    },
    compact: {
      type: 'boolean',
      description: 'Use compact layout',
      default: false,
    },
  },
  outputs: {
    followToggled: {
      type: 'object',
      description: 'Emitted when follow button clicked { userId, isFollowing }',
    },
    profileClicked: {
      type: 'object',
      description: 'Emitted when profile clicked { userId, username }',
    },
    messageClicked: {
      type: 'object',
      description: 'Emitted when message button clicked { userId }',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['user.set', 'data.set'],
    outputs: ['follow.toggled', 'profile.clicked', 'message.clicked'],
  },
  events: {
    listens: ['social:online-status-changed', 'social:follow-new', 'social:unfollow'],
    emits: [],
  },
  size: {
    width: 280,
    height: 160,
    minWidth: 220,
    minHeight: 120,
    scaleMode: 'stretch',
  },
};

export const UserCardWidgetHTML = `
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
      background: var(--sn-bg-secondary, #1a1a2e);
      color: var(--sn-text-primary, #e2e8f0);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .container:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    .cover {
      height: 48px;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%);
      position: relative;
    }
    .content {
      flex: 1;
      padding: 0 16px 16px;
      display: flex;
      flex-direction: column;
    }
    .avatar-row {
      display: flex;
      align-items: flex-end;
      margin-top: -28px;
      margin-bottom: 8px;
    }
    .avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--sn-bg-tertiary, #252538);
      border: 3px solid var(--sn-bg-secondary, #1a1a2e);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 600;
      color: var(--sn-accent-primary, #8b5cf6);
      overflow: hidden;
      position: relative;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .online-indicator {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #22c55e;
      border: 2px solid var(--sn-bg-secondary, #1a1a2e);
      display: none;
    }
    .online-indicator.online {
      display: block;
    }
    .actions {
      margin-left: auto;
      display: flex;
      gap: 8px;
    }
    .action-btn {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .follow-btn {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .follow-btn:hover {
      background: #7c3aed;
    }
    .follow-btn.following {
      background: transparent;
      border: 1px solid var(--sn-accent-primary, #8b5cf6);
      color: var(--sn-accent-primary, #8b5cf6);
    }
    .follow-btn.following:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: #ef4444;
      color: #ef4444;
    }
    .message-btn {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-secondary, #94a3b8);
      padding: 6px 10px;
    }
    .message-btn:hover {
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .message-btn svg {
      width: 14px;
      height: 14px;
    }
    .user-info {
      margin-bottom: 8px;
    }
    .username {
      font-weight: 600;
      font-size: 15px;
      color: var(--sn-text-primary, #e2e8f0);
      margin-bottom: 2px;
    }
    .bio {
      font-size: 12px;
      color: var(--sn-text-secondary, #94a3b8);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .stats {
      display: flex;
      gap: 16px;
      margin-top: auto;
    }
    .stat {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .stat-value {
      font-weight: 600;
      font-size: 14px;
      color: var(--sn-text-primary, #e2e8f0);
    }
    .stat-label {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
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
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 13px;
    }
    .empty-state svg {
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    /* Compact mode */
    .container.compact {
      flex-direction: row;
      padding: 12px;
    }
    .container.compact .cover {
      display: none;
    }
    .container.compact .content {
      flex-direction: row;
      align-items: center;
      padding: 0;
      margin-top: 0;
    }
    .container.compact .avatar-row {
      margin: 0;
      margin-right: 12px;
    }
    .container.compact .avatar {
      width: 44px;
      height: 44px;
      font-size: 16px;
      border: none;
    }
    .container.compact .user-info {
      flex: 1;
      margin-bottom: 0;
    }
    .container.compact .stats {
      display: none;
    }
    .container.compact .actions {
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="cover"></div>
    <div class="content">
      <div class="avatar-row">
        <div class="avatar" id="avatar">
          <span id="initials">?</span>
          <div class="online-indicator" id="onlineIndicator"></div>
        </div>
        <div class="actions">
          <button class="action-btn message-btn" id="messageBtn" title="Send message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button class="action-btn follow-btn" id="followBtn">Follow</button>
        </div>
      </div>
      <div class="user-info">
        <div class="username" id="username">Loading...</div>
        <div class="bio" id="bio"></div>
      </div>
      <div class="stats">
        <div class="stat">
          <span class="stat-value" id="followersCount">0</span>
          <span class="stat-label">followers</span>
        </div>
        <div class="stat">
          <span class="stat-value" id="followingCount">0</span>
          <span class="stat-label">following</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        userId: '',
        username: '',
        avatarUrl: null,
        bio: '',
        followers: 0,
        following: 0,
        isFollowing: false,
        isOnline: false,
        showFollowButton: true,
        compact: false
      };

      // Elements
      const container = document.getElementById('container');
      const avatar = document.getElementById('avatar');
      const initials = document.getElementById('initials');
      const onlineIndicator = document.getElementById('onlineIndicator');
      const username = document.getElementById('username');
      const bio = document.getElementById('bio');
      const followersCount = document.getElementById('followersCount');
      const followingCount = document.getElementById('followingCount');
      const followBtn = document.getElementById('followBtn');
      const messageBtn = document.getElementById('messageBtn');

      // Utility: Get initials
      function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }

      // Format number
      function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
      }

      // Render user card
      function render() {
        // Compact mode
        container.classList.toggle('compact', state.compact);

        // Avatar
        if (state.avatarUrl) {
          initials.innerHTML = '<img src="' + state.avatarUrl + '" alt="" />';
        } else {
          initials.textContent = state.username ? getInitials(state.username) : '?';
        }

        // Online indicator
        onlineIndicator.classList.toggle('online', state.isOnline);

        // User info
        username.textContent = state.username || 'Unknown User';
        bio.textContent = state.bio || '';
        bio.style.display = state.bio ? 'block' : 'none';

        // Stats
        followersCount.textContent = formatNumber(state.followers);
        followingCount.textContent = formatNumber(state.following);

        // Follow button
        if (state.showFollowButton) {
          followBtn.style.display = 'block';
          followBtn.classList.toggle('following', state.isFollowing);
          followBtn.textContent = state.isFollowing ? 'Following' : 'Follow';
        } else {
          followBtn.style.display = 'none';
        }
      }

      // Handle profile click
      container.addEventListener('click', (e) => {
        // Don't trigger if clicking buttons
        if (e.target.closest('.action-btn')) return;

        API.emitOutput('profile.clicked', {
          userId: state.userId,
          username: state.username
        });
      });

      // Handle follow click
      followBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        state.isFollowing = !state.isFollowing;

        // Optimistic update
        if (state.isFollowing) {
          state.followers++;
        } else {
          state.followers = Math.max(0, state.followers - 1);
        }

        render();

        API.emitOutput('follow.toggled', {
          userId: state.userId,
          isFollowing: state.isFollowing
        });

        API.setState({ isFollowing: state.isFollowing });
      });

      // Handle message click
      messageBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        API.emitOutput('message.clicked', {
          userId: state.userId,
          username: state.username
        });
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('UserCardWidget mounted for user: ' + state.userId);
      });

      // Handle user.set input
      API.onInput('user.set', function(userId) {
        state.userId = userId;
        // Clear existing data - would fetch from API
        state.username = '';
        state.avatarUrl = null;
        state.bio = '';
        state.followers = 0;
        state.following = 0;
        state.isFollowing = false;
        state.isOnline = false;

        render();
        API.setState({ userId: state.userId });
        API.log('User set to: ' + userId);
      });

      // Handle data.set input (full user data)
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.userId = data.userId || data.id || state.userId;
          state.username = data.username || data.name || '';
          state.avatarUrl = data.avatarUrl || data.avatar_url || data.avatar || null;
          state.bio = data.bio || data.description || '';
          state.followers = data.followers || data.followerCount || 0;
          state.following = data.following || data.followingCount || 0;
          state.isFollowing = data.isFollowing || false;
          state.isOnline = data.isOnline || false;
          state.showFollowButton = data.showFollowButton !== false;
          state.compact = data.compact || false;
        }

        render();
        API.setState(state);
      });

      // Listen for online status changes
      API.on('social:online-status-changed', function(payload) {
        if (payload.userId === state.userId) {
          state.isOnline = payload.isOnline;
          render();
        }
      });

      // Listen for follow events
      API.on('social:follow-new', function(payload) {
        if (payload.followedId === state.userId) {
          state.followers++;
          render();
        }
      });

      API.on('social:unfollow', function(payload) {
        if (payload.followedId === state.userId) {
          state.followers = Math.max(0, state.followers - 1);
          render();
        }
      });

      API.onDestroy(function() {
        API.log('UserCardWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const UserCardWidget: BuiltinWidget = {
  manifest: UserCardWidgetManifest,
  html: UserCardWidgetHTML,
};
