/**
 * Pipeline Testing Helpers
 * Reusable utilities for testing pipeline cards and widget integration
 */

import { Page, expect, Locator } from '@playwright/test';

// ============================================
// All Pipeline Presets (must match LibraryPipelinesTab.tsx)
// ============================================

export const PIPELINE_PRESETS = [
  // Data Flow Pipelines
  { id: 'color-flow', name: 'Color Flow Pipeline', category: 'Data Flow', widgetIds: ['color-sender', 'color-receiver', 'gradient-maker'] },
  { id: 'ping-notification', name: 'Ping → Notification', category: 'Data Flow', widgetIds: ['ping-sender', 'ping-receiver', 'notification-center'] },
  { id: 'timer-progress', name: 'Timer → Progress Bar', category: 'Data Flow', widgetIds: ['pipeline-timer', 'pipeline-progressbar', 'pipeline-visualizer'] },
  { id: 'button-echo', name: 'Button → Echo Actions', category: 'Data Flow', widgetIds: ['pipeline-button', 'echo-widget', 'pipeline-text'] },
  { id: 'cross-canvas-sync', name: 'Cross-Canvas Sync', category: 'Data Flow', widgetIds: ['stickernest.cross-canvas-broadcaster', 'stickernest.cross-canvas-listener'] },

  // AI Pipelines
  { id: 'ai-image-pipeline', name: 'AI Image Generation', category: 'AI Pipeline', widgetIds: ['prompt-options-widget', 'api-settings-widget', 'photo-generation-widget', 'gallery-widget'] },
  { id: 'ai-video-pipeline', name: 'AI Video Generation', category: 'AI Pipeline', widgetIds: ['prompt-options-widget', 'api-settings-widget', 'video-generation-widget', 'preview-player-widget'] },
  { id: 'lora-training-flow', name: 'LoRA Training Pipeline', category: 'AI Pipeline', widgetIds: ['gallery-widget', 'lora-training-widget', 'photo-generation-widget'] },

  // Media Pipelines
  { id: 'image-filter-chain', name: 'Image Filter Chain', category: 'Media Pipeline', widgetIds: ['image-tool', 'image-crop-mask', 'filter-overlay', 'drop-shadow-control'] },
  { id: 'video-effects-chain', name: 'Video Effects Chain', category: 'Media Pipeline', widgetIds: ['source-video', 'filter-overlay', 'effect-glitch', 'preview-player-widget'] },
  { id: 'webcam-stream', name: 'Webcam Stream Setup', category: 'Media Pipeline', widgetIds: ['stickernest.webcam', 'stickernest.webcam-frame', 'stickernest.retro-tv'] },
  { id: 'audio-playlist', name: 'Audio Playlist Player', category: 'Media Pipeline', widgetIds: ['spotify-playlist-widget', 'source-audio', 'preview-player-widget'] },

  // Games
  { id: 'farm-game', name: 'Farm Game System', category: 'Games', widgetIds: ['farm-seed-bag', 'farm-crop-plot', 'farm-sprinkler', 'farm-weather', 'farm-stats'] },
  { id: 'button-deck-actions', name: 'Button Deck Controller', category: 'Controls', widgetIds: ['button-deck', 'buttonpad', 'echo-widget'] },

  // Design Pipelines
  { id: 'vector-editing', name: 'Vector Editor Pipeline', category: 'Design Pipeline', widgetIds: ['vector-canvas', 'vector-editor', 'vector-transform', 'vector-style-panel', 'vector-layers', 'vector-export'] },
  { id: 'shape-builder', name: 'Shape Builder Pipeline', category: 'Design Pipeline', widgetIds: ['shape-tool', 'shape-element', 'isometric-grid'] },

  // Development
  { id: 'debug-data-flow', name: 'Debug Data Flow', category: 'Development', widgetIds: ['debug-echo-widget', 'debug-latency-simulator', 'debug-transport-monitor', 'debug-pipeline-visualizer'] },
  { id: 'state-debugging', name: 'State Debugging', category: 'Development', widgetIds: ['debug-state-mirror', 'debug-identity-debugger', 'debug-cursor-tracker'] },
  { id: 'stress-testing', name: 'Pipeline Stress Test', category: 'Development', widgetIds: ['event-flooder', 'debug-random-state-mutator', 'state-mirror'] },

  // Social
  { id: 'live-chat-feed', name: 'Live Chat + Feed', category: 'Social', widgetIds: ['stickernest.live-chat', 'stickernest.live-feed', 'stickernest.notification'] },
  { id: 'user-presence', name: 'User Presence System', category: 'Social', widgetIds: ['stickernest.user-card', 'stickernest.presence', 'stickernest.collaborator-list'] },
  { id: 'stream-alerts', name: 'Stream Alert System', category: 'Streaming', widgetIds: ['stickernest.viewer-count', 'stickernest.stream-alert', 'stickernest.obs-control'] },

  // Canvas
  { id: 'canvas-styling', name: 'Canvas Background Setup', category: 'Canvas', widgetIds: ['canvas-bg-color', 'canvas-bg-pattern', 'canvas-grid'] },
  { id: 'canvas-effects', name: 'Canvas Effects Layer', category: 'Canvas', widgetIds: ['canvas-filters', 'stickernest.effects', 'effect-glitch'] },

  // Productivity
  { id: 'project-tracker', name: 'Project Management', category: 'Productivity', widgetIds: ['kanban-board', 'project-tracker', 'activity-feed'] },
  { id: 'notes-workflow', name: 'Notes Workflow', category: 'Productivity', widgetIds: ['word-processor-widget', 'notes-widget', 'folder-widget'] },
  { id: 'time-management', name: 'Time Management', category: 'Productivity', widgetIds: ['stickernest.clock', 'stickernest.timer', 'time-tracker', 'stickernest.todo-list'] },

  // Essentials
  { id: 'quick-start', name: 'Quick Start Kit', category: 'Essentials', widgetIds: ['stickernest.basic-text', 'stickernest.notes', 'stickernest.clock', 'stickernest.weather'] },
  { id: 'dashboard-basics', name: 'Dashboard Basics', category: 'Essentials', widgetIds: ['stickernest.data-display', 'stickernest.counter', 'stickernest.progress-bar', 'dashboard-analytics'] },
];

// Get all unique categories
export const PIPELINE_CATEGORIES = [...new Set(PIPELINE_PRESETS.map(p => p.category))];

// Get all unique widget IDs across all pipelines
export const ALL_WIDGET_IDS = [...new Set(PIPELINE_PRESETS.flatMap(p => p.widgetIds))];

// ============================================
// Navigation Helpers
// ============================================

/**
 * Navigate to the main app and wait for it to load
 */
export async function navigateToApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Wait for the app to render
  await page.waitForTimeout(1000);

  // Dismiss any modals or overlays that might be present
  await dismissOverlays(page);
}

/**
 * Dismiss any modals, popups, or overlays
 */
export async function dismissOverlays(page: Page): Promise<void> {
  // Close any profile dropdown menu by clicking elsewhere
  // The profile menu shows items like "My Profile", "Sign Out", etc.
  const profileMenuItems = page.locator('text=My Profile').or(page.locator('text=Sign Out'));
  if (await profileMenuItems.first().isVisible({ timeout: 300 }).catch(() => false)) {
    // Click on the canvas/main area to close the dropdown
    await page.mouse.click(500, 300);
    await page.waitForTimeout(200);
  }

  // Close Performance overlay if visible (has "Performance" header and ✕ button)
  const performanceClose = page.locator('text=Performance').locator('..').locator('button:has-text("✕")');
  if (await performanceClose.isVisible({ timeout: 300 }).catch(() => false)) {
    await performanceClose.click({ force: true });
    await page.waitForTimeout(200);
  }

  // Try to close any visible modals
  const closeSelectors = [
    'button[aria-label="Close"]',
    'button:has-text("Close")',
    'button:has-text("Dismiss")',
    '[data-testid="modal-close"]',
    '.modal-close',
    'button:has-text("✕")',
  ];

  for (const selector of closeSelectors) {
    const closeButton = page.locator(selector).first();
    if (await closeButton.isVisible({ timeout: 300 }).catch(() => false)) {
      await closeButton.click({ force: true });
      await page.waitForTimeout(100);
    }
  }

  // Press Escape to close any remaining overlays
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
}

/**
 * Navigate to the Library panel
 */
export async function navigateToLibrary(page: Page): Promise<void> {
  // Press Escape multiple times to close any open menus/modals
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Click on the main canvas area to ensure focus and close any dropdown menus
  await page.mouse.click(640, 400);
  await page.waitForTimeout(300);

  // Check if Widgets tab is already visible (library is already open)
  const widgetsTab = page.locator('button:has-text("Widgets")').first();
  if (await widgetsTab.isVisible({ timeout: 1000 }).catch(() => false)) {
    return; // Library is open
  }

  // Click on "Open Gallery" button - it's at the bottom of the left panel
  const openGallery = page.locator('button:has-text("Open Gallery"), text=Open Gallery').first();
  if (await openGallery.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Scroll button into view and click
    await openGallery.scrollIntoViewIfNeeded();
    await openGallery.click({ force: true });
    await page.waitForTimeout(1000);

    // Wait for Widgets tab to appear (indicates library panel opened)
    await page.waitForSelector('button:has-text("Widgets")', { timeout: 8000 }).catch(() => {});
    return;
  }

  // Try pressing 'L' key which might toggle the library
  await page.keyboard.press('l');
  await page.waitForTimeout(500);

  // Check again if Widgets tab is now visible
  if (await widgetsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    return; // Library is open
  }

  // Try different selectors for the Library tab/button
  const librarySelectors = [
    'button:has-text("Library")',
    'text=Library',
    '[data-testid="library-tab"]',
    '[role="tab"]:has-text("Library")',
    '[aria-label*="Library"]',
  ];

  for (const selector of librarySelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
      await element.click({ force: true });
      await page.waitForTimeout(500);
      return;
    }
  }
}

/**
 * Navigate to the Pipelines tab within the Library
 */
export async function navigateToPipelinesTab(page: Page): Promise<void> {
  // First ensure we're in the library
  await navigateToLibrary(page);
  await dismissOverlays(page);

  // Wait for the library panel to be ready (Widgets tab should be visible)
  await page.waitForSelector('button:has-text("Widgets")', { timeout: 5000 }).catch(() => {});

  // Look for the Pipelines tab button - it's in the tab bar at the top
  // Tab bar has: Widgets | Stickers | Pipelines | Upload
  const pipelinesSelectors = [
    'button:has-text("Pipelines")',
    'text=Pipelines',
    '[data-testid="pipelines-tab"]',
  ];

  for (const selector of pipelinesSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
      await element.click({ force: true });
      await page.waitForTimeout(500);
      break;
    }
  }

  // Wait for the pipelines tab content to load
  // The header says "Widget Pipelines"
  await page.waitForSelector('text=Widget Pipelines', { timeout: 8000 }).catch(() => {
    // If header not found, try waiting for any pipeline-related content
    return page.waitForSelector('text=Pre-configured widget', { timeout: 3000 });
  });

  // Dismiss any overlays that might have appeared
  await dismissOverlays(page);
  await page.waitForTimeout(300);
}

/**
 * Get the pipelines tab content container (for scoping selectors)
 */
export function getPipelinesContainer(page: Page): Locator {
  // The pipelines tab container has the "Widget Pipelines" header
  return page.locator('text=Widget Pipelines').locator('..').locator('..');
}

/**
 * Navigate to the Canvas tab
 */
export async function navigateToCanvas(page: Page): Promise<void> {
  await dismissOverlays(page);

  const canvasSelectors = [
    'button:has-text("Canvas")',
    'text=Canvas',
    '[data-testid="canvas-tab"]',
    'text=Canvas Mode',
  ];

  for (const selector of canvasSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
      await element.click({ force: true });
      await page.waitForTimeout(500);
      return;
    }
  }
}

/**
 * Navigate to the Debug panel
 */
export async function navigateToDebug(page: Page): Promise<void> {
  await dismissOverlays(page);

  const debugSelectors = [
    'button:has-text("Debug")',
    'text=Debug',
    '[data-testid="debug-tab"]',
  ];

  for (const selector of debugSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
      await element.click({ force: true });
      await page.waitForTimeout(500);
      return;
    }
  }
}

// ============================================
// Pipeline Card Helpers
// ============================================

/**
 * Get a pipeline card locator by its ID or name
 */
export function getPipelineCard(page: Page, pipelineIdOrName: string): Locator {
  // Try to find by data-pipeline-id first, then by name text
  return page.locator(`[data-pipeline-id="${pipelineIdOrName}"]`)
    .or(page.locator(`text=${pipelineIdOrName}`).locator('..').locator('..'));
}

/**
 * Get all visible pipeline cards
 */
export function getAllPipelineCards(page: Page): Locator {
  // Pipeline cards typically have a consistent structure
  return page.locator('[data-pipeline-id]').or(page.locator('.pipeline-card'));
}

/**
 * Click the "Add All" button on a pipeline card
 */
export async function clickAddAllButton(page: Page, pipelineName: string): Promise<void> {
  // Find the card containing this pipeline name
  const card = page.locator(`text=${pipelineName}`).locator('..').locator('..');

  // Find and click the Add button within this card
  const addButton = card.locator('button:has-text("Add")').first();
  await addButton.click();
  await page.waitForTimeout(500);
}

/**
 * Expand/collapse widget list in a pipeline card
 */
export async function toggleWidgetList(page: Page, pipelineName: string): Promise<void> {
  const card = page.locator(`text=${pipelineName}`).locator('..').locator('..');
  const toggle = card.locator('text=Show widgets').or(card.locator('text=Hide widgets'));
  await toggle.click();
  await page.waitForTimeout(200);
}

/**
 * Filter pipelines by category
 * Category chips are below the search input in the pipelines tab
 */
export async function filterByCategory(page: Page, category: string): Promise<void> {
  // Wait for categories to be visible
  await page.waitForTimeout(200);

  // The category chips are in a row below the search - they include "All" and category names
  // Find the category button - it should be visible in the pipelines tab area
  const categorySelectors = [
    // Exact text match button
    `button:text-is("${category}")`,
    // Has text match
    `button:has-text("${category}")`,
    // Text match
    `text="${category}"`,
  ];

  for (const selector of categorySelectors) {
    const chip = page.locator(selector).first();
    if (await chip.isVisible({ timeout: 1000 }).catch(() => false)) {
      await chip.click({ force: true });
      await page.waitForTimeout(300);
      return;
    }
  }

  // Fallback - try scrolling to find it
  const scrollArea = page.locator('text=Widget Pipelines').locator('..').locator('..').locator('..').first();
  await scrollArea.evaluate((el) => el.scrollTop = 0);
  await page.waitForTimeout(200);

  // Try again
  const chip = page.locator(`button:has-text("${category}")`).first();
  await chip.click({ force: true });
  await page.waitForTimeout(300);
}

/**
 * Search for pipelines
 */
export async function searchPipelines(page: Page, query: string): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  await searchInput.fill(query);
  await page.waitForTimeout(300);
}

/**
 * Clear pipeline search
 */
export async function clearSearch(page: Page): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  await searchInput.fill('');
  await page.waitForTimeout(300);
}

// ============================================
// Widget Helpers
// ============================================

/**
 * Get all widget containers on the canvas
 */
export function getWidgetContainers(page: Page): Locator {
  return page.locator('.widget-container, [data-widget-id]');
}

/**
 * Get a specific widget container by widget ID
 */
export function getWidgetContainer(page: Page, widgetId: string): Locator {
  return page.locator(`[data-widget-id*="${widgetId}"]`);
}

/**
 * Get widget iframe by widget ID
 */
export function getWidgetFrame(page: Page, widgetId: string) {
  return page.frameLocator(`[data-widget-id*="${widgetId}"] iframe, iframe[data-widget-id*="${widgetId}"]`);
}

/**
 * Wait for a widget to be ready (sends READY message)
 */
export async function waitForWidgetReady(page: Page, widgetId: string, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    (id) => {
      const widget = document.querySelector(`[data-widget-id*="${id}"]`);
      return widget?.getAttribute('data-lifecycle') === 'ready' || widget?.getAttribute('data-ready') === 'true';
    },
    widgetId,
    { timeout }
  ).catch(() => {
    // Fallback - just wait for the widget container to exist
  });
}

/**
 * Count widgets on canvas
 */
export async function countWidgetsOnCanvas(page: Page): Promise<number> {
  const widgets = getWidgetContainers(page);
  return await widgets.count();
}

/**
 * Get widget IDs currently on canvas
 */
export async function getWidgetIdsOnCanvas(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const widgets = document.querySelectorAll('[data-widget-id]');
    return Array.from(widgets).map(w => w.getAttribute('data-widget-id') || '').filter(Boolean);
  });
}

// ============================================
// State Management Helpers
// ============================================

/**
 * Clear localStorage to reset app state
 */
export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

/**
 * Get canvas state from store
 */
export async function getCanvasState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const canvasState = localStorage.getItem('stickernest_canvas_state');
    return canvasState ? JSON.parse(canvasState) : null;
  });
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert that a pipeline card is visible
 */
export async function assertPipelineCardVisible(page: Page, pipelineName: string): Promise<void> {
  await expect(page.locator(`text=${pipelineName}`).first()).toBeVisible({ timeout: 5000 });
}

/**
 * Assert that widgets were added to canvas
 */
export async function assertWidgetsAdded(page: Page, expectedCount: number): Promise<void> {
  const actualCount = await countWidgetsOnCanvas(page);
  expect(actualCount).toBeGreaterThanOrEqual(expectedCount);
}

/**
 * Assert that a specific widget is on canvas
 */
export async function assertWidgetOnCanvas(page: Page, widgetId: string): Promise<void> {
  const widget = getWidgetContainer(page, widgetId);
  await expect(widget).toBeVisible({ timeout: 5000 });
}

/**
 * Assert pipeline card shows correct widget count
 */
export async function assertPipelineWidgetCount(page: Page, pipelineName: string, expectedTotal: number): Promise<void> {
  const card = page.locator(`text=${pipelineName}`).locator('..').locator('..');
  await expect(card.locator(`text=/ ${expectedTotal} total`)).toBeVisible({ timeout: 5000 });
}

// ============================================
// Console & Debug Helpers
// ============================================

/**
 * Capture console logs
 */
export function captureConsoleLogs(page: Page): string[] {
  const logs: string[] = [];
  page.on('console', (msg) => {
    logs.push(msg.text());
  });
  return logs;
}

/**
 * Capture pipeline-specific console logs
 */
export function capturePipelineLogs(page: Page): string[] {
  const logs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[PipelineRuntime]') || text.includes('[Pipeline]') || text.includes('widget:')) {
      logs.push(text);
    }
  });
  return logs;
}

/**
 * Wait for widget messages in debug panel
 */
export async function waitForWidgetMessage(page: Page, messagePattern: string | RegExp, timeout = 10000): Promise<void> {
  await navigateToDebug(page);

  if (typeof messagePattern === 'string') {
    await expect(page.locator(`text=${messagePattern}`).first()).toBeVisible({ timeout });
  } else {
    await page.waitForFunction(
      (pattern) => {
        const messages = document.body.innerText;
        return new RegExp(pattern).test(messages);
      },
      messagePattern.source,
      { timeout }
    );
  }
}
