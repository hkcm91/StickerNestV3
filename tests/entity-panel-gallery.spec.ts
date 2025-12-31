/**
 * EntityPanel3D via Gallery Test
 */

import { test, expect } from '@playwright/test';

test('open gallery and add EntityPanel3D', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('EntityPanel')) {
      console.log(`[${msg.type()}] ${msg.text()}`);
    }
  });

  await page.goto('/');
  await page.waitForTimeout(2000);

  // Dismiss any modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Screenshot initial state
  await page.screenshot({ path: 'tests/screenshots/gallery-01-initial.png' });

  // Click Open Gallery
  const galleryBtn = page.locator('text=Open Gallery').first();
  if (await galleryBtn.count() > 0) {
    console.log('Clicking Open Gallery...');
    await galleryBtn.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: 'tests/screenshots/gallery-02-after-open.png' });

  // Look for search input and search for entity panel
  const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
  if (await searchInput.count() > 0) {
    console.log('Found search input, searching for "entity"...');
    await searchInput.fill('entity');
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: 'tests/screenshots/gallery-03-after-search.png' });

  // Find and click 3D Entity Panel
  const entityCard = page.locator('text=3D Entity Panel').first();
  if (await entityCard.count() > 0) {
    console.log('Found 3D Entity Panel, clicking...');
    await entityCard.click({ force: true });
    await page.waitForTimeout(1000);
  } else {
    console.log('3D Entity Panel not found after search');
    // Try scrolling
    const allCards = page.locator('[class*="WidgetCard"]');
    const count = await allCards.count();
    console.log(`Found ${count} widget cards`);
  }

  await page.screenshot({ path: 'tests/screenshots/gallery-04-after-click.png' });

  // Check what's on the canvas now
  const canvasContent = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText.slice(0, 1000),
      has3DEntityPanel: document.body.innerText.includes('3D Entity Panel'),
      hasCube: document.body.innerText.includes('Cube'),
      hasSphere: document.body.innerText.includes('Sphere'),
      hasSearch: document.body.innerText.includes('Search'),
      hasShapes: document.body.innerText.includes('Shapes'),
    };
  });

  console.log('Canvas content:', JSON.stringify(canvasContent, null, 2));

  await page.screenshot({ path: 'tests/screenshots/gallery-05-final.png', fullPage: true });
});
