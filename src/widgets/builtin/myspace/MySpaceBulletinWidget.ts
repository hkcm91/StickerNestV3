/**
 * StickerNest v2 - MySpace Bulletin Widget (2006 Theme)
 * =======================================================
 *
 * The classic MySpace bulletin board - where users posted chain letters,
 * surveys, and updates for all their friends to see. Features authentic
 * 2006 styling with the iconic list format.
 *
 * ## Features
 * - Scrollable bulletin list
 * - Post new bulletins
 * - Subject and body fields
 * - Timestamp display
 * - Repost functionality
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const MySpaceBulletinWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-bulletin',
  name: 'MySpace Bulletins',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 bulletin board with authentic styling.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'bulletin', 'posts', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    bulletins: {
      type: 'array',
      description: 'Array of bulletin objects',
      default: [],
    },
  },
  outputs: {
    bulletinPosted: {
      type: 'object',
      description: 'Emitted when a bulletin is posted',
    },
    bulletinClicked: {
      type: 'object',
      description: 'Emitted when a bulletin is clicked to view',
    },
    userClicked: {
      type: 'object',
      description: 'Emitted when a poster username is clicked',
    },
    reposted: {
      type: 'object',
      description: 'Emitted when a bulletin is reposted',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['bulletins.set', 'data.set'],
    outputs: ['bulletin.posted', 'bulletin.clicked', 'user.clicked', 'bulletin.reposted'],
  },
  events: {
    listens: ['social:bulletin-new'],
    emits: [],
  },
  size: {
    width: 350,
    height: 400,
    minWidth: 280,
    minHeight: 300,
    scaleMode: 'stretch',
  },
};

export const MySpaceBulletinWidgetHTML = `
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

    .bulletin-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .bulletin-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .bulletin-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }

    .header-actions {
      margin-left: auto;
    }

    .header-link {
      color: #FFCC00;
      text-decoration: underline;
      font-size: 9px;
      cursor: pointer;
      font-weight: normal;
    }

    .header-link:hover {
      color: #FFFFFF;
    }

    .bulletin-tabs {
      display: flex;
      background: #E8F4F8;
      border-bottom: 1px solid #99CCFF;
    }

    .tab {
      padding: 6px 12px;
      font-size: 10px;
      color: #336699;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }

    .tab:hover {
      background: #F0F8FF;
    }

    .tab.active {
      color: #003366;
      font-weight: bold;
      border-bottom-color: #FF6633;
      background: #FFFFFF;
    }

    .bulletin-list {
      flex: 1;
      overflow-y: auto;
    }

    .bulletin-table {
      width: 100%;
      border-collapse: collapse;
    }

    .bulletin-table th {
      background: #336699;
      color: #FFFFFF;
      padding: 4px 8px;
      text-align: left;
      font-size: 9px;
      font-weight: bold;
      position: sticky;
      top: 0;
    }

    .bulletin-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #EEEEEE;
      font-size: 10px;
      vertical-align: top;
    }

    .bulletin-table tr:hover td {
      background: #F0F8FF;
    }

    .bulletin-from {
      color: #336699;
      text-decoration: underline;
      cursor: pointer;
      font-weight: bold;
    }

    .bulletin-from:hover {
      color: #003366;
    }

    .bulletin-subject {
      color: #FF6633;
      text-decoration: underline;
      cursor: pointer;
    }

    .bulletin-subject:hover {
      color: #FF3300;
    }

    .bulletin-date {
      color: #666666;
      font-size: 9px;
      white-space: nowrap;
    }

    .compose-form {
      border-top: 2px solid #336699;
      padding: 10px;
      background: #E8F4F8;
      display: none;
    }

    .compose-form.visible {
      display: block;
    }

    .form-row {
      margin-bottom: 8px;
    }

    .form-label {
      display: block;
      font-weight: bold;
      color: #003366;
      font-size: 10px;
      margin-bottom: 2px;
    }

    .form-input {
      width: 100%;
      padding: 4px 6px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 10px;
      border: 1px solid #99CCFF;
    }

    .form-textarea {
      width: 100%;
      height: 60px;
      padding: 6px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 10px;
      border: 1px solid #99CCFF;
      resize: none;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: #336699;
    }

    .form-buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .form-btn {
      padding: 4px 12px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 10px;
      cursor: pointer;
      border: 1px solid #336699;
    }

    .post-btn {
      background: linear-gradient(180deg, #336699 0%, #003366 100%);
      color: #FFFFFF;
    }

    .post-btn:hover {
      background: linear-gradient(180deg, #003366 0%, #002244 100%);
    }

    .cancel-btn {
      background: #FFFFFF;
      color: #336699;
    }

    .cancel-btn:hover {
      background: #F0F8FF;
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

    /* Bulletin view modal */
    .bulletin-view {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #FFFFFF;
      display: none;
      flex-direction: column;
    }

    .bulletin-view.visible {
      display: flex;
    }

    .view-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .view-title {
      font-weight: bold;
      font-size: 11px;
    }

    .close-btn {
      color: #FFCC00;
      text-decoration: underline;
      cursor: pointer;
      font-size: 10px;
      background: none;
      border: none;
      font-family: inherit;
    }

    .view-content {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
    }

    .view-meta {
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #99CCFF;
    }

    .view-subject {
      font-size: 14px;
      font-weight: bold;
      color: #003366;
      margin-bottom: 4px;
    }

    .view-from {
      font-size: 10px;
      color: #666666;
    }

    .view-from a {
      color: #336699;
      text-decoration: underline;
    }

    .view-body {
      font-size: 11px;
      color: #333333;
      line-height: 1.6;
    }

    .view-actions {
      padding: 8px;
      background: #E8F4F8;
      border-top: 1px solid #99CCFF;
      text-align: center;
    }

    .repost-btn {
      color: #FF6633;
      text-decoration: underline;
      font-size: 10px;
      cursor: pointer;
      background: none;
      border: none;
      font-family: inherit;
      font-weight: bold;
    }

    .repost-btn:hover {
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
    <div class="bulletin-box">
      <div class="bulletin-header">
        <svg class="bulletin-header-icon" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
        </svg>
        <span>My Bulletin Space</span>
        <div class="header-actions">
          <a class="header-link" id="postBulletinLink">[Post Bulletin]</a>
        </div>
      </div>

      <div class="bulletin-tabs">
        <div class="tab active" data-tab="friends">From Friends</div>
        <div class="tab" data-tab="my">My Bulletins</div>
      </div>

      <div class="bulletin-list" id="bulletinList">
        <table class="bulletin-table">
          <thead>
            <tr>
              <th style="width: 100px;">From</th>
              <th>Subject</th>
              <th style="width: 80px;">Date</th>
            </tr>
          </thead>
          <tbody id="bulletinBody">
            <!-- Bulletins populated here -->
          </tbody>
        </table>
      </div>

      <div class="compose-form" id="composeForm">
        <div class="form-row">
          <label class="form-label">Subject:</label>
          <input type="text" class="form-input" id="subjectInput" placeholder="Enter subject..." />
        </div>
        <div class="form-row">
          <label class="form-label">Body:</label>
          <textarea class="form-textarea" id="bodyInput" placeholder="Type your bulletin..."></textarea>
        </div>
        <div class="form-buttons">
          <button class="form-btn cancel-btn" id="cancelBtn">Cancel</button>
          <button class="form-btn post-btn" id="postBtn">Post</button>
        </div>
      </div>

      <div class="bulletin-view" id="bulletinView">
        <div class="view-header">
          <span class="view-title">View Bulletin</span>
          <button class="close-btn" id="closeViewBtn">[Close]</button>
        </div>
        <div class="view-content">
          <div class="view-meta">
            <div class="view-subject" id="viewSubject">Subject Here</div>
            <div class="view-from">From: <a id="viewFrom">Username</a> - <span id="viewDate">12/25/2006</span></div>
          </div>
          <div class="view-body" id="viewBody">
            Bulletin content here...
          </div>
        </div>
        <div class="view-actions">
          <button class="repost-btn" id="repostBtn">Repost This Bulletin</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        bulletins: [],
        currentTab: 'friends',
        viewingBulletin: null
      };

      // Default bulletins
      const defaultBulletins = [
        {
          id: '1',
          userId: 'xXDarkAngelXx',
          username: 'xXDarkAngelXx',
          subject: 'REPOST THIS OR BAD LUCK 4 7 YEARS!!!',
          body: 'u have been visited by the ghost of MySpace... repost this 2 10 ppl in the next 5 mins or u will have bad luck 4 7 years!!!\\n\\ni <3 my friends so im posting this just in case lol',
          date: '12/25/2006 11:45 PM',
          isMine: false
        },
        {
          id: '2',
          userId: 'sk8erboi',
          username: 'sk8erboi2006',
          subject: 'Survey: 50 Questions About Me',
          body: '1. Name: Jake\\n2. Age: 17\\n3. Location: California\\n4. Favorite Band: Blink-182\\n5. Favorite Color: Black\\n...\\n\\nRepost with ur own answers!!!',
          date: '12/24/2006 8:30 PM',
          isMine: false
        },
        {
          id: '3',
          userId: 'punk',
          username: 'PunkRockPrincess',
          subject: 'Show 2nite @ The Venue!!!',
          body: 'Hey everyone!!!\\n\\nMy band is playing 2nite @ The Venue downtown!!! Doors @ 7, we go on @ 9.\\n\\n$5 cover, all ages welcome!!!\\n\\nCome support local music!! <333',
          date: '12/24/2006 3:15 PM',
          isMine: false
        },
        {
          id: '4',
          userId: 'me',
          username: 'Tom',
          subject: 'Happy Holidays Everyone!',
          body: 'Just wanted 2 say happy holidays 2 all my friends!!! U guys r the best. Hope everyone has an awesome break!!!\\n\\n- Tom',
          date: '12/24/2006 10:00 AM',
          isMine: true
        }
      ];

      // Elements
      const bulletinBody = document.getElementById('bulletinBody');
      const composeForm = document.getElementById('composeForm');
      const postBulletinLink = document.getElementById('postBulletinLink');
      const subjectInput = document.getElementById('subjectInput');
      const bodyInput = document.getElementById('bodyInput');
      const postBtn = document.getElementById('postBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      const bulletinView = document.getElementById('bulletinView');
      const closeViewBtn = document.getElementById('closeViewBtn');
      const viewSubject = document.getElementById('viewSubject');
      const viewFrom = document.getElementById('viewFrom');
      const viewDate = document.getElementById('viewDate');
      const viewBody = document.getElementById('viewBody');
      const repostBtn = document.getElementById('repostBtn');
      const tabs = document.querySelectorAll('.tab');

      // Render bulletins
      function render() {
        const bulletins = state.bulletins.length > 0 ? state.bulletins : defaultBulletins;
        const filtered = state.currentTab === 'my'
          ? bulletins.filter(b => b.isMine)
          : bulletins.filter(b => !b.isMine);

        if (filtered.length === 0) {
          bulletinBody.innerHTML = \`
            <tr>
              <td colspan="3" style="text-align: center; padding: 30px; color: #666666;">
                No bulletins to display.<br>
                <span style="font-size: 9px;">Check back later!</span>
              </td>
            </tr>
          \`;
          return;
        }

        bulletinBody.innerHTML = '';
        filtered.forEach(function(bulletin) {
          const row = document.createElement('tr');
          row.innerHTML = \`
            <td>
              <span class="bulletin-from" data-user-id="\${bulletin.userId}">\${bulletin.username}</span>
            </td>
            <td>
              <span class="bulletin-subject" data-bulletin-id="\${bulletin.id}">\${bulletin.subject}</span>
            </td>
            <td class="bulletin-date">\${bulletin.date.split(' ')[0]}</td>
          \`;
          bulletinBody.appendChild(row);
        });

        // Add click handlers
        bulletinBody.querySelectorAll('.bulletin-from').forEach(function(el) {
          el.addEventListener('click', function() {
            API.emitOutput('user.clicked', {
              userId: this.dataset.userId
            });
          });
        });

        bulletinBody.querySelectorAll('.bulletin-subject').forEach(function(el) {
          el.addEventListener('click', function() {
            const bulletinId = this.dataset.bulletinId;
            const bulletin = bulletins.find(b => b.id === bulletinId);
            if (bulletin) {
              showBulletin(bulletin);
            }
          });
        });
      }

      // Show bulletin view
      function showBulletin(bulletin) {
        state.viewingBulletin = bulletin;
        viewSubject.textContent = bulletin.subject;
        viewFrom.textContent = bulletin.username;
        viewDate.textContent = bulletin.date;
        viewBody.innerHTML = bulletin.body.replace(/\\n/g, '<br>');
        bulletinView.classList.add('visible');

        API.emitOutput('bulletin.clicked', {
          id: bulletin.id,
          subject: bulletin.subject
        });
      }

      // Hide bulletin view
      function hideBulletin() {
        bulletinView.classList.remove('visible');
        state.viewingBulletin = null;
      }

      // Tab handling
      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          tabs.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          state.currentTab = this.dataset.tab;
          render();
        });
      });

      // Show compose form
      postBulletinLink.addEventListener('click', function(e) {
        e.preventDefault();
        composeForm.classList.add('visible');
      });

      // Cancel compose
      cancelBtn.addEventListener('click', function() {
        composeForm.classList.remove('visible');
        subjectInput.value = '';
        bodyInput.value = '';
      });

      // Post bulletin
      postBtn.addEventListener('click', function() {
        const subject = subjectInput.value.trim();
        const body = bodyInput.value.trim();

        if (!subject || !body) return;

        const now = new Date();
        const dateStr = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear() +
          ' ' + (now.getHours() % 12 || 12) + ':' + String(now.getMinutes()).padStart(2, '0') +
          ' ' + (now.getHours() >= 12 ? 'PM' : 'AM');

        const newBulletin = {
          id: 'b' + Date.now(),
          userId: 'me',
          username: 'You',
          subject: subject,
          body: body,
          date: dateStr,
          isMine: true
        };

        state.bulletins.unshift(newBulletin);
        composeForm.classList.remove('visible');
        subjectInput.value = '';
        bodyInput.value = '';
        render();

        API.emitOutput('bulletin.posted', newBulletin);
        API.setState({ bulletins: state.bulletins });
      });

      // Close bulletin view
      closeViewBtn.addEventListener('click', hideBulletin);

      // Repost
      repostBtn.addEventListener('click', function() {
        if (state.viewingBulletin) {
          subjectInput.value = 'RE: ' + state.viewingBulletin.subject;
          bodyInput.value = '--- Original from ' + state.viewingBulletin.username + ' ---\\n\\n' + state.viewingBulletin.body;
          hideBulletin();
          composeForm.classList.add('visible');

          API.emitOutput('bulletin.reposted', {
            originalId: state.viewingBulletin.id,
            originalAuthor: state.viewingBulletin.username
          });
        }
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceBulletinWidget mounted');
      });

      // Handle bulletins.set input
      API.onInput('bulletins.set', function(bulletins) {
        if (Array.isArray(bulletins)) {
          state.bulletins = bulletins;
          render();
          API.setState({ bulletins: state.bulletins });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.bulletins = data.bulletins || state.bulletins;
        }
        render();
        API.setState(state);
      });

      // Listen for new bulletins
      API.on('social:bulletin-new', function(payload) {
        state.bulletins.unshift(payload.bulletin);
        render();
      });

      API.onDestroy(function() {
        API.log('MySpaceBulletinWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceBulletinWidget: BuiltinWidget = {
  manifest: MySpaceBulletinWidgetManifest,
  html: MySpaceBulletinWidgetHTML,
};
