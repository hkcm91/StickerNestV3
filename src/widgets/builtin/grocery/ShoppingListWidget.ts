/**
 * StickerNest v2 - Shopping List Widget
 *
 * Grocery shopping list with:
 * - Add/remove items with categories
 * - Check off items when purchased
 * - Priority levels and estimated prices
 * - Send checked items to Pantry
 * - Receive items from recipes and AI suggestions
 * - Multi-channel port selection for multiple connections
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';
import {
  PORT_CHANNEL_SELECTOR_STYLES,
  PORT_CHANNEL_SELECTOR_SCRIPT,
} from '../../../runtime/PortChannelSelector';

export const ShoppingListWidgetManifest: WidgetManifest = {
  id: 'stickernest.shopping-list',
  name: 'Shopping List',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Grocery shopping list with categories, check-off, and pantry integration',
  author: 'StickerNest',
  tags: ['grocery', 'shopping', 'list', 'pantry', 'food'],
  inputs: {
    'item.add': {
      type: 'object',
      description: 'Add an item to the list: { name, category?, quantity?, unit?, priority? }',
    },
    'items.add': {
      type: 'array',
      description: 'Add multiple items to the list',
    },
    'item.remove': {
      type: 'string',
      description: 'Remove an item by ID',
    },
    'list.clear': {
      type: 'trigger',
      description: 'Clear all items from the list',
    },
    'list.import': {
      type: 'array',
      description: 'Import a complete list of items',
    },
  },
  outputs: {
    'item.checked': {
      type: 'object',
      description: 'Emitted when an item is checked off (purchased)',
    },
    'items.checked': {
      type: 'array',
      description: 'Emitted when multiple items are sent to pantry',
    },
    'list.changed': {
      type: 'array',
      description: 'Emitted when the list changes',
    },
    'total.estimated': {
      type: 'number',
      description: 'Estimated total cost of items',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['item.add', 'items.add', 'item.remove', 'list.clear', 'list.import'],
    outputs: ['item.checked', 'items.checked', 'list.changed', 'total.estimated'],
  },
  events: {
    emits: ['grocery.list.updated', 'grocery.items.purchased'],
    listens: ['grocery.recipe.ingredients', 'grocery.ai.suggestion'],
  },
  size: {
    width: 280,
    height: 400,
    minWidth: 220,
    minHeight: 300,
  },
};

// Use a function to avoid TDZ issues with PORT_CHANNEL_SELECTOR imports
const getShoppingListWidgetHTML = () => `
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
      content: '🛒';
    }

    .stats {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-value {
      color: var(--sn-accent-primary, #8b5cf6);
      font-weight: 600;
    }

    .add-section {
      padding: 8px 12px;
      background: var(--sn-bg-tertiary, #252538);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .add-row {
      display: flex;
      gap: 6px;
    }

    .add-input {
      flex: 1;
      padding: 8px 10px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: var(--sn-radius-sm, 4px);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      outline: none;
    }

    .add-input:focus {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    .add-input::placeholder {
      color: var(--sn-text-secondary, #94a3b8);
    }

    .category-select, .priority-select {
      padding: 8px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: var(--sn-radius-sm, 4px);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 11px;
      cursor: pointer;
      outline: none;
    }

    .add-btn {
      padding: 8px 16px;
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .add-btn:hover {
      opacity: 0.9;
    }

    .list-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .category-group {
      margin-bottom: 12px;
    }

    .category-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 8px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: var(--sn-radius-sm, 4px);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-sm, 4px);
      margin-bottom: 4px;
      transition: all 0.2s;
    }

    .item:hover {
      background: var(--sn-bg-tertiary, #252538);
    }

    .item.checked {
      opacity: 0.5;
    }

    .item.checked .item-name {
      text-decoration: line-through;
    }

    .item-checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid var(--sn-border-primary, rgba(139, 92, 246, 0.4));
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .item-checkbox:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    .item-checkbox.checked {
      background: var(--sn-success, #22c55e);
      border-color: var(--sn-success, #22c55e);
    }

    .item-checkbox.checked::after {
      content: '✓';
      color: white;
      font-size: 12px;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-name {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-details {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
      display: flex;
      gap: 8px;
      margin-top: 2px;
    }

    .item-price {
      font-size: 11px;
      color: var(--sn-success, #22c55e);
      white-space: nowrap;
    }

    .item-remove {
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--sn-text-secondary, #94a3b8);
      cursor: pointer;
      opacity: 0;
      transition: all 0.2s;
      font-size: 14px;
    }

    .item:hover .item-remove {
      opacity: 1;
    }

    .item-remove:hover {
      color: var(--sn-error, #ef4444);
    }

    .priority-high { border-left: 3px solid var(--sn-error, #ef4444); }
    .priority-medium { border-left: 3px solid var(--sn-warning, #f59e0b); }
    .priority-low { border-left: 3px solid var(--sn-text-secondary, #94a3b8); }

    .footer {
      padding: 8px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-total {
      font-size: 12px;
    }

    .footer-total .amount {
      color: var(--sn-success, #22c55e);
      font-weight: 600;
    }

    .footer-actions {
      display: flex;
      gap: 6px;
    }

    .footer-btn {
      padding: 6px 12px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: var(--sn-radius-sm, 4px);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .footer-btn:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    .footer-btn.primary {
      background: var(--sn-accent-primary, #8b5cf6);
      border-color: var(--sn-accent-primary, #8b5cf6);
      color: white;
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

    .channel-selector-container {
      padding: 8px 12px;
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    ${PORT_CHANNEL_SELECTOR_STYLES()}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Shopping List</h2>
      <div class="stats">
        <div class="stat">
          <span>Items:</span>
          <span class="stat-value" id="item-count">0</span>
        </div>
        <div class="stat">
          <span>Checked:</span>
          <span class="stat-value" id="checked-count">0</span>
        </div>
      </div>
    </div>

    <div class="add-section">
      <div class="add-row">
        <input type="text" class="add-input" id="item-input" placeholder="Add item..." />
        <select class="category-select" id="category-select">
          <option value="produce">🥬 Produce</option>
          <option value="dairy">🥛 Dairy</option>
          <option value="meat">🥩 Meat</option>
          <option value="seafood">🐟 Seafood</option>
          <option value="bakery">🍞 Bakery</option>
          <option value="frozen">🧊 Frozen</option>
          <option value="pantry">🥫 Pantry</option>
          <option value="beverages">🥤 Beverages</option>
          <option value="snacks">🍿 Snacks</option>
          <option value="household">🧹 Household</option>
          <option value="personal">🧴 Personal</option>
          <option value="other">📦 Other</option>
        </select>
      </div>
      <div class="add-row">
        <input type="number" class="add-input" id="quantity-input" placeholder="Qty" style="width: 60px; flex: none;" value="1" min="1" />
        <input type="number" class="add-input" id="price-input" placeholder="Est. price" step="0.01" style="width: 80px; flex: none;" />
        <select class="priority-select" id="priority-select">
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="low">Low</option>
        </select>
        <button class="add-btn" id="add-btn">Add</button>
      </div>
    </div>

    <div class="list-container" id="list-container">
      <div class="empty-state" id="empty-state">
        <div class="icon">🛒</div>
        <div>Your shopping list is empty</div>
        <div style="font-size: 11px; margin-top: 4px;">Add items above to get started</div>
      </div>
    </div>

    <div class="channel-selector-container" id="channel-selector-container"></div>

    <div class="footer">
      <div class="footer-total">
        Est. Total: <span class="amount" id="total-amount">$0.00</span>
      </div>
      <div class="footer-actions">
        <button class="footer-btn" id="clear-checked-btn">Clear Checked</button>
        <button class="footer-btn primary" id="send-to-pantry-btn">Send to Pantry</button>
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
      let listId = null;

      // Category icons
      const categoryIcons = {
        produce: '🥬', dairy: '🥛', meat: '🥩', seafood: '🐟',
        bakery: '🍞', frozen: '🧊', pantry: '🥫', beverages: '🥤',
        snacks: '🍿', household: '🧹', personal: '🧴', other: '📦'
      };

      // DOM Elements
      const itemInput = document.getElementById('item-input');
      const categorySelect = document.getElementById('category-select');
      const quantityInput = document.getElementById('quantity-input');
      const priceInput = document.getElementById('price-input');
      const prioritySelect = document.getElementById('priority-select');
      const addBtn = document.getElementById('add-btn');
      const listContainer = document.getElementById('list-container');
      const emptyState = document.getElementById('empty-state');
      const itemCount = document.getElementById('item-count');
      const checkedCount = document.getElementById('checked-count');
      const totalAmount = document.getElementById('total-amount');
      const clearCheckedBtn = document.getElementById('clear-checked-btn');
      const sendToPantryBtn = document.getElementById('send-to-pantry-btn');
      const channelContainer = document.getElementById('channel-selector-container');

      // Create channel selector for sending to pantry
      let pantryChannel = null;
      if (window.PortChannelSelector) {
        pantryChannel = window.PortChannelSelector.create('items.checked', channelContainer, {
          label: 'Send checked to:',
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
          name: itemData.name || 'Unnamed Item',
          category: itemData.category || 'other',
          quantity: itemData.quantity || 1,
          unit: itemData.unit || 'count',
          priority: itemData.priority || 'medium',
          estimatedPrice: itemData.estimatedPrice || itemData.price || null,
          checked: false,
          notes: itemData.notes || '',
          recipeId: itemData.recipeId || null,
          createdAt: Date.now()
        };

        items.push(item);
        renderList();
        emitListChanged();
        API.log('Added item: ' + item.name);
      }

      // Remove item
      function removeItem(id) {
        items = items.filter(item => item.id !== id);
        renderList();
        emitListChanged();
      }

      // Toggle item checked
      function toggleItem(id) {
        const item = items.find(i => i.id === id);
        if (item) {
          item.checked = !item.checked;
          if (item.checked) {
            API.emitOutput('item.checked', {
              id: item.id,
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit,
              price: item.estimatedPrice
            });
          }
          renderList();
          emitListChanged();
        }
      }

      // Emit list changed
      function emitListChanged() {
        API.emitOutput('list.changed', items);
        updateStats();
      }

      // Update stats
      function updateStats() {
        const unchecked = items.filter(i => !i.checked);
        const checked = items.filter(i => i.checked);

        itemCount.textContent = unchecked.length;
        checkedCount.textContent = checked.length;

        const total = unchecked.reduce((sum, item) => {
          return sum + (item.estimatedPrice || 0) * item.quantity;
        }, 0);

        totalAmount.textContent = '$' + total.toFixed(2);
        API.emitOutput('total.estimated', total);
      }

      // Render list
      function renderList() {
        // Group by category
        const groups = {};
        items.forEach(item => {
          if (!groups[item.category]) {
            groups[item.category] = [];
          }
          groups[item.category].push(item);
        });

        // Sort categories
        const categoryOrder = ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen', 'pantry', 'beverages', 'snacks', 'household', 'personal', 'other'];
        const sortedCategories = categoryOrder.filter(cat => groups[cat] && groups[cat].length > 0);

        if (sortedCategories.length === 0) {
          listContainer.innerHTML = '';
          listContainer.appendChild(emptyState);
          emptyState.style.display = 'flex';
          return;
        }

        emptyState.style.display = 'none';

        let html = '';
        sortedCategories.forEach(category => {
          const categoryItems = groups[category];
          const icon = categoryIcons[category] || '📦';

          html += '<div class="category-group">';
          html += '<div class="category-header">' + icon + ' ' + category.charAt(0).toUpperCase() + category.slice(1) + ' (' + categoryItems.length + ')</div>';

          // Sort: unchecked first, then by priority
          categoryItems.sort((a, b) => {
            if (a.checked !== b.checked) return a.checked ? 1 : -1;
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });

          categoryItems.forEach(item => {
            const priceDisplay = item.estimatedPrice
              ? '$' + (item.estimatedPrice * item.quantity).toFixed(2)
              : '';

            html += '<div class="item priority-' + item.priority + (item.checked ? ' checked' : '') + '" data-id="' + item.id + '">';
            html += '<div class="item-checkbox' + (item.checked ? ' checked' : '') + '" data-action="toggle"></div>';
            html += '<div class="item-content">';
            html += '<div class="item-name">' + escapeHtml(item.name) + '</div>';
            html += '<div class="item-details">';
            html += '<span>Qty: ' + item.quantity + '</span>';
            if (item.recipeId) html += '<span>📋 Recipe</span>';
            html += '</div>';
            html += '</div>';
            if (priceDisplay) html += '<div class="item-price">' + priceDisplay + '</div>';
            html += '<button class="item-remove" data-action="remove">×</button>';
            html += '</div>';
          });

          html += '</div>';
        });

        listContainer.innerHTML = html;

        // Attach event listeners
        listContainer.querySelectorAll('.item').forEach(el => {
          const id = el.dataset.id;

          el.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleItem(id));
          el.querySelector('[data-action="remove"]').addEventListener('click', () => removeItem(id));
        });

        updateStats();
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Clear checked items
      function clearChecked() {
        items = items.filter(item => !item.checked);
        renderList();
        emitListChanged();
      }

      // Send checked to pantry
      function sendToPantry() {
        const checkedItems = items.filter(item => item.checked);
        if (checkedItems.length === 0) {
          API.log('No checked items to send');
          return;
        }

        const pantryItems = checkedItems.map(item => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          purchasePrice: item.estimatedPrice,
          purchaseDate: Date.now()
        }));

        // Use channel selector if available
        if (pantryChannel) {
          pantryChannel.emitToSelected(pantryItems);
        } else {
          API.emitOutput('items.checked', pantryItems);
        }

        // Also emit broadcast event
        API.emit('grocery.items.purchased', pantryItems);

        // Clear checked items after sending
        clearChecked();

        API.log('Sent ' + pantryItems.length + ' items to pantry');
      }

      // Add button click
      addBtn.addEventListener('click', () => {
        const name = itemInput.value.trim();
        if (!name) return;

        addItem({
          name: name,
          category: categorySelect.value,
          quantity: parseInt(quantityInput.value) || 1,
          priority: prioritySelect.value,
          estimatedPrice: parseFloat(priceInput.value) || null
        });

        itemInput.value = '';
        quantityInput.value = '1';
        priceInput.value = '';
        itemInput.focus();
      });

      // Enter key to add
      itemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addBtn.click();
      });

      // Footer buttons
      clearCheckedBtn.addEventListener('click', clearChecked);
      sendToPantryBtn.addEventListener('click', sendToPantry);

      // Initialize
      API.onMount(function(context) {
        const savedState = context.state || {};
        items = savedState.items || [];
        listId = savedState.listId || generateId();

        renderList();
        API.log('Shopping List mounted with ' + items.length + ' items');
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

      API.onInput('item.remove', function(id) {
        if (id) removeItem(id);
      });

      API.onInput('list.clear', function() {
        items = [];
        renderList();
        emitListChanged();
      });

      API.onInput('list.import', function(data) {
        if (Array.isArray(data)) {
          items = [];
          data.forEach(item => {
            if (item && item.name) addItem(item);
          });
        }
      });

      // Listen for broadcast events
      API.on('grocery.recipe.ingredients', function(data) {
        if (Array.isArray(data)) {
          data.forEach(ingredient => {
            addItem({
              name: ingredient.name,
              quantity: ingredient.quantity || 1,
              unit: ingredient.unit || 'count',
              category: 'other',
              priority: 'medium',
              recipeId: ingredient.recipeId
            });
          });
        }
      });

      API.on('grocery.ai.suggestion', function(data) {
        if (data && data.shoppingItems) {
          data.shoppingItems.forEach(item => addItem(item));
        }
      });

      // Save state on changes
      API.onStateChange(function(newState) {
        if (newState.items) {
          items = newState.items;
          renderList();
        }
      });

      // Periodically save state
      setInterval(function() {
        API.setState({ items: items, listId: listId });
      }, 5000);

      // Cleanup
      API.onDestroy(function() {
        API.setState({ items: items, listId: listId });
        API.log('Shopping List destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const ShoppingListWidget: BuiltinWidget = {
  manifest: ShoppingListWidgetManifest,
  get html() { return getShoppingListWidgetHTML(); },
};
