/**
 * EntityPanel3D Loading Test
 *
 * Specifically tests whether the EntityPanel3D widget loads its content.
 * This widget provides search, upload, and primitive tabs for adding 3D content.
 */

import { test, expect } from '@playwright/test';

test.describe('EntityPanel3D Content Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Collect all console logs for debugging
    page.on('console', msg => {
      const text = msg.text();
      // Filter for relevant logs
      if (text.includes('EntityPanel') ||
          text.includes('PolyHaven') ||
          text.includes('searchModels') ||
          text.includes('3DReactWidget') ||
          text.includes('createSpatial3DAPI') ||
          text.includes('[Widget') ||
          text.includes('Error') ||
          text.includes('error')) {
        console.log(`[${msg.type().toUpperCase()}] ${text}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });
  });

  test('check EntityPanel3D in builtin widget registry', async ({ page }) => {
    console.log('\n=== Checking Builtin Widget Registry ===\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if we can find the EntityPanel3D in the widget library or registry
    const widgetInfo = await page.evaluate(() => {
      const results: any = {
        foundInDOM: false,
        widgetLibraryItems: [],
        possibleSelectors: [],
      };

      // Look for widget library or panel
      const libraryPanels = document.querySelectorAll('[class*="library"], [class*="Library"], [class*="widget-list"], [class*="WidgetList"]');
      results.libraryPanelsFound = libraryPanels.length;

      // Look for any mention of entity-panel or EntityPanel
      const allText = document.body.innerText;
      results.mentionsEntityPanel = allText.includes('Entity Panel') || allText.includes('3D Entity');

      // Check sidebar or panel items
      const panelItems = document.querySelectorAll('[class*="panel-item"], [class*="widget-card"], [class*="WidgetCard"]');
      panelItems.forEach(item => {
        const text = item.textContent?.trim() || '';
        if (text.toLowerCase().includes('entity') || text.toLowerCase().includes('3d')) {
          results.widgetLibraryItems.push(text.slice(0, 50));
        }
      });

      return results;
    });

    console.log('Widget registry info:', JSON.stringify(widgetInfo, null, 2));

    // Try to open the widget library panel
    const addWidgetBtn = page.locator('button:has-text("Add Widget"), button:has-text("+ Widget"), button[title*="widget"], [data-testid="add-widget"]').first();
    if (await addWidgetBtn.count() > 0) {
      console.log('Found Add Widget button, clicking...');
      await addWidgetBtn.click();
      await page.waitForTimeout(500);

      // Check for EntityPanel3D in the library
      const entityPanelInLibrary = await page.evaluate(() => {
        const items = document.querySelectorAll('[class*="widget"], [class*="Widget"]');
        const found: string[] = [];
        items.forEach(item => {
          const text = item.textContent || '';
          if (text.toLowerCase().includes('entity') || text.toLowerCase().includes('3d panel')) {
            found.push(text.slice(0, 100));
          }
        });
        return found;
      });

      console.log('EntityPanel items in library:', entityPanelInLibrary);
    }

    await page.screenshot({ path: 'tests/screenshots/entity-panel-registry.png', fullPage: true });
  });

  test('verify EntityPanel3D React component structure', async ({ page }) => {
    console.log('\n=== Verifying EntityPanel3D Component Structure ===\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to programmatically check the component
    const componentCheck = await page.evaluate(() => {
      // Check if there's a way to access the builtin widgets
      const check: any = {
        windowKeys: Object.keys(window).filter(k =>
          k.toLowerCase().includes('widget') ||
          k.toLowerCase().includes('builtin') ||
          k.toLowerCase().includes('entity')
        ),
        moduleCheck: {
          hasReact: typeof (window as any).React !== 'undefined',
          hasReactDOM: typeof (window as any).ReactDOM !== 'undefined',
        }
      };

      return check;
    });

    console.log('Component check:', JSON.stringify(componentCheck, null, 2));
  });

  test('test EntityPanel3D tabs and content', async ({ page }) => {
    console.log('\n=== Testing EntityPanel3D Content ===\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for any tabs that might be part of EntityPanel3D
    const tabInfo = await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="tab"], button[class*="tab"], [class*="Tab"]');
      const tabData: any[] = [];

      tabs.forEach(tab => {
        tabData.push({
          text: tab.textContent?.trim(),
          className: (tab as HTMLElement).className,
          isSelected: tab.getAttribute('aria-selected') === 'true',
        });
      });

      // Look for search inputs
      const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');

      // Look for upload areas
      const uploadAreas = document.querySelectorAll('input[type="file"], [class*="upload"], [class*="Upload"], [class*="drop"]');

      return {
        tabs: tabData.slice(0, 10),
        searchInputCount: searchInputs.length,
        uploadAreaCount: uploadAreas.length,
      };
    });

    console.log('Tab info:', JSON.stringify(tabInfo, null, 2));

    // Look specifically for EntityPanel3D tabs: search, upload, images, primitives
    const entityPanelTabs = await page.locator('button:has-text("Search"), button:has-text("Upload"), button:has-text("Images"), button:has-text("Primitives")').all();
    console.log(`Found ${entityPanelTabs.length} EntityPanel3D-style tabs`);

    for (const tab of entityPanelTabs) {
      const text = await tab.textContent();
      console.log(`  Tab: ${text}`);
    }

    await page.screenshot({ path: 'tests/screenshots/entity-panel-tabs.png', fullPage: true });
  });

  test('check SpatialWidgetContainer 3D widget rendering', async ({ page }) => {
    console.log('\n=== Checking SpatialWidgetContainer Rendering ===\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check the spatial canvas and widget container state
    const spatialState = await page.evaluate(() => {
      const state: any = {
        spatialCanvasExists: false,
        spatialCanvasVisible: false,
        widgetContainerState: null,
        htmlElements: [],
      };

      // Check for spatial canvas
      const spatialCanvas = document.querySelector('[data-spatial-canvas], [class*="SpatialCanvas"]');
      if (spatialCanvas) {
        state.spatialCanvasExists = true;
        const style = window.getComputedStyle(spatialCanvas);
        state.spatialCanvasVisible = style.display !== 'none' && style.visibility !== 'hidden';
      }

      // Check for drei Html elements (3D-rendered HTML)
      const htmlElements = document.querySelectorAll('[class*="drei"], [style*="transform: translate3d"]');
      htmlElements.forEach(el => {
        state.htmlElements.push({
          className: (el as HTMLElement).className,
          innerHTML: el.innerHTML.slice(0, 100),
        });
      });

      // Check for any 3D widget content
      const threeDWidgets = document.querySelectorAll('[data-3d-widget], [class*="spatial-widget"], [class*="SpatialWidget"]');
      state.threeDWidgetCount = threeDWidgets.length;

      return state;
    });

    console.log('Spatial state:', JSON.stringify(spatialState, null, 2));

    await page.screenshot({ path: 'tests/screenshots/spatial-widget-container.png', fullPage: true });
  });

  test('navigate to canvas and check for widgets', async ({ page }) => {
    console.log('\n=== Navigating to Canvas ===\n');

    // Try common canvas routes
    const canvasRoutes = ['/canvas', '/canvas/default', '/edit', '/'];
    let foundCanvas = false;

    for (const route of canvasRoutes) {
      console.log(`Trying route: ${route}`);
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check if we're on a canvas page
      const hasCanvas = await page.evaluate(() => {
        return !!(
          document.querySelector('[class*="canvas"]') ||
          document.querySelector('[class*="Canvas"]') ||
          document.querySelector('[data-testid="canvas"]') ||
          document.querySelector('.canvas-renderer')
        );
      });

      if (hasCanvas) {
        console.log(`Found canvas at ${route}`);
        foundCanvas = true;
        break;
      }
    }

    if (foundCanvas) {
      // Check canvas state
      const canvasState = await page.evaluate(() => {
        const state: any = {
          widgetFrames: [],
          canvasRenderer: false,
          spatialMode: null,
        };

        // Look for widget frames
        document.querySelectorAll('[data-widget-frame], [class*="WidgetFrame"]').forEach(frame => {
          state.widgetFrames.push({
            id: frame.getAttribute('data-widget-frame') || frame.getAttribute('data-widget-id'),
            className: (frame as HTMLElement).className,
          });
        });

        // Check for canvas renderer
        state.canvasRenderer = !!document.querySelector('.canvas-renderer, [class*="CanvasRenderer"]');

        return state;
      });

      console.log('Canvas state:', JSON.stringify(canvasState, null, 2));
    }

    await page.screenshot({ path: 'tests/screenshots/canvas-state.png', fullPage: true });
  });

  test('check is3DReactWidget detection', async ({ page }) => {
    console.log('\n=== Checking is3DReactWidget Detection ===\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for any console logs from our is3DReactWidget function
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('3DReactWidget') || msg.text().includes('kind')) {
        logs.push(msg.text());
      }
    });

    // Wait and collect logs
    await page.waitForTimeout(3000);

    console.log('Collected logs about 3D widget detection:');
    logs.forEach(log => console.log(`  ${log}`));

    // Check if EntityPanel3D manifest is correctly configured
    const manifestCheck = await page.evaluate(() => {
      // We can't directly access the manifest, but we can check if the widget renders
      return {
        documentTitle: document.title,
        url: window.location.href,
      };
    });

    console.log('Manifest check context:', manifestCheck);
  });
});
