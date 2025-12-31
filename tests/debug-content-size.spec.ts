/**
 * Debug test to verify content size detection and scaling
 */
import { test } from '@playwright/test';

test('debug content size detection', async ({ page }) => {
  console.log('\n=== DEBUG CONTENT SIZE ===\n');

  // Capture ALL console messages from the browser
  page.on('console', msg => {
    const text = msg.text();
    // Log relevant messages
    if (text.includes('[Widget') ||
        text.includes('Content size') ||
        text.includes('CONTENT_SIZE') ||
        text.includes('autoReport') ||
        text.includes('scaling')) {
      console.log(`[Browser] ${text}`);
    }
  });

  await page.goto('/');
  await page.waitForTimeout(3000);

  // Check for widgets
  const widgetCount = await page.locator('[data-widget-id]').count();
  console.log(`\nWidgets on canvas: ${widgetCount}`);

  if (widgetCount === 0) {
    console.log('\nNo widgets on canvas. Trying to add one...');

    // Enter edit mode
    await page.keyboard.press('e');
    await page.waitForTimeout(500);

    // Try to find and click a widget to add it
    const addPanel = page.locator('[class*="library"], [class*="panel"]').first();
    console.log('Looking for add panel...');

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/debug-content-01.png', fullPage: true });
  }

  // Wait and capture more messages
  await page.waitForTimeout(3000);

  // Check final state
  const finalWidgetCount = await page.locator('[data-widget-id]').count();
  console.log(`\nFinal widget count: ${finalWidgetCount}`);

  await page.screenshot({ path: 'tests/screenshots/debug-content-02-final.png', fullPage: true });

  console.log('\n=== TEST COMPLETE ===\n');
});
