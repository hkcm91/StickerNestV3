/**
 * EntityPanel3D on Canvas Test
 */

import { test, expect } from '@playwright/test';

test('open canvas and add EntityPanel3D widget', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[ERROR] ${msg.text().slice(0, 200)}`);
    }
  });

  // Navigate to the Spatial VR/AR Demo canvas that likely has widgets
  await page.goto('/c/spatial-vr-demo');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'tests/screenshots/canvas-01-spatial-demo.png' });

  // Check what content is on this canvas
  const canvasContent = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText.slice(0, 1500),
      has3DEntityPanel: document.body.innerText.includes('3D Entity Panel'),
      hasCube: document.body.innerText.includes('Cube'),
      hasSphere: document.body.innerText.includes('Sphere'),
      hasSearch: document.body.innerText.includes('Search'),
      hasShapes: document.body.innerText.includes('Shapes'),
      hasWidgetLibrary: document.body.innerText.includes('Widget Library'),
    };
  });

  console.log('Canvas content:', JSON.stringify(canvasContent, null, 2));

  // Look for + button to add widgets
  const addBtn = page.locator('button:has-text("+"), button[title*="Add"], [data-testid="add-widget"]').first();
  if (await addBtn.count() > 0) {
    console.log('Found Add button, clicking...');
    await addBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/canvas-02-after-add-click.png' });
  }

  // Search for Entity Panel in widget library
  const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
  if (await searchInput.count() > 0) {
    console.log('Found search, searching for "entity"...');
    await searchInput.fill('entity');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/canvas-03-search.png' });
  }

  // Look for Entity Panel card
  const entityCard = page.locator('text=3D Entity Panel').first();
  if (await entityCard.count() > 0) {
    console.log('Found 3D Entity Panel!');
    await entityCard.click({ force: true });
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: 'tests/screenshots/canvas-04-final.png', fullPage: true });

  // Final check for widget content
  const finalContent = await page.evaluate(() => {
    return {
      has3DEntityPanel: document.body.innerText.includes('3D Entity Panel'),
      hasCube: document.body.innerText.includes('Cube'),
      hasShapes: document.body.innerText.includes('Shapes'),
    };
  });

  console.log('Final content:', JSON.stringify(finalContent, null, 2));
});
