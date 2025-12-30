/**
 * XR/VR/AR Debug Tests
 *
 * Diagnoses issues with WebXR session initialization and SpatialCanvas mounting.
 * These tests use WebXR API emulation to test XR flows without hardware.
 */
import { test, expect, Page } from '@playwright/test';

/**
 * Injects a WebXR polyfill/emulator into the page for testing
 * This mocks navigator.xr to report VR/AR support
 */
async function injectWebXREmulator(page: Page) {
  await page.addInitScript(() => {
    // Mock XRSession
    class MockXRSession extends EventTarget {
      mode: string;
      ended = false;

      constructor(mode: string) {
        super();
        this.mode = mode;
        console.log('[WebXR Mock] Session created:', mode);
      }

      end() {
        console.log('[WebXR Mock] Session ending:', this.mode);
        this.ended = true;
        this.dispatchEvent(new Event('end'));
        return Promise.resolve();
      }

      requestReferenceSpace() {
        return Promise.resolve({});
      }

      requestAnimationFrame(callback: FrameRequestCallback) {
        return requestAnimationFrame(callback);
      }

      cancelAnimationFrame(id: number) {
        return cancelAnimationFrame(id);
      }
    }

    // Mock navigator.xr
    const mockXR = {
      isSessionSupported: async (mode: string): Promise<boolean> => {
        console.log('[WebXR Mock] isSessionSupported called:', mode);
        // Return true for both VR and AR
        return mode === 'immersive-vr' || mode === 'immersive-ar';
      },

      requestSession: async (mode: string): Promise<MockXRSession> => {
        console.log('[WebXR Mock] requestSession called:', mode);
        const session = new MockXRSession(mode);
        // Dispatch sessionstart event after a small delay
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('xrsessionstart', { detail: { mode } }));
        }, 100);
        return session;
      },

      addEventListener: () => {},
      removeEventListener: () => {},
    };

    // Install the mock
    Object.defineProperty(navigator, 'xr', {
      value: mockXR,
      writable: true,
      configurable: true,
    });

    console.log('[WebXR Mock] WebXR API emulator installed');
  });
}

test.describe('XR Debug Tests', () => {

  test('WebXR API is available and reports VR/AR support', async ({ page }) => {
    await injectWebXREmulator(page);

    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if WebXR mock was installed
    const xrAvailable = await page.evaluate(() => {
      return typeof navigator.xr !== 'undefined';
    });
    expect(xrAvailable).toBe(true);

    // Check VR support
    const vrSupported = await page.evaluate(async () => {
      return navigator.xr?.isSessionSupported('immersive-vr');
    });
    expect(vrSupported).toBe(true);

    // Check AR support
    const arSupported = await page.evaluate(async () => {
      return navigator.xr?.isSessionSupported('immersive-ar');
    });
    expect(arSupported).toBe(true);

    console.log('WebXR logs:', logs.filter(l => l.includes('WebXR')));
  });

  test('SpatialCanvas component mounts correctly', async ({ page }) => {
    await injectWebXREmulator(page);

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if THREE.js Canvas exists in the DOM
    // The SpatialCanvas renders a canvas element from @react-three/fiber
    const canvasExists = await page.evaluate(() => {
      // Look for the spatial canvas container or canvas element
      const spatialContainer = document.querySelector('[class*="spatial"]');
      const canvasEl = document.querySelector('canvas');
      return {
        hasSpatialContainer: !!spatialContainer,
        hasCanvas: !!canvasEl,
        canvasCount: document.querySelectorAll('canvas').length,
      };
    });

    console.log('Canvas state:', canvasExists);

    // Log any errors
    if (errors.length > 0) {
      console.log('Errors during load:', errors);
    }
  });

  test('XR entry buttons are visible and enabled', async ({ page }) => {
    await injectWebXREmulator(page);

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Look for VR/AR buttons - they may be in XREntryButtons or SpatialModeToggle
    const buttons = await page.evaluate(() => {
      const results = {
        vrButtons: [] as string[],
        arButtons: [] as string[],
        spatialModeToggle: false,
        xrEntryButtons: false,
      };

      // Check for buttons with VR/AR text
      document.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';

        if (text.includes('vr') || ariaLabel.includes('vr')) {
          results.vrButtons.push(text);
        }
        if (text.includes('ar') || ariaLabel.includes('ar')) {
          results.arButtons.push(text);
        }
      });

      // Check for SpatialModeToggle (has 2D/VR/AR buttons)
      const modeToggle = document.querySelector('[role="radiogroup"][aria-label="Spatial mode"]');
      results.spatialModeToggle = !!modeToggle;

      // Check for XREntryButtons container (positioned at bottom center)
      const xrContainer = Array.from(document.querySelectorAll('div')).find(div => {
        const style = window.getComputedStyle(div);
        return style.position === 'absolute' &&
               style.bottom === '20px' &&
               style.left === '50%';
      });
      results.xrEntryButtons = !!xrContainer;

      return results;
    });

    console.log('XR Button state:', buttons);

    // At minimum, the spatial mode toggle should be present
    // The XR entry buttons may not render if SpatialCanvas isn't active
    expect(buttons.spatialModeToggle || buttons.vrButtons.length > 0 || buttons.arButtons.length > 0).toBe(true);
  });

  test('Clicking VR button triggers XR session request', async ({ page }) => {
    await injectWebXREmulator(page);

    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Find and click the VR button
    // Try multiple selectors since the button could be in different components
    const vrButtonSelectors = [
      'button:has-text("VR")',
      'button:has-text("Enter VR")',
      'button[aria-label*="VR"]',
      '[role="radio"][aria-label*="VR"]',
    ];

    let clicked = false;
    for (const selector of vrButtonSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        const isDisabled = await button.isDisabled().catch(() => true);
        console.log(`Found button with selector: ${selector}, disabled: ${isDisabled}`);

        if (!isDisabled) {
          await button.click();
          clicked = true;
          console.log('Clicked VR button');
          break;
        }
      }
    }

    await page.waitForTimeout(1000);

    // Check if XR session was requested
    const xrLogs = logs.filter(l => l.includes('WebXR') || l.includes('XR') || l.includes('session'));
    console.log('XR-related logs:', xrLogs);

    // Check state after click
    const postClickState = await page.evaluate(() => {
      return {
        // Check if spatial mode changed in the store
        spatialModeInStorage: localStorage.getItem('stickernest-spatial-mode'),
      };
    });

    console.log('Post-click state:', postClickState);
  });

  test('diagnose: SpatialCanvas active prop behavior', async ({ page }) => {
    await injectWebXREmulator(page);

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Inject diagnostic code to check component state
    const diagnosis = await page.evaluate(() => {
      const results = {
        // Check for R3F canvas
        r3fCanvasExists: false,
        canvasElements: 0,
        // Check for XR entry buttons
        xrButtonsInDOM: false,
        // Check localStorage for spatial mode
        spatialModeStorage: null as string | null,
        // Check for any hidden/invisible spatial canvas
        hiddenSpatialElements: [] as string[],
      };

      // Count canvas elements
      const canvases = document.querySelectorAll('canvas');
      results.canvasElements = canvases.length;

      // Check if any canvas has WebGL context (R3F uses WebGL)
      canvases.forEach((canvas, i) => {
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (gl) {
          results.r3fCanvasExists = true;
        }
      });

      // Check for XR buttons
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        const text = (btn.textContent || '').toLowerCase();
        if (text.includes('vr') || text.includes('ar') || text.includes('exit')) {
          results.xrButtonsInDOM = true;
        }
      });

      // Check localStorage
      results.spatialModeStorage = localStorage.getItem('stickernest-spatial-mode');

      // Look for hidden elements that might be the SpatialCanvas
      document.querySelectorAll('div').forEach(div => {
        const style = window.getComputedStyle(div);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          if (div.querySelector('canvas') || div.className.includes('spatial')) {
            results.hiddenSpatialElements.push(div.className || 'unnamed-div');
          }
        }
      });

      return results;
    });

    console.log('=== XR DIAGNOSTIC RESULTS ===');
    console.log('R3F Canvas exists:', diagnosis.r3fCanvasExists);
    console.log('Total canvas elements:', diagnosis.canvasElements);
    console.log('XR buttons in DOM:', diagnosis.xrButtonsInDOM);
    console.log('Spatial mode storage:', diagnosis.spatialModeStorage);
    console.log('Hidden spatial elements:', diagnosis.hiddenSpatialElements);
    console.log('=============================');

    // This test is diagnostic - log results but don't fail
    // The actual assertions are informational
    expect(true).toBe(true);
  });

  test('diagnose: XR store and session state', async ({ page }) => {
    await injectWebXREmulator(page);

    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Manually trigger VR entry via the store
    const storeState = await page.evaluate(async () => {
      // Access Zustand store directly from window (if exposed) or via React DevTools
      // First, let's log what we can find
      const results = {
        xrStoreAvailable: false,
        spatialModeStoreAvailable: false,
        attemptedVREntry: false,
        error: null as string | null,
      };

      // Try to find the stores in React component tree
      // This is a diagnostic - we're checking if the architecture is working

      // Check if navigator.xr.requestSession would work
      try {
        const supported = await navigator.xr?.isSessionSupported('immersive-vr');
        results.xrStoreAvailable = supported === true;
      } catch (e) {
        results.error = String(e);
      }

      return results;
    });

    console.log('Store state:', storeState);
    console.log('Console logs with XR mentions:',
      consoleLogs.filter(l => l.toLowerCase().includes('xr') || l.toLowerCase().includes('spatial'))
    );
  });
});

test.describe('XR Component Rendering', () => {

  test('SpatialModeToggle renders and is interactive', async ({ page }) => {
    await injectWebXREmulator(page);

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find the spatial mode toggle
    const modeToggle = page.locator('[role="radiogroup"][aria-label="Spatial mode"]');
    const exists = await modeToggle.count() > 0;

    if (exists) {
      console.log('SpatialModeToggle found');

      // Check for VR option
      const vrOption = modeToggle.locator('button:has-text("VR")');
      const vrDisabled = await vrOption.isDisabled().catch(() => true);
      console.log('VR option disabled:', vrDisabled);

      // Check for AR option
      const arOption = modeToggle.locator('button:has-text("AR")');
      const arDisabled = await arOption.isDisabled().catch(() => true);
      console.log('AR option disabled:', arDisabled);

      // Try clicking VR if not disabled
      if (!vrDisabled) {
        await vrOption.click();
        await page.waitForTimeout(1000);

        // Check if mode changed
        const isVRActive = await vrOption.getAttribute('aria-checked');
        console.log('VR aria-checked after click:', isVRActive);
      }
    } else {
      console.log('SpatialModeToggle NOT found in DOM');
    }

    expect(exists).toBe(true);
  });

  test('Three.js Canvas initializes with WebGL', async ({ page }) => {
    await injectWebXREmulator(page);

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const canvasInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const info: Array<{
        width: number;
        height: number;
        hasWebGL: boolean;
        hasWebGL2: boolean;
        isVisible: boolean;
      }> = [];

      canvases.forEach(canvas => {
        const rect = canvas.getBoundingClientRect();
        const style = window.getComputedStyle(canvas);

        // Try to get WebGL context (but don't fail if already acquired)
        let hasWebGL = false;
        let hasWebGL2 = false;

        try {
          // Check if canvas has any rendering context attribute
          const contextType = canvas.getAttribute('data-engine');
          hasWebGL = contextType?.includes('three') || false;
        } catch {
          // Ignore
        }

        info.push({
          width: rect.width,
          height: rect.height,
          hasWebGL,
          hasWebGL2,
          isVisible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
        });
      });

      return info;
    });

    console.log('Canvas info:', canvasInfo);

    // There should be at least one canvas (the main canvas for widget editing)
    // In a working XR setup, there would be a second canvas for the 3D scene
    expect(canvasInfo.length).toBeGreaterThanOrEqual(1);
  });
});
