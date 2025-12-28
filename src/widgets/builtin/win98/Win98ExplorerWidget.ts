/**
 * Windows 98 Explorer Widget
 *
 * Classic Windows Explorer file browser with tree view and file list.
 * Features folder navigation, file icons, and authentic styling.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const Win98ExplorerWidgetManifest: WidgetManifest = {
  id: 'stickernest.win98-explorer',
  name: 'Windows Explorer',
  description: 'Windows 98 Explorer - File browser',
  version: '1.0.0',
  author: 'StickerNest',
  category: 'retro',
  tags: ['windows', 'explorer', 'files', 'browser', '98', 'retro'],
  inputs: {
    'path.set': { type: 'string', description: 'Navigate to path' },
    'window.open': { type: 'trigger', description: 'Open window' },
    'window.activate': { type: 'trigger', description: 'Bring to front' },
  },
  outputs: {
    'file.open': { type: 'object', description: 'File double-clicked' },
    'file.selected': { type: 'object', description: 'File selected' },
    'path.changed': { type: 'string', description: 'Current path changed' },
    'window.state': { type: 'object', description: 'Window state' },
  },
  capabilities: ['content'],
  io: { inputs: ['path.set', 'window.open', 'window.activate'], outputs: ['file.open', 'file.selected', 'path.changed', 'window.state'] },
  events: ['file.doubleclick', 'folder.open', 'navigate.back', 'navigate.up'],
  size: { width: 600, height: 450 },
};

export const Win98ExplorerWidgetHTML = `
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
      background: #c0c0c0;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .win98-window {
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 2px solid;
      border-color: #dfdfdf #000000 #000000 #dfdfdf;
      box-shadow: inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080;
      background: #c0c0c0;
    }

    /* Title Bar */
    .title-bar {
      background: linear-gradient(90deg, #000080, #1084d0);
      padding: 2px 3px;
      display: flex;
      align-items: center;
      gap: 3px;
      min-height: 18px;
    }

    .title-bar-icon { font-size: 12px; }

    .title-bar-text {
      color: white;
      font-weight: bold;
      font-size: 11px;
      flex: 1;
    }

    .title-bar-buttons { display: flex; gap: 2px; }

    .title-btn {
      width: 16px;
      height: 14px;
      background: #c0c0c0;
      border: 1px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      box-shadow: inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 8px;
    }

    .title-btn:active {
      border-color: #000000 #ffffff #ffffff #000000;
      box-shadow: inset 1px 1px 0 #808080;
    }

    /* Menu Bar */
    .menu-bar {
      background: #c0c0c0;
      display: flex;
      padding: 1px 0;
      border-bottom: 1px solid #808080;
    }

    .menu-item {
      padding: 2px 8px;
      cursor: pointer;
    }

    .menu-item:hover {
      background: #000080;
      color: white;
    }

    /* Toolbar */
    .toolbar {
      background: #c0c0c0;
      display: flex;
      align-items: center;
      padding: 2px 4px;
      gap: 2px;
      border-bottom: 1px solid #808080;
    }

    .toolbar-btn {
      width: 23px;
      height: 22px;
      background: #c0c0c0;
      border: 1px solid transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
    }

    .toolbar-btn:hover {
      border: 1px solid;
      border-color: #ffffff #808080 #808080 #ffffff;
    }

    .toolbar-btn:active {
      border-color: #808080 #ffffff #ffffff #808080;
    }

    .toolbar-btn.disabled {
      opacity: 0.5;
      cursor: default;
    }

    .toolbar-separator {
      width: 2px;
      height: 20px;
      border-left: 1px solid #808080;
      border-right: 1px solid #ffffff;
      margin: 0 4px;
    }

    /* Address Bar */
    .address-bar {
      background: #c0c0c0;
      display: flex;
      align-items: center;
      padding: 2px 4px;
      gap: 4px;
      border-bottom: 1px solid #808080;
    }

    .address-bar label {
      font-size: 11px;
    }

    .address-input {
      flex: 1;
      height: 20px;
      border: 2px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      padding: 0 4px;
      font-family: inherit;
      font-size: 11px;
      background: white;
    }

    /* Main Content */
    .content-area {
      flex: 1;
      display: flex;
      background: #c0c0c0;
      padding: 2px;
      gap: 2px;
      overflow: hidden;
    }

    /* Tree View */
    .tree-panel {
      width: 180px;
      border: 2px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      box-shadow: inset 1px 1px 0 #000000;
      background: white;
      overflow: auto;
    }

    .tree-item {
      display: flex;
      align-items: center;
      padding: 1px 4px;
      cursor: pointer;
      white-space: nowrap;
    }

    .tree-item:hover {
      background: #000080;
      color: white;
    }

    .tree-item.selected {
      background: #000080;
      color: white;
    }

    .tree-icon { margin-right: 4px; font-size: 14px; }
    .tree-expand { width: 16px; text-align: center; font-size: 10px; }

    .tree-children {
      margin-left: 16px;
    }

    /* File List */
    .file-panel {
      flex: 1;
      border: 2px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      box-shadow: inset 1px 1px 0 #000000;
      background: white;
      overflow: auto;
    }

    .file-list {
      display: flex;
      flex-wrap: wrap;
      padding: 8px;
      gap: 8px;
      align-content: flex-start;
    }

    .file-item {
      width: 70px;
      text-align: center;
      padding: 4px;
      cursor: pointer;
    }

    .file-item:hover {
      background: #000080;
      color: white;
    }

    .file-item.selected {
      background: #000080;
      color: white;
    }

    .file-icon {
      font-size: 32px;
      margin-bottom: 2px;
    }

    .file-name {
      font-size: 11px;
      word-break: break-word;
      max-height: 28px;
      overflow: hidden;
    }

    /* Status Bar */
    .status-bar {
      background: #c0c0c0;
      border-top: 1px solid #ffffff;
      padding: 2px 4px;
      display: flex;
      font-size: 11px;
    }

    .status-section {
      border: 1px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      padding: 1px 4px;
    }

    .status-section:first-child { flex: 2; }
    .status-section:last-child { flex: 1; }
  </style>
</head>
<body>
  <div class="win98-window">
    <!-- Title Bar -->
    <div class="title-bar">
      <span class="title-bar-icon">📁</span>
      <span class="title-bar-text" id="titleText">My Computer</span>
      <div class="title-bar-buttons">
        <button class="title-btn" id="minimizeBtn">🗕</button>
        <button class="title-btn" id="maximizeBtn">🗖</button>
        <button class="title-btn" id="closeBtn">✕</button>
      </div>
    </div>

    <!-- Menu Bar -->
    <div class="menu-bar">
      <div class="menu-item"><u>F</u>ile</div>
      <div class="menu-item"><u>E</u>dit</div>
      <div class="menu-item"><u>V</u>iew</div>
      <div class="menu-item"><u>G</u>o</div>
      <div class="menu-item">F<u>a</u>vorites</div>
      <div class="menu-item"><u>H</u>elp</div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="toolbar-btn" id="backBtn" title="Back">⬅️</button>
      <button class="toolbar-btn" id="forwardBtn" title="Forward" disabled>➡️</button>
      <button class="toolbar-btn" id="upBtn" title="Up">⬆️</button>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" id="cutBtn" title="Cut">✂️</button>
      <button class="toolbar-btn" id="copyBtn" title="Copy">📋</button>
      <button class="toolbar-btn" id="pasteBtn" title="Paste">📄</button>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" id="deleteBtn" title="Delete">🗑️</button>
      <button class="toolbar-btn" id="propsBtn" title="Properties">📝</button>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" id="viewsBtn" title="Views">🔲</button>
    </div>

    <!-- Address Bar -->
    <div class="address-bar">
      <label>Address</label>
      <input type="text" class="address-input" id="addressInput" value="C:\\">
    </div>

    <!-- Main Content -->
    <div class="content-area">
      <!-- Tree View -->
      <div class="tree-panel" id="treePanel">
        <div class="tree-item selected" data-path="C:\\">
          <span class="tree-expand">−</span>
          <span class="tree-icon">💻</span>
          <span>My Computer</span>
        </div>
        <div class="tree-children">
          <div class="tree-item" data-path="C:\\">
            <span class="tree-expand">+</span>
            <span class="tree-icon">💾</span>
            <span>(C:)</span>
          </div>
          <div class="tree-item" data-path="D:\\">
            <span class="tree-expand">+</span>
            <span class="tree-icon">💿</span>
            <span>(D:)</span>
          </div>
        </div>
        <div class="tree-item" data-path="Network">
          <span class="tree-expand">+</span>
          <span class="tree-icon">🌐</span>
          <span>Network Neighborhood</span>
        </div>
        <div class="tree-item" data-path="Recycle">
          <span class="tree-expand"></span>
          <span class="tree-icon">🗑️</span>
          <span>Recycle Bin</span>
        </div>
      </div>

      <!-- File List -->
      <div class="file-panel">
        <div class="file-list" id="fileList">
          <!-- Files populated by JS -->
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-section" id="statusObjects">6 object(s)</div>
      <div class="status-section" id="statusSize">1.44 MB</div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      if (!API) return;

      let currentPath = 'C:\\\\';
      let history = ['C:\\\\'];
      let historyIndex = 0;
      let selectedFile = null;

      // Mock file system
      const fileSystem = {
        'C:\\\\': [
          { name: 'Program Files', type: 'folder', icon: '📁' },
          { name: 'Windows', type: 'folder', icon: '📁' },
          { name: 'My Documents', type: 'folder', icon: '📁' },
          { name: 'readme.txt', type: 'txt', icon: '📄', size: '2 KB' },
          { name: 'autoexec.bat', type: 'bat', icon: '⚙️', size: '1 KB' },
          { name: 'config.sys', type: 'sys', icon: '⚙️', size: '1 KB' },
        ],
        'C:\\\\My Documents': [
          { name: 'My Pictures', type: 'folder', icon: '📁' },
          { name: 'My Music', type: 'folder', icon: '📁' },
          { name: 'letter.txt', type: 'txt', icon: '📄', size: '4 KB' },
          { name: 'report.doc', type: 'doc', icon: '📘', size: '24 KB' },
        ],
        'C:\\\\My Documents\\\\My Music': [
          { name: 'song1.mp3', type: 'mp3', icon: '🎵', size: '3.5 MB' },
          { name: 'song2.mp3', type: 'mp3', icon: '🎵', size: '4.2 MB' },
          { name: 'playlist.m3u', type: 'm3u', icon: '📝', size: '1 KB' },
        ],
        'C:\\\\My Documents\\\\My Pictures': [
          { name: 'vacation.jpg', type: 'jpg', icon: '🖼️', size: '156 KB' },
          { name: 'family.jpg', type: 'jpg', icon: '🖼️', size: '234 KB' },
          { name: 'screenshot.bmp', type: 'bmp', icon: '🖼️', size: '1.2 MB' },
        ],
        'C:\\\\Windows': [
          { name: 'System', type: 'folder', icon: '📁' },
          { name: 'System32', type: 'folder', icon: '📁' },
          { name: 'Fonts', type: 'folder', icon: '📁' },
          { name: 'notepad.exe', type: 'exe', icon: '📝', size: '52 KB' },
          { name: 'explorer.exe', type: 'exe', icon: '📁', size: '236 KB' },
          { name: 'mplayer.exe', type: 'exe', icon: '🎬', size: '412 KB' },
        ],
        'C:\\\\Program Files': [
          { name: 'Internet Explorer', type: 'folder', icon: '📁' },
          { name: 'Windows Media Player', type: 'folder', icon: '📁' },
          { name: 'Accessories', type: 'folder', icon: '📁' },
        ]
      };

      const fileList = document.getElementById('fileList');
      const addressInput = document.getElementById('addressInput');
      const titleText = document.getElementById('titleText');
      const statusObjects = document.getElementById('statusObjects');

      function renderFiles(path) {
        const files = fileSystem[path] || [];
        fileList.innerHTML = '';

        files.forEach(file => {
          const item = document.createElement('div');
          item.className = 'file-item';
          item.innerHTML = '<div class="file-icon">' + file.icon + '</div><div class="file-name">' + file.name + '</div>';

          item.addEventListener('click', function(e) {
            document.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedFile = file;
            API.emitOutput('file.selected', file);
          });

          item.addEventListener('dblclick', function() {
            if (file.type === 'folder') {
              navigateTo(path + file.name + '\\\\');
            } else {
              API.emitOutput('file.open', { ...file, path: path + file.name, ext: file.type });
            }
          });

          fileList.appendChild(item);
        });

        statusObjects.textContent = files.length + ' object(s)';
      }

      function navigateTo(path) {
        currentPath = path;
        addressInput.value = path.replace(/\\\\\\\\/g, '\\\\');
        titleText.textContent = path.split('\\\\').filter(Boolean).pop() || 'My Computer';
        renderFiles(path);

        // Update history
        if (historyIndex < history.length - 1) {
          history = history.slice(0, historyIndex + 1);
        }
        history.push(path);
        historyIndex = history.length - 1;

        API.emitOutput('path.changed', path);
      }

      // Navigation buttons
      document.getElementById('backBtn').addEventListener('click', function() {
        if (historyIndex > 0) {
          historyIndex--;
          currentPath = history[historyIndex];
          addressInput.value = currentPath.replace(/\\\\\\\\/g, '\\\\');
          renderFiles(currentPath);
        }
      });

      document.getElementById('upBtn').addEventListener('click', function() {
        const parts = currentPath.split('\\\\').filter(Boolean);
        if (parts.length > 1) {
          parts.pop();
          navigateTo(parts.join('\\\\') + '\\\\');
        }
      });

      // Tree click
      document.querySelectorAll('.tree-item').forEach(item => {
        item.addEventListener('click', function() {
          document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
          this.classList.add('selected');
          const path = this.dataset.path;
          if (path) navigateTo(path);
        });
      });

      // Window buttons
      document.getElementById('minimizeBtn').addEventListener('click', function() {
        API.emitOutput('window.state', { state: 'minimized', title: titleText.textContent });
      });

      document.getElementById('closeBtn').addEventListener('click', function() {
        API.emitOutput('window.state', { state: 'closed' });
      });

      // Handle inputs
      API.onInput('path.set', navigateTo);

      API.onInput('window.open', function() {
        API.emitOutput('window.state', { state: 'open', title: titleText.textContent });
      });

      API.onMount(function() {
        renderFiles(currentPath);
        API.emitOutput('window.state', { state: 'open', title: 'My Computer' });
      });
    })();
  </script>
</body>
</html>
`;

export const Win98ExplorerWidget: BuiltinWidget = {
  manifest: Win98ExplorerWidgetManifest,
  html: Win98ExplorerWidgetHTML,
};
