/**
 * StickerNest v2 - LiveChatWidget
 * ================================
 *
 * Real-time chat widget for canvas collaboration.
 * Enables live messaging between users viewing the same canvas.
 *
 * ## Features
 *
 * - Real-time message delivery via WebSocket
 * - Message history with pagination
 * - Typing indicators
 * - User presence awareness
 * - Emoji reactions on messages
 * - Reply threading
 * - Message timestamps with relative time
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │                    LiveChatWidget                        │
 * ├─────────────────────────────────────────────────────────┤
 * │  ┌─────────────────────────────────────────────────┐    │
 * │  │              Message List                        │    │
 * │  │  ┌────────────────────────────────────────────┐ │    │
 * │  │  │ 👤 Alice                          2m ago   │ │    │
 * │  │  │ Hey, check out this widget!               │ │    │
 * │  │  │                              😊 👍 💡 ↩️  │ │    │
 * │  │  └────────────────────────────────────────────┘ │    │
 * │  │  ┌────────────────────────────────────────────┐ │    │
 * │  │  │ 👤 Bob (You)                      Just now │ │    │
 * │  │  │ Nice! I love the animation.               │ │    │
 * │  │  └────────────────────────────────────────────┘ │    │
 * │  └─────────────────────────────────────────────────┘    │
 * │  ┌─────────────────────────────────────────────────┐    │
 * │  │  Alice is typing...                             │    │
 * │  └─────────────────────────────────────────────────┘    │
 * │  ┌─────────────────────────────────────────────────┐    │
 * │  │ [Message input...]                    [Send ➤] │    │
 * │  └─────────────────────────────────────────────────┘    │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Pipeline I/O
 *
 * **Inputs:**
 * - canvasId: Canvas to chat in
 * - maxMessages: Max messages to show (default: 50)
 * - showTypingIndicator: Show who's typing
 *
 * **Outputs:**
 * - messageSent: When user sends a message
 * - userClicked: When user avatar/name is clicked
 * - reactionAdded: When reaction is added to message
 *
 * ## Events (Broadcast)
 *
 * Listens for:
 * - social:chat-message-new: New message received
 * - social:chat-typing: Typing indicator update
 * - social:presence-update: User join/leave
 *
 * @see ChatService - For WebSocket messaging
 * @see PresenceWidget - For canvas presence
 *
 * @author StickerNest Team
 * @since v2.0.0
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

// ============================================================================
// MANIFEST
// ============================================================================

export const LiveChatWidgetManifest: WidgetManifest = {
  id: 'stickernest.live-chat',
  name: 'Live Chat',
  version: '1.0.0',
  description: 'Real-time chat for canvas collaboration',
  author: 'StickerNest',
  category: 'social',
  tags: ['chat', 'messaging', 'real-time', 'collaboration', 'social'],

  // Default size for chat widget
  defaultSize: {
    width: 320,
    height: 480
  },

  minSize: {
    width: 280,
    height: 300
  },

  // Pipeline inputs
  inputs: [
    {
      name: 'canvasId',
      type: 'string',
      description: 'Canvas ID to join chat for'
    },
    {
      name: 'maxMessages',
      type: 'number',
      description: 'Maximum messages to display (default: 50)'
    },
    {
      name: 'showTypingIndicator',
      type: 'boolean',
      description: 'Show typing indicators (default: true)'
    }
  ],

  // Pipeline outputs
  outputs: [
    {
      name: 'messageSent',
      type: 'object',
      description: 'Emitted when a message is sent { messageId, content, timestamp }'
    },
    {
      name: 'userClicked',
      type: 'string',
      description: 'Emitted when a user avatar/name is clicked (userId)'
    },
    {
      name: 'reactionAdded',
      type: 'object',
      description: 'Emitted when reaction added { messageId, reaction, userId }'
    }
  ],

  permissions: ['network', 'storage']
};

// ============================================================================
// HTML TEMPLATE
// ============================================================================

export const LiveChatWidgetHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Chat</title>
  <style>
    /* ========================================
     * CSS Custom Properties (StickerNest Theme)
     * ======================================== */
    :root {
      /* Surface colors - use CSS vars from host when available */
      --chat-bg: var(--sn-surface-1, #1a1a2e);
      --chat-surface: var(--sn-surface-2, #16213e);
      --chat-surface-hover: var(--sn-surface-3, #1f3460);
      --chat-border: var(--sn-border, #2a2a4a);

      /* Text colors */
      --chat-text: var(--sn-text-primary, #e8e8e8);
      --chat-text-secondary: var(--sn-text-secondary, #a0a0a0);
      --chat-text-muted: var(--sn-text-muted, #666);

      /* Accent colors */
      --chat-accent: var(--sn-accent, #6c5ce7);
      --chat-accent-hover: var(--sn-accent-hover, #7d6ef0);
      --chat-own-message: var(--sn-accent-subtle, #4834d4);

      /* Status colors */
      --chat-online: var(--sn-success, #00d26a);
      --chat-typing: var(--sn-info, #4dabf7);

      /* Spacing */
      --chat-spacing-xs: 4px;
      --chat-spacing-sm: 8px;
      --chat-spacing-md: 12px;
      --chat-spacing-lg: 16px;

      /* Border radius */
      --chat-radius-sm: 4px;
      --chat-radius-md: 8px;
      --chat-radius-lg: 16px;
      --chat-radius-full: 9999px;

      /* Typography */
      --chat-font: var(--sn-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      --chat-font-size: 14px;
      --chat-font-size-sm: 12px;
      --chat-font-size-xs: 10px;

      /* Shadows */
      --chat-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    /* ========================================
     * Base Styles
     * ======================================== */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      height: 100%;
      overflow: hidden;
    }

    body {
      font-family: var(--chat-font);
      font-size: var(--chat-font-size);
      color: var(--chat-text);
      background: var(--chat-bg);
      display: flex;
      flex-direction: column;
    }

    /* ========================================
     * Chat Container
     * ======================================== */
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    /* ========================================
     * Header
     * ======================================== */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--chat-spacing-md);
      background: var(--chat-surface);
      border-bottom: 1px solid var(--chat-border);
      flex-shrink: 0;
    }

    .chat-title {
      display: flex;
      align-items: center;
      gap: var(--chat-spacing-sm);
    }

    .chat-title h1 {
      font-size: var(--chat-font-size);
      font-weight: 600;
    }

    .online-count {
      display: flex;
      align-items: center;
      gap: var(--chat-spacing-xs);
      font-size: var(--chat-font-size-sm);
      color: var(--chat-text-secondary);
    }

    .online-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--chat-online);
    }

    /* ========================================
     * Message List
     * ======================================== */
    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: var(--chat-spacing-md);
      display: flex;
      flex-direction: column;
      gap: var(--chat-spacing-md);
    }

    .message-list::-webkit-scrollbar {
      width: 6px;
    }

    .message-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .message-list::-webkit-scrollbar-thumb {
      background: var(--chat-border);
      border-radius: var(--chat-radius-full);
    }

    /* ========================================
     * Message Item
     * ======================================== */
    .message {
      display: flex;
      gap: var(--chat-spacing-sm);
      animation: messageIn 0.2s ease-out;
    }

    @keyframes messageIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message.own {
      flex-direction: row-reverse;
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .message-avatar:hover {
      transform: scale(1.1);
    }

    .avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--chat-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: var(--chat-font-size-sm);
      flex-shrink: 0;
      cursor: pointer;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      gap: var(--chat-spacing-xs);
      max-width: 75%;
    }

    .message.own .message-content {
      align-items: flex-end;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: var(--chat-spacing-sm);
    }

    .message.own .message-header {
      flex-direction: row-reverse;
    }

    .message-author {
      font-weight: 600;
      font-size: var(--chat-font-size-sm);
      cursor: pointer;
    }

    .message-author:hover {
      color: var(--chat-accent);
    }

    .message-time {
      font-size: var(--chat-font-size-xs);
      color: var(--chat-text-muted);
    }

    .message-bubble {
      background: var(--chat-surface);
      padding: var(--chat-spacing-sm) var(--chat-spacing-md);
      border-radius: var(--chat-radius-lg);
      border-top-left-radius: var(--chat-radius-sm);
      line-height: 1.4;
      word-wrap: break-word;
    }

    .message.own .message-bubble {
      background: var(--chat-own-message);
      border-top-left-radius: var(--chat-radius-lg);
      border-top-right-radius: var(--chat-radius-sm);
    }

    /* Reply thread indicator */
    .message-reply-indicator {
      display: flex;
      align-items: center;
      gap: var(--chat-spacing-xs);
      font-size: var(--chat-font-size-xs);
      color: var(--chat-text-muted);
      margin-bottom: var(--chat-spacing-xs);
      cursor: pointer;
    }

    .message-reply-indicator:hover {
      color: var(--chat-accent);
    }

    /* ========================================
     * Message Reactions
     * ======================================== */
    .message-reactions {
      display: flex;
      gap: var(--chat-spacing-xs);
      flex-wrap: wrap;
      margin-top: var(--chat-spacing-xs);
    }

    .reaction {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px 6px;
      background: var(--chat-surface);
      border: 1px solid var(--chat-border);
      border-radius: var(--chat-radius-full);
      font-size: var(--chat-font-size-xs);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .reaction:hover {
      background: var(--chat-surface-hover);
      border-color: var(--chat-accent);
    }

    .reaction.own {
      background: var(--chat-accent);
      border-color: var(--chat-accent);
      color: white;
    }

    .reaction-count {
      font-weight: 500;
    }

    /* ========================================
     * Message Actions (on hover)
     * ======================================== */
    .message-actions {
      display: none;
      position: absolute;
      top: -8px;
      right: 0;
      background: var(--chat-surface);
      border: 1px solid var(--chat-border);
      border-radius: var(--chat-radius-md);
      padding: 2px;
      gap: 2px;
      box-shadow: var(--chat-shadow);
    }

    .message-wrapper {
      position: relative;
    }

    .message-wrapper:hover .message-actions {
      display: flex;
    }

    .action-btn {
      background: none;
      border: none;
      padding: 4px 6px;
      cursor: pointer;
      border-radius: var(--chat-radius-sm);
      font-size: var(--chat-font-size-sm);
      transition: background 0.15s ease;
    }

    .action-btn:hover {
      background: var(--chat-surface-hover);
    }

    /* ========================================
     * Typing Indicator
     * ======================================== */
    .typing-indicator {
      display: none;
      padding: var(--chat-spacing-sm) var(--chat-spacing-md);
      font-size: var(--chat-font-size-sm);
      color: var(--chat-typing);
      animation: pulse 1.5s infinite;
    }

    .typing-indicator.visible {
      display: block;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .typing-dots {
      display: inline-flex;
      gap: 2px;
      margin-left: 4px;
    }

    .typing-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--chat-typing);
      animation: typingBounce 1.4s infinite;
    }

    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingBounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }

    /* ========================================
     * Input Area
     * ======================================== */
    .input-area {
      display: flex;
      align-items: flex-end;
      gap: var(--chat-spacing-sm);
      padding: var(--chat-spacing-md);
      background: var(--chat-surface);
      border-top: 1px solid var(--chat-border);
      flex-shrink: 0;
    }

    .input-wrapper {
      flex: 1;
      position: relative;
    }

    .message-input {
      width: 100%;
      min-height: 40px;
      max-height: 120px;
      padding: var(--chat-spacing-sm) var(--chat-spacing-md);
      background: var(--chat-bg);
      border: 1px solid var(--chat-border);
      border-radius: var(--chat-radius-lg);
      color: var(--chat-text);
      font-family: var(--chat-font);
      font-size: var(--chat-font-size);
      resize: none;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .message-input:focus {
      border-color: var(--chat-accent);
    }

    .message-input::placeholder {
      color: var(--chat-text-muted);
    }

    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--chat-accent);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .send-btn:hover {
      background: var(--chat-accent-hover);
      transform: scale(1.05);
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

    /* ========================================
     * Empty State
     * ======================================== */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: var(--chat-spacing-lg);
      text-align: center;
      color: var(--chat-text-secondary);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--chat-spacing-md);
      opacity: 0.5;
    }

    .empty-text {
      font-size: var(--chat-font-size);
    }

    /* ========================================
     * Reaction Picker
     * ======================================== */
    .reaction-picker {
      display: none;
      position: absolute;
      bottom: 100%;
      left: 0;
      background: var(--chat-surface);
      border: 1px solid var(--chat-border);
      border-radius: var(--chat-radius-md);
      padding: var(--chat-spacing-sm);
      gap: var(--chat-spacing-xs);
      box-shadow: var(--chat-shadow);
      z-index: 100;
    }

    .reaction-picker.visible {
      display: flex;
    }

    .reaction-option {
      padding: 4px 8px;
      cursor: pointer;
      border-radius: var(--chat-radius-sm);
      transition: background 0.15s ease;
    }

    .reaction-option:hover {
      background: var(--chat-surface-hover);
    }

    /* ========================================
     * Loading State
     * ======================================== */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--chat-spacing-lg);
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--chat-border);
      border-top-color: var(--chat-accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ========================================
     * Date Separator
     * ======================================== */
    .date-separator {
      display: flex;
      align-items: center;
      gap: var(--chat-spacing-md);
      margin: var(--chat-spacing-md) 0;
    }

    .date-separator::before,
    .date-separator::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--chat-border);
    }

    .date-separator span {
      font-size: var(--chat-font-size-xs);
      color: var(--chat-text-muted);
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <!-- Header -->
    <header class="chat-header">
      <div class="chat-title">
        <h1>💬 Canvas Chat</h1>
      </div>
      <div class="online-count">
        <span class="online-dot"></span>
        <span id="online-count">0 online</span>
      </div>
    </header>

    <!-- Message List -->
    <div class="message-list" id="message-list">
      <div class="empty-state" id="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-text">No messages yet.<br>Start the conversation!</div>
      </div>
    </div>

    <!-- Typing Indicator -->
    <div class="typing-indicator" id="typing-indicator">
      <span id="typing-users">Someone</span> is typing
      <span class="typing-dots">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </span>
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <div class="input-wrapper">
        <textarea
          class="message-input"
          id="message-input"
          placeholder="Type a message..."
          rows="1"
        ></textarea>
      </div>
      <button class="send-btn" id="send-btn" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
  </div>

  <script>
    /**
     * LiveChatWidget Client Script
     * ============================
     *
     * Handles real-time messaging, typing indicators, and reactions.
     * Communicates with host via postMessage (WidgetAPI Protocol v3.0).
     */

    // ========================================
    // State
    // ========================================
    const state = {
      canvasId: null,
      maxMessages: 50,
      showTypingIndicator: true,
      messages: [],
      currentUserId: null,
      currentUserName: 'Anonymous',
      onlineUsers: new Map(),
      typingUsers: new Map(),
      replyingTo: null,
      isLoading: false
    };

    // Quick reactions
    const REACTIONS = ['😊', '👍', '❤️', '😂', '😮', '🎉'];

    // ========================================
    // DOM Elements
    // ========================================
    const elements = {
      messageList: document.getElementById('message-list'),
      emptyState: document.getElementById('empty-state'),
      typingIndicator: document.getElementById('typing-indicator'),
      typingUsers: document.getElementById('typing-users'),
      messageInput: document.getElementById('message-input'),
      sendBtn: document.getElementById('send-btn'),
      onlineCount: document.getElementById('online-count')
    };

    // ========================================
    // WidgetAPI Communication (Protocol v3.0)
    // ========================================

    /**
     * Send message to host application
     */
    function sendToHost(type, payload = {}) {
      window.parent.postMessage({
        type,
        source: 'widget',
        widgetId: 'stickernest.live-chat',
        payload
      }, '*');
    }

    /**
     * Emit output event for pipeline connections
     */
    function emitOutput(name, value) {
      sendToHost('widget:output', { name, value });
    }

    /**
     * Initialize widget - request current user info
     */
    function initWidget() {
      sendToHost('widget:ready');
      sendToHost('widget:request-user');
      sendToHost('widget:subscribe-events', {
        events: [
          'social:chat-message-new',
          'social:chat-message-deleted',
          'social:chat-typing',
          'social:presence-update',
          'presence:user-joined',
          'presence:user-left'
        ]
      });
    }

    // ========================================
    // Message Handling
    // ========================================

    /**
     * Format relative time
     */
    function formatRelativeTime(timestamp) {
      const now = Date.now();
      const diff = now - new Date(timestamp).getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60) return 'Just now';
      if (minutes < 60) return minutes + 'm ago';
      if (hours < 24) return hours + 'h ago';
      if (days < 7) return days + 'd ago';

      return new Date(timestamp).toLocaleDateString();
    }

    /**
     * Get initials from name
     */
    function getInitials(name) {
      return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }

    /**
     * Render a single message
     */
    function renderMessage(message) {
      const isOwn = message.userId === state.currentUserId;
      const wrapper = document.createElement('div');
      wrapper.className = 'message-wrapper';
      wrapper.dataset.messageId = message.id;

      const messageDiv = document.createElement('div');
      messageDiv.className = 'message' + (isOwn ? ' own' : '');

      // Avatar
      const avatarHtml = message.userAvatar
        ? '<img class="message-avatar" src="' + message.userAvatar + '" alt="' + message.userName + '" data-user-id="' + message.userId + '">'
        : '<div class="avatar-placeholder" data-user-id="' + message.userId + '">' + getInitials(message.userName) + '</div>';

      // Reply indicator
      let replyHtml = '';
      if (message.replyTo) {
        replyHtml = '<div class="message-reply-indicator">↩️ Reply to ' + (message.replyToName || 'a message') + '</div>';
      }

      // Reactions
      let reactionsHtml = '';
      if (message.reactions && Object.keys(message.reactions).length > 0) {
        reactionsHtml = '<div class="message-reactions">';
        for (const [emoji, users] of Object.entries(message.reactions)) {
          const isOwnReaction = users.includes(state.currentUserId);
          reactionsHtml += '<span class="reaction' + (isOwnReaction ? ' own' : '') + '" data-emoji="' + emoji + '">';
          reactionsHtml += emoji + ' <span class="reaction-count">' + users.length + '</span>';
          reactionsHtml += '</span>';
        }
        reactionsHtml += '</div>';
      }

      messageDiv.innerHTML = \`
        \${avatarHtml}
        <div class="message-content">
          \${replyHtml}
          <div class="message-header">
            <span class="message-author" data-user-id="\${message.userId}">\${message.userName}</span>
            <span class="message-time">\${formatRelativeTime(message.timestamp)}</span>
          </div>
          <div class="message-bubble">\${escapeHtml(message.content)}</div>
          \${reactionsHtml}
        </div>
      \`;

      // Actions (show on hover)
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';
      actionsDiv.innerHTML = \`
        <button class="action-btn" data-action="react" title="React">😊</button>
        <button class="action-btn" data-action="reply" title="Reply">↩️</button>
      \`;

      wrapper.appendChild(messageDiv);
      wrapper.appendChild(actionsDiv);

      return wrapper;
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * Render all messages
     */
    function renderMessages() {
      // Clear existing messages (except empty state)
      const children = Array.from(elements.messageList.children);
      children.forEach(child => {
        if (child.id !== 'empty-state') {
          child.remove();
        }
      });

      // Show/hide empty state
      elements.emptyState.style.display = state.messages.length === 0 ? 'flex' : 'none';

      // Group messages by date
      let lastDate = null;

      state.messages.forEach(message => {
        const messageDate = new Date(message.timestamp).toDateString();

        // Add date separator if new day
        if (messageDate !== lastDate) {
          lastDate = messageDate;
          const separator = document.createElement('div');
          separator.className = 'date-separator';
          separator.innerHTML = '<span>' + formatDateSeparator(message.timestamp) + '</span>';
          elements.messageList.appendChild(separator);
        }

        const messageEl = renderMessage(message);
        elements.messageList.appendChild(messageEl);
      });

      // Scroll to bottom
      scrollToBottom();
    }

    /**
     * Format date separator text
     */
    function formatDateSeparator(timestamp) {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      }
    }

    /**
     * Add a new message to the list
     */
    function addMessage(message) {
      // Check for duplicates
      if (state.messages.some(m => m.id === message.id)) {
        return;
      }

      state.messages.push(message);

      // Limit messages
      if (state.messages.length > state.maxMessages) {
        state.messages = state.messages.slice(-state.maxMessages);
      }

      // Persist messages to widget state store
      API.setState({ messages: state.messages });

      renderMessages();
    }

    /**
     * Scroll message list to bottom
     */
    function scrollToBottom() {
      elements.messageList.scrollTop = elements.messageList.scrollHeight;
    }

    // ========================================
    // Typing Indicator
    // ========================================

    let typingTimeout = null;

    /**
     * Update typing indicator display
     */
    function updateTypingIndicator() {
      const typingUserNames = Array.from(state.typingUsers.values())
        .filter(u => u.id !== state.currentUserId);

      if (typingUserNames.length === 0 || !state.showTypingIndicator) {
        elements.typingIndicator.classList.remove('visible');
        return;
      }

      elements.typingIndicator.classList.add('visible');

      if (typingUserNames.length === 1) {
        elements.typingUsers.textContent = typingUserNames[0].name;
      } else if (typingUserNames.length === 2) {
        elements.typingUsers.textContent = typingUserNames[0].name + ' and ' + typingUserNames[1].name;
      } else {
        elements.typingUsers.textContent = typingUserNames.length + ' people';
      }
    }

    /**
     * Send typing indicator
     */
    function sendTypingIndicator() {
      sendToHost('widget:broadcast', {
        event: 'social:chat-typing',
        payload: {
          canvasId: state.canvasId,
          userId: state.currentUserId,
          userName: state.currentUserName,
          isTyping: true
        }
      });

      // Clear after 3 seconds
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        sendToHost('widget:broadcast', {
          event: 'social:chat-typing',
          payload: {
            canvasId: state.canvasId,
            userId: state.currentUserId,
            userName: state.currentUserName,
            isTyping: false
          }
        });
      }, 3000);
    }

    // ========================================
    // Online Users
    // ========================================

    /**
     * Update online count display
     */
    function updateOnlineCount() {
      const count = state.onlineUsers.size;
      elements.onlineCount.textContent = count + ' online';
    }

    // ========================================
    // Send Message
    // ========================================

    /**
     * Send a new message
     */
    function sendMessage() {
      console.log('[LiveChat] sendMessage() called!');
      const content = elements.messageInput.value.trim();
      console.log('[LiveChat] Content:', content, 'Length:', content.length);
      if (!content) {
        console.log('[LiveChat] No content, returning early');
        return;
      }

      const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

      const message = {
        id: messageId,
        canvasId: state.canvasId,
        userId: state.currentUserId,
        userName: state.currentUserName,
        content: content,
        timestamp: new Date().toISOString(),
        replyTo: state.replyingTo?.id || null,
        replyToName: state.replyingTo?.userName || null,
        reactions: {}
      };

      console.log('[LiveChat] Created message:', message);

      // Add to local state immediately (optimistic)
      addMessage(message);

      // Clear input
      elements.messageInput.value = '';
      elements.sendBtn.disabled = true;
      autoResizeInput();

      // Clear reply state
      state.replyingTo = null;

      // Broadcast to other widgets/users via EventBus
      console.log('[LiveChat] Checking window.WidgetAPI:', typeof window.WidgetAPI, window.WidgetAPI ? 'exists' : 'undefined');
      const API = window.WidgetAPI;
      if (API) {
        console.log('[LiveChat] API.emit:', typeof API.emit, API.emit ? 'exists' : 'undefined');
      }
      if (API && API.emit) {
        console.log('[LiveChat] About to emit social:chat-message...');
        API.emit('social:chat-message', message, 'canvas');
        console.log('[LiveChat] Emitted social:chat-message:', message);
      } else {
        console.error('[LiveChat] Cannot emit! API:', API, 'emit:', API ? API.emit : 'N/A');
      }

      // Emit output for pipeline connections
      emitOutput('messageSent', {
        messageId: message.id,
        content: message.content,
        timestamp: message.timestamp
      });

      // Clear typing indicator
      if (typingTimeout) clearTimeout(typingTimeout);
    }

    // ========================================
    // Reactions
    // ========================================

    /**
     * Add reaction to a message
     */
    function addReaction(messageId, emoji) {
      const message = state.messages.find(m => m.id === messageId);
      if (!message) return;

      if (!message.reactions) message.reactions = {};
      if (!message.reactions[emoji]) message.reactions[emoji] = [];

      const userIndex = message.reactions[emoji].indexOf(state.currentUserId);

      if (userIndex === -1) {
        // Add reaction
        message.reactions[emoji].push(state.currentUserId);
      } else {
        // Remove reaction (toggle)
        message.reactions[emoji].splice(userIndex, 1);
        if (message.reactions[emoji].length === 0) {
          delete message.reactions[emoji];
        }
      }

      renderMessages();

      // Emit output
      emitOutput('reactionAdded', {
        messageId,
        reaction: emoji,
        userId: state.currentUserId
      });

      // Broadcast reaction change
      sendToHost('widget:broadcast', {
        event: 'social:chat-reaction',
        payload: {
          canvasId: state.canvasId,
          messageId,
          emoji,
          userId: state.currentUserId,
          action: userIndex === -1 ? 'add' : 'remove'
        }
      });
    }

    // ========================================
    // Input Handling
    // ========================================

    /**
     * Auto-resize textarea based on content
     */
    function autoResizeInput() {
      const input = elements.messageInput;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    // ========================================
    // Event Listeners
    // ========================================

    // Message input
    elements.messageInput.addEventListener('input', () => {
      elements.sendBtn.disabled = !elements.messageInput.value.trim();
      autoResizeInput();
      sendTypingIndicator();
    });

    // Send on Enter (Shift+Enter for newline)
    elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Send button click
    elements.sendBtn.addEventListener('click', sendMessage);

    // Click handlers for message list (delegation)
    elements.messageList.addEventListener('click', (e) => {
      const target = e.target;

      // User click (avatar or name)
      if (target.dataset.userId) {
        emitOutput('userClicked', target.dataset.userId);
        return;
      }

      // Reaction click
      if (target.classList.contains('reaction') || target.closest('.reaction')) {
        const reactionEl = target.classList.contains('reaction') ? target : target.closest('.reaction');
        const messageWrapper = reactionEl.closest('.message-wrapper');
        const emoji = reactionEl.dataset.emoji;
        if (messageWrapper && emoji) {
          addReaction(messageWrapper.dataset.messageId, emoji);
        }
        return;
      }

      // Action buttons
      const actionBtn = target.closest('.action-btn');
      if (actionBtn) {
        const messageWrapper = actionBtn.closest('.message-wrapper');
        const messageId = messageWrapper?.dataset.messageId;
        const action = actionBtn.dataset.action;

        if (action === 'react' && messageId) {
          // Show reaction picker (simple: cycle through first reaction)
          addReaction(messageId, REACTIONS[0]);
        } else if (action === 'reply' && messageId) {
          const message = state.messages.find(m => m.id === messageId);
          if (message) {
            state.replyingTo = message;
            elements.messageInput.placeholder = 'Reply to ' + message.userName + '...';
            elements.messageInput.focus();
          }
        }
      }
    });

    // ========================================
    // Host Message Handler
    // ========================================

    window.addEventListener('message', (event) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case 'widget:init':
          // Initial configuration from host
          if (payload.config) {
            state.canvasId = payload.config.canvasId || state.canvasId;
            state.maxMessages = payload.config.maxMessages || state.maxMessages;
            state.showTypingIndicator = payload.config.showTypingIndicator !== false;
          }
          break;

        case 'widget:input':
          // Pipeline input
          if (payload.name === 'canvasId') state.canvasId = payload.value;
          if (payload.name === 'maxMessages') state.maxMessages = payload.value;
          if (payload.name === 'showTypingIndicator') state.showTypingIndicator = payload.value;
          break;

        case 'widget:user-info':
          // Current user info
          state.currentUserId = payload.userId;
          state.currentUserName = payload.userName || 'Anonymous';
          break;

        case 'widget:event':
          // Broadcast events
          handleBroadcastEvent(payload);
          break;

        case 'widget:load-history':
          // Load message history
          if (payload.messages && Array.isArray(payload.messages)) {
            state.messages = payload.messages.slice(-state.maxMessages);
            renderMessages();
          }
          break;
      }
    });

    /**
     * Handle broadcast events from other widgets/users
     */
    function handleBroadcastEvent(payload) {
      const { event, data } = payload;

      switch (event) {
        case 'social:chat-message-new':
          // New message from another user
          if (data.canvasId === state.canvasId) {
            addMessage(data);
          }
          break;

        case 'social:chat-message-deleted':
          // Message deleted
          if (data.canvasId === state.canvasId) {
            state.messages = state.messages.filter(m => m.id !== data.messageId);
            renderMessages();
          }
          break;

        case 'social:chat-typing':
          // Typing indicator from another user
          if (data.canvasId === state.canvasId) {
            if (data.isTyping) {
              state.typingUsers.set(data.userId, { id: data.userId, name: data.userName });
            } else {
              state.typingUsers.delete(data.userId);
            }
            updateTypingIndicator();
          }
          break;

        case 'social:current-user':
          // Set current user info
          state.currentUserId = data.userId;
          state.currentUserName = data.userName || data.username || 'Anonymous';
          console.log('[LiveChat] Current user set:', state.currentUserId, state.currentUserName);
          break;

        case 'social:presence-update':
        case 'presence:user-joined':
          // User joined canvas
          if (data.canvasId === state.canvasId || !data.canvasId) {
            state.onlineUsers.set(data.userId, {
              id: data.userId,
              name: data.userName || data.username || 'Anonymous',
              avatar: data.userAvatar || data.avatarUrl
            });
            updateOnlineCount();
          }
          break;

        case 'presence:user-left':
          // User left canvas
          state.onlineUsers.delete(data.userId);
          state.typingUsers.delete(data.userId);
          updateOnlineCount();
          updateTypingIndicator();
          break;

        case 'social:chat-reaction':
          // Reaction update from another user
          if (data.canvasId === state.canvasId) {
            const message = state.messages.find(m => m.id === data.messageId);
            if (message) {
              if (!message.reactions) message.reactions = {};
              if (!message.reactions[data.emoji]) message.reactions[data.emoji] = [];

              if (data.action === 'add') {
                if (!message.reactions[data.emoji].includes(data.userId)) {
                  message.reactions[data.emoji].push(data.userId);
                }
              } else {
                const idx = message.reactions[data.emoji].indexOf(data.userId);
                if (idx !== -1) {
                  message.reactions[data.emoji].splice(idx, 1);
                  if (message.reactions[data.emoji].length === 0) {
                    delete message.reactions[data.emoji];
                  }
                }
              }
              renderMessages();
            }
          }
          break;
      }
    }

    // ========================================
    // Initialize
    // ========================================
    initWidget();

    // Subscribe to social events via WidgetAPI
    const API = window.WidgetAPI;
    if (API && API.on) {
      // Load persisted state on mount
      API.onMount(function(context) {
        console.log('[LiveChat] onMount called with context:', context);
        if (context.state && context.state.messages && Array.isArray(context.state.messages)) {
          console.log('[LiveChat] Loading', context.state.messages.length, 'persisted messages');
          state.messages = context.state.messages;
          renderMessages();
        }
        // Also load other persisted state
        if (context.state && context.state.currentUserId) {
          state.currentUserId = context.state.currentUserId;
          state.currentUserName = context.state.currentUserName || 'Anonymous';
        }
        if (context.canvasId) {
          state.canvasId = context.canvasId;
        }
      });

      API.on('social:current-user', function(data) {
        state.currentUserId = data.userId;
        state.currentUserName = data.userName || data.username || 'Anonymous';
        console.log('[LiveChat] Current user set via API.on:', state.currentUserId, state.currentUserName);
        // Persist user info
        API.setState({ currentUserId: state.currentUserId, currentUserName: state.currentUserName });
      });

      API.on('social:chat-message-new', function(data) {
        if (data.canvasId === state.canvasId || !state.canvasId) {
          addMessage(data);
        }
      });

      // Also listen for social:chat-message (cross-canvas forwarded messages)
      API.on('social:chat-message', function(data) {
        // Don't add our own messages again (we already added them locally)
        if (data.userId === state.currentUserId) return;
        console.log('[LiveChat] Received cross-canvas message:', data);
        addMessage(data);
      });

      API.on('presence:user-joined', function(data) {
        if (data.canvasId === state.canvasId || !data.canvasId) {
          state.onlineUsers.set(data.userId, {
            id: data.userId,
            name: data.userName || data.username || 'Anonymous',
            avatar: data.userAvatar || data.avatarUrl
          });
          updateOnlineCount();
        }
      });

      API.on('presence:user-left', function(data) {
        state.onlineUsers.delete(data.userId);
        state.typingUsers.delete(data.userId);
        updateOnlineCount();
        updateTypingIndicator();
      });

      API.on('social:chat-typing', function(data) {
        if (data.canvasId === state.canvasId || !state.canvasId) {
          if (data.isTyping) {
            state.typingUsers.set(data.userId, { id: data.userId, name: data.userName });
          } else {
            state.typingUsers.delete(data.userId);
          }
          updateTypingIndicator();
        }
      });
    }

    // Update relative times every minute
    setInterval(() => {
      const timeEls = elements.messageList.querySelectorAll('.message-time');
      timeEls.forEach(el => {
        const messageWrapper = el.closest('.message-wrapper');
        if (messageWrapper) {
          const message = state.messages.find(m => m.id === messageWrapper.dataset.messageId);
          if (message) {
            el.textContent = formatRelativeTime(message.timestamp);
          }
        }
      });
    }, 60000);
  </script>
</body>
</html>
`;

// ============================================================================
// WIDGET EXPORT
// ============================================================================

/**
 * LiveChatWidget - Real-time chat for canvas collaboration
 *
 * Features:
 * - Real-time message delivery
 * - Typing indicators
 * - Emoji reactions
 * - Reply threading
 * - User presence awareness
 *
 * @example Pipeline connection:
 * PresenceWidget.userClicked -> LiveChatWidget.canvasId
 */
export const LiveChatWidget: BuiltinWidget = {
  manifest: LiveChatWidgetManifest,
  html: LiveChatWidgetHTML
};

export default LiveChatWidget;
