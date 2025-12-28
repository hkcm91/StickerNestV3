/**
 * StickerNest v2 - MySpace Contact Widget (2006 Theme)
 * ======================================================
 *
 * The classic "Contacting [username]" action box with all those
 * links: Send Message, Add to Friends, Instant Message, Add to
 * Favorites, Add to Group, Forward to Friend, Block User, Rank User.
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const MySpaceContactWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-contact',
  name: 'MySpace Contact',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 "Contacting" action links box.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'contact', 'actions', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    username: {
      type: 'string',
      description: 'Username to contact',
      default: 'Tom',
    },
    isFriend: {
      type: 'boolean',
      description: 'Whether user is already a friend',
      default: false,
    },
  },
  outputs: {
    sendMessage: { type: 'object', description: 'Send message clicked' },
    addFriend: { type: 'object', description: 'Add to friends clicked' },
    instantMessage: { type: 'object', description: 'Instant message clicked' },
    addFavorites: { type: 'object', description: 'Add to favorites clicked' },
    addGroup: { type: 'object', description: 'Add to group clicked' },
    forwardFriend: { type: 'object', description: 'Forward to friend clicked' },
    blockUser: { type: 'object', description: 'Block user clicked' },
    rankUser: { type: 'object', description: 'Rank user clicked' },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['username.set', 'data.set'],
    outputs: ['message.send', 'friend.add', 'im.open', 'favorites.add', 'group.add', 'forward.friend', 'user.block', 'user.rank'],
  },
  size: {
    width: 200,
    height: 220,
    minWidth: 160,
    minHeight: 180,
    scaleMode: 'stretch',
  },
};

export const MySpaceContactWidgetHTML = `
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
      font-family: Verdana, Arial, Helvetica, sans-serif;
      font-size: 10px;
      background: #B4D0DC;
    }

    .myspace-container {
      width: 100%;
      height: 100%;
      background: #B4D0DC;
      padding: 8px;
    }

    .contact-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      height: 100%;
    }

    .contact-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      text-align: center;
    }

    .contact-content {
      padding: 8px;
    }

    .contact-links {
      list-style: none;
    }

    .contact-link {
      padding: 4px 0;
      border-bottom: 1px dotted #CCCCCC;
    }

    .contact-link:last-child {
      border-bottom: none;
    }

    .contact-link a {
      color: #336699;
      text-decoration: underline;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .contact-link a:hover {
      color: #003366;
      background: #F0F8FF;
    }

    .contact-icon {
      width: 12px;
      height: 12px;
      fill: #336699;
      flex-shrink: 0;
    }

    .contact-link a:hover .contact-icon {
      fill: #003366;
    }

    /* Special styling for block */
    .contact-link.danger a {
      color: #CC0000;
    }

    .contact-link.danger .contact-icon {
      fill: #CC0000;
    }
  </style>
</head>
<body>
  <div class="myspace-container">
    <div class="contact-box">
      <div class="contact-header">
        Contacting <span id="username">Tom</span>
      </div>

      <div class="contact-content">
        <ul class="contact-links">
          <li class="contact-link" id="sendMessage">
            <a>
              <svg class="contact-icon" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              Send Message
            </a>
          </li>
          <li class="contact-link" id="addFriend">
            <a>
              <svg class="contact-icon" viewBox="0 0 24 24">
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span id="addFriendText">Add to Friends</span>
            </a>
          </li>
          <li class="contact-link" id="instantMessage">
            <a>
              <svg class="contact-icon" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
              </svg>
              Instant Message
            </a>
          </li>
          <li class="contact-link" id="addFavorites">
            <a>
              <svg class="contact-icon" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
              Add to Favorites
            </a>
          </li>
          <li class="contact-link" id="addGroup">
            <a>
              <svg class="contact-icon" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              Add to Group
            </a>
          </li>
          <li class="contact-link" id="forwardFriend">
            <a>
              <svg class="contact-icon" viewBox="0 0 24 24">
                <path d="M12 8V4l8 8-8 8v-4H4V8z"/>
              </svg>
              Forward to Friend
            </a>
          </li>
          <li class="contact-link danger" id="blockUser">
            <a>
              <svg class="contact-icon" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
              </svg>
              Block User
            </a>
          </li>
          <li class="contact-link" id="rankUser">
            <a>
              <svg class="contact-icon" viewBox="0 0 24 24">
                <path d="M12 7.13l.97 2.29.47 1.11 1.2.1 2.47.21-1.88 1.63-.91.79.27 1.18.56 2.41-2.12-1.28L12 14.93l-1.03.64-2.12 1.28.56-2.41.27-1.18-.91-.79-1.88-1.63 2.47-.21 1.2-.1.47-1.11.97-2.29M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
              </svg>
              Rank User
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        userId: '',
        username: 'Tom',
        isFriend: false
      };

      // Elements
      const usernameEl = document.getElementById('username');
      const addFriendText = document.getElementById('addFriendText');

      // Render
      function render() {
        usernameEl.textContent = state.username;
        addFriendText.textContent = state.isFriend ? 'Remove from Friends' : 'Add to Friends';
      }

      // Click handlers
      document.getElementById('sendMessage').addEventListener('click', function() {
        API.emitOutput('message.send', { userId: state.userId, username: state.username });
      });

      document.getElementById('addFriend').addEventListener('click', function() {
        state.isFriend = !state.isFriend;
        render();
        API.emitOutput('friend.add', { userId: state.userId, username: state.username, action: state.isFriend ? 'add' : 'remove' });
        API.setState({ isFriend: state.isFriend });
      });

      document.getElementById('instantMessage').addEventListener('click', function() {
        API.emitOutput('im.open', { userId: state.userId, username: state.username });
      });

      document.getElementById('addFavorites').addEventListener('click', function() {
        API.emitOutput('favorites.add', { userId: state.userId, username: state.username });
      });

      document.getElementById('addGroup').addEventListener('click', function() {
        API.emitOutput('group.add', { userId: state.userId, username: state.username });
      });

      document.getElementById('forwardFriend').addEventListener('click', function() {
        API.emitOutput('forward.friend', { userId: state.userId, username: state.username });
      });

      document.getElementById('blockUser').addEventListener('click', function() {
        API.emitOutput('user.block', { userId: state.userId, username: state.username });
      });

      document.getElementById('rankUser').addEventListener('click', function() {
        API.emitOutput('user.rank', { userId: state.userId, username: state.username });
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceContactWidget mounted');
      });

      // Handle username.set input
      API.onInput('username.set', function(username) {
        state.username = username;
        render();
        API.setState({ username: state.username });
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.userId = data.userId || state.userId;
          state.username = data.username || state.username;
          state.isFriend = data.isFriend || state.isFriend;
        }
        render();
        API.setState(state);
      });

      API.onDestroy(function() {
        API.log('MySpaceContactWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceContactWidget: BuiltinWidget = {
  manifest: MySpaceContactWidgetManifest,
  html: MySpaceContactWidgetHTML,
};
