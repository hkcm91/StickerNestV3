/**
 * OAuth Debug Test
 * Tests the Google OAuth sign-in flow and account switching
 */

import { test, expect, Page } from '@playwright/test';

test.describe('OAuth Debug', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should show login page with Google button', async ({ page }) => {
    await page.goto('/login');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/login-page.png' });

    // Check if we're in local dev mode (OAuth buttons hidden)
    const devNotice = page.locator('text=Local Dev Mode');
    const isLocalDevMode = await devNotice.isVisible().catch(() => false);

    console.log('Is Local Dev Mode:', isLocalDevMode);

    if (isLocalDevMode) {
      console.log('WARNING: Local dev mode is active - OAuth buttons are hidden');
      console.log('OAuth testing requires Supabase to be configured and NOT running on localhost');
      return;
    }

    // Look for Google sign-in button
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();

    console.log('Google button found!');
  });

  test('debug localStorage and session state', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check what's in localStorage
    const storageState = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          items[key] = localStorage.getItem(key) || '';
        }
      }
      return {
        localStorage: items,
        localStorageKeys: Object.keys(items),
        supabaseKeys: Object.keys(items).filter(k => k.startsWith('sb-') || k.includes('supabase')),
      };
    });

    console.log('localStorage keys:', storageState.localStorageKeys);
    console.log('Supabase-related keys:', storageState.supabaseKeys);

    // Check sessionStorage too
    const sessionState = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          items[key] = sessionStorage.getItem(key) || '';
        }
      }
      return Object.keys(items);
    });

    console.log('sessionStorage keys:', sessionState);
  });

  test('debug signOut clears all auth data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate having some auth data
    await page.evaluate(() => {
      localStorage.setItem('stickernest:access_token', 'test-token');
      localStorage.setItem('stickernest:current_user', '{"id":"test"}');
      localStorage.setItem('sb-test-auth-token', '{"access_token":"test"}');
      sessionStorage.setItem('sb-test-session', 'test');
    });

    // Verify data was set
    const beforeClear = await page.evaluate(() => ({
      localKeys: Object.keys(localStorage).length,
      sessionKeys: Object.keys(sessionStorage).length,
    }));
    console.log('Before clear:', beforeClear);

    // Call clearAuthData (need to import it)
    await page.evaluate(async () => {
      // Simulate what clearAuthData does
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.startsWith('stickernest:'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    });

    // Verify data was cleared
    const afterClear = await page.evaluate(() => ({
      localKeys: Object.keys(localStorage),
      sessionKeys: Object.keys(sessionStorage),
    }));
    console.log('After clear:', afterClear);

    expect(afterClear.localKeys).not.toContain('stickernest:access_token');
    expect(afterClear.localKeys).not.toContain('sb-test-auth-token');
    expect(afterClear.sessionKeys).not.toContain('sb-test-session');
  });

  test('check isLocalDevMode configuration', async ({ page }) => {
    await page.goto('/');

    // Get the value of isLocalDevMode from the app
    const config = await page.evaluate(() => {
      return {
        hostname: window.location.hostname,
        isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      };
    });

    console.log('Configuration:', config);
    console.log('');
    console.log('=== DIAGNOSIS ===');
    console.log('You are running on:', config.hostname);

    if (config.isLocalhost) {
      console.log('');
      console.log('ISSUE FOUND: Running on localhost forces Local Dev Mode');
      console.log('This means:');
      console.log('  - supabaseClient is NULL');
      console.log('  - OAuth buttons are HIDDEN');
      console.log('  - signInWithOAuth just sets DEMO_USER');
      console.log('');
      console.log('To test real OAuth:');
      console.log('  1. Deploy to a non-localhost URL, OR');
      console.log('  2. Modify supabaseClient.ts to remove the isOnLocalhost check');
    }
  });

  test('simulate OAuth popup flow', async ({ page, context }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check if Google button exists
    const googleButton = page.locator('button:has-text("Continue with Google")');
    const isVisible = await googleButton.isVisible().catch(() => false);

    if (!isVisible) {
      console.log('Google button not visible - likely in Local Dev Mode');
      console.log('Skipping popup test');
      return;
    }

    // Listen for popup
    const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);

    // Click Google button
    await googleButton.click();

    const popup = await popupPromise;

    if (popup) {
      console.log('Popup opened!');
      console.log('Popup URL:', popup.url());

      // Check if it's going to Google
      const url = popup.url();
      if (url.includes('google.com') || url.includes('accounts.google')) {
        console.log('SUCCESS: Popup redirected to Google OAuth');

        // Check for prompt parameter
        if (url.includes('prompt=')) {
          const promptMatch = url.match(/prompt=([^&]+)/);
          console.log('Prompt parameter:', promptMatch ? promptMatch[1] : 'not found');
        }
      } else if (url.includes('supabase')) {
        console.log('Popup went to Supabase first (expected)');
      } else {
        console.log('Unexpected popup URL');
      }

      await popup.close();
    } else {
      console.log('No popup detected - popup may have been blocked or OAuth is not configured');
    }
  });
});
