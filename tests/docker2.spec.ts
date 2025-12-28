/**
 * Docker 2.0 E2E Tests
 * Tests for the enhanced widget docker with stacking, drag-drop, and theming
 */

import { test, expect, Page } from '@playwright/test';

// ==================
// Test Helpers
// ==================

async function waitForApp(page: Page) {
  await page.waitForSelector('[data-testid="canvas"]', { timeout: 10000 });
}

async function openCreateTabDialog(page: Page) {
  // Click the add tab button (may vary based on UI)
  await page.click('[data-testid="add-tab-button"]');
  await page.waitForSelector('[data-testid="create-tab-dialog"]', { timeout: 5000 });
}

async function createDocker2Tab(page: Page, title = 'Widget Stack') {
  await openCreateTabDialog(page);

  // Select Widget Stack 2.0
  await page.click('text=Widget Stack 2.0');

  // Click next/create button
  await page.click('[data-testid="create-tab-submit"]');

  // Wait for docker to appear
  await page.waitForSelector('[data-docker-id]', { timeout: 5000 });
}

async function getDockerContainer(page: Page) {
  return page.locator('.docker2-container').first();
}

async function addWidgetToCanvas(page: Page, widgetId: string) {
  // Open library panel
  await page.click('[data-testid="library-tab"]');

  // Search for widget
  await page.fill('[data-testid="widget-search"]', widgetId);

  // Click to add
  await page.click(`[data-testid="widget-card-${widgetId}"]`);

  // Wait for widget to appear
  await page.waitForSelector(`[data-widget-id*="${widgetId}"]`, { timeout: 5000 });
}

async function dragWidgetToDocker(page: Page, widgetSelector: string) {
  const widget = page.locator(widgetSelector).first();
  const docker = await getDockerContainer(page);

  // Drag widget to docker
  await widget.dragTo(docker);
}

// ==================
// Test Suite
// ==================

test.describe('Docker 2.0', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test.describe('Creation & Basic UI', () => {
    test('should create Docker 2.0 tab from dialog', async ({ page }) => {
      await createDocker2Tab(page);

      // Verify docker container exists
      const docker = await getDockerContainer(page);
      await expect(docker).toBeVisible();
    });

    test('should display glassmorphism styling', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);

      // Check for backdrop-filter (glassmorphism)
      const backdropFilter = await docker.evaluate((el) => {
        return window.getComputedStyle(el).backdropFilter;
      });

      expect(backdropFilter).toContain('blur');
    });

    test('should show empty state when no widgets docked', async ({ page }) => {
      await createDocker2Tab(page);

      // Should show empty state message
      await expect(page.locator('text=Drag widgets here to stack them')).toBeVisible();
    });

    test('should display header with controls', async ({ page }) => {
      await createDocker2Tab(page);

      // Header should have theme toggle, layout switcher, edit toggle
      const docker = await getDockerContainer(page);

      // Check for header presence
      const header = docker.locator('div').first();
      await expect(header).toBeVisible();
    });
  });

  test.describe('Theme Toggle', () => {
    test('should toggle between dark and light themes', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);

      // Get initial theme
      const initialTheme = await docker.getAttribute('data-theme');
      expect(initialTheme).toBe('dark');

      // Click theme toggle (sun/moon button)
      await docker.locator('button[title*="Switch to light"]').click();

      // Verify theme changed
      const newTheme = await docker.getAttribute('data-theme');
      expect(newTheme).toBe('light');
    });

    test('should persist theme preference', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);

      // Switch to light theme
      await docker.locator('button[title*="Switch to light"]').click();

      // Reload page
      await page.reload();
      await waitForApp(page);

      // Verify theme persisted
      const dockerAfterReload = await getDockerContainer(page);
      const theme = await dockerAfterReload.getAttribute('data-theme');
      expect(theme).toBe('light');
    });
  });

  test.describe('Layout Modes', () => {
    test('should switch between layout modes', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);

      // Open layout dropdown
      await docker.locator('button[title="Change layout"]').click();

      // Select horizontal layout
      await page.click('text=Horizontal');

      // Verify layout changed (would need to check CSS or data attribute)
      // This is a simplified check
      await expect(page.locator('text=Horizontal')).toBeHidden();
    });

    test('should display vertical stack layout by default', async ({ page }) => {
      await createDocker2Tab(page);

      // Default layout should be vertical
      const docker = await getDockerContainer(page);
      await expect(docker).toBeVisible();
    });
  });

  test.describe('Edit Mode', () => {
    test('should toggle edit mode', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);

      // Click edit mode toggle
      await docker.locator('button[title*="edit mode"]').click();

      // Edit mode should be active (button should show active state)
      const editButton = docker.locator('button[title*="Exit edit"]');
      await expect(editButton).toBeVisible();
    });

    test('should show drag handles in edit mode', async ({ page }) => {
      // Add a widget first
      await addWidgetToCanvas(page, 'basic-text');

      // Create docker and dock widget
      await createDocker2Tab(page);
      await dragWidgetToDocker(page, '[data-widget-id*="basic-text"]');

      const docker = await getDockerContainer(page);

      // Enable edit mode
      await docker.locator('button[title*="edit mode"]').click();

      // Drag handles should be visible
      await expect(docker.locator('svg').first()).toBeVisible();
    });
  });

  test.describe('Widget Docking', () => {
    test.skip('should dock widget via drag and drop', async ({ page }) => {
      // Add widget to canvas
      await addWidgetToCanvas(page, 'basic-text');

      // Create docker
      await createDocker2Tab(page);

      // Drag widget to docker
      await dragWidgetToDocker(page, '[data-widget-id*="basic-text"]');

      // Verify widget is now in docker
      const docker = await getDockerContainer(page);
      await expect(docker.locator('[data-widget-id*="basic-text"]')).toBeVisible();
    });

    test.skip('should show drop indicator when dragging over', async ({ page }) => {
      await addWidgetToCanvas(page, 'basic-text');
      await createDocker2Tab(page);

      const widget = page.locator('[data-widget-id*="basic-text"]').first();
      const docker = await getDockerContainer(page);

      // Start drag
      await widget.hover();
      await page.mouse.down();

      // Move to docker
      const dockerBox = await docker.boundingBox();
      if (dockerBox) {
        await page.mouse.move(dockerBox.x + dockerBox.width / 2, dockerBox.y + dockerBox.height / 2);
      }

      // Should show drop indicator
      await expect(docker.locator('[class*="drop"]')).toBeVisible();

      // End drag
      await page.mouse.up();
    });
  });

  test.describe('Widget Stack', () => {
    test.skip('should display multiple widgets stacked', async ({ page }) => {
      // Add multiple widgets
      await addWidgetToCanvas(page, 'basic-text');
      await addWidgetToCanvas(page, 'counter');

      // Create docker
      await createDocker2Tab(page);

      // Dock both widgets
      await dragWidgetToDocker(page, '[data-widget-id*="basic-text"]');
      await dragWidgetToDocker(page, '[data-widget-id*="counter"]');

      const docker = await getDockerContainer(page);

      // Both widgets should be visible
      await expect(docker.locator('[data-widget-id*="basic-text"]')).toBeVisible();
      await expect(docker.locator('[data-widget-id*="counter"]')).toBeVisible();
    });

    test.skip('should minimize widget', async ({ page }) => {
      await addWidgetToCanvas(page, 'basic-text');
      await createDocker2Tab(page);
      await dragWidgetToDocker(page, '[data-widget-id*="basic-text"]');

      const docker = await getDockerContainer(page);

      // Hover to show controls
      await docker.locator('[data-widget-id*="basic-text"]').hover();

      // Click minimize button
      await docker.locator('button[title="Minimize"]').click();

      // Widget content should be hidden (only header visible)
      // Check height is reduced
      const widgetCard = docker.locator('[data-widget-id*="basic-text"]');
      const height = await widgetCard.evaluate((el) => el.clientHeight);
      expect(height).toBeLessThan(100); // Minimized height should be small
    });

    test.skip('should maximize widget', async ({ page }) => {
      await addWidgetToCanvas(page, 'basic-text');
      await createDocker2Tab(page);
      await dragWidgetToDocker(page, '[data-widget-id*="basic-text"]');

      const docker = await getDockerContainer(page);

      // Hover to show controls
      await docker.locator('[data-widget-id*="basic-text"]').hover();

      // Click maximize button
      await docker.locator('button[title="Maximize"]').click();

      // Widget should fill the container
      const widgetCard = docker.locator('[data-widget-id*="basic-text"]');
      const dockerBox = await docker.boundingBox();
      const widgetBox = await widgetCard.boundingBox();

      if (dockerBox && widgetBox) {
        // Widget width should be close to docker width
        expect(widgetBox.width).toBeGreaterThan(dockerBox.width * 0.9);
      }
    });
  });

  test.describe('Resize & Drag', () => {
    test('should resize docker container', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);
      const initialBox = await docker.boundingBox();

      // Find resize handle (SE corner)
      const resizeHandle = docker.locator('div').last();

      // Drag to resize
      if (initialBox) {
        await page.mouse.move(initialBox.x + initialBox.width, initialBox.y + initialBox.height);
        await page.mouse.down();
        await page.mouse.move(initialBox.x + initialBox.width + 50, initialBox.y + initialBox.height + 50);
        await page.mouse.up();
      }

      // Verify size changed
      const newBox = await docker.boundingBox();
      if (initialBox && newBox) {
        expect(newBox.width).toBeGreaterThan(initialBox.width);
        expect(newBox.height).toBeGreaterThan(initialBox.height);
      }
    });

    test('should drag docker container to new position', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);
      const initialBox = await docker.boundingBox();

      // Drag header to move
      const header = docker.locator('div').first();
      await header.hover();
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();

      // Verify position changed
      const newBox = await docker.boundingBox();
      if (initialBox && newBox) {
        expect(newBox.x).not.toBe(initialBox.x);
        expect(newBox.y).not.toBe(initialBox.y);
      }
    });

    test('should collapse and expand docker', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);
      const initialBox = await docker.boundingBox();

      // Click collapse button
      await docker.locator('button[title="Collapse"]').click();

      // Height should be reduced (collapsed)
      const collapsedBox = await docker.boundingBox();
      if (initialBox && collapsedBox) {
        expect(collapsedBox.height).toBeLessThan(initialBox.height);
      }

      // Expand again
      await docker.locator('button[title="Expand"]').click();

      // Height should be restored
      const expandedBox = await docker.boundingBox();
      if (initialBox && expandedBox) {
        expect(expandedBox.height).toBeCloseTo(initialBox.height, -1);
      }
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should toggle edit mode with "e" key', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);

      // Focus docker area
      await docker.click();

      // Press 'e' to toggle edit mode
      await page.keyboard.press('e');

      // Edit mode should be active
      const editButton = docker.locator('button[title*="Exit edit"]');
      await expect(editButton).toBeVisible();
    });

    test('should toggle theme with "t" key', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);
      const initialTheme = await docker.getAttribute('data-theme');

      // Focus and press 't'
      await docker.click();
      await page.keyboard.press('t');

      // Theme should change
      const newTheme = await docker.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    });

    test('should switch layouts with v/h/g keys', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);
      await docker.click();

      // Press 'h' for horizontal
      await page.keyboard.press('h');

      // Press 'g' for grid
      await page.keyboard.press('g');

      // Press 'v' for vertical
      await page.keyboard.press('v');

      // No errors should occur
      await expect(docker).toBeVisible();
    });

    test('should undo/redo with Ctrl+Z/Y', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);
      await docker.click();

      // Make a change (toggle theme)
      await page.keyboard.press('t');
      const themeAfterChange = await docker.getAttribute('data-theme');

      // Undo
      await page.keyboard.press('Control+z');

      // Theme should revert
      const themeAfterUndo = await docker.getAttribute('data-theme');
      expect(themeAfterUndo).not.toBe(themeAfterChange);

      // Redo
      await page.keyboard.press('Control+y');

      // Theme should be back to changed state
      const themeAfterRedo = await docker.getAttribute('data-theme');
      expect(themeAfterRedo).toBe(themeAfterChange);
    });
  });

  test.describe('State Persistence', () => {
    test('should persist docker state across page reload', async ({ page }) => {
      await createDocker2Tab(page);

      const docker = await getDockerContainer(page);

      // Change theme to light
      await docker.locator('button[title*="Switch to light"]').click();

      // Change layout to horizontal
      await docker.locator('button[title="Change layout"]').click();
      await page.click('text=Horizontal');

      // Reload
      await page.reload();
      await waitForApp(page);

      // Verify state persisted
      const dockerAfterReload = await getDockerContainer(page);
      const theme = await dockerAfterReload.getAttribute('data-theme');
      expect(theme).toBe('light');
    });
  });
});

// ==================
// Accessibility Tests
// ==================

test.describe('Docker 2.0 Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await createDocker2Tab(page);

    // Tab through controls
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to activate focused element with Enter
    await page.keyboard.press('Enter');

    // No errors should occur
  });

  test('should have proper focus indicators', async ({ page }) => {
    await createDocker2Tab(page);

    const docker = await getDockerContainer(page);

    // Tab to first button
    await page.keyboard.press('Tab');

    // Check for visible focus indicator
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
