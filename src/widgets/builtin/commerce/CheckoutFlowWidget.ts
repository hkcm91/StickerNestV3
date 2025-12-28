/**
 * StickerNest v2 - Checkout Flow Widget
 * Handles Stripe checkout process - receives product via pipeline
 * Emits purchase completion for downstream widgets
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const CheckoutFlowWidgetManifest: WidgetManifest = {
  id: 'stickernest.checkout-flow',
  name: 'Checkout Flow',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Handles payment checkout - connect to ProductGallery via pipeline',
  kind: 'interactive',
  category: 'commerce',
  tags: ['checkout', 'payment', 'stripe', 'commerce', 'pipeline'],
  icon: '💳',

  defaultSize: { width: 380, height: 450 },
  minSize: { width: 320, height: 400 },
  maxSize: { width: 500, height: 600 },

  inputs: [
    { id: 'product', name: 'Product', type: 'object', description: 'Product to purchase (from ProductGallery)' },
    { id: 'reset', name: 'Reset', type: 'trigger', description: 'Reset to initial state' },
  ],
  outputs: [
    { id: 'onCheckoutStart', name: 'Checkout Started', type: 'object', description: 'Emits when checkout begins' },
    { id: 'onPurchaseComplete', name: 'Purchase Complete', type: 'object', description: 'Emits order data on success' },
    { id: 'onCheckoutCancel', name: 'Checkout Cancelled', type: 'trigger', description: 'Emits when user cancels' },
    { id: 'onError', name: 'Error', type: 'string', description: 'Emits error message' },
  ],

  io: {
    inputs: ['product.set', 'trigger.reset'],
    outputs: ['checkout.started', 'purchase.complete', 'checkout.cancelled', 'error.message'],
  },

  config: {
    schema: {
      type: 'object',
      properties: {
        collectEmail: { type: 'boolean', default: true, title: 'Collect Email' },
        collectName: { type: 'boolean', default: false, title: 'Collect Name' },
        termsUrl: { type: 'string', default: '', title: 'Terms URL' },
        successMessage: { type: 'string', default: 'Thank you for your purchase!', title: 'Success Message' },
        accentColor: { type: 'string', default: '#8b5cf6', title: 'Accent Color' },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const CheckoutFlowWidgetHTML = `
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
      --text: #1f2937;
      --text-secondary: #6b7280;
      --border: #e5e7eb;
      --input-bg: #f9fafb;
      --success: #10b981;
      --error: #ef4444;
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

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }

    .empty-icon { font-size: 3rem; margin-bottom: 12px; }
    .empty-text { font-size: 0.95rem; }

    /* Product Preview */
    .product-preview {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: var(--input-bg);
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .preview-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      object-fit: cover;
      background: #e5e7eb;
    }

    .preview-image.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }

    .preview-info { flex: 1; }
    .preview-name { font-weight: 600; margin-bottom: 4px; }
    .preview-price { font-size: 1.25rem; font-weight: 700; color: var(--accent); }

    /* Form */
    .form-group { margin-bottom: 16px; }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 12px 14px;
      font-size: 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--input-bg);
      color: var(--text);
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .terms-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 16px 0;
    }

    .terms-checkbox input {
      margin-top: 3px;
      width: 18px;
      height: 18px;
      accent-color: var(--accent);
    }

    .terms-text {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .terms-text a { color: var(--accent); }

    .checkout-btn {
      width: 100%;
      padding: 14px 20px;
      font-size: 1rem;
      font-weight: 600;
      color: white;
      background: var(--accent);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .checkout-btn:hover:not(:disabled) { background: var(--accent-hover); }
    .checkout-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .checkout-btn .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .secure-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 12px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    /* Success State */
    .success-state { text-align: center; padding: 40px 20px; }
    .success-icon {
      width: 80px;
      height: 80px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 2.5rem;
    }
    .success-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; }
    .success-message { color: var(--text-secondary); margin-bottom: 20px; }
    .order-number { font-family: monospace; color: var(--accent); font-weight: 600; }

    .download-btn {
      display: inline-block;
      padding: 12px 24px;
      background: var(--success);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      margin-top: 16px;
    }

    /* Error */
    .error-message {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.9rem;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --text: #f9fafb;
        --text-secondary: #9ca3af;
        --border: #374151;
        --input-bg: #1f2937;
      }
    }
  </style>
</head>
<body>
  <!-- Empty State -->
  <div id="emptyState" class="state active">
    <div class="empty-state">
      <div class="empty-icon">🛒</div>
      <p class="empty-text">Select a product to checkout</p>
    </div>
  </div>

  <!-- Checkout Form -->
  <div id="checkoutState" class="state">
    <div class="product-preview" id="productPreview"></div>
    <div id="errorMessage" class="error-message" style="display:none"></div>
    <form id="checkoutForm">
      <div class="form-group" id="emailGroup">
        <label class="form-label">Email</label>
        <input type="email" id="emailInput" class="form-input" placeholder="you@example.com" required>
      </div>
      <div class="form-group" id="nameGroup" style="display:none">
        <label class="form-label">Name</label>
        <input type="text" id="nameInput" class="form-input" placeholder="Your name">
      </div>
      <div class="terms-checkbox" id="termsGroup" style="display:none">
        <input type="checkbox" id="termsCheck" required>
        <label class="terms-text" for="termsCheck">
          I agree to the <a href="#" id="termsLink" target="_blank">terms and conditions</a>
        </label>
      </div>
      <button type="submit" class="checkout-btn" id="checkoutBtn">
        <span id="btnText">Proceed to Payment</span>
        <div class="spinner" id="btnSpinner" style="display:none"></div>
      </button>
      <div class="secure-badge">🔒 Secure checkout powered by Stripe</div>
    </form>
  </div>

  <!-- Success State -->
  <div id="successState" class="state">
    <div class="success-state">
      <div class="success-icon">✅</div>
      <h2 class="success-title">Purchase Complete!</h2>
      <p class="success-message" id="successMessage">Thank you for your purchase!</p>
      <p>Order: <span class="order-number" id="orderNumber"></span></p>
      <a href="#" id="downloadBtn" class="download-btn" style="display:none">Download Now</a>
    </div>
  </div>

  <script>
    (function() {
      let config = {};
      let product = null;
      let isProcessing = false;

      const emptyState = document.getElementById('emptyState');
      const checkoutState = document.getElementById('checkoutState');
      const successState = document.getElementById('successState');
      const productPreview = document.getElementById('productPreview');
      const checkoutForm = document.getElementById('checkoutForm');
      const emailInput = document.getElementById('emailInput');
      const nameInput = document.getElementById('nameInput');
      const emailGroup = document.getElementById('emailGroup');
      const nameGroup = document.getElementById('nameGroup');
      const termsGroup = document.getElementById('termsGroup');
      const termsLink = document.getElementById('termsLink');
      const termsCheck = document.getElementById('termsCheck');
      const checkoutBtn = document.getElementById('checkoutBtn');
      const btnText = document.getElementById('btnText');
      const btnSpinner = document.getElementById('btnSpinner');
      const errorMessage = document.getElementById('errorMessage');
      const successMessage = document.getElementById('successMessage');
      const orderNumber = document.getElementById('orderNumber');
      const downloadBtn = document.getElementById('downloadBtn');

      function showState(state) {
        [emptyState, checkoutState, successState].forEach(s => s.classList.remove('active'));
        state.classList.add('active');
      }

      function applyConfig(cfg) {
        config = cfg;

        emailGroup.style.display = cfg.collectEmail !== false ? 'block' : 'none';
        nameGroup.style.display = cfg.collectName ? 'block' : 'none';

        if (cfg.termsUrl) {
          termsGroup.style.display = 'flex';
          termsLink.href = cfg.termsUrl;
        } else {
          termsGroup.style.display = 'none';
        }

        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent', cfg.accentColor);
        }
      }

      function formatPrice(cents) {
        return '$' + (cents / 100).toFixed(2);
      }

      function setProduct(p) {
        product = p;

        if (!p) {
          showState(emptyState);
          return;
        }

        productPreview.innerHTML = \`
          \${p.imageUrl
            ? '<img class="preview-image" src="' + p.imageUrl + '" alt="' + p.name + '">'
            : '<div class="preview-image placeholder">📦</div>'
          }
          <div class="preview-info">
            <div class="preview-name">\${p.name}</div>
            <div class="preview-price">\${formatPrice(p.priceCents)}</div>
          </div>
        \`;

        showState(checkoutState);
        errorMessage.style.display = 'none';
      }

      function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
      }

      async function startCheckout() {
        if (isProcessing || !product) return;

        isProcessing = true;
        checkoutBtn.disabled = true;
        btnText.textContent = 'Processing...';
        btnSpinner.style.display = 'block';
        errorMessage.style.display = 'none';

        const payload = {
          customerEmail: emailInput.value.trim() || undefined,
          customerName: nameInput.value.trim() || undefined,
        };

        window.parent.postMessage({
          type: 'widget:output',
          outputId: 'onCheckoutStart',
          data: { product, ...payload }
        }, '*');

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/products/' + product.id + '/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = await res.json();

          if (data.url) {
            // Redirect to Stripe
            window.open(data.url, '_blank');

            // Poll for completion
            pollForCompletion(data.sessionId);
          } else {
            throw new Error(data.error?.message || 'Checkout failed');
          }
        } catch (e) {
          showError(e.message);
          window.parent.postMessage({
            type: 'widget:output',
            outputId: 'onError',
            data: e.message
          }, '*');
        } finally {
          isProcessing = false;
          checkoutBtn.disabled = false;
          btnText.textContent = 'Proceed to Payment';
          btnSpinner.style.display = 'none';
        }
      }

      async function pollForCompletion(sessionId) {
        const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes

        const poll = async () => {
          if (attempts++ >= maxAttempts) return;

          try {
            const res = await fetch(apiBase + '/commerce/checkout/success?session_id=' + sessionId);
            const data = await res.json();

            if (data.success && data.order?.status === 'paid') {
              showSuccess(data.order);
              return;
            }
          } catch {}

          setTimeout(poll, 5000);
        };

        poll();
      }

      function showSuccess(order) {
        successMessage.textContent = config.successMessage || 'Thank you for your purchase!';
        orderNumber.textContent = order.orderNumber;

        if (order.downloadUrl) {
          downloadBtn.href = order.downloadUrl;
          downloadBtn.style.display = 'inline-block';
        } else {
          downloadBtn.style.display = 'none';
        }

        showState(successState);

        window.parent.postMessage({
          type: 'widget:output',
          outputId: 'onPurchaseComplete',
          data: order
        }, '*');
      }

      function reset() {
        product = null;
        emailInput.value = '';
        nameInput.value = '';
        if (termsCheck) termsCheck.checked = false;
        showState(emptyState);
      }

      checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        startCheckout();
      });

      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            if (payload?.config) applyConfig(payload.config);
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            break;

          case 'widget:input':
            if (payload?.portId === 'product') {
              setProduct(payload.value);
            } else if (payload?.portId === 'reset') {
              reset();
            }
            break;
        }
      });

      // Check URL for checkout result
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('checkout') === 'cancelled') {
        window.parent.postMessage({
          type: 'widget:output',
          outputId: 'onCheckoutCancel',
          data: {}
        }, '*');
      }

      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const CheckoutFlowWidget: BuiltinWidget = {
  manifest: CheckoutFlowWidgetManifest,
  html: CheckoutFlowWidgetHTML,
};

export default CheckoutFlowWidget;
