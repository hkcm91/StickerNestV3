/**
 * Windows 98 Notepad Widget
 *
 * Classic Notepad text editor with authentic Windows 98 styling.
 * Features File/Edit/Search/Help menus, status bar, and proper 3D window chrome.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const Win98NotepadWidgetManifest: WidgetManifest = {
  id: 'stickernest.win98-notepad',
  name: 'Notepad',
  description: 'Windows 98 Notepad - Classic text editor',
  version: '1.0.0',
  author: 'StickerNest',
  category: 'retro',
  tags: ['windows', 'notepad', 'text', 'editor', '98', 'retro'],
  inputs: {
    'file.load': { type: 'object', description: 'Load file content' },
    'window.open': { type: 'trigger', description: 'Open window' },
    'window.activate': { type: 'trigger', description: 'Bring window to front' },
  },
  outputs: {
    'content.changed': { type: 'string', description: 'Text content changed' },
    'file.save': { type: 'object', description: 'Save file request' },
    'window.state': { type: 'object', description: 'Window state (open/minimized/closed)' },
  },
  capabilities: ['content'],
  io: { inputs: ['file.load', 'window.open', 'window.activate'], outputs: ['content.changed', 'file.save', 'window.state'] },
  events: ['file.new', 'file.open', 'file.save', 'window.minimize', 'window.close'],
  size: { width: 500, height: 400 },
};

export const Win98NotepadWidgetHTML = `
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

    /* Window Frame */
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

    .title-bar.inactive {
      background: linear-gradient(90deg, #808080, #a0a0a0);
    }

    .title-bar-icon {
      width: 14px;
      height: 14px;
      image-rendering: pixelated;
    }

    .title-bar-text {
      color: white;
      font-weight: bold;
      font-size: 11px;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Window Buttons */
    .title-bar-buttons {
      display: flex;
      gap: 2px;
    }

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
      font-family: "Marlett", sans-serif;
      font-size: 8px;
    }

    .title-btn:active {
      border-color: #000000 #ffffff #ffffff #000000;
      box-shadow: inset 1px 1px 0 #808080;
    }

    .title-btn span {
      font-family: inherit;
      line-height: 1;
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
      position: relative;
    }

    .menu-item:hover {
      background: #000080;
      color: white;
    }

    .menu-item u {
      text-decoration: underline;
    }

    /* Dropdown Menu */
    .dropdown {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      background: #c0c0c0;
      border: 2px solid;
      border-color: #dfdfdf #000000 #000000 #dfdfdf;
      box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
      z-index: 1000;
      min-width: 150px;
    }

    .menu-item:hover .dropdown,
    .dropdown.open {
      display: block;
    }

    .dropdown-item {
      padding: 3px 20px 3px 24px;
      cursor: pointer;
      white-space: nowrap;
    }

    .dropdown-item:hover {
      background: #000080;
      color: white;
    }

    .dropdown-separator {
      border-top: 1px solid #808080;
      border-bottom: 1px solid #ffffff;
      margin: 2px 0;
    }

    .dropdown-item.disabled {
      color: #808080;
      cursor: default;
    }

    .dropdown-item.disabled:hover {
      background: transparent;
      color: #808080;
    }

    .shortcut {
      float: right;
      margin-left: 30px;
      color: inherit;
    }

    /* Text Area */
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 2px;
    }

    .text-container {
      flex: 1;
      border: 2px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      box-shadow: inset 1px 1px 0 #000000;
      background: white;
      overflow: hidden;
    }

    textarea {
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      resize: none;
      font-family: "Fixedsys", "Courier New", monospace;
      font-size: 12px;
      padding: 2px;
      background: white;
      color: black;
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
      flex: 1;
    }

    /* Icons (using Unicode/CSS for simplicity) */
    .icon-notepad::before {
      content: "📝";
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="win98-window" id="notepadWindow">
    <!-- Title Bar -->
    <div class="title-bar" id="titleBar">
      <span class="icon-notepad"></span>
      <span class="title-bar-text" id="titleText">Untitled - Notepad</span>
      <div class="title-bar-buttons">
        <button class="title-btn" id="minimizeBtn" title="Minimize">
          <span>🗕</span>
        </button>
        <button class="title-btn" id="maximizeBtn" title="Maximize">
          <span>🗖</span>
        </button>
        <button class="title-btn" id="closeBtn" title="Close">
          <span>✕</span>
        </button>
      </div>
    </div>

    <!-- Menu Bar -->
    <div class="menu-bar">
      <div class="menu-item">
        <u>F</u>ile
        <div class="dropdown" id="fileMenu">
          <div class="dropdown-item" data-action="new"><u>N</u>ew<span class="shortcut">Ctrl+N</span></div>
          <div class="dropdown-item" data-action="open"><u>O</u>pen...<span class="shortcut">Ctrl+O</span></div>
          <div class="dropdown-item" data-action="save"><u>S</u>ave<span class="shortcut">Ctrl+S</span></div>
          <div class="dropdown-item" data-action="saveAs">Save <u>A</u>s...</div>
          <div class="dropdown-separator"></div>
          <div class="dropdown-item" data-action="pageSetup">Page Set<u>u</u>p...</div>
          <div class="dropdown-item" data-action="print"><u>P</u>rint...<span class="shortcut">Ctrl+P</span></div>
          <div class="dropdown-separator"></div>
          <div class="dropdown-item" data-action="exit">E<u>x</u>it</div>
        </div>
      </div>
      <div class="menu-item">
        <u>E</u>dit
        <div class="dropdown" id="editMenu">
          <div class="dropdown-item" data-action="undo"><u>U</u>ndo<span class="shortcut">Ctrl+Z</span></div>
          <div class="dropdown-separator"></div>
          <div class="dropdown-item" data-action="cut">Cu<u>t</u><span class="shortcut">Ctrl+X</span></div>
          <div class="dropdown-item" data-action="copy"><u>C</u>opy<span class="shortcut">Ctrl+C</span></div>
          <div class="dropdown-item" data-action="paste"><u>P</u>aste<span class="shortcut">Ctrl+V</span></div>
          <div class="dropdown-item" data-action="delete">De<u>l</u>ete<span class="shortcut">Del</span></div>
          <div class="dropdown-separator"></div>
          <div class="dropdown-item" data-action="selectAll">Select <u>A</u>ll<span class="shortcut">Ctrl+A</span></div>
          <div class="dropdown-item" data-action="timeDate">Time/<u>D</u>ate<span class="shortcut">F5</span></div>
        </div>
      </div>
      <div class="menu-item">
        <u>S</u>earch
        <div class="dropdown" id="searchMenu">
          <div class="dropdown-item" data-action="find"><u>F</u>ind...<span class="shortcut">Ctrl+F</span></div>
          <div class="dropdown-item" data-action="findNext">Find <u>N</u>ext<span class="shortcut">F3</span></div>
        </div>
      </div>
      <div class="menu-item">
        <u>H</u>elp
        <div class="dropdown" id="helpMenu">
          <div class="dropdown-item" data-action="helpTopics"><u>H</u>elp Topics</div>
          <div class="dropdown-separator"></div>
          <div class="dropdown-item" data-action="about"><u>A</u>bout Notepad</div>
        </div>
      </div>
    </div>

    <!-- Text Area -->
    <div class="content-area">
      <div class="text-container">
        <textarea id="textArea" spellcheck="false"></textarea>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-section" id="statusText">Ln 1, Col 1</div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      if (!API) return;

      let currentFileName = 'Untitled';
      let isModified = false;
      let isMinimized = false;
      let documentId = null;  // Reference to unified document store

      const textArea = document.getElementById('textArea');
      const titleText = document.getElementById('titleText');
      const statusText = document.getElementById('statusText');
      const titleBar = document.getElementById('titleBar');

      // Update title
      function updateTitle() {
        const modified = isModified ? '*' : '';
        titleText.textContent = modified + currentFileName + ' - Notepad';
      }

      // Update status bar with cursor position
      function updateStatus() {
        const text = textArea.value.substring(0, textArea.selectionStart);
        const lines = text.split('\\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        statusText.textContent = 'Ln ' + line + ', Col ' + col;
      }

      // Save to unified document store
      async function saveToStore() {
        const docData = {
          title: currentFileName || 'Untitled',
          content: textArea.value,
          contentType: 'text',
          category: 'note',
        };

        // Show saving feedback
        statusText.textContent = 'Saving...';

        try {
          if (documentId) {
            await API.request('document:update', { id: documentId, updates: docData });
          } else {
            const result = await API.request('document:create', {
              ...docData,
              tags: ['notepad', 'text'],
              sourceType: 'manual',
            });
            documentId = result.document.id;
            API.setState({ documentId });
          }
          isModified = false;
          updateTitle();

          // Show success feedback
          statusText.textContent = 'Saved!';
          setTimeout(function() {
            updateStatus();
          }, 1500);

          API.emitOutput('file.save', { name: currentFileName, content: textArea.value, documentId });
          API.log('Saved to unified store: ' + documentId);
        } catch (err) {
          // Show error feedback
          statusText.textContent = 'Save failed!';
          setTimeout(function() {
            updateStatus();
          }, 2000);
          API.log('Failed to save: ' + err.message, 'error');
        }
      }

      // Text area events
      textArea.addEventListener('input', function() {
        isModified = true;
        updateTitle();
        API.emitOutput('content.changed', textArea.value);
      });

      textArea.addEventListener('click', updateStatus);
      textArea.addEventListener('keyup', updateStatus);

      // Menu actions
      document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function() {
          const action = this.dataset.action;
          handleMenuAction(action);
        });
      });

      async function handleMenuAction(action) {
        switch(action) {
          case 'new':
            if (isModified && !confirm('Do you want to save changes?')) return;
            textArea.value = '';
            currentFileName = 'Untitled';
            documentId = null;
            isModified = false;
            API.setState({ documentId: undefined });
            updateTitle();
            break;
          case 'selectAll':
            textArea.select();
            break;
          case 'timeDate':
            const now = new Date();
            const timeStr = now.toLocaleTimeString() + ' ' + now.toLocaleDateString();
            const start = textArea.selectionStart;
            textArea.value = textArea.value.substring(0, start) + timeStr + textArea.value.substring(textArea.selectionEnd);
            textArea.selectionStart = textArea.selectionEnd = start + timeStr.length;
            isModified = true;
            updateTitle();
            break;
          case 'cut':
            document.execCommand('cut');
            break;
          case 'copy':
            document.execCommand('copy');
            break;
          case 'paste':
            navigator.clipboard.readText().then(text => {
              document.execCommand('insertText', false, text);
            });
            break;
          case 'undo':
            document.execCommand('undo');
            break;
          case 'save':
            await saveToStore();
            break;
          case 'exit':
            API.emitOutput('window.state', { state: 'closed' });
            break;
          case 'about':
            alert('Notepad\\n\\nWindows 98 Style\\n\\nFor StickerNest');
            break;
        }
      }

      // Window buttons
      document.getElementById('minimizeBtn').addEventListener('click', function() {
        isMinimized = true;
        API.emitOutput('window.state', { state: 'minimized', title: titleText.textContent });
      });

      document.getElementById('closeBtn').addEventListener('click', async function() {
        if (isModified) {
          if (confirm('Save changes to ' + currentFileName + '?')) {
            await saveToStore();
          }
        }
        API.emitOutput('window.state', { state: 'closed' });
      });

      // Handle inputs
      API.onInput('file.load', async function(data) {
        if (data && data.documentId) {
          // Load from unified store by ID
          try {
            const result = await API.request('document:get', { id: data.documentId });
            if (result.document) {
              textArea.value = result.document.content || '';
              currentFileName = result.document.title || 'Untitled';
              documentId = data.documentId;
              isModified = false;
              API.setState({ documentId });
              updateTitle();
              API.log('Loaded document from unified store');
            }
          } catch (err) {
            API.log('Failed to load document: ' + err.message, 'error');
          }
        } else if (data && data.content) {
          textArea.value = data.content;
          currentFileName = data.name || 'Untitled';
          documentId = null;
          isModified = false;
          updateTitle();
        }
      });

      API.onInput('window.open', function() {
        isMinimized = false;
        API.emitOutput('window.state', { state: 'open', title: titleText.textContent });
      });

      API.onInput('window.activate', function() {
        isMinimized = false;
        titleBar.classList.remove('inactive');
        textArea.focus();
      });

      // Initial state
      API.onMount(async function(context) {
        const state = context.state || {};

        if (state.documentId) {
          // Load from unified store
          documentId = state.documentId;
          try {
            const result = await API.request('document:get', { id: documentId });
            if (result.document) {
              textArea.value = result.document.content || '';
              currentFileName = result.document.title || 'Untitled';
              API.log('Loaded from unified store: ' + documentId);
            }
          } catch (err) {
            API.log('Failed to load document: ' + err.message, 'error');
          }
        } else if (state.textContent) {
          // Migrate legacy content
          textArea.value = state.textContent;
          currentFileName = state.currentFileName || 'Untitled';

          try {
            const result = await API.request('document:create', {
              title: currentFileName,
              content: textArea.value,
              contentType: 'text',
              category: 'note',
              tags: ['notepad', 'text'],
              sourceType: 'import',
            });
            documentId = result.document.id;
            API.setState({
              documentId,
              textContent: undefined,
              currentFileName: undefined
            });
            API.log('Migrated legacy content to unified store');
          } catch (err) {
            API.log('Failed to migrate: ' + err.message, 'error');
          }
        }

        updateTitle();
        updateStatus();
        API.emitOutput('window.state', { state: 'open', title: titleText.textContent });
      });

      // Keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        if (e.ctrlKey) {
          switch(e.key.toLowerCase()) {
            case 'n': e.preventDefault(); handleMenuAction('new'); break;
            case 's': e.preventDefault(); handleMenuAction('save'); break;
            case 'a': e.preventDefault(); handleMenuAction('selectAll'); break;
          }
        }
        if (e.key === 'F5') {
          e.preventDefault();
          handleMenuAction('timeDate');
        }
      });
    })();
  </script>
</body>
</html>
`;

export const Win98NotepadWidget: BuiltinWidget = {
  manifest: Win98NotepadWidgetManifest,
  html: Win98NotepadWidgetHTML,
};
