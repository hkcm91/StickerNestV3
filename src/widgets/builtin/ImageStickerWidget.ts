/**
 * StickerNest v2 - Image Sticker Widget
 *
 * An image display widget with various display modes and effects.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ImageStickerWidgetManifest: WidgetManifest = {
  id: 'stickernest.image-sticker',
  name: 'Image Sticker',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'An image display widget with various display modes',
  author: 'StickerNest',
  tags: ['image', 'sticker', 'photo', 'display', 'core'],
  inputs: {
    src: {
      type: 'string',
      description: 'Image source URL',
      default: '',
    },
    alt: {
      type: 'string',
      description: 'Alt text for accessibility',
      default: 'Image',
    },
    fit: {
      type: 'string',
      description: 'Object fit mode: cover, contain, fill, none',
      default: 'cover',
    },
    borderRadius: {
      type: 'number',
      description: 'Border radius in pixels',
      default: 0,
    },
    shadow: {
      type: 'boolean',
      description: 'Show drop shadow',
      default: true,
    },
  },
  outputs: {
    clicked: {
      type: 'trigger',
      description: 'Emitted when image is clicked',
    },
    loaded: {
      type: 'object',
      description: 'Emitted when image loads',
    },
    error: {
      type: 'object',
      description: 'Emitted when image fails to load',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['image.set', 'image.filter', 'ui.show', 'ui.hide', 'data.set'],
    outputs: ['ui.clicked', 'data.loaded', 'error.occurred'],
  },
  size: {
    width: 200,
    height: 200,
    minWidth: 50,
    minHeight: 50,
    scaleMode: 'contain',
  },
};

export const ImageStickerWidgetHTML = `
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
      background: transparent;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .container.shadow {
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
    }
    .image {
      max-width: 100%;
      max-height: 100%;
      width: 100%;
      height: 100%;
      transition: transform 0.3s ease, filter 0.3s ease;
    }
    .container:hover .image {
      transform: scale(1.02);
    }
    .placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .placeholder-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.8;
    }
    .placeholder-text {
      font-size: 14px;
      opacity: 0.7;
    }
    .loading {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.1);
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fee2e2;
      color: #dc2626;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .error-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    .error-text {
      font-size: 12px;
      text-align: center;
      padding: 0 16px;
    }
    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="container shadow" id="container">
    <div class="placeholder" id="placeholder">
      <div class="placeholder-icon">🖼️</div>
      <div class="placeholder-text">No image set</div>
    </div>
    <div class="loading hidden" id="loading">
      <div class="spinner"></div>
    </div>
    <img class="image hidden" id="image" alt="Image" />
    <div class="error hidden" id="error">
      <div class="error-icon">⚠️</div>
      <div class="error-text" id="errorText">Failed to load image</div>
    </div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const container = document.getElementById('container');
      const placeholder = document.getElementById('placeholder');
      const loading = document.getElementById('loading');
      const image = document.getElementById('image');
      const errorEl = document.getElementById('error');
      const errorText = document.getElementById('errorText');

      let currentSrc = '';
      let fit = 'cover';
      let borderRadius = 0;
      let shadow = true;
      let filter = '';

      function showPlaceholder() {
        placeholder.classList.remove('hidden');
        loading.classList.add('hidden');
        image.classList.add('hidden');
        errorEl.classList.add('hidden');
      }

      function showLoading() {
        placeholder.classList.add('hidden');
        loading.classList.remove('hidden');
        image.classList.add('hidden');
        errorEl.classList.add('hidden');
      }

      function showImage() {
        placeholder.classList.add('hidden');
        loading.classList.add('hidden');
        image.classList.remove('hidden');
        errorEl.classList.add('hidden');
      }

      function showError(message) {
        placeholder.classList.add('hidden');
        loading.classList.add('hidden');
        image.classList.add('hidden');
        errorEl.classList.remove('hidden');
        errorText.textContent = message || 'Failed to load image';
      }

      function applyStyles() {
        image.style.objectFit = fit;
        container.style.borderRadius = borderRadius + 'px';
        image.style.borderRadius = borderRadius + 'px';
        container.classList.toggle('shadow', shadow);
        image.style.filter = filter;
      }

      function loadImage(src) {
        if (!src) {
          showPlaceholder();
          return;
        }

        currentSrc = src;
        showLoading();

        const img = new Image();
        img.onload = function() {
          image.src = src;
          applyStyles();
          showImage();
          API.emitOutput('data.loaded', { src: src, width: img.width, height: img.height });
          API.log('Image loaded: ' + src);
        };
        img.onerror = function() {
          showError('Failed to load image');
          API.emitOutput('error.occurred', { src: src, message: 'Failed to load image' });
          API.warn('Failed to load image: ' + src);
        };
        img.src = API.getAssetUrl(src);
      }

      // Initialize
      API.onMount(function(context) {
        const state = context.state || {};
        fit = state.fit || 'cover';
        borderRadius = state.borderRadius || 0;
        shadow = state.shadow !== false;
        filter = state.filter || '';

        if (state.src) {
          loadImage(state.src);
        } else {
          showPlaceholder();
        }
        API.log('ImageStickerWidget mounted');
      });

      // Click handler
      container.addEventListener('click', function() {
        API.emitOutput('ui.clicked', { src: currentSrc });
        API.emit('clicked', { src: currentSrc });
      });

      // Handle image.set
      API.onInput('image.set', function(value) {
        const src = typeof value === 'string' ? value : (value && value.src) || '';
        API.setState({ src: src });
        loadImage(src);
      });

      // Handle image.filter
      API.onInput('image.filter', function(value) {
        if (typeof value === 'string') {
          filter = value;
        } else if (value) {
          const filters = [];
          if (value.blur) filters.push('blur(' + value.blur + 'px)');
          if (value.brightness) filters.push('brightness(' + value.brightness + ')');
          if (value.contrast) filters.push('contrast(' + value.contrast + ')');
          if (value.grayscale) filters.push('grayscale(' + value.grayscale + ')');
          if (value.sepia) filters.push('sepia(' + value.sepia + ')');
          if (value.saturate) filters.push('saturate(' + value.saturate + ')');
          if (value.hueRotate) filters.push('hue-rotate(' + value.hueRotate + 'deg)');
          filter = filters.join(' ');
        }
        applyStyles();
        API.setState({ filter: filter });
      });

      // Handle ui.show
      API.onInput('ui.show', function() {
        container.style.display = 'flex';
      });

      // Handle ui.hide
      API.onInput('ui.hide', function() {
        container.style.display = 'none';
      });

      // Handle data.set
      API.onInput('data.set', function(data) {
        if (typeof data === 'string') {
          loadImage(data);
        } else if (data) {
          if (data.src !== undefined) loadImage(data.src);
          if (data.fit !== undefined) { fit = data.fit; applyStyles(); }
          if (data.borderRadius !== undefined) { borderRadius = data.borderRadius; applyStyles(); }
          if (data.shadow !== undefined) { shadow = data.shadow; applyStyles(); }
          if (data.filter !== undefined) { filter = data.filter; applyStyles(); }
          API.setState(data);
        }
      });

      API.onDestroy(function() {
        API.log('ImageStickerWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const ImageStickerWidget: BuiltinWidget = {
  manifest: ImageStickerWidgetManifest,
  html: ImageStickerWidgetHTML,
};
