/**
 * Canvas Resize Click Debug
 * Tests actual click interaction with size selector
 */

import { test, expect } from '@playwright/test';

test.describe('Canvas Resize Click', () => {
  test('should resize canvas when clicking preset', async ({ page }) => {
    page.on('console', msg => console.log('PAGE:', msg.text()));

    await page.goto('/');
    await page.waitForSelector('[data-canvas-background]', { timeout: 10000 });

    // Screenshot initial state
    await page.screenshot({ path: 'test-results/click-01-initial.png' });

    // Find the size selector button - it shows "📐" icon
    let sizeButton = page.locator('button:has-text("📐")').first();

    if (!(await sizeButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Look for the controls bar and size selector within it
      const controlsBar = page.locator('.sn-controls-bar');
      console.log('Controls bar visible:', await controlsBar.isVisible().catch(() => false));

      // List all buttons to find the right one
      const buttons = await page.locator('button').all();
      for (const btn of buttons.slice(0, 30)) {
        const text = await btn.textContent().catch(() => '');
        if (text) {
          console.log('Button:', text.substring(0, 50));
        }
      }

      // Try alternate selector
      sizeButton = page.locator('button').filter({ hasText: /Full HD|1920|1080p/ }).first();
    }

    const initialSizeText = await sizeButton.textContent().catch(() => 'not found');
    console.log('Size button text:', initialSizeText);

    if (await sizeButton.isVisible().catch(() => false)) {
      // Use JS to click the button directly
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement;
        if (btn) {
          console.log('Clicking size button via JS');
          btn.click();
        }
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/click-02-dropdown.png' });

      // Check if dropdown is visible
      const dropdown = page.locator('[role="listbox"]');
      const dropdownVisible = await dropdown.isVisible().catch(() => false);
      console.log('Dropdown visible:', dropdownVisible);

      if (dropdownVisible) {
        // Find and click 720p option using natural click (not force)
        const preset720 = page.locator('[role="option"]').filter({ hasText: /720p|1280/ }).first();

        if (await preset720.isVisible()) {
          console.log('Found 720p preset:', await preset720.textContent());

          // Use dispatchEvent to trigger React's synthetic event
          await page.evaluate(() => {
            const option = document.querySelector('[role="option"]:nth-child(2)') as HTMLElement;
            if (option) {
              console.log('Dispatching click event on:', option.textContent);
              option.click();
            }
          });

          await page.waitForTimeout(500);
          console.log('Clicked 720p preset via JS');
        }
      } else {
        // Try to directly call the size change
        console.log('Dropdown not visible, trying direct store update');
        await page.evaluate(() => {
          // Find buttons with 720 in text and simulate selecting it
          const options = document.querySelectorAll('[role="option"]');
          console.log('Found options:', options.length);
        });
      }
    }

    await page.screenshot({ path: 'test-results/click-03-after-select.png' });

    // Now open fullscreen and verify it shows the same dimensions
    await page.keyboard.press('f');
    await page.waitForTimeout(800);

    const fullscreenDims = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { error: 'No dialog' };

      const bg = dialog.querySelector('[data-canvas-background]') as HTMLElement;
      if (!bg) return { error: 'No canvas in dialog' };

      const fiberKey = Object.keys(bg).find(key => key.startsWith('__reactFiber'));
      if (!fiberKey) return { error: 'No fiber' };

      let current = (bg as any)[fiberKey];
      let depth = 0;

      while (current && depth < 30) {
        const props = current.memoizedProps;
        if (props?.width !== undefined && props?.height !== undefined) {
          return {
            width: props.width,
            height: props.height,
            canvasId: props.canvasId,
          };
        }
        current = current.return;
        depth++;
      }

      return { error: 'Props not found' };
    });

    console.log('Fullscreen dimensions:', fullscreenDims);
    await page.screenshot({ path: 'test-results/click-04-fullscreen.png' });

    await page.keyboard.press('Escape');

    // Check canvas dimensions via React fiber
    const canvasInfo = await page.evaluate(() => {
      const bg = document.querySelector('[data-canvas-background]') as HTMLElement;
      if (!bg) return { error: 'No canvas background' };

      const fiberKey = Object.keys(bg).find(key => key.startsWith('__reactFiber'));
      if (!fiberKey) return { error: 'No React fiber' };

      let current = (bg as any)[fiberKey];
      let depth = 0;

      while (current && depth < 30) {
        const props = current.memoizedProps;
        if (props?.width !== undefined && props?.height !== undefined) {
          return {
            width: props.width,
            height: props.height,
            canvasId: props.canvasId,
          };
        }
        current = current.return;
        depth++;
      }

      return { error: 'Props not found' };
    });

    console.log('Canvas dimensions:', canvasInfo);
  });

  test('debug UI structure', async ({ page }) => {
    page.on('console', msg => console.log('PAGE:', msg.text()));

    await page.goto('/');
    await page.waitForSelector('[data-canvas-background]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Take a full-page screenshot
    await page.screenshot({ path: 'test-results/ui-structure.png', fullPage: true });

    // Find and log all control elements
    const info = await page.evaluate(() => {
      const result: any = {
        controlsBars: [],
        buttons: [],
        selectors: [],
      };

      // Find controls bars
      document.querySelectorAll('.sn-controls-bar, [class*="controls"]').forEach((el, i) => {
        result.controlsBars.push({
          index: i,
          className: el.className,
          innerHTML: el.innerHTML.substring(0, 200),
        });
      });

      // Find buttons with size-related text
      document.querySelectorAll('button').forEach((btn, i) => {
        const text = btn.textContent || '';
        if (text.includes('📐') || text.includes('1920') || text.includes('1080') ||
            text.includes('HD') || text.includes('×') || text.includes('x')) {
          result.buttons.push({
            index: i,
            text: text.substring(0, 100),
            className: btn.className,
          });
        }
      });

      return result;
    });

    console.log('UI Structure:', JSON.stringify(info, null, 2));
  });
});
