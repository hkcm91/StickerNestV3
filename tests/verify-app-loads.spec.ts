/**
 * Quick verification test to check if app loads without blank screen
 */
import { test, expect } from '@playwright/test';

test('app loads successfully', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check if root has content
  const root = page.locator('#root');
  const content = await root.innerHTML();

  console.log('Root content length:', content.length);
  console.log('Errors count:', errors.length);

  if (errors.length > 0) {
    console.log('ERRORS:');
    errors.slice(0, 5).forEach(e => console.log('  -', e));
  }

  // App should have content (not blank)
  expect(content.length).toBeGreaterThan(100);

  // No critical errors
  const criticalErrors = errors.filter(e =>
    e.includes('useLayoutEffect') ||
    e.includes('Cannot read properties of undefined') ||
    e.includes('is not a function')
  );
  expect(criticalErrors).toHaveLength(0);
});
