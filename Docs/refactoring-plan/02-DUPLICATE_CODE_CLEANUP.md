# Duplicate Code Cleanup Plan

> Remove repeated patterns and consolidate shared functionality

---

## PRIORITY 1: CRITICAL DUPLICATIONS

### 1.1 Duplicate Navigation Hooks (2 instances)
**Risk**: LOW - Safe to consolidate

#### Files:
- `src/canvas/hooks/useCanvasNavigation.ts` (~160 lines)
- `src/components/editor/useCanvasNavigation.ts` (~200 lines)

#### Problem:
Both implement nearly identical functionality:
- fitToView()
- fitToContent()
- centerCanvas()
- zoom controls
- keyboard shortcuts

#### Solution:
Keep `src/canvas/hooks/useCanvasNavigation.ts` as the single source.

**Subtasks:**
- [ ] 1.1.1: Compare both files, identify differences
- [ ] 1.1.2: Merge any unique features into canvas version
- [ ] 1.1.3: Update all imports to use canvas version
- [ ] 1.1.4: Delete `src/components/editor/useCanvasNavigation.ts`
- [ ] 1.1.5: Test navigation in all contexts

---

### 1.2 V1 vs V2 Widget Pairs (5 duplicates)
**Risk**: MEDIUM - May have consumers of V1

#### Widget Pairs:
| V1 | V2 | Keep |
|----|----|----|
| ColorPickerWidget.ts | ColorPickerWidgetV2.ts | V2 |
| TextToolWidget.ts | TextToolWidgetV2.ts | V2 |
| ImageToolWidget.ts | ImageToolWidgetV2.ts | V2 |
| ShapeToolWidget.ts | ShapeToolWidgetV2.ts | V2 |
| CanvasControlWidget.ts | CanvasControlWidgetV2.ts | V2 |

#### Solution:
Remove V1 versions after migrating any remaining usages.

**Subtasks:**
- [ ] 1.2.1: Search for imports of V1 widgets
- [ ] 1.2.2: Update any remaining V1 imports to V2
- [ ] 1.2.3: Delete ColorPickerWidget.ts (V1)
- [ ] 1.2.4: Delete TextToolWidget.ts (V1)
- [ ] 1.2.5: Delete ImageToolWidget.ts (V1)
- [ ] 1.2.6: Delete ShapeToolWidget.ts (V1)
- [ ] 1.2.7: Delete CanvasControlWidget.ts (V1)
- [ ] 1.2.8: Update widget registry
- [ ] 1.2.9: Test all widget functionality

---

### 1.3 Deprecated Canvas Component
**Risk**: LOW - Already marked deprecated

#### Files:
- `src/components/editor/Canvas.tsx` (DEPRECATED)
- `src/canvas/MainCanvas.tsx` (CURRENT)

#### Solution:
Remove deprecated Canvas.tsx after verifying no usages.

**Subtasks:**
- [ ] 1.3.1: Search for imports of deprecated Canvas
- [ ] 1.3.2: Update any imports to MainCanvas
- [ ] 1.3.3: Delete `src/components/editor/Canvas.tsx`
- [ ] 1.3.4: Test canvas rendering

---

## PRIORITY 2: HOOK EXTRACTIONS

### 2.1 Event Listener Pattern (9+ instances)
**Risk**: LOW - Utility extraction

#### Pattern Found In:
```typescript
// Found in 9+ files
useEffect(() => {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, [handleMouseMove, handleMouseUp]);
```

#### Files:
1. `src/components/editor/Canvas.tsx` (Lines 501-509)
2. `src/components/editor/CanvasEntityLayer.tsx` (Lines 290-297)
3. `src/components/editor/DemoCanvas.tsx` (Lines 387-397)
4. `src/components/editor/ConnectionOverlay.tsx`
5. `src/canvas/MainCanvas.tsx`
6. + 4 more component files

#### Solution:
Create `useWindowMouseEvents()` hook.

**Subtasks:**
- [ ] 2.1.1: Create `src/hooks/useWindowMouseEvents.ts`
  ```typescript
  export function useWindowMouseEvents(
    onMouseMove: (e: MouseEvent) => void,
    onMouseUp: (e: MouseEvent) => void,
    enabled: boolean = true
  ) {
    useEffect(() => {
      if (!enabled) return;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }, [onMouseMove, onMouseUp, enabled]);
  }
  ```
- [ ] 2.1.2: Replace pattern in Canvas.tsx
- [ ] 2.1.3: Replace pattern in CanvasEntityLayer.tsx
- [ ] 2.1.4: Replace pattern in DemoCanvas.tsx
- [ ] 2.1.5: Replace pattern in ConnectionOverlay.tsx
- [ ] 2.1.6: Replace pattern in remaining files
- [ ] 2.1.7: Test mouse interactions

---

### 2.2 Click Outside Pattern (14+ instances)
**Risk**: LOW - Utility extraction

#### Pattern Found In:
```typescript
// Found in 14+ files
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

#### Files:
1. `src/components/WidgetContextMenu.tsx`
2. `src/components/editor/CanvasContextMenu.tsx`
3. `src/components/editor/StickerContextMenu.tsx`
4. `src/components/CanvasSelectorDropdown.tsx`
5. `src/components/EditToolsMenu.tsx`
6. `src/components/LandingCanvas/CanvasSizeSelector.tsx`
7. `src/components/TextEditOverlay.tsx`
8. `src/components/ThemeToggle.tsx`
9. `src/components/WidgetLibrary/WidgetLibrarySort.tsx`
10. `src/components/notifications/NotificationsDropdown.tsx`
11. `src/components/widgets/ChannelSelector.tsx`
12. `src/components/canvas/CanvasToolbar.tsx`
13. `src/components/CreativeToolbar.tsx`
14. `src/components/AISidebar/ModelSelector.tsx`

#### Solution:
Create `useClickOutside()` hook.

**Subtasks:**
- [ ] 2.2.1: Create `src/hooks/useClickOutside.ts`
  ```typescript
  export function useClickOutside(
    ref: RefObject<HTMLElement>,
    onClickOutside: () => void,
    enabled: boolean = true
  ) {
    useEffect(() => {
      if (!enabled) return;
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          onClickOutside();
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [ref, onClickOutside, enabled]);
  }
  ```
- [ ] 2.2.2: Replace in WidgetContextMenu.tsx
- [ ] 2.2.3: Replace in CanvasContextMenu.tsx
- [ ] 2.2.4: Replace in StickerContextMenu.tsx
- [ ] 2.2.5: Replace in CanvasSelectorDropdown.tsx
- [ ] 2.2.6: Replace in EditToolsMenu.tsx
- [ ] 2.2.7: Replace in remaining 8 files
- [ ] 2.2.8: Test all dropdown/menu close behavior

---

### 2.3 Loading State Pattern (20+ instances)
**Risk**: LOW - Utility extraction

#### Pattern Found In:
```typescript
// Found in 20+ files
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

#### Files (partial list):
- `src/pages/ProfilePage.tsx:166`
- `src/pages/SignupPage.tsx:24`
- `src/pages/LoginPage.tsx:25`
- `src/pages/SettingsPage.tsx:188,715,1276`
- + 12 more files

#### Solution:
Create `useAsync()` hook.

**Subtasks:**
- [ ] 2.3.1: Create `src/hooks/useAsync.ts`
  ```typescript
  export function useAsync<T>(asyncFn: () => Promise<T>) {
    const [state, setState] = useState<{
      loading: boolean;
      error: string | null;
      data: T | null;
    }>({ loading: false, error: null, data: null });

    const execute = useCallback(async () => {
      setState({ loading: true, error: null, data: null });
      try {
        const data = await asyncFn();
        setState({ loading: false, error: null, data });
        return data;
      } catch (e) {
        setState({ loading: false, error: e.message, data: null });
        throw e;
      }
    }, [asyncFn]);

    return { ...state, execute };
  }
  ```
- [ ] 2.3.2: Replace pattern in ProfilePage.tsx
- [ ] 2.3.3: Replace pattern in SignupPage.tsx
- [ ] 2.3.4: Replace pattern in LoginPage.tsx
- [ ] 2.3.5: Replace pattern in SettingsPage.tsx
- [ ] 2.3.6: Replace in remaining files
- [ ] 2.3.7: Test all async operations

---

## PRIORITY 3: COMPONENT CONSOLIDATIONS

### 3.1 Context Menu Components (4 implementations)
**Risk**: MEDIUM - UI consistency

#### Files:
1. `src/components/editor/CanvasContextMenu.tsx`
2. `src/components/SelectionContextMenu.tsx`
3. `src/components/WidgetContextMenu.tsx`
4. `src/components/editor/StickerContextMenu.tsx`

#### Problem:
Similar MenuItem interfaces and rendering patterns duplicated 4 times.

#### Solution:
Create shared ContextMenu component library.

**Subtasks:**
- [ ] 3.1.1: Create `src/components/shared/ContextMenu/`
- [ ] 3.1.2: Create MenuItem component
- [ ] 3.1.3: Create MenuDivider component
- [ ] 3.1.4: Create ContextMenuWrapper component
- [ ] 3.1.5: Refactor CanvasContextMenu to use shared
- [ ] 3.1.6: Refactor SelectionContextMenu to use shared
- [ ] 3.1.7: Refactor WidgetContextMenu to use shared
- [ ] 3.1.8: Refactor StickerContextMenu to use shared
- [ ] 3.1.9: Test all context menus

---

### 3.2 Canvas Hooks Distribution
**Risk**: MEDIUM - Requires careful consolidation

#### Editor Location (6 hooks):
```
src/components/editor/
  ├── useCanvasDragDrop.ts
  ├── useCanvasPan.ts
  ├── useCanvasSelection.ts
  ├── useCanvasStickers.ts
  ├── useCanvasZoom.ts
  └── useCanvasNavigation.ts (duplicate)
```

#### Global Location (6 hooks):
```
src/hooks/
  ├── useCanvasController.ts
  ├── useCanvasEntityEvents.ts
  ├── useCanvasGestures.ts
  ├── useCanvasKeyboardShortcuts.ts
  ├── useCanvasRouter.ts
  └── useCanvasWidgetBridge.ts
```

#### Solution:
Consolidate all canvas hooks into `src/hooks/canvas/`.

**Subtasks:**
- [ ] 3.2.1: Create `src/hooks/canvas/` directory
- [ ] 3.2.2: Move global canvas hooks to new directory
- [ ] 3.2.3: Move editor canvas hooks to new directory
- [ ] 3.2.4: Remove duplicate useCanvasNavigation
- [ ] 3.2.5: Update all imports
- [ ] 3.2.6: Create index.ts with exports
- [ ] 3.2.7: Test canvas functionality

---

## PRIORITY 4: UTILITY STANDARDIZATIONS

### 4.1 JSON Serialization Inconsistencies
**Risk**: HIGH - Data corruption risk if not careful

#### Problem:
Different field names for Map serialization:
```typescript
// useCanvasStore:
{ __type: 'Map', entries: Array.from(value.entries()) }

// useLibraryStore:
{ __type: 'Map', value: Array.from(value.entries()) }
```

#### Solution:
Create single serialization utility.

**Subtasks:**
- [ ] 4.1.1: Create `src/utils/storeSerializer.ts`
- [ ] 4.1.2: Implement standardized Map/Set serialization
- [ ] 4.1.3: Update useCanvasStore to use it
- [ ] 4.1.4: Update useLibraryStore to use it
- [ ] 4.1.5: Update all other stores
- [ ] 4.1.6: Test persistence across page reloads

---

### 4.2 ID Generation Inconsistencies
**Risk**: LOW - Forward-compatible change

#### Current Patterns:
```typescript
// useCanvasStore
`${widget.id}-${Date.now().toString(36)}`

// usePanelsStore
`panel-${Date.now().toString(36)}-${Math.random()...}`

// useLayerStore
crypto.randomUUID()

// useThemeStore
`custom-${Date.now()}-${Math.random()...}`
```

#### Solution:
Create single ID generation utility.

**Subtasks:**
- [ ] 4.2.1: Create `src/utils/idGenerator.ts`
  ```typescript
  export const generateId = (prefix?: string) => {
    const id = crypto.randomUUID();
    return prefix ? `${prefix}-${id}` : id;
  };
  ```
- [ ] 4.2.2: Update useCanvasStore
- [ ] 4.2.3: Update usePanelsStore
- [ ] 4.2.4: Update useLayerStore
- [ ] 4.2.5: Update useThemeStore
- [ ] 4.2.6: Update remaining stores

---

## COMPLETION CHECKLIST

After duplicate removal:
- [ ] No duplicate hook implementations
- [ ] Single source for utility functions
- [ ] All context menus use shared components
- [ ] All canvas hooks in one directory
- [ ] Consistent serialization across stores
- [ ] Consistent ID generation
- [ ] All tests pass
- [ ] No TypeScript errors
