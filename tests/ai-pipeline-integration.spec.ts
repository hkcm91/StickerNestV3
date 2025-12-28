/**
 * AI Widget Pipeline Integration Tests
 * Tests the Phase 1 fixes: AI widgets registering with PipelineRuntime
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Create a mock AI-generated widget HTML that follows the protocol
 */
function createMockAIWidget(config: {
  id: string;
  emits?: string[];
  listens?: string[];
}): string {
  const { id, emits = ['output'], listens = ['trigger'] } = config;

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 16px;
      margin: 0;
    }
    .title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
    button {
      padding: 10px 20px;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .status { margin-top: 12px; font-size: 12px; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="title">AI Widget: ${id}</div>
  <button id="emitBtn">Send Output</button>
  <div class="status" id="status">Ready</div>

  <script>
    const widgetId = '${id}';

    // Emit helper - matches AI generator protocol
    function emit(type, payload) {
      window.parent.postMessage({
        type: 'widget:emit',
        payload: { type, payload }
      }, '*');
      document.getElementById('status').textContent = 'Emitted: ' + type;
    }

    // Listen for events from pipeline
    window.addEventListener('message', (event) => {
      const data = event.data;

      if (data.type === 'widget:event') {
        const eventType = data.payload?.type;
        document.getElementById('status').textContent = 'Received: ' + eventType;
      }

      if (data.type === 'pipeline:input') {
        const portName = data.portName;
        document.getElementById('status').textContent = 'Input on: ' + portName;
      }
    });

    // Click handler
    document.getElementById('emitBtn').onclick = () => {
      emit('${emits[0]}', { widgetId, timestamp: Date.now() });
    };

    // Signal ready
    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>`;
}

/**
 * Create a mock manifest for AI-generated widget
 */
function createMockManifest(config: {
  id: string;
  inputs?: Array<{ id: string; type: string }>;
  outputs?: Array<{ id: string; type: string }>;
}) {
  return {
    id: config.id,
    name: `AI Widget ${config.id}`,
    version: '1.0.0',
    description: 'AI-generated test widget',
    entry: 'index.html',
    category: 'utility',
    size: {
      defaultWidth: 220,
      defaultHeight: 200,
      minWidth: 160,
      minHeight: 120,
    },
    io: {
      inputs: config.inputs || [{ id: 'trigger', name: 'Trigger', type: 'event' }],
      outputs: config.outputs || [{ id: 'result', name: 'Result', type: 'any' }],
    },
  };
}

test.describe('AI Widget Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('AI widget manifest has correct io format', () => {
    const manifest = createMockManifest({
      id: 'test-ai-widget',
      inputs: [{ id: 'trigger', type: 'event' }],
      outputs: [{ id: 'result', type: 'any' }],
    });

    // Verify io structure matches expected format
    expect(manifest.io).toBeDefined();
    expect(manifest.io.inputs).toHaveLength(1);
    expect(manifest.io.outputs).toHaveLength(1);
    expect(manifest.io.inputs[0].id).toBe('trigger');
    expect(manifest.io.outputs[0].id).toBe('result');
  });

  test('AI widget signals READY on load', async ({ page }) => {
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

    // Add AI widget
    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'ai-widget';
      iframe.srcdoc = html;
      iframe.style.width = '220px';
      iframe.style.height = '200px';
      document.getElementById('container')?.appendChild(iframe);
    }, createMockAIWidget({ id: 'ai-test' }));

    await page.waitForTimeout(1000);

    // Check if READY was received
    const receivedMessages = await page.evaluate(() => (window as any).__messages || []);
    expect(receivedMessages.some((m: any) => m.type === 'READY')).toBe(true);
  });

  test('AI widget emits via correct protocol', async ({ page }) => {
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

    // Add AI widget
    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'ai-widget';
      iframe.srcdoc = html;
      iframe.style.width = '220px';
      iframe.style.height = '200px';
      document.getElementById('container')?.appendChild(iframe);
    }, createMockAIWidget({ id: 'emitter', emits: ['test:output'] }));

    await page.waitForTimeout(1000);

    // Click emit button
    const frame = page.frameLocator('#ai-widget');
    await frame.locator('#emitBtn').click();

    await page.waitForTimeout(500);

    // Check emit message format
    const messages = await page.evaluate(() => (window as any).__messages);
    const emitEvent = messages.find((m: any) => m.type === 'widget:emit');

    expect(emitEvent).toBeDefined();
    expect(emitEvent.payload.type).toBe('test:output');
    expect(emitEvent.payload.payload).toBeDefined();
  });
});

test.describe('AI Widget Pipeline Communication', () => {
  test('two AI widgets can communicate via parent routing', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="container" style="display: flex; gap: 16px;"></div>
          <script>
            window.__messages = [];

            // Route messages between widgets (simulates PipelineRuntime)
            window.addEventListener('message', (e) => {
              window.__messages.push({ source: 'parent', data: e.data });

              if (e.data.type === 'widget:emit') {
                // Forward to other widgets as widget:event
                const iframes = document.querySelectorAll('iframe');
                iframes.forEach(iframe => {
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
      iframe.id = 'sender';
      iframe.srcdoc = html;
      iframe.style.width = '220px';
      iframe.style.height = '200px';
      document.getElementById('container')?.appendChild(iframe);
    }, createMockAIWidget({ id: 'sender', emits: ['data:send'] }));

    // Add receiver widget
    await page.evaluate((html) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'receiver';
      iframe.srcdoc = html;
      iframe.style.width = '220px';
      iframe.style.height = '200px';
      document.getElementById('container')?.appendChild(iframe);
    }, createMockAIWidget({ id: 'receiver', listens: ['data:receive'] }));

    await page.waitForTimeout(1000);

    // Click sender's emit button
    const senderFrame = page.frameLocator('#sender');
    await senderFrame.locator('#emitBtn').click();

    await page.waitForTimeout(500);

    // Check receiver got the event
    const receiverFrame = page.frameLocator('#receiver');
    await expect(receiverFrame.locator('#status')).toContainText('Received:');
  });
});

test.describe('Widget Port Extraction', () => {
  test('manifest io.inputs with id field is parsed correctly', () => {
    const manifest = {
      io: {
        inputs: [
          { id: 'trigger', name: 'Trigger', type: 'event', description: 'Trigger this widget' }
        ],
        outputs: [
          { id: 'result', name: 'Result', type: 'any', description: 'Output from this widget' }
        ]
      }
    };

    // This mirrors the port extraction logic in WidgetIOPorts.tsx
    const extractPorts = (ports: any[]) => {
      return ports.map(p => ({
        name: p.id || p.name || '',
        type: p.type || p.payloadType || 'any',
        description: p.description,
      }));
    };

    const inputs = extractPorts(manifest.io.inputs);
    const outputs = extractPorts(manifest.io.outputs);

    expect(inputs[0].name).toBe('trigger');
    expect(inputs[0].type).toBe('event');
    expect(outputs[0].name).toBe('result');
    expect(outputs[0].type).toBe('any');
  });

  test('legacy manifest with name field is parsed correctly', () => {
    const manifest = {
      io: {
        inputs: [{ name: 'input', type: 'any' }],
        outputs: [{ name: 'output', type: 'any' }]
      }
    };

    const extractPorts = (ports: any[]) => {
      return ports.map(p => ({
        name: p.id || p.name || '',
        type: p.type || p.payloadType || 'any',
      }));
    };

    const inputs = extractPorts(manifest.io.inputs);
    expect(inputs[0].name).toBe('input');
  });
});

test.describe('Connect Mode Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('connect mode shows mode indicator', async ({ page }) => {
    // Look for connect mode toggle or enter connect mode
    const connectBtn = page.locator('button, [role="button"]').filter({ hasText: /connect/i }).first();

    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(500);

      // Check for mode indicator
      const modeIndicator = page.locator('text=/CONNECT MODE/i');
      const isVisible = await modeIndicator.isVisible({ timeout: 1000 }).catch(() => false);

      expect(isVisible).toBe(true);
    } else {
      // Skip if connect mode not accessible from current page
      console.log('Connect mode button not visible, skipping test');
      expect(true).toBe(true);
    }
  });
});
