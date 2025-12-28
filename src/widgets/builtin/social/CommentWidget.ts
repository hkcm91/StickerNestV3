/**
 * StickerNest v2 - Comment Widget
 * ================================
 *
 * A social widget that displays and allows interaction with comments
 * on any canvas or widget. Part of the "hidden" social media layer.
 *
 * ## Features
 * - View comments with threaded replies
 * - Add new comments
 * - Like/unlike comments
 * - Real-time updates via social:comment-new events
 *
 * ## Pipeline Integration
 *
 * Inputs:
 * - target.set: Set the target (canvasId or widgetId) to show comments for
 * - comment.add: Programmatically add a comment
 *
 * Outputs:
 * - comment.added: Emitted when user adds a comment
 * - comment.liked: Emitted when user likes a comment
 * - user.clicked: Emitted when user clicks on a commenter's avatar
 *
 * ## Event Listening
 *
 * Listens for:
 * - social:comment-new: New comment added
 * - social:comment-deleted: Comment removed
 * - social:comment-liked: Comment like state changed
 *
 * @see SocialEventBridge - Events are routed through this
 * @see useSocialStore - For relationship state (muting, etc.)
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const CommentWidgetManifest: WidgetManifest = {
  id: 'stickernest.comment-widget',
  name: 'Comments',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Display and interact with comments on canvas or widgets. Part of the social layer.',
  author: 'StickerNest',
  tags: ['social', 'comments', 'interactive', 'collaboration', 'community'],
  inputs: {
    targetId: {
      type: 'string',
      description: 'ID of the canvas or widget to show comments for',
      default: '',
    },
    targetType: {
      type: 'string',
      description: 'Type of target: "canvas" or "widget"',
      default: 'canvas',
    },
    limit: {
      type: 'number',
      description: 'Maximum comments to display',
      default: 20,
    },
  },
  outputs: {
    commentAdded: {
      type: 'object',
      description: 'Emitted when user adds a comment { id, content, parentId }',
    },
    commentLiked: {
      type: 'object',
      description: 'Emitted when user likes a comment { commentId, liked }',
    },
    userClicked: {
      type: 'object',
      description: 'Emitted when user clicks a commenter { userId, username }',
    },
    replyClicked: {
      type: 'object',
      description: 'Emitted when reply button clicked { commentId }',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['target.set', 'comment.add', 'data.refresh'],
    outputs: ['comment.added', 'comment.liked', 'user.clicked', 'ui.reply-clicked'],
  },
  events: {
    listens: ['social:comment-new', 'social:comment-deleted', 'social:comment-liked'],
    emits: ['social:comment-submitted'],
  },
  size: {
    width: 320,
    height: 400,
    minWidth: 280,
    minHeight: 200,
    scaleMode: 'stretch',
  },
};

export const CommentWidgetHTML = `
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
    .comment-count {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .comments-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    .comment {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .comment.reply {
      margin-left: 36px;
      padding-left: 12px;
      border-left: 2px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--sn-bg-tertiary, #252538);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: var(--sn-accent-primary, #8b5cf6);
      flex-shrink: 0;
      cursor: pointer;
      transition: transform 0.2s;
      overflow: hidden;
    }
    .avatar:hover {
      transform: scale(1.1);
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .comment-body {
      flex: 1;
      min-width: 0;
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .comment-author {
      font-weight: 600;
      font-size: 13px;
      color: var(--sn-text-primary, #e2e8f0);
      cursor: pointer;
    }
    .comment-author:hover {
      color: var(--sn-accent-primary, #8b5cf6);
    }
    .comment-time {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .comment-content {
      font-size: 13px;
      line-height: 1.5;
      color: var(--sn-text-secondary, #94a3b8);
      word-break: break-word;
    }
    .comment-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }
    .action-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 12px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .action-btn:hover {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .action-btn.liked {
      color: #ef4444;
    }
    .action-btn svg {
      width: 14px;
      height: 14px;
    }
    .compose {
      padding: 12px 16px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .compose-row {
      display: flex;
      gap: 10px;
    }
    .compose-input {
      flex: 1;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 20px;
      padding: 10px 16px;
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .compose-input:focus {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .compose-input::placeholder {
      color: var(--sn-text-secondary, #94a3b8);
    }
    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--sn-accent-primary, #8b5cf6);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
    }
    .send-btn:hover {
      transform: scale(1.05);
      background: #7c3aed;
    }
    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .send-btn svg {
      width: 18px;
      height: 18px;
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
    .replying-to {
      font-size: 11px;
      color: var(--sn-accent-primary, #8b5cf6);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .replying-to button {
      background: none;
      border: none;
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-title">
        <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Comments</span>
      </div>
      <span class="comment-count" id="commentCount">0</span>
    </div>

    <div class="comments-list" id="commentsList">
      <div class="empty-state" id="emptyState">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p>No comments yet.<br>Be the first to comment!</p>
      </div>
    </div>

    <div class="compose">
      <div class="replying-to" id="replyingTo" style="display: none;">
        <span>Replying to <strong id="replyingToName"></strong></span>
        <button id="cancelReply">×</button>
      </div>
      <div class="compose-row">
        <input type="text" class="compose-input" id="commentInput" placeholder="Write a comment..." />
        <button class="send-btn" id="sendBtn" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        targetId: '',
        targetType: 'canvas',
        comments: [],
        replyingTo: null
      };

      // Elements
      const commentsList = document.getElementById('commentsList');
      const emptyState = document.getElementById('emptyState');
      const commentCount = document.getElementById('commentCount');
      const commentInput = document.getElementById('commentInput');
      const sendBtn = document.getElementById('sendBtn');
      const replyingToEl = document.getElementById('replyingTo');
      const replyingToName = document.getElementById('replyingToName');
      const cancelReply = document.getElementById('cancelReply');

      // Utility: Format time ago
      function timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
      }

      // Utility: Get initials from name
      function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }

      // Render all comments
      function renderComments() {
        const topLevel = state.comments.filter(c => !c.parentId);

        if (topLevel.length === 0) {
          emptyState.style.display = 'flex';
          commentCount.textContent = '0';
          return;
        }

        emptyState.style.display = 'none';
        commentCount.textContent = state.comments.length;

        // Clear existing (except empty state)
        Array.from(commentsList.children).forEach(child => {
          if (child.id !== 'emptyState') child.remove();
        });

        // Render each comment with replies
        topLevel.forEach(comment => {
          const el = createCommentElement(comment, false);
          commentsList.appendChild(el);

          // Render replies
          const replies = state.comments.filter(c => c.parentId === comment.id);
          replies.forEach(reply => {
            const replyEl = createCommentElement(reply, true);
            commentsList.appendChild(replyEl);
          });
        });
      }

      // Create a comment element
      function createCommentElement(comment, isReply) {
        const div = document.createElement('div');
        div.className = 'comment' + (isReply ? ' reply' : '');
        div.dataset.id = comment.id;

        const avatarContent = comment.avatarUrl
          ? '<img src="' + comment.avatarUrl + '" alt="" />'
          : getInitials(comment.authorName || 'User');

        div.innerHTML = \`
          <div class="avatar" data-user-id="\${comment.authorId}">\${avatarContent}</div>
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-author" data-user-id="\${comment.authorId}">\${comment.authorName || 'Anonymous'}</span>
              <span class="comment-time">\${timeAgo(comment.createdAt)}</span>
            </div>
            <div class="comment-content">\${escapeHtml(comment.content)}</div>
            <div class="comment-actions">
              <button class="action-btn like-btn \${comment.isLiked ? 'liked' : ''}" data-id="\${comment.id}">
                <svg viewBox="0 0 24 24" fill="\${comment.isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>\${comment.likeCount || 0}</span>
              </button>
              <button class="action-btn reply-btn" data-id="\${comment.id}" data-name="\${comment.authorName}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span>Reply</span>
              </button>
            </div>
          </div>
        \`;

        // Event handlers
        div.querySelector('.avatar').addEventListener('click', () => handleUserClick(comment));
        div.querySelector('.comment-author').addEventListener('click', () => handleUserClick(comment));
        div.querySelector('.like-btn').addEventListener('click', () => handleLike(comment));
        div.querySelector('.reply-btn').addEventListener('click', () => handleReply(comment));

        return div;
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Handle user click
      function handleUserClick(comment) {
        API.emitOutput('user.clicked', {
          userId: comment.authorId,
          username: comment.authorName
        });
      }

      // Handle like
      function handleLike(comment) {
        const newLiked = !comment.isLiked;
        comment.isLiked = newLiked;
        comment.likeCount = (comment.likeCount || 0) + (newLiked ? 1 : -1);

        API.emitOutput('comment.liked', {
          commentId: comment.id,
          liked: newLiked
        });

        renderComments();
      }

      // Handle reply
      function handleReply(comment) {
        state.replyingTo = comment.id;
        replyingToName.textContent = comment.authorName;
        replyingToEl.style.display = 'flex';
        commentInput.focus();

        API.emitOutput('ui.reply-clicked', { commentId: comment.id });
      }

      // Cancel reply
      cancelReply.addEventListener('click', () => {
        state.replyingTo = null;
        replyingToEl.style.display = 'none';
      });

      // Input handling
      commentInput.addEventListener('input', () => {
        sendBtn.disabled = commentInput.value.trim().length === 0;
      });

      commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !sendBtn.disabled) {
          submitComment();
        }
      });

      sendBtn.addEventListener('click', submitComment);

      // Submit comment
      function submitComment() {
        const content = commentInput.value.trim();
        if (!content) return;

        const newComment = {
          id: 'temp-' + Date.now(),
          content: content,
          authorId: 'current-user',
          authorName: 'You',
          createdAt: new Date().toISOString(),
          parentId: state.replyingTo,
          isLiked: false,
          likeCount: 0
        };

        // Optimistic update
        state.comments.push(newComment);
        renderComments();

        // Clear input
        commentInput.value = '';
        sendBtn.disabled = true;
        state.replyingTo = null;
        replyingToEl.style.display = 'none';

        // Emit event
        API.emitOutput('comment.added', {
          id: newComment.id,
          content: content,
          parentId: newComment.parentId,
          targetId: state.targetId,
          targetType: state.targetType
        });

        API.setState({ comments: state.comments });
      }

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        state.targetId = saved.targetId || '';
        state.targetType = saved.targetType || 'canvas';
        state.comments = saved.comments || [];

        renderComments();
        API.log('CommentWidget mounted for target: ' + state.targetId);
      });

      // Handle target.set input
      API.onInput('target.set', function(value) {
        if (typeof value === 'object') {
          state.targetId = value.targetId || value.id || '';
          state.targetType = value.targetType || value.type || 'canvas';
        } else {
          state.targetId = value;
        }
        state.comments = [];
        renderComments();
        API.setState({ targetId: state.targetId, targetType: state.targetType });
        API.log('Target set to: ' + state.targetId);
      });

      // Handle comment.add input (programmatic)
      API.onInput('comment.add', function(comment) {
        if (!state.comments.some(c => c.id === comment.id)) {
          state.comments.push(comment);
          renderComments();
          API.setState({ comments: state.comments });
        }
      });

      // Handle data.refresh
      API.onInput('data.refresh', function() {
        // Widget would fetch fresh comments from API here
        // For now, just re-render
        renderComments();
      });

      // Listen for real-time comment events
      API.on('social:comment-new', function(payload) {
        if (payload.targetId === state.targetId && payload.targetType === state.targetType) {
          if (!state.comments.some(c => c.id === payload.comment.id)) {
            state.comments.push(payload.comment);
            renderComments();
            API.setState({ comments: state.comments });
          }
        }
      });

      API.on('social:comment-deleted', function(payload) {
        if (payload.targetId === state.targetId) {
          state.comments = state.comments.filter(c => c.id !== payload.commentId);
          renderComments();
          API.setState({ comments: state.comments });
        }
      });

      API.on('social:comment-liked', function(payload) {
        const comment = state.comments.find(c => c.id === payload.commentId);
        if (comment) {
          comment.likeCount = (comment.likeCount || 0) + (payload.liked ? 1 : -1);
          renderComments();
        }
      });

      API.onDestroy(function() {
        API.log('CommentWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const CommentWidget: BuiltinWidget = {
  manifest: CommentWidgetManifest,
  html: CommentWidgetHTML,
};
