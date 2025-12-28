/**
 * StickerNest v2 - MySpace Top 8 Friends Widget (2006 Theme)
 * ============================================================
 *
 * The iconic MySpace "Top 8 Friends" grid - one of the most memorable
 * features of the MySpace era. Features authentic 2006 styling with
 * the classic grid layout of friend profile pictures and names.
 *
 * ## Features
 * - 2x4 grid of top friends
 * - Profile pictures with names
 * - Online status indicators
 * - Click to view friend profiles
 * - Edit Top 8 link
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const MySpaceTop8WidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-top8',
  name: 'MySpace Top 8',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 "Top 8 Friends" grid with authentic styling.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'friends', 'retro', '2006', 'nostalgia', 'top8'],
  category: 'myspace',
  inputs: {
    friends: {
      type: 'array',
      description: 'Array of friend objects with userId, username, avatarUrl, isOnline',
      default: [],
    },
    maxFriends: {
      type: 'number',
      description: 'Maximum friends to display (default 8)',
      default: 8,
    },
  },
  outputs: {
    friendClicked: {
      type: 'object',
      description: 'Emitted when a friend is clicked { userId, username }',
    },
    editClicked: {
      type: 'object',
      description: 'Emitted when Edit Top 8 is clicked',
    },
    viewAllClicked: {
      type: 'object',
      description: 'Emitted when View All Friends is clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['friends.set', 'data.set'],
    outputs: ['friend.clicked', 'edit.clicked', 'viewall.clicked'],
  },
  events: {
    listens: ['social:online-status-changed', 'social:friend-added', 'social:friend-removed'],
    emits: [],
  },
  size: {
    width: 380,
    height: 320,
    minWidth: 280,
    minHeight: 250,
    scaleMode: 'stretch',
  },
};

export const MySpaceTop8WidgetHTML = `
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
      overflow: auto;
      font-family: Verdana, Arial, Helvetica, sans-serif;
      font-size: 10px;
      background: #B4D0DC;
    }

    .myspace-container {
      width: 100%;
      min-height: 100%;
      background: #B4D0DC;
      padding: 8px;
    }

    .friends-box {
      background: #FFFFFF;
      border: 2px solid #336699;
    }

    .friends-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .friends-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .friends-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }

    .header-link {
      color: #FFCC00;
      text-decoration: underline;
      font-size: 9px;
      cursor: pointer;
    }

    .header-link:hover {
      color: #FFFFFF;
    }

    .friends-content {
      padding: 10px;
    }

    .friends-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .friend-card {
      text-align: center;
      cursor: pointer;
      padding: 4px;
      border: 1px solid transparent;
      transition: border-color 0.2s;
    }

    .friend-card:hover {
      border-color: #99CCFF;
      background: #F0F8FF;
    }

    .friend-avatar {
      width: 60px;
      height: 60px;
      margin: 0 auto 4px;
      border: 2px solid #336699;
      background: #EEEEEE;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .friend-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .friend-avatar-placeholder {
      font-size: 20px;
      color: #336699;
    }

    .friend-online {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      background: #00CC00;
      border: 1px solid #009900;
      border-radius: 50%;
      display: none;
    }

    .friend-online.online {
      display: block;
    }

    .friend-name {
      font-size: 9px;
      color: #336699;
      text-decoration: underline;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 70px;
      margin: 0 auto;
    }

    .friend-name:hover {
      color: #003366;
    }

    .friends-footer {
      text-align: center;
      padding: 8px;
      border-top: 1px solid #99CCFF;
      margin-top: 8px;
    }

    .footer-link {
      color: #FF6633;
      text-decoration: underline;
      font-size: 10px;
      cursor: pointer;
      font-weight: bold;
    }

    .footer-link:hover {
      color: #FF3300;
    }

    .friend-count {
      font-size: 9px;
      color: #666666;
      margin-bottom: 4px;
    }

    .empty-slot {
      width: 60px;
      height: 60px;
      margin: 0 auto 4px;
      border: 2px dashed #CCCCCC;
      background: #F5F5F5;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #CCCCCC;
      font-size: 24px;
    }

    .empty-name {
      font-size: 9px;
      color: #CCCCCC;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 14px;
    }

    ::-webkit-scrollbar-track {
      background: #B4D0DC;
    }

    ::-webkit-scrollbar-thumb {
      background: #336699;
      border: 2px solid #B4D0DC;
    }
  </style>
</head>
<body>
  <div class="myspace-container">
    <div class="friends-box">
      <div class="friends-header">
        <div class="friends-header-left">
          <svg class="friends-header-icon" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <span id="headerTitle">Tom's Top 8</span>
        </div>
        <a class="header-link" id="editLink">[Edit]</a>
      </div>

      <div class="friends-content">
        <div class="friends-grid" id="friendsGrid">
          <!-- Friends will be populated here -->
        </div>

        <div class="friends-footer">
          <div class="friend-count" id="friendCount">Tom has 42,069 friends</div>
          <a class="footer-link" id="viewAllLink">View All of Tom's Friends</a>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        username: 'Tom',
        friends: [],
        maxFriends: 8,
        totalFriends: 42069
      };

      // Default Tom-era friends
      const defaultFriends = [
        { userId: '1', username: 'Tom', avatarUrl: null, isOnline: true },
        { userId: '2', username: 'MySpace', avatarUrl: null, isOnline: true },
        { userId: '3', username: 'xXDarkAngelXx', avatarUrl: null, isOnline: false },
        { userId: '4', username: 'sk8erboi2006', avatarUrl: null, isOnline: true },
        { userId: '5', username: 'PunkRockPrincess', avatarUrl: null, isOnline: false },
        { userId: '6', username: 'BandGeek4Life', avatarUrl: null, isOnline: false },
        { userId: '7', username: 'EMO_KiD', avatarUrl: null, isOnline: true },
        { userId: '8', username: 'SceneQueen', avatarUrl: null, isOnline: false }
      ];

      // Elements
      const headerTitle = document.getElementById('headerTitle');
      const friendsGrid = document.getElementById('friendsGrid');
      const friendCount = document.getElementById('friendCount');
      const viewAllLink = document.getElementById('viewAllLink');
      const editLink = document.getElementById('editLink');

      // Format number
      function formatNumber(num) {
        return num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
      }

      // Get initials
      function getInitials(name) {
        return name.split(/[^a-zA-Z]/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
      }

      // Render friends grid
      function render() {
        headerTitle.textContent = state.username + "'s Top " + state.maxFriends;
        friendCount.textContent = state.username + " has " + formatNumber(state.totalFriends) + " friends";
        viewAllLink.textContent = "View All of " + state.username + "'s Friends";

        // Use default friends if none provided
        const friends = state.friends.length > 0 ? state.friends : defaultFriends;
        const displayFriends = friends.slice(0, state.maxFriends);

        friendsGrid.innerHTML = '';

        for (let i = 0; i < state.maxFriends; i++) {
          const friend = displayFriends[i];
          const card = document.createElement('div');
          card.className = 'friend-card';

          if (friend) {
            card.innerHTML = \`
              <div class="friend-avatar">
                \${friend.avatarUrl
                  ? '<img src="' + friend.avatarUrl + '" alt="' + friend.username + '" />'
                  : '<span class="friend-avatar-placeholder">' + getInitials(friend.username) + '</span>'
                }
                <div class="friend-online \${friend.isOnline ? 'online' : ''}"></div>
              </div>
              <div class="friend-name">\${friend.username}</div>
            \`;

            card.addEventListener('click', function() {
              API.emitOutput('friend.clicked', {
                userId: friend.userId,
                username: friend.username
              });
            });
          } else {
            card.innerHTML = \`
              <div class="empty-slot">+</div>
              <div class="empty-name">Add Friend</div>
            \`;
          }

          friendsGrid.appendChild(card);
        }
      }

      // Event handlers
      editLink.addEventListener('click', function(e) {
        e.preventDefault();
        API.emitOutput('edit.clicked', { username: state.username });
      });

      viewAllLink.addEventListener('click', function(e) {
        e.preventDefault();
        API.emitOutput('viewall.clicked', {
          username: state.username,
          totalFriends: state.totalFriends
        });
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceTop8Widget mounted');
      });

      // Handle friends.set input
      API.onInput('friends.set', function(friends) {
        if (Array.isArray(friends)) {
          state.friends = friends;
          render();
          API.setState({ friends: state.friends });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.username = data.username || state.username;
          state.friends = data.friends || state.friends;
          state.maxFriends = data.maxFriends || state.maxFriends;
          state.totalFriends = data.totalFriends || state.totalFriends;
        }
        render();
        API.setState(state);
      });

      // Listen for online status changes
      API.on('social:online-status-changed', function(payload) {
        const friend = state.friends.find(f => f.userId === payload.userId);
        if (friend) {
          friend.isOnline = payload.isOnline;
          render();
        }
      });

      API.onDestroy(function() {
        API.log('MySpaceTop8Widget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceTop8Widget: BuiltinWidget = {
  manifest: MySpaceTop8WidgetManifest,
  html: MySpaceTop8WidgetHTML,
};
