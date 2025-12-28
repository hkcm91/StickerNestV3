/**
 * StickerNest v2 - Product Gallery Widget
 * Displays multiple products from a canvas with grid layout
 * Pipeline outputs for checkout integration
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ProductGalleryWidgetManifest: WidgetManifest = {
  id: 'stickernest.product-gallery',
  name: 'Product Gallery',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Grid display of products with buy buttons - connects to checkout via pipeline',
  kind: 'interactive',
  category: 'commerce',
  tags: ['products', 'gallery', 'shop', 'store', 'commerce', 'pipeline'],
  icon: '🛍️',

  defaultSize: { width: 600, height: 500 },
  minSize: { width: 300, height: 300 },
  maxSize: { width: 1200, height: 1000 },

  inputs: [
    { id: 'refresh', name: 'Refresh', type: 'trigger', description: 'Reload products' },
    { id: 'filter', name: 'Filter', type: 'string', description: 'Filter products by tag/name' },
  ],
  outputs: [
    { id: 'onProductSelect', name: 'Product Selected', type: 'object', description: 'Emits selected product data' },
    { id: 'onBuyClick', name: 'Buy Clicked', type: 'object', description: 'Emits product for checkout' },
    { id: 'onLoaded', name: 'Products Loaded', type: 'array', description: 'Emits all loaded products' },
  ],

  io: {
    inputs: ['trigger.refresh', 'filter.set'],
    outputs: ['product.selected', 'product.buy', 'data.products'],
  },

  config: {
    schema: {
      type: 'object',
      properties: {
        columns: { type: 'number', default: 3, title: 'Columns', minimum: 1, maximum: 6 },
        showPrice: { type: 'boolean', default: true, title: 'Show Price' },
        showDescription: { type: 'boolean', default: true, title: 'Show Description' },
        buttonText: { type: 'string', default: 'Buy Now', title: 'Button Text' },
        emptyMessage: { type: 'string', default: 'No products available', title: 'Empty Message' },
        accentColor: { type: 'string', default: '#8b5cf6', title: 'Accent Color' },
        cardStyle: { type: 'string', default: 'elevated', enum: ['elevated', 'outlined', 'flat'], title: 'Card Style' },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const ProductGalleryWidgetHTML = `
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
      --bg-card: #ffffff;
      --text: #1f2937;
      --text-secondary: #6b7280;
      --border: #e5e7eb;
      --success: #10b981;
      --columns: 3;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 16px;
      min-height: 100vh;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(var(--columns), 1fr);
      gap: 16px;
    }

    .product-card {
      background: var(--bg-card);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .product-card.elevated {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .product-card.elevated:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .product-card.outlined {
      border: 1px solid var(--border);
    }

    .product-card.outlined:hover {
      border-color: var(--accent);
    }

    .product-card.flat {
      background: #f9fafb;
    }

    .product-card.flat:hover {
      background: #f3f4f6;
    }

    .product-image {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      background: #f3f4f6;
    }

    .product-image.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      color: #d1d5db;
    }

    .product-info {
      padding: 12px;
    }

    .product-name {
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .product-description {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-price {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .price-current {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
    }

    .price-compare {
      font-size: 0.85rem;
      color: var(--text-secondary);
      text-decoration: line-through;
    }

    .buy-btn {
      width: 100%;
      padding: 10px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      color: white;
      background: var(--accent);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .buy-btn:hover { background: var(--accent-hover); }
    .buy-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .out-of-stock {
      color: var(--text-secondary);
      font-size: 0.85rem;
      text-align: center;
      padding: 10px;
    }

    .loading, .empty, .error {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      text-align: center;
      color: var(--text-secondary);
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
    }
  </style>
</head>
<body>
  <div id="loading" class="loading"><div class="spinner"></div></div>
  <div id="error" class="error" style="display:none"></div>
  <div id="empty" class="empty" style="display:none"></div>
  <div id="gallery" class="gallery-grid" style="display:none"></div>

  <script>
    (function() {
      let config = {};
      let canvasId = '';
      let products = [];
      let filter = '';

      const loading = document.getElementById('loading');
      const error = document.getElementById('error');
      const empty = document.getElementById('empty');
      const gallery = document.getElementById('gallery');

      function applyConfig(cfg) {
        config = cfg;
        document.documentElement.style.setProperty('--columns', cfg.columns || 3);
        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent', cfg.accentColor);
        }
        renderProducts();
      }

      function formatPrice(cents) {
        return '$' + (cents / 100).toFixed(2);
      }

      function getFilteredProducts() {
        if (!filter) return products;
        const f = filter.toLowerCase();
        return products.filter(p =>
          p.name.toLowerCase().includes(f) ||
          (p.description || '').toLowerCase().includes(f)
        );
      }

      function renderProducts() {
        const filtered = getFilteredProducts();

        if (filtered.length === 0) {
          gallery.style.display = 'none';
          empty.style.display = 'flex';
          empty.textContent = config.emptyMessage || 'No products available';
          return;
        }

        empty.style.display = 'none';
        gallery.style.display = 'grid';
        gallery.innerHTML = '';

        const cardStyle = config.cardStyle || 'elevated';
        const showPrice = config.showPrice !== false;
        const showDesc = config.showDescription !== false;
        const btnText = config.buttonText || 'Buy Now';

        filtered.forEach(product => {
          const card = document.createElement('div');
          card.className = 'product-card ' + cardStyle;
          card.onclick = () => selectProduct(product);

          const inStock = product.inStock !== false;

          card.innerHTML = \`
            \${product.imageUrl
              ? '<img class="product-image" src="' + product.imageUrl + '" alt="' + product.name + '">'
              : '<div class="product-image placeholder">📦</div>'
            }
            <div class="product-info">
              <div class="product-name">\${product.name}</div>
              \${showDesc && product.description ? '<div class="product-description">' + product.description + '</div>' : ''}
              \${showPrice ? \`
                <div class="product-price">
                  <span class="price-current">\${formatPrice(product.priceCents)}</span>
                  \${product.compareAtPriceCents ? '<span class="price-compare">' + formatPrice(product.compareAtPriceCents) + '</span>' : ''}
                </div>
              \` : ''}
              \${inStock
                ? '<button class="buy-btn" data-id="' + product.id + '">' + btnText + '</button>'
                : '<div class="out-of-stock">Out of Stock</div>'
              }
            </div>
          \`;

          const btn = card.querySelector('.buy-btn');
          if (btn) {
            btn.onclick = (e) => {
              e.stopPropagation();
              buyProduct(product);
            };
          }

          gallery.appendChild(card);
        });
      }

      function selectProduct(product) {
        window.parent.postMessage({
          type: 'widget:output',
          outputId: 'onProductSelect',
          data: product
        }, '*');
      }

      function buyProduct(product) {
        window.parent.postMessage({
          type: 'widget:output',
          outputId: 'onBuyClick',
          data: product
        }, '*');
      }

      async function loadProducts() {
        if (!canvasId) return;

        loading.style.display = 'flex';
        error.style.display = 'none';
        gallery.style.display = 'none';
        empty.style.display = 'none';

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/canvas/' + canvasId + '/products');
          const data = await res.json();

          if (data.products) {
            products = data.products;
            loading.style.display = 'none';
            renderProducts();

            window.parent.postMessage({
              type: 'widget:output',
              outputId: 'onLoaded',
              data: products
            }, '*');
          } else {
            throw new Error(data.error?.message || 'Failed to load products');
          }
        } catch (e) {
          loading.style.display = 'none';
          error.style.display = 'flex';
          error.textContent = 'Failed to load products: ' + e.message;
        }
      }

      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            canvasId = payload?.canvasId || '';
            if (payload?.config) applyConfig(payload.config);
            loadProducts();
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            break;

          case 'widget:input':
            if (payload?.portId === 'refresh') {
              loadProducts();
            } else if (payload?.portId === 'filter') {
              filter = payload.value || '';
              renderProducts();
            }
            break;
        }
      });

      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const ProductGalleryWidget: BuiltinWidget = {
  manifest: ProductGalleryWidgetManifest,
  html: ProductGalleryWidgetHTML,
};

export default ProductGalleryWidget;
