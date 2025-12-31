/**
 * VR Widget Glitch Diagnostic Test
 *
 * Tests specifically for the glitch when viewing widgets in 3D VR mode.
 * This test adds a widget to the canvas, enters VR preview mode, and
 * checks for common rendering issues.
 */
import { test, expect, Page } from '@playwright/test';

/**
 * Injects a WebXR polyfill for testing
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
        return {
          transform: {
            position: { x: 0, y: 1.6, z: 0, w: 1 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
            matrix: new Float32Array([
              1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.6, 0, 1
            ]),
            inverse: {
              matrix: new Float32Array([
                1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1.6, 0, 1
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
        this.startFrameLoop();
      }

      private startFrameLoop() {
        const loop = () => {
          if (this.ended) return;
          const frame = new MockXRFrame(this);
          this.animationCallbacks.forEach((callback) => {
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
        this.ended = true;
        this.animationCallbacks.clear();
        this.dispatchEvent(new Event('end'));
        return Promise.resolve();
      }

      requestReferenceSpace(type: string): Promise<MockXRReferenceSpace> {
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

      updateRenderState(_state: any) {}
    }

    const mockXR = {
      isSessionSupported: async (mode: string): Promise<boolean> => {
        return mode === 'immersive-vr' || mode === 'immersive-ar';
      },
      requestSession: async (mode: string, options?: any): Promise<MockXRSession> => {
        const session = new MockXRSession(mode);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('xrsessionstart', { detail: { mode, session } }));
        }, 100);
        return session;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    Object.defineProperty(navigator, 'xr', {
      value: mockXR,
      writable: true,
      configurable: true,
    });

    console.log('[WebXR Mock] Installed');
  });
}

/**
 * Add a widget to the canvas programmatically
 */
async function addTestWidget(page: Page) {
  return await page.evaluate(() => {
    // Access the canvas store to add a widget
    const canvasStore = (window as any).__STICKERNEST_STORES__?.canvas;
    if (!canvasStore) {
      console.log('[Test] Canvas store not found, trying direct DOM approach');
      return { success: false, error: 'Store not found' };
    }

    const state = canvasStore.getState();
    if (state && state.addWidget) {
      const widgetId = `test-widget-${Date.now()}`;
      state.addWidget({
        id: widgetId,
        widgetDefId: 'stickernest.basic-text',
        name: 'Test Widget',
        position: { x: 200, y: 200 },
        width: 300,
        height: 200,
        visible: true,
        state: { text: 'Hello VR!' },
      });
      console.log('[Test] Widget added:', widgetId);
      return { success: true, widgetId };
    }

    return { success: false, error: 'addWidget not found' };
  });
}

test.describe('VR Widget Glitch Diagnostic', () => {
  test.beforeEach(async ({ page }) => {
    await injectWebXREmulator(page);
  });

  test('diagnose widget rendering in VR mode', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
      errors.push(`[PAGE ERROR] ${error.message}`);
    });

    // Navigate to canvas page
    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('[data-spatial-canvas="true"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Try to add a test widget
    const addResult = await addTestWidget(page);
    console.log('Add widget result:', addResult);

    // Check widget count
    const widgetCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-widget-id]').length;
    });
    console.log('Widgets on canvas:', widgetCount);

    // Screenshot before VR
    await page.screenshot({ path: 'tests/screenshots/vr-glitch-01-before-vr.png' });

    // Click VR button
    const vrButton = page.locator('button:has-text("VR"), [role="radio"][aria-label*="VR"]').first();
    const vrButtonExists = await vrButton.count() > 0;
    console.log('VR button exists:', vrButtonExists);

    if (vrButtonExists) {
      await vrButton.click();
      console.log('Clicked VR button');
    }

    // Wait for VR mode transition
    await page.waitForTimeout(3000);

    // Screenshot after VR
    await page.screenshot({ path: 'tests/screenshots/vr-glitch-02-after-vr.png' });

    // Check spatial canvas state
    const canvasState = await page.evaluate(() => {
      const spatialCanvas = document.querySelector('[data-spatial-canvas="true"]');
      if (!spatialCanvas) return { exists: false };

      const style = window.getComputedStyle(spatialCanvas);
      const threeCanvas = spatialCanvas.querySelector('canvas');

      return {
        exists: true,
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
    console.log('=== Spatial Canvas State ===');
    console.log(JSON.stringify(canvasState, null, 2));

    // Check for Html components (widget content in 3D)
    const htmlComponents = await page.evaluate(() => {
      // Html component from drei creates div elements with specific transform styles
      const transformedDivs = document.querySelectorAll('div[style*="translate3d"]');
      const results: Array<{
        tagName: string;
        className: string;
        hasIframe: boolean;
        hasContent: boolean;
        transformStyle: string;
      }> = [];

      transformedDivs.forEach(div => {
        const iframe = div.querySelector('iframe');
        const style = div.getAttribute('style') || '';
        if (style.includes('translate3d') || style.includes('perspective')) {
          results.push({
            tagName: div.tagName,
            className: div.className,
            hasIframe: !!iframe,
            hasContent: div.children.length > 0,
            transformStyle: style.substring(0, 100),
          });
        }
      });

      return results;
    });
    console.log('=== Html Components (3D Widget Content) ===');
    console.log(JSON.stringify(htmlComponents, null, 2));

    // Check for any iframes and their state
    const iframeState = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      return Array.from(iframes).map(iframe => ({
        src: iframe.src || 'srcDoc',
        sandbox: iframe.sandbox?.value || iframe.getAttribute('sandbox'),
        width: iframe.width,
        height: iframe.height,
        isVisible: window.getComputedStyle(iframe).display !== 'none',
      }));
    });
    console.log('=== Iframes ===');
    console.log(JSON.stringify(iframeState, null, 2));

    // Check for specific error patterns in console logs
    const spatialErrors = logs.filter(l =>
      l.includes('error') ||
      l.includes('Error') ||
      l.includes('failed') ||
      l.includes('Failed')
    );
    console.log('=== Errors in Console ===');
    spatialErrors.forEach(e => console.log(e));

    // Check SpatialWidgetContainer rendering logs
    const widgetContainerLogs = logs.filter(l =>
      l.includes('SpatialWidgetContainer') ||
      l.includes('SpatialWidget') ||
      l.includes('Widget ')
    );
    console.log('=== Widget Container Logs ===');
    widgetContainerLogs.slice(-20).forEach(l => console.log(l));

    // Page errors
    if (errors.length > 0) {
      console.log('=== Page Errors ===');
      errors.forEach(e => console.log(e));
    }

    // Final state check
    const finalState = await page.evaluate(() => {
      return {
        widgetCount: document.querySelectorAll('[data-widget-id]').length,
        spatialWidgetGroups: document.querySelectorAll('group[name="spatial-widget-container"]').length,
        threeSceneExists: !!document.querySelector('canvas[data-engine*="three"]'),
        anyBlackScreen: Array.from(document.querySelectorAll('*')).some(el => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          return bg === 'rgb(0, 0, 0)' && el.clientWidth > 200 && el.clientHeight > 200;
        }),
      };
    });
    console.log('=== Final State ===');
    console.log(JSON.stringify(finalState, null, 2));
  });

  test('check Html component occlude behavior', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('[data-spatial-canvas="true"]', { timeout: 15000 });

    // Click VR
    await page.click('button:has-text("VR"), [role="radio"][aria-label*="VR"]');
    await page.waitForTimeout(3000);

    // Check if occlude is causing issues
    const occludeState = await page.evaluate(() => {
      // Look for any elements that might be occluded or have depth issues
      const canvas = document.querySelector('[data-spatial-canvas="true"] canvas');
      if (!canvas) return { canvasExists: false };

      // Check for WebGL context
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const hasDepthBuffer = gl ? gl.getParameter(gl.DEPTH_TEST) : false;

      return {
        canvasExists: true,
        hasDepthBuffer,
        canvasStyle: window.getComputedStyle(canvas).cssText.substring(0, 200),
      };
    });
    console.log('Occlude state:', occludeState);

    // Log any three.js related errors
    const threeErrors = logs.filter(l =>
      l.toLowerCase().includes('three') ||
      l.toLowerCase().includes('webgl') ||
      l.toLowerCase().includes('shader') ||
      l.toLowerCase().includes('html')
    );
    console.log('Three.js related logs:', threeErrors);
  });

  test('verify widget iframe sandbox permissions', async ({ page }) => {
    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('[data-spatial-canvas="true"]', { timeout: 15000 });

    // Check sandbox attributes
    const sandboxInfo = await page.evaluate(() => {
      // Find any iframes in spatial widget containers
      const iframes = document.querySelectorAll('iframe');
      return Array.from(iframes).map(iframe => {
        const sandbox = iframe.getAttribute('sandbox') || iframe.sandbox?.value;
        const parent = iframe.parentElement;
        const hasWidgetWrapper = parent?.closest('[data-widget-id]') !== null ||
                                  parent?.style.overflow === 'hidden';

        return {
          sandbox,
          hasWidgetWrapper,
          parentBg: parent ? window.getComputedStyle(parent).backgroundColor : null,
          iframeVisible: window.getComputedStyle(iframe).visibility !== 'hidden',
          iframeDisplay: window.getComputedStyle(iframe).display,
        };
      });
    });

    console.log('=== Iframe Sandbox Info ===');
    sandboxInfo.forEach((info, i) => {
      console.log(`Iframe ${i + 1}:`, info);
    });

    // The sandbox="allow-scripts" is restrictive - might need allow-same-origin for some widgets
    const restrictedIframes = sandboxInfo.filter(i => i.sandbox === 'allow-scripts');
    if (restrictedIframes.length > 0) {
      console.log('WARNING: Found iframes with restrictive sandbox (allow-scripts only)');
      console.log('This may cause widget content to not render properly in VR');
    }
  });
});
