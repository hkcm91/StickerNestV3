# Implementation Plan - Resolve React Update Loop

## Problem
The application was experiencing a "Maximum update depth exceeded" error, indicating an infinite re-render loop. This was traced to:
1.  **Unstable `useEffect` Dependencies:** The `useEffect` hook responsible for initializing the default dock zone for a canvas was potentially re-running on every render or store update, creating a cycle: `render -> useEffect -> addDockZone -> store update -> render`.
2.  **Broad Store Subscriptions:** `App.tsx` subscribed to the entire `useStickerStore` state via `const { ... } = useStickerStore()`. This caused `App.tsx` to re-render on *any* change to the sticker store (like adding a dock zone), exacerbating the loop.
3.  **Derived State Instability:** The `dockZones` array was being derived from `getDockZonesByCanvas` in the render body. Since `getDockZonesByCanvas` returns a new array reference on every call, and this array was likely a dependency for other effects or used in a way that triggered updates, it contributed to the instability.

## Solution

### 1. Granular Store Subscriptions
Refactored `App.tsx` to use granular Zustand selectors. Instead of destructuring the whole store, we now select only the specific state slices and actions needed.
```typescript
const addDockZone = useStickerStore(state => state.addDockZone);
const dockZonesMap = useStickerStore(state => state.dockZones);
// ... other selectors
```
This ensures `App.tsx` only re-renders when relevant data changes.

### 2. Guarded Initialization Effect
Implemented a `useRef` guard (`hasInitializedDockRef`) in the dock zone initialization `useEffect`. This ensures the initialization logic (checking for and adding a default dock zone) only runs once per `activeCanvasId`, breaking the `addDockZone -> render -> useEffect` cycle.
```typescript
const hasInitializedDockRef = useRef<string | null>(null);
useEffect(() => {
    if (hasInitializedDockRef.current === activeCanvasId) return;
    // ... initialization logic
    hasInitializedDockRef.current = activeCanvasId;
}, [activeCanvasId, addDockZone]);
```

### 3. Memoized Derived State
Memoized the `dockZones` array calculation using `useMemo` and subscribed directly to the `dockZones` Map from the store. This ensures the component correctly reacts to changes (like visibility toggles) without unnecessary re-calculations or reference instability.
```typescript
const dockZones = useMemo(() => 
    Array.from(dockZonesMap.values()).filter((z: DockZone) => z.canvasId === activeCanvasId),
    [dockZonesMap, activeCanvasId]
);
```

### 4. Optimized DockPanel Rendering
Optimized the widget lookup in `DockPanel` to use `Map.get()` instead of iterating over `storeWidgets.values()`, improving performance and providing a stable lookup mechanism. Also added explicit type annotations to resolve lint errors and ensure type safety.
```typescript
widgets={mainDockZone.dockedWidgetIds
    .map((id: string) => storeWidgets.get(id))
    .filter((w: WidgetInstance | undefined): w is WidgetInstance => w !== undefined)}
```

## Verification
-   **Static Analysis:** Verified correct import of `useMemo` and `WidgetInstance`.
-   **Code Review:** Confirmed that the `useEffect` guard logic effectively prevents the loop and that granular selectors reduce re-render scope.
-   **Lint Check:** Addressed reported lint errors regarding implicit types and missing imports.
