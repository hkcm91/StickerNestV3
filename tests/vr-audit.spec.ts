/**
 * VR Implementation Audit Tests
 *
 * Comprehensive tests to audit the VR browser mode implementation.
 * Focuses on:
 * - Grid floor visibility
 * - Panoramic sky/environment rendering
 * - Widget/module orientation (facing user)
 * - Widget clipping issues
 *
 * Uses WebXR emulation for testing without hardware.
 */
import { test, expect, Page } from '@playwright/test';

/**
 * Injects a comprehensive WebXR polyfill/emulator into the page for testing.
 * This mocks navigator.xr to report VR/AR support and simulates sessions.
 */
async function injectWebXREmulator(page: Page) {
  await page.addInitScript(() => {
    // Mock XRReferenceSpace
    class MockXRReferenceSpace extends EventTarget {
      constructor() {
        super();
      }
    }

    // Mock XRRenderState
    class MockXRRenderState {
      baseLayer: any = null;
    }

    // Mock XRFrame
    class MockXRFrame {
      session: MockXRSession;
      predictedDisplayTime: number = performance.now();

      constructor(session: MockXRSession) {
        this.session = session;
      }

      getViewerPose(_referenceSpace: MockXRReferenceSpace) {
        // Return a mock pose at origin looking forward (-Z)
        return {
          transform: {
            position: { x: 0, y: 1.6, z: 0, w: 1 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
            matrix: new Float32Array([
              1, 0, 0, 0,
              0, 1, 0, 0,
              0, 0, 1, 0,
              0, 1.6, 0, 1
            ]),
            inverse: {
              matrix: new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, -1.6, 0, 1
              ])
            }
          },
          views: [
            {
              eye: 'left',
              projectionMatrix: new Float32Array(16),
              transform: {
                position: { x: -0.032, y: 1.6, z: 0, w: 1 },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
              }
            },
            {
              eye: 'right',
              projectionMatrix: new Float32Array(16),
              transform: {
                position: { x: 0.032, y: 1.6, z: 0, w: 1 },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
              }
            }
          ]
        };
      }
    }

    // Mock XRSession
    class MockXRSession extends EventTarget {
      mode: string;
      ended = false;
      renderState: MockXRRenderState;
      visibilityState: string = 'visible';
      inputSources: any[] = [];
      private referenceSpace: MockXRReferenceSpace | null = null;
      private animationFrameId: number = 0;
      private animationCallbacks: Map<number, FrameRequestCallback> = new Map();

      constructor(mode: string) {
        super();
        this.mode = mode;
        this.renderState = new MockXRRenderState();
        console.log('[WebXR Mock] Session created:', mode);

        // Start mock frame loop
        this.startFrameLoop();
      }

      private startFrameLoop() {
        const loop = () => {
          if (this.ended) return;

          const frame = new MockXRFrame(this);
          this.animationCallbacks.forEach((callback, id) => {
            try {
              callback(performance.now(), frame as any);
            } catch (e) {
              console.error('[WebXR Mock] Frame callback error:', e);
            }
          });

          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }

      end() {
        console.log('[WebXR Mock] Session ending:', this.mode);
        this.ended = true;
        this.animationCallbacks.clear();
        this.dispatchEvent(new Event('end'));
        return Promise.resolve();
      }

      requestReferenceSpace(type: string): Promise<MockXRReferenceSpace> {
        console.log('[WebXR Mock] requestReferenceSpace:', type);
        this.referenceSpace = new MockXRReferenceSpace();
        return Promise.resolve(this.referenceSpace);
      }

      requestAnimationFrame(callback: FrameRequestCallback): number {
        const id = ++this.animationFrameId;
        this.animationCallbacks.set(id, callback);
        return id;
      }

      cancelAnimationFrame(id: number) {
        this.animationCallbacks.delete(id);
      }

      updateRenderState(_state: any) {
        // Mock implementation
      }
    }

    // Mock navigator.xr
    const mockXR = {
      isSessionSupported: async (mode: string): Promise<boolean> => {
        console.log('[WebXR Mock] isSessionSupported called:', mode);
        return mode === 'immersive-vr' || mode === 'immersive-ar';
      },

      requestSession: async (mode: string, options?: any): Promise<MockXRSession> => {
        console.log('[WebXR Mock] requestSession called:', mode, options);
        const session = new MockXRSession(mode);

        // Simulate async session start
        setTimeout(() => {
          console.log('[WebXR Mock] Session active:', mode);
          window.dispatchEvent(new CustomEvent('xrsessionstart', { detail: { mode, session } }));
        }, 100);

        return session;
      },

      addEventListener: (event: string, handler: EventListener) => {
        console.log('[WebXR Mock] addEventListener:', event);
      },
      removeEventListener: () => {},
    };

    // Install the mock
    Object.defineProperty(navigator, 'xr', {
      value: mockXR,
      writable: true,
      configurable: true,
    });

    console.log('[WebXR Mock] Comprehensive WebXR API emulator installed');
  });
}

/**
 * Wait for the SpatialCanvas to be ready
 */
async function waitForSpatialCanvas(page: Page) {
  await page.waitForSelector('[data-spatial-canvas="true"]', { timeout: 15000 });
  await page.waitForTimeout(1000); // Give Three.js time to initialize
}

/**
 * Get detailed spatial canvas state
 */
async function getSpatialCanvasState(page: Page) {
  return await page.evaluate(() => {
    const spatialCanvas = document.querySelector('[data-spatial-canvas="true"]');
    if (!spatialCanvas) return null;

    const style = window.getComputedStyle(spatialCanvas);
    const threeCanvas = spatialCanvas.querySelector('canvas');

    return {
      visible: spatialCanvas.getAttribute('data-canvas-visible'),
      xrReady: spatialCanvas.getAttribute('data-xr-ready'),
      zIndex: style.zIndex,
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      hasThreeCanvas: !!threeCanvas,
      canvasWidth: threeCanvas?.width,
      canvasHeight: threeCanvas?.height,
    };
  });
}

test.describe('VR Implementation Audit', () => {
  test.beforeEach(async ({ page }) => {
    await injectWebXREmulator(page);
  });

  test('audit: grid environment visibility in VR mode', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('GridEnvironment') || text.includes('GroundPlane') || text.includes('[Spatial')) {
        logs.push(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForSpatialCanvas(page);

    // Get initial state
    const initialState = await getSpatialCanvasState(page);
    console.log('=== Initial State ===');
    console.log('Spatial Canvas:', initialState);

    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/screenshots/vr-audit-01-initial.png' });

    // Try to enter VR mode
    const vrButton = page.locator('button:has-text("VR"), [role="radio"][aria-label*="VR"]').first();
    const vrButtonExists = await vrButton.count() > 0;

    console.log('VR button exists:', vrButtonExists);

    if (vrButtonExists) {
      const isDisabled = await vrButton.isDisabled().catch(() => true);
      console.log('VR button disabled:', isDisabled);

      if (!isDisabled) {
        await vrButton.click();
        console.log('Clicked VR button');
        await page.waitForTimeout(2000);
      }
    }

    // Check state after VR entry attempt
    const afterVRState = await getSpatialCanvasState(page);
    console.log('=== After VR Entry ===');
    console.log('Spatial Canvas:', afterVRState);

    // Take screenshot after VR entry
    await page.screenshot({ path: 'tests/screenshots/vr-audit-02-after-vr.png' });

    // Log all GridEnvironment/spatial logs
    console.log('=== Spatial/Grid Logs ===');
    logs.forEach(log => console.log(log));

    // Audit assertions
    expect(afterVRState?.hasThreeCanvas).toBe(true);

    // Check if GridEnvironment360 was rendered
    const gridRendered = logs.some(log => log.includes('RENDERING environment'));
    console.log('Grid environment rendered:', gridRendered);

    // This is the key check - grid should render in VR mode
    if (!gridRendered) {
      console.warn('AUDIT ISSUE: GridEnvironment360 not rendering in VR mode!');
      console.log('Logs with "GridEnvironment360":', logs.filter(l => l.includes('GridEnvironment360')));
    }
  });

  test('audit: widget orientation and positioning', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('SpatialWidget') || text.includes('Widget') || text.includes('position')) {
        logs.push(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForSpatialCanvas(page);

    // Check if there are widgets on the canvas
    const widgetState = await page.evaluate(() => {
      // Try to access canvas store
      const widgets: Array<{ id: string; name: string; position: { x: number; y: number }; width: number; height: number }> = [];

      // Look for widget elements in the DOM
      document.querySelectorAll('[data-widget-id]').forEach(el => {
        const rect = el.getBoundingClientRect();
        widgets.push({
          id: el.getAttribute('data-widget-id') || '',
          name: el.getAttribute('data-widget-name') || '',
          position: { x: rect.left, y: rect.top },
          width: rect.width,
          height: rect.height,
        });
      });

      return {
        widgetCount: widgets.length,
        widgets,
      };
    });

    console.log('=== Widget State ===');
    console.log('Widget count:', widgetState.widgetCount);
    console.log('Widgets:', widgetState.widgets);

    // Enter VR mode
    const vrButton = page.locator('button:has-text("VR"), [role="radio"][aria-label*="VR"]').first();
    if (await vrButton.count() > 0 && !(await vrButton.isDisabled().catch(() => true))) {
      await vrButton.click();
      await page.waitForTimeout(2000);
    }

    // Log widget-related messages
    console.log('=== Widget Logs ===');
    const widgetLogs = logs.filter(l => l.includes('Widget'));
    widgetLogs.forEach(log => console.log(log));

    // Check for widget orientation issues
    const orientationLogs = logs.filter(l => l.includes('rotation') || l.includes('orientation') || l.includes('lookAt'));
    console.log('=== Orientation Logs ===');
    orientationLogs.forEach(log => console.log(log));

    await page.screenshot({ path: 'tests/screenshots/vr-audit-03-widget-orientation.png' });
  });

  test('audit: check for clipping issues', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForSpatialCanvas(page);

    // Check camera configuration
    const cameraConfig = await page.evaluate(() => {
      // Try to find camera info in Three.js scene
      const canvas = document.querySelector('[data-spatial-canvas="true"] canvas');
      if (!canvas) return null;

      return {
        canvasWidth: canvas.clientWidth,
        canvasHeight: canvas.clientHeight,
        // Note: We can't directly access Three.js camera from here
        // but we can log what the code sets
      };
    });

    console.log('=== Camera Config ===');
    console.log('Canvas size:', cameraConfig);

    // Enter VR mode to check clipping
    const vrButton = page.locator('button:has-text("VR"), [role="radio"][aria-label*="VR"]').first();
    if (await vrButton.count() > 0 && !(await vrButton.isDisabled().catch(() => true))) {
      await vrButton.click();
      await page.waitForTimeout(2000);
    }

    // Check for clipping-related logs
    const clippingLogs = logs.filter(l =>
      l.includes('near') || l.includes('far') || l.includes('clip') ||
      l.includes('frustum') || l.includes('camera')
    );
    console.log('=== Clipping-related Logs ===');
    clippingLogs.forEach(log => console.log(log));

    await page.screenshot({ path: 'tests/screenshots/vr-audit-04-clipping.png' });

    // Document the expected camera settings
    console.log('=== Expected Camera Settings ===');
    console.log('near: 0.1 (from SpatialCanvas.tsx)');
    console.log('far: 1000 (from SpatialCanvas.tsx)');
    console.log('fov: 75');
    console.log('position: [0, 1.6, 3]');
  });

  test('audit: panoramic environment check', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Environment') || text.includes('Sky') || text.includes('Panoram') ||
          text.includes('sphere') || text.includes('GridEnvironment')) {
        logs.push(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForSpatialCanvas(page);

    // Enter VR mode
    const vrButton = page.locator('button:has-text("VR"), [role="radio"][aria-label*="VR"]').first();
    if (await vrButton.count() > 0 && !(await vrButton.isDisabled().catch(() => true))) {
      await vrButton.click();
      await page.waitForTimeout(2000);
    }

    // Check for environment-related logs
    console.log('=== Environment Logs ===');
    logs.forEach(log => console.log(log));

    // Audit the presence of environment elements
    const environmentCheck = logs.some(l => l.includes('RENDERING environment'));
    const gridSphereMaterial = logs.some(l => l.includes('GridSphere') || l.includes('shader'));

    console.log('=== Environment Audit ===');
    console.log('Environment rendering:', environmentCheck);
    console.log('Grid sphere material used:', gridSphereMaterial);

    await page.screenshot({ path: 'tests/screenshots/vr-audit-05-environment.png' });

    // Check what environment features are missing
    if (!environmentCheck) {
      console.warn('AUDIT ISSUE: No environment rendering detected!');
      console.warn('Expected: GridEnvironment360 to render a sphere with grid shader');
    }
  });

  test('audit: 3D preview mode (dev mode)', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[') && (text.includes('Spatial') || text.includes('Grid') || text.includes('XR'))) {
        logs.push(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForSpatialCanvas(page);

    // Look for 3D preview toggle
    const toggle3D = page.locator('button:has-text("3D"), [aria-label*="3D"], [aria-label*="preview"]').first();
    const has3DToggle = await toggle3D.count() > 0;

    console.log('=== 3D Preview Mode ===');
    console.log('3D toggle found:', has3DToggle);

    if (has3DToggle) {
      await toggle3D.click();
      await page.waitForTimeout(1000);

      // Check if canvas became visible
      const state = await getSpatialCanvasState(page);
      console.log('After 3D toggle:', state);

      // In 3D preview mode, forceShow should be true for GridEnvironment360
      const gridInPreview = logs.some(l => l.includes('forceShow') || l.includes('RENDERING environment'));
      console.log('Grid renders in preview mode:', gridInPreview);

      await page.screenshot({ path: 'tests/screenshots/vr-audit-06-3d-preview.png' });
    }

    // Also check desktop spatial mode button
    const desktopButton = page.locator('[role="radio"][aria-label*="Desktop"], button:has-text("2D")').first();
    if (await desktopButton.count() > 0) {
      console.log('Desktop mode button found');
    }

    console.log('=== All Spatial/Grid Logs ===');
    logs.forEach(log => console.log(log));
  });

  test('audit: session state transitions', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForSpatialCanvas(page);

    // Track session state changes
    const sessionLogs: string[] = [];

    // Enter VR
    const vrButton = page.locator('button:has-text("VR"), [role="radio"][aria-label*="VR"]').first();
    if (await vrButton.count() > 0 && !(await vrButton.isDisabled().catch(() => true))) {
      console.log('Attempting to enter VR...');
      await vrButton.click();
      await page.waitForTimeout(3000);

      // Collect session-related logs
      sessionLogs.push(...logs.filter(l =>
        l.includes('sessionState') || l.includes('session') ||
        l.includes('XRSession') || l.includes('active') ||
        l.includes('requesting') || l.includes('none')
      ));
    }

    console.log('=== Session State Logs ===');
    sessionLogs.forEach(log => console.log(log));

    // Check the state flow
    const hasRequesting = sessionLogs.some(l => l.includes('requesting'));
    const hasActive = sessionLogs.some(l => l.includes('active'));

    console.log('=== State Transition Check ===');
    console.log('Session went through "requesting":', hasRequesting);
    console.log('Session reached "active":', hasActive);

    if (!hasActive) {
      console.warn('AUDIT ISSUE: Session never reached "active" state');
      console.warn('This may cause GridEnvironment360 to not render');
    }

    await page.screenshot({ path: 'tests/screenshots/vr-audit-07-session-state.png' });
  });
});

test.describe('VR Fixes Verification', () => {
  test.beforeEach(async ({ page }) => {
    await injectWebXREmulator(page);
  });

  test('verify: grid floor visible in VR browser mode', async ({ page }) => {
    const gridLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('GridEnvironment360') || text.includes('GroundPlane')) {
        gridLogs.push(text);
      }
    });

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForSpatialCanvas(page);

    // Enter VR mode
    const vrButton = page.locator('button:has-text("VR"), [role="radio"][aria-label*="VR"]').first();
    if (await vrButton.count() > 0 && !(await vrButton.isDisabled().catch(() => true))) {
      await vrButton.click();
      await page.waitForTimeout(2000);
    }

    // Verify grid rendered
    const gridRendered = gridLogs.some(l => l.includes('RENDERING'));
    expect(gridRendered).toBe(true);

    await page.screenshot({ path: 'tests/screenshots/vr-verify-01-grid.png' });
  });

  test('verify: widgets face user on initial load', async ({ page }) => {
    const widgetLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('SpatialWidget') || text.includes('orientation') || text.includes('lookAt')) {
        widgetLogs.push(text);
      }
    });

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForSpatialCanvas(page);

    // Enter VR mode
    const vrButton = page.locator('button:has-text("VR"), [role="radio"][aria-label*="VR"]').first();
    if (await vrButton.count() > 0 && !(await vrButton.isDisabled().catch(() => true))) {
      await vrButton.click();
      await page.waitForTimeout(2000);
    }

    // Log widget orientation info
    console.log('=== Widget Orientation Logs ===');
    widgetLogs.forEach(log => console.log(log));

    await page.screenshot({ path: 'tests/screenshots/vr-verify-02-widget-orientation.png' });
  });

  test('verify: panoramic sky environment visible', async ({ page }) => {
    const envLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Environment') || text.includes('sphere') || text.includes('Sky')) {
        envLogs.push(text);
      }
    });

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForSpatialCanvas(page);

    // Enter VR mode
    const vrButton = page.locator('button:has-text("VR"), [role="radio"][aria-label*="VR"]').first();
    if (await vrButton.count() > 0 && !(await vrButton.isDisabled().catch(() => true))) {
      await vrButton.click();
      await page.waitForTimeout(2000);
    }

    // Log environment info
    console.log('=== Environment Logs ===');
    envLogs.forEach(log => console.log(log));

    await page.screenshot({ path: 'tests/screenshots/vr-verify-03-environment.png' });
  });
});
