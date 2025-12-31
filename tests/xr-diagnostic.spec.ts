/**
 * XR Diagnostic Test
 *
 * Tests to diagnose why VR/AR modes show blank canvases.
 * This test uses the WebXR emulator to simulate XR sessions.
 */

import { test, expect } from '@playwright/test';

test.describe('XR Mode Diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the canvas page
    await page.goto('/canvas');
    await page.waitForLoadState('networkidle');

    // Wait for the app to be ready
    await page.waitForSelector('[data-spatial-canvas="true"]', { timeout: 10000 });
  });

  test('diagnose spatial canvas state', async ({ page }) => {
    // Check initial state
    const spatialCanvas = page.locator('[data-spatial-canvas="true"]');
    await expect(spatialCanvas).toBeVisible();

    // Get canvas attributes
    const canvasVisible = await spatialCanvas.getAttribute('data-canvas-visible');
    const xrReady = await spatialCanvas.getAttribute('data-xr-ready');

    console.log('=== Initial State ===');
    console.log('Canvas visible:', canvasVisible);
    console.log('XR ready:', xrReady);

    // Check if XR buttons exist
    const vrButton = page.locator('button:has-text("Enter VR")');
    const arButton = page.locator('button:has-text("Enter AR")');

    const vrButtonExists = await vrButton.count() > 0;
    const arButtonExists = await arButton.count() > 0;

    console.log('VR button exists:', vrButtonExists);
    console.log('AR button exists:', arButtonExists);

    // Check button states
    if (vrButtonExists) {
      const vrDisabled = await vrButton.isDisabled();
      const vrTitle = await vrButton.getAttribute('title');
      console.log('VR button disabled:', vrDisabled);
      console.log('VR button title:', vrTitle);
    }

    if (arButtonExists) {
      const arDisabled = await arButton.isDisabled();
      const arTitle = await arButton.getAttribute('title');
      console.log('AR button disabled:', arDisabled);
      console.log('AR button title:', arTitle);
    }

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/xr-diagnostic-01-initial.png' });

    // Check console logs for spatial state
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Spatial') || msg.text().includes('[XR')) {
        consoleLogs.push(msg.text());
      }
    });

    // Wait a moment for any async operations
    await page.waitForTimeout(1000);

    console.log('=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
  });

  test('check 3D preview mode', async ({ page }) => {
    // Look for a 3D preview toggle or button
    const toggle3D = page.locator('button:has-text("3D"), [data-testid="3d-toggle"], .spatial-mode-toggle');

    console.log('=== 3D Preview Mode ===');
    const toggle3DExists = await toggle3D.first().count() > 0;
    console.log('3D toggle exists:', toggle3DExists);

    if (toggle3DExists) {
      // Click to enable 3D preview
      await toggle3D.first().click();
      await page.waitForTimeout(500);

      // Check if canvas became visible
      const spatialCanvas = page.locator('[data-spatial-canvas="true"]');
      const canvasVisible = await spatialCanvas.getAttribute('data-canvas-visible');
      console.log('Canvas visible after toggle:', canvasVisible);

      await page.screenshot({ path: 'tests/screenshots/xr-diagnostic-02-3d-preview.png' });
    }

    // Check what's in the DOM for the 3D canvas
    const canvasElement = await page.evaluate(() => {
      const canvas = document.querySelector('[data-spatial-canvas="true"]');
      if (!canvas) return null;

      const style = window.getComputedStyle(canvas);
      const threejsCanvas = canvas.querySelector('canvas');

      return {
        zIndex: style.zIndex,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        width: style.width,
        height: style.height,
        hasThreeCanvas: !!threejsCanvas,
        threeCanvasWidth: threejsCanvas?.width,
        threeCanvasHeight: threejsCanvas?.height,
      };
    });

    console.log('Canvas element state:', canvasElement);
  });

  test('inspect widget store state', async ({ page }) => {
    // Get the widget store state
    const widgetState = await page.evaluate(() => {
      // Try to access Zustand stores through window
      const win = window as any;

      // Check if stores are exposed
      const stores: Record<string, any> = {};

      // Try React DevTools approach
      const root = document.getElementById('root');
      if (root) {
        const fiberKey = Object.keys(root).find(key => key.startsWith('__reactFiber'));
        if (fiberKey) {
          stores.hasFiber = true;
        }
      }

      return {
        stores,
        documentTitle: document.title,
        pathname: window.location.pathname,
      };
    });

    console.log('=== Widget Store State ===');
    console.log('State:', widgetState);
  });

  test('simulate XR session with emulator', async ({ page }) => {
    // This test checks what happens when we try to enter XR
    // It won't actually enter XR without the emulator, but we can check the flow

    console.log('=== XR Session Simulation ===');

    // Listen for console messages
    const xrLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('XR') || text.includes('Spatial') || text.includes('session')) {
        xrLogs.push(`[${msg.type()}] ${text}`);
      }
    });

    // Check if VR button is available and try to click it
    const vrButton = page.locator('button:has-text("Enter VR")');
    const isEnabled = await vrButton.isEnabled().catch(() => false);

    if (isEnabled) {
      console.log('Attempting to enter VR...');

      // Click VR button
      await vrButton.click();

      // Wait for any state changes
      await page.waitForTimeout(2000);

      // Check for error messages or state changes
      const errorMessage = page.locator('[style*="background: rgba(239, 68, 68"]');
      const hasError = await errorMessage.count() > 0;

      if (hasError) {
        const errorText = await errorMessage.textContent();
        console.log('Error message:', errorText);
      }

      // Check canvas state after attempt
      const spatialCanvas = page.locator('[data-spatial-canvas="true"]');
      const canvasVisible = await spatialCanvas.getAttribute('data-canvas-visible');
      console.log('Canvas visible after VR attempt:', canvasVisible);
    } else {
      console.log('VR button is disabled - likely no XR support detected');
    }

    console.log('=== XR Console Logs ===');
    xrLogs.forEach(log => console.log(log));

    await page.screenshot({ path: 'tests/screenshots/xr-diagnostic-03-after-vr-attempt.png' });
  });

  test('check spatial mode store from console', async ({ page }) => {
    // Inject a diagnostic script to read spatial mode store
    const spatialState = await page.evaluate(() => {
      // Try to find the spatial mode store in React's internals
      // This is a diagnostic approach

      return new Promise((resolve) => {
        // Check WebXR availability
        const xrInfo = {
          webXRAvailable: !!navigator.xr,
          vrSupported: false,
          arSupported: false,
        };

        if (navigator.xr) {
          Promise.all([
            navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
            navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
          ]).then(([vr, ar]) => {
            xrInfo.vrSupported = vr;
            xrInfo.arSupported = ar;
            resolve(xrInfo);
          });
        } else {
          resolve(xrInfo);
        }
      });
    });

    console.log('=== WebXR Capabilities ===');
    console.log('Capabilities:', spatialState);
  });
});
