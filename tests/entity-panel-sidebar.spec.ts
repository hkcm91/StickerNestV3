/**
 * EntityPanel3D Sidebar Test - Check widget library in sidebar
 */

import { test, expect } from '@playwright/test';

test('find widget library in sidebar and EntityPanel3D', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[ERROR] ${msg.text().slice(0, 150)}`);
    }
  });

  await page.goto('/');
  await page.waitForTimeout(2000);

  // Dismiss any modal first
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await page.screenshot({ path: 'tests/screenshots/sidebar-01-initial.png' });

  // Look for all visible widget cards
  const widgetCards = await page.locator('[class*="WidgetCard"], [class*="widget-card"]').all();
  console.log(`Found ${widgetCards.length} widget cards visible`);

  // Check the full DOM for widget cards including hidden ones
  const domInfo = await page.evaluate(() => {
    const allCards = document.querySelectorAll('[class*="WidgetCard"], [class*="widget-card"]');
    const entityPanelCards: string[] = [];

    allCards.forEach(card => {
      const text = card.textContent || '';
      if (text.includes('3D Entity Panel') || text.includes('Entity Panel')) {
        entityPanelCards.push(text.slice(0, 100));
      }
    });

    // Check for any sidebar or library panel
    const sidebars = document.querySelectorAll('[class*="sidebar"], [class*="Sidebar"], [class*="library"], [class*="Library"]');

    return {
      totalWidgetCards: allCards.length,
      entityPanelCards,
      sidebarCount: sidebars.length,
    };
  });

  console.log('DOM Info:', JSON.stringify(domInfo, null, 2));

  // Try to find and click on a sidebar toggle or expand button
  const sidebarToggle = page.locator('[class*="sidebar-toggle"], [aria-label*="sidebar"], button:has-text("Widgets")').first();
  if (await sidebarToggle.count() > 0) {
    console.log('Found sidebar toggle');
    await sidebarToggle.click();
    await page.waitForTimeout(500);
  }

  // Check for widget library panel
  const libraryPanel = await page.evaluate(() => {
    // Look for WidgetLibrary component
    const panels = document.querySelectorAll('[class*="widget-library"], [class*="WidgetLibrary"]');
    if (panels.length > 0) {
      return {
        found: true,
        className: (panels[0] as HTMLElement).className,
        visible: window.getComputedStyle(panels[0]).display !== 'none',
      };
    }

    // Also check for any scrollable list of widgets
    const scrollLists = document.querySelectorAll('[class*="widget-list"], [class*="WidgetList"]');
    return {
      found: scrollLists.length > 0,
      scrollListCount: scrollLists.length,
    };
  });

  console.log('Library Panel:', JSON.stringify(libraryPanel, null, 2));

  // Take screenshot of current state
  await page.screenshot({ path: 'tests/screenshots/sidebar-02-widgets.png', fullPage: true });

  // If there are EntityPanel cards, try to find and interact with one
  if (domInfo.entityPanelCards.length > 0) {
    console.log('EntityPanel3D found in DOM! Trying to click...');
    const entityCard = page.locator('text=3D Entity Panel').first();
    await entityCard.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'tests/screenshots/sidebar-03-entity-found.png' });
  }
});
