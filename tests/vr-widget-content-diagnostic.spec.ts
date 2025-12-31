/**
 * VR Widget Content Diagnostic Test
 *
 * Tests specifically for widget content rendering inside 3D panels.
 */
import { test, expect, Page } from '@playwright/test';

async function injectWebXREmulator(page: Page) {
  await page.addInitScript(() => {
    const mockXR = {
      isSessionSupported: async (mode: string) => mode === 'immersive-vr' || mode === 'immersive-ar',
      requestSession: async (mode: string) => {
        throw new Error('Mock XR - entering preview mode');
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    Object.defineProperty(navigator, 'xr', { value: mockXR, writable: true, configurable: true });
  });
}

test.describe('VR Widget Content Diagnostic', () => {
  test('diagnose widget content in VR panels', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

    await injectWebXREmulator(page);
    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('[data-spatial-canvas="true"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Check what widgets exist on the canvas
    const canvasState = await page.evaluate(() => {
      const stores = (window as any).__STICKERNEST_STORES__;
      const canvasStore = stores?.canvas;
      if (!canvasStore) return { error: 'Canvas store not found' };

      const state = canvasStore.getState();
      const widgets = Array.from(state.widgets?.values() || []);

      return {
        widgetCount: widgets.length,
        widgets: widgets.map((w: any) => ({
          id: w.id,
          widgetDefId: w.widgetDefId,
          name: w.name,
          visible: w.visible,
          width: w.width,
          height: w.height,
          hasMetadata: !!w.metadata,
          metadataSource: w.metadata?.source,
          hasGeneratedContent: !!w.metadata?.generatedContent,
          hasHtml: !!w.metadata?.generatedContent?.html,
        })),
      };
    });

    console.log('=== Canvas State ===');
    console.log(JSON.stringify(canvasState, null, 2));

    // Click VR button
    await page.click('button:has-text("VR"), [role="radio"]:has-text("VR")');
    await page.waitForTimeout(3000);

    // Check spatial mode
    const spatialState = await page.evaluate(() => {
      const stores = (window as any).__STICKERNEST_STORES__;
      const spatialStore = stores?.spatialMode;
      if (!spatialStore) return { error: 'Spatial mode store not found' };

      const state = spatialStore.getState();
      return {
        activeMode: state.activeMode,
        sessionState: state.sessionState,
        targetMode: state.targetMode,
      };
    });
    console.log('=== Spatial Mode State ===');
    console.log(JSON.stringify(spatialState, null, 2));

    // Check SpatialWidgetContainer rendering
    const widgetContainerLogs = logs.filter(l =>
      l.includes('SpatialWidgetContainer') ||
      l.includes('canRenderWidget') ||
      l.includes('Html') ||
      l.includes('isReactWidget') ||
      l.includes('hasHtmlContent')
    );
    console.log('=== Widget Container Logs ===');
    widgetContainerLogs.forEach(l => console.log(l));

    // Check if Html elements exist in the DOM (drei Html creates real DOM elements)
    const htmlElements = await page.evaluate(() => {
      // drei's Html component creates a div with transform styles
      const transformDivs = document.querySelectorAll('div[style*="transform"]');
      const results: any[] = [];

      transformDivs.forEach(div => {
        const style = div.getAttribute('style') || '';
        const hasTransform3d = style.includes('translate3d') || style.includes('matrix3d');
        const hasIframe = div.querySelector('iframe') !== null;
        const hasReactContent = div.querySelector('[data-widget-content]') !== null;
        const innerHtml = div.innerHTML.substring(0, 200);

        if (hasTransform3d) {
          results.push({
            hasTransform3d,
            hasIframe,
            hasReactContent,
            className: div.className,
            childCount: div.childElementCount,
            innerHtmlPreview: innerHtml,
            computedDisplay: window.getComputedStyle(div).display,
            computedVisibility: window.getComputedStyle(div).visibility,
            computedOpacity: window.getComputedStyle(div).opacity,
          });
        }
      });

      return results;
    });
    console.log('=== Html Elements (drei) ===');
    console.log(JSON.stringify(htmlElements, null, 2));

    // Check for iframes specifically
    const iframes = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      return Array.from(iframes).map(iframe => ({
        title: iframe.title,
        hasSrcDoc: !!iframe.srcdoc,
        width: iframe.style.width,
        height: iframe.style.height,
        visible: window.getComputedStyle(iframe).display !== 'none',
      }));
    });
    console.log('=== Iframes ===');
    console.log(JSON.stringify(iframes, null, 2));

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/vr-widget-content-diagnostic.png' });

    // Check Three.js scene for widget meshes
    const threeState = await page.evaluate(() => {
      // Check for spatial widget groups/meshes
      const canvas = document.querySelector('[data-spatial-canvas="true"] canvas');
      if (!canvas) return { canvasExists: false };

      return {
        canvasExists: true,
        canvasVisible: window.getComputedStyle(canvas).display !== 'none',
      };
    });
    console.log('=== Three.js State ===');
    console.log(JSON.stringify(threeState, null, 2));

    // Log all spatial-related console messages
    const allSpatialLogs = logs.filter(l =>
      l.includes('Spatial') ||
      l.includes('Widget') ||
      l.includes('render') ||
      l.includes('Html') ||
      l.includes('VR')
    ).slice(-30);
    console.log('=== Recent Spatial Logs ===');
    allSpatialLogs.forEach(l => console.log(l));
  });

  test('check canRenderWidget function', async ({ page }) => {
    await page.goto('/canvas', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Inject test to check canRenderWidget logic
    const renderCheck = await page.evaluate(() => {
      const stores = (window as any).__STICKERNEST_STORES__;
      const canvasStore = stores?.canvas;
      if (!canvasStore) return { error: 'Canvas store not found' };

      const widgets = Array.from(canvasStore.getState().widgets?.values() || []);

      // Get the builtin widget registry
      const widgetRegistry = (window as any).__WIDGET_REGISTRY__;

      return widgets.map((widget: any) => {
        const defId = widget.widgetDefId;

        // Check what the widget registry knows about this widget
        let builtinInfo = null;
        if (widgetRegistry) {
          const builtin = widgetRegistry.get?.(defId) || widgetRegistry[defId];
          if (builtin) {
            builtinInfo = {
              hasComponent: !!builtin.component,
              hasHtml: !!builtin.html,
              name: builtin.name,
            };
          }
        }

        // Check for AI-generated content
        const hasGeneratedHtml = widget.metadata?.source === 'generated' &&
                                 !!widget.metadata?.generatedContent?.html;

        return {
          id: widget.id,
          widgetDefId: defId,
          builtinInfo,
          hasGeneratedHtml,
          canRenderEstimate: builtinInfo?.hasComponent || builtinInfo?.hasHtml || hasGeneratedHtml,
          metadataSource: widget.metadata?.source,
        };
      });
    });

    console.log('=== canRenderWidget Analysis ===');
    console.log(JSON.stringify(renderCheck, null, 2));
  });
});
