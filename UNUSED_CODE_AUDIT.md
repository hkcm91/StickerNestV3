# StickerNestV2 - Comprehensive Unused & Redundant Code Audit

**Date:** December 11, 2025
**Codebase Size:** 421 frontend files, 114 backend files (~150,000+ lines)

---

## Executive Summary

This audit identified significant amounts of unused and redundant code that should be addressed:

| Category | Items Found | Estimated Lines | Priority |
|----------|-------------|-----------------|----------|
| Completely Unused Files | 8+ | ~2,500 | HIGH |
| Unused Exports/Functions | 101+ | ~3,000 | HIGH |
| Duplicate Implementations | 15+ | ~5,000 | MEDIUM |
| Unused Backend Modules | 4 | ~2,000 | HIGH |
| Stub/Incomplete Code | 5+ | ~200 | MEDIUM |
| Unused Dependencies | 4 | N/A | LOW |

**Total estimated dead/redundant code: ~12,700+ lines (8-10% of codebase)**

---

## SECTION 1: COMPLETELY UNUSED FILES (HIGH PRIORITY - SCRAP)

### 1.1 Empty/Placeholder Files
| File | Size | Recommendation |
|------|------|----------------|
| `src/state/useRuntimeStore.ts` | 0 bytes | **DELETE** |

### 1.2 Entirely Unused Infrastructure Files
| File | Lines | Description | Recommendation |
|------|-------|-------------|----------------|
| `src/runtime/PanelEventHandlers.ts` | ~200 | 21 exports, zero imports anywhere | **DELETE** |
| `server/services/cache.service.ts` | ~150 | Cache service never imported | **DELETE or UTILIZE** |
| `server/test_import.ts` | 1 | Debug leftover | **DELETE** |

### 1.3 Commented-Out Route Modules (Backend)
| File | Lines | Description | Recommendation |
|------|-------|-------------|----------------|
| `server/payments/` (entire directory) | ~1,000 | Complete payment system, never connected | **SCRAP or COMPLETE** |
| `server/routes/embed.routes.ts` | ~700 | Full embed API, commented out in index.ts | **UTILIZE or SCRAP** |

---

## SECTION 2: UNUSED EXPORTS BY CATEGORY

### 2.1 Unused Hooks (19 hooks - 21% of hook library)

| Hook | File | Recommendation |
|------|------|----------------|
| `usePermission` | `src/hooks/usePermission.ts` | SCRAP - no permission UI exists |
| `usePermissionCheck` | `src/hooks/usePermission.ts` | SCRAP |
| `usePermissionNotifications` | `src/hooks/usePermission.ts` | SCRAP |
| `useMediaQuery` | `src/hooks/useResponsive.ts` | UTILIZE for responsive design |
| `useIsMobile` | `src/hooks/useResponsive.ts` | UTILIZE |
| `useIsTablet` | `src/hooks/useResponsive.ts` | UTILIZE |
| `useIsDesktop` | `src/hooks/useResponsive.ts` | UTILIZE |
| `useWidgetCapabilities` | `src/hooks/useWidgetCapabilities.ts` | Review - may be needed |
| `useWidgetAssets` | `src/hooks/useWidgetAssets.ts` | SCRAP if unused |
| `useWidgetSkin` | `src/hooks/useWidgetSkin.ts` | Review - skin system active? |

### 2.2 Unused Utility Functions (12+ functions)

**From `src/utils/panelUtils.ts`:**
| Function | Description | Recommendation |
|----------|-------------|----------------|
| `calculateBringToFrontZIndex` | Z-index calculation | Review - may be used dynamically |
| `calculateCascadedPosition` | Panel cascade positioning | SCRAP |
| `calculateCenteredPosition` | Center panel on screen | SCRAP |
| `isPointInPanel` | Hit testing | SCRAP |
| `isPointInPanelHeader` | Hit testing | SCRAP |
| `normalizeZIndices` | Z-index normalization | SCRAP |
| `getNextPanelPosition` | Panel positioning | SCRAP |
| `clampPosition` | Position clamping | SCRAP |
| `generatePanelId` | ID generation | SCRAP |

### 2.3 Unused Runtime Classes (11 classes)

| Class | File | Lines | Recommendation |
|-------|------|-------|----------------|
| `AIPipelinePlanner` | `src/runtime/AIPipelinePlanner.ts` | ~300 | Review - AI feature planned? |
| `WidgetAPIHost` | `src/runtime/WidgetAPIHost.ts` | ~400 | Review - widget API active? |
| `WidgetHandshakeManager` | `src/runtime/WidgetHandshakeManager.ts` | ~200 | Review |
| `SkinManager` | `src/runtime/SkinManager.ts` | ~250 | Review - skin system active? |
| `DeveloperModeManager` | `src/runtime/DeveloperModeManager.ts` | ~150 | UTILIZE or SCRAP |
| `BroadcastChannelTransport` | `src/runtime/transports/` | ~100 | SCRAP - not used |
| `SharedWorkerTransport` | `src/runtime/transports/` | ~100 | SCRAP - not used |
| `WebSocketTransport` | `src/runtime/transports/` | ~100 | SCRAP - not used |

### 2.4 Unused Services

| Service | File | Lines | Recommendation |
|---------|------|-------|----------------|
| `AssetLineageEngine` | `src/services/AssetLineageEngine.ts` | ~400 | SCRAP - never activated |
| `LicenseEnforcementService` | `src/services/LicenseEnforcement.ts` | ~300 | SCRAP or COMPLETE for monetization |
| `PipelineConflictDetector` | `src/services/PipelineConflictDetector.ts` | ~200 | Review |

### 2.5 Unused State Stores

| Store | File | Recommendation |
|-------|------|----------------|
| `useRuntimeStore` | `src/state/useRuntimeStore.ts` | **DELETE** (empty file) |
| `useSlotStore` | `src/state/useSlotStore.ts` | Review usage |

### 2.6 Unused Components

| Component | File | Recommendation |
|-----------|------|----------------|
| `PermissionDialog` | `src/components/PermissionDialog.tsx` | SCRAP - permission system unused |

### 2.7 Unused Constants (22 of 24 exports)

**From `src/constants/terminology.ts`:**
- Only 2 of 24 exports are actually used
- Constants for canvas modes, widget sources, visibility states, etc.
- **Recommendation:** Keep only used constants, SCRAP the rest

---

## SECTION 3: DUPLICATE/REDUNDANT IMPLEMENTATIONS (CONSOLIDATE)

### 3.1 Library Panel Components (MAJOR - 3 implementations)

| Implementation | Location | Lines | Status |
|----------------|----------|-------|--------|
| WidgetLibrary | `src/components/WidgetLibrary/` | ~1,900 | Active |
| LibraryPanel | `src/components/LibraryPanel/` | ~4,000 | Active |
| WidgetLibraryPanel | `src/widget-lab/components/` | ~300 | Lab-only |

**Recommendation:** Consolidate into single implementation. These serve the same purpose.

### 3.2 AI Generation Services (3 implementations)

| Service | File | Lines | Version |
|---------|------|-------|---------|
| `widgetGenerator` | `src/services/widgetGenerator.ts` | 585 | v1 |
| `enhancedAIGenerator` | `src/services/enhancedAIGenerator.ts` | 1,471 | v2.1.0 |
| `aiGeneration` | `src/services/aiGeneration.ts` | 680 | Model-agnostic |

**Recommendation:** Consolidate into single service with unified API.

### 3.3 Properties Panel Components (3 variants)

| Component | File | Purpose |
|-----------|------|---------|
| `PropertiesPanel` | `src/components/PropertiesPanel.tsx` | Main |
| `PropertiesPanel` | `src/components/editor/PropertiesPanel.tsx` | Editor |
| `StickerPropertiesPanel` | `src/components/StickerPropertiesPanel.tsx` | Stickers |

**Recommendation:** Unify into composable properties panel.

### 3.4 Toolbar Components (7 implementations)

| Toolbar | File |
|---------|------|
| `CreativeToolbar` | `src/components/CreativeToolbar.tsx` |
| `AdaptiveToolbar` | `src/components/AdaptiveToolbar.tsx` |
| `ContextToolbar` | `src/components/ContextToolbar.tsx` |
| `TransformToolbar` | `src/components/TransformToolbar.tsx` |
| `EditorToolbar` | `src/components/editor/EditorToolbar.tsx` |
| `DevToolbar` | `src/components/dev/DevToolbar.tsx` |
| `CanvasToolbar` | `src/components/CanvasToolbar.tsx` |

**Recommendation:** Review which are needed; consolidate where possible.

### 3.5 Canvas State Management (3 stores with overlap)

| Store | File | Size | Concern |
|-------|------|------|---------|
| `useCanvasStore` | `src/state/useCanvasStore.ts` | 40KB | Core canvas state |
| `useCanvasExtendedStore` | `src/state/useCanvasExtendedStore.ts` | 25KB | Extended features |
| `useCanvasRouterStore` | `src/state/useCanvasRouterStore.ts` | 7KB | Canvas routing |

**Recommendation:** Evaluate consolidation potential.

### 3.6 Validator Implementations (6 validators)

| Validator | File | Overlap |
|-----------|------|---------|
| `manifestValidator` | `src/utils/manifestValidator.ts` | Manifest structure |
| `specJsonValidator` | `src/utils/specJsonValidator.ts` | SpecJSON format |
| `WidgetValidator` | `src/marketplace/WidgetValidator.ts` | Marketplace |
| `PipelineValidator` | `src/runtime/PipelineValidator.ts` | Pipelines |
| `SecurityValidator` | `src/ai/security/SecurityValidator.ts` | Security |
| `CodeValidator` | `src/ai/security/CodeValidator.ts` | Code safety |

**Recommendation:** Create shared validation utilities.

### 3.7 Duplicate libraryUtils Functions

**From `src/utils/libraryUtils.ts`:**
- `searchWidgets()` / `searchStickers()` - Nearly identical
- `sortWidgets()` / `sortStickers()` - Nearly identical
- `filterWidgets()` / `filterStickers()` - Nearly identical
- `groupWidgetsByCategory()` / `groupStickersByCategory()` - Nearly identical

**Recommendation:** Create generic functions that work for both.

---

## SECTION 4: UNUSED BACKEND CODE

### 4.1 Complete Unused Modules

| Module | Location | Lines | Description |
|--------|----------|-------|-------------|
| Payments | `server/payments/` | ~1,000 | Stripe integration, never connected |
| Embed Routes | `server/routes/embed.routes.ts` | ~700 | Full API, commented out |
| Cache Service | `server/services/cache.service.ts` | ~150 | Never imported |

### 4.2 Unused Middleware Functions

| Function | File | Status |
|----------|------|--------|
| `requestLogger` | `server/middleware/logger.middleware.ts` | Unused (use requestLoggerWithFilter) |
| `bodyLogger` | `server/middleware/logger.middleware.ts` | Never called |
| `slowRequestLogger` | `server/middleware/logger.middleware.ts` | Never called |
| `simpleCorsOptions` | `server/middleware/cors.middleware.ts` | Never used |
| `createCorsMiddleware` | `server/middleware/cors.middleware.ts` | Never called |
| `handlePreflight` | `server/middleware/cors.middleware.ts` | Never called |
| `createLimiter` | `server/middleware/rateLimit.middleware.ts` | Never called |

### 4.3 Stub/Incomplete Implementations

| Function | File | Line | Issue |
|----------|------|------|-------|
| `executePipeline` | `server/controllers/ai.controller.ts` | 89-98 | Returns "not implemented" |
| `purchaseItem` | `server/controllers/marketplace-items.controller.ts` | 267-293 | Missing Stripe integration |

---

## SECTION 5: UNUSED DEPENDENCIES

### 5.1 Frontend (package.json)

| Package | Type | Reason |
|---------|------|--------|
| `dotenv` | devDependency | Vite uses `loadEnv()` instead |
| `madge` | devDependency | Not used in any scripts |

### 5.2 Backend (server/package.json)

| Package | Type | Reason |
|---------|------|--------|
| `multer` | dependency | No file upload implementation |
| `sharp` | dependency | No image processing implementation |

### 5.3 Duplicate Dependencies (Different Versions)

| Package | Frontend | Backend |
|---------|----------|---------|
| `replicate` | v1.4.0 | v0.34.1 |
| `zod` | v4.1.13 | v3.23.8 |

---

## SECTION 6: ROUTING ISSUES

### 6.1 Duplicate Editor Routes

| Route | Component | Issue |
|-------|-----------|-------|
| `/app` | MainApp (App.tsx) | Redundant with /canvas/:canvasId |
| `/canvas/:canvasId` | MainApp (App.tsx) | Primary route |
| `/editor/:canvasId` | EditorPage.tsx | Separate implementation |

**Recommendation:** Choose one editor implementation, remove duplicate routes.

### 6.2 Demo Routes (Consider for Production)

| Route | Component | Lines |
|-------|-----------|-------|
| `/demo/business-card` | BusinessCardDemoPage | 162 |
| `/demo/messaging` | DemoMessagingPage | 521 |
| `/gallery` | GalleryPage | 880 |

**Recommendation:** Feature-flag or remove for production.

### 6.3 Temporary Alpha Access

**File:** `src/pages/LandingPage.tsx` (lines 327, 855)
```typescript
// TODO: Remove for production launch - temporary alpha access
```

**Recommendation:** Remove before production.

---

## SECTION 7: RECOMMENDATIONS SUMMARY

### Immediate Actions (HIGH Priority)

1. **DELETE empty file:** `src/state/useRuntimeStore.ts`
2. **DELETE unused infrastructure:** `src/runtime/PanelEventHandlers.ts`
3. **DECIDE on payments module:** Either complete integration or remove `server/payments/`
4. **DECIDE on embed routes:** Either enable or remove `server/routes/embed.routes.ts`
5. **Remove temporary alpha access** from LandingPage before production

### Short-term Actions (MEDIUM Priority)

6. **Consolidate Library Panels:** Merge WidgetLibrary and LibraryPanel
7. **Consolidate AI Services:** Unify 3 generation services
8. **Remove unused hooks:** Permission hooks, asset hooks if not planned
9. **Clean up unused middleware:** Backend middleware functions
10. **Remove unused dependencies:** dotenv, madge, multer, sharp

### Long-term Actions (LOW Priority)

11. **Consolidate toolbars:** Review 7 toolbar implementations
12. **Unify validators:** Create shared validation base
13. **Consolidate canvas stores:** Evaluate merging potential
14. **Generic library utilities:** Replace duplicate widget/sticker functions
15. **Review runtime classes:** Decide which to keep/scrap

---

## SECTION 8: FILE REFERENCE LIST

### Files Safe to Delete
```
src/state/useRuntimeStore.ts
src/runtime/PanelEventHandlers.ts
server/test_import.ts
```

### Files to Review for Deletion
```
src/hooks/usePermission.ts
src/components/PermissionDialog.tsx
src/runtime/transports/BroadcastChannelTransport.ts
src/runtime/transports/SharedWorkerTransport.ts
src/runtime/transports/WebSocketTransport.ts
src/services/AssetLineageEngine.ts
src/services/LicenseEnforcement.ts
server/services/cache.service.ts
```

### Modules to Decide On
```
server/payments/ (entire directory)
server/routes/embed.routes.ts
```

### Duplicate Files to Consolidate
```
src/components/WidgetLibrary/ + src/components/LibraryPanel/
src/services/widgetGenerator.ts + enhancedAIGenerator.ts + aiGeneration.ts
src/components/PropertiesPanel.tsx + editor/PropertiesPanel.tsx + StickerPropertiesPanel.tsx
```

---

*This audit should be re-run periodically as the codebase evolves.*
