# AI Agent Developer To-Do List: Widget Panel Redesign

**Project:** StickerNest Widget Library Panel Redesign
**Priority:** High
**Estimated Complexity:** Large (50+ tasks)

---

## Quick Reference

### Key Files to Modify
- `src/components/WidgetLibrary/WidgetLibraryPanel.tsx`
- `src/components/WidgetLibrary/WidgetListItem.tsx`
- `src/state/useLibraryStore.ts`
- `src/types/library.ts` (new)
- `src/pages/EditorPage.tsx`

### Key Patterns to Follow
- Use Zustand for state management
- Follow existing component patterns
- Use CSS-in-JS (React.CSSProperties)
- Support both light and dark themes
- Ensure keyboard accessibility

---

## Phase 1: Type System & Foundation

### Task 1.1: Create Library Types
**File:** `src/types/library.ts` (NEW)
**Action:** Create new type definitions

```typescript
// Required types to create:
- LibraryWidgetItem      // Enhanced widget metadata
- WidgetBundle           // Grouped widget kit
- QuickAccessItem        // Favorite/recent item
- LibraryAIContext       // AI brain context
- LibraryTab             // Extensible tab config
- LibraryFilter          // Filter configuration
- FilterPreset           // Saved filter combo
```

**Acceptance Criteria:**
- [ ] All types exported from index
- [ ] Types are well-documented with JSDoc
- [ ] Compatible with existing WidgetManifest type

---

### Task 1.2: Extend Library Store
**File:** `src/state/useLibraryStore.ts`
**Action:** Add new state properties and actions

**New State:**
```typescript
isOpen: boolean;
isPinned: boolean;
panelWidth: number;
viewMode: 'grid' | 'list' | 'compact';
pinnedItems: QuickAccessItem[];
recentItems: QuickAccessItem[];
aiSuggestions: string[];
```

**New Actions:**
```typescript
togglePanel: () => void;
setPinned: (pinned: boolean) => void;
setPanelWidth: (width: number) => void;
setViewMode: (mode: ViewMode) => void;
addToPinned: (item: QuickAccessItem) => void;
removeFromPinned: (id: string) => void;
updateRecentItems: (id: string) => void;
```

**Acceptance Criteria:**
- [ ] State persisted to localStorage
- [ ] Actions update state immutably
- [ ] Devtools integration maintained

---

## Phase 2: Slide-Out Panel Container

### Task 2.1: Create Slideout Container
**File:** `src/components/LibrarySlideoutPanel/LibrarySlideoutContainer.tsx` (NEW)
**Action:** Create slide-out panel with animations

**Requirements:**
- Slides in from left edge
- Animation: 300ms ease-out
- Resizable width (280-480px)
- Pin/unpin toggle
- Click-outside-to-close when unpinned
- Edge handle to open when closed

**Component Props:**
```typescript
interface Props {
  isOpen: boolean;
  isPinned: boolean;
  width: number;
  onToggle: () => void;
  onPinChange: (pinned: boolean) => void;
  onWidthChange: (width: number) => void;
  children: React.ReactNode;
}
```

**Acceptance Criteria:**
- [ ] Smooth 300ms animation
- [ ] Resize handle on right edge
- [ ] Pin button in header
- [ ] Close button in header
- [ ] Keyboard: Cmd/Ctrl+L to toggle
- [ ] Focus trap when open

---

### Task 2.2: Create Panel Header
**File:** `src/components/LibrarySlideoutPanel/LibraryHeader.tsx` (NEW)
**Action:** Create header with search and controls

**Requirements:**
- Search input with instant search
- View mode toggle (grid/list/compact)
- AI search toggle button
- Pin/close buttons

**Acceptance Criteria:**
- [ ] Search debounced at 150ms
- [ ] Clear button appears when text entered
- [ ] View mode icons match design system
- [ ] AI toggle shows active state

---

## Phase 3: Widget Card Redesign

### Task 3.1: Create Enhanced Widget Card
**File:** `src/components/LibrarySlideoutPanel/WidgetCard.tsx` (NEW)
**Action:** Build new widget card component

**Layout (Grid View):**
```
┌─────────────────────────┐
│   [Thumbnail/Preview]   │  16:10 aspect
│   [Source Badge]        │  top-right
├─────────────────────────┤
│ [Icon] Name         [★] │
│ Description...          │
│ [Cat] [AI] [3D]         │  badges
│ [Info]        [+ Add]   │  hover actions
└─────────────────────────┘
```

**Props:**
```typescript
interface WidgetCardProps {
  widget: LibraryWidgetItem;
  viewMode: 'grid' | 'list' | 'compact';
  isFavorite: boolean;
  onAdd: (widget: LibraryWidgetItem) => void;
  onFavoriteToggle: (id: string) => void;
  onShowDetails: (widget: LibraryWidgetItem) => void;
}
```

**Acceptance Criteria:**
- [ ] All three view modes work
- [ ] Hover reveals action buttons
- [ ] Favorite star toggles with animation
- [ ] Drag initiates with data transfer
- [ ] Loading skeleton state
- [ ] Accessible (keyboard, screen reader)

---

### Task 3.2: Create Widget Bundle Card
**File:** `src/components/LibrarySlideoutPanel/WidgetBundleCard.tsx` (NEW)
**Action:** Build card for widget groups/kits

**Requirements:**
- Shows stacked thumbnail preview
- Displays bundle name and widget count
- Expands to show contained widgets
- "Add All" button
- Individual widget selection when expanded

**Acceptance Criteria:**
- [ ] Smooth expand/collapse animation
- [ ] Shows 3 widget previews stacked
- [ ] Count badge shows total widgets
- [ ] Can add individual or all widgets

---

## Phase 4: Tab System

### Task 4.1: Create Tab Bar
**File:** `src/components/LibrarySlideoutPanel/LibraryTabBar.tsx` (NEW)
**Action:** Build extensible tab navigation

**Default Tabs:**
1. Widgets (puzzle icon)
2. Stickers (image icon)
3. Upload (upload icon)

**Requirements:**
- Tab icons + labels
- Active tab indicator
- Tab count badges
- Extensible tab API

**Acceptance Criteria:**
- [ ] Active tab highlighted
- [ ] Smooth tab switch transition
- [ ] Count badges update dynamically
- [ ] New tabs can be registered

---

### Task 4.2: Create Quick Access Row
**File:** `src/components/LibrarySlideoutPanel/LibraryQuickAccess.tsx` (NEW)
**Action:** Build favorites + recents horizontal row

**Layout:**
```
┌─────────────────────────────────────┐
│ ★ Favorites                    Edit │
│ [Card] [Card] [Card] [Card] →       │
├─────────────────────────────────────┤
│ ↺ Recently Used               Clear │
│ [Card] [Card] [Card] [Card] →       │
└─────────────────────────────────────┘
```

**Requirements:**
- Horizontal scroll with overflow indicators
- Max 10 items per row
- Edit mode for favorites
- Clear button for recents

**Acceptance Criteria:**
- [ ] Horizontal scroll works smoothly
- [ ] Shows overflow indicator
- [ ] Edit toggles remove buttons
- [ ] Clear confirms before clearing

---

## Phase 5: Filter & Sort Enhancement

### Task 5.1: Create Filter Bar
**File:** `src/components/LibrarySlideoutPanel/LibraryFilterBar.tsx` (NEW)
**Action:** Build collapsible filter section

**Filter Types:**
- Category (multi-select chips)
- Source (Official, Community, User, AI)
- Capabilities (checkboxes)
- Custom tags

**Requirements:**
- Collapsible section
- Active filter count badge
- Clear all button
- Filter presets (save/load)

**Acceptance Criteria:**
- [ ] Collapse animation smooth
- [ ] Filter chips can be removed
- [ ] Clear all resets to default
- [ ] Presets save to localStorage

---

### Task 5.2: Enhanced Sort Dropdown
**File:** `src/components/LibrarySlideoutPanel/LibrarySortDropdown.tsx` (NEW)
**Action:** Build sort options dropdown

**Sort Options:**
- Newest First
- Most Popular
- Most Used (Personal)
- Recently Used
- Alphabetical (A-Z, Z-A)
- Quality Score

**Acceptance Criteria:**
- [ ] Selected option shows in trigger
- [ ] Sort persists per tab
- [ ] Direction toggle (asc/desc)

---

## Phase 6: Detail Panel

### Task 6.1: Create Detail Panel
**File:** `src/components/LibrarySlideoutPanel/LibraryDetailPanel.tsx` (NEW)
**Action:** Build slide-in detail view

**Layout:**
```
┌─────────────────────────────┐
│ [←] Widget Name             │
├─────────────────────────────┤
│                             │
│     [Large Preview]         │
│                             │
├─────────────────────────────┤
│ Description text goes here  │
│ with full details...        │
├─────────────────────────────┤
│ Author: Official            │
│ Version: 1.2.0              │
│ Updated: 2 days ago         │
├─────────────────────────────┤
│ Capabilities:               │
│ [Storage] [Network] [Audio] │
├─────────────────────────────┤
│ Related Widgets:            │
│ [Card] [Card] [Card]        │
├─────────────────────────────┤
│ [★ Favorite] [+ Add to Canvas]
└─────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Slides in from right within panel
- [ ] Back button returns to list
- [ ] Add button places widget
- [ ] Related widgets clickable
- [ ] Keyboard: Esc to close

---

## Phase 7: AI Brain Foundation

### Task 7.1: Create AI Service
**File:** `src/services/libraryAI.ts` (NEW)
**Action:** Build AI context tracking service

**Functions:**
```typescript
trackWidgetUsage(widgetId: string): void
trackSearchQuery(query: string): void
getCanvasContext(widgets: WidgetInstance[]): CanvasContext
getSuggestions(context: LibraryAIContext): string[]
getUserPreferences(): UserPreferences
```

**Acceptance Criteria:**
- [ ] Tracks usage to localStorage
- [ ] Context updates on canvas change
- [ ] Suggestions algorithm returns 5-10 items
- [ ] No PII stored

---

### Task 7.2: Create AI Suggestions UI
**File:** `src/components/LibrarySlideoutPanel/LibraryAISuggestions.tsx` (NEW)
**Action:** Build AI suggestion display

**Layout:**
```
┌─────────────────────────────┐
│ ✨ Suggested for You   [?] │
│ Based on your current canvas│
├─────────────────────────────┤
│ [Card] [Card] [Card] →      │
└─────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Shows when AI mode enabled
- [ ] Updates when canvas changes
- [ ] Tooltip explains why suggested
- [ ] Can dismiss suggestions

---

## Phase 8: Integration

### Task 8.1: Update Editor Page
**File:** `src/pages/EditorPage.tsx`
**Action:** Replace left panel with new slideout

**Changes:**
- Remove fixed left panel
- Add LibrarySlideoutContainer
- Add keyboard shortcut registration
- Connect to useLibraryStore

**Acceptance Criteria:**
- [ ] Panel opens/closes correctly
- [ ] Widget placement works
- [ ] Drag-and-drop functional
- [ ] No regression in existing features

---

### Task 8.2: Update Right Panel
**File:** `src/pages/EditorPage.tsx`
**Action:** Convert properties panel to slideout

**Changes:**
- Apply same slideout pattern
- Add pin/unpin toggle
- Add keyboard shortcut (Cmd/Ctrl+P)

**Acceptance Criteria:**
- [ ] Matches left panel behavior
- [ ] Can have both panels open
- [ ] Context updates on selection

---

## Phase 9: Polish & Performance

### Task 9.1: Add Animations
**Action:** Implement micro-interactions

**Animations to Add:**
- Panel slide: 300ms ease-out
- Card hover: 150ms lift
- Tab switch: 200ms fade
- Favorite: 300ms bounce
- Filter collapse: 200ms ease

**Acceptance Criteria:**
- [ ] No jank during animations
- [ ] Reduced motion supported
- [ ] Animations can be disabled

---

### Task 9.2: Virtualized Grid
**Action:** Add virtualization for large lists

**Implementation:**
- Use react-window or similar
- Virtualize widget grid
- Virtualize sticker grid
- Maintain scroll position

**Acceptance Criteria:**
- [ ] Handles 1000+ widgets smoothly
- [ ] No scroll position reset
- [ ] Memory usage stable

---

### Task 9.3: Accessibility Audit
**Action:** Ensure full accessibility

**Checklist:**
- [ ] All buttons have labels
- [ ] Focus order logical
- [ ] Arrow key navigation in grid
- [ ] Screen reader announces changes
- [ ] Color contrast AA compliant
- [ ] Touch targets 44x44px min

---

## Phase 10: Testing

### Task 10.1: Unit Tests
**Files:** `src/**/__tests__/`
**Action:** Write unit tests

**Test Coverage:**
- [ ] Store actions
- [ ] Filter logic
- [ ] Sort logic
- [ ] Search logic
- [ ] AI suggestion algorithm

---

### Task 10.2: Component Tests
**Action:** Write component tests

**Test Coverage:**
- [ ] WidgetCard renders correctly
- [ ] BundleCard expands/collapses
- [ ] TabBar switches tabs
- [ ] FilterBar applies filters
- [ ] DetailPanel shows data

---

### Task 10.3: Integration Tests
**Action:** Write E2E tests

**Test Scenarios:**
- [ ] Open panel, search, add widget
- [ ] Add to favorites, verify persisted
- [ ] Filter by category, verify results
- [ ] Drag widget to canvas

---

## Checklist Summary

### Must Have (MVP)
- [ ] Slide-out panel container
- [ ] Enhanced widget card (grid view)
- [ ] Tab bar with Widgets/Stickers
- [ ] Quick access favorites row
- [ ] Basic search and filter
- [ ] Detail panel

### Should Have
- [ ] List and compact views
- [ ] Widget bundles
- [ ] Filter presets
- [ ] Recently used tracking
- [ ] Keyboard shortcuts

### Nice to Have
- [ ] AI suggestions
- [ ] Natural language search
- [ ] Custom tabs
- [ ] Animated previews
- [ ] User bundle creation

---

## Implementation Order

1. **Week 1:** Types, Store, Slideout Container
2. **Week 2:** Widget Card, Tab Bar, Quick Access
3. **Week 3:** Filter Bar, Sort, Detail Panel
4. **Week 4:** AI Foundation, Integration
5. **Week 5:** Polish, Accessibility, Testing

---

## Notes for AI Agent

1. **Start with types** - Get the data model right first
2. **Use existing patterns** - Follow WidgetListItem.tsx style
3. **Test incrementally** - Verify each component works
4. **Keep bundle small** - Code split where possible
5. **Document as you go** - Add JSDoc comments
6. **Commit often** - Small, focused commits

---

*Last Updated: December 2024*
