/**
 * StickerNest v2 - MySpace Friend Requests Widget (2006 Theme)
 * ==============================================================
 *
 * The classic MySpace friend request notifications - that exciting
 * moment when someone wanted to be your friend! Features the iconic
 * approve/deny buttons and pending request list.
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const MySpaceFriendRequestsWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-friend-requests',
  name: 'MySpace Friend Requests',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 friend requests widget.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'friends', 'requests', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    requests: {
      type: 'array',
      description: 'Array of friend request objects',
      default: [],
    },
  },
  outputs: {
    requestApproved: { type: 'object', description: 'Friend request approved' },
    requestDenied: { type: 'object', description: 'Friend request denied' },
    userClicked: { type: 'object', description: 'User profile clicked' },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['requests.set', 'data.set'],
    outputs: ['request.approved', 'request.denied', 'user.clicked'],
  },
  events: {
    listens: ['social:friend-request-new'],
    emits: [],
  },
  size: {
    width: 320,
    height: 300,
    minWidth: 260,
    minHeight: 240,
    scaleMode: 'stretch',
  },
};

export const MySpaceFriendRequestsWidgetHTML = `
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

    .requests-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .requests-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .requests-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFCC00;
    }

    .request-count {
      background: #FF0000;
      color: #FFFFFF;
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 10px;
      margin-left: auto;
    }

    .requests-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .request-item {
      display: flex;
      gap: 10px;
      padding: 10px;
      border: 1px solid #99CCFF;
      margin-bottom: 8px;
      background: #F8F8F8;
    }

    .request-item:hover {
      background: #F0F8FF;
    }

    .request-avatar {
      width: 50px;
      height: 50px;
      border: 2px solid #336699;
      background: #EEEEEE;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      overflow: hidden;
    }

    .request-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .request-avatar-placeholder {
      font-size: 18px;
      color: #336699;
    }

    .request-info {
      flex: 1;
      min-width: 0;
    }

    .request-username {
      color: #336699;
      text-decoration: underline;
      font-weight: bold;
      font-size: 11px;
      cursor: pointer;
      margin-bottom: 4px;
    }

    .request-username:hover {
      color: #003366;
    }

    .request-message {
      font-size: 9px;
      color: #666666;
      margin-bottom: 6px;
      line-height: 1.4;
    }

    .request-date {
      font-size: 8px;
      color: #999999;
      margin-bottom: 6px;
    }

    .request-actions {
      display: flex;
      gap: 6px;
    }

    .request-btn {
      padding: 3px 10px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 9px;
      cursor: pointer;
      border: 1px solid;
    }

    .approve-btn {
      background: linear-gradient(180deg, #00CC00 0%, #009900 100%);
      color: #FFFFFF;
      border-color: #006600;
    }

    .approve-btn:hover {
      background: linear-gradient(180deg, #00FF00 0%, #00CC00 100%);
    }

    .deny-btn {
      background: linear-gradient(180deg, #CC0000 0%, #990000 100%);
      color: #FFFFFF;
      border-color: #660000;
    }

    .deny-btn:hover {
      background: linear-gradient(180deg, #FF0000 0%, #CC0000 100%);
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #666666;
    }

    .empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
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
    <div class="requests-box">
      <div class="requests-header">
        <svg class="requests-header-icon" viewBox="0 0 24 24">
          <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        <span>Friend Requests</span>
        <span class="request-count" id="requestCount">3</span>
      </div>

      <div class="requests-list" id="requestsList">
        <!-- Requests populated here -->
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        requests: []
      };

      // Default requests
      const defaultRequests = [
        {
          id: 1,
          userId: 'scene1',
          username: 'SceneQueen2006',
          avatarUrl: null,
          message: 'hey ur cute add me!! <3',
          date: '12/25/2006 3:45 PM'
        },
        {
          id: 2,
          userId: 'metal1',
          username: 'xXMetalHeadXx',
          avatarUrl: null,
          message: 'saw u at the show last night, sick profile!',
          date: '12/24/2006 11:20 PM'
        },
        {
          id: 3,
          userId: 'random1',
          username: 'CoolDude99',
          avatarUrl: null,
          message: '',
          date: '12/23/2006 5:15 PM'
        }
      ];

      // Elements
      const requestCount = document.getElementById('requestCount');
      const requestsList = document.getElementById('requestsList');

      // Get initials
      function getInitials(name) {
        return name.split(/[^a-zA-Z]/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
      }

      // Render requests
      function render() {
        const requests = state.requests.length > 0 ? state.requests : defaultRequests;
        requestCount.textContent = requests.length;
        requestCount.style.display = requests.length > 0 ? 'inline' : 'none';

        if (requests.length === 0) {
          requestsList.innerHTML = \`
            <div class="empty-state">
              <div class="empty-icon">:)</div>
              <div>No pending friend requests!</div>
            </div>
          \`;
          return;
        }

        requestsList.innerHTML = '';

        requests.forEach(function(req) {
          const item = document.createElement('div');
          item.className = 'request-item';
          item.innerHTML = \`
            <div class="request-avatar" data-user-id="\${req.userId}">
              \${req.avatarUrl
                ? '<img src="' + req.avatarUrl + '" alt="' + req.username + '" />'
                : '<span class="request-avatar-placeholder">' + getInitials(req.username) + '</span>'
              }
            </div>
            <div class="request-info">
              <div class="request-username" data-user-id="\${req.userId}">\${req.username}</div>
              \${req.message ? '<div class="request-message">"' + req.message + '"</div>' : ''}
              <div class="request-date">\${req.date}</div>
              <div class="request-actions">
                <button class="request-btn approve-btn" data-req-id="\${req.id}">Approve</button>
                <button class="request-btn deny-btn" data-req-id="\${req.id}">Deny</button>
              </div>
            </div>
          \`;
          requestsList.appendChild(item);
        });

        // Add click handlers
        requestsList.querySelectorAll('.request-username, .request-avatar').forEach(function(el) {
          el.addEventListener('click', function() {
            API.emitOutput('user.clicked', { userId: this.dataset.userId });
          });
        });

        requestsList.querySelectorAll('.approve-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const reqId = parseInt(this.dataset.reqId);
            const req = requests.find(r => r.id === reqId);
            state.requests = state.requests.filter(r => r.id !== reqId);
            render();
            API.emitOutput('request.approved', {
              id: reqId,
              userId: req.userId,
              username: req.username
            });
            API.setState({ requests: state.requests });
          });
        });

        requestsList.querySelectorAll('.deny-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const reqId = parseInt(this.dataset.reqId);
            const req = requests.find(r => r.id === reqId);
            state.requests = state.requests.filter(r => r.id !== reqId);
            render();
            API.emitOutput('request.denied', {
              id: reqId,
              userId: req.userId,
              username: req.username
            });
            API.setState({ requests: state.requests });
          });
        });
      }

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceFriendRequestsWidget mounted');
      });

      // Handle requests.set input
      API.onInput('requests.set', function(requests) {
        if (Array.isArray(requests)) {
          state.requests = requests;
          render();
          API.setState({ requests: state.requests });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.requests = data.requests || state.requests;
        }
        render();
        API.setState(state);
      });

      // Listen for new friend requests
      API.on('social:friend-request-new', function(payload) {
        state.requests.unshift(payload.request);
        render();
      });

      API.onDestroy(function() {
        API.log('MySpaceFriendRequestsWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceFriendRequestsWidget: BuiltinWidget = {
  manifest: MySpaceFriendRequestsWidgetManifest,
  html: MySpaceFriendRequestsWidgetHTML,
};
