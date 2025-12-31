/**
 * StickerNest v2 - Notes Widget
 *
 * A rich text notes widget with editable content and auto-save.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const NotesWidgetManifest: WidgetManifest = {
  id: 'stickernest.notes',
  name: 'Notes',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'An editable notes widget with rich text support',
  author: 'StickerNest',
  tags: ['notes', 'text', 'editor', 'interactive', 'core'],
  inputs: {
    content: {
      type: 'string',
      description: 'Note content (HTML)',
      default: '',
    },
    title: {
      type: 'string',
      description: 'Note title',
      default: 'New Note',
    },
    backgroundColor: {
      type: 'string',
      description: 'Background color',
      default: '#ffffa5',
    },
  },
  outputs: {
    contentChanged: {
      type: 'string',
      description: 'Emitted when content changes',
    },
    saved: {
      type: 'object',
      description: 'Emitted when note is saved',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['text.set', 'text.append', 'text.clear', 'data.set'],
    outputs: ['text.changed', 'text.submitted', 'data.changed'],
  },
  size: {
    width: 250,
    height: 200,
    minWidth: 150,
    minHeight: 100,
    scaleMode: 'stretch',
  },
};

export const NotesWidgetHTML = `
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
      font-family: 'Patrick Hand', 'Comic Sans MS', cursive, sans-serif;
    }
    .note {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #ffffa5;
      box-shadow: 2px 2px 8px rgba(0,0,0,0.15);
      border-radius: 2px;
    }
    .header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      gap: 8px;
    }
    .title {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: #333;
      border: none;
      background: transparent;
      outline: none;
    }
    .delete-btn {
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: #999;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }
    .delete-btn:hover {
      background: rgba(0,0,0,0.1);
      color: #c00;
    }
    .content {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      line-height: 1.6;
      font-size: 14px;
      color: #333;
      outline: none;
    }
    .content:empty:before {
      content: 'Start typing...';
      color: #999;
    }
    .footer {
      padding: 4px 12px;
      font-size: 10px;
      color: #999;
      text-align: right;
      border-top: 1px solid rgba(0,0,0,0.05);
    }
  </style>
</head>
<body>
  <div class="note" id="note">
    <div class="header">
      <input class="title" id="title" value="New Note" placeholder="Note title..." />
      <button class="delete-btn" id="deleteBtn" title="Delete note">×</button>
    </div>
    <div class="content" id="content" contenteditable="true"></div>
    <div class="footer" id="footer">Last edited: just now</div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const note = document.getElementById('note');
      const titleEl = document.getElementById('title');
      const contentEl = document.getElementById('content');
      const footerEl = document.getElementById('footer');
      const deleteBtn = document.getElementById('deleteBtn');

      let saveTimeout = null;
      let lastSaved = Date.now();
      let documentId = null;  // Reference to unified document store

      function updateFooter() {
        const elapsed = Date.now() - lastSaved;
        if (elapsed < 5000) {
          footerEl.textContent = 'Last edited: just now';
        } else if (elapsed < 60000) {
          footerEl.textContent = 'Last edited: ' + Math.floor(elapsed / 1000) + 's ago';
        } else {
          footerEl.textContent = 'Last edited: ' + Math.floor(elapsed / 60000) + 'm ago';
        }
      }

      async function saveNote() {
        const docData = {
          title: titleEl.value || 'Untitled Note',
          content: contentEl.innerHTML,
          contentType: 'html',
          category: 'note',
        };

        try {
          if (documentId) {
            // Update existing document
            await API.request('document:update', { id: documentId, updates: docData });
          } else {
            // Create new document
            const result = await API.request('document:create', docData);
            documentId = result.document.id;
            // Save only the reference
            API.setState({ documentId, backgroundColor: note.style.background });
          }

          lastSaved = Date.now();
          updateFooter();
          API.emitOutput('text.submitted', { ...docData, id: documentId });
          API.emitOutput('data.changed', { ...docData, id: documentId });
          API.log('Note saved to unified store');
        } catch (err) {
          API.log('Failed to save note: ' + err.message, 'error');
        }
      }

      function scheduleAutoSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveNote, 1000);
      }

      // Initialize
      API.onMount(async function(context) {
        const state = context.state || {};

        // Apply background color from widget state
        if (state.backgroundColor) {
          note.style.background = state.backgroundColor;
        }

        // Check if we have a document reference
        if (state.documentId) {
          documentId = state.documentId;
          try {
            const result = await API.request('document:get', { id: documentId });
            if (result.document) {
              titleEl.value = result.document.title || '';
              contentEl.innerHTML = result.document.content || '';
              lastSaved = result.document.updatedAt || Date.now();
              API.log('Loaded note from unified store: ' + documentId);
            }
          } catch (err) {
            API.log('Failed to load note: ' + err.message, 'error');
          }
        } else if (state.content || state.title) {
          // Migrate legacy inline content to unified store
          titleEl.value = state.title || 'New Note';
          contentEl.innerHTML = state.content || '';
          if (state.savedAt) lastSaved = state.savedAt;

          // Create document in unified store
          try {
            const result = await API.request('document:create', {
              title: titleEl.value,
              content: contentEl.innerHTML,
              contentType: 'html',
              category: 'note',
              sourceType: 'import',
            });
            documentId = result.document.id;
            // Save reference and clear legacy data
            API.setState({
              documentId,
              backgroundColor: note.style.background,
              // Clear legacy fields
              title: undefined,
              content: undefined,
              savedAt: undefined,
            });
            API.log('Migrated legacy note to unified store: ' + documentId);
          } catch (err) {
            API.log('Failed to migrate note: ' + err.message, 'error');
          }
        }

        updateFooter();
        API.log('NotesWidget mounted');
      });

      // Handle content input
      contentEl.addEventListener('input', function() {
        API.emitOutput('text.changed', contentEl.innerHTML);
        scheduleAutoSave();
      });

      titleEl.addEventListener('input', scheduleAutoSave);

      // Handle text.set input
      API.onInput('text.set', function(value) {
        if (typeof value === 'string') {
          contentEl.innerHTML = value;
        } else if (value && value.content !== undefined) {
          contentEl.innerHTML = value.content;
        }
        scheduleAutoSave();
      });

      // Handle text.append
      API.onInput('text.append', function(value) {
        const text = typeof value === 'string' ? value : (value && value.content) || '';
        contentEl.innerHTML += text;
        scheduleAutoSave();
      });

      // Handle text.clear
      API.onInput('text.clear', function() {
        contentEl.innerHTML = '';
        scheduleAutoSave();
      });

      // Handle data.set
      API.onInput('data.set', function(data) {
        if (data.title !== undefined) titleEl.value = data.title;
        if (data.content !== undefined) contentEl.innerHTML = data.content;
        if (data.backgroundColor !== undefined) note.style.background = data.backgroundColor;
        scheduleAutoSave();
      });

      // Delete button
      deleteBtn.addEventListener('click', function() {
        API.requestClose();
      });

      // Update footer periodically
      setInterval(updateFooter, 10000);

      API.onDestroy(function() {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
          saveNote();
        }
      });
    })();
  </script>
</body>
</html>
`;

export const NotesWidget: BuiltinWidget = {
  manifest: NotesWidgetManifest,
  html: NotesWidgetHTML,
};
