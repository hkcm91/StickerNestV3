/**
 * Add widget and debug content size
 */
import { test } from '@playwright/test';

test('add widget and check content size', async ({ page }) => {
  console.log('\n=== ADD WIDGET DEBUG ===\n');

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Widget') || text.includes('Content size') ||
        text.includes('CONTENT_SIZE') || text.includes('autoReport') ||
        text.includes('scaling') || text.includes('contentSize')) {
      console.log(`[Browser] ${text}`);
    }
  });

  await page.goto('/');
  await page.waitForTimeout(2000);

  // Dismiss any dialogs by clicking on canvas
  await page.click('body');
  await page.waitForTimeout(500);

  // Enter edit mode
  await page.keyboard.press('e');
  await page.waitForTimeout(500);

  // Click away to dismiss edit mode dialog
  await page.click('[data-canvas-transform]', { position: { x: 100, y: 100 } });
  await page.waitForTimeout(500);

  // Find the + button in toolbar to add widgets
  const plusButton = page.locator('button svg[class*="plus"], button:has(svg), [title*="Add"]').first();
  const buttons = await page.locator('button').all();
  console.log(`Found ${buttons.length} buttons`);

  // Screenshot the toolbar
  await page.screenshot({ path: 'tests/screenshots/add-widget-01-toolbar.png', fullPage: true });

  // Look for the collapsed panel on the right side (the arrow)
  const rightPanel = page.locator('[class*="collapsed"], [data-panel]').first();

  // Try clicking the arrow on the right side to expand library
  const expandArrow = page.locator('svg[class*="chevron"], [class*="expand"]').first();
  if (await expandArrow.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Found expand arrow, clicking...');
    await expandArrow.click();
    await page.waitForTimeout(500);
  }

  // Try the + icon in the header toolbar
  const headerButtons = await page.locator('header button, nav button').all();
  console.log(`Found ${headerButtons.length} header/nav buttons`);

  // Find button with + or Add
  for (const btn of headerButtons) {
    const html = await btn.innerHTML();
    if (html.includes('plus') || html.includes('Plus') || html.includes('add') || html.includes('Add')) {
      console.log('Found add button, clicking...');
      await btn.click();
      await page.waitForTimeout(1000);
      break;
    }
  }

  await page.screenshot({ path: 'tests/screenshots/add-widget-02-after-click.png', fullPage: true });

  // Check for widget library panel
  const libraryPanel = page.locator('[class*="library"], [class*="Library"]').first();
  if (await libraryPanel.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Widget library is visible');

    // Find widget cards
    const widgetCards = await page.locator('[class*="WidgetCard"], [class*="widget-card"]').all();
    console.log(`Found ${widgetCards.length} widget cards`);

    if (widgetCards.length > 0) {
      // Click first widget card
      await widgetCards[0].click();
      console.log('Clicked first widget card');
      await page.waitForTimeout(2000);
    }
  }

  // Check for widgets on canvas
  await page.waitForTimeout(2000);
  const widgets = await page.locator('[data-widget-id]').all();
  console.log(`\nWidgets on canvas: ${widgets.length}`);

  if (widgets.length > 0) {
    console.log('\nWidget added! Waiting for content size detection...');
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: 'tests/screenshots/add-widget-03-final.png', fullPage: true });

  console.log('\n=== TEST COMPLETE ===\n');
});
