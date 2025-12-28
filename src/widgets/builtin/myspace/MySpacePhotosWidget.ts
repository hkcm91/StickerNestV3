/**
 * StickerNest v2 - MySpace Photos Widget (2006 Theme)
 * =====================================================
 *
 * The classic MySpace photo gallery - "View My: Pics" with the
 * thumbnail grid and album navigation. Featured mirror selfies,
 * scene hair photos, and heavily edited pictures.
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const MySpacePhotosWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-photos',
  name: 'MySpace Photos',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 "View My: Pics" photo gallery.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'photos', 'gallery', 'pics', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    photos: {
      type: 'array',
      description: 'Array of photo objects with url, caption, date',
      default: [],
    },
    albumName: {
      type: 'string',
      description: 'Album name',
      default: 'Default',
    },
  },
  outputs: {
    photoClicked: { type: 'object', description: 'Photo clicked to view' },
    uploadClicked: { type: 'object', description: 'Upload photos clicked' },
    albumChanged: { type: 'object', description: 'Album changed' },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['photos.set', 'album.set', 'data.set'],
    outputs: ['photo.clicked', 'upload.clicked', 'album.changed'],
  },
  size: {
    width: 350,
    height: 320,
    minWidth: 280,
    minHeight: 250,
    scaleMode: 'stretch',
  },
};

export const MySpacePhotosWidgetHTML = `
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
      background: #B4D0DC;
    }

    .myspace-container {
      width: 100%;
      height: 100%;
      background: #B4D0DC;
      padding: 8px;
    }

    .photos-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .photos-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .photos-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .photos-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }

    .header-link {
      color: #FFCC00;
      text-decoration: underline;
      font-size: 9px;
      cursor: pointer;
    }

    .header-link:hover {
      color: #FFFFFF;
    }

    .album-bar {
      background: #E8F4F8;
      padding: 6px 8px;
      border-bottom: 1px solid #99CCFF;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
    }

    .album-label {
      color: #666666;
    }

    .album-select {
      padding: 2px 4px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 10px;
      border: 1px solid #99CCFF;
    }

    .photo-count {
      margin-left: auto;
      color: #666666;
    }

    .photos-grid {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      align-content: start;
    }

    .photo-thumb {
      aspect-ratio: 1;
      border: 2px solid #336699;
      background: #EEEEEE;
      cursor: pointer;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .photo-thumb:hover {
      border-color: #FF6633;
    }

    .photo-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-placeholder {
      color: #999999;
      font-size: 20px;
    }

    .photo-new-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      background: #FF0000;
      color: #FFFFFF;
      font-size: 7px;
      padding: 1px 3px;
      font-weight: bold;
    }

    .photos-footer {
      background: #E8F4F8;
      padding: 6px 8px;
      border-top: 1px solid #99CCFF;
      display: flex;
      justify-content: center;
      gap: 8px;
    }

    .nav-link {
      color: #336699;
      text-decoration: underline;
      font-size: 10px;
      cursor: pointer;
    }

    .nav-link:hover {
      color: #003366;
    }

    .nav-link.disabled {
      color: #CCCCCC;
      cursor: default;
    }

    /* Photo lightbox */
    .lightbox {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .lightbox.visible {
      display: flex;
    }

    .lightbox-close {
      position: absolute;
      top: 10px;
      right: 10px;
      color: #FFFFFF;
      font-size: 24px;
      cursor: pointer;
      background: none;
      border: none;
    }

    .lightbox-image {
      max-width: 90%;
      max-height: 70%;
      border: 4px solid #FFFFFF;
    }

    .lightbox-caption {
      color: #FFFFFF;
      margin-top: 10px;
      font-size: 11px;
      text-align: center;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 14px;
    }

    ::-webkit-scrollbar-track {
      background: #B4D0DC;
    }

    ::-webkit-scrollbar-thumb {
      background: #336699;
      border: 2px solid #B4D0DC;
    }
  </style>
</head>
<body>
  <div class="myspace-container">
    <div class="photos-box">
      <div class="photos-header">
        <div class="photos-header-left">
          <svg class="photos-header-icon" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          <span id="headerTitle">Tom's Pics</span>
        </div>
        <a class="header-link" id="uploadLink">[Upload Photos]</a>
      </div>

      <div class="album-bar">
        <span class="album-label">Album:</span>
        <select class="album-select" id="albumSelect">
          <option value="default">Default</option>
          <option value="me">Pictures of Me</option>
          <option value="friends">Friends</option>
          <option value="concerts">Concerts</option>
          <option value="random">Random Stuff</option>
        </select>
        <span class="photo-count"><span id="photoCount">12</span> photos</span>
      </div>

      <div class="photos-grid" id="photosGrid">
        <!-- Photos populated here -->
      </div>

      <div class="photos-footer">
        <a class="nav-link" id="prevPage">&lt; Previous</a>
        <span id="pageInfo">Page 1 of 2</span>
        <a class="nav-link" id="nextPage">Next &gt;</a>
      </div>

      <div class="lightbox" id="lightbox">
        <button class="lightbox-close" id="lightboxClose">&times;</button>
        <img class="lightbox-image" id="lightboxImage" src="" alt="" />
        <div class="lightbox-caption" id="lightboxCaption"></div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        username: 'Tom',
        albumName: 'Default',
        photos: [],
        currentPage: 0,
        photosPerPage: 8
      };

      // Default photos (placeholders)
      const defaultPhotos = [
        { id: 1, url: null, caption: 'Me at the beach :)', date: '12/20/2006', isNew: true },
        { id: 2, url: null, caption: 'Mirror pic lol', date: '12/18/2006', isNew: true },
        { id: 3, url: null, caption: 'Concert last night!', date: '12/15/2006', isNew: false },
        { id: 4, url: null, caption: 'New hair!!', date: '12/10/2006', isNew: false },
        { id: 5, url: null, caption: 'Me and my BFFs', date: '12/05/2006', isNew: false },
        { id: 6, url: null, caption: 'Random :P', date: '12/01/2006', isNew: false },
        { id: 7, url: null, caption: 'Emo kid pic', date: '11/28/2006', isNew: false },
        { id: 8, url: null, caption: 'Scene hair ftw', date: '11/25/2006', isNew: false },
        { id: 9, url: null, caption: 'Old pic', date: '11/20/2006', isNew: false },
        { id: 10, url: null, caption: 'Throwback', date: '11/15/2006', isNew: false },
        { id: 11, url: null, caption: 'lol random', date: '11/10/2006', isNew: false },
        { id: 12, url: null, caption: 'Rawr XD', date: '11/05/2006', isNew: false }
      ];

      // Elements
      const headerTitle = document.getElementById('headerTitle');
      const albumSelect = document.getElementById('albumSelect');
      const photoCount = document.getElementById('photoCount');
      const photosGrid = document.getElementById('photosGrid');
      const pageInfo = document.getElementById('pageInfo');
      const prevPage = document.getElementById('prevPage');
      const nextPage = document.getElementById('nextPage');
      const uploadLink = document.getElementById('uploadLink');
      const lightbox = document.getElementById('lightbox');
      const lightboxClose = document.getElementById('lightboxClose');
      const lightboxImage = document.getElementById('lightboxImage');
      const lightboxCaption = document.getElementById('lightboxCaption');

      // Render photos
      function render() {
        headerTitle.textContent = state.username + "'s Pics";

        const photos = state.photos.length > 0 ? state.photos : defaultPhotos;
        photoCount.textContent = photos.length;

        const totalPages = Math.ceil(photos.length / state.photosPerPage);
        const start = state.currentPage * state.photosPerPage;
        const end = start + state.photosPerPage;
        const pagePhotos = photos.slice(start, end);

        pageInfo.textContent = 'Page ' + (state.currentPage + 1) + ' of ' + totalPages;
        prevPage.classList.toggle('disabled', state.currentPage === 0);
        nextPage.classList.toggle('disabled', state.currentPage >= totalPages - 1);

        photosGrid.innerHTML = '';

        pagePhotos.forEach(function(photo) {
          const thumb = document.createElement('div');
          thumb.className = 'photo-thumb';
          thumb.innerHTML = photo.url
            ? '<img src="' + photo.url + '" alt="' + photo.caption + '" />'
            : '<span class="photo-placeholder">📷</span>';

          if (photo.isNew) {
            thumb.innerHTML += '<span class="photo-new-badge">NEW!</span>';
          }

          thumb.addEventListener('click', function() {
            showLightbox(photo);
          });

          photosGrid.appendChild(thumb);
        });
      }

      // Show lightbox
      function showLightbox(photo) {
        if (photo.url) {
          lightboxImage.src = photo.url;
        } else {
          lightboxImage.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#336699" width="200" height="200"/><text fill="#fff" x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="60">📷</text></svg>');
        }
        lightboxCaption.textContent = photo.caption + ' - ' + photo.date;
        lightbox.classList.add('visible');

        API.emitOutput('photo.clicked', {
          id: photo.id,
          caption: photo.caption
        });
      }

      // Hide lightbox
      function hideLightbox() {
        lightbox.classList.remove('visible');
      }

      // Event handlers
      lightboxClose.addEventListener('click', hideLightbox);
      lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) hideLightbox();
      });

      prevPage.addEventListener('click', function() {
        if (state.currentPage > 0) {
          state.currentPage--;
          render();
        }
      });

      nextPage.addEventListener('click', function() {
        const photos = state.photos.length > 0 ? state.photos : defaultPhotos;
        const totalPages = Math.ceil(photos.length / state.photosPerPage);
        if (state.currentPage < totalPages - 1) {
          state.currentPage++;
          render();
        }
      });

      albumSelect.addEventListener('change', function() {
        state.albumName = this.value;
        state.currentPage = 0;
        render();
        API.emitOutput('album.changed', { album: state.albumName });
      });

      uploadLink.addEventListener('click', function(e) {
        e.preventDefault();
        API.emitOutput('upload.clicked', {});
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpacePhotosWidget mounted');
      });

      // Handle photos.set input
      API.onInput('photos.set', function(photos) {
        if (Array.isArray(photos)) {
          state.photos = photos;
          state.currentPage = 0;
          render();
          API.setState({ photos: state.photos });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.username = data.username || state.username;
          state.albumName = data.albumName || state.albumName;
          state.photos = data.photos || state.photos;
        }
        render();
        API.setState(state);
      });

      API.onDestroy(function() {
        API.log('MySpacePhotosWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpacePhotosWidget: BuiltinWidget = {
  manifest: MySpacePhotosWidgetManifest,
  html: MySpacePhotosWidgetHTML,
};
