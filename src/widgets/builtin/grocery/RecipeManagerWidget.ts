/**
 * StickerNest v2 - Recipe Manager Widget
 *
 * Recipe storage and management with:
 * - Manual recipe entry with ingredients and instructions
 * - URL import (basic parsing)
 * - Ingredient availability check against pantry
 * - Add missing ingredients to shopping list
 * - Recipe favorites and tags
 * - Connect to AI Meal Suggester and Meal Planner
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';
import {
  PORT_CHANNEL_SELECTOR_STYLES,
  PORT_CHANNEL_SELECTOR_SCRIPT,
} from '../../../runtime/PortChannelSelector';

export const RecipeManagerWidgetManifest: WidgetManifest = {
  id: 'stickernest.recipe-manager',
  name: 'Recipe Manager',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Store and manage recipes with ingredient tracking and shopping list integration',
  author: 'StickerNest',
  tags: ['grocery', 'recipes', 'cooking', 'food', 'meals'],
  inputs: {
    'recipe.add': {
      type: 'object',
      description: 'Add a new recipe',
    },
    'recipe.import': {
      type: 'string',
      description: 'Import recipe from URL',
    },
    'pantry.inventory': {
      type: 'array',
      description: 'Current pantry inventory for availability check',
    },
    'recipe.markCooked': {
      type: 'string',
      description: 'Mark a recipe as cooked by ID',
    },
  },
  outputs: {
    'recipe.selected': {
      type: 'object',
      description: 'Currently selected recipe',
    },
    'ingredients.missing': {
      type: 'array',
      description: 'Missing ingredients for shopping list',
    },
    'recipe.list': {
      type: 'array',
      description: 'All recipes',
    },
    'recipe.ingredients': {
      type: 'array',
      description: 'Ingredients for a recipe (for pantry check)',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['recipe.add', 'recipe.import', 'pantry.inventory', 'recipe.markCooked'],
    outputs: ['recipe.selected', 'ingredients.missing', 'recipe.list', 'recipe.ingredients'],
  },
  events: {
    emits: ['grocery.recipe.selected', 'grocery.recipe.ingredients'],
    listens: ['grocery.pantry.updated'],
  },
  size: {
    width: 340,
    height: 480,
    minWidth: 280,
    minHeight: 400,
  },
};

export const RecipeManagerWidgetHTML = `
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
      justify-content: space-between;
    }

    .header h2::before {
      content: '📖';
      margin-right: 6px;
    }

    .recipe-count {
      font-size: 11px;
      font-weight: normal;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .tabs {
      display: flex;
      background: var(--sn-bg-tertiary, #252538);
    }

    .tab {
      flex: 1;
      padding: 8px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 11px;
      cursor: pointer;
    }

    .tab.active {
      color: var(--sn-accent-primary, #8b5cf6);
      border-bottom-color: var(--sn-accent-primary, #8b5cf6);
    }

    .search-bar {
      padding: 8px 12px;
      background: var(--sn-bg-tertiary, #252538);
      display: flex;
      gap: 8px;
    }

    .search-input {
      flex: 1;
      padding: 8px 10px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: var(--sn-radius-sm, 4px);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      outline: none;
    }

    .add-btn {
      padding: 8px 12px;
      background: var(--sn-accent-primary, #8b5cf6);
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      color: white;
      font-size: 12px;
      cursor: pointer;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    /* Recipe List View */
    .recipe-list {
      padding: 8px;
    }

    .recipe-card {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-md, 6px);
      padding: 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .recipe-card:hover {
      background: var(--sn-bg-tertiary, #252538);
    }

    .recipe-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .recipe-title {
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    }

    .recipe-favorite {
      font-size: 16px;
      cursor: pointer;
      opacity: 0.3;
      transition: opacity 0.2s;
    }

    .recipe-favorite.active {
      opacity: 1;
    }

    .recipe-meta {
      display: flex;
      gap: 12px;
      margin-top: 6px;
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .recipe-tags {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .tag {
      font-size: 10px;
      padding: 2px 6px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 10px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .availability-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
    }

    .availability-badge.full {
      background: rgba(34, 197, 94, 0.2);
      color: var(--sn-success, #22c55e);
    }

    .availability-badge.partial {
      background: rgba(245, 158, 11, 0.2);
      color: var(--sn-warning, #f59e0b);
    }

    .availability-badge.none {
      background: rgba(239, 68, 68, 0.2);
      color: var(--sn-error, #ef4444);
    }

    /* Recipe Detail View */
    .recipe-detail {
      display: none;
      padding: 12px;
    }

    .recipe-detail.active {
      display: block;
    }

    .detail-header {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .back-btn {
      padding: 6px 10px;
      background: var(--sn-bg-tertiary, #252538);
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      cursor: pointer;
      margin-right: 12px;
    }

    .detail-title {
      flex: 1;
    }

    .detail-name {
      font-size: 16px;
      font-weight: 600;
    }

    .detail-meta {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-top: 4px;
    }

    .section {
      margin-bottom: 16px;
    }

    .section-header {
      font-size: 12px;
      font-weight: 600;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ingredient-list {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-sm, 4px);
      overflow: hidden;
    }

    .ingredient-item {
      display: flex;
      align-items: center;
      padding: 8px 10px;
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.1));
    }

    .ingredient-item:last-child {
      border-bottom: none;
    }

    .ingredient-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 10px;
    }

    .ingredient-status.available {
      background: var(--sn-success, #22c55e);
    }

    .ingredient-status.missing {
      background: var(--sn-error, #ef4444);
    }

    .ingredient-name {
      flex: 1;
      font-size: 12px;
    }

    .ingredient-qty {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .instructions-list {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-sm, 4px);
      padding: 12px;
    }

    .instruction-step {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
    }

    .instruction-step:last-child {
      margin-bottom: 0;
    }

    .step-number {
      width: 24px;
      height: 24px;
      background: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .step-text {
      font-size: 12px;
      line-height: 1.5;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .action-btn {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 11px;
      cursor: pointer;
      text-align: center;
    }

    .action-btn.primary {
      background: var(--sn-accent-primary, #8b5cf6);
      border-color: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }

    .action-btn.secondary {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }

    /* Add Recipe Modal */
    .modal {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 100;
      overflow-y: auto;
    }

    .modal.active {
      display: block;
    }

    .modal-content {
      background: var(--sn-bg-secondary, #1a1a2e);
      margin: 20px;
      border-radius: var(--sn-radius-lg, 8px);
      padding: 16px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .modal-title {
      font-size: 14px;
      font-weight: 600;
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 20px;
      cursor: pointer;
    }

    .form-group {
      margin-bottom: 12px;
    }

    .form-label {
      display: block;
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 4px;
    }

    .form-input, .form-textarea, .form-select {
      width: 100%;
      padding: 8px 10px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: var(--sn-radius-sm, 4px);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      outline: none;
    }

    .form-textarea {
      min-height: 80px;
      resize: vertical;
      font-family: inherit;
    }

    .form-row {
      display: flex;
      gap: 8px;
    }

    .form-row .form-group {
      flex: 1;
    }

    .url-import-section {
      padding: 12px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: var(--sn-radius-sm, 4px);
      margin-bottom: 16px;
    }

    .url-import-row {
      display: flex;
      gap: 8px;
    }

    .import-btn {
      padding: 8px 12px;
      background: var(--sn-accent-primary, #8b5cf6);
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      color: white;
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
    }

    .channel-container {
      padding: 8px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .empty-state .icon {
      font-size: 32px;
      margin-bottom: 12px;
    }

    ${PORT_CHANNEL_SELECTOR_STYLES()}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>
        Recipe Manager
        <span class="recipe-count" id="recipe-count">0 recipes</span>
      </h2>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="all">All</button>
      <button class="tab" data-tab="favorites">⭐ Favorites</button>
      <button class="tab" data-tab="canMake">✓ Can Make</button>
    </div>

    <div class="search-bar">
      <input type="text" class="search-input" id="search-input" placeholder="Search recipes..." />
      <button class="add-btn" id="add-btn">+ Add</button>
    </div>

    <div class="content">
      <!-- Recipe List -->
      <div class="recipe-list" id="recipe-list"></div>

      <!-- Recipe Detail -->
      <div class="recipe-detail" id="recipe-detail"></div>
    </div>

    <div class="channel-container" id="channel-container"></div>

    <!-- Add Recipe Modal -->
    <div class="modal" id="add-modal">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">Add Recipe</div>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>

        <div class="url-import-section">
          <div class="form-label">Import from URL</div>
          <div class="url-import-row">
            <input type="url" class="form-input" id="import-url" placeholder="https://..." />
            <button class="import-btn" id="import-btn">Import</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Recipe Name *</label>
          <input type="text" class="form-input" id="recipe-name" placeholder="e.g., Spaghetti Carbonara" />
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" class="form-input" id="recipe-desc" placeholder="Brief description..." />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Prep Time (min)</label>
            <input type="number" class="form-input" id="prep-time" placeholder="15" />
          </div>
          <div class="form-group">
            <label class="form-label">Cook Time (min)</label>
            <input type="number" class="form-input" id="cook-time" placeholder="30" />
          </div>
          <div class="form-group">
            <label class="form-label">Servings</label>
            <input type="number" class="form-input" id="servings" placeholder="4" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Ingredients (one per line, format: quantity unit ingredient)</label>
          <textarea class="form-textarea" id="ingredients" placeholder="2 cups flour\n1 tsp salt\n3 large eggs"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Instructions (one step per line)</label>
          <textarea class="form-textarea" id="instructions" placeholder="Step 1: Mix dry ingredients\nStep 2: Add wet ingredients\nStep 3: Bake at 350°F"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Tags (comma separated)</label>
          <input type="text" class="form-input" id="recipe-tags" placeholder="italian, quick, vegetarian" />
        </div>

        <div class="action-buttons">
          <button class="action-btn secondary" id="cancel-btn">Cancel</button>
          <button class="action-btn primary" id="save-btn">Save Recipe</button>
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
      let recipes = [];
      let pantryItems = [];
      let currentTab = 'all';
      let searchQuery = '';
      let selectedRecipe = null;
      let viewMode = 'list'; // 'list' or 'detail'

      // DOM Elements
      const recipeList = document.getElementById('recipe-list');
      const recipeDetail = document.getElementById('recipe-detail');
      const recipeCount = document.getElementById('recipe-count');
      const searchInput = document.getElementById('search-input');
      const addBtn = document.getElementById('add-btn');
      const addModal = document.getElementById('add-modal');
      const channelContainer = document.getElementById('channel-container');

      // Create channel selector
      let shoppingChannel = null;
      if (window.PortChannelSelector) {
        shoppingChannel = window.PortChannelSelector.create('ingredients.missing', channelContainer, {
          label: 'Add missing to:',
          showAllOption: true
        });
      }

      // Generate ID
      function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      }

      // Parse ingredients text
      function parseIngredients(text) {
        return text.split('\\n')
          .map(line => line.trim())
          .filter(line => line)
          .map(line => {
            // Try to parse: "2 cups flour" or "1/2 tsp salt"
            const match = line.match(/^([\\d\\.\\/ ]+)?\\s*(\\w+)?\\s+(.+)$/);
            if (match) {
              return {
                quantity: parseFloat(match[1]) || 1,
                unit: match[2] || 'count',
                name: match[3].trim()
              };
            }
            return { quantity: 1, unit: 'count', name: line };
          });
      }

      // Parse instructions text
      function parseInstructions(text) {
        return text.split('\\n')
          .map(line => line.trim())
          .filter(line => line)
          .map(line => line.replace(/^(step\\s*\\d+[:\\.\\)]?\\s*)/i, ''));
      }

      // Add recipe
      function addRecipe(recipeData) {
        const recipe = {
          id: generateId(),
          name: recipeData.name,
          description: recipeData.description || '',
          prepTime: recipeData.prepTime || null,
          cookTime: recipeData.cookTime || null,
          servings: recipeData.servings || 4,
          ingredients: recipeData.ingredients || [],
          instructions: recipeData.instructions || [],
          tags: recipeData.tags || [],
          sourceUrl: recipeData.sourceUrl || null,
          isFavorite: false,
          timesCooked: 0,
          lastCooked: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        recipes.push(recipe);
        updateRecipeCount();
        renderList();
        emitRecipeList();

        API.log('Added recipe: ' + recipe.name);
        return recipe.id;
      }

      // Check ingredient availability
      function checkAvailability(ingredients) {
        const available = [];
        const missing = [];

        ingredients.forEach(ing => {
          const normalized = ing.name.toLowerCase();
          const found = pantryItems.find(p =>
            p.name.toLowerCase().includes(normalized) ||
            normalized.includes(p.name.toLowerCase())
          );

          if (found && found.quantity >= ing.quantity) {
            available.push({ ...ing, pantryItem: found });
          } else {
            missing.push(ing);
          }
        });

        return { available, missing };
      }

      // Get availability badge
      function getAvailabilityBadge(recipe) {
        if (!pantryItems.length) return '';

        const { available, missing } = checkAvailability(recipe.ingredients);
        const total = recipe.ingredients.length;

        if (missing.length === 0) {
          return '<span class="availability-badge full">✓ Can Make</span>';
        } else if (available.length > 0) {
          return '<span class="availability-badge partial">' + available.length + '/' + total + ' have</span>';
        } else {
          return '<span class="availability-badge none">Need all</span>';
        }
      }

      // Update recipe count
      function updateRecipeCount() {
        recipeCount.textContent = recipes.length + ' recipe' + (recipes.length !== 1 ? 's' : '');
      }

      // Emit recipe list
      function emitRecipeList() {
        API.emitOutput('recipe.list', recipes);
      }

      // Render list view
      function renderList() {
        let filtered = recipes;

        // Filter by tab
        if (currentTab === 'favorites') {
          filtered = filtered.filter(r => r.isFavorite);
        } else if (currentTab === 'canMake') {
          filtered = filtered.filter(r => {
            const { missing } = checkAvailability(r.ingredients);
            return missing.length === 0;
          });
        }

        // Filter by search
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(r =>
            r.name.toLowerCase().includes(query) ||
            r.tags.some(t => t.toLowerCase().includes(query)) ||
            r.ingredients.some(i => i.name.toLowerCase().includes(query))
          );
        }

        if (filtered.length === 0) {
          recipeList.innerHTML = '<div class="empty-state"><div class="icon">📖</div><div>No recipes found</div></div>';
          return;
        }

        let html = '';
        filtered.forEach(recipe => {
          const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
          const timeStr = totalTime > 0 ? totalTime + ' min' : '';

          html += '<div class="recipe-card" data-id="' + recipe.id + '">';
          html += '<div class="recipe-header">';
          html += '<div class="recipe-title">' + escapeHtml(recipe.name) + '</div>';
          html += '<span class="recipe-favorite' + (recipe.isFavorite ? ' active' : '') + '" data-action="favorite">⭐</span>';
          html += '</div>';

          html += '<div class="recipe-meta">';
          if (timeStr) html += '<span>⏱️ ' + timeStr + '</span>';
          if (recipe.servings) html += '<span>👥 ' + recipe.servings + '</span>';
          if (recipe.timesCooked) html += '<span>🍳 ' + recipe.timesCooked + 'x</span>';
          html += '</div>';

          html += '<div class="recipe-tags">';
          recipe.tags.slice(0, 3).forEach(tag => {
            html += '<span class="tag">' + escapeHtml(tag) + '</span>';
          });
          html += getAvailabilityBadge(recipe);
          html += '</div>';

          html += '</div>';
        });

        recipeList.innerHTML = html;

        // Attach click handlers
        recipeList.querySelectorAll('.recipe-card').forEach(card => {
          card.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'favorite') {
              toggleFavorite(card.dataset.id);
              e.stopPropagation();
              return;
            }
            showRecipeDetail(card.dataset.id);
          });
        });
      }

      // Show recipe detail
      function showRecipeDetail(recipeId) {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        selectedRecipe = recipe;
        viewMode = 'detail';

        const { available, missing } = checkAvailability(recipe.ingredients);
        const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

        let html = '';
        html += '<div class="detail-header">';
        html += '<button class="back-btn" id="back-btn">← Back</button>';
        html += '<div class="detail-title">';
        html += '<div class="detail-name">' + escapeHtml(recipe.name) + '</div>';
        html += '<div class="detail-meta">';
        if (totalTime) html += '⏱️ ' + totalTime + ' min • ';
        if (recipe.servings) html += '👥 ' + recipe.servings + ' servings';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        if (recipe.description) {
          html += '<p style="font-size:12px;color:var(--sn-text-secondary);margin-bottom:16px;">' + escapeHtml(recipe.description) + '</p>';
        }

        // Ingredients
        html += '<div class="section">';
        html += '<div class="section-header">';
        html += '<span>Ingredients (' + recipe.ingredients.length + ')</span>';
        if (missing.length > 0) {
          html += '<span style="color:var(--sn-error);font-size:10px">' + missing.length + ' missing</span>';
        }
        html += '</div>';
        html += '<div class="ingredient-list">';
        recipe.ingredients.forEach(ing => {
          const isAvailable = available.some(a => a.name === ing.name);
          html += '<div class="ingredient-item">';
          html += '<div class="ingredient-status ' + (isAvailable ? 'available' : 'missing') + '"></div>';
          html += '<div class="ingredient-name">' + escapeHtml(ing.name) + '</div>';
          html += '<div class="ingredient-qty">' + ing.quantity + ' ' + ing.unit + '</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '</div>';

        // Instructions
        if (recipe.instructions.length > 0) {
          html += '<div class="section">';
          html += '<div class="section-header"><span>Instructions</span></div>';
          html += '<div class="instructions-list">';
          recipe.instructions.forEach((step, i) => {
            html += '<div class="instruction-step">';
            html += '<div class="step-number">' + (i + 1) + '</div>';
            html += '<div class="step-text">' + escapeHtml(step) + '</div>';
            html += '</div>';
          });
          html += '</div>';
          html += '</div>';
        }

        // Action buttons
        html += '<div class="action-buttons">';
        if (missing.length > 0) {
          html += '<button class="action-btn primary" id="add-missing-btn">Add ' + missing.length + ' to Shopping</button>';
        }
        html += '<button class="action-btn secondary" id="mark-cooked-btn">Mark as Cooked</button>';
        html += '</div>';

        recipeDetail.innerHTML = html;
        recipeList.style.display = 'none';
        recipeDetail.classList.add('active');

        // Event handlers
        document.getElementById('back-btn').addEventListener('click', () => {
          viewMode = 'list';
          selectedRecipe = null;
          recipeDetail.classList.remove('active');
          recipeList.style.display = 'block';
        });

        const addMissingBtn = document.getElementById('add-missing-btn');
        if (addMissingBtn) {
          addMissingBtn.addEventListener('click', () => {
            const missingItems = missing.map(ing => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              category: 'other',
              priority: 'medium',
              recipeId: recipe.id
            }));

            if (shoppingChannel) {
              shoppingChannel.emitToSelected(missingItems);
            } else {
              API.emitOutput('ingredients.missing', missingItems);
            }

            API.emit('grocery.recipe.ingredients', missingItems);
            API.log('Added ' + missingItems.length + ' missing ingredients to shopping');
          });
        }

        document.getElementById('mark-cooked-btn').addEventListener('click', () => {
          markCooked(recipe.id);
        });

        // Emit selected recipe
        API.emitOutput('recipe.selected', recipe);
        API.emit('grocery.recipe.selected', recipe);
      }

      // Toggle favorite
      function toggleFavorite(recipeId) {
        const recipe = recipes.find(r => r.id === recipeId);
        if (recipe) {
          recipe.isFavorite = !recipe.isFavorite;
          recipe.updatedAt = Date.now();
          renderList();
        }
      }

      // Mark as cooked
      function markCooked(recipeId) {
        const recipe = recipes.find(r => r.id === recipeId);
        if (recipe) {
          recipe.timesCooked++;
          recipe.lastCooked = Date.now();
          recipe.updatedAt = Date.now();
          API.log('Marked ' + recipe.name + ' as cooked');
        }
      }

      // Import from URL (basic)
      async function importFromUrl(url) {
        try {
          // Note: This is a simplified implementation
          // Real URL import would need a backend service
          API.log('URL import attempted: ' + url);
          alert('URL import requires a backend service. Please enter recipe manually.');
        } catch (err) {
          API.log('Import error: ' + err.message);
        }
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
      }

      // Tab switching
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          currentTab = tab.dataset.tab;
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
        addModal.classList.add('active');
      });

      document.getElementById('modal-close').addEventListener('click', () => {
        addModal.classList.remove('active');
      });

      document.getElementById('cancel-btn').addEventListener('click', () => {
        addModal.classList.remove('active');
      });

      document.getElementById('import-btn').addEventListener('click', () => {
        const url = document.getElementById('import-url').value.trim();
        if (url) importFromUrl(url);
      });

      document.getElementById('save-btn').addEventListener('click', () => {
        const name = document.getElementById('recipe-name').value.trim();
        if (!name) {
          alert('Recipe name is required');
          return;
        }

        const ingredientsText = document.getElementById('ingredients').value;
        const instructionsText = document.getElementById('instructions').value;
        const tagsText = document.getElementById('recipe-tags').value;

        addRecipe({
          name: name,
          description: document.getElementById('recipe-desc').value.trim(),
          prepTime: parseInt(document.getElementById('prep-time').value) || null,
          cookTime: parseInt(document.getElementById('cook-time').value) || null,
          servings: parseInt(document.getElementById('servings').value) || 4,
          ingredients: parseIngredients(ingredientsText),
          instructions: parseInstructions(instructionsText),
          tags: tagsText.split(',').map(t => t.trim()).filter(t => t)
        });

        // Clear form
        document.getElementById('recipe-name').value = '';
        document.getElementById('recipe-desc').value = '';
        document.getElementById('prep-time').value = '';
        document.getElementById('cook-time').value = '';
        document.getElementById('servings').value = '';
        document.getElementById('ingredients').value = '';
        document.getElementById('instructions').value = '';
        document.getElementById('recipe-tags').value = '';

        addModal.classList.remove('active');
      });

      // Initialize
      API.onMount(function(context) {
        const savedState = context.state || {};
        recipes = savedState.recipes || [];
        pantryItems = savedState.pantryItems || [];

        updateRecipeCount();
        renderList();
        API.log('Recipe Manager mounted with ' + recipes.length + ' recipes');
      });

      // Handle inputs
      API.onInput('recipe.add', function(data) {
        if (data && data.name) {
          addRecipe(data);
        }
      });

      API.onInput('recipe.import', function(url) {
        if (url) importFromUrl(url);
      });

      API.onInput('pantry.inventory', function(items) {
        if (Array.isArray(items)) {
          pantryItems = items;
          renderList();
          if (selectedRecipe) {
            showRecipeDetail(selectedRecipe.id);
          }
        }
      });

      API.onInput('recipe.markCooked', function(recipeId) {
        if (recipeId) markCooked(recipeId);
      });

      // Listen for pantry updates
      API.on('grocery.pantry.updated', function(items) {
        if (Array.isArray(items)) {
          pantryItems = items;
          renderList();
        }
      });

      // Periodically save state
      setInterval(function() {
        API.setState({ recipes: recipes, pantryItems: pantryItems });
      }, 5000);

      // Cleanup
      API.onDestroy(function() {
        API.setState({ recipes: recipes, pantryItems: pantryItems });
        API.log('Recipe Manager destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const RecipeManagerWidget: BuiltinWidget = {
  manifest: RecipeManagerWidgetManifest,
  html: RecipeManagerWidgetHTML,
};
