/**
 * StickerNest v2 - TikTok Playlist Importer Widget
 *
 * Import and manage TikTok video playlists. Add videos by URL,
 * organize your collection, and export/import playlist data.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const TikTokPlaylistWidgetManifest: WidgetManifest = {
  id: 'stickernest.tiktok-playlist',
  name: 'TikTok Playlist',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Import and manage TikTok video playlists',
  author: 'StickerNest',
  tags: ['tiktok', 'playlist', 'video', 'social', 'importer', 'media'],
  inputs: {
    videos: {
      type: 'array',
      description: 'Array of video objects with url, title, author',
      default: [],
    },
    playlistName: {
      type: 'string',
      description: 'Name of the playlist',
      default: 'My TikTok Playlist',
    },
  },
  outputs: {
    videoSelected: {
      type: 'object',
      description: 'Emitted when a video is selected',
    },
    playlistUpdated: {
      type: 'object',
      description: 'Emitted when playlist is updated',
    },
    exportData: {
      type: 'object',
      description: 'Emitted when exporting playlist data',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['playlist.add', 'playlist.import', 'playlist.clear'],
    outputs: ['video.selected', 'playlist.updated', 'playlist.exported'],
  },
  size: {
    width: 360,
    height: 480,
    minWidth: 280,
    minHeight: 320,
    scaleMode: 'scale',
  },
};

export const TikTokPlaylistWidgetHTML = `
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
      border-radius: 12px;
      overflow: hidden;
    }

    /* Header */
    .header {
      padding: 12px 16px;
      background: linear-gradient(135deg, #ff0050 0%, #00f2ea 100%);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .header-icon {
      font-size: 24px;
    }
    .header-title {
      font-size: 16px;
      font-weight: 600;
      color: white;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .video-count {
      font-size: 12px;
      background: rgba(255,255,255,0.2);
      padding: 4px 8px;
      border-radius: 12px;
      color: white;
    }

    /* Input Section */
    .input-section {
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      flex-shrink: 0;
    }
    .input-row {
      display: flex;
      gap: 8px;
    }
    .url-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: 8px;
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .url-input:focus {
      border-color: #ff0050;
    }
    .url-input::placeholder {
      color: var(--sn-text-secondary, #94a3b8);
    }
    .add-btn {
      padding: 10px 16px;
      background: linear-gradient(135deg, #ff0050 0%, #ff3366 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
    }
    .add-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 0, 80, 0.4);
    }
    .add-btn:active {
      transform: scale(0.98);
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      gap: 6px;
      padding: 8px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      flex-shrink: 0;
    }
    .toolbar-btn {
      padding: 6px 10px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 6px;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .toolbar-btn:hover {
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      border-color: #ff0050;
    }
    .toolbar-btn.danger:hover {
      border-color: var(--sn-error, #ef4444);
      color: var(--sn-error, #ef4444);
    }

    /* Video List */
    .video-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .video-list::-webkit-scrollbar {
      width: 6px;
    }
    .video-list::-webkit-scrollbar-track {
      background: var(--sn-bg-secondary, #1a1a2e);
    }
    .video-list::-webkit-scrollbar-thumb {
      background: var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: 3px;
    }

    .video-item {
      display: flex;
      gap: 10px;
      padding: 10px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    .video-item:hover {
      background: var(--sn-bg-tertiary, #252538);
      border-color: var(--sn-border-primary, rgba(139, 92, 246, 0.3));
    }
    .video-item.selected {
      border-color: #ff0050;
      background: rgba(255, 0, 80, 0.1);
    }

    .video-thumbnail {
      width: 60px;
      height: 80px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
      overflow: hidden;
    }
    .video-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .video-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--sn-text-primary, #e2e8f0);
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .video-author {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .video-meta {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
      opacity: 0.7;
    }

    .video-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      justify-content: center;
    }
    .video-action-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sn-bg-tertiary, #252538);
      border: none;
      border-radius: 6px;
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }
    .video-action-btn:hover {
      color: var(--sn-text-primary, #e2e8f0);
      background: var(--sn-bg-primary, #0f0f19);
    }
    .video-action-btn.delete:hover {
      color: var(--sn-error, #ef4444);
    }

    /* Empty State */
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      text-align: center;
    }
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    .empty-text {
      font-size: 14px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 8px;
    }
    .empty-hint {
      font-size: 12px;
      color: var(--sn-text-secondary, #94a3b8);
      opacity: 0.7;
    }

    /* Modal */
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
    .modal-overlay.visible {
      display: flex;
    }
    .modal {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 12px;
      padding: 20px;
      width: 90%;
      max-width: 400px;
      max-height: 80%;
      overflow-y: auto;
    }
    .modal-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--sn-text-primary, #e2e8f0);
    }
    .modal-textarea {
      width: 100%;
      height: 200px;
      padding: 12px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: 8px;
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      font-family: monospace;
      resize: none;
      outline: none;
      margin-bottom: 16px;
    }
    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .modal-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .modal-btn.cancel {
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      color: var(--sn-text-secondary, #94a3b8);
    }
    .modal-btn.confirm {
      background: linear-gradient(135deg, #ff0050 0%, #ff3366 100%);
      border: none;
      color: white;
      font-weight: 600;
    }
    .modal-btn:hover {
      transform: translateY(-1px);
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      opacity: 0;
      transition: all 0.3s;
      z-index: 1001;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
    }
    .toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .toast.success {
      border-color: var(--sn-success, #22c55e);
    }
    .toast.error {
      border-color: var(--sn-error, #ef4444);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="header-icon">🎵</span>
      <span class="header-title" id="playlistName">My TikTok Playlist</span>
      <span class="video-count" id="videoCount">0 videos</span>
    </div>

    <div class="input-section">
      <div class="input-row">
        <input type="text" class="url-input" id="urlInput" placeholder="Paste TikTok video URL..." />
        <button class="add-btn" id="addBtn">Add</button>
      </div>
    </div>

    <div class="toolbar">
      <button class="toolbar-btn" id="importBtn">📥 Import</button>
      <button class="toolbar-btn" id="exportBtn">📤 Export</button>
      <button class="toolbar-btn" id="bulkAddBtn">📋 Bulk Add</button>
      <button class="toolbar-btn danger" id="clearBtn">🗑️ Clear</button>
    </div>

    <div class="video-list" id="videoList">
      <div class="empty-state" id="emptyState">
        <div class="empty-icon">🎬</div>
        <div class="empty-text">No videos yet</div>
        <div class="empty-hint">Paste a TikTok URL above to add videos</div>
      </div>
    </div>
  </div>

  <!-- Import/Export Modal -->
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal">
      <div class="modal-title" id="modalTitle">Import Playlist</div>
      <textarea class="modal-textarea" id="modalTextarea" placeholder="Paste JSON data or URLs here..."></textarea>
      <div class="modal-actions">
        <button class="modal-btn cancel" id="modalCancel">Cancel</button>
        <button class="modal-btn confirm" id="modalConfirm">Confirm</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast"></div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // Elements
      const playlistNameEl = document.getElementById('playlistName');
      const videoCountEl = document.getElementById('videoCount');
      const urlInput = document.getElementById('urlInput');
      const addBtn = document.getElementById('addBtn');
      const videoList = document.getElementById('videoList');
      const emptyState = document.getElementById('emptyState');
      const importBtn = document.getElementById('importBtn');
      const exportBtn = document.getElementById('exportBtn');
      const bulkAddBtn = document.getElementById('bulkAddBtn');
      const clearBtn = document.getElementById('clearBtn');
      const modalOverlay = document.getElementById('modalOverlay');
      const modalTitle = document.getElementById('modalTitle');
      const modalTextarea = document.getElementById('modalTextarea');
      const modalCancel = document.getElementById('modalCancel');
      const modalConfirm = document.getElementById('modalConfirm');
      const toast = document.getElementById('toast');

      // State
      let videos = [];
      let playlistName = 'My TikTok Playlist';
      let selectedVideoId = null;
      let modalMode = null; // 'import', 'export', 'bulk'

      // Utility functions
      function generateId() {
        return 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }

      function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = 'toast visible ' + type;
        setTimeout(function() {
          toast.className = 'toast';
        }, 3000);
      }

      function parseTikTokUrl(url) {
        // Extract video ID and username from TikTok URL
        const patterns = [
          /tiktok\\.com\\/@([^/]+)\\/video\\/(\\d+)/,
          /vm\\.tiktok\\.com\\/([A-Za-z0-9]+)/,
          /tiktok\\.com\\/t\\/([A-Za-z0-9]+)/
        ];

        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) {
            return {
              url: url,
              username: match[1] || 'Unknown',
              videoId: match[2] || match[1]
            };
          }
        }

        // If no pattern matches but it looks like a TikTok URL
        if (url.includes('tiktok.com')) {
          return { url: url, username: 'Unknown', videoId: generateId() };
        }

        return null;
      }

      function addVideo(url, title, author) {
        const parsed = parseTikTokUrl(url);
        if (!parsed) {
          showToast('Invalid TikTok URL', 'error');
          return false;
        }

        // Check for duplicates
        if (videos.some(v => v.url === parsed.url || v.url === url)) {
          showToast('Video already in playlist', 'error');
          return false;
        }

        const video = {
          id: generateId(),
          url: url,
          title: title || 'TikTok Video',
          author: author || '@' + parsed.username,
          addedAt: new Date().toISOString(),
          thumbnail: null
        };

        videos.push(video);
        saveState();
        renderVideos();
        emitPlaylistUpdated();
        showToast('Video added!', 'success');
        return true;
      }

      function removeVideo(id) {
        videos = videos.filter(v => v.id !== id);
        if (selectedVideoId === id) {
          selectedVideoId = null;
        }
        saveState();
        renderVideos();
        emitPlaylistUpdated();
        showToast('Video removed', 'success');
      }

      function selectVideo(id) {
        selectedVideoId = id;
        renderVideos();
        const video = videos.find(v => v.id === id);
        if (video) {
          API.emitOutput('video.selected', video);
        }
      }

      function openInTikTok(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      function saveState() {
        API.setState({ videos, playlistName });
      }

      function emitPlaylistUpdated() {
        API.emitOutput('playlist.updated', {
          playlistName,
          videos,
          count: videos.length
        });
      }

      function renderVideos() {
        videoCountEl.textContent = videos.length + ' video' + (videos.length !== 1 ? 's' : '');

        if (videos.length === 0) {
          emptyState.style.display = 'flex';
          videoList.innerHTML = '';
          videoList.appendChild(emptyState);
          return;
        }

        emptyState.style.display = 'none';

        videoList.innerHTML = videos.map(function(video, index) {
          const isSelected = video.id === selectedVideoId;
          return '<div class="video-item' + (isSelected ? ' selected' : '') + '" data-id="' + video.id + '">' +
            '<div class="video-thumbnail">' +
              (video.thumbnail ? '<img src="' + video.thumbnail + '" alt="" />' : '🎬') +
            '</div>' +
            '<div class="video-info">' +
              '<div class="video-title">' + escapeHtml(video.title) + '</div>' +
              '<div class="video-author">👤 ' + escapeHtml(video.author) + '</div>' +
              '<div class="video-meta">#' + (index + 1) + ' • Added ' + formatDate(video.addedAt) + '</div>' +
            '</div>' +
            '<div class="video-actions">' +
              '<button class="video-action-btn open" data-url="' + escapeHtml(video.url) + '" title="Open in TikTok">🔗</button>' +
              '<button class="video-action-btn delete" data-id="' + video.id + '" title="Remove">✕</button>' +
            '</div>' +
          '</div>';
        }).join('');

        // Attach event listeners
        videoList.querySelectorAll('.video-item').forEach(function(item) {
          item.addEventListener('click', function(e) {
            if (!e.target.closest('.video-action-btn')) {
              selectVideo(item.dataset.id);
            }
          });
        });

        videoList.querySelectorAll('.video-action-btn.open').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openInTikTok(btn.dataset.url);
          });
        });

        videoList.querySelectorAll('.video-action-btn.delete').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            removeVideo(btn.dataset.id);
          });
        });
      }

      function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }

      function formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

        return date.toLocaleDateString();
      }

      function showModal(mode) {
        modalMode = mode;
        modalOverlay.classList.add('visible');

        if (mode === 'import') {
          modalTitle.textContent = 'Import Playlist';
          modalTextarea.value = '';
          modalTextarea.placeholder = 'Paste JSON data here...\\n\\nFormat: [{ "url": "...", "title": "...", "author": "..." }, ...]';
        } else if (mode === 'export') {
          modalTitle.textContent = 'Export Playlist';
          modalTextarea.value = JSON.stringify(videos, null, 2);
          modalTextarea.placeholder = '';
        } else if (mode === 'bulk') {
          modalTitle.textContent = 'Bulk Add Videos';
          modalTextarea.value = '';
          modalTextarea.placeholder = 'Paste TikTok URLs (one per line)...';
        }
      }

      function hideModal() {
        modalOverlay.classList.remove('visible');
        modalMode = null;
      }

      function handleModalConfirm() {
        const text = modalTextarea.value.trim();

        if (modalMode === 'import') {
          try {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
              let added = 0;
              data.forEach(function(item) {
                if (item.url) {
                  const exists = videos.some(v => v.url === item.url);
                  if (!exists) {
                    videos.push({
                      id: generateId(),
                      url: item.url,
                      title: item.title || 'TikTok Video',
                      author: item.author || 'Unknown',
                      addedAt: item.addedAt || new Date().toISOString(),
                      thumbnail: item.thumbnail || null
                    });
                    added++;
                  }
                }
              });
              saveState();
              renderVideos();
              emitPlaylistUpdated();
              showToast('Imported ' + added + ' video(s)', 'success');
            }
          } catch (e) {
            showToast('Invalid JSON format', 'error');
            return;
          }
        } else if (modalMode === 'export') {
          // Copy to clipboard
          navigator.clipboard.writeText(text).then(function() {
            showToast('Copied to clipboard!', 'success');
            API.emitOutput('playlist.exported', { playlistName, videos });
          }).catch(function() {
            showToast('Failed to copy', 'error');
          });
        } else if (modalMode === 'bulk') {
          const urls = text.split('\\n').filter(u => u.trim());
          let added = 0;
          urls.forEach(function(url) {
            url = url.trim();
            if (url && addVideo(url)) {
              added++;
            }
          });
          if (added > 0) {
            showToast('Added ' + added + ' video(s)', 'success');
          }
        }

        hideModal();
      }

      // Event listeners
      addBtn.addEventListener('click', function() {
        const url = urlInput.value.trim();
        if (url) {
          if (addVideo(url)) {
            urlInput.value = '';
          }
        }
      });

      urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          addBtn.click();
        }
      });

      importBtn.addEventListener('click', function() { showModal('import'); });
      exportBtn.addEventListener('click', function() { showModal('export'); });
      bulkAddBtn.addEventListener('click', function() { showModal('bulk'); });

      clearBtn.addEventListener('click', function() {
        if (videos.length === 0) return;
        if (confirm('Clear all ' + videos.length + ' videos from playlist?')) {
          videos = [];
          selectedVideoId = null;
          saveState();
          renderVideos();
          emitPlaylistUpdated();
          showToast('Playlist cleared', 'success');
        }
      });

      modalCancel.addEventListener('click', hideModal);
      modalConfirm.addEventListener('click', handleModalConfirm);
      modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
          hideModal();
        }
      });

      // Widget API handlers
      API.onMount(function(context) {
        const state = context.state || {};
        videos = state.videos || [];
        playlistName = state.playlistName || 'My TikTok Playlist';
        playlistNameEl.textContent = playlistName;
        renderVideos();
        API.log('TikTokPlaylistWidget mounted with ' + videos.length + ' videos');
      });

      API.onInput('playlist.add', function(data) {
        if (typeof data === 'string') {
          addVideo(data);
        } else if (data && data.url) {
          addVideo(data.url, data.title, data.author);
        }
      });

      API.onInput('playlist.import', function(data) {
        if (Array.isArray(data)) {
          let added = 0;
          data.forEach(function(item) {
            if (item.url && !videos.some(v => v.url === item.url)) {
              videos.push({
                id: generateId(),
                url: item.url,
                title: item.title || 'TikTok Video',
                author: item.author || 'Unknown',
                addedAt: item.addedAt || new Date().toISOString(),
                thumbnail: item.thumbnail || null
              });
              added++;
            }
          });
          if (added > 0) {
            saveState();
            renderVideos();
            emitPlaylistUpdated();
            showToast('Imported ' + added + ' video(s)', 'success');
          }
        }
      });

      API.onInput('playlist.clear', function() {
        videos = [];
        selectedVideoId = null;
        saveState();
        renderVideos();
        emitPlaylistUpdated();
      });

      API.onStateChange(function(newState) {
        if (newState.videos !== undefined) {
          videos = newState.videos;
          renderVideos();
        }
        if (newState.playlistName !== undefined) {
          playlistName = newState.playlistName;
          playlistNameEl.textContent = playlistName;
        }
      });

      API.onDestroy(function() {
        API.log('TikTokPlaylistWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const TikTokPlaylistWidget: BuiltinWidget = {
  manifest: TikTokPlaylistWidgetManifest,
  html: TikTokPlaylistWidgetHTML,
};
