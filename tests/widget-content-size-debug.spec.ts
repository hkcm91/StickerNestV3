/**
 * Debug test to investigate widget content size vs frame size
 * This test adds widgets and compares actual iframe content size to the widget frame
 */
import { test, expect } from '@playwright/test';

test('debug widget content size vs frame size', async ({ page }) => {
  console.log('\n=== WIDGET CONTENT SIZE DEBUG ===\n');

  await page.goto('/');
  await page.waitForTimeout(3000);

  // Screenshot initial state
  await page.screenshot({ path: 'tests/screenshots/size-debug-01-initial.png', fullPage: true });

  // Enter edit mode
  await page.keyboard.press('e');
  await page.waitForTimeout(500);

  // Find all widgets on canvas
  const widgets = await page.locator('[data-widget-id]').all();
  console.log(`Found ${widgets.length} widgets on canvas\n`);

  for (let i = 0; i < widgets.length; i++) {
    const widget = widgets[i];
    const widgetId = await widget.getAttribute('data-widget-id');

    // Get widget wrapper dimensions
    const wrapperBox = await widget.boundingBox();

    // Find iframe inside widget
    const iframe = widget.locator('iframe').first();
    const hasIframe = await iframe.count() > 0;

    console.log(`\n--- Widget ${i + 1}: ${widgetId?.slice(0, 30)}... ---`);
    console.log(`Wrapper box: ${JSON.stringify(wrapperBox)}`);

    if (hasIframe) {
      const iframeBox = await iframe.boundingBox();
      console.log(`Iframe box: ${JSON.stringify(iframeBox)}`);

      // Try to get actual content dimensions from iframe
      try {
        const iframeHandle = await iframe.elementHandle();
        const contentFrame = await iframeHandle?.contentFrame();

        if (contentFrame) {
          const contentDims = await contentFrame.evaluate(() => {
            const body = document.body;
            const html = document.documentElement;

            return {
              bodyScrollWidth: body?.scrollWidth || 0,
              bodyScrollHeight: body?.scrollHeight || 0,
              bodyClientWidth: body?.clientWidth || 0,
              bodyClientHeight: body?.clientHeight || 0,
              htmlScrollWidth: html?.scrollWidth || 0,
              htmlScrollHeight: html?.scrollHeight || 0,
              htmlClientWidth: html?.clientWidth || 0,
              htmlClientHeight: html?.clientHeight || 0,
              // Check for any widgets/content with explicit sizes
              firstChildSize: body?.firstElementChild ? {
                scrollWidth: (body.firstElementChild as HTMLElement).scrollWidth,
                scrollHeight: (body.firstElementChild as HTMLElement).scrollHeight,
                offsetWidth: (body.firstElementChild as HTMLElement).offsetWidth,
                offsetHeight: (body.firstElementChild as HTMLElement).offsetHeight,
              } : null,
            };
          });

          console.log(`Iframe content dimensions:`);
          console.log(`  body: ${contentDims.bodyScrollWidth}x${contentDims.bodyScrollHeight} (scroll)`);
          console.log(`  html: ${contentDims.htmlScrollWidth}x${contentDims.htmlScrollHeight} (scroll)`);
          if (contentDims.firstChildSize) {
            console.log(`  first child: ${contentDims.firstChildSize.offsetWidth}x${contentDims.firstChildSize.offsetHeight}`);
          }

          // Compare to wrapper
          if (wrapperBox && contentDims.bodyScrollHeight > wrapperBox.height) {
            console.log(`  ⚠️  Content height (${contentDims.bodyScrollHeight}) > wrapper height (${wrapperBox.height})`);
            console.log(`      This widget content is being CROPPED!`);
          }
          if (wrapperBox && contentDims.bodyScrollWidth > wrapperBox.width) {
            console.log(`  ⚠️  Content width (${contentDims.bodyScrollWidth}) > wrapper width (${wrapperBox.width})`);
            console.log(`      This widget content is being CROPPED!`);
          }
        }
      } catch (e) {
        console.log(`  Could not access iframe content: ${e}`);
      }
    }

    // Get CSS styles that might cause clipping
    const clipInfo = await widget.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const checkClipping = (element: Element, depth = 0): any[] => {
        if (depth > 6) return [];
        const results: any[] = [];
        const s = window.getComputedStyle(element);

        if (s.overflow !== 'visible' || s.clipPath !== 'none') {
          const rect = element.getBoundingClientRect();
          results.push({
            tag: element.tagName,
            class: element.className?.toString?.()?.slice(0, 40) || '',
            overflow: s.overflow,
            overflowX: s.overflowX,
            overflowY: s.overflowY,
            clipPath: s.clipPath,
            width: rect.width,
            height: rect.height,
          });
        }

        Array.from(element.children).slice(0, 10).forEach(child => {
          results.push(...checkClipping(child, depth + 1));
        });

        return results;
      };

      return checkClipping(el);
    });

    console.log(`Elements with clipping in this widget:`);
    clipInfo.forEach((c, j) => {
      console.log(`  ${j + 1}. <${c.tag}> ${c.width.toFixed(0)}x${c.height.toFixed(0)} overflow:${c.overflow} clip:${c.clipPath?.slice(0, 30)}`);
    });
  }

  // Screenshot with annotations
  await page.screenshot({ path: 'tests/screenshots/size-debug-02-analyzed.png', fullPage: true });
});

test('add widget and measure content size', async ({ page }) => {
  console.log('\n=== ADD WIDGET AND MEASURE ===\n');

  await page.goto('/');
  await page.waitForTimeout(3000);

  // Enter edit mode
  await page.keyboard.press('e');
  await page.waitForTimeout(500);

  // Count initial widgets
  const initialCount = await page.locator('[data-widget-id]').count();
  console.log(`Initial widget count: ${initialCount}`);

  // Find a way to add widgets - look for widget library or add button
  const addButton = page.locator('button:has-text("Widget"), button[title*="Add"], [class*="add"]').first();
  if (await addButton.isVisible().catch(() => false)) {
    console.log('Found add widget button');
    await addButton.click();
    await page.waitForTimeout(500);
  }

  // Look for widget items to drag
  const widgetItems = page.locator('[draggable="true"], [data-widget-def-id], .widget-item');
  const itemCount = await widgetItems.count();
  console.log(`Found ${itemCount} widget items to add`);

  if (itemCount > 0) {
    // Get the first widget item
    const firstItem = widgetItems.first();
    const itemBox = await firstItem.boundingBox();

    // Find canvas
    const canvas = page.locator('[data-canvas-transform]').first();
    const canvasBox = await canvas.boundingBox();

    if (itemBox && canvasBox) {
      console.log(`Dragging widget from ${itemBox.x},${itemBox.y} to canvas center`);

      const targetX = canvasBox.x + canvasBox.width / 2;
      const targetY = canvasBox.y + canvasBox.height / 2;

      // Drag
      await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetX, targetY, { steps: 15 });
      await page.mouse.up();

      await page.waitForTimeout(2000); // Wait for widget to render

      // Check for new widgets
      const newCount = await page.locator('[data-widget-id]').count();
      console.log(`Widget count after drop: ${newCount}`);

      if (newCount > initialCount) {
        // Get the newest widget
        const allWidgets = await page.locator('[data-widget-id]').all();
        const newestWidget = allWidgets[allWidgets.length - 1];

        const widgetBox = await newestWidget.boundingBox();
        console.log(`\nNew widget dimensions: ${JSON.stringify(widgetBox)}`);

        // Check iframe content
        const iframe = newestWidget.locator('iframe').first();
        if (await iframe.count() > 0) {
          const iframeHandle = await iframe.elementHandle();
          const contentFrame = await iframeHandle?.contentFrame();

          if (contentFrame) {
            // Wait a bit for content to fully load
            await page.waitForTimeout(1000);

            const contentDims = await contentFrame.evaluate(() => {
              return {
                bodyScrollWidth: document.body?.scrollWidth || 0,
                bodyScrollHeight: document.body?.scrollHeight || 0,
                docScrollWidth: document.documentElement?.scrollWidth || 0,
                docScrollHeight: document.documentElement?.scrollHeight || 0,
              };
            });

            console.log(`Iframe content: ${contentDims.bodyScrollWidth}x${contentDims.bodyScrollHeight}`);

            if (widgetBox) {
              if (contentDims.bodyScrollHeight > widgetBox.height) {
                console.log(`\n🚨 CONTENT IS TALLER THAN FRAME!`);
                console.log(`   Content: ${contentDims.bodyScrollHeight}px, Frame: ${widgetBox.height}px`);
                console.log(`   ${contentDims.bodyScrollHeight - widgetBox.height}px of content is cropped!`);
              }
              if (contentDims.bodyScrollWidth > widgetBox.width) {
                console.log(`\n🚨 CONTENT IS WIDER THAN FRAME!`);
                console.log(`   Content: ${contentDims.bodyScrollWidth}px, Frame: ${widgetBox.width}px`);
              }
            }
          }
        }
      }
    }
  }

  await page.screenshot({ path: 'tests/screenshots/size-debug-03-after-add.png', fullPage: true });
});
