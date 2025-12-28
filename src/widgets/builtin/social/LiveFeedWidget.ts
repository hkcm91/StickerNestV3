/**
 * StickerNest v2 - Live Feed Widget
 * ===================================
 *
 * A social widget that displays a scrollable activity feed.
 * Shows activities like "published", "forked", "liked", "commented".
 * Part of the "hidden" social media layer.
 *
 * ## Features
 * - View global, user, or friends activity feed
 * - Infinite scroll pagination
 * - Real-time updates via social:activity-new events
 * - Click activities to view user profiles
 *
 * ## Pipeline Integration
 *
 * Inputs:
 * - feed.set: Set feed type (global, user, friends)
 * - user.set: Set user ID for user-specific feed
 * - data.refresh: Refresh the feed
 *
 * Outputs:
 * - activity.clicked: Emitted when user clicks an activity
 * - user.clicked: Emitted when user clicks on an actor's avatar
 * - object.clicked: Emitted when user clicks on the activity object
 *
 * ## Event Listening
 *
 * Listens for:
 * - social:activity-new: New activity posted
 *
 * @see SocialEventBridge - Events are routed through this
 * @see useFeedStore - For feed state management
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const LiveFeedWidgetManifest: WidgetManifest = {
  id: 'stickernest.live-feed',
  name: 'Live Feed',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Display a live activity feed showing what others are creating and sharing.',
  author: 'StickerNest',
  tags: ['social', 'feed', 'activity', 'community', 'timeline'],
  inputs: {
    feedType: {
      type: 'string',
      description: 'Type of feed: "global", "user", or "friends"',
      default: 'global',
    },
    userId: {
      type: 'string',
      description: 'User ID for user-specific feeds',
      default: '',
    },
    limit: {
      type: 'number',
      description: 'Number of activities to show',
      default: 20,
    },
  },
  outputs: {
    activityClicked: {
      type: 'object',
      description: 'Emitted when an activity is clicked { activity }',
    },
    userClicked: {
      type: 'object',
      description: 'Emitted when a user avatar is clicked { userId, username }',
    },
    objectClicked: {
      type: 'object',
      description: 'Emitted when activity object is clicked { objectType, objectId }',
    },
    loadMore: {
      type: 'trigger',
      description: 'Emitted when user scrolls to load more',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['feed.set', 'user.set', 'data.refresh'],
    outputs: ['activity.clicked', 'user.clicked', 'object.clicked', 'trigger.load-more'],
  },
  events: {
    listens: ['social:activity-new'],
    emits: [],
  },
  size: {
    width: 320,
    height: 450,
    minWidth: 280,
    minHeight: 250,
    scaleMode: 'stretch',
  },
};

export const LiveFeedWidgetHTML = `
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
    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }
    .header-icon {
      width: 18px;
      height: 18px;
      opacity: 0.8;
    }
    .feed-tabs {
      display: flex;
      gap: 4px;
    }
    .feed-tab {
      padding: 4px 12px;
      font-size: 12px;
      border: none;
      background: transparent;
      color: var(--sn-text-secondary, #94a3b8);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .feed-tab:hover {
      background: var(--sn-bg-tertiary, #252538);
    }
    .feed-tab.active {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .feed-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .activity {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      background: var(--sn-bg-secondary, #1a1a2e);
      transition: transform 0.2s, background 0.2s;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-16px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .activity:hover {
      background: var(--sn-bg-tertiary, #252538);
    }
    .activity.new {
      border-left: 3px solid var(--sn-accent-primary, #8b5cf6);
    }
    .activity-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--sn-bg-tertiary, #252538);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      color: var(--sn-accent-primary, #8b5cf6);
      flex-shrink: 0;
      cursor: pointer;
      overflow: hidden;
      transition: transform 0.2s;
    }
    .activity-avatar:hover {
      transform: scale(1.1);
    }
    .activity-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .activity-content {
      flex: 1;
      min-width: 0;
    }
    .activity-text {
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    .activity-actor {
      font-weight: 600;
      color: var(--sn-text-primary, #e2e8f0);
      cursor: pointer;
    }
    .activity-actor:hover {
      color: var(--sn-accent-primary, #8b5cf6);
    }
    .activity-verb {
      color: var(--sn-text-secondary, #94a3b8);
    }
    .activity-object {
      color: var(--sn-accent-primary, #8b5cf6);
      cursor: pointer;
    }
    .activity-object:hover {
      text-decoration: underline;
    }
    .activity-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .activity-time {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .verb-icon {
      width: 14px;
      height: 14px;
    }
    .verb-published { color: #22c55e; }
    .verb-forked { color: #3b82f6; }
    .verb-liked { color: #ef4444; }
    .verb-commented { color: #f59e0b; }
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
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--sn-bg-tertiary, #252538);
      border-top-color: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .refresh-banner {
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      display: none;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      animation: bounce 0.5s ease;
    }
    @keyframes bounce {
      0%, 100% { transform: translateX(-50%) translateY(0); }
      50% { transform: translateX(-50%) translateY(-4px); }
    }
    .refresh-banner.visible {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-title">
        <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/>
          <circle cx="5" cy="19" r="2"/>
        </svg>
        <span>Activity</span>
      </div>
      <div class="feed-tabs">
        <button class="feed-tab active" data-feed="global">Global</button>
        <button class="feed-tab" data-feed="friends">Friends</button>
      </div>
    </div>

    <div class="refresh-banner" id="refreshBanner">
      New activity! Click to refresh
    </div>

    <div class="feed-list" id="feedList">
      <div class="empty-state" id="emptyState">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/>
          <circle cx="5" cy="19" r="2"/>
        </svg>
        <p>No activity yet.<br>Check back soon!</p>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        feedType: 'global',
        userId: '',
        activities: [],
        pendingActivities: [],
        isLoading: false,
        hasMore: true
      };

      // Elements
      const feedList = document.getElementById('feedList');
      const emptyState = document.getElementById('emptyState');
      const refreshBanner = document.getElementById('refreshBanner');
      const feedTabs = document.querySelectorAll('.feed-tab');

      // Verb display mapping
      const verbDisplay = {
        published: { text: 'published', icon: 'published' },
        forked: { text: 'forked', icon: 'forked' },
        liked: { text: 'liked', icon: 'liked' },
        commented: { text: 'commented on', icon: 'commented' }
      };

      // Object type display
      const objectTypeDisplay = {
        widget: 'a widget',
        canvas: 'a canvas',
        user: 'a user'
      };

      // Utility: Format time ago
      function timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
        return Math.floor(seconds / 86400) + 'd';
      }

      // Utility: Get initials
      function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }

      // Get verb icon SVG
      function getVerbIcon(verb) {
        const icons = {
          published: '<svg class="verb-icon verb-published" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
          forked: '<svg class="verb-icon verb-forked" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9M12 12v3"/></svg>',
          liked: '<svg class="verb-icon verb-liked" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
          commented: '<svg class="verb-icon verb-commented" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
        };
        return icons[verb] || icons.published;
      }

      // Render activities
      function renderActivities() {
        if (state.activities.length === 0) {
          emptyState.style.display = 'flex';
          return;
        }

        emptyState.style.display = 'none';

        // Clear existing
        Array.from(feedList.children).forEach(child => {
          if (child.id !== 'emptyState') child.remove();
        });

        // Render each activity
        state.activities.forEach((activity, index) => {
          const el = createActivityElement(activity, index < 3);
          feedList.appendChild(el);
        });

        // Add loading indicator if more available
        if (state.hasMore && !state.isLoading) {
          const loadingEl = document.createElement('div');
          loadingEl.className = 'loading';
          loadingEl.id = 'loadingMore';
          loadingEl.innerHTML = '<div class="spinner"></div>';
          feedList.appendChild(loadingEl);
        }
      }

      // Create activity element
      function createActivityElement(activity, isNew) {
        const div = document.createElement('div');
        div.className = 'activity' + (isNew ? ' new' : '');
        div.dataset.id = activity.id;

        const profile = activity.profiles || {};
        const avatarContent = profile.avatar_url
          ? '<img src="' + profile.avatar_url + '" alt="" />'
          : getInitials(profile.username || 'User');

        const verb = verbDisplay[activity.verb] || verbDisplay.published;
        const objectText = activity.metadata?.title || objectTypeDisplay[activity.object_type] || 'something';

        div.innerHTML = \`
          <div class="activity-avatar" data-user-id="\${activity.actor_id}">\${avatarContent}</div>
          <div class="activity-content">
            <div class="activity-text">
              <span class="activity-actor" data-user-id="\${activity.actor_id}">\${profile.username || 'Someone'}</span>
              <span class="activity-verb">\${verb.text}</span>
              <span class="activity-object" data-type="\${activity.object_type}" data-id="\${activity.object_id}">\${escapeHtml(objectText)}</span>
            </div>
            <div class="activity-meta">
              \${getVerbIcon(activity.verb)}
              <span class="activity-time">\${timeAgo(activity.created_at)}</span>
            </div>
          </div>
        \`;

        // Event handlers
        div.querySelector('.activity-avatar').addEventListener('click', (e) => {
          e.stopPropagation();
          handleUserClick(activity);
        });
        div.querySelector('.activity-actor').addEventListener('click', (e) => {
          e.stopPropagation();
          handleUserClick(activity);
        });
        div.querySelector('.activity-object').addEventListener('click', (e) => {
          e.stopPropagation();
          handleObjectClick(activity);
        });
        div.addEventListener('click', () => handleActivityClick(activity));

        return div;
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Handle user click
      function handleUserClick(activity) {
        const profile = activity.profiles || {};
        API.emitOutput('user.clicked', {
          userId: activity.actor_id,
          username: profile.username
        });
      }

      // Handle object click
      function handleObjectClick(activity) {
        API.emitOutput('object.clicked', {
          objectType: activity.object_type,
          objectId: activity.object_id,
          metadata: activity.metadata
        });
      }

      // Handle activity click
      function handleActivityClick(activity) {
        API.emitOutput('activity.clicked', { activity });
      }

      // Handle feed tab switch
      feedTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const feedType = tab.dataset.feed;
          feedTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          state.feedType = feedType;
          state.activities = [];
          state.pendingActivities = [];
          refreshBanner.classList.remove('visible');
          renderActivities();
          API.setState({ feedType: state.feedType });
        });
      });

      // Refresh banner click
      refreshBanner.addEventListener('click', () => {
        state.activities = [...state.pendingActivities, ...state.activities];
        state.pendingActivities = [];
        refreshBanner.classList.remove('visible');
        renderActivities();
        feedList.scrollTop = 0;
      });

      // Infinite scroll
      feedList.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = feedList;
        if (scrollTop + clientHeight >= scrollHeight - 100 && state.hasMore && !state.isLoading) {
          API.emitOutput('trigger.load-more', {});
          state.isLoading = true;
        }
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        state.feedType = saved.feedType || 'global';
        state.userId = saved.userId || '';
        state.activities = saved.activities || [];

        // Update active tab
        feedTabs.forEach(tab => {
          tab.classList.toggle('active', tab.dataset.feed === state.feedType);
        });

        renderActivities();
        API.log('LiveFeedWidget mounted: ' + state.feedType);
      });

      // Handle feed.set input
      API.onInput('feed.set', function(value) {
        if (typeof value === 'object') {
          state.feedType = value.feedType || value.type || 'global';
          state.userId = value.userId || '';
        } else {
          state.feedType = value;
        }

        feedTabs.forEach(tab => {
          tab.classList.toggle('active', tab.dataset.feed === state.feedType);
        });

        state.activities = [];
        state.pendingActivities = [];
        refreshBanner.classList.remove('visible');
        renderActivities();
        API.setState({ feedType: state.feedType, userId: state.userId });
      });

      // Handle user.set input
      API.onInput('user.set', function(userId) {
        state.userId = userId;
        state.feedType = 'user';
        state.activities = [];
        renderActivities();
        API.setState({ userId: state.userId, feedType: state.feedType });
      });

      // Handle data.refresh
      API.onInput('data.refresh', function() {
        if (state.pendingActivities.length > 0) {
          state.activities = [...state.pendingActivities, ...state.activities];
          state.pendingActivities = [];
          refreshBanner.classList.remove('visible');
        }
        renderActivities();
      });

      // Handle activities data (batch load)
      API.onInput('activities.set', function(activities) {
        state.activities = activities;
        state.isLoading = false;
        renderActivities();
        API.setState({ activities: state.activities });
      });

      // Handle activities append (pagination)
      API.onInput('activities.append', function(activities) {
        state.activities = [...state.activities, ...activities];
        state.isLoading = false;
        state.hasMore = activities.length > 0;
        renderActivities();
        API.setState({ activities: state.activities });
      });

      // Listen for real-time activity events
      API.on('social:activity-new', function(payload) {
        const activity = payload.activity;

        // Check if relevant to current feed
        if (state.feedType === 'global' ||
            (state.feedType === 'user' && activity.actor_id === state.userId)) {

          // Don't add duplicates
          if (!state.activities.some(a => a.id === activity.id) &&
              !state.pendingActivities.some(a => a.id === activity.id)) {

            // If scrolled to top, add directly; otherwise show banner
            if (feedList.scrollTop < 50) {
              state.activities.unshift(activity);
              renderActivities();
            } else {
              state.pendingActivities.unshift(activity);
              refreshBanner.classList.add('visible');
            }
          }
        }
      });

      API.onDestroy(function() {
        API.log('LiveFeedWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const LiveFeedWidget: BuiltinWidget = {
  manifest: LiveFeedWidgetManifest,
  html: LiveFeedWidgetHTML,
};
