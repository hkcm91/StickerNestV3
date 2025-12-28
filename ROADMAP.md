# StickerNest v2 - Roadmap to Production

> Last updated: 2025-12-06

## Vision

StickerNest is a visual web operating system where users can:
- Build interactive canvases with AI-generated widgets
- Connect widgets with visual data pipelines
- Publish canvases as shareable/embeddable web pages
- Buy/sell widgets in a creator marketplace
- Monetize their canvas ecosystems

---

## Current State: 52% Complete

### What's Working
| Feature | Status | Notes |
|---------|--------|-------|
| User Authentication | 100% | Signup, login, JWT, refresh tokens |
| Canvas Editor | 95% | Full editor with save, auto-save, widgets |
| Built-in Widgets | 100% | 8 widgets: Clock, Weather, Notes, etc. |
| Widget Runtime | 100% | Sandbox, postMessage, EventBus |
| AI Generation | 90% | 5+ providers, FLUX, SDXL, DALL-E |
| Marketplace Browse | 100% | Search, filter, categories |
| Canvas Publishing | 85% | Visibility, slugs, versioning |
| Embed Infrastructure | 90% | Tokens, origin whitelisting, tracking |
| User Subscriptions | 85% | Stripe checkout, tiers, webhooks |
| Dashboard | 100% | Stats, canvas list, create new |
| Settings Page | 100% | Profile, Billing, Creator tabs |

### Critical Gaps (Blocking Monetization)
| Feature | Status | Blocker |
|---------|--------|---------|
| Widget Purchase | 30% | Endpoint returns "not implemented" |
| Creator Payouts | 50% | Returns hardcoded zeros |
| Schema Fields | Missing | `installCount`, `totalEarnings` |
| Embed Config UI | 40% | API exists, no frontend |

---

## Phase 1: Core Monetization [PRIORITY: CRITICAL]

### 1.1 Schema Fixes (Day 1)
Fix database schema inconsistencies that block payment webhooks.

- [ ] Add `installCount` to WidgetPackage model
- [ ] Add `totalEarnings` to WidgetPackage model
- [ ] Verify CreatorAccount relationships
- [ ] Run Prisma migration

### 1.2 Widget Purchase Flow (Days 2-4)
Implement the complete widget purchase checkout.

- [ ] Implement `POST /api/payments/widgets/:packageId/purchase`
- [ ] Create Stripe Checkout session with widget metadata
- [ ] Update `checkout.session.completed` webhook handler
- [ ] Record purchase in `WidgetPurchase` table
- [ ] Grant widget access after purchase
- [ ] Calculate creator split (85% creator, 15% platform)
- [ ] Add purchase button to marketplace widget cards
- [ ] Add "My Purchases" section to dashboard

### 1.3 Creator Payouts (Days 5-7)
Wire up real earnings data and Stripe Connect transfers.

- [ ] Implement `GET /api/payments/creator/earnings` with real DB queries
- [ ] Implement `GET /api/payments/creator/sales` with real data
- [ ] Create Stripe Connect transfer on widget purchase
- [ ] Track pending vs available balance
- [ ] Wire Creator Settings tab to real data
- [ ] Add earnings chart to creator dashboard

---

## Phase 2: Embed & Publishing (Week 2)

### 2.1 Embed Token Management UI
- [ ] Add "Embed" tab to Settings page
- [ ] List existing embed tokens with status
- [ ] Create new token with origin whitelist
- [ ] Revoke/delete tokens
- [ ] Copy embed code snippet (iframe)
- [ ] Preview embedded canvas

### 2.2 Canvas Publishing Flow
- [ ] Add "Publish" button to EditorPage toolbar
- [ ] Publish modal with visibility options (private/unlisted/public)
- [ ] Auto-generate slug from title
- [ ] Show shareable URL after publish
- [ ] Preview published canvas
- [ ] Add to EditorPage: share icon with copy link

### 2.3 Public Canvas Viewer
- [ ] Create `/c/:slug` route for public canvases
- [ ] Read-only canvas view
- [ ] Canvas metadata (title, author, description)
- [ ] "Remix" button to fork canvas
- [ ] Share buttons (Twitter, copy link)

---

## Phase 3: Marketplace Completion (Week 3)

### 3.1 Widget Detail Page
- [ ] Create `/marketplace/:id` route
- [ ] Full widget detail view with preview
- [ ] Live widget demo (sandboxed)
- [ ] Reviews and ratings display
- [ ] Rating submission form
- [ ] Purchase/Install button
- [ ] Creator profile link

### 3.2 Widget Publishing Flow
- [ ] "Publish Widget" button in Editor
- [ ] Widget submission form (name, description, category)
- [ ] Set pricing (free/one-time/subscription)
- [ ] Upload preview images/video
- [ ] Widget review queue (for paid widgets)
- [ ] Version management

### 3.3 Creator Dashboard Enhancement
- [ ] Published widgets list with stats
- [ ] Sales analytics with charts
- [ ] Revenue breakdown by widget
- [ ] Payout history table
- [ ] Request payout button
- [ ] Download sales reports

---

## Phase 4: Polish & Quality (Week 4)

### 4.1 Error Handling
- [ ] Global error boundary with recovery
- [ ] API error toast notifications
- [ ] Retry logic for transient failures
- [ ] Offline detection and warnings

### 4.2 Loading States
- [ ] Skeleton loaders for all pages
- [ ] Progressive image loading
- [ ] Optimistic UI updates

### 4.3 Testing
- [ ] Integration tests for payment flows
- [ ] E2E tests for critical paths
- [ ] Widget sandbox security tests

### 4.4 Documentation
- [ ] Complete Swagger/OpenAPI specs
- [ ] Widget development guide
- [ ] Embed integration guide
- [ ] API reference

---

## Future Phases

### Phase 5: Real-time Collaboration
- WebSocket presence indicators
- Cursor sharing
- Concurrent editing with CRDT
- Comments and annotations

### Phase 6: Digital Products
- Generic Product model (beyond widgets)
- Digital asset upload and delivery
- Download management
- License key generation

### Phase 7: Physical Products
- Shipping address collection
- Inventory management
- Order fulfillment tracking
- Shipping label integration

### Phase 8: B2B/Enterprise
- SSO (SAML/OIDC)
- Team workspaces
- Role-based access control
- Audit logging
- White-label option

---

## Success Metrics

### Phase 1 Complete When:
- [ ] User can purchase a widget from marketplace
- [ ] Creator receives 85% in Stripe Connect
- [ ] Platform receives 15% fee
- [ ] Purchase history visible in dashboard

### Phase 2 Complete When:
- [ ] User can embed canvas on external site
- [ ] Embed tokens manageable in Settings
- [ ] Published canvas accessible via slug URL

### Phase 3 Complete When:
- [ ] Widget detail pages with reviews
- [ ] Creator can publish and price widgets
- [ ] Full sales analytics available

---

## Revenue Model

### Subscription Tiers
| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 3 canvases, 50 AI/month, basic widgets |
| Pro | $9.99/mo | Unlimited canvases, 500 AI/month, all widgets |
| Creator | $29.99/mo | Everything + publish to marketplace, revenue share |

### Marketplace Revenue
- 15% platform fee on widget sales
- 85% to creators
- Instant payout via Stripe Connect

---

## Technical Debt Backlog

- [ ] Consolidate `isLocalDevMode` checks into HOC/hook
- [ ] Replace inline styles with CSS modules (1000+ occurrences)
- [ ] Reduce `any` types throughout codebase
- [ ] Add proper logging with correlation IDs
- [ ] Implement request rate limiting per user
- [ ] Add Redis caching for marketplace queries
- [ ] Database query optimization (N+1 issues)

---

## Notes

- Solo founder with AI assistance
- Ship fast, iterate based on feedback
- Focus on core monetization loop first
- Technical debt is acceptable if shipping faster
