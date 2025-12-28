/**
 * StickerNest v2 - MySpace Mail Widget (2006 Theme)
 * ===================================================
 *
 * The classic MySpace inbox - private messages with that distinctive
 * table layout and orange "New!" badges. Remember refreshing constantly
 * to see if your crush messaged you back?
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const MySpaceMailWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-mail',
  name: 'MySpace Mail',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 inbox/mail widget.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'mail', 'inbox', 'messages', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    messages: {
      type: 'array',
      description: 'Array of message objects',
      default: [],
    },
    folder: {
      type: 'string',
      description: 'Current folder (inbox, sent, saved, trash)',
      default: 'inbox',
    },
  },
  outputs: {
    messageClicked: { type: 'object', description: 'Message clicked to read' },
    composeClicked: { type: 'object', description: 'Compose new message clicked' },
    folderChanged: { type: 'object', description: 'Folder changed' },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['messages.set', 'folder.set', 'data.set'],
    outputs: ['message.clicked', 'compose.clicked', 'folder.changed'],
  },
  events: {
    listens: ['social:message-new'],
    emits: [],
  },
  size: {
    width: 380,
    height: 350,
    minWidth: 300,
    minHeight: 280,
    scaleMode: 'stretch',
  },
};

export const MySpaceMailWidgetHTML = `
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

    .mail-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .mail-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .mail-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .mail-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }

    .unread-badge {
      background: #FF0000;
      color: #FFFFFF;
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 10px;
      margin-left: 6px;
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

    .mail-folders {
      background: #E8F4F8;
      padding: 6px 8px;
      border-bottom: 1px solid #99CCFF;
      display: flex;
      gap: 12px;
    }

    .folder-link {
      color: #336699;
      text-decoration: underline;
      font-size: 10px;
      cursor: pointer;
    }

    .folder-link:hover {
      color: #003366;
    }

    .folder-link.active {
      color: #003366;
      font-weight: bold;
      text-decoration: none;
    }

    .folder-count {
      color: #999999;
      font-size: 9px;
    }

    .mail-list {
      flex: 1;
      overflow-y: auto;
    }

    .mail-table {
      width: 100%;
      border-collapse: collapse;
    }

    .mail-table th {
      background: #336699;
      color: #FFFFFF;
      padding: 4px 8px;
      text-align: left;
      font-size: 9px;
      font-weight: bold;
      position: sticky;
      top: 0;
    }

    .mail-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #EEEEEE;
      font-size: 10px;
    }

    .mail-table tr:hover td {
      background: #F0F8FF;
    }

    .mail-table tr.unread td {
      background: #FFFFEE;
      font-weight: bold;
    }

    .mail-table tr.unread:hover td {
      background: #FFFFF0;
    }

    .mail-checkbox {
      width: 14px;
      height: 14px;
    }

    .mail-from {
      color: #336699;
      text-decoration: underline;
      cursor: pointer;
    }

    .mail-from:hover {
      color: #003366;
    }

    .mail-subject {
      color: #333333;
      cursor: pointer;
    }

    .mail-subject:hover {
      text-decoration: underline;
    }

    .mail-new-badge {
      background: #FF6633;
      color: #FFFFFF;
      font-size: 8px;
      padding: 1px 4px;
      margin-left: 4px;
      font-weight: bold;
    }

    .mail-date {
      color: #666666;
      font-size: 9px;
      white-space: nowrap;
    }

    .mail-footer {
      background: #E8F4F8;
      padding: 6px 8px;
      border-top: 1px solid #99CCFF;
      display: flex;
      gap: 8px;
    }

    .mail-action-btn {
      padding: 3px 10px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 9px;
      border: 1px solid #336699;
      background: #FFFFFF;
      color: #336699;
      cursor: pointer;
    }

    .mail-action-btn:hover {
      background: #F0F8FF;
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
    <div class="mail-box">
      <div class="mail-header">
        <div class="mail-header-left">
          <svg class="mail-header-icon" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          <span>Mail Center</span>
          <span class="unread-badge" id="unreadBadge">3 New</span>
        </div>
        <a class="header-link" id="composeLink">[Compose]</a>
      </div>

      <div class="mail-folders">
        <a class="folder-link active" data-folder="inbox">Inbox <span class="folder-count" id="inboxCount">(3)</span></a>
        <a class="folder-link" data-folder="sent">Sent</a>
        <a class="folder-link" data-folder="saved">Saved</a>
        <a class="folder-link" data-folder="trash">Trash</a>
      </div>

      <div class="mail-list">
        <table class="mail-table">
          <thead>
            <tr>
              <th style="width: 30px;"></th>
              <th style="width: 100px;">From</th>
              <th>Subject</th>
              <th style="width: 80px;">Date</th>
            </tr>
          </thead>
          <tbody id="mailBody">
            <!-- Messages populated here -->
          </tbody>
        </table>
      </div>

      <div class="mail-footer">
        <button class="mail-action-btn" id="deleteBtn">Delete</button>
        <button class="mail-action-btn" id="markReadBtn">Mark as Read</button>
        <button class="mail-action-btn" id="saveBtn">Save to Folder</button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        folder: 'inbox',
        messages: [],
        selected: []
      };

      // Default messages
      const defaultMessages = [
        {
          id: 1,
          from: 'xXDarkAngelXx',
          fromId: 'dark1',
          subject: 'RE: hey whats up!!',
          date: '12/25/06',
          isRead: false,
          body: 'nm just chillin hbu?? u going 2 the show 2nite??'
        },
        {
          id: 2,
          from: 'MySpace',
          fromId: 'myspace',
          subject: 'Your friend Tom has sent you a message!',
          date: '12/24/06',
          isRead: false,
          body: 'Tom has sent you a new message. Click here to read it!'
        },
        {
          id: 3,
          from: 'PunkRockPrincess',
          fromId: 'punk1',
          subject: 'HAPPY HOLIDAYS!! <333',
          date: '12/24/06',
          isRead: false,
          body: 'hey babe!! just wanted 2 wish u a merry xmas!! hope u have a great break!!'
        },
        {
          id: 4,
          from: 'sk8erboi2006',
          fromId: 'sk8r',
          subject: 'check out my bands new demo',
          date: '12/22/06',
          isRead: true,
          body: 'yo dude we just recorded some new tracks check em out and tell me what u think!!'
        },
        {
          id: 5,
          from: 'BandGeek4Life',
          fromId: 'band1',
          subject: 'RE: RE: RE: that party was crazy',
          date: '12/20/06',
          isRead: true,
          body: 'lol i know right?? we should def hang out again soon'
        }
      ];

      // Elements
      const unreadBadge = document.getElementById('unreadBadge');
      const inboxCount = document.getElementById('inboxCount');
      const mailBody = document.getElementById('mailBody');
      const composeLink = document.getElementById('composeLink');
      const folderLinks = document.querySelectorAll('.folder-link');

      // Render messages
      function render() {
        const messages = state.messages.length > 0 ? state.messages : defaultMessages;
        const unreadCount = messages.filter(m => !m.isRead).length;

        unreadBadge.textContent = unreadCount + ' New';
        unreadBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
        inboxCount.textContent = '(' + messages.length + ')';

        mailBody.innerHTML = '';

        messages.forEach(function(msg) {
          const row = document.createElement('tr');
          row.className = msg.isRead ? '' : 'unread';
          row.innerHTML = \`
            <td><input type="checkbox" class="mail-checkbox" data-msg-id="\${msg.id}" /></td>
            <td><span class="mail-from" data-user-id="\${msg.fromId}">\${msg.from}</span></td>
            <td>
              <span class="mail-subject" data-msg-id="\${msg.id}">\${msg.subject}</span>
              \${!msg.isRead ? '<span class="mail-new-badge">New!</span>' : ''}
            </td>
            <td class="mail-date">\${msg.date}</td>
          \`;
          mailBody.appendChild(row);
        });

        // Add click handlers
        mailBody.querySelectorAll('.mail-subject').forEach(function(el) {
          el.addEventListener('click', function() {
            const msgId = parseInt(this.dataset.msgId);
            const msg = messages.find(m => m.id === msgId);
            if (msg) {
              msg.isRead = true;
              render();
              API.emitOutput('message.clicked', {
                id: msg.id,
                from: msg.from,
                subject: msg.subject,
                body: msg.body
              });
            }
          });
        });

        mailBody.querySelectorAll('.mail-from').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            API.emitOutput('user.clicked', { userId: this.dataset.userId });
          });
        });
      }

      // Folder switching
      folderLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          folderLinks.forEach(l => l.classList.remove('active'));
          this.classList.add('active');
          state.folder = this.dataset.folder;
          API.emitOutput('folder.changed', { folder: state.folder });
          render();
        });
      });

      // Compose
      composeLink.addEventListener('click', function(e) {
        e.preventDefault();
        API.emitOutput('compose.clicked', {});
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceMailWidget mounted');
      });

      // Handle messages.set input
      API.onInput('messages.set', function(messages) {
        if (Array.isArray(messages)) {
          state.messages = messages;
          render();
          API.setState({ messages: state.messages });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.folder = data.folder || state.folder;
          state.messages = data.messages || state.messages;
        }
        render();
        API.setState(state);
      });

      // Listen for new messages
      API.on('social:message-new', function(payload) {
        state.messages.unshift(payload.message);
        render();
      });

      API.onDestroy(function() {
        API.log('MySpaceMailWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceMailWidget: BuiltinWidget = {
  manifest: MySpaceMailWidgetManifest,
  html: MySpaceMailWidgetHTML,
};
