/**
 * Widget Visibility & Cropping Debug Test
 * Focused test to identify why widgets show full content even when cropped
 */
import { test, expect } from '@playwright/test';

test.describe('Widget Visibility Debug', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('clip') || text.includes('overflow') || text.includes('mask') || text.includes('Error')) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto('/c/white-label-store');
    await page.waitForTimeout(2000);
  });

  test('should analyze widget clipping hierarchy', async ({ page }) => {
    console.log('\n=== WIDGET CLIPPING HIERARCHY ANALYSIS ===\n');

    // Screenshot before any changes
    await page.screenshot({ path: 'tests/screenshots/visibility-01-initial.png', fullPage: true });

    // Find all widget wrappers
    const widgets = await page.locator('[data-widget-id]').all();
    console.log(`Found ${widgets.length} widgets`);

    if (widgets.length === 0) {
      console.log('No widgets found');
      return;
    }

    // Analyze the FIRST widget in detail
    const widget = widgets[0];
    const widgetId = await widget.getAttribute('data-widget-id');
    console.log(`\nAnalyzing widget: ${widgetId}`);

    // Get the full element hierarchy with styles
    const hierarchy = await widget.evaluate((el) => {
      const getElementInfo = (element: Element | null, depth: number = 0): any => {
        if (!element || depth > 10) return null;

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        // Get key CSS properties that affect visibility
        const info: any = {
          tag: element.tagName,
          className: element.className?.slice?.(0, 50) || '',
          id: element.id || '',
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          css: {
            overflow: style.overflow,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            clipPath: style.clipPath,
            clip: style.clip,
            mask: style.mask,
            position: style.position,
            zIndex: style.zIndex,
          },
          children: [] as any[],
        };

        // Remove none/visible/auto values to reduce noise
        Object.keys(info.css).forEach(k => {
          if (['visible', 'auto', 'none', 'static'].includes(info.css[k])) {
            info.css[k] = '-';
          }
        });

        // Get first few children
        const kids = Array.from(element.children);
        for (let i = 0; i < Math.min(kids.length, 5); i++) {
          const childInfo = getElementInfo(kids[i], depth + 1);
          if (childInfo) info.children.push(childInfo);
        }

        return info;
      };

      return getElementInfo(el);
    });

    console.log('\nWidget element hierarchy:');
    const printHierarchy = (node: any, indent = 0) => {
      const prefix = '  '.repeat(indent);
      const cssStr = Object.entries(node.css)
        .filter(([_, v]) => v !== '-')
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');

      console.log(`${prefix}<${node.tag}> [${node.rect.w}x${node.rect.h}] ${cssStr || '(default)'}`);

      for (const child of node.children || []) {
        printHierarchy(child, indent + 1);
      }
    };
    printHierarchy(hierarchy);

    // Check for iframe specifically
    const iframeInfo = await widget.evaluate((el) => {
      const iframe = el.querySelector('iframe');
      if (!iframe) return null;

      const style = window.getComputedStyle(iframe);
      const rect = iframe.getBoundingClientRect();

      // Get parent chain styles
      const parents: any[] = [];
      let parent = iframe.parentElement;
      while (parent && parent !== el && parents.length < 5) {
        const ps = window.getComputedStyle(parent);
        parents.push({
          tag: parent.tagName,
          overflow: ps.overflow,
          clipPath: ps.clipPath,
          position: ps.position,
        });
        parent = parent.parentElement;
      }

      return {
        src: iframe.src?.slice(0, 50) || 'srcdoc',
        sandbox: iframe.sandbox?.toString() || 'none',
        rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
        style: {
          overflow: style.overflow,
          position: style.position,
        },
        parents,
      };
    });

    if (iframeInfo) {
      console.log('\nIframe details:', JSON.stringify(iframeInfo, null, 2));
    }

    // Check the widget's crop value from data attributes or evaluate the state
    const widgetState = await page.evaluate((id) => {
      // Try to access the widget state from Zustand store if available
      const w = (window as any).__STICKERNEST_DEBUG__;
      if (w?.widgets) {
        const widget = w.widgets.find((x: any) => x.id === id);
        return widget ? { crop: widget.crop, visible: widget.visible } : null;
      }
      return null;
    }, widgetId);

    console.log('\nWidget state from store:', widgetState);
  });

  test('should verify clip-path CSS is applied correctly', async ({ page }) => {
    console.log('\n=== CLIP-PATH CSS VERIFICATION ===\n');

    // Enable edit mode by clicking Edit button or pressing E
    await page.keyboard.press('e');
    await page.waitForTimeout(500);

    // Find and click a widget
    const widget = page.locator('[data-widget-id]').first();
    await widget.click({ force: true });
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/screenshots/visibility-02-selected.png', fullPage: true });

    // Find crop button and click it
    const cropBtn = page.locator('button[title*="Crop"], button[title*="crop"]');
    const cropVisible = await cropBtn.isVisible().catch(() => false);
    console.log(`Crop button visible: ${cropVisible}`);

    if (cropVisible) {
      await cropBtn.click();
      await page.waitForTimeout(300);

      await page.screenshot({ path: 'tests/screenshots/visibility-03-crop-mode.png', fullPage: true });

      // Get clip-path before crop
      const clipBefore = await widget.evaluate((el) => {
        const findClipPath = (e: Element): string | null => {
          const s = window.getComputedStyle(e);
          if (s.clipPath && s.clipPath !== 'none') return `${e.tagName}: ${s.clipPath}`;
          for (const c of Array.from(e.children)) {
            const found = findClipPath(c);
            if (found) return found;
          }
          return null;
        };
        return findClipPath(el);
      });
      console.log('Clip-path BEFORE crop:', clipBefore || 'none found');

      // Drag the top crop handle down
      const topHandle = page.locator('[data-crop-handle="top"]');
      if (await topHandle.isVisible().catch(() => false)) {
        const box = await topHandle.boundingBox();
        if (box) {
          console.log(`Dragging top handle from y=${box.y}`);
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2, box.y + 100, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(500);

          await page.screenshot({ path: 'tests/screenshots/visibility-04-after-crop.png', fullPage: true });

          // Check clip-path after crop
          const clipAfter = await widget.evaluate((el) => {
            const findClipPath = (e: Element): string | null => {
              const s = window.getComputedStyle(e);
              if (s.clipPath && s.clipPath !== 'none') return `${e.tagName}: ${s.clipPath}`;
              for (const c of Array.from(e.children)) {
                const found = findClipPath(c);
                if (found) return found;
              }
              return null;
            };
            return findClipPath(el);
          });
          console.log('Clip-path AFTER crop:', clipAfter || 'none found');

          // Check if the visual area changed
          const widgetBox = await widget.boundingBox();
          console.log('Widget bounding box:', widgetBox);

          // Check the widget's inner content div styles
          const innerStyles = await widget.evaluate((el) => {
            // Look for the content div with clip-path
            const divs = el.querySelectorAll('div');
            const results: any[] = [];
            divs.forEach((div, i) => {
              const s = window.getComputedStyle(div);
              if (s.clipPath !== 'none' || s.overflow === 'hidden') {
                results.push({
                  index: i,
                  clipPath: s.clipPath,
                  overflow: s.overflow,
                  width: s.width,
                  height: s.height,
                });
              }
            });
            return results;
          });
          console.log('Inner divs with clipping:', innerStyles);
        }
      } else {
        console.log('Crop handle not visible');
      }
    }
  });

  test('should check canvas mask overlay settings', async ({ page }) => {
    console.log('\n=== CANVAS MASK OVERLAY SETTINGS ===\n');

    // Check if mask overlay exists
    const maskOverlays = await page.locator('[data-mask-overlay]').count();
    console.log(`Found ${maskOverlays} mask overlay elements`);

    // Check the mask store settings via the browser
    const maskSettings = await page.evaluate(() => {
      // Try to get from localStorage
      const stored = localStorage.getItem('stickernest-canvas-appearance');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.state?.mask || parsed.mask || 'not found in parsed';
        } catch {
          return 'parse error';
        }
      }
      return 'not in localStorage';
    });
    console.log('Mask settings from localStorage:', maskSettings);

    // If mask is disabled, enable it via UI
    const settingsBtn = page.locator('button[title*="Settings"], button[aria-label*="settings"]').first();
    if (await settingsBtn.isVisible().catch(() => false)) {
      console.log('Found settings button');
    }

    // Check what elements have overflow:hidden that could clip widgets
    const overflowHiddenCount = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      let count = 0;
      allElements.forEach(el => {
        const s = window.getComputedStyle(el);
        if (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowY === 'hidden') {
          count++;
        }
      });
      return count;
    });
    console.log(`Elements with overflow:hidden: ${overflowHiddenCount}`);

    await page.screenshot({ path: 'tests/screenshots/visibility-05-mask-check.png', fullPage: true });
  });

  test('should test widget content vs frame size mismatch', async ({ page }) => {
    console.log('\n=== WIDGET CONTENT VS FRAME SIZE ===\n');

    const widget = page.locator('[data-widget-id]').first();
    const exists = await widget.count() > 0;

    if (!exists) {
      console.log('No widgets found');
      return;
    }

    // Get comprehensive size info
    const sizeInfo = await widget.evaluate((el) => {
      const rect = el.getBoundingClientRect();

      // Find iframe
      const iframe = el.querySelector('iframe');
      let iframeRect = null;
      let iframeContentSize = null;

      if (iframe) {
        iframeRect = iframe.getBoundingClientRect();
        try {
          // Try to get content size (will fail for cross-origin)
          const doc = iframe.contentDocument;
          if (doc?.body) {
            iframeContentSize = {
              scrollWidth: doc.body.scrollWidth,
              scrollHeight: doc.body.scrollHeight,
            };
          }
        } catch (e) {
          iframeContentSize = 'cross-origin';
        }
      }

      // Check all ancestor containers with dimensions
      const ancestors: any[] = [];
      let parent = el.parentElement;
      while (parent && ancestors.length < 5) {
        const pr = parent.getBoundingClientRect();
        const ps = window.getComputedStyle(parent);
        if (pr.width > 0 && pr.height > 0) {
          ancestors.push({
            tag: parent.tagName,
            className: parent.className?.slice?.(0, 30) || '',
            size: { w: Math.round(pr.width), h: Math.round(pr.height) },
            overflow: ps.overflow,
          });
        }
        parent = parent.parentElement;
      }

      return {
        wrapper: { w: Math.round(rect.width), h: Math.round(rect.height) },
        iframe: iframeRect ? { w: Math.round(iframeRect.width), h: Math.round(iframeRect.height) } : null,
        iframeContent: iframeContentSize,
        ancestors,
      };
    });

    console.log('Size info:', JSON.stringify(sizeInfo, null, 2));

    // Check if there's a size mismatch indicating content overflow
    if (sizeInfo.iframe && sizeInfo.iframeContent && typeof sizeInfo.iframeContent !== 'string') {
      const wrapperW = sizeInfo.wrapper.w;
      const contentW = sizeInfo.iframeContent.scrollWidth;
      const wrapperH = sizeInfo.wrapper.h;
      const contentH = sizeInfo.iframeContent.scrollHeight;

      console.log(`\nContent overflow check:`);
      console.log(`  Width: wrapper=${wrapperW}, content=${contentW}, overflow=${contentW > wrapperW}`);
      console.log(`  Height: wrapper=${wrapperH}, content=${contentH}, overflow=${contentH > wrapperH}`);
    }

    await page.screenshot({ path: 'tests/screenshots/visibility-06-size-check.png', fullPage: true });
  });
});
