/**
 * Quick EntityPanel3D Test - Find and verify the widget content
 */

import { test, expect } from '@playwright/test';

test('find EntityPanel3D in library and check its content', async ({ page }) => {
  // Collect errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[ERROR] ${msg.text()}`);
    }
  });

  // Go to app (don't wait for networkidle - it takes too long)
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Screenshot initial state
  await page.screenshot({ path: 'tests/screenshots/quick-01-initial.png' });

  // Find all widget cards and look for EntityPanel
  const allWidgetCards = await page.locator('[class*="WidgetCard"], [class*="widget-card"]').all();
  console.log(`Found ${allWidgetCards.length} widget cards`);

  // Find 3D Entity Panel card
  let entityPanelCard = null;
  for (const card of allWidgetCards) {
    const text = await card.textContent();
    if (text?.includes('3D Entity Panel') || text?.includes('Entity Panel')) {
      console.log('Found EntityPanel card:', text?.slice(0, 80));
      entityPanelCard = card;
      break;
    }
  }

  if (!entityPanelCard) {
    // Try alternative search
    entityPanelCard = page.locator('text=3D Entity Panel').first();
    if (await entityPanelCard.count() === 0) {
      console.log('EntityPanel3D not found in library');
      await page.screenshot({ path: 'tests/screenshots/quick-02-no-entity-panel.png' });
      return;
    }
  }

  // Click the card to add the widget
  console.log('Clicking EntityPanel card...');
  await entityPanelCard.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'tests/screenshots/quick-03-after-click.png' });

  // Check for widget content
  const widgetContent = await page.evaluate(() => {
    const result: any = {
      tabs: [],
      primitives: [],
      hasHeader: false,
      hasTabBar: false,
    };

    // Look for "3D Entity Panel" header
    if (document.body.innerText.includes('3D Entity Panel')) {
      result.hasHeader = true;
    }

    // Look for tabs
    ['Search', 'Upload', 'Images', 'Shapes', 'Primitives'].forEach(tab => {
      if (document.body.innerText.includes(tab)) {
        result.tabs.push(tab);
      }
    });

    // Look for primitives
    ['Cube', 'Sphere', 'Cylinder', 'Cone'].forEach(prim => {
      if (document.body.innerText.includes(prim)) {
        result.primitives.push(prim);
      }
    });

    return result;
  });

  console.log('Widget content check:', JSON.stringify(widgetContent, null, 2));

  // Check if content is rendering
  if (widgetContent.hasHeader && widgetContent.tabs.length > 0) {
    console.log('SUCCESS: EntityPanel3D is rendering content!');
  } else if (widgetContent.tabs.length === 0) {
    console.log('ISSUE: EntityPanel3D header found but NO TAB CONTENT');
  } else {
    console.log('ISSUE: EntityPanel3D not rendering expected content');
  }

  await page.screenshot({ path: 'tests/screenshots/quick-04-final.png', fullPage: true });
});
