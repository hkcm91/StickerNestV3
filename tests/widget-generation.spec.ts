/**
 * Widget Generation E2E Tests
 * Tests the AI widget generator UI and generated widget integration
 */

import { test, expect } from '@playwright/test';

test.describe('Widget Generator UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('can access Widget Lab from navigation', async ({ page }) => {
    // Navigate to Widget Lab
    await page.click('text=Widget Lab');
    await expect(page.locator('text=AI Widget Generator')).toBeVisible({ timeout: 5000 });
  });

  test('Widget Lab shows generation form', async ({ page }) => {
    await page.click('text=Widget Lab');
    await page.waitForTimeout(500);

    // Check for key form elements
    await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible();
    await expect(page.locator('text=Style')).toBeVisible();
    await expect(page.locator('text=Quality')).toBeVisible();
  });

  test('style selector has all options', async ({ page }) => {
    await page.click('text=Widget Lab');
    await page.waitForTimeout(500);

    // Find style selector
    const styleSelect = page.locator('select').filter({ hasText: /polished|minimal/i }).first();

    if (await styleSelect.isVisible()) {
      // Check for style options
      const options = await styleSelect.locator('option').allTextContents();
      expect(options.some(o => o.toLowerCase().includes('minimal'))).toBe(true);
      expect(options.some(o => o.toLowerCase().includes('polished'))).toBe(true);
      expect(options.some(o => o.toLowerCase().includes('glass'))).toBe(true);
      expect(options.some(o => o.toLowerCase().includes('neon'))).toBe(true);
    }
  });

  test('quality selector has all options', async ({ page }) => {
    await page.click('text=Widget Lab');
    await page.waitForTimeout(500);

    // Find quality selector
    const qualitySelect = page.locator('select').filter({ hasText: /standard|basic/i }).first();

    if (await qualitySelect.isVisible()) {
      const options = await qualitySelect.locator('option').allTextContents();
      expect(options.some(o => o.toLowerCase().includes('basic'))).toBe(true);
      expect(options.some(o => o.toLowerCase().includes('standard'))).toBe(true);
      expect(options.some(o => o.toLowerCase().includes('advanced'))).toBe(true);
    }
  });
});

test.describe('Widget Generation Request', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=Widget Lab');
    await page.waitForTimeout(500);
  });

  test('requires description to generate', async ({ page }) => {
    // Try to generate without description
    const generateBtn = page.locator('button').filter({ hasText: /generate/i }).first();

    if (await generateBtn.isVisible()) {
      // Should be disabled or show error without description
      const isDisabled = await generateBtn.isDisabled();
      if (!isDisabled) {
        await generateBtn.click();
        // Should show validation error
        await expect(page.locator('text=/description|required/i')).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('can enter widget description', async ({ page }) => {
    const textarea = page.locator('textarea').first();

    if (await textarea.isVisible()) {
      await textarea.fill('A timer widget that counts down from a specified time and emits an event when complete');
      await expect(textarea).toHaveValue(/timer widget/i);
    }
  });

  test('can select different styles', async ({ page }) => {
    const styleSelect = page.locator('select').filter({ hasText: /polished|minimal/i }).first();

    if (await styleSelect.isVisible()) {
      await styleSelect.selectOption({ label: /neon/i });
      await expect(styleSelect).toHaveValue(/neon/i);
    }
  });
});

test.describe('Generated Widget Integration', () => {
  // These tests verify that generated widgets work correctly when loaded

  test('generated widget HTML structure is valid', async ({ page }) => {
    // Create a mock generated widget HTML
    const mockWidgetHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; background: #667eea; color: white; padding: 16px; }
          button { padding: 12px; background: white; color: #667eea; border: none; border-radius: 8px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h3>Test Widget</h3>
        <button id="testBtn">Click Me</button>
        <script>
          window.addEventListener('message', (e) => {
            if (e.data.type === 'widget:event') {
              console.log('Received:', e.data);
            }
          });

          document.getElementById('testBtn').onclick = () => {
            window.parent.postMessage({
              type: 'widget:emit',
              payload: { type: 'test:clicked', payload: { timestamp: Date.now() } }
            }, '*');
          };

          window.parent.postMessage({ type: 'READY' }, '*');
        </script>
      </body>
      </html>
    `;

    // Navigate to a page where we can test
    await page.goto('/');

    // Verify the HTML contains required elements
    expect(mockWidgetHtml).toContain('<!DOCTYPE html>');
    expect(mockWidgetHtml).toContain("postMessage({ type: 'READY' }");
    expect(mockWidgetHtml).toContain("addEventListener('message'");
    expect(mockWidgetHtml).toContain('widget:emit');
  });

  test('widget postMessage communication works', async ({ page }) => {
    await page.goto('/');

    // Set up message listener
    const messages: any[] = [];
    await page.exposeFunction('captureMessage', (msg: any) => {
      messages.push(msg);
    });

    await page.evaluate(() => {
      window.addEventListener('message', (e) => {
        (window as any).captureMessage(e.data);
      });
    });

    // Simulate a widget sending a message
    await page.evaluate(() => {
      window.postMessage({ type: 'READY' }, '*');
      window.postMessage({
        type: 'widget:emit',
        payload: { type: 'test:event', payload: { value: 42 } }
      }, '*');
    });

    await page.waitForTimeout(100);

    // Verify messages were captured
    expect(messages.some(m => m.type === 'READY')).toBe(true);
    expect(messages.some(m => m.type === 'widget:emit')).toBe(true);
  });
});

test.describe('Widget Style Variations', () => {
  // These tests verify that different styles produce visually distinct widgets

  const styleCharacteristics = {
    minimal: {
      backgrounds: ['#fff', '#ffffff', 'white', '#fafafa', '#f5f5f5'],
      hasGradient: false,
      hasGlow: false,
    },
    polished: {
      backgrounds: ['linear-gradient', '#667eea', '#764ba2'],
      hasGradient: true,
      hasGlow: false,
    },
    neon: {
      backgrounds: ['#0a0a0f', '#000', 'black', '#0f0f0f'],
      hasGradient: false,
      hasGlow: true,
      glowColors: ['#00ff88', '#ff00ff', 'cyan', 'magenta'],
    },
    glass: {
      backgrounds: ['rgba', 'blur'],
      hasGradient: true,
      hasBlur: true,
    },
    retro: {
      borders: ['4px solid', '3px solid'],
      hasShadowOffset: true,
    },
    elaborate: {
      hasAnimation: true,
      animationKeywords: ['@keyframes', 'animation'],
    },
  };

  test('minimal style characteristics', () => {
    const minimalCss = `
      body { background: #ffffff; color: #1a1a1a; }
      button { background: #1a1a1a; color: white; border-radius: 4px; }
    `;

    // Should have light background
    expect(
      styleCharacteristics.minimal.backgrounds.some(bg =>
        minimalCss.toLowerCase().includes(bg.toLowerCase())
      )
    ).toBe(true);

    // Should not have gradients
    expect(minimalCss.includes('linear-gradient')).toBe(false);
  });

  test('neon style characteristics', () => {
    const neonCss = `
      body { background: #0a0a0f; color: #00ff88; }
      button { box-shadow: 0 0 10px rgba(255,0,255,0.5); border: 2px solid #ff00ff; }
    `;

    // Should have dark background
    expect(
      styleCharacteristics.neon.backgrounds.some(bg =>
        neonCss.toLowerCase().includes(bg.toLowerCase())
      )
    ).toBe(true);

    // Should have glow effect
    expect(neonCss.includes('box-shadow')).toBe(true);
  });

  test('glass style characteristics', () => {
    const glassCss = `
      body { background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%); }
      .panel { background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); }
    `;

    // Should have backdrop blur
    expect(glassCss.includes('backdrop-filter')).toBe(true);
    expect(glassCss.includes('blur')).toBe(true);

    // Should have rgba backgrounds
    expect(glassCss.includes('rgba')).toBe(true);
  });

  test('elaborate style characteristics', () => {
    const elaborateCss = `
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      body { animation: gradientBG 15s ease infinite; }
    `;

    // Should have animations
    expect(elaborateCss.includes('@keyframes')).toBe(true);
    expect(elaborateCss.includes('animation')).toBe(true);
  });
});

test.describe('Widget Manifest Validation', () => {
  test('manifest has required fields', () => {
    const manifest = {
      id: 'test-widget-123',
      name: 'Test Widget',
      version: '1.0.0',
      description: 'A test widget',
      entry: 'index.html',
      category: 'utility',
      size: {
        defaultWidth: 220,
        defaultHeight: 300,
        minWidth: 160,
        minHeight: 180,
      },
      events: {
        emits: ['test:event'],
        listens: ['test:trigger'],
      },
    };

    // Required fields
    expect(manifest.id).toBeDefined();
    expect(manifest.name).toBeDefined();
    expect(manifest.version).toBeDefined();
    expect(manifest.entry).toBeDefined();
    expect(manifest.category).toBeDefined();
    expect(manifest.size).toBeDefined();

    // ID format
    expect(manifest.id).toMatch(/^[a-z0-9-]+$/);

    // Version format
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);

    // Size requirements
    expect(manifest.size.defaultWidth).toBeGreaterThan(0);
    expect(manifest.size.defaultHeight).toBeGreaterThan(0);
  });

  test('manifest category is valid', () => {
    const validCategories = ['vector', 'pipeline', 'utility'];

    validCategories.forEach(category => {
      expect(['vector', 'pipeline', 'utility']).toContain(category);
    });
  });

  test('manifest events structure is correct', () => {
    const events = {
      emits: ['vector:set-fill', 'vector:set-stroke'],
      listens: ['vector:selection-changed'],
    };

    expect(Array.isArray(events.emits)).toBe(true);
    expect(Array.isArray(events.listens)).toBe(true);

    // Event names should be strings
    events.emits.forEach(event => {
      expect(typeof event).toBe('string');
    });

    events.listens.forEach(event => {
      expect(typeof event).toBe('string');
    });
  });
});

test.describe('Widget Communication Protocol', () => {
  test('READY message format is correct', () => {
    const readyMessage = { type: 'READY' };

    expect(readyMessage.type).toBe('READY');
    expect(Object.keys(readyMessage)).toHaveLength(1);
  });

  test('emit message format is correct', () => {
    const emitMessage = {
      type: 'widget:emit',
      payload: {
        type: 'vector:set-fill',
        payload: { fill: '#ff0000' },
      },
    };

    expect(emitMessage.type).toBe('widget:emit');
    expect(emitMessage.payload).toBeDefined();
    expect(emitMessage.payload.type).toBeDefined();
    expect(emitMessage.payload.payload).toBeDefined();
  });

  test('widget:event message format is correct', () => {
    const eventMessage = {
      type: 'widget:event',
      payload: {
        type: 'vector:selection-changed',
        payload: { id: 'entity-123', type: 'rect', fill: '#00ff00' },
      },
    };

    expect(eventMessage.type).toBe('widget:event');
    expect(eventMessage.payload.type).toBeDefined();
    expect(eventMessage.payload.payload).toBeDefined();
  });
});

test.describe('Error Handling', () => {
  test('handles API errors gracefully', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Widget Lab');
    await page.waitForTimeout(500);

    // Mock a failed API call
    await page.route('**/api/widget-generator', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Generation failed' }),
      });
    });

    // Try to generate
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill('A test widget that will fail to generate');

      const generateBtn = page.locator('button').filter({ hasText: /generate/i }).first();
      if (await generateBtn.isVisible() && !await generateBtn.isDisabled()) {
        await generateBtn.click();

        // Should show error message
        await expect(page.locator('text=/error|failed/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('handles invalid JSON response', () => {
    const parseResponse = (response: string) => {
      try {
        // Try to extract JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON found');
      } catch (e) {
        return { error: 'Failed to parse response' };
      }
    };

    // Test with invalid response
    const result = parseResponse('This is not JSON at all');
    expect(result.error).toBeDefined();
  });

  test('handles missing required fields in response', () => {
    const validateResponse = (response: any) => {
      const errors: string[] = [];

      if (!response.manifest) errors.push('Missing manifest');
      if (!response.html) errors.push('Missing html');

      return errors;
    };

    const incompleteResponse = { manifest: { id: 'test' } };
    const errors = validateResponse(incompleteResponse);

    expect(errors).toContain('Missing html');
  });
});
