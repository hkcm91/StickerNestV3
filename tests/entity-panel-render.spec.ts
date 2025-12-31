/**
 * EntityPanel3D Render Test
 *
 * Tests the actual rendering of the EntityPanel3D widget content.
 */

import { test, expect } from '@playwright/test';

test.describe('EntityPanel3D Render Test', () => {
  test('add EntityPanel3D widget and check content', async ({ page }) => {
    // Collect console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('EntityPanel') || text.includes('Error') || text.includes('error')) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });

    console.log('\n=== EntityPanel3D Widget Render Test ===\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 1: Find and click the add widget button
    console.log('Looking for Add Widget button...');

    const addWidgetSelectors = [
      'button:has-text("Add Widget")',
      'button:has-text("+ Widget")',
      'button[title*="Add"]',
      '[data-testid="add-widget"]',
      'button:has-text("+")',
    ];

    let addButton = null;
    for (const selector of addWidgetSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.count() > 0) {
        addButton = btn;
        console.log(`Found add button with selector: ${selector}`);
        break;
      }
    }

    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(500);
      console.log('Clicked Add Widget button');
    } else {
      console.log('No Add Widget button found, checking for widget library panel...');
    }

    // Step 2: Look for EntityPanel3D in the widget library
    console.log('Looking for 3D Entity Panel in library...');

    const entityPanelSelectors = [
      'text=3D Entity Panel',
      'text=Entity Panel',
      '[data-widget-id*="entity-panel"]',
      'button:has-text("Entity")',
    ];

    let entityPanelCard = null;
    for (const selector of entityPanelSelectors) {
      const card = page.locator(selector).first();
      if (await card.count() > 0) {
        entityPanelCard = card;
        console.log(`Found entity panel with selector: ${selector}`);
        break;
      }
    }

    if (entityPanelCard) {
      // Click to add the widget
      await entityPanelCard.click();
      await page.waitForTimeout(1000);
      console.log('Clicked on EntityPanel3D to add it');
    }

    // Step 3: Check what's rendered on the page
    await page.screenshot({ path: 'tests/screenshots/entity-panel-render-01.png', fullPage: true });

    const pageContent = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        has3DEntityPanel: body.includes('3D Entity Panel'),
        hasSearch: body.includes('Search'),
        hasUpload: body.includes('Upload'),
        hasImages: body.includes('Images'),
        hasShapes: body.includes('Shapes') || body.includes('Primitives'),
        hasCube: body.includes('Cube'),
        hasSphere: body.includes('Sphere'),
        bodyTextSample: body.slice(0, 500),
      };
    });

    console.log('Page content check:', JSON.stringify(pageContent, null, 2));

    // Step 4: Look for the widget frame/container
    const widgetFrame = await page.evaluate(() => {
      // Look for widget frames
      const frames = document.querySelectorAll('[data-widget-frame], [class*="widget-frame"], [class*="WidgetFrame"]');
      const iframes = document.querySelectorAll('iframe[data-widget-id]');

      const result: any = {
        widgetFrameCount: frames.length,
        iframeCount: iframes.length,
        frames: [],
        iframes: [],
      };

      frames.forEach((f, i) => {
        result.frames.push({
          className: (f as HTMLElement).className,
          id: f.id,
          innerHTML: f.innerHTML.slice(0, 200),
        });
      });

      iframes.forEach((iframe, i) => {
        result.iframes.push({
          src: iframe.getAttribute('src'),
          widgetId: iframe.getAttribute('data-widget-id'),
        });
      });

      return result;
    });

    console.log('Widget frames:', JSON.stringify(widgetFrame, null, 2));

    // Step 5: Check for EntityPanel3D specific elements
    const entityPanelElements = await page.evaluate(() => {
      const elements: any = {
        tabButtons: [],
        primitiveButtons: [],
        colorButtons: [],
        searchInput: false,
        uploadArea: false,
      };

      // Look for tab buttons
      document.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent?.trim() || '';
        if (['Search', 'Upload', 'Images', 'Shapes', 'Primitives'].some(t => text.includes(t))) {
          elements.tabButtons.push(text);
        }
        // Primitive buttons
        if (['Cube', 'Sphere', 'Cylinder', 'Cone', 'Torus', 'Plane', 'Ring'].some(t => text.includes(t))) {
          elements.primitiveButtons.push(text);
        }
      });

      // Look for search input
      elements.searchInput = !!document.querySelector('input[placeholder*="Search"], input[type="search"]');

      // Look for upload area
      elements.uploadArea = !!document.querySelector('input[type="file"], [class*="drop"], [class*="upload"]');

      // Look for color buttons (check for colored elements)
      document.querySelectorAll('button').forEach(btn => {
        const bg = (btn as HTMLElement).style.backgroundColor;
        if (bg && bg !== '') {
          elements.colorButtons.push(bg);
        }
      });

      return elements;
    });

    console.log('EntityPanel3D elements:', JSON.stringify(entityPanelElements, null, 2));

    // Step 6: Check for Tailwind CSS loading
    const cssCheck = await page.evaluate(() => {
      const testEl = document.createElement('div');
      testEl.className = 'bg-purple-500';
      document.body.appendChild(testEl);
      const computed = window.getComputedStyle(testEl);
      const bgColor = computed.backgroundColor;
      document.body.removeChild(testEl);

      return {
        tailwindLoaded: bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent',
        testBgColor: bgColor,
      };
    });

    console.log('CSS check:', JSON.stringify(cssCheck, null, 2));

    await page.screenshot({ path: 'tests/screenshots/entity-panel-render-02.png', fullPage: true });
  });

  test('check widget library panel directly', async ({ page }) => {
    console.log('\n=== Widget Library Panel Test ===\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for library panel
    const libraryState = await page.evaluate(() => {
      const panels = document.querySelectorAll('[class*="library"], [class*="Library"], [class*="panel"], [class*="Panel"]');
      const result: any = {
        panelCount: panels.length,
        panels: [],
      };

      panels.forEach(panel => {
        const text = (panel as HTMLElement).innerText || '';
        if (text.includes('Entity') || text.includes('Widget') || text.includes('3D')) {
          result.panels.push({
            className: (panel as HTMLElement).className,
            text: text.slice(0, 200),
          });
        }
      });

      return result;
    });

    console.log('Library state:', JSON.stringify(libraryState, null, 2));

    // Look for any widget cards
    const widgetCards = await page.locator('[class*="widget-card"], [class*="WidgetCard"]').all();
    console.log(`Found ${widgetCards.length} widget cards`);

    for (let i = 0; i < Math.min(widgetCards.length, 5); i++) {
      const text = await widgetCards[i].textContent();
      console.log(`  Card ${i}: ${text?.slice(0, 50)}`);
    }

    await page.screenshot({ path: 'tests/screenshots/widget-library-panel.png', fullPage: true });
  });
});
