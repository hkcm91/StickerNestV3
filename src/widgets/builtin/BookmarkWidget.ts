/**
 * StickerNest v2 - Bookmark Widget
 *
 * Quick link buttons for bookmarks and shortcuts.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const BookmarkWidgetManifest: WidgetManifest = {
  id: 'stickernest.bookmark',
  name: 'Bookmark',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Quick link bookmark button',
  author: 'StickerNest',
  tags: ['bookmark', 'link', 'button', 'interactive', 'core'],
  inputs: {
    title: {
      type: 'string',
      description: 'Bookmark title',
      default: 'My Bookmark',
    },
    url: {
      type: 'string',
      description: 'Bookmark URL',
      default: 'https://example.com',
    },
    icon: {
      type: 'string',
      description: 'Icon emoji or URL',
      default: '🔗',
    },
    color: {
      type: 'string',
      description: 'Background color',
      default: '#4a5568',
    },
  },
  outputs: {
    clicked: {
      type: 'object',
      description: 'Emitted when bookmark is clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['bookmark.set', 'ui.click'],
    outputs: ['bookmark.clicked', 'bookmark.navigate'],
  },
  size: {
    width: 120,
    height: 100,
    minWidth: 80,
    minHeight: 70,
    scaleMode: 'scale',
  },
};

export const BookmarkWidgetHTML = `
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
      align-items: center;
      justify-content: center;
      background: #4a5568;
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    .container:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      filter: brightness(1.1);
    }
    .container:active {
      transform: scale(0.98);
    }
    .icon {
      font-size: 32px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon img {
      width: 32px;
      height: 32px;
      border-radius: 6px;
    }
    .title {
      font-size: 12px;
      color: white;
      text-align: center;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="icon" id="icon">🔗</div>
    <div class="title" id="title">My Bookmark</div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const container = document.getElementById('container');
      const iconEl = document.getElementById('icon');
      const titleEl = document.getElementById('title');

      let title = 'My Bookmark';
      let url = 'https://example.com';
      let icon = '🔗';
      let color = '#4a5568';

      function updateDisplay() {
        titleEl.textContent = title;
        container.style.background = color;

        // Check if icon is a URL (image) or emoji
        if (icon.startsWith('http') || icon.startsWith('data:')) {
          iconEl.innerHTML = '<img src="' + icon + '" alt="" />';
        } else {
          iconEl.textContent = icon;
        }
      }

      API.onMount(function(context) {
        const state = context.state || {};
        title = state.title || 'My Bookmark';
        url = state.url || 'https://example.com';
        icon = state.icon || '🔗';
        color = state.color || '#4a5568';
        updateDisplay();
        API.log('BookmarkWidget mounted');
      });

      container.addEventListener('click', function(e) {
        e.preventDefault();
        API.emitOutput('bookmark.clicked', { title, url });
        API.emitOutput('bookmark.navigate', url);

        // Open URL in new tab
        if (url && url !== '#') {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      });

      API.onInput('bookmark.set', function(data) {
        if (data.title) title = data.title;
        if (data.url) url = data.url;
        if (data.icon) icon = data.icon;
        if (data.color) color = data.color;
        updateDisplay();
        API.setState({ title, url, icon, color });
      });

      API.onInput('ui.click', function() {
        container.click();
      });

      API.onStateChange(function(newState) {
        if (newState.title !== undefined) title = newState.title;
        if (newState.url !== undefined) url = newState.url;
        if (newState.icon !== undefined) icon = newState.icon;
        if (newState.color !== undefined) color = newState.color;
        updateDisplay();
      });

      API.onDestroy(function() {
        API.log('BookmarkWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const BookmarkWidget: BuiltinWidget = {
  manifest: BookmarkWidgetManifest,
  html: BookmarkWidgetHTML,
};
