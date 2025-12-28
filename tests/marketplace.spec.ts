/**
 * StickerNest v2 - Marketplace E2E Tests
 *
 * Tests for marketplace functionality including:
 * - Browsing and discovery
 * - Free item acquisition
 * - Paid item purchase flow
 * - Creator publishing
 * - Admin moderation
 */

import { test, expect, type Page } from '@playwright/test';

// ==================
// Test Helpers
// ==================

/**
 * Mock authentication for tests
 * In real tests, this would use the actual auth flow or a test user
 */
async function loginAsTestUser(page: Page) {
  // Navigate to login
  await page.goto('/login');

  // Fill in credentials
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testPassword123!');

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL('/', { timeout: 10000 });
}

/**
 * Login as a creator user
 */
async function loginAsCreator(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'creator@example.com');
  await page.fill('input[name="password"]', 'creatorPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

/**
 * Login as admin
 */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'adminPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

// ==================
// Marketplace Discovery Tests
// ==================

test.describe('Marketplace Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
  });

  test('marketplace page loads with discovery sections', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1:has-text("Marketplace")')).toBeVisible();

    // Check discovery sections exist
    await expect(page.locator('text=Trending')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Featured')).toBeVisible({ timeout: 10000 });
  });

  test('can filter by item type', async ({ page }) => {
    // Click filter dropdown
    await page.click('[data-testid="type-filter"]');

    // Select widgets
    await page.click('text=Widgets');

    // URL should update with filter
    await expect(page).toHaveURL(/itemType=canvas_widget|system_widget/);

    // Items should be filtered
    const items = page.locator('[data-testid="marketplace-item"]');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('can search for items', async ({ page }) => {
    // Type in search box
    await page.fill('[data-testid="marketplace-search"]', 'weather');
    await page.press('[data-testid="marketplace-search"]', 'Enter');

    // Wait for results
    await page.waitForTimeout(500);

    // Should show search results
    await expect(page.locator('text=Search results')).toBeVisible();
  });

  test('can view item detail page', async ({ page }) => {
    // Click on first item
    const firstItem = page.locator('[data-testid="marketplace-item"]').first();
    await firstItem.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/marketplace\//);

    // Detail page should show item info
    await expect(page.locator('[data-testid="item-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="item-description"]')).toBeVisible();
  });

  test('displays item ratings and download count', async ({ page }) => {
    // Click on an item
    const firstItem = page.locator('[data-testid="marketplace-item"]').first();
    await firstItem.click();

    // Should show ratings
    await expect(page.locator('[data-testid="item-rating"]')).toBeVisible();

    // Should show download count
    await expect(page.locator('text=downloads')).toBeVisible();
  });
});

// ==================
// Free Item Purchase Tests
// ==================

test.describe('Free Item Acquisition', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('can acquire free item immediately', async ({ page }) => {
    // Go to marketplace
    await page.goto('/marketplace');

    // Find a free item
    await page.click('[data-testid="price-filter"]');
    await page.click('text=Free');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Click on first free item
    const freeItem = page.locator('[data-testid="marketplace-item"]').first();
    await freeItem.click();

    // Click get/download button
    await page.click('[data-testid="purchase-button"]:has-text("Get Free")');

    // Should show success
    await expect(page.locator('text=Added to your library')).toBeVisible({ timeout: 5000 });

    // Button should change to "Download" or "Installed"
    await expect(page.locator('[data-testid="purchase-button"]:has-text("Download")')).toBeVisible();
  });

  test('free item appears in user library after acquisition', async ({ page }) => {
    // Acquire a free item
    await page.goto('/marketplace');
    await page.click('[data-testid="price-filter"]');
    await page.click('text=Free');
    await page.waitForTimeout(500);

    const freeItem = page.locator('[data-testid="marketplace-item"]').first();
    const itemName = await freeItem.locator('[data-testid="item-name"]').textContent();
    await freeItem.click();
    await page.click('[data-testid="purchase-button"]:has-text("Get Free")');

    // Wait for acquisition
    await page.waitForTimeout(1000);

    // Go to library
    await page.goto('/library');

    // Item should be in library
    await expect(page.locator(`text=${itemName}`)).toBeVisible();
  });

  test('cannot acquire already owned item', async ({ page }) => {
    // Go to an item we already own
    await page.goto('/marketplace/test-free-widget');

    // Button should show "Owned" or "Downloaded"
    await expect(
      page.locator('[data-testid="purchase-button"]:has-text("Owned")').or(
        page.locator('[data-testid="purchase-button"]:has-text("Download")')
      )
    ).toBeVisible();
  });
});

// ==================
// Paid Item Purchase Tests
// ==================

test.describe('Paid Item Purchase', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('shows pricing options for paid item', async ({ page }) => {
    // Navigate to a paid item
    await page.goto('/marketplace/premium-widget');

    // Should show price
    await expect(page.locator('[data-testid="item-price"]')).toBeVisible();

    // Should show purchase button
    await expect(page.locator('[data-testid="purchase-button"]:has-text("Purchase")')).toBeVisible();
  });

  test('shows subscription options when available', async ({ page }) => {
    // Navigate to item with subscription pricing
    await page.goto('/marketplace/pro-widget-pack');

    // Should show pricing options
    await expect(page.locator('text=One-time')).toBeVisible();
    await expect(page.locator('text=Monthly')).toBeVisible();
    await expect(page.locator('text=Yearly')).toBeVisible();
  });

  test('initiates Stripe checkout for paid item', async ({ page }) => {
    // Navigate to paid item
    await page.goto('/marketplace/premium-widget');

    // Click purchase
    await page.click('[data-testid="purchase-button"]:has-text("Purchase")');

    // Should redirect to Stripe or show checkout modal
    // In test mode, we mock the Stripe redirect
    await expect(
      page.locator('text=Redirecting to checkout').or(
        page.locator('text=Stripe Checkout')
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test('handles purchase success callback', async ({ page }) => {
    // Simulate returning from successful Stripe checkout
    await page.goto('/marketplace/premium-widget?purchase=success&session_id=test_session');

    // Should show success message
    await expect(page.locator('text=Purchase successful')).toBeVisible({ timeout: 5000 });

    // Should update button to owned/download
    await expect(page.locator('[data-testid="purchase-button"]:has-text("Download")')).toBeVisible();
  });

  test('handles purchase cancellation', async ({ page }) => {
    // Simulate returning from cancelled checkout
    await page.goto('/marketplace/premium-widget?purchase=cancelled');

    // Should show appropriate message
    await expect(page.locator('text=cancelled').or(page.locator('text=Purchase'))).toBeVisible();

    // Purchase button should still be available
    await expect(page.locator('[data-testid="purchase-button"]:has-text("Purchase")')).toBeVisible();
  });
});

// ==================
// Creator Publishing Tests
// ==================

test.describe('Creator Publishing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCreator(page);
  });

  test('can access creator dashboard', async ({ page }) => {
    await page.goto('/settings/creator');

    // Should show creator dashboard
    await expect(page.locator('text=Creator Dashboard')).toBeVisible();
  });

  test('shows Stripe onboarding for new creators', async ({ page }) => {
    // Use a fresh creator account
    await page.goto('/settings/creator');

    // Should show onboarding prompt
    await expect(page.locator('text=Connect with Stripe')).toBeVisible();
    await expect(page.locator('text=Start Earning')).toBeVisible();
  });

  test('can navigate to submit item form', async ({ page }) => {
    await page.goto('/marketplace/submit');

    // Should show submission form
    await expect(page.locator('text=Submit to Marketplace')).toBeVisible();
    await expect(page.locator('[data-testid="item-name-input"]')).toBeVisible();
  });

  test('can fill out item submission form', async ({ page }) => {
    await page.goto('/marketplace/submit');

    // Fill in basic info
    await page.fill('[data-testid="item-name-input"]', 'My Test Widget');
    await page.fill('[data-testid="item-description-input"]', 'A fantastic test widget for testing.');

    // Select item type
    await page.click('[data-testid="item-type-select"]');
    await page.click('text=Canvas Widget');

    // Select category
    await page.click('[data-testid="category-select"]');
    await page.click('text=Utilities');

    // Set pricing
    await page.click('[data-testid="pricing-free"]');

    // Add tags
    await page.fill('[data-testid="tags-input"]', 'test, widget, utility');

    // Form should be valid
    await expect(page.locator('[data-testid="submit-button"]:not([disabled])')).toBeVisible();
  });

  test('validates required fields on submission', async ({ page }) => {
    await page.goto('/marketplace/submit');

    // Try to submit without filling form
    await page.click('[data-testid="submit-button"]');

    // Should show validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Description is required')).toBeVisible();
  });

  test('shows items in creator dashboard', async ({ page }) => {
    await page.goto('/settings/creator');

    // Navigate to items tab
    await page.click('text=My Items');

    // Should show list of items
    await expect(page.locator('[data-testid="creator-items-list"]')).toBeVisible();
  });

  test('can view and manage item versions', async ({ page }) => {
    await page.goto('/settings/creator');
    await page.click('text=My Items');

    // Click on an item to manage versions
    await page.click('[data-testid="creator-item"]').first();

    // Should show version management
    await expect(page.locator('text=Versions')).toBeVisible();
    await expect(page.locator('[data-testid="publish-version-btn"]')).toBeVisible();
  });
});

// ==================
// Creator Earnings Tests
// ==================

test.describe('Creator Earnings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCreator(page);
    await page.goto('/settings/creator');
  });

  test('displays earnings summary', async ({ page }) => {
    // Navigate to earnings tab
    await page.click('text=Earnings');

    // Should show earnings data
    await expect(page.locator('text=Total Earnings')).toBeVisible();
    await expect(page.locator('text=Available Balance')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
  });

  test('shows payout button when balance available', async ({ page }) => {
    await page.click('text=Earnings');

    // If balance > 0, payout button should be visible
    const hasBalance = await page.locator('text=$0.00').count() === 0;
    if (hasBalance) {
      await expect(page.locator('[data-testid="request-payout-btn"]')).toBeVisible();
    }
  });

  test('can open Stripe dashboard', async ({ page }) => {
    await page.click('text=Earnings');

    // Click dashboard link
    const dashboardLink = page.locator('text=Stripe Dashboard');
    if (await dashboardLink.isVisible()) {
      // Should open in new tab (we just check the link exists)
      await expect(dashboardLink).toBeVisible();
    }
  });

  test('displays sales analytics', async ({ page }) => {
    await page.click('text=Analytics');

    // Should show analytics data
    await expect(page.locator('text=Sales')).toBeVisible();
    await expect(page.locator('text=Revenue')).toBeVisible();
  });
});

// ==================
// Admin Moderation Tests
// ==================

test.describe('Admin Moderation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('can access admin dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Should show admin dashboard
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('displays pending review queue', async ({ page }) => {
    await page.goto('/admin');

    // Should show review queue
    await expect(page.locator('text=Review Queue')).toBeVisible();
    await expect(page.locator('text=pending')).toBeVisible();
  });

  test('displays admin stats', async ({ page }) => {
    await page.goto('/admin');

    // Should show stats
    await expect(page.locator('text=Pending Review')).toBeVisible();
    await expect(page.locator('text=Approved Today')).toBeVisible();
    await expect(page.locator('text=Total Items')).toBeVisible();
  });

  test('can approve item from queue', async ({ page }) => {
    await page.goto('/admin');

    // Find an item in queue
    const reviewItem = page.locator('[data-testid="review-item"]').first();
    if (await reviewItem.isVisible()) {
      const itemName = await reviewItem.locator('[data-testid="item-name"]').textContent();

      // Click approve
      await reviewItem.locator('button:has-text("Approve")').click();

      // Item should be removed from queue
      await expect(page.locator(`text=${itemName}`)).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('can reject item with reason', async ({ page }) => {
    await page.goto('/admin');

    // Find an item in queue
    const reviewItem = page.locator('[data-testid="review-item"]').first();
    if (await reviewItem.isVisible()) {
      // Click reject
      await reviewItem.locator('button:has-text("Reject")').click();

      // Should show rejection modal
      await expect(page.locator('text=Reject')).toBeVisible();

      // Fill in reason
      await page.fill('textarea', 'Does not meet quality guidelines');

      // Submit
      await page.click('button:has-text("Reject Item")');

      // Modal should close
      await expect(page.locator('textarea')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('can toggle featured status', async ({ page }) => {
    await page.goto('/admin');

    // Navigate to items management (if separate)
    const featuredToggle = page.locator('[data-testid="featured-toggle"]').first();
    if (await featuredToggle.isVisible()) {
      await featuredToggle.click();

      // Should show confirmation
      await expect(page.locator('text=Featured').or(page.locator('text=Unfeatured'))).toBeVisible();
    }
  });
});

// ==================
// Item Rating and Comments Tests
// ==================

test.describe('Ratings and Comments', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('can rate an owned item', async ({ page }) => {
    // Navigate to an owned item
    await page.goto('/marketplace/test-owned-widget');

    // Should show rating stars
    await expect(page.locator('[data-testid="rating-stars"]')).toBeVisible();

    // Click 5 stars
    await page.locator('[data-testid="star-5"]').click();

    // Should show confirmation
    await expect(page.locator('text=Rating submitted')).toBeVisible({ timeout: 5000 });
  });

  test('can add comment on item', async ({ page }) => {
    await page.goto('/marketplace/test-owned-widget');

    // Scroll to comments section
    await page.locator('text=Comments').scrollIntoViewIfNeeded();

    // Add comment
    await page.fill('[data-testid="comment-input"]', 'This is a great widget!');
    await page.click('[data-testid="submit-comment-btn"]');

    // Comment should appear
    await expect(page.locator('text=This is a great widget!')).toBeVisible({ timeout: 5000 });
  });

  test('displays existing comments', async ({ page }) => {
    await page.goto('/marketplace/popular-widget');

    // Scroll to comments
    await page.locator('text=Comments').scrollIntoViewIfNeeded();

    // Should show comments list
    await expect(page.locator('[data-testid="comments-list"]')).toBeVisible();
  });
});

// ==================
// Sticker Pack Tests
// ==================

test.describe('Sticker Packs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('displays sticker pack preview', async ({ page }) => {
    // Navigate to a sticker pack
    await page.goto('/marketplace');
    await page.click('[data-testid="type-filter"]');
    await page.click('text=Sticker Packs');
    await page.waitForTimeout(500);

    const stickerPack = page.locator('[data-testid="marketplace-item"]').first();
    await stickerPack.click();

    // Should show sticker previews
    await expect(page.locator('[data-testid="sticker-preview"]')).toBeVisible();
  });

  test('shows sticker count in pack', async ({ page }) => {
    await page.goto('/marketplace/test-sticker-pack');

    // Should show count
    await expect(page.locator('text=stickers')).toBeVisible();
  });
});

// ==================
// Edge Cases and Error Handling
// ==================

test.describe('Error Handling', () => {
  test('shows 404 for non-existent item', async ({ page }) => {
    await page.goto('/marketplace/non-existent-item-xyz');

    // Should show not found
    await expect(page.locator('text=not found').or(page.locator('text=404'))).toBeVisible();
  });

  test('requires login for purchase', async ({ page }) => {
    // Without logging in
    await page.goto('/marketplace/premium-widget');

    // Click purchase
    await page.click('[data-testid="purchase-button"]');

    // Should redirect to login or show login modal
    await expect(
      page.locator('text=Sign in').or(page.locator('text=Log in'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('handles network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.route('**/api/marketplace/**', (route) => route.abort());

    await page.goto('/marketplace');

    // Should show error state
    await expect(
      page.locator('text=Failed').or(page.locator('text=error').or(page.locator('text=try again')))
    ).toBeVisible({ timeout: 10000 });
  });
});
