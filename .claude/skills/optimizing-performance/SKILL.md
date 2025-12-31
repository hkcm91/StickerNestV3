---
name: optimizing-performance
description: Optimizing performance in StickerNest for React, Three.js, and bundle size. Use when investigating slow renders, improving FPS, reducing bundle size, profiling components, or when the user mentions "slow", "laggy", "performance", or "optimize". Covers React profiling, Three.js optimization, memoization, lazy loading, and virtualization.
---

# Optimizing Performance

StickerNest combines React, Three.js, and iframes - each with unique performance considerations. This skill covers profiling and optimization techniques across all layers.

## Performance Budget

| Metric | Target | Critical |
|--------|--------|----------|
| First Contentful Paint | < 1.5s | < 3s |
| Time to Interactive | < 3s | < 5s |
| Frame Rate (60fps) | > 55fps | > 30fps |
| Frame Rate VR (72fps) | > 68fps | > 60fps |
| Bundle Size (main) | < 500KB | < 1MB |
| Memory (heap) | < 200MB | < 500MB |

## React Performance

### Identifying Slow Renders

```typescript
// 1. React DevTools Profiler
// - Record a session
// - Look for long render times (> 16ms = frame drop)
// - Identify components rendering too often

// 2. Why Did You Render (development)
// npm install @welldone-software/why-did-you-render
import whyDidYouRender from '@welldone-software/why-did-you-render';
whyDidYouRender(React, { trackAllPureComponents: true });

// 3. Manual timing
console.time('[Render] MyComponent');
// ... render ...
console.timeEnd('[Render] MyComponent');
```

### Preventing Unnecessary Re-renders

```typescript
// 1. Memoize components
const MyComponent = React.memo(({ data }) => {
  return <div>{data.name}</div>;
});

// 2. Memoize expensive computations
const processedData = useMemo(() => {
  return expensiveProcessing(rawData);
}, [rawData]); // Only recalculate when rawData changes

// 3. Memoize callbacks
const handleClick = useCallback((id: string) => {
  doSomething(id);
}, []); // Stable reference

// 4. Use Zustand selectors properly
// BAD - re-renders on ANY store change
const state = useCanvasStore();

// GOOD - only re-renders when widgets change
const widgets = useCanvasStore((s) => s.widgets);

// BETTER - shallow compare for objects
import { shallow } from 'zustand/shallow';
const { widgets, selection } = useCanvasStore(
  (s) => ({ widgets: s.widgets, selection: s.selection }),
  shallow
);
```

### Virtualization for Long Lists

```typescript
import { FixedSizeList } from 'react-window';

// Instead of rendering all items:
// widgets.map((widget) => <WidgetCard widget={widget} />)

// Use virtualization:
<FixedSizeList
  height={600}
  width={300}
  itemCount={widgets.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <WidgetCard widget={widgets[index]} />
    </div>
  )}
</FixedSizeList>
```

### Lazy Loading Components

```typescript
// Lazy load heavy components
const HeavyEditor = React.lazy(() => import('./HeavyEditor'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <HeavyEditor />
</Suspense>

// Route-level lazy loading
const CanvasPage = React.lazy(() => import('./pages/CanvasPage'));
```

## Three.js / Spatial Performance

### Frame Rate Monitoring

```typescript
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

function FPSMonitor() {
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - lastTime.current >= 1000) {
      console.log('[FPS]', frames.current);
      frames.current = 0;
      lastTime.current = now;
    }
  });

  return null;
}
```

### Geometry Optimization

```typescript
// 1. Reuse geometries
const sharedGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

// 2. Instanced meshes for many identical objects
import { Instances, Instance } from '@react-three/drei';

<Instances limit={1000} geometry={sharedGeometry} material={sharedMaterial}>
  {positions.map((pos, i) => (
    <Instance key={i} position={pos} />
  ))}
</Instances>

// 3. Merge static geometries
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
```

### Material Optimization

```typescript
// 1. Reuse materials
const sharedMaterial = useMemo(
  () => new THREE.MeshStandardMaterial({ color: '#1e1b4b' }),
  []
);

// 2. Use simpler materials when possible
<meshBasicMaterial />      // Fastest - no lighting
<meshLambertMaterial />    // Fast - simple lighting
<meshStandardMaterial />   // Medium - PBR
<meshPhysicalMaterial />   // Slow - full PBR

// 3. Disable features you don't need
<meshStandardMaterial
  flatShading        // Skip normal interpolation
  dithering={false}  // Skip dithering
/>
```

### Culling and LOD

```typescript
// 1. Frustum culling (enabled by default)
<mesh frustumCulled={true}>

// 2. Level of Detail
import { LOD } from 'three';

const lod = new LOD();
lod.addLevel(highDetailMesh, 0);    // Use when close
lod.addLevel(mediumDetailMesh, 50); // Use at 50 units
lod.addLevel(lowDetailMesh, 100);   // Use at 100 units

// 3. Distance-based rendering
const distance = camera.position.distanceTo(object.position);
if (distance > 100) return null; // Don't render far objects
```

### VR-Specific Optimization

```typescript
// 1. Target 72fps minimum (Quest), 90fps (PC VR)
// Frame budget: ~14ms for 72fps, ~11ms for 90fps

// 2. Reduce draw calls
// - Batch similar materials
// - Use instancing
// - Merge static geometry

// 3. Foveated rendering (if supported)
// The center of view renders at full res, edges at lower res

// 4. Reduce Html components
// Each <Html> creates DOM overlay - expensive in XR
// Use <Text> from drei instead for labels
```

## Bundle Size Optimization

### Analyzing Bundle

```bash
# Generate bundle analysis
npm run build -- --analyze

# Or use source-map-explorer
npx source-map-explorer dist/assets/*.js
```

### Code Splitting

```typescript
// 1. Route-based splitting (automatic with lazy)
const routes = [
  { path: '/', element: lazy(() => import('./pages/Home')) },
  { path: '/canvas', element: lazy(() => import('./pages/Canvas')) },
];

// 2. Feature-based splitting
const loadAIFeatures = () => import('./features/ai');

// 3. Vendor chunking (vite.config.ts)
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
        'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
      },
    },
  },
}
```

### Tree Shaking

```typescript
// BAD - imports entire library
import _ from 'lodash';
_.debounce(fn, 100);

// GOOD - imports only what's needed
import debounce from 'lodash/debounce';
debounce(fn, 100);

// Also check for side-effect imports
import 'heavy-library'; // Might not tree-shake
```

## Memory Optimization

### Detecting Memory Leaks

```typescript
// 1. Chrome DevTools Memory tab
// - Take heap snapshots before/after operations
// - Compare to find retained objects

// 2. Common leak sources:
// - Event listeners not removed
// - setInterval/setTimeout not cleared
// - Subscriptions not unsubscribed
// - Closures holding references

// 3. Cleanup pattern
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('resize', handler);

  const interval = setInterval(() => { /* ... */ }, 1000);

  const subscription = store.subscribe(() => { /* ... */ });

  return () => {
    window.removeEventListener('resize', handler);
    clearInterval(interval);
    subscription(); // Unsubscribe
  };
}, []);
```

### Three.js Memory Management

```typescript
// Dispose geometries and materials when done
useEffect(() => {
  return () => {
    geometry.dispose();
    material.dispose();
    texture?.dispose();
  };
}, []);

// For dynamic scenes, track and dispose
const disposables = useRef<THREE.Object3D[]>([]);

function addObject(obj: THREE.Object3D) {
  scene.add(obj);
  disposables.current.push(obj);
}

function cleanup() {
  disposables.current.forEach((obj) => {
    scene.remove(obj);
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
  });
  disposables.current = [];
}
```

## Performance Checklist

### Before Shipping
- [ ] React Profiler shows no renders > 16ms
- [ ] No console warnings about "maximum update depth"
- [ ] Bundle size within budget
- [ ] Memory stable (no growth over time)
- [ ] 60fps on desktop, 72fps on Quest

### For Components
- [ ] Using `React.memo` for pure components
- [ ] Using `useMemo` for expensive computations
- [ ] Using `useCallback` for callback props
- [ ] Zustand selectors are specific (not selecting whole store)
- [ ] No inline object/array creation in JSX

### For Three.js
- [ ] Geometries and materials are reused/memoized
- [ ] Textures are properly sized (power of 2)
- [ ] Using instancing for repeated objects
- [ ] Proper disposal on unmount
- [ ] <Html> components avoided in XR

### For Data
- [ ] Large lists are virtualized
- [ ] Heavy components are lazy loaded
- [ ] API calls are deduplicated/cached
- [ ] Images are properly sized and compressed
