# Mobile Canvas & Toolbar Rework Roadmap

## Executive Summary

This roadmap addresses two critical mobile UX issues:
1. **Canvas Visibility**: Canvas is not visible on mobile until zooming out; proportions are wrong
2. **Toolbar Deficiency**: Mobile toolbar is inconsistent and missing key tools

---

## Part 1: Mobile Canvas Visibility & Sizing

### Current State Analysis

**Problem Statement:**
When opening the app on a mobile device, the canvas is not visible until the user manually zooms out. Even then, the canvas proportions (1920x1080 or 390x844) don't work well for a mobile viewport.

**Root Causes Identified:**

1. **Viewport Mode Persistence Issue** (`src/state/useViewportModeStore.ts:42-46`)
   - Default `activeMode` is `'web'`
   - Persisted to localStorage, so returning users may have 'web' mode saved
   - On mobile devices, a 1920x1080 canvas is rendered when it should be mobile-sized

2. **Canvas Size Mismatch** (`src/canvas/MainCanvas.tsx:180-225`)
   - Desktop default: 1920x1080
   - Mobile mode: 390x844 (iPhone dimensions)
   - Neither matches the actual device screen size

3. **Fit-to-View Timing** (`src/canvas/MainCanvas.tsx:312-322`)
   - Auto-fit runs on `isMobile` detection but may race with container measurement
   - 300ms delay is arbitrary and may not match all devices
   - Container `getBoundingClientRect()` may return 0 before layout

4. **Fixed Mobile Dimensions** (`src/state/useViewportModeStore.ts:44-45`)
   - `mobileWidth: 390` and `mobileHeight: 844` are hardcoded
   - No consideration of actual device screen dimensions
   - Doesn't account for device orientation

---

### Solution Design

#### Phase 1.1: Smart Mobile Detection & Auto-Mode Switching

**Objective:** Automatically detect mobile devices and set appropriate viewport mode

**Files to Modify:**
- `src/state/useViewportModeStore.ts`
- `src/hooks/useResponsive.ts`

**Implementation Steps:**

1. **Add device-aware initialization to viewport mode store**
   ```typescript
   // Add to useViewportModeStore.ts
   const isMobileDevice = () => {
     if (typeof window === 'undefined') return false;
     return window.innerWidth < 768;
   };

   // Modify DEFAULT_STATE to be dynamic
   const getDefaultState = (): ViewportModeState => ({
     activeMode: isMobileDevice() ? 'mobile' : 'web',
     mobileWidth: Math.min(window.innerWidth, 430),
     mobileHeight: Math.min(window.innerHeight - 120, 932), // Account for toolbar
   });
   ```

2. **Add `initializeForDevice()` action**
   - Call on app mount to sync mode with actual device
   - Respect user override (add `userOverride` flag to state)

3. **Add responsive dimension presets**
   ```typescript
   export const MOBILE_PRESETS = {
     'iphone-se': { width: 375, height: 667 },
     'iphone-14': { width: 390, height: 844 },
     'iphone-14-pro-max': { width: 430, height: 932 },
     'android-small': { width: 360, height: 640 },
     'android-large': { width: 412, height: 915 },
     'device-native': { width: 0, height: 0 }, // Special: use actual device
   };
   ```

#### Phase 1.2: Device-Native Canvas Sizing

**Objective:** Canvas should default to device screen size on mobile

**Files to Modify:**
- `src/canvas/MainCanvas.tsx`
- `src/state/useViewportModeStore.ts`
- `src/hooks/useResponsive.ts`

**Implementation Steps:**

1. **Add `useDeviceCanvas` hook**
   ```typescript
   // New hook: src/hooks/useDeviceCanvas.ts
   export function useDeviceCanvas() {
     const { width, height } = useViewport();
     const safeArea = useSafeArea();
     const TOOLBAR_HEIGHT = 64; // Bottom toolbar
     const HEADER_HEIGHT = 48; // Optional header

     return {
       // Full screen canvas dimensions
       canvasWidth: width,
       canvasHeight: height - safeArea.bottom - TOOLBAR_HEIGHT,

       // "App screen" dimensions (with chrome)
       appScreenWidth: width,
       appScreenHeight: height - safeArea.top - safeArea.bottom - TOOLBAR_HEIGHT - HEADER_HEIGHT,
     };
   }
   ```

2. **Update MainCanvas effective dimensions logic**
   ```typescript
   // In MainCanvas.tsx
   const deviceCanvas = useDeviceCanvas();

   const effectiveWidth = isMobile
     ? deviceCanvas.appScreenWidth
     : (viewportMode === 'mobile' ? mobileWidth : width);

   const effectiveHeight = isMobile
     ? deviceCanvas.appScreenHeight
     : (viewportMode === 'mobile' ? mobileHeight : height);
   ```

3. **Add `canvasSizeMode` option**
   - `'fixed'` - Use explicit width/height
   - `'device'` - Use device screen dimensions
   - `'preset'` - Use a preset (iPhone 14, etc.)

#### Phase 1.3: Proper Initial Centering & Fit

**Objective:** Canvas is perfectly centered and fits the view on first load

**Files to Modify:**
- `src/canvas/MainCanvas.tsx`
- `src/canvas/utils/navigationHelpers.ts`
- `src/canvas/hooks/useMainCanvasNavigation.ts`

**Implementation Steps:**

1. **Improve `fitCanvasToView` for mobile**
   ```typescript
   export function fitCanvasToView(
     canvasWidth: number,
     canvasHeight: number,
     containerSize: ContainerSize,
     options: {
       padding?: number;
       isMobile?: boolean;
       maxZoom?: number;
     } = {}
   ): ViewportState {
     const {
       padding = options.isMobile ? 16 : 40,
       isMobile = false,
       maxZoom = isMobile ? 1 : 1, // Allow up to 100% on mobile
     } = options;

     // For mobile where canvas = screen size, use zoom=1 and center
     if (isMobile &&
         Math.abs(canvasWidth - containerSize.width) < 50 &&
         Math.abs(canvasHeight - containerSize.height) < 100) {
       return {
         zoom: 1,
         panX: (containerSize.width - canvasWidth) / 2,
         panY: (containerSize.height - canvasHeight) / 2,
       };
     }

     // Standard fit logic for non-matching sizes
     // ...existing logic with mobile-aware padding
   }
   ```

2. **Add container measurement hook with retry**
   ```typescript
   function useContainerMeasure(containerRef: RefObject<HTMLDivElement>) {
     const [size, setSize] = useState({ width: 0, height: 0 });

     useEffect(() => {
       const measure = () => {
         if (!containerRef.current) return false;
         const rect = containerRef.current.getBoundingClientRect();
         if (rect.width > 0 && rect.height > 0) {
           setSize({ width: rect.width, height: rect.height });
           return true;
         }
         return false;
       };

       // Try immediately, then retry with RAF if needed
       if (!measure()) {
         const rafId = requestAnimationFrame(() => {
           if (!measure()) {
             // Final retry after paint
             setTimeout(measure, 50);
           }
         });
         return () => cancelAnimationFrame(rafId);
       }
     }, []);

     return size;
   }
   ```

3. **Replace arbitrary 300ms timeout with proper measurement**
   - Use `ResizeObserver` for reliable container size
   - Fit canvas only after container is measured
   - Add loading state while measuring

#### Phase 1.4: Orientation Handling

**Objective:** Handle device rotation gracefully

**Implementation Steps:**

1. **Add orientation-aware canvas dimensions**
   - Portrait: Use portrait-optimized dimensions
   - Landscape: Use landscape-optimized dimensions
   - Animate transition smoothly

2. **Preserve user zoom/pan across orientation change**
   - Save relative position before rotation
   - Restore proportionally after rotation

---

### Diagnostic Steps (Before Implementation)

Run these checks to verify the issues:

```bash
# 1. Check current viewport mode store defaults
grep -n "DEFAULT_STATE\|mobileWidth\|mobileHeight" src/state/useViewportModeStore.ts

# 2. Check canvas dimension logic
grep -n "effectiveWidth\|effectiveHeight" src/canvas/MainCanvas.tsx

# 3. Check fit-to-view padding values
grep -n "padding" src/canvas/utils/navigationHelpers.ts

# 4. Check mobile detection breakpoint
grep -n "isMobile\|BREAKPOINTS" src/hooks/useResponsive.ts

# 5. Check auto-fit timing
grep -n "setTimeout\|300\|50" src/canvas/MainCanvas.tsx
```

**Manual Testing Checklist:**
- [ ] Open app on iPhone Safari - note initial canvas position
- [ ] Open app on Android Chrome - note initial canvas position
- [ ] Check localStorage for `stickernest-viewport-mode` value
- [ ] Test with DevTools mobile emulation (various sizes)
- [ ] Rotate device - observe canvas behavior

---

## Part 2: Mobile Toolbar Rework

### Current State Analysis

**Current Mobile Toolbar Tools:** (`src/components/MobileToolbar.tsx`)
| Position | Tool | Purpose |
|----------|------|---------|
| Left | Undo | History |
| Left | Redo | History |
| Center | Add Widget | Create new |
| Center | Delete | Remove selected |
| Center | Fit to View | Navigation |
| Right | Mode Toggle | Edit/View |
| Right | Layers | Panel |
| Right | Settings | Panel |

**Missing Tools (Available on Desktop):**
- Shape tools (rectangle, circle, triangle, polygon, star, ellipse, line, arrow)
- Text tool
- Image tool
- 3D object tools (cube, sphere, cylinder, etc.)
- Copy/Paste
- Z-index controls (bring to front, send to back)
- Alignment tools
- Grid toggle

**Problems:**
1. Too few tools accessible without navigation
2. "Add Widget" is vague - no direct access to specific tools
3. No way to access shapes, text, or images directly
4. Inconsistent with desktop experience
5. Missing clipboard operations

---

### Solution Design: Swipable Multi-Section Toolbar

#### Design Principles

1. **Industry Standard Patterns** (Reference: Figma Mobile, Canva, Adobe Express)
   - Horizontal swipable sections
   - Persistent primary actions (undo/redo, mode)
   - Contextual tools based on selection
   - Expandable tool menus

2. **Thumb-Zone Optimization**
   - Primary actions in easy thumb reach
   - Tool palette accessible via tap+hold or swipe up
   - Bottom sheet for complex tools

3. **Progressive Disclosure**
   - Most common tools visible
   - Secondary tools in swipable sections
   - Advanced tools in expandable menus

#### Phase 2.1: Swipable Toolbar Sections

**New Toolbar Structure:**

```
┌──────────────────────────────────────────────────────────────────┐
│                    Section Indicator Dots                         │
├──────────────────────────────────────────────────────────────────┤
│  [Fixed Left]  │  [Swipable Center Sections]  │  [Fixed Right]   │
│                │                               │                   │
│  ↶  ↷         │  ◄ Section 1 | Section 2 | Section 3 ►          │ ✓/✎  ⋮  │
└──────────────────────────────────────────────────────────────────┘
```

**Sections:**

| Section | Tools | When Visible |
|---------|-------|--------------|
| 1. Create | Shapes, Text, Image, Widget | Edit mode |
| 2. Edit | Delete, Copy, Paste, Duplicate | Selection active |
| 3. Arrange | Front, Back, Align, Distribute | Selection active |
| 4. Canvas | Fit, Zoom In/Out, Grid | Always |

**Files to Create/Modify:**
- `src/components/MobileToolbar.tsx` - Major refactor
- `src/components/mobile/SwipableToolbar.tsx` - New component
- `src/components/mobile/ToolSection.tsx` - Section wrapper
- `src/components/mobile/ToolButton.tsx` - Unified button
- `src/components/mobile/ShapeToolMenu.tsx` - Shape picker
- `src/hooks/useMobileToolbar.ts` - Toolbar state/logic

**Implementation Steps:**

1. **Create SwipableToolbar component**
   ```typescript
   interface SwipableToolbarProps {
     sections: ToolbarSection[];
     activeSection: number;
     onSectionChange: (index: number) => void;
     fixedLeft?: React.ReactNode;
     fixedRight?: React.ReactNode;
   }

   interface ToolbarSection {
     id: string;
     label: string;
     tools: ToolConfig[];
     visible?: boolean; // Based on context
   }
   ```

2. **Implement swipe gesture handling**
   - Use `react-swipeable` or custom touch handlers
   - Snap to sections with momentum
   - Show section indicators (dots)
   - Support both swipe and tap navigation

3. **Add haptic feedback on section change**

#### Phase 2.2: Tool Menus & Expanded States

**Shape Tool Menu (Bottom Sheet or Popover):**

```
┌────────────────────────────────────────┐
│ Shapes                              ✕  │
├────────────────────────────────────────┤
│  ▢ Rectangle   ○ Circle   △ Triangle  │
│  ⬠ Polygon    ★ Star     ◯ Ellipse   │
│  ─ Line       → Arrow                  │
└────────────────────────────────────────┘
```

**Implementation:**

1. **Create ToolMenu component**
   ```typescript
   interface ToolMenuProps {
     trigger: React.ReactNode;
     tools: ToolConfig[];
     columns?: number;
     position?: 'top' | 'bottom';
   }
   ```

2. **Add MobileBottomSheet for complex menus**
   - Already exists in `src/components/MobileNav.tsx`
   - Extract and enhance for tool menus
   - Add drag-to-dismiss gesture

#### Phase 2.3: Context-Aware Tool Display

**Objective:** Show relevant tools based on current state

**States and Tools:**

| State | Visible Tools |
|-------|---------------|
| No selection | Create section |
| Single widget selected | Edit + Arrange |
| Multiple widgets selected | Align/Distribute + Arrange |
| Text widget selected | Text formatting |
| Shape widget selected | Shape properties |

**Implementation:**

1. **Create useMobileToolbarContext hook**
   ```typescript
   function useMobileToolbarContext(
     selectedIds: Set<string>,
     widgets: WidgetInstance[],
     mode: 'view' | 'edit'
   ): ToolbarContext {
     // Determine which sections/tools should be visible
     return {
       showCreateSection: mode === 'edit',
       showEditSection: mode === 'edit' && selectedIds.size > 0,
       showArrangeSection: selectedIds.size > 1,
       showTextTools: hasTextWidget(selectedIds, widgets),
       // ...
     };
   }
   ```

2. **Update toolbar to use context**

#### Phase 2.4: Tool Definitions & Actions

**Create unified tool configuration:**

```typescript
// src/config/mobileTools.ts

export interface ToolConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortLabel?: string;
  action: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  showInSection: string[];
  requiresSelection?: boolean;
  requiresMultiSelection?: boolean;
}

export const MOBILE_TOOLS: ToolConfig[] = [
  // Create Tools
  {
    id: 'add-rectangle',
    icon: <RectangleIcon />,
    label: 'Rectangle',
    shortLabel: 'Rect',
    showInSection: ['create'],
    action: () => { /* add rectangle */ },
  },
  // ... more tools
];
```

---

### Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Fix canvas visibility on mobile load | Medium | Critical |
| P0 | Auto-detect device and set canvas size | Medium | Critical |
| P1 | Implement swipable toolbar sections | High | High |
| P1 | Add shape/text/image tools to mobile | Medium | High |
| P2 | Add context-aware tool visibility | Medium | Medium |
| P2 | Implement tool menus (bottom sheets) | Medium | Medium |
| P3 | Add clipboard operations | Low | Medium |
| P3 | Add z-index controls | Low | Medium |
| P3 | Add alignment tools | Medium | Low |

---

## Testing Plan

### Canvas Tests

1. **Fresh install on mobile**
   - Clear localStorage
   - Open app on mobile device
   - Verify canvas is visible and centered
   - Verify canvas fits screen

2. **Returning user on mobile**
   - Set localStorage to `'web'` mode
   - Open app on mobile device
   - Verify auto-switch to mobile mode
   - Verify canvas fits screen

3. **Orientation change**
   - Open in portrait
   - Rotate to landscape
   - Verify canvas re-fits
   - Verify widgets maintain relative positions

4. **Various device sizes**
   - iPhone SE (375x667)
   - iPhone 14 (390x844)
   - iPhone 14 Pro Max (430x932)
   - Pixel 7 (412x915)
   - Small Android (360x640)

### Toolbar Tests

1. **Swipe navigation**
   - Verify swipe left/right changes sections
   - Verify section indicator updates
   - Verify haptic feedback

2. **Tool functionality**
   - Each tool performs correct action
   - Tools are disabled when appropriate
   - Context changes show/hide tools

3. **Accessibility**
   - All tools have labels
   - Touch targets are 44px+
   - Contrast meets WCAG AA

---

## Files Summary

### Files to Modify
- `src/state/useViewportModeStore.ts` - Add device-aware initialization
- `src/canvas/MainCanvas.tsx` - Device-native sizing, improved fit logic
- `src/canvas/utils/navigationHelpers.ts` - Mobile-aware fit-to-view
- `src/components/MobileToolbar.tsx` - Complete refactor
- `src/hooks/useResponsive.ts` - Add device canvas hook

### Files to Create
- `src/hooks/useDeviceCanvas.ts` - Device screen dimensions
- `src/components/mobile/SwipableToolbar.tsx` - Swipable container
- `src/components/mobile/ToolSection.tsx` - Section component
- `src/components/mobile/ToolButton.tsx` - Unified button
- `src/components/mobile/ShapeToolMenu.tsx` - Shape picker
- `src/components/mobile/ToolBottomSheet.tsx` - Tool menus
- `src/hooks/useMobileToolbar.ts` - Toolbar state
- `src/config/mobileTools.tsx` - Tool configurations

---

## Success Metrics

1. **Canvas Visibility**: Canvas visible immediately on mobile load (no zoom required)
2. **Canvas Sizing**: Canvas fills available screen space by default
3. **Toolbar Completeness**: All desktop tools accessible on mobile
4. **Toolbar Usability**: Tools accessible within 2 taps
5. **Swipe Performance**: Smooth 60fps swipe animations
6. **Touch Targets**: All buttons 44px minimum
