/**
 * EntityPanel3D Widget Diagnostic Test
 *
 * Tests to diagnose why the 3D Entity Panel widget shows empty content.
 * Also tests VR mode transition issues.
 */

import { test, expect } from '@playwright/test';

test.describe('EntityPanel3D Widget Diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('EntityPanel') ||
          text.includes('Spatial3DAPI') ||
          text.includes('[Spatial') ||
          text.includes('is3DReactWidget') ||
          text.includes('kind') ||
          text.includes('Widget') && text.includes('3D')) {
        console.log(`[CONSOLE ${msg.type()}] ${text}`);
      }
    });

    // Collect errors
    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('diagnose EntityPanel3D widget loading', async ({ page }) => {
    console.log('\n=== EntityPanel3D Widget Diagnostic ===\n');

    // Step 1: Check if the widget exists in the builtin registry
    const builtinInfo = await page.evaluate(() => {
      // @ts-ignore - accessing internal state
      const win = window as any;

      // Try to find EntityPanel3D in any exposed stores/registries
      const diagnostics: any = {
        widgetDefId: 'stickernest.entity-panel-3d',
        found: false,
        manifest: null,
        component: null,
      };

      return diagnostics;
    });

    console.log('Builtin widget info:', JSON.stringify(builtinInfo, null, 2));

    // Step 2: Look for any 3D mode toggle or spatial canvas
    const spatialCanvasExists = await page.locator('[data-spatial-canvas="true"]').count() > 0;
    console.log('Spatial canvas exists:', spatialCanvasExists);

    // Step 3: Check for 3D/VR mode buttons
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      return allButtons
        .filter(b => {
          const text = b.textContent?.toLowerCase() || '';
          const title = b.getAttribute('title')?.toLowerCase() || '';
          return text.includes('vr') || text.includes('ar') || text.includes('3d') ||
                 title.includes('vr') || title.includes('ar') || title.includes('3d') ||
                 title.includes('spatial') || text.includes('spatial');
        })
        .map(b => ({
          text: b.textContent?.trim(),
          title: b.getAttribute('title'),
          disabled: b.disabled,
          className: b.className,
        }));
    });

    console.log('XR/3D related buttons:', JSON.stringify(buttons, null, 2));

    // Step 4: Try to find any widget with entity-panel in the DOM
    const entityPanelElements = await page.evaluate(() => {
      const elements: any[] = [];

      // Check for widget frames with entity-panel
      document.querySelectorAll('[data-widget-def-id*="entity-panel"], [data-widget-id*="entity"]').forEach(el => {
        elements.push({
          tagName: el.tagName,
          dataWidgetDefId: el.getAttribute('data-widget-def-id'),
          innerHTML: el.innerHTML.slice(0, 200),
        });
      });

      // Check for any EntityPanel3D class or component
      document.querySelectorAll('[class*="entity"], [class*="Entity"]').forEach(el => {
        elements.push({
          tagName: el.tagName,
          className: el.className,
          innerHTML: el.innerHTML.slice(0, 100),
        });
      });

      return elements;
    });

    console.log('EntityPanel elements found:', entityPanelElements.length);
    entityPanelElements.forEach((el, i) => console.log(`  Element ${i}:`, el));

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/entity-panel-01-initial.png', fullPage: true });
  });

  test('diagnose 3D mode canvas rendering', async ({ page }) => {
    console.log('\n=== 3D Mode Canvas Rendering Diagnostic ===\n');

    // Find and click the 3D mode toggle
    const toggle3D = page.locator('button[title*="3D"], button[title*="spatial"], button:has-text("3D")').first();
    const gridModeToggle = page.locator('button[title*="Grid"], button[title*="grid"]').first();

    // Check what mode toggles exist
    const modeToggles = await page.evaluate(() => {
      const toggles: any[] = [];
      document.querySelectorAll('button, [role="button"]').forEach(el => {
        const title = el.getAttribute('title') || '';
        const text = el.textContent || '';
        if (title.toLowerCase().includes('mode') ||
            title.toLowerCase().includes('3d') ||
            title.toLowerCase().includes('grid') ||
            title.toLowerCase().includes('spatial')) {
          toggles.push({
            title,
            text: text.slice(0, 50),
            className: (el as HTMLElement).className,
          });
        }
      });
      return toggles;
    });

    console.log('Mode toggles found:', modeToggles);

    // Try to enter 3D/grid mode
    if (await toggle3D.count() > 0) {
      console.log('Clicking 3D toggle...');
      await toggle3D.click();
      await page.waitForTimeout(1000);
    } else if (await gridModeToggle.count() > 0) {
      console.log('Clicking Grid mode toggle...');
      await gridModeToggle.click();
      await page.waitForTimeout(1000);
    }

    // Check spatial canvas state after toggle
    const spatialState = await page.evaluate(() => {
      const spatialCanvas = document.querySelector('[data-spatial-canvas="true"]');
      if (!spatialCanvas) return { exists: false };

      const style = window.getComputedStyle(spatialCanvas);
      const threeCanvas = spatialCanvas.querySelector('canvas');

      // Check for any Html elements (drei Html components)
      const htmlElements = spatialCanvas.querySelectorAll('[style*="position: absolute"]');

      return {
        exists: true,
        visible: style.display !== 'none' && style.visibility !== 'hidden',
        opacity: style.opacity,
        zIndex: style.zIndex,
        width: spatialCanvas.clientWidth,
        height: spatialCanvas.clientHeight,
        hasThreeCanvas: !!threeCanvas,
        threeCanvasSize: threeCanvas ? { w: threeCanvas.width, h: threeCanvas.height } : null,
        htmlElementCount: htmlElements.length,
        childCount: spatialCanvas.childElementCount,
      };
    });

    console.log('Spatial canvas state:', JSON.stringify(spatialState, null, 2));

    // Check for widgets in the spatial scene
    const spatialWidgets = await page.evaluate(() => {
      const widgets: any[] = [];

      // Look for SpatialWidgetContainer rendered elements
      document.querySelectorAll('[data-spatial-widget], [class*="spatial-widget"]').forEach(el => {
        widgets.push({
          className: (el as HTMLElement).className,
          innerHTML: el.innerHTML.slice(0, 100),
        });
      });

      // Look for Html elements from drei (rendered widget content)
      document.querySelectorAll('.drei-html, [class*="drei"]').forEach(el => {
        widgets.push({
          type: 'drei-html',
          innerHTML: el.innerHTML.slice(0, 100),
        });
      });

      return widgets;
    });

    console.log('Spatial widgets found:', spatialWidgets.length);
    spatialWidgets.forEach((w, i) => console.log(`  Widget ${i}:`, w));

    await page.screenshot({ path: 'tests/screenshots/entity-panel-02-3d-mode.png', fullPage: true });
  });

  test('diagnose widget manifest and kind property', async ({ page }) => {
    console.log('\n=== Widget Manifest Diagnostic ===\n');

    // Inject script to check manifest properties
    const manifestCheck = await page.evaluate(() => {
      // This would need access to the widget registry
      // Let's check what's available in the global scope
      const diagnostics: any = {
        globalKeys: Object.keys(window).filter(k =>
          k.toLowerCase().includes('widget') ||
          k.toLowerCase().includes('store') ||
          k.toLowerCase().includes('manifest')
        ),
      };

      // Check for any exposed module state
      // @ts-ignore
      if (window.__STICKERNEST_DEBUG__) {
        // @ts-ignore
        diagnostics.debug = window.__STICKERNEST_DEBUG__;
      }

      return diagnostics;
    });

    console.log('Manifest diagnostics:', JSON.stringify(manifestCheck, null, 2));

    // Check for the actual EntityPanel3D component by looking at React tree
    const reactTreeInfo = await page.evaluate(() => {
      const info: any = {
        reactRoot: false,
        fiberNodes: [],
      };

      const root = document.getElementById('root');
      if (root) {
        const fiberKey = Object.keys(root).find(key => key.startsWith('__reactFiber'));
        info.reactRoot = !!fiberKey;
      }

      return info;
    });

    console.log('React tree info:', JSON.stringify(reactTreeInfo, null, 2));
  });

  test('diagnose VR mode transition', async ({ page }) => {
    console.log('\n=== VR Mode Transition Diagnostic ===\n');

    // Check WebXR availability
    const xrCapabilities = await page.evaluate(async () => {
      const caps: any = {
        webXRAvailable: !!navigator.xr,
        vrSupported: false,
        arSupported: false,
      };

      if (navigator.xr) {
        try {
          caps.vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
        } catch (e) {
          caps.vrError = (e as Error).message;
        }
        try {
          caps.arSupported = await navigator.xr.isSessionSupported('immersive-ar');
        } catch (e) {
          caps.arError = (e as Error).message;
        }
      }

      return caps;
    });

    console.log('XR capabilities:', JSON.stringify(xrCapabilities, null, 2));

    // Find VR button
    const vrButton = page.locator('button:has-text("VR"), button[title*="VR"]').first();
    const vrButtonExists = await vrButton.count() > 0;

    console.log('VR button exists:', vrButtonExists);

    if (vrButtonExists) {
      const vrButtonState = await vrButton.evaluate(el => ({
        disabled: (el as HTMLButtonElement).disabled,
        title: el.getAttribute('title'),
        text: el.textContent?.trim(),
        className: el.className,
      }));

      console.log('VR button state:', JSON.stringify(vrButtonState, null, 2));
    }

    // Check spatial mode store if accessible
    const spatialModeState = await page.evaluate(() => {
      // Try to access Zustand store through devtools or exposed state
      const state: any = {
        documentVisibility: document.visibilityState,
        windowInnerSize: { w: window.innerWidth, h: window.innerHeight },
      };

      // Check for XR session state
      const xrElements = document.querySelectorAll('[data-xr-mode], [data-spatial-mode]');
      state.xrElements = Array.from(xrElements).map(el => ({
        mode: el.getAttribute('data-xr-mode') || el.getAttribute('data-spatial-mode'),
      }));

      return state;
    });

    console.log('Spatial mode state:', JSON.stringify(spatialModeState, null, 2));

    await page.screenshot({ path: 'tests/screenshots/entity-panel-03-vr-state.png', fullPage: true });
  });

  test('diagnose SpatialWidgetContainer rendering', async ({ page }) => {
    console.log('\n=== SpatialWidgetContainer Rendering Diagnostic ===\n');

    // Navigate and wait for app to load
    await page.waitForTimeout(2000);

    // Check for Three.js canvas and its contents
    const threeJsState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { canvasExists: false };

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      return {
        canvasExists: true,
        canvasSize: { w: canvas.width, h: canvas.height },
        hasWebGL: !!gl,
        webGLVersion: gl ? (gl instanceof WebGL2RenderingContext ? 2 : 1) : 0,
      };
    });

    console.log('Three.js canvas state:', JSON.stringify(threeJsState, null, 2));

    // Check for any error overlays or loading states
    const overlayState = await page.evaluate(() => {
      const overlays: any[] = [];

      // Check for error messages
      document.querySelectorAll('[class*="error"], [class*="Error"]').forEach(el => {
        overlays.push({
          type: 'error',
          text: el.textContent?.slice(0, 100),
        });
      });

      // Check for loading states
      document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"]').forEach(el => {
        overlays.push({
          type: 'loading',
          visible: window.getComputedStyle(el).display !== 'none',
        });
      });

      return overlays;
    });

    console.log('Overlay state:', JSON.stringify(overlayState, null, 2));

    // Log current URL and page state
    console.log('Current URL:', page.url());

    await page.screenshot({ path: 'tests/screenshots/entity-panel-04-threejs.png', fullPage: true });
  });
});
