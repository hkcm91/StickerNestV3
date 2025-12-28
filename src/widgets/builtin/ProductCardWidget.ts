/**
 * StickerNest v2 - Product Card Widget
 *
 * Display a product with image, price, and buy button.
 * Integrates with canvas commerce system for checkout.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ProductCardWidgetManifest: WidgetManifest = {
  id: 'stickernest.product-card',
  name: 'Product Card',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Display a product with buy button for shoppable pages',
  author: 'StickerNest',
  tags: ['commerce', 'product', 'shop', 'buy', 'checkout', 'core'],
  inputs: {
    productId: {
      type: 'string',
      description: 'Product ID from canvas commerce',
    },
    name: {
      type: 'string',
      description: 'Product name (manual override)',
      default: 'Product Name',
    },
    price: {
      type: 'number',
      description: 'Price in cents (manual override)',
      default: 999,
    },
    currency: {
      type: 'string',
      description: 'Currency code',
      default: 'USD',
    },
    imageUrl: {
      type: 'string',
      description: 'Product image URL',
    },
    description: {
      type: 'string',
      description: 'Short description',
    },
    buttonText: {
      type: 'string',
      description: 'Buy button text',
      default: 'Buy Now',
    },
    buttonColor: {
      type: 'string',
      description: 'Button background color',
      default: '#8b5cf6',
    },
    theme: {
      type: 'string',
      description: 'Card theme (dark/light)',
      default: 'dark',
    },
    showComparePrice: {
      type: 'boolean',
      description: 'Show compare at price',
      default: true,
    },
  },
  outputs: {
    'product.clicked': {
      type: 'object',
      description: 'Emitted when product card is clicked',
    },
    'product.buy': {
      type: 'object',
      description: 'Emitted when buy button is clicked',
    },
    'checkout.started': {
      type: 'object',
      description: 'Emitted when checkout begins',
    },
    'checkout.completed': {
      type: 'object',
      description: 'Emitted when checkout completes',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['product.set', 'product.update', 'product.load'],
    outputs: ['product.clicked', 'product.buy', 'checkout.started', 'checkout.completed'],
  },
  size: {
    width: 280,
    height: 360,
    minWidth: 200,
    minHeight: 280,
    scaleMode: 'scale',
  },
};

export const ProductCardWidgetHTML = `
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

    .card {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: rgba(30, 30, 40, 0.95);
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    }

    .card.light {
      background: rgba(255,255,255,0.95);
      border-color: rgba(0,0,0,0.1);
    }

    .image-container {
      flex: 1;
      min-height: 0;
      background: rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .card.light .image-container {
      background: rgba(0,0,0,0.05);
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .placeholder-icon {
      font-size: 48px;
      opacity: 0.3;
    }

    .badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: #ef4444;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge.sale { background: #10b981; }

    .content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .name {
      font-size: 16px;
      font-weight: 600;
      color: white;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card.light .name { color: #1a1a2e; }

    .description {
      font-size: 13px;
      color: rgba(255,255,255,0.6);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      line-height: 1.4;
    }

    .card.light .description { color: rgba(0,0,0,0.6); }

    .price-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .price {
      font-size: 20px;
      font-weight: 700;
      color: var(--accent-color, #8b5cf6);
    }

    .compare-price {
      font-size: 14px;
      color: rgba(255,255,255,0.4);
      text-decoration: line-through;
    }

    .card.light .compare-price { color: rgba(0,0,0,0.4); }

    .buy-button {
      width: 100%;
      padding: 12px 16px;
      background: var(--accent-color, #8b5cf6);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
    }

    .buy-button:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: scale(1.02);
    }

    .buy-button:active:not(:disabled) {
      transform: scale(0.98);
    }

    .buy-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .buy-button .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .sold-out {
      background: #666 !important;
      cursor: not-allowed !important;
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }

    .loading-overlay.visible {
      opacity: 1;
    }

    .loading-overlay .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  </style>
</head>
<body>
  <div class="card" id="card">
    <div class="image-container" id="imageContainer">
      <span class="placeholder-icon">&#x1F6D2;</span>
    </div>
    <div class="badge" id="badge" style="display: none;">Sale</div>
    <div class="content">
      <div class="name" id="productName">Product Name</div>
      <div class="description" id="productDescription"></div>
      <div class="price-row">
        <span class="price" id="productPrice">$9.99</span>
        <span class="compare-price" id="comparePrice"></span>
      </div>
      <button class="buy-button" id="buyButton">
        <span id="buttonText">Buy Now</span>
      </button>
    </div>
    <div class="loading-overlay" id="loadingOverlay">
      <div class="spinner"></div>
    </div>
  </div>

  <script>
    (function() {
      var API = window.WidgetAPI || {
        emitOutput: function() {},
        onInput: function() {},
        onMount: function(cb) { cb({ state: {}, inputs: {} }); },
        log: function() {}
      };

      // State
      var state = {
        productId: null,
        name: 'Product Name',
        price: 999,
        compareAtPrice: null,
        currency: 'USD',
        imageUrl: null,
        description: '',
        buttonText: 'Buy Now',
        buttonColor: '#8b5cf6',
        theme: 'dark',
        showComparePrice: true,
        inStock: true,
        loading: false,
        checkoutLoading: false
      };

      // Elements
      var card = document.getElementById('card');
      var imageContainer = document.getElementById('imageContainer');
      var badge = document.getElementById('badge');
      var productName = document.getElementById('productName');
      var productDescription = document.getElementById('productDescription');
      var productPrice = document.getElementById('productPrice');
      var comparePrice = document.getElementById('comparePrice');
      var buyButton = document.getElementById('buyButton');
      var buttonText = document.getElementById('buttonText');
      var loadingOverlay = document.getElementById('loadingOverlay');

      // Format price
      function formatPrice(cents, currency) {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD'
          }).format(cents / 100);
        } catch (e) {
          return '$' + (cents / 100).toFixed(2);
        }
      }

      // Render
      function render() {
        // Theme
        card.className = 'card ' + state.theme;
        card.style.setProperty('--accent-color', state.buttonColor);

        // Image
        if (state.imageUrl) {
          imageContainer.innerHTML = '<img src="' + state.imageUrl + '" alt="' + state.name + '">';
        } else {
          imageContainer.innerHTML = '<span class="placeholder-icon">&#x1F6D2;</span>';
        }

        // Badge (show if compare price exists and is higher)
        if (state.showComparePrice && state.compareAtPrice && state.compareAtPrice > state.price) {
          var discount = Math.round((1 - state.price / state.compareAtPrice) * 100);
          badge.textContent = discount + '% OFF';
          badge.className = 'badge sale';
          badge.style.display = 'block';
        } else {
          badge.style.display = 'none';
        }

        // Text content
        productName.textContent = state.name;
        productDescription.textContent = state.description || '';
        productDescription.style.display = state.description ? 'block' : 'none';

        // Price
        productPrice.textContent = formatPrice(state.price, state.currency);

        // Compare at price
        if (state.showComparePrice && state.compareAtPrice && state.compareAtPrice > state.price) {
          comparePrice.textContent = formatPrice(state.compareAtPrice, state.currency);
          comparePrice.style.display = 'inline';
        } else {
          comparePrice.style.display = 'none';
        }

        // Button
        if (state.checkoutLoading) {
          buttonText.innerHTML = '<div class="spinner"></div>';
          buyButton.disabled = true;
        } else if (!state.inStock) {
          buttonText.textContent = 'Sold Out';
          buyButton.classList.add('sold-out');
          buyButton.disabled = true;
        } else {
          buttonText.textContent = state.buttonText;
          buyButton.classList.remove('sold-out');
          buyButton.disabled = false;
        }

        // Loading overlay
        loadingOverlay.className = 'loading-overlay' + (state.loading ? ' visible' : '');
      }

      // Buy button click
      buyButton.addEventListener('click', function() {
        if (state.checkoutLoading || !state.inStock) return;

        state.checkoutLoading = true;
        render();

        API.emitOutput('product.buy', {
          productId: state.productId,
          name: state.name,
          price: state.price,
          currency: state.currency
        });

        // If we have a productId, initiate checkout
        if (state.productId) {
          fetch('/api/commerce/products/' + state.productId + '/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              returnUrl: window.location.href
            })
          })
          .then(function(response) { return response.json(); })
          .then(function(data) {
            if (data.url) {
              API.emitOutput('checkout.started', {
                productId: state.productId,
                sessionId: data.sessionId
              });
              // Redirect to Stripe Checkout
              if (window.top) {
                window.top.location.href = data.url;
              } else {
                window.location.href = data.url;
              }
            } else {
              throw new Error(data.error || 'Checkout failed');
            }
          })
          .catch(function(err) {
            API.log('Checkout error:', err);
            state.checkoutLoading = false;
            render();
          });
        } else {
          // No productId - just emit event
          state.checkoutLoading = false;
          render();
        }
      });

      // Card click (not on button)
      card.addEventListener('click', function(e) {
        if (e.target !== buyButton && !buyButton.contains(e.target)) {
          API.emitOutput('product.clicked', {
            productId: state.productId,
            name: state.name
          });
        }
      });

      // Load product by ID
      function loadProduct(productId) {
        if (!productId) return;

        state.loading = true;
        state.productId = productId;
        render();

        fetch('/api/commerce/products/' + productId)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.product) {
              state.name = data.product.name;
              state.price = data.product.priceCents;
              state.compareAtPrice = data.product.compareAtPriceCents;
              state.imageUrl = data.product.imageUrl;
              state.description = data.product.description;
              state.inStock = data.product.inStock !== false;
              state.currency = data.product.currency || 'USD';
            }
            state.loading = false;
            render();
          })
          .catch(function(err) {
            API.log('Failed to fetch product:', err);
            state.loading = false;
            render();
          });
      }

      // Handle inputs
      API.onInput('product.set', function(data) {
        Object.assign(state, data);
        if (data.productId && data.productId !== state.productId) {
          loadProduct(data.productId);
        } else {
          render();
        }
      });

      API.onInput('product.update', function(data) {
        Object.assign(state, data);
        render();
      });

      API.onInput('product.load', function(data) {
        if (data.productId) {
          loadProduct(data.productId);
        }
      });

      // Initialize
      API.onMount(function(context) {
        if (context.state) {
          Object.assign(state, context.state);
        }

        // Apply initial inputs
        var inputs = context.inputs || {};
        if (inputs.productId) state.productId = inputs.productId;
        if (inputs.name) state.name = inputs.name;
        if (inputs.price !== undefined) state.price = inputs.price;
        if (inputs.currency) state.currency = inputs.currency;
        if (inputs.imageUrl) state.imageUrl = inputs.imageUrl;
        if (inputs.description) state.description = inputs.description;
        if (inputs.buttonText) state.buttonText = inputs.buttonText;
        if (inputs.buttonColor) state.buttonColor = inputs.buttonColor;
        if (inputs.theme) state.theme = inputs.theme;
        if (inputs.showComparePrice !== undefined) state.showComparePrice = inputs.showComparePrice;

        render();

        // If productId provided, fetch product data
        if (state.productId) {
          loadProduct(state.productId);
        }

        // Check for checkout completion in URL
        var urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('checkout') === 'success') {
          API.emitOutput('checkout.completed', {
            productId: state.productId,
            sessionId: urlParams.get('session_id')
          });
        }
      });

      render();
    })();
  </script>
</body>
</html>
`;

export const ProductCardWidget: BuiltinWidget = {
  manifest: ProductCardWidgetManifest,
  html: ProductCardWidgetHTML,
};
