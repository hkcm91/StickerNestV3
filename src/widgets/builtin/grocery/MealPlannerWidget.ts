/**
 * StickerNest v2 - Meal Planner Widget
 *
 * Weekly meal planning calendar with:
 * - Week view with breakfast/lunch/dinner slots
 * - Drag and drop meal assignment
 * - AI and user editable
 * - Shopping list generation for planned meals
 * - Integration with recipes and pantry
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';
import {
  PORT_CHANNEL_SELECTOR_STYLES,
  PORT_CHANNEL_SELECTOR_SCRIPT,
} from '../../../runtime/PortChannelSelector';

export const MealPlannerWidgetManifest: WidgetManifest = {
  id: 'stickernest.meal-planner',
  name: 'Meal Planner',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Weekly meal planning calendar with shopping list integration',
  author: 'StickerNest',
  tags: ['grocery', 'meal', 'planner', 'calendar', 'planning'],
  inputs: {
    'meal.add': {
      type: 'object',
      description: 'Add a meal to the plan: { date, mealType, recipeName, recipeId? }',
    },
    'meal.remove': {
      type: 'string',
      description: 'Remove a meal by ID',
    },
    'recipes.list': {
      type: 'array',
      description: 'Available recipes for selection',
    },
    'pantry.inventory': {
      type: 'array',
      description: 'Current pantry for availability check',
    },
  },
  outputs: {
    'plan.updated': {
      type: 'array',
      description: 'Updated meal plan',
    },
    'shopping.generate': {
      type: 'array',
      description: 'Shopping list for planned meals',
    },
    'recipe.needed': {
      type: 'object',
      description: 'Request recipe details for a meal',
    },
    'meal.completed': {
      type: 'object',
      description: 'Mark a meal as completed',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['meal.add', 'meal.remove', 'recipes.list', 'pantry.inventory'],
    outputs: ['plan.updated', 'shopping.generate', 'recipe.needed', 'meal.completed'],
  },
  events: {
    emits: ['grocery.mealplan.updated'],
    listens: ['grocery.meal.suggested', 'grocery.recipe.selected'],
  },
  size: {
    width: 400,
    height: 480,
    minWidth: 320,
    minHeight: 400,
  },
};

export const MealPlannerWidgetHTML = `
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
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h2 {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header h2::before {
      content: '📅';
    }

    .week-nav {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-btn {
      width: 28px;
      height: 28px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .nav-btn:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    .week-label {
      font-size: 12px;
      min-width: 120px;
      text-align: center;
    }

    .calendar-container {
      flex: 1;
      overflow: auto;
      padding: 8px;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: 60px repeat(7, 1fr);
      gap: 4px;
      min-width: 500px;
    }

    .day-header {
      text-align: center;
      padding: 8px 4px;
      font-size: 10px;
      font-weight: 600;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
    }

    .day-header.today {
      color: var(--sn-accent-primary, #8b5cf6);
    }

    .day-date {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--sn-text-primary, #e2e8f0);
      margin-top: 2px;
    }

    .day-header.today .day-date {
      background: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .meal-label {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
      padding: 8px 4px;
      text-align: right;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .meal-slot {
      min-height: 50px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-sm, 4px);
      padding: 4px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .meal-slot:hover {
      border-color: var(--sn-border-primary, rgba(139, 92, 246, 0.3));
    }

    .meal-slot.empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 18px;
      opacity: 0.3;
    }

    .meal-slot.empty:hover {
      opacity: 0.6;
    }

    .meal-item {
      background: var(--sn-bg-tertiary, #252538);
      border-radius: var(--sn-radius-sm, 4px);
      padding: 6px;
      font-size: 10px;
      position: relative;
    }

    .meal-item.completed {
      opacity: 0.5;
    }

    .meal-item.completed::after {
      content: '✓';
      position: absolute;
      top: 2px;
      right: 4px;
      color: var(--sn-success, #22c55e);
    }

    .meal-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meal-meta {
      font-size: 9px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-top: 2px;
      display: flex;
      gap: 4px;
    }

    .meal-available {
      color: var(--sn-success, #22c55e);
    }

    .meal-missing {
      color: var(--sn-error, #ef4444);
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

    .footer-actions {
      display: flex;
      gap: 6px;
    }

    .footer-btn {
      padding: 6px 12px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 11px;
      cursor: pointer;
    }

    .footer-btn.secondary {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }

    .footer-btn.primary {
      background: var(--sn-accent-primary, #8b5cf6);
      border-color: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }

    /* Add meal modal */
    .modal {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }

    .modal.active {
      display: flex;
    }

    .modal-content {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-lg, 8px);
      padding: 16px;
      width: 90%;
      max-width: 300px;
      max-height: 80%;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
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

    .recipe-list {
      max-height: 150px;
      overflow-y: auto;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: var(--sn-radius-sm, 4px);
    }

    .recipe-option {
      padding: 8px 10px;
      cursor: pointer;
      font-size: 12px;
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.1));
    }

    .recipe-option:last-child {
      border-bottom: none;
    }

    .recipe-option:hover {
      background: var(--sn-bg-secondary, #1a1a2e);
    }

    .recipe-option.selected {
      background: rgba(139, 92, 246, 0.2);
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

    .channel-container {
      padding: 8px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    ${PORT_CHANNEL_SELECTOR_STYLES()}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Meal Planner</h2>
      <div class="week-nav">
        <button class="nav-btn" id="prev-week">‹</button>
        <span class="week-label" id="week-label">This Week</span>
        <button class="nav-btn" id="next-week">›</button>
      </div>
    </div>

    <div class="calendar-container">
      <div class="calendar-grid" id="calendar-grid"></div>
    </div>

    <div class="channel-container" id="channel-container"></div>

    <div class="footer">
      <div class="footer-stats" id="footer-stats">0 meals planned</div>
      <div class="footer-actions">
        <button class="footer-btn secondary" id="clear-btn">Clear Week</button>
        <button class="footer-btn primary" id="shopping-btn">🛒 Generate List</button>
      </div>
    </div>

    <!-- Add Meal Modal -->
    <div class="modal" id="add-modal">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">Add Meal</div>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>

        <div class="form-group">
          <label class="form-label">Meal Name</label>
          <input type="text" class="form-input" id="meal-name" placeholder="Enter meal name..." />
        </div>

        <div class="form-group">
          <label class="form-label">Or Select Recipe</label>
          <div class="recipe-list" id="recipe-list">
            <div style="padding: 10px; color: var(--sn-text-secondary); font-size: 11px; text-align: center;">
              No recipes available
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Servings</label>
          <input type="number" class="form-input" id="meal-servings" value="4" min="1" />
        </div>

        <div class="modal-actions">
          <button class="modal-btn cancel" id="cancel-btn">Cancel</button>
          <button class="modal-btn save" id="save-btn">Add Meal</button>
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
      let meals = [];
      let recipes = [];
      let pantryItems = [];
      let currentWeekStart = getWeekStart(new Date());
      let selectedSlot = null;
      let selectedRecipeId = null;

      // DOM Elements
      const calendarGrid = document.getElementById('calendar-grid');
      const weekLabel = document.getElementById('week-label');
      const footerStats = document.getElementById('footer-stats');
      const addModal = document.getElementById('add-modal');
      const recipeList = document.getElementById('recipe-list');
      const channelContainer = document.getElementById('channel-container');

      // Create channel selector
      let shoppingChannel = null;
      if (window.PortChannelSelector) {
        shoppingChannel = window.PortChannelSelector.create('shopping.generate', channelContainer, {
          label: 'Send list to:',
          showAllOption: true
        });
      }

      // Get week start (Sunday)
      function getWeekStart(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        return d;
      }

      // Format date
      function formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      // Generate unique ID
      function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      }

      // Get meals for a specific date and meal type
      function getMealsFor(date, mealType) {
        const dateStart = new Date(date).setHours(0, 0, 0, 0);
        const dateEnd = dateStart + 24 * 60 * 60 * 1000;

        return meals.filter(m =>
          m.date >= dateStart && m.date < dateEnd && m.mealType === mealType
        );
      }

      // Check ingredient availability
      function checkMealAvailability(meal) {
        if (!meal.recipeId || !pantryItems.length) return null;

        const recipe = recipes.find(r => r.id === meal.recipeId);
        if (!recipe) return null;

        let available = 0;
        let total = recipe.ingredients?.length || 0;

        recipe.ingredients?.forEach(ing => {
          const name = ing.name.toLowerCase();
          const found = pantryItems.find(p =>
            p.name.toLowerCase().includes(name) ||
            name.includes(p.name.toLowerCase())
          );
          if (found) available++;
        });

        return { available, total };
      }

      // Update week label
      function updateWeekLabel() {
        const endOfWeek = new Date(currentWeekStart);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        const today = new Date();
        const thisWeekStart = getWeekStart(today);

        if (currentWeekStart.getTime() === thisWeekStart.getTime()) {
          weekLabel.textContent = 'This Week';
        } else {
          weekLabel.textContent = formatDate(currentWeekStart) + ' - ' + formatDate(endOfWeek);
        }
      }

      // Render calendar
      function renderCalendar() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        const mealIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

        let html = '';

        // Header row
        html += '<div></div>'; // Empty corner
        for (let i = 0; i < 7; i++) {
          const date = new Date(currentWeekStart);
          date.setDate(date.getDate() + i);
          const isToday = date.getTime() === today.getTime();

          html += '<div class="day-header' + (isToday ? ' today' : '') + '">';
          html += days[date.getDay()];
          html += '<span class="day-date">' + date.getDate() + '</span>';
          html += '</div>';
        }

        // Meal rows
        mealTypes.forEach(mealType => {
          html += '<div class="meal-label">' + mealIcons[mealType] + ' ' + mealType.charAt(0).toUpperCase() + mealType.slice(1) + '</div>';

          for (let i = 0; i < 7; i++) {
            const date = new Date(currentWeekStart);
            date.setDate(date.getDate() + i);
            const dateMs = date.getTime();

            const mealsForSlot = getMealsFor(date, mealType);
            const slotKey = dateMs + '-' + mealType;

            html += '<div class="meal-slot' + (mealsForSlot.length === 0 ? ' empty' : '') + '" data-date="' + dateMs + '" data-type="' + mealType + '">';

            if (mealsForSlot.length === 0) {
              html += '+';
            } else {
              mealsForSlot.forEach(meal => {
                const availability = checkMealAvailability(meal);
                html += '<div class="meal-item' + (meal.isCompleted ? ' completed' : '') + '" data-id="' + meal.id + '">';
                html += '<div class="meal-name">' + escapeHtml(meal.recipeName) + '</div>';
                html += '<div class="meal-meta">';
                html += '<span>👥 ' + meal.servings + '</span>';
                if (availability) {
                  if (availability.available === availability.total) {
                    html += '<span class="meal-available">✓ Ready</span>';
                  } else {
                    html += '<span class="meal-missing">' + availability.available + '/' + availability.total + '</span>';
                  }
                }
                html += '</div>';
                html += '</div>';
              });
            }

            html += '</div>';
          }
        });

        calendarGrid.innerHTML = html;

        // Attach click handlers
        calendarGrid.querySelectorAll('.meal-slot').forEach(slot => {
          slot.addEventListener('click', (e) => {
            const mealItem = e.target.closest('.meal-item');
            if (mealItem) {
              // Toggle completed
              const mealId = mealItem.dataset.id;
              toggleMealCompleted(mealId);
            } else {
              // Open add modal
              selectedSlot = {
                date: parseInt(slot.dataset.date),
                mealType: slot.dataset.type
              };
              openAddModal();
            }
          });
        });

        updateStats();
        updateWeekLabel();
      }

      // Toggle meal completed
      function toggleMealCompleted(mealId) {
        const meal = meals.find(m => m.id === mealId);
        if (meal) {
          meal.isCompleted = !meal.isCompleted;
          meal.updatedAt = Date.now();

          if (meal.isCompleted) {
            API.emitOutput('meal.completed', meal);
          }

          renderCalendar();
          emitPlanUpdated();
        }
      }

      // Open add modal
      function openAddModal() {
        document.getElementById('meal-name').value = '';
        document.getElementById('meal-servings').value = '4';
        selectedRecipeId = null;

        // Populate recipe list
        if (recipes.length > 0) {
          let recipeHtml = '';
          recipes.forEach(recipe => {
            recipeHtml += '<div class="recipe-option" data-id="' + recipe.id + '">';
            recipeHtml += escapeHtml(recipe.name);
            recipeHtml += '</div>';
          });
          recipeList.innerHTML = recipeHtml;

          recipeList.querySelectorAll('.recipe-option').forEach(opt => {
            opt.addEventListener('click', () => {
              recipeList.querySelectorAll('.recipe-option').forEach(o => o.classList.remove('selected'));
              opt.classList.add('selected');
              selectedRecipeId = opt.dataset.id;
              document.getElementById('meal-name').value = opt.textContent;
            });
          });
        }

        addModal.classList.add('active');
      }

      // Add meal
      function addMeal(mealData) {
        const meal = {
          id: generateId(),
          date: mealData.date,
          mealType: mealData.mealType,
          recipeName: mealData.recipeName,
          recipeId: mealData.recipeId || null,
          servings: mealData.servings || 4,
          notes: mealData.notes || '',
          isCompleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        meals.push(meal);
        renderCalendar();
        emitPlanUpdated();

        API.log('Added meal: ' + meal.recipeName);
        return meal.id;
      }

      // Remove meal
      function removeMeal(mealId) {
        meals = meals.filter(m => m.id !== mealId);
        renderCalendar();
        emitPlanUpdated();
      }

      // Clear week
      function clearWeek() {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        meals = meals.filter(m =>
          m.date < currentWeekStart.getTime() || m.date >= weekEnd.getTime()
        );

        renderCalendar();
        emitPlanUpdated();
      }

      // Generate shopping list for week
      function generateShoppingList() {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekMeals = meals.filter(m =>
          m.date >= currentWeekStart.getTime() &&
          m.date < weekEnd.getTime() &&
          !m.isCompleted
        );

        const ingredientMap = new Map();

        weekMeals.forEach(meal => {
          if (!meal.recipeId) return;

          const recipe = recipes.find(r => r.id === meal.recipeId);
          if (!recipe || !recipe.ingredients) return;

          recipe.ingredients.forEach(ing => {
            const key = ing.name.toLowerCase();
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key);
              existing.quantity += ing.quantity * meal.servings;
            } else {
              ingredientMap.set(key, {
                name: ing.name,
                quantity: ing.quantity * meal.servings,
                unit: ing.unit,
                category: 'other',
                priority: 'medium',
                notes: 'For meal plan'
              });
            }
          });
        });

        const shoppingItems = Array.from(ingredientMap.values());

        // Filter out items already in pantry
        const filteredItems = shoppingItems.filter(item => {
          const name = item.name.toLowerCase();
          const inPantry = pantryItems.find(p =>
            p.name.toLowerCase().includes(name) && p.quantity >= item.quantity
          );
          return !inPantry;
        });

        if (filteredItems.length === 0) {
          API.log('No shopping needed - all ingredients available');
          return;
        }

        if (shoppingChannel) {
          shoppingChannel.emitToSelected(filteredItems);
        } else {
          API.emitOutput('shopping.generate', filteredItems);
        }

        API.log('Generated shopping list with ' + filteredItems.length + ' items');
      }

      // Update stats
      function updateStats() {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekMeals = meals.filter(m =>
          m.date >= currentWeekStart.getTime() && m.date < weekEnd.getTime()
        );

        const completed = weekMeals.filter(m => m.isCompleted).length;

        footerStats.textContent = weekMeals.length + ' meals planned' +
          (completed > 0 ? ' (' + completed + ' done)' : '');
      }

      // Emit plan updated
      function emitPlanUpdated() {
        API.emitOutput('plan.updated', meals);
        API.emit('grocery.mealplan.updated', meals);
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
      }

      // Week navigation
      document.getElementById('prev-week').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderCalendar();
      });

      document.getElementById('next-week').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderCalendar();
      });

      // Modal handlers
      document.getElementById('modal-close').addEventListener('click', () => {
        addModal.classList.remove('active');
      });

      document.getElementById('cancel-btn').addEventListener('click', () => {
        addModal.classList.remove('active');
      });

      document.getElementById('save-btn').addEventListener('click', () => {
        const name = document.getElementById('meal-name').value.trim();
        if (!name) {
          alert('Please enter a meal name');
          return;
        }

        addMeal({
          date: selectedSlot.date,
          mealType: selectedSlot.mealType,
          recipeName: name,
          recipeId: selectedRecipeId,
          servings: parseInt(document.getElementById('meal-servings').value) || 4
        });

        addModal.classList.remove('active');
      });

      // Footer buttons
      document.getElementById('clear-btn').addEventListener('click', () => {
        if (confirm('Clear all meals for this week?')) {
          clearWeek();
        }
      });

      document.getElementById('shopping-btn').addEventListener('click', generateShoppingList);

      // Initialize
      API.onMount(function(context) {
        const savedState = context.state || {};
        meals = savedState.meals || [];
        recipes = savedState.recipes || [];
        pantryItems = savedState.pantryItems || [];

        renderCalendar();
        API.log('Meal Planner mounted with ' + meals.length + ' meals');
      });

      // Handle inputs
      API.onInput('meal.add', function(data) {
        if (data && data.recipeName) {
          addMeal(data);
        }
      });

      API.onInput('meal.remove', function(mealId) {
        if (mealId) removeMeal(mealId);
      });

      API.onInput('recipes.list', function(recipesList) {
        if (Array.isArray(recipesList)) {
          recipes = recipesList;
          renderCalendar();
        }
      });

      API.onInput('pantry.inventory', function(items) {
        if (Array.isArray(items)) {
          pantryItems = items;
          renderCalendar();
        }
      });

      // Listen for broadcasts
      API.on('grocery.meal.suggested', function(mealData) {
        if (mealData && mealData.recipeName) {
          addMeal({
            date: mealData.date || (Date.now() + 24 * 60 * 60 * 1000),
            mealType: mealData.mealType || 'dinner',
            recipeName: mealData.recipeName,
            recipeId: mealData.recipeId,
            servings: mealData.servings || 4
          });
        }
      });

      API.on('grocery.pantry.updated', function(items) {
        if (Array.isArray(items)) {
          pantryItems = items;
          renderCalendar();
        }
      });

      // Save state
      setInterval(function() {
        API.setState({
          meals: meals,
          recipes: recipes,
          pantryItems: pantryItems
        });
      }, 5000);

      // Cleanup
      API.onDestroy(function() {
        API.setState({
          meals: meals,
          recipes: recipes,
          pantryItems: pantryItems
        });
        API.log('Meal Planner destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MealPlannerWidget: BuiltinWidget = {
  manifest: MealPlannerWidgetManifest,
  html: MealPlannerWidgetHTML,
};
