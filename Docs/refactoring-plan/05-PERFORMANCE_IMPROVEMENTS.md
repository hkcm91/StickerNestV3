# Performance Improvements Plan

> Optimize rendering, memory, and responsiveness

---

## CURRENT PERFORMANCE PROFILE

### Code Metrics
| Metric | Value | Target |
|--------|-------|--------|
| Total Lines | 515,566 | - |
| Files Over 200 Lines | 76% | < 50% |
| Files Over 1000 Lines | 95 files | 0 |
| Zustand Stores | 32 | < 20 |

### Identified Bottlenecks
1. **Persistence Overhead**: 50-200ms per state change
2. **Selector Re-evaluations**: New array on every call
3. **Cross-Store Subscriptions**: 3-4 renders instead of 1
4. **Map Serialization**: O(n) on every persist

---

## PRIORITY 1: RENDER OPTIMIZATION

### 1.1 Add React.memo to Heavy Components
**Goal**: Prevent unnecessary re-renders

**Target Components**:
| Component | Lines | Re-render Risk |
|-----------|-------|----------------|
| WidgetWrapper | 721 | HIGH - Per widget |
| StickerFrame | ~500 | HIGH - Per sticker |
| WidgetCard | 1,315 | HIGH - Per library item |
| LayerItem | ~200 | HIGH - Per layer |

**Subtasks:**
- [ ] 1.1.1: Add React.memo to WidgetWrapper
  ```tsx
  export const WidgetWrapper = React.memo(function WidgetWrapper(props) {
    // ...
  }, (prev, next) => {
    // Custom comparison for widget props
    return prev.widget.id === next.widget.id &&
           prev.widget.position === next.widget.position &&
           prev.isSelected === next.isSelected;
  });
  ```
- [ ] 1.1.2: Add React.memo to StickerFrame
- [ ] 1.1.3: Add React.memo to WidgetCard variants
- [ ] 1.1.4: Add React.memo to LayerItem
- [ ] 1.1.5: Profile render counts before/after

---

### 1.2 Optimize Zustand Selectors
**Goal**: Prevent selector-triggered re-renders

**Problem Pattern**:
```typescript
// BAD - creates new array reference every time
export const useWidgets = () =>
  useCanvasStore(state => state.getWidgets());
```

**Solution Pattern**:
```typescript
// GOOD - shallow comparison for array contents
import { useShallow } from 'zustand/react/shallow';

export const useWidgets = () =>
  useCanvasStore(useShallow(state => state.getWidgets()));

// BETTER - specific selector for single widget
export const useWidget = (id: string) =>
  useCanvasStore(state => state.widgets.get(id));
```

**Subtasks:**
- [ ] 1.2.1: Audit useCanvasStore selectors
- [ ] 1.2.2: Add useShallow where returning arrays
- [ ] 1.2.3: Create specific selectors for common patterns
- [ ] 1.2.4: Audit useLibraryStore selectors
- [ ] 1.2.5: Audit usePanelsStore selectors
- [ ] 1.2.6: Audit all remaining store selectors

---

### 1.3 Virtualize Long Lists
**Goal**: Only render visible items

**Target Lists**:
- Widget library grid
- Layer panel
- Notification list
- Feed items
- Search results

**Subtasks:**
- [ ] 1.3.1: Add react-window or @tanstack/virtual
- [ ] 1.3.2: Virtualize widget library grid
  ```tsx
  import { FixedSizeGrid } from 'react-window';

  <FixedSizeGrid
    columnCount={3}
    columnWidth={200}
    height={600}
    rowCount={Math.ceil(widgets.length / 3)}
    rowHeight={250}
    width={600}
  >
    {({ columnIndex, rowIndex, style }) => (
      <div style={style}>
        <WidgetCard widget={widgets[rowIndex * 3 + columnIndex]} />
      </div>
    )}
  </FixedSizeGrid>
  ```
- [ ] 1.3.3: Virtualize layer panel
- [ ] 1.3.4: Virtualize notification list
- [ ] 1.3.5: Virtualize feed items
- [ ] 1.3.6: Test scroll performance

---

### 1.4 Throttle Canvas Updates
**Goal**: Limit update frequency during drag/resize

**Subtasks:**
- [ ] 1.4.1: Verify RAF batching in useDragController (already exists)
- [ ] 1.4.2: Add RAF batching to resize operations
- [ ] 1.4.3: Throttle zoom updates to 60fps max
- [ ] 1.4.4: Throttle pan updates during momentum
- [ ] 1.4.5: Profile frame times during interactions

---

## PRIORITY 2: PERSISTENCE OPTIMIZATION

### 2.1 Debounce LocalStorage Writes
**Goal**: Reduce write frequency

**Current**: Write on every state change
**Target**: Write max every 100-200ms

**Subtasks:**
- [ ] 2.1.1: Create debounced storage adapter
  ```typescript
  const debouncedStorage = {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: debounce((name: string, value: string) => {
      localStorage.setItem(name, value);
    }, 100),
    removeItem: (name: string) => localStorage.removeItem(name)
  };
  ```
- [ ] 2.1.2: Apply to useCanvasStore
- [ ] 2.1.3: Apply to useStickerStore
- [ ] 2.1.4: Apply to useLibraryStore
- [ ] 2.1.5: Test data integrity after rapid changes

---

### 2.2 Selective Persistence
**Goal**: Don't persist ephemeral state

**Remove from Persistence**:
```typescript
// useCanvasStore partialize - REMOVE:
- viewport (can reset)
- selection (can reset)
- isSelecting (ephemeral)
- selectionBox (ephemeral)

// KEEP:
- widgets
- entities
- pipelines
- grid settings
```

**Subtasks:**
- [ ] 2.2.1: Audit useCanvasStore partialize function
- [ ] 2.2.2: Remove ephemeral state from persistence
- [ ] 2.2.3: Audit other stores' partialize functions
- [ ] 2.2.4: Set up default state on hydration
- [ ] 2.2.5: Test persistence size reduction

---

### 2.3 Implement Incremental Persistence
**Goal**: Only persist changed data

**Current**: Serialize entire Map on every change
**Target**: Serialize only changed entries

**Subtasks:**
- [ ] 2.3.1: Track dirty entries per Map
- [ ] 2.3.2: Implement delta serialization
- [ ] 2.3.3: Implement delta deserialization
- [ ] 2.3.4: Test with large widget counts (100+)
- [ ] 2.3.5: Profile serialization time reduction

---

## PRIORITY 3: CODE SPLITTING

### 3.1 Route-Based Code Splitting
**Goal**: Load pages on demand

**Subtasks:**
- [ ] 3.1.1: Wrap pages in React.lazy()
  ```tsx
  const SettingsPage = lazy(() => import('./pages/SettingsPage'));
  const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
  const GalleryPage = lazy(() => import('./pages/GalleryPage'));
  ```
- [ ] 3.1.2: Add Suspense boundaries with loading UI
- [ ] 3.1.3: Preload critical routes
- [ ] 3.1.4: Measure bundle size reduction

---

### 3.2 Component-Level Code Splitting
**Goal**: Split heavy components

**Target Components**:
- WidgetLab (3,105 lines)
- SettingsPage (2,446 lines)
- AI generation panels

**Subtasks:**
- [ ] 3.2.1: Lazy load WidgetLab
- [ ] 3.2.2: Lazy load settings sections
- [ ] 3.2.3: Lazy load AI generation panels
- [ ] 3.2.4: Add loading states
- [ ] 3.2.5: Test loading experience

---

### 3.3 Widget Code Splitting
**Goal**: Load widgets on demand

**Subtasks:**
- [ ] 3.3.1: Create widget loader with lazy imports
- [ ] 3.3.2: Implement widget preloading on hover
- [ ] 3.3.3: Cache loaded widgets
- [ ] 3.3.4: Test widget load times

---

## PRIORITY 4: MEMORY OPTIMIZATION

### 4.1 Clean Up Event Listeners
**Goal**: Prevent memory leaks

**Subtasks:**
- [ ] 4.1.1: Audit useEffect cleanup functions
- [ ] 4.1.2: Ensure all addEventListener has removeEventListener
- [ ] 4.1.3: Use AbortController for fetch cleanup
- [ ] 4.1.4: Profile memory with DevTools

---

### 4.2 Optimize Image Loading
**Goal**: Reduce memory for widget thumbnails

**Subtasks:**
- [ ] 4.2.1: Implement lazy image loading
- [ ] 4.2.2: Use appropriate image sizes (srcset)
- [ ] 4.2.3: Add image loading placeholder
- [ ] 4.2.4: Implement image caching strategy
- [ ] 4.2.5: Test with large galleries

---

### 4.3 Widget Instance Cleanup
**Goal**: Dispose unused widget instances

**Subtasks:**
- [ ] 4.3.1: Implement widget dispose lifecycle
- [ ] 4.3.2: Clean up iframe sandboxes on widget removal
- [ ] 4.3.3: Clear widget state from stores on removal
- [ ] 4.3.4: Test memory after adding/removing many widgets

---

## PRIORITY 5: NETWORK OPTIMIZATION

### 5.1 API Response Caching
**Goal**: Reduce redundant API calls

**Subtasks:**
- [ ] 5.1.1: Implement SWR or React Query
- [ ] 5.1.2: Add caching for widget library
- [ ] 5.1.3: Add caching for user profile
- [ ] 5.1.4: Add caching for marketplace listings
- [ ] 5.1.5: Configure cache invalidation

---

### 5.2 Optimize API Payloads
**Goal**: Reduce data transfer

**Subtasks:**
- [ ] 5.2.1: Add field selection to API endpoints
- [ ] 5.2.2: Implement pagination for large lists
- [ ] 5.2.3: Compress large payloads
- [ ] 5.2.4: Profile network requests

---

## PERFORMANCE MONITORING

### 6.1 Add Performance Metrics
**Goal**: Track performance over time

**Subtasks:**
- [ ] 6.1.1: Add performance timing API usage
- [ ] 6.1.2: Track Time to Interactive (TTI)
- [ ] 6.1.3: Track First Contentful Paint (FCP)
- [ ] 6.1.4: Track Largest Contentful Paint (LCP)
- [ ] 6.1.5: Set up performance budget alerts

---

### 6.2 Create Performance Dashboard
**Goal**: Visualize performance metrics (dev only)

**Subtasks:**
- [ ] 6.2.1: Create PerformancePanel component
- [ ] 6.2.2: Show render counts per component
- [ ] 6.2.3: Show selector evaluation counts
- [ ] 6.2.4: Show localStorage size
- [ ] 6.2.5: Show memory usage

---

## BENCHMARKS

### Before Refactoring
Record these metrics before starting:

- [ ] Initial bundle size: _____ KB
- [ ] Time to Interactive: _____ ms
- [ ] Canvas interaction FPS: _____ fps
- [ ] Widget drag latency: _____ ms
- [ ] localStorage size: _____ KB
- [ ] Memory usage (idle): _____ MB
- [ ] Memory usage (100 widgets): _____ MB

### After Refactoring
Target improvements:

| Metric | Current | Target |
|--------|---------|--------|
| Bundle size | ? | -30% |
| TTI | ? | < 2s |
| Interaction FPS | ? | 60 fps |
| Drag latency | ? | < 16ms |
| localStorage | ? | -50% |
| Memory (idle) | ? | -20% |

---

## COMPLETION CHECKLIST

After performance work:
- [ ] All heavy components memoized
- [ ] All selectors optimized
- [ ] Long lists virtualized
- [ ] Persistence debounced
- [ ] Routes code-split
- [ ] Memory leaks fixed
- [ ] Performance metrics tracked
- [ ] Benchmarks show improvement
