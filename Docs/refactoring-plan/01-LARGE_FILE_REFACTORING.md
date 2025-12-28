# Large File Refactoring Plan

> Break up files over 1000 lines into maintainable modules

---

## PRIORITY 1: CRITICAL (Over 2000 lines)

### 1.1 WidgetLab.tsx (3,105 lines)
**Location**: `src/widget-lab/WidgetLab.tsx`
**Risk**: MEDIUM - Isolated feature

#### Current Structure:
- Widget creation/editing UI
- Code editor integration
- Preview system
- Testing interface
- Connection testing

#### Refactoring Plan:

**Task 1.1.1: Extract CodeEditorPanel**
```
src/widget-lab/
  ├── WidgetLab.tsx (main orchestrator, ~500 lines)
  ├── components/
  │   ├── CodeEditorPanel.tsx (~400 lines)
  │   ├── PreviewPanel.tsx (~400 lines)
  │   ├── TestingPanel.tsx (~350 lines)
  │   ├── ConnectionTester.tsx (existing, ~728 lines)
  │   ├── ManifestEditor.tsx (~300 lines)
  │   ├── OutputConsole.tsx (~200 lines)
  │   └── WidgetLabToolbar.tsx (~200 lines)
  └── hooks/
      ├── useWidgetLabState.ts (~300 lines)
      ├── useCodeExecution.ts (~200 lines)
      └── useWidgetPreview.ts (~200 lines)
```

**Subtasks:**
- [ ] 1.1.1.1: Create `components/` subdirectory
- [ ] 1.1.1.2: Extract CodeEditorPanel with Monaco integration
- [ ] 1.1.1.3: Extract PreviewPanel with iframe sandbox
- [ ] 1.1.1.4: Extract TestingPanel with test runner
- [ ] 1.1.1.5: Extract ManifestEditor with JSON schema validation
- [ ] 1.1.1.6: Extract OutputConsole for logs/errors
- [ ] 1.1.1.7: Create useWidgetLabState hook for shared state
- [ ] 1.1.1.8: Update WidgetLab.tsx as composition root
- [ ] 1.1.1.9: Add tests for each component
- [ ] 1.1.1.10: Verify all functionality still works

---

### 1.2 SettingsPage.tsx (2,446 lines)
**Location**: `src/pages/SettingsPage.tsx`
**Risk**: MEDIUM - User-facing page

#### Current Structure:
- Multiple settings sections (Profile, API, Theme, etc.)
- Form handling
- API integrations
- Subscription management

#### Refactoring Plan:

**Task 1.2.1: Extract Settings Sections**
```
src/pages/settings/
  ├── SettingsPage.tsx (router/layout, ~200 lines)
  ├── sections/
  │   ├── ProfileSection.tsx (~300 lines)
  │   ├── APIKeysSection.tsx (~350 lines)
  │   ├── ThemeSection.tsx (~250 lines)
  │   ├── NotificationSection.tsx (~200 lines)
  │   ├── PrivacySection.tsx (~200 lines)
  │   ├── SubscriptionSection.tsx (~400 lines)
  │   ├── DangerZoneSection.tsx (~150 lines)
  │   └── index.ts
  ├── components/
  │   ├── SettingsNav.tsx (~100 lines)
  │   ├── SettingsHeader.tsx (~50 lines)
  │   └── SettingItem.tsx (~80 lines)
  └── hooks/
      ├── useSettingsForm.ts (~150 lines)
      └── useAPIKeyManagement.ts (~200 lines)
```

**Subtasks:**
- [ ] 1.2.1.1: Create `pages/settings/` directory structure
- [ ] 1.2.1.2: Extract ProfileSection with avatar upload
- [ ] 1.2.1.3: Extract APIKeysSection with key management
- [ ] 1.2.1.4: Extract ThemeSection with theme picker
- [ ] 1.2.1.5: Extract NotificationSection
- [ ] 1.2.1.6: Extract PrivacySection
- [ ] 1.2.1.7: Extract SubscriptionSection with Stripe
- [ ] 1.2.1.8: Extract DangerZoneSection (delete account)
- [ ] 1.2.1.9: Create SettingsNav component
- [ ] 1.2.1.10: Update routes to use new structure
- [ ] 1.2.1.11: Test all settings save correctly

---

### 1.3 CanvasRenderer.tsx (2,433 lines)
**Location**: `src/components/CanvasRenderer.tsx`
**Risk**: HIGH - May be deprecated (check if MainCanvas replaces it)

#### Analysis Needed:
- [ ] 1.3.0.1: Determine if this is still used or deprecated
- [ ] 1.3.0.2: If deprecated, remove entirely
- [ ] 1.3.0.3: If used, plan split carefully (HIGH RISK)

**Note**: MainCanvas.tsx appears to be the primary canvas now. Verify before touching.

---

### 1.4 apiClient.ts (2,059 lines)
**Location**: `src/services/apiClient.ts`
**Risk**: MEDIUM - Core service but well-isolated
**Status**: Analysis completed (Dec 2024)

#### Current Structure (Actual):
- **Types** (lines 1-195): ApiResponse, UserProfile, Canvas, Marketplace types, etc.
- **Token Management** (lines 198-259): setAccessToken, getAccessToken, clearAuthData, cacheUser
- **HTTP Client** (lines 261-430): Base `request()` function with JWT refresh
- **15 API Modules** (lines 434-2059):
  - authApi (line 434) - Login, logout, tokens, password reset
  - canvasApi (line 556) - CRUD, sharing, versions
  - marketplaceItemsApi (line 727) - Item management
  - marketplaceApi (line 950) - Listings, purchases
  - userApi (line 1084) - Profile, stats
  - followApi (line 1152) - Follow/unfollow
  - favoritesApi (line 1236) - Favorites management
  - notificationsApi (line 1365) - Notifications
  - searchApi (line 1459) - Global search
  - commentsApi (line 1535) - Canvas comments
  - collectionsApi (line 1627) - Canvas collections
  - templatesApi (line 1735) - Templates
  - reviewsApi (line 1804) - Widget reviews
  - verificationApi (line 1872) - Creator verification
  - oauthApi (line 1918) - OAuth handling

#### Refactoring Plan:

**Task 1.4.1: Split by Domain (Updated)**
```
src/services/api/
  ├── index.ts          # Re-exports everything (backward compatible)
  ├── types.ts          # All shared types (~300 lines)
  ├── client.ts         # Token management + request() (~200 lines)
  ├── auth.ts           # authApi (~120 lines)
  ├── canvas.ts         # canvasApi (~170 lines)
  ├── marketplace.ts    # marketplaceItemsApi + marketplaceApi (~350 lines)
  ├── user.ts           # userApi (~70 lines)
  ├── social.ts         # followApi + favoritesApi + commentsApi (~280 lines)
  ├── notifications.ts  # notificationsApi (~90 lines)
  ├── search.ts         # searchApi (~75 lines)
  ├── collections.ts    # collectionsApi (~110 lines)
  ├── templates.ts      # templatesApi (~70 lines)
  ├── reviews.ts        # reviewsApi (~70 lines)
  └── verification.ts   # verificationApi + oauthApi (~140 lines)
```

**Migration Strategy:**
1. Create api/ directory structure
2. Extract types.ts first (no dependencies)
3. Extract client.ts (depends on types)
4. Extract API modules one at a time
5. Keep apiClient.ts as a re-export file for backward compatibility
6. Gradually update imports across codebase

**Subtasks:**
- [ ] 1.4.1.1: Create `services/api/` directory
- [ ] 1.4.1.2: Extract types.ts with all interfaces
- [ ] 1.4.1.3: Extract client.ts with HTTP/token logic
- [ ] 1.4.1.4: Extract auth.ts (authApi)
- [ ] 1.4.1.5: Extract canvas.ts (canvasApi)
- [ ] 1.4.1.6: Extract marketplace.ts (both marketplace APIs)
- [ ] 1.4.1.7: Extract user.ts (userApi)
- [ ] 1.4.1.8: Extract social.ts (followApi, favoritesApi, commentsApi)
- [ ] 1.4.1.9: Extract remaining modules
- [ ] 1.4.1.10: Create index.ts with re-exports
- [ ] 1.4.1.11: Update apiClient.ts to re-export from api/
- [ ] 1.4.1.12: Test all API calls work
- [ ] 1.4.1.13: Gradually update imports in other files

---

## PRIORITY 2: HIGH (1000-2000 lines)

### 2.1 StyleGalleryPanel.tsx (1,808 lines)
**Location**: `src/components/WidgetGenerator2/StyleGalleryPanel.tsx`

**Subtasks:**
- [ ] 2.1.1: Extract StyleCard component
- [ ] 2.1.2: Extract StyleGrid component
- [ ] 2.1.3: Extract StylePreview component
- [ ] 2.1.4: Extract useStyleGallery hook
- [ ] 2.1.5: Update StyleGalleryPanel as composition

---

### 2.2 enhancedAIGenerator.ts (1,471 lines)
**Location**: `src/services/enhancedAIGenerator.ts`

**Subtasks:**
- [ ] 2.2.1: Extract prompt building logic
- [ ] 2.2.2: Extract response parsing logic
- [ ] 2.2.3: Extract validation logic
- [ ] 2.2.4: Create AIGeneratorService class

---

### 2.3 LiveChatWidget.ts (1,450 lines)
**Location**: `src/widgets/builtin/social/LiveChatWidget.ts`

**Subtasks:**
- [ ] 2.3.1: Extract ChatMessage component
- [ ] 2.3.2: Extract ChatInput component
- [ ] 2.3.3: Extract useChatConnection hook
- [ ] 2.3.4: Extract message parsing utilities

---

### 2.4 WidgetDocker.tsx (1,451 lines)
**Location**: `src/components/WidgetDocker.tsx`

**Subtasks:**
- [ ] 2.4.1: Extract DockerPanel component
- [ ] 2.4.2: Extract DockerTab component
- [ ] 2.4.3: Extract useDockerState hook
- [ ] 2.4.4: Extract dock position logic

---

### 2.5 useCanvasStore.ts (1,403 lines)
**Location**: `src/state/useCanvasStore.ts`

**See**: [04-STATE_MANAGEMENT.md](./04-STATE_MANAGEMENT.md) for detailed plan

---

### 2.6 WidgetAPI.ts (1,388 lines)
**Location**: `src/runtime/WidgetAPI.ts`

**Subtasks:**
- [ ] 2.6.1: Extract capability handlers
- [ ] 2.6.2: Extract event system
- [ ] 2.6.3: Extract state management
- [ ] 2.6.4: Create WidgetAPICore class

---

### 2.7 WidgetCardV2.tsx (1,315 lines)
**Location**: `src/components/LibraryPanel/WidgetCardV2.tsx`

**Subtasks:**
- [ ] 2.7.1: Extract CardThumbnail component
- [ ] 2.7.2: Extract CardActions component
- [ ] 2.7.3: Extract CardMetadata component
- [ ] 2.7.4: Extract useWidgetCard hook

---

### 2.8 AIGenerationPanel.tsx (1,262 lines)
**Location**: `src/components/WidgetGenerator2/AIGenerationPanel.tsx`

**Subtasks:**
- [ ] 2.8.1: Extract PromptInput component
- [ ] 2.8.2: Extract GenerationProgress component
- [ ] 2.8.3: Extract ResultPreview component
- [ ] 2.8.4: Extract useAIGeneration hook

---

### 2.9 ModelRegistry.ts (1,243 lines)
**Location**: `src/ai/providers/ModelRegistry.ts`

**Subtasks:**
- [ ] 2.9.1: Extract provider interfaces
- [ ] 2.9.2: Split providers into separate files
- [ ] 2.9.3: Create ModelRegistryCore class

---

### 2.10 WidgetSandboxHost.ts (1,242 lines)
**Location**: `src/runtime/WidgetSandboxHost.ts`

**Subtasks:**
- [ ] 2.10.1: Extract message handlers
- [ ] 2.10.2: Extract iframe management
- [ ] 2.10.3: Extract capability proxies
- [ ] 2.10.4: Create SandboxCore class

---

## PRIORITY 3: MEDIUM (800-1000 lines)

Files to refactor after Priority 1 & 2:

| File | Lines | Action |
|------|-------|--------|
| MainCanvas.tsx | 1,230 | Careful extraction (STABLE CODE) |
| EditorPage.tsx | 1,203 | Split into sections |
| SpecEditor.tsx | 1,152 | Extract form sections |
| MarketplacePage.tsx | 1,149 | Split into components |
| canvasManager.ts | 1,121 | Split by operation type |
| domain.ts | 1,111 | Split by entity type |
| DebugPanel.tsx | 1,093 | Extract debug sections |
| PermissionManager.ts | 1,074 | Extract permission types |
| GalleryPage.tsx | 1,056 | Split into components |
| WidgetPipelineAI.ts | 1,030 | Extract pipeline stages |
| widgetTemplateEngine.ts | 1,013 | Extract template types |
| ProfilePage.tsx | 986 | Split into sections |
| CanvasPage.tsx | 981 | Split into components |
| PermissionDialog.tsx | 972 | Extract dialog sections |
| RetroTVWidget.ts | 967 | Extract TV components |
| WidgetDetailPage.tsx | 953 | Split into sections |
| usePanelsStore.ts | 954 | Extract panel types |
| BubbleHunterWidget.ts | 943 | Extract game logic |
| TextToolWidgetV2.ts | 919 | Extract text operations |
| CollaborationService.ts | 892 | Extract event handlers |
| TikTokPlaylistWidget.ts | 885 | Extract playlist logic |
| licensing.ts | 898 | Split by license type |
| ShapeToolWidgetV2.ts | 859 | Extract shape types |
| WidgetProtocolV3.ts | 848 | Extract protocol handlers |
| useCanvasExtendedStore.ts | 847 | See state management plan |
| WebcamWidget.ts | 837 | Extract camera logic |
| useLibraryStore.ts | 830 | See state management plan |

---

## COMPLETION CHECKLIST

For each refactored file:
- [ ] Component renders correctly
- [ ] All props passed correctly
- [ ] State management works
- [ ] Events fire properly
- [ ] No console errors
- [ ] TypeScript compiles
- [ ] Tests pass
- [ ] No regression in functionality
