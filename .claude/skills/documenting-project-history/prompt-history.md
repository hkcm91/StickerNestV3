# StickerNest Prompt History & Decision Archive

This document captures the evolution of StickerNest through user prompts, AI sessions, and architectural decisions. It serves as context for future AI sessions.

---

## Table of Contents
- [SPATIAL] VR/AR & WebXR
- [WIDGETS] Widget System
- [ARCHITECTURE] System Design
- [UI/UX] Interface & Interactions
- [AI] AI Features
- [SKILLS] Claude Code Skills
- [FIXES] Bug Fixes & Debugging

---

# [SPATIAL] VR/AR & WebXR

## Quest 3 VR Entry Logic Fix
**Date**: 2024-12-31
**Summary**: Fixed Quest 3 being incorrectly routed to preview mode instead of real WebXR VR.

**User's Original Request**:
> "merge changes" (reviewing pending XR fixes)

**Problem**: Quest 3 headset reports `ontouchstart` and Android user agent, causing the VR entry logic to think it was a mobile phone and route to preview mode instead of real WebXR.

**Solution**:
- Reordered VR entry logic to check `capabilities.vrSupported` FIRST
- Quest 3 reports `vrSupported=true` because it supports `immersive-vr`
- Only fall back to preview mode if WebXR VR isn't supported

**Key Decision**:
- **VR support check before touch detection**: Headsets like Quest have touch capabilities but should use real WebXR

**Files Modified**:
- `src/components/spatial/XREntryButtons.tsx`
- `src/components/spatial/xrStore.ts`

---

## Immersive VR Broken by Widget Html Overlays
**Date**: 2024-12-31
**Summary**: Widgets with `<Html>` components broke immersive VR, showing flat screen instead of 3D space.

**User's Original Request**:
> "The quest headset VR works fine if there are no widgets added. But when I add the widgets, the 3D space no longer opens around me. It only does VR on a flat screen at that point"

**Root Cause**: The `<Html>` component from @react-three/drei creates DOM overlays on top of WebGL. In true WebXR sessions, DOM elements cannot render immersively - they appear as a flat 2D layer in front of the 3D scene.

**Solution**:
- Added `isPresenting` check (from `useXR`) before rendering `<Html>` components
- When in XR session, widgets show 3D placeholder panels instead of Html overlays
- Placeholder shows widget name and icon using `<Text>` from drei

**Key Decision**:
- **No Html in XR sessions**: Pure WebGL only when `isPresenting === true`
- **Graceful fallback**: Show labeled 3D panels so users know what widgets are

**Files Modified**:
- `src/components/spatial/SpatialWidgetContainer.tsx` - Added `&& !isPresenting` condition

**Lessons Learned**:
- The parallel rendering architecture means Html works in preview mode but breaks real XR
- Always check `useXR((state) => state.session)` for XR-aware components

---

## VR/AR Widget Resolution (Pixelation Fix)
**Date**: 2024-12 (earlier)
**Summary**: Widgets looked pixelated in VR due to low resolution rendering.

**Solution**: Added `VR_RESOLUTION_SCALE` multiplier (2.5x) to render Html content at higher resolution, then scale down visually with inverse transform.

**Key Constants**:
```typescript
const VR_RESOLUTION_SCALE = 2.5;
const MIN_RESOLUTION_SCALE = 1.5;
const MAX_WIDGET_DIMENSION_FOR_FULL_SCALE = 600;
```

**Files Modified**:
- `src/components/spatial/SpatialWidgetContainer.tsx`

---

## XR Store Configuration for Quest 3
**Date**: 2024-12-31
**Summary**: Conservative XR feature settings for Quest 3 AR stability.

**Changes**:
- `frameRate: 'default'` instead of `'high'` for AR stability
- Disabled `hitTest` and `anchors` by default (request explicitly)
- Added Quest 3 compatibility notes in comments

**Key Decision**:
- **Conservative defaults**: Better to have stable sessions than feature-rich crashes

---

## 3D Widget Manipulation Handles
**Date**: 2024-12 (earlier)
**Summary**: Added industry-standard VR widget manipulation with resize/rotate handles.

**Features Implemented**:
- Corner resize handles with aspect ratio lock
- Edge handles for single-axis resize
- Rotation handles at corners
- Bidirectional depth handle (Z-axis)
- Hand tracking support
- Haptic feedback

**Architecture**: Modular `Widget3DHandles` component with separate handle types.

---

## Collision Detection & Surface Snapping
**Date**: 2024-12 (earlier)
**Summary**: BVH-accelerated collision detection for widget placement on surfaces.

**Technologies Used**:
- `three-mesh-bvh` for raycast acceleration
- `react-three-rapier` for physics (optional)
- Custom environment loading for 3D spaces

**Files Created**:
- Collision store and types
- Surface detection utilities

---

# [WIDGETS] Widget System

## Widget Pipeline Architecture
**Summary**: Widgets communicate through a port-based pipeline system.

**Core Concepts**:
- Widgets have typed input/output ports
- Pipelines connect widget outputs to inputs
- Events flow through EventBus
- Protocol v3.0 handles widget ↔ host communication

**Key Files**:
- `src/runtime/widgets/` - Widget runtime
- `src/types/pipelines.ts` - Pipeline types
- Protocol messages in widget iframes

---

## Local Widget Development
**Summary**: Test widgets live in `/public/test-widgets/` with hot reload support.

**Structure**:
```
public/test-widgets/
├── widget-id/
│   ├── manifest.json
│   ├── index.html
│   └── assets/
```

---

# [ARCHITECTURE] System Design

## Parallel Rendering Architecture
**Summary**: StickerNest uses dual renderers - DOM for desktop, WebGL for VR/AR.

**Key Insight**: Both renderers read from the same Zustand stores. Position a widget in 2D, it appears correctly in 3D automatically through coordinate conversion.

**Decision**:
- `CanvasRenderer` (DOM) visible in desktop mode
- `SpatialCanvas` (WebGL) visible in vr/ar modes
- Shared state means changes sync automatically

**Files**:
- `src/pages/CanvasPage.tsx` - Renderer orchestration
- `src/utils/spatialCoordinates.ts` - Coordinate conversion

---

## State Management
**Summary**: Zustand stores with persistence for all major features.

**Key Stores**:
- `useCanvasStore` - Widgets, stickers, canvas state
- `useSpatialModeStore` - desktop/vr/ar mode
- `usePanelsStore` - UI panel visibility
- `useSelectionStore` - Selected items

---

# [SKILLS] Claude Code Skills Created

## bridging-2d-3d-rendering
**Date**: 2024-12-31
**Purpose**: Documents coordinate conversion, parallel rendering, Html vs 3D decisions.
**Triggers**: "coordinate conversion", "parallel rendering", "Html vs 3D"

## collision-points-3d
**Purpose**: Collision detection, surface snapping, BVH acceleration.
**Triggers**: "collision detection", "snap points", "raycasting"

## implementing-spatial-xr
**Purpose**: WebXR, VR/AR modes, XR controllers, hand tracking.
**Triggers**: "VR mode", "AR mode", "WebXR", "hand tracking"

## implementing-vr-productivity
**Purpose**: VR productivity patterns, cross-platform input, curved UI.
**Triggers**: "VR productivity", "cross-platform XR", "gaze-and-pinch"

## spatial-surface-architecture
**Purpose**: Surface-first hybrid architecture for widget placement.
**Triggers**: "spatial placement", "XR planes", "widget snapping"

## creating-widgets
**Purpose**: Widget creation, manifests, Protocol v3.0.
**Triggers**: "create a widget", "build a widget"

## connecting-widget-pipelines
**Purpose**: Widget I/O, ports, event routing.
**Triggers**: "widget communication", "connecting widgets", "pipelines"

## testing-widgets
**Purpose**: Playwright E2E, Vitest unit tests, widget testing.
**Triggers**: "test widgets", "write tests"

---

# [FIXES] Bug Fixes & Debugging

## Common Issues Encountered

### VR shows flat screen
**Cause**: `<Html>` components in XR session
**Fix**: Check `isPresenting` before rendering Html

### Widget positions mismatch 2D/3D
**Cause**: Missing Y-axis inversion
**Fix**: Use `toSpatialPosition()` consistently

### Quest 3 routes to preview mode
**Cause**: Touch detection before VR support check
**Fix**: Check `capabilities.vrSupported` first

### AR session hangs on Quest 3
**Cause**: Too many XR features requested
**Fix**: Use conservative feature defaults, add timeout

---

# Session Log Format

When documenting new sessions, use:

```markdown
## [CATEGORY] Title
**Date**: YYYY-MM-DD
**Summary**: Brief description

**User's Request**:
> Original prompt

**Solution**: What was done

**Key Decisions**:
- Decision and reasoning

**Files Modified**:
- `path/file.ts` - description
```

---

*Last Updated: 2024-12-31*
