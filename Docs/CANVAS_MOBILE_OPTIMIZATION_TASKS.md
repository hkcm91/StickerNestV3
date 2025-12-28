# StickerNest v2 - Canvas Mobile Optimization Tasks (Part 2)

## Agent Instructions

### CRITICAL RULES - READ FIRST

1. **DO NOT DELETE EXISTING CODE** unless explicitly replacing it with working equivalent functionality. Comment out deprecated code with `// DEPRECATED: [reason]` instead of removing.

2. **DO NOT OVER-ENGINEER**. Each task should be completable in a focused session. No abstract factories, no excessive interfaces, no "future-proofing" that isn't explicitly requested.

3. **INCREMENTAL CHANGES ONLY**. Each commit should leave the app in a working state. Test that the canvas works on BOTH desktop AND mobile before moving on.

4. **PRESERVE DESKTOP BEHAVIOR** while adding mobile features. Desktop interactions must continue working exactly as before.

5. **USE EXISTING PATTERNS**. This codebase uses:
   - Zustand for state management
   - React functional components with hooks
   - TypeScript with explicit types
   - CSS-in-JS with style objects
   - SNIcon, SNIconButton, SNPanel from `../shared-ui/`

6. **NO NEW DEPENDENCIES** without explicit approval. Use native browser APIs.

7. **MOBILE-FIRST MINDSET** for new code, but don't break desktop.

---

## Pre-Flight Checklist

Before starting ANY task:
- [ ] Run `npm run dev` and verify the app loads on desktop
- [ ] Open browser DevTools and enable mobile emulation (iPhone 14 Pro, iPad)
- [ ] Test canvas loads and responds to touch
- [ ] Verify Part 1 features still work on desktop

After EACH task:
- [ ] Test on desktop with mouse
- [ ] Test on mobile emulator with touch
- [ ] Test on tablet emulator (if applicable)
- [ ] Check browser console for errors
- [ ] Commit with descriptive message

---

## TASK M0: Touch Event Foundation

**Goal**: Ensure all existing pointer events work correctly on touch devices.

**Audit Files**:
- `src/components/WidgetFrame.tsx`
- `src/components/CropHandles.tsx`
- `src/canvas/interactions/useDragController.ts` (from Part 1)
- `src/canvas/interactions/useResizeController.ts` (from Part 1)

**Requirements**:
1. Verify all interactions use `PointerEvent` (not MouseEvent) - this should already be the case
2. Add `touch-action: none` to interactive elements to prevent browser gestures interfering
3. Ensure `setPointerCapture` is used consistently for drag operations
4. Test that single-finger drag works for widget movement

**Add to WidgetFrame.tsx**:
```tsx
// Add to the main frame div style
touchAction: 'none',
WebkitTouchCallout: 'none',
WebkitUserSelect: 'none',
```

**Verify These Work on Touch**:
- [ ] Single tap selects widget
- [ ] Single finger drag moves widget
- [ ] Drag handles work for resize
- [ ] Rotation handle works
- [ ] Crop handles work

**DO NOT**:
- Add separate touch event handlers (PointerEvents handle both)
- Create a mobile-specific component variant
- Change the desktop behavior

---

## TASK M1: Pinch-to-Zoom Canvas

**Goal**: Implement two-finger pinch gesture for canvas zoom.

**Update/Create**: `src/hooks/useCanvasGestures.ts`

**Requirements**:
```typescript
export function useCanvasGestures(options: {
  containerRef: React.RefObject<HTMLElement>;
  onZoom: (scale: number, centerX: number, centerY: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  enabled?: boolean;
}) {
  // Track touch points for pinch detection
  // Calculate pinch scale from distance change between two fingers
  // Calculate pinch center point for zoom origin
  // Emit zoom events with scale factor and center
}
```

**Pinch Detection Logic**:
```typescript
// On touchstart/pointermove with 2+ touches:
const touch1 = touches[0];
const touch2 = touches[1];

// Current distance between fingers
const currentDistance = Math.hypot(
  touch2.clientX - touch1.clientX,
  touch2.clientY - touch1.clientY
);

// Compare to initial distance
const scale = currentDistance / initialDistance;

// Center point (zoom origin)
const centerX = (touch1.clientX + touch2.clientX) / 2;
const centerY = (touch1.clientY + touch2.clientY) / 2;

onZoom(scale, centerX, centerY);
```

**Integration**:
- Add hook to canvas container component
- Connect to existing `zoom()` action in useCanvasStore
- Zoom should be smooth and centered on pinch midpoint

**Zoom Constraints**:
- Min zoom: 25% (0.25)
- Max zoom: 400% (4.0)
- Smooth interpolation during pinch

**DO NOT**:
- Use a gesture library (use native pointer/touch events)
- Disable desktop scroll-wheel zoom
- Create complex gesture state machines

---

## TASK M2: Two-Finger Pan

**Goal**: Implement two-finger drag for canvas panning (when not pinching).

**Update**: `src/hooks/useCanvasGestures.ts`

**Requirements**:
1. When two fingers move together (similar direction, similar speed), pan the canvas
2. Distinguish from pinch by checking if distance between fingers is stable
3. Pan should feel 1:1 with finger movement

**Pan vs Pinch Detection**:
```typescript
// If distance change < threshold, it's a pan
// If distance change > threshold, it's a pinch
const distanceChange = Math.abs(currentDistance - lastDistance);
const isPinch = distanceChange > 10; // pixels

if (isPinch) {
  // Handle zoom
} else {
  // Handle pan - use average movement of both fingers
  const avgDeltaX = (delta1X + delta2X) / 2;
  const avgDeltaY = (delta1Y + delta2Y) / 2;
  onPan(avgDeltaX, avgDeltaY);
}
```

**DO NOT**:
- Override single-finger drag (that's for widget movement)
- Add momentum/inertia scrolling yet (Task M7)
- Break existing spacebar+drag pan on desktop

---

## TASK M3: Mobile Toolbar Adaptation

**Goal**: Make the toolbar responsive and touch-friendly on mobile.

**Update File**: `src/components/CanvasToolbar.tsx`

**Requirements**:

1. **Responsive Layout**:
```tsx
// Detect mobile viewport
const isMobile = window.innerWidth < 768;

// On mobile: toolbar at bottom of screen, larger touch targets
// On desktop: keep current top-center position
```

2. **Larger Touch Targets**:
```tsx
// Mobile button size: min 44x44px (Apple HIG recommendation)
// Increase padding and icon size on mobile
const buttonSize = isMobile ? 'md' : 'sm';
```

3. **Collapsible Sections**:
```tsx
// On mobile, group tools into expandable menus
// Show only essential tools by default:
// [Undo] [Redo] [Zoom] [More ⋮]
// "More" expands to show: Grid, Snap, Layers, Groups, etc.
```

4. **Bottom Sheet for Panels**:
```tsx
// On mobile, panels (Layers, Groups, Resize) open as bottom sheets
// instead of dropdowns
```

**Mobile Toolbar Layout**:
```
┌─────────────────────────────────────┐
│                                     │
│           Canvas Area               │
│                                     │
├─────────────────────────────────────┤
│  [⟲] [⟳] [100%] [Edit] [⋮ More]    │  ← Bottom toolbar
└─────────────────────────────────────┘
```

**CSS Approach**:
```tsx
const styles = {
  container: {
    position: 'fixed',
    // Responsive positioning
    ...(isMobile ? {
      bottom: 0,
      left: 0,
      right: 0,
      top: 'auto',
      transform: 'none',
      borderRadius: '16px 16px 0 0',
      padding: '12px 16px env(safe-area-inset-bottom)',
    } : {
      top: 60,
      left: '50%',
      transform: 'translateX(-50%)',
    }),
  },
};
```

**DO NOT**:
- Create a completely separate mobile toolbar component
- Remove any functionality on mobile (just reorganize)
- Use CSS media queries in separate files (keep in component)

---

## TASK M4: Touch-Friendly Widget Selection

**Goal**: Improve widget selection UX for touch.

**Update File**: `src/components/WidgetFrame.tsx`

**Requirements**:

1. **Larger Selection Hit Area**:
```tsx
// Add invisible padding around widget for easier tap targeting
// The visual bounds stay the same, but touch area is larger
<div style={{
  position: 'absolute',
  top: -10,
  left: -10,
  right: -10,
  bottom: -10,
  // Only active on touch devices
  pointerEvents: isTouchDevice ? 'auto' : 'none',
}} />
```

2. **Long-Press for Context Menu**:
```tsx
// 500ms press without movement triggers context menu
// Use existing WidgetContextMenu component
const longPressTimer = useRef<number | null>(null);

const handlePointerDown = (e) => {
  longPressTimer.current = window.setTimeout(() => {
    // Show context menu at touch position
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, 500);
};

const handlePointerMove = () => {
  // Cancel long press if finger moves
  if (longPressTimer.current) {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }
};
```

3. **Visual Feedback on Touch**:
```tsx
// Brief scale animation on tap
// Haptic-style visual pulse
const [isTouched, setIsTouched] = useState(false);

// In render:
style={{
  transform: isTouched ? 'scale(0.98)' : 'scale(1)',
  transition: 'transform 100ms ease-out',
}}
```

4. **Touch Device Detection**:
```typescript
// Utility function
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
```

**DO NOT**:
- Remove mouse click selection
- Add complex gesture recognition
- Change the selection store logic

---

## TASK M5: Mobile Resize Handles

**Goal**: Make resize handles usable on touch screens.

**Update File**: `src/components/WidgetFrame.tsx`

**Requirements**:

1. **Larger Handles on Touch**:
```tsx
const HANDLE_SIZE = isTouchDevice() ? 20 : 10;  // Bigger on mobile
const HANDLE_HIT_AREA = isTouchDevice() ? 44 : 20;  // Even bigger hit area
```

2. **Handle Visibility on Selection**:
```tsx
// On mobile, handles should be more visible
// Use filled circles instead of small squares
const handleStyle = isTouchDevice() ? {
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: 'var(--sn-accent-primary)',
  border: '3px solid white',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
} : {
  // Current desktop style
};
```

3. **Corner-Only Mode for Small Widgets**:
```tsx
// On mobile, if widget is small, only show corner handles
// to avoid cluttered UI
const showEdgeHandles = !isTouchDevice() ||
  (instance.width > 150 && instance.height > 150);

const handles = showEdgeHandles
  ? ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
  : ['ne', 'se', 'sw', 'nw'];  // Corners only
```

4. **Rotation Handle Adjustment**:
```tsx
// Move rotation handle further from widget on mobile
// to avoid accidental triggers
const ROTATION_HANDLE_OFFSET = isTouchDevice() ? 40 : 25;
```

**DO NOT**:
- Create separate mobile handle components
- Change resize calculation logic
- Remove any handles on desktop

---

## TASK M6: Mobile Crop Tool

**Goal**: Make crop tool usable on touch screens.

**Update File**: `src/components/CropHandles.tsx`

**Requirements**:

1. **Larger Crop Handles**:
```tsx
const HANDLE_SIZE = isTouchDevice() ? 16 : 8;
const HANDLE_MARGIN = isTouchDevice() ? 24 : 16;
```

2. **Corner Drag for Mobile**:
```tsx
// On mobile, prioritize corner handles for crop
// Edge handles are harder to hit on small screens
// Make corners visually prominent
```

3. **Drag Entire Crop Area**:
```tsx
// Allow dragging the crop frame itself to reposition
// Single finger on crop area = move crop
// This is more intuitive on touch
const handleCropAreaDrag = (e: PointerEvent) => {
  // Move all four edges equally
  const deltaX = (e.clientX - lastX) / width * 100;
  const deltaY = (e.clientY - lastY) / height * 100;

  onChange({
    top: crop.top + deltaY,
    bottom: crop.bottom - deltaY,
    left: crop.left + deltaX,
    right: crop.right - deltaX,
  });
};
```

4. **Aspect Ratio Quick Toggle**:
```tsx
// Add prominent button to toggle aspect ratio lock
// Easier than dropdown on mobile
<button onClick={() => onToggleAspectLock?.()}>
  {aspectLocked ? '🔒 Locked' : '🔓 Free'}
</button>
```

**DO NOT**:
- Create separate mobile crop component
- Remove edge handles entirely
- Change crop data structure

---

## TASK M7: Momentum Scrolling

**Goal**: Add natural-feeling momentum to canvas panning.

**Create File**: `src/canvas/physics/useMomentum.ts`

**Requirements**:
```typescript
export function useMomentum(options: {
  onUpdate: (deltaX: number, deltaY: number) => void;
  friction?: number;  // Default 0.95
  minVelocity?: number;  // Default 0.5
}) {
  // Track velocity during pan
  // On pan end, continue movement with decreasing velocity
  // Use requestAnimationFrame for smooth animation
}
```

**Velocity Tracking**:
```typescript
// Track last few positions to calculate velocity
const positions = useRef<Array<{ x: number; y: number; time: number }>>([]);

// Keep last 100ms of positions
const trackPosition = (x: number, y: number) => {
  const now = Date.now();
  positions.current.push({ x, y, time: now });
  positions.current = positions.current.filter(p => now - p.time < 100);
};

// Calculate velocity on release
const getVelocity = () => {
  const recent = positions.current;
  if (recent.length < 2) return { vx: 0, vy: 0 };

  const first = recent[0];
  const last = recent[recent.length - 1];
  const dt = (last.time - first.time) / 1000;  // seconds

  return {
    vx: (last.x - first.x) / dt,
    vy: (last.y - first.y) / dt,
  };
};
```

**Momentum Animation**:
```typescript
const animateMomentum = () => {
  velocity.x *= friction;
  velocity.y *= friction;

  if (Math.abs(velocity.x) < minVelocity && Math.abs(velocity.y) < minVelocity) {
    return;  // Stop animation
  }

  onUpdate(velocity.x * 16, velocity.y * 16);  // ~16ms per frame
  requestAnimationFrame(animateMomentum);
};
```

**Integration**:
- Apply to two-finger pan (Task M2)
- Apply to single-finger canvas drag (if canvas is in pan mode)
- DO NOT apply to widget dragging

**DO NOT**:
- Add spring physics
- Use physics libraries
- Over-complicate the math

---

## TASK M8: Mobile Properties Panel

**Goal**: Make properties panel work well on mobile as a bottom sheet.

**Update File**: `src/components/canvas/PropertiesPanel.tsx` (from Part 1)

**Requirements**:

1. **Bottom Sheet on Mobile**:
```tsx
const isMobile = window.innerWidth < 768;

// Mobile: slide up from bottom
// Desktop: right sidebar (existing)
const panelStyle = isMobile ? {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  maxHeight: '60vh',
  borderRadius: '16px 16px 0 0',
  transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
  transition: 'transform 300ms ease-out',
} : {
  // Existing desktop styles
};
```

2. **Drag to Dismiss**:
```tsx
// Swipe down to close bottom sheet
const handleDragDown = (deltaY: number) => {
  if (deltaY > 100) {
    onClose();
  }
};

// Visual drag handle at top
<div className="drag-handle" onPointerDown={startDrag}>
  <div style={{ width: 40, height: 4, background: '#666', borderRadius: 2 }} />
</div>
```

3. **Simplified Mobile Layout**:
```tsx
// On mobile, show fewer fields by default
// Expandable sections for advanced properties
{isMobile ? (
  <>
    <QuickProperties /> {/* Position, Size only */}
    <Accordion title="Transform">
      <TransformProperties />
    </Accordion>
    <Accordion title="Advanced">
      <AdvancedProperties />
    </Accordion>
  </>
) : (
  <FullProperties />  {/* Desktop shows all */}
)}
```

4. **Number Input Improvements**:
```tsx
// On mobile, tapping number input should:
// - Open native number keyboard
// - Select all text for easy replacement
<input
  type="number"
  inputMode="decimal"
  pattern="[0-9]*"
  onFocus={(e) => e.target.select()}
/>
```

**DO NOT**:
- Create separate mobile component
- Remove any properties on mobile
- Use a modal library

---

## TASK M9: Touch-Friendly Layer Panel

**Goal**: Make layers panel work well on touch.

**Update File**: `src/components/canvas/LayersPanel.tsx` (from Part 1)

**Requirements**:

1. **Touch Drag Reorder**:
```tsx
// Use pointer events for cross-platform drag
// Visual feedback: lifted item, drop indicator
const [draggedId, setDraggedId] = useState<string | null>(null);
const [dropTargetId, setDropTargetId] = useState<string | null>(null);

// On mobile, long press initiates drag (not immediate)
```

2. **Larger Touch Targets**:
```tsx
// Layer row height: 44px minimum on mobile
// Icon buttons: 44x44 hit area
const rowStyle = {
  minHeight: isTouchDevice() ? 44 : 32,
  padding: isTouchDevice() ? '8px 12px' : '4px 8px',
};
```

3. **Swipe Actions**:
```tsx
// Swipe left on layer item reveals: [Hide] [Lock] [Delete]
// Common iOS/Android pattern
const [swipeOffset, setSwipeOffset] = useState(0);

// Render swipe actions behind layer row
{swipeOffset < -50 && (
  <div className="swipe-actions">
    <button onClick={() => toggleVisibility(layer.id)}>
      <SNIcon name={layer.visible ? 'hidden' : 'visible'} />
    </button>
    <button onClick={() => toggleLock(layer.id)}>
      <SNIcon name={layer.locked ? 'unlock' : 'lock'} />
    </button>
    <button onClick={() => deleteLayer(layer.id)} className="danger">
      <SNIcon name="delete" />
    </button>
  </div>
)}
```

4. **Bottom Sheet Presentation**:
```tsx
// Same pattern as PropertiesPanel - bottom sheet on mobile
```

**DO NOT**:
- Use a drag-and-drop library
- Create complex swipe gesture system
- Remove desktop drag-reorder

---

## TASK M10: Responsive Canvas Viewport

**Goal**: Ensure canvas works well across all screen sizes.

**Update Files**: Canvas container component, `src/pages/GalleryPage.tsx`

**Requirements**:

1. **Safe Area Handling**:
```tsx
// Account for notches, home indicators on modern phones
style={{
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
}}
```

2. **Auto-Fit on Load**:
```tsx
// On mobile, auto-fit canvas to viewport on initial load
useEffect(() => {
  if (isMobile && canvasDimensions) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - toolbarHeight;

    const fitScale = Math.min(
      viewportWidth / canvasDimensions.width,
      viewportHeight / canvasDimensions.height,
      1  // Don't zoom in past 100%
    );

    setCanvasScale(fitScale * 0.9);  // 90% to show edges
    centerCanvas();
  }
}, [isMobile, canvasDimensions]);
```

3. **Orientation Change Handling**:
```tsx
// Re-fit canvas when orientation changes
useEffect(() => {
  const handleResize = debounce(() => {
    if (isMobile) {
      // Optionally re-fit or just update viewport
    }
  }, 250);

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

4. **Viewport Bounds Indicator**:
```tsx
// On mobile, show subtle indicator when canvas extends beyond viewport
// Small arrows at edges indicating more content
{canvasExtendsLeft && <div className="scroll-hint left">‹</div>}
{canvasExtendsRight && <div className="scroll-hint right">›</div>}
// etc.
```

**DO NOT**:
- Force specific orientations
- Disable zoom entirely on mobile
- Create separate mobile page components

---

## TASK M11: Performance Optimization for Mobile

**Goal**: Ensure smooth 60fps performance on mobile devices.

**Requirements**:

1. **Reduce Renders During Gestures**:
```tsx
// Use refs instead of state during active gestures
// Only update state on gesture end
const positionRef = useRef({ x: 0, y: 0 });

const handleDrag = (e) => {
  positionRef.current = { x: e.clientX, y: e.clientY };
  // Update visual position via DOM directly
  frameRef.current.style.transform = `translate(${x}px, ${y}px)`;
};

const handleDragEnd = () => {
  // NOW update state
  updateWidget(id, { position: positionRef.current });
};
```

2. **Will-Change Hints**:
```tsx
// Add will-change for elements that animate
style={{
  willChange: isDragging ? 'transform' : 'auto',
}}
// Remove will-change when not animating (memory optimization)
```

3. **Throttle Non-Critical Updates**:
```tsx
// Smart guides don't need 60fps updates
const throttledGuideUpdate = useThrottle(updateGuides, 100);
```

4. **Passive Event Listeners**:
```tsx
// Where possible, use passive listeners
element.addEventListener('touchmove', handler, { passive: true });
// Note: Can't use passive if calling preventDefault()
```

5. **Canvas Rendering Optimization**:
```tsx
// Don't re-render all widgets when one moves
// Use React.memo with proper comparison
const WidgetFrame = React.memo(WidgetFrameComponent, (prev, next) => {
  // Only re-render if this widget's data changed
  return prev.instance === next.instance && prev.selected === next.selected;
});
```

**DO NOT**:
- Add complex virtualization (save for later if needed)
- Premature optimization of non-problems
- Break functionality for performance

---

## Completion Checklist

After all tasks:

**Desktop (must still work)**:
- [ ] Mouse drag moves widgets
- [ ] Mouse resize works with all handles
- [ ] Scroll wheel zooms canvas
- [ ] All keyboard shortcuts work
- [ ] Toolbar functions normally

**Mobile (new functionality)**:
- [ ] Single tap selects widget
- [ ] Single finger drag moves widget
- [ ] Pinch to zoom works smoothly
- [ ] Two-finger pan works
- [ ] Long press shows context menu
- [ ] Resize handles are usable
- [ ] Crop tool works on touch
- [ ] Toolbar is at bottom, touch-friendly
- [ ] Properties panel slides up from bottom
- [ ] Layers panel supports touch reorder
- [ ] Momentum scrolling feels natural
- [ ] No jank or performance issues
- [ ] Safe areas respected (notch, home indicator)

**Both Platforms**:
- [ ] No console errors
- [ ] Undo/redo works
- [ ] Canvas state persists correctly

---

## File Reference

**Files to modify**:
- `src/components/WidgetFrame.tsx` - Tasks M0, M4, M5
- `src/components/CropHandles.tsx` - Task M6
- `src/components/CanvasToolbar.tsx` - Task M3
- `src/components/canvas/PropertiesPanel.tsx` - Task M8
- `src/components/canvas/LayersPanel.tsx` - Task M9
- `src/pages/GalleryPage.tsx` - Task M10
- `src/hooks/useCanvasGestures.ts` - Tasks M1, M2

**New files to create**:
- `src/utils/device.ts` - Touch device detection utilities
- `src/canvas/physics/useMomentum.ts` - Task M7
- `src/components/ui/BottomSheet.tsx` - Reusable bottom sheet (Tasks M8, M9)

---

## Notes for Agent

- Test on multiple emulated devices: iPhone SE (small), iPhone 14 Pro (medium), iPad (tablet)
- Performance matters more on mobile - test on throttled CPU in DevTools
- Touch targets: minimum 44x44px per Apple HIG
- The user's dashboard should feel as smooth as native apps
- When in doubt, follow iOS/Android platform conventions
- Commit after each task with message: `feat(canvas-mobile): Task MX - [description]`
