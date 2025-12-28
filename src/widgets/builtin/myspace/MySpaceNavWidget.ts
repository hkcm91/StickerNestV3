/**
 * StickerNest v2 - MySpace Navigation Widget (2006 Theme)
 * =========================================================
 *
 * The iconic MySpace navigation bar with all those links:
 * Home, Browse, Search, Invite, Film, Mail, Blog, Favorites,
 * Forum, Groups, Events, Videos, Music, Comedy, Classifieds
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const MySpaceNavWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-nav',
  name: 'MySpace Navigation',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 navigation bar.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'navigation', 'nav', 'menu', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    unreadMail: { type: 'number', description: 'Unread mail count', default: 0 },
    friendRequests: { type: 'number', description: 'Friend request count', default: 0 },
    username: { type: 'string', description: 'Current username', default: 'Tom' },
  },
  outputs: {
    navClicked: { type: 'object', description: 'Navigation item clicked { section }' },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['data.set'],
    outputs: ['nav.clicked'],
  },
  size: {
    width: 700,
    height: 80,
    minWidth: 500,
    minHeight: 70,
    scaleMode: 'stretch',
  },
};

export const MySpaceNavWidgetHTML = `
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
      background: #003366;
    }

    .nav-container {
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #003366 0%, #001a33 100%);
      display: flex;
      flex-direction: column;
    }

    .nav-top {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      background: linear-gradient(180deg, #004080 0%, #003366 100%);
      border-bottom: 1px solid #005599;
    }

    .logo {
      font-size: 18px;
      font-weight: bold;
      color: #FFFFFF;
      margin-right: 20px;
      text-decoration: none;
      cursor: pointer;
    }

    .logo span {
      color: #FFCC00;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
    }

    .search-input {
      padding: 3px 6px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 10px;
      border: 1px solid #99CCFF;
      width: 140px;
    }

    .search-select {
      padding: 2px 4px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 9px;
    }

    .search-btn {
      padding: 3px 8px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 9px;
      background: #FF6633;
      color: #FFFFFF;
      border: 1px solid #CC4400;
      cursor: pointer;
    }

    .search-btn:hover {
      background: #FF8855;
    }

    .user-links {
      display: flex;
      gap: 8px;
      margin-left: 12px;
    }

    .user-link {
      color: #FFFFFF;
      text-decoration: underline;
      font-size: 10px;
      cursor: pointer;
    }

    .user-link:hover {
      color: #FFCC00;
    }

    .nav-links {
      display: flex;
      align-items: center;
      padding: 4px 12px;
      gap: 4px;
      flex-wrap: wrap;
    }

    .nav-link {
      color: #99CCFF;
      text-decoration: none;
      font-size: 10px;
      padding: 2px 6px;
      cursor: pointer;
      white-space: nowrap;
    }

    .nav-link:hover {
      color: #FFFFFF;
      text-decoration: underline;
    }

    .nav-separator {
      color: #336699;
      font-size: 10px;
    }

    .nav-badge {
      background: #FF0000;
      color: #FFFFFF;
      font-size: 8px;
      padding: 1px 4px;
      border-radius: 8px;
      margin-left: 2px;
    }

    .nav-special {
      color: #FF6633;
    }
  </style>
</head>
<body>
  <div class="nav-container">
    <div class="nav-top">
      <a class="logo" id="logoLink">My<span>Space</span></a>

      <div class="search-box">
        <select class="search-select" id="searchType">
          <option value="myspace">MySpace</option>
          <option value="web">The Web</option>
          <option value="people">People</option>
          <option value="music">Music</option>
        </select>
        <input type="text" class="search-input" id="searchInput" placeholder="Search..." />
        <button class="search-btn" id="searchBtn">Search</button>
      </div>

      <div class="user-links">
        <a class="user-link" id="helloLink">Hello, <span id="usernameDisplay">Tom</span>!</a>
        <a class="user-link" id="logoutLink">Logout</a>
        <a class="user-link" id="helpLink">Help</a>
      </div>
    </div>

    <div class="nav-links" id="navLinks">
      <a class="nav-link" data-section="home">Home</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="browse">Browse</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="search">Search</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="invite">Invite</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="film">Film</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="mail">Mail<span class="nav-badge" id="mailBadge">3</span></a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="blog">Blog</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="favorites">Favorites</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="forum">Forum</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="groups">Groups</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="events">Events</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="videos">Videos</a>
      <span class="nav-separator">|</span>
      <a class="nav-link nav-special" data-section="music">Music</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="comedy">Comedy</a>
      <span class="nav-separator">|</span>
      <a class="nav-link" data-section="classifieds">Classifieds</a>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        username: 'Tom',
        unreadMail: 3,
        friendRequests: 2
      };

      // Elements
      const usernameDisplay = document.getElementById('usernameDisplay');
      const mailBadge = document.getElementById('mailBadge');
      const navLinks = document.getElementById('navLinks');
      const logoLink = document.getElementById('logoLink');
      const searchBtn = document.getElementById('searchBtn');
      const searchInput = document.getElementById('searchInput');
      const searchType = document.getElementById('searchType');

      // Render
      function render() {
        usernameDisplay.textContent = state.username;
        mailBadge.textContent = state.unreadMail;
        mailBadge.style.display = state.unreadMail > 0 ? 'inline' : 'none';
      }

      // Nav link clicks
      navLinks.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          const section = this.dataset.section;
          API.emitOutput('nav.clicked', { section: section });
        });
      });

      // Logo click
      logoLink.addEventListener('click', function(e) {
        e.preventDefault();
        API.emitOutput('nav.clicked', { section: 'home' });
      });

      // Search
      searchBtn.addEventListener('click', function() {
        const query = searchInput.value.trim();
        const type = searchType.value;
        if (query) {
          API.emitOutput('nav.clicked', {
            section: 'search',
            query: query,
            searchType: type
          });
        }
      });

      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          searchBtn.click();
        }
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceNavWidget mounted');
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.username = data.username || state.username;
          state.unreadMail = data.unreadMail || 0;
          state.friendRequests = data.friendRequests || 0;
        }
        render();
        API.setState(state);
      });

      API.onDestroy(function() {
        API.log('MySpaceNavWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceNavWidget: BuiltinWidget = {
  manifest: MySpaceNavWidgetManifest,
  html: MySpaceNavWidgetHTML,
};
