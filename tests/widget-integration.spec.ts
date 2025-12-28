/**
 * Widget Integration Tests
 * Tests the runtime behavior of widgets including communication, events, and state
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper to create a test widget HTML string
 */
function createTestWidget(config: {
  id: string;
  emitsOnClick?: boolean;
  listensForEvents?: boolean;
  style?: 'minimal' | 'polished' | 'neon';
}): string {
  const { id, emitsOnClick = false, listensForEvents = false, style = 'polished' } = config;

  const styles = {
    minimal: 'body { background: #fff; color: #000; font-family: sans-serif; padding: 16px; }',
    polished: 'body { background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-family: sans-serif; padding: 16px; }',
    neon: 'body { background: #0a0a0f; color: #00ff88; font-family: monospace; padding: 16px; }',
  };

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    ${styles[style]}
    button { padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; }
    .status { margin-top: 16px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; }
  </style>
</head>
<body>
  <h3>Test Widget: ${id}</h3>
  ${emitsOnClick ? '<button id="emitBtn">Emit Event</button>' : ''}
  <div class="status" id="status">Ready</div>

  <script>
    const widgetId = '${id}';
    let eventCount = 0;

    // Emit helper
    function emit(type, payload) {
      console.log('[' + widgetId + '] Emitting:', type, payload);
      window.parent.postMessage({
        type: 'widget:emit',
        payload: { type, payload }
      }, '*');
    }

    // Update status display
    function updateStatus(msg) {
      document.getElementById('status').textContent = msg;
    }

    ${emitsOnClick ? `
    // Click handler
    document.getElementById('emitBtn').onclick = () => {
      eventCount++;
      emit('test:clicked', { widgetId, count: eventCount, timestamp: Date.now() });
      updateStatus('Emitted event #' + eventCount);
    };
    ` : ''}

    ${listensForEvents ? `
    // Event listener
    window.addEventListener('message', (event) => {
      const data = event.data;

      if (data.type === 'widget:event') {
        const eventType = data.payload?.type;
        const eventPayload = data.payload?.payload;

        console.log('[' + widgetId + '] Received:', eventType, eventPayload);
        updateStatus('Received: ' + eventType);

        // Respond to specific events
        if (eventType === 'test:ping') {
          emit('test:pong', { widgetId, originalPayload: eventPayload });
        }
      }

      // Handle direct input events
      if (data.type === 'widget:input') {
        console.log('[' + widgetId + '] Input:', data.payload);
        updateStatus('Input on port: ' + data.payload?.portName);
      }
    });
    ` : ''}

    // Signal ready
    console.log('[' + widgetId + '] Sending READY');
    window.parent.postMessage({ type: 'READY' }, '*');
    updateStatus('Widget ready');
  </script>
</body>
</html>`;
}

test.describe('Widget Lifecycle', () => {
  test('widget signals READY on load', async ({ page }) => {
    // Track postMessage calls
    const messages: any[] = [];

    await page.addInitScript(() => {
      const originalPostMessage = window.postMessage.bind(window);
      window.postMessage = (msg: any, target: any) => {
        (window as any).__messages = (window as any).__messages || [];
        (window as any).__messages.push(msg);
        originalPostMessage(msg, target);
      };
    });

    // Load a test widget in an iframe scenario
    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
          <script>
            const messages = [];
            window.addEventListener('message', (e) => {
              messages.push(e.data);
              window.__receivedMessages = messages;
            });
          </script>
        </body>
      </html>
    `);

    // Inject test widget HTML
    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.srcdoc = html;
      iframe.style.width = '300px';
      iframe.style.height = '400px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'lifecycle-test' }));

    // Wait for iframe to load
    await page.waitForTimeout(1000);

    // Check if READY was received
    const receivedMessages = await page.evaluate(() => (window as any).__receivedMessages || []);
    expect(receivedMessages.some((m: any) => m.type === 'READY')).toBe(true);
  });
});

test.describe('Widget Event Emission', () => {
  test('widget emits events via postMessage', async ({ page }) => {
    const messages: any[] = [];

    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
          <script>
            window.__messages = [];
            window.addEventListener('message', (e) => {
              window.__messages.push(e.data);
            });
          </script>
        </body>
      </html>
    `);

    // Add widget that emits on click
    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'test-widget';
      iframe.srcdoc = html;
      iframe.style.width = '300px';
      iframe.style.height = '400px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'emitter', emitsOnClick: true }));

    await page.waitForTimeout(1000);

    // Click the emit button inside iframe
    const frame = page.frameLocator('#test-widget');
    await frame.locator('#emitBtn').click();

    await page.waitForTimeout(500);

    // Check if event was emitted
    const messages2 = await page.evaluate(() => (window as any).__messages);
    const emitEvent = messages2.find((m: any) => m.type === 'widget:emit');

    expect(emitEvent).toBeDefined();
    expect(emitEvent.payload.type).toBe('test:clicked');
    expect(emitEvent.payload.payload.count).toBe(1);
  });

  test('widget tracks emission count', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
          <script>
            window.__messages = [];
            window.addEventListener('message', (e) => {
              window.__messages.push(e.data);
            });
          </script>
        </body>
      </html>
    `);

    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'test-widget';
      iframe.srcdoc = html;
      iframe.style.width = '300px';
      iframe.style.height = '400px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'counter', emitsOnClick: true }));

    await page.waitForTimeout(1000);

    const frame = page.frameLocator('#test-widget');

    // Click multiple times
    await frame.locator('#emitBtn').click();
    await page.waitForTimeout(100);
    await frame.locator('#emitBtn').click();
    await page.waitForTimeout(100);
    await frame.locator('#emitBtn').click();

    await page.waitForTimeout(500);

    // Check counts
    const messages = await page.evaluate(() => (window as any).__messages);
    const emitEvents = messages.filter((m: any) => m.type === 'widget:emit');

    expect(emitEvents).toHaveLength(3);
    expect(emitEvents[2].payload.payload.count).toBe(3);
  });
});

test.describe('Widget Event Reception', () => {
  test('widget receives widget:event messages', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
          <script>
            window.__messages = [];
            window.addEventListener('message', (e) => {
              window.__messages.push(e.data);
            });
          </script>
        </body>
      </html>
    `);

    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'test-widget';
      iframe.srcdoc = html;
      iframe.style.width = '300px';
      iframe.style.height = '400px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'receiver', listensForEvents: true }));

    await page.waitForTimeout(1000);

    // Send event to widget
    await page.evaluate(() => {
      const iframe = document.getElementById('test-widget') as HTMLIFrameElement;
      iframe.contentWindow?.postMessage({
        type: 'widget:event',
        payload: {
          type: 'test:ping',
          payload: { message: 'Hello widget!' }
        }
      }, '*');
    });

    await page.waitForTimeout(500);

    // Widget should have responded with pong
    const messages = await page.evaluate(() => (window as any).__messages);
    const pongEvent = messages.find((m: any) =>
      m.type === 'widget:emit' &&
      m.payload?.type === 'test:pong'
    );

    expect(pongEvent).toBeDefined();
    expect(pongEvent.payload.payload.originalPayload.message).toBe('Hello widget!');
  });

  test('widget handles widget:input messages', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
        </body>
      </html>
    `);

    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'test-widget';
      iframe.srcdoc = html;
      iframe.style.width = '300px';
      iframe.style.height = '400px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'input-receiver', listensForEvents: true }));

    await page.waitForTimeout(1000);

    // Send input event to widget
    await page.evaluate(() => {
      const iframe = document.getElementById('test-widget') as HTMLIFrameElement;
      iframe.contentWindow?.postMessage({
        type: 'widget:input',
        payload: {
          targetWidgetId: 'input-receiver',
          portName: 'trigger',
          value: { data: 'test-value' }
        }
      }, '*');
    });

    await page.waitForTimeout(500);

    // Check widget status updated
    const frame = page.frameLocator('#test-widget');
    await expect(frame.locator('#status')).toContainText('Input on port: trigger');
  });
});

test.describe('Widget Styles', () => {
  test('minimal style has light background', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
        </body>
      </html>
    `);

    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'test-widget';
      iframe.srcdoc = html;
      iframe.style.width = '300px';
      iframe.style.height = '400px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'minimal-widget', style: 'minimal' }));

    await page.waitForTimeout(1000);

    // Check background color
    const frame = page.frameLocator('#test-widget');
    const bodyBg = await frame.locator('body').evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should be white or light
    expect(bodyBg).toMatch(/rgb\(255, 255, 255\)|rgba\(255, 255, 255/);
  });

  test('neon style has dark background', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
        </body>
      </html>
    `);

    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'test-widget';
      iframe.srcdoc = html;
      iframe.style.width = '300px';
      iframe.style.height = '400px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'neon-widget', style: 'neon' }));

    await page.waitForTimeout(1000);

    // Check background color
    const frame = page.frameLocator('#test-widget');
    const bodyBg = await frame.locator('body').evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should be dark
    expect(bodyBg).toMatch(/rgb\(10, 10, 15\)|rgba\(10, 10, 15/);
  });
});

test.describe('Widget-to-Widget Communication', () => {
  test('two widgets can communicate through parent', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="container" style="display: flex; gap: 16px;"></div>
          <script>
            window.__messages = [];

            // Route messages between widgets
            window.addEventListener('message', (e) => {
              window.__messages.push({ source: 'parent', data: e.data });

              // If one widget emits, forward to the other
              if (e.data.type === 'widget:emit') {
                const iframes = document.querySelectorAll('iframe');
                iframes.forEach(iframe => {
                  // Don't send back to source
                  if (iframe.contentWindow !== e.source) {
                    iframe.contentWindow?.postMessage({
                      type: 'widget:event',
                      payload: e.data.payload
                    }, '*');
                  }
                });
              }
            });
          </script>
        </body>
      </html>
    `);

    // Add sender widget
    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'sender-widget';
      iframe.srcdoc = html;
      iframe.style.width = '200px';
      iframe.style.height = '200px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'sender', emitsOnClick: true }));

    // Add receiver widget
    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'receiver-widget';
      iframe.srcdoc = html;
      iframe.style.width = '200px';
      iframe.style.height = '200px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'receiver', listensForEvents: true }));

    await page.waitForTimeout(1000);

    // Click sender's emit button
    const senderFrame = page.frameLocator('#sender-widget');
    await senderFrame.locator('#emitBtn').click();

    await page.waitForTimeout(500);

    // Check receiver got the event
    const receiverFrame = page.frameLocator('#receiver-widget');
    await expect(receiverFrame.locator('#status')).toContainText('Received: test:clicked');
  });
});

test.describe('Widget Error Handling', () => {
  test('widget handles malformed messages gracefully', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
        </body>
      </html>
    `);

    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'test-widget';
      iframe.srcdoc = html;
      iframe.style.width = '300px';
      iframe.style.height = '400px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'error-handler', listensForEvents: true }));

    await page.waitForTimeout(1000);

    // Send various malformed messages
    await page.evaluate(() => {
      const iframe = document.getElementById('test-widget') as HTMLIFrameElement;

      // Empty message
      iframe.contentWindow?.postMessage({}, '*');

      // Missing type
      iframe.contentWindow?.postMessage({ foo: 'bar' }, '*');

      // Invalid payload
      iframe.contentWindow?.postMessage({
        type: 'widget:event',
        payload: null
      }, '*');

      // String instead of object
      iframe.contentWindow?.postMessage('hello', '*');
    });

    await page.waitForTimeout(500);

    // Widget should still be functional
    const frame = page.frameLocator('#test-widget');
    await expect(frame.locator('#status')).toBeVisible();
    await expect(frame.locator('h3')).toContainText('Test Widget');
  });
});

test.describe('Performance', () => {
  test('widget responds to events quickly', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
          <script>
            window.__latencies = [];
            window.addEventListener('message', (e) => {
              if (e.data.type === 'widget:emit' && e.data.payload?.type === 'test:pong') {
                const latency = Date.now() - e.data.payload.payload.originalPayload.sentAt;
                window.__latencies.push(latency);
              }
            });
          </script>
        </body>
      </html>
    `);

    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'test-widget';
      iframe.srcdoc = html;
      iframe.style.width = '300px';
      iframe.style.height = '400px';
      document.getElementById('container')?.appendChild(iframe);
    }, createTestWidget({ id: 'perf-test', listensForEvents: true }));

    await page.waitForTimeout(1000);

    // Send multiple pings and measure response time
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const iframe = document.getElementById('test-widget') as HTMLIFrameElement;
        iframe.contentWindow?.postMessage({
          type: 'widget:event',
          payload: {
            type: 'test:ping',
            payload: { sentAt: Date.now() }
          }
        }, '*');
      });
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(500);

    // Check latencies
    const latencies = await page.evaluate(() => (window as any).__latencies);
    expect(latencies.length).toBeGreaterThan(0);

    // Average latency should be under 100ms
    const avgLatency = latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length;
    expect(avgLatency).toBeLessThan(100);
  });
});
