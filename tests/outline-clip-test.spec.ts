/**
 * Outline vs Box-shadow Clipping Test
 * CSS outline is NOT clipped by overflow:hidden, but box-shadow IS
 */
import { test } from '@playwright/test';

test('outline vs box-shadow clipping', async ({ page }) => {
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { background: #1a1a2e; margin: 40px; font-family: sans-serif; color: white; }
        .container {
          width: 400px;
          height: 200px;
          overflow: hidden;
          background: #2a2a3e;
          border: 2px solid #8b5cf6;
          margin: 40px 0;
          position: relative;
        }
        .widget {
          position: absolute;
          width: 200px;
          height: 150px;
          background: #3b82f6;
          left: 280px; /* Extends 80px beyond container */
          top: 25px;
        }
        .with-outline {
          outline: 4px solid #00ffff;
          outline-offset: 2px;
        }
        .with-boxshadow {
          box-shadow: 0 0 0 4px #00ffff;
        }
        .with-border {
          border: 4px solid #00ffff;
        }
        .label { margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <h2>Outline vs Box-shadow vs Border - Overflow Clipping Test</h2>

      <div class="label">1. Using OUTLINE (cyan) - NOT clipped:</div>
      <div class="container">
        <div class="widget with-outline">
          Widget with outline
        </div>
      </div>

      <div class="label">2. Using BOX-SHADOW (cyan) - IS clipped:</div>
      <div class="container">
        <div class="widget with-boxshadow">
          Widget with box-shadow
        </div>
      </div>

      <div class="label">3. Using BORDER (cyan) - IS clipped:</div>
      <div class="container">
        <div class="widget with-border">
          Widget with border
        </div>
      </div>
    </body>
    </html>
  `);

  await page.screenshot({ path: 'tests/screenshots/outline-vs-boxshadow.png', fullPage: true });
  console.log('Screenshot saved: outline-vs-boxshadow.png');
  console.log('Compare: outline extends beyond container, box-shadow is clipped');
});
