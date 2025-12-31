/**
 * Test that widgets correctly report and scale their content size
 * This verifies the fix for widgets appearing cropped when added to canvas
 */
import { test, expect } from '@playwright/test';

test('widget content size reporting and scaling', async ({ page }) => {
  console.log('\n=== WIDGET CONTENT SIZE FIX TEST ===\n');

  // Listen for console messages to see content size reports
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Content size') || text.includes('contentSize')) {
      console.log(`[Browser] ${text}`);
    }
  });

  await page.goto('/');
  await page.waitForTimeout(3000);

  // Enter edit mode
  await page.keyboard.press('e');
  await page.waitForTimeout(500);

  // Screenshot initial state
  await page.screenshot({ path: 'tests/screenshots/content-fix-01-initial.png', fullPage: true });

  // Find widgets on canvas
  const widgets = await page.locator('[data-widget-id]').all();
  console.log(`Found ${widgets.length} widgets on canvas`);

  // Check each widget for proper scaling
  for (let i = 0; i < Math.min(widgets.length, 3); i++) {
    const widget = widgets[i];
    const widgetId = await widget.getAttribute('data-widget-id');
    const wrapperBox = await widget.boundingBox();

    console.log(`\n--- Widget ${i + 1}: ${widgetId?.slice(0, 25)}... ---`);
    console.log(`Wrapper dimensions: ${wrapperBox?.width}x${wrapperBox?.height}`);

    // Find iframe inside widget
    const iframe = widget.locator('iframe').first();
    if (await iframe.count() > 0) {
      const iframeBox = await iframe.boundingBox();
      console.log(`Iframe dimensions: ${iframeBox?.width}x${iframeBox?.height}`);

      // Check if iframe content is being scaled
      const iframeStyle = await iframe.evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });
      console.log(`Iframe transform: ${iframeStyle}`);
    }

    // Check parent div for scaling
    const scaledContent = await widget.evaluate((el) => {
      // Find the inner div that has the scale transform
      const inner = el.querySelector('div > div');
      if (inner) {
        const style = window.getComputedStyle(inner);
        return {
          transform: style.transform,
          width: inner.clientWidth,
          height: inner.clientHeight,
        };
      }
      return null;
    });

    if (scaledContent) {
      console.log(`Scaled content: ${scaledContent.width}x${scaledContent.height}, transform: ${scaledContent.transform}`);
    }
  }

  // Add a new widget by dragging from library
  const widgetItems = page.locator('[draggable="true"], [data-widget-def-id], .widget-item');
  const itemCount = await widgetItems.count();
  console.log(`\nFound ${itemCount} widget items in library`);

  if (itemCount > 0) {
    const firstItem = widgetItems.first();
    const itemBox = await firstItem.boundingBox();
    const canvas = page.locator('[data-canvas-transform]').first();
    const canvasBox = await canvas.boundingBox();

    if (itemBox && canvasBox) {
      console.log(`\nDragging widget to canvas...`);
      const targetX = canvasBox.x + canvasBox.width / 2;
      const targetY = canvasBox.y + canvasBox.height / 2;

      await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetX, targetY, { steps: 15 });
      await page.mouse.up();

      // Wait for widget to render and report content size
      await page.waitForTimeout(2000);

      // Check newly added widget
      const newWidgets = await page.locator('[data-widget-id]').all();
      console.log(`Widgets after drop: ${newWidgets.length}`);

      if (newWidgets.length > widgets.length) {
        const newest = newWidgets[newWidgets.length - 1];
        const newestBox = await newest.boundingBox();
        console.log(`\nNew widget dimensions: ${newestBox?.width}x${newestBox?.height}`);

        // Check for clipping
        const clipInfo = await newest.evaluate((el) => {
          const style = window.getComputedStyle(el);
          const inner = el.querySelector('div > div');
          const innerStyle = inner ? window.getComputedStyle(inner) : null;

          return {
            wrapperOverflow: style.overflow,
            wrapperClipPath: style.clipPath,
            innerTransform: innerStyle?.transform || 'none',
            innerWidth: inner?.clientWidth || 0,
            innerHeight: inner?.clientHeight || 0,
          };
        });

        console.log(`Clip info:`, clipInfo);

        // Take screenshot showing new widget
        await page.screenshot({ path: 'tests/screenshots/content-fix-02-after-add.png', fullPage: true });
      }
    }
  }

  console.log('\n=== TEST COMPLETE ===\n');
});
