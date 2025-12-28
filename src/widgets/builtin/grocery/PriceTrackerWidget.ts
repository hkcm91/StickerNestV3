/**
 * StickerNest v2 - Price Tracker Widget
 *
 * Track grocery prices over time with:
 * - Price history visualization
 * - Trend indicators (up/down/stable)
 * - Store price comparison
 * - Best deal alerts
 * - Receive prices from receipt scanner
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const PriceTrackerWidgetManifest: WidgetManifest = {
  id: 'stickernest.price-tracker',
  name: 'Price Tracker',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Track grocery prices over time and compare across stores',
  author: 'StickerNest',
  tags: ['grocery', 'prices', 'tracker', 'budget', 'comparison'],
  inputs: {
    'price.add': {
      type: 'object',
      description: 'Add a price record',
    },
    'prices.add': {
      type: 'array',
      description: 'Add multiple price records',
    },
    'item.query': {
      type: 'string',
      description: 'Query price history for an item',
    },
  },
  outputs: {
    'price.trend': {
      type: 'object',
      description: 'Price trend analysis for an item',
    },
    'deal.found': {
      type: 'object',
      description: 'Emitted when a good deal is detected',
    },
    'history.updated': {
      type: 'object',
      description: 'Updated price history',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['price.add', 'prices.add', 'item.query'],
    outputs: ['price.trend', 'deal.found', 'history.updated'],
  },
  events: {
    emits: ['grocery.deal.alert'],
    listens: ['grocery.prices.updated'],
  },
  size: {
    width: 300,
    height: 380,
    minWidth: 240,
    minHeight: 300,
  },
};

export const PriceTrackerWidgetHTML = `
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
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
    }

    .header {
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    .header h2 {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header h2::before {
      content: '📊';
    }

    .stats-bar {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .stat-box {
      flex: 1;
      padding: 8px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: var(--sn-radius-sm, 4px);
      text-align: center;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 600;
      color: var(--sn-accent-primary, #8b5cf6);
    }

    .stat-label {
      font-size: 9px;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      margin-top: 2px;
    }

    .search-bar {
      padding: 8px 12px;
      background: var(--sn-bg-tertiary, #252538);
    }

    .search-input {
      width: 100%;
      padding: 8px 10px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: var(--sn-radius-sm, 4px);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    .list-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .item-card {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-md, 6px);
      padding: 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .item-card:hover {
      background: var(--sn-bg-tertiary, #252538);
    }

    .item-card.expanded {
      background: var(--sn-bg-tertiary, #252538);
    }

    .item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .item-name {
      font-size: 13px;
      font-weight: 500;
      flex: 1;
    }

    .item-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
    }

    .trend-up {
      background: rgba(239, 68, 68, 0.2);
      color: var(--sn-error, #ef4444);
    }

    .trend-down {
      background: rgba(34, 197, 94, 0.2);
      color: var(--sn-success, #22c55e);
    }

    .trend-stable {
      background: rgba(148, 163, 184, 0.2);
      color: var(--sn-text-secondary, #94a3b8);
    }

    .item-prices {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-top: 8px;
    }

    .current-price {
      font-size: 18px;
      font-weight: 600;
      color: var(--sn-success, #22c55e);
    }

    .avg-price {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .item-stores {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .store-tag {
      font-size: 10px;
      padding: 2px 6px;
      background: var(--sn-bg-primary, #0f0f19);
      border-radius: 4px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .item-history {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.1));
      display: none;
    }

    .item-card.expanded .item-history {
      display: block;
    }

    .history-title {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .price-chart {
      height: 60px;
      display: flex;
      align-items: flex-end;
      gap: 2px;
      margin-bottom: 8px;
    }

    .price-bar {
      flex: 1;
      background: var(--sn-accent-primary, #8b5cf6);
      border-radius: 2px 2px 0 0;
      min-height: 4px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .price-bar:hover {
      opacity: 1;
    }

    .price-bar.lowest {
      background: var(--sn-success, #22c55e);
    }

    .price-bar.highest {
      background: var(--sn-error, #ef4444);
    }

    .history-list {
      max-height: 100px;
      overflow-y: auto;
    }

    .history-item {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 4px 0;
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.05));
    }

    .history-item:last-child {
      border-bottom: none;
    }

    .history-date {
      color: var(--sn-text-secondary, #94a3b8);
    }

    .history-store {
      color: var(--sn-text-secondary, #94a3b8);
    }

    .history-price {
      font-weight: 500;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--sn-text-secondary, #94a3b8);
      text-align: center;
      padding: 20px;
    }

    .empty-state .icon {
      font-size: 32px;
      margin-bottom: 12px;
    }

    .deal-banner {
      margin: 8px;
      padding: 10px;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(139, 92, 246, 0.2));
      border-radius: var(--sn-radius-sm, 4px);
      border: 1px solid var(--sn-success, #22c55e);
      display: none;
    }

    .deal-banner.active {
      display: block;
    }

    .deal-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--sn-success, #22c55e);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .deal-info {
      font-size: 12px;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Price Tracker</h2>
      <div class="stats-bar">
        <div class="stat-box">
          <div class="stat-value" id="items-tracked">0</div>
          <div class="stat-label">Items</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" id="records-count">0</div>
          <div class="stat-label">Records</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" id="stores-count">0</div>
          <div class="stat-label">Stores</div>
        </div>
      </div>
    </div>

    <div class="deal-banner" id="deal-banner">
      <div class="deal-title">🏷️ Deal Found!</div>
      <div class="deal-info" id="deal-info"></div>
    </div>

    <div class="search-bar">
      <input type="text" class="search-input" id="search-input" placeholder="Search items..." />
    </div>

    <div class="list-container" id="list-container">
      <div class="empty-state" id="empty-state">
        <div class="icon">📊</div>
        <div>No price data yet</div>
        <div style="font-size: 11px; margin-top: 4px;">Scan receipts to track prices</div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let priceRecords = [];
      let searchQuery = '';
      let expandedItem = null;
      let lastDeal = null;

      // DOM Elements
      const listContainer = document.getElementById('list-container');
      const emptyState = document.getElementById('empty-state');
      const searchInput = document.getElementById('search-input');
      const itemsTracked = document.getElementById('items-tracked');
      const recordsCount = document.getElementById('records-count');
      const storesCount = document.getElementById('stores-count');
      const dealBanner = document.getElementById('deal-banner');
      const dealInfo = document.getElementById('deal-info');

      // Add price record
      function addPriceRecord(record) {
        const normalized = normalizeItemName(record.itemName || record.name);

        priceRecords.push({
          id: generateId(),
          itemName: record.itemName || record.name,
          normalizedName: normalized,
          price: record.price,
          quantity: record.quantity || 1,
          pricePerUnit: record.pricePerUnit || (record.price / (record.quantity || 1)),
          store: record.store || 'Unknown',
          date: record.date || Date.now(),
          category: record.category || 'other',
          isOnSale: record.isOnSale || false
        });

        checkForDeal(record);
        updateStats();
        renderList();
        emitHistoryUpdated();
      }

      // Check if this is a good deal
      function checkForDeal(record) {
        const history = getItemHistory(record.itemName || record.name);
        if (history.length < 3) return;

        const avgPrice = history.reduce((sum, r) => sum + r.pricePerUnit, 0) / history.length;
        const currentPrice = record.pricePerUnit || record.price;

        // If current price is 15%+ below average, it's a deal
        if (currentPrice < avgPrice * 0.85) {
          const savings = ((avgPrice - currentPrice) / avgPrice * 100).toFixed(0);
          lastDeal = {
            itemName: record.itemName || record.name,
            store: record.store,
            price: currentPrice,
            avgPrice: avgPrice,
            savings: savings
          };

          dealBanner.classList.add('active');
          dealInfo.textContent = lastDeal.itemName + ' at ' + lastDeal.store + ' - ' + savings + '% below average!';

          API.emitOutput('deal.found', lastDeal);
          API.emit('grocery.deal.alert', lastDeal);

          // Hide after 10 seconds
          setTimeout(() => {
            dealBanner.classList.remove('active');
          }, 10000);
        }
      }

      // Get history for an item
      function getItemHistory(itemName) {
        const normalized = normalizeItemName(itemName);
        return priceRecords
          .filter(r => r.normalizedName === normalized || r.normalizedName.includes(normalized) || normalized.includes(r.normalizedName))
          .sort((a, b) => b.date - a.date);
      }

      // Normalize item name
      function normalizeItemName(name) {
        return (name || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .trim();
      }

      // Generate ID
      function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      }

      // Get aggregated items
      function getAggregatedItems() {
        const items = {};

        priceRecords.forEach(record => {
          const key = record.normalizedName;
          if (!items[key]) {
            items[key] = {
              name: record.itemName,
              normalizedName: key,
              records: [],
              stores: new Set()
            };
          }
          items[key].records.push(record);
          items[key].stores.add(record.store);
        });

        // Calculate stats for each item
        return Object.values(items).map(item => {
          const records = item.records.sort((a, b) => b.date - a.date);
          const prices = records.map(r => r.pricePerUnit);
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          const currentPrice = prices[0];
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);

          // Calculate trend
          let trend = 'stable';
          if (records.length >= 3) {
            const recentAvg = prices.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
            const olderAvg = prices.slice(3).reduce((a, b) => a + b, 0) / (prices.length - 3) || recentAvg;
            const change = (recentAvg - olderAvg) / olderAvg;
            if (change > 0.05) trend = 'up';
            else if (change < -0.05) trend = 'down';
          }

          return {
            name: item.name,
            normalizedName: item.normalizedName,
            currentPrice: currentPrice,
            avgPrice: avgPrice,
            minPrice: minPrice,
            maxPrice: maxPrice,
            trend: trend,
            stores: Array.from(item.stores),
            records: records
          };
        }).sort((a, b) => b.records.length - a.records.length);
      }

      // Update stats
      function updateStats() {
        const items = getAggregatedItems();
        const stores = new Set(priceRecords.map(r => r.store));

        itemsTracked.textContent = items.length;
        recordsCount.textContent = priceRecords.length;
        storesCount.textContent = stores.size;
      }

      // Emit history updated
      function emitHistoryUpdated() {
        API.emitOutput('history.updated', {
          itemCount: getAggregatedItems().length,
          recordCount: priceRecords.length,
          lastUpdated: Date.now()
        });
      }

      // Render list
      function renderList() {
        let items = getAggregatedItems();

        // Filter by search
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          items = items.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.stores.some(s => s.toLowerCase().includes(query))
          );
        }

        if (items.length === 0) {
          listContainer.innerHTML = '';
          listContainer.appendChild(emptyState);
          emptyState.style.display = 'flex';
          return;
        }

        emptyState.style.display = 'none';

        let html = '';
        items.forEach(item => {
          const isExpanded = expandedItem === item.normalizedName;
          const trendClass = 'trend-' + item.trend;
          const trendIcon = item.trend === 'up' ? '📈' : item.trend === 'down' ? '📉' : '➡️';
          const trendLabel = item.trend === 'up' ? 'Up' : item.trend === 'down' ? 'Down' : 'Stable';

          html += '<div class="item-card' + (isExpanded ? ' expanded' : '') + '" data-key="' + item.normalizedName + '">';
          html += '<div class="item-header">';
          html += '<div class="item-name">' + escapeHtml(item.name) + '</div>';
          html += '<div class="item-trend ' + trendClass + '">' + trendIcon + ' ' + trendLabel + '</div>';
          html += '</div>';

          html += '<div class="item-prices">';
          html += '<div class="current-price">$' + item.currentPrice.toFixed(2) + '</div>';
          html += '<div class="avg-price">avg $' + item.avgPrice.toFixed(2) + '</div>';
          html += '</div>';

          html += '<div class="item-stores">';
          item.stores.slice(0, 3).forEach(store => {
            html += '<span class="store-tag">' + escapeHtml(store) + '</span>';
          });
          if (item.stores.length > 3) {
            html += '<span class="store-tag">+' + (item.stores.length - 3) + ' more</span>';
          }
          html += '</div>';

          // Expanded history
          html += '<div class="item-history">';
          html += '<div class="history-title">Price History</div>';

          // Mini chart
          if (item.records.length > 1) {
            html += '<div class="price-chart">';
            const recent = item.records.slice(0, 10).reverse();
            recent.forEach((record, i) => {
              const height = ((record.pricePerUnit - item.minPrice) / (item.maxPrice - item.minPrice || 1)) * 100;
              const minHeight = Math.max(10, height);
              let barClass = 'price-bar';
              if (record.pricePerUnit === item.minPrice) barClass += ' lowest';
              if (record.pricePerUnit === item.maxPrice) barClass += ' highest';
              html += '<div class="' + barClass + '" style="height: ' + minHeight + '%" title="$' + record.pricePerUnit.toFixed(2) + '"></div>';
            });
            html += '</div>';
          }

          html += '<div class="history-list">';
          item.records.slice(0, 5).forEach(record => {
            const date = new Date(record.date).toLocaleDateString();
            html += '<div class="history-item">';
            html += '<span class="history-date">' + date + '</span>';
            html += '<span class="history-store">' + escapeHtml(record.store) + '</span>';
            html += '<span class="history-price">$' + record.pricePerUnit.toFixed(2) + '</span>';
            html += '</div>';
          });
          html += '</div>';
          html += '</div>';

          html += '</div>';
        });

        listContainer.innerHTML = html;

        // Attach click handlers
        listContainer.querySelectorAll('.item-card').forEach(card => {
          card.addEventListener('click', () => {
            const key = card.dataset.key;
            expandedItem = expandedItem === key ? null : key;
            renderList();
          });
        });
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Search
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderList();
      });

      // Initialize
      API.onMount(function(context) {
        const savedState = context.state || {};
        priceRecords = savedState.priceRecords || [];

        updateStats();
        renderList();
        API.log('Price Tracker mounted with ' + priceRecords.length + ' records');
      });

      // Handle inputs
      API.onInput('price.add', function(record) {
        if (record && (record.itemName || record.name)) {
          addPriceRecord(record);
        }
      });

      API.onInput('prices.add', function(records) {
        if (Array.isArray(records)) {
          records.forEach(record => {
            if (record && (record.itemName || record.name)) {
              addPriceRecord(record);
            }
          });
        }
      });

      API.onInput('item.query', function(itemName) {
        if (itemName) {
          const history = getItemHistory(itemName);
          if (history.length > 0) {
            const prices = history.map(r => r.pricePerUnit);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const trend = history.length >= 3 ? getTrend(prices) : 'unknown';

            API.emitOutput('price.trend', {
              itemName: itemName,
              currentPrice: prices[0],
              avgPrice: avgPrice,
              minPrice: Math.min(...prices),
              maxPrice: Math.max(...prices),
              trend: trend,
              recordCount: history.length
            });
          }
        }
      });

      function getTrend(prices) {
        if (prices.length < 3) return 'unknown';
        const recentAvg = prices.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const olderAvg = prices.slice(3).reduce((a, b) => a + b, 0) / (prices.length - 3) || recentAvg;
        const change = (recentAvg - olderAvg) / olderAvg;
        if (change > 0.05) return 'up';
        if (change < -0.05) return 'down';
        return 'stable';
      }

      // Listen for broadcast events
      API.on('grocery.prices.updated', function(records) {
        if (Array.isArray(records)) {
          records.forEach(record => addPriceRecord(record));
        }
      });

      // Periodically save state
      setInterval(function() {
        API.setState({ priceRecords: priceRecords });
      }, 5000);

      // Cleanup
      API.onDestroy(function() {
        API.setState({ priceRecords: priceRecords });
        API.log('Price Tracker destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const PriceTrackerWidget: BuiltinWidget = {
  manifest: PriceTrackerWidgetManifest,
  html: PriceTrackerWidgetHTML,
};
