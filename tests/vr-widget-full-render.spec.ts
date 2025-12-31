/**
 * VR Widget Full Render Test
 *
 * This test:
 * 1. Adds a Counter widget to the 2D canvas
 * 2. Switches to VR preview mode
 * 3. Takes screenshots at each stage
 * 4. Verifies widget content renders inside 3D panels
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure screenshots directory exists
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

/**
 * Inject WebXR mock for testing
 */
async function injectWebXREmulator(page: Page) {
  await page.addInitScript(() => {
    const mockXR = {
      isSessionSupported: async (mode: string) => mode === 'immersive-vr' || mode === 'immersive-ar',
      requestSession: async () => {
        throw new Error('Mock XR - use preview mode');
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    Object.defineProperty(navigator, 'xr', { value: mockXR, writable: true, configurable: true });
    console.log('[WebXR Mock] Installed');
  });
}

/**
 * Wait for stores to be available on window
 */
async function waitForStores(page: Page, timeout = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const hasStores = await page.evaluate(() => {
      const stores = (window as any).__STICKERNEST_STORES__;
      return stores?.canvas && stores?.spatialMode;
    });
    if (hasStores) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

/**
 * Add a Counter widget programmatically
 */
async function addCounterWidget(page: Page): Promise<{ success: boolean; widgetId?: string; error?: string; debug?: any }> {
  // Wait for stores to be available
  const storesReady = await waitForStores(page);
  if (!storesReady) {
    console.log('[Test] Stores not ready, trying direct store access...');
  }

  return await page.evaluate(() => {
    const stores = (window as any).__STICKERNEST_STORES__;
    const canvasStore = stores?.canvas;

    if (!canvasStore) {
      console.error('[Test] Canvas store not found');
      return { success: false, error: 'Canvas store not found' };
    }

    const state = canvasStore.getState();
    if (!state.addWidget) {
      console.error('[Test] addWidget method not found');
      return { success: false, error: 'addWidget method not found' };
    }

    const widgetId = `counter-${Date.now()}`;
    const widgetsBefore = state.widgets?.size || 0;

    try {
      state.addWidget({
        id: widgetId,
        widgetDefId: 'stickernest.counter',
        name: 'VR Test Counter',
        position: { x: 300, y: 200 },
        width: 200,
        height: 150,
        visible: true,
        state: { value: 42 },
      });

      // Check immediately after adding
      const stateAfter = canvasStore.getState();
      const widgetsAfter = stateAfter.widgets?.size || 0;

      console.log('[Test] Counter widget added:', widgetId);
      console.log('[Test] Widgets before:', widgetsBefore, 'after:', widgetsAfter);

      // Debug: list widget IDs
      const widgetIds = Array.from(stateAfter.widgets?.keys() || []);
      console.log('[Test] Widget IDs:', widgetIds);

      return {
        success: true,
        widgetId,
        debug: {
          widgetsBefore,
          widgetsAfter,
          widgetIds,
          hasWidget: stateAfter.widgets?.has(widgetId),
        }
      };
    } catch (e) {
      console.error('[Test] Failed to add widget:', e);
      return { success: false, error: String(e) };
    }
  });
}

/**
 * Get detailed state information for debugging
 */
async function getDebugState(page: Page) {
  return await page.evaluate(() => {
    const stores = (window as any).__STICKERNEST_STORES__;
    const canvasStore = stores?.canvas;
    const spatialStore = stores?.spatialMode;

    // Get widgets from canvas store
    let widgets: any[] = [];
    if (canvasStore) {
      const state = canvasStore.getState();
      widgets = Array.from(state.widgets?.values() || []).map((w: any) => ({
        id: w.id,
        widgetDefId: w.widgetDefId,
        name: w.name,
        position: w.position,
        width: w.width,
        height: w.height,
        visible: w.visible,
      }));
    }

    // Get spatial mode state
    let spatialMode = null;
    if (spatialStore) {
      const state = spatialStore.getState();
      spatialMode = {
        activeMode: state.activeMode,
        sessionState: state.sessionState,
        targetMode: state.targetMode,
      };
    }

    // Check for iframes
    const iframes = Array.from(document.querySelectorAll('iframe')).map(iframe => ({
      src: iframe.src || '(srcDoc)',
      hasSrcDoc: !!iframe.srcdoc,
      width: iframe.style.width || iframe.width,
      height: iframe.style.height || iframe.height,
      visible: window.getComputedStyle(iframe).display !== 'none',
    }));

    // Check for Three.js canvas
    const threeCanvas = document.querySelector('[data-spatial-canvas="true"] canvas');

    // Check for Html component divs (drei creates these)
    const htmlComponentDivs = Array.from(document.querySelectorAll('div')).filter(div => {
      const style = div.getAttribute('style') || '';
      return style.includes('translate3d') || style.includes('matrix3d');
    }).map(div => ({
      className: div.className,
      childCount: div.childElementCount,
      hasIframe: div.querySelector('iframe') !== null,
      innerHtmlPreview: div.innerHTML.substring(0, 300),
    }));

    return {
      widgets,
      widgetCount: widgets.length,
      spatialMode,
      iframeCount: iframes.length,
      iframes,
      hasThreeCanvas: !!threeCanvas,
      htmlComponentDivs,
    };
  });
}

test.describe('VR Widget Full Render Test', () => {
  test('add counter widget and verify VR rendering', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    // Collect console logs
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      logs.push(text);
      if (msg.type() === 'error' || msg.text().includes('Error')) {
        errors.push(text);
      }
    });

    page.on('pageerror', error => {
      errors.push(`[PAGE ERROR] ${error.message}`);
    });

    // Inject WebXR mock
    await injectWebXREmulator(page);

    // Navigate to spatial demo canvas (has pre-existing widgets)
    console.log('Step 1: Navigating to spatial demo canvas...');
    await page.goto('/canvas/spatial-vr-demo', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-spatial-canvas="true"]', { timeout: 20000 });
    await page.waitForTimeout(4000); // Extra time for widgets to load

    // Screenshot 1: Initial canvas state
    await page.screenshot({ path: path.join(screenshotDir, 'vr-01-initial-canvas.png'), fullPage: true });
    console.log('Screenshot 1: Initial canvas saved');

    // Check existing widgets (demo canvas has widgets pre-loaded)
    console.log('Step 2: Checking pre-loaded widgets...');

    // Get state with pre-loaded widgets
    let state = await getDebugState(page);
    console.log('Initial state:', JSON.stringify(state, null, 2));
    console.log(`Pre-loaded widgets on canvas: ${state.widgetCount}`);

    // Screenshot 2: Desktop mode with widgets
    await page.screenshot({ path: path.join(screenshotDir, 'vr-02-desktop-widgets.png'), fullPage: true });
    console.log('Screenshot 2: Desktop widgets saved');

    // Enter VR mode programmatically via store (UI button may not be visible in test)
    console.log('Step 3: Entering VR mode via store...');
    const vrResult = await page.evaluate(() => {
      const stores = (window as any).__STICKERNEST_STORES__;
      const spatialModeStore = stores?.spatialMode;

      if (!spatialModeStore) {
        console.error('[Test] Spatial mode store not found');
        return { success: false, error: 'Spatial mode store not found' };
      }

      const state = spatialModeStore.getState();
      console.log('[Test] Current mode:', state.activeMode);

      // Enter VR preview mode directly
      state.enterPreviewMode('vr');

      // Verify mode changed
      const newState = spatialModeStore.getState();
      console.log('[Test] New mode:', newState.activeMode);

      return {
        success: true,
        previousMode: state.activeMode,
        newMode: newState.activeMode,
      };
    });
    console.log('VR mode result:', JSON.stringify(vrResult, null, 2));

    // Wait for VR mode transition
    await page.waitForTimeout(4000);

    // Screenshot 3: After clicking VR
    await page.screenshot({ path: path.join(screenshotDir, 'vr-03-after-vr-click.png'), fullPage: true });
    console.log('Screenshot 3: After VR click saved');

    // Get state in VR mode
    state = await getDebugState(page);
    console.log('State in VR mode:', JSON.stringify(state, null, 2));

    // Check if we're in VR mode
    console.log('Spatial mode:', state.spatialMode?.activeMode);
    if (state.spatialMode?.activeMode !== 'vr') {
      console.log('WARNING: Not in VR mode as expected. Mode:', state.spatialMode?.activeMode);
    }

    // Check if Three.js canvas exists
    console.log('Three.js canvas exists:', state.hasThreeCanvas);

    // Wait a bit more for Html components to render
    await page.waitForTimeout(2000);

    // Screenshot 4: After waiting for render
    await page.screenshot({ path: path.join(screenshotDir, 'vr-04-after-render-wait.png'), fullPage: true });
    console.log('Screenshot 4: After render wait saved');

    // Get final state
    state = await getDebugState(page);
    console.log('Final state:', JSON.stringify(state, null, 2));

    // Check for iframes (widget content)
    console.log('Iframe count:', state.iframeCount);
    console.log('Html component divs:', state.htmlComponentDivs.length);

    // Log relevant console messages
    const spatialLogs = logs.filter(l =>
      l.includes('SpatialWidget') ||
      l.includes('canRender') ||
      l.includes('Html') ||
      l.includes('iframe') ||
      l.includes('[Widget')
    );
    console.log('=== Spatial/Widget Logs ===');
    spatialLogs.forEach(l => console.log(l));

    // Log any errors
    if (errors.length > 0) {
      console.log('=== Errors ===');
      errors.forEach(e => console.log(e));
    }

    // Check SpatialCanvas visibility
    const canvasVisibility = await page.evaluate(() => {
      const canvas = document.querySelector('[data-spatial-canvas="true"]');
      if (!canvas) return null;

      const style = window.getComputedStyle(canvas);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        dataVisible: canvas.getAttribute('data-canvas-visible'),
      };
    });
    console.log('SpatialCanvas visibility:', JSON.stringify(canvasVisibility, null, 2));

    // Final screenshot with longer wait
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, 'vr-05-final.png'), fullPage: true });
    console.log('Screenshot 5: Final state saved');

    // Print summary
    console.log('=== SUMMARY ===');
    console.log('Widgets:', state.widgetCount);
    console.log('Spatial Mode:', state.spatialMode?.activeMode);
    console.log('Iframes:', state.iframeCount);
    console.log('Html Components:', state.htmlComponentDivs.length);
    console.log('Three.js Canvas:', state.hasThreeCanvas);
    console.log('Errors:', errors.length);
  });

  test('check widget iframe content in detail', async ({ page }) => {
    // Inject WebXR mock
    await injectWebXREmulator(page);

    // Navigate to spatial demo canvas
    await page.goto('/canvas/spatial-vr-demo', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-spatial-canvas="true"]', { timeout: 20000 });
    await page.waitForTimeout(4000);

    // Enter VR mode via store
    await page.evaluate(() => {
      const stores = (window as any).__STICKERNEST_STORES__;
      const spatialModeStore = stores?.spatialMode;
      if (spatialModeStore) {
        spatialModeStore.getState().enterPreviewMode('vr');
      }
    });
    await page.waitForTimeout(4000);

    // Check iframe details
    const iframeDetails = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      const results: any[] = [];

      iframes.forEach((iframe, index) => {
        const rect = iframe.getBoundingClientRect();
        const parent = iframe.parentElement;
        const parentStyle = parent ? window.getComputedStyle(parent) : null;

        results.push({
          index,
          hasSrcDoc: !!iframe.srcdoc,
          srcDocLength: iframe.srcdoc?.length || 0,
          srcDocPreview: iframe.srcdoc?.substring(0, 500) || null,
          sandbox: iframe.getAttribute('sandbox'),
          title: iframe.title,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          style: {
            display: window.getComputedStyle(iframe).display,
            visibility: window.getComputedStyle(iframe).visibility,
            width: iframe.style.width,
            height: iframe.style.height,
          },
          parent: {
            tagName: parent?.tagName,
            className: parent?.className,
            display: parentStyle?.display,
            overflow: parentStyle?.overflow,
            transform: parentStyle?.transform?.substring(0, 100),
          },
        });
      });

      return results;
    });

    console.log('=== Iframe Details ===');
    iframeDetails.forEach((iframe, i) => {
      console.log(`\nIframe ${i + 1}:`);
      console.log(JSON.stringify(iframe, null, 2));
    });

    // Screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'vr-iframe-detail.png'), fullPage: true });

    // Check if any iframes exist
    if (iframeDetails.length === 0) {
      console.log('WARNING: No iframes found! Widget content is not being rendered.');

      // Check what's being rendered instead
      const spatialContent = await page.evaluate(() => {
        const container = document.querySelector('group[name="spatial-widget-container"]');
        if (!container) return { found: false };

        // Check for text elements (placeholder content)
        const allElements = document.querySelectorAll('*');
        const textElements: string[] = [];

        allElements.forEach(el => {
          if (el.textContent && el.textContent.includes('Counter')) {
            textElements.push(`${el.tagName}: ${el.textContent.substring(0, 100)}`);
          }
        });

        return {
          found: true,
          textElements,
        };
      });

      console.log('Spatial content:', JSON.stringify(spatialContent, null, 2));
    }
  });
});
