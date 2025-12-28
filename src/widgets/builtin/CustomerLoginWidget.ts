/**
 * StickerNest v2 - Customer Login Widget
 * Provides magic link authentication for customers on canvas pages
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const CustomerLoginWidgetManifest: WidgetManifest = {
  id: 'stickernest.customer-login',
  name: 'Customer Login',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Magic link login form for canvas page customers',
  kind: 'interactive',
  category: 'commerce',
  tags: ['auth', 'login', 'customer', 'magic-link', 'commerce'],
  icon: '🔐',

  defaultSize: { width: 340, height: 280 },
  minSize: { width: 280, height: 220 },
  maxSize: { width: 500, height: 400 },

  inputs: [],
  outputs: [
    { id: 'onLogin', name: 'On Login', type: 'event', description: 'Fires when customer logs in' },
    { id: 'onLogout', name: 'On Logout', type: 'event', description: 'Fires when customer logs out' },
  ],

  config: {
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', default: 'Sign In', title: 'Title' },
        subtitle: { type: 'string', default: 'Enter your email to receive a login link', title: 'Subtitle' },
        buttonText: { type: 'string', default: 'Send Login Link', title: 'Button Text' },
        showLoggedInState: { type: 'boolean', default: true, title: 'Show Logged In State' },
        backgroundColor: { type: 'string', default: '#ffffff', title: 'Background Color' },
        accentColor: { type: 'string', default: '#8b5cf6', title: 'Accent Color' },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const CustomerLoginWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #1f2937;
      --text-secondary: #6b7280;
      --accent-color: #8b5cf6;
      --accent-hover: #7c3aed;
      --border-color: #e5e7eb;
      --input-bg: #f9fafb;
      --success-color: #10b981;
      --error-color: #ef4444;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-color);
      color: var(--text-color);
      padding: 20px;
      min-height: 100vh;
    }

    .container { max-width: 100%; }

    .header { text-align: center; margin-bottom: 20px; }

    .title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .form-group { margin-bottom: 16px; }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 10px 14px;
      font-size: 0.95rem;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--input-bg);
      color: var(--text-color);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .submit-btn {
      width: 100%;
      padding: 12px 20px;
      font-size: 1rem;
      font-weight: 600;
      color: white;
      background: var(--accent-color);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }

    .submit-btn:hover:not(:disabled) { background: var(--accent-hover); }
    .submit-btn:active:not(:disabled) { transform: scale(0.98); }
    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .submit-btn.loading {
      position: relative;
      color: transparent;
    }

    .submit-btn.loading::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      top: 50%;
      left: 50%;
      margin: -10px 0 0 -10px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .message {
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.875rem;
      text-align: center;
    }

    .message.success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .message.error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .logged-in-state {
      text-align: center;
      padding: 20px 0;
    }

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--accent-color);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 auto 12px;
    }

    .user-email {
      font-size: 0.95rem;
      color: var(--text-color);
      margin-bottom: 4px;
    }

    .user-name {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .logout-btn {
      padding: 8px 16px;
      font-size: 0.875rem;
      color: var(--text-secondary);
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .logout-btn:hover {
      background: var(--input-bg);
    }

    .hidden { display: none; }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #1f2937;
        --text-color: #f9fafb;
        --text-secondary: #9ca3af;
        --border-color: #374151;
        --input-bg: #374151;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Login Form -->
    <div id="loginForm">
      <div class="header">
        <h2 class="title" id="title">Sign In</h2>
        <p class="subtitle" id="subtitle">Enter your email to receive a login link</p>
      </div>

      <div id="messageContainer" class="hidden"></div>

      <form id="emailForm">
        <div class="form-group">
          <label class="form-label" for="emailInput">Email</label>
          <input type="email" id="emailInput" class="form-input" placeholder="you@example.com" required>
        </div>
        <button type="submit" class="submit-btn" id="submitBtn">Send Login Link</button>
      </form>
    </div>

    <!-- Logged In State -->
    <div id="loggedInState" class="logged-in-state hidden">
      <div class="avatar" id="avatar">?</div>
      <div class="user-email" id="userEmail"></div>
      <div class="user-name" id="userName"></div>
      <button class="logout-btn" id="logoutBtn">Sign Out</button>
    </div>
  </div>

  <script>
    (function() {
      let config = {};
      let creatorId = '';
      let canvasId = '';
      let customer = null;
      let isSubmitting = false;

      const loginForm = document.getElementById('loginForm');
      const loggedInState = document.getElementById('loggedInState');
      const emailForm = document.getElementById('emailForm');
      const emailInput = document.getElementById('emailInput');
      const submitBtn = document.getElementById('submitBtn');
      const messageContainer = document.getElementById('messageContainer');
      const title = document.getElementById('title');
      const subtitle = document.getElementById('subtitle');
      const avatar = document.getElementById('avatar');
      const userEmail = document.getElementById('userEmail');
      const userName = document.getElementById('userName');
      const logoutBtn = document.getElementById('logoutBtn');

      function applyConfig(cfg) {
        config = cfg;
        title.textContent = cfg.title || 'Sign In';
        subtitle.textContent = cfg.subtitle || 'Enter your email to receive a login link';
        submitBtn.textContent = cfg.buttonText || 'Send Login Link';

        if (cfg.backgroundColor) {
          document.documentElement.style.setProperty('--bg-color', cfg.backgroundColor);
        }
        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent-color', cfg.accentColor);
        }
      }

      function showMessage(text, type) {
        messageContainer.textContent = text;
        messageContainer.className = 'message ' + type;
        messageContainer.classList.remove('hidden');
      }

      function hideMessage() {
        messageContainer.classList.add('hidden');
      }

      function showLoggedIn(cust) {
        customer = cust;
        loginForm.classList.add('hidden');
        loggedInState.classList.remove('hidden');

        const initial = (cust.name || cust.email || '?')[0].toUpperCase();
        avatar.textContent = initial;
        userEmail.textContent = cust.email;
        userName.textContent = cust.name || '';
      }

      function showLoginForm() {
        customer = null;
        loggedInState.classList.add('hidden');
        loginForm.classList.remove('hidden');
        hideMessage();
      }

      async function checkSession() {
        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) return;

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/session', {
            headers: { 'X-Customer-Token': token }
          });
          const data = await res.json();

          if (data.success && data.session?.customer) {
            showLoggedIn(data.session.customer);
          }
        } catch (e) {
          console.error('Session check failed:', e);
        }
      }

      async function sendMagicLink(email) {
        if (isSubmitting) return;
        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        hideMessage();

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              creatorId,
              canvasId,
              redirectUrl: window.location.href
            })
          });

          const data = await res.json();

          if (data.success) {
            showMessage('Check your email for the login link!', 'success');
            emailInput.value = '';
          } else {
            showMessage(data.error?.message || 'Failed to send link', 'error');
          }
        } catch (e) {
          showMessage('Network error. Please try again.', 'error');
        } finally {
          isSubmitting = false;
          submitBtn.disabled = false;
          submitBtn.classList.remove('loading');
        }
      }

      async function logout() {
        const token = localStorage.getItem('stickernest:customer_token');

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          await fetch(apiBase + '/commerce/customer/logout', {
            method: 'POST',
            headers: token ? { 'X-Customer-Token': token } : {}
          });
        } catch (e) {
          // Ignore errors
        }

        localStorage.removeItem('stickernest:customer_token');
        showLoginForm();

        window.parent.postMessage({
          type: 'widget:output',
          outputId: 'onLogout',
          data: {}
        }, '*');
      }

      emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (email) sendMagicLink(email);
      });

      logoutBtn.addEventListener('click', logout);

      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            creatorId = payload?.creatorId || '';
            canvasId = payload?.canvasId || '';
            if (payload?.config) applyConfig(payload.config);
            checkSession();
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            break;
        }
      });

      // Listen for successful login from magic link verification
      window.addEventListener('storage', (e) => {
        if (e.key === 'stickernest:customer_token' && e.newValue) {
          checkSession().then(() => {
            if (customer) {
              window.parent.postMessage({
                type: 'widget:output',
                outputId: 'onLogin',
                data: { customer }
              }, '*');
            }
          });
        }
      });

      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const CustomerLoginWidget: BuiltinWidget = {
  manifest: CustomerLoginWidgetManifest,
  html: CustomerLoginWidgetHTML,
};

export default CustomerLoginWidget;
