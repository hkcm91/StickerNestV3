import { test, expect } from '@playwright/test';

test.describe('Canvas Slug URL', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('stickernest')) {
          localStorage.removeItem(key);
        }
      });
    });
  });

  test('should create canvas and access via slug URL', async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.text().includes('CanvasManager') || msg.text().includes('slug')) {
        console.log('PAGE:', msg.text());
      }
    });

    // 1. Go to create page
    await page.goto('/create');
    await page.waitForLoadState('networkidle');

    // Wait for the page to fully load
    await page.waitForTimeout(2000);

    // 2. Click "Save & Share" to expand the panel
    const saveShareButton = page.locator('button:has-text("Save & Share")');
    await expect(saveShareButton).toBeVisible({ timeout: 10000 });
    await saveShareButton.click();

    // 3. Select "Unlisted" visibility
    const unlistedButton = page.locator('button:has-text("Unlisted")');
    await expect(unlistedButton).toBeVisible();
    await unlistedButton.click();

    // 4. Get the generated slug value
    const slugInput = page.locator('input[placeholder="your-url"]');
    await expect(slugInput).toBeVisible();
    const slug = await slugInput.inputValue();
    console.log('Generated slug:', slug);
    expect(slug).toBeTruthy();
    expect(slug.length).toBeGreaterThan(0);

    // 5. Click "Save & Publish"
    const saveButton = page.locator('button:has-text("Save & Publish")');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // 6. Wait for save to complete
    await page.waitForTimeout(2000);

    // 7. Verify share URL appears
    const shareUrlInput = page.locator('input[readonly]');
    await expect(shareUrlInput).toBeVisible({ timeout: 5000 });
    const shareUrl = await shareUrlInput.inputValue();
    console.log('Share URL:', shareUrl);
    expect(shareUrl).toContain('/c/');
    expect(shareUrl).toContain(slug);

    // 8. Check localStorage for saved canvas
    const canvasKeys = await page.evaluate(() => {
      return Object.keys(localStorage).filter(k => k.includes('stickernest-canvas'));
    });
    console.log('Canvas keys in localStorage:', canvasKeys);
    expect(canvasKeys.length).toBeGreaterThan(0);

    // 9. Check if canvas has slug
    const canvasData = await page.evaluate((slug) => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('stickernest-canvas-') && !k.includes('index'));
      for (const key of keys) {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.canvas?.slug === slug) {
          return data;
        }
      }
      return null;
    }, slug);
    console.log('Canvas data with slug:', canvasData ? 'found' : 'not found');
    expect(canvasData).toBeTruthy();
    expect(canvasData.canvas.slug).toBe(slug);

    // 10. Navigate to slug URL
    await page.goto(`/c/${slug}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 11. Verify canvas loaded (should not show error)
    const errorText = page.locator('text=Canvas not found');
    const hasError = await errorText.isVisible().catch(() => false);

    if (hasError) {
      // Debug: check what's in localStorage after navigation
      const afterNavKeys = await page.evaluate(() => {
        return Object.keys(localStorage).filter(k => k.includes('stickernest'));
      });
      console.log('localStorage after nav:', afterNavKeys);
    }

    expect(hasError).toBe(false);
  });

  test('should show error for non-existent slug', async ({ page }) => {
    // Navigate to a non-existent slug
    await page.goto('/c/nonexistent-slug-12345');
    await page.waitForLoadState('networkidle');

    // Wait for error heading to appear (case insensitive search)
    const errorHeading = page.locator('h2:has-text("Canvas Not Found")');
    await expect(errorHeading).toBeVisible({ timeout: 10000 });
  });
});
