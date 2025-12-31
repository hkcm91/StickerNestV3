/**
 * Widget Crop Programmatic Test
 * Sets crop values directly via JavaScript to verify clip-path rendering
 */
import { test, expect } from '@playwright/test';

test.describe('Widget Crop Programmatic', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('crop') || text.includes('clip') || msg.type() === 'error') {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto('/c/white-label-store');
    await page.waitForTimeout(3000);
  });

  test('should verify clip-path changes with programmatic crop values', async ({ page }) => {
    console.log('\n=== PROGRAMMATIC CROP TEST ===\n');

    // Screenshot baseline
    await page.screenshot({ path: 'tests/screenshots/crop-prog-01-baseline.png', fullPage: true });

    // Find the widget wrapper element and get its clip-path
    const widget = page.locator('[data-widget-id]').first();
    const widgetId = await widget.getAttribute('data-widget-id');
    console.log(`Testing widget: ${widgetId}`);

    // Get initial clip-path
    const initialClip = await widget.evaluate((el) => {
      const divs = el.querySelectorAll('div');
      for (const div of Array.from(divs)) {
        const style = window.getComputedStyle(div);
        if (style.clipPath && style.clipPath !== 'none') {
          return { element: div.className || div.tagName, clipPath: style.clipPath };
        }
      }
      return null;
    });
    console.log('Initial clip-path:', initialClip);

    // Now programmatically set crop values by directly modifying the style
    const modifiedClip = await widget.evaluate((el) => {
      // Find the div that has clip-path applied
      const divs = el.querySelectorAll('div');
      for (const div of Array.from(divs)) {
        const style = window.getComputedStyle(div);
        if (style.clipPath && style.clipPath.includes('inset')) {
          // Modify the clip-path to simulate cropping
          (div as HTMLElement).style.clipPath = 'inset(20% 10% 15% 5%)';
          (div as HTMLElement).style.webkitClipPath = 'inset(20% 10% 15% 5%)';

          // Force a repaint
          div.offsetHeight;

          // Return the new computed style
          const newStyle = window.getComputedStyle(div);
          return {
            element: div.className || div.tagName,
            newClipPath: newStyle.clipPath,
            expectedClipPath: 'inset(20% 10% 15% 5%)',
          };
        }
      }
      return null;
    });
    console.log('After modification:', modifiedClip);

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/crop-prog-02-modified.png', fullPage: true });

    // Verify the clip-path changed
    if (modifiedClip) {
      const clipMatch = modifiedClip.newClipPath?.includes('20%') && modifiedClip.newClipPath?.includes('10%');
      console.log(`Clip-path modification ${clipMatch ? 'SUCCEEDED' : 'FAILED'}`);

      if (!clipMatch) {
        console.log('Expected clip-path to contain 20% and 10%');
        console.log('Actual clip-path:', modifiedClip.newClipPath);
      }
    }

    // Also test overflow:hidden on parent elements
    const overflowTest = await widget.evaluate((el) => {
      const results: { element: string; overflow: string; clipPath: string }[] = [];
      let current: Element | null = el;
      while (current && results.length < 5) {
        const style = window.getComputedStyle(current);
        results.push({
          element: current.tagName + (current.className ? '.' + current.className.split(' ')[0] : ''),
          overflow: style.overflow,
          clipPath: style.clipPath,
        });
        current = current.parentElement;
      }
      return results;
    });
    console.log('\nOverflow chain:', overflowTest);
  });

  test('should verify clip-path is visually clipping content', async ({ page }) => {
    console.log('\n=== VISUAL CLIP TEST ===\n');

    const widget = page.locator('[data-widget-id]').first();
    const exists = await widget.count() > 0;

    if (!exists) {
      console.log('No widgets found');
      return;
    }

    // Get initial widget screenshot dimensions
    const initialBox = await widget.boundingBox();
    console.log('Widget bounding box:', initialBox);

    // Apply aggressive cropping directly to the element
    const cropResult = await widget.evaluate((el) => {
      // Apply clip to the widget wrapper itself
      const style = (el as HTMLElement).style;

      // Before: save current clip
      const computedBefore = window.getComputedStyle(el);
      const clipBefore = computedBefore.clipPath;

      // Apply 50% crop from top - should hide half the widget
      style.clipPath = 'inset(50% 0% 0% 0%)';
      style.overflow = 'hidden';

      // Force repaint
      el.offsetHeight;

      // After
      const computedAfter = window.getComputedStyle(el);
      const clipAfter = computedAfter.clipPath;

      return {
        before: clipBefore,
        after: clipAfter,
        wasHidden: computedBefore.overflow,
        isHidden: computedAfter.overflow,
      };
    });
    console.log('Crop result on wrapper:', cropResult);

    await page.waitForTimeout(300);

    // Take screenshot to see if visual clipping occurred
    await page.screenshot({ path: 'tests/screenshots/crop-prog-03-aggressive.png', fullPage: true });

    // Screenshot just the widget area
    try {
      const widgetScreenshot = await widget.screenshot();
      require('fs').writeFileSync('tests/screenshots/crop-prog-04-widget-only.png', widgetScreenshot);
      console.log('Widget screenshot saved');
    } catch (e) {
      console.log('Could not screenshot widget:', (e as Error).message);
    }
  });

  test('should check for competing CSS that might prevent clipping', async ({ page }) => {
    console.log('\n=== COMPETING CSS CHECK ===\n');

    await page.waitForTimeout(2000);

    // Check all stylesheets for rules that might affect clipping
    const cssAnalysis = await page.evaluate(() => {
      const issues: string[] = [];

      // Check for any rules that might override clip-path or overflow
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          for (const rule of Array.from(rules)) {
            if (rule instanceof CSSStyleRule) {
              const style = rule.style;
              // Check for overflow: visible !important or similar
              if (style.getPropertyPriority('overflow') === 'important') {
                issues.push(`${rule.selectorText}: overflow has !important`);
              }
              if (style.getPropertyPriority('clip-path') === 'important') {
                issues.push(`${rule.selectorText}: clip-path has !important`);
              }
            }
          }
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      }

      return issues;
    });

    if (cssAnalysis.length > 0) {
      console.log('Found potential CSS issues:');
      cssAnalysis.forEach(issue => console.log('  - ' + issue));
    } else {
      console.log('No competing CSS rules with !important found');
    }

    // Check for inline styles that might interfere
    const widget = page.locator('[data-widget-id]').first();
    const inlineStyles = await widget.evaluate((el) => {
      const getInlineOverflowStyles = (element: Element): string[] => {
        const results: string[] = [];
        const traverse = (e: Element, depth = 0) => {
          if (depth > 5) return;
          const inlineStyle = (e as HTMLElement).style;
          if (inlineStyle) {
            const overflow = inlineStyle.overflow;
            const clipPath = inlineStyle.clipPath;
            if (overflow || clipPath) {
              results.push(`${e.tagName}[${depth}]: overflow=${overflow || 'unset'}, clip=${clipPath || 'unset'}`);
            }
          }
          for (const child of Array.from(e.children)) {
            traverse(child, depth + 1);
          }
        };
        traverse(el);
        return results;
      };
      return getInlineOverflowStyles(el);
    });

    console.log('\nInline styles affecting overflow/clip:');
    inlineStyles.forEach(s => console.log('  ' + s));
  });

  test('should test canvas mask overlay visibility', async ({ page }) => {
    console.log('\n=== CANVAS MASK OVERLAY TEST ===\n');

    // Check localStorage for mask settings
    const maskEnabled = await page.evaluate(() => {
      const stored = localStorage.getItem('stickernest-canvas-appearance');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          return data.state?.mask?.enabled ?? data.mask?.enabled ?? 'not found';
        } catch {
          return 'parse error';
        }
      }
      return 'not in storage';
    });
    console.log('Mask enabled in localStorage:', maskEnabled);

    // Enable mask programmatically
    await page.evaluate(() => {
      const stored = localStorage.getItem('stickernest-canvas-appearance');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.state?.mask) {
            data.state.mask.enabled = true;
            data.state.mask.opacity = 90;
          } else if (data.mask) {
            data.mask.enabled = true;
            data.mask.opacity = 90;
          }
          localStorage.setItem('stickernest-canvas-appearance', JSON.stringify(data));
        } catch (e) {
          console.error('Failed to update mask settings');
        }
      }
    });

    // Reload to apply the change
    await page.reload();
    await page.waitForTimeout(3000);

    // Check for mask overlay elements
    const maskOverlays = await page.locator('[data-mask-overlay]').count();
    console.log(`Mask overlay elements after enabling: ${maskOverlays}`);

    await page.screenshot({ path: 'tests/screenshots/crop-prog-05-mask-enabled.png', fullPage: true });

    // Verify mask is rendering
    if (maskOverlays > 0) {
      console.log('SUCCESS: Canvas mask overlay is now rendering');

      const maskStyles = await page.locator('[data-mask-overlay="top"]').evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          backgroundColor: style.backgroundColor,
          opacity: style.opacity,
          zIndex: style.zIndex,
          height: style.height,
        };
      }).catch(() => null);
      console.log('Top mask styles:', maskStyles);
    } else {
      console.log('WARNING: Mask overlay not rendering even after enabling');
    }
  });
});
