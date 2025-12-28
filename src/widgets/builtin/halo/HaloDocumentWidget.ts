/**
 * StickerNest v2 - Document Editor Widget
 *
 * Document editor and exporter with real save functionality.
 * Supports export to DOCX, RTF, TXT, and HTML formats.
 * Integrates with document stores for persistent storage.
 *
 * Part of personal document management pipeline.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const DocumentEditorWidgetManifest: WidgetManifest = {
  id: 'stickernest.document-editor',
  name: 'Document Editor',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description:
    'Document editor with export to DOCX, RTF, TXT formats. Opens in Word, LibreOffice, Google Docs.',
  author: 'StickerNest',
  tags: ['document', 'editor', 'export', 'docx', 'word', 'save'],
  inputs: {
    content: {
      type: 'object',
      description: 'Document content to load {title, content, category}',
    },
    text: {
      type: 'string',
      description: 'Plain text to append to document',
    },
    trigger: {
      type: 'trigger',
      description: 'Trigger export dialog',
    },
  },
  outputs: {
    contentChanged: {
      type: 'object',
      description: 'Emitted when content changes',
    },
    exported: {
      type: 'object',
      description: 'Emitted when document is exported',
    },
    saved: {
      type: 'object',
      description: 'Emitted when document is saved to store',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['document.set', 'text.append', 'trigger.export'],
    outputs: ['document.changed', 'document.exported', 'document.saved'],
  },
  size: {
    width: 400,
    height: 500,
    minWidth: 320,
    minHeight: 400,
    scaleMode: 'stretch',
  },
  events: {
    emits: ['document.created', 'document.exported'],
    listens: ['ocr.complete', 'speech.complete'],
  },
};

export const DocumentEditorWidgetHTML = `
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
    }
    .title-input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: var(--sn-radius-sm, 4px);
      background: var(--sn-bg-secondary, #1a1a2e);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 16px;
      font-weight: 600;
    }
    .title-input:focus {
      outline: none;
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    .toolbar {
      padding: 8px 12px;
      display: flex;
      gap: 4px;
      background: var(--sn-bg-secondary, #1a1a2e);
      flex-wrap: wrap;
    }
    .toolbar-btn {
      padding: 6px 10px;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .toolbar-btn:hover {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .toolbar-btn.active {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .toolbar-divider {
      width: 1px;
      background: var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      margin: 0 4px;
    }

    .editor-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin: 12px;
      background: white;
      border-radius: var(--sn-radius-md, 6px);
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .editor {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      font-family: 'Times New Roman', Times, serif;
      font-size: 14px;
      line-height: 1.8;
      color: #333;
      outline: none;
    }
    .editor:empty:before {
      content: 'Start typing or paste content from OCR/Speech...';
      color: #999;
      font-style: italic;
    }

    .footer {
      padding: 8px 12px;
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .stats {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .btn-group {
      display: flex;
      gap: 8px;
    }
    .btn {
      padding: 8px 14px;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-secondary {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .btn-secondary:hover { filter: brightness(1.2); }
    .btn-primary {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .btn-primary:hover { filter: brightness(1.1); }
    .btn-success {
      background: var(--sn-success, #22c55e);
      color: white;
    }
    .btn-success:hover { filter: brightness(1.1); }

    /* Export Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-overlay.visible { display: flex; }
    .modal {
      background: var(--sn-bg-primary, #0f0f19);
      border-radius: var(--sn-radius-lg, 8px);
      padding: 20px;
      width: 280px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    .modal h4 {
      font-size: 16px;
      margin-bottom: 16px;
      color: var(--sn-accent-primary, #8b5cf6);
    }
    .export-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .export-btn {
      padding: 12px 16px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: var(--sn-radius-sm, 4px);
      background: var(--sn-bg-secondary, #1a1a2e);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 13px;
      cursor: pointer;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s;
    }
    .export-btn:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: var(--sn-bg-tertiary, #252538);
    }
    .export-icon {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 10px;
    }
    .export-icon.docx { background: #2b579a; color: white; }
    .export-icon.rtf { background: #7c3aed; color: white; }
    .export-icon.txt { background: #64748b; color: white; }
    .export-icon.html { background: #ea580c; color: white; }
    .export-info {
      flex: 1;
    }
    .export-title { font-weight: 500; }
    .export-desc { font-size: 10px; color: var(--sn-text-secondary, #94a3b8); margin-top: 2px; }
    .modal-close {
      margin-top: 12px;
      width: 100%;
      padding: 8px;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
    }
    .modal-close:hover { color: var(--sn-text-primary, #e2e8f0); }

    .saved-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 8px;
      background: var(--sn-success, #22c55e);
      color: white;
      font-size: 10px;
      border-radius: var(--sn-radius-sm, 4px);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .saved-indicator.visible { opacity: 1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="saved-indicator" id="savedIndicator">Saved</div>

    <div class="header">
      <input type="text" class="title-input" id="titleInput" placeholder="Document Title..." value="Untitled Document" />
    </div>

    <div class="toolbar">
      <button class="toolbar-btn" id="boldBtn" title="Bold"><b>B</b></button>
      <button class="toolbar-btn" id="italicBtn" title="Italic"><i>I</i></button>
      <button class="toolbar-btn" id="underlineBtn" title="Underline"><u>U</u></button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" id="ulBtn" title="Bullet List">• List</button>
      <button class="toolbar-btn" id="olBtn" title="Numbered List">1. List</button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" id="clearFormatBtn" title="Clear Formatting">Clear</button>
    </div>

    <div class="editor-area">
      <div class="editor" id="editor" contenteditable="true"></div>
    </div>

    <div class="footer">
      <div class="stats" id="stats">0 words | 0 characters</div>
      <div class="btn-group">
        <button class="btn btn-secondary" id="saveBtn">Save</button>
        <button class="btn btn-primary" id="exportBtn">Export</button>
      </div>
    </div>

    <div class="modal-overlay" id="exportModal">
      <div class="modal">
        <h4>Export Document</h4>
        <div class="export-options">
          <button class="export-btn" data-format="docx">
            <div class="export-icon docx">DOCX</div>
            <div class="export-info">
              <div class="export-title">Word Document</div>
              <div class="export-desc">Microsoft Word, Google Docs</div>
            </div>
          </button>
          <button class="export-btn" data-format="rtf">
            <div class="export-icon rtf">RTF</div>
            <div class="export-info">
              <div class="export-title">Rich Text Format</div>
              <div class="export-desc">Universal compatibility</div>
            </div>
          </button>
          <button class="export-btn" data-format="txt">
            <div class="export-icon txt">TXT</div>
            <div class="export-info">
              <div class="export-title">Plain Text</div>
              <div class="export-desc">Simple text file</div>
            </div>
          </button>
          <button class="export-btn" data-format="html">
            <div class="export-icon html">HTML</div>
            <div class="export-info">
              <div class="export-title">Web Page</div>
              <div class="export-desc">Opens in any browser</div>
            </div>
          </button>
        </div>
        <button class="modal-close" id="modalClose">Cancel</button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js"></script>
  <script>
    (function() {
      const API = window.WidgetAPI;

      // Elements
      const titleInput = document.getElementById('titleInput');
      const editor = document.getElementById('editor');
      const stats = document.getElementById('stats');
      const savedIndicator = document.getElementById('savedIndicator');
      const saveBtn = document.getElementById('saveBtn');
      const exportBtn = document.getElementById('exportBtn');
      const exportModal = document.getElementById('exportModal');
      const modalClose = document.getElementById('modalClose');

      // Toolbar buttons
      const boldBtn = document.getElementById('boldBtn');
      const italicBtn = document.getElementById('italicBtn');
      const underlineBtn = document.getElementById('underlineBtn');
      const ulBtn = document.getElementById('ulBtn');
      const olBtn = document.getElementById('olBtn');
      const clearFormatBtn = document.getElementById('clearFormatBtn');

      // State
      let state = {
        title: 'Untitled Document',
        content: '',
        category: 'general',
        documentId: null,
        lastSaved: null,
      };

      let saveTimeout = null;

      function updateStats() {
        const text = editor.innerText || '';
        const words = text.trim().split(/\\s+/).filter(w => w.length > 0).length;
        const chars = text.length;
        stats.textContent = words + ' word' + (words === 1 ? '' : 's') + ' | ' + chars + ' characters';
      }

      function showSavedIndicator() {
        savedIndicator.classList.add('visible');
        setTimeout(() => savedIndicator.classList.remove('visible'), 2000);
      }

      function scheduleAutoSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          state.content = editor.innerHTML;
          state.title = titleInput.value || 'Untitled Document';
          API.setState(state);
          API.emitOutput('document.changed', {
            title: state.title,
            content: state.content,
            wordCount: editor.innerText.trim().split(/\\s+/).filter(w => w.length).length,
          });
        }, 1000);
      }

      // Toolbar actions
      function execCommand(cmd, value = null) {
        document.execCommand(cmd, false, value);
        editor.focus();
        scheduleAutoSave();
      }

      boldBtn.addEventListener('click', () => execCommand('bold'));
      italicBtn.addEventListener('click', () => execCommand('italic'));
      underlineBtn.addEventListener('click', () => execCommand('underline'));
      ulBtn.addEventListener('click', () => execCommand('insertUnorderedList'));
      olBtn.addEventListener('click', () => execCommand('insertOrderedList'));
      clearFormatBtn.addEventListener('click', () => execCommand('removeFormat'));

      // Export functions
      function sanitizeFilename(name) {
        return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      }

      function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      async function exportDOCX() {
        try {
          const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

          // Parse HTML content to paragraphs
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = editor.innerHTML;

          const paragraphs = [];

          // Add title
          paragraphs.push(
            new Paragraph({
              text: titleInput.value || 'Untitled Document',
              heading: HeadingLevel.HEADING_1,
            })
          );

          // Process content
          const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent;
              if (text.trim()) {
                return [new TextRun(text)];
              }
              return [];
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
              const tag = node.tagName.toLowerCase();
              const children = [];

              for (const child of node.childNodes) {
                children.push(...processNode(child));
              }

              if (tag === 'b' || tag === 'strong') {
                return children.map(run => new TextRun({ ...run.options, bold: true, text: run.text || run.options?.text }));
              }
              if (tag === 'i' || tag === 'em') {
                return children.map(run => new TextRun({ ...run.options, italics: true, text: run.text || run.options?.text }));
              }
              if (tag === 'u') {
                return children.map(run => new TextRun({ ...run.options, underline: {}, text: run.text || run.options?.text }));
              }
              if (tag === 'p' || tag === 'div' || tag === 'br') {
                return children;
              }
              if (tag === 'li') {
                return children;
              }

              return children;
            }

            return [];
          };

          // Process each block element
          for (const child of tempDiv.children) {
            const tag = child.tagName.toLowerCase();

            if (tag === 'ul' || tag === 'ol') {
              for (const li of child.children) {
                const runs = processNode(li);
                if (runs.length) {
                  paragraphs.push(new Paragraph({
                    children: runs,
                    bullet: tag === 'ul' ? { level: 0 } : undefined,
                    numbering: tag === 'ol' ? { reference: 'default', level: 0 } : undefined,
                  }));
                }
              }
            } else {
              const runs = processNode(child);
              if (runs.length) {
                paragraphs.push(new Paragraph({ children: runs }));
              }
            }
          }

          // If no structured content, just use text
          if (paragraphs.length <= 1) {
            const text = editor.innerText || '';
            text.split('\\n').forEach(line => {
              paragraphs.push(new Paragraph(line));
            });
          }

          const doc = new Document({
            sections: [{
              properties: {},
              children: paragraphs,
            }],
          });

          const blob = await Packer.toBlob(doc);
          downloadBlob(blob, sanitizeFilename(titleInput.value) + '.docx');

          return true;
        } catch (err) {
          API.log('DOCX export error: ' + err.message);
          alert('Export failed: ' + err.message);
          return false;
        }
      }

      function exportRTF() {
        const title = titleInput.value || 'Untitled Document';
        const text = editor.innerText || '';

        // Simple RTF format
        const rtf = '{\\\\rtf1\\\\ansi\\\\deff0' +
          '{\\\\fonttbl{\\\\f0 Times New Roman;}}' +
          '{\\\\colortbl;\\\\red0\\\\green0\\\\blue0;}' +
          '\\\\f0\\\\fs24 ' +
          '{\\\\b ' + title.replace(/[\\\\{}]/g, '\\\\$&') + '\\\\par\\\\par}' +
          text.split('\\n').map(line =>
            line.replace(/[\\\\{}]/g, '\\\\$&') + '\\\\par'
          ).join('') +
          '}';

        const blob = new Blob([rtf], { type: 'application/rtf' });
        downloadBlob(blob, sanitizeFilename(title) + '.rtf');
        return true;
      }

      function exportTXT() {
        const title = titleInput.value || 'Untitled Document';
        const text = editor.innerText || '';
        const content = title + '\\n' + '='.repeat(title.length) + '\\n\\n' + text;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, sanitizeFilename(title) + '.txt');
        return true;
      }

      function exportHTML() {
        const title = titleInput.value || 'Untitled Document';
        const content = editor.innerHTML || '';

        const html = '<!DOCTYPE html>\\n<html>\\n<head>\\n' +
          '<meta charset="UTF-8">\\n' +
          '<title>' + title + '</title>\\n' +
          '<style>body{font-family:serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;}</style>\\n' +
          '</head>\\n<body>\\n' +
          '<h1>' + title + '</h1>\\n' +
          content + '\\n' +
          '</body>\\n</html>';

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        downloadBlob(blob, sanitizeFilename(title) + '.html');
        return true;
      }

      async function handleExport(format) {
        let success = false;

        switch (format) {
          case 'docx':
            success = await exportDOCX();
            break;
          case 'rtf':
            success = exportRTF();
            break;
          case 'txt':
            success = exportTXT();
            break;
          case 'html':
            success = exportHTML();
            break;
        }

        if (success) {
          exportModal.classList.remove('visible');
          API.emitOutput('document.exported', {
            title: titleInput.value,
            format: format,
            timestamp: Date.now(),
          });
          API.emit('document.exported', { format });
          API.log('Exported as ' + format.toUpperCase());
        }
      }

      function saveDocument() {
        const doc = {
          title: titleInput.value || 'Untitled Document',
          content: editor.innerHTML,
          contentType: 'html',
          category: state.category || 'general',
          tags: ['document'],
          sourceType: 'manual',
          starred: false,
          archived: false,
        };

        if (state.documentId) {
          doc.id = state.documentId;
        }

        API.emitOutput('document.saved', doc);
        API.emit('document.created', doc);
        showSavedIndicator();
        API.log('Document saved');
      }

      // Event listeners
      editor.addEventListener('input', () => {
        updateStats();
        scheduleAutoSave();
      });

      titleInput.addEventListener('input', scheduleAutoSave);

      exportBtn.addEventListener('click', () => {
        exportModal.classList.add('visible');
      });

      modalClose.addEventListener('click', () => {
        exportModal.classList.remove('visible');
      });

      exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
          exportModal.classList.remove('visible');
        }
      });

      document.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          handleExport(btn.dataset.format);
        });
      });

      saveBtn.addEventListener('click', saveDocument);

      // Pipeline inputs
      API.onInput('document.set', (data) => {
        if (data) {
          if (data.title) {
            titleInput.value = data.title;
            state.title = data.title;
          }
          if (data.content) {
            editor.innerHTML = data.content;
            state.content = data.content;
          }
          if (data.category) {
            state.category = data.category;
          }
          if (data.id) {
            state.documentId = data.id;
          }
          updateStats();
          API.setState(state);
        }
      });

      API.onInput('text.append', (text) => {
        if (typeof text === 'string') {
          editor.innerHTML += '<p>' + text + '</p>';
        } else if (text && text.text) {
          editor.innerHTML += '<p>' + text.text + '</p>';
        }
        updateStats();
        scheduleAutoSave();
      });

      API.onInput('trigger.export', () => {
        exportModal.classList.add('visible');
      });

      // Broadcast listeners
      API.on('ocr.complete', (data) => {
        if (data && data.text) {
          editor.innerHTML += '<p>' + data.text.replace(/\\n/g, '</p><p>') + '</p>';
          updateStats();
          scheduleAutoSave();
        }
      });

      API.on('speech.complete', (data) => {
        if (data && data.content) {
          if (data.category === 'shopping-list' || data.category === 'todo') {
            editor.innerHTML += '<ul>' +
              data.content.split('\\n').map(line => '<li>' + line + '</li>').join('') +
              '</ul>';
          } else {
            editor.innerHTML += '<p>' + data.content.replace(/\\n/g, '</p><p>') + '</p>';
          }
          if (data.title) {
            titleInput.value = data.title;
          }
          state.category = data.category || 'general';
          updateStats();
          scheduleAutoSave();
        }
      });

      // Lifecycle
      API.onMount((context) => {
        const saved = context.state || {};
        if (saved.title) titleInput.value = saved.title;
        if (saved.content) editor.innerHTML = saved.content;
        if (saved.category) state.category = saved.category;
        if (saved.documentId) state.documentId = saved.documentId;
        state = { ...state, ...saved };
        updateStats();
        API.log('DocumentEditorWidget mounted');
      });

      API.onDestroy(() => {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
          state.content = editor.innerHTML;
          state.title = titleInput.value;
          API.setState(state);
        }
        API.log('DocumentEditorWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const DocumentEditorWidget: BuiltinWidget = {
  manifest: DocumentEditorWidgetManifest,
  html: DocumentEditorWidgetHTML,
};

// Legacy export for backwards compatibility
export const HaloDocumentWidget = DocumentEditorWidget;
