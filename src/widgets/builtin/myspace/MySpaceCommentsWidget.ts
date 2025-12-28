/**
 * StickerNest v2 - MySpace Comments Widget (2006 Theme)
 * =======================================================
 *
 * The classic MySpace comment wall - where friends left messages,
 * glitter graphics, and "thanks for the add!" comments.
 * Features authentic 2006 styling with white comment boxes.
 *
 * ## Features
 * - Scrollable comment list
 * - Friend avatars with usernames
 * - Timestamp display
 * - Leave a comment form
 * - Delete own comments
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const MySpaceCommentsWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-comments',
  name: 'MySpace Comments',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 comment wall with authentic styling.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'comments', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    comments: {
      type: 'array',
      description: 'Array of comment objects',
      default: [],
    },
    userId: {
      type: 'string',
      description: 'Profile owner user ID',
      default: '',
    },
  },
  outputs: {
    commentAdded: {
      type: 'object',
      description: 'Emitted when a comment is posted',
    },
    commentDeleted: {
      type: 'object',
      description: 'Emitted when a comment is deleted',
    },
    userClicked: {
      type: 'object',
      description: 'Emitted when a commenter is clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['comments.set', 'data.set'],
    outputs: ['comment.added', 'comment.deleted', 'user.clicked'],
  },
  events: {
    listens: ['social:comment-new', 'social:comment-deleted'],
    emits: [],
  },
  size: {
    width: 400,
    height: 400,
    minWidth: 300,
    minHeight: 300,
    scaleMode: 'stretch',
  },
};

export const MySpaceCommentsWidgetHTML = `
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
      display: flex;
      flex-direction: column;
    }

    .comments-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .comments-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .comments-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }

    .comment-count {
      margin-left: auto;
      font-size: 9px;
      font-weight: normal;
      color: #99CCFF;
    }

    .comments-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .comment {
      display: flex;
      gap: 10px;
      padding: 10px;
      margin-bottom: 8px;
      background: #F8F8F8;
      border: 1px solid #DDDDDD;
    }

    .comment:hover {
      background: #F0F8FF;
      border-color: #99CCFF;
    }

    .comment-avatar {
      width: 50px;
      height: 50px;
      flex-shrink: 0;
      border: 1px solid #336699;
      background: #EEEEEE;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
    }

    .comment-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .comment-avatar-placeholder {
      font-size: 16px;
      color: #336699;
    }

    .comment-body {
      flex: 1;
      min-width: 0;
    }

    .comment-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
    }

    .comment-author {
      color: #336699;
      text-decoration: underline;
      font-weight: bold;
      font-size: 11px;
      cursor: pointer;
    }

    .comment-author:hover {
      color: #003366;
    }

    .comment-date {
      color: #999999;
      font-size: 9px;
    }

    .comment-text {
      color: #333333;
      font-size: 10px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .comment-actions {
      margin-top: 4px;
    }

    .comment-action {
      color: #FF6633;
      text-decoration: underline;
      font-size: 9px;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      font-family: inherit;
    }

    .comment-action:hover {
      color: #FF3300;
    }

    .comment-form {
      border-top: 2px solid #336699;
      padding: 10px;
      background: #E8F4F8;
      flex-shrink: 0;
    }

    .form-header {
      font-weight: bold;
      color: #003366;
      margin-bottom: 6px;
      font-size: 10px;
    }

    .form-textarea {
      width: 100%;
      height: 60px;
      padding: 6px;
      border: 1px solid #99CCFF;
      font-family: Verdana, Arial, sans-serif;
      font-size: 10px;
      resize: none;
      margin-bottom: 6px;
    }

    .form-textarea:focus {
      outline: none;
      border-color: #336699;
    }

    .form-buttons {
      display: flex;
      gap: 8px;
    }

    .form-button {
      padding: 4px 12px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 10px;
      cursor: pointer;
      border: 1px solid #336699;
    }

    .submit-btn {
      background: linear-gradient(180deg, #336699 0%, #003366 100%);
      color: #FFFFFF;
    }

    .submit-btn:hover {
      background: linear-gradient(180deg, #003366 0%, #002244 100%);
    }

    .clear-btn {
      background: #FFFFFF;
      color: #336699;
    }

    .clear-btn:hover {
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

    /* Classic MySpace-era decorations */
    .glitter {
      color: #FF69B4;
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
    <div class="comments-box">
      <div class="comments-header">
        <svg class="comments-header-icon" viewBox="0 0 24 24">
          <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
        <span id="headerTitle">Tom's Comments</span>
        <span class="comment-count">(<span id="commentCount">0</span> comments)</span>
      </div>

      <div class="comments-list" id="commentsList">
        <div class="empty-state" id="emptyState">
          <div class="empty-icon">:(</div>
          <div>No comments yet!</div>
          <div style="font-size: 9px; margin-top: 4px;">Be the first to leave a comment!</div>
        </div>
      </div>

      <div class="comment-form">
        <div class="form-header">Leave a Comment:</div>
        <textarea class="form-textarea" id="commentInput" placeholder="Type your comment here... (HTML allowed!)"></textarea>
        <div class="form-buttons">
          <button class="form-button submit-btn" id="submitBtn">Post Comment</button>
          <button class="form-button clear-btn" id="clearBtn">Clear</button>
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
        username: 'Tom',
        currentUserId: 'me',
        comments: []
      };

      // Default sample comments
      const defaultComments = [
        {
          id: '1',
          userId: 'xXDarkAngelXx',
          username: 'xXDarkAngelXx',
          avatarUrl: null,
          text: 'Thanks 4 the add!!! <3 <3 <3\\n\\nPC4PC? :)',
          timestamp: '12/24/2006 11:32 PM'
        },
        {
          id: '2',
          userId: 'sk8erboi',
          username: 'sk8erboi2006',
          avatarUrl: null,
          text: 'yo dude sick profile! check out my band we just dropped a new demo!!!',
          timestamp: '12/23/2006 8:15 PM'
        },
        {
          id: '3',
          userId: 'punk',
          username: 'PunkRockPrincess',
          avatarUrl: null,
          text: '~*~*~MERRY CHRISTMAS~*~*~\\n\\nhope u have an awesome holiday!! ttyl! <333',
          timestamp: '12/23/2006 2:41 PM'
        }
      ];

      // Elements
      const headerTitle = document.getElementById('headerTitle');
      const commentCount = document.getElementById('commentCount');
      const commentsList = document.getElementById('commentsList');
      const emptyState = document.getElementById('emptyState');
      const commentInput = document.getElementById('commentInput');
      const submitBtn = document.getElementById('submitBtn');
      const clearBtn = document.getElementById('clearBtn');

      // Get initials
      function getInitials(name) {
        return name.split(/[^a-zA-Z]/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
      }

      // Render comments
      function render() {
        headerTitle.textContent = state.username + "'s Comments";

        const comments = state.comments.length > 0 ? state.comments : defaultComments;
        commentCount.textContent = comments.length;

        if (comments.length === 0) {
          emptyState.style.display = 'block';
          return;
        }

        emptyState.style.display = 'none';

        // Clear and rebuild (keeping empty state hidden)
        const fragment = document.createDocumentFragment();

        comments.forEach(function(comment) {
          const commentEl = document.createElement('div');
          commentEl.className = 'comment';
          commentEl.innerHTML = \`
            <div class="comment-avatar" data-user-id="\${comment.userId}">
              \${comment.avatarUrl
                ? '<img src="' + comment.avatarUrl + '" alt="' + comment.username + '" />'
                : '<span class="comment-avatar-placeholder">' + getInitials(comment.username) + '</span>'
              }
            </div>
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author" data-user-id="\${comment.userId}">\${comment.username}</span>
                <span class="comment-date">\${comment.timestamp}</span>
              </div>
              <div class="comment-text">\${comment.text.replace(/\\n/g, '<br>')}</div>
              <div class="comment-actions">
                \${comment.userId === state.currentUserId
                  ? '<button class="comment-action delete-btn" data-comment-id="' + comment.id + '">Delete</button>'
                  : '<button class="comment-action reply-btn" data-user-id="' + comment.userId + '">Reply</button>'
                }
              </div>
            </div>
          \`;

          fragment.appendChild(commentEl);
        });

        // Remove old comments (but not empty state)
        Array.from(commentsList.querySelectorAll('.comment')).forEach(el => el.remove());
        commentsList.appendChild(fragment);

        // Add click handlers
        commentsList.querySelectorAll('.comment-author, .comment-avatar').forEach(function(el) {
          el.addEventListener('click', function() {
            const userId = this.dataset.userId;
            const comment = comments.find(c => c.userId === userId);
            if (comment) {
              API.emitOutput('user.clicked', {
                userId: comment.userId,
                username: comment.username
              });
            }
          });
        });

        commentsList.querySelectorAll('.delete-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const commentId = this.dataset.commentId;
            state.comments = state.comments.filter(c => c.id !== commentId);
            render();
            API.emitOutput('comment.deleted', { commentId: commentId });
            API.setState({ comments: state.comments });
          });
        });
      }

      // Post comment
      submitBtn.addEventListener('click', function() {
        const text = commentInput.value.trim();
        if (!text) return;

        const now = new Date();
        const timestamp = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear() +
          ' ' + (now.getHours() % 12 || 12) + ':' + String(now.getMinutes()).padStart(2, '0') +
          ' ' + (now.getHours() >= 12 ? 'PM' : 'AM');

        const newComment = {
          id: 'c' + Date.now(),
          userId: state.currentUserId,
          username: 'You',
          avatarUrl: null,
          text: text,
          timestamp: timestamp
        };

        state.comments.unshift(newComment);
        commentInput.value = '';
        render();

        API.emitOutput('comment.added', newComment);
        API.setState({ comments: state.comments });
      });

      clearBtn.addEventListener('click', function() {
        commentInput.value = '';
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceCommentsWidget mounted');
      });

      // Handle comments.set input
      API.onInput('comments.set', function(comments) {
        if (Array.isArray(comments)) {
          state.comments = comments;
          render();
          API.setState({ comments: state.comments });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.userId = data.userId || state.userId;
          state.username = data.username || state.username;
          state.currentUserId = data.currentUserId || state.currentUserId;
          state.comments = data.comments || state.comments;
        }
        render();
        API.setState(state);
      });

      // Listen for new comments
      API.on('social:comment-new', function(payload) {
        if (payload.targetId === state.userId) {
          state.comments.unshift(payload.comment);
          render();
        }
      });

      API.onDestroy(function() {
        API.log('MySpaceCommentsWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceCommentsWidget: BuiltinWidget = {
  manifest: MySpaceCommentsWidgetManifest,
  html: MySpaceCommentsWidgetHTML,
};
