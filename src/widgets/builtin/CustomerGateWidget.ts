/**
 * StickerNest v2 - Customer Gate Widget
 * Gates content behind authentication, subscription, or purchase requirements
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const CustomerGateWidgetManifest: WidgetManifest = {
  id: 'stickernest.customer-gate',
  name: 'Customer Gate',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Gate content behind login, subscription, or purchase requirements',
  kind: 'container',
  category: 'commerce',
  tags: ['gate', 'paywall', 'auth', 'subscription', 'purchase', 'commerce'],
  icon: '🔒',

  defaultSize: { width: 400, height: 300 },
  minSize: { width: 200, height: 150 },
  maxSize: { width: 800, height: 600 },

  inputs: [],
  outputs: [
    { id: 'onAccessGranted', name: 'Access Granted', type: 'event', description: 'Fires when user gains access' },
    { id: 'onAccessDenied', name: 'Access Denied', type: 'event', description: 'Fires when access is denied' },
  ],

  config: {
    schema: {
      type: 'object',
      properties: {
        gateType: {
          type: 'string',
          default: 'auth',
          enum: ['auth', 'subscription', 'purchase'],
          title: 'Gate Type',
        },
        productId: {
          type: 'string',
          default: '',
          title: 'Required Product ID',
          description: 'Product ID for subscription/purchase gates',
        },
        lockedTitle: {
          type: 'string',
          default: 'Premium Content',
          title: 'Locked Title',
        },
        lockedMessage: {
          type: 'string',
          default: 'Sign in to access this content',
          title: 'Locked Message',
        },
        ctaText: {
          type: 'string',
          default: 'Sign In',
          title: 'CTA Button Text',
        },
        ctaUrl: {
          type: 'string',
          default: '',
          title: 'CTA URL (optional)',
        },
        blurAmount: {
          type: 'number',
          default: 8,
          title: 'Blur Amount (px)',
        },
        showPreview: {
          type: 'boolean',
          default: true,
          title: 'Show Blurred Preview',
        },
        accentColor: {
          type: 'string',
          default: '#8b5cf6',
          title: 'Accent Color',
        },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const CustomerGateWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --accent-color: #8b5cf6;
      --accent-hover: #7c3aed;
      --bg-color: #1f2937;
      --text-color: #f9fafb;
      --text-secondary: #9ca3af;
      --blur-amount: 8px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }

    .gate-container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .content-preview {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
      filter: blur(var(--blur-amount));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .content-preview.no-blur {
      filter: none;
    }

    .preview-placeholder {
      color: rgba(255,255,255,0.1);
      font-size: 4rem;
    }

    .gate-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(2px);
    }

    .gate-card {
      background: var(--bg-color);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      max-width: 320px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .gate-icon {
      width: 64px;
      height: 64px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 1.75rem;
    }

    .gate-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-color);
      margin-bottom: 8px;
    }

    .gate-message {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .cta-btn {
      display: inline-block;
      padding: 12px 24px;
      font-size: 0.95rem;
      font-weight: 600;
      color: white;
      background: var(--accent-color);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s, transform 0.1s;
    }

    .cta-btn:hover { background: var(--accent-hover); }
    .cta-btn:active { transform: scale(0.98); }

    .unlocked-state {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-color);
      color: var(--text-color);
    }

    .unlocked-message {
      text-align: center;
    }

    .unlocked-icon {
      font-size: 3rem;
      margin-bottom: 12px;
    }

    .hidden { display: none; }

    @media (prefers-color-scheme: light) {
      :root {
        --bg-color: #ffffff;
        --text-color: #1f2937;
        --text-secondary: #6b7280;
      }
    }
  </style>
</head>
<body>
  <div class="gate-container">
    <!-- Locked State -->
    <div id="lockedState">
      <div class="content-preview" id="contentPreview">
        <span class="preview-placeholder">🔒</span>
      </div>
      <div class="gate-overlay">
        <div class="gate-card">
          <div class="gate-icon" id="gateIcon">🔐</div>
          <h2 class="gate-title" id="gateTitle">Premium Content</h2>
          <p class="gate-message" id="gateMessage">Sign in to access this content</p>
          <button class="cta-btn" id="ctaBtn">Sign In</button>
        </div>
      </div>
    </div>

    <!-- Unlocked State -->
    <div id="unlockedState" class="unlocked-state hidden">
      <div class="unlocked-message">
        <div class="unlocked-icon">✅</div>
        <p>Access granted</p>
      </div>
    </div>
  </div>

  <script>
    (function() {
      let config = {};
      let canvasId = '';
      let widgetId = '';
      let hasAccess = false;

      const lockedState = document.getElementById('lockedState');
      const unlockedState = document.getElementById('unlockedState');
      const contentPreview = document.getElementById('contentPreview');
      const gateIcon = document.getElementById('gateIcon');
      const gateTitle = document.getElementById('gateTitle');
      const gateMessage = document.getElementById('gateMessage');
      const ctaBtn = document.getElementById('ctaBtn');

      function applyConfig(cfg) {
        config = cfg;

        gateTitle.textContent = cfg.lockedTitle || 'Premium Content';
        gateMessage.textContent = cfg.lockedMessage || 'Sign in to access this content';
        ctaBtn.textContent = cfg.ctaText || 'Sign In';

        // Set icon based on gate type
        const icons = { auth: '🔐', subscription: '⭐', purchase: '💎' };
        gateIcon.textContent = icons[cfg.gateType] || '🔐';

        // Update message based on gate type
        if (!cfg.lockedMessage) {
          const messages = {
            auth: 'Sign in to access this content',
            subscription: 'Subscribe to unlock this content',
            purchase: 'Purchase to unlock this content',
          };
          gateMessage.textContent = messages[cfg.gateType] || messages.auth;
        }

        // Blur amount
        const blur = cfg.blurAmount !== undefined ? cfg.blurAmount : 8;
        document.documentElement.style.setProperty('--blur-amount', blur + 'px');

        // Show/hide preview
        if (cfg.showPreview === false) {
          contentPreview.classList.add('no-blur');
        } else {
          contentPreview.classList.remove('no-blur');
        }

        // Accent color
        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent-color', cfg.accentColor);
        }
      }

      function showUnlocked() {
        hasAccess = true;
        lockedState.classList.add('hidden');
        unlockedState.classList.remove('hidden');

        window.parent.postMessage({
          type: 'widget:output',
          outputId: 'onAccessGranted',
          data: {}
        }, '*');
      }

      function showLocked(reason) {
        hasAccess = false;
        unlockedState.classList.add('hidden');
        lockedState.classList.remove('hidden');

        window.parent.postMessage({
          type: 'widget:output',
          outputId: 'onAccessDenied',
          data: { reason }
        }, '*');
      }

      async function checkAccess() {
        const token = localStorage.getItem('stickernest:customer_token');

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const params = new URLSearchParams({ canvasId });
          if (widgetId) params.set('widgetId', widgetId);

          const headers = {};
          if (token) headers['X-Customer-Token'] = token;

          const res = await fetch(apiBase + '/commerce/customer/access?' + params.toString(), {
            headers
          });

          const data = await res.json();

          if (data.allowed) {
            showUnlocked();
          } else {
            showLocked(data.reason);
          }
        } catch (e) {
          console.error('Access check failed:', e);
          showLocked('error');
        }
      }

      ctaBtn.addEventListener('click', () => {
        if (config.ctaUrl) {
          window.open(config.ctaUrl, '_blank');
        } else {
          // Emit event for parent to handle
          window.parent.postMessage({
            type: 'widget:event',
            event: 'gate:ctaClicked',
            data: { gateType: config.gateType, productId: config.productId }
          }, '*');
        }
      });

      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            canvasId = payload?.canvasId || '';
            widgetId = payload?.widgetId || '';
            if (payload?.config) applyConfig(payload.config);
            checkAccess();
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            checkAccess();
            break;

          case 'widget:checkAccess':
            checkAccess();
            break;
        }
      });

      // Re-check access when customer logs in/out
      window.addEventListener('storage', (e) => {
        if (e.key === 'stickernest:customer_token') {
          checkAccess();
        }
      });

      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const CustomerGateWidget: BuiltinWidget = {
  manifest: CustomerGateWidgetManifest,
  html: CustomerGateWidgetHTML,
};

export default CustomerGateWidget;
