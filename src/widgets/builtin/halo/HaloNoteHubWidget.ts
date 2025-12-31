/**
 * StickerNest v2 - Note Hub Widget
 *
 * Central hub for managing all documents.
 * Connects to document stores for persistent storage.
 * Provides document listing, search, and management.
 *
 * Part of personal document management pipeline.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const NoteHubWidgetManifest: WidgetManifest = {
  id: 'stickernest.note-hub',
  name: 'Note Hub',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description:
    'Central hub for all documents. Browse, search, and manage your permanent document library.',
  author: 'StickerNest',
  tags: ['hub', 'documents', 'library', 'notes', 'management'],
  inputs: {
    refresh: {
      type: 'trigger',
      description: 'Refresh document list',
    },
    documentData: {
      type: 'object',
      description: 'New document to save',
    },
    search: {
      type: 'string',
      description: 'Search query',
    },
  },
  outputs: {
    documentSelected: {
      type: 'object',
      description: 'Selected document data',
    },
    documentCount: {
      type: 'number',
      description: 'Total document count',
    },
    documentDeleted: {
      type: 'string',
      description: 'ID of deleted document',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['trigger.refresh', 'document.save', 'search.query'],
    outputs: ['document.selected', 'stats.count', 'document.deleted'],
  },
  size: {
    width: 320,
    height: 450,
    minWidth: 280,
    minHeight: 380,
    scaleMode: 'stretch',
  },
  events: {
    emits: ['document.opened'],
    listens: ['document.created', 'ocr.complete', 'speech.complete'],
  },
};

export const NoteHubWidgetHTML = `
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
    .header h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--sn-accent-primary, #8b5cf6);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header h3 svg {
      width: 18px;
      height: 18px;
    }
    .search-box {
      display: flex;
      gap: 8px;
    }
    .search-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: var(--sn-radius-sm, 4px);
      background: var(--sn-bg-secondary, #1a1a2e);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .search-input::placeholder {
      color: var(--sn-text-secondary, #94a3b8);
    }

    .filter-tabs {
      display: flex;
      padding: 8px 12px;
      gap: 4px;
      overflow-x: auto;
      background: var(--sn-bg-secondary, #1a1a2e);
    }
    .filter-tab {
      padding: 4px 10px;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .filter-tab:hover { background: var(--sn-bg-tertiary, #252538); }
    .filter-tab.active {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .filter-count {
      margin-left: 4px;
      opacity: 0.7;
    }

    .document-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .document-item {
      padding: 12px;
      margin-bottom: 8px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-md, 6px);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
    }
    .document-item:hover {
      border-color: var(--sn-border-primary, rgba(139, 92, 246, 0.3));
    }
    .document-item.selected {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .document-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .document-icon {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      flex-shrink: 0;
    }
    .document-icon.ocr { background: #3b82f6; color: white; }
    .document-icon.speech { background: #22c55e; color: white; }
    .document-icon.manual { background: #8b5cf6; color: white; }
    .document-icon.import { background: #f59e0b; color: white; }
    .document-title {
      flex: 1;
      font-size: 13px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .star-btn {
      background: none;
      border: none;
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
      font-size: 14px;
      padding: 0;
    }
    .star-btn.starred { color: #f59e0b; }
    .document-meta {
      display: flex;
      gap: 8px;
      margin-top: 6px;
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .document-preview {
      margin-top: 8px;
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.5;
    }
    .document-actions {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .document-item:hover .document-actions { opacity: 1; }
    .action-btn {
      padding: 4px 8px;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 10px;
      cursor: pointer;
    }
    .action-btn:hover { color: var(--sn-text-primary, #e2e8f0); }
    .action-btn.delete:hover { color: var(--sn-error, #ef4444); }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--sn-text-secondary, #94a3b8);
      text-align: center;
    }
    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }
    .empty-state p { font-size: 12px; }

    .footer {
      padding: 12px;
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stats {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .protection-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid var(--sn-success, #22c55e);
      border-radius: 12px;
      font-size: 10px;
      color: var(--sn-success, #22c55e);
    }
    .protection-badge svg {
      width: 12px;
      height: 12px;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: var(--sn-text-secondary, #94a3b8);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h3>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        Note Hub
      </h3>
      <div class="search-box">
        <input type="text" class="search-input" id="searchInput" placeholder="Search documents..." />
      </div>
    </div>

    <div class="filter-tabs" id="filterTabs">
      <button class="filter-tab active" data-filter="all">All</button>
      <button class="filter-tab" data-filter="starred">Starred</button>
      <button class="filter-tab" data-filter="note">Notes</button>
      <button class="filter-tab" data-filter="ocr-scan">OCR</button>
      <button class="filter-tab" data-filter="voice-memo">Voice</button>
      <button class="filter-tab" data-filter="shopping-list">Shopping</button>
      <button class="filter-tab" data-filter="todo">To-Do</button>
    </div>

    <div class="document-list" id="documentList">
      <div class="loading" id="loading">Loading documents...</div>
    </div>

    <div class="footer">
      <span class="stats" id="stats">0 documents</span>
      <div class="protection-badge">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Protected
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // Elements
      const searchInput = document.getElementById('searchInput');
      const filterTabs = document.getElementById('filterTabs');
      const documentList = document.getElementById('documentList');
      const loading = document.getElementById('loading');
      const stats = document.getElementById('stats');

      // State - documents now come from unified HaloDocumentStore via API
      let state = {
        documents: [],  // Array of document metadata
        filter: 'all',
        searchQuery: '',
        selectedId: null,
      };

      function getSourceIcon(sourceType) {
        const icons = {
          ocr: 'OCR',
          speech: 'VOX',
          manual: 'DOC',
          import: 'IMP',
        };
        return icons[sourceType] || 'DOC';
      }

      function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

        return date.toLocaleDateString();
      }

      function getPreview(content) {
        if (!content) return '';
        const text = content.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
        return text.substring(0, 100) + (text.length > 100 ? '...' : '');
      }

      function filterDocuments() {
        let docs = state.documents;

        if (state.filter === 'starred') {
          docs = docs.filter(d => d.starred);
        } else if (state.filter !== 'all') {
          docs = docs.filter(d => d.category === state.filter);
        }

        // Note: full-text search on content requires fetching full documents
        // For now, search on title and tags from metadata
        if (state.searchQuery.trim()) {
          const query = state.searchQuery.toLowerCase();
          docs = docs.filter(d =>
            d.title.toLowerCase().includes(query) ||
            (d.tags && d.tags.some(t => t.toLowerCase().includes(query)))
          );
        }

        docs.sort((a, b) => b.updatedAt - a.updatedAt);
        return docs;
      }

      function renderDocuments() {
        const docs = filterDocuments();

        if (docs.length === 0) {
          documentList.innerHTML = \`
            <div class="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>\${state.searchQuery ? 'No documents match your search' : 'No documents yet'}</p>
              <p style="margin-top:8px;opacity:0.7">Use OCR, Voice, or NotePad widgets to add documents</p>
            </div>
          \`;
          return;
        }

        documentList.innerHTML = docs.map(doc => \`
          <div class="document-item\${doc.id === state.selectedId ? ' selected' : ''}" data-id="\${doc.id}">
            <div class="document-header">
              <div class="document-icon \${doc.sourceType}">\${getSourceIcon(doc.sourceType)}</div>
              <div class="document-title">\${doc.title}</div>
              <button class="star-btn\${doc.starred ? ' starred' : ''}" data-star="\${doc.id}">\${doc.starred ? '★' : '☆'}</button>
            </div>
            <div class="document-meta">
              <span>\${formatDate(doc.updatedAt)}</span>
              <span>•</span>
              <span>\${doc.wordCount || 0} words</span>
              <span>•</span>
              <span>\${doc.category}</span>
            </div>
            <div class="document-actions">
              <button class="action-btn" data-open="\${doc.id}">Open</button>
              <button class="action-btn" data-export="\${doc.id}">Export</button>
              <button class="action-btn delete" data-delete="\${doc.id}">Delete</button>
            </div>
          </div>
        \`).join('');

        const total = state.documents.length;
        stats.textContent = total + ' document' + (total === 1 ? '' : 's') + ' | Protected';
        API.emitOutput('stats.count', total);
      }

      // Load documents from unified HaloDocumentStore
      async function loadDocuments() {
        try {
          loading.style.display = 'block';
          const result = await API.request('document:list');
          state.documents = result.documents || [];
          loading.style.display = 'none';
          renderDocuments();
          API.log('Loaded ' + state.documents.length + ' documents from unified store');
        } catch (err) {
          loading.style.display = 'none';
          API.log('Failed to load documents: ' + err.message, 'error');
          state.documents = [];
          renderDocuments();
        }
      }

      // Search documents via unified API
      async function searchDocuments(query) {
        if (!query.trim()) {
          return loadDocuments();
        }
        try {
          const result = await API.request('document:search', { query });
          state.documents = result.documents || [];
          renderDocuments();
        } catch (err) {
          API.log('Search failed: ' + err.message, 'error');
        }
      }

      async function selectDocument(id) {
        state.selectedId = id;
        try {
          // Fetch full document content
          const result = await API.request('document:get', { id });
          if (result.document) {
            API.emitOutput('document.selected', result.document);
            API.emit('document.opened', result.document);
          }
        } catch (err) {
          API.log('Failed to get document: ' + err.message, 'error');
        }
        renderDocuments();
      }

      async function toggleStar(id) {
        try {
          await API.request('document:toggleStarred', { id });
          // Update local state
          const doc = state.documents.find(d => d.id === id);
          if (doc) {
            doc.starred = !doc.starred;
          }
          renderDocuments();
        } catch (err) {
          API.log('Failed to toggle star: ' + err.message, 'error');
        }
      }

      async function deleteDocument(id) {
        if (confirm('Delete this document permanently? This cannot be undone.')) {
          try {
            await API.request('document:delete', { id });
            if (state.selectedId === id) state.selectedId = null;
            // Reload documents
            await loadDocuments();
            API.emitOutput('document.deleted', id);
          } catch (err) {
            API.log('Failed to delete document: ' + err.message, 'error');
          }
        }
      }

      async function exportDocument(id) {
        try {
          const result = await API.request('document:get', { id });
          if (result.document) {
            API.emitOutput('document.selected', result.document);
          }
        } catch (err) {
          API.log('Failed to export document: ' + err.message, 'error');
        }
      }

      // Event delegation
      documentList.addEventListener('click', (e) => {
        const target = e.target;
        const item = target.closest('.document-item');

        if (target.dataset.star) {
          e.stopPropagation();
          toggleStar(target.dataset.star);
        } else if (target.dataset.open) {
          e.stopPropagation();
          selectDocument(target.dataset.open);
        } else if (target.dataset.export) {
          e.stopPropagation();
          exportDocument(target.dataset.export);
        } else if (target.dataset.delete) {
          e.stopPropagation();
          deleteDocument(target.dataset.delete);
        } else if (item) {
          selectDocument(item.dataset.id);
        }
      });

      // Filter tabs
      filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (tab) {
          state.filter = tab.dataset.filter;
          filterTabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          API.setState({ filter: state.filter });
          renderDocuments();
        }
      });

      // Search with debounce
      let searchTimeout = null;
      searchInput.addEventListener('input', () => {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          state.searchQuery = searchInput.value;
          if (state.searchQuery.trim()) {
            searchDocuments(state.searchQuery);
          } else {
            loadDocuments();
          }
        }, 300);
      });

      // Pipeline inputs
      API.onInput('document.save', async (doc) => {
        // Create document in unified store
        if (doc && (doc.content || doc.title)) {
          try {
            await API.request('document:create', {
              title: doc.title || 'Untitled',
              content: doc.content || '',
              contentType: doc.contentType || 'text',
              category: doc.category || 'general',
              tags: doc.tags || [],
              sourceType: doc.sourceType || 'manual',
            });
            await loadDocuments();
          } catch (err) {
            API.log('Failed to save document: ' + err.message, 'error');
          }
        }
      });

      API.onInput('trigger.refresh', () => {
        loadDocuments();
      });

      API.onInput('search.query', (query) => {
        searchInput.value = query || '';
        state.searchQuery = query || '';
        if (query) {
          searchDocuments(query);
        } else {
          loadDocuments();
        }
      });

      // Listen for document changes from other widgets
      API.on('document:created', () => loadDocuments());
      API.on('document:updated', () => loadDocuments());
      API.on('document:deleted', () => loadDocuments());

      // Lifecycle
      API.onMount((context) => {
        const saved = context.state || {};
        if (saved.filter) {
          state.filter = saved.filter;
          filterTabs.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.filter === state.filter);
          });
        }

        // Load documents from unified store
        loadDocuments();
        API.log('NoteHubWidget mounted - loading from unified document store');
      });

      API.onDestroy(() => {
        API.setState({ filter: state.filter });
        API.log('NoteHubWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const NoteHubWidget: BuiltinWidget = {
  manifest: NoteHubWidgetManifest,
  html: NoteHubWidgetHTML,
};

// Legacy export for backwards compatibility
export const HaloNoteHubWidget = NoteHubWidget;
