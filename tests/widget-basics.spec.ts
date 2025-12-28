import { test, expect } from '@playwright/test';

test.describe('Widget System Basics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('app loads successfully', async ({ page }) => {
    // Check main layout loads
    await expect(page.locator('text=Canvas Mode')).toBeVisible();
  });

  test('can navigate to library tab', async ({ page }) => {
    await page.click('text=Library');
    await expect(page.locator('text=Widget Library')).toBeVisible();
  });

  test('can navigate to debug tab', async ({ page }) => {
    await page.click('text=Debug');
    await expect(page.locator('text=Debug Panel')).toBeVisible();
  });

  test('library shows local test widgets', async ({ page }) => {
    await page.click('text=Library');
    // Check farming widgets are listed
    await expect(page.locator('text=Crop Plot')).toBeVisible();
    await expect(page.locator('text=Seed Bag')).toBeVisible();
    await expect(page.locator('text=Weather Station')).toBeVisible();
  });
});

test.describe('Widget Loading', () => {
  test('can add widget from library to canvas', async ({ page }) => {
    // Go to library
    await page.click('text=Library');
    await page.waitForTimeout(500);

    // Select a widget
    const cropPlotCheckbox = page.locator('label:has-text("Crop Plot") input[type="checkbox"]');
    await cropPlotCheckbox.check();

    // Add to canvas
    await page.click('text=Add Selected to Canvas');

    // Go to canvas
    await page.click('text=Canvas');
    await page.waitForTimeout(1000);

    // Widget container should exist
    const widgetContainer = page.locator('.widget-container');
    await expect(widgetContainer).toBeVisible({ timeout: 5000 });
  });

  test('widget iframe loads content', async ({ page }) => {
    // Add widget
    await page.click('text=Library');
    await page.waitForTimeout(500);

    const cropPlotCheckbox = page.locator('label:has-text("Crop Plot") input[type="checkbox"]');
    await cropPlotCheckbox.check();
    await page.click('text=Add Selected to Canvas');

    // Go to canvas and wait for widget
    await page.click('text=Canvas');
    await page.waitForTimeout(2000);

    // Check iframe exists
    const iframe = page.frameLocator('iframe');
    // Widget content should be visible
    await expect(iframe.locator('text=Crop Plot').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Widget Communication', () => {
  test('debug panel captures widget ready events', async ({ page }) => {
    // Add widget
    await page.click('text=Library');
    await page.waitForTimeout(500);

    const cropPlotCheckbox = page.locator('label:has-text("Crop Plot") input[type="checkbox"]');
    await cropPlotCheckbox.check();
    await page.click('text=Add Selected to Canvas');

    // Go to debug panel
    await page.click('text=Debug');
    await page.waitForTimeout(2000);

    // Should see widget messages
    await expect(page.locator('text=Widget Messages')).toBeVisible();

    // Widget ready message should appear
    await expect(page.locator('text=Crop Plot ready')).toBeVisible({ timeout: 10000 });
  });

  test('multiple widgets can communicate', async ({ page }) => {
    // Add multiple farming widgets
    await page.click('text=Library');
    await page.waitForTimeout(500);

    // Select farming widgets
    await page.locator('label:has-text("Crop Plot") input[type="checkbox"]').check();
    await page.locator('label:has-text("Seed Bag") input[type="checkbox"]').check();
    await page.locator('label:has-text("Weather Station") input[type="checkbox"]').check();

    await page.click('text=Add Selected to Canvas');

    // Go to debug panel
    await page.click('text=Debug');
    await page.waitForTimeout(3000);

    // All widgets should report ready
    await expect(page.locator('text=Crop Plot ready')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Seed Bag ready')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Weather Station ready')).toBeVisible({ timeout: 10000 });

    // Weather events should be captured
    await expect(page.locator('text=farm:weather').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Debug Panel Features', () => {
  test('copy button copies logs to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Add widget to generate some logs
    await page.click('text=Library');
    await page.waitForTimeout(500);

    await page.locator('label:has-text("Weather Station") input[type="checkbox"]').check();
    await page.click('text=Add Selected to Canvas');

    // Go to debug panel
    await page.click('text=Debug');
    await page.waitForTimeout(2000);

    // Click copy button
    await page.click('#copy-logs-btn');
    await page.waitForTimeout(500);

    // Button should show "Copied!" feedback
    await expect(page.locator('#copy-logs-btn')).toHaveText('Copied!');

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('StickerNest Debug Log');
  });

  test('clear button removes all logs', async ({ page }) => {
    // Add widget
    await page.click('text=Library');
    await page.waitForTimeout(500);

    await page.locator('label:has-text("Weather Station") input[type="checkbox"]').check();
    await page.click('text=Add Selected to Canvas');

    // Go to debug
    await page.click('text=Debug');
    await page.waitForTimeout(2000);

    // Should have logs
    await expect(page.locator('text=Weather Station ready')).toBeVisible({ timeout: 10000 });

    // Clear
    await page.click('button:has-text("Clear")');

    // Logs should be gone
    await expect(page.locator('text=Weather Station ready')).not.toBeVisible();
  });

  test('debug panel persists events across tab switches', async ({ page }) => {
    // Add widget
    await page.click('text=Library');
    await page.waitForTimeout(500);

    await page.locator('label:has-text("Weather Station") input[type="checkbox"]').check();
    await page.click('text=Add Selected to Canvas');

    // Go to canvas
    await page.click('text=Canvas');
    await page.waitForTimeout(2000);

    // Go back to debug - events should still be there
    await page.click('text=Debug');
    await expect(page.locator('text=Weather Station ready')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Widget Interactions', () => {
  test('seed bag widget sends plant event to crop plot', async ({ page }) => {
    // Add both widgets
    await page.click('text=Library');
    await page.waitForTimeout(500);

    await page.locator('label:has-text("Crop Plot") input[type="checkbox"]').check();
    await page.locator('label:has-text("Seed Bag") input[type="checkbox"]').check();
    await page.click('text=Add Selected to Canvas');

    // Go to canvas
    await page.click('text=Canvas');
    await page.waitForTimeout(2000);

    // Find seed bag iframe and click a seed
    const seedBagFrame = page.frameLocator('iframe[data-widget-id="farm-seed-bag"]');
    await seedBagFrame.locator('.seed-item').first().click();

    // Go to debug and verify plant event
    await page.click('text=Debug');
    await page.waitForTimeout(500);

    await expect(page.locator('text=farm:plant-seed').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Planting:').first()).toBeVisible({ timeout: 5000 });
  });
});
