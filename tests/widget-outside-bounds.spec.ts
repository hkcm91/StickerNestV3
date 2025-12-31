/**
 * Widget Outside Bounds Test
 * Tests clipping when widget is positioned outside canvas bounds
 */
import { test, expect } from '@playwright/test';

test.describe('Widget Outside Bounds', () => {
  test('should clip widget that extends beyond canvas', async ({ page }) => {
    console.log('\n=== WIDGET OUTSIDE BOUNDS TEST ===\n');

    await page.goto('/c/white-label-store');
    await page.waitForTimeout(3000);

    // Screenshot before modification
    await page.screenshot({ path: 'tests/screenshots/outside-01-before.png', fullPage: true });

    // Find the first widget and move it to extend outside canvas
    const widget = page.locator('[data-widget-id]').first();
    const exists = await widget.count() > 0;

    if (!exists) {
      console.log('No widgets found');
      return;
    }

    // Get canvas bounds
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('[data-canvas-transform]');
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const style = window.getComputedStyle(canvas);
      return {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        overflow: style.overflow,
        // Get the actual canvas size from the style
        width: parseInt(style.width),
        height: parseInt(style.height),
      };
    });
    console.log('Canvas info:', canvasInfo);

    // Move the widget so it extends beyond the RIGHT edge of the canvas
    // Position it at x = canvasWidth - 100 (so 100px visible, rest outside)
    const moveResult = await widget.evaluate((el, canvasWidth) => {
      const widgetRect = el.getBoundingClientRect();

      // Move widget to extend beyond right edge
      // The widget is positioned with style.left, so we need to modify that
      const style = (el as HTMLElement).style;
      const currentLeft = parseFloat(style.left) || 0;

      // Calculate new position: canvas width - 100 pixels
      // This should make most of the widget extend outside
      const newLeft = (canvasWidth || 1400) - 100;

      style.left = `${newLeft}px`;
      style.top = '100px';

      // Force repaint
      el.offsetHeight;

      const newRect = el.getBoundingClientRect();

      return {
        originalLeft: currentLeft,
        newLeft: newLeft,
        widgetWidth: widgetRect.width,
        newRect: { x: newRect.x, y: newRect.y, w: newRect.width, h: newRect.height },
      };
    }, canvasInfo?.width || 1400);

    console.log('Move result:', moveResult);

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/outside-02-moved.png', fullPage: true });

    // Verify clipping is happening
    const isClipped = await page.evaluate(() => {
      const canvas = document.querySelector('[data-canvas-transform]');
      const widget = document.querySelector('[data-widget-id]');

      if (!canvas || !widget) return { error: 'Elements not found' };

      const canvasRect = canvas.getBoundingClientRect();
      const widgetRect = widget.getBoundingClientRect();

      // Check if the widget visually extends beyond canvas
      const extendsRight = widgetRect.x + widgetRect.width > canvasRect.x + canvasRect.width;
      const extendsBottom = widgetRect.y + widgetRect.height > canvasRect.y + canvasRect.height;

      // Get the canvas overflow setting
      const canvasOverflow = window.getComputedStyle(canvas).overflow;

      return {
        canvasRight: canvasRect.x + canvasRect.width,
        widgetRight: widgetRect.x + widgetRect.width,
        extendsRight,
        extendsBottom,
        canvasOverflow,
        shouldBeClipped: canvasOverflow === 'hidden' && (extendsRight || extendsBottom),
      };
    });

    console.log('Clipping check:', isClipped);

    // The widget's bounding box should still show full size
    // but visually it should be clipped
    console.log('\nIf overflow:hidden is working, the widget should be visually clipped');
    console.log('Check the screenshot to verify visually');
  });

  test('should test with transform on widget', async ({ page }) => {
    console.log('\n=== TRANSFORM + CLIP TEST ===\n');

    // Create a simple test page to verify transform + overflow behavior
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 40px; background: #1a1a2e; }

          .canvas-container {
            position: relative;
            width: 800px;
            height: 500px;
            background: #2a2a3e;
            border: 2px solid #8b5cf6;
          }

          .transform-container {
            position: absolute;
            width: 600px;
            height: 400px;
            transform: translate(50px, 50px) scale(1);
            transform-origin: 0 0;
            background: rgba(59, 130, 246, 0.2);
            overflow: hidden;
            border: 2px solid #3b82f6;
          }

          .widget {
            position: absolute;
            left: 450px; /* Extends beyond 600px container */
            top: 50px;
            width: 300px;
            height: 200px;
            background: #ef4444;
            z-index: 50;
          }

          .widget iframe {
            width: 100%;
            height: 100%;
            border: none;
          }

          .label {
            color: white;
            font-family: sans-serif;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="label">Canvas container (purple border) - Transform container (blue border, overflow:hidden)</div>
        <div class="label">Red widget positioned at x=450 should be clipped at x=600</div>

        <div class="canvas-container">
          <div class="transform-container">
            <div class="widget">
              <iframe srcdoc="<body style='margin:0;background:#ef4444;color:white;font:20px sans-serif;padding:20px'>This widget extends beyond the container. Only the left part (up to x=600) should be visible.</body>"></iframe>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/outside-03-transform-clip.png', fullPage: true });

    // Check if clipping is working
    const result = await page.evaluate(() => {
      const container = document.querySelector('.transform-container');
      const widget = document.querySelector('.widget');

      if (!container || !widget) return null;

      const containerRect = container.getBoundingClientRect();
      const widgetRect = widget.getBoundingClientRect();

      return {
        containerRight: containerRect.right,
        widgetRight: widgetRect.right,
        overflow: window.getComputedStyle(container).overflow,
        widgetClipped: widgetRect.right > containerRect.right,
      };
    });

    console.log('Transform + clip result:', result);
  });
});
