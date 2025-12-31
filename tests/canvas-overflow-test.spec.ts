/**
 * Canvas Overflow Test
 * Verifies that widgets extending beyond canvas bounds are clipped
 */
import { test, expect } from '@playwright/test';

test.describe('Canvas Overflow Clipping', () => {
  test('should clip widgets at canvas bounds', async ({ page }) => {
    console.log('\n=== CANVAS OVERFLOW CLIPPING TEST ===\n');

    await page.goto('/c/white-label-store');
    await page.waitForTimeout(3000);

    // Check the transform container's overflow property
    const transformContainer = page.locator('[data-canvas-transform]');
    const overflowValue = await transformContainer.evaluate((el) => {
      return window.getComputedStyle(el).overflow;
    });

    console.log(`Transform container overflow: ${overflowValue}`);
    expect(overflowValue).toBe('hidden');

    await page.screenshot({ path: 'tests/screenshots/canvas-overflow-test.png', fullPage: true });
    console.log('Screenshot saved');
  });
});
