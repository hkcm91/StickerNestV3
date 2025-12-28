/**
 * StickerNest v2 - MySpace Extended Network Widget (2006 Theme)
 * ===============================================================
 *
 * The classic "Tom is in your extended network" display that showed
 * how you were connected to someone through mutual friends. Also
 * shows "Cool New People" friend suggestions.
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const MySpaceNetworkWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-network',
  name: 'MySpace Extended Network',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Classic MySpace 2006 extended network and friend suggestions.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'network', 'friends', 'suggestions', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    targetUser: { type: 'string', description: 'User to show network for', default: '' },
    suggestions: { type: 'array', description: 'Friend suggestions', default: [] },
  },
  outputs: {
    userClicked: { type: 'object', description: 'User clicked' },
    addFriendClicked: { type: 'object', description: 'Add friend clicked' },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['data.set', 'suggestions.set'],
    outputs: ['user.clicked', 'friend.add'],
  },
  size: {
    width: 300,
    height: 280,
    minWidth: 240,
    minHeight: 220,
    scaleMode: 'stretch',
  },
};

export const MySpaceNetworkWidgetHTML = `
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

    .network-box {
      background: #FFFFFF;
      border: 2px solid #336699;
    }

    .network-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .network-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFCC00;
    }

    .network-content {
      padding: 10px;
    }

    .network-status {
      background: #FFFFCC;
      border: 1px dashed #CCCC00;
      padding: 10px;
      text-align: center;
      margin-bottom: 12px;
    }

    .network-status-text {
      color: #666600;
      font-size: 11px;
      line-height: 1.5;
    }

    .network-user {
      color: #336699;
      font-weight: bold;
      text-decoration: underline;
      cursor: pointer;
    }

    .network-user:hover {
      color: #003366;
    }

    .network-path {
      font-size: 9px;
      color: #666666;
      margin-top: 6px;
    }

    .network-path-arrow {
      color: #FF6633;
    }

    .suggestions-section {
      border-top: 1px solid #99CCFF;
      padding-top: 10px;
    }

    .suggestions-title {
      color: #003366;
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 8px;
    }

    .suggestions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .suggestion-item {
      text-align: center;
    }

    .suggestion-avatar {
      width: 50px;
      height: 50px;
      margin: 0 auto 4px;
      border: 2px solid #336699;
      background: #EEEEEE;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      overflow: hidden;
    }

    .suggestion-avatar:hover {
      border-color: #FF6633;
    }

    .suggestion-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .suggestion-placeholder {
      font-size: 18px;
      color: #336699;
    }

    .suggestion-name {
      color: #336699;
      text-decoration: underline;
      font-size: 9px;
      cursor: pointer;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .suggestion-name:hover {
      color: #003366;
    }

    .suggestion-add {
      color: #FF6633;
      text-decoration: underline;
      font-size: 8px;
      cursor: pointer;
      display: block;
      margin-top: 2px;
    }

    .suggestion-add:hover {
      color: #FF3300;
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
    <div class="network-box">
      <div class="network-header">
        <svg class="network-header-icon" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
        <span>My Network</span>
      </div>

      <div class="network-content">
        <div class="network-status" id="networkStatus">
          <div class="network-status-text">
            <span class="network-user" id="targetUser">Tom</span> is in your extended network
          </div>
          <div class="network-path" id="networkPath">
            You <span class="network-path-arrow">→</span>
            <span class="network-user">xXDarkAngelXx</span>
            <span class="network-path-arrow">→</span>
            <span class="network-user" id="targetUserPath">Tom</span>
          </div>
        </div>

        <div class="suggestions-section">
          <div class="suggestions-title">Cool New People</div>
          <div class="suggestions-grid" id="suggestionsGrid">
            <!-- Suggestions populated here -->
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        targetUser: 'Tom',
        pathUsers: ['xXDarkAngelXx'],
        suggestions: []
      };

      // Default suggestions
      const defaultSuggestions = [
        { userId: 's1', username: 'EMO_KiD', avatarUrl: null },
        { userId: 's2', username: 'BandGeek4Life', avatarUrl: null },
        { userId: 's3', username: 'sk8erboi2006', avatarUrl: null },
        { userId: 's4', username: 'SceneQueen', avatarUrl: null },
        { userId: 's5', username: 'PunkRock99', avatarUrl: null },
        { userId: 's6', username: 'xXMetalXx', avatarUrl: null }
      ];

      // Elements
      const targetUser = document.getElementById('targetUser');
      const targetUserPath = document.getElementById('targetUserPath');
      const suggestionsGrid = document.getElementById('suggestionsGrid');

      // Get initials
      function getInitials(name) {
        return name.split(/[^a-zA-Z]/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
      }

      // Render
      function render() {
        targetUser.textContent = state.targetUser;
        targetUserPath.textContent = state.targetUser;

        // Suggestions
        const suggestions = state.suggestions.length > 0 ? state.suggestions : defaultSuggestions;
        suggestionsGrid.innerHTML = '';

        suggestions.slice(0, 6).forEach(function(user) {
          const item = document.createElement('div');
          item.className = 'suggestion-item';
          item.innerHTML = \`
            <div class="suggestion-avatar" data-user-id="\${user.userId}">
              \${user.avatarUrl
                ? '<img src="' + user.avatarUrl + '" alt="' + user.username + '" />'
                : '<span class="suggestion-placeholder">' + getInitials(user.username) + '</span>'
              }
            </div>
            <a class="suggestion-name" data-user-id="\${user.userId}">\${user.username}</a>
            <a class="suggestion-add" data-user-id="\${user.userId}" data-username="\${user.username}">+ Add</a>
          \`;
          suggestionsGrid.appendChild(item);
        });

        // Click handlers
        suggestionsGrid.querySelectorAll('.suggestion-avatar, .suggestion-name').forEach(function(el) {
          el.addEventListener('click', function() {
            API.emitOutput('user.clicked', { userId: this.dataset.userId });
          });
        });

        suggestionsGrid.querySelectorAll('.suggestion-add').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            API.emitOutput('friend.add', {
              userId: this.dataset.userId,
              username: this.dataset.username
            });
            this.textContent = '✓ Added';
            this.style.color = '#009900';
          });
        });
      }

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceNetworkWidget mounted');
      });

      // Handle suggestions.set input
      API.onInput('suggestions.set', function(suggestions) {
        if (Array.isArray(suggestions)) {
          state.suggestions = suggestions;
          render();
          API.setState({ suggestions: state.suggestions });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.targetUser = data.targetUser || state.targetUser;
          state.pathUsers = data.pathUsers || state.pathUsers;
          state.suggestions = data.suggestions || state.suggestions;
        }
        render();
        API.setState(state);
      });

      API.onDestroy(function() {
        API.log('MySpaceNetworkWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceNetworkWidget: BuiltinWidget = {
  manifest: MySpaceNetworkWidgetManifest,
  html: MySpaceNetworkWidgetHTML,
};
