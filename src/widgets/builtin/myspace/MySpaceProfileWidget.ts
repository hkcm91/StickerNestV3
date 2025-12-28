/**
 * StickerNest v2 - MySpace Profile Widget (2006 Theme)
 * ======================================================
 *
 * Classic MySpace "About Me" profile box with authentic 2006 styling.
 * Features the iconic blue headers, Verdana font, and table-based layout aesthetic.
 *
 * ## Features
 * - "About Me" section
 * - "Who I'd Like to Meet" section
 * - Profile picture with online status
 * - View count
 * - Last login display
 * - Add to Friends / Send Message links
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const MySpaceProfileWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-profile',
  name: 'MySpace Profile',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 "About Me" profile box with authentic styling.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'profile', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    userId: {
      type: 'string',
      description: 'User ID to display',
      default: '',
    },
    username: {
      type: 'string',
      description: 'Display name',
      default: 'Tom',
    },
    aboutMe: {
      type: 'string',
      description: 'About Me text',
      default: '',
    },
    whoIdLikeToMeet: {
      type: 'string',
      description: 'Who I\'d Like to Meet text',
      default: '',
    },
  },
  outputs: {
    addFriend: {
      type: 'object',
      description: 'Emitted when Add to Friends clicked',
    },
    sendMessage: {
      type: 'object',
      description: 'Emitted when Send Message clicked',
    },
    profileClicked: {
      type: 'object',
      description: 'Emitted when profile clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['user.set', 'data.set'],
    outputs: ['friend.add', 'message.send', 'profile.clicked'],
  },
  events: {
    listens: ['social:online-status-changed', 'social:follow-new'],
    emits: [],
  },
  size: {
    width: 400,
    height: 450,
    minWidth: 300,
    minHeight: 350,
    scaleMode: 'stretch',
  },
};

export const MySpaceProfileWidgetHTML = `
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

    /* MySpace 2006 Classic Styling */
    .myspace-container {
      width: 100%;
      min-height: 100%;
      background: #B4D0DC;
      padding: 8px;
    }

    .profile-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      border-radius: 0;
    }

    .profile-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .profile-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }

    .profile-content {
      padding: 10px;
    }

    .profile-top {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #99CCFF;
    }

    .avatar-container {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 100px;
      height: 100px;
      border: 2px solid #336699;
      background: #EEEEEE;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      font-size: 32px;
      color: #336699;
    }

    .online-badge {
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      background: #00CC00;
      color: #FFFFFF;
      font-size: 8px;
      padding: 1px 6px;
      font-weight: bold;
      border: 1px solid #009900;
      display: none;
    }

    .online-badge.online {
      display: block;
    }

    .user-info {
      flex: 1;
    }

    .username {
      font-size: 14px;
      font-weight: bold;
      color: #003366;
      margin-bottom: 4px;
    }

    .user-meta {
      font-size: 9px;
      color: #666666;
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .user-meta span {
      display: block;
    }

    .action-links {
      margin-top: 8px;
    }

    .action-link {
      display: inline-block;
      color: #FF6633;
      text-decoration: underline;
      font-size: 10px;
      cursor: pointer;
      margin-right: 8px;
      font-weight: bold;
    }

    .action-link:hover {
      color: #FF3300;
    }

    .section {
      margin-bottom: 12px;
    }

    .section-header {
      background: linear-gradient(180deg, #336699 0%, #6699CC 100%);
      color: #FFFFFF;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 0;
    }

    .section-content {
      background: #FFFFFF;
      border: 1px solid #99CCFF;
      border-top: none;
      padding: 8px;
      font-size: 10px;
      color: #333333;
      line-height: 1.5;
    }

    .view-count {
      text-align: center;
      font-size: 9px;
      color: #666666;
      padding: 8px;
      border-top: 1px solid #99CCFF;
      margin-top: 8px;
    }

    .view-count strong {
      color: #003366;
    }

    /* Blinking "Online Now!" text */
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .blink {
      animation: blink 1s ease-in-out infinite;
    }

    /* Scrollbar styling for authenticity */
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

    ::-webkit-scrollbar-thumb:hover {
      background: #003366;
    }
  </style>
</head>
<body>
  <div class="myspace-container">
    <div class="profile-box">
      <div class="profile-header">
        <svg class="profile-header-icon" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
        <span id="headerUsername">Tom</span>'s Profile
      </div>

      <div class="profile-content">
        <div class="profile-top">
          <div class="avatar-container">
            <div class="avatar" id="avatar">
              <span class="avatar-placeholder" id="avatarPlaceholder">:)</span>
            </div>
            <div class="online-badge" id="onlineBadge">ONLINE!</div>
          </div>

          <div class="user-info">
            <div class="username" id="username">Tom</div>
            <div class="user-meta">
              <span>"<span id="tagline">Thanks for the add!</span>"</span>
              <span id="location">Los Angeles, California</span>
              <span>Last Login: <span id="lastLogin">12/25/2006</span></span>
            </div>
            <div class="action-links">
              <a class="action-link" id="addFriendLink">Add to Friends</a>
              <a class="action-link" id="sendMessageLink">Send Message</a>
              <a class="action-link" id="addToFavoritesLink">Add to Favorites</a>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">About Me:</div>
          <div class="section-content" id="aboutMe">
            Hey there! Welcome to my profile. I'm just a regular person who loves music, movies, and hanging out with friends.
            <br><br>
            Hit me up if you want to chat! :-D
          </div>
        </div>

        <div class="section">
          <div class="section-header">Who I'd Like to Meet:</div>
          <div class="section-content" id="whoIdLikeToMeet">
            Cool people who like the same music as me! Anyone who doesn't take life too seriously.
            <br><br>
            Musicians, artists, and creative types are always welcome! :)
          </div>
        </div>

        <div class="view-count">
          Profile Views: <strong id="viewCount">1,337,420</strong>
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
        avatarUrl: null,
        tagline: 'Thanks for the add!',
        location: 'Los Angeles, California',
        lastLogin: '12/25/2006',
        aboutMe: '',
        whoIdLikeToMeet: '',
        viewCount: 1337420,
        isOnline: false,
        isFriend: false
      };

      // Elements
      const headerUsername = document.getElementById('headerUsername');
      const username = document.getElementById('username');
      const avatar = document.getElementById('avatar');
      const avatarPlaceholder = document.getElementById('avatarPlaceholder');
      const onlineBadge = document.getElementById('onlineBadge');
      const tagline = document.getElementById('tagline');
      const location = document.getElementById('location');
      const lastLogin = document.getElementById('lastLogin');
      const aboutMe = document.getElementById('aboutMe');
      const whoIdLikeToMeet = document.getElementById('whoIdLikeToMeet');
      const viewCount = document.getElementById('viewCount');
      const addFriendLink = document.getElementById('addFriendLink');
      const sendMessageLink = document.getElementById('sendMessageLink');

      // Format number with commas
      function formatNumber(num) {
        return num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
      }

      // Render profile
      function render() {
        headerUsername.textContent = state.username;
        username.textContent = state.username;
        tagline.textContent = state.tagline || 'Thanks for the add!';
        location.textContent = state.location || 'Los Angeles, California';
        lastLogin.textContent = state.lastLogin || '12/25/2006';
        viewCount.textContent = formatNumber(state.viewCount);

        // Avatar
        if (state.avatarUrl) {
          avatar.innerHTML = '<img src="' + state.avatarUrl + '" alt="' + state.username + '" />';
        } else {
          avatar.innerHTML = '<span class="avatar-placeholder">:)</span>';
        }

        // Online status
        onlineBadge.classList.toggle('online', state.isOnline);
        if (state.isOnline) {
          onlineBadge.classList.add('blink');
        } else {
          onlineBadge.classList.remove('blink');
        }

        // About Me
        if (state.aboutMe) {
          aboutMe.innerHTML = state.aboutMe.replace(/\\n/g, '<br>');
        }

        // Who I'd Like to Meet
        if (state.whoIdLikeToMeet) {
          whoIdLikeToMeet.innerHTML = state.whoIdLikeToMeet.replace(/\\n/g, '<br>');
        }

        // Friend status
        addFriendLink.textContent = state.isFriend ? 'Remove from Friends' : 'Add to Friends';
      }

      // Event handlers
      addFriendLink.addEventListener('click', function(e) {
        e.preventDefault();
        state.isFriend = !state.isFriend;
        render();

        API.emitOutput('friend.add', {
          userId: state.userId,
          username: state.username,
          action: state.isFriend ? 'add' : 'remove'
        });

        API.setState({ isFriend: state.isFriend });
      });

      sendMessageLink.addEventListener('click', function(e) {
        e.preventDefault();
        API.emitOutput('message.send', {
          userId: state.userId,
          username: state.username
        });
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceProfileWidget mounted for user: ' + state.userId);
      });

      // Handle user.set input
      API.onInput('user.set', function(userId) {
        state.userId = userId;
        render();
        API.setState({ userId: state.userId });
      });

      // Handle data.set input (full user data)
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.userId = data.userId || data.id || state.userId;
          state.username = data.username || data.name || 'Tom';
          state.avatarUrl = data.avatarUrl || data.avatar || null;
          state.tagline = data.tagline || data.bio || state.tagline;
          state.location = data.location || state.location;
          state.lastLogin = data.lastLogin || state.lastLogin;
          state.aboutMe = data.aboutMe || data.about || '';
          state.whoIdLikeToMeet = data.whoIdLikeToMeet || '';
          state.viewCount = data.viewCount || data.profileViews || state.viewCount;
          state.isOnline = data.isOnline || false;
          state.isFriend = data.isFriend || data.isFollowing || false;
        }
        render();
        API.setState(state);
      });

      // Listen for online status changes
      API.on('social:online-status-changed', function(payload) {
        if (payload.userId === state.userId) {
          state.isOnline = payload.isOnline;
          render();
        }
      });

      API.onDestroy(function() {
        API.log('MySpaceProfileWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceProfileWidget: BuiltinWidget = {
  manifest: MySpaceProfileWidgetManifest,
  html: MySpaceProfileWidgetHTML,
};
