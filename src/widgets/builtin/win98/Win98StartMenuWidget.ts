/**
 * Windows 98 Start Menu Widget
 *
 * Classic Windows 98 Start Menu with Programs, Documents, Settings, etc.
 * Features cascading submenus and the iconic Windows 98 banner.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const Win98StartMenuWidgetManifest: WidgetManifest = {
  id: 'stickernest.win98-start-menu',
  name: 'Start Menu',
  description: 'Windows 98 Start Menu',
  version: '1.0.0',
  author: 'StickerNest',
  category: 'retro',
  tags: ['windows', 'start', 'menu', '98', 'retro'],
  inputs: {
    'menu.toggle': { type: 'trigger', description: 'Toggle menu visibility' },
    'menu.close': { type: 'trigger', description: 'Close menu' },
  },
  outputs: {
    'program.clicked': { type: 'object', description: 'Program selected' },
    'action.clicked': { type: 'object', description: 'Action selected (shutdown, etc)' },
    'menu.state': { type: 'boolean', description: 'Menu open state' },
  },
  capabilities: ['content'],
  io: { inputs: ['menu.toggle', 'menu.close'], outputs: ['program.clicked', 'action.clicked', 'menu.state'] },
  events: ['program.launch', 'shutdown', 'logoff', 'run'],
  size: { width: 180, height: 320 },
};

export const Win98StartMenuWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "MS Sans Serif", "Tahoma", "Arial", sans-serif;
      font-size: 11px;
      background: transparent;
      overflow: visible;
    }

    .start-menu {
      background: #c0c0c0;
      border: 2px solid;
      border-color: #dfdfdf #000000 #000000 #dfdfdf;
      box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      display: flex;
      min-width: 180px;
    }

    /* Windows 98 Banner */
    .banner {
      width: 22px;
      background: linear-gradient(180deg, #000080, #1084d0);
      display: flex;
      align-items: flex-end;
      padding-bottom: 4px;
      justify-content: center;
    }

    .banner-text {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      color: #c0c0c0;
      font-weight: bold;
      font-size: 16px;
      letter-spacing: 2px;
      text-shadow: 1px 1px 0 #000;
    }

    .banner-text span {
      color: white;
    }

    /* Menu Items */
    .menu-content {
      flex: 1;
      padding: 2px 0;
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      cursor: pointer;
      position: relative;
      gap: 8px;
    }

    .menu-item:hover {
      background: #000080;
      color: white;
    }

    .menu-icon {
      width: 24px;
      font-size: 18px;
      text-align: center;
    }

    .menu-text {
      flex: 1;
    }

    .menu-arrow {
      font-size: 8px;
    }

    .menu-separator {
      border-top: 1px solid #808080;
      border-bottom: 1px solid #ffffff;
      margin: 4px 2px;
    }

    /* Submenu */
    .submenu {
      display: none;
      position: absolute;
      left: 100%;
      top: -2px;
      background: #c0c0c0;
      border: 2px solid;
      border-color: #dfdfdf #000000 #000000 #dfdfdf;
      box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      min-width: 180px;
      z-index: 100;
    }

    .menu-item:hover > .submenu {
      display: block;
    }

    .submenu .menu-item {
      padding: 3px 8px;
    }

    /* User section at top */
    .user-section {
      padding: 8px;
      border-bottom: 1px solid #808080;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-icon {
      font-size: 32px;
    }

    .user-name {
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="start-menu" id="startMenu">
    <!-- Windows 98 Banner -->
    <div class="banner">
      <div class="banner-text"><span>Windows</span>98</div>
    </div>

    <!-- Menu Content -->
    <div class="menu-content">
      <!-- Programs -->
      <div class="menu-item" data-has-submenu="true">
        <span class="menu-icon">📁</span>
        <span class="menu-text"><u>P</u>rograms</span>
        <span class="menu-arrow">▶</span>
        <div class="submenu">
          <div class="menu-item" data-has-submenu="true">
            <span class="menu-icon">📁</span>
            <span class="menu-text">Accessories</span>
            <span class="menu-arrow">▶</span>
            <div class="submenu">
              <div class="menu-item" data-program="notepad">
                <span class="menu-icon">📝</span>
                <span class="menu-text">Notepad</span>
              </div>
              <div class="menu-item" data-program="paint">
                <span class="menu-icon">🎨</span>
                <span class="menu-text">Paint</span>
              </div>
              <div class="menu-item" data-program="calculator">
                <span class="menu-icon">🔢</span>
                <span class="menu-text">Calculator</span>
              </div>
              <div class="menu-item" data-program="wordpad">
                <span class="menu-icon">📄</span>
                <span class="menu-text">WordPad</span>
              </div>
            </div>
          </div>
          <div class="menu-item" data-program="explorer">
            <span class="menu-icon">📁</span>
            <span class="menu-text">Windows Explorer</span>
          </div>
          <div class="menu-item" data-program="iexplore">
            <span class="menu-icon">🌍</span>
            <span class="menu-text">Internet Explorer</span>
          </div>
          <div class="menu-item" data-program="mediaplayer">
            <span class="menu-icon">🎬</span>
            <span class="menu-text">Windows Media Player</span>
          </div>
          <div class="menu-item" data-program="outlook">
            <span class="menu-icon">📧</span>
            <span class="menu-text">Outlook Express</span>
          </div>
          <div class="menu-separator"></div>
          <div class="menu-item" data-program="msdos">
            <span class="menu-icon">⬛</span>
            <span class="menu-text">MS-DOS Prompt</span>
          </div>
        </div>
      </div>

      <!-- Documents -->
      <div class="menu-item" data-has-submenu="true">
        <span class="menu-icon">📄</span>
        <span class="menu-text"><u>D</u>ocuments</span>
        <span class="menu-arrow">▶</span>
        <div class="submenu">
          <div class="menu-item" data-program="mydocs">
            <span class="menu-icon">📁</span>
            <span class="menu-text">My Documents</span>
          </div>
          <div class="menu-separator"></div>
          <div class="menu-item disabled">
            <span class="menu-icon">📄</span>
            <span class="menu-text">(Empty)</span>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="menu-item" data-has-submenu="true">
        <span class="menu-icon">⚙️</span>
        <span class="menu-text"><u>S</u>ettings</span>
        <span class="menu-arrow">▶</span>
        <div class="submenu">
          <div class="menu-item" data-program="controlpanel">
            <span class="menu-icon">🎛️</span>
            <span class="menu-text">Control Panel</span>
          </div>
          <div class="menu-item" data-program="printers">
            <span class="menu-icon">🖨️</span>
            <span class="menu-text">Printers</span>
          </div>
          <div class="menu-item" data-program="taskbar">
            <span class="menu-icon">📊</span>
            <span class="menu-text">Taskbar...</span>
          </div>
          <div class="menu-separator"></div>
          <div class="menu-item" data-program="activedesktop">
            <span class="menu-icon">🖥️</span>
            <span class="menu-text">Active Desktop</span>
          </div>
        </div>
      </div>

      <!-- Find -->
      <div class="menu-item" data-has-submenu="true">
        <span class="menu-icon">🔍</span>
        <span class="menu-text"><u>F</u>ind</span>
        <span class="menu-arrow">▶</span>
        <div class="submenu">
          <div class="menu-item" data-program="findfiles">
            <span class="menu-icon">📁</span>
            <span class="menu-text">Files or Folders...</span>
          </div>
          <div class="menu-item" data-program="findcomputer">
            <span class="menu-icon">💻</span>
            <span class="menu-text">Computer...</span>
          </div>
          <div class="menu-item" data-program="findonline">
            <span class="menu-icon">🌐</span>
            <span class="menu-text">On the Internet...</span>
          </div>
        </div>
      </div>

      <!-- Help -->
      <div class="menu-item" data-program="help">
        <span class="menu-icon">❓</span>
        <span class="menu-text"><u>H</u>elp</span>
      </div>

      <!-- Run -->
      <div class="menu-item" data-action="run">
        <span class="menu-icon">▶️</span>
        <span class="menu-text"><u>R</u>un...</span>
      </div>

      <div class="menu-separator"></div>

      <!-- Log Off -->
      <div class="menu-item" data-action="logoff">
        <span class="menu-icon">👤</span>
        <span class="menu-text"><u>L</u>og Off...</span>
      </div>

      <!-- Shut Down -->
      <div class="menu-item" data-action="shutdown">
        <span class="menu-icon">🔌</span>
        <span class="menu-text">Sh<u>u</u>t Down...</span>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      if (!API) return;

      const startMenu = document.getElementById('startMenu');
      let isOpen = true;

      // Handle menu item clicks
      document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
          e.stopPropagation();

          const program = this.dataset.program;
          const action = this.dataset.action;
          const hasSubmenu = this.dataset.hasSubmenu;

          if (hasSubmenu) return; // Don't trigger on submenu parents

          if (program) {
            API.emitOutput('program.clicked', { program: program, name: this.querySelector('.menu-text').textContent });
          } else if (action) {
            API.emitOutput('action.clicked', { action: action });
          }
        });
      });

      function toggleMenu() {
        isOpen = !isOpen;
        startMenu.style.display = isOpen ? 'flex' : 'none';
        API.emitOutput('menu.state', isOpen);
      }

      function closeMenu() {
        isOpen = false;
        startMenu.style.display = 'none';
        API.emitOutput('menu.state', false);
      }

      // Handle inputs
      API.onInput('menu.toggle', toggleMenu);
      API.onInput('menu.close', closeMenu);

      // Keyboard
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeMenu();
        }
      });

      API.onMount(function() {
        startMenu.style.display = 'flex';
        API.emitOutput('menu.state', true);
      });
    })();
  </script>
</body>
</html>
`;

export const Win98StartMenuWidget: BuiltinWidget = {
  manifest: Win98StartMenuWidgetManifest,
  html: Win98StartMenuWidgetHTML,
};
