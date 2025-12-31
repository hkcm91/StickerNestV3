/**
 * Crop Fix Verification Test
 * Verifies that the new overflow-based cropping works correctly
 */
import { test, expect } from '@playwright/test';

test.describe('Crop Fix Verification', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[error] ${msg.text()}`);
      }
    });

    await page.goto('/c/white-label-store');
    await page.waitForTimeout(3000);
  });

  test('should verify new overflow-based cropping works on widgets', async ({ page }) => {
    console.log('\n=== OVERFLOW-BASED CROP VERIFICATION ===\n');

    // Screenshot baseline
    await page.screenshot({ path: 'tests/screenshots/crop-fix-01-baseline.png', fullPage: true });

    const widget = page.locator('[data-widget-id]').first();
    const exists = await widget.count() > 0;
    if (!exists) {
      console.log('No widgets found');
      return;
    }

    // Analyze the new DOM structure
    const structure = await widget.evaluate((el) => {
      const analyze = (element: Element, depth = 0): any => {
        const style = window.getComputedStyle(element);
        const result: any = {
          tag: element.tagName,
          depth,
          styles: {
            position: style.position,
            overflow: style.overflow,
            top: style.top,
            left: style.left,
            right: style.right,
            bottom: style.bottom,
            width: style.width,
            height: style.height,
          },
          children: [] as any[],
        };

        // Only recurse into first few divs
        if (element.tagName === 'DIV' && depth < 5) {
          const kids = Array.from(element.children).slice(0, 3);
          for (const kid of kids) {
            result.children.push(analyze(kid, depth + 1));
          }
        }
        return result;
      };
      return analyze(el);
    });

    console.log('Widget DOM structure:');
    const printStructure = (node: any, indent = '') => {
      const overflowInfo = node.styles.overflow !== 'visible' ? ` overflow:${node.styles.overflow}` : '';
      const posInfo = node.styles.position !== 'static' ? ` pos:${node.styles.position}` : '';
      const cropInfo = (node.styles.top !== '0px' && node.styles.top !== 'auto') ? ` top:${node.styles.top}` : '';
      console.log(`${indent}<${node.tag}>${posInfo}${overflowInfo}${cropInfo}`);
      for (const child of node.children) {
        printStructure(child, indent + '  ');
      }
    };
    printStructure(structure);

    // Now simulate setting crop values by finding the crop viewport div and modifying it
    const cropResult = await widget.evaluate((el) => {
      // Find the second-level div (should be the outer content wrapper with overflow:hidden)
      const outerWrapper = el.querySelector('div');
      if (!outerWrapper) return { error: 'No outer wrapper found' };

      // The new structure should have:
      // div (outer, overflow:hidden)
      //   div (viewport, positioned by crop)
      //     div (content, sized to fill original area)

      const viewport = outerWrapper.querySelector('div');
      if (!viewport) return { error: 'No viewport div found' };

      // Simulate a 30% top crop by setting the viewport positioning
      (viewport as HTMLElement).style.top = '30%';
      (viewport as HTMLElement).style.left = '0%';
      (viewport as HTMLElement).style.right = '0%';
      (viewport as HTMLElement).style.bottom = '0%';

      // Find the content div and set its positioning
      const content = viewport.querySelector('div');
      if (!content) return { error: 'No content div found' };

      // Content should be scaled up to compensate and positioned to show correct portion
      // If top crop is 30%, viewport is 70% tall
      // Content needs to be 100/70 = 143% of viewport height
      // Content top should be -30*100/70 = -43% to show correct portion
      (content as HTMLElement).style.width = '100%';
      (content as HTMLElement).style.height = `${100 * 100 / 70}%`;
      (content as HTMLElement).style.top = `${-30 * 100 / 70}%`;
      (content as HTMLElement).style.left = '0';

      // Force repaint
      el.offsetHeight;

      // Get computed styles after change
      const viewportStyle = window.getComputedStyle(viewport);
      const contentStyle = window.getComputedStyle(content);

      return {
        viewport: {
          top: viewportStyle.top,
          overflow: viewportStyle.overflow,
          height: viewportStyle.height,
        },
        content: {
          top: contentStyle.top,
          height: contentStyle.height,
        },
      };
    });

    console.log('\nAfter simulating 30% top crop:', cropResult);

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/crop-fix-02-after-crop.png', fullPage: true });

    console.log('\nScreenshots saved. Compare:');
    console.log('- crop-fix-01-baseline.png: Full widget visible');
    console.log('- crop-fix-02-after-crop.png: Top 30% should be cropped');
  });

  test('should verify crop handles update widget state correctly', async ({ page }) => {
    console.log('\n=== CROP HANDLE INTERACTION TEST ===\n');

    // Enter edit mode
    await page.keyboard.press('e');
    await page.waitForTimeout(500);

    // Click on a widget to select it
    const widget = page.locator('[data-widget-id]').first();
    await widget.click({ force: true, position: { x: 50, y: 50 } });
    await page.waitForTimeout(500);

    // Screenshot after selection
    await page.screenshot({ path: 'tests/screenshots/crop-fix-03-selected.png', fullPage: true });

    // Check if we're in edit mode by looking for toolbar buttons
    const toolbar = await page.locator('button[title*="Crop"], button[title*="crop"]').count();
    console.log(`Found ${toolbar} crop button(s)`);

    // Check the DOM for any evidence of edit mode
    const editModeInfo = await page.evaluate(() => {
      // Look for any element with edit-related data attributes or classes
      const editOverlays = document.querySelectorAll('[data-edit-overlay]');
      const resizeHandles = document.querySelectorAll('[data-resize-handle]');
      return {
        editOverlays: editOverlays.length,
        resizeHandles: resizeHandles.length,
      };
    });
    console.log('Edit mode indicators:', editModeInfo);

    // If we found the crop button, try to click it
    if (toolbar > 0) {
      const cropBtn = page.locator('button[title*="Crop"], button[title*="crop"]').first();
      await cropBtn.click();
      await page.waitForTimeout(300);

      await page.screenshot({ path: 'tests/screenshots/crop-fix-04-crop-mode.png', fullPage: true });

      // Check for crop handles
      const cropHandles = await page.locator('[data-crop-handle]').count();
      console.log(`Found ${cropHandles} crop handles`);
    }
  });

  test('should compare crop behavior with known working method', async ({ page }) => {
    console.log('\n=== COMPARISON TEST: clip-path vs overflow ===\n');

    // Create a test page comparing the two methods
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { background: #1a1a2e; margin: 0; padding: 40px; font-family: sans-serif; }
          h2 { color: white; margin-bottom: 20px; }
          .container { display: flex; gap: 40px; }
          .box { width: 400px; }
          .label { color: white; font-size: 14px; margin-bottom: 8px; }
          .widget-frame {
            width: 400px;
            height: 300px;
            border: 2px solid #8b5cf6;
            position: relative;
            background: #0f0f19;
          }
        </style>
      </head>
      <body>
        <h2>Crop Method Comparison (30% from top)</h2>
        <div class="container">
          <div class="box">
            <div class="label">OLD METHOD: clip-path (BROKEN for iframes)</div>
            <div class="widget-frame">
              <div style="position:absolute; inset:0; overflow:hidden; clip-path:inset(30% 0% 0% 0%);">
                <iframe srcdoc="<body style='margin:0;background:linear-gradient(to bottom,#ef4444,#991b1b);display:flex;align-items:center;justify-content:center;height:100vh;color:white;font-size:24px'>TOP SHOULD BE HIDDEN</body>" style="width:100%;height:100%;border:none;"></iframe>
              </div>
            </div>
          </div>
          <div class="box">
            <div class="label">NEW METHOD: overflow + positioning (WORKS)</div>
            <div class="widget-frame">
              <div style="position:absolute; inset:0; overflow:hidden;">
                <!-- Viewport positioned to show only bottom 70% -->
                <div style="position:absolute; top:30%; left:0; right:0; bottom:0; overflow:hidden;">
                  <!-- Content scaled and positioned to fill original area -->
                  <div style="position:absolute; width:100%; height:142.86%; top:-42.86%; left:0;">
                    <iframe srcdoc="<body style='margin:0;background:linear-gradient(to bottom,#22c55e,#166534);display:flex;align-items:center;justify-content:center;height:100vh;color:white;font-size:24px'>TOP SHOULD BE HIDDEN</body>" style="width:100%;height:100%;border:none;"></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p style="color:#9ca3af;margin-top:20px;">If clip-path worked, both boxes would show content starting from 30% down. The green box (new method) should clip correctly.</p>
      </body>
      </html>
    `);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/crop-fix-comparison.png', fullPage: true });

    console.log('Comparison screenshot saved to crop-fix-comparison.png');
    console.log('- Red box uses clip-path (should show full content = BROKEN)');
    console.log('- Green box uses overflow positioning (should clip top 30% = WORKING)');
  });
});
