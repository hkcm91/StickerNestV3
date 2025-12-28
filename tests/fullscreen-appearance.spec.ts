/**
 * Fullscreen Appearance Test
 * Verifies that appearance settings (border radius, etc.) show in fullscreen
 */

import { test, expect } from '@playwright/test';

test.describe('Fullscreen Appearance', () => {
  test('should show appearance changes in fullscreen', async ({ page }) => {
    page.on('console', msg => console.log('PAGE:', msg.text()));

    await page.goto('/');
    await page.waitForSelector('[data-canvas-background]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Get initial border radius
    const initialStyle = await page.evaluate(() => {
      const bg = document.querySelector('[data-canvas-background]') as HTMLElement;
      const style = window.getComputedStyle(bg);
      return {
        borderRadius: style.borderRadius,
        backdropFilter: style.backdropFilter,
      };
    });
    console.log('Initial style:', initialStyle);

    // Screenshot initial
    await page.screenshot({ path: 'test-results/appear-01-initial.png' });

    // Open fullscreen
    await page.keyboard.press('f');
    await page.waitForTimeout(500);

    // Get fullscreen border radius
    const fullscreenStyle = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { error: 'No dialog' };

      const bg = dialog.querySelector('[data-canvas-background]') as HTMLElement;
      if (!bg) return { error: 'No bg in dialog' };

      const style = window.getComputedStyle(bg);
      return {
        borderRadius: style.borderRadius,
        backdropFilter: style.backdropFilter,
        background: style.background?.substring(0, 100),
      };
    });
    console.log('Fullscreen style:', fullscreenStyle);

    // Screenshot fullscreen
    await page.screenshot({ path: 'test-results/appear-02-fullscreen.png' });

    // Close fullscreen
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify styles match
    expect(fullscreenStyle.borderRadius).toBe(initialStyle.borderRadius);
  });

  test('verify canvas size display in both views', async ({ page }) => {
    page.on('console', msg => console.log('PAGE:', msg.text()));

    await page.goto('/');
    await page.waitForSelector('[data-canvas-background]', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Change canvas size to something distinct (e.g., 800x600)
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement;
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);

    // Find Instagram Square (1080x1080) for a distinct aspect ratio
    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('[role="option"]'));
      const instagram = options.find(opt => opt.textContent?.includes('Instagram Square'));
      if (instagram) {
        console.log('Clicking Instagram Square');
        (instagram as HTMLElement).click();
      } else {
        console.log('Instagram option not found');
        // Fallback to first option that's different
        const first = options[0] as HTMLElement;
        if (first) first.click();
      }
    });
    await page.waitForTimeout(500);

    // Get main canvas info
    const mainInfo = await page.evaluate(() => {
      const bg = document.querySelector('[data-canvas-background]') as HTMLElement;
      if (!bg) return { error: 'No bg' };

      const rect = bg.getBoundingClientRect();
      const style = window.getComputedStyle(bg);

      // Get React props
      const fiberKey = Object.keys(bg).find(key => key.startsWith('__reactFiber'));
      let props: any = null;
      if (fiberKey) {
        let current = (bg as any)[fiberKey];
        let depth = 0;
        while (current && depth < 30) {
          if (current.memoizedProps?.width !== undefined) {
            props = {
              width: current.memoizedProps.width,
              height: current.memoizedProps.height,
            };
            break;
          }
          current = current.return;
          depth++;
        }
      }

      return {
        visualWidth: rect.width,
        visualHeight: rect.height,
        styleWidth: style.width,
        styleHeight: style.height,
        props,
        aspectRatio: rect.width / rect.height,
      };
    });
    console.log('Main canvas info:', mainInfo);

    await page.screenshot({ path: 'test-results/size-01-main.png' });

    // Open fullscreen
    await page.keyboard.press('f');
    await page.waitForTimeout(800);

    // Get fullscreen canvas info
    const fullscreenInfo = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { error: 'No dialog' };

      const bg = dialog.querySelector('[data-canvas-background]') as HTMLElement;
      if (!bg) return { error: 'No bg in dialog' };

      const rect = bg.getBoundingClientRect();
      const style = window.getComputedStyle(bg);

      // Get React props
      const fiberKey = Object.keys(bg).find(key => key.startsWith('__reactFiber'));
      let props: any = null;
      if (fiberKey) {
        let current = (bg as any)[fiberKey];
        let depth = 0;
        while (current && depth < 30) {
          if (current.memoizedProps?.width !== undefined) {
            props = {
              width: current.memoizedProps.width,
              height: current.memoizedProps.height,
            };
            break;
          }
          current = current.return;
          depth++;
        }
      }

      return {
        visualWidth: rect.width,
        visualHeight: rect.height,
        styleWidth: style.width,
        styleHeight: style.height,
        props,
        aspectRatio: rect.width / rect.height,
      };
    });
    console.log('Fullscreen canvas info:', fullscreenInfo);

    await page.screenshot({ path: 'test-results/size-02-fullscreen.png' });

    // Verify props match (the actual canvas dimensions)
    if (mainInfo.props && fullscreenInfo.props) {
      console.log('Main props:', mainInfo.props);
      console.log('Fullscreen props:', fullscreenInfo.props);
      expect(fullscreenInfo.props.width).toBe(mainInfo.props.width);
      expect(fullscreenInfo.props.height).toBe(mainInfo.props.height);
    }
  });
});
