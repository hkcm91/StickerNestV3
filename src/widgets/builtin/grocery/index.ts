/**
 * StickerNest v2 - Grocery Management Pipeline
 *
 * Complete grocery management system with:
 * - Shopping List: Track items to buy with categories
 * - Pantry: Inventory management with expiration tracking
 * - Receipt Scanner: OCR-based receipt parsing
 * - Price Tracker: Price history and trend analysis
 * - Recipe Manager: Recipe storage with ingredient tracking
 * - AI Meal Suggester: AI-powered meal recommendations
 * - Meal Planner: Weekly meal calendar
 *
 * All widgets support multi-channel port selection for flexible connections.
 */

import type { BuiltinWidget } from '../types';

// Widget imports
import { ShoppingListWidget, ShoppingListWidgetManifest } from './ShoppingListWidget';
import { PantryWidget, PantryWidgetManifest } from './PantryWidget';
import { ReceiptScannerWidget, ReceiptScannerWidgetManifest } from './ReceiptScannerWidget';
import { PriceTrackerWidget, PriceTrackerWidgetManifest } from './PriceTrackerWidget';
import { RecipeManagerWidget, RecipeManagerWidgetManifest } from './RecipeManagerWidget';
import { AIMealSuggesterWidget, AIMealSuggesterWidgetManifest } from './AIMealSuggesterWidget';
import { MealPlannerWidget, MealPlannerWidgetManifest } from './MealPlannerWidget';

// ==================
// Widget Exports
// ==================

export {
  ShoppingListWidget,
  ShoppingListWidgetManifest,
  PantryWidget,
  PantryWidgetManifest,
  ReceiptScannerWidget,
  ReceiptScannerWidgetManifest,
  PriceTrackerWidget,
  PriceTrackerWidgetManifest,
  RecipeManagerWidget,
  RecipeManagerWidgetManifest,
  AIMealSuggesterWidget,
  AIMealSuggesterWidgetManifest,
  MealPlannerWidget,
  MealPlannerWidgetManifest,
};

// ==================
// Widget Registry
// ==================

export const GROCERY_WIDGETS: Record<string, BuiltinWidget> = {
  'stickernest.shopping-list': ShoppingListWidget,
  'stickernest.pantry': PantryWidget,
  'stickernest.receipt-scanner': ReceiptScannerWidget,
  'stickernest.price-tracker': PriceTrackerWidget,
  'stickernest.recipe-manager': RecipeManagerWidget,
  'stickernest.ai-meal-suggester': AIMealSuggesterWidget,
  'stickernest.meal-planner': MealPlannerWidget,
};

export const GROCERY_WIDGET_IDS = Object.keys(GROCERY_WIDGETS);

// ==================
// Pipeline Preset
// ==================

/**
 * Grocery Management Pipeline Preset
 *
 * This pipeline connects all grocery widgets for seamless data flow:
 *
 * Receipt Scanner → Price Tracker (price history)
 * Receipt Scanner → Pantry (add purchased items)
 * Shopping List → Pantry (checked items become inventory)
 * Recipe Manager → Shopping List (missing ingredients)
 * Recipe Manager ↔ Pantry (ingredient availability)
 * AI Meal Suggester → Recipe Manager (save suggestions)
 * AI Meal Suggester → Shopping List (needed ingredients)
 * AI Meal Suggester → Meal Planner (add to schedule)
 * Meal Planner → Shopping List (generate weekly list)
 * Pantry → All (inventory updates)
 */
export const GROCERY_PIPELINE_PRESET = {
  id: 'grocery-management-pipeline',
  name: 'Grocery Management',
  description: 'Complete grocery management with shopping lists, pantry tracking, recipes, AI meal suggestions, and meal planning',
  widgets: GROCERY_WIDGET_IDS,
  connections: [
    // Receipt Scanner outputs
    {
      from: { widgetId: 'stickernest.receipt-scanner', port: 'prices.recorded' },
      to: { widgetId: 'stickernest.price-tracker', port: 'prices.add' },
    },
    {
      from: { widgetId: 'stickernest.receipt-scanner', port: 'pantry.items' },
      to: { widgetId: 'stickernest.pantry', port: 'items.add' },
    },

    // Shopping List to Pantry
    {
      from: { widgetId: 'stickernest.shopping-list', port: 'items.checked' },
      to: { widgetId: 'stickernest.pantry', port: 'items.add' },
    },

    // Recipe Manager connections
    {
      from: { widgetId: 'stickernest.recipe-manager', port: 'ingredients.missing' },
      to: { widgetId: 'stickernest.shopping-list', port: 'items.add' },
    },
    {
      from: { widgetId: 'stickernest.pantry', port: 'inventory.changed' },
      to: { widgetId: 'stickernest.recipe-manager', port: 'pantry.inventory' },
    },

    // AI Meal Suggester connections
    {
      from: { widgetId: 'stickernest.pantry', port: 'inventory.changed' },
      to: { widgetId: 'stickernest.ai-meal-suggester', port: 'pantry.inventory' },
    },
    {
      from: { widgetId: 'stickernest.recipe-manager', port: 'recipe.list' },
      to: { widgetId: 'stickernest.ai-meal-suggester', port: 'recipes.list' },
    },
    {
      from: { widgetId: 'stickernest.ai-meal-suggester', port: 'recipe.save' },
      to: { widgetId: 'stickernest.recipe-manager', port: 'recipe.add' },
    },
    {
      from: { widgetId: 'stickernest.ai-meal-suggester', port: 'shopping.items' },
      to: { widgetId: 'stickernest.shopping-list', port: 'items.add' },
    },
    {
      from: { widgetId: 'stickernest.ai-meal-suggester', port: 'mealplan.add' },
      to: { widgetId: 'stickernest.meal-planner', port: 'meal.add' },
    },

    // Meal Planner connections
    {
      from: { widgetId: 'stickernest.recipe-manager', port: 'recipe.list' },
      to: { widgetId: 'stickernest.meal-planner', port: 'recipes.list' },
    },
    {
      from: { widgetId: 'stickernest.pantry', port: 'inventory.changed' },
      to: { widgetId: 'stickernest.meal-planner', port: 'pantry.inventory' },
    },
    {
      from: { widgetId: 'stickernest.meal-planner', port: 'shopping.generate' },
      to: { widgetId: 'stickernest.shopping-list', port: 'items.add' },
    },
  ],
  suggestedLayout: {
    columns: 3,
    rows: 3,
    positions: [
      { widgetId: 'stickernest.shopping-list', col: 0, row: 0 },
      { widgetId: 'stickernest.pantry', col: 1, row: 0 },
      { widgetId: 'stickernest.receipt-scanner', col: 2, row: 0 },
      { widgetId: 'stickernest.price-tracker', col: 0, row: 1 },
      { widgetId: 'stickernest.recipe-manager', col: 1, row: 1 },
      { widgetId: 'stickernest.ai-meal-suggester', col: 2, row: 1 },
      { widgetId: 'stickernest.meal-planner', col: 0, row: 2, colSpan: 3 },
    ],
  },
};

// ==================
// Utility Types
// ==================

export interface GroceryPipelineConnection {
  from: { widgetId: string; port: string };
  to: { widgetId: string; port: string };
}

export interface GroceryPipelinePreset {
  id: string;
  name: string;
  description: string;
  widgets: string[];
  connections: GroceryPipelineConnection[];
  suggestedLayout?: {
    columns: number;
    rows: number;
    positions: Array<{
      widgetId: string;
      col: number;
      row: number;
      colSpan?: number;
      rowSpan?: number;
    }>;
  };
}
