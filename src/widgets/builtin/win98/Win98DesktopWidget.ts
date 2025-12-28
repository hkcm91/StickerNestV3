/**
 * Windows 98 Desktop Widget
 *
 * Classic Windows 98 desktop with draggable icons.
 * Features My Computer, My Documents, Recycle Bin, and program shortcuts.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const Win98DesktopWidgetManifest: WidgetManifest = {
  id: 'stickernest.win98-desktop',
  name: 'Windows 98 Desktop',
  description: 'Windows 98 Desktop with icons',
  version: '1.0.0',
  author: 'StickerNest',
  category: 'retro',
  tags: ['windows', 'desktop', 'icons', '98', 'retro'],
  inputs: {
    'icons.add': { type: 'object', description: 'Add desktop icon' },
    'icons.remove': { type: 'string', description: 'Remove icon by name' },
  },
  outputs: {
    'app.launch': { type: 'object', description: 'Application launched' },
    'icon.selected': { type: 'object', description: 'Icon selected' },
    'context.menu': { type: 'object', description: 'Right-click context menu' },
  },
  capabilities: ['content'],
  io: { inputs: ['icons.add', 'icons.remove'], outputs: ['app.launch', 'icon.selected', 'context.menu'] },
  events: ['icon.doubleclick', 'icon.rightclick', 'desktop.rightclick'],
  size: { width: 800, height: 600 },
};

export const Win98DesktopWidgetHTML = `
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
      background: #008080;
      overflow: hidden;
      height: 100vh;
      user-select: none;
    }

    .desktop {
      width: 100%;
      height: 100%;
      position: relative;
      padding: 8px;
    }

    .desktop-icon {
      position: absolute;
      width: 75px;
      text-align: center;
      padding: 4px;
      cursor: pointer;
      border: 1px solid transparent;
    }

    .desktop-icon:hover {
      background: rgba(0, 0, 128, 0.3);
    }

    .desktop-icon.selected {
      background: #000080;
      border: 1px dotted #ffffff;
    }

    .desktop-icon.selected .icon-label {
      background: #000080;
      color: white;
    }

    .icon-image {
      font-size: 32px;
      margin-bottom: 2px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }

    .icon-label {
      color: white;
      text-shadow: 1px 1px 1px #000000;
      word-break: break-word;
      font-size: 11px;
      padding: 1px 2px;
    }

    /* Context Menu */
    .context-menu {
      display: none;
      position: absolute;
      background: #c0c0c0;
      border: 2px solid;
      border-color: #dfdfdf #000000 #000000 #dfdfdf;
      box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      z-index: 1000;
      min-width: 150px;
    }

    .context-menu.visible {
      display: block;
    }

    .context-item {
      padding: 4px 24px 4px 24px;
      cursor: pointer;
    }

    .context-item:hover {
      background: #000080;
      color: white;
    }

    .context-separator {
      border-top: 1px solid #808080;
      border-bottom: 1px solid #ffffff;
      margin: 2px 0;
    }

    /* Selection Box */
    .selection-box {
      display: none;
      position: absolute;
      border: 1px dotted #ffffff;
      background: rgba(0, 0, 128, 0.2);
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="desktop" id="desktop">
    <!-- Icons will be added here -->
  </div>

  <div class="context-menu" id="contextMenu">
    <div class="context-item" data-action="arrange">Arrange Icons</div>
    <div class="context-item" data-action="lineup">Line up Icons</div>
    <div class="context-separator"></div>
    <div class="context-item" data-action="refresh">Refresh</div>
    <div class="context-separator"></div>
    <div class="context-item" data-action="paste">Paste</div>
    <div class="context-item" data-action="paste-shortcut">Paste Shortcut</div>
    <div class="context-separator"></div>
    <div class="context-item" data-action="new">New ▶</div>
    <div class="context-separator"></div>
    <div class="context-item" data-action="properties">Properties</div>
  </div>

  <div class="selection-box" id="selectionBox"></div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      if (!API) return;

      const desktop = document.getElementById('desktop');
      const contextMenu = document.getElementById('contextMenu');
      let selectedIcons = [];

      // Default desktop icons
      const defaultIcons = [
        { id: 'mycomputer', name: 'My Computer', icon: '💻', app: 'explorer', x: 8, y: 8 },
        { id: 'mydocuments', name: 'My Documents', icon: '📁', app: 'explorer', x: 8, y: 90 },
        { id: 'network', name: 'Network Neighborhood', icon: '🌐', app: 'network', x: 8, y: 172 },
        { id: 'recycle', name: 'Recycle Bin', icon: '🗑️', app: 'recycle', x: 8, y: 254 },
        { id: 'ie', name: 'Internet Explorer', icon: '🌍', app: 'iexplore', x: 8, y: 336 },
        { id: 'notepad', name: 'Notepad', icon: '📝', app: 'notepad', x: 8, y: 418 },
        { id: 'mediaplayer', name: 'Media Player', icon: '🎬', app: 'mediaplayer', x: 8, y: 500 },
      ];

      let icons = [...defaultIcons];

      function createIconElement(iconData) {
        const el = document.createElement('div');
        el.className = 'desktop-icon';
        el.dataset.id = iconData.id;
        el.style.left = iconData.x + 'px';
        el.style.top = iconData.y + 'px';
        el.innerHTML = '<div class="icon-image">' + iconData.icon + '</div>' +
                       '<div class="icon-label">' + iconData.name + '</div>';

        // Click to select
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          if (!e.ctrlKey) {
            clearSelection();
          }
          el.classList.add('selected');
          selectedIcons.push(iconData);
          API.emitOutput('icon.selected', iconData);
        });

        // Double-click to launch
        el.addEventListener('dblclick', function(e) {
          e.stopPropagation();
          API.emitOutput('app.launch', { app: iconData.app, name: iconData.name });
        });

        // Right-click for icon context menu
        el.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (!el.classList.contains('selected')) {
            clearSelection();
            el.classList.add('selected');
            selectedIcons.push(iconData);
          }
          showIconContextMenu(e.clientX, e.clientY, iconData);
        });

        return el;
      }

      function renderIcons() {
        desktop.innerHTML = '';
        icons.forEach(iconData => {
          desktop.appendChild(createIconElement(iconData));
        });
      }

      function clearSelection() {
        document.querySelectorAll('.desktop-icon.selected').forEach(el => {
          el.classList.remove('selected');
        });
        selectedIcons = [];
      }

      function showIconContextMenu(x, y, iconData) {
        contextMenu.innerHTML =
          '<div class="context-item" data-action="open">Open</div>' +
          '<div class="context-item" data-action="explore">Explore</div>' +
          '<div class="context-separator"></div>' +
          '<div class="context-item" data-action="cut">Cut</div>' +
          '<div class="context-item" data-action="copy">Copy</div>' +
          '<div class="context-separator"></div>' +
          '<div class="context-item" data-action="create-shortcut">Create Shortcut</div>' +
          '<div class="context-item" data-action="delete">Delete</div>' +
          '<div class="context-item" data-action="rename">Rename</div>' +
          '<div class="context-separator"></div>' +
          '<div class="context-item" data-action="properties">Properties</div>';

        showContextMenu(x, y);
      }

      function showContextMenu(x, y) {
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.classList.add('visible');
      }

      function hideContextMenu() {
        contextMenu.classList.remove('visible');
      }

      // Desktop right-click
      desktop.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        clearSelection();
        contextMenu.innerHTML =
          '<div class="context-item" data-action="arrange">Arrange Icons</div>' +
          '<div class="context-item" data-action="lineup">Line up Icons</div>' +
          '<div class="context-separator"></div>' +
          '<div class="context-item" data-action="refresh">Refresh</div>' +
          '<div class="context-separator"></div>' +
          '<div class="context-item" data-action="paste">Paste</div>' +
          '<div class="context-item" data-action="paste-shortcut">Paste Shortcut</div>' +
          '<div class="context-separator"></div>' +
          '<div class="context-item" data-action="new">New ▶</div>' +
          '<div class="context-separator"></div>' +
          '<div class="context-item" data-action="properties">Properties</div>';
        showContextMenu(e.clientX, e.clientY);
        API.emitOutput('context.menu', { x: e.clientX, y: e.clientY, target: 'desktop' });
      });

      // Desktop click clears selection
      desktop.addEventListener('click', function(e) {
        if (e.target === desktop) {
          clearSelection();
        }
        hideContextMenu();
      });

      // Context menu actions
      contextMenu.addEventListener('click', function(e) {
        const action = e.target.dataset.action;
        if (action === 'open' && selectedIcons.length > 0) {
          API.emitOutput('app.launch', { app: selectedIcons[0].app, name: selectedIcons[0].name });
        } else if (action === 'refresh') {
          renderIcons();
        }
        hideContextMenu();
      });

      // Hide context menu on escape
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          hideContextMenu();
          clearSelection();
        }
      });

      // Handle inputs
      API.onInput('icons.add', function(iconData) {
        icons.push(iconData);
        renderIcons();
      });

      API.onInput('icons.remove', function(iconId) {
        icons = icons.filter(i => i.id !== iconId);
        renderIcons();
      });

      API.onMount(function() {
        renderIcons();
      });
    })();
  </script>
</body>
</html>
`;

export const Win98DesktopWidget: BuiltinWidget = {
  manifest: Win98DesktopWidgetManifest,
  html: Win98DesktopWidgetHTML,
};
