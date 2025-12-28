/**
 * Crop Tool Debug Test
 * Tests the widget crop functionality in WidgetWrapper
 */
import { test, expect } from '@playwright/test';

test.describe('Crop Tool', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' || text.includes('crop') || text.includes('Crop')) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    // Go directly to a canvas with widgets
    await page.goto('/c/white-label-store');
    // Wait for canvas to load
    await page.waitForTimeout(3000);
  });

  test('should test crop tool', async ({ page }) => {
    console.log('=== CROP TOOL DEBUG TEST ===');

    // Screenshot initial state
    await page.screenshot({ path: 'tests/screenshots/crop-01-initial.png' });

    // Dismiss any popup by clicking on empty canvas area
    await page.mouse.click(800, 300);
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/screenshots/crop-02-after-dismiss.png' });

    // Check for widgets already on canvas
    let widgets = await page.locator('[data-widget-id]').all();
    console.log(`Found ${widgets.length} widgets on canvas`);

    await page.screenshot({ path: 'tests/screenshots/crop-03-widgets.png' });

    if (widgets.length === 0) {
      console.log('ERROR: No widgets on canvas. Make sure to open a canvas with widgets.');
      return;
    }

    // Step 5: Switch to Edit mode first
    console.log('Step 5: Switching to Edit mode...');
    // Click the pencil/edit icon in toolbar (usually toggles edit mode)
    const editModeBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(10);
    await editModeBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/screenshots/crop-05-edit-mode.png' });

    // Step 6: Select the widget
    console.log('Step 6: Selecting widget...');
    const widget = page.locator('[data-widget-id]').first();
    await widget.click({ force: true });
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'tests/screenshots/crop-06-selected.png' });

    // Step 7: Find and click crop button
    console.log('Step 7: Looking for crop button...');
    const cropButton = page.locator('button[title*="Crop"], button[title*="crop"]').first();

    if (await cropButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found crop button, clicking...');
      await cropButton.click();
      await page.waitForTimeout(300);

      await page.screenshot({ path: 'tests/screenshots/crop-07-crop-mode.png' });

      // Step 8: Check for crop handles
      console.log('Step 8: Checking crop handles...');
      const handles = await page.locator('[data-crop-handle]').all();
      console.log(`Found ${handles.length} crop handles`);

      for (const handle of handles) {
        const edge = await handle.getAttribute('data-crop-handle');
        const box = await handle.boundingBox();
        const styles = await handle.evaluate(el => {
          const s = window.getComputedStyle(el);
          return {
            pointerEvents: s.pointerEvents,
            zIndex: s.zIndex,
            cursor: s.cursor,
            display: s.display,
          };
        });
        console.log(`Handle "${edge}":`, { box, styles });
      }

      if (handles.length > 0) {
        // Step 9: Try dragging a crop handle
        console.log('Step 9: Dragging crop handle...');
        const topHandle = page.locator('[data-crop-handle="top"]');
        const handleBox = await topHandle.boundingBox();

        if (handleBox) {
          // Check widget's clip-path before
          const clipBefore = await widget.evaluate(el => {
            const content = el.querySelector('div');
            return content ? window.getComputedStyle(content).clipPath : 'no content div';
          });
          console.log('Clip path BEFORE:', clipBefore);

          // Drag handle down
          const startX = handleBox.x + handleBox.width / 2;
          const startY = handleBox.y + handleBox.height / 2;

          console.log(`Dragging from (${startX}, ${startY}) down 50px`);
          await page.mouse.move(startX, startY);
          await page.mouse.down();
          await page.mouse.move(startX, startY + 50, { steps: 5 });
          await page.waitForTimeout(100);
          await page.mouse.up();
          await page.waitForTimeout(300);

          await page.screenshot({ path: 'tests/screenshots/crop-08-after-drag.png' });

          // Check clip-path after
          const clipAfter = await widget.evaluate(el => {
            const content = el.querySelector('div');
            return content ? window.getComputedStyle(content).clipPath : 'no content div';
          });
          console.log('Clip path AFTER:', clipAfter);

          // Check if handle moved
          const handleBoxAfter = await topHandle.boundingBox();
          console.log('Handle position before:', handleBox.y);
          console.log('Handle position after:', handleBoxAfter?.y);

          if (handleBoxAfter && Math.abs(handleBoxAfter.y - handleBox.y) > 5) {
            console.log('SUCCESS: Handle moved!');
          } else {
            console.log('FAILURE: Handle did not move');
          }

          if (clipBefore !== clipAfter) {
            console.log('SUCCESS: Clip path changed!');
          } else {
            console.log('FAILURE: Clip path did not change');
          }
        }
      } else {
        console.log('ERROR: No crop handles found');
      }
    } else {
      console.log('ERROR: Crop button not visible');

      // Debug: list all visible buttons
      const buttons = await page.locator('button[title]').all();
      for (const btn of buttons) {
        const title = await btn.getAttribute('title');
        console.log('Button:', title);
      }
    }

    await page.screenshot({ path: 'tests/screenshots/crop-09-final.png' });
  });
});
