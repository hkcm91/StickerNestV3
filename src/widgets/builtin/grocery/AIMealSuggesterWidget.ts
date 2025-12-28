/**
 * StickerNest v2 - AI Meal Suggester Widget
 *
 * AI-powered meal suggestions based on:
 * - Current pantry inventory
 * - Saved recipes
 * - Shopping budget
 * - Dietary preferences and restrictions
 * - Ingredient overlap for efficiency
 * - Meal variety and nutrition
 *
 * Can save suggestions to recipes and add to shopping list.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';
import {
  PORT_CHANNEL_SELECTOR_STYLES,
  PORT_CHANNEL_SELECTOR_SCRIPT,
} from '../../../runtime/PortChannelSelector';

export const AIMealSuggesterWidgetManifest: WidgetManifest = {
  id: 'stickernest.ai-meal-suggester',
  name: 'AI Meal Suggester',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'AI-powered meal suggestions based on pantry, recipes, and preferences',
  author: 'StickerNest',
  tags: ['grocery', 'ai', 'meals', 'suggestions', 'planning'],
  inputs: {
    'pantry.inventory': {
      type: 'array',
      description: 'Current pantry inventory',
    },
    'recipes.list': {
      type: 'array',
      description: 'Available recipes',
    },
    'preferences.set': {
      type: 'object',
      description: 'User preferences and dietary restrictions',
    },
    'trigger.suggest': {
      type: 'trigger',
      description: 'Trigger new meal suggestions',
    },
  },
  outputs: {
    'meal.suggested': {
      type: 'object',
      description: 'A suggested meal with recipe',
    },
    'recipe.save': {
      type: 'object',
      description: 'Save a new recipe from suggestion',
    },
    'shopping.items': {
      type: 'array',
      description: 'Items needed for suggested meals',
    },
    'mealplan.add': {
      type: 'object',
      description: 'Add meal to meal planner',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['pantry.inventory', 'recipes.list', 'preferences.set', 'trigger.suggest'],
    outputs: ['meal.suggested', 'recipe.save', 'shopping.items', 'mealplan.add'],
  },
  events: {
    emits: ['grocery.ai.suggestion', 'grocery.meal.suggested'],
    listens: ['grocery.pantry.updated', 'grocery.recipe.list'],
  },
  size: {
    width: 320,
    height: 500,
    minWidth: 280,
    minHeight: 400,
  },
};

// Use a function to avoid TDZ issues with PORT_CHANNEL_SELECTOR imports
const getAIMealSuggesterWidgetHTML = () => `
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
      background: linear-gradient(135deg, var(--sn-bg-secondary, #1a1a2e), rgba(139, 92, 246, 0.1));
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
      content: '🤖';
    }

    .ai-badge {
      font-size: 9px;
      padding: 2px 6px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .context-bar {
      padding: 8px 12px;
      background: var(--sn-bg-tertiary, #252538);
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 10px;
    }

    .context-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 12px;
    }

    .context-value {
      color: var(--sn-accent-primary, #8b5cf6);
      font-weight: 600;
    }

    .preferences-section {
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.1));
    }

    .pref-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .pref-row:last-child {
      margin-bottom: 0;
    }

    .pref-chip {
      padding: 4px 10px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 14px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pref-chip:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    .pref-chip.active {
      background: var(--sn-accent-primary, #8b5cf6);
      border-color: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }

    .generate-section {
      padding: 12px;
      text-align: center;
    }

    .generate-btn {
      width: 100%;
      padding: 12px 20px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none;
      border-radius: var(--sn-radius-md, 6px);
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .generate-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }

    .generate-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .generate-btn .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .suggestions-container {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .suggestion-card {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-md, 6px);
      padding: 14px;
      margin-bottom: 10px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      transition: all 0.2s;
    }

    .suggestion-card:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    .suggestion-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .suggestion-title {
      font-size: 14px;
      font-weight: 600;
    }

    .suggestion-type {
      font-size: 10px;
      padding: 2px 8px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 10px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .suggestion-description {
      font-size: 12px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 10px;
      line-height: 1.4;
    }

    .suggestion-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 10px;
    }

    .suggestion-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .tag {
      font-size: 9px;
      padding: 2px 6px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 8px;
    }

    .tag.match {
      background: rgba(34, 197, 94, 0.2);
      color: var(--sn-success, #22c55e);
    }

    .suggestion-ingredients {
      font-size: 11px;
      padding: 8px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: var(--sn-radius-sm, 4px);
      margin-bottom: 10px;
    }

    .ingredients-title {
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }

    .ingredients-list {
      color: var(--sn-text-secondary, #94a3b8);
    }

    .ingredient-available {
      color: var(--sn-success, #22c55e);
    }

    .ingredient-missing {
      color: var(--sn-error, #ef4444);
    }

    .suggestion-actions {
      display: flex;
      gap: 6px;
    }

    .action-btn {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 10px;
      cursor: pointer;
      transition: all 0.2s;
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

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: var(--sn-text-secondary, #94a3b8);
      padding: 20px;
    }

    .empty-state .icon {
      font-size: 40px;
      margin-bottom: 12px;
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
      <h2>
        AI Meal Suggester
        <span class="ai-badge">AI Powered</span>
      </h2>
    </div>

    <div class="context-bar" id="context-bar">
      <div class="context-item">
        <span>🥬</span>
        <span>Pantry:</span>
        <span class="context-value" id="pantry-count">0</span>
      </div>
      <div class="context-item">
        <span>📖</span>
        <span>Recipes:</span>
        <span class="context-value" id="recipe-count">0</span>
      </div>
    </div>

    <div class="preferences-section">
      <div class="pref-row">
        <span class="pref-chip" data-pref="quick">⚡ Quick (<30min)</span>
        <span class="pref-chip" data-pref="budget">💰 Budget</span>
        <span class="pref-chip" data-pref="healthy">🥗 Healthy</span>
      </div>
      <div class="pref-row">
        <span class="pref-chip" data-pref="vegetarian">🥬 Vegetarian</span>
        <span class="pref-chip" data-pref="lowcarb">🥩 Low Carb</span>
        <span class="pref-chip" data-pref="comfort">🍲 Comfort</span>
      </div>
    </div>

    <div class="generate-section">
      <button class="generate-btn" id="generate-btn">
        <span>✨</span>
        <span>Generate Meal Ideas</span>
      </button>
    </div>

    <div class="suggestions-container" id="suggestions-container">
      <div class="empty-state" id="empty-state">
        <div class="icon">🤖</div>
        <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">Ready to suggest meals!</div>
        <div style="font-size: 12px;">Select preferences and click Generate</div>
      </div>
    </div>

    <div class="channel-container" id="channel-container"></div>
  </div>

  <script>
    ${PORT_CHANNEL_SELECTOR_SCRIPT()}
  </script>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let pantryItems = [];
      let recipes = [];
      let suggestions = [];
      let activePrefs = new Set();
      let isGenerating = false;

      // DOM Elements
      const generateBtn = document.getElementById('generate-btn');
      const suggestionsContainer = document.getElementById('suggestions-container');
      const emptyState = document.getElementById('empty-state');
      const pantryCount = document.getElementById('pantry-count');
      const recipeCount = document.getElementById('recipe-count');
      const channelContainer = document.getElementById('channel-container');

      // Create channel selectors
      let recipeChannel = null;
      let shoppingChannel = null;
      let mealplanChannel = null;

      if (window.PortChannelSelector) {
        const recipeContainer = document.createElement('div');
        const shoppingContainer = document.createElement('div');
        channelContainer.appendChild(recipeContainer);
        channelContainer.appendChild(shoppingContainer);

        recipeChannel = window.PortChannelSelector.create('recipe.save', recipeContainer, {
          label: 'Save to:',
          showAllOption: true
        });
        shoppingChannel = window.PortChannelSelector.create('shopping.items', shoppingContainer, {
          label: 'Shop:',
          showAllOption: true
        });
      }

      // Preference chips
      document.querySelectorAll('.pref-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const pref = chip.dataset.pref;
          if (activePrefs.has(pref)) {
            activePrefs.delete(pref);
            chip.classList.remove('active');
          } else {
            activePrefs.add(pref);
            chip.classList.add('active');
          }
        });
      });

      // Generate button
      generateBtn.addEventListener('click', () => {
        if (!isGenerating) {
          generateSuggestions();
        }
      });

      // Generate AI suggestions
      async function generateSuggestions() {
        isGenerating = true;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<div class="spinner"></div><span>Thinking...</span>';

        try {
          // Simulate AI thinking time
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Generate suggestions based on context
          suggestions = generateMealIdeas();

          renderSuggestions();

          API.log('Generated ' + suggestions.length + ' meal suggestions');

        } catch (err) {
          API.log('Generation error: ' + err.message);
        } finally {
          isGenerating = false;
          generateBtn.disabled = false;
          generateBtn.innerHTML = '<span>✨</span><span>Generate Meal Ideas</span>';
        }
      }

      // Generate meal ideas based on pantry and preferences
      function generateMealIdeas() {
        const ideas = [];
        const prefs = Array.from(activePrefs);

        // Meal templates
        const templates = [
          {
            name: 'Quick Stir Fry',
            description: 'A fast and healthy stir fry with whatever vegetables you have on hand.',
            type: 'dinner',
            time: 20,
            tags: ['quick', 'healthy', 'asian'],
            baseIngredients: ['oil', 'garlic', 'soy sauce'],
            flexIngredients: ['vegetables', 'protein', 'rice'],
          },
          {
            name: 'Pasta Primavera',
            description: 'Classic Italian pasta loaded with fresh vegetables and parmesan.',
            type: 'dinner',
            time: 25,
            tags: ['vegetarian', 'italian', 'comfort'],
            baseIngredients: ['pasta', 'olive oil', 'garlic', 'parmesan'],
            flexIngredients: ['tomatoes', 'zucchini', 'bell pepper'],
          },
          {
            name: 'Sheet Pan Chicken',
            description: 'Easy one-pan chicken dinner with roasted vegetables.',
            type: 'dinner',
            time: 45,
            tags: ['healthy', 'meal prep', 'easy'],
            baseIngredients: ['chicken', 'olive oil', 'seasonings'],
            flexIngredients: ['potatoes', 'broccoli', 'carrots'],
          },
          {
            name: 'Buddha Bowl',
            description: 'Nutritious grain bowl with protein, vegetables, and tahini dressing.',
            type: 'lunch',
            time: 30,
            tags: ['healthy', 'vegetarian', 'meal prep'],
            baseIngredients: ['quinoa', 'chickpeas', 'tahini'],
            flexIngredients: ['cucumber', 'tomatoes', 'avocado'],
          },
          {
            name: 'Breakfast Scramble',
            description: 'Hearty scrambled eggs with vegetables and cheese.',
            type: 'breakfast',
            time: 15,
            tags: ['quick', 'lowcarb', 'protein'],
            baseIngredients: ['eggs', 'butter', 'cheese'],
            flexIngredients: ['bell pepper', 'onion', 'spinach'],
          },
          {
            name: 'Homemade Soup',
            description: 'Warming soup using pantry staples and fresh vegetables.',
            type: 'lunch',
            time: 40,
            tags: ['comfort', 'healthy', 'budget'],
            baseIngredients: ['broth', 'onion', 'garlic'],
            flexIngredients: ['carrots', 'celery', 'beans'],
          },
          {
            name: 'Taco Night',
            description: 'Build-your-own tacos with all the fixings.',
            type: 'dinner',
            time: 25,
            tags: ['family', 'mexican', 'fun'],
            baseIngredients: ['tortillas', 'ground beef', 'taco seasoning'],
            flexIngredients: ['lettuce', 'tomatoes', 'cheese', 'sour cream'],
          },
          {
            name: 'Grain Salad',
            description: 'Hearty salad with grains, vegetables, and protein.',
            type: 'lunch',
            time: 20,
            tags: ['healthy', 'meal prep', 'vegetarian'],
            baseIngredients: ['quinoa', 'olive oil', 'lemon'],
            flexIngredients: ['cucumber', 'feta', 'chickpeas'],
          },
        ];

        // Filter by preferences
        let filtered = templates;
        if (prefs.includes('quick')) {
          filtered = filtered.filter(t => t.time <= 30);
        }
        if (prefs.includes('vegetarian')) {
          filtered = filtered.filter(t => t.tags.includes('vegetarian') || !t.baseIngredients.some(i => ['chicken', 'beef', 'pork', 'ground beef'].includes(i.toLowerCase())));
        }
        if (prefs.includes('lowcarb')) {
          filtered = filtered.filter(t => t.tags.includes('lowcarb') || !t.baseIngredients.some(i => ['pasta', 'rice', 'bread', 'tortillas'].includes(i.toLowerCase())));
        }
        if (prefs.includes('healthy')) {
          filtered = filtered.filter(t => t.tags.includes('healthy'));
        }
        if (prefs.includes('comfort')) {
          filtered = filtered.filter(t => t.tags.includes('comfort'));
        }
        if (prefs.includes('budget')) {
          filtered = filtered.filter(t => t.tags.includes('budget') || t.baseIngredients.length <= 4);
        }

        // If no matches, use all
        if (filtered.length === 0) {
          filtered = templates;
        }

        // Score and select top suggestions
        const scored = filtered.map(template => {
          // Check pantry matches
          const allIngredients = [...template.baseIngredients, ...template.flexIngredients];
          const pantryMatches = allIngredients.filter(ing => {
            const lower = ing.toLowerCase();
            return pantryItems.some(p =>
              p.name.toLowerCase().includes(lower) ||
              lower.includes(p.name.toLowerCase())
            );
          });

          // Check recipe matches
          const recipeMatch = recipes.find(r =>
            r.name.toLowerCase().includes(template.name.toLowerCase().split(' ')[0])
          );

          return {
            ...template,
            pantryMatches,
            missingIngredients: allIngredients.filter(i => !pantryMatches.includes(i)),
            matchScore: pantryMatches.length / allIngredients.length,
            hasRecipe: !!recipeMatch,
            recipeId: recipeMatch?.id
          };
        });

        // Sort by match score and variety
        scored.sort((a, b) => b.matchScore - a.matchScore);

        // Return top 4-5 suggestions
        return scored.slice(0, 5).map((s, i) => ({
          id: 'suggestion-' + Date.now() + '-' + i,
          ...s
        }));
      }

      // Render suggestions
      function renderSuggestions() {
        if (suggestions.length === 0) {
          emptyState.style.display = 'flex';
          return;
        }

        emptyState.style.display = 'none';

        let html = '';
        suggestions.forEach(suggestion => {
          html += '<div class="suggestion-card" data-id="' + suggestion.id + '">';

          html += '<div class="suggestion-header">';
          html += '<div class="suggestion-title">' + suggestion.name + '</div>';
          html += '<div class="suggestion-type">' + suggestion.type + '</div>';
          html += '</div>';

          html += '<div class="suggestion-description">' + suggestion.description + '</div>';

          html += '<div class="suggestion-meta">';
          html += '<span>⏱️ ' + suggestion.time + ' min</span>';
          html += '<span>📊 ' + Math.round(suggestion.matchScore * 100) + '% match</span>';
          if (suggestion.hasRecipe) html += '<span>📖 Has Recipe</span>';
          html += '</div>';

          html += '<div class="suggestion-tags">';
          suggestion.tags.forEach(tag => {
            const isMatch = activePrefs.has(tag);
            html += '<span class="tag' + (isMatch ? ' match' : '') + '">' + tag + '</span>';
          });
          html += '</div>';

          html += '<div class="suggestion-ingredients">';
          html += '<div class="ingredients-title">';
          html += '<span>Ingredients</span>';
          html += '<span>' + suggestion.pantryMatches.length + '/' + (suggestion.pantryMatches.length + suggestion.missingIngredients.length) + ' available</span>';
          html += '</div>';
          html += '<div class="ingredients-list">';

          const maxShow = 6;
          const allIngs = [
            ...suggestion.pantryMatches.map(i => '<span class="ingredient-available">✓ ' + i + '</span>'),
            ...suggestion.missingIngredients.map(i => '<span class="ingredient-missing">✗ ' + i + '</span>')
          ];
          html += allIngs.slice(0, maxShow).join(', ');
          if (allIngs.length > maxShow) {
            html += ' +' + (allIngs.length - maxShow) + ' more';
          }

          html += '</div>';
          html += '</div>';

          html += '<div class="suggestion-actions">';
          if (suggestion.missingIngredients.length > 0) {
            html += '<button class="action-btn secondary" data-action="shop">🛒 Add Missing</button>';
          }
          html += '<button class="action-btn secondary" data-action="save">📖 Save Recipe</button>';
          html += '<button class="action-btn primary" data-action="plan">📅 Add to Plan</button>';
          html += '</div>';

          html += '</div>';
        });

        suggestionsContainer.innerHTML = html;

        // Attach action handlers
        suggestionsContainer.querySelectorAll('.suggestion-card').forEach(card => {
          const id = card.dataset.id;
          const suggestion = suggestions.find(s => s.id === id);

          card.querySelector('[data-action="shop"]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            addMissingToShopping(suggestion);
          });

          card.querySelector('[data-action="save"]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            saveAsRecipe(suggestion);
          });

          card.querySelector('[data-action="plan"]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            addToMealPlan(suggestion);
          });
        });
      }

      // Add missing ingredients to shopping
      function addMissingToShopping(suggestion) {
        const items = suggestion.missingIngredients.map(ing => ({
          name: ing,
          category: 'other',
          quantity: 1,
          unit: 'count',
          priority: 'medium',
          notes: 'For: ' + suggestion.name
        }));

        if (shoppingChannel) {
          shoppingChannel.emitToSelected(items);
        } else {
          API.emitOutput('shopping.items', items);
        }

        API.emit('grocery.ai.suggestion', { shoppingItems: items });
        API.log('Added ' + items.length + ' items to shopping for ' + suggestion.name);
      }

      // Save as recipe
      function saveAsRecipe(suggestion) {
        const recipe = {
          name: suggestion.name,
          description: suggestion.description,
          prepTime: Math.round(suggestion.time * 0.3),
          cookTime: Math.round(suggestion.time * 0.7),
          servings: 4,
          ingredients: [...suggestion.pantryMatches, ...suggestion.missingIngredients].map(ing => ({
            name: ing,
            quantity: 1,
            unit: 'count'
          })),
          instructions: [
            'Prepare all ingredients.',
            'Follow standard cooking techniques for ' + suggestion.name.toLowerCase() + '.',
            'Season to taste and serve.'
          ],
          tags: suggestion.tags,
          sourceUrl: null
        };

        if (recipeChannel) {
          recipeChannel.emitToSelected(recipe);
        } else {
          API.emitOutput('recipe.save', recipe);
        }

        API.log('Saved recipe: ' + suggestion.name);
      }

      // Add to meal plan
      function addToMealPlan(suggestion) {
        const mealPlan = {
          recipeName: suggestion.name,
          recipeId: suggestion.recipeId || null,
          mealType: suggestion.type === 'breakfast' ? 'breakfast' : suggestion.type === 'lunch' ? 'lunch' : 'dinner',
          servings: 4,
          date: Date.now() + (24 * 60 * 60 * 1000), // Tomorrow
          notes: suggestion.description
        };

        API.emitOutput('mealplan.add', mealPlan);
        API.emit('grocery.meal.suggested', mealPlan);
        API.log('Added to meal plan: ' + suggestion.name);
      }

      // Update context
      function updateContext() {
        pantryCount.textContent = pantryItems.length;
        recipeCount.textContent = recipes.length;
      }

      // Initialize
      API.onMount(function(context) {
        const savedState = context.state || {};
        pantryItems = savedState.pantryItems || [];
        recipes = savedState.recipes || [];
        suggestions = savedState.suggestions || [];

        updateContext();
        if (suggestions.length > 0) {
          renderSuggestions();
        }

        API.log('AI Meal Suggester mounted');
      });

      // Handle inputs
      API.onInput('pantry.inventory', function(items) {
        if (Array.isArray(items)) {
          pantryItems = items;
          updateContext();
        }
      });

      API.onInput('recipes.list', function(recipeList) {
        if (Array.isArray(recipeList)) {
          recipes = recipeList;
          updateContext();
        }
      });

      API.onInput('preferences.set', function(prefs) {
        if (prefs && prefs.active) {
          activePrefs = new Set(prefs.active);
          document.querySelectorAll('.pref-chip').forEach(chip => {
            chip.classList.toggle('active', activePrefs.has(chip.dataset.pref));
          });
        }
      });

      API.onInput('trigger.suggest', function() {
        generateSuggestions();
      });

      // Listen for updates
      API.on('grocery.pantry.updated', function(items) {
        if (Array.isArray(items)) {
          pantryItems = items;
          updateContext();
        }
      });

      // Save state
      setInterval(function() {
        API.setState({
          pantryItems: pantryItems,
          recipes: recipes,
          suggestions: suggestions
        });
      }, 5000);

      // Cleanup
      API.onDestroy(function() {
        API.setState({
          pantryItems: pantryItems,
          recipes: recipes,
          suggestions: suggestions
        });
        API.log('AI Meal Suggester destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const AIMealSuggesterWidget: BuiltinWidget = {
  manifest: AIMealSuggesterWidgetManifest,
  get html() { return getAIMealSuggesterWidgetHTML(); },
};
