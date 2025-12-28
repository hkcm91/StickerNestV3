/**
 * StickerNest v2 - Jitsi Meet Widget
 *
 * Secure video conferencing widget using Jitsi Meet.
 * Enables real-time video collaboration directly on the canvas.
 *
 * Security Features:
 * - Cryptographically secure room name generation
 * - Password protection support
 * - User identity integration
 * - Configurable Jitsi server (self-hosted support)
 *
 * References:
 * - https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/
 * - https://jitsi.org/api/
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const JitsiMeetWidgetManifest: WidgetManifest = {
  id: 'stickernest.jitsi-meet',
  name: 'Video Call',
  version: '1.0.0',
  kind: 'video',
  entry: 'index.html',
  description: 'Secure video conferencing with Jitsi Meet for canvas collaboration',
  author: 'StickerNest',
  tags: ['video', 'call', 'conference', 'collaboration', 'jitsi', 'meeting', 'chat'],
  inputs: {
    joinRoom: {
      type: 'object',
      description: 'Join a room { roomName, password?, displayName? }',
    },
    leaveRoom: {
      type: 'trigger',
      description: 'Leave the current room',
    },
    toggleAudio: {
      type: 'trigger',
      description: 'Toggle microphone on/off',
    },
    toggleVideo: {
      type: 'trigger',
      description: 'Toggle camera on/off',
    },
    toggleScreenShare: {
      type: 'trigger',
      description: 'Toggle screen sharing',
    },
    setDisplayName: {
      type: 'string',
      description: 'Set the display name for the user',
    },
    setServer: {
      type: 'string',
      description: 'Set custom Jitsi server domain',
    },
  },
  outputs: {
    roomCreated: {
      type: 'object',
      description: 'Emitted when a new room is created { roomName, roomUrl, password }',
    },
    roomJoined: {
      type: 'object',
      description: 'Emitted when successfully joined a room { roomName, participantCount }',
    },
    roomLeft: {
      type: 'object',
      description: 'Emitted when left the room { roomName }',
    },
    participantJoined: {
      type: 'object',
      description: 'Emitted when a participant joins { id, displayName }',
    },
    participantLeft: {
      type: 'object',
      description: 'Emitted when a participant leaves { id, displayName }',
    },
    audioMuteChanged: {
      type: 'object',
      description: 'Emitted when audio mute state changes { muted }',
    },
    videoMuteChanged: {
      type: 'object',
      description: 'Emitted when video mute state changes { muted }',
    },
    shareLink: {
      type: 'object',
      description: 'Emitted with room link for sharing { roomName, roomUrl, password }',
    },
    error: {
      type: 'string',
      description: 'Emitted when an error occurs',
    },
  },
  events: {
    listens: ['collaboration:invite', 'user:identity'],
    emits: ['videocall:started', 'videocall:ended', 'videocall:invite'],
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['room.join', 'room.leave', 'audio.toggle', 'video.toggle', 'screen.toggle', 'user.name', 'server.set'],
    outputs: ['room.created', 'room.joined', 'room.left', 'participant.joined', 'participant.left', 'audio.changed', 'video.changed', 'share.link', 'error'],
  },
  size: {
    width: 480,
    height: 360,
    minWidth: 320,
    minHeight: 240,
    maxWidth: 1280,
    maxHeight: 960,
    aspectRatio: 4 / 3,
    lockAspectRatio: false,
    scaleMode: 'contain',
  },
};

export const JitsiMeetWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--sn-bg-primary, #0f0f19);
    }
    .container {
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      background: #1a1a2e;
      border-radius: 8px;
      overflow: hidden;
    }

    /* Jitsi iframe container */
    .jitsi-container {
      flex: 1;
      position: relative;
      background: #000;
    }
    .jitsi-container iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Lobby / Start screen */
    .lobby {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 24px;
      gap: 20px;
      z-index: 10;
    }
    .lobby.hidden {
      display: none;
    }
    .lobby-icon {
      font-size: 64px;
      margin-bottom: 8px;
    }
    .lobby-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--sn-text-primary, #e2e8f0);
      text-align: center;
    }
    .lobby-subtitle {
      font-size: 13px;
      color: var(--sn-text-secondary, #94a3b8);
      text-align: center;
      max-width: 280px;
    }

    /* Form inputs */
    .form-group {
      width: 100%;
      max-width: 300px;
    }
    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-input {
      width: 100%;
      padding: 12px 16px;
      font-size: 14px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      color: var(--sn-text-primary, #e2e8f0);
      outline: none;
      transition: all 0.2s ease;
    }
    .form-input:focus {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: rgba(255,255,255,0.1);
    }
    .form-input::placeholder {
      color: var(--sn-text-tertiary, #64748b);
    }

    /* Toggle for password protection */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 300px;
      padding: 8px 0;
    }
    .toggle-label {
      font-size: 13px;
      color: var(--sn-text-primary, #e2e8f0);
    }
    .toggle {
      width: 44px;
      height: 24px;
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      position: relative;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .toggle.on {
      background: var(--sn-accent-primary, #8b5cf6);
    }
    .toggle::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      top: 3px;
      left: 3px;
      transition: transform 0.2s ease;
    }
    .toggle.on::after {
      transform: translateX(20px);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 500;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      -webkit-tap-highlight-color: transparent;
      min-height: 48px;
    }
    .btn-primary {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .btn-primary:hover {
      background: var(--sn-accent-hover, #7c3aed);
      transform: translateY(-1px);
    }
    .btn-primary:active {
      transform: translateY(0);
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.15);
    }
    .btn-icon {
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 50%;
    }

    /* Button row */
    .btn-row {
      display: flex;
      gap: 12px;
      width: 100%;
      max-width: 300px;
    }
    .btn-row .btn {
      flex: 1;
    }

    /* Controls overlay */
    .controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px;
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
      display: flex;
      justify-content: center;
      gap: 10px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 5;
    }
    .container:hover .controls,
    .container.touch-active .controls {
      opacity: 1;
    }
    .ctrl-btn {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      backdrop-filter: blur(8px);
    }
    .ctrl-btn:hover {
      background: rgba(255,255,255,0.25);
    }
    .ctrl-btn.active {
      background: var(--sn-accent-primary, #8b5cf6);
    }
    .ctrl-btn.danger {
      background: #ef4444;
    }
    .ctrl-btn.danger:hover {
      background: #dc2626;
    }
    .ctrl-btn.muted {
      background: rgba(239, 68, 68, 0.7);
    }

    /* Status bar */
    .status-bar {
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
      z-index: 5;
    }
    .status-badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 12px;
      background: rgba(0,0,0,0.6);
      color: white;
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-badge.live {
      background: rgba(34, 197, 94, 0.8);
    }
    .status-badge .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Share modal */
    .share-modal {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.8);
      z-index: 20;
      padding: 20px;
    }
    .share-modal.hidden {
      display: none;
    }
    .share-content {
      background: #1e1e2e;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
    }
    .share-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--sn-text-primary, #e2e8f0);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .share-url {
      width: 100%;
      padding: 12px;
      font-size: 13px;
      font-family: monospace;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: var(--sn-text-primary, #e2e8f0);
      margin-bottom: 12px;
    }
    .share-password {
      font-size: 13px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 16px;
      padding: 10px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 6px;
    }
    .share-actions {
      display: flex;
      gap: 10px;
    }
    .share-actions .btn {
      flex: 1;
    }

    /* Settings panel */
    .settings-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 280px;
      max-width: 85%;
      background: rgba(15, 15, 25, 0.98);
      backdrop-filter: blur(12px);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      overflow-y: auto;
      padding: 20px;
      z-index: 15;
    }
    .settings-panel.open {
      transform: translateX(0);
    }
    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .settings-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--sn-text-primary, #e2e8f0);
    }
    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
      font-size: 16px;
    }
    .settings-section {
      margin-bottom: 20px;
    }
    .settings-section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    /* Loading state */
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15, 15, 25, 0.95);
      z-index: 12;
      gap: 16px;
    }
    .loading-overlay.hidden {
      display: none;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .loading-text {
      font-size: 14px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    /* Responsive */
    @media (max-width: 400px) {
      .lobby { padding: 16px; gap: 16px; }
      .lobby-icon { font-size: 48px; }
      .lobby-title { font-size: 18px; }
      .form-group { max-width: 100%; }
      .btn-row { max-width: 100%; flex-direction: column; }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .spinner { animation: none; }
      .status-badge .dot { animation: none; }
      .settings-panel { transition: none; }
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <!-- Jitsi container -->
    <div class="jitsi-container" id="jitsiContainer"></div>

    <!-- Lobby screen -->
    <div class="lobby" id="lobby">
      <div class="lobby-icon">📹</div>
      <div class="lobby-title">Start a Video Call</div>
      <div class="lobby-subtitle">Create a secure video room and invite others to join your canvas collaboration</div>

      <div class="form-group">
        <label class="form-label">Your Name</label>
        <input type="text" class="form-input" id="displayNameInput" placeholder="Enter your name" maxlength="50">
      </div>

      <div class="toggle-row">
        <span class="toggle-label">Password Protection</span>
        <div class="toggle" id="passwordToggle"></div>
      </div>

      <div class="form-group" id="passwordGroup" style="display: none;">
        <label class="form-label">Room Password</label>
        <input type="password" class="form-input" id="passwordInput" placeholder="Set a password" maxlength="32">
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="createRoomBtn">
          <span>🎬</span> Create Room
        </button>
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" id="joinRoomBtn">
          <span>🔗</span> Join Existing
        </button>
      </div>
    </div>

    <!-- Join room modal (hidden in lobby) -->
    <div class="share-modal hidden" id="joinModal">
      <div class="share-content">
        <div class="share-title">🔗 Join a Room</div>
        <div class="form-group" style="max-width: 100%;">
          <label class="form-label">Room Name or Link</label>
          <input type="text" class="form-input" id="joinRoomInput" placeholder="Enter room name or paste link">
        </div>
        <div class="form-group" style="max-width: 100%; margin-top: 12px;">
          <label class="form-label">Password (if required)</label>
          <input type="password" class="form-input" id="joinPasswordInput" placeholder="Room password">
        </div>
        <div class="share-actions" style="margin-top: 16px;">
          <button class="btn btn-secondary" id="cancelJoinBtn">Cancel</button>
          <button class="btn btn-primary" id="confirmJoinBtn">Join</button>
        </div>
      </div>
    </div>

    <!-- Share modal -->
    <div class="share-modal hidden" id="shareModal">
      <div class="share-content">
        <div class="share-title">📤 Share Room Link</div>
        <input type="text" class="share-url" id="shareUrl" readonly>
        <div class="share-password" id="sharePassword" style="display: none;">
          🔒 Password: <strong id="sharePasswordText"></strong>
        </div>
        <div class="share-actions">
          <button class="btn btn-secondary" id="closeShareBtn">Close</button>
          <button class="btn btn-primary" id="copyLinkBtn">📋 Copy Link</button>
        </div>
      </div>
    </div>

    <!-- Status bar (visible when in call) -->
    <div class="status-bar" id="statusBar" style="display: none;">
      <div class="status-badge live">
        <span class="dot"></span>
        <span id="participantCount">1 participant</span>
      </div>
      <div class="status-badge" id="roomNameBadge">Room</div>
    </div>

    <!-- Controls (visible when in call) -->
    <div class="controls" id="controls" style="display: none;">
      <button class="ctrl-btn" id="muteAudioBtn" title="Toggle Microphone">🎤</button>
      <button class="ctrl-btn" id="muteVideoBtn" title="Toggle Camera">📹</button>
      <button class="ctrl-btn" id="shareScreenBtn" title="Share Screen">🖥️</button>
      <button class="ctrl-btn" id="shareRoomBtn" title="Share Room Link">📤</button>
      <button class="ctrl-btn" id="settingsBtn" title="Settings">⚙️</button>
      <button class="ctrl-btn danger" id="leaveBtn" title="Leave Call">📞</button>
    </div>

    <!-- Settings panel -->
    <div class="settings-panel" id="settingsPanel">
      <div class="settings-header">
        <span class="settings-title">Settings</span>
        <button class="close-btn" id="closeSettingsBtn">✕</button>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">Jitsi Server</div>
        <div class="form-group" style="max-width: 100%;">
          <input type="text" class="form-input" id="serverInput" placeholder="meet.jit.si" value="meet.jit.si">
        </div>
        <div style="font-size: 11px; color: var(--sn-text-tertiary, #64748b); margin-top: 8px;">
          Use your own Jitsi server for enhanced privacy and JWT authentication.
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">Display Name</div>
        <div class="form-group" style="max-width: 100%;">
          <input type="text" class="form-input" id="settingsNameInput" placeholder="Your name">
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div class="loading-overlay hidden" id="loadingOverlay">
      <div class="spinner"></div>
      <div class="loading-text" id="loadingText">Connecting to room...</div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // DOM elements
      const container = document.getElementById('container');
      const jitsiContainer = document.getElementById('jitsiContainer');
      const lobby = document.getElementById('lobby');
      const statusBar = document.getElementById('statusBar');
      const controls = document.getElementById('controls');
      const loadingOverlay = document.getElementById('loadingOverlay');
      const loadingText = document.getElementById('loadingText');
      const settingsPanel = document.getElementById('settingsPanel');
      const shareModal = document.getElementById('shareModal');
      const joinModal = document.getElementById('joinModal');

      // Inputs
      const displayNameInput = document.getElementById('displayNameInput');
      const passwordInput = document.getElementById('passwordInput');
      const passwordGroup = document.getElementById('passwordGroup');
      const passwordToggle = document.getElementById('passwordToggle');
      const serverInput = document.getElementById('serverInput');
      const settingsNameInput = document.getElementById('settingsNameInput');
      const joinRoomInput = document.getElementById('joinRoomInput');
      const joinPasswordInput = document.getElementById('joinPasswordInput');
      const shareUrl = document.getElementById('shareUrl');
      const sharePassword = document.getElementById('sharePassword');
      const sharePasswordText = document.getElementById('sharePasswordText');

      // Buttons
      const createRoomBtn = document.getElementById('createRoomBtn');
      const joinRoomBtn = document.getElementById('joinRoomBtn');
      const confirmJoinBtn = document.getElementById('confirmJoinBtn');
      const cancelJoinBtn = document.getElementById('cancelJoinBtn');
      const muteAudioBtn = document.getElementById('muteAudioBtn');
      const muteVideoBtn = document.getElementById('muteVideoBtn');
      const shareScreenBtn = document.getElementById('shareScreenBtn');
      const shareRoomBtn = document.getElementById('shareRoomBtn');
      const settingsBtn = document.getElementById('settingsBtn');
      const closeSettingsBtn = document.getElementById('closeSettingsBtn');
      const leaveBtn = document.getElementById('leaveBtn');
      const copyLinkBtn = document.getElementById('copyLinkBtn');
      const closeShareBtn = document.getElementById('closeShareBtn');

      // Status elements
      const participantCount = document.getElementById('participantCount');
      const roomNameBadge = document.getElementById('roomNameBadge');

      // State
      let state = {
        jitsiApi: null,
        currentRoom: null,
        displayName: '',
        server: 'meet.jit.si',
        password: null,
        isAudioMuted: false,
        isVideoMuted: false,
        isScreenSharing: false,
        participants: new Map()
      };

      // ======================
      // SECURITY: Secure random room name generation
      // ======================
      function generateSecureRoomName() {
        // Use crypto.getRandomValues for cryptographically secure randomness
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);

        // Convert to base36 string (alphanumeric, URL-safe)
        const roomId = Array.from(array)
          .map(b => b.toString(36).padStart(2, '0'))
          .join('')
          .substring(0, 24);

        // Add prefix for identification
        return 'sn-' + roomId;
      }

      // Validate and sanitize room name
      function sanitizeRoomName(name) {
        if (!name || typeof name !== 'string') return null;

        // Remove protocol and domain if a full URL is provided
        const urlMatch = name.match(/(?:https?:\\/\\/)?[^\\/]+\\/(.+)/);
        if (urlMatch) {
          name = urlMatch[1];
        }

        // Only allow alphanumeric, hyphens, and underscores
        const sanitized = name.replace(/[^a-zA-Z0-9-_]/g, '');

        // Minimum length check
        if (sanitized.length < 6) return null;

        // Maximum length limit
        return sanitized.substring(0, 64);
      }

      // ======================
      // JITSI API INTEGRATION
      // ======================
      function loadJitsiScript(domain) {
        return new Promise((resolve, reject) => {
          // Check if already loaded
          if (window.JitsiMeetExternalAPI) {
            resolve();
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://' + domain + '/external_api.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Jitsi API'));
          document.head.appendChild(script);
        });
      }

      async function createOrJoinRoom(roomName, password, isNew = true) {
        try {
          loadingOverlay.classList.remove('hidden');
          loadingText.textContent = isNew ? 'Creating room...' : 'Joining room...';

          // Load Jitsi API
          await loadJitsiScript(state.server);

          // Sanitize room name
          const sanitizedRoom = isNew ? roomName : sanitizeRoomName(roomName);
          if (!sanitizedRoom) {
            throw new Error('Invalid room name');
          }

          // Get display name
          const displayName = state.displayName || 'Guest-' + Math.random().toString(36).substring(2, 6);

          // Jitsi configuration
          const options = {
            roomName: sanitizedRoom,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainer,
            userInfo: {
              displayName: displayName
            },
            configOverwrite: {
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              prejoinPageEnabled: false,
              disableDeepLinking: true,
              enableClosePage: false,
              enableWelcomePage: false,
              // Security: Disable some features for safety
              disableRemoteMute: true,
              remoteVideoMenu: {
                disableKick: true
              },
              // UI customization
              toolbarButtons: [
                'microphone',
                'camera',
                'desktop',
                'fullscreen',
                'chat',
                'raisehand',
                'tileview',
                'settings'
              ],
              // Logging
              disableThirdPartyRequests: true
            },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              SHOW_BRAND_WATERMARK: false,
              BRAND_WATERMARK_LINK: '',
              SHOW_CHROME_EXTENSION_BANNER: false,
              MOBILE_APP_PROMO: false,
              TOOLBAR_ALWAYS_VISIBLE: false,
              DEFAULT_BACKGROUND: '#1a1a2e',
              DISABLE_FOCUS_INDICATOR: true
            }
          };

          // Create Jitsi instance
          state.jitsiApi = new window.JitsiMeetExternalAPI(state.server, options);
          state.currentRoom = sanitizedRoom;
          state.password = password || null;

          // Set up event handlers
          setupJitsiEventHandlers();

          // Set password if provided
          if (password && isNew) {
            state.jitsiApi.addEventListener('participantRoleChanged', function onModerator(event) {
              if (event.role === 'moderator') {
                state.jitsiApi.executeCommand('password', password);
                state.jitsiApi.removeEventListener('participantRoleChanged', onModerator);
              }
            });
          }

          // If joining with password
          if (password && !isNew) {
            state.jitsiApi.addEventListener('passwordRequired', function() {
              state.jitsiApi.executeCommand('password', password);
            });
          }

          // Show UI
          lobby.classList.add('hidden');
          statusBar.style.display = 'flex';
          controls.style.display = 'flex';
          loadingOverlay.classList.add('hidden');

          // Update room name badge
          roomNameBadge.textContent = sanitizedRoom.length > 12
            ? sanitizedRoom.substring(0, 12) + '...'
            : sanitizedRoom;

          // Emit events
          const roomUrl = 'https://' + state.server + '/' + sanitizedRoom;

          if (isNew) {
            API.emitOutput('room.created', {
              roomName: sanitizedRoom,
              roomUrl: roomUrl,
              password: password || null
            });
          }

          API.emitOutput('room.joined', {
            roomName: sanitizedRoom,
            participantCount: 1
          });

          API.setState({
            currentRoom: sanitizedRoom,
            server: state.server,
            displayName: displayName
          });

          API.log('Joined room: ' + sanitizedRoom);

        } catch (err) {
          console.error('Jitsi error:', err);
          loadingOverlay.classList.add('hidden');
          API.emitOutput('error', err.message);
          alert('Failed to connect: ' + err.message);
        }
      }

      function setupJitsiEventHandlers() {
        if (!state.jitsiApi) return;

        // Participant joined
        state.jitsiApi.addEventListener('participantJoined', function(event) {
          state.participants.set(event.id, event.displayName || 'Guest');
          updateParticipantCount();

          API.emitOutput('participant.joined', {
            id: event.id,
            displayName: event.displayName || 'Guest'
          });
        });

        // Participant left
        state.jitsiApi.addEventListener('participantLeft', function(event) {
          const name = state.participants.get(event.id) || 'Guest';
          state.participants.delete(event.id);
          updateParticipantCount();

          API.emitOutput('participant.left', {
            id: event.id,
            displayName: name
          });
        });

        // Audio mute
        state.jitsiApi.addEventListener('audioMuteStatusChanged', function(event) {
          state.isAudioMuted = event.muted;
          muteAudioBtn.classList.toggle('muted', event.muted);
          muteAudioBtn.textContent = event.muted ? '🔇' : '🎤';

          API.emitOutput('audio.changed', { muted: event.muted });
        });

        // Video mute
        state.jitsiApi.addEventListener('videoMuteStatusChanged', function(event) {
          state.isVideoMuted = event.muted;
          muteVideoBtn.classList.toggle('muted', event.muted);
          muteVideoBtn.textContent = event.muted ? '📷' : '📹';

          API.emitOutput('video.changed', { muted: event.muted });
        });

        // Screen share
        state.jitsiApi.addEventListener('screenSharingStatusChanged', function(event) {
          state.isScreenSharing = event.on;
          shareScreenBtn.classList.toggle('active', event.on);
        });

        // Conference left/ended
        state.jitsiApi.addEventListener('readyToClose', function() {
          leaveRoom();
        });

        // Video conference joined - get participant list
        state.jitsiApi.addEventListener('videoConferenceJoined', function(event) {
          state.participants.set(event.id, event.displayName || state.displayName);
          updateParticipantCount();
        });
      }

      function updateParticipantCount() {
        const count = state.participants.size;
        participantCount.textContent = count + (count === 1 ? ' participant' : ' participants');
      }

      function leaveRoom() {
        if (state.jitsiApi) {
          state.jitsiApi.dispose();
          state.jitsiApi = null;
        }

        const roomName = state.currentRoom;
        state.currentRoom = null;
        state.password = null;
        state.participants.clear();
        state.isAudioMuted = false;
        state.isVideoMuted = false;
        state.isScreenSharing = false;

        // Reset UI
        muteAudioBtn.classList.remove('muted');
        muteAudioBtn.textContent = '🎤';
        muteVideoBtn.classList.remove('muted');
        muteVideoBtn.textContent = '📹';
        shareScreenBtn.classList.remove('active');

        // Show lobby
        lobby.classList.remove('hidden');
        statusBar.style.display = 'none';
        controls.style.display = 'none';
        settingsPanel.classList.remove('open');
        shareModal.classList.add('hidden');

        // Clear jitsi container
        jitsiContainer.innerHTML = '';

        API.emitOutput('room.left', { roomName: roomName });
        API.setState({ currentRoom: null });
        API.log('Left room: ' + roomName);
      }

      // ======================
      // UI EVENT HANDLERS
      // ======================

      // Haptic feedback
      function haptic(type) {
        if (navigator.vibrate) {
          const patterns = { light: [10], medium: [20] };
          navigator.vibrate(patterns[type] || patterns.light);
        }
      }

      // Password toggle
      passwordToggle.addEventListener('click', function() {
        haptic('light');
        passwordToggle.classList.toggle('on');
        passwordGroup.style.display = passwordToggle.classList.contains('on') ? 'block' : 'none';
      });

      // Create room
      createRoomBtn.addEventListener('click', function() {
        haptic('medium');
        state.displayName = displayNameInput.value.trim();
        const password = passwordToggle.classList.contains('on') ? passwordInput.value : null;
        const roomName = generateSecureRoomName();
        createOrJoinRoom(roomName, password, true);
      });

      // Show join modal
      joinRoomBtn.addEventListener('click', function() {
        haptic('light');
        joinModal.classList.remove('hidden');
      });

      // Cancel join
      cancelJoinBtn.addEventListener('click', function() {
        haptic('light');
        joinModal.classList.add('hidden');
        joinRoomInput.value = '';
        joinPasswordInput.value = '';
      });

      // Confirm join
      confirmJoinBtn.addEventListener('click', function() {
        haptic('medium');
        const roomName = joinRoomInput.value.trim();
        const password = joinPasswordInput.value || null;
        state.displayName = displayNameInput.value.trim();

        if (!roomName) {
          alert('Please enter a room name or link');
          return;
        }

        joinModal.classList.add('hidden');
        createOrJoinRoom(roomName, password, false);
      });

      // Toggle audio
      muteAudioBtn.addEventListener('click', function() {
        haptic('light');
        if (state.jitsiApi) {
          state.jitsiApi.executeCommand('toggleAudio');
        }
      });

      // Toggle video
      muteVideoBtn.addEventListener('click', function() {
        haptic('light');
        if (state.jitsiApi) {
          state.jitsiApi.executeCommand('toggleVideo');
        }
      });

      // Toggle screen share
      shareScreenBtn.addEventListener('click', function() {
        haptic('light');
        if (state.jitsiApi) {
          state.jitsiApi.executeCommand('toggleShareScreen');
        }
      });

      // Share room
      shareRoomBtn.addEventListener('click', function() {
        haptic('light');
        if (state.currentRoom) {
          const roomUrl = 'https://' + state.server + '/' + state.currentRoom;
          shareUrl.value = roomUrl;

          if (state.password) {
            sharePassword.style.display = 'block';
            sharePasswordText.textContent = state.password;
          } else {
            sharePassword.style.display = 'none';
          }

          shareModal.classList.remove('hidden');

          API.emitOutput('share.link', {
            roomName: state.currentRoom,
            roomUrl: roomUrl,
            password: state.password
          });
        }
      });

      // Copy link
      copyLinkBtn.addEventListener('click', async function() {
        haptic('medium');
        try {
          await navigator.clipboard.writeText(shareUrl.value);
          copyLinkBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            copyLinkBtn.textContent = '📋 Copy Link';
          }, 2000);
        } catch (err) {
          shareUrl.select();
          document.execCommand('copy');
        }
      });

      // Close share modal
      closeShareBtn.addEventListener('click', function() {
        haptic('light');
        shareModal.classList.add('hidden');
      });

      // Settings
      settingsBtn.addEventListener('click', function() {
        haptic('light');
        settingsPanel.classList.add('open');
        settingsNameInput.value = state.displayName;
      });

      closeSettingsBtn.addEventListener('click', function() {
        haptic('light');
        settingsPanel.classList.remove('open');

        // Apply settings
        const newServer = serverInput.value.trim() || 'meet.jit.si';
        const newName = settingsNameInput.value.trim();

        if (newServer !== state.server) {
          state.server = newServer;
          API.setState({ server: newServer });
        }

        if (newName && newName !== state.displayName) {
          state.displayName = newName;
          if (state.jitsiApi) {
            state.jitsiApi.executeCommand('displayName', newName);
          }
          API.setState({ displayName: newName });
        }
      });

      // Leave call
      leaveBtn.addEventListener('click', function() {
        haptic('medium');
        if (confirm('Leave this video call?')) {
          leaveRoom();
        }
      });

      // Touch controls
      let touchTimeout;
      container.addEventListener('touchstart', function() {
        container.classList.add('touch-active');
        clearTimeout(touchTimeout);
      });
      container.addEventListener('touchend', function() {
        touchTimeout = setTimeout(function() {
          container.classList.remove('touch-active');
        }, 3000);
      });

      // ======================
      // WIDGET API HANDLERS
      // ======================
      API.onMount(function(context) {
        const savedState = context.state || {};

        if (savedState.displayName) {
          state.displayName = savedState.displayName;
          displayNameInput.value = savedState.displayName;
        }
        if (savedState.server) {
          state.server = savedState.server;
          serverInput.value = savedState.server;
        }

        // Auto-rejoin if there was an active room
        if (savedState.currentRoom) {
          createOrJoinRoom(savedState.currentRoom, null, false);
        }

        API.log('JitsiMeetWidget mounted');
      });

      // Join room input
      API.onInput('room.join', function(data) {
        if (typeof data === 'string') {
          createOrJoinRoom(data, null, false);
        } else if (data && data.roomName) {
          if (data.displayName) state.displayName = data.displayName;
          createOrJoinRoom(data.roomName, data.password || null, false);
        }
      });

      // Leave room input
      API.onInput('room.leave', function() {
        leaveRoom();
      });

      // Toggle audio input
      API.onInput('audio.toggle', function() {
        if (state.jitsiApi) {
          state.jitsiApi.executeCommand('toggleAudio');
        }
      });

      // Toggle video input
      API.onInput('video.toggle', function() {
        if (state.jitsiApi) {
          state.jitsiApi.executeCommand('toggleVideo');
        }
      });

      // Toggle screen share input
      API.onInput('screen.toggle', function() {
        if (state.jitsiApi) {
          state.jitsiApi.executeCommand('toggleShareScreen');
        }
      });

      // Set display name input
      API.onInput('user.name', function(name) {
        if (typeof name === 'string' && name.trim()) {
          state.displayName = name.trim();
          displayNameInput.value = name.trim();
          if (state.jitsiApi) {
            state.jitsiApi.executeCommand('displayName', name.trim());
          }
        }
      });

      // Set server input
      API.onInput('server.set', function(server) {
        if (typeof server === 'string' && server.trim()) {
          state.server = server.trim();
          serverInput.value = server.trim();
        }
      });

      // Cleanup on destroy
      API.onDestroy(function() {
        if (state.jitsiApi) {
          state.jitsiApi.dispose();
          state.jitsiApi = null;
        }
        API.log('JitsiMeetWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const JitsiMeetWidget: BuiltinWidget = {
  manifest: JitsiMeetWidgetManifest,
  html: JitsiMeetWidgetHTML,
};
