/**
 * Test dragging a widget onto the canvas to see if it gets cropped incorrectly
 */
import { test } from '@playwright/test';

test('drag widget to canvas and check for cropping', async ({ page }) => {
  console.log('\n=== DRAG WIDGET TO CANVAS TEST ===\n');

  await page.goto('/');
  await page.waitForTimeout(3000);

  // Screenshot initial state
  await page.screenshot({ path: 'tests/screenshots/drag-01-initial.png', fullPage: true });

  // Enter edit mode
  await page.keyboard.press('e');
  await page.waitForTimeout(500);

  // Look for widget library/panel
  const widgetLibrary = page.locator('[data-widget-library], .widget-library, [class*="WidgetLibrary"]');
  const hasLibrary = await widgetLibrary.count() > 0;
  console.log(`Widget library visible: ${hasLibrary}`);

  // Try to find a button to open widget library
  const addButton = page.locator('button:has-text("Add"), button[title*="Add"], button[aria-label*="widget"]').first();
  if (await addButton.isVisible().catch(() => false)) {
    console.log('Found add button, clicking...');
    await addButton.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: 'tests/screenshots/drag-02-library.png', fullPage: true });

  // Find draggable widget items in the library
  const widgetItems = page.locator('[draggable="true"], [data-widget-def-id], .widget-item');
  const itemCount = await widgetItems.count();
  console.log(`Found ${itemCount} draggable widget items`);

  if (itemCount > 0) {
    // Get the first widget item
    const firstWidget = widgetItems.first();
    const widgetBox = await firstWidget.boundingBox();

    // Find the canvas drop area
    const canvas = page.locator('[data-canvas-transform], .canvas-surface').first();
    const canvasBox = await canvas.boundingBox();

    if (widgetBox && canvasBox) {
      console.log(`Widget item at: ${widgetBox.x}, ${widgetBox.y}`);
      console.log(`Canvas at: ${canvasBox.x}, ${canvasBox.y} (${canvasBox.width}x${canvasBox.height})`);

      // Drag the widget to the center of the canvas
      const targetX = canvasBox.x + canvasBox.width / 2;
      const targetY = canvasBox.y + canvasBox.height / 2;

      console.log(`Dragging to: ${targetX}, ${targetY}`);

      await page.mouse.move(widgetBox.x + widgetBox.width / 2, widgetBox.y + widgetBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetX, targetY, { steps: 20 });
      await page.mouse.up();

      await page.waitForTimeout(1000);
    }
  }

  await page.screenshot({ path: 'tests/screenshots/drag-03-after-drop.png', fullPage: true });

  // Check the widgets now on canvas
  const canvasWidgets = await page.locator('[data-widget-id]').all();
  console.log(`\nWidgets on canvas after drop: ${canvasWidgets.length}`);

  for (let i = 0; i < canvasWidgets.length; i++) {
    const widget = canvasWidgets[i];
    const id = await widget.getAttribute('data-widget-id');
    const box = await widget.boundingBox();

    // Check for any clipping/cropping styles
    const styles = await widget.evaluate((el) => {
      const getClipStyles = (element: Element): any[] => {
        const results: any[] = [];
        const traverse = (e: Element, depth = 0) => {
          if (depth > 5) return;
          const s = window.getComputedStyle(e);
          const hasClip = s.clipPath !== 'none' ||
                          s.overflow === 'hidden' ||
                          s.clip !== 'auto';
          if (hasClip) {
            results.push({
              tag: e.tagName,
              class: e.className?.toString?.()?.slice(0, 30) || '',
              clipPath: s.clipPath,
              overflow: s.overflow,
              clip: s.clip,
            });
          }
          for (const child of Array.from(e.children).slice(0, 5)) {
            traverse(child, depth + 1);
          }
        };
        traverse(element);
        return results;
      };
      return getClipStyles(el);
    });

    console.log(`\nWidget ${i + 1}: ${id?.slice(0, 25)}...`);
    console.log(`  Bounding box: ${JSON.stringify(box)}`);
    console.log(`  Elements with clipping: ${styles.length}`);
    styles.forEach((s, j) => {
      console.log(`    ${j + 1}. <${s.tag}> clip-path:${s.clipPath}, overflow:${s.overflow}`);
    });
  }

  // Take a screenshot of just the canvas area
  const canvas = page.locator('[data-canvas-transform], .canvas-surface').first();
  if (await canvas.count() > 0) {
    try {
      await canvas.screenshot({ path: 'tests/screenshots/drag-04-canvas-only.png' });
    } catch (e) {
      console.log('Could not screenshot canvas');
    }
  }
});
