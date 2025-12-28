/**
 * StickerNest v2 - Voice Notes Widget
 *
 * Voice input widget using Web Speech API for transcription.
 * Supports multiple modes: notes, shopping list, to-do list, and free-form.
 * Outputs transcribed text to pipeline for document storage.
 *
 * Part of personal document management pipeline.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const VoiceNotesWidgetManifest: WidgetManifest = {
  id: 'stickernest.voice-notes',
  name: 'Voice Notes',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description:
    'Voice-to-text widget for notes, shopping lists, and to-do items. Uses browser speech recognition.',
  author: 'StickerNest',
  tags: ['speech', 'voice', 'transcription', 'notes', 'todo', 'shopping'],
  inputs: {
    mode: {
      type: 'string',
      description: 'Input mode: note, shopping, todo, or freeform',
      default: 'note',
    },
    trigger: {
      type: 'trigger',
      description: 'Start/stop recording',
    },
    clear: {
      type: 'trigger',
      description: 'Clear current transcription',
    },
  },
  outputs: {
    text: {
      type: 'object',
      description: 'Transcribed text with metadata',
    },
    recording: {
      type: 'boolean',
      description: 'Whether recording is active',
    },
    items: {
      type: 'array',
      description: 'List items (for shopping/todo modes)',
    },
    documentSaved: {
      type: 'object',
      description: 'Emitted when saved to document store',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['config.mode', 'trigger.record', 'trigger.clear'],
    outputs: ['text.transcribed', 'status.recording', 'list.items', 'document.saved'],
  },
  size: {
    width: 300,
    height: 380,
    minWidth: 260,
    minHeight: 320,
    scaleMode: 'stretch',
  },
  events: {
    emits: ['speech.complete', 'document.created'],
    listens: ['record.start', 'record.stop'],
  },
};

export const VoiceNotesWidgetHTML = `
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
    }
    .header {
      padding: 12px;
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--sn-accent-primary, #8b5cf6);
      flex: 1;
    }

    .mode-tabs {
      display: flex;
      padding: 8px 12px;
      gap: 4px;
      background: var(--sn-bg-secondary, #1a1a2e);
    }
    .mode-tab {
      flex: 1;
      padding: 6px 8px;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      background: transparent;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .mode-tab:hover { background: var(--sn-bg-tertiary, #252538); }
    .mode-tab.active {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }

    .mic-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .mic-button {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      background: var(--sn-bg-secondary, #1a1a2e);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }
    .mic-button:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
      transform: scale(1.05);
    }
    .mic-button.recording {
      background: var(--sn-error, #ef4444);
      border-color: var(--sn-error, #ef4444);
      animation: pulse-recording 1.5s infinite;
    }
    .mic-button svg {
      width: 36px;
      height: 36px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .mic-button.recording svg { color: white; }
    @keyframes pulse-recording {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
    }
    .mic-status {
      margin-top: 12px;
      font-size: 12px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .mic-status.recording { color: var(--sn-error, #ef4444); }

    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin: 0 12px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-md, 6px);
      overflow: hidden;
    }
    .content-header {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 500;
      color: var(--sn-text-secondary, #94a3b8);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      justify-content: space-between;
    }
    .content-body {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.6;
    }

    /* Note mode */
    .note-text {
      white-space: pre-wrap;
      word-break: break-word;
    }
    .note-text.interim {
      opacity: 0.6;
      font-style: italic;
    }

    /* List modes */
    .list-items {
      list-style: none;
    }
    .list-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.1));
    }
    .list-item:last-child { border-bottom: none; }
    .list-checkbox {
      width: 16px;
      height: 16px;
      accent-color: var(--sn-accent-primary, #8b5cf6);
    }
    .list-text {
      flex: 1;
    }
    .list-item.checked .list-text {
      text-decoration: line-through;
      opacity: 0.6;
    }
    .delete-item {
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .list-item:hover .delete-item { opacity: 1; }
    .delete-item:hover { color: var(--sn-error, #ef4444); }

    .footer {
      padding: 8px 12px;
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-clear {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-secondary, #94a3b8);
    }
    .btn-clear:hover { background: var(--sn-bg-secondary, #1a1a2e); }
    .btn-save {
      background: var(--sn-success, #22c55e);
      color: white;
    }
    .btn-save:hover { filter: brightness(1.1); }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .item-count {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
      flex: 1;
    }

    .error-msg {
      padding: 12px;
      margin: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--sn-error, #ef4444);
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 12px;
      color: var(--sn-error, #ef4444);
      display: none;
    }
    .error-msg.visible { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h3>Voice Notes</h3>
    </div>

    <div class="mode-tabs">
      <button class="mode-tab active" data-mode="note">Notes</button>
      <button class="mode-tab" data-mode="shopping">Shopping</button>
      <button class="mode-tab" data-mode="todo">To-Do</button>
      <button class="mode-tab" data-mode="freeform">Free</button>
    </div>

    <div class="error-msg" id="errorMsg"></div>

    <div class="mic-area">
      <button class="mic-button" id="micButton">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
      <div class="mic-status" id="micStatus">Tap to start</div>
    </div>

    <div class="content-area">
      <div class="content-header">
        <span id="contentLabel">Transcription</span>
        <span id="contentCount"></span>
      </div>
      <div class="content-body" id="contentBody">
        <div class="note-text" id="noteText"></div>
        <ul class="list-items" id="listItems" style="display:none"></ul>
      </div>
    </div>

    <div class="footer">
      <span class="item-count" id="itemCount"></span>
      <button class="btn btn-clear" id="clearBtn">Clear</button>
      <button class="btn btn-save" id="saveBtn" disabled>Save Document</button>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // Elements
      const modeTabs = document.querySelectorAll('.mode-tab');
      const micButton = document.getElementById('micButton');
      const micStatus = document.getElementById('micStatus');
      const errorMsg = document.getElementById('errorMsg');
      const contentLabel = document.getElementById('contentLabel');
      const contentCount = document.getElementById('contentCount');
      const noteText = document.getElementById('noteText');
      const listItems = document.getElementById('listItems');
      const itemCount = document.getElementById('itemCount');
      const clearBtn = document.getElementById('clearBtn');
      const saveBtn = document.getElementById('saveBtn');

      // State
      let state = {
        mode: 'note',
        isRecording: false,
        text: '',
        interimText: '',
        items: [],
        language: 'en-US',
      };

      let recognition = null;

      // Check for speech recognition support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.add('visible');
      }

      function hideError() {
        errorMsg.classList.remove('visible');
      }

      function setMode(mode) {
        state.mode = mode;
        modeTabs.forEach(tab => {
          tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        // Update UI based on mode
        const isListMode = mode === 'shopping' || mode === 'todo';
        noteText.style.display = isListMode ? 'none' : 'block';
        listItems.style.display = isListMode ? 'block' : 'none';

        const labels = {
          note: 'Transcription',
          shopping: 'Shopping List',
          todo: 'To-Do List',
          freeform: 'Free Text',
        };
        contentLabel.textContent = labels[mode];
        updateCounts();
        API.setState({ mode });
      }

      function updateCounts() {
        if (state.mode === 'shopping' || state.mode === 'todo') {
          const total = state.items.length;
          const checked = state.items.filter(i => i.checked).length;
          contentCount.textContent = checked + '/' + total;
          itemCount.textContent = total + ' item' + (total === 1 ? '' : 's');
        } else {
          const words = state.text.trim().split(/\\s+/).filter(w => w.length > 0).length;
          contentCount.textContent = words + ' words';
          itemCount.textContent = '';
        }
        saveBtn.disabled = state.mode === 'shopping' || state.mode === 'todo'
          ? state.items.length === 0
          : !state.text.trim();
      }

      function initRecognition() {
        if (!SpeechRecognition) {
          showError('Speech recognition not supported in this browser. Try Chrome or Edge.');
          return null;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = state.language;

        recognition.onstart = () => {
          state.isRecording = true;
          micButton.classList.add('recording');
          micStatus.classList.add('recording');
          micStatus.textContent = 'Listening...';
          hideError();
          API.emitOutput('status.recording', true);
        };

        recognition.onend = () => {
          state.isRecording = false;
          micButton.classList.remove('recording');
          micStatus.classList.remove('recording');
          micStatus.textContent = 'Tap to start';
          API.emitOutput('status.recording', false);

          // Process any remaining interim text
          if (state.interimText.trim()) {
            processTranscript(state.interimText.trim());
            state.interimText = '';
          }
        };

        recognition.onerror = (event) => {
          if (event.error === 'no-speech') return;
          showError('Error: ' + event.error);
          state.isRecording = false;
          micButton.classList.remove('recording');
          micStatus.classList.remove('recording');
          micStatus.textContent = 'Tap to start';
        };

        recognition.onresult = (event) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          // Update interim display
          state.interimText = interim;
          if (state.mode === 'note' || state.mode === 'freeform') {
            noteText.innerHTML = state.text +
              (interim ? '<span class="note-text interim">' + interim + '</span>' : '');
          }

          // Process final results
          if (final.trim()) {
            processTranscript(final.trim());
          }
        };

        return recognition;
      }

      function processTranscript(text) {
        if (state.mode === 'shopping' || state.mode === 'todo') {
          // Parse as list items
          const items = text.split(/[,\\.\\n]|\\band\\b|\\bthen\\b/i)
            .map(s => s.trim())
            .filter(s => s.length > 0);

          for (const item of items) {
            state.items.push({ text: item, checked: false, id: Date.now() + Math.random() });
          }
          renderList();
          API.emitOutput('list.items', state.items);
        } else {
          // Append to text
          state.text += (state.text ? ' ' : '') + text;
          noteText.textContent = state.text;
          API.emitOutput('text.transcribed', {
            text: state.text,
            mode: state.mode,
            timestamp: Date.now(),
          });
        }

        API.setState({ text: state.text, items: state.items });
        updateCounts();
      }

      function renderList() {
        listItems.innerHTML = '';
        state.items.forEach((item, index) => {
          const li = document.createElement('li');
          li.className = 'list-item' + (item.checked ? ' checked' : '');
          li.innerHTML = \`
            <input type="checkbox" class="list-checkbox" \${item.checked ? 'checked' : ''} data-index="\${index}" />
            <span class="list-text">\${item.text}</span>
            <button class="delete-item" data-index="\${index}">×</button>
          \`;
          listItems.appendChild(li);
        });

        // Event delegation for checkboxes and delete buttons
        listItems.querySelectorAll('.list-checkbox').forEach(cb => {
          cb.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            state.items[idx].checked = e.target.checked;
            e.target.parentElement.classList.toggle('checked', e.target.checked);
            updateCounts();
            API.setState({ items: state.items });
            API.emitOutput('list.items', state.items);
          });
        });

        listItems.querySelectorAll('.delete-item').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            state.items.splice(idx, 1);
            renderList();
            updateCounts();
            API.setState({ items: state.items });
            API.emitOutput('list.items', state.items);
          });
        });
      }

      function toggleRecording() {
        if (!recognition) {
          recognition = initRecognition();
          if (!recognition) return;
        }

        if (state.isRecording) {
          recognition.stop();
        } else {
          try {
            recognition.start();
          } catch (e) {
            // Already started, restart
            recognition.stop();
            setTimeout(() => recognition.start(), 100);
          }
        }
      }

      function clearContent() {
        state.text = '';
        state.interimText = '';
        state.items = [];
        noteText.textContent = '';
        listItems.innerHTML = '';
        updateCounts();
        API.setState({ text: '', items: [] });
        API.emitOutput('text.transcribed', { text: '', mode: state.mode });
        API.emitOutput('list.items', []);
      }

      function saveDocument() {
        const categoryMap = {
          note: 'note',
          shopping: 'shopping-list',
          todo: 'todo',
          freeform: 'general',
        };

        let content = '';
        if (state.mode === 'shopping' || state.mode === 'todo') {
          content = state.items.map(i =>
            (i.checked ? '[x] ' : '[ ] ') + i.text
          ).join('\\n');
        } else {
          content = state.text;
        }

        const doc = {
          title: state.mode.charAt(0).toUpperCase() + state.mode.slice(1) +
                 ' - ' + new Date().toLocaleDateString(),
          content: content,
          contentType: 'text',
          category: categoryMap[state.mode],
          tags: ['voice', state.mode],
          sourceType: 'speech',
          starred: false,
          archived: false,
        };

        if (state.mode === 'shopping' || state.mode === 'todo') {
          doc.items = state.items;
        }

        API.emitOutput('document.saved', doc);
        API.emit('document.created', doc);
        API.emit('speech.complete', doc);
        API.log('Voice document saved');

        // Visual feedback
        saveBtn.textContent = 'Saved!';
        saveBtn.style.background = 'var(--sn-text-secondary)';
        setTimeout(() => {
          saveBtn.textContent = 'Save Document';
          saveBtn.style.background = '';
        }, 2000);
      }

      // Event listeners
      modeTabs.forEach(tab => {
        tab.addEventListener('click', () => setMode(tab.dataset.mode));
      });

      micButton.addEventListener('click', toggleRecording);
      clearBtn.addEventListener('click', clearContent);
      saveBtn.addEventListener('click', saveDocument);

      // Pipeline inputs
      API.onInput('config.mode', (mode) => {
        if (['note', 'shopping', 'todo', 'freeform'].includes(mode)) {
          setMode(mode);
        }
      });

      API.onInput('trigger.record', () => {
        toggleRecording();
      });

      API.onInput('trigger.clear', () => {
        clearContent();
      });

      // Broadcast listeners
      API.on('record.start', () => {
        if (!state.isRecording) toggleRecording();
      });

      API.on('record.stop', () => {
        if (state.isRecording) toggleRecording();
      });

      // Lifecycle
      API.onMount((context) => {
        const saved = context.state || {};
        if (saved.mode) setMode(saved.mode);
        if (saved.text) {
          state.text = saved.text;
          noteText.textContent = saved.text;
        }
        if (saved.items) {
          state.items = saved.items;
          renderList();
        }
        updateCounts();
        API.log('VoiceNotesWidget mounted');

        // Initialize recognition on mount
        if (SpeechRecognition) {
          initRecognition();
        }
      });

      API.onDestroy(() => {
        if (recognition && state.isRecording) {
          recognition.stop();
        }
        API.log('VoiceNotesWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const VoiceNotesWidget: BuiltinWidget = {
  manifest: VoiceNotesWidgetManifest,
  html: VoiceNotesWidgetHTML,
};

// Legacy export for backwards compatibility
export const HaloSpeechWidget = VoiceNotesWidget;
