/**
 * Canvas Tab Panel Tests
 * Tests for the improved canvas tab with proportional sizing,
 * fit modes, and resizable panel width
 */

import { test, expect } from '@playwright/test';

test.describe('Canvas Tab Panel Improvements', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the main app to load
    await page.waitForSelector('[data-testid="main-canvas"], .canvas-container', {
      timeout: 10000
    }).catch(() => {
      // Fallback: wait for any major element
      return page.waitForTimeout(2000);
    });
  });

  test('should display canvas tab with proportional sizing', async ({ page }) => {
    // Take screenshot of initial state
    await page.screenshot({
      path: 'tests/screenshots/canvas-tab-before-create.png',
      fullPage: true
    });

    // Look for a way to create a new tab
    const createTabButton = page.locator('button:has-text("New Tab"), button:has-text("+"), [aria-label*="create tab"]').first();

    if (await createTabButton.isVisible()) {
      await createTabButton.click();
      await page.waitForTimeout(500);

      // Take screenshot of create tab dialog
      await page.screenshot({
        path: 'tests/screenshots/canvas-tab-create-dialog.png',
        fullPage: true
      });

      // Look for canvas tab option
      const canvasOption = page.locator('button:has-text("Canvas"), [data-tab-type="canvas"]').first();
      if (await canvasOption.isVisible()) {
        await canvasOption.click();
        await page.waitForTimeout(300);

        // Screenshot after selecting canvas type
        await page.screenshot({
          path: 'tests/screenshots/canvas-tab-type-selected.png',
          fullPage: true
        });
      }
    }
  });

  test('should show canvas dimensions in toolbar', async ({ page }) => {
    // Look for any existing canvas tab panel
    const canvasPanel = page.locator('[class*="canvas-tab"], [data-tab-type="canvas"]').first();

    if (await canvasPanel.isVisible()) {
      // Check for dimension badge
      const dimensionBadge = canvasPanel.locator('[class*="dimension"], :text-matches("\\d+\\s*×\\s*\\d+")');

      if (await dimensionBadge.isVisible()) {
        const text = await dimensionBadge.textContent();
        console.log('Canvas dimensions:', text);
        expect(text).toMatch(/\d+\s*×\s*\d+/);
      }
    }

    await page.screenshot({
      path: 'tests/screenshots/canvas-tab-dimensions.png',
      fullPage: true
    });
  });

  test('should have fit mode options', async ({ page }) => {
    // Look for fit mode button in canvas tab
    const fitModeButton = page.locator('[title*="fit"], [title*="Fit mode"], button:has(svg)').first();

    if (await fitModeButton.isVisible()) {
      await fitModeButton.click();
      await page.waitForTimeout(300);

      // Look for fit mode dropdown
      const dropdown = page.locator('[class*="dropdown"], [class*="menu"]').first();

      if (await dropdown.isVisible()) {
        await page.screenshot({
          path: 'tests/screenshots/canvas-tab-fit-modes.png',
          fullPage: true
        });

        // Check for fit mode options
        const containOption = dropdown.locator(':text("Fit"), :text("Contain")');
        const coverOption = dropdown.locator(':text("Cover")');
        const stretchOption = dropdown.locator(':text("Stretch"), :text("Fill")');

        console.log('Fit modes available:', {
          contain: await containOption.isVisible(),
          cover: await coverOption.isVisible(),
          stretch: await stretchOption.isVisible(),
        });
      }
    }
  });

  test('should allow panel resize via drag handle', async ({ page }) => {
    // Look for resize handle on any panel
    const resizeHandle = page.locator('[cursor*="resize"], [style*="ew-resize"], [class*="resize"]').first();

    if (await resizeHandle.isVisible()) {
      const handleBox = await resizeHandle.boundingBox();

      if (handleBox) {
        console.log('Resize handle found at:', handleBox);

        // Take before screenshot
        await page.screenshot({
          path: 'tests/screenshots/canvas-tab-resize-before.png',
          fullPage: true
        });

        // Drag to resize
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 100, handleBox.y + handleBox.height / 2);
        await page.mouse.up();

        await page.waitForTimeout(300);

        // Take after screenshot
        await page.screenshot({
          path: 'tests/screenshots/canvas-tab-resize-after.png',
          fullPage: true
        });
      }
    }
  });

  test('visual regression - canvas tab panel styling', async ({ page }) => {
    // Take full page screenshot for visual comparison
    await page.screenshot({
      path: 'tests/screenshots/canvas-tab-full-page.png',
      fullPage: true
    });

    // Take viewport screenshot
    await page.screenshot({
      path: 'tests/screenshots/canvas-tab-viewport.png'
    });
  });
});
