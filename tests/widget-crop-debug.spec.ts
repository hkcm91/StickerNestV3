/**
 * Widget Crop/Mask Debug Test
 * Investigates why widgets appear showing full content even when cropped/masked
 */
import { test, expect } from '@playwright/test';

test.describe('Widget Crop/Mask Debug', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
    });

    // Navigate to a canvas
    await page.goto('/c/white-label-store');
    await page.waitForTimeout(3000);
  });

  test('should inspect widget rendering and overflow properties', async ({ page }) => {
    console.log('\n=== WIDGET CROP/MASK DEBUG TEST ===\n');

    // Take initial screenshot
    await page.screenshot({ path: 'tests/screenshots/debug-01-initial.png', fullPage: true });

    // Find all widgets
    const widgets = await page.locator('[data-widget-id]').all();
    console.log(`Found ${widgets.length} widgets on canvas`);

    if (widgets.length === 0) {
      console.log('No widgets found - checking for iframe widgets...');
      const iframes = await page.locator('iframe').all();
      console.log(`Found ${iframes.length} iframes`);
      return;
    }

    // Analyze each widget's CSS properties
    for (let i = 0; i < Math.min(widgets.length, 5); i++) {
      const widget = widgets[i];
      const widgetId = await widget.getAttribute('data-widget-id');
      const box = await widget.boundingBox();

      console.log(`\n--- Widget ${i + 1}: ${widgetId} ---`);
      console.log(`Bounding box:`, box);

      // Get all computed styles that affect visibility/clipping
      const styles = await widget.evaluate((el) => {
        const computed = window.getComputedStyle(el);

        // Get all children's styles too
        const children: Array<{ tag: string; class: string; styles: Record<string, string> }> = [];
        const walkChildren = (element: Element, depth = 0) => {
          if (depth > 4) return; // Limit depth
          for (const child of Array.from(element.children)) {
            const childComputed = window.getComputedStyle(child);
            children.push({
              tag: child.tagName,
              class: child.className || '',
              styles: {
                overflow: childComputed.overflow,
                overflowX: childComputed.overflowX,
                overflowY: childComputed.overflowY,
                clipPath: childComputed.clipPath,
                mask: childComputed.mask,
                maskImage: childComputed.maskImage,
                clip: childComputed.clip,
                width: childComputed.width,
                height: childComputed.height,
                position: childComputed.position,
              }
            });
            walkChildren(child, depth + 1);
          }
        };
        walkChildren(el);

        return {
          parent: {
            overflow: computed.overflow,
            overflowX: computed.overflowX,
            overflowY: computed.overflowY,
            clipPath: computed.clipPath,
            webkitClipPath: (computed as any).webkitClipPath || 'N/A',
            mask: computed.mask,
            maskImage: computed.maskImage,
            clip: computed.clip,
            width: computed.width,
            height: computed.height,
            position: computed.position,
            transform: computed.transform,
          },
          children,
        };
      });

      console.log('Parent styles:', JSON.stringify(styles.parent, null, 2));
      console.log('Children count:', styles.children.length);

      // Log children with interesting overflow/clip properties
      const clippingChildren = styles.children.filter(c =>
        c.styles.overflow !== 'visible' ||
        c.styles.clipPath !== 'none' ||
        c.styles.mask !== 'none'
      );

      if (clippingChildren.length > 0) {
        console.log('Children with clipping:');
        clippingChildren.forEach((c, j) => {
          console.log(`  ${j + 1}. <${c.tag} class="${c.class}">`, c.styles);
        });
      }

      // Check for iframes inside the widget
      const iframeInfo = await widget.evaluate((el) => {
        const iframe = el.querySelector('iframe');
        if (!iframe) return null;
        const iframeStyle = window.getComputedStyle(iframe);
        return {
          src: iframe.src,
          width: iframeStyle.width,
          height: iframeStyle.height,
          overflow: iframeStyle.overflow,
        };
      });

      if (iframeInfo) {
        console.log('Contains iframe:', iframeInfo);
      }
    }

    // Screenshot individual widgets
    for (let i = 0; i < Math.min(widgets.length, 3); i++) {
      const widget = widgets[i];
      const widgetId = await widget.getAttribute('data-widget-id');
      try {
        await widget.screenshot({ path: `tests/screenshots/debug-widget-${i + 1}-${widgetId?.slice(0, 8)}.png` });
      } catch (e) {
        console.log(`Could not screenshot widget ${i + 1}:`, (e as Error).message);
      }
    }

    // Try to enter edit mode and select a widget
    console.log('\n--- Entering Edit Mode ---');

    // Look for edit mode toggle
    const editToggle = page.locator('[data-testid="edit-mode-toggle"], button:has-text("Edit"), button[title*="Edit"]').first();
    if (await editToggle.isVisible().catch(() => false)) {
      await editToggle.click();
      await page.waitForTimeout(500);
      console.log('Clicked edit mode toggle');
    }

    await page.screenshot({ path: 'tests/screenshots/debug-02-edit-mode.png', fullPage: true });

    // Select first widget
    const firstWidget = page.locator('[data-widget-id]').first();
    await firstWidget.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/screenshots/debug-03-selected.png', fullPage: true });

    // Look for the crop button and click it
    const cropBtn = page.locator('button[title*="Crop"], button[title*="crop"]').first();
    if (await cropBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found crop button, clicking...');
      await cropBtn.click();
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'tests/screenshots/debug-04-crop-mode.png', fullPage: true });

      // Check the widget's clip-path value
      const clipInfo = await firstWidget.evaluate((el) => {
        const getAllClipPaths = (element: Element): string[] => {
          const paths: string[] = [];
          const traverse = (e: Element) => {
            const style = window.getComputedStyle(e);
            const clip = style.clipPath;
            if (clip && clip !== 'none') {
              paths.push(`${e.tagName}.${e.className}: ${clip}`);
            }
            for (const child of Array.from(e.children)) {
              traverse(child);
            }
          };
          traverse(element);
          return paths;
        };
        return getAllClipPaths(el);
      });

      console.log('Clip paths found in widget tree:', clipInfo);

      // Apply a crop by dragging
      const topHandle = page.locator('[data-crop-handle="top"]');
      if (await topHandle.isVisible().catch(() => false)) {
        const handleBox = await topHandle.boundingBox();
        if (handleBox) {
          console.log('Dragging top crop handle...');
          await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 80, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(500);

          await page.screenshot({ path: 'tests/screenshots/debug-05-after-crop.png', fullPage: true });

          // Check clip-path after cropping
          const clipAfter = await firstWidget.evaluate((el) => {
            const getAllClipPaths = (element: Element): string[] => {
              const paths: string[] = [];
              const traverse = (e: Element) => {
                const style = window.getComputedStyle(e);
                const clip = style.clipPath;
                if (clip && clip !== 'none') {
                  paths.push(`${e.tagName}.${e.className}: ${clip}`);
                }
                for (const child of Array.from(e.children)) {
                  traverse(child);
                }
              };
              traverse(element);
              return paths;
            };
            return getAllClipPaths(el);
          });

          console.log('Clip paths AFTER crop:', clipAfter);
        }
      }
    }

    // Final comprehensive screenshot
    await page.screenshot({ path: 'tests/screenshots/debug-06-final.png', fullPage: true });
  });

  test('should check for iframe sandbox issues', async ({ page }) => {
    console.log('\n=== IFRAME SANDBOX DEBUG ===\n');

    await page.waitForTimeout(2000);

    // Check all iframes on the page
    const iframes = await page.locator('iframe').all();
    console.log(`Found ${iframes.length} iframes`);

    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      const info = await iframe.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          src: el.src,
          sandbox: el.sandbox?.toString() || 'none',
          width: style.width,
          height: style.height,
          overflow: style.overflow,
          clipPath: style.clipPath,
          parentOverflow: el.parentElement ? window.getComputedStyle(el.parentElement).overflow : 'no parent',
          parentClipPath: el.parentElement ? window.getComputedStyle(el.parentElement).clipPath : 'no parent',
        };
      });
      console.log(`\nIframe ${i + 1}:`, info);
    }
  });

  test('should test canvas mask overlay', async ({ page }) => {
    console.log('\n=== CANVAS MASK OVERLAY DEBUG ===\n');

    await page.waitForTimeout(2000);

    // Check for canvas mask overlay component
    const maskOverlay = page.locator('[data-canvas-mask], .canvas-mask, [class*="mask"]');
    const maskCount = await maskOverlay.count();
    console.log(`Found ${maskCount} potential mask elements`);

    if (maskCount > 0) {
      for (let i = 0; i < Math.min(maskCount, 5); i++) {
        const mask = maskOverlay.nth(i);
        const info = await mask.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            className: el.className,
            id: el.id,
            tagName: el.tagName,
            width: style.width,
            height: style.height,
            position: style.position,
            zIndex: style.zIndex,
            pointerEvents: style.pointerEvents,
            clipPath: style.clipPath,
            overflow: style.overflow,
          };
        });
        console.log(`Mask element ${i + 1}:`, info);
      }
    }

    // Check CanvasMaskOverlay component specifically
    const canvasMask = page.locator('[class*="CanvasMask"]');
    if (await canvasMask.count() > 0) {
      console.log('\nFound CanvasMask component');
      const styles = await canvasMask.first().evaluate((el) => {
        return {
          innerHTML: el.innerHTML.slice(0, 500),
          styles: window.getComputedStyle(el),
        };
      });
      console.log('CanvasMask innerHTML preview:', styles.innerHTML);
    }

    await page.screenshot({ path: 'tests/screenshots/debug-mask-overlay.png', fullPage: true });
  });
});
