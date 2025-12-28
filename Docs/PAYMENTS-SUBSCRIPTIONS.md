# StickerNest v2 — Payments & Subscriptions Guide

This document describes the payment and subscription system, including tier limits, creator monetization, and widget purchases.

---

## Overview

The payment system enables:

- Subscription tiers with different feature limits
- Creator monetization through Stripe Connect
- Widget marketplace purchases
- Usage tracking and enforcement

---

## Subscription Tiers

### Tier Comparison

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| **Monthly Price** | $0 | $9.99 | $29.99 | $99.99 |
| **Yearly Price** | $0 | $99.99 | $299.99 | $999.99 |
| **Canvases** | 3 | 10 | 50 | Unlimited |
| **Widgets/Canvas** | 10 | 50 | 200 | Unlimited |
| **AI Credits/Month** | 100 | 1,000 | 10,000 | Unlimited |
| **Storage** | 100 MB | 1 GB | 10 GB | 100 GB |
| **Published Widgets** | 1 | 10 | 100 | Unlimited |
| **Custom Domains** | - | - | Yes | Yes |
| **Priority Support** | - | - | - | Yes |
| **API Access** | - | - | Yes | Yes |
| **Marketplace** | - | Yes | Yes | Yes |
| **Collaboration** | - | - | Yes | Yes |
| **Advanced Analytics** | - | - | - | Yes |

### Yearly Savings

| Tier | Monthly Cost | Yearly Cost | Savings |
|------|--------------|-------------|---------|
| Starter | $9.99/mo | $99.99/yr | ~17% |
| Pro | $29.99/mo | $299.99/yr | ~17% |
| Enterprise | $99.99/mo | $999.99/yr | ~17% |

---

## Client-Side Integration

### Checking Subscription Status

```typescript
import { SubscriptionService } from '@/payments';

// Get current subscription
const subscription = await SubscriptionService.getCurrentSubscription();

console.log('Tier:', subscription.tier);
console.log('Status:', subscription.status);
console.log('Renews at:', subscription.currentPeriodEnd);
```

### Upgrading Subscription

```typescript
import { SubscriptionService } from '@/payments';

// Create checkout for Pro tier with monthly billing
await SubscriptionService.createCheckout('pro', 'monthly');
// Redirects to Stripe Checkout
```

### Managing Subscription

```typescript
// Open customer portal
await SubscriptionService.openPortal();

// Cancel subscription (at period end)
await SubscriptionService.cancelSubscription();

// Cancel immediately
await SubscriptionService.cancelSubscription(true);

// Resume canceled subscription
await SubscriptionService.resumeSubscription();

// Change tier
await SubscriptionService.changeTier('enterprise', 'yearly');
```

### Comparing Tiers

```typescript
import { compareTiers, getTierConfig, formatPrice } from '@/payments';

// Compare tiers
const comparison = compareTiers('starter', 'pro');
// Returns: -1 (starter < pro)

// Get tier details
const proConfig = getTierConfig('pro');
console.log('Pro limits:', proConfig.limits);

// Format price
const price = formatPrice(2999);
// Returns: "$29.99"
```

---

## Usage Tracking

### Checking Usage

```typescript
import { UsageService } from '@/payments';

// Get usage summary
const usage = await UsageService.getUsageSummary();

console.log(`Canvases: ${usage.canvases.used}/${usage.canvases.limit}`);
console.log(`AI Credits: ${usage.aiCredits.used}/${usage.aiCredits.limit}`);
console.log(`Storage: ${formatBytes(usage.storage.used)}/${formatBytes(usage.storage.limit)}`);
```

### Checking Before Actions

```typescript
import { UsageService } from '@/payments';

// Check if action is allowed
const { allowed, message } = await UsageService.canPerformAction('create-canvas');

if (!allowed) {
    showUpgradePrompt(message);
    return;
}

// Proceed with action
createCanvas();
```

### Usage Categories

```typescript
interface UsageSummary {
    canvases: UsageCategory;
    widgets: UsageCategory;
    publishedWidgets: UsageCategory;
    storage: UsageCategory;
    aiCredits: UsageCategory;
    bandwidth: UsageCategory;
}

interface UsageCategory {
    used: number;
    limit: number;
    unlimited: boolean;
}
```

---

## Usage Display Utilities

```typescript
import {
    formatUsagePercent,
    getUsageStatusColor,
    formatBytes
} from '@/payments';

// Format percentage
formatUsagePercent(75, 100);  // "75%"

// Get status color
getUsageStatusColor(90, 100);  // "red" (>= 90%)
getUsageStatusColor(80, 100);  // "yellow" (>= 75%)
getUsageStatusColor(50, 100);  // "green" (< 75%)

// Format bytes
formatBytes(1073741824);  // "1 GB"
formatBytes(5242880);     // "5 MB"
```

---

## Creator Monetization

### Becoming a Creator

Creators can sell widgets on the marketplace:

```typescript
import { CreatorService } from '@/payments';

// Check creator status
const creator = await CreatorService.getCreatorAccount();

if (!creator?.onboardingComplete) {
    // Start Stripe Connect onboarding
    await CreatorService.startOnboarding();
    // Redirects to Stripe Connect
}
```

### Setting Widget Pricing

```typescript
import { CreatorService } from '@/payments';

await CreatorService.setWidgetPricing('my-widget', {
    isFree: false,
    oneTimePrice: 499,    // $4.99
    monthlyPrice: 99,     // $0.99/mo
    yearlyPrice: 999      // $9.99/yr
});
```

### Viewing Earnings

```typescript
import { CreatorService } from '@/payments';

// Get earnings summary
const earnings = await CreatorService.getEarningsSummary();

console.log('Total earnings:', formatPrice(earnings.totalEarnings));
console.log('Pending payout:', formatPrice(earnings.pendingPayout));
console.log('Sales count:', earnings.salesCount);

// Get per-widget sales
const sales = await CreatorService.getWidgetSales();

for (const sale of sales) {
    console.log(`${sale.packageName}: ${sale.salesCount} sales, ${formatPrice(sale.earnings)} earned`);
}
```

### Stripe Connect Dashboard

```typescript
// Get link to Stripe dashboard
const dashboardUrl = await CreatorService.getDashboardLink();
window.open(dashboardUrl, '_blank');
```

---

## Widget Purchases

### Checking Ownership

```typescript
import { WidgetPurchaseService } from '@/payments';

const ownership = await WidgetPurchaseService.checkOwnership('premium-widget');

if (ownership.owned) {
    console.log('Purchase type:', ownership.purchaseType);
    if (ownership.expiresAt) {
        console.log('Expires:', ownership.expiresAt);
    }
}
```

### Purchasing Widgets

```typescript
import { WidgetPurchaseService } from '@/payments';

// Get pricing
const pricing = await WidgetPurchaseService.getWidgetPricing('premium-widget');

console.log('One-time:', formatPrice(pricing.oneTimePrice));
console.log('Monthly:', formatPrice(pricing.monthlyPrice));

// Purchase (one-time)
await WidgetPurchaseService.purchaseWidget('premium-widget', 'one-time');
// Redirects to Stripe Checkout
```

### Viewing Purchased Widgets

```typescript
const purchased = await WidgetPurchaseService.getPurchasedWidgets();

for (const widget of purchased) {
    console.log(`${widget.packageName} (${widget.purchaseType})`);
    if (widget.expiresAt) {
        console.log(`Renews: ${widget.expiresAt}`);
    }
}
```

---

## Server-Side Enforcement

### Middleware Usage

```typescript
import {
    requireAuth,
    requireTier,
    requireFeature,
    checkCanvasLimit,
    checkAICredits
} from '@/server/payments';

// Require authentication
app.use('/api/protected', requireAuth());

// Require minimum tier
app.post('/api/advanced', requireTier('pro'), handler);

// Require specific feature
app.post('/api/marketplace', requireFeature('marketplace'), handler);

// Check limits before action
app.post('/api/canvas', checkCanvasLimit(), createCanvasHandler);

// Check AI credits
app.post('/api/ai/generate', checkAICredits(), generateHandler);
```

### Manual Limit Checking

```typescript
import { checkLimit, checkAllLimits } from '@/server/payments';

// Check single limit
const result = await checkLimit(userId, 'pro', 'canvas', 1);

if (!result.allowed) {
    return res.status(403).json({
        error: 'Canvas limit reached',
        limit: result.limit,
        current: result.current
    });
}

// Check multiple limits
const { allowed, results } = await checkAllLimits(userId, 'starter', [
    { type: 'canvas', amount: 1 },
    { type: 'widget', amount: 5 }
]);
```

### Tracking Usage

```typescript
import {
    trackCanvasCreated,
    trackWidgetCreated,
    trackAICredits,
    trackStorageUsed
} from '@/server/payments';

// After creating canvas
await trackCanvasCreated(userId);

// After creating widget
await trackWidgetCreated(userId);

// After AI generation
await trackAICredits(userId, 10);  // 10 credits used

// After file upload
await trackStorageUsed(userId, fileSize);
```

---

## Webhook Handling

### Stripe Webhook Events

| Event | Description |
|-------|-------------|
| `customer.subscription.created` | New subscription |
| `customer.subscription.updated` | Subscription changed |
| `customer.subscription.deleted` | Subscription canceled |
| `invoice.payment_succeeded` | Payment successful |
| `invoice.payment_failed` | Payment failed |
| `checkout.session.completed` | Checkout completed |
| `account.updated` | Connect account updated |
| `transfer.created` | Creator payout initiated |

### Webhook Configuration

```typescript
import { constructWebhookEvent, processWebhookEvent } from '@/server/payments';

app.post('/api/payments/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature'];

    try {
        const event = constructWebhookEvent(req.rawBody, signature);
        await processWebhookEvent(event);
        res.json({ received: true });
    } catch (error) {
        res.status(400).json({ error: 'Webhook failed' });
    }
});
```

### Custom Webhook Handlers

```typescript
import { webhookHandlers } from '@/server/payments';

// Add custom handler
webhookHandlers['invoice.payment_succeeded'] = async (event) => {
    const invoice = event.data.object;

    // Reset AI credits on payment
    await resetMonthlyUsage(invoice.customer);

    // Send confirmation email
    await sendPaymentConfirmation(invoice);
};
```

---

## Payment Events (Client)

### Subscribing to Events

```typescript
import { PaymentEvents } from '@/payments';

// Subscription updated
PaymentEvents.on('subscription:updated', (data) => {
    console.log('New tier:', data.tier);
    refreshUI();
});

// Usage limit approaching
PaymentEvents.on('usage:limit-approaching', (data) => {
    showWarning(`${data.type} is at ${data.percent}%`);
});

// Purchase completed
PaymentEvents.on('purchase:completed', (data) => {
    showSuccess(`Purchased ${data.widgetName}`);
    refreshLibrary();
});
```

### Event Types

```typescript
type PaymentEventType =
    | 'subscription:updated'
    | 'subscription:canceled'
    | 'usage:updated'
    | 'usage:limit-approaching'
    | 'purchase:completed';
```

---

## Error Handling

### Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Not logged in |
| `INSUFFICIENT_TIER` | Feature requires higher tier |
| `FEATURE_NOT_AVAILABLE` | Feature not in current tier |
| `LIMIT_EXCEEDED` | Usage limit reached |
| `BANDWIDTH_EXCEEDED` | Bandwidth limit reached |
| `PAYMENT_FAILED` | Payment processing failed |
| `NETWORK_ERROR` | Connection issue |

### Handling Errors

```typescript
try {
    await SubscriptionService.createCheckout('pro', 'monthly');
} catch (error) {
    if (error.code === 'PAYMENT_FAILED') {
        showPaymentError(error.message);
    } else if (error.code === 'NETWORK_ERROR') {
        showRetryOption();
    }
}
```

---

## Testing

### Test Mode

In development, use Stripe test keys:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Test Card Numbers

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0000 0000 9995 | Insufficient funds |

### Simulating Webhooks

```bash
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

---

## Security

### Best Practices

1. **Never expose secret keys** in client code
2. **Verify webhooks** with signature validation
3. **Check ownership** before granting access
4. **Rate limit** API endpoints
5. **Log** all payment events for auditing

### PCI Compliance

- Never handle raw card data
- Use Stripe Checkout or Elements
- Keep Stripe.js up to date
- Review Stripe security guidelines

---

## API Reference

### SubscriptionService

```typescript
SubscriptionService.getCurrentSubscription(): Promise<UserSubscription | null>
SubscriptionService.getTiers(): typeof SUBSCRIPTION_TIERS
SubscriptionService.getTierConfig(tier: SubscriptionTier): TierConfig
SubscriptionService.createCheckout(tier: SubscriptionTier, interval: BillingInterval): Promise<CheckoutSessionResponse | null>
SubscriptionService.openPortal(): Promise<PortalSessionResponse | null>
SubscriptionService.cancelSubscription(immediately?: boolean): Promise<boolean>
SubscriptionService.resumeSubscription(): Promise<boolean>
SubscriptionService.changeTier(tier: SubscriptionTier, interval: BillingInterval): Promise<boolean>
```

### UsageService

```typescript
UsageService.getUsageSummary(): Promise<UsageSummary | null>
UsageService.getUsageHistory(months?: number): Promise<UsageSummary[]>
UsageService.canPerformAction(action: string): Promise<{ allowed: boolean; message?: string }>
UsageService.getRemainingAICredits(): Promise<number>
```

### CreatorService

```typescript
CreatorService.getCreatorAccount(): Promise<CreatorAccount | null>
CreatorService.startOnboarding(): Promise<ConnectOnboardingResponse | null>
CreatorService.getDashboardLink(): Promise<string | null>
CreatorService.setWidgetPricing(packageId: string, pricing: WidgetPricing): Promise<boolean>
CreatorService.getEarningsSummary(): Promise<EarningsSummary | null>
CreatorService.getWidgetSales(packageId?: string): Promise<WidgetSale[]>
```

### WidgetPurchaseService

```typescript
WidgetPurchaseService.checkOwnership(packageId: string): Promise<Ownership>
WidgetPurchaseService.getWidgetPricing(packageId: string): Promise<WidgetPricing | null>
WidgetPurchaseService.purchaseWidget(packageId: string, priceType: PriceType): Promise<CheckoutSessionResponse | null>
WidgetPurchaseService.getPurchasedWidgets(): Promise<PurchasedWidget[]>
```

---

## Related Documentation

- [Marketplace Publishing](./MARKETPLACE-PUBLISHING.md) - Publishing widgets
- [Architecture](./ARCHITECTURE.md) - System design
- [Widget Development](./WIDGET-DEVELOPMENT.md) - Creating widgets
