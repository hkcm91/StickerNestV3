/**
 * StickerNest v2 - Storefront Layout Widget
 * A container widget that provides a complete storefront layout for white-label e-commerce.
 * Orchestrates commerce widgets (ProductGallery, CheckoutFlow, CustomerDashboard, CustomerLogin)
 * into a cohesive shopping experience.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const StorefrontLayoutWidgetManifest: WidgetManifest = {
  id: 'stickernest.storefront-layout',
  name: 'Storefront Layout',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Complete storefront layout container for white-label e-commerce storefronts',
  kind: 'container',
  category: 'commerce',
  tags: ['commerce', 'storefront', 'layout', 'container', 'shop', 'ecommerce', 'white-label'],
  icon: '🏪',

  defaultSize: { width: 1200, height: 800 },
  minSize: { width: 800, height: 600 },
  maxSize: { width: 1920, height: 1200 },

  // Pipeline inputs for external control
  inputs: [
    { id: 'setTheme', name: 'Set Theme', type: 'object', description: 'Apply custom theme colors' },
    { id: 'setMode', name: 'Set Mode', type: 'string', description: 'Switch mode: browse/cart/checkout/account' },
    { id: 'navigate', name: 'Navigate', type: 'string', description: 'Navigate to section: products/cart/account' },
    { id: 'addToCart', name: 'Add to Cart', type: 'object', description: 'Add product to cart from external source' },
    { id: 'customerLogin', name: 'Customer Login', type: 'object', description: 'Customer logged in event' },
  ],

  // Pipeline outputs for event handling
  outputs: [
    { id: 'onProductSelect', name: 'Product Selected', type: 'object', description: 'Product was selected for viewing' },
    { id: 'onAddToCart', name: 'Added to Cart', type: 'object', description: 'Product was added to cart' },
    { id: 'onCheckoutStart', name: 'Checkout Started', type: 'trigger', description: 'Customer started checkout' },
    { id: 'onCheckoutComplete', name: 'Checkout Complete', type: 'object', description: 'Purchase completed successfully' },
    { id: 'onCustomerLogin', name: 'Customer Logged In', type: 'object', description: 'Customer authentication success' },
    { id: 'onCustomerLogout', name: 'Customer Logged Out', type: 'trigger', description: 'Customer logged out' },
    { id: 'onModeChange', name: 'Mode Changed', type: 'string', description: 'Current mode changed' },
  ],

  config: {
    schema: {
      type: 'object',
      properties: {
        // Store Identity
        storeName: { type: 'string', default: 'My Store', title: 'Store Name' },
        storeLogo: { type: 'string', default: '', title: 'Logo URL' },
        storeTagline: { type: 'string', default: '', title: 'Tagline' },

        // Layout Options
        layout: {
          type: 'string',
          enum: ['standard', 'minimal', 'magazine', 'sidebar'],
          default: 'standard',
          title: 'Layout Style',
        },
        showHeader: { type: 'boolean', default: true, title: 'Show Header' },
        showCart: { type: 'boolean', default: true, title: 'Show Cart' },
        showFooter: { type: 'boolean', default: true, title: 'Show Footer' },

        // Theme Colors
        primaryColor: { type: 'string', default: '#8b5cf6', title: 'Primary Color' },
        secondaryColor: { type: 'string', default: '#06b6d4', title: 'Secondary Color' },
        backgroundColor: { type: 'string', default: '#ffffff', title: 'Background Color' },
        textColor: { type: 'string', default: '#1f2937', title: 'Text Color' },
        accentColor: { type: 'string', default: '#f59e0b', title: 'Accent Color' },

        // Product Display
        productsPerRow: { type: 'number', default: 3, minimum: 1, maximum: 6, title: 'Products Per Row' },
        productCardStyle: {
          type: 'string',
          enum: ['card', 'minimal', 'detailed', 'compact'],
          default: 'card',
          title: 'Product Card Style',
        },
        showPrices: { type: 'boolean', default: true, title: 'Show Prices' },
        showQuickBuy: { type: 'boolean', default: true, title: 'Show Quick Buy Button' },

        // Cart Behavior
        cartPosition: {
          type: 'string',
          enum: ['sidebar', 'dropdown', 'overlay', 'page'],
          default: 'sidebar',
          title: 'Cart Position',
        },
        showCartCount: { type: 'boolean', default: true, title: 'Show Cart Count Badge' },

        // Customer Account
        enableGuestCheckout: { type: 'boolean', default: true, title: 'Allow Guest Checkout' },
        showAccountMenu: { type: 'boolean', default: true, title: 'Show Account Menu' },
        requireLogin: { type: 'boolean', default: false, title: 'Require Login to Browse' },

        // Footer Options
        footerText: { type: 'string', default: '', title: 'Footer Text' },
        showPaymentIcons: { type: 'boolean', default: true, title: 'Show Payment Icons' },
        socialLinks: {
          type: 'object',
          default: {},
          title: 'Social Links',
          properties: {
            instagram: { type: 'string' },
            twitter: { type: 'string' },
            tiktok: { type: 'string' },
          },
        },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const StorefrontLayoutWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --primary: #8b5cf6;
      --secondary: #06b6d4;
      --bg: #ffffff;
      --text: #1f2937;
      --text-secondary: #6b7280;
      --accent: #f59e0b;
      --border: #e5e7eb;
      --success: #10b981;
      --error: #ef4444;
      --card-bg: #ffffff;
      --header-height: 64px;
      --sidebar-width: 320px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ========== HEADER ========== */
    .header {
      height: var(--header-height);
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-left { display: flex; align-items: center; gap: 16px; }

    .store-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: contain;
    }

    .store-logo-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.25rem;
    }

    .store-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
    }

    .store-tagline {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .header-right { display: flex; align-items: center; gap: 16px; }

    .nav-btn {
      padding: 8px 16px;
      background: transparent;
      border: none;
      color: var(--text);
      font-size: 0.9rem;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.2s;
    }

    .nav-btn:hover { background: var(--border); }
    .nav-btn.active { background: var(--primary); color: white; }

    .cart-btn {
      position: relative;
      padding: 8px 12px;
      background: var(--primary);
      border: none;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .cart-btn:hover { background: var(--secondary); }

    .cart-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 20px;
      height: 20px;
      background: var(--accent);
      border-radius: 50%;
      font-size: 0.7rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .account-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--border);
      border: none;
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }

    .account-btn.logged-in { background: var(--success); color: white; }

    /* ========== MAIN LAYOUT ========== */
    .main-container {
      flex: 1;
      display: flex;
      position: relative;
    }

    .content-area {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .content-area.with-sidebar { margin-right: var(--sidebar-width); }

    /* ========== PRODUCT GRID ========== */
    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 20px;
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(var(--cols, 3), 1fr);
      gap: 20px;
    }

    .product-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .product-image {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      background: var(--border);
    }

    .product-info { padding: 16px; }

    .product-name {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 4px;
    }

    .product-price {
      color: var(--primary);
      font-weight: 700;
      font-size: 1.1rem;
    }

    .product-actions { margin-top: 12px; display: flex; gap: 8px; }

    .quick-buy-btn {
      flex: 1;
      padding: 10px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .quick-buy-btn:hover { background: var(--secondary); }

    /* ========== CART SIDEBAR ========== */
    .cart-sidebar {
      width: var(--sidebar-width);
      position: fixed;
      right: 0;
      top: var(--header-height);
      bottom: 0;
      background: var(--card-bg);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s;
    }

    .cart-sidebar.open { transform: translateX(0); }

    .cart-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .cart-title { font-weight: 700; font-size: 1.1rem; }

    .close-cart {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: var(--text-secondary);
    }

    .cart-items {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .cart-item {
      display: flex;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }

    .cart-item-image {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      object-fit: cover;
      background: var(--border);
    }

    .cart-item-info { flex: 1; }
    .cart-item-name { font-weight: 500; margin-bottom: 4px; }
    .cart-item-price { color: var(--primary); font-weight: 600; }

    .cart-item-remove {
      background: none;
      border: none;
      color: var(--error);
      cursor: pointer;
      font-size: 0.8rem;
    }

    .cart-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
    }

    .cart-total {
      display: flex;
      justify-content: space-between;
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .checkout-btn {
      width: 100%;
      padding: 14px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .checkout-btn:hover { background: var(--secondary); }

    .cart-empty {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }

    /* ========== VIEW MODES ========== */
    .view { display: none; }
    .view.active { display: block; }

    /* ========== CHECKOUT VIEW ========== */
    .checkout-view {
      max-width: 600px;
      margin: 0 auto;
    }

    .checkout-header { text-align: center; margin-bottom: 32px; }
    .checkout-header h2 { font-size: 1.75rem; margin-bottom: 8px; }
    .checkout-header p { color: var(--text-secondary); }

    .checkout-summary {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .checkout-form {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
    }

    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-weight: 500; margin-bottom: 6px; }

    .form-input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary);
    }

    /* ========== ACCOUNT VIEW ========== */
    .account-view {
      max-width: 800px;
      margin: 0 auto;
    }

    .account-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
    }

    .account-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: white;
    }

    .orders-list {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    .order-item {
      padding: 20px;
      border-bottom: 1px solid var(--border);
    }

    .order-item:last-child { border-bottom: none; }

    .order-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .order-number { font-weight: 600; }

    .order-status {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .order-status.paid { background: rgba(16, 185, 129, 0.1); color: var(--success); }
    .order-status.pending { background: rgba(245, 158, 11, 0.1); color: var(--accent); }

    /* ========== LOGIN VIEW ========== */
    .login-view {
      max-width: 400px;
      margin: 40px auto;
      text-align: center;
    }

    .login-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
    }

    .login-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; }
    .login-subtitle { color: var(--text-secondary); margin-bottom: 24px; }

    /* ========== FOOTER ========== */
    .footer {
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      padding: 24px;
      text-align: center;
    }

    .footer-text { color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 12px; }

    .payment-icons {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .payment-icon {
      width: 48px;
      height: 30px;
      background: var(--border);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    .social-links { display: flex; justify-content: center; gap: 16px; }

    .social-link {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text);
      text-decoration: none;
      transition: background 0.2s;
    }

    .social-link:hover { background: var(--primary); color: white; }

    /* ========== LOADING & EMPTY STATES ========== */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px;
      color: var(--text-secondary);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 12px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }

    .empty-icon { font-size: 3rem; margin-bottom: 16px; }

    /* ========== RESPONSIVE ========== */
    @media (max-width: 1024px) {
      .product-grid { grid-template-columns: repeat(2, 1fr); }
      .cart-sidebar { width: 100%; }
      .content-area.with-sidebar { margin-right: 0; }
    }

    @media (max-width: 640px) {
      .header { padding: 0 16px; }
      .store-name { font-size: 1rem; }
      .product-grid { grid-template-columns: 1fr; }
      .content-area { padding: 16px; }
    }

    .hidden { display: none !important; }
  </style>
</head>
<body>
  <!-- Header -->
  <header class="header" id="header">
    <div class="header-left">
      <div class="store-logo-placeholder" id="logoPlaceholder">S</div>
      <img class="store-logo hidden" id="storeLogo" alt="Store Logo">
      <div>
        <div class="store-name" id="storeName">My Store</div>
        <div class="store-tagline" id="storeTagline"></div>
      </div>
    </div>
    <div class="header-right">
      <button class="nav-btn active" data-view="products">Products</button>
      <button class="nav-btn" data-view="account">Account</button>
      <button class="cart-btn" id="cartBtn">
        <span>Cart</span>
        <span class="cart-badge" id="cartBadge">0</span>
      </button>
      <button class="account-btn" id="accountBtn" title="Account">
        <span id="accountIcon">?</span>
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <div class="main-container">
    <div class="content-area" id="contentArea">
      <!-- Products View -->
      <div class="view active" id="productsView">
        <h2 class="section-title">Products</h2>
        <div class="product-grid" id="productGrid">
          <div class="loading"><div class="spinner"></div> Loading products...</div>
        </div>
      </div>

      <!-- Checkout View -->
      <div class="view" id="checkoutView">
        <div class="checkout-view">
          <div class="checkout-header">
            <h2>Checkout</h2>
            <p>Complete your purchase</p>
          </div>
          <div class="checkout-summary" id="checkoutSummary"></div>
          <div class="checkout-form">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="checkoutEmail" placeholder="your@email.com">
            </div>
            <button class="checkout-btn" id="proceedCheckoutBtn">Proceed to Payment</button>
          </div>
        </div>
      </div>

      <!-- Account View -->
      <div class="view" id="accountView">
        <div class="account-view">
          <div class="account-header" id="accountHeader">
            <div class="account-avatar" id="accountAvatar">?</div>
            <div>
              <h2 id="accountEmail">Not logged in</h2>
              <p id="accountName" class="text-secondary"></p>
            </div>
          </div>

          <!-- Login Form (shown when not logged in) -->
          <div class="login-card" id="loginCard">
            <h3 class="login-title">Sign In</h3>
            <p class="login-subtitle">Enter your email to receive a login link</p>
            <div class="form-group">
              <input type="email" class="form-input" id="loginEmail" placeholder="your@email.com">
            </div>
            <button class="checkout-btn" id="sendMagicLinkBtn">Send Login Link</button>
          </div>

          <!-- Orders (shown when logged in) -->
          <div class="hidden" id="ordersSection">
            <h3 class="section-title">Your Orders</h3>
            <div class="orders-list" id="ordersList">
              <div class="empty-state">
                <div class="empty-icon">📦</div>
                <p>No orders yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cart Sidebar -->
    <div class="cart-sidebar" id="cartSidebar">
      <div class="cart-header">
        <span class="cart-title">Shopping Cart</span>
        <button class="close-cart" id="closeCart">&times;</button>
      </div>
      <div class="cart-items" id="cartItems">
        <div class="cart-empty">
          <div class="empty-icon">🛒</div>
          <p>Your cart is empty</p>
        </div>
      </div>
      <div class="cart-footer">
        <div class="cart-total">
          <span>Total</span>
          <span id="cartTotal">$0.00</span>
        </div>
        <button class="checkout-btn" id="cartCheckoutBtn">Checkout</button>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="footer" id="footer">
    <p class="footer-text" id="footerText">Powered by StickerNest</p>
    <div class="payment-icons" id="paymentIcons">
      <div class="payment-icon">VISA</div>
      <div class="payment-icon">MC</div>
      <div class="payment-icon">AMEX</div>
    </div>
    <div class="social-links" id="socialLinks"></div>
  </footer>

  <script>
    (function() {
      // State
      let config = {};
      let cart = [];
      let products = [];
      let customer = null;
      let orders = [];
      let currentView = 'products';
      let creatorId = '';
      let canvasId = '';

      // DOM Elements
      const elements = {
        header: document.getElementById('header'),
        storeName: document.getElementById('storeName'),
        storeTagline: document.getElementById('storeTagline'),
        storeLogo: document.getElementById('storeLogo'),
        logoPlaceholder: document.getElementById('logoPlaceholder'),
        cartBtn: document.getElementById('cartBtn'),
        cartBadge: document.getElementById('cartBadge'),
        cartSidebar: document.getElementById('cartSidebar'),
        closeCart: document.getElementById('closeCart'),
        cartItems: document.getElementById('cartItems'),
        cartTotal: document.getElementById('cartTotal'),
        cartCheckoutBtn: document.getElementById('cartCheckoutBtn'),
        productGrid: document.getElementById('productGrid'),
        accountBtn: document.getElementById('accountBtn'),
        accountIcon: document.getElementById('accountIcon'),
        footer: document.getElementById('footer'),
        footerText: document.getElementById('footerText'),
        paymentIcons: document.getElementById('paymentIcons'),
        socialLinks: document.getElementById('socialLinks'),
        // Views
        productsView: document.getElementById('productsView'),
        checkoutView: document.getElementById('checkoutView'),
        accountView: document.getElementById('accountView'),
        // Account
        loginCard: document.getElementById('loginCard'),
        ordersSection: document.getElementById('ordersSection'),
        loginEmail: document.getElementById('loginEmail'),
        sendMagicLinkBtn: document.getElementById('sendMagicLinkBtn'),
        accountEmail: document.getElementById('accountEmail'),
        accountAvatar: document.getElementById('accountAvatar'),
        ordersList: document.getElementById('ordersList'),
        // Checkout
        checkoutEmail: document.getElementById('checkoutEmail'),
        proceedCheckoutBtn: document.getElementById('proceedCheckoutBtn'),
        checkoutSummary: document.getElementById('checkoutSummary'),
        contentArea: document.getElementById('contentArea'),
      };

      // Utility: Format price
      function formatPrice(cents) {
        return '$' + (cents / 100).toFixed(2);
      }

      // Apply configuration
      function applyConfig(cfg) {
        config = { ...config, ...cfg };

        // Store identity
        elements.storeName.textContent = cfg.storeName || 'My Store';
        elements.storeTagline.textContent = cfg.storeTagline || '';
        elements.logoPlaceholder.textContent = (cfg.storeName || 'S')[0].toUpperCase();

        if (cfg.storeLogo) {
          elements.storeLogo.src = cfg.storeLogo;
          elements.storeLogo.classList.remove('hidden');
          elements.logoPlaceholder.classList.add('hidden');
        }

        // Theme colors
        if (cfg.primaryColor) document.documentElement.style.setProperty('--primary', cfg.primaryColor);
        if (cfg.secondaryColor) document.documentElement.style.setProperty('--secondary', cfg.secondaryColor);
        if (cfg.backgroundColor) document.documentElement.style.setProperty('--bg', cfg.backgroundColor);
        if (cfg.textColor) document.documentElement.style.setProperty('--text', cfg.textColor);
        if (cfg.accentColor) document.documentElement.style.setProperty('--accent', cfg.accentColor);

        // Layout options
        if (!cfg.showHeader) elements.header.classList.add('hidden');
        if (!cfg.showFooter) elements.footer.classList.add('hidden');
        if (!cfg.showPaymentIcons) elements.paymentIcons.classList.add('hidden');

        // Product grid columns
        if (cfg.productsPerRow) {
          document.documentElement.style.setProperty('--cols', cfg.productsPerRow);
        }

        // Footer
        if (cfg.footerText) elements.footerText.textContent = cfg.footerText;

        // Social links
        if (cfg.socialLinks) {
          renderSocialLinks(cfg.socialLinks);
        }
      }

      // Render social links
      function renderSocialLinks(links) {
        elements.socialLinks.innerHTML = '';
        const icons = { instagram: '📷', twitter: '𝕏', tiktok: '🎵' };
        Object.entries(links).forEach(([platform, url]) => {
          if (url) {
            const a = document.createElement('a');
            a.className = 'social-link';
            a.href = url;
            a.target = '_blank';
            a.textContent = icons[platform] || '🔗';
            elements.socialLinks.appendChild(a);
          }
        });
      }

      // Render products
      function renderProducts() {
        if (!products.length) {
          elements.productGrid.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>No products available</p></div>';
          return;
        }

        elements.productGrid.innerHTML = products.map(p => \`
          <div class="product-card" data-product-id="\${p.id}">
            <img class="product-image" src="\${p.imageUrl || ''}" alt="\${p.name}" onerror="this.style.background='var(--border)'">
            <div class="product-info">
              <div class="product-name">\${p.name}</div>
              \${config.showPrices !== false ? \`<div class="product-price">\${formatPrice(p.priceCents)}</div>\` : ''}
              \${config.showQuickBuy !== false ? \`
                <div class="product-actions">
                  <button class="quick-buy-btn" data-action="buy" data-product-id="\${p.id}">Add to Cart</button>
                </div>
              \` : ''}
            </div>
          </div>
        \`).join('');
      }

      // Render cart
      function renderCart() {
        elements.cartBadge.textContent = cart.length;

        if (!cart.length) {
          elements.cartItems.innerHTML = '<div class="cart-empty"><div class="empty-icon">🛒</div><p>Your cart is empty</p></div>';
          elements.cartTotal.textContent = '$0.00';
          return;
        }

        const total = cart.reduce((sum, item) => sum + item.priceCents, 0);
        elements.cartTotal.textContent = formatPrice(total);

        elements.cartItems.innerHTML = cart.map((item, i) => \`
          <div class="cart-item">
            <img class="cart-item-image" src="\${item.imageUrl || ''}" alt="\${item.name}">
            <div class="cart-item-info">
              <div class="cart-item-name">\${item.name}</div>
              <div class="cart-item-price">\${formatPrice(item.priceCents)}</div>
            </div>
            <button class="cart-item-remove" data-action="remove" data-index="\${i}">&times;</button>
          </div>
        \`).join('');
      }

      // Render orders
      function renderOrders() {
        if (!orders.length) {
          elements.ordersList.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>No orders yet</p></div>';
          return;
        }

        elements.ordersList.innerHTML = orders.map(o => \`
          <div class="order-item">
            <div class="order-header">
              <span class="order-number">\${o.orderNumber}</span>
              <span class="order-status \${o.status}">\${o.status}</span>
            </div>
            <div>
              <strong>\${formatPrice(o.totalCents)}</strong>
              <span style="color:var(--text-secondary);margin-left:8px">\${new Date(o.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        \`).join('');
      }

      // Switch view
      function switchView(view) {
        currentView = view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        const viewEl = document.getElementById(view + 'View');
        if (viewEl) viewEl.classList.add('active');

        const navBtn = document.querySelector(\`[data-view="\${view}"]\`);
        if (navBtn) navBtn.classList.add('active');

        emit('onModeChange', view);
      }

      // Toggle cart
      function toggleCart(show) {
        if (show === undefined) {
          elements.cartSidebar.classList.toggle('open');
        } else {
          elements.cartSidebar.classList.toggle('open', show);
        }
        elements.contentArea.classList.toggle('with-sidebar', elements.cartSidebar.classList.contains('open'));
      }

      // Add to cart
      function addToCart(product) {
        cart.push(product);
        renderCart();
        toggleCart(true);
        emit('onAddToCart', product);
      }

      // Remove from cart
      function removeFromCart(index) {
        cart.splice(index, 1);
        renderCart();
      }

      // Start checkout
      function startCheckout() {
        if (!cart.length) return;

        // Render checkout summary
        const total = cart.reduce((sum, item) => sum + item.priceCents, 0);
        elements.checkoutSummary.innerHTML = \`
          <h4>Order Summary</h4>
          \${cart.map(item => \`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <span>\${item.name}</span>
              <span>\${formatPrice(item.priceCents)}</span>
            </div>
          \`).join('')}
          <div style="display:flex;justify-content:space-between;padding:12px 0;font-weight:700">
            <span>Total</span>
            <span>\${formatPrice(total)}</span>
          </div>
        \`;

        toggleCart(false);
        switchView('checkout');
        emit('onCheckoutStart', { items: cart, total });
      }

      // Emit output to parent
      function emit(outputId, data) {
        window.parent.postMessage({
          type: 'widget:output',
          outputId,
          data
        }, '*');
      }

      // Fetch products
      async function fetchProducts() {
        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(\`\${apiBase}/commerce/canvas/\${canvasId}/products\`);
          const data = await res.json();
          if (data.success && data.products) {
            products = data.products;
            renderProducts();
          }
        } catch (e) {
          console.error('Failed to fetch products:', e);
          elements.productGrid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load products</p></div>';
        }
      }

      // Fetch customer session
      async function checkSession() {
        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) return;

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(\`\${apiBase}/commerce/customer/session\`, {
            headers: { 'X-Customer-Token': token }
          });
          const data = await res.json();
          if (data.success && data.session?.customer) {
            customer = data.session.customer;
            updateCustomerUI();
            fetchOrders();
          }
        } catch (e) {
          console.error('Session check failed:', e);
        }
      }

      // Fetch orders
      async function fetchOrders() {
        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) return;

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(\`\${apiBase}/commerce/customer/orders\`, {
            headers: { 'X-Customer-Token': token }
          });
          const data = await res.json();
          if (data.success && data.orders) {
            orders = data.orders;
            renderOrders();
          }
        } catch (e) {
          console.error('Failed to fetch orders:', e);
        }
      }

      // Update customer UI
      function updateCustomerUI() {
        if (customer) {
          elements.accountBtn.classList.add('logged-in');
          elements.accountIcon.textContent = (customer.name || customer.email)[0].toUpperCase();
          elements.accountEmail.textContent = customer.email;
          elements.accountAvatar.textContent = (customer.name || customer.email)[0].toUpperCase();
          elements.loginCard.classList.add('hidden');
          elements.ordersSection.classList.remove('hidden');
        } else {
          elements.accountBtn.classList.remove('logged-in');
          elements.accountIcon.textContent = '?';
          elements.accountEmail.textContent = 'Not logged in';
          elements.accountAvatar.textContent = '?';
          elements.loginCard.classList.remove('hidden');
          elements.ordersSection.classList.add('hidden');
        }
      }

      // Send magic link
      async function sendMagicLink(email) {
        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(\`\${apiBase}/commerce/customer/magic-link\`, {
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
            alert('Check your email for the login link!');
          } else {
            alert(data.error?.message || 'Failed to send login link');
          }
        } catch (e) {
          alert('Network error. Please try again.');
        }
      }

      // Event listeners
      elements.cartBtn.addEventListener('click', () => toggleCart());
      elements.closeCart.addEventListener('click', () => toggleCart(false));
      elements.cartCheckoutBtn.addEventListener('click', startCheckout);

      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
      });

      elements.accountBtn.addEventListener('click', () => switchView('account'));

      elements.productGrid.addEventListener('click', (e) => {
        const buyBtn = e.target.closest('[data-action="buy"]');
        if (buyBtn) {
          const productId = buyBtn.dataset.productId;
          const product = products.find(p => p.id === productId);
          if (product) addToCart(product);
          return;
        }

        const card = e.target.closest('.product-card');
        if (card) {
          const productId = card.dataset.productId;
          const product = products.find(p => p.id === productId);
          if (product) emit('onProductSelect', product);
        }
      });

      elements.cartItems.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-action="remove"]');
        if (removeBtn) {
          removeFromCart(parseInt(removeBtn.dataset.index));
        }
      });

      elements.sendMagicLinkBtn.addEventListener('click', () => {
        const email = elements.loginEmail.value.trim();
        if (email) sendMagicLink(email);
      });

      elements.proceedCheckoutBtn.addEventListener('click', async () => {
        if (!cart.length) return;

        const email = elements.checkoutEmail.value.trim();
        if (!email) {
          alert('Please enter your email');
          return;
        }

        // Create checkout with Stripe
        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          // For simplicity, just checkout the first item (real implementation would handle cart)
          const res = await fetch(\`\${apiBase}/commerce/products/\${cart[0].id}/checkout\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerEmail: email })
          });
          const data = await res.json();
          if (data.success && data.url) {
            window.location.href = data.url;
          } else {
            alert(data.error?.message || 'Checkout failed');
          }
        } catch (e) {
          alert('Network error. Please try again.');
        }
      });

      // Message handler
      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            creatorId = payload?.creatorId || '';
            canvasId = payload?.canvasId || '';
            if (payload?.config) applyConfig(payload.config);
            if (canvasId) fetchProducts();
            checkSession();
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            break;

          case 'widget:input':
            const { inputId, data } = payload || {};
            switch (inputId) {
              case 'setTheme':
                applyConfig(data);
                break;
              case 'setMode':
                switchView(data);
                break;
              case 'navigate':
                switchView(data);
                break;
              case 'addToCart':
                if (data) addToCart(data);
                break;
              case 'customerLogin':
                customer = data;
                updateCustomerUI();
                fetchOrders();
                emit('onCustomerLogin', customer);
                break;
            }
            break;
        }
      });

      // Listen for customer login from storage event
      window.addEventListener('storage', (e) => {
        if (e.key === 'stickernest:customer_token' && e.newValue) {
          checkSession().then(() => {
            if (customer) emit('onCustomerLogin', customer);
          });
        }
      });

      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const StorefrontLayoutWidget: BuiltinWidget = {
  manifest: StorefrontLayoutWidgetManifest,
  html: StorefrontLayoutWidgetHTML,
};

export default StorefrontLayoutWidget;
