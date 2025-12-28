import { test, expect } from '@playwright/test';

test.describe('Canvas Slug Debug', () => {
  test('should save canvas with widgets and load via slug', async ({ page }) => {
    // Collect all console logs
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(`[${msg.type()}] ${text}`);
      if (text.includes('CanvasManager') ||
          text.includes('CanvasEditorPage') ||
          text.includes('SharedCanvasPage') ||
          text.includes('widget')) {
        console.log('PAGE:', text);
      }
    });

    // 1. Go to create page
    console.log('--- Step 1: Navigate to /create ---');
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. Add a widget to the canvas
    console.log('--- Step 2: Add a widget ---');
    const libraryButton = page.locator('button[aria-label="Widget Library"]');
    await expect(libraryButton).toBeVisible({ timeout: 10000 });
    await libraryButton.click();
    await page.waitForTimeout(500);

    // Find and click on a widget in the library
    const widgetItem = page.locator('[data-widget-id]').first();
    if (await widgetItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await widgetItem.click();
      console.log('Clicked on widget in library');
    } else {
      // Try alternative selector
      const addButton = page.locator('button:has-text("Add")').first();
      if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addButton.click();
        console.log('Clicked Add button');
      }
    }
    await page.waitForTimeout(1000);

    // Check how many widgets are on the canvas
    const widgetCount = await page.evaluate(() => {
      // Try to get widgets from the canvas ref
      const canvas = document.querySelector('.canvas-container');
      const widgets = canvas?.querySelectorAll('[data-widget-id]');
      return widgets?.length || 0;
    });
    console.log('Widgets on canvas:', widgetCount);

    // 3. Click "Save & Share" to expand the panel
    console.log('--- Step 3: Open Save & Share panel ---');
    const saveShareButton = page.locator('button:has-text("Save & Share")');
    await expect(saveShareButton).toBeVisible({ timeout: 10000 });
    await saveShareButton.click();
    await page.waitForTimeout(500);

    // 4. Select "Unlisted" visibility
    console.log('--- Step 4: Select Unlisted visibility ---');
    const unlistedButton = page.locator('button:has-text("Unlisted")');
    await expect(unlistedButton).toBeVisible();
    await unlistedButton.click();

    // 5. Get the generated slug value
    const slugInput = page.locator('input[placeholder="your-url"]');
    await expect(slugInput).toBeVisible();
    const slug = await slugInput.inputValue();
    console.log('Generated slug:', slug);

    // 6. Click "Save & Publish"
    console.log('--- Step 5: Save & Publish ---');
    const saveButton = page.locator('button:has-text("Save & Publish")');
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await page.waitForTimeout(3000);

    // 7. Check localStorage for saved canvas and widget count
    console.log('--- Step 6: Check localStorage ---');
    const savedData = await page.evaluate((slug) => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('stickernest-canvas-') && !k.includes('index') && !k.includes('store'));
      console.log('Canvas keys:', keys);

      for (const key of keys) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          console.log(`Canvas ${key}:`, {
            id: data.canvas?.id,
            slug: data.canvas?.slug,
            visibility: data.canvas?.visibility,
            widgetCount: data.widgets?.length
          });

          if (data.canvas?.slug === slug) {
            return {
              found: true,
              canvasId: data.canvas.id,
              slug: data.canvas.slug,
              widgetCount: data.widgets?.length || 0,
              widgets: data.widgets?.map((w: any) => ({ id: w.id, name: w.name || w.widgetDefId }))
            };
          }
        } catch (e) {
          console.log('Error parsing', key);
        }
      }
      return { found: false };
    }, slug);

    console.log('Saved canvas data:', JSON.stringify(savedData, null, 2));
    expect(savedData.found).toBe(true);
    console.log('Widget count in saved canvas:', savedData.widgetCount);

    // 8. Navigate to slug URL in same page
    console.log('--- Step 7: Navigate to slug URL ---');
    await page.goto(`/c/${slug}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 9. Check what's rendered
    console.log('--- Step 8: Check rendered page ---');

    // Check for error state
    const errorHeading = page.locator('h2:has-text("Canvas Not Found")');
    const hasError = await errorHeading.isVisible().catch(() => false);

    if (hasError) {
      console.log('ERROR: Canvas Not Found displayed');

      // Debug: check localStorage after navigation
      const afterNavData = await page.evaluate((slug) => {
        const keys = Object.keys(localStorage).filter(k => k.includes('stickernest'));
        const canvasKeys = keys.filter(k => k.startsWith('stickernest-canvas-') && !k.includes('index') && !k.includes('store'));

        let foundCanvas = null;
        for (const key of canvasKeys) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.canvas?.slug === slug) {
              foundCanvas = {
                id: data.canvas.id,
                slug: data.canvas.slug,
                widgetCount: data.widgets?.length
              };
            }
          } catch (e) {}
        }

        return {
          allKeys: keys,
          canvasKeys,
          foundCanvas
        };
      }, slug);

      console.log('After navigation localStorage:', JSON.stringify(afterNavData, null, 2));
    }

    // Check for canvas content
    const canvasWrapper = page.locator('[class*="canvasWrapper"]');
    const hasCanvas = await canvasWrapper.isVisible().catch(() => false);
    console.log('Canvas wrapper visible:', hasCanvas);

    // Check for header with canvas name
    const canvasName = page.locator('[class*="canvasName"]');
    const nameVisible = await canvasName.isVisible().catch(() => false);
    if (nameVisible) {
      const name = await canvasName.textContent();
      console.log('Canvas name:', name);
    }

    // Check for widgets in the rendered canvas
    const renderedWidgets = await page.evaluate(() => {
      const widgets = document.querySelectorAll('[data-widget-id], [class*="widget-frame"], iframe');
      return {
        count: widgets.length,
        selectors: Array.from(widgets).map(w => w.tagName + (w.className ? '.' + w.className.split(' ')[0] : ''))
      };
    });
    console.log('Rendered widgets:', renderedWidgets);

    // Print relevant logs
    console.log('\n--- Relevant Console Logs ---');
    logs.filter(l =>
      l.includes('CanvasManager') ||
      l.includes('SharedCanvasPage') ||
      l.includes('widget') ||
      l.includes('Widget')
    ).forEach(l => console.log(l));

    // Assertions
    expect(hasError).toBe(false);
    expect(hasCanvas).toBe(true);
  });

  test('check what SharedCanvasPage receives', async ({ page }) => {
    // First create and save a canvas
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open Save & Share
    await page.locator('button:has-text("Save & Share")').click();
    await page.waitForTimeout(500);

    // Select Unlisted
    await page.locator('button:has-text("Unlisted")').click();

    // Get slug
    const slug = await page.locator('input[placeholder="your-url"]').inputValue();
    console.log('Slug:', slug);

    // Save
    await page.locator('button:has-text("Save & Publish")').click();
    await page.waitForTimeout(2000);

    // Now navigate to the slug URL and capture detailed logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('SharedCanvasPage') || text.includes('loadCanvasBySlug') || text.includes('widget')) {
        console.log('LOG:', text);
      }
    });

    await page.goto(`/c/${slug}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take a screenshot
    await page.screenshot({ path: 'test-results/slug-page-screenshot.png', fullPage: true });

    // Check the page state
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyClasses: document.body.className,
        hasError: !!document.querySelector('h2')?.textContent?.includes('Not Found'),
        visibleText: document.body.innerText.substring(0, 500)
      };
    });

    console.log('Page state:', JSON.stringify(pageState, null, 2));
  });
});
