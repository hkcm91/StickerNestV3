# Developer Notes - Refactoring Progress

> This document tracks refactoring work completed and provides guidance for future developers.

**Last Updated**: December 2024

---

## COMPLETED WORK

### Session 1: Duplicate Code Cleanup (Dec 2024)

#### 1. V1 Widget Deprecation

**What we learned:**
V1 and V2 widgets are NOT duplicates - they have different widget IDs and different I/O ports:

| Widget | V1 ID | V2 ID | Compatible? |
|--------|-------|-------|-------------|
| Color Picker | `stickernest.color-picker` | `stickernest.color-picker-v2` | NO |
| Text Tool | `stickernest.text-tool` | `stickernest.text-tool-v2` | NO |

**Why we can't delete V1:**
- Existing canvases may have V1 widgets saved
- V1 and V2 have different I/O port names (breaking change)
- Deleting V1 would break backwards compatibility

**What we did:**
- Added `@deprecated` JSDoc comments to V1 files
- Updated `LibraryPipelinesTab.tsx` to use V2 in presets
- Documented the difference for future developers

**Files changed:**
- `src/widgets/builtin/ColorPickerWidget.ts` - Added deprecation notice
- `src/widgets/builtin/TextToolWidget.ts` - Added deprecation notice
- `src/components/LibraryPanel/LibraryPipelinesTab.tsx` - Use V2 color picker

---

#### 2. New Utility Hooks Created

##### useClickOutside (`src/hooks/useClickOutside.ts`)

**Purpose:** Detect clicks outside a referenced element.

**Replaces 14+ duplicate implementations in:**
- WidgetContextMenu.tsx
- CanvasContextMenu.tsx
- StickerContextMenu.tsx
- CanvasSelectorDropdown.tsx
- EditToolsMenu.tsx
- CanvasSizeSelector.tsx
- TextEditOverlay.tsx
- ThemeToggle.tsx
- WidgetLibrarySort.tsx
- NotificationsDropdown.tsx
- ChannelSelector.tsx
- CanvasToolbar.tsx
- CreativeToolbar.tsx
- ModelSelector.tsx

**Usage:**
```tsx
import { useClickOutside } from '@/hooks/useClickOutside';

const MyDropdown = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useClickOutside(ref, () => setIsOpen(false));

  return <div ref={ref}>...</div>;
};
```

**Features:**
- Configurable event type (mousedown, mouseup, click)
- Enable/disable flag
- Exclude refs (for nested elements)
- Exclude selector (for portaled elements)
- Touch support

---

##### useAsync (`src/hooks/useAsync.ts`)

**Purpose:** Manage async operations with loading/error/data state.

**Replaces 20+ duplicate patterns in:**
- ProfilePage.tsx
- SignupPage.tsx
- LoginPage.tsx
- SettingsPage.tsx (multiple instances)
- MarketplacePage.tsx
- GalleryPage.tsx
- And many more...

**Old pattern (repeated everywhere):**
```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const doAction = async () => {
  setLoading(true);
  setError(null);
  try {
    await action();
  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
};
```

**New pattern:**
```tsx
import { useAsync } from '@/hooks/useAsync';

const { execute, loading, error, data } = useAsync(async () => {
  const response = await fetch('/api/widgets');
  return response.json();
});
```

**Features:**
- Full TypeScript support
- Automatic cleanup on unmount
- Success/error callbacks
- Immediate execution option
- Reset functionality
- Variants: `useAsyncAction`, `useFetch`, `useAsyncCallback`

---

#### 3. Duplicate Hook Removal

**Removed:** `src/components/editor/useCanvasNavigation.ts`
**Kept:** `src/canvas/hooks/useCanvasNavigation.ts`

**Why:**
- Both hooks had identical functionality
- Neither was actually imported anywhere
- MainCanvas implements navigation inline
- Kept the one in the proper location (`canvas/hooks/`)

**Note for future:**
MainCanvas could be refactored to use `useCanvasNavigation` hook,
but this is optional since the current implementation is stable.

---

#### 4. Deprecated Canvas File Cleanup

**Removed files (10 total):**

| File | Reason |
|------|--------|
| `src/canvas/Canvas2.tsx` | Deprecated wrapper - just re-exported MainCanvas |
| `src/components/editor/Canvas.tsx` | Deprecated - replaced by MainCanvas |
| `src/components/editor/DemoCanvas.tsx` | Unused - not imported anywhere |
| `src/components/editor/Canvas.types.ts` | Orphaned - only used by deleted hooks |
| `src/components/editor/useCanvasZoom.ts` | Orphaned - only used by deleted Canvas |
| `src/components/editor/useCanvasPan.ts` | Orphaned - only used by deleted Canvas |
| `src/components/editor/useCanvasSelection.ts` | Orphaned - only used by deleted Canvas |
| `src/components/editor/useCanvasDragDrop.ts` | Orphaned - only used by deleted Canvas |
| `src/components/editor/useCanvasStickers.ts` | Orphaned - only used by deleted Canvas |
| `src/components/editor/useCanvasNavigation.ts` | Duplicate of canvas/hooks version |

**Updated files:**
- `src/components/editor/index.ts` - Removed Canvas and DemoCanvas exports

**Remaining canvas components:**

| File | Status | Notes |
|------|--------|-------|
| `src/canvas/MainCanvas.tsx` | **PRIMARY** | The one true canvas |
| `src/components/CanvasRenderer.tsx` | Active | Used by pages (CanvasPage, SharedCanvasPage, etc.) |
| `src/components/demo/DemoCanvas.tsx` | Active | Wrapper around CanvasRenderer for landing page |

**IMPORTANT:** `CanvasRenderer.tsx` (2,433 lines) is still actively used by:
- `CanvasPage.tsx`
- `SharedCanvasPage.tsx`
- `EmbedCanvasPage.tsx`
- `DemoMessagingPage.tsx`
- `demo/DemoCanvas.tsx`

Future work could migrate these to use MainCanvas, but this requires careful
testing as MainCanvas and CanvasRenderer may have different APIs.

---

## MIGRATION GUIDES

### Migrating to useClickOutside

**Before:**
```tsx
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

**After:**
```tsx
import { useClickOutside } from '@/hooks/useClickOutside';

useClickOutside(ref, () => setOpen(false));
```

---

### Migrating to useAsync

**Before:**
```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<Widget[] | null>(null);

const fetchWidgets = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await api.getWidgets();
    setData(response);
  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchWidgets();
}, []);
```

**After:**
```tsx
import { useFetch } from '@/hooks/useAsync';

const { loading, error, data, refetch } = useFetch(api.getWidgets);
```

### When to Use useAsync

**Good candidates:**
- Simple data fetching on component mount
- Single-action form submissions
- Operations with straightforward loading/error/success states
- New components being built from scratch

**NOT good candidates (keep existing patterns):**
- Paginated data loading
- Debounced search inputs
- CRUD operations with optimistic updates
- Operations that set multiple related state values
- Complex error handling with toast notifications
- Forms with validation logic mixed with submission

**Analysis (Dec 2024):** After reviewing 16 files with loading state patterns, most have complex logic that doesn't fit cleanly with useAsync:
- GalleryPage, ProfilePage - Multiple data sources, localStorage fallback
- LoginPage, SignupPage - Form validation, OAuth flows, navigation on success
- WidgetReviews - Pagination, submit + helpful actions
- GlobalSearch - Debounced search, multiple result types

The hook is best used for **new code** rather than migrating existing complex patterns.

---

## CONVENTIONS ESTABLISHED

### 1. Hook Documentation

All hooks should include:
- JSDoc with description
- `@example` usage code
- `REFACTORING NOTE` section listing files that could use the hook
- TypeScript interfaces for options and return values

### 2. Deprecation Pattern

When deprecating code:
```typescript
/**
 * @deprecated Prefer NewThing ('new-thing-id') for new code.
 * This is kept for backwards compatibility with existing data.
 *
 * NOTE: Old and New are NOT interchangeable because:
 * - Different IDs
 * - Different API
 * - etc.
 */
```

### 3. File Organization

| Type | Location |
|------|----------|
| Canvas-specific hooks | `src/canvas/hooks/` |
| General hooks | `src/hooks/` |
| Widget-specific hooks | `src/widgets/[widget]/hooks/` |

---

## NEXT STEPS

### Completed Migrations (Session 2: Dec 2024)

The following components have been migrated to `useClickOutside`:

| Component | File | Status |
|-----------|------|--------|
| WidgetContextMenu | `src/components/WidgetContextMenu.tsx` | ✅ Done |
| CanvasContextMenu | `src/components/editor/CanvasContextMenu.tsx` | ✅ Done |
| StickerContextMenu | `src/components/editor/StickerContextMenu.tsx` | ✅ Done |
| CanvasSelectorDropdown | `src/components/CanvasSelectorDropdown.tsx` | ✅ Done |
| EditToolsMenu | `src/components/EditToolsMenu.tsx` | ✅ Done |
| ThemeToggle | `src/components/ThemeToggle.tsx` | ✅ Done |
| CanvasSizeSelector | `src/components/LandingCanvas/CanvasSizeSelector.tsx` | ✅ Done |
| WidgetDocker | `src/components/WidgetDocker.tsx` | ✅ Done (2 patterns) |
| WidgetLibrarySort | `src/components/WidgetLibrary/WidgetLibrarySort.tsx` | ✅ Done |
| NotificationsDropdown | `src/components/notifications/NotificationsDropdown.tsx` | ✅ Done |
| ChannelSelector | `src/components/widgets/ChannelSelector.tsx` | ✅ Done |
| SNSelect | `src/shared-ui/SNSelect.tsx` | ✅ Done |
| CreativeToolbar (Submenu) | `src/components/CreativeToolbar.tsx` | ✅ Done |

**Not migrated (special cases):**
- `CanvasToolbar.tsx` - Uses setTimeout delay for special edge case
- `TextEditOverlay.tsx` - Uses setTimeout delay for special edge case

### Ready to Migrate (Low Risk)

1. **Pages with API calls** - Switch to `useAsync`
   - `SettingsPage.tsx`
   - `ProfilePage.tsx`
   - etc.

### Needs More Work

1. **useWindowMouseEvents hook** - Pattern identified but not yet created
2. **Context menu shared components** - Multiple similar implementations

### Do NOT Touch

See `STABLE_CODE_DO_NOT_TOUCH.md` for protected files.

---

## TESTING CHECKLIST

After migrating a component to new hooks:

- [ ] Component renders correctly
- [ ] Click outside detection works
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Touch events work (mobile)
