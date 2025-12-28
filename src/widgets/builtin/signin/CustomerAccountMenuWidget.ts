/**
 * StickerNest v2 - Customer Account Menu Widget
 * Compact account navigation hub that shows logged-in state
 * and provides quick access to profile, orders, and subscriptions
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const CustomerAccountMenuWidgetManifest: WidgetManifest = {
  id: 'stickernest.customer-account-menu',
  name: 'Customer Account Menu',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Compact account menu showing auth state and navigation to profile, orders, subscription widgets',
  kind: 'interactive',
  category: 'signin',
  tags: ['account', 'menu', 'navigation', 'customer', 'hub', 'pipeline'],
  icon: '👤',

  defaultSize: { width: 280, height: 320 },
  minSize: { width: 220, height: 200 },
  maxSize: { width: 400, height: 500 },

  inputs: [
    { id: 'onLogin', name: 'On Login', type: 'object', description: 'Receives login event' },
    { id: 'onLogout', name: 'On Logout', type: 'trigger', description: 'Receives logout event' },
    { id: 'setExpanded', name: 'Set Expanded', type: 'boolean', description: 'Expand or collapse menu' },
  ],
  outputs: [
    { id: 'onNavigate', name: 'Navigate', type: 'object', description: 'Fires when menu item clicked with target' },
    { id: 'onSignInClick', name: 'Sign In Click', type: 'trigger', description: 'Fires when Sign In clicked' },
    { id: 'onProfileClick', name: 'Profile Click', type: 'trigger', description: 'Fires when Profile clicked' },
    { id: 'onOrdersClick', name: 'Orders Click', type: 'trigger', description: 'Fires when Orders clicked' },
    { id: 'onSubscriptionClick', name: 'Subscription Click', type: 'trigger', description: 'Fires when Subscription clicked' },
    { id: 'onLogoutClick', name: 'Logout Click', type: 'trigger', description: 'Fires when Logout clicked' },
  ],

  io: {
    inputs: ['auth.login', 'auth.logout', 'ui.expand'],
    outputs: ['nav.navigate', 'nav.signin', 'nav.profile', 'nav.orders', 'nav.subscription', 'auth.logout'],
  },

  config: {
    schema: {
      type: 'object',
      properties: {
        showOrders: { type: 'boolean', default: true, title: 'Show Orders Link' },
        showSubscription: { type: 'boolean', default: true, title: 'Show Subscription Link' },
        showProfile: { type: 'boolean', default: true, title: 'Show Profile Link' },
        compactMode: { type: 'boolean', default: false, title: 'Compact Mode' },
        accentColor: { type: 'string', default: '#8b5cf6', title: 'Accent Color' },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const CustomerAccountMenuWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --accent: #8b5cf6;
      --accent-hover: #7c3aed;
      --accent-light: rgba(139, 92, 246, 0.1);
      --bg: #ffffff;
      --bg-secondary: #f9fafb;
      --text: #1f2937;
      --text-secondary: #6b7280;
      --border: #e5e7eb;
      --success: #10b981;
      --error: #ef4444;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    .container { padding: 16px; }

    /* Not Logged In State */
    .login-state {
      text-align: center;
      padding: 24px 16px;
    }

    .login-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 1.75rem;
    }

    .login-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .btn-signin {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      width: 100%;
    }

    .btn-signin:hover { background: var(--accent-hover); }

    /* Logged In State */
    .account-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 12px;
      margin-bottom: 12px;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 600;
      flex-shrink: 0;
      overflow: hidden;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-info { flex: 1; min-width: 0; }

    .user-name {
      font-weight: 600;
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: 0.8rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Menu Items */
    .menu-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: transparent;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      color: var(--text);
      cursor: pointer;
      transition: background 0.2s;
      width: 100%;
      text-align: left;
    }

    .menu-item:hover { background: var(--bg-secondary); }
    .menu-item:active { background: var(--accent-light); }

    .menu-item-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }

    .menu-item-text { flex: 1; }

    .menu-item-arrow {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    .menu-divider {
      height: 1px;
      background: var(--border);
      margin: 8px 0;
    }

    /* Logout */
    .menu-item.logout {
      color: var(--error);
    }

    .menu-item.logout .menu-item-icon {
      background: rgba(239, 68, 68, 0.1);
    }

    /* Subscription Badge */
    .sub-badge {
      padding: 2px 8px;
      font-size: 0.7rem;
      font-weight: 600;
      border-radius: 10px;
      background: var(--accent-light);
      color: var(--accent);
    }

    /* Compact Mode */
    .compact .account-header {
      padding: 8px;
      margin-bottom: 8px;
    }

    .compact .avatar {
      width: 36px;
      height: 36px;
      font-size: 1rem;
    }

    .compact .user-name { font-size: 0.85rem; }
    .compact .user-email { display: none; }

    .compact .menu-item {
      padding: 8px;
      font-size: 0.85rem;
    }

    .compact .menu-item-icon {
      width: 28px;
      height: 28px;
      font-size: 0.85rem;
    }

    .hidden { display: none !important; }

    /* Loading */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1f2937;
        --bg-secondary: #374151;
        --text: #f9fafb;
        --text-secondary: #9ca3af;
        --border: #4b5563;
      }
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <!-- Loading -->
    <div id="loadingState" class="loading">
      <div class="spinner"></div>
    </div>

    <!-- Not Logged In -->
    <div id="loginState" class="login-state hidden">
      <div class="login-icon">👤</div>
      <p class="login-text">Sign in to access your account</p>
      <button class="btn-signin" id="signInBtn">
        Sign In
      </button>
    </div>

    <!-- Logged In -->
    <div id="loggedInState" class="hidden">
      <div class="account-header">
        <div class="avatar" id="avatar">?</div>
        <div class="user-info">
          <div class="user-name" id="userName">Customer</div>
          <div class="user-email" id="userEmail"></div>
        </div>
      </div>

      <div class="menu-list">
        <button class="menu-item" id="profileBtn">
          <div class="menu-item-icon">👤</div>
          <span class="menu-item-text">My Profile</span>
          <span class="menu-item-arrow">›</span>
        </button>

        <button class="menu-item" id="ordersBtn">
          <div class="menu-item-icon">📦</div>
          <span class="menu-item-text">Orders & Downloads</span>
          <span class="menu-item-arrow">›</span>
        </button>

        <button class="menu-item" id="subscriptionBtn">
          <div class="menu-item-icon">💳</div>
          <span class="menu-item-text">Subscription</span>
          <span class="sub-badge" id="subBadge">Free</span>
          <span class="menu-item-arrow">›</span>
        </button>

        <div class="menu-divider"></div>

        <button class="menu-item logout" id="logoutBtn">
          <div class="menu-item-icon">🚪</div>
          <span class="menu-item-text">Sign Out</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      let config = {};
      let customer = null;

      const container = document.getElementById('container');
      const loadingState = document.getElementById('loadingState');
      const loginState = document.getElementById('loginState');
      const loggedInState = document.getElementById('loggedInState');
      const ordersBtn = document.getElementById('ordersBtn');
      const subscriptionBtn = document.getElementById('subscriptionBtn');
      const profileBtn = document.getElementById('profileBtn');

      function showState(state) {
        [loadingState, loginState, loggedInState].forEach(s => s.classList.add('hidden'));
        state.classList.remove('hidden');
      }

      function applyConfig(cfg) {
        config = cfg;

        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent', cfg.accentColor);
        }

        container.classList.toggle('compact', cfg.compactMode === true);
        ordersBtn.classList.toggle('hidden', cfg.showOrders === false);
        subscriptionBtn.classList.toggle('hidden', cfg.showSubscription === false);
        profileBtn.classList.toggle('hidden', cfg.showProfile === false);
      }

      function setCustomer(cust) {
        customer = cust;

        if (!cust) {
          showState(loginState);
          return;
        }

        // Avatar
        const avatarEl = document.getElementById('avatar');
        if (cust.avatarUrl) {
          avatarEl.innerHTML = '<img src="' + cust.avatarUrl + '" alt="Avatar">';
        } else {
          avatarEl.textContent = (cust.name || cust.email || '?')[0].toUpperCase();
        }

        // Info
        document.getElementById('userName').textContent = cust.name || 'Customer';
        document.getElementById('userEmail').textContent = cust.email || '';

        // Subscription badge
        const subBadge = document.getElementById('subBadge');
        if (cust.subscription?.planName) {
          subBadge.textContent = cust.subscription.planName;
          subBadge.classList.remove('hidden');
        } else {
          subBadge.textContent = 'Free';
        }

        showState(loggedInState);
      }

      async function checkSession() {
        showState(loadingState);

        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) {
          showState(loginState);
          return;
        }

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/session', {
            headers: { 'X-Customer-Token': token }
          });
          const data = await res.json();

          if (data.success && data.session?.customer) {
            setCustomer(data.session.customer);
          } else {
            showState(loginState);
          }
        } catch (e) {
          showState(loginState);
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
        } catch (e) {}

        localStorage.removeItem('stickernest:customer_token');
        customer = null;
        showState(loginState);
        emitOutput('onLogoutClick', {});
      }

      function emitOutput(outputId, data) {
        window.parent.postMessage({ type: 'widget:output', outputId, data }, '*');
      }

      function navigate(target) {
        emitOutput('onNavigate', { target });
      }

      // Event listeners
      document.getElementById('signInBtn').onclick = () => {
        emitOutput('onSignInClick', {});
        navigate('signin');
      };

      profileBtn.onclick = () => {
        emitOutput('onProfileClick', {});
        navigate('profile');
      };

      ordersBtn.onclick = () => {
        emitOutput('onOrdersClick', {});
        navigate('orders');
      };

      subscriptionBtn.onclick = () => {
        emitOutput('onSubscriptionClick', {});
        navigate('subscription');
      };

      document.getElementById('logoutBtn').onclick = logout;

      // Widget API
      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            if (payload?.config) applyConfig(payload.config);
            checkSession();
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            break;

          case 'widget:input':
            if (payload?.portId === 'onLogin' && payload.value?.customer) {
              setCustomer(payload.value.customer);
            } else if (payload?.portId === 'onLogout') {
              customer = null;
              showState(loginState);
            } else if (payload?.portId === 'setExpanded') {
              // Could implement expand/collapse UI
            }
            break;
        }
      });

      // Listen for login changes
      window.addEventListener('storage', (e) => {
        if (e.key === 'stickernest:customer_token') {
          if (e.newValue) {
            checkSession();
          } else {
            customer = null;
            showState(loginState);
          }
        }
      });

      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const CustomerAccountMenuWidget: BuiltinWidget = {
  manifest: CustomerAccountMenuWidgetManifest,
  html: CustomerAccountMenuWidgetHTML,
};

export default CustomerAccountMenuWidget;
