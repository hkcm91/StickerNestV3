/**
 * Iframe Clip-Path Issue Test
 * Tests whether iframes respect parent clip-path CSS
 */
import { test, expect } from '@playwright/test';

test.describe('Iframe Clip-Path Issue', () => {
  test('should test if iframes ignore parent clip-path', async ({ page }) => {
    console.log('\n=== IFRAME CLIP-PATH TEST ===\n');

    // Create a test page with an iframe and clip-path
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { background: #1a1a2e; margin: 0; padding: 40px; }

          .container {
            width: 400px;
            height: 300px;
            position: relative;
            margin: 20px;
            display: inline-block;
            vertical-align: top;
          }

          .label {
            color: white;
            font-family: sans-serif;
            margin-bottom: 10px;
          }

          .clip-wrapper {
            width: 100%;
            height: 100%;
            clip-path: inset(25% 0% 0% 0%);
            -webkit-clip-path: inset(25% 0% 0% 0%);
            overflow: hidden;
            background: rgba(255,255,255,0.1);
            border: 2px solid red;
          }

          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }

          .regular-content {
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, #8b5cf6 0%, #4c1d95 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-family: sans-serif;
          }
        </style>
      </head>
      <body>
        <div style="color: white; font-family: sans-serif; margin-bottom: 20px;">
          <h2>Clip-Path Test: 25% from top should be clipped (red border shows wrapper)</h2>
        </div>

        <div class="container">
          <div class="label">Regular DIV (should clip)</div>
          <div class="clip-wrapper">
            <div class="regular-content">
              TOP SHOULD BE HIDDEN
            </div>
          </div>
        </div>

        <div class="container">
          <div class="label">IFRAME (might not clip!)</div>
          <div class="clip-wrapper">
            <iframe srcdoc="
              <html>
              <body style='margin:0; background: linear-gradient(to bottom, #8b5cf6 0%, #4c1d95 100%); display:flex; align-items:center; justify-content:center; height:100vh; color:white; font-size:24px; font-family:sans-serif;'>
                TOP SHOULD BE HIDDEN
              </body>
              </html>
            "></iframe>
          </div>
        </div>

        <div class="container">
          <div class="label">IFRAME with overflow:clip on iframe</div>
          <div class="clip-wrapper">
            <iframe style="overflow: clip;" srcdoc="
              <html>
              <body style='margin:0; background: linear-gradient(to bottom, #10b981 0%, #065f46 100%); display:flex; align-items:center; justify-content:center; height:100vh; color:white; font-size:24px; font-family:sans-serif;'>
                TOP SHOULD BE HIDDEN
              </body>
              </html>
            "></iframe>
          </div>
        </div>
      </body>
      </html>
    `);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/iframe-clip-test.png', fullPage: true });

    // Log what we see
    console.log('Screenshot saved. Check visually:');
    console.log('- Left box (regular div): Top 25% should be clipped');
    console.log('- Middle box (iframe): If iframe ignores clip-path, top will be visible');
    console.log('- Right box (iframe with overflow:clip): Testing if overflow helps');
  });

  test('should test alternative clipping methods for iframes', async ({ page }) => {
    console.log('\n=== ALTERNATIVE IFRAME CLIPPING METHODS ===\n');

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { background: #1a1a2e; margin: 0; padding: 40px; }

          .container {
            width: 300px;
            height: 200px;
            position: relative;
            margin: 10px;
            display: inline-block;
            vertical-align: top;
          }

          .label {
            color: white;
            font-family: sans-serif;
            font-size: 12px;
            margin-bottom: 5px;
          }

          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }

          /* Method 1: overflow:hidden on wrapper */
          .method-overflow {
            width: 100%;
            height: 75%; /* 25% less height */
            overflow: hidden;
            border: 2px solid yellow;
          }

          /* Method 2: clip-path on wrapper */
          .method-clippath {
            width: 100%;
            height: 100%;
            clip-path: inset(25% 0% 0% 0%);
            border: 2px solid red;
          }

          /* Method 3: negative margin + overflow on outer wrapper */
          .method-margin-outer {
            width: 100%;
            height: 75%;
            overflow: hidden;
            border: 2px solid green;
          }
          .method-margin-inner {
            width: 100%;
            height: 133%; /* 100/75 to compensate */
            margin-top: -25%;
          }

          /* Method 4: CSS mask */
          .method-mask {
            width: 100%;
            height: 100%;
            -webkit-mask-image: linear-gradient(to bottom, transparent 25%, black 25%);
            mask-image: linear-gradient(to bottom, transparent 25%, black 25%);
            border: 2px solid blue;
          }

          /* Method 5: positioned overflow */
          .method-position-outer {
            width: 100%;
            height: 75%;
            overflow: hidden;
            position: relative;
            border: 2px solid cyan;
          }
          .method-position-inner {
            position: absolute;
            top: -33%; /* offset to show bottom 75% */
            left: 0;
            width: 100%;
            height: 133%;
          }
        </style>
      </head>
      <body>
        <div style="color: white; font-family: sans-serif; margin-bottom: 20px;">
          <h3>Testing different methods to clip iframes (25% from top)</h3>
        </div>

        <div class="container">
          <div class="label">1. Overflow + reduced height</div>
          <div class="method-overflow">
            <iframe srcdoc="<body style='margin:0;background:#8b5cf6;color:white;font:20px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>IFRAME</body>"></iframe>
          </div>
        </div>

        <div class="container">
          <div class="label">2. Clip-path on wrapper</div>
          <div class="method-clippath">
            <iframe srcdoc="<body style='margin:0;background:#ef4444;color:white;font:20px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>IFRAME</body>"></iframe>
          </div>
        </div>

        <div class="container">
          <div class="label">3. Negative margin + overflow</div>
          <div class="method-margin-outer">
            <div class="method-margin-inner">
              <iframe srcdoc="<body style='margin:0;background:#22c55e;color:white;font:20px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>IFRAME</body>"></iframe>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="label">4. CSS mask-image</div>
          <div class="method-mask">
            <iframe srcdoc="<body style='margin:0;background:#3b82f6;color:white;font:20px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>IFRAME</body>"></iframe>
          </div>
        </div>

        <div class="container">
          <div class="label">5. Position + overflow</div>
          <div class="method-position-outer">
            <div class="method-position-inner">
              <iframe srcdoc="<body style='margin:0;background:#06b6d4;color:white;font:20px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>IFRAME</body>"></iframe>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/iframe-clip-methods.png', fullPage: true });

    console.log('Screenshot saved showing 5 different clipping methods.');
    console.log('Compare which methods actually clip the iframe content.');
  });
});
