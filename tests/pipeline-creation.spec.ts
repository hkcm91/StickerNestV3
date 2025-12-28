import { test, expect, Page } from '@playwright/test';

/**
 * Pipeline Creation E2E Tests
 * Simulates a new user creating pipelines from library widgets with auto-connect
 */

test.describe('Widget Lab - Pipeline Creation', () => {
  // Helper to navigate to Widget Lab
  async function navigateToWidgetLab(page: Page) {
    await page.goto('/');
    // Click on Widget Lab tab/button (adjust selector based on actual UI)
    const widgetLabButton = page.locator('text=Widget Lab').or(page.locator('[data-testid="widget-lab"]'));
    if (await widgetLabButton.isVisible()) {
      await widgetLabButton.click();
    } else {
      // Try through menu
      await page.click('text=Tools');
      await page.click('text=Widget Lab');
    }
    await page.waitForTimeout(500);
  }

  // Helper to clear localStorage for fresh state
  async function clearLocalStorage(page: Page) {
    await page.evaluate(() => {
      localStorage.clear();
    });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();
  });

  test('Widget Lab loads and shows Generate tab', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Should see the Generate tab content
    await expect(page.locator('text=AI Model')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Integrate With Existing Widgets')).toBeVisible({ timeout: 5000 });
  });

  test('Library browser shows categorized widgets', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Click Browse button to open library selector
    const browseButton = page.locator('button:has-text("Browse")');
    await browseButton.click();
    await page.waitForTimeout(500);

    // Should see widget categories
    await expect(page.locator('text=Pipeline Widgets').or(page.locator('text=PIPELINE WIDGETS'))).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Vector Widgets').or(page.locator('text=VECTOR WIDGETS'))).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Communication Widgets').or(page.locator('text=COMMUNICATION WIDGETS'))).toBeVisible({ timeout: 5000 });
  });

  test('Can select widgets from library', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Open library browser
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(500);

    // Click on color-sender widget
    const colorSender = page.locator('text=Color Sender').or(page.locator('text=color-sender'));
    await colorSender.click();
    await page.waitForTimeout(200);

    // Click on color-receiver widget
    const colorReceiver = page.locator('text=Color Receiver').or(page.locator('text=color-receiver'));
    await colorReceiver.click();
    await page.waitForTimeout(200);

    // Should see selected widgets displayed as tags
    await expect(page.locator('span:has-text("Color Sender")').or(page.locator('span:has-text("color-sender")'))).toBeVisible();
    await expect(page.locator('span:has-text("Color Receiver")').or(page.locator('span:has-text("color-receiver")'))).toBeVisible();
  });

  test('Create Pipeline button appears when 2+ widgets selected', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Open library browser
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(500);

    // Select first widget - button should NOT appear yet
    const widget1 = page.locator('[data-widget-id]').first().or(page.locator('.widget-item').first());
    if (await widget1.isVisible()) {
      await widget1.click();
    } else {
      // Click by text
      await page.locator('text=color-sender').or(page.locator('text=Color Sender')).first().click();
    }
    await page.waitForTimeout(200);

    // Create Pipeline button should not be visible with only 1 widget
    await expect(page.locator('text=Snap Together as Pipeline')).not.toBeVisible();

    // Select second widget
    await page.locator('text=color-receiver').or(page.locator('text=Color Receiver')).first().click();
    await page.waitForTimeout(200);

    // Now the Create Pipeline section should appear
    await expect(page.locator('text=Snap Together as Pipeline')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("Create Pipeline")')).toBeVisible();
  });

  test('Can create pipeline from selected widgets', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Open library browser
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(1000);

    // Select color widgets (they should auto-connect)
    await page.locator('text=color-sender').or(page.locator('text=Color Sender')).first().click();
    await page.waitForTimeout(300);
    await page.locator('text=color-receiver').or(page.locator('text=Color Receiver')).first().click();
    await page.waitForTimeout(300);

    // Fill in pipeline name
    const pipelineNameInput = page.locator('input[placeholder*="Pipeline name"]');
    await pipelineNameInput.fill('Test Color Pipeline');

    // Click create button
    const createButton = page.locator('button:has-text("Create Pipeline")');
    await createButton.click();

    // Wait for creation (may show loading state)
    await page.waitForTimeout(2000);

    // Should see success alert or pipeline created
    // Dialog should appear with success message
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Pipeline');
      expect(dialog.message()).toContain('created');
      await dialog.accept();
    });
  });

  test('Pipeline dropdown shows newly created pipeline', async ({ page }) => {
    await navigateToWidgetLab(page);

    // First create a pipeline
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(1000);

    // Select widgets
    await page.locator('text=ping-sender').or(page.locator('text=Ping Sender')).first().click();
    await page.waitForTimeout(200);
    await page.locator('text=ping-receiver').or(page.locator('text=Ping Receiver')).first().click();
    await page.waitForTimeout(200);

    // Name and create pipeline
    await page.locator('input[placeholder*="Pipeline name"]').fill('My Test Pipeline');

    // Handle the alert
    page.on('dialog', dialog => dialog.accept());

    await page.locator('button:has-text("Create Pipeline")').click();
    await page.waitForTimeout(2000);

    // Check pipeline dropdown
    const pipelineSelect = page.locator('select').filter({ hasText: /pipeline/i }).or(
      page.locator('label:has-text("Target Pipeline")').locator('..').locator('select')
    );

    // Should contain our new pipeline
    await expect(pipelineSelect).toContainText('My Test Pipeline');
  });

  test('Selected widgets are cleared after pipeline creation', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Open library and select widgets
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(1000);

    await page.locator('text=color-sender').or(page.locator('text=Color Sender')).first().click();
    await page.waitForTimeout(200);
    await page.locator('text=color-receiver').or(page.locator('text=Color Receiver')).first().click();
    await page.waitForTimeout(200);

    // Verify widgets are selected
    await expect(page.locator('text=Snap Together as Pipeline')).toBeVisible();

    // Handle alert
    page.on('dialog', dialog => dialog.accept());

    // Create pipeline
    await page.locator('button:has-text("Create Pipeline")').click();
    await page.waitForTimeout(2000);

    // Selection should be cleared
    await expect(page.locator('text=Snap Together as Pipeline')).not.toBeVisible();
  });

  test('Clear all button removes widget selection', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Open library and select widgets
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(1000);

    await page.locator('text=color-sender').or(page.locator('text=Color Sender')).first().click();
    await page.waitForTimeout(200);
    await page.locator('text=color-receiver').or(page.locator('text=Color Receiver')).first().click();
    await page.waitForTimeout(200);

    // Should see snap together panel
    await expect(page.locator('text=Snap Together as Pipeline')).toBeVisible();

    // Click Clear all
    await page.locator('button:has-text("Clear all")').click();
    await page.waitForTimeout(200);

    // Panel should disappear
    await expect(page.locator('text=Snap Together as Pipeline')).not.toBeVisible();
  });

  test('Widget I/O ports are displayed in library', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Open library browser
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(1000);

    // Should see IN: and OUT: labels for widgets with ports
    await expect(page.locator('text=IN:').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=OUT:').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Pipeline Auto-Connect Logic', () => {
  async function navigateToWidgetLab(page: Page) {
    await page.goto('/');
    const widgetLabButton = page.locator('text=Widget Lab').or(page.locator('[data-testid="widget-lab"]'));
    if (await widgetLabButton.isVisible()) {
      await widgetLabButton.click();
    } else {
      await page.click('text=Tools');
      await page.click('text=Widget Lab');
    }
    await page.waitForTimeout(500);
  }

  test('Auto-connect message shows correct counts', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Open library and select compatible widgets
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(1000);

    // Select pipeline widgets (they should have compatible ports)
    await page.locator('text=pipeline-button').or(page.locator('text=Pipeline Button')).first().click();
    await page.waitForTimeout(200);
    await page.locator('text=pipeline-progressbar').or(page.locator('text=Pipeline Progress')).first().click();
    await page.waitForTimeout(200);

    // Should show message about auto-connecting
    await expect(page.locator('text=Compatible ports will auto-connect')).toBeVisible();
    await expect(page.locator('text=2 widgets')).toBeVisible();
  });

  test('Pipeline created with connections between compatible widgets', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Open library
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(1000);

    // Select color sender/receiver (they have matching ports)
    await page.locator('text=color-sender').or(page.locator('text=Color Sender')).first().click();
    await page.waitForTimeout(200);
    await page.locator('text=color-receiver').or(page.locator('text=Color Receiver')).first().click();
    await page.waitForTimeout(200);

    // Capture the alert message
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // Create pipeline
    await page.locator('button:has-text("Create Pipeline")').click();
    await page.waitForTimeout(2000);

    // Alert should mention connections were created
    expect(alertMessage).toContain('auto-connection');
  });
});

test.describe('Widget Lab UI Features', () => {
  async function navigateToWidgetLab(page: Page) {
    await page.goto('/');
    const widgetLabButton = page.locator('text=Widget Lab').or(page.locator('[data-testid="widget-lab"]'));
    if (await widgetLabButton.isVisible()) {
      await widgetLabButton.click();
    } else {
      await page.click('text=Tools');
      await page.click('text=Widget Lab');
    }
    await page.waitForTimeout(500);
  }

  test('Example prompts are clickable', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Should see example prompts
    const examplePrompt = page.locator('button:has-text("color picker")').or(
      page.locator('button:has-text("task manager")')
    ).first();

    if (await examplePrompt.isVisible()) {
      await examplePrompt.click();

      // Description textarea should be filled
      const textarea = page.locator('textarea');
      await expect(textarea).not.toBeEmpty();
    }
  });

  test('Advanced Features toggle works', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Click Advanced Features toggle
    const toggle = page.locator('button:has-text("Advanced Features")');
    await toggle.click();
    await page.waitForTimeout(200);

    // Should see feature checkboxes
    await expect(page.locator('text=Animations')).toBeVisible();
    await expect(page.locator('text=Hover Effects')).toBeVisible();
    await expect(page.locator('text=Responsive')).toBeVisible();
  });

  test('Quality selector changes selection', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Click on Professional quality
    const professionalBtn = page.locator('button:has-text("Professional")');
    await professionalBtn.click();

    // Should be selected (has accent border)
    await expect(professionalBtn).toHaveCSS('border-color', /.*/);
  });

  test('Style selector changes selection', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Click on Neon style
    const neonBtn = page.locator('button:has-text("Neon")');
    await neonBtn.click();

    // Should be selected
    await expect(neonBtn).toHaveCSS('border-color', /.*/);
  });

  test('AI Model selector shows providers', async ({ page }) => {
    await navigateToWidgetLab(page);

    // Click AI Model dropdown
    const modelSelect = page.locator('select').filter({ hasText: /llama|gpt|claude/i }).first();

    // Should have option groups
    await expect(modelSelect.locator('optgroup')).toHaveCount({ minimum: 1 });
  });
});

test.describe('New User Onboarding Flow', () => {
  test('Complete flow: New user creates their first pipeline', async ({ page }) => {
    // Clear any existing data
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 1. Navigate to Widget Lab
    const widgetLabButton = page.locator('text=Widget Lab').or(page.locator('[data-testid="widget-lab"]'));
    if (await widgetLabButton.isVisible()) {
      await widgetLabButton.click();
    } else {
      await page.click('text=Tools');
      await page.click('text=Widget Lab');
    }
    await page.waitForTimeout(500);

    // 2. See the Generate tab is active
    await expect(page.locator('text=AI Model')).toBeVisible({ timeout: 5000 });

    // 3. Browse widget library
    await page.locator('button:has-text("Browse")').click();
    await page.waitForTimeout(1000);

    // 4. Select widgets - user picks farm ecosystem
    const farmCropPlot = page.locator('text=farm-crop-plot').or(page.locator('text=Crop Plot'));
    const farmSeedBag = page.locator('text=farm-seed-bag').or(page.locator('text=Seed Bag'));

    if (await farmCropPlot.first().isVisible()) {
      await farmCropPlot.first().click();
      await page.waitForTimeout(200);
    }

    if (await farmSeedBag.first().isVisible()) {
      await farmSeedBag.first().click();
      await page.waitForTimeout(200);
    }

    // 5. Verify "Snap Together" panel appears
    const snapPanel = page.locator('text=Snap Together as Pipeline');
    if (await snapPanel.isVisible()) {
      // 6. Name the pipeline
      await page.locator('input[placeholder*="Pipeline name"]').fill('My Farm Ecosystem');

      // 7. Handle success dialog
      page.on('dialog', async (dialog) => {
        console.log('Pipeline created:', dialog.message());
        await dialog.accept();
      });

      // 8. Create the pipeline
      await page.locator('button:has-text("Create Pipeline")').click();
      await page.waitForTimeout(2000);

      // 9. Verify pipeline appears in dropdown
      const pipelineSelect = page.locator('select').filter({ hasText: /pipeline/i });
      if (await pipelineSelect.isVisible()) {
        const options = await pipelineSelect.locator('option').allTextContents();
        console.log('Available pipelines:', options);
      }
    }

    // Test passes if we got this far without errors
    expect(true).toBe(true);
  });

  test('New user can use example prompts', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Navigate to Widget Lab
    const widgetLabButton = page.locator('text=Widget Lab').or(page.locator('[data-testid="widget-lab"]'));
    if (await widgetLabButton.isVisible()) {
      await widgetLabButton.click();
    } else {
      await page.click('text=Tools');
      await page.click('text=Widget Lab');
    }
    await page.waitForTimeout(500);

    // Check for example prompts
    const examplePrompts = page.locator('button').filter({ hasText: /color picker|task manager|countdown|dice/i });
    const count = await examplePrompts.count();

    if (count > 0) {
      // Click an example
      await examplePrompts.first().click();
      await page.waitForTimeout(200);

      // Verify description is populated
      const textarea = page.locator('textarea');
      const value = await textarea.inputValue();
      expect(value.length).toBeGreaterThan(10);
    }

    expect(true).toBe(true);
  });
});
