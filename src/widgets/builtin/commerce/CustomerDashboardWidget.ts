/**
 * StickerNest v2 - Customer Dashboard Widget
 * Shows customer's orders, downloads, and account info
 * Connects to CustomerLogin widget via pipeline
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const CustomerDashboardWidgetManifest: WidgetManifest = {
  id: 'stickernest.customer-dashboard',
  name: 'Customer Dashboard',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Displays customer orders and downloads - connect to login via pipeline',
  kind: 'interactive',
  category: 'commerce',
  tags: ['dashboard', 'orders', 'downloads', 'account', 'commerce', 'pipeline'],
  icon: '📋',

  defaultSize: { width: 500, height: 450 },
  minSize: { width: 350, height: 300 },
  maxSize: { width: 800, height: 700 },

  inputs: [
    { id: 'onLogin', name: 'On Login', type: 'object', description: 'Triggered when customer logs in' },
    { id: 'onPurchase', name: 'On Purchase', type: 'object', description: 'Triggered when new purchase made' },
    { id: 'refresh', name: 'Refresh', type: 'trigger', description: 'Reload orders' },
  ],
  outputs: [
    { id: 'onDownload', name: 'Download Clicked', type: 'object', description: 'Emits download info' },
    { id: 'onOrderSelect', name: 'Order Selected', type: 'object', description: 'Emits selected order' },
  ],

  io: {
    inputs: ['auth.login', 'purchase.complete', 'trigger.refresh'],
    outputs: ['download.clicked', 'order.selected'],
  },

  config: {
    schema: {
      type: 'object',
      properties: {
        showAvatar: { type: 'boolean', default: true, title: 'Show Avatar' },
        showDownloads: { type: 'boolean', default: true, title: 'Show Downloads' },
        emptyMessage: { type: 'string', default: 'No orders yet', title: 'Empty Message' },
        accentColor: { type: 'string', default: '#8b5cf6', title: 'Accent Color' },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const CustomerDashboardWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --accent: #8b5cf6;
      --accent-hover: #7c3aed;
      --bg: #ffffff;
      --bg-card: #f9fafb;
      --text: #1f2937;
      --text-secondary: #6b7280;
      --border: #e5e7eb;
      --success: #10b981;
      --warning: #f59e0b;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 20px;
      min-height: 100vh;
    }

    .state { display: none; }
    .state.active { display: block; }

    /* Not Logged In */
    .login-prompt {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }

    .login-prompt-icon { font-size: 3rem; margin-bottom: 12px; }
    .login-prompt-text { margin-bottom: 16px; }

    /* Header */
    .dashboard-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }

    .user-avatar {
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
    }

    .user-info { flex: 1; }
    .user-name { font-weight: 600; }
    .user-email { font-size: 0.875rem; color: var(--text-secondary); }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: var(--bg-card);
      padding: 4px;
      border-radius: 8px;
    }

    .tab {
      flex: 1;
      padding: 10px 16px;
      font-size: 0.9rem;
      font-weight: 500;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all 0.2s;
    }

    .tab.active {
      background: white;
      color: var(--text);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* Orders List */
    .orders-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .order-card {
      background: var(--bg-card);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      gap: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .order-card:hover { background: #f3f4f6; }

    .order-image {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      object-fit: cover;
      background: #e5e7eb;
    }

    .order-image.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .order-info { flex: 1; min-width: 0; }
    .order-product { font-weight: 600; margin-bottom: 2px; }
    .order-number { font-size: 0.8rem; color: var(--text-secondary); }
    .order-date { font-size: 0.8rem; color: var(--text-secondary); }

    .order-right { text-align: right; }

    .order-price { font-weight: 600; margin-bottom: 4px; }

    .order-status {
      display: inline-block;
      padding: 3px 8px;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 4px;
    }

    .order-status.paid {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
    }

    .order-status.pending {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning);
    }

    /* Downloads */
    .download-card {
      background: var(--bg-card);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .download-icon {
      width: 48px;
      height: 48px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .download-info { flex: 1; }
    .download-name { font-weight: 600; margin-bottom: 2px; }
    .download-meta { font-size: 0.8rem; color: var(--text-secondary); }

    .download-btn {
      padding: 8px 16px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .download-btn:hover { background: var(--accent-hover); }

    /* Empty */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }

    /* Loading */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --bg-card: #1f2937;
        --text: #f9fafb;
        --text-secondary: #9ca3af;
        --border: #374151;
      }
      .tab.active { background: #374151; }
      .order-card:hover { background: #374151; }
    }
  </style>
</head>
<body>
  <!-- Not Logged In -->
  <div id="loginPrompt" class="state active">
    <div class="login-prompt">
      <div class="login-prompt-icon">👤</div>
      <p class="login-prompt-text">Sign in to view your orders and downloads</p>
    </div>
  </div>

  <!-- Loading -->
  <div id="loadingState" class="state">
    <div class="loading"><div class="spinner"></div></div>
  </div>

  <!-- Dashboard -->
  <div id="dashboardState" class="state">
    <div class="dashboard-header" id="headerSection">
      <div class="user-avatar" id="userAvatar">?</div>
      <div class="user-info">
        <div class="user-name" id="userName">Customer</div>
        <div class="user-email" id="userEmail"></div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="orders">Orders</button>
      <button class="tab" data-tab="downloads">Downloads</button>
    </div>

    <div id="ordersTab" class="tab-content">
      <div id="ordersList" class="orders-list"></div>
      <div id="ordersEmpty" class="empty-state" style="display:none">No orders yet</div>
    </div>

    <div id="downloadsTab" class="tab-content" style="display:none">
      <div id="downloadsList" class="orders-list"></div>
      <div id="downloadsEmpty" class="empty-state" style="display:none">No downloads available</div>
    </div>
  </div>

  <script>
    (function() {
      let config = {};
      let customer = null;
      let orders = [];

      const loginPrompt = document.getElementById('loginPrompt');
      const loadingState = document.getElementById('loadingState');
      const dashboardState = document.getElementById('dashboardState');
      const headerSection = document.getElementById('headerSection');
      const userAvatar = document.getElementById('userAvatar');
      const userName = document.getElementById('userName');
      const userEmail = document.getElementById('userEmail');
      const ordersTab = document.getElementById('ordersTab');
      const downloadsTab = document.getElementById('downloadsTab');
      const ordersList = document.getElementById('ordersList');
      const ordersEmpty = document.getElementById('ordersEmpty');
      const downloadsList = document.getElementById('downloadsList');
      const downloadsEmpty = document.getElementById('downloadsEmpty');
      const tabs = document.querySelectorAll('.tab');

      function showState(state) {
        [loginPrompt, loadingState, dashboardState].forEach(s => s.classList.remove('active'));
        state.classList.add('active');
      }

      function applyConfig(cfg) {
        config = cfg;
        headerSection.style.display = cfg.showAvatar !== false ? 'flex' : 'none';
        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent', cfg.accentColor);
        }
      }

      function formatPrice(cents) {
        return '$' + (cents / 100).toFixed(2);
      }

      function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      function setCustomer(c) {
        customer = c;
        if (!c) {
          showState(loginPrompt);
          return;
        }

        userAvatar.textContent = (c.name || c.email || '?')[0].toUpperCase();
        userName.textContent = c.name || 'Customer';
        userEmail.textContent = c.email || '';

        loadOrders();
      }

      async function loadOrders() {
        showState(loadingState);

        try {
          const token = localStorage.getItem('stickernest:customer_token');
          if (!token) {
            showState(loginPrompt);
            return;
          }

          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/orders', {
            headers: { 'X-Customer-Token': token }
          });

          const data = await res.json();

          if (data.orders) {
            orders = data.orders;
            renderOrders();
            showState(dashboardState);
          } else {
            showState(loginPrompt);
          }
        } catch (e) {
          console.error('Failed to load orders:', e);
          showState(loginPrompt);
        }
      }

      function renderOrders() {
        if (orders.length === 0) {
          ordersList.innerHTML = '';
          ordersEmpty.textContent = config.emptyMessage || 'No orders yet';
          ordersEmpty.style.display = 'block';
        } else {
          ordersEmpty.style.display = 'none';
          ordersList.innerHTML = orders.map(order => \`
            <div class="order-card" data-order-id="\${order.id}">
              \${order.productImage
                ? '<img class="order-image" src="' + order.productImage + '" alt="' + order.productName + '">'
                : '<div class="order-image placeholder">📦</div>'
              }
              <div class="order-info">
                <div class="order-product">\${order.productName}</div>
                <div class="order-number">\${order.orderNumber}</div>
                <div class="order-date">\${formatDate(order.createdAt)}</div>
              </div>
              <div class="order-right">
                <div class="order-price">\${formatPrice(order.amountCents)}</div>
                <span class="order-status \${order.status}">\${order.status}</span>
              </div>
            </div>
          \`).join('');
        }

        // Downloads tab
        const downloads = orders.filter(o => o.status === 'paid' && o.downloadUrl);
        if (downloads.length === 0 || config.showDownloads === false) {
          downloadsList.innerHTML = '';
          downloadsEmpty.style.display = 'block';
        } else {
          downloadsEmpty.style.display = 'none';
          downloadsList.innerHTML = downloads.map(order => \`
            <div class="download-card">
              <div class="download-icon">📥</div>
              <div class="download-info">
                <div class="download-name">\${order.productName}</div>
                <div class="download-meta">Purchased \${formatDate(order.createdAt)}</div>
              </div>
              <button class="download-btn" data-url="\${order.downloadUrl}" data-order-id="\${order.id}">
                Download
              </button>
            </div>
          \`).join('');
        }

        // Event listeners
        ordersList.querySelectorAll('.order-card').forEach(card => {
          card.onclick = () => {
            const orderId = card.dataset.orderId;
            const order = orders.find(o => o.id === orderId);
            if (order) {
              window.parent.postMessage({
                type: 'widget:output',
                outputId: 'onOrderSelect',
                data: order
              }, '*');
            }
          };
        });

        downloadsList.querySelectorAll('.download-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            const orderId = btn.dataset.orderId;
            const order = orders.find(o => o.id === orderId);

            window.open(url, '_blank');

            window.parent.postMessage({
              type: 'widget:output',
              outputId: 'onDownload',
              data: { url, order }
            }, '*');
          };
        });
      }

      // Tab switching
      tabs.forEach(tab => {
        tab.onclick = () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          const tabName = tab.dataset.tab;
          ordersTab.style.display = tabName === 'orders' ? 'block' : 'none';
          downloadsTab.style.display = tabName === 'downloads' ? 'block' : 'none';
        };
      });

      // Check for existing session
      async function checkSession() {
        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) {
          showState(loginPrompt);
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
            showState(loginPrompt);
          }
        } catch {
          showState(loginPrompt);
        }
      }

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
            } else if (payload?.portId === 'onPurchase') {
              loadOrders(); // Refresh on new purchase
            } else if (payload?.portId === 'refresh') {
              loadOrders();
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
            orders = [];
            showState(loginPrompt);
          }
        }
      });

      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const CustomerDashboardWidget: BuiltinWidget = {
  manifest: CustomerDashboardWidgetManifest,
  html: CustomerDashboardWidgetHTML,
};

export default CustomerDashboardWidget;
