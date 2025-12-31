/**
 * Debug Canvas Clipping
 * Comprehensive test to diagnose why widgets aren't being clipped
 */
import { test, expect } from '@playwright/test';

test.describe('Debug Canvas Clipping', () => {
  test('should diagnose canvas clipping issue', async ({ page }) => {
    console.log('\n=== DEBUG CANVAS CLIPPING ===\n');

    // Go to the canvas
    await page.goto('/c/white-label-store');
    await page.waitForTimeout(4000);

    // Take initial screenshot
    await page.screenshot({ path: 'tests/screenshots/debug-clip-01.png', fullPage: true });

    // Find the canvas transform container
    const transformContainer = page.locator('[data-canvas-transform]');
    const exists = await transformContainer.count() > 0;
    console.log(`Transform container exists: ${exists}`);

    if (exists) {
      // Get all styles
      const styles = await transformContainer.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          overflow: computed.overflow,
          overflowX: computed.overflowX,
          overflowY: computed.overflowY,
          position: computed.position,
          width: computed.width,
          height: computed.height,
          transform: computed.transform,
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        };
      });
      console.log('Transform container styles:', JSON.stringify(styles, null, 2));

      // Get the bounding box
      const box = await transformContainer.boundingBox();
      console.log('Transform container bounding box:', box);
    }

    // Find all widgets and their positions
    const widgets = await page.locator('[data-widget-id]').all();
    console.log(`\nFound ${widgets.length} widgets`);

    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      const id = await widget.getAttribute('data-widget-id');
      const box = await widget.boundingBox();

      // Check if widget is inside or outside canvas bounds
      const posInfo = await widget.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        // Get the transform container
        const canvas = document.querySelector('[data-canvas-transform]');
        const canvasRect = canvas?.getBoundingClientRect();

        return {
          widgetRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          canvasRect: canvasRect ? { x: canvasRect.x, y: canvasRect.y, w: canvasRect.width, h: canvasRect.height } : null,
          position: style.position,
          top: style.top,
          left: style.left,
          zIndex: style.zIndex,
          // Check if widget extends outside canvas
          extendsOutside: canvasRect ? {
            top: rect.y < canvasRect.y,
            bottom: rect.y + rect.height > canvasRect.y + canvasRect.height,
            left: rect.x < canvasRect.x,
            right: rect.x + rect.width > canvasRect.x + canvasRect.width,
          } : null,
        };
      });

      console.log(`\nWidget ${i + 1}: ${id?.slice(0, 20)}...`);
      console.log(`  Position: ${JSON.stringify(posInfo.widgetRect)}`);
      if (posInfo.extendsOutside) {
        const ext = posInfo.extendsOutside;
        if (ext.top || ext.bottom || ext.left || ext.right) {
          console.log(`  ⚠️ EXTENDS OUTSIDE: ${JSON.stringify(ext)}`);
        } else {
          console.log(`  ✓ Inside canvas bounds`);
        }
      }
    }

    // Check parent hierarchy of a widget
    if (widgets.length > 0) {
      console.log('\n--- Widget Parent Hierarchy ---');
      const hierarchy = await widgets[0].evaluate((el) => {
        const getParents = (element: Element | null): any[] => {
          const parents: any[] = [];
          let current = element;
          while (current && parents.length < 10) {
            const style = window.getComputedStyle(current);
            parents.push({
              tag: current.tagName,
              id: current.id || '',
              class: current.className?.toString?.()?.slice(0, 30) || '',
              overflow: style.overflow,
              position: style.position,
              zIndex: style.zIndex,
              isTransformContainer: current.hasAttribute('data-canvas-transform'),
            });
            current = current.parentElement;
          }
          return parents;
        };
        return getParents(el);
      });

      hierarchy.forEach((p, i) => {
        const marker = p.isTransformContainer ? ' <-- TRANSFORM CONTAINER' : '';
        console.log(`  ${i}: <${p.tag}> overflow:${p.overflow} pos:${p.position} z:${p.zIndex}${marker}`);
      });
    }

    // Check if there are any elements with higher z-index that might overlay
    const zIndexIssues = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const highZ: { tag: string; class: string; zIndex: string }[] = [];
      elements.forEach(el => {
        const z = window.getComputedStyle(el).zIndex;
        if (z !== 'auto' && parseInt(z) > 50) {
          highZ.push({
            tag: el.tagName,
            class: el.className?.toString?.()?.slice(0, 30) || '',
            zIndex: z,
          });
        }
      });
      return highZ;
    });

    if (zIndexIssues.length > 0) {
      console.log('\n--- High z-index elements (>50) ---');
      zIndexIssues.forEach(el => {
        console.log(`  <${el.tag}> z:${el.zIndex} class="${el.class}"`);
      });
    }

    // Final screenshot
    await page.screenshot({ path: 'tests/screenshots/debug-clip-02.png', fullPage: true });
    console.log('\nScreenshots saved to tests/screenshots/debug-clip-*.png');
  });
});
