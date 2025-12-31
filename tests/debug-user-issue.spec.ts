/**
 * Debug user's specific issue - widget extending outside canvas with selection border
 */
import { test } from '@playwright/test';

test.describe('Debug User Issue', () => {
  // Test multiple possible canvas URLs
  const canvasUrls = [
    '/',
    '/canvas',
    '/c/test',
    '/c/default',
  ];

  test('capture all canvases and find the issue', async ({ page }) => {
    console.log('\n=== DEBUGGING USER CANVAS ISSUE ===\n');

    // First, let's go to the home page and see what canvases exist
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/user-debug-home.png', fullPage: true });

    // Check what the current page structure looks like
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasCanvas: !!document.querySelector('[data-canvas-transform]'),
        hasCanvasSurface: !!document.querySelector('.canvas-surface'),
        hasWidgets: document.querySelectorAll('[data-widget-id]').length,
      };
    });
    console.log('Page info:', pageInfo);
  });

  test('debug canvas structure in detail', async ({ page }) => {
    console.log('\n=== CANVAS STRUCTURE DEBUG ===\n');

    // Try the main canvas page
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check for any canvas-like containers
    const containers = await page.evaluate(() => {
      const results: any[] = [];

      // Look for various canvas containers
      const selectors = [
        '[data-canvas-transform]',
        '.canvas-surface',
        '.canvas-renderer',
        '.canvas2',
        '[class*="canvas"]',
        '[class*="Canvas"]',
      ];

      selectors.forEach(sel => {
        const els = document.querySelectorAll(sel);
        els.forEach((el, i) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          results.push({
            selector: sel,
            index: i,
            className: el.className,
            overflow: style.overflow,
            position: style.position,
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          });
        });
      });

      return results;
    });

    console.log('Canvas containers found:');
    containers.forEach(c => {
      console.log(`  ${c.selector}[${c.index}]: overflow=${c.overflow}, ${c.rect.w}x${c.rect.h}`);
    });

    // Find all widgets and check if any extend outside their container
    const widgetAnalysis = await page.evaluate(() => {
      const widgets = document.querySelectorAll('[data-widget-id]');
      const results: any[] = [];

      // Find the canvas container
      const canvas = document.querySelector('[data-canvas-transform]') ||
                     document.querySelector('.canvas-surface');
      const canvasRect = canvas?.getBoundingClientRect();

      widgets.forEach((widget, i) => {
        const rect = widget.getBoundingClientRect();
        const style = window.getComputedStyle(widget);

        // Check parent chain for overflow settings
        const parents: any[] = [];
        let parent = widget.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
          const ps = window.getComputedStyle(parent);
          parents.push({
            tag: parent.tagName,
            class: parent.className?.toString?.()?.slice(0, 30) || '',
            overflow: ps.overflow,
            hasTransform: parent.hasAttribute('data-canvas-transform'),
          });
          parent = parent.parentElement;
          depth++;
        }

        const extendsOutside = canvasRect ? {
          top: rect.top < canvasRect.top,
          bottom: rect.bottom > canvasRect.bottom,
          left: rect.left < canvasRect.left,
          right: rect.right > canvasRect.right,
        } : null;

        results.push({
          id: widget.getAttribute('data-widget-id')?.slice(0, 20),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          style: {
            outline: style.outline,
            boxShadow: style.boxShadow?.slice(0, 50),
            zIndex: style.zIndex,
          },
          extendsOutside,
          parents,
        });
      });

      return {
        canvasRect: canvasRect ? {
          x: Math.round(canvasRect.x),
          y: Math.round(canvasRect.y),
          w: Math.round(canvasRect.width),
          h: Math.round(canvasRect.height),
        } : null,
        widgets: results,
      };
    });

    console.log('\nCanvas rect:', widgetAnalysis.canvasRect);
    console.log(`\nWidgets (${widgetAnalysis.widgets.length}):`);

    widgetAnalysis.widgets.forEach((w, i) => {
      console.log(`\n  Widget ${i + 1}: ${w.id}`);
      console.log(`    Rect: ${JSON.stringify(w.rect)}`);
      console.log(`    Style: outline="${w.style.outline}", boxShadow="${w.style.boxShadow}"`);
      if (w.extendsOutside) {
        const ext = w.extendsOutside;
        if (ext.top || ext.bottom || ext.left || ext.right) {
          console.log(`    ⚠️ EXTENDS OUTSIDE: ${JSON.stringify(ext)}`);
        }
      }
      console.log(`    Parent chain:`);
      w.parents.forEach((p: any, j: number) => {
        const marker = p.hasTransform ? ' <-- TRANSFORM' : '';
        console.log(`      ${j}: <${p.tag}> overflow:${p.overflow}${marker}`);
      });
    });

    await page.screenshot({ path: 'tests/screenshots/user-debug-canvas.png', fullPage: true });
  });

  test('check for cyan/teal colored elements', async ({ page }) => {
    console.log('\n=== FINDING CYAN/TEAL ELEMENTS ===\n');

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Enter edit mode
    await page.keyboard.press('e');
    await page.waitForTimeout(500);

    // Click to select a widget
    const widget = page.locator('[data-widget-id]').first();
    if (await widget.count() > 0) {
      await widget.click({ force: true });
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'tests/screenshots/user-debug-selected.png', fullPage: true });

    // Find elements with cyan-ish colors
    const cyanElements = await page.evaluate(() => {
      const results: any[] = [];
      const allElements = document.querySelectorAll('*');

      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const colors = [
          style.borderColor,
          style.outlineColor,
          style.backgroundColor,
          style.color,
        ];

        // Check for cyan-ish colors (rgb values where blue and green are high, red is low)
        const hasCyan = colors.some(c => {
          if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return false;
          const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (match) {
            const [_, r, g, b] = match.map(Number);
            // Cyan-ish: low red, high green and blue
            return r < 100 && g > 150 && b > 150;
          }
          return false;
        });

        if (hasCyan || style.outline.includes('cyan') || style.outline.includes('#0ff') ||
            style.borderColor.includes('cyan') || style.boxShadow.includes('cyan')) {
          const rect = el.getBoundingClientRect();
          results.push({
            tag: el.tagName,
            class: el.className?.toString?.()?.slice(0, 40) || '',
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            outline: style.outline,
            border: style.border,
            boxShadow: style.boxShadow?.slice(0, 60),
          });
        }
      });

      return results;
    });

    console.log(`Found ${cyanElements.length} cyan-ish elements:`);
    cyanElements.forEach((el, i) => {
      console.log(`  ${i + 1}. <${el.tag}> class="${el.class}"`);
      console.log(`     outline: ${el.outline}`);
      console.log(`     border: ${el.border}`);
      if (el.boxShadow && el.boxShadow !== 'none') {
        console.log(`     boxShadow: ${el.boxShadow}`);
      }
    });
  });
});
