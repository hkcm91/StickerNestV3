/**
 * StickerNest v2 - Pantry Widget
 *
 * Kitchen pantry inventory tracker with:
 * - Track items with quantities and expiration dates
 * - Location tracking (fridge, freezer, pantry shelf)
 * - Low stock alerts and expiring soon warnings
 * - Receive purchased items from shopping list
 * - Send low stock items to shopping list
 * - Check ingredient availability for recipes
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';
import {
  PORT_CHANNEL_SELECTOR_STYLES,
  PORT_CHANNEL_SELECTOR_SCRIPT,
} from '../../../runtime/PortChannelSelector';

export const PantryWidgetManifest: WidgetManifest = {
  id: 'stickernest.pantry',
  name: 'Pantry',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Kitchen pantry inventory with expiration tracking and low stock alerts',
  author: 'StickerNest',
  tags: ['grocery', 'pantry', 'inventory', 'food', 'kitchen'],
  inputs: {
    'item.add': {
      type: 'object',
      description: 'Add an item: { name, category, quantity, unit, expirationDate?, location? }',
    },
    'items.add': {
      type: 'array',
      description: 'Add multiple items (from shopping list)',
    },
    'item.update': {
      type: 'object',
      description: 'Update an item: { id, ...updates }',
    },
    'item.remove': {
      type: 'string',
      description: 'Remove an item by ID',
    },
    'item.use': {
      type: 'object',
      description: 'Use some of an item: { id, amount }',
    },
    'ingredients.check': {
      type: 'array',
      description: 'Check availability of ingredients for a recipe',
    },
  },
  outputs: {
    'item.added': {
      type: 'object',
      description: 'Emitted when an item is added',
    },
    'item.low': {
      type: 'object',
      description: 'Emitted when an item is low in stock',
    },
    'item.expiring': {
      type: 'object',
      description: 'Emitted when an item is expiring soon',
    },
    'ingredients.available': {
      type: 'object',
      description: 'Result of ingredient availability check',
    },
    'inventory.changed': {
      type: 'array',
      description: 'Full inventory when it changes',
    },
    'shopping.needed': {
      type: 'array',
      description: 'Items that need to be added to shopping list',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['item.add', 'items.add', 'item.update', 'item.remove', 'item.use', 'ingredients.check'],
    outputs: ['item.added', 'item.low', 'item.expiring', 'ingredients.available', 'inventory.changed', 'shopping.needed'],
  },
  events: {
    emits: ['grocery.pantry.updated', 'grocery.pantry.low', 'grocery.pantry.expiring'],
    listens: ['grocery.items.purchased'],
  },
  size: {
    width: 320,
    height: 450,
    minWidth: 260,
    minHeight: 350,
  },
};

export const PantryWidgetHTML = `
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
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header h2::before {
      content: '🏠';
    }

    .alerts {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 10px;
      font-weight: 500;
    }

    .alert.expiring {
      background: rgba(239, 68, 68, 0.2);
      color: var(--sn-error, #ef4444);
    }

    .alert.low {
      background: rgba(245, 158, 11, 0.2);
      color: var(--sn-warning, #f59e0b);
    }

    .tabs {
      display: flex;
      background: var(--sn-bg-tertiary, #252538);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    .tab {
      flex: 1;
      padding: 8px;
      background: transparent;
      border: none;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab:hover {
      color: var(--sn-text-primary, #e2e8f0);
    }

    .tab.active {
      color: var(--sn-accent-primary, #8b5cf6);
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 2px solid var(--sn-accent-primary, #8b5cf6);
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

    .item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-md, 6px);
      margin-bottom: 6px;
      border-left: 3px solid transparent;
    }

    .item.expiring-soon {
      border-left-color: var(--sn-error, #ef4444);
    }

    .item.low-stock {
      border-left-color: var(--sn-warning, #f59e0b);
    }

    .item-icon {
      font-size: 20px;
      width: 32px;
      text-align: center;
      flex-shrink: 0;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-name {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-details {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
      display: flex;
      gap: 8px;
      margin-top: 3px;
      flex-wrap: wrap;
    }

    .item-detail {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .item-detail.expiring {
      color: var(--sn-error, #ef4444);
    }

    .item-quantity {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .qty-btn {
      width: 24px;
      height: 24px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .qty-btn:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: var(--sn-accent-primary, #8b5cf6);
    }

    .qty-display {
      min-width: 40px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
    }

    .item-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .item:hover .item-actions {
      opacity: 1;
    }

    .action-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
      border-radius: 4px;
      font-size: 12px;
    }

    .action-btn:hover {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }

    .action-btn.delete:hover {
      color: var(--sn-error, #ef4444);
    }

    .add-modal {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }

    .add-modal.open {
      display: flex;
    }

    .modal-content {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-lg, 8px);
      padding: 16px;
      width: 90%;
      max-width: 300px;
      max-height: 90%;
      overflow-y: auto;
    }

    .modal-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .form-group {
      margin-bottom: 10px;
    }

    .form-label {
      display: block;
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 4px;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 8px 10px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: var(--sn-radius-sm, 4px);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      outline: none;
    }

    .form-row {
      display: flex;
      gap: 8px;
    }

    .form-row .form-group {
      flex: 1;
    }

    .modal-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .modal-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    .modal-btn.cancel {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }

    .modal-btn.save {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }

    .footer {
      padding: 8px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-stats {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .footer-btn {
      padding: 6px 12px;
      background: var(--sn-accent-primary, #8b5cf6);
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      color: white;
      font-size: 11px;
      cursor: pointer;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--sn-text-secondary, #94a3b8);
      padding: 20px;
      text-align: center;
    }

    .empty-state .icon {
      font-size: 32px;
      margin-bottom: 12px;
    }

    .channel-container {
      padding: 8px 12px;
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    ${PORT_CHANNEL_SELECTOR_STYLES()}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Pantry Inventory</h2>
      <div class="alerts" id="alerts"></div>
    </div>

    <div class="tabs">
      <button class="tab active" data-view="all">All</button>
      <button class="tab" data-view="fridge">🧊 Fridge</button>
      <button class="tab" data-view="freezer">❄️ Freezer</button>
      <button class="tab" data-view="pantry">🏠 Pantry</button>
    </div>

    <div class="search-bar">
      <input type="text" class="search-input" id="search-input" placeholder="Search items..." />
    </div>

    <div class="list-container" id="list-container">
      <div class="empty-state" id="empty-state">
        <div class="icon">🏠</div>
        <div>Your pantry is empty</div>
        <div style="font-size: 11px; margin-top: 4px;">Add items or check off your shopping list</div>
      </div>
    </div>

    <div class="channel-container" id="channel-container"></div>

    <div class="footer">
      <div class="footer-stats" id="footer-stats">0 items</div>
      <button class="footer-btn" id="add-btn">+ Add Item</button>
    </div>

    <div class="add-modal" id="add-modal">
      <div class="modal-content">
        <div class="modal-title">Add Pantry Item</div>
        <div class="form-group">
          <label class="form-label">Item Name</label>
          <input type="text" class="form-input" id="modal-name" placeholder="e.g., Milk" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Quantity</label>
            <input type="number" class="form-input" id="modal-qty" value="1" min="0" step="0.1" />
          </div>
          <div class="form-group">
            <label class="form-label">Unit</label>
            <select class="form-select" id="modal-unit">
              <option value="count">Count</option>
              <option value="oz">oz</option>
              <option value="lb">lb</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">L</option>
              <option value="cup">cup</option>
              <option value="gal">gal</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" id="modal-category">
              <option value="produce">Produce</option>
              <option value="dairy">Dairy</option>
              <option value="meat">Meat</option>
              <option value="seafood">Seafood</option>
              <option value="bakery">Bakery</option>
              <option value="frozen">Frozen</option>
              <option value="pantry">Pantry</option>
              <option value="beverages">Beverages</option>
              <option value="snacks">Snacks</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <select class="form-select" id="modal-location">
              <option value="fridge">Fridge</option>
              <option value="freezer">Freezer</option>
              <option value="pantry">Pantry</option>
              <option value="counter">Counter</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Expiration Date (optional)</label>
          <input type="date" class="form-input" id="modal-expiry" />
        </div>
        <div class="form-group">
          <label class="form-label">Low Stock Alert (optional)</label>
          <input type="number" class="form-input" id="modal-threshold" placeholder="Alert when below..." min="0" />
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" id="modal-cancel">Cancel</button>
          <button class="modal-btn save" id="modal-save">Add Item</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    ${PORT_CHANNEL_SELECTOR_SCRIPT()}
  </script>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let items = [];
      let currentView = 'all';
      let searchQuery = '';

      // Category icons
      const categoryIcons = {
        produce: '🥬', dairy: '🥛', meat: '🥩', seafood: '🐟',
        bakery: '🍞', frozen: '🧊', pantry: '🥫', beverages: '🥤',
        snacks: '🍿', household: '🧹', personal: '🧴', other: '📦'
      };

      // DOM Elements
      const listContainer = document.getElementById('list-container');
      const emptyState = document.getElementById('empty-state');
      const alertsContainer = document.getElementById('alerts');
      const searchInput = document.getElementById('search-input');
      const footerStats = document.getElementById('footer-stats');
      const addBtn = document.getElementById('add-btn');
      const addModal = document.getElementById('add-modal');
      const channelContainer = document.getElementById('channel-container');

      // Create channel selector for sending to shopping list
      let shoppingChannel = null;
      if (window.PortChannelSelector) {
        shoppingChannel = window.PortChannelSelector.create('shopping.needed', channelContainer, {
          label: 'Add low stock to:',
          showAllOption: true
        });
      }

      // Generate unique ID
      function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      }

      // Add item
      function addItem(itemData) {
        const item = {
          id: generateId(),
          name: itemData.name || 'Unknown Item',
          category: itemData.category || 'other',
          quantity: parseFloat(itemData.quantity) || 1,
          unit: itemData.unit || 'count',
          location: itemData.location || 'pantry',
          expirationDate: itemData.expirationDate || null,
          lowStockThreshold: itemData.lowStockThreshold || null,
          purchasePrice: itemData.purchasePrice || null,
          purchaseDate: itemData.purchaseDate || Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        items.push(item);
        checkAlerts(item);
        renderList();
        emitInventoryChanged();

        API.emitOutput('item.added', item);
        API.log('Added pantry item: ' + item.name);

        return item.id;
      }

      // Update item
      function updateItem(id, updates) {
        const index = items.findIndex(i => i.id === id);
        if (index >= 0) {
          items[index] = { ...items[index], ...updates, updatedAt: Date.now() };
          checkAlerts(items[index]);
          renderList();
          emitInventoryChanged();
        }
      }

      // Remove item
      function removeItem(id) {
        items = items.filter(i => i.id !== id);
        renderList();
        emitInventoryChanged();
      }

      // Adjust quantity
      function adjustQuantity(id, delta) {
        const item = items.find(i => i.id === id);
        if (item) {
          const newQty = Math.max(0, item.quantity + delta);
          updateItem(id, { quantity: newQty });

          if (newQty === 0) {
            // Optionally remove when empty
            // removeItem(id);
          }
        }
      }

      // Check for alerts
      function checkAlerts(item) {
        // Check low stock
        if (item.lowStockThreshold && item.quantity <= item.lowStockThreshold) {
          API.emitOutput('item.low', item);
          API.emit('grocery.pantry.low', item);
        }

        // Check expiration (within 3 days)
        if (item.expirationDate) {
          const daysUntilExpiry = (item.expirationDate - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
            API.emitOutput('item.expiring', item);
            API.emit('grocery.pantry.expiring', item);
          }
        }
      }

      // Get expiring items
      function getExpiringItems() {
        const threeDaysFromNow = Date.now() + (3 * 24 * 60 * 60 * 1000);
        return items.filter(item =>
          item.expirationDate && item.expirationDate <= threeDaysFromNow && item.expirationDate > Date.now()
        );
      }

      // Get low stock items
      function getLowStockItems() {
        return items.filter(item =>
          item.lowStockThreshold && item.quantity <= item.lowStockThreshold
        );
      }

      // Emit inventory changed
      function emitInventoryChanged() {
        API.emitOutput('inventory.changed', items);
        API.emit('grocery.pantry.updated', items);
        updateAlerts();
        updateStats();
      }

      // Update alerts display
      function updateAlerts() {
        const expiring = getExpiringItems();
        const lowStock = getLowStockItems();

        let html = '';
        if (expiring.length > 0) {
          html += '<div class="alert expiring">⚠️ ' + expiring.length + ' expiring soon</div>';
        }
        if (lowStock.length > 0) {
          html += '<div class="alert low">📉 ' + lowStock.length + ' low stock</div>';
        }
        alertsContainer.innerHTML = html;
      }

      // Update stats
      function updateStats() {
        footerStats.textContent = items.length + ' item' + (items.length !== 1 ? 's' : '');
      }

      // Format date
      function formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.ceil((timestamp - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Expired';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays <= 7) return diffDays + ' days';
        return date.toLocaleDateString();
      }

      // Render list
      function renderList() {
        // Filter by view and search
        let filtered = items;

        if (currentView !== 'all') {
          filtered = filtered.filter(item => item.location === currentView);
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
          );
        }

        if (filtered.length === 0) {
          listContainer.innerHTML = '';
          listContainer.appendChild(emptyState);
          emptyState.style.display = 'flex';
          return;
        }

        emptyState.style.display = 'none';

        // Sort by expiration (soonest first), then by name
        filtered.sort((a, b) => {
          if (a.expirationDate && b.expirationDate) {
            return a.expirationDate - b.expirationDate;
          }
          if (a.expirationDate) return -1;
          if (b.expirationDate) return 1;
          return a.name.localeCompare(b.name);
        });

        let html = '';
        filtered.forEach(item => {
          const icon = categoryIcons[item.category] || '📦';
          const expiring = item.expirationDate && (item.expirationDate - Date.now()) <= (3 * 24 * 60 * 60 * 1000);
          const lowStock = item.lowStockThreshold && item.quantity <= item.lowStockThreshold;

          let classes = 'item';
          if (expiring) classes += ' expiring-soon';
          if (lowStock) classes += ' low-stock';

          html += '<div class="' + classes + '" data-id="' + item.id + '">';
          html += '<div class="item-icon">' + icon + '</div>';
          html += '<div class="item-content">';
          html += '<div class="item-name">' + escapeHtml(item.name) + '</div>';
          html += '<div class="item-details">';
          html += '<div class="item-detail">📍 ' + item.location + '</div>';
          if (item.expirationDate) {
            html += '<div class="item-detail' + (expiring ? ' expiring' : '') + '">📅 ' + formatDate(item.expirationDate) + '</div>';
          }
          html += '</div>';
          html += '</div>';
          html += '<div class="item-quantity">';
          html += '<button class="qty-btn" data-action="decrease">−</button>';
          html += '<span class="qty-display">' + item.quantity + ' ' + item.unit + '</span>';
          html += '<button class="qty-btn" data-action="increase">+</button>';
          html += '</div>';
          html += '<div class="item-actions">';
          html += '<button class="action-btn delete" data-action="delete" title="Delete">🗑</button>';
          html += '</div>';
          html += '</div>';
        });

        listContainer.innerHTML = html;

        // Attach event listeners
        listContainer.querySelectorAll('.item').forEach(el => {
          const id = el.dataset.id;

          el.querySelector('[data-action="decrease"]').addEventListener('click', () => adjustQuantity(id, -1));
          el.querySelector('[data-action="increase"]').addEventListener('click', () => adjustQuantity(id, 1));
          el.querySelector('[data-action="delete"]').addEventListener('click', () => removeItem(id));
        });

        updateStats();
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Send low stock to shopping
      function sendLowStockToShopping() {
        const lowStock = getLowStockItems();
        if (lowStock.length === 0) return;

        const shoppingItems = lowStock.map(item => ({
          name: item.name,
          category: item.category,
          quantity: item.lowStockThreshold - item.quantity + 1,
          unit: item.unit,
          priority: 'high'
        }));

        if (shoppingChannel) {
          shoppingChannel.emitToSelected(shoppingItems);
        } else {
          API.emitOutput('shopping.needed', shoppingItems);
        }
      }

      // Tab switching
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          currentView = tab.dataset.view;
          renderList();
        });
      });

      // Search
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderList();
      });

      // Add modal
      addBtn.addEventListener('click', () => {
        addModal.classList.add('open');
        document.getElementById('modal-name').value = '';
        document.getElementById('modal-qty').value = '1';
        document.getElementById('modal-name').focus();
      });

      document.getElementById('modal-cancel').addEventListener('click', () => {
        addModal.classList.remove('open');
      });

      document.getElementById('modal-save').addEventListener('click', () => {
        const name = document.getElementById('modal-name').value.trim();
        if (!name) return;

        const expiryInput = document.getElementById('modal-expiry').value;
        const expirationDate = expiryInput ? new Date(expiryInput).getTime() : null;

        addItem({
          name: name,
          quantity: parseFloat(document.getElementById('modal-qty').value) || 1,
          unit: document.getElementById('modal-unit').value,
          category: document.getElementById('modal-category').value,
          location: document.getElementById('modal-location').value,
          expirationDate: expirationDate,
          lowStockThreshold: parseFloat(document.getElementById('modal-threshold').value) || null
        });

        addModal.classList.remove('open');
      });

      // Initialize
      API.onMount(function(context) {
        const savedState = context.state || {};
        items = savedState.items || [];

        renderList();
        updateAlerts();
        API.log('Pantry mounted with ' + items.length + ' items');
      });

      // Handle inputs
      API.onInput('item.add', function(data) {
        if (data && data.name) {
          addItem(data);
        }
      });

      API.onInput('items.add', function(data) {
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item && item.name) addItem(item);
          });
        }
      });

      API.onInput('item.update', function(data) {
        if (data && data.id) {
          const { id, ...updates } = data;
          updateItem(id, updates);
        }
      });

      API.onInput('item.remove', function(id) {
        if (id) removeItem(id);
      });

      API.onInput('item.use', function(data) {
        if (data && data.id && data.amount) {
          adjustQuantity(data.id, -data.amount);
        }
      });

      API.onInput('ingredients.check', function(ingredients) {
        if (!Array.isArray(ingredients)) return;

        const available = [];
        const missing = [];

        ingredients.forEach(ingredient => {
          const name = ingredient.name.toLowerCase();
          const found = items.find(item =>
            item.name.toLowerCase().includes(name) ||
            name.includes(item.name.toLowerCase())
          );

          if (found && found.quantity >= (ingredient.quantity || 1)) {
            available.push({ ...ingredient, pantryItem: found });
          } else {
            missing.push(ingredient);
          }
        });

        API.emitOutput('ingredients.available', { available, missing });
      });

      // Listen for purchased items from shopping list
      API.on('grocery.items.purchased', function(purchasedItems) {
        if (Array.isArray(purchasedItems)) {
          purchasedItems.forEach(item => addItem(item));
        }
      });

      // Also listen on pipeline input
      API.onInput('items.add', function(data) {
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item && item.name) addItem(item);
          });
        }
      });

      // Periodically save state and check alerts
      setInterval(function() {
        API.setState({ items: items });
        updateAlerts();
      }, 5000);

      // Cleanup
      API.onDestroy(function() {
        API.setState({ items: items });
        API.log('Pantry destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const PantryWidget: BuiltinWidget = {
  manifest: PantryWidgetManifest,
  html: PantryWidgetHTML,
};
