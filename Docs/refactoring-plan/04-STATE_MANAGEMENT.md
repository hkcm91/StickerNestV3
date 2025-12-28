# State Management Refactoring Plan

> Fix store architecture, remove duplicates, improve performance

---

## CURRENT STATE

| Metric | Value |
|--------|-------|
| Total Stores | 32 |
| Total State Code | ~17,646 lines |
| Largest Store | useCanvasStore (1,403 lines) |
| Stores Over 700 Lines | 9 |

---

## CRITICAL ISSUES

### Issue 1: Tripled Selection State
Three stores manage selection independently:
- `useCanvasStore` - `selection` with selectedIds, primaryId, mode
- `useCanvasEntityStore` - `selection` with selectedIds, primaryId, hoveredId
- `useSelectionStore` - selectedIds, selectedTypes, primarySelectedId

### Issue 2: Tripled Group Management
- `useCanvasStore` - `groups: Map<string, WidgetGroup>`
- `useCanvasExtendedStore` - `groups: Map<string, WidgetGroup>`
- `useLayerStore` - `groupsByCanvas: Map<string, WidgetGroup[]>`

### Issue 3: Dual Undo/Redo Systems
`useCanvasStore` implements TWO systems:
1. Snapshot-based (deprecated)
2. Command-based (new)

### Issue 4: Inconsistent Serialization
Different field names for Map serialization between stores.

### Issue 5: Performance Issues
- Full Map serialization on every update
- Missing `useShallow` in critical selectors
- No persistence batching

---

## PRIORITY 1: DEDUPLICATION

### 1.1 Consolidate Selection State
**Goal**: Single source of truth for selection

**Keep**: `useSelectionStore` (most complete)
**Deprecate**: Selection in useCanvasStore and useCanvasEntityStore

**Subtasks:**
- [ ] 1.1.1: Audit useSelectionStore features
- [ ] 1.1.2: Add any missing features from other stores
- [ ] 1.1.3: Create migration plan for consumers
- [ ] 1.1.4: Update useCanvasStore to delegate to useSelectionStore
- [ ] 1.1.5: Update useCanvasEntityStore to delegate to useSelectionStore
- [ ] 1.1.6: Update all components using selection from wrong store
- [ ] 1.1.7: Remove duplicate selection state (mark deprecated first)
- [ ] 1.1.8: Test all selection scenarios:
  - [ ] Single widget selection
  - [ ] Multi-select with Ctrl/Cmd
  - [ ] Box selection
  - [ ] Selection clear
  - [ ] Hover state

---

### 1.2 Consolidate Group Management
**Goal**: Single source of truth for groups

**Keep**: `useCanvasStore.groups`
**Deprecate**: Groups in useCanvasExtendedStore and useLayerStore

**Subtasks:**
- [ ] 1.2.1: Compare group implementations
- [ ] 1.2.2: Merge unique features into useCanvasStore
- [ ] 1.2.3: Update useCanvasExtendedStore to delegate
- [ ] 1.2.4: Update useLayerStore to delegate
- [ ] 1.2.5: Update all group consumers
- [ ] 1.2.6: Remove duplicate group state
- [ ] 1.2.7: Test grouping scenarios:
  - [ ] Create group
  - [ ] Add to group
  - [ ] Remove from group
  - [ ] Delete group

---

### 1.3 Consolidate Layer Management
**Goal**: Single layer management location

**Subtasks:**
- [ ] 1.3.1: Compare useCanvasExtendedStore.layers and useLayerStore
- [ ] 1.3.2: Choose primary location (recommend useLayerStore)
- [ ] 1.3.3: Migrate all layer operations
- [ ] 1.3.4: Remove duplicate layer state
- [ ] 1.3.5: Test layer scenarios:
  - [ ] Create layer
  - [ ] Reorder layers
  - [ ] Delete layer
  - [ ] Assign widget to layer

---

### 1.4 Consolidate Lock/Visibility
**Goal**: Single source for lock/visibility state

**Current**:
- `useCanvasStore` - `locked`/`visible` on widgets
- `useCanvasExtendedStore` - `lockedWidgetIds: Set<string>`
- `useCanvasEntityStore` - `locked`/`visible` on entities

**Subtasks:**
- [ ] 1.4.1: Decide: property on entity vs. Set of IDs
- [ ] 1.4.2: Implement chosen approach
- [ ] 1.4.3: Remove alternative implementations
- [ ] 1.4.4: Test lock/visibility:
  - [ ] Lock widget
  - [ ] Unlock widget
  - [ ] Hide widget
  - [ ] Show widget

---

## PRIORITY 2: SPLIT LARGE STORES

### 2.1 Split useCanvasStore (1,403 lines)
**Goal**: < 300 lines per store

**Current Responsibilities** (8+ domains):
1. Widgets (CRUD, transform)
2. Entities (CRUD)
3. Pipelines (CRUD)
4. Groups (CRUD) - moving out
5. Selection - moving out
6. Viewport (pan, zoom)
7. Grid settings
8. History (undo/redo) - 2 systems!

**Target Structure**:
```
src/state/canvas/
  ├── index.ts (exports all)
  ├── useWidgetStore.ts (~300 lines) - Widget CRUD
  ├── useCanvasPipelineStore.ts (~200 lines) - Pipelines
  ├── useViewportStore.ts (~200 lines) - Pan, zoom, grid
  ├── useCanvasHistoryStore.ts (~250 lines) - Single undo/redo system
  └── types.ts (~100 lines) - Shared types
```

**Subtasks:**
- [ ] 2.1.1: Create `src/state/canvas/` directory
- [ ] 2.1.2: Extract useViewportStore
  - [ ] viewport state (pan, zoom)
  - [ ] grid settings
  - [ ] mode (view/edit/preview)
- [ ] 2.1.3: Extract useCanvasPipelineStore
  - [ ] pipeline CRUD
  - [ ] pipeline execution state
- [ ] 2.1.4: Extract useCanvasHistoryStore
  - [ ] Keep ONLY command-based system
  - [ ] Remove snapshot-based system
- [ ] 2.1.5: Keep useCanvasStore for widgets only
  - [ ] Widget CRUD
  - [ ] Widget transforms
  - [ ] Delegates to other stores
- [ ] 2.1.6: Create facade selectors for backwards compatibility
- [ ] 2.1.7: Update all consumers
- [ ] 2.1.8: Test all canvas operations

---

### 2.2 Reduce usePanelsStore (954 lines)
**Goal**: < 500 lines

**Subtasks:**
- [ ] 2.2.1: Extract panel type definitions
- [ ] 2.2.2: Extract panel position logic
- [ ] 2.2.3: Simplify panel CRUD operations
- [ ] 2.2.4: Remove unused panel features

---

### 2.3 Reduce useCanvasExtendedStore (847 lines)
**Goal**: Merge remaining into appropriate stores or < 400 lines

**After Deduplication**:
- Groups → useCanvasStore
- Layers → useLayerStore
- Lock IDs → widget properties

**Remaining**:
- Canvas lock state
- Canvas metadata

**Subtasks:**
- [ ] 2.3.1: Complete deduplication tasks first
- [ ] 2.3.2: Move canvas lock to useCanvasStore
- [ ] 2.3.3: Move metadata to useCanvasStore
- [ ] 2.3.4: Consider removing store entirely
- [ ] 2.3.5: Update all consumers

---

## PRIORITY 3: STANDARDIZATION

### 3.1 Standardize Serialization
**Goal**: Single serialization utility used by all stores

**Subtasks:**
- [ ] 3.1.1: Create `src/utils/storeSerializer.ts`
  ```typescript
  export const storeSerializer = {
    serialize: (value: unknown): unknown => {
      if (value instanceof Map) {
        return { __type: 'Map', data: Array.from(value.entries()) };
      }
      if (value instanceof Set) {
        return { __type: 'Set', data: Array.from(value) };
      }
      return value;
    },
    deserialize: (value: unknown): unknown => {
      if (value && typeof value === 'object' && '__type' in value) {
        if (value.__type === 'Map') return new Map(value.data);
        if (value.__type === 'Set') return new Set(value.data);
      }
      return value;
    }
  };
  ```
- [ ] 3.1.2: Update useCanvasStore
- [ ] 3.1.3: Update useLibraryStore
- [ ] 3.1.4: Update all other persisted stores
- [ ] 3.1.5: Test data survives localStorage round-trip

---

### 3.2 Standardize ID Generation
**Goal**: Single ID generator

**Subtasks:**
- [ ] 3.2.1: Create `src/utils/idGenerator.ts`
  ```typescript
  export const generateId = (prefix?: string): string => {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
  };
  ```
- [ ] 3.2.2: Update all stores to use it
- [ ] 3.2.3: Update all services to use it

---

### 3.3 Standardize Action Naming
**Goal**: Predictable API

**Convention**:
- `add{Entity}` - Create new
- `update{Entity}` - Modify existing
- `remove{Entity}` - Delete
- `get{Entity}` - Retrieve single
- `get{Entities}` - Retrieve list
- `set{Property}` - Set state
- `toggle{Property}` - Boolean toggle

**Subtasks:**
- [ ] 3.3.1: Document naming convention
- [ ] 3.3.2: Audit existing action names
- [ ] 3.3.3: Create migration plan
- [ ] 3.3.4: Rename actions (with deprecation warnings)
- [ ] 3.3.5: Update all consumers

---

## PRIORITY 4: PERFORMANCE

### 4.1 Add useShallow to Selectors
**Goal**: Prevent unnecessary re-renders

**Problem Selectors**:
```typescript
// BAD - creates new array every time
export const useWidgets = () =>
  useCanvasStore(state => state.getWidgets());

// GOOD - uses shallow comparison
export const useWidgets = () =>
  useCanvasStore(useShallow(state => state.getWidgets()));
```

**Subtasks:**
- [ ] 4.1.1: Audit all exported selectors in useCanvasStore
- [ ] 4.1.2: Add useShallow where returning arrays/objects
- [ ] 4.1.3: Audit useLibraryStore selectors
- [ ] 4.1.4: Audit usePanelsStore selectors
- [ ] 4.1.5: Audit remaining stores
- [ ] 4.1.6: Profile render counts before/after

---

### 4.2 Implement Persistence Batching
**Goal**: Reduce localStorage writes

**Subtasks:**
- [ ] 4.2.1: Create debounced persist middleware
  ```typescript
  const debouncedPersist = (config: StateCreator) =>
    persist(config, {
      // ... options
      partialize: (state) => ({ /* ... */ }),
      onRehydrateStorage: () => (state) => { /* ... */ },
      // Add write debounce
      storage: createJSONStorage(() => ({
        getItem: localStorage.getItem.bind(localStorage),
        setItem: debounce(localStorage.setItem.bind(localStorage), 100),
        removeItem: localStorage.removeItem.bind(localStorage)
      }))
    });
  ```
- [ ] 4.2.2: Apply to useCanvasStore
- [ ] 4.2.3: Apply to other high-frequency stores
- [ ] 4.2.4: Test data integrity
- [ ] 4.2.5: Profile localStorage write frequency

---

### 4.3 Selective Persistence
**Goal**: Don't persist ephemeral data

**Should NOT Persist**:
- Viewport position (reset on load is fine)
- Hover state
- Drag state
- Selection box coordinates
- Loading states

**Should Persist**:
- Widget instances
- Canvas settings
- User preferences
- Theme selection

**Subtasks:**
- [ ] 4.3.1: Audit partialize functions in all stores
- [ ] 4.3.2: Remove ephemeral state from persistence
- [ ] 4.3.3: Add reset logic for ephemeral state on hydration
- [ ] 4.3.4: Test page reload behavior

---

## PRIORITY 5: MONITORING

### 5.1 Add Performance Logging
**Goal**: Identify performance bottlenecks

**Subtasks:**
- [ ] 5.1.1: Create performance logger utility
- [ ] 5.1.2: Log selector evaluation counts (dev only)
- [ ] 5.1.3: Log render counts per component (dev only)
- [ ] 5.1.4: Log localStorage size on persist
- [ ] 5.1.5: Create performance dashboard component

---

## MIGRATION STRATEGY

### Phase 1: Deduplication (Week 1)
1. Selection → single store
2. Groups → single store
3. Layers → single store

### Phase 2: Store Split (Week 1-2)
1. Split useCanvasStore
2. Reduce other large stores

### Phase 3: Standardization (Week 2)
1. Serialization utility
2. ID generation
3. Action naming

### Phase 4: Performance (Ongoing)
1. useShallow adoption
2. Persistence batching
3. Selective persistence

---

## TESTING CHECKLIST

After refactoring:
- [ ] Widget CRUD works
- [ ] Selection works (single, multi, box)
- [ ] Undo/redo works
- [ ] Pan/zoom works
- [ ] Grid snapping works
- [ ] Groups work
- [ ] Layers work
- [ ] Lock/visibility works
- [ ] Data persists across refresh
- [ ] No localStorage errors
- [ ] No TypeScript errors
- [ ] Performance improved (measure)
