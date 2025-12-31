/**
 * Simple test - manually check if overflow:hidden is working
 */
import { test } from '@playwright/test';

test('check overflow clipping visually', async ({ page }) => {
  await page.goto('/c/white-label-store');
  await page.waitForTimeout(3000);

  // Enter edit mode
  await page.keyboard.press('e');
  await page.waitForTimeout(500);

  // Click first widget to select it
  const widget = page.locator('[data-widget-id]').first();
  await widget.click({ force: true });
  await page.waitForTimeout(500);

  // Screenshot with selection
  await page.screenshot({ path: 'tests/screenshots/simple-clip-selected.png', fullPage: true });

  // Now try to drag widget to edge of canvas
  const box = await widget.boundingBox();
  if (box) {
    // Drag right
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 800, box.y + 50, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: 'tests/screenshots/simple-clip-after-drag.png', fullPage: true });

  console.log('Screenshots saved - check visually if widget is clipped at canvas edge');
});
