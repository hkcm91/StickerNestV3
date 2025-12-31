/**
 * Find the element with overflow:visible that might be causing the issue
 */
import { test } from '@playwright/test';

test('find overflow visible canvas elements', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);

  const results = await page.evaluate(() => {
    const elements = document.querySelectorAll('[class*="canvas"], [class*="Canvas"], [data-canvas]');
    const found: any[] = [];

    elements.forEach((el, i) => {
      const style = window.getComputedStyle(el);
      if (style.overflow === 'visible' || style.overflowX === 'visible' || style.overflowY === 'visible') {
        const rect = el.getBoundingClientRect();
        found.push({
          index: i,
          tag: el.tagName,
          className: el.className?.toString?.()?.slice(0, 60) || '',
          id: el.id,
          overflow: style.overflow,
          rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
          hasTransform: el.hasAttribute('data-canvas-transform'),
          innerHTML: el.innerHTML?.slice(0, 100),
        });
      }
    });

    return found;
  });

  console.log('\n=== Elements with overflow:visible ===\n');
  results.forEach(r => {
    console.log(`<${r.tag}> class="${r.className}" overflow:${r.overflow} ${r.rect.w}x${r.rect.h}`);
    if (r.hasTransform) console.log('  ^ HAS data-canvas-transform');
  });

  // Also check the transform container specifically
  const transformInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-canvas-transform]');
    if (!el) return null;

    const style = window.getComputedStyle(el);
    return {
      overflow: style.overflow,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      className: el.className,
    };
  });

  console.log('\n=== Transform container ===');
  console.log(transformInfo);
});
