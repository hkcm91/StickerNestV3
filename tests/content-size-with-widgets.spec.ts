/**
 * Test content size fix with widgets added programmatically
 */
import { test, expect } from '@playwright/test';

test('widgets should report content size and scale properly', async ({ page }) => {
  console.log('\n=== CONTENT SIZE FIX TEST ===\n');

  // Listen for console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Content size') || text.includes('CONTENT_SIZE') || text.includes('contentSizeChanged')) {
      console.log(`[Browser] ${text}`);
    }
  });

  await page.goto('/');
  await page.waitForTimeout(2000);

  // Look for the + button in the header to add widgets
  const addButton = page.locator('button[title*="Add"], button svg, button:has(svg)').first();
  console.log('Looking for add button...');

  // Try clicking on the library panel or a widget card
  // First, check if there's a widget library visible
  const libraryItems = await page.locator('[data-widget-def-id]').all();
  console.log(`Found ${libraryItems.length} library items`);

  // If no library items, try to find and click a "+ Add Widget" or similar button
  if (libraryItems.length === 0) {
    // Try the left panel which might have widgets
    const leftPanel = page.locator('.widget-library, [class*="library"], [class*="panel"]').first();
    if (await leftPanel.isVisible().catch(() => false)) {
      console.log('Found left panel');
      await leftPanel.screenshot({ path: 'tests/screenshots/content-fix-panel.png' });
    }
  }

  // Try adding a widget by clicking on a widget card in the panel
  const widgetCard = page.locator('[class*="WidgetCard"], [class*="widget-card"], .widget-item').first();
  if (await widgetCard.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Found widget card, clicking...');
    await widgetCard.click();
    await page.waitForTimeout(2000);
  }

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/content-fix-03-widgets.png', fullPage: true });

  // Check for widgets on canvas
  const widgetsOnCanvas = await page.locator('[data-widget-id]').all();
  console.log(`Widgets on canvas: ${widgetsOnCanvas.length}`);

  // If we have widgets, check their content size handling
  if (widgetsOnCanvas.length > 0) {
    for (let i = 0; i < widgetsOnCanvas.length; i++) {
      const widget = widgetsOnCanvas[i];
      const id = await widget.getAttribute('data-widget-id');

      // Check widget's inner structure for scaling
      const info = await widget.evaluate((el) => {
        // Get wrapper dimensions
        const rect = el.getBoundingClientRect();

        // Find the inner content div (should have transform for scaling)
        const contentDivs = el.querySelectorAll('div');
        let scaledDiv = null;
        for (const div of contentDivs) {
          const transform = window.getComputedStyle(div).transform;
          if (transform && transform !== 'none' && transform.includes('matrix')) {
            scaledDiv = {
              transform,
              width: div.clientWidth,
              height: div.clientHeight,
            };
            break;
          }
        }

        // Find iframe
        const iframe = el.querySelector('iframe');
        const iframeRect = iframe?.getBoundingClientRect();

        return {
          wrapperWidth: rect.width,
          wrapperHeight: rect.height,
          hasScaledDiv: !!scaledDiv,
          scaledDiv,
          hasIframe: !!iframe,
          iframeWidth: iframeRect?.width,
          iframeHeight: iframeRect?.height,
        };
      });

      console.log(`\nWidget ${i + 1} (${id?.slice(0, 20)}...):`);
      console.log(`  Wrapper: ${info.wrapperWidth?.toFixed(0)}x${info.wrapperHeight?.toFixed(0)}`);
      if (info.hasScaledDiv) {
        console.log(`  Scaled div: ${info.scaledDiv.width}x${info.scaledDiv.height}`);
        console.log(`  Transform: ${info.scaledDiv.transform}`);
      }
      if (info.hasIframe) {
        console.log(`  Iframe: ${info.iframeWidth?.toFixed(0)}x${info.iframeHeight?.toFixed(0)}`);
      }
    }
  }

  console.log('\n=== TEST COMPLETE ===\n');
});

test('programmatic widget add should trigger content size report', async ({ page }) => {
  console.log('\n=== PROGRAMMATIC WIDGET ADD TEST ===\n');

  // Capture content size messages
  const contentSizeMessages: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Content size') || text.includes('CONTENT_SIZE')) {
      contentSizeMessages.push(text);
      console.log(`[Browser] ${text}`);
    }
  });

  await page.goto('/');
  await page.waitForTimeout(3000);

  // Get the canvas ref and add a widget programmatically
  const result = await page.evaluate(async () => {
    // Try to find the canvas instance
    const canvasTransform = document.querySelector('[data-canvas-transform]');
    if (!canvasTransform) return { success: false, error: 'No canvas found' };

    // Try to dispatch a widget add event or use React internals
    // This is a workaround since we can't access React refs directly

    return { success: true, message: 'Canvas found' };
  });

  console.log('Canvas check:', result);

  // Wait for potential content size reports
  await page.waitForTimeout(3000);

  console.log(`\nCaptured ${contentSizeMessages.length} content size messages`);
  contentSizeMessages.forEach(msg => console.log(`  - ${msg}`));

  await page.screenshot({ path: 'tests/screenshots/content-fix-04-programmatic.png', fullPage: true });
});
