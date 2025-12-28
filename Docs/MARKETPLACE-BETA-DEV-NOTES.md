# Marketplace BETA Development Notes

This document tracks the implementation progress and architecture decisions for the StickerNest Marketplace BETA.

## Overview

The marketplace enables creators to publish and sell widgets, sticker packs, pipelines, themes, and templates. Users can browse, purchase, and use these assets in their canvases.

## Architecture Summary

### Database Schema (Prisma)

Key models in `server/db/prisma/schema.prisma`:

| Model | Purpose |
|-------|---------|
| `MarketplaceItem` | Multi-type marketplace listings |
| `MarketplaceItemVersion` | Version history for items |
| `MarketplaceRating` | 1-5 star ratings |
| `MarketplaceComment` | User comments/reviews |
| `MarketplacePurchase` | Purchase records with payout tracking |
| `CreatorAccount` | Stripe Connect for creator payouts |

### Item Types

```typescript
enum MarketplaceItemType {
  canvas_widget   // Frontend-only widgets
  system_widget   // Backend-powered widgets
  sticker_pack    // Collection of stickers
  pipeline        // AI pipeline templates
  theme           // Canvas themes
  template        // Pre-built canvas templates
}
```

### Pricing Model

- **Free items**: No payment required, instant access
- **One-time purchase**: Single payment, permanent access
- **Monthly subscription**: Recurring monthly payment
- **Yearly subscription**: Recurring yearly payment (discount)

Platform takes 15% fee (configurable in `server/config/stripe.ts`).

---

## Part 1: Core Purchase Flow (Completed)

### Files Created/Modified

| File | Description |
|------|-------------|
| `server/services/marketplace-purchase.service.ts` | **NEW** - Core purchase logic with Stripe |
| `server/controllers/marketplace-items.controller.ts` | Updated `purchaseItem` handler |
| `server/routes/marketplace.routes.ts` | Added `/purchases` route |
| `server/payments/stripe.ts` | Updated webhook for marketplace items |
| `src/state/useMarketplaceStore.ts` | **NEW** - Frontend Zustand store |
| `src/pages/WidgetDetailPage.tsx` | Connected to new purchase flow |

### API Endpoints

```
POST /api/marketplace/items/:id/purchase
  Body: { purchaseType: 'one_time' | 'monthly' | 'yearly' }
  Returns: { success, checkoutUrl?, free?, alreadyOwned? }

GET /api/marketplace/items/:id/ownership
  Returns: { success, owned: boolean, purchase?: {...} }

GET /api/marketplace/purchases
  Returns: { success, purchases: [...] }
```

### Purchase Flow

```
User clicks Purchase
    ↓
Frontend: initiatePurchase(itemId, type)
    ↓
Backend: Check if free/owned → if yes, record and return
    ↓
Backend: Get/create Stripe customer
    ↓
Backend: Get/create Stripe product & price
    ↓
Backend: Create Checkout Session with:
  - application_fee_amount (15%)
  - transfer_data → creator's Connect account
    ↓
Frontend: Redirect to Stripe Checkout
    ↓
Stripe: User pays
    ↓
Webhook: checkout.session.completed
    ↓
Backend: completePurchase()
  - Create MarketplacePurchase record
  - Update creator earnings
  - Increment download count
    ↓
User redirected back: /marketplace/:slug?purchase=success
    ↓
Frontend: completePurchase() in store, update UI
```

### Stripe Integration Notes

- Stripe Connect (Express accounts) for creator payouts
- Platform fee calculated on checkout creation
- Webhook handles purchase completion
- Support for both one-time and subscription payments

---

## Part 2: Creator Dashboard (Completed)

### Files Created/Modified

| File | Description |
|------|-------------|
| `server/services/creator-earnings.service.ts` | **NEW** - Creator earnings, analytics, Stripe Connect |
| `server/controllers/creator.controller.ts` | **NEW** - API handlers for creator endpoints |
| `server/routes/creator.routes.ts` | **NEW** - Creator API routes |
| `server/index.ts` | Registered creator routes |
| `src/state/useCreatorStore.ts` | **NEW** - Creator dashboard Zustand store |
| `src/components/creator/CreatorDashboard.tsx` | **NEW** - Main dashboard with tabs |
| `src/components/creator/CreatorOnboarding.tsx` | **NEW** - Stripe Connect onboarding flow |
| `src/components/creator/EarningsPanel.tsx` | **NEW** - Earnings summary and payout UI |
| `src/components/creator/CreatorItemsList.tsx` | **NEW** - Published items management |
| `src/components/creator/VersionManager.tsx` | **NEW** - Version publishing modal |
| `src/components/creator/index.ts` | **NEW** - Barrel exports |

### API Endpoints

```
GET /api/creator/account
  Returns: { success, account: { id, stripeAccountId, status, ... } }

POST /api/creator/connect/onboard
  Body: { email?, country? }
  Returns: { success, accountId, onboardingUrl }

GET /api/creator/earnings
  Returns: {
    totalEarnings, availableBalance, pendingBalance,
    totalPaidOut, totalSalesCount, thisMonthEarnings,
    thisMonthSales, canRequestPayout, accountStatus
  }

GET /api/creator/analytics?days=30
  Returns: {
    dailySales: [{ date, sales, revenue }],
    topItems: [{ id, name, sales, revenue, downloads, rating }],
    totalRevenue, totalSales,
    revenueByPeriod: { week, month, year }
  }

POST /api/creator/payout/request
  Returns: { success, transferId?, amount?, error? }

GET /api/creator/dashboard-link
  Returns: { success, url } (Stripe Express Dashboard)

GET /api/creator/items
  Returns: { success, items: [{ id, name, slug, status, ... }] }
```

### Creator Store State

```typescript
interface CreatorState {
  account: CreatorAccount | null;
  earnings: EarningsSummary | null;
  analytics: SalesAnalytics | null;
  items: CreatorItem[];
  isLoading: boolean;
  isLoadingEarnings: boolean;
  isLoadingAnalytics: boolean;
  isLoadingItems: boolean;
  error: string | null;
}
```

### Usage

```typescript
import { useCreatorStore } from '../state/useCreatorStore';
import { CreatorDashboard } from '../components/creator';

// In Settings page or dedicated route
function CreatorPage() {
  return <CreatorDashboard />;
}

// Or use individual components
import { CreatorOnboarding, EarningsPanel } from '../components/creator';
```

---

## Part 3: Content Publishing & Discovery (Completed)

### Files Created/Modified

| File | Description |
|------|-------------|
| `src/components/marketplace/MarketplaceSubmitForm.tsx` | **NEW** - User-friendly item submission |
| `src/components/marketplace/StickerPackUpload.tsx` | **NEW** - Sticker pack with drag-drop |
| `server/services/marketplace-discovery.service.ts` | **NEW** - Trending/featured algorithms |
| `server/controllers/marketplace-items.controller.ts` | Added discovery endpoints |
| `server/routes/marketplace.routes.ts` | Added discovery routes |

### API Endpoints

```
GET /api/marketplace/trending?limit=20&category=&priceRange=
GET /api/marketplace/discover
GET /api/marketplace/items/:id/related?limit=8
```

### Trending Algorithm

```
score = downloads_7d * 3 + downloads_30d * 1 +
        rating * ratingCount * 2 +
        min(ratingCount, 100) * 0.5 +
        viewCount * 0.1 + recencyBonus
```

Items less than 7 days old get a recency bonus.

---

## Part 4: Admin & Moderation (Completed)

### Files Created/Modified

| File | Description |
|------|-------------|
| `server/services/admin.service.ts` | **NEW** - Admin operations service |
| `server/controllers/admin.controller.ts` | **NEW** - Admin API handlers |
| `server/routes/admin.routes.ts` | **NEW** - Admin API routes |
| `server/index.ts` | Registered admin routes |
| `src/components/admin/AdminDashboard.tsx` | **NEW** - Admin review dashboard |

### API Endpoints

```
GET /api/admin/stats
GET /api/admin/review/queue
POST /api/admin/review/:id/approve
POST /api/admin/review/:id/reject
POST /api/admin/items/:id/featured
POST /api/admin/users/:id/verify
```

### Features

- Review queue with pending items
- Approve/reject workflow with reasons
- Creator verification badges
- Featured item management
- Admin dashboard with stats

### Testing Checklist (Completed)

- [x] E2E: Free item purchase - `tests/marketplace.spec.ts`
- [x] E2E: Paid item purchase (Stripe test mode) - `tests/marketplace.spec.ts`
- [x] E2E: Creator onboarding - `tests/marketplace.spec.ts`
- [x] E2E: Publishing flow - `tests/marketplace.spec.ts`
- [x] Unit: Purchase service - `server/tests/services/marketplace-purchase.service.test.ts`
- [x] Unit: Marketplace store - `src/state/useMarketplaceStore.test.ts`

### Running Tests

```bash
# Run E2E tests
npx playwright test tests/marketplace.spec.ts

# Run unit tests
npm test -- --filter=marketplace
npm test -- --filter=useMarketplaceStore
```

---

## Environment Variables

Required for marketplace functionality:

```env
# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Platform settings
PLATFORM_FEE_PERCENT=15
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://...
```

---

## Quick Reference

### Create a marketplace item (API)

```typescript
POST /api/marketplace/items
{
  "name": "My Widget",
  "description": "A cool widget",
  "itemType": "canvas_widget",
  "category": "utilities",
  "tags": ["tool", "productivity"],
  "isFree": false,
  "oneTimePrice": 499,  // $4.99 in cents
  "monthlyPrice": 199   // $1.99/mo
}
```

### Publish a version

```typescript
POST /api/marketplace/items/:id/versions
{
  "version": "1.0.0",
  "content": { /* widget manifest + code */ },
  "changelog": "Initial release"
}
```

### Check ownership in frontend

```typescript
import { useMarketplaceStore, useIsItemOwned } from '../state/useMarketplaceStore';

const isOwned = useIsItemOwned(itemId);
// or
const owned = await checkOwnership(itemId);
```

---

## Future Considerations

1. **Bundles**: Allow creators to sell widget bundles
2. **Gifting**: Purchase for another user
3. **Refunds**: Automated refund flow
4. **Affiliates**: Referral/affiliate program
5. **Coupons**: Discount codes
6. **Analytics**: Creator analytics dashboard
7. **Reviews**: Full review system (not just ratings)
8. **Localization**: Multi-currency support

---

*Last updated: December 2024*
