# StickerNest v2 Performance Analysis

This document outlines performance anti-patterns, potential N+1 queries, unnecessary re-renders, and inefficient algorithms found in the codebase.

## Executive Summary

The StickerNest v2 codebase is a sophisticated React application with 31 Zustand stores, complex canvas rendering, widget sandboxing, and event-driven architecture. While the codebase demonstrates good practices in many areas (e.g., memo(), useMemo, useCallback usage), there are several performance concerns that could impact user experience, especially with many widgets on the canvas.

---

## 1. Unnecessary Re-renders

### 1.1 Large Component with Multiple Store Subscriptions

**Location:** `src/components/CanvasRenderer.tsx`

**Issue:** The CanvasRenderer component (~2000+ lines) subscribes to ~20+ individual store slices, causing it to re-render whenever ANY of these values change.

```typescript
// src/components/CanvasRenderer.tsx:132-161
const selection = useCanvasStore(state => state.selection);
const select = useCanvasStore(state => state.select);
const selectMultiple = useCanvasStore(state => state.selectMultiple);
const deselectAll = useCanvasStore(state => state.deselectAll);
const setSelectionBox = useCanvasStore(state => state.setSelectionBox);
const moveSelectedWidgets = useCanvasStore(state => state.moveSelectedWidgets);
const grid = useCanvasStore(state => state.grid);
// ... 15+ more subscriptions
```

**Impact:** High - This component re-renders on almost any state change.

**Recommendation:**
- Split into smaller components with focused responsibilities
- Use shallow equality selectors for object-returning selectors
- Consider using `useShallow` from Zustand

### 1.2 Array.from() in Selector Paths

**Location:** Multiple components

**Issue:** Creating new arrays from Sets/Maps on every render causes unnecessary re-renders because the reference changes.

```typescript
// src/components/SelectionBoundsOverlay.tsx:51
const selectedIds = useCanvasStore(state => Array.from(state.selection.selectedIds));

// src/components/SmartGuides.tsx:52
: Array.from(selection.selectedIds);

// src/components/EditToolsMenu.tsx:24
const selectedIds = useCanvasStore(state => Array.from(state.selection.selectedIds));
```

**Impact:** Medium - These create new arrays on every store update, triggering re-renders even when the Set contents haven't changed.

**Recommendation:**
- Memoize the Array.from() conversion using `useMemo`
- Or use a selector that returns the Set directly and convert in the component with proper memoization

### 1.3 Store Selectors Returning Functions

**Location:** `src/components/CanvasRenderer.tsx` and others

**Issue:** Subscribing to store actions (functions) that never change still creates subscriptions.

```typescript
// These functions are stable references but still create subscriptions
const select = useCanvasStore(state => state.select);
const deselectAll = useCanvasStore(state => state.deselectAll);
const duplicateSelectedWidgets = useCanvasStore(state => state.duplicateSelectedWidgets);
```

**Impact:** Low - The functions themselves don't change, but each subscription adds overhead.

**Recommendation:**
- Import actions directly from the store: `const { select, deselectAll } = useCanvasStore.getState()`
- Or use a single selector that returns all needed actions

### 1.4 Inline Object/Array Creation in Selectors

**Location:** `src/components/CanvasRenderer.tsx:186`

```typescript
const stickers = useMemo(() =>
  Array.from(allStickers.values()).filter(s => s.canvasId === runtime.canvasId),
  [allStickers, runtime.canvasId]
);
```

**Impact:** Low - This is actually well-memoized. Good pattern to follow.

---

## 2. Memory Leaks and Event Listener Issues

### 2.1 Event Log Accumulation

**Location:** `src/runtime/EventBus.ts:186-191`

```typescript
private logEvent(event: Event): void {
  this.eventLog.push(event);
  if (this.eventLog.length > this.maxLogSize) {
    this.eventLog.shift(); // O(n) operation!
  }
}
```

**Issue:**
1. Array.shift() is O(n) - inefficient for large logs
2. Event log accumulates 500 events by default which consumes memory

**Impact:** Medium - Each shift operation copies the entire array.

**Recommendation:**
- Use a circular buffer implementation instead
- Or use `slice()` periodically rather than `shift()` on each insert

### 2.2 Polling Interval in useWidgetSync

**Location:** `src/hooks/useWidgetSync.ts:188-197`

```typescript
// Also poll for changes periodically in case events are missed
const pollInterval = setInterval(() => {
  const currentWidgetCount = runtime.widgetInstances.length;
  const stateWidgetCount = widgets.length;

  if (currentWidgetCount !== stateWidgetCount) {
    console.log('[useWidgetSync] Poll detected mismatch, syncing...');
    syncFromRuntime();
  }
}, 2000); // Check every 2 seconds
```

**Issue:** Polling every 2 seconds is wasteful; it should only be a fallback.

**Impact:** Low - The poll is lightweight but adds unnecessary CPU cycles.

**Recommendation:**
- Consider removing if event-based sync is reliable
- Or use requestIdleCallback for non-critical sync checks

### 2.3 Broadcast Deduplication Memory Growth

**Location:** `src/runtime/PipelineRuntime.ts:291-293`

```typescript
// Mark as recently broadcast and clear after 50ms
this.recentBroadcasts.add(dedupeKey);
setTimeout(() => this.recentBroadcasts.delete(dedupeKey), 50);
```

**Issue:** Each broadcast creates a setTimeout. Under high event load, this could create many pending timeouts.

**Impact:** Low - Cleanup happens quickly, but pattern could be improved.

**Recommendation:**
- Use a timestamp-based cleanup with periodic garbage collection instead of individual timeouts

### 2.4 Message Handler Registration

**Location:** `src/runtime/WidgetSandboxHost.ts:277`

```typescript
window.addEventListener('message', this.messageHandler);
```

**Issue:** Each widget sandbox adds a global message listener. With many widgets, this accumulates.

**Impact:** Medium - N listeners for N widgets, all processing every message.

**Recommendation:**
- Use a single centralized message handler that dispatches to widgets
- Or use a WeakMap to associate messages with widget instances

---

## 3. Inefficient Algorithms and Data Structures

### 3.1 Linear Search in Widget Arrays

**Location:** `src/components/CanvasRenderer.tsx:425`

```typescript
const widget = widgets.find(w => w.id === instanceId);
```

**Location:** `src/pages/CanvasPage.tsx:762`

```typescript
.map(id => Array.from(storeWidgets.values()).find(w => w.id === id))
```

**Issue:** O(n) search for each widget lookup. With many widgets, this adds up.

**Impact:** Medium - Repeated linear searches during drag/resize operations.

**Recommendation:**
- Use the Map directly: `storeWidgets.get(id)`
- Create an ID lookup map for frequently accessed widgets

### 3.2 Repeated Map/Set Cloning in Store Updates

**Location:** `src/state/useCanvasStore.ts:369-380`

```typescript
addWidget: (widget: WidgetInstance) => {
  const widgets = new Map(get().widgets); // Clone entire Map
  widgets.set(widget.id, widgetWithContentSize);
  set({ widgets });
  get().saveSnapshot();
},
```

**Issue:** Every widget update clones the entire Map. This is O(n) for each operation.

**Impact:** High - With many widgets, this becomes expensive.

**Recommendation:**
- Consider using Immer for immutable updates
- Or use a more efficient immutable Map library (like Immutable.js)

### 3.3 Layer Store Creates New Maps on Every Update

**Location:** `src/state/useLayerStore.ts:170-220`

```typescript
const newLayersByCanvas = new Map(state.layersByCanvas);
const canvasLayers = [...(state.layersByCanvas.get(canvasId) || [])];
// ... modifications
newLayersByCanvas.set(canvasId, canvasLayers);
```

**Issue:** Creates nested new Map/Array instances for every layer operation.

**Impact:** Medium - Layer operations are less frequent but still inefficient.

### 3.4 Selection Box Intersection Check

**Location:** `src/components/CanvasRenderer.tsx:888-899`

```typescript
// Find widgets within the selection box
const selectedIds = widgets
  .filter(widget => {
    const widgetRight = widget.position.x + widget.width;
    const widgetBottom = widget.position.y + widget.height;
    // Check if widget intersects with selection box
    return (
      widget.position.x < maxX &&
      widgetRight > minX &&
      widget.position.y < maxY &&
      widgetBottom > minY
    );
  })
```

**Issue:** Iterates through ALL widgets to find intersections. With many widgets, this is slow.

**Impact:** Medium - Affects marquee selection performance.

**Recommendation:**
- Use a spatial index (R-tree, quadtree) for faster spatial queries
- At minimum, filter out non-visible widgets first

---

## 4. N+1 Patterns and Data Fetching Issues

### 4.1 Pipeline Loading Without Caching

**Location:** `src/components/CanvasRenderer.tsx:324-332`

```typescript
const reloadPipelines = async () => {
  try {
    const loadedPipelines = await listPipelinesForCanvas(runtime.canvasId);
    setPipelines(loadedPipelines);
    pRuntime.loadPipelines(loadedPipelines);
  } catch (err) {
    console.warn('[CanvasRenderer] Failed to load pipelines:', err);
  }
};
```

**Issue:** Pipelines are reloaded on every event (dashboard:loaded, pipeline:saved, pipeline:deleted) without request deduplication.

**Impact:** Low-Medium - Multiple rapid saves could trigger duplicate API calls.

**Recommendation:**
- Add request deduplication/debouncing
- Cache responses with a short TTL

### 4.2 Manifest Loading Per Widget

**Location:** `src/components/CanvasRenderer.tsx:384-393`

```typescript
useEffect(() => {
  const newManifests = new Map<string, WidgetManifest>();
  widgets.forEach(widget => {
    const manifest = widget.metadata?.generatedContent?.manifest;
    if (manifest) {
      newManifests.set(widget.widgetDefId, manifest);
    }
  });
  setManifests(newManifests);
}, [widgets]);
```

**Issue:** Rebuilds the entire manifest map whenever widgets change, even if manifests haven't changed.

**Impact:** Low - Manifests are extracted from widget metadata (no API calls).

**Recommendation:**
- Check if manifests actually changed before updating state

### 4.3 Widget Registration on Every Widget Change

**Location:** `src/components/CanvasRenderer.tsx:396-415`

```typescript
useEffect(() => {
  if (!pipelineRuntime) return;

  // Update live widget registrations
  const widgetList = widgets.map(w => ({
    id: w.id,
    widgetDefId: w.widgetDefId
  }));
  pipelineRuntime.updateLiveWidgets(widgetList);

  // Register broadcast listeners from widget manifests
  widgets.forEach(widget => {
    const manifest = manifests.get(widget.widgetDefId) || widget.metadata?.generatedContent?.manifest;
    if (manifest?.events?.listens) {
      pipelineRuntime.registerBroadcastListener(widget.id, manifest.events.listens);
    }
  });
}, [pipelineRuntime, widgets, manifests]);
```

**Issue:** Re-registers ALL widgets whenever ANY widget changes.

**Impact:** Medium - O(n) operation on every widget update.

**Recommendation:**
- Track which widgets were added/removed and only update those
- Use a diffing approach

---

## 5. Additional Concerns

### 5.1 Large Component File Sizes

| File | Size | Concern |
|------|------|---------|
| `CanvasRenderer.tsx` | ~86KB | Too many responsibilities |
| `DebugPanel.tsx` | ~41KB | Could be split |
| `WidgetSandboxHost.ts` | ~39KB | Acceptable for complex logic |
| `WidgetAPI.ts` | ~38KB | Acceptable |

**Recommendation:** Split CanvasRenderer into smaller, focused components.

### 5.2 Console Logging in Production Paths

**Location:** Multiple files

```typescript
// src/runtime/PipelineRuntime.ts - Excessive logging
console.log(`[PipelineRuntime] ----------------------------------------`);
console.log(`[PipelineRuntime] 🚀 routeOutput called:`);
```

**Impact:** Low - Console logging has measurable overhead.

**Recommendation:**
- Use a debug flag to conditionally log
- Remove or reduce logging in production builds

### 5.3 Missing Virtualization for Widget Rendering

**Location:** `src/components/CanvasRenderer.tsx`

**Issue:** All widgets are rendered regardless of visibility. The WidgetList component has virtualization, but the canvas does not.

**Impact:** High - With many widgets, DOM node count grows unbounded.

**Recommendation:**
- Implement viewport-based culling
- Only render widgets that are visible in the current viewport

---

## Priority Recommendations

### High Priority (Significant Performance Impact)

1. **Split CanvasRenderer** - Break into smaller components with focused store subscriptions
2. **Implement viewport culling** - Don't render widgets outside the visible area
3. **Fix Map cloning in stores** - Use more efficient immutable update patterns
4. **Centralize message handling** - Single handler instead of per-widget listeners

### Medium Priority (Noticeable Impact)

5. **Memoize Array.from() conversions** - Prevent unnecessary re-renders
6. **Add spatial indexing** - Improve selection box performance
7. **Diff-based widget registration** - Only register changed widgets
8. **Fix EventBus log shift** - Use circular buffer

### Low Priority (Minor Optimizations)

9. **Remove polling interval** - Trust event-based sync
10. **Debounce pipeline reloading** - Prevent duplicate API calls
11. **Reduce console logging** - Use debug flags
12. **Import store actions directly** - Reduce subscription overhead

---

## Conclusion

The codebase is well-structured with proper use of React optimization patterns in many places. The main concerns are:

1. **Component complexity** - CanvasRenderer is too large and subscribes to too much state
2. **Data structure operations** - Frequent Map/Set cloning creates GC pressure
3. **Event listener accumulation** - Per-widget message handlers scale poorly
4. **Missing spatial optimizations** - No viewport culling or spatial indexing

Addressing the high-priority items would significantly improve performance, especially for canvases with many widgets.
